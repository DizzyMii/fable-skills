# X / Twitter thread

**Attach `assets/demo.png` to the first tweet** (the before/after is the 10-second pitch).
Post the rest as a single thread. Keep the repo link out of tweet 1's first line if you want
max reach (some readers report link-in-first-tweet suppression) — it's in the last tweet and
the hook stands on its own. Tone: builder sharing a result, not an ad.

---

**1/ (hook + image: assets/demo.png)**

I had Anthropic's frontier model (Fable 5) write behavioral-discipline skills for its
smaller sibling (Opus 4.8).

Then I TDD'd them — on the target model itself.

Same model, same prompt. The skill flips the choice 👇

**2/**

The idea: a frontier model's edge is two things — raw capability (reasoning depth) and
behavioral discipline (what it claims, when it stops, how much it touches).

Skills can't transfer capability. But discipline? That's just instructions a smaller model
can follow. So I distilled the contract.

**3/**

The catch with instructions: models rationalize their way out of them.

So every skill ships with a "rationalizations" table — the actual excuse, paired with the
rebuttal. Most of those excuses are *verbatim quotes* from Opus 4.8 talking itself into the
mistake during testing.

**4/**

How I tested: wrote pressure scenarios, ran them on real Opus 4.8 subagents, captured the
failures, wrote rules against them, re-ran to confirm the flip.

Surprise #1: under a strong baseline (Opus already in a disciplined setup), it *passed most
scenarios.* The cracks were narrow.

**5/**

The clearest crack: asked to fix a one-line off-by-one in a file with 4 other rough edges,
it bundled in unrequested validation — while itself calling that validation's design "the
one open question."

Its words: "the same class of defect as the bug I was sent in for."

**6/**

Surprise #2, the one I'll keep: **the example in a skill out-teaches its rules.**

One skill failed twice despite an explicit rule AND a red flag banning the exact behavior —
because its example modeled the wrong pattern. Models imitate the example over the prose.
Fixed the example → passed.

**7/**

Honest scope: what's proven is scenario-level flips with transcripts — not a benchmarked
daily gain. Baseline had other discipline tooling loaded. It transfers judgment, not IQ.

All the transcripts (failures included) are in the repo. MIT, cross-platform install:

github.com/DizzyMii/fable-skills
