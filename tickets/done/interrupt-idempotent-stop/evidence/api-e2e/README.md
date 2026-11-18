# API/E2E evidence — autobyteus-533 (interrupt-idempotent-stop)

The API/E2E engineer's evidence, case by case, as the execution report's Cases table lists it. Environment for every
case: macOS 26 (Darwin 25.5.0), Node v22.23.1, headless Google Chrome (Playwright `playwright-core` 1.58.2), a shared
machine with load averages of 50–80 from other agents' work and `fseventsd` at 140–160 % CPU throughout. Code under
test: `a0d81bbe18` (code through `71f9a5d13e`); the probe files are the commits named per case. Server `dist` built
from this worktree (`build-server.log`), phone bundle from this worktree (`pnpm -C autobyteus-web build:mobile-web`).

| Folder / file | Case | Command | Commit (probe) | Date (UTC) | What it holds |
| --- | --- | --- | --- | --- | --- |
| `build-server.log` | setup | `pnpm -C autobyteus-server-ts build` | `6b433e538d` | 2026-11-18 | the build used by every built-server case |
| `API-05-server-integration.log` | API-05 | `pnpm -C autobyteus-server-ts test:integration:prepare && pnpm -C autobyteus-server-ts test:integration` | `6b433e538d` | see header | whole integration suite |
| `API-05b-fsevents-and-watcher-rerun.log` | API-05b | FSEvents measurement (`/tmp/api533/fsevents-measure.mjs`, text in the log) and the two watcher files alone | see header | 2026-11-18 | the cause of API-05's 16 failures |
| `API-02-web-org-retained-recovery-spec.log` | API-02 | `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run stores/__tests__/agentOrgRetainedRecovery.spec.ts` | see header | 2026-11-18 | the web spec changed after IMP-07 |
| `API-06-server-e2e-whole.excerpt.log`, `API-06-server-e2e-whole.log.gz` | API-06 | `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture> pnpm test:e2e` | see header | 2026-11-18 | whole server E2E with the scripted AGY gate: the excerpt (every file's line, the summary, each failure's first error), the full log gzipped |
| `API-06b-server-e2e-failed-files-rerun.excerpt.log`, `.log.gz` | API-06b | the 21 failed files, `vitest run --fileParallelism=false <files>` | see header | 2026-11-18 | as API-06 |
| `API-06c-server-e2e-load-bound-rerun.log` | API-06c | the 6 non-watcher files still failing, at load ~40 | see header | 2026-11-18 | |
| `API-06d-server-e2e-quiet-rerun.log` | API-06d | the 3 files still failing, at load ~20 | see header | 2026-11-18 | |
| `API-06e-agy-background-stop-test.log` | API-06e | `agy-background-task-transport`'s Stop test alone, verbose | see header | 2026-11-18 | |
| `API-07-desktop-loopback/` | API-07 | `pnpm -C autobyteus-web test:e2e:stop-generation --output-dir <dir>` | `ed921d57c6` | 2026-11-18 12:47 | `evidence.json` (cases, rounds, button traces, `wireLog`), screenshots, `backend.log`, `frontend.log` |
| `API-07-desktop-loopback-run1-harness-gap/` | API-07 run 1 | same | `f8fad0fc6a` | 2026-11-18 12:40 | the run whose wire carried only the run streams (SGD-03, SGD-05 harness gap) |
| `API-08-desktop-latency-150ms/` | API-08 | same `--latency-ms 150 --gaps 0,150,300,450,700,1000` | `28de6a0ee9` | 2026-11-18 13:02 | as API-07, plus `console.log` |
| `API-08-desktop-latency-150ms-run1/` | API-08 run 1 | same | `ed921d57c6` | 2026-11-18 12:50 | FU-005 (Team stream recovery) and the SGD-07 press race |
| `API-09-mobile-shell/` | API-09 | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<dir>` | `6744d786c6` | 2026-11-18 13:29 | `mobile-shell-probe.json` (79 cases), screenshots, server logs |
| `API-09b-mobile-shell-code-wrap-rerun/` | API-09b | same `--cases=MSP-50,MSP-51,MSP-52` | `6744d786c6` | 2026-11-18 | MSP-50…52 alone, after FU-007 |
| `API-10-cg07-send-after-stop/` | API-10 | `pnpm -C autobyteus-web test:e2e:stop-generation --output-dir <dir> --gaps <0,60,150,300,600 ×8> --cases SGD-01,SGD-02` | `6744d786c6` | 2026-11-18 13:20 | 80 Stop rounds and the CG-07 stall (`sendStalls`) |
| `API-12-web-guards.log` | API-12 | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary` | `f8fad0fc6a` (files) | 2026-11-18 12:39 | guards with the new probe files |

Not committed, to keep the branch small (kept on this machine under `/tmp/api533/uncommitted/`, not needed to judge this
ticket): `API-09-mobile-shell/msp-53-55-files/` (the probe's generated upload inputs, 44 MB of video and PDF) and the
screenshots of the phone cases of other tickets (their results are in `mobile-shell-probe.json`); `API-09b`'s screenshots;
`API-10`'s per-round screenshots except the first and last gaps and the stall.

In the probes' `evidence.json`: each case's `rounds` / fields hold `stops` (Stops the page sent), `acks` (answers the page
received), `nodeAnswers` (answers as the node sent them), `toasts`, and `button` (`[ms after the press, label, aria-busy,
enabled]`); `wireLog` holds every Stop-related frame (`up` page → node, `down` node → page, `node` the node's answer on
arrival). No credential is written (`redactCredentials`).
