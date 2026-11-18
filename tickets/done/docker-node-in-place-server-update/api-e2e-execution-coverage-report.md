# API/E2E Execution Coverage Report — autobyteus-305, build step 4 (desktop: node version and "Update to <version>")

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

Earlier rounds:

| Round | Step | Revision | Result | Report |
| --- | --- | --- | --- | --- |
| 1 | 1 | API-REV-001 | Pass, 95% | git `48c2d82ea1` |
| 2 | 2 | API-REV-002 | Pass, 94.7% | git `c052bb1aff` |
| 3 | 3 | API-REV-003 | Pass, 94.7% | git `e7e76ac2c0` |

Steps 1–3 are merged and released (v1.5.11-beta.6). This file now holds the round-4 result.

## Round

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/api-e2e-coverage-investigation.md`
- Revision: `API-REV-004`; progress log `api-e2e-test-progress.md` (section "Round 4")
- Round and trigger: round 4, after code review Pass of build step 4 (CRR-007)
- Prior round reviewed: round 3 (Pass). Nothing was open from it.
- Deviations from the plan:
  - API-41 needed a second driver run in the same window (run 2). Two run-1 failures were fixture faults, found and redone (API-41 Notes):
    - a read taken too early;
    - a random host port that Docker reassigns on `docker start`.
  - Driver run 1 completed every scenario.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/evidence/` (files `API-41-*`; folders `API-41-desktop/`, `API-41-desktop-run2/`)

## Routing Classification

- `Large` / `High`, input `Reviewed`, success route `Code Review`.
- Test-code review: `Not Applicable` (no durable test code changed).

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-6 | `5618071c7f` (docs on top of `6412b7e4fd`; code `deead7bf05`) | macOS 26.5.2 arm64 | Isolated desktop instance `iso-61359-e30d` from `pnpm --silent isolated-app start --build` of this worktree (Electron 42.11.16, app 1.5.11-beta.6, own data root and ports), driven over its control port with `playwright-core` `connectOverCDP` | The app's own update checks off (isolated profile); English, then zh-CN through Settings → Language, then back to English |
| ENV-7 | same | Docker Desktop 29.0.1, host daemon | Test nodes `ab305-api4-{i,p,l,f,g,h,r,r2}`: label `autobyteus.ab305-api=round4`, fresh volumes `…-data` and `…-packages`, `127.0.0.1` ports, no launcher label. Image `ab305-api4-node:testkey` = `autobyteus-server-305-test:step4` (clean clone of `deead7bf05`) + the throwaway public key, built-in labelled 1.5.11-beta.5 (as IMP4's); P from `autobyteus-server-305-test:step1` | `AUTOBYTEUS_SERVER_PACKAGE_SOURCE=http://host.docker.internal:<port>/<variant>/releases` per container. The release source on host loopback serves variants of 1.5.11-beta.6: `good` (4 MB/s), `fail` (migrates, exits 30 s after start), `lvl99` (system level 99). All are built with the IMP3 harness's `make()` from the step-4 image's own package and signed with a fresh throwaway key (deleted) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-40 | AC-001, AC-009, AC-010, REQ-011, CR3-N1 | Web suite (4889 tests) and guards, server and starter tests, image, real-app main path, phone 403 | Reused IMP4-01..IMP4-06 | — | Pass | — | — | Only `tickets/` changed since `deead7bf05` |
| API-41 | AC-001, AC-009 (desktop request and client-address log), AC-010, REQ-011, RU-41..RU-48 | The real desktop app (renderer, store, C1 POST, CORS) with real starters | `node evidence/API-41-desktop-drive.mjs 61359 evidence/API-41-desktop ab305-api4-node:testkey autobyteus-server-305-test:step1 <source port> <worktree>`; then `evidence/API-41-desktop-drive-run2.mjs` in the same window (copy and R2) | ENV-6, ENV-7 | Pass | `API-41-desktop/drive-log.jsonl`, `requests.json`, `API-41-*.png`, `README.txt`; `API-41-desktop-run2/drive-log.jsonl`, `*.png`; the scripts and Dockerfile `API-41-*` | See the per-item rows below | Run 1 had 3 `CHECK FAIL`s, all fixture faults, redone in run 2 with 0 failures. (a) **Copy:** run 1 read the button text synchronously after the click, but the copy is asynchronous (`await navigator.clipboard.writeText`, then "Copied"). Run 2 read it 500 ms later: `"after":"Copied"`, `writeText ok`, and the macOS clipboard held `autobyteus-docker upgrade --all --tag 1.5.11-beta.6`. (b), (c) **R:** node R was published with `-p 127.0.0.1::8000`, and `docker start` gave it a new random host port (61852 → 62239). The row correctly kept polling the registered address every 10 s (`requests.json`: GETs at 10 s intervals until the end), but that address was dead. The launcher always gives a node fixed ports, so R2 reran with a fixed host port and passed |
| API-41 / item 1 (RU-41) | AC-004 on the desktop | Failed update clicked from the row | Node F (`fail`), click | ENV-6/7 | Pass | `API-41-F-*.png`, drive-log | `Starting the update…` → `Checking the update to 1.5.11-beta.6…` → `Preparing 1.5.11-beta.6…` → `Restarting…` → `Server 1.5.11-beta.6 Restarting…` → `Server 1.5.11-beta.5 Update to 1.5.11-beta.6 Same version as this app The update to 1.5.11-beta.6 did not happen. 1.5.11-beta.6 did not come up (it exited with code 3 within 60 s of answering); 1.5.11-beta.5 runs again on the data as it was before the update.`; node: `FAILED_AFTER_SWITCH`, built-in, migration table absent | The button stays (`CHECK PASS: F: the row shows the old version again and the button stays`) |
| API-41 / item 2 (RU-42) | AC-005 on the desktop | NEEDS_NEW_IMAGE from the row | Node L (`lvl99`), click; copy | ENV-6/7 | Pass | `API-41-L-*.png`, `API-41-desktop-run2/API-41-L-copied.png` | `The update to 1.5.11-beta.6 did not happen. This update needs a new Docker image: it needs system level 99, this image provides 1. Get it with: autobyteus-docker upgrade --all --tag 1.5.11-beta.6`; copy title `autobyteus-docker upgrade --all --tag 1.5.11-beta.6`; run 2 `"after":"Copied"` | — |
| API-41 / item 3 (RU-43) | REQ-011 progress | A slow source | Node G (`good`, 4 MB/s), click | ENV-6/7 | Pass | `API-41-G-*.png` | `Downloading 1.5.11-beta.6…` for 82 s (22:51:03 → 22:52:26), then `Preparing…`, `Restarting…`, `Server 1.5.11-beta.6 Updated to 1.5.11-beta.6.`; same container and image; node log `"requestedFrom":"172.17.0.1"` | AC-001 and the AC-009 log part |
| API-41 / item 4 (RU-44) | DS-005 timings | A long outage during an update | R2: click, `docker stop` at the first `Restarting…` (node step `confirming`), 30 s after "Not reachable" `docker start` | ENV-6/7 | Pass | `API-41-desktop-run2/API-41-R2-*.png`, drive-log | `Restarting…` (23:15:55) → `Not reachable. Last known: updating to 1.5.11-beta.6.` (23:20:56, `secondsDownBeforeUnreachable` ≈ 300) → after `docker start` (23:21:26), within one 10 s poll (23:21:36): `Server 1.5.11-beta.5 Update to 1.5.11-beta.6 … The update to 1.5.11-beta.6 did not happen. The update to 1.5.11-beta.6 was interrupted; this node runs 1.5.11-beta.5 again.` | The node's boot recovery rolled the halted trial back (`INTERRUPTED`), and the row recovered with no click or reload |
| API-41 / item 5 (RU-45) | REQ-011, DS-002 | An update started from the host while the row is visible | Node H; `autobyteus-docker update --name ab305-api4-h --version 1.5.11-beta.6` (real bash launcher, private state dir with one state file); the page is reopened 10 s later | ENV-6/7 | Pass | `API-41-H-*.png`, drive-log (`host launcher` lines) | Before the reopen: `Server 1.5.11-beta.5 Update to 1.5.11-beta.6 Same version as this app` (idle rows are not polled, by design). After it: `Downloading…` → `Preparing…` → `Restarting…` → `Server 1.5.11-beta.6 Updated to 1.5.11-beta.6.`, in step with the launcher's own lines; node log `"requestedFrom":"host command"` | Until the page asks again, the row still offers the button. A click then would get the node's `UPDATE_RUNNING` refusal (a gate, unit-tested), not a second update |
| API-41 / item 6 (RU-46) | Localization | zh-CN render | Settings → Language → 简体中文, then Nodes → Manage | ENV-6/7 | Pass | `API-41-zhCN-manage.png`, `API-41-zhCN-manage-full.png`, drive-log `zh-CN lines` | `服务器 1.5.11-beta.5 更新到 1.5.11-beta.6 与本应用版本相同`; `无法访问。`; `… 到 1.5.11-beta.6 的更新未完成。 This update needs a new Docker image: … 复制命令` | **Observation:** the reasons come from the node's starter in English (`update.message`), so a zh-CN row mixes Chinese chrome with an English reason. This follows the design (the row shows the node's `message`) and the frozen C2 contract. Whether to translate known codes on the desktop is a product choice for the Solution Designer |
| API-41 / item 7 (RU-47) | N-4 | A node on a pre-starter image | Node P (`step1` image) | ENV-6/7 | Pass | `API-41-P-pre-starter.png` | `Not reachable.` and no button, under a row whose node dot is green (reachable) | As decided (N-4, CC-07, rule 9). **Observation for the Solution Designer:** right after a desktop with step 4 ships, every node still on an image before step 2 shows "Not reachable." under a reachable row until the owner runs `upgrade --all`. That includes the user's current nodes. The wording may read as a fault |
| API-41 / item 8 (RU-48) | AC-010 | 24 min with an older node in the list, never clicked | Node I added first and kept the whole session (page opened 5 times) | ENV-6/7 | Pass | `API-41-desktop/requests.json`, drive-log `AC-010 record` | `"minutes":24,"iGets":4,"iPosts":0`; I's starter: no `update-requested`, still 1.5.11-beta.5; all POSTs in the window are exactly the four clicked nodes, one each | GETs come only when the page opens or the app's version becomes known (idle rows are not polled) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001: click "Update to <version>" → the node runs B in the same container and image; the desktop shows B and "updated" | Yes | API-41 items 3 and 5; API-40 (IMP4-06) | Proven | — |
| AC-009: phone refused; no agent tool; a desktop's network request is accepted and logged with its client address | Yes | API-41 item 3 (`requestedFrom` `172.17.0.1`), API-40 (IMP4-06 phone 403 on POST and GET; the no-tool grep), round 2 API-21 (a really paired phone on C1) | Proven | — |
| AC-010: nothing changes on any node until the user acts | Yes | API-41 item 8 (24 min, recorded network), API-40 (unit: 30 min) | Proven | — |
| REQ-011 / BEH-007 on the desktop: version, progress, result, why not | Yes | API-41 items 1–7 | Proven | — |
| AC-004, AC-005 as shown on the desktop | Yes | API-41 items 1 and 2 (the node behavior is round 3) | Proven | — |
| AC-007 | — | — | Not in step 4 | Step 5 |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | 95% | API-41, API-40 | — | — |
| Changed-boundary execution directness | 85% | 95% | The packaged app's renderer against real starters, real CORS, real timers | — | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | Real node-side outcomes behind every row state; a real host command | Local release source and test key (the release path is round 3 and the first release) | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | Isolated app of this worktree; the node image from a clean clone. R2 uses fixed ports like the launcher | macOS only | — |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | Failure, refusal, a 5-minute outage with recovery, a pre-starter node, a host-started update | — | — |
| User-surface, browser, and desktop-shell confidence | 80% | 95% | Every reviewer item rendered in the real app, in English and zh-CN, with screenshots | English reasons in zh-CN; the "Not reachable" wording for pre-starter nodes (both by design) | Product decisions |
| Durable regression coverage quality and relevance | 93% | 93% | 4889 web tests incl. 21 for the store and row with fake timers; server and starter tests | The real-app journeys are not durable (a packaged app plus Docker) | — |

- Overall post-repository confidence: 86% (below 90% in six categories, so broader validation was required)
- Overall final confidence: 94.7% (simple average)
- Every critical acceptance criterion directly proven: `Yes`
- Any final category below 90%: `No`
- 95% target met: `No`, 94.7%. The gap is that the desktop journeys are not durable automation, which would need the packaged app plus Docker nodes in CI. The behavior they cover is unit-tested with fake timers.
- Residual risks:
  - the two product observations (items 6 and 7) and CR4-N1 (no confirmation), all for the Solution Designer;
  - FU-006.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Mode: `Project Desktop Validation` (isolated instance, driven like a user), with lifecycle actions on the test nodes
- Gap addressed: the reviewer's eight items were unit-tested only, or not seen in the real app.

## Desktop Application Validation

- Approach: the project's isolated instance of a worktree build (TESTING.md Rule 1), driven over its control port; nothing else on the machine changed.
- Web-equivalent behavior (row, store) and shell-specific behavior: the renderer in the packaged Electron app, using the app's version from the shell, sends cross-origin requests to the nodes.
- Effect on the user's running AutoByteus: `None`. Own data root, ports and process group; `isolated-app list` shows no instance after `stop`.
- Side effect: the copy-button test put `autobyteus-docker upgrade --all --tag 1.5.11-beta.6` on the macOS clipboard.

## Persisted-Data Transition Checks

- Not changed by step 4. Node-side outcomes as in round 3: F rolls its migration back; R2 recovers an interrupted trial.

## Compatibility / Legacy Scope Check

- `No` compatibility mechanisms. Old nodes get the generic state (N-4).

## Durable Coverage Changed In The Codebase

- None.

## Dependencies Mocked Or Emulated

| Dependency | Method | Limitation |
| --- | --- | --- |
| GitHub releases, production key | Throwaway key; local source with variants of 1.5.11-beta.6 | Release path proven in round 3 and by the beta.6 release (DR-003) |
| A node older than the app | Built-in labelled 1.5.11-beta.5 (as IMP4) | The selection reads only that field |
| A node machine going down mid-update | `docker stop`/`start` of the node's container, with a fixed host port in R2 | — |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Isolated instance `iso-61359-e30d` | Yes | `pnpm --silent isolated-app stop` | Stopped; `list` shows none |
| Test nodes `ab305-api4-*` and their volumes (label `round4`); `ab305-api4-node:testkey` | Yes | `docker rm -f -v`, `docker volume rm`, `docker image rm` | Removed (0 left) |
| Release source process; `/private/tmp/ab305-api-e2e` incl. the throwaway private key and packages | Yes | `kill`; `rm -rf` | Removed |
| `autobyteus-web/electron-dist` build output | Yes (worktree build) | Untracked; left for reuse | Kept, not committed |
| The implementation's images, `ab305-extract`; the user's `autobyteus-server-0/1/2` and volumes | No | Not touched | Untouched |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven: none for step 4
- Next recipient: code reviewer (Large/High pass; no test code changed)
- Notes:
  - For the Solution Designer:
    - English node reasons in a zh-CN row;
    - "Not reachable." under reachable pre-starter nodes, which is the user's current nodes;
    - CR4-N1.
  - A host-started update shows on an open row only after the page asks again (by design).
