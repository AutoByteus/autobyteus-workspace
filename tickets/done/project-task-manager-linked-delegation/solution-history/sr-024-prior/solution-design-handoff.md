# Solution Designer Result — SR-023 Task Runs (data-model redesign), revised after ARCH-REV-009

## Outcome
- Package **project-task-manager-linked-delegation**, Solution Designer, **SR-023**, 2026-10-05.
- **Classification:** Architecture Design Complete — `task_size` **Large**, `architectural_risk` **High**, route **Reviewed**.
- **Trigger:** CRR-026 (`/code_reviewer`, data-model review held with the user), Fail — Design Impact. A design discussion with the user followed.
- **Approval:** REQ-BL-009 **approved by the user (SD-AP-003)**. It replaces REQ-BL-008 where they differ. The user's own words and decisions are recorded in requirements-doc.md:
  - **C-1:** execution trees hold no Task information.
  - **C-2 (amended):** one file per Task, `task_runs/<taskId>.json`, is the only record of a Task's runs.
  - **C-3:** released `projects.json`, no migration.
  - **B-1–B-7:** behavior, with Delete unchanged.
  - **Q-1:** no shutdown state on disk; trust the runtime; retry by setting DONE again; failures logged.
  - **Q-2:** global task list; current assignments `{targetAgentRunId, kind, assignedBy, outcome}`.
  - Q-3: a damaged Task run file never blocks the app (see the revision section above).
- **Prior reviews:** ARCH-REV-005/006/008 covered the superseded lifetime design (archived), not SR-023.

## Revision after ARCH-REV-009 (current)
- **New user decisions, recorded in requirements-doc.md REQ-BL-009:**
  - C-2 amended to **one file per Task**, `<appData>/projects/task_runs/<taskId>.json`;
  - **Q-3:** a damaged file never blocks the app; that Task, plus description-only delegation and unknown copies while the damage lasts, get one clear error up front; fix the file and restart; no self-repair;
  - **N2:** owned workers can't pass a `task_id`.
- **Design corrections:**
  - **AR9-F01:** up-front rejection, `ownerOf` with a damaged set, and the list marker `assignmentsUnavailable`;
  - **AR9-F02a:** preconditions evaluated under the file lock; view swapped on commit;
  - **AR9-F02b:** release follows retained exact authority; `stopped` only when accepted or no authority exists;
  - **AR9-F03:** superseded requirement rows marked. This handoff's earlier claim that the damaged-file policy was in the requirements is now true.
  - **N1** stated; **N3** `ownershipChainFor` named.

## Design summary (authoritative: design-spec.md, rewritten clean for SR-023)
- **TaskRunService** is the sole authority over the per-Task files `task_runs/<taskId>.json`, with an in-memory view loaded at composition.
- **ProjectTaskService** implements the neutral `TaskRunPort`.
- The **runtime is Task-free**: adapters, indexes and trees answer only execution questions.
- **Link before register**, so the root releases exactly the runs the Task names.
- **Per-Task in-process serialization** for assignment linking vs DONE.
- **DONE** = close runs → write status → stop request per host root (logged only).
- **Removed:** the gate, the closure listener, per-admission reads, release reports, cleanup recording, acceptance recording, and the stamp in trees.
- **Carried forward unchanged (archived-spec sections):** DI-001/DI-002 provider ownership, DS-008 public projection, SR-014 business Manager, the single composition binding, and the CRR-024 local fixes.

## Expected next
1. Independent architecture review of SR-023.
2. Implementation, following the design's sequence and verification intent.
3. Code review.
4. API/E2E on a changed build. The IR-012 recheck is paused by the user; it was told to stop.
5. Delivery, including a docs resync: the current uncommitted docs describe lifetimes.

**DR-002 must not finalize HEAD `ccb5fbe3` / IR-012 `4b04d9097`.**

## Workspace / artifacts (absolute)
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation`, branch `codex/project-task-manager-linked-delegation`, HEAD `4b04d9097`, base/finalization origin/personal. The Designer made no source, test or Git change.
- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/requirements-doc.md`
- Data model: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/data-model-draft.md`
- Design: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/design-spec.md`
- Investigation (E-084–E-093 this round): `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/investigation-notes.md`
- Revision index (SR-023 entries): `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/solution-revision-record.md`
- Archived prior design (carried-forward sections): `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/solution-history/sr-023-prior/design-spec.sr-022a-final.md`
- Trigger review (externally owned): `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/code-review-report.md` (CRR-026)

## Open risks
- A damaged Task run file: scoped up-front errors per Q-3 (accepted by the user).
- The single-writer-process assumption.
- Per-Task files accumulate for Tasks ever run (each stops growing at DONE); pruning is a later option.
- `isOpen` check discipline after awaits in dispatch.

## Routing
Initial SR-023 routing receipt below. Re-review routing after ARCH-REV-009 is recorded at the end.

### SR-023 routing / confirmed handoff
Only the Large/High "ready for independent architecture review" rule matches (requirements explicitly approved, SD-AP-003); the direct-implementation and Delivery receipt-gap rules do not apply. `send_message_to` → `/architecture_reviewer` confirmed accepted=true / DELIVERED (run `architecture_reviewer_600715b440b947e3810057bdf0971a3e`). No other recipient. Solution Designer stops.

### SR-023 re-review routing (after ARCH-REV-009) / confirmed handoff
Only the Large/High architecture-review rule matches (requirements and new decisions explicitly approved by the user). `send_message_to` → `/architecture_reviewer` confirmed accepted=true / DELIVERED (run `architecture_reviewer_600715b440b947e3810057bdf0971a3e`). No other recipient. Solution Designer stops.
