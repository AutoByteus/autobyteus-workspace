# API/E2E Test Progress — autobyteus-405

Only add rows. Execution report: `api-e2e-execution-coverage-report.md`; planned cases: coverage investigation.

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-06T17:35:28Z | API-07 | Started | | /private/tmp/abx405-api/fresh-start.sh > /private/tmp/abx405-api/API-10-fresh-start.full.log (log file name predates numbering; case is API-07) |
| 2026-11-06T17:37:36Z | API-01 | Completed | Pass | Reused IMP-04, 06, 15–25 (rerun-by-impact basis in the investigation) |
| 2026-11-06T17:38:18Z | API-06 | Started | | (a) launcher tests with native arm64 pwsh 7.4.6 + python3, non-root |
| 2026-11-06T17:45:47Z | API-06 | Completed | Pass | (a) tests with pwsh: parse+collision ok; update module needs node -> rerun OK; (b) run 1 confounded by a beta pull (image changed), beta tag restored; (c) digest-pinned v8->v9: Launcher config changed, backend only, no VNC env, JSON backendPort only, marker kept, reuse |
| 2026-11-06T17:46:00Z | API-07 | Completed | Pass | buildx server-package + desktop job from fresh clone; all exit 0; typecheck PASS (cross-package 0 errors) |
| 2026-11-06T17:46:19Z | API-02/API-03 | Completed | see report | compose config; electron/gate specs |
| 2026-11-06T17:47:41Z | API-04 | Started | | clipboard boundary raw probe vs real Xvnc, LAN-only node abx405-api-node :62053 |
| 2026-11-06T17:49:57Z | API-04 | Completed | Pass | run 3 authoritative: view drops request/notify/provide/legacy; caps+request/provide bits treated as caps; control positive for all; LAN only reachable |
| 2026-11-06T17:58:52Z | API-05 | Completed | Pass | Electron: embedded no desktop; no VNC Hosts card; LAN node renders View only; view input blocked; control input arrives (retry after re-layout); maximize+raw resize 1920x1080; minimize/hide end stream <1 s, restore View only; tab switch; Xvnc/server restart UI + reconnect; traffic only to node URL; instance stopped |
| 2026-11-06T17:59:25Z | API-08 | Started | | wss through local TLS proxy |
| 2026-11-06T18:00:00Z | API-08 | Completed | Pass | wss via TLS proxy: REST 200, view dropped pointer/resize, control moved pointer |
| 2026-11-06T18:00:00Z | API-09 | Completed | Pass | 0 marker/credential hits; password hits are chromium --password-store flag; 3 metadata-only line shapes |
| 2026-11-06T18:03:01Z | API-10 | Started | | launcher-created node from the fresh-clone S1 image; app via localhost |
| 2026-11-06T18:05:07Z | API-10 | Completed | Pass | fresh-clone S1 image via local registry; launcher node backend only, no VNC env; app VNC Viewer via localhost Connected View only; cleaned |
| 2026-11-06T18:08:00Z | all | Completed | Pass | report + revision record written; committing |
