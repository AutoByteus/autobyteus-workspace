# Design Spec

## Current-State Read

The current team workspace has two focus concepts that are accidentally mixed in the send path:

- **Roster / visible focus**: `AgentTeamContext.focusedMemberRouteKey`. This is changed when the user clicks a member in the left team tree or team workspace views. In the reported screenshot it is `code_reviewer`.
- **Active-execution focus**: `activeExecutionFocusedMemberRouteKey`, computed by `utils/teamActiveExecutionMembers.ts`. This is a filtered execution/display safety policy that excludes offline non-coordinator members unless they already have visible conversation/activity, and then falls back to the coordinator.

For a new temporary team run, every member is offline and has no conversation. `teamActiveExecutionMembers.ts` therefore includes the coordinator but excludes focused offline non-coordinators. `activeContextStore.activeAgentContext` and `agentTeamRunStore.sendMessageToFocusedMember(...)` both consume active-execution focus, so the composer/send path targets `solution_designer` even when the visible focused member is `code_reviewer`.

The backend is not the primary cause. `TeamStreamingService.sendMessage(...)` can send `target_member_route_key`; `agent-team-stream-handler.ts` parses it; `TeamRun.postMessage(...)` preserves an explicit target and only falls back to coordinator when the target is null; `MixedTeamManager.postMessage(...)` resolves and lazily starts the selected member handle.

## Intended Change

Make the frontend user-message target explicit and visible-focus-led:

- If the user focuses a valid sendable team member and clicks send, route the message to that focused member.
- Do not silently replace a valid focused non-coordinator member with the coordinator because it is offline or because this is the first message.
- Keep active-execution filtering for execution display/status concerns, but stop treating it as the user-message target owner.
- Preserve backend route-key protocol and backend coordinator fallback for missing/null targets; the frontend should send an explicit route key for valid focused members.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, bounded frontend refactor
- Evidence:
  - `activeContextStore.ts` uses `activeExecutionFocusedMemberContext` for team composer context.
  - `agentTeamRunStore.ts` sends `activeExecutionFocusedMemberRouteKey` as the WebSocket target.
  - `teamActiveExecutionMembers.ts` filters offline non-coordinators and falls back to coordinator.
  - Backend route-key paths preserve explicit targets.
- Design response: Introduce a small frontend-owned team user-message target resolver and use it in both composer active-context selection and team message submission.
- Refactor rationale: The same subject, "who will receive the user's typed message," must have one owner. Reusing the active-execution display fallback as the send target is the boundary error.
- Intentional deferrals and residual risk, if any:
  - Broader redesign of active-execution display filtering is deferred; it remains useful for runtime/status presentation.
  - Task-agent instance direct user-send behavior remains outside this fix unless implementation finds the new resolver must explicitly reject it. Ordinary task lifecycle remains handled by existing task-agent paths.

## Terminology

- `Roster focus` / `visible focus`: `AgentTeamContext.focusedMemberRouteKey`, set by user selection in team UI.
- `Active-execution focus`: filtered execution/display target from `teamActiveExecutionMembers.ts`.
- `User-message target`: the member route key that receives the user's composer submission.
- `Sendable focused member`: a focused route key that resolves to a real team member node. A leaf agent requires a corresponding `AgentContext`; an `agent_team` node can remain targetable through the existing subteam send path.

## Design Reading Order

Read this design from:

1. the user-message target spine,
2. ownership split between visible focus, active-execution focus, and message target,
3. concrete frontend resolver/store/component mapping,
4. durable regression coverage.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Remove the in-scope behavior where a valid focused offline non-coordinator is silently replaced by coordinator during user send.
- No compatibility switch or dual mode should preserve the old first-send coordinator-forcing behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User clicks member and sends composer text | Backend member runtime receives `AgentInputUserMessage` | Frontend team user-message target resolver + existing backend team run routing | This is the reported bug path. |
| DS-002 | Return-Event | Backend member input/status events | Frontend focused member conversation/status projection | Existing team streaming event handlers | Ensures the message appears under the same focused member after send. |
| DS-003 | Bounded Local | Team target resolution inside frontend store/composer | Explicit route key/context for send | New resolver utility | Prevents active-execution display fallback from owning send semantics. |

## Primary Execution Spine(s)

`User member focus -> AgentTeamContext roster focus -> Team user-message target resolver -> agentTeamRunStore send -> TeamStreamingService SEND_MESSAGE target_member_route_key -> backend TeamRun explicit target -> MixedTeamManager target member handle`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The user selects a member, the team context records that visible focus, the send path resolves the focused member as the user-message target, the WebSocket command carries that route key, and backend starts/posts to that member. | UI focus, team context, user-message target, send command, backend team run, member handle | Frontend resolver for target selection; backend TeamRun for explicit target execution | Context-file finalization, optimistic local submission, run-id reconciliation |
| DS-002 | The backend emits member-input/status events with source route/path; existing streaming handlers route those events back to the matching member context. | Backend event, WebSocket stream, frontend member context | Existing team streaming handlers | Dedupe keys, activity projection |
| DS-003 | The frontend resolves target once from the visible focus and exposes a context/route/node shape to stores/components. | Team context, focused member node/context, target route | New `teamUserMessageTarget` utility | Validation of stale focus and unsupported task-agent direct sends |

## Spine Actors / Main-Line Nodes

- User-selected team member / roster focus
- `AgentTeamContext`
- Team user-message target resolver
- `activeContextStore` composer context
- `agentTeamRunStore` send operation
- `TeamStreamingService` WebSocket command
- Backend `AgentTeamStreamHandler` / `TeamRun`
- `MixedTeamManager` / member handle

## Ownership Map

- `AgentTeamContext`: owns the visible focused member route key and team member maps.
- `teamActiveExecutionMembers.ts`: owns active-execution display/filtering only; it must not govern ordinary user-message targets.
- New `teamUserMessageTarget.ts`: owns the semantic question "where should this user's composer message go?"
- `activeContextStore`: owns generic composer facade and must consume the user-message target for team composer state.
- `agentTeamRunStore`: owns launch/restore/send orchestration and must use the same user-message target for draft ownership, optimistic message, final attachment owner, and WebSocket route key.
- Backend `TeamRun`: owns backend fallback only when no explicit target is supplied; it remains unchanged for explicit targets.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `activeContextStore.activeAgentContext` | `teamUserMessageTarget` for team composer target | Provides a common composer facade for single-agent and team-member contexts | Active-execution fallback policy for ordinary team sends |
| `agentTeamRunStore.sendMessageToFocusedMember` | `teamUserMessageTarget` + backend TeamRun explicit target | Existing public action for team sends | Independent target resolution that can diverge from the composer context |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Send-path dependence on `activeExecutionFocusedMemberRouteKey` for valid focused member sends | It causes coordinator fallback for valid offline non-coordinator focus | New `teamUserMessageTarget` resolver | In This Change | Active-execution utility remains for display/status use. |
| Test expectation that all-offline focused non-coordinator composer context is coordinator | It codifies the bug | Updated active-context/send regression tests | In This Change | Preserve or move active-execution-specific tests if still needed. |
| Any duplicate ad hoc focused-route validation added in components/stores | Prevents future divergence | Shared resolver utility | In This Change | Keep target shape explicit. |

## Return Or Event Spine(s) (If Applicable)

`MixedAgentMemberHandle.publishMemberInput -> TeamRun event -> AgentTeamStreamHandler.convertTeamEvent -> TeamStreamingService handlers -> focused member conversation projection`

The return/event spine should remain unchanged; only the target route key feeding the backend send changes.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `teamUserMessageTarget` utility
- Local chain: `teamContext -> normalize focused route -> resolve node -> resolve leaf context if needed -> validate sendability -> return target or null`
- Why it matters: all send/composer callers must receive the same route/context decision.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Context-file draft/final owner mapping | DS-001 | `agentTeamRunStore` | Move attachment ownership from temporary draft target to final team member target | Attachments must follow the actual recipient | Files can be finalized under coordinator while message targets another member. |
| Optimistic local submission | DS-001, DS-002 | `agentTeamRunStore` | Show user message under target member before backend events settle | Immediate UI feedback | Message appears in the wrong member conversation. |
| Active-execution display filtering | DS-001 | `teamActiveExecutionMembers.ts` | Runtime display/status candidate filtering | Useful for running/task-agent visibility | If reused for send, it overrides user intent. |
| Backend coordinator fallback | DS-001 | `TeamRun` | Provide backend default when command has no target | Existing defensive default | If frontend relies on it for valid focus, explicit user intent is lost. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Active runtime display member filtering | `utils/teamActiveExecutionMembers.ts` | Reuse unchanged | Still correct for execution/status presentation | N/A |
| User-message target resolution | None with correct semantics | Create New | Current active-execution resolver has different ownership and causes bug | Existing resolver owns display safety, not user send intent. |
| Backend target execution | `TeamRun` + `MixedTeamManager` | Reuse | Already accepts explicit route-key targets | N/A |
| Context-file owner mapping | Existing context-file owner utilities | Reuse | They work once supplied the correct route key | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend team target resolution | User-message target selection from visible focus | DS-001, DS-003 | Composer and send stores | Create New | Small utility under `autobyteus-web/utils`. |
| Frontend active context facade | Composer context selection | DS-001 | `activeContextStore` | Extend | Consume resolver for team contexts. |
| Frontend team run sending | Launch/restore/send orchestration | DS-001 | `agentTeamRunStore` | Extend | Consume resolver once and use target consistently. |
| Backend team execution | Explicit target routing and member startup | DS-001, DS-002 | `TeamRun`, `MixedTeamManager` | Reuse | No protocol change needed. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/teamUserMessageTarget.ts` | Frontend team target resolution | User-message target resolver | Resolve focused route/node/context for ordinary user sends | One small focused policy | Uses `AgentTeamContext`, `AgentContext`, `TeamMemberNode`. |
| `autobyteus-web/stores/activeContextStore.ts` | Frontend active context facade | Composer facade | Use target resolver for team active composer context | Existing facade entrypoint | Yes, resolver. |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Frontend team run sending | Send orchestrator | Use target resolver for target route, local submission, attachment owners | Existing launch/send owner | Yes, resolver. |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | Team workspace UI | Shared composer presentation | Ensure shared composer target label/context follows visible focused member | Current view owner | Uses store getters/resolver indirectly. |
| Tests under `autobyteus-web/stores/__tests__` and `autobyteus-web/utils/__tests__` | Durable coverage | Regression coverage | Assert focused-member send target for all-offline/new teams | Existing test placement | Resolver tests reuse fixtures. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Focused member route/node/context validation | `autobyteus-web/utils/teamUserMessageTarget.ts` | Frontend team target resolution | Needed by composer and send store | Yes | Yes | A generic runtime status resolver or active-execution display replacement |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamUserMessageTarget` | Yes | Yes | Low | Fields should be limited to `memberRouteKey`, `node`, `context`, and a small `targetKind/source` if useful for tests/errors. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/teamUserMessageTarget.ts` | Frontend team target resolution | User-message target boundary | Resolve visible focused team member into a send target or null | Prevents duplicated target policy | N/A |
| `autobyteus-web/stores/activeContextStore.ts` | Frontend active context facade | Composer context facade | For teams, expose the focused leaf member context resolved by user-message target; do not expose coordinator just because active execution falls back | Existing common composer entrypoint | `teamUserMessageTarget.ts` |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Frontend team run sending | Send orchestrator | Use the resolved user-message target for launch/send/attachments/optimistic message | Existing owner of send side effects | `teamUserMessageTarget.ts` |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | Team workspace UI | Team composer presentation | Keep shared composer and target label aligned with visible focus where component-level logic currently uses active-execution focus | Component owns view-specific rendering | Store/resolver result |
| `autobyteus-web/utils/__tests__/teamUserMessageTarget.spec.ts` | Frontend target coverage | Resolver unit tests | Valid focused offline non-coordinator, coordinator focus, invalid focus, subteam behavior if supported | Direct unit coverage for policy owner | N/A |
| `autobyteus-web/stores/__tests__/activeContextStore.spec.ts` | Frontend store coverage | Composer facade tests | Team active composer context follows valid focused member in all-offline/new team | Existing store test area | N/A |
| `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` | Frontend send coverage | Send target integration tests | Temporary team first send emits focused target route key | Existing send action coverage | N/A |

## Ownership Boundaries

- `teamActiveExecutionMembers.ts` is not removed, but its boundary is tightened to execution display/status concerns.
- `teamUserMessageTarget.ts` becomes the authoritative frontend boundary for ordinary user message target selection.
- `activeContextStore` and `agentTeamRunStore` must both depend on `teamUserMessageTarget.ts`, not each independently reimplement focused-member validation.
- Backend `TeamRun` remains the authoritative backend execution boundary; frontend does not bypass backend fallback internals.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `teamUserMessageTarget.ts` | Focused route normalization, node/context lookup, sendability validation | `activeContextStore`, `agentTeamRunStore`, any team composer component needing target labels | Directly using `activeExecutionFocusedMemberRouteKey` as send target | Extending resolver return shape with target label/error reason |
| `TeamRun.postMessage(...)` | Backend explicit-target fallback and backend routing | WebSocket handler and backend service callers | Frontend guessing backend coordinator fallback for valid focus | Passing explicit route key or surfacing no valid target |

## Dependency Rules

- `activeContextStore` may import the new resolver and `useAgentTeamContextsStore`.
- `agentTeamRunStore` may import the new resolver and must use its result for all target-dependent side effects.
- `teamUserMessageTarget.ts` may import type-only frontend team/context types and, if needed, `resolveActiveExecutionFocusedMemberRouteKey` only for non-send fallback diagnostics; it should not use active-execution fallback to override a valid focused member.
- Components should prefer store state/resolver output instead of reproducing route-key validation.
- Backend files should not be changed to compensate for frontend target loss unless tests reveal an independent backend issue.

Forbidden shortcuts:

- Do not send `activeExecutionFocusedMemberRouteKey` for ordinary user messages when `focusedMemberRouteKey` resolves to a valid focused member.
- Do not add scalar target fields such as `targetMemberName`; backend intentionally rejects those.
- Do not add compatibility flags that preserve old coordinator-forcing behavior.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `resolveTeamUserMessageTarget(teamContext)` | Frontend user-message target | Resolve target route/node/context from visible focus | `AgentTeamContext` with `focusedMemberRouteKey` | New utility. Return null/error reason for invalid focus. |
| `activeContextStore.activeAgentContext` | Composer context | Expose current editable context | `AgentContext | null` | For teams, should come from user-message target context. |
| `agentTeamRunStore.sendMessageToFocusedMember(text, attachments)` | Team user send | Launch/restore/send to resolved target | Internal route key from resolver | Name can remain for compatibility, but behavior must be visible-focus-led. |
| WebSocket `SEND_MESSAGE` | Backend team member command | Carry explicit member target | `target_member_route_key` or `targetMemberRouteKey` | Existing protocol. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `resolveTeamUserMessageTarget` | Yes | Yes | Low | Keep route-key/node/context semantics narrow. |
| `activeContextStore.activeAgentContext` | Mostly | Yes | Medium currently | Consume resolver so composer context is not active-execution fallback. |
| WebSocket `SEND_MESSAGE` | Yes | Yes | Low | Preserve route-key target. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| User message target resolver | `teamUserMessageTarget` / `resolveTeamUserMessageTarget` | Yes | Low | Avoid vague names like `teamFocusHelper`. |
| Active-execution resolver | `teamActiveExecutionMembers` | Yes | Medium | Keep it out of send target path. |
| Roster focus | `focusedMemberRouteKey` | Yes | Low | Treat as user-visible focus. |

## Applied Patterns (If Any)

- Resolver: The new utility is a small resolver boundary, not a service. It owns a single policy: user-message target selection from visible team focus.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/teamUserMessageTarget.ts` | File | Frontend team target resolution | Resolve focused member send target | Existing team utilities live under `utils`; this is UI/domain utility | Backend protocol serialization or runtime status aggregation |
| `autobyteus-web/stores/activeContextStore.ts` | File | Active composer facade | Consume resolver for team composer context | Already owns common composer facade | Local target fallback duplication |
| `autobyteus-web/stores/agentTeamRunStore.ts` | File | Team run send orchestration | Consume resolver for target route and context side effects | Already owns launch/send side effects | Target selection policy copy |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | File | Team workspace presentation | Align composer target display with focused member | Existing owner of team workspace header/shared composer | Independent message routing policy |
| `autobyteus-web/utils/__tests__/teamUserMessageTarget.spec.ts` | File | Resolver tests | Unit coverage for target policy | Keeps target policy tests near owner | Store launch mocks |
| `autobyteus-web/stores/__tests__/activeContextStore.spec.ts` | File | Store facade tests | Composer context coverage | Existing store test | Resolver internals beyond public behavior |
| `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` | File | Send integration tests | WebSocket target coverage | Existing send action tests | Backend integration setup |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/utils` | Off-Spine Concern | Yes | Low | Existing location for focused/team utility functions. One new file is enough. |
| `autobyteus-web/stores` | Main-Line Domain-Control | Yes | Low | Stores own composer/send orchestration and consume utility. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| New team focused send | Focused route `code_reviewer` exists in `memberNodesByRouteKey` and `leafAgentContextsByRouteKey`; resolver returns `code_reviewer`; WebSocket payload has `target_member_route_key: "code_reviewer"`. | Focused route is `code_reviewer`, but active-execution route is `solution_designer`; send payload uses `solution_designer`. | Captures the reported bug exactly. |
| Invalid focus | Focused route missing; resolver returns null/error; send is blocked or surfaces an error. | Missing focus silently sends to coordinator. | Prevents hidden target substitution. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep coordinator fallback for first sends behind a flag | Would preserve historical behavior | Rejected | Always use valid visible focused member for user send. |
| Send both focused and active-execution target fields | Could let backend choose | Rejected | One explicit `target_member_route_key` from frontend resolver. |
| Leave activeContextStore on active-execution and only patch agentTeamRunStore | Smaller code diff | Rejected | Composer draft/context files could still bind to the wrong member. |

## Derived Layering (If Useful)

- Presentation: team member selection and composer UI.
- Frontend state/policy: `AgentTeamContext`, `teamUserMessageTarget`, `activeContextStore`, `agentTeamRunStore`.
- Transport: `TeamStreamingService` WebSocket payload.
- Backend execution: `AgentTeamStreamHandler`, `TeamRun`, `MixedTeamManager`.

## Migration / Refactor Sequence

1. Add `autobyteus-web/utils/teamUserMessageTarget.ts` with a narrow target return shape.
2. Add resolver unit tests for:
   - focused offline non-coordinator leaf member,
   - focused coordinator,
   - missing/stale focus,
   - focused subteam node if the current subteam send path is retained.
3. Update `activeContextStore.activeAgentContext` team branch to use resolver result for leaf-member composer context.
4. Update `agentTeamRunStore.sendMessageToFocusedMember(...)` to resolve target once and use that target for:
   - `targetMemberRouteKey`,
   - `draftOwner`,
   - `finalOwner`,
   - local optimistic submission context,
   - final member existence validation,
   - `TeamStreamingService.sendMessage(...)`.
5. Update `TeamWorkspaceView.vue` only where it currently uses active-execution focus for composer display/target label in a way that can diverge from visible focus.
6. Update tests that codify old coordinator fallback:
   - Replace the active-context all-offline expectation with visible-focused-member context.
   - Add/adjust `agentTeamRunStore` temporary team launch test so a focused non-coordinator sends that route key.
7. Run targeted frontend tests. If dependency setup is missing in the dedicated worktree, install/link workspace dependencies or run via the repository's established workspace setup before final delivery.

## Key Tradeoffs

- The design does not remove active-execution filtering globally. That avoids broad regressions in runtime display/status behavior.
- The design introduces a small explicit resolver rather than embedding `focusedMemberRouteKey` directly in every caller. This is slightly more structure but prevents duplicate policy drift.
- Invalid/stale focus should no longer silently send to coordinator; this may expose previously hidden stale-state issues, but it is safer and matches user intent.

## Risks

- Existing tests or UI flows may depend on activeContextStore always returning a coordinator context for all-offline teams. Those tests need review to distinguish composer/send semantics from active-execution display semantics.
- If a focused task-agent instance currently relies on active-execution fallback for user sends, the resolver must explicitly preserve or reject that behavior. Do not accidentally route task-agent messages to the wrong logical member.
- Subteam focus should be verified because `agent_team` targets do not have leaf `AgentContext`; the existing `subteamDraft` path may need to call the resolver with `allowSubteam: true` while regular composer context requires a leaf agent.

## Guidance For Implementation

- Prefer a clean utility over inline conditionals in stores.
- Keep backend unchanged unless a test proves explicit route-key sends are overridden server-side.
- When adding errors, include the missing/stale `focusedMemberRouteKey` so debugging is easy.
- Do not reintroduce scalar target member fields; the backend parser intentionally rejects them.
- Do not call the new resolver from `teamActiveExecutionMembers.ts`; that dependency direction would blur display filtering with send intent.
