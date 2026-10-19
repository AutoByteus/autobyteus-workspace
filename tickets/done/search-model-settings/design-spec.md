# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-007` (fingerprint-input status and index-after-writes after ARCH-REV-004 and the user's REQ-011; SR-006 status cache; SR-005 DEC-011; SR-004 after ARCH-REV-001; SR-003 first round) on the approved SR-007 requirements
- Approved requirements baseline: `requirements-doc.md` at `SR-004` (SR-002 + DEC-009/DEC-010 gap decisions), approved by the Solution Designer within the direction. DEC-005 and the whole visible design were decided and confirmed by the user through Product Design ("done", 2026-10-19).
- Behavior-defining supplements: the approved UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/search-model-settings/ui-ux-spec.md` (design `4e4ac06`, integration `cb384e3`) with VIS-001…VIS-021. Normative except its stated illustrative content and mock mechanisms (spec § Implementation Fidelity Boundary).
- Design status: `Ready`
- Canonical investigation notes: `investigation-notes.md` (this folder)
- Authorities read (2026-10-19; read in this conversation for autobyteus-71 and unchanged since): `references/architecture-design.md`, `references/design-principles.md`, `references/design-examples.md`, project `DESIGN.md`, `autobyteus-server-ts/docs/design/startup_initialization_and_lazy_services.md`, `data_migration_guideline.md` §1–4; `references/handoff-references.md` (re-read after its 2026-10-18 update).
- Conflicts or discrepancies: none.

## Revision SR-007 (ARCH-REV-004 AR-005 + user-approved REQ-011)

**Supersedes** the SR-006 status *result* cache and `collectionJobStatus`, which are removed. The SR-006 invalidation wiring, DEC-012/DEC-013, O-1/O-2/O-4 and FU-1 stay.

**Rule (AR-005):** the served status of a Project always equals `collectionStatus(collection, currentItems)` for the active model. The search service caches **inputs, never results**.

| Element | Design |
| --- | --- |
| Input cache | `ProjectTaskSearchService` keeps `Map<projectId, ItemFingerprints>`. `ItemFingerprints` is an **opaque** value from `EmbeddingIndex.fingerprintItems(items)`: `{modelId, entries: id → fingerprint}`, computed with the resolved active model's document prefix, without `activeModel()`. About 100 bytes per Task, ≈ 2 MB at 20,000 Tasks. The consumer never interprets it. |
| Invalidation | A Project is re-read (`listTasks` + `fingerprintItems`) when: it is in `dirty` (set by the composed `ProjectChangeMarks` fan-out: Task create, update, `updateById`, dependency and resource commits, delete; R-12 over-invalidation kept); it has no entry; or its entry's `modelId` ≠ the resolved active model (a switch). `forgetProject` drops the entry. Projects absent from `listProjects` are dropped. |
| Status each poll | `EmbeddingIndex.collectionStatus(collection, fingerprints)` is computed **fresh every time** from (1) the collection's in-memory job if it exists and has pending work: `indexing {done, total}` when a run is active, `waiting` when the model isn't ready; else (2) a comparison of the current fingerprints with the stored ones (the in-memory job's vectors if the job exists, else `store.readFingerprints`): `ready` / `needsUpdate {changed}` / `notIndexed`; and `unavailable` when the model is unavailable. No status is cached, so finished jobs (MP-005, MP-006) and search-triggered indexing (MP-007) show correctly on the next poll. `collectionJobStatus` is dropped. |
| Index after writes (REQ-011, DEC-014) | The same change-mark listener schedules `indexProject(projectId)` per Project, debounced 3 s (rapid writes → one run), **only if** `EmbeddingIndex.activeModelOnDisk()` (read-only: all active model files present, model not unavailable). It runs in the background and never throws to the writer. `indexProject` = `listTasks` + `index.sync`; an unchanged fingerprint set schedules nothing, so marks that aren't description changes cost one `listTasks` of that Project. Deletes keep the existing `forgetTask` / `forgetProject` hooks. |
| Interface changes | **Add** `EmbeddingIndex.fingerprintItems(items)` and `EmbeddingIndex.activeModelOnDisk()`. **Change** `collectionStatus(collection, fingerprints: ItemFingerprints)` to fingerprints instead of items. **Remove** `collectionJobStatus`. |

Tests (G8 extended):

- **MP-005:** index, then edit a Task, then the next two polls both show Needs update, and Index all includes the Project.
- **MP-006:** the poll after the job finishes shows Ready; polling drops to 10 s.
- **MP-007:** a board search indexes the Project between polls, and the next poll shows Ready.
- **Write trigger:** create or edit → indexed within the debounce with no search; a burst → one run; model not on disk → no download and nothing scheduled.
- **Warm poll:** no `listTasks` for clean Projects.
- **Cost:** QR-001's 300 ms warm refresh at 20 × 1,000 Tasks (the fingerprint comparison reads the stored fingerprint maps; measure, R-13 with host load).

## Failure-Origin Resolution (FO-001 → SR-006)

API/E2E API-L02 (code review CRR-003, `Design Impact`): on a Docker node with 24 Projects and 20,039 Tasks, the panel status took 1.8–2.0 s median.
- `embeddingModelsStatus` takes 4 ms; `projectTaskIndexes` takes 1.8 s.
- DS-001 re-read every Task of every Project on each poll: every 2 s while work runs.
- The existing `projects` list on that node also takes 1.8 s.

| Change | Detail | Sections |
| --- | --- | --- |
| ~~Project index status cache~~ (**superseded by SR-007**: inputs cached, not status) in `ProjectTaskSearchService` | `Map<projectId, {modelId, status}>` plus a `dirty` set. `indexStatus()` reads `listProjects()` (cheap) and, per Project: (1) a dirty Project, or one with no entry for the resolved active model id: `listTasks` + `index.collectionStatus(collection, items)`, then cache it and clear dirty; (2) otherwise, if the index has a live job for the collection under the active model: `index.collectionJobStatus(collection)` (new read-only boundary method; progress from the in-memory job; `null` when none); (3) otherwise the cached status. Projects that disappear from `listProjects` are dropped from the cache. | Interface, DS-001, Final File Mapping |
| **Invalidation from the existing post-commit change marks** | The composition passes `ProjectTaskService` a fan-out of `ProjectChangeMarks`: the existing publisher plus the search service's `markTaskChanged(location)` / `markTaskRemoved(location)` (Project locations only), which add the Project to `dirty`. This covers create, update, `updateById`, dependency writes and delete. `forgetProject` (existing hook) drops the cache entry. The index actions (`indexProject`, `rebuildProject`, `indexAllProjects`) mark their Projects dirty. Model switch: entries are keyed by model id, so they miss automatically. | Dependency Rules, Final File Mapping |
| QR-001 refined (DEC-012) | Later refreshes ≤ 300 ms. First load ≤ 1 s on the desktop host; on Docker no slower than the `projects` list (Project store floor) | Risks |
| **Follow-up FU-1** | The Project store's whole-backlog read (1.8 s for 20,039 Tasks on Docker; it affects the Projects list too) → Project Task Manager at the receipt | Change Scope |
| O-1 / O-2 / O-4 | O-1: remove an empty model folder after a failed download. O-2: in `useEmbeddingSettings.act()`, release `working` once the mutation settles, before the follow-up refresh. O-4: a transport failure with no server message shows "Couldn’t reach the server." (DEC-013; en and zh-CN) | G8 |

## Architecture Review Resolution (ARCH-REV-001 → SR-004)

| Finding | Resolution | Sections |
| --- | --- | --- |
| AR-001: an idle active model would show "Preparing…" forever | Displayed state is derived explicitly (Terminology § Active model display state). `idle`/`ready` with files on disk → **Ready**; Preparing only while a download or load runs. Restart test (AC-013) | Terminology, Interface `modelsStatus`, DS-001 |
| AR-002: an active model not downloaded and not preparing | Requirement decision DEC-009 (Solution Designer; a gap the approved design left; user informed): "Active · Not downloaded" + **Download** → `prepareActiveModel()`. AC-011 | Terminology, DS-003, Interface |
| AR-003: Settings Retry must restart preparation | `retryEmbeddingModel` now calls `retryModel()` **then** `prepareActiveModel()`. This applies to the board's Retry too: it now restarts at once instead of on the next search, which is harmless and better. Spine DS-006; AC-012 | DS-006, Interface |
| AR-004: one status root field mixed two owners | Two root fields: `embeddingModelsStatus` (`embeddings.ts` → `EmbeddingIndex`) and `projectTaskIndexes` (`project-task-search.ts` → `ProjectTaskSearchService`), fetched in **one** web document | Interface, DS-001, Dependency Rules |
| R-1 | Poll every 2 s while any work runs (a model downloading or preparing, or a Project waiting or indexing), else every 10 s. Measure QR-001 at 20 × 1,000 Tasks | DS-001, Risks |
| R-2 | `collectionStatus` resolves the active definition without `activeModel()` (no switch side effects), reads fingerprints only, and uses an in-memory job only when it belongs to the resolved active model | DS-001 |
| R-3 | `EmbeddingModelDownloads` is the one owner of flights, progress, failure and abort. `files.ensure` stays an internal guard. `prepareModel` obtains files through `downloads.ensure(def, {cancellable: false})` | DS-002, DS-005 |
| R-4 | Leftover `.part` files after a quit count in "On disk", are overwritten by the next download, and are deleted by Remove and by Cancel | DS-002 |
| R-5 | DEC-010: a Project with no Tasks → Ready · 0 Tasks, no actions | Terminology |
| R-6 | `downloadModel(activeId)` = `prepareActiveModel()` (not cancellable) | Interface |
| R-7 | Index all runs the Projects' jobs concurrently on the one worker, so several show "Indexing" at once. The spec makes scheduling the server's; its sequential timeline is a mock | Key Tradeoffs |

## Current-State Read

- **Embedding layer:** `autobyteus-server-ts/src/embeddings/` (autobyteus-71, on base `8d40ba3b6c`).
  - `EmbeddingIndex` is the only public boundary. It offers `search`, `sync`, `removeItems`, `dropCollection`, `modelStatus`, `retryModel` and `shutdown`. It resolves the active model from the setting at every operation, prepares it (`prepareModel`: `files.ensure` → runner → `removeOtherModels`) and runs one `CollectionIndexingJob` per collection touched by a search or sync. Jobs run concurrently on the one worker, which serializes batches.
  - `EmbeddingModelFiles` keeps one folder per model: `ensure` (single flight per model; `.part` download, verify, rename), `hasAllFiles`, `removeAllExcept`. There is no cancel.
  - `EmbeddingVectorStore` keeps one table with a `model_id` per row.
  - The catalog (3 entries; `languages`, `files[].bytes`, `description`) and the setting `AUTOBYTEUS_EMBEDDING_MODEL` (`allowedValues`; blank or unknown → default with a warning).
- **Project Task search:** `src/projects/search/project-task-search-service.ts` owns the collection `project-tasks/<projectId>`, the item order and delete cleanup. Its deps are `{listTasks, index}`, wired in `compositions/project-task-execution-resource-composition.ts`.
- **GraphQL:** `api/graphql/types/embeddings.ts` (`retryEmbeddingModel`) and `api/graphql/types/project-task-search.ts`.
- **Settings UI:** `autobyteus-web/pages/settings.vue` has the Server Settings sub-navigation (modes `quick` · `advanced` · `migrations`), rendered by `components/settings/ServerSettingsManager.vue` (`SettingsTab`). The server-settings write path is `ServerSettingsService.updateSetting(key, value)` with validation.
- **Gaps found:**
  - there is no read-only per-collection status (status exists only for touched collections and is derived while scheduling);
  - there is no download of a non-active model, no cancel and no remove;
  - `removeOtherModels` deletes every non-active model's files.

## Task Size And Architectural Risk (Mandatory)

- **Task size:** `Medium`
- **Size rationale:** the change extends existing owners:
  - the `EmbeddingIndex` boundary, plus one new internal owner for model downloads;
  - `EmbeddingModelFiles` (cancel, remove, disk usage);
  - `ProjectTaskSearchService` (status, index, rebuild);
  - two GraphQL type files;
  - the composition wiring;
  - one web sub-section (about 4 components, a composable, GraphQL documents, en + zh-CN);
  - docs.

  No new subsystem, no new persistence store, no new runtime.
- **Architectural risk:** `High`
- **Risk rationale:**
  - new public contracts (GraphQL queries and mutations);
  - a changed persisted-data policy (downloaded model folders kept);
  - new concurrency (download alongside preparation, cancel, overlapping downloads);
  - an explicit index trigger that runs alongside search-triggered jobs.

  Each is bounded, but material.
- **Escalation trigger:** a `Design Impact` back to the Solution Designer if:
  - the read-only status cannot be computed without loading vectors at the QR-001 scale (> 1 s);
  - cancel cannot guarantee no partial files;
  - the UI needs a push channel instead of polling;
  - a spec state cannot be derived from the server status below.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision Supported | Uncertainty |
| --- | --- | --- | --- | --- |
| Shipped layer | `src/embeddings/embedding-index.ts` (267 lines), `collection-indexing-job.ts`, `models/embedding-model-files.ts`, `store/embedding-vector-store.ts` | See Current-State Read | Extend the boundary; keep jobs; add a read-only status; change the cleanup | — |
| Search service | `src/projects/search/project-task-search-service.ts` | `collectionOf`, `indexingOrder`, deps injection | Status, index and rebuild per Project live here | — |
| Settings | `services/server-settings-service.ts` (`updateSetting` L284), `embeddings/catalog/embedding-model-setting.ts` | Validated writes; resolve at use | Activation writes through the settings owner | — |
| Web | `pages/settings.vue` (modes), `ServerSettingsManager.vue` (`SettingsTab`), `composables/projects/useProjectTaskSearch.ts` (2 s polling), `NfsGuideCard.vue` (external `target="_blank"` link) | Patterns to reuse | Sub-section, polling, link | — |
| Product spec | UI/UX spec § Data, Contract, And Mock Boundaries | F-1…F-5 | Status shape; sizes from bytes; language mapping | — |

## Intended Change

Extend the embedding layer's boundary with model management (status, download ahead, cancel, remove, prepare the active model) and a read-only collection status. Add Project index status, index and rebuild to Project Task search. Expose both over GraphQL. Build the approved Server Settings → Embedding sub-section, which polls a read-only status.

## Change Scope (Mandatory)

- **In scope:** UC-001…UC-004.
  - Server: `src/embeddings/` (`embedding-index.ts`; new `models/embedding-model-downloads.ts`; `models/embedding-model-files.ts`; `store/embedding-vector-store.ts` fingerprint read; `collection-indexing-job.ts` status helpers; catalog LEAF-IR description size fix), `src/projects/search/project-task-search-service.ts`, `src/compositions/project-task-execution-resource-composition.ts`, `src/api/graphql/types/embeddings.ts`, `src/api/graphql/types/project-task-search.ts`.
  - Web: `pages/settings.vue`, `components/settings/ServerSettingsManager.vue`, new `components/settings/embedding/*`, `composables/settings/useEmbeddingSettings.ts`, GraphQL documents, `localization/messages/{en,zh-CN}/settings.ts`, `types/`.
  - Docs: `autobyteus-server-ts/docs/modules/embeddings.md`, web `docs/` Settings description.
- **Deliberately left alone:** the board and its status line; the agent tool; search ranking and calibration; the Advanced settings table; the catalog contents (except the size text fix); proxy support (`autobyteus-168`); the Docker image (`autobyteus-169`).
- **Follow-ups:** FU-1 (SR-006): the Project store's whole-backlog read is slow at large backlogs on Docker (`projects` list 1.8 s median for 24 Projects / 20,039 Tasks; API-L02 evidence). It affects the Projects list and this section's first load. To be sent to the Project Task Manager at the delivery receipt.
  - FU-2 (user request, 2026-10-19: "lets create a follow up for the waiting ticket"): merge the Project states "Waiting to start…" and "Waiting for the model…" into one "Waiting…". With indexing after writes (REQ-011), jobs start at once, so "Waiting to start…" can appear only for a moment. **Sent** to `/project_task_manager` on 2026-10-19.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Approved Change | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User / Operational | REQ-001, REQ-004, REQ-009; AC-001, AC-004, AC-009 | Open Embedding; Use this model | Raw setting only | Model list from the read-only status; activation writes the setting and prepares the model | DS-001, DS-003 |
| BEH-003 | User | REQ-002; AC-002 | Download / Cancel / Retry | — | Background download of a non-active model; cancel removes `.part` | DS-002 |
| BEH-004 | System | REQ-003; AC-003 | Active model ready | Other models' files deleted | Only other models' vectors deleted; files kept until Remove | DS-003, DS-002 (Remove) |
| BEH-005 | User | REQ-005, REQ-006, REQ-007; AC-005…AC-007 | Open the section; Index now / Rebuild / Index all | Visible only on the board | Read-only status per Project; explicit index and rebuild | DS-001, DS-004 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| UI/UX spec + VIS-001…VIS-021 + runnable reference (design repository `personal` @ `cb384e3`) | Normative UI | REQ-001…REQ-007 | The web implementation must match it; it defines the status fields the server must supply | Approved by the user |
| `product-design-request.md` | Request record | — | History | — |

## Task Design Health Assessment (Mandatory)

- **Change posture:** `Feature`
- **Current design issue found:** `No`
- **Triggers checked:**
  - *Authoritative boundary:* the web and GraphQL must not reach `EmbeddingModelFiles` or the store directly; everything goes through `EmbeddingIndex` (models) and `ProjectTaskSearchService` (Projects).
  - *Responsibility overload:* `embedding-index.ts` (267 lines) would exceed the 500-line limit with downloads added inline, so per-model download state, cancel controllers and failure reasons move to a new internal owner, `EmbeddingModelDownloads` (`models/`).
  - *Shared structure tightness:* one status shape per subject (model, Project); no mixed list.
  - *Legacy:* `removeAllExcept` loses its only caller and is removed (replaced by `remove(id)`).
- **Root cause classification:** `No Design Issue Found`
- **Refactor needed now:** `No`; one extraction (downloads) placed under the existing owner.

## Terminology

- **File state** of a model: `notDownloaded` | `downloading {done, total}` | `downloaded` | `failed {reason}` (the last attempt failed; nothing is kept).
- **Readiness** of the active model: `ready` | `preparing {phase: downloading | loading, done, total}` | `unavailable {reason}` (existing).
- **Active model display state** (AR-001, AR-002), derived in `modelsStatus()` from the internal phase and the files:

  | Internal phase | Files on disk | Displayed |
  | --- | --- | --- |
  | `unavailable` | any | Unavailable + reason (Retry) |
  | `downloading` / `loading` (actually running) | any | Preparing… with progress |
  | `idle` or `ready` | all present (`hasAllFiles`) | **Ready** |
  | `idle` | not all present | **Not downloaded** (Download → `prepareActiveModel`) |

  Nothing else maps to Preparing. After a restart the phase is `idle`, so a downloaded model shows Ready (AC-013).
- **Project with no Tasks:** `ready {tasks: 0}` (DEC-010).
- **Project index state:** `notIndexed` | `waiting` | `indexing {done, total}` | `ready {tasks}` | `needsUpdate {changed}` | `unavailable`.

## Legacy Removal Policy (Mandatory)

- **Removed:**
  - `EmbeddingModelFiles.removeAllExcept` and its call in `EmbeddingIndex.removeOtherModels`, which becomes "delete other models' vectors" only;
  - the unused `quick`-only assumption in `normalizeServerSettingsMode` (it gains `embedding`).
- **Compatibility paths kept:** `None`.

## Persisted Data / State Transition Decision (Mandatory)

- **Subject:** `<appData>/embeddings/models/<modelId>/` folders.
- **Change:** they are no longer deleted when another model becomes active; they are deleted only by Remove.
- **Readers and writers:** `EmbeddingModelFiles` (verify by size and checksum). A leftover `.part` file from a crash is overwritten by the next download and counted on disk until then.
- **Decision:** `Directly Usable — No Migration`. Existing installs have at most the active model's folder, and the new code reads that folder as is. `embeddings.sqlite` is unchanged.
- **Supports:** AC-002, AC-003, QR-003.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behaviors | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001, BEH-005 | Embedding panel opens or polls (every 2 s) | Rendered model and Project lists | `useEmbeddingSettings` → GraphQL → `EmbeddingIndex.modelsStatus()` + `ProjectTaskSearchService.indexStatus()` | Read-only status (REQ-005, QR-002) |
| DS-002 | Primary | BEH-003, BEH-004 | Download / Cancel / Remove / Retry | Files present / absent; status updates | `EmbeddingIndex` → `EmbeddingModelDownloads` → `EmbeddingModelFiles` | Download ahead |
| DS-003 | Primary | BEH-001, BEH-004 | Confirm "Use this model" | Setting written; active model preparing → ready; other models' vectors deleted | GraphQL `useEmbeddingModel` → `ServerSettingsService.updateSetting` → `EmbeddingIndex.prepareActiveModel()` | Switch |
| DS-004 | Primary | BEH-005 | Index now / Rebuild / Index all | Collections indexed | GraphQL → `ProjectTaskSearchService.indexProject` / `rebuildProject` / `indexAllProjects` → `EmbeddingIndex.sync` (`dropCollection` first for Rebuild) | Explicit indexing |
| DS-005 | Bounded Local | BEH-003 | One model download | Done / failed / cancelled | `EmbeddingModelDownloads` | Single flight, progress, cancel |
| DS-006 | Primary | BEH-001 | Retry on an unavailable active model | Preparing → Ready / Unavailable | `retryEmbeddingModel` → `EmbeddingIndex` | Settings never searches, so Retry must prepare (AR-003) |

## Primary Execution Spine(s)

- **DS-001:** `Embedding panel → useEmbeddingSettings (poll 2 s while work runs, else 10 s) → one GraphQL document → [embeddingModelsStatus → EmbeddingIndex.modelsStatus()] + [projectTaskIndexes → ProjectTaskSearchService.indexStatus() → listProjects + listTasks → EmbeddingIndex.collectionStatus()] → panel`
- **DS-006 (Retry, AR-003):** `Retry (Settings Active row or board) → GraphQL retryEmbeddingModel → EmbeddingIndex.retryModel() (unavailable → idle) → EmbeddingIndex.prepareActiveModel() → prepareModel (download if needed → load → ready | unavailable)`
- **DS-002:** `Download button → GraphQL downloadEmbeddingModel(id) → EmbeddingIndex.downloadModel(id) → EmbeddingModelDownloads.start(def) → EmbeddingModelFiles.ensure(def, progress, signal)`. Cancel: `cancelEmbeddingModelDownload(id) → … → abort signal → .part removed`. Remove: `removeEmbeddingModel(id) → EmbeddingIndex.removeModel(id) → EmbeddingModelFiles.remove(def)`.
- **DS-003:** `Dialog confirm → GraphQL useEmbeddingModel(id) → ServerSettingsService.updateSetting(AUTOBYTEUS_EMBEDDING_MODEL, id) → EmbeddingIndex.prepareActiveModel() → (switch: cancel jobs, stop old runner) → prepareModel → ready → store.deleteOtherModels(id)`
- **DS-004:** `Index now → GraphQL indexProjectTasks(projectId) → ProjectTaskSearchService.indexProject → listTasks → EmbeddingIndex.sync(collection, items)`. Rebuild: `dropCollection`, then `sync`. Index all: for each Project whose status is `notIndexed`/`needsUpdate` → `indexProject`.

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner | Off-spine |
| --- | --- | --- | --- |
| DS-001 | The panel loads one GraphQL document with two root fields. It polls every 2 s while any work runs, else every 10 s, and stops on unmount; the latest response wins. The server answers from memory and cheap file checks: no model load, no job creation, and no `activeModel()` call (no switch side effects). The active row's display state follows the Terminology table. For a Project, the status compares the current Tasks' fingerprints with stored fingerprints: the in-memory job only if it belongs to the resolved active model, else a fingerprint-only store read. | `EmbeddingIndex`, `ProjectTaskSearchService` | Language mapping and MB formatting (web) |
| DS-002 | A download for a non-active model runs in the background (a download of the active model is `prepareActiveModel`, not cancellable). Leftover `.part` files count on disk and are overwritten or deleted by Cancel and Remove. Its progress, failure and abort controller are kept by `EmbeddingModelDownloads` (single flight per model, shared with the active model's preparation). Cancel aborts the fetch; the files owner deletes the `.part` and any not-yet-verified file of that model, and the state returns to `notDownloaded`. Remove is refused for the active model and while that model is downloading. | `EmbeddingModelDownloads` | Disk usage (folder sizes, including `.part`) |
| DS-003 | The resolver writes the setting through the settings owner (validation unchanged), then asks the index to prepare the active model now (the same `activeModel()` / `prepareModel` path as a search). Preparation uses the shared download, so a model downloading ahead continues as the active model's preparation (no Cancel then, per D-2). On ready, only other models' vectors are deleted. | Resolver, `EmbeddingIndex` | Settings service |
| DS-004 | Index actions reuse `sync`, which already prepares the model if needed and schedules the job. Rebuild drops the collection first (cancelling its job, AR-003 semantics). Jobs run concurrently on the one worker as today. A Project whose job exists while the model isn't ready shows `waiting`. | `ProjectTaskSearchService` | — |

## Ownership Map

| Owner | Owns |
| --- | --- |
| `EmbeddingIndex` (boundary) | Active model and readiness; `modelsStatus()`; `downloadModel` / `cancelDownload` / `removeModel` / `prepareActiveModel`; `collectionStatus` (read-only); existing operations |
| `EmbeddingModelDownloads` (new, internal) | Per-model download state (progress, failure reason), abort controllers, single flight across "download ahead" and "prepare active" |
| `EmbeddingModelFiles` | Files on disk: `ensure(def, onProgress, signal)`, `hasAllFiles`, `remove(def)`, `diskUsage()`; `.part` cleanup on abort |
| `EmbeddingVectorStore` | Adds `readFingerprints(collection, modelId)` (no vector BLOBs) |
| `ProjectTaskSearchService` | Project index status, index, rebuild and index-all policy (which Projects qualify) |
| GraphQL resolvers | Transport, validation of ids (catalog), the settings write in `useEmbeddingModel` |
| `useEmbeddingSettings` (web) | Polling, the latest response wins, mutation calls, refresh after an action |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Scope |
| --- | --- | --- | --- |
| `EmbeddingModelFiles.removeAllExcept` + its call | Downloaded models are kept (REQ-003) | `remove(def)` via Remove | In This Change |
| LEAF-IR description "about 23 MB" | Wrong (files total 23.9 MB) | "about 24 MB" | In This Change |

## Bounded Local / Internal Spines

- **DS-005** (parent `EmbeddingModelDownloads`): `start(def) → [existing flight? join] → files.ensure(def, progress, signal) → done → state downloaded | failed(reason) | cancelled → notDownloaded`. Matters: one flight per model; cancel is honored only for downloads not owned by the active model's preparation (D-2).

## Off-Spine Concerns

| Concern | Serves | Responsibility |
| --- | --- | --- |
| Disk usage | `modelsStatus` | Sum of the sizes of files under `models/` (including `.part`) |
| Language label and MB formatting | Web | `["en"]` → "English"; `["multilingual"]` → "100+ languages"; bytes → decimal MB rounded |
| Polling | Web | 2 s while mounted; latest response wins |

## Ownership Boundaries / Dependency Rules

- **Allowed:**
  - `api/graphql/types/embeddings.ts` → `embeddings/embedding-index` (index only), `services/server-settings-service`, `embeddings/catalog/*`;
  - `api/graphql/types/project-task-search.ts` → `projects/search`;
  - `projects/search` → its injected deps only: `listProjects` (new, from the composition), `listTasks`, `index`.
- **Forbidden:**
  - web or GraphQL reaching `EmbeddingModelFiles`, `EmbeddingModelDownloads` or the store;
  - `embeddings/**` importing `projects/**` or `services/**`;
  - the status query creating jobs, starting downloads or loading a model.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity |
| --- | --- | --- | --- |
| `EmbeddingIndex.modelsStatus()` → `{activeModelId, defaultModelId, onDiskBytes, models: [{id, displayName, languages, downloadBytes, file: FileState, readiness?: EmbeddingReadiness}]}` | Catalog models | Read-only | — |
| `EmbeddingIndex.downloadModel(id)` / `cancelDownload(id)` / `removeModel(id)` | One catalog model | Background download; cancel; remove (refused for active or downloading) | catalog id |
| `EmbeddingIndex.prepareActiveModel()` | Active model | Prepare now (no collection) | — |
| `EmbeddingIndex.collectionStatus(collection, items)` → `{state, done, total, changed}` | One collection | Read-only (no job, no model work) | collection key + current items |
| `EmbeddingIndex.fingerprintItems(items)` → opaque `ItemFingerprints` | Item set under the resolved active model | Read-only; no `activeModel()` | items |
| `EmbeddingIndex.collectionStatus(collection, fingerprints)` (SR-007 signature) | One collection | Fresh status every call (job if pending, else fingerprint comparison) | collection + `ItemFingerprints` |
| `EmbeddingIndex.activeModelOnDisk()` | Active model | Read-only gate for write-triggered indexing | — |
| `ProjectTaskSearchService.markTaskChanged(location)` / `markTaskRemoved(location)` | One Project's input cache entry | Mark it dirty **and** (SR-007, REQ-011) schedule a debounced background `indexProject` when the active model is on disk (called through the composed `ProjectChangeMarks` fan-out; never throws, never waits) | `TaskLocation` |
| `ProjectTaskSearchService.indexStatus()` → `[{projectId, name, state, done, total, changed}]` | All Projects | Read-only; alphabetical | — |
| `ProjectTaskSearchService.indexProject(id)` / `rebuildProject(id)` / `indexAllProjects()` | Project(s) | Start indexing | projectId |
| GraphQL query `embeddingModelsStatus { activeModelId, defaultModelId, onDiskBytes, models {…, activeDisplay} }` (`embeddings.ts`) and `projectTaskIndexes { projectId, name, state, done, total, changed }` (`project-task-search.ts`); the web fetches both in **one document** | Models / Projects (one owner each) | Read-only | — |
| GraphQL mutations `downloadEmbeddingModel(id)` (for the active model: `prepareActiveModel()`), `cancelEmbeddingModelDownload(id)` (refused for the active model), `removeEmbeddingModel(id)`, `useEmbeddingModel(id)`, `retryEmbeddingModel` (existing; now `retryModel()` then `prepareActiveModel()`), `indexProjectTasks(projectId)`, `rebuildProjectTaskIndex(projectId)`, `indexAllProjectTasks` | As named | Actions; unknown id → error | catalog id / projectId |

## Final File Responsibility Mapping

| File | Concern |
| --- | --- |
| `src/embeddings/embedding-index.ts` | Boundary additions (delegating downloads; `collectionStatus`; `prepareActiveModel`; cleanup change). Stays < 400 lines |
| `src/embeddings/models/embedding-model-downloads.ts` (new) | `EmbeddingModelDownloads` (DS-005) |
| `src/embeddings/models/embedding-model-files.ts` | `ensure` with `AbortSignal`; `remove(def)`; `diskUsage()`; remove `removeAllExcept` |
| `src/embeddings/store/embedding-vector-store.ts` | `readFingerprints` |
| `src/embeddings/collection-indexing-job.ts` | Expose `status()` (items, pending, changed vs new) for an existing job |
| `src/embeddings/catalog/embedding-model-catalog.ts` | LEAF-IR description size |
| `src/projects/search/project-task-search-service.ts` | `indexStatus`, `indexProject`, `rebuildProject`, `indexAllProjects`; deps `listProjects` |
| `src/compositions/project-task-execution-resource-composition.ts` | Pass `listProjects` |
| `src/api/graphql/types/embeddings.ts` | `embeddingModelsStatus` + model mutations; `retryEmbeddingModel` also prepares |
| `src/api/graphql/types/project-task-search.ts` | `projectTaskIndexes` + index mutations |
| `autobyteus-web/pages/settings.vue`, `components/settings/ServerSettingsManager.vue` | Sub-navigation entry and mode `embedding` (route `?section=server-settings&mode=embedding`) |
| `autobyteus-web/components/settings/embedding/EmbeddingSettingsPanel.vue`, `EmbeddingModelCard.vue`, `ProjectIndexesCard.vue`, `EmbeddingSwitchDialog.vue` (new) | The approved UI (spec UIS-001…UIS-005) |
| `autobyteus-web/composables/settings/useEmbeddingSettings.ts` (new) | Polling and actions |
| `autobyteus-web/graphql/queries/embeddingSettingsQueries.ts`, `graphql/mutations/embeddingSettingsMutations.ts` (new) | Documents |
| `autobyteus-web/localization/messages/{en,zh-CN}/settings.ts` | Spec copy (keys `settings.search.*`, `settings.page.serverSettings.embedding`) |
| Docs | `docs/modules/embeddings.md` (model management, kept downloads), web Settings doc |

## Concrete Examples

| Topic | Good | Avoided |
| --- | --- | --- |
| Read-only status | `collectionStatus` reads stored fingerprints and compares them with the current Tasks; no job is created | Calling `sync` from the status query (it would start indexing on open) |
| Download ahead, then use | Download B (non-active) → `downloaded`. Use B → setting written → `prepareActiveModel` finds the files → loading → ready → A's vectors deleted; A's files stay | Deleting A's folder on ready (old behavior) |
| Use while B downloads ahead | Use B → preparation joins B's flight; Cancel disappears (D-2) | A second parallel download of B |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep `removeAllExcept` for "auto-downloaded" models only | Disk | Rejected | One rule: keep until Remove |
| Writing the setting through the existing `updateServerSetting` mutation from the web | Reuse | Rejected | The dedicated `useEmbeddingModel` also prepares the model; it still uses the settings owner |

## Change / Refactor Sequence

1. Files: abort signal, `remove`, `diskUsage`; drop `removeAllExcept`.
2. `EmbeddingModelDownloads`; index boundary additions; store `readFingerprints`; job `status()`.
3. Search service additions; composition.
4. GraphQL.
5. Web sub-section to the spec; localization.
6. Docs.
7. Tests:
   - server unit: status is read-only (no job, no model work), download, cancel, remove refusals, kept files after a switch, rebuild;
   - GraphQL E2E;
   - web component tests against the spec states;
   - a browser probe or isolated desktop run comparing with VIS-001…VIS-021;
   - a Docker node run (AC-008).

## Key Tradeoffs

- **Polling vs push:** polling (2 s while work runs, 10 s otherwise) matches the board's pattern and REQ-007. No new socket.
- **Concurrent jobs vs a queue:** jobs stay concurrent (existing; R-7), so Index all shows several Projects "Indexing" at once. "Waiting for the model…" appears while the model prepares; "Waiting to start…" appears only if a job exists without progress. No scheduler is added.
- **Overlapping downloads of different models:** allowed (single flight per model only). Simple, and the user decides.

## Risks

- RSK-001: the status cost at 20 Projects × 1,000 Tasks. Mitigation: fingerprint-only reads (no BLOBs); measure against QR-001.
- RSK-002: cancel during rename. Mitigation: the abort is checked before the rename; an aborted file is not renamed.
- RSK-003: proxies (`autobyteus-168`).

## Guidance For Implementation

- G1: Match the UI/UX spec exactly (copy, states, focus, announcements, responsive behavior). The reference's `Search*` names are not prescriptive; use `Embedding*`.
- G2: Sizes: compute `downloadBytes` from `files[].bytes` on the server; the web formats decimal MB (`Math.round(bytes / 1e6)`).
- G3: The status queries must never call `sync`, `search`, `ensure`, `activeModel()` or a runner. Prove it with a unit test (spy). Add tests for AC-011 (fresh root: Not downloaded; Download → Preparing), AC-012 (Retry prepares) and AC-013 (restart → Ready).
- G4: Remove is refused (error code) for the active model and a downloading model. The UI hides it anyway.
- G5: Index all chooses Projects from a fresh `indexStatus()` on the server, not from client state.
- G6: Keep each file under 500 lines.
- G8 (SR-006, FO-001):
  - Implement the status cache and invalidation exactly as in "Failure-Origin Resolution". Keep `indexStatus()` free of `sync`, `search` and model work (G3).
  - Tests:
    - a warm refresh does no `listTasks`;
    - a Task create, edit or delete marks only its Project;
    - a model switch recomputes;
    - live job progress is reported without `listTasks`.
  - Also apply O-1, O-2 and O-4 (DEC-013).
  - API/E2E reruns API-L02 (first load and warm refresh, with the `projects` list as reference, recording host load).
- G7 (SR-005, code review CRR-001):
  - Keep the action error line as built (REQ-010, DEC-011).
  - Remove the dead code from CR-001: `EmbeddingIndex.modelStatus()`, `EmbeddingModelState` / `EmbeddingModelStatus`, `EmbeddingModelDownloads.isRunning()`. Move their assertions to `modelsStatus().activeDisplay`, `fileState()` and `progress()`.
  - Optional: check `signal.aborted` right after adding the abort listener, so a Cancel at a file boundary doesn't fetch the next file in full.
