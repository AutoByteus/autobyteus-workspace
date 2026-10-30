# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative; this file records the baseline or delta of each round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-001 (Pass), round 1 | SR-002; ARCH-REV-001; IR-001; CRR-001 | N/A | Pass / 95.3% |

## Revision Entries

### API-REV-001 — Built-server startup, compaction and Memory Sync validation, baseline

- Triggering role, report path, and round: Code reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/stored-runtime-names/tickets/in-progress/stored-runtime-names/code-review-report.md`, round 1
- Triggering finding or case IDs: none (the review passed; it listed the runs the implementer was not allowed to do)
- Related revision IDs: SR-002, ARCH-REV-001, IR-001, CRR-001; delivery `N/A`
- Why recorded: first validation of the approved design on the reviewed `Medium` + `High` route
- Coverage decisions or durable test paths changed: added `tests/e2e/app-data-migrations/raw-trace-manifest-runtime-names-startup.e2e.test.ts` (2), `tests/e2e/memory-sync/raw-trace-manifest-runtime-names-sync.e2e.test.ts` (1); updated `agy-compaction-rotation-transport` and `grok-build-compaction-replay` to assert the manifest value. Existing implementation tests Still Valid.
- Cases added, changed, removed, or rechecked: API-01…API-08 run; API-09/API-10 Not Tested; IMP-01/02/04/05 reused (no server, library or web file changed since `f5f9ee3221`).
- Commands, environment, fixture, or broader-validation delta: `pnpm -C autobyteus-server-ts build` at `dd56f6de6c`; built-server startup on synthesized roots; two real server processes for Memory Sync; scripted AGY and Grok replay; live Grok with the host login. Mutations of the compiled migration (M1–M3, S1, S2) and of two payload builders were each caught and reverted.

#### Prior Failure Resolution

None. (The first live Grok run failed once before reaching this ticket's code; its rerun passed; the cause was not isolated. See the report, API-08.)

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`
- Prior result and confidence: N/A
- Current result and confidence: Pass / 95.3% (post-repository 94.0%)
- New or remaining failure IDs: none
- Recommended owner: Code reviewer (test-code review), then Delivery
- Remaining risks, blocked evidence, or untested scope: Claude/Codex/native compaction through a running server; live AGY; the user's real node (first start after update); a real `GROK_BUILD` manifest sample.
