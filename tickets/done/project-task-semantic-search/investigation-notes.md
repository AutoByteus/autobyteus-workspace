# Investigation Notes

## Investigation Meta

- Package identifier: `project-task-semantic-search`
- Request / ticket: Project Task `autobyteus-71` (`project_task_9b35671b-5079-4dff-90ef-e62a71289ed9`): "Local semantic search for Project Tasks, built on a reusable local embedding layer (CPU model, SQLite, no separate vector database)"
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-semantic-search`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-semantic-search` / `codex/project-task-semantic-search`
- Resolved base remote / branch / revision: `origin` / `personal` / `55bff1f5eea1f140bab6e372e3faadeb7ea33465` (fetched 2026-10-18)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md)
- Companion repository (agent definition only): `/Users/normy/autobyteus_org/autobyteus-agents` (`main` at `887e79d`), Project Task Manager package `agents/project-task-manager/`
- Bootstrap result: worktree and branch created from the fetched `origin/personal`; ticket folder `tickets/in-progress/project-task-semantic-search/`
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read: `references/requirements-engineering.md` (2026-10-18); repository `AGENTS.md`, `DESIGN.md`, `TESTING.md`, `RELEASE.md`, `autobyteus-server-ts/AGENTS.md`, `autobyteus-server-ts/docs/design/startup_initialization_and_lazy_services.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` (sections 1–2), `autobyteus-server-ts/docs/modules/projects.md`, `autobyteus-web/docs/projects.md` (board/search sections) (all 2026-10-18)
- Investigation status: requirements investigation complete; architecture-level probes recorded below (feasibility evidence, not yet the approved design)

## Initial Request And Clarifications

- Original request (user, 2026-10-13, relayed by the Project Task Manager): add embedding-based semantic search to the existing Projects task search so users find relevant Tasks by meaning, including paraphrases. Keep it simple and lightweight, local CPU model, no GPU, no hosted embedding API, no separate vector database / database server / external search service.
- Bigger direction (user, 2026-10-18, GO-AHEAD): search is for the user (Projects board) **and** for the Project Task Manager (a tool: "give it a sentence and get the matching Tasks back"). Build a **reusable embedding layer** (model runner, vector storage, indexing/incremental updates, a query interface taking a collection + text and returning scored ids); Task search is its first user. Other collections (agent conversations, memory, notes) come later and must plug in without redoing the layer; they are not built now.
- Clarification (user, 2026-10-18, in this Solution Designer conversation): *"i believe our server also have built in sqlite… you can also choose your own… what if I said something wrong about the technical solution… Forget about the SQL i told you, you will decide the best technical architecture."* The storage/SQLite suggestion is no longer a direction; the technical architecture is the team's decision. The other constraints (local, CPU, no separate database server/vector DB, no hosted embedding API or external search service, proportionate footprint) remain the request's hard constraints.
- Clarification (user, 2026-10-18, second message): *"i dont want to be dependent on electron, it should be provided by the server the reason is that some user deploy the server in their own infra… the solution is server side solution."* → The whole capability (model provisioning, inference, index, search) is server-owned; no Electron-managed extension mechanism (unlike voice input) is used.
- User-supplied facts and constraints: candidates suggested (not approved): Gemma and Jina embedding families. Compare quality on actual Project Tasks, CPU latency, size, RAM, licensing/redistribution and installation complexity. Requirements and performance expectations must be agreed with the user.
- Initial ambiguity: what "matches" means for an embedding search (every Task has a similarity score), how results appear in the lane board, first-use model availability, language coverage, the agent tool's shape, and how key lookup (Task `autobyteus-126` / 8865a11e) stays consistent.

## Product And Domain Understanding

- Product area: Projects → Project Tasks (Projects page Tasks tab board; right-side panel "Projects" tab compact board); Project Task agent tools.
- Affected actors or systems: the user (desktop app and any browser connected to a node, including Docker nodes); the Project Task Manager agent (and any agent whose definition selects the new tool); the server process (indexing, model execution, persistence).
- Existing purpose: Projects hold Project Tasks (a description is the whole content; no title). The board shows To Do / In Progress / Done lanes (+ optional Cancelled lane) and a search box.
- Terminology: *Task key* = readable `<prefix>-<number>` (e.g. `autobyteus-42`); *meaning search* = embedding-based similarity; *exact match* = case-insensitive text/key containment; *collection* = one kind of item indexed by the embedding layer (first: Project Tasks).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-18 | Code | `autobyteus-web/components/projects/ProjectTaskBoard.vue` | Current board search | `matchesSearch`: `description.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())`; client-side over the already-loaded Project Task list; lanes grouped by status; `isNoMatch` state; search held per Project in `projectTaskStore.searchByProjectId` | Board search becomes server-assisted |
| 2026-10-18 | Code | `autobyteus-web/components/projects/TempTaskBoard.vue` | Second search box | Temp tasks (no Project) board uses the same substring search | Out of scope (decision DEC-007) |
| 2026-10-18 | Code | `autobyteus-web/components/projects/TaskDependencyPicker.vue` | Third search box | Picker filters `${taskKey} ${description}` substring | Unchanged |
| 2026-10-18 | Doc | `autobyteus-web/docs/projects.md` §"Continuous Task Board" | Documented board contract | "Search is a case-insensitive description substring across all statuses, transient per Project… Lane counts are filtered"; order `updatedAt` desc then `taskId`; search applies only to shown lanes; compact panel same | Preserved-behavior list |
| 2026-10-18 | Code | `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-contract.ts`, `project-task-tool-manifest.ts`, `project-task-native-tools.ts` | Agent tools | Tools: `list_projects`, `list_project_tasks(project_id, status?)`, `create_project`, `update_project`, `create_or_update_project` (deprecated), `create_task`, `update_task`. No search. `list_project_tasks` returns full descriptions, dependencies, context files and assignments for every Task | New tool `search_project_tasks` |
| 2026-10-18 | Code | `autobyteus-server-ts/src/agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.ts`, `docs/modules/agent_tools_mcp_server.md` | Non-native runtimes | Project tools are also exposed via the agent-tools MCP server, filtered by the agent's configured tool names | New tool must be in the manifest for both native and MCP exposure |
| 2026-10-18 | Doc | `autobyteus-server-ts/docs/modules/projects.md` | Persistence and tool rules | Tasks persist as files `<appData>/projects/<projectId>/tasks/<taskId>/task.json`; "Tools must be selected explicitly in the agent definition; no task tool is added automatically" | PTM definition change in companion repo |
| 2026-10-18 | Code | `/Users/normy/autobyteus_org/autobyteus-agents/agents/project-task-manager/agent-config.json`, `skills/project-task-management/SKILL.md` | PTM tool selection | `toolNames` lists the project tools explicitly; skill tells it to call `list_project_tasks` when new work could overlap open work | Add `search_project_tasks` to PTM's tool list and skill (companion repo) |
| 2026-10-18 | Code | `autobyteus-server-ts/src/projects/changes/project-change-publisher.ts` (`ProjectChangeMarks`) | Write notifications | Task writers call `taskChanged/taskRemoved/projectRemoved` after commits; the publisher builds `/ws/projects` frames | Possible index-update trigger (design) |
| 2026-10-18 | Code | `autobyteus-server-ts/src/projects/services/project-task-service.ts`, `stores/project-store.ts`, `stores/projects-layout.ts`, `domain/models.ts`, `domain/task-keys.ts` | Task model and writes | `ProjectTask {taskId, taskKey, description, status, contextFiles, dependsOnTaskIds, createdAt, updatedAt}`; create/update/delete through `ProjectTaskService`; key resolution via `TaskReferences` | Index content = description; identity = `taskId` |
| 2026-10-18 | Code | `autobyteus-server-ts/prisma/schema.prisma`, `src/config/app-config.ts`, `autobyteus-web/electron/server/serverRuntimeEnv.ts` | SQLite usage | Prisma (`repository_prisma`) over `<appData>/db/production.db` (875 MB on the user's install; token usage, secrets, migration ledger) | Storage options |
| 2026-10-18 | Code | `grep -rn "node:sqlite" autobyteus-server-ts/src` | Built-in SQLite | Node's built-in `node:sqlite` (`DatabaseSync`) is already used by the server (application storage, orchestration journals, secret-vault inspection, a migration) | Storage options |
| 2026-10-18 | Runtime | Electron 42.4.1 `ELECTRON_RUN_AS_NODE=1 Electron -e …` | Embedded server runtime | Node 24.16.0, N-API 10, `node:sqlite` works (SQLite 3.53.0, `loadExtension` available), WebAssembly + SharedArrayBuffer available | Runtime compatibility |
| 2026-10-18 | Runtime | `docker run --rm --entrypoint bash autobyteus/autobyteus-server:beta -lc 'node …'` | Docker runtime | Node 22.23.3 on Ubuntu 24.04 aarch64; `node:sqlite` works (SQLite 3.51.3) with an ExperimentalWarning | Runtime compatibility |
| 2026-10-18 | Runtime | `node --version` (dev host) | Dev runtime | Node 22.23.1; Apple M1 Max, 10 cores, 64 GB | Benchmark host (fast machine; other agents' test suites ran concurrently — timings are indicative) |
| 2026-10-18 | Code | `.github/workflows/release-desktop.yml` | Release targets | Desktop builds: macOS arm64, macOS x64, Linux x64, Linux arm64, Windows x64; Docker: linux/amd64 + linux/arm64 (`docker/build-multi-arch.sh`) | Model runtime must work on all |
| 2026-10-18 | Code | `/Applications/AutoByteus.app/Contents/Resources/server` (installed app) | Package footprint | Packaged server ≈ 883 MB (mostly `node_modules`); app bundle ≈ 1.5 GB; server RSS ≈ 400 MB while running | Footprint proportionality baseline |
| 2026-10-18 | Code | `autobyteus-web/electron/extensions/*` (voice input) | Precedent for local models | Voice input is an Electron-managed extension downloaded on demand (manifest, SHA-256, progress phases) | Precedent: on-demand verified download is an accepted product pattern; but it is Electron-only, while Task search must also run on Docker nodes |
| 2026-10-18 | Code | `autobyteus-android/README.md`, `autobyteus-web/pages/mobile.vue`, `components/mobile/*` | "Mobile/phone server connections" | Android/iOS are WebView shells for a node's `/mobile` page; they run no server; `/mobile` has no Projects board | Server-side search serves any client; nothing to build for mobile |
| 2026-10-18 | Data | `python3 -I probes/corpus_stats.py ~/.autobyteus/server-data` (read-only) | Realistic corpus | 167–168 Project Tasks in 7 Projects; description length median 2,461 chars, p90 4,532, max 24,805, total 472 K chars (≈ 786 tokens per Task on average); 1 Task contains CJK text; statuses TODO 64, IN_PROGRESS 16, DONE 77, CANCELLED 10 | Long texts → model context length matters; English dominates |
| 2026-10-18 | Data | Task `autobyteus-126` (`project_task_8865a11e…`) description (read-only) | Key lookup consistency | "Board search matches the Task key too, in any letter case, exactly or by prefix… Related and not to be mixed: the semantic search Task 9b35671b" — TODO | Consistency decision DEC-006 |
| 2026-10-18 | Web | Hugging Face API `https://huggingface.co/api/models/<id>` and `/tree/main/onnx` | Licences, gating, sizes | See External Contracts table | Model choice |
| 2026-10-18 | Web | npm registry `onnxruntime-node`, `onnxruntime-web`, `@huggingface/transformers`, `@huggingface/tokenizers`; unpkg file probes | Runtime packaging | See Runtime table | Runtime choice |
| 2026-10-18 | Command | `probes/bench.mjs` via `probes/run_matrix.sh` (transformers.js 4.3.1, read-only corpus) | Quality/latency/RAM comparison | See Benchmark table | Model choice |
| 2026-10-18 | Command | `probes/lean.mjs` (onnxruntime-web 1.30.0 Node build + @huggingface/tokenizers 0.2.0) | Production-candidate stack | See Benchmark table | Runtime choice |
| 2026-10-18 | Command | `python3 -I probes/lexical.py` | Baselines | Current substring search: 0/40 paraphrased queries return anything; BM25 keyword ranking: recall@5 0.775 | Improvement evidence |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User types in the Tasks-tab search box of a Project (Projects page) or the right-panel Projects tab board | Board loads the Project's full Task list via GraphQL `projectTasks`; each keystroke filters client-side by description substring; lanes keep `updatedAt` desc order; Cancelled lane only when toggled; whole-board no-match state with Clear search | Exact substring only; a paraphrase finds nothing (0/40 probe queries matched any Task) | `ProjectTaskBoard.vue`, `web/docs/projects.md` | High |
| BEH-002 | Contract | An agent whose definition selects Project tools | `list_project_tasks(project_id, status?)` returns every Task with full description, dependsOn, context files and assignments | No search; for 168 Tasks the full list is ≈ 470 K characters (≈ 120 K tokens) of descriptions alone | tool contract/manifest | High |
| BEH-003 | System | Task create/update/delete (UI GraphQL mutations or agent tools) | `ProjectTaskService` writes `task.json`; `ProjectChangeMarks` publish to `/ws/projects`; board updates live | No derived index exists | service/publisher code | High |
| BEH-004 | System | First use / restart | No model, no index | — | — | No current supported behavior |
| BEH-005 | Contract (internal) | Future features embedding other subjects (conversations, memory, notes) | No embedding capability exists in server or `autobyteus-ts` (`grep -ril embedding` finds none) | — | grep | No current supported behavior |
| BEH-006 | User | Key lookup in board search | Not supported today (description only); planned in Task `autobyteus-126` (TODO) | — | Task 8865a11e text | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `autobyteus-web/stores/projectTaskStore.ts` | Holds per-Project Task lists and `searchByProjectId` | Search text stays per-Project transient | Store owns a search-result state per Project |
| `autobyteus-web/components/projects/ProjectTaskBoard.vue` | Board UI incl. compact panel mode and Task locator ("Show Task in Projects" clears a hiding search) | Locator must still be able to reveal a Task hidden by search | Matching becomes a set of ids from the server instead of a client predicate |
| `autobyteus-server-ts/src/api/graphql/types/project-tasks.ts` | `projectTasks`, `tasksWithoutProject`, mutations | New query for search | GraphQL query returns ranked ids + readiness |
| `autobyteus-server-ts/src/projects/changes/project-change-publisher.ts` | Post-commit marks | Index must not go stale | Index-update trigger candidate |
| `autobyteus-server-ts/src/agent-tools/project-tasks/*` | Shared tool contract for native + MCP | New tool | Add to the shared contract/manifest |
| `node:sqlite` users in `src/application-storage`, `src/application-orchestration` | Built-in SQLite files per application | Established pattern for a self-contained SQLite file | Storage candidate for vectors (design) |
| Prisma `production.db` | Main operational DB; schema migrations at startup | Adding tables needs a Prisma migration; DB is large | Storage candidate (design) |
| `docs/design/startup_initialization_and_lazy_services.md` | Lazy services; nothing heavy at import/startup | No model load at startup | Lazy model owner |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Task descriptions in `task.json` (read-only input to indexing).
- Model files (one-time download, ~52 MB) and the derived vector index (new, regenerable).

### Structural Surfaces

- New: embedding capability (model runner, vector store, index sync, similarity query) — new server subsystem.
- New: Project Task search (hybrid ranking over the embedding layer + exact text/key matching), GraphQL query, agent tool.
- Modified: web board search (server-assisted), store, localization strings; PTM agent definition (companion repo).
- Dependencies: a CPU inference runtime and tokenizer (new npm dependencies); packaging/licence notices.

### Potential Structural Impacts To Investigate

- API or external-contract change: Present — new GraphQL query and new agent tool (additive).
- Persistence schema or invariant change: Present — new derived index store (regenerable; no change to Task files).
- Security or privacy boundary change: Present (bounded) — a one-time network download of model files; all inference and data stay local.
- Concurrency or lifecycle change: Present — background indexing, lazy model load/unload, single-flight index sync.
- Deployment/packaging: Present — new dependencies in the packaged server and Docker image; licence notices.
- Confirmed absent: migration of existing Task data (Tasks unchanged).

## Runtime, Probe, Or Reproduction Findings

All probes read the user's Project Tasks **read-only** to measure quality on actual Tasks as the request asks; nothing was written to the user's data, and no copy of Task content is kept in the repository (the query set lists query text and target keys only). Durable tests must use synthesized Tasks (TESTING.md).

### Evaluation set

`probes/queries.json`: 40 queries written deliberately in different words from the target Tasks (e.g. "group symbol turned into a lightning bolt" → `autobyteus-3`; "stop companies from selling a closed modified copy of our code" → `autobyteus-7`), 1–3 relevant keys each. Metrics: recall@1/5/10 (a relevant Task at rank ≤ k) and MRR.

### Baselines (`probes/lexical.py`)

| Method | Queries with any result | recall@1 | recall@5 | recall@10 | MRR |
| --- | --- | --- | --- | --- | --- |
| Current board search (whole-query substring) | 0 / 40 | 0 | 0 | 0 | 0 |
| BM25 keyword ranking | 40 / 40 | 0.550 | 0.775 | 0.850 | 0.644 |

### Embedding models (transformers.js 4.3.1, `onnxruntime-node` CPU unless noted; chunks = ≈220-word windows, score = best chunk)

Corpus 167–168 Tasks; 40 queries. `load` includes first download where the model was not yet cached (rows 1–6); `ms/Task` = indexing time per Task; RSS = process resident memory after model load / after indexing (MB). Host: M1 Max, other agents' suites running concurrently.

| Model | dtype | Runtime | Indexed text | Dims | load ms | ms/Task | query ms (median) | RSS MB | r@1 | r@5 | r@10 | MRR |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Jina v2 small en | q8 | native | chunks | 512 | 5377 | 75.7 | 1.8 | 238 / 572 | 0.550 | 0.725 | 0.875 | 0.651 |
| **Granite small English R2** | q8 | native | chunks | 384 | 6025 | 120.3 | 3.3 | 240 / 601 | 0.800 | 0.950 | 0.975 | 0.858 |
| Arctic embed xs | q8 | native | chunks | 384 | 3399 | 57.5 | 3.7 | 228 / 543 | 0.625 | 0.850 | 0.900 | 0.720 |
| Multilingual E5 small | q8 | native | chunks | 384 | 13582 | 212.8 | 4.6 | 680 / 720 | 0.475 | 0.700 | 0.850 | 0.584 |
| Nomic embed v1.5 | q8 | native | chunks | 768 | 13503 | 488.2 | 13.6 | 371 / 1249 | 0.600 | 0.825 | 0.900 | 0.701 |
| EmbeddingGemma 300M | q4 | native | chunks | 768 | 20870 | 1520.8 | 21.5 | 495 / 685 | 0.825 | 1.000 | 1.000 | 0.888 |
| Jina v2 small en | q8 | native | first 1,024 tokens | 512 | 111 | 116.3 | 3.4 | 195 / 637 | 0.600 | 0.775 | 0.875 | 0.692 |
| **Granite small English R2** | q8 | native | first 1,024 tokens | 384 | 261 | 197.0 | 8.9 | 185 / 558 | **0.875** | 0.925 | **1.000** | **0.907** |
| EmbeddingGemma 300M | q4 | native | first 1,024 tokens | 768 | 1246 | 475.6 | 14.8 | 532 / 592 | 0.800 | 0.975 | 1.000 | 0.871 |
| bge small en v1.5 | q8 | native | first 512 tokens | 384 | 134 | 68.3 | 7.9 | 208 / 291 | 0.675 | 0.825 | 0.900 | 0.751 |
| bge small en v1.5 | q8 | native | chunks | 384 | 4199 | 92.6 | 3.2 | 236 / 527 | 0.650 | 0.825 | 0.925 | 0.733 |

Not run / stopped: EmbeddingGemma first-2,048-tokens (stopped: cost), transformers.js `device: wasm` runs (transformers.js WASM device failed under Node; the WASM stack is measured with `probes/lean.mjs` below).

Reading: Granite small R2 is the best quality per cost among permissively licensed models; EmbeddingGemma is marginally better at recall@5 (1.00 vs 0.925–0.95) but costs 2.4–12× more CPU per Task, ~4× the download and ~2× the memory, under Gemma terms. Jina's permissive model (v2) is clearly weaker; its newer models are non-commercial.

### Production-candidate stack (`probes/lean.mjs`: `onnxruntime-web` 1.30.0 WASM in Node 22 + `@huggingface/tokenizers` 0.2.0, Granite small R2 q8)

Run sequentially without other probes (other agents' suites still active on the host). Model files read from the local cache (no download in `load`).

| Threads | Indexed text | avg tokens/Task | load ms | ms/Task | 168 Tasks total | query ms median / p90 | RSS MB loaded / after indexing | r@1 | r@5 | r@10 | MRR |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | first 1,024 tokens | 635 | 338 | 1,481 | 249 s | 23.6 / 28.6 | 330 / 713 | 0.875 | 0.925 | 1.000 | 0.906 |
| **4** | **first 1,024 tokens** | 635 | 418 | **487** | **82 s** | **8.9 / 11.4** | 369 / 718 | 0.875 | 0.925 | 1.000 | 0.906 |
| 8 | first 1,024 tokens | 635 | 361 | 548 | 92 s | 15.5 / 30.1 | 412 / 757 | 0.875 | 0.925 | 1.000 | 0.906 |
| 4 | first 512 tokens | 456 | 334 | 290 | 49 s | 22.4 / 40.6 | 367 / 598 | 0.825 | 0.925 | 0.975 | 0.886 |
| 4 | chunks (≤512 each) | 786 | 427 | 485 | 81 s | 9.0 / 13.5 | 372 / 619 | 0.750 | 0.950 | 0.975 | 0.838 |
| native `onnxruntime-node` (same host, clean) | first 1,024 tokens | 635 | 247 | 114 | 19 s | 2.9 / 3.8 | 187 / 529 | 0.875 | 0.925 | 1.000 | 0.907 |

Readings:

- WASM gives identical rankings to native; it is ≈ 4× slower per Task with 4 threads (threads work in Node; 8 threads is no faster than 4).
- Queries are fast in every configuration (≈ 9 ms embedding with 4 threads; the cosine scan over 168 vectors is negligible).
- Memory: the WASM heap grows to ≈ 720 MB during indexing of 1,024-token inputs and is not returned while the runtime lives; ≈ 370 MB when only loaded. Releasing it requires ending the runtime instance (e.g. running inference in a worker that is terminated when idle) — design input.
- Whole-Task (first 1,024 tokens) indexing is the best ranking (MRR 0.906, r@10 1.0) with one inference per Task; chunking improves r@5 slightly (0.95) but lowers r@1/MRR.

### Ranking fusion and relevance cut-off (`probes/hybrid.py` over the whole-Task score dump; off-topic set `probes/offtopic.json`)

| Ranking | r@1 | r@5 | r@10 | MRR |
| --- | --- | --- | --- | --- |
| Embedding only (Granite, first 1,024 tokens) | 0.875 | 0.925 | 1.000 | 0.906 |
| BM25 only (stop-words removed) | 0.525 | 0.725 | 0.800 | 0.619 |
| Reciprocal-rank fusion BM25 + embedding (k = 10 / 30 / 60) | 0.700 | 0.975 / 0.950 / 0.950 | 1.000 | 0.80 / 0.79 / 0.79 |

→ Adding keyword ranking hurts the top result; exact text/key matches belong in a separate first tier, not in a fused score.

Score distribution (cosine, normalized vectors): every Task scores ≥ ≈ 0.68 for any query (homogeneous software-task corpus), so a fixed absolute cut-off alone cannot define "matches".

- Paraphrased queries: best relevant score min 0.781, p10 0.806, median 0.847; the relevant Task is within 0.03 of the top score for 40/40 queries (35/40 it *is* the top).
- "Tasks within 0.03 of the top score": shown median 1, p90 9, max 19; relevant included 40/40.
- Off-topic queries (`eval/offtopic.json`: "recipe for banana bread", "weather in Berlin tomorrow", "asdkjh qwezx plmok", "xyz", …): top score 0.689–0.773 vs ≥ 0.781 for real queries; top-minus-median spread 0.035–0.065 vs ≥ ≈ 0.065 for real queries. A floor on the top score (≈ 0.78 for this model) separates them on this sample, with a thin margin → RSK-004.
- Single words ("token", "docker", "license") score high (0.83–0.85) and are mostly covered by the exact tier as well.

### Current-model re-evaluation (2026-10-18, after the user's challenge)

The user pointed out (correctly) that the first comparison included old models (e.g. Jina v2 from 2023) and missed current ones, so it could not be trusted for a decision. Candidate discovery was redone from current sources (web search for 2025–2026 releases and leaderboards; Hugging Face API for every current compact model's licence, gating, parameters and ONNX files), and the test was made fairer and larger:

- **Queries:** 69 paraphrased queries (`probes/queries70.json` = the original 40 + 29 new ones over other Tasks). One query = 1.45 points.
- **Indexing:** every model indexes the whole Task (first 1,024 tokens; 512 where the model's limit is 512).
- **Model usage:** each model uses its model card's official query/document prompts and pooling.
- **Off-topic check:** off-topic separation uses 8 truly unrelated queries. "token" and "docker" were wrongly labelled off-topic in the first run and are excluded.
- **Harness:** `probes/bench2.mjs` (native CPU runtime via transformers.js), `probes/analyze2.py`, results `probes/current-models-results.jsonl`, `probes/current-models-analysis.md`.

New candidates found:

| Model | Released | Licence | Size |
| --- | --- | --- | --- |
| Google EmbeddingGemma 2 | 2026-09 | **Apache-2.0** (v1 was under Gemma terms) | 270M text model; 100+ languages; 8K context |
| Voyage 4 nano | 2026-01 | Apache-2.0 | 346M |
| Microsoft harrier-oss-v1 270M | 2026-03 | MIT | 270M |
| IBM Granite Embedding Multilingual R2 97M / 311M | 2026-04 | Apache-2.0 | 97M / 311M |
| Jina v5 text nano retrieval | 2026-02 | CC BY-NC (reference only) | 239M |
| Qwen3-Embedding-0.6B | 2025-06 | Apache-2.0 | 600M |
| Alibaba GTE-ModernBERT-base | 2025-01 | Apache-2.0 | 149M |
| MongoDB LEAF-IR | 2025-08 | Apache-2.0 | 23M; #1 on BEIR for ≤ 100M per its card |

Others found but not tested: Bekko (2026, MIT, Japanese-focused), Snowflake arctic-embed-m-v2.0 (2024) and Nomic v2 MoE (2025; no ONNX in the repo).

Quality on the actual Tasks (170 Tasks, 69 queries):

| Model | r@1 | r@5 | r@10 | MRR | Off-topic separated (best score cut) |
| --- | --- | --- | --- | --- | --- |
| Voyage 4 nano (q4) | 0.913 | **1.000** | 1.000 | **0.952** | 100% (0.322 vs off max 0.263) |
| Granite Small English R2 (q8) | **0.928** | 0.957 | 1.000 | 0.946 | 100% (0.786 vs 0.773) |
| EmbeddingGemma 2 (q8) | 0.913 | 0.971 | 0.986 | 0.940 | 98.7% |
| MongoDB LEAF-IR (q8) | 0.870 | 0.986 | 1.000 | 0.920 | 100% (0.210 vs 0.177) |
| EmbeddingGemma 2 (q4) | 0.884 | 0.942 | 0.986 | 0.916 | 97.4% |
| EmbeddingGemma 300M v1 (q4) | 0.855 | 0.986 | 1.000 | 0.913 | 100% |
| Jina v5 nano retrieval (q4, non-commercial) | 0.870 | 0.928 | 0.957 | 0.900 | 100% |
| GTE-ModernBERT-base (q8) | 0.812 | 0.957 | 0.971 | 0.875 | 100% |
| Qwen3-Embedding-0.6B (q8) | 0.797 | 0.942 | 0.942 | 0.866 | 98.7% |
| harrier-oss-v1 270M (q4) | 0.797 | 0.913 | 0.942 | 0.846 | 100% |
| Granite Multilingual R2 97M (quint8) | 0.710 | 0.913 | 0.971 | 0.795 | 98.7% |

Cost (native CPU runtime, M1 Max, other suites running):

| Model | Download | ms/Task | Query ms | RSS loaded / after indexing |
| --- | --- | --- | --- | --- |
| LEAF-IR | 24 MB | 37 | 1.7 | 145 / 251 MB |
| Granite small R2 | 55 MB | 122 | 3.0 | 188 / 626 MB |
| GTE-ModernBERT | 154 MB | 326 | 7.5 | 464 / 858 MB |
| EmbeddingGemma v1 q4 | ≈ 200 MB | 488 | 13 | 542 / 579 MB |
| Jina v5 nano q4 | 155 MB | 511 | 18 | 428 / 625 MB |
| Voyage 4 nano q4 | 252 MB | 844 | 33 | 384 / 907 MB |
| EmbeddingGemma 2 q4 / q8 | ≈ 210 / 350 MB | 947 / 989 | 30 / 63 | 801 / 1,151–1,306 MB |
| Qwen3 0.6B q8 | 625 MB | 1,138 | 48 | 1,273 / 2,238 MB |
| harrier 270M q4 | 226 MB | 2,088 | 24 | 493 / 566 MB |

Cost on the production-candidate WASM runtime (`probes/lean2.mjs`, 4 threads, 170 Tasks; rankings identical to native):

| Model | ms/Task | Today's backlog | Query ms | RSS loaded / peak |
| --- | --- | --- | --- | --- |
| **LEAF-IR** | **106** | **18 s** | **5** | 267 / 476 MB |
| Granite small R2 | 487 | 82 s | 9 | 369 / 718 MB |
| Voyage 4 nano | 2,304 | 392 s | 171 | 821 / 1,277 MB |

Reading:

- **Top tier.** Voyage 4 nano, Granite small R2, EmbeddingGemma 2 and LEAF-IR are within 2–4 queries of each other on r@1/r@5.
- **Cost.** Voyage and EmbeddingGemma 2 cost 8–25× more CPU and 2–3× more memory than Granite and LEAF-IR.
- **LEAF-IR.** It gives top-tier quality at the lowest cost by far: 4.6× faster than Granite and 22× faster than Voyage on WASM, with a 24 MB download. Its limit is 512 tokens per input; long items (future conversations) would be split per message/chunk.
- **Granite small R2.** Slightly better at the first result; reads up to 8K tokens.
- **Multilingual.** EmbeddingGemma 2 (now Apache-2.0) is the strongest multilingual option if non-English becomes a need.
- **Superseded.** The first comparison's conclusion ("Granite") is superseded by this table.

### Runtime packaging facts

| Option | Footprint | Platform coverage | Notes |
| --- | --- | --- | --- |
| `@huggingface/transformers` 4.3.1 (full) | 483 MB `node_modules` (pulls `onnxruntime-node` 289 MB with all platforms, `onnxruntime-web` 141 MB, `sharp` + `@img` 28 MB native) | `onnxruntime-node` 1.30 ships no `darwin/x64` binary | Too heavy; brings an unused native image library |
| `onnxruntime-node` (direct) | 189–301 MB unpacked (all platforms; 24–85 MB per platform) | `darwin/x64` binary present in 1.22/1.23, **absent from 1.24.3 and 1.30.0** (unpkg 404) → no Intel-Mac support on current versions | N-API (ABI-stable across Node/Electron); postinstall script; fastest |
| `onnxruntime-web` 1.30.0 (WASM, `dist/ort.node.min.mjs`) + `@huggingface/tokenizers` 0.2.0 | 148 MB `node_modules` (139 MB is the many browser variants; the Node path needs `ort.node.min.mjs` + `ort-wasm-simd-threaded.wasm` 14 MB) ; tokenizers 600 KB, no deps, Apache-2.0; onnxruntime MIT | Every platform identically (pure WASM); no native binary, no postinstall | Slower than native (see table) |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User 2026-10-13 | Hard to find a Task without remembering its wording | Direct | Meaning search on the board | Result presentation |
| User 2026-10-18 | PTM must find Tasks by a sentence via a tool; compact result | Direct | Agent tool | Tool shape (decided DEC-005) |
| User 2026-10-18 | Reusable layer for future collections | Direct | Layer boundary | — |
| User 2026-10-18 | "You decide the technical architecture" (storage) | Direct | Storage is a design decision | — |
| User 2026-10-13 | Local, CPU, lightweight, no external service, proportionate footprint | Direct | Quality constraints QR-* | Performance targets need the user's agreement |
| PTM (Task autobyteus-126) | Key lookup exact/prefix, any case | Direct (Task text) | Consistency | DEC-006 |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| `ibm-granite/granite-embedding-small-english-r2` (ONNX: `onnx-community/granite-embedding-small-english-r2-ONNX`, revision `1dc7835ba0cb9c76a3618d0bf0c427c97671b3c8`) | Apache-2.0; not gated | 47 M params, ModernBERT, 384 dims, 8,192-token context, English, CLS pooling (`1_Pooling/config.json`); q8 file 52 MB (+0.6 MB graph, 2.1 MB tokenizer) | HF API; model card | Redistribution allowed with licence/NOTICE |
| `google/embeddinggemma-300m` (ONNX `onnx-community/embeddinggemma-300m-ONNX`) | Gemma Terms of Use (`license:gemma`); Google repo gated (manual), ONNX copy not gated | 308 M params, 768 dims, 2,048 ctx, multilingual; q4 197 MB, q8 309 MB | HF API | Gemma terms pass-through obligations (use policy, notices) for redistribution |
| `jinaai/jina-embeddings-v2-small-en` (`Xenova/…` ONNX) | Apache-2.0 | 33 M, 512 dims, 8,192 ctx, English; q8 33 MB | HF API | — |
| `jinaai/jina-embeddings-v3`, `v5-text-small`, `v5-text-nano` | **CC BY-NC 4.0** | Non-commercial licence | HF API tags | Excluded: incompatible with the AGPL/commercial dual licence of AutoByteus |
| `BAAI/bge-small-en-v1.5`, `Snowflake/snowflake-arctic-embed-xs`, `intfloat/multilingual-e5-small`, `nomic-ai/nomic-embed-text-v1.5` | MIT / Apache-2.0 / MIT / Apache-2.0 | Comparison baselines | HF | — |
| `onnxruntime-web` 1.30.0 / `onnxruntime-node` 1.30.0 | MIT | See runtime table | npm | — |
| `@huggingface/tokenizers` 0.2.0 | Apache-2.0 | Pure-JS tokenizer from `tokenizer.json` | npm | Young package (0.x); Transformers.js depends on it |
| Hugging Face Hub file hosting | `https://huggingface.co/<repo>/resolve/<commit>/<file>` | Pinned-revision download source | — | Availability/proxies on the user's network |
| `scripts/check_licensing.py`, `THIRD_PARTY_NOTICES` | Repository release checks | New third-party code/model must be declared | RELEASE.md | Design must include notices |

## Persisted Data And State Facts

- Affected stored subject: none of the existing data. New derived data: model files and a vector index.
- Location and representative shape: Tasks in `<appData>/projects/<projectId>/tasks/<taskId>/task.json`.
- Approximate volume: 168 Tasks today; 384-dim float32 vector = 1.5 KB; ≈ 2.7 vectors per Task with chunking → ≈ 4 KB per Task, ≈ 4 MB per 1,000 Tasks.
- Current readers and writers: `ProjectStore` / `ProjectTaskService`.
- Required semantics to preserve: Task files are the only source of truth; the index is derived.
- Acceptable loss: the index (and downloaded model) may be discarded and rebuilt at any time.
- Remaining evidence gap: none for requirements.

## Product Design Request Context

- Product Design request in the current input: `Not stated`. The request asks to enhance the existing search box, not a new UI; no Product Team involvement requested.
- Remaining experience questions are carried to the user as decisions with recommendations (requirements DEC-001/DEC-002).

## Product Design Findings

N/A — not applicable (no Product Design request).

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/bench.mjs`, `probes/run_matrix.sh` | Solution Designer | Model comparison harness (read-only over real Tasks) | Investigation | REQ-009, QR-* | Evidence | Not behavior-defining |
| `probes/lean.mjs` | Solution Designer | Production-candidate stack probe | Investigation | QR-* | Evidence | Not behavior-defining |
| `probes/lexical.py`, `probes/corpus_stats.py` | Solution Designer | Baselines and corpus statistics | Investigation | REQ-001 | Evidence | Not behavior-defining |
| `model-evaluation-report.md` | Solution Designer | Written record of all model experiments (rounds 1 and 2), conclusions and reproduction | Investigation; model catalog input | DEC-002, REQ-015, QR-003…QR-007 | Current | Supports the user's DEC-002 decision |
| `probes/bench2.mjs`, `probes/lean2.mjs`, `probes/analyze2.py`, `probes/queries70.json`, `probes/current-models-*.{jsonl,md}` | Solution Designer | Round 2 current-model evaluation | Investigation | DEC-002 | Evidence | Not behavior-defining |
| `probes/queries.json` | Solution Designer | 40 paraphrased queries + target keys (no Task content) | Investigation; seed for the durable quality check (with synthetic Tasks) | AC-002 | Evidence | Not behavior-defining |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | WASM inference is slower than native; first indexing of a large backlog takes minutes | First-use experience | Background indexing with progress; measured targets (QR-003) | Open (design) |
| RSK-002 | Risk | First-use download depends on network access to the model host | Offline first use | Clear "unavailable" state; exact search unaffected; retry | Open (design) |
| RSK-003 | Risk | Benchmark host is a fast M1 Max with concurrent agent test load | Timings may differ on typical laptops | Targets stated with margin; validation measures on the build | Open |
| UNK-001 | Unknown | Relevance floor for "meaning matches" on the board | Noise vs recall | Probe: "within 0.03 of the top score, top ≥ ≈ 0.78" separates on this sample; final values set and tested in the design | Partly resolved |
| RSK-004 | Risk | The off-topic floor margin is thin (0.773 vs 0.781 on the sample) and model-specific | A nonsense query may show a few weak matches, or a weak real query may show only exact matches | Calibrate on a larger synthetic set; values live with the model definition; AC-004 tested on a defined unrelated-query set | Open (design) |
| RSK-005 | Risk | WASM heap (≈ 720 MB peak while indexing) is not returned while the runtime lives | Memory constraint (QR-004) | Run inference in a dedicated worker ended when idle (design) | Open (design) |
| ASM-001 | Assumption | Users write Tasks mostly in English | English model choice | Evidence: 166/168 Tasks English; user decision DEC-002 | Pending user |

## Architecture Investigation Findings

(Preliminary feasibility; the authoritative design follows approval.)

- Storage: both SQLite paths are viable on all runtimes: Prisma (`production.db`, schema migration) and `node:sqlite` (built-in, already used for self-contained files). At this scale (≤ ~10 K vectors) a brute-force cosine scan over vectors held in memory takes well under 10 ms, so no vector index/extension (e.g. `sqlite-vec`) is needed; Prisma cannot load SQLite extensions anyway.
- Runtime: native `onnxruntime-node` lacks macOS x64 on current versions; WASM `onnxruntime-web` runs everywhere with no native binary.
- Model: Granite small English R2 gives the best quality/cost ratio among permissively licensed models; EmbeddingGemma is slightly better on quality but ~12× the CPU cost, ~4× the download, and carries Gemma terms.

### Architecture-phase evidence (2026-10-18, after approval)

- Authorities read for design: `references/architecture-design.md`, `references/design-principles.md`, `references/design-examples.md`, `DESIGN.md`, `docs/design/startup_initialization_and_lazy_services.md`, `docs/design/data_migration_guideline.md` §1–4.
- **Worker thread probe** (`/tmp/pts-probe/wtest`): a `.ts` worker with type annotations started via `new Worker(new URL("./w.ts", import.meta.url))` runs under Node 22.23.1 and under Electron 42's Node 24.16 (`ELECTRON_RUN_AS_NODE=1`) → a self-contained worker entry works in source tests and in `dist`.
- **Settings pattern:** `src/services/server-settings-service.ts` `registerPredefinedSetting(key, description, editable, {allowedValues})`; values read at use time with `appConfigProvider.config.get(key)` (e.g. `src/config/streaming-content-flush-interval-setting.ts`).
- **Existing downloaders:** `src/utils/downloader.ts` and `src/utils/download-utils.ts` use `fetch` with `AbortSignal.timeout(30_000)` for the whole request, no checksum, no atomic rename; no proxy support anywhere in server fetches (`grep ProxyAgent|HTTPS_PROXY` → none).
- **Task reads:** `ProjectStore.listTasks(projectId)` reads every `task.json` of the Project on each call (`src/projects/stores/project-store.ts:92`).
- **Delete owners:** `ProjectTaskService.deleteTask` (`project-task-service.ts:194`) and `ProjectService.deleteProject` (`project-service.ts:185`) notify change marks after commit; both accept dependency injection (`deps`).
- **Tool exposure:** `ProjectTaskToolsMcpAdapterProvider` maps `PROJECT_TASK_TOOL_MANIFEST`, so a manifest entry reaches MCP runtimes; native tools register in `registerProjectTaskTools()`.
- **Packaging:** `autobyteus-web/scripts/prepare-server.mjs` deploys the server with `pnpm deploy`, runs `npm prune --omit=dev`, and already prunes native prebuilds (`pruneNativePrebuilds`) → place for an `onnxruntime-web` prune.
- **LEAF-IR pin:** official repo `MongoDB/mdbr-leaf-ir` at revision `4262131b32c3182bd06e67e92ae69d7bd66e0c5c`.
  - `onnx/model_quantized.onnx`: 220,597 bytes, sha256 `8c08cb4ecc00bad721b117a85738c537ceb9b85b3eedc52d9c6906fddaa55718`.
  - `onnx/model_quantized.onnx_data`: 22,954,752 bytes, sha256 `e77ea96a124230e23e5bac8e26c3ffe5410154973d8635673fa0220b06c13f8b`.
  - Both identical to the `onnx-community/mdbr-leaf-ir-ONNX` files used in the probes.
  - Official `tokenizer.json`: sha256 `da0e79933b9ed51798a3ae27893d3c5fa4a201126cef75586296df9b4d2c62a0`. Official `tokenizer_config.json`: sha256 `46ac231e9b955a8af80fc7f23a0ecc65b524f1df84a02c2c82cbca354fb207b4`. These differ from the community export (same model type, vocabulary size, normalizer and post-processor); rankings must be re-verified with the official files (design G2).
  - Modules: Transformer → Pooling → Dense → Normalize; the ONNX export emits `sentence_embedding`. Prompts: query `"Represent this sentence for searching relevant passages: "`, document `""`.
- **EmbeddingGemma 2 pin** (multilingual alternative; verified on WASM after review AR-001): `onnx-community/embeddinggemma-2-ONNX` revision `daa72c51243991dfcaf9f9137d2c573d8f7790c0`.
  - `onnx/model_quantized.onnx`: 495,165 bytes, sha256 `d06edd601f851c633a2519304cbeb8dc6170d7ceb61b436625c17fb9b6e74953`.
  - `onnx/model_quantized.onnx_data`: 313,724,928 bytes, sha256 `278a7ff1248c3618e4bd11a607fc54f7bdc7778854230f3956d3f86bd9db4f3b`.
  - `tokenizer.json` (32 MB): sha256 `4d777ef5bdc1aa36227abdfb77c3e49e7b9c892d16e1b6bda41c393504828be4`. `tokenizer_config.json`: sha256 `17bd5d6e9364ca49a534e1502076593317c298d4a663623091ed45388f004874`.
  - Extra graph inputs: `image_features`, `video_features`, `audio_features` `[tokens, 512]` float32, fed empty for text.
  - WASM result (`probes/egemma2-wasm-q8.json`): r@1 0.913, r@5 0.957, r@10 0.986, MRR 0.940; 4,270 ms/Task; 151 ms/query; RSS 1,134 / 1,522 MB.
- **Worker-thread probe** (`probes/worker-thread-probe/`): LEAF-IR in a `worker_thread`, 1 → 4 ort-web threads, 555 → 233 ms per Task text (shared machine).
- **Granite small R2 pin** (alternative): `onnx-community/granite-embedding-small-english-r2-ONNX` revision `1dc7835ba0cb9c76a3618d0bf0c427c97671b3c8`.
  - `onnx/model_quantized.onnx`: sha256 `a3fad524afc3f060216a8ddbb1ac89c9b6498fba8995b5718bde879076a2e9ba`.
  - `onnx/model_quantized.onnx_data`: sha256 `1f4cf47e4adec7f7ae09db03d071ba8667e07f9a4203142c7efa8d37fe453597`.
  - `tokenizer.json`: sha256 `feeb83348dcb033bc6b9d2e1f7906ca9eb2d122845000c9416d894d7c2927149`. `tokenizer_config.json`: sha256 `ce06781b38bb393db68c9e0709bddd31ef5d88f2c6fbb3fd9f369778fb85e451`.
  - CLS pooling.

## Requirement Implications

- The current search finds none of the paraphrased queries; meaning search is a large improvement, and keyword ranking alone (BM25) is already better than today but misses paraphrases (recall@5 0.775 vs 0.95 for Granite).
- Every Task has some similarity score, so "matching" needs an explicit rule (DEC-001).
- Descriptions are long (median ≈ 786 tokens) → the indexed text must cover more than the first few hundred tokens (chunking or a long-context model).
- First use requires obtaining a model and indexing the backlog → readiness/failure states are a requirement (BEH-004).
- `list_project_tasks` is too large for "find the Task about X" → compact tool result.

## Notes For Architecture Design

- Map SCN-001..SCN-006 (requirements) to target paths.
- Verify on the design: hybrid ranking (exact + BM25-like + embedding) vs embedding only on the probe set; relevance floor calibration; WASM threads in Node; RSS reduction (release model bytes after session creation); idle unload.
- Decide storage (`node:sqlite` file vs Prisma table), index update trigger (post-commit marks vs reconcile-by-hash on query), and packaging (prune `onnxruntime-web` to the Node files; licence notices).
