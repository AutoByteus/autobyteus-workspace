# Handoff — Architecture Design Complete

- Package: `project-task-semantic-search` (Project Task `autobyteus-71`, `project_task_9b35671b-5079-4dff-90ef-e62a71289ed9`)
- From: Solution Designer (software engineering team), 2026-10-18
- Result classification: `Architecture Design Complete`, `task_size=Large`, `architectural_risk=High`
- Route applied: handoff rule "Large or High → independent architecture review", recipient `/software_engineering_team/architecture_reviewer`
- Current solution revision: `SR-006` (design revised after review ARCH-REV-001; SR-005 was the first round) on approved requirements `SR-004`

## Original Request And Goals

The Project Task Manager delegated this Task on the user's GO-AHEAD (2026-10-18). The request:

- Local semantic search for Project Tasks, both in the Projects board search box and as an agent tool so the Project Task Manager can find Tasks with a sentence.
- Built on a **reusable** local embedding layer (future collections: the PTM's own conversations, agent memory and notes).
- Constraints:
  - compact model on the CPU;
  - no GPU, no hosted embedding API, no vector database, database server or external search service;
  - proportionate footprint;
  - preserve existing search and filter behavior;
  - index current across edits and restarts;
  - clear first-use and failure states that never block Task management.

## User Decisions In The Solution Designer Conversation (2026-10-18)

- **Storage technology:** the earlier SQLite suggestion is withdrawn; the team decides the architecture.
- **Server-side only:** no dependency on Electron, because some users self-host the server.
- **No Task key lookup:** "keep it simple; users type sentences". Task `autobyteus-126` remains separate.
- **Agent tool:** `search_project_tasks(project_id, query, limit?)`, with `project_id` first.
- **Trustworthy model choice:** current models must be tested; the evaluation was redone with 11 current models and written down.
- **Switchable model:** the embedding model must be switchable per environment. A front-end model chooser/downloader may come in the future (not now).
- **Approval:** the requirements were approved ("Okay… I think you can go on now for your design.") after the default model (MongoDB LEAF-IR) and the full set were presented.

## Approval Basis

- `requirements-doc.md` at `SR-004`: status `Approved`, approved by the user. The reference is recorded in its Document Status and in `solution-revision-record.md` (SR-004).
- `model-evaluation-report.md` is evidence for DEC-002. It is not a behavior-defining supplement.

## Design Summary

- **Generic layer `autobyteus-server-ts/src/embeddings/`** (product-agnostic; public boundary `EmbeddingIndex`):
  - Model catalog plus the server setting `AUTOBYTEUS_EMBEDDING_MODEL` (default `mdbr-leaf-ir`; Granite small R2; EmbeddingGemma 2, verified on WASM, multilingual and heavy).
  - The model is downloaded on first need from a pinned Hugging Face revision, SHA-256 verified.
  - A worker-thread runner uses `onnxruntime-web` (WASM) and `@huggingface/tokenizers`, with 4 threads max and a 10-minute idle stop.
  - `node:sqlite` vector store `<appData>/embeddings/embeddings.sqlite`, a disposable cache.
  - Fingerprint-based sync at search time; a background indexing job per collection.
  - A per-model relevance rule (floor plus near-best margin, cap 20).
  - Readiness states `ready` / `preparing` / `unavailable`.
  - Model switch with no vector mixing.
- **`ProjectTaskSearchService`** (`src/projects/search/`): exact tier (today's substring rule) followed by the meaning tier; cleanup after Task/Project delete.
- **Transport:** GraphQL `searchProjectTasks` and `retryEmbeddingModel`; agent tool `search_project_tasks` (shared contract and manifest, so native and MCP).
- **Web:** `useProjectTaskSearch` composable (debounce, polling while preparing, retry); board lanes ordered best-first; status line.
- **Packaging:** prune browser-only `onnxruntime-web` files in the desktop server stage, plus a packaged embed check.
- **Companion repo:** `autobyteus-agents` PR adding the tool and skill guidance to the Project Task Manager.

## Classification Evidence

- **Large:**
  - a new subsystem (~9 files);
  - a new service;
  - 2 GraphQL types;
  - a tool;
  - a setting;
  - new dependencies and packaging;
  - web changes;
  - docs;
  - a companion repository change.
- **High:**
  - new persisted store;
  - network download;
  - worker/background concurrency and lifecycle;
  - new dependencies across 5 desktop targets and 2 Docker architectures;
  - new public contracts.

## Open Risks For Review

- RSK-002: model download behind proxies.
- RSK-004: thin relevance calibration margin for some models.
- RSK-005: WASM memory; idle stop is the mitigation.
- RSK-006: EmbeddingGemma 2 on WASM not yet verified.
- RSK-008: `listTasks` read cost at 1,000+ Tasks.

## Follow-ups Recorded (not in scope)

- FU-1: front-end model chooser.
- FU-2: proxy-aware download.
- FU-3: Task `autobyteus-126` overlap. The Project Task Manager decides.
- FU-4: Task-read cache if measured.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-semantic-search`
- Branch: `codex/project-task-semantic-search` (uncommitted ticket documents only)
- Base: `origin/personal` @ `55bff1f5eea1f140bab6e372e3faadeb7ea33465`
- Finalization target: `origin/personal` (RELEASE.md)
- Companion repository: `/Users/normy/autobyteus_org/autobyteus-agents` (`main` @ `887e79d`)

## Documents

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-semantic-search/tickets/in-progress/project-task-semantic-search/`

- `requirements-doc.md`: approved requirements (SR-004)
- `investigation-notes.md`: evidence, including the architecture-phase evidence section
- `design-spec.md`: the design (SR-005)
- `solution-revision-record.md`: SR-001…SR-006
- `design-review-report.md`, `architecture-review-revision-record.md`: owned by the architecture reviewer (round 1)
- `model-evaluation-report.md`: model experiments and conclusions (evidence for DEC-002)
- `probes/`: reproducible probe scripts and raw results (linked from the notes and the report)

## SR-006 Revision (response to ARCH-REV-001)

Re-review scope, as the reviewer stated: AR-001…AR-003. The design spec's new section "Architecture Review Resolution" maps every finding and recommendation to the changed sections.

- **AR-001:** EmbeddingGemma 2 was run on the WASM production stack (`probes/egemma2-wasm-q8.json`):
  - quality r@5 0.957 and r@10 0.986, so QR-007 is met;
  - cost 4.27 s/Task, 151 ms/query, 1.1–1.5 GB memory, ≈ 346 MB download.
  - The catalog keeps all three approved entries.
  - A verification failure at implementation time is a Design Impact returned to the Solution Designer for the user's decision. Changed: Change Sequence step 2, RSK-006 (+ RSK-009 cost), G2, the catalog file-mapping row and the evidence table.
- **AR-002:** new G11. npm licences are kept by the prune; no THIRD_PARTY_NOTICES entry (per LICENSING.md); per-model licence in the catalog and `docs/modules/embeddings.md`; `check_licensing.py` and the hygiene check run in validation.
- **AR-003:**
  - DS-006: cleanup is fire-and-forget and never awaits indexing.
  - DS-003: collection generations; results that arrive after cancellation are discarded, never written.
  - Interface row `forgetTask`/`forgetProject` updated to match.
- **R-1…R-8:** applied as described in the resolution table. R-4 was probed: threads work inside a `worker_thread`. R-8 became FU-5.

## Expected Next Action

Independent architecture review of the design against the approved requirements. Findings that change intended behavior return to the Solution Designer as a `Requirement Gap`; design findings return as a `Design Impact`.
