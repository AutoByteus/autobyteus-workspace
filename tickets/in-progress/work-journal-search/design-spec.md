# Design Spec: Memory Search Over Work Journals

## Solution And Approval Basis

- **Current solution revision:** SR-003 (design round 3: architecture review ARCH-REV-001 findings AR-001 to AR-003 corrected; § Review Corrections).
- **Approved requirements:** `requirements-doc.md` SR-001, approved by the user 2026-10-26 ("do you think we're ready for the design? … If you were ready for the design, please"); refinement UD-016 approved in conversation the same day.
- **Behavior-defining supplement:** the approved Memory page UI/UX specification, `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/work-journal-search/ui-ux-spec.md`, with normative screenshots VIS-001 to VIS-024 in `visual-references/`. Approved by the user 2026-10-26 ("Oh, I think that the UI is correct now. I feel it's good."). Design repository `personal` @ `d01192275c`. Integrated in § Product Design Integration (SR-002).
- **Design status:** `Ready`. Approved by the user 2026-10-26 ("Yes … show me your data flow spine"). The Product design is integrated (SR-002); the complete package goes to architecture review.
- **Investigation notes:** `investigation-notes.md`. Architecture rows AE-01 to AE-19 are cited below as (AE-nn).
- **Evaluation report:** `memory-search-evaluation-report.md`, cited as (report § n).
- **Authorities read (design reading gate, 2026-10-26):**
  - skill: `references/architecture-design.md`, `references/design-principles.md` (Principles 1–15, full), `references/design-examples.md` (cases from our own reviews), `templates/design-spec-template.md`;
  - project: `DESIGN.md`, `GLOSSARY.md`, `docs/design-cases.md`, `autobyteus-server-ts/docs/design/collaboration_model.md` § 3, `autobyteus-server-ts/docs/design/startup_initialization_and_lazy_services.md`, the Data Migration Guideline (no migration is needed; § Persisted Data);
  - module docs: `docs/modules/agent_work_journal.md`, `docs/modules/agent_memory.md`.
- **Project-principle conflicts or discrepancies:** none.

## Current-State Read

- **Journals:**
  - `WorkJournalService.ensureCurrent` is the only writer of `work_journal/` (AE-03).
  - Live runs are kept current after each turn by `WorkJournalRunUpdater` (AE-04).
  - Old runs have no journal until something asks; on 2026-10-21, 90 of 3,654 runs had one (report § 3).
  - The service target requires a runtime (AE-01), although the renderer already supports "no runtime named" (AE-02).
- **Memory layout:**
  - `AgentMemoryLayout` owns the family roots `agents/`, `agent_teams/`, `agent_orgs/` and agent-root collaboration folders (AE-13). The collaboration model states every run's own folder and memory (AE-17).
  - The Memory page's explorers list only runs they can attribute; 370 task-team member folders and 9 old-format folders are not listed (investigation notes § layout check).
  - Team and org location services give each member's address, run ID, group path, `memoryDir` and recorded launch configuration (AE-12).
- **Embeddings:**
  - `EmbeddingIndex` owns models, collections, fingerprints and background embedding (AE-05, AE-07).
  - Its only query applies the per-model relevance rule (AE-06), which memory search cannot use as a cut.
- **Agent tools:** node-local tools follow a manifest wrapped as native tools and MCP adapters (AE-08); both entry forms know the asking run (AE-09).
- **Memory page API:** split by subject (AE-10). It still carries the old per-run episodic/semantic fields (AE-10, AE-11).
- **Constraints:**
  - no index file inside the memory folder, because Memory Sync copies it (AE-18);
  - background work only after startup step 9 (AE-15);
  - only the journal service reads raw traces, because the raw reader can truncate a broken tail (AE-19).
- **No structural problem blocks the feature.** The existing owners absorb it with small, explicit boundary additions (§ Task Design Health).

## Task Size And Architectural Risk (Mandatory)

- **Task size: `Large`.**
  - A new subsystem (`memory-search`: discovery, indexing pipeline, store, search).
  - A new agent tool family (native and MCP).
  - New GraphQL types.
  - Boundary additions in two existing subsystems (journal service, embedding index).
  - Removal of the old per-run episodic/semantic API path.
  - A new Memory page experience (Product design).
  - About 30 server files and 10–15 web files.
- **Architectural risk: `High`.**
  - New persisted store (`memory-search.sqlite`).
  - Changed shared contracts: `EmbeddingIndex` (new query), `WorkJournalTarget` (nullable runtime), a journal change notification, `WorkJournalService` read API.
  - A new agent-facing contract (`search_memory`).
  - Background concurrency: the pipeline, live updates and searches at the same time.
  - A first build that writes derived journals into about 3,600 run folders.
  - A privacy surface: snippets from all runs.
- **Escalation trigger:** any need to read raw traces outside the journal service; a new data migration; a change to the memory layout; a need for per-workspace access control.

## Architecture Investigation Evidence

| Source | Path / Reference | Observation | Design decision supported | Remaining uncertainty |
| --- | --- | --- | --- | --- |
| Code | AE-01, AE-02 | Runtime required by the service, optional in the renderer | `WorkJournalTarget.runtimeKind: RuntimeKind \| null` | — |
| Code | AE-03, AE-04 | One writer; per-turn updater | Journals step calls `ensureCurrent`; live changes via notification (DS-003) | — |
| Code | AE-05, AE-06, AE-07 | Search re-syncs items; relevance cut | Pipeline owns `sync`; new `EmbeddingIndex.nearest` | — |
| Code | AE-08, AE-09 | Tool manifest pattern; asking run known on both paths | `agent-tools/memory/` family | — |
| Code | AE-10, AE-11 | Subject-split memory views; old episodic/semantic readers | Work Journal read per subject; remove the old readers | — |
| Code | AE-12, AE-13 | Located executions with launch configuration; layout roots | `MemoryRunDiscovery` reuses them | Agent-root collaboration members: 6 host folders; treated by folder walk (DS-001) |
| Probe | AE-20, AE-21 | Task-team roots (101) are never admitted as root packages; they are linked from their coordinating run's tree | New `TaskTeamRootMemorySource` (linked task teams, own tree) used by the Teams explorer (UD-008) and by discovery | — |
| Probe | AE-16 | Contentless FTS5 with delete | No copy of journal text | Node version in Docker and Android builds is the same major (22) as the embedding layer requires |
| Doc | AE-15, AE-17, AE-18 | Startup order; run storage; Memory Sync | Pipeline starts after step 9; index under `<appData>/memory-search/` | — |
| Measurements | report § 5, § 6, § 8 | Chunk 2,000 characters; text + cards; interleave; `rg` baseline | DEC-002; `search_memory` needs an index | n = 31; R-016 grows the set |

## Intended Change

Add memory search over this node's Work Journals:
- An **indexing pipeline** (Find runs → Journals → Text index → Meaning index) that the user starts and watches on the Memory page, and that keeps itself current afterwards.
- A **search** that reads the indexes and returns time-aware pointers to journal lines.
- The **agent tool** `search_memory(query, limit?)`.
- **Server API** for the Memory page: search, index status and actions, Work Journal reading.
- **Removal** of the outdated per-run episodic/semantic API path and tabs.
- **Glossary entries** for the memory words.

## Change Scope (Mandatory)

- **In scope:** UC-001 to UC-008. Areas:
  - new `autobyteus-server-ts/src/memory-search/`;
  - `agent-work-journal` (nullable runtime in the target, change notification, entry reader, journal read);
  - `embeddings` (`nearest`);
  - new `agent-tools/memory/` and its MCP provider and loader entry;
  - new GraphQL types and a modified `memory-view.ts`;
  - server settings (one setting);
  - `agent-memory`:
    - removal of the old episodic/semantic readers;
    - task teams in the Teams explorer (UD-008, AE-20, AE-21).
  - `autobyteus-web` Memory page (per the Product spec);
  - `GLOSSARY.md`;
  - module docs;
  - an evaluation command.
- **Derived consumers (Principle 11):**

  | Changed structure | Derived consumers | Decision |
  | --- | --- | --- |
  | `WorkJournalTarget.runtimeKind` nullable | `WorkJournalRunUpdater` (always passes the live run's runtime); the journal manifest's `runtime_kind` (stored); the manifest reader in `work-journal-store.ts`; reuse comparison in `work-journal-service.ts` (`previous.runtime_kind === target.runtimeKind`) | Manifest stores JSON `null` for "not recorded"; the reader accepts `null`; the reuse comparison compares `null` to `null` as equal (same rules); updater unchanged |
  | New journal change notification | Memory index pipeline (only subscriber) | Notification only; no return value consumed |
  | `EmbeddingIndex` gains `nearest` | Project Task search (unchanged, still `search`); embedding tests; `docs/modules` embedding doc | Additive method; no change to `search` |
  | `AgentMemoryView` loses `episodic` / `semantic`; `MemoryAvailabilitySummary` loses `hasEpisodic` / `hasSemantic` | `memory-view.ts` (args `includeEpisodic` / `includeSemantic`); `memory-explorer-schema.ts`; `memory-run-summary-builder.ts` (availability and `hasMemoryAvailability`); web `memoryViewQueries.ts`, `memoryExplorerQueries.ts`, `types/memory.ts`, `memoryInspectorStore.ts`, `memoryExplorerStore.ts`, `MemoryInspector.vue`, `MemoryBadges.vue`, `EpisodicTab.vue`, `SemanticTab.vue`; `generated/graphql.ts` | All updated or removed together (clean cut). `hasMemoryAvailability` keeps working-context and raw-trace availability. The Imported Memory adapter uses the same explorer services, so it is covered. |
  | New `memory-search.sqlite` | Pipeline, search service | New; rebuildable |
| `AgentMemoryView.workingContext` and the option `includeWorkingContext` (Working Context tab removed, UD-017) | `memory-view.ts` (arg and field), `memory-view-converter.ts`, `agent-memory-service.ts` (option), `run-history/projection/providers/local-memory-run-view-projection-provider.ts:40-45` (passes `includeWorkingContext: false`, `includeEpisodic: false`, `includeSemantic: false`); web `memoryViewQueries.ts`, `memoryInspectorStore.ts`, `MemoryInspector.vue`, `WorkingContextTab.vue` | Removed together. Run history keeps reading raw traces only; its call drops the removed options. The working-context snapshot file itself is untouched (the runtime uses it). |
| `MemoryAvailabilitySummary`: `hasWorkingContext`, `hasEpisodic`, `hasSemantic` removed; `hasWorkJournal` added | `memory-run-summary-builder.ts` (`build`, `mergeMemoryAvailability`, `hasMemoryAvailability`), `memory-explorer-schema.ts`, the three explorer services, the imported-memory adapter; web `MemoryBadges.vue` (exceptions only: No Work Journal / No Raw traces / Archive), `types/memory.ts`, `memoryExplorerQueries.ts` | `hasMemoryAvailability` (which runs are listed) = raw traces, raw archive, Work Journal, or a working-context snapshot. The snapshot is still checked internally, so no run disappears from the lists, but it is no longer exposed. |
| Team list entries gain `isTaskTeam`, `startedByAgentName` (definition and run level) | `team-memory-explorer-service.ts`, `collaboration-root-memory-catalog.ts`, `memory-explorer-schema.ts`; web Browse cards | <ul><li>Run level: from `TaskTeamRootMemorySource` (the task team's `taskAgent` delegator, named as recorded).</li><li>Definition level: `isTaskTeam` when at least one listed run of that definition is a task team; `startedByAgentName` only when all its task runs share one delegator.</li></ul> |

- **Deliberately left alone:**
  - raw traces and the raw reader (AE-19);
  - the run updater's sequence;
  - Project Task search;
  - the Embedding settings page (the model stays chosen there);
  - Memory Sync and imports;
  - the memory layout and run storage;
  - the per-run episodic/semantic code inside `autobyteus-ts` (FU-003; nothing in the server reads it after this change);
  - the 5 old `episodic.jsonl` / `semantic.jsonl` files (user data).
- **Follow-ups:** FU-001 (token-limit setting), FU-002 (reranker), FU-003 (narrowed to `autobyteus-ts` library code), FU-005 (summaries).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind | Requirement / AC | Trigger | Existing evidence | Change / preserved | Target path, spines |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | R-005, R-006; AC-009 | Turn end or compaction | AE-04 | Preserved; plus a notification after a changed journal | Updater → `ensureCurrent` → notification → pipeline live update (DS-003) |
| BEH-002 | Operational | R-005, R-013; AC-008 | User clicks "Index now" | AE-03, report § 3 | Every run's journal made current, then indexed | DS-001 |
| BEH-003 | User | R-013, R-014; AC-011 | Memory page | AE-10, AE-11 | Search, Work Journal view, index panel; old tabs removed; task teams listed | DS-002, DS-004, DS-005 |
| BEH-004 | Contract | — | `search_project_tasks` | AE-05, AE-08 | Preserved | — |
| BEH-005 | User / agent | R-001 to R-004, R-007 to R-012; AC-001 to AC-007, AC-010, AC-012, AC-013 | Agent calls `search_memory`; user searches on the page | — | New | DS-002 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `memory-search-evaluation-report.md` | Measured evidence | AC-001 to AC-008 | Basis of DEC-002 and the pipeline steps | Evidence |
| `product-design-request.md` | Product brief | R-013, R-014; AC-011 | The request | Done |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/work-journal-search/ui-ux-spec.md` (+ `visual-references/`, `design-review-notes.md`) | Approved Memory page UI/UX | R-002, R-009, R-013, R-014; AC-008, AC-011; UD-017 | Behavior-defining supplement; the web part implements it | Approved by the user 2026-10-26 |
| `probes/` | Reproducible scripts, public question categories | R-016 | The evaluation command's starting point | Evidence |

## Task Design Health Assessment (Mandatory)

- **Change posture:** `Feature` (with a cleanup of the outdated per-run episodic/semantic path in touched modules).
- **Current design issue found:** `No` for the feature path; `Yes`, small, for vocabulary (Principle 15). "Episodic/Semantic" names the old per-run files in the API and UI (AE-10, AE-11) while the product's direction gives these words a global meaning.
- **Structural triggers:**

  | Trigger | Fires? | Evidence and response |
  | --- | --- | --- |
  | Several kinds or forms (Principle 1) | **Yes** | Run kinds: standalone, task agent, team member, task-team member, org member, agent-root collaboration member, folder without record. Entry forms: native tool, MCP tool, Memory page. → DS-001 has a row per kind (§ Run Kinds); DS-002 traces all three entry forms with the same rules. |
  | Capability-area reuse (Principle 4) | **Yes** | Journals (journal service), embeddings (`EmbeddingIndex`), run attribution (location services, metadata stores), settings (server settings service), tools (manifest pattern). → All reused (§ Reuse Check). |
  | Derived data (Principle 11) | **Yes** | Changed structures in § Change Scope. → Consumer table. |
  | Persisted-data transition (Principle 5) | **Yes** | New derived store; manifests with null runtime. → § Persisted Data. |
  | Vocabulary drift (Principle 15) | **Yes** | Episodic/semantic. → Removal plus `GLOSSARY.md`. |
  | Split sequence (Principles 2, 13) | **Checked** | Journal changes reach the index by notification (DS-003), not by a function passed into the updater or the service; the pipeline owns its sequence. |
  | Behavior by absence (Principle 13) | **Checked** | "Not recorded" runtime is an explicit `null` with its own rule (AE-02); "weak matches" is an explicit result; runs without records are an explicit kind. |
  | Ambiguous boundary (Principle 10) | **Checked** | Results carry an explicit subject; the Work Journal read is split by subject (AE-10). |
  | Empty indirection (Principle 13) | **Checked** | The `MemorySearch` facade owns the public sequence choice (search vs indexing commands) and settings resolution; it is not a pass-through (§ Thin Entry Facades). |

- **Root cause classification:** `No Design Issue Found` for the feature; the vocabulary item is handled as in-scope cleanup.
- **Refactor needed now:** `No` beyond the explicit boundary additions and the cleanup.
- **Evidence:** AE-01 to AE-19.
- **Design response:** extend the existing owners minimally; add one subsystem with one public boundary.
- **Deferrals:** FU-003 (library code in `autobyteus-ts`). Residual risk: none for behavior, because nothing in the server reads that code after this change.

## Terminology

`GLOSSARY.md` gains a **Memory** section in this change (Principle 15). Its entries:

| Word | Meaning | Must not mean |
| --- | --- | --- |
| **Memory** (of a run) | What a run keeps in its own folder: raw traces, snapshots, file changes, context files, its Work Journal (collaboration model § 3) | A global knowledge base |
| **Work Journal** | A run's readable Markdown record, rendered from its raw traces by the journal service; one file per raw-trace segment | — |
| **Memory search** | Finding past work in the memory of every run on this node, today through their Work Journals; the tool `search_memory` and the Memory page search | Answering from memory; searching other nodes |
| **Memory index** | The derived index memory search reads: the text index and the meaning index, built by the indexing pipeline from Work Journals | A copy of journals |
| **Indexing pipeline** | The ordered steps that build and update the memory index: Find runs, Journals, Text index, Meaning index | A general workflow engine |
| **Journal chunk** | A part of one journal file: whole entries of at most 2,000 characters (a longer entry split by lines), with its file, line range and day | — |
| **Journal card** | The short text that represents one journal file in the meaning index (agent, first requests, first reply openings, distinct actions), with the line ranges of its parts | A summary written by a model |
| **Words / Meaning** (match labels on the page) | A match found by the text index (Words) or by the meaning index (Meaning) | Two other tiers |
| **Memory run** | One run folder known to the memory index, with its recorded names and runtime | A live run |

"Episodic" and "semantic" are not defined: no UI, tool, API or document keeps them for the old per-run files after this change. The approved memory framing (episodic = journals, semantic = facts) is product direction in `autobyteus-233`, which will add glossary words when it builds them.

## Legacy Removal Policy (Mandatory)

- **Obsolete in scope:** the per-run episodic/semantic read path in the server API and the Memory page (AE-10, AE-11).
- **Compatibility wrappers, dual paths or fallbacks kept:** `None`.

## Persisted Data / State Transition Decision (Mandatory)

| Subject | Location, shape, volume | Change | Decision | Rationale |
| --- | --- | --- | --- | --- |
| Memory index store | New `<appData>/memory-search/memory-search.sqlite`: runs, journal files, chunk locations, contentless FTS5, cards, pipeline state. About 100–300 MB for 1.1 M chunk rows (no text) | New | **Discard or Rebuild** | Derived from journals; "Rebuild" drops and rebuilds it; a store that cannot be opened or read is deleted and rebuilt, and the page shows "Needs indexing" |
| Meaning vectors | Existing `embeddings.sqlite`, new collection `memory-journal-cards`, about 7,400 rows | New collection | **Discard or Rebuild** | Owned by `EmbeddingIndex`; re-embedded on model switch (AE-07) |
| Work Journals of old runs | `work_journal/` in about 3,600 run folders, about 1.7 GB | Generated (derived) | **Directly Usable — No Migration** | Generated by the existing service; deletable and regenerated from raw traces (module doc). No migration: nothing existing is transformed. |
| Journal manifest `runtime_kind` | `work_journal_manifest.json` | May be `null` for runs without a recorded runtime | **Directly Usable — No Migration** | Tolerant reader projects known fields (module doc); existing manifests keep their string values |
| Old `episodic.jsonl` / `semantic.jsonl` | 5 run folders | No longer read | **Not Affected** | Files stay untouched (user data); nothing reads them |

Safety on the user's machine (Task rule): before the first "Index now" on the user's own data, the team backs up the memory folder; the product itself makes no copy (requirements § Data Continuity).

## Data-Flow Spine Inventory

| Spine | Scope | Behavior | Start | End | Governing owner | Why it matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary end-to-end | BEH-002 | User clicks "Index now" or "Rebuild" (Memory page) | Index status Ready; all runs searchable | `MemoryIndexPipeline` | The first build and full rebuild |
| DS-002 | Primary end-to-end | BEH-005 | Agent calls `search_memory` (native or MCP) or the user searches on the page | Ranked run pointers returned | `MemorySearchService` | Gate 1 and gate 2 |
| DS-003 | Return/event | BEH-001 | A turn changes a run's journal | That run's chunks and card updated | `MemoryIndexPipeline` (live update) | Freshness (R-006) |
| DS-004 | Primary end-to-end | BEH-003 | User opens a result or a run's Work Journal tab | Journal lines shown | `WorkJournalService` (read) | The pointer is openable on the page |
| DS-005 | Bounded local | BEH-002 | Pipeline step run | Step state and progress | `MemoryIndexPipeline` | The step-by-step panel (R-013) |
| DS-006 | Secondary | — | Server start (step 9) after an earlier build | Catch-up done; meaning sync deferred to the first search or live update | `MemoryIndexPipeline` | Changes while the server was off; the meaning job after a restart (AR-001) |

## Primary Execution Spines

- **DS-001 (build):** `Memory page "Index now" → GraphQL startMemoryIndexing → MemorySearch.startIndexing → MemoryIndexPipeline.run(full) → [Find runs: MemoryRunDiscovery] → [Journals: WorkJournalService.ensureCurrent per changed run] → [Text index: JournalChunker → MemorySearchStore (FTS)] → [Meaning index: JournalCardBuilder (changed files) → MemorySearchStore (cards) → MemorySearchStore.allCards → EmbeddingIndex.sync(complete card set)] → status Ready`
- **DS-002 (search):** `search_memory (native tool | MCP adapter) or GraphQL memorySearch → MemorySearch.search → MemorySearchService.search → MemorySearchStore.textCandidates (FTS5 BM25) + EmbeddingIndex.nearest (cards) → interleave → group per run, newest matching part first → WorkJournalService.readJournalLines (snippets) → SecretMasker → results + coverage`
- **DS-003 (live update, in call order):** `WorkJournalService.ensureCurrent → notify(JournalChanged{runId, memoryDir, package}) → MemoryIndexPipeline.onJournalChanged → queue(run) → [20 s quiet] → pass(runs=[R]): Text index for R's files whose content hash changed → JournalCardBuilder for those files → MemorySearchStore (cards) → Meaning step: if allowed (§ Meaning Step Rules) MemorySearchStore.allCards → EmbeddingIndex.sync(complete card set)`
- **DS-006 (catch-up after a restart, in call order):** `server start (step 9) → MemorySearch.start() → if the built marker exists: MemoryIndexPipeline.request(catchUp) → Find runs (MemoryRunDiscovery) → Journals (ensureCurrent only for runs whose raw-trace fingerprint changed) → Text index (files whose content hash changed) → cards for those files → Meaning step deferred: the first MemorySearch.search or the first live-update pass after start runs it (§ Meaning Step Rules)`
- **DS-004 (open):** `Memory page result or run detail → GraphQL memory view (subject) → resolve memoryDir (existing subject resolution, AE-10) → WorkJournalService.listJournalFiles / readJournalLines → Work Journal view`

## Spine Narratives (Mandatory)

| Spine | Narrative | Main nodes | Owner | Key off-spine concerns |
| --- | --- | --- | --- | --- |
| DS-001 | <ol><li>The user starts a build.</li><li>The pipeline lists every run folder with its recorded names and runtime.</li><li>It makes each changed run's journal current through the journal service.</li><li>It re-chunks journal files whose content hash changed into the text index.</li><li>It rebuilds those files' cards and syncs the card collection to the embedding index, which embeds what changed in the background.</li><li>Each step reports progress; the build ends when every step is done.</li></ol> | Pipeline, discovery, journal service, chunker, card builder, store, embedding index | `MemoryIndexPipeline` | Progress state, run attribution, text normalization |
| DS-002 | <ol><li>A query arrives from an agent (with its run ID) or the page.</li><li>The service asks the text index for the best chunks and the embedding index for the nearest cards, then alternates the two candidate lists.</li><li>It keeps the best match per run, leaving out the asking run.</li><li>For each run it lists its newest matching part first, with days.</li><li>It reads 2–3 snippet lines from the journal, masks secrets, and returns at most `limit` runs, with a coverage note while indexing is incomplete and a weak-match note when no match is strong.</li></ol> | Search service, store, embedding index, journal service | `MemorySearchService` | Settings (default limit), secret masking, normalization |
| DS-003 | <ol><li>After a turn, the updater makes the journal current (unchanged).</li><li>The journal service notifies that run's journal changed.</li><li>The pipeline queues the run and, after a short quiet period (default 20 s), re-indexes that run's changed files (text, then cards), then runs the Meaning step with the complete card set (§ Meaning Step Rules).</li></ol> | Journal service, pipeline | `MemoryIndexPipeline` | Debounce queue |
| DS-004 | <ol><li>The page asks for a run's journal by the run's subject identity.</li><li>The existing subject resolution gives its memory folder.</li><li>The journal service lists the run's journal files and returns the requested lines.</li></ol> | GraphQL memory view, journal service | `WorkJournalService` | Subject resolution |

## Spine Actors / Main-Line Nodes

- `MemorySearch`: public facade.
- `MemoryIndexPipeline`.
- `MemoryRunDiscovery`.
- `WorkJournalService` (existing).
- `JournalChunker`.
- `JournalCardBuilder`.
- `MemorySearchStore`.
- `EmbeddingIndex` (existing).
- `MemorySearchService`.

## Ownership Map

| Node | Owns |
| --- | --- |
| `MemorySearch` (facade, `memory-search.ts`) | The subsystem's public boundary: `search`, `indexStatus`, `startIndexing`, `rebuild`, `readJournal` is **not** here (journal reading is the journal service's). It resolves the default limit setting and wires the process singletons. Callers: agent tool manifest, GraphQL resolvers, startup. |
| `MemoryIndexPipeline` | The sequence and state of indexing: step order, full and incremental passes (single flight; a request during a pass is merged into one more), step states and progress, the persisted "built" marker, live-update queue and debounce, startup catch-up, the journal-change subscription. |
| `MemoryRunDiscovery` | The "Find runs" step: walks the three family roots through `AgentMemoryLayout`, finds folders with raw traces, and attributes each run as recorded (§ Run Kinds). Produces `MemoryRun` records. |
| `WorkJournalService` (existing, extended) | Journal files: `ensureCurrent` (unchanged sequence; nullable runtime), the change notification, `listJournalFiles` and `readJournalLines` (validated against the run's manifest). The journal format and its entry reader stay in this module. |
| `JournalChunker` | Groups a journal file's entries (from the journal module's entry reader) into chunks of ≤ 2,000 characters; a longer entry is split by lines; each chunk carries file, line range and day. |
| `JournalCardBuilder` | Builds the card for one journal file (agent as recorded, first 6 requests, first 8 reply openings, 25 distinct actions; ≤ 2,400 characters; ordered so token truncation drops the least important tail). |
| `MemorySearchStore` | `memory-search.sqlite`: schema, writes per run and file, contentless FTS5 queries (BM25), card rows, pipeline state; delete-and-rebuild. |
| `MemorySearchService` | The search sequence (DS-002): candidate retrieval from both tiers, interleaving, grouping, newest-first per run, snippet reading, masking, strength labels, notes. |
| `EmbeddingIndex` (existing, extended) | Models, vectors, background embedding; new `nearest` query with the layer's own relevant flag. |

## Thin Entry Facades / Public Wrappers

| Facade | Owner behind it | Why it exists | Must not secretly own |
| --- | --- | --- | --- |
| `MemorySearch` | `MemoryIndexPipeline`, `MemorySearchService` | One public boundary for tools and GraphQL; resolves the default-limit setting; process lifetime and shutdown | Indexing steps, ranking rules |
| `search_memory` manifest entry (`agent-tools/memory/memory-tool-manifest.ts`) | `MemorySearch.search` | The agent-facing contract (schema, description, result shape) for both entry forms | Search rules |
| GraphQL `memory-search.ts` | `MemorySearch` | The page's API | Search or pipeline rules |

## Removal / Decommission Plan (Mandatory)

| Item | Why unnecessary | Replaced by | Notes |
| --- | --- | --- | --- |
| `AgentMemoryView.episodic` / `.semantic` and args `includeEpisodic` / `includeSemantic` (`api/graphql/types/memory-view.ts`; `agent-memory/services/agent-memory-service.ts:14-15,35-36,50-51`) | Tabs removed (R-014, UD-010); only those tabs used them | Work Journal read (DS-004) | Clean cut; web queries updated together |
| `readEpisodic` / `readSemantic` in `agent-memory/store/memory-file-store.ts` | Dead after the above (only `agent-memory-service.ts` calls them) | — | Verify with search and `tsc` |
| `hasEpisodic` / `hasSemantic` in `MemoryAvailabilitySummary` (`agent-memory/domain/models.ts`; `memory-run-summary-builder.ts:30-31,47-48,80-81`; `memory-explorer-schema.ts`) | They advertise the old files on the page's badges | — | `hasMemoryAvailability` keeps working context and raw traces |
| Web `EpisodicTab.vue`, `SemanticTab.vue`; their use in `MemoryInspector.vue`; badges in `MemoryBadges.vue`; fields in `types/memory.ts`, `memoryInspectorStore.ts`, `memoryExplorerStore.ts`, `graphql/queries/memoryViewQueries.ts`, `memoryExplorerQueries.ts`, `generated/graphql.ts` | Tabs removed | Work Journal view, per the Product spec | Their specs and tests too |
| Localization keys of the removed tabs and badges in `localization/messages/{en,zh-CN}/memory.generated.ts` | Dead after the tab removal (R-015, Principle 7; AR-003) | — | Both languages |
| `workingContext` in the memory view and `includeWorkingContext` (`memory-view.ts`, `memory-view-converter.ts`, `agent-memory-service.ts`); web `WorkingContextTab.vue` and its uses | Working Context tab removed (UD-017); run history passes `false` (AE-10, `local-memory-run-view-projection-provider.ts:40-45`) | — | The snapshot file and its runtime readers stay |
| FU-003 (rewritten) | — | — | The per-run episodic/semantic classes in `autobyteus-ts` stay until that follow-up |

## Return Or Event Spine

- **DS-003:** `WorkJournalService.ensureCurrent (after writes) → JournalChangeNotification {runId, memoryDir, package} → MemoryIndexPipeline.onJournalChanged → queue(run) → after quiet period: a pass for that run: Text and cards for its changed files, then the Meaning step with the complete card set (§ Meaning Step Rules)`.
- The notification is a listener list on the journal service (`onJournalChanged(listener): unsubscribe`). It is called after the manifest is written, only when a journal file was written or removed. Listener errors are caught and logged by the service, so they never fail `ensureCurrent`.

## Bounded Local Spines

- **DS-005, inside `MemoryIndexPipeline`:** `request (full | rebuild | runs) → if a pass runs: merge into next pass → pass: for step in [FindRuns, Journals, TextIndex, MeaningIndex]: state=running(done/total) → step work → state=done | failed(reason) → persist built marker after the first complete full pass`.
  - A failed step stops the pass. Its error shows in the panel; the next request retries.
  - **Meaning index "done"** means its cards are synced; embedding continues in the background. Its row shows the embedding progress from `EmbeddingIndex.collectionStatus` until ready.
  - **Embedding model changed (explicit rule):**
    - The pipeline records the model the Meaning index was built with (`meaningIndexModelId`). When the active model differs, the status is `modelChanged`.
    - Live updates and catch-up keep the text index current but **skip the Meaning step**, so a model switch never silently re-embeds everything.
    - Meaning results are empty, with a coverage note naming the old model, until the user clicks Rebuild (spec UXJ-005, VIS-016).

### Meaning Step Rules (AR-001)

1. **Always the complete set.**
   - Whenever the Meaning step runs (full build, rebuild, catch-up, live update), it passes **every card in `MemorySearchStore`** to `EmbeddingIndex.sync`, never a subset. `sync` removes absent items (`embedding-index.ts:118-121`, `collection-indexing-job.ts:66-79`), and only changed fingerprints are embedded.
   - Cost: reading about 7,400 cards (about 18 MB) and hashing them takes well under a second; live passes are debounced.
2. **When it may run:**
   - **Index now / Rebuild (the user's click):** always. It records `meaningIndexModelId` = the active model. A missing model downloads through `sync`'s normal preparation, as on the Embedding page today.
   - **Catch-up and live updates:** only when the active model equals `meaningIndexModelId` **and** `EmbeddingIndex.activeModelOnDisk()` is true. Otherwise they skip it and the status says why: `modelChanged`, or "embedding model not downloaded" with the link to Server Settings → Embedding. They never start a download.
3. **After a restart (decision for review question d):**
   - DS-006 does **not** load the model at server start.
   - The meaning job is created by the first Meaning step after start: the first live-update pass, or the first `MemorySearch.search`. The facade asks the pipeline for `request(meaningSync)` when `nearest` reports no job, and answers that search with the text tier and the coverage note "Meaning index is loading".
   - The model loads then (from disk, about 1 s, about 0.4 GB until the 10-minute idle stop, `embedding-model-runner.ts` `EMBEDDING_WORKER_IDLE_STOP_MS`).
   - Reason: a server start stays light for users who rarely search.
4. **`EmbeddingIndex.nearest(collection, query, {limit})` never creates a job and never downloads:**
   - **No job for the collection in this process:** `{matches: [], collection: "notSynced", readiness: …}`; nothing started. The explicit `notSynced` flag (review R-5) is what tells memory search to request the meaning sync; it does not have to be inferred from a readiness phase. In every other case `collection` is `"synced"`.
   - **Job exists, the active model's files are not on disk:** `{matches: [], readiness: unavailable("embedding model not downloaded")}`.
   - **Job exists, the model is downloading or loading (started by the pipeline):** `{matches: [], readiness: preparing(...)}`.
   - **Job exists, model ready:** ranked fresh vectors with `relevance`. A worker stopped by the idle timer restarts from disk on the query, as `embed` does today (`embedding-model-runner.ts`: "restarts a stopped worker").
   - Memory search turns each readiness into its coverage note; text results are always returned.
5. **Notifications from the pipeline's own Journals step (review R-2):** notifications for runs already in the running pass are dropped; others merge into the next pass. Unchanged content hashes make a repeated run a no-op (MP-003).
- **Text tier inside `MemorySearchService`:** `normalize(query) → terms (stop words removed; CJK as overlapping 2-character phrases) → FTS5 MATCH (OR) ORDER BY bm25 LIMIT 4000 → first chunk per run in rank order`.

## Run Kinds (Principle 1: Each Kind Traced)

| Kind | Where | Recorded name and identity | Runtime as recorded | Subject for the page |
| --- | --- | --- | --- | --- |
| Standalone agent | `agents/<runId>` with `run_metadata.json` | Agent name from the run history catalog row, else the definition ID from metadata; workspace from metadata | `run_metadata.json` `runtimeKind` | `AGENT {runId}` |
| Task agent | `agents/<runId>` with task-agent metadata | As above via `readTaskAgentMetadata`; delegator recorded | Its metadata | `AGENT {runId}` |
| Team member (configured) | `agent_teams/<team>/…/<member>` | Team name (team history or tree), member address basename; workspace from launch configuration | Member `launchConfiguration.runtimeKind` (AE-12) | `TEAM_MEMBER {teamRunId, agentRunId}` |
| Task-team member | Same family, task team root (not an admitted root package, AE-20) | Read through `TaskTeamRootMemorySource` (the task team's own tree, only while its coordinating run still links it); the tree's `taskAgent` names the delegator | Member launch configuration from that tree | `TEAM_MEMBER {teamRunId, agentRunId}`; the memory view's team-member resolution accepts linked task teams through the same source |
| Org member | `agent_orgs/<org>/…/<member>` | Org name, member address | Member launch configuration | `ORG_MEMBER {orgRunId, agentRunId}` |
| Agent-root collaboration member | `agents/<host>/collaboration/…/<member>` | From the host's tree if located; else folder | As recorded, else `null` | `RUN_FOLDER {runKey}` |
| Folder without a record (no metadata, old-format team, 205 today) | Any family | Folder name (agent name from the folder prefix) | `null`: generic rule (AE-02) | `RUN_FOLDER {runKey}` |

- **`runKey`** is the run folder's path relative to the memory folder, for example `agent_teams/team_x/member_y`. The Work Journal read accepts a `RUN_FOLDER` key only if it is a run the memory index knows and it resolves inside the memory folder.

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves | Responsibility | Why | Risk if on the main line |
| --- | --- | --- | --- | --- | --- |
| `MemoryTextNormalizer` | DS-001, DS-002 | Chunker, search service | CJK split for indexing; query terms (stop words, CJK 2-character phrases) | One rule for both sides | Index and query diverge |
| `SecretMasker` | DS-002 | Search service | Mask keys, tokens, passwords, private keys in snippets (patterns from the probe's backend) | R-008 | Masks the index instead of output |
| `MemorySearchSettings` | DS-002 | `MemorySearch` | `AUTOBYTEUS_MEMORY_SEARCH_DEFAULT_LIMIT`: key, description, normalize, resolve | UD-013 | Scattered parsing |
| Raw-trace fingerprint per run | DS-001, DS-006 | Pipeline (Journals step) | Raw file names, sizes and mtimes; skip `ensureCurrent` when unchanged | The active file is re-rendered on every call (module doc) | A full re-render at every catch-up |
| Evaluation command | — | Developers | Runs a question file against a built index; reports the gates | R-016 | — |

## Ownership Boundaries

- `MemorySearch` is the only public boundary of `memory-search`. Tools, GraphQL and startup depend on it, never on the pipeline, store or search service directly.
- `WorkJournalService` stays the only reader of raw traces and the only writer and reader of journal files. Memory search reads journal lines through it, not through the file system.
- `EmbeddingIndex` stays the only owner of vectors and the relevance rule. Memory search passes items to `sync` and asks `nearest`.
- Run attribution uses existing owners: `AgentMemoryLayout`, `AgentRunMetadataStore`, the team and org location services, the run history catalogs, and the new `TaskTeamRootMemorySource` for task teams. Discovery never parses team or org trees itself.
- **Admission rule for task teams (explicit):** a task-team root is shown and attributed only while its coordinating run's tree still links it (the existing rule for task agents, AE-21). A detached task team's member folders are still searched as `RUN_FOLDER` runs (R-012).

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden bypass | If too thin |
| --- | --- | --- | --- | --- |
| `MemorySearch` | Pipeline, store, search service, discovery | Tool manifest, GraphQL, startup | Tool or GraphQL calling `MemorySearchStore` or the pipeline | Add a method to `MemorySearch` |
| `WorkJournalService` | Journal store, renderer, raw source | Run updater, pipeline, search service, memory view | Reading `work_journal/` files directly; importing `rendering/**` except the entry reader | Add a read method |
| `EmbeddingIndex` | Jobs, store, runner | Project Task search, memory search | Reading `embeddings.sqlite` | Add an option or method (as `nearest`) |

## Dependency Rules

- **Allowed:**
  - `agent-tools/memory` → `memory-search` (`MemorySearch`);
  - GraphQL → `memory-search`, `agent-work-journal`;
  - `memory-search` → `agent-work-journal` (`WorkJournalService` and the entry reader), `embeddings` (`EmbeddingIndex`), `agent-memory` (layout, metadata stores), `run-history` and `agent-org-execution` (location services, catalogs), `config`, `services/server-settings-service`.
- **Forbidden:**
  - `agent-work-journal` → `memory-search` (notification only, through a listener registered by the pipeline);
  - `embeddings` → `memory-search`;
  - anything → `memory-search/store` or `memory-search/pipeline` except inside the subsystem;
  - memory search reading raw traces.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity shape | Notes |
| --- | --- | --- | --- | --- |
| `MemorySearch.search(query, { limit?, askingRunId? })` | Memory of this node | Ranked run pointers | Free-text query; asking run ID optional (page: none) | Limit 1–20; default from setting |
| `MemorySearch.indexStatus()` | The memory index | <ul><li>`state`: `notIndexed` / `building` / `ready` / `failed` / `modelChanged`;</li><li>`steps[4]`: `{step, state: waiting\|running\|done\|failed, done, total, unit: runs\|journalFiles, failureMessage?}`;</li><li>`runCount`, `updatedAt`;</li><li>`textIndexHasContent` (enables search);</li><li>`activeModelId`, `meaningIndexModelId`.</li></ul> | — | Read-only; the page derives its headline and tab badge |
| `MemorySearch.startIndexing()` / `rebuild()` | The memory index | `startIndexing` = Index now and Try again (a pass that resumes: finished work is skipped by fingerprints); `rebuild` = drop the index, then a full pass (search covers less while it runs, as the spec's confirmation says) | — | Single flight; ignored while a pass runs (Rebuild is disabled then) |
| `WorkJournalService.onJournalChanged(listener)` | Journals | Notification after a changed journal | `{runId, memoryDir, package}` | Returns unsubscribe |
| `WorkJournalService.listJournalFiles(memoryDir)` / `readJournalLines(memoryDir, journalFile, {start, end})` | One run's journal | List: per file name, state (`closed` / `open`, shown as Active), size, line count, and days with their first line (from the entry reader). Read: a line range | `memoryDir` from subject resolution; `journalFile` must be a manifest entry | Windows of 300 lines on the page; at most 400 lines per call |
| `readJournalEntries(markdown)` (agent-work-journal, public reader) | Journal format | Entries with `lineStart`, `lineEnd`, `day`, kind | — | The only parser of the format outside rendering |
| `EmbeddingIndex.nearest(collection, queryText, { limit })` | One collection | Top `limit` fresh vectors by similarity, each `{id, score, relevance}` with `relevance` = `relevant` (inside the layer's rule, AE-06) / `aboveFloor` (score ≥ the model's clear-match floor) / `below`, plus readiness | Collection key | The calibration stays in the layer; memory search maps the three values to Strong / Fair / Weak |
| Tool `search_memory` | Memory of this node | Agent contract | `query`, `limit?`; asking run from the session (MCP owner `runId`) or tool `agentId` | § Tool Contract |
| GraphQL `memorySearch(query, limit)` | Memory of this node | Page search | — | Results carry `subject` |
| GraphQL `memoryIndexStatus`, `startMemoryIndexing`, `rebuildMemoryIndex` | The memory index | Panel | — | — |
| GraphQL memory views (existing, three subject queries) gain a Work Journal part; new `runFolderWorkJournal(runKey, …)` for `RUN_FOLDER` runs | One run | Journal files and lines | `AGENT {runId, agentDefinitionId?}` (the page's Back link and heading need the definition) / `TEAM_MEMBER {teamRunId, agentRunId}` / `ORG_MEMBER {orgRunId, agentRunId}` / `RUN_FOLDER {runKey}` | Explicit per subject (Principle 10); every search result carries its subject (spec open point 1) |

## Interface Boundary Check

| Interface | Singular? | Explicit identity? | Ambiguous selector risk | Action |
| --- | --- | --- | --- | --- |
| `search_memory` | Yes | Yes | Low | — |
| Memory views + `runFolderWorkJournal` | Yes | Yes | Low | `RUN_FOLDER` accepts only keys known to the index |
| `EmbeddingIndex.nearest` | Yes | Yes | Low | — |
| `readJournalLines` | Yes | Yes (memory folder + manifest file name) | Low | Rejects names not in the manifest |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Same everywhere per glossary? | Drift risk | Action |
| --- | --- | --- | --- | --- | --- |
| Tool | `search_memory` | Yes | Yes (Memory search) | Low; "memory" is broader than journals today, defined in the glossary | Glossary entry |
| Subsystem | `memory-search` | Yes | Yes | Low | — |
| Pipeline | `MemoryIndexPipeline` | Yes | Yes (Indexing pipeline, Memory index) | Low | — |
| Chunk | `JournalChunk` | Yes | Yes | Low | — |
| Card | `JournalCard` | Yes | Yes | Low | — |
| Run record | `MemoryRun` | Yes | Yes | Medium: "run" alone means a live run elsewhere | Always `MemoryRun` |
| Old tabs | Episodic / Semantic | — | **No** (old meaning) | High | Removed |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Journal generation | `WorkJournalService` | Reuse, extend | Only writer (AE-03) |
| Journal format parsing | `agent-work-journal` | Extend (entry reader) | Format owner (one parser) |
| Vectors | `EmbeddingIndex` | Reuse, extend (`nearest`) | AE-05 to AE-07 |
| Run folders | `AgentMemoryLayout` | Reuse | AE-13 |
| Run attribution | Metadata stores, location services, catalogs | Reuse | AE-12 |
| Task-team listing | `CollaborationRootMemorySource` interface, `TaskAgentLinkChecker`, team tree store | Extend (new source implementing the interface) | AE-20, AE-21 |
| Tool exposure | Manifest pattern, MCP providers, loader | Reuse | AE-08 |
| Settings | Server settings service | Reuse | AE-14 |
| Text index | None | Create new (`MemorySearchStore`, node:sqlite FTS5) | No existing full-text owner; `node:sqlite` already used by the embedding store |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `memory-search` (new) | Pipeline, discovery, chunks, cards, store, search, settings | DS-001, DS-002, DS-003, DS-005, DS-006 | Create new |
| `agent-work-journal` | Journals, notification, entry reader, read | DS-001, DS-003, DS-004 | Extend |
| `embeddings` | `nearest` | DS-001, DS-002 | Extend |
| `agent-tools/memory` (new) | `search_memory` contract, native and MCP | DS-002 | Create new (manifest pattern) |
| `api/graphql/types` | `memory-search.ts`; `memory-view.ts` changes | DS-001, DS-002, DS-004 | Extend |
| `agent-memory` | <ul><li>Removal of the old readers.</li><li>`TaskTeamRootMemorySource`: linked task teams; the Teams explorer lists them, marked as delegated, next to configured teams.</li></ul> | DS-004 | Modify / Create new (one file) |
| `autobyteus-web` memory | Page per the Product spec | DS-001, DS-002, DS-004 | Modify |

## Final File Responsibility Mapping

### Server: `autobyteus-server-ts/src/memory-search/`

| File | Concern |
| --- | --- |
| `memory-search.ts` | Public facade and process singleton (`getMemorySearch`, shutdown) |
| `domain/memory-search-models.ts` | `MemoryRun`, `MemoryRunSubject`, `JournalChunk`, `JournalCard`, `MemorySearchResult`, `MemoryIndexStatus` |
| `settings/memory-search-settings.ts` | Default-limit setting: key, description, normalize, resolve |
| `runs/memory-run-discovery.ts` | Find runs and attribute them per § Run Kinds |
| `pipeline/memory-index-pipeline.ts` | Sequence, state, passes, live queue, catch-up, subscription |
| `pipeline/journals-step.ts` | Raw-trace fingerprints; `ensureCurrent` for changed runs (runtime as recorded or `null`) |
| `index/journal-chunker.ts` | Entries → chunks ≤ 2,000 characters |
| `index/journal-card-builder.ts` | One card per journal file |
| `index/memory-text-normalizer.ts` | CJK split; query terms |
| `store/memory-search-store.ts` | SQLite schema and operations (contentless FTS5) |
| `search/memory-search-service.ts` | DS-002 sequence |
| `search/secret-masker.ts` | Snippet masking |
| `evaluation/memory-search-evaluation.ts` plus a script entry under `autobyteus-server-ts/scripts/` | R-016 evaluation over a data directory and a question file |

### Server: other areas

| File | Change |
| --- | --- |
| `agent-work-journal/domain/work-journal-models.ts` | `runtimeKind: RuntimeKind \| null`; notification type |
| `agent-work-journal/services/work-journal-service.ts` | Notification after writes; `listJournalFiles`, `readJournalLines`; `null` runtime passed to the renderer |
| `agent-work-journal/store/work-journal-store.ts` | Manifest reader accepts `runtime_kind: null` |
| `agent-work-journal/reading/journal-entry-reader.ts` (new) | Entry boundaries, line ranges, day markers, entry kind |
| `embeddings/embedding-index.ts` | `nearest` |
| `agent-tools/memory/memory-tool-contract.ts` | Name, description, schema, input parsing |
| `agent-tools/memory/memory-tool-manifest.ts` | Execute through `MemorySearch.search`; result shape |
| `agent-tools/memory/memory-native-tools.ts` | `SearchMemoryTool` (passes `agentId` as the asking run); `registerMemoryTools` |
| `agent-tools/mcp/providers/memory-tools-mcp-adapter-provider.ts` | MCP adapter (passes `session.owner.runId`) |
| `agent-tools/mcp/providers/default-agent-tool-mcp-adapter-providers.ts` | Registers the provider |
| `startup/agent-tool-loader.ts` | Loader spec `memory` |
| `services/server-settings-service.ts` | Registers the setting |
| `api/graphql/types/memory-search.ts` (new) | Search, status, actions, `runFolderWorkJournal` |
| `api/graphql/types/memory-view.ts`, `memory-explorer-schema.ts`, `api/graphql/schema.ts` | Work Journal part; old fields removed; resolver registration |
| `agent-memory/services/agent-memory-service.ts`, `agent-memory/store/memory-file-store.ts`, `agent-memory/services/memory-run-summary-builder.ts`, `agent-memory/domain/models.ts` | Removals (§ Removal Plan) |
| `agent-memory/services/task-team-root-memory-source.ts` (new) | Lists task-team roots still linked by their coordinating run (`TaskAgentLinkChecker` rule, AE-21) and reads each one's own tree through the team tree store. Implements `CollaborationRootMemorySource`; one reader for the Teams explorer, the team-member memory view resolution, and `MemoryRunDiscovery` |
| `agent-memory/services/team-memory-explorer-service.ts` | Lists configured team roots and linked task-team roots (a run's `delegatedBy` names the delegator) |
| Startup (server runtime, step 9) | Start `MemorySearch` catch-up if built; shut it down on exit |
| `docs/modules/agent_work_journal.md`, `docs/modules/agent_memory.md`, new `docs/modules/memory_search.md`, embedding module doc | Docs |
| `GLOSSARY.md` | Memory section |

### Web: `autobyteus-web`

| Files | Change |
| --- | --- |
| See § Product Design Integration (SR-002) | The web file mapping from the approved spec |

Each file stays under 500 lines (repository rule).

## Tool Contract: `search_memory`

- **Arguments:** `query` (string, required, non-blank); `limit` (integer 1–20, optional).
- **Description (final wording in implementation; content fixed here):**
  - It searches the memory of all agent runs on this node (their Work Journals) by words and by meaning, in any language.
  - It returns up to `limit` runs (default from the server setting, 10), best first.
  - Each result has who, run ID, workspace, first and latest day, a `source` line, and matches with journal file, lines, day, snippet and match kind.
  - Results are pointers, not facts: open the best match's lines with your file tool before answering, and before searching again. Answer from the run you read and cite its `source`. When several runs differ, prefer the latest mention and say so. If matches are weak, try other words.
- **Result (JSON; only fields with a value):**

```json
{
  "results": [
    { "agent": "Codex", "runId": "codex_45ce…", "workspace": "/Users/…/autobyteus_mcps",
      "firstDay": "2026-08-25", "latestDay": "2026-08-28",
      "source": "Codex · run codex_45ce… · 2026-08-27 · work_journal_000004.md:812-860",
      "matches": [
        { "journalFile": "/…/memory/agents/codex_45ce…/work_journal/work_journal_000004.md",
          "lines": "812-860", "day": "2026-08-27", "snippet": "…", "matchedBy": "text", "strength": "strong" } ] },
    { "agent": "Solution Designer", "team": "Software Engineering Team", "member": "solution_designer", "runId": "…", "…": "…" }
  ],
  "coverage": "Meaning index covers 2,100 of 7,385 journal files; text index complete.",
  "note": "Only weak matches; try other words."
}
```

- **Rules:**
  - **Strength: three levels, `strong` / `fair` / `weak`** (UD-017):
    - text: by the share of the query's distinct terms in the matched chunk, ≥ 2/3 strong, ≥ 1/3 fair, else weak;
    - meaning: `relevant` → strong, `aboveFloor` → fair, `below` → weak (from `nearest`).
    - Thresholds are calibrated with the R-016 evaluation; the rule lives in `MemorySearchService` only.
  - **`note`** appears only when every match is weak.
  - **Pointer of a meaning match (AR-002; owned by `MemorySearchService`).** A card stands for a whole journal file, so its lines, day and snippet are chosen by this ordered rule:
    1. **Text chunk:** the best text-candidate chunk of **the same journal file** for this query, if there is one. It gives that chunk's lines, day and snippet; the match stays `meaning` with the meaning strength.
    2. **Card part:** otherwise, the card part (one of the requests, replies or actions the card was built from) that contains the most query terms, at least one. It gives that part's entry lines and day; the snippet is read from those lines.
    3. **First request:** otherwise, the card's first request entry, or the file's first entry when the card has no request.
    - **Ordering within a run (review R-7, R-010):** a run's matches, from either tier, are listed newest first by their day, then by line. The run's position in the result list still comes from its best match.
    - **Store data this needs:** each card row keeps its parts: `[{kind: request|reply|action, lineStart, lineEnd, day, offset, length}]`, where offset and length locate the part's text inside the card text. No journal text is copied beyond the card.
    - **Evaluation (R-016, step 2 of the check):** every meaning-only match must point inside its file, with a non-empty snippet. The report shows how many meaning matches each rule resolved.
  - **`coverage`** appears only while a step is incomplete or the index was never built ("Memory index not built yet: ask the user to start it on the Memory page"). In that last case `results` is empty, which is an explicit state, not absence.
- **Exposure:** opt-in per agent definition (session-owned selection, AE-08). The asking run is excluded from its own results.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Live update | `ensureCurrent` → `notify(JournalChanged)` → pipeline queues the run | `journalService.ensureCurrent(target, onChanged)`, a function passed in that reaches the index | Principle 13, one owner per sequence |
| Meaning query | `embeddingIndex.nearest("memory-journal-cards", q, {limit: 300})` | `search(collection, all7385Cards, q, {scoreIds: allIds})` | No full re-sync per query; no misuse of `scoreIds` |
| Opening a result | `TEAM_MEMBER {teamRunId, agentRunId}` → existing resolution → `readJournalLines` | `openJournal(path)` with an arbitrary path | Principle 10; path safety |
| Unknown runtime | `ensureCurrent({…, runtimeKind: null})` → generic rule | Guessing `autobyteus` | Principle 13 (no behavior by absence) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep `includeEpisodic` / `includeSemantic` as no-ops | Old web builds | Rejected | Removed with the web change in the same release |
| Keep old tabs hidden | Gradual change | Rejected | Removed |
| A second "search with relevance cut" path for memory | Reuse `search` as-is | Rejected | `nearest` |

## Change / Refactor Sequence

1. **Journal module:** nullable runtime (target, manifest reader), entry reader, `listJournalFiles` / `readJournalLines`, notification; tests.
2. **`EmbeddingIndex.nearest`;** tests.
3. **`memory-search`:** domain, settings, normalizer, chunker, card builder, store, discovery, pipeline, search service, facade; tests (including every run kind of § Run Kinds on fixtures).
4. **Tool family and MCP provider;** tests for both entry forms.
5. **GraphQL:** `memory-search.ts`; memory view Work Journal part; removal of episodic/semantic; schema regeneration.
6. **Startup wiring** (step 9) and shutdown.
7. **Web:** per the Product spec; remove old tabs and badges.
8. **Docs and `GLOSSARY.md`.**
9. **Evaluation command;** run it on an isolated copy (gates); FU-003 text updated.

## Staged Plan And Implementation Tasks (The Task's Done-When)

| Stage | Implementation Task (ready to create) | Content | Depends on | Acceptance |
| --- | --- | --- | --- | --- |
| 1 | **Memory search: index, search and agent tool (server)** | Change Sequence steps 1–6, 8–9: <ul><li>journal and embedding boundary additions;</li><li>`memory-search` subsystem (pipeline, text and meaning index, search);</li><li>`search_memory` (native and MCP);</li><li>GraphQL search, status, actions and Work Journal read;</li><li>`TaskTeamRootMemorySource`;</li><li>removal of the per-run episodic/semantic server path;</li><li>setting;</li><li>docs and glossary;</li><li>evaluation command.</li></ul> | — | AC-001 to AC-010, AC-012, AC-013 on an isolated copy; gates via the evaluation command |
| 2 | **Memory page: memory search, Work Journal view, index panel** | Change Sequence step 7, per the Product Team's approved specification: <ul><li>search box and results;</li><li>Work Journal view at lines;</li><li>index panel with pipeline steps;</li><li>task teams in the Teams list;</li><li>old Episodic/Semantic tabs and badges removed.</li></ul> | Stage 1 (API), the Product spec | AC-011; AC-008 visible on the page |
| Later | Follow-ups | FU-001 token limit, FU-002 reranker, FU-003 library cleanup, FU-005 summaries | Stages 1–2 | Each measured with the R-016 evaluation |

- **Chunk index first:** Stage 1 delivers the text index (journal chunks) and the meaning index (cards) before any optional summary work (FU-005), as the Task asks.
- **One ticket or two Tasks:** the team can deliver both stages in this ticket (one package; the web part waits for the Product spec), or the Project Task Manager can create the two Tasks above as parts of `autobyteus-185`. The design serves both.

## Key Tradeoffs

- **Cards (start of each file) instead of whole-file meaning pieces:** equal in combination, about 4× cheaper (report § 6.1). Late-in-file decisions rely on the text tier.
- **No time filter:** a wrong filter would hide runs (UD-009); dates are shown instead.
- **One memory per node** (UD-005); access is opt-in per agent, not per workspace.
- **Interleave rather than a reranker** (FU-002).
- **External search or memory services later** (the user, 2026-10-26: "maybe in the future we will have to use external service for the search and for the memory"):
  - Not built now (no speculative machinery).
  - The design keeps it possible: tools and the Memory page depend only on `MemorySearch`; the pipeline's records (runs, chunks, cards, fingerprints) are service-neutral; journals stay the source of truth from which any index can be rebuilt.
  - Deciding it later involves privacy (self-hosted vs cloud) and, for memory shared across nodes, the collaboration model's CM-10.

## Risks

| Risk | Mitigation |
| --- | --- |
| First build writes about 1.7 GB of journals, and the raw reader may truncate a crashed run's broken tail (existing behavior) | User's click; backup on the user's machine; progress shown |
| CPU during the meaning build (about 1 h) | Background; searches first; text search available after about 3 min |
| Disk (index about 100–300 MB plus journals) | Contentless FTS; documented |
| Secrets in snippets | Masking (AC-005 measured); snippets only 2–3 lines |
| Index and journals diverge after a crash | Fingerprints per file; catch-up on start; "Rebuild" |
| Node `node:sqlite` features on Docker or Android | Same Node major as the embedding layer requires; contentless delete verified on 22.23.1 (AE-16); implementation checks the packaged Node versions |

## Guidance For Implementation

- **Reproduction to start from:**
  - `probes/` (public scripts);
  - an isolated copy of a memory folder (never `~/.autobyteus`, per TESTING.md);
  - the private question file in `autobyteus-delivery-receipts/work-journal-search-evidence/queries.json`, used only on the user's machine;
  - for public tests: a fixture memory folder with the run kinds of § Run Kinds.
- **Gates:** AC-001 and AC-002 must hold on the evaluation command; any transformation change is measured first (R-016).
- **Product spec:** the web part waits for the Product Team's approved specification; the server part does not.

## Review Corrections (SR-003)

| Finding | Correction | Where |
| --- | --- | --- |
| AR-001 | <ul><li>The Meaning step always syncs the complete card set.</li><li>When it may run (user click vs catch-up and live update; never a download outside a user click).</li><li>DS-003 and DS-006 written in call order.</li><li>`nearest` defined for no job, model missing, model loading, and ready.</li><li>The meaning job after a restart is created by the first search or live update, not at server start.</li></ul> | § Primary Execution Spines; § Meaning Step Rules |
| AR-002 | Ordered pointer rule for meaning matches (text chunk in the same file → best card part → first request), with the card parts stored; checked by the evaluation | § Tool Contract |
| AR-003 | `memory.generated.ts` keys removed from both languages | § Removal Plan; § Product Design Integration (web mapping) |

Non-blocking notes:

- **R-1, Work Journal view per memory source:**
  - The Work Journal part follows the memory view's existing `source` resolution (local, or imported read-only).
  - It never generates a journal.
  - A local run without a journal before the first build shows "No Work Journal yet. Index your memory to create it." with the link to the Index tab; an imported run shows "No Work Journal". This is copy for an existing state; the spec's badge "No Work Journal" stays.
- **R-2:** § Meaning Step Rules, rule 5.
- **R-3, line drift in the open file:**
  - A turn re-renders only the open (active) journal file, and new entries are appended.
  - Lines already indexed keep their numbers, except the open file's last entry (its outcome or shortening can change).
  - A pointer into that last entry may be a few lines off until the next live pass (≤ 20 s); the snippet is read at query time from the current file.
  - Accepted.
- **R-4:** `GLOSSARY.md` notes that the match labels "Words" and "Meaning" name the text index and the meaning index.

## Product Design Integration (SR-002)

- **Approved spec:** `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/work-journal-search/ui-ux-spec.md` (approved 2026-10-26). Screenshots VIS-001 to VIS-024 are normative.
- **Runnable reference:** the design repository root at `d01192275c` (`corepack pnpm dev`, entry `/memory`, scenarios in its runbook). Its stores, fixtures and scripted search are mocks, not architecture (spec § Implementation Fidelity Boundary).

**Answers to the spec's open points (decided here):**

| # | Open point | Decision |
| --- | --- | --- |
| 1 | Result addressing | Every result carries its subject: `AGENT {runId, agentDefinitionId?}`, `TEAM_MEMBER {teamRunId, agentRunId}`, `ORG_MEMBER {orgRunId, agentRunId}`, `RUN_FOLDER {runKey}`. A `RUN_FOLDER` run (an old-format team folder or an agent-root collaboration member) opens in the same run detail (UIS-007) with the folder name as heading and only "Back to search results"; the spec has no browse path to such runs, so none is added. |
| 2 | Search readiness | Search is available as soon as the Text index has content (`textIndexHasContent`), with the coverage note. |
| 3 | Rebuild semantics | Rebuild drops the index first; search covers less while it runs. The spec's sentence stays. |
| 4 | Strength | Three levels decided by the server (§ Tool Contract). The page shows the level it receives. |
| 5 | Task team tag | `isTaskTeam` and `startedByAgentName` at run and definition level (§ Change Scope, derived consumers). |
| 6 | Static times | Kept as static copy (measured on the reference machine). |
| 7 | Working Context | Removed from the page and from the memory-view API (§ Removal Plan). The snapshot file and its runtime use stay. Showing live context elsewhere would be a new request. |
| 8 | Reduced motion | Implemented: spinners and the bar transition stop under `prefers-reduced-motion`. |

**Web file mapping** (`autobyteus-web`; the spec's components, implemented against the real API):

| File | Change |
| --- | --- |
| `pages/memory.vue` | The page shell: Browse · Search · Index, routes per spec UIS-001 to UIS-008 |
| `components/memory/MemoryHome.vue` | Browse (sub-tabs, Filter), the Index tab badge |
| `components/memory/MemorySearchPanel.vue` (new) | Search box and index notices |
| `components/memory/MemorySearchResults.vue` (new) | Result cards, notes, opening a match |
| `components/memory/MemoryIndexPanel.vue` (new), `composables/useMemoryIndexView.ts` (new) | Pipeline steps, headline, Index now / Try again / Rebuild with confirmation |
| `components/memory/WorkJournalTab.vue` (new) | File rail, windows, jumps, search banner, match buttons |
| `components/memory/MemoryInspector.vue` | Two tabs (Work Journal default, Raw Traces) |
| `components/memory/AgentMemoryDetail.vue`, `CollaborationMemoryDetail.vue`, `MemoryBadges.vue` | Flat details, member chips, exception-only badges, task-team tag |
| `stores/memorySearchStore.ts` (new), `stores/memoryJournalStore.ts` (new) | Real GraphQL calls (search, status polling, actions, journal reads) |
| `graphql/queries/` (memory search, index, journal), `types/memory.ts`, `generated/graphql.ts` | API types |
| `localization/messages/{en,zh-CN}/memory.ts` | The spec's strings |
| Remove: `EpisodicTab.vue`, `SemanticTab.vue`, `WorkingContextTab.vue` and their specs | Clean cut |
| `localization/messages/{en,zh-CN}/memory.generated.ts` | Remove the keys of `EpisodicTab`, `SemanticTab`, `WorkingContextTab` and the episodic / semantic / working-context badges in `MemoryBadges` from **both** languages (hand-maintained; no generator found in `package.json` or scripts). New strings go to `memory.ts` per the spec. Keep the en / zh-CN parity checks (`localization/messages/__tests__/`) green (AR-003). |

- **Status updates:** the page polls `memoryIndexStatus` while a build runs (about every 2 s), and once when the Index or Search tab opens. No streaming is added.
