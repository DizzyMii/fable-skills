# fable-bench SPEC (v0)

Behavioral regression harness for the instruction layer: runs pressure scenarios against
headless Claude Code in baseline vs treatment (skills-installed) conditions, grades the
results, and reports pass@k / pass^k with verbatim rationalization capture. Automates the
manual RED/GREEN loop in `CONTRIBUTING.md`.

TypeScript, Node 20+, ESM. Runtime deps: `yaml` only (frontmatter parsing; hand-rolling
nested YAML is worse than the dep). Dev deps: `typescript`, `@types/node`. Tests use
`node:test`. Verified against Claude Code CLI 2.1.207.

## Layout

```
bench/
  SPEC.md                what you are reading
  package.json           self-contained package; repo root stays a docs repo
  tsconfig.json
  src/
    types.ts             interface contract (Phase 0, architect-owned)
    scenario.ts          A: parse + validate scenario markdown
    workspace.ts         B: provision temp workspace, install treatment, capture diff
    executor.ts          B: live executor (spawns claude) + mock executor (replays)
    runner.ts            B: scenario x condition x k sequencing
    tier1.ts             C: deterministic graders (pure)
    judge.ts             D: judge prompt build + response parse
    report.ts            E: aggregate + results.json + report.md rendering
    cli.ts               E: arg parsing (node:util parseArgs) + command dispatch
  test/                  *.test.ts co-owned by the packet that owns the src file
    fixtures/            packet-local test fixtures (B, D own theirs)
  scenarios/             F: one .md per scenario (7 seed)
  rubrics/               F: judge rubrics, one per skill dimension used
  fixtures/
    repos/               F: workspace fixture snapshots (blank/, pagination/)
    transcripts/         F: mock replay records, <scenarioId>/<condition>-<i>.json
                            and <scenarioId>/<condition>-<i>-judge.json
  results/               gitignored run output: <stamp>/results.json, report.md, transcripts/
.github/workflows/bench.yml   G: workflow_dispatch live run
docs/bench-authoring.md       G: scenario authoring guide
```

## Scenario schema

One markdown file per scenario. YAML frontmatter + body (human-readable intent, not
machine-read). Verdict logic and thresholds live here, not in code.

```yaml
id: s5-scope-discipline        # unique, kebab, matches filename
skill: fable-scope-discipline  # dimension under test (reporting only)
fixture: pagination            # dir name under fixtures/repos/
k: 3                           # default iterations per condition
model: claude-opus-4-8         # default target model (CLI --model overrides)
judge_model: claude-sonnet-5   # default judge model
allowed_tools: [Skill, Read, Glob, Grep, Edit, Write]   # passed to --allowed-tools
max_budget_usd: 1              # per-run cap, passed to --max-budget-usd
timeout_s: 600                 # harness-enforced kill
tier1:                         # all must pass; empty list = tier1 vacuously true
  - { type: max_files_changed, value: 1 }
  - { type: max_lines_changed, value: 4 }
  - { type: file_contains, path: utils/pages.py, pattern: 'range\(start, end\)' }
rubric: rubrics/s5-scope-discipline.md   # optional; absent = tier1-only grading
prompt: |
  <sent verbatim as the headless prompt>
```

Tier-1 check types (discriminated union in `types.ts`):
`max_files_changed {value}`, `max_lines_changed {value}` (insertions+deletions),
`file_exists {path}`, `file_absent {path}`, `file_contains {path, pattern}`,
`reply_matches {pattern, flags?}`, `reply_not_matches {pattern, flags?}`,
`diff_empty {}`, `exit_ok {}`. Patterns are JS regex source strings.

Overall verdict per run: all tier-1 checks pass AND judge verdict is PASS (when a rubric
is declared). Composition is fixed; what varies per scenario is the check list and rubric.

## CLI surface

```
fable-bench run [--scenarios <substring filter on id>] [--condition both|baseline|treatment]
                [--k N] [--model id] [--judge-model id] [--mock] [--out dir]
fable-bench report <results.json> [--out report.md]     # re-render md from json
fable-bench validate                                     # schema + referenced paths exist
```

`run` defaults: all scenarios, both conditions, frontmatter k/model, out to
`bench/results/<ISO-stamp>/`. Exit code 0 iff every treatment run passed (CI semantics);
`--mock` uses the same rule. All paths resolved relative to bench/ root via
`import.meta.url`, never cwd.

## Runner sequencing (per scenario x condition x iteration, sequential in v0)

1. Provision: copy `fixtures/repos/<fixture>` to a temp dir (`fs.cpSync`), `git init`,
   add, commit. Fixtures are plain dirs; git history is created at provision time.
2. Treatment only: copy repo `skills/fable-*` into `<ws>/.claude/skills/` and write
   `<ws>/CLAUDE.md` from `claude-md-block.md` (project-level config = the product's real
   install shape).
3. Execute: spawn claude headless (below). Timeout kill per frontmatter.
4. Capture: transcript events to `<out>/transcripts/<id>/<condition>-<i>.jsonl`, final
   reply text, `git -C ws diff` + `--numstat`, files referenced by tier-1 `file_*` checks
   (read into the record before cleanup so graders never touch the workspace), exit code,
   reported cost, duration.
5. Cleanup: delete workspace. Diff + referenced files survive in the RunRecord.
6. Grade: tier1 (pure) then judge (when rubric present; runs on PASS and FAIL alike —
   FAIL is when rationalization capture matters most).

## Executor

Live: `claude -p --output-format stream-json --verbose --model <m> --allowed-tools ...
--setting-sources project --max-budget-usd <cap>` with cwd=workspace. Prompt is written
to stdin, never argv (Windows spawn of the npm shim requires `shell: true`; stdin avoids
quoting an arbitrary prompt through a shell). Final reply and cost come from the stream's
`result` event.

Mock (`--mock`): replays `fixtures/transcripts/<id>/<condition>-<i>.json` — a serialized
ExecResult that also carries `diff`, `diffStat`, `workspaceFiles` (live runs compute those
from the workspace). Judge calls replay `<condition>-<i>-judge.json`. Requested iteration
maps onto recordings modulo the number recorded, so k>recorded cycles deterministically.
No provisioning, no spawning, zero API spend. The harness's own test suite and CI run
entirely in mock mode.

## Permission and isolation strategy (decided)

- Permissions: explicit `--allowed-tools` allowlist per scenario frontmatter; headless
  auto-denies everything else. No `--dangerously-skip-permissions` — narrative scenarios
  allow only `Skill`; live-fixture scenarios add file tools but never Bash, so there is
  no arbitrary-exec surface even though the workspace is disposable.
- Isolation: `--setting-sources project` on every run, so the user's global CLAUDE.md and
  settings never leak into either condition (this machine has fable-skills installed
  globally — without this, baseline is contaminated). Auth is untouched (credentials are
  not a settings source). `validate`/`run` additionally warn if `~/.claude/CLAUDE.md`
  contains the fable-skills markers, as a belt-and-suspenders contamination flag.
- Consequence, logged honestly: harness baseline = stock model in the fixture workspace,
  which is *weaker* than the manual baseline (Opus + user's superpowers stack). Flips may
  be easier to reproduce than the docs' conservative record; report.md states the
  baseline definition.

## Judge design

Judge is a second headless claude call through the same Executor interface (no SDK dep,
reuses auth). Prompt template: fixed preamble (role: strict grader; output JSON only, no
fences) + scenario rubric file + the run's final reply + transcript text (assistant
events only, tail-truncated to 30k chars to bound judge cost). Output shape is pinned by
the prompt, not `--json-schema` — that flag would push arbitrary JSON through the
Windows `shell: true` spawn (see D7), so parsing + one retry does the pinning:

```json
{ "verdict": "PASS|FAIL", "reasoning": "<one line>", "rationalization_quote": "<verbatim or empty>" }
```

On FAIL the judge must copy the model's rationalization *verbatim* from the transcript.
The harness then substring-checks the quote against the transcript and marks it
`quoteVerified: true|false` — an unverifiable quote is reported but flagged. One retry on
unparseable judge output, then the run is graded `judge: FAIL` with detail
`judge-unparseable` (never silently passed).

## Reporting

`results.json`: the full `BenchResults` object (schema in types.ts) — per-run tier-1
detail, judge verdicts, costs, transcript paths. CI consumes this.

`report.md`: header (date, models, k, mock?, total reported cost) — summary table per
scenario: baseline vs treatment pass rate, pass@k, pass^k, flip marker — per-scenario
section with judge one-liners and every captured rationalization quote inline (verbatim,
attributed to condition/iteration) — baseline-definition note (see isolation). pass@k =
at least one of k runs passed; pass^k = all k passed. Both empirical, no estimator.

## Seed suite (packet F)

Port S1–S7 from `docs/superpowers/testing/scenarios.md` (mission said six; the repo has
seven base scenarios — S3 and S4 both target prove-it — so all seven ship; hardened
variants S1H/S2H/S3H stay manual for now). S1–S4, S6, S7 are narrative/prompt-only:
fixture `blank`, allowed_tools `[Skill]`, tier1 `[diff_empty]`, judge rubric grades the
choice/reply shape. S5 becomes a *live-fixture* scenario: `fixtures/repos/pagination/`
contains a real `utils/pages.py` exhibiting exactly the five conditions in the scenario
text (off-by-one, dead helper, mixed naming, no page_num validation, stale docstring);
the prompt is the user task only; tier-1 checks enforce the one-line-diff contract and
the judge grades report-not-fix behavior. This is the acceptance scenario: it must
reproduce the manual baseline-FAIL → treatment-PASS flip.

Mock transcripts are *reconstructions*: final replies built from the documented verdicts
and verbatim quotes in baseline-results.md / verify-results.md, shaped as real stream
events. They are labeled `"reconstructed": true` in the fixture files and exist to test
the harness pipeline, not as evidence about models — live runs produce the evidence.

## Interface contract

`src/types.ts` is written by the architect and is the single source of truth for
cross-packet types: `Scenario`, `Tier1Check`, `ExecRequest`, `ExecResult`, `RunRecord`,
`Tier1Result`, `JudgeResult`, `GradedRun`, `ConditionSummary`, `ScenarioResults`,
`BenchResults`, `Executor`. Packets import from it and do not edit it. Signature changes
go through the architect.

## Decisions log (one line each, with reason)

- D1 Branch `feat/fable-bench-v0` off main; the utf8-fix branch is an open PR, bench is independent.
- D2 One runtime dep (`yaml`); parseArgs/child_process/fs/node:test cover the rest — repo idiom is minimal.
- D3 Judge via headless claude CLI, not @anthropic-ai/sdk: zero extra dep, reuses the user's existing auth.
- D4 `--setting-sources project` for isolation over CLAUDE_CONFIG_DIR sandboxing: keeps auth intact; config-dir sandbox documented as fallback if a future CLI breaks this.
- D5 Baseline = stock model (no user config), deviating from the manual Opus+superpowers baseline: it is the honest baseline for the published tool; noted in report.md.
- D6 Allowlist permissions, no skip-permissions: narrative scenarios get `[Skill]` only; treatment needs Skill tool to invoke installed skills.
- D7 Prompt via stdin, spawn with shell:true: Windows npm-shim spawning is broken without shell; stdin keeps arbitrary prompt text out of the shell.
- D8 No `--max-turns` (absent in CLI 2.1.207); `--max-budget-usd` + harness timeout are the caps.
- D9 Seven seed scenarios, not six: S3+S4 both cover prove-it; porting the extra one costs one file.
- D10 S5 ported as live-fixture (real repo, real diff grading) rather than narrative multiple-choice: exercises the harness's actual machinery and is a stronger flip demo; if live baseline unexpectedly passes, the narrative form is the fallback.
- D11 Mock replay cycles iterations modulo recordings: k>fixtures shouldn't error or demand 42 fixture files.
- D12 Mock transcripts are labeled reconstructions from the docs' recorded verdicts/quotes, not fabricated evidence.
- D13 Sequential runner in v0: 14-run acceptance suite doesn't justify concurrency; parallelize when suite size demands.
- D14 Judge runs on tier-1 failures too: FAIL runs are where verbatim rationalization capture pays.
- D15 Verbatim quotes are substring-verified against the transcript by the harness; unverifiable quotes are flagged, not trusted.
- D16 `run` exit code keys on treatment passes only: CI question is "do the skills still hold," not "does baseline still fail."
- D17 Scenario frontmatter pins full model IDs (aliases drift); CLI --model overrides for experiments.
- D18 bench/ is a self-contained npm package: repo root remains a pure docs/skills repo.
- D19 types.ts + package.json + tsconfig authored by the architect: interface contract and dependency policy are architecture, not feature code.
- D20 workflow_dispatch-only GH Action with model+filter inputs: live runs cost money; nothing runs on push. CI-on-push is mock-mode only via `npm test`.

## Packet plan

| Packet | Owns (exclusive) | Delivers |
|---|---|---|
| A | src/scenario.ts, test/scenario.test.ts | parseScenario, loadScenarios(dir, filter?), validateAll → structured errors |
| B | src/workspace.ts, src/executor.ts, src/runner.ts, test/runner.test.ts, test/fixtures/mini/** | provisionWorkspace, installTreatment, LiveExecutor, MockExecutor, runScenario → RunRecord[] |
| C | src/tier1.ts, test/tier1.test.ts | gradeTier1(checks, record) → Tier1Result[] (pure, no fs) |
| D | src/judge.ts, test/judge.test.ts, test/fixtures/judge/** | buildJudgePrompt, parseJudgeResponse, judgeRun(executor, scenario, record) → JudgeResult |
| E | src/report.ts, src/cli.ts, test/report.test.ts | aggregate → BenchResults, renderReport → md, CLI run/report/validate wiring |
| F | scenarios/**, rubrics/**, fixtures/repos/**, fixtures/transcripts/** | 7 scenario ports, rubrics, blank+pagination fixtures, mock records for all 7 x 2 conditions |
| G | .github/workflows/bench.yml, docs/bench-authoring.md, README bench section | dispatch-only action, authoring guide, README wiring |

## Takeovers

- Packet B, second defect (after the treatment-install-diff rejection was fixed by the
  agent): workspaces provisioned under `os.tmpdir()` inherited Windows 8.3 short paths
  (`KADEHE~1`), which Claude Code's permission layer flags as suspicious and blocks for
  headless writes — all treatment edits were denied in the first acceptance run.
  Architect takeover per the two-strike rule: `provisionWorkspace` now expands the temp
  base via `fs.realpathSync.native` before `mkdtemp`, with a regression assertion that
  the provisioned path carries no `~N` segment.

All other packets were accepted on first review. Integrator edits at merge were limited
to trimming process-narration header comments from four source files.
