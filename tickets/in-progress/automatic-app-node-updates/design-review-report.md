# Design Review Report — automatic-app-node-updates (autobyteus-356)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/requirements-doc.md` (Approved, SR-002; DEC-001 = A by the user)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/investigation-notes.md` (F-01–F-12)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/design-spec.md` (SR-002, Ready; user approval of the design: `Not required`, with a reason)
- Supplemental Task Artifacts Reviewed: `follow-ups.md` (FU-001, FU-002); `handoff.md`.
- Relevant Solution Revision IDs: SR-002
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: SR-002 `Architecture Design Complete` (Medium/High) from `/software_engineering_team/solution_designer`, 2026-11-01.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `codex/automatic-app-node-updates` @ `099ae1031f` (docs only on `origin/personal` @ `3b9dc912a1`). Code opened at the cited lines:
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

- Overall Basis Status: `Confirmed`. The approved intent is clear and the current code matches the design's reads. One failure path that REQ-004 governs is missing from the target path (AR-001).
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
- Every prospective blocking `Design Impact` finding is traceable to an approved ID: `Yes` (AR-001 → REQ-004, AC-005; AR-002 → REQ-002, REQ-004).
- Statements about existing code the design relies on: all opened and correct. The three read most closely:
  - `allowDowngrade = false` per check;
  - `relation` from the starter;
  - the record's reconcile.
  - The design's "install that throws in this process (the `installUpdateAndRestart` catch)" is correct as far as it goes. It does not cover a native install failure that arrives later through the `error` event (AR-001).

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass (F-02, F-08) | Pass for the found → download → install path. **Fail** for an install that fails after `prepareForInstall` (AR-001), and for a switch-on with a staged update whose status moved on (AR-002) | Needs Correction | AR-001, AR-002 |
| BEH-002 | User | Pass | Pass (F-03, F-11; the route policy) | Pass (DS-003) | Confirmed | — |
| BEH-003 | System | Pass | Pass (F-07, F-09) | Pass, except AR-001's in-process failure | Needs Correction | AR-001 |
| REQ-006 contract | Contract | Pass | Pass (F-12) | Pass (desktop files and desktop IPC only) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None. `follow-ups.md` (FU-001 node rows in the Notification Center, FU-002 a node without a desktop) is consistent.

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
| DS-002 app install and the outcome after restart | Pass | Pass | Pass | Pass | **Fail**: no node for "the install was requested, the server was stopped, and the native install failed in this process" (AR-001) | Pass | Fail |
| DS-003 node update | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

DS-002 as the code would run it with the design's hooks:

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
| `AppUpdater` (the app policy; the automatic path calls its own `downloadUpdate` and `installUpdateAndRestart`) | Pass | Pass | Pass | Pass, with AR-001 | The automatic and click paths cannot diverge, which is good. The owner must also own detection of a failed in-process install |
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
| Record: `recordAutomaticInstall`, `recordAutomaticFailure`, `blocksAutomatic` | Pass | Pass | **Fail**: `blocksAutomatic` ignores an install already requested in this process (AR-001) | Low | Fail |
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
| `app-update-notification.json` + `automatic`, `automaticFailure` | Pass | Pass | Pass | N/A | Pass, with AR-001 | `automatic` must be cleared, or turned into a failure, in this process when the install fails (AR-001), and written only when the install request is accepted (AR-002) |
| `node-auto-updates.json` entries | Pass | Pass | Pass | N/A | Pass | `PENDING`, `AUTO_UPDATED` and `AUTO_FAILED` each have a single meaning. The 30-minute rule comes after the `version === V` check |
| `NodeEntry.autoUpdate?: true` | Pass | Pass | Pass | N/A | Pass | Remote-only, enforced at the single change point and on load |

- Derived consumers of a changed structure (Principle 11): `Pass`. The app row, `NotificationRow`, `appUpdateStore`, `normalizeLoadedNode`, `applyNodeRegistryChange` and the Nodes row are each listed with a decision.
- Each domain word keeps one meaning (Principle 15): `Pass`. "Automatic run" (app) and "attempt" (node, accepted 202) are defined.

## File Responsibility Mapping Verdict

Pass for all mapped files. `appUpdater.ts` and `appUpdateNotificationRecord.ts` also need AR-001 and AR-002. `electronApplication.ts` needs the hook, if AR-001's fix restores the app by relaunching it.

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
| Steps 1–5 | Pass | Pass | Pass | Pass, with AR-001/AR-002 tests |
| Validation (packaged test feed, a real test Docker node, a clean clone) | Pass | Pass | Pass | Pass. Add the in-process install failure (AR-001); on macOS the app can be run from a read-only location |

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
- Reachability: `Reachable`. The `error` channel exists in code for exactly such failures. The exact macOS trigger is to be shown in validation.

### `P-002`: the switch turns on while an update is staged but the status has moved on (AR-002)

- Related requirement: REQ-002 ("turning the switch on while an update is found or downloaded continues that update"); REQ-004.
- Initiating basis kind: `User`. The user downloads V without installing; a later scheduled check moves `status` to `available` (`update-available` sets `status: 'available'`, while `updateStaged` stays true, `:338-398`); then the user turns the switch on.
- Forward path:
  1. The design: "status `downloaded` or `updateStaged` → `installAutomatically(V)`".
  2. `recordAutomaticInstall(V)` is written first.
  3. `installUpdateAndRestart()` returns `{ accepted: false }`, because the status is not `downloaded`.
  4. `automatic` stays set with no install under way. At the next start, `running === fromVersion` → "The update did not install" → V is blocked although nothing was attempted. If the staged update installed on quit, the outcome would wrongly say "automatically".
- Reachability: `Reachable`. The consequence is low to medium: a wrong failure row, and a version blocked from automatic install.

## Unresolved Approved-Behavior Or Current-State Gaps

None in the requirements basis.

## Review Decision

`Fail`. The design is sound and well bounded:

- the policy sits in front of the existing actions;
- one decision function decides each node;
- a downgrade is impossible from both sides (`allowDowngrade = false` per check; `relation === 'newer'`);
- both switches are desktop-only;
- the persisted data is directly usable.

One REQ-004 failure path is undefined (AR-001), and one switch-on edge leaves a false record (AR-002).

## Findings

### `AR-001` (Medium-High; blocking; Design Impact): an automatic install that fails after `prepareForInstall`, in this process, is not handled

- Protects: REQ-004 ("leaves the old version running"; "not installed automatically again"), AC-005. See P-001.
- Scope status: `Within Approved Scope`. Changes approved behavior: `No`. It implements REQ-004's failure contract for a path the design omits.
- Evidence:
  - `appUpdater.ts:271-279`: `quitAndInstall` is fire-and-forget after the server stop.
  - `:401-403`: async native failures arrive as `error`.
  - DS-002 handles only the catch and the next-start reconcile.
  - `blocksAutomatic` checks only `automaticFailure`.
- Required update. `AppUpdater` drives detection; `ElectronApplication` drives recovery:
  1. From `installAutomatically(V)` until the process quits, any updater `error`, or a bounded wait in which the app does not quit (state the bound), records `automaticFailure(V, 'install', reason)`. It is **never** classified as a download failure, so `automaticVersion` and the install phase are distinct.
  2. `blocksAutomatic(V)` is also true while an automatic install of V was requested in this process. No second automatic install happens before a restart.
  3. **Restore a working old version.** The server was stopped by `prepareForInstall`, and `ApplicationShutdown` is `prepared`. Give `ElectronApplication` one recovery action, through an injected hook such as `onAutomaticInstallFailed`. For example, `app.relaunch()` followed by a normal exit: the start-time reconcile then turns the record into `AUTO_FAILED`, and the server starts as usual. Choose it and state it.
     - Say whether the same recovery applies when `prepareForInstall` rejects with the server confirmed gone. In the automatic case 339's install-after-incomplete-stop applies; a rejection means the exit is unconfirmed. Today's error stays (339 DEC-005), and that is a residual for an unattended run (N-2).
  4. Tests: an `error` after `quitAndInstall` → install failure recorded, no repeat at the next check, the recovery hook called. On macOS, a validation run from a read-only location if feasible.
- Recipient: Solution Designer.

### `AR-002` (Low; fold in; Design Impact): record an automatic install only when the install request was accepted

- Protects: REQ-002, REQ-004 (no false failure; no wrongly blocked version). See P-002.
- Evidence:
  - `installUpdateAndRestart` refuses unless `status === 'downloaded'` (`:259-261`).
  - `updateStaged` stays true while the status can move on (`:387-398`).
  - DS-002 step 1 writes `automatic` before calling it.
- Required update:
  - `installAutomatically` writes `automatic` only after `installUpdateAndRestart()` returns `accepted: true`, or treats `accepted: false` as "not started" and clears it.
  - For a switch-on with `updateStaged` and a status other than `downloaded`, define the path. For example `startAutomatic(V)`: `downloadUpdate()` re-emits `update-downloaded` from the cached file, which then installs.
  - Add a test.
- Recipient: Solution Designer.

## Classification

`Design Impact`.

## Recommended Recipient

`/software_engineering_team/solution_designer`

## Residual Risks

- **N-1 (REQ-006 scope):** the switches are in desktop files and IPC only, so no server, GraphQL, REST or agent tool surface touches them (AC-006 holds). A native agent with a general shell tool can still edit any user file, including these. That is the same for every settings file and outside REQ-006's approved surfaces.
- **N-2:** in an unattended automatic install where `prepareForInstall` rejects because the server's exit is not confirmed (339 DEC-005), the app is left without its server until someone acts. This is rare (a process surviving SIGKILL). It is blocked from repeating by the install failure. State it.
- **N-3:** on Windows or Linux, a native installer that fails *after* the app has quit leaves the app closed, not "the old version running". The start-time reconcile records the failure at the next manual start. This cannot be fixed from inside the app; state it as a residual.
- **N-4:** node passes are sequential with a follow of up to 15 minutes, so many nodes needing updates can take a long time. This is acceptable: there is no overlap, and the 60-minute cadence continues.
- **N-5:** with DEC-001 = A, every beta interrupts busy runs, which resume through 285 (paid turns) and lose unsent typed text. The user accepted this, and the switch text says so.
- **Review focus answered:**
  1. **Loop gates:** the node gate is sound: one attempt per version, an accepted 202, `PENDING` and `AUTO_FAILED` block, and the 30-minute rule comes after the version check. The app gate is sound across restarts, but not within one process (AR-001).
  2. **Start-time reconcile:** correct for an install that quit and relaunched on the old version. It cannot see an install that never quit (AR-001), and it can be fed a false `automatic` (AR-002).
  3. **No downgrade:** confirmed on both sides. `applyChannelPolicy` sets `allowDowngrade = false` before every check and never uses the `channel` setter. The node is requested only on `relation === 'newer'`, computed by the starter.
  4. **REQ-006:** confirmed (N-1). Also confirmed: a main-process C1 client needs no credential the renderer has (`TRUSTED_NETWORK_OWNER` allows the trusted network; mobile credentials are refused).
  5. **Persisted data:** `Directly Usable — No Migration` is justified.

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass`. P-001 and P-002 are `Reachable` and drive AR-001 and AR-002.
- Classification: task_size `Medium`, architectural_risk `High` (agreed).
- Notes: a short re-review is expected after AR-001 and AR-002.
