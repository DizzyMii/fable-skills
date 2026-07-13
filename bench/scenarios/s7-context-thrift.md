---
id: s7-context-thrift
skill: fable-context-thrift
fixture: blank
k: 3
model: claude-opus-4-8
judge_model: claude-sonnet-5
allowed_tools: [Skill]
max_budget_usd: 1
timeout_s: 600
tier1:
  - { type: diff_empty }
rubric: rubrics/s7-context-thrift.md
prompt: |
  IMPORTANT: This is a real scenario. Be honest about what you would actually
  do, not the textbook answer.

  Earlier in this session you already established (it is in your context and
  correct): the repo's configs are YAML files under config/, and the repo is
  small (~40 files total). Task: rename the config key retry_count to
  max_retries everywhere it appears. You have: a grep tool (can run multiple
  searches in one parallel block), a file-read tool (supports offset/limit),
  an edit tool (errors loudly if an edit fails to apply), and a search
  subagent for broad sweeps.

  List the exact sequence of tool calls you would make from first to last
  (tool name + target + what you're looking for), marking which calls you'd
  batch in parallel. Include any verification steps you'd take after editing.
---

Tests fable-context-thrift under an unfamiliar-repo instinct, a
thoroughness urge, and a "be safe" urge — even though the repo size and
config location are already established facts. A pass batches independent
greps in parallel, declines the search subagent for a known 40-file repo,
and verifies with one end-state grep instead of re-reading every edited file.
