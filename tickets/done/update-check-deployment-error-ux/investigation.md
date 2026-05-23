# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Deep investigation complete; requirements approved for simple, meaningful app-side error messages; design produced and ready for architecture review.
- Investigation Goal: Determine why desktop app update checks expose raw/long technical errors during GitHub deployment or transient connection failure, identify current owner/boundary, and define requirements for user-safe error presentation with preserved diagnostics.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The confirmed product defect spans Electron updater main-process error normalization, renderer store/toast visibility policy, update notice/settings copy, tests, and likely release documentation. A release-workflow coordination issue also creates the deployment-time error window, but it can be either mitigated in-app or addressed as a broader release orchestration follow-up.
- Scope Summary: Update-check failure UX during transient deployment/provider/network failures; raw technical updater errors must not be shown directly to normal users.
- Primary Questions Resolved:
  - Which code path triggers the screenshot modal and where is raw error text produced? **Resolved**: `autobyteus-web/electron/updater/appUpdater.ts` stores `error.message` in `AppUpdateState.error`; renderer components and toast interpolate it directly.
  - Does update checking use Electron auto-updater / electron-updater / custom GitHub fetches? **Resolved**: `electron-updater` with GitHub Releases provider via Electron main process.
  - Are transient network and deployment/provider errors classified differently from real install/download failures? **Resolved**: No. The current state model has only `status: 'error'` plus raw `error` string.
  - Where should concise user-facing copy and detailed diagnostics be owned? **Resolved for requirements**: main updater boundary should classify errors and log raw diagnostics; renderer should use only safe/category-based copy for UI/toasts.

## Request Context

User reports: “sometimes when github deployment is going on, the check for udpate shows a huge list of error. The non technical user even technical user feel scared. The current error is just connection error. There is another case, when github deployment is going on. Then i saw huge long error. Please analyse why”. Provided screenshot shows an `APP UPDATE` modal titled `Update failed`, message `Could not complete the app update flow: net::ERR_CONNECTION_CLOSED`, and `Current 1.3.27` with `Check Again` / `Later` actions.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-check-deployment-error-ux`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-check-deployment-error-ux/tickets/done/update-check-deployment-error-ux`
- Current Branch: `codex/update-check-deployment-error-ux`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-check-deployment-error-ux`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-05-23.
- Task Branch: `codex/update-check-deployment-error-ux` created from `origin/personal`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The user's shared checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` has unrelated untracked file `autobyteus-server-ts/tmp-repro-chokidar-spawn-ebadf.mjs`; authoritative task artifacts and any future changes should stay in the dedicated worktree above.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-23 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v` | Bootstrap current repo/worktree state. | Shared checkout is git repo on `personal` tracking `origin/personal`; unrelated untracked file exists. | No |
| 2026-05-23 | Command | `git fetch origin --prune` | Refresh tracked remote refs before dedicated task worktree creation. | Completed successfully. | No |
| 2026-05-23 | Command | `git worktree add -b codex/update-check-deployment-error-ux /Users/normy/autobyteus_org/autobyteus-worktrees/update-check-deployment-error-ux origin/personal` | Create dedicated task worktree/branch. | Worktree and branch created at commit `5e298019...`. | No |
| 2026-05-23 | Other | User screenshot `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_1abaf4cc/solution_designer_1db19abb95b9a05b/context_files/ctx_e7780825398d__image.png` | Observe reported UX. | Modal exposes raw `net::ERR_CONNECTION_CLOSED` in user-facing update failure. | Use as regression scenario. |
| 2026-05-23 | Command | `rg -n "APP UPDATE|Update failed|Could not complete the app update flow|Check Again|autoUpdater|electron-updater|update-available|update-downloaded|checkForUpdates|app-update|ERR_CONNECTION_CLOSED" autobyteus-web ...` | Locate updater UI and main-process path. | Relevant files are under `autobyteus-web/electron/updater`, `autobyteus-web/stores/appUpdateStore.ts`, `components/app/AppUpdateNotice.vue`, and `components/settings/AboutSettingsManager.vue`. | No |
| 2026-05-23 | Code | `autobyteus-web/electron/updater/appUpdater.ts` | Trace updater state owner and error handling. | `handleError()` sets `message` to fallback and `error` to `error.message`; raw provider/network error is broadcast to every renderer via `app-update-state`. | Design classification/sanitization at this boundary. |
| 2026-05-23 | Code | `autobyteus-web/stores/appUpdateStore.ts` | Trace renderer state and toast policy. | `applyRemoteState()` sets `visible = true` for any `status === 'error'` and sends toast `Update error: {{error}}` whenever `error` exists. | Need prevent raw/toast spam for transient/background errors. |
| 2026-05-23 | Code | `autobyteus-web/components/app/AppUpdateNotice.vue` | Trace screenshot card text. | Error message is rendered as `Could not complete the app update flow: {{error}}` when `appUpdateStore.error` exists, matching screenshot. | Replace raw interpolation with safe/category copy. |
| 2026-05-23 | Code | `autobyteus-web/components/settings/AboutSettingsManager.vue` | Trace settings update status text. | Settings panel also interpolates `appUpdateStore.error` directly into user-facing copy. | Same UX fix required. |
| 2026-05-23 | Code | `autobyteus-web/localization/messages/en/shell.ts`, `autobyteus-web/localization/messages/en/settings.ts`, `autobyteus-web/localization/messages/zh-CN/*` | Locate copy keys. | English and Chinese catalogs include raw-detail interpolation keys for update errors and update toasts. | Update keys/copy in both locales and generated catalogs if required by repo convention. |
| 2026-05-23 | Code | `.github/workflows/release-desktop.yml`, `.github/workflows/release-android.yml`, `.github/workflows/release-messaging-gateway.yml`, `.github/workflows/release-server-docker.yml` | Understand deployment-time release publication. | Desktop workflow publishes updater metadata/assets after all desktop builds complete. Android and messaging-gateway workflows independently use `softprops/action-gh-release` with `draft: false` and can create/publish the same GitHub Release earlier. | Consider app mitigation; release publication coordination may be follow-up or in-scope if approved. |
| 2026-05-23 | Command | `gh release list --repo AutoByteus/autobyteus-workspace --limit 5` and `gh release view --json tagName,isDraft,isPrerelease,publishedAt,assets,url` | Verify live release asset timing for current latest release. | `v1.3.27` was published at `2026-05-22T20:07:20Z`; desktop updater assets (`latest-mac.yml`, `latest-linux.yml`, `latest.yml`, desktop binaries) were uploaded around `20:21:28Z`-`20:21:53Z`, creating a ~14 minute window where latest release existed without desktop updater assets. | Use as concrete deployment-race evidence. |
| 2026-05-23 | Command | `gh run list --repo AutoByteus/autobyteus-workspace --limit 20 --json ...` | Compare workflow completion times for tag `v1.3.27` and previous tags. | For `v1.3.27`, Release Messaging Gateway completed `20:07:23Z`, Android `20:08:13Z`, Server Docker `20:17:03Z`, Desktop `20:21:58Z`. Similar 12-15 minute desktop asset lag exists for recent tags. | No |
| 2026-05-23 | Command | Python script over `gh release view v1.3.27..v1.3.23 --json publishedAt,assets` | Quantify repeated release-publication gap. | Gaps between public release time and first desktop updater asset: `v1.3.27` 14:08, `v1.3.26` 12:08, `v1.3.25` 15:29, `v1.3.24` 15:11, `v1.3.23` 15:06. | No |
| 2026-05-23 | Command | `gh release download v1.3.27 --pattern latest-mac.yml --pattern latest-linux.yml --pattern latest.yml` | Verify current final metadata shape. | Final `latest-mac.yml` includes both macOS arm64 and x64 zip/dmg entries; final release is complete after desktop workflow. The issue is the in-progress window, not the final `v1.3.27` asset set. | No |
| 2026-05-23 | Repo | `npm pack electron-updater@6.8.3` into `/tmp/electron-updater-6.8.3-src` | Inspect primary dependency behavior for long errors without relying on memory. | `GitHubProvider` fetches GitHub latest release then platform channel file (`latest-mac.yml`, `latest-linux.yml`, or `latest.yml`) and throws provider errors when missing. `MacUpdater` throws `ERR_UPDATER_ZIP_FILE_NOT_FOUND` with `safeStringifyJson(files)`, explaining huge raw lists when metadata resolves to incompatible/missing zip entries. | Use codes/messages in classifier requirements. |
| 2026-05-23 | Code | `autobyteus-web/electron/updater/__tests__/appUpdater.spec.ts`, `stores/__tests__/appUpdateStore.spec.ts`, `components/app/__tests__/AppUpdateNotice.spec.ts`, `components/settings/__tests__/AboutSettingsManager.spec.ts` | Identify regression test owners. | Current tests cover state transitions but not raw-error sanitization, deployment-in-progress classification, or startup/background error visibility. | Add tests in implementation. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - Packaged app startup calls `AppUpdater.startAutoCheck()` after an 8 second delay.
  - Manual checks call `useAppUpdateStore().checkForUpdates()` from `AppUpdateNotice` or `Settings > Updates`.
- Current execution flow:
  - Renderer action -> `window.electronAPI.checkForAppUpdates()` -> IPC `app-update:check` -> `AppUpdater.checkForUpdates()` -> `electron-updater.autoUpdater.checkForUpdates()` -> GitHub Releases provider -> `AppUpdater` state event -> preload listener -> Pinia store -> update notice/settings/toast.
- Ownership or boundary observations:
  - `AppUpdater` is the correct governing owner for updater lifecycle and provider-error normalization.
  - Renderer store is the correct owner for notice visibility/toast policy.
  - UI components are presentation-only and should not parse raw provider errors.
- Current behavior summary:
  - Any thrown updater error becomes `AppUpdateState.error = error.message`.
  - The renderer always shows error cards for `status === 'error'` and also shows a toast containing `error`.
  - UI text directly interpolates raw technical detail (`{{error}}`), so network codes, stack traces, provider URLs, YAML/rawData, or JSON file lists can reach normal users.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant plus Duplicated Policy Or Coordination.
- Refactor posture evidence summary: A focused refactor is likely needed inside the existing updater boundary: introduce one error-classification/sanitization owner instead of passing raw `Error.message` through the IPC state contract. Release workflow coordination is a separate broader coordination issue; app-side classification can make the in-scope UX coherent even if release-publication orchestration is deferred.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshot | Raw `net::ERR_CONNECTION_CLOSED` appears directly in modal body. | Missing invariant: user-facing updater UI must never display raw provider/network error text. | Add classified safe copy. |
| `appUpdater.ts:handleError()` | Uses `error instanceof Error ? error.message : fallbackMessage` as state `error`. | Governing updater owner currently preserves technical detail as UI state instead of diagnostics-only data. | Refactor local error mapping. |
| `appUpdateStore.ts:applyRemoteState()` | `status === 'error'` always makes notice visible; any `error` also triggers toast with raw detail. | Missing visibility policy for background vs user-initiated errors; duplicated raw display path (notice + toast). | Add source/category-aware visibility/toast behavior. |
| `AppUpdateNotice.vue`, `AboutSettingsManager.vue` | Both interpolate `{{error}}` in user-facing copy. | UI has no protection if upstream passes raw details. | Remove raw-detail interpolation from presentation path. |
| GitHub release timing | Latest releases are public 12-15 minutes before desktop updater assets are attached. | Deployment-time missing metadata is expected under current independent workflow publication model. | Classify as `release-preparing`; consider release coordination follow-up. |
| `electron-updater@6.8.3` source | GitHub provider throws missing channel file errors; Mac updater can stringify file list when zip is missing. | Explains user's “huge long error” report; raw dependency messages are not user-safe. | Preserve in logs only. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/electron/updater/appUpdater.ts` | Main-process updater lifecycle, normalized state, IPC handlers, broadcasting. | Correct owner, but `handleError()` has no classification/sanitization; `checkForUpdates(source)` source is not preserved in error state; `autoUpdater.on('error')` also maps errors generically. | Extend this owner with updater error classifier and safe state contract. |
| `autobyteus-web/stores/appUpdateStore.ts` | Renderer updater state, visibility, toasts, actions. | Displays every error and toasts every raw error. | Use classified error/source to decide visibility and toast; never toast raw diagnostics. |
| `autobyteus-web/components/app/AppUpdateNotice.vue` | Global update notice/card. | Renders raw `error` in status text. | Render localized safe category messages or safe state copy only. |
| `autobyteus-web/components/settings/AboutSettingsManager.vue` | Settings update/version panel. | Also renders raw `error` in status text. | Same safe message policy as card. |
| `autobyteus-web/localization/messages/en/shell.ts`, `zh-CN/shell.ts`, `en/settings.ts`, `zh-CN/settings.ts` | Localized copy. | Current keys encourage raw detail interpolation. | Add safe copy for network/release-preparing/metadata/download/install/unknown cases. |
| `.github/workflows/release-desktop.yml` | Builds desktop assets and publishes desktop update metadata. | Correct final asset set; completes later than lightweight release workflows. | Release readiness could be improved in a separate orchestration change. |
| `.github/workflows/release-android.yml`, `.github/workflows/release-messaging-gateway.yml` | Publish APK/gateway assets to same GitHub Release. | Both can create/update public release before desktop assets exist. | Root of deployment window where app updater sees incomplete latest release. |
| `scripts/desktop-release.sh` | Bumps version, commits, tags, pushes; tag push triggers all release workflows. | Single tag intentionally starts all release workflows concurrently. | Explains why cross-workflow race repeats each release. |
| `autobyteus-web/electron/updater/__tests__/appUpdater.spec.ts` | Main updater tests. | No assertions for network/deployment error classification or raw diagnostic suppression. | Add targeted tests. |
| `autobyteus-web/stores/__tests__/appUpdateStore.spec.ts` | Store tests. | No assertions for background error suppression or safe toast text. | Add targeted tests. |
| `autobyteus-web/components/app/__tests__/AppUpdateNotice.spec.ts`, `components/settings/__tests__/AboutSettingsManager.spec.ts` | UI tests. | No assertions that raw error codes/JSON are absent. | Add regression tests. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-23 | Trace | Static trace through `AppUpdater.handleError()` -> IPC state -> `appUpdateStore.applyRemoteState()` -> `AppUpdateNotice.statusMessage` | Screenshot text is directly explained by raw `Error.message` interpolation. | Local code change can stop scary text without needing to reproduce a live network failure. |
| 2026-05-23 | Probe | `gh release view v1.3.27 --json publishedAt,assets` | Public release existed at `20:07:20Z`; desktop update metadata appeared at `20:21:28Z`. | A user checking during that interval could hit missing channel-file/provider errors. |
| 2026-05-23 | Script | Python over last 5 releases comparing `publishedAt` and first desktop asset `updatedAt` | Repeated 12-15 minute gap before desktop updater assets. | This is systemic release workflow timing, not a one-off deployment incident. |
| 2026-05-23 | Probe | `npm pack electron-updater@6.8.3` and source inspection | Dependency throws long provider messages, including missing channel file and `ZIP file not provided: <JSON files>`. | App must not expose dependency messages verbatim. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: `electron-updater@6.8.3` npm package source, unpacked at `/tmp/electron-updater-6.8.3-src`.
- Version / tag / commit / freshness: Version from `autobyteus-web/package.json` dependency `^6.8.3`; `pnpm-lock.yaml` resolves `electron-updater@6.8.3`.
- Relevant contract, behavior, or constraint learned:
  - GitHub provider fetches the latest GitHub release and then the platform channel file (`latest-mac.yml`, `latest-linux.yml`, or `latest.yml`).
  - Missing channel files throw `ERR_UPDATER_CHANNEL_FILE_NOT_FOUND` with a URL/details message.
  - macOS download can throw `ERR_UPDATER_ZIP_FILE_NOT_FOUND` with a stringified files array when no suitable zip is available.
- Why it matters: these messages are useful diagnostics, but are inherently unsuitable for normal user-facing UI.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Full live reproduction requires packaged app and timing a check during release publication, but static code and GitHub release timing prove the failure paths.
- Required config, feature flags, env vars, or accounts: `gh` authenticated access was available for public release/workflow inspection.
- External repos, samples, or artifacts cloned/downloaded for investigation: `npm pack electron-updater@6.8.3` downloaded dependency source into `/tmp/electron-updater-6.8.3-src`; `gh release download v1.3.27` downloaded update metadata into `/tmp/ab-update-check-release-audit`.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; `git worktree add ...`; `npm pack electron-updater@6.8.3`; `gh release view/list/run list/download` commands listed above.
- Cleanup notes for temporary investigation-only setup: `/tmp/electron-updater-6.8.3-src` and `/tmp/ab-update-check-release-audit` can be removed anytime.

## Findings From Code / Docs / Data / Logs

1. **The current screenshot is expected from the current code.** `net::ERR_CONNECTION_CLOSED` is a Chromium/Electron network error. `AppUpdater.handleError()` puts it in state `error`, `AppUpdateNotice` renders `errorWithDetail`, and `appUpdateStore` also toasts the same raw detail.
2. **The “huge long error” is also expected from current code.** `electron-updater` can produce long provider messages (missing `latest-*.yml`, invalid update info, JSON file list for missing mac zip). The app has no error category or length/safety boundary before broadcasting to UI.
3. **GitHub deployment creates a real incomplete-release window.** The tag push starts multiple workflows. Messaging-gateway and Android publish/update the GitHub Release much earlier than the Desktop workflow. During the gap, GitHub `/latest` can point to a new public release that does not yet have desktop updater metadata/assets. Recent release gaps were 12-15 minutes before first desktop updater asset.
4. **The final current release is not broken.** `v1.3.27` final metadata includes Linux, Windows, and dual-arch macOS updater files. The deployment-time problem is transient because the public release becomes complete later.
5. **The root UX problem is not the existence of transient update errors.** Network closure and deployment in-progress states are normal transient conditions. The product defect is that they are labeled as alarming `Update failed` raw technical failures and are pushed into notice/toast UI without context.

## Constraints / Dependencies / Compatibility Facts

- Updater provider remains GitHub Releases via `electron-updater`; no custom update server is currently in scope.
- Renderer cannot and should not call raw updater APIs; IPC/preload boundary must remain authoritative.
- Detailed diagnostics must remain in logs (`autobyteus-web/electron/logger`) for developers.
- User-facing copy must be maintained in English and Chinese catalogs.
- Existing `AppUpdateState` is an internal Electron IPC contract, but it is duplicated in main, Electron types, web types, and store payload types; any shape change must update all copies and tests.
- Startup/background update checks are non-user-initiated and should be quieter than manual/download/install failures.

## Open Unknowns / Risks

- Whether the user wants to fix only UI/error wording, or also coordinate release publication so GitHub latest releases are not public until desktop assets are ready.
- Whether `electron-updater` emits both an `error` event and a rejected promise for some provider failures, which could duplicate state updates/toasts; tests should cover deduplication if observed during implementation.
- If release orchestration is brought in scope, cross-workflow coordination must be designed carefully to avoid breaking Android/gateway asset publication.

## Notes For Architect Reviewer

Requirements approved on 2026-05-23 for simple, meaningful app-side error messages. The target design should keep `AppUpdater` as the governing lifecycle owner and add a focused error classifier/sanitizer there, with renderer store owning visibility/toast behavior by `errorKind` and source. Release workflow coordination remains out of scope/follow-up unless separately requested.
