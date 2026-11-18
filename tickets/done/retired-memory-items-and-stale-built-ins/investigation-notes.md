# Investigation Notes

## Investigation Meta

- Package identifier: `retired-memory-items-and-stale-built-ins` (autobyteus-491)
- Request / ticket: Project Task autobyteus-491, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a` (description; comments 2026-11-14 part 2 and 2026-11-18 dispatch)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/retired-memory-items-and-stale-built-ins`
- Repository mode: `Git`
- Task worktree / branch: same path, `codex/retired-memory-items-and-stale-built-ins`
- Resolved base: `origin` / `personal` / `2e9ac1e65b` (fetched 2026-11-18; beta.10 released)
- Finalization target: `origin` / `personal`
- Bootstrap result: worktree created
- Current solution revision ID: `SR-001`
- Authorities read (2026-11-18): `references/requirements-engineering.md`, `finding-the-cause.md`, `ticket-scope.md`, `handoff.md` (read in this conversation for autobyteus-493); `DESIGN.md`; Data Migration Guideline §1–4 (excerpts)
- Investigation status: requirements investigation complete; architecture investigation follows approval

## Source Log

| Date | Type | Source / Command | Finding |
| --- | --- | --- | --- |
| 2026-11-18 | Command | `grep -rn` for `EpisodicItem\|SemanticItem\|MemoryType.(EPISODIC\|SEMANTIC)\|Retriever\|MemoryBundle\|EPISODIC_MEMORY_FILE_NAME\|SEMANTIC_MEMORY_FILE_NAME\|episodic.jsonl\|semantic.jsonl` over the workspace (no node_modules/dist/tickets) | INV-1: live code: `autobyteus-ts/src/memory/{index.ts, models/episodic-item.ts, models/semantic-item.ts, models/memory-types.ts, retrieval/memory-bundle.ts, retrieval/retriever.ts, store/file-store.ts, store/memory-file-names.ts, store/run-memory-file-store.ts}`; tests: 8 autobyteus-ts test files, `test-support/live-e2e/live-e2e-harness.ts:1004-1005`, server `tests/unit/agent-memory/agent-memory-service.test.ts:30-46`, `tests/app-data-migrations/raw-trace-active-file-name/...test.ts:104-128` (fixture file names only); frozen: `src/app-data-migrations/frozen/autobyteus-ts/memory/store/{memory-file-names.ts, run-memory-file-store.ts}` and the v5 migration (imports the frozen copy) |
| 2026-11-18 | Code | `autobyteus-ts/src/memory/retrieval/retriever.ts`; callers of `Retriever`, `MemoryBundle`, `FileMemoryStore.list(EPISODIC/SEMANTIC)` | INV-2: no writer and no production caller: `Retriever` and `MemoryBundle` are only exported; `list(EPISODIC/SEMANTIC)` is called only by `retriever.ts` and the live-E2E harness (asserting none were written). `appendJsonlRecord(getFilePath(item.memoryType))` writes only raw traces in practice (no producer of the other item types) |
| 2026-11-18 | Code | `COMPACTED_MEMORY_CATEGORY_*`, `isCompactedMemoryCategory` (exported from `semantic-item.ts`) | INV-3: no user outside `semantic-item.ts` and `index.ts` |
| 2026-11-18 | Code/Doc | server `agent-memory-service.test.ts:30` ("the old working-context, episodic and semantic files are not read"), `autobyteus-server-ts/docs/modules/agent_memory.md:75`, web `MemoryInspector.spec.ts:21-28` (no Episodic or Semantic tab) | INV-4: the server and the Memory page already do not read or show these files for any run, old or new (since `work-journal-search`). Removing the library code hides nothing visible |
| 2026-11-18 | Code | `migrate-native-working-context-snapshots-v5-migration.ts:10-35, 177-183, 254-269` | INV-5: the released v5 migration imports the names from its frozen copy and deletes `episodic.jsonl`/`semantic.jsonl`/`compacted_memory_manifest.json` when it converts a run's snapshot (precedent: the repository already treats these files as obsolete). Frozen and migration code stay untouched |
| 2026-11-18 | Doc | `autobyteus-ts/docs/agent_memory_design.md:14, 299, 356, 534`; `autobyteus-server-ts/docs/ARCHITECTURE.md:166`; `docs/design/codex_raw_event_mapping.md:433`; `docs/modules/agent_memory.md:75, 119`; `agent_episodic_catalog.md:13` | INV-6: docs naming the retired items |
| 2026-11-18 | Data (read-only) | `find ~/.autobyteus/server-data \( -name episodic.jsonl -o -name semantic.jsonl \)` with sizes | INV-7: 12 files, 6 runs, 159,498 bytes; see the table below |
| 2026-11-18 | Code/History | `built-in-agent-registry.ts`; `git log -p` of the registry and templates | INV-8: current built-ins: Daily Assistant, Model Router. Ever registered: also Project Task Manager (removed by `20261006_remove_built_in_project_task_manager`), Retrospective Skill Improver (removed by `20261020_remove_skill_improvement_data`), **Skill Self-Evolver** (`autobyteus-skill-evolver`) and **Memory Compactor** (`autobyteus-memory-compactor`): no source, no template, no code reference except tests |
| 2026-11-18 | Ticket | `tickets/done/remove-skill-improvement/requirements-doc.md:44, 69`; `investigation-notes.md:68` | INV-9: the 20261020 removal **kept the Skill Self-Evolver on purpose**: that Task said it stays ("an agent, not server code"). Its tests assert it is kept (`remove-skill-improvement-data-migration.test.ts:77-81`, `remove-skill-improvement-data-startup.e2e.test.ts:169-180`, fixtures, `autobyteus-web/tests/e2e/skill-improvement-removal-cases.mjs:241-298`). Not an oversight; the founder's word of 2026-11-14 reverses it |
| 2026-11-18 | Ticket/Code | `e6ff606873` (context compaction simplification); `tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts:108-150` ("leaves the old compactor source intact"); `scripts/smoke-built-in-agents-bootstrap.mjs:60` | INV-10: the simplification unregistered the Memory Compactor and **left its installed folder on purpose** (no new migration; preserve user data). Nothing reads it now (compaction is one direct call; the old compactor preference import was removed) |
| 2026-11-18 | Data (read-only) | `~/.autobyteus/server-data/agents/` | INV-11: `autobyteus-daily-assistant`, `autobyteus-memory-compactor` (agent.md + agent-config.json, 2026-10-01), `autobyteus-model-router`, `autobyteus-skill-evolver` (agent.md, agent-config.json, `skills/retrospective-skill-coach/`, 2026-07-09), `professor`, `student`. The evolver's skill exists only inside its own folder |
| 2026-11-18 | Data (read-only) | `memory/agents/memory_compactor_*` | INV-12: 104 old Memory Compactor helper runs (12.5 MB, newest 2026-08-15), all in `run_history_index.json`. No evolver runs |
| 2026-11-18 | Code | `grep -rn -i episodic\|semantic autobyteus-web/localization` | INV-14: no localization key names the retired items; the only "semantic memory" strings belong to the current per-agent semantic folder feature (`agents.ts:10,12`, `personalSettings.ts:5-6`) and stay |
| 2026-11-18 | User (via PM) | PM message 2026-11-18 relaying the founder: "let's remove the dead code, we should do that now" | INV-15: confirms DEC-001/DEC-002 (clean cut, old-run reading goes since nothing live shows it); the old files: list and let him decide, do not delete |
| 2026-11-18 | Code | `remove-built-in-project-task-manager-migration.ts` | INV-13: the precedent: a startup migration that removes one installed agent folder (`STARTUP_ONLY`, "No backup is made" in its description; the user backs up first) |

- INV-16 (2026-11-18, `list_available_agents` on the live node): both `Memory Compactor` (`/memory_compactor`) and `Skill Self-Evolver` (`/skill_self_evolver`) are listed to agents as collaborators.

## Old files on the founder's disk (INV-7)

| File | Bytes | Modified |
| --- | --- | --- |
| `memory/agents/daily_assistant_e6a670ad5b2d4804a7a43b4b1a11d875/episodic.jsonl` | 2,607 | 2026-08-12 |
| `…/daily_assistant_e6a670ad…/semantic.jsonl` | 7,714 | 2026-08-12 |
| `memory/agents/memory_compactor_6d151dd0cc8441d8881a2d684f86b454/episodic.jsonl` | 1,154 | 2026-08-15 |
| `…/memory_compactor_6d151dd0…/semantic.jsonl` | 2,599 | 2026-08-15 |
| `memory/agents/daily_assistant_2a39c68eb96443ada6f5af9f4f81acef/episodic.jsonl` | 19,201 | 2026-08-15 |
| `…/daily_assistant_2a39c68e…/semantic.jsonl` | 35,145 | 2026-08-15 |
| `memory/agents/daily_assistant_677f865b9ce140f9a51557bfc4217b51/episodic.jsonl` | 11,208 | 2026-08-10 |
| `…/daily_assistant_677f865b…/semantic.jsonl` | 41,396 | 2026-08-10 |
| `memory/agents/daily_assistant_6bf3d914e956467cb00f126274124919/episodic.jsonl` | 4,957 | 2026-08-15 |
| `…/daily_assistant_6bf3d914…/semantic.jsonl` | 11,912 | 2026-08-15 |
| `memory/imports/docker-node-1/agents/daily_assistant_1de2193b979a47d189aa1b4379b703e2/episodic.jsonl` (memory synced from the Docker node) | 5,557 | 2026-08-05 |
| `…/imports/docker-node-1/…/semantic.jsonl` | 16,048 | 2026-08-05 |

Total 159,498 bytes. They are summaries the old compactor wrote; the runs' raw traces and work journals (the full history) stay.

## Collision check with the episodic catalog (autobyteus-493)

The catalog's code (`agent-episodic-catalog/`, `AgentMemoryLayout.getAgentEpisodicDirPath`, `RunFolderDiscovery`, `readJournalSpans`) uses none of the retired items (grep: no import of `EpisodicItem`, `MemoryType`, `EPISODIC_MEMORY_FILE_NAME`). `memory/episodic/` is a sibling of the run families; `episodic.jsonl` sits inside run folders: no path collision.

## Supplemental Artifact Inventory

None.
