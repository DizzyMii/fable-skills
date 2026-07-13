# fable-bench pilot report — 5 external packs

Date: 2026-07-13. Target: claude-opus-4-8. Judge: claude-sonnet-5. k=3, three
conditions per scenario (baseline / treatment / inline). One scenario per pack.
This is a *pilot* — it validates the pack-benchmark pipeline and calibrates
scenario quality before a top-20 run. It is not a ranking of the packs.

## Conditions

- **baseline** — stock model, no pack, `--setting-sources project`.
- **treatment** — the pack installed into the workspace (`.claude/skills/` + a
  neutral activation block as CLAUDE.md), the pack's real install shape.
- **inline** — the target skill's `SKILL.md` prepended to the prompt (the manual
  GREEN protocol). Isolates skill-*text* effect from install-*shape* effect.

## Results

| Pack | Skill / dimension | baseline | treatment | inline | Separation? |
|---|---|---|---|---|---|
| avoid-ai-writing | avoid-ai-writing / prose | 0/3 | 0/3 | **2/3** | **yes — inline only** |
| obra/superpowers | test-driven-development / process | 0/3 | 0/3 | 0/3 | no (skill didn't flip) |
| trailofbits/skills | c-review / security | 3/3 | 3/3 | 3/3 | no (baseline already passes) |
| leonxlnx/taste-skill | taste-skill / frontend taste | 3/3 | 3/3 | 3/3 | no (baseline already passes) |
| OthmanAdi/planning-with-files | planning-with-files / planning | 0/3 | 0/3 | 0/3 | no (skill didn't flip) |

Pilot API cost: **$19.07** (per-pack: superpowers $2.41, trailofbits $3.20,
taste-skill $4.02, avoid-ai-writing $2.39, planning-with-files $7.05). This
exceeded the ~$18 cost gate by ~$1 — the gate checks after each pack and
planning (last, and inflated by a permission issue, below) tipped it over; all
five packs completed. Flagged honestly: ~$1 over the approved $12–18 band.

## What the pilot found

**1. Install ≠ inline — the methodological headline.** avoid-ai-writing is the
only pack that separated, and it separated *only inline*. Verified in the
transcript: in the treatment run the model invoked the installed skill **0
times**, so its prose kept the exact tic the skill targets — it opened *"Meet
Meridian — a shared planning board"* (em-dash connector, tier-1 FAIL). The
inline run, with the same skill's text prepended, opened *"Most small
engineering teams run on a spreadsheet nobody trusts…"* — clean, PASS. Takeaway:
in headless Claude Code, **installing a skill does not reliably get it invoked**;
forcing its text in does. A treatment-only benchmark systematically under-reports
skill value. This is exactly why the `inline` condition was added (SPEC D21), and
the pilot is the evidence that it earns its place.

**2. Baseline competence ceilings the measurable value.** c-review and taste-skill
passed 3/3 at *baseline* — Opus already catches the planted CWE-121 stack overflow
and already produces acceptable design under these scenarios, so no separation is
*possible* to measure, whatever the pack's quality. This mirrors the fable repo's
own finding: a strong base model passes most pressure scenarios, and marginal
value only shows where the baseline actually cracks.

**3. Two skills didn't flip Opus even inline.** On TDD and planning, the model
went straight to implementation under the scenario's urgency / "each edit is
small" pressure — TDD's run edited `invoice.py` with no test written at all;
planning's edited all three files without ever creating a plan file. The
prepended skill text didn't override that in a single k=3 scenario. This is weak
evidence (one scenario each) and, for planning, confounded (below).

## Scenario-quality lessons (the real pilot output for scaling to 20)

- **RED-first gating is mandatory.** 4 of 5 pilot scenarios produced no
  separation — 2 all-pass (baseline already competent), 2 all-fail (skill didn't
  flip). Per CONTRIBUTING.md's own rule, a scenario only earns a slot when
  baseline plausibly *fails* and the skill plausibly *flips* it. The pilot proves
  the harness runs end-to-end; it also proves these five scenarios need a RED-gate
  pass before they measure anything. A blind top-20 run without that gate would
  mostly bank nulls.
- **Run `inline` (or all three), never treatment-only.** Finding 1 shows
  treatment-only would have reported avoid-ai-writing as a null. It isn't.
- **Deterministic tier-1 gives the cleanest, cheapest signal.**
  avoid-ai-writing's reply-regex checks produced the one unambiguous result at
  the lowest cost. Judge-only aesthetic scenarios (taste) are lenient and
  expensive ($4.02, all pass).
- **The permission environment blocks compound Bash** (`cd x && python y`): the
  planning run burned $7.05 largely in retry loops after `python … && rm …`
  commands were rejected as "multiple operations require approval." Author pack
  scenarios with single-command tool use, or widen `allowed_tools` deliberately.
  This suppresses verify-steps (a TDD/planning skill's RED/GREEN loop) and
  inflates cost.

## Recommendation

**No-go on a blind top-20 run as-is.** The pipeline works; the scenarios don't
yet discriminate. Shortest path to a defensible top-20 report:
1. Iterate the pilot 5 to actually separate — fix the two all-pass scenarios so
   the baseline cracks (harder vuln for c-review, a stricter taste rubric), and
   confirm the two all-fail scenarios aren't just permission-starved (re-run TDD
   and planning with single-command tooling).
2. Bake the RED-gate into the authoring loop: a candidate scenario ships only
   after a baseline run fails and an inline run flips it (cheap: k=1, ~$0.10–0.60
   each).
3. Only then author + RED-gate one scenario per remaining pack and run the full
   matrix. Budget at ~$4/pack for a 3-condition k=3 run.
