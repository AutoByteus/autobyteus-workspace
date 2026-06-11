# Design Spec

## Current-State Read

The current codebase has no single authoritative owner for concrete agent runtime identity. Instead, `AgentRun.runId` is produced by several local mechanisms:

- Standalone runs go through `AgentRunService -> AgentRunProvisioningService`, where AutoByteus IDs are readable `name_role_1234` strings and Codex/Claude IDs are UUIDs.
- Team member runs are assigned `memberRunId` by `buildTeamMemberRunId(teamRunId, memberRouteKey)`, unless a config already supplies `memberRunId`.
- Task-agent runs are assigned `taskAgentRunId` by `buildTaskAgentInstanceIdentity(...)`, which embeds `teamRunId`, member route, and `taskId`.
- Codex and Claude backend factories can still generate fallback UUIDs if `preferredRunId` is omitted.
- `AgentRunManager.registerActiveRun(...)` indexes by `runId` but silently replaces an existing active registration for the same ID.
- `context-files/store/context-file-layout.ts` recomputes final team-member `memberRunId` from `teamRunId + memberRouteKey`, making deterministic member IDs a hidden storage assumption.
- Team member memory path ownership is ambiguous in the current worktree. `origin/personal` used a root-level team folder for direct members; the current branch has introduced a child-team-owned resolver/write direction for nested cases. The target Agent Memory location boundary should preserve one root team locality boundary while mirroring nested agent-team topology inside it for new nested runs. User clarification on 2026-06-11: current product data has no historical nested team runs, so historical nested root-flat migration/fallback is not required.
- Task-agent runtime startup reuses the logical member config, including `memoryDir`, while substituting `taskAgentRunId`; this can make a distinct task-agent run write memory into the template member directory.

The current team runtime already has separate routing identities:

- `teamRunId` identifies a team run. New team run IDs should use `<team_definition_name_slug>_<uuid>` rather than short label-derived IDs.
- `memberRouteKey` and `memberPath` identify logical members for team routing.
- `taskId` identifies delegated task lifecycle.
- `taskAgentRunId` is currently used as a concrete agent runtime ID, but task semantics are already available separately through `TaskAgentInstanceIdentity`.

Therefore `agentRunId` does not need to encode route/task semantics. It should become a unique runtime identifier whose readable slug is derived by the allocator from the referenced agent definition, not by callers.

## Intended Change

Introduce one canonical, server-side allocation boundary for new concrete agent runtime IDs and make all new concrete `AgentRun` IDs use one name-slug + UUID shape, for example:

```ts
${agentDefinitionNameSlug}_${randomUUID().replace(/-/g, "")}
```

New behavior:

- Every new standalone, team member, task-agent, helper, compaction, evolver, and application-launched concrete agent run receives a canonical `<agent_definition_name_slug>_<uuid>` ID from the same allocator before backend creation. The allocator receives only `agentDefinitionId`, looks up the definition name, and owns slug normalization.
- Every new team run receives a canonical `<team_definition_name_slug>_<uuid>` ID generated at the team launch boundary from `teamDefinitionId` -> `AgentTeamDefinition.name`; team labels/names stay in metadata and display fields.
- Team routing keeps using `memberRouteKey` / `memberPath`.
- Task lifecycle keeps using `taskId`.
- Team/member/task/debug/display meaning is stored in config, runtime context, and metadata. The agent definition name slug in the `agentRunId` is readability-only; member route/name and task ID are not encoded into the `agentRunId`.
- Backend factories consume a required canonical ID and never allocate production IDs locally.
- Active run registration rejects duplicates.
- Historical restore/read paths keep using stored historical IDs without rewriting existing memory directories. Existing historical team-memory compatibility is direct-member/root-level only because no historical nested team runs exist.
- Memory write/read/projection paths resolve an explicit `AgentMemoryLocation` through the `agent-memory` module boundary. Direct members use `agent_teams/<rootTeamRunId>/<memberRunId>`; nested members use `agent_teams/<rootTeamRunId>/<childTeamRunId>/<...>/<memberRunId>`; task agents use their own `taskAgentRunId` under the same nested team path as their logical member. Read paths treat IDs opaquely and never validate them against the new generated shape.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Refactor / behavior simplification
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant / Duplicated Policy Or Coordination / Legacy Or Compatibility Pressure
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: Multiple ID generation styles are used for `AgentRun.runId`; team/task IDs encode routing/task meaning; backend factories retain fallback allocation; context-file storage derives member runtime identity from route; memory path policy is split between root-flat, child-sibling, and consumer-local derivation; task-agent startup can reuse or mis-scope the template member memory directory; active registration can overwrite duplicates.
- Design response: Create one `AgentRunIdentityAllocator` with an explicit `agentDefinitionId` input contract, make new `agentRunId` unique, remove route/task-derived run ID generation for new runs, keep route/task meaning in metadata/context, and make `AgentMemoryLocationService` the public `agent-memory` authority for write/read/projection memory locations.
- Refactor rationale: This simplifies the platform invariant. Instead of centralizing all existing special cases, the design removes the special cases from canonical identity.
- Intentional deferrals and residual risk, if any: Historical ID rewrite and memory directory rewrite are deferred/out of scope. Historical restore/projection must accept stored old IDs, but no new creation path should generate route/task-derived shapes or short random suffix shapes.

## Architecture Review Resolution Notes

- AR-DI-001 resolved: `AgentRunIdentityAllocator` exposes the clean `allocateForAgentDefinition(agentDefinitionId: string)` API. The allocator owns `AgentDefinitionService.getAgentDefinitionById(...)` lookup and derives the slug from `AgentDefinition.name`; callers do not pass authoritative slugs or purpose/context data through the identity API. Standalone provisioning and `TeamRunService` already have `agentDefinitionId`; task-agent activation resolves the target logical agent member config from the active `TeamRun` before allocation.
- AR-DI-002 resolved: the exact team ID handoff is `TeamRunService.createTeamRun(...) -> AgentTeamRunManager.createTeamRun(config, teamRunId) -> MixedTeamRunBackendFactory.createBackend(config, teamRunId)`. `MixedTeamRunBackendFactory` no longer generates top-level IDs. `TeamRunService.assignRunIdsForLaunch(...)` recursively preassigns nested `childTeamRunId` values, and `MixedSubTeamRunFactory` requires `input.childTeamRunId` with no fallback generation.
- AR-DI-003 resolved: public new-launch input is a logical topology shape and no longer exposes caller-owned `memberRunId` or `childTeamRunId` fields. `TeamRunService` converts that logical shape into an internal runtime-ready config with assigned IDs. Restore/reactivation/import-from-stored-metadata paths use a separate stored/runtime config shape and carry stored historical IDs as data.
- AR-DI-004 resolved with a superseding forward design: memory/projection ownership is now an `AgentMemoryLocationService` boundary, not root-flat, not child-sibling, and not per-consumer path logic. Standalone readers use stored `memoryDir`/`runId` opaquely. Existing historical direct team-member memory remains readable because direct paths stay `agent_teams/<rootTeamRunId>/<memberRunId>`. Historical nested root-flat migration/fallback is out of scope because there are no historical nested team runs. Team write paths consume lightweight `TeamAgentRunMemoryLocation` values; team-member read/projection paths consume metadata-rich `TeamMemberAgentMemoryLocation` values. Task-agent writes get a task-agent-specific memoryDir under the same `rootTeamRunId + teamRunPath` as their logical member.

## Terminology

- `agentRunId`: The canonical concrete runtime identity for an `AgentRun`; for new runs it uses `<agent_definition_name_slug>_<uuid>`.
- `memberRunId`: For concrete agent members, the member's concrete `agentRunId`; it uses the member's agent definition name slug, not the member route/name. For `agent_team` wrapper members, it represents the child team run identity and is preassigned from `childTeamRunId`, not from an agent-definition allocator.
- `taskAgentRunId`: A task-agent's concrete `agentRunId` when that delegated task is backed by an agent runtime; it still uses the underlying agent definition name slug, not the task ID or route.
- `memberRouteKey` / `memberPath`: Logical team routing identity; not canonical runtime identity.
- `taskId`: Task delegation lifecycle identity; not canonical runtime identity.
- `teamRunPath`: Ordered nested team-run IDs below the launched root team. It is empty for root-level agents; for a member inside a child team it is `[childTeamRunId]`; for deeper nesting it is `[childTeamRunId, grandchildTeamRunId, ...]`.
- `AgentMemoryLocation`: Path-ready memory location record produced by the Agent Memory module, carrying `memoryDir` and the subject-specific identity needed for standalone, team-agent-run, team-member, or task-agent memory.
- `TeamAgentRunMemoryLocation`: Lightweight write-time location for a concrete agent run inside a team scope. It carries `rootTeamRunId`, `teamRunPath`, concrete `agentRunId`, and resolved `memoryDir`, and does not require persisted member metadata.
- `TeamMemberAgentMemoryLocation`: Metadata-rich read/projection location for a concrete persisted team member, carrying `rootTeamRunId`, `teamRunPath`, `memberRunId`, route/path/display metadata, the stored member metadata, and resolved `memoryDir`.
- `memoryDir`: The concrete filesystem directory used by `RunMemoryWriter` and projection stores. It is path ownership, not identity; it must be resolved before writing/reading and must not be inferred by parsing the run ID string.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

AR-DI-004 is intentionally handled with the same design principles: first identify the memory write/read spines, then assign one Agent Memory module boundary for memory location resolution, then remove root-flat, child-sibling, and route-derived path assumptions from consumers.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove production generation of new semantic/deterministic `AgentRun.runId` values.
- Historical stored IDs remain readable because restore uses persisted identity as data; this is not a new-run compatibility branch. Existing historical direct team-member memory remains readable because the direct member path is unchanged. Historical nested root-flat team memory is not supported by a fallback because no such production data exists.
- Remove/decommission:
  - standalone readable run ID generation as a server canonical allocator,
  - team member deterministic canonical run ID generation,
  - task-agent deterministic canonical run ID generation,
  - Codex/Claude backend fallback generation,
  - context-file route-derived final `memberRunId` recomputation,
  - root-flat or child-sibling nested member memory path computations outside `AgentMemoryLocationService`,
  - task-agent reuse of template member `memoryDir` for a distinct task-agent run.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Standalone run creation request | Active standalone `AgentRun` + metadata | `AgentRunService` using `AgentRunIdentityAllocator` | Main service-created run path, including helpers/evolvers/compaction/application agent launches. |
| DS-002 | Primary End-to-End | Team run launch | Team run plus member runtime contexts with generated IDs | `TeamRunService` using team-run ID generation and `AgentRunIdentityAllocator` | Removes hidden backend team ID generation and deterministic member ID generation while keeping route keys separate. |
| DS-003 | Primary End-to-End | Task delegation activation | Active task-agent `AgentRun` with non-route-derived task-agent ID | `TaskDelegationActivationCoordinator` using `AgentRunIdentityAllocator` | Removes task-agent run ID encoding of team/member/task semantics. |
| DS-004 | Primary End-to-End | Backend creation | Active registry entry | `AgentRunManager` | Ensures all backends consume canonical IDs and active duplicates fail. |
| DS-005 | Primary End-to-End | Restore/reactivation request | Active restored run | Restore service/manager | Preserves historical readability without generating old ID shapes for new runs. |
| DS-006 | Primary End-to-End | Final team-member context-file request | Context file path under actual member memory dir | Context-file owner resolver/layout | Removes hidden route-derived member ID assumption. |
| DS-007 | Bounded Local | ID allocation request | Reserved unique name-slug + UUID ID | `AgentRunIdentityAllocator` | Central uniqueness/reservation loop. |
| DS-008 | Return-Event | Runtime events / accepted user message | Raw traces and working context under concrete `memoryDir` | `AgentRunMemoryRecorder` fed by run config memoryDir | Proves write side depends on explicit memoryDir, not run ID parsing. |
| DS-009 | Primary End-to-End | History/projection/explorer/application/self-evolution read for a team member | Projection/summary/context from the hierarchical-under-root member memory directory | `AgentMemoryLocationService` | Removes ambiguous root-flat/child-sibling/consumer-local path derivation behind one Agent Memory module API. |
| DS-010 | Primary End-to-End | Task-agent start | Task-agent memory written/read under `agent_teams/<rootTeamRunId>/<...teamRunPath>/<taskAgentRunId>` | Task-agent registry/handle using `AgentMemoryLocationService` | Prevents distinct task-agent runs from sharing template member memory or escaping root locality. |

## Primary Execution Spine(s)

- DS-001 standalone: `GraphQL/API/Application/Helper Caller -> AgentRunService -> AgentRunProvisioningService -> AgentRunIdentityAllocator -> AgentRunManager -> Runtime Backend -> Active Registry + Metadata`
- DS-002 team/member launch: `TeamRunService -> TeamRunId generator -> AgentRunIdentityAllocator -> AgentTeamRunManager/Mixed Backend -> MixedAgentMemberHandle -> AgentRunManager -> Runtime Backend`
- DS-003 task-agent: `TaskDelegationActivationCoordinator -> AgentRunIdentityAllocator -> TaskAgentInstanceIdentity -> TaskAgent Registry/Handle -> AgentRunManager -> Runtime Backend`
- DS-006 context files: `Context File Request/Finalization -> ContextFileOwnerResolver -> AgentMemoryLocationService -> ContextFileLayout -> Member Memory Directory`
- DS-008 memory write: `AgentRunManager/AgentRun -> AgentRunMemoryRecorder -> RunMemoryWriter(memoryDir) -> Raw Trace / Working Context Files`
- DS-009 team member read/projection: `Projection/Explorer/Application/Self-Evolution Request -> AgentMemoryLocationService -> LocalMemoryRunViewProjectionProvider / Memory Store -> Projection/Target Context`
- DS-010 task-agent memory: `TaskDelegationActivationCoordinator -> TaskAgentInstanceIdentity -> Logical Member Memory Target -> TaskAgent-specific AgentRunConfig.memoryDir -> RunMemoryWriter -> Projection by explicit memoryDir`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A caller requests a standalone run. The provisioning service asks the identity allocator for one name-slug + UUID ID, builds metadata/memory from that ID, then activates the backend through `AgentRunManager`. | Request, provisioning, identity allocation, backend creation, active registration | `AgentRunService` / `AgentRunProvisioningService` | Metadata/catalog persistence, workspace resolution, self-evolution settings |
| DS-002 | Team launch builds a logical topology, then `TeamRunService` obtains a `<team_definition_name_slug>_<uuid>` team run ID and assigns generated name-slug + UUID member runtime IDs before the mixed backend context is created. Member route keys remain the routing surface. | Team launch, topology, team/member identity assignment, mixed runtime context, member backend | `TeamRunService` for launch; `AgentTeamRunManager` for runtime | Team metadata, member memory layout, route normalization |
| DS-003 | Task delegation allocates a non-route-derived task-agent runtime ID before binding the task-agent identity. The task ID and member route are stored as task metadata rather than encoded in the run ID. | Runnable task, task-agent identity, task registry, backend creation | `TaskDelegationActivationCoordinator` | Task ledger, task directory, task settlement |
| DS-004 | `AgentRunManager` receives a config and required canonical ID, creates the backend, verifies duplicate active registration is impossible, and attaches sidecars. | AgentRunManager, backend factory, active registry | `AgentRunManager` | File change sidecars, artifact relay, memory recorder |
| DS-005 | Restore uses stored historical IDs from metadata and registers them as active IDs without trying to convert or regenerate them. | Metadata, restore context, backend restore, active registry | Restore services/managers | Platform provider ID restoration, metadata refresh |
| DS-006 | Context-file final storage resolves actual stored member runtime ID before computing paths. Route key may remain a URL selector, but not a canonical ID generator. | Request owner, resolver, metadata/runtime context, layout | Context-file service boundary | Team metadata lookup, path safety |
| DS-007 | Allocator generates name-slug + UUID candidates, checks active/persisted/reserved IDs, reserves the accepted ID in-process, and returns it to the creation owner. | Candidate, collision check, reservation | `AgentRunIdentityAllocator` | Active registry reader, standalone/team metadata readers, memory layout safety |
| DS-008 | Runtime sidecars record user/runtime events into the `memoryDir` supplied on `AgentRunConfig`; the recorder never reconstructs the path from route or ID shape. | Runtime event, recorder, writer, memory files | `AgentRunMemoryRecorder` | Runtime event normalization, provider compaction markers |
| DS-009 | A read/projection request asks the Agent Memory module for a path-ready member memory location. Direct members have empty `teamRunPath`; nested descendants append nested team run IDs. Projection/explorer/application/self-evolution readers use `memoryDir` from that location. | Request, Agent Memory location, memory store/provider | `AgentMemoryLocationService` | Read-only team topology lookup, memory layout, projection normalizers |
| DS-010 | Task-agent activation allocates a concrete runtime ID and asks Agent Memory for a task-agent-specific memory location under the same `rootTeamRunId + teamRunPath` as its logical member before the task-agent `AgentRun` starts. | Runnable task, task-agent ID, task-agent memory location, memory writer | Task-agent registry/handle using `AgentMemoryLocationService` | Task ledger/directory, task-agent projection access |

## Spine Actors / Main-Line Nodes

- `AgentRunIdentityAllocator`: canonical new concrete-agent-run ID owner.
- `TeamRunId` generator: pure canonical new team-run ID generator, using `<team_definition_name_slug>_<uuid>` with the slug as readability-only metadata; launch owners call it rather than backend factories inventing IDs.
- `AgentRunProvisioningService`: standalone creation/preparation owner.
- `TeamRunService`: team launch/runtime member ID assignment owner; during new launch it walks the planned member tree and calls `AgentRunIdentityAllocator`.
- `TaskDelegationActivationCoordinator`: task-agent runtime identity assignment owner.
- `AgentRunManager`: backend creation and active registration owner.
- Runtime backend factories: runtime adapters that consume, but do not allocate, canonical IDs.
- Context-file owner resolver/layout: maps final file ownership to actual memory owner IDs.
- `AgentMemoryLocationService`: public Agent Memory boundary that returns path-ready standalone, team-member, and task-agent memory locations with `memoryDir`; it hides layout and topology traversal from callers.
- `AgentRunMemoryRecorder`: write-side owner for runtime replay traces once `memoryDir` is supplied.

## Ownership Map

| Node | Owns |
| --- | --- |
| `AgentRunIdentityAllocator` | New name-slug + UUID ID generation, in-flight reservation, collision checking against active and persisted runtime IDs, canonical new ID shape. |
| `AgentRunProvisioningService` | Standalone run preparation, metadata facts, activation from prepared facts; no longer owns candidate generation policy. |
| `TeamRunService` | Team launch sequencing, logical topology, new team run ID assignment, and new-launch member runtime ID assignment before runtime creation. |
| `TaskDelegationActivationCoordinator` | Allocates task-agent runtime ID before task-agent identity binding; keeps task lifecycle separate. |
| `AgentRunManager` | Required-ID backend creation, active registry, duplicate-active rejection, sidecar lifecycle. |
| Backend factories | Translate canonical ID into runtime-specific context/client/session; never allocate platform IDs. |
| Team route/member identity domain | Route-key/member-path normalization and selection; never creates canonical runtime IDs. |
| AgentMemoryLocationService | Public Agent Memory boundary for path-sensitive locations; owns `rootTeamRunId + teamRunPath + agentRunId -> memoryDir` mapping and hides recursive topology traversal. |
| AgentRunMemoryRecorder / RunMemoryWriter | Runtime memory writes into supplied `memoryDir`; does not allocate or derive identity. |
| Context-file services | Resolve file owner to actual run/member memory directory; no route-derived runtime ID generation. |

If a public facade exists, it stays thin. For example, GraphQL `createAgentRun` is only an entry wrapper over `AgentRunService`; it must not allocate or shape IDs.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `createAgentRun` mutation | `AgentRunService` | API transport boundary | ID generation or backend selection policy |
| Application run binding launcher | `AgentRunService` / `TeamRunService` | Application orchestration entry | Canonical runtime ID generation |
| Team/task tools | `TaskDelegationActivationCoordinator` / task services | Runtime command surfaces | Canonical task-agent ID generation outside allocator |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Server use of `generateStandaloneAgentRunId(...)` | New standalone IDs follow `<agent_definition_name_slug>_<uuid>` instead of the old readable helper shape. | `AgentRunIdentityAllocator` | In This Change | Remove `agent-run-id-utils.ts` if no remaining server use. |
| `generateTeamRunId(...)` short `team_<label>_<8-hex>` shape in `run-history/utils/team-run-id-utils.ts` | New team IDs should use the full team definition name slug plus UUID for readability and uniqueness, and team execution should own new team ID generation. | New `agent-team-execution/domain/team-run-id.ts` pure generator used by `TeamRunService`; decommission old run-history generator for new runs. | In This Change | Historical team IDs remain readable as stored. |
| `MixedTeamRunBackendFactory.createBackend(...)` local `generateTeamRunId(...)` call | Backend factories should not own platform/team identity allocation. | Required `teamRunId` parameter: `TeamRunService` calls `AgentTeamRunManager.createTeamRun(config, teamRunId)`, which calls `MixedTeamRunBackendFactory.createBackend(config, teamRunId)`. | In This Change | Keeps team ID allocation visible at launch boundary. |
| `MixedSubTeamRunFactory` child-team fallback `generateTeamRunId(...)` call | Subteam IDs should use the same team ID policy and avoid short legacy suffixes. | `TeamRunService.assignRunIdsForLaunch(...)` recursively preassigns `childTeamRunId`; `MixedSubTeamRunFactory` requires `input.childTeamRunId` and never falls back to generation. | In This Change | Child-team generation stays at the launch assignment boundary, not inside the backend factory. |
| `AgentRunProvisioningService.generateFreshRunId(...)` readable/runtime-specific branching | Candidate generation is centralized. | `AgentRunIdentityAllocator.allocateForAgentDefinition(agentDefinitionId)` | In This Change | Provisioning still owns prepared metadata; allocator owns definition lookup and slug normalization. |
| Codex backend factory `generateRunId` fallback | Backends must not be production ID allocators. | Required `agentRunId` parameter | In This Change | Update tests to pass IDs. |
| Claude backend factory `generateRunId` fallback | Same. | Required `agentRunId` parameter | In This Change | Update tests to pass IDs. |
| `buildTeamMemberRunId(...)` as canonical ID builder | Member IDs are generated name-slug + UUID values assigned during `TeamRunService.createTeamRun`. | `TeamRunService` + allocator | In This Change | Move `normalizeMemberRouteKey` to team member identity domain before deleting/renaming file. |
| `buildTaskAgentInstanceIdentity(...)` deriving `taskAgentRunId` | Task-agent run ID must be allocated, not encoded. | Allocated `taskAgentRunId` passed into identity builder | In This Change | Keep builder as metadata composer. |
| `ContextFileLayout` recomputing member ID from route | Generated runtime IDs cannot be derived from route. | Context-file owner resolver using stored `memberRunId` | In This Change | Strong hidden dependency discovered in investigation. |
| Manual new-run canonical `memberRunId` / `childTeamRunId` acceptance | It bypasses allocator/team-run ID generation and preserves old behavior. | Narrow public launch DTO to logical topology; only `TeamRunService` creates runtime-ready assigned IDs. | In This Change | Restore path may still carry stored IDs. |
| Path-sensitive use of `getTeamRunLeafAgentMetadata(...)` or active config recursion followed by local `getMemberDirPath(teamRunId, memberRunId)` decisions | Local consumers choose between root-flat, child-sibling, or route-derived paths. | `AgentMemoryLocationService` returning explicit `AgentMemoryLocation` values with `rootTeamRunId`, `teamRunPath`, and `memoryDir`. | In This Change | Applies to projection, memory explorer, run-file-change, application artifact, self-evolution, external-channel reply recovery, and context-file owner paths. |
| Child-sibling nested member memory path derivation (`agent_teams/<childTeamRunId>/<memberRunId>`) | It mirrors child identity but breaks root team memory locality and does not match the user's preferred nested-under-root structure. | Hierarchical-under-root layout: `agent_teams/<rootTeamRunId>/<...teamRunPath>/<memberRunId>`. | In This Change | Current worktree resolver/write paths using `owningTeamRunId` are refactored to `teamRunPath`. |
| Task-agent startup reusing logical member `memoryDir` or using current child `teamRunId` as a top-level memory root | A task-agent is a distinct concrete `AgentRun` with its own `taskAgentRunId`; sharing the template member memory path or escaping the root folder breaks write/read symmetry and locality. | Ask `AgentMemoryLocationService` for a task-agent location from the logical member location plus `taskAgentRunId`. | In This Change | The logical member relation stays in `TaskAgentInstanceIdentity`. |

## Detailed Legacy Run-ID Code Removal Inventory

This inventory distinguishes legacy ID-generation code that must be removed or converted from ordinary `memberRunId`/`taskAgentRunId` consumers that should remain as metadata readers. The goal is a clean-cut replacement: after implementation, new-run code should have no fallback path that recreates old readable, route-derived, task-derived, backend-local, or short-suffix IDs.

| Current Legacy Code / File | Legacy Behavior In `origin/personal` | Target Action In This Change | Removal Verification |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/utils/agent-run-id-utils.ts` | Wraps `generateReadableAgentId(...)` for standalone AutoByteus run IDs. | Delete if no remaining server imports, or leave no canonical server use. Standalone provisioning must use `AgentRunIdentityAllocator`. | `rg generateStandaloneAgentRunId autobyteus-server-ts/src` has no production hit. |
| `autobyteus-ts/src/agent/factory/agent-id.ts` and `AgentFactory.createAgent(...)` | Generates `name_role_1234` IDs if the lower-level factory is called without an explicit ID. | Server runtime creation must not use this path for platform `agentRunId`; AutoByteus backend uses `createAgentWithId` and verifies the returned ID. Delete/rename only if package-level usage allows. | Server-side `AgentRun` creation has no call path to `createAgent(...)` without a supplied ID. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts` | Branches between readable AutoByteus IDs and UUID runtime IDs in `generateFreshRunId`. | Replace candidate generation with allocator call using agent definition name slug. Remove runtime-specific candidate branching. | No `generateFreshRunId` readable/runtime-specific branching remains. |
| `autobyteus-server-ts/src/agent-execution/backends/agent-run-backend-factory.ts` | Contract accepts optional `preferredRunId`. | Rename/reshape to required `agentRunId`. | Type signature requires an ID. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/.../codex-agent-run-backend-factory.ts` | Imports `randomUUID`; constructor accepts `generateRunId`; creates fallback ID if `preferredRunId` is absent. | Remove fallback generator/import/injection; fail if required `agentRunId` is missing. | `rg "generateRunId|randomUUID|preferredRunId" codex-agent-run-backend-factory.ts` finds no fallback path. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/.../claude-agent-run-backend-factory.ts` | Same backend-local fallback ID generation as Codex. | Remove fallback generator/import/injection; fail if required `agentRunId` is missing. | Same grep check for Claude factory. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Requires preferred ID but does not explicitly prove returned AutoByteus agent ID equals requested platform ID. | Require `agentRunId` and throw if `agent.agentId !== agentRunId`. | Unit test covers mismatch failure. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Accepts optional/preferred ID and active registration can overwrite an existing active run. | Require `agentRunId`; reject duplicate active registration before sidecar cleanup or map overwrite. | Duplicate active registration test leaves original active run/listeners intact. |
| `autobyteus-server-ts/src/run-history/utils/team-run-id-utils.ts` | Produces `team_<label>_<8-hex>` IDs. | Replace new-run shape with `<team_definition_name_slug>_<uuid-without-dashes>`. | New team-run tests assert full UUID-backed shape. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts` | Locally generates `teamRunId` and derives/fills member IDs in backend context construction. | Backend receives the team run ID and preassigned member IDs from launch/restore flow; it only builds context/memory paths. | No `generateTeamRunId` or `buildTeamMemberRunId` import in this factory. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-sub-team-run-factory.ts` | Locally falls back to old team ID shape and `buildTeamMemberRunId` for child team members. | Use new team-run ID shape at child-team creation boundary and preserve preassigned member IDs; no route-derived member fallback. | No `buildTeamMemberRunId` import; child team IDs match new shape. |
| `autobyteus-server-ts/src/run-history/utils/team-member-run-id.ts` | Builds canonical member run IDs from `teamRunId + memberRouteKey`; also contains route normalization. | Remove/decommission `buildTeamMemberRunId`; move only route-key normalization to a route-owned domain file if still needed. | `rg buildTeamMemberRunId autobyteus-server-ts/src` has no production hit. |
| `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | `attachRuntimeMemberIds` falls back to `buildTeamMemberRunId(...)`. | Assert member IDs are already assigned for new launch/restore; keep route normalization only. | No fallback member ID derivation in manager. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-metadata-mapper.ts` | Metadata builder falls back to `buildTeamMemberRunId(...)` when config lacks `memberRunId`. | Treat missing member ID in new metadata as an error; restore uses stored metadata IDs. | Metadata tests fail on missing new-run member ID instead of deriving one. |
| `autobyteus-server-ts/src/context-files/store/context-file-layout.ts` | Final team-member owner recomputes `memberRunId` from `teamRunId + memberRouteKey`. | Layout receives actual `memberRunId`; route-facing services resolve through context/metadata before path computation. | No `buildTeamMemberRunId` import in context-file layout. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-agent-instance-identity.ts` | Builds `taskAgentRunId` by concatenating `teamRunId`, member route, and `taskId`. | Accept required allocated `<agent_definition_name_slug>_<uuid>` `taskAgentRunId`; keep task/team/route fields as metadata. | Task-agent identity test proves ID is supplied, not derived. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` | Calls task-agent identity builder before a canonical allocator participates. | Allocate task-agent ID through `AgentRunIdentityAllocator` before identity composition. | Activation test shows allocator called and `taskId` remains separate. |
| Public/new-launch inputs exposing `memberRunId` or `childTeamRunId` | Allow manual canonical member/team ID choice for new team launch. | Narrow public launch input to logical topology; only `TeamRunService` produces the runtime-ready assigned config, while persisted restore/import paths keep stored IDs. | API/domain tests cover logical launch DTO shape and restore-path acceptance of stored IDs. |

Not every `memberRunId` occurrence is legacy. Consumers such as delivery, status, metadata projections, memory explorers, and self-evolution should continue to read stored `memberRunId` values; only code that **generates, derives, falls back, or treats caller-provided values as authoritative new-run IDs** is removed or converted.

## Detailed Memory / Projection Legacy Removal Inventory

This inventory resolves AR-DI-004 with the user's preferred topology-preserving layout, later memory-module boundary clarification, and Round 6 user clarification that historical nested root-flat team memory does not exist in product data. The replacement is not defensive compatibility code and not a metadata rewrite; it is one forward memory-location model produced behind the Agent Memory module boundary:

```text
agent_teams/<rootTeamRunId>/<...nestedTeamRunIdPath>/<agentRunId>
```

| Current Code / File | Current Memory-Location Behavior | Target Action In This Change | Removal Verification |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-memory/store/team-member-memory-layout.ts` | Composes only `agent_teams/<teamRunId>/<memberRunId>`. | Replace/reshape into `AgentMemoryLayout` internals that compose standalone, root team, nested team, team member, and task-agent directories. | No path-sensitive caller uses the old two-argument member layout for team member memory. |
| `autobyteus-server-ts/src/run-history/services/team-run-member-memory-target-resolver.ts` | Current worktree target shape uses `owningTeamRunId` and child-sibling paths from inside `run-history`. | Decommission this public resolver responsibility. Move topology-to-location resolution behind `agent-memory/services/agent-memory-location-service.ts`; keep any run-history metadata lookup as an injected/read-only dependency. | No production consumer imports `team-run-member-memory-target-resolver`; `AgentMemoryLocationService` tests cover direct, nested, deep nested, and task-agent locations. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts` | Current worktree recurses into child teams with `childTeamRunId` as the path root. | Ask `AgentMemoryLocationService` / `AgentMemoryLayout` for member locations while keeping root team ID stable and appending child IDs to `teamRunPath`. | New nested member write config has `memoryDir = agent_teams/<root>/<child>/<member>`. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-metadata-mapper.ts` | Current worktree restore path recurses with child team ID. | Restore builds configs using Agent Memory locations, preserving stored IDs and topology for existing direct-member histories and new nested histories. Historical nested root-flat fallback is not implemented because no such production data exists. | Restored direct config remains `<root>/<member>`; restored new nested config memoryDir matches `AgentMemoryLocationService` output. |
| `autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts` | Consumes resolver-provided target. | Consume `AgentMemoryLocationService` output. | Nested projection reads from `<root>/<child>/<member>`. |
| `autobyteus-server-ts/src/agent-memory/services/team-memory-member-target-builder.ts` | Consumes resolver-provided target. | Stay inside Agent Memory and consume `AgentMemoryLocationService` output. | Memory explorer summarizes direct and nested members from structural folders. |
| `autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts` and `services/run-file-changes/run-file-change-service.ts` | Historical path uses resolver; active event path still has local ownership recursion. | Active and historical paths consume the same `AgentMemoryLocation`/scope and stop deriving team member paths locally. | File-change write/read symmetry for direct, nested, deep nested, and task-agent runs. |
| `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts` | Consumes resolver-provided target. | Consume `AgentMemoryLocationService` output. | Application-bound nested member artifact read uses `<root>/<child>/<member>`. |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-target-context-resolver.ts` | Consumes resolver-provided target. | Consume `AgentMemoryLocationService` output. | Self-evolution nested target receives structural memoryDir. |
| `autobyteus-server-ts/src/external-channel/services/channel-turn-reply-recovery-service.ts` | Consumes resolver-provided target after metadata scan. | Consume `AgentMemoryLocationService`, which supports root or nested team selectors and returns hierarchical locations. | Nested external-channel reply recovery reads from structural memoryDir. |
| `autobyteus-server-ts/src/context-files/services/context-file-owner-resolver.ts` and `context-files/store/context-file-layout.ts` | Current worktree owner descriptor carries `owningTeamRunId` and `memoryDir`. | Owner resolver consumes `AgentMemoryLocationService`; layout receives path-ready location or explicit `memoryDir` only. | Context-file nested final paths live under `<root>/<child>/<member>/context_files`. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-team-member-registry.ts` and `mixed-agent-member-handle.ts` | Task-agent handle can reuse template memoryDir or use current team run ID as top-level path. | Resolve the logical member location and put task-agent under the same `rootTeamRunId + teamRunPath`, with `taskAgentRunId` as the leaf. | Task-agent write/read symmetry under structural nested folder. |
| `autobyteus-server-ts/src/app-data-migrations/migrations/team-run-history-index-v2-migration.ts` | Index rebuild helper may use flat/top-level path assumptions for coordinator/member summaries. | Update if it still reads memory paths; otherwise keep as metadata-only. | Migration/index rebuild path has no obsolete root-flat or child-sibling memory read. |
| Existing nested projection/explorer tests | Current coverage does not lock the user's hierarchical-under-root target. | Update fixtures to include direct, nested, and deep nested memory under structural team folders. | Tests fail when nested member memory is root-flat or child-sibling. |

## Return Or Event Spine(s) (If Applicable)

- Agent run events continue to report `runId` as the canonical runtime ID. For team member events, payloads continue to include `memberRouteKey` and `memberPath` as routing/debug metadata.
- Task-agent events continue to include `taskAgentRunId`, but it is generated and not route/task-derived; `taskId` and logical member route remain separate payload fields.

## Bounded Local / Internal Spines (If Applicable)

- `AgentRunIdentityAllocator` local allocation loop: `Generate Candidate -> Normalize/Safety Check -> Check In-Flight Reservation -> Check Active Runs -> Check Standalone Metadata/Dirs -> Check Team Metadata -> Reserve -> Return`.
- `AgentRunManager.registerActiveRun`: `Receive AgentRun -> Normalize Stored ID -> Check Existing Active -> Attach Sidecars -> Set Active Map`. It must not unregister existing sidecars before duplicate checking.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Metadata collision lookup | DS-001, DS-002, DS-007 | `AgentRunIdentityAllocator` | Check standalone and team persisted IDs. | Enforces platform uniqueness without each caller scanning history. | Callers duplicate partial collision policy. |
| In-flight reservation map | DS-007 | `AgentRunIdentityAllocator` | Prevent same-process race between allocation and persistence/registration. | Check-then-create is otherwise racy. | Race handling spreads across run creators. |
| Member route normalization | DS-002 | Team member identity domain | Normalize and compare route keys. | Routing concern, not runtime identity. | Agent IDs become semantic again. |
| Context-file owner resolution | DS-006 | Context-file services | Convert route-facing owner to actual member ID/memory owner. | Storage needs concrete memory path. | Layout reintroduces deterministic ID assumptions. |
| Provider/platform IDs | DS-004, DS-005 | Backend adapters | Track Codex thread/Claude session IDs separately. | External runtime state is not platform identity. | Platform identity becomes ambiguous. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Canonical concrete agent runtime ID allocation | `agent-execution` | Create New inside existing subsystem | It serves every concrete `AgentRun` regardless of runtime/team/task. | Existing provisioning is standalone-only; manager is active registry, not persisted allocator. |
| Active duplicate rejection | `AgentRunManager` | Extend | Active registry already owns active run map/sidecars. | N/A |
| Team route/member topology | `agent-team-execution/domain` | Extend/Reuse | Route keys and member paths already belong here. | N/A |
| Team member ID assignment for new launch | `agent-team-execution/services` | Extend `TeamRunService` | Team launch needs recursive member config transformation before backend creation, but this can stay inside the launch owner. | Backend factories should not own launch identity policy. |
| Historical metadata scanning | `run-history` | Reuse | Existing stores know standalone/team metadata locations. | N/A |
| Agent memory location resolution | `agent-memory` | Extend | Agent Memory already owns memory views, writers, explorer summaries, and file stores; it should also own where memory lives. | N/A |
| Context-file path resolution | `context-files` | Extend | It owns context-file owner descriptors and subpath layout, but not agent memory location semantics. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/identity` | Generated ID type, name-slug + UUID generator, normalization/safety. | DS-001, DS-002, DS-003, DS-007 | Allocator, manager, backend factories | Create New | Keeps identity primitives near concrete `AgentRun`. |
| `agent-execution/services` | Allocator, provisioning integration, active manager hardening. | DS-001, DS-004, DS-007 | `AgentRunService`, `AgentRunManager` | Extend | Existing run lifecycle area. |
| `agent-team-execution/services` | Team launch member runtime ID assignment inside `TeamRunService`. | DS-002 | `TeamRunService` | Extend | Keep the extra step inside the existing launch owner unless implementation complexity forces extraction. |
| `agent-team-execution/task-delegation` | Inject allocated task-agent ID into task-agent identity. | DS-003 | Task delegation coordinator | Extend | Task lifecycle remains here. |
| `agent-memory` | Public memory location API, memory layout, memory writers/readers, explorer summaries. | DS-006, DS-008, DS-009, DS-010 | Runtime writers, projection/read services, context files, application/self-evolution/external-channel consumers | Extend | `AgentMemoryLocationService` is the coherent module API for standalone/team/task-agent memory locations. |
| `context-files` | Resolve context-file owner descriptors and final subpaths from an Agent Memory location. | DS-006 | Context-file read/finalization services | Extend | Avoids deterministic ID recomputation while keeping context-file subpaths local. |
| `run-history` | Historical metadata lookup and stored team topology data. | DS-005, DS-007, DS-009 | Allocator, restore services, projection/read services, Agent Memory topology reader | Reuse | Do not turn history stores into ID generators or memory-path authorities. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/identity/agent-run-id.ts` | Agent execution identity | `AgentRunId` primitive | Generate `<agent_definition_name_slug>_<uuid>` IDs, normalize/safety-check new/stored IDs. | One small identity primitive. | N/A |
| `agent-execution/services/agent-run-identity-allocator.ts` | Agent execution services | Allocation boundary | `allocateForAgentDefinition(agentDefinitionId)`: resolve definition name, generate/reserve new IDs, and check collisions. | Allocation policy and slug-source lookup should have one owner. | `agent-run-id.ts`, `AgentDefinitionService` |
| `agent-team-execution/task-delegation/task-agent-instance-identity.ts` | Task delegation | Task-agent identity composer | Compose identity with supplied allocated run ID. | Keeps task metadata shape in task delegation. | `agent-run-id.ts` |
| `agent-memory/domain/agent-memory-location.ts` | Agent Memory domain | Memory location DTOs | Define `AgentMemoryLocation`, `StandaloneAgentMemoryLocation`, lightweight `TeamAgentRunMemoryLocation`, metadata-rich `TeamMemberAgentMemoryLocation`, and `TaskAgentMemoryLocation`. | One semantic model replaces target/location ad-hoc shapes while separating write-time locations from read/projection metadata. | N/A |
| `agent-memory/services/agent-memory-location-service.ts` | Agent Memory services | Public memory location boundary | Resolve/compose standalone, team-member, nested-member, and task-agent memory locations. | One API prevents each consumer from reimplementing nested team path rules. | `AgentMemoryLayout`, read-only team topology dependency |
| `agent-memory/store/agent-memory-layout.ts` | Agent Memory store | Memory path composition | Compose standalone, root team, nested team, and agent memory directories from `rootTeamRunId`, `teamRunPath`, and `agentRunId`. | One layout owner prevents root-flat and child-sibling path rules from reappearing. | N/A |
| `run-history/services/team-run-memory-topology-reader.ts` | Run history services | Read-only topology adapter | Load root `TeamRunMetadata` for a root or nested team selector so `AgentMemoryLocationService` can derive locations. | Keeps stored topology access in run-history while memory location semantics stay in agent-memory. | Memory path composition or projection formatting |
| `context-files/services/context-file-owner-resolver.ts` | Context files | Owner resolution | Resolve route-key owner to an `AgentMemoryLocation`; context layout only appends context-file subpaths. | Prevents layout from querying metadata or deriving paths. | `AgentMemoryLocationService` |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Team member memory location `{ teamRunId, memberRunId }` recomputed by multiple readers | `agent-memory/domain/agent-memory-location.ts` + `agent-memory/services/agent-memory-location-service.ts` + `agent-memory/store/agent-memory-layout.ts` | Agent Memory | Projection/explorer/application/self-evolution/context/external-channel/write paths all need the same topology-derived memory location. | Yes: replace ambiguous single `teamRunId` with `rootTeamRunId` + `teamRunPath` + `memoryDir`. | Yes: route selector, runtime ID, nested team path, and memory path are separate fields. | A generic flattened metadata helper that hides memory topology. |
| New/stored run ID normalization and path safety | `agent-execution/identity/agent-run-id.ts` | Agent execution | Used by allocator, manager, backend factories, and team launch assignment. | Yes | Yes | Generic string helper |
| Route-key normalization | `agent-team-execution/domain/team-run-member-identity.ts` | Team domain | Route identity is routing, not run identity. | Yes | Yes | Agent run ID helper |
| Context-file owner resolution | `context-files/services/context-file-owner-resolver.ts` | Context files | Several context-file services need actual owner path. | Yes | Yes | Hidden metadata scanner inside layout |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentRunId` / generated ID shape | Yes | Yes | Low | New IDs include a non-authoritative definition-name slug plus UUID; allocator derives slug from `AgentDefinition.name`; no route/task semantic fields in string. |
| `TaskAgentInstanceIdentity` | Yes after refactor | Yes | Medium | Keep `taskAgentRunId` generated from the agent definition name + UUID and keep `taskId`/logical member fields separate. |
| `TeamRunMemberConfig.memberRunId` | Mostly | Partial | Medium | Treat as ID assigned by `TeamRunService` for new launch or loaded from restore metadata only; the public launch DTO is narrowed to logical topology and does not expose `memberRunId`/`childTeamRunId`. |
| `AgentMemoryLocation` | Yes after split | Yes | Low | Derived path-ready location shapes only; `TeamAgentRunMemoryLocation` is lightweight for write-time config, while `TeamMemberAgentMemoryLocation` is metadata-rich for read/projection. Both separate `rootTeamRunId`, `teamRunPath`, route selector, runtime ID, and `memoryDir` without adding duplicate fields to durable `TeamRunMetadata`. |
| Context-file final owner descriptor | Needs change | Yes after change | High today | Resolve to `AgentMemoryLocation` instead of route-derived recomputation. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/identity/agent-run-id.ts` | Agent execution identity | Identity primitive | `<agent_definition_name_slug>_<uuid>` new ID generation and safe stored ID normalization. | Stable primitive used across runtime owners. | N/A |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-identity-allocator.ts` | Agent execution services | Canonical allocator | Resolve `agentDefinitionId` to `AgentDefinition.name`, allocate/reserve/check new concrete agent runtime IDs. | One owner for slug-source lookup, generation, and collision policy. | `agent-run-id.ts`, `AgentDefinitionService` |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts` | Agent execution services | Standalone provisioning | Use allocator for standalone IDs; remove readable/runtime-specific generation. | Keeps standalone metadata sequencing. | Allocator |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Agent execution services | Active run manager | Require ID for create, reject duplicate active registration. | Owns active registry and sidecars. | `agent-run-id.ts` |
| `autobyteus-server-ts/src/agent-execution/backends/agent-run-backend-factory.ts` | Agent execution backends | Backend factory contract | Require `agentRunId` parameter. | Contract is the seam for all runtime adapters. | `agent-run-id.ts` |
| AutoByteus/Codex/Claude backend factories | Runtime adapters | Backend adapters | Consume required ID, no fallback generation; AutoByteus verifies returned ID. | Adapter-specific runtime bootstrapping. | `agent-run-id.ts` |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-id.ts` | Team execution domain | Team run ID primitive | Generate `<team_definition_name_slug>_<uuid>` IDs from team definition names. | Team execution owns team runtime identity shape. | N/A |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | Team execution services | Team launch service | Generate top-level `teamRunId` via `agent-team-execution/domain/team-run-id.ts`, transform logical launch topology into a runtime-ready config by recursively assigning `memberRunId`/`childTeamRunId`, then call `AgentTeamRunManager.createTeamRun(config, teamRunId)`. | Governs team launch sequencing; avoids a separate planner unless extraction is needed. | Team ID generator, allocator, definition services |
| `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | Team execution services | Team runtime manager | `createTeamRun(config, teamRunId)` asserts pre-assigned team/member IDs; no generation. | Runtime manager should not allocate canonical IDs. | Route domain |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts` | Mixed team backend | Backend context builder | `createBackend(config, teamRunId)` uses supplied team run ID and pre-assigned member IDs for contexts and memory dirs; no hidden platform/member ID generation. | Backend builds runtime context, not identity policy. | Route domain |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-sub-team-run-factory.ts` | Mixed team backend | Subteam runtime factory | Require preassigned `childTeamRunId`; preserve allocated child member IDs in subteam configs; no fallback generation. | Subteam creation follows the same preassignment rule. | Route domain |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-agent-instance-identity.ts` | Task delegation | Task-agent identity composer | Require allocated `taskAgentRunId`. | Task metadata remains here. | `agent-run-id.ts` |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` | Task delegation | Task activation coordinator | Resolve target logical member `TeamMemberRunConfig` from active `TeamRun`, allocate task-agent run ID with its `agentDefinitionId`, then bind identity. | Activation governs task-agent launch. | Allocator, active `TeamRun` config |
| `autobyteus-server-ts/src/agent-memory/domain/agent-memory-location.ts` | Agent Memory domain | Memory location model | Define path-ready standalone/team-member/task-agent location variants. | Shared shape stays inside the memory capability area. | N/A |
| `autobyteus-server-ts/src/agent-memory/services/agent-memory-location-service.ts` | Agent Memory services | Memory location service | Public API for standalone, team member, nested team member, and task-agent memory locations. | Single memory boundary for all path-sensitive consumers. | `AgentMemoryLayout`, topology reader dependency |
| `autobyteus-server-ts/src/agent-memory/store/agent-memory-layout.ts` | Agent Memory store | Memory layout | Compose `agents/<runId>` and hierarchical `agent_teams/<root>/<...teamRunPath>/<agentRunId>` directories. | Shared path composition owner. | N/A |
| `autobyteus-server-ts/src/run-history/services/team-run-memory-topology-reader.ts` | Run history services | Topology reader adapter | Provide root `TeamRunMetadata` lookup for `AgentMemoryLocationService` without exposing memory path rules. | Run-history owns metadata storage; Agent Memory owns location semantics. | Memory layout or projection formatting |
| `autobyteus-server-ts/src/context-files/services/context-file-owner-resolver.ts` | Context files | Owner resolver | Resolve final team member route owner to `AgentMemoryLocation`. | Avoids metadata in layout and avoids local path derivation. | `AgentMemoryLocationService` |
| `autobyteus-server-ts/src/context-files/store/context-file-layout.ts` | Context files | Storage layout | Accept path-ready `AgentMemoryLocation` or explicit `memoryDir`; compute safe context-file subpaths only. | Layout should be path-only. | Owner resolver |

## Ownership Boundaries

- `AgentRunIdentityAllocator` is the only new-run identity authority.
- `AgentRunManager` is the active lifecycle authority and must not allow duplicate active IDs.
- Runtime backend factories are below the authoritative platform identity boundary; they must not allocate platform IDs.
- Team route-key/member-path logic is a separate routing authority and must not be used to derive canonical runtime IDs.
- Task delegation owns task lifecycle and metadata, not canonical ID generation.
- Context-file layout is a path mapper; it must not derive or query canonical runtime identity.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentRunIdentityAllocator` | Definition lookup, candidate generation, collision scan, in-flight reservations | Provisioning, `TeamRunService`, task activation | Callers generating UUID/readable/route-derived IDs or precomputing authoritative slugs themselves | Add explicit `allocateForAgentDefinition(agentDefinitionId)` method for the needed run identity |
| `AgentRunManager.createAgentRun(config, agentRunId)` | Backend factory create + active registration | Provisioning, team member handles, task-agent registries | Backend factories called directly with optional/no ID | Strengthen manager API/tests |
| Team member route domain | Route normalization and selector conversion | Team routing/delivery/planning | Route helper returning canonical `agentRunId` | Keep route and runtime ID APIs separate |
| `AgentMemoryLocationService` | Memory layout, standalone/team/task-agent location models, read-only topology traversal dependency | Team-member projection, memory explorer, file-change projection, application artifact reads, self-evolution, external-channel recovery, context-file resolver, team runtime write path | Consumers flattening leaves, querying run-history metadata and memory layout together, or choosing child-sibling/top-level paths | Extend the Agent Memory location API, not each consumer |
| Context-file owner resolver | Context-file ownership translation and final context-file subpaths | Context-file read/finalization/local path services | Layout recomputing `memberRunId` from route or choosing root-flat/child-sibling paths | Resolve to `AgentMemoryLocation`, then append context-file subpaths |

## Dependency Rules

Allowed:

- `AgentRunProvisioningService`, `TeamRunService`, and task activation may depend on `AgentRunIdentityAllocator`. `AgentRunIdentityAllocator` may depend on `AgentDefinitionService` to resolve the definition name for slug generation.
- `AgentRunIdentityAllocator` may depend on active-run readers and run-history metadata stores for collision checks.
- Runtime backend factories may depend on canonical ID primitives for validation but not on allocator.
- Team services may store non-route-derived `memberRunId` as metadata while continuing to route by route key/path.
- Run-history projection/read services, agent-memory explorer, application orchestration artifact reads, self-evolution target resolution, external-channel reply recovery, context-file owner resolution, and active file-change write paths may depend on `AgentMemoryLocationService` for path-sensitive memory locations.
- `AgentMemoryLocationService` may depend on a read-only run-history topology reader/metadata store through an explicit dependency to derive team locations; callers must not perform that metadata traversal themselves.
- Task-agent startup may depend on `AgentMemoryLocationService` to assign a task-agent-specific `memoryDir` under the logical member's `rootTeamRunId + teamRunPath`.

Forbidden:

- New run creation must not call `generateReadableAgentId(...)` for canonical `agentRunId`.
- New team member creation must not call `buildTeamMemberRunId(...)` for canonical `memberRunId`; public new launch uses a logical topology DTO, and only `TeamRunService` creates the runtime-ready assigned config.
- New task-agent creation must not derive `taskAgentRunId` from `teamRunId`, member route, or task ID.
- Backend factories must not generate fallback platform run IDs.
- Context-file storage layout must not derive runtime identity from route key.
- Path-sensitive read/write services must not call `getTeamRunLeafAgentMetadata(...)` or recurse active configs and then compute a team member path locally.
- Path-sensitive consumers must not import a run-history memory-target resolver or combine run-history metadata traversal with memory layout directly; they must use `AgentMemoryLocationService` or an explicit stored `memoryDir`.
- Nested team member memory must not be stored as a top-level sibling under `agent_teams/<childTeamRunId>/<memberRunId>`.
- Read/projection paths must not reject historical IDs because they do not match `<name_slug>_<uuid>`; only path safety checks are allowed.
- Task-agent runs must not reuse the template logical member `memoryDir` once a distinct `taskAgentRunId` has been allocated, and must not use a nested child team ID as a top-level memory root.
- Callers above `AgentRunManager` must not depend on both `AgentRunManager` and backend factory internals for creation.

## Concrete API Shape Decisions

### AgentRunIdentityAllocator input contract

```ts
class AgentRunIdentityAllocator {
  async allocateForAgentDefinition(agentDefinitionId: string): Promise<string>;
}
```

The allocator resolves `agentDefinitionId` with `AgentDefinitionService.getAgentDefinitionById(...)`, derives the readable slug from `AgentDefinition.name`, appends UUID-without-dashes, checks collisions/reservations, and returns the accepted ID. Callers must not compute or pass authoritative slugs, and they must not pass team/task purpose metadata through the identity API. If a caller needs contextual diagnostics, it logs that context outside the allocator boundary.

Task-agent allocation uses the active `TeamRun` passed to `TaskDelegationActivationCoordinator.activateRunnableTasks(teamRun)`: before `buildTaskAgentInstanceIdentity(...)`, the coordinator finds the target concrete `TeamMemberRunConfig` by `memberRouteKey`/`memberRunId`, rejects non-agent targets, reads `agentDefinitionId`, and calls `allocateForAgentDefinition(agentDefinitionId)`.

### Team run ID handoff contract

```ts
class TeamRunService {
  async createTeamRun(input: CreateTeamRunInput): Promise<TeamRun>;
  private async assignRunIdsForLaunch(config: TeamRunConfig, teamRunId: string): Promise<TeamRunConfig>;
}

class AgentTeamRunManager {
  async createTeamRun(config: TeamRunConfig, teamRunId: string): Promise<TeamRun>;
}

class MixedTeamRunBackendFactory {
  async createBackend(config: TeamRunConfig, teamRunId: string): Promise<MixedTeamRunBackend>;
}

class MixedSubTeamRunFactory {
  createSubTeamRun(input: { subTeamConfig: TeamSubTeamMemberRunConfig; childTeamRunId: string; /* existing fields */ }): TeamRun;
}
```

`TeamRunService.createTeamRun(...)` resolves the team definition name through `AgentTeamDefinitionService.getDefinitionById(...)`, calls the pure `agent-team-execution/domain/team-run-id.ts` generator for the top-level `<team_definition_name_slug>_<uuid>` ID, calls `assignRunIdsForLaunch(config, teamRunId)`, then passes the assigned config and explicit ID to `AgentTeamRunManager.createTeamRun(config, teamRunId)`. Nested `agent_team` members are assigned recursively inside `assignRunIdsForLaunch`: generate `childTeamRunId` from that child team definition, set the wrapper `memberRunId` to the same `childTeamRunId`, and assign the child member tree under that child ID. `MixedSubTeamRunFactory` receives a runtime-ready subteam input whose type already includes the required `childTeamRunId`; there is no local fallback generation branch.

### Forward new-launch input shape

Public new launch uses a logical launch DTO that contains team/member definitions, route keys, names, and launch metadata only. It does not include canonical `memberRunId` or `childTeamRunId` fields. `TeamRunService.assignRunIdsForLaunch(...)` is the one conversion from logical topology to runtime-ready config. Restore/reactivation paths are different: `TeamRunService.restoreTeamRun(...) -> TeamRunMetadataMapper.buildRestoreContext(...) -> AgentTeamRunManager.restoreTeamRun(...)` uses a stored/runtime config shape with historical IDs and bypasses `assignRunIdsForLaunch(...)`.


### Agent Memory location contract

The Agent Memory module exposes two related location shapes instead of forcing write-time code to fabricate persisted member metadata:

- `TeamAgentRunMemoryLocation` is the lightweight write-time path shape for any concrete agent run under a team scope. It is enough to assign `AgentRunConfig.memoryDir` before metadata persistence. For a concrete team member write, the assigned `memberRunId` is passed as `agentRunId`; for a task agent write, the assigned `taskAgentRunId` becomes the task-agent leaf ID.
- `TeamMemberAgentMemoryLocation` is the metadata-rich read/projection shape for a persisted concrete team member. It includes the stored member metadata and route fields needed by projection/explorer/application consumers.

```ts
type AgentMemoryScope = {
  rootTeamRunId: string;
  teamRunPath: string[];
};

type StandaloneAgentMemoryLocation = {
  kind: "standalone";
  agentRunId: string;
  memoryDir: string;
};

type TeamAgentRunMemoryLocation = {
  kind: "team_agent_run";
  rootTeamRunId: string;
  teamRunPath: string[];
  agentRunId: string;
  memoryDir: string;
};

type TeamMemberAgentMemoryLocation = {
  kind: "team_member";
  rootTeamRunId: string;
  teamRunPath: string[];
  memberRunId: string;
  memberRouteKey: string;
  memberPath: string[];
  member: TeamRunAgentMemberMetadata;
  memoryDir: string;
};

type TaskAgentMemoryLocation = {
  kind: "task_agent";
  rootTeamRunId: string;
  teamRunPath: string[];
  taskAgentRunId: string;
  logicalMemberRunId: string;
  logicalMemberRouteKey: string;
  memoryDir: string;
};

type AgentMemoryLocation =
  | StandaloneAgentMemoryLocation
  | TeamAgentRunMemoryLocation
  | TeamMemberAgentMemoryLocation
  | TaskAgentMemoryLocation;

type TeamRunMemoryTopologyReader = {
  loadRootTeamMetadataForMemoryLocation(teamRunId: string): Promise<TeamRunMetadata | null>;
};

class AgentMemoryLayout {
  getStandaloneRunDirPath(agentRunId: string): string;
  getTeamDirPath(scope: AgentMemoryScope): string;
  getTeamAgentRunDirPath(scope: AgentMemoryScope, agentRunId: string): string;
}

class AgentMemoryLocationService {
  constructor(input: { layout: AgentMemoryLayout; topologyReader: TeamRunMemoryTopologyReader });

  getStandaloneLocation(input: { agentRunId: string; storedMemoryDir?: string | null }): StandaloneAgentMemoryLocation;

  getTeamAgentRunLocation(input: {
    rootTeamRunId: string;
    teamRunPath: string[];
    agentRunId: string;
  }): TeamAgentRunMemoryLocation;

  listTeamMemberLocations(input: { teamRunId: string }): Promise<TeamMemberAgentMemoryLocation[]>;

  resolveTeamMemberLocation(input: {
    teamRunId: string;
    memberRouteKey?: string;
    memberRunId?: string;
    memberPath?: string[];
  }): Promise<TeamMemberAgentMemoryLocation | null>;

  getTaskAgentLocation(input: {
    logicalMemberLocation: TeamMemberAgentMemoryLocation | TeamAgentRunMemoryLocation;
    taskAgentRunId: string;
    logicalMemberRunId: string;
    logicalMemberRouteKey: string;
  }): TaskAgentMemoryLocation;
}
```

Traversal rule inside `AgentMemoryLocationService`: start with `rootTeamRunId = metadata.teamRunId` and `teamRunPath = []`; when visiting an `agent_team` wrapper for new or stored nested metadata, append `wrapper.teamRunId ?? wrapper.memberRunId` to `teamRunPath`. A concrete agent run location's `memoryDir` is produced by `AgentMemoryLayout` as `agent_teams/<rootTeamRunId>/<...teamRunPath>/<agentRunId>`.

Historical rule after user clarification: existing historical team-memory data is direct-member/root-level only, so it already uses the same path as `teamRunPath: []`: `agent_teams/<rootTeamRunId>/<memberRunId>`. The design must not add a service-owned filesystem fallback, layout marker, or per-leaf stored `memoryDir` for hypothetical historical nested root-flat data. If old nested root-flat data is discovered later, that is a separate migration/data-recovery task, not part of this refactor.

Consumers that need member memory paths must use `AgentMemoryLocationService` or an explicit `memoryDir`. Existing `getTeamRunLeafAgentMetadata(...)` may remain for display/status summaries that do not compute paths.

This is a derived path-ready location model, not a durable metadata-schema change. `TeamRunMetadata` already carries the recursive `memberTree`, root `teamRunId`, nested `agent_team.teamRunId` / `childTeamRunId` / wrapper `memberRunId`, and leaf `memberRunId` values needed to derive `teamRunPath` for new nested runs. Do not add duplicate per-leaf `memoryDir` fields to stored team metadata just to support projections.

Task-agent write rule: when a task-agent is started for a logical member, resolve that logical member's team scope from the active member location or runtime config, then build the task-agent `AgentRunConfig` with the same `rootTeamRunId + teamRunPath` plus `taskAgentRunId` as the leaf directory. Keep the template member's `memberRunId` in `TaskAgentInstanceIdentity.logicalMember.templateMemberRunId`; do not share the template member's memory directory.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentRunIdentityAllocator.allocateForAgentDefinition(agentDefinitionId)` | New concrete runtime ID | Resolve `agentDefinitionId` to `AgentDefinition.name`, then return reserved name-slug + UUID ID. | `agentDefinitionId: string`; no caller-supplied ID, slug, or purpose/context object for new run. | Identity API stays clean; caller-side diagnostics/logging stay outside allocation contract. |
| `AgentRunManager.createAgentRun(config, agentRunId)` | Active concrete run creation | Create backend and register active run. | Required safe stored/generated run ID. | Rename from `preferredRunId` to required `agentRunId`. |
| `AgentRunBackendFactory.createBackend(config, agentRunId)` | Runtime adapter create | Boot runtime with supplied canonical ID. | Required ID. | No fallback generation. |
| `TeamRunService.assignRunIdsForLaunch(config, teamRunId)` | Team/member launch IDs | Transform logical launch topology into a runtime-ready `TeamRunConfig`: generate recursive child team IDs, allocate concrete agent member IDs, and attach memory scopes. | Required top-level `teamRunId`; logical launch input has no manual canonical member/child team ID fields. | Restore path bypasses this new-launch step using persisted IDs. |
| `buildTaskAgentInstanceIdentity(input)` | Task-agent metadata | Compose identity with supplied allocated task-agent run ID. | Required `taskAgentRunId` plus task metadata. | No string derivation. |
| `AgentMemoryLocationService` | Agent memory location | Resolve/compose path-ready standalone, lightweight team-agent-run, metadata-rich team-member, nested-member, and task-agent memory locations. | Standalone `agentRunId`; write-time team scope `{ rootTeamRunId, teamRunPath, agentRunId }`; read selector `{ teamRunId, memberRouteKey/memberRunId/memberPath }`; task-agent input `{ logicalMemberLocation, taskAgentRunId, logicalMemberRunId, logicalMemberRouteKey }`. | No ID shape validation; direct/nested topology stays explicit behind the Agent Memory boundary. |
| Context-file final owner resolver | Context file storage owner | Resolve `teamRunId + memberRouteKey` or supplied member info to an `AgentMemoryLocation`, then append context-file subpaths. | `AgentMemoryLocation` or explicit `memoryDir` output. | Layout receives path-ready location identity only. |

Rule: route selectors and runtime IDs are separate subject identities. Do not merge them into one ambiguous selector.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentRunIdentityAllocator.allocateForAgentDefinition` | Yes | Yes | Low | Requires `agentDefinitionId`; no caller-supplied ID or slug for new run. |
| `AgentRunManager.createAgentRun` | Yes | Yes | Low after rename | Make ID required. |
| `TeamRunService` team/member ID assignment step | Yes | Yes | Low | Keep route metadata as metadata; calls team ID generator for team IDs and allocator for concrete agent runtime IDs. |
| `AgentMemoryLocationService` | Yes | Yes | Low | Resolves memory locations by explicit subject shape; no consumer-owned top-level fallback or mixed metadata+layout dependency. |
| Context-file owner resolver | Yes | Yes after resolver update | Low | Return concrete `AgentMemoryLocation`; layout must not accept route-only final owner. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Canonical allocator | `AgentRunIdentityAllocator` | Yes | Low | Use `identity`, not `id-utils`, to signal ownership. |
| Runtime ID primitive | `AgentRunId` | Yes | Low | Keep scoped to concrete runtime identity. |
| Team routing key | `memberRouteKey` | Yes | Low | Move route normalization out of `team-member-run-id.ts`. |
| Task-agent identity composer | `buildTaskAgentInstanceIdentity` | Yes | Medium | Ensure it composes metadata, not canonical ID derivation. |
| Agent memory location service | `AgentMemoryLocationService` | Yes | Low | Name the concrete concern directly: resolving where agent memory lives. Avoid vague `target` naming. |

## Applied Patterns (If Any)

- Allocator/reservation: used inside `AgentRunIdentityAllocator` to centralize candidate generation and collision policy.
- Adapter: backend factories remain runtime adapters; they translate canonical IDs into runtime-specific contexts.
- Inline launch assignment: `TeamRunService` transforms a logical team launch config into a runtime-ready config with top-level/nested team IDs and allocated concrete agent member IDs by calling the team ID generator and allocator.
- Location service: `AgentMemoryLocationService` turns standalone IDs, explicit team agent scopes, task-agent scopes, or recursive persisted metadata into explicit memory-location values; it owns memory location semantics, not display or projection formatting. Write-time callers use lightweight `TeamAgentRunMemoryLocation`; read/projection callers use metadata-rich `TeamMemberAgentMemoryLocation`.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/identity/` | Folder | Agent run identity primitives | Canonical ID primitives shared by concrete run owners. | `agent-execution` owns concrete agent runtime identity. | Team route selection or task lifecycle. |
| `autobyteus-server-ts/src/agent-execution/identity/agent-run-id.ts` | File | Agent run ID primitive | Generate/normalize safe new/stored IDs. | Small reusable identity primitive. | Metadata scans or allocation state. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-identity-allocator.ts` | File | Canonical allocator | Allocate/reserve/check new IDs. | Service-level owner near provisioning/manager. | Team route logic. |
| `autobyteus-server-ts/src/agent-memory/domain/agent-memory-location.ts` | File | Agent Memory location model | Define path-ready standalone/team/task-agent memory location variants. | Agent Memory owns location semantics. | Projection formatting or ID allocation. |
| `autobyteus-server-ts/src/agent-memory/services/agent-memory-location-service.ts` | File | Agent Memory location service | Resolve direct/nested member and task-agent memory locations from explicit scope or stored topology. | Single API for path-sensitive consumers. | ID allocation or context-file subpath rules. |
| `autobyteus-server-ts/src/agent-memory/store/agent-memory-layout.ts` | File | Agent Memory layout | Compose standalone and hierarchical team memory directories. | Path composition belongs with memory storage. | Metadata scanning. |
| `autobyteus-server-ts/src/run-history/services/team-run-memory-topology-reader.ts` | File | Run-history topology adapter | Load root team metadata for `AgentMemoryLocationService`. | Keeps metadata storage access out of consumers while preserving Agent Memory as the location authority. | Memory layout or projection formatting. |
| `autobyteus-server-ts/src/context-files/services/context-file-owner-resolver.ts` | File | Context-file owner resolution | Resolve route-facing owners to `AgentMemoryLocation`. | Context-files own their storage owner translation but not memory paths. | Canonical ID allocation or memory layout. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-execution/identity` | Main-Line Domain-Control primitive | Yes | Low | Concrete runtime identity belongs to agent execution. |
| `agent-execution/services` | Main-Line Domain-Control | Yes | Low | Existing home for run provisioning/manager services. |
| `agent-team-execution/services` | Main-Line Domain-Control | Yes | Low | Team launch planning belongs with team services. |
| `agent-memory/services` | Off-Spine Concern / Capability Boundary | Yes | Low | Agent Memory owns memory locations, writers, views, and explorer summaries; consumers should use its public API. |
| `agent-memory/store` | Persistence-Provider | Yes | Low | Memory layouts and file stores belong with memory persistence. |
| `context-files/services` | Off-Spine Concern | Yes | Low | Resolves storage owner identity before layout. |
| `run-history/services` | Off-Spine Concern | Yes | Low | Stored history/topology remains here, but memory location resolution moves to Agent Memory. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Allocator input | `allocateForAgentDefinition("agent/software_engineer")` | `allocateForAgentDefinition({ agentDefinitionId, purpose: { kind: "team_member" } })` or `allocate({ slug: "solution_designer" })` from caller | Allocator owns definition lookup and slug normalization; route/task context and caller slugs are not part of the identity API. |
| New team member identity | `{ memberRouteKey: "solution_designer", agentDefinitionName: "software_engineer", memberRunId: "software_engineer_9f..." }` | `memberRunId: "solution_designer_a1b2..."` when solution_designer is only a member route/name | Route is routing metadata; run ID comes from the agent definition name slug plus UUID, not the member route/name. |
| New task-agent identity | `{ agentDefinitionName: "software_engineer", taskAgentRunId: "software_engineer_ab...", taskId: "task_0001", logicalMember: { memberRouteKey: "writer" } }` | `taskAgentRunId: "team_1__writer__task_0001"` | Task semantics stay explicit fields. |
| Backend contract | `createBackend(config, agentRunId)` required | `createBackend(config, preferredRunId?)` with fallback | Required ID prevents hidden backend allocation. |
| Historical direct team-member read | Existing metadata `{ teamRunId: "root_team_old", memberRunId: "solution_designer_old" }` resolves to `agent_teams/root_team_old/solution_designer_old` with `teamRunPath: []` | A special historical nested fallback branch for `agent_teams/<root>/<nested_member>` | Direct historical data stays readable because direct path shape is unchanged; no nested historical migration is needed. |
| Write-time team-member config | `getTeamAgentRunLocation({ rootTeamRunId, teamRunPath, agentRunId: memberRunId }) -> { kind: "team_agent_run", memoryDir }` before metadata persistence | Returning `TeamMemberAgentMemoryLocation` while fabricating `member: TeamRunAgentMemberMetadata` | Write paths only need path scope and concrete run ID; read/projection paths use metadata-rich locations. |
| Context-file storage | `AgentMemoryLocationService` returns metadata-rich `{ kind: "team_member", rootTeamRunId: "parent_team_...", teamRunPath: ["child_team_..."], memberRunId: "reviewer_...", memoryDir, member }`, context layout appends context-file subpaths | Layout calls `buildTeamMemberRunId(teamRunId, routeKey)` or locally chooses root-flat/child-sibling paths | Generated runtime IDs and nested memory paths are not derivable from route metadata. |
| New nested memory location | `BuildSquad/review_lead -> { kind: "team_member", rootTeamRunId: "parent_team_...", teamRunPath: ["build_squad_..."], memberRunId: "reviewer_...", memoryDir: "agent_teams/parent_team_.../build_squad_.../reviewer_..." }` | `{ teamRunId: "build_squad_...", memberRunId: "reviewer_..." }` stored as top-level sibling under `agent_teams/` | The nested leaf belongs inside the launched root team folder while preserving team structure. |
| Task-agent memory | `taskAgentRunId: "software_engineer_ab...", memoryDir: agent_teams/<rootTeamRunId>/<...teamRunPath>/software_engineer_ab...` | Reusing `logicalMember.memoryDir` for every task-agent instance or writing under `agent_teams/<childTeamRunId>/...` | Task agents are concrete runs and need write/read symmetry by their own run ID inside the logical member's team path. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep readable standalone IDs for AutoByteus new runs | Human-readable paths/debugging | Rejected | Use `<agent_definition_name_slug>_<uuid>`; display/member route remains metadata. |
| Keep deterministic team member IDs for new runs | Route-derived lookup convenience | Rejected | Allocate name-slug + UUID IDs and resolve route -> member metadata where needed. |
| Keep deterministic task-agent IDs for new runs | Easy visual debugging of team/task | Rejected | Store `taskId` and logical member fields in `TaskAgentInstanceIdentity`. |
| Keep Codex/Claude fallback UUIDs | Test/direct factory convenience | Rejected | Tests/direct callers must pass canonical IDs. |
| Accept manual `memberRunId` / `childTeamRunId` for new launch | Existing config shape allows it | Rejected for new launch | Narrow public launch DTO to logical topology only; `TeamRunService` creates runtime-ready assigned config, while persisted restore uses the stored historical-ID shape. |
| Rewrite old historical IDs | Uniform history aesthetics | Rejected / Out of scope | Restore stored IDs as data without generating old shapes for new runs. |
| Validate read-side IDs against new slug+UUID shape | Could catch malformed new IDs | Rejected | Path-safety normalization only; historical IDs are opaque stored data. |
| Let each projection/explorer compute member memory paths independently | Minimal local edits | Rejected | `AgentMemoryLocationService` owns nested topology traversal and memory location creation. |
| Add historical nested root-flat filesystem fallback | Round 6 reviewer raised compatibility if old nested root-flat data existed. | Rejected / Out of scope | User clarified current product data has no historical nested team runs. Existing direct historical paths are unchanged, and new nested runs use hierarchical-under-root paths. If historical nested data is discovered later, handle it as a separate migration/data-recovery task rather than adding defensive fallback now. |

## Derived Layering (If Useful)

- Entry/transport: GraphQL/API/application/team/task tools.
- Main-line services: `AgentRunService`, `TeamRunService`, `TaskDelegationActivationCoordinator`, `AgentRunManager`.
- Identity owner: `AgentRunIdentityAllocator` and `agent-run-id.ts` primitive.
- Runtime adapters: AutoByteus/Codex/Claude backend factories.
- Persistence/off-spine: run-history metadata stores, Agent Memory location/layout/writer/store APIs, context-file owner resolver/layout, memory/projection stores.

## Migration / Refactor Sequence

1. Add `agent-execution/identity/agent-run-id.ts` with name-slug + UUID ID generation and safe stored-ID normalization.
2. Add `AgentRunIdentityAllocator` with active/persisted/reserved collision checks.
3. Harden `AgentRunManager.registerActiveRun(...)` to reject duplicate active IDs before unregistering/attaching sidecars.
4. Change `AgentRunManager.createAgentRun` and `AgentRunBackendFactory.createBackend` to require `agentRunId` instead of optional `preferredRunId`.
5. Remove Codex/Claude backend fallback generators and update tests/direct callers to supply IDs.
6. Update AutoByteus backend creation to verify returned `agent.agentId === requested agentRunId`.
7. Update standalone provisioning to use `AgentRunIdentityAllocator`; remove standalone readable/runtime-specific ID generation from server path.
8. Update team run ID generation to produce `<team_definition_name_slug>_<uuid>` values with UUID uniqueness; implement exact handoff `TeamRunService.createTeamRun -> AgentTeamRunManager.createTeamRun(config, teamRunId) -> MixedTeamRunBackendFactory.createBackend(config, teamRunId)`; preserve historical team IDs as stored on restore.
9. Add team/member runtime ID assignment inside `TeamRunService.createTeamRun` before `AgentTeamRunManager.createTeamRun(config, teamRunId)`: accept the logical launch topology, recursively generate child `teamRunId`s, set `agent_team.memberRunId = childTeamRunId`, and allocate concrete agent member IDs with `agentDefinitionId`.
10. Remove deterministic member ID generation from `AgentTeamRunManager`, `MixedTeamRunBackendFactory`, `MixedSubTeamRunFactory`, and metadata fallback paths; these should assert/preserve preassigned or persisted IDs.
11. Move route-key normalization out of `run-history/utils/team-member-run-id.ts` into team member identity domain; remove/decommission canonical `buildTeamMemberRunId(...)` use.
12. Change task-agent identity building to accept an allocated `taskAgentRunId`; in `TaskDelegationActivationCoordinator`, resolve the target concrete agent member config from the active `TeamRun`, allocate with that `agentDefinitionId`, then bind/start.
13. Add `agent-memory/domain/agent-memory-location.ts`, `agent-memory/services/agent-memory-location-service.ts`, and `agent-memory/store/agent-memory-layout.ts` so path-sensitive write/read services consume explicit `AgentMemoryLocation` values.
14. Decommission the public `run-history/services/team-run-member-memory-target-resolver.ts` responsibility; if run-history metadata traversal is still needed, expose it as a read-only topology dependency used internally by `AgentMemoryLocationService`.
15. Update mixed team runtime write paths (`MixedTeamRunBackendFactory`, restore mapper, active file-change context, and task-agent startup) to assign memoryDir from `AgentMemoryLocationService` / `AgentMemoryLayout`.
16. Update path-sensitive read services (`TeamMemberRunViewProjectionService`, `TeamMemoryMemberTargetBuilder`, `RunFileChangeProjectionService`, application published-artifact member reads, `SelfEvolutionTargetContextResolver`, external-channel reply recovery, and context-file owner resolution) to consume `AgentMemoryLocationService` output.
17. Refactor context-file final owner resolution so route-key-facing APIs resolve an `AgentMemoryLocation` or explicit `memoryDir` before context-file layout path computation.
18. Update durable tests: allocator, duplicate active registration, standalone creation, team member routing with name-slug + UUID IDs, task-agent lifecycle with name-slug + UUID IDs, backend required-ID behavior, AutoByteus mismatch failure, historical restore/read, context-file resolution, historical standalone memory projection, historical direct team-member memory projection, `AgentMemoryLocationService` direct/nested/deep/task-agent location tests, hierarchical-under-root direct/nested/deep team member memory projection/explorer for new nested runs, and write/read memoryDir symmetry. Historical nested root-flat coverage is not required because that data does not exist.
19. Remove obsolete imports/files and run repository checks.

## Key Tradeoffs

- Name-slug + UUID IDs keep lightweight filesystem/debug readability while avoiding overloaded identity strings; metadata remains the source for route/task/debug semantics.
- Persisted metadata scans are simpler than adding a durable global identity index now. If performance or multi-process allocation becomes real, a global index can be introduced later without changing the public `agentRunId` shape.
- Keeping historical IDs readable means active registration must accept safe stored old IDs on restore. This is acceptable because new allocation still produces only the new name-slug + UUID shape.

## Risks

- Context-file owner changes may touch REST/local-path APIs more than expected because route-key URLs currently map directly to layout paths.
- Tests and fixtures may rely on deterministic `memberRunId` strings; they should be updated to assert route metadata separately from generated runtime IDs.
- Some direct backend factory tests may rely on optional ID fallback; they must supply IDs explicitly.
- Team metadata build/restore must avoid reintroducing fallback deterministic IDs when member IDs are missing; missing IDs in new metadata should fail loudly.
- Path-sensitive writers/readers that are missed during implementation may continue to use child-sibling or route-derived paths for nested runs, or bypass the Agent Memory location boundary; use the removal inventory and grep for `getTeamRunLeafAgentMetadata`, `owningTeamRunId`, `getMemberDirPath`, and `team-run-member-memory-target-resolver` to close this. Existing direct root-level paths are still valid.
- Task-agent memoryDir changes may expose existing tests that assumed task-agent memory merged with the logical member; update them to assert explicit task-agent identity and metadata instead.

## Guidance For Implementation

- Prefer clean-cut replacement over compatibility branches for new runs.
- Do not parse `agentRunId` to discover team, route, or task information.
- Do not make the allocator aware of team routing or task semantics; caller-side diagnostics/logging must stay outside the identity allocation API.
- Keep route-key/member-path tests explicit so reviewers can see routing survived the identity simplification.
- Add targeted tests before broad E2E runs:
  - `agent-run-id` primitive tests,
  - allocator collision/reservation tests,
  - `AgentRunManager` duplicate registration test,
  - backend required-ID tests,
  - team member name-slug + UUID ID planning tests,
  - task-agent name-slug + UUID identity tests,
  - context-file final owner resolution tests,
  - `AgentMemoryLocationService` direct/nested/deep/task-agent/opaque-ID tests,
  - historical standalone and historical direct team-member memory projection tests, plus new hierarchical-under-root memory projection tests,
  - team memory explorer nested location tests for structural folders,
  - task-agent memoryDir write/read symmetry tests under the logical member's team path.
