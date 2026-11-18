# API/E2E Test Progress — html-preview-isolation (autobyteus-417)

Working log while cases run. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` § Planned Cases (same case IDs)
- Temp root of this run: `/private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/api417.7wR5caKuvW` (scripts, data root, workspace, logs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-07 (build) | setup | Started | — | `isolated-app start --build --data-root <temp>/data-root` running in background; output `<temp>/logs/isolated-start.json`, build log `<temp>/logs/isolated-build.log` |
| 2026-11-07 | API-01…API-05 | Completed | Pass (Reused) | IMP-02, IMP-03, IMP-05, IMP-06/07, IMP-08 on `cdba18ba35`; no code change since (only ticket docs) |
| 2026-11-07T04:53:29Z | API-10 | Started | — | desktop Files-area preview of hostile.html on iso-50112-c4ac |
| 2026-11-07T04:55:22Z | API-10 | Completed | Pass | origin null; parent/preload/storage SecurityError; WS terminal + GraphQL refused 403; GET mutation 405; 0 markers, 0 HOSTILE defs; assets render; losses as documented |
| 2026-11-07T04:55:22Z | API-11 | Started | — | desktop Artifacts preview of artifact.html |
| 2026-11-07T04:58:01Z | API-11 | Completed | Pass | blob:file:// iframe sandbox allow-scripts; origin null; parent/preload/storage blocked; WS/GraphQL refused; GET mutation 405; 0 markers/defs; inline + CDN ran |
| 2026-11-07T04:58:01Z | API-12 | Started | — | positive control from Node (no Origin) |
| 2026-11-07T04:58:19Z | API-12 | Completed | Pass | control WS opened, marker created, CONTROL-api12 def created; only PTY session in log is control-api12 |
| 2026-11-07T04:59:21Z | API-13 | Started | — | (a) artifact rewrite while previewed; (b) workspace file change + reopen |
| 2026-11-07T05:01:13Z | API-13 | Completed | Pass | artifact ART-V1->ART-V2 live (new blob URL); workspace WS-V1->V2 (10 s) and ->V3 (5 s) without user action (watcher -> invalidateFileContent remount), reopen -> V4; FU-003 premise not reproduced |
| 2026-11-07T05:01:13Z | API-14 | Started | — | static URL top-level in headless Chrome + response headers |
| 2026-11-07T05:02:02Z | API-14 | Completed | Pass | top-level Chrome: origin null, storage blocked, WS refused; HTML/JS/CSS/PNG 200 with their types + CSP; 404 JSON no CSP; /content unchanged |
| 2026-11-07T05:02:37Z | API-15 | Started | — | phone web app paired to the instance node at its LAN address; HTML artifact preview |
| 2026-11-07T05:03:14Z | API-15 | Completed | Pass | paired phone (credential stored); artifact iframe blob:http://192.168.2.158:50113 sandbox allow-scripts; origin null; parent localStorage credential blocked; node refused WS/GraphQL; 0 markers/defs |
| 2026-11-07T05:03:14Z | API-06 | Started | — | 403 server E2E request-origin-and-phone-routes |
| 2026-11-07T05:03:38Z | API-06 | Completed | Pass | 7/7 incl. null Origin refused on /ws/terminal and /graphql (AC-001 of 403) |
| 2026-11-07T05:03:54Z | API-16 | Completed | Pass | docs list exactly the measured losses |
| 2026-11-07T05:04:53Z | cleanup | Completed | — | isolated-app stop iso-50112-c4ac (ok, ports released), CDN stand-in killed, temp root and instance log removed; isolated-app list shows no instance of ours |
