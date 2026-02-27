# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v10`
- Requirements: `tickets/in-progress/codex-team-member-runtime-communication/requirements.md` (status `Refined`)
- Source Artifact: `tickets/in-progress/codex-team-member-runtime-communication/proposed-design.md`
- Source Design Version: `v10`
- Referenced Sections:
  - `Change Inventory`
  - `Target Architecture Shape And Boundaries`
  - `Use-Case Coverage Matrix`

## Future-State Modeling Rule (Mandatory)

- These call stacks model target behavior after architecture changes are implemented.
- They are not descriptions of current as-is code execution.

## Use Case Index (Stable IDs)

| use_case_id | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Requirement | R-001,R-002,R-003 | N/A | Team create with member runtime binding initialization | Yes/N/A/Yes |
| UC-002 | Requirement | R-004 | N/A | Targeted user-turn routing to member runtime session | Yes/Yes/Yes |
| UC-003 | Requirement | R-005 | N/A | Targeted team tool approval routing | Yes/N/A/Yes |
| UC-004 | Requirement | R-006 | N/A | Codex member runtime event rebroadcast with stable identity | Yes/N/A/Yes |
| UC-005 | Requirement | R-002,R-007 | N/A | Team continuation/reopen with member runtime restore | Yes/Yes/Yes |
| UC-006 | Requirement | R-008 | N/A | Non-codex team no-regression path | Yes/N/A/Yes |
| UC-007 | Requirement | R-009 | N/A | Deterministic error responses for invalid routing/binding/session state | Yes/N/A/Yes |
| UC-008 | Requirement | R-011,R-012,R-016 | N/A | Agent-to-agent `send_message_to` dispatch and recipient resolution | Yes/N/A/Yes |
| UC-009 | Requirement | R-013,R-014 | N/A | Recipient envelope handling and normalization into standard reasoning pipeline | Yes/N/A/Yes |
| UC-010 | Requirement | R-012,R-015,R-016 | N/A | Deterministic sender-visible failures for inter-agent delivery | Yes/N/A/Yes |
| UC-011 | Requirement | R-017 | N/A | Team-scoped `send_message_to` tool exposure for Codex sessions | Yes/N/A/Yes |
| UC-012 | Requirement | R-018 | N/A | Shared-process Codex topology with per-agent/member thread isolation | Yes/N/A/Yes |
| UC-016 | Requirement | R-020 | N/A | Codex team workspace-root persistence for workspace-grouped history parity | Yes/N/A/Yes |
| UC-013 | Design-Risk | N/A | Frontend history panel/store decoupling so rendering, action workflows, and avatar fallbacks do not share one container boundary. | History panel/container decomposition | Yes/N/A/Yes |
| UC-014 | Design-Risk | N/A | Runtime relay ownership lifecycle must be explicit (bind/unbind) and not constructor-global side effects. | Relay ownership lifecycle wiring | Yes/N/A/Yes |
| UC-015 | Requirement | R-019 | N/A | Team runtime selector with runtime-scoped model/config loading and uniform runtime launch payload | Yes/N/A/Yes |

## Transition Notes

- `agent-team-run.ts` and `agent-team-stream-handler.ts` remain user-ingress and streaming boundaries.
- `agent-team-run.ts` is now API-boundary only; team mutation runtime logic is modeled in `team-run-mutation-service.ts`.
- Inter-agent tool delivery path is modeled as a separate orchestration boundary (`relayInterAgentMessage`) and codex runtime relay transport.
- Frontend history flow is modeled as split boundaries: `runHistoryReadModelStore.ts` (projection/query-read) + `runHistoryActions.ts` (open/delete/select/workspace actions) + thin store/container wiring.
- `WorkspaceAgentRunsTreePanel.vue` is modeled as container-only composition that delegates tree rendering and action/avatar behavior to section components/composables.
- Team manifest schema includes member runtime metadata (`runtimeKind`, `runtimeReference`) and is validated in-place.
- Relay handler wiring is modeled as explicit lifecycle ownership (`team-codex-relay-wiring.ts`) rather than orchestrator-constructor global mutation.
- Shared process-manager ownership is modeled for both runtime sessions and thread-history reads so diagnostic/history paths do not spawn ephemeral codex subprocesses.
- Team config runtime kind is modeled as first-class state (`TeamRunConfig.runtimeKind`) and controls runtime-scoped model catalog/schema loading for global/member selectors.
- Codex team member binding creation is modeled to resolve/persist `workspaceRootPath` from `workspaceId` when explicit root path is absent.

## Stage 3 Revalidation Notes (After Stage 0 Re-Entry)

1. No additional use cases were introduced during re-entry; `UC-001..UC-010` remain current.
2. Call-stack ownership split remains valid: resolver/user-ingress vs inter-agent relay boundary.
3. No version bump required; `v2` remains the canonical runtime model for the next review gate.

## Stage 3 Revalidation Notes (After Stage 0 Re-Entry Round 2)

1. Unresolved implementation seams from investigation round 2 (`C-001`, `C-008`, `C-010`) do not change use-case set or execution boundaries; they remain implementation closure items under the existing call-stack model.
2. `UC-001..UC-010` and associated primary/fallback/error paths remain valid and sufficient for Stage 4 review.
3. Call-stack version remains `v2`.

## Stage 3 Re-Entry Notes (After Stage 5.5 Design-Impact Reopen)

1. Use-case set remains unchanged (`UC-001..UC-010`), but boundary ownership is updated to match refactor extraction (`team-run-mutation-service.ts` and frontend run-history helper modules).
2. Runtime behavior and acceptance-criteria mappings are unchanged; this is a structural call-stack ownership update, not a behavior change.
3. Call-stack version bumped to `v3` to reflect architectural boundary extraction with equivalent runtime semantics.

## Stage 3 Re-Entry Notes (After Finding-1 Rollback To Investigation)

1. Call-stack updated to reflect `v6` boundary model for UI decoupling and runtime relay ownership lifecycle wiring.
2. Requirements behavior scope remains unchanged (`R-001..R-017`); additional use cases `UC-013/UC-014` are design-risk closures to prevent architecture regression.
3. Call-stack version bumped to `v6`.

## Stage 3 Re-Entry Notes (After Process-Topology Clarification)

1. Call-stack updated to reflect `v7` topology model: one shared Codex app-server process with per-run/member thread isolation.
2. Added requirement use case `UC-012` mapped to `R-018`; existing design-risk use cases shifted to `UC-013` and `UC-014`.
3. Call-stack version bumped to `v7`.

## Stage 3 Re-Entry Notes (After Stage 0 Re-Entry Round 8)

1. Runtime model remains behavior-equivalent for `UC-001..UC-014`, but design-risk closure criteria were tightened for decoupling hotspots (`C-022`,`C-023`) and shared-process enforcement (`C-026`).
2. No new use-case IDs were required; `UC-013` now explicitly includes section-contract fanout reduction and hotspot-size threshold alignment as part of design-risk closure.
3. Call-stack version bumped to `v8` to align with proposed design `v8`.

## Stage 3 Re-Entry Notes (After Stage 0 Re-Entry Round 9)

1. Call-stack behavior remains unchanged for `UC-001..UC-014`; this round is implementation-boundary cleanup only.
2. `UC-013` remains the active design-risk closure target with explicit section-contract fanout reduction in the panel container path.
3. Call-stack version remains `v8`.

## Stage 3 Re-Entry Notes (After Stage 0 Re-Entry Round 10)

1. Added requirement use case `UC-015` for team runtime selector behavior and runtime-scoped model/config loading.
2. Existing runtime/session/relay flows (`UC-001..UC-014`) remain behaviorally unchanged; new flow is frontend config + launch payload normalization.
3. Call-stack version bumped to `v9` to align with proposed design `v9`.

## Stage 3 Re-Entry Notes (After Stage 0 Re-Entry Round 11)

1. Added requirement use case `UC-016` to model codex team workspace-root persistence when launch payload uses `workspaceId` only.
2. `UC-001` and `UC-005` retain existing semantics; `UC-016` captures the new persistence parity invariant needed for workspace-grouped history visibility.
3. Call-stack version bumped to `v10` to align with proposed design `v10`.

## Use Case: UC-001 Team Create With Member Runtime Binding Initialization

### Goal

Create a team run with explicit member runtime kinds and deterministic codex member runtime-session bindings.

### Preconditions

- Valid team definition exists.
- Team member configs are supplied.

### Expected Outcome

- Team run is created.
- Member bindings are persisted with runtime metadata.
- Codex members have active runtime sessions keyed by member run IDs.

### Primary Runtime Call Stack

```text
[ENTRY] src/api/graphql/types/agent-team-run.ts:createAgentTeamRun(input)
├── agent-team-run.ts:resolveRuntimeMemberConfigs(teamRunId, memberConfigs)
├── [ASYNC] src/agent-team-execution/services/team-member-runtime-orchestrator.ts:createTeamRunWithId(...)
│   ├── team-member-runtime-orchestrator.ts:validateRuntimeUniformity(memberConfigs)
│   ├── team-member-runtime-orchestrator.ts:buildMemberBindings(...) [STATE]
│   ├── [ASYNC] team-member-runtime-orchestrator.ts:createCodexMemberSessions(...)
│   │   ├── src/runtime-execution/runtime-composition-service.ts:createAgentRunWithId(...) [ASYNC]
│   │   ├── src/runtime-execution/runtime-command-ingress-service.ts:bindRunSession(...) [STATE]
│   │   └── src/agent-team-execution/services/team-runtime-binding-registry.ts:upsertTeamBindings(...) [STATE]
│   └── [ASYNC] src/run-history/services/team-run-history-service.ts:upsertTeamRunHistoryRow(...) [IO]
└── agent-team-run.ts:return CreateAgentTeamRunResult(success=true)
```

### Branching / Fallback Paths

```text
[FALLBACK] runtimeKind = autobyteus for all members
team-member-runtime-orchestrator.ts:createTeamRunWithId(...)
├── src/agent-team-execution/services/agent-team-run-manager.ts:createTeamRunWithId(...) [ASYNC]
└── src/run-history/services/team-run-history-service.ts:upsertTeamRunHistoryRow(...) [IO]
```

```text
[ERROR] invalid runtime kind or mixed-runtime request
team-member-runtime-orchestrator.ts:validateRuntimeUniformity(...)
└── agent-team-run.ts:createAgentTeamRun(...) -> deterministic error result
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 Targeted User-Turn Routing To Member Runtime Session

### Goal

Route a frontend user turn to the exact targeted member runtime session for codex-backed teams.

### Preconditions

- Team run exists.
- Target member name/route key is provided.

### Expected Outcome

- Exactly one targeted member runtime session receives the user turn.

### Primary Runtime Call Stack

```text
[ENTRY] src/api/graphql/types/agent-team-run.ts:sendMessageToTeam(input)
├── [ASYNC] team-member-runtime-orchestrator.ts:sendToMember(teamRunId, targetMember, userMessage)
│   ├── team-runtime-binding-registry.ts:resolveMemberBinding(teamRunId, targetMember) [STATE]
│   ├── src/runtime-execution/runtime-command-ingress-service.ts:sendTurn({ runId: memberRunId, mode: "agent" }) [ASYNC]
│   └── src/run-history/services/team-run-history-service.ts:onTeamEvent(teamRunId, status=ACTIVE) [IO]
└── agent-team-run.ts:return SendMessageToTeamResult(success=true)
```

### Branching / Fallback Paths

```text
[FALLBACK] no codex member-runtime team mode
team-member-runtime-orchestrator.ts:sendToMember(...)
└── runtime-command-ingress-service.ts:sendTurn({ runId: teamRunId, mode: "team", targetMemberName }) [ASYNC]
```

```text
[FALLBACK] inactive codex sessions but manifest exists
src/run-history/services/team-run-continuation-service.ts:continueTeamRun(...)
├── team-member-runtime-orchestrator.ts:restoreTeamRunSessions(...) [ASYNC]
└── team-member-runtime-orchestrator.ts:sendToMember(...) [ASYNC]
```

```text
[ERROR] target member binding not found
team-runtime-binding-registry.ts:resolveMemberBinding(...)
└── team-member-runtime-orchestrator.ts:sendToMember(...) -> deterministic rejection
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 Targeted Team Tool Approval Routing

### Goal

Route tool approval/denial to the targeted member runtime session and invocation.

### Preconditions

- Team run exists.
- `invocation_id` and target member identity are provided.

### Expected Outcome

- Approval applies only to targeted member/invocation.

### Primary Runtime Call Stack

```text
[ENTRY] src/services/agent-streaming/agent-team-stream-handler.ts:handleToolApproval(teamRunId, payload)
├── agent-team-stream-handler.ts:extractApprovalTarget(payload)
├── [ASYNC] team-member-runtime-orchestrator.ts:approveForMember(teamRunId, targetMember, invocationId, approved)
│   ├── team-runtime-binding-registry.ts:resolveMemberBinding(teamRunId, targetMember) [STATE]
│   └── runtime-command-ingress-service.ts:approveTool({ runId: memberRunId, mode: "agent" }) [ASYNC]
└── agent-team-stream-handler.ts:return
```

### Branching / Fallback Paths

```text
[FALLBACK] autobyteus team mode
agent-team-stream-handler.ts:handleToolApproval(...)
└── runtime-command-ingress-service.ts:approveTool({ runId: teamRunId, mode: "team", approvalTarget }) [ASYNC]
```

```text
[ERROR] missing invocation_id or missing target identity
agent-team-stream-handler.ts:handleToolApproval(...)
└── deterministic rejection from orchestrator/ingress
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-004 Codex Member Runtime Event Rebroadcast With Stable Identity

### Goal

Stream codex member runtime events with stable `agent_name` and `agent_id` identity for frontend mapping.

### Preconditions

- Team websocket connected for codex-member team run.

### Expected Outcome

- Frontend deterministically maps runtime events to the correct member context.

### Primary Runtime Call Stack

```text
[ENTRY] src/services/agent-streaming/agent-team-stream-handler.ts:connect(connection, teamRunId)
├── team-member-runtime-orchestrator.ts:getTeamRuntimeMode(teamRunId) [STATE]
├── [ASYNC] src/services/agent-streaming/team-codex-runtime-event-bridge.ts:subscribeTeam(teamRunId, onMessage)
│   ├── team-runtime-binding-registry.ts:listMemberBindings(teamRunId) [STATE]
│   ├── [ASYNC] src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts:subscribeToRunEvents(memberRunId, listener)
│   ├── src/services/agent-streaming/runtime-event-message-mapper.ts:map(codexEvent)
│   └── team-codex-runtime-event-bridge.ts:attachMemberIdentity(agent_name, agent_id=memberRunId) [STATE]
└── agent-team-stream-handler.ts:send(ServerMessage)
```

### Branching / Fallback Paths

```text
[FALLBACK] autobyteus team mode
agent-team-stream-handler.ts:connect(...)
└── agent-team-run-manager.ts:getTeamEventStream(teamRunId) -> existing convertTeamEvent path
```

```text
[ERROR] member stream stale/unsubscribed
team-codex-runtime-event-bridge.ts:onMemberRuntimeEvent(...)
└── emit deterministic ERROR payload with member identity and keep other streams alive
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-005 Team Continuation/Reopen With Member Runtime Restore

### Goal

Restore codex member runtime sessions from persisted team manifest and continue targeted member turns.

### Preconditions

- Persisted team manifest exists.
- Team run is inactive or sessions are stale.

### Expected Outcome

- Member runtime sessions are restored and resumed send succeeds.

### Primary Runtime Call Stack

```text
[ENTRY] src/run-history/services/team-run-continuation-service.ts:continueTeamRun(input)
├── [ASYNC] team-run-history-service.ts:getTeamRunResumeConfig(teamRunId) [IO]
├── [ASYNC] team-member-runtime-orchestrator.ts:restoreTeamRunSessions(manifest)
│   ├── [ASYNC] team-member-runtime-orchestrator.ts:restoreMemberSession(binding)
│   │   ├── runtime-composition-service.ts:restoreAgentRun({ runId: memberRunId, runtimeKind, runtimeReference }) [ASYNC]
│   │   └── runtime-command-ingress-service.ts:bindRunSession(...) [STATE]
│   └── team-runtime-binding-registry.ts:upsertTeamBindings(...) [STATE]
├── [ASYNC] team-member-runtime-orchestrator.ts:sendToMember(teamRunId, targetMember, userMessage)
└── [ASYNC] team-run-history-service.ts:onTeamEvent(teamRunId, status=ACTIVE) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] team already active with valid bindings
continueTeamRun(...)
└── team-member-runtime-orchestrator.ts:sendToMember(...)
```

```text
[FALLBACK] non-codex manifest mode
continueTeamRun(...)
└── existing AgentTeamRunManager restore path
```

```text
[ERROR] one or more member session restores fail
team-member-runtime-orchestrator.ts:restoreTeamRunSessions(...)
├── rollback partially restored member sessions [ASYNC]
└── throw deterministic continuation failure
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-006 Non-Codex Team No-Regression Path

### Goal

Ensure existing autobyteus team behavior remains unchanged.

### Preconditions

- Team run configured with `autobyteus` members.

### Expected Outcome

- Existing create/send/approval/streaming behavior continues.

### Primary Runtime Call Stack

```text
[ENTRY] team create/send/approve/stream flows
└── existing autobyteus path:
    ├── agent-team-run-manager.ts:createTeamRunWithId(...)
    ├── runtime-command-ingress-service.ts:sendTurn/approveTool({ mode: "team", runId: teamRunId })
    └── agent-team-stream-handler.ts:convertTeamEvent(...)
```

### Branching / Fallback Paths

```text
[FALLBACK] N/A
```

```text
[ERROR] runtime unavailable or team not found
existing deterministic rejection path preserved
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-007 Deterministic Error Responses For Invalid Routing/Binding/Session State

### Goal

Avoid silent fallback and misrouting for invalid routing/session state.

### Preconditions

- Request hits codex-member team routing path.

### Expected Outcome

- Deterministic explicit rejection codes/messages are returned.

### Primary Runtime Call Stack

```text
[ENTRY] orchestrator route/approval operations
├── team-runtime-binding-registry.ts:resolveMemberBinding(...)
├── runtime-command-ingress-service.ts:sendTurn/approveTool(...)
└── orchestrator maps failures to deterministic command result codes/messages
```

### Branching / Fallback Paths

```text
[FALLBACK] N/A
```

```text
[ERROR] invalid target or missing session
└── explicit rejection: TEAM_MEMBER_NOT_FOUND / TEAM_MEMBER_SESSION_NOT_FOUND / TEAM_MEMBER_BINDING_MISSING
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-008 Agent-To-Agent `send_message_to` Dispatch And Recipient Resolution

### Goal

Support agent-originated `send_message_to` tool dispatch in codex team runtime with deterministic recipient resolution.

### Preconditions

- Sender member session active in codex team run.
- Tool payload includes `recipient_name`, `content`, optional `message_type`.

### Expected Outcome

- Recipient member binding resolves deterministically.
- Inter-agent delivery request enters dedicated relay path (not GraphQL user-ingress path).

### Primary Runtime Call Stack

```text
[ENTRY] src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts:onToolInvocation(runId=senderMemberRunId, toolName="send_message_to", args)
├── [ASYNC] src/agent-team-execution/services/team-member-runtime-orchestrator.ts:relayInterAgentMessage(teamRunId, senderMemberRunId, args)
│   ├── team-member-runtime-orchestrator.ts:validateInterAgentPayload(args)
│   ├── team-runtime-binding-registry.ts:resolveMemberBinding(teamRunId, recipient_name) [STATE]
│   ├── team-member-runtime-orchestrator.ts:buildInterAgentEnvelope(senderMemberRunId, recipientBinding, message_type, content)
│   └── [ASYNC] src/runtime-execution/codex-app-server/team-codex-inter-agent-message-relay.ts:deliverInterAgentMessage(envelope)
│       └── runtime-command-ingress-service.ts:relayInterAgentMessage({ runId: recipientMemberRunId, envelope }) [ASYNC]
└── codex-app-server-runtime-service.ts:returnToolSuccess(send_message_to)
```

### Branching / Fallback Paths

```text
[FALLBACK] N/A
```

```text
[ERROR] recipient_name cannot resolve to one member binding
team-runtime-binding-registry.ts:resolveMemberBinding(...)
└── relayInterAgentMessage(...) -> deterministic tool-visible error RECIPIENT_NOT_FOUND_OR_AMBIGUOUS
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-009 Recipient Envelope Handling And Input-Pipeline Normalization

### Goal

Ensure recipient codex member receives sender metadata and continues from standard reasoning/input pipeline.

### Preconditions

- Inter-agent envelope delivered to recipient member runtime session.

### Expected Outcome

- Envelope metadata preserved.
- Recipient runtime normalizes message into normal reasoning pipeline and continues tool reasoning.

### Primary Runtime Call Stack

```text
[ENTRY] runtime-command-ingress-service.ts:relayInterAgentMessage({ runId: recipientMemberRunId, envelope })
├── runtime-adapter-port.ts:relayInterAgentMessage(input)
├── codex-app-server-runtime-adapter.ts:relayInterAgentMessage(input)
├── [ASYNC] codex-app-server-runtime-service.ts:injectInterAgentEnvelope(recipientMemberRunId, envelope)
│   ├── codex service:compose recipient prompt segment with sender metadata
│   ├── codex service:enqueue envelope-derived input into recipient run turn queue [STATE]
│   └── codex service:emit recipient reasoning events with recipient identity [ASYNC]
└── team-codex-runtime-event-bridge.ts:rebroadcast recipient events with member identity tags
```

### Branching / Fallback Paths

```text
[FALLBACK] N/A
```

```text
[ERROR] envelope missing required fields or sender metadata malformed
codex-app-server-runtime-service.ts:injectInterAgentEnvelope(...)
└── reject with deterministic sender-visible delivery error and no recipient state mutation
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-010 Deterministic Sender-Visible Failures For Inter-Agent Delivery

### Goal

Guarantee deterministic sender-visible failure semantics for inter-agent delivery problems.

### Preconditions

- Sender invokes `send_message_to`.

### Expected Outcome

- Sender receives deterministic tool-visible failure for recipient missing/start failure/session unavailable.

### Primary Runtime Call Stack

```text
[ENTRY] relayInterAgentMessage(...)
├── resolve recipient binding
├── ensure recipient runtime session availability/start policy
├── deliver envelope
└── map failure/success into send_message_to tool result for sender run
```

### Branching / Fallback Paths

```text
[FALLBACK] N/A
```

```text
[ERROR] recipient start/session unavailable
team-codex-inter-agent-message-relay.ts:deliverInterAgentMessage(...)
└── deterministic sender-visible error: RECIPIENT_UNAVAILABLE / RECIPIENT_START_FAILED / RECIPIENT_SESSION_MISSING
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-011 Team-Scoped `send_message_to` Tool Exposure For Codex Sessions

### Goal

Expose `send_message_to` only for team-bound Codex member sessions.

### Preconditions

- Codex run session startup executes with runtime metadata.

### Expected Outcome

- Team-bound member session (`teamRunId` present) registers `send_message_to` dynamic tool.
- Standalone/non-team session (`teamRunId` absent) registers no inter-agent dynamic tool.

### Primary Runtime Call Stack

```text
[ENTRY] codex-app-server-runtime-service.ts:startSession(runId, options)
├── resolveTeamRunIdFromMetadata(options.runtimeMetadata)
├── resolveDynamicTools({ teamRunId, interAgentRelayEnabled })
│   ├── if teamRunId present: include send_message_to tool spec
│   └── if teamRunId missing: return null (no inter-agent tool exposure)
└── thread/start|thread/resume(dynamicTools=resolvedValue)
```

### Branching / Fallback Paths

```text
[FALLBACK] inter-agent relay handler unavailable
resolveDynamicTools({ interAgentRelayEnabled=false, ... })
└── returns null even if teamRunId exists
```

```text
[ERROR] N/A (policy gate behavior, deterministic null exposure)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `N/A`

## Use Case: UC-012 Shared-Process Codex Topology With Per-Agent/Member Thread Isolation

### Goal

Enforce one shared long-lived Codex app-server process while preserving one-thread-per-agent/member-run routing semantics.

### Preconditions

- Multiple codex agent runs/member runs are active concurrently.
- Runtime session mapping includes `runId <-> threadId` identity.

### Expected Outcome

- Runtime does not spawn one app-server subprocess per run.
- One shared app-server process handles all codex run/member threads in this server node.
- Failures/restarts are surfaced deterministically to affected sessions.

### Primary Runtime Call Stack

```text
[ENTRY] runtime-composition-service.ts:createOrRestoreAgentRun(...)
├── codex-app-server-process-manager.ts:ensureStarted() [STATE]
│   ├── if not started: spawn one codex app-server process
│   └── if healthy/started: reuse existing process client
├── codex-runtime-session-service.ts:createOrRestoreSession(runId, runtimeReference)
│   ├── thread/start | thread/resume over shared client transport
│   └── sessions[runId] = { threadId, model, metadata } [STATE]
└── runtime-command-ingress-service.ts:bindRunSession(runId, runtimeReference) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] run-history thread read path
codex-thread-history-reader.ts:readThreadHistory(threadId)
├── codex-app-server-process-manager.ts:ensureStarted() [STATE]
└── shared client transport request for thread history snapshot
```

```text
[FALLBACK] shared process unhealthy/crashed
codex-app-server-process-manager.ts:markUnhealthy(...)
├── deterministic session-level error emission for impacted runIds
└── ensureStarted() restarts one shared process before next command
```

```text
[ERROR] thread start/resume fails for one run
codex-runtime-session-service.ts:createOrRestoreSession(...)
└── deterministic run-scoped failure; no per-run process spawn fallback allowed
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-015 Team Runtime Selector With Runtime-Scoped Model/Config Loading

### Goal

Allow team configuration to select runtime kind once, then load runtime-specific model catalogs/config schemas for global model and member overrides.

### Preconditions

- Runtime capabilities are loaded.
- Team run config is editable.

### Expected Outcome

- Team runtime selector shows only enabled runtimes.
- Selecting Codex runtime loads Codex model list/config schemas for global model and member overrides.
- Team launch payload sends one uniform member `runtimeKind` matching the selected team runtime.

### Primary Runtime Call Stack

```text
[ENTRY] TeamRunConfigForm.vue:onRuntimeKindChange(runtimeKind)
├── runtimeCapabilitiesStore:isRuntimeEnabled(runtimeKind) [STATE]
├── llmProviderConfigStore:fetchProvidersWithModels(runtimeKind) [ASYNC]
├── TeamRunConfigForm.vue:sanitizeMemberOverridesForRuntime(runtimeKind, availableModels) [STATE]
│   ├── clear incompatible override.llmModelIdentifier
│   └── clear incompatible override.llmConfig
└── TeamRunConfigForm.vue:render global/member model selectors with runtime-scoped catalogs
```

### Branching / Fallback Paths

```text
[FALLBACK] selected runtime unavailable
TeamRunConfigForm.vue:runtimeCapabilities watch
└── fallback to DEFAULT_AGENT_RUNTIME_KIND + reload provider catalog
```

```text
[ERROR] user attempts launch with stale/invalid model after runtime switch
agentTeamRunStore.ts:sendMessageToFocusedMember(...)
└── backend deterministic validation rejection from create/send mutation
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-016 Codex Team Workspace-Root Persistence For Workspace-Grouped History Parity

### Goal

Ensure Codex team runs created with `workspaceId` (without explicit `workspaceRootPath`) persist workspace-root paths for team/member bindings so history grouping matches selected workspace.

### Preconditions

- Team launch payload provides valid member `workspaceId`.
- Team runtime mode is `codex_members`.

### Expected Outcome

- Member bindings persisted with non-null `workspaceRootPath` resolved from workspace manager.
- Team manifest/team-run history row gets non-null workspace root.
- Frontend workspace history renders the team under the selected workspace bucket.

### Primary Runtime Call Stack

```text
[ENTRY] team-run-mutation-service.ts:ensureTeamCreated(memberConfigs)
├── resolveWorkspaceId(config) [workspaceId retained/resolved]
├── resolveRuntimeMemberConfigs(teamRunId, memberConfigs)
├── [ASYNC] team-member-runtime-orchestrator.ts:createCodexMemberSessions(...)
│   ├── resolveMemberWorkspaceRootPath(config.workspaceRootPath, config.workspaceId) [STATE/ASYNC]
│   ├── runtime-composition-service.ts:restoreAgentRun(...) [ASYNC]
│   └── produce TeamRunMemberBinding(workspaceRootPath=resolvedRootPath)
├── buildTeamRunManifest(..., memberBindingsOverride)
│   └── resolveTeamWorkspaceRootPath(memberBindingsOverride)
└── team-run-history-service.ts:upsertTeamRunHistoryRow(manifest.workspaceRootPath, memberBindings[*].workspaceRootPath) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] explicit workspaceRootPath provided in input
resolveMemberWorkspaceRootPath(...)
└── preserve explicit root path (no workspaceId lookup required)
```

```text
[ERROR] workspaceId cannot resolve to an existing workspace path
resolveMemberWorkspaceRootPath(...)
└── deterministic null result -> validation/reporting path and no silent workspace regrouping drift allowed
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-013 History Panel/Store Decoupling (Design-Risk)

### Goal

Ensure frontend history rendering and behavior orchestration are separated into maintainable boundaries.

### Preconditions

- Run history tree is loaded.
- User performs row selection, terminate/delete action, and workspace-create flows.

### Expected Outcome

- Container composes sections and emits events only.
- Action workflows and avatar fallback state are delegated to composables/modules.
- Read-model projection logic stays outside destructive action workflow module.
- Section contract uses typed action/context adapter instead of broad callback prop fanout.
- Hotspot modules satisfy updated review threshold (`<=500` effective lines) unless a documented single-concern exception is approved in review.

### Primary Runtime Call Stack

```text
[ENTRY] WorkspaceAgentRunsTreePanelContainer.vue:onMounted()
├── runHistoryReadModelStore.ts:fetchTree() [ASYNC]
├── WorkspaceTreeSection.vue:render(workspaceNodes, sectionActionAdapter)
├── TeamTreeSection.vue:render(teamNodes, sectionActionAdapter)
├── useRunHistoryPanelActions.ts:onTerminate/onDelete/onCreateWorkspace [ASYNC]
│   └── runHistoryActions.ts:terminate/delete/open/workspace actions [ASYNC]
└── useRunHistoryAvatarState.ts:avatar-fallback cache/update [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] no native folder picker available
useRunHistoryPanelActions.ts:onCreateWorkspace()
└── inline workspace input flow (container state only)
```

```text
[ERROR] destructive action fails
runHistoryActions.ts:deleteRun/deleteTeamRun(...)
└── composable returns deterministic error state + toast surface; render sections remain unaffected
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-014 Relay Ownership Lifecycle Wiring (Design-Risk)

### Goal

Prevent hidden global relay-handler ownership mutation and enforce explicit bind/unbind lifecycle.

### Preconditions

- Runtime composition bootstraps codex team orchestration.

### Expected Outcome

- Relay handler is bound once via explicit lifecycle wiring module.
- Teardown/unbind is deterministic.
- Orchestrator construction does not mutate runtime-global state.

### Primary Runtime Call Stack

```text
[ENTRY] runtime-composition bootstrap
├── team-codex-relay-wiring.ts:bindRelay(orchestrator, codexRuntimeService)
│   └── codex-app-server-runtime-service.ts:setInterAgentRelayHandler(handler)
├── team-member-runtime-orchestrator.ts:constructor(...) [NO global runtime mutation]
└── team-codex-relay-wiring.ts:unbindRelay() on shutdown/restart
```

### Branching / Fallback Paths

```text
[FALLBACK] non-codex runtime mode
team-codex-relay-wiring.ts:bindRelay(...)
└── no-op binding path
```

```text
[ERROR] bind fails due runtime unavailable
team-codex-relay-wiring.ts:bindRelay(...)
└── deterministic startup failure and no partial ownership mutation retained
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`
