# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review` (round 3). Round 2 (`CRR-002`, Pass) is the latest implementation-review result; its sections below are carried forward.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-004/SR-004b: UD-018 the empty-state copy, UD-019 weighted strength, AC-007 refined; earlier SR-001/SR-002 approvals stand)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (AE-01…AE-21, as cited by the design)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001…SR-003)
- Design Spec Reviewed As Context: `design-spec.md` (SR-003: DS-001…DS-006, § Meaning Step Rules 1–5, § Run Kinds, § Tool Contract, § Review Corrections, § Product Design Integration)
- Supplemental Task Artifacts Reviewed As Context: the approved UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/work-journal-search/ui-ux-spec.md` (UXJ-003, state table, exact labels, Implementation Fidelity Boundary); `memory-search-evaluation-report.md`; `follow-ups.md`
- Relevant Solution Revision IDs: SR-002, SR-003, SR-004, SR-004b
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002, Pass; MP-001…MP-003; R-1…R-7)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001, ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-002)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Current Review Round: 3 (failure-origin; Review Scope `N/A`)
- Review Scope: `Full Re-Audit` of the changed subsystem (round 1: `Full Review`)
- Review Scope Evidence (round 2): the delta `c66708b44b..41501c5a41` (source commits `0ca22eaa1c`, `8529960b80`, `41501c5a41`; ticket folder `e183aded53`) changes the pipeline's status semantics and live-update rule (CR-001, CR-002), and adds a requirement change beyond the prior findings: UD-019, rarity-weighted strength, with a new `chunk_vocab` virtual table in the store, a new normalizer function and a new store query. It also changes the evaluation (SR-004b kinds). So the structural checks and the full scorecard were rerun for `src/memory-search/**`. The web is unchanged since round 1 (`git diff --stat` shows no `autobyteus-web` change), so round-1 web evidence carries forward.
- Trigger: implementation engineer handoff for IR-002 (after SR-004/SR-004b)
- Prior Review Round Reviewed: round 2 (`CRR-002`, Pass)
- Latest Authoritative Round: 3
- Failure-origin context (round 3):
  - trigger: API-REV-001 (`/software_engineering_team/api_e2e_engineer`), **F-001** (AC-007 / R-009);
  - code tested: `41501c5a41`, plus test `06fdc1306a`; evidence commits `c7a2f3b972`, `d07abb8ab2`;
  - reports: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`;
  - command: `node evidence/api-e2e/probes/API-PROBE-offtopic.mjs <graphqlUrl>`; mechanism: `probes/API-PROBE-meaning-scores.mjs`;
  - evidence: `evidence/api-e2e/F-001-01-offtopic-cues.txt`, `F-001-02-meaning-scores.txt`, `F-001-03-offtopic-cues-leaf-ir.txt`;
  - testing guideline: the worktree `TESTING.md`.
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

## API/E2E Failure-Origin Review (Round 3, CRR-003): F-001

### The failing scenario represents approved behavior

- **Scenario:** a user or an agent asks about work no local run did: a codename, work done on another node, or plain words ("What did we decide about the sauerkraut supplier contract?").
- **Approved basis:**
  - R-009: honest results; never "nothing in memory", but weak matches are said to be weak.
  - AC-007 as refined by SR-004b: off-topic cues, "key words occur in no run, verified by count", end with the only-weak note.
  - UC-001: an agent asks with a vague cue.
- **Supported:** the cues meet that definition exactly; API/E2E counted each key word: pelicanmarigold 0, xylophonequartz 0, orchidtundra 0, falconsaffron 0, tortellini 0, bagpipe 0, sauerkraut 0. The trigger is the real one: the page's GraphQL search and real agents (an absent codename was asked in AC-012).
- **Count correction:** T2 has words that do occur, so it is `partial` (not gated) under SR-004b. The gated result is **8 of 10 off-topic cues fail**, still clearly failing AC-007.
- This is not an invalid test or a fixture problem. The curated R-016 set (N02, N04, N05) still passes because its cues happen to stay below the floor; the set is too narrow to represent AC-007's definition.

### Origin analysis

- **Mechanism (Measured by API/E2E, consistent with the code I reviewed):**
  - `MemorySearchService` maps `nearest`'s relevance to strength: `relevant` → Strong, `aboveFloor` → Fair, `below` → Weak.
  - `EmbeddingIndex.nearest` computes `relevant` with the model's catalog rule (`selectRelevant`: best ≥ `clearMatchFloor`, then everything within `nearBestMargin` of the best). That calibration was made for **Project Tasks** (autobyteus-71).
  - On journal cards, off-topic cues score 0.77–0.80, right at Granite's floor of 0.78. When the best card just clears the floor, every card within 0.02 is "relevant": 70–84 Strong cards. When it misses by 0.01, there are none. Real answers score 0.89–0.93 with one relevant card.
  - The same happens with LEAF-IR (floor 0.30). So the threshold transfer is wrong in general, not for one model.
- **The code matches the reviewed design:**
  - design § Tool Contract: "meaning: `relevant` → strong, `aboveFloor` → fair, `below` → weak (from `nearest`)";
  - § Interface Boundary Mapping: "The calibration stays in the layer; memory search maps the three values to Strong / Fair / Weak".
  - It is not an implementation defect.
- **Design origin:**
  - The design reuses a per-model relevance calibration made for one collection (Project Task descriptions) as the strength rule for a different collection (journal cards), with no calibration for cards.
  - Its "near-best" membership is built for picking matches, not for labelling absolute strength.
  - The R-016 check, the only calibration evidence, has an off-topic set too narrow to show this.
  - Fixing it needs a design decision about where per-collection meaning calibration lives. Options the evidence suggests, none decided:
    - (a) calibration per collection in the embedding layer (changes its contract);
    - (b) memory search owns its own absolute thresholds on raw scores, calibrated on journal cards (changes the "calibration stays in the layer" boundary);
    - (c) a strength rule for memory not built on near-best membership, e.g. a meaning match is at most Fair unless the text tier agrees.

    Any option also needs AC-007's evaluation set widened to represent its definition (codenames, absent topics in sentences, plain words) per R-016.
- **Review gap?**
  - Round 1 raised off-topic strength in general (C-08, handed to the Solution Designer as a calibration question). The upstream answer (UD-019) addressed only the text tier.
  - The meaning-tier calibration transfer was a reviewed design decision (ARCH-REV-002). From the source it shows only as reuse of an approved boundary. The failure needs measured card scores, which only exist at runtime on a real-size index. So it was not reasonably detectable as a code defect in source review. I am noting it, not attributing a source defect.
- **Classification:** `Design Impact` → Solution Designer, which decides the calibration owner and rule; the evaluation set is extended as part of it. Requirements are unchanged (AC-007 as refined is clear); if the remedy changes visible strength semantics, that is the Solution Designer's call with the user.

### Other API/E2E notes (not findings of this round)

- **API-D01:** the new durable test `memory-run-discovery.test.ts` "never finds runs imported from another node by Memory Sync (AC-006)" (commit `06fdc1306a`) waits for the proportional test review after API/E2E passes.
- **Observations:**
  - O-1 (tool adoption depends on phrasing) and O-3 (self-references) are product and calibration questions for the Solution Designer.
  - O-2: the index store is 610 MB against an estimate of 100–300 MB. A risk to note; no requirement sets a disk budget for the index beyond "must not keep a second full copy of the journal text", which holds (contentless FTS5).
  - O-4 (the Embedding switch dialog doesn't mention the memory index) is autobyteus-146 copy, outside this ticket. The API/E2E engineer, who found it, records it in `follow-ups.md` if it is wanted; this review adds no row.
  - O-5: dates in a copied data set, not reachable on a normal install.
- **Disclosed side effects:** one agent ran a read-only `ls` under the user's real `~/.autobyteus`, following an old pointer, and Codex chats listed connectors. These are for the API/E2E engineer's report and the Solution Designer's awareness; they don't affect the origin.

## Round 2 (CRR-002): Full Re-Audit of IR-002

### Prior findings

| Finding | Resolution | Verification (`Read`, plus the recorded tests) |
| --- | --- | --- |
| CR-001 | **Resolved** | `onJournalChanged` now drops only notifications from the Journals step's own `ensureCurrent`: the run is held in `ownJournalCalls` only while that call is in flight. Every other change is queued, also during the first build; the timer defers it until a build runs or exists, and a `runs` pass before any build indexes nothing. A live turn serialized just ahead of the pipeline's own call on the same run may be dropped, but that pass's Text step indexes the run afterwards, so nothing is lost (rule 5 holds). Tests: "queues a live change made while a pass runs: during the first build and during a later full pass"; "drops only its own Journals step's notifications". Both fail on the previous code (handoff) |
| CR-002 | **Resolved** | Only `full`, `rebuild` and `catchUp` are shown (`SHOWN`). `runs` and `meaningSync` use their own `passSteps`, and `status()` reports the settled index while they run. A failure in them changes nothing reported. `meaningSync` is requested only when `canSyncMeaning()` holds, so `modelChanged` starts no pass, and it no longer moves `updatedAt`. Meaning progress counts only the build's own embedding (`buildEmbedding`, cleared when it completes); the facade's meaning note follows. Tests: settled status and no false coverage during a held-open live pass; no `meaningSync` in `modelChanged` |
| CR-003 | **Resolved upstream** | UD-018 (SR-004) records the copy as built; the implementation already matches |
| C-06 (note) | Applied | Each snippet line is masked, then cut; test at the cut edge |

### Re-audit of the delta

| Area | Result | Evidence |
| --- | --- | --- |
| UD-019 strength | Pass | `textStrength` = the weighted share of terms found. Weight = BM25 IDF from the index's own vocabulary (`fts5vocab` 'row' over `chunk_text`), floored at 1e-6; a multi-token term weighs as its rarest token (`termTokens` follows `unicode61`). Thresholds unchanged (2/3, 1/3); the rule stays only in `MemorySearchService`. Test: rare versus common words |
| Store | Pass | `chunk_vocab` is created with `IF NOT EXISTS` on open. It is a view over the existing FTS index, so stores built earlier need no rebuild and the schema version stays. `tokenChunkCounts` is read-only |
| Evaluation (R-016, SR-004b) | Pass | Kinds `answerable` / `offTopic` / `partial`; off-topic must end with the only-weak note, and `falseOnlyWeak` lists answerable questions that wrongly did; partial questions are reported, not gated; the file format is documented |
| Ownership / boundaries | Pass | Unchanged: status and pass kinds stay in the pipeline, notes in the facade, strength in the search service, vocabulary in the store |
| Size | Pass | Pipeline 277 → 326, search service 163 → 189, store 183 → 194, facade 141, evaluation 160; all under 500, one owner each |
| Docs | Pass | `memory_search.md`: pass kinds and status, live changes during a pass, strength, snippet order; `evaluate-memory-search.md`: question kinds |
| Checks | Pass (recorded) | IMP-16 (369 tests including `tests/unit/api`; memory e2e 20 in a clean environment; typecheck). IMP-17 on the isolated copy: gate 1 31/31 (30/31 in one search), gate 2 top 3 26/31, p90 556 ms, max 879 ms, off-topic 3/3, `falseOnlyWeak` [], 0 unmasked. These cover the reviewed code, so none was rerun |

### Candidates (round 2)

| Candidate | Observation | Disposition | Reason |
| --- | --- | --- | --- |
| C-10 | `meaningProgress` clears `buildEmbedding` while computing the status (a small side effect in a read) | Reject (as a finding) | Idempotent, and it only stops counting a finished embedding; no wrong state |
| C-11 | The partial questions N01 and N03 end with fair matches | Reject | SR-004b scopes them out of AC-007 (their key words describe real work) |

### Score update (round 2, full scorecard)

- API/E2E Readiness 8.7 → 9.3: the findings are fixed and tested; AC-007 has an evaluation check.
- Runtime Correctness 8.6 → 9.3: live changes are kept and coverage is honest.
- Shared-Structure 9.3 → 9.4: the page's weak-only rule now has a server counterpart with a calibrated weight.
- Other categories unchanged.
- Overall 9.4/10; every category ≥ 9.2.

## Upstream Behavior And Production-Path Basis Confirmation (round 1)

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

- Round 3: `Design Impact` (F-001: meaning-strength calibration for journal cards).
- Round 2: N/A — `Pass` (CR-001 and CR-002 resolved; CR-003 resolved by UD-018).
- Round 1: `Requirement Gap` (CR-003), `Local Fix` (CR-001, CR-002).

## Recommended Recipient

- Round 3: `/software_engineering_team/solution_designer` (`Design Impact`, F-001).
- Round 2: `/software_engineering_team/api_e2e_engineer` (primary pass handoff); `/software_engineering_team/implementation_engineer` (informational).
- Round 1: `/software_engineering_team/solution_designer`.

## Residual Risks

- Gate 2 latency was measured under load 30–40 (p90 575 ms, max 964 ms); API/E2E should re-measure on an idle reference machine.
- AC-012 and AC-013 (real agents; tool selection), the Electron page, and AC-009 in the running app are downstream.
- `listJournalFiles` reads every journal file of a run on each Work Journal read (multi-MB runs). Acceptable for the page; a cache keyed by `content_sha256` is the next step if it is measured slow.
- R-3 (accepted): line drift in the open file's last entry.

## Latest Authoritative Result

- Review Decision: `Fail` (failure-origin review of API-REV-001)
- Review Entry Point: `API/E2E Failure-Origin Review` (round 3)
- Supported Product Scenario Gate: `Pass` (absent-work cues per AC-007 as refined; real triggers)
- Material-Premise Gate: `Pass`
- Score Summary: no new scorecard for a failure-origin round (round 2: 9.4/10)
- Failure Origin: `Design Impact`. Meaning strength reuses the embedding catalog's Project-Task relevance (floor plus near-best margin) for journal cards, with no calibration for them. Off-topic cues sit right at the floor, so 8 of 10 gated off-topic cues return many Meaning/Strong matches with no only-weak note. The code matches the design. Not an implementation defect, not a test problem, and not reasonably detectable in source review
- Recommended Recipient: `/software_engineering_team/solution_designer`
- Notes: the Solution Designer decides where per-collection meaning calibration lives and the strength rule (options in the origin analysis), and widens AC-007's evaluation set to its definition (R-016). API-D01 waits for the proportional test review.
