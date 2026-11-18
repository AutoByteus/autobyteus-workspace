# Handoff: Architecture Design Complete → Architecture Review

- Package: `retired-memory-items-and-stale-built-ins` (Project Task autobyteus-491, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- From: Solution Designer (`solution_designer_703182187282472484b90793eac8be40`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the founder
- Date: 2026-11-18
- Result: `Architecture Design Complete`, `task_size=Medium`, `architectural_risk=High`; current SR: SR-002
- Route: handoff rule "Large or High → `/architecture_reviewer`"

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/retired-memory-items-and-stale-built-ins`
- Branch: `codex/retired-memory-items-and-stale-built-ins`, from `origin/personal` at `2e9ac1e65b`
- Ticket documents are uncommitted.
- Finalization target: `origin/personal`.

## Request and decisions

- Part 1: remove the retired compactor's episodic/semantic memory items as a clean cut. The founder said: "let's remove the dead code, we should do that now". Nothing live shows them (INV-4).
- Part 2: remove the stale built-in Skill Self-Evolver by an app-data migration. The founder said: "that one should be removed". The 20261020 removal kept it on purpose (INV-9).
- The user's data decisions (2026-11-18):
  - keep the 12 old item files;
  - keep the 104 old compactor runs;
  - remove the Memory Compactor definition: by his rule "leave it if it doesn't influence us", and it is listed to every agent (INV-16).
- Frozen migration code and released migrations are untouched.

## Documents

`requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`. No follow-ups found.

## Points for the reviewer

1. The removal plan in `autobyteus-ts/src/memory`:
   - `MemoryStore.list` goes, because it has no production caller once `Retriever` goes;
   - `MemoryType` keeps `RAW_TRACE`.
2. The new migration `20261118_remove_retired_built_in_agents`:
   - a pattern copy of 20261006, with two folders passed by the registry;
   - registered at the end, `STARTUP_ONLY`.
3. Test changes:
   - the startup-level tests that asserted the Self-Evolver stays are updated;
   - the 20261020 unit test stays, since its migration's behavior is unchanged.

## Delivery gates

- The founder's approval and a backup before the first start on his node.
- Release only on his word.

---

## SR-003 resubmission (2026-11-18)

- AR-001 resolved in design-spec (Removal Plan, Final File Mapping, Key Tradeoffs, Backward-Compatibility Rejection Log):
  - `MemoryType` and `MemoryItem` are removed;
  - `RawTraceItem.memoryType` is removed;
  - the stores' `add` is typed on `RawTraceItem` and appends to the raw-trace file; `appendRawTrace` stays (server `ExternalRuntimeMemoryWriter`) and calls `add([item])`;
  - `getFilePath`/`readMemoryDicts` are replaced by `getRawTracesPath()` and a private raw-trace read;
  - `MemoryStore.list` is removed; tests read through `listTurnRawTracesOrdered`/`listRawTraceDicts` (the file list is in the plan).
- N-2: the exceptions are listed in Dependency Rules.
- R-1: in Risks. On the founder's node no team, org or package names either id. The user is told.
- Requirements unchanged; classification Medium / High.
