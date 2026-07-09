# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Remaining `self-evolution`, `evolver`, and `companion` terminology no longer matches the product behavior. The product flow is **Skill Improvement**: a separate **Retrospective Skill Improver** reads target-run work trace evidence and may update configured durable skill packages.

The prior `work-trace-assistant-speaker-labels` ticket intentionally completed only the narrow work-trace/body-label and built-in template/package rename. This follow-up owns the broader source/API/UI/persisted-identifier cleanup.

Authoritative user clarification for this revision: this feature is still development-phase, disabled by default, and not used by users. Therefore the target code should model a clean state as if no old Skill Improvement/self-evolution data exists. Do **not** add data migration, data compatibility, fallback, alias, or old-data cleanup routines for old development-phase state. This does **not** mean preserving stale source code: in-scope legacy code paths, stale source/API/UI names, old runtime identifiers, and old active files must be removed so the code reflects the clean target model. Old local/generated/development data can be ignored or left behind outside the runtime contract.

Target terminology:

- Capability/product workflow: `Skill Improvement`, `skill-improvement`, `skillImprovement`, `skill_improvement`.
- Worker actor: `Retrospective Skill Improver`, `improver`.
- Run provenance: `improvementRunId` for the Skill Improvement request/run record and `improverRunId` for the Retrospective Skill Improver agent run.

The source folder should be `skill-improvement`, not `skill-improver`: the folder owns the full capability orchestration, eligibility, settings, target resolution, work-trace handoff, improver session launch, records, and notification. The improver is one actor inside that capability and should live under an `improver-session` service grouping.

Business-logic preservation boundary: this is a naming/model cleanup refactor, not a behavior redesign. The manual Skill Improvement flow should continue to perform the same business work: capability gating, eligibility checks, live target and writable skill validation, work-trace projection, Retrospective Skill Improver session reuse/launch, direct-message grant setup, task-message send, run-record persistence, completion wait, and final outcome/notification recording. The intended changes are source/folder/file/type/field/API/UI/docs/settings/runtime identifier names and clean-state paths/ids. Do not introduce new strategies, new orchestration semantics, different eligibility rules, different record lifecycle semantics, or different work-trace behavior in this ticket unless a local compile/test fix is strictly required by the rename.

## Investigation Findings

- `origin/personal` contains the finalized prior ticket (`e948ac84` merge and `45442c8a` delivery finalization). The new worktree was created from refreshed `origin/personal`.
- The prior ticket explicitly deferred broad source/API/persisted renames. It renamed the built-in template/package to `retrospective-skill-improver` and display wording to Retrospective Skill Improver, but left active source/API/persisted names such as `src/self-evolution`, `SelfEvolution*`, `evolverRunId`, `self_evolution_*`, `evolver_session.json`, `ENABLE_SELF_EVOLUTION`, and `autobyteus-skill-evolver`.
- Current active server source lives under `autobyteus-server-ts/src/self-evolution/`; tests live under `autobyteus-server-ts/tests/self-evolution/`; GraphQL files are `src/api/graphql/types/self-evolution*`.
- Current active web source has `selfEvolution*` GraphQL documents, stores, component folders, localization keys, settings card, generated GraphQL types, and helper-run filtering constants.
- Current runtime/persisted-name surfaces are development-phase only for this feature and should be clean-cut renamed without migration or fallback:
  - server setting key `ENABLE_SELF_EVOLUTION`;
  - server setting key `AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID`;
  - built-in definition id `autobyteus-skill-evolver`;
  - target-scoped improver session root `<target memoryDir>/self_evolution/` and `evolver_session.json`;
  - global app-memory run-record store `<app memoryDir>/self_evolution/evolution_runs/` plus `<app memoryDir>/self_evolution/index.json`;
  - persisted JSON fields/statuses such as `evolutionRunId`, `evolverRunId`, `evolverAgentDefinitionId`, `currentEvolverRunId`, `priorEvolverRunIds`, `launching_evolver`, and `running_evolver`.
- Runtime task-message metadata currently uses `self_evolution_*` keys. The Retrospective Skill Improver reads the task message and work-trace manifest as dynamic scope; there is no need to keep old metadata keys.
- Work trace projection itself is already shared and stores generated work traces under `<memoryDir>/work_traces/`; this ticket must not change the work trace content format except for Skill Improvement task-message metadata that points at those files.
- Historical migration and cleanup code may still reference old persisted names such as `selfEvolutionEffective`; those references describe old data being removed by previous work and are not active Skill Improvement runtime compatibility.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Refactor / Cleanup.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): File Placement Or Responsibility Drift plus Legacy Or Compatibility Pressure.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now.
- Evidence basis: Active source, API, UI, docs, settings, records, and session-state paths still use stale names after the prior narrow rename. A source-only split would leave public/UI/runtime names saying `selfEvolution`/`evolver`, which is worse than the current known-deferred state.
- Requirement or scope impact: This ticket should be a clean-cut capability rename across active runtime/source/API/UI/docs. It must remove stale code and identifiers, but must not add data migration, compatibility aliases, fallback reads, dual paths, or old-data cleanup routines because the feature has no user data contract yet.

## Recommendations

1. Treat this as a **large, coherent clean-cut rename** rather than a source-only ticket. Rename active server source, GraphQL API, web source/UI, docs, tests, settings keys, built-in default id, session paths, run-record paths, JSON field names, task metadata keys, and generated GraphQL artifacts together.
2. Do **not** implement app-data migration for this feature rename. The feature is development-phase/disabled/no-users, so code should reflect the clean target state only.
3. Do not keep GraphQL aliases, source re-export aliases, old setting fallback reads, old built-in id aliases, old session-path fallback reads, or old run-record path fallback reads. Delete/rename the stale code instead of wrapping it.
4. Preserve old terms only where they are the subject of historical migration/cleanup logic or test fixtures for old persisted data outside this active rename. Those references must be explicitly allowlisted.
5. Keep the built-in template folder and private skill package name `retrospective-skill-improver`, as completed by the prior ticket. Rename the persisted/default built-in agent id to `autobyteus-retrospective-skill-improver` for new clean-state runtime.

## Scope Classification (`Small`/`Medium`/`Large`)

Large.

The change spans server domain/services, GraphQL schema, web GraphQL/stores/components/localization, tracked generated GraphQL artifacts, docs, tests, built-in agent defaults, server settings, and development-phase runtime state names. It intentionally excludes data migration/fallback code while requiring stale source/API/UI/runtime code to be renamed or removed.

## In-Scope Use Cases

- UC-001: Active server source, folder, class/type, method, and test names use Skill Improvement / improver terminology.
- UC-002: Runtime/session naming accurately describes a Retrospective Skill Improver actor instead of an evolver/companion.
- UC-003: GraphQL API and web GraphQL documents expose Skill Improvement / improver names, with no old `selfEvolution`/`evolver` aliases.
- UC-004: Runtime setting keys, built-in default identifiers, run records, session files, metadata keys, and file paths are clean-cut renamed for the new clean-state contract.
- UC-005: Docs, UI strings, settings copy, and user-visible helper-run wording consistently say Skill Improvement / Retrospective Skill Improver / improver.
- UC-006: Historical old-name references that remain are intentionally limited to historical data-cleanup code, fixtures, and docs that explain historical removals. Active legacy code paths are not allowed to remain.

## Out of Scope

- Changing the core Skill Improvement behavior beyond naming and clean-state path/key replacement.
- Changing the Agent Work Trace rendered content format, work trace body labels, work trace storage root, manifest shape, or reasoning-token omission policy completed by the prior ticket.
- Implementing scheduled, signal-based, or team-based improvement strategies.
- Adding service-level diff audits, metrics, benefit reporting, or live skill reload.
- Supporting old GraphQL fields/mutations/types after the rename.
- Supporting old setting keys, old built-in ids, old session files, or old run-record paths as runtime fallbacks.
- Adding app-data migration or old-data cleanup routines for old development-phase self-evolution/skill-improvement state. This out-of-scope item is about persisted data cleanup, not source-code cleanup.
- Renaming historical migration ids that identify already-registered migrations.

## Functional Requirements

- FR-SI-001: Rename the active server capability folder `autobyteus-server-ts/src/self-evolution/` to `autobyteus-server-ts/src/skill-improvement/` and active tests from `tests/self-evolution/` to `tests/skill-improvement/`, except historical migration tests may retain old names when their purpose is old-data cleanup.
- FR-SI-002: Rename active domain/service/type identifiers from `SelfEvolution*`, `SelfEvolver*`, `*Evolver*`, and `*Companion*` to Skill Improvement / improver terminology. Required target names include `SkillImprovementService`, `SkillImprovementRunRecord`, `SkillImprovementCapabilityService`, `SkillImprovementEffectiveConfigResolver`, `SkillImprovementTargetContextResolver`, `RetrospectiveSkillImproverAgentSettingsResolver`, `SkillImprovementImproverSessionService`, `SkillImprovementImproverSessionStore`, `ImproverRunCompletionWatcher`, and `SkillImprovementImproverTriggerMessageBuilder`.
- FR-SI-003: Rename active domain fields and statuses:
  - `evolutionRunId` -> `improvementRunId`;
  - `evolverRunId` -> `improverRunId`;
  - `evolverAgentDefinitionId` -> `improverAgentDefinitionId`;
  - `evolverStrategy` -> `improverStrategy`;
  - `evolverStrategies` -> `improverStrategies`;
  - `defaultEvolverStrategy` -> `defaultImproverStrategy`;
  - `currentEvolverRunId` -> `currentImproverRunId`;
  - `priorEvolverRunIds` -> `priorImproverRunIds`;
  - `launching_evolver` -> `launching_improver`;
  - `running_evolver` -> `running_improver`.
- FR-SI-004: Keep strategy values such as `manual_only`, `scheduled`, `signal_based`, `single_agent`, and `agent_team` unless investigation during implementation finds they are user-facing stale wording. Their labels/descriptions must use improver wording.
- FR-SI-005: Rename runtime persistence paths for active reads/writes in the clean target contract:
  - target-scoped improver session state `<target memoryDir>/self_evolution/evolver_session.json` -> `<target memoryDir>/skill_improvement/improver_session.json`;
  - global app-memory run records `<app memoryDir>/self_evolution/evolution_runs/` -> `<app memoryDir>/skill_improvement/improvement_runs/`;
  - global app-memory run-record index `<app memoryDir>/self_evolution/index.json` -> `<app memoryDir>/skill_improvement/index.json`.
- FR-SI-006: Keep Skill Improvement run records globally scoped under the server app memory root, not target-scoped. `getSkillImprovementRunRecord(improvementRunId)` must continue to require only `improvementRunId`; do not add target selectors or target-memory lookup behavior in this ticket. Target memory directories are only authoritative for target-scoped improver session state and work traces.
- FR-SI-007: Do not add app-data migration, old/new conflict handling, old-data cleanup routines, or startup gating for this rename. The feature is development-phase and disabled/no-user; the runtime contract is clean-state only. Stale source/API/UI/runtime code is still in scope for removal or rename.
- FR-SI-008: Rename server setting keys and methods:
  - `ENABLE_SELF_EVOLUTION` -> `ENABLE_SKILL_IMPROVEMENT`;
  - `AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID` -> `AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID`;
  - `getSelfEvolutionEnabledSetting` / `setSelfEvolutionEnabledSetting` -> `getSkillImprovementEnabledSetting` / `setSkillImprovementEnabledSetting`;
  - `getSelfEvolutionDefaultEvolverAgentDefinitionId` -> `getSkillImprovementDefaultImproverAgentDefinitionId` or a comparably explicit improver name.
- FR-SI-009: Rename the built-in persisted/default agent id for clean-state runtime from `autobyteus-skill-evolver` to `autobyteus-retrospective-skill-improver`. Keep the template directory and private skill package as `retrospective-skill-improver`.
- FR-SI-010: Do not preserve old built-in id session continuity. New runtime should never intentionally launch, resolve, reuse, restore, or filter helper runs by `autobyteus-skill-evolver`. Any old local development session state with that id is outside the runtime contract.
- FR-SI-011: Rename the GraphQL boundary cleanly:
  - resolver/type/file names from `self-evolution*` to `skill-improvement*`;
  - `selfEvolutionCapability` -> `skillImprovementCapability`;
  - `setSelfEvolutionEnabled` -> `setSkillImprovementEnabled`;
  - `selfEvolutionStrategyCatalog` -> `skillImprovementStrategyCatalog`;
  - `getAgentRunSelfEvolutionEligibility` -> `getAgentRunSkillImprovementEligibility`;
  - `getTeamMemberSelfEvolutionEligibility` -> `getTeamMemberSkillImprovementEligibility`;
  - `getSelfEvolutionRunRecord` -> `getSkillImprovementRunRecord`;
  - `startAgentRunSelfEvolution` -> `startAgentRunSkillImprovement`;
  - `startTeamMemberSelfEvolution` -> `startTeamMemberSkillImprovement`;
  - `StartAgentRunSelfEvolutionInput` / `StartTeamMemberSelfEvolutionInput` -> Skill Improvement equivalents;
  - GraphQL fields must use `improvementRunId`, `improverRunId`, `improverAgentDefinitionId`, and `improverStrategy`.
- FR-SI-012: Remove old GraphQL fields/mutations/types rather than retaining aliases. Frontend GraphQL documents and `autobyteus-web/generated/graphql.ts` must be updated to the new schema.
- FR-SI-013: Rename web source and UI state to Skill Improvement terminology, including GraphQL document files, Pinia stores, component folders/components, type files, settings card, localization keys, helper-run filtering constants, tests, and user-visible strings.
- FR-SI-014: UI/user-facing text must not say `self improve`, `self-improvement`, `self-evolution`, `Skill Self-Evolver`, `evolver`, or `companion` for the active feature. Preferred wording is `Skill Improvement`, `Improve skills`, `Retrospective Skill Improver`, and `improver`.
- FR-SI-015: Rename task-message metadata keys from `self_evolution_*` to `skill_improvement_*`. Rename the direct-message grant purpose value from `self_evolution_skill_update` to `skill_improvement_skill_update`, while keeping the business message type value `skill_update`. Rename `sender_id: system.self_evolution` to `system.skill_improvement`.
- FR-SI-016: Rename docs module `autobyteus-server-ts/docs/modules/self_evolution.md` to `skill_improvement.md` and update cross-references in server docs and web docs. Documentation may mention old names only in historical cleanup/decommission notes.
- FR-SI-017: The final repository state must have a documented allowlist for any remaining old terms. Acceptable old-term references are limited to historical migration ids/classes/fixtures, old persisted field names being removed by historical code, and ticket artifacts.
- FR-SI-018: Preserve manual Skill Improvement business behavior: eligibility still checks capability, current target state, implemented strategies, live target, and writable skills; manual start still regenerates work traces, activates/reuses a Retrospective Skill Improver run, sends the concise task packet, records provenance, and waits for/direct-message outcome as before. This ticket renames/refactors the model and identifiers; it does not change orchestration semantics.

## Acceptance Criteria

- AC-SI-001: A source search over active server source, active web source, tests, and docs shows no stale `self-evolution`, `SelfEvolution`, `selfEvolution`, `SELF_EVOLUTION`, `SelfEvolver`, `Skill Self-Evolver`, `evolver`, or `companion` terms except entries covered by the documented legacy allowlist.
- AC-SI-002: `autobyteus-server-ts/src/skill-improvement/` and `autobyteus-server-ts/tests/skill-improvement/` exist, and active imports no longer target `src/self-evolution/`.
- AC-SI-003: The GraphQL schema exposes the new Skill Improvement queries, mutations, input types, object types, and fields listed in FR-SI-011, and no longer exposes the old `selfEvolution*` or `*SelfEvolution*` API names.
- AC-SI-004: Frontend GraphQL documents, stores, components, settings card, localization keys, generated GraphQL artifact, and tests compile against the renamed GraphQL schema.
- AC-SI-005: Runtime session and run-record stores write only the clean target paths under `skill_improvement` / `improvement_runs` / `improver_session.json`. No runtime code reads old `self_evolution`, `evolution_runs`, or `evolver_session.json` paths.
- AC-SI-006: Runtime settings and built-in bootstrap use only `ENABLE_SKILL_IMPROVEMENT`, `AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID`, and `autobyteus-retrospective-skill-improver`. No runtime code reads old setting keys or the old built-in id as fallback.
- AC-SI-007: No app-data migration, old/new conflict handler, startup gating, compatibility wrapper, or old-data cleanup routine is added for this rename; stale code paths are removed/renamed rather than preserved.
- AC-SI-008: A manual start integration test still verifies the same Skill Improvement business flow from request through work-trace projection, improver run activation/reuse, task-message metadata, record persistence, and direct-message outcome, with only the expected renamed API/field/path identifiers changed.
- AC-SI-009: Task-message metadata assertions expect `skill_improvement_*` keys, `target_agent_run_id`, and `skill_update`; no `self_evolution_*` metadata keys are emitted for new requests.
- AC-SI-010: Server settings and built-in bootstrap tests verify the new setting keys and `autobyteus-retrospective-skill-improver` default id for clean-state startup.
- AC-SI-011: Docs and UI copy say Skill Improvement / Retrospective Skill Improver / improver, with old names only in historical cleanup/decommission explanations.

## Constraints / Dependencies

- Build on `origin/personal` after the merged `work-trace-assistant-speaker-labels` ticket.
- Work only in the dedicated ticket worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-improvement-naming-refactor`.
- Follow the project design principle against backward compatibility wrappers and legacy dual paths for in-scope behavior.
- User clarification: this feature is development-phase, disabled by default, and has no user data. Therefore do not design or implement migration for old feature state.
- Web GraphQL codegen requires a running backend schema URL; if codegen cannot be run during implementation, generated artifacts must still be kept aligned and the validation limitation recorded.

## Assumptions

- Skill Improvement is still a development-phase feature and has no stable external API/data contract requiring old-name GraphQL or persisted-state compatibility.
- The active product concept is exactly Skill Improvement by a Retrospective Skill Improver, not autonomous self-evolution.
- Existing old local development state may be ignored because it is outside the user/runtime contract.
- Clean code and clean runtime contracts are more important than preserving unused development-phase state.

## Risks / Open Questions

- Large rename touches many files; missed generated/type references could cause compile failures.
- Local developer machines with old disabled feature state may have stale files/settings that runtime no longer reads. This is acceptable by user clarification.
- Historical migration/cleanup references require a precise allowlist to prevent stale active names from hiding behind the exception.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| UC-001 | FR-SI-001, FR-SI-002, FR-SI-003, FR-SI-017 |
| UC-002 | FR-SI-002, FR-SI-003, FR-SI-005, FR-SI-015, FR-SI-018 |
| UC-003 | FR-SI-011, FR-SI-012, FR-SI-013 |
| UC-004 | FR-SI-005, FR-SI-006, FR-SI-007, FR-SI-008, FR-SI-009, FR-SI-010, FR-SI-015 |
| UC-005 | FR-SI-013, FR-SI-014, FR-SI-016 |
| UC-006 | FR-SI-007, FR-SI-017 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-SI-001 | Repository-wide stale active-name cleanup with explicit legacy allowlist. |
| AC-SI-002 | Server source/test folder and import placement prove the capability is now `skill-improvement`. |
| AC-SI-003 | Public GraphQL API cleanly moves to Skill Improvement names without aliases. |
| AC-SI-004 | Frontend consumers and generated GraphQL artifacts are synchronized with the renamed API. |
| AC-SI-005 | Runtime persistence writes only the clean new state paths. |
| AC-SI-006 | Runtime settings and built-in bootstrap use only clean new identifiers. |
| AC-SI-007 | No migration/compatibility/data-cleanup code is introduced for unused development-phase state, while stale active code is removed/renamed. |
| AC-SI-008 | Core manual workflow behavior remains intact after the rename. |
| AC-SI-009 | Retrospective Skill Improver task metadata uses new names. |
| AC-SI-010 | Settings and built-in default id use new clean-state names. |
| AC-SI-011 | Human-facing docs and UI align with the product concept. |

## Approval Status

Refined after architecture review round 1 and user clarification that no migration is needed because the feature is development-phase, disabled, and has no user data. Ready for architecture re-review.
