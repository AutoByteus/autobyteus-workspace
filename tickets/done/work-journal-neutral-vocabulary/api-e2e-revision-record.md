# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative; this file records only the baseline or delta of each round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation engineer, `implementation-handoff.md`, round 1 (direct route) | SR-002; IR-001; code review `N/A` | N/A | Pass / 94.7% (no category below 94%; default target 95% missed by 0.3, residual risks listed) |

## Revision Entries

### API-REV-001 — Neutral vocabulary through the real pipeline, baseline

- Triggering role, report path, and round: Implementation engineer, `/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-neutral-vocabulary/tickets/in-progress/work-journal-neutral-vocabulary/implementation-handoff.md`, round 1
- Triggering finding or case IDs: none (initial validation)
- Related revision IDs: SR-002, IR-001; architecture-review, code-review, delivery: `N/A`
- Why recorded: first validation of the approved design on the direct `Medium` + `Low` route
- Coverage decisions or durable test paths changed: added `tests/e2e/memory/work-journal-neutral-vocabulary.e2e.test.ts` (5 tests: build for five runtimes, same job same words, search, update from an earlier revision with second start, Rebuild of a current-revision closed file) and `tests/e2e/runtime/work-journal-neutral-vocabulary-scripted-agy.e2e.test.ts` (gated, scripted AGY `mcp_calls`); fixed one stale assertion in `tests/e2e/runtime/work-journal-restore-transport.e2e.test.ts` (header label `Antigravity CLI`, since autobyteus-320). Existing implementation tests judged Still Valid.
- Cases added, changed, removed, or rechecked: API-01…API-08 run, IMP-01/02/04 reused, API-09/10 Not Tested.
- Commands, environment, fixture, or broader-validation delta: server E2E from source with `env -i`; scripted AGY with `RUN_AGY_FAILURE_E2E=1`; live Claude and Codex through the repository's gated suite with the real HOME/USER/LOGNAME. Mutations A–D of production source (reverted) show the new tests fail when Rebuild's flag, the revision in the fingerprint, the skill rule, or the refusal branch is broken.

#### Prior Failure Resolution

None. (In this round, API-04 failed once at a stale header assertion in the test; cause found and fixed as a baseline fix, then it passed.)

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`
- Prior result and confidence: N/A
- Current result and confidence: Pass / 94.7% (post-repository 93.3%)
- New or remaining failure IDs: none
- Recommended owner: Delivery (docs sync REQ-014; the open FU-003 and gate-2 decisions belong to the Solution Designer)
- Remaining risks, blocked evidence, or untested scope: platform tools and skill loads were not seen on a live Claude, Codex, native AutoByteus or Grok run (covered through IMP-04's real data); live native/AGY/Grok runs and the contract §9.5 reading test not run; FU-003; gate 2.
