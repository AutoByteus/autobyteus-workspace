# UI/UX Specification

## Status

`Refined intended-behavior supplement — user-approved reset 2026-08-19`

## UX Goal

Preserve a deliberate two-decision safety workflow. The active TeamRun row gives the user one runtime action—**Stop**—which retains all history. The destructive **Delete** action appears only after the Team is fully inactive, and only Delete opens permanent-deletion confirmation. Member `Offline` presentation never changes which root-level action is safe.

## Related Requirements And Acceptance Criteria

- Requirements: `REQ-001`–`REQ-011`, `REQ-013`–`REQ-016`
- Acceptance criteria: `AC-001`–`AC-019`

## Users / Personas / Contexts

- Desktop Electron user managing many same-Team history runs with similar summaries.
- User abandoning a Team turn that is waiting for tool approval.
- Keyboard user navigating sidebar row actions.
- Touch/narrow viewport user for whom hover-only controls are unavailable.
- User revisiting a root that remains resumable while its configured members are offline.

## User-Journey Inventory

| Journey ID | User / Context | Starting State | User Goal | Completion State | Related IDs |
| --- | --- | --- | --- | --- | --- |
| `UXJ-001` | Active Team; members may all be offline | Active parent row | Stop work but preserve history | Exact root fully inactive; history retained; Archive/Delete now available | `REQ-001`–`REQ-003`, `REQ-013`–`REQ-016`; `AC-001`, `AC-004`, `AC-015`–`AC-019` |
| `UXJ-002` | Inactive Team history | Inactive `READY` parent row | Permanently remove exact history | Confirmation accepted; exact row/package/context removed | `REQ-004`–`REQ-010`; `AC-003`, `AC-005`–`AC-012` |
| `UXJ-003` | Active member waiting for tool approval | Active parent row + approval card | Abandon work without approving/denying | Pending tool not executed; exact Team fully stops; history remains | `REQ-013`–`REQ-016`; `AC-015`–`AC-019` |
| `UXJ-004` | Stop or Delete failure | Active Stop or inactive confirmed Delete | Recover without data loss or ambiguous state | Same exact row remains in truthful retryable state | `REQ-010`; `AC-010`, `AC-011` |
| `UXJ-005` | Same-summary Team runs | Several similar parent rows | Act on one exact run | Only selected `teamRunId` changes | `REQ-007`; `AC-008` |

## Journey Details

### UXJ-001 — Stop Active TeamRun And Retain History

1. The parent row is active, regardless of whether its members show running, idle, error, or offline.
2. The row exposes **Stop** and does not expose Archive or Delete.
3. User clicks Stop. No destructive-deletion modal appears.
4. The exact row enters stop-pending and duplicate Stop is disabled.
5. Server closes admission, stabilizes already-admitted materialization, cancels/interruption-resolves active turns, and terminates all materialized configured/delegated/nested descendants.
6. Until terminal completion, the row remains non-delete-ready.
7. On success, the same exact row remains in history, projects inactive, and exposes Archive and Delete.
8. The user may leave it retained, restore/continue it using existing behavior, archive it, or independently choose Delete later.

### UXJ-002 — Separately Delete Inactive Team History

1. User targets an inactive `READY` parent TeamRun row.
2. Delete opens: **“Delete this Team history permanently? This cannot be undone.”**
3. Cancel closes the modal with no side effect.
4. Confirm disables duplicate Archive/Delete for that exact row.
5. Server deletes only the exact inactive history package/catalog row.
6. On success, exact context/selection/history is removed; another same-summary row remains untouched.

### UXJ-003 — Stop While Approval Is Pending

1. A member tool-approval card is visible.
2. User clicks the parent TeamRun Stop action. Delete is not available.
3. Shutdown owns cancellation; user is not required to click Approve or Deny, and the pending tool never executes.
4. The approval/turn reaches existing interrupted terminal semantics; all captured descendants then terminate.
5. Only after root terminal success does the row become inactive and reveal the later independent Delete action.

### UXJ-004 — Failure Recovery

- Stop failure: the exact history remains present; root remains active/nonterminal and Delete stays absent; show `Failed to terminate team. Please try again.`; retry Stop targets the same root instance.
- Inactive Delete failure: the exact inactive row/package remains visible and Delete is retryable; show `Failed to delete team history. Please try again.`
- No “stopped but delete failed” combined outcome exists because Stop does not call Delete.

### UXJ-005 — Same-Summary Exact Identity

1. User locates one parent row by its current placement/timestamp.
2. Stop or Delete carries its exact `teamRunId`.
3. Only that row enters pending state or disappears; no summary-based substitution occurs.

## Screen / Surface / Component Inventory

| Surface / Component | Purpose | Entry Conditions | Important States | Exit / Next Action |
| --- | --- | --- | --- | --- |
| TeamRun parent row | Whole-run actions/navigation | Persisted row | active Stop-only; stop-pending; inactive Archive/Delete; delete-pending; failure | Stop, select, Archive/Delete when inactive |
| Member row/header | Member focus/status | Team expanded/member selected | idle, running, offline, error | focus/send input; no whole-history destructive action |
| Delete confirmation modal | Informed consent for inactive permanent deletion | Inactive Delete clicked | open, confirm pending, cancel | confirm/cancel |
| Toast/error surface | Result/recovery | Stop/Delete returns | stop failure, delete failure, delete success | retry or continue |

## Interaction And State-Transition Specification

| Scenario / State | User Action Or Trigger | Immediate Feedback | Resulting UI State | Data / Side Effect | Next Available Actions |
| --- | --- | --- | --- | --- | --- |
| Active root, any member status | Stop | Exact Stop disabled/pending | Remains non-delete-ready until terminal | Termination only; history untouched | Wait/retry after failure |
| Active root | Any row inspection/focus | No Delete control exists | Active Stop-only | None | Stop/select |
| Pending tool approval | Stop | Stop pending | Approval interrupted; later inactive retained row | Tool not executed; runtime terminated | Archive/Delete/restore after success |
| Stop success | Lifecycle/history refresh | Activity changes to inactive | Archive/Delete appear | `terminatedAt`; history retained | Leave/restore/archive/delete |
| Stop failure | Server failure | Error toast | Active/non-delete-ready exact row | No history deletion | Retry Stop |
| Inactive `READY` root | Delete | Inactive destructive confirmation | Unchanged until confirm | None | Confirm/cancel |
| Inactive confirmation | Cancel | Modal closes | Inactive row retained | None | Delete/archive/restore |
| Inactive confirmation | Confirm | Exact row delete-pending | Row removed only on success | Exact package/catalog/context removed | Other history |
| Inactive Delete failure | Confirm | Error toast | Inactive row retained | No successful disposal | Retry Delete |
| Same-summary rows | Stop/Delete one | Only target pending | Only target transitions/removes | Exact ID only | Other rows unchanged |

## Markdown Wireframe / Visual Structure

```text
ACTIVE
▼ ● Create a very simple ...   [■ Stop]          2h
    ○ professor   Offline
    ○ student     Offline

STOP-PENDING
▼ ● Create a very simple ...   [■ Stop disabled] 2h
    (no Archive, no Delete)

INACTIVE AFTER COMPLETE STOP
▼ ○ Create a very simple ...   [Archive] [🗑 Delete] 2h
    ○ professor   Offline
    ○ student     Offline

DELETE CONFIRMATION (inactive only)
┌──────────────────────────────────────────────────┐
│ Delete this Team history permanently?            │
│ This cannot be undone.                           │
│                              [Cancel] [Delete]   │
└──────────────────────────────────────────────────┘
```

Forbidden active state:

```text
▼ ● Active Team ... [Stop] [Delete]   <- not allowed
“This Team is active. Stop it and permanently delete ...” <- not allowed
```

## Non-Happy-Path States

### Loading

- Disable duplicate Stop for the exact root while stop is pending.
- Keep Delete absent throughout Stop; do not optimistically project inactive.
- During inactive Delete, disable that row's Archive/Delete and do not remove it before server success.

### Empty

Existing empty-history behavior is unchanged.

### Error And Recovery

- Stop failure keeps the active/non-delete-ready row and exact retained history.
- Delete failure keeps the inactive row and exact valid package.
- Pending flags clear after bounded error; an unanswered approval must not leave Stop permanently pending after server correction.

### Disabled / Unavailable

- Delete/Archive are unavailable while active, stop-pending, or non-`READY`.
- Stop is unavailable when inactive.
- Member rows never gain a root-history Delete action.

### Permission / Authentication

No new permission model.

## Responsive And Platform Behavior

- Desktop: active Stop is visible on the parent row. Inactive Archive/Delete may retain hover/focus styling, but remain keyboard reachable.
- Touch/narrow viewport: inactive Delete must not require hover; active Delete remains absent.
- Electron uses the same Nuxt behavior; no shell-specific interaction is added.

## Accessibility And Keyboard Behavior

- Active accessible action: `Terminate team` (or existing localized Stop label).
- Inactive destructive accessible action: `Delete team history permanently`.
- The actions are mutually exclusive, so assistive technology cannot encounter two conflicting actions on an active row.
- Existing modal focus trap/Escape/Cancel semantics remain; Enter/Space activation targets the focused control only.
- Pending/disabled state does not rely on color alone.

## Content, Labels, And Validation Messages

- Stop accessible label/title: existing `Terminate team`.
- Inactive confirmation: `Delete this Team history permanently? This cannot be undone.`
- Stop failure: `Failed to terminate team. Please try again.`
- Delete failure: `Failed to delete team history. Please try again.`
- Delete success: `Team history deleted permanently.`
- Remove/not render: `This Team is active. Stop it and permanently delete its history? This cannot be undone.`
- Remove/not render: `Failed to stop and delete this Team. Try again.` and `The Team was stopped, but its history could not be deleted. Try Delete again.`

## Data And API Dependencies

- UI state: exact `teamRunId`, root `isActive`, `deleteLifecycle`, exact stop/delete pending maps.
- Stop uses only existing `terminateAgentTeamRun` through the Team store.
- Delete uses only existing `deleteStoredTeamRun` through the history store and is admitted only from an inactive `READY` row.
- Lifecycle/history refresh must make the post-stop action transition authoritative; no local stop-then-delete continuation is retained.

## Out Of Scope

Active Delete, combined stop-delete confirmation or mutation, member deletion, bulk deletion, team-definition deletion, active Archive, new overflow menus, and root/member lifecycle reinterpretation.

## Resolved Design Dependency

No combined server or client command is required. The backend termination fix makes the original two-step UI reachable and truthful. The catalog remains independently guarded because UI visibility is not the security/safety boundary.

## Approval Status

Approved by the user on 2026-08-19. This version supersedes the earlier active-delete supplement. The explicit authoritative rule is: **Stop retains; only the inactive state reveals a separately confirmed Delete.**
