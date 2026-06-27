# Investigation Notes — Conversation Target Addressing For Runtime Task Executions

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Design-impact rework after API/E2E live `open_tab` blocker; upstream artifacts amended for architecture review / implementation reroute.
- Investigation Goal: Determine how current frontend/backend user chat addresses team members, why runtime task participants are not currently chat-addressable, and what address model best reflects the real participant tree.
- Scope Classification (`Small`/`Medium`/`Large`): Medium-Large.
- Scope Classification Rationale: The feature crosses frontend focus/composer behavior, websocket payload schema, server command parsing, domain runtime routing, mixed backend recursion, optimistic conversation state, and durable coverage.
- Scope Summary: Introduce a recursive `ConversationTargetAddress` path model for human chat in team workspaces. Existing structural member route/path selectors become one-segment member addresses; runtime task-team and task-agent runs become typed path segments.
- Primary Questions Resolved:
  1. Current structural addressing is already path-shaped (`memberPath` / `memberRouteKey`).
  2. Runtime task-agent and task-team projections are visible but blocked from ordinary chat.
  3. Existing backend primitives can route to task agents and task-team roots but lack a unified conversation address router.
  4. A fixed five-kind model is less faithful than a typed recursive participant path.
  5. Runtime segment kind is needed to distinguish structural member names from concrete task-team/task-agent run ids.
  6. Live `open_tab` validation requires a real task-team projection; for this ticket the supported setup is an AutoByteus coordinator that exposes `delegate_task`, and its native task-delegation context must preserve visible `agent_team` descriptors.

## Request Context

The user wants a ticket because prior team-task delegation work is on `origin/personal`, but runtime task participants are still not first-class user chat targets.

The final clarified product model is simple and recursive:

```text
active parent team run
└─ typed participant path
   ├─ structural member segment(s)
   ├─ concrete task-team run segment(s)
   └─ concrete task-agent run segment(s)
```

The user explicitly clarified that there is no fundamental conceptual difference between deep structural team member addressing and runtime task-team/task-agent addressing. The design should represent reality with typed path segments instead of inventing special-case fixed target kinds.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git monorepo/worktree setup.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing`
- Current Branch: `codex/conversation-target-addressing`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `origin/personal` fetched before and during bootstrap verification; `HEAD=820bce31`, `origin/personal=820bce31`.
- Task Branch: `codex/conversation-target-addressing`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal` / `origin/personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents:
  - Do not implement the earlier five-fixed-kind draft. The approved model is recursive typed path segments.
  - Preserve scalar selector rejection.
  - Treat task lifecycle commands and ordinary chat as separate behaviors.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-27 | Command | `git fetch origin personal`; `git status --short --branch`; `git rev-parse --short HEAD`; `git rev-parse --short origin/personal` | Verify dedicated worktree and base. | Worktree on `codex/conversation-target-addressing`; `HEAD` and `origin/personal` both `820bce31`. | No |
| 2026-06-27 | Code | `autobyteus-web/utils/teamDefinitionMembers.ts` | Verify current structural addressing. | Builds nested `memberPath` and `memberRouteKey = memberPath.join('/')`; indexes all nested nodes by route key. | No |
| 2026-06-27 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/team-run-member-identity.ts` | Verify server selector model. | `TeamMemberSelector` supports `path` or `route_key`; route key is normalized slash path. | No |
| 2026-06-27 | Code | `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Inspect frontend `SEND_MESSAGE` serialization. | Sends only `target_member_route_key`; no typed runtime address. | Yes — add address payload support. |
| 2026-06-27 | Code | `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | Inspect protocol types. | `SendMessagePayload` has flat structural selector aliases. `ToolActionPayload` has task runtime fields but is command-specific. | Yes — define chat-specific address shape. |
| 2026-06-27 | Code | `autobyteus-web/utils/teamUserMessageTarget.ts` | Inspect focused target resolution. | Blocks task-team/task-child focus via `task_execution_focus`; target model is route-only. | Yes — replace with conversation address resolver. |
| 2026-06-27 | Code | `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | Inspect composer visibility. | Composer hidden for task-agent/task-team/task-child projections. | Yes — base visibility on addressability. |
| 2026-06-27 | Code | `autobyteus-web/stores/agentTeamRunStore.ts` | Inspect frontend send action and optimistic placement. | Uses one `targetMemberRouteKey` for upload owners, dedupe keys, local messages, and websocket payload. | Yes — introduce canonical target key/address. |
| 2026-06-27 | Code | `autobyteus-web/types/agent/AgentTeamContext.ts` | Inspect projection metadata. | Nodes carry task-agent, task-team root, and task-team child identity fields. | Yes — resolver should derive typed segments from these fields or store full segments. |
| 2026-06-27 | Code | `autobyteus-web/services/agentStreaming/teamTaskTeamExecutionProjection.ts` and `teamTaskTeamChildProjection.ts` | Inspect task-team projection route keys. | Task-team roots keyed by `taskTeamRunId`; child projections use scoped UI keys like `<taskTeamRunId>/<relativeRouteKey>`. | Yes — do not treat scoped UI keys as untyped backend route. |
| 2026-06-27 | Code | `autobyteus-server-ts/src/services/agent-streaming/team-command-selector-parser.ts` | Inspect server command parser. | `SEND_MESSAGE` accepts flat route/path aliases and rejects scalar selector fields. | Yes — normalize flat selectors to one-segment address. |
| 2026-06-27 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | Inspect server websocket handler. | Calls `teamRun.postMessage(userMessage, targetSelector)`; no runtime path. | Yes — call `TeamRun` address boundary. |
| 2026-06-27 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts` | Inspect domain boundary. | Has `postMessage`, `postMessageToTaskTeamInstance`, optional task-agent run id in `postMessage`. | Yes — add unified address boundary. |
| 2026-06-27 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | Inspect backend routing. | Routes task-agent run id via task-agent registry; routes task-team run id via task-team registry. | Yes — add one segment router instead of duplicating logic in handler. |
| 2026-06-27 | Code | `mixed-task-team-instance-registry.ts`, `mixed-task-team-member-handle.ts`, `mixed-sub-team-member-handle.ts` | Inspect child-run entry boundaries. | Task-team handle can enter child `TeamRun`; subteam handle can enter structural child `TeamRun`. | Yes — recursive router should reuse these handles/boundaries. |
| 2026-06-27 | Test | Existing tests found by `rg "BuildSquad/review_lead|targetMemberPath|task_team_relative_member"` | Verify current path usage in coverage. | Tests already use deep structural route keys and task-team scoped projection fields. | Yes — add new coverage around typed runtime path. |
| 2026-06-27 | Other | User clarification in chat | Validate product model. | User confirmed the right model is the same route/path idea with segment kind disambiguating member vs task-team run vs task-agent run. | No |
| 2026-06-27 | Code | Architecture-level current-state read of `TeamWorkspaceView.vue`, `agentTeamRunStore.ts`, `TeamStreamingService.ts`, `messageTypes.ts`, `team-command-selector-parser.ts`, `agent-team-stream-handler.ts`, `team-run.ts`, `team-run-backend.ts`, `team-manager.ts`, `mixed-team-manager.ts`, `mixed-task-team-instance-registry.ts`, `mixed-task-team-member-handle.ts`, `mixed-sub-team-member-handle.ts` | Produce design spec from approved requirements and real current code path. | Confirmed route-only frontend send path, structural-only server parser, `TeamRun` public boundary, partial task-agent/task-team backend primitives, and child-run handle boundaries that the router must reuse. | No |
| 2026-06-27 | Doc | `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/design-spec.md` | Capture target design for downstream architecture review. | Design uses recursive `ConversationTargetAddress` segments, parser-level flat structural normalization, `TeamRun.postMessageToConversationTarget`, and mixed backend recursive router. | Architecture review |
| 2026-06-27 | Trace | API/E2E message and artifacts: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `live-ui-click-open-tab-report.md`, `live-ui-click-evidence/open-tab-failure-summary.json`, `live-ui-click-evidence/open-tab-task-team-delegate-failure.png` | Investigate design-impact / requirement-gap escalation from live `open_tab` UI validation. | Real UI composer send to coordinator worked. Codex GPT-5.5 did not expose `delegate_task`. AutoByteus GPT-5.5 exposed/invoked `delegate_task`, but failed `TASK_TEAM_TARGET_NOT_FOUND` for advertised team target `BuildSquad`; no task-team projection appeared. | Yes — upstream requirements/design amended; route to architecture/implementation. |
| 2026-06-27 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-managed-team-context-builder.ts`; `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-autobyteus-context.ts`; `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-service.ts`; `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-input-resolver.ts` | Verify why AutoByteus could advertise a team target but tool execution could not resolve it. | `buildAutoByteusManagedTeamContext` serializes `members` as generic member rows only. `TaskDelegationInputResolver.resolveTeamTarget` requires `memberKind === 'agent_team'` and ingress metadata. The native parser can only reconstruct team targets if the serialized context preserves that metadata. | Yes — implementation must preserve typed team descriptors in native context or share the existing MemberTeamContext-to-task-delegation mapper. |
| 2026-06-27 | Command | `git diff --name-status`; `git diff -- autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-autobyteus-context.ts`; `git show HEAD:...` | Check current worktree state after API/E2E diagnostic note. | No production-source diff remains in the task-delegation native context files. The committed source still serializes AutoByteus managed `members` as generic rows only and therefore does not fix the live blocker. | Yes — implementation owner should start from committed source and add builder/parser/tests intentionally. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - Frontend user action calls `agentTeamRunStore.sendMessageToFocusedMember(text, contextAttachments)`.
  - Active websocket connection is bound to the active parent `TeamRun`.

- Current frontend execution flow:
  1. Resolve focused node through `teamUserMessageTarget`.
  2. Return a structural `memberRouteKey` only when the node is a normal leaf or allowed subteam.
  3. Reject task-team runtime projections as `task_execution_focus`.
  4. Serialize `SEND_MESSAGE` with `target_member_route_key` only.

- Current server execution flow:
  1. `agent-team-stream-handler.handleSendMessage` receives `SEND_MESSAGE` on a websocket bound to one `TeamRun`.
  2. It resolves a `TeamMemberSelector` from flat structural target fields.
  3. It rejects scalar name/id selectors.
  4. It calls `teamRun.postMessage(userMessage, targetSelector)`.

- Ownership or boundary observations:
  - Frontend focus state already uses `memberRouteKey` as a path key for structural and projection nodes.
  - Transport serialization currently owns only flat payload shape, not target semantics.
  - Server parser owns selector normalization and scalar rejection.
  - `TeamRun` is the authoritative runtime boundary for team chat.
  - Mixed backend registries own concrete task-agent/task-team runtime handles.
  - No current owner interprets a recursive typed conversation path.

- Current behavior summary:
  - Existing structural chat uses `memberRouteKey`/`memberPath`.
  - Runtime task participants may be visible but are not generally chat-addressable.
  - Backend primitives are available but disconnected from a unified user-chat target contract.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature + behavior change + targeted refactor.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing invariant + boundary/ownership issue + shared structure looseness.
- Refactor posture evidence summary: The missing invariant is not just missing fields. The system needs one address owner that can route a typed path across structural and runtime boundaries without overloading route strings or duplicating traversal policy.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `teamDefinitionMembers.ts` / `team-run-member-identity.ts` | Deep structural members already use path/route-key selectors. | New model should extend, not replace, the path idea. | Use `member` segments. |
| `teamUserMessageTarget.ts` | Runtime focus is blocked. | Frontend target resolution does not match the participant tree now displayed. | Replace/reshape resolver. |
| `TeamStreamingService.sendMessage` | Sends one `target_member_route_key`. | Payload cannot express typed runtime segments. | Add nested address payload. |
| `agent-team-stream-handler.ts` | Handler calls structural `postMessage`. | Runtime path is not available at authoritative boundary. | Add `TeamRun` address method. |
| `MixedTeamManager` registries | Task-agent and task-team primitives exist. | Reuse existing runtime owners. | Add router that composes them. |
| User clarification | No fundamental conceptual difference between structural nesting and runtime nesting; segment kind disambiguates reality. | Fixed special-case address kinds should be replaced by recursive typed path. | Requirements updated. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/utils/teamDefinitionMembers.ts` | Builds structural member tree and route keys. | Establishes path-shaped structural addressing. | New resolver should align with this model. |
| `autobyteus-web/types/agent/AgentTeamContext.ts` | Frontend team context and projection node metadata. | Holds fields needed for current task-agent/task-team projections. | May need full address segments for deeper runtime nesting. |
| `autobyteus-web/utils/teamUserMessageTarget.ts` | Current route-only focused target resolver. | Blocks runtime projection focus. | Replace or refactor into `ConversationTargetAddress` resolver. |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Websocket client facade. | Serializes flat structural target. | Serialize nested address. |
| `autobyteus-web/stores/agentTeamRunStore.ts` | User send action and optimistic placement. | Uses one member route key for many concerns. | Use address + canonical target key. |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | Composer visibility and labels. | Hides runtime projection composer. | Show composer when addressable. |
| `autobyteus-server-ts/src/services/agent-streaming/team-command-selector-parser.ts` | Command selector normalization and scalar rejection. | Structural-only. | Add/compose conversation address parser. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | Websocket command handling. | Calls structural `postMessage`. | Delegate to `TeamRun` address boundary. |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts` | Team runtime domain boundary. | Has partial routing methods. | Add unified conversation address method. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/*` | Mixed backend member/task runtime routing. | Owns actual structural/task-agent/task-team delivery. | Add one recursive segment router inside backend boundary. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-27 | Setup | `git status --short --branch` | Branch is `codex/conversation-target-addressing...origin/personal`; only ticket artifacts untracked. | Dedicated worktree valid. |
| 2026-06-27 | Trace | `nl -ba autobyteus-web/utils/teamDefinitionMembers.ts` | Nested structural route keys are built by joining member path with `/`. | Existing route reality is path-shaped. |
| 2026-06-27 | Trace | `nl -ba autobyteus-web/utils/teamUserMessageTarget.ts` | Runtime projection focus is rejected. | Frontend must become addressability-driven. |
| 2026-06-27 | Trace | `nl -ba autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts` | `postMessage` has optional task-agent run id; task-team root method exists. | Backend can be composed through a unified address boundary. |
| 2026-06-27 | Trace | `rg "BuildSquad/review_lead|targetMemberPath" ...` | Existing tests use deep structural route/path selectors. | Preserve and normalize legacy shape. |

No full automated test suite was run during design investigation because no implementation changes have been made.

## External / Public Source Findings

None. The investigation used local repository evidence and user clarification.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for design investigation.
- Required config, feature flags, env vars, or accounts: None for design investigation.
- External repos or artifacts: None.
- Setup commands that materially affected investigation: `git fetch origin personal`; worktree/base verification.
- Cleanup notes: None.

## Findings From Code / Docs / Data / Logs

### Structural addressing is already path-shaped

The current system can represent deep structural members as either an array path or a slash route key. The route key is the compact key form; the path is the structured form. They are equivalent selector forms for members in the active team run's structural tree.

### Runtime run ids should be typed path segments, not untyped route-string parts

A task-team run id or task-agent run id is not a structural member name. It belongs in the same path concept, but with a segment kind that tells the router how to interpret the id and which runtime owner to enter.

### Frontend projections need addressability instead of special-case rejection

Task-agent and task-team projections already appear in the team tree. Composer visibility should depend on whether a valid typed path can be built, not on blocking all runtime projection markers.

### Backend routing owner must sit behind the TeamRun boundary

The websocket handler should not reach directly into task-agent/task-team registries. It should parse/validate transport payloads, then call a `TeamRun` conversation address boundary. Mixed backend internals can then recurse through structural subteam handles and task-team handles.

## Constraints / Dependencies / Compatibility Facts

- Websocket parent `TeamRun` is the root address context.
- Existing flat structural selector fields are public compatibility inputs and must normalize to the new address model.
- Scalar/name-only selectors remain invalid.
- Task lifecycle commands stay separate.
- Current frontend task-team child scoped route keys are UI state keys, not complete typed backend addresses.
- The final design should not preserve the earlier five-kind model as a second parallel path.

## Open Unknowns / Risks

- OPEN-001: Whether to store full `ConversationTargetAddress` segments on every runtime projection node or reconstruct them from existing node/root metadata at send time.
- OPEN-002: Exact camelCase alias policy for nested address payloads.
- RISK-001: Runtime projection metadata may need extension for arbitrary nested task-team-in-task-team paths.
- RISK-002: A router implemented in the websocket handler would violate the authoritative boundary and duplicate backend ownership.
- RISK-003: Overloading `target_member_route_key` with runtime ids would make validation ambiguous.

## Design Artifact

- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/design-spec.md`
- Design Status: Produced on 2026-06-27 for architecture review.
- Design Summary: Recursive typed `ConversationTargetAddress` path; old flat structural selectors normalize at parser boundary; websocket handler delegates to `TeamRun.postMessageToConversationTarget`; mixed backend owns recursive segment traversal through existing member/task registries and child-run handles; frontend resolver builds addresses from focused projection metadata and uses a separate local target key.

## Design-Impact Rework — Live Task-Team Projection Creation

- Trigger: API/E2E live `open_tab` validation could not complete a real task-team-child click/send because no task-team projection could be created through the live frontend/backend path.
- Decision: The conversation-target address model remains correct and unchanged. However, preserving an existing supported real task-team projection creation path is in scope as a no-regression and validation precondition for this ticket.
- Runtime expectation: This ticket does **not** require Codex app-server coordinators to expose `delegate_task`. The approved live setup should use a runtime family that actually exposes task delegation in the local environment; the observed supported path is an AutoByteus native coordinator.
- Required implementation clarification: For AutoByteus native execution, `customData.teamContext.members` must preserve `agent_team` descriptors with `memberKind`, `teamDefinitionId`, route/path/run identity, optional child/coordinator data, and ingress/representative identity. A team target advertised in the runtime prompt must be resolvable by `TaskDelegationInputResolver.resolveTeamTarget(...)` during tool execution.
- Scope boundary: This does not redesign delegation lifecycle semantics, review/settlement behavior, or tool approval. It repairs/preserves the existing descriptor handoff that lets a visible team target become a real task-team projection.
- Current worktree note: no production-source diff remains from the API/E2E diagnostic edit. Implementation should start from committed source and add the AutoByteus context builder/parser/test changes intentionally.

## Notes For Architect Reviewer

- The approved model is a recursive typed participant path, not a fixed five-kind union.
- Current structural selectors already prove the base model: `parentTeamRunId + memberRouteKey/memberPath`.
- Add typed segment kinds only where the path crosses a runtime boundary:
  - `member` = structural member selector in current team scope;
  - `task_team` = concrete task-team run id under the previously selected team member, opens a child team scope;
  - `task_agent` = concrete task-agent run id under the previously selected agent member, terminal.
- Keep old flat payloads as parser-level normalization only.
- The main architecture-review risk is boundary bypass. The websocket handler must not know mixed backend registry details.
- Review the design-impact rework section: the added requirement is to preserve supported task-team projection creation by carrying typed `agent_team` descriptors through AutoByteus native task-delegation context; it should remain a narrow no-regression/validation-enabling fix, not a redesign of task lifecycle semantics.
