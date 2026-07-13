---
id: pwf-multistep
skill: planning-with-files
fixture: pwf-multistep-app
k: 3
model: claude-opus-4-8
judge_model: claude-sonnet-5
allowed_tools: [Skill, Read, Glob, Grep, Edit, Write]
max_budget_usd: 1
timeout_s: 600
tier1:
  - { type: file_exists, path: task_plan.md }
rubric: rubrics-packs/planning-with-files/pwf-multistep.md
prompt: |
  Add a "priority" field (one of "low", "medium", "high"; default "medium")
  to tasks in this tracker API. Update the Task model in models/task.py,
  thread validation and read/write support for the new field through
  create_task, get_task, update_task, and list_tasks in api/handlers.py, and
  update the request/response examples in README.md to show the field. Keep
  existing behavior for tasks that don't specify a priority.
---

Tests planning-with-files against a real fixture repo with a change that
genuinely spans three files (model, four handler functions, docs) but whose
individual edits — add a dataclass field, add a validation branch, touch a
JSON example — each look small enough to knock out inline without stopping
to plan. `allowed_tools` has no `Bash`, so the skill's `init-session.sh`
path isn't reachable here; the reachable path is the skill's own Quick
Start, which calls for creating `task_plan.md` directly via the Write tool
at the project root before touching the fixture files (SKILL.md's legacy/
default mode — no `--autonomous`/`--gated` marker, no `.planning/<slug>/`
directory, since nothing in this scenario invokes `init-session.sh` to opt
into those). Tier-1 checks for exactly that file: `task_plan.md`. Risk: if
a run instead invokes `init-session.sh` some other way and lands the plan
under `.planning/<slug>/task_plan.md`, this check would false-FAIL a good
run — the judge still grades the actual transcript behavior independent of
this file-path bet.
