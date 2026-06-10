# Seeded good-first-issues

Five real, scoped entry points for contributors. These are created automatically by
`launch/publish.sh` (which also creates the `good first issue` / `help wanted` labels).
To file one by hand instead, copy the title and body into a new GitHub issue.

---

## 1. Port the activation block to Copilot CLI

**Labels:** `good first issue`, `help wanted`, `harness-port`

The skills are plain Markdown and work in any harness that loads Claude Code-style skills.
What's harness-specific is the activation block in `claude-md-block.md` — it names the
`Skill` tool and the lifecycle triggers. Copilot CLI uses a `skill` tool and discovers
skills from installed plugins.

**Task:** add `harness/copilot/` with an activation block (or equivalent config) that maps
the six skills to the same lifecycle moments, and a short README note on where it goes.
No skill content changes — just the wiring.

**Done when:** a Copilot CLI user can drop the block in and have the skills fire at task
start / code-write / pre-claim / turn-end.

---

## 2. Port the activation block to Gemini CLI

**Labels:** `good first issue`, `help wanted`, `harness-port`

Gemini CLI activates skills via an `activate_skill` tool and loads skill metadata at session
start through `GEMINI.md`.

**Task:** add `harness/gemini/` with a `GEMINI.md`-compatible activation block mapping the
six skills to their triggers, plus a note on placement.

**Done when:** a Gemini CLI user gets the same automatic invocation the `CLAUDE.md` block
gives Claude Code users.

---

## 3. Build an eval harness for measured daily-use gains

**Labels:** `help wanted`, `eval`

The README is deliberately honest that only **scenario-level flips** are proven, not daily
productivity gains. Closing that gap is the most valuable thing the project could add.

**Task:** a small, reproducible harness that runs a fixed task set on Opus 4.8 with and
without the skills and reports a measurable delta (diff size on scoped bugfixes, reply
length on simple questions, claim-accuracy on unverified work — pick a metric and defend
it). Wire it to `docs/superpowers/testing/` conventions.

**Done when:** `python eval/run.py` (or similar) produces a with/without comparison anyone
can re-run, and the numbers — whatever they are — go in the README honestly.

---

## 4. Contribute a pressure scenario the current skills miss

**Labels:** `good first issue`, `pressure-scenario`

The six skills pass their seven scenarios. They almost certainly don't cover everything.
A reproducible failure is the RED phase of the next rule — and the single most useful
contribution to this repo.

**Task:** follow [CONTRIBUTING.md](../CONTRIBUTING.md). Write a self-contained prompt that
makes Opus 4.8 misbehave on one of the six dimensions, run it, and record the verbatim
failure. A fix is welcome but not required — the failure alone is the gift.

**Done when:** there's a new entry in `scenarios.md` and a recorded baseline result.

---

## 5. Add a macOS/Linux CI smoke-test for install.sh

**Labels:** `good first issue`, `ci`

`install.sh` is verified via POSIX `sh` and against a throwaway `HOME`, but not yet on a
real macOS/Linux runner in CI.

**Task:** a GitHub Actions workflow (`ubuntu-latest` + `macos-latest`) that runs
`./install.sh` and `./install.sh --write-claude-md` against a temp `HOME`, asserts the six
skill folders land in `~/.claude/skills`, and asserts the activation block appears exactly
once after running twice (idempotency).

**Done when:** the workflow is green and a badge can go in the README.
