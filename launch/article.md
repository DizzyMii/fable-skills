# dev.to article

**Suggested tags:** `ai`, `claude`, `llm`, `opensource`
**Canonical:** set canonical URL to the dev.to post, or cross-post from your own blog.
**Cover image:** `assets/social-preview.png`.

Target length ~1,000 words. Repo link is in paragraph one, as requested. Every claim below
is reproducible from the repo's `docs/superpowers/testing/` transcripts.

---

## I had the frontier model write skills for the smaller one — then TDD'd them on the target model

I spend most of my coding day with an AI agent, and the friction is rarely that it isn't
smart enough. It's that it overclaims ("fixed!" — it didn't run anything), it sprawls the
diff past what I asked, it asks permission for work I already requested, and it buries a
one-line answer under a wall of process. So I tried something specific: get Anthropic's
frontier model, Fable 5, to write down the behavioral discipline that the smaller Opus 4.8
lacks — and then test whether those written rules actually change Opus's behavior. The
result is [fable-skills](https://github.com/DizzyMii/fable-skills): six Claude Code skills,
MIT-licensed, with the full test record in the repo.

### The thesis: discipline is transferable, capability isn't

A frontier model's advantage decomposes into two parts. One is raw capability — reasoning
depth, long-horizon coherence. No amount of instruction transfers that to a smaller model;
if Opus can't follow the reasoning, a skill won't make it. The other part is *behavioral
discipline*: what the model claims, when it decides it's done, how much of the codebase it
touches, how it reports back. That part is just judgment encoded as instructions — and
instructions are exactly the thing you *can* hand to a smaller model.

So the six skills each take one dimension of that contract:

- **outcome-first** — the first sentence answers the question; no preamble, no headers on a
  paragraph-sized answer.
- **finish-your-turn** — finish reversible, in-scope work instead of stopping to ask
  permission.
- **prove-it** — claim only the rung you reached: *written*, *runs*, or *verified*. "Should
  work" is rung zero.
- **scope-discipline** — build exactly what was asked; surface the other findings instead of
  bundling them into the diff.
- **native-code** — match the file's existing idiom; no defensive bloat, no narrated
  restraint.
- **context-thrift** — spend context only on what changes your next action.

### The problem with rules: models argue with them

Anyone who has written a system prompt knows the failure mode — the model finds a reading of
the rule that lets it do the thing anyway. So I wrote each skill *defensively*. Every one
carries a "rationalizations" table: a likely excuse in the left column, the rebuttal in the
right. And rather than invent the excuses, I went and got the real ones.

### TDD, for documentation

The loop is test-driven development applied to docs:

1. **RED** — write a pressure scenario (a prompt engineered to tempt the bad behavior), run
   it on a real Opus 4.8 subagent, and record the failure *verbatim*.
2. **GREEN** — write the rule and the rationalization row against that exact failure, then
   re-run with the skill loaded and confirm the behavior flips.
3. **REFACTOR** — if it still fails, fix and re-run.

The scenarios are deliberately nasty: fix a one-line off-by-one in a file full of tempting
unrelated cleanups; answer a yes/no question after a 40-minute investigation; a tech lead
says "I'm putting #883 on the slide as FIXED, just confirm" sixty seconds before a customer
demo, when you haven't been able to run the code.

### What actually happened (including the unflattering parts)

The product's whole pitch is calibrated claims, so the test record had to be honest.

**The baseline was already strong.** Crucially, the Opus 4.8 baseline ran inside a
disciplined setup (a superpowers-loaded `CLAUDE.md`), not stock Opus. That's the right
baseline for measuring *marginal* value in a serious environment — and under it, Opus
**passed most of the scenarios already.** I could have hidden that. I didn't, because it's
the interesting result: the gaps are narrower than the "small model is sloppy" story
suggests.

**The cracks that were real.** The clearest was scope. Asked to fix a one-line off-by-one,
the model bundled in unrequested input validation — and the tell was that it *argued* for
it: *"the same class of defect as the bug I was sent in for… a legitimate part of 'fix
paginate()', not scope creep."* It even flagged the new validation's design ("raise or
clamp?") as "the one open question" — i.e., it was making an unreviewed design decision
inside someone else's bugfix. With `scope-discipline` loaded, the same prompt produces a
one-line diff and the other four findings get *reported* for me to triage. It also liked to
narrate its restraint ("note: I deliberately left out the doc comment…") right after being
told to output only code, and to inflate a one-sentence answer with headers when it had the
room.

**The finding I didn't expect.** One skill failed verification *twice in a row* — despite an
explicit rule forbidding the behavior and a red flag naming it. The cause wasn't the rules.
It was the **example**. The skill's contrast example happened to model the wrong opener, and
the model imitated the example over the prose. I rewrote the example to demonstrate the hard
case, and it passed on the next run. The lesson — **in a skill, the example out-teaches the
rules** — is now baked into the contributing guide, where every new rule has to come with a
failing baseline first.

### What I'm claiming, and what I'm not

What's proven: scenario-level behavior flips on specific pressure prompts, on the target
model, with transcripts you can read. What's *not* proven: a benchmarked daily-productivity
gain. That's the honest line, and an eval harness to measure daily-use deltas is the next
experiment, not a done deal. These skills also compose with — they don't replace — process
libraries like superpowers; they add the calibration and reporting layer on top.

If you write skills or system prompts, I think the example-beats-rules effect is the most
portable takeaway here. And if you can make Opus fail a scenario the current six skills
don't catch, that's the most useful thing you could send me — a reproducible failure is the
RED phase of the next rule.

Repo, transcripts, and install: **https://github.com/DizzyMii/fable-skills**
