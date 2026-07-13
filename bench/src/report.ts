// Pure aggregation + markdown rendering. No fs access here — cli.ts owns I/O.

import type { BenchResults, ConditionSummary, GradedRun, Scenario, ScenarioResults } from './types.js';

interface AggregateMeta {
  startedAt: string;
  cliVersion: string;
  mock: boolean;
  modelOverride?: string;
  k?: number;
}

function runTotalCost(run: GradedRun): number {
  return (run.run.costUsd ?? 0) + (run.judge?.costUsd ?? 0);
}

function summarizeCondition(runs: GradedRun[]): ConditionSummary {
  const passed = runs.filter((r) => r.pass).length;
  return {
    runs,
    passRate: runs.length === 0 ? 0 : passed / runs.length,
    passAtK: passed > 0,
    passHatK: runs.length > 0 && passed === runs.length,
    costUsd: runs.reduce((sum, r) => sum + runTotalCost(r), 0),
  };
}

/**
 * Groups graded runs by scenarioId (order taken from `scenarios`, not from the
 * order runs happen to arrive in) then by condition, and computes per-condition
 * pass-rate/pass@k/pass^k/cost summaries.
 */
export function aggregate(graded: GradedRun[], scenarios: Scenario[], meta: AggregateMeta): BenchResults {
  const scenarioResults: ScenarioResults[] = scenarios.map((scenario) => {
    const runsForScenario = graded.filter((g) => g.run.scenarioId === scenario.id);
    const baselineRuns = runsForScenario.filter((g) => g.run.condition === 'baseline');
    const treatmentRuns = runsForScenario.filter((g) => g.run.condition === 'treatment');
    const inlineRuns = runsForScenario.filter((g) => g.run.condition === 'inline');

    const entry: ScenarioResults = { scenarioId: scenario.id, skill: scenario.skill };
    if (baselineRuns.length > 0) entry.baseline = summarizeCondition(baselineRuns);
    if (treatmentRuns.length > 0) entry.treatment = summarizeCondition(treatmentRuns);
    if (inlineRuns.length > 0) entry.inline = summarizeCondition(inlineRuns);
    return entry;
  });

  const totalCostUsd = scenarioResults.reduce(
    (sum, s) => sum + (s.baseline?.costUsd ?? 0) + (s.treatment?.costUsd ?? 0) + (s.inline?.costUsd ?? 0),
    0
  );

  const results: BenchResults = {
    startedAt: meta.startedAt,
    cliVersion: meta.cliVersion,
    mock: meta.mock,
    scenarios: scenarioResults,
    totalCostUsd,
  };
  if (meta.modelOverride !== undefined) results.modelOverride = meta.modelOverride;
  if (meta.k !== undefined) results.k = meta.k;
  return results;
}

function passCell(summary?: ConditionSummary): string {
  if (!summary) return '—';
  const passed = summary.runs.filter((r) => r.pass).length;
  const total = summary.runs.length;
  const rate = total === 0 ? 0 : Math.round((passed / total) * 100);
  return `${passed}/${total} (${rate}%)`;
}

function boolCell(v: boolean | undefined): string {
  return v === undefined ? '—' : v ? 'yes' : 'no';
}

function renderSummaryRow(s: ScenarioResults, hasInline: boolean): string {
  const baselinePass = passCell(s.baseline);
  const treatmentPass = passCell(s.treatment);
  const passAtKParts = [boolCell(s.baseline?.passAtK), boolCell(s.treatment?.passAtK)];
  const passHatKParts = [boolCell(s.baseline?.passHatK), boolCell(s.treatment?.passHatK)];
  if (hasInline) {
    passAtKParts.push(boolCell(s.inline?.passAtK));
    passHatKParts.push(boolCell(s.inline?.passHatK));
  }
  const passAtK = passAtKParts.join(' → ');
  const passHatK = passHatKParts.join(' → ');
  // FLIP stays baseline-vs-treatment: inline is a diagnostic condition, not
  // part of the ship gate.
  const flip = s.baseline && s.treatment && s.treatment.passRate > s.baseline.passRate ? 'FLIP' : '—';

  if (hasInline) {
    const inlinePass = passCell(s.inline);
    return `| ${s.scenarioId} | ${s.skill} | ${baselinePass} | ${treatmentPass} | ${inlinePass} | ${passAtK} | ${passHatK} | ${flip} |`;
  }
  return `| ${s.scenarioId} | ${s.skill} | ${baselinePass} | ${treatmentPass} | ${passAtK} | ${passHatK} | ${flip} |`;
}

function renderRun(g: GradedRun): string[] {
  const lines: string[] = [];
  const status = g.pass ? 'PASS' : 'FAIL';
  const failedTier1 = g.tier1.filter((t) => !t.pass);
  const tier1Detail =
    failedTier1.length > 0
      ? ' | tier1 failed: ' + failedTier1.map((t) => `${t.check.type} (${t.detail})`).join('; ')
      : '';
  const judgeDetail = g.judge ? ` | judge: ${g.judge.verdict} — ${g.judge.reasoning}` : '';

  lines.push(`- ${g.run.condition} #${g.run.iteration}: ${status}${tier1Detail}${judgeDetail}`);

  if (g.judge && g.judge.verdict === 'FAIL') {
    if (g.judge.rationalizationQuote.trim() === '') {
      lines.push('  (no quote captured)');
    } else {
      const attribution = g.judge.quoteVerified
        ? `(${g.run.condition}, iteration ${g.run.iteration})`
        : `(${g.run.condition}, iteration ${g.run.iteration}) — UNVERIFIED QUOTE`;
      lines.push(`  > ${g.judge.rationalizationQuote}`);
      lines.push(`  > — ${attribution}`);
    }
  }

  return lines;
}

/** Renders a BenchResults object as the markdown report described in SPEC.md. Pure, no fs. */
export function renderReport(results: BenchResults): string {
  const lines: string[] = [];

  lines.push('# fable-bench report');
  lines.push('');
  lines.push(`- Started: ${results.startedAt}`);
  lines.push(`- CLI version: ${results.cliVersion}`);
  lines.push(`- Mode: ${results.mock ? 'mock' : 'live'}`);
  if (results.modelOverride !== undefined) {
    lines.push(`- Model override: ${results.modelOverride}`);
  }
  if (results.k !== undefined) {
    lines.push(`- k override: ${results.k}`);
  }
  lines.push(`- Total cost: $${results.totalCostUsd.toFixed(4)}`);
  lines.push('');

  const hasInline = results.scenarios.some((s) => s.inline !== undefined);

  lines.push('## Summary');
  lines.push('');
  if (hasInline) {
    lines.push(
      '| scenario | skill | baseline pass | treatment pass | inline pass | pass@k (B→T→I) | pass^k (B→T→I) | flip |'
    );
    lines.push('|---|---|---|---|---|---|---|---|');
  } else {
    lines.push('| scenario | skill | baseline pass | treatment pass | pass@k (B→T) | pass^k (B→T) | flip |');
    lines.push('|---|---|---|---|---|---|---|');
  }
  for (const s of results.scenarios) {
    lines.push(renderSummaryRow(s, hasInline));
  }
  lines.push('');

  lines.push('## Runs');
  for (const s of results.scenarios) {
    lines.push('');
    lines.push(`### ${s.scenarioId} (${s.skill})`);
    if (s.baseline) {
      lines.push('');
      lines.push('**baseline**');
      lines.push('');
      for (const run of s.baseline.runs) lines.push(...renderRun(run));
    }
    if (s.treatment) {
      lines.push('');
      lines.push('**treatment**');
      lines.push('');
      for (const run of s.treatment.runs) lines.push(...renderRun(run));
    }
    if (s.inline) {
      lines.push('');
      lines.push('**inline**');
      lines.push('');
      for (const run of s.inline.runs) lines.push(...renderRun(run));
    }
  }
  lines.push('');

  lines.push('## Baseline definition');
  lines.push('');
  lines.push(
    "Baseline runs are the stock model in the fixture workspace with no user-level config " +
      "(--setting-sources project), which is weaker than the manual test record's baseline " +
      "(Opus + a superpowers-loaded CLAUDE.md), so flips here may be easier to reproduce than " +
      "the docs' conservative record."
  );

  return lines.join('\n');
}
