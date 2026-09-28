# API/E2E Test-Case Ledger

## Ledger Meta

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel`
- Coverage investigation: `tickets/in-progress/desktop-beta-update-channel/api-e2e-coverage-investigation.md`
- Execution coverage report: `tickets/in-progress/desktop-beta-update-channel/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `tickets/in-progress/desktop-beta-update-channel/api-e2e-revision-record.md`
- Ledger scope: round 1. There are many independent cases, including long-running builds and Electron runs.
- Evidence directory: `tickets/in-progress/desktop-beta-update-channel/api-e2e-evidence/`
- Last updated: 2026-09-27

## Planned Cases

See the Test-Case Ledger Plan in the coverage investigation for the full table. The case IDs are REPO-01..04, DUR-01..04, E2E-UNK, E2E-01..08, BR-01, BR-02, CLI-01, GH-01 and CI-01.

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | REPO-01 | 2026-09-27 | Completed | `python3 -m unittest scripts/tests/test_release_versions.py -v` | 22 OK | 22 OK | Pass | `api-e2e-evidence/r01-release-versions.log` | — |
| 2 | REPO-02 | 2026-09-27 | Completed | `npx vitest run --config ./electron/vitest.config.ts electron/updater` | all pass | 33/33 | Pass | `api-e2e-evidence/r02-updater-specs.log` | — |
| 3 | REPO-03 | 2026-09-27 | Completed | `NUXT_TEST=true npx vitest run` store + About specs | all pass | 39/39 | Pass | `api-e2e-evidence/r03-store-about-specs.log` | — |
| 4 | REPO-04 | 2026-09-27 | Completed | `npx tsc -p electron/tsconfig.json --outDir <tmp>` | `shared/appUpdateTypes.js` emitted and required at runtime | emitted; compiled `appUpdater.js` requires `../../shared/appUpdateTypes`; `require()` returns 4 locked statuses | Pass | `api-e2e-evidence/r04-electron-emit.log` | — |
| 5 | DUR-01/02 | 2026-09-27 | Completed | `python3 -m unittest scripts/tests/test_release_channel_workflow_steps.py -v` | real `run:` blocks classify beta → pre-release + generated notes (desktop and Android); stable unchanged; Docker `:beta` forward-only incl. ARCH-003/005 | 13/13 OK | Pass | `api-e2e-evidence/r05-scripts-tests-full.log` | — |
| 6 | DUR-01 (mutation) | 2026-09-27 | Completed | same tests against the `HEAD` (pre-change) desktop and Android workflows, then restored | changed-behavior tests fail on base | 4 expected failures (beta tag push, beta manual dispatch, desktop + Android notes); files restored (diff stat unchanged) | Pass | `api-e2e-evidence/r05-mutation-base-workflows.log` | — |
| 7 | DUR-03 | 2026-09-27 | Completed | `python3 -m unittest scripts/tests/test_desktop_release_beta.py -v` | beta.1 then beta.2 pushed to a bare origin; package.json-only commit; notes untouched; `--base`/`--no-push`; refusals | 4/4 OK | Pass | `api-e2e-evidence/r05-scripts-tests-full.log` | — |
| 8 | DUR-04 | 2026-09-27 | Completed | launcher test `test_upgrade_all_follows_the_beta_track_after_a_one_time_switch` | latest nodes pull `:latest`; one `--tag beta` then plain upgrades pull `:beta`; back via `--tag latest` | OK | Pass | `api-e2e-evidence/r05-scripts-tests-full.log` | — |
| 9 | REPO-05 | 2026-09-27 | Completed | `python3 -m unittest discover -s scripts/tests -p 'test_*.py' -v` | all pass except pre-existing failures | 86 run; only the 3 pre-existing port/profile launcher failures, which also fail on a clean `HEAD` worktree | Pass (pre-existing failures out of scope) | `api-e2e-evidence/r05-scripts-tests-full.log`, `r05-preexisting-failures-on-base.log` | — |
| 10 | REPO-06 | 2026-09-27 | Completed | actionlint (3 workflows), shellcheck `desktop-release.sh`, web guards | all clean | all exit 0 | Pass | `api-e2e-evidence/r06-lint-guards.log` | — |
| 11 | E2E-UNK | 2026-09-27 | Completed | electron-builder 25.1.8, minimal app at `1.4.91-beta.1`, GitHub publish config, `--publish never`: mac zip arm64 + x64, linux AppImage x64, win nsis x64 | only `latest*.yml`, no `beta*.yml` | `latest-mac.yml` (arm64, x64), `latest-linux.yml`, `latest.yml`; no `beta*.yml` on any platform | Pass | `api-e2e-evidence/unk001-builder/` | Merge/validator run follows in E2E-UNK-b |
| 12 | E2E-01a/b | 2026-09-27 | Completed | Electron harness, new code, Stable (no file), FEED-A (beta newest) | 1.4.90 → no-update; 1.4.89 → 1.4.90 offered; no beta asset requested | as expected; policy `allowPrerelease=false, allowDowngrade=false`; only `/releases/latest` and `v1.4.90/latest-mac.yml` requested | Pass | `api-e2e-evidence/harness-results/E2E-01a-*.json`, `E2E-01b-*.json` | — |
| 13 | E2E-02a/b | 2026-09-27 | Completed | harness, **base** (pre-change) updater at 1.4.89 / 1.4.90, FEED-A | never offered the beta | 1.4.89 → 1.4.90 offered; 1.4.90 → no-update; no request to the beta tag | Pass | `harness-results/E2E-02a-*.json`, `E2E-02b-*.json` | — |
| 14 | E2E-03 | 2026-09-27 | Completed | harness window with the real compiled preload → `setAppUpdateChannel('beta')` | accepted+persisted; re-check offers 1.4.91-beta.1 via the `latest-mac.yml` fallback; broadcasts reach the renderer | accepted=true persisted=true; available 1.4.91-beta.1; `beta-mac.yml` 404 → `latest-mac.yml` 200 (real builder yml); file `{"channel":"beta"}`; renderer received 7 broadcasts ending `available|beta|1.4.91-beta.1` | Pass | `harness-results/E2E-03-ipc-opt-in.json` | — |
| 15 | E2E-04a/b | 2026-09-27 | Completed | relaunch same userData at 1.4.90 (restart); relaunch at 1.4.91-beta.1 (post-upgrade) | channel still beta; startup check offers the newest beta | restart: channel beta, startup → 1.4.91-beta.1; after upgrade: channel beta, badge flag true, startup → 1.4.91-beta.2 | Pass | `harness-results/E2E-04a-*.json`, `E2E-04b-*.json` | — |
| 16 | E2E-05 | 2026-09-27 | Completed | 1.4.91-beta.2, Beta, FEED-B (stable 1.4.91 newest) | stable offered | available 1.4.91 | Pass | `harness-results/E2E-05-*.json` | — |
| 17 | E2E-06a/b | 2026-09-27 | Completed | 1.4.91-beta.1 on Beta → IPC `set-channel('stable')`; then FEED-B | no older stable offered; later stable ≥ X.Y.Z offered | opt-out accepted, re-check no-update (1.4.90 not offered, beta.2 no longer offered); with FEED-B, 1.4.91 offered | Pass | `harness-results/E2E-06a-*.json`, `E2E-06b-*.json` | — |
| 18 | E2E-08 | 2026-09-27 | Completed | corrupt `app-update-channel.v1.json` | reads stable, no beta | channel stable, policy false/false, no-update; file left as is | Pass | `harness-results/E2E-08-*.json` | — |
| 19 | E2E-07 | 2026-09-27 | Completed | real download of the beta zip (identical-signature Electron.app zip) via MacUpdater + Squirrel.Mac, then IPC `set-channel('stable')` | refused in `downloaded` | download 118 MB OK, status downloaded; `set-channel('stable')` → accepted=false, file unchanged | Pass (direct lock) | `harness-results/E2E-07-downloaded-lock.json` | **Observed:** a following manual check turned `downloaded` into `available` → investigate E2E-07b |
| 20 | E2E-07b | 2026-09-27 | Completed | downloaded → `checkForAppUpdates()` → `setAppUpdateChannel('stable')` → quit normally | the channel must stay locked while an update is staged (ARCH-001 / AC-008 / REQ-007) | check → `available/beta/1.4.91-beta.1`; `set-channel('stable')` **accepted=true persisted=true** → `no-update/stable`; Squirrel still holds the staged update (`~/Library/Caches/com.github.Electron.ShipIt/update.nqKS591`). Install-on-quit is not observable with the ad-hoc-signed copy (no ShipIt run on quit or relaunch). Source: `BaseUpdater` (Windows/Linux) installs the staged file on quit and never clears it on a later check. | **Fail** | `harness-results/E2E-07b-*.json`, `E2E-07b-shipit-observation.log`, `E2E-07b-next-launch-observation.log` | UI reachability (BR-02), then classify |

| 21 | E2E-UNK-b | 2026-09-27 | Completed | `merge_latest_mac_metadata.py` + workflow grep gate + `validate_linux_updater_metadata.py` on the real beta builder output | gates accept beta-version metadata | merge exit 0 (version 1.4.91-beta.1), grep gate 0, linux validator 0 | Pass | `api-e2e-evidence/unk001-builder/metadata-gates.log` | — |
| 22 | CLI-01 | 2026-09-27 | Completed | `bash scripts/public/docker/autobyteus-docker.sh help`; PowerShell source; server README; `desktop-release.sh --help` | beta track, return to latest, downgrade caution; all 4 release commands | present in all | Pass | `api-e2e-evidence/cli01-help-docs.log` | — |
| 23 | GH-01 | 2026-09-27 | Completed | `gh api` / `curl` read-only | the existing pre-release is flagged; `/releases/latest` = newest non-prerelease | `v1.1.11-rc1` prerelease=true; latest `v1.4.90` | Pass (premise, partial) | `api-e2e-evidence/gh01-real-github-premise.log` | — |
| 24 | BR-01 | 2026-09-27 | Completed | nuxt dev :3291 `/settings` → Updates, browser tool | switch off, not interactive; copy present | `aria-checked=false`, disabled, label + description, no badge, Check disabled | Pass | `api-e2e-evidence/br01-web-build-updates.png` | — |
| 25 | BR-02 (Electron window) | 2026-09-27 | Checkpoint | harness window loading nuxt dev `/settings` with the real preload | reach Settings | the renderer blocks on shell IPC (`get-server-status`, `check-server-health`, node registry, locale); no result | Blocked (method) | `harness-results/BR-02-about-ui-downloaded-lock.stdio.log` | switched to the browser renderer with the real E2E-07b states |
| 26 | BR-02 (browser) | 2026-09-27 | Completed | live `appUpdate` store set to `downloaded` (beta, 1.4.91-beta.1); bridge returns the real E2E-07b responses | switch stays locked until install/restart | locked + hint, but Check **enabled**; Check → switch enabled → click sends `set-channel:stable` | **Fail** | `api-e2e-evidence/br02-browser-downloaded-lock-bypass.json`, `br02-about-after-check-in-downloaded-switch-to-stable.png`, `br02-browser-method.txt` | API-F-001 |
| 27 | CI-01 | 2026-09-27 | Completed | — | real beta publication | not executable before merge + production tag | Not Tested | — | delivery follow-up |
| 28 | Cleanup | 2026-09-27 | Completed | removed the temp dir, updater/ShipIt caches and the temp worktree; stopped nuxt; closed the tab | no owned residue | verified absent | N/A | execution report "Cleanup Performed" | — |

| 29 | REPO-04 (R2) | 2026-09-27 | Completed | tsc emit of the IR-003 tree + base tree | clean; shared rule exported | clean; `shared/appUpdateTypes.js` exports `isAppUpdateChannelLocked`; staged → locked, idle → unlocked | Pass | `round2/r04-electron-emit.log` | — |
| 30 | REPO-02/03/05/06 (R2) | 2026-09-27 | Completed | updater specs; store + About specs; `scripts/tests` discovery; actionlint/shellcheck/guards | all pass except pre-existing failures | 37/37; 42/42; 86 run with the same 3 pre-existing launcher failures; lint and guards clean | Pass | `round2/r02`, `r03`, `r05`, `r06` logs | — |
| 31 | E2E-07 (R2, prior-failure recheck) | 2026-09-27 | Completed | harness, IR-003 | refused in `downloaded` | `accepted:false`; `updateStaged:true` persists through a later check | Pass | `harness-results/E2E-07-downloaded-lock.json` | — |
| 32 | E2E-07b (R2, prior **Fail**) | 2026-09-27 | Completed | downloaded → check → `set-channel('stable')` | refused while staged | check → `available`, `updateStaged:true`; `set-channel` → `accepted:false, persisted:false`; channel/file/policy stay beta | Pass | `harness-results/E2E-07b-*.json` | API-F-001 resolved |
| 33 | E2E-07c (R2, new) | 2026-09-27 | Completed | downloaded → feed 503 → check → `set-channel('stable')` | refused while staged | `error`, `updateStaged:true`; `accepted:false`; channel/file/policy stay beta | Pass | `harness-results/E2E-07c-*.json` | — |
| 34 | E2E-01a/b, 02a/b, 03, 04a/b, 05, 06a/b, 08 (R2 regression) | 2026-09-27 | Completed | harness, IR-003 (base code for 02a/b) | same results as R1 | identical outcomes; `updateStaged:false` throughout | Pass | `round2/harness-summary.txt` | — |
| 35 | BR-01 + BR-02 (R2) | 2026-09-27 | Completed | nuxt dev :3291, browser; live store with the real IR-003 states; plus a check-IPC rejection | switch locked + hint after Check / failed check / IPC rejection; no `set-channel` sent | as expected; Check and Download remain available | Pass | `round2/br02-browser-staged-lock.json`, `round2/br02-about-staged-lock-after-checks.png` | API-F-001 resolved at the UI |
| 36 | Cleanup (R2) | 2026-09-27 | Completed | removed the temp dir and the updater/ShipIt caches (created 12:21:14); stopped nuxt; closed the tab | no owned residue | verified absent | N/A | execution report "Cleanup Performed" | — |

## Re-entry And Reconciliation

- Last durably recorded event: 36 (Cleanup R2)
- Last completed case and result: BR-02 (R2) Pass
- Cases still running, interrupted, or not started: none. CI-01 is Not Tested (delivery).
- Next case or recovery action: none (round 2 complete)
- Interruption note: the round-1 E2E-07b JSON was overwritten at its canonical path by R2. The R1 observation is preserved in event 20.
- Reconciled into execution coverage report: `Yes` (round 2). See "Test-Case Ledger Reconciliation".
