# Implementation Revision Record — remote-runs-in-tree (autobyteus-278)

The current code and `implementation-handoff.md` remain authoritative. This record locates the implementation baseline.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, pass (ARCH-REV-002) | N/A | `Initial Baseline` | SR-005, ARCH-REV-002; CRR/API-REV/DR N/A | Implemented at `1046c6beb4`; ready for code review |

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
