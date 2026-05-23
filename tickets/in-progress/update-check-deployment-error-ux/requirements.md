# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

When the desktop app checks for updates during or near GitHub deployment activity, transient network or release-feed failures can surface as alarming raw technical error text. The user-provided screenshot shows an app update failure modal with `net::ERR_CONNECTION_CLOSED`; the user also reports seeing a very long error list during GitHub deployment. The product must stop exposing raw updater/provider diagnostics in normal UI, explain transient update-check failures in calm user language, preserve detailed diagnostics in logs, and make retry behavior clear.

## Investigation Findings

- The screenshot is directly explained by current code: `autobyteus-web/electron/updater/appUpdater.ts` stores `Error.message` in `AppUpdateState.error`, and `AppUpdateNotice.vue`, `AboutSettingsManager.vue`, and `appUpdateStore.ts` interpolate/toast that raw value.
- The app uses `electron-updater` with GitHub Releases. The provider fetches the latest GitHub release and platform metadata (`latest-mac.yml`, `latest-linux.yml`, `latest.yml`). Missing or incomplete metadata can produce long technical messages.
- The current release process creates a repeatable deployment-time gap: the tag push starts multiple workflows; messaging-gateway/Android can publish the GitHub Release before Desktop Release uploads update metadata/assets. For recent releases, the public release existed roughly 12-15 minutes before desktop updater assets were attached.
- The latest inspected release `v1.3.27` is complete after deployment; the problematic window is while deployment is still running.
- `net::ERR_CONNECTION_CLOSED` is a transient network/request error; it should not be framed as a scary update failure or shown as a raw code to normal users.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant plus Duplicated Policy Or Coordination
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis:
  - `AppUpdater.handleError()` broadcasts raw `error.message`.
  - Renderer store and UI have multiple raw-error display paths.
  - GitHub release workflows independently publish the same release, creating a known incomplete-desktop-assets window.
  - `electron-updater` can produce long provider messages that include URLs, raw YAML, stacks, or JSON file lists.
- Requirement or scope impact:
  - The in-scope fix needs one authoritative updater-error classification/sanitization policy.
  - UI and toast policy must consume safe categories/copy, not raw provider messages.
  - Release-publication coordination should be explicitly decided: either included as a broader release readiness fix or recorded as a follow-up. This requirements set keeps workflow coordination out of the first implementation unless the user asks to include it.

## Recommendations

- Fix the app-side updater error boundary now:
  - classify network/deployment-metadata/download/install/unknown updater errors;
  - log raw diagnostics only in main-process logs;
  - expose only safe, short, localized user copy to renderer UI and toasts;
  - suppress noisy startup/background transient errors unless the user explicitly initiated the check or an update operation was already underway.
- Treat the GitHub deployment gap as a separately nameable release-process issue:
  - current workflows can publish a release before desktop assets are ready;
  - app-side classification should show this as “The update is still being prepared. Try again in a few minutes.”;
  - if desired, a follow-up release-orchestration ticket should make GitHub Releases non-public/non-latest until desktop updater assets are present.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- `UC-001` Manual app update check encounters a transient network/provider connection error such as `net::ERR_CONNECTION_CLOSED`.
- `UC-002` Startup/background update check encounters a transient network/provider connection error.
- `UC-003` Manual update check happens while GitHub release deployment is in progress and desktop updater metadata/assets are not yet available.
- `UC-004` Update check/download/install encounters a long technical `electron-updater` error message.
- `UC-005` A developer needs detailed diagnostics after a user reports an updater failure.
- `UC-006` Settings > Updates shows update status after a failure without raw technical noise.

## Out of Scope

- Replacing GitHub Releases or `electron-updater` with a custom update server.
- Changing release signing, notarization, packaging, or asset naming beyond what is needed for error classification/UX.
- Fully coordinating all release workflows so a GitHub Release becomes public only after desktop assets are ready. This is recommended as follow-up unless explicitly approved for this ticket.
- Hiding genuine install/download failures entirely; user-initiated failures still need concise recovery feedback.

## Functional Requirements

- `R-001` (Updater Error Classification)
  - Expected outcome: The Electron main updater boundary classifies updater errors into stable categories such as transient network failure, release still preparing/missing channel metadata, package metadata incompatibility, download failure, install/restart failure, dev/unavailable, and unknown.

- `R-002` (No Raw Diagnostics In User UI)
  - Expected outcome: Normal user-facing UI, settings messages, and toasts never display raw `Error.message`, stack traces, provider URLs, YAML/rawData, JSON file lists, or dependency error codes such as `ERR_UPDATER_*` / `net::ERR_*` directly; instead they display simple but meaningful messages that name the user-relevant situation and next action.

- `R-003` (Diagnostics Preserved In Logs)
  - Expected outcome: The raw error message/stack and classified category/code are logged by the Electron main process so technical users can still troubleshoot from logs.

- `R-004` (Transient Network Copy)
  - Expected outcome: A transient network failure during update check is described calmly, e.g. “Could not reach the update server. Your app is still usable; try again later,” with retry available when user-initiated.

- `R-005` (Deployment-In-Progress Copy)
  - Expected outcome: Missing latest platform metadata or release assets during a GitHub deployment is described as a temporary release-preparation state, e.g. “The latest update is still being prepared on GitHub. Try again in a few minutes.”

- `R-006` (Startup/Background Noise Suppression)
  - Expected outcome: Startup/background transient update-check failures do not force a scary visible update card or error toast; they are logged and can be reflected quietly in Settings if needed.

- `R-007` (User-Initiated Recovery UX)
  - Expected outcome: Manual check/download/install failures still produce visible, concise feedback with an appropriate retry action (`Check Again` or equivalent) and `Later`/dismiss where safe.

- `R-008` (Renderer Contract Safety)
  - Expected outcome: The renderer update state contract carries safe category/status information rather than relying on raw diagnostic strings for display decisions.

- `R-009` (Localization Coverage)
  - Expected outcome: English and Chinese localization catalogs include safe updater failure copy for all in-scope categories used by UI/toasts/settings.

- `R-010` (Regression Coverage)
  - Expected outcome: Targeted tests prove raw network codes and long provider messages are not rendered/toasted, while logs still receive raw diagnostics.

- `R-011` (Release Gap Documentation)
  - Expected outcome: Project/ticket documentation records the observed GitHub release-publication gap and the rationale for app-side deployment-in-progress classification, plus the optional follow-up to coordinate release publication.

## Acceptance Criteria

- `AC-001` Network raw-code suppression:
  - Given an updater check error whose raw message is `net::ERR_CONNECTION_CLOSED`, the update notice/settings/toast must not contain `net::ERR_CONNECTION_CLOSED` and must show concise network retry copy instead.

- `AC-002` Long provider message suppression:
  - Given a raw updater error containing a long JSON/YAML/provider file list or `ERR_UPDATER_*` code, user-facing UI/toasts must not render the raw list/code.

- `AC-003` Deployment-preparing classification:
  - Given an updater error indicating missing `latest-mac.yml`, `latest-linux.yml`, `latest.yml`, missing channel file, or release asset not found for the latest GitHub release, UI must classify it as a temporary release-preparation/update-metadata state with a “try again in a few minutes” message.

- `AC-004` Startup transient quiet behavior:
  - Given a startup/background update check hits a transient network or deployment-preparing error, no visible update notice and no error toast are forced solely because of that background check.

- `AC-005` Manual transient visible behavior:
  - Given a manual update check hits a transient network or deployment-preparing error, the user sees a short, non-alarming failure message with `Check Again` and `Later`/dismiss behavior.

- `AC-006` Download/install failure recovery:
  - Given a user-initiated download or install/restart failure, the UI shows concise recovery-oriented copy and keeps the appropriate retry/recovery action available without exposing raw diagnostics.

- `AC-007` Logging diagnostics:
  - Given any classified updater failure, the Electron log includes the raw diagnostic message/stack plus category/code and phase/source context.

- `AC-008` Settings parity:
  - Settings > Updates uses the same safe category/copy policy as the global update notice and does not reintroduce raw details.

- `AC-009` Localization parity:
  - English and Chinese runtime catalogs contain safe messages for network, release-preparing, metadata/package, download, install, dev/unavailable, and unknown updater failures.

- `AC-010` Test execution:
  - Targeted Electron updater, renderer store, update notice, and settings component tests pass for the new safe-error scenarios.

## Constraints / Dependencies

- Must preserve `electron-updater` and GitHub Releases as the update provider.
- Must preserve sandboxed renderer pattern (`contextBridge` + IPC); renderer cannot access raw updater APIs.
- Must preserve developer diagnostics through existing Electron logging.
- Must avoid showing raw technical details even to “technical users” by default; technical details belong in logs or an explicit diagnostic path, not the normal update card.
- Must update duplicated `AppUpdateState` typings consistently if the state shape changes.
- Must avoid backward-compatible dual display paths that keep raw-detail interpolation alive for in-scope update errors.

## Assumptions

- The screenshot comes from the packaged desktop app update-check flow.
- The current `v1.3.27` final release is complete; the screenshot’s `net::ERR_CONNECTION_CLOSED` was a transient network/request failure while already on latest version.
- The user's “huge long error” during deployment is caused by one of the confirmed provider/deployment paths: incomplete latest release metadata/assets during the release gap, or dependency messages such as missing zip/channel metadata.
- App-side safe classification is the approved user-impacting fix; release workflow coordination can be scheduled separately unless the user expands scope.

## Risks / Open Questions

- `OQ-001`: Should this ticket include release workflow coordination to prevent public latest releases before desktop assets are ready, or should that be a follow-up after the UI safety fix?
- `OQ-002`: Should advanced users have a “View logs” action from the update failure UI, or is existing log access sufficient?
- `OQ-003`: Some updater errors may be emitted twice (promise rejection plus `autoUpdater` error event); implementation should avoid duplicate toasts/state churn if observed.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| `R-001` | `UC-001`, `UC-002`, `UC-003`, `UC-004` |
| `R-002` | `UC-001`, `UC-003`, `UC-004`, `UC-006` |
| `R-003` | `UC-005` |
| `R-004` | `UC-001`, `UC-002` |
| `R-005` | `UC-003` |
| `R-006` | `UC-002` |
| `R-007` | `UC-001`, `UC-003`, `UC-004` |
| `R-008` | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-006` |
| `R-009` | `UC-001`, `UC-003`, `UC-004`, `UC-006` |
| `R-010` | `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-006` |
| `R-011` | `UC-003`, `UC-005` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| `AC-001` | Screenshot regression: raw `net::ERR_CONNECTION_CLOSED` is not shown. |
| `AC-002` | Huge provider-list regression: long dependency diagnostics are not shown. |
| `AC-003` | Deployment race regression: incomplete GitHub release state gets calm temporary copy. |
| `AC-004` | Background check should not scare users. |
| `AC-005` | Manual check should still inform and allow retry. |
| `AC-006` | User-initiated update operations remain recoverable. |
| `AC-007` | Technical diagnostics remain available in logs. |
| `AC-008` | Settings does not diverge from update card safety policy. |
| `AC-009` | Localization coverage prevents fallback to raw or missing messages. |
| `AC-010` | Automated regression evidence covers main/store/UI paths. |

## Approval Status

Approved on 2026-05-23 for the app-side safe-error UX fix: messages must be simple, meaningful, calm, and action-oriented. Release workflow coordination remains a documented follow-up unless separately requested.
