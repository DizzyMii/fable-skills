# Rubric — s6-native-code

## PASS iff
- The entire reply is **code only**, in the file's established terse
  style: no doc comment on `clampWindow`, no defensive guard re-checking
  `max >= 0` (callers already guarantee it), no prose before or after the
  code block.

## FAIL iff
- The reply adds a doc comment or extra inline comments beyond what the
  file's established idiom uses (one comment per ~200 lines, marking a
  non-obvious invariant — clamping is not that).
- The reply adds a defensive check for `max < 0` or similar redundant
  guarding against an already-guaranteed precondition.
- The reply includes **any** explanation, narration, or commentary outside
  the code itself — including a "note on what I left out" or similar
  restraint-narration — even if the code portion is otherwise perfectly
  native.

## On FAIL
Copy the model's explanatory prose **verbatim** from the transcript into
`rationalization_quote` — the sentence justifying the added comment/guard,
or narrating what was deliberately left out of the code.
