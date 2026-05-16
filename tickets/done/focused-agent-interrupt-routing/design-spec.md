# Design Spec

## Current-State Read

The current focus state is not the main defect. Team member focus is stored on `AgentTeamContext.focusedMemberName` and exposed through `agentTeamContextsStore.focusedMemberContext`. The focused header, conversation, composer `canInterrupt`, and text-send path all read from that focused member.

The defect appears at the command boundary:

- `AgentUserInputTextArea.vue` owns the shared primary action button. When `canInterrupt` is true, it calls `activeContextStore.interruptGeneration()`.
- `activeContextStore.activeAgentContext` is member-scoped for team selection, and `activeContextStore.send()` delegates to `agentTeamRunStore.sendMessageToFocusedMember(...)`.
- `agentTeamRunStore.sendMessageToFocusedMember(...)` captures `activeTeam.focusedMemberName` as the target and passes it to `TeamStreamingService.sendMessage(...)` as `target_member_name`.
- `activeContextStore.interruptGeneration()` does not preserve that target. For team selection it resolves only `activeTeamRunId` and calls `agentTeamRunStore.interruptGeneration(activeTeamRunId)`.
- `agentTeamRunStore.interruptGeneration(...)` finds the team stream and calls `TeamStreamingService.interruptGeneration()`.
- `TeamStreamingService.interruptGeneration()` sends `{ type: 'INTERRUPT_GENERATION' }` with no payload.
- Server `AgentTeamStreamHandler.handleInterruptGeneration(teamRunId)` resolves only the team run and calls `activeRun.interrupt()`.
- `TeamRun`, `TeamRunBackend`, and `TeamManager` expose only aggregate/team-level `interrupt()`. Codex/Claude/Mixed team managers implement it by iterating `memberRuns.values()` and interrupting member runs in backend map order.

So the UI affordance is focused-member-scoped while the command is team-run-scoped. That can interrupt the wrong member, all active members, or a partial prefix of members depending on backend runtime state.

## Intended Change

Make focused-member interruption use the same target-resolution model as focused-member text send:

1. The composer stop action resolves the current team run and focused member at click time.
2. The resolved focused member target is passed through `activeContextStore`, `agentTeamRunStore`, `TeamStreamingService`, `AgentTeamStreamHandler`, `TeamRun`, and the concrete team backend/manager.
3. The backend interrupts only the targeted focused member run.
4. Missing or ambiguous focused-member identity is a rejected/disabled action, not a fallback to team-wide interruption.
5. If product needs a team-wide interrupt later, it must be a separate explicit command/control, not the focused member composer stop button.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue, with an interface/API shape issue at the team command boundary.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: Send carries `target_member_name`; interrupt carries no member target and backend `interrupt()` is aggregate/team-level.
- Design response: Introduce a member-scoped interrupt command path and route the composer stop button through it. Remove/decommission the aggregate team interrupt path from the member composer flow.
- Refactor rationale: A local frontend handler patch cannot make the backend target the focused member because the protocol and backend interfaces currently lack member identity.
- Intentional deferrals and residual risk, if any: Full renaming of the existing `target_member_name` wire field to `target_member_route_key` is deferred unless implementation finds the existing field cannot safely carry route keys. This design still requires the value to be treated as a stable member route key in all new interrupt code and tests. Any broader audit of tool approval target naming is out of scope unless tests expose the same bug there.

## Terminology

- Focused member: the member selected in `AgentTeamContext.focusedMemberName` and rendered by the focused team workspace.
- Member route key: the stable key used by frontend `AgentTeamContext.members` and team routing, e.g. `solution_designer` / `code_reviewer`.
- Member run id: the runtime/local run id on `focusedMemberContext.state.runId`, used as an optional stale-target guard.
- Focused-member command target: `{ teamRunId, memberRouteKey, memberRunId? }` resolved at click/action time.

## Design Reading Order

1. focused-member command spine
2. frontend target resolution and transport payload
3. server command handling and backend member interrupt
4. tests and decommissioning of aggregate interrupt fallback

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: the focused team-member composer must no longer call/send team-run-only `INTERRUPT_GENERATION`.
- Existing aggregate team `interrupt()` loops must not remain on the composer path.
- Any no-target team interrupt behavior in tests must be updated or removed unless it is renamed/reintroduced as an explicit team-wide command outside this scope.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User clicks focused member composer stop | Target member runtime receives interrupt | Focused Member Command Boundary | Fixes the reported wrong-agent interrupt. |
| DS-002 | Primary End-to-End | User sends text from focused member composer | Target member runtime receives message | Existing Focused Member Send Boundary | Provides the model interrupt must match. |
| DS-003 | Return-Event | Target member runtime emits status/turn events | Focused member conversation/status updates | Streaming status/event projection | Confirms UI stop state follows the interrupted member. |

## Primary Execution Spine(s)

`Composer Stop Click -> ActiveContext Focused Member Target Resolver -> AgentTeamRunStore Member Interrupt -> TeamStreamingService Payload -> AgentTeamStreamHandler Target Validation -> TeamRun.interruptMember -> TeamBackend/TeamManager Target Member Run -> Runtime Interrupt`

Existing send comparison:

`Composer Send Click -> ActiveContext Focused Member Target Resolver -> AgentTeamRunStore.sendMessageToFocusedMember -> TeamStreamingService SEND_MESSAGE(target_member_name) -> AgentTeamStreamHandler.handleSendMessage -> TeamRun.postMessage(target) -> Target Member Run`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The stop button reads the same focused-member context that drives the visible conversation and sends a member-targeted interrupt payload to the server. The server validates the target and interrupts only that member runtime. | Composer, active context facade, team run store, team stream client, team stream handler, team run, team backend manager, member run | Focused Member Command Boundary | Target validation, stale target guard, stream connection lookup, status projection |
| DS-002 | Text send already captures `focusedMemberName` and sends it as the team message target. Interrupt must mirror this shape instead of using aggregate team id only. | Composer, active context facade, team run store, team stream client, team stream handler, team run, member run | Focused Member Send Boundary | Attachment finalization, restore-aware send behavior |
| DS-003 | After member interrupt, backend emits member-scoped lifecycle/status events; frontend maps them by `agent_name`/`agent_id` to the correct member context and only the targeted member loses interrupt affordance. | Member runtime, team event stream, TeamStreamingService dispatcher, member context state | Streaming Projection | Event identity mapping, activity updates |

## Spine Actors / Main-Line Nodes

- `AgentUserInputTextArea.vue`: user-facing stop/send action surface.
- `activeContextStore`: active/focused context facade; resolves whether selection is single-agent or team-member.
- `agentTeamRunStore`: frontend team command owner; owns stream lookup and member command dispatch.
- `TeamStreamingService`: WebSocket transport client for team commands/events.
- `AgentTeamStreamHandler`: server WebSocket command boundary.
- `TeamRun`: server domain boundary for team runtime commands.
- `TeamRunBackend` / `TeamManager`: backend-specific team runtime owner.
- `AgentRun`: target member runtime command boundary.

## Ownership Map

- `AgentUserInputTextArea.vue` owns the button interaction only; it must not decide team/member routing.
- `activeContextStore` owns active selection interpretation and must resolve the focused-member target for active-context commands.
- `agentTeamRunStore` owns team stream command submission and must require a member target for focused-member interruption.
- `TeamStreamingService` owns wire serialization; it must serialize member interrupt payloads, not infer targets.
- `AgentTeamStreamHandler` owns server command validation and active-only command routing.
- `TeamRun` owns domain-level team command API shape.
- `TeamRunBackend` / `TeamManager` owns backend-specific member lookup and runtime interruption.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentUserInputTextArea.handlePrimaryAction` | `activeContextStore` | UI event entrypoint | Target routing or team/member identity fallback |
| `TeamStreamingService.interruptGeneration` | `AgentTeamStreamHandler` + `TeamRun` | Transport serialization | Defaulting to team-wide interrupt |
| `AgentTeamStreamHandler.handleMessage` | Command-specific handlers | WebSocket session entrypoint | Restoring stopped runs for active-only control commands |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Composer path calling `agentTeamRunStore.interruptGeneration(teamRunId)` without member target | It cannot honor focused member semantics | `activeContextStore` + `agentTeamRunStore.interruptFocusedMemberGeneration(...)` | In This Change | No silent team-wide fallback. |
| `TeamStreamingService.interruptGeneration()` no-payload team command for team endpoint | It is ambiguous for member composer stop | Member-targeted interrupt payload | In This Change | Single-agent `AgentStreamingService.interruptGeneration()` remains separate. |
| Server `AgentTeamStreamHandler` team interrupt handler calling `activeRun.interrupt()` for composer interrupt | It interrupts aggregate/team members, not focused member | `activeRun.interruptMember(...)` / backend member interrupt | In This Change | Existing no-target tests must be updated/removed. |
| Codex/Claude/Mixed manager member-run loop for UI interrupt | It creates wrong-member/all-member behavior | `interruptMember(targetMemberName, targetMemberRunId?)` | In This Change | Team-wide command can be designed later as explicit control if needed. |

## Return Or Event Spine(s) (If Applicable)

`Target Member Runtime -> Agent/Team Event -> AgentTeamStreamHandler.convertTeamEvent -> TeamStreamingService.dispatchMessage -> memberContext.state.currentStatus/canInterrupt -> focused member UI status/button`

Only member-scoped status for the interrupted run should clear that member's `canInterrupt`. Other running members should remain running/interruptible.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `TeamStreamingService`
  - `WebSocket message -> parseServerMessage -> getMemberContext(agent_name/agent_id) -> dispatch handler -> member state update`
  - This matters because validation must prove the returned interrupt/status events update the same member that was targeted.
- Parent owner: backend `TeamManager`
  - `target route key/name -> member context -> ensure active member run -> memberRun.interrupt() -> publish status`
  - This replaces the existing aggregate `for memberRuns.values()` loop.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Focused-member target validation | DS-001 | `activeContextStore`, `AgentTeamStreamHandler` | Ensure teamRunId + member route key are present and optionally match memberRunId | Prevent stale/ambiguous interrupt | Silent fallback to wrong target |
| Stream connection lookup | DS-001, DS-002 | `agentTeamRunStore` | Resolve active team WebSocket service by teamRunId | Keeps transport concern out of UI | UI starts owning stream lifecycle |
| Backend member lookup | DS-001 | `TeamManager` | Resolve target member by stable route key/name and optional run id | Keeps runtime ownership server-side | Server handler duplicates backend context logic |
| Status/event projection | DS-003 | `TeamStreamingService` / handlers | Apply returned events to correct member context | Confirms UI follows target | Activity/status drift across members |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Active focused context resolution | `activeContextStore` | Extend | Already owns active single-agent vs team-member facade | N/A |
| Team command dispatch | `agentTeamRunStore` | Extend | Already owns team stream commands | N/A |
| Team WebSocket protocol | `TeamStreamingService` + protocol types | Extend | Existing transport owner | N/A |
| Server team command handling | `AgentTeamStreamHandler` | Extend | Existing WebSocket command owner | N/A |
| Runtime member command execution | `TeamRun` / `TeamRunBackend` / `TeamManager` | Extend | Existing backend runtime command owner | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend active context facade | Focused target resolution for composer commands | DS-001, DS-002 | `activeContextStore` | Extend | Send and interrupt must share target model. |
| Frontend team run command store | Member command dispatch to team stream | DS-001, DS-002 | `agentTeamRunStore` | Extend | Add member interrupt method requiring target. |
| Team WebSocket client/protocol | Member interrupt payload serialization | DS-001 | `TeamStreamingService` | Extend | Add payload to `INTERRUPT_GENERATION` on team endpoint. |
| Server team streaming | Active-only member command validation | DS-001 | `AgentTeamStreamHandler` | Extend | No restore/no fallback for interrupt. |
| Team execution backend | Member-scoped runtime interrupt | DS-001 | `TeamRunBackend` / `TeamManager` | Extend | Remove aggregate loop from composer path. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/activeContextStore.ts` | Active context facade | Active context command boundary | Resolve focused-member target for interrupt and call team store | Existing command facade | May use local target object/type |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Team command store | Frontend team command boundary | Require focused member target and call stream interrupt | Existing team command owner | Yes |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Team WebSocket client | Transport command facade | Serialize `INTERRUPT_GENERATION` with target payload | Existing transport owner | Protocol payload type |
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | Team protocol types | Client message schema | Add interrupt payload type | Existing schema file | Yes |
| `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | Server WebSocket command | Active-only team command handler | Validate target payload and call member interrupt | Existing command handler | Payload parser helper may be local |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts` | Team domain | Domain command boundary | Add `interruptMember(...)` | Existing domain owner | Backend interface |
| `autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend.ts` | Backend interface | Backend command contract | Require member-scoped interrupt | Existing contract owner | Shared signature |
| `autobyteus-server-ts/src/agent-team-execution/backends/team-manager.ts` | Runtime manager interface | Team manager command contract | Require member-scoped interrupt | Existing contract owner | Shared signature |
| Concrete team backend/manager files | Runtime-specific team execution | Runtime member command owner | Implement member lookup + `memberRun.interrupt()` / native target interrupt | Existing runtime owners | Shared helper pattern |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Focused-member command target shape | Inline type in `agentTeamRunStore.ts` or small exported type if reused | Frontend team command store | Used by active context and team store | Yes | Yes | Generic team command bag |
| Team interrupt payload shape | `messageTypes.ts` | Team WebSocket protocol | Used by `TeamStreamingService` and tests | Yes | Yes | Optional kitchen-sink payload |
| Backend target extraction | Local helper in `agent-team-stream-handler.ts` | Server stream handler | Used only by interrupt command | Yes | Yes | Cross-command generic parser |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Focused member interrupt target | Yes | Yes | Low | Fields: `teamRunId`, `targetMemberName`/route key, optional `targetAgentRunId`. |
| Team interrupt payload | Yes | Yes | Medium due existing `target_member_name` name | Document/use value as stable member route key; optionally include `agent_id` only as stale guard. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/activeContextStore.ts` | Active context facade | Active context command boundary | Build focused-member interrupt target at click time; single-agent path unchanged | Existing owner of active context commands | Focused target shape |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Team command store | Team stream command boundary | Replace generic `interruptGeneration(teamRunId?)` composer path with member-required interrupt method | Existing team command owner | Focused target shape |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Team WebSocket client | Transport serialization | Send member-targeted interrupt payload | Existing team transport owner | Protocol type |
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | Protocol schema | Client message type owner | Define `InterruptGenerationPayload` for team endpoint | Existing protocol owner | Payload schema |
| `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | Server stream command handler | Active-only command boundary | Require interrupt target payload and call `TeamRun.interruptMember(...)` | Existing command owner | Local extraction helper |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts` | Domain team run | Domain command boundary | Expose member-scoped interrupt; no target fallback | Existing domain owner | Backend signature |
| `autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend.ts` | Backend interface | Runtime command contract | Add/replace with member-scoped interrupt method | Existing interface owner | Signature |
| `autobyteus-server-ts/src/agent-team-execution/backends/team-manager.ts` | Team manager interface | Runtime manager command contract | Add/replace with member-scoped interrupt method | Existing interface owner | Signature |
| `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-manager.ts` | Codex team runtime | Member runtime command owner | Resolve target member and call only that `AgentRun.interrupt()` | Existing runtime owner | Lookup helpers |
| `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-manager.ts` | Claude team runtime | Member runtime command owner | Resolve target member and call only that `AgentRun.interrupt()` | Existing runtime owner | Lookup helpers |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | Mixed team runtime | Member runtime command owner | Resolve target member and call only that `AgentRun.interrupt()` | Existing runtime owner | Lookup helpers |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts` | Native AutoByteus team runtime | Native team command owner | Call native `team.interrupt({ reason, targetMemberName })` with target | Existing runtime owner | Native target support |

## Ownership Boundaries

The authoritative focused-member command boundary is `activeContextStore` on the frontend and `AgentTeamStreamHandler`/`TeamRun` on the server. Upstream UI components must not call lower-level streams with inferred or stale identities. Server handlers must not bypass `TeamRun` and reach into backend member maps directly.

The backend `TeamManager` owns member lookup and runtime lifecycle. Server stream handler only validates payload shape and delegates the member command.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `activeContextStore.interruptGeneration` | Selected type, focused member context, member run id | Composer UI | UI reading team store and calling stream directly | Add explicit focused target return/command shape |
| `agentTeamRunStore` member interrupt method | Stream lookup and team service command call | `activeContextStore` | Active context calling `TeamStreamingService` directly | Strengthen store method signature |
| `AgentTeamStreamHandler` | WebSocket session, active-only command validation | WebSocket API | Backend managers parsing raw WebSocket payload | Add command-specific payload extractor |
| `TeamRun.interruptMember` | Backend dispatch | Stream handler | Handler reaching into backend manager internals | Add domain method |
| `TeamManager.interruptMember` | Member lookup and member run lifecycle | Team backend | Backend looping all members for member command | Add target member method |

## Dependency Rules

Allowed:

- UI -> `activeContextStore`.
- `activeContextStore` -> `agentTeamRunStore` / `agentRunStore`.
- `agentTeamRunStore` -> `TeamStreamingService`.
- `TeamStreamingService` -> protocol serialization only.
- `AgentTeamStreamHandler` -> `TeamRun` domain API.
- `TeamRun` -> `TeamRunBackend`.
- Concrete backend -> `TeamManager` or native team API.
- `TeamManager` -> target `AgentRun`.

Forbidden:

- Composer stop button sending a team-run-only interrupt.
- Team WebSocket interrupt with missing member target for member composer actions.
- Server no-target fallback to coordinator, focused member guessed server-side, first running member, or all member runs.
- Backend aggregate member loop as implementation of focused-member interrupt.
- Using display-only names when a stable route key/run id is available.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `activeContextStore.interruptGeneration()` | Active single-agent or focused team member | Dispatch active-context interrupt | Single-agent: run id from active context. Team: focused member target `{ teamRunId, memberRouteKey, memberRunId? }` | Resolve at click time. |
| `agentTeamRunStore.interruptFocusedMemberGeneration(target)` | Focused team member command | Send member interrupt over active team stream | `teamRunId`, `targetMemberName`/route key, optional `targetAgentRunId` | No default active-team fallback. |
| `TeamStreamingService.interruptGeneration(target)` | Team WebSocket interrupt command | Serialize target payload | `target_member_name` and optional `agent_id` | Team endpoint only. |
| `AgentTeamStreamHandler.handleInterruptGeneration(teamRunId, payload)` | Server active team command | Validate payload and delegate | Required target member; optional member run id guard | No restore and no fallback. |
| `TeamRun.interruptMember(targetMemberName, targetMemberRunId?)` | Team domain command | Interrupt one team member | Stable member route key/name, optional run id | Mirrors `postMessage(target)`. |
| `TeamRunBackend.interruptMember(...)` / `TeamManager.interruptMember(...)` | Backend runtime command | Execute member interrupt | Backend member context identity | Concrete runtimes implement. |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- Split boundaries by subject or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Current team `INTERRUPT_GENERATION` | No | No | High | Add required member payload for team endpoint. |
| Target team `INTERRUPT_GENERATION` | Yes | Yes | Low/Medium | Require member target; optional run id guard. |
| Current backend `interrupt()` | No for focused-member action | No | High | Add/replace with `interruptMember(...)`. |
| Existing `SEND_MESSAGE` | Mostly yes | Medium due field name | Medium | Keep behavior but use same target resolver; document route-key semantics. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Focused member command target | Proposed `FocusedTeamMemberCommandTarget` | Yes | Low | Use only if shared across files. |
| Team no-target interrupt | Current `interruptGeneration` | No for team member action | High | Require target or rename explicit team-wide command outside scope. |
| Backend member interrupt | Proposed `interruptMember` | Yes | Low | Add to domain/backend contracts. |

## Applied Patterns (If Any)

- Facade: `activeContextStore` remains the UI-facing active-context facade.
- Adapter/transport: `TeamStreamingService` adapts typed frontend command calls to WebSocket messages.
- Domain boundary: `TeamRun` mediates server command ownership before backend-specific execution.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue` | File | Composer UI | Continue delegating stop/send to active context store | UI owns interaction only | Routing logic |
| `autobyteus-web/stores/activeContextStore.ts` | File | Active context facade | Resolve focused member target for interrupt; preserve single-agent behavior | Existing active-context command owner | Direct WebSocket calls |
| `autobyteus-web/stores/agentTeamRunStore.ts` | File | Team command store | Add member-required interrupt command; remove composer path to no-target interrupt | Existing team command owner | UI display concerns |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | File | Team WebSocket transport | Serialize member-targeted interrupt payload | Existing transport owner | Focus state lookup |
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | File | Protocol schema | Define team interrupt payload | Existing schema owner | Runtime logic |
| `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` | File | Frontend transport tests | Assert interrupt payload contains target | Existing transport test location | Store tests |
| `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` | File | Frontend store tests | Assert focused member target is sent and no-target is rejected | Existing store test location | Backend behavior |
| `autobyteus-web/components/agentInput/__tests__/AgentUserInputTextArea.spec.ts` | File | Composer tests | Preserve button calling active context and disabled behavior | Existing UI test location | Team protocol assertions |
| `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | File | Server command handler | Parse/validate target payload and call member interrupt | Existing stream handler | Backend member maps |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts` | File | Server handler tests | Assert targeted interrupt and missing-target rejection | Existing handler test location | Runtime-specific tests |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts` | File | Team domain | Add member interrupt domain method | Existing domain owner | WebSocket payload parsing |
| `autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend.ts` | File | Backend interface | Add member interrupt signature | Existing interface owner | Concrete runtime logic |
| `autobyteus-server-ts/src/agent-team-execution/backends/team-manager.ts` | File | Team manager interface | Add member interrupt signature | Existing manager contract | WebSocket concerns |
| `autobyteus-server-ts/src/agent-team-execution/backends/{codex,claude,mixed}/*team-manager.ts` | Files | Runtime-specific team managers | Interrupt exactly target member run | Existing runtime owners | Aggregate fallback loop for member command |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts` | File | Native AutoByteus backend | Pass native target member interrupt option | Existing native backend owner | Fallback no-target team interrupt for composer |
| Relevant backend integration tests under `autobyteus-server-ts/tests/integration/agent-team-execution` and WebSocket tests | Files | Validation | Prove only target member is interrupted | Existing validation layout | Pure frontend assertions |

## Migration / Refactor Sequence

1. Add/adjust frontend protocol type for team interrupt payload.
2. Update `TeamStreamingService.interruptGeneration(...)` to require target payload for team endpoint.
3. Update `agentTeamRunStore` with a member-targeted interrupt method and reject missing target/stream.
4. Update `activeContextStore.interruptGeneration()` to build the same focused-member target used by send and call the new team method.
5. Update server `AgentTeamStreamHandler` to pass interrupt payload and reject missing target.
6. Add `interruptMember(...)` through `TeamRun`, `TeamRunBackend`, and `TeamManager` contracts.
7. Implement target member interrupt in AutoByteus, Codex, Claude, and Mixed team backends/managers.
8. Remove or update no-target team interrupt tests and any aggregate-loop assumptions.
9. Add frontend and backend regression tests for `solution_designer` running + switch to `code_reviewer` + interrupt targets `code_reviewer` only.
10. Run focused frontend/backend tests, then broader impacted suites.
