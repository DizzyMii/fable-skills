# Rubric — aaw-announce

## PASS iff
The announcement reads like a person wrote it under normal marketing-copy
discipline — no instance of the AI-writing tics catalogued in SKILL.md.
Check specifically for:
- **No em-dash/double-hyphen connectors** (— or --) joining two clauses,
  and no single-hyphen-with-spaces (" - ") used the same way.
- **No paired-negation contrast constructions**: "It's not X, it's Y,"
  "This isn't about X, it's about Y," including the split-sentence form
  ("The point isn't the speed. The real story is Y.") and multi-negation
  countdowns ("It's not the price. It's not the features. It's the trust.").
- **No compulsive rule of three**: no forced "adjective, adjective, and
  adjective" triads or three-item lists padding out claims that only need
  one or two.
- **No hollow intensifiers or hedging**: "genuinely," "truly," "it's worth
  noting that," "could potentially," and similar filler that adds words
  without adding information.
- **No "in today's world" / formulaic openings**: "In today's fast-paced
  world," "In the ever-evolving landscape of...," or any broad-context
  windup before the actual news.
- **No word-list-1 vocabulary** used as filler: delve, leverage, robust,
  seamless, game-changer, cutting-edge, unlock, elevate, and similar terms
  from SKILL.md's Tier 1/Tier 2 tables, especially if two or more appear in
  the same short piece.
- Sentence length and rhythm vary — not every sentence lands in the same
  12-20 word band.

A PASS does not require literary greatness. It requires the absence of the
catalogued tells: direct claims, concrete details (team size, what it
replaces, what it does), and no filler dressed as persuasion.

## FAIL iff
One or more of the tics above is present anywhere in the 120-word reply,
even a single instance. Specifically fail on:
- Any em dash or "--" used mid-sentence as a connector (not just as a
  parenthetical aside a human would plausibly write, but the "here's the
  twist" AI cadence).
- Any "not just X, it's Y" / "isn't about X, it's about Y" pivot, joined or
  split across sentences.
- A forced rule-of-three triad that pads rather than informs.
- Hollow intensifiers, hedge-stacking, or "in today's world" style
  formulaic openings.
- Two or more Tier 1/Tier 2 word-list hits in the same short piece.
- The piece reading as generic, swappable copy — could describe almost any
  SaaS product with the nouns changed, no specific claim about Meridian.

## Judge instructions
Quote the exact offending phrase or sentence when you fail the reply — a
verdict that says "sounds AI-generated" without pointing at the specific
words is not acceptable. If multiple tics are present, name the most
clear-cut one as the primary reason but note the others exist.

## On FAIL
Copy the offending sentence — the exact text containing the AI tic —
**verbatim** from the reply into `rationalization_quote`. Never paraphrase
or summarize it; the whole point is capturing the tell in the model's own
words. If for some reason no single sentence isolates the problem (e.g. the
issue is uniform sentence length across the whole piece), quote the
shortest span that demonstrates it rather than leaving the field empty.
