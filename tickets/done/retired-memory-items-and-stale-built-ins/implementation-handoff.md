# Implementation Handoff

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/retired-memory-items-and-stale-built-ins/tickets/in-progress/retired-memory-items-and-stale-built-ins`
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/retired-memory-items-and-stale-built-ins`, branch `codex/retired-memory-items-and-stale-built-ins` (base `origin/personal` at `2e9ac1e65b`).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Medium / High → independent architecture review selected and passed (ARCH-REV-002); source review next, by `get_handoff_rules`
- Requirements doc: `requirements-doc.md` (SR-002, Approved by the user)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec (required on every route): `design-spec.md` (SR-003, Ready)
- Supplemental task artifacts: none
- Design review report: `design-review-report.md` (ARCH-REV-002, `Pass`)
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: N/A (initial implementation)
- Code review: CRR-001 `Pass` (`code-review-report.md`; no findings; both recorded deviations hold)

## Current Implementation Summary

- **Library (`autobyteus-ts`):** the retired compactor's item model is gone as a clean cut:
  - `EpisodicItem` and `SemanticItem` (with `COMPACTED_MEMORY_CATEGORY_*`), `Retriever`, `MemoryBundle`;
  - `MemoryType` and `MemoryItem` (`memory-types.ts` deleted) and `RawTraceItem.memoryType`;
  - the episodic/semantic file names and their `MEMORY_FILE_NAMES` keys, and every export of these;
  - `MemoryStore.list`, `FileMemoryStore.list` / `deserialize`, `MemoryManager.memoryTypes`.
- **Store reads and writes:** the stores' `add` takes `RawTraceItem` and appends to the active raw-trace file. `getFilePath(memoryType)` and `readMemoryDicts` become `getRawTracesPath()` and a private `readRawTraceRecords()`, which keeps the damaged-end repair and the `verifiedEndPaths` marking (review note). `appendRawTrace` stays.
- **Server:** a new `STARTUP_ONLY` migration, `20261118_remove_retired_built_in_agents`, is registered last. It deletes `agents/autobyteus-skill-evolver` (with its own skill) and `agents/autobyteus-memory-compactor`. Their runs and every other file stay.
- **Tests and docs:** rewritten to the new behavior.

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: deletions inside one library subsystem, one new migration copied from the 20261006 pattern, test and doc rewrites; a startup migration deletes data on every machine, and public `autobyteus-ts` exports are removed.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. No live consumer of a removed export exists outside the repository's packages (`autobyteus-ts` is workspace-internal; every importer was in the INV-1 list). Nothing touches a run folder.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Retired item model removed (REQ-001, REQ-006) | `autobyteus-ts/src/memory/`: `models/{episodic-item,semantic-item,memory-types}.ts` and `retrieval/` deleted; `raw-trace-item.ts`, `store/{base-store,file-store,run-memory-file-store,memory-file-names}.ts`, `memory-manager.ts`, `index.ts` edited | Implemented; AC-001 grep shows only the expected exceptions (IMP-01) |
| BEH-002 | Nothing visible changes (REQ-002) | No server or web source read the removed code; the Memory page is unchanged | `MemoryInspector.spec.ts` keeps its two-tab assertion (IMP-05) |
| BEH-003 | Self-Evolver removed at startup (REQ-003) | registry → `RemoveRetiredBuiltInAgentsMigration.execute` → `lstat` → `fs.rm(recursive, force)` per folder → per-item report → ledger; FAILED retries at the next start | Unit (IMP-08), built-Studio startup E2E RRB-1/RRB-2 (IMP-07); the 20261020 startup E2E and the web case now expect it gone |
| BEH-004 | Memory Compactor removed in the same step (REQ-004) | same migration, item `memoryCompactorDir` | same checks |
| BEH-005 | Old item files and old compactor runs untouched (REQ-005) | the migration resolves no other path | unit and RRB-1: run folders with `episodic.jsonl`/`semantic.jsonl` and the compactor's runs byte-identical; the runs stay listed |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-ts/src/memory/**` (see BEH-001)
- `autobyteus-server-ts/src/app-data-migrations/migrations/remove-retired-built-in-agents/remove-retired-built-in-agents-migration.ts` (new) and its entry at the end of `app-data-migration-registry.ts` (the two folder paths from `config.getAgentsDir()`)
- Tests:
  - autobyteus-ts: `retriever.test.ts` deleted; the retired cases of `file-store.test.ts` removed;
  - `run-memory-file-store-damaged-end.test.ts`: the retired-item case is rewritten with raw traces (a batch through `add` checks a damaged end too);
  - the retired fixture line is removed from `working-context-snapshot-bootstrapper.test.ts`;
  - `list(MemoryType.RAW_TRACE)` became `listTurnRawTracesOrdered()`, except `agent-loop-event-sequence.test.ts`, whose golden snapshot includes system-instruction records (`listRawTraceDicts()` mapped through `RawTraceItem.fromDict`, exactly as `list` did);
  - the episodic/semantic `list` assertions are removed from `llm-phase-…` (compaction off) and replaced by a "no such file written" check in `agent-runtime-compaction.test.ts`.
- `test-support/live-e2e/live-e2e-harness.ts`: removed checks and import (the file-name check beside them already proves nothing is written)
- Server tests:
  - new: `tests/app-data-migrations/remove-retired-built-in-agents/…migration.test.ts`, `tests/e2e/app-data-migrations/remove-retired-built-in-agents-startup.e2e.test.ts`;
  - updated: the 20261020 startup E2E (SID-2 expects the Self-Evolver gone).
  - Registry-tail pins: the 20261020 unit test now pins only the released migrations after it (its comment defers later ones to the order test). The `collaborators-to-delegated-runs-v1` and `delegated-copy-own-file-complete-v1` tests list every later migration on purpose, so they now include the new id, and so does the `LATER` list of `task-agent-own-run-startup.e2e.test.ts`.
- Web: `tests/e2e/skill-improvement-removal-cases.mjs` (removes both ledger rows; expects the Self-Evolver gone), `components/memory/__tests__/MemoryInspector.spec.ts`
- Docs:
  - `autobyteus-ts/docs/agent_memory_design.md`;
  - server `docs/ARCHITECTURE.md`, `docs/design/codex_raw_event_mapping.md`, `docs/modules/agent_memory.md`, `docs/modules/agent_definition.md`, `docker/README.md` (the removed compactor-agent setting and its sync note);
  - `autobyteus-web/docs/settings.md`, `GLOSSARY.md`.
- `autobyteus-server-ts/typecheck-baseline.json`: one test-file error fewer (`tests/fixtures/accepted-attachment-message.ts`). The typed `add` no longer clashes there; shrunk as TESTING.md requires.

## Important Assumptions

- `agent_episodic_catalog.md:13` already calls the old rows retired; it is left as is.
- The data-migration guideline's §10 is a lessons table, not a list of every migration, so it gets no entry.

## Known Risks

- R-1 (design): a user-made team or org definition that lists a retired agent stops admitting after the migration. Not the case on the founder's node.
- A user who customized a retired built-in loses that folder (design Risks; 20261006/20261020 precedent).
- Changing `typecheck-baseline.json` is a build input under TESTING.md § Fresh-start build. The baseline only shrinks, but a fresh-clone build check belongs to validation or delivery.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Cleanup
- Reviewed root-cause classification: Legacy Or Compatibility Pressure
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: removal plan followed item by item; no shim, no deprecated re-export.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (the empty `retrieval/` folder is gone)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Deviations from a design principle decided during implementation, each with the principle and why the reason holds for this case:
  - **The new migration exports no id constant** (the 20261006 precedent exports one that only its tests read). Reason: DESIGN.md rule 11, production keeps nothing only tests read; the tests use the literal id.
  - **The Docker README's removed compactor-agent setting** (`AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`, which an earlier ticket removed from the code) is deleted together with its "synced on startup" note. Reason: the note describes the agent this ticket removes. It is not in the design's doc list.
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (all edits shrink files; the new migration is 76 lines)
- Notes: frozen migration code, the v5 migration, the 20261020 migration and its unit test's behavior checks are untouched (only its registry-tail assertion changed).

## Persisted Data Transition Check (When Applicable)

- Approved decision: old item files `Not Affected`; retired built-in folders `Migration Required` (a removal)
- Design-spec decision reference: `design-spec.md` § Persisted Data / State Transition Decision, § Migration Plan
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: N/A
- Migration implementation and focused checks, only when `Migration Required`:
  - id `20261118_remove_retired_built_in_agents`, `requiredOnStartup`, `STARTUP_ONLY`, last in the registry;
  - per folder: `SKIPPED` "Not present." / `MIGRATED` "Removed." / `FAILED` "Could not inspect|remove: …"; overall `FAILED` retries at the next start; the description is as designed;
  - unit tests: both present, one present, none, idempotent second run, failure and retry, inspection failure, symlink, every other folder byte-identical;
  - startup E2E RRB-1/RRB-2: removal through the real start, the agents gone from GraphQL, runs and old item files byte-identical, a second start does nothing.
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- New worktree: `pnpm install --frozen-lockfile`, server `prebuild`, `nuxt prepare` (TESTING.md install order). macOS, Node 22.23.1. The host was heavily loaded (load average 43–125) during the runs.

## Checks Run

Code commits: `9f9ad727b5`, `25a7ad3940`, `ef0e56caf3`, `ae5f267d2e`, and `91ee1603a5` (the startup E2E summary fix); HEAD below means `91ee1603a5`. Evidence is in `evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | AC-001 `git grep` of the retired item names over tracked files outside `tickets/` and `dist/` | HEAD | — | all packages, docs | REQ-001, AC-001 | Pass | `IMP-01-ac001-retired-item-names.log` | the classification block: every hit is frozen/migration code, a test using old file names as kept/ignored data, or a "retired" doc note |
| IMP-02 | `git grep` of the retired agent ids | HEAD | — | all packages | Dependency Rules (N-2) | Pass | `IMP-02-retired-agent-ids.log` | every hit is in the design's exception list |
| IMP-03 | `pnpm -C autobyteus-ts test` (full) | `9f9ad727b5` (autobyteus-ts as committed) | Node 22.23.1, load ~70 | autobyteus-ts | AC-002 | Pass, one failure explained | `IMP-03-autobyteus-ts-suite.log` | `Tests  1 failed \| 2492 passed \| 108 skipped (2601)`; the failure: `run-bash-wrapper.test.ts` case 8 passes alone (`Tests  26 passed (26)`). The kill's result lists a background task's end only if the process manager sees the exit before the foreground `kill` returns; at load ~70 it came later. It reaches no memory code. |
| IMP-04 | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck` | HEAD | same | server src + tests (builds autobyteus-ts), web incl. cross-package tests | AC-002 | Pass | `IMP-04-typechecks.log` | `test-file errors: 1011 in 316 files (baseline 1011 in 316 files)`; `87 in 37 files (baseline 87 in 37 files)` |
| IMP-05 | `pnpm -C autobyteus-web test:nuxt run components/memory/__tests__/MemoryInspector.spec.ts` | HEAD | same | Memory page inspector | REQ-002, AC-002 | Pass | `IMP-05-memory-inspector-spec.log` | `Tests  7 passed (7)` |
| IMP-06 | `pnpm -C autobyteus-server-ts test:unit` (full) | `ef0e56caf3` | same | everything | AC-002, AC-011-like preserved suites | 5 failures; 2 caused by this change and fixed in `ae5f267d2e` (IMP-08), 3 not caused | `IMP-06-server-unit-suite.log` | `Tests  5 failed \| 8342 passed \| 9 skipped (8356)`; `collaborators-to-delegated-runs-v1` and `delegated-copy-own-file-complete-v1` registry-tail pins (fixed); `agent-package-folder-watcher.test.ts` ×3: fixed 5 s fs-event waits, import closure has no changed file (the same cause recorded on autobyteus-493) |
| IMP-07 | `pnpm -C autobyteus-server-ts build`, then `env -i … vitest run` the three startup E2E files | `ae5f267d2e`; HEAD for the new file | same | built Studio start, migration runner, agent catalog, GraphQL | REQ-003…005, AC-003, AC-004 (GraphQL), AC-005 | Pass | `IMP-07-startup-e2e.log` | `RRB-1`, `RRB-2`, `SID-1…3`, `TAU-1…3` all `✓` |
| IMP-08 | targeted server rerun: the new migration, 20261020, collaborators and own-file migration tests, `tests/unit/app-data-migrations`, the migration-boundaries and tracked-imports architecture tests, `tests/unit/agent-memory`, `tests/unit/built-in-agents` | HEAD | load 43–53 | migrations, registry, memory, built-ins | REQ-003…006 | Pass (one timeout explained) | `IMP-08-targeted-server-rerun.log` | `Tests  1 failed \| 255 passed (256)`: `agent-memory-explorer-service` hit the 5 s timeout (5,006 ms); passed in IMP-06 and alone (`Tests  4 passed (4)`) |

- Not run, and why:
  - The web E2E case `skill-improvement-removal-cases.mjs` (its own probe stack with real Chrome and the scripted AGY CLI): API/E2E. The edit is limited to its fixture step and assertions.
  - `list_available_agents` (AC-004's tool surface) and the Agents page in a browser: API/E2E. IMP-07 shows the agent catalog through GraphQL.
  - The whole server E2E and `test:integration` suites; the fresh-start build (the baseline file is a build input): API/E2E or delivery.
  - Nothing ran on the founder's data or a copy of it.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: no product UI changes. The two web test files change only assertions about removed things.

## Downstream Coverage Hints / Suggested Scenarios

- An upgrade with both retired folders installed (the evolver with its `skills/retrospective-skill-coach/`): `list_available_agents` and the Agents page no longer show Skill Self-Evolver or Memory Compactor. Every other agent and run is byte-identical, including old compactor runs and run folders with `episodic.jsonl`/`semantic.jsonl`. They stay listed, and a second start does nothing.
- A removal that fails (a mode-bit block, as SID-3 does): startup continues, the migration is `FAILED` and succeeds on the next start.
- Native runs: compaction and restore still work, and the Memory page still shows its two tabs for old and new runs.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- The web removal case (SIR-002) on its probe stack.
- AC-004 through `list_available_agents` and the Agents page.
- The whole server E2E and integration suites (autobyteus-ts is a shared foundation, TESTING.md rerun rule 4), and the folder-watcher files on a quiet host.
- The fresh-start build for the changed `typecheck-baseline.json`.
