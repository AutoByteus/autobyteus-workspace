# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-001/SR-002, approved by the user 2026-10-26; UD-016, UD-017)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (AE-01…AE-21, as cited by the design)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001…SR-003)
- Design Spec Reviewed As Context: `design-spec.md` (SR-003: DS-001…DS-006, § Meaning Step Rules 1–5, § Run Kinds, § Tool Contract, § Review Corrections, § Product Design Integration)
- Supplemental Task Artifacts Reviewed As Context: the approved UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/work-journal-search/ui-ux-spec.md` (UXJ-003, state table, exact labels, Implementation Fidelity Boundary); `memory-search-evaluation-report.md`; `follow-ups.md`
- Relevant Solution Revision IDs: SR-002, SR-003
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002, Pass; MP-001…MP-003; R-1…R-7)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001, ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Trigger: implementation engineer handoff for IR-001
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Code reviewed: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-search`, branch `codex/work-journal-search`, `ddd6fdcdf6..c66708b44b` (ticket folder `e031d0d0b8`)
- Coverage / API/E2E / delivery artifacts: N/A (implementation review)

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none. The implementation matches the design's surfaces:
  - a new subsystem with a persistent derived store;
  - an agent tool in two entry forms;
  - GraphQL additions and removals;
  - a startup task;
  - background concurrency;
  - a rebuilt page.

  No escalation trigger fired: nothing outside the journal service reads raw traces, there is no migration, and the layout is unchanged.

## Review Scope

- Changed implementation and behavior reviewed:
  - **Server, read in full:**
    - `src/memory-search/**`: facade, pipeline, journals step, run indexer, discovery, chunker, card builder, normalizer, store, search service, secret masker, settings;
    - `agent-tools/memory/*` and the MCP provider;
    - `startup/memory-search-loader.ts`;
    - GraphQL `memory-search.ts`, `work-journal-view.ts` and `memory-view.ts`;
    - `EmbeddingIndex.nearest`;
    - the `WorkJournalService` and store diffs;
    - `TaskTeamRootMemorySource`, the `TeamMemoryExplorerService` diff and the location-service diff;
    - the removals (`agent-memory-service`, `memory-file-store`, `memory-run-summary-builder`, converter, run-history projection).
  - **Web:** read `stores/memorySearchStore.ts`, `stores/memoryJournalStore.ts`, the routing and result opening in `pages/memory.vue`, and the coverage logic in `MemorySearchResults.vue`. The other components were checked against the spec through IMP-09 and the IMP-12 probe screenshots.
  - **Docs:** `GLOSSARY.md` § Memory, plus a vocabulary grep (R-015).
- Checks:
  - The implementer's Checks Run (IMP-01…IMP-12) were recorded on the code under review, so none was rerun.
  - One check of my own, **Measured**: the Teams explorer list on the isolated copy `/tmp/wjs-copy/memory` (101 task teams; never `~/.autobyteus`), using the built `dist`, read-only. `TeamMemoryExplorerService.listAgentTeamsWithMemory` took 537 / 463 / 247 ms at load average 12. The probe script lived in `/tmp/crr-probe` and was removed afterwards.
- Explicit exclusions: the evaluation command's internals beyond its reported gates; probes and evidence; the regenerated `generated/graphql.ts`; the web components' visual fidelity, which the IMP-12 probe compared with VIS-*.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. Episodic memory (Work Journals) becomes findable for agents (`search_memory`) and the user (Memory page), with time-aware pointers. A user-started four-step indexing pipeline keeps itself current. The old per-run episodic, semantic and working-context path is removed.
- Design-spec behavior map verified against the implementation: Yes, with the exceptions in CR-001 and CR-002.
- Design review report and round confirmed: ARCH-REV-002 Pass.
  - R-5: `nearest` answers an explicit `collection: "notSynced"`.
  - R-7: matches are ordered newest first.
  - R-6: open (CR-003).
- Behavior-basis status: `Confirmed`, except for one visible state without a recorded requirement decision (CR-003).

| Behavior | Status | Implementation path and lifecycle evidence |
| --- | --- | --- |
| BEH-001 / DS-003 | Confirmed, with a defect (CR-001) | `WorkJournalService.reconcile` → `notify` only when a file was written or removed → `MemoryIndexPipeline.onJournalChanged` → 20 s debounce → `request({kind:"runs"})` |
| BEH-002 / DS-001, DS-005, DS-006 | Confirmed, with a defect (CR-002) | `startMemoryIndexing` → `MemorySearch.startIndexing` → `pass(full)`: Find runs → Journals (raw-trace fingerprints, `ensureCurrent`) → Text index (content hash) → Meaning step (complete card set). Catch-up at start skips the Meaning step; the first search's `notSynced` requests `meaningSync` |
| BEH-003 / DS-004 | Confirmed | Memory views by subject plus `runFolderWorkJournal` (index-known `RUN_FOLDER`, contained in the memory folder) → `readWorkJournalView` → `listJournalFiles` / `readJournalLines` (manifest-validated, ≤ 400 lines) |
| BEH-004 | Confirmed | `search_project_tasks` untouched; `EmbeddingIndex.search` unchanged |
| BEH-005 / DS-002 | Confirmed | Native (`agentId`) / MCP (`session.owner.runId`) / GraphQL (no asking run) → `MemorySearch.search` → BM25 text candidates plus `nearest` cards → interleave → pointer rule (text chunk → card part → first request) → newest first → `readJournalLines` snippet → `maskSecrets` |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal / event | Entry | Shape | Forward path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-A | UC-001…UC-005; R-001…R-012 | User / Contract | Agent or user | Find past work | `search_memory`; Memory page Search | Normal | DS-002 | Run pointers | Requirements | Supported Normal | Use |
| SCN-B | UC-006; R-006; AC-009 | System | A live run's turn | Keep memory findable | Turn end → journal written | Normal | DS-003 | Findable by text within about a minute | Requirements | Supported Normal | Use |
| SCN-C | UC-008; R-013; AC-008 | Operational / User | User | Build or rebuild the index | Memory page Index | Normal | DS-001 / DS-005 | Steps with progress; Ready | Requirements, UI spec | Supported Normal | Use |
| SCN-D | R-013 ("afterwards keeps itself current"), DS-006 | System | Server start | Catch up | Startup step 9 | Normal | DS-006 | Index current | Design; MP-001 | Supported Normal | Use |
| SCN-E | SCN-B during SCN-C or SCN-D | System | A live agent turn while a full, rebuild or catch-up pass runs | Its change stays findable | Turn end during a pass. Passes last minutes: the first build 198 s (IMP-06); a catch-up scans about 3,700 runs at every start | Normal: agents work while the user indexes or the server starts. The design itself treats concurrent notifications as reachable (MP-003, rule 5) | DS-003 into DS-001/DS-006 | The change is indexed after the pass | MP-003; design rule 5 | Supported Normal | Use |
| SCN-F | SCN-A during SCN-B | User / Contract | A search while a live-update pass runs | Honest coverage (R-009) | A search issued while a one-run live pass runs (every active run, 20 s after its turn) | Normal | DS-002 reading `status()` | Coverage reflects the index | R-009; UXJ-003 / VIS-008 | Supported Normal | Use |

### Candidate Finding And Mechanism Gate

| Candidate | Observation | Scenario / contract | Trigger | Path / consequence | Evidence (how established) | Disposition | Scope | Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Live journal changes are dropped during a full, rebuild or catch-up pass, and during the whole first build | SCN-E; R-006, AC-009; MP-003 ("wasted work, not wrong state") | An agent's turn writes its journal while a pass runs | `onJournalChanged` (L157–171) returns when the index is not built yet (the whole first build), or when `inPass` holds the run. `inPass` holds **every** run of the pass from its Journals step until `drain` ends (L249, L182), including any merged follow-up pass. A change after the pass indexed that run is never queued; it stays unfindable by text until the run's next change or the next server start's catch-up. For a run whose last turn falls in the window, that can be hours or days | **Read**: `memory-index-pipeline.ts` L157–171, L244–256, L173–184; design rule 5 says these are the pipeline's own notifications | Promote | This ticket | **CR-001** (Local Fix): drop only the pipeline's own notifications, e.g. by marking the run whose `ensureCurrent` the Journals step is calling. Queue every other change, also while the first build runs; repeated runs are no-ops by content hash (MP-003). Add a test |
| C-02 | Every pass, including a one-run live update and a `meaningSync` pass, makes the status `building` with that pass's own step counts | SCN-F; R-009 (results say how much is covered); UI spec UXJ-003 / VIS-008 (coverage note "covers N% of your journals"); R-013 (the Index tab shows the build) | A search, or an open Index tab, while a live pass runs | `status()` (L116–136) uses `this.steps` and `building` whenever `running`, and `pass()` resets `steps` for every kind (L190). So during a live pass, `textIndex` counts that run's files only. The page's coverage (`MemorySearchResults.vue` L115–119, from `textPct`) then says "Still indexing: the Text index covers 0% of your journals" on a complete index. The tool's coverage (`memory-search.ts` L121) says "Indexing in progress: the text index covers 0 of 2 journal files." The Index tab flips to Building with "1 of 1 runs". With `modelChanged`, every search starts a no-op `meaningSync` pass (L69–71), which also shows as `building` and moves `updatedAt` | **Read**: lines cited | Promote | This ticket | **CR-002** (Local Fix): passes that only keep the index current (`runs`, `meaningSync`) must not replace the reported index state and step progress; report the settled status while they run. Catch-up may keep showing as building. Do not request `meaningSync` when the Meaning step would skip it (`modelChanged`). Add tests |
| C-03 | The Work Journal empty-state copy ("No Work Journal yet." + "Index your memory to create it." with the Index-tab link; imported: "No Work Journal") has no recorded requirement decision | ARCH-REV-002 R-6; `solution-revision-record.md` L114: "to be recorded as a requirements decision with the user's confirmation before code review"; the normative UI spec has no such state | Opening a local run before the first build: the default tab for most old runs | A visible state shipped without an approved basis | **Read**: requirements doc has no entry; design § Review Corrections R-1 only | Promote | Requirement Gap | **CR-003** → Solution Designer records the decision (as DEC-009/DEC-011 in autobyteus-146), with the user's confirmation as its own plan says. Implementation follows whatever is recorded |
| C-04 | Teams explorer cost with task teams (catalog read per task team, trees read twice) | Preserved Browse lists; QR "Memory page stays responsive" | Opening Browse → Agent Teams | — | **Measured**: 247–537 ms at load 12 on 101 task teams | Reject | — | Within reason; no budget missed |
| C-05 | `getRunDir(runId)` has no containment check, and the Work Journal read now runs under it | — | A crafted `runId` from a GraphQL client | Raw traces were already read this way at the base; the new read accepts only files a manifest in that folder names | Read | Reject | — | Pre-existing; no supported scenario without write access to the node |
| C-06 | Snippet lines are cut to 200 characters **before** masking, so a secret cut at the edge can leave a short unmasked prefix (fewer than 16 characters of an `sk-` key) | R-008, AC-005 | A long line with a secret at about character 190 | A partial key fragment shown | Read; IMP-07: 0 unmasked over the set | Reject (as a finding) | — | Non-blocking note: mask, then cut |
| C-07 | "Embedding model not downloaded" (`meaningNote`) is never shown by the page | Design rule 2 | The recorded model equals the active model, but its files are gone | Only by deleting model files by hand: Remove refuses the active model (autobyteus-146), and a switch is `modelChanged` | Read | Reject | — | Not reachable through product actions |
| C-08 | The evaluation's `--asking-run` and the word-share strength on off-topic cues (handoff Known Risks) | R-016, R-009 | — | Gates pass with and without `--asking-run` (#1: 18 vs 11) | IMP-07, IMP-11 | Reject (as a finding) | — | Measurement and calibration questions for the Solution Designer (R-016's "self-references" candidate); not code defects |
| C-09 | Handoff decisions: day-split chunks; skip meaning score ≤ 0; skip a failing run in the Journals step; journal reads in the journal service; member names by address; the internal `pointer` field; `runFolderMemoryDir` containment; inspector reads the memory view only for Raw Traces; plain open shows the first file; Meaning embedding shown as building; reduced motion | Design / spec | — | Each stays inside the design's room or the spec | Read | Reject (as findings) | — | Sound |

## Structural / Design Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Task design health assessment preserved | Pass | One subsystem with one public boundary (`MemorySearch`); existing owners extended at the named points only |
| Matches the behavior-defining supplement | Pass, with CR-002 and CR-003 | Tabs, run detail, the pipeline panel, result anatomy and strength words; coverage fidelity is CR-002; the empty-state copy is CR-003 |
| Data-flow spine | Pass | DS-001…DS-006 traced in code (table above) |
| Ownership boundaries | Pass | Pipeline owns sequence and state; search service owns ranking and pointers; journal service owns every journal read and write; `EmbeddingIndex` owns vectors and relevance |
| Off-spine concerns | Pass | Normalizer (one rule for both sides), masker, settings, raw fingerprint |
| Existing capability reuse | Pass | Journal service, embedding layer, layout, location services, catalogs, the tool manifest pattern, server settings |
| Reusable owned structures | Pass | `MemoryRun` and subject shared by store, search and GraphQL; `readJournalEntries` is the one parser outside rendering |
| Shared-structure tightness | Pass | `MemoryAvailabilitySummary` is tightened (`hasWorkJournal`; the snapshot kept internal); results carry only fields with values |
| Repeated coordination ownership | Pass | One pipeline (single flight, merge) |
| Empty indirection | Pass | The facade owns notes, limit resolution and `meaningSync` triggering |
| Separation of concerns / file responsibility | Pass | Pipeline steps split into `journals-step` and `run-journal-indexer` |
| Dependency direction | Pass | `agent-work-journal` → listener only; `embeddings` has no `memory-search` import; outside callers use `MemorySearch` (plus `domain/` and `settings/`, as designed) |
| Authoritative Boundary Rule | Pass | No tool or resolver reaches the pipeline or store; memory search never reads `work_journal/` or raw traces itself |
| File placement / layout | Pass | — |
| Interface clarity | Pass | Explicit subjects; `nearest`'s explicit `notSynced` (R-5) |
| Naming and one vocabulary (Principle 15) | Pass | Glossary § Memory added; no "Episodic"/"Semantic" left in the UI, tool or API for the old files |
| No unjustified duplication | Pass | The page computes "weak only" from strengths, the same rule the server's `note` applies (minor, not promoted) |
| Patch-on-patch | Pass | — |
| Dead code (Principle 7) | Pass | Removed: readers, flags, converter paths, tabs, specs, 11 strings; `readWorkingContextSnapshot` and `MemoryMessage` gone; grep finds no leftovers outside migration-owned frozen copies |
| Tests clear and requirement-aligned | Pass, with gaps | Every run kind in discovery tests; `nearest` states; live update; tool contract. No test covers SCN-E or SCN-F (CR-001, CR-002) |
| Fixtures / helpers | Pass | `memory-search-fixtures.ts` |
| No stale tests | Pass | Removed-tab specs deleted; GraphQL documents of the gated runtime e2e updated |
| API/E2E readiness | Fail | CR-001, CR-002, CR-003 |

## Source File Size And Structure Audit

| Source file | Before | After | `>500` | `>220` delta | Notes |
| --- | --- | --- | --- | --- | --- |
| `memory-search/pipeline/memory-index-pipeline.ts` | 0 | 277 | Pass | New file over 220: one owner (sequence and state) | CR-001, CR-002 land here |
| `memory-search/store/memory-search-store.ts` | 0 | 183 | Pass | Pass | — |
| `memory-search/runs/memory-run-discovery.ts` | 0 | 173 | Pass | Pass | — |
| `memory-search/search/memory-search-service.ts` | 0 | 163 | Pass | Pass | — |
| `api/graphql/types/memory-search.ts` | 0 | 190 | Pass | Pass | — |
| `embeddings/embedding-index.ts` | 367 | 410 | Pass | +43 | — |
| `pages/memory.vue` | 334 | 445 | Pass | +111 | — |
| `stores/memorySearchStore.ts`, `memoryJournalStore.ts`, `WorkJournalTab.vue` | 0 | 213 / 204 / 192 | Pass | Pass | — |
| Others changed (server settings, schema, compositions, explorer schema, explorer store) | ≤ 382 | ≤ 410 | Pass | small | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | Removed arguments and fields are a clean cut (rejection log followed) |
| No legacy retention | Pass | — |
| Dead code removed in touched files | Pass | — |
| Persisted-data decision followed | Pass | Store and vectors: Discard or Rebuild (unreadable store deleted and recreated; Rebuild clears both). Journals and `runtime_kind: null`: directly usable. Old jsonl files untouched |
| No version-specific dual reads | Pass | The manifest reader accepts `null` as a current value, not an old shape |
| Transition mechanics match | Pass | No migration |

## Dead / Obsolete / Legacy Items Requiring Removal

None open.

## Docs-Impact Verdict

- Docs impact: `Yes`, already done: `memory_search.md` (new), `agent_memory.md`, `agent_work_journal.md`, `embeddings.md`, `README.md`; `GLOSSARY.md` § Memory; web `docs/memory.md`.
- The fixes for CR-001 and CR-002 may need a sentence in `memory_search.md`: which passes show as building, and that live changes during a pass are queued.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise | Status | Reason |
| --- | --- | --- |
| MP-001 (restart, meaning job) | Confirmed | Catch-up skips the Meaning step; `nearest` answers `notSynced`; the facade requests `meaningSync` once built and idle |
| MP-002 (meaning-only pointer) | Confirmed | Pointer rule implemented; evaluation reports 0 empty snippets |
| MP-003 (the pipeline's own notifications) | **Reclassified** | Rule 5 drops by run membership for the whole pass, which also drops agents' live changes. Agents' changes are a distinct trigger with a different consequence (lost state, not wasted work). New premise SCN-E, CR-001 |

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.2

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 | All six spines traceable; pipeline sequence explicit | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One facade; the journal service is the only journal reader and writer; the embedding layer owns relevance | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Subjects explicit; `notSynced` explicit; tool contract per design | — | — |
| 4 | Separation of Concerns and File Placement | 9.3 | Clear split under `memory-search/` | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.3 | Tightened availability; values-only results | Page recomputes "weak only" (minor) | — |
| 6 | Naming Quality and Local Readability | 9.4 | Glossary vocabulary used throughout | — | — |
| 7 | API/E2E Readiness | 8.7 | Strong unit, e2e and probe coverage; gates measured | CR-001, CR-002 untested; CR-003 basis missing | Fix and test; record the decision |
| 8 | Runtime Correctness And Behavioral Fidelity | 8.6 | Search, pointers, masking, nearest, discovery and removal correct | CR-001 (lost live changes), CR-002 (false coverage and building state) | Fix both |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean cut | — | — |
| 10 | Cleanup Completeness | 9.4 | Old path and strings removed | — | — |

## Findings

### CR-001 — Live journal changes are lost while a full, rebuild or catch-up pass runs, and during the first build (Local Fix, implementation)

- **Protects:** R-006 / AC-009 (a turn's change is findable by text within about a minute), R-013 ("afterwards the pipeline keeps itself current"), and MP-003's own premise ("wasted work, not wrong state").
- **Evidence (Read):**
  - `memory-index-pipeline.ts` `onJournalChanged` (L157–171) returns when `!this.isBuilt()`. That is the whole first build, since the built marker is set only at its end (L207).
  - It also returns when `this.inPass.has(memoryDir)`. `journalsStep` puts **every** run of the pass into `inPass` (L249), and `drain` clears it only after all merged passes end (L182).
  - So an agent's turn that changes a run's journal after the pass already re-indexed that run is never queued. It stays unfindable by text until that run changes again, or until the next server start's catch-up. For a run whose last turn falls inside the window (the first build is about 3 minutes; a catch-up at each start), that can be hours or days.
- **Required action:**
  - Drop only the notifications the pipeline's own Journals step causes, for example by marking the run whose `ensureCurrent` it is calling, so rule 5's intent and MP-003 still hold. Queue every other change into the next pass, including while the first build runs; repeated runs cost nothing thanks to content hashes.
  - Add a unit test: a change to an already-indexed run during a full pass is findable by text after the pass and debounce.

### CR-002 — Live and `meaningSync` passes report the index as building with their own tiny progress, so coverage notes are false (Local Fix, implementation)

- **Protects:**
  - R-009: results say how much is covered, which also means not claiming missing coverage.
  - UI spec UXJ-003 / VIS-008: the partial-coverage note is about the journals the index covers.
  - R-013 / UXJ-004: the Index tab shows the user's build, not each turn's upkeep.
- **Evidence (Read):**
  - `status()` (L116–136) returns `state: "building"` and the current pass's steps whenever any pass runs. `pass()` resets the steps for every request kind (L190).
  - During a one-run live pass (after every active run's turn) the text step counts only that run's files. The page's coverage (`MemorySearchResults.vue` L115–119, from `textPct`) then shows "Still indexing: the Text index covers 0% of your journals". The tool's coverage (`memory-search.ts` L121) shows "Indexing in progress: the text index covers 0 of 2 journal files." The Index tab shows Building with "1 of 1 runs".
  - In `modelChanged`, every search requests a `meaningSync` pass (L69–71) that does nothing but shows as building and moves `updatedAt`.
- **Required action:**
  - While a pass that only keeps the index current (`runs`, `meaningSync`) runs, report the index's settled state and coverage. A catch-up may keep showing as building.
  - Don't request `meaningSync` when the Meaning step would skip it (`modelChanged`).
  - Add tests: a search and a status read during a live pass report the complete index; in `modelChanged`, a search starts no pass.

### CR-003 — The Work Journal empty-state copy has no recorded requirement decision (Requirement Gap → Solution Designer)

- **Protects:** the approved basis for visible states (Review Authority; the normative UI spec has no such state).
- **Evidence:**
  - ARCH-REV-002 R-6 asked to record the empty-state copy as a requirements decision before code review. The solution revision record agrees (`solution-revision-record.md` L114: "to be recorded as a requirements decision with the user's confirmation before code review").
  - It is only in `design-spec.md` § Review Corrections (R-1); `requirements-doc.md` has no decision for it.
  - It is the default view of most old local runs before the first build. It was implemented as written (handoff: "awaits the user's confirmation").
- **Required action:** the Solution Designer records the decision, the copy as built or the user's wording, with the user's confirmation as planned. If the wording changes, the implementation engineer updates the en and zh-CN strings in the same rework.

Non-blocking notes:
- **C-06:** mask secrets before cutting snippet lines to 200 characters.
- **C-08:** the evaluation's authoring-run effect and the strength of off-topic cues are calibration questions under R-016, not code defects.

## Follow-ups

- Follow-ups this review added: None. FU-003 and FU-006 were already recorded by the Solution Designer and the implementer.

## Classification

- `Requirement Gap` (CR-003): a visible state's decision is not recorded.
- `Local Fix` (CR-001, CR-002): bounded pipeline and status corrections inside the design's intent (rule 5's purpose, MP-003, R-009). They go to implementation in the same rework, after the Solution Designer records CR-003.

## Recommended Recipient

- `/software_engineering_team/solution_designer` (`Requirement Gap` CR-003). It then hands the rework, including CR-001 and CR-002, to implementation.
- Routing note: after the rework, a targeted code review, then API/E2E.

## Residual Risks

- Gate 2 latency was measured under load 30–40 (p90 575 ms, max 964 ms); API/E2E should re-measure on an idle reference machine.
- AC-012 and AC-013 (real agents; tool selection), the Electron page, and AC-009 in the running app are downstream.
- `listJournalFiles` reads every journal file of a run on each Work Journal read (multi-MB runs). Acceptable for the page; a cache keyed by `content_sha256` is the next step if it is measured slow.
- R-3 (accepted): line drift in the open file's last entry.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review` (round 1, full review)
- Supported Product Scenario Gate: `Pass` (SCN-E and SCN-F added)
- Material-Premise Gate: `Pass` (MP-003 reclassified, driving CR-001)
- Score Summary: 9.2/10. Below 9.2: API/E2E Readiness 8.7, Runtime Correctness 8.6.
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/solution_designer` (`Requirement Gap` CR-003; `Local Fix` CR-001, CR-002 to follow in the same rework)
- Notes: a well-structured, faithful implementation of a large design. Search, pointers, discovery, `nearest`, the journal boundary, the tool in both entry forms and the clean removal are all correct. The two runtime findings sit in the pipeline's handling of concurrent live updates.
