# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` § Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-07T21:19:11Z | API-01 | Started | | pnpm -C autobyteus-server-ts build |
| 2026-11-07T21:19:38Z | API-01 | Completed | Pass | dist built |
| 2026-11-07T21:19:38Z | API-02 | Started | | nodes-docker-address probe |
| 2026-11-07T21:22:09Z | API-02 | Completed | Pass | 5 cases Pass, 0 refusal lines, cleanup serversLeft 0 |
| 2026-11-07T21:22:43Z | API-03 | Started | | remote runs, peers by normys-macbook-pro.local |
| 2026-11-07T21:26:15Z | API-03 | Completed | Pass | RTP-01..07 Pass, peers by .local, 0 refusals |
| 2026-11-07T21:26:15Z | API-04 | Started | | peer by lvh.me |
| 2026-11-07T21:27:24Z | API-04 | Completed | Pass | P1 refused + hint line, P2 accepted when configured, P3 IP control |
| 2026-11-07T21:28:26Z | API-05 | Started | | phone via ts.net + company pairing, mobile-shell --hold |
| 2026-11-07T21:40:41Z | API-05 | Checkpoint | | run 1: every pair step 400 REMOTE_ACCESS_PAIRING_WAY_INVALID (probe from 403 lacks connectionWay; harness). Host controls behaved as expected. Fixed probe, rerunning |
| 2026-11-07T21:44:11Z | API-05 | Completed | Pass | run 2: 4 journeys x 9 steps Pass; controls ok; probe filter Fail = known feed + CONNECT-refused icon APIs (classified in API-05-summary.txt) |
| 2026-11-07T21:44:24Z | API-06 | Started | | phone via company AUTOBYTEUS_SERVER_HOST |
| 2026-11-07T21:46:18Z | API-06 | Completed | Pass | run 3 (runs 1-2: probe assertions, favicon line + empty list state); C1, J1, J2 Pass, 3 WS 101, 0 journey refusals |
| 2026-11-07T21:46:24Z | API-07 | Started | | isolated-app start --build (packaged worktree build) |
| 2026-11-07T21:53:22Z | API-07 | Completed | Pass | iso-57276-63dd; renderer GraphQL 200 + WS opened; 0 refusals |
| 2026-11-07T21:53:22Z | API-08 | Started | | file:// page in the in-app browser |
| 2026-11-07T21:54:29Z | API-08 | Checkpoint | | run 1: step bugs (log index off by one dropped top-fetch line; popup needs attached tab, ran on reload). Node refused all 16 tagged requests origin null across both loads (server.log 105-130). Rerunning fixed step |
| 2026-11-07T21:55:06Z | API-08 | Completed | Pass | run 2: 16/16 tagged requests refused origin null; page loads; popup on load 2; AR-002 text + PDF display |
| 2026-11-07T21:55:06Z | API-09 | Started | | F1 html/svg top-level |
| 2026-11-07T21:56:03Z | API-09 | Completed | Pass | run 2 (run 1: step matched the wrong tab); script ran, origin null, refusals for fetch+ws |
| 2026-11-07T21:56:03Z | API-11 | Started | | localhost server in the in-app browser |
| 2026-11-07T21:56:17Z | API-11 | Completed | Pass | own server works; node fetch+ws refused origin http://localhost:57757 |
| 2026-11-07T21:56:17Z | API-10 | Started | | viewers + top-level PDFs |
| 2026-11-07T21:58:57Z | API-10 | Completed | Pass | run 2 (run 1: step text/frame checks); 8 viewers + 2 top-level PDFs; 0 refusals |
| 2026-11-07T21:58:57Z | API-12 | Started | | Docker node api416-docker + host node by .local in desktop Nodes page |
| 2026-11-07T22:05:58Z | API-12 | Completed | Pass | run 4 (1: collaboration dialog; 2: open dialog left; 3 diag: Chromium ERR_NAME_NOT_RESOLVED for own .local, used LAN IP); docker localhost + LAN IP windows work; docker peer registered embedded at host.docker.internal |
| 2026-11-07T22:05:58Z | API-07..12 | Checkpoint | | instance iso-57276-63dd stopped, data root removed, container removed |
| 2026-11-07T22:06:39Z | API-13 | Started | | Electron dev (BUILD_TARGET=electron nuxt dev, e2e profile) |
| 2026-11-07T22:24:15Z | API-13 | Completed | Pass | env origin http://localhost:3000; controls 200/403; renderer GraphQL 200 + WS opened over CDP (manual run after scripted race); 0 refusals; cleanup 0 left |
| 2026-11-07T22:24:15Z | API-14 | Started | | pnpm dev |
| 2026-11-07T22:26:08Z | API-14 | Completed | Pass | both origins: GraphQL 200 x21, WS 101 with own origin; control 403; ports freed |
| 2026-11-07T22:26:08Z | API-15 | Started | | probe sweep (11 probes), see evidence/API-15-probe-sweep/API-15-sweep.txt |
| 2026-11-07T22:39:16Z | API-15 | Completed | Pass | 12 probes: 9 Pass; token-statistics-ui (FU-003 date fixture), model-routing-settings (FU-004 stale names), node-vocabulary (FU-004 stale selector) fail on causes outside 416, their nodes accepted the frontend origin (0 refusals); projects rerun under its script name |
| 2026-11-07T22:39:16Z | API-16 | Started | | fresh clone, frozen install, build:electron:mac arm64, verify steps |
| 2026-11-07T22:47:40Z | API-16 | Completed | Pass | fresh clone da207045a5: frozen install 0, build:electron:mac arm64 0, Prisma ok, terminal runtime ok x3 |
