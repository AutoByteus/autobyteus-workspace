# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Investigate why the codebase contains both `AgentRunMemoryLayout` and `AgentMemoryLayout` references in the same owner, including the observed fields:

```ts
private readonly agentMemoryLayout: AgentRunMemoryLayout;
private readonly agentMemoryLayoutV2: AgentMemoryLayout;
```

Determine whether this is legacy/dual-version retention that violates the project design principles, identify the current owners and data-flow impact, and define the clean-cut remediation requirements if a code change is needed.

## Investigation Findings

- The reported code is present in `autobyteus-server-ts/src/agent-execution/services/agent-run-identity-allocator.ts` on current `origin/personal`.
- `AgentRunIdentityAllocator` was added in commit `0e68304d` (`feat: centralize agent run id allocation`) with both layouts from its first version, not as a later accidental edit.
- `AgentMemoryLayout` was also added in the same commit and already owns both standalone and team path composition:
  - `getStandaloneRootDirPath()` / `getStandaloneRunDirPath(...)`
  - `getTeamRootDirPath()` / `getTeamDirPath(...)` / `getTeamAgentRunDirPath(...)`
- `AgentRunMemoryLayout` is older and only owns standalone paths under `memory/agents/<runId>`. Its remaining active production consumers are:
  - `agent-run-identity-allocator.ts`
  - `agent-run-provisioning-service.ts`
  - `context-file-layout.ts`
  - `agent-run-metadata-store.ts`
  - `agent-run-history-identity.ts`
- The previous completed design for `agent-run-id-global-allocation-refactor` intentionally introduced `AgentMemoryLayout` as the shared memory layout owner and removed older team-member layout/resolver responsibilities, but it did not explicitly list `AgentRunMemoryLayout` for removal. That omission allowed an incomplete migration: team memory paths moved to `AgentMemoryLayout`, while standalone memory paths stayed on the older layout.
- The `agentMemoryLayoutV2` name is not justified by distinct subject ownership. It is a transitional smell: the allocator needed team path collision checks that only existed on `AgentMemoryLayout`, while its standalone checks still used the old `AgentRunMemoryLayout`.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / Refactor
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Legacy Or Compatibility Pressure` plus `Shared Structure Looseness`
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed Now
- Evidence basis: Current code has two layout classes for overlapping standalone path semantics; one class is explicitly named as `V2` in a production owner. The design principles reject versioned dual paths, compatibility retention, and overlapping shared structures.
- Requirement or scope impact: The fix should collapse production path composition onto one authoritative `AgentMemoryLayout` boundary and remove `AgentRunMemoryLayout`, unless a new investigation proves an actually distinct subject that must be renamed and separated. Current evidence does not support such a distinction.

## Recommendations

- Treat this as an incomplete migration from `AgentRunMemoryLayout` to `AgentMemoryLayout`, not as an acceptable two-layout steady state.
- Replace all production uses of `AgentRunMemoryLayout` with `AgentMemoryLayout` equivalents:
  - `getRunDirPath(runId)` -> `getStandaloneRunDirPath(runId)`
  - `getRunsRootDirPath()` -> `getStandaloneRootDirPath()`
  - `ensureRunSubtree(runId)` -> `ensureStandaloneRunSubtree(runId)`
- In `AgentRunIdentityAllocator`, keep a single field, e.g. `private readonly memoryLayout: AgentMemoryLayout`, and use it for both standalone and team collision checks.
- Delete `autobyteus-server-ts/src/agent-memory/store/agent-run-memory-layout.ts` after all imports are removed.
- Add or update a static/unit check that prevents `AgentRunMemoryLayout` and `agentMemoryLayoutV2` from reappearing.
- Do not introduce compatibility wrappers or alias classes such as `AgentRunMemoryLayout extends AgentMemoryLayout`; that would keep the legacy boundary alive.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

## In-Scope Use Cases

- UC-001: Standalone agent run allocation checks collisions and writes/reads `memory/agents/<runId>`.
- UC-002: Standalone agent run provisioning assigns the new run's `memoryDir` under `memory/agents/<runId>`.
- UC-003: Standalone run metadata and run-history identity resolution read/write `memory/agents/<runId>/run_metadata.json` safely.
- UC-004: Context-file final owner layout resolves standalone final context files under `memory/agents/<runId>/context_files`.
- UC-005: Team/member/task-agent memory code continues using hierarchical `memory/agent_teams/<rootTeamRunId>/<...teamRunPath>/<agentRunId>` via `AgentMemoryLayout`/`AgentMemoryLocationService`.
- UC-006: Obsolete legacy layout code is removed cleanly.

## Out of Scope

- Changing persisted directory names (`agents`, `agent_teams`) or historical data semantics.
- Broad memory UI redesign.
- Adding backward compatibility for old layout classes or wrappers.
- Changing team topology resolution beyond what is necessary to keep existing `AgentMemoryLayout` behavior intact.

## Functional Requirements

- REQ-001: The codebase must not keep two active authoritative memory layout representations for the same standalone agent-run path contract.
- REQ-002: `AgentMemoryLayout` must be the single production owner for standalone and team memory path composition.
- REQ-003: `AgentRunMemoryLayout` must be removed from production source after all call sites use `AgentMemoryLayout` equivalents.
- REQ-004: `AgentRunIdentityAllocator` must hold one memory layout field with a non-versioned name and must use that field for both standalone and team collision checks.
- REQ-005: The refactor must preserve normal valid path outputs for standalone runs and team agent runs.
- REQ-006: The implementation must reject compatibility wrappers, alias classes, dual-path reads/writes, or `V2` names kept only for transition.
- REQ-007: Durable checks must verify the absence of old layout symbols and the continued behavior of standalone/team memory path allocation.

## Acceptance Criteria

- AC-001: `rg -n "AgentRunMemoryLayout|agent-run-memory-layout|agentMemoryLayoutV2|V2" autobyteus-server-ts/src autobyteus-server-ts/tests` shows no obsolete layout or versioned memory-layout production/test references, except if unrelated `V2` symbols are explicitly justified outside this scope.
- AC-002: `AgentRunIdentityAllocator` imports only `AgentMemoryLayout` for memory path composition and has a single non-versioned memory layout field.
- AC-003: Standalone run provisioning still produces `memory/agents/<runId>` for new valid run IDs.
- AC-004: Run metadata and run-history identity resolution still target `memory/agents/<runId>/run_metadata.json`.
- AC-005: Team/member collision and member memory path logic still target `memory/agent_teams/<rootTeamRunId>/<...teamRunPath>/<agentRunId>`.
- AC-006: The old `autobyteus-server-ts/src/agent-memory/store/agent-run-memory-layout.ts` file is deleted rather than left unused.
- AC-007: Unit or static coverage fails if the old layout import/name is reintroduced in the affected source tree.

## Constraints / Dependencies

- Follow the shared design principles: no backward compatibility or legacy retention for in-scope replaced behavior; removal is first-class design work; shared structures must be semantically tight; dependencies must follow authoritative boundaries.
- Preserve current on-disk path semantics for valid IDs.
- Coordinate with existing `AgentMemoryLocationService`, which correctly depends on `AgentMemoryLayout` for path-ready team/standalone locations.

## Assumptions

- The user is asking for root-cause/design analysis first; implementation should wait until requirements/design are confirmed or explicitly requested.
- The current intended authoritative memory layout is `AgentMemoryLayout`, as indicated by the prior design artifact and current production services already using it for team memory and standalone location service behavior.

## Risks / Open Questions

- `AgentRunMemoryLayout` allowed slash-containing run IDs if upstream validation failed, while `AgentMemoryLayout` rejects slash/backslash segments. This is a tightening, not expected to affect valid generated IDs, but tests should confirm expected errors where relevant.
- Some tests may import expected path helpers indirectly and need updates to use `AgentMemoryLayout`.
- If any external package imports `AgentRunMemoryLayout` directly, removal is a breaking internal API change; current repository search found production source usage only inside this repo.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-002, UC-003, UC-004, UC-006 |
| REQ-002 | UC-001, UC-002, UC-003, UC-004, UC-005 |
| REQ-003 | UC-006 |
| REQ-004 | UC-001, UC-005 |
| REQ-005 | UC-001, UC-002, UC-003, UC-004, UC-005 |
| REQ-006 | UC-006 |
| REQ-007 | UC-001, UC-002, UC-003, UC-005, UC-006 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Verifies the legacy/versioned smell is gone. |
| AC-002 | Verifies allocator no longer mixes old and new layout boundaries. |
| AC-003 | Verifies standalone write/provision path preservation. |
| AC-004 | Verifies historical standalone metadata path preservation. |
| AC-005 | Verifies team/member path behavior preservation. |
| AC-006 | Verifies deletion, not hidden retention. |
| AC-007 | Prevents regression of the same design smell. |

## Approval Status

Approved by user on 2026-06-11. User confirmed refactoring is required and requested kickoff of the refactoring ticket.
