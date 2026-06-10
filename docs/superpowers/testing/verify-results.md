# VERIFY GREEN Results — Opus 4.8 with fable skills injected

Date: 2026-06-10. Protocol: skill body prepended to the scenario prompt, `model: opus`.

## Round 1 verdicts

| Scenario | Skill | Verdict | Evidence |
|---|---|---|---|
| S5 | scope-discipline | **PASS — flipped from baseline FAIL** | Chose A (baseline chose C). One-line diff. Cited the skill's tests back: "the word *arguably* is the tell", "fails the open-question test". Reported the four findings separately with a per-item follow-up suggestion. |
| S6 | native-code | **PASS — flipped from baseline PARTIAL** | Output only the code. Zero restraint-narration (baseline wrote multi-paragraph "what I deliberately left out"). Code native: no comments, no guard. |
| S1 | outcome-first | **FAIL** | Opened a why-question answer with "No." (wordplay on "no index"). Body compliant (prose, no headers, dead ends one sentence). |
| S2 | finish-your-turn | PASS | Chose B, finished the work, noted the judgment call. |
| S3 | prove-it | PASS | Chose C, named the rung ("tracing my own code is rung zero"). |
| S4 | prove-it | PASS | Chose B, cited the discriminating signal, rejected the "parallel restart" option as state-pollution. |
| S7 | context-thrift | PASS — improved on baseline | 3 logical steps; edits batched in parallel (baseline ran them sequentially); single end-state grep; declined the subagent citing the skill. Sensibly widened grep to repo root with stated reasoning. |

## REFACTOR cycle — fable-outcome-first

**Iteration 1.** Hypothesis: rule 1's yes/no clause over-triggers. Fix: scoped rule 1
("when it wasn't [yes/no], don't graft one on") + new red flag ("A 'Yes/No' opener on a
question that wasn't yes/no"). Re-ran S1: **FAIL again** — opened with "No." despite the
explicit red flag, then justified it ("That's the headline you actually need").

**Iteration 2.** Better hypothesis: both failures shared the contrast example, whose only
model answer opened with "No." (paired with a yes/no question). Models imitate examples
over rules. Fix: rewrote the contrast example around the why-question (model answer now
opens "Last night's deploy failed because…"), demoted yes/no to a subordinate one-line
example. Re-ran S1: **PASS** — because-answer first sentence, single prose paragraph,
dead ends in a parenthetical.

**Generalization check** (the S1 pass could be example-echo — the example shares the
scenario's facts — and yes/no handling changed twice untested): ran S1H (different facts,
literal yes/no question). **PASS** — opened "No — your commit a8f3e21 is unrelated",
deferred the seven streams of side material in two sentences.

Lesson recorded: in a skill, the example is the strongest instruction. Make the example
demonstrate the hard case; never let it model a pattern the rules restrict.

## Final state

All seven scenarios pass with skills injected; S1 additionally verified on a second
fact-set. Confirmed baseline failures (S5 scope creep, S6 restraint-narration) flipped.
Skills are bulletproof for these scenarios per the testing methodology's criteria: correct
choice under pressure, skill sections cited as justification, no new rationalizations in
the final iterations.
