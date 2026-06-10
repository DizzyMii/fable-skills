# r/PromptEngineering

**Flair:** "Tutorial"/"Technique"/"Tools" if available. This sub wants the *method*, so the
post leads with the technique and treats the repo as the evidence, not the pitch.
**Disclosure:** built by me — stated in the body.

---

**Title:** TDD for prompts: I wrote skills against verbatim model failures, and learned the example beats the rules

**Body:**

I've been writing behavioral skills for a coding agent and ended up with a method that's
basically test-driven development applied to documentation. Sharing the technique because the
two findings generalize well beyond my project.

The loop:

1. **RED** — write a pressure scenario: a self-contained prompt engineered to tempt one
   specific bad behavior (scope creep, overclaiming, burying the answer). Run it on the
   *actual target model*, not a bigger one. Record the output verbatim.
2. **GREEN** — write the rule against that exact failure. Critically, capture the model's own
   rationalization and put it in a "rationalizations" table — left column the excuse, right
   column the rebuttal. The model's real words are better than any you'd invent.
3. **REFACTOR** — re-run with the rule loaded; confirm the behavior flips and the model cites
   the rule's reasoning back.

Two things I learned that I think transfer:

**1. Capture the rationalization verbatim.** When I asked the model to fix a one-line bug and
it expanded scope, it didn't just do it — it argued: "the same class of defect as the bug I
was sent in for… a legitimate part of 'fix paginate()', not scope creep." Putting *that exact
sentence* in the table, with the rebuttal, is far stronger than a generic "don't add
unrequested changes." You're pre-empting the specific reasoning the model will use on itself.

**2. The example out-teaches the rules.** This is the big one. One skill failed verification
twice despite (a) an explicit rule forbidding the behavior and (b) a red flag naming it. The
cause was the skill's contrast *example* — it modeled the wrong pattern, and the model
imitated the example over the prose. I rewrote the example to demonstrate the hard case and
it passed immediately. If a rule won't take, suspect your example before you add a third rule.

Full write-up, the six skills, and every transcript (failures included) are here — MIT:
https://github.com/DizzyMii/fable-skills

Has anyone else measured the example-vs-instruction weighting deliberately? I only have it as
a strong anecdote across a few iterations, and I'd like to know how robust it is.
