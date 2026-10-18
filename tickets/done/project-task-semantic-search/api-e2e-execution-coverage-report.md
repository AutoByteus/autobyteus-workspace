# API/E2E Execution Coverage Report

## Round

- Coverage investigation (the plan; it lists the upstream documents): `tickets/in-progress/project-task-semantic-search/api-e2e-coverage-investigation.md` (round 3 plan: § Round 3 Rerun Plan)
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-003`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 3. The code reviewer passed IR-004 (CRR-006): delivery DR-001 merged the latest `origin/personal` (`2b04a9971d`) into the branch as merge commit `600d079b9c`. Requirements and design are unchanged (SR-007, ARCH-REV-003).
- Prior rounds reviewed: round 1 (`API-REV-001`, Fail F-001, `722b9b3918`); round 2 (`API-REV-002`, Pass, `9f0df7eab3`).
- Deviations from the investigation's plan, and why:
  - API-R05's first folder run hit `projects-startup-migration.e2e.test.ts` (6 failures) while my own packaged desktop build was rebuilding `autobyteus-server-ts/dist`, which that suite starts. This broke TESTING.md's "serialize builds within one worktree"; it was a run-order mistake, not a product failure. The file was rerun alone once the build finished: 6/6 pass.
  - API-R04's saved excerpt missed the suite summary, and the full log was already removed. The summary lines are recorded as copied from the console of that run, and the file that failed in round 1 was rerun and saved directly.
  - Seeded Tasks keep the To Do status (as in round 2). The right-panel locate case reveals a To Do Task hidden by the search instead of a Cancelled one; the Cancelled reveal is round-1 evidence (web code for the board is unchanged).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-semantic-search/tickets/in-progress/project-task-semantic-search/evidence/` (the handoff message gives the commit)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`. The durable test code is `project-task-search-model-unavailable.e2e.test.ts`. It is unchanged since round 2, when it was already offered for review; the merge did not touch it.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `600d079b9c` (HEAD `a46cb5f306` adds only `tickets/`) | macOS (Darwin 25.5) arm64, Apple M1 Max, 10 cores, 64 GB | Node 22.23.1, pnpm 10.28.2; suites from source | Shared host (load average 90–125 during round 3). E2E with `env -i PATH HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR` (TESTING.md, changed by the merge) |
| ENV-2c | `600d079b9c` | same host | Packaged `AutoByteus_enterprise_macos-arm64-1.5.6-beta.6` built by `pnpm --silent isolated-app start --build`; instance `iso-64674-76e2` (restarted once); Granite default | Own data root (removed). Seeded through GraphQL: Backlog 1000 (generated), Backlog 1000 real text (sha256 `42ecbb90f855e02e`, includes the merge's 10 new tickets), Representative 60 |
| ENV-3b | `600d079b9c` | Docker Desktop linux/arm64 | Image `ab-pts-validation:600d079b9c` from `autobyteus-server-ts/docker/Dockerfile.monorepo`; Node 22.23.3 | Test-owned container `pts-api-docker3` on `127.0.0.1:65082`, no volumes |

Earlier environments (round 1: ENV-2 LEAF-IR app, ENV-3 Docker `722b9b3918`, ENV-4 score probe; round 2: ENV-2b `9f0df7eab3` app) are recorded in `api-e2e-revision-record.md` and their evidence files remain.

## Cases

Evidence paths are relative to the evidence folder. Round-3 files carry `r3` or `round3` in their names.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | all server | Production types | Reused: IMP-08 (`pnpm -C autobyteus-server-ts typecheck` on `600d079b9c`) | — | Pass | `implementation/IMP-08-typecheck-merge.log` | `exit=0` | Ran on the validated commit |
| API-R02, API-R03 | AC-003, AC-006, AC-008, AC-009, AC-011, AC-013, AC-016; seven-tool set | Server unit | Reused: IMP-09 (`pnpm -C autobyteus-server-ts test:unit` on `600d079b9c`) | — | Pass | `implementation/IMP-09-server-unit-merge.log` | `Test Files  737 passed \| 4 skipped (741)` | Includes `project-task-tools.test.ts` (exactly seven tools; `create_or_update_project` unknown), embeddings and search tests |
| API-R04 | regression | Server integration | `pnpm -C autobyteus-server-ts test:integration:prepare && pnpm -C autobyteus-server-ts test:integration`; then `vitest run tests/integration/agent/agent-status-websocket.integration.test.ts` | ENV-1 | Pass | `repository/API-R04-round3-server-integration.log` | `Test Files  77 passed \| 19 skipped (96)`, `exit=0` (copied from the console, see the file's note); direct rerun `✓ coalesces a representative fine-grained canonical stream…`, `Tests  8 passed (8)` | The two cadence cases that failed in rounds 1–2 (out of scope then) pass on the merged base |
| API-D01 | AC-011, AC-012, QR-006, REQ-010 | Real GraphQL + MCP with the real `EmbeddingIndex` | `project-task-search-model-unavailable.e2e.test.ts`, run in API-R05 | ENV-1 | Pass | `repository/API-R05-round3-e2e-projects.log` | `✓ tests/e2e/projects/project-task-search-model-unavailable.e2e.test.ts (2 tests)` | — |
| API-R05 | AC-003, AC-006 (seven-tool MCP list), AC-008, AC-016 (setting) | Real HTTP/GraphQL/MCP | `env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects --no-watch`; then `…/projects-startup-migration.e2e.test.ts` alone | ENV-1 | Pass | `repository/API-R05-round3-e2e-projects.log` | `✓ tests/e2e/projects/project-task-boundaries.e2e.test.ts (13 tests)` incl. `✓ API-MCP: selected default host executes equivalent compact mutations…` (asserts the MCP `tools/list`); both search files ✓; rerun `✓ tests/e2e/projects/projects-startup-migration.e2e.test.ts (6 tests)` | The first folder run's 6 startup-migration failures came from my concurrent build rewriting `dist` (see Round) |
| API-R06 | AC-001, AC-002, AC-004 at 60 and 1,000 Tasks (DEC-011), QR-007 | Real Granite on the production WASM worker | `RUN_EMBEDDING_MODEL_E2E=1 TEST_EMBEDDING_SCALE=1 TEST_EMBEDDING_MODEL_CACHE=<temp> pnpm -C autobyteus-server-ts exec vitest run tests/integration/embeddings/embedding-model-quality.integration.test.ts --no-watch` | ENV-1 | Pass | `repository/API-R06-round3-real-model-scale.log` | `"generated":{"tasks":1000,…"shownInFirst5":0.937,"unrelatedWithoutMatch":0.958}`, `"repository":{"tasks":1000,…"shownInFirst5":0.921,"unrelatedWithoutMatch":0.958}`; `✓ granite-embedding-small-english-r2 meets QR-007, AC-001 and AC-004` | Identical to round 2, although the real-text backlog changed with the merge's 10 new tickets (C-10) |
| API-R07 | AC-001, AC-003…AC-005, AC-010, AC-011 (web) | Web unit/component; guards | `pnpm -C autobyteus-web test:nuxt --run`; `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | ENV-1 | Pass | `repository/API-R07-round3-web-suite-and-guards.log` | `Test Files  636 passed \| 2 skipped (638)`, `Tests  4519 passed`; three `exit=0` | — |
| API-R08 | AC-014 (licences) | Repository checks | `python3 scripts/check_licensing.py`; `python3 scripts/check_repository_artifact_hygiene.py`; `python3 -m pytest -q scripts/tests/test_check_licensing.py` | ENV-1 | Pass | `repository/API-R08-round3-licensing-hygiene.log` | `Licensing is consistent.`, `Repository artifact hygiene check passed.`, `12 passed` | — |
| API-T01 (new) | REQ-007 (delete), base adoption revert | Merged delete paths with task-agent runs (scripted AGY CLI) | Reused: IMP-12 (`env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=…/agy-failure-cli.mjs vitest run tests/e2e/projects/{hand-started-run-adoption,project-change-feed}.e2e.test.ts` on `600d079b9c`) | — | Pass | `implementation/IMP-12-e2e-adoption-feed-merge.log` | `Tests  11 passed (11)` | Proves the base's adoption revert still runs on Task and Project delete alongside the search cleanup; the app-level side is API-L02e |
| API-L01 | AC-014, QR-008, AC-011, AC-009 | Test-owned Docker container | `docker buildx build --builder desktop-linux --load --platform linux/arm64 -f autobyteus-server-ts/docker/Dockerfile.monorepo -t ab-pts-validation:600d079b9c .`; `docker run -d -p 127.0.0.1:65082:8000`; `/etc/hosts` blocks huggingface.co, first search; restore + `retryEmbeddingModel`; quality on 60 Tasks; `docker restart` | ENV-3b | Pass | `docker/API-L01-r3-01-smoke.txt` | `"reason":"Could not reach huggingface.co to download the model: fetch failed"` with an EXACT match; after Retry `DOWNLOADING … total 54633923` → READY at `"t":18.847`; quality `"targetShownInFirst5Pct":96.8`, `"fixtureUnrelatedNoMatch":23`; after restart `"phase":"LOADING"` → READY at `"t":2.198`; models `granite-embedding-small-english-r2` | Container and image removed. The image keeps 136 MB of unpruned `onnxruntime-web` (FU-5) |
| API-L02a | AC-014, QR-008 | Packaged macOS arm64 build | `pnpm --silent isolated-app start --build` | ENV-2c | Pass | `desktop/API-L02a-r3-01-build-and-start.txt` | `Removed 127 MB of onnxruntime-web browser builds`, `Embedding runtime validation passed`; `DEFAULT_EMBEDDING_MODEL_ID = GRANITE_SMALL_ENGLISH_R2.id`; packaged contract `PROJECT_TASK_TOOL_NAMES = new Set(["list_projects", "list_project_tasks", "search_project_tasks", "create_project", "update_project", "create_task", "update_task"])` | Seven tools in the packaged server |
| API-L03a | AC-012, QR-006 | Instance GraphQL + data root | Seed through `API-PROBE-search-driver.mjs seed` | ENV-2c | Pass | `desktop/API-L03a-r3-01-seed.txt` | `"created":1000` ×2, `"created":60`; the listing has no `embeddings` | — |
| API-L02b | AC-010, AC-001, QR-003 | Projects page board, Backlog 1000, first search ever | Typed the t01 paraphrase; waited without retyping | ENV-2c | Pass | `desktop/API-L02b-r3-01-state-1s.txt`, `desktop/API-L02b-r3-03-wait-until-ready.txt`, screenshots `API-L02b-r3-02-preparing.png`, `API-L02b-r3-04-ready.png` | `"status": "Preparing meaning search: downloading the model (0 of 55 MB)…"`; progress through `"Preparing meaning search… 992 of 1000 Tasks"`; final To Do lane `Sidebar collapse state is lost after restart` | Typing to ready took 291 s (load average ≈ 110) |
| API-L03b | QR-003, QR-004 (indexing), QR-005 | Embedded server | `footprint -p` each second during API-L02b; file sizes | ENV-2c | Pass | `measure/API-L03b-r3-01-first-use.txt` | `typing -> board ready … 291 s`; `peak footprint during first use: 429 MB … (+240 MB over 189 MB)` | QR-003 ≤ 20 min; QR-004 ≤ +800 MB; QR-005 54.6 MB model |
| API-L02c | AC-005, CR-001 | Right-panel board, real-text 1,000-Task Project (its first search) | Typed "docker"; Refresh while preparing; "Show Task in Projects" (`taskLocator.locate`) for a Task the search hides | ENV-2c | Pass | `desktop/API-L02c-r3-01-locate-while-preparing.txt`, `desktop/API-L02c-r3-02-located.png` | `"status": "Preparing meaning search… 8 of 1000 Tasks"` with `"query": "docker"` after Refresh; `"locatedAfterMs": 115`, `"query": ""`, `"located": true` | Round 1 adds the Cancelled-lane reveal, Cancelled toggle and open/return (`desktop/API-L02c-01…03`); board code unchanged |
| API-L04 | AC-001, AC-004 at 60 and 1,000 Tasks (DEC-011, C-12) | App GraphQL (READY, Granite) + board | `API-PROBE-search-driver.mjs quality` on Representative 60, Backlog 1000, Backlog 1000 real text; board "weather in Berlin tomorrow" on both 1,000-Task Projects | ENV-2c | Pass | `quality/API-L04-r3-quality-rep60.json.txt`, `…-b1000.json.txt`, `…-brepo.json.txt`, `quality/API-L04-r3-board-unrelated-b1000.txt`/`.png`, `…-brepo.txt`/`.png` | `"targetShownInFirst5Pct":96.8` / `93.7` / `92.1`; `"fixtureUnrelatedNoMatch":23,"fixtureUnrelated":24` on all three; board `"noMatch": true` | Same misses as round 2 (t21, t48, t54, t58; t15 on real text) |
| API-L02c2, API-L02d | AC-005, AC-003 | Projects page board (Representative 60) | Typed "restart"; then New task, save | ENV-2c | Pass | `desktop/API-L02d-r3-01-exact-restart.txt`, `desktop/API-L02c2-r3-01-after-create.txt` | GraphQL order `t01:E t51:E t37:E t09:E t22:M t02:M t24:M t43:M t50:M` (the four Tasks containing "restart" first); after create `"query": ""` and the new Task first in To Do | — |
| API-L02e | AC-008, QR-002, REQ-007 | GraphQL + store file in the merged delete paths | `updateProjectTask` t02 → poll the new-topic paraphrase; `deleteProjectTask` t05; `deleteProject` of an indexed 8-Task Project; rows in `embeddings.sqlite`; server log | ENV-2c | Pass | `desktop/API-L02e-r3-01-edit-delete.txt` | `QR-002 edit -> found by meaning (ms): 185`; t05 rows `[{"n":1}]` → `[{"n":0}]`; Project rows `[{"n":8}]` → `[{"n":0}]`; then `"code":"PROJECT_NOT_FOUND"`; `(none above = no failure logged)` | Search cleanup and the base's adoption revert run together without error; adoption itself is covered by API-T01 |
| API-L03c | QR-001, QR-004 (searching) | GraphQL + board + embedded server | `API-PROBE-search-driver.mjs latency` 3 × 90 queries, then one search per second for 60 s; board: one input event with a full paraphrase | ENV-2c | Pass | `measure/API-L03c-r3-01-latency-and-footprint.txt`, `measure/API-L03c-r3-02-board-update-after-typing.txt` | `"p50":41,"p90":45,"p99":54,"max":89`; `footprint max 496 MB (+307 MB)`; `msAfterTypingStopped` 304…336 | QR-001 ≤ 150 ms / 0.5 s; QR-004 ≤ +450 MB |
| API-L05 | AC-007 | Companion repo + merged app | `importAgentPackage(LOCAL_PATH …autobyteus-agents-project-task-semantic-search)` (`344da76`); `agentDefinitions` | ENV-2c | Pass | `desktop/API-L05-r3-01-companion-definition.txt` | `"id": "project-task-manager", … "search_project_tasks"`; `definitions with search_project_tasks: 1 of 57`; `definitions with create_or_update_project: 0` | The companion's tool list already matches the base's tool removal |
| API-L02g, API-L02h | AC-016, AC-011 (board), QR-005 | Settings → Server Settings → Advanced; board; files and rows | `not-a-model`; `embeddings/models` made unwritable, `mdbr-leaf-ir` set, board searched; Task created; folder restored; Retry on the board; then blank | ENV-2c | Pass | `desktop/API-L02g-r3-01-switch-unavailable-retry.txt`, `desktop/API-L02h-r3-02-board-unavailable-retry.png` | `Embedding model must be blank (default) or one of: granite-embedding-small-english-r2, mdbr-leaf-ir, embeddinggemma-2.`; `Meaning search is unavailable: EACCES: permission denied, mkdir '…/mdbr-leaf-ir'. Exact matches still work.` with `"retry": true`; `createProjectTask … "TODO"`; after Retry `downloading the model (9 of 24 MB)` → `… 0 of 61 Tasks` → `null` in 5.65 s; `[{"model_id":"mdbr-leaf-ir","n":61,"bytes":3072}]`, then after blank `[{"model_id":"granite-embedding-small-english-r2","n":61,"bytes":1536}]` | — |
| API-L02f | AC-009, REQ-008, O-1 | Desktop instance restart | Rebuilt the 1,000-Task Granite index (219.6 s); `pnpm --silent isolated-app restart iso-64674-76e2`; edited d007; first search | ENV-2c | Pass | `desktop/API-L02f-r3-01-restart-o1.txt` | `"phase":"LOADING"` at 0.085 s, then `"state":"READY"` at `"t":1.244` with d007 as MEANING | — |
| API-L03d | QR-004 (idle) | Embedded server | No instance interaction for 12 minutes after the restart and first search | ENV-2c | Pass | `measure/API-L03d-r3-01-idle-footprint.txt` | `idle + 9 min: footprint 297 MB`; `idle +11 min: footprint 173 MB (-16 MB vs 189 MB baseline)` | — |

## Findings

- No failure in round 3.
- C-12: the AC-001 margin on real text is unchanged at 92.1% against 90%, now measured on a changed real-text backlog (the merge's 10 new tickets). This makes the margin more credible, but it is still thin.
- C-14 (`native-compaction-terminal-drain.test.ts`, reported by the implementation): not observed. The test was not in my runs; API-R03 reused IMP-09, which passed.
- Observations:
  - O-2: the setting shows in Advanced only once it has a value.
  - O-3 / FU-5: the Docker image keeps the unpruned `onnxruntime-web`.
  - O-4: during indexing, meaning results come only from the part already indexed.
  - All three are non-blocking.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-L04, API-R06, API-L02b, API-L03c | Proven at 60 and 1,000 Tasks (96.8% / 93.7% / 92.1%) | — |
| AC-002 | Yes | API-R06 | Proven (top 5: 100% / 95.2% / 95.2%; top 10 ≥ 95%) | — |
| AC-003 | Yes | API-R02/R03 (IMP-09), API-R05, API-L02d | Proven | — |
| AC-004 | Yes | API-L04, API-R06 | Proven (23/24 = 95.8% on all three backlogs; board no-match state) | — |
| AC-005 | Yes | API-R07, API-L02c, API-L02c2 (+ round-1 API-L02c Cancelled/open-return) | Proven | — |
| AC-006 | Yes | API-R02/R03 (IMP-09, seven tools), API-R05 (MCP `tools/list`), API-D01, API-L02a (packaged tool set) | Proven | — |
| AC-007 | Yes | API-L05 | Proven | — |
| AC-008 | Yes | API-R05, API-L02e, API-T01 | Proven (QR-002: 185 ms) | — |
| AC-009 | Yes | API-L02f, API-L01 | Proven | — |
| AC-010 | Yes | API-L02b | Proven | — |
| AC-011 | Yes | API-D01, API-L01, API-L02g/h | Proven | — |
| AC-012 | Yes | API-D01, API-L03a | Proven | — |
| AC-013 | Yes | API-R02/R03 (IMP-09) | Proven | — |
| AC-014 | Yes | API-L02a, API-L01, API-R08 | Proven for macOS arm64 desktop and Docker linux/arm64; other targets are built by the release workflow | — |
| AC-015 | Yes | API-L03b, API-L03c, API-L03d | Proven: QR-001 p90 45 ms, board 304–336 ms; QR-003 291 s per 1,000 Tasks; QR-004 +240 MB indexing, +307 MB searching, below baseline when idle; QR-005 54.6 MB model | — |
| AC-016 | Yes | API-R05, API-L02g | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 95% | Every AC proven on the merged state | C-12 thin margin | Real user backlogs over time |
| Changed-boundary execution directness | 90% | 95% | Merged tool surface (unit, MCP E2E, packaged contract), merged delete paths (app + IMP-12), packaged app, Docker image | Windows/Linux packaging not executed | CI release builds |
| Cross-boundary integration realism and mock gap | 90% | 95% | Real worker, store, transports; scripted runtime only for adoption (IMP-12) | — | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | Fresh image and build from `600d079b9c`; real-text backlog includes the merge's tickets | Shared, loaded host (timings pessimistic) | A quiet host for timings |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | Offline + Retry (Docker), disk failure + Retry (board), restart, idle, deletes | — | — |
| User-surface, browser, and desktop-shell confidence | 90% | 95% | Board, right panel, Settings in the packaged merged app | Locate entered through its store action | A run with a live task agent |
| Durable regression coverage quality and relevance | 95% | 95% | Unit, E2E and web suites green; API-D01; gated scale assertions | C-10 drift of the real-text set | Freeze the real-text selection (follow-up) |

- Overall post-repository confidence: 91%
- Overall final confidence: 95% (simple average of the seven categories)
- Calculation method: simple average.
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: C-12; untested Windows, Linux and macOS x64 packaging, and Docker amd64; C-10; RSK-002.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` (a packaged build of `600d079b9c`) plus `Other` (Docker image of `600d079b9c`).
- Confidence gap it addresses: a shared-foundation change (the contract packages) requires every case to be rerun. The merge also touched the ticket's tool surface, the composition and both delete paths, and changed the real-text backlog.
- Browser validation needed: the board ran inside the desktop instance.

## Desktop Application Validation

- Approach executed: `isolated-app start --build`, then `restart`, driven through CDP (`probes/API-PROBE-cdp.mjs`, `API-PROBE-ui.mjs`).
- Web-equivalent behavior: API-L02b, API-L02c, API-L02c2, API-L02d, API-L04 (board), API-L03c (board), API-L02g/h (Settings, board).
- Shell, lifecycle and packaging behavior: API-L02a, API-L02f, API-L03b, API-L03d.
- Effect on any already-running desktop application: `None`
- Behavior not directly proven: Windows, Linux and macOS x64 packaging.

## Persisted-Data Transition Checks

- Approved decision: existing data `Not Affected`; `embeddings.sqlite` `Discard or Rebuild`.
- Approved transition followed without an unnecessary migration: `Yes`.
  - No store before the first search (API-L03a).
  - Vectors survive a restart (API-L02f).
  - A switch keeps only the active model's rows and files (API-L02g).
  - Deletes remove rows (API-L02e).
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none material.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (the merge removed `create_or_update_project` cleanly; it is unknown to the contract, the tools and the companion)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed by API/E2E this round: `No`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/project-task-search-model-unavailable.e2e.test.ts` | Unchanged since round 2 (added by API/E2E in round 1; one line changed by IR-003) | API-D01, API-R05 | — |

- Added or updated paths attached for proportional test-code review: `Yes` (the same file, for the round-2 test review if it is still open)
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Model host in API-D01 | `globalThis.fetch` wrapper | Durable, offline-safe test | None for the live path (API-L01 uses a real DNS failure) |
| "Show Task in Projects" trigger | `taskLocator.locate(…)` from CDP | Needs a task-agent run (LLM runtime) | The Workspaces-tree button itself was not clicked |
| Model failure on the board | `embeddings/models` made unwritable | The desktop instance's network cannot be cut safely | The network variant is in API-L01 |
| Task agents for the adoption revert (IMP-12, reused) | Scripted AGY CLI (`agy-failure-cli.mjs`) | No provider calls needed | Real provider runtimes not involved |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probes `evidence/probes/API-PROBE-*.mjs` | Yes | Kept as evidence | Kept |
| Docker container `pts-api-docker3`, image `ab-pts-validation:600d079b9c` | Yes | `docker rm -f -v`, `docker rmi` | Removed (`Deleted: sha256:9f2086c7…`); `docker ps -a` shows none |
| Isolated instance `iso-64674-76e2` and its data root | Yes | `pnpm --silent isolated-app stop iso-64674-76e2` | `wasRunning True dataRootRemoved True`, ports released; `isolated-app list` shows only other people's records |
| `/tmp/pts-api3` (models cache, backlogs, samplers, logs) | Yes | `rm -rf` | Removed |
| Temp `HOME` folders for the E2E runs | Yes | `rm -rf` after each run | Removed |
| `autobyteus-web/electron-dist` (packaged build output) | Yes (untracked build output) | Left in place | Kept |

## Preliminary Classification (On `Fail`)

N/A — `Pass`.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): `None`. AC-014 is proven for macOS arm64 and Docker linux/arm64; the other targets are built by the release workflow.
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (rule: "When API/E2E validation passes, the carried classification is task_size=Large or architectural_risk=High, and the cumulative evidence package requires proportional test-code review.")
- Notes: the merged state passes every case. Round 1's F-001 stays resolved. The round-1 out-of-scope integration failures now pass.
