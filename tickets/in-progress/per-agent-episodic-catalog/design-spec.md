# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline: `requirements-doc.md` at SR-002. SR-001 approved by the Solution Designer within the founder's direction (user informed); SR-002 on the user's direction in the Solution Designer's conversation (2026-11-17: "think from the agent's perspective … remove those redundant ones"), entry decided in DEC-013, user informed
- Behavior-defining supplements: `episodic-catalog-contract.md` (SR-002): the authority for the files' exact content; the examples in this spec illustrate it, and where they differ the contract wins
- User approval of the design, when the direction requires it: `Not required`. The founder decided the direction (option A) and dispatched with "design, then build". His separate gates are delivery gates: his approval and a backup before the first build on his own node, and release only on his word.
- Design status: `Ready` (SR-002: revised for the user's slimmer entry and for ARCH-REV-001 AR-001…AR-006; the review report is `design-review-report.md`)
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/per-agent-episodic-catalog/tickets/in-progress/per-agent-episodic-catalog/investigation-notes.md`
- Authorities read (2026-11-17): `references/architecture-design.md`, `references/design-principles.md`, repository `DESIGN.md` (rules 3, 5, 7, 8, 10; Domain vocabulary → `GLOSSARY.md`; Persisted data → Data Migration Guideline, no migration here), `GLOSSARY.md` § Memory
- Project design-principle conflicts or discrepancies: none

## Current-State Read

- A run's memory, its Work Journal included, lives in the run's folder; `AgentMemoryLayout` is the only composer of memory paths (`agent-memory/store/agent-memory-layout.ts:39-128`); the semantic folder of a definition is `<memory>/semantic/<encodeURIComponent(id)>` (`:69-72`).
- `WorkJournalService` is the only reader and writer of journal files (`agent-work-journal/services/work-journal-service.ts:46-53`); after a call that wrote or removed a journal file it tells its listeners `{ runId, memoryDir, package }` (`:84-87`, `:128-136`, `:191`). The run updater calls it at each turn end/compaction of a live run (`work-journal-run-updater.ts:14-18`); memory search's Journals step calls it for old runs.
- `MemoryRunDiscovery` (`memory-search/runs/memory-run-discovery.ts:42-177`) finds every run folder of the three families and attributes it from the owners of each record (team/org location services, run metadata, the agent run-history catalog). It drops two facts the catalog needs, the definition id of team/org members and the recorded start, and it sits inside memory search, so another subsystem cannot use it without reaching into memory search's internals.
- Delete of agent, team and org runs commits in the run-history catalogs behind `AgentRunHistoryService.deleteStoredRun` (`agent-run-history-service.ts:245-247`), `TeamRunHistoryService.deleteStoredTeamRun` (`team-run-history-service.ts:117-124`) and `AgentOrgRunService`'s delete (`agent-org-run-service.ts:237`). Nothing announces it. Archive is not needed by the catalog (REQ-006).
- Construction (ARCH-REV-001 AR-002): two composition roots run agents on their own memory folder: `buildStudioServer` (`compositions/build-studio-server.ts:330-376`) and `startStandaloneApplicationHost` (`standalone-application-host/start-standalone-application-host.ts:243-279`). Each runs steps 1–2 `composeTaskSide` (Task records, `DelegationIndex`), step 3 `createGeneralProcessRunSupervisor`, which builds `AgentOrgRunService` (`general-process-run-supervisor.ts:317`) and `TeamRunHistoryService` (`:353`), then steps 4–8 `composeCollaboration`, which creates `ProjectTaskService` (`collaboration-composition.ts:160`) and `AgentRunHistoryService` (`:264`). The studio closes its process resources in `closeStudioProcessResources` (`build-studio-server.ts:108-121`, beside `shutdownMemorySearch()`).
- Task of a run (AR-003): the Task side's `DelegationIndex.currentTaskOf(run)` gives a run's current Task entry in any role (newest open, else newest; `delegation-index.ts:247-251`), from steps 1–2; an entry has `taskId` but no title (`task-execution-resource-port.ts:62-75`). A Task's title is read by id through `ProjectTaskService`'s references (`taskKeyOf` reads `references.byId(taskId)`, `project-task-service.ts:113`). `currentTasksOfTaskWorkers` is not used: it answers only for the Task's current assigned root and also returns the description (`:262-271`; `task-execution-resource-service.ts:242-248`).
- No design problem in these owners for this scope beyond the discovery placement (below).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: a new server subsystem (catalog owner, entry builder, store, renderer), a move and small extension of the run-folder discovery shared with memory search, a new read method in the journal subsystem, a layout addition, one notification call in each of three run services' delete, `ProjectTaskService.taskTitleOf`, wiring in two composition roots and two composition steps, docs and glossary; about 15 source files across seven subsystems (agent-memory, agent-work-journal, memory-search, run-history, agent-org-execution, projects, compositions/standalone-application-host) plus tests.
- Architectural risk: `High`
- Risk rationale: new persisted (derived) files beside the founder's data; a privacy boundary (REQ-004); a new background lifecycle with its own queue and file writes; an ownership move (discovery leaves memory search). No migration, API or UI change.
- Escalation trigger: any need to write inside a run folder, to render journals, to change memory search's stored model, or a measured start build over 2 minutes on the founder's clone (AC-010) returns to the Solution Designer as a Design Impact.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `agent-memory/store/agent-memory-layout.ts:36-72` | Semantic folder naming; layout owns paths | Episodic path in the layout, same encoding | None |
| Code | `agent-work-journal/services/work-journal-service.ts:84-136, 160-193` | Change listeners; manifest-only reads; only reader of journals | Subscribe; add a span read to the journal service | None |
| Code | `agent-work-journal/reading/journal-entry-reader.ts:1-60` | Header line 2 holds the file's time range (`HEADER_FIRST_DAY`) | Spans from header lines, owned by the journal subsystem | Exact regex in implementation |
| Code | `memory-search/runs/memory-run-discovery.ts` | Shared attribution rules; drops catalog facts | Move to agent-memory and extend | None |
| Code | `run-history/services/*`, `agent-org-execution/services/agent-org-run-service.ts` | Delete entry points | Notify the catalog after a successful delete | None |
| Code | `projects/services/project-task-service.ts:262-271` | Task title of a worker | "About" source | None |
| Probe | INV-M1 | Full read 6.6–12.6 s, 3,986 runs | Background build at start; no stored state | Node timing measured in AC-010 |
| Data | INV-D1, INV-D2, INV-D3 | Volumes; fields; verbatim summary | Entry fields; privacy rule | None |

## Intended Change

Add an episodic catalog per agent definition: one Markdown file listing that agent's runs on the node in time order, with only what an agent needs to choose and open its past work. A new server subsystem builds it at start from the shared run-folder discovery, follows journal changes and run deletes, and writes only under `<memory>/episodic/`.

## Change Scope (Mandatory)

- In scope: UC-001 … UC-005. Areas: new `agent-episodic-catalog/` subsystem; `AgentMemoryLayout` (episodic paths); run-folder discovery moved from `memory-search/runs/` to `agent-memory/services/` and extended; memory search adapted to the moved discovery; `WorkJournalService` span read; `ProjectTaskService.taskTitleOf`; one `runDeleted` call in each of `AgentRunHistoryService`, `TeamRunHistoryService`, `AgentOrgRunService` delete; both composition roots (`build-studio-server.ts`, `start-standalone-application-host.ts`) and the two composition steps that build the run services (`general-process-run-supervisor.ts`, `collaboration-composition.ts`); docs (`agent_memory.md`, new `agent_episodic_catalog.md`, `memory_search.md` discovery reference) and `GLOSSARY.md`.
- Derived consumers: memory search's `MemoryRun` is mapped from `DiscoveredRun`; its shape and stored rows are unchanged, so memory search's store, pipeline and GraphQL are unaffected. The tests that construct `MemoryRunDiscovery` follow the move.
- Deliberately left alone: journal rendering and its files; memory search's index, store and steps; run-history records, archive, guards; Memory Sync (does not carry `episodic/`); semantic memory and the prompt sections; the old `episodic.jsonl` library code (autobyteus-491); the Memory page.
- Follow-ups: FU-001 (consumers learn the path: prompt line or skill update), FU-002 (old runs the catalog cannot attribute to a current definition).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence | Approved Change Or Preserved Outcome | Target Production Path / Spine IDs |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001…004, REQ-009…011; AC-001…003, AC-008, AC-013 | Any catalog write | INV-C1 | Folder + catalog per definition; overview | DS-001, DS-004 |
| BEH-002 | System | REQ-005, REQ-012; AC-004, AC-009 | Journal written | INV-C3 | Entry updated ≤ 60 s | DS-001 |
| BEH-003 | Operational | REQ-006; AC-005 | Delete committed (archive: nothing) | INV-C5 | Entries removed ≤ 60 s | DS-002 |
| BEH-004 | System | REQ-007, REQ-008, REQ-010; AC-006, AC-007, AC-010 | Server start | INV-M1 | Background build, read-only | DS-003 |
| BEH-005 | Contract | REQ-004; AC-003 | Every entry | INV-D3 | Only the allowed fields | DS-004 (entry builder) |
| BEH-006 | System | REQ-009; AC-008 | Every catalog write | — | `index.md` | DS-004 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `episodic-catalog-contract.md` | Exact files, attributes and lines | REQ-001…004, REQ-009, REQ-010; AC-001, AC-003, AC-008, AC-013 | `CatalogMarkdownRenderer` renders exactly it; `CatalogEntryBuilder` produces exactly its attributes; the store follows its write rules (§1); renderer unit tests compare against its examples | Current (SR-002), behavior-defining |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `Yes` (placement only)
- Structural triggers that fire:
  - **Derived data / Capability-area reuse (11, 4):** the catalog needs the same "which runs exist and whose are they" facts memory search derives. Response: one discovery owner for both, moved to `agent-memory` (the memory-layout owner) and extended by two facts; no second walker.
  - **Authoritative boundary (3):** using `memory-search/runs/` from the catalog would bypass memory search's boundary (`MemorySearch`). Response: the move above.
  - **Capability-area reuse (4) for journal reading:** header times come from journal files, and `WorkJournalService` is their only reader. Response: a span read there, not a parser in the catalog.
  - **Backward dependency (9):** run services must tell the catalog about deletes, while the catalog reads run records. Response: a notification (Principle 9, first bullet): after a successful delete the services call `runDeleted(root)` on a narrowed `Pick<EpisodicCatalog, "runDeleted">` passed in by the composition root; the services behave the same whatever the catalog does.
  - **Several kinds or forms (1):** standalone, delegated copy, team member, task agent in a team, org member, unattributed folder; delete of three root kinds. Each traced in the discovery rules and DS-002.
  - **Hidden dependency (16):** fires once, by design. The catalog is constructed after steps 1–2 (so the run services of steps 3–8 can receive it), but Task titles come from `ProjectTaskService`, created in step 5. Response: titles are passed to `start({ taskTitles })`, the call that begins every refresh. Principle 16's conditions hold: nothing refreshes before `start` (the queue drains only after it; a `runDeleted` before it only removes in-memory entries, which do not exist yet); a missing argument is a type error and `start` throws on a second call; no cycle (the Task service does not depend on the catalog). No process-wide binding: each composition root holds the instance it created, starts and stops it. `getWorkJournalService()` is the existing process instance, passed in, not looked up inside the catalog.
  - **Vocabulary drift (15):** "episodic" today also names the retired `episodic.jsonl` items. Response: the glossary defines **Episodic catalog**; docs mark the old items as unrelated and retired (491 removes them).
  - Not firing: Empty indirection (no port or wrapper; consumers get narrowed types of real owners); Persisted-data transition (new derived files only); Legacy cleanup (no old path kept).
- Deliberate deviations: none.
- Root cause classification: `File Placement Or Responsibility Drift` (discovery lives in the wrong subsystem for a second consumer)
- Refactor needed now: `Yes` (move discovery; bounded)
- Evidence: INV-C4; importers `memory-search.ts`, `memory-index-pipeline.ts` (type), and the tests named in investigation.
- Design response: move and rename to `RunFolderDiscovery`; memory search maps its output to `MemoryRun`.
- Refactor rationale: two owners of one attribution policy would drift.
- Intentional deferrals: none.

## Terminology

- **Episodic catalog** (of an agent): the system-maintained list of an agent definition's runs on a node, in time order, pointing to their Work Journals: `<memory>/episodic/<encoded definition id>/catalog.md`. Not a copy of the journals. Added to `GLOSSARY.md` § Memory.
- **Episodic folder**: `<memory>/episodic/<encoded definition id>/`, the sibling of the semantic folder with the same name.
- **Catalog entry**: one run in a catalog.
- **Discovered run**: one run folder as the run-folder discovery attributes it (`DiscoveredRun`).
- **Root**: the run a run belongs to at the top (`RootExecutionIdentity`: agent, agent_team or agent_org), as in the Collaboration Model.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: `memory-search/runs/memory-run-discovery.ts` (moved; the old path is removed, not re-exported).
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject: new files `<memory>/episodic/index.md` and `<memory>/episodic/<encoded id>/catalog.md`; about 100 folders and 4,000 entries on the founder's node.
- Relevant change: new derived files; no existing file is read differently, none written.
- Normal reader/writer: the catalog subsystem writes; agents read.
- Required semantics: entries match records and journal files within 60 s.
- Constraints: privacy (REQ-004); write scope (REQ-008); rebuildable.
- Decision: `Discard or Rebuild` for the catalog files (rebuilt from run records, execution trees, journal files and Task records at every start; the catalog never reads its own files back); `Not Affected` for every existing file.
- Rationale: a derived view with no state of its own; nothing to migrate or keep in step.
- Supports: AC-006, AC-007, AC-009.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-002 | A live run's turn ends | The agent's catalog shows the run's new state | `EpisodicCatalog` | The founder's "kept current whenever a journal is created or changed" |
| DS-002 | Primary End-to-End | BEH-003 | The user deletes a run | The run's entries are gone | `EpisodicCatalog` | Settled delete behavior |
| DS-003 | Primary End-to-End | BEH-004 | Composition root, after steps 1–8 | All catalogs current; unchanged files not written | `EpisodicCatalog` | Build from existing runs, read-only |
| DS-004 | Bounded Local | BEH-001, BEH-005, BEH-006 | Roots queued for refresh | Affected catalogs and the overview written | `EpisodicCatalog` | The one path DS-001 and DS-003 use |

## Primary Execution Spine(s)

- DS-001: `AgentRun turn ends -> WorkJournalRunUpdater -> WorkJournalService.ensureCurrent (journal written) -> change listener -> EpisodicCatalog.onJournalChanged -> refresh queue (root of the run folder) -> DS-004 -> catalog.md`
- DS-002: `Run history UI / tool -> AgentRunHistoryService | TeamRunHistoryService | AgentOrgRunService (guard -> catalog commit removes the folder) -> EpisodicCatalog.runDeleted(root) -> drop the root's entries -> write affected catalogs and index.md`
- DS-003: `Composition root (after composeCollaboration) -> EpisodicCatalog.start({ taskTitles }) -> background start pass: RunFolderDiscovery.findRuns() (records read once) + store.listCatalogFolders() -> group runs by root and definition -> spans + titles -> entries -> render every definition found in either source -> store writes only files whose content changed -> index.md`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A journal change names a run folder; the catalog derives the folder's root and queues it; after a short quiet time the root is refreshed and the affected catalogs are rewritten | journal change, root, catalog | `EpisodicCatalog` | debounce; journal spans |
| DS-002 | After a committed delete, the run service names the root; the catalog drops that root's entries (its folder, journals included, is gone) and rewrites the affected catalogs | root, catalog | `EpisodicCatalog` | none |
| DS-003 | At start the catalog runs one full discovery (no per-root discovery at start), reads each run's journal spans once, and renders a catalog for every definition that has runs or already has an episodic folder (an agent whose runs are all gone gets a catalog listing no runs). The store compares each rendered file with the one on disk and writes only when they differ | discovered runs, existing catalog folders | `EpisodicCatalog` | store (write-if-changed) |
| DS-004 | Refresh roots: discover each root's runs, read each run's journal spans, look up the run's Task title, build entries, replace the root's entries in each affected definition, render those catalogs and the overview, write the changed files | discovered run, entry, catalog | `EpisodicCatalog` | entry builder (privacy), store, renderer |

## Spine Actors / Main-Line Nodes

`WorkJournalService` (event source), run services (event source), `EpisodicCatalog` (owner), `RunFolderDiscovery` (facts), `EpisodicCatalogStore` (files).

## Ownership Map

- `EpisodicCatalog` (new, `agent-episodic-catalog/services/episodic-catalog.ts`): governing owner. Owns the in-memory entries per definition and the root of each entry, the refresh queue and debounce, start/stop, the sequence of DS-002 and DS-004, failure containment (log, never throw to callers).
- `RunFolderDiscovery` (moved): owns which run folders exist and their attribution from records (rules below). Read-only.
- `CatalogEntryBuilder` (new): owns the entry fields and the privacy rule: an entry is built only from a `DiscoveredRun`, journal spans and a Task title.
- `EpisodicCatalogStore` (new): owns the files under `<memory>/episodic/`: lists existing catalog folders, and writes a whole file atomically only when its content differs from the file on disk.
- `CatalogMarkdownRenderer` (new): owns the Markdown shape of a catalog and of the overview.
- `WorkJournalService` (extended): owns reading the journal files' spans.
- `AgentMemoryLayout` (extended): owns the episodic paths.

## Thin Entry Facades / Public Wrappers (If Applicable)

None. SR-002 drops the startup loader of SR-001 (AR-002: a background-runner module can reach an instance only through a process lookup); each composition root starts and stops the instance it created.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| `memory-search/runs/memory-run-discovery.ts` | Moved | `agent-memory/services/run-folder-discovery.ts` | Its test moves too (`tests/unit/agent-memory/run-folder-discovery.test.ts`); the other four test files that import it update their import |
| Public `folderRun`, public `runKeyOf`, exported `nameFromFolder` in the moved file | Dead as public surface: used only inside the file (`memory-run-discovery.ts`); `memory-index-pipeline.ts:39` picks `folderRun` but never calls it (AR-006) | Private members / unexported function of `RunFolderDiscovery` | Drop `folderRun` from the pipeline's `Pick` |

## Return Or Event Spine(s) (If Applicable)

DS-001 and DS-002 are event spines into the catalog; the catalog returns nothing to the emitters.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `EpisodicCatalog`.
- Chain: `queue(root) -> timer -> take queued roots -> for each root: discovery.findRunsOfRoot(root) -> for each run: journal spans and Task title -> build entries -> replace the root's entries -> collect affected definitions -> render each affected catalog and index.md -> write the changed files`.
- Timer (AR-005): a refresh pass starts 5 s after the most recently queued request, and at most 30 s after the oldest queued request.
- One pass at a time; requests during a pass go to the next pass; a delete is applied in the same serialized order. The start pass (DS-003) runs first; journal changes and deletes during it are queued after it.
- Why it matters: merges the per-turn bursts of many live runs into few writes and keeps writes ordered.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Entry building and privacy | DS-004 | `EpisodicCatalog` | Allowed fields only | REQ-002, REQ-004 | Text or noise leaking into catalogs |
| Store (atomic files) | DS-002, DS-004 | `EpisodicCatalog` | Write files under `episodic/` | REQ-008, REQ-010 | Half-written files |
| Markdown rendering | DS-004 | Store | catalog.md, index.md | REQ-003, REQ-009 | Format mixed into logic |
| Journal spans | DS-004 | `EpisodicCatalog` | File names, sizes, time ranges | REQ-002 | Journal format parsed outside its owner |
| Task lookup | DS-003, DS-004 | `EpisodicCatalog` | `tree.currentTaskOf(execution)` → `taskTitles.taskTitleOf(taskId)` (title only) | REQ-004 | Descriptions in catalogs |

## Ownership Boundaries

- The catalog's public boundary is `EpisodicCatalog` (`start`, `runDeleted`, `stop`); nothing else writes under `<memory>/episodic/`. Its lifecycle owner is the composition root that created it.
- Discovery is reached only through `RunFolderDiscovery`; the catalog never reads run records or trees itself.
- Journal files are reached only through `WorkJournalService`; the catalog never calls `ensureCurrent` (it never renders).

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `EpisodicCatalog` | queue, entry builder, store, renderer | composition roots, run services | a run service writing catalog files | adding a method to `EpisodicCatalog` |
| `RunFolderDiscovery` | location services, metadata store, run-history catalog | `EpisodicCatalog`, memory search pipeline | catalog reading `run_metadata.json` or trees | extending `DiscoveredRun` |
| `WorkJournalService` | journal store, entry reader | `EpisodicCatalog` | catalog reading `work_journal/*.md` directly | adding a read method |

## Dependency Rules

- Allowed: `agent-episodic-catalog` → `agent-memory` (layout, discovery), `agent-work-journal` (spans, change listener), `agent-collaboration` (`Pick<DelegationIndex, "currentTaskOf">`, domain types), `projects` (`Pick<ProjectTaskService, "taskTitleOf">`, at `start`). `memory-search` → `agent-memory` (discovery). Run services → `agent-episodic-catalog` only through `Pick<EpisodicCatalog, "runDeleted">`.
- Forbidden: the catalog depending on `memory-search`; anything other than the catalog writing under `episodic/`; the catalog calling `WorkJournalService.ensureCurrent`.
- How owners get collaborators (AR-002). The same order in both composition roots that run agents, `buildStudioServer` and `startStandaloneApplicationHost` (each keeps catalogs for its own memory folder; both run agents and write journals):
  1. Steps 1–2: `const taskSide = await composeTaskSide(…)` (unchanged).
  2. **New:** `const episodicCatalog = new EpisodicCatalog({ layout: new AgentMemoryLayout(memoryDir), discovery: new RunFolderDiscovery(memoryDir), journals: getWorkJournalService(), tasks: taskSide.tree /* Pick<DelegationIndex, "currentTaskOf"> */ })`. Construction does no I/O.
  3. Step 3: `createGeneralProcessRunSupervisor({ …, episodicCatalog })`; the supervisor passes `Pick<EpisodicCatalog, "runDeleted">` to `new AgentOrgRunService({ …, episodicCatalog })` (`general-process-run-supervisor.ts:317`) and `new TeamRunHistoryService(memoryDir, { …, episodicCatalog })` (`:353`). Required parameter.
  4. Steps 4–8: `composeCollaboration({ …, episodicCatalog })` passes it to `new AgentRunHistoryService(memoryDir, { tree, workGuard, episodicCatalog })` (`collaboration-composition.ts:264`). Required parameter.
  5. **New:** right after `composeCollaboration` returns: `episodicCatalog.start({ taskTitles: collaboration.tasks })` (`Pick<ProjectTaskService, "taskTitleOf">`). `start` subscribes to journal changes and launches the start pass in the background; it returns at once.
  6. Shutdown: the studio passes the instance to `closeStudioProcessResources`, which awaits `episodicCatalog.stop()` beside `shutdownMemorySearch()`; the application host stops it in its own close path the same way.
- No process-wide binding, registry or loader is added. The one after-construction collaborator (`taskTitles` at `start`) is recorded under Hidden dependency above. The node id of SR-001 is gone (SR-002 removed it from the catalog).

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `EpisodicCatalog.start(input: { taskTitles: Pick<ProjectTaskService, "taskTitleOf"> }): void` | catalogs | subscribe to journal changes; launch the start pass | — | throws on a second call |
| `ProjectTaskService.taskTitleOf(taskId): Promise<string \| null>` | a Task's title | the title of a Project Task by its long id; null for a Task with no Project or one that cannot be read (logged) | Task long id | new, beside `taskKeyOf`; never returns the description |
| `EpisodicCatalogStore.listCatalogFolders(): Promise<string[]>`, `writeIfChanged(path, text): Promise<boolean>` | files | existing catalog folder names; compare-then-atomic-write | folder name / path under `episodic/` | internal to the subsystem |
| `EpisodicCatalog.runDeleted(root: RootExecutionIdentity): void` | a root's entries | drop them and rewrite affected catalogs, after a committed delete | `{ rootSubjectKind, rootRunId }` | never throws |
| `EpisodicCatalog.stop(): Promise<void>` | lifecycle | unsubscribe, finish the running pass | — | |
| `RunFolderDiscovery.findRuns(): Promise<DiscoveredRun[]>` | run folders | all, attributed | — | moved and extended |
| `RunFolderDiscovery.findRunsOfRoot(root): Promise<DiscoveredRun[]>` | one root's run folders | for a refresh | `RootExecutionIdentity` | new |
| `RunFolderDiscovery.rootOf(memoryDir): RootExecutionIdentity \| null` | a run folder's root | from the folder's family and first segment | absolute path | new; null outside the three families |
| `WorkJournalService.readJournalSpans(memoryDir): Promise<WorkJournalFileSpan[] \| null>` | a run's journal files | per manifest file: name, absolute path, size, first and last time from its header (reads at most the first 1 KB of the file) | run folder | new; null without a journal |
| `AgentMemoryLayout.getAgentEpisodicDirPath(definitionId)`, `getEpisodicRootDirPath()` | paths | same encoding as the semantic folder (shared private helper) | definition id | new |

No new interface, port or adapter type: consumers get narrowed types of the real owners.

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `runDeleted` | Yes | Yes | Low | — |
| `findRunsOfRoot` | Yes | Yes | Low | — |
| `rootOf` | Yes | Yes | Low | — |
| `readJournalSpans` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Proposed Name | Natural? | Same Meaning Everywhere? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Catalog owner | `EpisodicCatalog` | Yes | Yes (glossary entry) | old `episodic.jsonl` items | glossary + docs mark them retired (491) |
| Discovery | `RunFolderDiscovery` / `DiscoveredRun` | Yes | Yes | `MemoryRun` stays memory search's | — |
| Journal span | `WorkJournalFileSpan` | Yes | Yes | — | — |
| Folder | `episodic` | Yes | Yes | — | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Find and attribute runs | `MemoryRunDiscovery` | Extend (move) | Same rules | — |
| Journal change events | `WorkJournalService.onJournalChanged` | Reuse | Exact trigger | — |
| Journal header times | `journal-entry-reader.ts` header parsing | Extend | Journal format owner | — |
| Paths | `AgentMemoryLayout` | Extend | Path owner | — |
| Atomic file write | temp file + rename, as `run-history/store/atomic-json-file-writer.ts` does | Reuse the approach for Markdown | — | — |
| Task of a run | `DelegationIndex.currentTaskOf` (run → Task id, any role) + `ProjectTaskService` (title by id) | Reuse / Extend (`taskTitleOf`) | The Task records' run entries are the owner REQ-004 names (AR-003) | — |
| Catalog upkeep | memory search pipeline | Create New | Different output, lifecycle and files | The pipeline only updates live after the user's first index build; the catalog must not depend on that |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-episodic-catalog/` | catalog upkeep, entries, files | all | — | Create New | sibling of `agent-work-journal/`, `memory-search/` |
| `agent-memory/` | layout paths; run-folder discovery | DS-003, DS-004 | catalog, memory search | Extend | |
| `agent-work-journal/` | spans | DS-004 | catalog | Extend | |
| `memory-search/` | consumes discovery | — | — | Modify | maps to `MemoryRun` |
| `run-history/`, `agent-org-execution/` | notify on delete | DS-002 | catalog | Modify | one call after success |
| `compositions/`, `startup/` | wiring, start | DS-003 | catalog | Modify/Add | |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (the draft needed no extraction beyond `DiscoveredRun`).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Run attribution facts | `agent-memory/domain/discovered-run.ts` | agent-memory | Both consumers read the same facts | Yes | Yes (`MemoryRun` is mapped, not extended) | a bag of optional fields for every consumer |
| Definition-folder encoding | private helper in `agent-memory-layout.ts` | agent-memory | semantic and episodic names must match | Yes | Yes | public API |

## Shared Structure / Data Model Tightness Check

`DiscoveredRun` = the facts discovery produces today for `MemoryRun` (runKey, runId, memoryDir, agentName, teamName, memberName, orgName, workspace, runtimeKind, subject) plus:

```ts
root: RootExecutionIdentity;            // from the folder's family and first segment; every discovered folder has one
agentDefinitionId: string | null;       // as recorded; null when no record names it
recordedStartAt: string | null;         // the start the run's records hold (used only when the run has no journal yet)
```

One rule for "uncatalogued" (AR-004): `agentDefinitionId === null`. Discovery's classification for memory search (`subject.kind`) is unchanged; the catalog never reads it.

`CatalogEntry` (in memory only; rendered to Markdown):

```ts
type CatalogEntry = Readonly<{
  runId: string; root: RootExecutionIdentity;
  startedAt: string | null;        // first journal file's start time, else recordedStartAt; null renders "start unknown" (contract §2.2)
  lastActivityAt: string | null;   // last journal file's end time
  taskTitle: string | null;
  workspace: string | null;
  journal: { folder: string; files: ReadonlyArray<{ name: string; from: string | null; to: string | null; sizeBytes: number }> } | null;
}>;
```

| Shared Structure | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlap Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `DiscoveredRun` | Yes | Yes | Low | Memory search maps it to `MemoryRun` by dropping the three new fields; the mapping reproduces today's `MemoryRun` exactly (pinned by the moved discovery test, including `agents/<id>` with no record → `AGENT`, `agentDefinitionId: null`) |
| `CatalogEntry` | Yes | Yes (DEC-013) | Low | — |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/agent-episodic-catalog/services/episodic-catalog.ts` | catalog | `EpisodicCatalog` | lifecycle, queue, DS-002, DS-004 | one owner | `DiscoveredRun` |
| `src/agent-episodic-catalog/services/catalog-entry-builder.ts` | catalog | builder | entry fields, privacy | one rule set | `DiscoveredRun`, `WorkJournalFileSpan` |
| `src/agent-episodic-catalog/store/episodic-catalog-store.ts` | catalog | store | files under `episodic/` | one persistence concern | layout |
| `src/agent-episodic-catalog/rendering/catalog-markdown-renderer.ts` | catalog | renderer | catalog.md, index.md | one format | entries |
| `src/agent-episodic-catalog/domain/episodic-catalog-models.ts` | catalog | types | `CatalogEntry` | types | — |
| `src/agent-memory/services/run-folder-discovery.ts` | agent-memory | discovery | moved + `findRunsOfRoot`, `rootOf`, the three facts | one owner | `DiscoveredRun` |
| `src/agent-memory/domain/discovered-run.ts` | agent-memory | type | `DiscoveredRun` | type | — |
| `src/agent-memory/store/agent-memory-layout.ts` | agent-memory | layout | + episodic paths | existing owner | — |
| `src/agent-work-journal/services/work-journal-service.ts` (+ `reading/journal-entry-reader.ts` header times, `domain/work-journal-models.ts` type) | journal | journal service | `readJournalSpans` | existing owner | — |
| `src/memory-search/memory-search.ts`, `pipeline/memory-index-pipeline.ts`, new `runs/memory-run-mapping.ts` | memory search | — | use moved discovery; map to `MemoryRun` | small mapper | `DiscoveredRun` |
| `src/run-history/services/agent-run-history-service.ts`, `team-run-history-service.ts`, `src/agent-org-execution/services/agent-org-run-service.ts` | run history | services | one `runDeleted` call after a successful delete (required constructor collaborator) | existing owners | — |
| `src/projects/services/project-task-service.ts` | projects | `ProjectTaskService` | + `taskTitleOf(taskId)` | existing owner | — |
| `src/agent-execution/runtime/general-process-run-supervisor.ts`, `src/compositions/collaboration-composition.ts` | composition steps | step 3, steps 4–8 | take `episodicCatalog` and pass it to the run services they build | existing steps | — |
| `src/compositions/build-studio-server.ts`, `src/standalone-application-host/start-standalone-application-host.ts` | composition roots | roots | create the catalog after steps 1–2, start it after `composeCollaboration`, stop it at close | the two roots that run agents | — |

## Applied Patterns (If Any)

- Worker loop (debounced queue) inside `EpisodicCatalog` (bounded local spine above).

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-episodic-catalog/` | Folder | `EpisodicCatalog` | the subsystem | sibling of the journal and search subsystems | discovery or journal parsing |
| `…/services/`, `…/store/`, `…/rendering/`, `…/domain/` | Folders | — | as `agent-work-journal/` does | existing layout | — |
| `autobyteus-server-ts/tests/unit/agent-episodic-catalog/*` | Folder | — | unit tests | — | — |
| `autobyteus-server-ts/tests/e2e/memory/episodic-catalog.e2e.test.ts` | File | — | API/E2E over a real server and memory folder (owned by API/E2E) | beside `memory-search-graphql.e2e.test.ts` | — |
| `autobyteus-server-ts/docs/modules/agent_episodic_catalog.md` | File | docs | format, rules, privacy, path rule | module docs | — |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification |
| --- | --- | --- | --- | --- |
| `agent-episodic-catalog/` | Main-Line Domain-Control + its persistence | Yes | Low | matches `agent-work-journal/` |
| `agent-memory/services/run-folder-discovery.ts` | Off-Spine Concern (facts) | Yes | Low | memory layout owner |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

**Files on a node**

```
<memory>/episodic/
  index.md
  project-task-manager/catalog.md
  team-local-agent%3Asoftware-engineering-team%3Asolution-designer/catalog.md
<memory>/semantic/team-local-agent%3Asoftware-engineering-team%3Asolution-designer/   (same name)
```

**catalog.md** (oldest first; full run ids and absolute paths; no conversation text)

```md
# Episodic catalog: solution_designer
597 runs, oldest first.
Maintained by the system: do not edit. Each run's Work Journal stays in its run folder; this catalog only points to it and quotes no conversation.

## 2026-11-17 15:36 → 2026-11-18 09:10 UTC · solution_designer_703182187282472484b90793eac8be40
- About: A per-agent episodic index: a system-maintained timeline of all runs …
- Workspace: /Users/normy/autobyteus_org/autobyteus-workspace-superrepo
- Journal: /Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_a7e92f8ba01f4a1aa0c3b88a5d633d16/solution_designer_703182187282472484b90793eac8be40/work_journal/
  - work_journal_000001.md · 2026-11-17 15:36 – 2026-11-18 02:10 · 1.5 MB
  - work_journal_active.md · 2026-11-18 02:10 – 09:10 · 120 KB

## 2026-11-18 10:02 → 2026-11-18 10:40 UTC · solution_designer_9b1c…
- Workspace: /Users/normy/autobyteus_org/autobyteus-workspace-superrepo
- Journal: no journal yet (run folder /Users/normy/.autobyteus/server-data/memory/agent_teams/…/solution_designer_9b1c…/)
```

A run without a Task has no "About" line. Nothing else appears in an entry (AC-013). The header's agent name is the newest run's `agentName` exactly as discovery reports it (contract §2.3, the authority). No "updated" time: an unchanged catalog renders byte-identically, so the store does not rewrite it (REQ-010).

**index.md**

```md
# Episodic catalogs on this node
One folder per agent; each holds catalog.md.
- Project Task Manager · project-task-manager/ · 3 runs · last activity 2026-11-17 16:00 UTC
- solution_designer · team-local-agent%3Asoftware-engineering-team%3Asolution-designer/ · 597 runs · last activity 2026-11-18 09:10 UTC
```

**Discovery attribution rules** (one owner; the catalog never re-derives them)

| Folder | Root | Definition id | Recorded start |
| --- | --- | --- | --- |
| `agents/<id>` (every folder with raw traces; memory search: `AGENT`, as today) | agent `<id>` | metadata, else history row, else null | `metadata.startedAt`, else `row.createdAt`, else null |
| `agent_teams/<team>/…/<member>` located by the team location service | team `<team>` | `configuredPlacement.agentDefinitionId` | task agent `startedAt`, else `tree.createdAt` |
| `agent_orgs/<org>/…/<member>` located by the org location service | org `<org>` | `configuredPlacement.agentDefinitionId` | as team |
| any other folder with raw traces under `agent_teams/`, `agent_orgs/` or `agents/<host>/collaboration/` (memory search: `RUN_FOLDER`, as today) | `rootOf(folder)`: the family and first segment | null | null |

Uncatalogued = `agentDefinitionId` null (one rule).

**Task title (AR-003):** `tree.currentTaskOf(execution)`, where execution is `{ agentRunId: root.rootRunId }` for an agent root and `{ teamRunId: root.rootRunId }` for a team root (org roots are not Task executions: no title); then `taskTitles.taskTitleOf(entry.taskId)`. Any role counts (assigned, sub-work, brought in). All runs of a root share it; titles are looked up once per Task id per pass.

**Avoided shapes**

| Topic | Good | Bad / Avoided | Why |
| --- | --- | --- | --- |
| About | the Task title from Task records | the run-history `summary` (the user's first message) or an LLM summary | REQ-004 |
| Entry facts | time, run id, Task title, workspace, journal files | delegation, node, team/role, runtime, state, Task key | DEC-013: the agent does not need them to choose and open its work |
| Delete | drop the root's entries | wait for the next start | REQ-006 (≤ 60 s) |
| Journal times | `WorkJournalService.readJournalSpans` | catalog parsing `work_journal_*.md` | journal format has one owner |
| Discovery | one `RunFolderDiscovery` | a second walker in the catalog | attribution drift |
| State between starts | none: rebuild at start | a JSON copy or hash store to skip unchanged runs | a second state to keep in step; the start build is background and measured (AC-010) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Re-export `MemoryRunDiscovery` from its old path | fewer import changes | Rejected | importers updated |
| Map `team-local:` ids to `team-local-agent:` | join old runs | Rejected (DESIGN.md rule 10; DEC-006) | recorded ids used as they are; FU-002 |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Layout: episodic paths with the shared encoding helper (+ unit test: same name as semantic).
2. Move discovery to `agent-memory/services/run-folder-discovery.ts`, add `DiscoveredRun`, `findRunsOfRoot`, `rootOf`; memory search maps to `MemoryRun`; move and extend its test; memory search tests stay green.
3. Journal spans: header time parse in `journal-entry-reader.ts`, `readJournalSpans` in the service (+ tests).
4. Catalog subsystem: models, entry builder (privacy test, AC-013 field test), renderer, store, `EpisodicCatalog` (queue, start, refresh, delete, stop) with unit tests.
5. Wiring: `ProjectTaskService.taskTitleOf`; the construction order of both composition roots (Dependency Rules); `runDeleted` calls in the three run services (+ unit tests: a successful delete calls it once; a refused one does not); stop at close.
6. Docs and glossary.
7. Real-app proof on an isolated instance (TESTING.md), including the copy-on-write clone of the founder's memory for AC-010 (read-only source; `cp -c` on APFS).

## Key Tradeoffs

- A full rebuild at every start instead of stored state: no second state to keep in step; costs one background pass (6.6–12.6 s measured in Python on the founder's data).
- Refresh a whole root on every journal change instead of patching one entry: a team root re-reads its members' manifests and journal headers (a few small reads) per refresh; simpler and always derived from records.
- Catalog files are rewritten whole; the largest (about 600 entries) at most once per 5–30 s.

## Risks

- Start build time in Node (AC-010; escalation at 2 minutes).
- The Task title is the root's current Task; a root that worked on several Tasks shows the current one (the journals hold the history).

## Guidance For Implementation

- Reproduction to start from: `None` (new behavior).
- Never call `ensureCurrent` from the catalog; never write outside `layout.getEpisodicRootDirPath()`.
- Errors in a refresh are logged with the root and the run (`EPISODIC_CATALOG_REFRESH_FAILED`), never thrown to the journal service or run services; one unreadable run is left out (DESIGN.md rule 7).
- Debounce values (5 s quiet, 30 s max) are constructor options so tests can use small ones.
- Release is only on the founder's word; the first start on his node needs his approval and a backup (delivery).
