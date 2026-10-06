# Solution Design Handoff — task-run-resources-workspace-cleanup

- Result: `Architecture Design Complete`
- Package: `task-run-resources-workspace-cleanup`; current solution revision `SR-006` (revision for ARCH-REV-001)
- From: Solution Designer (`/solution_designer`), 2026-10-06
- Classification: `task_size=Large`, `architectural_risk=High`. The change touches shared wire contracts for the Agent, Agent Team and Agent Org roots, adds a read to the neutral Task port, and spans server and web. No persistence or security change.
- Route: `/architecture_reviewer` (rule: Large or High, with current explicit user approval).

## Original Request And Goal

A Project Task Manager running as the root delegates Tasks. The Task's agent runs appear under it in the left Workspaces tree. When the Manager marks a Task DONE, those runs are stopped but their rows stay forever.

Goal: rows appear when runs start and disappear when their Task is DONE. They must stay hidden after reload and restart, with no data deleted. The Team tab keeps its messages. Behavior is the same for all three root kinds. The user also approved a cleaner delegated-row style.

## Approval Basis

- Requirements: `Approved`, SD-AP-001 (user, 2026-10-06, "yess"), basis SR-003. REQ-001–010, AC-001–011, DEC-001–008.
- Behavior-defining supplement: the Product-owned UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-run-resources-workspace-cleanup/ui-ux-spec.md` (design repo `personal` @ `a38bd6e`, VIS-001–008). The user confirmed the UI on 2026-10-06: "perfect. i like the UI. now i confirm".

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/investigation-notes.md` (architecture evidence AE-01–AE-11)
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/solution-revision-record.md` (SR-001–SR-005)
- Product request context: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/product-design-request.md`
- Product artifacts (externally owned, read-only):
  - `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-run-resources-workspace-cleanup/ui-ux-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-run-resources-workspace-cleanup/product-ticket.md`
  - `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-run-resources-workspace-cleanup/visual-references/`
- Prior review artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/design-review-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/architecture-review-revision-record.md`
  - Both are ARCH-REV-001, reviewed basis SR-005: Fail (Design Impact).

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup`, branch `codex/task-run-resources-workspace-cleanup`.
- Base `origin/personal@5c74fed71` (SR-008 update from `88851166f`); finalization target `origin/personal`.
- WIP backup: `stash@{0}` in this worktree and ref `refs/backup/task-run-resources-workspace-cleanup-wip-2026-10-06` (`6bb56c8d1`).
- Ticket documents are not yet committed.

## Design Summary

- Closure stays owned by the Task side. A new port read, `closedAgentRunsIn(hostRoot)`, returns the closed runs hosted in a given root.
- One shared function, `listClosedTaskExecutions`, keeps the port's closed runs that are present in this root's tree.
- The execution tree DTO is **not** filtered. The contract requires every Team-tab message participant to be in the tree (AE-01).
- A required `closed_task_executions` list is added to every live snapshot and every stored read (Agent and Org views, Team snapshot, Team resume config).
- A live sequenced event (`task_executions_closed` / Team `TASK_EXECUTIONS_CLOSED`) is published by the shared `RootTaskAgentResourceScope` when DONE asks an active root to stop runs, before stopping begins.
- Each web root context keeps its full index and leaves out of the row list every closed node and its subtree.
- Selection falls back to the root run (Agent root) or to the delegating member, else the root default (Team/Org).
- Leaving rows fade and collapse over 200 ms; with reduced motion they are removed at once. Focus moves to the run row and leaving rows get `aria-hidden`.
- REQ-010 restyles the shared row component and aligns the Org collection's own task rows.

## Design Interpretations And Open Risks (for review)

1. **REQ-002 (live removal):** this applies to active, streaming roots. A root that is inactive at DONE hides the closed rows on its next read (REQ-004).
2. **REQ-009 for Team/Org roots:** "return to the Manager" means the delegating member of the outermost closed execution, else the root's default focus.
3. **AE-09 discrepancy:** Org task rows do not use the shared row component, contrary to the Product statement. REQ-010 values are applied directly in the Org collection; consolidation is deferred.
4. **Collapse motion:** `TransitionGroup` also animates rows removed by collapsing a Team.
5. **Damaged Task resource file:** its runs stay listed (existing error surface); `closedAgentRunsIn` never throws.

## Expected Output

An independent architecture review of `design-spec.md` against the approved requirements and the UI/UX spec. On Pass, follow your own handoff rules. Route findings back to `/solution_designer`.

## Route Applied

- `get_handoff_rules` (2026-10-06): the matching rule is "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/architecture_reviewer`.
- `send_message_to` `/architecture_reviewer` → DELIVERED (run `architecture_reviewer_2b0b4454fc5b40efbc43240ae9000ee3`).

## SR-006 Revision (for ARCH-REV-002)

| Finding | Resolution | Design-spec location |
| --- | --- | --- |
| AR-001 | The `agent_org` collaboration-root history item gains `closed_task_executions` (computed by `AgentOrgRunManager.closedTaskExecutionsFor`). `parseAgentOrgHistoryItem` decodes it. `projectAgentOrgHistoryRows` applies the shared predicate for the context and history sources. Team and Agent history paths render no task rows without a context (AE-14). | Production-path map (SP-3), Spine Narratives, Interface mapping, file table, sequence step 3–4, tests |
| AR-002 | Option (a): `projectNavigationRows`/`listNavigationRows()` are unchanged. The Team view exposes `isTaskExecutionRowListed`, and only `buildRunHistoryTeamExecutionRows` filters. A consumer inventory is added. A DONE-time focus fallback lives in the Team view's focus owner. | Interface mapping + "Team navigation-row consumer inventory" |
| AR-003 | Event = released refs ∩ closed ∩ in-tree. Every stored closure read goes through the root-kind manager (`closedTaskExecutionsFor`); `TeamRunHistoryService` uses its existing `this.manager`. | Spine Narratives step 0; Ownership Map |
| AR-004 | Supplement inventory completed in investigation notes. | investigation-notes.md |

Clarification (no intended-behavior change): REQ-009 "a closed run cannot be selected" is realized in the Workspaces tree and main view. Other Team surfaces keep current behavior because they are outside REQ-001's scope.

### Route Applied (SR-006)

- `get_handoff_rules`: revised package Large/High → `/architecture_reviewer`.
- `send_message_to` `/architecture_reviewer` → DELIVERED (run `architecture_reviewer_2b0b4454fc5b40efbc43240ae9000ee3`).

## SR-008 Resume (for architecture re-confirmation)

- The user paused this package (SR-007) to ship the row restyle first. `delegated-row-clean-style` is delivered: merged `24e00db81`, release `1.4.95-beta.3`.
- The user then asked to update the local worktree and continue (2026-10-06).
- Worktree updated to `origin/personal@5c74fed71`. The in-progress implementation was reapplied without conflicts (AE-15).
- Design delta: REQ-010 / AC-011 restyle items removed (they are on the base now). No other design change. The drift check found no impact.
- Classification unchanged: Large/High.
- Prior review: ARCH-REV-002 Pass on SR-006.

### Route Applied (SR-008)

- `get_handoff_rules`: revised package Large/High → `/architecture_reviewer`.
- `send_message_to` `/architecture_reviewer` → DELIVERED (run `architecture_reviewer_2b0b4454fc5b40efbc43240ae9000ee3`).

## SR-009 Revision (for ARCH-REV-004)

| Item | Change | Design-spec location |
| --- | --- | --- |
| AE-16: area contract | Add `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` to scope: `TASK_EXECUTIONS_CLOSED` and the `closed_task_executions` snapshot field. | Final File Responsibility Mapping |
| AE-17: scaling | `TaskAgentResourceService.closedAgentRunsIn` is answered from a per-host-root closed map derived in `swap()`. This removes the O(Orgs × entries) Org history-list cost. Scaling is stated. | Ownership Map; Interface Boundary Mapping; "Before accepting a design" summary; tests |
| R-4 | The evidence pointer now reads AE-01–AE-17. | Architecture Investigation Evidence |

Cause: earlier rounds read `DESIGN.md` only up to about line 150 (truncated output). The full read is recorded as AE-16. The user approved this small revision on 2026-10-06 ("okayy. approved"). Requirements are unchanged.

### Route Applied (SR-009)

- `get_handoff_rules`: revised package Large/High → `/architecture_reviewer`.
- `send_message_to` `/architecture_reviewer` → DELIVERED (run `architecture_reviewer_2b0b4454fc5b40efbc43240ae9000ee3`).
