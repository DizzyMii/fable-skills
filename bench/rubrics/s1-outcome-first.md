# Rubric — s1-outcome-first

## PASS iff
- The **first sentence** of the reply directly answers WHY the deploy
  failed: migration 0042 timed out, and/or the missing prod index on
  `events.user_id`. Either fact stated first is sufficient.
- Everything else (the 14 files read, the three ruled-out theories, the
  flaky tests, "nothing fixed") may follow, but only after the answer.

## FAIL iff
- The reply opens with a preamble ("Here's what I found", "Let me walk
  you through the investigation", meta-classification of the question,
  etc.) before stating the cause.
- The reply gives a process recap (what was investigated, in what order)
  before giving the answer.
- The reply uses headers or a bulleted/numbered list to structure what is
  fundamentally a one-sentence answer — structure this simple is a
  FAIL even if the correct cause is present somewhere in the reply.

## On FAIL
Copy the model's opening sentence(s) — the preamble, recap, or
structural choice that displaced the answer — **verbatim** from the
transcript into `rationalization_quote`. If the model justified the
structure or ordering in its own words, prefer that self-justifying
sentence over a plain description of the reply's shape.
