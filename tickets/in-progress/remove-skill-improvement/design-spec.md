# Design Spec: remove-skill-improvement

## Solution And Approval Basis

- Current solution revision ID: SR-003
- Approved requirements: SR-002, approved by the user for DEC-001 (2026-10-20: "let's just remove them"); the rest within the direction, user informed. SR-003 adds evidence-only scope inside DEC-001: the feature's earlier-name ("self evolution") leftovers and a third settings key. The user is informed in the same conversation.
- Supplements: `release-notes.md` (SR-003)
- Design status: `Ready`
- Investigation notes: `tickets/in-progress/remove-skill-improvement/investigation-notes.md` (F-01..F-11, A-01..A-09)
- Authorities read (2026-10-20): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (rules 7 and 8), `autobyteus-server-ts/docs/design/data_migration_guideline.md`, `TESTING.md`
- Conflicts or discrepancies: none

## Current-State Read

Skill Improvement is a leaf feature (F-02). Only `api/graphql/types/skill-improvement.ts` imports `src/skill-improvement/`.

Its production path:
1. The web's composer call to action or a GraphQL mutation reaches `SkillImprovementService`.
2. The service checks the capability setting, resolves the target context and skills, and renders the target's Work Journal into a trigger message.
3. `SkillImprovementImproverSessionService` launches a helper run of the built-in Retrospective Skill Improver (`launchPurpose: "server_helper"`) and registers a direct-message grant so the helper can message the target.
4. It records the session under the run (`skill_improvement/improver_session.json`) and the improvement under `memory/skill_improvement/`.

Two mechanisms exist only for this path:
- the direct-message grant registry, which the message router evaluates on every `send_message_to` (F-03);
- the `server_helper` launch purpose, which hides helper runs from collaboration roots (F-04).

Startup also bootstraps the built-in improver definition and predefines two settings (F-05, F-06).

Data left on installs is listed in F-09 and A-01..A-03.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale:
  - **Server:** about 30 source files removed, about 10 modified (GraphQL schema, settings, built-ins, run metadata and launch purpose, message router, config policy).
  - **Server tests:** about 15 removed or changed.
  - **Web:** about 25 files (components, stores, GraphQL documents, generated types, i18n, surfaces, specs, e2e probes).
  - **Docs:** about 15 files.
  - **Plus** one new data migration.
- Architectural risk: `High`
- Risk rationale:
  - a migration that deletes user data on every install;
  - removal of a public GraphQL API;
  - removal of a messaging hook on the `send_message_to` path, which every run uses.

  Each is bounded and evidence-backed, but each is a material persistence, contract or shared-path change.
- Escalation trigger: return to the Solution Designer if
  - code outside the feature turns out to depend on a removed symbol at runtime (dynamic import, script, external client);
  - a data shape exists that the migration's structural recognition does not cover;
  - removing the grant branch changes any `send_message_to` result other than the grant-only codes.

## Architecture Investigation Evidence

| Source | Reference | Observation | Decision | Uncertainty |
| --- | --- | --- | --- | --- |
| Import scan | F-02 | Leaf feature | Remove whole folder plus its GraphQL types | — |
| Shared-symbol scan | F-02 (consumer counts), F-03, F-04 | Grants and `server_helper` used only by the feature; Work Journal, memory location, run service used elsewhere | D-2, D-3; keep the rest | — |
| Settings policy | A-05 | `retiredSettingNames` deletes retired keys from `.env` at startup | D-5 | — |
| Run deletion | A-04 | Row in `run_history_index.json` + folder | Migration removes both | — |
| Precedents | A-06, A-07 | Built-in folder removal; structural memory walk | Migration shape | — |
| User data | F-09, A-01..A-03 | Records, sessions, helper runs, helper definition, 3 keys | Inventory and fixtures below | — |

## Intended Change

Remove Skill Improvement and everything only it uses, and delete its data once at upgrade.

## Change Scope (Mandatory)

- **In scope:** UC-001..UC-004.
  - Server feature folder, GraphQL types and schema registration, settings, built-in registration and template, `launchPurpose`, direct-message grants.
  - Web screens, stores, GraphQL documents, generated types, i18n and built-in id.
  - Docs and tests.
  - Settings retirement in `app-config-setting-policy.ts`.
  - One startup migration.
  - Release notes.
- **Deliberately left alone:**
  - Work Journal (DEC-005);
  - the Skill Self-Evolver definition (Task);
  - memory location services and `configuredPlacement` (FU-001);
  - released migrations that name the feature's paths (F-11);
  - token-usage rows of deleted helper runs, because normal run deletion keeps them too (A-04);
  - Memory Sync mirrors under `memory/imports/`.
- **Follow-ups:** FU-001.

## Relevant Behavior And Production-Path Map (Mandatory)

| BEH | Kind | REQ / AC | Trigger | Existing | Change | Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001 / AC-001 | Server Settings | Toggle card | Removed | — |
| BEH-002 | User | REQ-001 / AC-001 | Composer CTA | Improvement flow | Removed | — |
| BEH-003 | System | REQ-002 / AC-001, AC-002 | `send_message_to` | Grant evaluation, then delivery | Delivery only | DS-001 |
| BEH-004 | System | REQ-001 / AC-001 | Startup | Bootstrap improver; predefine settings | Neither; 3 keys retired | DS-002 |
| BEH-005 | Operational | REQ-004, REQ-005 / AC-003, AC-004 | First start | Data present | Deleted once | DS-003 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `release-notes.md` | User-facing text | REQ-006 / AC-005 | Used by delivery for the next release | SR-003 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup` (feature removal).
- Current design issue found: `Yes`. Two shared-looking mechanisms serve only this feature: the grant check runs on every `send_message_to`, and the `server_helper` purpose is threaded through run metadata, provisioning and eligibility. The metadata types comment that compaction uses `server_helper` is stale (F-04).
- Structural triggers: **Legacy cleanup** (Principle 8): the feature and its mechanisms are removed outright. No other trigger fires: nothing is added.
- Root cause classification: `Legacy Or Compatibility Pressure`.
- Refactor needed now: `Yes`, limited to removal: no shim, no dead remainder (Principle 7).
- Design response: delete; trim the router to its delivery path; drop `launchPurpose`; retire the settings through the existing policy; one migration owns all historical-data knowledge.
- Deferrals: FU-001.

## Terminology

- **Feature data**: improvement and evolution records, per-run session folders, helper runs, the built-in improver definition, and the three settings keys.
- **Helper run**: a run the feature launched to do an improvement.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: everything in the Removal Plan.
- Compatibility kept: `None`. Old `launchPurpose` values in run metadata are ignored by the tolerant reader; the migration deletes the runs that carry them.

## Persisted Data / State Transition Decision (Mandatory)

- **Stored subjects:**
  - `memory/skill_improvement/` and `memory/self_evolution/` (index and records);
  - per-run `skill_improvement/improver_session.json` and `self_evolution/evolver_session.json`;
  - helper runs `memory/agents/<id>/` with rows in `memory/run_history_index.json`;
  - `agents/autobyteus-retrospective-skill-improver/`;
  - three `.env` keys.

  On the user's machine: about 2 MB (F-09, A-01, A-02).
- **Change:** the code that reads and writes them is removed.
- **Decision:**
  - Records, sessions, helper runs and definition: `Migration Required`. Disposition: deletion, decided by the user (DEC-001 C).
  - Settings: deleted through the existing `retiredSettingNames` policy, which already runs at config initialization (A-05).
- **Rationale:** the user's direction to keep data clean; the data is the removed feature's own. Without the migration the records stay as invisible residue and the helper runs and agent stay visible.
- **Supported ACs:** AC-003, AC-004.

### Migration Plan

- **Id:** `20261020_remove_skill_improvement_data`; class `RemoveSkillImprovementDataMigration`; file `src/app-data-migrations/migrations/remove-skill-improvement-data-migration.ts`; `STARTUP_ONLY`, registered last.
- **Inputs (constructor):** `memoryDir`; the installed improver folder `path.join(agentsDir, "autobyteus-retrospective-skill-improver")`. These follow the precedent A-06.
- **Frozen knowledge, migration-owned:**
  - the folder and file names: `skill_improvement`, `self_evolution`, `index.json`, `improvement_runs`, `evolution_runs`, `improver_session.json`, `evolver_session.json`;
  - the record fields `improverRunId` / `evolverRunId`;
  - the built-in id `autobyteus-retrospective-skill-improver`;
  - the metadata value `launchPurpose: "server_helper"`;
  - the history index file name and its row field `runId`.

  Current code knows none of these afterwards.
- **Steps (order matters: collect before deleting):**

| Step | Source | Target | Validation | Failure |
| --- | --- | --- | --- | --- |
| M1 collect helper run ids | `memory/skill_improvement/index.json` and `improvement_runs/*/` (`improverRunId`); `memory/self_evolution/index.json` and `evolution_runs/*/` (`evolverRunId`); every `memory/agents/<id>/run_metadata.json` with `agentDefinitionId == "autobyteus-retrospective-skill-improver"` or `launchPurpose == "server_helper"` | A set of run ids | A run id is used only if it is a canonical id and its folder is directly under `memory/agents/` | Unreadable JSON → that source is skipped and reported (`PRESERVED_UNREADABLE`); a referenced run without a folder is just a history-row candidate |
| M2 remove history rows | `memory/run_history_index.json` | The same array without rows whose `runId` is in the set; one atomic write, only when something changes | Re-read and parse | Write failure → `FAILED` item; the next start retries (the rows are hidden anyway once their folders are gone, A-04) |
| M3 delete helper run folders | `memory/agents/<id>/` for each id | Removed | `lstat` is ENOENT afterwards | `FAILED` item; next start retries |
| M4 delete per-run session folders | Walk `memory/` (excluding `imports/`, as A-07 does): a directory named `skill_improvement` holding `improver_session.json`, or `self_evolution` holding `evolver_session.json` | Removed | — | `FAILED` item; retry |
| M5 delete root records | `memory/skill_improvement/` (holds `index.json` or `improvement_runs/`), `memory/self_evolution/` (holds `index.json` or `evolution_runs/`) | Removed | — | `FAILED` item; retry |
| M6 delete built-in folder | `agents/autobyteus-retrospective-skill-improver/` | Removed (`rm` never follows a symlink) | — | `FAILED` item; retry |

- **Status:** `SUCCEEDED` (all done or nothing present); `SUCCEEDED_WITH_WARNINGS` (an unreadable source was left in place); `FAILED` (an item failed: non-terminal, the next start continues).

  Startup never waits on it beyond the run, and nothing depends on its status (guideline §1, DESIGN rule 7).
- **Idempotency:** each step recognizes what is already gone; a second start finds nothing and reports `SUCCEEDED` with 0 items. One exception: M1 runs before M5, so a retry after M5 succeeded but M3 failed would lose the record-sourced ids. Prevent it by running M5 only when M2 and M3 succeeded for every collected id. The definition-id and `server_helper` sources remain on retry anyway.
- **Backup:** none by the migration (precedents A-06, A-07; guideline §7). The release notes ask users to back up first.
- **Cost:** one pass over `memory/` directories to depth of run and member folders (same as A-07), one read per `memory/agents/*/run_metadata.json`, one write of the history index. On the user's data: 3 run folders (about 1.9 MB), 7 session folders, 2 root folders, 1 definition.
- **Concurrency:** startup-only, before any run starts.
- **Out of scope:** ad-hoc Project Tasks hosted by a helper run (`Technically Possible but Unsupported`: the improver never created Project Tasks); token-usage rows (kept, as normal deletion does).

### Data Migration Guideline Checklist (§2)

| # | Item | Answer |
| --- | --- | --- |
| 1 | Need | The user's decision to delete a removed feature's data (DEC-001 C); a tolerant reader would leave residue and visible orphans |
| 2 | Availability | Never blocks startup or new work; a failed item retries next start |
| 3 | Source and target | Shapes read from released code and the user's data (inventory below); the target is absence |
| 4 | Disposition | `MIGRATED` (deleted), `SKIPPED` (not present), `PRESERVED_UNREADABLE` (warning; untouched), `FAILED` (retry) |
| 5 | Commit and retry | `fs.rm` per item; atomic write of the history index; recognition by presence; ordering guard on M5 |
| 6 | Current-only boundary | All names frozen in the migration; settings through the existing retired-settings policy; no current reader of old shapes remains |
| 7 | Cost | See the Migration Plan |
| 8 | References | Records → helper runs (M1); history rows → run folders (M2/M3); Memory Sync mirrors not touched (a mirror is replaced from its own node) |
| 9 | Evidence | Synthesized fixtures F-1..F-8 below; startup e2e; second start; the user's check after backup |
| 10 | Lessons | Precedents A-06, A-07, `remove-external-messaging-data-migration` (deletion after an explicit feature-removal approval); no backups, journals or startup audits. Independent review: architecture reviewer |

**Shape inventory and fixtures** (user's data, read-only):

| Shape | Count | Fixture |
| --- | --- | --- |
| Root `skill_improvement/` with `index.json` + `improvement_runs/<id>/` (completed records with `improverRunId`) | 1 (4 records) | F-1 |
| Root `self_evolution/` with `index.json` + `evolution_runs/<id>/` (`evolverRunId`, folders absent) | 1 (3 records) | F-2 |
| Agent run with `skill_improvement/improver_session.json` | 2 | F-3 |
| Team member with `skill_improvement/improver_session.json` | 1 | F-3b |
| Agent run with `self_evolution/evolver_session.json` | 4 | F-4 |
| Helper run of the built-in improver, no `launchPurpose`, with a history row | 3 | F-5 |
| Helper run with `launchPurpose: "server_helper"` (written by builds since that field existed) | 0 | F-5b |
| Built-in improver definition folder | 1 | F-6 |
| `.env` with the 3 keys among other keys | 1 | F-7 (config test: the keys removed, other lines byte-identical) |
| Unreadable `index.json`; record pointing at a missing run; unrelated runs, agents (incl. `autobyteus-skill-evolver`) and history rows | 0 / 3 / many | F-8 (untouched, byte-identical) |
| Memory Sync mirror containing the same shapes | 0 | F-8b (untouched) |

## Data-Flow Spine Inventory

| Spine | Scope | BEH | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-003 | Agent calls `send_message_to` | Target run receives the message | `GlobalAgentRunMessageRouter` | Loses its grant check |
| DS-002 | Primary | BEH-004 | Server start | Config and built-ins ready | `AppConfig` / built-in bootstrapper | Retired keys and improver |
| DS-003 | Primary (operational) | BEH-005 | First start of the new build | Feature data gone | `RemoveSkillImprovementDataMigration` | One-time deletion |

## Primary Execution Spine(s)

- DS-001: `send_message_to tool -> GlobalAgentRunMessageRouter.deliver -> collaboration root (deliverExactAgentMessage) or live-run path -> target run`
- DS-002: `app start -> AppConfig.initialize (discardRetiredSettings) -> migrations -> built-in bootstrap (default chat agent only) -> services`
- DS-003: `migration runner -> RemoveSkillImprovementDataMigration (collect -> history rows -> run folders -> sessions -> records -> built-in folder) -> ledger`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | Delivery no longer asks a grant registry first. Every other check and result code is unchanged; `recordGrantUsage` goes away | Router |
| DS-002 | Config deletes the three retired keys from `.env` at initialization. The bootstrapper registers only the default chat agent. Settings no longer predefine the two keys | AppConfig; bootstrapper |
| DS-003 | See the Migration Plan | Migration |

## Spine Actors / Main-Line Nodes

Router; AppConfig; built-in bootstrapper; migration.

## Ownership Map

- Router: delivery decisions for `send_message_to` (unchanged apart from the grant removal).
- `app-config-setting-policy.ts`: the retired setting names.
- Migration: every historical name of the feature's data.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Scope |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/skill-improvement/**` (24 files) | Feature removed | — | In This Change |
| `src/api/graphql/types/skill-improvement.ts`, `skill-improvement-graphql-types.ts`, `skill-improvement-graphql-converters.ts`; their registration in `src/api/graphql/schema.ts` | GraphQL API removed | — | In This Change |
| `src/built-in-agents/templates/retrospective-skill-improver/**`; its entry and id constant in `built-in-agent-registry.ts`; asserts in `scripts/smoke-built-in-agents-bootstrap.mjs` | Built-in removed | — | In This Change |
| `server-settings-service.ts`: the 2 predefined settings, re-exports and `getSkillImprovementDefaultImproverAgentDefinitionId` | Dead | `retiredSettingNames` | In This Change |
| `src/agent-communication/services/direct-agent-run-message-grant-registry.ts`, `src/agent-communication/domain/direct-agent-run-message-grant.ts`; the router's `grantRegistry` dependency, evaluation and `recordGrantUsage` | Dead: only the feature registered grants (F-03) | — | In This Change |
| `AgentRunLaunchPurpose`, `launchPurpose` in `agent-run-metadata-types.ts`, `agent-run-metadata-store.ts`, `agent-run-provisioning-service.ts`, `agent-run-service.ts`; the helper check in `standalone-agent-run-eligibility.ts` | Dead: the only writer was the feature (F-04); the stale "compaction" comment goes too | — | In This Change |
| Server tests: `tests/skill-improvement/**`, `tests/unit/skill-improvement-skill-package-tree-renderer.test.ts`, `tests/e2e/runtime/work-journal-skill-improvement.e2e.test.ts`; grant and launch-purpose cases in router, metadata, eligibility and settings tests; built-in template tests; architecture-test entries | Their code is gone | Updated tests | In This Change |
| Web: `components/workspace/skill-improvement/**`, `components/settings/SkillImprovementFeatureToggleCard.vue` (+ spec), `stores/skillImprovementStore.ts`, `stores/skillImprovementCapabilityStore.ts`, `graphql/queries/skillImprovementQueries.ts`, `graphql/mutations/skillImprovementMutations.ts`, `types/agent/SkillImprovementConfig.ts`, `localization/messages/__tests__/workspaceHistorySkillImprovementCleanup.spec.ts`; the CTA and improver checks in `AgentWorkspaceSurface.vue` / `TeamWorkspaceSurface.vue`; the card in `ServerSettingsBasicsPanel.vue`; the comment in `stores/serverSettings.ts`; the improver id in `utils/agents/builtInAgentDefinitionIds.ts` (+ its contract spec); i18n keys (en, zh-CN); regenerated `generated/graphql.ts`; spec and e2e-probe references | Feature removed | — | In This Change |
| Docs: `autobyteus-server-ts/docs/modules/skill_improvement.md` (removed); references in server `docs/modules/*.md`, `docs/README.md`, `PROJECT_OVERVIEW.md`, `ARCHITECTURE.md`, `features/memory_sync.md`; web `docs/skills.md`, `settings.md`, `agent_teams.md`, `agent_management.md`, `agent_execution_architecture.md`; the Work Journal doc's consumer line | Feature removed | — | In This Change |
| Released migrations naming the feature's paths (F-11) | Frozen history | — | Not touched |
| `configuredPlacement` for copies | Separate decision | — | Follow-up FU-001 |

## Return Or Event Spine(s) (If Applicable)

N/A.

## Bounded Local / Internal Spines (If Applicable)

Inside the migration: `collect ids -> rows -> runs -> sessions -> records -> built-in`, with the M5 ordering guard.

## Off-Spine Concerns Around The Spine

| Concern | Serves | Responsibility | Why |
| --- | --- | --- | --- |
| `retiredSettingNames` (existing) | AppConfig | Delete and refuse retired keys | Reuse of the established mechanism (A-05) |

## Ownership Boundaries

Current code keeps no knowledge of the feature. Historical names live only in the migration and the retired-settings list.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden |
| --- | --- | --- | --- |
| Migration | Feature data names | Runner | Current code importing them |

## Dependency Rules

The migration imports only the runner types and node `fs`/`path` (like A-06, A-07). No current-runtime service is used to transform data.

## Interface Boundary Mapping

| Interface | Change |
| --- | --- |
| GraphQL: skill-improvement queries and mutations | Removed (clean cut; DESIGN rule 9) |
| `GlobalAgentRunMessageRouter` constructor | Loses `grantRegistry` |
| `CreateAgentRunInput` / provisioning input | Loses `launchPurpose` |

## Interface Boundary Check

N/A: only removals.

## Main Domain Subject Naming Check

| Subject | Name | OK |
| --- | --- | --- |
| Migration | `remove-skill-improvement-data` / `20261020_remove_skill_improvement_data` | Yes (version-free current names; migration id dated) |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Remove settings from `.env` | `retiredSettingNames` | Reuse |
| Remove a built-in folder | A-06 pattern | Reuse (pattern) |
| Walk memory structurally | A-07 pattern | Reuse (pattern) |

## Subsystem / Capability-Area Allocation

Server: app-data-migrations (new), config (modify), agent-communication, agent-execution, run-history, services, built-in-agents, api/graphql (modify or remove). Web: components, stores, graphql, utils, localization, generated. Docs.

## Draft File Responsibility Mapping

See the final mapping below.

## Reusable Owned Structures Check

N/A: no new shared structure.

## Shared Structure / Data Model Tightness Check

| Structure | Action |
| --- | --- |
| `AgentRunMetadata` | `launchPurpose` removed |
| Router dependencies | `grantRegistry` removed |

## Final File Responsibility Mapping

| File | Change | Concern |
| --- | --- | --- |
| `src/app-data-migrations/migrations/remove-skill-improvement-data-migration.ts` | Add | DS-003 |
| `src/app-data-migrations/app-data-migration-registry.ts` | Modify | Register last |
| `src/config/app-config-setting-policy.ts` | Modify | `retiredSettingNames` += `ENABLE_SKILL_IMPROVEMENT`, `AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID`, `ENABLE_SELF_EVOLUTION` |
| Removal Plan rows | Remove or modify | As listed |
| `tests/unit/app-data-migrations/remove-skill-improvement-data-migration.test.ts`, a startup e2e next to `remove-work-trace-exports-startup.e2e.test.ts` | Add | Fixtures F-1..F-8b |

## Applied Patterns (If Any)

None new.

## Target Subsystem / Folder / File Mapping

As in Final File Responsibility Mapping; no new folders except the removal of `src/skill-improvement/`, `tests/skill-improvement/` and `components/workspace/skill-improvement/`.

## Folder Boundary Check

N/A.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided |
| --- | --- | --- |
| Router after removal | `deliver()` starts with the collaboration-root check | Keeping an always-empty grant registry "for later" |
| Settings | Add the keys to `retiredSettingNames` | Migration code editing `.env` |
| Helper runs | Delete folder **and** history row | Folder only (stale invisible rows) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Replacement |
| --- | --- | --- |
| Keep the GraphQL API returning "disabled" | Rejected | Clean removal (DESIGN rule 9) |
| Keep `launchPurpose` to hide old helper runs | Rejected | The migration deletes them |
| Keep the grant registry empty | Rejected | Removed (Principle 7) |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Server: remove the GraphQL types and schema registration, then `src/skill-improvement/`, then the built-in template and registry entry, the settings, the grants, the router branch and `launchPurpose`; update tests and the smoke script.
2. Add the retired setting names.
3. Add the migration and register it, with unit tests and a startup e2e.
4. Web: remove the components, stores, GraphQL documents and types; update surfaces, settings panel, built-in ids, i18n and specs; regenerate `generated/graphql.ts`; update e2e probes.
5. Docs.
6. Sweep: grep for `skill.?improv`, `retrospective`, `server_helper`, `launchPurpose`, `DirectAgentRunMessageGrant`, `ENABLE_SELF_EVOLUTION` in current code (migrations' frozen names and `tickets/` excepted); typecheck and lint.

## Key Tradeoffs

- Deleting helper runs from history is visible, but the user decided it (DEC-001 C).
- Retiring keys through config, not the migration: an existing owner, applied at every start, and it also refuses re-adding them.

## Risks

- **Removing the grant branch from the router:** the existing router tests must pass unchanged apart from the grant cases.
- **Generated GraphQL drift in the web:** regenerate it, and typecheck the web.

## Guidance For Implementation

- Never run the migration or the app on the user's data or a copy of it (TESTING.md). Fixtures are synthesized with the exact shapes in the inventory.
- Prove these facts:
  - a fresh data folder starts cleanly;
  - the old-data fixture starts cleanly, deletes exactly the feature data, and leaves unrelated runs, agents (`autobyteus-skill-evolver` included) and history rows byte-identical;
  - a second start changes nothing;
  - an injected failure on one item leaves startup working, and the next start finishes.
- Show that the router's other result codes are unchanged.
- The release notes are in this folder; delivery uses them in the next release.
