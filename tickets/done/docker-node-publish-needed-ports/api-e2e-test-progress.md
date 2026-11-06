# API/E2E Test Progress

Own progress log while tests run. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-06T15:21:27Z | API-10 | Started | | fresh-clone desktop build running in background: /tmp/abx402-api/fresh-start.sh > /tmp/abx402-api/API-08-fresh-start-build.full.log (log name predates case renumbering) |
| 2026-11-06T15:21:27Z | API-01..API-05 | Completed | Pass | Reused IMP-01, IMP-02, IMP-04, IMP-05, IMP-07 (ran on 2575d870e8; 71dc90b1f1 changes only ticket files) |
| 2026-11-06T15:22:58Z | API-06 | Started | | (a) launcher test file under Linux pwsh 7.4.2 + python3 in mcr.microsoft.com/powershell (amd64) |
| 2026-11-06T15:26:41Z | API-10 | Completed | Pass | build exit 0, ALL DONE; evidence API-10-* |
| 2026-11-06T15:26:41Z | API-06 | Checkpoint | | (a) done: 37 run, 31 ok + 6 env failures (root, no curl); rerun of the 6 + parse + collision as non-root with curl: 8 OK. Next (b) real PS v7->v8 node |
| 2026-11-06T15:38:33Z | API-06 | Completed | Pass | (a) tests with pwsh (env failures explained, rerun OK); (b) real PS v7->v8 recreate once, 127.0.0.1 mapping, same ports, marker kept, 2nd run reused; destroyed + volumes removed. amd64-emulated pwsh crashed (PAL_SEHException) -> native arm64 used |
| 2026-11-06T15:38:46Z | API-07 | Started | | fresh v8 node abx402-api-node via bash workspace apply --name; then noVNC in browser to ws://localhost:N |
| 2026-11-06T15:39:52Z | API-07 | Completed | Pass | noVNC in Chromium/Electron renderer connected via ws://localhost:58396 (1920x1080, rendered); ::1 and LAN refused; Node localhost fallback to 127.0.0.1 |
| 2026-11-06T15:39:52Z | API-08 | Started | | rm own container, hold 127.0.0.1:58396, workspace apply --name abx402-api-node |
| 2026-11-06T15:40:26Z | API-08 | Completed | Pass | real bind error matched; retry with fresh 127.0.0.1 ports; node destroyed, volumes removed |
| 2026-11-06T15:40:39Z | API-09 | Started | | docker-start.sh up -p abx402-compose -v abx402 --no-build |
| 2026-11-06T15:40:55Z | API-09 | Completed | Pass | compose publishes 127.0.0.1:59112->6080 + backend; LAN/::1 refused; localhost ws ok; down --volumes --delete-state; tag removed |
| 2026-11-06T15:41:45Z | cleanup | Completed | | tab closed, page server stopped, helper images untagged, /private/tmp/abx402-api removed (incl. fresh clone); user nodes untouched (Up 3 days) |
| 2026-11-06T15:43:57Z | API-11 | Started | | isolated desktop instance (worktree build) + test node abx402-api-node recreated; VNC Viewer in the node window |
| 2026-11-06T15:51:53Z | API-11 | Completed | Pass | node window VNC Viewer: localhost:60168 Connected, 1920x1080 rendered; Docker Guide copy rendered; instance stopped (data root removed), node destroyed, volumes removed |
