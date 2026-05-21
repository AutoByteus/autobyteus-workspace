# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined. The user clarified on 2026-05-21 that mobile Start new should match the desktop/web mental model: configure the run, create/start it, then send the first message from the normal Chat composer. The current full Launch Summary and first-message-in-configuration flow are too redundant and should be removed. Architecture review Round 1 added a refinement requirement: team draft attachments must remain identity-safe after setup-owned first-message focus is removed.

## Goal / Problem Statement

Mobile Start new currently combines three separate concerns in one long setup surface:

1. run configuration: target, workspace, runtime/model;
2. message composition: a `First message` textarea and a team `First message target`; and
3. review/readiness: a full `Launch summary` card that repeats already-selected form values.

Desktop/web does not work this way. Desktop/web lets the user configure a run, click the run/create action, hides the run config, opens the run/chat context, and then the user sends the first message from the normal chat composer. Mobile should use the same conceptual flow.

## Investigation Findings

- Desktop `RunConfigPanel.vue` creates agent/team runs from the current config stores with `createRunFromTemplate()` and clears the config. It does not require or send a first prompt as part of run creation.
- Current mobile `MobileRunSetup.vue` requires a `prompt`, renders a `First message` textarea, renders `MobileTeamLaunchFocusPicker` as `First message target`, renders `MobileLaunchSummary`, and disables launch until a prompt is present.
- Current mobile `useMobileRunLaunchCoordinator.ts` creates the run and immediately calls `activeContextStore.send()` with the prompt. This differs from desktop/web and makes run creation and message sending inseparable.
- Current mobile `MobileLaunchSummary.vue` repeats target, workspace, runtime/model, first-message target, and context count. The useful part is only the blocking readiness message; the repeated selected values make the setup longer on phones.
- Current mobile already has a Chat composer and `MobileComposerContextTray`, so the first message and attached context can live in Chat after run creation.
- Mobile already has an existing-run focus bar for team runs on Chat/Files/Activity. That is the correct place for a user to change the focused team member before sending the first message.
- Architecture review Round 1 found that draft context attachment transfer must be identity-safe for team runs: `activeContextStore.currentContextPaths` belongs to the active focused leaf `AgentContext`, not to the team run. Draft attachments must therefore remain team-run pending until first Chat send or be transferred to an explicit `teamRunId + memberRouteKey` leaf target.
- User scope clarification after seeing implementation activity: this must remain a mobile-shell change. `mobileWorkStore` may be extended only because it is already the mobile UI/session owner for current mobile context and draft attachments; core execution stores, backend contracts, and desktop/web composer behavior must not be repurposed for this UX cleanup.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UX Cleanup.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue plus Duplicated UX/coordination. Mobile run creation owns message sending and repeats form state in a second summary card.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now, limited to mobile run creation flow and mobile launch components.
- Evidence basis: Desktop separates run creation from first message; mobile currently couples run creation to `activeContextStore.send()` and renders redundant summary/review UI.
- Requirement or scope impact: Mobile Start new must become a configuration-only flow. First prompt composition moves to Chat.

## Recommendations

- Remove `MobileLaunchSummary` from Start new and delete/decommission it if no other mobile surface uses it.
- Remove the `First message` textarea from `MobileRunSetup`.
- Remove `First message target` from run configuration. Team member focus should be selected in Chat with the existing team focus bar before sending a message.
- Replace the summary card with one compact readiness/action area near the button: one blocking reason when disabled, optional draft context count/chips only when files are attached, and no repeated target/workspace/runtime rows.
- Change mobile run creation so it creates/selects the run from the configured stores and routes to Chat without calling `activeContextStore.send()`.
- Transfer agent draft context attachments directly to the created agent run. For team runs, move draft attachments into an explicit pending team-run attachment owner keyed by `teamRunId` and flush them to the selected focused leaf member only when the first Chat send occurs.
- Rename user-facing action copy from `Launch run` to a clearer configuration-only action such as `Create run` or `Start run`.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

## In-Scope Use Cases

- UC-MOBILE-CONFIG-001: On mobile, configure and create a new single-agent run without typing a first message in setup.
- UC-MOBILE-CONFIG-002: On mobile, configure and create a new team run without typing a first message or selecting a first-message target in setup.
- UC-MOBILE-CHAT-003: After mobile run creation, open Chat for the new run and send the first message from the normal composer.
- UC-MOBILE-TEAM-FOCUS-004: After mobile team run creation, choose/change focused team member from the existing Chat focus control before sending the first message.
- UC-MOBILE-CONTEXT-005: Draft context files attached before run creation are available in the new run's Chat composer context tray.
- UC-DESKTOP-NOREG-006: Desktop/web run configuration and first-message behavior remain unchanged.

## Out of Scope

- Backend run/history contract changes unless implementation discovers the current frontend stores cannot create an empty mobile run like desktop does.
- Native mobile app or PWA packaging changes.
- New runtime/model/provider features.
- Cross-device durable team focus persistence changes.
- Full redesign of desktop `RunConfigPanel`.

## Functional Requirements

- REQ-MOBILE-CONFIG-001: Mobile Start new must be configuration-only. It must collect target, workspace, and runtime/model readiness, but it must not collect or require the first chat message.
- REQ-MOBILE-CONFIG-002: Mobile Start new must not render a full Launch Summary card that repeats already-selected form values.
- REQ-MOBILE-CONFIG-003: Mobile Start new must not render team `First message target` as a run-configuration field. Team focus selection for messaging belongs to the Chat/team focus surface after the run is created.
- REQ-MOBILE-CONFIG-004: Mobile run creation must create/select the configured agent/team run without calling `activeContextStore.send()` and without sending any user prompt.
- REQ-MOBILE-CONFIG-005: After successful mobile run creation, the setup surface must close and the new run context must open on Chat.
- REQ-MOBILE-CONFIG-006: Mobile run creation readiness must still block on target, workspace, runtime/model, and existing config-store readiness. It must no longer block on prompt text or first-message target.
- REQ-MOBILE-CONFIG-007: The disabled/blocked state must be shown as one compact readiness message near the create/start button. It must not duplicate values already visible in form controls.
- REQ-MOBILE-CONTEXT-008: Draft context attachments selected before creating an agent run must transfer to that newly created active agent context and appear in the Chat composer context tray for the first message.
- REQ-MOBILE-CONTEXT-012: Draft context attachments selected before creating a team run must not be consumed into the implicit active focused member during creation. They must move into an explicit pending team-run attachment owner keyed by `teamRunId` until first Chat send.
- REQ-MOBILE-CONTEXT-013: Pending team-run attachments must remain visible and editable in the Chat composer context tray when the user changes focused team member before the first message.
- REQ-MOBILE-CONTEXT-014: Immediately before the first team Chat send, pending team-run attachments must flush to the currently focused leaf member using explicit `teamRunId + memberRouteKey` identity. If the current focus is not a valid leaf member, send must be blocked with an actionable message and pending attachments must remain pending.
- REQ-MOBILE-CONTEXT-015: Mobile team run creation must ensure the initial Chat focus is a valid leaf member when possible. If the store default/coordinator focus is a non-leaf subteam, mobile must switch to a deterministic valid leaf fallback before the composer is used, without consuming pending attachments.
- REQ-MOBILE-TEAM-FOCUS-009: For team runs, the newly opened Chat surface must show the existing team focus control so the user can choose the member before sending the first message.
- REQ-MOBILE-CLEANUP-010: Obsolete mobile setup code and tests tied to `First message`, `First message target`, `MobileLaunchSummary`, and prompt-on-launch behavior must be removed or updated.
- REQ-DESKTOP-NOREG-011: Desktop/web run configuration, run creation, chat composer, and team focus behavior must not regress.
- REQ-MOBILE-STORE-012: Any new attachment state for this task must live in mobile-owned state only, preferably extending existing `mobileWorkStore` draft/current-context responsibility. It must not move mobile UX/session policy into `activeContextStore`, agent/team run stores, runtime/model stores, or backend persistence.
- REQ-SHARED-NOREG-013: Shared composer/monitor components should remain unchanged unless implementation proves a tiny send-time seam is necessary. If touched, the change must be limited to an optional no-op callback/slot-style seam with no mobile imports, no mobile store dependency, and identical desktop/web behavior when no callback is supplied.

## Acceptance Criteria

- AC-MOBILE-CONFIG-001: In mobile Start new for an agent, no `First message` textarea is rendered and the create/start button can become enabled without prompt text once target, workspace, and runtime/model are valid.
- AC-MOBILE-CONFIG-002: In mobile Start new for a team, no `First message target` setup field is rendered and the create/start button can become enabled without prompt text once target, workspace, and runtime/model/readiness are valid.
- AC-MOBILE-CONFIG-003: `MobileLaunchSummary` is not rendered in the mobile Start new setup.
- AC-MOBILE-CONFIG-004: When required configuration is missing, the setup shows exactly one compact blocking message near the create/start action, such as `Choose a workspace before creating the run.`
- AC-MOBILE-CONFIG-005: Creating a mobile agent run calls the same run creation store boundary as desktop and does not call `activeContextStore.send()`.
- AC-MOBILE-CONFIG-006: Creating a mobile team run calls the same team run creation store boundary as desktop and does not call `activeContextStore.send()`.
- AC-MOBILE-CHAT-007: After mobile run creation, setup closes and the app opens the new run on Chat with an empty composer ready for the first user message.
- AC-MOBILE-TEAM-FOCUS-008: After creating a mobile team run, the Chat focus control is available before the first message is sent and changing it routes the first composer send to the selected member.
- AC-MOBILE-CONTEXT-009: If files were attached while in a draft/non-run context before creating an agent run, those files appear in the new agent run's composer context tray after Chat opens.
- AC-MOBILE-CONTEXT-011: If files were attached while in a draft/non-run context before creating a team run, those files appear in the new team run's Chat composer context tray as pending team-run attachments, not as attachments bound to an arbitrary initial member.
- AC-MOBILE-CONTEXT-012: Team scenario: attach files in a draft/non-run context, create a team run, change focus in Chat before the first message, and then send the first message. The attachments remain visible after focus change, flush to the selected focused leaf member at send time, and the first send targets that selected member with those attachments.
- AC-MOBILE-CONTEXT-013: If a team run opens with a non-leaf default focus, mobile switches to a deterministic valid leaf focus before the composer accepts a first send, and pending attachments are not dropped during that transition.
- AC-DESKTOP-NOREG-010: Existing desktop/web config panel tests and manual checks still show configure -> run -> chat behavior unchanged.
- AC-SHARED-NOREG-014: If shared composer/monitor files are changed, desktop/web composer tests or equivalent focused checks prove that sending without a mobile callback follows the exact existing path and timing.
- AC-MOBILE-STORE-015: Code review can identify all new pending-attachment state as mobile UI/session state; no core store or backend persistence schema receives mobile-only pending attachment policy.

### Desktop/Web Isolation Contract

- This is a mobile-shell UX change. Desktop Electron and normal desktop/web workspace routes must not adopt mobile setup layout or copy.
- Shared code may be touched only where it preserves existing desktop semantics. Shared composer changes are a fallback, not a default implementation target.
- The design must not change desktop `RunConfigPanel.vue` behavior except through no-op refactors covered by tests.
- The design must not change `activeContextStore.send()` semantics, agent/team run store semantics, runtime/model store semantics, backend/API contracts, or desktop composer behavior.

## Constraints / Dependencies

- Must preserve mobile phone-first bottom-tab navigation.
- Must keep runtime/model readiness authoritative in `agentRunConfigStore` and `teamRunConfigStore`.
- Must keep message sending through the normal Chat composer and `activeContextStore.send()` after the user actually enters a prompt.
- Must preserve existing mobile file attachment behavior. Agent draft attachments can move directly into the created agent context; team draft attachments must remain pending at `teamRunId` scope until the selected focused leaf member is known at first Chat send.

## Assumptions

- Empty run creation is valid because desktop already creates agent/team contexts from config without a prompt.
- A newly created empty run may remain temporary until the first message promotes it; this matches existing desktop runtime behavior unless validation proves otherwise.
- For a team run, the initial mobile Chat focus should be a valid leaf member. If the team store default resolves to a non-leaf subteam, mobile can choose a deterministic first leaf fallback; the user can still change focus in Chat before sending.

## Risks / Open Questions

- If backend history does not show an empty temporary run until first message, mobile Recent may not list it until the first message; this is acceptable if Chat opens immediately after creation and desktop behaves similarly.
- Agent draft context attachment transfer must happen after the new active agent context exists and before Chat is shown. Team draft context attachments must move to a pending team-run owner before Chat is shown and flush only at first send.
- Tests that currently mock `launchMobileRun({ prompt })` must be updated to the new create-only contract.

## Requirement-To-Use-Case Coverage

- UC-MOBILE-CONFIG-001: REQ-MOBILE-CONFIG-001, REQ-MOBILE-CONFIG-002, REQ-MOBILE-CONFIG-004, REQ-MOBILE-CONFIG-006, REQ-MOBILE-CONFIG-007
- UC-MOBILE-CONFIG-002: REQ-MOBILE-CONFIG-001, REQ-MOBILE-CONFIG-002, REQ-MOBILE-CONFIG-003, REQ-MOBILE-CONFIG-004, REQ-MOBILE-CONFIG-006, REQ-MOBILE-CONFIG-007
- UC-MOBILE-CHAT-003: REQ-MOBILE-CONFIG-005, REQ-MOBILE-CONFIG-004
- UC-MOBILE-TEAM-FOCUS-004: REQ-MOBILE-TEAM-FOCUS-009
- UC-MOBILE-CONTEXT-005: REQ-MOBILE-CONTEXT-008, REQ-MOBILE-CONTEXT-012, REQ-MOBILE-CONTEXT-013, REQ-MOBILE-CONTEXT-014, REQ-MOBILE-CONTEXT-015
- UC-DESKTOP-NOREG-006: REQ-DESKTOP-NOREG-011

## Acceptance-Criteria-To-Scenario Intent

- AC-MOBILE-CONFIG-001 validates no first-message requirement for agent creation.
- AC-MOBILE-CONFIG-002 validates no first-message target requirement for team creation.
- AC-MOBILE-CONFIG-003 validates Launch Summary removal.
- AC-MOBILE-CONFIG-004 validates compact readiness messaging.
- AC-MOBILE-CONFIG-005 and AC-MOBILE-CONFIG-006 validate create-only behavior without sending.
- AC-MOBILE-CHAT-007 validates configure -> Chat transition.
- AC-MOBILE-TEAM-FOCUS-008 validates first message is sent from Chat to the selected focused member.
- AC-MOBILE-CONTEXT-009 validates agent draft attachments survive the transition.
- AC-MOBILE-CONTEXT-011 validates team draft attachments use pending team-run ownership.
- AC-MOBILE-CONTEXT-012 validates team focus changes before first send keep and target attachments correctly.
- AC-MOBILE-CONTEXT-013 validates non-leaf default focus handling.
- AC-DESKTOP-NOREG-010 validates desktop/web isolation.

## Approval Status

Refined after architecture review Round 1 on 2026-05-21. The product direction remains approved by the user; this revision adds the required identity-safe pending team-run attachment behavior for DRI-001 and the subsequent user guardrail that this must remain a mobile-shell change with no core send/runtime/backend or desktop behavior changes.
