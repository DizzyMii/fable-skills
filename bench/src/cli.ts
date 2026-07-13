#!/usr/bin/env node
// Orchestration only: arg parsing + command dispatch. Grading/rendering logic
// lives in tier1.ts / judge.ts / report.ts.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { LiveExecutor, MockExecutor } from './executor.js';
import { judgeRun } from './judge.js';
import { aggregate, renderReport } from './report.js';
import { runScenario } from './runner.js';
import { loadScenarios, validateScenarios } from './scenario.js';
import { gradeTier1 } from './tier1.js';
import type { BenchResults, Condition, Executor, GradedRun, Scenario } from './types.js';

// Compiled entrypoint lives at dist/src/cli.js; bench/ is two dirs up. Never cwd.
const __filename = fileURLToPath(import.meta.url);
const benchRoot = path.resolve(path.dirname(__filename), '..', '..');

function readCliVersion(): string {
  const pkg = JSON.parse(readFileSync(path.join(benchRoot, 'package.json'), 'utf8')) as {
    version?: string;
  };
  return pkg.version ?? '0.0.0';
}

/** Belt-and-suspenders contamination flag: warns if the user's global CLAUDE.md carries the fable-skills markers. */
function warnIfContaminated(): void {
  const claudeMdPath = path.join(os.homedir(), '.claude', 'CLAUDE.md');
  if (!existsSync(claudeMdPath)) return;
  try {
    const contents = readFileSync(claudeMdPath, 'utf8');
    if (contents.includes('fable-skills:start')) {
      process.stderr.write(
        'warning: user-level fable-skills config found at ~/.claude/CLAUDE.md; excluded from this run via --setting-sources project\n'
      );
    }
  } catch {
    // best-effort; an unreadable file is not this harness's problem
  }
}

function isoStamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function usage(): string {
  return [
    'Usage: fable-bench <command> [options]',
    '',
    'Commands:',
    '  run [--scenarios <substr>] [--condition both|baseline|treatment] [--k <n>]',
    '      [--model <id>] [--judge-model <id>] [--mock] [--out <dir>]',
    '  report <results.json> [--out <file>]',
    '  validate',
    '',
  ].join('\n');
}

function printValidationErrors(problems: { file: string; errors: string[] }[]): void {
  for (const p of problems) {
    console.error(p.file);
    for (const msg of p.errors) {
      console.error(`  ${msg}`);
    }
  }
}

async function cmdValidate(): Promise<number> {
  warnIfContaminated();
  const scenariosDir = path.join(benchRoot, 'scenarios');
  const problems = validateScenarios(scenariosDir, benchRoot);
  if (problems.length === 0) {
    console.log('all scenarios valid');
    return 0;
  }
  printValidationErrors(problems);
  return 1;
}

async function cmdRun(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      scenarios: { type: 'string' },
      condition: { type: 'string', default: 'both' },
      k: { type: 'string' },
      model: { type: 'string' },
      'judge-model': { type: 'string' },
      mock: { type: 'boolean', default: false },
      out: { type: 'string' },
    },
  });

  const startedAt = new Date().toISOString();

  const conditionFlag = values.condition as string;
  if (conditionFlag !== 'both' && conditionFlag !== 'baseline' && conditionFlag !== 'treatment') {
    console.error(`--condition must be one of both|baseline|treatment, got "${conditionFlag}"`);
    return 2;
  }
  const conditions: Condition[] = conditionFlag === 'both' ? ['baseline', 'treatment'] : [conditionFlag];

  const scenariosDir = path.join(benchRoot, 'scenarios');
  const problems = validateScenarios(scenariosDir, benchRoot);
  if (problems.length > 0) {
    printValidationErrors(problems);
    return 2;
  }

  const scenarios = loadScenarios(scenariosDir, values.scenarios as string | undefined);
  if (scenarios.length === 0) {
    console.error('no scenarios matched the given filter');
    return 2;
  }

  warnIfContaminated();

  const outDir = (values.out as string | undefined) ?? path.join(benchRoot, 'results', isoStamp());
  mkdirSync(outDir, { recursive: true });

  const mock = Boolean(values.mock);
  const executor: Executor = mock
    ? new MockExecutor(path.join(benchRoot, 'fixtures', 'transcripts'))
    : new LiveExecutor();

  const kOverride = values.k !== undefined ? Number(values.k) : undefined;
  const modelOverride = values.model as string | undefined;
  const judgeModelOverride = values['judge-model'] as string | undefined;

  const graded: GradedRun[] = [];

  for (const scenario of scenarios) {
    const judgeScenario: Scenario = judgeModelOverride ? { ...scenario, judgeModel: judgeModelOverride } : scenario;

    for (const condition of conditions) {
      const records = await runScenario(scenario, condition, {
        executor,
        k: kOverride,
        model: modelOverride,
        outDir,
        benchRoot,
        mock,
      });

      for (const record of records) {
        const tier1 = gradeTier1(scenario.tier1, record);
        const judge = scenario.rubric ? await judgeRun(executor, judgeScenario, record, benchRoot) : undefined;
        const pass = tier1.every((t) => t.pass) && (!judge || judge.verdict === 'PASS');
        graded.push({ run: record, tier1, judge, pass });
        process.stderr.write(`${scenario.id} ${condition} #${record.iteration}: ${pass ? 'PASS' : 'FAIL'}\n`);
      }
    }
  }

  const results = aggregate(graded, scenarios, {
    startedAt,
    cliVersion: readCliVersion(),
    mock,
    modelOverride,
    k: kOverride,
  });

  writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
  writeFileSync(path.join(outDir, 'report.md'), renderReport(results));

  console.log(outDir);
  console.log(`total cost: $${results.totalCostUsd.toFixed(4)}`);

  if (!conditions.includes('treatment')) {
    console.log('note: no treatment condition was run; no treatment gate applied');
    return 0;
  }

  const treatmentRuns = graded.filter((g) => g.run.condition === 'treatment');
  const allTreatmentPassed = treatmentRuns.every((g) => g.pass);
  return allTreatmentPassed ? 0 : 1;
}

async function cmdReport(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: { out: { type: 'string' } },
    allowPositionals: true,
  });

  const resultsPath = positionals[0];
  if (!resultsPath) {
    console.error('usage: fable-bench report <results.json> [--out <file>]');
    return 2;
  }

  const raw = readFileSync(resultsPath, 'utf8');
  const results = JSON.parse(raw) as BenchResults;
  const report = renderReport(results);

  if (values.out) {
    writeFileSync(values.out as string, report);
  } else {
    console.log(report);
  }
  return 0;
}

async function main(): Promise<void> {
  const [, , command, ...rest] = process.argv;

  let exitCode: number;
  switch (command) {
    case 'run':
      exitCode = await cmdRun(rest);
      break;
    case 'report':
      exitCode = await cmdReport(rest);
      break;
    case 'validate':
      exitCode = await cmdValidate();
      break;
    default:
      process.stderr.write(usage());
      exitCode = 2;
      break;
  }
  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  process.exit(1);
});
