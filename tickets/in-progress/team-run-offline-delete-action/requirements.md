# Requirements Doc

## Status

`Design-ready — user approved 2026-08-19`

## Goal / Problem Statement

A persisted AgentTeam history run can remain an active, resumable root execution while every configured member is currently `offline`. The history UI treats root activity as a reason to replace the permanent-delete action with a small stop action, while the selected member header says `Offline`. This makes an exact, safely deletable TeamRun appear undeletable. The user's exact sequence exposed a deeper bounded defect: if an active member is waiting for tool approval, TeamRun shutdown waits for that turn to become quiescent instead of cancelling/interruption-resolving it, so the stop mutation can hang while lifecycle visibility has already changed.

Provide a discoverable whole-TeamRun delete action for persisted AgentTeam history regardless of whether the root is active. Deleting an active root must explicitly warn the user, reliably stop that exact root—including cancelling a pending tool-approval turn without executing the tool—then permanently delete only its history package. The existing stop-only action must use the same reliable termination contract. Member status must remain presentation data rather than deletion authority.

## Current And Desired Behavior

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| `BEH-001` | An active TeamRun row renders only `Terminate team`; archive and permanent delete are suppressed. A configured member may simultaneously render `Offline`, so the governing root state is not apparent from the focused-member surface. | The TeamRun row exposes a discoverable permanent-delete action for a persisted `READY` history record whether the root is active or inactive. Active-root copy makes the stop-before-delete consequence explicit. | Root activity remains authoritative; member `offline` does not mean the root has terminated. The existing stop-only action remains available. | `REQ-001`, `REQ-002`, `AC-001`, `AC-002`, `AC-003` |
| `BEH-002` | `deleteStoredTeamRun` rejects active roots and requires a separate prior termination. | One confirmed delete request for an active persisted TeamRun terminates the exact root, then deletes its exact catalog row and TeamRun state package. An inactive root deletes directly. | The catalog/storage owner still refuses to remove an actually active package; termination must complete before physical deletion. | `REQ-003`, `REQ-004`, `REQ-005`, `AC-004`, `AC-005`, `AC-006` |
| `BEH-003` | The delete confirmation uses generic history copy and does not distinguish an active TeamRun from an inactive history record. | Confirmation copy distinguishes `delete inactive history` from `stop active Team and permanently delete history`; cancel performs no mutation. | Permanent deletion remains destructive and confirmed. | `REQ-006`, `AC-002`, `AC-003`, `AC-007` |
| `BEH-004` | Several runs can share the same summary, while actions are visually near member rows. | Every stop/delete/archive request remains bound to the selected row's exact `teamRunId`; no member row gains an independently destructive action. | Similar summaries, team expansion, member focus, and member selection remain supported. | `REQ-007`, `REQ-008`, `AC-008`, `AC-009` |
| `BEH-005` | Successful inactive deletion removes history state, but the active-delete path does not exist and therefore has no complete client cleanup contract. | Successful active or inactive deletion disconnects any exact Team stream, removes the exact Team context/history row/resume state, and clears or safely moves an exact selection. Partial failure leaves a truthful retryable state. | Unrelated TeamRuns, independent Agent runs, team definitions, workspaces, and similarly titled history remain unchanged. | `REQ-009`, `REQ-010`, `AC-010`, `AC-011`, `AC-012` |
| `BEH-006` | If a Team member is waiting for tool approval, root termination closes admission and then waits for the active AgentRun to quiesce. The pending approval prevents quiescence. Meanwhile, manager lookup may unregister the `terminating` root because `root.isActive()` is already false. The stop mutation can remain pending indefinitely and later operations can no longer resolve the same in-flight root consistently. | Stop and active-delete interrupt/cancel every active member turn, wait for interruption/quiescence settlement, fully terminate every active configured, delegated, and nested execution, retain one manager-owned root throughout, and only then stamp/unregister the root and return success. The pending tool never executes. | Normal idle/running termination, explicit user approval/denial outside shutdown, and provider runtime behavior remain unchanged. | `REQ-013`–`REQ-016`, `AC-015`–`AC-019` |

## Investigation Findings

- The screenshot's three newest Classroom Simulation runs were not duplicates at the identity layer. They have distinct exact root IDs.
- Read-only GraphQL inspection showed all three roots active at first. Two had both `/professor` and `/student` offline. Read-only execution checkpoints for those two returned `hasOpenExecutionWork: false`; they were active and quiescent, not terminated.
- The production server log identifies how those two exact roots entered that state. A message reopened/used each registered root, then focused-member activation failed with `TeamAgentActivationError: The prior native conversation context could not be restored.` The configured professor therefore had no active AgentRun; the student had not been activated; both projected `offline`. The root stayed registered to preserve retry admission, so it continued to project `isActive: true` with no open work.
- A user-approved isolated runtime experiment reproduced the preceding shutdown sequence with the same member runtimes, models, and `autoExecuteTools=false`. At `TOOL_APPROVAL_REQUESTED`, the root checkpoint had open work. `terminateAgentTeamRun` changed the Team lifecycle projection to inactive but did not return within 60 seconds. Only an explicit denial performed for fixture cleanup let the turn settle and termination finish. Code tracing confirms termination waits for AgentRun quiescence without first interrupting the pending-approval turn, and manager lookup can unregister a `terminating` root before teardown finishes.
- A clean restore control then reported `root active + professor offline + student offline` immediately, and a new message successfully lazily restored the professor and completed. This proves the state itself is supported; the defects are the stuck shutdown and, for the two original roots, their separately observed native-conversation restore failure.
- A later read-only observation showed the newest root had become inactive with `terminatedAt: 2026-08-18T20:24:51.266Z`, while the other two remained active/quiescent. This matches the existing two-step UI: the small square is the stop action; permanent delete appears only after the root becomes inactive and only on row hover/focus at desktop widths.
- Server behavior intentionally permits an active root with offline members. `RootTeamRun` can accept future input, and `MixedAgentMemberHandle.ensureReady()` lazily activates/restores the addressed member when a new message arrives.
- The frontend and server currently agree on the two-step restriction: the component and mutation composable suppress active delete, and the catalog rejects deletion while `AgentTeamRunManager` still owns the root.
- The two-step UI restriction already existed at the earlier `origin/personal` merge base and remains unchanged after universal task delegation was promoted into current `origin/personal`. The promoted TeamRun lifecycle makes the confusing active-root/offline-member state easy to encounter; this is a product UX/coordination gap rather than a duplicate-title lookup defect.

## Relevant Supplemental Task Artifacts

- `ui-ux-spec.md` — approved TeamRun-row action states, confirmation copy, descendant-first stop presentation, and failure recovery.
- `runtime-reproduction-evidence.md` — user-approved isolated runtime evidence for pending-approval stop and clean restore; evidence only, approval N/A.
- `design-use-case-validation.md` — static per-case data-flow-spine proof of the approved stop/delete design; design evidence only, approval N/A.

## Design Health Assessment

- Change posture: `Bug Fix / Behavior Change`
- Current design issue signal: `Yes`
- Root cause classification: `Missing Lifecycle Invariant / Boundary Ownership`, plus duplicated delete-policy coordination
- Refactor posture: `Small bounded ownership correction required`
- Evidence basis: deletion policy is split across the component, composable, and catalog. More importantly, root/member termination assumes active input will quiesce by itself, which is false for a pending tool approval, and manager membership is coupled to `root.isActive()` even during an in-flight termination promise.
- Requirement or scope impact: keep the change bounded to TeamRun stop/active-delete termination and its row-level UX. Correct pending-approval shutdown and in-flight root ownership; do not redesign general member lifecycle, tool approval, or independent-agent deletion.

## Recommendations

- Keep the existing stop-only action for users who want to stop but retain history.
- Make permanent delete available at the TeamRun row for both active and inactive persisted rows.
- Let the existing frontend history-mutation owner coordinate one confirmed active-delete action as `terminate exact root -> delete exact history`; keep the server lifecycle boundary and low-level catalog guard authoritative for each step.
- Reuse the existing AgentRun interrupt contract to settle a pending approval/active turn before waiting for quiescence. Do not invent a second approval-cancellation protocol.
- Keep the exact root manager-owned throughout in-flight termination so retries, lifecycle projection, and WebSocket commands cannot accidentally restore a second root while the first still tears down.
- Use dynamic confirmation copy and exact identity throughout.
- Validate the active-root/all-members-offline/quiescent state explicitly because that is the observed production case.

## Scope Classification

`Medium` — the visible change is small, but safe active deletion crosses destructive UI confirmation, exact root lifecycle termination, persistent TeamRun package deletion, stream/context cleanup, and failure-state truthfulness.

## In-Scope Use Cases

- Permanently delete an inactive persisted AgentTeam history run.
- Permanently delete an active persisted AgentTeam history run after explicit confirmation that the Team will first be stopped.
- Handle the observed active-root/all-members-offline/no-open-work state without treating member status as root lifecycle.
- Stop or active-delete a TeamRun while its focused member is waiting for tool approval, without requiring the user to decide that approval and without executing the pending tool.
- Keep stop-only behavior available without deleting history.
- Preserve exact row identity when multiple runs share the same summary.
- Keep the row and its data available for retry when deletion cannot complete.

## Out of Scope

- Deleting an individual configured or delegated member independently of its root TeamRun.
- Bulk history cleanup, team-definition deletion, summary deduplication, or workspace removal.
- Changing when a quiescent TeamRun remains resumable or when an offline member is lazily activated.
- Repairing the separate native conversation-context restoration failure that produced the two observed failed member activations.
- Redesigning general tool-approval UX/protocols or adding a new generic termination framework.
- Changing independent Agent run action behavior.
- Archive-while-active behavior.
- A filesystem transaction/journal or migration for existing TeamRun packages.
- Deleting or mutating the user's production data during investigation or automated validation.

## Functional Requirements

- `REQ-001`: A persisted AgentTeam history row with `deleteLifecycle === READY` must expose a permanent-delete action independent of root `isActive` and member statuses.
- `REQ-002`: The UI must continue to represent root activity independently from each member's runtime status; `offline` must never be used as evidence that the root is safe to delete directly.
- `REQ-003`: Confirmed deletion of an active root must terminate the exact `teamRunId` before deleting stored history.
- `REQ-004`: Confirmed deletion of an inactive root must delete stored history without attempting to restore or activate the root.
- `REQ-005`: The low-level history catalog must continue to refuse physical package deletion while the exact root is manager-owned and has not reached terminal completion, including an in-flight or failed-but-retryable termination.
- `REQ-006`: Active and inactive deletion confirmations must use distinct, truthful destructive copy. Cancel must have no runtime or persisted side effect.
- `REQ-007`: All delete, terminate, cleanup, and refresh steps must use the exact root `teamRunId`, never summary, display name, focused member address, or member `agentRunId` as the deletion selector.
- `REQ-008`: Member rows must remain focus/navigation surfaces and must not expose an independent permanent-delete action.
- `REQ-009`: On successful deletion, the client must disconnect any exact Team stream, remove the exact Team context/history/resume projection, and clear or safely re-home selection without affecting another run.
- `REQ-010`: If termination fails, history must remain unchanged, the root must not be presented as stopped or delete-ready, and the same exact managed root must remain retryable. If termination succeeds but storage deletion fails, the root must remain truthfully inactive, its history must remain visible, and delete must be retryable without re-termination.
- `REQ-011`: Existing stop-only, archive-inactive, TeamRun continuation, independent Agent deletion, and unrelated history behavior must remain unchanged.
- `REQ-012`: Automated destructive tests must use isolated fixtures; production evidence remains read-only.
- `REQ-013`: If stop or active-delete begins while any member turn is waiting for tool approval, TeamRun termination must use the existing interrupt/cancellation semantics to settle that turn before waiting for quiescence. The pending tool must not execute, and no further user approval or denial may be required for shutdown to complete.
- `REQ-014`: The exact `RootTeamRun` must remain under one manager-owned in-flight termination identity until teardown succeeds or fails. A projection read, repeated stop, WebSocket activity, or restore request must not unregister it early, create a second restored root, or address a different root instance.
- `REQ-015`: Successful stop from a pending-approval state must finish the same public termination mutation, persist `terminatedAt`, project the root inactive and all members offline, disconnect the exact Team stream, and leave retained history usable for later restore. Active-delete may proceed to physical deletion only after that success.
- `REQ-016`: After closing root admission, Team termination must dispatch existing interruption semantics to every materialized active member turn, wait until those turns are terminal/quiescent, then fully terminate every active configured AgentRun, delegated task AgentRun, configured sub-TeamRun, and delegated/nested TeamRun. The root may be stamped terminated, unregistered, projected inactive, and made delete-ready only after every descendant termination succeeds.

## Acceptance Criteria

- `AC-001`: Given a persisted TeamRun whose root is active, whose configured members are all `offline`, and whose checkpoint has no open work—including the observed state after focused-member restoration fails—its TeamRun row exposes the permanent-delete action.
- `AC-002`: Invoking delete for that active/quiescent row opens confirmation stating that the Team will be stopped and its history permanently deleted.
- `AC-003`: Invoking delete for an inactive row opens confirmation that describes permanent history deletion without claiming an active Team will be stopped.
- `AC-004`: Confirming active deletion terminates and deletes the same exact `teamRunId`; after success the server history list, package directory, client tree, Team context, stream registration, and selection contain no stale reference to that root.
- `AC-005`: Confirming inactive deletion deletes the exact stored root without restoring/activating it.
- `AC-006`: A low-level delete attempted while the root is still manager-owned—whether admitting, terminating, or retained after a failed termination attempt—remains rejected; no package or catalog row is removed.
- `AC-007`: Cancelling either confirmation performs no GraphQL mutation, termination, local cleanup, or persisted change.
- `AC-008`: With two or more same-summary runs, deleting one removes only the clicked row's exact root package and catalog entry.
- `AC-009`: No configured member row presents a control that implies independent member-history deletion.
- `AC-010`: A termination failure leaves the exact root manager-owned, present, not delete-ready, and retryable; it does not emit a successful terminal/inactive projection, does not stamp `terminatedAt`, does not delete history, and reports a user-visible failure. Admission may remain closed because the user already requested shutdown.
- `AC-011`: A post-termination deletion failure leaves the Team inactive, its history present, and deletion retryable; a later retry deletes without needing to reactivate or terminate the Team.
- `AC-012`: Stop-only preserves history; inactive archive behavior and independent Agent behavior remain covered and unchanged.
- `AC-013`: Keyboard focus exposes and activates the TeamRun delete action, the action has an accessible label, and touch/non-hover presentation does not depend on desktop hover.
- `AC-014`: Repository tests cover active+offline/quiescent, active+running, inactive, cancel, both partial failures, same-summary exact identity, successful cleanup, and preserved unrelated behavior using isolated data.
- `AC-015`: Given `autoExecuteTools=false` and a focused member at `TOOL_APPROVAL_REQUESTED`, invoking stop produces a terminal interrupted/cancelled tool and turn outcome, never executes the tool, requires no approval decision, and returns termination success within the normal bounded operation window.
- `AC-016`: While that termination is in flight, root lookup/projection and a repeated stop resolve against the same root/termination; a restore attempt cannot materialize a second root, and no new member input is admitted.
- `AC-017`: After pending-approval stop succeeds, the retained row has `terminatedAt`, root `isActive=false`, all members offline, and no open work. Restoring it may legitimately produce `root active + members offline`; a later message lazily activates the selected member through the existing continuation path.
- `AC-018`: The active-delete flow over the same pending-approval fixture waits for termination success, then removes only the exact catalog row/package and clears exact client stream/context/selection state.
- `AC-019`: With active configured, delegated-task, configured-subteam, and delegated/nested executions, stop first interrupts every active leaf turn, then waits for every leaf AgentRun and descendant TeamRun to terminate. Until the final child succeeds, the root remains manager-owned and no terminal stamp, inactive lifecycle event, delete-ready UI, or physical deletion occurs. A failed child termination can be retried against the same exact execution objects.

## Constraints / Dependencies

- Investigation and automated validation must not mutate either reported production TeamRun. The one user-approved runtime reproduction used a newly allocated exact fixture and removed it after evidence capture; durable automated coverage must use isolated temporary data.
- Target base/merge branch: `personal` from refreshed `origin/personal`.
- The existing `AgentTeamRunManager` remains root-lifecycle authority; configured member status is not deletion authority.
- Existing AgentRun interrupt behavior is the cancellation primitive for pending approval during Team shutdown; termination must not add a competing approval-resolution mechanism.
- The existing history catalog remains physical package/catalog authority and retains its active-root safety guard.

## Persisted Data Outcome

- Stored subject / location: exact TeamRun catalog row in `memory/team_run_history_index.json` plus the exact root package directory under `memory/agent_teams/<teamRunId>/`.
- Required outcome: `Directly usable — no migration` for retained runs; explicit permanent disposal only for the confirmed exact root.
- Existing data to preserve, discard/rebuild, transform, or quarantine: preserve every non-target root and shared definition; delete the confirmed target's catalog row and complete root package after it is inactive.
- Unacceptable data loss or corruption: deleting by non-unique summary; deleting only part of another root; removing a package while its root is active; leaving the deleted root selected or streamed; deleting a member as if it were a standalone TeamRun.
- Availability / rollout constraints: no migration or startup behavior change. A deletion failure affects only the requested delete operation and leaves retained data available for retry.
- Related IDs: `REQ-003`–`REQ-010`, `AC-004`–`AC-011`.

## Assumptions

- The user intends the delete control to target the complete Classroom Simulation TeamRun shown by its parent run row, not only the selected `professor` member.
- Explicit destructive confirmation is sufficient authorization to stop an active TeamRun and permanently delete that run's history.
- Existing exact TeamRun packages are readable by the current branch and require no format migration for this fix.

## Risks / Open Questions

- If a lifecycle race reactivates/restores the root between termination and catalog deletion, the catalog guard must reject deletion and the UI must retain/refresh the row rather than guessing.
- Client cleanup must explicitly close the exact Team stream; removing only the view context is insufficient for an active-delete success.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| Active root; all members offline; quiescent | `REQ-001`, `REQ-002`, `REQ-003`, `REQ-006`, `REQ-007`, `REQ-009` |
| Active root with live work/member | `REQ-001`, `REQ-003`, `REQ-005`, `REQ-006`, `REQ-009`, `REQ-010` |
| Active member waiting for tool approval | `REQ-003`, `REQ-009`, `REQ-010`, `REQ-013`–`REQ-016` |
| Active configured/delegated/nested descendant set | `REQ-003`, `REQ-005`, `REQ-010`, `REQ-014`–`REQ-016` |
| Inactive root | `REQ-001`, `REQ-004`, `REQ-006`, `REQ-007`, `REQ-009` |
| Cancel / failures / retry | `REQ-005`, `REQ-006`, `REQ-010`, `REQ-012` |
| Same-summary and member hierarchy | `REQ-007`, `REQ-008`, `REQ-011` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Intended Scenario Class |
| --- | --- |
| `AC-001`–`AC-003` | Component/UI state and confirmation behavior |
| `AC-004`–`AC-006` | API/service/catalog lifecycle integration |
| `AC-007`–`AC-013` | Cancellation, identity, cleanup, failure recovery, preservation, accessibility |
| `AC-014`–`AC-019` | Isolated durable coverage completeness, pending-approval termination, descendant-first shutdown, in-flight identity, restore control, and exact active deletion |

## Approval Status

Approved by the user on 2026-08-19. The user explicitly confirmed the descendant-first shutdown order: cancel/interruption-resolve active turns and pending approvals, fully stop every individual and nested execution, then mark/unregister the root; only after that terminal completion does the inactive row become delete-ready. The user also approved proceeding to design using the shared design principles.
