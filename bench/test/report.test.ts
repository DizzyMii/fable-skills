import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregate, renderReport } from '../src/report.js';
import type { GradedRun, RunRecord, Scenario, Tier1Result, JudgeResult, BenchResults } from '../src/types.js';

// --- fixtures ---

function makeScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: 's-test',
    skill: 'fable-test',
    file: '/fake/scenarios/s-test.md',
    fixture: 'blank',
    prompt: 'do the thing',
    k: 3,
    model: 'claude-opus-4-8',
    judgeModel: 'claude-sonnet-5',
    allowedTools: ['Skill'],
    maxBudgetUsd: 1,
    timeoutS: 600,
    tier1: [],
    intent: 'intent body',
    ...overrides,
  };
}

function makeRecord(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    scenarioId: 's-test',
    condition: 'baseline',
    iteration: 0,
    model: 'claude-opus-4-8',
    finalText: 'final reply',
    transcriptPath: '/fake/transcripts/s-test/baseline-0.jsonl',
    transcriptText: 'assistant: did some stuff',
    diff: '',
    diffStat: { filesChanged: 0, insertions: 0, deletions: 0, files: [] },
    workspaceFiles: {},
    exitCode: 0,
    costUsd: 0.01,
    durationMs: 100,
    ...overrides,
  };
}

function makeGradedRun(overrides: {
  record?: Partial<RunRecord>;
  tier1?: Tier1Result[];
  judge?: JudgeResult;
  pass: boolean;
}): GradedRun {
  return {
    run: makeRecord(overrides.record),
    tier1: overrides.tier1 ?? [],
    judge: overrides.judge,
    pass: overrides.pass,
  };
}

function judgeResult(overrides: Partial<JudgeResult> = {}): JudgeResult {
  return {
    verdict: 'PASS',
    reasoning: 'looked fine',
    rationalizationQuote: '',
    quoteVerified: false,
    costUsd: 0.002,
    ...overrides,
  };
}

// --- aggregate ---

test('aggregate: passRate/passAtK/passHatK on mixed 2-of-3 passes', () => {
  const scenario = makeScenario();
  const graded: GradedRun[] = [
    makeGradedRun({ record: { condition: 'treatment', iteration: 0 }, pass: true }),
    makeGradedRun({ record: { condition: 'treatment', iteration: 1 }, pass: true }),
    makeGradedRun({ record: { condition: 'treatment', iteration: 2 }, pass: false }),
  ];
  const results = aggregate(graded, [scenario], {
    startedAt: '2026-07-13T00:00:00.000Z',
    cliVersion: '0.1.0',
    mock: true,
  });
  const treatment = results.scenarios[0].treatment;
  assert.ok(treatment);
  assert.equal(treatment!.passRate, 2 / 3);
  assert.equal(treatment!.passAtK, true);
  assert.equal(treatment!.passHatK, false);
});

test('aggregate: passHatK true only when all runs pass', () => {
  const scenario = makeScenario();
  const graded: GradedRun[] = [
    makeGradedRun({ record: { condition: 'baseline', iteration: 0 }, pass: true }),
    makeGradedRun({ record: { condition: 'baseline', iteration: 1 }, pass: true }),
  ];
  const results = aggregate(graded, [scenario], {
    startedAt: '2026-07-13T00:00:00.000Z',
    cliVersion: '0.1.0',
    mock: true,
  });
  const baseline = results.scenarios[0].baseline;
  assert.ok(baseline);
  assert.equal(baseline!.passRate, 1);
  assert.equal(baseline!.passAtK, true);
  assert.equal(baseline!.passHatK, true);
});

test('aggregate: passAtK false and passHatK false when all fail', () => {
  const scenario = makeScenario();
  const graded: GradedRun[] = [
    makeGradedRun({ record: { condition: 'baseline', iteration: 0 }, pass: false }),
    makeGradedRun({ record: { condition: 'baseline', iteration: 1 }, pass: false }),
  ];
  const results = aggregate(graded, [scenario], {
    startedAt: '2026-07-13T00:00:00.000Z',
    cliVersion: '0.1.0',
    mock: true,
  });
  const baseline = results.scenarios[0].baseline;
  assert.ok(baseline);
  assert.equal(baseline!.passRate, 0);
  assert.equal(baseline!.passAtK, false);
  assert.equal(baseline!.passHatK, false);
});

test('aggregate: cost sums run.costUsd plus judge costUsd, treating nulls as 0', () => {
  const scenario = makeScenario();
  const graded: GradedRun[] = [
    makeGradedRun({
      record: { condition: 'treatment', iteration: 0, costUsd: 0.05 },
      judge: judgeResult({ costUsd: 0.01 }),
      pass: true,
    }),
    makeGradedRun({
      record: { condition: 'treatment', iteration: 1, costUsd: null },
      judge: judgeResult({ costUsd: null }),
      pass: true,
    }),
    makeGradedRun({
      record: { condition: 'treatment', iteration: 2, costUsd: 0.02 },
      // no judge at all (no rubric)
      pass: true,
    }),
  ];
  const results = aggregate(graded, [scenario], {
    startedAt: '2026-07-13T00:00:00.000Z',
    cliVersion: '0.1.0',
    mock: true,
  });
  const treatment = results.scenarios[0].treatment;
  assert.ok(treatment);
  // 0.05 + 0.01 + 0 + 0 + 0.02 + 0 = 0.08
  assert.ok(Math.abs(treatment!.costUsd - 0.08) < 1e-9, `expected ~0.08, got ${treatment!.costUsd}`);
  assert.ok(Math.abs(results.totalCostUsd - 0.08) < 1e-9);
});

test('aggregate: preserves scenario order from scenarios argument, not graded run order', () => {
  const scenarioA = makeScenario({ id: 's-a', skill: 'fable-a' });
  const scenarioB = makeScenario({ id: 's-b', skill: 'fable-b' });
  // graded runs arrive for B before A
  const graded: GradedRun[] = [
    makeGradedRun({ record: { scenarioId: 's-b', condition: 'baseline' }, pass: true }),
    makeGradedRun({ record: { scenarioId: 's-a', condition: 'baseline' }, pass: true }),
  ];
  const results = aggregate(graded, [scenarioA, scenarioB], {
    startedAt: '2026-07-13T00:00:00.000Z',
    cliVersion: '0.1.0',
    mock: true,
  });
  assert.deepEqual(
    results.scenarios.map((s) => s.scenarioId),
    ['s-a', 's-b']
  );
});

test('aggregate: scenario with only baseline runs leaves treatment undefined', () => {
  const scenario = makeScenario();
  const graded: GradedRun[] = [
    makeGradedRun({ record: { condition: 'baseline', iteration: 0 }, pass: true }),
  ];
  const results = aggregate(graded, [scenario], {
    startedAt: '2026-07-13T00:00:00.000Z',
    cliVersion: '0.1.0',
    mock: true,
  });
  assert.ok(results.scenarios[0].baseline);
  assert.equal(results.scenarios[0].treatment, undefined);
});

test('aggregate: fills ScenarioResults.inline from inline-condition runs', () => {
  const scenario = makeScenario({ id: 's-inline' });
  const graded: GradedRun[] = [
    makeGradedRun({ record: { scenarioId: 's-inline', condition: 'inline', iteration: 0 }, pass: true }),
    makeGradedRun({ record: { scenarioId: 's-inline', condition: 'inline', iteration: 1 }, pass: false }),
  ];
  const results = aggregate(graded, [scenario], {
    startedAt: '2026-07-13T00:00:00.000Z',
    cliVersion: '0.1.0',
    mock: true,
  });
  const inline = results.scenarios[0].inline;
  assert.ok(inline);
  assert.equal(inline!.runs.length, 2);
  assert.equal(inline!.passRate, 0.5);
  assert.equal(inline!.passAtK, true);
  assert.equal(inline!.passHatK, false);
  // baseline/treatment stay undefined when no runs of those conditions exist.
  assert.equal(results.scenarios[0].baseline, undefined);
  assert.equal(results.scenarios[0].treatment, undefined);
});

test('aggregate: totalCostUsd includes inline-condition cost', () => {
  const scenario = makeScenario({ id: 's-inline-cost' });
  const graded: GradedRun[] = [
    makeGradedRun({
      record: { scenarioId: 's-inline-cost', condition: 'inline', iteration: 0, costUsd: 0.04 },
      pass: true,
    }),
  ];
  const results = aggregate(graded, [scenario], {
    startedAt: '2026-07-13T00:00:00.000Z',
    cliVersion: '0.1.0',
    mock: true,
  });
  assert.ok(Math.abs(results.scenarios[0].inline!.costUsd - 0.04) < 1e-9);
  assert.ok(Math.abs(results.totalCostUsd - 0.04) < 1e-9);
});

test('aggregate: scenario.skill on ScenarioResults comes from the matching Scenario', () => {
  const scenario = makeScenario({ id: 's-skill', skill: 'fable-scope-discipline' });
  const results = aggregate([], [scenario], {
    startedAt: '2026-07-13T00:00:00.000Z',
    cliVersion: '0.1.0',
    mock: true,
  });
  assert.equal(results.scenarios[0].skill, 'fable-scope-discipline');
});

test('aggregate: threads meta fields through (modelOverride, k, mock, cliVersion, startedAt)', () => {
  const scenario = makeScenario();
  const results = aggregate([], [scenario], {
    startedAt: '2026-07-13T01:02:03.000Z',
    cliVersion: '0.1.0',
    mock: false,
    modelOverride: 'claude-sonnet-5',
    k: 5,
  });
  assert.equal(results.startedAt, '2026-07-13T01:02:03.000Z');
  assert.equal(results.cliVersion, '0.1.0');
  assert.equal(results.mock, false);
  assert.equal(results.modelOverride, 'claude-sonnet-5');
  assert.equal(results.k, 5);
});

// --- renderReport ---

function buildFlipResults(): BenchResults {
  const scenario = makeScenario({ id: 's-flip', skill: 'fable-scope-discipline' });
  const graded: GradedRun[] = [
    makeGradedRun({ record: { scenarioId: 's-flip', condition: 'baseline', iteration: 0 }, pass: false }),
    makeGradedRun({ record: { scenarioId: 's-flip', condition: 'treatment', iteration: 0 }, pass: true }),
  ];
  return aggregate(graded, [scenario], {
    startedAt: '2026-07-13T00:00:00.000Z',
    cliVersion: '0.1.0',
    mock: true,
  });
}

test('renderReport: summary row shows FLIP when treatment passRate exceeds baseline passRate', () => {
  const results = buildFlipResults();
  const report = renderReport(results);
  const row = report.split('\n').find((l) => l.startsWith('| s-flip '));
  assert.ok(row, 'expected summary row for s-flip');
  assert.match(row!, /FLIP/);
});

test('renderReport: summary row shows no FLIP when treatment passRate does not exceed baseline', () => {
  const scenario = makeScenario({ id: 's-noflip' });
  const graded: GradedRun[] = [
    makeGradedRun({ record: { scenarioId: 's-noflip', condition: 'baseline', iteration: 0 }, pass: true }),
    makeGradedRun({ record: { scenarioId: 's-noflip', condition: 'treatment', iteration: 0 }, pass: true }),
  ];
  const results = aggregate(graded, [scenario], {
    startedAt: '2026-07-13T00:00:00.000Z',
    cliVersion: '0.1.0',
    mock: true,
  });
  const report = renderReport(results);
  const row = report.split('\n').find((l) => l.startsWith('| s-noflip '));
  assert.ok(row);
  assert.doesNotMatch(row!, /FLIP/);
});

test('renderReport: no FLIP when a condition is missing entirely', () => {
  const scenario = makeScenario({ id: 's-baseline-only' });
  const graded: GradedRun[] = [
    makeGradedRun({ record: { scenarioId: 's-baseline-only', condition: 'baseline', iteration: 0 }, pass: false }),
  ];
  const results = aggregate(graded, [scenario], {
    startedAt: '2026-07-13T00:00:00.000Z',
    cliVersion: '0.1.0',
    mock: true,
  });
  const report = renderReport(results);
  const row = report.split('\n').find((l) => l.startsWith('| s-baseline-only '));
  assert.ok(row);
  assert.doesNotMatch(row!, /FLIP/);
});

test('renderReport: blockquote with UNVERIFIED QUOTE marker when quoteVerified is false', () => {
  const scenario = makeScenario({ id: 's-quote' });
  const graded: GradedRun[] = [
    makeGradedRun({
      record: { scenarioId: 's-quote', condition: 'treatment', iteration: 1 },
      judge: judgeResult({
        verdict: 'FAIL',
        reasoning: 'rationalized the shortcut',
        rationalizationQuote: 'I decided to skip the test since it was obviously fine.',
        quoteVerified: false,
      }),
      pass: false,
    }),
  ];
  const results = aggregate(graded, [scenario], {
    startedAt: '2026-07-13T00:00:00.000Z',
    cliVersion: '0.1.0',
    mock: true,
  });
  const report = renderReport(results);
  assert.match(report, /> I decided to skip the test since it was obviously fine\./);
  assert.match(report, /UNVERIFIED QUOTE/);
  assert.match(report, /treatment, iteration 1/);
});

test('renderReport: verified quote blockquote has no UNVERIFIED marker', () => {
  const scenario = makeScenario({ id: 's-quote-verified' });
  const graded: GradedRun[] = [
    makeGradedRun({
      record: { scenarioId: 's-quote-verified', condition: 'baseline', iteration: 0 },
      judge: judgeResult({
        verdict: 'FAIL',
        reasoning: 'rationalized',
        rationalizationQuote: 'This is fine to skip.',
        quoteVerified: true,
      }),
      pass: false,
    }),
  ];
  const results = aggregate(graded, [scenario], {
    startedAt: '2026-07-13T00:00:00.000Z',
    cliVersion: '0.1.0',
    mock: true,
  });
  const report = renderReport(results);
  assert.match(report, /> This is fine to skip\./);
  assert.doesNotMatch(report, /UNVERIFIED QUOTE/);
});

test('renderReport: judge FAIL with empty quote renders "(no quote captured)"', () => {
  const scenario = makeScenario({ id: 's-no-quote' });
  const graded: GradedRun[] = [
    makeGradedRun({
      record: { scenarioId: 's-no-quote', condition: 'baseline', iteration: 0 },
      judge: judgeResult({ verdict: 'FAIL', reasoning: 'failed silently', rationalizationQuote: '', quoteVerified: false }),
      pass: false,
    }),
  ];
  const results = aggregate(graded, [scenario], {
    startedAt: '2026-07-13T00:00:00.000Z',
    cliVersion: '0.1.0',
    mock: true,
  });
  const report = renderReport(results);
  assert.match(report, /\(no quote captured\)/);
});

test('renderReport: contains the baseline-definition note', () => {
  const results = aggregate([], [makeScenario()], {
    startedAt: '2026-07-13T00:00:00.000Z',
    cliVersion: '0.1.0',
    mock: true,
  });
  const report = renderReport(results);
  assert.match(report, /stock model in the fixture workspace/);
  assert.match(report, /--setting-sources project/);
  assert.match(report, /superpowers-loaded CLAUDE\.md/);
});

test('renderReport: header includes started, mock flag, and total cost to 4 decimals', () => {
  const scenario = makeScenario();
  const graded: GradedRun[] = [
    makeGradedRun({ record: { condition: 'baseline', iteration: 0, costUsd: 0.123456 }, pass: true }),
  ];
  const results = aggregate(graded, [scenario], {
    startedAt: '2026-07-13T09:30:00.000Z',
    cliVersion: '0.1.0',
    mock: true,
  });
  const report = renderReport(results);
  assert.match(report, /2026-07-13T09:30:00\.000Z/);
  assert.match(report, /mock/i);
  assert.match(report, /\$0\.1235/);
});

test('renderReport: model override and k override appear in header when set', () => {
  const results = aggregate([], [makeScenario()], {
    startedAt: '2026-07-13T00:00:00.000Z',
    cliVersion: '0.1.0',
    mock: false,
    modelOverride: 'claude-sonnet-5',
    k: 7,
  });
  const report = renderReport(results);
  assert.match(report, /claude-sonnet-5/);
  assert.match(report, /\b7\b/);
});

test('renderReport: table has exactly one row per scenario', () => {
  const scenarios = [makeScenario({ id: 's-1' }), makeScenario({ id: 's-2' }), makeScenario({ id: 's-3' })];
  const graded: GradedRun[] = scenarios.map((s) =>
    makeGradedRun({ record: { scenarioId: s.id, condition: 'baseline', iteration: 0 }, pass: true })
  );
  const results = aggregate(graded, scenarios, {
    startedAt: '2026-07-13T00:00:00.000Z',
    cliVersion: '0.1.0',
    mock: true,
  });
  const report = renderReport(results);
  const rows = report.split('\n').filter((l) => /^\| s-\d /.test(l));
  assert.equal(rows.length, 3);
});

// --- inline condition ---

function buildInlineResults(): BenchResults {
  const scenario = makeScenario({ id: 's-inline-report', skill: 'fable-scope-discipline' });
  const graded: GradedRun[] = [
    makeGradedRun({ record: { scenarioId: 's-inline-report', condition: 'baseline', iteration: 0 }, pass: false }),
    makeGradedRun({ record: { scenarioId: 's-inline-report', condition: 'treatment', iteration: 0 }, pass: true }),
    makeGradedRun({ record: { scenarioId: 's-inline-report', condition: 'inline', iteration: 0 }, pass: true }),
  ];
  return aggregate(graded, [scenario], {
    startedAt: '2026-07-13T00:00:00.000Z',
    cliVersion: '0.1.0',
    mock: true,
  });
}

test('renderReport: summary table gains an inline pass column and three-part pass@k/pass^k cells when inline data exists', () => {
  const results = buildInlineResults();
  const report = renderReport(results);
  const lines = report.split('\n');

  const header = lines.find((l) => l.startsWith('| scenario |'));
  assert.ok(header, 'expected a summary header row');
  assert.match(header!, /inline pass/);
  assert.match(header!, /pass@k \(B→T→I\)/);
  assert.match(header!, /pass\^k \(B→T→I\)/);

  const row = lines.find((l) => l.startsWith('| s-inline-report '));
  assert.ok(row, 'expected summary row for s-inline-report');
  // scenario | skill | baseline pass | treatment pass | inline pass | pass@k | pass^k | flip
  const cells = row!
    .split('|')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  assert.equal(cells.length, 8);
  assert.match(cells[5], /^no → yes → yes$/); // pass@k (B→T→I)
  assert.match(cells[6], /^no → yes → yes$/); // pass^k (B→T→I)
});

test('renderReport: summary table stays two-part when no scenario has inline data', () => {
  const scenario = makeScenario({ id: 's-no-inline' });
  const graded: GradedRun[] = [
    makeGradedRun({ record: { scenarioId: 's-no-inline', condition: 'baseline', iteration: 0 }, pass: true }),
    makeGradedRun({ record: { scenarioId: 's-no-inline', condition: 'treatment', iteration: 0 }, pass: true }),
  ];
  const results = aggregate(graded, [scenario], {
    startedAt: '2026-07-13T00:00:00.000Z',
    cliVersion: '0.1.0',
    mock: true,
  });
  const report = renderReport(results);
  const lines = report.split('\n');

  const header = lines.find((l) => l.startsWith('| scenario |'));
  assert.equal(
    header,
    '| scenario | skill | baseline pass | treatment pass | pass@k (B→T) | pass^k (B→T) | flip |'
  );
  assert.doesNotMatch(header!, /inline pass/);

  const row = lines.find((l) => l.startsWith('| s-no-inline '));
  assert.ok(row);
  const cells = row!
    .split('|')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  assert.equal(cells.length, 7);
});

test('renderReport: per-scenario section renders an inline block after treatment when inline data is present', () => {
  const results = buildInlineResults();
  const report = renderReport(results);

  const treatmentIdx = report.indexOf('**treatment**');
  const inlineIdx = report.indexOf('**inline**');
  assert.ok(treatmentIdx !== -1, 'expected a treatment block');
  assert.ok(inlineIdx !== -1, 'expected an inline block');
  assert.ok(inlineIdx > treatmentIdx, 'inline block must come after treatment');
  assert.match(report, /- inline #0: PASS/);
});

// --- round-trip ---

test('round-trip: JSON.parse(JSON.stringify(results)) renders identically', () => {
  const scenario = makeScenario({ id: 's-roundtrip' });
  const graded: GradedRun[] = [
    makeGradedRun({
      record: { scenarioId: 's-roundtrip', condition: 'baseline', iteration: 0, costUsd: 0.01 },
      tier1: [{ check: { type: 'diff_empty' }, pass: false, detail: 'diff is not empty (12 chars)' }],
      judge: judgeResult({
        verdict: 'FAIL',
        reasoning: 'rationalized the shortcut',
        rationalizationQuote: 'It is fine to skip this.',
        quoteVerified: true,
      }),
      pass: false,
    }),
    makeGradedRun({
      record: { scenarioId: 's-roundtrip', condition: 'treatment', iteration: 0, costUsd: 0.02 },
      pass: true,
    }),
  ];
  const results = aggregate(graded, [scenario], {
    startedAt: '2026-07-13T00:00:00.000Z',
    cliVersion: '0.1.0',
    mock: true,
    modelOverride: 'claude-sonnet-5',
    k: 1,
  });
  const before = renderReport(results);
  const roundTripped = JSON.parse(JSON.stringify(results)) as BenchResults;
  const after = renderReport(roundTripped);
  assert.equal(after, before);
});
