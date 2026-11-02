# Implementation Handoff — automatic-app-node-updates (autobyteus-356)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Medium / High); ARCH-REV-002
  Pass. Implementation goes to Code Review per `get_handoff_rules` (Large or High → source review).
- Requirements doc: `tickets/in-progress/automatic-app-node-updates/requirements-doc.md` (SR-002, Approved).
- Investigation notes: `tickets/in-progress/automatic-app-node-updates/investigation-notes.md`.
- Solution revision record: `tickets/in-progress/automatic-app-node-updates/solution-revision-record.md`.
- Design spec: `tickets/in-progress/automatic-app-node-updates/design-spec.md` (SR-003, Ready).
- Supplemental task artifacts: none.
- Design review report: `tickets/in-progress/automatic-app-node-updates/design-review-report.md` (ARCH-REV-002 Pass).
- Architecture review revision record: `tickets/in-progress/automatic-app-node-updates/architecture-review-revision-record.md`.
- Triggering rework report: `design-review-report.md` ARCH-REV-005 (Pass) on `design-spec.md` SR-006, from `code-review-report.md` CRR-004 (F-API-003, CR-C12). Earlier round: CRR-002.

## Current Implementation Summary

- Implementation cycle: `Rework`.
- Implementation revision record: `implementation-revision-record.md`.
- Current implementation revision ID: `IR-003`.
- Related solution revision IDs: SR-003 to SR-006.
- Related architecture-review revision IDs: ARCH-REV-002, ARCH-REV-005.
- Related code-review revision IDs: CRR-001 to CRR-004.
- Related API/E2E revision IDs: API-REV-001 and round 2.
- Related delivery revision IDs: N/A.
- Triggering finding IDs: F-API-003, CR-C12 (this round); F-API-001, F-API-002 (IR-002).
- Branch `codex/automatic-app-node-updates`; base `origin/personal` @ `3b9dc912a1`.
- Commits:
  - `b4bda46484`: step 1;
  - `9369828ca7`: step 2;
  - `63f5bb8bfc`: steps 3–4;
  - `8cf4278319`: step 5;
  - `31d38080fc`: fixes from the rendered check;
  - `aa096836d9`: F-API-001 and F-API-002 (IR-002);
  - `6a94169f4f`: the handled row's icon layout (IR-002);
  - `2e64cbb3d9`: the macOS install wait (IR-003);
  - the evidence commit is named in the handoff message.

**App.**
- `app-update-automatic.json` is the switch, off by default, kept in `appUpdateAutomaticStore.ts`.
- `AppUpdater` acts on it:
  - DS-001: `update-available` → `startAutomatic(V)` → `downloadUpdate()`;
  - DS-002: `update-downloaded` → `installAutomatically(V)` → `installUpdateAndRestart()`. `automatic` is recorded
    only on `accepted: true`.
- The run's state lives in the new `AppUpdateAutomaticRun`: the version being downloaded,
  `installRequestedVersion`, the 60 s quit bound, and once-only failure handling.
- An install failure is detected three ways:
  - (a) the catch;
  - (b) `error` while `activeOperation === 'install'`;
  - (c) no `before-quit` within 60 s.

  Each is recorded once as `install` and blocks V. The install in flight (`AppUpdateInstallAttempt`, IR-002) is then
  settled:
  - before the preparation started, it is cancelled: nothing stopped, and no recovery runs;
  - during or after it, the preparation is awaited, `quitAndInstall` is skipped if it has not run, and then the injected
    `recoverAfterFailedInstall` runs.

  `ElectronApplication` relaunches (`app.relaunch()`, `app.exit(0)`) only when `isServerProcessGone()`.
- The start-time reconcile gives `AUTO_UPDATED` or an install failure.
- Switching on continues an update that is found or downloaded.
- IPC `app-update:set-automatic`.

**App, macOS order (IR-003, DS-002).** electron-updater reports a download before Squirrel has its verified copy, and a
refusal arrives only then. So on macOS the automatic path waits, stopping nothing:
- `AppUpdateInstallReadiness` follows Electron's public `update-downloaded`; every electron-updater report resets it. Not
  macOS is always ready for the downloaded version.
- During the one pending wait (15-minute bound) the server keeps working, status stays `downloaded`,
  `automaticInstallPreparing` is true, and no check or download runs. The row's Install click ends the wait and follows
  the manual path.
- A refusal during the wait records `install` with a plain reason, blocks V, runs no recovery, clears `updateStaged` and
  shows `install-preparation`; the rest of that refusal only logs. The bound records its own reason and keeps
  `downloaded`.
- `AppUpdateAutomaticPolicy` owns the sequence; `AppUpdater` keeps the state and the actions a click runs.

**Nodes.** In `electron/nodeAutoUpdate/`:
- `nodeUpdateClient.ts` is the C1 client, with a 10 s timeout and the main-process `fetch`.
- `decideNodeAutoUpdate.ts` holds the pure decision and the reconcile.
- `nodeAutoUpdateRecord.ts` keeps `node-auto-updates.json`: tolerant, atomic, drops removed nodes.
- `nodeAutoUpdater.ts`:
  - packaged builds and remote entries only;
  - the first pass at 2 min, then every 60 min, never overlapping, nodes one at a time;
  - an at-once check when a switch turns on;
  - an attempt recorded only on 202;
  - a 10 s follow timer per node, up to 15 min.
- `nodeAutoUpdateIpc.ts` provides the outcomes IPC.
- The switch is the registry change `set-auto-update` (`NodeEntry.autoUpdate?: true`, remote only).

**Renderer.**
- `AutoUpdateSwitch` gains `kind: 'app'`: no confirmation, plus the app-checks-off note. It shows in the Software
  update card and on Settings → Updates (`variant="settings"`).
- The app row shows "Updated automatically to <version>" (new until seen, keeps the entry visible) or "Automatic
  update failed. Nothing was changed." with the reason.
- `NodeAutoUpdate.vue` and `nodeAutoUpdateStore` hold the node switch and outcome line on the Nodes page.
- Docs: `docs/settings.md`, `docs/electron_packaging.md`.

## Routing Classification (Mandatory)

- Task size: `Medium`.
- Architecture risk: `High`.
- Design classification section: `design-spec.md` § Task Size And Architectural Risk.
- Classification confirmed or changed: `Confirmed`.
- Evidence and rationale:
  - Scope matches the design: `autobyteus-web` only, no server change (IMP-07).
  - The risk drivers are unchanged: an unattended restart, unattended remote updates, and two extended desktop records.
- Selected route: `Code Review`.
- Lightweight implementation self-review for the direct route: `Not Applicable`.
- New design impact or escalation trigger: `None`.
  - The macOS install trigger was not exercised: there is no real package. It is left to API/E2E (see Known Risks).
  - C1 is unchanged.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001, REQ-002, REQ-004; AC-001, AC-002, AC-005) | With the switch on: download, then install and restart at once. Off: today's flow exactly | `appUpdater.ts` `startAutomatic`, `installAutomatically`, `setAutomaticUpdate`, the `update-available` / `update-downloaded` / `error` listeners, install catch and quit bound; `appUpdateAutomaticRun.ts`; `appUpdateAutomaticStore.ts`; `appUpdateIpc.ts`; `electronApplication.ts` `recoverAfterFailedInstall` | Implemented. Unit: `appUpdaterAutomatic.spec.ts` (17). Real build: off → no artifact request; on → download started by itself and failed into AUTO_FAILED (IMP-08) |
| BEH-001 (N-8) | A staged update with a later `available` status installs from the cache | `setAutomaticUpdate` → `startAutomatic` → `downloadUpdate()` | electron-updater 6.8.9 re-emits `update-downloaded` from the cache: `electronUpdaterCachedDownload.spec.ts` (real `NsisUpdater`), plus a MacUpdater source read (IMP-03). No escalation |
| BEH-002 (REQ-003, REQ-004; AC-004, AC-005) | Switch on and node older → request the update to the app's version, then follow. Never same or older; one attempt per version | `nodeAutoUpdate/*`; `nodeRegistryStore.ts` `setNodeAutoUpdate` and loader; `electronApplication.ts` `startNodeAutoUpdates`, `set-auto-update` branch, `nodesChanged` on commit, `stop` at shutdown | Implemented. Unit: 55 cases in `nodeAutoUpdate/__tests__`. Real build against a fake C1 node: switch on → GET + POST at once from the main process, follow every 10 s, AUTO_UPDATED (IMP-08) |
| BEH-003 (REQ-004, REQ-005) | Outcomes recorded and shown in the existing words | `appUpdateNotificationRecord.ts` (fields, reconcile, `toNotification`); `updateNotificationsStore.ts`; `NotificationRow.vue`; `NotificationSection.vue`; `NodeAutoUpdate.vue`; `NodeServerUpdate.vue` | Implemented; rendered (IMP-08) |
| Contract (REQ-006; AC-006) | Switches only in desktop files and desktop IPC | `app-update:set-automatic`; `upsert-node-registry` `set-auto-update`; node outcomes IPC | Branch diff touches no server or contracts file; grep finds no match (IMP-07) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`.

## Key Files Or Areas

- `autobyteus-web/electron/updater/`:
  - `appUpdater.ts` (472 effective lines);
  - `appUpdateAutomaticPolicy.ts`, `appUpdateInstallReadiness.ts` (new, IR-003);
  - `appUpdateInstallAttempt.ts` (new, IR-002);
  - `appUpdateAutomaticRun.ts` (new);
  - `appUpdateAutomaticStore.ts` (new);
  - `appUpdateNotificationRecord.ts`;
  - `appUpdateIpc.ts`, `appUpdateController.ts`, `disabledAppUpdater.ts`.
- `autobyteus-web/electron/nodeAutoUpdate/` (new):
  - `nodeAutoUpdater.ts`, `decideNodeAutoUpdate.ts`;
  - `nodeAutoUpdateRecord.ts`, `nodeUpdateClient.ts`, `nodeAutoUpdateIpc.ts`.
- `autobyteus-web/electron/application/electronApplication.ts` (444 effective lines), `electron/nodeRegistryStore.ts`,
  `electron/preload.ts`.
- `autobyteus-web/shared/`:
  - `appUpdateTypes.ts`;
  - `nodeUpdateContract.ts` (new; the C1 types moved from `nodeServerUpdateStore.ts`);
  - `nodeAutoUpdateTypes.ts` (new).
- Renderer:
  - stores: `appUpdateStore.ts`, `updateNotificationsStore.ts`, `nodeStore.ts`, `nodeAutoUpdateStore.ts` (new);
  - notifications: `AutoUpdateSwitch.vue`, `NotificationSection.vue`, `NotificationRow.vue`;
  - settings: `AboutSettingsManager.vue`;
  - nodes: `NodeServerUpdate.vue`, `NodeAutoUpdate.vue` (new);
  - localization (en, zh-CN).

## Important Assumptions

Deviations from the design text, each kept within the approved behavior:

1. **IPC constant location.** `APP_UPDATE_IPC_SET_AUTOMATIC` lives in `electron/updater/appUpdateController.ts` with
   the other app-update channel constants, not in `shared/appUpdateTypes.ts`. The renderer reaches it only through
   the preload.
2. **Reconcile rule restricted to install failures.** The rule "`automaticFailure.version === running` → AUTO_UPDATED"
   is applied only to an install-step failure. A download failure of V followed by a click install of V would
   otherwise be labelled "Updated automatically".
3. **Switch-on with `no-update`.** Turning the switch on while `updateStaged` and the status is `no-update` does
   nothing: there is no `availableVersion`, and `downloadUpdate()` requires `available`. The staged update still
   installs on quit, as today. `available` and `downloaded` are handled.
4. **AUTO_UPDATED waits for the node's trial.** A node reconciles to AUTO_UPDATED by `version === V` only when its
   update is not `running`. During the 305 trial a node already runs V and can still roll back (AC-005).
5. **The quit bound applies to automatic installs only.** It is armed only for a pending automatic install
   (accepted, not yet failed). A manual install keeps today's unbounded behavior (Preserved Behavior Boundary).
6. **Which entry carries the node switch.** It is set on a row's first desktop entry (`row.entryIds[0]`), the address
   the desktop opens the node by. A peer-only row with no desktop entry has no switch.
7. **Fixes from the rendered check** (`31d38080fc`):
   - The node's server line asks the node again when its automatic entry is requested or ends. Otherwise the window,
     which does not poll an idle node, kept showing "Server 1.0.0 · Update to <version>" next to "Updated
     automatically to <version>". The line leaves the end of an automatic update to the automatic outcome line.
   - The app-checks description now reads "A newer version is only announced, unless Update automatically below is
     on." The old text was false with the switch on.

8. **IR-002 (`aa096836d9`):**
   - **Beyond the finding's text.** Once a failure is known during the preparation, `quitAndInstall` is skipped when
     the preparation ends. It would otherwise run for an install the updater had already refused.
   - **The API report's timeline.** It labels 29.685 as `quitAndInstall` and says the stop had resolved before the
     server exited. The code supports CRR-002 instead: `stopServer` awaits `waitForChildExit`, and
     `MacUpdater.js:219-223` starts the native step right after dispatching `update-downloaded`, without
     `quitAndInstall`. So the refusal arrived during the preparation, and awaiting it is enough.
   - **Failed preparation after a refusal.** It logs and sets its own install error (the same generic message), then
     recovery runs once. A guard that hid this had no visible effect (mutation M14 survived), so it was removed.

9. **IR-003:**
   - **New file not in the design's map.** `AppUpdateAutomaticPolicy` holds the automatic sequence, because this round
     would have taken `appUpdater.ts` past 500 lines (CR-C7). It is now 472. The design's readiness and run
     responsibilities are as mapped.
   - **`lastErrorSignature` is not cleared explicitly**, unlike the design's text. `applyState` already clears it when the
     status becomes `downloaded`, and nothing during the wait sets it, so an explicit clear would be dead code. "A later
     real error still shows" is tested.
   - **N-17 and N-19 are both done.** N-13's rule sits in `found(V)`, which covers the switch-on path and the
     `update-available` hook.
   - **`outcomeStep` is new on `AppUpdateNotification`.** The row needs it for the not-retried sentence, which the design
     asks for but gives no field for.
   - **The failure box also shows at row state `downloaded`,** otherwise the bound's failure would be invisible.
   - **N-18 is not designed for,** as the review says.

## Known Risks

- **No real native success through the wait yet (IR-003).** IMP-12 saw the wait and a real refusal, but not Squirrel
  finishing and the install going ahead, nor the staged path or a second native fetch (F-15). Those are API/E2E's; if
  Squirrel errors or stays silent on a second fetch, the design's escalation trigger applies.

- **IR-002's refusal fix is not yet proven on a real refusal.** Unit tests control the preparation's timing; the real
  Squirrel refusal on a read-only volume is API-05's repeat.

- **The real install and restart were not exercised.** That covers the macOS install trigger without a window, the
  relaunch into V2, AC-002 / AC-003 and the native-refusal path. It needs a signed package on the test feed and is
  API/E2E's per the design's Validation Guidance.
- **No real Docker node yet.** The node flow ran against a test-owned fake C1 node only; AC-004 / AC-005 on a real
  starter node are API/E2E's.
- **Toast on a background download failure.** A failed automatic download also raises today's download-error toast
  (seen in IMP-08 b), besides the failure row. This is unchanged existing behavior (the design keeps the existing
  error state); it could be quieted like background checks if the Solution Designer wants it.
- **Busy runs after a failed install.** Runs busy at an automatic install that fails in the same process are not
  resumed after the recovery relaunch (FU-003, accepted in the design).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature`.
- Reviewed root-cause classification: `No Design Issue Found`.
- Reviewed refactor decision: `No Refactor Needed`.
- Implementation matched the reviewed assessment: `Yes`.
- If challenged, routed as `Design Impact`: `N/A`.
- Evidence / notes:
  - The policy sits in the two owners (`AppUpdater`; `NodeAutoUpdater` in main).
  - Automatic mode calls the same `downloadUpdate()` / `installUpdateAndRestart()` the buttons call.
  - The run state moved to `AppUpdateAutomaticRun` to keep `appUpdater.ts` under 500 lines; `AppUpdater` still owns
    the sequence.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`.
- Dead code in the touched files and modules removed: `Yes`. The renderer's local `isStatus` was replaced by the
  shared `isNodeServerStatus`.
- Dead code found elsewhere, added to `follow-ups.md`: None.
- Shared structures remain tight: `Yes`.
  - `NodeEntry` gains one optional `true`.
  - The app notification gains two nullable fields.
  - Node outcomes have their own type.
- Canonical shared design guidance reapplied: `Yes`.
- Changed source files within size guardrails: `Yes`.
  - Largest: `appUpdater.ts` 472 and `electronApplication.ts` 444. For CR-C7, the install sequence and the automatic
    policy moved to `appUpdateInstallAttempt.ts` and `appUpdateAutomaticPolicy.ts`.
  - The largest delta is `nodeAutoUpdater.ts` at 170 lines, a new file.
  - No file is over 500.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`.
- Design-spec decision reference: `design-spec.md` § Persisted Data / State Transition Decision.
- Implementation follows it without a migration or version-specific fallback: `Yes`.
- Direct-use evidence:
  - Missing or invalid new files read as off or empty: `appUpdateAutomaticStore.spec.ts`,
    `nodeAutoUpdateRecord.spec.ts`.
  - Invalid optional record fields read as null (`appUpdateNotificationRecord.spec.ts`).
  - The registry loader keeps `autoUpdate` only as `true` on remote entries (`nodeRegistryStore.spec.ts`).
  - Writes are atomic: temp file plus rename. The registry write is unchanged.
- Deviation: `None`.

## Environment Or Dependency Notes

- A fresh worktree needs:
  - `pnpm install`;
  - `pnpm -C autobyteus-web exec nuxt prepare`;
  - the Electron binary: `(cd autobyteus-web/node_modules/electron && node install.js)`.
- `shared/nodeUpdateContract.ts` and `shared/nodeAutoUpdateTypes.ts` are added to `electron/tsconfig.json` `include`.
- The rendered check used test-owned fakes (`evidence/IMP-08-fakes.mjs.txt`): a generic feed offering 99.0.0 with no
  artifact, and a C1 node on `127.0.0.1:47357`. It also used isolated instances with auto-created data roots, removed
  at stop. No user data or installed app was touched.

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-web test:electron run` | `2e64cbb3d9` | macOS 26.5.2 arm64, Node 22.23.1, vitest 3.2.7 | all Electron main tests incl. updater, nodeAutoUpdate, application, registry | BEH-001..003, AC-001, AC-004, AC-005 | Pass | `evidence/IMP-01-electron-suite.log` | `Tests  407 passed | 1 skipped (408)`; `Test Files  60 passed | 1 skipped (61)` |
| IMP-02 | `pnpm -C autobyteus-web typecheck`; `pnpm -C autobyteus-web exec tsc -p electron/tsconfig.json --noEmit`; `pnpm -C autobyteus-web test:nuxt` (full web suite) | `2e64cbb3d9` | same | renderer stores and components, types | BEH-003, REQ-001, REQ-005 | Pass | `evidence/IMP-02-typecheck-and-web.log` | `[typecheck] production errors: 0; test-file errors: 297 in 139 files (baseline 297 in 139 files)`, `[typecheck] PASS`; tsc `exit=0`; `Tests  4986 passed (4986)` |
| IMP-03 | N-8 proof: `vitest --config ./electron/vitest.config.ts run updater/__tests__/electronUpdaterCachedDownload.spec.ts` (part of IMP-01) | `2e64cbb3d9` | same, electron-updater 6.8.9 | real `NsisUpdater.downloadUpdate()` with a cached file | BEH-001 (N-8) | Pass | `evidence/IMP-01-electron-suite.log` (the file's line) | `electronUpdaterCachedDownload.spec.ts (1 test)` |
| IMP-04 | App mutations: 9 mutations of `appUpdater.ts` / `appUpdateAutomaticRun.ts`, each run against `appUpdaterAutomatic.spec.ts` | `9369828ca7` | same | gate, switch, once-only failure, quit bound, error during install, in-process block | AC-001, AC-005, N-6 | Pass (every mutation red) | `evidence/IMP-04-app-mutations.txt` | each `== M*` followed by `failed`; M6/M7 in the "after tightening" block |
| IMP-05 | Node and wiring mutations (14 + 4) | `63f5bb8bfc` | same | decision, reconcile, updater passes/follow/switch/packaged/remote, recovery, registry | AC-004, AC-005, REQ-003 | Pass (every mutation red) | `evidence/IMP-05-node-mutations.txt`, `evidence/IMP-05-wiring-mutations.txt` | each `== N*` / `== W*` followed by `failed` |
| IMP-06 | Renderer mutations (8, plus 3 for the rendered-check fix) | `8cf4278319`; R9–R11 on `31d38080fc` | same | app row outcome/unread/entry, switch confirmation, node outcome seen, server line follow | REQ-001, REQ-005 | Pass (every mutation red) | `evidence/IMP-06-renderer-mutations.txt` | each `== R*` followed by `failed` |
| IMP-07 | AC-006: branch diff of `autobyteus-server-ts` and contracts, and a word grep of server code | `8cf4278319` | git 2.50.1 | the whole branch | REQ-006, AC-006 | Pass | `evidence/IMP-07-ac006-no-server-surface.txt` | empty sections, `grep exit 1` |
| IMP-08 | Rendered check on isolated worktree builds (`pnpm --silent isolated-app start --build --test-update-feed http://127.0.0.1:47356`), driven over CDP | run 1 `8cf4278319`; run 2 `31d38080fc` | macOS 26.5.2, packaged arm64 build 1.5.11-beta.10, test-owned fakes | the app switch in the panel and in Settings → Updates; the automatic download failure row; the checks-off note; the node switch and the main-process node update to AUTO_UPDATED; the server line after it | AC-001, REQ-001, REQ-004, REQ-005, AC-004 (fake node) | Pass | `evidence/IMP-08-*.png`, `evidence/IMP-08-run1-fakes.log`, `evidence/IMP-08-run2-fakes.log`, `evidence/IMP-08-fakes.mjs.txt`, `evidence/IMP-08-drive.mjs.txt`, `evidence/IMP-08-run2-node-on.js.txt`, `evidence/IMP-08-run2-node-on-output.txt` | see Frontend Rendered-Result Check |
| IMP-09 | IR-002 mutations: 8 of `appUpdateInstallAttempt.ts`, `appUpdateAutomaticRun.ts`, `appUpdater.ts` and the sidebar, each run against `appUpdaterAutomatic.spec.ts` or `NotificationCenter.appAutomatic.spec.ts` | working tree before `aa096836d9` (mutated and restored); the removed M14 guard is the only later change to those files | same | settle before recovery, cancel before preparation, skip `quitAndInstall`, download rejection, sidebar count | F-API-001, F-API-002, AC-002, AC-005 | Pass (every mutation red) | `evidence/IMP-09-ir002-mutations.txt` | each `== M*` / `== R*` followed by `failed`; M14 records the removed guard |
| IMP-10 | Rendered check of F-API-001 on isolated worktree builds, with a seeded record in a temp data root and a feed offering only the running version | `aa096836d9`; layout on `6a94169f4f` | macOS 26.5.2, packaged arm64 build 1.5.11-beta.10 | the sidebar entry through unread, panel open and closed; the handled app row | F-API-001, REQ-005 | Pass | `evidence/IMP-10-sidebar-output.txt`, `evidence/IMP-10-a-sidebar-1-updated.png`, `evidence/IMP-10-b-panel-open.png`, `evidence/IMP-10-c-row-layout.png`, `evidence/IMP-10-sidebar.js.txt` | `"pillLabel": "1 update applied automatically: 1 updated automatically"`; `"pillWhileOpen": "1 updated"`; `"pillAfterClose": null` |
| IMP-11 | IR-003 mutations: 20 across readiness, policy, `appUpdater.ts`, the record, About, the row and the display map | working tree before `2e64cbb3d9` (mutated and restored); only docs changed after | same | install order, resets, version, refusal's record and state, settling, check and download guards, click, switch off, N-13/N-19, bound, reasons, renderer | F-API-003, CR-C12, REQ-002, REQ-004, AC-005 | Pass (every mutation red) | `evidence/IMP-11-ir003-mutations.txt` | each `== S*` followed by `×` or `failed` |
| IMP-12 | Real Squirrel: an isolated copy (`evidence/API-356-prepare-copy.sh`: own bundle ID, caches and temp data root) of this build, a local feed, driven over CDP. First a junk zip (99.0.0), then the real built zip as a newer version (99.0.1), which Squirrel refuses because no bundle matches the copy's ID | `2e64cbb3d9` | macOS 26.5.2, packaged arm64 1.5.11-beta.10, real Squirrel.Mac | the wait, the check guard, the refusal, the row and About | AC-005 (refusal), REQ-004, SR-006 | Pass | `evidence/IMP-12-real-squirrel-output.txt`, `evidence/IMP-12-a-preparing.png` to `IMP-12-e-row-refused.png` | `"preparing": true`, `"checkDisabled": true`, `"stateAfterManualCheckIpc": "downloaded"`, `"serverHealth": 200` during and after; `"errorKind": "install-preparation"`, `"updateStaged": false`; no `Server process exited` or `relaunch` in the log |

- Not run, and why:
  - the real install and relaunch into a new version (AC-002, AC-003), the native install refusal, and a real Docker
    starter node (AC-004 / AC-005): these need signed packages and a real node; they are API/E2E's per the design's
    Validation Guidance. For IR-003, ARCH-REV-005 lists API-02D's load, API-02B, API-05C, the staged path and the second
    native fetch on real Squirrel (F-15). IMP-12 is a narrow implementation check, not those runs;
  - live Codex: not relevant to this change.

## Frontend Rendered-Result Check (When Applicable)

- **Affected surfaces / journeys:**
  - the Notification Center's Software update card: the app switch and the app row outcomes;
  - Settings → Updates: the app switch and the checks-off note;
  - the Nodes page: a remote node's switch, its outcome line and its server line.
- **References:**
  - REQ-001..005;
  - the design's Subsystem And File Mapping;
  - the existing outcome wording ("Updated automatically to …", "Automatic update failed. Nothing was changed.").
- **Design system and adjacent surfaces reviewed:**
  - `AutoUpdateSwitch` panel and card variants;
  - the About page switch blocks (checks, beta channel);
  - `NodeServerUpdate` and the Nodes row's collaboration switch.
- **Surface used:** isolated desktop instances of this worktree's packaged build (TESTING.md: desktop-shell behavior →
  an isolated desktop instance), with a local test feed and a fake C1 node. The window was driven over CDP with
  Playwright `connectOverCDP` and real `click()`s.
- **States inspected, run 1 (`8cf4278319`):**
  - (a) switch off with 99.0.0 found: Download offered, and no artifact request in the feed log (AC-001);
  - (b) switch turned on by a click, with no confirmation: the download started by itself and failed, and the row
    shows the failure box with the reason while Download stays;
  - (c) Settings → Updates: the switch block below the channel, in the same type scale and divider pattern;
  - (d) checks turned off: the amber note "only a check you start installs new versions", referenced by
    `aria-describedby`; checks restored after;
  - (e) a node added: the switch under the server line;
  - (f) the switch turned on: the main process (`ua=node`) sent GET and POST at once, then followed every 10 s;
    AUTO_UPDATED was recorded and the line "Updated automatically to 1.5.11-beta.10" shows with the New dot;
    marked read.
- **Issues found and corrected:**
  1. After (f), the server line still read "Server 1.0.0 · Update to 1.5.11-beta.10". It now re-asks the node on
     each automatic change.
  2. The checks description claimed updates are "only announced" even with the switch on. Both are fixed in
     `31d38080fc` and re-verified in run 2:
     - (g) the checks description reads "A newer version is only announced, unless Update automatically below is on.";
     - (h) after turning the node switch on, the line went "Server 1.0.0 | Downloading 1.5.11-beta.10…", then
       "Server 1.5.11-beta.10", and ends with one "Updated automatically to 1.5.11-beta.10" and no second notice.
       For up to one follow interval (10 s) the window's own "Updated to 1.5.11-beta.10." showed before the main
       process recorded AUTO_UPDATED; the automatic line then replaces it (`evidence/IMP-08-run2-node-on-output.txt`).
- **IR-002 (IMP-10):** with a seeded automatic record reconciled to AUTO_UPDATED at start, the entry reads "1 updated"
  (label "1 update applied automatically"), keeps "1 updated" with the panel open, and is gone after closing. The check
  showed the handled row's icon alone on its own line beside a long version; `6a94169f4f` fixes that. A pre-release
  version still wraps to two lines at its hyphen in the 368 px panel, which is accepted.
- **IR-003 (IMP-12, real Squirrel):**
  - Settings → Updates during the wait: "Preparing to install. The app restarts by itself when this is done.", the check
    button disabled, Install offered, server health 200.
  - The row during the wait: the preparing text with "Install and restart".
  - After the refusal, both timings seen in this run: About's own text, and the row's failure box with the plain reason
    and "It won't be tried again automatically. You can still install it yourself.", with Download offered. The raw native
    text stays in the log.
  - A later check finding a newer version started it, with the earlier version blocked.
  - Not seen rendered: the bound's failure with status `downloaded` (component test only).
  - The refusal also raises the existing error toast, covering the panel title for a few seconds, as other update errors
    do.
- **Limitations:**
  - The panel was inspected at the default 1200×768 window only.
  - IMP-10's AUTO_UPDATED row comes from a seeded record, not a real restart; API-02 covers the real restart.

## Downstream Coverage Hints / Suggested Scenarios

- Packaged E2E with the test feed and a real V2 package:
  - switch off → nothing;
  - switch on → it downloads, installs and relaunches into V2, and the row says "Updated automatically to V2" (AC-002);
  - with busy agents on a V1 that has the recorder → they resume (AC-003).
- A broken V2 package → the failure row, and no repeat for V2 after a relaunch (AC-005).
- On macOS, the app started from a read-only or translocated location: a native refusal brings the old version back
  with its server (design Validation Guidance).
- A real starter node older than the app, with a signed package from a local release source (305 DEL-14):
  - switch on → updated, and the row shows the outcome (AC-004);
  - a trial that rolls back → the failure with the node's reason, and no repeat;
  - a stopped node → tried again at the next pass (AC-005);
  - a node at the same or a newer version → no request.

## API / E2E / Executable Coverage Investigation And Execution Still Required

All of the above. Implementation checks are not API/E2E sign-off.
