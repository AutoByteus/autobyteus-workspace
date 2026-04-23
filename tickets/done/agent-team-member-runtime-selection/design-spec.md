# Design Spec

## Current-State Read

Today the ticket is split across two gaps:

1. the backend still rejects mixed-runtime teams, and
2. the frontend app still cannot configure mixed-runtime team launch from the workspace form.

### Backend current state

- `TeamRunService` collapses requested member runtimes to one runtime kind and rejects mixed-runtime teams.
- `AgentTeamRunManager` selects exactly one team backend factory from the team’s current `runtimeKind` field.
- `TeamRunBackend` and `TeamRun` also expose the team boundary as `runtimeKind`, which reinforces the same subject confusion: the team selector currently reuses a member-execution runtime enum.
- Runtime-specific team managers (`CodexTeamManager`, `ClaudeTeamManager`, native AutoByteus team runtime) each own their own member routing logic.
- `AgentRunManager` and `AgentRunBackend` already normalize individual member execution, but the team layer does not yet use that abstraction as the one governing owner.
- Same-runtime Codex/Claude team managers currently build standalone member `AgentRunConfig`s by passing the full runtime-specific `TeamRunContext` into `AgentRunConfig.teamContext`.
- Current Codex/Claude standalone team-member bootstrap strategies are still same-runtime keyed: they apply only when `teamContext.runtimeKind` equals the runtime’s own `RuntimeKind`.
- AutoByteus native communication depends on a large live `teamContext` object. `send_message_to` calls `teamContext.teamManager.dispatchInterAgentMessageRequest(...)`, recipient sender-name resolution also looks through `teamManager`, and native team manifest injection currently reads native team config directly.
- AutoByteus standalone `AgentRun` creation supports arbitrary `initialCustomData`, but it does not yet pass team context through to standalone agent runs.
- Mixed inter-agent delivery already has a canonical request contract on the server side, but current delivery builders only preserve sender identity in metadata. All runtimes ultimately feed only `AgentInputUserMessage.content` to the model, so metadata alone is insufficient for recipient understanding.
- `AutoByteusAgentRunBackendFactory` currently instantiates every configured tool from `agentDef.toolNames`, but the tool registry already carries `ToolDefinition.category`, which gives the runtime bootstrap layer an authoritative seam for removing mixed-incompatible task-management tools before exposure.

### Frontend current state

- `TeamRunConfigForm.vue` exposes one top-level runtime selector and one top-level model/config block.
- `MemberOverrideItem.vue` only supports model override, auto-execute override, and `llmConfig` override.
- `MemberConfigOverride` in `autobyteus-web/types/agent/TeamRunConfig.ts` has no `runtimeKind` field.
- `TeamRunConfig.runtimeKind` therefore functions as both:
  - the global team default runtime, and
  - the only runtime source the app can currently launch with.
- `agentTeamRunStore.ts` fans the team runtime out to every `memberConfigs[*].runtimeKind` during launch.
- `agentTeamContextsStore.ts` also fans the team runtime out when building temporary member contexts before first launch.
- `applicationLaunch.ts` does the same when materializing team launches from app launch flows.
- `teamRunConfigUtils.ts` reconstructs one dominant runtime from metadata and cannot preserve per-member runtime divergence when reopening a run.
- `teamRunConfigStore.isConfigured` still treats a team as ready when the top-level team model and workspace are populated, even if one member runtime override leaves that member without a valid effective model.
- `RunConfigPanel.vue` still gates the Run button from that global-only readiness getter.
- Existing tests explicitly assert same-runtime fanout, dominant-runtime reconstruction, and the current global-only workspace readiness rule.

### Constraints the target design must respect

- Existing single-runtime team managers remain available for their current paths.
- The new mixed-team path must not route through those legacy team managers.
- Mixed-team v1 is communication-only; task-plan-dependent features stay out of scope.
- AutoByteus native task-plan tools must keep working on the native team path.
- The design should reuse `AgentRunManager`/`AgentRun` rather than re-invent member execution.
- The frontend must keep a convenient **team-level default runtime/model/config** even after adding per-member runtime override support.

## Intended Change

Introduce a new **end-to-end mixed-runtime team design** with two coordinated layers:

1. a **frontend team launch configuration model** that supports a team default runtime plus optional per-member runtime override from the workspace team run form; and
2. a **server-owned mixed-team orchestration path** selected whenever launched member runtimes span multiple backends.

The target design does eight key things:

1. replace team-boundary `runtimeKind` with a dedicated `TeamBackendKind` that exists only at the team boundary;
2. keep `TeamRunConfig.runtimeKind` on the frontend as the **team default runtime**, but add `MemberConfigOverride.runtimeKind` as an optional per-member override;
3. introduce one shared frontend owner for building **effective member launch config** so temporary contexts, GraphQL launch payloads, and application launch helpers all resolve runtime the same way;
4. define a blocking member-row unresolved state for the case where a member runtime override makes the inherited team-default model/config invalid;
5. introduce one shared frontend readiness rule and make `teamRunConfigStore` the authoritative workspace launch-readiness owner, with `RunConfigPanel` consuming that boundary instead of a global-only boolean;
6. add a runtime-neutral `MemberTeamContext` for standalone team-member bootstrap across Codex, Claude, and mixed AutoByteus members;
7. add `MixedTeamRunBackendFactory`, `MixedTeamRunBackend`, `MixedTeamManager`, and `MixedTeamRunContext` as the new mixed governing owner path; and
8. make the AutoByteus standalone runtime bootstrap owner explicitly responsible for stripping `ToolCategory.TASK_MANAGEMENT` tools from mixed members before tool exposure while injecting a communication-only team context.

The old runtime-specific team managers remain in place for current single-runtime teams, but the new mixed path never delegates through them. Same-runtime Codex/Claude teams continue to use their current team managers, but those managers stop passing raw runtime-specific `TeamRunContext` into standalone member runs. Instead they build the same runtime-neutral `MemberTeamContext` that mixed teams use.

On the frontend, the user experience remains:

- configure a **global team runtime/model/config** once, then
- override runtime/model/config/auto-execute only for the members that need it.

If a member runtime override makes the inherited team-default model/config invalid, that member row becomes explicitly unresolved until the user either chooses a compatible member model or clears the runtime override. Launch stays blocked during that unresolved state.

That preserves convenience while making mixed-runtime launch actually usable from the app.

## Frontend Mixed-Runtime Validity Rule

### Member-row rule

For each member row, the frontend evaluates:

- `effectiveRuntime = override.runtimeKind ?? team.runtimeKind`
- `candidateModel = override.llmModelIdentifier ?? team.llmModelIdentifier`

The row behavior is:

1. if an **explicit member model override** is invalid for the new effective runtime, clear that explicit member model override and any member-only `llmConfig`;
2. then re-evaluate inheritance from the team-default model;
3. if the team-default model is valid for the member’s effective runtime, the row can stay in inherit-global mode;
4. if the team-default model is also invalid for that runtime, the row enters a **blocking unresolved state**:
   - keep the selected member runtime override,
   - show a warning that the global model is unavailable for this runtime,
   - require the user to choose a compatible member model or clear the runtime override,
   - suppress launch-time effective model/config materialization for that member until resolved.

### Workspace launch-readiness rule

`teamRunConfigStore.launchReadiness.canLaunch` is `true` only when:

- workspace selection is valid,
- the team-level default runtime/model/config is valid, and
- every member row is either:
  - validly inheriting the team-default model/config for its effective runtime, or
  - carrying a valid explicit member model/config override for its effective runtime.

`teamRunConfigStore.launchReadiness` must expose structured blocking issues and per-member unresolved state summary. `RunConfigPanel` renders that boundary and never falls back to a separate global-only check. Defensive launch paths such as `applicationLaunch.ts` may reuse the same shared readiness utility, but the workspace public boundary remains the store.

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
- In-scope replaced behavior is:
  - the current mixed-runtime rejection branch,
  - the team-boundary overloading of `RuntimeKind`,
  - the same-runtime-only standalone member bootstrap assumptions for Codex/Claude,
  - the raw AutoByteus communication dependence on `teamManager`,
  - the frontend same-runtime fanout/dominant-runtime reconstruction assumptions, and
  - the frontend global-only team launch-readiness gate that ignores unresolved member mixed-runtime state.
- The new mixed path must therefore be clean-cut and must not hide mixed routing behind runtime-specific legacy team managers.
- The current team-owned Codex/Claude standalone member bootstrap strategy files are in-scope removed/replaced because this boundary is being redesigned around a runtime-neutral member-team contract.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User edits one member row in the workspace config | member row state that is either valid inheritance or explicit unresolved mixed-runtime correction | `MemberOverrideItem` over shared runtime/model state helpers | Establishes the user-visible mixed-runtime correction behavior, including the blocking invalid-inherited-default case. |
| DS-002 | Primary End-to-End | User clicks Run Team from the workspace | launch allowed or blocked by structured team launch readiness | `teamRunConfigStore` | Governs whether the workspace can run a mixed team at all. |
| DS-003 | Primary End-to-End | Workspace/app launch path materializes member configs | GraphQL `memberConfigs[]` / temp member contexts with effective per-member runtimes | frontend member config builder | Governs whether the app launches what the user configured once readiness is satisfied. |
| DS-004 | Primary End-to-End | User reopens/hydrates a team run | workspace config rebuilt with truthful runtime overrides | frontend config reconstruction owner | Prevents mixed-runtime truth from collapsing on reopen. |
| DS-005 | Primary End-to-End | Team create / restore request | Active team backend with the correct `TeamBackendKind` | `TeamRunService` -> selected team backend owner | Establishes the corrected team selector subject and mixed-team activation path. |
| DS-006 | Primary End-to-End | Team member bootstrap request | Runtime-specific standalone member run with runtime-neutral team membership context | `MemberTeamContextBuilder` + runtime bootstrap owner | Governs the corrected Codex/Claude/AutoByteus member bootstrap boundary. |
| DS-007 | Primary End-to-End | Team-level targeted user message | Recipient member `AgentRun` | `MixedTeamManager` | Governs non-tool message routing to the correct member runtime. |
| DS-008 | Primary End-to-End | `send_message_to` tool invocation | Recipient member `AgentRun` plus team event publication | `InterAgentMessageRouter` under `MixedTeamManager` | This is the core mixed-runtime communication spine. |
| DS-009 | Primary End-to-End | Mixed AutoByteus member bootstrap | AutoByteus runtime with filtered tool surface and injected communication context | `AutoByteusAgentRunBackendFactory` | Governs both mixed AutoByteus communication wiring and task-tool exclusion. |
| DS-010 | Return-Event | Member runtime event | Team websocket/event consumers | `MixedTeamManager` | Preserves per-member identity and runtime in team event streams. |
| DS-011 | Bounded Local | Native AutoByteus team bootstrap | Agent-scoped native team context wrapper with communication context | native `AgentConfigurationPreparationStep` | Lets native communication move to the new communication contract without breaking native task tools. |

## Primary Execution Spine(s)

- `Workspace user -> TeamRunConfigForm -> MemberOverrideItem -> shared runtime/model state helper -> unresolved-or-valid member row state -> TeamRunConfig.memberOverrides`
- `Workspace user clicks Run -> RunConfigPanel -> teamRunConfigStore.launchReadiness -> allow or block launch`
- `Launch-ready team config -> shared frontend member config builder -> agentTeamRunStore / applicationLaunch / agentTeamContextsStore -> effective member runtimeKinds`
- `Stored team metadata -> reconstructTeamRunConfigFromMetadata -> TeamRunConfig with runtime overrides -> TeamRunConfigForm`
- `Create/Restore request -> TeamRunService -> resolve TeamBackendKind -> AgentTeamRunManager -> selected TeamRunBackendFactory -> MixedTeamManager or legacy single-runtime manager`
- `Standalone member activation -> team manager / mixed manager -> MemberTeamContextBuilder -> AgentRunManager -> AgentRunConfig.memberTeamContext -> runtime bootstrapper`
- `TeamRun.postMessage -> MixedTeamRunBackend -> MixedTeamManager -> ensureMemberReady -> AgentRun.postUserMessage -> runtime backend`
- `Runtime send_message_to hook -> TeamRun.deliverInterAgentMessage -> MixedTeamRunBackend -> MixedTeamManager -> InterAgentMessageRouter -> recipient AgentRun.postUserMessage -> runtime backend`
- `Mixed AutoByteus AgentRun create/restore -> AutoByteusAgentRunBackendFactory -> resolve mixed tool exposure -> inject communication context -> AutoByteus runtime`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The user edits one member row. The row resolves stored override runtime versus effective runtime, determines whether the team-default model can still be inherited, and either remains valid or becomes explicitly unresolved until the user chooses a compatible member model or clears the runtime override. | `TeamRunConfigForm`, `MemberOverrideItem`, shared runtime/model state helper, `TeamRunConfig` | `MemberOverrideItem` for row behavior over shared frontend state helpers | runtime-scoped model loading, invalid inherited-default detection, meaningful-override pruning |
| DS-002 | When the user clicks Run Team from the workspace, `teamRunConfigStore` evaluates structured launch readiness from workspace selection, global config, and per-member unresolved mixed-runtime state. `RunConfigPanel` consumes that boundary and either blocks launch with the shared readiness result or allows the downstream launch path. | `RunConfigPanel`, `teamRunConfigStore`, shared launch-readiness utility | `teamRunConfigStore` | workspace selection, row-state aggregation, blocking issue summarization |
| DS-003 | Once the team is launch-ready, one shared frontend builder resolves each member’s effective runtime/model/config from `override ?? global` and feeds that into launch payloads and temporary team contexts. | frontend member config builder, `agentTeamRunStore`, `applicationLaunch`, `agentTeamContextsStore` | shared frontend member config builder | workspace resolution, agent-definition lookup |
| DS-004 | When the user opens an existing run, metadata is reconstructed into a team default runtime plus per-member runtime overrides where members differ from the dominant default. | run hydration/open flow, `teamRunConfigUtils` | frontend config reconstruction owner | dominant-default selection, override derivation |
| DS-005 | Team creation/restore reaches `TeamRunService`, which now resolves a dedicated `TeamBackendKind`. `AgentTeamRunManager` resolves the selected team backend factory, which constructs either the new mixed backend path or an existing single-runtime team backend. | `TeamRunService`, `AgentTeamRunManager`, backend factory, team backend owner | selected team backend owner after construction | team-backend-kind resolution, restore context building, metadata projection |
| DS-006 | Whenever a team manager needs a standalone member run, it first builds a runtime-neutral `MemberTeamContext` for that member. The runtime bootstrapper then uses that member-team contract to produce teammate instructions, allowed-recipient lists, and runtime-local `send_message_to` wiring. | team manager, `MemberTeamContextBuilder`, `AgentRunManager`, runtime bootstrapper | runtime bootstrapper for runtime-local shaping; team manager for lifecycle | teammate list shaping, allowed-recipient derivation |
| DS-007 | A team-level targeted user message reaches `MixedTeamManager`, which resolves the target member, ensures its `AgentRun` exists, and forwards the `AgentInputUserMessage` through the shared run boundary. | `TeamRun`, `MixedTeamRunBackend`, `MixedTeamManager`, `AgentRun` | `MixedTeamManager` | member registry, active-run caching, event binding |
| DS-008 | A runtime-specific `send_message_to` hook builds a canonical delivery request and passes it to the team boundary. `InterAgentMessageRouter` resolves sender/recipient identities, formats recipient-visible content, delivers through the recipient `AgentRun`, and publishes a normalized team event. | runtime tool hook, `TeamRun`, `MixedTeamManager`, `InterAgentMessageRouter`, `AgentRun` | `InterAgentMessageRouter` for delivery semantics, `MixedTeamManager` for lifecycle and event publication | approval gating, canonical message formatter, sender identity mapping |
| DS-009 | During mixed AutoByteus member creation/restore, the runtime backend factory filters out task-management tools, translates the runtime-neutral `MemberTeamContext` into an AutoByteus communication context, injects it via `initialCustomData`, and ensures teammate guidance is available through manifest injection. | `AutoByteusAgentRunBackendFactory`, mixed tool exposure policy, AutoByteus agent config, injected `communicationContext` | `AutoByteusAgentRunBackendFactory` | custom-data builder, tool filter, manifest processor presence |
| DS-010 | Runtime-specific member events are converted into `AgentRunEvent`, rebound by `MixedTeamManager` with member/runtime identity, then emitted as `TeamRunEvent` to existing stream infrastructure. | `AgentRun`, `MixedTeamManager`, `TeamRunEvent`, stream handler | `MixedTeamManager` | event conversion reuse, team status derivation |
| DS-011 | Native AutoByteus team bootstrap creates a per-agent wrapper over the shared native team context and attaches a communication subcontext so communication consumers use one smaller contract while native task tools still see the native context surface. | `AgentConfigurationPreparationStep`, scoped native team context wrapper, communication-context helpers | native AutoByteus bootstrap step | raw native task-plan access stays available only on native path |

## Spine Actors / Main-Line Nodes

- `TeamRunConfig`
- `TeamRunConfigForm`
- `MemberOverrideItem`
- shared launch-readiness utility
- `teamRunConfigStore`
- `RunConfigPanel`
- frontend member config builder
- frontend config reconstruction owner
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

- `TeamRunConfig` / `MemberConfigOverride`
  - Own frontend config semantics for “team default” versus “member override”.
  - Must not directly own launch materialization policy.
- `TeamRunConfigForm`
  - Owns the global team config UI and the list of per-member override rows.
  - Must not hand-roll effective member launch config.
- `MemberOverrideItem`
  - Owns one member’s override UI, including inherited-versus-explicit runtime state and the local unresolved-row presentation when inherited defaults become invalid.
  - Must not own cross-row launch resolution.
- shared launch-readiness utility
  - Governing owner for pure team-launch validity evaluation from global config plus per-member unresolved state.
  - Must not own workspace panel state or launch submission side effects.
- `teamRunConfigStore`
  - Governing workspace boundary for whether a team can launch right now.
  - It owns the structured readiness result consumed by the workspace Run button.
- `RunConfigPanel`
  - Owns only presentation of the Run action and consumption of the store readiness boundary.
  - It must not recompute mixed-runtime readiness inline.
- frontend member config builder
  - Governing owner for resolving each member’s effective runtime/model/config from team config plus overrides once readiness has passed.
  - Shared by temporary contexts, GraphQL launch payloads, and application launch helpers.
- frontend config reconstruction owner
  - Governing owner for turning metadata back into a truthful `TeamRunConfig` with runtime overrides.
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
| `TeamRunConfigForm` | `TeamRunConfig` + member row UI | user-facing config entrypoint | launch materialization policy |
| `RunConfigPanel` | `teamRunConfigStore` | workspace Run action entrypoint | mixed-runtime readiness recomputation inline |
| `agentTeamRunStore` | frontend member config builder + GraphQL mutation | launch entrypoint from workspace | per-member effective config derivation duplicated inline |
| `TeamRunService` | selected team backend owner | API/service entrypoint, persistence and restore boundary | member-run lifecycle or inter-agent routing semantics |
| `AgentTeamRunManager` | selected team backend / manager | active team-run registry and backend factory selection | mixed-team routing logic |
| `TeamRun` | `TeamRunBackend` / `MixedTeamManager` | stable public team-run surface | hidden mixed-team orchestration decisions |
| `AgentRun` | `AgentRunBackend` | stable runtime-neutral member surface | team membership or cross-member routing |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Team-boundary reuse of `RuntimeKind` (`TeamRunConfig.runtimeKind`, `TeamRunContext.runtimeKind`, `TeamRunBackend.runtimeKind`, `TeamRun.runtimeKind` on the server side) | Team orchestration selector is a different subject from member runtime | `TeamBackendKind` plus `teamBackendKind` fields at the team boundary | In This Change | Clean subject split required by DAR-001 |
| Frontend same-runtime launch fanout in `agentTeamRunStore`, `agentTeamContextsStore`, and `applicationLaunch.ts` | The app must preserve per-member runtime selections | shared frontend member config builder | In This Change | Removes duplicated one-runtime fanout logic |
| Frontend dominant-runtime-only reconstruction in `teamRunConfigUtils.ts` | Reopened mixed team config must stay truthful | runtime-aware reconstruction in `teamRunConfigUtils.ts` | In This Change | Keeps app config faithful after launch/open |
| Workspace global-only team launch readiness in `teamRunConfigStore.isConfigured` / `RunConfigPanel.vue` | Mixed-runtime launch can now be blocked by unresolved member rows, not only missing global team fields | structured launch-readiness result in `teamRunConfigStore` backed by shared readiness utility | In This Change | Cleanly replaces the old global-only Run gating |
| Same-runtime-only Codex/Claude standalone member bootstrap strategy files under `agent-team-execution/backends/*` | Member bootstrap is a runtime-backend concern, not a team-backend concern, and it must work for mixed teams too | runtime-owned `MemberTeamContext` consumers under `agent-execution/backends/codex` and `agent-execution/backends/claude` | In This Change | Clean ownership correction required by DAR-002 |
| Direct AutoByteus communication dependence on raw `teamContext.teamManager` inside communication consumers | Mixed and native communication should share one smaller contract | `communicationContext` contract in `autobyteus-ts` | In This Change | Task-plan tools are not moved; only communication consumers change |
| Mixed AutoByteus task-management tool exposure | Mixed v1 must be communication-only | `AutoByteusAgentRunBackendFactory` + mixed tool exposure policy helper | In This Change | Clean runtime bootstrap enforcement required by DAR-003 |
| Duplicated runtime-specific inter-agent routing inside single-runtime Codex/Claude managers | Once/if single-runtime team paths are later migrated, the shared router can become reusable | shared `InterAgentMessageRouter` | Follow-up | Not required for mixed v1 |

## Return Or Event Spine(s) (If Applicable)

`Runtime event -> AgentRunEvent converter -> MixedTeamManager member binding -> TeamRunEvent -> AgentTeamStreamHandler -> websocket/history consumers`

## Bounded Local / Internal Spines (If Applicable)

- `MemberOverrideItem`
  - `stored override runtime -> effective runtime -> inherited-default-valid? -> unresolved row state or explicit override emit`
  - Matters because inherited-versus-explicit runtime state and unresolved-row presentation must stay local to the member row.
- shared launch-readiness utility + `teamRunConfigStore`
  - `team config + member override states + workspace -> blocking issues + canLaunch`
  - Matters because workspace Run gating must be singular and mixed-runtime-aware.
- frontend member config builder
  - `team default + member override -> effective runtime/model/config -> shared resolved member config`
  - Matters because multiple launch paths currently duplicate this logic once readiness has passed.
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
| runtime-scoped model-option loading and inherited-default evaluation | DS-001 | `MemberOverrideItem` and global runtime/model selector | Load runtime-specific provider/model choices, invalidate incompatible explicit selection, and detect blocking invalid inherited defaults | Needed for correct frontend override UX | If duplicated across form components, runtime/model behavior drifts |
| meaningful-override normalization | DS-001, DS-004 | frontend config model | Remove empty member override records while preserving explicit runtime/model/config differences | Needed to keep config state minimal and stable | If each caller decides differently, override persistence drifts |
| frontend launch readiness evaluation | DS-002 | shared launch-readiness utility and `teamRunConfigStore` | Derive blocking issues and workspace Run eligibility from team config plus member row state | Needed so launch gating stays singular and mixed-runtime-aware | If spread across UI/store/helpers, broken teams can still launch |
| frontend effective member config materialization | DS-003 | frontend member config builder | Build shared resolved member launch records | Needed by launch payloads and temp contexts once readiness is satisfied | If spread across stores/utils, mixed runtime fanout bugs recur |
| `TeamBackendKind` resolution | DS-005 | `TeamRunService` | Decide which team backend governs the run | Needed before team manager construction | If pushed into managers, create/restore logic fragments |
| `MemberTeamContext` building | DS-006 | `MemberTeamContextBuilder` | Convert team membership state into runtime-neutral per-member bootstrap context | Needed for Codex/Claude/AutoByteus standalone members | If spread across managers/runtimes, teammate/recipient logic drifts |
| canonical inter-agent message formatting | DS-008 | `InterAgentMessageRouter` | Build recipient-visible content plus metadata | Needed because runtimes only pass content to the model | If left to runtime edges, sender identity becomes inconsistent |
| AutoByteus mixed tool exposure policy | DS-009 | `AutoByteusAgentRunBackendFactory` | Remove `ToolCategory.TASK_MANAGEMENT` tools before exposure on mixed runs | Needed to keep mixed v1 communication-only | If omitted or duplicated, mixed AutoByteus surfaces become inconsistent |
| AutoByteus custom-data injection | DS-009 | `AutoByteusAgentRunBackendFactory` | Translate `MemberTeamContext` into runtime custom data | Needed only for AutoByteus standalone runtime integration | If owned by mixed manager, runtime bootstrapping leaks upward |
| restore runtime-context reconstruction | DS-005 | `TeamRunService` | Rebuild mixed or single-runtime team contexts from metadata | Needed so restored communication uses true per-member runtimes | If omitted, restore collapses back to one runtime |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| per-member runtime execution | `agent-execution` / `AgentRunManager` / `AgentRun` | Reuse | Already owns multi-runtime member execution lifecycle | N/A |
| workspace mixed-runtime launch readiness | `teamRunConfigStore` / `RunConfigPanel` current path | Extend + Create New shared utility | Existing workspace boundary is right, but the current readiness rule is global-only and needs a shared mixed-runtime-aware utility behind it | A new boundary in random components would duplicate the current problem |
| team backend selection | `agent-team-execution/services/agent-team-run-manager.ts` | Extend | Existing authoritative selector for team backends | N/A |
| team-run create/restore persistence | `TeamRunService` | Extend | Already owns create/restore metadata flow | N/A |
| canonical inter-agent delivery request type | `domain/inter-agent-message-delivery.ts` | Reuse | Existing request contract already matches the needed shape | N/A |
| standalone member bootstrap team contract | raw `TeamRunContext` passed through `AgentRunConfig` | Create New | Raw team context is the wrong subject for member bootstrap | It mixes team-governing state with per-member bootstrap needs |
| mixed-team member orchestration | existing runtime-specific team managers | Create New | Existing managers are runtime-owned and not suitable as a mixed governing owner | They assume one runtime/backend per team |
| AutoByteus communication context contract | raw native `AgentTeamContext` | Create New | Native context is too large and task-plan-coupled | Mixed path only needs communication concerns |
| frontend member launch materialization | inline logic in multiple stores/utils | Create New | Current materialization is duplicated and same-runtime-biased | Shared resolution owner is needed for correctness |
| frontend runtime/model option loading | `RuntimeModelConfigFields.vue` logic | Extend / extract shared helper | Logic already exists but needs inherited-runtime support | The current component alone does not own member-row inherited state |
| AutoByteus mixed tool suppression | existing tool registry only | Extend runtime bootstrap | Registry knows categories, but runtime bootstrap owns actual exposure | A pure registry-only change would not know team mode |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/types/agent` | frontend team config and member override shape | DS-001, DS-003, DS-004 | workspace config UI, launch stores, hydration | Extend | Add per-member runtime override support |
| `autobyteus-web/components/workspace/config` | global team config UI, member override UI, and Run-button presentation | DS-001, DS-002 | workspace config editing and run action surface | Extend | Add per-member runtime override UX plus unresolved-row/readiness presentation |
| `autobyteus-web/composables` | shared runtime/model selection helper for global and member rows | DS-001 | `RuntimeModelConfigFields`, `MemberOverrideItem` | Create New / Extend | Extract runtime-scoped model loading logic and inherited-default invalid-state detection |
| `autobyteus-web/utils` | meaningful override checks, metadata reconstruction, shared member launch materialization, shared launch-readiness evaluation | DS-002, DS-003, DS-004 | stores and hydration/open flows | Extend / Create New | Separate materialization from launch validity while keeping both shared |
| `autobyteus-web/stores` | workspace launch-readiness ownership, temporary context creation, and launch mutation orchestration | DS-002, DS-003 | workspace runtime launch | Extend | `teamRunConfigStore` becomes the authoritative workspace readiness owner and launch stores consume shared helpers |
| `agent-team-execution/domain` | team backend selector, mixed team context, runtime-neutral member-team bootstrap contract | DS-005, DS-006 | `TeamRunService`, `MixedTeamManager`, same-runtime team managers | Extend | Add `TeamBackendKind` and `MemberTeamContext` |
| `agent-team-execution/backends/mixed` | mixed team backend factory/backend/manager | DS-005, DS-007, DS-008, DS-010 | `MixedTeamManager` | Create New | New authoritative mixed-team subsystem |
| `agent-team-execution/services` | shared `MemberTeamContext` builder, shared inter-agent router, canonical message formatter, restore support | DS-006, DS-008, DS-010, DS-005 | `MixedTeamManager`, same-runtime team managers, `TeamRunService` | Extend | Shared ownership belongs here rather than in runtime backends |
| `agent-execution/backends/codex` | Codex runtime-owned team-member bootstrap and `send_message_to` exposure over `MemberTeamContext` | DS-006, DS-008 | Codex runtime bootstrapper | Extend | Explicit DAR-002 ownership fix |
| `agent-execution/backends/claude` | Claude runtime-owned team-member bootstrap and `send_message_to` exposure over `MemberTeamContext` | DS-006, DS-008 | Claude runtime bootstrapper | Extend | Explicit DAR-002 ownership fix |
| `agent-execution/backends/autobyteus` | standalone AutoByteus runtime bootstrapping, mixed tool filtering, communication-context injection | DS-009 | `AutoByteusAgentRunBackendFactory` | Extend | Explicit DAR-003 ownership fix |
| `autobyteus-ts/src/agent-team/context` | communication context contract and native scoped wrapper | DS-009, DS-011 | AutoByteus communication consumers | Extend / Create New | Separates communication-facing context from native task-plan-heavy context |
| `autobyteus-ts` communication consumers | `send_message_to`, sender display resolution, manifest injection | DS-008, DS-009, DS-011 | AutoByteus runtime | Extend | Move to the smaller communication contract |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | frontend team config model | type owner | Add `MemberConfigOverride.runtimeKind` and keep team default runtime semantics explicit | One authoritative frontend config shape | Yes |
| `autobyteus-web/composables/useRuntimeScopedModelSelection.ts` | shared frontend runtime/model logic | shared helper owner | Runtime availability, effective runtime, runtime-scoped model options, invalid-model clearing, and inherited-default unresolved-state derivation | Shared by global and per-member runtime/model editors | Yes |
| `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` | member override UI | row owner | Per-member runtime/model/auto-execute/llmConfig override UI with inherit-global runtime state and blocking unresolved-row behavior | One row-level UI owner | Yes |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | global team config UI | form owner | Global runtime/model/config UI plus member override list wiring and row-state propagation | One team config entrypoint | Yes |
| `autobyteus-web/utils/teamRunConfigUtils.ts` | frontend config semantics | utility owner | Meaningful override checks, effective member runtime/config helpers, metadata reconstruction | One owner for config-state semantics | Yes |
| `autobyteus-web/utils/teamRunLaunchReadiness.ts` | frontend launch validity | shared readiness owner | Evaluate blocking mixed-runtime issues and produce structured launch readiness | Shared by workspace store and any defensive launch entrypoints | Yes |
| `autobyteus-web/utils/teamRunMemberConfigBuilder.ts` | frontend launch materialization | shared builder owner | Build effective member launch config records from team config + overrides once readiness has passed | Shared by launch store, temp contexts, and app launch helpers | Yes |
| `autobyteus-web/stores/teamRunConfigStore.ts` | workspace launch readiness | store boundary | Expose authoritative structured team launch readiness for the workspace | Existing workspace config boundary is the correct public owner | Yes |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | workspace run action | panel boundary | Consume structured store readiness and present Run-button blocking state | Existing Run action entrypoint should not recompute readiness | Yes |
| `autobyteus-web/stores/agentTeamRunStore.ts` | workspace launch orchestration | store owner | Use shared builder to emit GraphQL `memberConfigs[]` after readiness passes | Existing launch entrypoint | Yes |
| `autobyteus-web/stores/agentTeamContextsStore.ts` | temporary team contexts | store owner | Use shared builder to create temp member contexts with truthful runtime | Existing temp context owner | Yes |
| `autobyteus-web/utils/application/applicationLaunch.ts` | application launch materialization | helper owner | Use shared builder and shared readiness utility for prepared team launches | Existing app-launch helper | Yes |
| `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | frontend hydration | hydration owner | Use reconstructed runtime-aware team config when hydrating team contexts | Existing hydration owner | Yes |
| `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | frontend open flow | open owner | Use reconstructed runtime-aware team config when opening stored team runs | Existing open-flow owner | Yes |
| `agent-team-execution/domain/team-backend-kind.ts` | team boundary domain | selector type owner | `TeamBackendKind` enum/helpers | One authoritative team selector source | N/A |
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
| frontend member runtime override state | `autobyteus-web/types/agent/TeamRunConfig.ts` | frontend team config model | Shared by form, stores, hydration, and launch materialization | Yes | Yes | a launch-payload-only type |
| frontend launch readiness evaluation | `autobyteus-web/utils/teamRunLaunchReadiness.ts` | frontend launch validity | Shared by `teamRunConfigStore` and defensive launch entrypoints | Yes | Yes | ad-hoc UI booleans or launch-store-only checks |
| frontend effective member launch resolution | `autobyteus-web/utils/teamRunMemberConfigBuilder.ts` | frontend launch materialization | Shared by launch store, temp contexts, and app launch helpers once readiness has passed | Yes | Yes | store-specific branching logic |
| runtime-scoped model selection logic | `autobyteus-web/composables/useRuntimeScopedModelSelection.ts` | shared frontend runtime/model logic | Shared by team default selector and member override rows | Yes | Yes | a UI component with hidden launch policy |
| team backend selector | `agent-team-execution/domain/team-backend-kind.ts` | team boundary domain | Shared by config, context, service, backend, and manager selection | Yes | Yes | a runtime-management enum |
| runtime-neutral member-team bootstrap context | `agent-team-execution/domain/member-team-context.ts` | team boundary domain | Shared by mixed manager, same-runtime team managers, and runtime bootstrappers | Yes | Yes | a dump of full team-manager internals |
| communication-facing teammate/member descriptor | `autobyteus-ts/src/agent-team/context/team-communication-context.ts` | AutoByteus communication context | Shared by send-message, manifest injection, mixed context builders | Yes | Yes | a dump of full native team state |
| mixed team member runtime context | `agent-team-execution/backends/mixed/mixed-team-run-context.ts` | mixed team backend | Shared by manager, factory, restore, sender resolution | Yes | Yes | runtime-specific thread/session subclasses |
| canonical recipient message formatter | `agent-team-execution/services/inter-agent-message-runtime-builders.ts` | team orchestration services | Shared by all mixed-runtime deliveries | Yes | Yes | runtime-specific prompt formatter branches |
| AutoByteus mixed tool exposure policy | `agent-execution/backends/autobyteus/autobyteus-mixed-tool-exposure.ts` | AutoByteus runtime backend | Shared by create/restore runtime bootstrap paths | Yes | Yes | ad-hoc inline filters in factory methods |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| frontend `TeamRunConfig.runtimeKind` + `MemberConfigOverride.runtimeKind` | Yes | Yes | Low | Keep one clear rule: team field = default, member field = override only |
| frontend `TeamRunLaunchReadiness` / unresolved member state | Yes | Yes | Low | Keep one shared blocking-state shape for 'member runtime override breaks inherited defaults' |
| `TeamBackendKind` | Yes | Yes | Low | Keep it team-boundary-only; never treat it as a member runtime |
| `MemberTeamContext` | Yes | Yes | Low | Keep it limited to per-member bootstrap needs |
| `MixedTeamMemberContext` | Yes | Yes | Low | Keep one generic `platformAgentRunId` instead of runtime-specific duplicates in the mixed path |
| AutoByteus `communicationContext` | Yes | Yes | Medium | Keep it communication-only; do not let task-plan/state fields leak into it |
| canonical inter-agent delivery request | Yes | Yes | Low | Reuse existing request contract; add no extra sender aliases |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | frontend team config model | type owner | Add `MemberConfigOverride.runtimeKind` and document default-vs-override semantics | One authoritative frontend config shape | Yes |
| `autobyteus-web/composables/useRuntimeScopedModelSelection.ts` | shared frontend runtime/model logic | helper owner | Shared runtime availability/model-loading logic plus invalid inherited-default detection for both global and member selectors | One shared frontend runtime/model policy owner | Yes |
| `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` | member override UI | row owner | Per-member runtime override UX with inherit-global behavior and blocking unresolved-row presentation | One row-level config owner | Yes |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | global team config UI | form owner | Team default runtime/model/config UI and member override list wiring | One team-level config owner | Yes |
| `autobyteus-web/utils/teamRunConfigUtils.ts` | frontend config semantics | utility owner | `hasMeaningfulMemberOverride`, effective-member resolution helpers, metadata reconstruction | One owner for config semantics | Yes |
| `autobyteus-web/utils/teamRunLaunchReadiness.ts` | frontend launch validity | readiness owner | Derive blocking issues and structured launch readiness from team config plus member row state | Keeps mixed-runtime Run gating singular | Yes |
| `autobyteus-web/utils/teamRunMemberConfigBuilder.ts` | frontend launch materialization | builder owner | Build effective member launch records from team config + overrides after readiness passes | Removes duplicated same-runtime fanout | Yes |
| `autobyteus-web/stores/teamRunConfigStore.ts` | workspace launch readiness | store boundary | Expose authoritative structured team launch readiness to the workspace | Existing workspace config store is the right public boundary | Yes |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | workspace run action | panel boundary | Consume store readiness and present Run-button blocking state | Existing Run action entrypoint should stay thin | Yes |
| `autobyteus-web/stores/agentTeamRunStore.ts` | workspace launch orchestration | store owner | Consume shared builder after shared readiness has passed when emitting GraphQL `memberConfigs[]` | Existing launch orchestrator | Yes |
| `autobyteus-web/stores/agentTeamContextsStore.ts` | temporary team contexts | store owner | Consume shared builder when creating temp member contexts | Existing temp context owner | Yes |
| `autobyteus-web/utils/application/applicationLaunch.ts` | application launch materialization | helper owner | Consume shared builder and shared readiness rule for prepared team launches | Existing app-launch helper | Yes |
| `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | frontend hydration | hydration owner | Hydrate team config with runtime-aware reconstruction | Existing hydration owner | Yes |
| `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | frontend open flow | open owner | Open stored team runs with runtime-aware reconstruction | Existing open owner | Yes |
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

- `TeamRunConfig` is the authoritative frontend data boundary for global-versus-member launch overrides. Callers may read/write config through that shape, but they must not infer launch-time effective member runtime ad hoc.
- shared frontend launch-readiness utility is the authoritative owner of pure mixed-runtime team-launch validity. `teamRunConfigStore` depends on it and workspace callers must not invent parallel Run-button rules.
- `teamRunConfigStore` is the authoritative workspace launch-readiness boundary. `RunConfigPanel` may render its result, but must not recompute readiness inline.
- frontend member config builder is the authoritative owner of effective member launch resolution once readiness has passed. Launch stores and temp-context builders must depend on it rather than rebuilding runtime/model/config resolution inline.
- frontend runtime-aware reconstruction is the authoritative owner of reopened team config truth. Hydration/open flows must not independently re-derive per-member runtime overrides.
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
| `TeamRunConfig` + override helpers | default-vs-override config semantics | workspace config UI, open/hydration flows | stores inferring override meaning from raw object shape differently | extending shared config helpers |
| shared frontend launch-readiness utility | mixed-runtime blocking-issue derivation | `teamRunConfigStore` and defensive launch entrypoints | Run button or launch helpers checking only global team fields | extending the shared readiness result shape |
| `teamRunConfigStore` | workspace launch-readiness aggregation and exposure | `RunConfigPanel` | panel-level recomputation of mixed-runtime validity | extending the store readiness getter/result |
| frontend member config builder | effective runtime/model/config materialization | `agentTeamRunStore`, `agentTeamContextsStore`, `applicationLaunch.ts` | inline `override.runtimeKind ?? team.runtimeKind` logic duplicated across files | extending the shared builder result shape |
| frontend config reconstruction | dominant-default selection + per-member override reconstruction | hydration/open flows | open/hydration code collapsing to one runtime independently | extending reconstruction helpers |
| `TeamRunService` | team-backend-kind resolution, restore-context assembly, metadata writes | API/service callers | constructing mixed backend contexts directly from transport layers | extending the service-level create/restore helpers |
| `MixedTeamManager` | member-run cache, member event binding, active mixed-team state | `MixedTeamRunBackend` only | direct caller access to `AgentRunManager` for team member routing | adding explicit manager methods |
| `MemberTeamContextBuilder` | self-member resolution, teammate list construction, allowed-recipient derivation | same-runtime team managers, `MixedTeamManager` | runtime bootstrappers deriving their own teammate lists from unrelated raw team state | extending the shared member-team context shape |
| `InterAgentMessageRouter` | canonical inter-agent validation, formatting, recipient delivery, event build | `MixedTeamManager` only | runtime tool hooks formatting or delivering directly to recipient runs | extending the router request/result shape |
| `AgentRunManager` | runtime backend resolution and active member-run registry | team managers | managers instantiating runtime backends directly | extending `AgentRunManager` |
| `AutoByteusAgentRunBackendFactory` | mixed tool exposure policy, injected custom data, system prompt processor wiring | `AgentRunManager` / team orchestration via `AgentRunConfig` only | mixed manager mutating AutoByteus runtime state directly | adding a runtime-specific context builder/helper |
| AutoByteus `communicationContext` contract | dispatch and sender-name resolution helper surface | AutoByteus communication consumers | direct raw `teamManager` usage in send-message or manifest injection | extending the shared communication contract |

## Dependency Rules

- `TeamRunConfigForm` may depend on shared frontend config helpers, member-row components, and store-provided readiness summaries for display only; it must not own launch gating.
- `MemberOverrideItem` may depend on the shared runtime/model selection helper and config helpers, but not on launch stores or backend transport types.
- `teamRunConfigStore` may depend on the shared frontend launch-readiness utility; workspace Run-button callers may depend only on the store boundary, not on the utility directly.
- `agentTeamRunStore`, `agentTeamContextsStore`, and `applicationLaunch.ts` may depend on the shared frontend member config builder and shared readiness utility; they may not each compute per-member runtime or validity separately.
- Hydration/open flows may depend on shared runtime-aware reconstruction helpers; they may not each rebuild member runtime overrides differently.
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
| `TeamRunConfig.memberOverrides[memberName].runtimeKind` | frontend member override state | optional per-member runtime override | `AgentRuntimeKind | undefined` | Undefined means “use team default runtime” |
| `evaluateTeamRunLaunchReadiness(config, catalogs)` | frontend launch validity | derive blocking issues and `canLaunch` for the current team config | team config + runtime/model availability/catalog inputs | Shared pure rule behind workspace Run gating and defensive launch paths |
| `teamRunConfigStore.launchReadiness` | workspace launch-readiness boundary | expose the authoritative mixed-runtime-aware workspace readiness result | current `TeamRunConfig` | `RunConfigPanel` depends on this instead of a global-only boolean |
| shared frontend member config builder | frontend launch materialization | derive effective member runtime/model/config | team config + member identity | Shared owner for launch and temp contexts once readiness has passed |
| `reconstructTeamRunConfigFromMetadata(...)` | frontend config reconstruction | derive team default runtime and divergent member overrides | team metadata payload | Must preserve mixed-runtime truth |
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
| frontend member override runtime field | Yes | Yes | Low | Keep override semantics explicit and optional |
| shared frontend launch-readiness utility | Yes | Yes | Low | Keep blocking-state evaluation singular and shared |
| `teamRunConfigStore.launchReadiness` | Yes | Yes | Low | Keep workspace Run gating on the store boundary only |
| shared frontend member config builder | Yes | Yes | Low | Keep launch materialization singular |
| runtime-aware reconstruction | Yes | Yes | Low | Keep reopen/hydration truth in one owner |
| `TeamRunService.createTeamRun` | Yes | Yes | Low | Keep team-backend-kind resolution inside the service |
| `MemberTeamContextBuilder.build` | Yes | Yes | Low | Keep per-member bootstrap context singular and runtime-neutral |
| `MixedTeamManager.deliverInterAgentMessage` | Yes | Yes | Low | Require explicit sender/recipient names/ids in the request |
| `InterAgentMessageRouter.deliver` | Yes | Yes | Low | Do not accept implicit sender or recipient defaults |
| AutoByteus `communicationContext` | Yes | Yes | Medium | Keep it communication-only and avoid task-plan fields |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| frontend team default runtime | `TeamRunConfig.runtimeKind` | Yes | Low | Document clearly that it is the frontend team default runtime |
| frontend per-member runtime override | `MemberConfigOverride.runtimeKind` | Yes | Low | Keep it optional and override-only |
| frontend launch-readiness owner | `teamRunConfigStore.launchReadiness` over `teamRunLaunchReadiness` | Yes | Low | Keep workspace Run gating singular and explicit |
| frontend launch materialization owner | `teamRunMemberConfigBuilder` | Yes | Low | Keep it focused on effective member launch config |
| team-orchestration selector | `TeamBackendKind` | Yes | Low | Keep it team-boundary-only |
| mixed team orchestration owner | `MixedTeamManager` | Yes | Low | Keep “manager” only because it truly governs lifecycle |
| runtime-neutral standalone member contract | `MemberTeamContext` | Yes | Low | Keep it distinct from `TeamRunContext` |
| AutoByteus communication contract | `communicationContext` | Yes | Medium | Document clearly that it is communication-only |

## Applied Patterns (If Any)

- **team default + member override frontend config pattern**
  - Lives in `TeamRunConfig.runtimeKind` plus `MemberConfigOverride.runtimeKind`.
  - Solves user-facing mixed-runtime launch UX without removing convenience.
- **shared frontend launch-readiness boundary**
  - Lives in `teamRunLaunchReadiness` plus `teamRunConfigStore.launchReadiness`.
  - Solves the invalid-inherited-default case and removes global-only Run gating.
- **shared frontend effective-config builder**
  - Lives in `teamRunMemberConfigBuilder`.
  - Solves duplicated launch materialization and same-runtime fanout bugs once readiness has passed.
- **separate team selector subject from member runtime subject**
  - Lives in `TeamBackendKind` vs `RuntimeKind`.
  - Solves DAR-001 cleanly.
- **runtime-neutral member bootstrap contract**
  - Lives in `MemberTeamContext` plus `MemberTeamContextBuilder`.
  - Solves DAR-002 cleanly.
- **runtime-neutral member execution + higher-level orchestration**
  - Lives in `AgentRunManager`/`AgentRun` plus `MixedTeamManager`.
  - Solves multi-runtime membership without pairwise runtime manager coupling.
- **canonical request + router owner**
  - Lives in `InterAgentMessageDeliveryRequest` + `InterAgentMessageRouter`.
  - Solves `send_message_to` unification.
- **runtime bootstrap policy owner**
  - Lives in `AutoByteusAgentRunBackendFactory` + `autobyteus-mixed-tool-exposure.ts`.
  - Solves DAR-003 cleanly.
- **scoped context injection**
  - Lives in native AutoByteus bootstrap and AutoByteus standalone runtime bootstrap.
  - Solves per-agent communication context without exposing full team runtime ownership everywhere.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | File | frontend team config model | team default + member override state | authoritative frontend config subject | launch orchestration |
| `autobyteus-web/composables/useRuntimeScopedModelSelection.ts` | File | shared frontend runtime/model helper | runtime-scoped provider/model loading, invalidation, and inherited-default state derivation | shared between global and member selectors | launch payload building |
| `autobyteus-web/utils/teamRunLaunchReadiness.ts` | File | shared frontend launch-readiness utility | structured mixed-runtime launch validity evaluation | one shared rule for blocking issues and `canLaunch` | direct UI mutation |
| `autobyteus-web/utils/teamRunMemberConfigBuilder.ts` | File | shared frontend launch builder | effective member launch materialization | one owner for launch/temp-context resolution after readiness passes | UI state mutation |
| `autobyteus-web/stores/teamRunConfigStore.ts` | File | workspace launch-readiness boundary | expose authoritative structured readiness for the current team config | current workspace config store is the right public boundary | direct payload materialization |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | File | workspace run-action boundary | Run-button gating and blocking message presentation over `teamRunConfigStore.launchReadiness` | concrete workspace launch entrypoint that must stay thin | inline mixed-runtime validity logic |
| `autobyteus-web/components/workspace/config/` | Folder | workspace team config UI | team default/member override UX plus Run-button presentation | user-facing mixed-runtime launch entrypoint | backend orchestration |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-backend-kind.ts` | File | team boundary domain | team-only selector | correct subject owner for DAR-001 | runtime-management policy |
| `autobyteus-server-ts/src/agent-team-execution/domain/member-team-context.ts` | File | team boundary domain | shared standalone member bootstrap contract | one shared team-member bootstrap subject | active team-manager lifecycle |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/` | Folder | mixed team backend subsystem | mixed team backend construction, context, manager, backend boundary | new mixed orchestration deserves a dedicated readable folder | runtime-specific member backend code |
| `autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/` | Folder | Codex runtime backend | Codex team-member bootstrap and send-message exposure over `MemberTeamContext` | DAR-002 ownership belongs with Codex runtime | mixed-team lifecycle |
| `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/` | Folder | Claude runtime backend | Claude team-member bootstrap and send-message exposure over `MemberTeamContext` | DAR-002 ownership belongs with Claude runtime | mixed-team lifecycle |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/` | Folder | AutoByteus runtime backend | mixed tool policy + communication-context injection | DAR-003 ownership belongs with AutoByteus runtime bootstrap | mixed-team lifecycle |
| `autobyteus-ts/src/agent-team/context/` | Folder | AutoByteus communication-context subsystem | communication context types and native scoped wrapper | keeps smaller contract near native team context code | runtime-specific server orchestration code |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/config/` | Main-Line Domain-Control | Yes | Low | This is the user-facing team launch configuration boundary |
| `autobyteus-web/composables/` | Off-Spine Concern | Yes | Medium | Keep only shared runtime/model selection logic here |
| `autobyteus-web/utils/` | Off-Spine Concern | Yes | Medium | Keep config semantics and launch materialization separate from UI |
| `agent-team-execution/backends/mixed/` | Main-Line Domain-Control | Yes | Low | This is the new main mixed-team owner cluster |
| `agent-team-execution/services/` | Off-Spine Concern | Yes | Medium | Keep only shared builder/router/restore helpers here; do not move manager lifecycle here |
| `agent-execution/backends/codex/team-communication/` | Runtime-Local Control | Yes | Low | Team-member bootstrap and runtime-local tool exposure are Codex runtime concerns |
| `agent-execution/backends/claude/team-communication/` | Runtime-Local Control | Yes | Low | Team-member bootstrap and runtime-local tool exposure are Claude runtime concerns |
| `agent-execution/backends/autobyteus/` | Runtime-Local Control | Yes | Low | Runtime bootstrap, tool filtering, and custom-data injection stay near AutoByteus backend |
| `autobyteus-ts/src/agent-team/context/` | Off-Spine Concern | Yes | Low | Communication context contract is a contextual support concern |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Frontend config shape | `TeamRunConfig { runtimeKind: 'codex_app_server', memberOverrides: { Reviewer: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'claude-sonnet' } } }` | one team runtime field with no member runtime override support | Shows how the app can preserve convenience and mixed-runtime truth together |
| Invalid inherited default row state | `team default = codex/gpt-5.4`, `Reviewer.override.runtimeKind = claude_agent_sdk`, row warning = 'Global model gpt-5.4 is unavailable for Claude; choose a reviewer model or clear the runtime override', Run button disabled | silently continue to display the team-default model as if the Reviewer could inherit it | Shows the missing DAR-004 user-facing case and why it must be blocking |
| Frontend launch readiness | `RunConfigPanel -> teamRunConfigStore.launchReadiness.canLaunch === false` until the row is resolved | `RunConfigPanel` checks only `!!config.llmModelIdentifier && !!config.workspaceId` | Shows why the workspace Run boundary must be retargeted |
| Frontend launch materialization | `member.runtimeKind = override.runtimeKind ?? team.runtimeKind` resolved once in a shared builder after readiness passes | same fallback logic repeated in each store/helper | Shows why one shared frontend owner is needed |
| Team selector subject split | `TeamRunConfig { teamBackendKind: TeamBackendKind.MIXED_MEMBER_RUNS, memberConfigs: [{ runtimeKind: RuntimeKind.CODEX_APP_SERVER }, { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK }] }` | `TeamRunConfig.runtimeKind = RuntimeKind.MIXED_TEAM` | Shows the team selector stays separate from member runtime identity |
| Runtime-neutral member bootstrap | `CodexThreadBootstrapper -> MemberTeamContext -> teammates + allowedRecipientNames -> dynamic send_message_to tool` | `Codex bootstrap applies only when teamContext.runtimeKind === RuntimeKind.CODEX_APP_SERVER` | Shows the corrected DAR-002 boundary |
| Mixed `send_message_to` flow | `tool hook -> TeamRun.deliverInterAgentMessage -> MixedTeamManager -> InterAgentMessageRouter -> recipient AgentRun.postUserMessage` | `AutoByteus tool -> AutoByteus team manager -> Codex team manager -> recipient runtime` | Shows the desired star topology instead of pairwise runtime coupling |
| AutoByteus communication context | `teamContext.communicationContext.members/self/dispatchInterAgentMessageRequest(...)` | raw `teamContext.teamManager` + native task-plan state for mixed runs | Shows how the smaller contract keeps mixed scope bounded |
| Mixed AutoByteus task-tool stripping | `AutoByteusAgentRunBackendFactory -> resolveMixedToolExposure(memberTeamContext, toolNames) -> instantiate filtered tools only` | `instantiate all tools, then hope mixed members never call task-plan tools` | Shows the explicit DAR-003 owner and timing |
| Recipient-visible message format | `You received a message from teammate 'Writer' (run id: run_123). Message type: direct_message. Message: ...` | raw message body only, sender identity hidden in metadata | Shows why canonical content formatting is necessary across all runtimes |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep frontend one-runtime launch UX and rely on backend-only mixed support | Smaller scope | Rejected | Add per-member runtime selection to the workspace team run form |
| Keep the old global-only `teamRunConfigStore.isConfigured` Run gating | Smaller frontend change | Rejected | Replace it with structured mixed-runtime-aware launch readiness owned by `teamRunConfigStore` over a shared readiness utility |
| Overload `RuntimeKind` with a mixed team selector | Initially looked like the smallest backend path | Rejected | Introduce `TeamBackendKind` and keep `RuntimeKind` member-only |
| Keep raw `TeamRunContext` as the standalone member bootstrap contract | Would have reduced type churn | Rejected | Introduce `MemberTeamContext` and stop passing whole team-run context into member bootstraps |
| Keep Codex/Claude team-member bootstrap under team-backend folders with same-runtime guards | Smaller local edit | Rejected | Move runtime-specific member communication/bootstrap ownership under runtime backends |
| Delegate mixed-team routing through existing runtime-specific team managers | Might have reduced initial code volume | Rejected | Mixed teams go straight to `MixedTeamManager` over `AgentRun` |
| Keep metadata-only mixed inter-agent delivery and let runtimes infer sender identity | Smaller change to builders | Rejected | Canonical content formatter embeds sender identity into recipient-visible text |
| Add task-plan compatibility to mixed path immediately | Convenience | Rejected | Communication-only v1 plus explicit mixed AutoByteus task-tool stripping |

## Derived Layering (If Useful)

- **Frontend config layer**: `TeamRunConfig`, `TeamRunConfigForm`, `MemberOverrideItem`
- **Frontend shared readiness/materialization layer**: runtime/model selection helper, `teamRunConfigUtils`, `teamRunLaunchReadiness`, `teamRunMemberConfigBuilder`
- **Frontend workspace boundary layer**: `teamRunConfigStore`, `RunConfigPanel`
- **Frontend orchestration layer**: `agentTeamRunStore`, `agentTeamContextsStore`, open/hydration flows
- **Team entry layer**: `TeamRunService`, `AgentTeamRunManager`, `TeamBackendKind`
- **Mixed team governing layer**: `MixedTeamRunBackendFactory`, `MixedTeamManager`, `MixedTeamRunBackend`
- **Shared team helper layer**: `MemberTeamContextBuilder`, `InterAgentMessageRouter`, message builders, restore context helpers
- **Member execution layer**: `AgentRunManager`, `AgentRun`, runtime backends
- **Runtime-local communication/bootstrap layer**: Codex/Claude runtime team-member bootstrap folders; AutoByteus standalone runtime bootstrap, mixed tool filter, and communication-context injection
- **Runtime consumer layer**: AutoByteus `communicationContext` consumers

## Migration / Refactor Sequence

1. **Expand frontend config model for per-member runtime override**
   - Add `runtimeKind?: AgentRuntimeKind` to `MemberConfigOverride`.
   - Update clone/template helpers and meaningful-override checks.
2. **Add shared frontend owners for runtime/model state, launch readiness, and effective member launch resolution**
   - Introduce `useRuntimeScopedModelSelection.ts`.
   - Introduce `teamRunLaunchReadiness.ts`.
   - Introduce `teamRunMemberConfigBuilder.ts`.
   - Update `teamRunConfigUtils.ts` with runtime-aware override/reconstruction helpers.
3. **Implement workspace per-member runtime override UX and blocking unresolved-row behavior**
   - Update `MemberOverrideItem.vue` to edit runtime override with inherit-global behavior.
   - When a member runtime override invalidates the inherited team-default model/config, surface the blocking row warning and require either a compatible member model or removal of the runtime override.
   - Update `TeamRunConfigForm.vue` to wire the new row-level state and keep overrides minimal.
4. **Retarget workspace launch readiness to the store boundary**
   - Replace the old global-only `teamRunConfigStore.isConfigured` rule with structured `launchReadiness` driven by `teamRunLaunchReadiness.ts`.
   - Update `RunConfigPanel.vue` to consume that structured readiness boundary for Run-button disabled state and blocking feedback.
   - Update `teamRunConfigStore.spec.ts` and `RunConfigPanel.spec.ts` for the unresolved mixed-runtime case.
5. **Update frontend launch and temp-context materialization**
   - Update `agentTeamRunStore.ts`, `agentTeamContextsStore.ts`, and `applicationLaunch.ts` to consume the shared builder and shared readiness rule.
   - Remove inline same-runtime fanout logic.
6. **Update frontend reopen/hydration truthfulness**
   - Update `teamRunConfigUtils.ts` reconstruction.
   - Update run-open and hydration flows/tests so mixed runtime stays visible in the app.
7. **Split the backend team selector subject from member runtime**
   - Add `TeamBackendKind`.
   - Replace top-level team `runtimeKind` fields/usages in `TeamRunConfig`, `TeamRunContext`, `TeamRunBackend`, `TeamRun`, `TeamRunService`, and `AgentTeamRunManager` with `teamBackendKind`.
   - Keep member `runtimeKind` unchanged.
8. **Introduce the runtime-neutral standalone member bootstrap contract**
   - Add `MemberTeamContext` and `MemberTeamContextBuilder`.
   - Replace `AgentRunConfig.teamContext` with `memberTeamContext`.
   - Update same-runtime Codex/Claude team managers and the future mixed manager to build `MemberTeamContext` for standalone member runs.
9. **Add the mixed team backend path**
   - Add mixed backend/context/factory/manager files.
   - Update `TeamRunService` create/restore resolution so multi-runtime member sets select `TeamBackendKind.MIXED_MEMBER_RUNS` instead of throwing.
   - Update restore runtime-context reconstruction to emit `MixedTeamRunContext` when persisted member runtimes differ.
10. **Retarget Codex runtime-owned member communication/bootstrap**
   - Add runtime-owned Codex team-member bootstrap files under `agent-execution/backends/codex/team-communication/`.
   - Update `codex-thread-bootstrapper.ts` to use them.
   - Remove the old team-owned Codex standalone bootstrap strategy file.
11. **Retarget Claude runtime-owned member communication/bootstrap**
    - Add runtime-owned Claude team-member bootstrap files under `agent-execution/backends/claude/team-communication/`.
    - Update `claude-agent-run-context.ts`, `claude-session-bootstrapper.ts`, Claude MCP/send-message builders, and `ClaudeSession` to use `memberTeamContext`.
    - Remove the old team-owned Claude standalone bootstrap strategy file.
12. **Implement the shared mixed inter-agent router and canonical delivery builders**
    - Add `InterAgentMessageRouter`.
    - Update `inter-agent-message-runtime-builders.ts` so recipient-visible content includes sender identity.
    - Wire `MixedTeamManager.deliverInterAgentMessage(...)` through the router.
13. **Refactor AutoByteus communication to a shared communication context**
    - Add `team-communication-context.ts` in `autobyteus-ts`.
    - Add `create-scoped-native-team-context.ts`.
    - Update native bootstrap step to inject the scoped wrapper.
    - Update `send-message-to.ts`, `inter-agent-message-event-handler.ts`, and `team-manifest-injector-processor.ts` to use `communicationContext`.
14. **Implement mixed AutoByteus runtime bootstrap policy**
    - Add `autobyteus-mixed-tool-exposure.ts` and `autobyteus-team-communication-context-builder.ts`.
    - Update `AutoByteusAgentRunBackendFactory` to filter out `ToolCategory.TASK_MANAGEMENT` when `memberTeamContext` indicates a mixed team, inject mixed communication context via `initialCustomData`, and ensure manifest processor presence when team context exists.
15. **Add tests**
    - workspace per-member runtime override UX,
    - unresolved mixed-runtime member-row warning behavior,
    - `teamRunConfigStore.launchReadiness` and `RunConfigPanel` Run-button gating for unresolved rows,
    - frontend launch payload mixed runtime fanout,
    - temporary team context mixed runtime,
    - frontend reopen/hydration mixed runtime reconstruction,
    - team-backend-kind selection for create/restore,
    - cross-runtime `send_message_to`,
    - Codex/Claude mixed-member bootstrap,
    - AutoByteus mixed send-message flow,
    - negative test that mixed AutoByteus members expose no `ToolCategory.TASK_MANAGEMENT` tools,
    - mixed restore.
15. **Do not migrate old single-runtime managers beyond the bootstrap-contract update**
    - They remain separate current-path owners.
    - Mixed team code must not reference them.

## Key Tradeoffs

- **team default + member override UX vs. member-only runtime config**
  - Chosen: team default plus member override.
  - Why: it preserves convenience for most users while still enabling mixed teams.
- **shared frontend materialization owner vs. updating each store/helper inline**
  - Chosen: shared owner.
  - Why: launch, temp-context, and app-launch flows already drifted once under duplicated logic.
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

- The workspace member override UX can become visually heavy for large teams if the row layout is not kept compact.
- The frontend runtime/model selection helper must correctly distinguish “stored override” from “effective runtime,” or runtime/model invalidation will behave confusingly.
- The team selector split touches several backend team-boundary files, so naming drift between `teamBackendKind` and member `runtimeKind` must be watched carefully.
- Moving Codex/Claude member communication/bootstrap ownership under runtime backend folders is the right design, but it increases the amount of path churn in the implementation.
- Category-level AutoByteus task-management stripping is intentionally blunt; if product later wants narrower mixed AutoByteus tool parity, that policy owner will need refinement.
- Restore remains a non-trivial slice even with communication-only scope because platform run ids and member runtime kinds must be reconstructed accurately.
- If canonical recipient-visible message formatting is too verbose or poorly worded, model behavior may degrade; the formatter needs careful wording and tests.

## Guidance For Implementation

- Treat `TeamRunConfig.runtimeKind` on the frontend as the **team default runtime** and `MemberConfigOverride.runtimeKind` as the **optional override**. Do not blur those meanings.
- Treat the shared frontend member config builder as the single owner of effective member launch resolution. Do not let each store/helper hand-roll `override ?? global` logic again.
- Treat reopen/hydration runtime reconstruction as equally important to initial launch UX; otherwise the app becomes misleading immediately after launch.
- Treat `TeamBackendKind` as a strict team-boundary subject and `RuntimeKind` as a strict member-runtime subject. Do not blur them again.
- Treat `MemberTeamContextBuilder` as the single owner of standalone member team bootstrap data; do not let Codex/Claude/AutoByteus re-derive teammate lists independently.
- Treat `MixedTeamManager` as the single mixed-team owner; do not let helper files accumulate lifecycle ownership.
- Keep `InterAgentMessageRouter` singular and authoritative for mixed `send_message_to` semantics.
- Keep `communicationContext` intentionally small. Do not add task-plan or mutable team runtime state to it in this change.
- Keep `AutoByteusAgentRunBackendFactory` as the sole owner that filters mixed AutoByteus task-management tools before exposure.
- Add frontend regression coverage before claiming the ticket closes, because the user explicitly reopened scope due to missing app UX.
