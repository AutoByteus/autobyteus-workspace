# Future-State Runtime Call Stack

## Status

- Scope Classification: `Large`
- Focus Slice: `Team runtime core stack`
- Call Stack Version: `v1`
- Requirements: `tickets/in-progress/runtime-domain-subject-refactor/requirements.md` (`Design-ready`)
- Source Artifact: `tickets/in-progress/runtime-domain-subject-refactor/proposed-design.md`
- Source Design Version: `v10`
- Referenced Sections:
  - `TeamRun` responsibilities
  - `AgentTeamRunManager` / `TeamRunBackendFactory`
  - `85a. Team-side backend-factory refactor is practical and should become the next spine cleanup`
  - `86. AgentRunConfig and TeamRunConfig should sit above backend-specific configs`

## Scope Note

This call-stack artifact models the first team-runtime implementation slice only:

- manager-owned team creation
- manager-owned team restore/continuation
- member-runtime orchestration hidden beneath a team backend factory

It does not yet model the later websocket/projection normalization slice in detail. That remains in the design basis and can be expanded in a later call-stack round after the manager/factory seam lands.

## Future-State Modeling Rule

- Model the target design, not current code shape.
- Do not preserve `resolveTeamRuntimeMode(...)` as a top-level launch concern.
- Do not preserve direct `TeamRunLaunchService -> TeamMemberManager` construction paths.
- Do not preserve continuation-side native-vs-member branching above the `TeamRun` boundary.

## Transition Notes

- Temporary migration logic is not part of the target stack.
- The following current top-level paths are expected to retire as code moves to the target state:
  - `TeamRunLaunchService.resolveTeamRuntimeMode(...)`
  - direct top-level `TeamRunLaunchService -> TeamMemberManager.createMemberRuntimeSessions(...)`
  - direct top-level `TeamRunContinuationService -> TeamMemberManager.restoreMemberRuntimeSessions(...)`

## Use Case Index

| use_case_id | Spine ID(s) | Spine Scope | Governing Owner | Source Type | Requirement ID(s) | Design-Risk Objective | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `UC-TEAM-001` | `DS-TEAM-001` | `Primary End-to-End` | `AgentTeamRunManager` | `Requirement` | `R-002`, `R-004`, `R-012` | `N/A` | `Create one live TeamRun through a manager-owned backend-factory seam` | `Primary/Fallback/Error` |
| `UC-TEAM-002` | `DS-TEAM-002` | `Primary End-to-End` | `TeamRunContinuationService` | `Requirement` | `R-010`, `R-015`, `R-016` | `N/A` | `Continue a team run through one TeamRun restore boundary` | `Primary/Fallback/Error` |
| `UC-TEAM-003` | `DS-TEAM-003` | `Bounded Local` | `CodexTeamRunBackend / ClaudeTeamRunBackend` | `Requirement` | `R-012`, `R-017` | `N/A` | `Materialize or restore member runtimes beneath one TeamRun backend` | `Primary/Fallback/Error` |

## Use Case: UC-TEAM-001 Create one live TeamRun through a manager-owned backend-factory seam

### Spine Context

- Spine ID(s): `DS-TEAM-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `AgentTeamRunManager`
- Why This Use Case Matters To This Spine:
  - This is the first ownership cut that removes execution-shape branching from `TeamRunLaunchService`.

### Goal

Create one live `TeamRun` without exposing AutoByteus team versus member-runtime branching above the manager boundary.

### Preconditions

- Boundary input is already normalized into `TeamRunConfig`.
- Team history metadata can persist the initial manifest after live creation succeeds.

### Expected Outcome

- Exactly one `TeamRun` is registered in `AgentTeamRunManager`.
- The concrete backend is created internally.
- Team manifest/history persistence happens after the live run exists, not during backend selection.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/api/graphql/services/team-run-mutation-service.ts:ensureTeamCreated(...)
├── autobyteus-server-ts/src/agent-team-execution/services/team-run-launch-service.ts:ensureTeamRun(...)
├── autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts:createTeamRun(...)
│   ├── autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend-factory.ts:createTeamRun(...) [ASYNC]
│   ├── autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts:constructor(...) [STATE]
│   └── autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts:registerActiveRun(...) [STATE]
├── autobyteus-server-ts/src/run-history/services/team-run-history-service.ts:recordTeamRunCreated(...) [IO]
└── autobyteus-server-ts/src/api/graphql/services/team-run-mutation-service.ts:returnTeamRunId(...)
```

### Branching / Fallback Paths

```text
[FALLBACK] runtime supports one AutoByteus team runtime
autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend-factory.ts:createTeamRun(...)
└── autobyteus-server-ts/src/agent-team-execution/backends/autobyteus-team-run-backend-factory.ts:createBackend(...) [ASYNC]
```

```text
[FALLBACK] runtime realizes a team from member runtimes
autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend-factory.ts:createTeamRun(...)
├── autobyteus-server-ts/src/agent-team-execution/backends/codex-team-run-backend-factory.ts:createTeamRun(...) [ASYNC]
└── autobyteus-server-ts/src/agent-team-execution/backends/claude-team-run-backend-factory.ts:createTeamRun(...) [ASYNC]
```

```text
[ERROR] backend creation fails before a live TeamRun exists
autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend-factory.ts:createTeamRun(...)
└── autobyteus-server-ts/src/agent-team-execution/services/team-run-launch-service.ts:mapCreateFailure(...)
```

### State And Data Transformations

- Boundary launch input -> `TeamRunConfig`
- `TeamRunConfig` -> backend-specific create input
- backend-specific create result -> live `TeamRun`
- live `TeamRun` + config -> persisted team manifest

### Observability And Debug Points

- Launch-service entry log
- Manager register-active-run log
- Team history create log

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None for this slice.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-TEAM-002 Continue a team run through one TeamRun restore boundary

### Spine Context

- Spine ID(s): `DS-TEAM-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `TeamRunContinuationService`
- Why This Use Case Matters To This Spine:
  - Continuation is the current place where AutoByteus team and member-runtime restore still leak above `TeamRun`.

### Goal

Continue a team run through one active-or-restore path, then post the message through `TeamRun`.

### Preconditions

- Team history already stores resume configuration and runtime references.
- `AgentTeamRunManager` can either resolve an active run or restore one.

### Expected Outcome

- `TeamRunContinuationService` does not reconstruct member-runtime `TeamRun` objects itself.
- `TeamRun.postMessage(...)` is the only live command boundary used after ensure/restore.
- Team history records activity after the command is accepted.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/api/graphql/services/team-run-mutation-service.ts:sendMessageToTeam(...)
├── autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts:continueTeamRunWithMessage(...)
│   ├── autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts:getActiveRun(...) [STATE]
│   ├── [FALLBACK] autobyteus-server-ts/src/run-history/services/team-run-history-service.ts:getTeamRunResumeConfig(...) [IO]
│   ├── [FALLBACK] autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts:restoreTeamRun(...) [ASYNC]
│   ├── autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts:postMessage(...) [ASYNC]
│   │   └── autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend.ts:postMessage(...) [ASYNC]
│   └── autobyteus-server-ts/src/run-history/services/team-run-history-service.ts:recordTeamRunActivity(...) [IO]
└── autobyteus-server-ts/src/api/graphql/services/team-run-mutation-service.ts:returnDispatchResult(...)
```

### Branching / Fallback Paths

```text
[FALLBACK] active TeamRun already exists
autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts:continueTeamRunWithMessage(...)
├── autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts:getActiveRun(...) [STATE]
└── autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts:postMessage(...) [ASYNC]
```

```text
[FALLBACK] TeamRun must be restored from persisted resume config
autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts:restoreTeamRun(...)
└── autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend-factory.ts:restoreTeamRun(...) [ASYNC]
```

```text
[ERROR] restore succeeds but the first postMessage fails
autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts:postMessage(...)
└── autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts:cleanupFailedRestore(...)
```

### State And Data Transformations

- persisted resume config -> backend restore request
- backend restore result -> live `TeamRun`
- user message -> backend command
- accepted command -> team activity metadata update

### Observability And Debug Points

- Continuation-service ensure/restore branch log
- Manager restore log
- Team activity persistence log

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None for this slice.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-TEAM-003 Materialize or restore member runtimes beneath one TeamRun backend

### Spine Context

- Spine ID(s): `DS-TEAM-003`
- Spine Scope: `Bounded Local`
- Governing Owner: `CodexTeamRunBackend / ClaudeTeamRunBackend`
- Why This Use Case Matters To This Spine:
  - Member-runtime orchestration is the main support structure that must move beneath the `TeamRun` backend boundary.

### Goal

Create or restore member runtimes beneath one team backend, then bind them under one `teamRunId`.

### Preconditions

- All member configs have already been normalized into one runtime-consistent team input.
- `AgentRunManager` already owns runtime-neutral member run creation and restore.

### Expected Outcome

- Member runtimes do not surface as peer top-level team-creation concepts.
- Team binding state is written once and then consumed through the team backend.
- Runtime-specific team member orchestration is owned by the Codex or Claude team backend after the factory creates it.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-team-execution/backends/codex-team-run-backend-factory.ts:createTeamRun(...)
  or autobyteus-server-ts/src/agent-team-execution/backends/claude-team-run-backend-factory.ts:createTeamRun(...)
├── autobyteus-server-ts/src/agent-team-execution/backends/codex-team-run-backend.ts:constructor(...) [STATE]
  or autobyteus-server-ts/src/agent-team-execution/backends/claude-team-run-backend.ts:constructor(...) [STATE]
├── autobyteus-server-ts/src/agent-team-execution/backends/codex-team-member-manager.ts:createOrRestoreMembers(...) [ASYNC]
  or autobyteus-server-ts/src/agent-team-execution/backends/claude-team-member-manager.ts:createOrRestoreMembers(...) [ASYNC]
│   ├── internal member AgentRun creation/restore [ASYNC]
│   └── autobyteus-server-ts/src/agent-team-execution/services/team-runtime-binding-registry.ts:upsertTeamBindings(...) [STATE]
└── autobyteus-server-ts/src/agent-team-execution/backends/codex-team-run-backend-factory.ts:returnTeamRun(...)
  or autobyteus-server-ts/src/agent-team-execution/backends/claude-team-run-backend-factory.ts:returnTeamRun(...)
```

### Branching / Fallback Paths

```text
[FALLBACK] runtime kind is Codex
autobyteus-server-ts/src/agent-team-execution/backends/codex-team-run-backend-factory.ts:createTeamRun(...)
└── autobyteus-server-ts/src/agent-team-execution/backends/codex-team-run-backend.ts
    -> autobyteus-server-ts/src/agent-team-execution/backends/codex-team-member-manager.ts [STATE]
```

```text
[FALLBACK] runtime kind is Claude
autobyteus-server-ts/src/agent-team-execution/backends/claude-team-run-backend-factory.ts:createTeamRun(...)
└── autobyteus-server-ts/src/agent-team-execution/backends/claude-team-run-backend.ts
    -> autobyteus-server-ts/src/agent-team-execution/backends/claude-team-member-manager.ts [STATE]
```

```text
[ERROR] member configs resolve to mixed runtime kinds
autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts:resolveSingleMemberRuntimeKind(...)
└── throws AgentTeamCreationError before a runtime-specific team backend factory is selected
```

### State And Data Transformations

- team member configs -> per-member `AgentRunConfig` / restore request
- per-member run results -> `TeamRunMemberBinding[]`
- `TeamRunMemberBinding[]` -> binding-registry state
- runtime-specific team backend + runtime-specific team member manager -> member-run team execution

### Observability And Debug Points

- Member-runtime factory create/restore log
- Team member manager per-member run result log
- Team binding registry upsert log

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-module dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None for this slice.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`
