# Design Spec — managed Ubuntu automatic install and restart (autobyteus-15)

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the Solution Designer within the direction (user informed, 2026-11-21)
- Behavior-defining supplements: None
- User approval of the design: `Not required` (the Task does not ask for it)
- Design status: `Ready`
- Canonical investigation-notes path: `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/managed-ubuntu-auto-restart/tickets/in-progress/managed-ubuntu-auto-restart/investigation-notes.md`
- Authorities read (2026-11-21): `references/architecture-design.md`, `references/design-principles.md`, `references/design-examples.md` (all examples and cases; Examples 7–11 and Cases 1, 4, 5, 9 used), repository `DESIGN.md`, `autobyteus-web/AGENTS.md`, `autobyteus-server-ts/docs/design/node_access_model.md` (NA-1, NA-2, NA-5, NA-6), `GLOSSARY.md` ("Busy run")
- Conflicts or discrepancies: None

## Current-State Read

- Managed Ubuntu updates are split between `AppUpdater` (download, state, IPC; `electron/updater/appUpdater.ts`, 555 lines) and `ManagedUpdateSession`, the sole managed quit/restart owner (`electron/application/managedUpdateSession.ts:28`). A downloaded file is verified and staged by the writer (`stageDownloaded`, `:47`), then `AppUpdater` shows "Ready for your next quit" (`appUpdater.ts:508-511`).
- The automatic policy never installs a managed stage while running: `AppUpdateAutomaticPolicy.downloaded` and `installWhenReady` return early for `managed-quit` (`appUpdateAutomaticPolicy.ts:89,123`). This is the deliberate conservative rule DS-002 of autobyteus-5 (F-04), now replaced by the approved behavior.
- `ManagedUpdateSession.finish(stage, generation, automatic)` (`:96-148`) uses one boolean for four meanings: (1) the switch/blocked-version re-check before activation (`:106`), (2) the outcome record kind (`activating`/`activation-failed`, `:107,118,145`), (3) failure handling (`automatic` throws on an incomplete stop, `:99`; exits 1 on an unknown outcome, `:148`), and (4) the ending (`automatic` quits, `:127`; otherwise writes the reopen indication and exits 76, `:128-137`). Today `automatic` is true exactly for the quit path and false for the click path, so the boolean works only because those two never differ.
- A Quit while a restart is in progress is ignored: `willQuit` prevents it and returns when `intent === 'restart'` (`:85-86`).
- The reopen needs the launcher's restart channel: `claimManagedRestart()` returns `null` when the app was not started by the launcher (`electron/launch-profile/managedRestartChannel.ts:6-27`); then `requestRestart` emits `restart-unavailable` (`managedUpdateSession.ts:74`).
- "Busy" is defined only inside the server's restart recorder: a live run that is `initializing`/`running`, or `idle` with a running background task, plus Codex idle runs whose background tasks are visible only through a bounded inspection at the final write (`autobyteus-server-ts/src/restart-resume/busy-run-recorder.ts:91-134`). It covers the process `AgentRunManager` only; application runs live in the application execution scope's own manager (`application-platform/execution/application-execution-scope-kernel-builder.ts:223`, `application-execution-scope.ts:125-131`).
- Electron main already calls its own embedded node with the launch credential (`electronApplication.ts:424-428`, `nodeAccess/nodeConnectService.ts:57-63`); a new REST route is credentialed by NA-1/NA-2 without a permission row.
- `electron/application/electronApplication.ts` is exactly 500 lines; `appUpdater.ts` is already over the limit.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: about 9 production files changed and 5 added across three existing areas (Electron main updater/application, renderer copy, server busy-run rule and one REST route), all inside existing owners: `ManagedUpdateSession` keeps the managed lifecycle, the server's restart-resume rule becomes reusable, the renderer only changes copy selection. No new subsystem, no persisted data.
- Architectural risk: `High`
- Risk rationale: changes an update lifecycle on the protected installation (an activation and relaunch that now start without a user action), adds concurrency between a timer-driven restart, Quit, switch/channel changes and the click, adds a server REST contract consumed by Electron main, and depends on an assumption to validate on Ubuntu Wayland (ASM-001).
- Escalation trigger: any change to the writer protocol, signing, AppArmor, the launcher or restart channel; persisted data; or Mac/Windows/portable behavior → back to the Solution Designer.

## Architecture Investigation Evidence

Raw evidence rows are in the investigation notes (F-01..F-09, A-F01..A-F08).

| Source | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `managedUpdateSession.ts:85-148` | One `automatic` boolean carries four meanings; Quit ignored during restart | Replace with `{ consent, ending }` (DS-001, DS-003) | — |
| Code | `appUpdateAutomaticPolicy.ts:89,123` | Managed mode excluded from automatic install | Session owns managed timing; policy keeps excluding managed modes | — |
| Code | `busy-run-recorder.ts:91-134` | Busy rule lives inside the recorder | Extract to one owner used by recorder and the new count (DS-002) | — |
| Code | `application-execution-scope.ts:125-131`; `application-platform-runtime-contracts.ts:72` | Application runs are in a separate manager, exposed only as `countByRuntimeKind` | Add a busy count to that contract | — |
| Code | `electronApplication.ts:91-97,424-428`; `nodeConnectService.ts:57-63` | Main constructs the session; holds the launch credential for its own node | Busy query from main with the launch credential; session composition moved to its own file | — |
| Contract | Electron 42 `webContents` `input-event` (typings `electron.d.ts:17011`, `InputEvent.type` includes `mouseMove`, `keyDown`, `mouseWheel`, touch) | In-app input visible from main for every web contents | `UserInputActivity` via `app.on('web-contents-created')` | ASM-001 on Wayland: API/E2E observes it in the guest |
| Doc | `node_access_model.md` NA-1, NA-2 | A new endpoint needs a credential and is open to owners and phones without listing | No permission row; follows the model | — |
| Code | `managedRestartChannel.ts:6-27` | Restart channel null when not launched by the launcher | `activationMode: 'managed-quit'` then; automatic restart never starts | — |

## Intended Change

On managed Ubuntu with the switch on, a verified stage is installed through the existing restart path, started by a new safe-moment watcher instead of a click, once no run is busy and the app has had no input for 5 minutes. A Quit during any restart in progress ends closed. Copy follows a new activation mode.

## Change Scope (Mandatory)

- In scope: UC-001..UC-004. Electron main: managed session lifecycle, safe-moment watcher, input activity, busy-run query, composition of the managed updates; `AppUpdater` activation mode and ready message; automatic policy's activation type. Server: busy-run rule extraction, application busy count, `GET /rest/busy-runs`. Renderer: copy selection in three components, two locale catalogs. Docs: `autobyteus-web/docs/linux-managed-desktop.md`, `GLOSSARY.md` ("Busy run", new "Safe restart moment").
- Derived consumers: `AppUpdateState.activationMode` gains `managed-restart`. Readers and decisions: `AutoUpdateSwitch.vue:91` (explanation key: new keys for `managed-restart`), `NotificationRow.vue:98` (downloaded text), `AboutSettingsManager.vue:257` (downloaded message), `stores/appUpdateStore.ts:28,110,271` (passes through; no logic), `appUpdateAutomaticPolicy.ts` (excludes every managed mode), `appUpdater.ts:86` (sets it). The busy-run rule's readers: `BusyRunRecorder` (tick and final list; unchanged output), new count. `applicationPlatform.hostManagement.activeAgentRuns` gains `countBusy`; its existing reader `agent-runtime-status-composition.ts:46` is unchanged.
- Deliberately left alone: writer, signing, release records, AppArmor, systemd socket, launcher and restart channel; `AppUpdateNotificationRecord` (existing outcomes reused); Mac/Windows/portable policy (`AppUpdateAutomaticPolicy` native branches); restart-resume reminders; Docker node and runtime updates; `appUpdater.ts` structure (only two lines change; no growth).
- Follow-ups: FU-001 (Mac timing question).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior And Evidence | Approved Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001/002/003/007/008, AC-001/002/003/007/008/009/011 | Check finds a newer release; switch on; launched by the launcher | Stage then "Ready for your next quit" (F-01, F-02) | Watch for safe moment, then automatic restart | DS-001, DS-002, DS-004 |
| BEH-002 | User | REQ-004, AC-004 | Quit | Quit installs and stays closed; ignored during restart | Unchanged; Quit during a restart ends closed | DS-003 |
| BEH-003 | User | REQ-005, AC-006 | Click Install and restart | Manual restart | Unchanged; also cancels the watch | DS-001 (manual consent) |
| BEH-004 | User | REQ-006, AC-005 | Switch off / channel change | Stage discarded | Unchanged; cancels the watch | DS-001 |
| BEH-005 | System | REQ-009, AC-010 | Mac/Windows/portable | Install at once | Unchanged | — |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Current design issue found: `Yes`
- Structural triggers:
  - **Behavior by absence / overloaded flag (Principle 13):** `finish(..., automatic)` decides ending, failure handling and consent by one boolean that only happens to coincide today (`managedUpdateSession.ts:99,106,127,148`). An automatic restart would break that coincidence. Response: two explicit fields, `consent: 'automatic' | 'manual'` and `ending: 'quit' | 'reopen'`.
  - **Derived data (Principle 11):** "busy" would be computed in two places (recorder and the new count). Response: one owner, `busy-runs.ts`.
  - **Several kinds (Principle 1):** busy runs exist in the process manager and in the application scope's manager. Response: both counted; traced in DS-002.
  - **Responsibility overload / size (Principle 12):** `electronApplication.ts` at 500 lines would grow with new wiring. Response: managed-update composition moves to `managedUpdates.ts`, so the root shrinks.
  - **Hidden dependency (Principle 16):** none added; every new owner receives its collaborators by constructor from `composeManagedUpdates`, called from the composition root. The server count reads `AgentRunManager.getInstance()` in the composition file, as `agent-runtime-status-composition.ts:20-27` already does (an existing process singleton fixed before the routes register).
  - **Empty indirection (Principle 13):** `fetchBusyRunCount` is a function at a real I/O boundary (HTTP); `SafeRestartMoment` owns timing policy; no port or wrapper is added.
  - Ruled out: persisted-data transition (no stored shape changes), ambiguous boundary (count route takes no selector), shared folder (none).
- Deliberate deviations: None.
- Root cause classification: `Boundary Or Ownership Issue` (the ending/consent conflation) on top of an intentional policy change.
- Refactor needed now: `Yes` (the flag split and the busy-rule extraction; both small and required by the new path).
- Evidence: cited above.
- Design response: DS-001..DS-004 below.
- Refactor rationale: without the split, an automatic restart would either quit instead of reopening or skip the switch re-check; without the extraction, two busy rules drift.
- Intentional deferrals: `appUpdater.ts` stays over 500 lines (pre-existing; the change does not grow it). Not recorded as a follow-up here because no new evidence beyond the known size exists.

## Terminology

- **Busy run:** a live agent run that is mid-turn (`initializing` or `running`) or has a running background task. Generalizes the glossary's restart-record definition; the glossary entry is updated.
- **Safe restart moment:** no busy run on the app's own node and no keyboard/mouse/touch input in any AutoByteus window for 5 minutes.
- **Consent:** why a managed activation may happen: `automatic` (the switch; re-checked before activation) or `manual` (the click).
- **Ending:** what follows a managed activation: `quit` (stay closed) or `reopen` (launcher reopens).
- **Activation mode** (`AppUpdateState.activationMode`): `native`; `managed-restart` (managed, launcher restart channel present: automatic updates reopen by themselves); `managed-quit` (managed, no restart channel: automatic updates wait for the next quit).

## Section Fill Order

Followed.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: the boolean `automatic` parameter of `finish`; the rule "an update never initiates a quit or reopen" in docs; the managed copy that promises no reopen when a reopen will happen.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Decision: `Not Affected`. The update notification record already stores automatic install, automatic failure and block (`appUpdater.ts:513,521`); no field or file changes. Settings (switch, channel) unchanged.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-003, BEH-004 | Writer reports a verified stage | Launcher reopens the new version | `ManagedUpdateSession` | The automatic restart itself |
| DS-002 | Primary End-to-End | BEH-001 | Safe-moment check | Busy-run count returned | `SafeRestartMoment` (asker), server busy-run owner (answer) | Defines "no agent working" across both run managers |
| DS-003 | Return-Event | BEH-002 | User Quit during wait or restart | App closed, stage activated | `ManagedUpdateSession` | Quit stays closed |
| DS-004 | Bounded Local | BEH-001 | Watch armed | Callback or cancel | `SafeRestartMoment` | The waiting loop |

## Primary Execution Spine(s)

- DS-001: `Writer stage receipt -> ManagedUpdateSession (pending stage) -> SafeRestartMoment.watch -> [safe] -> ManagedUpdateSession.restartAutomatically -> ApplicationShutdown.stop -> Writer.activate -> restart channel 'R' -> app.exit(76) -> Launcher reopens fixed AppImage -> AppUpdater on next launch shows "Updated automatically to <version>"`
- DS-002: `SafeRestartMoment -> fetchBusyRunCount (HTTP, launch credential) -> GET /rest/busy-runs -> busy-runs count composition -> countBusyRuns(process AgentRunManager) + application scope countBusy -> busy-runs.ts rule`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Governing Owner | Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | When a stage is ready and the switch is on and the restart channel exists and the version is not blocked, the session arms the watch. When the watch reports a safe moment, the session re-checks everything (same stage and generation, no intent, switch on, channel, not blocked), sets intent `restart` with `consent: automatic, ending: reopen`, emits `activating` (automatic record), stops the server, activates, and hands back to the launcher. Any invalidation (new download, switch off, channel change, blocked version, click, quit) cancels the watch | Session, writer, launcher | `ManagedUpdateSession` | `SafeRestartMoment`, `ApplicationShutdown`, restart channel |
| DS-002 | The watch asks the embedded node how many runs are busy; the route sums the process manager's busy runs and the application scope's, using the one busy rule (with the bounded Codex inspection). An unreachable node, a missing credential or any error answers "unknown", which counts as busy | Watch, route, rule | Server busy-run rule owns the fact | Launch credential |
| DS-003 | A Quit while waiting takes today's quit path (activate if the switch is on, stay closed). A Quit while a restart is in progress sets `quitRequested`; before the reopen indication is written the session quits instead (`passQuit`, `quit()`); the activation already done stands | Session | `ManagedUpdateSession` | — |
| DS-004 | See bounded local spine below | Watch | `SafeRestartMoment` | Timers, input activity, busy query |

## Spine Actors / Main-Line Nodes

`ManagedUpdateSession`, `SafeRestartMoment`, writer client (`LinuxManagedInstall`, unchanged), restart channel (unchanged), `GET /rest/busy-runs` route, busy-run rule.

## Ownership Map

- `ManagedUpdateSession`: managed stage, generation, intent (`quit`/`restart`/`failed-restart`), `quitRequested`, consent and ending of the activation in flight; arms and cancels the watch; all re-checks before activation.
- `SafeRestartMoment`: the waiting policy only (quiet period 5 min, recheck interval 30 s, "unknown counts as busy"); one watch at a time; never starts an activation itself, only notifies.
- `UserInputActivity`: time of the last in-app input.
- Busy-run rule (`agent-execution/services/busy-runs.ts`): what a busy run is, including the bounded background-task inspection.
- Route `api/rest/busy-runs.ts`: HTTP boundary only.
- `AppUpdater`: unchanged ownership; sets `activationMode` from `session.canReopen`.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner | Why | Must Not Own |
| --- | --- | --- | --- |
| `api/rest/busy-runs.ts` route | busy-run count composition | HTTP boundary | The busy rule |
| `composeManagedUpdates` | `ManagedUpdateSession` | Composition (keeps the root under the size limit) | Policy |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `finish(stage, generation, automatic: boolean)` | Conflates four meanings | `finish(stage, generation, { consent, ending })` | Clean cut; all callers inside the session |
| Inline busy predicate and inspection in `BusyRunRecorder.entries()` / `withInspectedBackgroundTasks` | Second derivation once the count exists | `busy-runs.ts` | Recorder keeps placement and record writing |
| Managed-session construction block in `ElectronApplication` constructor (`electronApplication.ts:89-97`) | Moves | `composeManagedUpdates` | — |
| Docs sentence "An update never initiates this quit or reopens the app" (`docs/linux-managed-desktop.md`) | Untrue after the change | New paragraph | — |
| Message string `'Ready for your next quit.'` in `appUpdater.ts:427,510` | Mode-specific text belongs to renderer copy | `'Update ready.'` | Renderer chooses localized text |
| Tests asserting a managed stage never restarts by itself (`managedUpdateSession.spec.ts`, `appUpdater.spec.ts` managed cases, `NotificationCenter.appAutomatic.spec.ts` managed copy) | Behavior replaced | Rewritten to the approved behavior | Ticket-scope rule: stale tests rewritten |

## Return Or Event Spine(s) (If Applicable)

DS-003 above. Session events to `AppUpdater` are unchanged in shape (`ready`, `activating`, `activation-failed`, `stage-gone`, `invalidated`, `restart-write-failed`); `activating`/`activation-failed`/`stage-gone` carry `automatic: true` for an automatic restart, so the existing record and copy apply.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `SafeRestartMoment`
- `watch(onSafe) -> check: quiet = now - lastInputAt >= 5 min? no -> timer(lastInputAt + 5 min) -> check | yes -> busy count -> (null or > 0) -> timer(30 s) -> check | 0 -> onSafe()`; `cancel()` clears the timer and drops the callback; a busy query in flight whose watch was cancelled is ignored (watch token).
- Why: this loop is the "deferral during work" the Task asks to verify.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| `UserInputActivity` | DS-004 | `SafeRestartMoment` | Last input time from all web contents | Quiet-period signal | Session would hold Electron input wiring |
| `fetchBusyRunCount` | DS-002 | `SafeRestartMoment` | HTTP call, timeout 5 s, null on failure | I/O boundary | Timing policy would mix with HTTP |
| Restart channel, writer, `ApplicationShutdown` | DS-001 | Session | Unchanged | — | — |

## Ownership Boundaries

- Managed activation authority stays in `ManagedUpdateSession`; `SafeRestartMoment` cannot activate, and `AppUpdater`/renderer cannot start an automatic restart (no IPC added).
- The busy fact is the server's; Electron main only reads the count.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `ManagedUpdateSession` | stage, generation, intent, writer calls | `AppUpdater`, `ElectronApplication` (`willQuit`) | `SafeRestartMoment` or `AppUpdater` calling the writer | Add a session method |
| `GET /rest/busy-runs` | run managers, busy rule | Electron main | Main reading `busy-runs.json` | Extend the response |

## Dependency Rules

- `composeManagedUpdates` (called in `ElectronApplication` constructor) creates, in order: writer (`detectLinuxManagedInstall`), restart channel (`claimManagedRestart`), `UserInputActivity` (installed immediately, before any window), `SafeRestartMoment({ lastInputAt, busyRunCount, timers, now })`, `ManagedUpdateSession({ ..., restartMoment })`. All constructor-passed.
- `busyRunCount` is a closure over `ElectronApplication`'s embedded base URL and `serverManager.getLaunchOwnerCredential()`; it is evaluated per call, so a server restart's new credential is used.
- Server: `composeBusyRunCount({ application: hostManagement.activeAgentRuns })` in `compositions/`, passed into `registerRestRoutes` dependencies. It reads `AgentRunManager.getInstance()` per call, like `agent-runtime-status-composition.ts:20-27`; the singleton exists before routes register and a missing one throws.
- `SafeRestartMoment` must not import Electron or the session; the session must not import `fetch` or Electron input APIs.
- Process-wide bindings added: `None`.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `GET /rest/busy-runs` → `200 { count: number }` | busy runs of this node | Count | none | Owners and phones (NA-2); no secret in the answer |
| `countBusyRuns(manager, inspectionBudgetMs): Promise<number>` and `busyStatusOf(run)` (`busy-runs.ts`) | busy rule | Rule and count | a run manager | Recorder uses `busyStatusOf` and the inspection; count uses both |
| `activeAgentRuns.countBusy(): Promise<number>` (application platform host contract) | application runs | Count | none | Implemented by `ApplicationExecutionScope.countBusyAgentRuns` |
| `SafeRestartMoment.watch(onSafe)`, `.cancel()` | waiting | Notify once at a safe moment | none | One watch at a time |
| `UserInputActivity.lastInputAt(): number` | input time | Read | none | Starts at construction time |
| `ManagedUpdateSession.canReopen: boolean` | restart channel presence | Read | none | For `activationMode` |
| `fetchBusyRunCount(baseUrl, credential): Promise<number \| null>` | HTTP boundary | Query | base URL + credential | null = unknown |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguous Selector Risk | Action |
| --- | --- | --- | --- | --- |
| `GET /rest/busy-runs` | Yes | Yes (none) | Low | — |
| `countBusyRuns` | Yes | Yes | Low | — |
| `watch/cancel` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Same Meaning Everywhere? | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| Busy run | `busy-runs.ts`, `/rest/busy-runs`, `countBusy` | Yes | Yes after glossary update | Low | Update `GLOSSARY.md` "Busy run" to the general meaning; restart record uses it |
| Safe restart moment | `SafeRestartMoment` | Yes | New; add to glossary | Low | Add entry |
| Activation mode | `managed-restart` / `managed-quit` | Yes | `managed-quit` keeps its meaning "installs only at quit" | Low | — |
| Consent / ending | `consent`, `ending` | Yes | Session-local | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Activation, relaunch, failure outcomes | `ManagedUpdateSession`, writer, restart channel | Extend | Same path as the click |
| Outcome rows and blocks | `AppUpdateNotificationRecord` | Reuse | Automatic outcomes exist |
| Busy definition | restart-resume recorder | Extend (extract) | One rule |
| Own-node HTTP with credential | `nodeAccess` launch credential | Reuse | Already held by main |
| Waiting timer | none for managed | Create New (`SafeRestartMoment`) | Native readiness wait (`AppUpdateInstallReadiness`) waits for Squirrel, a different concern |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spine | Decision |
| --- | --- | --- | --- |
| `autobyteus-web/electron/application/` | session, managed composition, input activity | DS-001, DS-003 | Extend |
| `autobyteus-web/electron/updater/` | safe moment, activation mode, policy type | DS-001, DS-004 | Extend |
| `autobyteus-web/electron/server/` | own-node busy query | DS-002 | Extend |
| `autobyteus-server-ts/src/agent-execution/services/` | busy rule | DS-002 | Extend |
| `autobyteus-server-ts/src/api/rest/`, `compositions/` | route, count composition | DS-002 | Extend |
| `autobyteus-server-ts/src/application-platform/` | application busy count | DS-002 | Extend |
| renderer components and localization | copy | — | Extend |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (no change after the shared-structure check).

## Reusable Owned Structures Check

| Repeated Logic | Shared File | Owner | Why | Redundant Removed | Overlap Removed | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Busy predicate and Codex background inspection | `autobyteus-server-ts/src/agent-execution/services/busy-runs.ts` | agent execution | Recorder and count must agree | Yes | Yes | A placement or record writer |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning? | Redundant Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `{ count: number }` | Yes | Yes | Low | — |
| `AppUpdateActivationMode` | Yes | Yes | Low | Export the union from `shared/appUpdateTypes.ts`; policy imports it |

## Final File Responsibility Mapping

| File | Area | Owner | Concern | Change |
| --- | --- | --- | --- | --- |
| `autobyteus-web/electron/application/managedUpdateSession.ts` | application | `ManagedUpdateSession` | Managed lifecycle incl. automatic restart, watch arming, Quit during restart | Modify |
| `autobyteus-web/electron/application/managedUpdates.ts` | application | composition | `composeManagedUpdates(...)`: writer detection, restart channel, input activity, safe moment, session | Add |
| `autobyteus-web/electron/application/userInputActivity.ts` | application | `UserInputActivity` | Last in-app input time | Add |
| `autobyteus-web/electron/application/electronApplication.ts` | application | composition root | Calls `composeManagedUpdates`; provides `busyRunCount` closure | Modify (net shorter) |
| `autobyteus-web/electron/updater/safeRestartMoment.ts` | updater | `SafeRestartMoment` | Waiting loop | Add |
| `autobyteus-web/electron/server/embeddedBusyRuns.ts` | server (main side) | function | `fetchBusyRunCount` | Add |
| `autobyteus-web/electron/updater/appUpdater.ts` | updater | `AppUpdater` | `activationMode` from `canReopen`; neutral ready message | Modify (no growth) |
| `autobyteus-web/electron/updater/appUpdateAutomaticPolicy.ts` | updater | policy | `activation` typed `AppUpdateActivationMode`; managed exclusion `!== 'native'` | Modify |
| `autobyteus-web/shared/appUpdateTypes.ts` | shared | contract | `AppUpdateActivationMode = 'native' \| 'managed-restart' \| 'managed-quit'` | Modify |
| `autobyteus-web/components/notifications/AutoUpdateSwitch.vue`, `NotificationRow.vue`, `components/settings/AboutSettingsManager.vue` | renderer | components | Copy key by mode | Modify |
| `autobyteus-web/localization/messages/{en,zh-CN}/updateNotifications.ts` | localization | catalogs | New keys `app.readyToRestart`, `auto.explain.managedRestartApp`, `auto.explainOn.managedRestartApp` | Modify |
| `autobyteus-server-ts/src/agent-execution/services/busy-runs.ts` | agent execution | rule | `busyStatusOf`, `inspectIdleBackgroundTasks`, `countBusyRuns` | Add |
| `autobyteus-server-ts/src/restart-resume/busy-run-recorder.ts` | restart resume | recorder | Uses the rule; placement and writing unchanged | Modify |
| `autobyteus-server-ts/src/application-platform/execution/application-execution-scope.ts`, `runtime/application-platform-runtime-contracts.ts`, `runtime/build-application-platform-runtime.ts` | application platform | scope / contract | `countBusyAgentRuns()` / `activeAgentRuns.countBusy()` | Modify |
| `autobyteus-server-ts/src/compositions/busy-run-count-composition.ts` | compositions | composition | process + application sum | Add |
| `autobyteus-server-ts/src/api/rest/busy-runs.ts`, `api/rest/index.ts`, `compositions/build-studio-server.ts` | REST | route | `GET /busy-runs`; dependency wiring | Add / Modify |
| `autobyteus-web/docs/linux-managed-desktop.md`, `GLOSSARY.md` | docs | — | Behavior and terms | Modify |

## Applied Patterns (If Any)

- Bounded timer loop inside `SafeRestartMoment` (DS-004). Explicit state (`intent`, `quitRequested`) in the session, not a generic state-machine framework.

## Target Subsystem / Folder / File Mapping

As the Final File Responsibility Mapping; no new folders.

## Folder Boundary Check

| Folder | Depth | Clear? | Risk | Note |
| --- | --- | --- | --- | --- |
| `electron/application/` | Main-line control + composition | Yes | Low | Existing home of the session |
| `electron/updater/` | Off-spine timing | Yes | Low | Sits beside the native readiness wait |
| `electron/server/` | Off-spine I/O to own node | Yes | Low | Existing home of server manager and health checker |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Activation parameters | `finish(stage, gen, { consent: 'automatic', ending: 'reopen' })`; quit path `{ consent: 'automatic', ending: 'quit' }`; click `{ consent: 'manual', ending: 'reopen' }` | `finish(stage, gen, automatic)` plus a second boolean `reopen` | Each check reads the one field it means (`ending` for stop-failure tolerance, exit code and reopen; `consent` for the switch/block re-check and the record kind) |
| Safe callback | `moment.watch(() => this.restartWhenStillValid(stage, generation))` with the session re-checking | moment calling `writer.activate` or `requestRestart()` | Activation stays in one owner; a stale callback cannot act |
| Quit during restart | `willQuit`: `if (intent === 'restart') { quitRequested = true; return }`; before `requestReopen()`: `if (quitRequested) { passQuit = true; quit(); return }` | Ignoring the Quit, or cancelling the activation already dispatched | Quit stays closed; activation is not interrupted midway |
| Unknown busy state | `null` → wait 30 s | `null` → treat as idle | Never restart on missing evidence |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep quit-only as an option | Earlier behavior | Rejected | Switch on = automatic restart; switch off = manual |
| Keep `automatic` boolean beside new fields | Smaller diff | Rejected | Clean split |
| Main reads `busy-runs.json` | No server change | Rejected | Route; the record excludes application runs and is a restart-reminder file |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Server: add `busy-runs.ts`; move the recorder onto it (recorder tests stay green); add application `countBusy`; add composition and route; route test.
2. Electron: split `finish` parameters (existing session tests green with the same outcomes); add `UserInputActivity`, `SafeRestartMoment`, `fetchBusyRunCount`; add watch arming, `restartAutomatically`, `quitRequested`, `canReopen`; add `composeManagedUpdates` and slim the root; `activationMode` and policy type.
3. Renderer copy and locales; docs and glossary.
4. Rewrite stale managed tests; add new owner tests (AC-001..AC-008).
5. API/E2E: managed Ubuntu guest (AC-011).

## Key Tradeoffs

- Polling the busy count every 30 s (only while a stage waits) vs a server push: polling is simple, bounded and only active during the wait.
- 5-minute quiet period is fixed, not a setting (DEC-001).
- A run that turns busy in the milliseconds between the last check and the stop is not prevented; the existing restart recorder records it and resumes it after the update (autobyteus-285), so it is not lost.

## Risks

- ASM-001: input events from every window kind on Ubuntu Wayland; validated in the guest. If some view does not report input, the busy check still protects agent work; typing loss would remain possible only in that view.
- The safe moment can be reached while the screen is locked; that is intended (the user is away).
- `restart-write-failed` after activation leaves the app open with the server stopped and an error box, as for the click today; rare (launcher channel failure).

## Guidance For Implementation

- Reproduction to start from: `None` (behavior change). Start from `electron/application/__tests__/managedUpdateSession.spec.ts`: add failing cases for "ready + switch on + safe → activates and reopens (exit 76, automatic record)", "quit during automatic restart → quit, no reopen", "switch off before safe → no activation".
- Re-check in the safe callback: same `stage` object and `generation`, `intent === null`, `requestReopen` present, `lastSettings.automaticUpdate`, `stage.channel === lastSettings.updateChannel`, version not `automaticInstallBlockedVersion`. Any failure: do nothing (the watch is cancelled already by the invalidating event).
- Arm the watch: after `ready` (when the switch is on), in `settingsChanged` when the switch turns on with a pending stage, never when `requestReopen` is null. Cancel on: `stageDownloaded` start, invalidation, `requestRestart`, `willQuit`, block of the pending version.
- `finish` for `ending: 'reopen'`: accept an incomplete stop when the server is gone (as the click today) for both consents; keep `ending: 'quit'` throwing.
- `SafeRestartMoment` constants: `SAFE_RESTART_QUIET_MS = 5 * 60_000`, `SAFE_RESTART_RECHECK_MS = 30_000`; injectable timers and clock for tests.
- `fetchBusyRunCount`: `GET ${baseUrl}/rest/busy-runs` with `authorization: Bearer <launch credential>`, `AbortSignal.timeout(5000)`; anything but `200 { count: integer >= 0 }` → `null`; no credential → `null`.
- Busy count on the server uses the same bounded inspection budget as the recorder's final write (1 s).
- Copy (DEC-006), English: switch off `Download and verify new versions on your channel, then install them and reopen AutoByteus by itself when no agent is working and you haven't used the app for 5 minutes.`; switch on `New versions install and AutoByteus reopens by itself when no agent is working and you haven't used the app for 5 minutes, or when you next quit. Switch off to update by hand.`; row/About `Ready. AutoByteus reopens on the new version by itself when no agent is working and you haven't used it for 5 minutes.` Simplified Chinese equivalents. `managed-quit` keeps today's keys.
- Keep `appUpdater.ts` line count from growing; keep `electronApplication.ts` at or below 500.
