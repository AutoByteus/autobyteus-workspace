# Design Spec — Remove run-level skill access mode; Daily Assistant as platform-owned built-in

## Solution And Approval Basis

- Current solution revision ID: `SR-005` (design revisions: SR-004 after `ARCH-REV-001` AR-001/AR-002; SR-005 after implementation `DI-001`)
- Approved requirements baseline: `requirements-doc.md` SR-003 (REQ-001..006, AC-001..007), user approvals 2026-09-30 (see `solution-revision-record.md`).
- Behavior-defining supplements: None.
- Design status: `Ready`
- Canonical investigation notes: `tickets/in-progress/remove-skill-access-mode/investigation-notes.md` (findings AF-001..AF-015; AF-005 corrected in SR-004; AF-003 corrected and AF-015 added in SR-005).

## Current-State Read

`skillAccessMode` (`PRELOADED_ONLY` | `NONE`) is a run-level value carried from launch input (web / GraphQL / application SDK) through server run configs, persisted run history, stream DTOs and into each runtime backend, where the only effect is "`NONE` → expose no skills". No product flow produces `NONE`. The actual owner of skill selection is the agent definition (`skillScope` + `skillNames`), resolved by `SkillService`. The field is therefore a second, inert authority duplicated across every layer.

Daily Assistant is the only built-in agent using the `seedIfMissing` sync policy; the other two use `overwrite`.

No structural problem exists in the owners themselves; the change is a removal along an existing spine plus a policy simplification.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: ~90 production files across 8 packages (autobyteus-ts 5, server ~48, web ~25, 4 contract packages, docs) and ~150 test/fixture files. Almost all edits are mechanical deletions of one field.
- Architectural risk: `High`
- Risk rationale: removes fields from shared contracts (GraphQL schema, application SDK contracts, two stream-contract packages); changes a persisted-record reader (execution-tree launch configuration) and writer shape; requires repointing released app-data migrations to frozen, standalone legacy types with no behavior change (AF-003, AF-004), including a frozen copy of the team-run config aggregate used as a value by the released V1 migration (AF-015); reverses a built-in agent data-ownership policy (user-editable → platform-owned).
- Escalation trigger: any discovered consumer that *requires* the field at runtime (other clients, stored application presets validated strictly), any released migration whose accept/reject behavior would change at all, or any need for a data migration → return `Design Impact`.

## Architecture Investigation Evidence

| Source | Reference | Observation | Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Data Migration Guideline §3, §4, §7 | AF-001, AF-002 | Obsolete-field removal is reader-absorbed; released migrations keep frozen shapes | No migration; frozen released types | None |
| Migration registry + V2 migration + candidate plan | AF-003..AF-005 | V2 output typed by current type; later strict classifier requires the field. Frozen tree schemas already reject current-written trees on `schemaVersion` (absent since `a7bd0548d`), independent of this change | Freeze V2 output; frozen validators stay byte-for-byte equivalent in behavior | None |
| V1 migration planner + builder; `team-run-config.ts` clone functions | AF-015 (`DI-001`) | Released V1 migration constructs the current `TeamRunConfig` class; its clone functions rebuild nodes from an explicit key list, so removing the field there would make the V1 schema reject every predecessor run | Frozen copy of the aggregate in `legacy/`; planner and builder use it | None |
| Current readers/writers | AF-006, AF-007 | Tolerant projection pattern already in place | Drop key from reader/writer | None |
| Runtimes | requirements BEH-002 | `NONE` checks only | Delete branches | None |
| Built-in bootstrapper | AF-012, AF-013 | Two policies; seed policy single-use | Remove `seedIfMissing` | None |
| Application launch service | AF-014 | No strict-key validation found | Extra legacy property is ignored | Confirm by test |

## Intended Change

1. Delete the skill-access-mode concept from all current code, contracts and newly written data.
2. Keep all existing history readable by ignoring the stored value.
3. Keep released migrations behaviorally frozen with migration-owned copies of the legacy value/type.
4. Add `read_file` to the Daily Assistant template and make every built-in agent overwrite-on-startup; remove the copy-if-missing policy.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Trigger | Existing Behavior | Approved Change | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001/002, AC-002 | AutoByteus run bootstrap | Catalog unless `NONE` | Catalog whenever effective skills exist | DS-001: `AutoByteusAgentRunBackendFactory` → `AgentConfig(skills)` → `SystemPromptProcessingStep` → `appendConfiguredSkillsCatalog` |
| BEH-002 | System | REQ-002, AC-003 | Codex/Claude/ACP/AGY bootstrap | Skip materialization on `NONE` | Always materialize effective skills | DS-001: backend bootstrapper → `WorkspaceSkillMaterializer` / AGY capsule |
| BEH-003 | User | REQ-001, AC-001 | Web launch/edit/restore | Field carried, hardcoded | Field absent | DS-001: web stores/services → GraphQL |
| BEH-004 | Contract | REQ-001, AC-001 | GraphQL / SDK / stream DTO | Field exposed | Field removed | DS-001, DS-002 |
| BEH-005 | System | REQ-003/004, AC-004/005 | History load / run create | Field stored; tree reader requires it | Not written; ignored on read | DS-003: stores ↔ files |
| BEH-006 | System | REQ-005/006, AC-006/007 | Server startup | Daily Assistant seed-if-missing, no `read_file` | Overwrite; template has `read_file` | DS-004: `BuiltInAgentBootstrapper.bootstrap` |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup` (+ small `Behavior Change` for built-in sync policy)
- Current design issue found: `Yes`
- Root cause classification: `Duplicated Policy Or Coordination` (run-level mode duplicates the definition-owned skill scope) with `Legacy Or Compatibility Pressure` (retained after `GLOBAL_DISCOVERY` removal).
- Refactor needed now: `Yes` — the removal itself is the refactor.
- Evidence: investigation Source Log; AF-008 (planner rule guarding a value that never varies).
- Design response: delete the duplicate authority end-to-end; `SkillService` resolution by definition remains the sole owner.
- Intentional deferrals: agent-editor read-only indication for built-ins (separate ticket; residual risk: edits silently revert at restart — user-accepted, DEC-002).

## Terminology

- *Effective skills*: result of `SkillService.resolveConfiguredSkill*ForAgent(definition)` after `skillScope`.
- *Released shape*: a persisted shape as written by an already-shipped version, owned by `app-data-migrations/legacy`.

## Legacy Removal Policy (Mandatory)

- Policy: No backward compatibility; remove legacy code paths.
- In scope: the enum, resolver, every field/parameter/DTO property, the `NONE` branches, the planner divergence rule, the `seedIfMissing` policy.
- Tolerant reading of old records is not a compatibility branch (guideline §3): the reader simply does not name the field.

## Persisted Data / State Transition Decision

- Stored subjects: (1) per-run agent metadata JSON; (2) team and agent-org execution-tree JSON (`launchConfiguration` / `defaultLaunchConfiguration` objects) under the memory dir; (3) Daily Assistant definition files in `<app data>/agents/autobyteus-daily-assistant/`.
- Change: field `skillAccessMode` no longer part of the current shape (1, 2). Files (3) become platform-owned.
- Reader/writer behavior: (1) normalizer projects known fields — drop the field from the projection; (2) `parseLaunchConfiguration` requires keys then projects — drop from required keys, validation and projection; writers emit the exact current shape without it. Old files keep the extra key until their next ordinary save.
- Required semantics under direct use: none depends on the value (always `PRELOADED_ONLY` in product flows; legacy `NONE` intentionally ignored — approved acceptable loss).
- Decision: `Directly Usable — No Migration` for (1) and (2). (3): `Discard or Rebuild` — authoritative source is the shipped template; loss of user edits approved (DEC-002).
- Rationale: guideline §3 lists obsolete-field removal as a compatible change; a rewrite migration would cost a full-history pass for zero semantic benefit.
- Supports: AC-004, AC-005, AC-007.

### Data Migration Guideline checklist (§2)

1. Need: no migration — tolerant reader absorbs it.
2. Availability: unaffected; no startup gate added.
3. Source/target: current tree + metadata shapes inspected (AF-006/007); predecessor migrations inspected (AF-003..005).
4. Disposition: N/A (no conversion). Old records remain valid.
5. Commit/retry: N/A.
6. Current-only boundary: legacy value/type live only in `app-data-migrations/legacy`; released migrations repointed before the current schema changes.
7. Cost: zero additional I/O.
8. References: none cross the changed field.
9. Evidence: tests listed under Guidance.
10. Lessons: `released-run-package-shapes` frozen-copy precedent (guideline §3 "released migrations keep strict classifiers"): frozen validators are not altered; only their enum import is replaced by a frozen literal.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior IDs | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001..004 | Launch input (web / SDK / GraphQL) | Runtime skill exposure | Run services → backend factories | Field is threaded along the whole line |
| DS-002 | Return-Event | BEH-004 | Execution tree / run config | Stream DTO → web hydration | View projectors | DTO field removal |
| DS-003 | Bounded Local | BEH-005 | Store read/write | JSON files | Run-history stores | Persisted shape |
| DS-004 | Bounded Local | BEH-006 | Server startup | App-data agent files | `BuiltInAgentBootstrapper` | Sync policy |

## Primary Execution Spine(s)

DS-001: `Web store / App SDK → GraphQL resolver | ApplicationRunBindingLaunchService → AgentRunService / TeamRunService / AgentOrgRunService → AgentRunConfig / TeamRunConfig → Backend factory (AutoByteus | Codex | Claude | ACP | AGY) → SkillService (definition → effective skills) → runtime exposure (catalog | materializer | capsule)`

After the change the mode no longer rides this line; the backend asks `SkillService` and exposes the result unconditionally.

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Main Nodes | Owner | Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Launch input carries model/runtime/workspace/auto-execute only. Backend resolves effective skills from the definition and always exposes them. | Launch input, run config, backend factory, SkillService | Backend factory per runtime | Skill collision policy (unchanged) |
| DS-002 | Projectors map tree launch configuration to DTOs without the field; web hydration stops reading it. | Tree, projector, DTO, web factory | Projectors | — |
| DS-003 | Stores parse a projection of known fields; writers emit the current key set. | Store, schema | Run-history store | Frozen legacy shapes |
| DS-004 | Startup copies every built-in template over app-data files. | Registry, bootstrapper | Bootstrapper | Setting default init (unchanged) |

## Spine Actors / Main-Line Nodes

Launch input types · `AgentRunConfig` / `TeamRunConfig` (`AgentLaunchConfiguration`) · run services · backend factories/bootstrappers · `SkillService` · `appendConfiguredSkillsCatalog` / `WorkspaceSkillMaterializer` / AGY capsule.

## Ownership Map

- `SkillService`: sole owner of "which skills does this definition have".
- Backend factories/bootstrappers: own exposure mechanics per runtime; no policy.
- Run-history stores: own current persisted shape.
- `app-data-migrations/legacy`: owns every historical shape, including the legacy mode literal.
- `BuiltInAgentBootstrapper`: owns built-in definition files in app data.

## Thin Entry Facades / Public Wrappers

N/A — none introduced.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/context/skill-access-mode.ts`, its exports, `AgentConfig.skillAccessMode` (ctor param, field, `copy`, `toString`), `AgentContextLike.config.skillAccessMode` | Duplicate authority | `AgentConfig.skills` | In This Change | Positional ctor param removed (AF-009) |
| `NONE` branch and mode log text in `append-configured-skills-catalog.ts` | — | unconditional catalog when skills exist | In This Change | |
| Server: field on `AgentRunConfig`, `AgentLaunchConfiguration`, team/org node + input types, provisioning/run/lifecycle services, collaboration launch resolver/handles, compaction + skill-improvement launch resolvers, projection services, `skillMode()` in application launch service | — | — | In This Change | |
| `NONE` branches: `workspace-skill-materializer.ts`, `codex-thread-bootstrapper.ts`, `claude-session-bootstrapper.ts`, `claude-agent-run-context.ts`, `acp-agent-run-backend-factory.ts`, `agy-agent-run-backend-factory.ts`, `agy-run-capsule.ts` (`enabled` derives from presence of skills only) | — | — | In This Change | |
| Divergence rule `flat-team-topology-planner.ts:177` | Guards a removed value | — | In This Change | |
| GraphQL `SkillAccessModeEnum` + fields in `agent-run`, `agent-team-run`, `agent-org-run`, `run-history` types | — | — | In This Change | Regenerate web `generated/graphql.ts` |
| Stream DTO fields (`collaboration-stream-contracts`, `team-stream-contracts`, `src` + committed `dist`) and `team-execution-view-projector.ts` `skill_access_mode` | — | — | In This Change | |
| `ApplicationSkillAccessMode`, launch/preset fields (sdk-contracts), `APPLICATION_HOST_MANAGED_SKILL_ACCESS_MODE`, `normalizeSkillAccessMode`, builder inputs (backend-sdk), README paragraph | — | — | In This Change | |
| Web: `SkillAccessMode` type, config/type fields, all hardcoded `'PRELOADED_ONLY'`, guard in `agentOrgRunLaunchSeed.ts`, equality term in `teamRunConfigUtils.ts`, hydration/form-model mapping, GraphQL selection in `runHistoryQueries.ts` | — | — | In This Change | |
| `BuiltInAgentSyncPolicy`, `syncPolicy` field, `seedFileFromTemplateIfMissing`, `seedDirectoryFromTemplateIfMissing` | Single policy remains | unconditional overwrite | In This Change | |
| Docs: `autobyteus-ts/docs/skills_design.md` (mode paragraphs), server `docs/modules/{antigravity_cli_runtime,application_orchestration,grok_build_runtime,run_history,agent_definition}.md`, web `docs/{agent_execution_architecture,settings,agent_management}.md` | — | — | In This Change | `agent_management.md` currently says "seeded once; user edits persist" |
| Historical ticket docs, applied Prisma SQL, logs | History | — | Not changed | |

## Return Or Event Spine(s)

DS-002: `Execution tree launch configuration → TeamExecutionViewProjector / member run view projection services → stream DTO → web teamExecutionContextFactory / agentOrgContextHydration`. Field removed at every node.

## Bounded Local / Internal Spines

- DS-003 (parent: run-history stores): `file JSON → objectRecord → requireKeys(current keys) → validate → projection`. Matters because the required-key list is the single point that would otherwise reject… nothing new: old records have a superset.
- DS-004 (parent: `BuiltInAgentBootstrapper`): `for each definition → copy agent.md, agent-config.json → mirror skills/ → resolve → init setting default`.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Frozen released shapes | DS-003 | Released migrations | Carry legacy `skillAccessMode` literal/type and unchanged strict validators | Guideline §3/§4 | Current types re-acquire the field, or released migrations change behavior |

## Ownership Boundaries

Current runtime code must not import anything from `app-data-migrations/legacy`. Released migrations must not import the (deleted) `autobyteus-ts` enum nor reference current `AgentLaunchConfiguration` / `TeamRunAgentNode` (by import, intersection or extension) for shapes that include the legacy field; such shapes are standalone copies in `legacy/`.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix |
| --- | --- | --- | --- | --- |
| `SkillService` | scope + name resolution, disabled filter | all backend factories | any run-level skill switch | N/A |
| `app-data-migrations/legacy` | historical shapes | registered migrations only | import from current runtime | N/A |

## Dependency Rules

- Backends depend on `SkillService` results only.
- `legacy/released-skill-access-mode.ts` has no imports from current domain or `autobyteus-ts`.
- Released migration output types that are *released shapes* come from `legacy/`; a migration may import current code only to validate its final output.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| GraphQL `CreateAgentRunInput`, team/org run inputs, run-history resume config, org effective/override config | run launch | unchanged minus field | unchanged | Breaking schema removal; only first-party web client |
| `ApplicationAgentRunLaunch`, team preset/scope/member launch configs | app launch | unchanged minus field | unchanged | |
| `AgentConfig` constructor | native agent config | positional param removed | — | TS compile catches callers |

## Interface Boundary Check

All: singular `Yes`, identity explicit `Yes`, risk `Low`, no action.

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Frozen legacy literal | `ReleasedSkillAccessMode` / `RELEASED_SKILL_ACCESS_MODES` | Yes | Low | Comment: historical, migration-only |
| Frozen launch shape | `ReleasedAgentLaunchConfiguration` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Frozen historical shapes | `app-data-migrations/legacy/released-run-package-shapes` | Extend | Established precedent |
| Built-in sync | `built-in-agents` | Reuse | Existing overwrite path |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spine | Decision |
| --- | --- | --- | --- |
| autobyteus-ts agent context / system-prompt | native config + catalog | DS-001 | Extend (remove) |
| server agent-execution / team / org / collaboration / application-orchestration | run configs, backends | DS-001 | Extend (remove) |
| server run-history + streaming | persistence, projection | DS-002/003 | Extend (remove) |
| server app-data-migrations/legacy | frozen shapes | DS-003 | Extend (add frozen type) |
| server built-in-agents | startup sync | DS-004 | Extend (simplify) |
| contracts packages, web | DTO / client | DS-001/002 | Extend (remove) |

## Draft File Responsibility Mapping

Covered by the Removal Plan; two new files (below).

## Reusable Owned Structures Check

| Repeated Structure | Shared File | Owner | Why | Must Not Become |
| --- | --- | --- | --- | --- |
| Legacy mode literal + validator used by 6 migration/legacy files | `app-data-migrations/legacy/released-skill-access-mode.ts` (literal, `isReleasedSkillAccessMode`) | app-data-migrations | One frozen copy | A runtime dependency |
| Released team-run config node model (launch configuration, agent node, team node, clone/validation, aggregate) used by tree V2 record types, Org tree V1 types, team metadata types, V1 planner and V1 builder | `app-data-migrations/legacy/released-team-run-config.ts` | app-data-migrations | One frozen copy of shape **and** construction checks (AF-015) | A runtime dependency; a place for new behavior |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning? | Redundancy Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `AgentLaunchConfiguration` (current) | Yes | Yes (field removed) | Low | — |
| `ReleasedTeamRunAgentNode` / `ReleasedTeamRunAgentTeamNode` / `ReleasedTeamRunConfig` | Yes | N/A | Low | Standalone copies of the node model as released (13 agent-node keys incl. `skillAccessMode`); same structural checks as the current class at the time of this change |
| `ReleasedAgentLaunchConfiguration` | Yes | N/A | Low | Defined once in `legacy/released-team-run-config.ts`. Standalone, fully written-out released key set (`runtimeKind`, `llmModelIdentifier`, `llmConfig`, `autoExecuteTools`, `skillAccessMode`, `workspaceRootPath`); no reference to current types |

## Final File Responsibility Mapping

| File | Area | Concern | Notes |
| --- | --- | --- | --- |
| NEW `autobyteus-server-ts/src/app-data-migrations/legacy/released-skill-access-mode.ts` | legacy | `RELEASED_SKILL_ACCESS_MODES = ["PRELOADED_ONLY","NONE"] as const`, type, guard | Values equal the enum at the time of removal, preserving each validator's current behavior |
| NEW `autobyteus-server-ts/src/app-data-migrations/legacy/released-team-run-config.ts` | legacy | Frozen copy of the team-run config aggregate as released: `ReleasedAgentLaunchConfiguration`, `ReleasedTeamRunAgentNode`, `ReleasedTeamRunAgentTeamNode`, `ReleasedTeamRunNode`, `cloneReleasedAgentLaunchConfiguration`, `cloneReleasedTeamRunNode`, class `ReleasedTeamRunConfig` (constructor checks: root address `/`, exactly one direct Agent coordinator, direct-child + canonical addresses, duplicate child names case-folded, required ids, handoff clone, application-binding required fields) | Copied verbatim from `agent-team-execution/domain/team-run-config.ts` @ base `57df63f07` **before** the field is removed there. May import stable address/handoff helpers from `agent-collaboration/domain` (existing precedent: `released-team-run-v2-schema.ts`); must not import `team-run-config.ts` or `autobyteus-ts` (AF-015) |
| `legacy/released-run-package-shapes/run-execution-tree-shared-records-v2.ts` | legacy | import `ReleasedAgentLaunchConfiguration` from `legacy/released-team-run-config.ts`; node types use it | replaces import of current type |
| `legacy/released-run-package-shapes/run-execution-tree-shared-record-schemas-v2.ts` | legacy | `validateLaunchConfiguration` keeps its exact released key set **including** `skillAccessMode`; only the enum import is swapped for the frozen literal | No behavior change (AR-001) |
| `legacy/released-run-package-shapes/{team-run-execution-tree-v2,agent-org-run-execution-tree-v1}.ts`, `legacy/team-run-metadata-{schema,types}.ts` | legacy | use frozen types/literal | Released node/launch types come from `legacy/released-team-run-config.ts` (standalone, written out in full); no intersection with or import of current `TeamRunAgentNode` / `AgentLaunchConfiguration` (AR-002) |
| `migrations/team-run-execution-tree-v2-app-data-migration.ts` | migration | output typed `ReleasedAgentLaunchConfiguration`; keeps writing the field | AF-004 |
| `migrations/team-run-execution-tree-v1/predecessor-team-run-planner.ts` | migration | constructs `new ReleasedTeamRunConfig(...)`; node/launch types from `legacy/released-team-run-config.ts`; no import of current `team-run-config.ts` | no behavior change (AF-015) |
| `migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-builder.ts` | migration | input type `{ config: ReleasedTeamRunConfig; … }`; node types from the frozen copy; still emits `skillAccessMode` and validates with the V1 schema | no behavior change (AF-015) |
| `migrations/team-run-execution-tree-v1/{predecessor-team-metadata-converter,team-run-execution-tree-v1-schema,team-run-execution-tree-v1-types}.ts`, `team-run-member-tree-prerequisite-converter.ts`, `remove-global-skill-discovery-mode-migration.ts` | migration | swap enum import for frozen literal | no behavior change |
| `run-history/store/run-execution-tree-shared-record-schemas.ts`, `agent-run-metadata-{store,types}.ts` | run-history | current shape without field | |
| `built-in-agents/built-in-agent-{registry,bootstrapper}.ts`, `templates/daily-assistant/agent-config.json` | built-in | single overwrite path; `read_file` added to `toolNames` | also `scripts/smoke-built-in-agents-bootstrap.mjs` |

## Applied Patterns

Frozen released-shape copies (existing repo pattern); tolerant projection reader (existing).

## Target Subsystem / Folder / File Mapping

No folders created or moved. Two new files, both under `app-data-migrations/legacy/` (`released-skill-access-mode.ts`, `released-team-run-config.ts`); `autobyteus-ts/src/agent/context/skill-access-mode.ts` deleted. Everything else is in-place edits listed in the Removal Plan.

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Note |
| --- | --- | --- | --- | --- |
| `app-data-migrations/legacy/` | Off-Spine Concern | Yes | Low | matches existing use |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Current reader | `LAUNCH_CONFIGURATION_KEYS = ["runtimeKind","llmModelIdentifier","llmConfig","autoExecuteTools","workspaceRootPath"]`; projection returns only these | `if ("skillAccessMode" in launch) …` in current reader | Tolerant ≠ legacy branch |
| Runtime backend | `const skills = skillService.resolve…(definition); materialize(skills)` | `mode === NONE ? [] : skills` | Single authority |
| Frozen validator | unchanged logic; `RELEASED_SKILL_ACCESS_MODES.includes(value)` replaces `Object.values(SkillAccessMode).includes(value)` | making the key optional or otherwise altering accept/reject | Guideline §3: released classifiers stay frozen (AR-001) |
| Released migration using a current class as a value | `new ReleasedTeamRunConfig({ rootTeam: materializeMigrationTeam(...) })` from `legacy/` | `new TeamRunConfig(...)` (current class drops unnamed keys → V1 schema rejects), or reading `skillAccessMode` from legacy metadata around the current class (keeps the migration coupled to current validation) | AF-015 / DI-001 |
| Frozen type | `type ReleasedTeamRunAgentNode = Readonly<{ …all released fields…, skillAccessMode: ReleasedSkillAccessMode }>` | `TeamRunAgentNode & { skillAccessMode }` | Guideline §4 standalone copies (AR-002) |
| V2 migration | `launchConfiguration(v1): ReleasedAgentLaunchConfiguration` incl. `skillAccessMode: value.skillAccessMode` | typing output with current `AgentLaunchConfiguration` | AF-004 |
| Registry | `{ id, templateDirName, displayName, settingDefault? }` | keeping `syncPolicy: "overwrite"` on all three | No single-valued policy field |

## Backward-Compatibility Rejection Log

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep optional deprecated GraphQL/SDK field | Older clients / app bundles | Rejected | Removed; first-party web regenerated; SDK packages are workspace-only |
| Carry `skillAccessMode` around the current `TeamRunConfig` in the V1 migration (DI-001 option 2) | Smaller diff | Rejected | Frozen aggregate copy; released migration decoupled from current validation (guideline §4) |
| Keep enum in autobyteus-ts for migrations | Fewer edits | Rejected | Frozen literal in `legacy/` |
| Data migration stripping the field | Tidy files | Rejected | Tolerant read (guideline §3) |
| Honor stored `NONE` on restore | Fidelity | Rejected | Approved acceptable loss |
| Update-if-untouched / version-gated sync for Daily Assistant | Preserve edits | Rejected (user DEC-002) | Overwrite every startup |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. **Freeze legacy first** (guideline §4): add `released-skill-access-mode.ts` and `released-team-run-config.ts` (copy the aggregate while the current class still has the field); repoint every file in AF-003/AF-015 with no change to any migration's accept/reject behavior. After this step nothing under `app-data-migrations/` imports `agent-team-execution/domain/team-run-config.ts` for a shape or value that carries the field. Server must typecheck with the enum still present.
2. **Server current code**: remove field from domain configs, services, stores (reader/writer), projectors, backends, planner rule, application launch service, GraphQL types.
3. **autobyteus-ts**: remove from `AgentConfig`, `AgentContextLike`, catalog function; delete enum file and export; update server factory positional call.
4. **Contracts**: sdk-contracts, backend-sdk, both stream-contract packages (`src` + rebuild `dist`).
5. **Web**: types, stores, services, utils, components, query; run GraphQL codegen.
6. **Built-in agents**: template `read_file`; remove policy; update smoke script.
7. **Tests/fixtures**: remove the property from fixtures; keep it only in released-data fixtures for migrations and in new "old record still loads" tests.
8. **Docs**.
9. Final gate: `git grep -i "skillAccessMode\|skill_access_mode\|SkillAccessMode"` returns only `app-data-migrations/` (legacy/migrations + their tests), released-data fixtures, persisted-compat tests, historical tickets/SQL.

## Key Tradeoffs

- Breaking contract removal over deprecation: simpler, consistent with clean-cut policy; acceptable because clients are first-party/workspace-bound.
- Extra keys linger in old files until next save: zero cost, guideline-endorsed.
- ~110 lines of frozen aggregate duplicated in `legacy/` in exchange for a released migration whose behavior can no longer drift with the current class.
- Daily Assistant edits are lost at restart in exchange for one rule and universal delivery of improvements.

## Risks

- R-1 (AF-004, AF-015): mis-freezing released migrations could break old→new upgrades. Mitigation: step 1 first; equivalence tests below.
- R-2: large mechanical diff → missed fixture/type. Mitigation: typecheck all packages + final grep gate.
- R-3: an externally built application bundle sending the field. Expected ignored (AF-014); confirm by test.
- R-4: users editing Daily Assistant see silent revert. Accepted (DEC-002); docs updated; follow-up UI ticket candidate.
- R-5: overwrite mirrors `skills/` (removes any agent-local skills a user placed under Daily Assistant). Accepted under DEC-002; template has no `skills/` dir.

## Guidance For Implementation

- Do not add any replacement flag, default, or "always PRELOADED_ONLY" constant in current code.
- AGY capsule: `enabled` = effective skill bindings non-empty (verify current semantics when mode is `PRELOADED_ONLY` with zero skills and keep that outcome).
- Required tests:
  - AC-002: catalog present for configured skills and for `ALL_INSTALLED`; absent with none (update `agent-skills.test.ts`, remove `NONE` case).
  - AC-003: materializer/bootstrappers expose skills with no mode input.
  - AC-004: load + restore fixtures of agent metadata and team / agent-org trees containing `skillAccessMode: "PRELOADED_ONLY"` and `"NONE"`.
  - AC-005: written key sets exclude the field (guideline §3 "tests assert the written key set").
  - AF-004: V2 migration output still validates under the frozen strict V2 schema.
  - AF-015: V1 planner output for a predecessor team run still contains `skillAccessMode` on every launch configuration and passes the V1 schema; the structural rejections still reject (no/duplicate direct coordinator, non-direct-child or non-canonical address, duplicate child name, missing required id, root address not `/`).
  - Frozen-validator equivalence: the frozen launch-configuration validators (V2 shared schema, tree V1 schema, team metadata schema, prerequisite converter, predecessor metadata converter) accept `PRELOADED_ONLY` and `NONE` and reject an unknown value and a missing key, exactly as before.
  - AC-006/007: bootstrapper overwrites edited Daily Assistant files; template includes `read_file`; smoke script updated.
  - R-3: application launch with an extra `skillAccessMode` property succeeds.
- Run typecheck/tests for: autobyteus-ts, autobyteus-server-ts, autobyteus-web, the four contract packages, bundled applications.

## Out-Of-Scope Observation (from ARCH-REV-001, not part of this design)

Since v1.4.91 (`a7bd0548d`) the current writer emits no `schemaVersion`, so a current-written team tree would already be rejected by the frozen strict classifier of `AgentOrgFlatTeamFamiliesV1` if that migration ran while such trees exist. This predates and is independent of this ticket; whether an install can reach that state was not investigated. Separate-ticket candidate for the user.
