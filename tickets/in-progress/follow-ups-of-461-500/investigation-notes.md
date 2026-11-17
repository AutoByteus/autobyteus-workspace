# Investigation Notes: follow-ups-of-461-500

## Bootstrap

- Task: `autobyteus-500`, read with `get_project_task` on 2026-11-17. Context file: `source-follow-ups-461.md` (copied from the Task's context).
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/follow-ups-of-461-500`. Branch: `codex/follow-ups-of-461-500`. Base: `origin/personal` at `e4f4b3e176` (461's delivery). Finalization target: `personal`.
- Authorities read: the `solution-designer` skill; `references/requirements-engineering.md` (phase 1 gate); the Solution Designer's lessons (`reflections/lessons.md`: re-walk changed spines; read the code behind every premise).

## Sources inventory

| Source | Purpose |
| --- | --- |
| `source-follow-ups-461.md` | The 22 follow-up rows, with their evidence and suggested handling |
| `tickets/done/delegated-copies-outlive-delegator-461/` (on `personal`) | 461's design, contract, evidence |

## Findings

- **FU-019:** 20 web files use `transient_execution` / `RunHistoryTransientExecutionRow` / `transientKind` (grep, 2026-11-17), including `WorkspaceTransientExecutionRow.vue`, `runTreeDisplayRows.ts`, `mobileRunListRows.ts` and `useTaskWorkerTasks.ts`.
- **FU-020:** final attachments already live in the child's own folder. `context-file-owner-resolver.ts:80-97` resolves `agent_collaboration_member_final` to the child's location by `agentRunId`, and only checks that the host is admitted. The link format is in `context-file-owner-types.ts:188-189`. Read-only count on `~/.autobyteus/server-data/memory`: 425 host-scoped links in 143 files, in 84 run folders; 1 draft under `draft_context_files/agent-collaborations`.
- **FU-002:** `standalone-agent-run-root.ts` 323 lines, `standalone-agent-run-root-manager.ts` 429 lines: already under the limit. The project's documents state no 500-line rule. Other server files over 500 lines exist (for example `delegation-index.ts` 548, `agent-stream-handler.ts` 508), noted only.
- **FU-007:** 29 uses of `agentRunResources` / `executionResources` in `src/projects`.
- **FU-035:** `grok-build-tool-projection.ts:37` falls back to "Tool execution failed." when the snapshot carries no `error`, `message`, `output_for_prompt` or content. `agent-tool-mcp-tool-executor.ts:103` has the server's own error message. Whether the model sees the server's text inside the Grok CLI is unknown: to reproduce with a live run.
- **FU-036:** `api/websocket/agent.ts`: `attachRootStream` attaches its listener after `connect`; `attachRunStream` answers `SESSION_NOT_READY` (per the follow-up row; to re-read in design).

## Architecture investigation (delivery 1), 2026-11-17

Authorities read for design: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` (in full), `collaboration_model.md` §1.

### FU-020: the stored host-scoped attachment links (read-only probes of `~/.autobyteus/server-data`, `python3 -I`, scripts in `/tmp/fu020-probe/`)

- **Who still writes them: nobody since beta.7.** The web composer's draft owner is the browsed run's own (`useComposerTarget.ts` `resolveDraftOwner`: `run` → `agent_draft`, `teamMember` → `team_member_draft`, `agentOrgMember` → `org_member_draft`), since `e19ed3819f` (CR-461-106, 2026-11-16), contained in `v1.5.13-beta.7`. No current code builds an `agent_collaboration_member_*` owner except the parsers: server `context-file-owner-types.ts:94-128,188`, `context-file-local-path-resolver.ts:18,110`, `api/rest/context-files.ts:256-263` (the final route), `context-file-layout.ts:50` (the draft folder); web `contextAttachmentModel.ts:14-15,128-134` (hydrating stored links), `contextFileOwner.ts:6,12`, `useContextAttachmentComposer.ts:87`. The link form first shipped in `v1.4.92-beta.5` (`c2f69edde2`, 2026-09-30). D-8's note "beta.7 writes them too" is therefore not true for new attachments; the migration covers every link written before beta.7.
- **Where they are (by file kind, occurrences):** `raw_traces_active.jsonl` 93 files / 407; `raw_traces_NNNNNN.jsonl` 52 / 128; `work_journal_active.md` 83 / 287; `work_journal_NNNNNN.md` 41 / 77; `memory-search.sqlite` 18; `server.log` 284. These counts include text mentions (agents discussing the route) and the memory-sync mirror under `memory/imports/`.
- **Structured links vs text:** in raw traces, the exact link form `/rest/agent-collaborations/{host}/agent-runs/{child}/context-files/{file}` occurs only at `media.images[]` of `user` records: 246 (207 active, 39 rotated), all relative (no scheme), none in the draft form. All other trace occurrences (`tool_result`, `tool_args.*`, `content`) are text. Work-journal occurrences are all text: the journal renders a record's media as `Attachments: …` (`agent-work-journal/rendering/non-tool-record-lines.ts:14-21`).
- **Excluding the mirror (`memory/imports/`, 15 links):** 231 links. **Every one sits in the child's own run folder and its file exists there:** 3 in `agents/{child}/` (agent runs), 228 in `agent_teams/{team}/{member}/` (members of delegated team runs, 60 teams), with `{child}` = the folder's own run/member ID and `{folder}/context_files/{file}` present (231/231).
- **The link's host is the old hosted tree's top, not always the direct delegator:** host = the run's `delegatedFrom` delegator for 120 links, an ancestor two or more hops up for 111 (for example a member of `product_team_…` delegated by `software_engineering_team_…`, link host `project_task_manager_…`). Today's resolver finds a child only one hop under the host (`delegated-child-locations.ts:95-98`, `DelegationIndex.childrenOf`), so those 111 attachments most likely do not open in beta.7 (code reading; not reproduced, because no app on this machine serves the founder's data now). A name hid a bug.
- **Delegated marker:** every run holding a structured link has `delegatedFrom` in its own file (`run_metadata.json` / `team_run_execution_tree.json`); one team without it holds only text mentions.
- **Stored layout (current code):** an agent run's files: `agents/{runId}/context_files/` (`context-file-layout.ts:58-63`); a team member's: `{member memoryDir}/context_files/`, and a member's memoryDir is `agent_teams/{rootTeamRunId}/{ancestorTeamRunIds…}/{agentRunId}` (`agent-memory-layout.ts:81-94`), so its containing team run is its parent folder. The `team_member_final` link is `/rest/team-runs/{containingTeamRunId}/agent-runs/{agentRunId}/context-files/{file}`, resolved by `{containingTeamRunId, agentRunId}` (`context-file-owner-resolver.ts:96-97`); `agent_final` is `/rest/runs/{runId}/context-files/{file}`.
- **Derived stores:** the active work journal is rendered again on every call (`work-journal-service.ts:229-249`), so it follows a rewritten `raw_traces_active.jsonl`; a closed journal file is reused while its segment's record count is unchanged (`:205-217`), so it keeps the old text. The search index is built from the journals. `raw_traces_manifest.json` holds record counts and trace IDs, no hashes, so a same-count rewrite keeps it valid.
- **Cost:** 7,514 trace files, 8.6 GB under `agents/` and `agent_teams/`; 84 hold the link bytes (390 MB, largest 42 MB). A byte pre-check over all of them took 9.3 s (warm cache, `python3`). Cold time not measured.
- **The precedent:** `frozen/server/context-files/services/context-file-record-locators.ts` lists a run folder's trace files (active, segments, archived segments) and rewrites only `media.{images,audio,video}[]` and `file_attachments[].uri`, keeping unchanged lines byte-identical; used by `team-context-file-execution-locators-v1` and `agent-org-flat-team-families-v1`.
- **Backups:** existing ones live in `app-data-migration-backups/{migrationId}/` (`team-run-history-index-reconciler.ts:142-155`).
- **Late predecessors (released order test `app-data-migration-registry-order.test.ts:12-58`):** first release of each registered migration, from git tags (`git tag --contains` of the commit adding its ID). Only migrations shipped at or after `v1.4.92-beta.5` can meet this link in their input: `projects_per_folder_v1`, `remove_built_in_project_task_manager` (v1.4.95), `collaborators_to_delegated_runs_v1`, `project_task_keys_v1` (v1.5.5), `task_agent_own_run_v1`, `append_only_message_logs_v1`, `remove_work_trace_exports` (v1.5.6), `delegated_copy_own_file_complete_v1` (v1.5.7), `remove_skill_improvement_data` (v1.5.8), `node_identity_file_name`, `memory_sync_source_id_names`, `project_task_titles` (v1.5.9), `raw_trace_manifest_runtime_names` (v1.5.11), `delegated_runs_own_runs_v1` and its nine follow-ups (beta.7). Of these, only `20261017_task_agent_own_run_v1` moves a delegated run's folder, traces included, into its own place (`coordinating-run-migration.ts:110-133`, `fs.rename`); `collaborators_to_delegated_runs_v1` changes tree JSON only (its doc, lines 52-60); `delegated_runs_own_runs_v1` moves message logs only (line 228).

### FU-007: the Task record's stored names

- 401 `agent_run_resources.json` files in the founder's data. Stored: `{taskId, agentRunResources: [{role, delegatedFrom, recipientAddress, agentRun: {kind: "agent", agentRunId} | {kind: "team", teamRunId, coordinatorAgentRunId}, linkedAt, …}]}`. Code: `executionResources`, `execution: {agentRunId} | {teamRunId}`, `teamCoordinatorAgentRunId` (`projects/stores/task-execution-resource-schema.ts:5-10`, `projects/domain/task-execution-resources.ts:18-45`).
- **The stored `agentRun` also holds team runs** (`kind: "team"`). Renaming the code to the stored names (D-5 as approved) would give a team run the code name `agentRun`: a wrong meaning moved into the code (Principle 15). See SR-003.

### FU-021: the watcher integration test (Reproduced, 2026-11-17)

- **Setup:** the worktree, after `pnpm test:integration:prepare` (without it, every case fails with "Watcher runtime entrypoint not found"). 10 cores; the machine was already busy (load average 72 to 217 from other processes).
- **Under 10 extra busy loops** (`for i in $(seq 10); do yes > /dev/null & done`), `npx vitest run tests/integration/file-explorer/file-system-watcher.integration.test.ts` failed in 8 of 8 runs, with 9 or 10 of 14 cases timing out ("Timed out waiting for event", at about 8 s).
- **Without the extra loops** (machine still busy): 6 of 14 failed the same way.
- **Temporary diagnostic** (reverted, never committed): the helpers' 8 s and 12 s deadlines raised to 60 s.
  - "emits file creation event with node metadata" passed under load.
  - The whole file: 7 of 14 still failed, on the per-test `{ timeout: 15000 }`. "emits move/rename event" failed with `expected [ 'move', 'rename' ] to include 'delete'`: the rename arrived as a delete first (`file-system-watcher.integration.test.ts:270-272`).
- **What is established:** latency under contention exceeds the tests' fixed deadlines, and batching splits a rename. No lost event was shown, but the run with long waits was cut short by the per-test timeout, so not every case was seen to arrive. The fix proves the rest (design, "FU-021").
- **Readiness is awaited before acting:** `file-explorer.ts:382-383` (`waitUntilReady`, chokidar `ready`). The batch window is 250 ms (`event-batcher.ts:45`).

## Delivery 2 investigation (2026-11-17, by reading)

- **FU-027, the guard:**
  - `tests/unit/app-data-migrations/app-data-migration-registry-order.test.ts:12-74` already checks the released prefix (a hand-kept `RELEASED` list, as of beta.7) and that later entries are in date order, none dated before the newest released one.
  - The release commit is made by `scripts/desktop-release.sh` `commit_tag_and_push` (lines 271-280: `git add "$@"`, commit, annotated tag).
  - The test builds the registry with `new AppDataMigrationRegistry()` and no setup (line 63), so a small server script can do the same.
- **FU-028:**
  - `skillAccessMode` appears nowhere in current code outside `src/app-data-migrations` (`git grep`).
  - `20260706_remove_global_skill_discovery_mode` rewrites only the value `GLOBAL_DISCOVERY` to the target mode and keeps the field (`remove-global-skill-discovery-mode-migration.ts:74-80`).
  - Released migrations still write the field in their frozen shapes (`team-run-execution-tree-v2-app-data-migration.ts:87`); `delegated-copy-own-file-complete-v1/own-file-completion.ts:56` calls it obsolete.
  - The 461 evidence shows the late writer's value is `"NONE"`, not `GLOBAL_DISCOVERY`.
  - So the field is ignored residue everywhere; FU-028's premise ("an earlier migration removes it") does not hold.
- **FU-029:**
  - `team-run-history-index-v2-migration.ts:125-170` lists only `agent_teams/<id>/team_run_metadata.json` records.
  - Lines 443-451 drop every existing row whose ID was not indexed ("no metadata directory was found"), although the folder may exist in the current tree shape (`team_run_execution_tree.json`).
  - 461's follow-up `20261114_preserved_items_after_team_run_history_index_v2` re-adds only delegated team runs' rows (`delegated-runs-own-runs-v1-app-data-migration.ts:291-313`, the `delegatedFrom` condition).
- **FU-033:**
  - `autobyteus-web/tests/e2e/skill-improvement-removal-cases.mjs:214-251` creates `helper_run_5555` with `launchPurpose: 'server_helper'` and expects it deleted.
  - The migration deletes only helpers named in a session and the improver's runs (461's follow-up row).
  - The server test names it (`tests/app-data-migrations/remove-skill-improvement-data/remove-skill-improvement-data-migration.test.ts:87,187`, fixture `tests/fixtures/app-data-migrations/skill-improvement-data-fixtures.ts:18`).

### FU-021, continued: the events are lost by the OS, not by our watcher (Reproduced, 2026-11-17)

- **Trigger:** the implementation engineer's Design Impact (IR-001). With the tests asserting outcomes and a 60 s hang guard, 7 and 9 of 14 cases still failed. With a 180 s guard, a sentinel write produced no event for over 3 minutes (`evidence/implementation/IMP-008-*.log`).
- **Probe 1, raw chokidar 4.0.3** (`/tmp/fu021-probe/raw-chokidar.mjs`): the server's own chokidar with the watcher's options (`awaitWriteFinish` 200/50), and none of our code. Five rounds, each with a fresh temp dir and one file write. Results: 646 ms, 3,223 ms, **no event within 60 s**, 1,761 ms, 902 ms. Load average 53 to 68.
- **Probe 2, Node's own `fs.watch`** (recursive; FSEvents through libuv), no chokidar (`/tmp/fu021-probe/raw-fswatch.mjs`). Eight rounds: 236, 384, 3,585 and 1,203 ms, **none within 60 s**, 174 and 411 ms, **none within 60 s**.
- **What is established:** on this machine under its sustained load, macOS file events are sometimes held for minutes or lost, below chokidar and our watcher. Our watcher code (one child process per workspace, `watcher-runtime-process-registry.ts`; chokidar in `chokidar-watcher-runtime.ts:44-66`) is not shown at fault.
- **Product consequence (not this ticket):** under heavy system file activity, the File Explorer can miss a change until the next one in that folder. That is a platform limit. Reconciling with the disk (for example a rescan when the tree is opened) would be a feature, recorded as FU-500-06.
