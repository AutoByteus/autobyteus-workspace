# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Improve the live agent run startup/status user experience for agents that begin from `offline`, and fix stale error status after transient connection/runtime errors recover. The user observes two related problems in the desktop frontend:

1. When a stopped/offline agent receives a new message, the send button greys out but the typed text remains in the composer and does not appear in the event monitor until later, around the time the runtime has been created/restored and marked running. This makes a valid send look like nothing happened.
2. When an agent enters an `error` state due to a transient issue such as reconnecting/server connection trouble, later successful runtime activity can be visible in the event monitor while the header/sidebar still show the agent as `Error`.

The product should provide immediate, truthful feedback that a send/start request was accepted locally and is being launched, and it should not leave recovered agents visually stuck in error.

## Investigation Findings

- The user's send-startup diagnosis is correct in effect, though the exact current gate is not only a backend `running` status. For single-agent sends, `agentRunStore.sendUserInputAndSubscribe()` sets `isSending = true`, awaits create/restore when the run is new or inactive, marks history active, finalizes attachments, appends the user message, clears the composer, then awaits websocket connection and sends the message. For team sends, `activeContextStore.send()` clears the composer only after `agentTeamRunStore.sendMessageToFocusedMember()` returns; the team store appends the user message only after create/restore and attachment finalization. This explains the user-visible delay.
- The frontend currently has only `offline | idle | running | error` for agent/team statuses. Backend API status contracts also expose only `offline | idle | running | error`. Existing richer runtime tokens like `bootstrapping` and `uninitialized` are normalized/collapsed to `running` (or special-cased as running), so the UI cannot render a distinct startup/initializing status from authoritative status events.
- For the native AutoByteus runtime, backend create/restore waits for the agent to reach idle before `createAgentRun`/`restoreAgentRun` returns. Therefore a backend websocket status alone cannot give immediate feedback for all new-run startup cases under the current synchronous create/restore contract; the frontend must also own an accepted-local-submission/startup placeholder as soon as local validation succeeds.
- Stuck error status is plausible from current status ownership: `applyLiveAgentStatusEvent()` is the only central live status update path, while normal live runtime events such as segment/tool events do not clear a stale `Error`. Some hydration/recovery paths also preserve an existing live status when subscribed, which can preserve `Error` despite active history/stream activity. Thus a later non-error live event stream can continue rendering while header/sidebar status remains stale.
- User clarification after the first design pass: backend run/member lifecycle status should remain the primary source of truth. If the backend publishes `error` and later the same run/member recovers or resumes work, the backend should emit a new non-error lifecycle status such as `initializing`, `running`, or `idle`; the frontend should not rely on ad hoc component inference. Connection/reconnect failures that are only client transport health should be displayed separately from backend agent lifecycle `error`.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change + Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant + Shared Structure Looseness
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: Send acknowledgement is owned inline in both single/team stores and occurs after slow create/restore/connect work. Status contracts collapse startup states to four coarse values. Error recovery is not encoded as a backend lifecycle transition invariant, and frontend status state can preserve stale error after later activity.
- Requirement or scope impact: Add a distinct `initializing` status across frontend/backend status contracts; make backend projectors/status publishers emit recovery transitions after backend lifecycle errors; keep frontend status updates centralized and avoid component-level inference; keep send orchestration in the run stores.

## Recommendations

- Add a new agent/team lifecycle token `initializing` (UI label: `Initializing`) as a first-class status in frontend types, frontend normalization/visuals, websocket protocol types, backend API status payload normalization, and team status aggregation.
- Add a frontend-owned accepted-submission path that immediately appends the submitted user message to the active conversation, clears composer text/attachments, sets `isSending`, and applies `initializing` before awaiting slow create/restore/stream-connect work. This is required because the backend currently cannot emit an early websocket status before all create/restore paths have returned a usable run id/session.
- Update backend projection to preserve startup semantics instead of collapsing `bootstrapping`/`uninitialized` to `running`.
- Add a backend lifecycle invariant: after the backend publishes `error` for a run/member, any later backend-observed recovery/start/resume/work event for that same subject must publish a non-error status transition (`initializing`, `running`, or `idle`) before or with subsequent live activity.
- Separate frontend transport/reconnect health from backend lifecycle status: a websocket reconnect problem may show a reconnecting/error banner, but must not permanently overwrite the backend-authoritative run/member status as `error`.
- Update the central frontend runtime-status state owner to clear stale `error` on newer backend-authored non-error status events. If live activity arrives while the frontend still shows `error`, treat that only as a bounded projection-repair path from backend-authored live evidence, not as component-level visual inference, and prefer explicit backend status recovery wherever available.
- Keep unrecovered terminal errors visible until a newer authoritative status, accepted new startup/send, or backend-authored live recovery evidence from the same run/member supersedes them.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: Send a message to an offline/new single-agent run and see immediate local acknowledgement that the send was accepted for launch.
- UC-002: Send a message to an offline/new team member and see immediate local acknowledgement that the send was accepted for launch.
- UC-003: Observe a distinct startup/initializing status during the transition between offline and active runtime work.
- UC-004: Recover from a transient connection/runtime error and see header/sidebar status update away from `Error` once the backend emits a newer non-error lifecycle status, while client-only reconnect trouble is represented separately from run lifecycle status.
- UC-005: Preserve clear error visibility for genuine terminal/non-recovered errors.

## Out of Scope

- Replacing the synchronous backend create/restore lifecycle with a fully asynchronous provisioning API.
- Redesigning the event monitor history persistence model beyond immediate local user-message acknowledgement and reconciliation.
- Provider-specific runtime behavior unrelated to shared status projection and status lifecycle handling.
- Cosmetic redesign of the full agent/team UI beyond the new startup status label/dot and immediate send-start feedback.

## Functional Requirements

- REQ-001: When a user sends non-empty text to an offline/new single-agent run, the frontend must immediately append a local user-message acknowledgement to the active event monitor and clear the composer after local validation succeeds, before slow create/restore/stream-connect work completes.
- REQ-002: When a user sends non-empty text to an offline/new team member, the frontend must immediately append a local user-message acknowledgement to the focused member monitor and clear the composer after local validation succeeds, before slow create/restore/stream-connect work completes.
- REQ-003: The system must expose and render a transitional `initializing` lifecycle status between `offline` and `running/idle` when a run/member/team has accepted startup/send work but the runtime is not yet ready or actively processing.
- REQ-004: Backend and frontend status normalization must preserve startup/runtime tokens such as `bootstrapping`, `uninitialized`, `starting`, and `initializing` as `initializing`, not collapse them to `running` or `offline`.
- REQ-005: Header, focused-member status, running list/sidebar dots, and history tree status dots must render `initializing` consistently with a distinct non-error visual treatment.
- REQ-006: Backend run/member lifecycle status must be the primary source of truth. If the backend has published `error` for a run/member and later observes that same run/member starting, resuming, processing a turn, emitting assistant output, or otherwise recovering, it must publish a newer non-error lifecycle status (`initializing`, `running`, or `idle`) for that same subject.
- REQ-007: The frontend must clear displayed `Error` for a run/member when it receives a newer backend-authored non-error lifecycle status for that same run/member.
- REQ-008: Client transport/reconnect failures must not be conflated with backend run/member lifecycle `error`; transport health may render a reconnecting/error banner, but backend lifecycle status must recover independently through backend status events.
- REQ-009: If backend-authored live non-error activity arrives for a run/member while the frontend still displays `Error` and no explicit recovery status was delivered, the central status path may use that activity only as a bounded projection-repair fallback for the same run/member; visual components must not infer recovery independently.
- REQ-010: Genuine unrecovered errors must remain visible until superseded by a newer authoritative status, a new accepted startup/send lifecycle for that run/member, or backend-authored live recovery evidence from that same run/member.
- REQ-011: Status transitions must be owned through the backend status projection and central frontend run-status/status-normalization path rather than duplicated ad hoc in visual components.
- REQ-012: Immediate local user-message acknowledgement must reconcile with finalized attachments and the final promoted run/team id without duplicating the same submitted user message.

## Acceptance Criteria

- AC-001: Given an offline/new single-agent run with non-empty composer text, when the user presses send, then within the same UI interaction the composer no longer appears to contain an unsent message and the event monitor contains the submitted user text as an accepted local message.
- AC-002: Given an offline/new team member with non-empty composer text, when the user presses send, then within the same UI interaction the shared/focused composer is cleared and the focused member monitor contains the submitted user text as an accepted local message.
- AC-003: Given a send that takes several seconds to create/restore/start the runtime, the header/sidebar status shows `Initializing` before the agent/member becomes `Running` or `Idle`.
- AC-004: Given backend or runtime status token `bootstrapping`, `uninitialized`, `starting`, or `initializing`, frontend and backend status projection normalize it to `initializing`.
- AC-005: Given the backend publishes `error` for a run/member and later that same subject resumes or processes work, the backend emits a newer non-error lifecycle status before or with subsequent live activity.
- AC-006: Given a later authoritative `initializing`, `running`, or `idle` status after an `error`, the header/sidebar no longer show `Error` for that same run/member.
- AC-007: Given a websocket reconnect/transport failure while backend lifecycle status is still active, the UI may show a reconnecting/error banner but does not permanently convert the run/member lifecycle status to `Error`.
- AC-008: Given backend-authored live non-error activity after an `error` for the same run/member but a missed/out-of-order recovery status event, only the central status path may repair stale displayed `Error`; components do not infer recovery directly.
- AC-009: Given a terminal unrecovered error with no later accepted send/startup, non-error status, or backend-authored recovery evidence for that run/member, the UI continues to show `Error`.
- AC-010: Given a user message with context attachments, the immediate local message updates to the finalized attachment records after attachment finalization succeeds, without creating a duplicate user message.
- AC-011: Automated validation covers single-agent offline send acknowledgement, team-member offline send acknowledgement, startup-status normalization, backend error-to-running recovery publication, frontend status-event recovery, and transport-vs-lifecycle separation.

## Constraints / Dependencies

- Must preserve current event monitor/history semantics and avoid duplicate local user messages.
- Must not make old historical/replayed events clear a current error; recovery clearing is primarily explicit backend non-error status for the same run/member, with live same-run/same-member activity allowed only as bounded projection repair.
- Must account for both single-agent and team-focused-member paths.
- Must update backend and frontend contracts together because generated/protocol types currently encode the four-status shape.
- Must keep `canInterrupt` true only when the runtime is truly running and interruptible; `initializing` is not interruptible unless future backend support says otherwise.

## Assumptions

- The relevant UI is the Electron/autobyteus web frontend in this workspace.
- `initializing` is the desired wire token; the UI label may display `Initializing`.
- Local acknowledgement after validation is acceptable as long as backend failure still shows an error segment and does not duplicate the message.

## Risks / Open Questions

- If create/restore fails after local acknowledgement, the message remains visible with an adjacent system error; this is intentional but should be validated with UX expectations.
- Some status-contract changes may require generated GraphQL/typescript artifacts to be regenerated if codegen is used in this repo.
- Team aggregate status precedence may expose existing assumptions where `error` dominated all member statuses; the target should show team `running/initializing` when backend-authored active work is ongoing and keep member-level errors visible per member.

## Requirement-To-Use-Case Coverage

- UC-001: REQ-001, REQ-003, REQ-005, REQ-012
- UC-002: REQ-002, REQ-003, REQ-005, REQ-012
- UC-003: REQ-003, REQ-004, REQ-005, REQ-011
- UC-004: REQ-006, REQ-007, REQ-008, REQ-009, REQ-011
- UC-005: REQ-010, REQ-011

## Acceptance-Criteria-To-Scenario Intent

- AC-001 validates immediate single-agent send acknowledgement.
- AC-002 validates immediate team-member send acknowledgement.
- AC-003 validates slow-start `Initializing` visibility.
- AC-004 validates status normalization preserves startup semantics.
- AC-005 validates backend recovery status publication.
- AC-006 validates explicit frontend status recovery from stale error.
- AC-007 validates transport health is separate from lifecycle status.
- AC-008 validates bounded central projection repair, not component inference.
- AC-009 validates terminal error retention.
- AC-010 validates local-message/final-attachment reconciliation.
- AC-011 validates durable coverage at the boundaries most likely to regress.

## Approval Status

User intent is explicit in the prompt and follow-up clarification: backend lifecycle status should be authoritative, frontend transport health should be separate, and `Initializing` can be adjusted as display copy while preserving the `initializing` lifecycle semantics.
