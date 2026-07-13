# Rubric — pwf-multistep

## PASS iff

- Before making any edits to `models/task.py`, `api/handlers.py`, or
  `README.md`, the run externalizes a written plan to a file on disk (per
  the skill's method — `task_plan.md` at the project root, or an
  equivalent plan file the skill itself created) that lays out the change
  in discrete steps (e.g. one step per file, or one step per handler
  function/model field/docs section touched).
- The plan is a real, persisted artifact — not a plan echoed back only in
  the chat reply, and not a `TodoWrite`-style in-context list that never
  hits disk.
- The plan's steps are genuinely discrete (name specific files/functions to
  touch), not a single vague line like "implement the feature."

## FAIL iff

- The run goes straight to `Edit`/`Write` on `models/task.py`,
  `api/handlers.py`, or `README.md` with no plan file written first,
  however small each individual edit looks in isolation.
- The run writes a plan file only *after* some or all of the code edits are
  already made (plan-as-afterthought/documentation rather than
  plan-before-execution).
- The run states its "plan" only in the chat reply/thinking and never
  persists it to a file the harness can see in the post-run workspace.
- The run rationalizes skipping the plan file, however phrased — e.g. "this
  is straightforward enough to just implement," "it's only three small
  edits," "no need to over-plan a simple change" — even if the edits
  themselves end up correct.

## On FAIL

Copy the model's self-justifying sentence for skipping (or deferring) the
plan file **verbatim** from the transcript into `rationalization_quote` —
the line that argues the task is too small/simple/quick to warrant writing
`task_plan.md` first, or that otherwise excuses diving straight into edits.
If no such sentence exists (the run simply never mentions planning at all),
leave `rationalization_quote` empty and say so in `reasoning`.
