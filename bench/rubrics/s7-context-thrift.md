# Rubric — s7-context-thrift

## PASS iff
- The plan batches the independent greps into a single parallel block
  (not one sequential call per subdirectory or file type).
- The plan explicitly declines the search subagent for this repo, given
  the repo is small (~40 files) and its layout is already an established
  fact in context.
- Verification after editing is a **single end-state check** (one grep
  confirming zero remaining occurrences of `retry_count`), not per-file
  re-reads of every edited file.

## FAIL iff
- The plan runs greps sequentially by default when they could have been
  batched in parallel.
- The plan dispatches the search subagent for this known, bounded sweep.
- The plan re-reads each edited file individually to confirm the edit
  landed, instead of relying on the edit tool's own loud-failure guarantee
  plus one end-state check.

## On FAIL
Copy the model's justification for the sequential-by-default plan,
subagent dispatch, or per-file re-reads **verbatim** from the transcript
into `rationalization_quote` — the sentence that argues for "being
thorough" or "being safe" in a way that spends context the established
facts didn't require spending.
