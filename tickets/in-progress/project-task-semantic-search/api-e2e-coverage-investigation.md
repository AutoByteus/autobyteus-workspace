# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `tickets/in-progress/project-task-semantic-search/requirements-doc.md` (SR-004, approved by the user)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-006; the uncommitted FU-1 wording edit is not behavior-defining)
- Supplemental Task Artifacts: `model-evaluation-report.md`, `evidence/probes/API-PROBE-` (evidence only)
- Design Review Report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-002)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-002, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002` (round 2; `API-REV-001` = round 1, Fail F-001)
- Test progress log: `api-e2e-test-progress.md`
- Execution coverage report (the record, results, confidence and broader-validation decision): `api-e2e-execution-coverage-report.md`
- Current Investigation Round: 2
- Trigger: round 1 — code reviewer pass CRR-002; round 2 — code reviewer pass CRR-004 of IR-003 (FO-001 → SR-007: Granite default, DEC-011, re-based QR-003/QR-004, O-1)
- Prior Investigation Reviewed: round 1 (this file)
- Latest Authoritative Investigation: this file, round 2 (see § Round 2 Rerun Plan)

All paths are relative to the worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-semantic-search` unless absolute. Code under validation: branch `codex/project-task-semantic-search`, source commit `722b9b3918` (ticket docs `358b7f0123`); companion `/Users/normy/autobyteus_org/autobyteus-agents-project-task-semantic-search` @ `344da76`.

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (when durable test code is added or changed)

## Current Requirement And Design Basis

- Board search (Projects page and right-panel board) finds Tasks by meaning and by exact text; lanes stay, matches best-first, lane counts count matches, no-match state when nothing matches (REQ-001…REQ-004, DEC-001).
- Agent tool `search_project_tasks(project_id, query, limit?)` with a compact best-first result and a meaning-search state; native and MCP; selected by the Project Task Manager (REQ-005, REQ-006).
- The index follows Task/Project changes and restarts; never stale (REQ-007, REQ-008, REQ-014).
- First use is lazy (download, load, index in the background) with a status line; failure shows a reason and Retry; nothing else waits (REQ-009, REQ-010, REQ-012).
- Works on every desktop platform and the Docker images; licences in order (REQ-013).
- A generic embedding layer; switchable catalog model by the `AUTOBYTEUS_EMBEDDING_MODEL` setting with a background rebuild (REQ-011, REQ-015).
- Quality targets QR-001…QR-008, to be measured on the built app with a 1,000-Task synthetic backlog (AC-015).
- Design: DS-001…DS-008; persisted store `<appData>/embeddings/embeddings.sqlite` is `Discard or Rebuild`; existing data `Not Affected`.
- Reviewer risks to target: C-08 (LEAF-IR floor 0.24 on a realistic backlog), C-09 (`listTasks` per search at 1,000 Tasks), RSK-002 (proxy), RSK-005/RSK-009 (WASM memory), packaging (Windows script path not run, Docker unpruned, FU-5).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001, SCN-002, SCN-003, SCN-004, SCN-005, SCN-006, SCN-007 (repository only: it is a code-level contract), SCN-008; reviewer scenario SCN-CR-1 (locate while preparing).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-API-1: a user opens a Docker node's server in the app/browser and searches (REQ-012/REQ-013): the first search on a container downloads the model inside the container. Trigger: board search / GraphQL against the container.
  - SCN-API-2: the server machine loses and regains its route to the model host between the first search and Retry (SCN-006 alternate "Retry succeeds later"). Trigger: real DNS/connection failure inside a test-owned container, then restored.
  - SCN-API-3: after a restart, the user edits one Task before searching (REQ-008 "Tasks changed while the index was not running"): only that Task is re-embedded. Trigger: UI edit, then board search.
  - SCN-API-4: a large backlog (1,000 Tasks of realistic length) prepares for minutes, so locate, Refresh and Task creation happen while "Preparing… N of M" shows (QR-003 window; CR-001).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none in the requirements. Reviewer-rejected candidates C-05 (delete inside a tool's 30 s wait) and C-06 (switch during the worker restart window) are contrived timing and are not tested.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 board search by meaning + exact, ranked lanes, status line | Changed | REQ-001…REQ-004, REQ-009, REQ-010; DS-001, DS-005 | Web specs + real desktop journeys + calibration measurement |
| BEH-001 preserved board behaviors (Cancelled toggle, Refresh, Clear, create clears search, locator, compact board, counts) | Preserved | REQ-004, AC-005, CR-001 | Web specs + desktop journeys including locate while preparing |
| BEH-002 `search_project_tasks` tool | Added | REQ-005, REQ-006, DS-002 | Unit + E2E (native, MCP) + companion definition check |
| BEH-003 index follows writes/restarts | Added | REQ-007, REQ-008, REQ-014, DS-003, DS-006 | Unit + E2E + desktop restart + measurement of re-index work |
| BEH-004 lazy first use, readiness, failure, Retry, never blocks | Added | REQ-009, REQ-010, REQ-012, DS-004 | Unit + new real-index E2E + real offline run in a container + desktop first use |
| BEH-005 generic layer, catalog, setting, switch | Added | REQ-011, REQ-015, DS-007 | Unit (AC-013) + E2E setting + real switch in the desktop app |
| Packaging (desktop prune + runtime check; Docker image) | Added | REQ-013, AC-014, QR-008 | Packaged desktop build + Docker image build and smoke |
| Client-side substring predicate | Removed | Design removal plan | Confirm no fallback remains (code read + specs) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `ProjectTaskSearchService`, `EmbeddingIndex`, relevance rule, collection job | Unit tests with a deterministic fake model | Real-model scores on a realistic backlog (C-08) | Gated real-model suite + realistic-backlog measurement |
| API / transport / contract | Yes | GraphQL `searchProjectTasks`, `retryEmbeddingModel`; tool `search_project_tasks`; setting | Server E2E (fake model) | Real index (no fake) over HTTP, offline path | New durable E2E with the real index; live runs |
| Frontend component / state | Yes | `useProjectTaskSearch`, `ProjectTaskBoard.vue` | Web specs (mocked GraphQL) | Real server timing, polling against a real preparing phase | Desktop instance |
| Browser integration / user journey | Yes | Board search journeys | None real | Everything end-to-end | Desktop instance (web-equivalent renderer inside the real app) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same renderer in Electron | Web specs | As above | Desktop instance |
| Desktop shell / Electron-specific integration | Yes (packaging only) | `prepare-server` prune + runtime check; embedded server stage | Implementation ran `prepare-server` on macOS | Packaged app actually loading the pruned runtime and a real model | `isolated-app start --build` (packaged mac build) |
| Process / lifecycle | Yes | Worker thread start/idle stop, lazy startup, restart persistence | Unit tests | Real worker memory, idle stop, restart | Desktop instance + measurement |
| Persisted-data transition | Yes (new disposable store) | `embeddings.sqlite` Discard or Rebuild | Store unit tests | Real file under app data, model switch cleanup | Desktop instance file checks |
| Worker / queue / distributed coordination | Yes | ort-web WASM worker, query priority | Unit + gated real model | Real CPU timings at 1,000 Tasks | Measurement |
| External integration | Yes | Hugging Face download (pinned, checksummed) | Unit with fake fetch | Real download, real network failure and recovery, Docker network | Docker container + desktop instance |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-semantic-search`
- Project type and runtime stack: pnpm monorepo; Fastify/GraphQL server (Node 22.23.1 here), Nuxt renderer, Electron desktop shell; Docker server image (`autobyteus-server-ts/docker/Dockerfile.monorepo`).
- Project testing guideline path(s): worktree `TESTING.md` (the branch's version). It differs from the superrepo checkout's `TESTING.md` (adds "Rerun by impact", "Green server suites", rule 9 wording); the worktree version governs this branch. No closer `TESTING*.md` under the changed folders.
- Conflicting, missing, or unclear project instructions: `build.sh` for Docker also tags `autobyteus-server:latest`; to avoid touching shared tags the image is built directly with `docker buildx build -t ab-pts-validation:722b9b3918`. Docker smoke follows TESTING.md "Docker server nodes" (test-owned container, 127.0.0.1, no user volumes), but with an image built from this worktree instead of mounting `dist` over the user's image, because the new dependencies are not in that image's `node_modules`.
- Required environment variables or secrets available: `N/A` (no provider credentials needed; the model download is public).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Test layers, isolation, rules | Server unit/integration/typecheck/E2E commands; clean env for E2E; isolated desktop instance for real journeys; never the user's app or data; Docker rules; evidence in the ticket |
| `docs/isolated-app-instances.md` | Desktop instance lifecycle | `pnpm --silent isolated-app start --build`, `restart`, `stop`; CDP control port; data root under temp |
| `autobyteus-server-ts/docker/Dockerfile.monorepo`, `build.sh` | Docker image | Builder installs from the lockfile, builds server; runtime copies `node_modules` and `dist` |
| `autobyteus-web/package.json`, `scripts/prepare-server-dispatch.mjs` | Desktop packaging | macOS/Linux → `prepare-server.sh`; Windows → `prepare-server.mjs` |
| `autobyteus-server-ts/package.json` | Server scripts | `test:unit`, `test:integration:prepare`/`test:integration`, `typecheck` |
| `tests/integration/embeddings/embedding-model-quality.integration.test.ts` header | Gated real-model suite | `RUN_EMBEDDING_MODEL_E2E=1`, `TEST_EMBEDDING_MODELS=all`, `TEST_EMBEDDING_MODEL_CACHE`, `TEST_EMBEDDING_CALIBRATION_OUT` |
| `RELEASE.md` / design G11 | Licensing | `python3 scripts/check_licensing.py`, `python3 scripts/check_repository_artifact_hygiene.py` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Packaged desktop instance (worktree build) | worktree root | `pnpm --silent isolated-app start --build` | Own data root, own ports, CDP control port | `start` JSON `ok: true` | `pnpm --silent isolated-app stop <id>`; `list` shows none |
| Built server for measurement (`dist/app.js`) | worktree | the desktop instance's embedded server (the built app) | RSS by pid of the embedded server | `/rest/health` | stopped with the instance |
| Docker test container | worktree | `docker run -d --name pts-api-<n> -p 127.0.0.1:<port>:8000 ab-pts-validation:722b9b3918` | No user volumes; root in container for `/etc/hosts` toggle | GraphQL answers | `docker rm -f -v`; `docker rmi` the test image |
| Model cache for the gated suite | `/tmp/pts-api/models` | test option `TEST_EMBEDDING_MODEL_CACHE` | Outside the repository | — | `rm -rf` at the end |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| 60 representative Tasks + paraphrase/unrelated queries | `autobyteus-server-ts/tests/fixtures/project-task-search/` | Synthetic, no user data | Repository fixture |
| 1,000-Task realistic-length backlog | Ticket probe generator (deterministic seed): the 60 fixture Tasks plus 940 generated distractor Tasks of 1,200–3,500 characters; a long-form variant of the 60 targets for C-08 | Created only through GraphQL (`createProject`, `createProjectTask`) on test-owned servers | Removed with the data roots; generator and query sets kept in `api-e2e-evidence/` |
| Extended unrelated query set | Fixture's 12 + the design probes' 6 genuine off-topic + 12 more written for this run | Synthetic | Kept as evidence |

## Persisted Data Transition Coverage Basis

- Approved decision: existing data `Not Affected`; new store `Discard or Rebuild`.
- Design-spec and implementation-handoff references: design § Persisted Data / State Transition Decision; handoff § Persisted Data Transition Check.
- Representative existing-data setup and required behavior: a data root with Projects/Tasks created before any search (the normal state after upgrade) must keep working; the store is created only by the first search.
- Evidence planned: desktop instance and container file checks (no `embeddings/` before the first search; `embeddings.sqlite` after); restart persistence; model switch keeps only the active model's rows and files; store unit tests for corrupt/other-shape files (rename aside).
- Migration-specific scenarios: N/A.
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/embeddings/embedding-index.test.ts` (11) | First use, floor, edit/remove, late batch discarded, restart, switch, unavailable/retry, wait, second collection, no store for removals | AC-004, AC-008, AC-009, AC-011, AC-013, AC-016; DS-003/004/007 | Still Valid | Read; matches the design | Run |
| `tests/unit/embeddings/embedding-model-catalog.test.ts` | Catalog pins and docs, setting resolve/validate, relevance rule, real worker load failure | REQ-015, R-6, DS-008 | Still Valid | Read | Run |
| `tests/unit/embeddings/embedding-model-files.test.ts` | Download, checksum, damaged file, host in reason, single flight, removal | DS-004, G7 | Still Valid | Read | Run |
| `tests/unit/embeddings/embedding-vector-store.test.ts` | Store CRUD, reopen, set aside unreadable/other shape, no file for removals | Persisted-data decision | Still Valid | Read | Run |
| `tests/unit/projects/project-task-search.test.ts` | Exact tier, merge/order, edit/delete, failure containment, errors, cleanup | REQ-002, REQ-003, REQ-007, REQ-010 | Still Valid | Read | Run |
| `tests/unit/agent-tools/project-tasks/search-project-tasks-tool.test.ts` | Description, schema order, exposure only when selected, argument errors, compact result, notes | AC-006 | Still Valid | Read | Run |
| `tests/e2e/projects/project-task-search.e2e.test.ts` (2) | Real HTTP/GraphQL + MCP with a fake model; setting validation; Retry false when not unavailable | AC-003, AC-006, AC-008, AC-016 (setting) | Still Valid | Read | Run (clean env) |
| `tests/integration/embeddings/embedding-model-quality.integration.test.ts` (gated) | QR-007, AC-001, AC-004 per catalog model on the real stack | AC-002, AC-004, QR-007 | Still Valid | Read | Run gated, all three models |
| `autobyteus-web/components/projects/__tests__/ProjectTaskBoard.spec.ts` | Board search, debounce, preparing/unavailable/failed states, latest wins, Cancelled, QR-001 render | AC-001, AC-003…AC-005, AC-010, AC-011 (web) | Still Valid | Read titles + composable | Run |
| `components/projects/panel/__tests__/ProjectsPanel.spec.ts`, `ProjectsPanelTaskLocate.spec.ts` | Compact board, search kept on return, locate clears hiding search, locate while preparing (CR-001) | AC-005 | Still Valid | Read titles | Run |
| Other Project E2E (`tests/e2e/projects/*.e2e.test.ts`) | Project/Task GraphQL and tool journeys (delete paths now call cleanup) | Regression of the delete hooks | Still Valid | Folder listing | Run |
| `scripts/tests/test_check_licensing.py` | Licensing checker | AC-014 licences | Still Valid | Handoff | Run with the two checks |

## Planned Cases

Narrowest first. The execution report's Cases table records each one under the same ID. (Updated during the run: API-L04's score analysis, API-L02e…h and API-L05 steps were refined when the skill's case structure changed; no planned case was dropped.)

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Kind | Planned Command Or Steps | For A Temporary Probe: Why It Should Not Stay As Durable Coverage |
| --- | --- | --- | --- | --- | --- |
| API-R01 | all server | Production `src` types | Existing Test | `pnpm -C autobyteus-server-ts typecheck` | — |
| API-R02 | AC-003, AC-004, AC-006, AC-008, AC-009, AC-011, AC-013, AC-016 | Server unit (fake model) | Existing Test | vitest `tests/unit/embeddings`, `project-task-search.test.ts`, `search-project-tasks-tool.test.ts` | — |
| API-R03 | regression | Server unit | Existing Test | `pnpm -C autobyteus-server-ts test:unit` | — |
| API-R04 | regression | Server integration | Existing Test | `test:integration:prepare`, then `test:integration` | — |
| API-D01 | AC-011, AC-012, QR-006, REQ-010 | Real GraphQL + MCP with the real `EmbeddingIndex` | Durable | new `tests/e2e/projects/project-task-search-model-unavailable.e2e.test.ts`, clean env | — |
| API-R05 | AC-003, AC-006, AC-008, AC-016 (setting), regression | Real HTTP/GraphQL/MCP | Existing Test | `env -i … vitest run tests/e2e/projects` | — |
| API-R06 | AC-002, AC-004, QR-007 | Real models on the WASM worker | Existing Test (gated) | `RUN_EMBEDDING_MODEL_E2E=1 TEST_EMBEDDING_MODELS=all …` | — |
| API-R07 | AC-001, AC-003…AC-005, AC-010, AC-011 (web) | Web unit/component; guards | Existing Test | `pnpm -C autobyteus-web test:nuxt --run`; three guards | — |
| API-R08 | AC-014 (licences) | Repository checks | Existing Test | `check_licensing.py`, `check_repository_artifact_hygiene.py`, pytest | — |
| API-L01 | AC-014, QR-008, AC-011, AC-009, AC-016 | Test-owned Docker container from an image built from this worktree | Temporary Probe | GraphQL via `evidence/probes/API-PROBE-API-PROBE-search-driver.mjs`; `/etc/hosts` toggle for `huggingface.co`; `docker restart`; setting switch | Needs a 9 GB image, the network and minutes; the release workflow builds the images |
| API-L02a | AC-014, QR-008 (desktop packaging) | Packaged macOS arm64 build | Journey | `pnpm --silent isolated-app start --build` | Real packaged app; no repository harness for this journey |
| API-L03a | AC-012, QR-006; AC-015 setup | Instance GraphQL, data root | Journey | seed 1,000 + 1,000 + 60 Tasks; check no `embeddings/` | Measurement setup |
| API-L02b | AC-010, AC-001, QR-003 | Desktop renderer (Projects page) | Journey | first search on the 1,000-Task Project through the board | Real model download |
| API-L02c | AC-005, CR-001 | Desktop renderer (right panel) | Journey | locate while preparing, Refresh, Cancelled toggle, open/return | Same |
| API-L02c2 | AC-005 | Desktop renderer (Projects page) | Journey | create a Task while searching | Same |
| API-L02d | AC-003 | Board + GraphQL | Journey | exact query: exact first, meaning after | Same |
| API-L02e | AC-008, QR-002 | Board + GraphQL + store file | Journey | edit to a new topic, delete Task, delete Project | Same |
| API-L02f | AC-009, REQ-008 | Desktop instance restart | Journey | rebuild, `isolated-app restart`, edit one Task, first search | Same |
| API-L02g | AC-016, QR-005 | Settings UI + files | Journey | unknown id, Granite, back to default; files and rows | Same |
| API-L02h | AC-011 (UI) | Board | Journey | model cannot be obtained (models folder unwritable) → unavailable + Retry | Same |
| API-L03b | QR-003, QR-004, QR-005 | Embedded server | Temporary Probe | indexing timeline, footprint/RSS sampling, file sizes | Machine-dependent measurement |
| API-L03c | QR-001, QR-004 | GraphQL + renderer | Temporary Probe | latency loops; board update after typing; footprint while searching | Same |
| API-L03d | QR-004 | Embedded server | Temporary Probe | footprint after 10 idle minutes | Same |
| API-L04 | AC-001, AC-004 (C-08) | Instance GraphQL + production runner | Temporary Probe | quality over 1,000-Task backlogs; score analysis per model (`evidence/probes/API-PROBE-API-PROBE-score-analysis.mjs`) | Needs model downloads and minutes to hours; the gated suite keeps the durable quality check |
| API-L05 | AC-007 | Companion repo + instance | Journey | read the diff; import the companion package into the instance | Separate repository |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-D01 | `autobyteus-server-ts/tests/e2e/projects/project-task-search-model-unavailable.e2e.test.ts` | The existing E2E installs a fake index before startup, so it proves neither that startup and Task writes leave the embedding layer untouched nor the real download-failure path over the transports; a refactor of the composition or the index could break both silently |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron with an embedded Node server.
- Testing guideline used: `TESTING.md` ("A full real-product journey a user would perform → An isolated desktop instance of a worktree build"), `docs/isolated-app-instances.md`.
- Web-equivalent behavior: board search, status line, Retry, locate, lanes, Settings.
- Shell-specific or lifecycle behavior: the packaged server stage (pruned `onnxruntime-web`, threaded WASM in a worker) inside the packaged app; app restart.
- Chosen approach: `isolated-app start --build` (macOS arm64 packaged build of this worktree), driven through its CDP control port with `evidence/probes/API-PROBE-API-PROBE-cdp.mjs` and `evidence/probes/API-PROBE-API-PROBE-ui.mjs`.
- Server/frontend setup when browser validation is used: N/A (inside the desktop instance).
- How the run avoids disturbing an already-running desktop application: own ports, data root and process group; the user's app, its data and the Docker nodes are not touched.

## Live Environment And Fixture Plan

- Startup order and commands: Docker image build → `isolated-app start --build` → seed → journeys and measurements → container runs.
- Environment choices that materially affect the run: Apple M1 Max (10 cores; worker threads = 4); the host is shared with other agents (load average 120–220, 9.7 GB swap in use), so timings are pessimistic and memory is measured with `footprint` (RSS undercounts under swap).
- Health / readiness checks: `isolated-app start` JSON; `/rest/health`; GraphQL answers.
- Seed data / fixtures: GraphQL `createProject` + `createProjectTask` from `evidence/probes/API-PROBE-API-PROBE-generate-backlog.mjs` (seed 20261018): Backlog 1000 (940 generated distractors + 60 fixture targets), Backlog 1000 long (targets with ~1,200 characters of process text appended), Representative 60 (the fixture). Statuses: applied to the test-owned Task files while the instance was stopped (`evidence/probes/API-PROBE-API-PROBE-apply-statuses.mjs`), because GraphQL has no status mutation (agents change status through `update_task`).
- Test identities: none.
- Evidence to capture: GraphQL responses, DOM state from CDP, screenshots, footprint/RSS samples, `embeddings/` listings, sqlite row counts per model, container logs.
- Owned processes and temporary state to clean up: the isolated instance and its data root; the test container and image; `/tmp/pts-api`.


## Round 2 Rerun Plan (IR-003, commit `9f0df7eab3`)

Validated in round 1: `722b9b3918`. Changed since (`git diff --name-only 722b9b3918 9f0df7eab3 -- . ':!tickets'`): `src/embeddings/catalog/embedding-model-catalog.ts` (default Granite, LEAF-IR floor 0.30), `src/embeddings/embedding-index.ts` + `models/embedding-model-files.ts` (O-1 readiness), `docs/modules/embeddings.md`, server tests (fixture: 24 unrelated queries; new `tests/helpers/project-task-search-backlogs.ts`; quality test with `TEST_EMBEDDING_SCALE`; one-line change in API-D01). No web, packaging, dependency, lockfile, schema or `autobyteus-ts` change; after `9f0df7eab3` only `tickets/` changed. New basis: SR-007 (DEC-002 Granite default, DEC-011: AC-001/AC-002/AC-004 hold for the default on Projects up to 1,000 Tasks; QR-003 ≈170 Tasks ≤ 3 min, 1,000 ≤ 20 min; QR-004 ≤ +800 MB indexing, ≤ +450 MB searching, ≤ +50 MB after 10 idle minutes; QR-005 unchanged).

| Case ID | Decision | Reason |
| --- | --- | --- |
| API-R01 | Reused: IMP-01 | Ran on `9f0df7eab3`; `implementation/IMP-01-typecheck.log` `tsc exit=0` |
| API-R02, API-R03 | Reused: IMP-02 | Ran on `9f0df7eab3`, includes the changed embeddings unit tests; `Test Files  726 passed \| 4 skipped (730)` |
| API-R04 | Still valid (round 1) | Integration suite exercises no changed file (the embeddings quality test is gated and rerun as API-R06) |
| API-D01, API-R05 | Rerun | API-D01 and the search E2E changed; the default model changed |
| API-R06 | Rerun (default model, `TEST_EMBEDDING_SCALE=1`); LEAF-IR and EmbeddingGemma 2: Reused IMP-04, IMP-05 | DEC-011 is the round's key criterion; independent confirmation of IMP-03 |
| API-R07 | Still valid (round 1) | No web code changed |
| API-R08 | Rerun | Catalog file is on the licensing allowlist; cheap |
| API-L01 (Docker) | Still valid (round 1) | Granite already ran in the Docker image (switch + 60/63 quality, API-L01); IR-003 changes are platform-independent catalog/readiness code; no dependency or packaging change |
| API-L02a | Rerun | The packaged build must carry the new server code |
| API-L02b + API-L03b | Rerun | First use now downloads Granite (55 MB); QR-003/QR-004 re-based on Granite |
| API-L04 | Rerun | In-app quality with the Granite default: 60 and both 1,000-Task backlogs; board no-match state (C-12) |
| API-L03c, API-L03d | Rerun | QR-001 with Granite; QR-004 searching and idle (C-13) |
| API-L02e (edit part) | Rerun | QR-002 with Granite's per-Task cost |
| API-L02f | Rerun | Restart with the Granite index; O-1 readiness (`loading`, not `downloading 0 of N`) |
| API-L02g | Rerun | Switch from the Granite default to LEAF-IR and back to blank (AC-016) |
| API-L02c, API-L02c2, API-L02d, API-L02e (delete parts), API-L02h, API-L05 | Still valid (round 1) | Board, search service, delete hooks, failure path and companion unchanged; readiness shape unchanged |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Windows, Linux, macOS x64 desktop builds; Windows `prepare-server.mjs` | No such hosts here | The prune/runtime check on those paths | No (CI `release-desktop.yml` builds them) | Delivery: the release workflow's desktop builds run the same check |
| Docker linux/amd64 image | Only arm64 built locally (amd64 under emulation is very slow) | amd64-specific WASM issues (none known; WASM is architecture-independent) | No | Release workflow multi-arch build |
| HTTP proxy downloads (RSK-002) | Known limitation, FU-2 | Proxy-only networks cannot download | No | FU-2 |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| (Round 1, resolved in round 2 by SR-007) C-08 confirmed: the default model's relevance floor (absolute `clearMatchFloor` 0.24, calibrated on the 60-Task fixture) does not keep unrelated queries unmatched on 1,000-Task backlogs: 6/12 (generated) and 4/12 (real product-domain text) of AC-004's defined set get meaning matches, up to 20 each; AC-001's "first 5" falls to 87.3% on the generated 1,000 backlog | `Design Impact` (preliminary; relevance-rule/calibration design, G2), with a requirement question on the backlog size AC-004 must hold for | execution report API-L04 | Failure-origin review (code reviewer), then Solution Designer |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (API-D01 added)
- Reroute Required Before Validation Execution: `No` (the reroute trigger above was found during execution; the result is in the execution report)
- Recommended Owner If Reroute Required: N/A
- Notes: results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`. Round 2 (IR-003): no reroute; plan in § Round 2 Rerun Plan.
