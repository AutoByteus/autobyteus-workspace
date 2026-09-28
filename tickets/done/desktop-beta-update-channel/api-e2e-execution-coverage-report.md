# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/requirements-doc.md` (Approved, SR-002)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/solution-revision-record.md` (SR-001..SR-005)
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/design-spec.md` (SR-005)
- Supplemental Task Artifacts: None. Product Design: `N/A — not applicable`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/design-review-report.md` (ARCH-REV-003)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/implementation-handoff.md` (IR-003)
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/code-review-report.md` (CRR-004)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/code-review-revision-record.md`
- Delivery Revision Record: N/A
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/api-e2e-revision-record.md`
- Evidence directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/api-e2e-evidence/`
  - Round 2 logs are in `round2/`.
  - `harness-results/` holds the latest (round 2) per-scenario results.
  - Round 1 observations are kept in the ledger and the revision record.
- Current API/E2E Revision ID: `API-REV-002`
- Current Execution Round: 2
- Trigger: CRR-004 implementation re-review pass from `/code_reviewer`. IR-003 implements SR-005 (ARCH-REV-003) and resolves CR-002 / API-F-001.
- Prior Round Reviewed: Round 1 (API-REV-001, Fail, 76%)
- Latest Authoritative Round: 2

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`. The durable tests added in round 1 are unchanged in round 2.

## Investigation And Execution Basis

- Investigation completed before durable coverage changes: `Yes` (round 1). It was updated for round 2.
- Plan followed: `Yes`.
  - The prior failures were rechecked first: E2E-07, E2E-07b and BR-02.
  - E2E-07c (a failed check after the download) was added.
  - Then the full harness regression set and the repository suites were re-run.
- Deviation carried from round 1: BR-02 runs in the browser renderer, not the Electron window.
  - The live store holds the states and responses that the real IR-003 main process returned in E2E-07b and E2E-07c.
  - The real renderer in Electron mode needs the full desktop-shell IPC, which the harness does not provide.
- Reroute required: `No`

## Test-Case Ledger Reconciliation

- Ledger initialized before execution: `Yes`. Every completed case was recorded immediately, and round 2 events were appended.
- Last durably recorded event: see ledger events 29–36.
- Cases not run: CI-01 (by nature a post-merge, production release check).

| Case ID | Final Result (round 2) | Evidence | Reconciled Result / Follow-Up |
| --- | --- | --- | --- |
| REPO-02/03/04/05/06 | Pass | `round2/r0*.log` | — |
| REPO-01, DUR-01..04 | Pass (inside `r05` full discovery) | `round2/r05-scripts-tests-full.log` | Durable; for proportional review |
| E2E-07 (prior pass), E2E-07b (prior **Fail**) | Pass | `harness-results/E2E-07-*.json`, `E2E-07b-*.json`, `round2/harness-summary.txt` | API-F-001 resolved |
| E2E-07c (new) | Pass | `harness-results/E2E-07c-*.json` | — |
| E2E-01a/b, 02a/b, 03, 04a/b, 05, 06a/b, 08 | Pass | `harness-results/*.json`, `round2/harness-summary.txt` | Unchanged results; `updateStaged=false` throughout |
| BR-01 | Pass | `round2/br02-browser-staged-lock.json` (first entry) | — |
| BR-02 (prior **Fail**) | Pass | `round2/br02-browser-staged-lock.json`, `round2/br02-about-staged-lock-after-checks.png` | API-F-001 resolved at the UI |
| E2E-UNK, CLI-01, GH-01 | Pass (round 1; inputs unchanged by IR-003) | round 1 evidence | Not affected (no builder, script, docs or workflow change in IR-003) |
| CI-01 | Not Tested | — | Delivery: first real beta release |

## Compatibility / Legacy Scope Check

- Upstream introduces backward compatibility: `No`.
- Compatibility-only or legacy-retention behavior observed: `No`.
  - `APP_UPDATE_CHANNEL_LOCKED_STATUSES` was removed and replaced by one `isAppUpdateChannelLocked` rule.
  - The emitted `shared/appUpdateTypes.js` exports only that rule.
- Persisted-data transition followed without migration: `Yes`.
  - `updateStaged` is in-memory state only. The file shape is unchanged.
- Durable coverage for compatibility-only behavior: `No`.

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / REQ / AC | Changed Boundary | Execution Surface | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| DUR-01 | BEH-001; AC-001/002; A-1/A-2; AC-012 notes | desktop meta + desktop and Android notes-mode `run:` blocks | bash on extracted blocks | Durable | Pass | `scripts/tests/test_release_channel_workflow_steps.py` |
| DUR-02 | BEH-008; AC-013/014; QR-004; ARCH-003/005 | Docker "Move beta tag" block | bash + sandbox origin + fake `docker` | Durable | Pass | same |
| DUR-03 | BEH-006; AC-009 | `desktop-release.sh beta` | sandbox repo + bare origin | Durable | Pass | `scripts/tests/test_desktop_release_beta.py` |
| DUR-04 | AC-015/016 | launcher saved image ref | fake docker env | Durable | Pass | `test_public_docker_launcher_shared_workspace.py::test_upgrade_all_follows_the_beta_track_after_a_one_time_switch` |
| E2E-UNK | UNK-001; AC-001 metadata | electron-builder output at `1.4.91-beta.1` | real electron-builder 25.1.8 (mac arm64/x64, linux, win) | Temporary | Pass (round 1) | `unk001-builder/` |
| E2E-01a/b | AC-003, QR-001 | Stable policy → real `GitHubProvider` | Electron harness | Desktop | Pass | JSON |
| E2E-02a/b | REQ-003 | pre-change updater | Electron harness (base code) | Desktop | Pass | JSON |
| E2E-03 | AC-004, QR-003 | preload → IPC → persist → re-check | Electron harness window | Desktop | Pass | JSON |
| E2E-04a/b | AC-006 | relaunch; version change | Electron harness | Desktop | Pass | JSON |
| E2E-05 | AC-005 | Beta receives a newer stable | Electron harness | Desktop | Pass | JSON |
| E2E-06a/b | AC-008 (no downgrade; later stable) | opt-out on a beta build | Electron harness | Desktop | Pass | JSON |
| E2E-07 | AC-008 lock | real download → `downloaded` → set-channel | Electron harness + MacUpdater + Squirrel.Mac | Desktop | Pass | JSON |
| E2E-07b | AC-008, REQ-007, ARCH-001, SR-005 | `downloaded` → manual check → set-channel | Electron harness | Desktop | Pass | JSON |
| E2E-07c | AC-008, SR-005 | `downloaded` → failed check (feed 503) → set-channel | Electron harness | Desktop | Pass | JSON |
| E2E-08 | REQ-005 | corrupt preference | Electron harness | Desktop | Pass | JSON |
| BR-01 | AC-007, AC-011 | web build | Browser | Browser | Pass | JSON |
| BR-02 | AC-008 UI lock, SR-005 | About card when an update is staged | Browser renderer, live store with the real IR-003 responses | Browser | Pass | JSON, PNG |
| CLI-01 | AC-017 | help/README | bash | Temporary | Pass (round 1) | log |
| GH-01 | REQ-002 premise | real GitHub, read-only | `gh`/`curl` | Live | Pass (partial, round 1) | log |
| CI-01 | AC-001 publication, AC-012, AC-013/014 digests | GitHub Actions/Docker Hub/TestFlight | — | — | Not Tested | see Not Tested |

## Round 2 Key Observations (real IR-003 main process)

| Step | E2E-07 | E2E-07b | E2E-07c |
| --- | --- | --- | --- |
| After download | `downloaded`, `updateStaged:true` | `downloaded`, `updateStaged:true` | `downloaded`, `updateStaged:true` |
| Intervening check | — | `available/1.4.91-beta.1`, `updateStaged:true` | feed 503 → `error`, `updateStaged:true` |
| `setAppUpdateChannel('stable')` | `accepted:false` | **`accepted:false, persisted:false`** (round 1: accepted) | `accepted:false, persisted:false` |
| Channel / file / policy after | beta / `{"channel":"beta"}` / `allowPrerelease=true, allowDowngrade=false` | same | same |
| Later check in E2E-07 | `available`, still `updateStaged:true` | — | — |

BR-02 (browser, About page):
- In `downloaded`, the switch is disabled and the hint shows. Check is enabled; Install & Restart is shown.
- After Check (`available`), the switch is still disabled and the hint still shows. Download Update is offered.
- After a failed check (`error`), the switch is still disabled and the hint still shows.
- When the check IPC call itself rejects (the store catch path), `updateStaged`, the channel and the pre-release flag are kept, and the switch stays locked.
- Clicking the switch never sent `set-channel`.

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository (R2) | Final (R2) | Change vs R1 final | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 80% | 90% | +40 | Every in-app AC is proven directly, including AC-008 after SR-005. AC-009/015/016/017 are proven through CLI. | AC-001/012/013/014 publication can only be proven by the first real CI beta run. Their approved verification intent is "CI run on a beta tag". |
| Changed-boundary execution directness | 80% | 95% | +5 | Real electron-updater, IPC/preload, `userData`, builder output, workflow shell, script and launcher | CI publication |
| Cross-boundary integration realism | 75% | 90% | +5 | Only the feed host is substituted, using real builder metadata and a real download through Squirrel.Mac | GitHub/`softprops` publish interplay |
| Environment/config/fixture fidelity | 85% | 90% | +5 | `app-update.yml` config path; real tag inventory; real GitHub premise | Fixture feed instead of github.com |
| Failure/edge/lifecycle | 80% | 95% | +45 | Lock holds across a successful check, a failed check and a rejected IPC call. Restart, version change, corrupt file and real download all verified. | Install-on-quit of a signed build is proven from the library source only. P-007 (lock until restart after a failed replacement download) is accepted upstream. |
| User-surface/browser/desktop-shell | 85% | 90% | +15 | Web build render; About lock/hint/buttons driven by the real main-process states | The real Electron renderer window was not reached (it needs shell IPC) |
| Durable regression coverage | 95% | 95% | +5 | DUR-01..04 (mutation-checked); the implementer's `it.each` regression through the real `app-update:check` handler (37 updater specs); store and About (42) | — |

- Overall post-repository confidence (R2): 83%
- Overall final confidence: 92% (simple average; no category below 90%)
- Confidence change from broader validation: +9 points over post-repository; +16 points over round 1.
- Every critical AC directly proven: `Yes` for every in-app and tooling AC.
  - AC-001 publication, AC-012 and AC-013/014 digests are verified by their approved method only on the first real beta CI run.
  - Their classification logic, metadata output and `:beta` decision logic are proven here by real execution.
- Final categories below 90%: `No`.
- 95% target met: `No` (92%).
  - The remaining gap is CI-01, which cannot run before merge and a production tag push.
  - The requirements assign that verification to the real CI run (AC-001, AC-012, AC-013, AC-014 verification intent).
  - No further local surface would materially close it. It is handed to delivery as a required first-beta verification.

## Broader Validation Decision And Execution

- Decision: `Required`, executed. Modes:
  - Electron runtime harness (project desktop validation);
  - browser;
  - repository suites;
  - builder, CLI and GitHub evidence from round 1 (inputs unchanged).
- Startup:
  - Electron harness: a temp copy of Electron 42.4.1, with the compiled current and base trees in a temp dir.
  - nuxt dev: `127.0.0.1:3291` (HTTP 200 `/settings`).
  - `ELECTRON_RUN_AS_NODE` is removed for the harness child process.
- E2E-07c emulates a failed check by switching the fixture feed to HTTP 503 after the download.
- Note: in E2E-07b and E2E-07c, electron-updater reused the zip already downloaded to its cache by E2E-07 ("Update has already been downloaded"). The zip was re-served to Squirrel, and `update-downloaded` and `updateStaged` were set through the real event path.

## Desktop Application Validation

- Approach:
  - A focused shell harness. The compiled `AppUpdater`, preload and logger run with the real electron-updater.
  - Only `app.isPackaged` and `app.getVersion()` are overridden.
  - It uses a separate `userData`, a temp Electron copy and a separate updater cache.
- Effect on the running desktop app: None.
- Not proven:
  - The real Electron renderer window.
  - Signed-build Squirrel/NSIS/AppImage install. With the SR-005 lock this no longer affects AC-008: the channel cannot change while an update is staged.

## Platform / Runtime Targets

- macOS (Darwin 25.5.0, arm64); Electron 42.4.1; electron-updater 6.8.3; electron-builder 25.1.8; Python 3.9.6; browser tool for BR-01/BR-02.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Decision: `Directly Usable — No Migration`.
- Exercised:
  - no file → Stable;
  - corrupt file → Stable;
  - saved `beta` across relaunch and a version change;
  - opt-out persisted.
- `updateStaged` starts `false` on every launch (all `afterInitialize` states) and is never persisted.
- Version-specific branch or fallback: `No`.

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Result | Notes |
| --- | --- | --- | --- | --- |
| `scripts/tests/test_release_channel_workflow_steps.py` (13) | Added (round 1) | AC-001/002/012 notes/013/014, QR-004, ARCH-003/005 | Pass | Unchanged in round 2 |
| `scripts/tests/test_desktop_release_beta.py` (4) | Added (round 1) | AC-009, REQ-006 | Pass | Unchanged |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py::test_upgrade_all_follows_the_beta_track_after_a_one_time_switch` | Added (round 1) | AC-015/016 | Pass | Unchanged |

The API/F-001 regression spec in `electron/updater/__tests__/appUpdater.spec.ts` (`it.each` over available, no-update and error through the real `app-update:check` handler) is implementation-owned. It was source-reviewed in CRR-004 and runs green here (37/37).

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase

- API/E2E-owned durable coverage: added in round 1 (3 paths above). No change in round 2. Nothing removed.
- Attached for proportional test-code review: `Yes`.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `api-e2e-evidence/harness/` | Electron harness + runner. Round 2 added the `feed-down` op, the E2E-07c scenario and `updateStaged` in the snapshots, and reads the saved builder `.yml`. | Retained | The `BR-02-about-ui-downloaded-lock` Electron-window scenario is kept, documented as not reachable (shell IPC). |
| `api-e2e-evidence/harness-results/` | Latest (round 2) per-scenario JSON, stdio and app logs | Retained | The round-1 E2E-07b JSON was overwritten at its canonical path. The round-1 observations are in the ledger (event 20) and the revision record. The round-1 BR-02 JSON/PNG remain at `api-e2e-evidence/br02-*`. |
| `api-e2e-evidence/round2/` | Round 2 logs, harness summary, BR-02 JSON/PNG/method | Retained | — |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Cleanup Result |
| --- | --- | --- |
| `$TMPDIR/abx-e2e-*` (compiled trees, Electron copy, `userData`, download zip) | Isolation | Removed |
| `~/Library/Caches/abx-e2e-updater`, `~/Library/Caches/com.github.Electron.ShipIt` (created 12:21:14 by this round) | Harness updater and Squirrel caches | Removed |
| nuxt dev `127.0.0.1:3291`; browser tab `7b1395` | BR-01/BR-02 | Stopped / closed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| GitHub Releases feed | Local GitHub-shaped server (can switch to 503) | No test releases in production | GitHub's own flag handling (GH-01 premise only) |
| `app.isPackaged`, `app.getVersion()` | Module-load proxy | An unpacked run otherwise disables the updater | Low |
| Docker registry | Fake `docker` | Credentials, production registry | Digest parity is unproven (CI-01) |
| Desktop-shell IPC for the renderer (BR-02) | Live store with the real IR-003 main-process responses | The renderer needs the full shell | UI-only; the main-process behavior is real |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | REPO-*, DUR-01..04, E2E-UNK, E2E-01..08 (incl. 07b, 07c), BR-01, BR-02, CLI-01, GH-01 | All approved in-app, tooling and CI-logic behavior validated. API-F-001 is resolved at both the main-process and UI boundaries. |
| Not Tested | CI-01 | The real beta publication needs merged code and a production tag. It is the approved verification method for AC-001/012/013/014. |

## Not Tested / Deferred

| Behavior | Reason | Required Follow-Up |
| --- | --- | --- |
| CI-01: the first real `vX.Y.Z-beta.N` run. It must show: GitHub Pre-release flag with "Latest" unchanged; `latest-mac.yml`, `latest-linux*.yml` and `latest.yml` attached; generated notes in both the desktop and Android writes; APK attached; TestFlight upload; Docker `:X.Y.Z-beta.N` and `:beta` on the same digest with `:latest` unchanged. Separately, after a stable run, all three tags share a digest. | Post-merge production action | **Delivery must verify this on the first beta release.** Any design escalation trigger (`beta*.yml`, a pre-release resolved for Stable, conflicting `softprops` writes) goes to `/solution_designer`. |
| Signed-build install of a staged update | Local copy is ad-hoc signed | Operator's first real beta upgrade |
| PowerShell help render | `pwsh` unavailable | Source text reviewed |
| P-007: after a failed replacement download, the lock stays until restart | Accepted upstream (SR-005/ARCH-REV-003) | None |

## Cleanup Performed

| Resource | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Temp dir, updater/ShipIt caches, nuxt dev, browser tab (round 2) | Created by this run | Removed / stopped / closed | Verified absent |
| `~/Library/Application Support/Electron` | Pre-existing | Untouched | — |

## Preliminary Classification

N/A. Validation passes.

## Recommended Recipient

`/code_reviewer`, for proportional test-code review of the durable API/E2E tests.

## Evidence / Notes

- Design escalation triggers, as far as they can be observed locally:
  - no `beta*.yml` emitted;
  - no pre-release resolved for `allowPrerelease=false`, in either the new code or the pre-change code;
  - `softprops` interplay: CI-01 only.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 92%
- Default 95% target met: `No`. The gap is CI-01, which is only verifiable on the first real beta release and is assigned to delivery.
- Any final category below 90%: `No`
- Broader validation decision: `Required` (executed)
- Critical AC lacking direct proof: none among the locally verifiable ACs. AC-001 publication, AC-012 and AC-013/014 digests follow their approved "first CI beta run" verification (delivery).
- Required next recipient: `/code_reviewer` (proportional test-code review)
- Notes: API-F-001 is resolved. The round-1 durable tests are unchanged.
