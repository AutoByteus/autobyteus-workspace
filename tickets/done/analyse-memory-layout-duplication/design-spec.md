# Design Spec

## Current-State Read

The current memory path composition has two active production layout classes for overlapping standalone agent-run semantics:

- `autobyteus-server-ts/src/agent-memory/store/agent-run-memory-layout.ts`
  - older standalone-only layout;
  - owns `memory/agents/<runId>` via `getRunsRootDirPath()`, `getRunDirPath(runId)`, and `ensureRunSubtree(runId)`.
- `autobyteus-server-ts/src/agent-memory/store/agent-memory-layout.ts`
  - newer broader layout;
  - owns standalone paths via `getStandaloneRootDirPath()`, `getStandaloneRunDirPath(agentRunId)`, and `ensureStandaloneRunSubtree(agentRunId)`;
  - also owns team paths via `getTeamRootDirPath()`, `getTeamDirPath(scope)`, and `getTeamAgentRunDirPath(scope, agentRunId)`.

The visible bad shape is in `autobyteus-server-ts/src/agent-execution/services/agent-run-identity-allocator.ts`:

```ts
private readonly agentMemoryLayout: AgentRunMemoryLayout;
private readonly agentMemoryLayoutV2: AgentMemoryLayout;
```

That allocator uses the old layout for standalone collision checks and the new layout for team-memory collision checks. The split exists because the previous global run-id allocation refactor introduced `AgentMemoryLayout` but did not decommission the older `AgentRunMemoryLayout`. The previous design already intended `AgentMemoryLayout` to be the shared memory layout owner; the removal inventory only listed old team-member memory layout/resolver files and missed the standalone-only layout.

Remaining active production imports of `AgentRunMemoryLayout` are:

- `autobyteus-server-ts/src/agent-execution/services/agent-run-identity-allocator.ts`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts`
- `autobyteus-server-ts/src/context-files/store/context-file-layout.ts`
- `autobyteus-server-ts/src/run-history/store/agent-run-metadata-store.ts`
- `autobyteus-server-ts/src/run-history/services/agent-run-history-identity.ts`

The target design must preserve the existing on-disk path contract for valid IDs:

- standalone: `memory/agents/<runId>`
- team/member/task-agent: `memory/agent_teams/<rootTeamRunId>/<...teamRunPath>/<agentRunId>`

## Intended Change

Make `AgentMemoryLayout` the only production memory path layout owner for standalone and team memory directories. Remove `AgentRunMemoryLayout` completely. Convert all remaining standalone layout call sites to the `AgentMemoryLayout` API and delete the old file.

This is a clean-cut refactor. It must not introduce a compatibility wrapper, alias class, fallback layout, or retained `V2` field/name.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Refactor / Cleanup
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Legacy Or Compatibility Pressure` and `Shared Structure Looseness`; secondary `Boundary Or Ownership Issue` in the allocator.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence:
  - `AgentRunIdentityAllocator` imports and instantiates both layout classes and names one `agentMemoryLayoutV2`.
  - `AgentMemoryLayout` already covers standalone and team path composition.
  - `AgentRunMemoryLayout` has no unique remaining domain subject; it is a subset of `AgentMemoryLayout`.
  - Design principles reject legacy retention, versioned dual paths, overlapping shared structures, and mixed old/new boundaries.
- Design response:
  - Collapse path composition onto `AgentMemoryLayout`.
  - Rename allocator field to a single non-versioned `memoryLayout`.
  - Delete `agent-run-memory-layout.ts` after call-site conversion.
  - Verify with static grep and focused unit checks.
- Refactor rationale:
  - The current duplicate layout state is not just naming polish; it creates two authoritative shapes for `memory/agents/<runId>` and encourages future code to choose between old and new APIs.
  - The clean target is smaller, clearer, and already supported by `AgentMemoryLayout`.
- Intentional deferrals and residual risk, if any:
  - No intentional deferral for the duplicate layout. Full removal is in scope.
  - Broader team topology behavior is not changed; it is outside this cleanup unless tests reveal a direct regression.

## Terminology

- `AgentMemoryLayout`: final concrete path-composition owner for memory roots and run directories.
- `AgentMemoryLocationService`: public path-ready memory location boundary for callers that need topology-aware standalone/team/member/task-agent locations.
- `AgentRunMemoryLayout`: obsolete standalone-only layout to remove.

## Design Reading Order

1. Follow the standalone and team memory path spines below.
2. Apply the ownership decision: `AgentMemoryLayout` is the sole path layout owner.
3. Convert old call sites.
4. Delete obsolete layout and add absence verification.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: delete `autobyteus-server-ts/src/agent-memory/store/agent-run-memory-layout.ts`.
- The design is invalid if implementation keeps:
  - `AgentRunMemoryLayout` as a wrapper/alias around `AgentMemoryLayout`,
  - `agentMemoryLayoutV2`,
  - dual fields in `AgentRunIdentityAllocator`,
  - dual-path reads/writes for old layout names.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Standalone run create/prepare request | `AgentRunConfig.memoryDir = memory/agents/<runId>` | `AgentRunProvisioningService` with `AgentMemoryLayout` as path owner | Ensures standalone run creation no longer uses obsolete layout. |
| DS-002 | Primary End-to-End | Agent run ID allocation | Collision decision across active runs, metadata, standalone dirs, and team dirs | `AgentRunIdentityAllocator` | The visible duplicate-layout smell is here. |
| DS-003 | Primary End-to-End | Standalone history/metadata read/write | `memory/agents/<runId>/run_metadata.json` | Run-history stores/services using `AgentMemoryLayout` | Preserves historical standalone path semantics after deletion. |
| DS-004 | Primary End-to-End | Context-file final standalone owner resolution | `memory/agents/<runId>/context_files` | `ContextFileLayout` using `AgentMemoryLayout` | Removes old layout from context-file path composition. |
| DS-005 | Primary End-to-End | Team/member memory path resolution | `memory/agent_teams/<root>/<...teamRunPath>/<agentRunId>` | `AgentMemoryLocationService` / `AgentMemoryLayout` | Confirms team path behavior remains under the existing current owner. |

## Primary Execution Spine(s)

- DS-001: `AgentRunService.create/prepare -> AgentRunProvisioningService.prepareFreshRun -> AgentRunIdentityAllocator.allocateForAgentDefinition -> AgentMemoryLayout.getStandaloneRunDirPath -> AgentRunConfig.memoryDir`
- DS-002: `AgentRunIdentityAllocator.allocateForAgentDefinition -> active/metadata collision checks -> AgentMemoryLayout standalone path check -> AgentMemoryLayout team path check -> unique runId`
- DS-003: `Run history read/write -> AgentRunMetadataStore / AgentRunHistoryIdentityResolver -> AgentMemoryLayout standalone root/run dir -> run_metadata.json`
- DS-004: `Context-file final owner -> ContextFileLayout -> AgentMemoryLayout.getStandaloneRunDirPath -> context_files`
- DS-005: `Team/member caller -> AgentMemoryLocationService -> AgentMemoryLayout.getTeamAgentRunDirPath -> team/member memoryDir`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A standalone run is prepared by allocating a unique run ID, then composing its memory directory with the single memory layout owner. | Run request, provisioning service, allocator, memory layout, run config | `AgentRunProvisioningService`; path authority is `AgentMemoryLayout` | Workspace validation, metadata catalog write |
| DS-002 | The allocator generates candidates and checks all collision surfaces without mixing old/new layout boundaries. | Allocator, active registry, metadata service, memory layout, team metadata | `AgentRunIdentityAllocator` | Reservation set, team member-tree scan |
| DS-003 | Run-history code resolves standalone metadata files through the same standalone root API that provisioning uses. | Run-history store/resolver, memory layout, metadata file | Run-history store/services; path authority is `AgentMemoryLayout` | Stored `metadata.memoryDir` normalization |
| DS-004 | Context-file standalone final paths append `context_files` under the single standalone memory directory. | Context-file layout, memory layout | `ContextFileLayout`; path authority is `AgentMemoryLayout` | Stored filename safety |
| DS-005 | Team/member memory paths continue through the existing location service and broad layout. | Team caller, location service, memory layout | `AgentMemoryLocationService` | Team topology reader |

## Spine Actors / Main-Line Nodes

- `AgentRunProvisioningService`: prepares standalone run config and assigns memoryDir.
- `AgentRunIdentityAllocator`: owns new agent-run ID allocation and collision checks.
- `AgentMemoryLayout`: owns memory root/path composition for standalone and team memory.
- `AgentRunMetadataStore` / `AgentRunHistoryIdentityResolver`: own standalone history metadata path resolution using the layout owner.
- `ContextFileLayout`: owns context-file subpath composition under a resolved memory directory.
- `AgentMemoryLocationService`: owns topology-aware memory locations for team/member/task-agent paths.

## Ownership Map

| Main-Line Node | Owns |
| --- | --- |
| `AgentRunIdentityAllocator` | Candidate generation, in-process reservation, active/metadata/filesystem/team collision policy. It does not own path composition. |
| `AgentRunProvisioningService` | Standalone run preparation lifecycle, metadata recording, prepared activation/cancel/cleanup. It does not own memory path semantics. |
| `AgentMemoryLayout` | Concrete memory roots and safe path composition for standalone and team memory. |
| `AgentMemoryLocationService` | Memory-location DTOs that combine topology identity with `AgentMemoryLayout` paths. |
| `AgentRunMetadataStore` | Standalone run metadata file read/write. It consumes path composition from `AgentMemoryLayout`. |
| `AgentRunHistoryIdentityResolver` | Safe standalone history identity resolution. It consumes the standalone root from `AgentMemoryLayout`. |
| `ContextFileLayout` | Context-file draft/final subpaths. It consumes standalone memory path from `AgentMemoryLayout` or explicit team `memoryDir`. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `getAgentMemoryLocationService()` | `AgentMemoryLocationService` | Singleton access to path-ready memory location boundary. | Raw path composition outside `AgentMemoryLayout`. |
| `AgentRunService` | `AgentRunProvisioningService` for create/prepare/activate flow | Public service surface for agent run lifecycle. | Memory layout details. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-memory/store/agent-run-memory-layout.ts` | It is a redundant standalone-only subset of `AgentMemoryLayout`. | `autobyteus-server-ts/src/agent-memory/store/agent-memory-layout.ts` | In This Change | Delete file after call-site conversion. |
| `AgentRunMemoryLayout` imports/usages in production and tests | Keeps the old boundary alive and invites future drift. | `AgentMemoryLayout` methods | In This Change | Verify with grep. |
| `agentMemoryLayoutV2` field in `AgentRunIdentityAllocator` | Versioned transitional naming violates target design. | Single `memoryLayout: AgentMemoryLayout` field | In This Change | No renamed `V3`, no wrapper. |

## Return Or Event Spine(s) (If Applicable)

No return/event spine materially shapes this refactor. The change is path composition and removal of an obsolete owner.

## Bounded Local / Internal Spines (If Applicable)

- `AgentRunIdentityAllocator` bounded collision loop: `Generate candidate -> Reserve candidate -> Check active/metadata/path/team collisions -> Release or return`.
  - Parent owner: `AgentRunIdentityAllocator`.
  - Why it matters: path collision checks must use one layout owner inside the loop.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Path segment validation | DS-001..DS-005 | `AgentMemoryLayout` | Reject unsafe path segments. | Keeps filesystem safety centralized. | Duplicate validation or weaker old behavior leaks. |
| Metadata read/write | DS-002, DS-003 | Run-history services | Persist and retrieve metadata facts. | Collision and history need stored facts. | Layout becomes a metadata scanner. |
| Team topology reading | DS-005 | `AgentMemoryLocationService` | Load root team metadata for team/member location derivation. | Team memory paths need topology. | Run-history becomes path authority. |
| Context-file filename safety | DS-004 | `ContextFileLayout` | Append safe context-file subpaths. | Memory layout should not know context-file internals. | Memory layout accumulates unrelated subtrees. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Single path layout owner | `agent-memory/store/agent-memory-layout.ts` | Reuse/Extend | Already owns standalone and team path composition. | N/A |
| Topology-aware memory locations | `agent-memory/services/agent-memory-location-service.ts` | Reuse | Already uses `AgentMemoryLayout`; no need for new helper. | N/A |
| Standalone run metadata paths | `run-history/store/agent-run-metadata-store.ts` | Modify | Existing store remains correct; only layout dependency changes. | N/A |
| Context-file subpaths | `context-files/store/context-file-layout.ts` | Modify | Existing context-file layout remains correct; only standalone layout dependency changes. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-memory` | Memory path composition and topology-aware memory locations. | DS-001..DS-005 | Provisioning, allocator, run-history, context files, team services | Extend | `AgentMemoryLayout` becomes sole layout owner. |
| `agent-execution` | Standalone run provisioning and ID allocation. | DS-001, DS-002 | `AgentRunService` | Modify | Remove old layout import from allocator/provisioning. |
| `run-history` | Standalone metadata/history identity path usage. | DS-003 | History catalog/view services | Modify | Consume `AgentMemoryLayout`; do not own layout semantics. |
| `context-files` | Context-file subpath layout. | DS-004 | Context file read/finalization services | Modify | Consume `AgentMemoryLayout` for standalone final owner only. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-memory/store/agent-memory-layout.ts` | Agent Memory | Memory layout | Sole path composition for standalone and team memory roots/run dirs. | One path-layout file prevents duplicate standalone path APIs. | N/A |
| `agent-memory/store/agent-run-memory-layout.ts` | Agent Memory | Obsolete | Old standalone-only layout. | No longer a valid file. | Replaced by `AgentMemoryLayout` |
| `agent-execution/services/agent-run-identity-allocator.ts` | Agent Execution | Allocator | Use one layout field for standalone/team collision paths. | Allocation policy remains one file. | `AgentMemoryLayout` |
| `agent-execution/services/agent-run-provisioning-service.ts` | Agent Execution | Provisioning | Use `AgentMemoryLayout` for standalone root/run path. | Provisioning lifecycle remains one file. | `AgentMemoryLayout` |
| `run-history/store/agent-run-metadata-store.ts` | Run History | Metadata store | Use `AgentMemoryLayout` for standalone metadata path. | Metadata persistence remains one file. | `AgentMemoryLayout` |
| `run-history/services/agent-run-history-identity.ts` | Run History | Identity resolver | Use `AgentMemoryLayout` standalone root. | Safe identity resolution remains one file. | `AgentMemoryLayout` |
| `context-files/store/context-file-layout.ts` | Context Files | Context-file layout | Use `AgentMemoryLayout` for standalone final owner path; append context subpath locally. | Context subpath concern stays one file. | `AgentMemoryLayout` |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Standalone memory root/path composition | `agent-memory/store/agent-memory-layout.ts` | Agent Memory | Provisioning, allocator, history, context files all need the same standalone path contract. | Yes: old `AgentRunMemoryLayout` removed. | Yes: only `getStandalone...` names remain. | Compatibility alias for old API names. |
| Team/member memory path composition | Existing `agent-memory/store/agent-memory-layout.ts` + `AgentMemoryLocationService` | Agent Memory | Already shared by team/member/task-agent flows. | Yes | Yes | Separate team-only replacement layout. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentMemoryLayout` | Yes after refactor | Yes | Low | Sole layout owner with explicit standalone/team method names. |
| `AgentRunMemoryLayout` | No longer applicable | Yes by deletion | High if retained | Delete. |
| `AgentMemoryScope` | Yes | N/A | Low | Continue using for team scopes only. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-memory/store/agent-memory-layout.ts` | Agent Memory | Memory layout | Compose `memory/agents/<agentRunId>`, `memory/agent_teams/<rootTeamRunId>/<...teamRunPath>`, and team agent dirs safely. | One file owns concrete memory path layout. | N/A |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-identity-allocator.ts` | Agent Execution | ID allocator | Generate/reserve IDs and check collisions using one `AgentMemoryLayout`. | Allocation policy remains cohesive. | `AgentMemoryLayout` |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts` | Agent Execution | Provisioning | Assign standalone `memoryDir` and scan prepared standalone roots via `AgentMemoryLayout`. | Provisioning lifecycle remains cohesive. | `AgentMemoryLayout` |
| `autobyteus-server-ts/src/run-history/store/agent-run-metadata-store.ts` | Run History | Metadata store | Read/write standalone metadata under `AgentMemoryLayout` standalone path. | Persistence concern remains cohesive. | `AgentMemoryLayout` |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-identity.ts` | Run History | History identity resolver | Resolve safe standalone history paths from `AgentMemoryLayout` root. | Identity safety concern remains cohesive. | `AgentMemoryLayout` |
| `autobyteus-server-ts/src/context-files/store/context-file-layout.ts` | Context Files | Context-file layout | Append `context_files` under standalone `AgentMemoryLayout` path or resolved team `memoryDir`. | Context-file subpath concern remains cohesive. | `AgentMemoryLayout` |

## Ownership Boundaries

- `AgentMemoryLayout` is the authoritative concrete memory path layout boundary.
- `AgentMemoryLocationService` remains the authoritative topology-aware location boundary for team/member/task-agent callers.
- Callers above memory layout must not import `AgentRunMemoryLayout` or recreate `memory/agents` / `memory/agent_teams` path rules locally when `AgentMemoryLayout` already exposes the needed API.
- `AgentRunIdentityAllocator` owns collision policy, not path composition.
- `Run-history` owns stored metadata, not memory layout semantics.
- `Context-file layout` owns context-file subpaths, not general run memory roots.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentMemoryLayout` | Standalone/team root strings, path-segment normalization, safe path resolution | Allocator, provisioning, run-history, context files, memory location service | Importing `AgentRunMemoryLayout` or manually composing equivalent memory roots | Add explicit method to `AgentMemoryLayout`, not a second layout class. |
| `AgentMemoryLocationService` | Team topology to path-ready locations | Team/member/task-agent path-sensitive readers/writers | Callers deriving nested team paths from metadata themselves | Extend location service API. |

## Dependency Rules

Allowed:

- `agent-execution/services/*` may import `agent-memory/store/agent-memory-layout.js` for concrete path composition needed during provisioning/allocation.
- `run-history` standalone metadata/identity services may import `AgentMemoryLayout` for standalone roots/paths.
- `context-files/store/context-file-layout.ts` may import `AgentMemoryLayout` for standalone final owner paths and accept explicit team `memoryDir` for team final owners.
- `AgentMemoryLocationService` may import `AgentMemoryLayout` and run-history topology reader.

Forbidden:

- No import from `agent-memory/store/agent-run-memory-layout.js` anywhere.
- No `AgentRunMemoryLayout` class, wrapper, alias, type export, or re-export.
- No `agentMemoryLayoutV2`, `memoryLayoutV2`, or equivalent versioned replacement naming.
- No manual `path.join(memoryDir, "agents", runId)` added in converted production call sites when `AgentMemoryLayout` is available.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentMemoryLayout.getStandaloneRootDirPath()` | Standalone memory root | Return `memory/agents` root. | None | Replaces old `getRunsRootDirPath()`. |
| `AgentMemoryLayout.getStandaloneRunDirPath(agentRunId)` | Standalone agent memory dir | Return safe `memory/agents/<agentRunId>`. | `agentRunId` path segment | Replaces old `getRunDirPath(runId)`. |
| `AgentMemoryLayout.ensureStandaloneRunSubtree(agentRunId)` | Standalone agent memory dir creation | Ensure standalone dir exists. | `agentRunId` path segment | Replaces old `ensureRunSubtree(runId)` if used. |
| `AgentMemoryLayout.getTeamAgentRunDirPath(scope, agentRunId)` | Team/member/task agent memory dir | Return safe team-scoped agent memory dir. | `AgentMemoryScope + agentRunId` | Existing team API remains. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentMemoryLayout.getStandaloneRunDirPath` | Yes | Yes | Low | Use for all standalone path needs. |
| `AgentMemoryLayout.getTeamAgentRunDirPath` | Yes | Yes | Low | Continue using for team-scoped run dirs. |
| Removed `AgentRunMemoryLayout.getRunDirPath` | No longer applicable | Was less explicit | High if retained | Delete. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Broad path layout | `AgentMemoryLayout` | Yes | Low | Keep. |
| Old standalone layout | `AgentRunMemoryLayout` | Misleading after broader layout exists | High | Delete. |
| Allocator memory field | Replace `agentMemoryLayout` / `agentMemoryLayoutV2` with `memoryLayout` | Yes | Low | Use one field. |

## Applied Patterns (If Any)

- Layout/path composer: `AgentMemoryLayout` remains the concrete path-composition owner.
- Service boundary: `AgentMemoryLocationService` remains the topology-aware memory location service.
- This task intentionally avoids adapter/wrapper patterns because a wrapper would preserve obsolete API names.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-memory/store/agent-memory-layout.ts` | File | Agent Memory layout | Sole memory path composition. | Agent Memory owns memory filesystem layout. | Legacy method aliases for old layout unless demanded by existing current API; no `V2`. |
| `autobyteus-server-ts/src/agent-memory/store/agent-run-memory-layout.ts` | File | Obsolete | Delete. | No longer belongs in target tree. | Any retained class/wrapper. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-identity-allocator.ts` | File | Allocator | Use one layout for standalone/team collision checks. | Allocation belongs in agent execution. | Versioned layout field, old layout import. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts` | File | Provisioning | Use one layout for standalone memoryDir and stale prepared scan. | Provisioning belongs in agent execution. | Old layout import. |
| `autobyteus-server-ts/src/run-history/store/agent-run-metadata-store.ts` | File | Metadata store | Use one layout for metadata path fallback. | Metadata persistence belongs in run-history. | Old layout import or raw duplicated root. |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-identity.ts` | File | History identity resolver | Use one layout root for safe identity resolution. | History path identity belongs in run-history. | Old layout import. |
| `autobyteus-server-ts/src/context-files/store/context-file-layout.ts` | File | Context-file layout | Use one layout for standalone final owner path. | Context subpaths belong in context-files. | General memory path rules beyond the layout call. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-memory/store` | Persistence/path layout | Yes after deletion | Low | One layout file is sufficient; no separate standalone-only file. |
| `agent-execution/services` | Main-line domain-control | Yes | Low | Services consume memory layout; do not own it. |
| `run-history/store/services` | Persistence-provider / history services | Yes | Low | History consumes layout for path roots only. |
| `context-files/store` | Persistence/path sublayout | Yes | Low | Context layout appends subpaths under resolved memory dirs. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Allocator layout dependency | `private readonly memoryLayout: AgentMemoryLayout;` then `getStandaloneRunDirPath(...)` and `getTeamAgentRunDirPath(...)` | `agentMemoryLayout: AgentRunMemoryLayout` plus `agentMemoryLayoutV2: AgentMemoryLayout` | Shows the single-boundary target. |
| Standalone path conversion | `this.memoryLayout.getStandaloneRunDirPath(runId)` | `new AgentRunMemoryLayout(memoryDir).getRunDirPath(runId)` | Removes legacy standalone layout. |
| Deletion policy | Delete `agent-run-memory-layout.ts` | `export class AgentRunMemoryLayout extends AgentMemoryLayout { ... }` | Wrapper would keep legacy API alive. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `AgentRunMemoryLayout` as alias/wrapper around `AgentMemoryLayout` | Would reduce call-site edit count. | Rejected | Convert call sites and delete old file. |
| Keep `getRunDirPath`/`getRunsRootDirPath` aliases on `AgentMemoryLayout` | Would allow old method names to survive. | Rejected unless an existing external API is proven in-scope; current repo does not require it. | Use explicit `getStandalone...` APIs. |
| Keep `agentMemoryLayoutV2` renamed to `teamMemoryLayout` | Would preserve dual fields. | Rejected | Single `memoryLayout` field. |
| Dual standalone path checks through old and new layouts | Defensive check. | Rejected | One authoritative path layout; valid paths are equivalent. |

## Derived Layering (If Useful)

- Domain/control services (`agent-execution`, `run-history`, `context-files`) consume the lower-level path layout boundary.
- `agent-memory` owns memory filesystem layout and topology-aware memory locations.
- No caller should skip from a service into a removed layout or manual path duplication.

## Migration / Refactor Sequence

1. Modify `AgentRunIdentityAllocator`:
   - remove `AgentRunMemoryLayout` import;
   - keep only `AgentMemoryLayout` import;
   - replace `agentMemoryLayout` and `agentMemoryLayoutV2` with `memoryLayout`;
   - use `getStandaloneRunDirPath(runId)` for standalone collision check;
   - keep `getTeamAgentRunDirPath(...)` for team collision check.
2. Modify `AgentRunProvisioningService`:
   - replace import/type/constructor with `AgentMemoryLayout`;
   - replace `getRunsRootDirPath()` with `getStandaloneRootDirPath()`;
   - replace `getRunDirPath(runId)` with `getStandaloneRunDirPath(runId)`.
3. Modify `ContextFileLayout`:
   - replace old layout import/field with `AgentMemoryLayout`;
   - replace standalone final owner path with `getStandaloneRunDirPath(owner.runId)`.
4. Modify `AgentRunMetadataStore`:
   - replace old layout import/field with `AgentMemoryLayout`;
   - replace fallback metadata path composition with `getStandaloneRunDirPath(runId)`.
5. Modify `AgentRunHistoryIdentityResolver`:
   - replace old layout import/field with `AgentMemoryLayout`;
   - replace `getRunsRootDirPath()` with `getStandaloneRootDirPath()`.
6. Delete `autobyteus-server-ts/src/agent-memory/store/agent-run-memory-layout.ts`.
7. Update tests:
   - ensure `AgentMemoryLayout` tests cover standalone root/run path and team paths;
   - add/adjust allocator test to cover one-layout collision behavior for standalone and team directory collisions if practical;
   - adjust provisioning/context/history tests if imports or expectations change;
   - add static regression test or documented static command for absence of `AgentRunMemoryLayout`, `agent-run-memory-layout`, and `agentMemoryLayoutV2`.
8. Run focused checks:
   - `rg -n "AgentRunMemoryLayout|agent-run-memory-layout|agentMemoryLayoutV2" autobyteus-server-ts/src autobyteus-server-ts/tests`
   - relevant Vitest files, at minimum:
     - `tests/unit/agent-memory/agent-memory-layout.test.ts`
     - `tests/unit/agent-execution/agent-run-identity-allocator.test.ts`
     - `tests/unit/agent-execution/agent-run-provisioning-service.test.ts`
     - `tests/unit/context-files/context-file-layout.test.ts`
   - `pnpm -C autobyteus-server-ts typecheck` if feasible.

## Key Tradeoffs

- The new layout's path segment validation is stricter than the old layout. This is desirable because run IDs should be path-safe segments; invalid slash-containing IDs should fail rather than compose unsafe paths.
- Keeping raw stored `metadata.memoryDir` behavior in `AgentRunMetadataStore` is not legacy layout retention; it preserves durable metadata facts. Only fallback composition moves to `AgentMemoryLayout`.

## Risks

- Tests may rely on old method names or old validation behavior and need updates.
- If a package consumer outside the repository imported `AgentRunMemoryLayout`, deletion would be breaking; current repository evidence indicates this is internal source, and the no-legacy policy still requires removal.
- Static grep for `V2` can match unrelated symbols if run broadly; scope the mandatory grep to obsolete layout terms and inspect any `V2` hits manually.

## Guidance For Implementation

- Do not implement this as a compatibility shim.
- Do not leave `agent-run-memory-layout.ts` as an empty or re-export file.
- Do not add old method aliases to `AgentMemoryLayout` just to reduce edits.
- Prefer direct, explicit `getStandalone...` method names everywhere standalone memory is meant.
- Keep team/member/task-agent location behavior unchanged.
- Record static-removal evidence in the implementation handoff.
