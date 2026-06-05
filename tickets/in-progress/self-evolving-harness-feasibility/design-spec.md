# Design Spec — Manual-First Skill Self-Evolution MVP

## Current-State Read

The current AutoByteus codebase already has most of the substrate needed for skill-first self-evolution, but it does not yet have one authoritative self-evolution workflow owner.

Relevant current owners and facts:

- **Run evidence / traces**
  - Standalone run metadata and memory live under `memory/agents/<runId>/`.
  - Team member memory lives under `memory/agent_teams/<teamRunId>/<memberRunId>/`.
  - `RunMemoryFileStore`, `AgentMemoryService`, and `LocalMemoryRunViewProjectionProvider` can read raw traces and normalized run-history views.
  - Current run metadata records `agentDefinitionId`, `workspaceRootPath`, runtime/model, `skillAccessMode`, and memory directory. The MVP must add a run-start snapshot of the **effective self-evolution config** so later manual actions use the run's launch-time eligibility. Exact resolved skill-root/hash snapshots remain deferred; the MVP resolves current configured skill roots at evolution time and records that limitation.

- **Skill resolution / files**
  - `SkillService.resolveConfiguredSkillsForAgent(definition)` maps `AgentDefinition.skillNames` to concrete `Skill.rootPath` values.
  - Skills can live under app-data, agent-private/team-shared directories, and additional agent package roots from `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`.
  - Runtime skill loading caches skill objects; active runs may not automatically re-read edited skill-root content.

- **Visible helper-run precedent**
  - `ServerCompactionAgentRunner` launches the memory compactor as a normal visible `AgentRun` through `AgentRunService.createAgentRun(...)`.
  - It passes the parent run workspace root, falls back to parent runtime/model when the compactor has no explicit launch config, posts a task message, observes output, records activity, and terminates the helper run.
  - `CompactionAgentSettingsResolver` resolves selected helper agent settings and parent fallback context.

- **Feature/capability precedent**
  - `ApplicationCapabilityService` owns a typed backend capability boundary for whether Applications should be visible/routable.
  - Frontend code is expected to consume typed capability boundaries rather than generic server-settings rows for feature visibility.
  - `ServerSettingsService` remains the persistence substrate for settings.

- **Built-in helper agent precedent**
  - `BuiltInAgentBootstrapper` seeds built-in agent definitions from `autobyteus-server-ts/src/built-in-agents/templates/`.
  - The existing implementation is compaction-specific in its default-setting initialization (`getCompactionAgentDefinitionId`), so adding a second built-in helper agent should generalize this setting-default path rather than copy/paste compaction-specific logic.

- **Existing shell tool**
  - `run_bash` is registered in `autobyteus-ts/src/tools/register-tools.ts` via `registerRunBashTool()`.
  - `autobyteus-ts/src/tools/terminal/tools/run-bash.ts` defines the tool name as `run_bash`, supports optional `cwd`, and its schema/description allows absolute working directories and absolute paths.

The final MVP product direction intentionally favors a simple feature-gated direct-edit loop over a custom proposal/patch/apply toolchain:

```text
Manual trigger -> visible self-evolver agent -> autoExecuteTools true -> run_bash edits files inside exact target skill roots -> target notification/reload -> Git-backed manual inspect/revert during testing
```

Constraints the design must respect:

- The global feature is off by default and controls UI visibility.
- Manual trigger is the only implemented trigger strategy.
- Scheduled/signal strategies must be represented as future not-implemented placeholders.
- The evolver must run as a separate visible helper agent, not as a member of the target's business team.
- The default evolver uses the target workspace context and runtime/model fallback when it has no explicit launch config.
- The evolver gets `autoExecuteTools: true` and access to existing `run_bash`.
- The service supplies exact absolute target skill root directories plus each root's primary `SKILL.md` path because skills may live outside the target workspace root and may contain supporting files.
- MVP direct edits are scoped to files inside exact target skill root directories; non-skill-root mutation remains out of scope.
- Rollback/testing is Git-backed; no custom service-mediated patch apply is required in MVP.

## Intended Change

Add a manual-first self-evolution capability that lets a user improve an agent/team member from a selected run.

The implemented MVP behavior:

1. A global self-evolution capability is disabled by default.
2. When disabled, self-evolution controls are hidden from Settings-facing run-launch/team-run launch configuration and run-history UI.
3. When enabled, users can mark individual standalone run launches and team-run/member launches as eligible for self-evolution. At run launch the system snapshots the effective self-evolution run config; run-detail manual actions read that snapshot, not mutable current agent/team definitions.
4. Eligible standalone runs expose `Improve from this run`.
5. Eligible team runs expose member-scoped `Improve this member from this run`; full-team evolution is deferred.
6. Clicking the action creates a self-evolution request using `ManualTriggerStrategy`.
7. `SelfEvolutionService` resolves target run evidence, target agent definition, configured skill targets, and exact absolute skill root paths plus primary `SKILL.md` paths.
8. `SingleAgentEvolverStrategy` launches the configured/default self-evolver agent as a normal visible agent run.
9. The evolver run inherits target workspace context and runtime/model fallback unless the selected evolver agent has explicit default launch config.
10. The evolver run uses `autoExecuteTools: true` and the default self-evolver agent includes `run_bash` in `toolNames`.
11. The evolver task message gives an anonymized human-readable work-history digest plus exact editable skill roots, and instructs the agent to edit only files inside those root directories if a reusable improvement is warranted.
12. After the evolver finishes, the service records minimal provenance linking the source run, visible evolver run, target skill roots, and notification outcome.
13. The service emits a target skill-update notification/reload request after successful evolver completion. Future runs naturally load any edited skill-root content; active run refresh remains best-effort/queued.
14. Dedicated change auditing and metrics/reporting services are deferred from MVP; the visible evolver run and Git-backed manual inspection are the initial review surface.

Non-goals for this design:

- No scheduled/cron trigger implementation.
- No signal-based trigger implementation.
- No evolver agent team implementation.
- No custom `emit_skill_change`, `apply_skill_update`, diff/proposal tool, change-audit recorder, or metrics/reporting service.
- No mutation of tools, MCP config, model weights, repository code outside explicit target skill root directories, agent/team instructions, or memory lessons.
- No service-mediated patch validation/apply path in MVP.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Feature.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes, for self-evolution orchestration. The substrate exists, but there is no authoritative owner that connects run evidence, skill-root resolution, visible evolver launch, provenance, and target notification.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / Duplicated Policy Or Coordination.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, but bounded. Core runtime refactor is deferred. Required-now refactor is limited to generalizing built-in helper-agent setting initialization and adding explicit self-evolution ownership boundaries instead of scattering logic across GraphQL/UI/run services.
- Evidence:
  - `ServerCompactionAgentRunner` already demonstrates visible helper-run orchestration, runtime/model fallback, and task-message execution.
  - `ConfiguredAgentSkillResolver` / `SkillService` already resolve configured skills but no self-evolution service owns using that resolution for learning.
  - `ApplicationCapabilityService` shows the correct typed capability boundary pattern for global feature visibility.
  - `BuiltInAgentBootstrapper` currently has compactor-specific default-setting logic and would become duplicated policy if a skill-evolver agent were added by another hardcoded branch.
- Design response:
  - Create a new `self-evolution` subsystem that owns capability, settings resolution, trigger/evolver strategy selection, target context resolution, visible evolver launch, run recording, and target notification.
  - Reuse `AgentRunService`, `SkillService`, run memory services, server settings, built-in agent bootstrapping, and existing `run_bash`.
  - Add target/run config types plus an explicit effective-config resolver/snapshot so self-evolution eligibility is not inferred differently by UI, GraphQL, and run services.
- Refactor rationale:
  - A small built-in-agent bootstrapper refactor prevents compaction-specific logic from becoming duplicated when seeding the skill evolver.
  - A new self-evolution service boundary prevents GraphQL/UI code from directly combining settings, run metadata, skill resolver, memory files, helper-run creation, and notification.
- Intentional deferrals and residual risk, if any:
  - Direct skill-root edits bypass service-mediated validation and post-run auditing. This is accepted for MVP because the feature is off by default, manually triggered, visible, instruction-scoped to exact roots, and intended for Git-backed testing first.
  - Active-run skill cache reload is best-effort/queued; next-run correctness is the MVP correctness baseline.
  - Effective self-evolution config snapshots are required at run launch. Exact resolved skill binding snapshots at original run start are still deferred; the MVP resolves current configured skill roots and records this historical-accuracy limitation.
  - Stricter service-mediated proposal/apply, change auditing, or formal metrics may be added later as separate strategies/services after testing proves the direct-edit loop valuable.

## Terminology

- **Self-evolution capability**: global backend capability controlling whether the product exposes self-evolution UI and mutations. Disabled by default.
- **Target**: the standalone agent run or team member run whose traces and configured skills are used for evolution.
- **Target skill root**: an exact absolute skill directory resolved from the target agent definition's configured skills. It must contain a primary `SKILL.md` and may contain supporting files. This directory, not only the `SKILL.md` file, is the MVP editable boundary.
- **Trigger strategy**: how an evolution request is created. MVP implements only `manual_only`.
- **Evolver strategy**: who/how performs the evolution work. MVP implements `single_agent`.
- **Evolver run**: a normal visible `AgentRun` created for the self-evolver agent.
- **Evolution request**: service-owned command containing target identity, evidence scope, strategy names, and launch context.
- **Evolution run record**: minimal durable provenance record linking target run, visible evolver run, skill roots, runtime/model, status, and target notification outcome.
- **Self-evolution run config override**: optional partial config on a standalone run launch, team-run launch, or team-member launch. It only overrides fields it explicitly sets. It is not an intrinsic agent/team definition attribute.
- **Effective self-evolution config**: complete launch-time config snapshot stored in run metadata after resolving the default disabled config plus standalone/team run-launch overrides.
- **Harness-updating vs harness-benefit**: paper concepts that remain important for future evaluation, but are not implemented as a dedicated MVP metrics service.

## Design Reading Order

1. Data-flow spine inventory.
2. Ownership map and service boundaries.
3. Strategy catalogs and launch flow.
4. Domain data structures.
5. File/folder mapping.
6. Migration/refactor sequence and validation guidance.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Existing behavior has no self-evolution path to preserve.
- Avoid adding compatibility wrappers or alternate old/new self-evolution paths.
- Optional/absent `selfEvolution` config must normalize to the single canonical disabled state. This is not a legacy compatibility path; it is the canonical default for old agent/team config files that do not yet contain self-evolution configuration.
- Generalize built-in-agent default setting initialization rather than keeping compactor-specific logic and adding a second hardcoded branch.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Settings UI / startup capability query | Self-evolution controls hidden or visible | `SelfEvolutionCapabilityService` | Feature must be off by default and exposed through a typed capability boundary. |
| DS-002 | Primary End-to-End | User clicks `Improve from this run` on standalone run | Visible evolver run edits files inside target skill roots and target is notified | `SelfEvolutionService` | Core MVP business flow. |
| DS-003 | Primary End-to-End | User clicks `Improve this member from this run` on team run | Visible evolver run edits files inside selected member skill roots and target/member is notified | `SelfEvolutionService` | Same core flow but with explicit team/member identity. |
| DS-004 | Primary End-to-End | Built-in agent bootstrap | Default skill evolver agent and setting selected | `BuiltInAgentBootstrapper` | The self-evolver should be a normal visible/configurable agent, like compaction. |
| DS-005 | Return-Event | Evolver run completes/terminates | Minimal evolution record finalized and target update notification emitted | `SelfEvolutionService` | The visible helper run is the review surface; the service records linkage and notification only. |
| DS-006 | Primary End-to-End | Manual GraphQL start command | Canonical `EvolutionRequest` or not-implemented rejection | `ManualTriggerStrategy` / `SelfEvolutionTriggerStrategyCatalog` | Makes `manual_only` a real trigger strategy and gives scheduled/signal future entrypoints the same request contract. |
| DS-008 | Primary End-to-End | Standalone/team run launch config | Effective self-evolution run config snapshot in run/member metadata | `SelfEvolutionEffectiveConfigResolver` | Prevents UI/start mutations from reinterpreting mutable definition config after a run already happened. |

## Primary Execution Spine(s)

### DS-001 Capability / visibility spine

`Frontend capability store -> SelfEvolutionResolver.selfEvolutionCapability -> SelfEvolutionCapabilityService -> ServerSettingsService -> UI visibility decision`

### DS-002 Standalone run self-evolution spine

`Run detail UI -> SelfEvolutionResolver.startAgentRunSelfEvolution -> SelfEvolutionService -> TargetRunContextResolver -> SkillTargetResolver / EvidenceBuilder -> SingleAgentEvolverStrategy -> AgentRunService.createAgentRun -> EvolverAgent(run_bash edits files inside listed skill roots) -> TargetNotificationService`

### DS-003 Team member self-evolution spine

`Team run detail UI -> SelfEvolutionResolver.startTeamMemberSelfEvolution -> SelfEvolutionService -> TeamMemberTargetContextResolver -> SkillTargetResolver / EvidenceBuilder -> SingleAgentEvolverStrategy -> AgentRunService.createAgentRun -> EvolverAgent(run_bash edits files inside selected member skill roots) -> TargetNotificationService`

### DS-004 Built-in evolver bootstrap spine

`Server startup -> BuiltInAgentBootstrapper -> skill-evolver template -> AgentDefinitionService cache refresh -> SelfEvolutionSettingsService default evolver setting`

### DS-006 Manual trigger request spine

`Run detail UI manual action -> SelfEvolutionResolver.startAgentRunSelfEvolution/startTeamMemberSelfEvolution -> ManualTriggerStrategy.createRequest -> SelfEvolutionService.startFromEvolutionRequest -> normal target/evidence/skill/evolver path`

Future scheduled/signal dispatchers must enter at `SelfEvolutionTriggerStrategy.createRequest(...)` and then call `SelfEvolutionService.startFromEvolutionRequest(...)`; they must not create parallel self-evolution launch flows.

### DS-008 Effective config snapshot spine

`Standalone/team run launch config -> SelfEvolutionEffectiveConfigResolver -> AgentRunMetadata.selfEvolutionEffective / TeamRunMemberMetadata.selfEvolutionEffective -> eligibility query/manual start uses snapshot`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The frontend asks whether self-evolution is enabled. The capability service reads or initializes the explicit setting to `false` and returns a typed capability. UI hides all self-evolution controls when disabled. | Capability query, capability service, settings persistence, UI gate | `SelfEvolutionCapabilityService` | Server settings persistence, GraphQL object mapping, frontend store |
| DS-002 | A user manually starts evolution for a standalone run. The service validates global/target eligibility, resolves run metadata and configured skill roots, builds an anonymized evidence task, launches a visible single evolver agent with run_bash and auto-exec, records minimal helper-run linkage, and notifies/reloads the target after successful completion. | Manual action, self-evolution service, target context, skill roots, evolver run, notification | `SelfEvolutionService` | Evidence reading, settings resolution, helper-run event collection |
| DS-003 | A user manually starts evolution for a selected team member. The service uses explicit `teamRunId + memberRunId`, resolves member metadata and that member's configured skills, then follows the same visible evolver launch, minimal record, and notification path. | Team member action, self-evolution service, member context, skill roots, evolver run, notification | `SelfEvolutionService` | Team metadata flattening, member memory layout, member-scoped UI |
| DS-004 | Startup seeds the default self-evolver as a normal shared agent definition. If the default evolver setting is empty and the seeded definition resolves, the bootstrapper stores the default agent ID. | Startup, built-in agent definition, settings default | `BuiltInAgentBootstrapper` | Template file copy, definition cache refresh, setting persistence |
| DS-005 | The evolver edits files directly, so the service does not apply a patch or audit changes. After final output/termination it records helper-run linkage and emits a notification/reload event. | Evolver completion, run record finalization, notification | `SelfEvolutionService` | Active-run lookup, SenderType.SYSTEM message construction |
| DS-006 | A manual click is the implemented trigger strategy. The resolver does transport mapping, then `ManualTriggerStrategy` converts the explicit target identity plus run snapshot into a canonical `EvolutionRequest`; scheduled/signal descriptors are visible but non-executable. | Manual command, trigger strategy, canonical request | `ManualTriggerStrategy` / `SelfEvolutionService` | GraphQL strategy catalog mapping, not-implemented rejection |
| DS-008 | At run launch, run-launch config overrides are resolved into one complete effective self-evolution config. Later eligibility and start mutations read that snapshot, so changing an agent/team definition after a run does not retroactively change whether that old run is eligible. | Run-launch config, effective config resolver, run metadata snapshot | `SelfEvolutionEffectiveConfigResolver` | Existing standalone/team run-launch inputs |

## Spine Actors / Main-Line Nodes

- `SelfEvolutionCapabilityService`
- `SelfEvolutionResolver`
- `SelfEvolutionService`
- `SelfEvolutionEffectiveConfigResolver`
- `ManualTriggerStrategy`
- `SelfEvolutionTargetContextResolver`
- `SelfEvolutionSkillTargetResolver`
- `SelfEvolutionEvidenceBuilder`
- `SelfEvolverAgentSettingsResolver`
- `SingleAgentEvolverStrategy`
- `AgentRunService`
- `EvolverAgent` as a normal `AgentRun`
- `SelfEvolutionTargetNotificationService`
- `BuiltInAgentBootstrapper`

## Ownership Map

| Main-Line Node | Owns |
| --- | --- |
| `SelfEvolutionCapabilityService` | Global feature-enabled answer, default-disabled initialization, typed capability contract. |
| `SelfEvolutionResolver` | GraphQL transport mapping only. It must not resolve traces, skills, or settings directly. |
| `SelfEvolutionService` | End-to-end self-evolution request lifecycle, eligibility checks, strategy selection, minimal provenance record creation/finalization, and target notification sequencing. |
| `SelfEvolutionEffectiveConfigResolver` | Resolving run-launch config overrides into complete effective config snapshots for standalone runs and team member runs. |
| `ManualTriggerStrategy` | The executable `manual_only` trigger: converts explicit manual GraphQL commands and run metadata snapshots into canonical evolution requests. |
| `SelfEvolutionTargetContextResolver` | Mapping explicit target identities to run metadata, workspace/runtime/model fallback context, memory paths, effective self-evolution config snapshot, and target agent definitions. |
| `SelfEvolutionSkillTargetResolver` | Resolving configured target skills to exact absolute skill root paths plus primary `SKILL.md` paths and target metadata. |
| `SelfEvolutionEvidenceBuilder` | Building the evolution evidence package from anonymized work-history projection plus provenance references. |
| `SelfEvolutionWorkHistoryProjector` | Rendering raw traces/run projections into human-readable, anonymized work-history evidence, modeled after compaction prompt projection. |
| `SelfEvolverAgentSettingsResolver` | Resolving the selected evolver agent definition and effective runtime/model fallback. |
| `SingleAgentEvolverStrategy` | Creating the visible evolver `AgentRun`, posting the evolution task message, observing completion/failure, and returning run metadata to `SelfEvolutionService`. |
| `SelfEvolutionTargetNotificationService` | Best-effort active target notification/reload request after successful evolver completion. |
| `BuiltInAgentBootstrapper` | Seeding built-in agent definitions and initializing default helper-agent settings generically. |

`SelfEvolutionService` is the authoritative boundary for self-evolution. Upstream callers must not call `AgentRunService`, `SkillService`, memory readers, and settings services independently to assemble an evolution run.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `SelfEvolutionResolver` | `SelfEvolutionService` / `SelfEvolutionCapabilityService` | GraphQL transport boundary. | Strategy selection, skill resolution, evidence reading, helper-run creation, or settings policy. |
| Frontend self-evolution store/composable | GraphQL `SelfEvolutionResolver` | UI state/query wrapper. | Feature gate truth, target eligibility rules, or run creation. |
| `SelfEvolutionCapabilityResolver` if split from main resolver | `SelfEvolutionCapabilityService` | Capability-specific GraphQL mapping. | Generic server setting interpretation. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Compaction-specific built-in-agent default-setting path in `BuiltInAgentBootstrapper` | Adding skill evolver would otherwise duplicate a hardcoded branch for every helper agent. | Generic built-in-agent setting default initialization based on setting key and `ServerSettingsService.getSettingValue`. | In This Change | Existing compactor default still works through the generic path. |
| Any planned custom evolver patch/proposal tools from earlier investigation | MVP direct-edit strategy intentionally uses existing `run_bash`. | `SingleAgentEvolverStrategy` + exact skill roots + visible evolver run history. | In This Change | Do not add `emit_skill_change`, `apply_skill_update`, or custom diff schema. |
| UI reading generic server settings for self-evolution visibility | Feature visibility should use typed capability boundary. | Frontend self-evolution capability store calling GraphQL capability. | In This Change | Mirrors Applications capability pattern. |
| Full-team self-evolution action | Too broad for MVP; member-scoped action keeps identity explicit. | Team member self-evolution action. | Follow-up | Full-team evolution can be future evolver/team strategy. |
| Scheduled/signal execution paths | Not implemented in MVP. | Strategy descriptors marked `not_implemented`. | Follow-up | Catalog remains visible for roadmap/architecture. |

## Return Or Event Spine(s) (If Applicable)

### DS-005 Evolver completion / notification spine

`Evolver AgentRun events -> SingleAgentEvolverStrategy completion collector -> SelfEvolutionService finalizes minimal record -> SelfEvolutionTargetNotificationService -> active target run SenderType.SYSTEM message / next-run fallback`

Narrative:

The evolver run is a normal visible run. The self-evolution service should not parse every tool call as an apply contract and should not add a redundant file-change audit. It only needs to know whether the helper run completed, failed, or timed out. On successful completion it records the visible evolver run linkage and sends a concise target notification/reload request.

## Bounded Local / Internal Spines (If Applicable)

| Parent Owner | Bounded Local Spine | Why It Matters |
| --- | --- | --- |
| `SelfEvolutionService` | `check capability -> resolve strategy descriptors -> reject not implemented -> create request` | Prevents scheduled/signal placeholders from accidentally executing. |
| `SingleAgentEvolverStrategy` | `create AgentRun -> subscribe events -> post task -> wait final/timeout -> terminate or leave visible per policy -> return result` | Mirrors compaction helper-run lifecycle and keeps launch mechanics in one owner. |
| `SelfEvolutionTargetNotificationService` | `find active target -> if idle post system notification -> if busy queue/skips -> else next-run only` | Active-run adoption is best effort; next-run correctness remains baseline. |

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Server setting persistence | DS-001, DS-004 | Capability/settings services | Store enabled flag and default evolver agent ID. | Existing persistence substrate. | UI/services would reimplement setting parsing and defaults. |
| Strategy catalog descriptors | DS-006 | `SelfEvolutionService` | Advertise implemented/not-implemented trigger/evolver strategies. | Preserves future roadmap without implementing it. | Scheduled/signal could become accidental hidden behavior. |
| Run metadata reading | DS-002, DS-003 | Target context resolver | Read target run/team/member metadata. | Identifies agent definition, runtime/model, workspace, memory. | Service would mix storage details into orchestration. |
| Trace/evidence reading | DS-002, DS-003 | Evidence builder | Build anonymized evidence/task context from memory. | Keeps prompt construction bounded and reusable. | Evolver prompt assembly would sprawl across service/resolver. |
| Work-history projection/anonymization | DS-002, DS-003 | Evidence builder | Convert raw traces/projections into role-labeled work history, tool outcome digests, feedback signals, and redacted entities. | Evolver should reason over understandable experience, not raw internal event payloads. | Raw turn/tool IDs and private data would leak into the prompt and durable skills. |
| Skill root resolution | DS-002, DS-003 | Skill target resolver | Convert target definition's configured skills into exact editable skill root directories plus primary `SKILL.md` paths. | Direct-edit MVP requires exact absolute roots. | Evolver might edit wrong files or workspace symlinks. |
| Evolver settings resolution | DS-002, DS-003 | Single-agent strategy | Resolve default evolver agent and runtime/model fallback. | Mirrors compaction behavior. | Helper-run creation would duplicate fallback rules. |
| Target notification | DS-005 | Self-evolution service | Notify active/inactive targets after successful evolver completion. | Separates helper-run completion from runtime adoption. | Evolver might message target as teammate or mutate team topology. |
| Effective config resolution | DS-008 | SelfEvolutionService and run launch paths | Resolve partial overrides and snapshot complete config. | Eligibility must be stable for a historical run. | UI/start mutations would reinterpret mutable definitions inconsistently. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Global feature visibility | Application capability pattern / server settings | Create New using same pattern | Self-evolution has its own setting and defaults; do not overload Applications capability. | Applications capability owns only Applications module visibility. |
| Helper agent launch | Agent execution / compaction pattern | Reuse / Extend pattern | `AgentRunService` already creates visible helper runs; compaction establishes parent fallback pattern. | New service owns evolution orchestration, not runtime creation internals. |
| Built-in helper agent seeding | Built-in agents subsystem | Extend | Self-evolver is a normal built-in agent like memory compactor. | Creating ad hoc agent files outside bootstrap would fragment defaults. |
| Target run memory | Agent memory / run history | Reuse | Evidence already lives in raw trace stores/projections. | No new trace storage needed. |
| Human-readable evidence projection | Compaction prompt builders / run-history projection | Extend pattern | Compaction already renders messages/tool outcomes as useful summaries and explicitly omits bookkeeping identifiers. | Self-evolution needs a specialized projector because it looks for improvement signals, not compact memory JSON. |
| Configured skill resolution | Skills subsystem | Reuse | `SkillService` already maps agent definition skill names to paths. | New direct filesystem scan would bypass configured skill semantics. |
| Shell editing | Existing `run_bash` tool | Reuse | User explicitly wants no custom tools; `run_bash` already supports absolute paths. | Custom tools would overcomplicate MVP. |
| Active run notification | Agent run posting / SenderType.SYSTEM | Reuse | Existing `postUserMessage` can deliver system notifications. | Full runtime cache reload can be future work. |
| Effective config snapshot | Run-launch config and run/member metadata | Extend | Run-launch inputs and run metadata are the right surfaces; agent/team definitions do not own self-evolution eligibility. | A new independent settings table would not match target/run identity. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `self-evolution` | Capability, settings, effective config resolution, manual trigger request creation, request lifecycle, target resolution, strategies, minimal run records, and notification. | DS-001, DS-002, DS-003, DS-005, DS-006, DS-008 | `SelfEvolutionService` | Create New | New top-level server subsystem. |
| `agent-execution` | Visible evolver agent run creation and posting task message. | DS-002, DS-003 | `SingleAgentEvolverStrategy` | Reuse | Do not create a special hidden runtime. |
| `agent-team-execution` / run history | Team member identity and metadata. | DS-003 | Target context resolver | Reuse | Member-scoped only. |
| `skills` | Configured skill resolution and skill metadata. | DS-002, DS-003 | Skill target resolver | Reuse | Direct edit uses resolved paths, not service apply. |
| `built-in-agents` | Built-in default self-evolver template and setting initialization. | DS-004 | Bootstrapper | Extend | Generalize setting-default support. |
| `api/graphql` | Typed transport boundary. | DS-001, DS-002, DS-003, DS-006 | Resolvers | Extend | Add self-evolution resolver/types. |
| `autobyteus-web` | Capability store, settings toggle, target config UI, run action. | DS-001, DS-002, DS-003 | Frontend stores/components | Extend | Use typed capability, not generic setting rows. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/self-evolution/domain/models.ts` | self-evolution | Domain model | Target refs, config, strategy names/status, evolution record. | One coherent domain shape file. | Yes |
| `src/self-evolution/services/self-evolution-capability-service.ts` | self-evolution | Capability owner | Default-disabled capability read/update. | Mirrors Applications pattern. | Yes |
| `src/self-evolution/services/self-evolution-settings-service.ts` | self-evolution | Settings owner | Reads selected default evolver agent and default strategy values. | Keeps server-settings coupling behind self-evolution. | Yes |
| `src/self-evolution/services/self-evolution-effective-config-resolver.ts` | self-evolution | Effective config owner | Resolves standalone/team run-launch config and produces launch-time snapshots. | Prevents precedence duplication. | Yes |
| `src/self-evolution/services/self-evolution-service.ts` | self-evolution | Main lifecycle owner | Start standalone/team member evolution request. | Governing orchestration boundary. | Yes |
| `src/self-evolution/services/self-evolution-target-context-resolver.ts` | self-evolution | Target resolver | Resolve standalone/team member target metadata. | Explicit target identity owner. | Yes |
| `src/self-evolution/services/self-evolution-skill-target-resolver.ts` | self-evolution | Skill target resolver | Resolve configured skill roots and eligibility. | Direct-edit MVP requires exact paths. | Yes |
| `src/self-evolution/services/self-evolution-evidence-builder.ts` | self-evolution | Evidence builder | Build prompt/evidence package and provenance record. | Keeps prompt context separate from orchestration. | Yes |
| `src/self-evolution/services/self-evolution-work-history-projector.ts` | self-evolution | Work-history projector | Render anonymized human-readable evidence from traces/projections. | Mirrors compaction-style prompt projection for evolution. | Yes |
| `src/self-evolution/services/self-evolver-agent-settings-resolver.ts` | self-evolution | Evolver settings | Resolve evolver agent, runtime/model fallback. | Compaction analog. | Yes |
| `src/self-evolution/services/strategies/single-agent-evolver-strategy.ts` | self-evolution | Evolver strategy | Create/post/observe visible evolver run. | One executable evolver strategy. | Yes |
| `src/self-evolution/services/strategies/self-evolution-strategy-catalog.ts` | self-evolution | Strategy catalog | Implemented/not-implemented strategy descriptors. | Prevents placeholders from becoming hidden behavior. | Yes |
| `src/self-evolution/services/self-evolution-run-store.ts` | self-evolution | Persistence | Read/write run records and index. | Keeps provenance separate. | Yes |
| `src/self-evolution/services/self-evolution-target-notification-service.ts` | self-evolution | Notification | Send/queue target update message. | Separate runtime adoption concern. | Yes |
| `src/api/graphql/types/self-evolution.ts` | GraphQL | Transport | Queries/mutations/object types. | One resolver type file for feature. | Yes |
| `src/built-in-agents/templates/skill-evolver/*` | built-in agents | Template | Default self-evolver agent definition. | Normal agent template. | No |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Strategy names/status/descriptors | `self-evolution/domain/models.ts` or `strategy-catalog.ts` | self-evolution | Used by settings, GraphQL, service validation, UI. | Yes | Yes | Generic strategy registry for unrelated features. |
| Target identity | `self-evolution/domain/models.ts` | self-evolution | Used by resolver, service, target context, records. | Yes | Yes | Ambiguous string ID selector. |
| Skill target info | `self-evolution/domain/models.ts` | self-evolution | Used by task message and minimal run record. | Yes | Yes | Full `Skill` clone with unrelated fields. |
| Evolution run record | `self-evolution/domain/models.ts` | self-evolution | Used by store, GraphQL, service. | Yes | Yes | Kitchen-sink audit model for all agent runs. |
| Self-evolution config override/effective config | `self-evolution/domain/models.ts` | self-evolution | Used in run-launch inputs, run metadata, and UI. | Yes | Yes | Optional bag of future settings. |
| Manual trigger request | `self-evolution/domain/models.ts` | self-evolution | Used by GraphQL command, trigger strategy, and service. | Yes | Yes | Generic target selector. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `SelfEvolutionTargetRef` | Yes | Yes | Low | Use explicit variants for `agent_run` and `team_member_run`; do not accept generic `targetId`. |
| `SelfEvolutionRunConfigOverride` / `SelfEvolutionEffectiveConfig` | Yes | Yes | Low | Overrides are partial and scoped; effective config is complete and snapshot-friendly. No scheduled fields until scheduled strategy is implemented. |
| `SelfEvolutionStrategyDescriptor` | Yes | Yes | Low | Include `status: implemented | not_implemented`; no nullable handler fields. |
| `SelfEvolutionSkillTarget` | Yes | Yes | Low | Include `skillName`, `skillRootPath`, `skillMdPath`, and `isWritable`; do not add Git/change-audit fields in MVP. |
| `SelfEvolutionRunRecord` | Yes | Yes | Low | Keep only minimal provenance: target, source runs, visible evolver run, skill targets, status, and notification summary. Do not add change or metric fields in MVP. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/self-evolution/domain/models.ts` | self-evolution | Domain model | Target refs, config, strategy descriptors, skill targets, evolution request/result/record. | Central tight domain vocabulary for this subsystem. | N/A |
| `autobyteus-server-ts/src/self-evolution/domain/settings.ts` | self-evolution | Settings constants | Setting keys and normalization constants: `ENABLE_SELF_EVOLUTION`, `AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID`. | Separates constants from service logic. | Yes |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-capability-service.ts` | self-evolution | Capability service | Typed global capability, default false, set enabled. | Single owner for feature visibility. | Yes |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-settings-service.ts` | self-evolution | Settings facade | Read default evolver agent ID and expose strategy catalog defaults. | Keeps generic server settings behind typed boundary. | Yes |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-effective-config-resolver.ts` | self-evolution | Effective config resolver | Resolve standalone/team run-launch overrides into complete snapshots. | One owner for run-config snapshot precedence. | Yes |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-service.ts` | self-evolution | Main owner | Start standalone/team member evolution, coordinate resolvers, strategy, records, notification. | One authoritative lifecycle owner. | Yes |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-target-context-resolver.ts` | self-evolution | Target context resolver | Resolve target metadata for agent run and team member run. | Keeps target identity mapping explicit. | Yes |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-skill-target-resolver.ts` | self-evolution | Skill target resolver | Use `SkillService`/definitions to produce exact skill roots and eligibility. | Direct-edit path needs one trustworthy resolver. | Yes |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-evidence-builder.ts` | self-evolution | Evidence builder | Build task prompt/evidence package and minimal source-run linkage. | Prevents prompt construction from bloating service. | Yes |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-work-history-projector.ts` | self-evolution | Work-history projector | Convert raw traces/run projections into anonymized work-history evidence. | Keeps redaction and human-readable rendering reusable. | Yes |
| `autobyteus-server-ts/src/self-evolution/services/self-evolver-agent-settings-resolver.ts` | self-evolution | Evolver settings resolver | Resolve selected/default evolver agent, runtime/model fallback, and launch config. | Compaction-like logic deserves one owner. | Yes |
| `autobyteus-server-ts/src/self-evolution/services/strategies/self-evolution-strategy-catalog.ts` | self-evolution | Strategy catalog | Expose `manual_only`/`scheduled`/`signal_based` and `single_agent`/`agent_team` statuses. | Keeps placeholders explicit. | Yes |
| `autobyteus-server-ts/src/self-evolution/services/triggers/manual-trigger-strategy.ts` | self-evolution | Manual trigger strategy | Validate manual-only trigger source and create canonical `EvolutionRequest`. | Concrete trigger implementation boundary. | Yes |
| `autobyteus-server-ts/src/self-evolution/services/strategies/single-agent-evolver-strategy.ts` | self-evolution | Evolver strategy | Launch visible evolver run, post task, wait for completion/timeout. | Only executable evolver strategy in MVP. | Yes |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-run-store.ts` | self-evolution | Persistence | Store evolution records under memory/app-data. | Durable provenance owner. | Yes |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-target-notification-service.ts` | self-evolution | Notification | Post system notification / record next-run notification. | Keeps runtime adoption separate. | Yes |
| `autobyteus-server-ts/src/api/graphql/types/self-evolution.ts` | GraphQL | Resolver | Capability, strategy catalog, eligibility, start mutations, record query. | One transport surface for feature. | Yes |
| `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/agent.md` | built-in agents | Agent template | Default self-evolver prompt. | Normal built-in agent artifact. | No |
| `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/agent-config.json` | built-in agents | Agent config template | `toolNames: ["run_bash"]`, no default model. | Gives existing shell tool access and runtime/model fallback. | No |

## Ownership Boundaries

- `SelfEvolutionCapabilityService` is authoritative for global feature enablement. Frontend must not infer self-evolution visibility from generic server settings.
- `SelfEvolutionService` is authoritative for starting an evolution run. GraphQL/UI must not directly assemble target context, skills, evidence, and helper run creation.
- `SelfEvolutionEffectiveConfigResolver` is authoritative for resolving and snapshotting self-evolution eligibility/config precedence. UI and start mutations must not recompute effective config themselves.
- `ManualTriggerStrategy` is authoritative for the executable `manual_only` trigger conversion from explicit GraphQL command to canonical `EvolutionRequest`; future scheduled/signal dispatchers must use the same trigger-strategy interface.
- `SelfEvolutionSkillTargetResolver` is authoritative for skill root paths. The evolver prompt receives paths from this resolver; it must not be told to discover arbitrary skills by scanning the filesystem.
- `SingleAgentEvolverStrategy` owns helper-run creation mechanics; `SelfEvolutionService` owns lifecycle sequencing around it.
- `SelfEvolutionTargetNotificationService` owns post-update messaging and must not be implemented as normal team membership.
- Built-in self-evolver is a normal agent definition. It should not be hardcoded as a special runtime agent outside agent-definition systems.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `SelfEvolutionCapabilityService` | Server setting read/write/default false | GraphQL, frontend stores, settings UI | UI reading generic `ENABLE_SELF_EVOLUTION` setting row directly | Add capability fields/mutation. |
| `SelfEvolutionService` | Target resolver, skill resolver, evidence builder, strategy selection, run store, notifications | GraphQL resolver, future scheduler/signal dispatcher | Resolver calling `AgentRunService` plus `SkillService` plus memory store directly | Add service method for the use case. |
| `SelfEvolutionEffectiveConfigResolver` | Run-launch override merge and metadata snapshot shape | Run launch services, SelfEvolutionService | UI/start mutation recomputing eligibility from current agent/team definition files | Add resolver output fields or snapshot metadata. |
| `ManualTriggerStrategy` | Manual trigger validation and request creation | SelfEvolutionService / GraphQL resolver through service | Resolver constructing `EvolutionRequest` ad hoc | Add trigger strategy method/input fields. |
| `SelfEvolutionSkillTargetResolver` | Agent definition lookup, configured skill resolution, path normalization, writable classification | SelfEvolutionService | Evolver prompt or UI scanning skill directories itself | Add resolver output fields. |
| `SingleAgentEvolverStrategy` | `AgentRunService.createAgentRun`, event subscription, task post, timeout/termination policy | SelfEvolutionService | SelfEvolutionService manually reproducing helper-run lifecycle | Add strategy options. |
| `BuiltInAgentBootstrapper` | Template seeding, definition cache refresh, default setting initialization | Startup/bootstrap | Ad hoc creation of default evolver setting elsewhere | Generalize bootstrapper setting defaults. |

## Dependency Rules

Allowed:

- `SelfEvolutionResolver` may depend on `SelfEvolutionService` and `SelfEvolutionCapabilityService`.
- `SelfEvolutionService` may depend on self-evolution config resolver, trigger strategy, evolver strategies/stores, `AgentRunService`, run metadata services, `SkillService`, `AgentDefinitionService`, `TeamRunMetadataService`, and `AgentRunManager`/team run manager for notifications through dedicated owned services.
- `ManualTriggerStrategy` may depend only on domain validation, target ref shape, and run snapshot/config data passed into it; it must not read traces or launch agents.
- `SingleAgentEvolverStrategy` may depend on `AgentRunService` and `SelfEvolverAgentSettingsResolver`.
- `SelfEvolutionSkillTargetResolver` may depend on `AgentDefinitionService`, `SkillService`, and team metadata utilities.

Forbidden:

- Frontend must not use generic settings table to decide feature visibility.
- GraphQL resolver must not create the evolver run directly.
- Evolver must not be inserted into the target's business team by default.
- Scheduled/signal strategy descriptors must not silently execute before implementation.
- GraphQL resolvers must not construct `EvolutionRequest` directly; manual start flows through `ManualTriggerStrategy`.
- Eligibility queries/start mutations must not read current agent/team definition config for old runs when a run snapshot exists; the metadata snapshot is authoritative.
- UI must not claim downstream benefit from evolver completion; formal benefit reporting is deferred.
- Direct edit prompts must not say “edit any relevant files”; they must supply exact target skill root directories and instruct the evolver to stay within them.
- The default self-evolver agent must not hardcode a model; runtime/model fallback should follow compaction-style resolver behavior.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `selfEvolutionCapability()` | Self-evolution global capability | Return enabled/source/setting key/strategy catalog summary if useful. | None | Mirrors Applications capability. |
| `setSelfEvolutionEnabled(enabled)` | Self-evolution global capability | Persist global enabled state. | Boolean | Default is false if absent. |
| `selfEvolutionStrategyCatalog()` | Strategy catalog | Return trigger/evolver descriptors and statuses. | None | `scheduled`, `signal_based`, `agent_team` are `not_implemented`. |
| `getAgentRunSelfEvolutionEligibility(runId)` | Standalone target eligibility | Explain whether button should show/enable. | `runId` | Explicit standalone subject. |
| `getTeamMemberSelfEvolutionEligibility(teamRunId, memberRunId)` | Team member target eligibility | Explain whether member action should show/enable. | Compound `teamRunId + memberRunId` | Avoid generic target selector. |
| `startAgentRunSelfEvolution(input)` | Standalone self-evolution command | Start manual evolution for one run. | `runId` only | Returns `evolutionRunId`, `evolverRunId`; uses the run metadata snapshot and accepts no config override. |
| `startTeamMemberSelfEvolution(input)` | Team member self-evolution command | Start manual evolution for a selected member run. | `teamRunId + memberRunId` | Full team not in MVP. |
| `getSelfEvolutionRunRecord(evolutionRunId)` | Evolution provenance | Return minimal recorded status, target skill roots, source run refs, visible evolver run ref, and notification summary. | `evolutionRunId` | Can power UI inspection without changed-file auditing. |
| Agent run launch input `selfEvolution` field | Standalone run launch config | Enable/disable self-evolution for this run and snapshot effective config. | launch request identity | Start mutation cannot override this later. |
| Team run launch input `selfEvolution` field | Team run launch config | Enable/disable member-scoped self-evolution for this team run and snapshot each member. | team launch request identity | Does not mutate the team definition. |
| Team member run launch input `selfEvolution` field, if current launch model supports it | Member run launch config | Optional per-member override for that run only. | team member launch identity | If no current per-member config surface exists, omit in MVP. |
| `SelfEvolutionService.startForAgentRun(input)` | Standalone lifecycle | Authoritative service command. | `runId` | Called by GraphQL/future internal surfaces. |
| `SelfEvolutionService.startForTeamMember(input)` | Team member lifecycle | Authoritative service command. | `teamRunId + memberRunId` | Called by GraphQL/future surfaces. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `startAgentRunSelfEvolution` | Yes | Yes | Low | Keep separate from team member start. |
| `startTeamMemberSelfEvolution` | Yes | Yes | Low | Require both IDs. |
| `selfEvolutionCapability` | Yes | Yes | Low | Do not merge with server settings query. |
| `selfEvolutionStrategyCatalog` | Yes | Yes | Low | Status field must distinguish implemented/not implemented. |
| `SelfEvolutionTargetRef` | Yes | Yes | Low | Use discriminated union internally. |
| `SelfEvolutionRunConfigOverride` / effective snapshot | Yes | Yes | Low | Explicit precedence and source trace prevent ambiguous inheritance. |
| Run-launch config surfaces | Yes | Yes | Low | Only standalone/team/member run-launch APIs may carry `selfEvolution`; agent/team definition update surfaces must not carry it in MVP. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Global gate | `SelfEvolutionCapability` | Yes | Low | Mirrors Applications capability. |
| Main owner | `SelfEvolutionService` | Yes | Low | Avoid generic `HarnessEvolutionOrchestrator` in code unless product broadens beyond skills. |
| Trigger strategy | `ManualTriggerStrategy` | Yes | Low | Scheduled/signal remain descriptors and future implementations of the same interface. |
| Effective config resolver | `SelfEvolutionEffectiveConfigResolver` | Yes | Low | Makes precedence/snapshot ownership explicit. |
| Evolver strategy | `SingleAgentEvolverStrategy` | Yes | Low | Use `evolverStrategy`, not `evolverImplementation`. |
| Run record | `SelfEvolutionRunRecord` | Yes | Low | Avoid `Proposal` in MVP. |
| Target skill | `SelfEvolutionSkillTarget` | Yes | Low | Field names must be exact path oriented. |


## Domain Contract Sketch

These are shape sketches for implementation; exact class decorators/imports should follow existing project conventions.

```ts
type SelfEvolutionTriggerStrategyName =
  | "manual_only"
  | "scheduled"
  | "signal_based";

type SelfEvolutionEvolverStrategyName =
  | "single_agent"
  | "agent_team";

type SelfEvolutionStrategyStatus = "implemented" | "not_implemented";

type SelfEvolutionConfigSource =
  | "default"
  | "agent_run_launch"
  | "team_run_launch"
  | "team_member_run_launch";

interface SelfEvolutionRunConfigOverride {
  enabled?: boolean;
  triggerStrategy?: SelfEvolutionTriggerStrategyName;
  evolverStrategy?: SelfEvolutionEvolverStrategyName;
  evolverAgentDefinitionId?: string | null;
}

interface SelfEvolutionEffectiveConfig {
  enabled: boolean;
  triggerStrategy: SelfEvolutionTriggerStrategyName;
  evolverStrategy: SelfEvolutionEvolverStrategyName;
  evolverAgentDefinitionId?: string | null;
  resolvedAt: string;
  sourceTrace: Array<{
    source: SelfEvolutionConfigSource;
    fields: Array<keyof SelfEvolutionRunConfigOverride>;
  }>;
}

const DEFAULT_SELF_EVOLUTION_EFFECTIVE_CONFIG: SelfEvolutionEffectiveConfig = {
  enabled: false,
  triggerStrategy: "manual_only",
  evolverStrategy: "single_agent",
  evolverAgentDefinitionId: null,
  resolvedAt: "<launch-time>",
  sourceTrace: [{ source: "default", fields: ["enabled", "triggerStrategy", "evolverStrategy", "evolverAgentDefinitionId"] }],
};

type SelfEvolutionTargetRef =
  | { kind: "agent_run"; runId: string }
  | { kind: "team_member_run"; teamRunId: string; memberRunId: string };

interface ManualSelfEvolutionTriggerInput {
  target: SelfEvolutionTargetRef;
  requestedByUserId?: string | null;
  requestedFrom: "run_detail" | "team_run_detail" | "api";
}

interface SelfEvolutionRequest {
  evolutionRunId: string;
  triggerStrategy: "manual_only";
  target: SelfEvolutionTargetRef;
  effectiveConfig: SelfEvolutionEffectiveConfig;
  requestedAt: string;
  requestedByUserId?: string | null;
}

interface SelfEvolutionTriggerStrategy<TInput> {
  name: SelfEvolutionTriggerStrategyName;
  status: SelfEvolutionStrategyStatus;
  createRequest(input: TInput, snapshot: SelfEvolutionEffectiveConfig): SelfEvolutionRequest;
}

interface SelfEvolutionSkillTarget {
  skillName: string;
  skillRootPath: string;       // exact absolute editable directory boundary
  skillMdPath: string;         // primary .../SKILL.md guidance file inside the root
  sourceLabel?: string | null; // global / colocated / private / package-root when available
  isWritable: boolean;
}

interface SelfEvolutionEvidencePackage {
  target: SelfEvolutionTargetRef;
  sourceRunIds: string[];
  anonymizedWorkHistory: string;  // prompt-facing digest
  feedbackSignals: string[];      // user corrections, tool failures, review failures when discoverable
  privacyWarnings: string[];
}

type SelfEvolutionRunStatus =
  | "requested"
  | "resolving_target"
  | "launching_evolver"
  | "running_evolver"
  | "notifying_target"
  | "completed"
  | "failed"
  | "cancelled"
  | "timed_out";

interface SelfEvolutionNotificationSummary {
  status:
    | "sent_active_idle"
    | "skipped_busy"
    | "next_run_only"
    | "not_applicable"
    | "failed";
  message?: string | null;
  error?: string | null;
}

interface SelfEvolutionRunRecord {
  evolutionRunId: string;
  status: SelfEvolutionRunStatus;
  requestedAt: string;
  completedAt?: string | null;
  triggerStrategy: SelfEvolutionTriggerStrategyName;
  evolverStrategy: SelfEvolutionEvolverStrategyName;
  target: SelfEvolutionTargetRef;
  effectiveConfig: SelfEvolutionEffectiveConfig;
  sourceRunIds: string[];
  evolverAgentDefinitionId: string;
  evolverRunId?: string | null;
  runtimeKind?: string | null;
  llmModelIdentifier?: string | null;
  workspaceRootPath?: string | null;
  skillTargets: SelfEvolutionSkillTarget[];
  evidenceSummaryHash?: string | null;
  notificationSummary?: SelfEvolutionNotificationSummary | null;
  errors: string[];
}
```

Tightness rules:

- `SelfEvolutionTargetRef` must remain a discriminated union. Do not collapse it into one `targetId` string.
- Persisted run-launch configs use `SelfEvolutionRunConfigOverride`; run metadata stores `SelfEvolutionEffectiveConfig`. Do not place `selfEvolution` on durable agent/team definitions in MVP.
- `SelfEvolutionEffectiveConfig` is complete and snapshot-friendly; absent old-run snapshots normalize to disabled for manual evolution eligibility.
- `SelfEvolutionSkillTarget.skillRootPath` is the editable boundary. `skillMdPath` is the primary guidance file inside that boundary, not the only editable file. Supporting files inside the root are in scope when a durable reusable improvement warrants them.
- The MVP does not persist change summaries or formal metrics. Do not infer downstream benefit from evolver completion.

## Evolution Lifecycle State Machine

The lifecycle is service-owned and record-backed, not inferred only from the helper agent run status.

```text
requested
  -> resolving_target
  -> launching_evolver
  -> running_evolver
  -> notifying_target
  -> completed
```

Failure transitions:

- `requested/resolving_target -> failed` when capability is disabled, the target is missing, strategy is not implemented, no skill targets exist, or all target skill roots are unwritable.
- `launching_evolver -> failed` when the default/selected evolver agent cannot be resolved or the runtime/model fallback is invalid.
- `running_evolver -> timed_out` when the helper run does not complete within the configured timeout.
- `notifying_target -> completed` even if active notification fails; attach notification failure and rely on next-run correctness.

Recommended timeout policy for the first implementation: use a conservative server-side default such as 10–20 minutes, expose it as an internal constant, and avoid a user-facing timeout setting in MVP unless existing helper-run settings already provide one.

## Configuration Scope, Precedence, And Snapshot Contract

This section reflects the user correction: self-evolution is a **runtime/run configuration**, not an intrinsic `AgentDefinition` or `TeamDefinition` attribute. Agent/team definitions still provide target identity, instructions, tools, and configured skills, but they do not own whether a particular run should be self-evolved.

### Config owners and surfaces

| Scope | Persistence / Surface | Owns | Notes |
| --- | --- | --- | --- |
| Global capability | Server setting through `SelfEvolutionCapabilityService` | Product-wide hard gate and UI visibility. | Checked at action time; default disabled. |
| Standalone run launch | `AgentRunConfig.selfEvolution` | Per-run eligibility/strategy config for this run only. | Resolved and snapshotted into `AgentRunMetadata.selfEvolutionEffective`. |
| Team run launch | `TeamRunConfig.selfEvolution` | Per-team-run member-scoped eligibility/strategy config for this team run. | Resolved into each member metadata snapshot; does not mutate the `TeamDefinition`. |
| Team member run launch | `TeamMemberRunConfig.selfEvolution`, only if current launch model already supports per-member config. | Most specific per-member override for this run only. | If no existing member-specific launch surface exists, omit this in MVP rather than creating a new definition-level field. |
| Run detail/manual action | `AgentRunMetadata.selfEvolutionEffective` or `TeamRunMemberMetadata.selfEvolutionEffective` | Read-only eligibility snapshot. | Manual start cannot override config here. |

No MVP `selfEvolution` field should be added to:

- `agent-config.json` / `AgentDefinition`;
- `team-config.json` / `TeamDefinition`.

If later UX wants a persistent default, design that as a separate **run preset / launch preference**, not as a property of the agent's business definition.

### Precedence

Global capability is a hard gate checked first. If disabled, all start mutations reject regardless of run snapshot.

Standalone run effective config at launch:

```text
DEFAULT_DISABLED
  -> AgentRunConfig.selfEvolution override
  -> AgentRunMetadata.selfEvolutionEffective snapshot
```

Team member effective config at team-run launch:

```text
DEFAULT_DISABLED
  -> TeamRunConfig.selfEvolution override
  -> TeamMemberRunConfig.selfEvolution override, if available
  -> TeamRunMemberMetadata.selfEvolutionEffective snapshot
```

Merge rule: later run-launch sources override only explicitly provided fields. For example, a team run launch override `{ enabled: true }` does not need to restate `triggerStrategy`; omitted strategy fields keep the default `manual_only` and `single_agent` values.

Old runs/configs:

- Existing agent/team definitions with no `selfEvolution` field remain unchanged and valid.
- Existing run metadata with no `selfEvolutionEffective` snapshot is treated as `enabled: false` for manual self-evolution.
- Changing an agent/team definition after a run never changes that historical run's self-evolution eligibility.

### Examples

| Case | Inputs | Effective Result |
| --- | --- | --- |
| Old standalone run before feature exists | No run snapshot | Ineligible; `enabled=false`. |
| New standalone run with self-evolution enabled | `AgentRunConfig.selfEvolution={ enabled: true }` | Run snapshot enabled with `manual_only`/`single_agent`. |
| New standalone run with no override | No run launch override | Snapshot disabled. |
| Team run enabled for member evolution | `TeamRunConfig.selfEvolution={ enabled: true }` | Each member snapshot enabled for member-scoped evolution. |
| Team member-specific override available | Team run enabled, member launch `{ enabled: false }` | Only that member snapshot disabled. |
| Agent definition changed after run | Agent skills/instructions changed later | Old run eligibility still reads metadata snapshot only. |

## Manual Trigger Strategy Contract

This resolves AR-003. `manual_only` is not merely an enum value; it has one executable owner.

Owner files:

- `autobyteus-server-ts/src/self-evolution/services/triggers/self-evolution-trigger-strategy.ts`
- `autobyteus-server-ts/src/self-evolution/services/triggers/manual-trigger-strategy.ts`
- `autobyteus-server-ts/src/self-evolution/services/strategies/self-evolution-strategy-catalog.ts` or a split `self-evolution-trigger-strategy-catalog.ts` for descriptors.

Manual trigger flow:

```text
GraphQL startAgentRunSelfEvolution/startTeamMemberSelfEvolution
  -> SelfEvolutionService validates global capability and loads run snapshot
  -> ManualTriggerStrategy.createRequest(input, selfEvolutionEffective)
  -> canonical SelfEvolutionRequest
  -> SelfEvolutionService.startFromEvolutionRequest(request)
```

`ManualTriggerStrategy` owns:

- validating that the effective snapshot has `triggerStrategy === "manual_only"`;
- validating the manual source identity (`run_detail`, `team_run_detail`, or `api`);
- creating `evolutionRunId`, `requestedAt`, requester metadata, and canonical `SelfEvolutionRequest`;
- rejecting scheduled/signal strategy names as not implemented through catalog status.

`ManualTriggerStrategy` must not own:

- evidence reading;
- skill root resolution;
- evolver agent launch;
- target notification.

Future scheduled/signal implementations should implement the same trigger interface and produce the same `SelfEvolutionRequest`; they must not bypass `SelfEvolutionService.startFromEvolutionRequest`.

## Metrics And Benefit Observation Deferral Contract

The paper's harness-updating versus harness-benefit distinction remains conceptually important, but the MVP intentionally does **not** add dedicated metrics/reporting machinery, benefit report queries, changed-file counters, or formal update-production metrics.

MVP behavior:

- Store only minimal provenance in `SelfEvolutionRunRecord`: source run IDs, target identity, editable skill roots, evidence hash when available, visible evolver run ID/status, timestamps, and notification outcome.
- UI may show the visible evolver run link and the listed editable skill packages.
- UI must not claim that the run changed files, improved the target, or produced downstream benefit unless a future explicit measurement service is designed.
- Git-backed manual inspection/revert remains the testing workflow outside the product service boundary.
- Future measurement can be added as a separate service after the manual self-evolution loop proves useful.

## Eligibility And Failure Contract

`SelfEvolutionService` should expose eligibility so UI can explain action availability without duplicating backend policy.

A target is eligible when all MVP conditions hold:

1. Global self-evolution capability is enabled.
2. Target run metadata contains `selfEvolutionEffective.enabled === true`; old runs with no snapshot are ineligible.
3. Effective trigger strategy snapshot is `manual_only` and `ManualTriggerStrategy` can create a request.
4. Evolver strategy is `single_agent`.
5. Target run metadata can be read.
6. Target agent definition can be resolved.
7. At least one configured skill resolves to an exact skill root directory with a primary `SKILL.md`.
8. At least one target skill root is writable.
9. Default/selected self-evolver agent resolves and includes `run_bash` access, or the service can prove equivalent shell capability for the selected runtime.
10. Evidence can be summarized from run history or raw memory paths.

Eligibility output should include `eligible: boolean`, `reasons`, `warnings`, and normalized `skillTargets`. Examples:

| Condition | Eligibility Result | Start Mutation Behavior |
| --- | --- | --- |
| Global feature disabled | hidden / ineligible | Reject with clear capability-disabled error. |
| Scheduled strategy selected | ineligible with `not_implemented` reason | Reject; do not silently fall back to manual. |
| No configured skills | ineligible | Reject; skill-first MVP has no target to update. |
| Some skills read-only, some writable | eligible with warning | Evolver prompt includes only writable paths or clearly labels non-editable paths as context only. |
| Active target is busy | eligible | Run evolution; notification may record `skipped_busy`/`next_run_only`. |

## Work-History Evidence Projection And Anonymization Contract

The evolver should not receive raw trace internals as its working prompt. It should receive a human-readable work-history digest similar in spirit to compaction evidence rendering: useful conversation facts, tool outcomes, decisions, corrections, and open issues, while omitting bookkeeping identifiers and low-level event details. The task message should list the editable skill root directories, not enumerate or hard-code every existing file inside those roots; the evolver can inspect the folders when needed.

Owner: `SelfEvolutionWorkHistoryProjector`, used by `SelfEvolutionEvidenceBuilder`.

Current compaction code gives the pattern to reuse:

- `CompactionTaskPromptBuilder` renders raw traces into readable `User: ...`, `Assistant: ...`, and tool result digest lines.
- `WorkingContextCompactionPromptBuilder` renders working-context messages/tool groups and says to omit bookkeeping identifiers and low-level event details.
- Self-evolution should use the same principle but optimize for improvement signals: mistakes, inefficiencies, missing checks, unclear skill activation, repeated corrections, failed tool outcomes, and successful strategies worth preserving.

Prompt-facing evidence should include:

```text
[WORK_HISTORY_TO_LEARN_FROM]
Worker goal:
- <anonymized user goal or task summary>

Important interaction history:
- User: <redacted/high-signal request or correction>
- Worker: <redacted/high-signal response or work note>

Tool and validation outcomes:
- Tool <tool-name> succeeded/failed: <short outcome digest, no raw payload IDs>

Feedback and improvement signals:
- <explicit correction, failed assumption, repeated friction, review note>

Reusable lessons to consider:
- <optional pre-extracted candidate lesson, if evidence builder can infer one>
```

Prompt-facing evidence should not include by default:

- raw `turnId`, sequence ID, trace ID, tool call ID, provider event ID, route key, or internal status payloads;
- raw JSON trace objects;
- raw trace file paths as something the evolver should open;
- private home paths, credentials, tokens, personal data, private messages, proprietary details, or one-off project secrets;
- long raw tool outputs when a short digest is enough.

Anonymization / redaction rules:

- Keep exact editable skill root paths unredacted because the evolver needs them to edit.
- Replace target/run identifiers in prompt text with neutral labels such as `Target worker`, `Source work session`, and `Tool interaction` unless the label materially helps reasoning.
- Generalize non-editable file paths in evidence to `<project-file>`, `<generated-output>`, or a short basename when full paths are unnecessary.
- Keep tool names and high-level outcomes when they explain a reusable process failure.
- Preserve explicit user feedback meaning, but strip one-off names, credentials, and private content.
- Raw trace paths must not be retained in the default MVP evidence package or evolution record. Any future raw-trace access mode would require a separate explicit design.

`SelfEvolutionEvidencePackage` should therefore contain only prompt-facing evidence plus minimal source-run linkage:

```ts
interface SelfEvolutionEvidencePackage {
  target: SelfEvolutionTargetRef;
  sourceRunIds: string[]; // minimal provenance; raw trace paths are not retained in MVP records
  anonymizedWorkHistory: string; // prompt-facing evidence
  feedbackSignals: string[];
  privacyWarnings: string[];
}
```

## Skill Root Edit Scope Contract

This section reflects the latest source reality from `origin/personal`: one package agent can configure one or many skills, and each skill is a canonical folder under `skills/<skill-name>/` with a primary `SKILL.md` plus optional supporting files. The self-evolver should therefore evolve **skill packages / skill roots**, not only `SKILL.md` text.

`SelfEvolutionSkillTarget` should model both the root and the primary file:

```ts
interface SelfEvolutionSkillTarget {
  skillName: string;
  skillRootPath: string;      // exact absolute editable directory boundary
  skillMdPath: string;        // primary guidance file inside the root
  isWritable: boolean;
}
```

Edit rule:

```text
Allowed: create/update/delete files whose canonical real path is inside one listed skillRootPath.
Disallowed: edit files outside the listed skill roots, even if they are nearby in the agent package.
```

Consequences:

- Multiple configured skills for one agent produce multiple editable skill roots in one evolution request. The task prompt should list each root, not every file in each root.
- `SKILL.md` remains the primary activation/instruction file, but supporting files inside the same skill root may be edited when the durable improvement needs examples, references, templates, checklists, or small helper assets.
- If the evolver believes a new skill should be created or an agent's `skillNames` should change, it should report that recommendation instead of editing `agent-config.json` or creating an unattached sibling skill folder in MVP.
- The MVP relies on explicit instruction and exact root paths rather than a separate post-run audit service. A future stricter strategy can add service-mediated validation if needed.

## Evidence Package And Privacy Contract

`SelfEvolutionEvidenceBuilder` should treat traces as sensitive work history, not as durable skill content and not as raw prompt payload. It should call `SelfEvolutionWorkHistoryProjector` to render anonymized, human-readable evidence.

Evidence package contents:

- target identity and source run IDs for minimal provenance;
- target role/name/description and configured skill names, using neutral prompt labels where possible;
- exact editable skill root directories and primary `SKILL.md` paths;
- anonymized work-history digest: worker goal, major turns, tool successes/failures, explicit user corrections, review feedback, final outcome if discoverable;
- feedback and improvement signals;
- explicit privacy instruction: do not copy secrets, user-specific details, one-off file paths, credentials, private messages, or proprietary content into durable skills.

Evidence package constraints:

- Prefer the anonymized digest over raw trace access.
- Do not retain raw trace file paths in the MVP evidence package or default evolution record.
- When evidence comes from team runs, include only the selected member's work history plus minimal team-level context needed to understand coordination failures.
- Record an `evidenceSummaryHash` over the anonymized digest when practical so later review can connect the evolution record to the evidence without storing another full copy of sensitive traces in the prompt.

## Evolver Task Prompt Contract

The default self-evolver agent template and the service-created task message should use a human-learning / experience-distillation frame rather than product-internal language. The target agent can be described as a worker/person; run traces are work history; skills are durable playbooks. The product name does not need to appear in the role instruction.

The task message is still specific and operational because it must provide exact editable skill roots.

Required task-message shape:

```text
You are helping improve a target worker's durable skill playbooks from prior work evidence.
Treat the work history and feedback as experience. Look for general, reusable lessons:
inefficiencies, repeated mistakes, missing checks, unclear activation guidance, or better procedures.
Distill only durable lessons into the target skill packages.

Target: Target worker
Source: anonymized work-history digest from a prior work session

Editable skill packages:
1. <skillName>
   Root directory: /absolute/path/to/skill-root
   Primary guidance file: /absolute/path/to/skill-root/SKILL.md
2. <skillName2>
   Root directory: /absolute/path/to/another-skill-root
   Primary guidance file: /absolute/path/to/another-skill-root/SKILL.md

[WORK_HISTORY_TO_LEARN_FROM]
<anonymized human-readable digest produced by SelfEvolutionWorkHistoryProjector>

Rules:
1. You may use run_bash with auto-executed tools to inspect the listed skill roots and edit files ONLY inside those root directories.
2. SKILL.md is the primary guidance file, but supporting files inside the same listed root may be inspected and then updated, created, deleted, or reorganized when needed for a reusable improvement.
3. Do not edit files outside the listed skill roots. Do not edit agent/team definitions, run memory, source code, tool/MCP configuration, or sibling skills that are not listed.
4. Do not follow symlinks or path aliases to edit outside a listed root.
5. If no durable reusable improvement is warranted, make no file changes and explain why.
6. If a new skill, skill attachment, tool change, or agent-definition change seems needed, report it as a recommendation instead of applying it.
7. Do not copy secrets, personal data, private messages, proprietary details, one-off paths, or transient task specifics into durable skill content.
8. Prefer reusable strategy, activation guidance, checklists, edge-case warnings, examples, templates, and failure-avoidance rules over task-specific memories.
```

The built-in self-evolver `agent.md` should be shorter and less internally branded. Suggested role text:

```text
You are a skill improvement coach. Your job is to review a target worker's prior work evidence and improve the worker's durable skill playbooks when a general reusable improvement is warranted.

The task message is authoritative. It lists the exact editable skill root directories. You may edit only files inside those roots. Preserve useful guidance, keep changes concise, and avoid copying sensitive or one-off details into durable skills. If no reusable improvement is justified, make no changes and explain why.
```

## GraphQL Contract Sketch

The transport shape should stay explicit by subject:

```graphql
type SelfEvolutionCapability {
  enabled: Boolean!
  settingKey: String!
}

type SelfEvolutionStrategyDescriptor {
  name: String!
  label: String!
  status: SelfEvolutionStrategyStatus!
  description: String
}

type SelfEvolutionStrategyCatalog {
  triggerStrategies: [SelfEvolutionStrategyDescriptor!]!
  evolverStrategies: [SelfEvolutionStrategyDescriptor!]!
  defaultTriggerStrategy: String!
  defaultEvolverStrategy: String!
}

type SelfEvolutionEligibility {
  eligible: Boolean!
  reasons: [String!]!
  warnings: [String!]!
  skillTargets: [SelfEvolutionSkillTarget!]!
}


type Query {
  selfEvolutionCapability: SelfEvolutionCapability!
  selfEvolutionStrategyCatalog: SelfEvolutionStrategyCatalog!
  getAgentRunSelfEvolutionEligibility(runId: ID!): SelfEvolutionEligibility!
  getTeamMemberSelfEvolutionEligibility(teamRunId: ID!, memberRunId: ID!): SelfEvolutionEligibility!
  getSelfEvolutionRunRecord(evolutionRunId: ID!): SelfEvolutionRunRecord
}

# Existing standalone/team run launch inputs gain optional
# selfEvolution: SelfEvolutionRunConfigOverride fields. Agent/team definition
# update inputs do not gain selfEvolution in MVP. Manual start mutations do not
# accept config overrides; they use run metadata snapshots.

type Mutation {
  setSelfEvolutionEnabled(enabled: Boolean!): SelfEvolutionCapability!
  startAgentRunSelfEvolution(input: AgentRunSelfEvolutionInput!): SelfEvolutionStartResult!
  startTeamMemberSelfEvolution(input: TeamMemberSelfEvolutionInput!): SelfEvolutionStartResult!
}
```

Do not introduce a generic `startSelfEvolution(targetId)` transport method. The identity meaning differs for standalone runs and team member runs.

## Frontend UX Contract

Global disabled state:

- Settings may show the global experimental toggle if the product already exposes advanced/server settings; all run-launch/team-run launch self-evolution controls are hidden elsewhere.
- Run-history/detail pages do not show `Improve from this run` buttons.

Global enabled state:

- Standalone run-launch, team-run launch, and optional member-run launch configuration may show a self-evolution section with only MVP-relevant options:
  - enabled/disabled override for that scope;
  - trigger strategy display/select, with only `manual_only` executable/selectable;
  - evolver strategy display/select, with only `single_agent` executable/selectable;
  - optional selected/default self-evolver agent if the settings UI already supports helper-agent selection.
- Run detail/history surfaces are read-only for config; they use the metadata snapshot and do not offer an override inside the manual start dialog.
- Run detail/history shows manual actions only when backend eligibility says eligible.
- If backend eligibility returns warnings, the UI should display them near the action, especially partially read-only skill targets.
- Starting evolution should link the user to the visible evolver `AgentRun` and later to the evolution run record and visible evolver run.

Avoid:

- approval-required UX for every evolver run;
- separate notification strategy toggles;
- making the target agent see the self-evolver as a normal teammate;
- showing future scheduled/signal options as executable controls.

## Target Notification / Reload Contract

The notification behavior is default system behavior, not a user-facing strategy.

MVP behavior:

- If the target is inactive or completed, record `next_run_only`; future runs load any skill-root edits the evolver made.
- If the target is an active idle native AutoByteus run and posting a system message is supported, post a concise `SenderType.SYSTEM` message such as:

```text
A self-evolution run completed for your configured skill playbooks: <evolutionRunId>.
Affected skill packages: <listed editable roots>.
Please reload/re-read the affected skills before continuing when relevant.
```

- If the active target is busy or external-runtime reload is not supported, record `skipped_busy`, `not_applicable`, or `failed`, and rely on next-run correctness.

Future behavior may add a real runtime-level `SkillReloadRequestedEvent`, but this MVP must not depend on it for correctness.


## Applied Patterns (If Any)

- **Capability boundary**: `SelfEvolutionCapabilityService` follows the Applications capability pattern for typed feature visibility.
- **Strategy**: `ManualTriggerStrategy` is the implemented trigger variant and `SingleAgentEvolverStrategy` is the implemented evolver variant; scheduled/signal/team variants are explicit not-implemented strategy descriptors.
- **Factory/runner pattern**: `SingleAgentEvolverStrategy` follows compaction's helper-run creation pattern.
- **Repository/store**: `SelfEvolutionRunStore` persists evolution records behind the self-evolution service boundary.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/self-evolution/` | Folder | Self-evolution subsystem | Domain + services for self-evolution. | New cohesive capability area. | Generic agent run logic. |
| `autobyteus-server-ts/src/self-evolution/domain/models.ts` | File | Domain model | Types for config, target refs, strategies, records. | Shared by services/GraphQL. | Transport decorators. |
| `autobyteus-server-ts/src/self-evolution/domain/settings.ts` | File | Settings constants | Setting keys and validation constants. | Keeps constants reusable. | Server setting persistence logic. |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-capability-service.ts` | File | Capability owner | Global enable/disable. | Typed feature gate. | Run launching. |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-settings-service.ts` | File | Settings owner | Default evolver and strategy setting reads. | Encapsulates `ServerSettingsService`. | UI mapping. |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-effective-config-resolver.ts` | File | Effective config owner | Merge config overrides and build run snapshots. | Centralizes precedence. | Runtime launch or UI rendering. |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-service.ts` | File | Main owner | Start/finalize evolution requests. | Spine owner. | Helper-run implementation details or UI rendering. |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-target-context-resolver.ts` | File | Target resolver | Standalone/team member metadata. | Identity-specific owner. | Skill path logic. |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-skill-target-resolver.ts` | File | Skill target resolver | Configured skill roots. | Direct-edit owner. | Evidence summarization. |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-evidence-builder.ts` | File | Evidence builder | Evolution task evidence and minimal source-run linkage. | Prompt input owner. | Run creation. |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-work-history-projector.ts` | File | Evidence projector | Human-readable anonymized work-history rendering. | Evolver should not receive raw event payloads. | Run creation or file mutation. |
| `autobyteus-server-ts/src/self-evolution/services/self-evolver-agent-settings-resolver.ts` | File | Evolver resolver | Agent/runtime/model fallback. | Compaction analog. | Skill target resolution. |
| `autobyteus-server-ts/src/self-evolution/services/strategies/` | Folder | Evolver strategy implementations/catalog | Evolver strategy code and shared descriptor catalog if not split. | Keeps evolver variants local. | Settings persistence. |
| `autobyteus-server-ts/src/self-evolution/services/triggers/` | Folder | Trigger strategy implementations | Manual trigger implementation and future scheduled/signal interfaces. | Keeps trigger variants concrete and separate from evolver launch. | Evolver run creation. |
| `autobyteus-server-ts/src/self-evolution/services/strategies/self-evolution-strategy-catalog.ts` | File | Strategy catalog | Implemented/not-implemented descriptors. | UI/service shared truth. | Runtime execution. |
| `autobyteus-server-ts/src/self-evolution/services/strategies/single-agent-evolver-strategy.ts` | File | Evolver strategy | Launch visible evolver run. | Executable strategy. | Capability gating. |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-run-store.ts` | File | Run record persistence | Store/read/index minimal evolution records. | Minimal provenance owner. | Business orchestration. |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-target-notification-service.ts` | File | Notification | Target update message/reload request. | Runtime adoption concern. | Skill root resolution. |
| `autobyteus-server-ts/src/api/graphql/types/self-evolution.ts` | File | GraphQL transport | Capability/strategy/start/record endpoints. | Existing GraphQL type layout. | Service internals. |
| `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/agent.md` | File | Built-in agent template | Self-evolver instructions. | Normal agent package shape. | Runtime-specific code. |
| `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/agent-config.json` | File | Built-in agent config | `toolNames: ["run_bash"]`, no default launch model. | Enables direct edit and fallback. | Hardcoded runtime/model. |
| `autobyteus-web/stores/selfEvolutionCapabilityStore.ts` | File | Frontend feature state | Consume capability. | Mirrors app capability store. | Generic settings parsing. |
| `autobyteus-web/stores/selfEvolutionStore.ts` | File | Frontend self-evolution actions | Eligibility/start/record calls. | Keeps components thin. | Backend eligibility logic. |
| Relevant run/detail/run-launch config components | Files | UI components | Show toggle/button when capability enabled. | Product surface. | Strategy implementation. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/self-evolution/domain` | Main-Line Domain-Control | Yes | Low | Contains only types/constants. |
| `src/self-evolution/services` | Main-Line Domain-Control + off-spine service owners | Yes | Medium | Multiple services are justified by distinct ownership; do not flatten into one god service. |
| `src/self-evolution/services/strategies` | Off-Spine Concern | Yes | Low | Evolver strategy variants/catalog are related and bounded. |
| `src/self-evolution/services/triggers` | Off-Spine Concern | Yes | Low | Manual trigger owner and future trigger variants are separate from evolver launch. |
| `src/api/graphql/types` | Transport | Yes | Low | Existing GraphQL convention. |
| `src/built-in-agents/templates/skill-evolver` | Persistence/Template | Yes | Low | Normal built-in agent template. |
| `autobyteus-web/stores` | Frontend state | Yes | Low | Existing store pattern. |
| Run/detail UI components | Transport/UI | Yes | Medium | Avoid embedding eligibility logic; components call store. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Standalone start API | `startAgentRunSelfEvolution({ runId })` | `startSelfEvolution({ targetId: "..." })` | Avoid ambiguous run/team/member identities. |
| Team member API | `startTeamMemberSelfEvolution({ teamRunId, memberRunId })` | Full team button mutates every member skill | Member-scoped MVP is safer and clearer. |
| Direct edit task prompt | `Only edit files inside these exact skill roots: /abs/path/skill-a` | `Improve any relevant skills in this repository` | Prevents broad repository mutation while allowing normal skill-package files. |
| Strategy catalog | `{ name: "scheduled", status: "not_implemented" }` | Hidden enum value that crashes when selected | Keeps roadmap visible without accidental execution. |
| Evolver run config | `toolNames: ["run_bash"], autoExecuteTools: true, defaultLaunchConfig: null` | Custom file-write tools and hardcoded model | Matches user preference and compaction fallback. |
| Feature gate | UI uses `selfEvolutionCapability.enabled` | UI reads generic `ENABLE_SELF_EVOLUTION` setting row | Typed capability is the authoritative boundary. |
| Config precedence | `default disabled -> run-launch override -> run metadata snapshot` | Start mutation accepts config overrides or re-reads current agent/team definitions | Historical run actions must be stable. |
| Team-run config | `TeamRunConfig.selfEvolution` enables member-scoped buttons for that run only | `TeamDefinition.selfEvolution` becomes an intrinsic team property | MVP treats self-evolution as runtime/run config. |
| Manual trigger | `ManualTriggerStrategy.createRequest(input, snapshot)` | Resolver directly constructs request and launches evolver | Keeps trigger strategy extensible for scheduled/signal later. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Preserve compactor-specific built-in-agent setting logic and add another special branch | Quickest patch for skill evolver setting. | Rejected | Generalize built-in-agent setting initialization. |
| UI reads generic server settings for self-evolution feature gate | Existing Settings UI already lists settings. | Rejected | Use typed `selfEvolutionCapability` boundary. |
| One generic `startSelfEvolution(targetId)` mutation | Fewer GraphQL methods. | Rejected | Use explicit standalone/team-member mutations. |
| Add custom patch/proposal tool while also allowing direct edit | Might give future safety. | Rejected for MVP | Direct edit via `run_bash`; stricter strategy can be a future clean separate mode. |
| Insert evolver into target team so it can message target | Team messaging already exists. | Rejected | Separate visible evolver run plus system/control-plane notification. |
| Implement scheduled mode behind a disabled flag | Future flexibility. | Rejected for MVP | Not-implemented strategy descriptor only. |

## Derived Layering (If Useful)

Layering is secondary to ownership, but the design can be read as:

```text
Frontend UI/store
  -> GraphQL self-evolution resolver
  -> SelfEvolutionService authoritative boundary
  -> target/evidence/skill/settings/effective-config/trigger/evolver/notification services
  -> existing run memory, skills, agent run, settings, built-in agent subsystems
  -> visible EvolverAgent run with run_bash
```

Higher layers must not skip the `SelfEvolutionService` boundary to combine its internals.


## Change Inventory

| Change Type | Path / Area | Summary |
| --- | --- | --- |
| Add | `autobyteus-server-ts/src/self-evolution/` | New self-evolution domain, services, trigger/evolver strategies, effective config resolver, run store, and notification owner. |
| Add | `autobyteus-server-ts/src/api/graphql/types/self-evolution.ts` | Typed GraphQL capability, strategy catalog, eligibility, start, and record surfaces. |
| Add | `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/` | Built-in default self-evolver agent with `run_bash` access and no hardcoded model/runtime. |
| Add | frontend self-evolution stores/components | Capability store, action store, settings/config controls, run-detail manual actions. |
| Modify | `ServerSettingsService` / server setting definitions | Add self-evolution enabled setting and default evolver agent setting. |
| Modify | `BuiltInAgentBootstrapper` and built-in registry | Generalize helper-agent default-setting initialization and seed `autobyteus-skill-evolver`. |
| Modify | run/team member launch config and metadata | Add optional `SelfEvolutionRunConfigOverride` launch config and required `SelfEvolutionEffectiveConfig` snapshot in metadata. |
| Modify | GraphQL schema registration | Register self-evolution resolver/type file. |
| Remove / Decommission | compaction-specific helper-agent default-setting branch | Replace with generic built-in setting-default initialization. |
| Do Not Add | custom evolver mutation tools | `run_bash` direct edit is the MVP mutation tool. |
| Do Not Add | scheduled/signal execution | Placeholder descriptors only. |
| Add | `ManualTriggerStrategy` trigger implementation | Concrete `manual_only` trigger boundary. |

## Migration / Refactor Sequence

1. **Add domain model and settings constants**
   - Add `self-evolution/domain/models.ts` and `settings.ts`.
   - Define `SelfEvolutionRunConfigOverride`, `SelfEvolutionEffectiveConfig`, strategy descriptors, trigger request types, target refs, skill targets, and minimal run records.

2. **Add typed global capability**
   - Add `SelfEvolutionCapabilityService` defaulting to disabled when absent.
   - Add server setting registration for `ENABLE_SELF_EVOLUTION` and `AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID`.
   - Add typed GraphQL capability/query/mutation.

3. **Generalize built-in agent default-setting bootstrap**
   - Replace compaction-specific `getCompactionAgentDefinitionId` path in `BuiltInAgentBootstrapper` with generic `getSettingValue(settingDefault.key)`.
   - Keep existing memory compactor behavior through the same generic path.

4. **Seed the built-in skill evolver agent**
   - Add `autobyteus-skill-evolver` to `BUILT_IN_AGENT_DEFINITIONS`.
   - Add `templates/skill-evolver/agent.md` with direct-edit constraints.
   - Add `templates/skill-evolver/agent-config.json` with `toolNames: ["run_bash"]`, no default launch config.
   - Initialize `AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID` when empty and template resolves.

5. **Add target config fields and effective snapshot resolver**
   - Do not add `selfEvolution` to agent definition or team definition config records/domain models.
   - Add optional `SelfEvolutionRunConfigOverride` to `AgentRunConfig`, `TeamRunConfig`, and member run config only if the current member-launch path already supports per-member configuration.
   - Add required `SelfEvolutionEffectiveConfig` snapshot fields to `AgentRunMetadata` and `TeamRunMemberMetadata` for new runs.
   - Implement `SelfEvolutionEffectiveConfigResolver` with the exact precedence in this design.
   - Treat old run metadata with no snapshot as disabled for manual self-evolution.

6. **Add self-evolution service internals**
   - Implement target context resolver for standalone and team member targets.
   - Implement skill target resolver using `SkillService.resolveConfiguredSkillsForAgent`.
   - Implement evidence builder using run memory/projection readers.
   - Implement `SelfEvolutionWorkHistoryProjector` to render anonymized human-readable work history and omit bookkeeping identifiers.
   - Implement settings resolver for evolver agent runtime/model fallback.
   - Implement strategy catalog descriptors.
   - Implement `ManualTriggerStrategy` and route manual GraphQL start through it before `SelfEvolutionService.startFromEvolutionRequest`.

7. **Implement single-agent evolver strategy**
   - Create visible evolver run through `AgentRunService.createAgentRun`.
   - Use target workspace root or temp workspace fallback.
   - Use resolved evolver runtime/model fallback.
   - Use `autoExecuteTools: true` and `SkillAccessMode.PRELOADED_ONLY`.
   - Post a task message with anonymized work-history evidence, exact absolute skill root directories plus primary `SKILL.md` paths, and direct-edit instructions.
   - Subscribe/wait with timeout, record result, terminate helper run per compaction-style policy unless product wants it left open for inspection. Recommended: terminate after completion but preserve run history.

8. **Implement minimal run record**
   - Store records under `memory/self_evolution/evolution_runs/<evolutionRunId>/record.json` plus an index if a separate record store is useful.
   - Record source run IDs, target identity, editable skill roots, evidence hash when available, visible evolver run ID/status, timestamps, and notification outcome.
   - Do not capture before/after Git status, changed-file lists, or formal metrics in MVP.

9. **Implement target notification**
   - For inactive/future runs: record notification only; next run sees any edited skill-root content.
   - For active idle standalone native run: post `SenderType.SYSTEM` notification with the evolver run link and affected/listed skill roots.
   - For active busy run: queue or skip with record status. MVP may choose queue-at-idle if current run status is easy to observe; otherwise record next-run-only.
   - For external runtimes: notification only; session reload semantics deferred.

10. **Add GraphQL transport**
    - Add capability, strategy catalog, eligibility, start, and record queries/mutations.
    - Add `selfEvolution` fields to existing standalone/team run-launch inputs only; do not add self-evolution fields to agent/team definition update inputs in MVP.
    - Register resolver in `schema.ts`.

11. **Add frontend UI**
    - Add capability store and self-evolution store.
    - Settings: toggle global capability; select/default evolver agent if exposed.
    - Standalone/team run launch config: show self-evolution override controls only when capability enabled.
    - Run detail/history: show manual buttons when metadata snapshot is eligible.
    - Evolution run/history: link to the visible evolver run and listed editable skill packages.

12. **Validation and tests**
    - Unit-test settings/capability defaults.
    - Unit-test strategy catalog statuses.
    - Unit-test effective config precedence/snapshot for standalone and team member cases.
    - Unit-test manual trigger request creation and scheduled/signal not-implemented rejection.
    - Unit-test target resolution and skill root resolution.
    - Unit-test built-in agent bootstrap default-setting generalization.
    - Service-level test launching a fake/easy evolver strategy where possible.
    - GraphQL tests for hidden/disabled behavior and start mutation rejection when disabled.

## Key Tradeoffs

| Tradeoff | Decision | Rationale | Residual Risk |
| --- | --- | --- | --- |
| Direct file edit vs service-mediated patch apply | Direct file edit in MVP | User wants simpler experimentation; `run_bash` exists; Git-backed rollback is acceptable initially. | Evolved skill may be invalid or overfit; detect by testing and future stricter strategy if needed. |
| Custom tools vs existing `run_bash` | Existing `run_bash` only | Avoid tool proliferation. | Prompt must strongly constrain target paths. |
| Global feature default | Off by default | Prevents accidental user exposure. | Users must explicitly discover/enable feature during testing. |
| Manual vs automatic trigger | Manual only implemented | Early users know when agent performed poorly; avoids scheduling complexity. | No background learning until future strategy. |
| Active reload vs next-run | Next-run correctness baseline, best-effort active notification | Current runtime caches skills/system prompts. | Active run may not fully adopt until next run. |
| Run config vs agent definition attribute | Use run-launch config plus run metadata snapshot | Self-evolution is a runtime/control-plane behavior, not part of the agent's durable identity. | More config fields; requires resolver tests. |
| Built-in evolver model | No hardcoded model; fallback to target | Matches compaction and avoids model configuration friction. | Weak target model may produce weak evolver results. User can configure evolver later. |

## Risks

1. **Direct edit can produce bad skill content.**
   - Mitigation: feature off by default, manual trigger, visible run, exact target paths, Git revert.

2. **Evolver may edit unrelated files through `run_bash`.**
   - Mitigation: prompt exact skill root paths; feature off by default; visible run history; Git-backed manual inspection/revert; future stricter strategy if needed.

3. **Skill paths may be outside workspace root.**
   - Mitigation: service supplies absolute skill root paths and primary `SKILL.md` paths; `run_bash` supports absolute paths.

4. **Some target skills may not be Git-backed.**
   - Mitigation: keep feature hidden/off by default and recommend Git-backed skill packages for testing. MVP may warn when a skill root is not under Git, but no change recorder is required.

5. **Active target run may not really reload changed skill.**
   - Mitigation: next-run correctness baseline; post system notification; future `SkillReloadRequestedEvent` runtime refresh.

6. **Historical skill mismatch.**
   - Current run traces may have used older skill content than current file. Mitigation: record this as known limitation; future `resolvedSkillBindings` snapshot.

7. **Feature-gate bypass.**
   - Mitigation: backend `SelfEvolutionService` checks capability even if UI is hidden; GraphQL start mutations reject when disabled.

8. **Built-in bootstrap refactor regression.**
   - Mitigation: tests for memory compactor setting still initializes; tests for skill evolver setting initializes.

9. **Evolver completion may be mistaken for proof of quality.**
   - Mitigation: MVP UI only links the visible evolver run and must not claim changed files or downstream benefit. Formal metrics are future work.

10. **Config precedence bugs could expose manual actions incorrectly.**
   - Mitigation: one effective-config resolver, run metadata snapshot, and explicit standalone/team examples/tests.

## Guidance For Implementation

- Do not implement scheduled/signal triggers beyond descriptors and rejection paths.
- Do not implement evolver team beyond descriptor and rejection path.
- Do implement `ManualTriggerStrategy`; do not let GraphQL construct evolution requests ad hoc.
- Do implement effective config snapshots for new standalone and team member runs; do not use current definition config to decide old run eligibility.
- Do not add custom file mutation tools for the evolver.
- Treat each configured skill as a folder/package. The editable boundary is the exact skill root directory, not only `SKILL.md`.
- Do not put raw trace JSON, turn IDs, sequence IDs, tool call IDs, or raw trace file paths into the default evolver task prompt. Use anonymized work-history projection, and do not retain raw trace paths in the MVP evidence package or evolution record.
- Default self-evolver `agent-config.json` must include `"run_bash"` in `toolNames` and `defaultLaunchConfig: null`.
- `SingleAgentEvolverStrategy` should call `AgentRunService.createAgentRun` similarly to compaction:

```ts
await agentRunService.createAgentRun({
  agentDefinitionId: resolved.evolverAgentDefinitionId,
  workspaceRootPath: targetLaunchContext.workspaceRootPath,
  llmModelIdentifier: resolved.llmModelIdentifier,
  autoExecuteTools: true,
  llmConfig: resolved.llmConfig,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind: resolved.runtimeKind,
});
```

- The evolution task message should include a clear, concrete direct-edit contract using the work-history frame, for example:

```text
You are helping improve a target worker's durable skill playbooks from prior work evidence.

Editable skill packages:
1. skill-a
   Root directory: /absolute/path/to/skill-a
   Primary guidance file: /absolute/path/to/skill-a/SKILL.md
2. skill-b
   Root directory: /absolute/path/to/skill-b
   Primary guidance file: /absolute/path/to/skill-b/SKILL.md

[WORK_HISTORY_TO_LEARN_FROM]
<anonymized human-readable digest>

Use run_bash to inspect the listed skill roots and edit files only inside those roots if improvement is warranted.
Do not edit agent/team definitions, tool config, MCP config, source code, run memory, or unrelated skill roots.
Do not copy private one-off evidence details into durable skills.
If no general improvement is warranted, make no file changes and explain why.
```

- Prefer an anonymized human-readable work-history digest. Do not include or retain raw trace JSON or raw trace file paths in the default MVP evolver prompt/evidence/provenance contract.
- Start mutations must fail fast with clear messages when:
  - global capability disabled;
  - target run metadata missing;
  - target has no configured skill targets;
  - evolver agent setting missing or invalid;
  - requested strategy is not implemented;
  - target skill roots are not writable.
- Do not add a change recorder/audit service or metrics service in MVP. Keep reviewability through the visible evolver run and Git-backed manual inspection/revert during testing.
- UI should call eligibility query rather than duplicating backend rules.
- Keep all new self-evolution code behind the `self-evolution` subsystem boundary except GraphQL transport, built-in template files, config model additions, and frontend UI/store additions.
