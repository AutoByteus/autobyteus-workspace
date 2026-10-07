# Handoff — Architecture Design Complete — `project-manager-ux` (SR-005 design revision on SR-003 requirements)

- Result: `Architecture Design Complete`; task_size=`Large`; architectural_risk=`High` → independent architecture review
- From: Solution Designer (`/solution_designer`), 2026-10-07

## Original request and goal
The user wanted managing Projects with the Project Task Manager to feel native: see Tasks being created, assigned and finished as agents work, and reach the worker on each Task. After two Product rounds with the user, the approved scope is:
- **Live Projects pages** (list, board, Task page) for agent and UI changes, with a 2.4 s highlight.
- **Task → root line:** the agent or team the Task was handed to, showing the worker's own status as in the left panel (Running / Initializing / Idle / Error / Offline). Plus Couldn't start. DONE → Offline, not openable. After the agent reopens a Task, the root stays Offline until the assigner messages the worker (works with `reactivate-done-task-runs`).
- **Left panel:** state kept across pages (preserved); every row click opens its conversation from any page (F-006 fix).
- **Temp tasks** (Tasks with no Project): a header button with an open count, an Open/Done board with the Done list capped at 10, and a read-only Task page, all live.
- No Manager-specific UI; no automatic status changes.

## Approval basis
- Requirements SR-003 were approved by the user on 2026-10-07: "…other requirements are already clear, clarified. Yes, now you can go ahead now."
- The event design was delegated: "it's up to you how you design this for events".
- The Product UI/UX spec (rounds 1 and 2) is user-confirmed. DEC-006 (worker status replaces "Stopped") is a user-decided deviation.

## Workspace
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux`
- Branch `codex/project-manager-ux`
- Base `origin/personal@7d130309e` (rebased 2026-10-07)
- Finalization target `origin/personal`

## Artifacts (absolute paths)
- Requirements (Approved, SR-003): `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/requirements-doc.md`
- Investigation notes (A1–A14): `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/investigation-notes.md`
- Design spec (Ready): `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/design-spec.md`
- Solution revision record (SR-001..SR-004): `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/solution-revision-record.md`
- Product (external, user-confirmed), in `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/project-manager-ux/`:
  - `ui-ux-spec.md`
  - `visual-references/` (VIS-001..018)
  - `product-ticket.md`
- Prior review artifacts: ARCH-REV-001 (`Fail`, AR-001..004): `design-review-report.md`, `architecture-review-revision-record.md` (this folder)

## SR-005 changes for re-review
- **AR-001:** design-spec "Publication Contract": triggers only mark; flush via `setImmediate` after the dispatch; per-subject serialized, coalesced builds; removal precedence; failures logged; tests for wake → Running and for DONE commit order.
- **AR-002:** openable = `start === "started"` ∧ `!closed` ∧ host run present in the web run-history state; `starting` and deleted-host roots are covered in tests.
- **AR-003:** `load()` swaps don't publish.
- **AR-004:** investigation meta, supplement inventory and revision IDs corrected.
- **Residual:** org navigation reuses `onInspectAgentOrgExecution` / `selectTaskTeam`.

## Points worth review attention (original)
1. Publication ownership: `ProjectChangePublisher` is called from `ProjectService`, `ProjectTaskService` and `TaskAgentResourceService.swap()` after commit. Is that complete (A2/A3)?
2. Worker status: computed by the hosting root through `ActiveRootMessageBoundary.taskExecutionStatus`. Changes are forwarded from the lifecycle's `onAgentStatus`, with the team fold moved into the shared contracts package.
3. Persisted optional `recipientAddress` (Directly Usable; older entries show the kind only; no fallback tree reads).
4. Web event/snapshot ordering (DS-006) and reconnect re-read.
5. Root navigation per host kind (agent / team / org), reusing the left-panel actions.

## Open risks
See the design spec's Risks section: publication volume, a missed write path, races, org navigation.

## Routing record
`get_handoff_rules` (2026-10-07): the Large/High rule → `/architecture_reviewer`.
