# Requirements

## Status

- Current Status: `Design-ready`
- Previous Status: `Draft`

## Goal / Problem Statement

The current runtime architecture is asymmetric:

- the native AutoByteus runtime is organized around clear domain subjects such as `AgentConfig`, `Agent`, and `AgentTeam`
- the Codex and Claude runtimes are organized around runtime sessions, adapters, ingress services, mappers, and bridges

This works functionally, but it makes the Codex and Claude paths harder to understand and harder to extend. The refactoring goal is to introduce explicit runtime domain subjects for external runtimes so the major services and components contribute to those subjects instead of replacing them.

The intended direction is:

- preserve the existing `AgentDefinition` and team-definition model
- introduce first-class runtime subjects such as `AgentRun` and `TeamRun` for Codex and Claude
- keep runtime adapters and runtime services as infrastructure beneath those subjects
- make external messaging, status, event emission, tool approval, and team routing belong to the run/team subjects
- keep the current frontend websocket protocol and runtime-unaware streaming behavior unchanged for the first refactor slice

## Scope Classification

- Classification: `Large`
- Rationale:
  - The refactor crosses runtime creation, command ingress, event streaming, external-channel routing, and team-member runtime orchestration.
  - The work changes architectural ownership boundaries, not just one local implementation path.

## In-Scope Use Cases

- `UC-000`: Bootstrap a dedicated ticket and branch for the runtime domain-subject refactor.
- `UC-001`: Document how native runtime currently centers behavior around explicit domain subjects.
- `UC-002`: Document how Codex and Claude currently create, store, command, and stream runs.
- `UC-003`: Define the target runtime domain subjects for external runtimes.
- `UC-004`: Define which current services should become factories, repositories, bridges, or infrastructure collaborators beneath the new domain subjects.
- `UC-005`: Define how external-channel messaging should bind to the new `AgentRun` and `TeamRun` boundaries.
- `UC-006`: Define how team member runtime orchestration should become an implementation detail of `TeamRun` instead of a peer architectural concept.
- `UC-007`: Define how active runtime snapshots should be served from `AgentRun` / `TeamRun` without reconstructing runtime state from multiple peer services.
- `UC-008`: Define how run/team history, manifests, and continuation/resume flows relate to the new live run subjects.
- `UC-009`: Define how persisted projection/read-model services remain runtime-specific without owning live execution.

## Out Of Scope / Non-Goals

- Do not force Codex or Claude to replicate native runtime internals.
- Do not attempt to reuse the full native `AgentConfig` type across all runtimes.
- Do not begin source-code edits until the workflow reaches the implementation stage and code-edit permission is explicitly unlocked.

## Initial Acceptance Criteria

1. A dedicated ticket and branch exist for the refactor.
2. The current native, Codex, and Claude run architectures are documented clearly enough to compare their ownership boundaries.
3. The design defines explicit runtime domain subjects for external runtimes.
4. The design shows how commands, events, status, and external-channel message routing attach to those domain subjects.
5. The design identifies which current services remain and what role each one should serve after the refactor.

## Refined Architecture Direction

- Static definition subjects stay as:
  - `AgentDefinition`
  - `TeamDefinition`
- Runtime domain subjects become:
  - `AgentRun`
  - `TeamRun`
- Runtime-neutral managers become:
  - `AgentRunManager`
  - `AgentTeamRunManager`
- Runtime-specific implementations move below those managers as backends, for example:
  - `AutoByteusAgentRunBackend`
  - `CodexAgentRunBackend`
  - `ClaudeAgentRunBackend`
  - team-backend equivalents

## Design-Ready Requirements

1. The architecture must expose one first-class runtime subject per single-agent execution and one first-class runtime subject per team execution.
2. `AgentRunManager` and `AgentTeamRunManager` must become runtime-neutral managers of those subjects rather than remaining native-only construction managers.
3. Runtime-specific services and adapters must become internal backend collaborators beneath those run subjects.
4. `AgentRun` must own normalized command ingress, normalized status, normalized event emission, tool approval, interruption, and external-source binding for one run.
5. `TeamRun` must own normalized command ingress, normalized team/member status, normalized team event emission, tool approval routing, interruption, and external-source binding for one team run.
6. The frontend websocket model must remain run-scoped and team-run-scoped:
   - `/ws/agent/<runId>`
   - `/ws/agent-team/<teamRunId>`
7. The frontend must remain runtime-unaware in the first refactor slice.
8. One normalized event language must remain the outward contract across native, Codex, and Claude paths.
9. Runtime-specific event adaptation must move below the `AgentRun` / `TeamRun` boundary.
10. Team member runtime orchestration for Codex and Claude must become an internal implementation detail of `TeamRun`, not a peer architectural concept exposed above it.
11. Normalized current status must belong to the run subjects themselves rather than being reconstructed from multiple side channels in higher layers.
12. Team aggregate status derivation must belong to `TeamRun`.
13. Active runtime snapshot queries must read from manager-owned live run subjects rather than reconstructing active state from session stores, orchestrators, and snapshot helpers.
14. Persisted run/team manifests must remain the source of resume configuration and persisted runtime references, while live `AgentRun` / `TeamRun` remain the source of active execution state.
15. Continuation/resume flows must become thin facades over `AgentRunManager` / `AgentTeamRunManager` rather than depending on public session-centric runtime services.
16. Team-owned member runtimes must not remain peer top-level active agent runs in the public runtime model.
17. Run projection/read-model services may remain runtime-specific, but they must stay in the persisted history/projection layer rather than becoming owners of live execution.

## Requirement IDs

- `R-000`: Preserve `AgentDefinition` and `TeamDefinition` as the static definition layer.
- `R-001`: Introduce `AgentRun` as the first-class runtime subject for a single execution.
- `R-002`: Introduce `TeamRun` as the first-class runtime subject for a team execution.
- `R-003`: Refactor `AgentRunManager` into a runtime-neutral manager of `AgentRun` objects.
- `R-004`: Refactor `AgentTeamRunManager` into a runtime-neutral manager of `TeamRun` objects.
- `R-005`: Move native-specific creation/build logic below the manager layer into runtime-specific backends.
- `R-006`: Add runtime-specific backends for AutoByteus, Codex, and Claude under the run-subject boundary.
- `R-007`: Keep the existing runtime-unaware websocket/frontend contract unchanged in the first refactor slice.
- `R-008`: Keep one normalized event language as the outward contract.
- `R-009`: Move runtime-specific event normalization below `AgentRun` / `TeamRun`.
- `R-010`: Make normalized run/team status owned by `AgentRun` / `TeamRun`.
- `R-011`: Keep one team-scoped outward stream for each `TeamRun`, including member-originated activity.
- `R-012`: Move team member runtime routing, relay, and status aggregation behind `TeamRun`.
- `R-013`: Make external-channel reply binding and publication attach to `AgentRun` / `TeamRun` rather than to scattered bridge services.
- `R-014`: Make active runtime snapshot serving depend primarily on manager-owned `AgentRun` / `TeamRun` snapshot views.
- `R-015`: Keep manifests, index rows, and runtime references as persisted history/projection artifacts separate from live run ownership.
- `R-016`: Refactor continuation/resume flows to restore through the run managers instead of public session-centric services.
- `R-017`: Prevent team-owned member runtimes from surfacing as peer standalone active agent runs in the public runtime model.
- `R-018`: Keep runtime-specific projection providers in the persisted projection layer rather than the live runtime layer.

## Requirement Coverage Map

| Requirement ID | Direction | Evidence |
| --- | --- | --- |
| `R-000` | Static definitions stay separate from runtime subjects. | `tickets/in-progress/runtime-domain-subject-refactor/investigation-notes.md` |
| `R-001` | A single execution needs one explicit `AgentRun` subject. | `tickets/in-progress/runtime-domain-subject-refactor/investigation-notes.md` |
| `R-002` | A team execution needs one explicit `TeamRun` subject. | `tickets/in-progress/runtime-domain-subject-refactor/investigation-notes.md` |
| `R-003` | `AgentRunManager` should become runtime-neutral. | `tickets/in-progress/runtime-domain-subject-refactor/investigation-notes.md` |
| `R-004` | `AgentTeamRunManager` should become runtime-neutral. | `tickets/in-progress/runtime-domain-subject-refactor/investigation-notes.md` |
| `R-005` | Native build/factory logic should move below the manager layer. | `tickets/in-progress/runtime-domain-subject-refactor/investigation-notes.md` |
| `R-006` | AutoByteus, Codex, and Claude should sit behind backend implementations. | `tickets/in-progress/runtime-domain-subject-refactor/investigation-notes.md` |
| `R-007` | Frontend and websocket paths remain unchanged in the first slice. | `tickets/in-progress/runtime-domain-subject-refactor/investigation-notes.md` |
| `R-008` | One normalized event language remains the outward contract. | `tickets/in-progress/runtime-domain-subject-refactor/investigation-notes.md` |
| `R-009` | Event adaptation moves below the run boundary. | `tickets/in-progress/runtime-domain-subject-refactor/investigation-notes.md` |
| `R-010` | Status becomes owned by `AgentRun` / `TeamRun`. | `tickets/in-progress/runtime-domain-subject-refactor/investigation-notes.md` |
| `R-011` | Team outward streaming remains team-scoped. | `tickets/in-progress/runtime-domain-subject-refactor/investigation-notes.md` |
| `R-012` | Team-member runtime orchestration becomes internal to `TeamRun`. | `tickets/in-progress/runtime-domain-subject-refactor/investigation-notes.md` |
| `R-013` | External-channel reply behavior attaches to run subjects. | `tickets/in-progress/runtime-domain-subject-refactor/investigation-notes.md` |
| `R-014` | Active runtime snapshots should come from live run subjects. | `tickets/in-progress/runtime-domain-subject-refactor/investigation-notes.md` |
| `R-015` | Persisted manifests/history remain separate from live run ownership. | `tickets/in-progress/runtime-domain-subject-refactor/investigation-notes.md` |
| `R-016` | Continuation/resume should restore through run managers. | `tickets/in-progress/runtime-domain-subject-refactor/investigation-notes.md` |
| `R-017` | Team-owned member runtimes should not surface as peer standalone active runs. | `tickets/in-progress/runtime-domain-subject-refactor/proposed-design.md` |
| `R-018` | Projection providers stay in the persisted projection layer. | `tickets/in-progress/runtime-domain-subject-refactor/investigation-notes.md` |

## Open Questions / Risks

1. What is the minimal shared contract for `AgentRun` and `TeamRun` that works across native, Codex, and Claude without leaking native-only assumptions?
2. Should the shared runtime subject emit normalized domain events first, with websocket/external-channel mapping moved later in the stack?
3. How should existing team-member runtime bindings, relay services, and callback propagation be absorbed into `TeamRun` without breaking current behavior?
