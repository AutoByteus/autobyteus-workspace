# Docs Sync Report: autobyteus-491 (retired memory items and stale built-in agents)

## Scope

- Ticket: `retired-memory-items-and-stale-built-ins` (Project Task `autobyteus-491`)
- Trigger: code review CRR-002 `Pass` (test-code review of the API/E2E round-1 tests) after API/E2E `API-REV-001` `Pass` (final confidence 95%). `task_size` Medium, `architectural_risk` High; route Reviewed (architecture review `Pass`, source review CRR-001 `Pass`, test-code review CRR-002 `Pass`).
- Bootstrap base reference: `origin/personal` @ `2e9ac1e65b`
- Integrated base reference used for docs sync: `origin/personal` @ `75048cbaf4` (67 commits: restored-run turn IDs, phone text size, the Antigravity background-task view, native follow-ups, the v1.5.13 release record), merged as `45b410675c` with no conflict, before any delivery edit. Four files had changed on both sides (`autobyteus-ts/src/memory/memory-manager.ts`, `autobyteus-ts/src/memory/models/raw-trace-item.ts`, `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-web/docs/settings.md`); git merged them cleanly and each keeps both sides' edits (checked: the merged `settings.md` carries this ticket's Memory Compactor sentence; `memory-manager.ts` has no `memoryTypes`).
- Post-integration verification reference: both typechecks, the server build, the full `autobyteus-ts` suite, the migration, memory and architecture unit files, the Memory page specs, the startup E2E files, the live memory flows and the AC-001 grep on `45b410675c` (`evidence/DEL-01…DEL-10`, listed in `release-deployment-report.md`).

## Why Docs Were Updated

- Summary: the ticket removed the retired compactor's item model from `autobyteus-ts` (`EpisodicItem`, `SemanticItem`, `MemoryType`, `Retriever`, `MemoryBundle`, the file-name constants, `MemoryStore.list`, `MemoryManager.memoryTypes`) and added the startup migration `20261118_remove_retired_built_in_agents`, which deletes the installed Skill Self-Evolver and Memory Compactor folders. The implementation already rewrote the docs that described the old items and agents. Delivery checked each of them, and the rest of the tree, against the final integrated state and found them accurate. It needed no docs edit of its own.
- Why this should live in long-lived project docs: "episodic" and "semantic" now name the founder's memories (the work journal's catalog and the agents' semantic folders). A reader of the library docs or the glossary must not meet the retired item model as if it were current, and a reader of the agent-definition and settings docs must know the two agents are gone and why.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules | No change | The change follows rules 5 (remove unnecessary work), 7 (a failed removal is reported and retried, never fails startup), 8 and 11 (tests follow the code). No rule was added or changed. The design's one lesson, "remove a retired feature's installed definition by a registered startup migration", is the existing Data Migration Guideline pattern |
| `TESTING.md` | Project testing guideline | No change; Needs follow-up | The ticket's reports record no command that stopped working. Delivery's merged-state run found that the documented `pnpm -C autobyteus-ts test` runs the LM Studio live tests when `LMSTUDIO_HOSTS` is exported, which the Core library row does not say. The fix is the API/E2E engineer's document: `follow-ups.md` FU-005 |
| `RELEASE.md` | Project release guide | No change | No release step, check or workflow changed. The guide's rule that a release carrying an app-data migration says whether it can be rolled back is applied in `release-notes.md` |
| `autobyteus-ts/docs/agent_memory_design.md` | The library's memory design | Already updated by the ticket; checked | Says the retired `episodic.jsonl`/`semantic.jsonl` and `compaction_lineage.jsonl` are historical data, unread and kept, that the library has no code for the retired items, and that the startup migration deletes the Memory Compactor's installed definition. The base's turn-ID paragraph (autobyteus-526) merged in beside it |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | The server memory module doc | Already updated; checked | Describes the two files as retired: nothing writes or reads them |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | Agent definitions and the compactor setting | Already updated; checked | The sentence that old compactor-agent files are "neither imported nor deleted" is replaced: it now names the startup migration that deletes the installed folders of the retired built-in Memory Compactor and Skill Self-Evolver (their runs stay) |
| `autobyteus-web/docs/settings.md` | Settings (the base rewrote this file to describe Settings only) | Already updated; checked | Line 141 keeps this ticket's sentence about the Memory Compactor's installed folder and the migration |
| `GLOSSARY.md` | Domain words | Already updated; checked | The "Semantic memory" entry says the retired `semantic.jsonl` rows are unread and kept on disk; the library's "early `SemanticItem` code" remark is gone. The "Episodic catalog" entry (autobyteus-493) already said the retired `episodic.jsonl` rows are a different thing. The glossary changed on both sides of the merge and every entry is present |
| `autobyteus-server-ts/docs/ARCHITECTURE.md`, `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`, `autobyteus-server-ts/docker/README.md` | Named in the design's change scope (they described compaction output or the compactor agent) | Already updated; checked | `ARCHITECTURE.md` and `codex_raw_event_mapping.md` no longer name episodic/semantic output; `docker/README.md` drops the `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` setting, the compactor-agent synchronization and the visible compactor-agent runs |
| `autobyteus-server-ts/docs/modules/agent_episodic_catalog.md` | Names the retired `episodic.jsonl` rows | No change | Says the catalog is unrelated to them; accurate |
| `autobyteus-server-ts/docs/design/data_migration_guideline.md` | The design said to update its migration list "if it lists migrations" | No change | It keeps no list of migrations (its only mention of one is a lesson row about registry order) |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Mentions "the former exact-ID Memory Compactor" | No change | Past-tense history of a removed rule, accurate |
| `autobyteus-server-ts/tests/app-data-migrations/…/app-data-migration-registry-order.test.ts` (`RELEASED`) | RELEASE.md's "Cutting The Release" step | No change now | That list is set at a release, on the finalize branch. This ticket is not released, so the new migration is not in it; the release that carries it adds it |

AC-001's grep over tracked files on the merged state (`evidence/DEL-08-ac001-grep-merged.log`) gives the same 37 hits in the same files and counts as API/E2E's run: doc notes that say "retired", frozen or released migration code, and tests that name the old files only as kept or ignored data. No stale mention of the Self-Evolver, the Memory Compactor, `retrospective-skill-coach` or `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` remains in a doc, outside the migration, its tests and the server bootstrap smoke script (which asserts that the bootstrapper leaves a stale compactor folder alone, as it should: the migration, not the bootstrapper, deletes it).

## Docs Updated

None by delivery. Every doc edit this ticket needed is in the implementation commit `ef0e56caf3` ("docs(autobyteus-491): retired memory items and built-in agents") and was verified above.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| The retired item files are data, not code | `episodic.jsonl`, `semantic.jsonl` and `compaction_lineage.jsonl` in old run folders are retired: nothing reads or writes them and they stay on disk. The library has no code for them | `requirements-doc.md` DEC-001, DEC-002, DEC-004; `design-spec.md` | `agent_memory_design.md`, `agent_memory.md`, `GLOSSARY.md` |
| The two retired built-in agents are removed at startup | `20261118_remove_retired_built_in_agents` deletes `agents/autobyteus-skill-evolver` (with its own skill) and `agents/autobyteus-memory-compactor`, only those two, once; a failed removal is retried at the next start; their runs and every other file stay | `design-spec.md` (Migration Plan), `requirements-doc.md` DEC-003, DEC-005, DEC-006 | `agent_definition.md`, `agent_memory_design.md`, `settings.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `autobyteus-ts/src/memory/models/{episodic-item,semantic-item,memory-types}.ts`, `retrieval/{retriever,memory-bundle}.ts`, `MemoryStore.list`, `MemoryManager.memoryTypes`, the item file-name constants and read branches, and `tests/unit/memory/retriever.test.ts` | Nothing: the library does not know the retired items. Compaction and restore read raw traces and the working-context snapshot | `agent_memory_design.md` |
| The installed built-in Skill Self-Evolver and Memory Compactor agent definitions (and the Self-Evolver's own skill `retrospective-skill-coach`) | Removal at the next start by the migration; the Memory Compactor was already unused by compaction | `agent_definition.md`, `settings.md` |
| Tests that asserted the Self-Evolver is kept after the 20261020 migration (its startup E2E and fixtures, the web probe case SIR-002) | The same cases assert it is gone, and the Memory Compactor too | the tests themselves; `api-e2e-execution-coverage-report.md` API-06, API-08 |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: the ticket's docs were updated by the implementation (`ef0e56caf3`); delivery made no docs edit of its own.
- Rationale: each long-lived doc that describes the removed code or agents was changed in `ef0e56caf3`, and the merged-state grep and the review above show no stale statement left. The base advance changed no doc this ticket owns apart from the four merged files listed under Scope.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, verification record, archive, finalization (`release-deployment-report.md`)
- Notes: follow-ups FU-001…FU-005 of this ticket are in `follow-ups.md`; the Solution Designer sends them. FU-004 and FU-005 are delivery's, found by the merged-state run (causes in the release/deployment report). Proposal, not a change: FU-005's `TESTING.md` row edit belongs to the API/E2E engineer. The base's copy of `TESTING.md` gained a rule and a helper (`tests/helpers/os-latency-under-load.ts`) for watcher-event tests while this ticket was in review, so FU-003 (load-sensitive watcher tests) and FU-002 (built-server start/stop timeouts) may already be partly met: check them against the base before sending.
