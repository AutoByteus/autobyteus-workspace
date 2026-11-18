# API/E2E Test Progress

Working log for autobyteus-412 API/E2E round 1. Read it first when the run is picked back up.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)
- Harness: `/tmp/ab412-e2e/` (clone, logs, harness/proxy.mjs, data root); test node container `ab412-e2e-node` (127.0.0.1:18412), proxy 127.0.0.1:18413

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-11-07 20:05 | API-01 | Completed | Pass | Reused IMP-02..IMP-10; diff df789a89a5..405c28d45e is ticket docs only |
| 2026-11-07 20:06 | API-02 | Started | | Fresh clone /tmp/ab412-e2e/clone at 405c28d45e; install done (EXIT 0); build:electron:mac running in background, log /tmp/ab412-e2e/logs/API-02-build.log |
| 2026-11-07 20:22Z | API-02 | Completed | Pass | build EXIT 0 (typecheck PASS at baseline, guards passed); Prisma + terminal-runtime verify EXIT 0; bundle has isolated-launch.json |
| 2026-11-07 20:23Z | API-03 | Started | | step tests + actionlint in the clone |
| 2026-11-07 20:24Z | API-03 | Completed | Pass | Ran 54 tests OK; actionlint 1.7.12 EXIT 0, no findings (base also clean) |
| 2026-11-07 20:25Z | API-04 | Started | | start isolated instance from clone bundle, data root /private/tmp/ab412-e2e/data-root; add node http://localhost:18413 in UI |
| 2026-11-07 20:11Z | — | Checkpoint | | Clock note: the API-01..API-04 Started times above were estimates; the shell clock reads 20:11Z at node add. Times from here are from `date -u` |
| 2026-11-07 20:12Z | API-04 | Completed | Pass | Seeded AUTO_FAILED beta.7, node beta.3, switch off: line stays; window GET then main GET (ua node) ?target=1.5.12-beta.7; no POST; record unchanged |
| 2026-11-07 20:12Z | API-05 | Started | | Switch on via UI toggle; same instance iso-55693-7b42 (started 20:12:13Z), wait for the 2-min pass |
| 2026-11-07 20:15Z | API-05 | Completed | Pass | Switch-on check 20:12:54 + pass 20:14:09 GET ?target=1.5.12-beta.7 (ua node), 0 POST, record unchanged, line stays |
| 2026-11-07 20:15Z | API-06 | Started | | Switch off via UI; click card "Update to 1.5.12-beta.7"; node downloads the published beta.7 package |
| 2026-11-07 20:17Z | API-06 | Completed | Pass | One POST (window click, 202); main rechecks 20:15:16 / 20:15:50 / 20:16:50; record {} at 20:16:50; notice "Updated to 1.5.12-beta.7."; no automatic line. Node now runs beta.7 |
| 2026-11-07 20:18Z | API-07 | Started | | stop; reseed AUTO_FAILED beta.7 (switch off); start; first Nodes view sampled by harness/first-view.js |
| 2026-11-07 20:19Z | API-07 | Completed | Pass | run1 (20:17:41): record {} after first view, line not caught by the 50 ms sampler; run2 (observer): line added .252, main GET .274, removed .280, same document; record {}; no POST. A run2 attempt at 20:18:42 navigated before the start redirect and did not reach Nodes (harness timing; record stayed intact) |
| 2026-11-07 20:20Z | API-08 | Started | | switch on in UI; stop; reseed; start; wait for #/chat; first-view probe within 2 min of start |
| 2026-11-07 20:22Z | API-08 | Completed | Pass | switch on; start 20:19:55; line added .680, main GET .698, removed .703; record {}; pass 20:21:48 no POST, record stays {} |
| 2026-11-07 20:22Z | API-09 | Started | | switch on; stop; reseed; start; close the window over CDP (no window); wait for the 2-min pass; read record + proxy |
| 2026-11-07 20:25Z | API-09 | Completed | Pass | start 20:22:46, window closed (0 page targets, app + backend alive); pass GET 20:24:46 (ua node) only; record {} at 20:24:46; no POST |
| 2026-11-07 20:25Z | API-10 | Started | | switch on; seed AUTO_FAILED 1.5.12-beta.3 (node on beta.7); stay on #/chat through the 2-min pass (AR-003), then first Nodes view |
| 2026-11-07 20:28Z | API-10 | Completed | Pass | pass 20:27:27 ?target=beta.7 left the beta.3 failure (AR-003); Nodes view: main GET ?target=1.5.12-beta.3 20:27:54.369, line removed, record {}; no POST |
| 2026-11-07 20:30Z | — | Checkpoint | | Cleanup done: instances stopped (list 0), container + 5 volumes removed, proxy killed, data root + clone removed; evidence copied to evidence/API-* |
