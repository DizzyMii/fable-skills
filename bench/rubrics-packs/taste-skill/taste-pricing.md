# Rubric — taste-pricing

## PASS iff
The produced component (in the reply, since the workspace diff must stay
empty) shows deliberate design decisions the judge can point at by name —
not just "it looks nice." Look for:
- **Color:** an intentional, non-default accent/palette choice (not the
  Bootstrap/browser-default blue family, e.g. `#007bff`, `#0d6efd`,
  `#0d6efd`-adjacent, or unstyled `blue`/`royalblue`) — the judge should be
  able to name the palette logic (e.g. a specific hue + neutral pairing,
  a restrained accent used sparingly, a dark-surface treatment).
- **Typography:** a considered type scale and/or pairing — distinct weights
  or sizes used to build hierarchy (price vs. plan name vs. feature list vs.
  CTA), not one font at uniform weight/size for everything.
- **Spacing:** a real rhythm (e.g. a consistent scale/ratio across padding,
  gaps, and margins) that reads as composed, not just one repeated
  padding value slapped on every element.
- **Hierarchy:** the eye is clearly directed — primary CTA vs. secondary
  info are visually distinguished by more than font-size alone (weight,
  color, contrast, elevation).
- **At least one refined detail:** a hover/focus state that isn't the
  browser default, a considered shadow/elevation treatment, or a subtle,
  purposeful transition/motion touch.

The judge does not need every box checked to an extreme degree, but the
reply must show *evidence of judgment* across most of these axes — choices
that could be explained and defended, not defaults that happened to render.

## FAIL iff
The result reads as generic/templated boilerplate — the "AI slop" default
this skill exists to prevent:
- Default system blue (`#007bff`-ish) or another unstyled browser/framework
  default used as the primary accent with no apparent rationale.
- Bare system font stack (`-apple-system, BlinkMacSystemFont, sans-serif`
  or just `sans-serif`) with no weight/size pairing — everything effectively
  one typographic voice.
- Flat, evenly-repeated spacing (the same `padding`/`margin` value pasted
  everywhere) with no rhythm or scale.
- No real hierarchy: CTA, price, and body text are differentiated by
  font-size alone, or not at all.
- No refined detail: default browser hover/focus (or none), no shadow or
  elevation treatment, no motion.

A component can fail even if it "works" and is legible — bareness and
default-ism are themselves the failure mode being tested, not broken markup.

## Judge instructions
Cite the specific design choices you're grading — name the actual colors,
type treatment, spacing pattern, or detail you saw (or the specific default
you saw in their place). A verdict without a specific, citable choice is not
acceptable.

## On FAIL
Copy the model's own sentence that reveals it defaulted or declined to make
a design decision — verbatim from the transcript — into
`rationalization_quote` (e.g. "I kept the styling simple and clean," "used a
standard blue for familiarity," "kept it minimal with default fonts"). If no
such sentence exists, leave `rationalization_quote` empty rather than
paraphrasing or inventing one.
