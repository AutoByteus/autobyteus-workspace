# Investigation Notes

## Investigation Status

- Bootstrap Status: Completed; dedicated worktree/branch created.
- Current Status: Root-cause path identified; requirements approved/design-ready; design spec produced.
- Investigation Goal: Determine why the frontend interrupt/stop control can target a previously focused team-member agent instead of the currently focused visible agent, classify root cause, and design a robust fix.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The reported symptom involves shared UI controls, team-member selection/focus state, runtime status projection, and backend interrupt calls; likely spans several frontend files and tests.
- Scope Summary: Frontend target identity derivation for interrupt/stop in team-member focused views.
- Primary Questions To Resolve:
  - Which component owns the red interrupt/stop button and composer action? Answer: `AgentUserInputTextArea.vue` in `AgentUserInputForm.vue`, embedded in `AgentEventMonitor.vue` / `TeamWorkspaceView.vue`.
  - Which state source identifies the interrupt target in team-member focused views? Answer: UI affordance reads `activeContextStore.canInterrupt` from `focusedMemberContext`, but command sends only team run id.
  - Does target identity update synchronously when switching focus from one member to another? Member focus updates through `AgentTeamContextsStore.setFocusedMember(...)` / `focusMemberAndEnsureHydrated(...)`; text send path uses that focused member identity correctly.
  - Are activity pane/header/sidebar status projections using the same or different identity source? Header/status/composer affordance use focused member; command path discards member.
  - Is the bug local to a handler closure/state derivation or a deeper boundary/ownership issue? Current evidence indicates deeper command-boundary/ownership mismatch, not stale closure alone.

## Request Context

User reports that while `solution_designer` was running, they switched focus to `code_reviewer` and clicked the interrupt control. The `code_reviewer` appeared to continue, while `solution_designer` changed color/status and stopped. User suspects the interrupt button acted on a previous/non-focused agent rather than the current focused agent.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/focused-agent-interrupt-routing`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/focused-agent-interrupt-routing/tickets/in-progress/focused-agent-interrupt-routing`
- Current Branch: `codex/focused-agent-interrupt-routing`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/focused-agent-interrupt-routing`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-05-16.
- Task Branch: `codex/focused-agent-interrupt-routing`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Work on the dedicated worktree/branch above, not the original shared checkout at `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-16 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch -vv` | Bootstrap environment discovery | Original checkout was `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` on `personal` tracking `origin/personal`. | No |
| 2026-05-16 | Command | `git fetch origin --prune` | Refresh tracked remote before creating task worktree | Fetch completed successfully. | No |
| 2026-05-16 | Command | `git worktree add -b codex/focused-agent-interrupt-routing /Users/normy/autobyteus_org/autobyteus-worktrees/focused-agent-interrupt-routing origin/personal` | Create mandatory dedicated task worktree/branch | Worktree created at latest `origin/personal`; HEAD `a51d3abd`. | No |
| 2026-05-16 | Other | User report and screenshot in chat | Understand observed symptom | Interrupt clicked while focused on `code_reviewer` may have interrupted `solution_designer`. Screenshot shows team tree with selected `solution_designer`, focused header `solution_designer`, and red stop button near composer after user returned to `solution_designer`. | Yes |
| 2026-05-16 | Code | `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue` | Find stop button owner | Red stop/send button calls `handlePrimaryAction`; when `canInterrupt` is true it calls `activeContextStore.interruptGeneration()`. `canInterrupt` comes from `activeContextStore`. | No |
| 2026-05-16 | Code | `autobyteus-web/stores/activeContextStore.ts` | Trace focused context and interrupt target | `activeAgentContext` resolves to `agentTeamContextsStore.focusedMemberContext` for team selection. `send()` calls `sendMessageToFocusedMember(...)`, but `interruptGeneration()` for teams only resolves `activeTeamRunId` and calls `agentTeamRunStore.interruptGeneration(activeTeamRunId)`. | No |
| 2026-05-16 | Code | `autobyteus-web/stores/agentTeamRunStore.ts` | Compare text send vs interrupt | `sendMessageToFocusedMember(...)` captures `activeTeam.focusedMemberName` as `targetMemberRouteKey` and passes it to `TeamStreamingService.sendMessage(...)`. `interruptGeneration(...)` ignores focused member and calls `service.interruptGeneration()` for the team stream. | No |
| 2026-05-16 | Code | `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` and `protocol/messageTypes.ts` | Inspect client protocol command shape | `sendMessage(...)` payload includes `target_member_name`; `approveTool(...)`/`denyTool(...)` include `agent_name`; `interruptGeneration()` sends only `{ type: 'INTERRUPT_GENERATION' }`, and protocol type defines no payload for interrupt. | No |
| 2026-05-16 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | Inspect server handling of team interrupt | `handleInterruptGeneration(teamRunId)` resolves the active team run and calls `activeRun.interrupt()` with no member target. | No |
| 2026-05-16 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/team-manager.ts`, `team-run-backend.ts`, `domain/team-run.ts`, and Codex/Claude/Mixed team managers | Inspect team interrupt ownership | Interfaces expose only team-level `interrupt()`. Codex/Claude/Mixed managers iterate `memberRuns.values()` and interrupt member runs in map order. No focused-member command exists. | No |
| 2026-05-16 | Code | `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`, `TeamMembersPanel.vue`, `RunningAgentsPanel.vue`, `AgentTeamEventMonitor.vue`, `AgentEventMonitor.vue` | Verify focus path and composer embedding | Member focus is stored in `activeTeamContext.focusedMemberName`; focused monitor/composer display reads `focusedMemberContext`. This supports user observation that typed text goes to the focused member while stop does not. | No |
| 2026-05-16 | Code/Test | `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts`; search for `interruptGeneration` in team streaming tests | Check existing coverage | Existing team interrupt store test only verifies service interrupt is called and sending state is not optimistically cleared; no test asserts focused member target. No `TeamStreamingService` interrupt payload test found. | Yes |


## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: User-visible interrupt/stop button in focused team-member conversation composer.
- Current execution flow: `AgentUserInputTextArea.handlePrimaryAction()` -> `activeContextStore.interruptGeneration()` -> for team selection `agentTeamRunStore.interruptGeneration(activeTeamRunId)` -> `TeamStreamingService.interruptGeneration()` -> WebSocket `{ type: 'INTERRUPT_GENERATION' }` -> server `AgentTeamStreamHandler.handleInterruptGeneration(teamRunId)` -> `TeamRun.interrupt()` -> backend/team manager `interrupt()` -> loop through active member runs.
- Ownership or boundary observations: Focused-member display and send are member-scoped; interrupt is team-scoped. The UI command boundary does not carry the same identity used by the focused view.
- Current behavior summary: The focused member can be correct while the stop action still targets the team aggregate/backend loop instead of the focused member.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture evidence summary: Refactor needed at the command-boundary level. The member composer/active context facade must produce an explicit member interrupt target, and the team WebSocket/server/team-manager boundary must own member-scoped interrupt rather than collapsing to team-wide interrupt.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User report | Interrupt action seems to affect previous/non-focused member. | Confirmed plausible boundary mismatch: stop affordance is member-scoped but command is team-scoped. | No |
| `activeContextStore.ts` | Team `canInterrupt` and `activeAgentContext` are focused-member-scoped, but team `interruptGeneration()` uses only `activeTeamRunId`. | Boundary/ownership issue: target identity is lost at the facade action boundary. | No |
| `TeamStreamingService.ts` + protocol | `INTERRUPT_GENERATION` has no payload; unlike send/tool approval, it cannot identify a member. | Protocol/API shape issue: team-member command lacks explicit identity. | No |
| Server team manager interfaces | Only `interrupt()` exists for whole team; implementations loop member runs. | Backend owner cannot honor focused-member semantics because the interface lacks a member target. | No |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue` | Shared composer input and primary send/stop button | Stop button calls `activeContextStore.interruptGeneration()` when `canInterrupt` is true. | UI action entrypoint must carry/derive an explicit command target. |
| `autobyteus-web/stores/activeContextStore.ts` | Facade for currently active single agent or focused team member | Correctly resolves focused member for display/send, but team interrupt passes only `activeTeamRunId`. | Facade leaks an aggregate team command for a member-scoped action. |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Frontend team run command store | Send captures `focusedMemberName`; interrupt does not. | Store needs a focused-member interrupt command or explicit target parameter. |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Team WebSocket client command facade | Send has `target_member_name`; approval has `agent_name`; interrupt has no target payload. | Protocol command shape must be tightened. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | Server team WebSocket command handler | Interrupt handles only `teamRunId` and calls `activeRun.interrupt()`. | Server command boundary must resolve target member for member-scoped interrupt. |
| `autobyteus-server-ts/src/agent-team-execution/backends/team-manager.ts` and implementations | Backend team runtime command owner | Exposes/implements only aggregate `interrupt()`, looping over member runs. | Add member-owned interrupt path; keep team-wide termination/interruption explicit if needed. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |

## External / Public Source Findings

- Public API / spec / issue / upstream source: Not used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Pending.
- Required config, feature flags, env vars, or accounts: Pending.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: None beyond worktree creation.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- The report is not primarily explained by focus not switching. The code shows send and display use the focused member.
- The direct cause is target identity loss: member-focused UI state is converted into a team-run-only interrupt command.
- Existing tests exercise generic team interrupt but do not protect focused-member target routing.
- Server docs already say member `can_interrupt` is the authority for frontend stop/interrupt affordance, but the transport/backend interrupt command has no member identity to honor that authority.

## Constraints / Dependencies / Compatibility Facts

- The current protocol shape is asymmetric: `SEND_MESSAGE` and tool approval/denial support member routing, while interrupt does not.
- Team managers currently expose team-level `interrupt()` only; a focused-member fix likely crosses frontend and backend boundaries.
- The target identity should use the stable member route key (`focusedMemberName` / `memberRouteKey`) and may optionally include runtime `agent_id` as a guard, but must not rely only on human display text.
- Missing target must be rejected/disabled rather than silently falling back to team-wide interrupt.

## Open Unknowns / Risks

- Need decide whether to remove/replace team-wide WebSocket interrupt or split it into an explicit separate command if team-wide interruption remains product-needed.
- Need verify all backend team kinds (`autobyteus`, `codex`, `claude`, `mixed`) can implement member-scoped interrupt uniformly.
- Need add frontend and backend regression tests for focused member switch + interrupt.

## Notes For Architect Reviewer

Design should enforce the invariant that focused-member send and focused-member interrupt share the same explicit target resolver. Review should reject any design that keeps composer interrupt as a team-run-only command or silently falls back to team-wide interrupt.
