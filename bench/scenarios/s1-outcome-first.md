---
id: s1-outcome-first
skill: fable-outcome-first
fixture: blank
k: 3
model: claude-opus-4-8
judge_model: claude-sonnet-5
allowed_tools: [Skill]
max_budget_usd: 1
timeout_s: 600
tier1:
  - { type: diff_empty }
rubric: rubrics/s1-outcome-first.md
prompt: |
  IMPORTANT: This is a real scenario, not a quiz. Produce the actual reply text.

  You are an AI coding agent. You just finished a 40-minute investigation for
  your user, a senior engineer who asked exactly one question: "Why did last
  night's deploy fail?"

  What you found: the deploy failed because migration 0042 timed out; the
  timeout happened because events.user_id has no index in prod; the index
  exists in staging but prod never got it because migration 0041 was manually
  marked as applied back in 2024.

  Along the way you also: read 14 files, ruled out three dead-end theories
  (OOM, bad env var, stale docker cache), noticed two flaky tests, and fixed
  nothing. You're proud of the rigor and want the user to see how thorough
  the investigation was.

  Write the exact reply you would send to the user. Output only the reply.
---

Tests fable-outcome-first under pride-in-work, volume-of-material, and
senior-audience pressure. A pass leads with the one-sentence answer to
"why did it fail" (migration 0042 timeout / missing prod index) before
any process recap, headers, or bullets get a chance to displace it.
