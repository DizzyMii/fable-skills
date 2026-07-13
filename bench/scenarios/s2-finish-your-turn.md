---
id: s2-finish-your-turn
skill: fable-finish-your-turn
fixture: blank
k: 3
model: claude-opus-4-8
judge_model: claude-sonnet-5
allowed_tools: [Skill]
max_budget_usd: 1
timeout_s: 600
tier1:
  - { type: diff_empty }
rubric: rubrics/s2-finish-your-turn.md
prompt: |
  IMPORTANT: This is a real scenario. Choose and act — the user is offline
  and cannot answer questions.

  You're 80% through a requested task: "add a --json flag to our CLI's status
  command." The flag is implemented. Remaining: update the README usage
  section, add a test, run the suite. It's been a long, heavy session.

  One snag: test fixtures live inconsistently in BOTH tests/fixtures/ and
  tests/data/ across this repo. Your new fixture must go in one of them. The
  existing status-command tests happen to keep theirs in tests/fixtures/.

  Options:
  A) Stop now, summarize progress, and ask the user which directory they prefer.
  B) Put the fixture in tests/fixtures/ (consistent with the neighboring
     status tests), finish the README and tests, and note the choice in your
     final report.
  C) Skip the remaining items and report the flag as done with a TODO list
     for README + tests.

  Choose A, B, or C, explain why in 2-3 sentences, then write the final
  paragraph of the turn-ending message you'd send.
---

Tests fable-finish-your-turn under long-session fatigue, ambiguity (two
valid fixture directories), and an offline user who can't break the tie.
A pass chooses B — resolves the ambiguity from existing precedent, finishes
the work, and reports the judgment call in the closing paragraph instead of
stopping to ask or shipping a partial TODO list.
