# Investigation Notes

## Investigation Meta

- Package identifier: `per-agent-episodic-catalog` (autobyteus-493)
- Request / ticket: Project Task autobyteus-493 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/per-agent-episodic-catalog`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/per-agent-episodic-catalog`, `codex/per-agent-episodic-catalog`
- Resolved base remote / branch / revision: `origin` / `personal` / `2b73308ce57286a203f0f5a341b4f47d9275c78e` (fetched 2026-11-17)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md)
- Bootstrap result: worktree created from `origin/personal`
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; 2026-11-17): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/handoff.md`; for the design phase: `references/architecture-design.md`, `references/design-principles.md`, repository `DESIGN.md`, `GLOSSARY.md` (Memory section)
- Investigation status: complete for requirements and design

## Initial Request And Clarifications

- Original request: the Task's description (2026-11-14) and the founder's two comments of 2026-11-17 (see the requirements doc's header).
- Clarifications received: option A decided; option B not wanted now; the catalog points to the runs' journal folders; kept current whenever a journal is created or changed; existing data only read; his approval and a backup before anything writes beside his real data on his node; release only on his word; 491 first or together.
- User-supplied facts and constraints: about 1,540 run folders (762 standalone + 780 team folders); privacy rule (short summary and paths only).
- Initial ambiguity: what the "short summary" can be without quoting; the archive/delete behavior; how the catalog learns of archive/delete; 491's status.

## Product And Domain Understanding

- Product area: agent memory (run memory, Work Journals, semantic memory, memory search).
- Affected actors or systems: memory-analysis agents (reflection skill, observer team agents-105, dream 482), the server memory subsystem.
- Existing purpose: journals are a readable per-run record; memory search finds them by words and meaning.
- Relevant terminology (GLOSSARY.md § Memory): Memory (of a run), Semantic memory (of an agent), Work Journal, Memory search, Memory index. New term: **Episodic catalog** (of an agent).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-17 | Code | `autobyteus-server-ts/src/agent-memory/store/agent-memory-layout.ts` | Folder naming | `getAgentSemanticMemoryDirPath(id)` = `<memory>/semantic/<encodeURIComponent(id)>`, guarded by `resolveSafePath`; the layout is "the only composer of agent memory paths" | INV-C1 |
| 2026-11-17 | Code | `agent-memory/services/agent-semantic-memory.ts` | Semantic folder owner | Folder created at run preparation for definitions with `semanticMemoryEnabled` | INV-C2 |
| 2026-11-17 | Code | `agent-work-journal/services/work-journal-service.ts`, `work-journal-run-updater.ts`, `store/work-journal-store.ts` | Journal lifecycle | Only writer/reader of journals; `ensureCurrent` after each turn end/compaction (run updater) and in the memory-search Journals step; `onJournalChanged(listener)` fires after a call that wrote or removed a journal file, with `{ runId, memoryDir, package }`; manifest `work_journal_manifest.json` lists files (state, sha, runtime) | INV-C3 |
| 2026-11-17 | Code | `memory-search/runs/memory-run-discovery.ts`, `memory-search/pipeline/*.ts`, `memory-search/memory-search.ts` | Existing run discovery and incremental pattern | `MemoryRunDiscovery.findRuns()` walks agents/agent_teams/agent_orgs for folders with raw traces and attributes them via team/org location services, the run-history catalog and run metadata; it does not carry the definition id of team/org members; the pipeline follows `onJournalChanged` with a 20 s quiet time and keeps raw-trace fingerprints for catch-up | INV-C4 |
| 2026-11-17 | Code | `run-history/services/agent-run-history-service.ts`, `agent-run-history-catalog-service.ts`, `team-run-history-service.ts`, `team-run-history-catalog-service.ts`, `collaboration-run-history-catalog-core.ts`, `agent-org-run-history-catalog-service.ts`, `agent-org-execution/services/agent-org-run-service.ts`, `delegated-work-guard.ts` | Archive/delete | Agent: `archiveRun`/`unarchiveRun` set `archivedAt` in `run_history_index.json`; `deleteRun` removes the row and the run folder; team: tree `archivedAt` and the team index; delete removes the team folder; org similar; archive/delete of all three kinds pass the `DelegatedWorkGuard`; `archiveStoredAgentRunGroup` archives through the catalog directly; unarchive has no product caller | INV-C5 |
| 2026-11-17 | Code | `memory-sync/shared/memory-sync-path-policy.ts`, `memory-sync/source/local-memory-export-scanner.ts` | Sync scope | Memory Sync carries only `agents` and `agent_teams`; `semantic/` and a new `episodic/` are not synced; imports land in `memory/imports/` (skipped by discovery) | INV-C6 |
| 2026-11-17 | Code | `grep -rli episodic` over `autobyteus-ts/src`, `autobyteus-server-ts/src`, docs | 491 status in code | `EpisodicItem`, `SemanticItem`, `Retriever`, `MemoryBundle`, `EPISODIC_MEMORY_FILE_NAME` remain in `autobyteus-ts/src/memory` (39 references, 7 test files); `agent_memory.md` says no current compaction appends them and the server no longer reads them | INV-C7 |
| 2026-11-17 | Code | `run-history/store/delegated-from-schema.ts`, `run-history/store/agent-run-metadata-types.ts` | Delegated runs | `delegatedFrom = { delegatingRun: {kind, runId}, delegatorAgentRunId?, nodeId? }`; `nodeId` only on a run a peer started | INV-C8 |
| 2026-11-17 | Code | `projects/services/task-execution-resource-service.ts` (`locationOf`, `historyOf`, `rootTaskLocationOf`), `project-task-service.ts` (`currentTasksOfTaskWorkers`, `readTaskChangeView`) | Task of a run | The Task records give a run's (team's) current Task location by execution reference; a view gives key and title | INV-C9 |
| 2026-11-17 | Code | `agent-execution/prompt/carpenter-prompt-sections.ts` | How agents learn the semantic path | A fixed "Semantic Memory" prompt section (contract text) names the folder; changing prompts is outside this ticket | FU-001 |
| 2026-11-17 | Data (read-only) | `~/.autobyteus/server-data/memory` listing; Python walk (see INV-D1) | Volumes | 762 standalone folders (733 with raw traces), 781 team folders, 24 org folders; 3,986 run folders with raw traces: 733 standalone, 3,138 team members (2 without journal), 115 org members; 9,071 journal `.md` files; memory folder 13 GB | INV-D1 |
| 2026-11-17 | Data (read-only) | `run_history_index.json`, `team_run_history_index.json`, `team_run_execution_tree.json`, `run_metadata.json` | Fields available | Standalone metadata: `agentDefinitionId`, `startedAt`, `workspaceRootPath`, `runtimeKind`, `delegatedFrom` (54 runs), `address`; 223 standalone folders have no metadata and no index row; team tree: `createdAt`, `archivedAt`, `rootTeam.teamDefinitionName`, members with `agentDefinitionId`, `agentRunId`, `address`, `launchConfiguration`, and the team's `delegatedFrom` | INV-D2 |
| 2026-11-17 | Data (read-only) | `run_history_index.json` row `summary` | Privacy | The standalone summary is the user's first message verbatim (for example a row's summary reads "is it using mtp? only 3-6 percent? impossible") | INV-D3 |
| 2026-11-17 | Data (read-only) | team tree member ids | Id forms | 88 team runs record `team-local:software-engineering-team:<member>`, 509 record `team-local-agent:…`; current code builds only `team-local-agent:` | DEC-006 |
| 2026-11-17 | Data (read-only) | `head` of `work_journal_000001.md` | Times | Line 2 of every journal file: `Runtime … · file 000001 (closed) · 2026-10-08 03:53 – 2026-10-12 06:59 UTC · source …`; reading the first 600 bytes gives a file's time span | INV-M1 |
| 2026-11-17 | Command | `python3 /tmp/catalog_probe.py` (read-only; walks the three families, parses every run/tree record and journal manifest, reads 600 bytes of each run's first and last journal file) | Cost of a full build | 3,986 runs, 7,968 header reads, 1,336 record reads: 12.6 s cold, 6.6 s warm | INV-M1 |
| 2026-11-17 | Memory | PM journal `work_journal_000008.md` lines 12064–12089; `task-plans/board.md` | 491 status | 491 (part 1 old episodic/semantic items; part 2 stale Skill Self-Evolver + Memory Compactor check) is not dispatched; "waits for his go" | DEC-010 |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | — | No current supported behavior: no per-agent run list | Journals per run folder; semantic folder per definition | INV-C1, INV-C2 | High |
| BEH-002 | System | Turn end / compaction; memory search build | Run updater → `ensureCurrent` → journal files + manifest written → listeners notified | Journal current after each turn | INV-C3 | High |
| BEH-003 | Operational | Run history archive/delete | Guard → catalog service → index/tree updated or folder removed | Archived runs keep their files; deleted runs lose them | INV-C5 | High |
| BEH-004 | System | Server start | — (new) | — | — | — |
| BEH-005 | Contract | — | Run-history summary is a verbatim first message | — | INV-D3 | High |
| BEH-006 | System | — | No current supported behavior | — | — | — |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `AgentMemoryLayout` | The only composer of memory paths | Episodic folder path belongs here | Add `getAgentEpisodicDirPath(id)` with the same encoding as semantic |
| `WorkJournalService.onJournalChanged` | Notifies after journal writes | The live trigger the founder asked for | Catalog subscribes like memory search does |
| `WorkJournalService.journalFileVersions` / manifest | Lists journal files without reading them | Paths and states without reading journal content | Plus a 600-byte header read for times |
| `MemoryRunDiscovery` | Finds and attributes every run folder | Same walk and attribution needed | Reuse; extend `MemoryRun` with the definition id it already has the records for (team/org placement `agentDefinitionId`) |
| `TeamRunExecutionTreeLocationService.listAgents({ rootTeamRunId })`, org equivalent | Members of one root with placement | Per-root reconcile after archive/delete | Reconcile one root, not the node |
| `DelegatedWorkGuard.guard` | Every archive/delete of agent/team/org roots passes it | One place knows "root X was archived/deleted" | Design decides the seam (see design spec) |
| Task records (`TaskExecutionResourceService`, `ProjectTaskService`) | Task of an execution | Summary (REQ-004) | Read-only lookup by execution reference |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: new `<memory>/episodic/<encoded id>/catalog.md`, `catalog.json`; `<memory>/episodic/index.md`.
- Existing readers, writers or contracts that consume them: none (new). Future: agents-105, the reflection skill.
- Evidence paths: INV-D1, INV-D2.

### Structural Surfaces

- Runtime modules: a new server subsystem for the catalog; `AgentMemoryLayout`; `MemoryRunDiscovery` (shared use); composition root / startup loader; archive/delete seam.
- Existing structural surfaces that can support the behavior: journal change listeners, run discovery, location services, Task records, atomic file writer (`run-history/store/atomic-json-file-writer.ts`).

### Potential Structural Impacts To Investigate

- API or external-contract change: none (files only; no GraphQL).
- Persistence schema or invariant change: new derived files only; no migration.
- Security or privacy boundary change: privacy rule REQ-004.
- Concurrency or lifecycle change: one writer per catalog, serialized; start/stop with the server.
- Deployment, migration, ownership-boundary change: none.
- Confirmed absent: GraphQL, UI, migration.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| Python walk of the founder's memory (read-only) | Volumes, attribution | See INV-D1, INV-D2 | `Measured` | REQ-001, REQ-007, DEC-006, DEC-007 | command in Source Log |
| `/tmp/catalog_probe.py` | Full build cost | 6.6–12.6 s for 3,986 runs | `Measured` | REQ-007 feasibility; incremental catch-up worth having | Source Log |

- Temporary diagnostics: none.
- Reproduction for implementation to start from: none (new behavior).

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| The founder (Task comments 2026-11-17) | Per-agent catalog; current on journal change; read only; privacy; ask before his node | Explicit | REQ-001 … REQ-008 | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Collaboration Model § 3 | `collaboration_model.md` | Where run memory lives; unchanged | DESIGN.md | None |
| Data Migration Guideline | `data_migration_guideline.md` | No migration needed (derived new files) | DESIGN.md | None |

## Persisted Data And State Facts

- Affected stored subject: new derived files under `<memory>/episodic/`.
- Location and shape: see design spec.
- Approximate volume: ~4,000 entries over ~100 definitions; the largest definitions about 600 entries.
- Current readers and writers: none.
- Current unknown/extra-field behavior: N/A.
- Required semantics to preserve: every existing file unchanged.
- Acceptable loss: the catalogs are rebuildable.
- Privacy: REQ-004.
- Remaining evidence gap: none.

## Product Design Request Context

- Product Design request in the current input: `Not stated`.

## Product Design Findings

- N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `follow-ups.md` (ticket folder) | Solution Designer | Follow-ups found | FU-001, FU-002 | — | Current | Not behavior-defining |
| `episodic-catalog-contract.md` (ticket folder) | Solution Designer | Exact catalog and overview file format | The two files under `<memory>/episodic/` | REQ-001…004, REQ-009, REQ-010; AC-001, AC-003, AC-008, AC-013 | Current (SR-002) | Behavior-defining; approved with SR-002 |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | The founder may expect a model-written summary | DEC-002 chooses records only | Told to the user with SR-001; the analysis agents write summaries | Open, low |
| RSK-002 | Risk | The first build on the founder's node writes beside his data | His word: ask him and back up first | Delivery gate | Open, delivery |

## Architecture Investigation Findings

- **INV-C1** Layout: `AgentMemoryLayout` composes every memory path; `SEMANTIC_MEMORY_DIR_NAME = "semantic"`; the semantic folder name is `encodeURIComponent(definitionId)` checked by `normalizePathSegment` and `resolveSafePath`.
- **INV-C3** Journal service: `ensureCurrent` writes journal files and the manifest; `notify` only when a file was written or removed (`changed`); listener errors are caught and logged. A live run gets one `ensureCurrent` per turn end or compaction (`WorkJournalRunUpdater`), so a catalog listener fires about once per turn of every live run.
- **INV-C4** Discovery: `MemoryRunDiscovery.findRuns()` returns `MemoryRun` (runKey, runId, memoryDir, names, workspace, runtimeKind, subject). For `AGENT` the subject carries `agentDefinitionId`; for team/org members the location services return `configuredPlacement.agentDefinitionId`, `startedAt` (task agents), `executionKind`, `tree` (with `createdAt`, `archivedAt`, `delegatedFrom`, team/org names) but discovery drops these. Discovery is constructed by memory search (and four tests); it is about the memory layout, not search.
- **INV-C5** Archive/delete: see Source Log. All archive/delete of roots pass `DelegatedWorkGuard.guard(run, action, perform)`, which knows the root identity and the result. `archiveStoredAgentRunGroup` (archive all runs of one agent in one workspace) calls `catalogService.archiveRun` per run without the guard.
- **INV-C9** Task of a run: `ProjectTaskService.currentTasksOfTaskWorkers([execution])` returns `{ taskId, projectId, title, status }` for an execution reference (agent run or team run), from records loaded at start (step 1 of the composition root).
- **INV-M1** Cost: full build 6.6–12.6 s on 3,986 runs (Python, cold/warm); the Node implementation is expected in the same range and runs in the background; the catch-up with stamps reads only stat results for unchanged runs.

### SR-002 additions (2026-11-17, after ARCH-REV-001)

- **INV-C9 corrected:** `currentTasksOfTaskWorkers` → `rootTaskLocationOf` answers only for a Task's current assigned root (`task-execution-resource-service.ts:242-248`) and returns the description too (`project-task-service.ts:268-269`). The run→Task source is `DelegationIndex.currentTaskOf` (`delegation-index.ts:247-251`, built in steps 1–2, `collaboration-composition.ts:105-120`); `TaskRunEntry` holds `taskId`, no title (`task-execution-resource-port.ts:62-75`); a title by id is read through `references.byId` (`project-task-service.ts:113`, `task-references.ts:23-27`).
- **INV-C10 construction:** `composeTaskSide` (steps 1–2) → `createGeneralProcessRunSupervisor` builds `AgentOrgRunService` (`general-process-run-supervisor.ts:317`) and `TeamRunHistoryService` (`:353`) → `composeCollaboration` creates `ProjectTaskService` (`collaboration-composition.ts:160`) and `AgentRunHistoryService` (`:264`). A second root, `start-standalone-application-host.ts:243-279`, runs the same steps on its own memory folder. The studio closes resources in `closeStudioProcessResources` (`build-studio-server.ts:108-121`). Background-runner modules are no-argument exports (`startup/background-runner.ts:15-21`).
- **INV-C11 attribution today:** every `agents/<id>` folder is `AGENT` (definition id null without a record), pinned by `tests/unit/memory-search/memory-run-discovery.test.ts:60`; `RUN_FOLDER` is for other unattributed folders. Five test files import `MemoryRunDiscovery`.

### SR-003 additions (2026-11-17, after CRR-002)

- **INV-C12 unreadable records vanish silently:** the location services skip roots the admission index did not admit (`team-run-execution-tree-location-service.ts:86`, `agent-org-execution-tree-location-service.ts:80`). The index keeps the reason only in memory (`root-run-package-readiness-index.ts:93-94`; it logs only a failed whole scan, `:83-89`). The reasons are readable through `TeamRunPackageCatalog.getDiagnostics()` (`team-run-package-catalog.ts:22-25`, root id → `code: reason`) and `AgentOrgRunPackageCatalog.listDiagnostics()` (`agent-org-run-package-catalog.ts:22-24`). Discovery reads metadata with `readMetadata(...).catch(() => null)` (`run-folder-discovery.ts:172`). `readMetadata` logs and returns null; `readMetadataState` returns `{ kind: "unreadable", error }` without logging (`agent-run-metadata-store.ts:96-117`). The catalog skips `agentDefinitionId === null` (`episodic-catalog.ts:181`). The journal store returns null for an absent and for an unreadable manifest alike (`work-journal-store.ts:84-96`). Evidence: API-09/EC-06, `evidence/API-04-10-run9-excerpt.md` (`"t3Lines": []`). Established by the code reviewer (`Read`) and API/E2E (`Reproduced`).

### INV-B: Option B (move the journals into the agent's folder) compared with the code

| Concern | What the code does today | Effect of moving journals |
| --- | --- | --- |
| Links inside journals | Every journal line ends with a link `[↗](../raw_traces_000001.jsonl#rt_…)` relative to the run folder (journal file renderer) | Every link breaks unless the renderer writes absolute or cross-folder paths; the hand-over notice and memory search point into `work_journal/` |
| Journal owner | `WorkJournalService` derives the run id from `basename(memoryDir)` and keeps `work_journal/` beside the raw traces it renders from; journals are derived and regenerable | A second location to keep consistent with its source; regeneration must write elsewhere |
| Delete | `deleteRun` removes the run folder (journals included); team/org delete removes the root folder | Delete must also find and remove the journal files in each member's agent folder, or leave orphans |
| Archive / restore | Archive is a mark; restore of a folder brings everything back | Restore of a run folder would not bring its journals back |
| Memory Sync | Syncs `agents/` and `agent_teams/` including journals | Journals in `episodic/` stop syncing unless Sync grows a new family |
| Memory search | Indexes journals by run folder and absolute path | Index keys and the Journals step change |
| Existing data | 3,986 runs, 9,071 journal files (13 GB memory folder) | A data migration of every run, against the founder's "no data migration" default |

Recommendation (the founder already decided A on 2026-11-17): B is not worth it; the catalog gives the same per-agent, time-ordered reading without any of these costs, and journals stay regenerable from their raw traces.

## Requirement Implications

- The run-history summary cannot be reused (INV-D3) → DEC-002/003.
- Volumes justify incremental upkeep and stamped catch-up (INV-M1).
- Archive/delete need a signal or a periodic re-read (INV-C5) → design.
- 491 is not a prerequisite (INV-C7) → DEC-010.

## Notes For Architecture Design

- Map SCN-001 … SCN-004.
- Reuse `MemoryRunDiscovery` (extend with what the records already give) rather than a second walker.
- Subscribe to `onJournalChanged`; never call `ensureCurrent`.
- Per-root reconcile after archive/delete; full reconcile only at start.
- Atomic writes; one writer per catalog.
