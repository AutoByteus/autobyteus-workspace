# Requirements Doc

## Status

`Design-ready — user-approved requirement reset 2026-08-19`

## Goal / Problem Statement

A persisted AgentTeam root can remain active and resumable while every configured member is currently `offline`. That state is supported: member status and root lifecycle describe different subjects. The reported product defect is that Stop may fail to reach terminal state when a member waits for tool approval, leaving the user unable to reach the already established inactive-row Delete action.

Preserve the original deliberate two-step safety workflow. An active TeamRun exposes **Stop**, not Delete. Stop must terminate that exact root and all materialized descendants while retaining its complete history. Only after terminal completion may the row project inactive and expose a separate **Delete** action. Delete must then require permanent-deletion confirmation and remove only the exact inactive history package. Stop and Delete must never be combined into one action, confirmation, or mutation sequence.

## Current And Desired Behavior

| Behavior ID | Current Behavior / Evidence | Desired Behavior | Preserved / Unchanged Behavior | Related IDs |
| --- | --- | --- | --- | --- |
| `BEH-001` | Released `origin/personal` uses mutually exclusive row actions: active roots show Stop; inactive `READY` rows show Archive/Delete. The ticket WIP incorrectly added Delete beside Stop for active rows. | Restore and enforce the original mutual exclusion: active or stop-pending root = Stop only; inactive `READY` history = Archive/Delete. | Root activity, not member `offline`, governs the action transition. | `REQ-001`, `REQ-002`; `AC-001`–`AC-003` |
| `BEH-002` | Released Stop retains history, but approval-pending Stop can hang because quiescence is awaited before interrupting the active turn. | Stop the exact root, interrupt active turns, settle and terminate all descendants, persist terminal state, retain all history, then make Delete available. | Stop remains a non-destructive runtime operation. | `REQ-003`, `REQ-013`–`REQ-016`; `AC-004`, `AC-015`–`AC-019` |
| `BEH-003` | Released Delete is inactive-only and opens the generic permanent-deletion confirmation. The ticket WIP added active-specific combined copy and stop-then-delete composition. | Delete is reachable only for an inactive `READY` row; it opens permanent-deletion confirmation. Stop never opens that modal and never calls Delete. | Permanent deletion remains dangerous, explicit, and separately confirmed. | `REQ-004`, `REQ-006`; `AC-003`, `AC-005`, `AC-007` |
| `BEH-004` | Multiple runs may share a summary; member rows sit near root actions. | Every Stop/Delete/Archive operation remains bound to the clicked root's exact `teamRunId`; members have no destructive history action. | Similar summaries, team expansion, and member focus remain supported. | `REQ-007`, `REQ-008`; `AC-008`, `AC-009` |
| `BEH-005` | Inactive deletion owns exact history/context cleanup. Current catalog ordering and restore concurrency can make an ordinary delete failure lose its visible retry target or race exact-root restore. | Inactive Delete is guarded through completion; complete success removes exact data and failure retains a truthful inactive retry row. | Stop failure retains active history; Delete never runs during Stop. | `REQ-005`, `REQ-009`, `REQ-010`; `AC-006`, `AC-010`, `AC-011` |
| `BEH-006` | A pending approval prevents current quiescence; read-pruning may drop a terminating root; already-admitted async materialization can outlive existing drains. | Close admission, join already-admitted materialization, freeze one exact recursive scope, interrupt/quiesce/terminate it, and release root ownership only at complete terminal success. | Existing AgentRun interruption and provider termination remain authoritative. | `REQ-013`–`REQ-016`; `AC-015`–`AC-019` |

## Investigation Findings

- The screenshot's recent Classroom Simulation entries are distinct exact root IDs, not duplicate identity records.
- An active root with every configured member offline is supported and resumable. New input lazily materializes/restores the addressed member.
- The released UI already embodies the intended two-step safety design: active Stop; inactive Archive/Delete. The missing Delete was a consequence of the root never truthfully finishing Stop, not a reason to expose active Delete.
- The isolated reproduction proved Stop can hang at tool approval because Team termination waits for AgentRun quiescence without first interrupting the pending turn. It also proved a clean restored root can be active while both members are offline.
- The committed ticket WIP correctly strengthens runtime ownership, descendant shutdown, retry, exact restore/delete exclusion, and catalog failure handling, but it also introduces an unapproved independent active Delete and combined stop-then-delete confirmation/sequence. Only that UI workflow portion must be removed.
- The catalog remains the physical-delete owner and must reject any manager-owned exact root. This remains useful even though the UI offers Delete only after inactive projection.

## Relevant Supplemental Task Artifacts

- `ui-ux-spec.md` — user-approved strict Stop-then-later-Delete journey and observable states.
- `runtime-reproduction-evidence.md` — evidence for the pending-approval Stop defect and supported active-root/offline-member state; approval N/A.
- `design-use-case-validation.md` — per-case data-flow proof for the reset design; approval N/A.

## Design Health Assessment

- Change posture: `Bug Fix / Requirement Correction`
- Current design issue signal: `Yes`
- Root cause classification: `Missing Lifecycle Invariant / Boundary Ownership`; the active-Delete WIP is a `Local Product-Workflow Defect` caused by a superseded requirement interpretation.
- Refactor posture: keep the bounded runtime/catalog ownership correction; remove the unapproved active-delete composition rather than add another path.
- Scope impact: no new API, combined command, modal framework, or deletion state machine. The original UI guard is a product safety rule, not obsolete compatibility code.

## Recommendations

- Treat Stop and Delete as two user decisions separated by authoritative terminal state.
- Keep Delete absent while `team.isActive` is true, including active+all-members-offline and stop-pending/failed states.
- Make Stop reliable for pending approvals and all configured/delegated/nested descendants.
- After full terminal completion, let the existing refreshed/history projection render the same row inactive with Archive/Delete.
- Keep catalog exact-ID exclusion/compensation and manager ownership fixes; they protect inactive Delete against restore and storage failure without changing the UX.
- Remove combined active-delete copy, state, tests, and stop-then-delete UI sequencing.

## Scope Classification

`Medium` — the UX target is the original small two-step flow, while truthful Stop still spans root admission, pending-turn interruption, descendant materialization/termination, runtime ownership, persistence stamping, and retry.

## In-Scope Use Cases

- Stop an active TeamRun and retain all history.
- Stop an active TeamRun whose members are all offline.
- Stop while a configured/delegated/nested execution waits for tool approval, without approving/denying or executing the tool.
- After complete Stop, expose a separate inactive-row Delete action and permanently delete only after explicit confirmation.
- Delete an already inactive persisted TeamRun.
- Preserve exact row identity and retry behavior for Stop or Delete failure.

## Out of Scope

- Delete while a TeamRun is active, or any combined stop-and-delete action/API/modal/copy.
- Deleting an individual configured/delegated member.
- Bulk deletion, team-definition deletion, summary deduplication, or workspace removal.
- Changing when a quiescent root remains resumable or when an offline member lazily activates.
- Repairing the separate native conversation-context restoration failure.
- General tool-approval redesign, generic termination framework, generic filesystem transaction/journal, or persisted-data migration.
- Independent Agent run action behavior, active archive, or production-data mutation during automated validation.

## Functional Requirements

- `REQ-001`: An active or stop-pending persisted AgentTeam root must expose its existing Stop action and must not expose permanent Delete or Archive, regardless of member statuses or `deleteLifecycle`.
- `REQ-002`: Root `isActive` and each member status remain independent; member `offline` must never be treated as root terminality or direct-delete authority.
- `REQ-003`: Stop must target the exact root `teamRunId`, terminate the runtime completely, retain the exact catalog row/package/history/context, and never invoke Delete or open permanent-deletion confirmation.
- `REQ-004`: Only an inactive persisted root with `deleteLifecycle === READY` may expose Delete; confirmed Delete removes history without restoring or activating the root.
- `REQ-005`: The low-level history catalog must refuse physical deletion while the exact root is manager-owned and must hold exact-ID exclusion against supported restore/create registration through the complete inactive-delete outcome.
- `REQ-006`: Delete confirmation is inactive-history-only and must truthfully state permanent deletion. Stop must not use, open, or share destructive deletion confirmation. Cancel has no side effect.
- `REQ-007`: Stop, Delete, Archive, cleanup, refresh, and selection changes use exact `teamRunId`, never summary, definition name, member address, or member `agentRunId` as selector.
- `REQ-008`: Member rows remain focus/navigation surfaces and expose no independent Stop/Delete for root history.
- `REQ-009`: Successful inactive Delete disconnects any stale exact stream, removes the exact Team context/history/resume projection, and clears or safely re-homes exact selection without affecting another run.
- `REQ-010`: Stop failure leaves history intact and the exact root manager-owned/nonterminal and retryable; Delete remains unavailable. Inactive Delete failure leaves the exact inactive history visible and retryable. Neither failure may remove or misrepresent another row.
- `REQ-011`: Existing inactive Archive, TeamRun restore/continuation, independent Agent deletion, and unrelated history behavior remain unchanged.
- `REQ-012`: Automated destructive checks use isolated fixtures; production evidence remains read-only.
- `REQ-013`: If Stop begins while any member turn waits for tool approval, shutdown uses the existing AgentRun interruption semantics before quiescence. The pending tool does not execute and no user Approve/Deny is required.
- `REQ-014`: The exact `RootTeamRun` remains one manager-owned nonterminal identity through shutdown success or failure. Reads, repeated Stop, WebSocket activity, or restore may not unregister it early or create a replacement root.
- `REQ-015`: Successful Stop persists `terminatedAt`, projects the root inactive and all members offline, disconnects the exact live Team stream, and retains history directly usable for later restore. Delete becomes available only after this success is authoritative.
- `REQ-016`: After closing admission, Stop joins already-admitted materialization, captures one stable recursive scope, interrupts/quiesces active leaves, and fully terminates every materialized configured AgentRun, delegated AgentRun, configured sub-TeamRun, and delegated/nested TeamRun before terminal root publication.

## Acceptance Criteria

- `AC-001`: Given an active persisted TeamRun with all members offline and no open work, the row shows Stop and does not show Delete/Archive.
- `AC-002`: Given any active or stop-pending TeamRun, no reachable root-row control opens a permanent-deletion confirmation.
- `AC-003`: Given an inactive `READY` TeamRun, the row shows Delete; activating it opens `Delete this Team history permanently? This cannot be undone.`
- `AC-004`: Clicking Stop invokes only termination for the exact `teamRunId`; no delete mutation occurs and the exact history remains visible throughout and after success.
- `AC-005`: Confirming inactive Delete removes the exact stored root without restoring/activating it.
- `AC-006`: A low-level delete attempted while the root is manager-owned—active, terminating, or retained after failed Stop—is rejected with no catalog/package removal.
- `AC-007`: Cancelling inactive Delete confirmation performs no GraphQL mutation, runtime change, local cleanup, or persisted change.
- `AC-008`: With same-summary runs, Stop/Delete affects only the clicked exact root.
- `AC-009`: No member row exposes a whole-history destructive action.
- `AC-010`: A Stop failure leaves the row active/non-delete-ready, history intact, and retry available on the same root instance.
- `AC-011`: Candidate-index failure or package-removal failure during inactive Delete retains/restores a visible inactive retry row and its valid package; a reported successful Delete removes both.
- `AC-012`: A successful Stop retains the exact row/package/context and that history can be selected/restored under existing behavior.
- `AC-013`: Active Stop and inactive Delete are keyboard reachable with distinct accessible names; inactive Delete is not hover-only on touch/narrow surfaces.
- `AC-014`: Durable UI/API coverage asserts the strict state transition `active Stop only -> stop pending -> inactive Archive/Delete`, absence of active Delete/combined copy, exact identity, confirmation cancellation, and error recovery.
- `AC-015`: At pending tool approval, Stop completes without Approve/Deny and the pending tool is never executed.
- `AC-016`: Root lifecycle remains active/terminating and Delete remains absent until all descendants accept termination and the terminal callback completes.
- `AC-017`: Successful pending-approval Stop returns through the original termination request, records `terminatedAt`, projects root inactive/all members offline, disconnects the live stream, and retains history.
- `AC-018`: From the resulting inactive row, a later independent Delete requires its own confirmation and performs only inactive history deletion; relaunch/restore before that Delete remains possible.
- `AC-019`: Configured, delegated, prepared, and nested Agent/Team executions admitted before Stop are included in one stable termination scope; late materialization is rejected, and a failed attempt retries the same scope/objects.

## Constraints / Dependencies

- Reuse existing `terminateAgentTeamRun` and `deleteStoredTeamRun` boundaries; do not add a combined mutation.
- Reuse `AgentRun.interrupt()`; do not encode Approve/Deny in Team shutdown.
- Preserve one root manager and one catalog owner; no duplicate runtime registry.
- Preserve the committed backend lifecycle/catalog safety work unless architecture review finds a new contradiction.
- API/E2E remains paused until this requirement reset passes architecture review and implementation rework passes source review.

## Persisted Data Outcome

- Decision: `Directly Usable — No Migration`.
- Retained TeamRun packages keep their current canonical shape and remain directly selectable/restorable.
- Stop never discards data. Only a separately confirmed inactive Delete discards the exact root package/catalog row.
- Unacceptable loss: any history deletion caused by Stop, any non-target row/package removal, or a reported Delete failure that loses the visible retry target.

## Assumptions

- `teamRunId` remains the exact root identity at every boundary.
- `isActive=false` is published only after accepted terminal completion.
- Deterministic isolated failure injection is sufficient for catalog failure positions; power loss, media corruption, tampering, and compound infrastructure failure remain outside this product ticket.

## Risks / Open Questions

- No open product decision remains. The user explicitly selected strict original workflow B: remove active Delete entirely.
- Implementation rework must avoid reverting the lifecycle, materialization, retry, manager-lane, and catalog-safety fixes merely because the UI active-delete delta is removed.
- Provider-native conversation restoration remains a separate defect and may still affect later restore.

## Requirement-To-Use-Case Coverage

| Use Case | Requirement IDs |
| --- | --- |
| Active/offline Stop only | `REQ-001`–`REQ-003`, `REQ-007`, `REQ-008` |
| Pending approval / whole-tree Stop | `REQ-013`–`REQ-016` |
| Terminal transition and retained history | `REQ-003`, `REQ-010`, `REQ-015` |
| Separate inactive Delete | `REQ-004`–`REQ-010` |
| Existing continuation/archive isolation | `REQ-011`, `REQ-012` |

## Acceptance-Criteria-To-Scenario Intent

| Scenario Intent | Acceptance Criteria |
| --- | --- |
| UI mutual exclusion and explicit two-step journey | `AC-001`–`AC-004`, `AC-013`, `AC-014`, `AC-018` |
| Exact inactive deletion and failure safety | `AC-005`–`AC-012` |
| Pending-approval/full-tree termination | `AC-015`–`AC-019` |

## Approval Status

Approved by the user on 2026-08-19. This reset supersedes the earlier approval for active-row Delete. Authoritative workflow: **Stop only while active; Stop retains history; Delete appears only after full stop; Delete is a later separately confirmed action.**
