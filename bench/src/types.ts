// Interface contract for fable-bench. Architect-owned; packets import, never edit.
// Signature changes go through SPEC.md.

export type Condition = 'baseline' | 'treatment';

export type Tier1Check =
  | { type: 'max_files_changed'; value: number }
  | { type: 'max_lines_changed'; value: number }
  | { type: 'file_exists'; path: string }
  | { type: 'file_absent'; path: string }
  | { type: 'file_contains'; path: string; pattern: string }
  | { type: 'reply_matches'; pattern: string; flags?: string }
  | { type: 'reply_not_matches'; pattern: string; flags?: string }
  | { type: 'diff_empty' }
  | { type: 'exit_ok' };

export interface Scenario {
  id: string;
  skill: string;
  file: string;             // absolute path of the scenario .md
  fixture: string;          // dir name under fixtures/repos/
  prompt: string;
  k: number;
  model: string;
  judgeModel: string;
  allowedTools: string[];
  maxBudgetUsd: number;
  timeoutS: number;
  tier1: Tier1Check[];
  rubric?: string;          // path relative to bench root, e.g. rubrics/scope-discipline.md
  intent: string;           // markdown body after frontmatter
}

export interface DiffStat {
  filesChanged: number;
  insertions: number;
  deletions: number;
  files: string[];          // paths relative to workspace root
}

export interface ExecRequest {
  kind: 'scenario' | 'judge';
  scenarioId: string;
  condition: Condition;
  iteration: number;        // 0-based
  prompt: string;
  model: string;
  cwd: string;
  allowedTools: string[];
  maxBudgetUsd: number;
  timeoutMs: number;
}

export interface ExecResult {
  finalText: string;
  events: unknown[];        // stream-json events (live) or replayed
  exitCode: number;
  costUsd: number | null;   // as reported by the result event; null if absent
  durationMs: number;
  // Mock-only passthrough. Live runs leave these undefined; the runner computes
  // them from the workspace before cleanup.
  diff?: string;
  diffStat?: DiffStat;
  workspaceFiles?: Record<string, string | null>; // null = file absent
}

export interface Executor {
  execute(req: ExecRequest): Promise<ExecResult>;
}

export interface RunRecord {
  scenarioId: string;
  condition: Condition;
  iteration: number;
  model: string;
  finalText: string;
  transcriptPath: string;   // jsonl written under <out>/transcripts/
  transcriptText: string;   // assistant-visible text of all events, for judge + quote check
  diff: string;
  diffStat: DiffStat;
  // Contents of every file a tier-1 file_* check references, captured before
  // workspace cleanup. null = file absent. Graders never touch the fs.
  workspaceFiles: Record<string, string | null>;
  exitCode: number;
  costUsd: number | null;
  durationMs: number;
}

export interface Tier1Result {
  check: Tier1Check;
  pass: boolean;
  detail: string;           // e.g. "2 files changed (limit 1)"
}

export interface JudgeResult {
  verdict: 'PASS' | 'FAIL';
  reasoning: string;
  rationalizationQuote: string;   // empty on PASS
  quoteVerified: boolean;         // substring-checked against transcriptText
  costUsd: number | null;
}

export interface GradedRun {
  run: RunRecord;
  tier1: Tier1Result[];
  judge?: JudgeResult;
  pass: boolean;            // all tier1 pass AND (judge PASS if rubric declared)
}

export interface ConditionSummary {
  runs: GradedRun[];
  passRate: number;         // passed / k
  passAtK: boolean;         // any run passed
  passHatK: boolean;        // all runs passed
  costUsd: number;          // sum of reported costs incl. judge
}

export interface ScenarioResults {
  scenarioId: string;
  skill: string;
  baseline?: ConditionSummary;
  treatment?: ConditionSummary;
}

export interface BenchResults {
  startedAt: string;        // ISO
  cliVersion: string;       // fable-bench version
  mock: boolean;
  modelOverride?: string;
  k?: number;               // override, if given
  scenarios: ScenarioResults[];
  totalCostUsd: number;
}
