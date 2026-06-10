#!/usr/bin/env bash
# One-shot GitHub publish for fable-skills.
#
# PREREQUISITE: a working gh login. The stored token was expired at build time, so run:
#     gh auth login          # choose GitHub.com > HTTPS > authenticate in browser
# then verify:
#     gh api user --jq .login   # should print your username, not a 401
#
# Then run this from the repo root:  bash launch/publish.sh
#
# Idempotent-ish: safe to re-run. It skips repo creation if origin already exists,
# skips labels/issues that already exist, and updates metadata in place.
set -euo pipefail

OWNER="DizzyMii"
REPO="fable-skills"
SLUG="$OWNER/$REPO"
DESC="Six Claude Code skills that harden Opus 4.8 toward frontier behavior — written by Fable 5, pressure-tested on the target model with transcripts included."
HOMEPAGE="https://github.com/$SLUG"

cd "$(git rev-parse --show-toplevel)"

echo "==> Verifying gh auth"
gh api user --jq .login >/dev/null || {
  echo "ERROR: gh is not authenticated (token returns 401). Run: gh auth login" >&2
  exit 1
}

echo "==> Normalizing default branch to main"
git branch -M main

if git remote get-url origin >/dev/null 2>&1; then
  echo "==> origin already set; pushing main"
  git push -u origin main
else
  echo "==> Creating $SLUG and pushing all history"
  gh repo create "$SLUG" --public --source=. --remote=origin \
    --description "$DESC" --homepage "$HOMEPAGE" --push
fi

echo "==> Setting description, homepage, and topics"
gh repo edit "$SLUG" --description "$DESC" --homepage "$HOMEPAGE"
gh repo edit "$SLUG" \
  --add-topic claude --add-topic claude-code --add-topic claude-skills \
  --add-topic agent-skills --add-topic anthropic --add-topic ai-agents \
  --add-topic llm --add-topic llms --add-topic prompt-engineering \
  --add-topic prompts --add-topic developer-tools --add-topic coding-assistant \
  --add-topic ai-coding --add-topic ai-tools --add-topic opus \
  --add-topic llmops --add-topic productivity --add-topic tdd \
  --add-topic automation --add-topic open-source

echo "==> Ensuring labels exist"
ensure_label() { gh label create "$1" --color "$2" --description "$3" 2>/dev/null || true; }
ensure_label "good first issue" "7057ff" "Good entry point for new contributors"
ensure_label "help wanted"      "008672" "Extra attention is welcome"
ensure_label "harness-port"     "1d76db" "Port the activation block to another harness"
ensure_label "pressure-scenario" "d93f0b" "A scenario the skills should be tested against"
ensure_label "eval"             "fbca04" "Measurement and benchmarking work"
ensure_label "ci"               "0e8a16" "Continuous integration"

issue_exists() { gh issue list --state all --search "$1 in:title" --json title --jq '.[].title' | grep -Fxq "$1"; }
mk_issue() {
  local title="$1"; shift
  local body="$1"; shift
  if issue_exists "$title"; then echo "   - skip (exists): $title"; return; fi
  local label_args=()
  local l
  for l in "$@"; do label_args+=(--label "$l"); done
  gh issue create --title "$title" --body "$body" "${label_args[@]}" >/dev/null
  echo "   - created: $title"
}

echo "==> Filing seeded good-first-issues"
mk_issue "Port the activation block to Copilot CLI" \
"The skills are plain Markdown; only the activation block in claude-md-block.md is harness-specific. Copilot CLI uses a \`skill\` tool and plugin discovery.

Task: add harness/copilot/ with an activation block (or equivalent) mapping the six skills to the same lifecycle triggers (task start / code-write / pre-claim / turn-end), plus a placement note. No skill content changes.

Done when: a Copilot CLI user can drop it in and have the skills fire automatically. See CONTRIBUTING.md." \
"good first issue" "help wanted" "harness-port"

mk_issue "Port the activation block to Gemini CLI" \
"Gemini CLI activates skills via an \`activate_skill\` tool and loads metadata at session start via GEMINI.md.

Task: add harness/gemini/ with a GEMINI.md-compatible activation block mapping the six skills to their triggers, plus a placement note.

Done when: a Gemini CLI user gets the same automatic invocation the CLAUDE.md block gives Claude Code users." \
"good first issue" "help wanted" "harness-port"

mk_issue "Build an eval harness for measured daily-use gains" \
"The README is deliberately honest that only scenario-level flips are proven, not daily productivity gains. Closing that gap is the highest-value addition.

Task: a reproducible harness that runs a fixed task set on Opus 4.8 with and without the skills and reports a measurable delta (diff size on scoped bugfixes, reply length on simple questions, claim-accuracy on unverified work — pick a metric and defend it). Follow docs/superpowers/testing/ conventions.

Done when: a single command produces a re-runnable with/without comparison, and the numbers go in the README honestly." \
"help wanted" "eval"

mk_issue "Contribute a pressure scenario the current skills miss" \
"The six skills pass their seven scenarios; they don't cover everything. A reproducible failure is the RED phase of the next rule and the most useful contribution here.

Task: follow CONTRIBUTING.md. Write a self-contained prompt that makes Opus 4.8 misbehave on one of the six dimensions, run it, and record the verbatim failure. A fix is welcome but not required.

Done when: there's a new entry in scenarios.md and a recorded baseline result." \
"good first issue" "pressure-scenario"

mk_issue "Add a macOS/Linux CI smoke-test for install.sh" \
"install.sh is verified via POSIX sh against a throwaway HOME, but not yet on a real macOS/Linux runner.

Task: a GitHub Actions workflow (ubuntu-latest + macos-latest) that runs ./install.sh and ./install.sh --write-claude-md against a temp HOME, asserts the six skill folders land in ~/.claude/skills, and asserts the activation block appears exactly once after running twice (idempotency).

Done when: the workflow is green and a badge can go in the README." \
"good first issue" "ci"

echo "==> Creating v0.1.0 release"
if gh release view v0.1.0 >/dev/null 2>&1; then
  echo "   - release v0.1.0 already exists; skipping"
else
  gh release create v0.1.0 --title "v0.1.0 — first public release" --notes "$(cat <<'NOTES'
First public release of **fable-skills** — six Claude Code skills that harden Opus 4.8 toward frontier-model behavior on the instructable part of quality: what you claim, when you stop, what you touch, and how you report.

### Skills
- **fable-outcome-first** — answer first; shape matches the question
- **fable-finish-your-turn** — finish reversible, in-scope work instead of asking permission
- **fable-prove-it** — claim only the rung you reached (written / runs / verified)
- **fable-scope-discipline** — build exactly what was asked; surface the rest
- **fable-native-code** — match the file's idiom; no defensive bloat or narrated restraint
- **fable-context-thrift** — spend context only on what changes the next action

### How they were built
Distilled from Fable 5's behavioral contract, then TDD'd on the target model: pressure scenarios run on real Opus 4.8 subagents, failures captured verbatim, rules written against them, re-tested until they flipped. Full transcripts in `docs/superpowers/testing/`.

### Honest scope
Proven: scenario-level behavior flips with transcripts. Not yet proven: a benchmarked daily-productivity gain (eval harness is on the roadmap). The baseline was Opus already running in a superpowers-loaded environment — these harden edges, they don't fix a broken model. Skills transfer judgment and discipline, not raw capability.

### Install
Cross-platform: `./install.sh` (macOS/Linux), `.\install.ps1` (Windows), or copy the six `skills/fable-*` folders into `~/.claude/skills/`. MIT licensed.
NOTES
)"
  echo "   - release v0.1.0 created"
fi

cat <<EOF

==> DONE (almost). One manual step remains — the social preview image:
    GitHub does not expose social-preview upload via API/CLI. Upload it by hand:
    Repo > Settings > General > Social preview > Edit > upload assets/social-preview.png

Repo:     https://github.com/$SLUG
Issues:   https://github.com/$SLUG/issues
Release:  https://github.com/$SLUG/releases/tag/v0.1.0
EOF
