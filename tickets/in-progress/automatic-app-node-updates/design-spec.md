# Design Spec — automatic-app-node-updates (autobyteus-356)

## Solution And Approval Basis
- Current solution revision ID: `SR-002`.
- Approved requirements: `requirements-doc.md` (SR-002). DEC-001 = A was approved by the user on 2026-11-01 ("once its
  downloaded then its intall immediately not 30 minutes please"); DEC-002 and DEC-003 were decided by the Solution
  Designer within the direction.
- User approval of the design: `Not required` (no new decision; DEC-001 was the only one he needed to make).
- Design status: `Ready`.
- Investigation notes: `tickets/in-progress/automatic-app-node-updates/investigation-notes.md` (F-01..F-12).
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`,
  `autobyteus_org/autobyteus-workspace-superrepo/DESIGN.md` (rule 7, tolerant reads; rule 9, one release for the
  desktop and its nodes), `TESTING.md`. No conflicts found.

## Current-State Read
- **App.** `AppUpdater` checks on a schedule (F-02, F-08), records a found version in the app update record (F-07)
  and waits: Download and "Install update and restart" are IPC calls from a click. Installing goes through
  `prepareForInstall` (339: bounded stop, then install, also after an incomplete stop when the server is gone), and
  285 resumes busy runs after it.
- **Docker nodes.** Only the renderer's `nodeServerUpdateStore` calls C1, and only on a click (F-03, F-11). The node
  verifies, tries out and rolls back by itself.
- **Switches.** The three existing switches are node settings (F-01). Both new switches belong to the desktop. The
  app is desktop software, and a node switch must say what *this desktop* does to that node. So they live in desktop
  files (F-08, F-10), which no server or agent reads (F-12, REQ-006).
- There is no structural problem in the current code. This change adds a policy at the two places that already own
  the click actions.

## Task Size And Architectural Risk (Mandatory)
- Task size: **Medium**. About 12 files in `autobyteus-web` (Electron main, shared types, three stores, three
  components, docs), two new main-process modules, and no server change.
- Architectural risk: **High**. The app restarts by itself with nobody present, and the desktop starts unattended
  updates of remote machines. A wrong gate can cause a restart loop, a node update loop or a downgrade. Two persisted
  desktop records gain fields.
- Escalation trigger: if the real install on the platform needs anything beyond `installUpdateAndRestart()` (for
  example, if macOS Squirrel refuses an install with no window), or if C1 must change (it is frozen), return to the
  Solution Designer.

## Architecture Investigation Evidence
| Source | Path | Observation | Decision supported |
| --- | --- | --- | --- |
| Read | `appUpdater.ts:96, 200-215, 262-282, 339-398` | `autoDownload=false`; download and install are methods the IPC calls | Automatic mode calls the **same** two methods, so a click and automatic mode cannot diverge |
| Read | `appUpdateNotificationRecord.ts` (F-07) | Start-time reconcile turns a waiting record into a handled one | It is the natural place to learn after the restart whether the automatic install worked |
| Read | `appUpdateCheckSettingsStore.ts`, `appUpdateChannelStore.ts` (F-08) | One small file per app update setting | New `app-update-automatic.json` in the same style |
| Read | `electronApplication.ts:118-122, 184-270`, `nodeRegistryStore.ts:72-112` (F-10) | The registry is owned by the main process and changes by typed changes | The node switch is an optional `NodeEntry.autoUpdate` with a new `set-auto-update` change |
| Read | `update-status.mjs:83`, `nodeServerUpdateStore.ts` (F-11) | `relation` and the update state tell whether to request and how the update ended | The node policy reads C1 only and leaves it unchanged |
| Read | `updateNotificationsStore.ts:55-67,155-162`, `NotificationRow.vue:136` (F-09) | The app row has no outcome | Add `outcome` and `outcomeReason` to the app row, using the existing words |

## Intended Change
Add an automatic policy in front of the existing actions:
- the app's own download and install, inside `AppUpdater`;
- the node's C1 update request, in a new main-process `NodeAutoUpdater`.

Each is governed by a desktop-side switch that is off by default. Each records its outcome where the existing rows
read it.

## Change Scope (Mandatory)
- In scope: UC-001 (app switch, automatic download and immediate install), UC-002 (node switch, desktop-driven node
  update), UC-003 (outcomes and failures).
- Derived consumers:
  - The app notification (`AppUpdateNotification`) gains `outcome` and `outcomeReason`. They are consumed by the
    app row in `updateNotificationsStore` (state, unread) and by `NotificationRow.vue` (text, new dot). Both are
    updated.
  - `AppUpdateState` gains `automaticUpdate`. It is consumed by `appUpdateStore` and the switch. The channel lock
    `isAppUpdateChannelLocked` is unchanged.
  - `NodeEntry.autoUpdate` is consumed by `normalizeLoadedNode` (keep it), `applyNodeRegistryChange` (the new change
    type), `NodeAutoUpdater` and the Nodes page row. The registry broadcast already carries the whole snapshot.
- Deliberately left alone:
  - C1 and the starter (frozen);
  - the server's update-automation settings and `UpdatePass` (they are node concerns);
  - the check schedule (automatic mode acts on what a check finds);
  - `isAppUpdateChannelLocked`;
  - the renderer's `nodeServerUpdateStore`, apart from showing the outcome.
- Follow-ups: FU-001 (node outcomes in the Notification Center), FU-002 (a node updating without a desktop).

## Relevant Behavior And Production-Path Map (Mandatory)
| ID | Kind | REQ / AC | Trigger | Existing (evidence) | Change | Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-002, REQ-004; AC-001..003, AC-005 | A scheduled or manual check finds a newer version | F-02, F-08 | Switch on: download, then install and restart at once | DS-001, DS-002 |
| BEH-002 | User | REQ-003, REQ-004; AC-004, AC-005 | Launch, hourly, or a node's switch turned on | F-03, F-11 | Switch on and node older: request the update to the app's version, then follow it | DS-003 |
| BEH-003 | System | REQ-004, REQ-005 | Start after an install; end of a node update | F-07, F-09 | Outcome recorded and shown | DS-002, DS-003 |
| — | Contract | REQ-006; AC-006 | — | F-12 | Switches only in desktop files and desktop IPC | — |

## Relevant Supplemental Task Artifacts
None.

## Task Design Health Assessment (Mandatory)
- Change posture: `Feature`.
- Current design issue found: `No`.
- Structural triggers considered:
  - **Duplicated policy.** Ruled out: automatic mode calls `downloadUpdate()` and `installUpdateAndRestart()`, and a
    single decision function decides each node request.
  - **Ownership drift.** Ruled out: the app policy lives in `AppUpdater`, which owns the app update. The node policy is
    a new owner in the main process, because the renderer may have no window open (Principle: the owner that runs
    when the behavior must run).
  - **Shared structure looseness.** `NodeEntry` gains one optional boolean, and remote-only is checked at the single
    change point.
- Root cause classification: `No Design Issue Found`.
- Refactor needed now: `No`.
- Design response: add the policy in the two owners; keep C1 and the manual paths unchanged.
- Residual risk: an operating-system install failure that does not throw (the app relaunches on the old version).
  The start-time reconcile detects it, and the one-attempt rule stops a loop (REQ-004).

## Terminology
- **Automatic run** (app): one found version going through automatic download and install. It is held in memory as
  `automaticVersion` while it runs, and recorded in the app update record while the install is under way.
- **Attempt** (node): an update request the node **accepted** (202). A refusal before the start (409), or a request
  that was not delivered, is not an attempt.

## Legacy Removal Policy (Mandatory)
- Obsolete paths: none. The docs line "never the app" (`docs/settings.md:416`) is rewritten.
- Compatibility wrappers or dual paths: `None`.

## Persisted Data / State Transition Decision (Mandatory)
- Stored subjects (all desktop-side, in `<userData>`, one small JSON each):
  - **new** `app-update-automatic.json` `{ "enabled": boolean }`;
  - **extended** `app-update-notification.json`, with optional `automatic: { version, startedAt } | null` and
    `automaticFailure: { version, step: 'download' | 'install', reason } | null`;
  - **extended** `node-registry` entries, with optional `autoUpdate: true`;
  - **new** `node-auto-updates.json` `{ entries: { [entryId]: { version, requestedAt, outcome: 'PENDING' |
    'AUTO_UPDATED' | 'AUTO_FAILED', reason: string | null, read: boolean } } }`.
- Reader and writer behavior (rule 7):
  - A missing or invalid new field reads as absent: switch off, no automatic run, no failure.
  - A missing or invalid new file reads as off or empty, with a warning for an invalid one.
  - Writes are atomic (temp file plus rename), as F-07 already does.
  - An older app that rewrites these files drops the new fields, and the switches then read off. That is the safe
    default, and older apps are not supported against newer data in any case (rule 9).
- Decision: **`Directly Usable — No Migration`**. All new fields are optional and default to today's behavior.
  There is nothing to convert, and the user's existing files keep working unchanged.
- No user data is changed or deleted. The Task's "approval and a backup first" rule is not triggered.

## Data-Flow Spines

### DS-001 — App: automatic download
`update-available(V)` from a check of any source → `AppUpdater.onUpdateAvailable`, which records V as today → `if
(automaticUpdate && !record.blocksAutomatic(V)) startAutomatic(V)`. `startAutomatic(V)` sets `automaticVersion = V`
and calls `downloadUpdate()`.
- **Gate `blocksAutomatic(V)`:** true when `automaticFailure` is `{ version: V, step: 'install' }`. A download
  failure does not block, so the next scheduled check tries again (REQ-004).
- **Download error** (`error` event or a rejected download while `automaticVersion === V`):
  `record.recordAutomaticFailure(V, 'download', reason)`, then `automaticVersion = null`. The existing `handleError`
  state applies, as today.

### DS-002 — App: immediate install, and the outcome after the restart
`update-downloaded(V)` → `if (automaticUpdate && !blocksAutomatic(V)) installAutomatically(V)`.
`installAutomatically(V)`:
1. `record.recordAutomaticInstall(V)`, which writes `automatic = { V, now }` **before** anything stops;
2. calls the existing `installUpdateAndRestart()`, the 339 path, so busy runs are recorded and later resumed by 285.

DEC-001 = A: there is no delay, no idle check and no window check. The value of the switch is read at the event, so
turning it off during a download stops the install. The download itself still finishes, and the update installs on
quit, as today.

**Install that throws in this process** (the `installUpdateAndRestart` catch): `recordAutomaticFailure(V, 'install',
reason)` and `automatic = null`. Everything after this follows today's error path.

**Start after the restart** (`reconcileWithRunningVersion`, extended):
- `automatic.version === running` → handled, `outcome = AUTO_UPDATED`, `read = false`;
- `automatic` set but `running === fromVersion` (the operating system did not install) → stays waiting,
  `automaticFailure = { V, 'install', 'The update did not install. The app is still on <from>.' }`, `automatic = null`;
- otherwise today's rule (a manual update becomes handled with no outcome).

`recordFound(W)` with W newer than the record's version replaces the record, which clears `automaticFailure`. So a
newer release is tried again (REQ-004). `markRead` also marks an `AUTO_UPDATED` handled record as read.

**Turning the switch on** (`setAutomaticUpdate(true)`, persisted to `app-update-automatic.json`):
- status `available` with `availableVersion` V → `startAutomatic(V)`;
- status `downloaded` or `updateStaged` with V → `installAutomatically(V)` (REQ-002: it continues the update that
  was found);
- otherwise nothing. The next check does the rest.

The gate applies in every case. If the file cannot be saved, the switch still applies for this session and the result
says `persisted: false`, like the channel.

### DS-003 — Nodes: desktop-driven update
`NodeAutoUpdater` in the main process:
- **Triggers:** a pass 2 minutes after launch, then every 60 minutes; and at once for an entry whose `autoUpdate`
  turned on (`commitNodeRegistrySnapshot` notifies it).
- **Scope:** packaged builds only, and remote entries only.
- **Order:** passes do not overlap. Nodes are handled one after another, each with a 10 s request timeout.

For each node with `autoUpdate === true`, with `V = app.getVersion()`:
1. `GET {baseUrl}/rest/node-update?target=V` (C1).
2. **Reconcile a pending entry** first. The entry is `PENDING` for V, and:
   - `version === V`, or `update` is `succeeded` with `targetVersion` V → `AUTO_UPDATED`;
   - `update` is `failed` or `refused` with `targetVersion` V → `AUTO_FAILED`, with the node's `message`, or its
     `code` when there is no message;
   - still not V, no update running, and 30 minutes since `requestedAt` → `AUTO_FAILED`, "The node did not finish the
     update."
3. **Decide** with the pure `decideNodeAutoUpdate(status, V, entry)`. It returns `request` only when **all** of these
   hold:
   - `inPlaceUpdate === 'available'`;
   - `target.relation === 'newer'` (never same or older, so no downgrade);
   - `update?.state !== 'running'`;
   - no `updateBlocker`;
   - the entry is not `PENDING` or `AUTO_FAILED` for V (one attempt per version per node, REQ-004).
4. `POST { version: V }`:
   - 202 → entry `{ V, now, PENDING, read: false }`, then follow: GET every 10 s for up to 15 minutes. A node that
     restarts does not answer for a while, and that is expected. Then reconcile as in step 2. After 15 minutes the
     entry stays `PENDING` until a later pass reconciles it;
   - 409, a network error or a timeout → no entry change, logged; the next pass tries again.

The decision lives only in the main process. The renderer's `nodeServerUpdateStore` keeps its click path. On its own
refresh it sees `update.state === 'running'` and follows the update, as today.

## Ownership And Dependency Rules
- `AppUpdater` owns the app automatic policy. It depends on the automatic-setting store and the app update record,
  and calls only its own methods.
- `NodeAutoUpdater` owns the node policy. It depends on:
  - a `getNodes()` function (the registry snapshot);
  - `appVersion`;
  - `NodeAutoUpdateRecord`;
  - an injected `fetch`, clock and timers (for tests).

  It does not import renderer code, and it reuses C1 only through its own small client (`nodeUpdateClient.ts`).
- The renderer never decides an automatic update. It only shows the switches and outcomes and sends switch changes.
- REQ-006: the switches go through desktop IPC only (`app-update:set-automatic`, `upsert-node-registry`
  `set-auto-update`). No server, GraphQL, REST or tool surface is added.

## Interfaces
- **Shared** (`shared/appUpdateTypes.ts`):
  - `AppUpdateState.automaticUpdate: boolean`;
  - `AppUpdateNotification.outcome: 'AUTO_UPDATED' | 'AUTO_FAILED' | null` and `outcomeReason: string | null`. Set
    `AUTO_FAILED` while `automaticFailure` matches the record's version;
  - `APP_UPDATE_IPC_SET_AUTOMATIC = 'app-update:set-automatic'`;
  - `AppUpdateAutomaticChangeResult { accepted: boolean; persisted: boolean; state }`. `accepted: false` means a
    non-boolean value.
- **Node types** (`types/node.ts`):
  - `NodeEntry.autoUpdate?: true`;
  - `SetAutoUpdateNodeRegistryChange { type: 'set-auto-update'; entryId; enabled: boolean }`. It is refused for the
    embedded entry. `false` removes the field.
- **Node outcomes IPC:**
  - `node-auto-update:get-state` → `Record<entryId, NodeAutoUpdateEntry>`;
  - broadcast `node-auto-update:changed`;
  - `node-auto-update:mark-read(entryId)`.

## Subsystem And File Mapping
| File | Change | Responsibility |
| --- | --- | --- |
| `autobyteus-web/electron/updater/appUpdateAutomaticStore.ts` | new | load/save `app-update-automatic.json` (default off) |
| `autobyteus-web/electron/updater/appUpdater.ts` | change | `automaticUpdate` state, `setAutomaticUpdate`, DS-001/DS-002 hooks in `update-available`, `update-downloaded`, `error`, install catch |
| `autobyteus-web/electron/updater/appUpdateNotificationRecord.ts` | change | `automatic`, `automaticFailure`, `recordAutomaticInstall`, `recordAutomaticFailure`, `blocksAutomatic`, reconcile, outcome in `toNotification`, `markRead` for AUTO_UPDATED |
| `autobyteus-web/electron/updater/appUpdateIpc.ts`, `disabledAppUpdater.ts`, `appUpdateController.ts`, `electron/preload.ts`, `shared/appUpdateTypes.ts` | change | new IPC and types; the disabled updater refuses (`accepted: false`) and reports `automaticUpdate: false` |
| `autobyteus-web/electron/nodeAutoUpdate/nodeAutoUpdater.ts` | new | DS-003 passes, triggers, follow |
| `autobyteus-web/electron/nodeAutoUpdate/decideNodeAutoUpdate.ts` | new | the pure decision (step 3) and reconcile (step 2) |
| `autobyteus-web/electron/nodeAutoUpdate/nodeAutoUpdateRecord.ts` | new | `node-auto-updates.json`, tolerant and atomic; drops entries of removed nodes |
| `autobyteus-web/electron/nodeAutoUpdate/nodeUpdateClient.ts` | new | C1 GET/POST with timeout (main-process `fetch`) |
| `autobyteus-web/electron/application/electronApplication.ts` | change | build and start `NodeAutoUpdater`, notify it on commit, stop its timers at shutdown; `set-auto-update` in `applyNodeRegistryChange`; outcomes IPC |
| `autobyteus-web/electron/nodeRegistryStore.ts`, `types/node.ts` | change | keep `autoUpdate: true` on load (remote only); new change type |
| `autobyteus-web/stores/appUpdateStore.ts` | change | `automaticUpdate`, `setAutomaticUpdate` |
| `autobyteus-web/stores/updateNotificationsStore.ts` | change | app row `outcome`, `outcomeReason`; unread for waiting or AUTO_UPDATED |
| `autobyteus-web/stores/nodeAutoUpdateStore.ts` | new | the renderer view of node outcomes and the switch action |
| `autobyteus-web/components/notifications/AutoUpdateSwitch.vue` | change | `kind: 'app'`: value and save from `appUpdateStore`; no confirmation; the checks-off note from `appUpdate.autoCheck` |
| `autobyteus-web/components/notifications/NotificationSection.vue`, `NotificationRow.vue` | change | the app section shows the switch (desktop only); app row automatic outcome text and new dot |
| `autobyteus-web/components/settings/AboutSettingsManager.vue` | change | the app switch beside the channel |
| `autobyteus-web/components/settings/nodes/NodeServerUpdate.vue` | change | the node switch (when `inPlaceUpdate === 'available'`) and the outcome line |
| `autobyteus-web/localization/messages/*/updateNotifications.ts` (and the nodes messages) | change | labels and explanations: "Install new versions on your channel as soon as they are downloaded. The app restarts by itself." / "Keep this node on this app's version." |
| `autobyteus-web/docs/settings.md` | change | rewrite the "never the app" section; Nodes section: the node switch |

## Change Sequence
1. Types, the automatic store and the record (with unit tests for reconcile, gate and the tolerant read).
2. `AppUpdater` hooks and IPC (unit tests with a mocked `autoUpdater`: check → download → install; switch off; gate;
   a download error retries at the next check; an install error blocks that version).
3. The node record, the decision, the client and the updater (unit tests for every row of step 3 and step 2, and for
   409, timeout and follow).
4. Registry change and loader; electronApplication wiring.
5. Renderer stores, the switches and the rows; docs.

## Tradeoffs And Risks
- **Immediate restart while the user works** (DEC-001 = A, the user's choice). The busy-agent effect is covered by 285.
  Text typed but not sent in a window is lost; the switch's explanation says the app restarts by itself.
- **Install loop.** Bounded by `blocksAutomatic` (once per version).
- **Node loop.** Bounded by one attempt per version per node.
- **Version source.** The node target is `app.getVersion()`, the same version the renderer offers today (F-03). A
  desktop on an older version than a node never requests (`relation` check).
- **Unpackaged builds** never act (packaged gate), the same rule `downloadUpdate()` already applies.

## Validation Guidance
Per `TESTING.md`, on separate test data only:
- unit tests as in the change sequence;
- packaged-app E2E with the existing test feed (`profile.testUpdateFeedUrl`, REQ-019 of the update ticket): switch
  off → nothing (AC-001); switch on → downloaded, installed, relaunched on V2 with the row "Updated automatically to
  V2" (AC-002); a broken package → failure row and no repeat (AC-005);
- a real test Docker starter node, older than the packaged app, with a signed package from a local release source as
  in 305 DEL-14: switch on → updated and the row's outcome (AC-004); a trial that rolls back → the failure and no
  repeat; a stopped node → tried again later (AC-005);
- AC-003, if the test feed's V1 already has the recorder (beta.10+);
- a grep or test that no server-side code mentions the new files or fields (AC-006);
- build from a clean clone.
