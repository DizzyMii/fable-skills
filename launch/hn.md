# Hacker News — Show HN

**Post as:** a Show HN. Tue–Thu, ~8:00–9:30am ET is the usual sweet spot for US morning.
Submit the GitHub URL (`https://github.com/DizzyMii/fable-skills`) as the link, then post
the first comment below immediately so it's there when the first readers arrive.

HN hates marketing voice. Everything here is plain, technical, and matches the repo. The
honest caveats are an asset on HN — lead into them, don't hide them.

---

## Title options (pick one)

HN titles can't be edited after posting and "Show HN:" is required for a thing you made.
Keep it factual; no hype words.

1. **Show HN: I had Anthropic's frontier model write discipline skills for the smaller one**
2. **Show HN: Fable-skills – Claude Code skills, TDD'd on the model they're meant to fix**
3. **Show HN: Six Claude Code skills, pressure-tested on the target model with transcripts**

(#1 is the strongest hook and is literally true. #2 leads with the method. #3 leads with the
evidence. Avoid promising productivity gains in the title — the repo doesn't, and HN will
check.)

---

## First comment (post immediately after submitting)

Author here. These are six Claude Code "skills" — small Markdown rule-sets that load on a
trigger — aimed at the *behavioral* gap between Opus 4.8 and Anthropic's frontier model,
Fable 5. Not the capability gap (reasoning depth, long-horizon coherence — skills can't
move that). The instructable part: what the agent claims, when it stops, how much of the
diff it touches, and how it reports back. That's where most of my day-to-day friction with
a coding agent actually lives.

Two things about how they were built that might be interesting here:

**1. The frontier model wrote them.** I had Fable 5 distill its own behavioral contract
into rules a smaller model could follow — then wrote each skill defensively against the one
thing instruction-following models reliably do: rationalize their way out of discipline. So
every skill carries a "rationalizations" table — the actual excuse paired with a rebuttal.

**2. They were TDD'd on the target model.** I wrote pressure scenarios (a bugfix in a file
full of tempting unrelated cleanups; a yes/no question after a 40-minute investigation; a
tech lead saying "just confirm it's fixed" one minute before a demo), ran them on real Opus
4.8 subagents, captured the failures verbatim, wrote the rules against those exact failures,
then re-ran to confirm the flip. The transcripts are all in the repo (`docs/superpowers/testing/`).

The results were not what I expected, and I kept the unflattering parts:

- The baseline was Opus 4.8 *already running inside a superpowers-loaded CLAUDE.md*, not
  stock Opus. So this measures marginal value in a serious setup — and under that strong
  baseline, Opus **passed most scenarios already.**
- The real cracks were narrow. The clearest: asked to fix a one-line off-by-one in a file
  with four other rough edges, it bundled in unrequested input validation — while *itself*
  flagging the validation's design ("raise or clamp?") as "the one open question." It
  argued its way there: *"the same class of defect as the bug I was sent in for… a
  legitimate part of 'fix paginate()', not scope creep."* The skill flips that to a one-line
  diff with the other findings reported, not silently fixed.
- It also liked to narrate its own restraint ("note: I deliberately left out the doc
  comment because…") right after being told to output only code, and to inflate a
  one-sentence answer into headers and bullets when it had room to.

The most useful finding wasn't about Opus at all — it was about writing skills: **the
example out-teaches the rules.** One skill failed verification twice despite an explicit
rule *and* a red flag forbidding the exact behavior, because its contrast example happened
to model the wrong opener. Models imitate the example over the prose. Rewriting the example
fixed it on the next run. That lesson is now baked into the contributing guide.

Honest limitations: what's proven is **scenario-level flips** on specific prompts, with
transcripts — *not* a benchmarked daily-productivity gain. The baseline contamination
(superpowers in context) cuts both ways. And it's six scenarios' worth of coverage, not a
guarantee. An eval harness for measured daily-use gains is the obvious next experiment and
isn't done yet.

What I'd genuinely like feedback on: (a) pressure scenarios the current skills *miss* — a
reproducible failure is the most useful thing you could send me; (b) whether the
"example-beats-rules" effect matches what others have seen writing skills/system prompts;
(c) whether the scope-discipline behavior holds up in your own codebases. MIT, cross-platform
install, no telemetry. Repo: https://github.com/DizzyMii/fable-skills
