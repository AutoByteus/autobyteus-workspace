# Investigation Notes

## Investigation Status

- Bootstrap Status: Dedicated ticket worktree/branch created from refreshed `origin/personal`.
- Current Status: Investigation revised after architecture review round 1 and user clarification.
- Investigation Goal: Classify remaining `self-evolution` / `evolver` / `companion` naming surfaces and design a clean source/API/UI/runtime rename to Skill Improvement terminology.
- Scope Classification (`Small`/`Medium`/`Large`): Large.
- Scope Classification Rationale: Active stale naming spans server source and tests, GraphQL schema, web source/UI/generated GraphQL, docs, settings, built-in identifiers, runtime state paths, run-record JSON, session JSON, task metadata, and historical old-data cleanup references.
- Scope Summary: Clean-cut rename active capability to Skill Improvement / Retrospective Skill Improver / improver across source/API/UI/docs/settings/runtime state. Stale active code must be removed/renamed. Existing manual business behavior should remain equivalent. No data migration/compatibility/fallback code is in scope because the feature is development-phase, disabled by default, and has no user data.
- Primary Questions Resolved:
  - Is `origin/personal` updated with the prior work-trace/body-label ticket? Yes, `origin/personal` includes merge `e948ac84` and delivery commit `45442c8a`.
  - What remaining names are source-only? Many active source names are source-only but coupled to API/runtime names; they should be renamed together.
  - What remaining names are persisted/runtime-facing? Settings keys, built-in definition id, target-scoped session state, global run-record state, GraphQL schema, generated web types, task-message metadata.
  - Should old persisted/dev state be migrated? No. User clarified no users are using the feature and the feature is still disabled/development-phase; code should reflect a clean state only.
  - What is the cleanest ticket scope split? One coherent large rename ticket with no compatibility or migration code.

## Request Context

The prior ticket `work-trace-assistant-speaker-labels` intentionally deferred broader source/API/persisted naming cleanup after completing the narrow work-trace format and built-in template/package rename. The follow-up request asks to investigate and design a separate ticket for the broader naming cleanup from `self-evolution` / `evolver` / `companion` to Skill Improvement / Retrospective Skill Improver / improver.

Architecture review round 1 agreed with the high-level clean-cut rename but rejected the initial migration-based design because migration failure/conflict/session semantics were under-specified. The user then clarified that migration should not be considered because the feature is development-phase, disabled by default, and not used by users. This revision therefore removes migration from scope rather than adding migration detail.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-improvement-naming-refactor`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-improvement-naming-refactor/tickets/done/skill-improvement-naming-refactor`
- Current Branch: `codex/skill-improvement-naming-refactor`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-improvement-naming-refactor`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-07-09.
- Task Branch: `codex/skill-improvement-naming-refactor`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Work only in the dedicated task worktree. The incoming reference paths for the prior ticket pointed at its old `tickets/in-progress` location; the merged base contains the prior artifacts under `tickets/done/work-trace-assistant-speaker-labels/`.

## Prior Ticket Merge Verification

- `origin/personal` HEAD at bootstrap: `45442c8a chore(delivery): record work trace finalization`.
- Prior ticket merge: `e948ac84 Merge branch 'codex/work-trace-assistant-speaker-labels' into personal`.
- Main implementation commit: `ba299b56 feat(server): use canonical work trace labels`.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-09 | Command | `git status --short --branch`; `git remote show origin`; `git worktree list --porcelain`; `git fetch origin --prune`; `git branch codex/skill-improvement-naming-refactor origin/personal`; `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/skill-improvement-naming-refactor codex/skill-improvement-naming-refactor` | Bootstrap dedicated task workspace from latest tracked base. | Base is `origin/personal`; dedicated branch/worktree created successfully. | No |
| 2026-07-09 | Command | `git log --oneline -8 origin/personal --decorate` | Verify prior ticket merge state. | Prior ticket is merged into `origin/personal`; HEAD is delivery finalization. | No |
| 2026-07-09 | Doc | `tickets/done/work-trace-assistant-speaker-labels/{requirements.md,investigation-notes.md,design-spec.md,implementation-handoff.md,code-review-report.md}` | Recover prior scope and deferral rationale after incoming reference paths were stale. | Prior ticket kept broad `SelfEvolution*`, `SelfEvolver*`, `*Companion*`, `autobyteus-skill-evolver`, `self_evolution_*`, and GraphQL/API names intentionally deferred. It only renamed built-in template/package/display wording and work trace format/body labels. | No |
| 2026-07-09 | Command | Python occurrence-count script over `autobyteus-server-ts/src`, `autobyteus-server-ts/tests`, docs, and active web dirs | Quantify remaining stale naming surfaces. | Counts excluding generated GraphQL: `self-evolution` 47 files/167 occurrences, `self_evolution` 21/45, `SelfEvolution` 61/819, `selfEvolution` 24/159, `SELF_EVOLUTION` 20/61, `SelfEvolver` 3/11, `SKILL_EVOLVER` 10/37, `Skill Self-Evolver` 8/9, `evolver` 35/226, `companion` 12/132, `evolutionRunId` 22/79, `evolverRunId` 15/42, `evolverAgentDefinitionId` 17/49, `evolver_session` 3/3, `ENABLE_SELF_EVOLUTION` 7/9, `AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID` 8/21, `autobyteus-skill-evolver` 8/17. | Use allowlist after implementation. |
| 2026-07-09 | Code | `autobyteus-server-ts/src/self-evolution/domain/{models.ts,config.ts,settings.ts,evolver-session.ts,messages.ts}` | Identify domain model and runtime key/field surfaces. | Domain exposes `SelfEvolution*` types, `evolutionRunId`, `evolverStrategy`, `evolverAgentDefinitionId`, `evolverRunId`, statuses `launching_evolver`/`running_evolver`, session fields `currentEvolverRunId`/`priorEvolverRunIds`, `companionRunId`, setting keys `ENABLE_SELF_EVOLUTION` and `AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID`, and grant purpose `self_evolution_skill_update`. | Rename active domain; no old-field fallback. |
| 2026-07-09 | Code | `autobyteus-server-ts/src/self-evolution/services/self-evolution-service.ts` | Understand main orchestration spine. | `SelfEvolutionService` gates capability, resolves target context/skill targets, calls shared `AgentWorkTraceProjectionService.ensureCurrent`, activates `SelfEvolutionCompanionSessionService`, records `evolverRunId`, posts self-improve request, finalizes record. This is the governing owner for the manual Skill Improvement flow. | Rename to `SkillImprovementService`; preserve behavior. |
| 2026-07-09 | Code | `autobyteus-server-ts/src/self-evolution/services/self-evolution-run-store.ts` | Identify run-record persistence paths and scope. | Store defaults to app memory root and writes `<app memoryDir>/self_evolution/evolution_runs/<evolutionRunId>/record.json` and `<app memoryDir>/self_evolution/index.json`; GraphQL lookup takes only `evolutionRunId`. | Keep global app-memory run store; rename path/keys cleanly. |
| 2026-07-09 | Code | `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-evolver-session-store.ts` | Identify improver session persistence. | Store reads/writes target-scoped `<target memoryDir>/self_evolution/evolver_session.json`. | Rename to `SkillImprovementImproverSessionStore`; clean target path `skill_improvement/improver_session.json`; no fallback reads. |
| 2026-07-09 | Code | `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-session-service.ts` | Understand improver actor lifecycle and `companion` naming. | Service creates/reuses/restores a target-scoped Retrospective Skill Improver `AgentRun`, but names the session `companionRunId` and store `evolverSessionStore`. It registers direct-message grants and watches completion. | Rename to `SkillImprovementImproverSessionService`; use `improverRunId`; keep actor semantics. |
| 2026-07-09 | Code | `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-trigger-message-builder.ts` | Identify task packet and metadata names. | Prompt text already mostly says Skill Improvement, but metadata keys are `self_evolution_work_trace_manifest_path`, `self_evolution_work_trace_root_path`, `self_evolution_editable_skill_roots`, `self_evolution_primary_skill_paths`, `self_evolution_entry_skill_paths`, `self_evolution_target_agent_run_id`, and `self_evolution_target_message_type`. | Rename keys to `skill_improvement_*`. |
| 2026-07-09 | Code | `autobyteus-server-ts/src/self-evolution/services/self-evolution-target-notification-service.ts` | Identify notification wording and sender id. | Local event sender id is `system.self_evolution`; message says `Self improve finished for this run.` | Rename sender to `system.skill_improvement`; user text to Skill Improvement wording. |
| 2026-07-09 | Code | `autobyteus-server-ts/src/services/server-settings-service.ts`; `src/self-evolution/domain/settings.ts`; `src/self-evolution/services/self-evolution-settings-service.ts`; `src/built-in-agents/built-in-agent-registry.ts` | Identify server settings and built-in identifiers. | Active settings are `ENABLE_SELF_EVOLUTION` and `AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID`; built-in id constant `SKILL_EVOLVER_AGENT_DEFINITION_ID` has value `autobyteus-skill-evolver`; template dir is already `retrospective-skill-improver`. | Rename keys/id for clean-state runtime; no old key/id fallback. |
| 2026-07-09 | Code | `autobyteus-server-ts/src/api/graphql/types/{self-evolution.ts,self-evolution-graphql-types.ts,self-evolution-graphql-converters.ts}`; `src/api/graphql/schema.ts` | Identify GraphQL API contract. | API exposes `selfEvolutionCapability`, `setSelfEvolutionEnabled`, `selfEvolutionStrategyCatalog`, eligibility queries, start mutations, run-record query, GraphQL `SelfEvolution*` types, `evolutionRunId`, `evolverRunId`, `evolverAgentDefinitionId`, and `evolverStrategy`. | Clean-cut GraphQL rename and frontend/codegen update. |
| 2026-07-09 | Code | `autobyteus-web/graphql/queries/selfEvolutionQueries.ts`; `graphql/mutations/selfEvolutionMutations.ts`; `stores/selfEvolutionStore.ts`; `stores/selfEvolutionCapabilityStore.ts`; `types/agent/SelfEvolutionConfig.ts` | Identify web API consumers. | Web consumes all current GraphQL old names and stores local `SelfEvolution*` interfaces/Pinia stores with `evolutionRunId`/`evolverRunId`. | Rename web files/types/stores and update generated GraphQL. |
| 2026-07-09 | Code | `autobyteus-web/components/workspace/self-evolution/SelfEvolutionComposerCta.vue`; `selfEvolutionComposerCtaTarget.ts`; settings card; workspace views | Identify UI naming and helper-run filtering. | UI folder/component/store use self-evolution names; strings say `self improve`, `Skill Self-Evolver`, `self-improvement`; workspace views hide helper runs by old built-in id and name. | Rename components/data tests/localization and helper constants to Skill Improvement / Retrospective Skill Improver. |
| 2026-07-09 | Doc | `autobyteus-server-ts/docs/modules/self_evolution.md`; `agent_work_traces.md`; `ARCHITECTURE.md`; web docs | Identify docs drift. | Docs currently document `src/self-evolution` as a temporary current source/API module and mention retained `SelfEvolution*` names, old paths, old API fields, and old settings. | Rename docs module and content. |
| 2026-07-09 | Code | `autobyteus-server-ts/src/app-data-migrations/*`; `remove-self-evolution-run-metadata-migration.ts`; `app-data-migration-registry.ts` | Determine whether migration framework is needed. | Framework exists, but after user clarification it should not be extended for this rename. Existing historical migrations may retain old names because they clean up old metadata unrelated to active runtime compatibility. | Do not add migration for this rename. |
| 2026-07-09 | Code | `autobyteus-server-ts/src/agent-definition/providers/agent-definition-config.ts`; web `agentRunStore` tests | Check old launch override cleanup. | Source strips old `selfEvolution` config and tests assert stale launch overrides are omitted. These old-field references describe historical config removal, not active Skill Improvement naming. | Include in legacy allowlist unless implementation finds a cleaner no-old-name assertion shape. |
| 2026-07-09 | Code | `autobyteus-server-ts/src/built-in-agents/templates/retrospective-skill-improver/**` | Confirm prior template/skill state. | Template agent and private skill already use `Retrospective Skill Improver` / `Skill Improvement`; no `companion`/`evolver`/`self-evolution` stale text found there. | No changes expected except built-in id/registry tests. |
| 2026-07-09 | Command | `node -e "const p=require('./autobyteus-server-ts/package.json'); console.log(JSON.stringify(p.scripts,null,2))"`; same for web | Identify verification commands. | Server: `pnpm typecheck`, `pnpm test`, build. Web: `pnpm codegen`, `pnpm test:nuxt`, guards. Codegen needs live backend URL. | Downstream validation should include targeted tests plus codegen where possible. |
| 2026-07-09 | Doc | `design-review-report.md` round 1 | Capture architecture review failure. | High-level direction passed; migration/failure/session/run-record semantics failed. | Rework by removing migration after user clarification and clarifying global run-record scope. |
| 2026-07-09 | User clarification | User messages after review | Resolve whether migration is needed, what legacy cleanup means, and whether business logic should change. | Feature is disabled/development-phase/no users; code should reflect clean state as if no data exists; keep code clean; no data migration; stale code should still be cleaned up; business logic should stay the same. | Requirements/design revised accordingly. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Web composer/settings UI and GraphQL `SelfEvolutionResolver`.
- Current execution flow:
  1. Settings capability uses `SelfEvolutionCapabilityService` and `ENABLE_SELF_EVOLUTION`.
  2. Composer CTA queries `getAgentRunSelfEvolutionEligibility` or `getTeamMemberSelfEvolutionEligibility`.
  3. Start mutation calls `SelfEvolutionService.startForAgentRun` or `startForTeamMember`.
  4. `SelfEvolutionService` resolves current settings, target context, live target state, skill targets, and work trace package.
  5. `SelfEvolutionCompanionSessionService` creates/reuses/restores the visible Retrospective Skill Improver agent run but exposes it as `companionRunId`/`evolverRunId`.
  6. Trigger message points the improver at work trace files and editable skill roots using `self_evolution_*` metadata.
  7. Record lifecycle persists global provenance under `<app memoryDir>/self_evolution/evolution_runs/` and target-scoped session state under `<target memoryDir>/self_evolution/evolver_session.json`.
  8. Direct message grant lets the improver send one `skill_update` to the target run; outcome is persisted in the record.
- Ownership or boundary observations:
  - `SelfEvolutionService` is the authoritative manual workflow owner.
  - `AgentWorkTraceProjectionService` is a shared work-trace capability and should not be moved or renamed as part of this ticket.
  - The `companion` service folder actually owns improver session lifecycle, not companion UX.
  - Settings, built-in ids, GraphQL, and runtime file names are development-phase contracts and can be clean-cut replaced.
- Current behavior summary: Behavior is conceptually Skill Improvement, but active runtime naming, API contracts, and UI/docs still describe self-evolution/evolver/companion.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Refactor / Cleanup.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): File Placement Or Responsibility Drift plus Legacy Or Compatibility Pressure.
- Refactor posture evidence summary: Names no longer describe the owner/role; source-only split would preserve stale public and runtime contracts; migration/compatibility would retain legacy code for unused development-phase state.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `src/self-evolution/**` | Capability source path says self-evolution while behavior is Skill Improvement. | File placement/name drift; folder should be capability-owned `skill-improvement`. | Rename folder and imports. |
| `services/companion/**` | Service launches/reuses a Retrospective Skill Improver run but calls it companion/evolver. | Actor/session naming obscures ownership. | Rename to improver-session. |
| GraphQL files | Public API exposes old names and old fields. | API boundary shape is stale; source-only rename would leave confusion at the user-facing boundary. | Clean-cut schema rename; update web/codegen. |
| Settings/built-in ids | Settings and default id use old development-phase names. | Runtime contract should be clean-state new names. | Rename; no old fallback. |
| Run/session paths | Runtime stores old folders/files/fields/statuses. | Runtime contract should be clean-state new paths. | Rename; no old fallback/migration. |
| Docs/UI | Several user-facing strings still say self improve / Skill Self-Evolver / companion. | Product wording drift. | Rename docs and UI copy. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/self-evolution/domain/models.ts` | Domain types for manual workflow | Contains `SelfEvolution*`, `evolutionRunId`, `evolver*` fields/statuses. | Rename domain model to `SkillImprovement*` and improver fields. |
| `autobyteus-server-ts/src/self-evolution/domain/settings.ts` | Capability/default-improver setting keys | Old setting key constants. | New `ENABLE_SKILL_IMPROVEMENT` and `AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID`. |
| `autobyteus-server-ts/src/self-evolution/domain/evolver-session.ts` | Session state for Retrospective Skill Improver | Contains `SelfEvolutionEvolverSessionState`, `SelfEvolutionCompanionSession`, `companionRunId`. | Rename to `improver-session.ts` and improver session shapes. |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-service.ts` | Main manual orchestration owner | Correct owner but stale naming. | Rename to `SkillImprovementService`. |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-run-store.ts` | Persists global records/index | Uses old global app-memory path and keys. | Rename store and clean target path; keep global scope. |
| `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-evolver-session-store.ts` | Persists target-scoped improver session state | Uses `self_evolution/evolver_session.json`. | Rename path/file; no fallback. |
| `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-session-service.ts` | Improver run session lifecycle | Names visible worker run as companion/evolver. | Rename to improver-session service. |
| `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-trigger-message-builder.ts` | Builds task packet | Prompt mostly current; metadata keys old. | Rename class/metadata keys. |
| `autobyteus-server-ts/src/api/graphql/types/self-evolution*.ts` | GraphQL boundary | Old schema names and fields. | Rename schema boundary cleanly. |
| `autobyteus-web/graphql/*selfEvolution*` | Web GraphQL documents | Consume old API. | Rename documents and operations. |
| `autobyteus-web/stores/selfEvolution*.ts` | Web capability/flow state | Old store/type names. | Rename to skill improvement stores/types. |
| `autobyteus-web/components/workspace/self-evolution/*` | Composer CTA | UI strings and source paths old. | Rename folder/component/localization. |
| `autobyteus-web/components/settings/SelfEvolutionFeatureToggleCard.vue` | Settings toggle card | User-facing old feature name. | Rename component/card/copy. |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts` | Built-in id/template registry | Template name current; default id old. | Rename id constant/value for clean state. |
| `autobyteus-server-ts/src/app-data-migrations/**` | Startup app-data migrations | Historical mechanism exists. | Do not add a migration for this rename. |
| `autobyteus-server-ts/docs/modules/self_evolution.md` | Capability docs | Documents old module/API names as current. | Rename module and content. |
| `autobyteus-server-ts/src/agent-definition/providers/agent-definition-config.ts` | Agent config normalization | Strips old `selfEvolution` config field. | Historical legacy cleanup; allowlist if retained. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-09 | Script | Python occurrence-count script over active source/docs/test/web paths | Large stale-term spread; counts recorded in Source Log. | Scope must be large and include grep/allowlist acceptance. |
| 2026-07-09 | Code trace | Read `SelfEvolutionRunStore` usage | Run records are currently global under app memory and GraphQL lookup takes only run record id. | Keep global run-record scope; clarify requirements. |
| 2026-07-09 | Code trace | Read `AgentWorkTraceProjectionService` and tests | Work traces already use shared `<memoryDir>/work_traces/`; old `<memoryDir>/self_evolution/work_traces` is obsolete and not read. | Do not change work trace format/path in this ticket. |

## External / Public Source Findings

None. This investigation used repository-local source/docs/tests only.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: No live services used during investigation.
- Required config, feature flags, env vars, or accounts: None for investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Worktree/branch bootstrap commands listed in Source Log.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. **The authoritative source folder should be `skill-improvement`, not `skill-improver`.** The subsystem owns more than the worker actor: capability gate, settings, strategy catalog, target context, skill target resolution, work trace package handoff, improver session, records, and target notification.
2. **A source-only rename is not enough.** The old terms are present at active API/UI/settings/runtime boundaries. Renaming only classes/files would leave users and downstream agents reading old GraphQL and settings names.
3. **Migration is not needed for this feature rename.** User clarified the feature is disabled/development-phase/no-users; code should reflect clean state and ignore old local development state.
4. **A compatibility-alias strategy would preserve the problem.** Old GraphQL aliases, old setting fallback reads, old path fallback reads, old built-in id aliases, or old source re-exports would keep two active representations authoritative.
5. **Historical old-name references need an explicit allowlist.** Existing migration ids and cleanup code that remove old `selfEvolutionEffective` data can remain meaningful as old-data cleanup references.
6. **The prior template/skill rename is already complete.** The built-in template folder and private skill package already use `retrospective-skill-improver`; no broad skill text rewrite is needed for this ticket.

## Constraints / Dependencies / Compatibility Facts

- Prior ticket merged to base before this worktree was created.
- Existing generated work traces are not the focus of this follow-up.
- User explicitly prefers clean code over data migration/compatibility for this disabled development-phase feature; stale code should be removed/renamed, while old data can be ignored.
- Project design principles reject backward-compatibility wrappers and dual paths for in-scope behavior.
- Web GraphQL codegen reads schema from a live backend URL (`BACKEND_GRAPHQL_BASE_URL` or `NUXT_PUBLIC_GRAPHQL_BASE_URL`).

## Open Unknowns / Risks

- Large mechanical rename could miss generated or test references.
- Local developer old state may exist but is intentionally outside the runtime contract.
- Codegen may need a temporary live backend during validation.
- Historical migration/cleanup references require a precise allowlist to prevent stale active names from hiding behind the exception.

## Notes For Architect Reviewer

Round 1 migration findings are resolved by a scope change from user clarification: remove migration from scope entirely. The revised design keeps the original clean-cut rename direction, clarifies global app-memory run-record scope, and strengthens the no-compatibility/no-migration contract.
