# Design Spec

## Current-State Read

The current implementation is conceptually **Skill Improvement** but is still structurally named **self-evolution** across active code and runtime state names. The prior ticket completed the narrow work-trace/body-label and Retrospective Skill Improver template/package rename, but intentionally deferred source/API/runtime names.

Current primary flow:

`Web SelfEvolution CTA -> GraphQL SelfEvolutionResolver -> SelfEvolutionService -> target/skill/work-trace resolution -> SelfEvolutionCompanionSessionService -> Retrospective Skill Improver AgentRun -> SelfEvolutionRunStore / target notification`

Important current ownership boundaries:

- `SelfEvolutionService` is the authoritative manual workflow owner. It gates capability, resolves click-time config, target context, live target, editable skills, work trace package, improver session, record lifecycle, and final outcome.
- `AgentWorkTraceProjectionService` is a shared capability. It already writes generated work traces under `<memoryDir>/work_traces/` and must remain independent of the Skill Improvement subsystem.
- `SelfEvolutionCompanionSessionService` is misnamed: it owns Retrospective Skill Improver session lifecycle, not a generic companion relationship.
- `SelfEvolutionRunStore` persists global app-memory run records under `<app memoryDir>/self_evolution/evolution_runs/` plus `<app memoryDir>/self_evolution/index.json`; GraphQL lookup takes only `evolutionRunId`.
- `SelfEvolutionEvolverSessionStore` persists target-scoped improver session state under `<target memoryDir>/self_evolution/evolver_session.json`.
- GraphQL and web code expose old names as active API/UI contracts.
- Settings and built-in identifiers expose old names: `ENABLE_SELF_EVOLUTION`, `AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID`, and `autobyteus-skill-evolver`.

Architecture review round 1 failed because the initial design attempted to add migration without fully specifying migration safety semantics. The user then clarified that this feature is development-phase, disabled by default, and has no user data. Therefore the target design now treats the system as a clean-state rename: **remove stale code and identifiers, but add no data migration, data compatibility, fallback, aliases, or old-data cleanup routines**.

## Intended Change

Rename the active capability cleanly to **Skill Improvement** across server source, GraphQL, web source/UI/generated artifacts, docs, settings, built-in default id, runtime state paths, task metadata, and tests.

Behavior-preservation boundary: the existing manual improvement business flow remains the same. This design changes names, file/folder placement, API/field identifiers, setting keys, built-in id, runtime state paths, task metadata keys, and stale code structure; it does not redesign eligibility, strategy behavior, work-trace projection, improver session lifecycle, direct-message grant semantics, run-record lifecycle, or completion/notification semantics.

Do not add migration or compatibility behavior. Runtime code should only read and write the new names. Old local/development data is outside the runtime contract. Stale source code, active API names, UI names, setting identifiers, runtime identifiers, and files are not outside scope; they must be renamed or removed.

Folder decision:

- Top-level capability folder: `skill-improvement` because it owns the whole capability.
- Worker/session service grouping: `improver-session` because the Retrospective Skill Improver is the actor inside the capability.
- Do not use top-level `skill-improver`; that would mislabel the capability as only the worker actor.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Refactor / Cleanup.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): File Placement Or Responsibility Drift plus Legacy Or Compatibility Pressure.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence: Active source/API/UI/settings/runtime names still use `self-evolution`, `SelfEvolution`, `evolver`, and `companion` after the prior ticket. Source-only rename would leave stale active GraphQL and runtime names.
- Design response: One coherent clean-state rename across active boundaries while preserving the existing manual flow semantics. Runtime has no old-name fallback paths, no GraphQL aliases, no source aliases, and no migration code; stale code is removed/renamed directly.
- Refactor rationale: Names are part of the capability boundary. The owner is Skill Improvement; the actor is Retrospective Skill Improver. The current folder/service/API names obscure both.
- Intentional deferrals and residual risk, if any: Historical old-data migration ids/fixtures may retain old terms because their subject is old data. No behavior enhancements, metrics, scheduled triggers, team improver execution, work-trace format changes, or old-state migration are included.

## Terminology

- `Skill Improvement`: the product capability/workflow.
- `Retrospective Skill Improver`: the visible worker agent that reads work traces and may edit configured skill packages.
- `improver`: short source/API field name for that worker actor where a concise field is needed.
- `improvementRunId`: id for the Skill Improvement request/provenance record.
- `improverRunId`: id for the Retrospective Skill Improver `AgentRun`.
- `skill_improvement`: runtime directory/key prefix when snake case is needed.
- `clean-state contract`: the target code assumes no old self-evolution state is part of supported runtime behavior.

## Design Reading Order

Read this design from abstract to concrete:

1. data-flow spines;
2. ownership and boundaries;
3. clean-state runtime/API decisions;
4. file/folder mapping;
5. validation guidance.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Replace old active source/API/UI/settings/runtime names directly and remove stale code paths/files rather than preserving wrappers.
- Treat removal as first-class design work: old active GraphQL fields, old setting keys, old built-in ids, old session paths, old record paths, old task metadata keys, old source folders, old web folders, and old docs names are removed/decommissioned in this change.
- Decision rule: Runtime code must not read both old and new settings/paths/fields. Do not add app-data migration, conflict handling, old-data cleanup routines, or startup gating for old self-evolution data. This is a data-state rule, not permission to leave legacy code in place.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Composer/settings user action or API caller | Retrospective Skill Improver request posted and Skill Improvement record persisted | `SkillImprovementService` | Main manual Skill Improvement flow; renamed owners/fields must preserve this behavior without changing orchestration semantics. |
| DS-002 | Primary End-to-End | Settings UI/API capability toggle | Persisted `ENABLE_SKILL_IMPROVEMENT` setting | `SkillImprovementCapabilityService` via `ServerSettingsService` | Capability gate is a public/runtime boundary and must be renamed cleanly. |
| DS-003 | Primary End-to-End | Clean-state server startup | New built-in id/default setting initialized; old feature state ignored | `BuiltInAgentBootstrapper` + Skill Improvement settings owner | Clarifies no migration/gating is added; startup operates only on new identifiers. |
| DS-004 | Return-Event | Retrospective Skill Improver completion/direct message | Target run receives `skill_update`; record outcome persists | Direct-message grant registry + `SkillImprovementRecordLifecycle` | Outcome path must keep behavior while using improver naming. |
| DS-005 | Bounded Local | Improver run event stream | Completion text or timeout | `ImproverRunCompletionWatcher` | The local watcher currently named `CompanionRunCompletionWatcher` must be renamed without changing event semantics. |

## Primary Execution Spine(s)

- DS-001: `Skill Improvement CTA / API -> SkillImprovementResolver -> SkillImprovementService -> Target + Skill + Work Trace Resolution -> SkillImprovementImproverSessionService -> Retrospective Skill Improver AgentRun -> SkillImprovementRunStore`
- DS-002: `Settings UI -> SkillImprovementResolver -> SkillImprovementCapabilityService -> ServerSettingsService -> ENABLE_SKILL_IMPROVEMENT`
- DS-003: `Server startup -> BuiltInAgentBootstrapper -> autobyteus-retrospective-skill-improver template sync -> new default setting if blank`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A user starts Skill Improvement for a live target run/member. GraphQL delegates to `SkillImprovementService`, which resolves current capability/settings, target context, writable skills, and work traces, then activates/reuses an improver session and posts the path-based request. | UI/API caller, GraphQL resolver, `SkillImprovementService`, target context, work trace package, improver session, run record | `SkillImprovementService` | settings resolver, strategy catalog, target context resolver, skill target resolver, work trace projection, record lifecycle, target notification |
| DS-002 | A user toggles the capability setting. The typed capability service initializes disabled if missing and persists the new setting key. | Settings UI, GraphQL resolver, capability service, server settings | `SkillImprovementCapabilityService` | server settings validation/display |
| DS-003 | Server startup syncs the clean-state Retrospective Skill Improver built-in id and initializes the new default setting if blank. Old development-phase built-in ids/settings/state are not read or migrated. | startup, built-in bootstrapper, built-in registry, server settings | `BuiltInAgentBootstrapper` + settings owner | built-in template sync, settings default initialization |
| DS-004 | The Retrospective Skill Improver may send one final `skill_update` message through the grant-scoped router; the outcome is included in the Skill Improvement record. | Retrospective Skill Improver run, direct message grant, target run, record lifecycle | Direct-message grant registry + `SkillImprovementRecordLifecycle` | grant expiry/scope, target liveness, notification summary |
| DS-005 | The improver run watcher observes runtime events and resolves completion text when the run becomes terminal or times out. | improver run events, watcher, waiter | `ImproverRunCompletionWatcher` | timeout handling, segment text accumulation |

## Spine Actors / Main-Line Nodes

- Skill Improvement UI/API boundary
- `SkillImprovementResolver` (thin GraphQL facade)
- `SkillImprovementService` (governing orchestration owner)
- Target context and editable skill target resolution
- Shared Agent Work Trace Projection
- `SkillImprovementImproverSessionService`
- Retrospective Skill Improver `AgentRun`
- `SkillImprovementRunStore` / `SkillImprovementRecordLifecycle`
- Built-in Retrospective Skill Improver clean-state registry/bootstrap

## Ownership Map

| Node | Owns |
| --- | --- |
| `SkillImprovementResolver` | Transport mapping, GraphQL names/types, no workflow policy. Thin facade. |
| `SkillImprovementService` | Manual start/evaluate orchestration, sequencing, capability gate use, target live check, work trace handoff, improver session call, record outcome. Governing owner. |
| `SkillImprovementCapabilityService` | Capability setting semantics, initialize-disabled behavior, typed capability result. |
| `SkillImprovementSettingsService` | Default trigger/improver strategy and default Retrospective Skill Improver agent definition id lookup. |
| `SkillImprovementStrategyCatalogService` | Catalog-visible trigger/improver strategies and implemented/not-implemented checks. |
| `SkillImprovementTargetContextResolver` | Target identity, run/team metadata, workspace, memory dir, runtime/model fallback context. |
| `SkillImprovementSkillTargetResolver` | Configured skill packages and writable `SKILL.md` entry resolution. |
| `AgentWorkTraceProjectionService` | Shared work trace package generation and manifest under `<memoryDir>/work_traces/`; not owned by Skill Improvement. |
| `SkillImprovementImproverSessionService` | Target-scoped Retrospective Skill Improver run creation/reuse/restore, direct-message grant registration, request posting. |
| `SkillImprovementImproverSessionStore` | Target-scoped improver session JSON under `<target memoryDir>/skill_improvement/improver_session.json`. |
| `SkillImprovementRunStore` | Global app-memory Skill Improvement run record and index persistence under `<app memoryDir>/skill_improvement/improvement_runs/`. |
| `SkillImprovementRecordLifecycle` | Initial/patch/final/fail record transitions and notification summary persistence. |
| `SkillImprovementTargetNotificationService` | Active-target local notification fallback when improver direct message is not the source of outcome. |
| `BuiltInAgentBootstrapper` | Clean-state materialization of `autobyteus-retrospective-skill-improver` from the existing `retrospective-skill-improver` template. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `SkillImprovementResolver` | `SkillImprovementService` and `SkillImprovementCapabilityService` | GraphQL transport boundary and schema naming. | Eligibility/start sequencing, session lifecycle, runtime fallback. |
| Web stores (`useSkillImprovementStore`, `useSkillImprovementCapabilityStore`) | Backend GraphQL capability/service | UI state and request dispatch. | Backend eligibility, skill target resolution, direct-message policy. |
| `BuiltInAgentBootstrapper` | Built-in agent registry + settings service | Materializes built-in definition files and initializes blank default setting. | Legacy id aliases or old-state migration. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/self-evolution/` active folder | Capability is Skill Improvement, not self-evolution. | `autobyteus-server-ts/src/skill-improvement/` | In This Change | No source alias barrel. |
| `autobyteus-server-ts/tests/self-evolution/` active tests | Tests should describe current capability. | `tests/skill-improvement/` | In This Change | Historical migration tests may mention old data names. |
| `SelfEvolution*`, `SelfEvolver*`, `*Evolver*`, `*Companion*` active identifiers | Stale or misleading owner/actor names. | `SkillImprovement*`, `RetrospectiveSkillImprover*`, `*Improver*` | In This Change | Old terms allowed only in historical cleanup/fixtures. |
| GraphQL `selfEvolution*` fields/types/mutations | Public API should match product concept. | Skill Improvement GraphQL names | In This Change | No aliases. |
| Web `selfEvolution*` stores/docs/components | UI/source should match product concept. | Skill Improvement web names | In This Change | Update generated GraphQL. |
| `ENABLE_SELF_EVOLUTION` active setting key | Runtime setting name is stale. | `ENABLE_SKILL_IMPROVEMENT` | In This Change | No old-key fallback or migration. |
| `AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID` active setting key | Default-improver setting is stale. | `AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID` | In This Change | No old-key fallback or migration. |
| Built-in id `autobyteus-skill-evolver` | Default built-in id is stale. | `autobyteus-retrospective-skill-improver` | In This Change | Template/private skill remains `retrospective-skill-improver`; no old-id alias. |
| `<target memoryDir>/self_evolution/evolver_session.json` active runtime path | Session path is stale. | `<target memoryDir>/skill_improvement/improver_session.json` | In This Change | No old path read/migration. |
| `<app memoryDir>/self_evolution/evolution_runs` and index active runtime path | Record path is stale. | `<app memoryDir>/skill_improvement/improvement_runs` and index | In This Change | Global scope retained. No old path read/migration. |
| `evolutionRunId`, `evolverRunId`, `evolverAgentDefinitionId`, old statuses | Domain/API field names are stale. | `improvementRunId`, `improverRunId`, `improverAgentDefinitionId`, new statuses | In This Change | No legacy field normalizer. |
| `self_evolution_*` task metadata | Runtime task packet should match current capability. | `skill_improvement_*` metadata | In This Change | No old metadata emitted. |
| `system.self_evolution` sender id and `self_evolution_skill_update` grant purpose | Runtime messaging identifiers stale. | `system.skill_improvement`, `skill_improvement_skill_update` | In This Change | Business message type remains `skill_update`. |
| Historical migration id `20260623_remove_self_evolution_run_metadata` | Already registered historical old-data cleanup id. | N/A | Allowlisted | Do not rename id; it identifies old data cleanup. |

## Return Or Event Spine(s) (If Applicable)

- DS-004 return/event spine: `Retrospective Skill Improver AgentRun -> send_message_to(skill_update) -> DirectAgentRunMessageGrantRegistry -> target AgentRun -> SkillImprovementRecordLifecycle notificationSummary`
- Fallback notification spine: `SkillImprovementRecordLifecycle -> SkillImprovementTargetNotificationService -> target AgentRun SYSTEM_TASK_NOTIFICATION` for cases where direct-message summary is not provided and terminal status is completed.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ImproverRunCompletionWatcher`
- Arrow chain: `AgentRunEvent -> validate run id/status -> capture assistant complete or segment text -> observe terminal/idle -> resolve waiters or timeout`
- Why it matters: It is a small event-driven state machine. Rename only; do not move completion policy into `SkillImprovementService` or GraphQL.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Server settings access | DS-002 | Capability/settings services | Persist setting values and display descriptions. | Settings are cross-feature infrastructure. | Workflow service would own config persistence directly. |
| Strategy catalog | DS-001 | `SkillImprovementService` and eligibility evaluator | Implemented/not-implemented strategy metadata. | Keeps future strategy placeholders out of orchestration. | Service grows catalog/display logic. |
| Target context resolution | DS-001 | `SkillImprovementService` | Load target metadata/workspace/runtime/model context. | Keeps metadata lookups isolated. | Orchestrator mixes run-history/team metadata details. |
| Skill target resolution | DS-001 | `SkillImprovementService` | Resolve configured writable skill packages. | Keeps skill package filesystem checks isolated. | Orchestrator mixes file access policy. |
| Work trace projection | DS-001 | `SkillImprovementService` | Generate readable work trace package. | Shared with future consumers. | Skill Improvement would re-own shared projection. |
| Improver session persistence | DS-001 | `SkillImprovementImproverSessionService` | Persist target-scoped improver continuity. | Keeps session state behind session owner. | Main service would mutate low-level state directly. |
| Clean-state built-in bootstrap | DS-003 | Settings resolver / runtime startup | Materialize and select new Retrospective Skill Improver id when blank. | Product-managed built-in lifecycle already exists. | Skill Improvement service would mutate built-in definitions. |
| GraphQL converters | DS-001 | GraphQL resolver | Map domain records to GraphQL objects. | Keeps transport mapping out of domain. | Domain model would depend on GraphQL shapes. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Work trace package generation | `agent-work-traces` | Reuse | Already owns source reading/rendering/store/manifest. | N/A |
| Built-in Retrospective Skill Improver materialization | `built-in-agents` | Extend | Existing registry/bootstrap owns built-in definition ids/templates/settings defaults. | N/A |
| Settings persistence | `ServerSettingsService` | Extend | Existing central settings registry and `.env` persistence. | N/A |
| GraphQL transport | `api/graphql/types` | Extend | Existing resolver/type pattern. | N/A |
| Web UI state | Pinia stores + existing workspace/settings components | Extend | Existing UI ownership for capability state and composer CTA. | N/A |
| Old-state conversion | App-data migrations | Do not use | User clarified no migration is needed for disabled development-phase feature state. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `skill-improvement` server capability | Domain types, capability, settings, eligibility, orchestration, improver session, records, notification. | DS-001, DS-002, DS-004, DS-005 | `SkillImprovementService` | Create via rename | Replaces `self-evolution`. |
| `agent-work-traces` | Readable work trace projection. | DS-001 | `SkillImprovementService` | Reuse | No content format changes. |
| `built-in-agents` | Built-in Retrospective Skill Improver id/template/default setting. | DS-003 | Bootstrapper/settings | Extend | Template dir remains current. |
| GraphQL API | Skill Improvement schema boundary. | DS-001, DS-002 | Web/API callers | Extend | Rename cleanly. |
| Web workspace/settings | CTA, capability toggle, stores, localization. | DS-001, DS-002 | User-facing UI | Extend | Rename cleanly. |
| Docs | Durable module/user docs. | All | Delivery/docs | Extend | Rename docs module and references. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/skill-improvement/domain/models.ts` | Skill Improvement | Domain model | Shared active domain types and field names. | Existing models file is cohesive after rename. | Yes, used by services/GraphQL. |
| `src/skill-improvement/domain/improver-session.ts` | Skill Improvement | Improver session domain | Session state/request/result types. | Session concepts are distinct from run records. | Yes. |
| `src/skill-improvement/domain/settings.ts` | Skill Improvement | Settings constants | New setting keys. | Small constants boundary. | Yes. |
| `src/skill-improvement/services/skill-improvement-service.ts` | Skill Improvement | Orchestration owner | Manual eligibility/start flow. | Current service is the correct governing owner. | Yes. |
| `src/skill-improvement/services/improver-session/skill-improvement-improver-session-service.ts` | Skill Improvement | Improver session owner | Create/reuse/restore improver run, grant registration, request posting. | Actor/session lifecycle is cohesive. | Yes. |
| `src/api/graphql/types/skill-improvement.ts` | GraphQL API | Transport facade | Skill Improvement queries/mutations. | Mirrors existing resolver pattern. | Uses domain and converters. |
| `autobyteus-web/stores/skillImprovementStore.ts` | Web | UI flow store | Eligibility/start/record state. | Existing store remains cohesive after rename. | GraphQL docs/types. |
| `autobyteus-web/components/workspace/skill-improvement/SkillImprovementComposerCta.vue` | Web | CTA component | Manual start UI. | Existing component remains cohesive after rename. | Uses stores/localization. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Domain run/session field names | `src/skill-improvement/domain/models.ts` and `improver-session.ts` | Skill Improvement | Services, stores, and GraphQL converters share the same concepts. | Yes | Yes | A mixed legacy/new DTO. |
| GraphQL domain-to-transport conversion | `skill-improvement-graphql-converters.ts` | GraphQL API | Keeps resolver thin and mapping explicit. | Yes | Yes | Business policy owner. |
| Server/web stale-term allowlist | Ticket validation notes / implementation handoff | Delivery/review evidence | Keeps old historical references explicit. | Yes | Yes | Runtime compatibility map. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `SkillImprovementRunRecord` | Yes after rename | Yes | Low | Use `improvementRunId` and `improverRunId`; do not keep `evolutionRunId` aliases. |
| `SkillImprovementEffectiveConfig` | Yes after rename | Yes | Low | Use `improverStrategy` and `improverAgentDefinitionId`. |
| `SkillImprovementImproverSessionState` | Yes after rename | Yes | Low | Use `currentImproverRunId` and `priorImproverRunIds`; no legacy session normalizer. |
| GraphQL Skill Improvement types | Yes after rename | Yes | Low | Remove old GraphQL names; regenerate/update web generated artifact. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/skill-improvement/domain/models.ts` | Skill Improvement | Domain | Active Skill Improvement request/config/record/eligibility/target types. | Central domain vocabulary. | Yes |
| `autobyteus-server-ts/src/skill-improvement/domain/config.ts` | Skill Improvement | Config constants/normalization | Default strategies and effective-config normalization using new field names. | Small cohesive normalization file. | Yes |
| `autobyteus-server-ts/src/skill-improvement/domain/settings.ts` | Skill Improvement | Settings constants | New capability/default improver setting keys. | Keeps setting keys near capability domain. | Yes |
| `autobyteus-server-ts/src/skill-improvement/domain/improver-session.ts` | Skill Improvement | Improver session domain | Session state, task request/result types. | Distinct from run records. | Yes |
| `autobyteus-server-ts/src/skill-improvement/domain/messages.ts` | Skill Improvement | Messaging constants | `skill_update` message type and `skill_improvement_skill_update` grant purpose. | Small constants boundary. | Yes |
| `autobyteus-server-ts/src/skill-improvement/services/skill-improvement-service.ts` | Skill Improvement | Orchestrator | Manual start/evaluate flow. | Governing owner. | Yes |
| `autobyteus-server-ts/src/skill-improvement/services/skill-improvement-capability-service.ts` | Skill Improvement | Capability | Enable/disable setting semantics. | Small owner. | Yes |
| `autobyteus-server-ts/src/skill-improvement/services/skill-improvement-settings-service.ts` | Skill Improvement | Settings | Default strategy/improver id resolution. | Isolates server settings access. | Yes |
| `autobyteus-server-ts/src/skill-improvement/services/skill-improvement-effective-config-resolver.ts` | Skill Improvement | Effective config | Builds click-time effective config. | Existing responsibility remains cohesive. | Yes |
| `autobyteus-server-ts/src/skill-improvement/services/skill-improvement-eligibility-evaluator.ts` | Skill Improvement | Eligibility | Eligibility rules. | Existing responsibility remains cohesive. | Yes |
| `autobyteus-server-ts/src/skill-improvement/services/skill-improvement-target-context-resolver.ts` | Skill Improvement | Target context | Target metadata/context resolution. | Existing responsibility remains cohesive. | Yes |
| `autobyteus-server-ts/src/skill-improvement/services/skill-improvement-skill-target-resolver.ts` | Skill Improvement | Skill targets | Configured writable skill roots. | Existing responsibility remains cohesive. | Yes |
| `autobyteus-server-ts/src/skill-improvement/services/skill-improvement-record-lifecycle.ts` | Skill Improvement | Record lifecycle | Initial/patch/final/fail transitions. | Existing responsibility remains cohesive. | Yes |
| `autobyteus-server-ts/src/skill-improvement/services/skill-improvement-run-store.ts` | Skill Improvement | Record persistence | Persist global records/index under new app-memory path. | Existing responsibility remains cohesive. | Yes |
| `autobyteus-server-ts/src/skill-improvement/services/skill-improvement-target-notification-service.ts` | Skill Improvement | Target notification | Local target notification and sender id. | Existing responsibility remains cohesive. | Yes |
| `autobyteus-server-ts/src/skill-improvement/services/retrospective-skill-improver-agent-settings-resolver.ts` | Skill Improvement | Improver launch settings | Resolve selected Retrospective Skill Improver definition/runtime/model/tool requirements. | Actor-specific launch concern. | Yes |
| `autobyteus-server-ts/src/skill-improvement/services/improver-session/skill-improvement-improver-session-service.ts` | Skill Improvement | Improver session | Create/reuse/restore/post request/wait for outcome. | Actor session owner. | Yes |
| `autobyteus-server-ts/src/skill-improvement/services/improver-session/skill-improvement-improver-session-store.ts` | Skill Improvement | Session persistence | Persist `improver_session.json`. | Session persistence only. | Yes |
| `autobyteus-server-ts/src/skill-improvement/services/improver-session/skill-improvement-improver-trigger-message-builder.ts` | Skill Improvement | Task packet builder | Build prompt and `skill_improvement_*` metadata. | Packet composition only. | Yes |
| `autobyteus-server-ts/src/skill-improvement/services/improver-session/improver-run-completion-watcher.ts` | Skill Improvement | Event watcher | Observe Retrospective Skill Improver run completion. | Local event state machine. | No |
| `autobyteus-server-ts/src/skill-improvement/services/improver-session/skill-improvement-skill-package-tree-renderer.ts` | Skill Improvement | Package tree renderer | Render editable skill package tree. | Existing bounded concern. | Yes |
| `autobyteus-server-ts/src/skill-improvement/services/strategies/skill-improvement-strategy-catalog.ts` | Skill Improvement | Strategy catalog | Trigger/improver strategy descriptors. | Catalog only. | Yes |
| `autobyteus-server-ts/src/skill-improvement/services/triggers/skill-improvement-trigger-strategy.ts` | Skill Improvement | Trigger interface | Strategy interface with new domain types. | Interface only. | Yes |
| `autobyteus-server-ts/src/skill-improvement/services/triggers/manual-trigger-strategy.ts` | Skill Improvement | Manual trigger | Builds manual Skill Improvement request. | One implemented trigger. | Yes |
| `autobyteus-server-ts/src/api/graphql/types/skill-improvement.ts` | GraphQL API | Resolver | New Skill Improvement API boundary. | Thin facade. | Converters |
| `autobyteus-server-ts/src/api/graphql/types/skill-improvement-graphql-types.ts` | GraphQL API | Types | New GraphQL object/input types. | Existing pattern. | Domain concepts |
| `autobyteus-server-ts/src/api/graphql/types/skill-improvement-graphql-converters.ts` | GraphQL API | Converters | Domain-to-GraphQL mapping. | Keeps resolver thin. | Domain models |
| `autobyteus-web/graphql/queries/skillImprovementQueries.ts` | Web | GraphQL docs | New Skill Improvement query documents. | Existing pattern. | GraphQL schema |
| `autobyteus-web/graphql/mutations/skillImprovementMutations.ts` | Web | GraphQL docs | New Skill Improvement mutation documents. | Existing pattern. | GraphQL schema |
| `autobyteus-web/stores/skillImprovementStore.ts` | Web | Store | Eligibility/start/record state. | Existing responsibility. | GraphQL docs/types |
| `autobyteus-web/stores/skillImprovementCapabilityStore.ts` | Web | Store | Capability state/toggle. | Existing responsibility. | GraphQL docs/types |
| `autobyteus-web/types/agent/SkillImprovementConfig.ts` | Web | Types | Local effective config types if still needed. | Existing local type file renamed. | GraphQL generated types when practical |
| `autobyteus-web/components/workspace/skill-improvement/SkillImprovementComposerCta.vue` | Web | Component | Composer CTA. | Existing UI owner. | Stores/localization |
| `autobyteus-web/components/settings/SkillImprovementFeatureToggleCard.vue` | Web | Component | Settings toggle. | Existing UI owner. | Capability store |
| `autobyteus-server-ts/docs/modules/skill_improvement.md` | Docs | Module doc | Server Skill Improvement docs. | Replaces old module doc. | N/A |

## Ownership Boundaries

- GraphQL is a transport boundary only; it must not own eligibility or session policy.
- `SkillImprovementService` is the authoritative workflow boundary. Callers must not bypass it to call target context, skill target, work trace, session, or record services for a manual start.
- `SkillImprovementImproverSessionService` owns Retrospective Skill Improver run/session lifecycle. `SkillImprovementService` may call it but must not directly mutate session state.
- `AgentWorkTraceProjectionService` remains the authoritative work trace projection boundary. Skill Improvement calls `ensureCurrent()`; it must not import raw trace readers/renderers/stores directly.
- Clean-state runtime owners read/write only new names. No lower-level store or resolver owns legacy fallback behavior.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `SkillImprovementService` | capability/settings, target context, skill target, work trace handoff, improver session, record lifecycle sequencing | GraphQL resolver, tests, future APIs | GraphQL directly calling session store or target resolver for start flow | Add explicit service methods. |
| `SkillImprovementImproverSessionService` | improver run create/reuse/restore, grant registration, post request, watcher | `SkillImprovementService` | Main service directly writing session JSON or registering grants | Extend session service API. |
| `AgentWorkTraceProjectionService` | source reader, renderer, redactor/store, manifest | `SkillImprovementService` and future consumers | Skill Improvement importing raw trace renderer/store internals | Extend projection API. |
| `ServerSettingsService` | `.env`/process setting persistence and descriptions | Capability/settings services | Services mutating `appConfigProvider.config` directly for feature settings | Add explicit setting methods. |
| `BuiltInAgentBootstrapper` | Built-in template sync and blank setting initialization | Runtime startup | Skill Improvement service directly managing built-in directories | Extend built-in registry/bootstrap if needed. |

## Dependency Rules

Allowed:

- GraphQL resolver -> Skill Improvement services/converters.
- Skill Improvement service -> capability/settings/target/skill/record/session services and shared `AgentWorkTraceProjectionService`.
- Skill Improvement session service -> `AgentRunService`, direct-message grant registry, session store, trigger message builder, watcher.
- Skill Improvement stores -> new GraphQL documents.
- Built-in registry/bootstrap -> new Retrospective Skill Improver id/template/default setting.

Forbidden:

- Runtime Skill Improvement stores/services must not read old `self_evolution` paths or old settings as fallback.
- GraphQL resolver must not expose old aliases.
- Web code must not keep old operation names or old generated types as aliases.
- `agent-work-traces` must not import Skill Improvement internals.
- Callers above `SkillImprovementService` must not bypass it to coordinate manual start internals.
- Do not add app-data migrations, old/new conflict handlers, old-data cleanup routines, or startup gates for old self-evolution state. Remove/rename stale active code instead.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `skillImprovementCapability` | Capability | Read enabled/source/setting key. | None. | Replaces `selfEvolutionCapability`. |
| `setSkillImprovementEnabled(enabled)` | Capability | Persist capability enabled state. | Boolean enabled. | Replaces `setSelfEvolutionEnabled`. |
| `skillImprovementStrategyCatalog` | Strategy catalog | Read trigger/improver strategies. | None. | Fields `improverStrategies`, `defaultImproverStrategy`. |
| `getAgentRunSkillImprovementEligibility(runId)` | Agent run eligibility | Evaluate standalone run. | `runId`. | Explicit subject. |
| `getTeamMemberSkillImprovementEligibility(teamRunId, memberRunId)` | Team member run eligibility | Evaluate selected member. | `teamRunId` + `memberRunId`. | Explicit compound identity. |
| `startAgentRunSkillImprovement(input)` | Agent run manual start | Start Skill Improvement for standalone run. | `StartAgentRunSkillImprovementInput { runId }`. | Returns `improvementRunId`, `improverRunId`, `record`. |
| `startTeamMemberSkillImprovement(input)` | Team member manual start | Start Skill Improvement for selected member. | `StartTeamMemberSkillImprovementInput { teamRunId, memberRunId }`. | Returns new field names. |
| `getSkillImprovementRunRecord(improvementRunId)` | Run record | Read global provenance record. | `improvementRunId`. | Global app-memory store; no target selector. |
| `SkillImprovementService.startForAgentRun` | Domain service | Start manual flow. | `runId`, requester attribution. | Internal source method can keep concise name in class context. |
| `SkillImprovementImproverSessionService.activateOrGet` | Improver session | Reuse/restore/create improver run. | `SkillImprovementTargetContext`. | Returns `improverRunId`. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Agent run eligibility/start | Yes | Yes | Low | Keep separate from team member methods. |
| Team member eligibility/start | Yes | Yes | Low | Keep compound identity. |
| Run record query | Yes | Yes | Low | Keep global app-memory store and `improvementRunId` argument only. |
| Capability toggle | Yes | Yes | Low | Rename setting key and method. |
| Strategy catalog | Yes | N/A | Low | Rename fields to improver. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Capability | `self-evolution` -> `skill-improvement` | Yes | Low after rename | Use top-level folder `skill-improvement`. |
| Worker actor | `evolver`/`companion` -> `Retrospective Skill Improver` / `improver` | Yes | Low after rename | Use `improver` for fields, full actor name for launch settings. |
| Capability run record id | `evolutionRunId` -> `improvementRunId` | Yes | Low after rename | Rename records/API. |
| Worker agent run id | `evolverRunId`/`companionRunId` -> `improverRunId` | Yes | Low after rename | Rename records/session/API. |
| Built-in id | `autobyteus-skill-evolver` -> `autobyteus-retrospective-skill-improver` | Yes | Low after rename | Clean-state default id. |
| Runtime root | `self_evolution` -> `skill_improvement` | Yes | Low after rename | Clean-state path. |

## Applied Patterns (If Any)

- Repository pattern: `SkillImprovementRunStore` and `SkillImprovementImproverSessionStore` remain persistence boundaries; no orchestration moves into stores.
- Strategy catalog: existing strategy descriptor catalog remains, renamed to improver terminology.
- State machine/event watcher: `ImproverRunCompletionWatcher` remains the bounded local event observer.
- Clean-cut replacement: old active names are removed rather than wrapped or migrated.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/skill-improvement/` | Folder | Skill Improvement capability | Active server capability source. | Capability-level owner. | Work trace internals, GraphQL transport, old fallback aliases. |
| `autobyteus-server-ts/src/skill-improvement/domain/` | Folder | Domain | Types/constants. | Separates model vocabulary from services. | Service orchestration. |
| `autobyteus-server-ts/src/skill-improvement/services/` | Folder | Capability services | Workflow, settings, eligibility, records, context. | Existing service decomposition remains readable. | GraphQL/web code. |
| `autobyteus-server-ts/src/skill-improvement/services/improver-session/` | Folder | Improver session | Retrospective Skill Improver run/session lifecycle and task packet. | Actor/session is a structural sub-concern. | Generic workflow orchestration, work trace rendering internals. |
| `autobyteus-server-ts/src/api/graphql/types/skill-improvement*.ts` | Files | GraphQL API | Transport schema/resolver/converters. | Existing GraphQL type pattern. | Domain policy. |
| `autobyteus-server-ts/src/built-in-agents/templates/retrospective-skill-improver/` | Folder | Built-in template | Retrospective Skill Improver template/private skill. | Already correct from prior ticket. | Old id names in content. |
| `autobyteus-server-ts/tests/skill-improvement/` | Folder | Tests | Active Skill Improvement service/API tests. | Mirrors server capability. | Broad unrelated tests. |
| `autobyteus-web/graphql/{queries,mutations}/skillImprovement*.ts` | Files | Web GraphQL docs | New Skill Improvement operations/fragments. | Existing web pattern. | Old operation aliases. |
| `autobyteus-web/stores/skillImprovement*.ts` | Files | Web state | Capability and flow state. | Existing store split remains. | Backend policy. |
| `autobyteus-web/components/workspace/skill-improvement/` | Folder | Web CTA | Manual start component and target type. | Feature UI folder. | Settings card. |
| `autobyteus-web/components/settings/SkillImprovementFeatureToggleCard.vue` | File | Web settings | Capability toggle card. | Settings UI owner. | Composer behavior. |
| `autobyteus-server-ts/docs/modules/skill_improvement.md` | File | Docs | Server module docs. | Replaces old doc module. | Outdated current-state old names except historical notes. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/skill-improvement` | Main-Line Domain-Control | Yes | Low | Capability-level folder matches owner. |
| `services/improver-session` | Off-Spine Concern serving workflow owner | Yes | Low | Separates actor lifecycle from main orchestration. |
| `src/api/graphql/types` | Transport | Yes | Low | Existing GraphQL boundary. |
| `built-in-agents` registry/templates | Off-Spine Concern | Yes | Low | Existing clean-state built-in lifecycle. |
| `autobyteus-web/components/workspace/skill-improvement` | UI feature | Yes | Low | Mirrors user-visible CTA feature. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Top-level folder naming | `src/skill-improvement/services/improver-session/...` | `src/skill-improver/...` containing capability settings/records/eligibility | The capability is broader than the actor. |
| Runtime state | Store writes `skill_improvement/improver_session.json` only. | Store checks old `self_evolution/evolver_session.json` when new file is missing. | Clean state avoids compatibility code. |
| GraphQL rename | `startAgentRunSkillImprovement { improvementRunId improverRunId }` | Keep `startAgentRunSelfEvolution` alias returning `evolutionRunId`. | API boundary should match product concept. |
| Built-in id rename | Default setting value `autobyteus-retrospective-skill-improver`; template dir `retrospective-skill-improver`. | Keep or alias `autobyteus-skill-evolver` because local dev state might have it. | Code should model clean target state only. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old GraphQL fields/mutations as aliases | Could avoid breaking external clients. | Rejected | Rename schema and web consumers; no aliases because feature is development-phase and project rejects legacy wrappers. |
| Read old and new setting keys at runtime | Could preserve local dev settings. | Rejected | Runtime uses only new keys; old local settings are outside contract. |
| Keep built-in id `autobyteus-skill-evolver` as alias | Could preserve local dev helper runs. | Rejected | Clean-state built-in id is `autobyteus-retrospective-skill-improver`. |
| Session store fallback from `self_evolution/evolver_session.json` | Could preserve old local sessions. | Rejected | Runtime writes/reads only `skill_improvement/improver_session.json`. |
| Run store fallback from `self_evolution/evolution_runs` | Could read old local provenance records. | Rejected | Runtime writes/reads only `skill_improvement/improvement_runs`. |
| Source re-export aliases from `src/self-evolution` | Could reduce import churn. | Rejected | Move imports to `src/skill-improvement`; delete old source folder. |
| Emitting both `self_evolution_*` and `skill_improvement_*` task metadata | Could help old improver prompts. | Rejected | Built-in Retrospective Skill Improver guidance uses task message/manifest; emit only new metadata. |
| App-data migration or old-data cleanup routine for old self-evolution state | Initially considered after review. | Rejected after user clarification | Do not add data migration/cleanup; feature has no user data. Keep code clean by deleting/renaming stale active code instead. |

## Derived Layering (If Useful)

Layering is secondary to ownership:

- Web/UI layer: Skill Improvement CTA/settings/stores.
- GraphQL transport layer: Skill Improvement resolver/types/converters.
- Skill Improvement domain/control layer: service, capability, settings, eligibility, target/skill/record/session owners.
- Shared infrastructure: work trace projection, agent execution, direct-message grant registry, built-in agent bootstrap, server settings.

Higher layers must depend on the proper boundary: web -> GraphQL, GraphQL -> `SkillImprovementService`, Skill Improvement -> shared projection/session/records. They must not bypass to lower internals.

## Migration / Refactor Sequence

There is intentionally **no app-data migration sequence** for this rename.

Refactor sequence:

1. Add/rename new Skill Improvement setting constants and built-in id constants. Keep template folder/package unchanged.
2. Rename server folder/files/imports/classes/types/fields/statuses from self-evolution/evolver/companion to Skill Improvement/improver.
3. Update runtime stores to only read/write new settings/paths/fields. Remove old source folder; no compatibility aliases.
4. Rename GraphQL resolver/types/converters/schema registration and update GraphQL tests to assert new fields and old field absence.
5. Rename web GraphQL documents, stores, component folders/components, settings card, localization keys, helper-run filtering constants, and web tests.
6. Regenerate or manually synchronize `autobyteus-web/generated/graphql.ts` against the updated schema.
7. Rename docs module and cross-references; document that old development-phase state is not migrated.
8. Run targeted server and web tests plus typecheck/codegen as practical.
9. Run stale-term search and document remaining allowlisted old names.

Temporary seams allowed during implementation only:

- Intermediate compile failures while files are renamed.
- Tests may include old names only where they verify historical cleanup unrelated to the active Skill Improvement runtime.

Temporary seams that must not remain:

- Old GraphQL aliases.
- Runtime fallback reads/writes for old settings/paths/fields.
- Old source folders or barrels.
- UI strings/data-test ids for active feature with old names.
- New app-data migration or old-data cleanup routine for old self-evolution state.

## Key Tradeoffs

- **One large ticket vs split tickets:** A split source-only rename was rejected because API/settings/UI/runtime names would remain stale and make the state harder to reason about. One coherent rename is larger but leaves one authoritative vocabulary.
- **Migration vs clean-state rename:** Initial review raised valid migration-safety questions. User clarified migration is unnecessary because the feature has no users and is disabled/development-phase. Clean-state rename keeps code cleaner and avoids legacy retention.
- **Built-in id rename now vs defer:** Deferring `autobyteus-skill-evolver` would preserve user-visible stale product naming in settings and helper-run filtering. Rename now with no alias is cleaner.
- **Historical old-term allowlist:** A zero-occurrence old-term goal is unrealistic because historical cleanup code and fixtures may need old names. An explicit allowlist prevents active stale terms from hiding while preserving historical clarity.

## Risks

- Large rename can miss imports, generated types, or tests.
- Local developer machines with old disabled feature state may have stale files/settings that runtime no longer reads. This is accepted by user clarification.
- GraphQL codegen requires a live backend schema URL; generated artifact drift may surface unrelated changes.
- Stale-term allowlist must be accurate enough to distinguish historical cleanup from active runtime terms.

## Guidance For Implementation

- Treat this as clean-state refactor, not data migration. Do not add migration files, old/new path conflict code, old-data cleanup routines, setting-key fallbacks, or old built-in id aliases. Do remove or rename stale active code so the repository reflects the target model.
- Use mechanical rename tools where possible, then inspect semantic names manually. Not every `evolver` occurrence should become the same phrase: actor fields should be `improver`, full launch settings can use `RetrospectiveSkillImprover`.
- Prefer `skill-improvement` for capability folders and `improver-session` for actor lifecycle folders.
- Keep `skill_update` message type unchanged; it describes the target notification business event and is not stale.
- Keep global app-memory scope for run records. Target memory is only for target-scoped improver session state and work traces.
- Do not modify Agent Work Trace renderer/store/manifest format in this ticket.
- After renaming, run a stale-term grep and classify every remaining old term into the allowlist. If an old term is active runtime/API/UI wording, fix it rather than adding it to the allowlist.
- Preserve business behavior while renaming. If a proposed edit changes eligibility decisions, strategy behavior, session reuse/launch rules, direct-message grant policy, record lifecycle transitions, completion wait semantics, or work-trace content, treat it as out of scope unless strictly required to keep the renamed code compiling and the existing tests equivalent.
- Recommended targeted verification before handoff to code review/API-E2E:
  - server typecheck or focused `tsc --noEmit` if feasible;
  - server tests for Skill Improvement service, session service, GraphQL resolver, and built-in bootstrap;
  - web tests for Skill Improvement CTA, settings card, stores, workspace helper-run filtering, localization cleanup;
  - GraphQL codegen against updated backend schema if environment permits.
