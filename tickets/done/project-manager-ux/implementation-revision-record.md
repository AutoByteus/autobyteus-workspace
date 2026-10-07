# Implementation Revision Record — `project-manager-ux`

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `architecture_reviewer` / `design-review-report.md` / ARCH-REV-002 (Pass) | N/A (AR-001, AR-002 applied as mandatory guidance) | `Initial Baseline` | SR-003, SR-005, ARCH-REV-002 | Implementation complete; routed to Code Review |
| IR-002 | `code_reviewer` / `code-review-report.md` / CRR-002 (Local Fix) | CR-002 (blocking), CR-001; API/E2E F-001 | `Local Fix` | IR-001, CRR-001, CRR-002, API-REV-001 | Literal localization keys; audit passes; routed to Code Review |

## Revision Entries

### IR-001 — Live Projects pages, Task roots with worker status, Temp tasks, F-006

**Trigger and classification**
- Triggering role, report path, and round: `/architecture_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/design-review-report.md`, ARCH-REV-002 (Pass).
- Triggering finding IDs: N/A. Applied guidance:
  - AR-001 Publication Contract (mark-only triggers, `setImmediate` flush, serialized and coalesced builds, removal precedence, failures never fail the write, no publication from `load()`).
  - AR-002 openable rule (started && !closed && host listed).
- Classification: `Initial Baseline`.
- Prior authoritative result: `N/A`.
- Current authoritative result: implementation complete for SR-003/SR-005 (BEH-002..006; REQ-002..004, 007..016; AC-001..023 implementation paths). Local checks pass, except failures that also fail on the base.

**Related revisions**
- Solution: `SR-003`, `SR-005`.
- Architecture review: `ARCH-REV-002`.
- Code review: `N/A`.
- API/E2E: `N/A`.
- Delivery: `N/A`.

**Why this baseline is recorded:** it is the first implementation handoff for the approved package.

**Approved behavior or requirement IDs affected:** BEH-002..006; REQ-002..004, REQ-007..016; QR-003.

**Implementation delta**
- **Server change feed.**
  - `projects/changes/{project-change-messages,project-change-publisher,project-change-hub}.ts`.
  - The `/ws/projects` route.
  - Marks in `ProjectService` and `ProjectTaskService`, and in `TaskAgentResourceService.commit` (swap + listener).
  - Composition binding.
- **Task roots.**
  - Optional `recipientAddress` on assigned entries (reader/writer).
  - `task-root-view-builder.ts`.
  - `root` on Task views and on GraphQL `ProjectTask`.
  - `tasksWithoutProject` (backed by `AdHocTaskStore.list()`).
- **Live worker status.**
  - Boundary `taskExecutionStatus` on 3 roots → lifecycle → 3 adapters (+ `listTaskExecutions` in the 3 indexes).
  - Status forwarding and announce in `RootTaskExecutionLifecycle`.
  - Port `taskExecutionsStatusChanged`.
  - Shared `foldTeamAggregateStatus` in the contracts package (`dist/` rebuilt), also used by the web.
- **Web.**
  - Feed service and composable; store `applyChange` (DS-006 queue/replay, `connected` re-read, highlights).
  - Root line (`ProjectTaskWorkers`, `TaskRootSection`, `presentTaskRoot`) and `useTaskRootNavigation` (agent/team/org).
  - Row restructure (a div with a stretched link).
  - Temp tasks (button, board, page, routes).
  - F-006 in `AgentRunTaskRows`.
  - en/zh-CN copy; regenerated `generated/graphql.ts`.
- **Clarification found by the browser check (A-1).**
  - A `starting` root in an active host reads `initializing` until its run reports its own status; with an inactive host it reads `offline`.
  - The resolver returns `null` for "no active host".
- **Probes and docs.**
  - New browser probe `project-manager-ux-probe.mjs`.
  - Selectors in `projects-feature-probe.mjs` updated for the new row structure: the row is a `div`, and its link is the keyboard target.
  - Server and web Projects docs updated.

**Changed files or areas:** see `implementation-handoff.md` › Key Files Or Areas.

**Local validation and result** (details in the handoff)
- Server:
  - `tsc` is clean and `build` passes.
  - Focused suites: 120/120.
  - Broad suites: 2515 pass; the 11 failures also fail on the base.
- Contracts: the new test passes; the 7 `schema_version` failures happen on the base too.
- Web:
  - 1826 pass; the 3 failures also fail on the base.
  - `vue-tsc`: no errors in changed sources.
- Mutation checks: P-001 synchronous flush, the F-006 guard, and the DS-006 queue.
- Browser probe PMU-001..007: **Pass**.
- Existing Projects probe PT-E2E-001..016:
  - First run: 15/16. PT-E2E-014 focused the row container, which is no longer the focusable element.
  - Rerun after the selector fix: **Pass, 16/16** (`implementation-evidence/ir-001/projects-feature-probe/result.json`).

**Next recipient or routing:** `get_handoff_rules` → Code Review (Large/High).

**Remaining limitations or risks**
- Publication volume: measured 64 messages over 7 journeys; Project counts are recomputed per flush.
- Org-hosted root opening was verified once.
- Reduced motion and zh-CN were not rendered in the browser.
- Codegen incident (one read-only introspection request to an unidentified local server on port 80, from the main checkout). The file was restored; details are in the handoff.

### IR-002 — Literal localization keys (CR-002) and comment placement (CR-001)

**Trigger and classification**
- Triggering role, report path, and round: `/code_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/code-review-report.md`, round 2 (CRR-002, failure-origin review of API/E2E F-001).
- Triggering finding IDs: CR-002 (blocking), CR-001 (non-blocking); F-001 (API-REV-001).
- Classification: `Local Fix`.
- Prior authoritative result: IR-001. `audit:localization-literals` failed with two M-015 findings, which blocked `build:electron*`.
- Current authoritative result: the audit and the boundary guard pass; rendered copy is unchanged.

**Related revisions**
- Solution: `SR-003`, `SR-005`.
- Architecture review: `ARCH-REV-002`.
- Code review: `CRR-001`, `CRR-002`.
- API/E2E: `API-REV-001`.
- Delivery: `N/A`.

**Implementation delta**
- `utils/projects/taskRootPresentation.ts`: `TASK_ROOT_STATE_LABEL_KEYS` and `TASK_ROOT_KIND_LABEL_KEYS`.
- `components/projects/ProjectTaskWorkers.vue`: uses those maps for the status label and the kind fallback. The kind fallback was a runtime key the audit did not flag.
- `components/projects/TempTaskBoard.vue`: `LANE_LABEL_KEYS`.
- `utils/projects/__tests__/taskRootPresentation.spec.ts`: a catalog presence test (en and zh-CN).
- `autobyteus-server-ts/src/projects/services/task-agent-resource-service.ts`: the `forget()` doc comment is back above `forget()`.

**Local validation and result**
- `guard:localization-boundary` passes.
- `audit:localization-literals` passes with zero unresolved findings.
- Projects web specs: 85/85.
- `vue-tsc`: unchanged; no errors in changed files.
- Server `tsc`: clean.
- Evidence: `implementation-evidence/ir-002/localization-checks.log`.

**Next recipient or routing:** `get_handoff_rules` → Code Review (Large/High). Then API/E2E reruns F-001, the desktop journey, the PMU probe and the feed suite.

**Remaining limitations or risks:** `build:electron:mac` was not rerun by implementation. O-1 (an intermittent PMU-002 click) is held by the reviewer and is not attributed.
