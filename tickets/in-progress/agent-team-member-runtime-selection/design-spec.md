# Design Spec

## Current-State Read

Today the team layer is runtime-owned rather than platform-owned.

- `TeamRunService` collapses requested member runtimes to one runtime kind and rejects mixed-runtime teams.
- `AgentTeamRunManager` selects exactly one team backend factory from `TeamRunConfig.runtimeKind`.
- `TeamRunBackend` and `TeamRun` also expose the team boundary as `runtimeKind`, which reinforces the same subject confusion: the team selector currently reuses a member-execution runtime enum.
- Runtime-specific team managers (`CodexTeamManager`, `ClaudeTeamManager`, native AutoByteus team runtime) each own their own member routing logic.
- `AgentRunManager` and `AgentRunBackend` already normalize individual member execution, but the team layer does not yet use that abstraction as the one governing owner.
- Same-runtime Codex/Claude team managers currently build standalone member `AgentRunConfig`s by passing the full runtime-specific `TeamRunContext` into `AgentRunConfig.teamContext`.
- Current Codex/Claude standalone team-member bootstrap strategies are still same-runtime keyed: they apply only when `teamContext.runtimeKind` equals the runtime’s own `RuntimeKind`.
- AutoByteus native communication depends on a large live `teamContext` object. `send_message_to` calls `teamContext.teamManager.dispatchInterAgentMessageRequest(...)`, recipient sender-name resolution also looks through `teamManager`, and native team manifest injection currently reads native team config directly.
- AutoByteus standalone `AgentRun` creation supports arbitrary `initialCustomData`, but it does not yet pass team context through to standalone agent runs.
- Mixed inter-agent delivery already has a canonical request contract on the server side, but current delivery builders only preserve sender identity in metadata. All runtimes ultimately feed only `AgentInputUserMessage.content` to the model, so metadata alone is insufficient for recipient understanding.
- `AutoByteusAgentRunBackendFactory` currently instantiates every configured tool from `agentDef.toolNames`, but the tool registry already carries `ToolDefinition.category`, which gives the runtime bootstrap layer an authoritative seam for removing mixed-incompatible task-management tools before exposure.

Constraints the target design must respect:

- Existing single-runtime team managers remain available for their current paths.
- The new mixed-team path must not route through those legacy team managers.
- Mixed-team v1 is communication-only; task-plan-dependent features stay out of scope.
- AutoByteus native task-plan tools must keep working on the native team path.
- The design should reuse `AgentRunManager`/`AgentRun` rather than re-invent member execution.

## Intended Change

Introduce a new **server-owned mixed-team orchestration path** selected whenever a team run spans multiple member runtimes, and separate the team selector subject from member runtime identity.

The target design does five key things:

1. replace team-boundary `runtimeKind` with a dedicated `TeamBackendKind` that exists only at the team boundary;
2. add a runtime-neutral `MemberTeamContext` for standalone team-member bootstrap across Codex, Claude, and mixed AutoByteus members;
3. add `MixedTeamRunBackendFactory`, `MixedTeamRunBackend`, `MixedTeamManager`, and `MixedTeamRunContext` as the new mixed governing owner path;
4. centralize mixed-team `send_message_to` handling in one `InterAgentMessageRouter`; and
5. make the AutoByteus standalone runtime bootstrap owner explicitly responsible for stripping `ToolCategory.TASK_MANAGEMENT` tools from mixed members before tool exposure while injecting a communication-only team context.

The old runtime-specific team managers remain in place for current single-runtime teams, but the new mixed path never delegates through them. Same-runtime Codex/Claude teams continue to use their current team managers, but those managers stop passing raw runtime-specific `TeamRunContext` into standalone member runs. Instead they build the same runtime-neutral `MemberTeamContext` that mixed teams use.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: identify obsolete legacy paths/files included in this scope.
- Treat removal as first-class design work: when clearer subsystem ownership, reusable owned structures, or tighter file responsibilities make fragmented or duplicated pieces unnecessary, name and remove/decommission them in scope.
- Decision rule: the design is invalid if it depends on compatibility wrappers, dual-path behavior, or legacy fallback branches kept only for old behavior.

Interpretation for this ticket:

- Existing single-runtime team managers are **not** in-scope replaced behavior; they remain authoritative for their own current paths.
- In-scope replaced behavior is the current “mixed runtime is unsupported / rejected” branch, the team-boundary overloading of `RuntimeKind`, the same-runtime-only standalone member bootstrap assumptions for Codex/Claude, and the raw AutoByteus communication dependence on `teamManager`.
- The new mixed path must therefore be clean-cut and must not hide mixed routing behind runtime-specific legacy team managers.
- The current team-owned Codex/Claude standalone member bootstrap strategy files are in-scope removed/replaced because this boundary is being redesigned around a runtime-neutral member-team contract.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Team create / restore request | Active team backend with the correct `TeamBackendKind` | `TeamRunService` -> selected team backend owner | Establishes the corrected team selector subject and mixed-team activation path. |
| DS-002 | Primary End-to-End | Team member bootstrap request | Runtime-specific standalone member run with runtime-neutral team membership context | `MemberTeamContextBuilder` + runtime bootstrap owner | Governs the corrected Codex/Claude/AutoByteus member bootstrap boundary. |
| DS-003 | Primary End-to-End | Team-level targeted user message | Recipient member `AgentRun` | `MixedTeamManager` | Governs non-tool message routing to the correct member runtime. |
| DS-004 | Primary End-to-End | `send_message_to` tool invocation | Recipient member `AgentRun` plus team event publication | `InterAgentMessageRouter` under `MixedTeamManager` | This is the core mixed-runtime communication spine. |
| DS-005 | Primary End-to-End | Mixed AutoByteus member bootstrap | AutoByteus runtime with filtered tool surface and injected communication context | `AutoByteusAgentRunBackendFactory` | Governs both mixed AutoByteus communication wiring and task-tool exclusion. |
| DS-006 | Return-Event | Member runtime event | Team websocket/event consumers | `MixedTeamManager` | Preserves per-member identity and runtime in team event streams. |
| DS-007 | Bounded Local | Native AutoByteus team bootstrap | Agent-scoped native team context wrapper with communication context | native `AgentConfigurationPreparationStep` | Lets native communication move to the new communication contract without breaking native task tools. |

## Primary Execution Spine(s)

- `Create/Restore request -> TeamRunService -> resolve TeamBackendKind -> AgentTeamRunManager -> selected TeamRunBackendFactory -> MixedTeamManager or legacy single-runtime manager`
- `Standalone member activation -> team manager / mixed manager -> MemberTeamContextBuilder -> AgentRunManager -> AgentRunConfig.memberTeamContext -> runtime bootstrapper`
- `TeamRun.postMessage -> MixedTeamRunBackend -> MixedTeamManager -> ensureMemberReady -> AgentRun.postUserMessage -> runtime backend`
- `Runtime send_message_to hook -> TeamRun.deliverInterAgentMessage -> MixedTeamRunBackend -> MixedTeamManager -> InterAgentMessageRouter -> recipient AgentRun.postUserMessage -> runtime backend`
- `Mixed AutoByteus AgentRun create/restore -> AutoByteusAgentRunBackendFactory -> resolve mixed tool exposure -> inject communication context -> AutoByteus runtime`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Team creation/restore reaches `TeamRunService`, which now resolves a dedicated `TeamBackendKind`. `AgentTeamRunManager` resolves the selected team backend factory, which constructs either the new mixed backend path or an existing single-runtime team backend. | `TeamRunService`, `AgentTeamRunManager`, backend factory, team backend owner | selected team backend owner after construction | team-backend-kind resolution, restore context building, metadata projection |
| DS-002 | Whenever a team manager needs a standalone member run, it first builds a runtime-neutral `MemberTeamContext` for that member. The runtime bootstrapper then uses that member-team contract to produce teammate instructions, allowed-recipient lists, and runtime-local `send_message_to` wiring. | team manager, `MemberTeamContextBuilder`, `AgentRunManager`, runtime bootstrapper | runtime bootstrapper for runtime-local shaping; team manager for lifecycle | teammate list shaping, allowed-recipient derivation |
| DS-003 | A team-level targeted user message reaches `MixedTeamManager`, which resolves the target member, ensures its `AgentRun` exists, and forwards the `AgentInputUserMessage` through the shared run boundary. | `TeamRun`, `MixedTeamRunBackend`, `MixedTeamManager`, `AgentRun` | `MixedTeamManager` | member registry, active-run caching, event binding |
| DS-004 | A runtime-specific `send_message_to` hook builds a canonical delivery request and passes it to the team boundary. `InterAgentMessageRouter` resolves sender/recipient identities, formats recipient-visible content, delivers through the recipient `AgentRun`, and publishes a normalized team event. | runtime tool hook, `TeamRun`, `MixedTeamManager`, `InterAgentMessageRouter`, `AgentRun` | `InterAgentMessageRouter` for delivery semantics, `MixedTeamManager` for lifecycle and event publication | approval gating, canonical message formatter, sender identity mapping |
| DS-005 | During mixed AutoByteus member creation/restore, the runtime backend factory filters out task-management tools, translates the runtime-neutral `MemberTeamContext` into an AutoByteus communication context, injects it via `initialCustomData`, and ensures teammate guidance is available through manifest injection. | `AutoByteusAgentRunBackendFactory`, mixed tool exposure policy, AutoByteus agent config, injected `communicationContext` | `AutoByteusAgentRunBackendFactory` | custom-data builder, tool filter, manifest processor presence |
| DS-006 | Runtime-specific member events are converted into `AgentRunEvent`, rebound by `MixedTeamManager` with member/runtime identity, then emitted as `TeamRunEvent` to existing stream infrastructure. | `AgentRun`, `MixedTeamManager`, `TeamRunEvent`, stream handler | `MixedTeamManager` | event conversion reuse, team status derivation |
| DS-007 | Native AutoByteus team bootstrap creates a per-agent wrapper over the shared native team context and attaches a communication subcontext so communication consumers use one smaller contract while native task tools still see the native context surface. | `AgentConfigurationPreparationStep`, scoped native team context wrapper, communication-context helpers | native AutoByteus bootstrap step | raw native task-plan access stays available only on native path |

## Spine Actors / Main-Line Nodes

- `TeamRunService`
- `AgentTeamRunManager`
- `TeamBackendKind`
- `MixedTeamRunBackendFactory`
- `MixedTeamRunBackend`
- `MixedTeamManager`
- `MemberTeamContextBuilder`
- `InterAgentMessageRouter`
- `AgentRunManager`
- `AgentRun`
- `AutoByteusAgentRunBackendFactory`
- runtime-specific team-member communication/bootstrap owners for Codex and Claude
- AutoByteus communication consumers (`SendMessageTo`, manifest injector, inter-agent receive handler)

## Ownership Map

- `TeamRunService`
  - Owns team-run request normalization, team-backend-kind resolution, metadata persistence, and restore-context assembly.
  - Thin orchestration boundary; it must not own mixed member lifecycle.
- `AgentTeamRunManager`
  - Owns team-backend-factory selection and active team-run registry.
  - Thin registry/facade; it must not own mixed routing semantics.
- `TeamBackendKind`
  - Owns the team-orchestration selector subject only.
  - It must not be used as a member runtime enum.
- `MixedTeamRunBackendFactory`
  - Owns construction of `MixedTeamRunContext`, member contexts, and the governing `MixedTeamManager` instance.
- `MixedTeamManager`
  - Governing owner for active mixed-team lifecycle, member-run caching, targeted message routing, approval routing, interrupt/terminate, event fan-in, and publication of member-tagged team events.
- `MemberTeamContextBuilder`
  - Governing owner for the runtime-neutral standalone member-team bootstrap contract.
  - It translates team-level membership state into the per-member bootstrap shape used by runtimes.
- `InterAgentMessageRouter`
  - Governing owner for canonical inter-agent message delivery semantics: sender resolution, recipient resolution, content formatting, recipient delivery, and post-delivery event emission.
- `AgentRunManager`
  - Governing owner for individual member run creation/restore/termination across runtimes.
- runtime-specific team-member communication/bootstrap owners for Codex and Claude
  - Own runtime-local teammate instructions, allowed-recipient derivation, and runtime-local `send_message_to` exposure over the shared `MemberTeamContext`.
- `AutoByteusAgentRunBackendFactory`
  - Governing owner for how standalone AutoByteus runs receive filtered tools, runtime config, and initial custom data.
- AutoByteus communication consumers
  - Own only local tool/handler behavior; they must not own cross-team routing or raw native team-manager semantics.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TeamRunService` | selected team backend owner | API/service entrypoint, persistence and restore boundary | member-run lifecycle or inter-agent routing semantics |
| `AgentTeamRunManager` | selected team backend / manager | active team-run registry and backend factory selection | mixed-team routing logic |
| `TeamRun` | `TeamRunBackend` / `MixedTeamManager` | stable public team-run surface | hidden mixed-team orchestration decisions |
| `AgentRun` | `AgentRunBackend` | stable runtime-neutral member surface | team membership or cross-member routing |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Team-boundary reuse of `RuntimeKind` (`TeamRunConfig.runtimeKind`, `TeamRunContext.runtimeKind`, `TeamRunBackend.runtimeKind`, `TeamRun.runtimeKind`) | Team orchestration selector is a different subject from member runtime | `TeamBackendKind` plus `teamBackendKind` fields at the team boundary | In This Change | Clean subject split required by DAR-001 |
| `TeamRunService.resolveTeamRuntimeKind(...)` mixed-runtime rejection branch | Mixed runtime becomes an explicit supported backend path instead of an error case | `resolveTeamBackendKind(...)` returning `TeamBackendKind.MIXED_MEMBER_RUNS` | In This Change | The mixed-runtime rejection branch is removed |
| Same-runtime-only Codex/Claude standalone member bootstrap strategy files under `agent-team-execution/backends/*` | Member bootstrap is a runtime-backend concern, not a team-backend concern, and it must work for mixed teams too | runtime-owned `MemberTeamContext` consumers under `agent-execution/backends/codex` and `agent-execution/backends/claude` | In This Change | Clean ownership correction required by DAR-002 |
| Direct AutoByteus communication dependence on raw `teamContext.teamManager` inside communication consumers | Mixed and native communication should share one smaller contract | `communicationContext` contract in `autobyteus-ts` | In This Change | Task-plan tools are not moved; only communication consumers change |
| Mixed AutoByteus task-management tool exposure | Mixed v1 must be communication-only | `AutoByteusAgentRunBackendFactory` + mixed tool exposure policy helper | In This Change | Clean runtime bootstrap enforcement required by DAR-003 |
| Duplicated runtime-specific inter-agent routing inside single-runtime Codex/Claude managers | Once/if single-runtime team paths are later migrated, the shared router can become reusable | shared `InterAgentMessageRouter` | Follow-up | Not required for mixed v1 |

## Return Or Event Spine(s) (If Applicable)

`Runtime event -> AgentRunEvent converter -> MixedTeamManager member binding -> TeamRunEvent -> AgentTeamStreamHandler -> websocket/history consumers`

## Bounded Local / Internal Spines (If Applicable)

- `MixedTeamManager`
  - `target member lookup -> active-run cache check -> create/restore through AgentRunManager -> bind member events -> publish team status`
  - Matters because member activation and event fan-in are local orchestration loops that must stay encapsulated.
- `MemberTeamContextBuilder`
  - `team membership state -> self member resolution -> teammate list -> allowed-recipient derivation`
  - Matters because the corrected runtime-neutral member bootstrap contract must stay singular.
- `InterAgentMessageRouter`
  - `validate request -> resolve sender/recipient -> build canonical content -> deliver -> publish recipient event`
  - Matters because `send_message_to` is the core shared communication loop and must stay singular.
- `AutoByteusAgentRunBackendFactory`
  - `agent definition -> mixed tool filter -> instantiate allowed tools -> inject communication context -> ensure manifest processor`
  - Matters because mixed AutoByteus communication and task-tool stripping must stay with the runtime bootstrap owner.
- native AutoByteus bootstrap step
  - `copy agent config -> build scoped native team wrapper -> inject communicationContext`
  - Matters because native communication and native task-plan tools must diverge cleanly at injection time.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `TeamBackendKind` resolution | DS-001 | `TeamRunService` | Decide which team backend governs the run | Needed before team manager construction | If pushed into managers, create/restore logic fragments |
| `MemberTeamContext` building | DS-002 | `MemberTeamContextBuilder` | Convert team membership state into runtime-neutral per-member bootstrap context | Needed for Codex/Claude/AutoByteus standalone members | If spread across managers/runtimes, teammate/recipient logic drifts |
| canonical inter-agent message formatting | DS-004 | `InterAgentMessageRouter` | Build recipient-visible content plus metadata | Needed because runtimes only pass content to the model | If left to runtime edges, sender identity becomes inconsistent |
| AutoByteus mixed tool exposure policy | DS-005 | `AutoByteusAgentRunBackendFactory` | Remove `ToolCategory.TASK_MANAGEMENT` tools before exposure on mixed runs | Needed to keep mixed v1 communication-only | If omitted or duplicated, mixed AutoByteus surfaces become inconsistent |
| AutoByteus custom-data injection | DS-005 | `AutoByteusAgentRunBackendFactory` | Translate `MemberTeamContext` into runtime custom data | Needed only for AutoByteus standalone runtime integration | If owned by mixed manager, runtime bootstrapping leaks upward |
| AutoByteus communication-context resolution | DS-005, DS-007 | AutoByteus communication consumers | Resolve smaller communication contract from `context.customData.teamContext` | Needed for native and mixed parity | If each consumer hand-rolls extraction, the contract drifts |
| restore runtime-context reconstruction | DS-001 | `TeamRunService` | Rebuild mixed or single-runtime team contexts from metadata | Needed so restored communication uses true per-member runtimes | If omitted, restore collapses back to one runtime |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| per-member runtime execution | `agent-execution` / `AgentRunManager` / `AgentRun` | Reuse | Already owns multi-runtime member execution lifecycle | N/A |
| team backend selection | `agent-team-execution/services/agent-team-run-manager.ts` | Extend | Existing authoritative selector for team backends | N/A |
| team-run create/restore persistence | `TeamRunService` | Extend | Already owns create/restore metadata flow | N/A |
| canonical inter-agent delivery request type | `domain/inter-agent-message-delivery.ts` | Reuse | Existing request contract already matches the needed shape | N/A |
| standalone member bootstrap team contract | raw `TeamRunContext` passed through `AgentRunConfig` | Create New | Raw team context is the wrong subject for member bootstrap | It mixes team-governing state with per-member bootstrap needs |
| mixed-team member orchestration | existing runtime-specific team managers | Create New | Existing managers are runtime-owned and not suitable as a mixed governing owner | They assume one runtime/backend per team |
| AutoByteus communication context contract | raw native `AgentTeamContext` | Create New | Native context is too large and task-plan-coupled | Mixed path only needs communication concerns |
| AutoByteus mixed tool suppression | existing tool registry only | Extend runtime bootstrap | Registry knows categories, but runtime bootstrap owns actual exposure | A pure registry-only change would not know team mode |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-team-execution/domain` | team backend selector, mixed team context, runtime-neutral member-team bootstrap contract | DS-001, DS-002 | `TeamRunService`, `MixedTeamManager`, same-runtime team managers | Extend | Add `TeamBackendKind` and `MemberTeamContext` |
| `agent-team-execution/backends/mixed` | mixed team backend factory/backend/manager | DS-001, DS-003, DS-004, DS-006 | `MixedTeamManager` | Create New | New authoritative mixed-team subsystem |
| `agent-team-execution/services` | shared `MemberTeamContext` builder, shared inter-agent router, canonical message formatter, restore support | DS-002, DS-004, DS-006, DS-001 | `MixedTeamManager`, same-runtime team managers, `TeamRunService` | Extend | Shared ownership belongs here rather than in runtime backends |
| `agent-execution/backends/codex` | Codex runtime-owned team-member bootstrap and `send_message_to` exposure over `MemberTeamContext` | DS-002, DS-004 | Codex runtime bootstrapper | Extend | Explicit DAR-002 ownership fix |
| `agent-execution/backends/claude` | Claude runtime-owned team-member bootstrap and `send_message_to` exposure over `MemberTeamContext` | DS-002, DS-004 | Claude runtime bootstrapper | Extend | Explicit DAR-002 ownership fix |
| `agent-execution/backends/autobyteus` | standalone AutoByteus runtime bootstrapping, mixed tool filtering, communication-context injection | DS-005 | `AutoByteusAgentRunBackendFactory` | Extend | Explicit DAR-003 ownership fix |
| `autobyteus-ts/src/agent-team/context` | communication context contract and native scoped wrapper | DS-005, DS-007 | AutoByteus communication consumers | Extend / Create New | Separates communication-facing context from native task-plan-heavy context |
| `autobyteus-ts` communication consumers | `send_message_to`, sender display resolution, manifest injection | DS-004, DS-005, DS-007 | AutoByteus runtime | Extend | Move to the smaller communication contract |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-team-execution/domain/team-backend-kind.ts` | team boundary domain | selector type owner | Team-only orchestration/backend selector | Keeps team selector subject singular | N/A |
| `agent-team-execution/domain/member-team-context.ts` | team boundary domain | shared bootstrap contract | Runtime-neutral per-member team membership context | One shared member bootstrap subject | Yes |
| `agent-team-execution/backends/mixed/mixed-team-run-context.ts` | mixed team backend | context/data owner | Mixed member runtime context for active mixed team runs | Keeps mixed team-specific active runtime context together | Yes |
| `agent-team-execution/backends/mixed/mixed-team-manager.ts` | mixed team backend | governing owner | Mixed member lifecycle, targeted routing, approvals, event fan-in | One owner for active mixed team state | Yes |
| `agent-team-execution/backends/mixed/mixed-team-run-backend.ts` | mixed team backend | public backend boundary | `TeamRunBackend` adapter over `MixedTeamManager` | Thin boundary only | Yes |
| `agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts` | mixed team backend | construction owner | Build mixed team context and manager | One construction point for mixed team runs | Yes |
| `agent-team-execution/services/member-team-context-builder.ts` | team orchestration services | shared builder | Build `MemberTeamContext` from team membership state | Keeps per-member bootstrap contract singular | Yes |
| `agent-team-execution/services/inter-agent-message-router.ts` | team orchestration services | governing service | Canonical inter-agent delivery behavior | Keeps `send_message_to` semantics singular | Yes |
| `agent-team-execution/services/inter-agent-message-runtime-builders.ts` | team orchestration services | builder/helper | Canonical recipient content + metadata/event builders | Shared delivery formatting | Yes |
| `agent-team-execution/services/team-run-runtime-context-support.ts` | team orchestration services | restore helper | Restore mixed team runtime contexts from metadata | Centralized restore reconstruction | Yes |
| `agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.ts` | Codex runtime backend | runtime bootstrap owner | Codex teammate instructions + allowed recipients + dynamic `send_message_to` wiring from `MemberTeamContext` | Runtime-specific bootstrap concern belongs with Codex runtime | Yes |
| `agent-execution/backends/claude/team-communication/team-member-claude-session-bootstrap-strategy.ts` | Claude runtime backend | runtime bootstrap owner | Claude teammate instructions + allowed recipients + MCP `send_message_to` wiring from `MemberTeamContext` | Runtime-specific bootstrap concern belongs with Claude runtime | Yes |
| `agent-execution/backends/autobyteus/autobyteus-mixed-tool-exposure.ts` | AutoByteus runtime backend | runtime tool policy owner | Filter mixed-incompatible AutoByteus tools before instantiation | Keeps DAR-003 policy singular | Yes |
| `agent-execution/backends/autobyteus/autobyteus-team-communication-context-builder.ts` | AutoByteus runtime backend | runtime adapter | Build injected AutoByteus communication context from `MemberTeamContext` | Runtime-specific custom-data translation belongs with the runtime backend | Yes |
| `agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | AutoByteus runtime backend | governing runtime bootstrap owner | Apply mixed tool filter, inject custom communication context, ensure manifest processor presence | One owner for AutoByteus standalone runtime config | Yes |
| `autobyteus-ts/src/agent-team/context/team-communication-context.ts` | AutoByteus communication context | contract owner | Shared communication-context types and resolution helpers | Keeps communication contract singular | Yes |
| `autobyteus-ts/src/agent-team/context/create-scoped-native-team-context.ts` | AutoByteus communication context | native injection helper | Create member-scoped native wrapper carrying `communicationContext` | Keeps native task-plan compatibility outside consumers | Yes |
| `autobyteus-ts/src/agent/message/send-message-to.ts` | AutoByteus communication consumer | tool boundary | Send via `communicationContext` | Tool should only know the communication contract | Yes |
| `autobyteus-ts/src/agent/handlers/inter-agent-message-event-handler.ts` | AutoByteus communication consumer | recipient handler | Resolve sender name via `communicationContext` | Keeps inbound name resolution aligned | Yes |
| `autobyteus-ts/src/agent-team/system-prompt-processor/team-manifest-injector-processor.ts` | AutoByteus communication consumer | prompt processor | Read teammates from `communicationContext` | Gives mixed AutoByteus members teammate guidance | Yes |
| `autobyteus-ts/src/agent-team/bootstrap-steps/agent-configuration-preparation-step.ts` | native AutoByteus bootstrap | injection step | Inject scoped native team context wrapper | One injection point after config copy | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| team backend selector | `agent-team-execution/domain/team-backend-kind.ts` | team boundary domain | Shared by config, context, service, backend, and manager selection | Yes | Yes | a runtime-management enum |
| runtime-neutral member-team bootstrap context | `agent-team-execution/domain/member-team-context.ts` | team boundary domain | Shared by mixed manager, same-runtime team managers, and runtime bootstrappers | Yes | Yes | a dump of full team-manager internals |
| communication-facing teammate/member descriptor | `autobyteus-ts/src/agent-team/context/team-communication-context.ts` | AutoByteus communication context | Shared by send-message, manifest injection, mixed context builders | Yes | Yes | a dump of full native team state |
| mixed team member runtime context | `agent-team-execution/backends/mixed/mixed-team-run-context.ts` | mixed team backend | Shared by manager, factory, restore, sender resolution | Yes | Yes | runtime-specific thread/session subclasses |
| canonical recipient message formatter | `agent-team-execution/services/inter-agent-message-runtime-builders.ts` | team orchestration services | Shared by all mixed-runtime deliveries | Yes | Yes | runtime-specific prompt formatter branches |
| AutoByteus mixed tool exposure policy | `agent-execution/backends/autobyteus/autobyteus-mixed-tool-exposure.ts` | AutoByteus runtime backend | Shared by create/restore runtime bootstrap paths | Yes | Yes | ad-hoc inline filters in factory methods |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamBackendKind` | Yes | Yes | Low | Keep it team-boundary-only; never treat it as a member runtime |
| `MemberTeamContext` | Yes | Yes | Low | Keep it limited to per-member bootstrap needs |
| `MixedTeamMemberContext` | Yes | Yes | Low | Keep one generic `platformAgentRunId` instead of runtime-specific duplicates in the mixed path |
| AutoByteus `communicationContext` | Yes | Yes | Medium | Keep it communication-only; do not let task-plan/state fields leak into it |
| canonical inter-agent delivery request | Yes | Yes | Low | Reuse existing request contract; add no extra sender aliases |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-backend-kind.ts` | team boundary domain | selector type owner | `TeamBackendKind` enum/helpers | One authoritative team selector source | N/A |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-config.ts` | team boundary domain | config owner | Replace top-level team `runtimeKind` with `teamBackendKind` while keeping per-member `runtimeKind` | Keeps team/member subject split explicit | Yes |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run-context.ts` | team boundary domain | active team context owner | Replace team `runtimeKind` with `teamBackendKind` and admit mixed runtime context | One authoritative active team context | Yes |
| `autobyteus-server-ts/src/agent-team-execution/domain/member-team-context.ts` | team boundary domain | shared bootstrap contract | `MemberTeamContext` and member descriptor helpers | One runtime-neutral member bootstrap contract | Yes |
| `autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend.ts` | team backend boundary | public backend contract | Replace backend-level `runtimeKind` with `teamBackendKind` | Keeps team selector subject correct at the backend boundary | Yes |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts` | team backend boundary | public run wrapper | Expose `teamBackendKind` and keep team-level routing surface stable | Keeps public team surface aligned with corrected subject | Yes |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-context.ts` | mixed team backend | data owner | `MixedTeamRunContext` and `MixedTeamMemberContext` | One mixed-path context definition | Yes |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | mixed team backend | governing owner | Active mixed-team lifecycle, member-run cache, targeted routing, event fan-in | One governing owner for active mixed teams | Yes |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend.ts` | mixed team backend | backend boundary | `TeamRunBackend` implementation delegating to `MixedTeamManager` | Keeps public backend thin | Yes |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts` | mixed team backend | construction owner | Build mixed team contexts from config/restore inputs | Centralized mixed-team construction | Yes |
| `autobyteus-server-ts/src/agent-team-execution/services/member-team-context-builder.ts` | team orchestration services | shared builder | Build `MemberTeamContext` from active team membership state | One shared standalone member bootstrap builder | Yes |
| `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-router.ts` | team orchestration services | delivery owner | Canonical mixed inter-agent routing | One place for `send_message_to` semantics | Yes |
| `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-runtime-builders.ts` | team orchestration services | builder/helper | Canonical model-visible content + metadata/event builders | Shared formatting/building logic | Yes |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-runtime-context-support.ts` | team orchestration services | restore helper | Add mixed restore context reconstruction and team-backend-kind resolution support | Centralized restore support | Yes |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | team orchestration services | entry/service owner | Resolve team backend kind, preserve member runtimes, restore mixed contexts | Existing authoritative create/restore entrypoint | Yes |
| `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | team orchestration services | registry/factory selector | Register mixed backend factory and route team runs by `TeamBackendKind` | Existing authoritative selector | Yes |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-config.ts` | member execution domain | config owner | Replace raw team run context field with `memberTeamContext` | Keeps standalone member bootstrap subject explicit | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.ts` | Codex runtime backend | runtime bootstrap owner | Codex member-team bootstrap over `MemberTeamContext` | Explicit DAR-002 ownership | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Codex runtime backend | bootstrap coordinator | Use runtime-owned team-member bootstrap strategy | Existing Codex bootstrap entrypoint | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/team-member-claude-session-bootstrap-strategy.ts` | Claude runtime backend | runtime bootstrap owner | Claude member-team bootstrap over `MemberTeamContext` | Explicit DAR-002 ownership | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-context.ts` | Claude runtime backend | runtime context owner | Replace runtime-specific `teamContext` typing with runtime-neutral `memberTeamContext` | Removes same-runtime team ownership assumption | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts` | Claude runtime backend | bootstrap coordinator | Use runtime-owned member-team bootstrap strategy | Existing Claude bootstrap entrypoint | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/*` | Claude runtime backend | runtime communication owner | Claude MCP server builder, send-message tool definition, and call handler over `MemberTeamContext` | Runtime-local communication surface belongs with Claude runtime | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-mixed-tool-exposure.ts` | AutoByteus runtime backend | runtime tool policy owner | Filter `ToolCategory.TASK_MANAGEMENT` for mixed runs before tool creation | Explicit DAR-003 ownership | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-team-communication-context-builder.ts` | AutoByteus runtime backend | runtime adapter | Build injected mixed AutoByteus communication context | Runtime-specific translation helper | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | AutoByteus runtime backend | runtime bootstrap owner | Apply mixed tool filter, inject communication context, ensure `TeamManifestInjectorProcessor` | One runtime-config owner | Yes |
| `autobyteus-ts/src/agent-team/context/team-communication-context.ts` | AutoByteus communication context | shared contract | Types + helpers for `communicationContext` | Singular communication contract | Yes |
| `autobyteus-ts/src/agent-team/context/create-scoped-native-team-context.ts` | AutoByteus communication context | native wrapper builder | Per-agent wrapper over native `AgentTeamContext` with attached `communicationContext` | Keeps native task tools working while scoping communication | Yes |
| `autobyteus-ts/src/agent-team/bootstrap-steps/agent-configuration-preparation-step.ts` | native AutoByteus bootstrap | injection boundary | Use scoped native wrapper instead of raw shared context injection | One post-copy injection point | Yes |
| `autobyteus-ts/src/agent/message/send-message-to.ts` | AutoByteus communication consumer | tool boundary | Send through `communicationContext.dispatchInterAgentMessageRequest(...)` | Removes raw team-manager ownership from tool | Yes |
| `autobyteus-ts/src/agent/handlers/inter-agent-message-event-handler.ts` | AutoByteus communication consumer | inbound handler | Resolve sender display via `communicationContext.resolveMemberNameByAgentId(...)` | Keeps inbound naming consistent | Yes |
| `autobyteus-ts/src/agent-team/system-prompt-processor/team-manifest-injector-processor.ts` | AutoByteus communication consumer | prompt processor | Render teammates from `communicationContext.members` | Makes mixed AutoByteus teammate guidance possible | Yes |

## Ownership Boundaries

- `TeamRunService` is the authoritative create/restore boundary. It may decide **which** `TeamBackendKind` applies, but after that it must hand lifecycle/routing authority to the selected team backend owner.
- `MixedTeamManager` is the authoritative mixed-team owner. Upstream callers may target team-level operations only through `TeamRun` / `MixedTeamRunBackend`; they must not reach into member-run caches directly.
- `MemberTeamContextBuilder` is the authoritative per-member bootstrap-context owner. Team managers and runtime bootstrappers must not hand-roll teammate lists or recipient lists independently.
- `InterAgentMessageRouter` encapsulates mixed `send_message_to` semantics. Neither runtime tool hooks nor `MixedTeamManager` callers may duplicate sender/recipient/content-formatting logic.
- `AgentRunManager` remains the authoritative owner for individual runtime runs. Team managers may ask for create/restore/terminate, but may not reach around it into runtime backends.
- runtime-specific team-member communication/bootstrap files for Codex and Claude encapsulate runtime-local exposure mechanics only. They must not own cross-runtime routing or active team lifecycle.
- `AutoByteusAgentRunBackendFactory` encapsulates how `MemberTeamContext` becomes filtered AutoByteus tools plus AutoByteus runtime custom data. Team orchestration code must not hand-craft AutoByteus runtime-state objects.
- AutoByteus communication consumers may use only the `communicationContext` contract. They must not reach back into raw native team-manager ownership for communication behavior.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TeamRunService` | team-backend-kind resolution, restore-context assembly, metadata writes | API/service callers | constructing mixed backend contexts directly from transport layers | extending the service-level create/restore helpers |
| `MixedTeamManager` | member-run cache, member event binding, active mixed-team state | `MixedTeamRunBackend` only | direct caller access to `AgentRunManager` for team member routing | adding explicit manager methods |
| `MemberTeamContextBuilder` | self-member resolution, teammate list construction, allowed-recipient derivation | same-runtime team managers, `MixedTeamManager` | runtime bootstrappers deriving their own teammate lists from unrelated raw team state | extending the shared member-team context shape |
| `InterAgentMessageRouter` | canonical inter-agent validation, formatting, recipient delivery, event build | `MixedTeamManager` only | runtime tool hooks formatting or delivering directly to recipient runs | extending the router request/result shape |
| `AgentRunManager` | runtime backend resolution and active member-run registry | team managers | managers instantiating runtime backends directly | extending `AgentRunManager` |
| `AutoByteusAgentRunBackendFactory` | mixed tool exposure policy, injected custom data, system prompt processor wiring | `AgentRunManager` / team orchestration via `AgentRunConfig` only | mixed manager mutating AutoByteus runtime state directly | adding a runtime-specific context builder/helper |
| AutoByteus `communicationContext` contract | dispatch and sender-name resolution helper surface | AutoByteus communication consumers | direct raw `teamManager` usage in send-message or manifest injection | extending the shared communication contract |

## Dependency Rules

- `TeamRunService` may depend on `AgentTeamRunManager`, metadata services, and restore context builders.
- `AgentTeamRunManager` may depend on backend factories only.
- `MixedTeamRunBackend` may depend only on `MixedTeamManager`.
- `MixedTeamManager` may depend on `AgentRunManager`, `MemberTeamContextBuilder`, `InterAgentMessageRouter`, and shared team event/build helpers.
- `MemberTeamContextBuilder` may depend on team-domain types and member identity helpers only; it may not depend on runtime-specific team managers.
- `InterAgentMessageRouter` may depend on shared message builders and recipient `AgentRun` resolution supplied by `MixedTeamManager`; it may not depend on runtime-specific team managers.
- Runtime tool hooks (Codex, Claude, AutoByteus) may emit canonical delivery requests to the team boundary; they may not target recipient runs directly.
- `AutoByteusAgentRunBackendFactory` may depend on team orchestration helpers only through `MemberTeamContext` data and a resolver-based delivery handler; it may not depend on `MixedTeamManager` internals.
- AutoByteus communication consumers may depend only on `communicationContext` helpers; they may not depend on raw native team-manager methods for communication.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TeamRunService.createTeamRun(input)` | team creation | choose `TeamBackendKind`, build config, persist metadata | `teamDefinitionId` + `memberConfigs[]` | Frontend does not need to send `TeamBackendKind` in v1 |
| `TeamRunService.restoreTeamRun(teamRunId)` | team restore | rebuild correct team context from metadata | `teamRunId` | Must restore mixed contexts without runtime collapse |
| `MemberTeamContextBuilder.build(...)` | standalone member bootstrap | derive self identity, teammate list, and allowed recipients | `teamRunId` + target member identity + active team membership state | One runtime-neutral contract for Codex/Claude/AutoByteus standalone members |
| `MixedTeamManager.postMessage(message, targetMemberName)` | targeted user routing | deliver team-level user input to one member | `memberName` | No implicit runtime-specific routing |
| `MixedTeamManager.deliverInterAgentMessage(request)` | inter-agent delivery | hand canonical request to router and publish result event | `senderRunId` + `recipientMemberName` + `teamRunId` | Sender/recipient identity is explicit |
| `InterAgentMessageRouter.deliver(request, recipientRun)` | inter-agent delivery semantics | build canonical content, deliver, return result | canonical `InterAgentMessageDeliveryRequest` + resolved recipient run/member context | Single mixed send-message owner |
| `communicationContext.dispatchInterAgentMessageRequest(event)` | AutoByteus runtime communication | outbound send-message dispatch | `InterAgentMessageRequestEvent` | Same contract for native and mixed AutoByteus communication |
| `communicationContext.resolveMemberNameByAgentId(agentId)` | AutoByteus runtime communication | sender-name lookup | `agentId` / `memberRunId` | Needed only for communication consumers |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamRunService.createTeamRun` | Yes | Yes | Low | Keep team-backend-kind resolution inside the service |
| `MemberTeamContextBuilder.build` | Yes | Yes | Low | Keep per-member bootstrap context singular and runtime-neutral |
| `MixedTeamManager.deliverInterAgentMessage` | Yes | Yes | Low | Require explicit sender/recipient names/ids in the request |
| `InterAgentMessageRouter.deliver` | Yes | Yes | Low | Do not accept implicit sender or recipient defaults |
| AutoByteus `communicationContext` | Yes | Yes | Medium | Keep it communication-only and avoid task-plan fields |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| team-orchestration selector | `TeamBackendKind` | Yes | Low | Keep it team-boundary-only |
| mixed team orchestration owner | `MixedTeamManager` | Yes | Low | Keep “manager” only because it truly governs lifecycle |
| runtime-neutral standalone member contract | `MemberTeamContext` | Yes | Low | Keep it distinct from `TeamRunContext` |
| mixed team team-run backend | `MixedTeamRunBackend` | Yes | Low | Keep backend thin |
| AutoByteus communication contract | `communicationContext` | Yes | Medium | Document clearly that it is communication-only |

## Applied Patterns (If Any)

- **Separate team selector subject from member runtime subject**
  - Lives in `TeamBackendKind` vs `RuntimeKind`.
  - Solves DAR-001 cleanly.
- **Runtime-neutral member bootstrap contract**
  - Lives in `MemberTeamContext` plus `MemberTeamContextBuilder`.
  - Solves DAR-002 cleanly.
- **Runtime-neutral member execution + higher-level orchestration**
  - Lives in `AgentRunManager`/`AgentRun` plus `MixedTeamManager`.
  - Solves multi-runtime membership without pairwise runtime manager coupling.
- **Canonical request + router owner**
  - Lives in `InterAgentMessageDeliveryRequest` + `InterAgentMessageRouter`.
  - Solves `send_message_to` unification.
- **Runtime bootstrap policy owner**
  - Lives in `AutoByteusAgentRunBackendFactory` + `autobyteus-mixed-tool-exposure.ts`.
  - Solves DAR-003 cleanly.
- **Scoped context injection**
  - Lives in native AutoByteus bootstrap and AutoByteus standalone runtime bootstrap.
  - Solves per-agent communication context without exposing full team runtime ownership everywhere.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-backend-kind.ts` | File | team boundary domain | team-only selector | Correct subject owner for DAR-001 | runtime-management policy |
| `autobyteus-server-ts/src/agent-team-execution/domain/member-team-context.ts` | File | team boundary domain | shared standalone member bootstrap contract | One shared team-member bootstrap subject | active team-manager lifecycle |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/` | Folder | mixed team backend subsystem | Mixed team backend construction, context, manager, backend boundary | New mixed orchestration deserves a dedicated readable folder | runtime-specific member backend code |
| `autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/` | Folder | Codex runtime backend | Codex team-member bootstrap and send-message exposure over `MemberTeamContext` | DAR-002 ownership belongs with Codex runtime | mixed-team lifecycle |
| `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/` | Folder | Claude runtime backend | Claude team-member bootstrap and send-message exposure over `MemberTeamContext` | DAR-002 ownership belongs with Claude runtime | mixed-team lifecycle |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/` | Folder | AutoByteus runtime backend | mixed tool policy + communication-context injection | DAR-003 ownership belongs with AutoByteus runtime bootstrap | mixed-team lifecycle |
| `autobyteus-ts/src/agent-team/context/` | Folder | AutoByteus communication-context subsystem | Communication context types and native scoped wrapper | Keeps smaller contract near native team context code | runtime-specific server orchestration code |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-runtime-context-support.ts` | File | team restore helper | Team-backend-kind and mixed-runtime restore reconstruction | Existing restore-support area already owns reconstruction helpers | active mixed-team manager logic |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-team-execution/backends/mixed/` | Main-Line Domain-Control | Yes | Low | This is the new main mixed-team owner cluster |
| `agent-team-execution/services/` | Off-Spine Concern | Yes | Medium | Keep only shared builder/router/restore helpers here; do not move manager lifecycle here |
| `agent-execution/backends/codex/team-communication/` | Runtime-Local Control | Yes | Low | Team-member bootstrap and runtime-local tool exposure are Codex runtime concerns |
| `agent-execution/backends/claude/team-communication/` | Runtime-Local Control | Yes | Low | Team-member bootstrap and runtime-local tool exposure are Claude runtime concerns |
| `agent-execution/backends/autobyteus/` | Runtime-Local Control | Yes | Low | Runtime bootstrap, tool filtering, and custom-data injection stay near AutoByteus backend |
| `autobyteus-ts/src/agent-team/context/` | Off-Spine Concern | Yes | Low | Communication context contract is a contextual support concern |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Team selector subject split | `TeamRunConfig { teamBackendKind: TeamBackendKind.MIXED_MEMBER_RUNS, memberConfigs: [{ runtimeKind: RuntimeKind.CODEX_APP_SERVER }, { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK }] }` | `TeamRunConfig.runtimeKind = RuntimeKind.MIXED_TEAM` | Shows the team selector stays separate from member runtime identity |
| Runtime-neutral member bootstrap | `CodexThreadBootstrapper -> MemberTeamContext -> teammates + allowedRecipientNames -> dynamic send_message_to tool` | `Codex bootstrap applies only when teamContext.runtimeKind === RuntimeKind.CODEX_APP_SERVER` | Shows the corrected DAR-002 boundary |
| Mixed `send_message_to` flow | `tool hook -> TeamRun.deliverInterAgentMessage -> MixedTeamManager -> InterAgentMessageRouter -> recipient AgentRun.postUserMessage` | `AutoByteus tool -> AutoByteus team manager -> Codex team manager -> recipient runtime` | Shows the desired star topology instead of pairwise runtime coupling |
| AutoByteus communication context | `teamContext.communicationContext.members/self/dispatchInterAgentMessageRequest(...)` | raw `teamContext.teamManager` + native task-plan state for mixed runs | Shows how the smaller contract keeps mixed scope bounded |
| Mixed AutoByteus task-tool stripping | `AutoByteusAgentRunBackendFactory -> resolveMixedToolExposure(memberTeamContext, toolNames) -> instantiate filtered tools only` | `instantiate all tools, then hope mixed members never call task-plan tools` | Shows the explicit DAR-003 owner and timing |
| Recipient-visible message format | `You received a message from teammate 'Writer' (run id: run_123). Message type: direct_message. Message: ...` | raw message body only, sender identity hidden in metadata | Shows why canonical content formatting is necessary across all runtimes |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Overload `RuntimeKind` with a mixed team selector | Initially looked like the smallest path | Rejected | Introduce `TeamBackendKind` and keep `RuntimeKind` member-only |
| Keep raw `TeamRunContext` as the standalone member bootstrap contract | Would have reduced type churn | Rejected | Introduce `MemberTeamContext` and stop passing whole team-run context into member bootstraps |
| Keep Codex/Claude team-member bootstrap under team-backend folders with same-runtime guards | Smaller local edit | Rejected | Move runtime-specific member communication/bootstrap ownership under runtime backends |
| Delegate mixed-team routing through existing runtime-specific team managers | Might have reduced initial code volume | Rejected | Mixed teams go straight to `MixedTeamManager` over `AgentRun` |
| Keep metadata-only mixed inter-agent delivery and let runtimes infer sender identity | Smaller change to builders | Rejected | Canonical content formatter embeds sender identity into recipient-visible text |
| Add task-plan compatibility to mixed path immediately | Convenience | Rejected | Communication-only v1 plus explicit mixed AutoByteus task-tool stripping |

## Derived Layering (If Useful)

- **Team entry layer**: `TeamRunService`, `AgentTeamRunManager`, `TeamBackendKind`
- **Mixed team governing layer**: `MixedTeamRunBackendFactory`, `MixedTeamManager`, `MixedTeamRunBackend`
- **Shared team helper layer**: `MemberTeamContextBuilder`, `InterAgentMessageRouter`, message builders, restore context helpers
- **Member execution layer**: `AgentRunManager`, `AgentRun`, runtime backends
- **Runtime-local communication/bootstrap layer**: Codex/Claude runtime team-member bootstrap folders; AutoByteus standalone runtime bootstrap, mixed tool filter, and communication-context injection
- **Runtime consumer layer**: AutoByteus `communicationContext` consumers

## Migration / Refactor Sequence

1. **Split the team selector subject from member runtime**
   - Add `TeamBackendKind`.
   - Replace top-level team `runtimeKind` fields/usages in `TeamRunConfig`, `TeamRunContext`, `TeamRunBackend`, `TeamRun`, `TeamRunService`, and `AgentTeamRunManager` with `teamBackendKind`.
   - Keep member `runtimeKind` unchanged.
2. **Introduce the runtime-neutral standalone member bootstrap contract**
   - Add `MemberTeamContext` and `MemberTeamContextBuilder`.
   - Replace `AgentRunConfig.teamContext` with `memberTeamContext`.
   - Update same-runtime Codex/Claude team managers and the future mixed manager to build `MemberTeamContext` for standalone member runs.
3. **Add the mixed team backend path**
   - Add mixed backend/context/factory/manager files.
   - Update `TeamRunService` create/restore resolution so multi-runtime member sets select `TeamBackendKind.MIXED_MEMBER_RUNS` instead of throwing.
   - Update restore runtime-context reconstruction to emit `MixedTeamRunContext` when persisted member runtimes differ.
4. **Retarget Codex runtime-owned member communication/bootstrap**
   - Add runtime-owned Codex team-member bootstrap files under `agent-execution/backends/codex/team-communication/`.
   - Update `codex-thread-bootstrapper.ts` to use them.
   - Remove the old team-owned Codex standalone bootstrap strategy file.
5. **Retarget Claude runtime-owned member communication/bootstrap**
   - Add runtime-owned Claude team-member bootstrap files under `agent-execution/backends/claude/team-communication/`.
   - Update `claude-agent-run-context.ts`, `claude-session-bootstrapper.ts`, Claude MCP/send-message builders, and `ClaudeSession` to use `memberTeamContext`.
   - Remove the old team-owned Claude standalone bootstrap strategy file.
6. **Implement the shared mixed inter-agent router and canonical delivery builders**
   - Add `InterAgentMessageRouter`.
   - Update `inter-agent-message-runtime-builders.ts` so recipient-visible content includes sender identity.
   - Wire `MixedTeamManager.deliverInterAgentMessage(...)` through the router.
7. **Refactor AutoByteus communication to a shared communication context**
   - Add `team-communication-context.ts` in `autobyteus-ts`.
   - Add `create-scoped-native-team-context.ts`.
   - Update native bootstrap step to inject the scoped wrapper.
   - Update `send-message-to.ts`, `inter-agent-message-event-handler.ts`, and `team-manifest-injector-processor.ts` to use `communicationContext`.
8. **Implement mixed AutoByteus runtime bootstrap policy**
   - Add `autobyteus-mixed-tool-exposure.ts` and `autobyteus-team-communication-context-builder.ts`.
   - Update `AutoByteusAgentRunBackendFactory` to filter out `ToolCategory.TASK_MANAGEMENT` when `memberTeamContext` indicates a mixed team, inject mixed communication context via `initialCustomData`, and ensure manifest processor presence when team context exists.
9. **Add tests**
   - team-backend-kind selection for create/restore,
   - cross-runtime `send_message_to`,
   - Codex/Claude mixed-member bootstrap,
   - AutoByteus mixed send-message flow,
   - negative test that mixed AutoByteus members expose no `ToolCategory.TASK_MANAGEMENT` tools,
   - mixed restore.
10. **Do not migrate old single-runtime managers beyond the bootstrap-contract update**
   - They remain separate current-path owners.
   - Mixed team code must not reference them.

## Key Tradeoffs

- **Dedicated team selector vs. overloading `RuntimeKind`**
  - Chosen: dedicated `TeamBackendKind`.
  - Why: the team boundary and the member runtime boundary are different subjects.
- **Runtime-neutral standalone member contract vs. raw `TeamRunContext` reuse**
  - Chosen: `MemberTeamContext`.
  - Why: standalone member bootstrap needs per-member membership data, not the whole team-governing context.
- **Communication-only v1 vs. full parity**
  - Chosen: communication-only v1.
  - Why: task-plan coupling is the largest scope multiplier.
- **Category-level task-management stripping vs. per-tool mixed allowlist for AutoByteus**
  - Chosen: category-level stripping in v1.
  - Why: it gives one explicit runtime bootstrap owner and keeps mixed AutoByteus behavior clearly communication-only.
- **Keep old managers vs. immediate migration**
  - Chosen: keep old managers for their current paths.
  - Why: mixed path can land without a risky big-bang rewrite.

## Risks

- The team selector split touches several team-boundary files, so naming drift between `teamBackendKind` and member `runtimeKind` must be watched carefully.
- Moving Codex/Claude member communication/bootstrap ownership under runtime backend folders is the right design, but it increases the amount of path churn in the implementation.
- Category-level AutoByteus task-management stripping is intentionally blunt; if product later wants narrower mixed AutoByteus tool parity, that policy owner will need refinement.
- Restore remains a non-trivial slice even with communication-only scope because platform run ids and member runtime kinds must be reconstructed accurately.
- If canonical recipient-visible message formatting is too verbose or poorly worded, model behavior may degrade; the formatter needs careful wording and tests.

## Guidance For Implementation

- Treat `TeamBackendKind` as a strict team-boundary subject and `RuntimeKind` as a strict member-runtime subject. Do not blur them again.
- Treat `MemberTeamContextBuilder` as the single owner of standalone member team bootstrap data; do not let Codex/Claude/AutoByteus re-derive teammate lists independently.
- Treat `MixedTeamManager` as the single mixed-team owner; do not let helper files accumulate lifecycle ownership.
- Keep `InterAgentMessageRouter` singular and authoritative for mixed `send_message_to` semantics.
- Keep `communicationContext` intentionally small. Do not add task-plan or mutable team runtime state to it in this change.
- Keep `AutoByteusAgentRunBackendFactory` as the sole owner that filters mixed AutoByteus task-management tools before exposure.
- Add integration coverage before refactoring any old single-runtime team code beyond the explicit member bootstrap contract change described above.
