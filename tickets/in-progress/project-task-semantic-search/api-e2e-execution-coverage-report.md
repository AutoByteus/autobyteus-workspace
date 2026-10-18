# API/E2E Execution Coverage Report

## Round

- Coverage investigation (the plan; it lists the upstream documents): `tickets/in-progress/project-task-semantic-search/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; code reviewer pass handoff CRR-002 (`/software_engineering_team/code_reviewer`)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - The api-e2e-engineer skill changed during the run: the case ledger was replaced by the progress log, the evidence moved to `evidence/`, and the investigation was restructured to Planned Cases. No planned case was dropped.
  - API-L04 grew a score-level analysis (`evidence/probes/API-PROBE-API-PROBE-score-analysis.mjs`) after the first in-app quality run failed, to tell a test-data artifact from a product weakness. It adds a second distractor source: real product-domain text from this repository's finished tickets.
  - EmbeddingGemma 2's analysis runs only on the fixture and real-text backlogs; on the busy host all three backlogs would take hours.
  - The memory measurements use macOS `footprint` instead of `ps` RSS after 12:17, because the host swaps and RSS undercounts (API-L03d).
  - The previous working session ended at 12:33 with the desktop instance stopped. It was restarted on the same data root, and API-L02f was redone in full (see its row).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-semantic-search/tickets/in-progress/project-task-semantic-search/evidence/` (the handoff message gives the commit)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` for the added durable test, when the failure route returns for a later round. This round is `Fail`: failure-origin review is requested, not test review.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `722b9b3918` (branch `codex/project-task-semantic-search`) | macOS (Darwin 25.5) arm64, Apple M1 Max, 10 cores, 64 GB | Node 22.23.1, pnpm 10.28.2; repository suites from source | Host shared with other agents: load average 120–220, 9.7 GB swap used. E2E with `env -i PATH HOME=/tmp/pts-api/home TMPDIR` |
| ENV-2 | `722b9b3918` | same host | Packaged desktop `AutoByteus_enterprise_macos-arm64-1.5.6-beta.1` built by `pnpm --silent isolated-app start --build`; isolated instances `iso-61890-f6ae` → `iso-62519-5afd` → `iso-65187-14ae` (same data root) | Own data root `/private/var/folders/7w/…/autobyteus-isolated-root-6x1LUC`; window 1200×768; locale en; default model LEAF-IR unless stated |
| ENV-3 | `722b9b3918` | Docker Desktop linux/arm64 on the same host | Image `ab-pts-validation:722b9b3918` built from `autobyteus-server-ts/docker/Dockerfile.monorepo`; Node 22.23.3 | Test-owned container `pts-api-docker`, port `127.0.0.1:60668→8000`, no volumes |
| ENV-4 | `722b9b3918` | same host as ENV-1 | Production runner, catalog and relevance rule from `autobyteus-server-ts/dist`, model files verified by the gated suite in `/tmp/pts-api/models` | Synthetic backlog from `evidence/probes/API-PROBE-API-PROBE-generate-backlog.mjs` (seed 20261018) and real product-domain text from `tickets/done/*` |

## Cases

Evidence paths are relative to the evidence folder. Fixture IDs (`t01`…`t60` targets, `d001`… generated distractors) map to Task ids through the seed maps the driver wrote. In the board states, Task ids are `project_task_…`; the quoted titles identify them.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | all server | Production types | `pnpm -C autobyteus-server-ts typecheck` | ENV-1 | Pass | `repository/API-R01-server-typecheck.log` | `exit=0` | — |
| API-R02 | AC-003, AC-004, AC-006, AC-008, AC-009, AC-011, AC-013, AC-016 | Server unit (deterministic fake model) | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/embeddings tests/unit/projects/project-task-search.test.ts tests/unit/agent-tools/project-tasks/search-project-tasks-tool.test.ts --no-watch` | ENV-1 | Pass | `repository/API-R02-feature-unit.log` | `Tests  38 passed (38)` | AC-013 second collection, switch, restart, late batch, unavailable/retry are proven here |
| API-R03 | regression | Server unit | `pnpm -C autobyteus-server-ts test:unit` | ENV-1 | Pass | `repository/API-R03-server-unit-summary.log` | `Test Files  726 passed \| 4 skipped (730)`, `Tests  5871 passed \| 7 skipped` | 4 skipped files are gated live suites |
| API-R04 | regression | Server integration | `pnpm -C autobyteus-server-ts test:integration:prepare`, then `pnpm -C autobyteus-server-ts test:integration` | ENV-1 | Pass (in scope) | `repository/API-R04-server-integration.log` | `Test Files  2 failed \| 74 passed \| 18 skipped (94)`; rerun alone: `✓ AC-001/AC-015(a): … within 5 s` and the two `×` cadence cases | Out of scope: `agent-status-websocket.integration.test.ts` "coalesces a representative fine-grained canonical stream…" and "uses a changed interval only…" fail alone too (`expected [ { type: 'SEGMENT_CONTENT', …(1) } ] to have a length of +0 but got 1`). This branch changes no streaming/status file, and these two cases are the known product defect another checkout's TESTING.md lists as a standing exception (dropped from the branch's guideline by `7af116e8de`). The package auto-refresh "within 5 s" case passed when rerun alone: host-load timing |
| API-D01 | AC-011, AC-012, QR-006, REQ-010 | Real Studio GraphQL + MCP host with the real `EmbeddingIndex`; only `fetch` to huggingface.co simulated | new `autobyteus-server-ts/tests/e2e/projects/project-task-search-model-unavailable.e2e.test.ts`; run in API-R05 | ENV-1 | Pass | `repository/API-R05-e2e-projects.log` | `✓ tests/e2e/projects/project-task-search-model-unavailable.e2e.test.ts (2 tests)` | Asserts: no `embeddings/` after startup and Task/Project writes, no model-host request; `PREPARING/DOWNLOADING` then `UNAVAILABLE` "Could not reach huggingface.co"; exact matches, create/edit/delete OK; tool note "exact text matches only"; no request on later searches; `retryEmbeddingModel` true → new attempt "(HTTP 404)"; no `.part` left |
| API-R05 | AC-003, AC-006, AC-008, AC-016 (setting), regression | Real HTTP/GraphQL/MCP | `env -i PATH="$PATH" HOME=/tmp/pts-api/home TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects --no-watch` | ENV-1 | Pass | `repository/API-R05-e2e-projects.log` | `Test Files  6 passed \| 14 skipped (20)`, `Tests  36 passed \| 61 skipped` | Skipped files are gated runtime suites (`RUN_*`) |
| API-R06 | AC-002, AC-004, QR-007 | Real models on the production WASM worker | `RUN_EMBEDDING_MODEL_E2E=1 TEST_EMBEDDING_MODELS=all TEST_EMBEDDING_MODEL_CACHE=/tmp/pts-api/models TEST_EMBEDDING_CALIBRATION_OUT=… pnpm -C autobyteus-server-ts exec vitest run tests/integration/embeddings/embedding-model-quality.integration.test.ts --no-watch` | ENV-1 | Pass | `repository/API-R06-real-model-suite.log`, `repository/API-R06-real-model-calibration.json.txt` | `✓ mdbr-leaf-ir meets QR-007, AC-001 and AC-004`, same for granite and embeddinggemma-2; JSON `"top5":0.984`, `"unrelatedWithoutMatch":0.917` (LEAF-IR) | On the 60-Task fixture only; see API-L04 for 1,000 Tasks |
| API-R07 | AC-001, AC-003…AC-005, AC-010, AC-011 (web) | Web unit/component; guards | `pnpm -C autobyteus-web test:nuxt --run`; `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | ENV-1 | Pass | `repository/API-R07-web-suite.log`, `repository/API-R07-web-guards.log` | `Test Files  632 passed \| 2 skipped (634)`, `Tests  4479 passed`; three `exit=0` | — |
| API-R08 | AC-014 (licences) | Repository checks | `python3 scripts/check_licensing.py`; `python3 scripts/check_repository_artifact_hygiene.py`; `python3 -m pytest -q scripts/tests/test_check_licensing.py` | ENV-1 | Pass | `repository/API-R08-licensing-hygiene.log` | `Licensing is consistent.`; `Repository artifact hygiene check passed.`; `12 passed` | Hygiene rerun after the evidence commit: see `repository/API-R08-hygiene-after-evidence.log` |
| API-L01 | AC-014, QR-008, AC-011, AC-009, AC-016, AC-012 | Test-owned Docker container (image built from this worktree) | `docker buildx build --builder desktop-linux --load --platform linux/arm64 -f autobyteus-server-ts/docker/Dockerfile.monorepo -t ab-pts-validation:722b9b3918 .`; `docker run -d --name pts-api-docker -p 127.0.0.1:60668:8000 ab-pts-validation:722b9b3918`; GraphQL through `evidence/probes/API-PROBE-API-PROBE-search-driver.mjs`; `127.0.0.1/::1 huggingface.co` added to the container's `/etc/hosts`, then restored; `retryEmbeddingModel`; `docker restart`; setting to Granite and back | ENV-3 | Pass | `docker/API-L01-00…API-L01-18` (main: `l01-03-offline-first-use.jsonl`, `l01-04-exact-and-writes-while-unavailable.jsonl`, `l01-06-after-retry-until-ready.jsonl`, `l01-07-quality-rep60.json`, `l01-10-restart-then-search.jsonl`, `l01-12-switch-granite.jsonl`, `l01-13-after-switch-files.txt`, `l01-17-after-switch-back-files.txt`) | `"reason":"Could not reach huggingface.co to download the model: fetch failed"`; then `"state":"READY"` at `"t":8.481` with t01 as MEANING; `"targetShownInFirst5":61` of 63, `"fixtureUnrelatedNoMatch":11`; `[{"model_id":"granite-embedding-small-english-r2","n":61,"bytes":1536}]`; back to `mdbr-leaf-ir` only | Node 22.23.3; the image keeps 136 MB unpruned `onnxruntime-web/dist` (FU-5). After the restart, the first search was READY 1.1 s later. The server's RSS after indexing was 611 MB |
| API-L02a | AC-014, QR-008 | Packaged macOS arm64 build | `pnpm --silent isolated-app start --build` | ENV-2 | Pass | `desktop/API-L02a-01-isolated-start.json.txt`, `desktop/API-L02a-02-build-packaging-excerpt.txt`, `desktop/API-L02a-03-packaged-stage.txt` | `Removed 127 MB of onnxruntime-web browser builds`, `Embedding runtime validation passed`; packaged `dist` lists only `ort-wasm-simd-threaded.mjs`, `ort-wasm-simd-threaded.wasm`, `ort.node.min.mjs` | The packaged app then ran every desktop case (real model, worker threads) |
| API-L03a | AC-012, QR-006 | Instance GraphQL + data root | Seed with `evidence/probes/API-PROBE-API-PROBE-search-driver.mjs seed` (Backlog 1000, Backlog 1000 long, Representative 60); stop with `--keep`; `evidence/probes/API-PROBE-API-PROBE-apply-statuses.mjs`; start with `--data-root` | ENV-2 | Pass | `desktop/API-L03a-01-server-process.txt`, `desktop/API-L03a-02-data-root-before-search.txt`, `desktop/API-L03a-03-statuses-applied.jsonl.txt` | The data-root listing has no `embeddings` after 2,060 Task creations and two starts; 1,000 creates in 64 s | Statuses were set in the test-owned Task files because GraphQL has no status mutation |
| API-L02b | AC-010, AC-001, QR-003, QR-005 | Desktop renderer, Projects page board (Backlog 1000) | Typed "the navigation panel on the left forgets that I folded it when I reopen the program" (no exact match) on the first search ever | ENV-2 | Pass | `desktop/API-L02b-02-state-1s-after-typing.json.txt`, `desktop/API-L02b-04-state-10s.json.txt`, `desktop/API-L02b-06-wait-until-ready.json.txt`, `desktop/API-L03b-01-indexing-timeline-graphql.jsonl.txt`, `desktop/API-L03b-02-embeddings-files.txt`, screenshots `desktop/API-L02b-03…`, `API-L02b-05…`, `API-L02b-07…` | `"status": "Preparing meaning search: downloading the model (0 of 24 MB)…"`; `"Preparing meaning search… 56 of 1000 Tasks"`; 43 distinct progress texts; final lanes `TODO: ['Sidebar collapse state is lost after restart']` with `status: null` | Ready ≈107 s after typing (≈0.109 s/Task). Model files 23.9 MB; `embeddings.sqlite` 3.8 MB + WAL 4.2 MB for 1,000 Tasks |
| API-L02c | AC-005, CR-001 | Right-panel compact board (Backlog 1000 long, first search of that Project) | Typed "docker"; while preparing, pressed Refresh, then "Show Task in Projects" for a hidden Cancelled Task (d012) through `taskLocator.locate(…)`; then Cancelled toggle off/on with "agent"; opened a card and pressed "Back to board" | ENV-2 | Pass | `desktop/API-L02c-01-locate-while-preparing.json.txt`, `desktop/API-L02c-02-located-while-preparing.png`, `desktop/API-L02c-03-panel-cancelled-toggle-open-return.json.txt` | `afterRefresh.query: "docker"`, `"Preparing meaning search… 8 of 1000 Tasks"`; `"locatedAfterMs": 131` with `query: ""`, `CANCELLED:94` lane shown, `"located": true`; toggle: CANCELLED lane hidden and shown, counts `151/59/194` unchanged; `returned.query: "agent"` | The locate entered through the store action the Workspaces-tree row calls: no task-agent run exists without an LLM runtime. The panel reveal, settle, clear, highlight and expiry path is the real one |
| API-L02c2 | AC-005 | Projects page board | Typed "docker", pressed New task, saved a description | ENV-2 | Pass | `desktop/API-L02c2-01-after-create.json.txt` | `query after create: ''`; the new Task "Docker logs fill the disk on long-running nodes" is first in To Do | — |
| API-L02d | AC-003 | Board + GraphQL (Representative 60) | Typed "restart" | ENV-2 | Pass | `desktop/API-L02d-01-exact-restart-board.json.txt`, `desktop/API-L02d-02-exact-restart-graphql.json.txt`, `desktop/API-L02d-03-exact-restart-board.png` | GraphQL order `t51:E t01:E t37:E t09:E t02:M t22:M t30:M`; the 4 exact matches are every Task containing "restart"; To Do lane `t51 t01 t37 t09 t22` | — |
| API-L02e | AC-008, QR-002, REQ-007 | Board + GraphQL + store file (Representative 60; "Delete me") | Old-topic paraphrase shown on the board; `updateProjectTask` t02 to a new topic; the board re-queried; typed the new-topic paraphrase; `deleteProjectTask` t05; `deleteProject` of an indexed 8-Task Project | ENV-2 | Pass | `desktop/API-L02e-01…API-L02e-07` | `old topic no longer shows edited Task: True 203` ms; new topic found, `edit->found (incl. typing) ms 3840`; t05 rows `[{"n":1}]` → `[{"n":0}]` right after the delete; Project rows `[{"n":8}]` → `[{"n":0}]`; then `"code":"PROJECT_NOT_FOUND"` | After the edit the status line showed "59 of 60 Tasks" for one poll (R-7, expected) |
| API-L02f | AC-009, REQ-008 | Desktop instance restart (Backlog 1000) | Rebuilt the 1,000-Task index; `pnpm --silent isolated-app restart iso-65187-14ae`; edited d007 through GraphQL before any search; then the first search for its new topic | ENV-2 | Pass | `desktop/API-L02f-03-rebuild-backlog1000.txt`, `desktop/API-L02f-04-isolated-app-restart.json.txt`, `desktop/API-L02f-05-restart-edit-then-first-search.txt` | `{"t":1.192,…,"state":"READY"…}` with the edited Task (`project_task_352382c4…` = d007) as MEANING | Re-indexing 1,000 Tasks takes ≈107 s, so READY after 1.2 s means unchanged Tasks were not re-embedded. The rebuild began at 144/1000: the rebuild started at 12:33 (`desktop/API-L02f-01-rebuild-before-restart.jsonl.txt`, 0 → 24 of 1000 in its first 10 s) wrote vectors before the instance was stopped abruptly with the previous working session, and they were kept. The first poll after a restart reports `DOWNLOADING 0 of 23888539` while the existing files are only verified (observation O-1) |
| API-L02g | AC-016, QR-005 | Settings → Server Settings → Advanced; files and rows | Entered `AUTOBYTEUS_EMBEDDING_MODEL` = `not-a-model` in the add row; then `granite-embedding-small-english-r2` (download failed, see API-L02h; Retry); then blank in the row | ENV-2 | Pass | `desktop/API-L02g-01…API-L02g-06` | UI text `Embedding model must be blank (default) or one of: mdbr-leaf-ir, granite-embedding-small-english-r2, embeddinggemma-2.`; after Granite is ready `[{"model_id":"granite-embedding-small-english-r2","n":61,"bytes":1536}]` and only its folder; after blank `[{"model_id":"mdbr-leaf-ir","n":61,"bytes":3072}]` | The setting is not listed in Advanced until it has a value; the operator types the key (observation O-2). Exact matches stayed shown throughout (`kinds":"EE"`) |
| API-L02h | AC-011 (board) | Projects page board | Made `embeddings/models` unwritable, set Granite, searched "docker"; created a Task; restored the folder; pressed "Try again" | ENV-2 | Pass | `desktop/API-L02h-02-board-unavailable.json.txt`, `desktop/API-L02h-03-board-unavailable-retry.png`, `desktop/API-L02h-04-create-while-unavailable.json.txt`, `desktop/API-L02h-06-after-retry-until-ready.json.txt` | `Meaning search is unavailable: EACCES: permission denied, mkdir '…/models/granite-embedding-small-english-r2'. Exact matches still work.` with the Retry button and both "Docker…" Tasks listed; after Retry `downloading the model (0 of 55 MB)` … `56 of 61 Tasks` then `null` | A real failure to obtain the model (disk permission). The network-failure variant over real DNS and its recovery is API-L01; durable coverage is API-D01 |
| API-L03b | QR-003, QR-004 (indexing), QR-005 | Embedded server | RSS sampled each second during API-L02b; `footprint -p` each second from 12:17; file sizes | ENV-2 | Pass | `desktop/API-L03b-02-embeddings-files.txt`, `desktop/API-L03b-03-rss-first-use.txt`, `measure/API-L03b-05-footprint-long-backlog-indexing.txt`, `measure/API-L03d-01-baseline-footprint-after-start.txt` | `peak during download+indexing of 1,000 Tasks: 799168 kB (780 MB) …; added 531 MB` (RSS); `peak footprint during worker restart + indexing 1,000 long Tasks: 562 MB`; baseline footprint `186 MB` | QR-003: 1,000 Tasks in ≈107 s; ≈6.5 min for the long backlog while an EmbeddingGemma analysis loaded the host (≤ 10 min either way). Download 23.9 MB ≤ 60 MB. Index 3.8 MB + 4.2 MB WAL ≤ 10 MB per 1,000 Tasks |
| API-L03c | QR-001, QR-004 (searching) | GraphQL + board + embedded server | `search-driver.mjs latency` (3 × 78 queries) at 1,000 Tasks: before the restart, after a rebuild, and in a fresh process; board: one input event with a full paraphrase, time until the target row shows; footprint during a burst, during listing-only load, and during user-paced search (1/s for 60 s) | ENV-2 | Pass | `measure/API-L03c-01-graphql-search-latency-1000.json.txt`, `measure/API-L03c-04-…run2.txt`, `measure/API-L03c-06-…after-restart.txt`, `measure/API-L03c-03-board-update-after-typing.json.txt`, `measure/API-L03c-05/07/08/09-*.txt` | `"p90":125`, `"p90":62`, `"p90":89` ms; board `msAfterTypingStopped` 327…446; user-paced `max 516 MB (+330 MB over baseline), median 326 MB (+140 MB)` | A back-to-back burst (≈14 searches/s) reaches +436 MB; the same count of plain `projectTasks` listings adds ≈100 MB by itself (C-09 cost, also the existing query's). Real use (one search per keystroke pause) stays within ≤ 350 MB |
| API-L03d | QR-004 (idle) | Embedded server | No searches or edits for 12 minutes after 12:07:37 | ENV-2 | Pass | `measure/API-L03d-01-baseline-footprint-after-start.txt`; footprint series was sampled to `/tmp/pts-api/footprint.csv` (removed at cleanup; the values are quoted in Look For) | footprint 280 MB before the idle stop → `162 MB` after it; baseline before any search 186 MB | Within +50 MB of the baseline |
| API-L04 | AC-001, AC-004 (C-08), QR-007 | Instance GraphQL (real app) + production runner (score level) | `search-driver.mjs quality` on Backlog 1000 and Backlog 1000 long (READY); `evidence/probes/API-PROBE-API-PROBE-score-analysis.mjs` for LEAF-IR, Granite (fixture 60 / generated 1,000 / real-text 1,000) and EmbeddingGemma 2 (fixture / real-text); board screenshots for "weather in Berlin tomorrow" | ENV-2, ENV-4 | **Fail** | `quality/API-L04-01-backlog1000-leaf-ir.json.txt`, `quality/API-L04-04-backlog1000long-leaf-ir.json.txt`, `quality/API-L04-03-score-analysis-mdbr-leaf-ir.json.txt`, `quality/API-L04-05-score-analysis-granite-embedding-small-english-r2.json.txt`, `quality/API-L04-05-score-analysis-embeddinggemma-2.json.txt`, `quality/API-L04-06-board-unrelated-*.json.txt`, `quality/API-L04-07-board-unrelated-*.png` | App: `"targetShownInFirst5Pct":87.3`, `"fixtureUnrelatedNoMatch":6`, `"fixtureUnrelated":12`; unrelated `xyz`, `asdkjh qwezx plmok`, `weather in Berlin tomorrow` → `20` matches each. Score level LEAF-IR real-text 1,000: `"shownInFirst5":0.905`, `"unrelatedFixture":{"noMatch":4,"of":12,"best":{"max":0.343,"median":0.273}}` vs floor 0.24. Granite real-text 1,000: `"noMatch":12,"of":12`, `"shownInFirst5":0.921`. Board: Backlog 1000 shows 16 Tasks for "weather in Berlin tomorrow" instead of the no-match state | See Findings. On the approved 60-Task fixture LEAF-IR passes (11/12, 96.8%) |
| API-L05 | AC-007 | Companion repo + desktop instance | Read `887e79d..344da76`; `importAgentPackage(LOCAL_PATH: /Users/normy/autobyteus_org/autobyteus-agents-project-task-semantic-search)`; `agentDefinitions` | ENV-2 | Pass | `desktop/API-L05-01-companion-definition.txt` | `"id": "project-task-manager", … "search_project_tasks"`; `definitions with search_project_tasks: 1 of 57` | Exposure only to selecting definitions is proven by API-R02/API-R05 (MCP session built from `["search_project_tasks"]`). A live LLM run of the Project Task Manager was not made (no provider needed for the contract; the tool transport is proven over MCP) |

## Findings

### F-001 — The default model shows meaning matches for unrelated queries on 1,000-Task backlogs (AC-004), and the target falls below 90% in the first five on the generated backlog (AC-001) — Fail

- Criteria: AC-004 (REQ-003: meaning matches "only when the best one is clearly relevant"; "the existing no-match state … for at least 90% of the defined set"); AC-001 / QR-007 at backlog scale; reviewer hold C-08 / RSK-004.
- Expected: on a realistic backlog, ≥ 90% of the defined unrelated set (the fixture's 12) shows the no-match state, and the intended Task is among the first 5 shown for paraphrases.
- Observed with LEAF-IR (default), 60 fixture targets + 940 distractors:

  | Backlog | Target in first 5 shown | Fixture unrelated with no match | Unrelated best score max / median | Shown count p90 / max |
  | --- | --- | --- | --- | --- |
  | Fixture 60 (approved test data) | 96.8% | 11/12 | 0.273 / 0.200 | 2 / 4 |
  | 1,000 generated (app, Backlog 1000) | 87.3% | **6/12** | 0.321 / 0.248 | 15 / 20 |
  | 1,000 with long-form targets (app) | 87.3% | **6/12** | — | 14 / 20 |
  | 1,000 real product-domain text (score level) | 90.5% | **4/12** | 0.343 / 0.273 | 9 / 20 |

  The same backlogs with Granite (floor 0.78): 93.7% / **12/12** (generated) and 92.1% / **12/12** (real text). EmbeddingGemma 2: fixture 95.2% / **12/12**, real text 1,000 92.1% / **12/12** (the generated backlog was not run for this model: hours on the busy host).
- Mechanism: the relevance rule (`selectRelevant`) applies an absolute `clearMatchFloor` (0.24 for LEAF-IR), calibrated on the 60-Task fixture. With 1,000 Tasks, the best score an unrelated query reaches by chance rises (unrelated median 0.200 → 0.248–0.273), so it passes the floor, and the near-best margin (0.045) then admits up to 20 neighbours. LEAF-IR's on-topic and unrelated best scores overlap at this scale: on-topic p05 0.356 vs unrelated max 0.343 (real text). The rule and the code behave as designed; the calibration does not hold at backlog sizes the requirements target (QR-001/QR-003 use 1,000 Tasks).
- Not a test-data artifact: real product-domain text (this repository's own finished tickets: requirements, design and investigation sections) is worse than the generated distractors, and the in-app GraphQL results match the score-level probe exactly.
- User-visible effect: in the real app, "weather in Berlin tomorrow" on the 1,000-Task board shows 16 Tasks instead of "No matching tasks" (`quality/API-L04-07-board-unrelated-b1000.png`). Even on the 61-Task Project it shows 2 (the fixture's known 1-of-12 miss).
- Preliminary classification: `Design Impact` (relevance calibration per catalog model, design § G2 and the catalog's LEAF-IR entry; the design's escalation trigger "measured … miss … on the built app"). A related requirement question is for the Solution Designer and possibly the user: at which backlog size AC-004 and AC-001 must hold. Options visible from the evidence, not decided here: a higher or size-aware LEAF-IR floor (on-topic p05 0.356 suggests around 0.35 with some recall cost), a relative rule against the collection's score distribution, or the default model (DEC-002 is the user's decision).
- Recommended owner: Solution Designer, after failure-origin review by the code reviewer.

### Observations (non-blocking)

- O-1: For about 1 s after each restart, the first search reports `PREPARING/DOWNLOADING 0 of <total>` while the existing model files are only verified. The board would briefly say "downloading the model (0 of 24 MB)". Cosmetic.
- O-2: `AUTOBYTEUS_EMBEDDING_MODEL` is not listed in Settings → Server Settings → Advanced until it has a value; an operator must know the key and type it into the add row. The description with the catalog appears once it is set (FU-1's model chooser would address this).
- O-3: The Docker image keeps 136 MB of unpruned `onnxruntime-web/dist` (FU-5, known).
- O-4: During indexing, meaning results come from the indexed part only and can be many (21 for "docker" at 144/1000 indexed); they settle when ready.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-L02b, API-L03c (board), API-R06 (fixture), API-L01 (Docker fixture), API-L04 | **Not Proven** at 1,000-Task scale (87.3% generated; 90.5% real text); proven on the approved 60-Task fixture (96.8%) | — |
| AC-002 | Yes | API-R06, API-L01 | Proven (fixture: LEAF-IR top5 98.4% / top10 98.4%; Granite and EmbeddingGemma 100%) | — |
| AC-003 | Yes | API-R02, API-R05, API-L02d | Proven | — |
| AC-004 | Yes | API-R06 (fixture 11/12), API-L04 | **Not Proven**: fails on 1,000-Task backlogs (6/12 generated, 4/12 real text) | — |
| AC-005 | Yes | API-R07, API-L02c, API-L02c2, API-L02b (lanes) | Proven (locate while preparing, Refresh, Cancelled toggle, open/return, create clears search, compact board, lane counts) | — |
| AC-006 | Yes | API-R02, API-R05, API-D01 | Proven (native and MCP; errors; compact result; unavailable note) | — |
| AC-007 | Yes | API-L05, API-R02 | Proven (definition selects the tool in the real app; only selecting definitions get it) | — |
| AC-008 | Yes | API-R02, API-R05, API-L02e | Proven (QR-002: 3.8 s including typing; deletes immediate) | — |
| AC-009 | Yes | API-R02, API-L01, API-L02f | Proven | — |
| AC-010 | Yes | API-L02b, API-R07 | Proven | — |
| AC-011 | Yes | API-D01, API-L01 (real DNS failure + Retry recovery), API-L02h (board, Retry), API-R07 | Proven | — |
| AC-012 | Yes | API-D01, API-L03a, API-L01 | Proven | — |
| AC-013 | Yes | API-R02 | Proven (test-only second collection) | — |
| AC-014 | Yes | API-L02a, API-L01, API-R08 | Proven for macOS arm64 desktop and Docker linux/arm64; other desktop targets and Docker amd64 not built here (Not Tested below) | — |
| AC-015 | Yes | API-L03b, API-L03c, API-L03d | Proven: QR-001 p90 62–125 ms, board 327–446 ms; QR-003 ≈107 s / 1,000 Tasks; QR-004 indexing +376 MB footprint (+531 MB RSS) ≤ 600, user-paced searching ≤ +330 MB, idle back to baseline; QR-005 23.9 MB model, ≈8 MB index incl. WAL, only the active model kept | — |
| AC-016 | Yes | API-R02, API-R05, API-L01, API-L02g | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 50% | All criteria except AC-001/AC-004 at scale are proven directly (API-L01…L05) | AC-004 fails and AC-001 is below target on 1,000-Task backlogs (API-L04) | A revised calibration, then rerun API-L04 |
| Changed-boundary execution directness | 80% | 95% | Real packaged app, real models, real download and failure, real container | Windows/Linux packaging not executed | CI release builds |
| Cross-boundary integration realism and mock gap | 75% | 95% | Only API-D01 simulates `fetch`; every live case uses the real worker, store and transports | — | — |
| Environment, configuration, identity, and fixture fidelity | 80% | 90% | Packaged build, Docker image from this worktree, 1,000-Task backlogs incl. real product-domain text | Statuses applied by file edit; shared, swapping host (timings pessimistic) | A quiet host for timings |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | Offline + Retry (real DNS), disk failure + Retry, restart, abrupt stop, model switch, deletes | — | — |
| User-surface, browser, and desktop-shell confidence | 80% | 95% | Board and right panel in the packaged app; Settings UI | Locate entered through its store action (no task-agent run) | A run with a live task agent |
| Durable regression coverage quality and relevance | 90% | 90% | Feature unit/E2E/web specs; new API-D01; gated real-model suite | No durable check of relevance at backlog scale (the gated suite uses 60 Tasks) | A gated large-backlog quality case once the calibration is revised |

- Overall post-repository confidence: 81%
- Overall final confidence: 87% (simple average); it does not hide the failing criterion.
- Calculation method: simple average of the seven categories.
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` — AC-001 and AC-004 at backlog scale (F-001).
- Any final applicable category below `90%`: `Yes` — requirement and acceptance-criteria proof (50%).
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-001; untested Windows/Linux/macOS x64 packaging and Docker amd64.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` (packaged worktree build, isolated instance), `Lifecycle`/`Worker` measurement in that instance, and `Other` (test-owned Docker container from an image built from this worktree).
- Confidence gap it addresses, and the expected gain: real model quality on a realistic backlog (C-08), QR measurements on the built app, first use, locate while preparing, restart, real network failure, model switch and packaging. It closed every gap except F-001, which it found.
- Browser validation needed: the board ran inside the desktop instance (same renderer); no separate browser probe.

## Desktop Application Validation

- Approach executed: `isolated-app start --build`, then `--data-root` restarts and `isolated-app restart`, driven through CDP (`evidence/probes/API-PROBE-API-PROBE-cdp.mjs`, `evidence/probes/API-PROBE-API-PROBE-ui.mjs`).
- Cases proving web-equivalent behavior: API-L02b…h, API-L03c (board). Shell/lifecycle and packaging: API-L02a, API-L02f, API-L03b, API-L03d.
- Effect on any already-running desktop application: `None` (the user's app, data and Docker nodes were not touched).
- Behavior not directly proven: Windows/Linux/macOS x64 packaging (`prepare-server.mjs` on Windows).

## Persisted-Data Transition Checks

- Approved persisted-data decision: existing data `Not Affected`; `embeddings.sqlite` `Discard or Rebuild`.
- Representative existing data used: 2,060 Tasks created before any search; restarts.
- Approved transition followed without an unnecessary migration: `Yes` — the store is created only by the first search (API-L03a, API-D01); rows of other models are removed when a switch completes (API-L01, API-L02g); vectors persist across restarts and an abrupt stop (API-L02f). The unreadable/other-shape rename-aside is covered by unit tests (API-R02).
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none material.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (no client predicate fallback; the board shows no matches until the server answers)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/project-task-search-model-unavailable.e2e.test.ts` | Added | API-D01, API-R05 | — |

- Added or updated paths attached for proportional test-code review: `No` (this round is `Fail`; the path is listed for the failure-origin reviewer and for a later test review)
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Model host in API-D01 | `globalThis.fetch` wrapper: huggingface.co rejects like offline, then answers 404 | Durable, offline-safe regression test | None for the live path: API-L01 used real DNS/connection failure and a real download |
| Task status changes | Test-owned `task.json` edits while stopped | No GraphQL status mutation; agents change status | Status values only; no assignment history |
| "Show Task in Projects" trigger | `taskLocator.locate(…)` from CDP | Needs a task-agent run (LLM runtime) | The Workspaces-tree button itself was not clicked |
| Model failure on the board | `embeddings/models` made unwritable | The desktop instance's network cannot be cut safely | The network variant is proven in API-L01 |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probes `evidence/probes/*.mjs` | Yes | Kept as evidence | Kept |
| Docker container `pts-api-docker` | Yes | `docker rm -f -v pts-api-docker` | Removed |
| Docker image `ab-pts-validation:722b9b3918` (9.43 GB) | Yes | `docker rmi` | Removed |
| Isolated instances `iso-61890-f6ae`, `iso-62519-5afd`, `iso-65187-14ae` and data root `…/autobyteus-isolated-root-6x1LUC` | Yes | `isolated-app stop`; remove the data root (owned after `--keep`) | Stopped (`isolated-app list` shows none of these); data root deleted |
| `/tmp/pts-api` (models cache ≈ 450 MB, backlog JSON, samplers' CSVs, home for E2E) | Yes | Removed after the evidence was copied | Removed (the backlog is reproducible from `API-PROBE-generate-backlog.mjs`, seed 20261018) |
| Packaged build `autobyteus-web/electron-dist` | Yes (build output, untracked) | Left in place (untracked build output, reused by later rounds) | Kept |
| Other agents' isolated-app records (`iso-54255-*`) | No | Not touched | — |

## Preliminary Classification (On `Fail`)

- `Design Impact` for F-001 (relevance calibration of the default catalog model at backlog scale), with a requirement question on the backlog size AC-001/AC-004 must hold for. Recommended owner: Solution Designer, after the code reviewer's failure-origin review.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check (IDs): AC-001 and AC-004 at 1,000-Task scale (F-001). No user-only parts.
- Preliminary classification and recommended owner: `Design Impact` → Solution Designer (via failure-origin review).
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (rule: "When API/E2E validation fails and the complete failure package requires focused failure-origin review by the code reviewer")
- Notes: every other criterion is proven, including QR-001…QR-005 on the built app, real offline/Retry, restart, model switch, packaging on macOS arm64 and Docker arm64.
