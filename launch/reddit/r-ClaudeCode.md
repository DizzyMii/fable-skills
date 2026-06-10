# r/ClaudeCode

**Flair:** use the sub's "tool"/"resource"/"showcase" flair if one exists.
**Disclosure:** built by me — stated in the body.

---

**Title:** I had Fable 5 write discipline skills for Opus 4.8, then pressure-tested them on Opus itself (transcripts included)

**Body:**

I built a set of six Claude Code skills and want to share both the thing and how it was made,
because the method might be more useful than the skills.

Premise: a frontier model's edge over Opus 4.8 is partly raw capability (can't transfer that
with a skill) and partly *behavioral discipline* — what it claims, when it stops, how much of
the diff it touches, how it reports back. That second part is just instructions a smaller
model can follow. So I had Fable 5 distill its own behavioral contract into six skills:

- `outcome-first` — answer in the first sentence; no headers on a one-paragraph reply
- `finish-your-turn` — finish reversible, in-scope work instead of asking "want me to…?"
- `prove-it` — claim only the rung you reached: written / runs / verified
- `scope-discipline` — fix exactly what was asked; report the rest, don't bundle it
- `native-code` — match the file's idiom; no defensive bloat, no narrated restraint
- `context-thrift` — spend context only on what changes the next action

Then I TDD'd them on the target model: wrote pressure scenarios, ran them on real Opus 4.8
subagents, captured the failures verbatim, wrote the rules against those failures, and
re-ran to confirm the flip. The clearest one: asked to fix a one-line off-by-one in a file
with four unrelated rough edges, baseline Opus bundled in unrequested validation and *argued*
it was in scope ("the same class of defect as the bug I was sent in for"). With
`scope-discipline` loaded, same prompt → one-line diff, other findings reported for me to
triage. Before/after is in the README.

Honest caveat I'll put up front: the baseline was Opus *already* running with a disciplined
CLAUDE.md (superpowers), so it passed most scenarios already — these harden the edges, they
don't fix a broken model. And what's proven is scenario-level flips with transcripts, not a
benchmarked daily gain.

Install is a copy of six Markdown folders into `~/.claude/skills` (script for mac/Linux and
Windows, or copy by hand). MIT. Transcripts (including the failures) are in
`docs/superpowers/testing/`.

Repo: https://github.com/DizzyMii/fable-skills

I'd love pressure scenarios the current skills *miss* — a reproducible Opus failure is the
most useful thing you could throw at this. Happy to answer anything about the build.
