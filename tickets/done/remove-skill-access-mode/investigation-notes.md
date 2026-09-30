# Investigation Notes

## Investigation Meta

- Package identifier: `remove-skill-access-mode`
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skill-access-mode`
- Repository mode: Git
- Task worktree / branch: above / `codex/remove-skill-access-mode`
- Resolved base: `origin/personal` @ `57df63f079363ccab4f2301213f9d8a3458f72fa` (fetched 2026-09-30)
- Finalization target: `origin/personal`
- Bootstrap result: OK
- Current solution revision ID: `SR-005`
- Investigation status: Requirements and architecture investigation complete

## Initial Request And Clarifications

- Original: user suspected autobyteus runtime preloads full SKILL.md into the system prompt (e.g. Daily Assistant).
- Finding: it does not; only a catalog (name, description, path) is appended.
- Clarification 1: user asked whether `PRELOADED_ONLY` is used at all → it is vestigial.
- Clarification 2 (user): "this skill access mode can completely be removed"; "all the configured skills obviously will need to be shown in the catalog".

## Source Log

| Date | Type | Source | Finding |
| --- | --- | --- | --- |
| 2026-09-30 | Code | `autobyteus-ts/src/agent/context/skill-access-mode.ts` | Enum `PRELOADED_ONLY` / `NONE`; default `PRELOADED_ONLY`. |
| 2026-09-30 | Code | `autobyteus-ts/src/agent/system-prompt/append-configured-skills-catalog.ts` | Catalog-only; `NONE` skips it. No body inlining. |
| 2026-09-30 | Doc | `autobyteus-ts/docs/skills_design.md` §~86 | States `PRELOADED_ONLY` does not mean bodies are preloaded. |
| 2026-09-30 | Test | `autobyteus-ts/tests/integration/agent/agent-skills.test.ts` | Asserts body sentinel absent from prompt. |
| 2026-09-30 | Command | `git show a95fd695e^:.../skill-access-mode.ts` | Former 3-value enum incl. `GLOBAL_DISCOVERY` (removed 2026-07-06). |
| 2026-09-30 | Code | `autobyteus-server-ts/src/built-in-agents/templates/daily-assistant/agent-config.json` | `skillScope: ALL_INSTALLED`, tools include `run_bash`, no `read_file`. |
| 2026-09-30 | Code | `skill-service.ts` `resolveConfiguredSkillBindingsForAgent` | `ALL_INSTALLED` → all enabled installed skills. |
| 2026-09-30 | Code | web `chatLaunchService.ts`, `chatTeamLaunchConfig.ts`, `useDefinitionLaunchDefaults.ts`, `AgentOrgRunConfigPanel.vue`, `chatDraftStore.ts`, `agentRunConfigStore.ts`; `agentOrgRunLaunchSeed.ts` throws if not `PRELOADED_ONLY` | All product launch paths hardcode `PRELOADED_ONLY`; no UI control. |
| 2026-09-30 | Command | `git grep` for `SkillAccessMode.NONE`/`'NONE'` in production src | `NONE` only compared (catalog, materializer, codex/claude/acp/agy), never produced. |
| 2026-09-30 | Code | `web/utils/skills/skillRequestInstruction.ts` | `/skill` tags send names only. |
| 2026-09-30 | Code | `run-history/store/run-execution-tree-shared-record-schemas.ts` | `LAUNCH_CONFIGURATION_KEYS` requires `skillAccessMode`; readers project known fields only (unknown fields dropped). |
| 2026-09-30 | Code | `run-history/store/agent-run-metadata-store.ts` | Tolerant read `?? null`. |
| 2026-09-30 | Contract | `autobyteus-application-sdk-contracts/src/index.ts`, README; `application-backend-sdk/src/launch-profile.ts` | `ApplicationSkillAccessMode`; SDK defaults `PRELOADED_ONLY`. Packages v0.1.0, not on npm; bundled apps use `workspace:*` and don't set field. |
| 2026-09-30 | Data | `prisma/migrations/20260309103000_add_channel_binding_launch_preset` | `skill_access_mode` column; table removed by `20260331102000_remove_channel_bindings_table`. Historical only. |

## Structural And Payload Surface Inventory

Non-test production files referencing the field (from `git grep`, excluding tickets/electron-dist/resources):
- autobyteus-ts: `agent/context/{skill-access-mode,agent-config,agent-context-like,index}.ts`, `agent/system-prompt/append-configured-skills-catalog.ts`.
- server-ts (~48 src files): agent-execution (run config, provisioning, services, all runtime backends, compaction), agent-team-execution, agent-org-execution, agent-collaboration, application-orchestration, run-history stores/projections, streaming projector, skill-improvement, GraphQL types (`agent-run`, `agent-team-run`, `agent-org-run`, `run-history`), app-data-migrations (legacy schemas, team-run-execution-tree v1/v2, remove-global-skill-discovery-mode), docs.
- web (~25 prod files): types, stores, services, utils, 2 components, graphql query, generated graphql, docs.
- Contracts: application-sdk-contracts, application-backend-sdk, collaboration-stream-contracts, team-stream-contracts (incl. committed `dist/`).
- Tests: ~150+ files set the field in fixtures.

## Persisted Data And State Facts

- Subjects: per-run agent metadata JSON; team / agent-org execution-tree records (launch configuration).
- Readers: agent metadata tolerant; tree reader requires key and validates enum.
- Must preserve: loadability/restore. Acceptable loss: the value itself.
- Gap: migration-convention decision (architecture phase).

## Supplemental Artifact Inventory

None.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Status |
| --- | --- | --- | --- |
| U-001 | Unknown | Transport behavior when an externally built application bundle still sends `skillAccessMode` | Architecture |
| R-001 | Risk | Large mechanical diff (~250 files incl. tests) | Architecture sequencing |

## Architecture Investigation Findings

Migration convention authority: `autobyteus-server-ts/docs/design/data_migration_guideline.md` @ `380876bc0` (2026-09-29), read in full.

| Finding ID | Source | Observation | Design implication |
| --- | --- | --- | --- |
| AF-001 | Guideline §3 | "Removing an obsolete field, which is ignored on read and dropped on the next ordinary save" needs no migration; "convert strict readers when you touch them". | Decision `Directly Usable — No Migration`; current tree reader stops requiring the key. |
| AF-002 | Guideline §4 | "Before changing a current schema, repoint any released migration that still imports it"; source types are frozen, migration-owned. | Released migrations must stop importing the `autobyteus-ts` enum and current `AgentLaunchConfiguration`/`TeamRunAgentNode`. |
| AF-003 | `git grep` in `src/app-data-migrations` (released shapes must be standalone copies per guideline §4 — AR-002) | Enum imported by: `legacy/released-run-package-shapes/run-execution-tree-shared-record-schemas-v2.ts`, `legacy/team-run-metadata-schema.ts`, `migrations/remove-global-skill-discovery-mode-migration.ts`, `migrations/team-run-execution-tree-v1/{predecessor-team-metadata-converter,team-run-execution-tree-v1-schema,team-run-execution-tree-v1-types}.ts`, `migrations/team-run-member-tree-prerequisite-converter.ts`. Current `AgentLaunchConfiguration` type imported by `legacy/released-run-package-shapes/{agent-org-run-execution-tree-v1,run-execution-tree-shared-records-v2,team-run-execution-tree-v2}.ts`, `migrations/team-run-execution-tree-v2-app-data-migration.ts`, `migrations/team-run-execution-tree-v1/predecessor-team-run-planner.ts`; `legacy/team-run-metadata-types.ts` imports current `TeamRunAgentNode`. **Corrected in SR-005:** the planner and `team-run-execution-tree-v1-builder.ts` (omitted here in SR-003) also use the current `TeamRunConfig` **class as a value** — see AF-015. | Need frozen released types carrying `skillAccessMode`. |
| AF-004 | `app-data-migration-registry.ts` order; `team-run-execution-tree-v2-app-data-migration.ts:82-87`; `agent-org-flat-team-families-v1/agent-org-history-candidate-plan.ts:85-91` | `TeamRunExecutionTreeV2` (registry line 42) writes trees typed by the *current* `AgentLaunchConfiguration`; later `AgentOrgFlatTeamFamiliesV1` (line 48) classifies roots with the frozen strict `team-run-execution-tree-v2-schema` whose `validateLaunchConfiguration` requires `skillAccessMode`. If V2's output lost the field, a direct old→new upgrade would misclassify every flat root as a failed "released nested source". | V2 migration output must stay frozen (keeps writing the field) via a frozen released type. |
| AF-005 | `legacy/released-run-package-shapes/team-run-execution-tree-v2-schema.ts:81-89`, `agent-org-run-execution-tree-v1-schema.ts:88-97`, `migrations/agent-org-flat-team-families-v1/released-team-run-v2-schema.ts`; commit `a7bd0548d` (v1.4.91); `ARCH-REV-001` AR-001 | **Corrected in SR-004.** The frozen tree schemas `assertExactKeys` including `schemaVersion` and require `schemaVersion === 2` (team) / `1` (org) before `validateLaunchConfiguration` runs. The current writer has emitted no `schemaVersion` since `a7bd0548d`, and the tolerant reader drops it on re-save. Every tree lacking `skillAccessMode` therefore also lacks `schemaVersion` and is already rejected by the frozen classifier today; removing the field introduces no new regression. (SR-003 wrongly proposed a classifier repair; it would have had no effect and would have altered a frozen validator against guideline §3.) | No repair. Frozen validators keep exact released key sets incl. `skillAccessMode`; only the enum import becomes a frozen literal. Pre-existing `schemaVersion` exposure recorded as out-of-scope separate-ticket candidate. |
| AF-006 | `run-history/store/run-execution-tree-shared-record-schemas.ts` | Current reader: `requireKeys` + projection of known fields; returns `skillAccessMode`. | Remove key from `LAUNCH_CONFIGURATION_KEYS`, validation and projection. |
| AF-007 | `run-history/store/agent-run-metadata-store.ts:44` | Normalizer projects `skillAccessMode ?? null`. | Remove from type + projection; old value ignored. |
| AF-008 | `agent-team-execution/services/flat-team-topology-planner.ts:177` | Rejects members whose `skillAccessMode` diverges from root. | Rule deleted with the field. |
| AF-009 | `autobyteus-ts/src/agent/context/agent-config.ts` | `skillAccessMode` is positional constructor arg #17 between `memoryDir` and `memoryCompaction`. | Remove parameter; update all positional callers (server factory, tests). |
| AF-010 | `api/graphql/types/{agent-run,agent-team-run,agent-org-run,run-history}.ts` | `registerEnumType(SkillAccessMode, "SkillAccessModeEnum")`; input and output fields. | Remove; regenerate `autobyteus-web/generated/graphql.ts`. |
| AF-011 | `autobyteus-{collaboration,team}-stream-contracts` | DTO fields `skillAccessMode` / `skill_access_mode`; `dist/` committed. | Remove from `src`; rebuild committed `dist`. |
| AF-012 | `built-in-agent-bootstrapper.ts`, `built-in-agent-registry.ts` | `overwrite`: `copyFile` for `agent.md`/`agent-config.json`, `rm -rf` + mirror for `skills/`. `seedIfMissing` used only by Daily Assistant (commit `b7336203a`). | With DEC-002 no definition uses `seedIfMissing` → remove policy, field and seed helpers. |
| AF-013 | `diff` template vs `~/.autobyteus/server-data/agents/autobyteus-daily-assistant/` | `agent-config.json` identical; `agent.md` still has paragraph removed in `74b68c748`. | Confirms copy-if-missing never delivers improvements. |
| AF-014 | `application-run-binding-launch-service.ts` | Launch input is a plain typed object; `skillMode()` normalizes/throws on unknown values. | After removal an extra `skillAccessMode` property from an older app bundle is simply not read (resolves U-001). |
| AF-015 | Implementation `DI-001` (`implementation-design-impact-DI-001.md`); verified: `predecessor-team-run-planner.ts:64-72,109-114`, `team-run-execution-tree-v1-builder.ts:12-27,44`, `agent-team-execution/domain/team-run-config.ts` `cloneAgentLaunchConfiguration` / `cloneTeamRunNode` / constructor | Released migration `20260814_team_run_execution_tree_v1` runs `new TeamRunConfig({ rootTeam: materializeMigrationTeam(...) })`. The constructor rebuilds every node and launch configuration from an explicit key list (unnamed keys dropped; engineer's probe confirmed). The builder then reads `node.skillAccessMode` and validates with the V1 schema, which requires the key. Removing the field from the current class would make the migration fail for every predecessor team run. The class also supplies the migration's structural rejections. These two files are the only `TeamRunConfig` value users under `app-data-migrations/`; all other legacy/migration files were re-checked by the engineer and need only the literal/type freeze. | Frozen copy of the aggregate (types + clone functions + constructor checks) in `legacy/released-team-run-config.ts`; planner and builder use it. |

## Requirement Implications

Removal is behavior-neutral for all supported flows; only persisted-history continuity needs a stated requirement.
