# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-006` (design revision after architecture review ARCH-REV-001; SR-005 was the first design round) on the approved SR-004 requirements
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at `SR-004` (REQ-001…REQ-015, AC-001…AC-016, QR-001…QR-008, DEC-001…DEC-010), approved by the **user** on 2026-10-18 in the Solution Designer conversation ("Okay… I think you can go on now for your design.").
- Behavior-defining supplements and their approval references: none. `model-evaluation-report.md` is evidence for DEC-002 (approved with the requirements).
- Design status: `Ready`
- Canonical investigation-notes path: `tickets/in-progress/project-task-semantic-search/investigation-notes.md`
- Authorities read (design reading gate, 2026-10-18):
  - `references/architecture-design.md`, `references/design-principles.md` and `references/design-examples.md` (all examples; Example 10 and Example 11 used);
  - the project's `DESIGN.md`;
  - `autobyteus-server-ts/docs/design/startup_initialization_and_lazy_services.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` (sections 1–4) and `autobyteus-server-ts/docs/modules/projects.md`;
  - `TESTING.md`, `RELEASE.md`.
- Project design-principle conflicts or discrepancies: none found.
  - DESIGN.md rule 5 ("prefer bounded change to the existing owner over speculative frameworks") and the user's explicit requirement for a reusable embedding layer (REQ-011) and a switchable model (REQ-015) are reconciled by keeping the layer to the four owners those requirements need, with no plugin registry, no generic search framework and no per-collection model selection.

## Architecture Review Resolution (ARCH-REV-001 → SR-006)

| Finding | Resolution | Sections changed |
| --- | --- | --- |
| AR-001 (EmbeddingGemma 2 contingency contradicted DEC-002) | Verified EmbeddingGemma 2 on the production WASM stack during design (QR-007 met; cost recorded). The catalog keeps all three approved entries unconditionally. A verification failure at implementation time is a `Design Impact` returned to the Solution Designer for the user's decision, consistent with the escalation trigger | Evidence table, Final File Responsibility Mapping (catalog), Change Sequence step 2, Risks RSK-006/RSK-009, G2 |
| AR-002 (licence notices unmapped) | G11: npm licences kept by the prune; no `THIRD_PARTY_NOTICES` entry (policy in `LICENSING.md`); per-model licence in the catalog and `docs/modules/embeddings.md`; licensing and hygiene checks in validation | G11, G6 (keep-list) |
| AR-003 (delete cleanup timing) | Cleanup hooks are fire-and-forget and never await indexing; collection generations make cancelled/dropped jobs discard late results instead of writing them | DS-006 narrative, DS-003 bounded local spine, Interface row `forgetTask`/`forgetProject` |
| R-1 | Relevance rule ranks over all Project Tasks; board shows matches in shown lanes; `isNoMatch` from shown matches; Cancelled toggle does not re-query | G4 |
| R-2 | `EmbeddingIndex.search` returns `scores` for requested ids, so exact matches are ordered best-first | Interface row `EmbeddingIndex.search` |
| R-3 | Latest request wins; the locator uses settled results | G4 |
| R-4 | Probed: ort-web with 4 threads works inside a `worker_thread` (2.4× over 1 thread) | Evidence table |
| R-5 | Search service gets `listTasks` and the index by constructor injection from the composition; services reach the cleanup port through `deps` with a type-only port; no module cycle | Dependency Rules, Final File Responsibility Mapping |
| R-6 | Unknown setting value → default + one warning naming the value; blank allowed | Final File Responsibility Mapping (setting) |
| R-7 | Status line may flash for one polling interval after an edit; noted for web tests and docs | G4 |
| R-8 | Docker prune recorded as follow-up FU-5 | Change Scope follow-ups |

## Current-State Read

- **Board search (BEH-001):**
  - `autobyteus-web/components/projects/ProjectTaskBoard.vue` filters the already-loaded Project Task list client-side with `description.toLocaleLowerCase().includes(query)` and groups matches into status lanes ordered by `updatedAt`.
  - The search text is held per Project in `projectTaskStore.searchByProjectId`. It is shared with `TempTaskBoard.vue` and cleared on Task creation by `ProjectTaskDraftEditor.vue`.
  - The same board runs on the Projects page and, compact, in the right panel. The Task locator clears a hiding search.
- **Agent tools (BEH-002):** `src/agent-tools/project-tasks/` hold one shared contract (`project-task-tool-contract.ts`: names, descriptions, schemas, parsers), one manifest (`project-task-tool-manifest.ts`: `executeProjectTaskTool`) and native tool classes. The MCP adapter (`agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.ts`) maps the manifest, so one manifest entry reaches both native and MCP runtimes. Tools are exposed only when a definition selects them.
- **Tasks (BEH-003):**
  - Stored as files `<appData>/projects/<projectId>/tasks/<taskId>/task.json`.
  - `ProjectStore.listTasks(projectId)` reads every Task file of a Project.
  - `ProjectTaskService` owns create/update/delete and notifies `ProjectChangeMarks` after commits; `ProjectService` owns Project delete.
- **Persistence technology already in the server:**
  - Prisma over `<appData>/db/production.db`.
  - Node's built-in `node:sqlite` for self-contained SQLite files (application storage, orchestration journals).
  - Verified working in Electron 42 (Node 24.16, SQLite 3.53), Docker (Node 22.23, SQLite 3.51) and dev (Node 22.23).
- **Settings:** predefined server settings are registered in `src/services/server-settings-service.ts` (optionally with `allowedValues`) and read at use time through `appConfigProvider.config.get(KEY)`. Example: `src/config/streaming-content-flush-interval-setting.ts`.
- **Startup:** `docs/design/startup_initialization_and_lazy_services.md` requires lazy service access; nothing heavy at import or startup.
- **No embedding capability exists** anywhere in the server or `autobyteus-ts`.
- No structural problem in the existing code blocks this feature (see Task Design Health Assessment).

## Task Size And Architectural Risk (Mandatory)

- **Task size:** `Large`
- **Size rationale and supporting evidence:**
  - a new server subsystem `src/embeddings/` (catalog, model files, worker runtime, vector store, index boundary; about 9 files);
  - a new Project Task search service;
  - a GraphQL query and mutation;
  - a new agent tool in the shared contract and manifest;
  - a server setting;
  - two new npm dependencies plus desktop packaging pruning;
  - web board, composable and localization changes;
  - documentation;
  - a companion change in the `autobyteus-agents` repository.
- **Architectural risk:** `High`
- **Risk rationale and supporting evidence:**
  - new persisted store (`embeddings.sqlite`);
  - new network download of executable-adjacent model files (integrity-checked);
  - new concurrency/lifecycle (worker thread, background indexing, idle shutdown, model switch);
  - new dependencies and packaging changes across 5 desktop targets and 2 Docker architectures;
  - new public contracts (GraphQL, agent tool, server setting).
  - Each item is bounded and owned, but together they exceed "absorbed with bounded impact".
- **Escalation trigger if implementation or validation discovers new impact:** return a `Design Impact` to the Solution Designer if:
  - a catalog model cannot run on the WebAssembly runtime;
  - measured latency, indexing time or memory miss QR-001…QR-005 on the built app;
  - the board needs a server-push channel instead of polling;
  - an existing owner (ProjectStore, ProjectTaskService, server settings) must change beyond the hooks listed here.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Model evaluation, round 2 | `model-evaluation-report.md`; `probes/bench2.mjs`, `probes/analyze2.py`, `probes/current-models-*.{jsonl,md}` | 11 current models on 170 real Tasks and 69 queries. LEAF-IR is top tier at the lowest cost; Granite small R2 and EmbeddingGemma 2 are also top tier | Catalog contents and default (DEC-002) | Off-topic margin per model (RSK-004) |
| WASM stack probe | `probes/lean2.mjs`, `probes/lean.mjs`, `probes/lean-results.jsonl` | `onnxruntime-web` Node build + `@huggingface/tokenizers` give rankings identical to native. LEAF-IR: 106 ms/Task, 5 ms/query, 476 MB peak. Threads: 4 best | WASM runtime (no native binary); 4 threads max | — |
| Native runtime packaging | npm/unpkg probes (investigation notes, Runtime packaging facts) | `onnxruntime-node` ≥ 1.24 has no `darwin/x64` binary; transformers.js pulls 483 MB incl. `sharp` | Reject native ORT and transformers.js | — |
| Ranking analysis | `probes/hybrid.py`; investigation notes | Keyword fusion lowers r@1; whole-Task vectors beat chunks; scores compressed, so a relative "near-best" rule plus a floor is needed | Exact tier + meaning tier; per-model relevance calibration | Calibration values for each catalog entry |
| EmbeddingGemma 2 on WASM (AR-001) | `probes/lean2.mjs` (feeds empty `image/video/audio_features` `[0, 512]` tensors for text-only use); `probes/egemma2-wasm-q8.json` | `onnx-community/embeddinggemma-2-ONNX` @ `daa72c51…` `model_quantized` runs on ort-web WASM, 4 threads: r@1 0.913, r@5 0.957, r@10 0.986, MRR 0.940 (QR-007 met; native q8: 0.913/0.971/0.986/0.940). Cost: 4,270 ms/Task, 171 Tasks 730 s on M1 Max, query 151 ms, RSS 1,134 MB loaded / 1,522 MB peak; download ≈ 346 MB | Catalog keeps EmbeddingGemma 2 unconditionally (multilingual option) with its cost stated | — |
| ort-web threads inside a `worker_thread` (R-4) | `probes/worker-thread-probe/` | LEAF-IR in a `worker_thread`: 1 thread 555 ms/text, 4 threads 233 ms/text (60 Task texts; machine shared with the EmbeddingGemma 2 run) → threads work in a nested worker | DS-008 worker design confirmed | Absolute timings re-measured in validation |
| Worker-thread probe | `/tmp/pts-probe/wtest` (recorded in notes) | A `.ts` worker with type annotations runs under Node 22.23 and Electron Node 24.16 (type stripping) | Self-contained worker entry usable in source tests and in `dist` | — |
| `node:sqlite` probes | Electron, Docker, dev (investigation notes) | Available on every runtime | Vector store on `node:sqlite` | Node 22 prints an ExperimentalWarning (already the case for existing users) |
| Settings pattern | `src/services/server-settings-service.ts`, `src/config/streaming-content-flush-interval-setting.ts` | Predefined settings with `allowedValues`, read at use time | Active-model setting | — |
| Downloaders | `src/utils/downloader.ts`, `src/utils/download-utils.ts` | 30 s total timeout, no checksum, no atomic rename | Model downloader owned by the embeddings subsystem | Proxy support: none in existing server fetches (RSK-002) |
| LEAF-IR pin | HF API `MongoDB/mdbr-leaf-ir` @ `4262131b32c3182bd06e67e92ae69d7bd66e0c5c` | Official repo ONNX files equal the community export used in the probes (same SHA-256). Modules: Transformer → Pooling → Dense → Normalize; the ONNX export emits `sentence_embedding` | Catalog entry pinned to the official repo | Official tokenizer file differs from the community export's; must be re-verified (guidance §G2) |
| Packaging | `autobyteus-web/scripts/prepare-server.mjs` (`pruneNativePrebuilds`, `npm prune`) | The server stage is pruned file-by-file already | Prune `onnxruntime-web` browser variants in the same step | Exact keep-list |

## Intended Change

Add a server-side embedding layer with a switchable model catalog. Use it in a Project Task search service. Expose that service to the board, through a GraphQL query, and to agents, through `search_project_tasks`. Everything runs in the server process, on the CPU, with one derived SQLite file and a downloaded model.

## Change Scope (Mandatory)

- **In scope:** UC-001…UC-006. Areas:
  - new `autobyteus-server-ts/src/embeddings/`;
  - new `src/projects/search/`;
  - Project/Task delete hooks in `ProjectService` / `ProjectTaskService`;
  - GraphQL `project-task-search.ts` and `embeddings.ts` types plus schema registration;
  - agent-tool contract and manifest/native tool for `search_project_tasks`;
  - server-settings registration;
  - server `package.json` dependencies;
  - desktop server packaging prune (`autobyteus-web/scripts/prepare-server.mjs`);
  - web board search (`ProjectTaskBoard.vue`, new composable, GraphQL documents, localization en/zh-CN);
  - docs: server modules `embeddings.md` (new), `projects.md`, `agent_tools_mcp_server.md`, `search.md`, and web `docs/projects.md`;
  - companion `autobyteus-agents` change: Project Task Manager `agent-config.json` and `project-task-management` skill.
- **Deliberately left alone:**
  - Temp tasks board search (DEC-007);
  - dependency picker and Projects list search;
  - Task storage and files;
  - Prisma schema and migrations;
  - `/ws/projects` feed and `ProjectChangePublisher`;
  - existing tools' inputs and results;
  - `src/utils/downloader.ts` / `download-utils.ts` (their callers keep their semantics);
  - Docker image size (no pruning there);
  - the voice-input Electron extension mechanism (Electron-only, not reused, per REQ-012).
- **Follow-ups (not fixed here):**
  - FU-1: a front-end model chooser/downloader (user: "maybe in the future"), built on `EmbeddingIndex.modelStatus()` / `retryModel()` and the active-model setting;
  - FU-2: proxy-aware downloads for servers behind an HTTP proxy, if a user reports it (RSK-002). The existing server fetches have the same limitation;
  - FU-3: Task `autobyteus-126` (key lookup) overlaps the same search box. The user removed key lookup from this ticket. The Project Task Manager should decide that Task's fate, and if kept it must build on the server-side exact tier introduced here, not on the removed client predicate;
  - FU-4: if `ProjectStore.listTasks` file reads become the dominant search cost at large backlogs (measured, QR-001), add a read cache under the Task store owner (DESIGN.md: measure first).
  - FU-5 (R-8): prune the ≈ 139 MB of browser-only `onnxruntime-web` files from the Docker image too, reusing the desktop keep-list.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001…REQ-004, REQ-009, REQ-010; AC-001…AC-005, AC-010, AC-011 | User types in the board search (Projects page / right panel) | Client substring filter (investigation BEH-001) | Exact + meaning matches, best-first per lane; readiness line; preserved board behaviors | DS-001 (search), DS-005 (readiness refresh) |
| BEH-002 | Contract | REQ-005, REQ-006; AC-006, AC-007 | Agent selecting `search_project_tasks` calls it | No search tool (BEH-002) | Compact best-first list + meaning-search state | DS-002 |
| BEH-003 | System | REQ-007, REQ-008, REQ-014; AC-008, AC-009 | Task create/edit/delete, Project delete, restart | Task writes via `ProjectTaskService` / `ProjectService` | Index follows current Task text by fingerprint; removals on delete; persisted | DS-001/DS-002 sync step, DS-003 (background indexing), DS-006 (delete cleanup) |
| BEH-004 | System / User | REQ-009, REQ-010, REQ-012, REQ-013; AC-010…AC-012, AC-014 | First need of meaning search; failures | None | Lazy download, background index, readiness, Retry; never blocks Task management or startup | DS-004 (model provisioning), DS-005 |
| BEH-005 | Contract (internal) / Operational | REQ-011, REQ-015; AC-013, AC-016 | Future collection; operator changes the active-model setting | None | Generic `EmbeddingIndex` with collections; catalog + setting; automatic rebuild on switch | DS-004, DS-007 (model switch) |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `model-evaluation-report.md` | Model experiments and conclusions | DEC-002, REQ-015, QR-003…QR-007 | Source of catalog entries, default, prompts/pooling, and the calibration method | Current; evidence |
| `probes/` | Reproducible probes and raw results | QR-*, AC-002, AC-004 | Seeds the durable quality fixture (query/target structure) and the calibration procedure | Evidence; not behavior-defining |

## Task Design Health Assessment (Mandatory)

- **Change posture:** `Larger Requirement` (feature with a new reusable capability)
- **Current design issue found:** `No`
- **Structural triggers checked:**
  - *Repeated coordination:* none today. The design gives model/index readiness one owner (`EmbeddingIndex`) so the board, the tool and future collections don't each coordinate it.
  - *Responsibility overload:* adding search to `ProjectTaskService` (505 lines already) or `ProjectTaskBoard.vue` would overload them. Search gets its own service and composable; the board only swaps its predicate.
  - *Ambiguous boundary:* collection keys are explicit strings owned by each consumer (`project-tasks/<projectId>`); the GraphQL query and tool take an explicit `projectId`.
  - *Authoritative boundary:* consumers depend only on `EmbeddingIndex`, never on the store, runner or model files directly.
  - *Capability reuse:* reuse server settings, `node:sqlite`, the Project tool manifest/MCP adapter and the web Apollo client. Create new only where nothing fits (model download with checksums, worker runtime).
  - *Legacy cleanup:* the client-side description predicate in `ProjectTaskBoard.vue` is removed (replaced, not kept as a fallback).
- **Root cause classification:** `No Design Issue Found`
- **Refactor needed now:** `No`
- **Evidence:** existing owners (`ProjectTaskService`, `ProjectStore`, tool contract/manifest, settings service, Apollo stores) accept the feature through additive entry points. The only touched existing logic is the board predicate and two delete hooks.
- **Design response:** new subsystem plus thin integrations.
- **Refactor rationale:** none required.
- **Intentional deferrals and residual risk:** FU-4 (listTasks read cost at large scale), measured during validation.

## Terminology

- **Collection:** a named set of items indexed together by the embedding layer. Its key is a string chosen by the consumer, e.g. `project-tasks/<projectId>`.
- **Item:** `{ id, text }` supplied by the consumer; the layer never reads product data itself.
- **Fingerprint:** SHA-256 of the item text exactly as embedded (document prefix + text). A changed fingerprint means re-embed.
- **Catalog entry / model definition:** everything model-specific (source, files, checksums, prompts, output kind, token limit, relevance calibration).
- **Active model:** the catalog entry selected by the server setting `AUTOBYTEUS_EMBEDDING_MODEL` (default `mdbr-leaf-ir`).
- **Readiness:** `ready` | `preparing {phase, done, total}` | `unavailable {reason}` for the active model and a collection.
- **Exact match / meaning match:** case-insensitive description containment (today's rule) / a relevant result of the embedding query.

## Legacy Removal Policy (Mandatory)

- **Obsolete legacy paths and files in this scope:** the client-side search predicate `matchesSearch` and its `matchingTasks` derivation in `ProjectTaskBoard.vue` (replaced by server results).
- **Compatibility wrappers, dual paths, or legacy fallbacks this design keeps:** `None`.
  - "Exact matches while meaning search is preparing" is not a fallback path: exact matching is a permanent tier of the one server search (REQ-002), computed by the same service in every state.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- **Stored subject, location, representative shape, and approximate volume:**
  - New derived store `<appData>/embeddings/embeddings.sqlite`.
  - One table `embedding_vectors(collection TEXT, item_id TEXT, model_id TEXT, fingerprint TEXT, vector BLOB, PRIMARY KEY (collection, item_id))`.
  - Vector size is 768 float32 = 3 KB per Task for LEAF-IR (384 for Granite, 768 for EmbeddingGemma 2), i.e. ≈ 3 MB per 1,000 Tasks.
  - Model files are stored under `<appData>/embeddings/models/<modelId>/…` (LEAF-IR ≈ 24 MB).
  - Existing Task/Project files and `production.db` are untouched.
- **Relevant code-model, serialization, semantic, or physical-store change:** additive new store; no change to existing data.
- **Normal reader/writer behavior:**
  - `EmbeddingVectorStore` creates the table if absent and reads rows of the active `model_id` only.
  - Rows of other models are deleted once the active model's index is ready (DS-007).
  - The store holds no version field (data migration guideline §3). The table is recognized by its structure.
- **Required semantics and invariants:**
  - Task files remain the only source of truth.
  - A vector is used only when its fingerprint equals the current item's fingerprint and its `model_id` equals the active model.
  - Vectors of different models are never compared.
- **Physical-store, privacy, disposal/rebuild, and operational constraints:**
  - The file can be deleted at any time and rebuilds on the next search.
  - It stores no Task text: only ids, fingerprints and vectors.
  - Deleted Tasks and Projects are removed (DS-006) and also pruned by the next sync.
- **Decision:** `Not Affected` for all existing data. For the new store: `Discard or Rebuild`. A store file that cannot be opened, or whose table shape is not the current one, is renamed aside to `embeddings.sqlite.unreadable-<timestamp>` (logged warning) and recreated. No migration, no version ledger.
- **Decision rationale:**
  - The index is fully reproducible from Task files in ≈ 0.1 s per Task.
  - A migration would add machinery for disposable data.
  - Renaming aside instead of deleting follows DESIGN.md rule 7 (never destroy unreadable data silently) at negligible cost.
- **Acceptance criteria or design constraints supported:** AC-008, AC-009, AC-016, QR-005.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-003 | Board search box | Lanes showing ranked matches + readiness line | `ProjectTaskSearchService` | The user journey |
| DS-002 | Primary End-to-End | BEH-002, BEH-003 | `search_project_tasks` call | Compact tool result | `ProjectTaskSearchService` | The agent journey |
| DS-003 | Bounded Local | BEH-003, BEH-004 | Collection with stale/missing items | All items fresh, progress published | `EmbeddingIndex` (collection indexing job) | Background indexing, single flight, progress |
| DS-004 | Bounded Local | BEH-004, BEH-005 | First need of the active model | Model worker ready, or unavailable(reason) | `EmbeddingIndex` (model readiness) | Download, verify, load, failure, retry |
| DS-005 | Return-Event | BEH-001, BEH-004 | Readiness `preparing` in a search result | Board re-queries until `ready`/`unavailable` | `useProjectTaskSearch` (web) | Results update without retyping (REQ-009) |
| DS-006 | Primary End-to-End | BEH-003 | Task or Project delete committed | Collection items/collection removed | `ProjectTaskSearchService` (cleanup) | No stale vectors after delete |
| DS-007 | Bounded Local | BEH-005 | Active-model setting differs from the loaded model | New model ready, old vectors/files removed | `EmbeddingIndex` | Model switch without mixing |
| DS-008 | Bounded Local | BEH-004 | Embedding request | Vectors returned; worker stopped after 10 min idle | `EmbeddingModelRunner` | CPU work off the main loop; memory returned |

## Primary Execution Spine(s)

- **DS-001:** `ProjectTaskBoard (search box) -> useProjectTaskSearch (debounce) -> GraphQL searchProjectTasks -> ProjectTaskSearchService.search -> ProjectTaskService.listTasks (current Tasks) -> EmbeddingIndex.search (sync + query) -> EmbeddingModelRunner (query vector) -> ranked matches + readiness -> board lanes`
- **DS-002:** `Agent runtime (native or MCP) -> project-task tool manifest (search_project_tasks) -> ProjectTaskSearchService.search (wait ≤ 30 s for readiness) -> … same as DS-001 … -> compact tool result`
- **DS-006:** `GraphQL/tool delete -> ProjectTaskService.deleteTask | ProjectService.deleteProject -> (after commit) ProjectTaskSearchService.forgetTask | forgetProject -> EmbeddingIndex.removeItems | dropCollection -> EmbeddingVectorStore`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | (1) The user types; the composable debounces about 250 ms and asks the server. (2) The search service reads the Project's current Tasks and computes exact matches. (3) It asks the embedding index to sync the collection and query it. (4) The index embeds the query in the worker and scores fresh vectors. (5) It applies the active model's relevance rule. (6) It returns meaning matches plus readiness. (7) The service merges the tiers; the board shows matches best-first per lane, and a status line when not ready. | Search box, search service, Tasks, embedding index, model runner | `ProjectTaskSearchService` | Debounce/polling (composable), relevance rule (index), fingerprints (index), vector store, model files |
| DS-002 | Same core as DS-001. The manifest parses `{project_id, query, limit}`, then calls the service with `waitForReadyMs` so a first-use agent call waits up to 30 s for the index. Results map to `{taskId: key, status, summary, match}` plus `meaningSearch`. | Tool manifest, search service | `ProjectTaskSearchService` | Tool contract/parsing, summary bounding |
| DS-003 | A sync finds missing or changed fingerprints and schedules the collection's job; if one is running, it marks it to re-check. The job takes the newest pending items in batches of 8, embeds them as documents and writes them to the store and memory cache. It updates `done/total` until nothing is pending, then reports `ready`. | Collection job, runner, store | `EmbeddingIndex` | Progress counters, cancellation on model switch or collection drop |
| DS-004 | On first need, readiness becomes `preparing: downloading` and the active model's files are ensured: verify existing files' SHA-256, else download to a temp file, verify and rename. Then `loading`: the runner starts the worker with the model files. Any failure sets `unavailable {reason}`. Searches return exact matches plus that state, and nothing retries until `retryModel()` or a setting change. | Model files, runner | `EmbeddingIndex` | Downloader, checksum, per-model folder |
| DS-005 | When a response says `preparing`, the composable re-runs the same query every 2 s while the board shows that query, until `ready` or `unavailable`. Retry calls the `retryEmbeddingModel` mutation, then re-queries. | Composable, GraphQL | `useProjectTaskSearch` | Localization of status texts |
| DS-006 | After a committed delete, the owner calls the search cleanup best-effort and never awaits indexing work: the hook is fire-and-forget, errors are logged and the delete never fails. The index first cancels the collection's job (bumps its generation; a batch already in the worker finishes but its results are discarded), then removes the cache entries and store rows or drops the collection. | Task/Project services, search service, index | `ProjectTaskSearchService` | — |
| DS-007 | Every index operation resolves the active model from the setting. If it differs from the loaded one, the index stops the runner, clears caches and readiness, and continues as DS-004 for the new model. Collections re-sync because vectors are read by `model_id`. When the new model reaches `ready`, rows and files of other models are deleted. | Index, runner, store, model files | `EmbeddingIndex` | Setting resolver |
| DS-008 | The runner starts one worker for the loaded model and keeps a request queue (queries before document batches). The worker loads ONNX + tokenizer from the files, tokenizes with the prefix, runs the session, takes the defined output, L2-normalizes and returns `Float32Array`s. After 10 minutes without requests the runner terminates the worker; the next request starts it again (~0.3–1 s). | Runner, worker | `EmbeddingModelRunner` | Thread count, idle timer |

## Spine Actors / Main-Line Nodes

- `ProjectTaskBoard` + `useProjectTaskSearch` (web)
- GraphQL `ProjectTaskSearchResolver`; tool manifest entry `search_project_tasks`
- `ProjectTaskSearchService`
- `ProjectTaskService.listTasks` (existing)
- `EmbeddingIndex`
- `EmbeddingModelRunner` (+ worker)
- `EmbeddingVectorStore`

## Ownership Map

| Node | Owns |
| --- | --- |
| `ProjectTaskSearchService` | Task search policy: the collection key per Project, item text (description), exact tier, merge/order of tiers, result shape, readiness wait for agents, delete cleanup |
| `EmbeddingIndex` (public boundary of the layer) | Active-model resolution and switch; model readiness state machine (DS-004); per-collection fingerprints, in-memory vector cache and indexing jobs (DS-003); query embedding and scoring; the relevance rule using the model's calibration; `modelStatus()` / `retryModel()` |
| `EmbeddingModelCatalog` | The list of supported model definitions; lookup by id; the default id |
| `EmbeddingModelFiles` | Per-model local folder, download, SHA-256 verification, atomic placement, removal of inactive models |
| `EmbeddingModelRunner` | Worker lifecycle (start, queue, idle stop, terminate), thread count, request/response protocol |
| `embedding-worker` | Inside the worker: load ONNX runtime + tokenizer, prefix, truncate, run, take output, normalize |
| `EmbeddingVectorStore` | The SQLite file: open/recreate, table, reads by collection and model, upserts, deletes |
| `useProjectTaskSearch` (web) | Debounce, request lifecycle, polling while preparing, retry, mapping results for the board |

The GraphQL resolver and the tool manifest entry are thin transport boundaries (below).

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ProjectTaskSearchResolver` (`searchProjectTasks`) | `ProjectTaskSearchService` | GraphQL transport for the board | Ranking, readiness waiting, polling |
| `EmbeddingModelResolver` (`retryEmbeddingModel`) | `EmbeddingIndex.retryModel()` | Retry from the board's unavailable state | Download logic |
| `search_project_tasks` manifest entry + native tool class | `ProjectTaskSearchService` | Agent transport (native + MCP via the existing adapter) | Search policy beyond argument parsing and result projection |
| `getEmbeddingIndex()` / `getProjectTaskSearchService()` accessors | The instances | Lazy access per startup rules | Business logic |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `matchesSearch` predicate and `matchingTasks`/`isNoMatch` derivation from the predicate in `ProjectTaskBoard.vue` | Server search decides matches | `useProjectTaskSearch` results | In This Change | The locator's "clear a hiding search" now asks the result set instead of the predicate |
| "Board search still matches descriptions only" statements in `autobyteus-web/docs/projects.md` | Behavior changes | Updated docs | In This Change | — |
| `autobyteus-server-ts/docs/modules/search.md` "no standalone search module" note | Becomes untrue | Updated module doc pointing to `embeddings.md` and Project Task search | In This Change | — |
| Dead code in touched files | None found during design | — | — | Implementation re-checks touched files (Core Principle 7) |

## Return Or Event Spine(s) (If Applicable)

DS-005 (readiness refresh by polling).

Pushing readiness over `/ws/projects` was considered and rejected: that feed carries Task/Project views (`ProjectChangeMessageSchema`). Readiness belongs to the embedding layer and is only relevant while a search is shown. Polling every 2 s during preparation (about 10–60 s once per install or model switch) is the smaller mechanism.

## Bounded Local / Internal Spines (If Applicable)

- **DS-003, collection indexing job** (parent: `EmbeddingIndex`)
  - `sync(items) -> diff fingerprints -> pending set -> [job loop: take ≤ 8 pending -> runner.embed(documents) -> store.upsert + cache update -> progress] -> ready`
  - Matters: single flight per collection; a sync during a job only updates the pending set; cancellation on model switch or collection drop.
  - Cancellation (AR-003): each collection has a generation number. `dropCollection`, `removeItems`, a model switch and `sync` removals bump or record it synchronously. Before each store write and cache update, the job checks that its generation (and, for `removeItems`, that the item is still pending) is current. A batch whose results arrive after cancellation is discarded, never written. Removal never waits for the in-flight batch, which takes ≈ 0.85 s for LEAF-IR and longer for other models.
  - Pending items are processed in the order the consumer supplied them; Task search supplies open Tasks first, then most recently updated.
- **DS-004, model readiness state machine** (parent: `EmbeddingIndex`)
  - `idle -> downloading(files) -> loading(worker) -> ready`, with any failure going to `unavailable(reason)`.
  - From `unavailable`, `retryModel()` or a setting change returns to `idle`.
  - Matters: no retry storm per keystroke; one download per model at a time; failure never propagates into Task operations.
- **DS-008, worker request loop** (parent: `EmbeddingModelRunner`)
  - `queue (queries first) -> postMessage -> worker run -> vectors -> resolve`, plus `idle timer (10 min) -> terminate`.
  - Matters: CPU work stays off the server event loop; memory (WASM heap ≈ 0.3–0.5 GB) is returned when idle (QR-004).

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Active-model setting resolver (`embedding-model-setting.ts`) | DS-004, DS-007 | `EmbeddingIndex`, server settings service | Key, allowed values (catalog ids), resolve-to-definition with default | Operator choice per environment (REQ-015) | Settings logic scattered into index code |
| Model downloader + checksum (`embedding-model-files.ts`) | DS-004 | `EmbeddingIndex` | Streaming download to temp, SHA-256, rename, cleanup | Integrity of downloaded files | Index state machine mixed with HTTP/file details |
| Relevance rule (`relevance.ts`) | DS-001, DS-002 | `EmbeddingIndex` | "Floor on the best score, then within margin of best, cap N" using model calibration | Model-specific score scales | Duplicated per consumer, or Task-specific |
| Summary bounding for tool results | DS-002 | Tool manifest | First line, ≤ 160 chars | Compact agent result | Search service shaped by one transport |
| Status-line texts / localization | DS-005 | Board | en + zh-CN strings | Product text | — |
| Packaging prune of `onnxruntime-web` | Packaging | Desktop server stage | Remove browser-only dist files | Footprint (≈ 139 MB → ≈ 15 MB) | — |

## Ownership Boundaries

- **`EmbeddingIndex`** is the only public entry of `src/embeddings/`. The catalog's type and the definition type are also exported, for the settings registration.
  - The store, runner, worker and model files are internal mechanisms.
  - Consumers (Project Task search now; conversations later) never import them.
- **`ProjectTaskSearchService`** is the only owner of Task search policy. GraphQL and the tool manifest call it; `ProjectService` and `ProjectTaskService` call only its two cleanup methods through a narrow port.
- **Authority over Task data stays with `ProjectTaskService` / `ProjectStore`.** The embedding layer never reads Task files; it receives items.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `EmbeddingIndex` | `EmbeddingVectorStore`, `EmbeddingModelRunner`, `embedding-worker`, `EmbeddingModelFiles`, relevance rule, readiness | `ProjectTaskSearchService`, `EmbeddingModelResolver`, future collections | A consumer opening `embeddings.sqlite`, calling the runner directly, or reading model files | Adding a method on `EmbeddingIndex` |
| `ProjectTaskSearchService` | Collection key format, item text, exact tier, merge | GraphQL resolver, tool manifest, Project/Task delete hooks | Resolver or tool calling `EmbeddingIndex` with `project-tasks/...` keys itself | Extending the service |
| `ProjectTaskService.listTasks` | `ProjectStore` file reads | `ProjectTaskSearchService` | Search reading `task.json` files via `ProjectsLayout` | — |

## Dependency Rules

- **Allowed:**
  - `api/graphql/types/project-task-search.ts` → `projects/search`;
  - `agent-tools/project-tasks/*` → `projects/search`;
  - `projects/search` → `projects/services/project-task-service` and `embeddings` (index only);
  - `projects/services/{project-service,project-task-service}` → `projects/search` cleanup port, through the services' existing `deps` injection with a type-only port type (R-5).
  - `projects/search` must not import `projects/services/project-task-service` at module level. `ProjectTaskSearchService` receives `listTasks` and the index through its constructor, wired by the composition (`compositions/project-task-execution-resource-composition.ts`). This avoids an ESM import cycle;
  - `api/graphql/types/embeddings.ts` → `embeddings` (index);
  - `services/server-settings-service.ts` → `embeddings/catalog/embedding-model-setting.ts`.
- **Forbidden:**
  - `embeddings/**` importing anything from `projects/**`, `agent-tools/**` or `api/**`. The layer is product-agnostic.
  - Anything outside `embeddings/` importing `embeddings/store`, `embeddings/runtime` or `embeddings/models` (except tests).
  - The worker file importing server modules. It may import only `node:*`, `onnxruntime-web`, `@huggingface/tokenizers` and erasable type-only imports, so it runs as a standalone worker entry in source (type stripping) and in `dist`.
  - The web app deciding matches itself.
- **Startup:** nothing in `embeddings/` or `projects/search/` is constructed at import time or during startup (lazy accessors per the startup design doc).

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `EmbeddingIndex.search(collection, items, queryText, opts?: {limit?: number; waitForReadyMs?: number; scoreIds?: string[]})` → `{matches: {id, score}[], scores: Record<id, number>, readiness}` | One collection | Sync, then query. `matches` = relevant matches only (relevance rule), best-first, ≤ `limit` (default 20). `scores` = the similarity of each fresh id in `scoreIds` (R-2: lets the consumer order exact matches best-first) | `collection: string` (consumer-owned key); `items: {id, text}[]` = the complete current item set | Items not fresh are never returned as meaning matches |
| `EmbeddingIndex.sync(collection, items)` → `readiness` | One collection | Diff and schedule indexing; remove items absent from `items` | same | For warming; Task search uses `search` |
| `EmbeddingIndex.removeItems(collection, ids)` / `dropCollection(collection)` | Collection items / collection | Deletion | collection + ids / collection | Best-effort callers |
| `EmbeddingIndex.modelStatus()` → `{activeModelId, state, reason?}` | Active model | Status (future model UI, logs) | none | — |
| `EmbeddingIndex.retryModel()` | Active model | Clear `unavailable` and re-attempt on next need | none | — |
| `ProjectTaskSearchService.search(projectId, query, {limit?, waitForReadyMs?})` → `{matches: {taskId, match: "exact"\|"meaning"}[], meaningSearch: readiness}` | Tasks of one Project | Search policy | `projectId` (long ID) | Unknown Project → `ProjectError(PROJECT_NOT_FOUND)` from `listTasks` |
| `ProjectTaskSearchService.forgetTask(projectId, taskId)` / `forgetProject(projectId)` | Index entries of a Task / Project | Cleanup after delete | long IDs | Synchronous call that never throws and never awaits indexing; the removal completes in the background (QR-006) |
| GraphQL `searchProjectTasks(projectId: String!, query: String!): ProjectTaskSearchResult!` | Tasks of one Project | Board transport | `projectId` | Result: `matches [{taskId, match: EXACT\|MEANING}]`, `meaningSearch {state: READY\|PREPARING\|UNAVAILABLE, phase, done, total, reason}` |
| GraphQL `retryEmbeddingModel: Boolean!` | Active model | Retry | none | Mutation |
| Tool `search_project_tasks({project_id, query, limit?})` | Tasks of one Project | Agent transport | `project_id` | Result `{projectId, tasks: [{taskId: <key>, status, summary, match}], meaningSearch: {state, note?}}`; `limit` 1–30, default 10 |
| Setting `AUTOBYTEUS_EMBEDDING_MODEL` | Active model | Operator choice | catalog id | `allowedValues` = catalog ids; blank = default |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `EmbeddingIndex.search` | Yes | Yes (collection string, item ids) | Low | Collection keys are owned by one consumer each; Task search builds `project-tasks/<projectId>` in one function |
| `ProjectTaskSearchService.search` | Yes | Yes | Low | — |
| `searchProjectTasks` | Yes | Yes | Low | — |
| `search_project_tasks` | Yes | Yes (`project_id`; results use the key as `taskId`, like every Project tool) | Low | — |
| `retryEmbeddingModel` | Yes | N/A (active model) | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Layer boundary | `EmbeddingIndex` | Yes | Low | — |
| Model selection | `EmbeddingModelCatalog`, `EmbeddingModelDefinition`, setting `AUTOBYTEUS_EMBEDDING_MODEL` | Yes | Low | Model ids are product names (`mdbr-leaf-ir`), not schema versions (DESIGN.md rule 8) |
| Worker owner | `EmbeddingModelRunner` / `embedding-worker.ts` | Yes | Low | — |
| Store | `EmbeddingVectorStore` | Yes | Low | — |
| Task search | `ProjectTaskSearchService` | Yes | Low | — |
| Web | `useProjectTaskSearch` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| SQLite storage | `node:sqlite` usage in application storage | Reuse (technology) | Built in, already used, no extension needed | New file because the data is a disposable cache with its own lifecycle |
| Main DB (Prisma) | `production.db` | Not used | Would need a Prisma migration for disposable data and couples cache resets to the operational DB | — |
| Settings | `ServerSettingsService` predefined settings | Extend | Server-side, existing UI, `allowedValues` validation | — |
| Agent tool exposure | Project tool contract/manifest + MCP adapter | Extend | One manifest entry reaches native and MCP | — |
| Download | `utils/downloader.ts`, `download-utils.ts` | Not reused | 30 s total timeout, no checksum, no atomic rename; changing them affects other callers | Model files need streaming with no total timeout, SHA-256 and rename |
| Model runtime | Voice-input Electron extension | Not reused | Electron-only (REQ-012) | Server-side requirement |
| Web data access | Apollo client + `graphql/queries` | Reuse | Existing pattern | — |
| Board search text | `projectTaskStore.searchByProjectId` | Reuse | Shared with Temp tasks; clearing on create and node reset already owned there | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/embeddings/` | Catalog, setting, model files, runner/worker, vector store, index, relevance | DS-003, DS-004, DS-007, DS-008 | `EmbeddingIndex` | Create New | Product-agnostic |
| `autobyteus-server-ts/src/projects/search/` | Task search policy and cleanup | DS-001, DS-002, DS-006 | `ProjectTaskSearchService` | Create New (inside existing Projects subsystem) | — |
| `autobyteus-server-ts/src/projects/services/` | Delete hooks | DS-006 | Task/Project services | Extend | Two calls |
| `autobyteus-server-ts/src/api/graphql/types/` | Transport | DS-001, DS-005 | Resolvers | Extend | Two new type files |
| `autobyteus-server-ts/src/agent-tools/project-tasks/` | Tool contract | DS-002 | Manifest | Extend | — |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Setting registration | DS-007 | — | Extend | — |
| `autobyteus-web` board + composable + GraphQL docs + localization | UI | DS-001, DS-005 | Board | Extend / Create | — |
| `autobyteus-web/scripts/prepare-server.mjs` | Desktop server packaging | — | — | Extend | Prune step |
| `autobyteus-agents` `agents/project-task-manager/` | PTM tool list + skill | DS-002 | — | Extend | Companion PR |

## Draft File Responsibility Mapping

Drafted, then tightened. The final table below is authoritative. Changes during tightening:

- The relevance rule was split out of the index.
- The setting moved next to the catalog.
- The worker protocol types moved into the worker file, as type-only exports, so the worker has no server imports.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Model definition | `embeddings/catalog/embedding-model-definition.ts` | embeddings | Used by catalog, setting, files, runner, worker data, index | Yes | Yes | A generic "AI model" config for LLMs |
| Readiness | `embeddings/embedding-readiness.ts` | embeddings | Index, Task search, GraphQL, tool | Yes | Yes | A Task-specific status |
| Worker protocol messages | `embeddings/runtime/embedding-worker.ts` (exported types) | embeddings | Runner and worker | Yes | Yes | Shared with other workers |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `EmbeddingModelDefinition` `{id, displayName, licence, languages, source: {repo, revision}, files: {path, sha256, bytes}[], onnxFile, tokenizerFiles, maxTokens, queryPrefix, documentPrefix, output: "sentence_embedding" \| {pool: "cls"\|"mean"\|"last"}, dimensions, relevance: {clearMatchFloor, nearBestMargin}}` | Yes | Yes | Low | `files` is the one download/verify list; `onnxFile`/`tokenizerFiles` name roles within it. External data files are listed in `files` and resolved next to `onnxFile` |
| `EmbeddingReadiness` `{state: "ready"} \| {state: "preparing", phase: "downloading"\|"loading"\|"indexing", done, total} \| {state: "unavailable", reason}` | Yes | Yes | Low | `done/total` count bytes while downloading and items while indexing; `phase` says which |
| `ProjectTaskSearchResult` | Yes | Yes | Low | Matches carry `taskId` + `match` only; the board already holds Task views |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/embeddings/catalog/embedding-model-definition.ts` | embeddings | type | `EmbeddingModelDefinition` type | One shape | — |
| `src/embeddings/catalog/embedding-model-catalog.ts` | embeddings | `EmbeddingModelCatalog` | The three approved catalog entries (DEC-002): `mdbr-leaf-ir` (default), `granite-embedding-small-english-r2`, `embeddinggemma-2` (multilingual; verified on WASM, cost stated in the entry's description); `getEmbeddingModelDefinition(id)`, `DEFAULT_EMBEDDING_MODEL_ID` | Data + lookup | definition |
| `src/embeddings/catalog/embedding-model-setting.ts` | embeddings | setting | `AUTOBYTEUS_EMBEDDING_MODEL` key, description (lists each model with language and cost), allowed values (catalog ids; blank allowed = default), `resolveActiveEmbeddingModel()` (read at use time; blank → default; an unknown value, e.g. set directly in an env file, → default plus one logged warning naming the value (R-6)) | One setting | catalog |
| `src/embeddings/models/embedding-model-files.ts` | embeddings | `EmbeddingModelFiles` | Per-model folder, ensure (verify / download / verify / rename), progress callback, `removeAllExcept(id)` | Download and integrity concern | definition |
| `src/embeddings/runtime/embedding-worker.ts` | embeddings | worker entry | Self-contained: load ort-web (WASM, threads) + tokenizer from paths in `workerData`, embed request handling, protocol types | Worker boundary | none (by rule) |
| `src/embeddings/runtime/embedding-model-runner.ts` | embeddings | `EmbeddingModelRunner` | Start/stop worker, queue with priority, idle stop, error mapping, thread count | Worker lifecycle | definition |
| `src/embeddings/store/embedding-vector-store.ts` | embeddings | `EmbeddingVectorStore` | `node:sqlite` file open/recreate-aside, table, read/upsert/delete by collection and model | Persistence | — |
| `src/embeddings/embedding-readiness.ts` | embeddings | type | Readiness type + helpers | Shared shape | — |
| `src/embeddings/relevance.ts` | embeddings | function | `selectRelevant(scores, calibration, limit)` | One rule | definition |
| `src/embeddings/embedding-index.ts` | embeddings | `EmbeddingIndex` + `getEmbeddingIndex()` | Public boundary; readiness state machine; collection caches and jobs; search/sync/remove/drop/status/retry | The layer's authority. If it grows beyond about 400 lines, split the collection job into `collection-indexing-job.ts` under the same owner | all above |
| `src/projects/search/project-task-search-service.ts` | projects | `ProjectTaskSearchService` + `initializeProjectTaskSearchService(deps)` / `getProjectTaskSearchService()` | Search policy, merge, cleanup; constructor deps `{listTasks, index}` (no module import of `project-task-service`) | One owner | readiness |
| `src/compositions/project-task-execution-resource-composition.ts` | compositions | existing | Initialize the search service with `listTasks` from the composed `ProjectTaskService` and `getEmbeddingIndex()`; pass the cleanup port to the Task service | Composition already binds Projects | — |
| `src/projects/services/project-task-service.ts` | projects | existing | After a committed `deleteTask`: `forgetTask` (best-effort) | Hook | — |
| `src/projects/services/project-service.ts` | projects | existing | After a committed `deleteProject`: `forgetProject` (best-effort) | Hook | — |
| `src/api/graphql/types/project-task-search.ts` | api | resolver | `searchProjectTasks` query + GraphQL types | Transport | readiness |
| `src/api/graphql/types/embeddings.ts` | api | resolver | `retryEmbeddingModel` mutation | Transport | — |
| `src/api/graphql/schema.ts` | api | existing | Register the two resolvers | — | — |
| `src/agent-tools/project-tasks/project-task-tool-contract.ts` | agent-tools | existing | Name, description, schema, parser for `search_project_tasks` | Contract | — |
| `src/agent-tools/project-tasks/project-task-tool-manifest.ts` | agent-tools | existing | Execute `search_project_tasks` → service; project the compact result | Manifest | — |
| `src/agent-tools/project-tasks/project-task-native-tools.ts` | agent-tools | existing | `SearchProjectTasksTool` class + registration | Native | — |
| `src/services/server-settings-service.ts` | services | existing | Register the setting with `allowedValues` | Registration | setting |
| `autobyteus-server-ts/package.json` | server | — | Add `onnxruntime-web` (exact pinned version) and `@huggingface/tokenizers` | — | — |
| `autobyteus-web/scripts/prepare-server.mjs` | web packaging | existing | Prune `node_modules/onnxruntime-web/dist` to the files the Node build loads | Packaging | — |
| `autobyteus-web/composables/projects/useProjectTaskSearch.ts` | web | composable | Debounce, query, polling while preparing, retry, re-query on list change | One concern | — |
| `autobyteus-web/graphql/queries/projectTaskSearchQueries.ts`, `graphql/mutations/embeddingMutations.ts` | web | documents | GraphQL documents | — | — |
| `autobyteus-web/components/projects/ProjectTaskBoard.vue` | web | existing | Use composable results; status line; remove predicate | — | — |
| `autobyteus-web/localization/messages/{en,zh-CN}/projects.ts` | web | existing | Placeholder, status texts, Retry | — | — |
| `autobyteus-web/types/project.ts` | web | existing | Result types | — | — |
| Docs (see Change Scope) | docs | — | — | — | — |
| `autobyteus-agents/agents/project-task-manager/agent-config.json`, `skills/project-task-management/SKILL.md` | companion | — | Add the tool; skill guidance (search before creating a possibly duplicate Task, and when the user refers to a Task by description) | — | — |

## Applied Patterns (If Any)

- **Registry/catalog:** `EmbeddingModelCatalog`, a static lookup by id. It holds data only; no business logic.
- **State machine:** model readiness inside `EmbeddingIndex` (DS-004).
- **Worker loop:** `EmbeddingModelRunner` + worker (DS-008).
- **Repository:** `EmbeddingVectorStore` behind `EmbeddingIndex`.
- **Adapter:** the GraphQL resolver and tool manifest entry.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/embeddings/` | Folder | `EmbeddingIndex` | Generic embedding capability | New capability area, product-agnostic | Project/Task knowledge |
| `src/embeddings/catalog/` | Folder | catalog | Model definitions, catalog, setting | Model-specific data in one place (switchability) | Runtime or I/O |
| `src/embeddings/models/` | Folder | model files | Download, verify, place | Files concern | Index state |
| `src/embeddings/runtime/` | Folder | runner | Worker + runner | Execution concern | Persistence |
| `src/embeddings/store/` | Folder | vector store | SQLite file | Persistence concern | Model logic |
| `src/embeddings/{embedding-index,embedding-readiness,relevance}.ts` | Files | boundary | Public boundary + shared shapes | Top of the capability | — |
| `src/projects/search/` | Folder | `ProjectTaskSearchService` | Task search policy | Inside Projects (subject owner) | Embedding internals |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/embeddings/` (root files) | Main-Line Domain-Control | Yes | Low | Boundary + two small shared files |
| `src/embeddings/catalog/` | Off-Spine Concern | Yes | Low | Data-only |
| `src/embeddings/models/` | Persistence-Provider | Yes | Low | One file now |
| `src/embeddings/runtime/` | Persistence-Provider (execution provider) | Yes | Low | Two files |
| `src/embeddings/store/` | Persistence-Provider | Yes | Low | One file |
| `src/projects/search/` | Main-Line Domain-Control | Yes | Low | One file |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| A future collection (conversations) | `getEmbeddingIndex().search("agent-run-messages/<runId>", messages.map(m => ({id: m.id, text: m.text})), query)`, with one new consumer service and no change in `src/embeddings/` | Adding `if (collection.startsWith("conversation"))` inside the index, or a conversation-specific table | Proves REQ-011 / AC-013 |
| Switching models | Operator sets `AUTOBYTEUS_EMBEDDING_MODEL=granite-embedding-small-english-r2`. The next search shows "Preparing… downloading", then "indexing N of M", then ready; old rows/files removed | Mixing old LEAF-IR vectors with Granite query vectors; requiring a restart; a model `if/else` in the worker | REQ-015 |
| Catalog entry (default) | `{id: "mdbr-leaf-ir", source: {repo: "MongoDB/mdbr-leaf-ir", revision: "4262131b32c3182bd06e67e92ae69d7bd66e0c5c"}, onnxFile: "onnx/model_quantized.onnx", files: [{path: "onnx/model_quantized.onnx", sha256: "8c08cb4e…5718", bytes: 220597}, {path: "onnx/model_quantized.onnx_data", sha256: "e77ea96a…3f8b", bytes: 22954752}, {path: "tokenizer.json", sha256: "da0e7993…62a0"}, {path: "tokenizer_config.json", sha256: "46ac231e…07b4"}], maxTokens: 512, queryPrefix: "Represent this sentence for searching relevant passages: ", documentPrefix: "", output: "sentence_embedding", relevance: {clearMatchFloor: <calibrated>, nearBestMargin: <calibrated>}, licence: "Apache-2.0", languages: ["en"]}` (full hashes in investigation notes) | Hard-coding prompts or pooling in the worker | Everything model-specific is data |
| Board merge | Query "docker". Exact tier: every Task containing "docker", ordered by meaning score then `updatedAt`. Meaning tier: the near-best Tasks not already exact. Lanes show both, best-first | Showing only meaning matches and losing literal matches; or fusing BM25 into one score | REQ-002/REQ-003; probe evidence |
| Readiness during first use | `{matches: [exact…], meaningSearch: {state: PREPARING, phase: INDEXING, done: 40, total: 170}}`; the board re-queries every 2 s | Blocking the GraphQL call until indexing ends; showing an error | REQ-009 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep the client-side substring predicate as a fallback when the server search fails | Resilience | Rejected | The server always returns exact matches (independent of the model); on a transport error the board shows the existing request-error pattern |
| Keep vectors from a previous model and query them until re-index completes | Faster switch | Rejected | Vectors are model-specific; meaning results resume when the new index is ready; exact matches continue |
| A schema-version column in `embedding_vectors` | Future changes | Rejected (guideline §3) | Disposable store; recreate-aside on unknown shape |

## Derived Layering (If Useful)

Transport (GraphQL, tool) → Task search policy (`projects/search`) → embedding boundary (`EmbeddingIndex`) → mechanisms (store, runner/worker, model files, catalog).

## Change / Refactor Sequence

1. **Dependencies.** Add `onnxruntime-web` (pin exact, e.g. `1.30.0`) and `@huggingface/tokenizers` (`0.2.0`) to `autobyteus-server-ts`.
2. **Catalog.** Definition type, catalog with the three approved entries (LEAF-IR default, Granite small R2, EmbeddingGemma 2), setting file, and registration in `ServerSettingsService`. Then verify and calibrate every entry on the production stack (§G2). If any entry fails verification, stop and return a `Design Impact` to the Solution Designer: changing the approved catalog is the user's decision.
3. **Embeddings internals.** `EmbeddingModelFiles` → worker + runner → `EmbeddingVectorStore` → readiness/relevance → `EmbeddingIndex` (+ unit tests with a fake runner and a test collection, AC-013).
4. **Task search.** `ProjectTaskSearchService` + delete hooks (+ unit tests).
5. **Transport.** GraphQL `searchProjectTasks`, `retryEmbeddingModel`; tool `search_project_tasks` (contract, manifest, native class); server E2E.
6. **Web.** Composable, board changes, localization, web tests; browser probe.
7. **Packaging.** Prune in `prepare-server.mjs`; packaged-server smoke that embeds once (§G6).
8. **Docs.** Server `embeddings.md`, `projects.md`, `agent_tools_mcp_server.md`, `search.md`; web `docs/projects.md`.
9. **Companion.** `autobyteus-agents` PR (PTM tool list + skill).
10. **Validation.** Synthetic test data package, real-app run, measurements (AC-015).

## Key Tradeoffs

- **WASM vs native runtime:**
  - WASM is about 3–4× slower per Task than native on the same model (Granite: 487 vs ≈ 120 ms/Task; LEAF-IR: 106 vs 37 ms).
  - In exchange it is identical on all 7 targets, ships no native binaries (`onnxruntime-node` lacks Intel-Mac builds), and has no postinstall step.
  - With LEAF-IR the WASM cost is still small (18 s for today's backlog).
- **Separate SQLite file vs a Prisma table:** independence from migrations and from the 875 MB operational DB, a simple discard/rebuild story, versus one more file under app data.
- **Reconcile-by-fingerprint at search time vs event-driven indexing:** correctness by construction (current Tasks are read on every search; deleted Tasks can't appear; restarts and external edits are covered) and no coupling to the change feed. The cost is that an edited Task's new meaning is indexed when the next search runs (≈ 0.1 s plus a possible worker start), which meets QR-002 from the user's point of view. Event-driven pre-indexing can be added later if measured useful (DESIGN.md phase 2).
- **Polling vs push for readiness:** polling only while preparing; no new feed message type.
- **One active model per server** (not per collection): simpler memory (one worker) and operator story. The vector rows carry `model_id`, so per-collection models stay possible later.

## Risks

- **RSK-002, download behind proxies/firewalls:** Node's `fetch` ignores `HTTPS_PROXY` (as do existing server fetches). Mitigation: clear `unavailable` reason naming the host; FU-2.
- **RSK-004, relevance calibration margin is thin for some models:** calibrate per catalog entry on the synthetic data package and the probe procedure; AC-004 allows ≤ 10% misses.
- **RSK-005, WASM memory:** mitigated by idle termination; measured in AC-015.
- **RSK-006, catalog entry fails on the production stack:**
  - All three entries were run on ort-web WASM during design. EmbeddingGemma 2 `model_quantized` needs empty modality inputs and passes QR-007.
  - Residual risk: the official tokenizer or a pinned file behaves differently at implementation time.
  - Response: a `Design Impact` to the Solution Designer, which takes the catalog change to the user. Entries are never dropped silently.
- **RSK-009, EmbeddingGemma 2 cost:** about 4.3 s per Task on WASM (M1 Max), 1.1–1.5 GB of memory and a ≈ 346 MB download.
  - It is the approved multilingual option, not the default.
  - QR-003/QR-004 targets are defined for the default model (QR-003 says other catalog models may be slower, stated per model).
  - The entry's description and `docs/modules/embeddings.md` state these costs so an operator can choose knowingly.
- **RSK-007, `node:sqlite` ExperimentalWarning on Node 22:** already present for existing server features; no action.
- **RSK-008, listTasks cost at 1,000+ Tasks:** measure (QR-001); FU-4 if needed.

## Guidance For Implementation

- **G1 Worker:**
  - The worker file must be importable as a standalone worker entry in both `src` (Node type stripping; erasable TypeScript only, no enums/namespaces/parameter properties) and `dist`. The runner locates it as a sibling of its own module with the same extension (`.ts` under vitest/tsx, `.js` in `dist`).
  - `worker.unref()` so it never keeps the process alive.
  - Threads: `Math.min(4, Math.max(1, Math.floor(os.availableParallelism() / 2)))`.
- **G2 Catalog entry verification and calibration** (required for each of the three approved entries; a failure is a `Design Impact` to the Solution Designer, never a silent drop):
  - Pin the repo revision; compute SHA-256 of every file at that revision (LEAF-IR ONNX hashes are already verified; the official tokenizer hashes are in the investigation notes).
  - Run the entry on the production stack (ort-web + tokenizers) over the synthetic test data package and confirm rankings meet QR-007.
  - Derive `relevance.clearMatchFloor` and `nearBestMargin` with the procedure in `model-evaluation-report.md` §4. The margin is the p95 of "top score minus relevant score"; the floor separates on-topic from off-topic top scores.
  - Record the values and the evidence in the catalog file comments and the validation report.
  - The official LEAF-IR tokenizer differs from the community export used in the probes; verify rankings with the official file.
  - EmbeddingGemma 2:
    - Pin `onnx-community/embeddinggemma-2-ONNX` @ `daa72c51243991dfcaf9f9137d2c573d8f7790c0`, files `onnx/model_quantized.onnx` + `onnx/model_quantized.onnx_data`, `tokenizer.json`, `tokenizer_config.json` (hashes in the investigation notes).
    - The worker feeds every graph input other than `input_ids`/`attention_mask`/`token_type_ids`/`position_ids` as an empty float tensor `[0, <dim>]` taken from the session's input metadata. This is generic, not a model branch. The entry's `output` is `sentence_embedding`.
    - Prefixes: `task: search result | query: ` / `title: none | text: `.
- **G3 Exact tier:**
  - Use `description.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())`, today's rule, so every current match still matches (REQ-002).
  - Empty or whitespace query → the GraphQL query is not sent; the board shows the unfiltered board as today.
- **G4 Merge and order:**
  - Exact matches first, ordered by meaning score when available, then `updatedAt` desc, then `taskId`.
  - Then meaning-only matches by score.
  - The board places them in their status lanes in that order; lane counts count matches.
  - The Cancelled lane and toggle behave as today (search applies to shown Tasks).
  - The locator clears the search when its Task is not among the *settled* matches (R-3).
  - Candidate set (R-1): the relevance rule ranks over all of the Project's Tasks, including Cancelled. The board shows matches in the shown lanes; `isNoMatch` is computed from the matches in shown lanes; toggling Cancelled does not re-query.
  - Request order (R-3): in `useProjectTaskSearch` the latest request wins. A response for an older query or Project is ignored.
  - Incremental indexing (R-7): after an edit, readiness is `preparing` for about one batch, so the status line may appear for one polling interval. This is expected; web tests and `docs/projects.md` note it.
- **G5 Agent wait:**
  - `waitForReadyMs = 30_000` for the tool; 0 for GraphQL.
  - When the wait expires, return the current matches with `meaningSearch: {state: "preparing", note: "Meaning search is still preparing (N of M Tasks indexed); results are exact text matches only."}`. When unavailable: `note` with the reason.
- **G6 Packaging:**
  - Prune `onnxruntime-web/dist` in `prepare-server.mjs` to exactly the files the Node build loads; determine them by running the packaged server once with file-access tracing, not by guessing.
  - Add a packaged check that embeds one string (e.g. in `verify-packaged-server-startup.mjs` or a dedicated step) so a wrong prune fails the build, not the user.
- **G7 Download:**
  - `fetch` with an idle/connect timeout (no total timeout).
  - Stream to `<file>.part`, hash while writing, verify size + SHA-256, `rename`.
  - Single flight per model.
  - Readiness progress counts bytes.
  - The URL form is `https://huggingface.co/<repo>/resolve/<revision>/<path>`.
- **G8 Store:**
  - Open lazily.
  - `PRAGMA journal_mode=WAL` is acceptable (own file).
  - Vectors as `Float32Array` → BLOB.
  - On open failure or unexpected table shape: rename aside + recreate (logged).
- **G9 Tests (implementation scope):**
  - Fake runner (deterministic vectors) for index/search tests.
  - A test-only second collection (AC-013).
  - Two fake catalog entries for the switch (AC-016).
  - A store test with a temp file, including a corrupted-file recreate.
  - Tool parser/manifest tests.
  - GraphQL E2E.
  - Web composable/board tests.
  - A gated real-model test (`RUN_EMBEDDING_MODEL_E2E=1`; add the gate to `TEST_ENVIRONMENT_ALLOWLIST`) that downloads the default model to a temp dir and checks the synthetic quality set.
  - Never use the user's `~/.autobyteus` data in tests (TESTING.md); the synthetic Task set lives under `autobyteus-server-ts/tests/fixtures/project-task-search/`.
- **G11 Licences and notices (REQ-013, AC-014; AR-002):**
  - npm dependencies (`onnxruntime-web` MIT, `@huggingface/tokenizers` Apache-2.0) keep their own `LICENSE`/notice files. `LICENSING.md` ("Third-party components keep their own licenses… and the license of each dependency") needs no change, and no `THIRD_PARTY_NOTICES` entry is needed: that folder holds vendored code (noVNC), not npm dependencies. The G6 prune must keep `LICENSE*`, `NOTICE*` and `package.json` of `onnxruntime-web` and its dependencies.
  - Models are not shipped. The server downloads them from their source at first use. Each catalog entry records `licence` and `source`, and `docs/modules/embeddings.md` lists every model with source, revision, licence (Apache-2.0 for all three) and cost for operators.
  - Validation runs `python3 scripts/check_licensing.py` and `python3 scripts/check_repository_artifact_hygiene.py` (RELEASE.md).
- **G10 File size:** keep each source file under 500 lines (Example 11); split `embedding-index.ts` along the collection-job seam if needed.
