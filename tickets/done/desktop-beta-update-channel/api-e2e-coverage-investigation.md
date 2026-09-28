# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/requirements-doc.md` (Approved, SR-002 basis)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/solution-revision-record.md` (SR-001..SR-004)
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/design-spec.md` (SR-004)
- Supplemental Task Artifacts: None. Product Design: `N/A — not applicable`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/implementation-handoff.md` (IR-002)
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/code-review-report.md` (CRR-002, Pass)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/code-review-revision-record.md`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/api-e2e-test-case-ledger.md`
- Evidence directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/api-e2e-evidence/`
- Current Investigation Round: 1
- Trigger: Code review pass CRR-002 (round 2) from `/code_reviewer`
- Prior Investigation Reviewed: None (first API/E2E round)
- Latest Authoritative Investigation: Round 1

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (durable tests are added in this round)

## Current Requirement And Design Basis

The approved requirements (SR-002) define REQ-001..011 and AC-001..017. The design (SR-004) defines five spines:

- **DS-001:** tag classification and notes mode in the release workflows.
- **DS-002:** channel policy is applied before every check. `allowPrerelease = channel === 'beta'` and `allowDowngrade = false`; `channel` is never set.
- **DS-003:** the switch goes renderer → preload → IPC `app-update:set-channel` → `AppUpdater.setUpdateChannel`. The change is refused in the locked states, including `downloaded`. Otherwise it persists, applies and re-checks.
- **DS-004:** `desktop-release.sh beta` uses `release_versions.py next-beta`.
- **DS-005:** a forward-only Docker `:beta` move runs after the push. It re-fetches tags and loads the helper from `$GITHUB_SHA` (ARCH-005).

Design escalation triggers (any one returns a Design Impact):

1. The build emits `beta*.yml`.
2. A pre-release is resolved for an `allowPrerelease=false` install.
3. `softprops` rewrites conflict between the desktop and Android jobs.

The code review passed with no open findings.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 release classification (desktop meta + notes mode) | Changed | REQ-001, AC-001/002; design DS-001 | Execute the real workflow `run:` blocks for beta, stable and manual-dispatch inputs. Confirm builder metadata naming for a beta version (UNK-001). |
| BEH-002 Stable policy | Changed | REQ-002/003, AC-003, QR-001 | Run the real electron-updater against a GitHub-shaped feed. Cover the new build on Stable and the old (base) updater at 1.4.89. |
| BEH-003 switch / persistence / IPC | Added | REQ-004/005/009, AC-004..007, AC-011, QR-003 | Real preload → IPC → AppUpdater → file → re-check in the Electron runtime. Browser/UI coverage of the switch. |
| BEH-004 no downgrade / downloaded lock | Added | REQ-007, AC-008 | Real updater on a beta build with Stable. Lock in `downloaded` through real IPC. |
| BEH-005 Beta badge | Added | REQ-008, AC-010 | Component test plus rendered UI. |
| BEH-006 `desktop-release.sh beta` | Added (release/test/manual-dispatch preserved) | REQ-006, AC-009 | Sandbox git + bare origin execution. |
| BEH-007 Android/iOS | Preserved (Android notes aligned) | AC-012 | Execute the Android notes-mode block. A real CI run is needed for the APK/TestFlight upload. |
| BEH-008 Docker `:beta` + launcher/docs | Added | REQ-010/011, AC-013..017, QR-004 | Execute the real "Move beta tag" block with a fake `docker` and a sandbox origin. Launcher `upgrade` with a fake docker. Help/README review. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `release_versions.py` grammar/precedence/next-beta/is-newest | 22 Python unit tests on the real tag inventory | Callers (script, workflow) exercised only by review/actionlint | CLI sandbox; workflow-step execution |
| API / transport / contract | Yes | IPC `app-update:set-channel`; preload `setAppUpdateChannel`; `AppUpdateState` fields | Unit tests with `electron` and `ipcMain` mocked | Real preload/contextBridge/ipcMain round trip is unexercised | Electron-runtime harness |
| Frontend component / state | Yes | `appUpdateStore.setUpdateChannel`; About switch/badge/hint | 39 store/About specs (mocked bridge) | Rendered result with a real bridge | Browser (nuxt dev) + Electron harness window |
| Browser integration / user journey | Yes (web build) | Switch not interactive without Electron (AC-011) | Component spec | Real rendered web build | Browser |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | About → Updates card | Component spec | Real render | Browser |
| Desktop shell / Electron-specific integration | Yes | electron-updater policy, `userData` file, IPC | Unit tests mock `electron-updater` entirely | Real `GitHubProvider` resolution and version comparison under the new policy are unexercised | Electron runtime harness + local GitHub-shaped feed |
| Process / lifecycle | Yes | Restart and in-app upgrade keep the channel; startup check | Unit tests | Real relaunch with the same `userData` | Electron harness relaunch |
| Persisted-data transition | Yes | New `app-update-channel.v1.json` (Directly Usable — No Migration) | Store spec (missing/invalid/corrupt) | Real runtime reads a pre-existing/corrupt file | Electron harness |
| Worker / queue / distributed coordination | Yes (CI) | Concurrent tag runs deciding `:beta` | `is-newest` unit tests | The real step's shell (fetch, `git show $GITHUB_SHA`, decision) | Execute the step against a sandbox origin |
| External integration | Yes | GitHub Releases pre-release flag, electron-builder metadata, Docker Hub, TestFlight | None executable in repo | Real CI publication | Local electron-builder build; real GitHub feed read-only; real CI run (post-merge only) |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel` (branch `codex/desktop-beta-update-channel`, uncommitted changes over `origin/personal` @ `82f3359cb`)
- Project type: pnpm monorepo; Nuxt 3 renderer + Electron 42.4.1 main (`autobyteus-web`); electron-builder 25.1.8; electron-updater 6.8.3; release tooling in bash/Python 3; GitHub Actions workflows.
- Conflicting/missing instructions:
  - Dependencies were installed with `--ignore-scripts`, so two unrelated suites fail at import. This is pre-existing and noted in the implementation handoff.
  - `pwsh` is unavailable.
- Required secrets:
  - Not available and not needed for local checks.
  - A real CI release requires repo push rights, Apple/Docker Hub/TestFlight secrets and a merged commit. That is not in API/E2E scope.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-web/AGENTS.md` | Web dev guide | `pnpm test:nuxt --run`, `pnpm test:electron`. Release flow: merge to `personal`, then run `release` (tag push starts the real workflow). Do not create release tags manually. |
| `autobyteus-web/package.json` | Scripts | `test:electron` = `vitest --config ./electron/vitest.config.ts`; `transpile-electron` = `tsc -p electron/tsconfig.json` (outDir `../dist`); `build:electron:*` → `build/dist/build.js` |
| `autobyteus-web/build/scripts/build.ts` | electron-builder config | GitHub publish provider (owner/repo from env/remote). `files: dist/**/*`. mac `dmg`+`zip`, linux `AppImage`, win `nsis`. `publish: 'never'` (CI uploads). |
| `autobyteus-web/electron/logger.ts`, `appDataPaths.ts` | Logging | Logger writes to `~/.autobyteus/logs` unless `configureElectronLogger({baseDataPath})` is called. The harness redirects it to a temp dir. |
| `.github/workflows/release-desktop.yml`, `release-android.yml`, `release-server-docker.yml` | Release CI | The `run:` blocks to execute locally. `merge_latest_mac_metadata.py` and `validate_linux_updater_metadata.py` gate the metadata. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Launcher tests | Fake docker environment helpers (`fake_docker_environment`, `run_launcher`, `read_call_records`). |
| `node_modules/electron-updater/out/providers/GitHubProvider.js` | Updater behavior | Stable: `/releases/latest` (for a custom host, `/api/v3/repos/<o>/<r>/releases/latest`). Beta: first feed entry, with `beta-*.yml` then a `latest*.yml` fallback. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Fixture GitHub feed (Node http) | temp dir under `$TMPDIR/abx-e2e-*` | started inside the harness process | 127.0.0.1 ephemeral port | request log | closed on harness exit |
| Electron runtime harness | `autobyteus-web` (uses its `node_modules/electron`) | `node_modules/.bin/electron <harness-app-dir>` | separate `userData` in temp; logger redirected; no single-instance lock; the user's running AutoByteus app is not touched | JSON result file | process exits; temp dir removed |
| Compiled updater (new and base) | temp outDir | `tsc -p electron/tsconfig.json --outDir <tmp>`; base from `git show HEAD:` sources | — | emitted files present | temp dir removed |
| electron-builder minimal build | temp project | `electron-builder --mac zip` / `--linux AppImage`, `--publish never`, `electronDist` = local electron | unsigned; no network for Electron dist | `electron-dist/*.yml` present | temp dir removed |
| nuxt dev (browser renderer) | `autobyteus-web` | `npx nuxi dev --port <free>` | no backend required for `/settings` | HTTP 200 | kill owned PID |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Release feed with stable + beta entries | Synthesized `releases.atom`, `releases/latest` JSON and per-tag `latest-mac.yml` (the beta tag uses the real electron-builder output where available) | local only; no GitHub writes | temp removed; copies of the feed kept in evidence |
| Git tag inventories | `scripts/tests/fixtures/release_tags_origin_v_2026-09-27.txt`; sandbox repos | sandbox bare origins only; the real origin is never pushed | temp removed |
| Channel preference files | written by the app under the harness `userData` | temp only | removed |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- References: design-spec "Persisted Data / State Transition Decision"; implementation handoff "Persisted Data Transition Check" (clean).
- Representative existing data:
  - no file (every current install);
  - a corrupt file;
  - a valid `beta` file carried across a relaunch at a newer version.
- Evidence planned:
  - the real runtime reads no file as `stable` and offers no beta;
  - it reads a corrupt file as `stable`;
  - a saved `beta` survives relaunch and a version change.
- Migration scenarios: N/A.
- Upstream ambiguity: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/updater/__tests__/appUpdater.spec.ts` (20 tests, 12 channel) | Policy at check time, guards, save failure, re-check, `channel` never set | AC-003..008, DS-002/003 | Still Valid | 33/33 pass (with channel store + classifier specs) | Keep; complement with real-updater evidence |
| `autobyteus-web/electron/updater/__tests__/appUpdateChannelStore.spec.ts` (9) | Missing/invalid/corrupt → stable; round-trip; write failure | REQ-005, AC-006 | Still Valid | pass | Keep |
| `autobyteus-web/stores/__tests__/appUpdateStore.spec.ts` (16, 7 new) | Store mirrors fields; `setUpdateChannel` result handling | DS-003, ARCH-004 | Still Valid | 39/39 with About | Keep |
| `autobyteus-web/components/settings/__tests__/AboutSettingsManager.spec.ts` (23, 17 new) | Switch default off, toggles, locked states, web build, badge, en/zh-CN copy | AC-007, AC-008 (UI), AC-010, AC-011 | Still Valid | pass | Keep |
| `scripts/tests/test_release_versions.py` (22) | Grammar, precedence, next-beta, is-newest on the real inventory | REQ-006, REQ-010, ARCH-002/003 | Still Valid | 22 OK | Keep |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` `test_upgrade_all_preserves_each_node_saved_image_ref_by_default`, `..._with_explicit_tag_retargets_all_nodes` | Saved image ref is sticky; `--tag` retargets and is saved | AC-015/016 (mechanism) | Still Valid | pre-existing | Keep; add the beta-specific journey |
| `scripts/tests/test_merge_latest_mac_metadata.py` | mac metadata merge | AC-001 (metadata gate) | Still Valid | — | Run; exercise with real beta builder output |
| `scripts/tests/test_server_docker_cli_latest_defaults.py` | Docker workflow text invariants | BEH-008 preserved | Still Valid / Out Of Scope for channel logic | — | Run as regression |
| No existing coverage | Workflow `run:` block logic (desktop meta, notes mode, Docker `:beta`) | AC-001/002/012/013/014, QR-004, ARCH-005 | — | only actionlint/shellcheck | Add durable |
| No existing coverage | `desktop-release.sh beta` end-to-end | AC-009 | — | only a manual sandbox run by implementation | Add durable |

## Stale Or Obsolete Coverage Decisions

None. No existing test asserts the removed tag-push `PRERELEASE="false"` behavior.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| DUR-01 | Desktop meta step classification (tag push beta/stable; manual dispatch beta with `prerelease=false`; stable with input true/false); desktop + Android notes-mode steps | AC-001, AC-002, AC-012 notes, A-1/A-2 | `scripts/tests/test_release_channel_workflow_steps.py` | The release classification is the single most consequential line of this change (it decides who is offered a build). Today it is guarded only by lint. Executing the real `run:` blocks catches future edits. |
| DUR-02 | Docker "Move beta tag" step: beta newest; stable newest; older re-publish; concurrent newer tag on origin; checkout predating the helper (ARCH-005); zh variant condition | AC-013, AC-014, QR-004, ARCH-003/005 | same file | Forward-only `:beta` has several ordering edges. Executing the real block with a fake `docker` and a sandbox origin proves the decision logic without registry access. |
| DUR-03 | `desktop-release.sh beta` twice → beta.1, beta.2 pushed; `package.json` bumped; notes untouched; refusals (dirty, wrong branch, stable exists for base) | AC-009, REQ-006 | `scripts/tests/test_desktop_release_beta.py` | An operator entry point that mutates git and pushes tags. Currently verified only by a manual sandbox run. |
| DUR-04 | Launcher: `upgrade --all --tag beta` once, then plain `upgrade --all` pulls `:beta` | AC-016 (AC-015 already covered) | add one test to `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Documents the approved Docker beta-track contract on the launcher's saved-ref semantics. |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `python3 -m unittest scripts/tests/test_release_versions.py -v` | worktree root | helper grammar/ordering | Pass (22) | `api-e2e-evidence/r01-release-versions.log` |
| 2 | `npx vitest run --config ./electron/vitest.config.ts electron/updater` | `autobyteus-web` | updater policy/command (mocked updater) | Pass (33) | `api-e2e-evidence/r02-updater-specs.log` |
| 3 | `NUXT_TEST=true npx vitest run stores/__tests__/appUpdateStore.spec.ts components/settings/__tests__/AboutSettingsManager.spec.ts` | `autobyteus-web` | store + About | Pass (39) | `api-e2e-evidence/r03-store-about-specs.log` |
| 4 | `npx tsc -p electron/tsconfig.json --outDir <tmp>` + check emitted `shared/appUpdateTypes.js` | `autobyteus-web` | runtime-shared constant ships | Planned | `api-e2e-evidence/r04-*` |
| 5 | New durable tests DUR-01..04 + regression `scripts/tests` suites | worktree root | workflow steps, release script, launcher | Planned | `api-e2e-evidence/r05-*` |
| 6 | actionlint on the 3 workflows; shellcheck `desktop-release.sh`; web guards | worktree | lint gates | Planned | `api-e2e-evidence/r06-*` |

## Test-Case Ledger Plan

- Ledger required: `Yes`. There are many independent cases, including long-running builds and Electron runs, and a real risk of context compression.
- Canonical ledger path: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Case granularity: one scenario, journey, or probe per case.

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Evidence Expected |
| --- | --- | --- | --- | --- | --- | --- |
| REPO-01..03 | Existing suites | all unit-level | vitest / unittest | as above | 1 | logs |
| REPO-04 | Compiled `shared/appUpdateTypes.js` emitted and required by `appUpdater.js` | packaged smoke (partial) | tsc emit | tsc outDir temp | 2 | log |
| DUR-01..04 | New durable tests | AC-001/002/009/012(notes)/013/014/016, QR-004 | unittest executing real workflow blocks / script / launcher | `python3 -m unittest …` | 3 | logs |
| E2E-UNK | electron-builder build of a `-beta.N` version emits `latest-mac.yml`/`latest-linux.yml` (no `beta*.yml`); merge script + Linux validator accept them | UNK-001, AC-001 (metadata) | real electron-builder | temp project | 4 | `electron-dist` listing, yml |
| E2E-01 | New build, Stable (no file), beta newest in feed → no update | AC-003, QR-001 | real Electron + compiled AppUpdater + real electron-updater + fixture feed | harness | 5 | result JSON, feed request log |
| E2E-02 | Base (pre-change) updater at 1.4.89 → offered newest stable only, never the beta | AC-003 / REQ-003 | same, base sources | harness | 6 | result JSON |
| E2E-03 | Renderer → real preload → IPC `set-channel('beta')` → persisted → re-check → beta offered; beta metadata resolved via `latest-mac.yml` fallback | AC-004, QR-003, UNK-001 | harness BrowserWindow with the real preload | harness | 7 | result JSON, file content, request log |
| E2E-04 | Relaunch (restart) with the same `userData` → startup check offers beta; relaunch at a newer version (in-app upgrade emulation) → channel still beta | AC-006, AC-004 startup | harness relaunch | harness | 8 | result JSON |
| E2E-05 | Running beta, Beta channel, newest release is stable → stable offered | AC-005, AC-008 (later stable) | harness | harness | 9 | result JSON |
| E2E-06 | Running `X.Y.Z-beta.N`, switch off via IPC, older stable latest → no update | AC-008 | harness | harness | 10 | result JSON |
| E2E-07 | `downloaded` state → switch refused via real IPC; file unchanged | AC-008 (lock) | harness | harness | 11 | result JSON |
| E2E-08 | Corrupt preference file → stable, no beta | AC-006 alt, REQ-005 | harness | harness | 12 | result JSON |
| BR-01 | Web build About → Updates: switch off and not interactive | AC-007, AC-011 | Browser (nuxt dev) | browser tools | 13 | DOM + screenshot |
| BR-02 | Electron renderer About → Updates with the real bridge: switch toggles, badge on beta build, locked hint in `downloaded` | AC-004 (UI), AC-008 (UI), AC-010 | harness BrowserWindow loading nuxt dev with the real preload | harness | 14 | DOM snapshot JSON |
| CLI-01 | `autobyteus-docker help` + README text | AC-017 | bash launcher | `bash scripts/public/docker/autobyteus-docker.sh help` | 15 | output |
| GH-01 | Real GitHub feed (read-only): `/releases/latest` excludes the existing pre-release | REQ-002 premise | GitHub API | `gh api` / `curl` | 16 | output |
| CI-01 | Real beta tag CI run (desktop pre-release flag, Latest unchanged, assets, Android APK, iOS TestFlight, Docker digests) | AC-001, AC-012, AC-013, AC-014 | GitHub Actions / Docker Hub | requires merged code + a real tag push | — | Not executable in this stage (see below) |

## Post-Repository Confidence Scorecard (Mandatory)

Filled after repository execution. See the "Post-Repository Confidence Update" section below.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution modes:
  - `Project Desktop Validation` (a focused Electron-runtime harness, not the full desktop app);
  - `Browser`;
  - `CLI`;
  - `Other` (a local electron-builder build and execution of the workflow steps).
- Gaps addressed:
  - Repository tests mock electron-updater and the IPC bridge entirely.
  - The claim that betas are hidden from Stable and existing installs depends on real `GitHubProvider` resolution and version comparison.
  - UNK-001 depends on real electron-builder output.
  - Workflow logic is guarded only by lint.
- Why these modes help: they run the real third-party code paths (electron-updater, electron-builder) and the real shell blocks, with the only substitution being the network endpoint.
- Expected confidence after validation: about 90–95%. A real CI publication cannot run before merge.
- Browser decision: Browser for web-build rendering (AC-011). The Electron-mode UI uses the harness window with the real preload, because the browser cannot provide the IPC boundary.

## Desktop Application Validation Decision

- Desktop framework: Electron 42.4.1 + electron-updater 6.8.3.
- Instructions: `autobyteus-web/AGENTS.md`, `docs/electron_packaging.md`.
- Web-equivalent behavior: About card rendering (browser).
- Shell-specific behavior:
  - preload/IPC;
  - the `userData` file;
  - electron-updater resolution;
  - relaunch persistence.
- Chosen approach: a focused harness launched with the project's own Electron binary.
  - It loads the compiled `AppUpdater`, preload and logger.
  - It points the real electron-updater at a local GitHub-shaped feed (`setFeedURL` with `provider: github`, `host`, `protocol: http`).
  - It overrides only `app.isPackaged`, through a module-load proxy, so the updater is active in an unpacked run.
  - This is the last-resort shell validation the skill allows. It uses a separate `userData` and does not touch the user's running app.
- Effect on the running desktop app: None.
- Not proven: Squirrel/NSIS/AppImage install mechanics (unchanged by this ticket; non-goal) and code signing.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| E2E-UNK | Minimal electron-builder project (same builder version, GitHub publish config, `-beta.N` version) | Builder metadata naming | Needs a full packaging toolchain and takes minutes. Better as a first-release check. |
| E2E-01..08, BR-02 | Electron harness + fixture feed | Real updater resolution, IPC, persistence, lock | Needs the Electron binary, a GUI session and a compiled tree. Not suited to the vitest unit suites; the policy is already unit-covered. |
| BR-01 | nuxt dev + browser tool | Web-build render | Component spec already covers the assertion durably. |
| GH-01 | Read-only GitHub API | Platform premise | Depends on live external state. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| CI-01 real beta tag run (AC-001 publication, AC-012, AC-013/014 digests, `softprops` interplay between the desktop and Android jobs) | Workflows run from the tag's commit. Proof needs this uncommitted work merged to `personal` and a real `v*-beta.N` tag pushed to production GitHub/Docker Hub/TestFlight. That is a user-authorized release action owned by delivery, not API/E2E. | The CI publication path, emulated here step by step. The residual risk is GitHub/`softprops` platform behavior. | Delivery must verify it on the first beta release: pre-release flag, Latest unchanged, `latest*.yml` assets, generated notes, APK, TestFlight, and `:beta`/version digest parity with `:latest` unchanged. Any design escalation trigger goes to `/solution_designer`. |
| Real install (Squirrel.Mac/NSIS/AppImage) of a downloaded beta | Signing and installer mechanics are unchanged (non-goal). An unsigned local build cannot be installed through Squirrel. | Low | Covered by the first real beta in-app upgrade by the operator. |
| PowerShell help rendering | `pwsh` not installed | Low (plain text in the here-string) | Delivery/docs review |

## Ambiguities Or Reroute Triggers

At investigation time there were none. Execution then found the following.

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| **API-F-001:** the `downloaded` channel lock (AC-008 / ARCH-001 / REQ-007) is bypassed. A manual "Check for updates" in `downloaded` (preserved behavior; the About Check button stays enabled) moves the status to `available`/`no-update`/`error`. The status-based lock then releases while the downloaded beta stays staged, so `set-channel('stable')` is accepted. | Preliminary: `Design Impact`. The design specifies a status-based lock (`status ∈ {checking, downloading, downloaded, installing}`), and the implementation follows it literally. The design did not account for the preserved manual check leaving `downloaded` while the update stays staged. Failure-origin review is requested. | `api-e2e-evidence/harness-results/E2E-07b-*.json`, `api-e2e-evidence/br02-browser-downloaded-lock-bypass.json`, electron-updater source (`BaseUpdater.addQuitHandler`/`install`; `DownloadedUpdateHelper.clear` is only called on a new download) | `/code_reviewer` (failure-origin review) |

## Post-Repository Confidence Update (Round 1)

### Repository results

| Order | Command | Result | Evidence |
| --- | --- | --- | --- |
| 1–3 | existing Python / updater / store+About suites | Pass (22 / 33 / 39) | `r01`–`r03` logs |
| 4 | tsc emit of `shared/appUpdateTypes.js` | Pass | `r04-electron-emit.log` |
| 5 | new durable DUR-01..04 + full `scripts/tests` discovery (86) | Pass. The only failures are 3 launcher port/profile tests, which fail identically on a clean `HEAD` worktree. | `r05-*.log` |
| 5b | mutation: DUR-01 against the pre-change workflows | 4 expected failures, then the files were restored | `r05-mutation-base-workflows.log` |
| 6 | actionlint, shellcheck, web guards | Pass | `r06-lint-guards.log` |

### Post-repository scorecard (before broader validation)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and AC proof | 75% | All AC have unit, component or script evidence | AC-003/004/005/006/008 are proven only against a mocked updater; AC-001/013/014 are only emulated | Real updater + IPC; builder output |
| Changed-boundary execution directness | 75% | Workflow blocks are executed for real; the script runs against a sandbox origin | electron-updater and IPC are mocked | Electron runtime harness |
| Cross-boundary integration realism | 70% | — | Mock gap at `electron-updater`/`ipcMain`/preload | Harness |
| Environment/config/fixture fidelity | 80% | Real tag-inventory fixture; real bash/git | No real feed/builder | Local builder + fixture feed |
| Failure/edge/lifecycle | 80% | Guards, refusals and corrupt files are unit-tested | Restart/upgrade and a real download are unexercised | Harness relaunch; real download |
| User-surface/browser/desktop-shell | 75% | Component specs incl. en/zh-CN | No real render | Browser + shell |
| Durable regression coverage | 90% | Tight new tests on the release logic | — | — |

- Overall post-repository confidence: 78% (simple average).
- Every critical AC directly proven: `No`.
- Categories below 90%: all except durable coverage.
- Broader validation: `Required` (executed; see the execution report for the final scorecard).

## Investigation Decision

- Proceed to API/E2E execution: `Yes` (executed)
- Durable coverage added: `Yes`:
  - DUR-01/02: `scripts/tests/test_release_channel_workflow_steps.py`
  - DUR-03: `scripts/tests/test_desktop_release_beta.py`
  - DUR-04: one test in `scripts/tests/test_public_docker_launcher_shared_workspace.py`
- Post-repository confidence: 78%
- Broader validation decision: `Required`. Executed with the Electron runtime harness, electron-builder, the browser and the CLI.
- Reroute required: `Yes`. API-F-001 goes to `/code_reviewer` for failure-origin review. The preliminary classification is `Design Impact`, recipient `/solution_designer`.

## Round 2 Update (API-REV-002, trigger CRR-004 / IR-003 / SR-005)

- **Basis change:** SR-005 replaces the status-only lock. The new rule is `isAppUpdateChannelLocked(state)`: status checking, downloading or installing, **or** a sticky per-process `updateStaged` flag. `APP_UPDATE_CHANNEL_LOCKED_STATUSES` is removed. Requirements (SR-002) are unchanged.
- **Test-validity review:**
  - All API/E2E durable tests remain `Still Valid`. None of them reference the removed constant.
  - The implementation updated `appUpdater.spec.ts`, `appUpdateStore.spec.ts` and `AboutSettingsManager.spec.ts` for the new rule (implementation-owned; source-reviewed in CRR-004). They were re-run green: 37 and 42 tests.
- **Coverage plan delta:**
  - Recheck E2E-07, E2E-07b and BR-02 first.
  - Add E2E-07c (a failed check after the download) and a BR-02 IPC-rejection step.
  - Re-run the full harness regression set and the repository suites.
  - E2E-UNK, CLI-01 and GH-01 are not affected: IR-003 changes no workflow, script, builder or docs input.
  - No new durable API/E2E coverage is needed. The failing scenario is now durably covered by the implementation-owned `it.each` regression through the real `app-update:check` IPC handler.
- **Repository results (round 2):**
  - Electron `tsc` emit: clean. `shared/appUpdateTypes.js` exports `isAppUpdateChannelLocked`.
  - Updater specs: 37/37. Store + About: 42/42.
  - `scripts/tests`: 86 run, same 3 failures as on the base.
  - actionlint, shellcheck and guards: clean.
  - Evidence: `api-e2e-evidence/round2/`.
- **Post-repository confidence (round 2):** 83%. Broader validation is `Required` and was executed.
- **Final:** Pass, 92% (see the execution report). Reroute required: `No`.
