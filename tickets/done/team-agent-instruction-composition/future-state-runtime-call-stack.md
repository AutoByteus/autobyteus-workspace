# Future-State Runtime Call Stacks (Debug-Trace Style)

Use this document as a future-state (`to-be`) execution model derived from the design basis.
Prefer exact `file:function` frames, explicit branching, and clear state/persistence boundaries.
Do not treat this document as an as-is trace of current code behavior.

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint (API/CLI/event)
  - `[ASYNC]` async boundary (`await`, queue handoff, callback)
  - `[STATE]` in-memory mutation
  - `[IO]` file/network/database/cache IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path
- Comments: use brief inline comments with `# ...`
- Do not include legacy/backward-compatibility branches.
- Keep decoupling visible in call paths: avoid bidirectional cross-module loops and unclear dependency direction.

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v1`
- Requirements: `tickets/done/team-agent-instruction-composition/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Medium/Large`: `tickets/done/team-agent-instruction-composition/proposed-design.md`
- Source Design Version: `v1`
- Referenced Sections: `Target State`, `Change Inventory`, `Target Architecture Shape And Boundaries`

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even when current code diverges.
- If migration from as-is to to-be requires transition logic, describe that logic in `Transition Notes`; do not replace the to-be call stack with current flow.

## Use Case Index (Stable IDs)

| use_case_id | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Requirement | R-001, R-002, R-003 | N/A | Resolve shared instruction-source metadata for a member runtime | Yes/Yes/Yes |
| UC-002 | Requirement | R-003, R-004, R-005, R-007 | N/A | Start or resume Codex member runtime with shared instruction contract | Yes/Yes/Yes |
| UC-003 | Requirement | R-003, R-004, R-005, R-007 | N/A | Send Claude turn with shared instruction contract | Yes/Yes/Yes |
| UC-004 | Requirement | R-004 | N/A | Preserve `send_message_to` teammate/recipient behavior after instruction refactor | Yes/N/A/Yes |
| UC-005 | Requirement | R-006 | N/A | Deterministic fallback when team or agent instructions are missing | Yes/N/A/Yes |

## Transition Notes

- Team-run restore continues to use the persisted team manifest `teamDefinitionId` to rehydrate instruction sources during member-runtime restore.
- No compatibility branch keeps the old hard-coded full prompt composition as an alternate primary path.

## Use Case: UC-001 [Resolve Shared Instruction-Source Metadata For A Member Runtime]

### Goal

Resolve persisted team and current-agent instruction sources once during member-runtime bootstrap and attach them to the runtime reference metadata.

### Preconditions

- Team run creation or restore is in progress.
- `teamDefinitionId` is available from the team-run request or manifest.
- A member config/binding identifies the current `agentDefinitionId`.

### Expected Outcome

- Runtime metadata for the member contains normalized team instructions and agent instructions, plus existing teammate manifest and send-message capability facts.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/api/graphql/services/team-run-mutation-service.ts:ensureTeamCreated(...)
└── autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts:createMemberRuntimeSessions(teamRunId, teamDefinitionId, memberConfigs) [ASYNC]
    └── autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-session-lifecycle-service.ts:createMemberRuntimeSessions(...) [ASYNC]
        ├── autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-session-lifecycle-service.ts:buildTeamManifestMetadata(...) [ASYNC]
        ├── autobyteus-server-ts/src/agent-team-execution/services/member-runtime-instruction-source-resolver.ts:resolveForMember(...) [ASYNC]
        │   ├── autobyteus-server-ts/src/agent-team-definition/services/agent-team-definition-service.ts:getDefinitionById(teamDefinitionId) [IO]
        │   ├── autobyteus-server-ts/src/agent-definition/services/agent-definition-service.ts:getAgentDefinitionById(agentDefinitionId) [IO]
        │   └── autobyteus-server-ts/src/agent-definition/utils/prompt-loader.ts:getPromptTemplateForAgent(agentDefinitionId) [IO]
        ├── autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-session-lifecycle-service.ts:toRuntimeReference(..., metadata) [STATE]
        └── autobyteus-server-ts/src/runtime-execution/runtime-composition-service.ts:restoreAgentRun(...) [ASYNC]
```

### Branching / Fallback Paths

```text
[FALLBACK] if prompt-loader returns null for the agent prompt body
autobyteus-server-ts/src/agent-team-execution/services/member-runtime-instruction-source-resolver.ts:resolveForMember(...)
└── normalize metadata with `agentInstructions = null`, preserving `teamInstructions`
```

```text
[ERROR] if team definition lookup fails
autobyteus-server-ts/src/agent-team-execution/services/member-runtime-instruction-source-resolver.ts:resolveForMember(...)
└── autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-session-lifecycle-service.ts:createMemberRuntimeSessions(...) # fail bootstrap or surface explicit resolution error
```

### State And Data Transformations

- Team run + member config -> instruction-source lookup request
- Team definition + agent prompt body -> normalized runtime metadata payload
- Runtime metadata payload -> runtime reference attached to member binding

### Observability And Debug Points

- Logs emitted at instruction-source resolution failures
- Member runtime reference metadata updated in binding refresh path

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`No`)
- Any tight coupling or cyclic cross-module dependency introduced? (`No`)
- Any naming-to-responsibility drift detected? (`No`)

### Open Questions

- Whether to persist raw team/agent instruction source text in runtime metadata or recompute during every restore only

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 [Start Or Resume Codex Member Runtime With Shared Instruction Contract]

### Goal

Map shared instruction-source metadata into Codex thread start/resume fields without Codex owning the primary prompt policy.

### Preconditions

- Member runtime metadata already contains normalized instruction sources.
- Codex runtime service is starting or restoring a session.

### Expected Outcome

- Codex receives definition-derived instruction content plus minimal factual teammate/tool constraints.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts:restoreAgentRun(...)
└── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts:restoreRunSession(...) [ASYNC]
    └── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts:startSession(...) [ASYNC]
        ├── autobyteus-server-ts/src/runtime-execution/member-runtime/member-runtime-instruction-composer.ts:composeMemberRuntimeInstructions(runtimeMetadata) [STATE]
        ├── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts:resolveDynamicTools(...) [STATE]
        └── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-thread-lifecycle.ts:resumeCodexThread(..., baseInstructions, developerInstructions) [ASYNC]
            └── Codex app-server `thread/resume` request [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] if team instructions are null
autobyteus-server-ts/src/runtime-execution/member-runtime/member-runtime-instruction-composer.ts:composeMemberRuntimeInstructions(...)
└── emit agent-derived instruction section + runtime constraint section only
```

```text
[ERROR] if composed instruction contract is malformed
autobyteus-server-ts/src/runtime-execution/member-runtime/member-runtime-instruction-composer.ts:composeMemberRuntimeInstructions(...)
└── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts:startSession(...) # fail session startup with explicit error
```

### State And Data Transformations

- Runtime metadata -> shared instruction sections
- Shared instruction sections -> Codex `baseInstructions` / `developerInstructions`
- Team manifest + send-message capability -> dynamic tools + factual developer adjunct

### Observability And Debug Points

- Session startup logs should show that Codex consumed composed instruction sections, not runtime-owned full prompt text
- Approval/dynamic tool lifecycle remains unchanged

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`No`)
- Any tight coupling or cyclic cross-module dependency introduced? (`No`)
- Any naming-to-responsibility drift detected? (`No`)

### Open Questions

- Exact split between `baseInstructions` and `developerInstructions`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 [Send Claude Turn With Shared Instruction Contract]

### Goal

Map shared instruction-source metadata into Claude turn input while keeping MCP tool exposure separate.

### Preconditions

- Claude runtime session state includes normalized runtime metadata with instruction sources.
- Claude turn send is about to execute.

### Expected Outcome

- Claude turn input includes definition-derived instruction content for the current member plus factual teammate/tool constraints, and `send_message_to` tooling remains registered separately.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.ts:sendTurn(...)
└── autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts:sendTurn(...) [ASYNC]
    └── autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts:executeV2Turn(...) [ASYNC]
        ├── autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts:configureTeamToolingIfNeeded(...) [ASYNC]
        │   └── autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-send-message-tooling.ts:buildClaudeTeamMcpServers(...) [STATE/ASYNC]
        ├── autobyteus-server-ts/src/runtime-execution/member-runtime/member-runtime-instruction-composer.ts:composeMemberRuntimeInstructions(state.runtimeMetadata) [STATE]
        ├── autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.ts:buildClaudeTurnInput(..., composedInstructions) [STATE]
        └── Claude SDK session.send(turnInput) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] if agent instructions are null
autobyteus-server-ts/src/runtime-execution/member-runtime/member-runtime-instruction-composer.ts:composeMemberRuntimeInstructions(...)
└── emit team-derived instruction section + runtime constraint section only
```

```text
[ERROR] if Claude team tooling cannot be configured while send_message_to is enabled
autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts:configureTeamToolingIfNeeded(...)
└── throw explicit Claude tooling configuration error before sending turn
```

### State And Data Transformations

- Runtime metadata -> shared instruction sections
- Shared instruction sections + user content -> Claude turn input string
- Team manifest facts -> MCP recipient schema

### Observability And Debug Points

- Turn preamble should be attributable to shared composer output
- Tooling configuration logs remain separate from prompt composition logs

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`No`)
- Any tight coupling or cyclic cross-module dependency introduced? (`No`)
- Any naming-to-responsibility drift detected? (`No`)

### Open Questions

- Whether a future Claude SDK session-level prompt API should replace per-turn instruction wrapping

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-004 [Preserve `send_message_to` Behavior After Instruction Refactor]

### Goal

Keep teammate visibility and recipient validation correct after prompt-source ownership changes.

### Preconditions

- Team manifest metadata is present.
- `sendMessageToEnabled` has been resolved for the current member runtime.

### Expected Outcome

- The instruction refactor does not change tool availability rules or recipient validation behavior.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-send-message-tooling.ts:buildClaudeTeamMcpServers(...)
├── allowed recipient names resolved from runtime state [STATE]
└── tool schema registration remains scoped to factual teammate names [STATE]

[ENTRY] autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts:startSession(...)
├── allowed recipient names resolved from runtime metadata [STATE]
└── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-send-message-tooling.ts:resolveDynamicTools(...) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if no valid recipients remain after manifest normalization
tool exposure path
└── do not expose `send_message_to`
```

### State And Data Transformations

- Team manifest metadata -> allowed recipient names
- Allowed recipient names -> tool schema enum/dynamic tool schema

### Observability And Debug Points

- Tool exposure decisions are observable from runtime state and schema payloads

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`No`)
- Any tight coupling or cyclic cross-module dependency introduced? (`No`)
- Any naming-to-responsibility drift detected? (`No`)

### Open Questions

- None blocking

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-005 [Deterministic Fallback When Instruction Sources Are Missing]

### Goal

Ensure missing team or agent instructions produce a deterministic reduced instruction context without fabricated persona text.

### Preconditions

- One or both definition-derived instruction sources are missing or empty.

### Expected Outcome

- Shared composer emits only the available definition-derived sections plus factual runtime constraints.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/runtime-execution/member-runtime/member-runtime-instruction-composer.ts:composeMemberRuntimeInstructions(runtimeMetadata)
├── normalize empty strings to null [STATE]
├── include non-null definition-derived sections [STATE]
└── append minimal runtime constraint section if teammate/tool facts exist [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if both sources are absent and runtime metadata is internally inconsistent
autobyteus-server-ts/src/runtime-execution/member-runtime/member-runtime-instruction-composer.ts:composeMemberRuntimeInstructions(...)
└── emit explicit invariant error or minimal safe empty contract
```

### State And Data Transformations

- Raw metadata -> normalized nullable sources
- Normalized sources -> final instruction sections

### Observability And Debug Points

- Composition logs or tests should show omitted null sections clearly

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`No`)
- Any tight coupling or cyclic cross-module dependency introduced? (`No`)
- Any naming-to-responsibility drift detected? (`No`)

### Open Questions

- Whether the both-null case should hard fail or emit only factual runtime constraints

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
