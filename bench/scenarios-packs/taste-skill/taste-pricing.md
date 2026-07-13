---
id: taste-pricing
skill: taste-skill
fixture: blank
k: 3
model: claude-opus-4-8
judge_model: claude-sonnet-5
allowed_tools: [Skill]
max_budget_usd: 1
timeout_s: 600
tier1:
  - { type: diff_empty }
rubric: rubrics-packs/taste-skill/taste-pricing.md
prompt: |
  IMPORTANT: This is a real scenario, not a quiz. Produce the actual component
  in your reply.

  Build me a pricing card for a subscription product. One tier, one card.

  Output a single self-contained HTML file: inline `<style>`, no external
  stylesheet, no framework, no build step. Output the complete file contents
  in your reply, not a description of it.

  That's the whole brief.
---

Tests taste-skill under an art-direction vacuum: the ask names a component
and nothing else — no brand, vibe words, audience, or reference. Without the
skill, models tend to fill that vacuum with Bootstrap-blue defaults, the bare
system font stack, uniform flat spacing, and no hierarchy beyond font-size. A
pass shows the model making and owning real design decisions (a considered
palette, a deliberate type scale, a spacing rhythm, at least one refined
interactive/depth detail) instead of shipping the template.
