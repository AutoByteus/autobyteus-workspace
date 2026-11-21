# Managed Ubuntu automatic restart — source review

**CRR-001 · Fail · one Local Fix (F-CR-001).** The managed session correctly refuses a second automatic attempt for a blocked version. After the user downloads that version by hand, the new readiness text nevertheless tells them it will reopen by itself. The activation policy should not be relaxed to match the text.

**Round/basis:** Initial full review, 2026-11-21. SR-001 [requirements](requirements-doc.md), [investigation](investigation-notes.md), SR-004 [design](design-spec.md) and [history](solution-revision-record.md), ARCH-REV-002 [review](design-review-report.md) and [revision record](architecture-review-revision-record.md), IR-001 [handoff](implementation-handoff.md), [record](implementation-revision-record.md) and [checks](evidence/IR-001-checks.txt). Base f36286782f; source 5328f4ce8bce; received 8c6120cf853e on feature/managed-ubuntu-auto-restart → personal. Medium / High confirmed: a bounded change, but unattended server stop and GUI restart warrant independent review. CRR predecessor / API-REV / DR: N/A. No scope change.

## Scenario and source trace

| Independently approved scenario | Production path and verdict |
| --- | --- |
| SCN-001, 002: opted-in app receives a verified release; own-node work must not be interrupted | Writer stage → session → SafeRestartMoment → authenticated request to the embedded launch endpoint. Neither renderer nor HTTP route can activate. Missing credential, non-200, redirect, malformed counts and failures are not an idle answer. The process and application managers inspect concurrently; both finalize synchronously after the slower owner. Current membership/object, status and synchronous background work are reread. Missing/unavailable/late inspection cannot certify an idle run. Recorder reuses the observation with its distinct best-effort reminder policy. |
| SCN-003: user uses an app window during the wait | Listener is installed at managed composition before window creation; monotonic clock for each contents' input. After busy query the watch checks token and fresh quiet, rearms as necessary, then calls session admission without yielding. Same stage/generation, channel, switch, block, no intent/latch and available restart channel are checked before assigning intent and calling stop. Physical input in a packaged session remains a QA gate. |
| SCN-004: intentional Quit while waiting or in flight | before-quit latches and cancels before windows close, except the session's own terminal quit. will-quit owns ordinary quit or defers to the already-running transaction. Confirmed settlements honor latch before writing the restart indication; unknown settlement with Quit exits 1. No second activation. |
| SCN-005, 006: install by hand or opt out | Click claims a manual intent and cancels watch. Preference change invalidates generation/pending stage. After stop, session rechecks consent separately from ending before dispatch; click does not inherit an automatic version block. Native activation policy excludes both managed modes. |
| SCN-007: refused, lost or unknown outcome; missing restart channel | Hash status distinguishes committed, confirmed old and unknown; known receipt-loss has its own event, unknown cannot request reopen. No channel → quit-only, not a fallback to native. Automatic refusal records a blocked version, still offering manual recovery. **Eligibility is enforced but not faithfully presented** (below). |

**Material premises:** ARCH-REV-002 MP-001 (input while query pending), MP-002 (unavailable snapshot and changing owners), MP-003 (Quit while activation pending) confirmed against code and focused IR tests. No new production scenario. Post-admission work starting during shutdown is explicitly outside the gate; reject a requirement for a new global run lock. No change to trust, sandbox, writer, native protocol or running-data formats.

## Candidate gate and finding

**F-CR-001 · Promote · Local Fix, Implementation Engineer.** Supported explicit failure/recovery case SCN-007: REQ-003 / AC-007 explicitly leave manual installation available after a refused automatic install; REQ-007 / AC-008 require readiness text that matches behavior. With the preference still on, the old version reopens, finds the same release, and the user chooses **Download**. Verification succeeds. `recordFound` retains the same version's failure, the session's `watchForRestart` excludes it, and `managedEvent('ready')` sets status downloaded. No automatic restart is scheduled. The UI should tell the user to use the available manual action rather than wait.

Instead, `NotificationRow.vue:98,152–156` and `AboutSettingsManager.vue:256–259` select the new auto-reopen message solely from mode and switch. The row can render opposite instructions simultaneously. In a focused Nuxt/Vitest probe at the received HEAD, the real mounted notification row displayed:

> It won’t be tried again automatically. You can still install it yourself.
>
> Ready. AutoByteus reopens on the new version by itself when no agent is working and you haven't used the app for 5 minutes.

**Evidence:** Temporary sibling of NotificationCenter.appAutomatic.spec.ts using its real Pinia/mountWith/openPanel harness. From autobyteus-web: NUXT_TEST=true node_modules/.bin/vitest --run <temporary-spec>. Used status downloaded, updateStaged true, availableVersion 1.5.7, automaticUpdate true, activationMode managed-restart, same-version waiting notification with AUTO_FAILED / install. Assertion that notification-row-downloaded omits “reopens on the new version” failed (1/1); temporary file removed. This is renderer evidence, not a packaged journey. About's identical selection was source-traced. The existing test of the refused/still-downloaded row does not select managed-restart + enabled or check readiness copy.

**Required correction:** Let both staged surfaces distinguish automatic eligibility of this release from general restart capability. Keep the independent block authoritative even if a later manual outcome is the visible notification (`AppUpdateNotificationRecord.outcomeOf` prioritizes manual failure). Preserve Install and restart, the healthy eligible message, and native behavior. Add focused tests of the blocked manual redownload and eligible control on both surfaces. No new persisted setting, change to consent, or retry policy is called for.

## Structure, ownership and local source audit

One session owns activation; pass-through composition stays separate from wait policy, input observation and HTTP. One shared run observation with distinct reminder/safety consumers. Platform-private manager stays inside the scope. The UI issue is an eligibility fact missing at the presentation boundary, not a competing execution owner. Accepted small naming variation (composeManagedUpdates.ts). No orphan activation path, stale new flag, compatibility shim, dual read/write, or required migration. Docs impact: GLOSSARY.md and autobyteus-web/docs/linux-managed-desktop.md updated; ordinary quit remains closed. No additional documentation change identified here.

Changed implementation files below: effective non-empty lines, base → source, excluding tests/docs. Placement and single responsibility traced above. All pass the 500-line limit and 220-line delta check; no split required.

| File | Before | After |
| --- | ---: | ---: |
| `autobyteus-server-ts/src/agent-execution/services/busy-runs.ts` | 0 | 54 |
| `autobyteus-server-ts/src/api/rest/busy-runs.ts` | 0 | 6 |
| `autobyteus-server-ts/src/api/rest/index.ts` | 71 | 74 |
| `autobyteus-server-ts/src/application-platform/execution/application-execution-scope.ts` | 193 | 196 |
| `autobyteus-server-ts/src/application-platform/runtime/application-platform-runtime-contracts.ts` | 63 | 65 |
| `autobyteus-server-ts/src/application-platform/runtime/build-application-platform-runtime.ts` | 335 | 337 |
| `autobyteus-server-ts/src/compositions/agent-runtime-status-composition.ts` | 60 | 60 |
| `autobyteus-server-ts/src/compositions/build-studio-server.ts` | 439 | 441 |
| `autobyteus-server-ts/src/compositions/busy-run-count-composition.ts` | 0 | 13 |
| `autobyteus-server-ts/src/restart-resume/busy-run-recorder.ts` | 127 | 111 |
| `autobyteus-web/components/notifications/AutoUpdateSwitch.vue` | 145 | 150 |
| `autobyteus-web/components/notifications/NotificationRow.vue` | 165 | 171 |
| `autobyteus-web/components/settings/AboutSettingsManager.vue` | 292 | 293 |
| `autobyteus-web/electron/application/composeManagedUpdates.ts` | 0 | 30 |
| `autobyteus-web/electron/application/electronApplication.ts` | 480 | 472 |
| `autobyteus-web/electron/application/managedUpdateSession.ts` | 147 | 177 |
| `autobyteus-web/electron/application/userInputActivity.ts` | 0 | 11 |
| `autobyteus-web/electron/server/embeddedBusyRuns.ts` | 0 | 11 |
| `autobyteus-web/electron/updater/appUpdateAutomaticPolicy.ts` | 148 | 148 |
| `autobyteus-web/electron/updater/appUpdater.ts` | 500 | 500 |
| `autobyteus-web/electron/updater/safeRestartMoment.ts` | 0 | 35 |
| `autobyteus-web/localization/messages/en/updateNotifications.ts` | 131 | 134 |
| `autobyteus-web/localization/messages/zh-CN/updateNotifications.ts` | 131 | 134 |
| `autobyteus-web/shared/appUpdateTypes.ts` | 142 | 142 |

## Scorecard

Scores are out of 10; mean 9.3 is descriptive, not a pass rule.

| Priority / category | Score | Basis; outstanding improvement |
| --- | ---: | --- |
| 1. Data-flow spine | 9.5 | Verified stage → quiet/busy → admission → one stop, commit and ending is traceable. No structural action. |
| 2. Ownership / boundaries | 9.4 | Session owns admission; record owns failed version; no duplicate writer authority. Preserve those owners in the UI fix. |
| 3. API / interfaces | 8.8 | Count contract distinguishes unknown; presentation has mode and switch but cannot reliably tell eligibility of this staged release. Correct F-CR-001. |
| 4. Separation / placement | 9.5 | Separate composition, timing and I/O; no unrelated subsystem move. |
| 5. Shared data model | 9.3 | Same busy observation, separately owned policies; do not substitute visible outcome for the independent failure block. |
| 6. Naming / readability | 9.4 | Consent and ending name distinct decisions. No naming change needed. |
| 7. API/E2E readiness | 9.2 | Scoped tests, built route, localized previews and explicit real-guest plan; add blocked-copy regressions before handoff. |
| 8. Runtime correctness / fidelity | 8.6 | Activation safe, but manual recovery guidance contradicts the session and can leave the user waiting. Correct both surfaces. |
| 9. No compatibility / legacy retention | 9.5 | No mixed-version fallback; no-channel quit-only behavior is required. |
| 10. Cleanup | 9.5 | Superseded construction and overloaded flag removed; no obsolete source left by this change. |

**Next owner: Implementation Engineer.** No API/E2E advancement until rereview. No additional follow-ups (existing FU-001 remains outside this ticket). The repaired package still requires independent AC-011 signed branch N→N+1 in disposable Ubuntu 24.04, observed busy/input deferral, spontaneous reopen, intentional Quit stays closed, refusal/data/copy controls. No production signing, deployment, target push or release.
