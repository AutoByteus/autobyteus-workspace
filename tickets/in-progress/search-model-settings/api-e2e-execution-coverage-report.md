# API/E2E Execution Coverage Report

## Round

- Coverage investigation (the plan; it lists the upstream documents): `tickets/in-progress/search-model-settings/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; code reviewer pass CRR-002 (`/software_engineering_team/code_reviewer`)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - API-R03 found a stale assertion in an older durable test. It is updated as API-D01 (planned after the finding; the investigation records the decision).
  - API-L09 (Cancel on the desktop) was folded into API-L05: the Cancel of a real EmbeddingGemma 2 download ran on the Docker node. The probe's EMB-002 cancels a LEAF-IR download on a plain node.
  - R-9 / D-2 is entered through Settings → Server Settings → Advanced (REQ-009). In the Embedding card, "Use this model" is hidden on a model that is downloading ahead (D-2), so the Advanced setting is the real way to switch to it during that download.
  - The first R-9 attempt missed its window: my script navigated to Advanced by changing the URL query, which the page does not follow (observation O-3), and the 346 MB download finished meanwhile. It was repeated with sub-navigation clicks.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-model-settings/tickets/in-progress/search-model-settings/evidence/api-e2e/` (the handoff message gives the commit)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` when the result passes (the updated `projects-graphql.e2e.test.ts`). This round is `Fail`: failure-origin review is requested.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `d2bcb95d3a` (HEAD `8cbbf9afe8` adds only `tickets/`) | macOS (Darwin 25.5) arm64, Apple M1 Max, 10 cores, 64 GB | Node 22.23.1; suites from source | E2E with `env -i PATH HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR`; host load average 8–60 |
| ENV-2 | `d2bcb95d3a` | same host | Browser probe: built server on a fresh temp data root, Nuxt dev bound to it, system Chrome headless | Real LEAF-IR downloads |
| ENV-3 | `d2bcb95d3a` | Docker Desktop linux/arm64 VM (10 CPUs) on the same host | Image `ab-sms-validation:d2bcb95d3a` from `autobyteus-server-ts/docker/Dockerfile.monorepo`, Node 22.23.3; data in the container's overlay file system | Test-owned container `sms-api-node` on `127.0.0.1:61597`, no volumes. Browser: Nuxt dev from this worktree bound with `BACKEND_NODE_BASE_URL`, headless Chrome 1440×1180 driven by `probes/API-PROBE-panel.mjs` |
| ENV-4 | `d2bcb95d3a` | same host | Packaged `AutoByteus_enterprise_macos-arm64` built by `pnpm --silent isolated-app start --build`; instance `iso-63817-8353` (restarted once) | Fresh data root (removed); driven through CDP with `probes/API-PROBE-panel.mjs` |

## Cases

Evidence paths are relative to the evidence folder. The implementation's evidence is in `../implementation/`.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | all server | Server types | Reused: IMP-09 (`tsc -p tsconfig.build.json`) | — | Pass | `../implementation/IMP-09-ir002-server-typecheck.log` | exit 0 | Ran on `d2bcb95d3a` |
| API-R02 | AC-001…AC-006, AC-011…AC-013, G3 | Server unit | Reused: IMP-10 (+ IMP-10b) | — | Pass (in scope) | `../implementation/IMP-10-ir002-server-unit-suite.log`, `IMP-10b-ir002-intermittent-rerun.log` | 6,060 passed, 7 skipped, 1 failed (`native-compaction-terminal-drain.test.ts`); isolated 5/5 | Out of scope: FU-CR-1 (the reviewer's follow-up; the file has no diff from the base) |
| API-D01 | Projects REQ-003 (no status mutation), preserved; this ticket's REQ-006 contract | Real GraphQL schema | Updated `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` API-007; `env -i … vitest run tests/e2e/projects/projects-graphql.e2e.test.ts` | ENV-1 | Pass | `API-D01-projects-graphql-e2e.log`; before: `API-R03-graphql-e2e.log` | before: `× API-007: … without touching the Project or offering a status mutation` (`expected [ 'createProjectTask', …(5) ] to deeply equal [ 'createProjectTask', …(2) ]`); after: `Tests  11 passed (11)` | The approved index mutations (`indexProjectTasks`, `indexAllProjectTasks`, `rebuildProjectTaskIndex`) matched its `/projecttask/i` filter. The update names them as the only exemption and asserts they exist; any other new Task mutation still fails it. Passes at the base without them |
| API-R03 | AC-001…AC-006, AC-009, AC-010, AC-011, AC-012 | Real GraphQL (fake model) | `env -i PATH HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects tests/e2e/server-settings --no-watch` | ENV-1 | Pass (after API-D01) | `API-R03-graphql-e2e.log` | `✓ tests/e2e/projects/embedding-settings.e2e.test.ts (5 tests)`, both autobyteus-71 search files ✓, `server-settings-graphql (11 tests)` ✓ | The only failure was API-007 (API-D01) |
| API-R04 | QR-001 (host) | Status load, 20 × 1,000 on the host disk | `RUN_PROJECT_INDEX_STATUS_LOAD=1 pnpm -C autobyteus-server-ts exec vitest run tests/integration/projects/project-task-index-status-load.integration.test.ts --no-watch` | ENV-1 | Pass | `API-R04-qr001-host-load.log` | `✓ answers one status poll within 1000 ms` | My excerpt filter missed the timing line. The implementation recorded a 626 ms median (IMP-04) |
| API-R05 | web | Web suite and guards | Reused: IMP-05, IMP-06 (`8469d4bcf5`) and IMP-12 (`d2bcb95d3a`) | — | Pass | `../implementation/IMP-05-web-nuxt-suite.log`, `IMP-06-web-guards.log`, `IMP-12-ir002-web-embedding-and-settings-tests.log` | 637 files passed; guards Passed; 44 files / 253 tests | No web source changed after `8469d4bcf5` (`git diff --name-only 8469d4bcf5 d2bcb95d3a -- autobyteus-web` lists only the spec and a doc) |
| API-R06 | AC-001…AC-007, AC-011, AC-013 | Real-stack browser probe | `cd autobyteus-web && env -i PATH HOME=<resolved temp> TMPDIR COREPACK_HOME=… node tests/e2e/embedding-settings-probe.mjs --output-dir=<evidence>` | ENV-2 | Pass | `API-R06-browser-probe/README.md`, `result.json`, `VIS-*.png`, `backend.log` | `"result": "Pass"`, EMB-001…EMB-008 Pass, `browserErrors: []`, cleanup `tempRoot: removed` | Rerun on the reviewed commit |
| API-R07 | licences | Repository checks | `python3 scripts/check_licensing.py`; `python3 scripts/check_repository_artifact_hygiene.py` | ENV-1 | Pass | `API-R07-licensing-hygiene.log` | `Licensing is consistent.`; `Repository artifact hygiene check passed.` | — |
| API-L01 | AC-008, QR-004, AC-001, AC-011, AC-005, QR-002 | Docker node + browser | Open `/settings?section=server-settings&mode=embedding` on the fresh node (3 small Projects, 1 empty); snapshot at open and 25 s later; the container's `embeddings/` | ENV-3 | Pass | `API-L01-01-open-fresh.txt`, `API-L01-02-fresh-default.png` | `granite-embedding-small-english-r2 \| Active·Not downloaded \| Languages: English·Download size: 55 MB \| ['download']`; LEAF-IR 24 MB and EmbeddingGemma 2 346 MB `['download', 'use']`; `On disk: 0 MB`; Projects `Not indexed`, empty one `Ready · 0 Tasks`; `ls: cannot access '/home/autobyteus/data/embeddings'` 25 s later | Screenshot matches VIS-001 (Default mark, Active tint, one source line) |
| API-L03 | AC-002 (offline), REQ-002 | Docker node + browser, real DNS failure | `/etc/hosts` maps huggingface.co to loopback; Download on LEAF-IR; restore; Retry on the row | ENV-3 | Pass | `API-L03-01-download-failed-retry.txt`, `API-L03-02-download-failed.png`, `API-L03-03-downloaded.png` | `Download failed: Could not reach huggingface.co to download the model: fetch failed` with `['use', 'retry']`, `On disk: 0 MB`; after Retry `0 of 24 MB · 0%` → `11 of 24 MB · 47%` → `Downloaded` with `['use', 'remove']`, 4 verified files | Observation O-1: an empty `mdbr-leaf-ir` folder stays after the failure (no files; On disk 0 MB) |
| API-L04 | AC-012, D-5 | Docker node + browser | Hosts blocked; Download on the Active row (Granite); restore; Retry on the row; only the Settings page was open | ENV-3 | Pass | `API-L04-01-active-unavailable-retry.txt`, `API-L04-02-active-unavailable.png`, `API-L04-03-active-ready.png` | `Active·Unavailable`, `Unavailable: Could not reach huggingface.co to download the model: fetch failed`, `['retry']`; every Project `Unavailable` with no actions; Index all `disabled: True`, title `Retry the model above to continue indexing.`; after Retry `Active·Preparing…` `Downloading the model: 0 → 52 of 55 MB` → `Active·Ready` at 7.7 s | No board search: the browser was on Settings throughout |
| API-L05 | AC-014, REQ-010; AC-002 (Cancel); QR-003 (partial files) | Docker node + browser; node unreachable | `docker stop sms-api-node`; Download on EmbeddingGemma 2; `docker start`; Download again (next action); Cancel at ≥ 7 MB | ENV-3 | Pass | `API-L05-01-node-unreachable.txt`, `API-L05-02-node-unreachable-error.png`, `API-L05-03-gemma-downloading.png` | `actionError: 'Failed to fetch' role: alert`, models still shown; after the next action `actionError None`, `Downloading 0 of 346 MB`, `['cancel']`; mid-download `On disk: 86 MB` with `model_quantized.onnx_data.part`; after Cancel `Not downloaded`, `On disk: 79 MB`, folder gone | The red line sits above the cards. For an unreachable node the message is the browser's fetch error (no server can answer). O-2: the pressed row's buttons stay disabled until a read succeeds again |
| API-L06 | AC-006, AC-007, REQ-006, REQ-007 | Docker node + browser | Index all; leave to `/projects` for 2 s and return; Rebuild Beta (inline confirmation); a new Task in Gamma; Index now | ENV-3 | Pass | `API-L06-01-indexing.txt`, `API-L06-02-rebuild-confirmation.png`, `API-L06-04-all-ready.png`, `API-L06-03-needs-update.png` | `right after Index all: ['Indexing 0 of 10', 'Indexing 0 of 20', 'Ready · 0 Tasks', 'Indexing 0 of 8']`; after return all `Ready · N Tasks`; confirmation `Rebuild “Beta platform” from scratch? Meaning search is exact-only until it finishes.`; `Indexing 0 of 20` → `Ready · 20 Tasks`; `Needs update · 1 changed` with `['index', 'rebuild']` within one 10 s poll; `Indexing 0 of 1` → `Ready · 9 Tasks` | Screenshot matches VIS-009 |
| API-L02 | **QR-001** (C-07), QR-004 | Docker node: GraphQL and browser at 20 × 1,000 | Seed 20 Projects × 1,000 Tasks (GraphQL); `API-PROBE-status-timing.mjs` (the panel's status document, 20 rounds; 5 after a restart); 5 browser opens; `API-PROBE-status-breakdown.mjs` (each root field, and the existing board reads) | ENV-3 | **Fail** | `API-L02-01-qr001-status-timing.txt`, `API-L02-03-status-breakdown.txt`, `API-L02-02-many-projects.png` | `"ms":{"first":2255,"median":2017,"p90":3550,"max":3946},"projects":24,"tasks":20039`; browser `msToCards` 2248…2514; breakdown `embeddingModelsStatus only` median 4 ms, `projectTaskIndexes only` 1797 ms, `projects list` 1805 ms, `projectTasks for all 24 Projects` 2196 ms | Budget 1 s. Host load average 8–15 at the time. See Findings F-001 |
| API-L07 | AC-011, AC-001, QR-002; persisted data | Packaged desktop, fresh data root | `pnpm --silent isolated-app start --build`; open Embedding; snapshot at open and 20 s later; data-root listing | ENV-4 | Pass | `API-L07-01-desktop-fresh.txt`, `API-L07-02-desktop-fresh.png` | `Active·Not downloaded` with `['download']`; `On disk: 0 MB`; the `server-data` listing has no `embeddings` | The packaged build's runtime check passed (`Embedding runtime validation passed`) |
| API-L08 | AC-002, AC-003, AC-004, R-9 / D-2, REQ-009, UXJ-003 | Packaged desktop | (1) Download on the Active row (Granite), Index now; (2) Download ahead EmbeddingGemma 2; at 10 MB, Server Settings → Advanced: `AUTOBYTEUS_EMBEDDING_MODEL = embeddinggemma-2`; back to Embedding; (3) Remove (EmbeddingGemma 2 from an earlier full download) with confirmation; (4) board right after the switch and after a Rebuild: exact query, then a paraphrase; vectors per model; (5) Remove the previous model | ENV-4 | Pass | `API-L08-01-granite-ready-indexed.txt`, `API-L08-05-r9-switch-during-download.txt`, `API-L08-05-r9-a-download-ahead.png`, `API-L08-05-r9-b-active-preparing.png`, `API-L08-04-remove-gemma.txt`, `API-L08-04-remove-confirmation.png`, `API-L08-06-board-during-switch.txt`, `API-L08-07-board-exact-during-rebuild.txt`, `API-L08-07-board-a-board-preparing.png`, `API-L10-01-remove-previous-restart.txt` | (1) `Downloading the model: 0 → 34 of 55 MB`, `Loading the model…`, `Active·Ready` at 7.7 s; `Ready · 8 Tasks`. (2) download ahead `["cancel"]` only; after the switch `"status":"Active·Preparing…","preparing":"Downloading the model: 13 of 346 MB · 4%","actions":[]`, climbing to `336 of 346` then `Active·Ready`; Granite `Downloaded` `["use","remove"]`; subtitle `Using Google EmbeddingGemma 2.`; Project `Not indexed`. (3) `Remove Google EmbeddingGemma 2? This frees 346 MB.`, focus `…-remove-cancel`, folder gone. (4) vectors `granite … 8` → `embeddinggemma-2 … 8`; board `Preparing meaning search… 0 of 8 Tasks` with the exact match `Auto-update downloads the full installer every time`, then the paraphrase finds `Server memory keeps growing during long runs`. (5) `On disk: 401 MB` → `346 MB`, only `embeddinggemma-2` left; the Active row has no Remove | The joined download kept its bytes (13 MB, not 0) |
| API-L10 | AC-013, AC-007 | Packaged desktop restart | `pnpm --silent isolated-app restart iso-63817-8353`; open Embedding | ENV-4 | Pass | `API-L10-01-remove-previous-restart.txt`, `API-L10-02-after-restart-ready.png` | `after restart: … ('embeddinggemma-2', 'Active·Ready', [])`, `On disk: 346 MB`, `['Ready · 8 Tasks']` | AC-007 (leave and return): API-L06 and the probe's EMB-007 |

## Findings

### F-001 — QR-001 is not met on a Docker node: the section's status takes about 2 s at 20 Projects × 1,000 Tasks (budget 1 s) — Fail

- Criteria: QR-001 ("The section's status loads within 1 s; up to 20 Projects, 1,000 Tasks each"), with REQ-008 / QR-004 (same behavior on desktop and Docker nodes); reviewer note C-07.
- Expected: the status document within 1 s at 20 × 1,000.
- Observed on the Docker node (ENV-3, linux/arm64 on the M1 Max host, data in the container's file system):
  - 20 rounds of the panel's status document: first 2,255 ms, median 2,017 ms, p90 3,550 ms, max 3,946 ms;
  - after a container restart: first 1,742 ms;
  - in the browser, 2.2–2.5 s until the cards render.
- On the host disk, the gated test passes (API-R04; IMP-04: 626 ms median).
- Where the time goes (`API-L02-03-status-breakdown.txt`):
  - `embeddingModelsStatus` alone takes 4 ms;
  - `projectTaskIndexes` alone takes 1,797 ms;
  - for comparison, the **existing** `projects` list query takes 1,805 ms, and reading every Project's Tasks through the existing `projectTasks` takes 2,196 ms.
  - So the status cost is the Project store reading all ~20,000 `task.json` files on that file system. The embedding layer's fingerprint read is not the bottleneck. This is the implementation's RSK-001 and its named follow-up ("cache Task fingerprints per Project").
- User effect: on a large Docker node, opening Settings → Server Settings → Embedding shows the loading state for about 2–2.5 s. Each 10 s idle poll costs about 2 s of server reads. Nothing is wrong functionally.
- Preliminary classification: `Design Impact`. Meeting the target on such nodes needs a cheaper read of Task state (e.g. the fingerprint cache under the Project store owner, which the design deferred). A related requirement question is whether QR-001's 1 s target must hold on Docker nodes at the full 20 × 1,000 size, for the Solution Designer and possibly the user. Recommended owner: Solution Designer, after the code reviewer's failure-origin review.
- Note: the same Project store cost already makes the existing Projects list take 1.8 s on that node. That base behavior is outside this ticket; it is the reason the new section inherits the time.

### Observations (non-blocking)

- O-1: after a failed download ahead, an empty model folder stays (no files; "On disk: 0 MB"; the next download reuses it).
- O-2: while the node is unreachable, the row whose action failed keeps its buttons disabled until a status read succeeds again (they worked as soon as the node returned).
- O-3: Settings reads `section` and `mode` from the URL only when the page mounts. A query change without a remount (e.g. browser Back/Forward between sub-sections) does not switch the sub-section. This is the base behavior for every mode; this ticket only added `embedding` to it.
- O-4: AC-014's message for an unreachable node is the browser's fetch error ("Failed to fetch"), since no server can answer. For server refusals the web spec covers the server's message (IMP-12).

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-L01, API-L07, API-R06, API-R05 | Proven | — |
| AC-002 | Yes | API-L03 (offline + Retry), API-L05 (Cancel, partial files), API-L08 (346 MB), API-R06 | Proven | — |
| AC-003 | Yes | API-L08 (files kept, vectors replaced, Remove frees; no Remove on Active), API-R02 | Proven | — |
| AC-004 | Yes | API-L08 (switch; board exact then meaning), API-R06 (dialog, Cancel changes nothing), API-R03 | Proven | — |
| AC-005 | Yes | API-L01, API-L07 (opening starts nothing), API-R02 (G3), API-R06 | Proven | — |
| AC-006 | Yes | API-L06, API-L04 (Unavailable → Projects Unavailable, Retry at the model), API-R06 | Proven | — |
| AC-007 | Yes | API-L06 (leave and return), API-R06 EMB-007 | Proven | — |
| AC-008 | Yes | API-L01, API-L03…API-L06 (Docker node from a browser) | Proven (behavior). The Docker node's QR-001 timing fails: F-001 | — |
| AC-009 | Yes | API-L08 (Advanced value shown as Active), API-R03 (`updateServerSetting` path; invalid rejected) | Proven | — |
| AC-010 | Yes | API-R03 (autobyteus-71 search E2E), API-L08 (board search), API-R02 | Proven | — |
| AC-011 | Yes | API-L01 (Docker), API-L07 (desktop), API-R06 EMB-001 | Proven | — |
| AC-012 | Yes | API-L04 | Proven | — |
| AC-013 | Yes | API-L10, API-R06 EMB-007 | Proven | — |
| AC-014 | Yes | API-L05 (node unreachable on the real stack), API-R05 (IMP-12 web spec incl. server refusals) | Proven | — |
| QR-001 | Yes (approved quality target) | API-R04 (host: Pass), API-L02 (Docker: Fail) | **Not Proven** on Docker (F-001) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 50% | Every AC proven on real stacks | QR-001 fails on the Docker node (F-001) | A cheaper status read, then rerun API-L02 |
| Changed-boundary execution directness | 85% | 95% | Docker node and packaged desktop with real downloads, failures, restart | Windows/Linux not run | Release builds |
| Cross-boundary integration realism and mock gap | 80% | 95% | Real models (incl. 346 MB), real DNS failure, real unreachable node | — | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 90% | Fresh roots, test-owned container, 20 × 1,000 data | Docker Desktop VM on a Mac stands in for a Linux server; timings depend on the host | A native Linux node for timings |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | Offline, Unavailable + Retry, node down, Cancel, restart | — | — |
| User-surface, browser, and desktop-shell confidence | 90% | 95% | Browser on Docker, packaged desktop, VIS comparisons | — | — |
| Durable regression coverage quality and relevance | 90% | 90% | Unit, E2E, web spec, probe; API-D01 fixes a stale assertion | QR-001 is gated and host-only | A gated load check on a slower file system |

- Overall post-repository confidence: 86%
- Overall final confidence: 87% (simple average); it does not hide the failing target.
- Calculation method: simple average.
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` — QR-001 on Docker (F-001).
- Any final applicable category below `90%`: `Yes` — requirement and acceptance-criteria proof (50%).
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-001; Windows/Linux/macOS x64 desktop and Docker amd64 not built here.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Other` (Docker node + browser), `Project Desktop Validation` (packaged instance), and the repository's real-stack browser probe.
- Confidence gap it addresses: AC-008 / QR-004 on Docker; real network failure and recovery; an unreachable node (AC-014); the heavy model and R-9; restart (AC-013); QR-001 on Docker (C-07). It closed everything except F-001, which it found.
- Browser validation needed: yes. The browser was bound to the Docker node, and the desktop renderer was driven in the packaged app.

## Desktop Application Validation

- Approach executed: `isolated-app start --build`, then `restart`, driven through CDP (`probes/API-PROBE-panel.mjs`).
- Cases proving web-equivalent behavior: API-L07, API-L08. Lifecycle: API-L10. Packaging: the build's runtime check (API-L07 Notes).
- Effect on any already-running desktop application: `None`
- Behavior not directly proven: Windows, Linux and macOS x64 desktop.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Directly Usable — No Migration`.
- Representative existing data used: model folders written by earlier runs in the same data root (Granite, then EmbeddingGemma 2), read after a switch and after a restart.
- Approved transition followed without an unnecessary migration: `Yes`.
  - After a switch the previous model's folder is kept and shown as Downloaded (API-L08).
  - After a restart the active folder is read as Ready (API-L10).
  - Vectors of the other model are replaced (API-L08).
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none material.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` (API-007) | Updated: the Task-mutation name filter exempts exactly the three approved index mutations and asserts they exist; the exact list create/delete/update is kept | API-D01, API-R03 | — |

- Added or updated paths attached for proportional test-code review: `No` (this round is `Fail`; the path is listed for the failure-origin reviewer and for a later test review)
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Network loss | `/etc/hosts` entry for huggingface.co inside the test-owned container | A real DNS/connection failure for one host, reversible | A drop in the middle of a transfer was not forced |
| Unreachable node | `docker stop` / `docker start` of the test-owned container | A real refused connection | — |
| Linux server | Docker Desktop linux/arm64 VM on the Mac host | No separate Linux host | File-system speed may differ from a native server |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probes `evidence/api-e2e/probes/API-PROBE-panel.mjs`, `API-PROBE-status-timing.mjs`, `API-PROBE-status-breakdown.mjs`; reused autobyteus-71 probes in `tickets/done/project-task-semantic-search/evidence/probes/` | Yes | Kept as evidence | Kept |
| Docker container `sms-api-node` and image `ab-sms-validation:d2bcb95d3a` | Yes | `docker rm -f -v`, `docker rmi` | Removed (`Deleted: sha256:cb0e8adf…`) |
| Nuxt dev frontend bound to the container; headless Chrome profile | Yes | Process group terminated; profile in `/tmp/sms-api` removed | Ports free |
| Isolated instance `iso-63817-8353` and its data root | Yes | `pnpm --silent isolated-app stop iso-63817-8353` | `wasRunning True dataRootRemoved True`; `isolated-app list` empty |
| Browser probe's node, frontend, Chrome and temp root | Yes (the probe owns them) | The probe's cleanup | `tempRoot: removed` |
| `/tmp/sms-api` (backlog, maps, logs) | Yes | `rm -rf` | Removed |
| `autobyteus-web/electron-dist`, `autobyteus-server-ts/dist` (build outputs) | Yes (untracked) | Left in place | Kept |

## Preliminary Classification (On `Fail`)

- `Design Impact` for F-001: QR-001 at 20 × 1,000 on a Docker node needs a cheaper read of Task state than the Project store's full file reads. There is a related requirement question about QR-001's scope on Docker nodes.
- Recommended owner: Solution Designer, after the code reviewer's failure-origin review.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check (IDs): QR-001 on the Docker node (F-001). No user-only parts.
- Preliminary classification and recommended owner: `Design Impact` → Solution Designer (via failure-origin review).
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (rule: "When API/E2E validation fails and the complete failure package requires focused failure-origin review by the code reviewer.")
- Notes:
  - Every acceptance criterion's behavior is proven on the Docker node, the packaged desktop app and the probe.
  - One durable test was updated (API-D01); it belongs in the next test review.
