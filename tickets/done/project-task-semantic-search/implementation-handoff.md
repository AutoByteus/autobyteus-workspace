# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large / High); ARCH-REV-002 **Pass**, handed to the implementation engineer by `/software_engineering_team/architecture_reviewer`.
- Requirements doc: `tickets/in-progress/project-task-semantic-search/requirements-doc.md` (SR-007, approved by the user 2026-10-18; earlier SR-004)
- Investigation notes: `tickets/in-progress/project-task-semantic-search/investigation-notes.md`
- Solution revision record: `tickets/in-progress/project-task-semantic-search/solution-revision-record.md`
- Design spec (required on every route): `tickets/in-progress/project-task-semantic-search/design-spec.md` (SR-007; § Failure-Origin Resolution (FO-001 → SR-007))
- Supplemental task artifacts: `model-evaluation-report.md`, `probes/` (evidence)
- Design review report: `tickets/in-progress/project-task-semantic-search/design-review-report.md` (ARCH-REV-003, Pass; earlier ARCH-REV-002)
- Architecture review revision record: `tickets/in-progress/project-task-semantic-search/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: N/A (initial implementation)

All paths are relative to the worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-semantic-search`.

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-004: latest-base integration for delivery DR-001; earlier IR-003: default model change after FO-001 / SR-007; IR-002: CRR-001 local fix)
- Implementation revision record: `tickets/in-progress/project-task-semantic-search/implementation-revision-record.md`
- Current implementation revision ID: `IR-004`
- Related solution revision IDs: SR-004, SR-006, SR-007
- Related architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003
- Related code-review revision IDs: CRR-001, CRR-002 (Pass); FO-001 and C-08/O-1 in `code-review-report.md`
- Related API/E2E revision IDs: API-REV-001 (Fail, F-001 / API-L04), API-REV-002 (Pass)
- Related delivery revision IDs: DR-001 (Blocked: Local Fix, latest-base integration)
- Triggering finding IDs: FO-001 (API-REV-001 F-001; code review Design Impact), optional O-1 (IR-003); CR-001, CR-002, C-03 (IR-002)
- Code: branch `codex/project-task-semantic-search`, commit recorded at the end of this file (base `origin/personal` @ `55bff1f5ee`).
- Companion: `/Users/normy/autobyteus_org/autobyteus-agents-project-task-semantic-search`, branch `codex/project-task-semantic-search` @ `344da76` (from `origin/main` @ `887e79d`; a separate worktree because the main checkout holds someone else's uncommitted changes). Not pushed.

What was built, following the design's spines:

- **Embedding layer** (`autobyteus-server-ts/src/embeddings/`, public boundary `EmbeddingIndex`; DS-003/004/007/008):
  - catalog of the three approved models, pinned with SHA-256 and sizes, with the active-model setting `AUTOBYTEUS_EMBEDDING_MODEL`;
  - verified streaming download with an idle timeout, `.part` file, size and checksum check, rename, and one download at a time per model;
  - `onnxruntime-web` WASM worker thread (up to 4 threads, 10-minute idle stop) with a generic empty-input rule for extra graph inputs;
  - `node:sqlite` vector store (renamed aside when unreadable or the wrong shape);
  - fingerprint sync at search time with a background job per collection (batches of 8, generation-checked writes);
  - per-model relevance rule;
  - readiness state machine with retry, and a model switch that never mixes vectors.
- **Task search** (`src/projects/search/project-task-search-service.ts`; DS-001/002/006): an exact tier (today's containment rule) ordered by meaning score, then the meaning tier; a 30 s readiness wait for agents; fire-and-forget delete cleanup.
- **Transports:**
  - GraphQL `searchProjectTasks` and `retryEmbeddingModel`;
  - agent tool `search_project_tasks` through the shared contract and manifest (native and MCP);
  - the setting registration.
- **Web:**
  - `useProjectTaskSearch`: 250 ms debounce, latest request wins, 2 s polling while preparing, a new request when the list changes, Retry;
  - board: server results ranked in lanes, a status line, and the locator waiting for settled results. A readiness poll refreshes a settled answer and never unsettles it (IR-002);
  - the client predicate is removed.
- **Packaging:** the `onnxruntime-web` prune (139 MB → 18 MB) plus a threaded runtime check in the stage, on every desktop platform.
- **Docs** and the **companion** Project Task Manager change.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - new subsystem (11 source files), a new service, two GraphQL operations, an agent tool and a setting;
  - two dependencies and packaging changes on two scripts;
  - new persisted store, network download, and worker/background lifecycle;
  - web board and composable;
  - docs and a companion repository change.
  - Every material impact matches the design's listed surfaces.
- Selected route: `Code Review` (from `get_handoff_rules`, Large/High)
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (independent code review route)
- New design impact or escalation trigger: `None`.
  - All three catalog entries passed verification on WASM.
  - No server-push channel was needed.
  - Existing owners changed only at the listed hooks, plus one new `ProjectErrorCode` value (`TASK_SEARCH_QUERY_REQUIRED`).
  - The QR-001…QR-005 measurements on the built app are downstream (AC-015).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Board finds Tasks by meaning and by exact text; matches best-first per lane; status line; preserved board behaviors (REQ-001…REQ-004, REQ-009, REQ-010) | `ProjectTaskBoard.vue` → `useProjectTaskSearch.ts` → GraphQL `searchProjectTasks` (`api/graphql/types/project-task-search.ts`) → `ProjectTaskSearchService.search` → `ProjectTaskService.listTasks` + `EmbeddingIndex.search` | Implemented. The client predicate is removed. Lanes, the Cancelled toggle (no new request), Clear, Refresh, per-Project search text, the compact panel and lane counts are kept. The locator clears a search only on settled results (R-3). Placeholder "Describe the task you're looking for". |
| BEH-002 | `search_project_tasks(project_id, query, limit?)` with a compact result + meaning-search state (REQ-005, REQ-006) | `project-task-tool-contract.ts` (description, schema, parser) → `project-task-tool-manifest.ts` (30 s wait, summary ≤ 160 chars, notes) → `ProjectTaskSearchService`; `SearchProjectTasksTool` + MCP adapter through the manifest | Implemented. It is exposed only when selected. The companion Project Task Manager selects it and its skill says when to use it. |
| BEH-003 | Index follows Task/Project changes and restarts; never stale (REQ-007, REQ-008, REQ-014) | Search-time fingerprint sync (`collection-indexing-job.ts`); `ProjectTaskService.deleteTask` → `forgetTask`; `ProjectService.deleteProject` → `forgetProject`; vectors persisted in `embeddings.sqlite` | Implemented. Only descriptions are indexed. Edited text is never ranked by its old text. Deletes take effect at once and never wait. Unchanged Tasks are not re-embedded after a restart (unit-tested). |
| BEH-004 | Lazy first use, readiness, failures with Retry, never blocks (REQ-009, REQ-010, REQ-012, REQ-013) | `EmbeddingIndex` readiness state machine + `EmbeddingModelFiles` + `EmbeddingModelRunner`; board status line + `retryEmbeddingModel`; packaging prune/check | Implemented. Nothing in `embeddings/` is created at startup: the search service gets the index lazily. Index errors leave exact matches with `unavailable`. |
| BEH-005 | Generic layer; switchable catalog model by setting; rebuild on switch (REQ-011, REQ-015) | `EmbeddingIndex` (collections by key), catalog + `embedding-model-setting.ts`, `ServerSettingsService` registration | Implemented. A test-only second collection works with no change to the layer (AC-013). A switch stops the old worker, rebuilds in the background, then deletes other models' rows and files. |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. Temp tasks, the dependency picker, the Projects list search, Task storage, Prisma and the `/ws/projects` feed are untouched.

## Key Files Or Areas

Server (`autobyteus-server-ts/`):

- Added `src/embeddings/`:
  - `embedding-index.ts`, `collection-indexing-job.ts`, `relevance.ts`, `embedding-readiness.ts`;
  - `catalog/{embedding-model-definition,embedding-model-catalog,embedding-model-setting}.ts`;
  - `models/embedding-model-files.ts`;
  - `runtime/{embedding-model-runner,embedding-worker}.ts`;
  - `store/embedding-vector-store.ts`.
- Added `src/projects/search/project-task-search-service.ts`, `src/api/graphql/types/{project-task-search,embeddings}.ts`.
- Modified:
  - `src/projects/services/{project-task-service,project-service}.ts` (delete hooks);
  - `src/compositions/project-task-execution-resource-composition.ts`;
  - `src/projects/domain/project-errors.ts` (one code);
  - `src/api/graphql/schema.ts`;
  - `src/agent-tools/project-tasks/{project-task-tool-contract,project-task-tool-manifest,project-task-native-tools}.ts`;
  - `src/services/server-settings-service.ts`;
  - `package.json` and `pnpm-lock.yaml` (`onnxruntime-web` 1.30.0, `@huggingface/tokenizers` 0.2.0, pinned exactly).
- Tests:
  - `tests/unit/embeddings/*` (4 files);
  - `tests/unit/projects/project-task-search.test.ts`;
  - `tests/unit/agent-tools/project-tasks/search-project-tasks-tool.test.ts`;
  - `tests/e2e/projects/project-task-search.e2e.test.ts`;
  - gated `tests/integration/embeddings/embedding-model-quality.integration.test.ts`;
  - helper `tests/helpers/fake-embedding-model.ts`;
  - fixture `tests/fixtures/project-task-search/{tasks,queries}.json` (60 synthetic Tasks, 63 paraphrases, 12 unrelated queries; no user data).
- Docs: `docs/modules/embeddings.md` (new), `projects.md`, `agent_tools_mcp_server.md`, `search.md`, `README.md`.

Web (`autobyteus-web/`):

- Added:
  - `composables/projects/useProjectTaskSearch.ts`;
  - `graphql/queries/projectTaskSearchQueries.ts`, `graphql/mutations/embeddingMutations.ts`;
  - `scripts/onnxruntime-web-packaging.mjs`;
  - `test-support/projectTaskSearchServer.ts`.
- Modified:
  - `components/projects/ProjectTaskBoard.vue`;
  - `types/project.ts`;
  - `localization/messages/{en,zh-CN}/projects.ts`;
  - `scripts/prepare-server.{mjs,sh}` (two-line hooks);
  - specs `ProjectTaskBoard.spec.ts`, `panel/ProjectsPanel.spec.ts`, `panel/ProjectsPanelTaskLocate.spec.ts`;
  - `docs/projects.md`.

Companion (`autobyteus-agents`):

- `agents/project-task-manager/agent-config.json`
- `skills/project-task-management/SKILL.md`

### Implementation decisions within the design (for the reviewer)

1. **Runner priority granularity.**
   - The collection job still embeds in batches of 8, which is the unit of store writes, progress and cancellation.
   - The runner sends the worker one text at a time, so a query waits for at most one document inference, not a whole batch. An EmbeddingGemma 2 batch of 8 takes about 34 s on real Tasks.
   - This keeps DS-008's "queries before document batches" meaningful for the heavy model.
2. **Search service result.** `ProjectTaskSearchService.search` returns `{task: ProjectTaskView, match}`, not just `taskId`, so the tool projects keys, statuses and summaries without a second full Task read. GraphQL still returns only `{taskId, match}` (the board holds the Task views).
3. **Lazy index dependency.**
   - The search service receives `index` as an accessor (`getEmbeddingIndex`), not an instance.
   - Building the index at composition read the app-data directory at startup. That broke `standalone-application-host-lifecycle.test.ts`, which mocks the config provider, and contradicted "nothing in `embeddings/` is constructed during startup".
4. **Cleanup port wiring (R-5).**
   - `ProjectTaskService` gets `searchCleanup` through its composition `deps`, using an inline `import(...)` type; it stays at 500 lines.
   - `ProjectService` is a lazy singleton with no composition initializer. Its default is `processProjectTaskSearchCleanup`, exactly like its `changes` default. That is a value import from `projects/search`, which imports nothing from `projects/services` at runtime, so there is no cycle.
   - Before composition nothing can have indexed the Project, so the default does nothing.
5. **Setting validation.** `normalizeForPersistence` is used instead of `allowedValues`, so a blank value is accepted (the default) and an error lists the catalog ids.
6. **Packaging on every platform.**
   - The design named `prepare-server.mjs`, but that runs only on Windows; macOS and Linux run `prepare-server.sh`.
   - The prune and the check live in one owned module, `scripts/onnxruntime-web-packaging.mjs`, called from both scripts.
   - Keep-list, verified by a 4-thread embedding in a worker against a pruned copy: `ort.node.min.mjs`, `ort-wasm-simd-threaded.mjs`, `ort-wasm-simd-threaded.wasm`.
   - The check runs a tiny embedded ONNX graph with 2 WebAssembly threads inside a worker thread in the stage. It fails when the `.wasm` file is missing (verified).
   - `onnxruntime-web` ships no LICENSE file; its `package.json` declares MIT and is kept (G11).
7. **Calibration (G2).**
   - LEAF-IR's provisional floor of 0.19 failed AC-004 on the synthetic set: only 33% of unrelated queries were unmatched.
   - It was raised to 0.24, the lowest floor that leaves at least 90% of the synthetic unrelated queries unmatched. That is still a full separation on the real-Task probe statistics (unrelated max 0.177).
   - Granite (0.78 / 0.02) and EmbeddingGemma 2 (0.68 / 0.02) kept their values. The evidence is in the catalog comments and `implementation-evidence/catalog-verification/quality-and-calibration.json`.

## Important Assumptions

- The exact tier uses `toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())`, the board's previous rule; the server applies it in its own locale.
- The first search of an empty Project also starts preparing the model; that is the designed trigger.
- `generated/graphql.ts` was not regenerated. It is already out of date at the base (for example, the delegated-launch types are missing), so regenerating would mix unrelated changes. The web uses hand-written types in `types/project.ts`, like the existing Projects store.

## Known Risks

- **RSK-004 (calibration):**
  - real-backlog score distributions are known only as summaries (LEAF-IR real on-topic minimum 0.210);
  - with the 0.24 floor, a real paraphrase whose best score falls between 0.21 and 0.24 would show no meaning match (1 of 63 on the synthetic set);
  - EmbeddingGemma 2's real on-topic and unrelated sets overlap (98.7% separable);
  - AC-001/AC-004 on a real-sized backlog should be measured downstream.
- **RSK-002:** downloads ignore HTTP proxies; the unavailable reason names the host.
- **RSK-005/RSK-009:** WASM memory; the idle stop returns it. EmbeddingGemma 2 reaches about 1.5 GB at peak.
- **RSK-008:** `listTasks` builds full views on every search; QR-001 must be measured at 1,000 Tasks (FU-4).
- **Model download host:** first use needs `huggingface.co` once per model.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Larger Requirement (feature with a new reusable capability)
- Reviewed root-cause classification: No Design Issue Found
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the existing owners took the feature through additive hooks. `ProjectTaskService` stays at 500 effective lines, and `prepare-server.mjs` (491) and `prepare-server.sh` (314) grow only by their hooks.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. There is no client-side fallback predicate, no reading of old-model vectors and no schema-version column.
- Legacy old-behavior retained in scope: `No`. `matchesSearch` and the predicate-based `matchingTasks`/`isNoMatch` were removed from `ProjectTaskBoard.vue`. The docs statements that board search matches only description substrings were replaced.
- Dead code in the touched files and modules removed: `Yes`. None was found beyond the replaced predicate.
- Dead code found elsewhere, listed as follow-up: None.
- Shared structures remain tight: `Yes`. One model definition, one readiness union, and a GraphQL result that carries only ids and match kinds.
- Canonical shared design guidance was reapplied during implementation: `Yes`.
- Changed source implementation files stayed within size guardrails: `Yes`. The largest new file is `embedding-index.ts` at 243 lines; the `>220` changed-line signal applies only to new files, which are owned and split along the design's seams.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: existing data `Not Affected`; the new store is `Discard or Rebuild`.
- Design-spec decision reference: § Persisted Data / State Transition Decision
- Implementation follows the approved decision: `Yes`.
  - An unreadable file or wrong table shape is renamed to `embeddings.sqlite.unreadable-<time>` with a logged warning and recreated.
  - No version field.
  - Rows of other models are deleted when the new model is ready.
  - Removals never create the file.
- Direct-use evidence or discard/rebuild result: `tests/unit/embeddings/embedding-vector-store.test.ts` (corrupt file, other shape, reopen) and `embedding-index.test.ts` (restart without re-embedding).
- Migration implementation: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- New dependencies: `onnxruntime-web` 1.30.0 (MIT, WASM) and `@huggingface/tokenizers` 0.2.0 (Apache-2.0), both without native binaries or install scripts.
- The worker runs as `.ts` from source (Node type stripping, Node ≥ 22.18) and as `.js` from `dist`.
- `node:sqlite` prints the existing ExperimentalWarning on Node 22.
- Model cache used for local verification: `/tmp/pts-impl/models` (outside the repository).

## Local Implementation Checks Run

Implementation-scoped only; these are not API/E2E sign-off.

- Server:
  - `pnpm -C autobyteus-server-ts typecheck`: pass.
  - `test:unit`: 725 files pass, 4 skipped. The one failing file in that run, `standalone-application-host-lifecycle.test.ts`, was caused by eager index construction (decision 3); after the fix it passes (17/17) together with the search tests. The full-suite rerun on the committed state is in § Packaging, Licensing And Final Local Results.
- Server E2E: `tests/e2e/projects/project-task-search.e2e.test.ts` (2/2), run with a clean environment (`env -i`). Real Studio HTTP/GraphQL, the real composition and the MCP host; the model is a deterministic stand-in.
- Gated real-model check: `RUN_EMBEDDING_MODEL_E2E=1 … embedding-model-quality.integration.test.ts`, all three models on the production WASM worker stack:

  | Model | Top 5 | Top 10 | Target shown | Unrelated with no match | Indexing on this set |
  | --- | --- | --- | --- | --- | --- |
  | LEAF-IR | 98.4% | 98.4% | 96.8% | 91.7% | 67 ms/Task |
  | Granite | 100% | 100% | 96.8% | 100% | 54 ms/Task |
  | EmbeddingGemma 2 | 100% | 100% | 95.2% | 100% | 439 ms/Task |

  The synthetic Tasks are shorter than real ones. All pinned files matched their SHA-256. Evidence: `implementation-evidence/catalog-verification/quality-and-calibration.json`.
- Web:
  - `pnpm -C autobyteus-web test:nuxt components/projects --run`: 14 files, 112 tests pass;
  - `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`: pass.
- Packaging:
  - the prune keep-list was verified with a 4-thread LEAF-IR embedding in a worker against a pruned copy;
  - the stage check passes, and fails without the `.wasm`;
  - the full `pnpm -C autobyteus-web prepare-server` (macOS, bash path) result is in § Packaging, Licensing And Final Local Results.
- Licensing and hygiene: see § Packaging, Licensing And Final Local Results (the licensing check needed an allowlist entry for the model licence statements).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys:
  - the Projects page Tasks board search (UC-001), shown below;
  - the right-panel compact board, which uses the same component and is covered by `ProjectsPanel.spec.ts` and `ProjectsPanelTaskLocate.spec.ts`; it was not rendered separately.
- Approved references: requirements § UI, Interaction, And Experience Requirements. The design has G3/G4 and DS-005; there is no Product Design supplement.
- Design system and adjacent surfaces reviewed:
  - existing board toolbar, no-match state, lane headings and counts;
  - the same text and colour classes as the board's quiet texts (`text-xs text-slate-500`);
  - the existing `projects.common.retry` label and focus-ring button pattern.
- Surface used: `pnpm dev` (README "Local full-stack development"): the real built backend and the Nuxt dev frontend.
  - Data was worktree-owned development data under `.autobyteus/development/server-data`, never the user's data.
  - The board was driven in a browser tab, with input events like typing.
  - The stack was stopped afterwards; ports 8000/3000 are free.
- States, layouts and interactions inspected (Project seeded with the 60 synthetic fixture Tasks through GraphQL; real LEAF-IR model downloaded from Hugging Face):
  1. Placeholder "Describe the task you're looking for".
  2. **First use:** a paraphrase with no exact match showed "Preparing meaning search: downloading the model (0 of 24 MB)…" with the no-match box (no exact match exists). About 2 s later (download, load and indexing of 60 Tasks), the intended Task "Sidebar collapse state is lost after restart" appeared alone in To Do (count 1) without retyping, and the status line disappeared.
  3. **Exact query** "docker": the exact match was shown.
  4. **Paraphrases:** "how much did this chat cost me" → the token-usage Task; "the setup file is far too big to download" → the installer-size Task.
  5. **Unrelated query** "recipe for banana bread": the no-match state with Clear search.
  6. **Clear search:** the full board (60 Tasks) in its normal order.
  7. **Edit (AC-008, through GraphQL):** found by its new text at once by exact match and 69 ms later by meaning; the old text no longer matches it.
  8. **Model switch (AC-016):** the setting was set to Granite. The board showed "downloading the model (0 of 55 MB)…", then "Preparing meaning search…", then "… 24 of 60 Tasks", then ready. The exact match stayed visible throughout.
     - Afterwards only Granite's files (53 MB) and 60 Granite vectors (384 floats) remained.
     - Switching back to blank rebuilt the default model, leaving only `mdbr-leaf-ir`.
  9. **Layout:** the screenshot shows the status line directly under the toolbar (8 px), aligned with the search box, with lanes and counts unchanged.
- Visual or interaction issues found and corrected: none.
- Supporting evidence and remaining limits:
  - Screenshot: `/Users/normy/.autobyteus/browser-artifacts/a3d524-1792314005579.png` (the browser tool's artifact folder).
  - The unavailable/Retry and request-error states were checked in component tests, not rendered (no offline network was simulated).
  - The right-panel board was not rendered separately.
  - The Electron desktop shell was not run: the Electron binary is not installed in this worktree. The packaged server stage was checked under Node instead (see the end of this file).

## Downstream Coverage Hints / Suggested Scenarios

- AC-001/AC-010 on a real built app:
  1. Create a Project with the synthetic Tasks.
  2. Search a paraphrase: the "Preparing meaning search… N of M Tasks" line shows, then the meaning matches appear without retyping.
  3. Repeat on the right-panel board.
- AC-011: run offline (block `huggingface.co`). Expect the unavailable line with Retry, exact matches still shown and Task create/edit/delete unaffected. Retry after reconnecting succeeds.
- AC-016:
  1. Set `AUTOBYTEUS_EMBEDDING_MODEL=granite-embedding-small-english-r2` in Settings.
  2. Search: the model downloads and the index rebuilds; only Granite rows and files remain afterwards.
  3. Switch back to blank (the default).
- AC-009: restart the server and search. No re-embedding of unchanged Tasks (the worker should not index); an externally edited Task is brought up to date.
- AC-015 / QR-001…QR-005: a synthetic 1,000-Task backlog. Measure GraphQL search time at p90, indexing time, RSS during and after 10 idle minutes, and the `embeddings.sqlite` size (LEAF-IR vectors are 768 floats, 3 KB per Task).
- AC-006/AC-007: the Project Task Manager calls `search_project_tasks` on first use and waits up to 30 s; its note when preparing; `PROJECT_NOT_FOUND`/argument errors.
- AC-014: the packaged desktop build runs the embedding runtime check (`prepare-server`). FU-5 (Docker prune) is out of scope; a Docker smoke embed is still useful.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Real-app (isolated desktop instance) journeys for AC-001, AC-005, AC-008…AC-011, AC-016.
- Measurement report for AC-015 / QR-001…QR-005 on the built app.
- Packaged desktop and Docker smoke for AC-014 / QR-008 (Docker images keep the unpruned `onnxruntime-web`; FU-5).
- Review of the companion change (AC-007).

## Follow-ups (not fixed here)

- FU-1…FU-5 from the design (front-end model chooser, proxy-aware downloads, Task `autobyteus-126`, `listTasks` read cache if measured, Docker image prune).
- FU-6 (new): `autobyteus-web/generated/graphql.ts` is out of date with the server schema at the base (delegated-launch operations missing); regenerate it on its own (`BACKEND_GRAPHQL_BASE_URL=<schema file> pnpm -C autobyteus-web codegen`).

## Packaging, Licensing And Final Local Results

- `pnpm -C autobyteus-web prepare-server` (macOS → `prepare-server.sh`): exit 0.
  - "Removed 127 MB of onnxruntime-web browser builds"; "Embedding runtime validation passed".
  - The staged `node_modules/onnxruntime-web/dist` holds only the three Node files.
  - The packaged `dist` runner and worker then embedded with the real LEAF-IR model under Node: 768 dimensions, the paraphrase scored 0.377 against its target and 0.206 against an unrelated Task, about 0.3 s including load.
- Licensing:
  - `check_licensing.py` first rejected the model licence statements as stray Apache-2.0 claims.
  - Fixed in commit `d83ec5235a`: the catalog and `embeddings.md` are allowlisted with a reason, and the tests no longer spell the licence.
  - Now "Licensing is consistent"; `scripts/tests/test_check_licensing.py` passes (12).
  - `check_repository_artifact_hygiene.py` passes.
- Commits on `codex/project-task-semantic-search`: `54e26d76ee` (implementation), `d83ec5235a` (licensing allowlist). Ticket artifacts are committed separately afterwards.
- Final local run on commit `d83ec5235a`:
  - `pnpm -C autobyteus-server-ts test:unit`: 726 files passed, 4 skipped (gated); 5,871 tests passed, 7 skipped.
  - `pnpm -C autobyteus-web test:nuxt --run`: 632 files passed, 2 skipped; 4,476 tests passed, 5 skipped.
  - `tests/e2e/projects/project-task-search.e2e.test.ts` (clean environment): 2/2.
  - The gated real-model suite was run earlier for all three models (results above). It is skipped in `test:unit` (it lives under `tests/integration`) unless `RUN_EMBEDDING_MODEL_E2E=1`.

## IR-002 (CRR-001 Local Fix)

- Commit `722b9b3918`. Details are in `implementation-revision-record.md` § IR-002.
- CR-001: readiness polls no longer make the search unsettled, so the locator acts while meaning search prepares. There is a new failing-then-passing spec in `ProjectsPanelTaskLocate.spec.ts`.
- CR-002: the dead `isSettledReadiness` export is removed.
- C-03: the worker type-imports `EmbeddingModelOutput`.
- Checks: web `components/projects` 113/113; web guards; server embeddings, search and tool 38/38; typecheck; the real-model LEAF-IR check.
- Classification: unchanged (Large / High).

## Code Review Result

- CRR-002: **Pass** (targeted delta review of IR-002; CR-001 and CR-002 resolved, C-03 applied). Report: `code-review-report.md`. The code reviewer hands off to `/software_engineering_team/api_e2e_engineer`.

## IR-003 (FO-001 → SR-007: Granite becomes the default model)

Commit `9f0df7eab3` on `codex/project-task-semantic-search`; details in `implementation-revision-record.md` § IR-003.

What changed:

- **Catalog and setting** (`src/embeddings/catalog/embedding-model-catalog.ts`):
  - `DEFAULT_EMBEDDING_MODEL_ID` is `granite-embedding-small-english-r2`, and a blank setting means Granite;
  - the catalog lists Granite first, so the setting description (built from the catalog), its "Blank uses the default" sentence and the error message list it first;
  - Granite's description now opens with "Default" and keeps its values (floor 0.78, margin 0.02, `maxTokens` 1024);
  - LEAF-IR gets floor 0.30 (margin 0.045 unchanged). Its description says it is for small Projects and that relevance degrades on large Projects, where unrelated searches start to show matches;
  - the catalog comments record the FO-001 numbers per entry.
- **O-1** (`models/embedding-model-files.ts`, `embedding-index.ts`):
  - `EmbeddingModelFiles.hasAllFiles()` is a cheap synchronous size check;
  - `ensure()` reports progress only while bytes are downloaded;
  - the index starts preparation as `loading` when every file is present (checksums are then verified silently), and as `downloading 0 of N` otherwise;
  - a download of a damaged file still switches to `downloading`.
- **G2, reproducible scale check:**
  - `tests/helpers/project-task-search-backlogs.ts` ports the two 1,000-Task backlogs of the FO-001 evidence. The generated one is byte-identical to `API-PROBE-generate-backlog.mjs` with seed 20261018 (checked: 940/940 Tasks identical). The repository one uses the same selection from `tickets/done` as `API-PROBE-score-analysis.mjs`.
  - The fixture now has 24 unrelated queries: the 12 extra ones are those of the FO-001 evidence.
  - The gated test measures AC-001 as "target shown among the first 5 matches".
  - With `TEST_EMBEDDING_SCALE=1` it asserts AC-001 and AC-004 (≥ 90%) for the default model on both 1,000-Task backlogs; other models' scale results are recorded, not asserted.
- **Tests that depended on the default:**
  - the catalog/setting unit test;
  - the search E2E (the order of ids in the error message);
  - the API/E2E-owned `project-task-search-model-unavailable.e2e.test.ts`: the model folder now comes from `DEFAULT_EMBEDDING_MODEL_ID` instead of `mdbr-leaf-ir`;
  - new unit tests for O-1 (index and files).
- **Docs** (`docs/modules/embeddings.md`):
  - the table lists Granite first as the default and LEAF-IR "for small Projects";
  - "Choosing The Model" says which model fits which case;
  - a measured-relevance table per model gives the fixture and 1,000-Task results;
  - the readiness text covers O-1.
  - The web `docs/projects.md` and the localization name no model, so they are unchanged.

Classification: unchanged (Large / High). No escalation trigger was hit: the default passes AC-001 and AC-004 on all three backlogs. As the review noted (R-9), the margin is thin: 92.1% against the 90% target on the repository backlog.

### Checks Run (IR-003)

Evidence: `tickets/in-progress/project-task-semantic-search/evidence/implementation/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` | 9f0df7eab3 | macOS 26, Node 22.23.1 | server `src` | — | Pass | `IMP-01-typecheck.log` | `tsc exit=0` |
| IMP-02 | `pnpm -C autobyteus-server-ts test:unit` | 9f0df7eab3 | macOS 26, Node 22.23.1 | all server unit tests, incl. `tests/unit/embeddings/*`, `project-task-search`, `search-project-tasks-tool` | REQ-011, REQ-015, AC-013, AC-016 (fake model), O-1 | Pass | `IMP-02-server-unit.log` (excerpt) | `Test Files  726 passed \| 4 skipped (730)`; `embedding-index.test.ts (12 tests)`; `embedding-model-catalog.test.ts (6 tests)`; `embedding-model-files.test.ts (6 tests)` |
| IMP-03 | Gated real-model check, default model, `TEST_EMBEDDING_SCALE=1` | 9f0df7eab3 (working tree identical in `src`/tests) | macOS 26, M1 Max, Node 22.23.1, ort-web WASM 4 threads | catalog (Granite), runner/worker, relevance rule; fixture + generated + repository backlogs | AC-001, AC-002, AC-004 at 60 and 1,000 Tasks (DEC-011, G2), QR-007 | Pass | `IMP-03-quality-granite-scale.log`, `.json` | `"fixture":{…"shownInFirst5":0.968,"unrelatedWithoutMatch":0.958}`, `"generated":{"tasks":1000,…"shownInFirst5":0.937,"unrelatedWithoutMatch":0.958}`, `"repository":{"tasks":1000,…"shownInFirst5":0.921,"unrelatedWithoutMatch":0.958}` (identical to FO-001) |
| IMP-04 | Same, `TEST_EMBEDDING_MODELS=mdbr-leaf-ir`, scale | 9f0df7eab3 (same) | same | LEAF-IR with floor 0.30 | QR-007 on the fixture; scale results recorded only | Pass (fixture) | `IMP-04-quality-leaf-ir-scale.log`, `.json` | fixture `0.952` / `0.958`; generated `0.873` / `0.917`; repository `0.905` / `0.833` (identical to FO-001 for 0.30) |
| IMP-05 | Same, `TEST_EMBEDDING_MODELS=embeddinggemma-2` (fixture) | 9f0df7eab3 (same) | same | EmbeddingGemma 2 with the 24 unrelated queries | QR-007, AC-001, AC-004 on the fixture | Pass | `IMP-05-quality-embeddinggemma-2-fixture.log`, `.json` | `"shownInFirst5":0.952,"unrelatedWithoutMatch":1` |
| IMP-06 | `env -i … vitest run tests/e2e/projects/project-task-search.e2e.test.ts` | 9f0df7eab3 (same) | macOS 26, clean env | GraphQL/MCP search, setting validation (id order) | REQ-005, REQ-015 | Pass | `IMP-06-e2e-project-task-search.log` | `Tests  2 passed (2)` |
| IMP-07 | `env -i … vitest run tests/e2e/projects/project-task-search-model-unavailable.e2e.test.ts` | 9f0df7eab3 (same) | macOS 26, clean env | real index with an unreachable model host; default model folder | AC-011, AC-012, REQ-010 | Pass | `IMP-07-e2e-model-unavailable.log` | `Tests  2 passed (2)` |

- Not run, and why:
  - EmbeddingGemma 2 at 1,000 Tasks: indexing 2,000 long Tasks takes hours on WASM; the design requires only fixture verification for alternatives.
  - Web tests: no web code changed in IR-003; the IR-002 web results (113/113) still apply.
  - Packaging: no packaging code changed.
  - QR-003/QR-004 cost measurements with Granite as the default (API-L03b/c/d), API-L04 and API-R06: these belong to API/E2E, which reruns them.

- CRR-004: **Pass** (targeted delta review of IR-003; FO-001 resolved, O-1 applied). Report: `code-review-report.md`. The code reviewer hands off to `/software_engineering_team/api_e2e_engineer`.

## IR-004 (DR-001: latest-base integration)

Merge commit `600d079b9c` on `codex/project-task-semantic-search`: `origin/personal` @ `2b04a9971d` merged into the ticket branch, whose validated source was `9f0df7eab3`. Details are in `implementation-revision-record.md` § IR-004. Nothing is pushed.

Conflict resolutions (5 files), plus one auto-merge fix:

- **`project-task-tool-contract.ts`:** the base removed `create_or_update_project` and `effectiveProjectTaskToolName`. There are now seven tools: the base's six plus `search_project_tasks`. The parser dispatches on `name`, with the search parser added.
- **`project-task-tool-manifest.ts`** (auto-merged, but did not compile): the search branch used the removed `tool` variable; it now uses `name`.
- **`project-task-native-tools.ts`:** registers `SearchProjectTasksTool`; no `CreateOrUpdateProjectTool`.
- **`project-service.ts`:** Project delete does `projectRemoved`, then the search `forgetProject` (synchronous, never waits), then awaits the base's adoption revert (`afterDelete` → `afterProjectDeleted`, best effort and logged). Both imports are kept.
- **`project-task-service.ts`:**
  - Task delete calls `forgetTask` and `revertUnfinishedAdoptionsOfDeleted`;
  - the composition initializer accepts both `revertUnfinishedAdoption` and `searchCleanup`, and the auto-merged composition wires both;
  - the file is at 492 effective lines (the base has 490).
- **`docs/modules/agent_tools_mcp_server.md`:** the base's tool list plus `search_project_tasks`.
- **Base test** `tests/unit/agent-tools/project-tasks/project-task-tools.test.ts`: counts seven tools and still proves `create_or_update_project` is unknown. `project-tool-runtime-parity.test.ts` needed no change: it asserts the removed name's absence and selected subsets, not a fixed count.

The intended behavior is unchanged. The ticket's own delete cleanup still never throws or waits, and the base's adoption-revert order and failure semantics are kept. Classification: unchanged (Large / High).

### Checks Run (IR-004)

Evidence: `evidence/implementation/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-08 | `pnpm -C autobyteus-server-ts typecheck` | 600d079b9c | macOS 26, Node 22.23.1 | server `src` after the merge | — | Pass | `IMP-08-typecheck-merge.log` | `exit=0` |
| IMP-09 | `pnpm -C autobyteus-server-ts test:unit` | 600d079b9c | same | all server unit tests, incl. Project/Task tools (seven-tool set), embeddings and search, adoption | REQ-005, REQ-006, REQ-007 | Pass | `IMP-09-server-unit-merge.log` (excerpt) | `Test Files  737 passed \| 4 skipped (741)` |
| IMP-10 | `env -i … vitest run tests/e2e/projects` | 600d079b9c | same, clean env | Projects HTTP/GraphQL/MCP boundaries, both search E2E tests, startup migration | REQ-004, REQ-005, REQ-010 | Pass (6 files; 16 gated files skipped) | `IMP-10-e2e-projects-merge.log` | `Test Files  6 passed \| 16 skipped (22)`; `project-task-search.e2e.test.ts (2 tests)`; `project-task-boundaries.e2e.test.ts (13 tests)` |
| IMP-11 | `pnpm -C autobyteus-web test:nuxt components/projects composables/projects stores --run` | 600d079b9c | same | board search, composable, locator, Projects stores (base web changes included) | REQ-001…REQ-004, AC-005 | Pass | `IMP-11-web-projects-merge.log` | `Test Files  111 passed (111)` |
| IMP-12 | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=…/agy-failure-cli.mjs vitest run tests/e2e/projects/{hand-started-run-adoption,project-change-feed}.e2e.test.ts` | 600d079b9c | same, scripted AGY CLI | the merged delete paths: adoption revert on Task/Project delete; delete change marks | REQ-007 (delete), base adoption behavior | Pass | `IMP-12-e2e-adoption-feed-merge.log` | `Tests  11 passed (11)` |

- Not run, and why:
  - The gated real-model quality check: the merge changed no embedding code, model or calibration, so IMP-03…IMP-05 still apply (`git diff 9f0df7eab3 600d079b9c -- autobyteus-server-ts/src/embeddings` is empty).
  - The other 14 gated `tests/e2e/projects` suites: they exercise collaboration runtimes this ticket and the merge resolution do not touch.
  - Packaging: unchanged.
  - The full web suite: only the Projects-related web tests were rerun.
- Intermittent failure observed and not reproduced:
  - `tests/unit/agent-execution/native-compaction-terminal-drain.test.ts` (base compaction code; not touched by the ticket or the merge) failed once in a batch run (`tests/unit/agent-tools tests/unit/agent-execution tests/unit/projects tests/unit/embeddings`) after about 3.1 s. That run's log was not kept.
  - It then passed 10 times: the same batch again, 3 times alone and 6 times under 6-core CPU load. It also passed in the full suite (IMP-09).
  - Its cause is not known. The test includes a real 1 s + 2 s summarizer backoff and asserts exact compaction phases, so it is timing-sensitive. I am reporting it, not counting it as pass or fail for this ticket.

- CRR-006: **Pass** (targeted review of the IR-004 merge resolutions, DR-001). Report: `code-review-report.md`. The code reviewer hands off to `/software_engineering_team/api_e2e_engineer`.
