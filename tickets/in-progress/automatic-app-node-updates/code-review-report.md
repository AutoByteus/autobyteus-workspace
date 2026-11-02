# Code Review Report — automatic-app-node-updates (autobyteus-356)

All ticket paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/`.

> **Latest round: 6, Implementation Review of IR-004, Targeted Delta Review (CRR-007), `Pass`.** It covers the merge with `personal` after autobyteus-363 (delivery DR-001). Rounds 1 to 5 are kept below. § Round 6 and the Latest Authoritative Result supersede them.

## Round 6 — Targeted Delta Review of IR-004 (CRR-007)

### Meta and scope

- Trigger: implementation engineer, IR-004, a `Local Fix` requested by delivery (DR-001: an integration conflict with autobyteus-363).
  - Merge `08984df524`, parents `b0445f49b9` (356) and `fc5a726444` (`personal` after `v1.5.11-beta.11`).
  - Handoff and evidence `4a591d3159`. The branch is local only.
- Delivery Revision Record reviewed: `delivery-revision-record.md` (DR-001).
- Review Scope: `Targeted Delta Review`.
  - Evidence: the resolved conflict is limited to `components/settings/nodes/NodeServerUpdate.vue`, `NodeAutoUpdate.vue` (layout only), `NodeAutoUpdate.spec.ts` and `docs/settings.md` § Nodes. Read with `git diff fc5a726444 08984df524 -- autobyteus-web/components/settings/nodes autobyteus-web/docs/settings.md`.
  - 356's Electron, store and shared code is unchanged by the merge, apart from unrelated files `personal` brought in (for example the `existingRunConfig*` stores from other tickets), which merged without conflict.
  - No behavior change is claimed (SR-006).
- I reran no checks: the Electron and web suites, both typechecks, IMP-13 and IMP-14 ran on `08984df524`.

### Resolution checked

- **Placement.** `NodeAutoUpdate` sits inside the `part === 'cell'` block of 363's split component, at the foot of the server cell. That is the server column, the subject it controls. 363's `notice` part and copy button are kept as they were.
- **One request per row.** The automatic-change watch now refreshes only when `part === 'cell'`, which matches 363's own rule that the cell owns the node's watch and unwatch (`onBeforeUnmount`). Without the guard, both mounted parts would ask the node, so this is correct.
- **No repeated result.** `autoReported` is still applied in the `notice` computed, so the notice doesn't repeat an automatic outcome. Both parts read the same `autoEntry` from the store, so there is no second derivation.
- **When the cell shows.** 363's cell renders only once the node has answered (`connection !== 'unknown'`), so the switch now appears after the first answer. That is 363's rule for everything in the cell, and it is acceptable. For an unreachable node the cell still renders, and the switch shows when it is on or an outcome exists.
- **`NodeAutoUpdate.vue`:** sizing and class changes only. Conditions, test IDs and the switch's `role="switch"`, `aria-checked`, `aria-labelledby` and `aria-describedby` are unchanged.
- **The spec fix was a real catch.** After 363 made `part` required, the old spec mounted `NodeServerUpdate` without it, so the component rendered nothing and the "no second notice" assertion passed without testing anything. The spec now mounts both parts as the row does, and one new case checks the switch is in the cell and the node is asked once. IMP-13's three mutations of the merged cell are all caught.
- **Docs:** `docs/settings.md` keeps 363's text, and 356's bullet now names the server cell. It matches the code.
- **Rendered (IMP-14):** the switch is in the cell in the medium layout and in the 16rem column of the wide layout. Turning it on runs the main process's update, and the cell then shows "Server 1.5.11-beta.11" with one "Updated automatically" and no notice.

### Candidate gate (round 6)

| Candidate ID | Observation | Disposition | Reason |
| --- | --- | --- | --- |
| CR-C20 | The switch now waits for the node's first answer (363's cell rule) | Reject | It is 363's layout rule, and a node's in-place availability (`canUpdate`) comes from that answer anyway. |
| CR-C21 | The merge brings `personal`'s other tickets' code (for example the run-config stores) | Reject (not this ticket's) | It merged cleanly with no conflict and passes the full suites; delivery's re-verification covers integration. |

### Findings (round 6)

None. Round 5's scores stand (9.4 / 10).

### Follow-ups

None added.

> Round 5 (CRR-005) and earlier rounds are kept below for history.

## Round 5 — Implementation Review of IR-003 (CRR-005)

### Meta and scope

- Trigger: implementation engineer, IR-003 (code `2e64cbb3d9`; handoff and evidence `ed3f0d50f5`, `88814a7182`).
- Basis: design SR-006 (DS-002: on macOS the automatic install starts once Squirrel has its copy), ARCH-REV-005 `Pass`, requirements as sharpened in SR-004.
- Review Scope: **`Full Re-Audit` of DS-001 and DS-002.**
  - Evidence: the delta moves the automatic sequence into a new owner (`AppUpdateAutomaticPolicy`), adds `AppUpdateInstallReadiness`, changes the `error` handler's order, adds a guard to `checkForUpdates` and `downloadUpdate`, and adds shared fields (`automaticInstallPreparing`, `outcomeStep`) and an error kind (`install-preparation`).
  - DS-003 (nodes) is carried forward: the delta doesn't touch it.
- I reran no checks: the suites, the typecheck, IMP-11 and IMP-12 ran on `2e64cbb3d9`.

### Behavior and path, re-verified

**The order (F-API-003).** `update-downloaded` → `downloaded(V)` resets readiness, then `installWhenReady(V)`: it installs at once if ready, otherwise one pending wait with a 15-minute bound. Nothing stops during the wait, so the 60 s bound now measures only the quit: `MacUpdater.quitAndInstall` finds `squirrelDownloadedUpdate` true and calls the native quit directly. Ordering is safe: MacUpdater dispatches `update-downloaded` and only then calls the native `checkForUpdates()` (`MacUpdater.js:219-224`), so a reset can't overwrite that download's answer. Not macOS: `readyFor` is true for the downloaded version, so the order is unchanged.

**How the wait ends** (`appUpdateAutomaticPolicy.ts`, `appUpdateInstallReadiness.ts`):

| End | Result | Verified |
| --- | --- | --- |
| Native `update-downloaded` | Preparing cleared; `installAutomatically` re-reads the switch and the gate | Spec line 98; the real success through the wait is owed |
| Native `error` | `claimError`: `preparationFailed` records `install`, blocks V, no settle, no recovery; state `install-preparation`; `updateStaged: false` | Spec line 131; IMP-12 (two real refusals, health 200, no stop) |
| The 15-minute bound | The same record with its own reason, no recovery; status stays `downloaded`, the click still works | Spec line 171; rendered in a component test only |
| Switch off | Wait dropped, nothing recorded; on again re-enters `installWhenReady` | Spec line 188 |
| A click on Install | `installAccepted()` ends the wait and bound at acceptance, then the manual path | Spec line 219 |

**The `error` order (N-17).** No check or download can run during a wait (`checkForUpdates` and `downloadUpdate` return the state; About's button is disabled), so an `error` during a wait really is this update's preparation. Then:
- both refusal timings hold: read-only (`error`, `error`, rejection) and after the zip was served (one `error`, no rejection, because the promise has resolved at `MacUpdater.js:184-189`);
- `settlingFailedPreparation` is set only while a download is in flight, and `finally` clears it, so a later real error isn't swallowed;
- `recordAutomaticFailure` refuses a `download` failure over `{ V, 'install' }`.

**CR-C12:** the automatic path now records plain reasons. The raw native text goes only to the log, and "Try again" no longer appears for a version that won't be retried (the row adds the not-retried sentence when `outcomeStep === 'install'`).

### The implementer's five departures

1. **`AppUpdateAutomaticPolicy`, not in the design's file map: accepted.** Without it `appUpdater.ts` would pass 500 lines (CR-C7); it is now 472. The owner is clear: the policy owns the automatic sequence, and `AppUpdater` owns the state and the actions a click also runs. The host port is a narrow set of those actions, not a second sequence. The design's file map and § Ownership should be aligned by their owner (`docs/electron_packaging.md:714` already names it).
2. **`lastErrorSignature` not cleared explicitly: accepted.** `applyState` clears it whenever a non-error status is applied, so status `downloaded` clears it before any wait begins, and `claimError` doesn't set it. "A later real error still shows" is tested in both timings.
3. **`outcomeStep` on `AppUpdateNotification`: accepted.** It carries one fact from the record to the row, and it is derived only in `outcomeOf`. The store and row are updated.
4. **The failure box also shows at state `downloaded`: accepted.** The bound's failure would otherwise be invisible.
5. **`AppUpdaterOptions.platform`: accepted.** It is the test seam for the install order, and it defaults to `process.platform`.

### Candidate gate (round 5)

| Candidate ID | Observation | Disposition | Reason |
| --- | --- | --- | --- |
| CR-C15 | The user quits during a wait, and the native event lands within the short stop: the policy still installs, so `quitAndInstall` relaunches an app the user chose to quit | Reject (contrived) | It needs a quit inside the ~1 s stop window of a ~36 s wait, once per release, and two individually supported actions don't establish a workflow (Principle 6). The result is the new version running with an honest row, with no data harm. |
| CR-C16 | A native event from an earlier fetch of V arrives after a newer W was reported, marking W ready | Reject (not reachable) | It needs a check during a wait or a staged state, and checks are blocked during a wait and scheduled checks skip a staged update. Only a switch-off followed by a manual check gets near it. |
| CR-C17 | `found(V)` with a staged, ready V installs without a re-download on every platform, not only macOS | Reject (verified) | `BaseUpdater.install` reads `installerPath` and `downloadedFileInfo`, which a later check doesn't clear (`BaseUpdater.js:38-50`). Read only on Windows and Linux, which aren't tested at all. |
| CR-C18 | The comment in `appUpdateAutomaticRun.ts:13-14` still says "`AppUpdater` owns the sequence"; it is now the policy | Reject (cosmetic note) | One stale comment. Fix it on the next touch. |
| CR-C19 | A second native fetch in one process (F-15): if Squirrel doesn't answer it, a good update waits out the 15 minutes and is blocked | Hold for Evidence | The design records it as unknown (`design-spec.md:423`), and ARCH-REV-005 gives it to validation. It needs a switch-off or staged path plus a re-download. Not scored. |

### Evidence limits (carried to validation)

- **A real native success through the wait has not run**, so this install order has not yet produced a real install. IMP-12's two runs were refusals.
- IMP-12's second refusal was "Could not locate update bundle", not a signature refusal (`88814a7182` corrected this). The API-05C repeat is the real signature case.
- Both real refusals came after the zip was served. The read-only timing is unit-only on this order.
- 20 mutations were caught (IMP-11).

### Correction to CRR-004

CRR-004 said `downloadUpdate()`'s promise "has no resolve on Squirrel's success" with `autoInstallOnAppQuit`. **That was wrong:** it resolves once the zip is served (`MacUpdater.js:184-189`). It still isn't a readiness signal, because Squirrel's unpack and verify come after that, but my stated reason was wrong and SR-004 repeated it. ARCH-REV-003 caught it, and SR-005 corrected it.

### Structure and scores

- Sizes: `appUpdater.ts` 472, `appUpdateAutomaticPolicy.ts` 144, `appUpdateInstallReadiness.ts` 56, `appUpdateAutomaticRun.ts` 98, `appUpdateNotificationRecord.ts` 203. All within 500.
- Ownership: readiness answers one question and reads only the public event, never MacUpdater's private flag. The record owns the gate.
- Scores:
  - category 8, Runtime Correctness, goes from round 4's 8.7 to 9.3;
  - category 4, Separation of Concerns, goes from 9.4 to 9.5 (the near-limit file is resolved);
  - category 7, API/E2E Readiness, stays at 9.3 (the real success is pending).
  - Overall 9.4; no category is below 9.2.
- Docs: `electron_packaging.md` describes the wait, its ends and the bound.

### Findings (round 5)

None. F-API-003 and CR-C12 are resolved by design and code, pending runtime proof.

### Follow-ups

None added. FU-004 and CR-C2 are unchanged. Direction A narrows FU-003: a refusal during the wait now stops no runs.

> Round 4 (CRR-004) and earlier rounds are kept below for history.

## Round 4 — Failure-Origin Review of F-API-003 (CRR-004)

### Meta

- Trigger: API/E2E engineer, API-REV-002 `Fail` (88.7%).
  - Code `6a94169f4f`, from a clean checkout of `f1c4641b08`.
  - Evidence `940251dcdb`.
- Coverage investigation / execution report / API/E2E revision record: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` (API-REV-002).
- Project testing guideline: `TESTING.md`. Isolated copies only; the user's app, data, updater caches and nodes were untouched. No conflicts.
- Failing scenario: AC-002 / REQ-002 / REQ-004 / DS-002 signal (c), on a busy machine.
- Evidence (`evidence/`): `API-02D-v1-instance.log:263-282`, `API-02D-state-after.log`, `API-02D-failure-row.png`, `API-02B-v1-instance.log`, `API-02C-throttled-summary.log`, `API-05C-instance.log`, `API-05-r2-samples.log`.

### What the evidence shows (Measured by API/E2E; I checked the logs and the code)

- `update-downloaded` fires **before** Squirrel has its copy. `MacUpdater.js:219-224` dispatches it and then calls `nativeUpdater.checkForUpdates()`.
- `MacUpdater.quitAndInstall` (`:240-254`): when `squirrelDownloadedUpdate` is still false, it only registers a listener and returns. The quit comes after Squirrel's fetch, unpack and verify.
- `AppUpdateInstallAttempt.run` calls `onQuitRequested` right after `quitAndInstall` returns, so the 60 s bound starts while Squirrel still has its work ahead. The bound measures Squirrel's work as well as the quit.
- **Margin on this machine:** about 36 s of the 60 s on an idle app (API-02B).
- **On a busy machine (API-02D):** a full `build:electron:mac` at normal priority, load average 43 to 153.
  - 05:50:06.474: the server exited.
  - 05:51:06.477: "did not quit … within 60 seconds", 60.003 s later.
  - 05:51:06.479: "relaunching this version".
  - The bundle is still beta.10, and the row reads "Automatic update failed".

### Origin

- **Design Impact.** DS-002 signal (c) and § Risks assume that the quit follows `quitAndInstall` promptly. On macOS that is false: the order the design prescribes (install at once at `update-downloaded`) leaves Squirrel's work inside the bound. The code implements the design exactly. The design's own escalation trigger covers this case: "if the real install on the platform needs anything beyond `installUpdateAndRestart()`".
- **Not an implementation defect, and not a test problem.** A heavy build at normal priority is ordinary use on this user's machine, with no artificial throttle (API-02C's stronger throttle is supporting evidence only). Validity: `Supported Normal Scenario`, since AC-002 has no idle precondition, and DEC-001 chose no idle check. The update arrives unattended, whatever the machine is doing.
- **Consequences:**
  - a working update is abandoned, and the app restarts for nothing;
  - V is blocked from automatic install although nothing was wrong with it, against REQ-002's intent (a newer version or a click still installs);
  - the row says the automatic update failed;
  - runs busy at that moment are stopped and not resumed (FU-003, read and not run). FU-003 assumed this path is rare, and a false failure on a busy machine makes it more likely.
  - No corruption: the old version returns with its server.
- **Limits of the evidence:** one machine, and an ad hoc signature (a Developer ID signature may change Squirrel's time, in an unknown direction).
- **Review gap (mine):** in round 3 I printed `MacUpdater.quitAndInstall` and used it to settle the timeline, but I did not connect it to the bound. Round 1 also accepted signal (c) without reading it.

### Correction to rounds 2 and 3

- CRR-002 and CRR-003 said the round 1 refusal arrived **during** the preparation. **That was wrong.** Read: in API-02B the server exit comes 138 ms after "/ requested" (the 100 ms delay plus about 40 ms to stop); in round 1 it came 183 ms after. API-05-r2 shows 9 of 9 read-only refusals landing **before** the preparation. So what round 1 hit was the case I called the "second timing": the old timer wasn't cancelled and stopped the server after the refusal. This is an inference from timings, since no log line marks the start of the preparation.
- What still holds from round 3: the stop had not resolved, and "/ requested" is Squirrel's fetch, not `quitAndInstall`. API/E2E applied that correctly.
- The IR-002 fix covers both timings, and F-API-002 is resolved. The implementer's "during" reading came from my text. A refusal within the short stop has no known real trigger and stays unit-only. A signature refusal arrives after the stop (API-05C, +38 s), which the relaunch branch handled correctly.

### Resolved this round

- **F-API-001:** Resolved at runtime on a real automatic restart (API-02-r2).
- **F-API-002:** Resolved at runtime: cancelled with the server healthy (API-05-r2, 9 samples), and relaunched once with a healthy server (API-05C).

### Directions (the Solution Designer decides)

| Direction | Effect | Cost |
| --- | --- | --- |
| **A. Start the install once Squirrel has its copy** (macOS). Wait for Electron's native `autoUpdater` `update-downloaded`, the same object MacUpdater listens to, before the stop. Windows and Linux have no such step. Bound that wait separately: when it expires nothing has stopped, so it is a clean failure | Removes the false failure. Also removes O-4 (the server is down for ~36 s with nothing happening) and moves a signature refusal (API-05C) to before the stop, so no relaunch and no stopped runs for it, which shrinks FU-003 | Changes DS-002's order. Busy runs keep working during Squirrel's time. "As soon as the download is done" (DEC-001) then means "once it is ready to install", about 36 s later; the Solution Designer should judge whether that needs the user |
| **B. Arm the 60 s bound at Squirrel's readiness, keeping the order** | Removes the false failure | Keeps O-4. A Squirrel that never answers leaves the app without its server unless a second bound is added |
| **C. A longer bound** | Moves the threshold | The margin is unknown on slower machines or with a Developer ID signature, and it delays the detection of a real hang |

My view: **A**. It fixes the cause instead of the timer, and it also removes the server outage. Read only: the signal and its behavior with a cached update (N-8's path, where `update-downloaded` re-emits) need checking on the real updater; `squirrelDownloadedUpdate` may already be true there, so a wait must not hang. The `downloadUpdate()` promise is not a usable signal, because with `autoInstallOnAppQuit` it has no resolve on Squirrel's success (`MacUpdater.js:220-226`).

### Other observations for the same revision

| Candidate ID | Observation | Disposition | Reason |
| --- | --- | --- | --- |
| CR-C12 (O-5) | Every install failure shows the classifier's generic "could not restart to install it. Try again." (`appUpdateErrorClassifier.ts:21`), including a signature refusal, a read-only refusal and the false bound failure; the real reason is only in the log | Promote (this ticket, low) | REQ-004: "shows 'Automatic update failed. Nothing was changed.' with the reason". "Try again" also misleads, since the version is blocked for automatic install. The raw native text is unsuitable (file paths, the OS locale), so the wording is a design choice. |
| CR-C13 (O-3) | About 40 s between "relaunching" and the new process (API-05C), cause not identified | Hold for Evidence | Seen once, and API/E2E has no cause. Not scored. Direction A would make this path rarer. If it persists, measure it. |
| CR-C14 (O-4) | The server stops at once while Squirrel needs ~36 s | Linked to F-API-003 | The same cause. It follows the design's order, and direction A removes it. |

### Classification and routing

- F-API-003: `Design Impact`, owned by the Solution Designer. CR-C12 goes with it.
- After the revision: architecture review as the rules decide, then implementation, source review and API/E2E (API-02D's load repeat, a repeat of API-05C, and the cached or staged path).

> Round 3 (CRR-003) and earlier rounds are kept below for history.

## Round 3 — Targeted Delta Review of IR-002 (CRR-003)

### Meta and scope

- Trigger: implementation engineer, IR-002 (code `aa096836d9`, `6a94169f4f`; handoff and evidence `11b6d02c46`).
- Review Scope: `Targeted Delta Review`.
  - Evidence: `git diff bc9e427f1c 6a94169f4f` touches the install sequence and its failure handling (F-API-002), the sidebar count and store (F-API-001), one row layout fix, the two docs and the two spec files.
  - There is no change to the node path, the record's shape, persisted data, IPC or the shared contracts.
  - The new `appUpdateInstallAttempt.ts` holds code moved out of `appUpdater.ts`, inside F-API-002's behavior.
- I reran no checks: the Electron and web suites and the typecheck ran on `6a94169f4f`. IMP-09's mutations ran on the working tree before `aa096836d9`, and the one later source change is the removal of a guard that had no observable effect (M14). IMP-10 is a rendered check from a seeded record.

### F-API-001: Resolved

- `automaticOutcomeRows` in the store is now the one set, and `unreadOutcomeRows` derives from it. `SidebarNotificationsEntry.vue` uses that set plus its own `center.isNew` rule, and its app-excluding filter is gone.
- I repeated the consumer search I missed in round 1 (`AUTO_UPDATED` and `kind !== 'app'` across components, stores, composables, pages, layouts and utils). No other reader computes the outcome count. The remaining `kind` checks are row text and layout. `updateNotificationsStore.ts:98` and `:144` derive a source row's `unread`, which is a different fact.
- The new test covers "1 update applied automatically" and "1 updated" with the panel open, after the row is marked read.

### F-API-002: Resolved in code; the real refusal is still owed

Trace of `AppUpdateInstallAttempt` and `installFailed`:

| Failure arrives | What happens | Result |
| --- | --- | --- |
| Before the 100 ms delay ends | `abort()` clears the timer and returns `false` | Nothing stops, no recovery; the server keeps running; V is blocked |
| During the preparation (the API-05 timing) | `aborted` is set; `abort()` awaits `running`, then returns `true`; `run()` skips `quitAndInstall` | Recovery reads `isServerProcessGone()` only after the shutdown has settled, so it relaunches |
| The preparation rejects (catch) | `onFailed` → `installFailed` → `abort()` awaits `running`, which ends right after the synchronous `onFailed` returns | No deadlock; recovery once |
| A refusal, then the preparation rejects | Recorded once; the second `installFailed` returns false; `abort()` resolves when `running` ends | Recovery once; the recorded reason is the first |
| `quitAndInstall` throws, or the quit bound expires | `failed` → `installFailed` → `abort()` | Recovery once |

- The wait is bounded: the preparation is `ApplicationShutdown.stop()`, with its 30 s deadline.
- A manual install stays unchanged: `installFailed` returns false when no automatic install was requested, so `abort` isn't called and `quitAndInstall` still runs.
- **Secondary:** `installRequestedFor(V)` keeps a later download rejection from replacing the install-failure state. A manual download with no automatic install still reports a download error (test).

### The implementer's three points

1. **`quitAndInstall` is skipped after a known failure: accepted.** On macOS, MacUpdater would wait for a native `update-downloaded` that a refusal never sends, so calling it does nothing useful, and recovery decides next. It is consistent with DS-002 and REQ-004. A false refusal can't come from a scheduled check, because `installing` is busy (`appUpdater.ts:34`, `appUpdateCheckSchedule.ts:112`).
2. **The timeline: the implementer and CRR-002 are right; the API report's label is wrong.**
   - `stopServer` awaits `waitForChildExit` on the `exit` event, and "Server process exited" is logged by an `exit` listener (`baseServerManager.ts:390-393`) at 29.868. So the stop had not resolved at 29.685.
   - `MacUpdater.js:219-223` calls `nativeUpdater.checkForUpdates()` right after `dispatchUpdateDownloaded`, without `quitAndInstall`. So "/ requested" is that native step.
   - Awaiting the preparation is therefore enough. API/E2E should correct that label in its report at the next round.
3. **`appUpdater.ts` at 485 lines: accepted.** The install sequence moved to its own file, and the file is within 500, with a net +2.

### Candidate gate (round 3)

| Candidate ID | Observation | Disposition | Reason |
| --- | --- | --- | --- |
| CR-C8 | `installRequestedFor(V)` also holds for a later **manual** re-download of V in the same process (the app stayed open after a failed automatic install), so its rejection takes the suppressed branch and could leave the status on `downloading` | Reject (verified not stuck) | electron-updater dispatches `error` before it rejects (`AppUpdater.js:451-453`), except for a `CancellationError`, and the app never cancels a download. The `error` handler sets the error state with `operation = 'download'`, so only the catch's log line is misleading. |
| CR-C9 | `updateStaged` stays true after a failed install, so `isBusy()` stops scheduled checks for the rest of that process when it stays open (the cancelled path, or an unconfirmed server exit) | Reject (not material) | The next start checks as usual, and a click still works. Both paths are rare: the observed refusal took about 0.9 s, past the 100 ms delay. It is recorded as a residual. |
| CR-C10 | M14's guard was removed after the mutation run, so the mutations were not re-run on the final code | Reject | The removed guard had no observable effect, and the full Electron suite ran on `6a94169f4f`. |
| CR-C11 | A manual click that installs V after V's automatic install failed: at the next start, reconcile's rule `failedInstall === running` gives `AUTO_UPDATED`, so the row says "Updated automatically to V" for a click | Promote as a follow-up (FU-004) | Read at `appUpdateNotificationRecord.ts` `reconcileWithRunningVersion`; not run. The design prescribes the rule to catch an install-on-quit during recovery, and a click can't be told apart there. It is wording only: no AC fails, and the version is right. This is borderline against BEH-003's "the manual wording" preserved, so I name it rather than bury it. |

### Scorecard and structure

- Category 5, Shared-Structure, goes from round 2's 9.0 back to 9.5 (one derived set).
- Category 8, Runtime Correctness, goes from 8.6 back to 9.3 (the decision comes after the attempt settles).
- Category 7, API/E2E Readiness, stays at 9.3 (the real refusal is pending).
- Other categories are unchanged. Overall 9.4.
- Sizes: `appUpdater.ts` 485, `appUpdateInstallAttempt.ts` 49, `appUpdateAutomaticRun.ts` 90.
- Ownership: the install attempt owns the delay, the preparation and the quit call; the automatic run owns what is recorded; `ElectronApplication` owns recovery. There is no duplicate sequence.
- `6a94169f4f` is a small layout fix, within the rendered check's scope.

### Findings (round 3)

None.

### Follow-ups

- Added: FU-004 (CR-C11).

> Round 2 (CRR-002) and round 1 (CRR-001) are kept below for history.

## Round 2 — Failure-Origin Review of F-API-001 and F-API-002 (CRR-002)

### Meta

- Trigger: API/E2E engineer, API-REV-001 `Fail` (86.1%).
  - Code `31d38080fc`, from a clean checkout of `e8b51df9ad`.
  - Evidence `f6a511e25f`.
- Coverage investigation / execution report / API/E2E revision record: `api-e2e-coverage-investigation.md` (including § Can The Real Install Run Safely?), `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` (API-REV-001).
- Project testing guideline: `TESTING.md`. The isolated copies had their own bundle id, cache name, `LSEnvironment` and requirement. The user's caches were identical before and after, and the user's nodes were untouched. No conflicts.
- Failing scenarios:
  - F-API-001: AC-002 / REQ-005 (the sidebar entry after an automatic app update);
  - F-API-002: AC-005 / REQ-004 / design DS-002 recovery (a native install refusal).
- Evidence (`evidence/`):
  - F-API-001: `API-02-03-summary.log`, `API-02-sidebar-entry-0-updated.png`;
  - F-API-002: `API-05-instance-1.log:255-290`, `API-05-watch.log`, `API-05-app-open-without-server.png`.

### F-API-001: the sidebar entry says "0 updates applied automatically" after an automatic app update

- **Read:**
  - This branch removed `row.kind !== 'app'` from `unreadOutcomeRows` (`stores/updateNotificationsStore.ts:186`), so an unread app `AUTO_UPDATED` row now keeps the entry visible (`hasEntry`). That part is correct.
  - `components/layout/SidebarNotificationsEntry.vue:61` computes its own `outcomes` with the **old** filter (`row.kind !== 'app'`), so it counts 0 for the same state. The result is a visible entry saying "0 updated".
- **Origin:** an implementation defect in this change. The same derived fact, "unread automatic outcomes", is computed in two places with different rules (Principle 11: one owner derives a fact).
  - The design's derived-consumer list did not name the sidebar component, but the design doesn't need to: the store already owns the fact.
  - **Review gap (mine):** in round 1 I checked the listed consumers and did not search for other readers of `outcome === 'AUTO_UPDATED'`.
- **Required (`Local Fix`):** the sidebar entry reads the store's one derived set, not a second filter. For example, the store exposes the outcome rows that count, including its "seen this visit while the panel is open" rule (`center.isNew`), and the component counts those. Add a test: an unread app `AUTO_UPDATED` row gives "1 update applied automatically".

### F-API-002: after a native install refusal, the old version stays open without its server

- **Timeline (Read from `API-05-instance-1.log`):**
  - 28.778: `update-downloaded`, so `installAutomatically`: `installUpdateAndRestart()` is accepted, `activeOperation = 'install'`, and 100 ms later `prepareForInstall()` starts the shutdown.
  - MacUpdater's native Squirrel step runs after its own zip download: 29.685 "/ requested" from its proxy.
  - 29.687: Squirrel refuses ("Cannot update while running on a read-only volume", `SQRLUpdaterErrorDomain` 8). It arrives as an `error` with `activeOperation === 'install'`, signal (b).
  - 29.689: `installFailed` → `recoverAfterFailedInstall()` checks `isServerProcessGone()` **once, at that moment**. The shutdown is still stopping the server, so the check is false: "not confirmed; the app stays open".
  - 29.868: the server process exits, as the in-flight shutdown completes it.
  - The failure is already handled, so `awaitQuit` arms no bound, and nothing relaunches. The window stays on "Loading task history…" with no server (two minutes later, still the same).
- **Origin:** an implementation defect. Design DS-002 recovery says to relaunch "if the shutdown stopped the server, or the server process is gone". That decision only makes sense once the install attempt's preparation (the shutdown) has settled, but the implementation takes it at the instant of the failure signal.
  - The same mistake has a second timing: if the refusal arrives **before** the 100 ms timer starts `prepareForInstall`, the check sees a live server (correct, stay open). But the scheduled preparation then still stops the server, and `quitAndInstall` follows to no effect. The same app-without-server end state results.
  - **Review gap (mine):** CR-C2 considered an error after `before-quit`. I did not consider a refusal arriving during, or before, the install's preparation. On macOS that is the realistic path: MacUpdater's native step runs after `update-downloaded`.
- **Required (`Local Fix`, within DS-002; no design change needed):**
  1. A failed automatic install must not leave the install sequence half-done. A failure before `prepareForInstall` has started cancels the pending install, so the server keeps running and no recovery is needed. A failure during or after it lets the preparation settle first, by awaiting the in-flight install attempt, for example `ApplicationShutdown`'s memoized stop. Only then does recovery decide: relaunch when the server is gone (the normal outcome), otherwise stay open (284 / 339 DEC-005).
  2. Add tests for both timings: a refusal during `prepareForInstall`, and one before it starts.
- **Secondary (same fix round):** the same native refusal also rejects MacUpdater's pending download promise. `downloadUpdate()`'s error state then overwrites the state message with "The update download was interrupted…" (`errorOperation: download`).
  - The record is not overwritten: `downloadingVersion` was already cleared at `update-downloaded`.
  - But the state and toast show a misleading download error after an install failure.
  - Required: once an automatic install of V is accepted or has failed, a later download rejection for V must not replace the install-failure state. Add a test.

### Classification and routing

- F-API-001: `Local Fix`, owned by implementation.
- F-API-002, including its secondary: `Local Fix`, owned by implementation.
- Neither needs a requirements or design change: both fixes realize DS-002 and REQ-005 as written.
- After the fix: source review, then API/E2E (repeat API-02's sidebar check and API-05 on macOS).

## Review Round Meta

- Review Entry Point (round 1): `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002: REQ-001 to REQ-006; DEC-001 = A approved by the user, DEC-002 and DEC-003)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (F-01 to F-12)
- Solution Revision Record Reviewed As Context: SR-001 to SR-003
- Design Spec Reviewed As Context: `design-spec.md` (SR-003)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md`
- Relevant Solution Revision IDs: SR-002, SR-003
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002 `Pass`). Its edits are uncommitted in the worktree and owned by the architecture reviewer.
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (uncommitted edits, same owner)
- Relevant Architecture Review Revision IDs: ARCH-REV-001, ARCH-REV-002
- Implementation Handoff / Revision Record: `implementation-handoff.md`, `implementation-revision-record.md` (IR-001)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Trigger: implementation engineer, IR-001 (code `b4bda46484`, `9369828ca7`, `63f5bb8bfc`, `8cf4278319`, `31d38080fc`; handoff `f19fb18287`)
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Medium`. Architectural risk: `High`. Selected route: `Implementation Review`. Independent source review required: `Yes`.
- Confirmed. The change is in `autobyteus-web` only, inside existing owners plus a new main-process `nodeAutoUpdate/` area. The risk is `High` for three reasons:
  - the app restarts by itself with nobody present;
  - the desktop starts unattended updates of remote machines;
  - two persisted desktop records gain fields.

## Review Scope

- Reviewed: `git diff origin/personal...31d38080fc` (Electron main, shared types, stores, components, localization and docs, plus their tests).
- Context read, unchanged:
  - `AppUpdater.installUpdateAndRestart` (the 339 path) and `downloadUpdate`;
  - `ElectronApplication.prepareForInstall` and `isServerProcessGone` (339);
  - the renderer's `nodeServerUpdateStore` C1 calls;
  - the server's C1 route class: `/rest/node-update` is `TRUSTED_NETWORK_OWNER` (`remote-access-route-policy.ts:84`), so phones are refused (`node-update-routes.ts:22`).
- Exclusions:
  - validation owns the real install and relaunch (AC-002, AC-003), the native install refusal, and a real Docker starter node (AC-004, AC-005);
  - I reran no checks: IMP-01 to IMP-08 ran on `31d38080fc`.

## Upstream Behavior And Production-Path Basis Confirmation

- Behavior-basis status: `Confirmed`. No new behavior.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence |
| --- | --- | --- |
| BEH-001 | Confirmed | **Download (DS-001):** `update-available` → record as today → `startAutomatic(V)`. It runs only if the switch is on and `!run.blocks(V)`, then calls the **same** `downloadUpdate()`. **Install (DS-002):** `update-downloaded` → `installAutomatically(V)` → the same `installUpdateAndRestart()` (339, so 285 records busy runs). `installAccepted(V)` is recorded only when accepted, before the 100 ms stop. **Gate:** `AppUpdateAutomaticRun.blocks(V)` = `installRequestedVersion === V` (this process) or the record's install failure for V (across restarts). **Install failure** is any of (a) the catch, (b) an `error` while `activeOperation === 'install'`, or (c) no `before-quit` within 60 s after `quitAndInstall`. It is handled once: recorded as `install`, which blocks V, then `recoverAfterFailedInstall`. **Recovery:** `app.relaunch(); app.exit(0)` only when `isServerProcessGone()`, otherwise the app stays open (284). **Switch off:** every hook returns early (AC-001). **Switch on mid-flow:** `available` downloads, `downloaded` installs, and a staged update with a later `available` installs from the cache (N-8, a real `NsisUpdater` test). |
| BEH-002 | Confirmed | `NodeAutoUpdater` in the main process: packaged builds and remote entries with `autoUpdate` only; a pass 2 minutes after the start, then every 60 minutes, never overlapping, one node after another; an immediate check when a node's switch turns on. Each check: `getStatus(V)` → reconcile → the switch re-read → the pure `decideNodeAutoUpdate`, which requires `available`, `relation === 'newer'`, not running, no blocker, and no PENDING or FAILED attempt for V → `requestUpdate`. Only a 202 response records PENDING, then a per-node follow (10 s, at most 15 minutes). A followed node is skipped by passes. The C1 request has the same shape as the renderer's click, with no auth added (C1 frozen). |
| BEH-003 | Confirmed | **App:** the record gains `automatic`, `automaticFailure` and `outcome`. Start-time reconcile: the automatic version (or the failed install's version) running → `AUTO_UPDATED`, unread; an automatic install left on `fromVersion` → an install failure; otherwise today's rule. `toNotification` gives `AUTO_FAILED` while the failure matches. `markRead` covers `AUTO_UPDATED`. **Nodes:** `node-auto-updates.json` outcomes are broadcast, and the windows read and mark-read only (`nodeAutoUpdateIpc.ts`). |
| — (REQ-006) | Confirmed | The switches live only in desktop files and desktop IPC. No server file changes (IMP-07). The node outcome IPC cannot start an update. |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-A | BEH-001, AC-001 to AC-003, AC-005 | User / System | User (switch); the update check (event) | Install new releases by themselves | Settings switch; the scheduled check | Normal (a failed install is an explicit edge, AR-001) | DS-001, DS-002 | Download, install, restart; failures once and recovered | DEC-001; F-02, F-07 | Supported Normal Scenario | Use |
| SCN-B | BEH-002, AC-004, AC-005 | User / System | User (node switch); pass timer | Keep a node on the desktop's version | The node row switch | Normal | DS-003 | One attempt per version per node | DEC-003; F-03, F-11 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation | Disposition | Reason |
| --- | --- | --- | --- |
| CR-C1 | The six deviations in the handoff § Important Assumptions | Accept | Each stays within approved behavior: (1) the IPC constant lives beside the controller contract; (2) the AUTO_UPDATED-by-failure-version rule is limited to install failures, the only case where it can mean an install-on-quit succeeded; (3) turning the switch on with `no-update` does nothing, since there is no version and the next check acts; (4) a node in its 305 trial is not counted as updated while `running`, because the trial can still roll back; (5) the 60 s bound applies to automatic installs only, so manual stays unchanged (tested); (6) the node switch's place on the row is a UI detail. |
| CR-C2 | (b) an `error` event with `activeOperation === 'install'` arriving **after** `before-quit` would still run recovery (`app.relaunch` + `exit`) while the installer may be running | Reject (no evidenced trigger) | The native refusals that reach the app (Squirrel.Mac read-only or translocated, signature checks; an NSIS spawn failure) arrive before the quit, because the quit never starts. After `quitAndInstall` has quit the app, the OS installer (ShipIt or NSIS) runs outside it. A guard ("ignore install failures once the quit started") would be a small hardening, but nothing shows the trigger. Validation should note any error logged after `before-quit` on the real install (AC-002). |
| CR-C3 | The node requests now come from the main process's `fetch`, not the renderer's Chromium fetch: no window cookies and no `Origin` | Reject (verified as not material) | The renderer's C1 call sends no auth either (`nodeServerUpdateStore.ts:71, 130`), and the route class is `TRUSTED_NETWORK_OWNER`, which refuses only mobile devices. The request is the same. AC-004 on a real starter node confirms it at runtime. |
| CR-C4 | Turning the switch on while an update is downloaded restarts the app at once, from the Settings page | Reject (approved) | REQ-002: "Turning the switch on while an update is found or downloaded continues that update the same way". DEC-001 = A, and the switch text says the app restarts by itself. |
| CR-C5 | A node that accepted (202) and then stays unreachable keeps a PENDING entry, with no new request for V | Reject (designed) | One attempt per version (REQ-004). A later pass reconciles it when the node answers: AUTO_UPDATED, FAILED, or "did not finish" after 30 minutes. A newer desktop version starts a new attempt. |
| CR-C6 | A failed automatic download also shows today's download-error toast (handoff Known Risks) | Reject | That is today's error state, kept on purpose (DS-001: "The existing `handleError` state applies, as today"). The row shows the automatic failure as required. |
| CR-C7 | `appUpdater.ts` grows from 412 to 483 effective lines | Reject (Pass; note) | Within 500. The per-process run state was already extracted to `appUpdateAutomaticRun.ts`. The next growth should go to a new owned file. |

## Structural / Design Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Task design health assessment preserved | Pass | No design issue; the policy is added in the two owners, and the manual paths and C1 are unchanged. |
| Matches behavior-defining supplements | Pass | None. |
| Data-flow spines | Pass | DS-001, DS-002 and DS-003 match the code, including the gate, the failure signals and the recovery. |
| Ownership boundaries | Pass | `AppUpdater` owns the sequence and `AppUpdateAutomaticRun` the per-process run memory. `ElectronApplication` owns recovery (process and server). `NodeAutoUpdater` owns the node policy in the main process, and the renderer only shows and toggles. |
| Off-spine concerns | Pass | — |
| Existing capability reuse | Pass | The same `downloadUpdate()` and `installUpdateAndRestart()` (no divergent path), the existing record and reconcile, the registry's typed changes, the C1 contract types (`shared/nodeUpdateContract.ts`, now shared with the renderer store). |
| Reusable owned structures | Pass | The C1 types are extracted once from `nodeServerUpdateStore.ts` into `shared/`, and both the store and the main client use them. |
| Data-model tightness | Pass | Optional record fields with a tolerant read; `NodeEntry.autoUpdate?: true` (the field is removed when off). |
| Repeated coordination | Pass | One node decision function and one gate. |
| Empty indirection | Pass | — |
| Separation of concerns / file responsibility | Pass | Decision, record, client, updater and IPC are each in their own file. |
| Dependency direction | Pass | `nodeAutoUpdate/` depends on shared types and injected functions, never on renderer code. |
| Authoritative Boundary Rule | Pass | The renderer never calls C1 for automatic updates. The switch goes through the registry change and app IPC, and the outcome IPC is read and mark-read only. |
| File placement | Pass | — |
| Layout | Pass | — |
| Interface clarity | Pass | `setAutomaticUpdate(unknown)` refuses a non-boolean. `set-auto-update` is refused for the embedded or an unknown entry. `NodeUpdateRequestResult` separates accepted, refused and not delivered. |
| Naming / one vocabulary | Pass | "Update automatically", "automatic run" and "attempt" are used as the design's Terminology defines them. |
| No unjustified duplication | Pass | The duplicated C1 status guard in the renderer was removed in favor of the shared one. |
| Patch-on-patch control | Pass | `31d38080fc` fixes two rendered defects found by IMP-08, re-verified. |
| Dead code removed | Pass | The renderer's local C1 types and `isStatus` were replaced by the shared ones. |
| Tests requirement-aligned | Pass | AC-001, AC-002 (mocked updater), AC-005, AR-001 (a), (b), (c), AR-002, N-6, N-8 (real `NsisUpdater`), every decision and reconcile row, 409, timeout, follow, overlap, switch off mid-check, removal, shutdown. 36 mutations were all caught (IMP-04 to IMP-06). |
| Fixtures coherent | Pass | — |
| No stale tests | Pass | — |
| API/E2E readiness | Pass | The handoff names the real install and relaunch, AC-003, the native refusal and the real Docker node, plus IMP-08's rendered check as a baseline. |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` | `>220` Delta | Classification |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/updater/appUpdater.ts` | 412 | 483 | Pass (CR-C7) | Pass | Pass |
| `autobyteus-web/electron/application/electronApplication.ts` | 403 | 444 | Pass | Pass | Pass |
| `autobyteus-web/stores/nodeStore.ts` | 297 | 305 | Pass | Pass | Pass |
| `autobyteus-web/stores/updateNotificationsStore.ts` | 284 | 289 | Pass | Pass | Pass |
| `autobyteus-web/electron/updater/appUpdateNotificationRecord.ts` | 135 | 199 | Pass | Pass | Pass |
| `autobyteus-web/electron/nodeAutoUpdate/nodeAutoUpdater.ts` | new | 154 | Pass | Pass | Pass |
| `autobyteus-web/electron/updater/appUpdateAutomaticRun.ts` | new | ~85 | Pass | Pass | Pass |
| other changed sources | — | ≤ 290 | Pass | Pass | Pass |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | — |
| No legacy retention | Pass | The docs line "never the app" was rewritten. |
| Dead code removed | Pass | — |
| Persisted-data decision followed | Pass | `Directly Usable — No Migration`: optional fields and a tolerant read (invalid reads as absent or off); atomic writes; new files default to off or empty. |
| No version-specific reads | Pass | — |
| Transition mechanics match | Pass | N/A. |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, done: the settings docs (app switch, node switch); the localization strings in en and zh-CN.

## Additional Material Premise Validation

- The upstream premises (ARCH-REV-001 AR-001 and AR-002; ARCH-REV-002 N-6 and N-8) are confirmed in code and tests. No new premises; CR-C2 and CR-C3 are recorded above.

## Review Scorecard (Mandatory)

- Overall score: 9.4 / 10 (simple average; for trend only)

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | `Data-Flow Spine Inventory and Clarity` | 9.5 | All three spines as designed | — | — |
| 2 | `Ownership Clarity and Boundary Encapsulation` | 9.5 | Policy in its owners; the renderer only shows and toggles | — | — |
| 3 | `API / Interface / Query / Command Clarity` | 9.4 | Typed results; refusals for invalid input | — | — |
| 4 | `Separation of Concerns and File Placement` | 9.4 | — | `appUpdater.ts` near the limit (CR-C7) | Put the next growth in a new owned file |
| 5 | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.5 | C1 types shared; tight optional fields | — | — |
| 6 | `Naming Quality and Local Readability` | 9.4 | Comments tie the rules to their REQ, AR and N IDs | — | — |
| 7 | `API/E2E Readiness` | 9.3 | Deterministic coverage with 36 mutations; a rendered check | Real install, relaunch and node pending | Validation |
| 8 | `Runtime Correctness And Behavioral Fidelity` | 9.3 | Gate, once-only failure, recovery rule and node one-attempt verified | CR-C2 (error after the quit started) is not hardened | Note the real-install logs |
| 9 | `No Backward-Compatibility / No Legacy Retention` | 9.5 | — | — | — |
| 10 | `Cleanup Completeness` | 9.4 | — | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None.

## Classification

N/A: the review passes.

## Recommended Recipient

- API/E2E engineer (primary pass rule); then an informational notice to the implementation engineer.

## Residual Risks

- Owned by validation: the real automatic install and relaunch (AC-002), AC-003 (285 resume, if V1 has the recorder), the native install refusal and recovery, the real Docker starter node (AC-004, AC-005), and AC-006 (already IMP-07).
- CR-C2: an install error after `before-quit` would trigger a relaunch. No trigger is known; watch the real-install logs.
- The cost of DEC-001 = A (a restart while the user works; busy runs get one resume turn each), accepted by the user.

## Latest Authoritative Result

**Round 6 (CRR-007), authoritative:**

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (`Targeted Delta Review` of the merge resolution)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 / 10 (unchanged from CRR-005)
- Recommended Recipient: API/E2E engineer. The pass rule applies, and its re-check can be proportionate: the node switch in the merged layout. The automatic install path is unchanged by this delta.
- Notes: merge `08984df524`, local only. Delivery resumes after API/E2E: re-integrate, re-verify, finalize, and cut the beta the user decided on.

**Round 5 (CRR-005), superseded:**

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (`Full Re-Audit` of DS-001 and DS-002; DS-003 carried forward)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`. Round 4's contradicted premise is replaced: the quit bound now starts when Squirrel is ready.
- Score Summary: 9.4 / 10; every category ≥ 9.2
- Recommended Recipient: API/E2E engineer
- Notes:
  - Validated code: `2e64cbb3d9`.
  - A real install through the wait has not run yet; validation owes it, with the cases ARCH-REV-005 lists.

**Round 4 (CRR-004), superseded:**

- Review Decision: `Fail` (failure-origin)
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass`. A busy machine at an unattended automatic update is a supported normal scenario.
- Material-Premise Gate: `Fail`. The premise "the quit follows `quitAndInstall` promptly" (DS-002 signal c) is contradicted on macOS.
- Score note: category 8, Runtime Correctness, goes from 9.3 to 8.7. Other categories stand. The code follows the design.
- Failure Origin: `Design Impact`, F-API-003 (with CR-C12). Round 1 and 3 review gap. F-API-001 and F-API-002 are resolved at runtime.
- Recommended Recipient: Solution Designer
- Notes: AC-001, AC-003, AC-005 and AC-006 are proven, and AC-004 is reused from round 1. AC-002 passes on an idle machine and with a busy run, and fails on a busy machine.

**Round 3 (CRR-003), superseded:**

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (`Targeted Delta Review`)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 / 10; every category ≥ 9.2 (category 5 at 9.5, category 8 at 9.3)
- Recommended Recipient: API/E2E engineer
- Notes:
  - Validated code: `aa096836d9` + `6a94169f4f`.
  - F-API-002's timing is proven by unit tests with a controlled preparation only. The real Squirrel refusal is owed in the API-05 repeat, with API-02's sidebar check after a real restart.
  - API/E2E should correct its report's timeline label (point 2 above).

**Round 2 (CRR-002), superseded:**

- Review Decision: `Fail` (failure-origin)
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass`. An automatic app update, and a native install refusal the design names (a read-only location), are supported scenarios.
- Material-Premise Gate: `Pass`
- Score note:
  - category 8, Runtime Correctness, goes from 9.3 to 8.6 (DS-002 recovery is evaluated too early, so the app is left without its server);
  - category 5 goes from 9.5 to 9.0 (one derived fact computed in two places, F-API-001).
- Failure Origin: implementation defects in this change (both), plus round 1 review gaps (a consumer search; the timing of a refusal during the preparation).
- Recommended Recipient: implementation engineer
- Notes: everything else in API-REV-001 holds:
  - AC-001;
  - AC-002 (including the real Squirrel install on the isolated copy);
  - AC-003;
  - AC-004 and CR-C3 (the main-process POST was accepted);
  - AC-005's other parts;
  - AC-006;
  - CR-C2 (no error after the quit).

**Round 1 (CRR-001), superseded:**

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 / 10; every category ≥ 9.2
- Recommended Recipient: API/E2E engineer
- Notes: reviewed the five code commits up to `31d38080fc`. The six implementation deviations are accepted (CR-C1).
