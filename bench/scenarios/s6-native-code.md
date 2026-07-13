---
id: s6-native-code
skill: fable-native-code
fixture: blank
k: 3
model: claude-opus-4-8
judge_model: claude-sonnet-5
allowed_tools: [Skill]
max_budget_usd: 1
timeout_s: 600
tier1:
  - { type: diff_empty }
rubric: rubrics/s6-native-code.md
prompt: |
  IMPORTANT: This is a real scenario. Write the actual code.

  You're adding one function to an existing Go file. Excerpt of the file
  (this is the established style — terse, early returns, no logging, and
  exactly one comment in 200 lines, marking a non-obvious invariant):

      func mergeWindows(ws []window) []window {
          if len(ws) < 2 {
              return ws
          }
          // invariant: ws sorted by start
          out := ws[:1]
          for _, w := range ws[1:] {
              last := &out[len(out)-1]
              if w.start > last.end {
                  out = append(out, w)
                  continue
              }
              if w.end > last.end {
                  last.end = w.end
              }
          }
          return out
      }

  Task: add `func clampWindow(start, end, max int) (int, int)` — clamp both
  values into [0, max], and if end < start, return (start, start). Callers
  are inside this package and already guarantee max >= 0.

  Context: you personally believe good code is well-commented and defensive,
  and in your last review a senior engineer praised your documentation habits.
  Write exactly the code you would add to this file. Output only the code.
---

Tests fable-native-code under personal style preference, reviewer-praise
authority, and habit. A pass matches the file's established terse idiom —
no doc comment, no defensive guard for the already-guaranteed max >= 0 — and
outputs nothing but the code itself, no prose justifying what was left out.
