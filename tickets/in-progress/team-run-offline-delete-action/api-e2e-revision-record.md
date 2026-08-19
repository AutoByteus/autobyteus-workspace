# API/E2E Revision Record

## Revision Index

| Revision ID | Trigger | Related Revisions | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`, `CRR-002`, round 1 | `SR-003 / ARCH-REV-003 / IR-002 / CRR-002` | N/A | Pass / 97.1% |

## Revision Entries

### API-REV-001 — SR-003 strict Stop-retain and later separate Delete baseline

- Triggering role/report/round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action/code-review-report.md`; round 1.
- Triggering scenarios: mandatory post-`CRR-002` gate; REP-UI-001, REP-SRV-001, DUR-001, DUR-002, LIVE-001..005, LIVE-NESTED-001.
- Related revisions: `SR-003`, `ARCH-REV-003`, `IR-002`, `CRR-002`.
- Rationale: initial completed API/E2E baseline for active/Stop-pending Stop-only behavior, non-destructive Stop with retained history, and later independent confirmed inactive Delete.
- Durable changes:
  - updated `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/autobyteus-server-ts/tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts` to current manager/root/GraphQL/socket/event/address/platform contracts while retaining real mixed-runtime lifecycle/restore proof;
  - updated `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/autobyteus-server-ts/tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts` to the current managed-root API and canonical V1 timestamp authority;
  - no durable scenario/file removed and no production source changed.
- Coverage/execution delta: all `AC-001`–`AC-019` rechecked; current server/UI/server/E2E suites passed; isolated `open_tab` browser/provider/storage journey passed; live three-runtime nested E2E passed; all created fixtures/processes cleaned.

#### Prior Failure Resolution

None. No prior completed API/E2E result existed; paused SR-002 work was not treated as authoritative evidence or failure.

- Canonical artifacts: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, and this record in the ticket directory.
- Prior result/confidence: `N/A`.
- Current result/confidence: `Pass / 97.1%`.
- Remaining failure IDs: none.
- Recommended recipient: `/code_reviewer` for mandatory proportional durable-test review.
- Remaining bounded risks: explicit native-restoration and infrastructure-corruption exclusions, no live narrow-device emulation, and unaffected/uncontrolled Electron shell. No critical AC remains unproven.
