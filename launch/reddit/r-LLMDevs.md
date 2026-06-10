# r/LLMDevs

**Flair:** "Tools"/"Resource"/"Discussion" as the sub requires. Builder audience — lead with
the eval method and be upfront about what's *not* proven; this crowd checks.
**Disclosure:** built by me — stated in the body.

---

**Title:** Testing behavioral skills on the target model with TDD-for-docs — method, results, and the limits I can't yet claim past

**Body:**

I built six Claude Code skills to close the *behavioral* gap between Opus 4.8 and a frontier
model (Fable 5) — not the capability gap (reasoning depth doesn't transfer via instructions),
just the instructable part: claim accuracy, scope, reporting, code idiom, context use.

The part worth discussing here is the eval method and its honest limits.

**Method.** For each skill: write a pressure scenario, run it on a real Opus 4.8 subagent,
record the failure verbatim, write the rule against it, re-run with the skill injected,
confirm the flip. RED → GREEN → REFACTOR, on the target model. Pass bar = correct choice
under pressure + the model citing the rule's reasoning back + no new rationalization.

**Results, including the inconvenient ones.**
- Baseline was Opus 4.8 *with a disciplined CLAUDE.md already loaded* (superpowers), so it's a
  marginal-value measurement, not stock-vs-skilled. Under it, Opus passed most scenarios.
- Confirmed failures it flipped: scope creep (bundled unrequested validation into a one-line
  fix, and argued it was in scope), narrated restraint (explained what it "deliberately left
  out" right after "output only code"), and reply bloat under no time pressure.
- Methodological finding: the example in a skill weighs more than the rules. A skill failed
  twice with an explicit rule + red flag against the behavior; the fix was rewriting the
  *example*, not the rules.

**What I can't claim.** This is scenario-level evidence with transcripts — not a benchmarked
daily-productivity delta. An eval harness that measures with/without on a fixed task set
(diff size on scoped fixes, reply length on simple Qs, claim-accuracy on unverified work) is
the obvious next step and isn't built yet. That's literally a help-wanted issue.

Everything (skills, scenarios, baseline + verify transcripts) is in the repo, MIT:
https://github.com/DizzyMii/fable-skills

Two asks: (1) pressure scenarios that make Opus fail in ways the current six don't catch —
a reproducible failure is the RED phase of the next rule; (2) opinions on the right metric for
the daily-use eval harness.
