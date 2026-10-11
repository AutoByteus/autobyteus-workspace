# Architecture Review Revision Record

The latest `design-review-report.md` is authoritative. This record keeps the review history.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / initial review request from `/software_engineering_team/solution_designer` | SR-001, SR-002 | N/A | Fail (Design Impact) | AR-001, AR-002, AR-003, AR-004 |
| ARCH-REV-002 | Round 2 / re-review of SR-003 | SR-003 | Fail | Pass | AR-001, AR-002, AR-003, AR-004 (resolved) |

## Revision Entries

### ARCH-REV-001 — Initial baseline: structurally sound; Project-deletion liveness gap

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator/tickets/in-progress/delegated-copy-task-locator/design-review-report.md`
- Review round and trigger: round 1. The trigger was `handoff-architecture-design-complete.md` from `/software_engineering_team/solution_designer` (Large / High).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` (SR-002); no prior findings.
- Relevant solution revision IDs: `SR-001`, `SR-002`
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`, classified `Design Impact`.
- Baseline established:
  - **Confirmed.** The behavior basis (BEH-001..009); the Large/High classification; the spines DS-001..005; the boundaries; the dependency rules; the interfaces; the `Not Affected` persisted-data decision; the change sequence.
  - **Verified against code.** The server index rule; the feed publication; feed retention and rebind; the shell's inject scope and mount sites; the board filters; `onSelectTeam` toggling.
  - **Found.** A Project delete keeps agent run resources and publishes only `project_removed` (P-001). The design's server read and DS-003 don't handle it.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - AR-001 (Medium, blocking): handle a missing Project in the server read without failing the batch; invalidate on `project_removed`.
  - AR-002 (Low): the Agent host's REQ-012 open should use the run-row open path.
  - AR-003 (Low): leftover "three hosts".
  - AR-004 (Low): remove the `drop` branch or justify it; the board decides only after its own mount read settles.
- Material classification changes: none.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - RSK-001, the overlapping branch.
  - Per-key response ordering in `taskWorkerTaskStore` (recommendation).
  - The DS-004 expiry when a run fails to open.
  - Drawer and scroll timing.

### ARCH-REV-002 — Re-review of SR-003: all findings resolved, Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator/tickets/in-progress/delegated-copy-task-locator/design-review-report.md`
- Review round and trigger: round 2. The trigger was `handoff-design-revision-sr-003.md` from `/software_engineering_team/solution_designer`.
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` (SR-003); AR-001..AR-004.
- Relevant solution revision IDs: `SR-003` (requirements unchanged, Approved at SR-002)
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed:
  - Each finding was verified in the current `design-spec.md` and against the code.
  - The behavior basis is reconfirmed; every row is `Confirmed`.
  - No new findings.
  - The per-key read-epoch recommendation was adopted.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Medium, blocking) | Resolved | SR-003 | Server side: Interface row `currentTasksOfTaskWorkers` goes through `readTaskChangeView`, which maps `PROJECT_NOT_FOUND` / a missing Task to null (verified at `project-task-service.ts:193-202`), and isolates each worker. Client side: DS-003 and the Bounded Local spine invalidate on `project_removed` by cached `projectId`. Also present: the "Project deleted" example and the server and client tests in sequence step 1 and the test guidance. |
| AR-002 | Open (Low) | Resolved | SR-003 | The file mapping gives `AgentRunTaskRows` a new `open-run` emit. The Section wires it to `selectAgentRun(run)`, the run row's path (verified at `WorkspaceHistoryWorkspaceSection.vue:405-408`). A test is listed. |
| AR-003 | Open (Low) | Resolved | SR-003 | The file mapping says "Shared by the Agent and Team hosts", and Applied Patterns restates the reason. The remaining "three" mentions refer to subsystems and stream contracts, which is correct. |
| AR-004 | Open (Low) | Resolved | SR-003 | `drop` is removed from DS-005, the chain and the API. Boards wait for a settled list (no read in flight). An absent Task leads to expiry. The test guidance covers it. |

- New or remaining finding IDs: none.
- Material classification changes: none (Large / High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`. Informational pass notice to `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty:
  - RSK-001 and its landing order.
  - Board watcher ordering relative to the mount read, and the flag semantics during a `connected` re-read (implementation note).
  - The DS-004 expiry when a run fails to open.
  - Drawer and scroll timing.
