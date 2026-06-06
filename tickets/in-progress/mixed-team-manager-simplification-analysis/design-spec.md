# Design Spec: MixedTeamManager-Only Server Team Execution

## Status

User-approved for architecture review on 2026-06-06. User confirmed that full deletion of `autobyteus-ts/src/agent-team/**` is out of scope for this ticket. User also confirmed server-managed AutoByteus team prompts should use explicit sections, not `{{team}}` placeholder replacement.

## Upstream Inputs

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/in-progress/mixed-team-manager-simplification-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/in-progress/mixed-team-manager-simplification-analysis/investigation-notes.md`
- Branch/worktree: `codex/mixed-team-manager-simplification-analysis` at `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis`
- Base branch: latest `origin/personal`, ticket HEAD `74c0fd5905c85a4f52b7fecec16bf4c644a745de`

## Task Design Health Assessment

- Change posture: refactor, cleanup, architecture simplification, and bounded behavior parity fix.
- Root cause classification:
  - `Duplicated Policy Or Coordination`: team backend selection and same-runtime team orchestration are duplicated across AutoByteus/Codex/Claude/Mixed team managers.
  - `Boundary Or Ownership Issue`: runtime-specific behavior is split between team managers and `AgentRunManager`; the correct boundary is `TeamRun -> MixedTeamManager -> AgentRunManager`.
  - `Legacy Or Compatibility Pressure`: specialized team managers remain after their original reasons are gone; CLI/TUI and old native task-plan behavior must not be preserved.
  - `Shared Structure Looseness`: AutoByteus team prompt/context primitives are still tied to native `autobyteus-ts/src/agent-team` instead of the server `MemberTeamContext` semantics used by other runtimes.
- Refactor needed now: yes.
- Design response: make `MixedTeamManager` the single active server team manager, move all runtime-specific member creation to `AgentRunManager`, add AutoByteus member prompt parity inside the AutoByteus `AgentRun` backend, and delete specialized server team backend families rather than wrapping them.

## Design Summary

The target architecture is:

```text
TeamRun
  -> MixedTeamManager
      -> MixedTeamMemberRegistry
          -> MixedAgentMemberHandle
              -> AgentRunManager.createAgentRun(runtimeKind = member.runtimeKind)
                  -> AutoByteus | Codex | Claude AgentRun backend
          -> MixedSubTeamMemberHandle
              -> child TeamRun with TeamBackendKind.MIXED
```

`MixedTeamManager` remains named `MixedTeamManager` by product decision. Its meaning changes from “only heterogeneous/nested team manager” to “the general server team manager whose per-member runtime selection includes every homogeneous case.”

Runtime-specific **agent** backends remain. Runtime-specific **team** backends are removed from active server execution.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | GraphQL/API team launch | Member runtime process/client | `TeamRun` + `MixedTeamManager` | Proves all team launches use one team manager and delegate runtime choice per member. |
| DS-002 | Primary End-to-End | Historical team metadata restore | Restored member `AgentRun` backends | `TeamRunMetadataMapper` + `MixedTeamRunBackendFactory` | Removes specialized restore branches while preserving platform run ids. |
| DS-003 | Primary End-to-End | User/inter-agent message to team member | Target member `AgentRun` input queue | `MixedTeamManager` | Ensures same routing for homogeneous, heterogeneous, nested, and task-agent members. |
| DS-004 | Return/Event | Member runtime event | Team run subscribers/history/UI | `MixedTeamManager` | Preserves status, communication, tool approval, file-change, and lifecycle event projection. |
| DS-005 | Bounded Local | AutoByteus member config build | Processed AutoByteus system prompt + native-compatible team context | `AutoByteusAgentRunBackendFactory` | Fixes AutoByteus mixed-member prompt/context parity without restoring native team execution. |
| DS-006 | Primary End-to-End | `delegate_tasks` tool call | Task-agent member lifecycle and completion/acceptance | `TeamRun` + server task delegation service | Confirms server task delegation is runtime-neutral and no longer depends on native task-plan behavior. |

## Primary Execution Spines

### DS-001: Team Launch

```text
GraphQL / API createAgentTeamRun
  -> TeamRunService
  -> TeamDefinitionTopologyPlanner
  -> AgentTeamRunManager
  -> MixedTeamRunBackendFactory
  -> MixedTeamManager
  -> MixedAgentMemberHandle
  -> AgentRunManager
  -> runtime-specific AgentRun backend
```

### DS-002: Restore

```text
TeamRunMetadata
  -> TeamRunMetadataMapper
  -> buildMixedRestoreTeamRunRuntimeContext
  -> AgentTeamRunManager.restoreTeamRun
  -> MixedTeamRunBackendFactory.restoreBackend
  -> MixedTeamManager
  -> MixedAgentMemberHandle.restore
  -> AgentRunManager.restoreAgentRun
```

### DS-003: Team Message / Member Command

```text
TeamRun.postMessage / deliverInterAgentMessage / approve / interrupt / settle
  -> MixedTeamRunBackend
  -> MixedTeamManager
  -> MixedTeamMemberRegistry
  -> MixedAgentMemberHandle | MixedSubTeamMemberHandle | task-agent handle
  -> AgentRun command
```

### DS-006: Server Task Delegation

```text
member AgentRun tool call
  -> server task-delegation tool context from MemberTeamContext
  -> TaskDelegationService
  -> TeamRun.startTaskAgentInstance
  -> MixedTeamManager
  -> MixedTeamMemberRegistry task-agent handle
  -> AgentRunManager.createAgentRun(runtimeKind = logical member runtimeKind)
  -> mark_task_completed / mark_task_failed
  -> notification to original delegator / coordinator fallback
  -> accept_task
  -> TeamRun.settleTaskAgentInstance
```

## Spine Narratives

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Launch always builds a mixed team context. The topology planner still resolves nested member tree and per-member runtime config, but it no longer chooses specialized team backend kinds. `AgentTeamRunManager` creates one backend type, and `MixedAgentMemberHandle` delegates each runtime to `AgentRunManager`. | `TeamRunService`, `TeamDefinitionTopologyPlanner`, `AgentTeamRunManager`, `MixedTeamManager`, `AgentRunManager` | `TeamRun` / `MixedTeamManager` | workspace activation, self-evolution snapshotting, member memory layout, definition lookup |
| DS-002 | Restore no longer infers team backend kind from runtime homogeneity. Metadata is normalized into `MixedTeamRunContext`, including nested subteam contexts and platform member ids, then restored through mixed handles. | `TeamRunMetadataMapper`, `MixedTeamRunContext`, `MixedTeamRunBackendFactory`, `AgentRunManager` | `TeamRunMetadataMapper` for restore shape; `MixedTeamManager` for runtime | metadata flattening, memory layout, workspace id/root reconstruction |
| DS-003 | Every team command targets a member route key/path and flows through the same mixed registry. Homogeneous teams are just mixed teams whose members all have the same runtime. | `TeamRun`, `MixedTeamRunBackend`, `MixedTeamManager`, `MixedTeamMemberRegistry`, `MixedTeamMemberHandle` | `MixedTeamManager` | selector normalization, recipient validation, parent-boundary delivery, task-agent targeting |
| DS-004 | Member runtime events are normalized as `AgentRunEvent`s by per-runtime agent backends, then multiplexed into `TeamRunEvent`s by mixed member handles/manager. | runtime backend, `AgentRun`, `MixedAgentMemberHandle`, `MixedTeamManager`, `TeamRun` | `MixedTeamManager` | team communication service, run-file-change service, run history projection, WebSocket/UI projection |
| DS-005 | AutoByteus member config building composes a full team-aware prompt from server `MemberTeamContext` and keeps a native-compatible `teamContext` only as tool/runtime data. | `AutoByteusAgentRunBackendFactory`, `MemberTeamContext`, `MemberRunInstructionComposer`, AutoByteus `AgentConfig` | `AutoByteusAgentRunBackendFactory` | tool exposure filtering, team context bridge, prompt rendering, self-member exclusion |
| DS-006 | Task delegation remains server-owned. Tools derive caller/team identity from `MemberTeamContext`; task agents are created through the same mixed member handle path as normal members. | task tool, `TaskDelegationService`, `TeamRun`, `MixedTeamManager`, task-agent handle | `TeamRun` + task delegation service | completion notification, acceptance, settlement, task-agent identity |

## Spine Actors / Main-Line Nodes

- `TeamRunService`: public create/restore use-case owner; prepares member configs, workspace ids, self-evolution snapshots, and metadata recording.
- `TeamDefinitionTopologyPlanner`: team definition topology owner; produces nested member tree and route keys, not backend selection policy.
- `AgentTeamRunManager`: active team-run registry and backend lifecycle entry; owns one `MixedTeamRunBackendFactory`.
- `TeamRun`: team lifecycle boundary exposed to API/transport and task delegation.
- `MixedTeamRunBackendFactory`: context construction owner for `MixedTeamRunContext`, member memory dirs, and nested restore context.
- `MixedTeamManager`: server team orchestration owner; owns member registry, team command routing, inter-agent delivery, status, events, and task-agent lifecycle.
- `MixedTeamMemberRegistry`: lazy member handle registry and task-agent handle registry.
- `MixedAgentMemberHandle`: member `AgentRun` creation/restore and command/event bridge.
- `AgentRunManager`: authoritative per-agent runtime selection boundary.
- `AutoByteusAgentRunBackendFactory`: AutoByteus standalone/member agent config and prompt/context owner.

## Ownership Map

| Node | Owns | Must Not Own |
| --- | --- | --- |
| `TeamRunService` | API use-case orchestration, launch config normalization, metadata handoff | Runtime backend dispatch or member runtime sessions |
| `TeamDefinitionTopologyPlanner` | Definition expansion, nested member tree, route keys, coordinator route key | Team backend choice based on runtime homogeneity |
| `AgentTeamRunManager` | Active team-run registry, lifecycle attach/detach, one backend factory boundary | Runtime-specific team manager factory selection |
| `TeamRun` | Team-level command boundary, coordinator fallback, status observation | Provider/runtime-specific member session logic |
| `MixedTeamManager` | Team orchestration, event multiplexing, inter-agent routing, task-agent lifecycle | Runtime-specific provider details |
| `MixedAgentMemberHandle` | One logical member's AgentRun lifecycle bridge | Team-level policy or runtime backend factory dispatch beyond `AgentRunManager` |
| `AgentRunManager` | AgentRun create/restore and runtime backend selection | Team topology, team routing, teammate roster semantics |
| `AutoByteusAgentRunBackendFactory` | Native AutoByteus `AgentConfig`, tools, system prompt, native-compatible team context | Native `AgentTeam` execution, team-member routing policy |

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `createAgentTeamRun` resolver | `TeamRunService` | Transport/API entry | Team backend selection |
| `TeamRun` methods | `MixedTeamManager` through `MixedTeamRunBackend` | Stable runtime-neutral team command API | Runtime-specific provider behavior |
| `MixedTeamRunBackend` | `MixedTeamManager` | Backend interface adapter for `TeamRun` | Member registry policy beyond delegating to manager |

## Removal / Decommission Plan

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `TeamBackendKind.AUTOBYTEUS`, `TeamBackendKind.CODEX_APP_SERVER`, `TeamBackendKind.CLAUDE_AGENT_SDK` active team backend values | Team runtime homogeneity no longer selects a team backend | `TeamBackendKind.MIXED` plus per-member `RuntimeKind` | In This Change | Keep only `MIXED` if keeping enum is less invasive; no branching on old values. |
| `resolveSingleRuntimeTeamBackendKind(...)` | Homogeneous runtime no longer maps to specialized team backend | none | In This Change | Delete. |
| `resolveTeamBackendKindFromMemberRuntimeKinds(...)` | Restore always produces mixed context | `buildMixedRestoreTeamRunRuntimeContext(...)` | In This Change | Delete or reduce to constant if callers still need a transitional compile shape during refactor. |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/*` | Native server team backend no longer active; AutoByteus members run as `AgentRun`s | `MixedTeamManager` + `AutoByteusAgentRunBackendFactory` | In This Change | Delete after AutoByteus prompt/context parity tests pass. |
| `autobyteus-server-ts/src/agent-team-execution/backends/codex/*` team backend files | Duplicates mixed member-run orchestration | `MixedTeamManager` + Codex `AgentRun` backend | In This Change | Delete manager/backend/factory/context tests or rewrite to mixed. |
| `autobyteus-server-ts/src/agent-team-execution/backends/claude/*` team backend files | Duplicates mixed member-run orchestration | `MixedTeamManager` + Claude `AgentRun` backend | In This Change | Delete manager/backend/factory/context tests or rewrite to mixed. |
| `AgentTeamRunManager.getTeam(...)` / `AutoByteusTeamLike` exposure | Only served native AutoByteus team backend internals | `getTeamRun(...)` and member run APIs | In This Change | No active source callers; specialized tests are removed/rewritten. |
| `AgentTeamRunManager` specialized factory constructor options | No specialized factories remain | `mixedTeamRunBackendFactory` option only | In This Change | Simplifies unit test setup. |
| Conditional run-file-change attach for `TeamBackendKind.AUTOBYTEUS` | Backend kind no longer indicates file-change capability | `RunFileChangeService.attachToTeamRun(run)` for all team runs | In This Change | Service already filters actual file-change events. |
| Server import of `TeamManifestInjectorProcessor` in AutoByteus agent backend | New AutoByteus member prompt composer renders server team instructions directly | `autobyteus-member-system-prompt-composer.ts` | In This Change | Avoid duplicate team manifests. |
| `LEGACY_LOCAL_TASK_TOOL_NAMES` and tests preserving old task-plan names | User requested no permanent legacy vocabulary | Positive current tool exposure tests | In This Change if active registries cannot produce old tools | If a temporary guard is truly necessary for custom external configs, mark with deletion condition; preferred design deletes it. |
| CLI/TUI code | Already removed upstream | none | Non-regression | Do not reintroduce. |
| Entire exported native `autobyteus-ts/src/agent-team` package surface | Server execution no longer needs it | Server `MixedTeamManager`; extracted runtime-neutral primitives if needed | Follow-up unless explicitly expanded | Requires moving still-used utilities/tests/docs. Not required for server mixed-only cutover. |

## Return Or Event Spine(s)

### DS-004: Member Runtime Event Projection

```text
Runtime provider/client
  -> runtime-specific AgentRunBackend normalizes AgentRunEvent
  -> AgentRun emits event
  -> MixedAgentMemberHandle observes/bridges event
  -> MixedTeamManager publishes TeamRunEvent
  -> TeamRun subscribers
  -> TeamCommunicationService / RunFileChangeService / run history / WS / UI
```

Key design requirement: event projection must be attached to all mixed team runs. Since `RunFileChangeService.attachToTeamRun(...)` already filters to `TeamRunEventSourceType.AGENT` and `AgentRunEventType.FILE_CHANGE`, `AgentTeamRunManager` should attach it unconditionally for active team runs instead of checking `TeamBackendKind.AUTOBYTEUS`.

## Bounded Local / Internal Spines

### Mixed member lazy-start spine

Parent owner: `MixedTeamMemberRegistry`

```text
resolve member selector
  -> find/create handle
  -> handle.ensureReady()
  -> build MemberTeamContext
  -> create/restore AgentRun
  -> subscribe member events
  -> deliver input/command
```

Why it matters: this is the local mechanism that makes mixed a superset. It must remain the only member-start mechanism for teams.

### AutoByteus member prompt composition spine

Parent owner: `AutoByteusAgentRunBackendFactory`

```text
AgentDefinition.instructions/description
  -> resolved tool exposure
  -> MemberTeamContext
  -> composeMemberRunInstructions
  -> render AutoByteus markdown system prompt
  -> AgentConfig.systemPrompt
  -> SystemPromptProcessingStep
```

Why it matters: fixes the gap where AutoByteus mixed members currently receive only a simple native manifest rather than full server team instructions.

### Task-agent lifecycle spine

Parent owner: `MixedTeamMemberRegistry`

```text
TaskDelegationService request
  -> startTaskAgentInstance
  -> create task-agent MixedAgentMemberHandle
  -> AgentRunManager creates task AgentRun
  -> task result tool call
  -> completion notification
  -> acceptance
  -> settle task-agent handle
```

Why it matters: confirms native task-plan removal is replaced by server-owned task delegation, not by native `AgentTeam`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Workspace activation | DS-001 | `TeamRunService` | Normalize workspace id/root path before launch | Member configs need stable workspace ids | Runtime backends would duplicate workspace lookup. |
| Member memory layout | DS-001, DS-002 | `MixedTeamRunBackendFactory`, metadata mapper | Assign per-member memory dirs | Member runs need stable persistent dirs | Mixed handles would repeat path policy. |
| Team definition summary lookup | DS-001, DS-005 | `MemberTeamContextBuilder` | Resolve team name/instruction | Team prompts and rosters need definition metadata | Prompt code would query definition service directly. |
| Communication roster building | DS-003, DS-005 | `MemberTeamContextBuilder` | Build allowed recipients incl. parent boundary | Send-message validation and prompt roster need same source | Prompt and delivery could disagree. |
| Tool exposure resolution | DS-005, DS-006 | Runtime agent backend / shared exposure helpers | Decide which runtime instructions/tools apply | Prompts must match tools actually exposed | LLM receives invalid tool instructions. |
| Team communication service | DS-004 | `AgentTeamRunManager` active-run attach | Persist/project team communication events | UI/history observe messages | Manager would mix persistence with routing. |
| Run file change service | DS-004 | `AgentTeamRunManager` active-run attach | Project file-change events for member runs | API/UI need file-change projection | Backend kind condition can silently drop mixed AutoByteus events. |
| Metadata mapping | DS-002 | `TeamRunMetadataMapper` | Convert metadata <-> run config/context | Restore must be deterministic | Backend factories would parse historical metadata. |
| Native-compatible AutoByteus team context | DS-005, DS-006 | `AutoByteusAgentRunBackendFactory` | Provide tool execution context bridge | Native tools need `customData.teamContext` | Recreating native `AgentTeamContext` would reintroduce old runtime. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| General team orchestration | `agent-team-execution/backends/mixed` | Extend/reuse | Already owns mixed/nested member routing and task-agent handling | No new manager. |
| Per-runtime member creation | `agent-execution/services/agent-run-manager.ts` | Reuse | Already dispatches AutoByteus/Codex/Claude agent backends | Do not duplicate in team layer. |
| Member prompt instructions | `member-run-instruction-composer.ts` | Extend/reuse | Codex/Claude already use it; AutoByteus should join it | Avoid another runtime-specific roster policy. |
| AutoByteus native tool context | `autobyteus-team-communication-context-builder.ts` | Extend/reuse | Already bridges native `send_message_to` to server delivery | Do not revive native `AgentTeamContext`. |
| Team communication events | `TeamCommunicationService` | Reuse | Already attaches to team run events | Do not put persistence in manager. |
| File-change projection | `RunFileChangeService` | Reuse | Already supports `attachToTeamRun` generically | Only remove wrong backend-kind gate. |
| Task delegation | `agent-team-execution/task-delegation` + `agent-tools/task-delegation` | Reuse | Already server-owned and runtime-neutral | Do not use old native task-plan concepts. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-team-execution/domain` | Team run config/context/backend kind/member identity | DS-001, DS-002, DS-003 | `TeamRun`, `MixedTeamManager` | Modify | Reduce backend kind to mixed-only semantics. |
| `agent-team-execution/services` | Create/restore planning, active run manager, metadata mapper, member team context | DS-001, DS-002, DS-005 | `TeamRunService`, `AgentTeamRunManager` | Modify | Remove backend selection based on runtime homogeneity. |
| `agent-team-execution/backends/mixed` | Single active team backend, member registry/handles, subteam recursion | DS-001, DS-003, DS-004, DS-006 | `MixedTeamManager` | Extend | Becomes universal team backend. |
| `agent-execution/services` | Per-agent runtime backend dispatch | DS-001, DS-002 | `AgentRunManager` | Reuse | No team topology logic. |
| `agent-execution/backends/autobyteus` | AutoByteus AgentRun config, prompt, native-compatible context | DS-005 | `AutoByteusAgentRunBackendFactory` | Modify | Add member prompt composer; keep context bridge. |
| `agent-execution/backends/codex` / `claude` | Runtime-specific AgentRun behavior | DS-001, DS-004 | `AgentRunManager` | Reuse | Team-specific backends deleted, agent backends stay. |
| `services/run-file-changes` | File-change projection | DS-004 | `AgentTeamRunManager` active-run attach | Reuse | Attach for all team runs. |
| `agent-team-execution/task-delegation` | Server task delegation lifecycle | DS-006 | `TeamRun` | Reuse | Mixed-only task-agent path. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `domain/team-backend-kind.ts` | team domain | backend kind model | Single active backend marker | Existing model owner | RuntimeKind remains separate. |
| `services/team-definition-topology-planner.ts` | team services | topology planner | Build member tree and coordinator route; always set `MIXED` | Planner owns topology, not backend selection | `TeamRunConfig` |
| `services/team-run-runtime-context-support.ts` | team services | restore context builder | Build `MixedTeamRunContext` for all metadata | Restore context shape belongs here | `MixedTeamRunContext` |
| `services/team-run-metadata-mapper.ts` | team services | metadata mapper | Restore to mixed context and config | Metadata conversion owner | `TeamRunConfig`, `MixedTeamRunContext` |
| `services/agent-team-run-manager.ts` | team services | active team run manager | One mixed backend factory, active registry, attach communication/file-change services | Existing entry owner | `TeamRun`, `MixedTeamRunBackendFactory` |
| `backends/mixed/mixed-team-run-backend-factory.ts` | mixed backend | context factory | Ensure all member identity/memory/restore support for universal mixed | Existing factory owner | `TeamMemberMemoryLayout` |
| `backends/mixed/members/mixed-agent-member-handle.ts` | mixed backend | member handle | Member `AgentRunConfig` creation/restoration with `MemberTeamContext` | Existing member lifecycle owner | `MemberTeamContextBuilder` |
| `agent-execution/backends/autobyteus/autobyteus-member-system-prompt-composer.ts` | AutoByteus agent backend | prompt adapter | Render server member instruction composition into AutoByteus single system prompt | New concrete concern | `composeMemberRunInstructions` |
| `agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | AutoByteus agent backend | AgentConfig factory | Use prompt composer for member runs; keep native-compatible team context; remove team manifest injection for mixed | Existing config owner | `buildConfiguredAgentToolExposure`, `buildAutoByteusStandaloneTeamContext` |
| `agent-execution/backends/autobyteus/autobyteus-mixed-tool-exposure.ts` | AutoByteus agent backend | tool filter | Remove legacy task-plan name guard; filter current task-management category appropriately | Existing tool exposure owner | `TASK_DELEGATION_TOOL_NAMES` |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Member/team prompt instruction composition | existing `member-run-instruction-composer.ts` | `agent-team-execution/services` | Codex, Claude, and AutoByteus all need same team semantics | Yes | Yes | Runtime-specific prompt policy clone |
| Roster manifest rendering | existing `member-team-roster-manifest.ts` | `agent-team-execution/services` | Prompt and send-message guidance should share roster source | Yes | Yes | A second native-only team manifest |
| Native-compatible AutoByteus team context | existing `autobyteus-team-communication-context-builder.ts` | AutoByteus agent backend | Native tools need customData bridge | Mostly; may tighten after prompt refactor | Medium | Native `AgentTeamContext` recreation |
| Team backend kind resolution | none | team domain | No shared structure needed after mixed-only | Yes | Yes | A new resolver that reintroduces runtime homogeneity branching |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamRunConfig.teamBackendKind` | Yes only if single-valued `MIXED` | Partly | Medium | Keep as single active marker or remove in later structural cleanup; no old values. |
| `MemberTeamContext` | Yes | Yes | Low | Remains authoritative server team/member context. |
| `AutoByteusStandaloneTeamContext` | Mostly | Partly | Medium | Keep only data needed by native tools/runtime; do not add native config/state/teamManager. |
| `TeamCommunicationContext` in `autobyteus-ts/agent-team` | No, because standalone agent tools import native team package | No | Medium | Optional/refactor: move runtime-neutral communication context/request type under `autobyteus-ts/src/agent/...` if implementation touches this area. |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-backend-kind.ts` | Team domain | Backend-kind model | Export only `TeamBackendKind.MIXED` or equivalent constant; remove runtime-kind mapping. | One domain enum/constant owner. | `RuntimeKind` only in member configs. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-definition-topology-planner.ts` | Team services | Topology planner | Always build `TeamRunConfig` with `TeamBackendKind.MIXED`; keep topology/member runtime hydration. | Planner remains topology owner. | `TeamRunConfig` |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-runtime-context-support.ts` | Team services | Restore runtime-context builder | Build mixed runtime context for all metadata; remove specialized context imports/classes. | Restore shape centralized. | `MixedTeamRunContext` |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-metadata-mapper.ts` | Team services | Metadata mapper | Restore contexts/configs as mixed; preserve platform ids. | Metadata conversion centralized. | `TeamRunConfig` |
| `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | Team services | Active team-run manager | Own only `MixedTeamRunBackendFactory`; attach communication and file-change services for all team runs; remove `getTeam`. | One active backend lifecycle owner. | `TeamRun` |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/**` | Mixed backend | Universal team backend | Continue member registry/handles/subteam recursion; add tests for all homogeneous runtimes. | Existing correct owner. | `AgentRunManager`, `MemberTeamContextBuilder` |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-member-system-prompt-composer.ts` | AutoByteus backend | Prompt adapter | Compose server team/agent/runtime instructions into one AutoByteus system prompt. | Keeps prompt rendering out of factory. | `composeMemberRunInstructions` |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | AutoByteus backend | AgentConfig factory | Use composer for team members, keep `initialCustomData.teamContext`, remove server use of `TeamManifestInjectorProcessor`. | Existing AutoByteus config owner. | `buildAutoByteusStandaloneTeamContext` |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-team-communication-context-builder.ts` | AutoByteus backend | Native-compatible context bridge | Bridge native tools to server mixed delivery. | One bridge owner. | `MemberTeamContext` |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-mixed-tool-exposure.ts` | AutoByteus backend | Tool exposure filtering | Remove permanent legacy task-plan vocabulary; expose current task delegation appropriately. | Existing tool filter owner. | `TASK_DELEGATION_TOOL_NAMES` |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Docs | server team architecture doc | Document mixed-only server team manager and per-member runtime. | Main module doc. | N/A |
| `autobyteus-web/docs/agent_teams.md` | Docs | product/team docs | Update if it describes backend selection. | Frontend docs align with server behavior. | N/A |

## Ownership Boundaries

- `TeamRun` is the authoritative public runtime boundary for team-level commands. Upstream callers should not know about specialized team managers.
- `MixedTeamManager` is the authoritative internal team orchestration owner. It encapsulates member registry, inter-agent routing, subteam recursion, task-agent lifecycle, and team event multiplexing.
- `AgentRunManager` is the authoritative per-agent runtime selection boundary. Team code passes an `AgentRunConfig` with `runtimeKind`; it does not instantiate AutoByteus/Codex/Claude provider backends directly.
- `AutoByteusAgentRunBackendFactory` owns AutoByteus-specific agent configuration. It can adapt server `MemberTeamContext` into native-compatible custom data, but it must not recreate native `AgentTeam` execution.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentTeamRunManager` | `MixedTeamRunBackendFactory` | `TeamRunService`, restore services | Selecting `AutoByteusTeamRunBackendFactory` / `CodexTeamRunBackendFactory` / `ClaudeTeamRunBackendFactory` | Add capability to mixed backend/factory. |
| `MixedTeamManager` | `MixedTeamMemberRegistry`, member handles, subteam factory | `TeamRun`, `MixedTeamRunBackend` | Calling member `AgentRun`s directly from `TeamRunService` | Add manager method or registry capability. |
| `AgentRunManager` | runtime-specific agent backend factories | `MixedAgentMemberHandle` | Team manager directly importing AutoByteus/Codex/Claude agent backend factories | Add agent-run manager API if missing. |
| `MemberTeamContextBuilder` | roster builder, team definition summary lookup, parent-boundary context | `MixedAgentMemberHandle`, task-agent handles | Runtime backends constructing their own team rosters | Add fields to `MemberTeamContext`. |
| `AutoByteusAgentRunBackendFactory` | prompt composer, tool exposure, native context bridge | `AgentRunManager` | Native `AgentTeam` bootstrap configuring team prompts | Extend AutoByteus member prompt composer. |

## Dependency Rules

Allowed:

- `TeamRunService -> TeamDefinitionTopologyPlanner -> TeamRunConfig`.
- `TeamRunService -> AgentTeamRunManager`.
- `AgentTeamRunManager -> MixedTeamRunBackendFactory` only.
- `MixedTeamManager / MixedAgentMemberHandle -> AgentRunManager`.
- `AgentRunManager -> runtime-specific AgentRun backend factories`.
- `AutoByteusAgentRunBackendFactory -> MemberRunInstructionComposer` and `MemberTeamContext` types.

Forbidden:

- `AgentTeamRunManager -> AutoByteusTeamRunBackendFactory | CodexTeamRunBackendFactory | ClaudeTeamRunBackendFactory`.
- `TeamDefinitionTopologyPlanner` choosing backend kind from runtime homogeneity.
- Restore code constructing `AutoByteusTeamRunContext`, `CodexTeamRunContext`, or `ClaudeTeamRunContext`.
- AutoByteus mixed member prompt construction depending on native `AgentTeamContext`, native `teamManager`, or native team state.
- Specialized team manager wrappers retained only to forward to mixed.
- Legacy task-plan tool names in permanent tests, docs, or runtime instructions.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TeamRunService.createTeamRun(input)` | Team run | Prepare and start team run | `teamDefinitionId + memberConfigs` | No backend kind input. |
| `TeamDefinitionTopologyPlanner.buildPlan(input)` | Team topology | Resolve member tree/route keys/coordinator | `teamDefinitionId + memberConfigs` | Returns mixed config always. |
| `AgentTeamRunManager.createTeamRun(config)` | Active team run | Create and register active team run | `TeamRunConfig` | Uses only mixed backend factory. |
| `AgentTeamRunManager.restoreTeamRun(context)` | Active team run | Restore and register active team run | `TeamRunContext<MixedTeamRunContext>` | No specialized restore dispatch. |
| `TeamRun.postMessage(message, target, targetMemberRunId?)` | Team command | Send user input to member/coordinator | `TeamMemberSelector + optional memberRunId` | Selector stays team-member specific. |
| `MixedTeamManager.deliverInterAgentMessage(request)` | Team communication | Validate and deliver teammate message | `InterAgentMessageDeliveryRequest` with participant identity | Roster source is `MemberTeamContext`. |
| `AgentRunManager.createAgentRun(config, preferredRunId?)` | Agent run | Runtime-specific member process/session creation | `AgentRunConfig.runtimeKind` | Runtime decision is here. |
| `composeAutoByteusMemberSystemPrompt(input)` | AutoByteus member prompt | Render team-aware prompt | `basePrompt + MemberTeamContext + tool exposure` | New boundary. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamRunService.createTeamRun` | Yes | Yes | Low | Keep no backend kind input. |
| `TeamDefinitionTopologyPlanner.buildPlan` | Yes after refactor | Yes | Low | Remove backend-kind policy. |
| `AgentTeamRunManager.createTeamRun` | Yes after refactor | Yes | Low | Remove factory dispatch. |
| `AgentRunManager.createAgentRun` | Yes | Yes | Low | Keep runtime in `AgentRunConfig`. |
| `TeamBackendKind` | Weak if multi-valued | N/A | High currently | Reduce to mixed-only or remove in follow-up. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| General team manager | `MixedTeamManager` | Product-approved historical name; semantically broader now | Medium | Keep name, document broader meaning. |
| Runtime-specific agent owner | `AgentRunManager` | Yes | Low | No change. |
| Backend kind | `TeamBackendKind.MIXED` | Adequate as retained marker | Medium | Do not add `UNIFIED`; keep mixed-only semantics. |
| AutoByteus prompt adapter | `autobyteus-member-system-prompt-composer.ts` | Yes | Low | New file. |

## Applied Patterns

- Factory pattern: `MixedTeamRunBackendFactory` remains the only team backend factory and owns mixed context creation.
- Registry pattern: `MixedTeamMemberRegistry` remains the member-handle registry and task-agent registry.
- Adapter pattern: `AutoByteusAgentRunBackendFactory` adapts server `MemberTeamContext` into AutoByteus `AgentConfig` and native-compatible tool context.
- Event projection: `MixedTeamManager` multiplexes member `AgentRunEvent`s into `TeamRunEvent`s; off-spine projection services consume those events.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-backend-kind.ts` | File | Team domain | Mixed-only backend kind marker | Existing backend-kind owner | Runtime-kind mapping. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-definition-topology-planner.ts` | File | Topology planner | Topology only; always mixed | Existing planner owner | Runtime homogeneity backend policy. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-runtime-context-support.ts` | File | Restore context builder | Mixed context restore | Existing restore helper owner | Specialized context builders. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-metadata-mapper.ts` | File | Metadata mapper | Metadata/config/context conversion | Existing mapper owner | Backend inference from runtime kinds. |
| `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | File | Active run manager | Active team run lifecycle and service attachment | Existing manager owner | Specialized factory fields/dispatch. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/` | Folder | Universal mixed team backend | Backend, manager, contexts, subteam factory, member handles | Existing mixed backend package | Runtime-provider details. |
| `autobyteus-server-ts/src/agent-team-execution/backends/common/` | Folder | Mixed/team backend shared mechanics | Server-managed status/lifecycle helper files still used by mixed | Existing common package | Specialized backend-only dead code. |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/` | Folder | obsolete server team backend | Delete | Replaced by mixed + AutoByteus AgentRun backend | Any active code. |
| `autobyteus-server-ts/src/agent-team-execution/backends/codex/` | Folder | obsolete server team backend | Delete | Replaced by mixed + Codex AgentRun backend | Any active code. |
| `autobyteus-server-ts/src/agent-team-execution/backends/claude/` | Folder | obsolete server team backend | Delete | Replaced by mixed + Claude AgentRun backend | Any active code. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-member-system-prompt-composer.ts` | File | AutoByteus member prompt | Render server team prompt for AutoByteus | Runtime-specific prompt adapter belongs in AutoByteus backend | Native team manager logic. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | File | AutoByteus AgentConfig factory | Apply prompt composer and context bridge | Existing config owner | Team-level member routing. |
| `autobyteus-server-ts/tests/...` | Tests | validation | Rewrite specialized backend tests to mixed-only invariants | Tests should match target owner | Compatibility assertions for old managers. |
| `autobyteus-ts/src/cli/**` | Folder | removed CLI/TUI | Remain absent | Non-regression | New CLI/TUI implementation. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-team-execution/backends/mixed` | Main-line domain-control backend | Yes | Low | Becomes universal team backend; name retained by product decision. |
| `agent-team-execution/backends/common` | Off-spine concern | Yes if only mixed-reused files remain | Medium | Delete common files that only served removed specialized backends. |
| `agent-execution/backends/autobyteus` | Runtime adapter | Yes | Low | AutoByteus prompt/context belongs to AgentRun backend, not team backend. |
| `agent-team-execution/services` | Main-line orchestration services | Mostly | Medium | Keep service files subject-specific; do not introduce a generic runtime-composition service. |
| `autobyteus-ts/src/agent-team` | Native package | Not part of active server scope | Medium | Follow-up decommission candidate; do not add new server dependencies here. |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Homogeneous Codex team | `TeamRun -> MixedTeamManager -> AgentRunManager(runtimeKind=CODEX_APP_SERVER) -> Codex AgentRun backend` | `TeamRun -> CodexTeamManager -> Codex AgentRun backend` | Homogeneous teams are included in mixed; no special manager. |
| Homogeneous AutoByteus team | `TeamRun -> MixedTeamManager -> AgentRunManager(runtimeKind=AUTOBYTEUS) -> AutoByteus AgentRun backend + server-composed member prompt` | `TeamRun -> AutoByteusTeamRunBackend -> native AgentTeam bootstrap` | Native team execution is no longer needed for task-plan behavior. |
| AutoByteus prompt | `Team Instruction + Agent Instruction + Runtime Instruction from MemberRunInstructionComposer` | Agent definition prompt + appended native `## Team Manifest` only | Aligns AutoByteus with Codex/Claude team semantics. |
| Restore | `metadata.memberTree -> MixedTeamRunContext(member contexts with platform ids)` | infer backend from all runtime kinds, then construct `CodexTeamRunContext`/`ClaudeTeamRunContext` | Removes runtime-homogeneity backend policy. |
| File-change projection | attach `RunFileChangeService` to every team run and filter actual events | attach only when `teamBackendKind === AUTOBYTEUS` | Mixed-only makes backend kind unsuitable for capability gating. |

## Backward-Compatibility Rejection Log

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep specialized team managers and have planner choose mixed only for new teams | Lower immediate code deletion | Rejected | Route all active create/restore through mixed and delete specialized server backends. |
| Keep specialized managers as wrappers around mixed | Safer-looking migration | Rejected | Empty wrappers preserve wrong boundary and duplicate tests. |
| Keep `resolveSingleRuntimeTeamBackendKind` returning old values for historical metadata | Restore compatibility | Rejected | Metadata stores member runtime/platform ids; restore to mixed directly. |
| Keep native AutoByteus team backend only for all-AutoByteus teams | Earlier task-plan concern | Rejected for active server execution | Task-plan subsystem removed; AutoByteus prompt/context parity moves into AgentRun backend. |
| Keep `TeamManifestInjectorProcessor` in server AutoByteus member prompt | Existing behavior | Rejected for mixed AutoByteus member runs | Server prompt composer renders team prompt/roster once from `MemberTeamContext`. |
| Keep legacy task-plan tool-name negative tests forever | Regression guard | Rejected | Positive current-tool tests and server task-delegation tests. |
| Reintroduce CLI/TUI via mixed manager | Possible UI parity idea | Rejected | CLI/TUI are removed and out of product direction. |

## Derived Layering

This design can be read as four layers, but the layering is derived from ownership rather than imposed:

1. API/use-case layer: GraphQL/API -> `TeamRunService`.
2. Team orchestration layer: `TeamRun`, `AgentTeamRunManager`, `MixedTeamManager`, mixed member registry/handles.
3. Agent runtime layer: `AgentRunManager` and runtime-specific AgentRun backends.
4. Provider/native layer: AutoByteus agent, Codex thread, Claude session.

Forbidden layer skip: API/use-case code must not directly instantiate runtime-specific team or agent provider objects; it must go through `TeamRun`/`MixedTeamManager`/`AgentRunManager` boundaries.

## Implementation / Refactor Sequence

1. Add/adjust tests around the target invariant before deleting code:
   - topology planner returns `TeamBackendKind.MIXED` for all-AutoByteus, all-Codex, all-Claude, heterogeneous, and nested definitions;
   - restore context builder returns `MixedTeamRunContext` for historical homogeneous metadata;
   - `AgentTeamRunManager` uses only mixed factory;
   - AutoByteus prompt composer includes team/member/runtime instructions and excludes self by member identity.
2. Refactor backend-kind model:
   - remove `resolveSingleRuntimeTeamBackendKind`;
   - remove specialized enum values or make them unreachable compile errors by reducing the enum to `MIXED`.
3. Refactor topology and restore:
   - `TeamDefinitionTopologyPlanner.buildPlan` always sets `TeamBackendKind.MIXED`;
   - `TeamRunMetadataMapper.buildRestoreContext` always builds mixed config/context;
   - `team-run-runtime-context-support.ts` removes specialized context construction.
4. Refactor `AgentTeamRunManager`:
   - constructor accepts only `mixedTeamRunBackendFactory`, `teamCommunicationService`, `runFileChangeService`;
   - `resolveBackendFactory` is removed;
   - `createTeamRun`/`restoreTeamRun` call mixed factory directly;
   - `registerActiveRun` attaches communication and file-change services for all team runs;
   - remove `getTeam(...)`.
5. Add AutoByteus member prompt composer:
   - compose team/agent/runtime instructions through `composeMemberRunInstructions`;
   - derive send-message/task-delegation availability from resolved tool exposure and `MemberTeamContext`;
   - set AutoByteus `AgentConfig.systemPrompt` to the composed prompt for team members;
   - do not add server-side `TeamManifestInjectorProcessor` for mixed AutoByteus members;
   - keep `initialCustomData.teamContext = buildAutoByteusStandaloneTeamContext(memberTeamContext)`.
6. Tighten AutoByteus tool exposure:
   - remove permanent legacy task-plan vocabulary where possible;
   - keep only current category/task-delegation filtering.
7. Delete specialized server team backend folders and rewrite/delete tests:
   - delete `backends/autobyteus`, `backends/codex`, `backends/claude` server team backend files;
   - convert relevant parity tests to mixed-only tests;
   - remove old backend-kind assertions.
8. Update docs:
   - server module docs state mixed-only team manager;
   - frontend/team docs no longer describe homogeneous specialized backend selection;
   - AutoByteus docs explain team prompt/context for server-managed teams is supplied by server mixed `MemberTeamContext`.
9. Run validation.

## Validation Plan

Minimum implementation-scoped checks:

- Unit/integration tests to update or add:
  - `tests/unit/agent-team-execution/team-definition-topology-planner.test.ts`
  - `tests/unit/agent-team-execution/team-run-runtime-context-support.test.ts`
  - `tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts`
  - `tests/integration/agent-team-execution/mixed-team-run-backend-factory.integration.test.ts`
  - `tests/integration/agent-team-execution/mixed-team-run-backend.integration.test.ts`
  - `tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts` or new composer test
  - `tests/unit/agent-team-execution/member-run-instruction-composer.test.ts` if composer API changes
  - `tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts`
  - `tests/integration/api/runtime-selection-top-level.integration.test.ts`
  - `tests/integration/public-surface/cli-tui-removal.test.ts` remains passing
- E2E/API coverage:
  - all-AutoByteus team launch/roundtrip through mixed;
  - all-Codex and all-Claude team launch/roundtrip through mixed;
  - nested team launch/restore;
  - mixed task delegation lifecycle.
- Source-level checks:
  - no imports of removed server team backend factories/managers;
  - no active create/restore branch for specialized team backend kinds;
  - no `src/cli/**` or CLI/TUI exports reintroduced;
  - no permanent tests/docs built around old native task-plan tool names.

## Risks And Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| AutoByteus prompt duplication if both new composer and `TeamManifestInjectorProcessor` run | Confusing instructions/roster | Do not attach `TeamManifestInjectorProcessor` for mixed AutoByteus members after composer lands. |
| Current member appears in AutoByteus roster when member name differs from agent definition name | Bad recipient guidance | Server composer uses `MemberTeamContext.memberRouteKey`/`memberName`, not `AgentConfig.name`, for self-exclusion. |
| File-change projection disappears for AutoByteus members after backend kind becomes mixed | Missing UI/API file-change data | Attach `RunFileChangeService` to all team runs and rely on event filtering. |
| Restore loses platform run ids | Broken resume | Build `MixedAgentMemberContext.platformAgentRunId` from metadata for all runtimes. |
| Specialized tests mask old architecture | False regression pressure | Rewrite tests around mixed-only invariant; delete specialized backend tests. |
| Native `autobyteus-ts/src/agent-team` package remains as non-server public API | Residual codebase complexity | Document as optional follow-up decommission; do not let it block server simplification. |

## Native `autobyteus-ts/src/agent-team` Package Decision

The server mixed-only cutover does not require deleting the entire native `autobyteus-ts/src/agent-team` package in this design. Deleting it is a valid future simplification, but it is larger than the active server architecture change because current code/tests still use package-local utilities and native-team tests.

Design stance for this ticket:

- In scope: active server execution must not instantiate native `AgentTeam`, native team manager, or native team bootstrap.
- In scope: server AutoByteus member prompt/context must not rely on native `AgentTeamContext`/state/teamManager.
- Optional/refactor if touched: move runtime-neutral communication primitives out of `autobyteus-ts/src/agent-team` into a standalone agent communication location.
- Follow-up: delete the exported native `autobyteus-ts/src/agent-team` package and migrate still-used utilities such as team-local definition-id helpers only in a later cleanup ticket. User confirmed this is not part of the current ticket.

## User Review Decisions And Remaining Questions

### User-confirmed decision

- Do not remove the full exported native `autobyteus-ts/src/agent-team/**` package surface in this ticket. Keep that as a later cleanup candidate.

### Remaining questions

1. Should implementation reduce `TeamBackendKind` to a single `MIXED` enum member now, or keep the enum shape with only `MIXED` used and delete old values in the same cleanup pass? My recommendation: reduce to single active member now.
2. User confirmed AutoByteus server-managed team prompts do not need `{{team}}` placeholder behavior; use explicit `Team Instruction` / `Runtime Instruction` sections for server-managed teams.

## Expanded DS-005: AutoByteus Member Prompt Data-Flow Spine

This is a bounded local spine inside the AutoByteus `AgentRun` backend. It starts after mixed has decided to create an AutoByteus member run, and it ends when the AutoByteus LLM receives its final processed system prompt.

```text
MixedAgentMemberHandle.buildMemberRunConfig
  -> MemberTeamContextBuilder.build
  -> AgentRunConfig(memberTeamContext, runtimeKind=AUTOBYTEUS)
  -> AgentRunManager
  -> AutoByteusAgentRunBackendFactory.buildAgentConfig
  -> resolve AgentDefinition + actual tool exposure
  -> composeMemberRunInstructions(MemberTeamContext + agent instruction + tool availability)
  -> AutoByteus member system prompt renderer
  -> AgentConfig.systemPrompt
  -> AgentConfig.initialCustomData.teamContext bridge
  -> AutoByteus SystemPromptProcessingStep
  -> final LLM system prompt
```

### DS-005 node-by-node data movement

| Step | Owner | Input Data | Transformation | Output Data |
| --- | --- | --- | --- | --- |
| 1. Build server team context | `MixedAgentMemberHandle` + `MemberTeamContextBuilder` | team run id, team definition id, current member name/path/route/run id, all member configs, parent boundary, delivery callback, task-agent identity | Resolves team name/instruction and communication roster | `MemberTeamContext` |
| 2. Carry team context into member run | `MixedAgentMemberHandle` | member config + `MemberTeamContext` | Builds `AgentRunConfig` with `runtimeKind=AUTOBYTEUS` and `memberTeamContext` | AutoByteus member `AgentRunConfig` |
| 3. Enter runtime boundary | `AgentRunManager` | `AgentRunConfig.runtimeKind` | Dispatches to AutoByteus agent-run backend factory | AutoByteus backend create/restore call |
| 4. Resolve agent/base data | `AutoByteusAgentRunBackendFactory` | `agentDefinitionId`, model/tool config, `memberTeamContext` | Fetches fresh `AgentDefinition`; resolves base agent instruction from `instructions` or `description`; resolves actual tools after mixed AutoByteus filtering | `baseAgentInstruction`, `resolvedToolNames`, tool instances |
| 5. Compose team-aware instructions | new AutoByteus prompt composer | `MemberTeamContext`, `baseAgentInstruction`, actual `send_message_to` availability, actual task-delegation tool availability | Calls `composeMemberRunInstructions(...)` | `teamInstruction`, `agentInstruction`, `runtimeInstruction` |
| 6. Render AutoByteus prompt | new AutoByteus prompt composer | instruction composition | Renders one markdown system prompt for AutoByteus' single system-prompt channel | composed `AgentConfig.systemPrompt` |
| 7. Preserve native tool data bridge | `buildAutoByteusStandaloneTeamContext(...)` | same `MemberTeamContext` | Builds native-compatible `customData.teamContext` for tools/input processing | `initialCustomData.teamContext` |
| 8. Native prompt processing | AutoByteus `SystemPromptProcessingStep` | composed system prompt + remaining processors | Runs normal non-team prompt processors such as tool/skill processors | final LLM system prompt |

### Prompt data contract

The composed AutoByteus prompt should have this conceptual shape:

```md
## Team Instruction
<team definition instructions from MemberTeamContext.teamInstruction>

## Agent Instruction
<AgentDefinition.instructions, or description fallback>

## Runtime Instruction
Current team member: <MemberTeamContext.memberName>

If you use `send_message_to`, set `recipient_name` to exactly match one allowed recipient name...

Team membership roster
...
When using send_message_to, recipient_name must exactly match one of:
- <allowed recipient>

Task delegation protocol
- Use `delegate_tasks` ...
- Use `mark_task_completed` / `mark_task_failed` ...
- Use `accept_task` ...
```

The exact text should come from `MemberRunInstructionComposer` and the existing roster manifest renderer so AutoByteus, Codex, and Claude share the same team semantics.

### Required invariants

1. **One source of team truth**: prompt roster, allowed recipient names, and tool delivery context all originate from the same server `MemberTeamContext`.
2. **Runtime choice stays below the team boundary**: the team layer only passes `runtimeKind=AUTOBYTEUS`; `AgentRunManager` chooses the AutoByteus backend.
3. **Prompt and tools agree**: send-message instructions appear only when `send_message_to` is actually exposed and delivery is configured; task-delegation instructions appear only when task-delegation tools are actually exposed.
4. **Self identity is route/member based**: self-exclusion for messageable recipients uses `MemberTeamContext.memberRouteKey` / `memberName` and `communicationRecipients`, not `AgentDefinition.name`.
5. **Native-compatible context is data, not orchestration**: `initialCustomData.teamContext` may exist for AutoByteus native tools, but it must not contain or require native `AgentTeamContext`, native team state, or native team manager.
6. **No duplicate team manifest**: mixed AutoByteus member runs should not also auto-append `TeamManifestInjectorProcessor`, because the server-composed runtime instruction already contains the authoritative roster.

### Why this replaces `TeamManifestInjectorProcessor` for server-managed AutoByteus teams

`TeamManifestInjectorProcessor` is too small for the server mixed-team contract. It only reads a native-style `communicationContext.members` list and appends/replaces a simple team manifest. It does not inject the team definition instruction, current member runtime instruction, send-message protocol, task-delegation protocol, or server parent-boundary roster semantics. Its self-exclusion also depends on `AgentConfig.name`, which can differ from the team member name.

The target keeps `TeamManifestInjectorProcessor` available for any remaining native package behavior, but server-managed mixed AutoByteus members should get their team prompt from the server composer instead. Per user decision, the server path does not need to preserve `{{team}}` placeholder replacement.
