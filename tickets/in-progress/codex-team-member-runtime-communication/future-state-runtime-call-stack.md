# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v15`
- Requirements: `tickets/in-progress/codex-team-member-runtime-communication/requirements.md` (status `Refined`)
- Source Artifact: `tickets/in-progress/codex-team-member-runtime-communication/proposed-design.md`
- Source Design Version: `v15`
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
| UC-011 | Requirement | R-017 | N/A | Team+capability-gated `send_message_to` tool exposure for Codex sessions | Yes/N/A/Yes |
| UC-012 | Requirement | R-018 | N/A | Shared-process Codex topology with per-agent/member thread isolation | Yes/N/A/Yes |
| UC-016 | Requirement | R-020 | N/A | Codex team workspace-root persistence for workspace-grouped history parity | Yes/N/A/Yes |
| UC-017 | Requirement | R-021 | N/A | Codex MCP tool-call mapping resolves deterministic tool names and arguments for activity stream | Yes/N/A/Yes |
| UC-018 | Requirement | R-022 | N/A | Codex team-manifest instruction injection for teammate-aware member reasoning | Yes/N/A/Yes |
| UC-019 | Design-Risk | N/A | Codex app-server runtime service must be decomposed into focused session, request-routing/relay, and model-catalog modules to satisfy hard file-size/SoC policy without behavior drift. | Codex runtime-service decomposition boundary | Yes/N/A/Yes |
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
- Codex runtime event adaptation is modeled with helper boundaries so tool-name normalization and tool-call argument projection are isolated from segment parsing/orchestration concerns.
- Codex dynamic `send_message_to` exposure is modeled as team-context + member-capability gated (`toolNames` contains `send_message_to`) with runtime-side unauthorized relay rejection guardrails.
- Codex team member startup is modeled to inject teammate-manifest guidance through `developerInstructions`, with manifest data sourced from orchestrator metadata and excluding the current member from recipient hints.
- Codex app-server runtime orchestration is modeled as a thin facade with extracted modules for session bootstrap/lifecycle, server-request routing + relay interception, and model-catalog mapping to maintain hard SoC/file-size constraints.

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

## Stage 3 Re-Entry Notes (After Stage 0 Re-Entry Round 12)

1. Added requirement use case `UC-017` for deterministic MCP tool-name extraction in codex runtime event mapping.
2. Runtime model now isolates tool-name extraction and segment parsing under dedicated helper boundaries while keeping adapter orchestration stable.
3. Call-stack version bumped to `v11` to align with proposed design `v11`.

## Stage 3 Re-Entry Notes (After Stage 0 Re-Entry Round 13)

1. `UC-017` is refined to include deterministic MCP/generic tool-call argument projection into `metadata.arguments`, not only tool-name normalization.
2. Runtime model keeps helper-boundary split and extends tool-helper responsibilities to merge/project `payload.arguments` and `payload.item.arguments`.
3. Call-stack version bumped to `v12` to align with proposed design `v12`.

## Stage 3 Re-Entry Notes (After Stage 0 Re-Entry Round 14)

1. `UC-011` is refined from team-only gating to team+capability gating using member agent tool configuration semantics.
2. Runtime model now includes explicit metadata propagation (`send_message_to_enabled`) from team member orchestration into Codex session initialization and runtime guardrails for unauthorized relay attempts.
3. Call-stack version bumped to `v13` to align with proposed design `v13`.

## Stage 3 Re-Entry Notes (After Stage 0 Re-Entry Round 15)

1. Round-15 process reset introduced no runtime-model contract change; `UC-011` team+capability gating remains current.
2. `v13` call stack remains valid and aligned with round-15 requirement/design confirmations.
3. Stage 4 review rerun should verify stability only (no expected write-backs).

## Stage 3 Re-Entry Notes (After Stage 0 Re-Entry Round 16)

1. Round-16 investigation/requirements/design revalidation introduced no new use cases or call-stack deltas.
2. `v13` remains the active call-stack version for Stage 4 rerun.
3. Review focus remains stability confirmation only (no expected write-backs).

## Stage 3 Re-Entry Notes (After Stage 0 Re-Entry Round 17)

1. Added requirement use case `UC-018` for Codex team-manifest instruction injection and teammate-aware recipient guidance.
2. Runtime model now includes orchestrator metadata assembly + codex runtime developer-instruction injection at `thread/start`/`thread/resume`.
3. Call-stack version bumped to `v14` to align with proposed design `v14`.

## Stage 3 Re-Entry Notes (After Stage 8 Code-Review Hard-Limit Reopen)

1. Added design-risk use case `UC-019` to model mandatory decomposition of `codex-app-server-runtime-service.ts` after hard-limit review failure.
2. Runtime model now treats runtime-service as orchestration facade only; request routing/relay and model mapping are explicit extracted boundaries.
3. Call-stack version bumped to `v15` to align with proposed design `v15`.

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

## Use Case: UC-019 Codex Runtime-Service Decomposition Boundary (Design-Risk)

### Goal

Reduce `codex-app-server-runtime-service.ts` below the hard review threshold by enforcing façade-only orchestration and extracted module ownership for request routing/relay and model mapping.

### Preconditions

- Codex runtime integration remains behavior-compatible with existing adapter/service contract.
- Session state type and event wiring contracts are preserved.

### Expected Outcome

- Runtime service delegates request-routing + relay interception to extracted router module.
- Model list mapping delegates to extracted model-catalog mapper module.
- Runtime service file no longer mixes façade orchestration with parsing/router internals.

### Primary Runtime Call Stack

```text
[ENTRY] CodexAppServerRuntimeService:createRunSession/restoreRunSession(...)
├── codex-runtime-session-service.ts:startSession(...) [ASYNC]
│   ├── codex-runtime-session-service.ts:startThread/resumeThread(...)
│   └── CodexAppServerClient:onNotification/onServerRequest bindings
├── codex-runtime-request-router.ts:handleNotificationForSession(...) [STATE]
├── codex-runtime-request-router.ts:handleServerRequestForSession(...) [ASYNC]
│   └── codex-runtime-request-router.ts:tryHandleInterAgentRelayRequest(...) [ASYNC]
└── codex-model-catalog.ts:mapCodexModelListRowToModelInfo(...) (for listModels path)
```

### Branching / Fallback Paths

```text
[FALLBACK] request is not inter-agent relay tool call
codex-runtime-request-router.ts:handleServerRequestForSession(...)
└── approval request path remains unchanged and deterministic
```

```text
[ERROR] inter-agent relay handler missing or capability disabled
codex-runtime-request-router.ts:tryHandleInterAgentRelayRequest(...)
└── deterministic codex response error/success payload mirrors existing contract
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-018 Codex Team-Manifest Instruction Injection

### Goal

Ensure each Codex team member run receives teammate-manifest context (excluding self) so `send_message_to` recipient awareness is deterministic at session bootstrap/resume.

### Preconditions

- Team run uses runtime kind `codex_app_server`.
- Member binding + runtime metadata are available from orchestrator.

### Expected Outcome

- `thread/start` and `thread/resume` include non-null `developerInstructions` containing teammate names/roles and `send_message_to` recipient guidance.
- Dynamic tool schema may include recipient hints derived from the same teammate manifest.

### Primary Runtime Call Stack

```text
[ENTRY] team-member-runtime-orchestrator.ts:createCodexMemberSessions(...)
├── build member teammate manifest metadata (exclude current member) [STATE]
├── runtime-composition-service.ts:restoreAgentRun(...runtimeReference.metadata...) [ASYNC]
└── codex-app-server-runtime-service.ts:startSession(...)
    ├── resolveTeamManifestContextFromMetadata(...)
    ├── renderCodexTeamManifestDeveloperInstructions(...)
    ├── resolveDynamicTools(...allowedRecipientNames...) [optional hints]
    └── client.request("thread/start" | "thread/resume", { developerInstructions, dynamicTools, ... })
```

### Branching / Fallback Paths

```text
[FALLBACK] non-team codex session or manifest metadata absent
codex-app-server-runtime-service.ts:startSession(...)
└── developerInstructions remains null; no team-manifest guidance injected
```

```text
[ERROR] manifest metadata malformed
codex manifest parser
└── deterministic null-instruction fallback; runtime-side recipient validation remains authoritative
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

## Use Case: UC-011 Team+Capability-Gated `send_message_to` Tool Exposure For Codex Sessions

### Goal

Expose `send_message_to` only for team-bound Codex member sessions that are capability-authorized by member agent tool configuration.

### Preconditions

- Codex run session startup executes with runtime metadata.

### Expected Outcome

- Team-bound capability-authorized member session (`teamRunId` present and `send_message_to_enabled=true`) registers `send_message_to` dynamic tool.
- Standalone/non-team sessions or team members without capability authorization register no inter-agent dynamic tool.

### Primary Runtime Call Stack

```text
[ENTRY] codex-app-server-runtime-service.ts:startSession(runId, options)
├── resolveTeamRunIdFromMetadata(options.runtimeMetadata)
├── resolveSendMessageToEnabledFromMetadata(options.runtimeMetadata)
├── resolveDynamicTools({ teamRunId, interAgentRelayEnabled, sendMessageToEnabled })
│   ├── if teamRunId present AND sendMessageToEnabled=true: include send_message_to tool spec
│   └── otherwise: return null (no inter-agent tool exposure)
└── thread/start|thread/resume(dynamicTools=resolvedValue)
```

### Branching / Fallback Paths

```text
[FALLBACK] inter-agent relay handler unavailable
resolveDynamicTools({ interAgentRelayEnabled=false, ... })
└── returns null even if teamRunId exists
```

```text
[ERROR] unauthorized relay request for send_message_to (manual/injected call path)
codex-app-server-runtime-service.ts:tryHandleInterAgentRelayRequest(...)
└── rejects with deterministic "send_message_to is not enabled for this run session."
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

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

## Use Case: UC-017 Codex MCP Tool Mapping With Deterministic Activity Labels And Arguments

### Goal

Ensure Codex MCP/generic tool-call events always emit deterministic tool name and argument payload in activity mapping when supported payload fields are present.

### Preconditions

- Runtime event payload type is `mcpToolCall`.
- Payload contains tool identity in `toolName`, `tool_name`, `tool`, or nested `tool.name`.
- Payload may contain arguments in `payload.arguments` and/or `payload.item.arguments`.

### Expected Outcome

- Mapper emits concrete tool name and avoids `MISSING_TOOL_NAME` fallback for supported payload shapes.
- Mapper projects tool-call arguments into canonical `metadata.arguments` for activity-card rendering.
- Adapter boundaries keep tool-name/argument extraction isolated from segment orchestration and debug metadata concerns.

### Primary Runtime Call Stack

```text
[ENTRY] codex-runtime-event-adapter.ts:mapEventToMessages(eventEnvelope)
├── codex-runtime-event-segment-helper.ts:normalizeSegments(payload)
├── codex-runtime-event-tool-helper.ts:extractToolName(payload/toolCall/item)
│   ├── check toolName/tool_name
│   ├── check payload.tool (string)
│   └── check payload.tool.name (object)
├── codex-runtime-event-tool-helper.ts:extractToolCallArguments(payload/toolCall/item)
│   ├── merge payload.arguments + payload.item.arguments
│   └── sanitize into metadata.arguments
├── runtime-event-message-mapper.ts:mapToolCall(name, status, metadata)
└── emit ActivityMessage(toolName=<resolved>, arguments=<projected>)
```

### Branching / Fallback Paths

```text
[FALLBACK] legacy payload field present
extractToolName(...) + extractToolCallArguments(...)
└── use first non-empty canonical fields and continue
```

```text
[ERROR] no supported tool-name field present
extractToolName(...)
└── deterministic fallback to MISSING_TOOL_NAME + debug metadata for diagnosis
```

```text
[ERROR] arguments missing from payload
extractToolCallArguments(...)
└── emit empty metadata.arguments object with deterministic shape (no parser crash)
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

## Use Case: UC-019 Codex Team Message Stream Parity (`send_message_to` tool visibility + recipient `From` segment)

### Goal

Ensure Codex team runtime emits the same user-visible stream contracts as AutoByteus runtime for inter-agent messaging:

- sender sees `send_message_to` tool call in conversation/activity stream;
- recipient sees structured inter-agent message segment (`From <sender> ...`) rather than plain-text-only injection.

### Preconditions

- Team member session runtime kind is `codex_app_server`.
- Dynamic `send_message_to` is enabled for sender member capability.
- Sender invokes `send_message_to(recipient_name, content, message_type?)`.

### Expected Outcome

- Intercepted sender tool request emits canonical tool-call stream events (segment + lifecycle) with deterministic arguments.
- Relay delivery to recipient emits structured inter-agent event payload with sender identity and envelope semantics.
- Existing frontend handlers consume events with no runtime-specific UI hack branch.

### Primary Runtime Call Stack

```text
[ENTRY] codex-runtime-event-router.ts:tryHandleInterAgentRelayRequest(item/tool/call)
├── resolveDynamicToolNameFromParams() == send_message_to
├── relayHandler(...) [ASYNC]
├── emit synthetic sender events
│   ├── method=item/added (tool_call send_message_to + arguments)
│   ├── method=item/commandExecution/started
│   ├── method=item/commandExecution/completed
│   └── method=item/completed
├── codex-runtime-event-adapter.ts:map(...)
│   ├── SEGMENT_START/SEGMENT_END(tool_call)
│   └── TOOL_EXECUTION_STARTED/SUCCEEDED
└── TeamCodexRuntimeEventBridge -> TeamStreamingService -> frontend activity/conversation
```

```text
[ENTRY] codex-app-server-runtime-service.ts:injectInterAgentEnvelope(recipientRunId,envelope)
├── emit synthetic recipient event method=inter_agent_message
│   └── payload: sender_agent_id, recipient_role_name, content, message_type
├── sendTurn(...) with codex text input envelope (existing behavior retained)
└── codex-runtime-event-adapter.ts maps inter_agent_message -> INTER_AGENT_MESSAGE
   └── TeamStreamingService -> handleInterAgentMessage() -> InterAgentMessageSegment ("From ...")
```

### Branching / Fallback Paths

```text
[ERROR] sender tool capability disabled / relay unavailable / recipient invalid
tryHandleInterAgentRelayRequest(...)
├── emit sender tool-call segment/lifecycle with failure result payload
└── respondSuccess/error with deterministic failure message
```

```text
[FALLBACK] recipient structured event emit fails
injectInterAgentEnvelope(...)
├── continue envelope text injection + sendTurn path
└── emit error event for diagnostics (no crash)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`
