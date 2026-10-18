# API/E2E Execution Coverage Report

## Round

- Coverage investigation (the plan; it lists the upstream documents): `tickets/in-progress/project-task-semantic-search/api-e2e-coverage-investigation.md` (round 2 plan: § Round 2 Rerun Plan)
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2. The code reviewer passed IR-003 (CRR-004): FO-001 → SR-007 makes Granite Small English R2 the default, adds DEC-011, re-bases QR-003/QR-004 and applies O-1.
- Prior round reviewed: round 1 (`API-REV-001`, Fail F-001, validated `722b9b3918`)
- Deviations from the investigation's plan, and why:
  - In round 2 the seeded Tasks keep their created status (To Do). The status-file step of round 1 was not repeated: the round-2 cases do not depend on lanes, and the lane behavior is still valid from round 1.
  - The in-app real-text backlog uses `API-PROBE-add-repo-backlog.mjs`, which has the same selection as the score probe and the new test helper. Its source, `tickets/done/*`, changes as tickets close (C-10); the hash of the 940 texts used was `e02495c6df5ad586`.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-semantic-search/tickets/in-progress/project-task-semantic-search/evidence/` (the handoff message gives the commit)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`. The test review covers `project-task-search-model-unavailable.e2e.test.ts`: added by API/E2E in round 1, with one line changed by the implementation in IR-003.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | round 2: `9f0df7eab3` (HEAD `2253eec182` adds only `tickets/`); round 1: `722b9b3918` | macOS (Darwin 25.5) arm64, Apple M1 Max, 10 cores, 64 GB | Node 22.23.1, pnpm 10.28.2; suites from source | Shared host. Round 1: load average 120–220, 9.7 GB swap. Round 2: load average 12–50. E2E run with `env -i PATH HOME=<temp> TMPDIR` |
| ENV-2 | round 1 `722b9b3918` | same host | Packaged `AutoByteus_enterprise_macos-arm64-1.5.6-beta.1`; isolated instances `iso-61890-f6ae` → `iso-62519-5afd` → `iso-65187-14ae`; LEAF-IR default | Own data root; window 1200×768; locale en |
| ENV-2b | round 2 `9f0df7eab3` | same host | Packaged build of `9f0df7eab3` (`pnpm --silent isolated-app start --build`); instance `iso-60493-231f`; **Granite default** | Own data root (removed); seeded through GraphQL: Backlog 1000 (generated), Backlog 1000 real text, Representative 60 |
| ENV-3 | round 1 `722b9b3918` | Docker Desktop linux/arm64 | Image `ab-pts-validation:722b9b3918` (Node 22.23.3) built from `autobyteus-server-ts/docker/Dockerfile.monorepo` | Test-owned container on 127.0.0.1, no volumes |
| ENV-4 | `722b9b3918` (runner and relevance rule unchanged in `9f0df7eab3`) | same host | Production runner, catalog and relevance from `autobyteus-server-ts/dist` | Score-level probe (`API-PROBE-score-analysis.mjs`) |

## Cases

Evidence paths are relative to the evidence folder. Round-2 files carry `r2` or `round2` in their names. Each row states the round it reflects; a round-1 row still holds for the reason in its Notes (the investigation's § Round 2 Rerun Plan).

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | all server | Production types | Reused: IMP-01 (`pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` on `9f0df7eab3`) | — | Pass | `implementation/IMP-01-typecheck.log` | `tsc exit=0` | Ran on the validated commit. Round 1: `repository/API-R01-server-typecheck.log` |
| API-R02, API-R03 | AC-003, AC-004 (rule), AC-006, AC-008, AC-009, AC-011, AC-013, AC-016; O-1 | Server unit (fake model) | Reused: IMP-02 (`pnpm -C autobyteus-server-ts test:unit` on `9f0df7eab3`) | — | Pass | `implementation/IMP-02-server-unit.log` | `Test Files  726 passed \| 4 skipped (730)`, `Tests  5873 passed` | Includes the changed embeddings tests and the new O-1 tests |
| API-R04 | regression | Server integration | Round 1: `pnpm -C autobyteus-server-ts test:integration:prepare && pnpm -C autobyteus-server-ts test:integration` | ENV-1 (`722b9b3918`) | Pass (in scope) | `repository/API-R04-server-integration.log` | `Test Files  2 failed \| 74 passed \| 18 skipped (94)`; when rerun alone, `✓ AC-001/AC-015(a)` passes and the two cadence `×` cases still fail | Still valid: IR-003 changes no file this suite exercises (the embeddings quality test is gated and runs as API-R06). Out of scope: two `agent-status-websocket` cadence cases (`expected [ { type: 'SEGMENT_CONTENT', …(1) } ] to have a length of +0 but got 1`). This branch changes no streaming file, and these are the known product defect another checkout's TESTING.md listed (the note was dropped from the branch's guideline in `7af116e8de`) |
| API-D01 | AC-011, AC-012, QR-006, REQ-010 | Real GraphQL + MCP with the real `EmbeddingIndex` (only `fetch` to huggingface.co simulated) | `autobyteus-server-ts/tests/e2e/projects/project-task-search-model-unavailable.e2e.test.ts`, run in API-R05 | ENV-1 (`9f0df7eab3`) | Pass | `repository/API-R05-round2-e2e-projects.log` | `✓ tests/e2e/projects/project-task-search-model-unavailable.e2e.test.ts (2 tests)` | Asserts no `embeddings/` after startup or after Task/Project writes; offline gives `UNAVAILABLE` "Could not reach huggingface.co"; exact matches and writes keep working; the tool note says why; Retry makes a new attempt; no `.part` file is left. Model folder now `DEFAULT_EMBEDDING_MODEL_ID` (IR-003) |
| API-R05 | AC-003, AC-006, AC-008, AC-016 (setting) | Real HTTP/GraphQL/MCP | `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects --no-watch` | ENV-1 (`9f0df7eab3`) | Pass | `repository/API-R05-round2-e2e-projects.log` | `Test Files  6 passed \| 14 skipped (20)`, `Tests  36 passed \| 61 skipped (97)` | Skipped files are gated runtime suites |
| API-R06 | AC-001, AC-002, AC-004 at 60 and 1,000 Tasks (DEC-011), QR-007 | Real Granite on the production WASM worker | `RUN_EMBEDDING_MODEL_E2E=1 TEST_EMBEDDING_SCALE=1 TEST_EMBEDDING_MODEL_CACHE=<temp> pnpm -C autobyteus-server-ts exec vitest run tests/integration/embeddings/embedding-model-quality.integration.test.ts --no-watch`; LEAF-IR and EmbeddingGemma 2 reused from IMP-04 and IMP-05 | ENV-1 (`9f0df7eab3`) | Pass | `repository/API-R06-round2-real-model-scale.log`, `repository/API-R06-round2-calibration.json.txt`; `implementation/IMP-04-…`, `IMP-05-…` | `"fixture":{…"shownInFirst5":0.968,"unrelatedWithoutMatch":0.958}`, `"generated":{"tasks":1000,…"shownInFirst5":0.937,"unrelatedWithoutMatch":0.958}`, `"repository":{"tasks":1000,…"shownInFirst5":0.921,"unrelatedWithoutMatch":0.958}`; `✓ granite-embedding-small-english-r2 meets QR-007, AC-001 and AC-004` | An independent run identical to IMP-03. LEAF-IR (now not the default, floor 0.30) passes on the fixture (`0.952` / `0.958`) |
| API-R07 | AC-001, AC-003…AC-005, AC-010, AC-011 (web) | Web unit/component; guards | Round 1: `pnpm -C autobyteus-web test:nuxt --run`; the three guards | ENV-1 (`722b9b3918`) | Pass | `repository/API-R07-web-suite.log`, `repository/API-R07-web-guards.log` | `Test Files  632 passed \| 2 skipped (634)`; three `exit=0` | Still valid: no web code changed in IR-003 |
| API-R08 | AC-014 (licences) | Repository checks | `python3 scripts/check_licensing.py`; `python3 scripts/check_repository_artifact_hygiene.py`; `python3 -m pytest -q scripts/tests/test_check_licensing.py` | ENV-1 (`9f0df7eab3`) | Pass | `repository/API-R08-round2-licensing-hygiene.log` | `Licensing is consistent.`, `Repository artifact hygiene check passed.`, `12 passed` | — |
| API-L01 | AC-014, QR-008, AC-011, AC-009, AC-016, AC-012 | Test-owned Docker container | Round 1: image from `Dockerfile.monorepo`; `docker run -d -p 127.0.0.1:60668:8000`; offline via `/etc/hosts`, Retry, `docker restart`, Granite switch and back | ENV-3 | Pass | `docker/API-L01-03-offline-first-use.jsonl.txt`, `API-L01-06-…`, `API-L01-07-quality-rep60.json.txt`, `API-L01-12-switch-granite.jsonl.txt`, `API-L01-13-after-switch-files.txt`, `API-L01-14-quality-rep60-granite.json.txt` | `"reason":"Could not reach huggingface.co to download the model: fetch failed"`; READY after Retry; Granite `[{"model_id":"granite-embedding-small-english-r2","n":61,"bytes":1536}]`, `"targetShownInFirst5":60` | Still valid: Granite already ran in this image (download, index, quality). IR-003 changes only platform-independent catalog and readiness code, with no dependency or packaging change. The image keeps 136 MB of unpruned `onnxruntime-web` (FU-5) |
| API-L02a | AC-014, QR-008 | Packaged macOS arm64 build | `pnpm --silent isolated-app start --build` | ENV-2b | Pass | `desktop/API-L02a-r2-01-build-and-start.txt` | `Removed 127 MB of onnxruntime-web browser builds`, `Embedding runtime validation passed`; `DEFAULT_EMBEDDING_MODEL_ID = GRANITE_SMALL_ENGLISH_R2.id` in the packaged `dist` | — |
| API-L03a | AC-012, QR-006 | Instance GraphQL + data root | Seed 1,000 + 1,000 + 60 Tasks through `API-PROBE-search-driver.mjs seed` | ENV-2b | Pass | `desktop/API-L03a-r2-01-seed.txt` | `"created":1000` ×2, `"created":60`; the `server-data` listing has no `embeddings` | — |
| API-L02b | AC-010, AC-001, QR-003 | Projects page board, Backlog 1000, first search ever (Granite) | Typed the t01 paraphrase (no exact match) and waited without retyping | ENV-2b | Pass | `desktop/API-L02b-r2-01-state-1s.txt`, `desktop/API-L02b-r2-03-wait-until-ready.txt`, screenshots `API-L02b-r2-02-…png`, `API-L02b-r2-04-…png` | `"status": "Preparing meaning search: downloading the model (0 of 55 MB)…"`; progress texts through `"Preparing meaning search… 984 of 1000 Tasks"`; final To Do lane `Sidebar collapse state is lost after restart`, `status: null` | Typing to ready took 221 s (QR-003: 1,000 Tasks ≤ 20 min). Round-1 journeys on the same board (lanes, Cancelled) remain valid |
| API-L03b | QR-003, QR-004 (indexing), QR-005 | Embedded server | `footprint -p` every 1 s during API-L02b; file sizes | ENV-2b | Pass | `measure/API-L03b-r2-01-first-use-granite.txt` | `typing -> board ready … 221 s`; `peak footprint during first use: 450 MB … (+265 MB over 185 MB)`; Granite files 51,885,568 + 598,902 + 2,128,614 + 20,839 bytes; `embeddings.sqlite` 1,368,064 + WAL 4,152,992 bytes | QR-004 ≤ +800 MB; QR-005 model 54.6 MB ≤ 60 MB, index ≈ 1.4 MB + WAL ≤ 10 MB |
| API-L04 | AC-001, AC-004 at 60 and 1,000 Tasks (DEC-011, C-12) | App GraphQL (READY, Granite) + board | `API-PROBE-search-driver.mjs quality` on Representative 60, Backlog 1000, Backlog 1000 real text; board "weather in Berlin tomorrow" on both 1,000-Task Projects | ENV-2b | Pass | `quality/API-L04-r2-quality-rep60.json.txt`, `…-b1000.json.txt`, `…-brepo.json.txt`, `quality/API-L04-r2-board-unrelated-b1000.txt`/`.png`, `…-brepo.txt`/`.png` | `"targetShownInFirst5Pct":96.8` / `93.7` / `92.1`; `"fixtureUnrelatedNoMatch":23,"fixtureUnrelated":24` on all three; board `"noMatch": true` | The only unrelated query with a match is "translate good morning into Japanese" (1 Task). Round-1 F-001 evidence (LEAF-IR) remains in `quality/API-L04-01…07` |
| API-L03c | QR-001, QR-004 (searching) | GraphQL + board + embedded server | `API-PROBE-search-driver.mjs latency` (3 × 90 queries) at 1,000 Tasks, then one search per second for 60 s; board: one input event with a full paraphrase | ENV-2b | Pass | `measure/API-L03c-r2-01-latency-and-footprint.txt`, `measure/API-L03c-r2-02-board-update-after-typing.txt` | `"p50":42,"p90":46,"p99":50,"max":109`; `footprint max 483 MB (+298 MB)` for both the burst and the user-paced run; `msAfterTypingStopped` 311…341 | QR-001: p90 ≤ 150 ms and board ≤ 0.5 s. QR-004: ≤ +450 MB while searching (held even right after indexing three Projects) |
| API-L02e | AC-008, QR-002 | GraphQL (Backlog 1000) | `updateProjectTask` t02 to a new topic; poll the new-topic paraphrase until t02 is a MEANING match; old topic after | ENV-2b | Pass | `desktop/API-L02e-r2-01-edit-qr002.txt` | `edit -> found by meaning (ms): 270`; `old topic after edit, t02 shown: false` | Board-side edit, delete and Project-delete behavior: round 1 (`desktop/API-L02e-01…07`), still valid (unchanged code) |
| API-L03d | QR-004 (idle) | Embedded server | No searches or edits for 12 minutes | ENV-2b | Pass | `measure/API-L03d-r2-01-idle-footprint.txt` | `idle + 9 min: footprint 405 MB`; `idle +11 min: footprint 137 MB (-48 MB vs 185 MB baseline)` | The worker's 10-minute idle stop returns the memory |
| API-L02f | AC-009, REQ-008, O-1 | Desktop instance restart | `pnpm --silent isolated-app restart iso-60493-231f`; edit d007 before any search; first search | ENV-2b | Pass | `desktop/API-L02f-r2-01-restart-o1.txt` | `"state":"PREPARING","phase":"LOADING"` at 0.19 s, then `"state":"READY"` at `"t":1.25` with d007 as MEANING | O-1 resolved: no "downloading 0 of N" while existing files are verified. Ready in 1.25 s for 1,000 Tasks, so unchanged Tasks were not re-embedded |
| API-L02g | AC-016, QR-005 | Settings → Server Settings → Advanced; files and rows | Entered `not-a-model`, then `mdbr-leaf-ir` (search until READY), then blank (search until READY) | ENV-2b | Pass | `desktop/API-L02g-r2-01-switch.txt` | `Embedding model must be blank (default) or one of: granite-embedding-small-english-r2, mdbr-leaf-ir, embeddinggemma-2.`; after LEAF-IR `[{"model_id":"mdbr-leaf-ir","n":60,"bytes":3072}]`; after blank `[{"model_id":"granite-embedding-small-english-r2","n":60,"bytes":1536}]`; the row says `Blank uses the default (granite-embedding-small-english-r2)` | Exact matches stayed shown throughout (`"kinds":"E"`) |
| API-L02c, API-L02c2, API-L02d, API-L02h | AC-005, CR-001, AC-003, AC-011 (board) | Board / right panel | Round 1: locate while preparing, Refresh, Cancelled toggle, open/return; create clears search; exact order; unavailable + Retry | ENV-2 | Pass | `desktop/API-L02c-01-locate-while-preparing.json.txt`, `API-L02c-03-…`, `API-L02c2-01-…`, `API-L02d-02-…`, `API-L02h-02-board-unavailable.json.txt`, `API-L02h-06-…` | `"locatedAfterMs": 131`; `query after create: ''`; `t51:E t01:E t37:E t09:E t02:M …`; `Meaning search is unavailable: EACCES … Exact matches still work.` | Still valid: board, composable, search service, delete hooks and failure path unchanged in IR-003; the readiness shape is unchanged |
| API-L05 | AC-007 | Companion repo + instance | Round 1: import the companion package; `agentDefinitions` | ENV-2 | Pass | `desktop/API-L05-01-companion-definition.txt` | `"id": "project-task-manager", … "search_project_tasks"`; `1 of 57` | Still valid: companion unchanged (`344da76`) |

## Findings

- F-001 (round 1: the LEAF-IR default fails AC-004 and AC-001 at 1,000 Tasks) is **resolved** by SR-007 / IR-003. With the Granite default, AC-001 and AC-004 hold on the fixture and on both 1,000-Task backlogs, in the app (API-L04) and in the gated suite (API-R06).
- C-12 (held): Granite's AC-001 margin on the real-text backlog is 2.1 points (92.1% against 90%). It is identical in the app, the gated suite and IMP-03. A residual risk for much larger or different backlogs, not a failure.
- Observations:
  - O-1 is resolved (API-L02f).
  - O-2: the setting is still listed in Advanced only once it has a value.
  - O-3: FU-5, the Docker image keeps the unpruned `onnxruntime-web`.
  - O-4: during indexing, meaning results come only from the part already indexed.
  - O-2 and O-4 are non-blocking.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-L04, API-R06, API-L02b, API-L03c | Proven at 60 and 1,000 Tasks (96.8% / 93.7% / 92.1% shown in the first 5) | — |
| AC-002 | Yes | API-R06 (+ IMP-04, IMP-05) | Proven (Granite top 5: 100% / 95.2% / 95.2%; top 10 ≥ 95%) | — |
| AC-003 | Yes | API-R02/R03 (IMP-02), API-R05, API-L02d | Proven | — |
| AC-004 | Yes | API-L04, API-R06 | Proven at 60 and 1,000 Tasks (23/24 = 95.8% with no match; board no-match state) | — |
| AC-005 | Yes | API-R07, API-L02c, API-L02c2 | Proven | — |
| AC-006 | Yes | API-R02/R03, API-R05, API-D01 | Proven | — |
| AC-007 | Yes | API-L05 | Proven | — |
| AC-008 | Yes | API-R05, API-L02e | Proven (QR-002: 270 ms) | — |
| AC-009 | Yes | API-L02f, API-L01 | Proven | — |
| AC-010 | Yes | API-L02b | Proven (55 MB download, progress, no retyping) | — |
| AC-011 | Yes | API-D01, API-L01, API-L02h | Proven | — |
| AC-012 | Yes | API-D01, API-L03a, API-L01 | Proven | — |
| AC-013 | Yes | API-R02/R03 (IMP-02) | Proven | — |
| AC-014 | Yes | API-L02a, API-L01, API-R08 | Proven for macOS arm64 desktop and Docker linux/arm64. The other desktop targets and Docker amd64 are not built here (release workflow) | — |
| AC-015 | Yes | API-L03b, API-L03c, API-L03d | Proven against the re-based targets: QR-001 p90 46 ms, board 311–341 ms; QR-003 221 s per 1,000 Tasks; QR-004 +265 MB indexing, +298 MB searching, below baseline when idle; QR-005 54.6 MB model, ≈ 5.5 MB index with WAL | — |
| AC-016 | Yes | API-R05, API-L02g, API-L01 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 95% | Every AC proven directly; AC-001/AC-004 at the DEC-011 scale (API-L04, API-R06) | C-12 margin of 2.1 points on the real-text backlog | Real user backlogs over time |
| Changed-boundary execution directness | 90% | 95% | Packaged build of `9f0df7eab3` with real Granite; restart, switch, idle | Windows/Linux packaging not executed | CI release builds |
| Cross-boundary integration realism and mock gap | 90% | 95% | Only API-D01 simulates `fetch`; every live case uses the real worker, store and transports | — | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | Packaged app, generated and real-text 1,000-Task backlogs; quieter host in round 2 | Docker round-1 image (justified reuse) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | Offline + Retry (real DNS), disk failure + Retry, restart, abrupt stop, switch, deletes | — | — |
| User-surface, browser, and desktop-shell confidence | 90% | 95% | Board, right panel and Settings in the packaged app | The locate trigger entered through its store action | A run with a live task agent |
| Durable regression coverage quality and relevance | 95% | 95% | Feature unit/E2E/web specs; API-D01; the gated quality test now asserts AC-001/AC-004 at 1,000 Tasks (`TEST_EMBEDDING_SCALE=1`) | The real-text backlog drifts with `tickets/done` (C-10) | Freeze the real-text selection in a fixture (follow-up) |

- Overall post-repository confidence: 91%
- Overall final confidence: 95% (simple average of the seven categories)
- Calculation method: simple average.
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks:
  - C-12, the thin AC-001 margin;
  - untested Windows, Linux and macOS x64 packaging, and Docker amd64;
  - C-10, drift of the real-text backlog;
  - RSK-002 proxy downloads.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` (a packaged build of `9f0df7eab3` in an isolated instance) plus lifecycle and memory measurement in it. The Docker evidence is from round 1 (`Other`).
- Confidence gap it addresses: the default model's quality at 1,000 Tasks in the built app (DEC-011, C-12); the re-based QR-003/QR-004 (C-13); first use with the 55 MB model; O-1 after a restart; the switch away from and back to the new default.
- Browser validation needed: the board ran inside the desktop instance (same renderer).

## Desktop Application Validation

- Approach executed: `isolated-app start --build` and `restart`, driven through CDP (`probes/API-PROBE-cdp.mjs`, `API-PROBE-ui.mjs`).
- Cases proving web-equivalent behavior: API-L02b, API-L04 (board), API-L03c (board), API-L02g (Settings); round 1: API-L02c/c2/d/e/h.
- Cases proving shell or lifecycle behavior: API-L02a, API-L02f, API-L03b, API-L03d.
- Effect on any already-running desktop application: `None`
- Behavior not directly proven: Windows, Linux and macOS x64 packaging.

## Persisted-Data Transition Checks

- Approved decision: existing data `Not Affected`; `embeddings.sqlite` `Discard or Rebuild`.
- Representative existing data used: 2,060 Tasks created before any search; restart.
- Approved transition followed without an unnecessary migration: `Yes`.
  - The store is created by the first search (API-L03a, API-D01).
  - Vectors survive a restart (API-L02f).
  - A model switch keeps only the active model's rows and files (API-L02g).
  - The round-1 LEAF-IR data is not involved: each round uses a fresh data root. A user upgrading from a LEAF-IR index would see the existing switch path (old rows deleted when Granite is ready), which API-L02g exercises.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none material.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/project-task-search-model-unavailable.e2e.test.ts` | Added by API/E2E (round 1, commit `8981a99256`); one line updated by the implementation in IR-003 (model folder from `DEFAULT_EMBEDDING_MODEL_ID`) | API-D01, API-R05 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Model host in API-D01 | `globalThis.fetch` wrapper (offline, then 404) | Durable, offline-safe regression test | None for the live path (API-L01 used a real DNS failure) |
| Task status changes (round 1) | Test-owned `task.json` edits while stopped | No GraphQL status mutation | Status values only |
| "Show Task in Projects" trigger (round 1) | `taskLocator.locate(…)` from CDP | Needs a task-agent run (LLM runtime) | The Workspaces-tree button itself was not clicked |
| Model failure on the board (round 1) | `embeddings/models` made unwritable | The desktop instance's network cannot be cut safely | The network variant is in API-L01 |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probes `evidence/probes/API-PROBE-*.mjs` (round 2 adds `API-PROBE-add-repo-backlog.mjs` and the `backlog1000repo` set) | Yes | Kept as evidence | Kept |
| Round 1: container, image, instances, data root, `/tmp/pts-api` | Yes | Removed (round 1) | Removed |
| Round 2: instance `iso-60493-231f` and its data root | Yes | `pnpm --silent isolated-app stop iso-60493-231f` | `wasRunning True dataRootRemoved True`, ports released; `isolated-app list` shows only other people's records |
| Round 2: `/tmp/pts-api2` (models cache, backlog, samplers, E2E home) | Yes | `rm -rf` | Removed |
| `autobyteus-web/electron-dist` (packaged build output) | Yes (untracked build output) | Left in place for later rounds | Kept |

## Preliminary Classification (On `Fail`)

N/A — `Pass`.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): `None`. AC-014 is proven for macOS arm64 and Docker linux/arm64; the other targets are built by the release workflow.
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (rule: "When API/E2E validation passes, the carried classification is task_size=Large or architectural_risk=High, and the cumulative evidence package requires proportional test-code review.")
- Notes: round 1's Fail (F-001) is resolved by SR-007 / IR-003, with final confidence 95%. Residual risks: C-12, C-10, untested platforms, RSK-002.
