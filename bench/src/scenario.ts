import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';

import type { Scenario, Tier1Check } from './types.js';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

const TIER1_TYPES = new Set([
  'max_files_changed',
  'max_lines_changed',
  'file_exists',
  'file_absent',
  'file_contains',
  'reply_matches',
  'reply_not_matches',
  'diff_empty',
  'exit_ok',
]);

function requireString(data: Record<string, unknown>, key: string, filePath: string): string {
  const v = data[key];
  if (typeof v !== 'string' || v.trim() === '') {
    throw new Error(`${filePath}: missing required field "${key}"`);
  }
  return v;
}

/**
 * Parse a scenario markdown file: YAML frontmatter between leading `---` lines,
 * plus a body (after the closing `---`) that becomes `intent`.
 */
export function parseScenario(filePath: string): Scenario {
  const absPath = resolve(filePath);
  const raw = readFileSync(absPath, 'utf8');

  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    throw new Error(`${filePath}: missing YAML frontmatter (expected leading "---" delimiters)`);
  }
  const [, frontmatterRaw, bodyRaw] = match;

  let parsed: unknown;
  try {
    parsed = parseYaml(frontmatterRaw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`${filePath}: invalid YAML frontmatter (${message})`);
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${filePath}: frontmatter must be a YAML mapping`);
  }
  const data = parsed as Record<string, unknown>;

  const id = requireString(data, 'id', filePath);
  const skill = requireString(data, 'skill', filePath);
  const fixture = requireString(data, 'fixture', filePath);
  const prompt = requireString(data, 'prompt', filePath);

  const tier1 = (data.tier1 as Tier1Check[] | undefined) ?? [];

  const scenario: Scenario = {
    id,
    skill,
    file: absPath,
    fixture,
    prompt,
    k: typeof data.k === 'number' ? data.k : 3,
    model: typeof data.model === 'string' ? data.model : 'claude-opus-4-8',
    judgeModel: typeof data.judge_model === 'string' ? data.judge_model : 'claude-sonnet-5',
    allowedTools: Array.isArray(data.allowed_tools) ? (data.allowed_tools as string[]) : ['Skill'],
    maxBudgetUsd: typeof data.max_budget_usd === 'number' ? data.max_budget_usd : 1,
    timeoutS: typeof data.timeout_s === 'number' ? data.timeout_s : 600,
    tier1,
    rubric: typeof data.rubric === 'string' && data.rubric.trim() !== '' ? data.rubric : undefined,
    intent: bodyRaw.trim(),
  };

  return scenario;
}

/** Parse every *.md in a directory (sorted by filename); optional case-insensitive id substring filter. */
export function loadScenarios(scenariosDir: string, filter?: string): Scenario[] {
  const absDir = resolve(scenariosDir);
  const files = readdirSync(absDir)
    .filter((f) => f.endsWith('.md'))
    .sort((a, b) => a.localeCompare(b));

  const scenarios = files.map((f) => parseScenario(join(absDir, f)));

  if (filter === undefined) {
    return scenarios;
  }
  const needle = filter.toLowerCase();
  return scenarios.filter((s) => s.id.toLowerCase().includes(needle));
}

function checkRegex(pattern: string, flags: string | undefined, label: string, errors: string[]): void {
  try {
    new RegExp(pattern, flags);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`${label}: invalid regex pattern "${pattern}" (${message})`);
  }
}

function validateTier1Check(check: unknown, index: number, errors: string[]): void {
  const label = `tier1[${index}]`;
  if (check === null || typeof check !== 'object' || Array.isArray(check)) {
    errors.push(`${label}: entry must be an object`);
    return;
  }
  const c = check as Record<string, unknown>;
  if (typeof c.type !== 'string') {
    errors.push(`${label}: missing required field "type"`);
    return;
  }
  if (!TIER1_TYPES.has(c.type)) {
    errors.push(`${label}: unknown tier1 type "${c.type}"`);
    return;
  }

  const withType = `${label} (${c.type})`;
  switch (c.type) {
    case 'max_files_changed':
    case 'max_lines_changed':
      if (typeof c.value !== 'number') {
        errors.push(`${withType}: missing required field "value"`);
      }
      break;
    case 'file_exists':
    case 'file_absent':
      if (typeof c.path !== 'string') {
        errors.push(`${withType}: missing required field "path"`);
      }
      break;
    case 'file_contains':
      if (typeof c.path !== 'string') {
        errors.push(`${withType}: missing required field "path"`);
      }
      if (typeof c.pattern !== 'string') {
        errors.push(`${withType}: missing required field "pattern"`);
      } else {
        checkRegex(c.pattern, undefined, withType, errors);
      }
      break;
    case 'reply_matches':
    case 'reply_not_matches':
      if (typeof c.pattern !== 'string') {
        errors.push(`${withType}: missing required field "pattern"`);
      } else {
        checkRegex(c.pattern, typeof c.flags === 'string' ? c.flags : undefined, withType, errors);
      }
      break;
    case 'diff_empty':
    case 'exit_ok':
      // no additional fields
      break;
    default:
      break;
  }
}

/**
 * Validate every *.md scenario in a directory. Never throws; collects errors per file.
 * Returns only entries that have at least one error.
 */
export function validateScenarios(
  scenariosDir: string,
  benchRoot: string,
): { file: string; errors: string[] }[] {
  const absDir = resolve(scenariosDir);
  const absBenchRoot = resolve(benchRoot);
  const files = readdirSync(absDir)
    .filter((f) => f.endsWith('.md'))
    .sort((a, b) => a.localeCompare(b));

  const results: { file: string; errors: string[] }[] = [];

  for (const f of files) {
    const filePath = join(absDir, f);
    const errors: string[] = [];

    let scenario: Scenario;
    try {
      scenario = parseScenario(filePath);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(message);
      results.push({ file: filePath, errors });
      continue;
    }

    try {
      const base = basename(f, '.md');
      if (scenario.id !== base) {
        errors.push(`id "${scenario.id}" does not match filename "${base}"`);
      }

      if (scenario.k < 1) {
        errors.push(`k must be >= 1, got ${scenario.k}`);
      }

      if (Array.isArray(scenario.tier1)) {
        scenario.tier1.forEach((check, i) => validateTier1Check(check, i, errors));
      } else {
        errors.push('tier1 must be an array');
      }

      const fixtureDir = join(absBenchRoot, 'fixtures', 'repos', scenario.fixture);
      if (!existsSync(fixtureDir) || !statSync(fixtureDir).isDirectory()) {
        errors.push(`fixture dir not found: ${fixtureDir}`);
      }

      if (scenario.rubric) {
        const rubricPath = join(absBenchRoot, scenario.rubric);
        if (!existsSync(rubricPath)) {
          errors.push(`rubric file not found: ${rubricPath}`);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`unexpected validation error: ${message}`);
    }

    if (errors.length > 0) {
      results.push({ file: filePath, errors });
    }
  }

  return results;
}
