# Investigation Notes: remove-skill-improvement

## Investigation Meta

- Package identifier: `remove-skill-improvement` (Project Task autobyteus-205)
- Request: remove the skill (self-)improvement feature (the user's decision, 2026-10-20: "let's remove it for now, because I have never used it")
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skill-improvement`
- Repository mode: Git; branch `codex/remove-skill-improvement`
- Base: `origin/personal` (fetched 2026-10-20) at worktree creation
- Finalization target: `origin/personal`
- Bootstrap: OK
- Current solution revision ID: SR-001
- Authorities read (2026-10-20): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md` (updated skill), `templates/investigation-notes-template.md`; `DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md`, `TESTING.md` (read earlier in this conversation)
- How findings were established: all **Read** (code and grep) and **Read-only data scans** of `~/.autobyteus/server-data`. Nothing was run against the user's app or data.

## Source Log

| ID | Source | Command / Path | Finding |
| --- | --- | --- | --- |
| F-01 | Code | grep for `skill.?improv`, `retrospective.skill` (excluding `tickets/`, `node_modules`, `dist`) | 123 files: server `src/skill-improvement/` (24 files, 2,173 lines), 3 GraphQL type files plus `schema.ts`, `server-settings-service.ts`, built-in agent registry and template, server tests (`tests/skill-improvement/` 8 files, plus unit, e2e and architecture tests); web components (`SkillImprovementComposerCta`, `SkillImprovementFeatureToggleCard`), 2 stores, GraphQL documents, `generated/graphql.ts`, `types/agent/SkillImprovementConfig.ts`, i18n (en, zh-CN), specs and e2e probes; docs (server modules and README, web docs) |
| F-02 | Code | imports of `skill-improvement/` from outside | Only `api/graphql/types/skill-improvement.ts`: the feature is a leaf |
| F-03 | Code | `skill-improvement-improver-session-service.ts:75`; `direct-agent-run-message-grant-registry.ts`; `global-agent-run-message-router.ts:61-140` | **Direct-message grants are registered only by skill improvement.** The router evaluates them on every `send_message_to`. After the removal the registry stays empty: the registry (186 lines), the grant domain (37 lines) and the router's grant branches become dead |
| F-04 | Code | grep `server_helper` / `launchPurpose` | **Only skill improvement launches `launchPurpose: "server_helper"` runs.** The comment "(compaction, skill improver)" in `agent-run-metadata-types.ts:9` is stale: compaction does not use it. Readers: metadata store, provisioning, `standalone-agent-run-eligibility.ts` (helper runs never become collaboration roots), `agent-run-service.ts:40`. All dead after the removal |
| F-05 | Code | `built-in-agent-registry.ts`; web `utils/agents/builtInAgentDefinitionIds.ts` | The Retrospective Skill Improver is a built-in agent bootstrapped as an ordinary shared definition. The web keeps its id to hide it from `@` mentions. `AgentWorkspaceSurface.vue` / `TeamWorkspaceSurface.vue` hide the composer CTA for it |
| F-06 | Code | `server-settings-service.ts:138-146, 248-316` | Two predefined settings: `ENABLE_SKILL_IMPROVEMENT` and `AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID`. A key in `.env` that is not predefined is listed as a deletable custom setting |
| F-07 | Code | `skill-improvement-target-context-resolver.ts:70-95`; `collaboration-member-memory-targets.ts:64`; location services | autobyteus-197's F-1: skill improvement goes away with the feature. The memory target still takes `agentDefinitionId` from `configuredPlacement`, which the location services fill by address, also for task copies. Within a run a slot's definition never changes, so the value is correct for configured-place copies; for catalog copies it is `null`. Changing it changes the Memory page's attribution, which is a separate decision → FU-001 |
| F-08 | Code | `localization/messages/__tests__/workspaceHistorySkillImprovementCleanup.spec.ts` | A guard test against earlier stale keys of the same feature; it goes with the feature |
| F-09 | Data (read-only) | `~/.autobyteus/server-data` | `memory/skill_improvement/` (index.json + 4 records, 20 KB, all `completed`). `agents/autobyteus-retrospective-skill-improver/` (28 KB). 3 helper runs `memory/agents/retrospective_skill_improver_*` (1.4 MB, 220 KB and 244 KB; from July 2026, **without** `launchPurpose`; all 3 are in `run_history_index.json`, so they already show in history). `.env` holds both settings keys (values not read) |
| F-10 | Code | `tickets/done/link-existing-run-to-task/WITHDRAWN.md` (autobyteus-11) | The precedent: a revert of the product changes; no data step |
| F-11 | Code | migrations mentioning skill improvement (`remove-work-trace-exports-migration.ts`, `custom-provider-readable-id-json-selector-migrator.ts`) | Released migrations name the feature's data paths. They are frozen history and stay unchanged |

## Relevant Existing Behavior

| BEH | Kind | Trigger | Current behavior | Evidence |
| --- | --- | --- | --- | --- |
| BEH-001 | User | Server Settings → Basics | A Skill Improvement toggle card enables the feature | F-01, F-06 |
| BEH-002 | User | Agent or team composer (feature enabled) | An "Improve skills" call to action starts an improvement: a hidden helper run of the Retrospective Skill Improver reads the run's Work Journal and edits skills | F-01, F-03, F-04 |
| BEH-003 | System | Improvement running | The helper run may message the target run through a temporary grant; the improvement record is kept under `memory/skill_improvement/` | F-03, F-09 |
| BEH-004 | System | Startup | The built-in improver definition is bootstrapped and the two settings are predefined | F-05, F-06 |
| BEH-005 | User | `@` mention, history | The improver agent is hidden from `@` mentions; its runs show in history like any run | F-05, F-09 |

## Persisted Data Facts

- Stored by the feature: `memory/skill_improvement/` (index plus records); helper agent definition `agents/autobyteus-retrospective-skill-improver/` (bootstrapped); helper runs `memory/agents/retrospective_skill_improver_*` (ordinary runs); two `.env` keys.
- After the removal nothing reads `memory/skill_improvement/`. The helper definition and runs remain ordinary, valid user data, readable by current code. The `.env` keys show as custom settings.
- Volume on the user's machine: about 1.9 MB in total (F-09).

## Supplemental Artifact Inventory

| Artifact | Purpose | Status | Approval |
| --- | --- | --- | --- |
| `release-notes.md` (this folder) | User-facing notes for the removal | Draft SR-001 | Part of the approval |

## Notes For Architecture Design

- Remove as a leaf (F-02), plus what becomes dead: grants (F-03), `launchPurpose` (F-04), built-in registration (F-05), settings (F-06), web screens and stores, generated GraphQL, i18n, docs, tests.
- Keep shared code that other features use: Work Journal, agent memory location, agent run service and others (counted in F-02's consumer scan).
- Verify the server starts with the user's data shape (records, helper definition, helper runs, `.env` keys) and with a fresh data folder, on synthesized data per TESTING.md.

## Architecture Investigation Findings (2026-10-20)

Authorities read for design: `references/architecture-design.md`, `references/design-principles.md` (updated skill), `DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` (the mandatory migration-conventions read), and `TESTING.md` (changes since the last read concern the test vault only).

| ID | Source | Finding (how established) |
| --- | --- | --- |
| A-01 | Data, read-only: `find memory -maxdepth 6 -name skill_improvement -o -name self_evolution` (excluding `imports/`) | **More feature data than the Task listed** (Read):<br>- root `memory/self_evolution/` (40 KB: `index.json` + 3 `evolution_runs/`; the feature's earlier name, records with `evolverRunId`);<br>- per-run `skill_improvement/improver_session.json` in 2 agent runs and 1 team member;<br>- per-run `self_evolution/evolver_session.json` in 4 agent runs. |
| A-02 | Data, read-only: `.env` keys (values not read) | Also `ENABLE_SELF_EVOLUTION` (no code reads it; it shows as a custom setting today). |
| A-03 | Data, read-only: `agents/` | `autobyteus-skill-evolver` ("Skill Self-Evolver", category self-evolution): an old built-in, no longer registered. The Task says the Skill Self-Evolver stays, so it is kept. No evolver runs exist on disk (the records' `evolverRunId` folders are absent). |
| A-04 | Code: `agent-run-history-catalog-service.ts` `deleteRun` (lines ~300-430), `listCatalogRows` (148-151) | Deleting a run = remove its row from `memory/run_history_index.json` + remove its folder (+ ad-hoc Tasks it hosts). The listing shows only rows whose run package is admitted, so a row without a folder is hidden but stays in the file. (Read) |
| A-05 | Code: `config/app-config.ts:552-566`, `config/app-config-setting-policy.ts:13` | **Existing retirement mechanism for settings:** `retiredSettingNames`. At config initialization each retired key is deleted from `.env` and refused afterwards (precedent: `AUTOBYTEUS_STREAM_PARSER`). Reuse it for the three keys. (Read) |
| A-06 | Code: `migrations/remove-built-in-project-task-manager-migration.ts` | Precedent for removing a retired built-in agent's installed folder (STARTUP_ONLY; FAILED retries next start; no backup). (Read) |
| A-07 | Code: `migrations/remove-work-trace-exports-migration.ts` | Precedent for a structural walk of the memory folder that deletes retired feature folders, excluding nothing it does not recognize; it already deleted `<run>/skill_improvement/work_traces/`. (Read) |
| A-08 | Code: grep `launchPurpose` / `server_helper` in web | The web does not read it. (Read) |
| A-09 | Code: `scripts/smoke-built-in-agents-bootstrap.mjs:26-31` | The build smoke script asserts the improver template is in `dist`. It must change with the built-in removal. (Read) |
