# UI/UX Specification

## Status

`Approved requirements supplement — user approved 2026-08-19`

## UX Goal

Make permanent deletion of a persisted AgentTeam run understandable and directly reachable from its parent TeamRun row, even when the root is active but the focused member says `Offline`. Preserve a separate stop-only choice, make destructive consequences explicit before any mutation, and ensure either stop path completes when a member is waiting for tool approval instead of leaving the row indefinitely pending.

## Related Requirements And Acceptance Criteria

- Requirements: `REQ-001`, `REQ-002`, `REQ-003`, `REQ-006`–`REQ-011`, `REQ-013`–`REQ-016`
- Acceptance criteria: `AC-001`–`AC-019`

## Users / Personas / Contexts

- Desktop Electron user managing many same-team history runs with similar summaries.
- Keyboard user navigating sidebar row actions.
- Touch/narrow viewport user for whom hover-only controls are unavailable.
- User revisiting a TeamRun whose root remains resumable while configured members are currently offline.

## User-Journey Inventory

| Journey ID | User / Context | Starting State | User Goal | Completion State | Related IDs |
| --- | --- | --- | --- | --- | --- |
| `UXJ-001` | User; active/quiescent Team, offline members, including after member activation/restore failure | Persisted parent row has active root dot; focused member header says Offline | Permanently remove this exact TeamRun | Confirmed root is stopped and exact history disappears | `REQ-001`–`REQ-003`, `REQ-006`, `REQ-009`; `AC-001`, `AC-002`, `AC-004` |
| `UXJ-002` | User; inactive Team history | Persisted parent row is inactive | Permanently remove exact history | Exact history disappears without runtime activation | `REQ-004`, `REQ-006`, `REQ-009`; `AC-003`, `AC-005` |
| `UXJ-003` | User; active Team they want to retain | Active parent row | Stop future work but retain history | Every active descendant stops; the root then becomes inactive and history delete/archive actions become available | `REQ-011`, `REQ-016`; `AC-012`, `AC-019` |
| `UXJ-004` | User; operation failure | Delete was confirmed | Recover without ambiguity/data loss | Row remains with truthful active/inactive state and retry path | `REQ-010`; `AC-010`, `AC-011` |
| `UXJ-005` | User; member is waiting for tool approval | Active parent row; approval card is pending | Stop and retain, or stop and delete, without first approving/denying the tool | Pending tool is not executed; every active descendant and then the exact root stop; history is retained or deleted according to the chosen action | `REQ-013`–`REQ-016`; `AC-015`–`AC-019` |

## Journey Details

### UXJ-001 — Delete Active TeamRun

1. User targets the parent TeamRun row, not a member row.
2. Row exposes both the existing stop-only action and a permanent-delete action; member `Offline` does not suppress either root-level choice.
3. Delete opens a destructive confirmation: **“This Team is active. Stop it and permanently delete its history? This cannot be undone.”**
4. Cancel closes the modal and changes nothing.
5. Confirm disables duplicate actions and shows pending state on that exact row/modal.
6. System terminates the exact root, interrupting/cancelling any pending approval turn without executing its tool, then permanently deletes its exact stored history.
7. On success the exact row/context/stream disappears; another same-summary row is never selected by substitution.

### UXJ-002 — Delete Inactive TeamRun

1. User targets an inactive parent TeamRun row.
2. Delete opens: **“Delete this Team history permanently? This cannot be undone.”**
3. Confirm deletes exact history without restoring or activating it.

### UXJ-003 — Stop Only

1. User chooses the existing stop square/action.
2. The exact root closes new admission. Shutdown cancels/interruption-resolves every active leaf turn, including pending tool approval, without asking the user to decide or executing the tool.
3. Shutdown waits for every configured, delegated, and nested execution to stop fully. The root remains stop-pending and is not delete-ready before that point.
4. Only after complete descendant shutdown does the parent row become inactive; archive and permanent delete are then available.

### UXJ-004 — Failures

- Stop failure: keep the row present and non-delete-ready, retain history, and show “Failed to stop and delete this Team. Try again.” The exact root remains manager-owned for retry; admission may remain closed.
- Stop succeeds but delete fails: show inactive presentation and retain history; show “The Team was stopped, but its history could not be deleted. Try Delete again.”
- Delete retry on inactive row performs only storage deletion.

### UXJ-005 — Stop While Approval Is Pending

1. A tool approval card is visible for a Team member and the user chooses either Stop or confirmed active Delete.
2. The exact row/action enters one pending state; duplicate stop/delete actions are disabled.
3. Shutdown owns cancellation. The user is not required to click Approve or Deny, and the pending tool never executes.
4. The approval/active-turn presentation resolves with the existing interrupted/cancelled terminal semantics.
5. Stop-only leaves an inactive retained row. Active Delete continues to exact package deletion only after termination success.
6. The row must not remain indefinitely pending merely because the approval was unanswered.
7. The row must not project inactive or expose the post-stop delete-ready state until every active configured/delegated/nested execution has terminated successfully.

## Screen / Surface / Component Inventory

| Surface / Component | Purpose | Entry Conditions | Important States | Exit / Next Action |
| --- | --- | --- | --- | --- |
| TeamRun parent row | Exact whole-run navigation/actions | Persisted history row | active, inactive, stop-pending, delete-pending, failure | select, stop, archive inactive, delete |
| Member row/header | Focused member presentation | TeamRun expanded/member selected | idle, running, offline, error | focus/send input; no permanent delete |
| Destructive confirmation modal | Obtain informed consent | Delete invoked | active copy, inactive copy, pending, cancel | confirm/cancel |
| Toast/error presentation | Explain result/recovery | Operation completes/fails | stop failure, partial failure, delete failure, success | retry or continue |

## Interaction And State-Transition Specification

| Scenario / State | User Action Or Trigger | Immediate Feedback | Resulting UI State | Data / Side Effect | Next Available Actions |
| --- | --- | --- | --- | --- | --- |
| Active root; members offline or live | Delete | Active-specific confirm | No change until confirm | None | Confirm/cancel |
| Active confirmation | Confirm | Exact row/action pending | Stop then delete | Runtime terminates; exact package/catalog removed | Other history |
| Active confirmation | Cancel | Modal closes | Unchanged active row | None | Stop, delete, select |
| Inactive root | Delete + confirm | Inactive-specific confirm/pending | Exact row removed | Exact package/catalog removed | Other history |
| Stop-only | Stop | Stop pending until all descendants terminate | Inactive retained row only after root terminal completion | Every active configured/delegated/nested execution terminates; history retained | Archive/delete/restore |
| Tool approval pending | Stop | Exact row stop pending; duplicate decisions disabled | Interrupted/cancelled approval and inactive retained row | Pending tool is not executed; exact runtime terminates | Archive/delete/restore |
| Tool approval pending | Delete + confirm | Exact row delete pending | Interrupted/cancelled approval, then exact row removed | Pending tool is not executed; exact runtime terminates; exact history deletes | Other history |
| Termination failure | Confirm delete | Error toast | Active retained row | No storage deletion | Retry/stop/select |
| Deletion failure after stop | Confirm delete | Partial-failure toast | Inactive retained row | Runtime stopped; history retained | Retry delete |
| Same-summary rows | Delete one | Target row pending | Only target removed | Exact ID only | Other same-summary rows remain |

## Markdown Wireframe / Visual Structure

```text
▼ ● Create a very simple ...   [■ Stop] [🗑 Delete]  2h   <- parent TeamRun row
    ○ professor                                         <- member row; Offline is member state
    ○ student

Active delete confirmation:
┌──────────────────────────────────────────────────────────┐
│ This Team is active. Stop it and permanently delete its │
│ history? This cannot be undone.                         │
│                                     [Cancel] [Delete]   │
└──────────────────────────────────────────────────────────┘
```

The exact icon system may remain the current Heroicons implementation. The behavior does not require a new menu system.

## Non-Happy-Path States

### Loading

- Disable repeat stop/delete/archive actions for the exact row.
- Do not optimistically remove the row before server success.
- A pending tool-approval card must not require separate user action for Team shutdown to finish.

### Empty

- Existing empty-history behavior remains unchanged.

### Error And Recovery

- Distinguish no-stop from stopped-but-not-deleted outcomes.
- Refresh authoritative history after partial failure so the row changes from active to inactive when termination committed.
- Clear pending state after a bounded server failure; never leave the action permanently disabled because an approval was unanswered.

### Disabled / Unavailable

- Draft/CLEANUP_PENDING semantics remain governed by their existing lifecycle and are not converted into stored active delete.
- Archive remains unavailable while active.

### Permission / Authentication

- No new permission model is introduced.

## Responsive And Platform Behavior

- Desktop: delete is discoverable on the parent TeamRun row without requiring the user to stop first. Active-row delete should not be hidden behind the member row.
- Keyboard: row actions participate in tab order; focus-within reveals hover-styled controls; Enter/Space activates them.
- Touch/narrow viewport: delete is present without a hover prerequisite.

## Accessibility And Keyboard Behavior

- Delete action accessible name: `Delete team history permanently`.
- Stop action accessible name remains distinct: `Terminate team` / `Stop team`.
- Confirmation focus is trapped by the existing modal; Escape/Cancel produces no mutation.
- Pending state uses disabled semantics and does not rely on color alone.

## Content, Labels, And Validation Messages

- Active confirmation: `This Team is active. Stop it and permanently delete its history? This cannot be undone.`
- Inactive confirmation: `Delete this Team history permanently? This cannot be undone.`
- Success: `Team history deleted permanently.`
- Stop failure: `Failed to stop and delete this Team. Try again.`
- Partial failure: `The Team was stopped, but its history could not be deleted. Try Delete again.`
- Do not call member `Offline` equivalent to Team stopped/terminated.

## Data And API Dependencies

- Exact `teamRunId`, root `isActive`, and `deleteLifecycle` from the Team history row.
- Authoritative stop-if-active + delete result must distinguish total failure from post-stop delete failure.
- Successful cleanup must close exact stream/context/selection state.

## Out Of Scope

- Member deletion, bulk deletion, team-definition deletion, active archive, new overflow menu, or changing root/member lifecycle semantics.

## Resolved Design Dependency

- The design reuses the existing stop mutation and the existing guarded history-delete mutation. The current UI mutation owner observes their two ordered results to distinguish total stop failure from stop-success/delete-failure; no new combined server API is required.

## Approval Status

Approved by the user on 2026-08-19 together with `requirements.md`, including the explicit descendant-first shutdown and post-terminal delete-ready behavior.
