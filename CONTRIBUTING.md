# Contributing to fable-skills

This repo has one unusual rule, and it's the whole point: **a rule earns its place by flipping a real failure, not by sounding wise.** Every skill here was written against transcripts of Opus 4.8 actually failing a pressure scenario. New rules follow the same loop. A PR that adds a rule without a failing baseline will be sent back — kindly, but back.

That's TDD, applied to docs. RED before GREEN.

## The loop (TDD-for-docs)

### RED — capture a real failure

1. Write a **pressure scenario**: a single self-contained prompt that tempts the target model toward the bad behavior. Put it in [`docs/superpowers/testing/scenarios.md`](docs/superpowers/testing/scenarios.md), following the existing format (numbered, named for the skill it targets, with the pressures it applies listed in the heading).
2. Run it on the **target model** (Opus 4.8) via a fresh subagent, with the relevant skill **absent** (for a new skill/rule) or **current** (for a regression you're fixing). No tools unless the scenario needs them.
3. Record the verdict and — this is the valuable part — the model's **verbatim rationalization** in [`baseline-results.md`](docs/superpowers/testing/baseline-results.md). The exact words it used to talk itself into the mistake are the raw material for the rule's rationalizations table. Don't paraphrase them; quote them.

If the model already passes without the rule, you don't have a rule — you have a preference. That's fine, but it doesn't ship. Note it and stop.

### GREEN — write the rule against the failure

4. Add or edit the rule, the rationalizations-table row, and (if the dimension benefits) the contrast example. The rationalization row should pair the captured quote with a one-line rebuttal.
5. Re-run the same scenario with the skill **injected**. Record the result in [`verify-results.md`](docs/superpowers/testing/verify-results.md). The bar is: correct choice under pressure, **and** the model citing the skill's own reasoning back as justification, **and** no new rationalization sneaking in.

### REFACTOR — and mind the example

6. If it still fails, fix and re-run. Watch for the repo's hardest-won lesson: **the example out-teaches the rules.** `fable-outcome-first` failed verification twice despite an explicit rule *and* a red flag, because its contrast example modeled the wrong opener — models imitate the example over the prose. When a rule won't take, suspect the example before you add a third rule. Make the example demonstrate the *hard* case; never let it model a pattern the rules restrict.
7. Generalize-check: if your scenario's example shares facts with the example in the skill, the pass might be echo. Re-run on a second fact-set (the repo does this for S1 → S1H) before calling it green.

## Skill format conventions

- **Frontmatter:** `name` (matches the directory) and a trigger-rich `description` written in third person — it states *when* to use the skill, because the description is the only part loaded at session start.
- **Body:** Overview (2–4 sentences) → numbered imperative rules → `| Thought | Reality |` rationalizations table → contrast example where the dimension benefits → Red Flags list.
- **Length:** under ~150 lines. Long skills get skimmed; these must be read whole.
- **Tone:** imperative, concrete, zero filler. Name observable behaviors, not virtues ("first sentence answers the question," not "be clear").
- **Provenance line:** every rationalizations table ends with a one-line note saying whether the rows are verbatim-from-baseline or predicted, and dates it. Don't claim a quote is observed if it isn't.
- **Composability:** no fable skill depends on another. Overlap with superpowers is deliberate reinforcement and must never contradict it.

## PR checklist

Copy this into your PR description:

- [ ] New/changed behavior has a pressure scenario in `scenarios.md`.
- [ ] Baseline failure (or current-skill failure) recorded **verbatim** in `baseline-results.md`.
- [ ] Skill change re-run with the skill injected; flip recorded in `verify-results.md`.
- [ ] Rationalizations table updated; provenance line says observed vs. predicted, honestly.
- [ ] If a rule wouldn't take, the **example** was checked — not just more rules added.
- [ ] SKILL.md still under ~150 lines and reads as a whole.
- [ ] No claim in the skill or docs that the transcripts don't support.

## Good ways in

See the [good-first-issues](https://github.com/DizzyMii/fable-skills/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22). High-value, low-context starting points:

- Port the activation block to another harness (Copilot CLI, Gemini CLI, Codex).
- Contribute a pressure scenario the current six skills *don't* catch — a real failure is a gift.
- Help build the eval harness for measured daily-use gains.

## Ground rules

Be honest in the transcripts — a failure you record faithfully is worth more than a pass you massaged. Keep claims calibrated; this product dies the moment its marketing overclaims relative to its own test record. And keep diffs scoped: fittingly, `fable-scope-discipline` applies to this repo too.
