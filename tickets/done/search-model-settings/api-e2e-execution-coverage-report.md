# API/E2E Execution Coverage Report

## Round

- Coverage investigation (the plan; it lists the upstream documents): `tickets/in-progress/search-model-settings/api-e2e-coverage-investigation.md` (round 2: § Round 2 Rerun Plan)
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2. The code reviewer passed IR-003/IR-004 (CRR-005), which implement SR-007:
  - QR-001 redefined by DEC-012;
  - DEC-013 copy;
  - REQ-011 / AC-015, index after Task writes;
  - CR-003, a write that changes no description loads no model.
- Prior round reviewed: round 1 (`API-REV-001`, Fail F-001 on `d2bcb95d3a`)
- Deviations from the investigation's plan, and why:
  - A power-off at 15:20 interrupted API-L02b. The desktop instance, its temp data root and `/tmp/sms-api2` were lost; the partial file (header only) was discarded. The case was redone from the start on a new instance of the same packaged build (`isolated-app start --from-worktree`), with the data reseeded. Cases completed before the power-off kept their saved evidence (progress log, 15:20 and 15:44 rows).
  - API-L02b took 8 more samples of the realistic sequence (the Projects list, then the Embedding status 5 s later), so the desktop QR-001 result rests on a rate rather than on a few borderline readings.
  - API-L08 (R-9 / D-2) is still valid from round 1 (investigation table). The probe's EMB-003/004 rerun the switch on `8c283c6acc`.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-model-settings/tickets/in-progress/search-model-settings/evidence/api-e2e/` (the handoff message gives the commit)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`. The test is `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` (API-D01, commit `c02a54bc3e`), unchanged since round 1.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `8c283c6acc` (HEAD `231dec76f8` adds only `tickets/`) | macOS (Darwin 25.5) arm64, Apple M1 Max, 10 cores, 64 GB | Node 22.23.1 | Shared host; the load average is recorded with each timing |
| ENV-2 | `8c283c6acc` | same host | Browser probe: built server on a fresh temp root, Nuxt dev bound to it, system Chrome headless | Real LEAF-IR downloads |
| ENV-3 | `8c283c6acc` | Docker Desktop linux/arm64 VM (10 CPUs) on the same host | Image `ab-sms-validation:8c283c6acc` (Node 22.23.3); data in the container's file system | Container `sms-api-node2` on `127.0.0.1:54346`, no volumes. Nuxt dev bound with `BACKEND_NODE_BASE_URL`, headless Chrome 1440×1180 driven by `probes/API-PROBE-panel.mjs`. Seeded with no model on disk: Alpha docs (10), Beta platform (20), Gamma desktop (8), Empty project, Load 1…20 (1,000 each) |
| ENV-4 | `8c283c6acc` | same host | Packaged desktop built by `pnpm --silent isolated-app start --build`; instances `iso-56939-a508` (fresh open), then after the power-off `iso-50179-e4cd` (`--from-worktree`, same build) | Fresh data roots (removed). `iso-50179-e4cd` was seeded with no model on disk: Desktop demo (8), Load 1…20 (1,000 each) |

Round-1 environments (`d2bcb95d3a`) are recorded in `api-e2e-revision-record.md`; their evidence files remain.

## Cases

Evidence paths are relative to the evidence folder (round-2 files carry `r2`, or are new IDs). The implementation's evidence is in `../implementation/`.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | all server | Types | Reused: IMP-21 | — | Pass | `../implementation/IMP-21-ir004-server-typecheck.log` | header `Commit tested: 8c283c6acc`; Pass | — |
| API-R02 | AC-001…AC-006, AC-011…AC-013, AC-015, CR-003 | Server unit | Reused: IMP-23 (and IMP-22, the CR-003 test with its unfixed control) | — | Pass | `../implementation/IMP-23-ir004-server-unit-suite.log`, `IMP-22-ir004-cr003-test-and-unfixed-control.log` | `Test Files  741 passed \| 4 skipped (745)`, `Tests  6072 passed` | `native-compaction-terminal-drain.test.ts` is out of scope (autobyteus-103 Part 4) |
| API-R03, API-D01 | AC-001…AC-006, AC-009, AC-010, AC-015 (composition); Projects REQ-003 | Real GraphQL (fake model) | Reused: IMP-24 (`tests/e2e/projects` + server settings on `8c283c6acc`) | — | Pass | `../implementation/IMP-24-ir004-server-graphql-e2e.log` | `Test Files  8 passed \| 17 skipped (25)`, `Tests  52 passed` | Includes my updated `projects-graphql.e2e.test.ts` (round 1 `API-D01-projects-graphql-e2e.log`) |
| API-R04 | QR-001 (service level) | Gated load test | Reused: IMP-14 (`70bb03632c`) | — | Pass | `../implementation/IMP-14-ir003-qr001-status-load.log` | `"firstLoadMs":773`, `"medianRefreshMs":25` | IR-004 changed only the write path; the read helper was refactored with the same reads. The real-app desktop timing is API-L02b |
| API-R05 | web | Web suite and guards | Reused: IMP-18, IMP-19 (`70bb03632c`) | — | Pass | `../implementation/IMP-18-ir003-web-nuxt-suite.log`, `IMP-19-ir003-web-guards.log` | `Test Files  637 passed \| 2 skipped (639)`; three `Passed` | Web changed after `70bb03632c` only in the probe |
| API-R06 | AC-001…AC-007, AC-011, AC-013, AC-015 | Real-stack browser probe | `cd autobyteus-web && env -i PATH HOME=<resolved temp> TMPDIR COREPACK_HOME=… node tests/e2e/embedding-settings-probe.mjs --output-dir=<evidence>` | ENV-2 | Pass | `API-R06-r2-browser-probe/README.md`, `result.json` | `"result": "Pass"`, EMB-001…008; EMB-006 `"ms":3257` (new Task indexed with no search); `browserErrors: []`; `tempRoot: removed` | — |
| API-R07 | licences | Repository checks | `python3 scripts/check_licensing.py`; `python3 scripts/check_repository_artifact_hygiene.py` | ENV-1 | Pass | `API-R07-r2-licensing-hygiene.log` | `Licensing is consistent.`; `Repository artifact hygiene check passed.` | — |
| API-L11a | AC-015 alternate | Docker node | 20,038 Task creations through GraphQL with no model on disk; the container's `embeddings/` | ENV-3 | Pass | `API-L11-01-docker-writes-without-model.txt` | `ls: cannot access '/home/autobyteus/data/embeddings'` | A write never starts a download |
| API-L02 | **QR-001 / DEC-012 (Docker)** | Docker node GraphQL | After each container restart: `probes/API-PROBE-dec012-timing.mjs <url> status-first\|projects-first 10`, both orders twice (24 Projects, 20,038 Tasks, no model) | ENV-3 | Pass | `API-L02-r2-01-docker-dec012.txt` | refresh medians `8`–`9` ms, max `21`; status first `2111` / `1764` ms; Projects list first `1852` / `1780` ms and repeated medians `1785`–`2176` ms (range 1,440–2,709) | Host load average 92–108. The first load lies inside the Projects list's own range; refreshes no longer read the backlog (round 1: 1.8–2.0 s each) |
| API-L01 | AC-001, AC-011, QR-002, AC-008; QR-001 (browser) | Docker node + browser | Open the Embedding page 3 times; snapshot; container 20 s later | ENV-3 | Pass | `API-L01-r2-01-docker-open.txt`, `API-L01-r2-02-docker-fresh-many-projects.png` | `msToCards` `536`, `417`, `409`; `Active·Not downloaded`; `On disk: 0 MB`; `All 24Needs indexing 23Indexing 0Ready 1`; no `embeddings` 20 s later | The page opened after the server had read the fingerprints once |
| API-L03 | O-1, AC-002 (offline) | Docker node + browser, real DNS failure | Block huggingface.co; Download LEAF-IR; `ls -la` models; restore; Retry | ENV-3 | Pass | `API-L03-r2-01-o1-failed-download.txt`, `API-L03-r2-02-download-failed.png` | `Download failed: Could not reach huggingface.co to download the model: fetch failed`; `models/` listing shows only `.` and `..`; after Retry `Downloaded ['use', 'remove'] On disk: 24 MB` | O-1 resolved: no empty model folder |
| API-L05 | AC-014, REQ-010 / DEC-013, O-2, O-4 | Docker node + browser; node stopped | `docker stop`; Download on EmbeddingGemma 2; row buttons; `docker start`; Download (next action); Cancel | ENV-3 | Pass | `API-L05-r2-01-o4-o2-node-stopped.txt`, `API-L05-r2-02-couldnt-reach-server.png` | `actionError: 'Couldn’t reach the server.' role: alert`; `[["download",false],["use",false]]` (enabled); next action `actionError None`, `Downloading 0 of 346 MB`; Cancel → `Not downloaded` | O-2 and O-4 resolved |
| API-L04 | AC-012, D-5 | Docker node + browser | Block; Download on the Active row; restore; Retry (Settings only) | ENV-3 | Pass | `API-L04-r2-01-unavailable-retry.txt` | `Active·Unavailable \| Unavailable: Could not reach huggingface.co…`; `projects unavailable: 24 of 24 with actions: 0`; Index all disabled with its title; Retry → `Loading the model…` → `Active·Ready` at 7.7 s | — |
| API-L11 | **AC-015**, REQ-011 | Docker node: GraphQL writes, Settings and search | (a) `createProjectTask` in Alpha + `updateProjectTask` (new description) in Beta; Settings polled, no search; meaning searches. (b) Create in Gamma + description edit in Alpha; the read-only `projectTaskIndexes` polled every 250 ms | ENV-3 | Pass | `API-L11-02-docker-index-after-writes.txt`, `API-L11-03-docker-server-index-timing.txt` | (a) `create saved in 70 ms`, `edit saved in 14 ms`; both `Ready · 11 Tasks` / `Ready · 20 Tasks`; `Load Projects not indexed: 20 of 20`; meaning searches return the new and the edited Task. (b) `+3272 ms … INDEXING`, `+3804 ms Alpha docs: READY \| Gamma desktop: READY` | The indexing is server-side within 3.8 s. An already-open panel showed it at its next 10 s idle poll (11.2 s in (a)); see O-5 |
| API-L12 | **CR-003**, AC-013 | Docker node after a restart | `docker restart`; Settings; node RSS and threads; `updateProjectTask` on Alpha t03 with the unchanged description and `dependsOnTaskIds`; 10 s; control: a description edit | ENV-3 | Pass | `API-L12-01-docker-no-model-load.txt` | after restart `Active·Ready`, Projects Ready; threads `23` → `22` after the dependency-only write (no worker), Settings `Active·Ready`; control → threads `26` (model loaded) | — |
| API-L06 | AC-006, AC-007 | Docker node + browser | Index now on Load 1 (1,000 Tasks); leave to /projects for 5 s and return; until Ready; Rebuild Beta | ENV-3 | Pass | `API-L06-r2-01-indexing.txt`, `API-L06-r2-02-indexing-large.png` | `Indexing 56 of 1000` → (left and returned) `Indexing 80 of 1000` → Ready after 244 s more; Beta `Ready · 20 Tasks` after Rebuild | Host load average 145 |
| API-L07 | AC-011, AC-001, QR-002 | Packaged desktop, fresh root | `isolated-app start --build`; open Embedding; 20 s later | ENV-4 | Pass | `API-L07-r2-01-desktop-fresh.txt`, `API-L07-r2-02-desktop-fresh.png` | `Active·Not downloaded ['download']`; `On disk: 0 MB`; no `embeddings` in `server-data` | The build's `Embedding runtime validation passed` |
| API-L02b | **QR-001 / DEC-012 (desktop host)** | Packaged desktop GraphQL | After each `isolated-app restart`: `API-PROBE-dec012-timing.mjs` both orders twice; `API-PROBE-first-load-sequence.mjs` status-cold ×3 and projects-then-status (5 s apart) ×11 (21 Projects, 20,008 Tasks, no model) | ENV-4 | Pass | `API-L02b-01-desktop-dec012.txt`, `API-L02b-02-desktop-first-load-samples.txt` | refresh medians `4` ms (max 14); status as the first request `950`, `909`, `849`, `997`, `928` ms; after a Projects list 5 s earlier `883`, `1204`, `840`, `674`, `672`, `671`, `765`, `721`, `617`, `711`, `709` ms | 15 of 16 first loads within 1 s; the outlier (1,204 ms) at load average 13. Back-to-back reads with no gap (1,171 / 1,652 ms) are not a navigation a user can make. The Projects list's own first read here is 769–1,112 ms. Host load average 7–54 |
| API-L11b | **AC-015** through the UI | Packaged desktop | Granite: Download on the Active row; New task page (create) and the Task page of `desktop-demo-3` (edit description); `projectTaskIndexes` polled every 250 ms; Settings; meaning searches | ENV-4 | Pass | `API-L11-04-desktop-ui-index-after-writes.txt`, `API-L11-05-desktop-settings-after-writes.png` | `uiSaveMs` `84` and `107`; `+2886 ms … INDEXING 0/9`, `+3399 ms … READY total 9`; Settings `Ready · 9 Tasks`; `Load Projects Not indexed: 20`; meaning searches return the created Task and `project_task_cba0352a…` (= t33, the edited one) | — |
| API-L12b | **CR-003**, AC-013 | Packaged desktop after a restart | `isolated-app restart`; Settings; embedded server threads (`ps -M`) and footprint; dependency-only `updateProjectTask`; 10 s; control: a description edit | ENV-4 | Pass | `API-L12-02-desktop-no-model-load.txt` | after restart `Active·Ready`, `Ready · 9 Tasks`; `threads 27 Footprint: 433 MB` → `threads 26 Footprint: 433 MB`; control → `threads 30 Footprint: 684 MB` | — |
| API-L08 | AC-002, AC-003, AC-004, R-9 / D-2 | Packaged desktop | Round 1 (`d2bcb95d3a`) | ENV-4 (round 1) | Pass (still valid) | `API-L08-*` (round 1) | see round 1 | The flight/join and switch code is unchanged apart from O-1 (exercised in API-L03); the probe reruns the switch (EMB-003/004) |
| API-L10 | AC-013 | Restart | Covered this round by API-L12 / API-L12b (Docker and desktop restarts: `Active·Ready`) and probe EMB-007 | — | Pass | `API-L12-01-…`, `API-L12-02-…` | `after restart: … Active·Ready` | — |

## Findings

- F-001 (round 1: QR-001 on Docker) is **resolved** under SR-007 / DEC-012.
  - Docker: refreshes take 8–21 ms (they read no Task), and the first load (1.76–2.11 s) is within the existing Projects list's own range (1.44–2.71 s) for the same backlog.
  - Desktop host: refreshes median 4 ms, and 15 of 16 first loads are within 1 s.
- Observations:
  - **O-5 (new, for the design owner): write-triggered indexing is shown on an already-open panel only at its next idle poll.** The panel polls every 10 s unless its last read showed work (DS-001). Indexing that the server starts after a write (REQ-011) is not known to the panel until that poll. In API-L11(a) the open panel showed Ready 11.2 s after the writes, while the server had finished in about 3.8 s (API-L11(b)); a longer run would show its progress up to 10 s late. AC-015's indexing is met; opening Settings shows the state at once. Whether the idle cadence is still right now that the server starts work on its own is a design-level choice (REQ-007's "at least every 2 seconds" was written for work the user starts). Not blocking.
  - O-3 (base behavior, round 1): Settings reads `section`/`mode` only on mount.
  - O-1, O-2 and O-4 are resolved (API-L03, API-L05).

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-L01, API-L07, API-R06 | Proven | — |
| AC-002 | Yes | API-L03, API-L05 (Cancel), API-R06; round 1 API-L08 (346 MB) | Proven | — |
| AC-003 | Yes | API-R02; round 1 API-L08 | Proven | — |
| AC-004 | Yes | API-R06 (EMB-003/004), API-R03; round 1 API-L08 (board during a switch) | Proven | — |
| AC-005 | Yes | API-L01, API-L07, API-R02 | Proven | — |
| AC-006 | Yes | API-L06, API-L04, API-R06 | Proven | — |
| AC-007 | Yes | API-L06, API-R06 EMB-007 | Proven | — |
| AC-008 | Yes | API-L01, API-L03…API-L06, API-L11, API-L12 (Docker node from a browser) | Proven | — |
| AC-009 | Yes | API-R03; round 1 API-L08 (Advanced value shown as Active) | Proven | — |
| AC-010 | Yes | API-R03 (autobyteus-71 E2E), API-L11 (meaning search) | Proven | — |
| AC-011 | Yes | API-L01, API-L07, API-R06 | Proven | — |
| AC-012 | Yes | API-L04 | Proven | — |
| AC-013 | Yes | API-L12, API-L12b, API-R06 | Proven | — |
| AC-014 | Yes | API-L05, API-R05 | Proven (DEC-013 copy) | — |
| AC-015 | Yes | API-L11 (Docker), API-L11b (desktop UI), API-L11a (alternate), API-R06 EMB-006 | Proven (indexed ≤ 3.8 s; saves 14–107 ms; O-5 noted) | — |
| QR-001 (DEC-012) | Yes | API-L02 (Docker), API-L02b (desktop), API-R04 | Proven (desktop: 15 of 16 first loads ≤ 1 s) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 95% | Every AC and QR-001 measured on Docker and the packaged desktop | The desktop first load has a thin margin (one sample at 1.2 s) | A quieter dedicated host |
| Changed-boundary execution directness | 90% | 95% | Real write path (UI and GraphQL), real restarts, real status reads at 20 × 1,000 | — | — |
| Cross-boundary integration realism and mock gap | 90% | 95% | Real models, real DNS failure, real stopped node, real process memory and threads | — | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | Fresh roots, test-owned container, 20 × 1,000 seeded through the public API | Docker Desktop VM stands in for a Linux server; shared host load | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | Offline, Unavailable, node down, Cancel, restarts, no-description writes with controls | — | — |
| User-surface, browser, and desktop-shell confidence | 90% | 95% | Browser on Docker; packaged desktop including the New task and Task pages | O-5 display delay (design cadence) | — |
| Durable regression coverage quality and relevance | 95% | 95% | Unit (incl. CR-003 with its control), E2E, web spec, probe (EMB-006); API-D01 | — | — |

- Overall post-repository confidence: 91%
- Overall final confidence: 95% (simple average)
- Calculation method: simple average.
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks:
  - the desktop first load's thin margin on a shared host;
  - O-5;
  - Windows, Linux and macOS x64 desktop, and Docker amd64, are not built here;
  - the Project store's whole-backlog read (DEC-012 follow-up).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Other` (Docker node + browser), `Project Desktop Validation` (packaged instance), and the repository's real-stack probe.
- Confidence gap it addresses:
  - the redefined QR-001 on both targets with host load;
  - AC-015 through the UI and on Docker;
  - CR-003 on real processes;
  - O-1, O-2 and O-4 on the real stack;
  - reruns by impact of the status, index and marks changes.
- Browser validation needed: yes (Docker node from a browser; desktop renderer).

## Desktop Application Validation

- Approach executed: `isolated-app start --build`, then (after the power-off) `--from-worktree` and `restart`, driven through CDP.
- Web-equivalent behavior: API-L07, API-L11b. Lifecycle: API-L02b, API-L12b.
- Effect on any already-running desktop application: `None`
- Behavior not directly proven: Windows, Linux and macOS x64 desktop.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Directly Usable — No Migration`.
- Representative existing data used: model folders and vectors written before restarts (API-L12, API-L12b).
- Approved transition followed without an unnecessary migration: `Yes`. The fingerprint inputs are in memory only, with no new persisted format (a restart rebuilds them; AC-013 holds).
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none material.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed by API/E2E: `Yes` (round 1, unchanged since)

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` (API-007) | Updated in round 1 (commit `c02a54bc3e`): the Task-mutation name filter exempts exactly the three approved index mutations and asserts they exist | API-D01, API-R03 | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Network loss | `/etc/hosts` entry for huggingface.co inside the test-owned container | Real, reversible DNS/connection failure for one host | A drop mid-transfer was not forced |
| Unreachable node | `docker stop` / `docker start` | Real refused connection | — |
| Linux server | Docker Desktop linux/arm64 VM | No separate Linux host | File-system speed may differ |
| Task status change without an agent | `updateProjectTask` with the unchanged description and new `dependsOnTaskIds` (the Task page's dependency edit) | Status changes come from agents; a dependency commit sends the same `taskChanged` mark (IR-003 decision 6) | — |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probes `evidence/api-e2e/probes/` (new: `API-PROBE-dec012-timing.mjs`, `API-PROBE-first-load-sequence.mjs`) | Yes | Kept | Kept |
| Docker container `sms-api-node2`, image `ab-sms-validation:8c283c6acc`, Nuxt dev, headless Chrome | Yes | `docker rm -f -v`, `docker rmi`, process groups terminated | Removed (`Deleted: sha256:2e7bbdb9…`); ports free |
| Isolated instances `iso-56939-a508` (lost at the power-off with its temp data root) and `iso-50179-e4cd` | Yes | `pnpm --silent isolated-app stop iso-50179-e4cd` | `wasRunning True dataRootRemoved True`; `isolated-app list` empty |
| Browser probe's node, frontend, Chrome and temp root | Yes (the probe) | The probe's cleanup | `tempRoot: removed` |
| `/tmp/sms-api2` | Yes | Lost at the power-off, recreated, then `rm -rf` | Removed |
| `autobyteus-web/electron-dist`, `autobyteus-server-ts/dist` (build outputs) | Yes (untracked) | Left in place | Kept |

## Preliminary Classification (On `Fail`)

N/A — `Pass`.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): `None`
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (rule: "When API/E2E validation passes, the carried classification is task_size=Large or architectural_risk=High, and the cumulative evidence package requires proportional test-code review.")
- Notes: F-001 is resolved under DEC-012. O-5 is noted for the design owner (non-blocking). API-D01 needs the proportional test-code review.
