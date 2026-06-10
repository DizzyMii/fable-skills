# r/ClaudeAI

**Flair:** use a "Resource"/"Built with Claude"/"Showcase" flair if available; this sub
moderates low-effort promo, so the post must read as a genuine write-up.
**Disclosure:** built by me — stated in the body.

---

**Title:** I distilled Fable 5's behavioral contract into skills for Opus 4.8 — and the testing surprised me

**Body:**

Short version: I had Anthropic's frontier model write down the *discipline* that the smaller
Opus 4.8 lacks, turned it into six Claude Code skills, and then tested whether the written
rules actually change Opus's behavior. I'm sharing it (MIT) but mostly want to talk about
what the testing showed, because it wasn't what I expected.

The framing that made it work: a frontier model is better for two different reasons. One is
raw capability — reasoning depth — which a skill can't transfer. The other is behavioral
discipline: it overclaims less, sprawls the diff less, asks for permission less, buries the
answer less. That part is *instructable*, so I focused only on it.

To avoid wishful-thinking rules, I tested them like code:

1. Write a pressure scenario designed to tempt the bad behavior.
2. Run it on a real Opus 4.8 subagent. Record the failure word-for-word.
3. Write the rule against that exact failure; re-run; confirm it flips.

What surprised me:

- **Opus passed most scenarios already** — because my baseline was Opus already running with
  a disciplined config, not stock. The honest takeaway is "this hardens edges," not "fixes a
  sloppy model."
- The real cracks were narrow and human-looking. It bundled unrequested work into a bugfix
  and *argued* it was in scope. It narrated its own restraint after being told to output only
  code. It inflated a one-sentence answer with headers when it had room.
- The most useful finding was about writing skills at all: **the example out-teaches the
  rules.** One skill failed twice despite an explicit rule and a red flag banning the exact
  behavior — because its example modeled the wrong pattern. Fixing the example fixed it.

The transcripts — including every failure — are in the repo, because the whole pitch is
calibrated claims and I'd rather you check them than trust me. It composes with superpowers
rather than replacing it.

Repo: https://github.com/DizzyMii/fable-skills

Curious whether the "example beats rules" effect matches what others here have seen building
prompts/skills.
