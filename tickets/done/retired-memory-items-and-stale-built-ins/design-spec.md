# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003` (design-only revision after ARCH-REV-001 AR-001; requirements unchanged at SR-002)
- Approved requirements baseline: `requirements-doc.md` at SR-002, approved by the user on 2026-11-18 (his answers on the three data questions), with the founder's words relayed by the PM ("let's remove the dead code, we should do that now") and the Task's part 2 ("that one should be removed")
- Behavior-defining supplements: none
- User approval of the design: `Not required` (the direction and the data decisions are his; the design realizes them). His delivery gates: approval and a backup before the first start on his node; release only on his word.
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/retired-memory-items-and-stale-built-ins/tickets/in-progress/retired-memory-items-and-stale-built-ins/investigation-notes.md`
- Authorities read (2026-11-18, in this conversation): `references/architecture-design.md`, `references/design-principles.md`, repository `DESIGN.md` (rules 5, 7, 8, 11; Data Migration Guideline), `GLOSSARY.md` § Memory
- Conflicts or discrepancies: none

## Current-State Read

- **Part 1.** `autobyteus-ts/src/memory` still carries the retired compactor's item model:
  - the item model: `models/episodic-item.ts`, `models/semantic-item.ts` (with `COMPACTED_MEMORY_CATEGORY_*`), `MemoryType.EPISODIC/SEMANTIC` (`models/memory-types.ts:1-5`);
  - reading: `retrieval/retriever.ts`, `retrieval/memory-bundle.ts`, the read branches `store/file-store.ts:74-84` and `store/run-memory-file-store.ts:91-101`, and the names `store/memory-file-names.ts:2-10`;
  - all of it exported from `memory/index.ts:33-56`.
- No writer and no production caller exist (INV-1…3). `MemoryStore.list` (`store/base-store.ts:10`, `file-store.ts:36-40`) is called only by `retriever.ts`, tests and the live-E2E harness. `MemoryManager.memoryTypes` (`memory-manager.ts:98`) is read nowhere.
- The server and the Memory page already ignore the old files (INV-4).
- Frozen copies and the released v5 migration use their own frozen names (INV-5).
- **Part 2.** Startup migrations remove retired installed agent folders: `RemoveBuiltInProjectTaskManagerMigration` (`app-data-migrations/migrations/remove-built-in-project-task-manager/…:55-80`, `STARTUP_ONLY`, one folder path from the registry, `app-data-migration-registry.ts:139-141`).
- Two retired built-ins remain installed and are listed to every agent: `agents/autobyteus-skill-evolver/` (with its own `skills/retrospective-skill-coach/`) and `agents/autobyteus-memory-compactor/` (INV-8…11, INV-16).
- Tests of the 20261020 migration assert that it keeps the Self-Evolver (INV-9).
- The bootstrapper test "leaves the old compactor source intact" covers the bootstrapper, which never touches unregistered folders (INV-10).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale:
  - deletions inside one library subsystem (`autobyteus-ts/src/memory`: 4 files removed, 6 edited);
  - one new startup migration, a copy of an existing pattern, plus its registry line;
  - test rewrites in autobyteus-ts, server, web E2E and test-support;
  - docs.
  - All of it stays within existing owners.
- Architectural risk: `High`
- Risk rationale:
  - a startup migration deletes data on every user's machine (persistence);
  - public exports of `autobyteus-ts` are removed (a shared foundation, TESTING.md rule 4).
- Escalation trigger: any live consumer of a removed export outside this repository's packages, or any need to touch a run folder, returns as a Design Impact.

## Architecture Investigation Evidence

| Source | Reference | Observation | Decision |
| --- | --- | --- | --- |
| grep (INV-1) | listed files | the complete set of references | removal and rewrite lists below |
| Code (INV-2) | `retriever.ts`, `file-store.ts:36-40`, `base-store.ts:10` | `list` has no production caller once `Retriever` goes | remove `list` with it |
| Code | `memory-manager.ts:98` | `memoryTypes = MemoryType` read nowhere | remove (dead in a touched module) |
| Code (INV-13) | 20261006 migration | one-folder removal pattern | generalize to a list of retired folders |
| Tests (INV-9) | 20261020 unit, startup E2E, fixtures, web E2E case | assert the Self-Evolver stays after startup | startup-level assertions change; the 20261020 unit test stays (its own behavior is unchanged) |

## Intended Change

Delete the retired item model from `autobyteus-ts` (clean cut). Add one startup migration that removes the two retired built-in agent folders. Rewrite the tests and docs that describe the old behavior.

## Change Scope (Mandatory)

- In scope: UC-001…UC-003.
  - `autobyteus-ts/src/memory/` (models, retrieval, stores, names, index, memory-manager line);
  - a new migration folder and its registry line;
  - tests: autobyteus-ts memory and runtime tests, `test-support/live-e2e/live-e2e-harness.ts`, the server startup E2E for 20261020, `autobyteus-web/tests/e2e/skill-improvement-removal-cases.mjs`, the web `MemoryInspector.spec.ts` assertion;
  - docs: `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-server-ts/docs/modules/agent_memory.md`, `docs/ARCHITECTURE.md:166`, `docs/design/codex_raw_event_mapping.md:433`, `agent_episodic_catalog.md:13`, and the migration list in `docs/design/data_migration_guideline.md` §10 if it lists migrations.
- Derived consumers: `memory/index.ts` re-exports. Every importer of a removed name is in the INV-1 list, and each one is removed or rewritten. No server source imports them.
- Deliberately left alone:
  - frozen migration code (`src/app-data-migrations/frozen/**`) and released migrations, including the v5 migration's own obsolete-file list;
  - the old files on disk (DEC-004) and the old compactor runs (DEC-006);
  - the bootstrapper and its test (it never touches unregistered folders; the migration does);
  - the 20261020 migration and its unit test.
- Follow-ups: none found.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing | Change | Path |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001, REQ-006; AC-001, AC-002 | build / import | INV-1…3 | removed | — (deletion) |
| BEH-002 | User | REQ-002; AC-002 | Memory page | INV-4 | unchanged | — |
| BEH-003 | System | REQ-003, REQ-006; AC-003, AC-004 | server start | INV-9, 11 | folder removed | DS-001 |
| BEH-004 | System | REQ-004; AC-003, AC-004 | server start | INV-10, 11, 16 | folder removed | DS-001 |
| BEH-005 | Data | REQ-005; AC-005 | — | INV-7, 12 | unchanged | — |

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup`
- Current design issue found: `Yes`: dead code (Principle 7) and legacy retention (Principle 8)
- Structural triggers:
  - **Legacy cleanup:** the old item model and its reading branches exist only for retired data. Response: remove them; no shim.
  - **Persisted-data transition:** the decision is below.
  - **Vocabulary drift:** "episodic" and "semantic" carried a second meaning. Response: the second meaning is removed from live code and docs.
  - Not firing: empty indirection; backward dependency; hidden dependency (the migration gets its folder paths from the registry, as 20261006 does).
- Deliberate deviations: none.
- Root cause classification: `Legacy Or Compatibility Pressure`
- Refactor needed now: `Yes` (the removals)
- Evidence: INV-1…3, INV-8…11.
- Design response: the removal plan and the migration below.

## Terminology

- **Retired memory items:** the compactor's former `EpisodicItem`/`SemanticItem` rows (`episodic.jsonl`, `semantic.jsonl`). Unrelated to the **episodic catalog** and the **semantic memory** folder (GLOSSARY.md), which are unchanged.
- **Retired built-in agents:** `autobyteus-skill-evolver`, `autobyteus-memory-compactor`.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths: as the removal plan lists.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- **Old item files** (`episodic.jsonl`/`semantic.jsonl` in run folders):
  - `Not Affected`: no current code reads or writes them; they stay as data (DEC-004).
  - Current readers already ignore them; the Memory page shows nothing from them.
- **Retired built-in agent folders** (`<agentsDir>/autobyteus-skill-evolver`, `<agentsDir>/autobyteus-memory-compactor`):
  - Decision: `Migration Required` (a removal), as the 20261006 precedent does.
  - Why: they are platform-owned definitions of retired features. The agent catalog lists them to every agent and they can be delegated to, so they keep the retired behavior reachable.
  - Why not direct use: the data cannot be used as it is without keeping that behavior reachable.
  - Why not rebuild: there is nothing to rebuild.
  - The user decided the removal (Task part 2; DEC-005).

### Migration Plan

- Trigger: `Startup`, `requiredOnStartup: true`, `executionPolicy: "STARTUP_ONLY"`. The agent catalog is built once at startup, so the removal takes effect through that start, as in 20261006.
- Owner and location: `autobyteus-server-ts/src/app-data-migrations/migrations/remove-retired-built-in-agents/remove-retired-built-in-agents-migration.ts`, class `RemoveRetiredBuiltInAgentsMigration`, id `20261118_remove_retired_built_in_agents`.
- Input: the registry passes the two absolute folder paths: `path.join(config.getAgentsDir(), "autobyteus-skill-evolver")` and `path.join(config.getAgentsDir(), "autobyteus-memory-compactor")`. The migration resolves no other path and reads no file.
- Per folder, one item detail (item ids `skillSelfEvolverDir`, `memoryCompactorDir`):
  - absent → `SKIPPED` "Not present.";
  - present → `fs.rm(recursive, force)` (removes a symbolic link itself, never its target) → `MIGRATED` "Removed.";
  - error → `FAILED` with the message.
- Overall result: `FAILED` when any item failed, so the framework retries at the next start; otherwise `SUCCEEDED`.
- Description text: "Permanently deletes the retired built-in agents Skill Self-Evolver (`agents/autobyteus-skill-evolver`) and Memory Compactor (`agents/autobyteus-memory-compactor`) from app data. Their runs stay. No backup is made."
- Registry position: the end of the list. It depends on nothing, and no later migration reads agent folders.
- Normal runtime stays current-only: there is no code path that knows these ids except the migration and its tests.
- Completion marker: the framework's ledger, as for every migration. Idempotent: a second start finds nothing and skips.
- Backup: none by the migration (precedent). On the founder's node, his approval and a backup before the first start (delivery gate, REQ-007).
- Retention: the migration stays registered, like the other released migrations.

| Step | Source | Target | Owner | Validation | Failure |
| --- | --- | --- | --- | --- | --- |
| Remove Self-Evolver folder | installed folder | absent | migration | `lstat` before; absent after | `FAILED`, retried next start |
| Remove Memory Compactor folder | installed folder | absent | migration | same | same |

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-003, BEH-004 | server start (app-data migrations step) | the two folders absent; the agent catalog built without them | `RemoveRetiredBuiltInAgentsMigration` within the migration framework | The removal on every machine |

## Primary Execution Spine(s)

`Server start -> AppDataMigrationRegistry (startup migrations) -> RemoveRetiredBuiltInAgentsMigration.execute -> fs.rm per folder -> ledger -> agent definition catalog loads without them`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | Before the agent catalog is built, the startup migrations run. This one deletes each retired folder that is present and reports each one. The catalog then never sees them. | migration |

## Spine Actors / Main-Line Nodes

Migration registry, `RemoveRetiredBuiltInAgentsMigration`.

## Ownership Map

- The migration owns the deletion and its per-item report.
- The registry owns the folder paths and the position.
- The framework owns ordering, the ledger and retries.

## Thin Entry Facades / Public Wrappers (If Applicable)

None.

## Removal / Decommission Plan (Mandatory)

| Item | Why unnecessary | Replaced by | Notes |
| --- | --- | --- | --- |
| `autobyteus-ts/src/memory/models/episodic-item.ts`, `models/semantic-item.ts` | Dead: no writer, no production reader (INV-2, 3) | nothing | includes `COMPACTED_MEMORY_CATEGORY_*`, `isCompactedMemoryCategory`, `CompactedMemoryCategory` |
| `autobyteus-ts/src/memory/retrieval/retriever.ts`, `retrieval/memory-bundle.ts` (and the folder when empty) | Dead: exported only | nothing | — |
| `autobyteus-ts/src/memory/models/memory-types.ts` (`MemoryType`, `MemoryItem`) and `RawTraceItem`'s `implements MemoryItem` and `memoryType` getter (`raw-trace-item.ts:3, 34, 82-83`) | SR-003 (AR-001): with the retired items gone, `MemoryType` has one value and `MemoryItem` one implementation; the type dispatch they serve routes nothing (Principle 7, single-value option). `toDict` writes no memory-type field, so no stored data changes. `index.ts:33` re-exports `MemoryType`; no server, web or application source imports it (grep, INV-1) | `RawTraceItem` directly | file deleted |
| `FileMemoryStore.list` and `deserialize`, `MemoryStore.list` (abstract) | Dead once `Retriever` goes: no production caller; tests read raw traces through it (DESIGN.md rule 11: production keeps nothing only tests read) | the stores' existing raw-trace reads: `listTurnRawTracesOrdered`, `listRawTraceDicts` | each test that called `list(MemoryType.RAW_TRACE)` reads through one of these, chosen so it asserts what it asserted before (system-instruction records are in `listRawTraceDicts`, not in `listTurnRawTracesOrdered`) |
| `MemoryStore.add(items: Iterable<MemoryItem>)`, `FileMemoryStore.add`, `RunMemoryFileStore.add` (`run-memory-file-store.ts:124-127`) | Typed on the removed interface; routes by `item.memoryType` | `add(items: Iterable<RawTraceItem>)`: each item is appended to the active raw-trace file (`getRawTracesPath()`). `appendRawTrace(item)` (`:130`, used by the server's `ExternalRuntimeMemoryWriter`) stays and calls `add([item])` as today | the memory manager's five `store.add` calls (`memory-manager.ts:207, 281, 369, 419, 443`) are unchanged |
| `RunMemoryFileStore.getFilePath(memoryType)` and `readMemoryDicts(memoryType, limit)` | A selector with one value (AR-001) | `getRawTracesPath()` returns `path.join(runDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME)` directly; a private `readRawTraceRecords()` (repairs a damaged end, as `readMemoryDicts` does) serves `listTurnRawTracesOrdered` and `listRawTraceDicts` | `readMemoryDicts` had no caller outside the store but `file-store.ts:37` (removed) and a test |
| `EPISODIC_MEMORY_FILE_NAME`, `SEMANTIC_MEMORY_FILE_NAME`, their `MEMORY_FILE_NAMES` keys | Dead names | nothing | frozen copies untouched |
| `memory/index.ts` exports of all of the above | Dead exports | nothing | — |
| `MemoryManager.memoryTypes` | Dead: read nowhere | nothing | — |
| `autobyteus-ts/tests/unit/memory/retriever.test.ts` and the `EpisodicItem`/`SemanticItem` cases of `file-store.test.ts` | Tests of removed code | nothing | — |
| Assertions `store.list(MemoryType.EPISODIC/SEMANTIC)` in `agent-runtime-compaction.test.ts:133-134`, `llm-phase-memory-compaction-configuration.test.ts:149-150`, `live-e2e-harness.ts:1004-1005` | Test removed behavior | removed, or replaced by "no `episodic.jsonl`/`semantic.jsonl` file is written" where the test proves compaction writes only the summary | — |
| `run-memory-file-store-damaged-end.test.ts:11, 33-34, 130-136`, `working-context-snapshot-bootstrapper.test.ts:9, 43` | Use the removed types as a fixture | rewritten with raw-trace items, `getRawTracesPath()` and `listRawTraceDicts()` | — |
| `MemoryType` imports and `store.list(MemoryType.RAW_TRACE)` calls in tests: `file-store.test.ts:9`, `memory-manager.test.ts:8, 62, 179, 261, 290`, `output-limit-recovery-note.test.ts:6, 30`, `llm-phase-memory-compaction-configuration.test.ts:24`, `output-limit-recovery-flow.test.ts:32, 140`, `agent-runtime-compaction.test.ts:24`, `memory-llm-flow.test.ts:9, 53`, `provider-native-tool-continuation-flow.test.ts:30, 443`, `openai-read-file-strict-live.test.ts:34, 140-148`, `agent-loop-event-sequence.test.ts:33, 171`, `memory-tool-call-flow.test.ts:12, 115` (all under `autobyteus-ts/tests/`) | Read through removed API | the store's raw-trace reads, as above | — |

Kept on purpose: `agent-runtime.test.ts:814-815`, `pending-compaction-executor.test.ts:22`, and server `agent-memory-service.test.ts:30-46`. They name the old file names only to prove such files are not written, or that old files on disk are ignored (REQ-001).

## Return Or Event Spine(s) (If Applicable)

N/A.

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

None beyond the framework's existing ledger and logging.

## Ownership Boundaries

The migration touches only the two paths it is given. The bootstrapper keeps owning registered built-ins and is not changed.

## Boundary Encapsulation Map

| Boundary | Internal | Callers | Forbidden | Fix |
| --- | --- | --- | --- | --- |
| Migration registry | migration classes | app start | a migration computing other agent paths | pass paths from the registry |

## Dependency Rules

- The migration imports nothing from current application code beyond the framework's domain types, as 20261006 does.
- No current code may name the retired agent ids. Exceptions (tests, scripts and fixtures that use the ids as data; AC-001's expected grep output, ARCH-REV-001 N-2):
  - the new migration and its tests;
  - the 20261020 migration's tests and fixtures;
  - `tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts`, `tests/unit/built-in-agents/built-in-agent-templates.test.ts:7-8`, `scripts/smoke-built-in-agents-bootstrap.mjs:36, 60`;
  - `tests/unit/application-platform/application-platform-runtime-isolation.test.ts:74`;
  - `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` (fixture ids).
- No process-wide lookup is added.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `new RemoveRetiredBuiltInAgentsMigration(folders: readonly { itemId: string; dirPath: string }[])` | retired built-in folders | delete each and report | absolute paths | the registry passes the two entries |

## Interface Boundary Check

| Interface | Singular? | Explicit identity? | Risk | Action |
| --- | --- | --- | --- | --- |
| `RemoveRetiredBuiltInAgentsMigration` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Same meaning everywhere? | Drift | Action |
| --- | --- | --- | --- | --- | --- |
| migration | `RemoveRetiredBuiltInAgentsMigration` / `20261118_remove_retired_built_in_agents` | Yes | Yes | — | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Remove installed agent folders at startup | 20261006 migration pattern | Reuse the pattern (new migration; the released one is not edited) | released migrations are frozen in behavior |

## Subsystem / Capability-Area Allocation

| Area | Concern | Decision |
| --- | --- | --- |
| `autobyteus-ts/src/memory` | deletions | Modify |
| `autobyteus-server-ts/src/app-data-migrations` | new migration and registry line | Extend |

## Draft File Responsibility Mapping

See Final.

## Reusable Owned Structures Check

None. Copying 20261006's small helpers into the new migration is the repository's rule: migrations do not share code with each other or with the application.

## Shared Structure / Data Model Tightness Check

`MemoryType` and `MemoryItem` are removed (SR-003); the stores are typed on `RawTraceItem`, the one memory item.

## Final File Responsibility Mapping

| File | Concern |
| --- | --- |
| `autobyteus-ts/src/memory/models/memory-types.ts` | deleted (SR-003) |
| `autobyteus-ts/src/memory/models/raw-trace-item.ts` | no `MemoryItem`, no `memoryType` getter |
| `autobyteus-ts/src/memory/store/base-store.ts`, `file-store.ts`, `run-memory-file-store.ts`, `memory-file-names.ts`, `memory-manager.ts`, `index.ts` | removals per the plan |
| `autobyteus-server-ts/src/app-data-migrations/migrations/remove-retired-built-in-agents/remove-retired-built-in-agents-migration.ts` | new migration |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | one entry at the end |
| `autobyteus-server-ts/tests/app-data-migrations/remove-retired-built-in-agents/…test.ts` | unit: both present / one present / none / a failure / a symbolic link, plus "other agent folders and run folders byte-identical" |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/remove-retired-built-in-agents-startup.e2e.test.ts` | startup E2E: the folders go, the agents list no longer has them, other agents and all runs (including old compactor runs and old item files) byte-identical, a second start skips |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/remove-skill-improvement-data-startup.e2e.test.ts:169-180` | the full startup now also removes the Self-Evolver: assert the improver and the Self-Evolver are gone, and the user agents and the Daily Assistant stay |
| `autobyteus-web/tests/e2e/skill-improvement-removal-cases.mjs:19-26, 241-298` | the same update for the Agents page case |
| `autobyteus-web/components/memory/__tests__/MemoryInspector.spec.ts:21-28` | keep the two-tab assertion; drop the `episodic\|semantic` word match (those words now name current features) |
| `test-support/live-e2e/live-e2e-harness.ts:12, 1004-1005` | drop the removed checks and import |
| docs listed in Change Scope | describe the old files as retired, unread and kept; remove descriptions of the removed classes |

## Applied Patterns (If Any)

The app-data migration pattern.

## Target Subsystem / Folder / File Mapping

As above. Remove `autobyteus-ts/src/memory/retrieval/` when it is empty.

## Folder Boundary Check

| Folder | Depth | Clear? | Risk |
| --- | --- | --- | --- |
| `migrations/remove-retired-built-in-agents/` | migration | Yes | Low |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided |
| --- | --- | --- |
| Removal | delete the classes and their exports | keep `EpisodicItem` "for old runs" or a deprecated re-export |
| Migration | one new migration that deletes both folders | editing the released 20261020 migration to add the evolver |
| Old files | leave them on disk; docs say "retired, unread, kept" | deleting them (DEC-004) |

## Backward-Compatibility Rejection Log (Mandatory)

| Mechanism | Why considered | Decision | Plan |
| --- | --- | --- | --- |
| Keep reading old item files for old runs | the 2026-10-01 simplification kept historical reads | Rejected: nothing live shows them (INV-4); the user said remove | delete |
| Keep `MemoryType.EPISODIC/SEMANTIC` as deprecated | external importers of `autobyteus-ts` | Rejected: the package is internal to this workspace; every importer is in INV-1 | delete |
| Keep `MemoryType` with `RAW_TRACE` and the `getFilePath(memoryType)` selector | smaller diff | Rejected (AR-001): a one-value selector is dead structure in touched files | raw-trace forms |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. autobyteus-ts removals and test rewrites; typecheck and tests of `autobyteus-ts`.
2. test-support harness edit.
3. The server migration, its registry line, unit and startup E2E tests; the 20261020 startup E2E update.
4. The web E2E case and `MemoryInspector.spec.ts`.
5. Docs.
6. AC-001's grep, recorded as evidence.

## Key Tradeoffs

- SR-003: `MemoryType` and `MemoryItem` are removed rather than kept with one value. The files are already in scope, the dispatch they serve routes nothing, and `toDict` writes no memory-type field, so no data changes (ARCH-REV-001 AR-001). The cost is the test reads listed in the removal plan.

## Risks

- R-1 (ARCH-REV-001): a user-made team or org definition that lists a retired agent stops admitting after the migration (its member definition is gone). This follows from the removal decision. On the founder's node no team, org or package names either id (read-only grep of `agent-teams/`, `agent-orgs/`, `agent-packages/`, 2026-11-18); the user is told.

- A user who customized the retired agents loses those folders. They are platform-owned built-ins; this follows the 20261006/20261020 precedent and the user's decision.

## Guidance For Implementation

- Reproduction to start from: `None`.
- Never touch frozen migration code, the v5 migration, a run folder, or `memory/imports/`.
- TESTING.md: tests use test-owned data dirs only; never the founder's data or a copy of it for a startup.
