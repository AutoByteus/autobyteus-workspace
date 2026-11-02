# API/E2E Execution Coverage Report — automatic-app-node-updates (autobyteus-356)

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/`.

**Safety:** only run-owned isolated desktop copies with their own bundle id, run-owned data roots, a local feed and (round 1) test-owned Docker containers were used. The user's installed app, `~/.autobyteus`, its updater caches (identical before and after in every round: `API-00-r3-user-caches-before.log`, `API-99-r3-cleanup.log`) and the user's nodes `autobyteus-server-0/1/2` were not touched. Paid turns: one haiku run for API-03-r3.

## Round

- **Round 4 (current, API-REV-004):** CRR-007 Pass on IR-004, the merge with `personal` after autobyteus-363 (DR-001).
  - Merge `08984df524`, local only. Review `482e9ce797`, built from a clean detached checkout of it.
  - No behavior change outside the Nodes UI: `git diff b0445f49b9 08984df524 -- autobyteus-web/electron` is empty (`API-10-r4-ac006.log`), so round 3's real-Squirrel results stand.
  - The plan is in the investigation's § Round 4. Results are under § Cases → Round 4. Rounds 1–3 follow.
- Coverage investigation: `api-e2e-coverage-investigation.md` (§ Round 3 and § Round 4)
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-004`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 3; CRR-005 Pass on IR-003 (SR-004..SR-006).
  - Code: `2e64cbb3d9`.
  - Handoff: `ed3f0d50f5`, `88814a7182`.
  - Review: `99b53b84e8`, built from a clean checkout of it.
- Deviations from the plan, and why:
  - **API-11 ran four times:**
    - API-11a: harness fault; Download was clicked before any check had found V2.
    - API-11b: Check and switch-on 7 s after Squirrel's fetch.
    - API-11c: the same, 65 s after it.
    - API-11: 150 s after it, the actual staged path.

    The script first took Squirrel's "Download completed" log line as Squirrel being ready. That line marks only its fetch; its unpack and verify follow. API-11b and API-11c therefore show what happens when a second native fetch starts over the first one (O-6).
  - API-12a, API-12b and API-12c were added to answer CR-C19 in its real-use forms. V3 (`1.5.11-beta.12`) was built for them.
- Machine load: other work was running on this machine through the round. Load averages were sampled for API-02D-r3 (`API-02D-r3-load.txt`) and API-11 (`API-11-load.txt`), from about 14 up to about 400 under the build, and 50 to 200 during API-11.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/evidence/`

## Routing Classification

- Task size `Medium`; risk `High`; input route `Reviewed`; successful-output route `Code Review`.
- Proportional test-code review decision: requested.
  - API/E2E changed no durable repository test code.
  - The changes are temporary harness files in `evidence/` (`API-356-*`), kept as evidence.
  - This round added `API-356-journey.sh`, `API-356-staged.sh` and `API-356-sampler.mjs`.

## Tested Builds And Environments

| Env ID | What | Settings |
| --- | --- | --- |
| ENV-R3-1 | Clean checkout of `99b53b84e8`; `pnpm install --frozen-lockfile --offline`. V1 = `build:electron:mac` (1.5.11-beta.10). V2 and V3 = the same code with versions 1.5.11-beta.11 and -beta.12, rebuilt (stamps follow) | macOS 26 arm64, 10 cores; electron-updater 6.8.9 MacUpdater + Squirrel.Mac |
| ENV-R3-2 | Test copies (`evidence/API-356-prepare-copy.sh`), as before (`API-00-r3-copies.log`: "V2 satisfies V1 DR", "V3 satisfies V1 DR"). For signature refusals, V2 re-signed with another identifier (valid sha512) | `isolated-app start … --test-update-feed http://127.0.0.1:47911` |
| ENV-R3-3 | Local feed (`evidence/API-356-feed.mjs`), restarted per case on the V2, V3 or "bad" zip | 127.0.0.1:47911 |
| ENV-R3-4 | Outside sampler (`evidence/API-356-sampler.mjs`) every 500 ms: update state over CDP, `/rest/health`, the busy agent's command | — |

## Cases

### Round 4 (current; merge `08984df524`)

| Case ID | Criteria | Boundary | Command / Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R4 | Regression on the merge | Repository, clean checkout | `pnpm -C autobyteus-web test:electron run`; `vitest run components/settings/nodes components/notifications stores` | macOS, clean checkout of `482e9ce797` | Pass | `API-R4-suites.log` | `Tests  407 passed \| 1 skipped (408)`; `Tests  1212 passed (1212)` | A first attempt ran before `.nuxt` existed (setup only, 0 failed tests) and was rerun after the build generated it. The full web suite (5085 passed) is the implementer's IMP |
| API-00 | — | Build, node | V1 = `build:electron:mac` of the merge (1.5.11-beta.11, 5 m 52 s); test node image on the published 1.5.11-beta.7 with a throwaway key; signed `good` 1.5.11-beta.11 package (`API-356-make-packages.sh`, version substituted) | — | Pass | `API-99-r4-cleanup.log` | — | — |
| API-14 | AC-004, the merged Nodes UI (363), CR-C3 | Desktop main process + real node + logging proxy | Fresh desktop; node added through the panel; `evidence/API-356-layouts.mjs` at 760, 1300 and 1900 px (switch off) and at 560, 1300 and 1900 px (after the outcome); two refreshes counted; the switch turned on by a click and followed every 3 s | Isolated V1 build, test container `an356-n4` (fresh volumes, 127.0.0.1:47951, proxy 47961), local release source | Pass | `API-14-layouts-switch-off.json`, `API-14-layouts-after-outcome.json`, `API-14-off-*.png`, `API-14-on-*.png`, `API-14-switch-on-follow.json`, `API-14-after-outcome.png`, `API-14-proxy.jsonl`, `API-14-desktop-instance.log` | **Switch in the server cell in every layout:** narrow (card 462 px), medium (662, 913) and wide (1280, cell **256 px** = 16rem), `toggleInCell=true`. **One window GET per row per refresh** (`refresh-1`, `refresh-2`: `window GET /rest/node-update 200: 1`). **Switch on:** `main POST /rest/node-update 202: 1`; cell "Preparing 1.5.11-beta.11…" → "Restarting…" → "Server 1.5.11-beta.11"; `AUTO_UPDATED` at 81 s; **one** "Updated automatically to 1.5.11-beta.11" (`updatedLines=1`); notice `null` at and 12 s after the outcome; C1 `1.5.11-beta.11 same succeeded` | **O-7:** for ~6 s between the node's success (75 s) and the main process's next follow (81 s), the row notice showed the window's own "Updated to 1.5.11-beta.11."; the automatic line then replaced it and it never repeated. Same window as IMP-08 (h) in round 1, so not new with the merge |
| API-10 | AC-006, merge scope | Repository | Diff and greps | — | Pass | `API-10-r4-ac006.log` | `electron/` changed by the merge: `count: 0`; 356 names server side: `exit: 1` | — |
| Rounds 1–3 | All other ACs | — | Reused | — | Pass | See below | — | Not touched by the merge |

### Round 3 (history; on `2e64cbb3d9`)

| Case ID | Criteria | Boundary | Command / Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R3 | IR-003 unit, mutations | Repository | Reused the IR-003 checks | — | Pass | implementation-handoff Checks Run | — | On the reviewed code |
| API-00 | — | Builds, copies | As ENV-R3 | ENV-R3 | Pass | `API-00-r3-copies.log`, `API-00-r3-user-caches-before.log` | DR satisfied for V2 and V3 | — |
| API-02B | AC-002 (idle), SR-004 | Real Squirrel through the wait | `evidence/API-356-journey.sh API-02B-r3 <evidence>`; then V2 restarted with CDP | ENV-R3 | Pass | `API-02B-r3-sampler.jsonl`, `API-02B-r3-v1-instance.log`, `API-02B-r3-v2-relaunched-app.log`, `API-02B-r3-sidebar.log`, `API-02B-r3-sidebar-*.png` | `downloaded\|preparing=true` 07:14:49.4 → `installing` 07:15:25.7: **wait 36.3 s, health 200 throughout**. `Server process exited` 07:15:25.875, quit (proxy closed) 25.978: **stop to quit 0.1 s**. V2 health 200 07:15:51; `AUTO_UPDATED`; sidebar `1 updated` (also while open, gone after close); row "Updated automatically to 1.5.11-beta.11" | — |
| API-03 | AC-003 | Same, busy Claude run | `API-356-journey.sh API-03-r3 <evidence> busy` | ENV-R3 | Pass | `API-03-r3-sampler.jsonl`, `API-03-r3-busy-start.json`, `API-03-r3-busy-run-after.json`, `API-03-r3-v1-instance.log`, `API-03-r3-v2-relaunched-app.log` | **`marker=true`, health 200 through the wait** (07:18:21.8 → 07:19:02.5); `Recorded 1 busy run(s)` 07:19:02.546 at the stop; quit 07:19:03.068; `1 resumed, 0 skipped, 0 failed`; `notices 1` | — |
| API-02D | AC-002 on a busy machine, F-API-003 | Same, while `build:electron:mac` runs | Build started 45 s before the Check | ENV-R3 | Pass | `API-02D-r3-sampler.jsonl`, `API-02D-r3-v1-instance.log`, `API-02D-r3-load.txt`, `API-02D-r3-v2-relaunched-app.log` | **Wait 81 s** (07:22:31.7 → 07:23:52.96), health 200 throughout; stop to quit 0.1 s; no "did not quit"; V2 `Application started` 07:26:45 with `AUTO_UPDATED` | **F-API-003 resolved.** ShipIt's own install took about 3 min at that load (load up to 415) |
| API-05C | AC-005 (signature refusal) | Real Squirrel, the bad zip | Switch on, Check; then a restart | ENV-R3 | Pass | `API-05C-r3-sampler.jsonl`, `API-05C-r3-instance.log`, `API-05C-r3-state.log`, `API-05C-r3-failure-row.png`, `API-05C-r3-restart-feed.jsonl` | Refusal 07:30:16.58, **40.5 s into the wait**; health 200 throughout; no `Server process exited`; old process alive; no relaunch; `The system updater could not prepare 1.5.11-beta.11` once; state `error`, `install-preparation`, message "AutoByteus could not prepare this update for installing. It keeps running on this version."; row "Automatic update failed. Nothing was changed. \| The system updater could not prepare this update. \| It won't be tried again automatically. You can still install it yourself."; after a restart, yml GET only | — |
| API-05 | AC-005 (read-only volume) | V1 on a read-only image | 3 samples on fresh profiles | ENV-R3 | Pass | `API-05-r3-samples.log`, `API-05-r3-s{1,2,3}-sampler.jsonl`, `API-05-r3-s{1,2,3}-instance.log`, `API-05-r3-s{1,2,3}-state.json` | Each: `could not prepare` (claim) → `A further error of the same refused update` → `Download ended by the update's refusal`, all within 2 ms; one record (`install`, "The system updater could not prepare this update."); state stays `install-preparation`; health 200; no server exit | 3 of 3 |
| API-11 | N-13 (staged path) | Real Squirrel | Switch off; Check; Download by a click; **150 s**; Check; switch on (`READY_WAIT=150 API-356-staged.sh API-11`) | ENV-R3 | Pass | `API-11-sampler.jsonl`, `API-11-v1-instance.log`, `API-11-load.txt` | Switch on 08:48:20 → `Server process exited` 08:48:22.66: **installed at once, one native fetch** (`/ requested` once); relaunched V2 health 200 at 08:52:33 (ShipIt slow at load ~190) | — |
| API-11b, API-11c | N-19 / F-15 overlap | Same, Check and switch-on 7 s (11b) or 65 s (11c) after Squirrel's fetch | — | ENV-R3 | Observed (O-6) | `API-11b-*`, `API-11c-*` | `found(V)` saw Squirrel not ready, so a **second native fetch** started. 0.3 s (11c) or 36 s (11b) later: `could not prepare … ditto: … update.ORITSy2/… No such file or directory` (the **first** fetch's unpack directory). V2 blocked; health 200; nothing stopped | 11c: under load 50–200 the first fetch's unpack still ran after 72 s |
| API-11a | — | Harness fault | Download clicked before a check had found V2 | ENV-R3 | Not counted | `API-11a-*` | Became a normal switch-on-with-`available` install (`AUTO_UPDATED`) | — |
| API-12a | F-15, CR-C19 (same V) | Real Squirrel | Switch off; Download; 60 s; Check; **Download again by a click** (second native fetch of V2); switch on → wait | ENV-R3 | Pass | `API-12a-sampler.jsonl`, `API-12a-v1-instance.log`, `API-12a-relaunched-app.log` | `/ requested` twice, `Download completed` twice; `preparing=true` 08:12:48 → stop 08:13:28.85 (**Squirrel answered the second fetch**); `AUTO_UPDATED` 1.5.11-beta.11 | — |
| API-12b | F-15 (newer W after a staged V) | Real Squirrel, V3 | Switch off; Download V2; 60 s; the feed offers V3; Check; switch on | ENV-R3 | Pass | `API-12b-sampler.jsonl`, `API-12b-v1-instance.log`, `API-12b-relaunched-app.log` | W fetched (second native fetch), wait 08:23:54.9 → stop 08:25:14.8; bundle `1.5.11-beta.12`; relaunched healthy 08:27:47 | — |
| API-12c | F-15, REQ-004 (W after a refused V, same process) | Real Squirrel, bad V2 then V3 | Switch on; V2 refused in the wait; the feed offers V3; Check | ENV-R3 | Pass | `API-12c-sampler.jsonl`, `API-12c-v1-instance.log`, `API-12c-relaunched-app.log` | V2 `could not prepare` 08:34:35.9 (`error\|install-preparation`), then W found 08:34:41.7 → wait → `installing` 08:35:21.9; `AUTO_UPDATED` 1.5.11-beta.12 | A native fetch after a failed one works |
| API-13 | The 15-minute bound's failure rendered | V1 with a seeded record | Record `automaticFailure {V2, install, "The update was still not ready to install after 15 minutes."}`, switch file on; start; the feed offers V2 | ENV-R3 | Pass (rendering only) | `API-13-bound-failure-render.log`, `API-13-bound-failure-row.png` | Row "Automatic update failed. Nothing was changed. \| The update was still not ready to install after 15 minutes. \| It won't be tried again automatically. You can still install it yourself."; startup yml GET, **no zip GET** | The live bound needs Squirrel silent for 15 minutes; no real trigger was found. Every native fetch in this round answered or errored |
| API-10 | AC-006 | Repository | Diff and greps | — | Pass | `API-10-r3-ac006.log` | `exit: 1` for the 356 names (incl. `automaticInstallPreparing`, `install-preparation`); no node-path file changed since `31d38080fc` | — |
| API-01, API-04, API-06..09 | AC-001, AC-005 (download), AC-004/005 (nodes) | — | Reused from rounds 1 and 2 | — | Pass | See the history tables | — | Not in this delta's order change; API-05/05C exercise the download handler's new guard |

### Round 2 (history; on `6a94169f4f`)

| Case ID | Criteria | Boundary | Command / Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R2 | F-API-001, F-API-002 (unit) | Repository | Reused IMP-09, IMP-10 and the IR-002 reruns | — | Pass | implementation-handoff Checks Run | each IMP-09 mutation fails | Ran on the reviewed code |
| API-00 | — | Builds, copies | As ENV-R2-1..3 | ENV-R2 | Pass | `API-00-r2-copies.log`, `API-00-r2-user-caches-before.log` | `V2 copy satisfies V1 copy's DR` | — |
| API-01 | AC-001 (app part) | Desktop + feed | Fresh profile, feed `good`, 70 s after start | ENV-R2 | Pass | `API-01-r2-app-switch-off.log`, `API-01-r2-switch-off.png` | `aria false`, `status available`, Download offered, `zip requests: 0`, no automatic file | Node part reused from round 1 |
| API-02 | AC-002, F-API-001, CR-C2 | Real MacUpdater → Squirrel → ShipIt → relaunch, through `AppUpdateInstallAttempt` | Feed `none`, Check; switch on by a click; busy agent; feed `good`, Check; then V2 restarted with `isolated-app` on the same data root, unedited | ENV-R2 | Pass | `API-02-r2-watch.log`, `API-02-r2-v1-instance.log`, `API-02-r2-v2-relaunched-app.log`, `API-02-r2-v2-relaunch-isolation.log`, `API-02-r2-sidebar.log`, `API-02-r2-sidebar-before.png`, `-panel-open.png`, `-after-close.png` | Bundle → 1.5.11-beta.11 05:12:01; relaunched pid 67329 with e2e env, `~/.autobyteus: 0`; `outcome AUTO_UPDATED, read false`. Sidebar: **`1 updated`**, name `1 update applied automatically: 1 updated automatically`, same while the panel is open, gone after close. `CR-C2 lines: 0` | **F-API-001 resolved** on a real restart, no record edit. The name's detail part repeats itself ("1 updated automatically"); that is the existing format |
| API-02B | AC-002 (idle) | Same, no busy run | Same steps, fresh profile | ENV-R2 | Pass | `API-02B-watch.log`, `API-02B-v1-instance.log` | `has been downloaded` 05:14:53.15; `Server process exited` 54.08; `Download completed` 55.03; proxy closed (quit) 05:15:30.7; record `AUTO_UPDATED`; `~/.autobyteus: 0` | **Squirrel takes ~36 s**, leaving ~23 s of the 60 s quit bound |
| API-02C | AC-002 under a throttle; design path (c) | Same; `taskpolicy -b` on V1 once `installing` | First attempt throttled before the click and starved CDP, so nothing ran (harness fault); redone in this order | ENV-R2 | Observed | `API-02C-v1-instance.log`, `API-02C-watch.log`, `API-02C-throttled-summary.log` | `The app did not quit to install the update within 60 seconds.`; `relaunching this version`; record `install` failure; bundle unchanged | Much stronger than a real slower Mac, so it only shows the path; API-02D is the real-use evidence. First live run of path (c) |
| API-02D | AC-002 on a busy machine | Same, normal priority, while a full `build:electron:mac` runs | Idle app; build started 45 s before the Check | ENV-R2 | **Fail (F-API-003)** | `API-02D-v1-instance.log`, `API-02D-watch.log`, `API-02D-state-after.log`, `API-02D-failure-row.png` | `Server process exited` 05:50:06.474; **05:51:06.477 `did not quit … within 60 seconds`**; `relaunching this version`; record `automaticFailure {install}`; row "Automatic update failed. Nothing was changed."; bundle still 1.5.11-beta.10, also after quitting | Load average 43 → 153 |
| API-03 | AC-003 | API-02's journey | `API-356-busy-agent.mjs` | ENV-R2 | Pass | `API-03-r2-busy-run-after.json`, `API-02-r2-v1-instance.log`, `API-02-r2-v2-relaunched-app.log` | `Recorded 1 busy run(s)`; `1 resumed, 0 skipped, 0 failed`; `notices 1`; Claude continued | — |
| API-04 | AC-005 (download) | Desktop + feed | Fresh copy, feed `badsha`, switch on, then Check | ENV-R2 | Pass | `API-04-r2-download-failure-retry.log`, `API-04-r2-instance.log`, `API-04-r2-failed-settings.png`, `API-04-r2-failure-row.png` | `status error, errorOperation download`, `automaticFailure {download}`; row with the reason; zip GET again at 05:17:46 | The changed rejection handler still records a plain download failure |
| API-05 | AC-005 (native refusal, no repeat), F-API-002 | V1 on a read-only image, real Squirrel | 9 samples on fresh profiles (`evidence/API-356-ro-samples.sh`); then a restart on a failed profile | ENV-R2 | Pass | `API-05-r2-samples.log`, `API-05-r2-s1-state.log`, `API-05-r2-s1-instance.log`, `API-05-r2-sample-*-instance.log`, `API-05-r2-watch.log`, `API-05-r2-s1-failure-row.png`, `API-05-r2-restart-no-repeat.log`, `API-05-r2-restart-no-repeat.png`, `API-05-r2-all-feed.jsonl` | `branch=before` 9 of 9; `Auto-update failed. (kind=install…)` once each; `Download ended by the install failure`; **no `Server process exited`, `recoveryLines=0`, old process alive, health 200**. State: `errorOperation install`, message "The update was downloaded, but AutoByteus could not restart to install it. Try again."; failure row. After a restart: yml GET and **no zip GET** | **Better than the review expected:** the refusal cancels the install inside the 100 ms delay, so nothing stops and no relaunch is needed. No ShipIt process (`quitAndInstall` is not logged, so its absence is shown indirectly) |
| API-05C | AC-005 (broken package), F-API-002 recovery | Fresh V1 copy, real Squirrel | The feed's zip has a valid sha512 but a signature that fails V1's requirement; switch on | ENV-R2 | Pass | `API-05C-instance.log`, `API-05C-relaunched-app.log`, `API-05C-watch.log`, `API-05C-state-after-relaunch.log`, `API-05C-failure-row-after-relaunch.png`, `API-05C-feed.jsonl` | Server exit 05:33:57.3; 05:34:35.6 `Code signature … did not pass validation` (`kind=install`); `The automatic update did not install; relaunching this version.` once; old pid gone, **new pid 29804 and server healthy**; state and row show the failure; startup check yml GET and **no zip GET** | **F-API-002 resolved:** the old version comes back with its server, once. The refusal arrives after the preparation ended. A refusal in the short stop itself is covered by unit tests only |
| API-10 | AC-006 | Repository | Diff and greps | — | Pass | `API-10-r2-ac006.log` | Empty diff outside web/tickets; `exit: 1` for 356 names; no node-path file changed | — |
| API-01 (nodes), API-06..09 | AC-001, AC-004, AC-005 (nodes), CR-C3 | — | Reused from round 1 | — | Pass | See the round 1 table | — | `API-10-r2-ac006.log`: no node-path file changed since `31d38080fc` |

### Round 1 (history; on `31d38080fc`)

| Case ID | Result | Evidence Files | Summary |
| --- | --- | --- | --- |
| API-01 | Pass | `API-01-app-switch-off.log`, `API-01-nodes-no-request.log`, `API-01-nodes-switches-off.png` | App: 0 zip requests. Five real nodes past the 2-min pass: 0 main-process requests, no POST |
| API-02 | Pass with F-API-001 | `API-02-*`, `API-02-03-summary.log` | Real install; sidebar "0 updated" |
| API-03 | Pass | `API-02-03-summary.log` | 1 recorded, 1 resumed, 1 notice |
| API-04 | Pass | `API-04-*` | Failure row, retried at the next check |
| API-05 | **Fail (F-API-002)** | `API-05-*` | App left open without its server, no relaunch |
| API-06 | Pass | `API-06-09-proxy-n-old.jsonl`, `API-06-07-nodes-outcomes.png`, `API-06-09-node-records.log` | Main process POST → 202 (CR-C3); node on 1.5.11-beta.10; row "Updated automatically to 1.5.11-beta.10" |
| API-07 | Pass | `API-06-09-proxy-n-fail.jsonl` | Rollback → `AUTO_FAILED` with the node's reason; no POST at the next pass |
| API-08 | Pass | `API-06-09-proxy-n-stop.jsonl`, `API-08-n-stop-updated-new.png` | Stopped node: no entry; updated on a later pass; new until seen |
| API-09 | Pass | `API-06-09-proxy-n-same.jsonl`, `API-06-09-proxy-n-new.jsonl` | Same and newer nodes: never a POST |
| API-10 | Pass | `API-10-ac006-server-grep.log` | No 356 names on the server side |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-only part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | Round 2 API-01 (app), round 1 API-01 (nodes) | Proven | — |
| AC-002 | Yes | API-02B-r3 (idle), API-02D-r3 (busy machine), API-11 (staged), API-12a/12b/12c | Proven | A Developer ID signed install on the user's machine (the copies use an ad hoc signature with an explicit requirement) |
| AC-003 | Yes | API-03-r3 | Proven | — |
| AC-004 | Yes | Round 1 API-06, API-08, API-09 (node path unchanged) | Proven | — |
| AC-005 | Yes | API-05C-r3, API-05-r3 (refusals in the wait: nothing stops, no repeat), round 2 API-04 (download), round 1 API-07/08 (nodes), API-13 (bound's row) | Proven, with residual O-6 | — |
| AC-006 | Yes | API-10-r3 | Proven | — |

## Findings

**F-API-003: resolved** (API-02D-r3: an 81 s wait under heavy load, no false failure).

**CR-C19 / F-15, what real Squirrel does with a second native fetch:**
- **After the first fetch has finished:** it answers. A same-V refetch, a newer W after a staged V, and a newer W after a refused V all installed (API-12a, API-12b, API-12c).
- **While the first fetch is still unpacking or verifying:** it fails. The second fetch clears Squirrel's cache under the first one's `ditto`, Squirrel errors, and the version is blocked (API-11b at 7 s, API-11c at 65 s under load).
- **The staged rule (N-13) avoids the second fetch** once Squirrel has its copy (API-11).

**O-6 (residual, the design's N-19; not a failure by the design's own acceptance):**
- **Trigger:** switch off, the user downloads by a click, then within Squirrel's preparation (~36 s idle, over 70 s under load) a check runs and the switch is turned on.
- **What happens:** `found(V)` starts a second native fetch, Squirrel errors, and V is blocked with "could not prepare". The result is clean: health 200, nothing stopped, a click can still install, and a newer version is tried.
- **What could close it:** treating "staged, native fetch still running" like the wait (`installWhenReady`) instead of downloading again. That is the owner's call; the design review called it not required.

**Observations carried:** O-3 (the recovery relaunch's delay) was not seen this round, because no recovery relaunch ran. O-4 is gone on macOS (the server runs during the wait). O-5 is gone (plain reasons on the row).

## Validation Confidence Scorecard (Mandatory)

| Category | Final | Supports | Residual |
| --- | --- | --- | --- |
| Requirement and AC proof | 95% | Every critical AC proven directly; AC-002 also under heavy load | — |
| Changed-boundary directness | 97% | Real Squirrel through the new wait: success, refusals, staged path, second fetches; sampled health | — |
| Integration realism | 95% | Real busy agent, real nodes (round 1). The Developer ID install is user-only and scored out | — |
| Environment / fixture fidelity | 93% | Clean builds; real load; three real versions | Test copies' Info.plist and signature edits |
| Failure / edge / lifecycle | 92% | Signature and read-only refusals in the wait, refusal then W, bad sha (round 2), nodes | O-6 confirmed false failure (accepted N-19); live 15-minute bound not reachable; path (a) unit-only |
| Desktop / user surface | 95% | Sidebar, rows, plain reasons, bound row in real windows | — |
| Durable regression quality | 90% | IR-003 unit tests with mutations | O-6 has no repository test |

- Overall final: 93.9% (simple average).
- No category is below 90%; every critical AC is directly proven.
- **Gaps below 95%, and why no surface here closes them:**
  - the live 15-minute bound: no real trigger; Squirrel answers or errors;
  - O-6: an accepted residual;
  - the test copies' signature edits: a real Developer ID install is user-only.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed). Modes:
  - `Project Desktop Validation`: real Squirrel on isolated copies;
  - `Lifecycle`.
- Node cases (`Live API`) reused from round 1.

## Desktop Application Validation (When Applicable)

- Run-owned copies only. Relaunches stayed isolated (`LSEnvironment`, as in rounds 1 and 2).
- Effect on the user's app and data: `None`.

## Persisted-Data Transition Checks (When Applicable)

- `Directly Usable — No Migration`. `automaticInstallPreparing` and `install-preparation` are not stored; the record shows only `automaticFailure` and `outcome`, as before.
- API-13 seeded a record shaped as the app writes it, in a run-owned data root only.

## Compatibility / Legacy Scope Check

- None introduced.

## Durable Coverage Changed In The Codebase

- `No`.

## Dependencies Mocked Or Emulated

| Dependency | Method | Limitation |
| --- | --- | --- |
| Release signing (app) | Ad hoc signature with an explicit requirement on test copies | Developer ID checks and their timing not exercised |
| Release feed | Local generic feed | The zip is fetched in about a second |
| Squirrel silent for 15 minutes | Seeded record for the row only (API-13) | The live bound's state change is unit-only |

## Temporary Methods And Cleanup

| Item | Cleanup | Result |
| --- | --- | --- |
| Instances, relaunched apps, samplers, feed | `isolated-app stop`, `osascript … application id "com.autobyteus.app.an356"`, `kill` | None left |
| The API-02D build | Killed by working directory under the run root | Stopped |
| Test identity state (caches, `HTTPStorages`, preferences, launchd job, LaunchServices registrations), including IMP-12's leftovers of the same identity | `rm -rf`, `launchctl remove`, `lsregister -u` | Removed (`API-99-r3-cleanup.log`) |
| Read-only mount, copies, data roots, checkout, run root | `hdiutil detach`, `git worktree remove`, `rm -rf` | Removed |

## Not Tested / Residual Risks

- **The live 15-minute bound:** unit tests plus a rendered row (API-13).
- **Path (a)** (the `prepareForInstall` / `quitAndInstall` catch): unit tests only.
- **Windows/Linux:** not run; the order is unchanged there.
- **The hourly node pass by wall clock:** round 1 ran the same pass code 2 minutes after a launch.
- **FU-004:** not run.
- **O-6:** see Findings.
- **A Developer ID signed install:** user-only (see AC-002).

## Latest Authoritative Result

- **Round 4 (current):**
  - Result `Pass` on the merge `08984df524`.
  - API-14 and API-R4 re-prove the Nodes UI and AC-004 on a real node; rounds 1–3 stand for everything the merge does not touch.
  - Confidence stays 93.9%, with the same named gaps.
  - New observation O-7: a transient of about 6 s, already seen in IMP-08 (h).
  - Harness addition: `evidence/API-356-layouts.mjs`.
  - Cleanup: test container, volumes, image, release source, proxy, checkout and run root removed; the user's nodes running untouched (`API-99-r4-cleanup.log`). No app-update identity state this round: no app install ran.
  - Test-code review: no repository test code changed; only a harness file was added.
- Round 3 result, kept below:
- Result: `Pass`.
- Final confidence: 93.9%. Every critical AC is directly proven and no category is below 90%. The gaps below 95% are named above.
- Broader validation: `Required`, executed.
- Resolved this round: F-API-003. CR-C19 answered (see Findings).
- Residual: O-6.
- Next recipient: code reviewer, for proportional test-code review (harness only; no repository test code changed).
