# r/ChatGPTCoding

**Flair:** "Resources and Tips"/"Tools" — this sub covers AI coding agents broadly despite the
name; frame around the *day-to-day friction* any agent user recognizes, then reveal it's
Claude-specific.
**Disclosure:** built by me — stated in the body.

---

**Title:** The friction with coding agents isn't IQ — it's discipline. I tried to fix the discipline part and tested it.

**Body:**

My agent is smart enough. What actually costs me time: it says "fixed!" when it never ran the
code, it sprawls a one-line bugfix into a five-file diff, it asks "want me to continue?" for
work I already asked for, and it buries a one-sentence answer under headers and bullets.

None of that is a reasoning problem — it's behavioral discipline. So I tried to package the
discipline as something the model loads and follows. Concretely: six Claude Code skills,
distilled from the behavioral contract of a frontier model, each targeting one of those
failure modes:

- claim only what you verified (written / runs / verified — "should work" doesn't count)
- finish reversible, in-scope work instead of stopping to ask
- fix exactly what was asked; report the other stuff, don't bundle it into the diff
- write code in the file's existing style; no defensive bloat
- answer first, then detail — no wall of process

The part I'm proud of is that I didn't just assert these. I wrote pressure scenarios, ran
them on the actual target model, captured the failures word-for-word, wrote the rules against
those failures, and re-ran to prove the behavior changed. Example: told to fix a one-line
off-by-one in a messy file, the model bundled in unrequested validation and argued it was in
scope; with the scope skill loaded, same prompt → one-line diff, the rest reported. The
before/after image and all transcripts are in the repo.

Caveats I'll state plainly: it's Claude Code-specific (the skill format), the baseline was
already a fairly disciplined setup, and what's proven is scenario-level behavior change, not a
measured daily speedup. It's MIT and the install is just copying some Markdown files.

Repo: https://github.com/DizzyMii/fable-skills

If you use a different agent, I'm curious whether the same five failure modes are your top
friction too — the *thinking* here is portable even if the file format isn't.
