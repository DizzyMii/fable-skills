# Writing a bench scenario

`fable-bench` is the automated version of the RED/GREEN loop in
[`CONTRIBUTING.md`](../CONTRIBUTING.md): baseline vs. treatment, graded
deterministically where possible, judged where it can't be. This is the
field-level reference for authoring a scenario. For harness architecture,
CLI surface, and design decisions, see [`bench/SPEC.md`](../bench/SPEC.md) —
this doc mirrors its schema; SPEC wins if the two ever disagree.

## Scenario schema

One markdown file per scenario, under `bench/scenarios/`. YAML frontmatter
carries everything the harness reads; the body is human-readable intent only
(not machine-read) except for `prompt`, which is sent verbatim.

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

Field notes:

- `id` — must match the filename (`<id>.md`); `validate` checks this.
- `fixture` — narrative scenarios use `blank`; live-fixture scenarios point at
  a real repo dir under `fixtures/repos/`.
- `model` / `judge_model` — pin full model IDs, not aliases (aliases drift);
  `--model` overrides `model` for one-off experiments.
- `allowed_tools` — narrative scenarios allow only `[Skill]`; live-fixture
  scenarios add file tools (`Read`, `Glob`, `Grep`, `Edit`, `Write`) but never
  `Bash` — no arbitrary-exec surface even though the workspace is disposable.
- `tier1` — empty list is valid and vacuously true (judge alone decides);
  order doesn't matter, all listed checks must pass.
- `rubric` — omit for tier1-only grading; when present the judge runs on
  every graded run, pass or fail (rationalization capture matters most on
  FAIL).

## Conditions

Every scenario can run under three conditions: **baseline** (stock model,
nothing installed), **treatment** (the pack installed into the workspace's
`.claude/skills/` + `CLAUDE.md` — the product's real install shape), and
**inline** (the skill body prepended directly to the prompt, nothing
installed — the manual GREEN protocol from `CONTRIBUTING.md`). `--skills-dir`
and `--claude-md` point `treatment`/`inline` at any external pack's skills
directory and CLAUDE.md block, not just this repo's own `skills/`.

## Tier-1 check types

Deterministic, pure, no fs access at grade time (the record already carries
everything they need). Nine types, from the `Tier1Check` discriminated union
in `src/types.ts`:

| Type | Semantics |
|---|---|
| `max_files_changed { value }` | Fails if more than `value` files appear in the diff's numstat. |
| `max_lines_changed { value }` | Fails if insertions + deletions across the diff exceed `value`. |
| `file_exists { path }` | Fails unless `path` exists in the post-run workspace snapshot. |
| `file_absent { path }` | Fails if `path` exists in the post-run workspace snapshot. |
| `file_contains { path, pattern }` | Fails unless `path`'s contents match the JS regex `pattern`. |
| `reply_matches { pattern, flags? }` | Fails unless the model's final reply text matches `pattern`. |
| `reply_not_matches { pattern, flags? }` | Fails if the final reply text matches `pattern`. |
| `diff_empty {}` | Fails if the workspace diff is non-empty (use for narrative scenarios where no file should change). |
| `exit_ok {}` | Fails if the executor's exit code was non-zero. |

`pattern` values are JS regex source strings (no delimiters), matched with
`new RegExp(pattern, flags)`.

## Rubric conventions

Rubrics live under `bench/rubrics/`, one file per scenario (named `<id>.md`),
referenced by the scenario's `rubric:` field. Write a rubric as instructions to the judge
model, not as prose about the skill. Cover, explicitly:

- **PASS criteria** — the observable behavior that satisfies the scenario's
  pressure (cite the specific choice, not a vibe: "reports the other four
  findings instead of fixing them," not "shows restraint").
- **FAIL criteria** — the specific bad pattern the scenario tempts, named
  concretely enough that a FAIL verdict can point at the exact sentence or
  diff line that triggered it.
- **The verbatim-quote instruction** — every rubric must tell the judge that
  on FAIL it copies the model's rationalization *verbatim* into
  `rationalization_quote`, never paraphrased — capturing the excuse in the
  model's own words is the whole point, the same way `baseline-results.md`
  does today. The harness substring-checks the quote afterward and flags it
  if unverifiable; an unfaithful quote is worse than an empty one.

## Fixture repo conventions

Fixture repos live under `bench/fixtures/repos/<name>/` as plain directories
— no `.git` checked in. `blank` is the empty/narrative fixture; live-fixture
scenarios (like S5's `pagination`) get their own directory containing exactly
the files the prompt refers to, in the state the pressure scenario requires
(e.g. `pagination/utils/pages.py` with the specific bugs fixed or not-fixed).

Git history is **not** part of the fixture — the runner creates it at
provision time (`fs.cpSync` into a temp workspace, then `git init` / `add` /
commit), so every run starts from a clean, diffable HEAD. Don't commit a
`.git/` under `fixtures/repos/`; delete one before committing if you used it
for local testing.

## Mock transcripts

Mock mode (`--mock`) replays recorded runs instead of spawning `claude`, so
the harness's own test suite and CI (`bench-ci.yml`) never spend API money.

**Primary path: record from a real run.** Adding mock coverage for a
scenario should start from a live capture, not hand-authoring:

1. Run live, scoped to just the scenario you're recording, one iteration per
   condition: `node dist/src/cli.js run --scenarios <scenarioId> --k 1`.
2. Feed the printed output dir to the recorder: `node scripts/record-fixtures.mjs
   <resultsDir> --force`. It reads that dir's `results.json` and
   `transcripts/`, and writes `bench/fixtures/transcripts/<scenarioId>/<condition>-<i>.json`
   per graded run (plus `<condition>-<i>-judge.json` when the scenario has a
   `rubric`) — real captures, not reconstructions, so no `"reconstructed"`
   flag. Without `--force` it refuses to overwrite any existing fixture file
   and writes nothing.

**Fallback: hand-authoring.** Reserve this for reconstructions — transcripts
built from documented verdicts/quotes that predate a real run (e.g.
`baseline-results.md`, `verify-results.md`) — not for new scenarios you can
record live:

1. Create `bench/fixtures/transcripts/<scenarioId>/`, then add one file per
   condition per recorded iteration: `<condition>-<i>.json` (e.g.
   `baseline-0.json`, `treatment-1.json`), `<i>` zero-based.
2. Each file is a serialized `ExecResult` (see `src/types.ts`), plus the
   fields a live run computes from the workspace afterward: `diff`,
   `diffStat`, and `workspaceFiles` (contents of files referenced by the
   scenario's `file_*` tier-1 checks).
3. If the scenario has a `rubric`, also add `<condition>-<i>-judge.json` — the
   judge's parsed shape (`verdict`, `reasoning`, `rationalization_quote`).
4. Set `"reconstructed": true` on transcripts built from documented
   verdicts/quotes (e.g. `baseline-results.md`, `verify-results.md`) rather
   than a real run — an honesty flag, since these exercise the pipeline and
   aren't evidence about model behavior. Unflag only once it's a real
   captured run, and keep any `rationalization_quote` an actual substring of
   the paired transcript text — quote-verification runs in mock mode too, and
   an unmatched quote flags `quoteVerified: false` same as it would live.

Requesting more iterations than you've recorded is fine: the runner maps
iteration `i` onto recording `i % recordedCount`, cycling deterministically
instead of erroring.

## Local commands

Run these from `bench/`:

```bash
npm install                       # once
npm test                          # tsc + node --test — the full mock-mode suite

node dist/src/cli.js run --mock   # replay every scenario x condition in mock mode
node dist/src/cli.js validate     # schema + referenced-path checks only, no execution

# One live run, scoped and cheap: scenario s5, 3 iterations per condition.
node dist/src/cli.js run --scenarios s5 --k 3

# Inline condition against an external pack: --condition all runs
# baseline+treatment+inline (both = baseline+treatment only); --skills-dir
# and --claude-md point treatment/inline at that pack instead of this repo's.
node dist/src/cli.js run --scenarios s5 --condition all \
  --skills-dir ../other-pack/skills --claude-md ../other-pack/claude-md-block.md
```

`validate` is the fast authoring check: frontmatter parses, `fixture` and
`rubric` paths exist, `id` matches the filename — no spawning. It also
accepts `--scenarios-dir` (default `bench/scenarios`), so an external pack's
scenario set can be validated in place.

Flag reference for `run`: `--condition baseline|treatment|inline|both|all`,
`--skills-dir <dir>` (default `<repoRoot>/skills`), `--claude-md <file>`
(default `<repoRoot>/claude-md-block.md`), `--scenarios-dir <dir>` (default
`bench/scenarios`). Relative paths for all three resolve against `bench/`,
not the shell's cwd.

## CI story

Two workflows, two different budgets:

- **`bench-ci.yml`** runs on every push and PR touching `bench/**`: `npm
  test` in mock mode, zero API calls, safe unattended on every commit.
- **`bench.yml`** is `workflow_dispatch` only — a human triggers it with a
  model, an optional scenario filter, `k`, and a condition (`both` /
  `baseline` / `treatment`), spending real budget against
  `ANTHROPIC_API_KEY`. Nothing about it runs on push; live runs cost money.

If you're adding a scenario, get it green under `--mock` locally first, then
dispatch `bench.yml` scoped to just that scenario (`scenarios:
s8-my-new-check`) to confirm the live flip before opening a PR.
