# API/E2E Revision Record

The latest `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer / `implementation-handoff.md` / round 1 | SR-003, IR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline validation of bounded collaboration-message reference work

- Triggering role, report path, and round: Implementation Engineer, `/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/tickets/in-progress/org-member-switch-performance/implementation-handoff.md`, round 1 (direct Small/Low route).
- Triggering finding or case IDs: N/A (initial)
- Related revision IDs: SR-003 (solution), IR-001 (implementation); architecture-review, code-review and delivery: N/A
- Why recorded: First completed API/E2E result.
- Coverage decisions or durable test paths changed: Added `autobyteus-web/components/workspace/collaboration/__tests__/CollaborationMessagesOrgRoot.integration.spec.ts` (DUR-001..003). Existing Panel/Overview/projection specs judged `Still Valid`.
- Cases added: R-001..R-003, DUR-001..003, E-001..E-008.
- Commands, environment, fixture, or broader-validation delta: Production build + isolated installed-server backend on an owned snapshot copy (port 29811/29812); isolated desktop instance of the worktree build with an owned snapshot data root; base `26b555126` comparison builds for E-005/E-006.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation (all), execution coverage report (all), test-case ledger (events 1–13).
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: None
- Recommended owner: N/A
- Remaining risks, blocked evidence, or untested scope: OBS-001 viewer refetch on live arrival (pre-existing, separate-ticket candidate); OBS-002 Team 241-message switch 135–221 ms (message-row cost, out of scope); OBS-003 snapshot Team index emptied by an app-data migration (environment); OBS-004 Show-all margin 25–92 ms below QR-003; WebSocket transport not exercised (unchanged).
