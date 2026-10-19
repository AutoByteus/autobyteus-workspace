# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `tickets/in-progress/search-model-settings/requirements-doc.md` (SR-005)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-005, G1–G7)
- Supplemental Task Artifacts: approved UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/search-model-settings/ui-ux-spec.md` (design `4e4ac06`), visual references VIS-001…VIS-021 (`visual-references/`); `product-design-request.md`
- Design Review Report: `design-review-report.md` (ARCH-REV-003, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-002)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-002, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code reviewer pass handoff (CRR-002) from `/software_engineering_team/code_reviewer`
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this file, round 1

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/search-model-settings`, branch `codex/search-model-settings`, base `origin/personal` @ `8d40ba3b6c`. Code under validation: `d2bcb95d3a` (HEAD `8cbbf9afe8` adds only `tickets/`). Paths below are relative to the worktree unless absolute.

## Current Requirement And Design Basis

- Settings → Server Settings → **Embedding** (route `?section=server-settings&mode=embedding`) with:
  - **Embedding model** card: 3 catalog models with name, Default mark, state, language label and size; "On disk"; actions Download, Cancel, Remove (inline confirmation), Use this model (dialog), Retry.
  - **Project indexes** card: per-Project states; Index now, Rebuild (inline confirmation), Index all Projects; filter tabs; name filter above 8 Projects.
- Status is read-only (G3, QR-002). Polling every 2 s while work runs, otherwise every 10 s (REQ-007).
- Files of downloaded models stay until Remove; only vectors of other models are deleted (REQ-003, a persisted-policy change, `Directly Usable — No Migration`).
- Active model display: Ready / Preparing… / Not downloaded (Download) / Unavailable (Retry, which prepares at once) (DEC-009, AC-011…AC-013).
- A failed or refused action shows a red `role="alert"` line above the cards, cleared by the next action (REQ-010, AC-014).
- Server-side only. The same behavior holds on desktop and Docker nodes (REQ-008, QR-004). The status loads within 1 s at 20 Projects × 1,000 Tasks (QR-001).
- Preserved: the autobyteus-71 outcomes (AC-010).
- Code-review notes to target:
  - C-07: QR-001 on Docker or slower hardware;
  - R-9 / D-2: Use this model during a download ahead;
  - network loss during a download, and Unavailable + Retry without a board search;
  - AC-014 on the real stack;
  - AC-011 on a fresh data root;
  - AC-013 after a restart;
  - optionally, EmbeddingGemma 2 (346 MB).
- Out of scope: FU-CR-1 (`native-compaction-terminal-drain.test.ts` intermittent).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (understand), SCN-002 (download ahead, cancel, remove, offline), SCN-003 (switch, index all), SCN-004 (index now, rebuild, leave and return).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-API-1: a user's browser is connected to a **Docker node**. The section shows that node's state; downloads happen inside the container. Trigger: the Settings page of a web frontend bound to the container.
  - SCN-API-2: the node **loses its route to huggingface.co**, then gets it back: (a) before a download ahead, (b) while the active model is preparing. Trigger: a real DNS/connection failure inside a test-owned container.
  - SCN-API-3: the **node becomes unreachable** while the Settings page is open (container paused or stopped), and the user presses an action. Trigger: an action button. Expected: AC-014's red line, cleared by the next action after the node returns.
  - SCN-API-4: a user downloads the **heavy model** (EmbeddingGemma 2, 346 MB) ahead, then decides to use it **before the download ends** (R-9 / D-2). Trigger: Use this model on the downloading row.
  - SCN-API-5: the **desktop app is restarted** with the active model on disk (AC-013).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none. A Cancel pressed in the same instant as a download completes (AC-014's example) is a race, not something real use produces on purpose. AC-014 is proven through the real node-unreachable path (SCN-API-3) and the web spec.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 choose the model in Settings (writes the setting) | Added | REQ-001, REQ-004, REQ-009 | Web spec, GraphQL E2E, real-app switch, Advanced path |
| BEH-002 first-search preparation | Preserved | AC-010 | autobyteus-71 suites; board exact search during a switch |
| BEH-003 download ahead with progress, cancel, failure | Added | REQ-002 | Unit, E2E, real download incl. 346 MB, cancel, network failure |
| BEH-004 downloaded files kept until Remove | Changed | REQ-003, DEC-001 | Unit, E2E, real-app file listing after a switch |
| BEH-005 per-Project index state and actions | Added | REQ-005, REQ-006 | Unit, E2E, real-app Index now / Rebuild / Index all |
| Settings action error line | Added | REQ-010, AC-014 | Web spec + real node-unreachable run |
| Board Retry prepares at once (DS-006) | Changed | AC-012 | Real Unavailable → Retry |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `EmbeddingIndex` status/actions, `EmbeddingModelDownloads`, `EmbeddingModelFiles` cancel/remove, `ProjectTaskSearchService` index actions | Unit tests (fake model and files) | Real downloads, timing of cancel and preparation joins | Real downloads in Docker and the desktop app |
| API / transport / contract | Yes | New GraphQL queries and mutations | GraphQL E2E with the fake model | Real model on a real node | Docker GraphQL + browser |
| Frontend component / state | Yes | Embedding panel, cards, dialog, composable polling | Web spec (mocked GraphQL) | Real server states and timing | Browser on a real node |
| Browser integration / user journey | Yes | The whole section | IMP-07 probe (LEAF-IR only) on `8469d4bcf5` | Reviewed commit, heavy model, Docker node, network failure | Probe rerun; Docker + browser; desktop |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same renderer in Electron | Web spec | Packaged app | Isolated desktop instance |
| Desktop shell / Electron-specific integration | No (no Electron code) | — | — | Packaged server stage carries the change | Packaged build start |
| Process / lifecycle | Yes | Polling, restart state (AC-013), leave/return (AC-007) | Unit restart test; web spec | Real restart | Desktop restart |
| Persisted-data transition | Yes | Model folders kept; `Directly Usable — No Migration` | Unit | Existing install data | Desktop: a data root that already has the active model's folder |
| Worker / queue / distributed coordination | Yes | Concurrent indexing jobs, one worker | Unit | Real worker under Index all | Real indexing |
| External integration | Yes | huggingface.co downloads, cancel, failures | Unit with fake fetch | Real network failure and recovery | Docker container with a network toggle |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-model-settings`
- Project type and runtime stack: pnpm monorepo; Fastify/GraphQL server (Node 22.23.1 here); Nuxt renderer; Electron desktop; Docker server image.
- Project testing guideline path(s): worktree `TESTING.md` (latest: "Rerun by impact", resolved temp `HOME` for E2E, "Serialize builds and dev servers within one worktree", Docker server node rules, browser probes). No closer `TESTING*.md`.
- Conflicting, missing, or unclear project instructions:
  - The browser probe builds the server itself; the desktop build also builds it. Per TESTING.md they are serialized.
  - For the Docker node, TESTING.md suggests mounting `dist` over the user's image. The image is built from this worktree instead (same reasoning as autobyteus-71: a self-contained image of the change).
- Required environment variables or secrets available: `N/A` (public model downloads only).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Test layers, rules | Server unit/integration/E2E; clean env with resolved `HOME`; browser probes own their stack; isolated desktop instance; Docker test-owned containers on 127.0.0.1 without user volumes; serialize builds |
| `docs/isolated-app-instances.md` | Desktop instance lifecycle | `isolated-app start --build`, `restart`, `stop` |
| `autobyteus-web/tests/e2e/embedding-settings-probe.mjs` (header) | Real-stack browser probe | `pnpm -C autobyteus-web test:e2e:embedding-settings` (`--output-dir`); the frontend is bound with `BACKEND_NODE_BASE_URL` |
| `autobyteus-server-ts/tests/integration/projects/project-task-index-status-load.integration.test.ts` (header) | QR-001 load check (gated) | Gate and command in the file |
| `autobyteus-server-ts/docker/Dockerfile.monorepo` | Docker image | `docker buildx build --builder desktop-linux --load --platform linux/arm64 -f … -t ab-sms-validation:d2bcb95d3a .` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Docker test node | worktree | `docker run -d --name sms-api-node -p 127.0.0.1:<port>:8000 ab-sms-validation:d2bcb95d3a` | root in the container for the `/etc/hosts` toggle | `/rest/health` | `docker rm -f -v`; `docker rmi` |
| Nuxt dev bound to the Docker node | `autobyteus-web` | `BACKEND_NODE_BASE_URL=http://127.0.0.1:<port> pnpm dev --host 127.0.0.1 --port <p>` | Same as the probe's frontend | page loads | stop the process group |
| Headless Chrome (Playwright) | ticket probe | `playwright-core` from `autobyteus-web` with the system Chrome | Own user-data dir | — | close |
| Packaged desktop instance | worktree | `pnpm --silent isolated-app start --build` | Own data root and ports | start JSON | `isolated-app stop <id>` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| QR-001 load: 20 Projects × 1,000 Tasks on the Docker node | GraphQL `createProject` / `createProjectTask` (synthetic descriptions of realistic length) | Test-owned container only | Removed with the container |
| Indexing journeys | A few small Projects (fixture Tasks) through GraphQL | Test-owned roots | Removed with the roots |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration` (model folders kept; `embeddings.sqlite` unchanged).
- Representative existing-data setup: a data root where the active model's folder already exists (as after autobyteus-71's first search). The section must read it as is: Active · Ready, with On disk counting it.
- Evidence planned: the desktop restart case (the folder written by an earlier run is read as Ready), and the AC-003 switch case (the previous model's folder is kept).

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Req / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/embeddings/embedding-model-management.test.ts` | G3 spies; AC-011/012/013; R-9; refusals; collection states | REQ-001, REQ-005, G3 | Still Valid | Read the titles | Reused (IMP-10) |
| `tests/unit/embeddings/embedding-model-downloads.test.ts`, `embedding-model-files.test.ts`, `embedding-index.test.ts` | Flights, cancel, remove, disk usage, switch keeps files | REQ-002, REQ-003 | Still Valid | — | Reused (IMP-10) |
| `tests/unit/projects/project-task-search.test.ts` | indexStatus without sync; index/rebuild/index all | REQ-005, REQ-006 | Still Valid | — | Reused (IMP-10) |
| `tests/e2e/projects/embedding-settings.e2e.test.ts` | GraphQL status and actions with a fake model; Advanced path | AC-001…AC-006, AC-009, AC-011, AC-012 | Still Valid | — | Rerun (clean env) |
| autobyteus-71 E2E (`project-task-search*.e2e.test.ts`) | Preserved search and tool | AC-010 | Still Valid | — | Rerun |
| `tests/integration/projects/project-task-index-status-load.integration.test.ts` (gated) | QR-001 at 20 × 1,000 | QR-001 | Still Valid | — | Rerun on `d2bcb95d3a` |
| `autobyteus-web/components/settings/embedding/__tests__/EmbeddingSettingsPanel.spec.ts` | Panel states, actions, polling, AC-014 | REQ-001…REQ-007, REQ-010 | Still Valid | — | Reused (IMP-12) |
| `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` API-007 (found failing in API-R03) | "REQ-003 (Projects): there is no status-changing operation": asserts that the mutations whose names match `/projecttask/i` are exactly create/delete/update | Projects REQ-003 (another ticket); this ticket's REQ-006 adds `indexProjectTasks`, `rebuildProjectTaskIndex`, `indexAllProjectTasks` (design § Interface Boundary Mapping) | Needs Update | Fails on `d2bcb95d3a` only because the three approved index mutations match the name filter; it passes at the base `8d40ba3b6c` (no index mutations). The index mutations maintain the search index and change no Task; the test's intent still holds | Update the filter to exclude the index-maintenance mutations explicitly, keeping the exact Task-mutation list (API-D01) |
| `autobyteus-web/tests/e2e/embedding-settings-probe.mjs` | Real-stack journeys EMB-001…008 | AC-001…AC-007, AC-011, AC-013 | Still Valid | IMP-07 ran on `8469d4bcf5` | Rerun on the reviewed commit |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | all server | Server types | Reused | IMP-09 | Ran on `d2bcb95d3a`; header and `exit 0` |
| API-R02 | AC-001…AC-006, AC-011…AC-013, G3 | Server unit | Reused | IMP-10 (+ IMP-10b) | Ran on `d2bcb95d3a`; its single failure is FU-CR-1 (out of scope) |
| API-D01 | Projects REQ-003 preserved; REQ-006 contract | Schema of the real GraphQL | Durable | Update `projects-graphql.e2e.test.ts` API-007, rerun the file | — |
| API-R03 | AC-001…AC-006, AC-009, AC-010, AC-011, AC-012 | Real GraphQL (fake model) | Existing Test | `env -i … HOME="$(cd "$(mktemp -d)" && pwd -P)" … vitest run tests/e2e/projects tests/e2e/server-settings --no-watch` | — |
| API-R04 | QR-001 | Status load (gated) | Existing Test | the gated load test (gate in its header) | Rerun on the reviewed commit, then on Docker (API-L02) |
| API-R05 | web | Web suite and guards | Reused | IMP-05, IMP-06 (`8469d4bcf5`) + IMP-12 (`d2bcb95d3a`) | No web source changed after `8469d4bcf5` (`git diff --name-only 8469d4bcf5 d2bcb95d3a -- autobyteus-web` lists only a spec and a doc) |
| API-R06 | AC-001…AC-007, AC-011, AC-013 | Real-stack browser probe | Existing Test | `pnpm -C autobyteus-web test:e2e:embedding-settings --output-dir=<evidence>` (clean env) | Rerun on the reviewed commit (asked by the reviewer) |
| API-R07 | licences | Repository checks | Existing Test | `check_licensing.py`, `check_repository_artifact_hygiene.py` | — |
| API-L01 | AC-008, QR-004, AC-011, AC-001, QR-002 | Docker node + browser | Journey | Image from `d2bcb95d3a`; Nuxt dev bound to the container; open Embedding on a fresh root; nothing downloads; facts and states | Docker run |
| API-L02 | QR-001 (C-07) | Docker node GraphQL + browser | Temporary Probe | Seed 20 × 1,000 Tasks; time the panel's status document and the first panel render | Machine-dependent measurement |
| API-L03 | AC-002 (offline), REQ-002 | Docker node + browser | Journey | Block huggingface.co in the container; Download ahead → "Download failed: …huggingface.co…" + Retry; restore; Retry → Downloaded | Real network failure |
| API-L04 | AC-012 | Docker node + browser | Journey | Block, Download on the Active row → Unavailable + reason + Retry (Projects Unavailable, Index all disabled); restore; Retry → Preparing → Ready without a board search | Same |
| API-L05 | AC-014, REQ-010 | Docker node + browser | Journey | Pause the container; press an action → red `role="alert"` line; unpause; next action clears it | Real unreachable node |
| API-L06 | AC-006, AC-007 (Docker) | Docker node + browser | Journey | Index now / Rebuild / Index all on small Projects; leave the page and return during indexing | Same |
| API-L07 | AC-014 setup, AC-001, AC-011, persisted data | Packaged desktop | Journey | `isolated-app start --build`; fresh root: Active · Not downloaded; nothing downloads on open | Real packaged app |
| API-L08 | AC-002, R-9 / D-2, AC-004, AC-003 | Packaged desktop | Journey | Download EmbeddingGemma 2 ahead (346 MB); during it, Use this model → dialog → confirm → row Active · Preparing with no Cancel; board search returns exact matches meanwhile; after ready, the previous model's files are kept (Downloaded) and Remove frees them | Heavy model, real timing |
| API-L09 | AC-002 (cancel) | Packaged desktop | Journey | Download ahead, Cancel mid-way → Not downloaded, no partial files, On disk back | Same |
| API-L10 | AC-013, AC-007, AC-009 | Packaged desktop | Journey | Leave during work and return; restart → Active · Ready; Advanced value shows as Active | Same |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

None planned. The repository already has unit, GraphQL E2E, web spec and a real-stack probe. The added journeys need a container, a network toggle or a 346 MB download, which do not belong in the repository suites.

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-D01 | `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` (API-007) | Keep asserting exactly create/delete/update as the Task mutations, and name the approved index-maintenance mutations (`indexProjectTasks`, `indexAllProjectTasks`, `rebuildProjectTaskIndex`) as the only others matching `/projecttask/i` | Found by API-R03; the implementation's checks ran only the embedding E2E files (IMP-03/IMP-11). Test-code review requested with the result |

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron with an embedded Node server.
- Testing guideline used: `TESTING.md`, `docs/isolated-app-instances.md`.
- Web-equivalent behavior: the whole section. Shell-specific behavior: none changed; the packaged server stage carries the server change.
- Chosen approach: packaged worktree build in an isolated instance, driven through CDP.
- How the run avoids disturbing an already-running desktop application: own ports, data root and process group.

## Live Environment And Fixture Plan

- Startup order: browser probe (it builds the server) → Docker image build (does not touch the worktree's outputs) → Docker journeys → desktop build (serialized after the probe) → desktop journeys.
- Environment choices: shared M1 Max host (load varies); memory and timing results note the load.
- Seed data: GraphQL only; fixture Task descriptions from `autobyteus-server-ts/tests/fixtures/project-task-search/tasks.json` and the autobyteus-71 generator (`…/project-task-semantic-search/evidence/probes/API-PROBE-generate-backlog.mjs` in that ticket's archive, or an equivalent generator kept with this ticket's probes).
- Evidence: DOM state and text, screenshots compared with VIS-*, GraphQL responses, container file listings, timings.
- Cleanup: the container, the image, the frontend process, Chrome profiles, the isolated instance and its data root, temp folders.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Windows, Linux, macOS x64 desktop; Docker amd64 | No such hosts | Low: no platform code changed | No | Release workflow builds |
| A Cancel pressed in the instant a download completes | A race that real use does not produce on purpose | AC-014's line is the same path as API-L05 and the web spec | No | — |

## Ambiguities Or Reroute Triggers

None at investigation time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (API-D01 updates a stale assertion)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: results, confidence and the broader-validation decision go in `api-e2e-execution-coverage-report.md`.
