# Implementation

## Scope Classification

- Classification: `Medium`
- Reasoning: The change spans runtime provider selection, provider removal, schema cleanup, replacement integration coverage, and one architecture doc update, but stays within one subsystem.

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/external-channel-sql-removal/workflow-state.md`
- Investigation notes: `tickets/in-progress/external-channel-sql-removal/investigation-notes.md`
- Requirements: `tickets/in-progress/external-channel-sql-removal/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/in-progress/external-channel-sql-removal/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/in-progress/external-channel-sql-removal/future-state-runtime-call-stack-review.md`
- Proposed design: `tickets/in-progress/external-channel-sql-removal/proposed-design.md`

## Document Status

- Current Status: `Execution Complete`
- Notes: Requirement-gap re-entry is closed. The ticket now includes default-off shared Prisma query logging with explicit opt-in control, plus focused validation and operator docs for that policy.

## Plan Baseline (Freeze Until Replanning)

### Solution Sketch

- Use Cases In Scope: `UC-001`, `UC-002`, `UC-003`
- Spine Inventory In Scope: `DS-001`, `DS-002`, `DS-003`
- Primary Owners / Main Domain Subjects:
  - `provider-proxy-set.ts` owns external-channel persistence resolution
  - file providers own external-channel storage details
- patched `repository_prisma` client factory owns shared Prisma SQL query-log policy
- Requirement Coverage Guarantee: `R-001` and `R-002` map to provider resolution and file-provider execution; `R-004` maps to replacement file integration tests; `R-005` maps to removal of Prisma-backed runtime paths; `R-006` and `R-007` map to the shared Prisma wrapper patch, focused query-log policy tests, and operator docs.
- Target Architecture Shape: external-channel runtime persistence becomes file-only, independent of the global persistence profile, and shared Prisma query logging becomes default-off with an explicit environment-variable opt-in.
- API/Behavior Delta: none at the service boundary; storage backend selection changes internally and shared Prisma query logging becomes env-gated.
- Key Assumptions:
  - historical Prisma migrations can remain even if runtime schema models are removed
  - no out-of-scope subsystem imports the deleted SQL providers
  - the workspace can safely pin a `repository_prisma@1.0.6` patch through `pnpm.patchedDependencies`
- Known Risks:
  - if any build step still expects external-channel Prisma models, type generation or compilation will reveal it
  - if `repository_prisma` is upgraded later, the patch may need to be refreshed against the new published package contents

### Runtime Call Stack Review Gate Summary

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification | Required Re-Entry Path | Round State | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | DS-001,DS-002 | provider proxy | `src/external-channel/providers/provider-proxy-set.ts` | reviewed design | Collapse runtime selection first. |
| 2 | DS-001,DS-002 | external-channel providers | remove `sql-*.ts`, update `prisma/schema.prisma` | 1 | Remove dead implementations and schema surface after selection changes. |
| 3 | DS-001 | file receipt provider tests | add file receipt integration test | 1,2 | Preserve receipt coverage after SQL test removal. |
| 4 | DS-002 | file delivery-event provider tests | add file delivery-event integration test | 1,2 | Preserve delivery-event coverage after SQL test removal. |
| 5 | DS-001,DS-002 | docs | update `docs/ARCHITECTURE.md` | 1,2 | Keep long-lived docs truthful after runtime change. |
| 6 | DS-003 | shared Prisma wrapper | patch `repository_prisma` logging config | reviewed design v2 | Move query-log policy to explicit opt-in at the shared client boundary. |
| 7 | DS-003 | validation/docs | add focused query-log control test and env docs | 6 | Prove default-off behavior and make the switch discoverable. |

### File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action | Verification |
| --- | --- | --- | --- | --- | --- |
| provider selection | `autobyteus-server-ts/src/external-channel/providers/provider-proxy-set.ts` | same | external-channel provider resolution | Keep/Modify | focused integration tests pass |
| SQL receipt provider | `autobyteus-server-ts/src/external-channel/providers/sql-channel-message-receipt-provider.ts` | removed | dead external-channel SQL persistence | Remove | grep shows no source/test references |
| SQL delivery-event provider | `autobyteus-server-ts/src/external-channel/providers/sql-delivery-event-provider.ts` | removed | dead external-channel SQL persistence | Remove | grep shows no source/test references |
| Prisma models | `autobyteus-server-ts/prisma/schema.prisma` | same | schema surface | Modify | Prisma generate passes |
| provider coverage | SQL integration test files | file integration test files | external-channel provider tests | Replace | vitest provider/runtime suite passes |
| architecture note | `autobyteus-server-ts/docs/ARCHITECTURE.md` | same | long-lived docs | Modify | docs reflect file-only truth |
| shared Prisma wrapper patch | workspace package-manager patch metadata + patched `repository_prisma` files | same | shared Prisma client log policy | Modify | focused query-log tests pass |
| query-log docs | `autobyteus-server-ts/.env.example`, `autobyteus-server-ts/README.md` | same | operator docs | Modify | docs describe explicit opt-in env var |

### Implementation Work Table (Primary Tracker)

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action | Depends On | Implementation Status | Unit Test File | Unit Test Status | Integration Test File | Integration Test Status | Stage 8 Review Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | DS-001,DS-002 | provider proxy | file-only external-channel provider resolution | `autobyteus-server-ts/src/external-channel/providers/provider-proxy-set.ts` | same | Modify | reviewed design | Completed | N/A | N/A | runtime/provider tests | Passed | Passed | SQL branch removed |
| C-002 | DS-001,DS-002 | external-channel providers | delete SQL providers and schema models | `autobyteus-server-ts/src/external-channel/providers/sql-*.ts`, `autobyteus-server-ts/prisma/schema.prisma` | same/removed | Remove/Modify | C-001 | Completed | N/A | N/A | provider tests | Passed | Passed | Other Prisma models kept intact |
| C-003 | DS-001 | external-channel test coverage | SQL receipt provider integration test | file receipt provider integration test | Replace | C-001,C-002 | Completed | N/A | N/A | file receipt integration test | Passed | Passed | Lifecycle assertions now run against file provider |
| C-004 | DS-002 | external-channel test coverage | SQL delivery-event integration test | file delivery-event provider integration test | Replace | C-001,C-002 | Completed | N/A | N/A | file delivery-event integration test | Passed | Passed | Callback-event assertions now run against file provider |
| C-005 | DS-001,DS-002 | docs | stale architecture statement | updated architecture statement | Modify | C-001,C-002 | Completed | N/A | N/A | N/A | N/A | Passed | Architecture doc now matches runtime truth |
| C-006 | DS-001 | external-channel route validation | `autobyteus-server-ts/tests/integration/api/rest/channel-ingress.integration.test.ts` | same | Modify | C-001,C-002 | Completed | N/A | N/A | route-level ingress integration test | Passed | Passed | Real agent/team run creation and file-artifact assertions now back Stage 7 |
| C-007 | DS-003 | shared Prisma logging policy | `repository_prisma@1.0.6` patch | workspace patch metadata + patched package files | Patch | reviewed design v2 | Completed | `tests/unit/logging/prisma-query-log-policy.test.ts` | Passed | `tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts` | Passed | Passed | `PRISMA_LOG_QUERIES` now controls whether `query` is added to the shared Prisma client log array |
| C-008 | DS-003 | operator discoverability | `autobyteus-server-ts/.env.example`, `autobyteus-server-ts/docker/.env.example`, `autobyteus-server-ts/README.md` | same | Modify | C-007 | Completed | N/A | N/A | N/A | N/A | Passed | Operator-facing templates and README now document the default-off and opt-in query-log policy |

## Execution Tracking (Update Continuously)

### Kickoff Preconditions Checklist

- Workflow state is current: `Yes`
- `workflow-state.md` showed `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Yes`
- Investigation notes are current: `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes`
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- Future-state runtime call stack review reached `Go Confirmed`: `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- 2026-04-01: Stage 6 baseline created.
- 2026-04-01: Switched external-channel provider resolution to file-only, removed SQL providers, removed Prisma models, added replacement file-provider integration tests, and updated architecture docs.
- 2026-04-01: Re-entered Stage 6 for a Stage 7 validation gap after user requested stronger route-level ingress coverage with real agent/team run creation and persisted file assertions.
- 2026-04-01: Expanded `channel-ingress.integration.test.ts` to drive fake external messages through real agent/team run launchers and verify receipt plus run-history files.
- 2026-04-01: Re-entered Stage 6 for a Requirement Gap after confirming the shared `repository_prisma` client still enables Prisma SQL query logging by default.
- 2026-04-01: Patched `repository_prisma@1.0.6` so SQL query logging is off by default and only enabled when `PRISMA_LOG_QUERIES` is truthy.
- 2026-04-01: Added `tests/unit/logging/prisma-query-log-policy.test.ts`, updated server env/operator docs, and revalidated the focused suite including a SQL-backed repository integration path.

### Downstream Stage Status Pointers

| Stage | Canonical Artifact | Current Status | Last Updated | Notes |
| --- | --- | --- | --- | --- |
| 7 API/E2E + Executable Validation | `tickets/in-progress/external-channel-sql-removal/api-e2e-testing.md` | `Passed` | 2026-04-01 | Combined focused suite covering file-backed external-channel flow and shared Prisma query-log policy passed with 33 tests. |
| 8 Code Review | `tickets/in-progress/external-channel-sql-removal/code-review.md` | `Pass` | 2026-04-01 | Re-review of the patch, tests, and docs found no blocking issues. |
| 9 Docs Sync | `tickets/in-progress/external-channel-sql-removal/docs-sync.md` | `Updated` | 2026-04-01 | Architecture, env templates, and README now reflect file-only external-channel persistence plus opt-in Prisma query logging. |
