# API/E2E evidence — autobyteus-572 (chat-media-path-playback)

Environment: macOS 26.5.2, Node v22.23.1, headless Chrome (playwright-core 1.58.2), ffmpeg 8.0.1; a shared machine (load
38–70). Code under test `b856241b59` (`02320583a5` server, `d165d3143a` web); server `dist` and the phone bundle built
from this worktree (`build-server.log`).

| Folder / file | Case | Command | Date (UTC) |
| --- | --- | --- | --- |
| `build-server.log` | setup | `pnpm -C autobyteus-server-ts build` | 2026-11-20 |
| `API-03-msp91-outside-retry/` | API-03 | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-91` (Retry required on both routes) | 2026-11-20 |
| `API-05-mobile-shell/` | API-05 (and API-04: MSP-92) | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<dir>` | 2026-11-20 16:08 |
| `API-05b-background-tasks-rerun/` | API-05b | `… --cases=MSP-47,MSP-48,MSP-49,MSP-59` | 2026-11-20 |

Each folder holds `mobile-shell-probe.json` (each case's result and details) and this ticket's screenshots (MSP-59 and
MSP-89…92). Not committed, kept on this machine under `/tmp/api572/uncommitted/` (not needed to judge this ticket): the
probe's generated upload inputs and the screenshots of other tickets' phone cases.
