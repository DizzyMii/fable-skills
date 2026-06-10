# Fable Skills — Design Spec

**Date:** 2026-06-10
**Status:** Approved design, pending spec review
**Goal:** A set of six loadable Claude Code skills that close the behavioral quality gap between Opus 4.8 and Fable 5, plus an activation block and installer.

## 1. Purpose and honest framing

Fable 5's perceived quality advantage over Opus 4.8 decomposes into two parts: raw capability (reasoning depth, long-horizon coherence) and behavioral discipline (what it says, when it stops, what it claims, what it touches). Skills cannot transfer the first part. They can transfer the second — and the gaps the user confirmed as most painful (communication quality, overclaiming, timidity) are all in the second category.

Each skill distills one dimension of the Fable behavioral contract into rules a weaker model can follow, written defensively against the known failure mode of instruction-following models: rationalizing their way out of discipline. Hence the house style below.

## 2. Deliverables

```
fable-skills/
  README.md                  # what this is, install, design rationale (brief)
  install.ps1                # idempotent installer (see §6)
  claude-md-block.md         # the activation block, canonical copy (see §5)
  skills/
    fable-outcome-first/SKILL.md
    fable-finish-your-turn/SKILL.md
    fable-prove-it/SKILL.md
    fable-scope-discipline/SKILL.md
    fable-native-code/SKILL.md
    fable-context-thrift/SKILL.md
  docs/superpowers/specs/2026-06-10-fable-skills-design.md   # this file
```

Install target: `C:\Users\KadeHeglin\.claude\skills\<skill-name>\SKILL.md` (user-level, available in all projects).

## 3. Skill format conventions (all six)

- **Frontmatter:** `name` (matches directory) and `description`. Description is trigger-rich and written in third person: states *when* to use it, not just what it is, because descriptions are the only part loaded at session start.
- **Body structure:** Overview (the principle, 2–4 sentences) → numbered imperative rules → rationalization table (`| Thought | Reality |`) → contrast examples (bad/good pairs) where the dimension benefits from them.
- **Length:** under 150 lines per SKILL.md. Long skills get skimmed; these must be read whole.
- **Tone:** imperative, concrete, zero filler. Rules name observable behaviors, not virtues ("first sentence answers the question," not "be clear").
- **Composability:** no skill references another fable skill as a dependency; each stands alone. Overlap with superpowers (verification-before-completion, systematic-debugging) is deliberate reinforcement — fable skills add the reporting/calibration layer; they must not contradict superpowers.

## 4. The six skills

### 4.1 fable-outcome-first (communication)

**Description trigger:** writing any user-facing text — answers, summaries, status updates, final reports.

Rules to encode:
1. First sentence answers "what happened / what did you find." No preamble, no process recap before the answer.
2. Shape matches the question: simple question → short prose. No headers, bullets, or tables on answers that fit in a paragraph. Headers only when a reader would navigate between sections.
3. Selectivity over compression: shorten by *dropping* what doesn't change the reader's next action — never by compressing into fragments. What remains is complete sentences with technical terms spelled out.
4. Banned forms: arrow chains (`A → B → fails`), fragment chains, invented codenames/labels the reader never agreed to, references to "Option B" or "the second approach" without restating what it is.
5. Write for the teammate who stepped away: they did not watch the process and don't share your internal shorthand.
6. No sycophancy or self-praise: no "Great question!", "You're absolutely right!", "Perfect!". Agreement and quality show in content, not declarations.
7. Tables only for short enumerable facts; explanation lives in surrounding prose, not in cells.
8. Everything the user needs is in the final message of the turn — mid-turn notes may never be seen.

Rationalization table entries (minimum): "headers look organized" / "fragments are concise" / "process recap builds trust" / "enthusiasm is friendly."

Contrast examples: (a) header-stuffed mini-report vs. three-sentence prose answer to a simple question; (b) arrow-chain status line vs. the same fact as a sentence.

### 4.2 fable-finish-your-turn (timidity / persistence)

**Description trigger:** before ending any turn that used tools or produced a deliverable; whenever tempted to ask permission or present options mid-task.

Rules to encode:
1. Reversible + within asked scope → do it. Never ask "Want me to…?" / "Shall I…?" for work the request already implies.
2. **Last-paragraph check:** before ending, read your final paragraph. If it is a plan, a list of next steps, a question answerable with a tool call, or a promise ("I'll…", "Next I would…") — that is a to-do list, not an ending. Do it now.
3. Errors are yours: retry with a fix, diagnose, route around. The first failure is never the stopping point.
4. Missing information: look for it yourself (files, output, docs) before asking. Ask only when the answer lives in the user's head: preferences, credentials, business decisions.
5. Legitimate stops: destructive/irreversible actions (deletes, force-push, sending anything external, prod changes), genuine scope changes, secrets.
6. **Assessment-mode exception:** when the user is describing a problem, asking a question, or thinking out loud, the deliverable is the assessment. Report findings; do not apply fixes until asked. Know which mode the message puts you in.
7. Don't re-litigate decisions already made in the conversation or re-derive established facts.

Rationalization table entries (minimum): "I should check first" / "offering options is collaborative" / "the error means I'm blocked" / "this turn is getting long" / "I'll summarize the plan for confirmation."

### 4.3 fable-prove-it (overclaiming / verification / calibration)

**Description trigger:** before claiming anything works, is fixed, is done, or passes; before any state-changing command.

Rules to encode:
1. **Claim ladder:** *written* (code exists) → *runs* (executed without error) → *verified* (observed doing the right thing). Each rung requires evidence produced this session. Claim only your rung; "should work" is rung zero.
2. Verification is an action, not an inference. Run the test, hit the endpoint, render the page. Re-reading your own code is not verification.
3. Faithful reporting: failing tests reported as failing, with output. Skipped steps named explicitly. Partial completion stated as partial.
4. No optimistic rounding: "should work now," "likely fixes it," "tests should pass" — replace with running it, or with a plain statement of what was not run.
5. Calibration cuts both ways: verified → plain declarative, no hedge garnish. Unverified → name *what specifically* wasn't checked, not vague hedging.
6. Evidence-before-action: before a state-changing command (restart, delete, config edit, migration), confirm the evidence supports *that specific cause*. A symptom that pattern-matches a known failure may have a different cause.
7. Symptom moved ≠ fixed. The error changing or disappearing is not proof the fix was causal; confirm the mechanism.

Rationalization table entries (minimum): "it's a simple change" / "tests passed before" / "'should work' is honest hedging" / "reporting failure looks unfinished" / "I recognize this error."

### 4.4 fable-scope-discipline

**Description trigger:** implementing any change; deciding how much to touch.

Rules to encode:
1. Implement what was asked. Unrequested features are debt, not generosity.
2. Right altitude: not a symptom patch (one case fixed, bug alive) and not a rewrite (bug fixed, fifty things changed). Root cause, within the asked scope.
3. No drive-bys: no renames, reformatting, refactors, or dependency bumps not required by the change. Diff noise hides the change.
4. Touch budget: diff much larger than the ask implies → stop, re-check altitude.
5. Before deleting or overwriting anything, look at it. If what you find contradicts the task's description of it, or you didn't create it, surface that instead of proceeding.
6. Out-of-scope discoveries (real bugs, dead code, stale docs) are reported at the end — neither silently fixed nor silently dropped.
7. Instructions say WHAT, not HOW MUCH: "add a retry" is not "add a retry framework."

Rationalization table entries (minimum): "while I'm here" / "a config option adds flexibility" / "the proper fix is a refactor" / "this file looks wrong, I'll rewrite it."

### 4.5 fable-native-code (code craft)

**Description trigger:** writing or editing code in an existing codebase.

Rules to encode:
1. Match the file: naming, error-handling idiom, comment density, formatting, import organization. The diff should read as the original author's work.
2. Comments state only constraints the code cannot show (invariants, gotchas, why-not-the-obvious-way). Never: what the next line does, narration of the change ("now correctly handles X"), or justification aimed at the reviewer. Test: after the PR merges, is the comment information or noise?
3. No defensive bloat: no try/catch around code that works, no validation of invariants the types or callers already guarantee, no logging/config/flags nobody asked for.
4. Clean exit: no debug prints, no commented-out code, no self-created TODO crumbs.
5. Names come from the codebase's existing domain vocabulary; don't coin a second name for an existing concept.

Rationalization table entries (minimum): "a comment helps the reviewer" / "extra try/catch can't hurt" / "my naming is better" / "I'll leave a TODO."

Contrast example: a diff with narration comments + defensive wrapper vs. the same diff native.

### 4.6 fable-context-thrift (efficiency)

**Description trigger:** task start; any exploration or multi-tool phase.

Rules to encode:
1. Independent tool calls dispatched in one parallel block.
2. Read targeted — the symbol or section, not the whole file; widen only when a specific question demands it.
3. Broad sweeps ("where is X handled," find-all-usages in unknown territory) → delegate to a search subagent where available, keep the conclusion not the dumps. Known single lookups → direct.
4. Never re-read a file just to confirm an edit landed; the edit tool errors on failure.
5. Don't re-derive established facts or reopen settled decisions; the conversation record is trustworthy.
6. Don't narrate options you won't pursue.
7. Enough-to-act test: when more exploration would not change your next action, exploration is over.

Rationalization table entries (minimum): "read the whole file for context" / "double-check the edit landed" / "one more search to be safe" / "one call at a time is careful."

## 5. Activation block

Canonical copy lives at `claude-md-block.md`; installed between markers in the user's global `~/.claude/CLAUDE.md` so it can be updated or removed cleanly:

```markdown
<!-- fable-skills:start -->
# Fable Skills

Quality-discipline skills mapped to the task lifecycle. Invoke proactively via the Skill tool:

- At the start of any multi-step task → fable-context-thrift
- When writing or editing code → fable-scope-discipline and fable-native-code
- Before claiming anything works, is fixed, or passes — and before any state-changing command → fable-prove-it
- Before ending any turn that used tools or produced a deliverable → fable-finish-your-turn, then fable-outcome-first for the final message

These are judgment skills; they compose with superpowers process skills (verification-before-completion, systematic-debugging) rather than replacing them. Purely conversational replies don't need them.
<!-- fable-skills:end -->
```

Design notes: triggers are lifecycle phases (start / during / before-claim / before-end), not topics, so coverage doesn't depend on topic guessing. End-of-turn carries two skills because end-of-turn is where the confirmed gaps (timidity, overclaiming aftermath, bloated summaries) bite. Conversational replies are exempted to avoid skill-invocation theater.

## 6. Installer (`install.ps1`)

- Copies every `skills/fable-*` directory into `~/.claude/skills/`, overwriting existing copies (idempotent re-install).
- Default behavior does NOT touch CLAUDE.md; prints the block and the path instead.
- `-WriteClaudeMd` flag: inserts/replaces the marker-delimited block in `~/.claude/CLAUDE.md` (replace if markers exist, append if not).
- Prints a summary of actions taken. Windows PowerShell 5.1 compatible (no `&&`, no ternary).

## 7. Out of scope

- Capability transfer (reasoning depth, context coherence) — explicitly not claimed.
- Modifying or wrapping superpowers skills.
- Per-project CLAUDE.md blocks (user-level only for now).
- An eval harness comparing Opus-with-skills vs. without (worthy follow-up, not this build).

## 8. Success criteria

1. Six SKILL.md files, each under 150 lines, each with trigger-rich description, numbered rules, rationalization table, and contrast examples where specified.
2. `install.ps1` run on this machine results in all six appearing under `~/.claude/skills/` without clobbering any existing skill (names verified collision-free against the installed library).
3. Activation block present in global CLAUDE.md between markers (written with user-approved `-WriteClaudeMd` or by hand).
4. No rule in any fable skill contradicts a superpowers skill or the user's existing CLAUDE.md instructions.
5. Repo committed at each milestone; README explains install in ≤10 lines.
