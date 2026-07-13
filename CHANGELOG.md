# Changelog

## v0.2.0 — 2026-07-13

The eval harness (fable-bench v0): the README roadmap's first checkbox, built and
verified against a live reproduction of the manual scope-discipline flip.

- **`bench/`** — TypeScript CLI (Node 20+, one runtime dep) that automates the
  RED/GREEN loop from `CONTRIBUTING.md`: `fable-bench run | report | validate`.
  Per scenario and condition (baseline | treatment) it provisions an isolated git
  workspace from a fixture, installs the skills + activation block for treatment,
  drives headless Claude Code (`--setting-sources project` so the host machine's
  config never contaminates either condition), and grades two tiers: deterministic
  checks (diff size, file contents, reply regexes) and a judge model whose FAIL
  verdicts must quote the rationalization verbatim — substring-verified against
  the transcript, flagged when not exact.
- **Seed suite** — all seven pressure scenarios from the manual record ported to
  `bench/scenarios/`; S5 (scope-discipline) runs against a real fixture repo and
  is graded on its actual diff.
- **Mock mode** — `--mock` replays reconstructed transcripts; the harness's own
  test suite (90 tests) and `bench-ci.yml` spend zero API money.
- **Live verification** — S5 acceptance run on Opus 4.8, k=3: baseline 2/3
  (bundling failure captured with the model's own justification), treatment 3/3.
  `report.md` and `results.json` are generated per run.
- **CI** — `bench-ci.yml` (mock, on push) and `bench.yml` (live, manual dispatch
  only, model/scenario/k inputs, report uploaded as artifact).
- **Docs** — `bench/SPEC.md` (design + decisions log), `docs/bench-authoring.md`
  (scenario authoring guide), README section.

## v0.1.0 — 2026-06-10

Initial launch: six fable skills, activation block, cross-platform installers,
pressure-test transcripts (RED/GREEN), launch kit.
