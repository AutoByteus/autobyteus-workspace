# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Investigate and fix the frontend bug where pressing the interrupt/stop control while focused on one agent/team-member panel can interrupt a different agent/team member, as reported when clicking interrupt on `code_reviewer` appeared to stop `solution_designer` instead.

## Investigation Findings

Current investigation shows the focused-member selection is probably working for text input: `AgentUserInputTextArea` delegates send/stop to `activeContextStore`; `activeContextStore.send()` calls `agentTeamRunStore.sendMessageToFocusedMember(...)`; `sendMessageToFocusedMember` captures `activeTeam.focusedMemberName` as `targetMemberRouteKey` and sends it as `target_member_name` through `TeamStreamingService.sendMessage(...)`.

The interrupt path loses that focused-member identity: `activeContextStore.interruptGeneration()` sees `selectionStore.selectedType === 'team'`, resolves only `activeTeamRunId`, and calls `agentTeamRunStore.interruptGeneration(activeTeamRunId)`. `agentTeamRunStore.interruptGeneration(...)` resolves only the team stream, and `TeamStreamingService.interruptGeneration()` sends `{ type: 'INTERRUPT_GENERATION' }` with no payload. Server-side, `AgentTeamStreamHandler.handleInterruptGeneration(teamRunId)` resolves the active team run and calls `activeRun.interrupt()`. The `TeamRun`/backend/manager interfaces expose only team-level `interrupt()`, and Codex/Claude/Mixed team managers implement it by looping over `memberRuns.values()` and interrupting member runs in map order.

Therefore the UI affordance is member-scoped (`canInterrupt` is computed from `focusedMemberContext.state.canInterrupt`), but the command boundary is team-scoped. This mismatch can interrupt a different running member, all active members, or a partial prefix of members depending on backend state and failures.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: Code path evidence from `activeContextStore`, `agentTeamRunStore`, `TeamStreamingService`, `AgentTeamStreamHandler`, and team backend manager interfaces/implementations.
- Requirement or scope impact: Interrupt must become explicitly focused-member scoped at the UI command boundary and server team-command boundary; ambiguous team-level interrupt must not be used for a member composer stop button.

## Recommendations

Fix the boundary mismatch rather than treating this as a cosmetic focus indicator issue: member-focused send and member-focused interrupt must use the same focused-member target-resolution model. The composer stop button must carry the focused member target through the frontend command facade, WebSocket client, server team stream handler, and team runtime boundary. It must never silently fall back to team-wide interruption.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: Interrupting the currently focused individual team-member agent from its focused conversation view.
- UC-002: Switching between team members and then interrupting; the interrupt target must follow the visible/focused agent, not a previous agent.
- UC-003: Interrupting from team/team-member views while activity and sidebar panels are showing data for the selected focus.

## Out of Scope

- Backend/runtime interrupt implementation beyond the command-target boundary needed to make team-member interruption explicit.
- Visual redesign of the team workspace outside controls needed to make interrupt target ownership explicit.
- New non-interrupt team orchestration behavior.

## Functional Requirements

- FR-001: The interrupt/stop action in a focused agent/team-member view must target the exact focused team member represented by that visible view at the moment the user clicks the control.
- FR-002: A view switch from one team member to another must update all interrupt command target state before the interrupt/stop control can submit an action.
- FR-003: The frontend and transport protocol must resolve the interrupt target the same way the send-text path resolves the focused member target, and must not collapse a focused-member stop action into a team-run-only command.
- FR-004: The UI must disable or withhold the interrupt/stop control when it cannot resolve an unambiguous active target identity.
- FR-005: The implementation must preserve correct interruption for existing non-team or single-agent chat views that share the same composer/control surface.

## Acceptance Criteria

- AC-001: Given `solution_designer` is running, when the user switches to `code_reviewer` and clicks interrupt in the `code_reviewer` focused view, the frontend sends an interrupt request whose target identity is `code_reviewer`'s current conversation/run, not `solution_designer`'s.
- AC-002: Given the user rapidly switches between team members, when the interrupt/stop button is clicked, the resolved target matches the visible focused header/conversation and never a previously focused team member.
- AC-003: Given no focused agent/team-member run identity is resolvable, the interrupt/stop action is unavailable and no backend interrupt request is sent.
- AC-004: Automated or component-level coverage proves the target derivation for team-member focus switching and non-team views.
- AC-005: Existing interrupt behavior for ordinary agent workspaces remains passing under the relevant frontend tests.

## Constraints / Dependencies

- Backend team WebSocket/API contract changes are required because current `INTERRUPT_GENERATION` carries no member target.
- Must keep target identity explicit at the UI action boundary.
- No backward-compatibility dual path should remain if a stale target path is found.

## Assumptions

- The reported color change means the interrupted/stopped target was `solution_designer`.
- The interrupt/stop button in the screenshot is the red square button near the composer.
- Team-member focused views share some composer/action infrastructure with regular agent views.

## Risks / Open Questions

- Need decide whether a product-level team-wide interrupt command should remain as a separate explicit command or be removed from the member composer path.
- Need verify all team backend kinds can implement member-scoped interrupt uniformly.
- Need add focused-member interrupt target routing tests on frontend and backend.

## Requirement-To-Use-Case Coverage

- UC-001: FR-001, FR-003, FR-004, FR-005
- UC-002: FR-001, FR-002, FR-003, FR-004
- UC-003: FR-001, FR-002, FR-003, FR-004

## Acceptance-Criteria-To-Scenario Intent

- AC-001 covers the concrete reported scenario.
- AC-002 covers race/stale selection variants.
- AC-003 covers ambiguous identity safety.
- AC-004 covers durable regression protection.
- AC-005 covers preservation of ordinary chat behavior.

## Approval Status

Approved by user direction on 2026-05-16; design-ready for architecture review. User explicitly confirmed interrupt should follow the same focused-member target model as send text.
