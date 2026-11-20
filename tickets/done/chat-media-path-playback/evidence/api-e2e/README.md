# API/E2E evidence — autobyteus-572 (chat-media-path-playback)

Environment: macOS 26.5.2, Node v22.23.1, headless Chrome (playwright-core 1.58.2), ffmpeg 8.0.1; a shared machine (load
38–70). Code under test `b856241b59` (`02320583a5` server, `d165d3143a` web); server `dist` and the phone bundle built
from this worktree (`build-server.log`).

| Folder / file | Case | Command | Date (UTC) |
| --- | --- | --- | --- |
| `build-server.log` | setup | `pnpm -C autobyteus-server-ts build` | 2026-11-20 |
| `API-03-msp91-outside-retry/` | API-03 | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-91` (Retry required on both routes) | 2026-11-20 |
| `API-05b-background-tasks-rerun/` | API-05b | `… --cases=MSP-47,MSP-48,MSP-49,MSP-59` | 2026-11-20 |
| `API-03r2-msp91-outside-retry/` | API-03 (round 2) | `… --cases=MSP-91` | 2026-11-20 |
| `API-05-mobile-shell/` (round 2), `API-05-mobile-shell-round1/` | API-05 | the whole phone probe | 2026-11-20 17:46 (round 2), 16:08 (round 1) |
| `API-06-server-integration.log`, `API-06b-integration-rerun.log` | API-06, API-06b | `test:integration` whole; two files alone | see headers |
| `API-07-server-e2e-whole.excerpt.log` (+ `.log.gz`), `API-07a-…batch-a.log`, `API-07b-…batch-b.log`, `API-07c-…failed-files-rerun.log` | API-07, 07a/b/c | `pnpm test:e2e` (stopped at 2 h), the rest in two batches, the failures one at a time | see headers |

Each folder holds `mobile-shell-probe.json` (each case's result and details) and this ticket's screenshots (MSP-59 and
MSP-89…92). Not committed, kept on this machine under `/tmp/api572/uncommitted/` (not needed to judge this ticket): the
probe's generated upload inputs and the screenshots of other tickets' phone cases.
