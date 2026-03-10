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
- Comments: use brief inline comments with `# ...`.
- Do not include legacy/backward-compatibility branches.
- Keep decoupling visible in call paths: avoid bidirectional cross-module loops and unclear dependency direction.

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v4`
- Requirements: `tickets/in-progress/agent-skill-runtime-support-investigation/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Medium/Large`: `tickets/in-progress/agent-skill-runtime-support-investigation/proposed-design.md`
- Source Design Version: `v4`
- Referenced Sections:
  - `proposed-design.md#target-state-to-be`
  - `proposed-design.md#change-inventory-delta`
  - `proposed-design.md#target-architecture-shape-and-boundaries-mandatory`

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even when current code diverges.
- If migration from as-is to to-be requires transition logic, describe that logic in `Transition Notes`; do not replace the to-be call stack with current flow.

## Use Case Index (Stable IDs)

| use_case_id | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Requirement | R-001, R-004 | N/A | Resolve configured runtime skills | Yes/Yes/Yes |
| UC-002 | Requirement | R-001, R-002, R-004 | N/A | Codex workspace skill exposure | Yes/Yes/Yes |
| UC-003 | Requirement | R-001, R-003, R-004 | N/A | Claude turn skill exposure | Yes/Yes/Yes |
| UC-004 | Requirement | R-004, R-005 | N/A | Skill suppression and unresolved-skill handling | Yes/N/A/Yes |
| UC-005 | Requirement | R-006 | N/A | Codex client reuse by canonical `cwd` | Yes/Yes/Yes |

Rules:
- Every in-scope requirement must map to at least one use case in this index.
- `Design-Risk` use cases are allowed only when the technical objective/risk is explicit and testable.

## Transition Notes

- No schema or run-history migration is required.
- Runtime-reference metadata remains lean; heavy skill bodies stay in session state only.
- Codex client lifecycle moves from one global singleton to canonical-`cwd` acquire/release semantics.
- Codex configured-skill exposure moves from invalid turn-level path attachments to workspace-local repo-skill materialization under `.codex/skills/`.
- Codex turns carry plain user content after workspace skill discovery is established; the workspace skill mirror becomes the custom-skill contract.

## Use Case: UC-001 [Resolve Configured Runtime Skills]

### Goal

Resolve instructions, configured skills, and effective skill access mode once during run create/restore so both runtimes consume the same selected-skill set.

### Preconditions

- A valid `agentDefinitionId` is provided.
- The requested runtime create/restore input includes `skillAccessMode` or allows default access-mode resolution.

### Expected Outcome

- Shared runtime context contains:
  - lean persisted runtime metadata,
  - resolved configured skills,
  - effective skill access mode,
  - unchanged instruction fallback behavior.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts:createAgentRun(...)
├── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts:resolveWorkingDirectory(...) [ASYNC][IO]
├── autobyteus-server-ts/src/runtime-execution/single-agent-runtime-context.ts:resolveSingleAgentRuntimeContext(...) [ASYNC]
│   ├── autobyteus-server-ts/src/agent-definition/utils/prompt-loader.ts:getPromptTemplateForAgent(...) [ASYNC][IO]
│   ├── autobyteus-server-ts/src/agent-definition/services/agent-definition-service.ts:getAgentDefinitionById(...) [ASYNC][IO]
│   ├── autobyteus-ts/src/agent/context/skill-access-mode.ts:resolveSkillAccessMode(...)
│   ├── autobyteus-server-ts/src/runtime-execution/single-agent-runtime-context.ts:resolveConfiguredRuntimeSkills(...)
│   │   ├── autobyteus-server-ts/src/skills/services/skill-service.ts:getSkill(...) [IO]
│   │   └── autobyteus-server-ts/src/runtime-execution/single-agent-runtime-context.ts:toResolvedRuntimeSkill(...)
│   └── autobyteus-server-ts/src/runtime-execution/single-agent-runtime-context.ts:buildPersistedRuntimeMetadata(...)
└── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts:createRunSession(...) [ASYNC]
```

### Branching / Fallback Paths

```text
[FALLBACK] if agent.md instructions are unavailable
autobyteus-server-ts/src/runtime-execution/single-agent-runtime-context.ts:resolveSingleAgentRuntimeContext(...)
├── autobyteus-server-ts/src/agent-definition/utils/prompt-loader.ts:getPromptTemplateForAgent(...) [ASYNC][IO]
└── autobyteus-server-ts/src/runtime-execution/single-agent-runtime-context.ts:resolveFallbackAgentInstructions(...) # uses agent description
```

```text
[ERROR] if agent definition is missing
autobyteus-server-ts/src/runtime-execution/single-agent-runtime-context.ts:resolveSingleAgentRuntimeContext(...)
└── autobyteus-server-ts/src/agent-definition/services/agent-definition-service.ts:getAgentDefinitionById(...) [ASYNC][IO]
    └── throws runtime bootstrap error to adapter
```

### State And Data Transformations

- `RuntimeCreateAgentRunInput` -> `requested skill access mode`
- `AgentDefinition.skillNames` -> `ResolvedRuntimeSkill[]`
- instructions + selected skills + effective access mode -> `SingleAgentRuntimeContext`

### Observability And Debug Points

- Logs emitted at:
  - unresolved skill skip warnings,
  - instruction fallback warning,
  - context resolution summary with selected skill count.
- Metrics/counters updated at:
  - none in this ticket.
- Tracing spans (if any):
  - none in this ticket.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`) `No`
- Any tight coupling or cyclic cross-module dependency introduced? (`Yes/No`) `No`
- Any naming-to-responsibility drift detected? (`Yes/No`) `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 [Codex Workspace Skill Exposure]

### Goal

Expose the agent's configured skills to Codex by materializing repo-scoped workspace skills that the app server can discover and invoke natively.

### Preconditions

- Codex run session create/restore has selected skills available in session bootstrap input.
- A workspace `cwd` is available for repo-scoped skill materialization.
- Effective skill access mode is not `NONE`.

### Expected Outcome

- The active workspace contains runtime-owned `.codex/skills/<materialized-name>/` bundles for the selected skills, each with `SKILL.md` and a usable `agents/openai.yaml`, and subsequent turns can use plain user input while Codex discovers those skills from the workspace.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-session-bootstrap.ts:startCodexRuntimeSession(...)
├── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts:acquireClient(...) [ASYNC]
├── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-workspace-skill-materializer.ts:materializeConfiguredCodexWorkspaceSkills(...) [ASYNC][IO]
│   ├── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-workspace-skill-materializer.ts:ensureWorkspaceSkillRoot(...) [IO]
│   ├── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-workspace-skill-materializer.ts:planMaterializedSkillBundle(...)
│   ├── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-workspace-skill-materializer.ts:mirrorConfiguredSkillFiles(...) [IO]
│   ├── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-workspace-skill-materializer.ts:ensureOpenAiAgentConfig(...) [IO]
│   │   └── autobyteus-server-ts/src/runtime-execution/configured-runtime-skills.ts:renderCodexWorkspaceSkillOpenAiYaml(...)
│   └── returns materialized skill descriptors + cleanup ownership
├── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-thread-lifecycle.ts:startCodexThread(...) [ASYNC][IO]
├── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-shared.ts:createCodexRuntimeSessionState(...) [STATE]
└── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts:sendTurn(...) [ASYNC]
    ├── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts:awaitStartupReady(...) [ASYNC]
    ├── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-user-input-mapper.ts:toCodexUserInput(...) # plain text/image mapping only
    ├── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-client.ts:request(\"turn/start\", ...) [ASYNC][IO]
    ├── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-launch-config.ts:resolveTurnId(...)
    └── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts:updateRunStateAfterTurnStart(...) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if no configured skills resolve or access mode is NONE
autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-workspace-skill-materializer.ts:materializeConfiguredCodexWorkspaceSkills(...)
└── returns empty materialization result without touching `.codex/skills`; turn input still uses plain text/image mapping
```

```text
[ERROR] if workspace skill materialization fails or cleanup encounters owned-bundle issues
autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-workspace-skill-materializer.ts:materializeConfiguredCodexWorkspaceSkills(...) [ASYNC][IO]
└── throws bootstrap failure before thread start so the run does not claim skill availability it cannot honor

autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts:closeRunSession(...) [ASYNC]
└── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-workspace-skill-materializer.ts:cleanupMaterializedCodexWorkspaceSkills(...) [ASYNC][IO]
    └── logs best-effort cleanup failure without deleting unmanaged workspace skill bundles
```

### State And Data Transformations

- `ResolvedRuntimeSkill[]` -> workspace-local `.codex/skills/<materialized-name>/` bundles
- missing source `agents/openai.yaml` -> synthesized Codex-facing `agents/openai.yaml`
- materialized workspace skill bundles -> runtime session cleanup handles and metadata
- `AgentInputUserMessage` -> plain Codex input array after repo-skill discovery is established
- app-server response -> `turnId` + updated run status

### Observability And Debug Points

- Logs emitted at:
  - raw-event debug logging already present in Codex service,
  - workspace skill materialization summary with selected skill count and mirror root,
  - cleanup warnings when a managed workspace skill bundle cannot be removed.
- Metrics/counters updated at:
  - none in this ticket.
- Tracing spans (if any):
  - none in this ticket.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`) `No`
- Any tight coupling or cyclic cross-module dependency introduced? (`Yes/No`) `No`
- Any naming-to-responsibility drift detected? (`Yes/No`) `No`

### Open Questions

- What is the cleanest conflict-safe naming strategy when the workspace already contains a repo skill with the same name?

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 [Claude Turn Skill Exposure]

### Goal

Expose the agent's configured skills to Claude on every turn through selected-skill prompt context that includes root-path guidance.

### Preconditions

- Claude run session has already been created or restored with selected skills in session state.
- Effective skill access mode is not `NONE`.

### Expected Outcome

- Claude turn input contains team/agent/runtime instructions plus a selected-skill block listing the configured skills with root paths and skill content.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts:sendTurn(...)
├── autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-turn-scheduler.ts:waitForRunIdle(...) [ASYNC]
├── autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts:executeV2Turn(...) [ASYNC]
│   ├── autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.ts:buildClaudeTurnInput(...)
│   │   ├── autobyteus-server-ts/src/runtime-execution/member-runtime/member-runtime-instruction-composer.ts:resolveMemberRuntimeInstructionSourcesFromMetadata(...)
│   │   ├── autobyteus-server-ts/src/runtime-execution/member-runtime/member-runtime-instruction-composer.ts:composeMemberRuntimeInstructions(...)
│   │   └── autobyteus-server-ts/src/runtime-execution/configured-runtime-skills.ts:renderConfiguredSkillInstructionBlock(...)
│   ├── autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-v2-control-interop.ts:createOrResumeClaudeV2Session(...) [ASYNC]
│   ├── autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-v2-control-interop.ts:ClaudeV2SessionLike.send(...) [ASYNC][IO]
│   └── autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-v2-control-interop.ts:ClaudeV2SessionLike.stream(...) [ASYNC][IO]
└── autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts:emitEvent(...) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if no configured skills resolve or access mode is NONE
autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.ts:buildClaudeTurnInput(...)
└── autobyteus-server-ts/src/runtime-execution/configured-runtime-skills.ts:renderConfiguredSkillInstructionBlock(...) # returns null, prompt includes only existing instructions
```

```text
[ERROR] if Claude turn execution fails after prompt construction
autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts:executeV2Turn(...) [ASYNC]
└── emits `CLAUDE_RUNTIME_TURN_FAILED` error event and clears active turn state
```

### State And Data Transformations

- `ResolvedRuntimeSkill[]` -> rendered Claude selected-skill instruction block
- team/agent/runtime instructions + skill block + user content -> Claude V2 prompt string
- Claude stream chunks -> transcript updates and runtime events

### Observability And Debug Points

- Logs emitted at:
  - selected-skill block suppression for `NONE` or empty skill sets,
  - unresolved skill skip warnings during session bootstrap.
- Metrics/counters updated at:
  - none in this ticket.
- Tracing spans (if any):
  - none in this ticket.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`) `No`
- Any tight coupling or cyclic cross-module dependency introduced? (`Yes/No`) `No`
- Any naming-to-responsibility drift detected? (`Yes/No`) `No`

### Open Questions

- Whether a future Claude SDK release will support session-scoped external skill roots cleanly enough to replace prompt injection.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-004 [Skill Suppression And Unresolved-Skill Handling]

### Goal

Ensure `NONE` mode or missing configured skills do not crash runtime bootstrap and do not expose unintended skills.

### Preconditions

- Launch input explicitly requests `SkillAccessMode.NONE`, or at least one configured skill name cannot be resolved.

### Expected Outcome

- Shared runtime context returns zero selected skills, runtime startup continues, and downstream turn construction sees no configured skills.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/runtime-execution/single-agent-runtime-context.ts:resolveSingleAgentRuntimeContext(...)
├── autobyteus-ts/src/agent/context/skill-access-mode.ts:resolveSkillAccessMode(...)
├── autobyteus-server-ts/src/runtime-execution/single-agent-runtime-context.ts:resolveConfiguredRuntimeSkills(...)
│   ├── if effective mode = NONE -> return [] immediately
│   ├── autobyteus-server-ts/src/skills/services/skill-service.ts:getSkill(...) [IO]
│   └── if skill missing -> log warning and skip item
└── autobyteus-server-ts/src/runtime-execution/single-agent-runtime-context.ts:buildPersistedRuntimeMetadata(...)
```

### Branching / Fallback Paths

```text
[FALLBACK] N/A
```

```text
[ERROR] if all configured skills are missing but instructions still resolve
autobyteus-server-ts/src/runtime-execution/single-agent-runtime-context.ts:resolveConfiguredRuntimeSkills(...)
└── skips all missing skills, returns [] without throwing # controlled suppression path, not fatal startup
```

### State And Data Transformations

- `SkillAccessMode.NONE` -> no selected skill descriptors
- configured skill names with missing filesystem entries -> filtered resolved-skill list
- filtered resolved-skill list -> no-op Codex/Claude consumption paths

### Observability And Debug Points

- Logs emitted at:
  - unresolved skill skip warnings,
  - suppression path summaries.
- Metrics/counters updated at:
  - none in this ticket.
- Tracing spans (if any):
  - none in this ticket.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`) `No`
- Any tight coupling or cyclic cross-module dependency introduced? (`Yes/No`) `No`
- Any naming-to-responsibility drift detected? (`Yes/No`) `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-005 [Codex Client Reuse By Canonical `cwd`]

### Goal

Reuse one Codex app-server client for runs that share the same canonical workspace/worktree path while isolating different workspace paths into different clients.

### Preconditions

- A Codex runtime call needs an app-server client for a specific `cwd`.
- The implementation has normalized the requested path into a canonical `cwd` key.

### Expected Outcome

- Same canonical `cwd` -> same started Codex client/process.
- Different canonical `cwd` values -> different Codex clients/processes.
- Session startup and utility callers release their hold when they no longer need that `cwd`-scoped client.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-session-bootstrap.ts:startCodexRuntimeSession(...)
├── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts:acquireClient(...) [ASYNC]
│   ├── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts:normalizeClientKey(...)
│   ├── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts:getOrCreateEntry(...)
│   ├── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts:ensureStarted(...) [ASYNC]
│   │   ├── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts:startClient(...) [ASYNC]
│   │   │   ├── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-client.ts:start(...) [ASYNC][IO]
│   │   │   └── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts:initializeClient(...) [ASYNC][IO]
│   │   └── returns existing started client when the same canonical key already exists
│   └── increments holder count for the canonical key
├── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-thread-lifecycle.ts:startCodexThread(...) [ASYNC][IO]
└── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts:closeRunSession(...) [ASYNC]
    └── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts:releaseClient(...) [ASYNC]
```

### Branching / Fallback Paths

```text
[FALLBACK] if a utility call needs a temporary client without owning a long-lived run session
autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-thread-history-reader.ts:readThread(...) [ASYNC]
├── autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts:acquireClient(...) [ASYNC]
└── finally -> autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts:releaseClient(...) [ASYNC]
```

```text
[ERROR] if Codex client startup fails for a canonical `cwd`
autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts:ensureStarted(...) [ASYNC]
└── decrements the holder count for the failed acquire and rethrows startup failure
```

### State And Data Transformations

- raw `cwd` string -> canonical client-registry key
- canonical key + acquire request -> `refCount + 1`
- last release for canonical key -> client close and registry entry removal

### Observability And Debug Points

- Logs emitted at:
  - none required beyond existing Codex client stderr logging in this ticket.
- Metrics/counters updated at:
  - none in this ticket.
- Tracing spans (if any):
  - none in this ticket.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`) `No`
- Any tight coupling or cyclic cross-module dependency introduced? (`Yes/No`) `No`
- Any naming-to-responsibility drift detected? (`Yes/No`) `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`
