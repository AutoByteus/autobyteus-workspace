# API/E2E Execution Coverage Report — open-file-live-refresh-452 (autobyteus-452): an open viewer shows a workspace file's new content

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1. Implementation Engineer IR-001 (SR-002), code `e0bb6399c7`, handoff `aeda3e1140`.
- Prior round reviewed: none (first round).
- Base refresh during the round: autobyteus-471 merged into `personal` first (`ed481ae4ca`) and changes `_reloadOpenFile`, which this change calls. The design says "Whoever merges second rebases and reruns the other's cases", so `origin/personal` is merged in as `2da34f6644`.
  - The only conflict was the probe's model-sheet ID. Both tickets renumbered the same duplicate MSP-32; `personal`'s MSP-38 is kept.
  - This ticket's cases are MSP-39…42 (`02650fba10`).
  - The authoritative results are on the merged state: API-07…11. API-04 is the full run before the refresh (old IDs MSP-38…41, same results).
- Deviations from the plan, and why:
  - The base refresh, and the rerun of 471's durable cases (API-09 MSP-37, API-10).
  - Five baseline test fixes, each with its cause (TESTING.md Rule 9): `0da603e62e` (duplicate MSP-32), `e30dd1b15e` (MSP-24/34/35 stale since autobyteus-469), `3db909124e` (server scan-test timeout), `899839dcae` (MSP-22 attempt counting), `0298663b07` (pairing test cleanup race).
  - MSP-41's own-save check asserts "one write, at most one read-back" instead of "no read-back": the base code reads once after an own save too (see Cases).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/open-file-live-refresh-452/tickets/in-progress/open-file-live-refresh-452/evidence/`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct` (implementation → API/E2E)
- Successful-output route: Delivery Engineer
- Proportional test-code review decision: `Not required` by policy (Medium/Low). The added and changed test paths are listed under Durable Coverage for delivery's verification.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | merged `2da34f6644` (builds), tests up to `0298663b07` | macOS 26 arm64, Node 22 | server `dist` and phone bundle `build:mobile-web` from `2da34f6644` (API-07: `contentChangeFor` in the server dist, 471's `node-file` route in the bundle) | probe-owned nodes (alpha…zeta) with temp data roots; scripted AGY CLI; clean env |
| ENV-2 | as ENV-1 | macOS, headless Chrome | phones: Chrome contexts 390×844 mapping `192.168.77.x` → 127.0.0.1, paired through Phone Access; desktop window: `nuxt dev` against alpha | Phone viewer `[data-testid="mobile-file-viewer"]`; desktop `#contentViewer` |
| ENV-0 | pre-refresh `e0bb6399c7` + `0da603e62e` | as above | API-05 rebuild | API-04 only |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | REQ-001/002 (server unit) | file-explorer handler, synchronizers, write mutation | Reused IMP-03; rerun on the merge in API-08 | ENV-1 | Pass | `evidence/API-08-merged-repository-checks/server-file-explorer.log` | `Test Files 13 passed`, `Tests 81 passed` | red on base: 6 failed (IMP-03) |
| API-02 | REQ-001/002 (web unit) | store path match, reloads, draft, own save | Reused IMP-04; included in API-08's full web suite | ENV-1 | Pass | `…/web-full.log` | `fileExplorerLiveRefresh.spec.ts` in 752 passing files | red on base 5 (IMP-04) |
| API-08 | AC-005 | full web suite, server unit, typechecks, guards on the merge | `NUXT_TEST=true vitest run` (web); `vitest run tests/unit` (server); `typecheck` ×2; `guard:web-boundary`, `guard:localization-boundary` | ENV-1 | Pass after two baseline fixes | `…/web-full.log`, `…/server-unit-full.log`, `…/server-unit-full-rerun.log`, `…/server-unit-full-rerun-2.log`, `…/typecheck-guards.log` | web `752 passed`, `5684 passed, 2 skipped`; typechecks at baseline (web 93/40, server 1180/364), guards `Passed.`; server unit, final run (`0298663b07`): `895 passed, 4 skipped` files, `7582 passed, 7 skipped` tests | Server unit run 1: 7581 passed, 1 failed: `memory-layout-cleanup-regression` timed out at 5 s. It reads 3,487 files (0.6–1.9 s alone ×3) and the run was heavily loaded (import 529 s) → `3db909124e`. Run 2: that test passes; 1 failed: `pairing-auth-service` "exchanges a single-use code…", ENOTEMPTY in `afterEach` (IMP-07's "flake"). Cause: a verified phone's last-seen is saved in the background by design, and the test removed its folder while that write ran → `0298663b07` (waits for the write queue; 10 of 10 alone) |
| API-07 | — | builds from the merge | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | ENV-1 | Pass | `evidence/API-07-merged-builds.log` | `exit 0` ×2 | lockfile unchanged by the merge |
| MSP-39 | AC-001 | real watcher → stream → desktop window and phone; `live-452/deep/inner/a.md`, folder never expanded | rewrites while open on both: in place; atomic, temp in the same folder; atomic, temp in another folder (`elsewhere/`) | ENV-2 | Pass | `API-09-merged-mobile-shell-probe/mobile-shell-probe.json` (`cases.MSP-39`), `MSP-39-*.png` | shown in ms (desktop / phone): in place 538/538, same-folder atomic 529/529, other-folder atomic 527/527; 1 read each; `folderReadsOfLive452: 0` | ≤ 3,000 ms asserted |
| MSP-40 | AC-002 | same; `pics/c.png`, `docs/d.pdf`, root image | each rewritten while open: an image of another size, a PDF with another page shape | ENV-2 | Pass | same (`MSP-40`), `MSP-40-*.png` | image 40×20 → **80×30** in 580/580 ms; PDF page ratio 2 → **4.1 / 4** (canvas) in 633/633 ms; root image → **60×20** in 526/526 ms; 1 content read each; no folder read | the PDF's new text is checked by its page shape (400×100) |
| MSP-41 | AC-003, AC-004 (own save) | desktop window, Monaco editor (Files tab → `notes/edit.md`, Edit Mode) | type ` UNSAVED-452`; rewrite on disk (`EDIT-VERSION-2`); then the window saves (`Ctrl/Cmd+S`) | ENV-2 | Pass | same (`MSP-41`), `MSP-41-desktop-edit.png` | `editKeptAfterRewrite: true`; `writes: ["live-452/notes/edit.md"]` (one); `readsAfterSave: 1`; `savedToDisk: true` | One read-back, no loop. The base code reads once too: the mark is consumed by the first `modify` (the reply's or the watcher's) and the other one reads. Confirmed at store level on the pre-452 code (`PSD-005-diagnosis/README.md`: `reads: 1` in both orders) |
| MSP-42 | AC-004 (QR-002), RSK-001 | file-explorer stream frames and network logs, both surfaces | 20 files not open (`bulk/`) rewritten; then 200 files (`burst/`) at once | ENV-2 | Pass | same (`MSP-42`) | bulk: **0 reads** on both, 20 paths reported on both; burst: **1 frame, 10,053 bytes, 200 `modify` entries, 200 unique paths, spread 0 ms** on both; **0 reads** | RSK-001 measured: one small batched frame for 200 changes |
| API-09 | AC-005, regression; 471's cases (design: rerun the other's) | full phone probe, 42 cases, on the merge | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/API-09-merged-mobile-shell-probe` | ENV-1, ENV-2 | 41 Pass, MSP-22 Fail (test cause, fixed: API-11) | `API-09-merged-mobile-shell-probe/` (`mobile-shell-probe.json`, `run.log`, logs, screenshots) | 471's MSP-37 Pass (node files read-only, refusals); MSP-38 (model sheet) Pass; MSP-28…31 (450 explicit opens) Pass; MSP-24/34/35 Pass with `nodeListed` before the close `true` ×3 and after TODO `false` on the node and every surface; `unknownBrowserErrors: 0`; cleanup `serversLeft 0`, `rootRemoved true` | MSP-22 cause below |
| API-11 | AC-005 (autobyteus-434 AC-004) | MSP-21…23 after `899839dcae` | `--cases=MSP-21,MSP-22,MSP-23`; standalone attempt check `socket-attempt-check.mjs` | ENV-1, ENV-2 | Pass | `API-11-live-reconnect-rerun/` (`mobile-shell-probe.json`, `socket-attempt-check.json`) | MSP-22(c): Team attempt **6 ms** after visible, agent catch-up read 14 ms, none while hidden; glance and hidden counts 0 under the stricter counting; check: 30 attempts recorded, **0** `websocket` events | MSP-22's cause: in API-09 the Team phone's attempt on visible ended "in connection establishment" (ERR_SOCKET_NOT_CONNECTED), for which Playwright reports no `websocket` event. Its console shows the attempt right after visible and the 2 s retry. Three instrumented reruns before the fix: Pass |
| API-06 | AC-005 (closed-task rows) | MSP-24…27, 34, 35 after `e30dd1b15e` | `--cases=MSP-24,MSP-25,MSP-26,MSP-27,MSP-34,MSP-35` | ENV-0 | Pass | `API-06-closed-rows-rerun/`; first attempt `API-06-closed-rows-rerun-1-wrapper-miss/` | node lists the copy before the close (`true`), after TODO `false` = phones and desktop; digest unchanged (`3:0f1e7af4`) | first attempt read the view's top level; the view is `{root_agent:{execution_tree, closed_task_executions}}`; the before-close check caught it |
| API-10 | AC-005 (471's desktop cases) | desktop browser probes on the merge | `test:e2e:file-explorer-pending-save-draft`, `test:e2e:search-pdf-preview` | ENV-1 | search-pdf-preview Pass; pending-save-draft 10 of 11, PSD-005 intermittent (outside this change, FU-002) | `API-10-merged-desktop-file-probes/` (`*.log`, folders), `PSD-005-diagnosis/` | `{"API-002":"Pass","API-003":"Pass"}`; PSD-001…004, 006…011 Pass; PSD-005: 1 Fail, then 3 of 3 Pass | PSD-005's cause (see Failures): a Save/draft race on the base's own path, not the live feed |
| API-04 | as API-09 | full phone probe before the refresh | `--output-dir=<evidence>/API-04-mobile-shell-probe` | ENV-0 | 38 Pass, MSP-24/34/35 Fail (stale check, fixed: API-06) | `API-04-mobile-shell-probe/` | MSP-38…41 (now 39…42) Pass with the same numbers (526–544 ms; burst 1 frame, 10,053 bytes) | superseded by API-09 |
| C-W | Windows/Linux desktop | — | — | — | Not Tested | — | — | macOS host only; watcher behavior per OS is `chokidar`'s |

## Failures In This Round And Their Resolution

| Failure | Cause | Resolution | Related to 452 |
| --- | --- | --- | --- |
| Probe would not start (two `MSP-32`) | autobyteus-9 and autobyteus-435 both added MSP-32; the probe's start check stops on a duplicate | `0da603e62e` (→ MSP-37), then `personal`'s MSP-38 at the refresh | No |
| MSP-24, MSP-34, MSP-35 (API-04) | Since autobyteus-469 a stopped copy of a closed Task leaves its root's stored tree, and `closed_task_executions` name only closed copies still in the tree. After TODO the view names the copy nowhere, so "not named closed" no longer meant "listed". The surfaces were right; the digest still counted it closed | `e30dd1b15e`: read whether the view lists the run (in `root_agent.execution_tree`, not closed), plus a before-close check; API-06, API-09 Pass. This is autobyteus-471's FU-003 (FU-003 here) | No |
| `memory-layout-cleanup-regression` (API-08) | a 3,487-file read under the 5 s default timeout, under full-suite load | `3db909124e` | No |
| `pairing-auth-service` "exchanges a single-use code…" (API-08 run 2; IMP-07) | `afterEach` removed the temp folder while the service's background last-seen write ran (ENOTEMPTY). The failing run's folder was left behind, as are 36 older ones on this machine since 2026-11-08 | `0298663b07`: wait for each device service's write queue before removing | No |
| MSP-22 (API-09) | attempts counted from Playwright's `websocket` event, which does not fire for a socket that fails while connecting; the refused path ends a connection either way at random | `899839dcae`: attempts recorded where the page constructs the WebSocket; API-11 Pass | No |
| PSD-005 (API-10), intermittent | After the window's own Save, the one re-read sets `content = null` until the fetch returns. An editor value emission in that window stores a draft equal to the saved text (`SAVED !== null`), and nothing clears it. The same re-read and code exist before 452 for these root files (store order check: `reads: 1` on both codes). With the re-read delayed 400 ms: 2 of 3 fail | Product race in the Save/draft logic, outside this change and its scope → FU-002, with the cause. Note: 452 adds the same re-read for open files in folders never expanded | No (path predates it; 452 widens where it can occur) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | MSP-39 (API-09; API-04 before the refresh), API-01 | Proven on the desktop window and the phone: in place, same-folder atomic, other-folder atomic, folder never expanded, all ≤ 538 ms | — |
| AC-002 | Yes | MSP-40, API-02 | Proven: image size and PDF page shape change visibly on both surfaces; root image too; ≤ 633 ms | — |
| AC-003 | Yes | MSP-41, API-02 | Proven: the unsaved edit survives an outside rewrite in the real editor | — |
| AC-004 | Yes | MSP-42, MSP-41, API-02 | Proven: 0 reads for 20 files that are not open (and for 200 in a burst); the own save writes once and reads back at most once (as before), no loop | — |
| AC-005 | Yes | API-08, API-09 (all 42 incl. 450's MSP-28…31 and 471's MSP-37), API-10, API-11 | Proven; PSD-005's intermittent race is outside this change (FU-002) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 96% | every AC on the real watcher, stream and both viewers, with visible content checks | Windows/Linux not run | another OS |
| Changed-boundary execution directness | 80% | 97% | real `chokidar` events (in place, atomic, cross-folder move) → real stream frames → real viewers; frames counted | — | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | real nodes, real phone bundle, a real desktop window on the merged code with 471's `_reloadOpenFile` | desktop window is `nuxt dev`, not the packaged app (no shell change) | a packaged-window case |
| Environment, configuration, identity, and fixture fidelity | 88% | 93% | probe-owned nodes, real Phone Access pairing and owner credential, merged builds | scripted runtime; headless Chrome as the phone | a device run |
| Failure, edge-case, lifecycle, and recovery evidence | 82% | 93% | atomic and cross-folder rewrites, unsaved edit, own save, 200-file burst, files not open | file deletion while open is out of scope; the neighbouring Save/draft race (FU-002) | — |
| User-surface, browser, and desktop-shell confidence | 80% | 96% | both surfaces asserted on rendered content (text, image natural size, PDF canvas shape) | — | — |
| Durable regression coverage quality and relevance | 85% | 96% | MSP-39…42 in the phone probe; the probe runs again (4 baseline fixes) | — | — |

- Overall post-repository confidence: 84%
- Overall final confidence: 95% (95.1%, simple average)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target met: `Yes`
- Confidence-limiting residual risks: Windows/Linux not run; FU-002 (Save/draft race, pre-existing path, now also reachable for files in folders never expanded)

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (the phone probe's phones and desktop window on probe-owned nodes), `Repository` (suites on the merge)
- Gap it addressed: the real watcher for atomic and cross-folder rewrites, rendered media changes, real stream volume (RSK-001), and the merge with autobyteus-471 in the same reload path

## Desktop Application Validation

- Surface: a `nuxt dev` window against a probe-owned node (the phone probe's desktop window) and 471's desktop browser probes. The packaged app was not run: this change touches no shell or opening path, and Electron local files (`route === 'local'`) get no `modify` (relative path match; absolute paths are FU-001).

## Persisted-Data Transition Checks

- Approved decision: `Not Affected`

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or retained: `No`. The stream's `modify` shape is a clean cut (DESIGN.md rule 9): the node and the web client of the same release; API-09 ran both from the same merge.

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Case IDs | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-live-file-refresh-cases.mjs` | Added (`02650fba10`) | MSP-39…42 | test files only, under `live-452/` in alpha's workspace |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated: import, call, header, runtime (`02650fba10`); baseline fix `0da603e62e` (model sheet ID; `personal`'s MSP-38 after the merge `2da34f6644`) | MSP-38…42 | — |
| `autobyteus-web/tests/e2e/mobile-closed-task-rows-cases.mjs` | Baseline fix `e30dd1b15e` | MSP-24, MSP-34, MSP-35 | stale since autobyteus-469 |
| `autobyteus-web/tests/e2e/mobile-live-reconnect-cases.mjs` | Baseline fix `899839dcae` | MSP-22 (and its glance/hidden counts) | attempts recorded where the page starts them |
| `autobyteus-server-ts/tests/unit/agent-memory/memory-layout-cleanup-regression.test.ts` | Baseline fix `3db909124e` | API-08 | timeout for the file read |
| `autobyteus-server-ts/tests/unit/remote-access/pairing-auth-service.test.ts` | Baseline fix `0298663b07` | API-08 | waits for the background last-seen write |

- Added or updated paths attached for proportional test-code review: `No` (Medium/Low; listed here for delivery)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Model inference | scripted AGY CLI (`ECHO_INPUT` for link messages) | links to the test files in a real run | transport only |
| A phone | headless Chrome 390×844, mobile, its own host mapping | no device here | — |
| An agent rewriting files | the case writes files from Node (in place, temp + rename) | the watcher sees the same file-system events | — |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Probe stacks (API-04, 06, 09, 11 and debug runs) | Yes | the probe's own cleanup | receipts: `serversLeft 0`, `rootRemoved true` |
| Desktop probe roots (API-10 and diagnosis runs) | Yes | the probes' own cleanup | `ownedRootRemoved true`, processes exited |
| MSP-22 console capture, PSD-005 read delay, order spec, closed-rows view dump | Yes | files restored from `/tmp` backups / deleted before each commit | not committed (`git status` clean apart from untracked SDK `dist/` folders, not this ticket's) |
| Debug output in `/tmp/api452-*` | Yes | left in `/tmp`; diagnosis logs copied to evidence | — |
| Evidence secret scan | — | `own_`/`mra_` 30+ chars, `access_token=` values | redacted by the probes (`access_token=…`) |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: none; Windows/Linux not run
- Next recipient: Delivery Engineer (direct route, Medium/Low)
- Notes:
  - The branch now contains the merge of `personal` (`2da34f6644`, with autobyteus-471).
  - Follow-ups: FU-001 (absolute-path files), FU-002 (Save/draft race, PSD-005), FU-003 (closes 471's FU-003 with its cause).
