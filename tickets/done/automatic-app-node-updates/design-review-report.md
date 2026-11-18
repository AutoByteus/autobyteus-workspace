# Design Review Report — automatic-app-node-updates (autobyteus-356)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/requirements-doc.md` (Approved, SR-002; DEC-001 = A by the user)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/investigation-notes.md` (F-01–F-12)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/design-spec.md` (SR-006, Ready; user approval of the design: `Not required`, with a reason)
- Supplemental Task Artifacts Reviewed: `code-review-report.md` round 4 (CRR-004: F-API-003, CR-C12, CR-C13); the API/E2E evidence named below; `follow-ups.md` (FU-001–FU-005); `handoff.md`.
- Relevant Solution Revision IDs: SR-002 (approval), SR-003 (design revision), SR-004 (design revision; REQ-002, REQ-004, AC-002, AC-005 sharpened within the direction), SR-005 and SR-006 (design revisions)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-005`
- Current Review Round: 5
- Trigger: SR-006, the design revision for ARCH-REV-004 (AR-007), from `/software_engineering_team/solution_designer`, 2026-11-02.
- Prior Review Round Reviewed: ARCH-REV-004 (SR-005, Fail)
- Latest Authoritative Round: 5
- Current-State Evidence Basis (round 5): worktree @ `75793e0a8b`. SR-006 is docs only. Also opened in round 5: `AppUpdater.js:400-424, 591-608` (nothing that can fail follows `update-available`; a file copy follows the served zip); `MacUpdater.js:104-121`; `appUpdater.ts:188, 220-252, 281-286, 309-322, 399-481` (every status writer); `appUpdateIpc.ts:40-42`; `shared/appUpdateTypes.ts:140`; `AboutSettingsManager.vue:125-165`; `stores/updateNotificationsStore.ts:286-291, 313`.
- Round-4 basis: worktree @ `6f3ccdf2f6`. SR-005 is docs only. Also opened in round 4: `AppUpdater.js:253-275` (a failed check emits `error`, then throws); `AboutSettingsManager.vue:285-286` (the check button is disabled only while `checking`, `downloading` or `installing`); `utils/appUpdateErrorDisplay.ts:5, 15` (two `Record<AppUpdateErrorKind, string>` maps).
- Round-3 basis: worktree @ `fb9571d829`. The implementation (IR-001, IR-002) and API/E2E rounds 1 and 2 are on the branch; SR-004's own commit is docs. Opened in round 3:
  - electron-updater 6.8.9 (now installed in the worktree), `out/MacUpdater.js`:
    - `:18-25`: the constructor forwards a native `error` as `error`, and native `update-downloaded` sets the private flag.
    - `:184-189`: **when the zip has been served to Squirrel (`response` `finish`), the `error` reject listener is removed and the download promise resolves.**
    - `:219-224`: dispatches `update-downloaded`, then `nativeUpdater.once("error", reject)` and the native `checkForUpdates()`.
    - `:240-256`: `quitAndInstall`.
  - `out/AppUpdater.js`:
    - `:442-445`: a pending `downloadPromise` is returned as it is.
    - `:449-473`: a rejection runs `dispatchError`, so `error` is emitted **again**, and `downloadPromise` is cleared in `finally`.
    - `:604-607`: a cached file goes straight to `done`.
  - `autobyteus-web/electron/updater/`: `appUpdater.ts:162-164` (`isBusy`, including `updateStaged`), `:266-276` (the F-API-002 guard uses `installRequestedFor`), `:458-481` (listeners); `appUpdateAutomaticRun.ts` (`installFailed` needs `installRequestedVersion`; `downloadDone` clears the download version); `appUpdateCheckSchedule.ts:112` (a busy updater skips the automatic check); `appUpdateErrorClassifier.ts:21`; `stores/updateNotificationsStore.ts:155-170, 286-291`; `components/settings/AboutSettingsManager.vue:262-263`.
  - Evidence: `API-05-r2-s1-instance.log:266-275` and `API-05-instance-1.log:266-277` (a read-only refusal: `error` twice, about 2 ms apart); `API-05C-instance.log:264-273` (a signature refusal, zip requested at 05:33:57, one `error` 38 s later); `API-02B-v1-instance.log:262-271`.
- Round-2 basis: worktree @ `51d79f2db1`. SR-003 is docs only (`git diff --stat 099ae1031f HEAD`: ticket files). Also read in round 2: `appUpdater.ts` `activeOperation` (`:53, 173, 192-193, 234, 251-252, 264, 402`). The install sets `'install'` and nothing resets it; a check sets and clears `'check'`; a download sets and clears `'download'`. Round-1 basis (`099ae1031f`, docs only on `origin/personal` @ `3b9dc912a1`), code opened at the cited lines:
  - `autobyteus-web/electron/updater/appUpdater.ts`:
    - `:96-97`: `autoDownload = false`, `autoInstallOnAppQuit = true`.
    - `:258-282`: `installUpdateAndRestart`. It refuses unless the status is `downloaded`, then returns `{ accepted: true }` at once. A `setTimeout` callback awaits `prepareForInstall`, which stops the server (339), and then calls `autoUpdater.quitAndInstall(false, true)`, which returns void. The `catch` sees only those two calls.
    - `:320-327`: `applyChannelPolicy` sets `allowDowngrade = false` before every check, and never sets `autoUpdater.channel`, whose setter would force a downgrade.
    - `:338-398`: `update-available`, `update-not-available`, `download-progress`, `update-downloaded` (`updateStaged` is sticky while the status may move on).
    - `:401-403`: the updater's `error` event goes to `handleError` with `activeOperation`.
  - `electron/updater/appUpdateNotificationRecord.ts:53-106`: `recordFound`; `reconcileWithRunningVersion` (a waiting record whose `fromVersion` differs from the running version becomes handled).
  - `stores/nodeServerUpdateStore.ts:92, 151-153`: C1 `fetch` with no credentials.
  - `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts:84-86, 166-170`: `/rest/node-update` is `TRUSTED_NETWORK_OWNER`, allowed from the trusted network without a credential; mobile credentials are refused. A main-process client therefore behaves exactly like the renderer's.

## Routing Classification Review

- Task size: `Medium`. Architectural risk: `High`.
- Classification rationale reviewed. Agreed:
  - Medium: one package (`autobyteus-web`) and existing owners, plus one new main-process owner.
  - High: an unattended app restart; unattended updates of remote machines; loop and downgrade risk; persisted desktop records.
- Independent Architecture Review required: `Yes`.
- User approval of the design: `Not required`. The only decision needing the user, DEC-001, was taken. Not `Pending`.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`.
  - The approved intent is clear, and direction A is the right cause fix: the automatic path now stops nothing until Squirrel's native `update-downloaded`.
  - The sharpening of REQ-002, REQ-004, AC-002 and AC-005 is within the direction. "Done" on macOS includes a step the platform requires, not a chosen wait, so DEC-001 stands.
  - SR-005 corrected the premise and the refusal's end state. SR-006 removes the failed-check case (AR-007).
- Approved intent:
  - REQ-001: the app switch is off by default.
  - REQ-002: download, then install at once (DEC-001 = A), and continue a found or downloaded update when the switch turns on.
  - REQ-003: the node switch; the node follows the desktop's version only when it is older.
  - REQ-004: a failure leaves the old version running and is shown. A download is retried; an install or trial failure for a version is not retried automatically.
  - REQ-005: outcomes are shown.
  - REQ-006: the switches are desktop-only.
- Scope guardrail: confirmed.
  - Out of scope: nodes without a desktop; a timing window; cancelling a download; node rows in the Notification Center; cross-version compatibility.
  - Preserved: the manual flow, the channel and its lock, the schedule, C1, the node's verify, trial and rollback, and the existing switches.
- Every prospective blocking `Design Impact` finding is traceable to an approved ID: `Yes`. None remain open.
- Statements about existing code the design relies on: all opened and correct. The three read most closely:
  - `allowDowngrade = false` per check;
  - `relation` from the starter;
  - the record's reconcile.
  - Round 3, F-13's ordering (`:219-223`) is correct.
  - Round 3's false premise about the download promise is corrected in SR-005 (F-13, DS-002), and I checked the correction against `MacUpdater.js:184-189`.
  - Round 4's unsupported rule (every updater `error` during a wait is Squirrel's refusal) is made true by SR-006, which runs no check during the wait, with one rare exception (N-18).

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass (F-02, F-08, F-13, F-14) | Pass: found → download → ready → install, including a busy machine; a native refusal's end state; a click during the wait; no check during the wait | Confirmed | — |
| BEH-002 | User | Pass | Pass (F-03, F-11; the route policy) | Pass (DS-003) | Confirmed | — |
| BEH-003 | System | Pass | Pass (F-07, F-09) | Pass: `install-preparation` state with its own About text; plain record reason | Confirmed | — |
| REQ-006 contract | Contract | Pass | Pass (F-12) | Pass (desktop files and desktop IPC only) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None. `follow-ups.md` (FU-001 node rows in the Notification Center, FU-002 a node without a desktop, FU-003 busy runs not resumed after a recovery relaunch) is consistent.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | `Feature`; triggers considered | — |
| Root-cause classification is explicit and evidence-backed | Pass | `No Design Issue Found`: the policy sits in front of the existing actions | — |
| Refactor decision is explicit | Pass | `No` | — |
| Supported by concrete sections | Pass | — | — |

## Spine Inventory Verdict

| Spine | Readable | Narrative | Facade vs Owner | Naming | One Owner Per Node, In Order | Off-Spine Kept Off | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 app download | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 app install and the outcome after restart | Pass | Pass | Pass | Pass | Pass: `AppUpdater` drives the wait; no check interleaves, so the `error` rules and the native end's two branches are complete | Pass | Pass |
| DS-003 node update | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

Round-1 analysis, kept for the record. It is resolved by SR-003 (the in-process gate, signals (a) to (c), recovery). DS-002 as SR-002 would have run with its hooks:

1. `update-downloaded(V)` → `installAutomatically(V)`.
2. `recordAutomaticInstall(V)` writes `automatic = { V }`.
3. `installUpdateAndRestart()` returns `{ accepted: true }`.
4. After 100 ms: `prepareForInstall` stops the embedded server, and `ApplicationShutdown` is now `prepared`. Then `quitAndInstall(false, true)` returns void.
5. **If the native updater cannot install** (for example Squirrel.Mac refusing an app that runs from a read-only or translocated location, or a code-signature check failing), the failure arrives later as `autoUpdater` `error` (`:401-403`). The app does not quit.
6. The design records nothing for this case:
   - it is not the install catch;
   - if `automaticVersion` is still V, the DS-001 hook would record it as a *download* failure, which does not block.
7. The app keeps running **without its server**.
8. At the next scheduled check, `update-available(V)` → `blocksAutomatic(V)` is false → download (cached) → `update-downloaded` → a second automatic install. This repeats every check interval, unattended.

## Boundary Encapsulation Verdict

| Boundary / Owner | Public Entry Clear | Internals Stay Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AppUpdater` (the app policy; the automatic path calls its own `downloadUpdate` and `installUpdateAndRestart`) | Pass | Pass | Pass | Pass | It detects an in-process install failure; recovery is the injected hook |
| `NodeAutoUpdater` (main process; the pure `decideNodeAutoUpdate`; `nodeUpdateClient`) | Pass | Pass | Pass | Pass | The renderer never decides |
| Desktop IPC for the switches (`app-update:set-automatic`, `set-auto-update`) | Pass | Pass | Pass | Pass | REQ-006 |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Direction Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AppUpdater` → automatic store, notification record | Pass | Pass | Pass | Pass | If AR-001's fix restores a working app, the relaunch or restart is driven by `ElectronApplication`, which owns the process and the server, through an injected hook. Not by `AppUpdater` calling `app.exit` |
| `NodeAutoUpdater` → registry snapshot, `appVersion`, its record, its injected `fetch`/clock/timers | Pass | Pass (no renderer imports) | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `AppUpdateState.automaticUpdate`, `setAutomaticUpdate` → `AppUpdateAutomaticChangeResult` | Pass | Pass | Pass | Low | Pass |
| `AppUpdateNotification.outcome`/`outcomeReason` | Pass | Pass | Pass | Low | Pass |
| Record: `recordAutomaticInstall`, `recordAutomaticFailure`, `blocksAutomatic` (with `installRequestedVersion`) | Pass | Pass | Pass | Low | Pass |
| `NodeEntry.autoUpdate?: true`; `SetAutoUpdateNodeRegistryChange` (refused for the embedded entry) | Pass | Pass | Pass | Low | Pass |
| `decideNodeAutoUpdate(status, V, entry)` | Pass | Pass | Pass | Low | Pass |
| Node outcome IPC (`get-state`, `changed`, `mark-read`) | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| App download and install | Pass | Pass (the same two methods) | N/A | Pass | — |
| Node update | Pass | Pass (C1, unchanged; its own small client in main) | Pass (main runs without a window) | Pass | The renderer's store is not reused, correctly |
| Settings files | Pass | Pass (the one-store-per-setting style) | Pass | Pass | — |
| Busy-run resume | Pass | Pass (285 through the 339 install path) | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear | Decision Sound | Supports Spine Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `electron/updater/` | Pass | Pass | Pass | Pass | — |
| `electron/nodeAutoUpdate/` (new) | Pass | Pass | Pass | Pass | — |
| Renderer stores and components | Pass | Pass (display and switch only) | Pass | Pass | — |

## Reusable Owned Structures Verdict

N/A: no repeated structure. The one decision function serves every node.

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning Per Field | Redundant Removed | Overlap Controlled | Core vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `app-update-notification.json` + `automatic`, `automaticFailure` | Pass | Pass | Pass | N/A | Pass | Written only on `accepted: true`. A failure clears `automatic`. The reconcile turns a failure into `AUTO_UPDATED` when the late install-on-quit succeeded |
| `node-auto-updates.json` entries | Pass | Pass | Pass | N/A | Pass | `PENDING`, `AUTO_UPDATED` and `AUTO_FAILED` each have a single meaning. The 30-minute rule comes after the `version === V` check |
| `NodeEntry.autoUpdate?: true` | Pass | Pass | Pass | N/A | Pass | Remote-only, enforced at the single change point and on load |

- Derived consumers of a changed structure (Principle 11): `Pass`. The app row, `NotificationRow`, `appUpdateStore`, `normalizeLoadedNode`, `applyNodeRegistryChange` and the Nodes row are each listed with a decision.
- Each domain word keeps one meaning (Principle 15): `Pass`. "Automatic run" (app) and "attempt" (node, accepted 202) are defined.

## File Responsibility Mapping Verdict

Pass for all mapped files, including SR-003's additions to `appUpdater.ts` (the gate, the quit-bound timer, the `recoverAfterFailedInstall` option) and `electronApplication.ts` (the recovery).

## Subsystem / Folder / File Placement Verdict

Pass.

## Removal / Decommission Completeness Verdict

Pass. Nothing is obsolete. The "never the app" docs line is rewritten.

## Legacy / Backward-Compatibility Verdict

| Area | Wrapper / Dual Path | Clean Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Settings and records | No | Pass | Pass | Optional fields that default to today's behavior |

## Persisted-Data Transition Verdict (When Applicable)

| Area | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Two new desktop files; two extended desktop records | `Directly Usable — No Migration` | Pass: tolerant readers keep only known shapes (`toStoredRecord`, `normalizeLoadedNode`); a missing field means today's behavior; atomic writes | Pass | N/A | Pass | An older app rewriting the files drops the new fields, so the switches read off. That is safe. No user data is changed |

## Change / Refactor Safety Verdict

| Area | Realistic | Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–5 | Pass | Pass | Pass | Pass |
| Validation (packaged test feed, the AR-001/AR-002 unit cases, a refused native install where feasible, a real test Docker node, a clean clone) | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present | Avoided Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Gates | Yes | Pass (in DS text) | Pass | Pass | A small table of "event → gate → action" would help the implementer. Optional |

## Material Premise Validation (Only When Needed)

### `P-001`: the native install fails after `quitAndInstall` was called, and the app does not quit (AR-001)

- Related requirement: REQ-004 ("leaves the old version running … not installed automatically again"); AC-005.
- Behavior IDs: BEH-001, BEH-003.
- Initiating basis kind: `System`, with a supported user setup. The desktop app runs on macOS from a location Squirrel.Mac cannot replace, for example started from the DMG or from a translocated Downloads copy, or the downloaded update fails the native signature check. The app reports that as an updater error. The design's own escalation trigger names "macOS Squirrel refuses an install".
- Forward path:
  1. `installAutomatically(V)` → `installUpdateAndRestart` (`:258-282`) → `prepareForInstall` resolves, and the server is stopped (339).
  2. `quitAndInstall` returns void; the native failure arrives later as `error` (`:401-403`); the app stays open.
  3. In the design: no install failure is recorded; `automatic` stays set; `blocksAutomatic(V)` is false.
  4. Each later check repeats steps 1–2, with the app and the server down.
- Lifecycle precondition: the switch is on and nobody is present, which is the feature's purpose.
- Consequence: a broken, serverless app overnight, and an hourly repeat. Both are against REQ-004.
- Reachability: `Reachable`. The `error` channel exists in code for exactly such failures. The exact macOS trigger is to be shown in validation. Resolved in SR-003 (signals (a) to (c), the in-process gate, recovery).

### `P-002`: the switch turns on while an update is staged but the status has moved on (AR-002)

- Related requirement: REQ-002 ("turning the switch on while an update is found or downloaded continues that update"); REQ-004.
- Initiating basis kind: `User`. The user downloads V without installing; a later scheduled check moves `status` to `available` (`update-available` sets `status: 'available'`, while `updateStaged` stays true, `:338-398`); then the user turns the switch on.
- Forward path:
  1. The design: "status `downloaded` or `updateStaged` → `installAutomatically(V)`".
  2. `recordAutomaticInstall(V)` is written first.
  3. `installUpdateAndRestart()` returns `{ accepted: false }`, because the status is not `downloaded`.
  4. `automatic` stays set with no install under way. At the next start, `running === fromVersion` → "The update did not install" → V is blocked although nothing was attempted. If the staged update installed on quit, the outcome would wrongly say "automatically".
- Reachability: `Reachable`. The consequence is low to medium: a wrong failure row, and a version blocked from automatic install. Resolved in SR-003 (accepted-only record; `startAutomatic` with a re-emit test).

### `P-004`: an update is refused by the native updater, and the desktop keeps running (AR-003)

- Related requirement: REQ-004, AC-005.
- Initiating basis kind: `System`, with a supported setup. A desktop on macOS gets a signature refusal (API-05C) or a read-only refusal (API-05-r2, 9 of 9 samples), with the switch on. It keeps running, which SR-004 now makes the normal outcome.
- Forward path: the wait's native-error end → `automaticFailure(V, 'install')` → `updateStaged` stays true → `isBusy()` → every scheduled check is skipped until someone restarts the app → release W is never found, though REQ-004 says it can still install.
- Reachability: `Reachable`. Measured for the refusal; read for the check skip. Resolved in SR-005 (`updateStaged: false`).
- Consequence: an unattended desktop stays on the old version until a manual restart, with the failure row showing V.

### `P-005`: a manual check fails while the wait is pending (AR-007)

- Related requirement: REQ-002, AC-002 (a good update installs by itself), REQ-004 (a version is blocked only when its install failed).
- Initiating basis kind: `User`.
  - Surface: About → "Check for updates". It stays enabled at status `downloaded` (`AboutSettingsManager.vue:285-286`). F-16 and the spec already name a manual check during the wait as supported.
  - Action: the user clicks it during the wait (about 36 s when idle, longer when busy), and the check fails: a network drop, a GitHub error, or a release still being prepared. The app already has error kinds for each.
- Forward path:
  1. `AppUpdater.checkForUpdates('manual')` → electron-updater's `checkForUpdates()` rejects → `AppUpdater.js:269-272` emits `error`.
  2. The app's `error` handler, rule 1: "a wait is pending → end it as a failure", without consulting `activeOperation`.
  3. `preparationFailed(V, …)` records `install`, which blocks V. `updateStaged: false`. About says "could not prepare this update".
  4. Squirrel, unaware, finishes. The native `update-downloaded` arrives with no wait, so nothing installs.
- Consequence: a good version is permanently blocked from automatic install by an unrelated network error, with an untrue message. This is the same class of false failure as F-API-003.
- Reachability: `Reachable` under SR-005. Removed by SR-006: the check no longer runs during the wait.
- Related: even if the check's error is told apart, today's handling sets status `error`, and a check in flight sets `checking`. The native end's branches cover only `downloaded` and `available`, so V would then neither install nor be recorded, and `updateStaged` keeps checks off.

## Unresolved Approved-Behavior Or Current-State Gaps

None in the requirements basis.

## Round 5 Delta: SR-006 (ARCH-REV-004)

The designer took a different route from AR-007's stated one: no check runs during the wait. Judged on its merits, it is **stronger**. It removes the interleaving, so nothing has to classify a check's error, and the native end needs no status branches. Its cost is stated, small, and only with the switch on. It adds no new product behavior beyond a button that is briefly disabled with a reason, so it is not a Requirement Gap.

| Designer's claim | Verdict | Evidence |
| --- | --- | --- |
| 1. Status stays `downloaded` for the whole wait, until an Install click or the wait's end | **Holds in the product**, with N-17 | Every status writer read. `checking-for-update`, `update-available`, `update-not-available`: only a check, and the only `autoUpdater.checkForUpdates()` is `appUpdater.ts:208`, behind the guard. `download-progress`: only a download. `setUpdateChannel`: locked while staged (`appUpdateTypes.ts:140`). The schedule: skipped (`appUpdateCheckSchedule.ts:112`). `downloadUpdate()` at status `downloaded` would set `error` (`:244-251`), but neither surface offers it then (`AboutSettingsManager.vue`, `NotificationRow.vue`) |
| 2. No check can be in flight when a wait begins, or one that emitted `update-available` has nothing left that can fail | **Holds** | A running check holds status `checking` (`:196`). `downloadUpdate` needs `available` and `checkForUpdates` refuses at `downloading` (`:188`), so `update-downloaded` cannot arrive during a check. After `onUpdateAvailable` only the return remains (`AppUpdater.js:414-423`; `autoDownload` is false). A switch-on needs status `downloaded`, which excludes `checking` |
| 3. Every updater `error` during a wait is the native refusal or the zip serve failure | **Holds, with one rare exception** (N-18) | `AppUpdater.js:597-600`: an optional `copyFile` runs after the served zip resolves `MacUpdater`'s promise; if it fails, the rejection dispatches `error` during the wait |

Also checked:

- `automaticInstallPreparing` is consumed by the one check button in the product (`AboutSettingsManager.vue:139`), and `appUpdateStore.checkForUpdates` applies the returned state unchanged, so a stale click is harmless.
- N-13's readiness-with-version restores correctly: `quitAndInstall` then has the private flag set.
- The `downloadInFlight` marker makes the settling flag independent of `activeOperation`.

## Review Decision

`Pass`. The behavior basis is confirmed, AR-001 to AR-007 are resolved in the canonical design spec (SR-006), and no in-scope machinery depends on an unsupported premise.

## Findings

None open. Details are in `architecture-review-revision-record.md`, ARCH-REV-005.

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary). Informational notification to `/software_engineering_team/solution_designer`.

## Residual Risks

- **N-1 to N-8, N-15:** carried; stated in the spec. N-9, N-13 and N-16 are adopted. N-10 and N-14 can no longer occur. N-12 is in FU-004.
- **N-17 (implementation, cheap):** a stale renderer calling the download IPC during a wait would set status `error`, and the native end's `installAutomatically` would then be refused, stranding V until quit. No current surface offers it. Add the same wait guard to `downloadUpdate()`, and have it return the current state. One line and one test.
- **N-18:** the exception to claim 3. A failed `copyFile` of `current.blockmap` after the zip is served (`AppUpdater.js:597-600`, for example a full disk) reads as a refusal: V is blocked, with a clean failure and nothing stopped, and the update still installs on quit. Too rare and too harmless to design for. The spec's "every" should say so in a word.
- **N-19:** a manual download with the switch off, then a manual check, with the switch turned on while that check runs. The switch-on path does nothing at `checking`, so the check's `update-available` runs `startAutomatic(V)` with no wait pending. If Squirrel is still working, that is a second native fetch on top of it; if Squirrel is done, it is the F-15 path N-13 otherwise avoids. Applying N-13's rule in the `update-available` hook too would close it. The result is at worst a clean false failure, so this is not required. API/E2E's second-fetch run covers the outcome.
- **F-15's native half:** still unknown; API/E2E runs it on real Squirrel, with the escalation trigger.
- **CR-C13:** held for evidence.
- **Earlier focus answers, still valid:** no downgrade; REQ-006; persisted data (`Directly Usable — No Migration`; `automaticInstallPreparing` and `install-preparation` are not stored); the node gate; readiness reset ordering; the cached path's electron-updater half.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`. P-001, P-002, P-004 and P-005 are resolved.
- Classification: task_size `Medium`, architectural_risk `High` (agreed).
- Notes: implement SR-004 to SR-006 on top of IR-002 per design-spec DS-002 and the Validation Guidance. API/E2E then re-runs API-02D's load, API-02B, API-05C, the staged path and the second native fetch.
