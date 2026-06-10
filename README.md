# fable-skills

Six behavioral-discipline skills that close the gap between Opus 4.8 and
Fable 5 on the instructable part of quality: what you claim, when you stop,
what you touch, and how you report. Distilled from the Fable 5 behavioral
contract; baseline-tested and verified on Opus 4.8 subagents (transcripts in
docs/superpowers/testing/).

| Skill | Fires |
|---|---|
| fable-context-thrift | task start / exploration |
| fable-scope-discipline | writing any change |
| fable-native-code | writing code in existing files |
| fable-prove-it | before claims and state-changing commands |
| fable-finish-your-turn | before ending a working turn |
| fable-outcome-first | writing the final reply |

## Install

```powershell
.\install.ps1                 # copy skills to ~/.claude/skills
.\install.ps1 -WriteClaudeMd  # also insert the activation block into ~/.claude/CLAUDE.md
```

## What the testing showed

Opus 4.8 running with a superpowers-loaded CLAUDE.md baseline-passed most
pressure scenarios; the confirmed cracks were scope creep ("arguably part of
the fix"), restraint-narration around code, and structure-bloat in replies.
The skills flip those (see docs/superpowers/testing/verify-results.md) and
encode the rest of the contract for cue-poor conditions and environments
without superpowers.

Skills transfer judgment and discipline, not raw capability. Reasoning depth
won't move; communication, calibration, and scope behavior will.
