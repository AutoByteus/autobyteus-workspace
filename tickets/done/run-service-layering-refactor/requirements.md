# Requirements

## Status

- Current Status: `Design-ready`
- Scope Classification: `Medium`

## Goal / Problem Statement

Refactor runtime launch and continuity orchestration so higher-level callers depend on one authoritative lifecycle boundary per runtime type instead of depending on both a service boundary and that service's internal manager/runtime registry. The immediate trigger is the agent path in `ChannelBindingRunLauncher`, which currently restores through `AgentRunService` but creates and liveness-checks through `AgentRunManager`, then manually persists metadata/history. The refactor must restore encapsulation by strengthening service APIs where needed and moving higher-level callers onto those service APIs.

## In-Scope Use Cases

- `UC-001` External-channel agent binding launch resolves an existing live run owned by the binding through the service boundary.
- `UC-002` External-channel agent binding launch restores a persisted cached agent run id through the service boundary when no live run is active.
- `UC-003` External-channel agent binding launch creates a fresh agent run through the service boundary, including authoritative metadata/history persistence.
- `UC-004` External-channel team binding launch follows the same service-first continuity shape, or is explicitly left on an already-compliant service boundary without manager bypass.
- `UC-005` Accepted-receipt recovery resolves active-or-restored runs through service-owned APIs instead of repeating manager/service split logic in higher-level runtime code.

## Requirements

- `R-001` Higher-level runtime launch/continuity callers must not depend on both a public lifecycle service boundary and that boundary's internal manager/runtime registry at the same time.
- `R-002` `AgentRunService` must expose the lifecycle/runtime access needed by external-channel launch/recovery callers so those callers no longer need direct `AgentRunManager` access for run resolution or creation orchestration.
- `R-003` Fresh agent-run creation for external-channel continuity must be executed through the authoritative `AgentRunService` boundary instead of duplicating service internals in `ChannelBindingRunLauncher`.
- `R-004` The service boundary must remain the owner of agent metadata/history persistence; higher-level callers must not manually reimplement that persistence workflow after direct manager calls.
- `R-005` Current external-channel continuity behavior must be preserved:
  - reuse a live run only when the binding owns it in the current process,
  - restore a persisted cached run id when possible,
  - create a fresh run when restore is impossible,
  - persist the resulting bound run id back to the binding.
- `R-006` The team runtime side must be reviewed for the same architectural rule, and any repeated service-level active-or-restore logic that can be owned by `TeamRunService` should be consolidated there when that improves symmetry without broadening scope unnecessarily.
- `R-007` Manager-level runtime/backend control remains an internal concern of `AgentRunService` and `TeamRunService` unless a lower-level infrastructure component explicitly owns direct runtime interaction.

## Acceptance Criteria

- `AC-001` `ChannelBindingRunLauncher` no longer mixes `AgentRunService` with `AgentRunManager` for agent launch/continuity orchestration.
- `AC-002` Agent-run creation used by external-channel runtime goes through `AgentRunService`, not through duplicated launcher-owned metadata/history writes after `AgentRunManager.createAgentRun(...)`.
- `AC-003` At least the agent-side higher-level runtime callers affected by this design gap use a service-owned active-or-restore API rather than repeating `getActiveRun(...)` plus `restoreAgentRun(...)`.
- `AC-004` Team-side runtime launch/recovery callers are either moved to a corresponding `TeamRunService` helper or explicitly remain on an already-compliant service boundary with no manager bypass left in the changed scope.
- `AC-005` Targeted unit tests cover the new or changed service APIs and the external-channel runtime launch behavior after the refactor.

## Acceptance-Criteria Scenario Intent

- `ACS-001` Agent binding with an owned live run returns the same run id without creating or restoring a new run.
- `ACS-002` Agent binding with a cached persisted run id but no live run restores through `AgentRunService`.
- `ACS-003` Agent binding with an unusable cached run id creates a fresh run through `AgentRunService` and persists the replacement run id.
- `ACS-004` Accepted-receipt recovery resolves an agent run through service-owned active-or-restore behavior.
- `ACS-005` Team continuity helpers remain service-owned in the changed scope.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| `R-001` | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005` |
| `R-002` | `UC-001`, `UC-002`, `UC-005` |
| `R-003` | `UC-003` |
| `R-004` | `UC-003` |
| `R-005` | `UC-001`, `UC-002`, `UC-003`, `UC-004` |
| `R-006` | `UC-004`, `UC-005` |
| `R-007` | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005` |

## Acceptance-Criteria-To-Scenario Mapping

| Acceptance Criteria ID | Scenario Intent IDs |
| --- | --- |
| `AC-001` | `ACS-001`, `ACS-002`, `ACS-003` |
| `AC-002` | `ACS-003` |
| `AC-003` | `ACS-002`, `ACS-004` |
| `AC-004` | `ACS-005` |
| `AC-005` | `ACS-001`, `ACS-002`, `ACS-003`, `ACS-004`, `ACS-005` |

## Constraints / Dependencies

- Preserve current external-channel continuity semantics unless a current divergence is explicitly corrected as part of the authoritative service move.
- Do not revert or interfere with unrelated user changes in the main shared worktree.
- Keep the refactor focused on runtime/service layering for launch/continuity paths rather than unrelated streaming or API redesign.
- Reuse existing manager implementations internally instead of replacing the runtime managers themselves.

## Assumptions

- `AgentRunService` is the correct authoritative lifecycle boundary for agent launch/restore semantics.
- `TeamRunService` is the correct authoritative lifecycle boundary for team launch/restore semantics.
- Adding service APIs to remove higher-level manager bypass is preferable to normalizing mixed dependencies in callers.

## Open Questions / Risks

- Whether agent creation should be represented as a richer generic service API or a narrowly-scoped helper used by external-channel runtime.
- Whether `ChannelAgentRunFacade` should also move fully onto service-owned run lookup in this ticket or remain partly manager-driven if its responsibility is deemed lower-level runtime interaction.
- Whether the team side needs only a small symmetry helper or no meaningful behavior change beyond clearer service-owned helpers.
