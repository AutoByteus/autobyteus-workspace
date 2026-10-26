# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-search/tickets/in-progress/work-journal-search/requirements-doc.md` (SR-001, approved by the user 2026-10-26; refined by UD-016 and, at SR-002, UD-017)
- Upstream Investigation Notes: `.../investigation-notes.md` (AE-01…AE-21)
- Upstream Solution Revision Record: `.../solution-revision-record.md` (SR-001…SR-005)
- Reviewed Design Spec: `.../design-spec.md` (SR-005: § Meaning Strength (SR-005), the `nearest` interface row, Tool Contract, Risks; the rest as in SR-003/SR-004)
- Supplemental Task Artifacts Reviewed:
  - the approved UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/work-journal-search/ui-ux-spec.md`, normative VIS-001…VIS-024, design repository `personal` @ `d01192275c`;
  - `memory-search-evaluation-report.md`;
  - `probes/` (including `memory_backend.py`);
  - `product-design-request.md`;
  - `follow-ups.md`;
  - `handoff-architecture-review.md`.
- Relevant Solution Revision IDs: SR-001…SR-003; SR-004 (code review CR-003, UD-018/019); SR-005 (API/E2E F-001 → code review CRR-003, Design Impact)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: Solution Designer targeted re-review request for SR-005 (2026-10-26). Scope: § Meaning Strength (SR-005), `EmbeddingIndex.nearest`, the strength ownership, AC-007 widening, O-1
- Prior Review Round Reviewed: round 2 (`ARCH-REV-002`, Pass)
- Latest Authoritative Round: 3
- Current-State Evidence Basis: worktree `codex/work-journal-search` @ `ddd6fdcdf6` (no source changes). Opened:
  - `embeddings/embedding-index.ts`:
    - L106–116 `search` syncs, then queries;
    - L118–121 `sync`: "removes absent items, schedules missing or changed ones";
    - L353–372 `query` scores only `job.freshVectors()`;
    - L346–352 `readinessOf`;
    - `collectionStatus`, `activeModelOnDisk`, `fingerprintItems`.
  - `embeddings/collection-indexing-job.ts`: `sync` (L72–79) removes vectors of absent items; `freshVectors` (L89–94) is built from the job's own `items`, set only by `sync`.
  - `agent-work-journal/domain/work-journal-models.ts:10-14` (AE-01).
  - `agent-work-journal/services/work-journal-service.ts`:
    - L48–54: the only writer, serialized per folder;
    - reuse rule `previous.runtime_kind === target.runtimeKind`;
    - a per-file `content_sha256` in the manifest.
  - `agent-memory/store/agent-memory-layout.ts` L40–100: a team member's folder basename = `agentRunId`.
  - `autobyteus-ts/src/tools/base-tool.ts` (`agentId`); `agent-tools/mcp/agent-tool-mcp-session.ts:28-32` (owner `runId`).
  - `autobyteus-ts/src/tools/file/read-file.ts:13`: absolute paths are used directly.
  - `api/graphql/types/memory-view.ts`: L136–210, three subject queries with a `source` argument and the `include*` flags.
  - `api/graphql/converters/memory-view-converter.ts:64-65`.
  - `run-history/projection/providers/local-memory-run-view-projection-provider.ts:43-44`.
  - `autobyteus-web/localization/messages/{en,zh-CN}/memory.generated.ts`.

## Routing Classification Review

- Task size: `Large`. A new subsystem (`memory-search`), a new tool family, new GraphQL types, boundary additions in two subsystems, an API removal path, and a new Memory page.
- Architectural risk: `High`. A new persisted store, changed shared contracts (`EmbeddingIndex`, `WorkJournalTarget`, the journal notification), a new agent-facing contract, background concurrency, derived writes into about 3,600 run folders, and a privacy surface.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements understood: Yes.
  - Episodic memory made findable: `search_memory(query, limit?)` and the Memory page search return time-aware pointers to Work Journal lines.
  - Coverage is every run on this node.
  - Indexing is a user-started pipeline (Find runs → Journals → Text → Meaning) that then keeps itself current.
  - Local only; secrets masked; honest results.
  - Old per-run Episodic/Semantic and Working Context removed (R-014, UD-017).
- Relevant existing behavior confirmed: Yes. Each item was opened at its cited lines (Current-State Evidence Basis): the journal service is the only writer and the runtime is required (AE-01, AE-03); the embedding layer's sync and fresh-vector semantics (AE-05…AE-07); the asking-run identity on both tool paths (AE-09); subject-split memory views (AE-10).
- Scope guardrail confirmed: Yes. UC-001…UC-008. Out of scope: imports, answering, summaries, filters, FU-001…FU-005. Preserved: raw traces are the authority; the raw reader's tail repair; the embedding boundary and `search_project_tasks`; existing lists and Raw Traces. Review Authority as stated.
- Every prospective blocking `Design Impact` finding is traceable: `Yes`
- Remaining material ambiguity: none at the requirements level.
- Statements about existing code the design relies on, opened at their cited lines:
  - AE-01, AE-02, AE-03, AE-05, AE-06, AE-07, AE-09, AE-10, AE-11 and AE-13 are confirmed.
  - The derived-consumer table's claim about the reuse comparison is confirmed (`work-journal-service.ts`, reconcile).
  - The SR-002 consumer table now lists `memory-view-converter.ts` and `local-memory-run-view-projection-provider.ts:40-45` (in the Working Context row). It omits `memory.generated.ts` (AR-003).
  - DS-001 says it "syncs the card collection". Measured against `sync`'s "complete current item set" contract (`embedding-index.ts` L118–121, `collection-indexing-job.ts` L72–79), the design never states which set is passed (AR-001).

| Behavior ID | Kind | Design Alignment | Trigger / Current-State Evidence | Target Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass (AE-04) | Pass: DS-003 syncs the complete set (Rule 1) | Confirmed | — (AR-001 resolved) |
| BEH-002 | Operational | Pass | Pass (AE-03) | Pass | Confirmed | — |
| BEH-003 | User | Pass | Pass (AE-10, AE-11) | Pass: pointer rule; removal complete | Confirmed | — (AR-002, AR-003 resolved) |
| BEH-004 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | User / agent | Pass | Pass (AE-08, AE-09) | Pass: Rules 3–4; pointer rule | Confirmed | — |
| DS-006 (catch-up; system behavior) | System | Pass | Pass (startup step 9, AE-15) | Pass: in call order (SR-003) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Clear? | Linked? | Internally Complete? | Consistent With Core Artifacts? | Status / Approval Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| UI/UX spec + VIS-001…VIS-024 | Pass | Pass | Pass | Pass (meaning matches now carry lines via the pointer rule; see R-6 for the empty Work Journal state) | Pass | — |
| `memory-search-evaluation-report.md` | Pass | Pass | Pass | Pass | Pass (evidence) | — |
| `probes/` | Pass | Pass | Pass | Pass. Note: `memory_backend.py` L64 used `lines: "1-60"` for meaning matches, which is evidence for AR-002 | Pass (evidence) | — |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Present for the posture | Pass | `Feature`, with in-scope vocabulary cleanup | — |
| Root cause explicit and evidence-backed | Pass | `No Design Issue Found` for the feature; the Episodic/Semantic vocabulary item handled in scope (AE-10, AE-11) | — |
| Refactor decision explicit | Pass | `No`, beyond the boundary additions and the cleanup | — |
| Supported by the design sections | Pass | Change Scope, derived consumers, Removal Plan | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade vs Owner Clear? | Naming Clear? | One Owner Per Node, In Call Order? | Off-Spine Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Build | Pass | Pass (Rule 1) | Pass (`MemorySearch` facade → `MemoryIndexPipeline`) | Pass | Pass | Pass | Pass |
| DS-002 | Search (native, MCP, page) | Pass | Pass (pointer rule; post-restart path redrawn) | Pass | Pass | Pass | Pass | Pass (R-5) |
| DS-003 | Live update | Pass | Pass (complete set, Rules 1–2) | N/A | Pass | Pass (a notification, not a passed function) | Pass | Pass |
| DS-004 | Open a journal | Pass | Pass (read-only through the journal service; R-1) | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Pipeline steps | Pass | Pass, with the explicit "embedding model changed" rule | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Catch-up | Pass | Pass | N/A | Pass | Pass (the pipeline drives; Meaning deferred to the first search or live pass) | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear? | Internals Stay Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `MemorySearch` | Pass | Pass | Pass | Pass | Tools, GraphQL and startup depend only on it |
| `WorkJournalService` | Pass | Pass | Pass | Pass | Only reader of raw traces; only writer and reader of journals; the entry reader is the one parser outside rendering |
| `EmbeddingIndex` | Pass | Pass | Pass | Pass | `nearest` is added on the boundary; the calibration stays inside |
| `TaskTeamRootMemorySource` | Pass | Pass | Pass | Pass | One reader for the explorer, the memory-view resolution and discovery |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear? | Forbidden Explicit? | Direction Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `memory-search` → journal, embeddings, agent-memory, run-history, config, settings | Pass | Pass | Pass | Pass | — |
| `agent-work-journal` ↛ `memory-search` | Pass | Pass | Pass | Pass | Listener registered by the pipeline |
| `embeddings` ↛ `memory-search` | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject Clear? | Responsibility Singular? | Identity Explicit? | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `MemorySearch.search/indexStatus/startIndexing/rebuild` | Pass | Pass | Pass | Low | Pass |
| `WorkJournalService.onJournalChanged`, `listJournalFiles`, `readJournalLines` | Pass | Pass | Pass (`memoryDir` from subject resolution; manifest-validated file) | Low | Pass |
| `readJournalEntries` | Pass | Pass | Pass | Low | Pass |
| `EmbeddingIndex.nearest(collection, queryText, {limit})` | Pass | Pass | Pass | Low | Pass (SR-005: scores plus `collection` synced/notSynced; R-8) |
| Tool `search_memory` | Pass | Pass | Pass (asking run: native `agentId`, MCP `owner.runId`, both = the folder basename / `agentRunId`) | Low | Pass (pointer rule) |
| GraphQL `memorySearch`, `memoryIndexStatus`, `startMemoryIndexing`, `rebuildMemoryIndex`, `runFolderWorkJournal`, memory-view Work Journal part | Pass | Pass | Pass (`AGENT` / `TEAM_MEMBER` / `ORG_MEMBER` / `RUN_FOLDER`) | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked? | Decision Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Journals, format parsing | Pass | Pass | Pass (entry reader in the format owner) | Pass | — |
| Vectors | Pass | Pass | Pass (`nearest`) | Pass | — |
| Run attribution | Pass | Pass | Pass (`TaskTeamRootMemorySource`, AE-20/21) | Pass | — |
| Tool exposure, settings | Pass | Pass | N/A | Pass | — |
| Text index | Pass | Pass | Pass (contentless FTS5, AE-16) | Pass | — |
| Opening a pointer | Pass | Pass | N/A | Pass | Native `read_file` takes absolute paths (`read-file.ts:13`), so UC-003 holds |

## Subsystem / Capability-Area Allocation Verdict

| Area | Ownership Clear? | Reuse/Extend Sound? | Supports Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `memory-search` | Pass | Pass | Pass | Pass | — |
| `agent-work-journal` | Pass | Pass | Pass | Pass | — |
| `embeddings` | Pass | Pass | Pass | Pass | — |
| `agent-tools/memory`, GraphQL, `agent-memory`, web | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Structure | Evaluated? | Shared File Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `MemoryTextNormalizer` (index and query) | Pass | Pass | Pass | Pass | One rule for both sides |
| Domain models (`MemoryRun`, `JournalChunk`, `JournalCard`, `MemorySearchResult`, `MemoryIndexStatus`) | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Controlled? | Core vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `WorkJournalTarget.runtimeKind: RuntimeKind \| null` | Pass | Pass | Pass | N/A | Pass | `null` = not recorded (AE-02) |
| `MemoryAvailabilitySummary` (`hasWorkJournal` added; the three old flags removed) | Pass | Pass | Pass | N/A | Pass | — |
| Result match `{journalFile, lines, day, snippet, matchedBy, strength}` | Pass | Pass | Pass | N/A | Pass | Meaning pointer rule; card parts stored |

Derived consumers of a changed structure, listed with a decision for each (Principle 11): `Pass` (`memory.generated.ts` added in SR-003).

Each domain word keeps one meaning (Principle 15): `Pass`. The glossary's Memory section is added. Note R-4 on "Words" vs `text`.

## File Responsibility Mapping Verdict

| File | Singular? | Matches Owner? | Re-tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `memory-search/**` (13 files) | Pass | Pass | Pass | Pass | — |
| Journal, embeddings, tools, GraphQL, agent-memory, startup | Pass | Pass | N/A | Pass | — |
| Web mapping (SR-002, SR-003) | Pass | Pass | N/A | Pass | Includes the `memory.generated.ts` removal |

## Subsystem / Folder / File Placement Verdict

| Path | Placement Clear? | Folder Matches Owner? | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/memory-search/{domain,settings,runs,pipeline,index,store,search,evaluation}` | Pass | Pass | Low | Pass | — |
| `agent-work-journal/reading/journal-entry-reader.ts` | Pass | Pass | Low | Pass | — |
| Index store under `<appData>/memory-search/` (outside the memory folder, AE-18) | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Episodic/Semantic view fields, args, readers, flags, web tabs and badges | Pass | Pass | Pass | Pass | — |
| Working Context view field, option, tab (UD-017) | Pass | Pass | Pass | Pass | The snapshot file stays |
| `localization/messages/{en,zh-CN}/memory.generated.ts` keys for `EpisodicTab`, `SemanticTab`, `MemoryBadges.episodic/semantic` and Working Context | Pass | N/A | Pass | Pass | Added in SR-003 |

## Legacy / Backward-Compatibility Verdict

| Area | Legacy Retained? | Clean Cut Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| `include*` flags | No | Pass | Pass | No-op flags rejected |
| Old tabs | No | Pass | Pass | — |

## Persisted-Data Transition Verdict

| Subject | Decision | Evidence Sufficient? | Proportionate? | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `memory-search.sqlite` | Discard or Rebuild | Pass | Pass | N/A | Pass | — |
| Card vectors in `embeddings.sqlite` | Discard or Rebuild | Pass | Pass | N/A | Pass | — |
| Old runs' Work Journals | Directly Usable — No Migration (derived output) | Pass | Pass | N/A | Pass | — |
| Manifest `runtime_kind: null` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | — |
| `episodic.jsonl` / `semantic.jsonl` | Not Affected | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic? | Temporary Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–9 and the staged plan | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed? | Present? | Avoided Shape? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Live update, meaning query, opening a result, unknown runtime | Yes | Pass | Pass | Pass | — |
| A meaning match's pointer; the catch-up meaning sync | Yes | Pass | N/A | Pass | Pointer rule; Meaning Step Rules |

## Material Premise Validation

### `MP-001` — The server restarts after a build; nothing has synced the card collection since

- Related requirement: R-003 (two kinds of matching), R-006, R-009 (coverage honesty), R-013 ("afterwards the pipeline keeps itself current"); AC-001 and AC-002 were measured with text plus cards.
- Relevant behavior IDs: BEH-005; DS-006.
- Initiating basis kind: `System` / `User`.
- Trigger: the user quits and reopens the desktop app, or a Docker or self-hosted server restarts, after the first build. DS-006 itself names "Server start (step 9) after an earlier build".
- Forward path:
  - At start, `EmbeddingIndex` has no `CollectionIndexingJob` for `memory-journal-cards`. Jobs exist only after `sync`, and `freshVectors()` is built from the job's `items`, which `sync` sets (`collection-indexing-job.ts` L72–79, L89–94).
  - DS-006 catch-up runs the pass. Its Meaning step follows R-013's "processes only what changed since its last run". With no card changed, a natural implementation does not call `sync`.
  - An agent then calls `search_memory` → `nearest` → no job, or a job with no fresh vectors.
- Consequence: the meaning tier is silently empty after every restart until some card changes. If the change instead syncs only that run's cards (DS-003: "re-indexes only that run's changed files"), `sync` removes every other card's vectors (`embedding-index.ts` L118–121) and re-embedding about 7,400 cards takes about an hour. Either way the gates' text-plus-cards basis is lost, and the coverage note may not say so.
- Reachability: `Reachable` (every restart after a build).
- Review consequence: AR-001.

### `MP-002` — A run is found only by meaning, and the user or agent opens it

- Related requirement: R-002 (each match carries the journal file path, lines, day, snippet); UI spec UXJ-002, the result anatomy and the Implementation Fidelity Boundary ("opening a result at its lines with the highlight and banner"); AC-002 (right journal lines in 2 steps).
- Initiating basis kind: `User` (Memory page Search tab, then clicking a Meaning match) / `Contract` (an agent's `search_memory` result).
- Path: the meaning tier returns a card. A card stands for a whole journal file, built from its first requests, first reply openings and distinct actions. The design never says which `lines`, `day` and `snippet` such a match carries.
- Consequence: the implementation must invent a pointer. The probe used `lines: "1-60"` (`probes/memory_backend.py` L64), which highlights the file head. The approved UI and the 2-step criterion rely on the pointer being meaningful.
- Reachability: `Reachable`. Meaning-only finds are part of the measured gains (report § 5.2: text plus cards against text alone).
- Review consequence: AR-002.

### `MP-003` — The pipeline's own Journals step triggers the journal-change notification

- Trigger: Index now. The Journals step calls `ensureCurrent` for about 3,600 runs, and each one writes and notifies (DS-003).
- Consequence: the live queue then re-processes every run after the pass. The Text step's content-hash check (the manifest's `content_sha256`) makes that a no-op, so the cost is wasted work, not wrong state.
- Reachability: `Reachable`. It drives only recommendation R-2.

## Round 2 Verification (SR-003)

Each affected spine redrawn in call order:

- **DS-003 (live update):** `WorkJournalService.ensureCurrent → notify(JournalChanged) → MemoryIndexPipeline.onJournalChanged → queue(run) → [20 s] → pass(runs=[R]): Text (changed hashes) → JournalCardBuilder → MemorySearchStore (cards) → Meaning step, if allowed: MemorySearchStore.allCards → EmbeddingIndex.sync(complete set)`. One owner (the pipeline) calls each mechanism in order.
- **DS-006 (catch-up):** `startup step 9 → MemorySearch.start → (built) MemoryIndexPipeline.request(catchUp) → Find runs → Journals (raw fingerprint changed) → Text → cards → Meaning deferred`. The first search or the first live pass creates the meaning job. No model load at server start, so autobyteus-71 AC-012 is preserved.
- **DS-002 after a restart:** `MemorySearch.search → MemorySearchService.search → MemorySearchStore.textCandidates + EmbeddingIndex.nearest` (no job → empty plus `preparing/loading`) `→ results (text tier) with the coverage note "Meaning index is loading" → MemorySearch requests MemoryIndexPipeline.request(meaningSync)`. The pipeline then runs the Meaning step under Rule 2, which builds the job, loads the model from disk and makes fresh vectors available to the next search.

Findings rechecked:

- **AR-001 — Resolved.** § Meaning Step Rules:
  - (1) every Meaning step passes the complete card set to `sync`, matching `sync`'s complete-set contract at `embedding-index.ts:118-121`;
  - (2) when the step may run: by the user's click always; on catch-up and live updates only for the recorded `meaningIndexModelId` with `activeModelOnDisk()`, so they never download. This is consistent with autobyteus-146 REQ-011's gate on the parallel Project Task path (Principle 1);
  - (3) the decision for question (d): no load at start; the first search or live pass creates the job;
  - (4) `nearest` defined for no job, model files missing, loading and ready. It never creates a job and never downloads, and a worker stopped by the idle timer restarts from disk.
- **AR-002 — Resolved.** The ordered pointer rule (a text chunk in the same file → the card part with the most query terms → the first request) is owned by `MemorySearchService`. Card parts with `lineStart`/`lineEnd`/`day` and offsets are stored, with no extra journal text. The evaluation checks that meaning-only matches point inside their file, and reports which rule resolved each match.
- **AR-003 — Resolved.** The Removal Plan and the web mapping remove the `memory.generated.ts` keys (en, zh-CN) and keep the localization parity tests green.
- **R-1…R-4 — answered** in § Review Corrections:
  - R-1: Work Journal per source, read-only, never generated on view;
  - R-2: the pipeline drops notifications for runs in the running pass (Rule 5);
  - R-3: line drift limited to the open file's last entry, accepted;
  - R-4: a glossary note for "Words" and "Meaning".

## Round 3 Verification (SR-005)

- **Trigger and evidence.** API/E2E F-001 (code review CRR-003, `Design Impact`). `evidence/api-e2e/F-001-02-meaning-scores.txt` shows the reused Project Task rule (`clearMatchFloor 0.78`, `nearBestMargin 0.02`) marking off-topic cues Strong:
  - for example `pelicanmarigold9152`: top-5 0.7826…0.7745, with 70 cards "relevant";
  - off-topic best scores are 0.745–0.804 and flat (best-to-5th gap ≤ 0.018), while real answers are 0.890–0.933 with a gap of 0.10–0.12;
  - the same happens with LEAF-IR.

  So the round-1/2 premise that the layer's relevance flag could serve memory strength (AE-06; ARCH-REV-002 accepted the three-value `relevance`) is contradicted by production data. The design change is warranted.
- **Spine and owner, in call order (DS-002 meaning tier):** `MemorySearchService.search → EmbeddingIndex.nearest(cards, q, {limit: 300})` (ranked `{id, score}`, `collection: synced | notSynced`, readiness) `→ MemorySearchService: baseline = score at rank k → lift per card → Strong / Fair / Weak → interleave with text → only-weak note when no strong match`.
  - The strength fact has one owner, `MemorySearchService` (Principles 11 and 13), and the text tier's strength is owned by the same service.
  - The embedding layer keeps `selectRelevant` and its calibration for Project Task `search` only, so autobyteus-71 behavior is preserved.
  - `nearest` loses the three-value `relevance`, which is dead after this change (Principle 7). The new `collection: synced | notSynced` field is the explicit "no job" result asked for in R-5. **R-5 is resolved.**
- **Requirements.** The labels and the only-weak note are unchanged (R-002, R-009, AC-007). AC-007's "defined set" is widened with the verified off-topic cues, within its intent. The three hard calibration constraints map to AC-007 (only-weak for off-topic), R-009 (no false only-weak) and AC-001/AC-002 (gates unchanged). Per-model constants are a fallback table, not new architecture.
- **O-1 (tool description):** wording only, consistent with R-001.
- **Risks and follow-ups:** the index is 610 MB (in the risks); FU-007, FU-008 and FU-009 are recorded in `follow-ups.md`, so no ticket growth.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`. The SR-005 change is coherent with the approved behavior, gives meaning strength one owner, and narrows the `EmbeddingIndex` contract. The design is ready for implementation.

## Findings

None open. AR-001…AR-003 stay resolved (ARCH-REV-002). R-5 is resolved by `collection: synced | notSynced`.

## Classification

N/A — `Pass`. Ticket scope: no prerequisite; FU-007, FU-008 and FU-009 are follow-ups.

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary pass handoff); `/software_engineering_team/solution_designer` (informational).

## Residual Risks

- **R-8 — Two stale references to the removed `relevance`** (fix in the design or in implementation):
  - § Meaning Step Rules, rule 4 (design-spec L307) still says "ranked fresh vectors with `relevance`";
  - § Ownership Boundaries (L340) says `EmbeddingIndex` "stays the only owner of … the relevance rule".

  After SR-005, `nearest` returns scores only, and memory-search strength is owned by `MemorySearchService`. The layer's relevance rule serves Project Task search only. Follow the interface row (L374) and § Meaning Strength.
- **R-9 — When calibration cannot meet the constraints.** If no `k`, `Ls`, `Lf` (or per-model table) meet all three hard constraints on the default model, that is a `Design Impact` back to the Solution Designer, not a relaxed constraint. The design implies this; record it as the escalation trigger in the evaluation report.
- **R-10 — The baseline while the meaning index is partly built.** With few embedded cards (during the first build, or after a Rebuild), rank *k* falls back to the last candidate, so lifts shrink and most matches read Weak while the coverage note says the meaning index is incomplete. Include a partial-coverage case in the evaluation, so the only-weak note does not mislead during a build.
- **R-11 — The asking run and the baseline.** Compute the baseline over the candidates *before* removing the asking run's cards. Otherwise one agent's results would rate differently from the same query on the page. Either order works if it is stated and tested.
- Carried forward: R-3, R-6, R-7; RSKs (index about 610 MB, first-build writes, the meaning-build CPU, secrets in snippets, `node:sqlite` FTS5 on packaged Node).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`. F-001's production evidence establishes the off-topic premise as observed, not hypothetical, and the response is bounded.
- Notes: a targeted round-3 review of SR-005 against `F-001-02`, the design spec and the requirements. Other verdicts stand. In the interface verdict, the `nearest` row now reads "scores only, with `collection` synced or not synced".
