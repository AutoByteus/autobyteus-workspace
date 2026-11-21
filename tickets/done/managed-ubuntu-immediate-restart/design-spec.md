# Design Spec — managed Ubuntu restarts as soon as ready (autobyteus-16)

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements: `requirements-doc.md` SR-001, Solution Designer within the user's direction (user informed, 2026-11-21)
- Supplements: None
- User approval of the design: `Not required`
- Design status: `Ready`
- Investigation notes: `investigation-notes.md` (this folder)
- Authorities read (2026-11-21): `references/architecture-design.md`, `references/design-principles.md`, `references/design-examples.md`, repository `DESIGN.md`, `autobyteus-web/AGENTS.md`
- Conflicts or discrepancies: None

## Current-State Read

autobyteus-15 placed all managed activation authority in `ManagedUpdateSession`. Its `watchForRestart()` checks `eligible()` (same stage and generation, restart channel, `intent === null`, no latched Quit, switch on, channel matches, version not blocked) and hands a callback to `SafeRestartMoment.watch`, which waits for 5 quiet minutes and a `{ busy: 0, unknown: 0 }` answer from `GET /rest/busy-runs`; the callback re-checks `eligible()` and calls `finish(stage, generation, { consent: 'automatic', ending: 'reopen' })` (F-02). The wait's supporting parts are listed in F-01. The Quit latch, settlement, failure handling and the click do not depend on the wait. `AppUpdater` shows `installing` only at the session's `activating` event for an automatic restart (F-08).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: mostly removal across Electron main (3 files deleted, 3 modified), server (2 files deleted, 6 modified), renderer copy (3 components, 1 util, 2 catalogs), docs and tests. The only behavior change sits in one existing owner, `ManagedUpdateSession`, plus one event in `AppUpdater`.
- Architectural risk: `Low`
- Risk rationale: no new owner, contract, persistence, privilege or concurrency mechanism. The automatic restart reuses the reviewed admission checks, Quit latch and settlement of autobyteus-15 unchanged; only the wait between `eligible()` and `finish` is removed. A REST route used only by Electron main of the same release is removed (DESIGN.md rule 9: clean cut). The restart notice path is the existing, platform-independent restart-resume (F-05), validated on the guest.
- Escalation trigger: any change to the Quit latch, settlement, writer, restart channel, restart-resume or other platforms; or AC-002 failing on the guest because the stamp or the graceful stop differs on managed Ubuntu → back to the Solution Designer.

## Architecture Investigation Evidence

| Source | Observation | Decision |
| --- | --- | --- |
| F-02 / A-F01 | Admission checks complete in `eligible()` | Admit at once on the same checks |
| F-03 / A-F02 | Count functions and `"all"` source only serve the removed route | Remove; recorder keeps `busyStatusOf` and the snapshot inspection |
| F-05 | Restart-resume is platform-independent | No server change for the notice |
| F-08 / A-F03 | Row would read "Downloaded" while the server stops | `restarting` event → `installing` |
| F-07 | Mac's switch copy exists | Reuse Mac's keys |

## Intended Change

Replace the safe-moment wait with an immediate automatic restart at the same admission point; remove the wait and everything only it used; reuse Mac's copy.

## Change Scope (Mandatory)

- In scope: UC-001..UC-003. `ManagedUpdateSession` admission; `composeManagedUpdates` and `electronApplication` wiring; `AppUpdater` `restarting` handling; renderer copy selection; removal list below; docs (`autobyteus-web/docs/linux-managed-desktop.md`, `docs/settings.md`, `docs/electron_packaging.md`), `GLOSSARY.md`.
- Derived consumers: `AppUpdateActivationMode` unchanged. `managedReadyMessageKey` (`utils/managedUpdateReadiness.ts`) read by `NotificationRow.vue:155` and `AboutSettingsManager.vue:258`: for `managed-restart` with the switch on it returns `null` (the row is `installing` during the restart). `AutoUpdateSwitch.vue:93`: `managed-restart` uses the `app` keys. Application platform host contract `activeAgentRuns` loses `inspectBusy` / `finalizeBusy`; its other reader `agent-runtime-status-composition.ts` (uses `countByRuntimeKind`) is unchanged.
- Deliberately left alone: Quit latch and `finish` settlement; failure paths; click; `managed-quit`; restart-resume; busy-run recorder behavior; Mac/native policy; writer and launcher.
- Follow-ups: None.

## Relevant Behavior And Production-Path Map (Mandatory)

| BEH | REQ / AC | Trigger | Change | Path |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001, REQ-005; AC-001, AC-005 | Stage ready, switch turned on, block cleared | Admit at once | DS-001 |
| BEH-002 | REQ-002; AC-002 | Restart while a run is busy | Unchanged server path, now reachable | DS-002 |
| BEH-003 | REQ-003, REQ-004; AC-003, AC-004 | Quit, click, opt-out, failures | Unchanged | autobyteus-15 DS-003 |
| BEH-004 | REQ-006; AC-006 | Native | Unchanged | — |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (with removal)
- Current design issue found: `No`. The owner and admission boundary are right; the wait is removed as approved.
- Structural triggers: **Legacy cleanup (8) / No dead code (7):** the wait's parts become dead → removed (plan below). **Derived data (11):** `busy-runs.ts` keeps one consumer; it stays the single owner of the busy rule used by the recorder. Others (empty indirection, hidden dependency, persisted data) ruled out: nothing is added.
- Deviations: None.
- Root cause classification: `No Design Issue Found`.
- Refactor needed now: `No` (removal only).
- Residual: `appUpdater.ts` stays over 500 lines (pre-existing); the change must not grow it.

## Terminology

- Remove "Safe restart moment" from `GLOSSARY.md`. "Busy run": back to one meaning without the update-safety clause: "a live run that is initializing, running a turn, or has a running background task; the restart reminder records the placed collaboration runs among them (`busy-runs.json`)."

## Legacy Removal Policy (Mandatory)

- Obsolete: the wait and its route (list below).
- Compatibility kept: `None`.

## Persisted Data / State Transition Decision

`Not Affected`.

## Data-Flow Spine Inventory

| ID | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | Writer stage receipt | Launcher reopens N+1 | `ManagedUpdateSession` |
| DS-002 | Primary (existing) | Graceful server stop | Busy run woken with the update notice | Server restart-resume |

## Primary Execution Spine(s)

- DS-001: `Writer stage receipt -> ManagedUpdateSession.stageDownloaded -> emit 'ready' -> restartWhenEligible() -> eligible()? -> intent='restart', emit 'restarting' -> finish(automatic, reopen) -> ApplicationShutdown.stop -> writer.activate -> 'R' -> exit 76 -> launcher -> N+1`
- DS-002: `ApplicationShutdown.stop -> server SIGTERM -> BusyRunRecorder.record() -> busy-runs.json -> N+1 server start -> RestartResumer.takePreviousSession (cause update) -> wake after listening -> run continues`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | `watchForRestart()` becomes `restartWhenEligible()`: called where it is called today (after `ready`, on `settingsChanged`, on `automaticInstallBlockChanged`); if `eligible()` holds, it sets `intent = 'restart'`, emits `{ type: 'restarting' }` and starts `finish` with `{ consent: 'automatic', ending: 'reopen' }` synchronously. Everything after is autobyteus-15's reviewed `finish` | `ManagedUpdateSession` |
| DS-002 | Unchanged server path; the managed restart stops the server gracefully like any quit, so busy runs are recorded and woken after the update | Server |

## Spine Actors / Main-Line Nodes

`ManagedUpdateSession`, `AppUpdater` (event to state), writer, launcher, server restart-resume.

## Ownership Map

- `ManagedUpdateSession`: unchanged ownership; admission no longer delegates timing.
- `AppUpdater`: maps `restarting` to `status: 'installing'` (message "Installing update and restarting..."), as its click path does at acceptance.

## Thin Entry Facades / Public Wrappers

None.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By |
| --- | --- | --- |
| `autobyteus-web/electron/updater/safeRestartMoment.ts` + `__tests__/safeRestartMoment.spec.ts` | Wait removed | Immediate admission |
| `autobyteus-web/electron/application/userInputActivity.ts` (+ its case in `ElectronAutomaticUpdateWiring.spec.ts`) | Input wait removed | — |
| `autobyteus-web/electron/server/embeddedBusyRuns.ts` | Only the wait queried busy runs | — |
| `restartMoment` session option; `busyRuns` option of `composeManagedUpdates`; `busyRuns` closure at `electronApplication.ts:88` | Dead once the wait is gone | — |
| `autobyteus-server-ts/src/api/rest/busy-runs.ts`, its registration and `busyRuns` dependency in `api/rest/index.ts`, `compositions/busy-run-count-composition.ts`, the wiring in `build-studio-server.ts:406` | Route's only client removed | — |
| `inspectBusyAgentRuns`, `finalizeBusyRuns`, `BusyRunCount`, `BUSY_RUN_OBSERVATION_BUDGET_MS`, the `source` parameter's `"all"` branch in `busy-runs.ts` | Dead: only the count used them (F-03) | `inspectBackgroundWork` keeps snapshot-only behavior without a parameter |
| `ApplicationExecutionScope.inspectBusyAgentRuns` / `finalizeBusyAgentRuns`, contract `activeAgentRuns.inspectBusy` / `finalizeBusy`, their wiring in `build-application-platform-runtime.ts` | Dead | — |
| `tests/unit/restart-resume/busy-run-count.test.ts`; the `/rest/busy-runs` case in `restart-reminder-built-server.e2e.test.ts` (and the async `Step` widening if nothing else uses it) | Tests of removed code | Recorder tests unchanged |
| Copy keys `app.readyToRestart`, `auto.explain.managedRestartApp`, `auto.explainOn.managedRestartApp` (en, zh-CN) | Wait copy | Mac's `auto.explain(On).app`; `app.installing` |
| `managedUpdateSession.spec.ts` cases asserting the wait; `NotificationCenter.appAutomatic.spec.ts` "managed safe restart names both conditions…" | Assert removed behavior | Rewritten: restart at readiness, also with a busy agent |
| GLOSSARY "Safe restart moment"; docs paragraphs on the wait (`linux-managed-desktop.md`, `settings.md`, `electron_packaging.md`) | Untrue | Immediate-restart wording |

## Return Or Event Spine(s)

New session event `{ type: 'restarting' }` (no payload) → `AppUpdater` `status: 'installing'`. Existing events unchanged.

## Bounded Local / Internal Spines

None (the wait loop is removed).

## Off-Spine Concerns Around The Spine

None added.

## Ownership Boundaries / Boundary Encapsulation Map

Unchanged from autobyteus-15: only `ManagedUpdateSession` stops, activates or reopens; no renderer or IPC trigger.

## Dependency Rules

`composeManagedUpdates({ shutdown, serverGone, notifyQuit, report })` constructs the session without a moment; `ElectronApplication` no longer reads the launch credential for a busy query. No process-wide bindings added.

## Interface Boundary Mapping

| Interface | Change |
| --- | --- |
| `ManagedUpdateEvent` | `+ { type: 'restarting' }` |
| `ManagedUpdateSession` options | `- restartMoment` |
| `GET /rest/busy-runs` | Removed |
| Application host contract `activeAgentRuns` | `- inspectBusy`, `- finalizeBusy` |

## Interface Boundary Check / Naming Check

Unchanged names; `restartWhenEligible` replaces `watchForRestart` (the method no longer watches).

## Existing Capability Reuse Check

Reuse autobyteus-15 admission/settlement, restart-resume, Mac copy keys, `app.installing`.

## Subsystem Allocation / File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-web/electron/application/managedUpdateSession.ts` | Immediate admission, `restarting` event, drop `restartMoment` |
| `autobyteus-web/electron/application/composeManagedUpdates.ts` | Drop moment and input activity |
| `autobyteus-web/electron/application/electronApplication.ts` | Drop `busyRuns` closure and import |
| `autobyteus-web/electron/updater/appUpdater.ts` | `restarting` → `installing` (no net growth) |
| `autobyteus-web/utils/managedUpdateReadiness.ts` | `managed-restart` + switch on → `null` |
| `autobyteus-web/components/notifications/AutoUpdateSwitch.vue` | `managed-restart` → `app` keys |
| `autobyteus-web/localization/messages/{en,zh-CN}/updateNotifications.ts` | Remove three keys |
| Server files in the removal plan | Remove / trim |
| Tests and docs per removal plan | Rewrite / remove |

## Reusable Owned Structures / Tightness Check

`busy-runs.ts` after trimming: `busyStatusOf`, `inspectBackgroundWork(runs, budgetMs)` (snapshot-only), `BackgroundWorkInspection`; one meaning each.

## Target Folder Mapping / Folder Boundary Check

No new folders; files removed from existing ones.

## Concrete Examples

| Topic | Good | Avoided |
| --- | --- | --- |
| Admission | `private restartWhenEligible(): void { const stage = this.pending, generation = this.generation; if (!stage \|\| !this.eligible(stage, generation)) return; this.intent = 'restart'; this.emit({ type: 'restarting' }); void this.finish(stage, generation, { consent: 'automatic', ending: 'reopen' }) }` | A zero-delay timer or a kept "moment" with no wait (empty indirection) |

## Backward-Compatibility Rejection Log

| Candidate | Decision |
| --- | --- |
| Keep `/rest/busy-runs` for later | Rejected (dead; rule 9 clean cut) |
| Keep the waiting keys | Rejected |

## Change / Refactor Sequence

1. Session: replace the watch with immediate admission; `restarting` event; update session tests (restart at readiness, with the switch turned on later, blocked version, Quit latched before readiness, no restart channel).
2. Remove Electron wait files and wiring; `AppUpdater` event; copy and util; component tests.
3. Remove server route, composition, count functions, application contract methods, their tests; recorder tests stay green.
4. Docs and glossary.
5. Guest validation (AC-007).

## Key Tradeoffs

- Matching Mac means a restart can interrupt typing and application-owned runs; the user chose this (Task direction).

## Risks

- ASM-001 (release stamp in the managed AppImage): if AC-002 fails, the notice says "restart" instead of "update" and busy runs are not woken; escalate (design trigger).

## Guidance For Implementation

- Reproduction: `None` (behavior change). Start from `managedUpdateSession.spec.ts`: "ready + switch on → activates and exits 76 without any wait".
- Keep `finish`, the Quit latch and `eligible()` as they are; only the caller changes.
- `appUpdater.ts`: fold `restarting` into the existing `managedEvent` branches without increasing the line count.
- Copy check: no remaining "5" minutes or idle-agent text in `updateNotifications` catalogs, components or docs for managed Ubuntu.
