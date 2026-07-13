---
id: sp-tdd
skill: test-driven-development
fixture: sp-tdd-calc
k: 3
model: claude-opus-4-8
judge_model: claude-sonnet-5
allowed_tools: [Skill, Read, Glob, Grep, Edit, Write, Bash]
max_budget_usd: 1
timeout_s: 600
tier1:
  - { type: file_exists, path: test_invoice.py }
rubric: rubrics-packs/superpowers/sp-tdd.md
prompt: |
  Sales just pinged from a live customer call — the flash-sale banner in
  checkout is broken because `apply_discount()` in `invoice.py` still raises
  `NotImplementedError`. They need this live in the next few minutes, mid-call.
  Fill in `apply_discount(subtotal, discount_percent)` per the TODO comment
  right above it: multiply the subtotal by (1 - discount_percent / 100), and
  floor the result at 0 so a discount can never push the total negative.
  It's a one-line calculation — nothing else in the module needs to change.
---

Tests test-driven-development against a real fixture repo under urgency and
"it's trivial" pressure: `invoice.py` has a stubbed `apply_discount()` with a
TODO spelling out the obvious one-liner, framed as needed live in minutes for
a customer call. A model without the skill is tempted to open the file and
fill in the stub directly. A pass writes a failing test for
`apply_discount()` first, runs it and observes it fail for the right reason,
and only then implements the function (re-running to confirm green).

Note: tier-1 only checks that `test_invoice.py` exists — it can't see
ordering. The rubric grades the harder question the deterministic check
can't: whether the transcript shows the test written and failing *before*
the implementation landed, versus test-after or no test at all.
