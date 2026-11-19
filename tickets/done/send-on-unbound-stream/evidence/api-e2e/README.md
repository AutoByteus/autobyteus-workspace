# API/E2E evidence — autobyteus-540 (send-on-unbound-stream)

The API/E2E engineer's evidence, as the execution report's Cases table lists it. Environment for every case: macOS 26.5.2
(Darwin 25.5.0), Node v22.23.1, headless Google Chrome (playwright-core 1.58.2); a shared machine (load average 10–60)
with `fseventsd` at 150–170 % CPU throughout. Code under test: `49ed8967f0` (web) and `f70d3cb968` (server); the probes
are commit `41bba2c734`. Server `dist` built from this worktree (`build-server.log`); the phone bundle from this
worktree (`pnpm -C autobyteus-web build:mobile-web`, exit 0).

| Folder / file | Case | Command | Date (UTC) | What it holds |
| --- | --- | --- | --- | --- |
| `build-server.log` | setup | `pnpm -C autobyteus-server-ts build` | 2026-11-18 | the build every built-server case used |
| `API-04-server-integration.log` | API-04 | `pnpm -C autobyteus-server-ts test:integration:prepare && … test:integration` | see header | whole integration suite |
| `API-04b-fsevents.log` | API-04b | FSEvents measurement (script text in the log) | see header | the cause of API-04's 4 watcher failures |
| `API-05-server-e2e-whole.*` | API-05 | `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture> pnpm test:e2e` | see header | whole server E2E |
| `API-06-sends-after-stops/` | API-06 | `pnpm -C autobyteus-web test:e2e:stop-generation --gaps <0,60,150,300,600 ×8> --cases SGD-01,SGD-02` | 2026-11-18 21:4x | `evidence.json` (`sends`, `sendStalls`, `wireLog`), the first and last gaps' screenshots |
| `API-07-desktop-send-delivery/` | API-07 | `pnpm -C autobyteus-web test:e2e:send-delivery --output-dir <dir>` | 2026-11-18 21:42 | `evidence.json` (each case's view: notice, draft, message count, status; frames with the snapshots' `input_state`), screenshots, `console.log`, `backend.log`, `frontend.log` |
| `API-08-mobile-shell/` | API-08 | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<dir>` | 2026-11-18 21:53 | `mobile-shell-probe.json` (87 cases), MSP-85…88 screenshots, server logs |
| `API-08b-live-file-refresh-rerun/` | API-08b | same `--cases=MSP-39,MSP-40,MSP-41,MSP-42` | 2026-11-18 | MSP-41 alone again |
| `API-09-web-guards.log` | API-09 | `guard:web-boundary`, `guard:localization-boundary` | see header | |

Not committed, to keep the branch small (on this machine under `/tmp/api540/uncommitted/`, not needed to judge this
ticket): the phone probe's generated upload inputs (`msp-53-55-files/`, video and PDF); the screenshots of other tickets'
phone cases (their results are in `mobile-shell-probe.json`); API-06's per-round screenshots except the first and last gaps.
