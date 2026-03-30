# Future-State Runtime Call Stacks (Debug-Trace Style)

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint (UI interaction / store action)
  - `[ASYNC]` async boundary
  - `[STATE]` in-memory mutation
  - `[IO]` network/file/graphql IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path
- No legacy/backward-compatibility branches are modeled.

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/done/team-global-thinking-config/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Small`: `tickets/done/team-global-thinking-config/implementation.md`
- Source Design Version: `v1`
- Referenced Sections:
  - Spine inventory sections: `DS-001`, `DS-002`, `DS-003`
  - Ownership sections: `Solution Sketch`, `Spine-Led Dependency And Sequencing Map`

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even if current reopen logic still differs.
- Every use case below maps directly to an approved spine.

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-101 | DS-001 | Primary End-to-End | Team config UI | Requirement | R-101, R-102 | N/A | Render team-global model config UI | Yes/Yes/Yes |
| UC-102 | DS-002 | Primary End-to-End | Team launch state | Requirement | R-104 | N/A | Launch team with inherited global model config | Yes/No/Yes |
| UC-103 | DS-001 | Bounded Local | Member override item | Requirement | R-103, R-106 | N/A | Member override inherits or diverges from global config | Yes/Yes/Yes |
| UC-104 | DS-003 | Primary End-to-End | Team reopen/hydration | Requirement | R-101, R-105 | N/A | Reconstruct reopened team config from member metadata | Yes/Yes/Yes |
| UC-105 | DS-003 | Bounded Local | Team restore inference helper | Design-Risk | R-105 | Reconstruct minimal override set from member-only persisted truth | Infer dominant global defaults deterministically | Yes/N/A/Yes |

## Transition Notes

- No temporary migration branch is needed; restored team config uses inferred defaults directly from existing member metadata.
- Old duplicate reconstruction blocks in open/hydration should be removed in scope.

## Use Case: UC-101 Render team-global model config UI

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `components/workspace/config/*`
- Why This Use Case Matters To This Spine:
  - This is the direct user-visible gap reported in the request.

### Goal
- Allow users to configure team-level thinking/model params once at the global team level.

### Preconditions
- Team config panel is open.
- Runtime-specific model list has loaded.
- User has selected a model with config schema.

### Expected Outcome
- Team form shows the same thinking/model-config controls available in single-agent config.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/workspace/config/TeamRunConfigForm.vue:updateModel(modelId)
├── [STATE] autobyteus-web/types/agent/TeamRunConfig.ts:config.llmModelIdentifier = modelId
├── autobyteus-web/components/workspace/config/TeamRunConfigForm.vue:modelConfigSchema(computed)
│   └── autobyteus-web/stores/llmProviderConfig.ts:modelConfigSchemaByIdentifier(modelId)
├── autobyteus-web/components/workspace/config/ModelConfigSection.vue:render(schema, config.llmConfig)
│   ├── autobyteus-web/utils/llmThinkingConfigAdapter.ts:getThinkingToggleState(...)
│   └── [STATE] autobyteus-web/components/workspace/config/TeamRunConfigForm.vue:updateModelConfig(nextConfig)
└── [STATE] autobyteus-web/components/workspace/config/MemberOverrideItem.vue:resolveEffectiveMemberModelConfig(...)
```

### Branching / Fallback Paths

```text
[FALLBACK] if selected model exposes no config schema
TeamRunConfigForm.vue:modelConfigSchema(computed)
└── ModelConfigSection.vue:clearConfigIfEmptySchema() # global config cleared/hidden
```

```text
[ERROR] if selected runtime becomes unavailable
TeamRunConfigForm.vue:watch(runtimeAvailability)
└── [STATE] reset runtime/model/global llmConfig to safe defaults
```

### State And Data Transformations

- Selected model identifier -> runtime-specific model config schema lookup.
- Global `TeamRunConfig.llmConfig` -> `ModelConfigSection` editable config.
- Global config + member override -> effective member config preview.

### Observability And Debug Points

- Component/spec assertions on rendered thinking labels and emitted config updates.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-102 Launch team with inherited global model config

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `stores/agentTeamContextsStore.ts`, `stores/agentTeamRunStore.ts`
- Why This Use Case Matters To This Spine:
  - Global config is only useful if the launch payload expands it into member configs.

### Goal
- Ensure launched team members receive global model config by default.

### Preconditions
- Team draft config contains a selected global model and global `llmConfig`.
- Member override may or may not define its own `llmConfig`.

### Expected Outcome
- Each launched member receives either its explicit override config or the team-global config.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/stores/agentTeamRunStore.ts:sendMessageToFocusedMember(...)
├── autobyteus-web/stores/agentTeamRunStore.ts:build memberConfigs[]
│   ├── autobyteus-web/utils/teamRunConfigUtils.ts:hasExplicitMemberLlmConfigOverride(override)
│   └── [STATE] choose member.llmConfig = override.llmConfig OR activeTeam.config.llmConfig
├── [ASYNC][IO] autobyteus-web/utils/apolloClient.ts:mutate(CreateAgentTeamRun)
└── [ASYNC][IO] autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts:createTeamRun(input.memberConfigs)
    └── [IO] team-run metadata persists member `llmConfig`
```

### Branching / Fallback Paths

```text
[ERROR] if team definition cannot be resolved for temporary run
agentTeamRunStore.ts:sendMessageToFocusedMember(...)
└── throw Error("Team definition ... not found.")
```

### State And Data Transformations

- Team-global config + member override semantics -> concrete `TeamMemberConfigInput.llmConfig` per member.
- GraphQL member input -> persisted backend member metadata.

### Observability And Debug Points

- Store/spec assertions on `CreateAgentTeamRun` mutation variables.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-103 Member override inherits or diverges from global config

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Bounded Local`
- Governing Owner: `MemberOverrideItem.vue`
- Why This Use Case Matters To This Spine:
  - The override editor must preserve lazy inheritance while still allowing explicit divergence.

### Goal
- Show inherited global config until the user chooses to diverge, then store only the member-specific difference.

### Preconditions
- Team config has a global model and optionally global `llmConfig`.
- Member override object may omit `llmConfig`, hold an object, or hold explicit `null`.

### Expected Outcome
- Effective member config matches global by default and only becomes explicit when divergent.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/workspace/config/MemberOverrideItem.vue:effectiveModelConfig(computed)
├── autobyteus-web/utils/teamRunConfigUtils.ts:hasExplicitMemberLlmConfigOverride(override)
├── autobyteus-web/utils/teamRunConfigUtils.ts:resolveEffectiveMemberLlmConfig(override, globalLlmConfig)
├── autobyteus-web/components/workspace/config/ModelConfigSection.vue:emit update:config(nextConfig)
└── [STATE] MemberOverrideItem.vue:emitOverrideWithConfig(nextConfig)
    ├── autobyteus-web/utils/teamRunConfigUtils.ts:modelConfigsEqual(nextConfig, globalLlmConfig)
    └── [STATE] emit update:override(memberName, override|null)
```

### Branching / Fallback Paths

```text
[FALLBACK] if member model override uses a different schema
MemberOverrideItem.vue:modelConfigSchema(computed)
└── ModelConfigSection.vue:sanitizeConfigIfNeeded() # strip incompatible params
```

```text
[ERROR] if override becomes empty after reconciliation
MemberOverrideItem.vue:emitOverrideWithConfig(...)
└── emit update:override(memberName, null)
```

### State And Data Transformations

- `override.llmConfig === undefined` -> inherit global config.
- `override.llmConfig === null` -> explicit empty/cleared member config.
- `override.llmConfig === object` -> explicit member model config.

### Observability And Debug Points

- Component/spec assertions on effective rendered config and emitted override payloads.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-104 Reconstruct reopened team config from member metadata

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `services/runHydration/*`, `services/runOpen/*`
- Why This Use Case Matters To This Spine:
  - Reopened runs must preserve the lazy/global editing model rather than exposing every member as overridden.

### Goal
- Rebuild `TeamRunConfig` from persisted member metadata with inferred global defaults and only divergent member overrides.

### Preconditions
- Team resume metadata is available.
- Member metadata already contains per-member model, auto-execute, runtime, skill access, and `llmConfig`.

### Expected Outcome
- Rehydrated/opened team config shows one inferred global config plus minimal member overrides.

### Primary Runtime Call Stack

```text
[ENTRY][ASYNC] autobyteus-web/services/runHydration/teamRunContextHydrationService.ts:loadTeamRunContextHydrationPayload(...)
├── [ASYNC][IO] GraphQL getTeamRunResumeConfig(...)
├── autobyteus-web/stores/runHistoryMetadata.ts:parseTeamRunMetadata(...)
├── [ASYNC] autobyteus-web/stores/runHistoryTeamHelpers.ts:buildTeamMemberContexts(...)
├── autobyteus-web/utils/teamRunConfigUtils.ts:reconstructTeamRunConfigFromMetadata(metadata, firstWorkspaceId, isLocked)
└── [STATE] hydrate/open team context with reconstructed `TeamRunConfig`
```

### Branching / Fallback Paths

```text
[FALLBACK] if members disagree on model/config values
teamRunConfigUtils.ts:pickDominantValue(...)
└── choose most frequent value, break ties with coordinator/first-member preference
```

```text
[ERROR] if metadata has no members
teamRunContextHydrationService.ts:loadTeamRunContextHydrationPayload(...)
└── throw Error("Team ... has no members in metadata.")
```

### State And Data Transformations

- Member metadata set -> inferred global runtime/model/auto-execute/skill-access/llmConfig.
- Member metadata set - inferred global defaults -> explicit member override map.

### Observability And Debug Points

- Helper/spec assertions on reconstructed `TeamRunConfig`.
- Existing open/hydration flows continue to use parsed metadata + member contexts unchanged.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-105 Infer dominant global defaults deterministically

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Bounded Local`
- Governing Owner: `teamRunConfigUtils.ts`
- Why This Use Case Matters To This Spine:
  - Restore inference is the only non-trivial design-risk logic in scope.

### Goal
- Produce stable global defaults independent of currently focused member selection.

### Preconditions
- Parsed member metadata exists.

### Expected Outcome
- Dominant values are selected by frequency and ties resolve consistently using coordinator/first-member preference.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/utils/teamRunConfigUtils.ts:reconstructTeamRunConfigFromMetadata(...)
├── teamRunConfigUtils.ts:pickDominantValue(runtimeKind)
├── teamRunConfigUtils.ts:pickDominantValue(llmModelIdentifier)
├── teamRunConfigUtils.ts:pickDominantValue(autoExecuteTools)
├── teamRunConfigUtils.ts:pickDominantValue(skillAccessMode)
├── teamRunConfigUtils.ts:pickDominantValue(global llmConfig among members using global model)
└── teamRunConfigUtils.ts:build minimal memberOverrides[]
```

### Branching / Fallback Paths

```text
[ERROR] if comparable config serialization fails unexpectedly
teamRunConfigUtils.ts:modelConfigKey(...)
└── fall back to normalized null/object copy and deterministic stringification
```

### State And Data Transformations

- Heterogeneous member value list -> dominant global value + explicit divergent override set.

### Observability And Debug Points

- Unit tests for tie-breaking and explicit-null override reconstruction.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
