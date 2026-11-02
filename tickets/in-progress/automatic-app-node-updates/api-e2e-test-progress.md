# API/E2E Test Progress — automatic-app-node-updates (autobyteus-356)

Read this first when picking the run back up. Only add rows. **Isolated copies, a local feed and test-owned containers only.**

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` § Planned Cases
- Run temp root: `/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T//an356-api.0zPjtT` (also in the worktree's untracked `.an356-api-run-root`, removed at cleanup)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-01 21:25 | Discovery | Completed |  | ShipIt relaunches via NSWorkspace (LSEnvironment applies; pilot confirmed); stock build fails codesign -v; ad hoc + explicit DR identifier pilot: V2 satisfies V1 DR. Temp-keychain identity rejected (needs search list change) |
| 2026-11-01 21:25 | API-R1 | Completed | Pass | reused IMP-01..IMP-08 (31d38080fc; only tickets/ since) |
| 2026-11-01 21:25 | API-00 | Started |  | clean checkout e8b51df9ad; install; V1 build; V2 build (version 1.5.11-beta.11) |
| 2026-11-01 21:39 | API-00 | Checkpoint |  | V1 1.5.11-beta.10 (6 m 49 s) and V2 1.5.11-beta.11 (6 m 33 s) built; stamps follow; checkout restored. Next: node images and packages |
| 2026-11-01 21:45 | API-00 | Completed | Pass | images an356-node:7/10/12 (throwaway key), signed good/fail 1.5.11-beta.10 packages, V1/V2 test copies (DR satisfied), feed on 47911 |
| 2026-11-01 21:45 | API-01 | Started |  | app part: fresh profile, feed offers V2 |
| 2026-11-01 21:47 | API-01 | Checkpoint | Pass (app part) | switch off (aria-checked false, no file), V2 available + Download offered, 0 zip GETs after 60 s; node part runs in the node session |
| 2026-11-01 21:47 | API-02 | Started |  | same profile: feed none -> Check; switch on by click; busy Claude run; feed good -> Check |
| 2026-11-01 21:54 | API-02 | Completed | Pass with F-API-001 | Check found V2 -> download 1 s -> install recorded -> V1 stop 35 s (busy) -> ShipIt replaced bundle -> LS relaunched V2 isolated (e2e env, 0 files under ~/.autobyteus); AUTO_UPDATED unread; row 'Updated automatically to 1.5.11-beta.11' New; read after open; no updater error after quit (CR-C2). F-API-001: sidebar entry '0 updated' (SidebarNotificationsEntry still filters kind!=app) |
| 2026-11-01 21:54 | API-03 | Completed | Pass | Recorded 1 busy run at the automatic install; V2: 1 resumed 0/0, 1 system.restart_resume notice, Claude continued |
| 2026-11-01 21:54 | API-04 | Started |  | fresh V1 copy (data-dl, port 47922), feed badsha |
| 2026-11-01 21:56 | API-04 | Completed | Pass | switch on -> automatic download -> sha512 mismatch -> automaticFailure download, row 'Automatic update failed. Nothing was changed.' + reason, Download still offered; next check (Check now) -> zip GET again (not blocked) |
| 2026-11-01 21:56 | API-05 | Started |  | V1 copy on a read-only disk image (data-ro, port 47923), feed good |
| 2026-11-01 22:00 | API-05 | Checkpoint | Fail (F-API-002) | read-only volume: Squirrel refusal at install (kind=install) 2 ms after quitAndInstall; recorded once as install failure; recovery read isServerProcessGone()=false ('server exit is not confirmed; the app stays open') while the stop was finishing; server gone ~0.6 s later; app left open without server, no relaunch; state message overwritten with a download error |
| 2026-11-01 22:02 | API-05 | Completed | Fail (F-API-002) | after the user's restart: old version with its server, failure row with the reason, startup check found V2 with no zip GET (no repeat). Recovery itself left the app without its server |
| 2026-11-01 22:03 | API-01 | Started |  | node part: fresh desktop (V1 build, data-nodes, port 47931), 5 nodes added, switches off |
| 2026-11-01 22:06 | API-01 | Completed | Pass | app part (see checkpoint) + node part: switches off, past the launch+2 min pass: 0 main-process requests, 0 POSTs to any node, no node-auto-updates.json |
| 2026-11-01 22:06 | API-06 | Started |  | with API-07/08/09: n-stop stopped; all 5 switches turned on by clicks |
| 2026-11-01 22:09 | API-06 | Checkpoint | Pass | n-old: main GET + POST 202 at once (CR-C3), followed, AUTO_UPDATED ~1.5 min, row 'Updated automatically to 1.5.11-beta.10', C1 1.5.11-beta.10 succeeded |
| 2026-11-01 22:09 | API-07 | Checkpoint | Pass (first half) | n-fail: POST 202, trial exited -> rollback; AUTO_FAILED with the node's reason; C1 back on beta.7. n-stop: ECONNREFUSED, no entry. n-same/n-new: GET only |
| 2026-11-01 22:20 | API-07 | Completed | Pass | next pass after relaunch (21:11:33): n-fail GET only, no POST (no repeat for 1.5.11-beta.10) |
| 2026-11-01 22:20 | API-08 | Completed | Pass | n-stop started, desktop relaunched, window on #/workspace: pass at launch+2 min -> GET + POST 202 -> AUTO_UPDATED read=false; Nodes opened -> 'New: Updated automatically to 1.5.11-beta.10', then read=true; C1 1.5.11-beta.10 succeeded |
| 2026-11-01 22:20 | API-09 | Completed | Pass | n-same (same) and n-new (newer): GET at the switch and at the later pass, never a POST; n-old after its update: GET only |
| 2026-11-01 22:20 | API-06 | Completed | Pass | (see checkpoint) |
| 2026-11-01 22:24 | API-10 | Completed | Pass | branch touches nothing outside autobyteus-web/tickets; no 356 names in server/contracts (generic words pre-exist on base) |
| 2026-11-01 22:24 | Cleanup | Completed |  | instances, relaunched V2, test-identity caches/prefs/launchd job/LS registrations, nodes+volumes+images, feed, release source, proxies, mount, keychain, checkout, run root removed; user caches identical; user nodes untouched |
| 2026-11-01 22:24 | Round 1 | Completed | Fail | 86.1%; F-API-001 (sidebar '0 updated'), F-API-002 (native refusal: no relaunch, app without server); report + API-REV-001 written |
| 2026-11-02 05:54 | Round 2 | Started |  | CRR-003 Pass on IR-002 (code aa096836d9, 6a94169f4f; review f1c4641b08). Run temp root /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/an356-api2.CVFjXO |
| 2026-11-02 05:54 | API-00 | Started |  | r2: clean checkout f1c4641b08; install; V1 and V2 (version bumped) builds |
| 2026-11-02 06:09 | API-00 | Completed | Pass | r2: V1 1.5.11-beta.10 and V2 1.5.11-beta.11 built from f1c4641b08; copies prepared, DR satisfied; feed up |
| 2026-11-02 06:09 | API-02 | Started |  | r2: fresh profile: switch off check; feed none, switch on; busy Claude; feed good, Check |
| 2026-11-02 06:13 | API-01 | Completed | Pass | r2 app part: switch off, V2 available, 0 zip GETs after 70 s, no automatic file. Node part reused |
| 2026-11-02 06:13 | API-02 | Completed | Pass | r2: real automatic install via the attempt class; V2 relaunched isolated; AUTO_UPDATED; sidebar '1 updated' before and while open, gone after close (F-API-001 resolved); CR-C2 0 lines |
| 2026-11-02 06:13 | API-03 | Completed | Pass | r2: Recorded 1; 1 resumed 0/0; 1 notice; Claude continued |
| 2026-11-02 06:13 | API-02B | Started |  | idle automatic install on a fresh profile |
| 2026-11-02 06:16 | API-02B | Completed | Pass | idle install: downloaded 05:14:53.15, server exit 54.08, Squirrel 'Download completed' 55.03, V1 quit 05:15:30.7, V2 health ~05:15:58; AUTO_UPDATED; isolated. Squirrel needs ~36 s; corrects round 1 O-1. 60 s quit bound margin ~23 s here |
| 2026-11-02 06:16 | API-04 | Started |  | r2: fresh V1 copy, feed badsha |
| 2026-11-02 06:18 | API-04 | Completed | Pass | r2: automaticFailure download, state message and row correct; next check -> zip GET again |
| 2026-11-02 06:18 | API-05 | Started |  | r2: V1 on read-only image, feed good |
| 2026-11-02 06:23 | API-05 | Checkpoint |  | r2 s1: refusal 0.49 s after the downloaded log, inside the start delay: cancelled, no stop; old process and server fine; message stays install; row ok. Sampling for the 'during' branch |
| 2026-11-02 06:30 | API-05 | Checkpoint |  | r2 samples 2-9: all 'before' (9/9 with s1): refusal inside the start delay; recovery branch needs another trigger: API-05C broken package |
| 2026-11-02 06:36 | API-05 | Completed | Pass | r2: read-only refusal 9/9 'before': no stop, no quitAndInstall, no ShipIt, server stays, recorded once as install, message stays install; after a restart row + no zip GET |
| 2026-11-02 06:36 | API-05C | Completed | Pass | broken package (valid sha, signature fails DR): Squirrel refuses 38 s after the stop; 'relaunching this version' once; new pid + server healthy; failure row; no zip GET after. Relaunch took ~42 s to appear (O-3) |
| 2026-11-02 06:36 | API-02C | Started |  | V1 throttled with taskpolicy -b to emulate a slower Mac: Squirrel vs the 60 s quit bound |
| 2026-11-02 06:48 | API-02C | Checkpoint |  | throttled: quit bound fired while Squirrel worked -> install failure recorded, V2 blocked, old version relaunched, bundle unchanged. Measuring under a real load next |
| 2026-11-02 06:57 | API-02C | Completed | Observed | throttled run: path (c) live |
| 2026-11-02 06:57 | API-02D | Completed | Fail (F-API-003) | real build load, normal priority: bound fired 60.0 s after the stop; V2 blocked; old version relaunched; bundle unchanged |
| 2026-11-02 06:57 | API-10 | Completed | Pass | r2: no 356 names server side; no node-path change since 31d38080fc |
| 2026-11-02 06:57 | Cleanup | Completed |  | r2: all run state removed; user caches identical; user nodes untouched |
| 2026-11-02 06:57 | Round 2 | Completed | Fail | 88.7%; F-API-001 and F-API-002 resolved; F-API-003 new; report + API-REV-002 written |
| 2026-11-02 07:44 | Round 3 | Started |  | CRR-005 Pass on IR-003 (code 2e64cbb3d9; review 99b53b84e8). Run temp root /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/an356-api3.Wen0hi |
| 2026-11-02 07:44 | API-00 | Started |  | r3: clean checkout 99b53b84e8; V1, V2, V3 builds |
| 2026-11-02 08:13 | API-00 | Completed | Pass | r3: V1/V2/V3 (beta.10/11/12) built (8m41, 6m40, 8m17); copies + zips; DR satisfied. Pre-existing an356 HTTPStorages/Preferences from IMP-12 noted |
| 2026-11-02 08:13 | API-02B | Started |  | r3 idle real install through the wait |
| 2026-11-02 08:16 | API-02B | Completed | Pass | r3: wait 36.3 s (07:14:49.4->07:15:25.7) health 200 throughout; stop->quit 0.25 s; V2 healthy 07:15:51; AUTO_UPDATED; sidebar 1 updated / row ok |
| 2026-11-02 08:16 | API-03 | Started |  | r3 busy run through the wait |
| 2026-11-02 08:20 | API-03 | Completed | Pass | r3: marker alive + health 200 through the wait (07:18:21.8->07:19:02.5); Recorded 1 at the stop; quit +0.5 s; 1 resumed 0/0; 1 notice |
| 2026-11-02 08:20 | API-02D | Started |  | r3: idle journey with build:electron:mac running |
| 2026-11-02 08:27 | API-02D | Completed | Pass | r3 under a build load (load 14 -> 415): wait 81 s, health 200 throughout, stop->quit 0.1 s, no false failure; ShipIt slow under load; V2 started 07:26:45, AUTO_UPDATED. F-API-003 resolved |
| 2026-11-02 08:27 | API-05C | Started |  | r3 signature refusal |
| 2026-11-02 08:32 | API-05C | Completed | Pass | r3: refusal during the wait (+40.5 s): health 200 throughout, no stop, no relaunch, one 'could not prepare' claim, install-preparation, row plain reason + 'won't be tried again'; restart: no zip GET |
| 2026-11-02 08:32 | API-05 | Started |  | r3 read-only image, 3 samples |
| 2026-11-02 08:37 | API-05 | Completed | Pass | r3 3/3: claim, further error, download ended within 2 ms; one record (install); state install-preparation; health 200; no stop |
| 2026-11-02 08:37 | API-11 | Started |  | N-13 staged path |
| 2026-11-02 08:48 | API-11 | Checkpoint |  | first run API-11a: harness clicked Download before a check found V2 -> became a switch-on-with-available install (passed, AUTO_UPDATED path) not N-13; script fixed (check first); rerun |
| 2026-11-02 08:58 | API-11 | Checkpoint |  | API-11b: Check + switch on 7 s after Squirrel's fetch (before its verify ended) -> found(V) not ready -> second native fetch on top of the first -> Squirrel 'ditto: Could not ls' -> 'could not prepare', V2 blocked; health 200, nothing stopped (N-19 false failure confirmed live). Script waits 60 s now; rerun N-13 |
| 2026-11-02 08:58 | API-11 | Started |  | r3 staged / second fetch |
| 2026-11-02 09:10 | API-12a | Started |  | r3 staged / second fetch |
| 2026-11-02 09:21 | API-12b | Started |  | r3 staged / second fetch |
| 2026-11-02 09:32 | API-12c | Started |  | r3 staged / second fetch |
| 2026-11-02 09:44 | API-11 | Checkpoint | Unexpected | after Download + 65 s, Check + switch on started a 2nd native fetch (N-13 not applied); Squirrel ditto error 0.3 s later; V2 blocked. Rerun with 150 s wait + load log |
| 2026-11-02 09:44 | API-12a | Completed | Pass | same V fetched twice (2nd by a click, then switch on -> wait): Squirrel answered; AUTO_UPDATED |
| 2026-11-02 09:44 | API-12b | Completed | Pass | V staged (switch off), W found, switch on: W fetched (2nd native fetch), installed, relaunched on beta.12 |
| 2026-11-02 09:44 | API-12c | Completed | Pass | V refused in the wait, W found in the same process: native fetch after a failed one; AUTO_UPDATED beta.12 |
| 2026-11-02 09:55 | API-11 | Completed | Pass | 150 s after Squirrel's fetch: Check + switch on -> installed at once (server exit 2.5 s after switch-on), ONE native fetch; relaunched on V2, AUTO_UPDATED. API-11c (65 s) and API-11b (7 s): 2nd fetch over the first's unpack -> false failure (N-19) |
| 2026-11-02 09:55 | API-13 | Started |  | bound's failure rendered: seeded record |
| 2026-11-02 10:00 | API-13 | Completed | Pass (render) | seeded bound reason: row with reason + won't-retry sentence; startup check no zip GET |
| 2026-11-02 10:00 | API-10 | Completed | Pass | r3: no 356 names server side; no node-path change |
| 2026-11-02 10:00 | Cleanup | Completed |  | r3: all run state removed (incl. IMP-12's identity leftovers); user caches identical; user nodes untouched |
| 2026-11-02 10:00 | Round 3 | Completed | Pass | 93.9%; F-API-003 resolved; CR-C19 answered; residual O-6 |
