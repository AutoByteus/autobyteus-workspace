# Implementation Handoff

## Upstream Artifact Package

- Ticket: `search-model-settings` (Project Task `autobyteus-146`, follow-up FU-1 of `autobyteus-71`).
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-model-settings`, `codex/search-model-settings`, base `origin/personal` @ `8d40ba3b6c`.
- Requirements: `requirements-doc.md` at `SR-004` (DEC-009, DEC-010).
- Design: `design-spec.md` at `SR-004` (DS-001…DS-006, Final File Responsibility Mapping, Change Sequence 1–7, G1–G6); `architecture-design-handoff.md`; `investigation-notes.md`; `solution-revision-record.md`.
- Architecture review: `design-review-report.md` (ARCH-REV-002, Pass); `architecture-review-revision-record.md`.
- Behavior-defining supplement: approved UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/search-model-settings/ui-ux-spec.md` (design `4e4ac06`) with VIS-001…VIS-021.
- Classification carried: task size **Medium**, architectural risk **High** (unchanged; see Routing Classification).
- Commits: `9c73c22672` (server: embedding layer, search service, GraphQL, server tests, docs), `8469d4bcf5` (web sub-section, web tests, browser probe, QR-001 load check, docs), `56cb7be36a` (server E2E: Advanced setting → Active · Not downloaded), then the ticket-folder commit with this handoff and the evidence. Implementation round: **IR-001**.

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
2. **Action error line.** The spec has no surface for a refused or failed action (the UI hides refused actions, so this is rare: races, network loss). The panel shows the server's message in a quiet red `role="alert"` line above the cards (`embedding-action-error`), cleared by the next action. Flagged in case Product prefers otherwise.
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

## Packaging, Licensing And Final Local Results

No new dependencies or packaged assets; licensing unchanged. Final results: see Checks Run.
