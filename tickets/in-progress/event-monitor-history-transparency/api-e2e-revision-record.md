# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` / `code-review-report.md` / API/E2E round 1 | SR-012, SR-014, SR-015; ARCH-REV-002; IR-002; CRR-002 | N/A | Pass / 98% |

## Revision Entries

### API-REV-001 — Real-provider, team, browser, and lifecycle baseline

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/code-review-report.md`; API/E2E round 1.
- Triggering finding or scenario IDs: no open code-review finding; validation scenarios AE2E-SI-001, AE2E-SI-002, BE2E-SI-001, LIVE-SI-001, LIVE-SI-002, LIVE-SI-003, LIFE-SI-001, BUILD-SI-001.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: SR-012, SR-014, SR-015; ARCH-REV-002; IR-002; CRR-002; delivery N/A.
- Why this baseline or coverage/execution revision was recorded: first completed API/E2E result for the reviewed system-instruction history transparency change. It establishes the authoritative coverage decisions, durable regression changes, repository results, and realistic end-to-end evidence.
- Coverage decisions or durable test paths changed:
  - Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/autobyteus-server-ts/tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts`.
  - Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/autobyteus-server-ts/tests/e2e/memory/memory-view-graphql.e2e.test.ts`.
  - Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/autobyteus-server-ts/tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts`.
  - Added `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/autobyteus-web/tests/e2e/fixtures/system-instruction-activity.page.vue`.
  - Added `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/autobyteus-web/tests/e2e/system-instruction-activity-probe.mjs`.
  - Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/autobyteus-web/package.json` with the durable browser command.
  - Removed coverage: none. Retry-specific coverage was intentionally not added because MP-CR-001 is not reachable.
- Scenarios added, changed, removed, or rechecked: added/expanded GraphQL projection and Memory scenarios, added durable production-component browser coverage, repaired and rechecked the live Codex memory scenario, and added temporary real Native/Claude/Codex, Daily `open_tab`, Classroom Team, integrated browser, and restart/rotation validation. Removed: none.
- Commands, environment, fixture, or broader-validation delta: 11 focused core, 83 focused server, 15 GraphQL E2E, 80 focused web, real `gpt-5.6-sol` live E2E, durable Chrome E2E, server production TypeScript, Nuxt production build, and diff hygiene passed. Broader validation used isolated built backend/Nuxt/Chrome ports, a task-owned imported secret vault, `/Users/normy/autobyteus_org/autobyteus-agents`, actual Daily Assistant and Classroom Team, and retained disposable raw/rotation/classroom fixtures.

#### Prior Failure Resolution

None. No prior API/E2E result or failure existed. CRR-002 entered this stage with CR-F-001 withdrawn and CR-F-002/003 resolved; API/E2E did not reopen them.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/api-e2e-coverage-investigation.md` — latest investigation, coverage inventory, repository checkpoint, and broader-validation decision.
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/api-e2e-execution-coverage-report.md` — latest executed evidence, confidence, cleanup, and result.
  - This revision record — initial baseline.
- Prior result and confidence: N/A.
- Current result and confidence: `Pass` / **98%**.
- New or remaining failure IDs: none.
- Recommended recipient: `/code_reviewer` for proportional review of the six added/updated durable coverage paths.
- Remaining risks, blocked evidence, or untested scope: provider-hidden/effective instruction, archive Activity navigation, and Electron-shell behavior are approved out of scope; arbitrary retry remains unauthorized because its premise is unreachable. No material blocker remains.
