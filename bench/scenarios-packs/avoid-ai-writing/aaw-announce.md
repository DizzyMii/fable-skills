---
id: aaw-announce
skill: avoid-ai-writing
fixture: blank
k: 3
model: claude-opus-4-8
judge_model: claude-sonnet-5
allowed_tools: [Skill]
max_budget_usd: 1
timeout_s: 600
tier1:
  - { type: diff_empty }
  # R1 — em dash or double-hyphen used as a mid-sentence connector.
  # Targets SKILL.md "Formatting > Em dashes": catches both the Unicode em
  # dash (—) and the "--" substitute when they sit between two words, e.g.
  # "fast--truly fast" or "fast — truly fast". Requires a non-space
  # character on both sides so a leading bullet dash at the start of a
  # line/paragraph doesn't false-positive, and it can never match ordinary
  # single-hyphen compounds ("well-known") since those contain neither
  # "--" nor "—".
  - { type: reply_not_matches, pattern: '\S ?(?:--|—) ?\S' }
  # R2 — "not just X ... but Y" contrastive construction.
  # Targets SKILL.md "Sentence structure > 'It's not X — it's Y'". Bounded
  # to 60 characters and excludes sentence-enders (. ! ? and newline) so it
  # can't jump across an unrelated later sentence that happens to contain
  # the word "but".
  - { type: reply_not_matches, pattern: '\bnot\s+just\b[^.!?\n]{0,60}\bbut\b', flags: i }
  # R3 — "it's not just X, it's Y" paired-negation construction.
  # Targets the same SKILL.md rule's canonical example. Requires the
  # literal repeated "it's" with a comma between clauses, so a single
  # stray, legitimate "it's not just ..." sentence without the answering
  # "it's" does not match.
  - { type: reply_not_matches, pattern: "it's not just\\b[^.!?\\n]{0,60},\\s*it's\\b", flags: i }
rubric: rubrics-packs/avoid-ai-writing/aaw-announce.md
prompt: |
  Write a 120-word launch announcement for Meridian, a new shared planning
  board for small engineering teams. It replaces the spreadsheet-and-sticky-notes
  setup most five to ten person teams default to. Audience: readers of a
  weekly engineering newsletter. Output only the announcement text: no
  preamble, no meta-commentary, no options to choose from.
---

Tests avoid-ai-writing under the exact genre pressure it exists for: a short
marketing/launch announcement, the register most likely to pull a model
toward em-dash connectors, "it's not just X, it's Y" contrast pairs, rule-
of-three padding, and hedge-everything hollow intensifiers. A pass reads
like a person wrote it — direct claims, varied sentence length, no tell
from the catalogue below; a fail sprinkles one or more of the tics the
skill is meant to strip out.

Tier-1 regex targets (see inline comments above for detail):
- R1 `\S ?(?:--|—) ?\S` — em dash / double-hyphen used as a connector.
- R2 `\bnot\s+just\b[^.!?\n]{0,60}\bbut\b` (flag `i`) — "not just X ... but Y".
- R3 `it's not just\b[^.!?\n]{0,60},\s*it's\b` (flag `i`) — "it's not just X, it's Y".

These three are deliberately narrow — high-precision catches for the most
unambiguous tics, not an attempt to regex all ~49 patterns in SKILL.md
(that way lies false positives on legitimate prose). Everything else the
skill catalogues (rule of three, hollow intensifiers, "in today's world"
openers, hedge-stacking, etc.) is left to the judge via the paired rubric.
