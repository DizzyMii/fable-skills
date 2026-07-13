// Packet A: tests for scenario markdown parsing + schema validation.

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { loadScenarios, parseScenario, validateScenarios } from '../src/scenario.js';

// tsc does not copy non-.ts fixture files into the compiled output dir, and the
// package's "test" script (`tsc && node --test dist/test/`) always runs with
// cwd = bench/ (the package root). Resolve fixtures against cwd, not
// import.meta.url, so this works both from dist/ and from the ad hoc
// .tmp-a/ verification build.
const FIXTURES_DIR = join(process.cwd(), 'test', 'fixtures', 'scenarios');
const HAPPY_DIR = join(FIXTURES_DIR, 'happy');
const ERRORS_DIR = join(FIXTURES_DIR, 'errors');

function makeTempBenchRoot(fixtures: string[], rubrics: string[] = []): string {
  const root = mkdtempSync(join(tmpdir(), 'fable-bench-scenario-'));
  for (const name of fixtures) {
    mkdirSync(join(root, 'fixtures', 'repos', name), { recursive: true });
  }
  if (rubrics.length > 0) {
    mkdirSync(join(root, 'rubrics'), { recursive: true });
    for (const name of rubrics) {
      writeFileSync(join(root, 'rubrics', name), '# rubric\n');
    }
  }
  return root;
}

test('parseScenario parses full frontmatter, including a multi-entry tier1', () => {
  const filePath = join(HAPPY_DIR, 'valid.md');
  const scenario = parseScenario(filePath);

  assert.equal(scenario.id, 'valid');
  assert.equal(scenario.skill, 'fable-scope-discipline');
  assert.equal(scenario.file, filePath);
  assert.equal(scenario.fixture, 'demo-fixture');
  assert.equal(scenario.k, 2);
  assert.equal(scenario.model, 'claude-opus-4-8');
  assert.equal(scenario.judgeModel, 'claude-sonnet-5');
  assert.deepEqual(scenario.allowedTools, ['Skill', 'Read', 'Edit']);
  assert.equal(scenario.maxBudgetUsd, 2);
  assert.equal(scenario.timeoutS, 300);
  assert.equal(scenario.rubric, 'rubrics/demo-rubric.md');
  assert.match(scenario.prompt, /Review utils\/pages\.py/);
  assert.match(scenario.intent, /report-only contract/);

  assert.equal(scenario.tier1.length, 9);
  assert.deepEqual(scenario.tier1[0], { type: 'max_files_changed', value: 1 });
  assert.deepEqual(scenario.tier1[1], { type: 'max_lines_changed', value: 4 });
  assert.deepEqual(scenario.tier1[2], { type: 'file_exists', path: 'utils/pages.py' });
  assert.deepEqual(scenario.tier1[3], { type: 'file_absent', path: 'utils/pages_old.py' });
  assert.deepEqual(scenario.tier1[4], {
    type: 'file_contains',
    path: 'utils/pages.py',
    pattern: 'range\\(start, end\\)',
  });
  assert.deepEqual(scenario.tier1[5], { type: 'reply_matches', pattern: 'report', flags: 'i' });
  assert.deepEqual(scenario.tier1[6], { type: 'reply_not_matches', pattern: 'fixed the bug' });
  assert.deepEqual(scenario.tier1[7], { type: 'diff_empty' });
  assert.deepEqual(scenario.tier1[8], { type: 'exit_ok' });
});

test('parseScenario applies documented defaults when optional fields are omitted', () => {
  const scenario = parseScenario(join(HAPPY_DIR, 'defaults.md'));

  assert.equal(scenario.id, 'defaults');
  assert.equal(scenario.k, 3);
  assert.equal(scenario.model, 'claude-opus-4-8');
  assert.equal(scenario.judgeModel, 'claude-sonnet-5');
  assert.deepEqual(scenario.allowedTools, ['Skill']);
  assert.equal(scenario.maxBudgetUsd, 1);
  assert.equal(scenario.timeoutS, 600);
  assert.deepEqual(scenario.tier1, []);
  assert.equal(scenario.rubric, undefined);
  assert.equal(scenario.intent, '');
});

test('parseScenario throws an Error naming the file and the missing field', () => {
  const filePath = join(ERRORS_DIR, 'missing-field.md');
  assert.throws(
    () => parseScenario(filePath),
    (err: unknown) => {
      const message = (err as Error).message;
      assert.ok(message.includes(filePath), `expected message to include file path, got: ${message}`);
      assert.ok(message.includes('fixture'), `expected message to name the field, got: ${message}`);
      return true;
    },
  );
});

test('loadScenarios parses every *.md in a dir, sorted by filename', () => {
  const scenarios = loadScenarios(HAPPY_DIR);
  assert.deepEqual(
    scenarios.map((s) => s.id),
    ['defaults', 'valid'],
  );
});

test('loadScenarios filters by case-insensitive substring on id', () => {
  const scenarios = loadScenarios(HAPPY_DIR, 'VAL');
  assert.deepEqual(
    scenarios.map((s) => s.id),
    ['valid'],
  );
});

test('validateScenarios reports no errors for well-formed scenarios', () => {
  const benchRoot = makeTempBenchRoot(['demo-fixture', 'blank-fixture'], ['demo-rubric.md']);
  try {
    const results = validateScenarios(HAPPY_DIR, benchRoot);
    assert.deepEqual(results, []);
  } finally {
    rmSync(benchRoot, { recursive: true, force: true });
  }
});

test('validateScenarios collects parse failures instead of throwing', () => {
  const benchRoot = makeTempBenchRoot(['whatever-fixture']);
  try {
    assert.doesNotThrow(() => validateScenarios(ERRORS_DIR, benchRoot));
    const results = validateScenarios(ERRORS_DIR, benchRoot);
    const entry = results.find((r) => r.file.endsWith('missing-field.md'));
    assert.ok(entry, 'expected an entry for missing-field.md');
    assert.ok(entry!.errors.some((e) => e.includes('fixture')));
  } finally {
    rmSync(benchRoot, { recursive: true, force: true });
  }
});

test('validateScenarios flags id/filename mismatch', () => {
  const benchRoot = makeTempBenchRoot(['whatever-fixture']);
  try {
    const results = validateScenarios(ERRORS_DIR, benchRoot);
    const entry = results.find((r) => r.file.endsWith('id-mismatch.md'));
    assert.ok(entry);
    assert.ok(entry!.errors.some((e) => e.includes('does not match filename')));
  } finally {
    rmSync(benchRoot, { recursive: true, force: true });
  }
});

test('validateScenarios flags k < 1', () => {
  const benchRoot = makeTempBenchRoot(['whatever-fixture']);
  try {
    const results = validateScenarios(ERRORS_DIR, benchRoot);
    const entry = results.find((r) => r.file.endsWith('bad-k.md'));
    assert.ok(entry);
    assert.ok(entry!.errors.some((e) => e.includes('k must be >= 1')));
  } finally {
    rmSync(benchRoot, { recursive: true, force: true });
  }
});

test('validateScenarios flags a tier1 type outside the nine-member union', () => {
  const benchRoot = makeTempBenchRoot(['whatever-fixture']);
  try {
    const results = validateScenarios(ERRORS_DIR, benchRoot);
    const entry = results.find((r) => r.file.endsWith('unknown-tier1-type.md'));
    assert.ok(entry);
    assert.ok(entry!.errors.some((e) => e.includes('unknown tier1 type "bogus_check"')));
  } finally {
    rmSync(benchRoot, { recursive: true, force: true });
  }
});

test('validateScenarios flags a tier1 entry missing required fields for its type', () => {
  const benchRoot = makeTempBenchRoot(['whatever-fixture']);
  try {
    const results = validateScenarios(ERRORS_DIR, benchRoot);
    const entry = results.find((r) => r.file.endsWith('incomplete-tier1.md'));
    assert.ok(entry);
    assert.ok(entry!.errors.some((e) => e.includes('missing required field "pattern"')));
  } finally {
    rmSync(benchRoot, { recursive: true, force: true });
  }
});

test('validateScenarios flags patterns that fail new RegExp(...)', () => {
  const benchRoot = makeTempBenchRoot(['whatever-fixture']);
  try {
    const results = validateScenarios(ERRORS_DIR, benchRoot);
    const entry = results.find((r) => r.file.endsWith('bad-regex.md'));
    assert.ok(entry);
    const regexErrors = entry!.errors.filter((e) => e.includes('invalid regex pattern'));
    assert.equal(regexErrors.length, 2);
  } finally {
    rmSync(benchRoot, { recursive: true, force: true });
  }
});

test('validateScenarios flags a fixture dir missing under benchRoot/fixtures/repos', () => {
  const scenariosDir = mkdtempSync(join(tmpdir(), 'fable-bench-scenariodir-'));
  const benchRoot = mkdtempSync(join(tmpdir(), 'fable-bench-root-'));
  try {
    writeFileSync(
      join(scenariosDir, 'ghost-fixture.md'),
      [
        '---',
        'id: ghost-fixture',
        'skill: fable-prove-it',
        'fixture: does-not-exist',
        'prompt: |',
        '  This references a fixture dir that is never created.',
        '---',
        '',
      ].join('\n'),
    );
    mkdirSync(join(benchRoot, 'fixtures', 'repos'), { recursive: true });

    const results = validateScenarios(scenariosDir, benchRoot);
    assert.equal(results.length, 1);
    assert.ok(results[0].errors.some((e) => e.includes('fixture dir not found')));
    assert.ok(!results[0].errors.some((e) => e.includes('rubric')));
  } finally {
    rmSync(scenariosDir, { recursive: true, force: true });
    rmSync(benchRoot, { recursive: true, force: true });
  }
});

test('validateScenarios flags a declared rubric file missing under benchRoot', () => {
  const scenariosDir = mkdtempSync(join(tmpdir(), 'fable-bench-scenariodir-'));
  const benchRoot = mkdtempSync(join(tmpdir(), 'fable-bench-root-'));
  try {
    writeFileSync(
      join(scenariosDir, 'ghost-rubric.md'),
      [
        '---',
        'id: ghost-rubric',
        'skill: fable-prove-it',
        'fixture: real-fixture',
        'rubric: rubrics/does-not-exist.md',
        'prompt: |',
        '  This references a rubric file that is never created.',
        '---',
        '',
      ].join('\n'),
    );
    mkdirSync(join(benchRoot, 'fixtures', 'repos', 'real-fixture'), { recursive: true });

    const results = validateScenarios(scenariosDir, benchRoot);
    assert.equal(results.length, 1);
    assert.ok(results[0].errors.some((e) => e.includes('rubric file not found')));
    assert.ok(!results[0].errors.some((e) => e.includes('fixture dir not found')));
  } finally {
    rmSync(scenariosDir, { recursive: true, force: true });
    rmSync(benchRoot, { recursive: true, force: true });
  }
});
