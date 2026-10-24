# API/E2E Test Progress — node-vocabulary (autobyteus-290)

Evidence: `evidence/api-e2e/` (beside this file). Code `127fc4806e`.

| # | Step | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Investigation (round 1) | — | `api-e2e-coverage-investigation.md` |
| 2 | API-00 server build, integration prepare | exit 0 | `API-00-build.log` |
| 3 | RC-26 gains the former-name case (an agent selecting only `list_available_nodes`) | — | test file |
| 4 | API-01 run 1: the whole two-server E2E | 36/37: RC-12 timed out (480 s; 683 s wall). RC-26 incl. the new case passes. Every other case ran at its usual duration (278's run: RC-12 151 s) | `API-01.log`, `API-01/` |
| 5 | RC-12 cause search: no network mount, `lsof` 0.07 s; the failed run's beta log shows no activity during RC-12. Temporary step timings added to RC-12 (to be reverted) | — | — |
| 6 | Diagnostic: the cases up to RC-12 with the timings | 21/21 (RC-12 156 s: r1 down after 19 s, Team after ~150 s) | `API-01-diag-rc12.log` |
| 7 | API-01 run 2: the whole file with the timings (to catch a recurrence) | **37/37** (321 s; RC-12 ~157 s). Timings reverted after | `API-01-run2.log`, `API-01-run2/` |
| 8 | Written: new E2E `node-vocabulary-stored-names-startup.e2e.test.ts` (API-03), new probe `node-vocabulary-probe.mjs` (API-05), temporary `API-04-released-upgrade-probe.mjs`; released worktree at `c78ffb15a2` created (not built yet) | — | — |
| 9 | API-03 run 1 | NV-01, NV-02 Pass; NV-03 failed on my test: the source reports a refused batch in its result, not a GraphQL error | `API-03-run1.log` |
| 10 | API-03 run 2 | NV-03 failed on my test: nothing new to send, so the sync never reached the hub | `API-03-run2.log` |
| 11 | API-03 run 3 (a new file before the refused sync) | **3/3** | `API-03-run3.log` |
| 12 | API-04: released worktree `c78ffb15a2` installed and built; probe | build exit 0; **27/27**; worktree removed | `API-04-released-build.log`, `API-04.log`, `API-04/` |
| 13 | API-05 run 1 | 5/5 cases; Fail on browser errors: cold `/mobile` compile, alpha restart, phone sockets to the dev origin; the run's evidence had the test pairing credential in a socket URL (redacted) | `API-05-run1/` |
| 14 | API-05 runs 2–3 (warm every route; errors tagged by phase; failed URLs recorded; credentials redacted) | 5/5; remaining errors: phone sockets to the dev origin (`nuxt dev` proxies only /graphql and /rest), a navigation abort, the dev server restarting after the unproxied socket's ECONNRESET | `API-05-run2/`, `API-05-run3/` |
| 15 | API-05 run 4 (those three harness effects classified in the probe) | **5/5, Pass**, no unexpected browser error | `API-05-run4/` |
| 16 | API-06: the six changed probes in sequence | remote-nodes-page 12/12, nodes-docker-address 5/5; sibling sidebar (all scenarios pass; fixture lacks `getTeamMemberFileChanges` and the update-notifications stream), remote-run-title (`addPeerNode` without `nodeId`), remote-runs-in-tree (7/7; a cold `nuxt dev` error), agent-runtimes-settings (update-state cases) failed | `API-06/summary.log` |
| 17 | Causes: sibling fixture boundaries since `580e1cac5b` / autobyteus-210; remote-run-title `nodeId` since one-nodes-tab; runtimes update states since autobyteus-210 (this ticket: a parameter name only) → FU-005; baseline fixes in the sibling and title probes; Vite re-optimization filtered in my two remote probes | — | probe files |
| 18 | Reruns: sibling run 2 3/3; title run 2 6/6 cases (cold `nuxt dev` error), run 3 Pass; tree run 2 stopped at "Send enabled" (RTP-04), run 3 7/7; re-type when the composer re-mounts, run 4 7/7 | Pass | `API-06/*-run2..4/` |
| 19 | API-07 desktop: build and start over a released list; Nodes tab; restart; empty list; unreadable file; restart; stop and clean up | Pass | `API-07/` |
| 20 | electron-launch-profile probe run 1: its `pnpm build:electron` is Linux-only on macOS (FU-006); run 2 `--skip-build` | 5/5 | `API-06/electron-launch-profile-probe*/` |
| 21 | API-08 iOS: dedicated simulator, build, seed released keys, two launches; deleted | Pass | `API-08/` |
| 22 | API-08 Android: dedicated AVD, seed released prefs; the first `monkey` launch did not start the app (home screen), `am start` did; two launches; deleted; adb server stopped | Pass | `API-08/` |
| 23 | API-09 word list | Pass (allowed hits only) | `API-09-word-list.log` |
| 24 | RC-12 repeat attempts (cases up to RC-12, up to 3) with a temporary fetch watchdog (requests open > 20 s) and step timings | 3/3 pass (RC-12 ~151 s), no slow request; diagnostics reverted; cause not found → FU-007 | `API-01-rc12-repro1..3.log` |
| 25 | Commits: baseline fixes `b631d63023`; coverage `383b1500a2` | — | — |
| 26 | API-10: fresh clone at `383b1500a2`, install, server build, the upgrade E2E | 3/3 | `API-10-clean-clone.log` |
| 27 | Report, revision record API-REV-001 (Pass, 95%) | → code reviewer, test-code review | `api-e2e-execution-coverage-report.md` |

