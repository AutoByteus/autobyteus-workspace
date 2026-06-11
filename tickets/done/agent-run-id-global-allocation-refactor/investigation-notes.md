# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Deeper ID-generation/propagation and memory-location inventory completed; Round 6 design-impact feedback triaged; requirements/design refined to remove unnecessary historical nested root-flat fallback and split write-time vs read/projection memory location shapes
- Investigation Goal: Establish a separate ticket for canonical/global `AgentRunId` allocation and uniqueness refactor, independent from `send_message_to`.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: The identity invariant crosses standalone run provisioning, runtime backend factories, team member identity, task-agent identity, active run registration, persisted metadata checks, and Agent Memory write/read/projection location ownership.
- Scope Summary: Refactor how agent run IDs are generated, allocated, validated, and registered so new agent runtime IDs are canonical and globally unique.
- Primary Questions To Resolve:
  - Where should the pure ID candidate generator live: `autobyteus-ts`, `autobyteus-server-ts`, or both split by pure candidate vs server allocation?
  - Which owner should enforce active/persisted/memory-dir collision checks?
  - How should explicit/manual run IDs be handled?
  - Should backend factory local ID fallback be removed or restricted to tests?
  - Is reservation needed to prevent concurrent collision races?

## Request Context

The user explicitly asked to create a new separate ticket for agent run ID identity/refactoring only, from the original `origin/personal` branch, not from the current `send-message-global-run-routing` ticket. Motivation from discussion: before making `send_message_to(target_agent_run_id)` rely on global run IDs, the platform should first make `AgentRunId` generation/allocation unified and globally unique. After the deeper inventory, the user clarified the target design direction: team routing already has route keys/member paths, so `agentRunId` should be a unique runtime identifier and should not carry routing semantics. The user refined the naming policy further: use `<agent_definition_name_slug>_<uuid>` for concrete agent runtime IDs and `<team_definition_name_slug>_<uuid>` for team run IDs. The slug is readability-only and the UUID suffix is the uniqueness source.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-id-global-allocation-refactor`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-id-global-allocation-refactor/tickets/done/agent-run-id-global-allocation-refactor`
- Current Branch: `codex/agent-run-id-global-allocation-refactor`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-id-global-allocation-refactor`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch --prune origin` succeeded on 2026-06-11.
- Task Branch: `codex/agent-run-id-global-allocation-refactor`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: This ticket is intentionally independent of `send-message-global-run-routing`; do not add or change `send_message_to` behavior in this ticket.

Base evidence at bootstrap:

- `origin/personal`: `97ea4ae2055510bcfc657624e3f9b2c5c6048227`
- `personal`: `97ea4ae2055510bcfc657624e3f9b2c5c6048227`
- `merge-base personal origin/personal`: `97ea4ae2055510bcfc657624e3f9b2c5c6048227`

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-11 | Command | `git fetch --prune origin && git rev-parse origin/personal && git rev-parse personal && git merge-base personal origin/personal` | Verify explicit base branch requested by user. | `origin/personal`, local `personal`, and merge-base all resolved to `97ea4ae2055510bcfc657624e3f9b2c5c6048227`. | No |
| 2026-06-11 | Setup | `git branch codex/agent-run-id-global-allocation-refactor origin/personal` and `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-id-global-allocation-refactor codex/agent-run-id-global-allocation-refactor` | Create dedicated ticket branch/worktree from requested base. | Dedicated worktree created from `origin/personal`. | No |
| 2026-06-11 | Command | `rg -n "generateFreshRunId|buildTeamMemberRunId|buildTaskAgentInstanceIdentity|preferredRunId|generateReadableAgentId|registerActiveRun" autobyteus-server-ts/src autobyteus-ts/src -g '*.ts'` | Find current run ID generation/allocation surfaces. | Found standalone provisioning, backend fallback generation, team member ID builder, task-agent identity builder, and active run registration. | Yes |
| 2026-06-11 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts` | Verify standalone run allocation. | `prepareFreshRun` calls `generateFreshRunId`; non-AutoByteus uses UUID; AutoByteus uses readable ID; uniqueness check covers active runs, metadata, and run directory. | Yes |
| 2026-06-11 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Verify active run registration boundary. | `createAgentRun` passes `preferredRunId` to backend factories; `registerActiveRun` indexes by `runId`; no duplicate-active rejection found in bootstrap read. | Yes |
| 2026-06-11 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Verify AutoByteus `preferredRunId` handling. | AutoByteus creation requires a non-empty `preferredRunId` and calls `createAgentWithId`; should assert returned `agent.agentId` equals requested ID. | Yes |
| 2026-06-11 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend-factory.ts` | Verify Codex `preferredRunId` handling. | Codex uses `preferredRunId?.trim() || randomUUID()`; local fallback remains in factory. | Yes |
| 2026-06-11 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-backend-factory.ts` | Verify Claude `preferredRunId` handling. | Claude uses `preferredRunId?.trim() || randomUUID()`; local fallback remains in factory. | Yes |
| 2026-06-11 | Code | `autobyteus-server-ts/src/run-history/utils/team-member-run-id.ts` | Verify team member ID shape. | Default member run ID derives from `teamRunId` + normalized route key hash. | Yes |
| 2026-06-11 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-agent-instance-identity.ts` | Verify task-agent ID shape. | Task-agent run ID includes `teamRunId`, sanitized member route, and `taskId`. | Yes |
| 2026-06-11 | Code | `autobyteus-ts/src/agent/factory/agent-id.ts` | Verify shared readable ID helper. | `generateReadableAgentId` builds readable stem plus four-digit random suffix; not sufficient alone for global uniqueness without server collision checks. | Yes |
| 2026-06-11 | Command | `rg -n "generate[A-Za-z]*(RunId|AgentId)|build[A-Za-z]*(RunId|Identity)|randomUUID\(" autobyteus-server-ts/src autobyteus-ts/src -g '*.ts'` | Build a broader inventory of ID generation candidates and separate true agent-run identity generation from unrelated UUID use. | Found server standalone run ID generation, team run ID generation, team member run ID builder, task-agent identity builder, Codex/Claude backend fallback generation, and `autobyteus-ts` readable `AgentFactory.createAgent(...)` generation; many other UUID calls are unrelated event/session/token/file IDs. | No |
| 2026-06-11 | Command | `rg -n "preferredRunId|createBackend\(" autobyteus-server-ts/src/agent-execution autobyteus-server-ts/src/agent-team-execution -g '*.ts'` | Verify backend ID contract and all runtime backend consumers. | `AgentRunBackendFactory.createBackend(config, preferredRunId)` is the common contract; `AgentRunManager.createAgentRun` passes preferred IDs; AutoByteus requires preferred ID, Codex/Claude accept it but can fall back locally. | No |
| 2026-06-11 | Command | `rg -n "\.createAgentRun\(|restoreAgentRunFromPlatformState\(|restoreAgentRun\(" autobyteus-server-ts/src -g '*.ts'` | Inventory production creation/restore callers that pass or receive agent run IDs. | Standalone GraphQL/application/compaction/self-evolution callers use `AgentRunService.createAgentRun`; standalone activation passes prepared ID to `AgentRunManager`; team member and task-agent paths call `AgentRunManager.createAgentRun` directly with deterministic member/task-agent IDs. | No |
| 2026-06-11 | Command | `rg -n "memberRunId\s*[:=]|buildTeamMemberRunId|memberConfig\.memberRunId" autobyteus-server-ts/src/agent-team-execution autobyteus-server-ts/src/run-history -g '*.ts'` | Inventory team member run ID assignment and propagation. | Found member IDs assigned in team config normalization, mixed backend context creation, team run manager normalization, subteam factory, metadata mapper, member team contexts, history/projection services, delivery, status, and task-agent identity links. | No |
| 2026-06-11 | Command | `rg -n "taskAgentRunId\s*[:=]|buildTaskAgentInstanceIdentity|taskAgentRunId" autobyteus-server-ts/src/agent-team-execution -g '*.ts'` | Inventory task-agent run ID assignment and propagation. | Task-agent run IDs are built in `buildTaskAgentInstanceIdentity`, bound through task delegation ledger/directory, passed through mixed/server-managed task-agent registries into `AgentRunManager.createAgentRun`, and reused as member identity, delivery target, status key, and settlement key. | No |
| 2026-06-11 | Code | `autobyteus-ts/src/agent/factory/agent-factory.ts` | Verify lower-level AutoByteus agent ID generation and explicit-ID behavior. | `createAgent(...)` generates readable IDs and checks only local active agents; server creation uses `createAgentWithId(...)`, which rejects only non-empty/active duplicate in the local factory. | Yes |
| 2026-06-11 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts` and `mixed-sub-team-run-factory.ts` | Verify team/subteam teamRunId and memberRunId generation. | Mixed team creation generates `teamRunId` locally, attaches member IDs from explicit `memberRunId` or `buildTeamMemberRunId`, computes member memory dir from that ID; subteam creation repeats the same pattern for child teams. | Yes |
| 2026-06-11 | Code | `autobyteus-server-ts/src/context-files/store/context-file-layout.ts` and `context-file-owner-types.ts` | Check non-runtime consumers that recompute member run IDs. | Final team-member context file layout recomputes `memberRunId` from `teamRunId + memberRouteKey`, so a non-route-derived member run ID design must change this owner descriptor or resolve through metadata. | Yes |
| 2026-06-11 | Other | User clarification in chat: team routing already has route keys/member paths; `agentRunId` should be only a unique runtime identifier. | Capture product/design direction before writing comprehensive design. | Requirements should favor generated `<agent_definition_name_slug>_<uuid>` `agentRunId` values and move semantic route/task meaning into metadata/context. | No |
| 2026-06-11 | Other | User clarification in chat: prefer `<agent_definition_name_slug>_<uuid>` for all concrete agent runtime IDs and `<team_definition_name_slug>_<uuid>` for team run IDs; do not use role, member route/name, or task ID in the generated run ID. | Capture final naming/slug policy before implementation design. | Meaningful slug is acceptable and useful, but it must come from the underlying definition name and the UUID suffix must be the uniqueness source; routing/task semantics stay in route/task metadata. | No |
| 2026-06-11 | Spec | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-id-global-allocation-refactor/tickets/done/agent-run-id-global-allocation-refactor/design-review-report.md` | Capture architecture review blocking design impacts. | Review failed with AR-DI-001 allocator slug-source contract, AR-DI-002 exact teamRunId handoff API, and AR-DI-003 public manual `memberRunId` policy. | Yes |
| 2026-06-11 | Spec | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-id-global-allocation-refactor/tickets/done/agent-run-id-global-allocation-refactor/design-review-report.md` | Capture architecture review Round 4 blocking design impact and re-evaluate it against the user's memory-locality clarification. | AR-DI-004 exposed real ambiguity: current worktree has a child-team-owned memory target resolver, while `origin/personal` is root-flat. User clarified the best target is neither child-sibling nor root-flat: use hierarchical-under-root memory paths that preserve root locality and mirror nested team topology. | Yes |
| 2026-06-11 | Command | `rg -n "AgentRunMemoryRecorder|RunMemoryWriter|LocalMemoryRunViewProjectionProvider|TeamMemberRunViewProjectionService|TeamMemoryMemberTargetBuilder|team-run-metadata-flattener|memberLayout|getMemberDirPath|memoryDir" autobyteus-server-ts/src -S` | Inventory memory write, memory layout, and projection/read paths affected by opaque run IDs. | Found write side depends on `AgentRunConfig.memoryDir`; read side contains several flattened-member/top-level path assumptions. | Yes |
| 2026-06-11 | Code | `autobyteus-server-ts/src/agent-memory/services/agent-run-memory-recorder.ts` and `autobyteus-server-ts/src/agent-memory/store/run-memory-writer.ts` | Validate memory write authority. | Recorder writes only through `RunMemoryWriter({ memoryDir })`; correctness depends on every `AgentRunConfig.memoryDir` being assigned to the concrete run's actual memory owner. | Yes |
| 2026-06-11 | Code | `autobyteus-server-ts/src/run-history/projection/providers/local-memory-run-view-projection-provider.ts` and `autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts` | Validate cross-runtime projection behavior. | Normal projection is local replay memory for AutoByteus/Codex/Claude; provider uses explicit `metadata.memoryDir` when present and otherwise reads by stored `runId` opaquely. Runtime-native Codex/Claude providers are diagnostic and not the normal UI path. | No |
| 2026-06-11 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts`, `mixed-sub-team-run-factory.ts`, `mixed-team-member-registry.ts`, and `team-run-metadata-mapper.ts` | Validate current-worktree write/restore memory owner for direct, nested, and task-agent members. | Current worktree partially changed nested writes/restores to child-sibling directories (`agent_teams/<childTeamRunId>/<memberRunId>`) and task agents to `agent_teams/<currentTeamRunId>/<taskAgentRunId>`. That breaks root run memory locality for nested teams. | Yes |
| 2026-06-11 | Code | `autobyteus-server-ts/src/run-history/services/team-run-member-memory-target-resolver.ts` and its projection/explorer/context-file/application/self-evolution/external-channel consumers. | Validate current-worktree read-side authority. | A reusable resolver exists, but its target shape uses `owningTeamRunId`, lives in `run-history`, and emits child-sibling paths. This partial direction is superseded by the cleaner `AgentMemoryLocationService` boundary in `agent-memory`. | Yes |
| 2026-06-11 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-team-member-registry.ts` and `mixed-agent-member-handle.ts` | Validate task-agent memory path. | Task-agent handles currently reuse the logical member config, including `memoryDir`, while substituting `taskAgentRunId` as the runtime ID. That can write task-agent traces into the template member memory directory instead of a concrete task-agent run directory. | Yes |
| 2026-06-11 | Code | `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts`, `agent-memory/domain/models.ts`, `agent-memory/services/team-memory-member-target-builder.ts`, `run-history/services/team-run-member-memory-target-resolver.ts`, and `context-files/services/context-file-owner-resolver.ts` | Re-evaluate the memory boundary after the user's module/API clarification and naming feedback. | `agent-memory` already owns memory views, summaries, writers, and explorer code, while the current worktree placed topology-to-memory path resolution in `run-history` and let `context-files` keep owner-specific path logic. This is still too fragmented. The cleaner boundary is an `agent-memory` API named `AgentMemoryLocationService`, returning `AgentMemoryLocation` objects while using metadata/topology dependencies internally. | Yes |
| 2026-06-11 | Command | `find autobyteus-server-ts/src/agent-memory -maxdepth 3 -type f` and `rg -n "TeamRunMemberMemoryTargetResolver|TeamMemoryMemberTargetBuilder|LocalMemoryRunViewProjectionProvider|RunMemoryWriter|AgentRunMemoryRecorder|memoryDir|getMemberDirPath|team-run-member-memory-target" autobyteus-server-ts/src/... -S` | Confirm whether a coherent Agent Memory module can own memory location resolution. | Existing `agent-memory` files are the natural memory capability area. Existing imports already cross between memory/projection/history, so the design should centralize the dependency behind one public memory-location service and avoid callers combining run-history metadata with memory layout directly. | Yes |
| 2026-06-11 | Spec | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-id-global-allocation-refactor/tickets/done/agent-run-id-global-allocation-refactor/design-review-report.md` | Triage architecture review Round 6 feedback. | Round 6 had two substantive AR-DI-004 concerns: hypothetical historical nested root-flat memory readability, and `getKnownTeamMemberLocation(...)` returning a metadata-rich type without accepting `member` metadata. | Yes |
| 2026-06-11 | Other | User clarification in chat after Round 6: current application/user data has no historical nested team runs; all existing team memory is direct members under one team run folder. | Decide whether the historical nested root-flat fallback/migration is truly required. | Historical nested root-flat compatibility is not required for this ticket. Existing direct team-member histories remain readable because direct paths are unchanged. Do not add defensive filesystem fallback, layout marker, or per-leaf `memoryDir` for non-existent historical nested data. | No |
| 2026-06-11 | Design analysis | Review of `AgentMemoryLocationService.getKnownTeamMemberLocation(...)` contract in `design-spec.md`. | Validate remaining Round 6 issue after historical clarification. | The write-time API issue is real and independent: runtime write paths need a `memoryDir` before persisted `TeamRunAgentMemberMetadata` exists. The design should expose a lightweight `TeamAgentRunMemoryLocation` for write-time scopes and keep `TeamMemberAgentMemoryLocation` metadata-rich for read/projection. | Yes |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Multiple creation paths currently produce or accept run IDs before runtime backend creation.
- Current execution flow:
  - Standalone API/service path: `AgentRunService.createAgentRun -> AgentRunProvisioningService.prepareAgentRun -> generateFreshRunId -> activatePreparedRun -> AgentRunManager.createAgentRun(config, runId) -> backendFactory.createBackend(config, preferredRunId)`.
  - Team member path: team runtime builds `memberRunId` from config or `buildTeamMemberRunId`, then `MixedAgentMemberHandle.ensureReady -> AgentRunManager.createAgentRun(memberRunConfig, memberRunId)`.
  - Task-agent path: task delegation builds `taskAgentRunId`, then `ServerManagedTaskAgentInstanceRegistry -> AgentRunManager.createAgentRun(runConfig, taskAgentRunId)`.
  - Backend factory path: AutoByteus requires `preferredRunId`; Codex/Claude use `preferredRunId` when present but can fall back to local UUID generation.
  - Memory write path: `AgentRunMemoryRecorder -> RunMemoryWriter({ memoryDir })`; the recorder does not derive paths from `runId`, so write correctness depends on `AgentRunConfig.memoryDir`.
  - Memory projection path: standalone projection uses stored `AgentRunMetadata.memoryDir`; team projection/explorer paths are being moved toward a reusable resolver, but the current resolver lives in `run-history` and encodes child-sibling ownership rather than a coherent `agent-memory` location API.
- Ownership or boundary observations:
  - `AgentRunManager` is the active run registry boundary but does not appear to own allocation.
  - `AgentRunProvisioningService` owns standalone allocation checks but not team member/task-agent allocation.
  - Team member and task-agent ID builders own deterministic identity shape but not global collision checks.
  - `autobyteus-ts` owns a pure readable ID helper but cannot check server persistence or active runs.
  - `run-history` owns stored team topology as data. `agent-memory` should own memory location semantics and use a read-only topology dependency internally, instead of each consumer choosing root-flat, child-sibling, or route-derived paths.
- Current behavior summary: Run IDs are intended to be stable and mostly unique, but allocation and validation policy is fragmented rather than centrally authoritative. Deeper inventory confirms there are three canonical concrete-agent ID styles today: standalone service-generated IDs, deterministic team member IDs, and deterministic task-agent IDs, plus Codex/Claude backend fallbacks when `preferredRunId` is absent. The follow-up memory/projection read found that opaque IDs are compatible with a cleaner Agent Memory module if `AgentMemoryLocationService` owns hierarchical-under-root memory locations from recursive team topology. User clarification removes historical nested root-flat migration from this ticket because existing team data has only direct members.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Refactor
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant / Duplicated Policy Or Coordination
- Refactor posture evidence summary: A global identity invariant exists conceptually but is not represented by one owner. Multiple generators/fallbacks create candidates; multiple creation paths trust IDs; active registration does not appear to reject duplicate active run IDs. Memory read/write/projection has a parallel ownership gap: write-side paths use explicit memory directories, while current code has multiple competing path rules. The target needs one Agent Memory location authority.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `AgentRunProvisioningService.generateFreshRunId` | Standalone ID uniqueness checks are local to standalone provisioning. | Good collision checks exist but are not reusable by team/task-agent paths. | Yes |
| `CodexAgentRunBackendFactory` / `ClaudeAgentRunBackendFactory` | Backend-local UUID fallback still exists. | Backends can act as implicit ID allocators if caller omits preferred ID. | Yes |
| `AgentRunManager.registerActiveRun` | Active map is keyed by `runId` and set directly. | Duplicate active IDs could overwrite active registration unless guarded elsewhere. | Yes |
| `buildTeamMemberRunId` | Generated IDs include team run identity via hash. | Default team member IDs are deterministic and route-derived; the target should replace them with allocator-owned name-slug + UUID IDs and remove manual new-run identity selection from the public launch DTO. | Yes |
| `buildTaskAgentInstanceIdentity` | Task-agent IDs include team run identity and task ID. | Task-agent IDs are deterministic and task-derived; the target should allocate the same name-slug + UUID shape used for all concrete agent runs. | Yes |
| `AgentRunMemoryRecorder` / `RunMemoryWriter` | Writes to whatever `AgentRunConfig.memoryDir` carries. | ID simplification is safe only when each runtime config receives the concrete run's correct memory directory before events are recorded. | Yes |
| `team-run-metadata-flattener` | Returns flat leaf agent metadata without `teamRunPath` or `memoryDir`. | Flat metadata is not enough for the new hierarchical-under-root layout; a reusable `AgentMemoryLocation` shape is needed. | Yes |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/agent/factory/agent-id.ts` | Pure readable agent ID stem/random suffix helper. | Useful candidate helper but not an allocator. | May be extended/reused as pure candidate generator only. |
| `autobyteus-server-ts/src/run-history/utils/agent-run-id-utils.ts` | Server wrapper around readable ID helper for standalone AutoByteus run IDs. | Narrow standalone helper. | Candidate for removal or ownership move after canonical allocator exists. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts` | Standalone run preparation, metadata, uniqueness checks. | Checks active runs, metadata, and run directory for standalone allocation. | Existing logic can inform central allocator. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Active run manager/registry and backend creation entrypoint. | Passes preferred IDs to backends; active registration should reject duplicates. | Likely consumer/enforcer of canonical IDs; may not own all allocation details. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | AutoByteus backend creation. | Requires preferred ID; uses `createAgentWithId`. | Should assert requested ID equals actual runtime ID. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend-factory.ts` | Codex backend creation. | Uses preferred ID but has local UUID fallback. | Production fallback should be removed/restricted. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-backend-factory.ts` | Claude backend creation. | Uses preferred ID but has local UUID fallback. | Production fallback should be removed/restricted. |
| `autobyteus-server-ts/src/run-history/utils/team-member-run-id.ts` | Deterministic team member run ID builder. | Builds ID from team run and member route. | Should stop producing canonical run IDs; any remaining route normalization should move to route-owned code. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-agent-instance-identity.ts` | Task-agent identity builder. | Builds `taskAgentRunId` from team run, route, task ID. | Should compose task-agent metadata from a supplied allocated `taskAgentRunId`; it should not derive the run ID from team/task fields. |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-config.ts` | Team run member config, including optional explicit `memberRunId`. | Allows manual ID injection. | Must define whether explicit IDs remain and how they are validated. |
| `autobyteus-server-ts/src/agent-memory/services/agent-run-memory-recorder.ts` | Runtime memory write observer. | Writes through `RunMemoryWriter({ memoryDir })`; no ID-derived path logic here. | Keep writer simple; fix upstream config memoryDir assignment. |
| `autobyteus-server-ts/src/run-history/services/team-run-metadata-flattener.ts` | Flattens recursive team metadata to leaf agent metadata. | Drops `teamRunPath`, so it cannot compose hierarchical-under-root memory paths. | Keep for display/status-only uses; path-sensitive reads use `AgentMemoryLocationService`. |
| `autobyteus-server-ts/src/run-history/services/team-run-member-memory-target-resolver.ts` | Current-worktree resolver for path-ready team member memory targets. | It exists in `run-history`, uses `owningTeamRunId`, and emits child-sibling paths. | Decommission/move this responsibility into `agent-memory` as `AgentMemoryLocationService` plus internal topology traversal. |
| `autobyteus-server-ts/src/agent-memory/services/agent-memory-location-service.ts` | Proposed public Agent Memory location boundary. | Not in current code. | Add as the single API for standalone, team-member, nested-member, and task-agent memory locations. |
| `autobyteus-server-ts/src/agent-memory/domain/agent-memory-location.ts` | Proposed location DTOs. | Not in current code. | Define `AgentMemoryLocation`, `StandaloneAgentMemoryLocation`, lightweight `TeamAgentRunMemoryLocation`, metadata-rich `TeamMemberAgentMemoryLocation`, and `TaskAgentMemoryLocation` with explicit `memoryDir`, `rootTeamRunId`, and `teamRunPath` where applicable. |
| `autobyteus-server-ts/src/run-history/services/team-run-memory-topology-reader.ts` | Proposed read-only topology adapter. | Not in current code. | Implement metadata lookup for `AgentMemoryLocationService` while keeping memory path semantics out of run-history. |
| `autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts` | Builds member conversation/activity projection. | Has been moved to resolver usage. | Good consumer shape; it should receive hierarchical-under-root `location.memoryDir` from `AgentMemoryLocationService`. |
| `autobyteus-server-ts/src/agent-memory/services/team-memory-member-target-builder.ts` | Builds team memory explorer member targets. | Has been moved to resolver-provided memoryDir. | Good consumer shape; consume `AgentMemoryLocationService` output while staying in the Agent Memory module. |
| `autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts` | Reads file-change projections for standalone/team member runs. | Has been moved toward reusable memory location resolution for historical reads; active event side still has local path logic. | Active and historical paths should consume `AgentMemoryLocationService` locations instead of local `owningTeamRunId` recursion. |
| `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts` | Resolves member memory for application published artifacts. | Has been moved toward reusable memory location resolution. | Consume `AgentMemoryLocationService`; do not combine metadata traversal with layout locally. |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-target-context-resolver.ts` | Resolves self-evolution target memory. | Has been moved toward reusable memory location resolution. | Consume `AgentMemoryLocationService`; do not own path rules. |
| `autobyteus-server-ts/src/external-channel/services/channel-turn-reply-recovery-service.ts` | Recovers assistant reply text from memory traces. | Has been moved toward reusable memory location resolution, but still accepts team IDs that may be root or nested. | Consume `AgentMemoryLocationService`; root/nested team lookup belongs behind the memory-location boundary. |


## Comprehensive AgentRunId Generation And Propagation Inventory

This deeper inventory was added because a unified/simple `agentRunId` design is only safe after every current generation and propagation point is visible. The main finding is that the current platform mixes **canonical runtime identity** with **semantic metadata** (`teamRunId`, member route, task ID, display/debug labels). A simpler target is feasible if those meanings move to metadata/context and the canonical agent runtime ID becomes generated as `<agent_definition_name_slug>_<uuid>` and globally unique.

### Current Concrete Agent Runtime ID Sources

| Source / Path | Current ID Shape | Used For Concrete `AgentRun.runId`? | Collision / Validation Today | Simplification Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/factory/agent-id.ts` | `name_role_1234` via `generateReadableAgentId(...)` | Indirectly, only if `AgentFactory.createAgent(...)` is used. Server create path uses `createAgentWithId(...)`. | Only local `AgentFactory.activeAgents` loop when `createAgent(...)` is used; no server persistence/global check. | Keep only as a display/debug helper or remove from canonical server run allocation. |
| `autobyteus-ts/src/agent/factory/agent-factory.ts` | Readable generated ID in `createAgent(...)`; explicit string in `createAgentWithId(...)`. | Server AutoByteus backend calls `createAgentWithId(runId, config)`. | `createAgentWithId` rejects non-empty and active duplicate only inside the local factory. | Server should remain the canonical allocator; AutoByteus factory should consume and verify the supplied platform ID. |
| `autobyteus-server-ts/src/run-history/utils/agent-run-id-utils.ts` | `generateStandaloneAgentRunId(...)` wrapper around readable helper. | Yes, for standalone AutoByteus runs through provisioning. | Delegates uniqueness to `AgentRunProvisioningService.generateUniqueRunId(...)`. | Removable if all standalone runs use one name-slug + UUID allocator. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts` | AutoByteus standalone: readable candidate; Codex/Claude standalone: UUID candidate. | Yes, for standalone runs and helper/evolver/application runs that call `AgentRunService.createAgentRun`. | Checks active runs, standalone metadata, and standalone run directory up to 64 attempts. Does not cover team member metadata because standalone memory lives under `agents/`. | Best existing collision-check logic, but candidate generation should be one name-slug + UUID generator and collision scope should become platform-wide. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend-factory.ts` | `preferredRunId?.trim() || randomUUID()`. | Yes if caller omits `preferredRunId`. | No active/persisted/memory collision check at factory fallback. | Production fallback should be removed; factory should require canonical ID. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-backend-factory.ts` | `preferredRunId?.trim() || randomUUID()`. | Yes if caller omits `preferredRunId`. | No active/persisted/memory collision check at factory fallback. | Same as Codex. |
| `autobyteus-server-ts/src/run-history/utils/team-member-run-id.ts` | `${routeSlug}_${sha256(teamRunId::routeKey).slice(0,16)}`. | Yes, for team member `AgentRun.runId`. | Deterministic; relies on `teamRunId + routeKey`; explicit `memberRunId` can bypass it. No platform-wide collision check. | Should stop being canonical run ID generation if IDs become non-route-derived; route/team should be metadata. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-agent-instance-identity.ts` | `${teamRunId}__${memberRoutePart}__${taskId}`. | Yes, for task-agent `AgentRun.runId` / `memberRunId`. | Deterministic; guarded only by task-agent directory within a team; no platform-wide persisted collision check. | Should receive an allocated `<agent_definition_name_slug>_<uuid>` `taskAgentRunId`; task ID/member route should be metadata inside `TaskAgentInstanceIdentity`. |

### Related IDs That Shape AgentRunId But Are Not Themselves Concrete Agent Runtime IDs

| Source / Path | Current Shape / Role | Why It Matters For This Ticket |
| --- | --- | --- |
| `autobyteus-server-ts/src/run-history/utils/team-run-id-utils.ts` | `team_${label}_${8-hex-random}`. | Team member/task-agent run IDs currently derive from `teamRunId`; if canonical member/task IDs stay deterministic, team-run collision risk leaks into agent-run identity. If agent-run IDs become generated name-slug + UUID values, team-run ID no longer determines agent-run uniqueness. |
| `TaskDelegationLedger.reserveTaskId()` in `task-delegation-ledger.ts` | `task_0001`, `task_0002`, ... per ledger/team. | Task-agent run ID currently embeds `taskId`; generated runtime IDs would preserve `taskId` only in task-agent metadata/context. |
| `ApplicationRunBindingLaunchService` | Generates `bindingId` with UUID, then calls agent/team run creation. | Not an `agentRunId` generator; confirms application-launched standalone runs enter through `AgentRunService.createAgentRun` and application-launched teams enter through `TeamRunService.createTeamRun`. |
| `self-evolution` and `compaction` runners | Call `AgentRunService.createAgentRun`. | Helper/evolver concrete agent runs are already covered by the standalone service path, so unifying that path covers them. |

### Current Propagation Spines

| Spine ID | Current Flow | Current ID Handoff Points | Design Pressure |
| --- | --- | --- | --- |
| `SP-001 Standalone/service-created agent run` | GraphQL/API/application/compaction/self-evolution caller -> `AgentRunService.createAgentRun` -> `AgentRunProvisioningService.prepareAgentRun` -> metadata/catalog prepared record -> `activatePreparedRun` -> `AgentRunManager.createAgentRun(config, runId)` -> backend factory -> `AgentRunContext.runId` -> `AgentRunManager.registerActiveRun`. | `prepareFreshRun` sets `runId`; `AgentRunConfig.memoryDir` is built from that ID; metadata is stored under `agents/<runId>`; activation passes the same ID as `preferredRunId`. | This is the cleanest path to centralize generated ID allocation. Existing prepared-run persistence can act as reservation if made authoritative/atomic. |
| `SP-002 Team member agent run` | `TeamRunService.createTeamRun` -> `AgentTeamRunManager.createTeamRun` -> `MixedTeamRunBackendFactory.createBackend` -> `attachRuntimeIdentity` -> `MixedAgentMemberHandle.ensureReady` -> `AgentRunManager.createAgentRun(memberRunConfig, memberRunId)` -> backend factory. | Member ID is assigned from explicit `memberRunId` or `buildTeamMemberRunId`; member memory dir is `agent_teams/<teamRunId>/<memberRunId>`; member team context and runtime context carry `memberRunId`. | Current team path bypasses standalone provisioning, so it misses central active/persisted/directory collision checks. It is the main place a new allocator/reservation boundary must be introduced. |
| `SP-003 Task-agent run` | Task delegation tool/input -> `TaskDelegationInputResolver.reserveTaskId` -> ledger record -> `TaskDelegationActivationCoordinator.buildTaskAgentInstanceIdentity` -> `TaskAgentDirectory.registerStartingTask` -> `teamRun.startTaskAgentInstance` -> mixed/server-managed task-agent registry -> `AgentRunManager.createAgentRun(runConfig, taskAgentRunId)`. | `taskAgentRunId` becomes both task-agent `AgentRun.runId` and the task-agent member identity; it is stored in ledger/directory/events/status snapshots and `MemberTeamContext.taskAgentInstance`. | Current task-agent ID is semantic/deterministic and local to one team directory. The simplified allocation path should make task-agent identity creation request/receive the same `<agent_definition_name_slug>_<uuid>` ID shape as any other concrete agent run instead of constructing one from `teamRunId/member/taskId`. |
| `SP-004 Restore/reactivation` | Command/restore caller -> metadata lookup -> `AgentRunService.activatePreparedRun` or `restoreAgentRun` -> `AgentRunManager.restoreAgentRun` / `restoreAgentRunFromPlatformState` -> backend restore -> `registerActiveRun`. | Restore uses stored `runId`; team member restore uses team metadata `memberRunId`; task-agent recovery verifies `activeRun.runId === taskAgentRunId`. | Existing persisted IDs must remain readable. New allocation can use name-slug + UUID without rewriting history, but restore/recovery must continue to trust stored historical IDs. |

### Current Runtime Registration And Collision Boundaries

| Boundary | Current Behavior | Gap |
| --- | --- | --- |
| `AgentRunProvisioningService.generateUniqueRunId(...)` | Loops candidates and rejects if active standalone run, standalone metadata, or standalone run directory exists. | Only standalone/service-created path; no team metadata scan; no team member/task-agent reservation; check-then-create race remains possible. |
| `AgentRunManager.registerActiveRun(...)` | Unsubscribes sidecars for the ID and then `activeRuns.set(runId, activeRun)`. | Duplicate active registration silently replaces active-run registration/listeners instead of failing. This must be hardened regardless of ID generator shape. |
| `AgentRunMetadataStore.writeMetadata(...)` | Writes standalone metadata under `agents/<runId>/run_metadata.json`. | Not a platform-wide identity ledger; does not know team member/task-agent IDs. |
| `TeamRunHistoryCatalogService.recordTeamRunCreated(...)` | Rejects duplicate team run metadata by `teamRunId`. | Protects team run identity, not concrete member/task-agent `agentRunId` globally. |
| `TaskAgentDirectory.registerStartingTask(...)` | Rejects duplicate task-agent run ID within one team directory and task ID conflicts. | Local in-memory guard only; no platform-wide active/persisted collision check. |
| `autobyteus-ts AgentFactory.createAgentWithId(...)` | Rejects non-empty ID and duplicate active agent in that one factory. | Runtime-local guard only; not sufficient as canonical server invariant. |

### Non-Generation Consumers That Would Break If IDs Become Non-Route-Derived Without Refactor

| Consumer / Path | Current Dependency On Semantic/Deterministic IDs | Required Design Attention |
| --- | --- | --- |
| `context-files/store/context-file-layout.ts` and `context-file-owner-types.ts` | Final team-member owner has only `teamRunId + memberRouteKey` and recomputes `memberRunId` using `buildTeamMemberRunId(...)`. | Non-route-derived member IDs require final context-file owner descriptors to carry `memberRunId` or resolve it from persisted team metadata. |
| `TeamMemberMemoryLayout` and metadata mapper | Team member memory directory is `agent_teams/<teamRunId>/<memberRunId>`. | Generated name-slug + UUID IDs work as path segments if normalized safe; memory layout should receive allocated ID rather than derive it. |
| `TeamMemberRunViewProjectionService` / `RunFileChangeProjectionService` | Resolve members and projections by stored `memberRunId`; scan team metadata for historical members. | Generated IDs are compatible if persisted; no route-derived recomputation should be required. |
| `team-message-recipient-resolver.ts` | Matches `targetAgentRunId` against member `memberRunId`, task-agent `taskAgentRunId`, and sometimes provider/platform IDs. | Future global routing benefits from canonical generated IDs, but provider/platform IDs must remain separate aliases, not canonical IDs. |
| `mixed-team-member-registry.ts` recovery | Requires active task-agent run ID equals `taskAgentRunId` and `memberTeamContext.memberRunId` equals that ID. | Generated task-agent IDs are compatible if identity is allocated before runtime launch and persisted in `TaskAgentInstanceIdentity`. |


### AR-DI-004 Memory / Projection Follow-Up Inventory

Superseding correction after the user's memory-locality clarification and later module-boundary clarification: the nested memory owner problem is real, but the clean target is **hierarchical under the launched root team**, not child team runs as top-level siblings under `agent_teams/`. The authority should be one Agent Memory location owner, exposed as `AgentMemoryLocationService`:

```text
agent_teams/<rootTeamRunId>/<...nestedTeamRunIdPath>/<agentRunId>
```

This preserves one root locality boundary while making folder structure reflect nested team topology.

| Path | Current Write / Read Behavior | Correctness Assessment |
| --- | --- | --- |
| Standalone write | `AgentRunProvisioningService.prepareFreshRun` assigns `AgentRunMemoryLayout.getRunDirPath(runId)`; restore uses stored `AgentRunMetadata.memoryDir`. | Safe if read paths treat `runId`/`memoryDir` opaquely. |
| Standalone projection | `AgentRunViewProjectionService -> LocalMemoryRunViewProjectionProvider` passes `metadata.memoryDir`; provider uses basename of explicit memoryDir and does not validate ID shape. | Safe; add historical shape-agnostic coverage. |
| Direct team member write | Current `TeamMemberMemoryLayout.getMemberDirPath(teamRunId, memberRunId)` can represent direct root members only. | Replace/extend with Agent Memory location APIs that accept `{ rootTeamRunId, teamRunPath, memberRunId }`; direct member path uses `teamRunPath: []`. |
| Nested subteam member write | Current worktree recurses with `childTeamRunId`, producing top-level sibling child-team memory. | Change recursion to keep `rootTeamRunId` stable and append `childTeamRunId` to `teamRunPath`, producing `agent_teams/<root>/<child>/<member>`. |
| Team member projection read | Current worktree consumes `TeamRunMemberMemoryTargetResolver`, but resolver lives in `run-history` and emits child-sibling paths. | Use `AgentMemoryLocationService` as the sole public path authority. |
| Team memory explorer | Current worktree consumes resolver-provided memoryDir. | Good consumer direction; consume `AgentMemoryLocationService` output. |
| Run-file-change projection | Historical path has resolver; active event path still recurses with local `owningTeamRunId`. | Active and historical paths should both consume the same Agent Memory location/scope, not local ownership recursion. |
| Application published artifact member reads | Current worktree consumes resolver-provided memoryDir. | Good consumer direction; consume `AgentMemoryLocationService` output. |
| Self-evolution target context | Current worktree consumes resolver-provided memoryDir. | Good consumer direction; consume `AgentMemoryLocationService` output. |
| Context-file final owner | Current worktree returns `owningTeamRunId` and `memoryDir`. | Replace `owningTeamRunId` in the path contract with `rootTeamRunId + teamRunPath + memoryDir` so final layout mirrors topology. |
| External channel reply recovery | Current worktree scans metadata and consumes resolver-provided memoryDir. | Good consumer direction; `AgentMemoryLocationService` should resolve by root or nested team ID and return hierarchical location. |
| Task-agent write | Current worktree uses current `teamContext.runId`, which makes nested task agents child-sibling top-level memory. | Task-agent config must use the logical member's `rootTeamRunId + teamRunPath` and write as a sibling under that nested team folder with its own `taskAgentRunId`. |

Target simplification from the inventory: make `AgentMemoryLocationService` the one path-sensitive memory-location boundary in the `agent-memory` capability area. It returns a lightweight write-time `TeamAgentRunMemoryLocation` such as `{ kind: "team_agent_run", rootTeamRunId, teamRunPath, agentRunId, memoryDir }` before metadata persistence, and a metadata-rich read/projection `TeamMemberAgentMemoryLocation` such as `{ kind: "team_member", rootTeamRunId, teamRunPath, memberRunId, memberRouteKey, memberPath, member, memoryDir }` when traversing persisted metadata. Existing flat leaf helpers may remain for display/status use, but write/read/projection paths should consume these locations or an explicit `memoryDir`. This avoids per-consumer path logic and makes the nested folder structure authoritative without fabricating member metadata at write time.

### Completeness Assessment

- The investigation now covers all production TypeScript sources found by broad searches for run/agent ID generation (`generate*RunId`, `generate*AgentId`, `build*RunId`, `build*Identity`, `preferredRunId`, `createAgentRun`, `memberRunId`, and `taskAgentRunId`) and the AR-DI-004 memory/projection sources found by searches for `memoryDir`, `RunMemoryWriter`, `LocalMemoryRunViewProjectionProvider`, `TeamMemberRunViewProjectionService`, `TeamMemoryMemberTargetBuilder`, `getTeamRunLeafAgentMetadata`, and `getMemberDirPath`.
- UUID uses unrelated to agent runtime identity were found and intentionally excluded from the canonical run ID inventory, including event IDs, session IDs, upload/file IDs, token usage IDs, connection IDs, and leases.
- The remaining ID-generation unknown is not “where IDs are generated”; it is policy choice, now resolved in favor of generated name-slug + UUID IDs. The remaining AR-DI-004 design risk is path-sensitive readers that need explicit owner team context after IDs become opaque.

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-11 | Probe | `rg -n "preferredRunId|createBackend\(" autobyteus-server-ts/src/agent-execution/backends autobyteus-server-ts/src/agent-execution/services autobyteus-server-ts/src/agent-team-execution -g '*.ts'` | Only three agent backend factories implement `AgentRunBackendFactory`; all accept `preferredRunId`. | Central allocator can pass canonical IDs through current backend contract. |
| 2026-06-11 | Probe | `rg -n "AgentRunMemoryRecorder|RunMemoryWriter|LocalMemoryRunViewProjectionProvider|TeamMemberRunViewProjectionService|TeamMemoryMemberTargetBuilder|team-run-metadata-flattener|memberLayout|getMemberDirPath|memoryDir" autobyteus-server-ts/src -S` | Memory write depends on explicit `memoryDir`; standalone projection is explicit-memoryDir safe; current worktree has both resolver consumers and local child-sibling path derivations. | Tighten resolver/layout to hierarchical-under-root and remove local path derivations. |
| 2026-06-11 | Probe | `rg -n "TeamMemberRunViewProjectionService|TeamMemoryMemberTargetBuilder|LocalMemoryRunViewProjectionProvider|AgentRunMemoryRecorder|RunFileChangeProjectionService|nested" autobyteus-server-ts/tests -S` | Existing tests cover direct team projection and some nested route resolution; they do not yet lock the hierarchical-under-root target. | Update/add tests for hierarchical-under-root nested memory write/read/projection symmetry. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None consulted during bootstrap.
- Version / tag / commit / freshness: N/A
- Relevant contract, behavior, or constraint learned: N/A
- Why it matters: This is an internal architecture/refactor ticket.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for bootstrap.
- Required config, feature flags, env vars, or accounts: None for bootstrap.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree created from `origin/personal`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- Current runtime backend factory contract already accepts an optional `preferredRunId`.
- Normal standalone creation through `AgentRunService` prepares a run ID and activates the prepared run with that ID.
- Normal team member/task-agent creation already passes a preferred ID into `AgentRunManager.createAgentRun`.
- Existing uniqueness check logic is strongest in standalone provisioning; team/task-agent paths need to move to the shared allocation boundary instead of keeping explicit local ID generation.
- Backend-local fallback generation remains in Codex/Claude and should be removed from production paths; tests/direct callers should pass explicit allocated IDs.
- The most simplifying design direction is now clear: allocate a single generated `<agent_definition_name_slug>_<uuid>` `agentRunId` for every concrete runtime, including task agents, and keep team/member/task/debug meaning in metadata/context instead of encoding it in the ID.
- `context-files` currently recomputes final team member run IDs from `teamRunId + memberRouteKey`; this is one discovered non-runtime dependency on deterministic member IDs and must be handled if IDs become non-route-derived.
- AR-DI-004 found a broader memory-location issue: path-sensitive writers/readers cannot use plain flattened leaf metadata because nested team path information is needed for the memory folder structure.
- Round 6 historical nested-root-flat concern is out of scope after user clarification: current product data has no historical nested team runs, so existing team-memory compatibility means direct members only.
- The remaining Round 6 issue is the write-time API shape: write paths need memory locations before persisted member metadata exists.
- The clean design is not to add duplicate metadata fields or defensive historical nested fallbacks; it is to make `AgentMemoryLocationService` derive explicit locations from recursive metadata/config traversal and make path-sensitive consumers use that Agent Memory module API, with a lightweight write-time location variant and a metadata-rich read/projection variant.

## Constraints / Dependencies / Compatibility Facts

- This ticket must be based on `origin/personal`, not `codex/send-message-global-run-routing`.
- Existing historical run IDs should remain readable and memory directories should not be rewritten. Existing historical team memory is direct-member/root-level only and remains readable because the direct path is unchanged. New concrete agent run IDs use `<agent_definition_name_slug>_<uuid>` and new team run IDs use `<team_definition_name_slug>_<uuid>`; route/task semantics remain metadata.
- External runtime provider IDs should remain separate from canonical platform `agentRunId`.
- If a pure generator is added to `autobyteus-ts`, server-side uniqueness checks are still required.
- Historical nested root-flat team-memory fallback/migration is intentionally not required in this ticket because no such product data exists.

## Open Unknowns / Risks

- Whether central ID allocation should reserve IDs before backend creation to handle concurrent start races.
- Manual team member run ID policy is resolved for design: public new launches use a logical topology DTO that does not expose caller-owned `memberRunId`/`childTeamRunId`; `TeamRunService` creates the runtime-ready assigned config. Restore/import-from-stored-metadata may still carry stored IDs as data through a separate stored/runtime shape.
- Whether Codex/Claude factory fallback generation is used by tests or direct factory callers outside `AgentRunService`.
- Context-file owner resolution decision: keep route-key-facing URLs/descriptors if needed, but resolve `teamRunId + memberRouteKey` to an `AgentMemoryLocation` or explicit `memoryDir` before layout; layout receives actual path-ready memory location only.
- If historical nested root-flat data is discovered later, handle it as a separate migration/data-recovery task rather than adding a fallback to this forward refactor.


## Architecture Review Round 1 Resolution Notes

- AR-DI-001 resolution: The allocator contract is now the clean `allocateForAgentDefinition(agentDefinitionId: string)` API. `AgentRunIdentityAllocator` owns `AgentDefinitionService.getAgentDefinitionById(...)` lookup and slug normalization from `AgentDefinition.name`; callers do not pass authoritative slugs or purpose/context data through the identity API. Task-agent activation resolves the target logical member's `TeamMemberRunConfig` from the active `TeamRun` before allocation to obtain `agentDefinitionId`.
- AR-DI-002 resolution: The exact team ID handoff is `TeamRunService.createTeamRun(...) -> AgentTeamRunManager.createTeamRun(config, teamRunId) -> MixedTeamRunBackendFactory.createBackend(config, teamRunId)`. `TeamRunService` recursively assigns nested subteam `childTeamRunId` values before manager/backend creation; `MixedSubTeamRunFactory` requires preassigned `childTeamRunId` and no longer falls back to local generation.
- AR-DI-003 resolution: Public new-launch inputs are narrowed to logical topology and do not carry caller-owned `memberRunId` or `childTeamRunId`. Restore/reactivation through stored team metadata bypasses new-launch assignment and preserves stored historical IDs as data.
- AR-DI-004 resolution: The memory/projection spine now has an explicit hierarchical-under-root location design. Existing historical direct team-member paths remain readable; historical nested root-flat fallback is out of scope because no historical nested team runs exist. Path-sensitive write services consume lightweight `TeamAgentRunMemoryLocation` output with `rootTeamRunId`, `teamRunPath`, concrete `agentRunId`, and `memoryDir`; read/projection services consume metadata-rich `TeamMemberAgentMemoryLocation` output with member metadata. Standalone reads use stored `memoryDir`; task-agent writes get a task-agent-specific memoryDir under the same team path as the logical member instead of reusing the template member directory. IDs remain opaque and shape-agnostic on all read paths.

## Notes For Architect Reviewer

Design review reached a superseding Round 6 fail with AR-DI-004. The package has been revised again using the design principles and user clarification: existing production/user data has no historical nested team runs, so no historical nested root-flat fallback/migration is needed; one root locality boundary per launched team run remains the forward target; nested folders mirror nested team topology for new runs; `AgentMemoryLocationService` remains the single Agent Memory public boundary; write-time locations use lightweight `TeamAgentRunMemoryLocation` and read/projection locations use metadata-rich `TeamMemberAgentMemoryLocation`. Return the revised package for the next architecture review round with AR-DI-001 through AR-DI-004 resolution notes.
