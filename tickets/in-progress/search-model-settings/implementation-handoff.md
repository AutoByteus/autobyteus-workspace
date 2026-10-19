# Implementation Handoff

## Upstream Artifact Package

- Ticket: `search-model-settings` (Project Task `autobyteus-146`, follow-up FU-1 of `autobyteus-71`).
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-model-settings`, `codex/search-model-settings`, base `origin/personal` @ `8d40ba3b6c`.
- Requirements: `requirements-doc.md` at `SR-007` (DEC-009…DEC-014; REQ-010 / AC-014; user-approved REQ-011 / AC-015; QR-001 refined by DEC-012).
- Design: `design-spec.md` at `SR-007` ("Revision SR-007", G7, G8) (DS-001…DS-006, Final File Responsibility Mapping, Change Sequence 1–7, G1–G6); `architecture-design-handoff.md`; `investigation-notes.md`; `solution-revision-record.md`.
- Architecture review: `design-review-report.md` (ARCH-REV-002; ARCH-REV-003 after CRR-001; ARCH-REV-005 Pass after API-REV-001 / FO-001); `architecture-review-revision-record.md`.
- Behavior-defining supplement: approved UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/search-model-settings/ui-ux-spec.md` (design `4e4ac06`) with VIS-001…VIS-021.
- Classification carried: task size **Medium**, architectural risk **High** (unchanged; see Routing Classification).
- Commits: `9c73c22672` (server: embedding layer, search service, GraphQL, server tests, docs), `8469d4bcf5` (web sub-section, web tests, browser probe, QR-001 load check, docs), `56cb7be36a` (server E2E: Advanced setting → Active · Not downloaded), then the ticket-folder commit with this handoff and the evidence. Implementation round **IR-001**; rework round **IR-002** (`d2bcb95d3a`, see § IR-002 below); rework round **IR-003** (`70bb03632c`, `1b24f59009`, see § IR-003 below).

## Current Implementation Summary

**Server (`autobyteus-server-ts`).**

- `EmbeddingModelFiles`: `ensure(def, onProgress, signal)` honours an abort signal (checked before each file and before the rename; an aborted file is never moved into place) and throws `EmbeddingDownloadCancelled`; new `remove(def)` and `diskUsage()` (all files under `models/`, `.part` included); `removeAllExcept` removed.
- New `EmbeddingModelDownloads` (internal, DS-005): the one owner of running downloads — one flight per model shared by a download ahead and the active model's preparation, byte progress, last failure reason, cancellation (deletes the model's folder), `release()` when a switch stops needing a pinned flight. A preparation joining a download ahead pins it (not cancellable, D-2) and immediately hears the bytes that already arrived.
- New `EmbeddingModelError` (codes `EMBEDDING_MODEL_UNKNOWN`, `EMBEDDING_MODEL_ACTIVE`, `EMBEDDING_MODEL_DOWNLOADING`, `EMBEDDING_DOWNLOAD_NOT_CANCELLABLE`).
- `EmbeddingIndex` (346 effective lines, G6 < 400): read-only `modelsStatus()` and `collectionStatus(collection, items)` (G3: they never call `sync`, `search`, `ensure`, `activeModel()` or a runner, and create no job and no store file); `prepareActiveModel()`, `downloadModel(id)` (the active model → its preparation), `cancelDownload(id)`, `removeModel(id)`. The active display state follows the Terminology table plus R-9 (a running download of the newly active model shows as Preparing). On ready only other models' **vectors** are deleted; downloaded files stay until removed (REQ-003).
- `CollectionIndexingJob.status(items)` (waiting / indexing done-of-run / ready / needsUpdate / notIndexed), shared `fingerprintOf` and `statusFromFingerprints`; `EmbeddingVectorStore.readFingerprints()` (no vector BLOBs, never creates the file).
- `ProjectTaskSearchService`: `indexStatus()` (alphabetical; listProjects + listTasks + collectionStatus), `indexProject`, `rebuildProject` (dropCollection, then sync), `indexAllProjects()` (chooses from a fresh `indexStatus()`, G5); composition passes `listProjects`.
- GraphQL: `embeddingModelsStatus` with per-model `file` and the active model's `activeDisplay` (R-8); mutations `downloadEmbeddingModel`, `cancelEmbeddingModelDownload`, `removeEmbeddingModel`, `useEmbeddingModel` (writes `AUTOBYTEUS_EMBEDDING_MODEL` through `ServerSettingsService.updateSetting`, then prepares), `retryEmbeddingModel` (now `retryModel()` then `prepareActiveModel()`, DS-006). `projectTaskIndexes`, `indexProjectTasks`, `rebuildProjectTaskIndex`, `indexAllProjectTasks`. Refusals carry `extensions.code`.
- LEAF-IR description: "About 24 MB" (files total 23.9 MB).

**Web (`autobyteus-web`).**

- Sub-navigation Basics · **Embedding** · Advanced · Migrations; route `?section=server-settings&mode=embedding`; `ServerSettingsManager` renders the panel before its raw-settings loading gate.
- `composables/settings/useEmbeddingSettings.ts`: one read-only document with both root fields; polls every 2 s while a download, preparation or indexing runs, else every 10 s, until unmount; latest request wins; rebinding starts over; actions re-read at once; completions announced.
- `components/settings/embedding/`: `EmbeddingSettingsPanel`, `EmbeddingModelCard`, `ProjectIndexesCard`, `EmbeddingSwitchDialog`, `embeddingPresentation.ts` (decimal MB, percent, language label key, focus helper). Ported from the approved reference with `Embedding*` names and `embedding-*` test ids.
- Copy: `localization/messages/{en,zh-CN}/embeddingSettings.ts` (keys `settings.search.*`) and `settings.page.serverSettings.embedding` in `settings.ts`.
- `tests/e2e/embedding-settings-probe.mjs` (`pnpm test:e2e:embedding-settings`): real node on a fresh data root, real LEAF-IR downloads and indexing, headless Chromium.

## Routing Classification (Mandatory)

- Task size: **Medium** (unchanged). Architectural risk: **High** (unchanged).
- Recheck: the implementation stayed inside the design's Change Scope and file mapping. No new owner, boundary, persisted format or dependency beyond the design. Two small deviations inside the design's intent are listed under Implementation decisions (localization file placement; an action-error line). No escalation trigger fired.
- Route: independent code review (`/software_engineering_team/code_reviewer`).

## Reviewed Behavior Implementation Trace

| ID | Implemented by | Verified by |
| --- | --- | --- |
| AC-001 / REQ-001 | `modelsStatus`, `EmbeddingModelCard` | web spec (default state); IMP-07 EMB-001 |
| AC-002 / REQ-002 | `EmbeddingModelDownloads`, `EmbeddingModelFiles` abort, card Download/Cancel/Retry | unit downloads + files tests; GraphQL E2E; IMP-07 EMB-002 (real download, cancel, folder removed) |
| AC-003 / REQ-003 | `removeOtherModelsVectors` (vectors only), `removeModel` | unit `embedding-index` switch test; GraphQL E2E switch test (old files kept, then removed) |
| AC-004 / REQ-004 | `useEmbeddingModel`, `EmbeddingSwitchDialog` | GraphQL E2E; web spec; IMP-07 EMB-003/EMB-004 (setting written to `.env`) |
| AC-005 / REQ-005, QR-002 | `collectionStatus`, `indexStatus` | unit G3 spy test; search-service test (no `sync`); web spec (no mutation on open); IMP-07 EMB-001 (no models folder, no mutation) |
| AC-006 / REQ-006 | `indexProject`, `rebuildProject`, `indexAllProjects`, `ProjectIndexesCard` | unit + GraphQL E2E; web spec; IMP-07 EMB-005/EMB-006 |
| AC-007 / REQ-007 | polling 2 s / 10 s | web spec (poll cadence, stop on unmount); IMP-07 EMB-007 |
| AC-008 / REQ-008, QR-004 | no Electron dependency | browser-only probe; Docker run left downstream |
| AC-009 / REQ-009 | status resolves the setting at each read | GraphQL E2E: `updateServerSetting` (the Advanced path) to a not-downloaded model → that model Active · Not downloaded, nothing downloaded (IMP-03b); invalid value rejected |
| AC-010 | autobyteus-71 suites | IMP-02, IMP-03 |
| AC-011 | `activeDisplay` notDownloaded, `downloadModel(active)` | unit; GraphQL E2E (fresh root and Advanced path); web spec; IMP-07 EMB-001 |
| AC-012 | `retryEmbeddingModel` prepares | unit; GraphQL E2E; web spec |
| AC-013 | `activeDisplay` from files on disk | unit (restart); IMP-07 EMB-007 (real restart) |
| QR-001 | fingerprint-only reads | IMP-04: 626 ms median at 20 × 1,000 |
| QR-003 | `diskUsage`, `downloadBytes` | unit files test (incl. `.part`); web spec |
| DEC-009 / DEC-010 | Active · Not downloaded + Download; Ready · 0 Tasks, no actions | unit, web spec, IMP-07 |

## Key Files Or Areas

Server: `src/embeddings/embedding-index.ts`, `src/embeddings/models/embedding-model-downloads.ts` (new), `src/embeddings/models/embedding-model-files.ts`, `src/embeddings/embedding-model-error.ts` (new), `src/embeddings/embedding-readiness.ts`, `src/embeddings/collection-indexing-job.ts`, `src/embeddings/store/embedding-vector-store.ts`, `src/embeddings/catalog/embedding-model-catalog.ts`, `src/projects/search/project-task-search-service.ts`, `src/compositions/project-task-execution-resource-composition.ts`, `src/api/graphql/types/embeddings.ts`, `src/api/graphql/types/project-task-search.ts`, `docs/modules/embeddings.md`.

Server tests: `tests/helpers/fake-embedding-model.ts` (files fake: per-model presence, `remove`, `diskUsage`, held downloads honouring abort, catalog), `tests/unit/embeddings/embedding-model-downloads.test.ts` (new), `tests/unit/embeddings/embedding-model-management.test.ts` (new: G3, AC-011/012/013, R-9, refusals, collection states), `embedding-model-files.test.ts`, `embedding-index.test.ts`, `tests/unit/projects/project-task-search.test.ts`, `tests/e2e/projects/embedding-settings.e2e.test.ts` (new), `tests/integration/projects/project-task-index-status-load.integration.test.ts` (new, gated).

Web: `pages/settings.vue`, `components/settings/ServerSettingsManager.vue`, `components/settings/embedding/*` (new), `composables/settings/useEmbeddingSettings.ts` (new), `graphql/queries/embeddingSettingsQueries.ts`, `graphql/mutations/embeddingSettingsMutations.ts` (new), `types/embeddingSettings.ts` (new), `localization/messages/{en,zh-CN}/{embeddingSettings,settings,index}.ts`, `docs/settings.md`, `docs/projects.md`, `package.json` (probe script only), tests `components/settings/embedding/__tests__/EmbeddingSettingsPanel.spec.ts` (new), `pages/__tests__/settings.spec.ts`, `components/settings/__tests__/ServerSettingsManager.spec.ts`, `tests/e2e/embedding-settings-probe.mjs` (new).

### Implementation decisions within the design (for the reviewer)

1. **Localization file.** The spec names `settings.ts`; it would pass 500 lines (G6), so the 70 `settings.search.*` keys live in a new `embeddingSettings.ts` per locale, registered like `memorySyncSettings.ts`. Same keys and copy as the spec, except: language labels are keyed by catalog language code (`languagesValue.en` / `.multilingual`) instead of per model id (catalog-driven, per the spec's Data boundary); the reference's `settings.search.reasons.*` keys are not used (reasons are server-provided); the link text "Hugging Face" is a key (`sourceName`, same in both locales) because the literal audit rejects it in a template.
2. **Action error line.** Now approved as built: REQ-010 / AC-014 (DEC-011, SR-005). A refused or failed action shows the server's message in a red `role="alert"` line above the cards (`embedding-action-error`), cleared by the next action.
3. **Late listener replay.** The new model-management test found that a preparation joining a running download missed the bytes already reported (the active row showed 0 bytes until the next chunk). `EmbeddingModelDownloads.ensure` now replays the current progress to a joining listener (only when bytes have arrived, so a verify-only "loading" stays loading).
4. **Waiting copy.** A `WAITING` Project shows "Waiting for the model…" whenever the active model is not Ready, else "Waiting to start…".
5. **Rebuild on Ready · 0 Tasks** is hidden (DEC-010: no actions).
6. **Failed download ahead** (non-active row): status "Not downloaded", red "Download failed: <reason>", Retry (= download) and Use this model, as in VIS-003.
7. **Polling failures.** A failed first read shows the load error with Retry and stops polling; a failed later poll keeps the last status and tries again at the normal cadence.
8. **In-flight actions** disable their own buttons until the action and the follow-up read return.
9. **`useEmbeddingModel`** refuses a blank id before writing (`EMBEDDING_MODEL_UNKNOWN`); an unknown id gets the settings service's validation message with the same code.

## Important Assumptions

- The board's Retry also prepares now (DS-006); the board then searches again as before, which is harmless.
- "On disk" counts everything under `<appData>/embeddings/models/` (the catalog's folders and any leftovers).

## Known Risks

- **QR-001 margin (RSK-001).** 626 ms median / 665 ms first read on an M1 Max at 20 × 1,000. The cost is dominated by `listTasks` reading 20,000 `task.json` files (the Project store), not by the embedding layer. A slow disk or small VPS may exceed 1 s at that size; idle polling is every 10 s. A cache of Task fingerprints per Project would be the next step if needed (not in this change).
- Unavailable on the real stack (network failure) was not forced in the browser probe; unit and GraphQL E2E tests cover it with a failing download.
- EmbeddingGemma 2 (346 MB) was not downloaded in the probe; the same code path is exercised with LEAF-IR.

## Task Design Health Assessment Implementation Check

The design's owners held: one owner of flights (`EmbeddingModelDownloads`), the index as the only public boundary, read-only status separated from scheduling, the search service owning index-all policy, the web composable owning polling. No file exceeds 500 effective lines (largest new: `ProjectIndexesCard.vue` 157, `EmbeddingModelCard.vue` 141).

## Legacy / Compatibility Removal Check

- `EmbeddingModelFiles.removeAllExcept` and its call removed (design Removal Plan); tests updated.
- No compatibility shims added. The existing `RetryEmbeddingModel` document is reused.

## Persisted Data Transition Check (When Applicable)

`Directly Usable — No Migration` (design): existing installs have the active model's folder, read as is. `embeddings.sqlite` is unchanged (new fingerprint-only read).

## Environment Or Dependency Notes

- No new dependencies (web `package.json` only gains the probe script).
- The web tests need `pnpm exec nuxi prepare` once in a fresh worktree (`.nuxt/tsconfig.json`).
- The probe downloads LEAF-IR (≈ 24 MB) from huggingface.co.

## Checks Run

| Check ID | What | Commit Tested | Environment | Code It Exercises | Evidence Files | Result / Look For |
| --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | Server typecheck (`tsc -p tsconfig.build.json`) | `8469d4bcf5` | macOS arm64, node 22 | all server `src` | `evidence/implementation/IMP-01-server-typecheck.log` | Pass (exit 0) |
| IMP-02 | Server unit suite (`vitest run tests/unit`) | `8469d4bcf5` | macOS arm64, node 22 | whole server, incl. new embedding/search tests | `evidence/implementation/IMP-02-server-unit-suite.log` | Pass: 740 files passed, 4 skipped; 6,061 tests passed, 7 skipped |
| IMP-03 | Server GraphQL E2E: embedding settings, search, model-unavailable, server settings | `8469d4bcf5` | macOS arm64, node 22, Studio HTTP | resolvers, composition, setting write | `evidence/implementation/IMP-03-server-graphql-e2e.log` | Pass: 4 files, 20 tests |
| IMP-03b | Embedding settings GraphQL E2E incl. the AC-009 / AC-011 Advanced-setting assertion | `56cb7be36a` | macOS arm64, node 22, Studio HTTP | `updateServerSetting` → status | `evidence/implementation/IMP-03b-embedding-settings-e2e.log` | Pass: 5 tests |
| IMP-04 | QR-001 status load, 20 Projects × 1,000 Tasks (gated test) | server `src` of `8469d4bcf5` (run at `9c73c22672`, identical `src`) | M1 Max, node 22 | `indexStatus` + `modelsStatus` over real Project files and store | `evidence/implementation/IMP-04-qr001-status-load.log` | Pass: first 665 ms, median 626 ms, max 648 ms (budget 1,000 ms) |
| IMP-05 | Web Nuxt suite (`vitest run`, `NUXT_TEST=true`) | `8469d4bcf5` | macOS arm64, node 22 | whole web app, incl. new Embedding spec, settings page, ServerSettingsManager | `evidence/implementation/IMP-05-web-nuxt-suite.log` | Pass: 637 files passed, 2 skipped; 4,536 tests passed, 5 skipped |
| IMP-06 | Web guards: web boundary, localization boundary, literal audit | `8469d4bcf5` | macOS arm64 | new components, catalogs | `evidence/implementation/IMP-06-web-guards.log` | Pass: all three report Passed |
| IMP-07 | Real-stack browser probe (`tests/e2e/embedding-settings-probe.mjs`), clean env | `8469d4bcf5` | built server on a fresh data root, Nuxt dev, headless Chrome, real huggingface.co | whole feature end to end | `evidence/implementation/IMP-07-browser-probe/` (`README.md`, `result.json`, screenshots, logs) | Pass: 8/8 cases, no browser errors, cleanup complete |
| IMP-08 | Hygiene: `git diff --check`, no new dependencies, file sizes | `8469d4bcf5` | — | all changed files | `evidence/implementation/IMP-08-hygiene.log` | Pass: `git diff --check` clean; only manifest change is the probe script; largest changed source file 428 lines |

### Not run, and why

- Docker node run (AC-008, QR-004) and an Electron desktop run: environment-level validation owned downstream (API/E2E); the feature has no Electron dependency and the browser probe runs against a plain node.
- Gated real-model quality suite (`RUN_EMBEDDING_MODEL_E2E`): no model, runtime or relevance code changed.
- Server `test:integration` as a whole: only the new gated load check (IMP-04) is relevant; nothing else in its scope changed.

## Frontend Rendered-Result Check (When Applicable)

IMP-07 captured the section on the real stack and was compared with the references: `VIS-001-fresh-default` (Active · Not downloaded, DEC-009), `VIS-002-download-ahead-progress`, `VIS-004/005` dialogs, `VIS-006-after-switch-not-indexed` (matches VIS-006 in layout, type, tint, buttons, tabs; differences are fixture content), `VIS-009` rebuild confirmation, `VIS-010` needs update, `VIS-001-after-restart-ready` (AC-013), `VIS-017-zh-CN`, `VIS-020-narrow`, `VIS-021-narrow-switch-dialog`. Loading, load error, many Projects, empty, unavailable and focus/announcement behavior are covered by the web spec.

## Downstream Coverage Hints / Suggested Scenarios

- Docker node from a browser (AC-008), and the desktop app.
- Set `AUTOBYTEUS_EMBEDDING_MODEL` in Advanced to a not-downloaded model, open Embedding: "Active · Not downloaded" (AC-009, AC-011 second half).
- Download EmbeddingGemma ahead, then Use it while it downloads: the row turns Active · Preparing and Cancel disappears (R-9, D-2).
- Network blocked during a download: "Download failed: …huggingface.co…" and Retry; for the active model, Unavailable + Retry (AC-012) without a board search.
- Board search keeps returning exact matches during a switch and indexing (AC-004).
- Leave Settings during a large download and return (AC-007).

## API / E2E / Executable Coverage Investigation And Execution Still Required

Owned downstream: the scenarios above, the Docker run, and a re-run of the probe on the reviewed commit.

## Follow-ups (not fixed here)

- If QR-001 is tight on target hardware: cache Task fingerprints per Project (Project store reads dominate).

## IR-002 (CRR-001 → SR-005 / ARCH-REV-003, design G7)

- Trigger: `/software_engineering_team/architecture_reviewer`, ARCH-REV-003 (Pass) after code review CRR-001 (CR-001 Local Fix, CR-002 Requirement Gap decided as DEC-011).
- Commit: `d2bcb95d3a`.
- Changes:
  - CR-001: removed `EmbeddingIndex.modelStatus()` and the types `EmbeddingModelState` / `EmbeddingModelStatus`, and `EmbeddingModelDownloads.isRunning()`. Their assertions now go through `modelsStatus()` (`activeDisplay`: the switch test, with a two-model catalog, and the embed-failure test), `progress()` (downloads test).
  - R-10: `docs/modules/embeddings.md` no longer shows `modelStatus()`; the `modelsStatus()` lines describe the active model's state.
  - REQ-010 / AC-014: the action error line kept as built; the web spec now also checks `role="alert"`, an unreachable-node failure, and that the next action clears it; web `docs/settings.md` states the rule.
  - C-06 (optional, done): `EmbeddingModelFiles.download` calls the cancel at once when the signal was already aborted before its listener was added, so a Cancel at a file boundary does not fetch the next file.
- Classification recheck: unchanged (Medium / High); cleanup within the design, no new owner or behavior beyond REQ-010.

### Checks Run (IR-002)

| Check ID | What | Commit Tested | Environment | Code It Exercises | Evidence Files | Result / Look For |
| --- | --- | --- | --- | --- | --- | --- |
| IMP-09 | Server typecheck | `d2bcb95d3a` | macOS arm64, node 22 | all server `src` | `evidence/implementation/IMP-09-ir002-server-typecheck.log` | Pass (exit 0) |
| IMP-10 | Server unit suite | `d2bcb95d3a` | macOS arm64, node 22 | whole server incl. changed embedding tests | `evidence/implementation/IMP-10-ir002-server-unit-suite.log`, `IMP-10b-ir002-intermittent-rerun.log` | 6,060 passed, 7 skipped, **1 failed**: `native-compaction-terminal-drain.test.ts` (agent-execution, outside this change: no diff from the base in its source or test; the same intermittent test reported in autobyteus-71; it passed in IR-001's IMP-02). Isolated reruns: 5/5 pass (IMP-10b) |
| IMP-11 | Server GraphQL E2E (embedding settings, search, model unavailable) | `d2bcb95d3a` | macOS arm64, node 22, Studio HTTP | resolvers over the changed index | `evidence/implementation/IMP-11-ir002-server-graphql-e2e.log` | Pass: 3 files, 9 tests |
| IMP-12 | Web settings components and settings page tests (incl. AC-014) | `d2bcb95d3a` | macOS arm64, node 22 | Embedding panel, Server Settings, settings page | `evidence/implementation/IMP-12-ir002-web-embedding-and-settings-tests.log` | Pass: 44 files, 253 tests |
| IMP-13 | No references left to the removed code | `d2bcb95d3a` | — | server `src`/`tests`/`docs`, web | `evidence/implementation/IMP-13-ir002-dead-code-grep.log` | Pass: no references left |

Not rerun in IR-002, and why: the full web suite, guards and the browser probe (no web source changed; only a web test and a doc); the QR-001 load check (status reads unchanged; API/E2E measures it on target environments, C-07).

## IR-003 (FO-001 → SR-006 / SR-007, ARCH-REV-005, design G8)

- Trigger: `/software_engineering_team/architecture_reviewer`, ARCH-REV-005 (Pass, AR-005 resolved), after API/E2E API-REV-001 (F-001: QR-001 missed on Docker) and code review CRR-003 (FO-001, `Design Impact`).
- Commits: `70bb03632c` (code, tests, docs); `1b24f59009` (browser probe case EMB-006 for AC-015).
- The SR-006 status-result cache and `collectionJobStatus` were never implemented: SR-007 superseded them before this round, so there was nothing to remove.

What changed:

- **Inputs cached, never status (AR-005).** `ProjectTaskSearchService` keeps `Map<projectId, ItemFingerprints>` and a `dirty` set. `indexStatus()` reads `listProjects()`, drops entries of Projects no longer listed, and per Project reuses the kept fingerprints unless the Project is dirty, has none, or they were made for another model; then `collectionStatus(collection, fingerprints)` computes the status fresh. A warm poll reads no Task.
- **Embedding boundary.** New `fingerprintItems(items)` (opaque `ItemFingerprints`: model id + id → fingerprint, made with the resolved active model's prefix, no `activeModel()`), `fingerprintsAreCurrent(fingerprints)` and `activeModelOnDisk()` (all active files present and not unavailable; read-only). `collectionStatus(collection, fingerprints)` replaces the items parameter: a job with pending work → `indexing` / `waiting`; else the fingerprints against the job's vectors or `store.readFingerprints`; `unavailable` when the model is. `CollectionIndexingJob.status` and `statusFromFingerprints` take the fingerprint map.
- **Marks.** The composition gives the Task service a fan-out of `ProjectChangeMarks` (`taskChangeMarks`): the `/ws/projects` publisher plus `processProjectTaskSearchMarks` (`taskChanged`, `taskRemoved`). Every Project Task mark (create, update, `updateById`, dependency and resource commits; R-12 over-invalidation kept) makes the Project dirty; ad-hoc Tasks and worker-status marks are ignored. `forgetProject` drops the Project's entry and pending run.
- **Index after writes (REQ-011, DEC-014).** A `taskChanged` mark schedules `indexProject(projectId)` 3 s later when `activeModelOnDisk()` holds; writes inside the window join that run. The gate is checked again when the run starts (R-14). The callback catches everything (`PROJECT_NOT_FOUND` silently, others logged as `PROJECT_TASK_INDEX_AFTER_WRITE_FAILED`); timers are `unref`'d and cleared by `dispose()`, which `releaseProjectTaskSearchService()` calls at host shutdown (R-15). Deletes keep `forgetTask` / `forgetProject`.
- **O-1:** `EmbeddingModelFiles.removeIfEmpty()`, called by `EmbeddingModelDownloads` after a failed (not cancelled) download: a folder left without files is removed; verified files of the attempt stay.
- **O-2:** `useEmbeddingSettings.act()` settles when the mutation is answered and reads the status in the background, so the pressed row's buttons come back at once.
- **O-4 (DEC-013):** a failure with no server message shows "Couldn’t reach the server." (zh-CN 无法连接到服务器。); server messages are shown as before (also from a network error's GraphQL body).
- **QR-001 check** (gated integration test) now measures a cold first load (fresh service, no kept fingerprints, no in-memory jobs) against 1 s and ten warm refreshes against 300 ms, with the host load average.
- Docs: server `embeddings.md` (status from fingerprint inputs; index after writes; new boundary calls), `projects.md` (indexing after writes; Retry prepares); web `settings.md` (O-2, O-4).
- G7 items (R-10 and the rest) were done in IR-002.

### Implementation decisions within the design (IR-003)

1. **`fingerprintsAreCurrent(fingerprints)`** is one more read-only boundary call than the design lists. It keeps `ItemFingerprints` opaque (a branded type) while the consumer applies the design's "entry's modelId ≠ active model → re-read" rule.
2. **Stale-model fingerprints in `collectionStatus`** (a switch between the read and the status, a tiny window) answer `notIndexed` with their total; the next poll re-reads.
3. **Grouping writes:** the 3 s window starts at the first write and is not extended by later writes, so a steady stream of writes still indexes every 3 s (bounded latency) instead of never; a write after the run started schedules the next run.
4. **Gate at schedule time is synchronous** (`activeModelOnDisk()` = a few `stat` calls of the model files), and only when no run is pending for that Project. The marks contract's "never reads" concerns Project state; flagged in case the reviewer prefers a deferred check (the fire-time check already exists).
5. **`taskRemoved` only marks dirty** (no index run): deletes already remove index entries at once.
6. **Every Task mark schedules a run** when the model is on disk (R-12); for marks that change no description, the run costs one `listTasks` and a no-op `sync`.
7. In the browser probe, EMB-006 now proves AC-015 on the real stack (a new Task becomes Ready with no search within 10 s) instead of showing Needs update, which index-after-write now resolves within 3 s.

### Checks Run (IR-003)

| Check ID | What | Commit Tested | Environment | Code It Exercises | Evidence Files | Result / Look For |
| --- | --- | --- | --- | --- | --- | --- |
| IMP-14 | QR-001 load check, 20 Projects × 1,000 Tasks: cold first load and ten warm refreshes, host load recorded | `70bb03632c` | M1 Max host, node 22 | `indexStatus` + `modelsStatus` over real Project files and store | `evidence/implementation/IMP-14-ir003-qr001-status-load.log`, `.json` | Pass: cold first load 773 ms (budget 1,000); warm refresh median 25 ms, max 26 ms (budget 300); host load average ≈ 9.5 (other work on the machine) |
| IMP-15 | Server typecheck | `70bb03632c` | macOS arm64, node 22 | all server `src` | `evidence/implementation/IMP-15-ir003-server-typecheck.log` | Pass |
| IMP-16 | Server unit suite (incl. new `project-task-index-status.test.ts`: warm poll, MP-005/006/007, write trigger, R-14, R-15) | `70bb03632c` | macOS arm64, node 22 | whole server | `evidence/implementation/IMP-16-ir003-server-unit-suite.log` | Pass: 741 files passed, 4 skipped; 6,071 tests passed, 7 skipped |
| IMP-17 | Server GraphQL E2E: `tests/e2e/projects` (incl. AC-015 over the real composition) and server settings | `70bb03632c` | macOS arm64, node 22, Studio HTTP | resolvers, composition marks, write trigger | `evidence/implementation/IMP-17-ir003-server-graphql-e2e.log` | Pass: 8 files passed (17 gated files skipped); 52 tests; AC-015 Ready about 3 s after the writes, no search |
| IMP-18 | Web Nuxt suite (incl. O-2, O-4) | `70bb03632c` | macOS arm64, node 22 | whole web app | `evidence/implementation/IMP-18-ir003-web-nuxt-suite.log` | Pass: 637 files passed, 2 skipped; 4,539 tests passed, 3 skipped |
| IMP-19 | Web guards | `70bb03632c` | macOS arm64 | new copy key | `evidence/implementation/IMP-19-ir003-web-guards.log` | Pass |
| IMP-20 | Real-stack browser probe, clean env (EMB-006 = AC-015) | `1b24f59009` | built server on a fresh data root, Nuxt dev, headless Chrome, real huggingface.co | whole feature | `evidence/implementation/IMP-20-ir003-browser-probe/` | Pass: 8/8; AC-015 indexed 3,106 ms after the save with no search; no browser errors |

Not run in IR-003, and why: a Docker-node rerun of API-L02 and the AC-015 real-app run on Docker belong to API/E2E (R-13: with host load recorded).

## Packaging, Licensing And Final Local Results

No new dependencies or packaged assets; licensing unchanged. Final results: see Checks Run.
