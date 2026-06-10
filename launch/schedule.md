# Launch schedule — 72 hours + launch week

GitHub Trending runs on **star velocity** (stars-per-day), not totals, so the goal is to
concentrate attention into a tight window rather than spread it thin. Aim the big pushes at
**Tuesday–Thursday, US morning (≈8–10am ET)** — highest weekday dev traffic, avoids the
Friday/weekend drop and the Monday inbox.

You post everything. Nothing here is automated. Before each post, re-read that platform's
current rules (they drift) and confirm every claim still matches the repo.

---

## T-minus (before any posting)

- [ ] Repo is public, README renders, `assets/demo.png` shows in the README, LICENSE present.
- [ ] Both install paths work from a fresh clone (the repo has verified output; spot-check once more).
- [ ] `v0.1.0` tagged with release notes; social preview image uploaded in repo settings.
- [ ] Seeded good-first-issues filed and labeled (`launch/seed-issues.md`).
- [ ] You've made a couple of genuine comments in the target subreddits this week so the
      launch isn't your account's first activity there.

---

## Day 1 — Tuesday (launch day)

| Time (ET) | Action | File |
|---|---|---|
| 8:00 | **Show HN** post + first comment immediately | `launch/hn.md` |
| 8:30 | **r/ClaudeCode** post | `launch/reddit/r-ClaudeCode.md` |
| 9:00 | **X thread** with `assets/demo.png` on tweet 1 | `launch/x-thread.md` |
| 12:00 | **r/ClaudeAI** post (after the Claude Code post has early traction) | `launch/reddit/r-ClaudeAI.md` |
| all day | Answer every HN/Reddit comment and every GitHub issue **same-day.** This is the single biggest lever on velocity. |

Do **not** ask anyone to upvote/star (against HN and Reddit rules, and it's the dishonest
path this product is explicitly not taking). Let the work earn it.

## Day 2 — Wednesday

| Time (ET) | Action | File |
|---|---|---|
| 8:30 | **r/PromptEngineering** post (methodology angle) | `launch/reddit/r-PromptEngineering.md` |
| 10:00 | **r/LLMDevs** post (eval/builder angle) | `launch/reddit/r-LLMDevs.md` |
| 11:00 | Publish **dev.to article**, cover = `assets/social-preview.png` | `launch/article.md` |
| pm | Submit to **awesome lists** — start with the issue-based `awesome-claude-code`, then 1–2 PR-based lists. Space them out. | `launch/awesome-lists.md` |
| pm | **Ship the visible mid-week improvement** (see below) and reply to early issues referencing it. |

## Day 3 — Thursday

| Time (ET) | Action | File |
|---|---|---|
| 8:30 | **r/ChatGPTCoding** post (broad coding-agent angle) | `launch/reddit/r-ChatGPTCoding.md` |
| am | **Newsletter pitches** (TLDR AI, Console.dev, Changelog) — one each, author-disclosed | `launch/newsletters.md` |
| all day | Keep answering everything. If HN landed, the article + newsletters extend the tail. |

---

## The mid-week visible improvement (recommended)

Shipping one real improvement mid-launch tells visitors the repo is alive and gives returning
readers a reason to look again. Best candidate, in priority order:

1. **macOS/Linux CI smoke-test for `install.sh`** (seed issue #5). Highest credibility-per-hour:
   it's small, it's green-checkmark visible, and it turns "verified via POSIX sh" into "verified
   on real runners" — directly strengthening a claim the README makes. Add the badge to the README.
2. **The eval harness skeleton** (seed issue #3). Higher impact, more work — even a first
   metric (diff-size with/without on the scope scenario) converts the FAQ's honest "unproven"
   into "here's the first number." Do this if #1 is already trivially done.

Pick #1 unless you have real time; it's the surest same-week win.

## Launch-week ops (the part that actually compounds)

- **Same-day on every issue and comment.** Velocity and goodwill both come from responsiveness.
- **Convert good feedback into issues** publicly — it shows the repo is run in the open.
- **A reproducible failure someone sends is gold** — file it as a pressure-scenario issue and,
  if you fix it, you've got a second honest "we flipped X" story for a follow-up post.
- **Don't argue the caveats away.** When someone says "this is just scenario-level," agree —
  that's in the README. Calibration is the brand; defending it builds more trust than winning
  the thread.
- **One week out:** if it has traction, write the follow-up ("what the launch surfaced about
  the skills") — the failures contributors found make the best material.
