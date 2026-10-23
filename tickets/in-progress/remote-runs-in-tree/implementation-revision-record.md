# Implementation Revision Record — remote-runs-in-tree (autobyteus-278)

The current code and `implementation-handoff.md` remain authoritative. This record locates the implementation baseline.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, pass (ARCH-REV-002) | N/A | `Initial Baseline` | SR-005, ARCH-REV-002; CRR/API-REV/DR N/A | Implemented at `1046c6beb4`; ready for code review |
| IR-002 | Code Reviewer, `code-review-report.md`, CRR-001 | F-001 | `Local Fix` | SR-005, ARCH-REV-002, CRR-001; API-REV/DR N/A | Fixed at `1bdcff8ae2`; back to code review (Targeted Delta Review) |

## Revision Entries

### IR-001 — Remote delegated runs in the run tree, initial implementation

- **Triggering role, report path, and round:** Architecture Reviewer, the architecture review passed (ARCH-REV-002) on design `8dc717e39c` (SR-005). Report: `tickets/in-progress/remote-runs-in-tree/design-review-report.md`.
- **Triggering finding IDs:** N/A.
- **Classification:** Initial Baseline.
- **Prior authoritative result:** N/A.
- **Current authoritative result:** the design's change sequence 1–6 is implemented, and implementation-scoped checks pass (IMP-01 … IMP-09).
- **Related revision IDs:**
  - Solution: SR-005.
  - Architecture review: ARCH-REV-002.
  - Code review, API/E2E, delivery: N/A.
- **Why this baseline is recorded:** the first implementation handoff.
- **Approved behavior or requirement IDs affected:**
  - REQ-801 … REQ-808, DS-001 … DS-006;
  - AR-401 … AR-403, N-401 … N-404;
  - UIS / VIS of the UI/UX spec.
- **Implementation delta** (base `1c6614a481` → `1046c6beb4`):
  - `b902770615` contracts: remote task execution DTOs; the views', events' and refresh commands' fields; `dist/` rebuilt.
  - `189b02cb34` server, both sides:
    - B: the run-view routes, `RemoteRunViewProvider`, `PairedAgentAccess` per root kind.
    - A: `RemoteRunObservation`, the port and client calls, `RemoteRunLinks.ownerCommand`, remote child commands, the view and event projectors, the member-projection resolvers.
  - `188dc4b3ae` web: `useRemoteRunsStore`, the remote contexts of the three tree families, the row and the run view per the UI spec, strings (en, zh-CN).
  - `6695820605` web fix found by the rendered check (IMP-09): Retry also reads the selected remote child's conversation again.
  - `53c6624aea` fixes:
    - The Team's stored view (`getTeamRunResumeConfig`) carries the remote runs, so a stopped Team lists them.
    - One Team registry (`teamRemoteRunRegistry`).
    - Retry callbacks answer whether the node is being asked, so "Checking" always settles.
  - `678e81a501` docs: `collaboration_model.md` § 3/4/5, `remote_collaboration.md`, web `agent_execution_architecture.md`.
  - `1046c6beb4`: test fakes.
- **Changed files or areas:** see `implementation-handoff.md` § Key Files Or Areas.
- **Local validation and result:**
  - Server: typecheck, full unit (6538 passed) and integration (421 passed).
  - Contracts: 78 passed.
  - Web: full suite (4777 passed) and guards.
  - Focused remote suites.
  - Rendered check on a test-owned two-node stack (IMP-09).
- **Next recipient or routing:** Code Reviewer (Large/High).
- **Remaining limitations or risks:**
  - Roots without a live stream show remote rows without title or status (FU-002).
  - A remote run's files are not read (FU-001).
  - Team and Org roots were not rendered in the stack: unit coverage only.
  - The two-server E2E and the browser probe belong to API/E2E.

### IR-002 — A Team delegator's remote runs in delegation order (CRR-001 F-001)

- **Triggering role, report path, and round:** Code Reviewer, `tickets/in-progress/remote-runs-in-tree/code-review-report.md`, CRR-001.
- **Triggering finding IDs:** F-001 (Low, Local Fix).
- **Classification:** Local Fix.
- **Prior authoritative result:** IR-001. The Team family listed remote rows after all of the tree's rows (`teamExecutionViewState.ts` `navigationRows`; `teamRemoteExecutions.ts` "after the tree's rows").
- **Current authoritative result:** a Team root's remote runs sit among its root-level delegated copies by `started_at`, as in the standalone and Org families (UI spec line 111: one list in delegation order; REQ-806). The Team's own members, with the copies under them, keep their place first.
- **Related revision IDs:** SR-005, ARCH-REV-002, CRR-001; API-REV and DR: N/A.
- **Why this revision is recorded:** the code review's Local Fix.
- **Approved behavior or requirement IDs affected:** REQ-801, REQ-806; UI spec "one list".
- **Implementation delta (`1bdcff8ae2`):**
  - `teamRemoteExecutions.ts`: `remoteNavigationRows` becomes `teamNavigationRowsWithRemote`. It splits the tree's rows into the leading rows (the root and the members with their copies) and one block per root-level copy (the copy and the rows under it), dated by the root's `task_executions[].started_at`. It then merges the remote runs' blocks into them with the shared `mergeByStartTime`. `remoteRunRows` builds one remote run's rows, unchanged.
  - `teamExecutionViewState.ts` calls it (497 effective lines).
  - The sidebar (`buildRunHistoryTeamExecutionRows`) keeps the navigation order.
- **Changed files or areas:** `autobyteus-web/services/teamExecution/{teamRemoteExecutions,teamExecutionViewState}.ts`, `autobyteus-web/services/teamExecution/__tests__/teamExecutionRemoteRuns.spec.ts`.
- **Local validation and result:**
  - The new spec (`teamExecutionRemoteRuns.spec.ts`) has a remote Team started at 08:00 between two local root-level copies started at 07:00 and 09:00. The remote Team lists between them, with its members below it, and the Team's member row stays first. The spec fails without the fix.
  - Full web suite: 4778 passed (IMP-06). Focused remote specs: 59 passed (IMP-08). Guards pass (IMP-07). Type check: no errors in the touched files.
  - The server is unchanged, so IMP-01…05 still apply.
- **Next recipient or routing:** Code Reviewer (Large/High; Targeted Delta Review).
- **Remaining limitations or risks:** unchanged from IR-001. C-2 (B's own owner stopping the run does not end A's stream) is held by the reviewer for API/E2E.
