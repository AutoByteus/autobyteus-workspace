# Managed Ubuntu automatic restart — source review

**CRR-002 · Pass.** F-CR-001 is resolved. After the same release is manually downloaded and verified, a version blocked from automatic installation now has manual readiness text in both the notification row and About. General permission to update automatically is not mistaken for permission to retry this version.

**Round/basis:** 2026-11-21. Full Re-Audit: although the correction is local to readiness text, it extends the shared main-to-renderer state shape. Reviewed the IR-002 delta against CRR-001 (`0cbb9cfaf9`), both producers, IPC/store consumers, tests and the cumulative production spines. Base `f36286782f`; current source `f369d87e013b`; received `ddd49c4d0ed6` on feature/managed-ubuntu-auto-restart → personal. Medium / High confirmed. [Approved requirements SR-001](requirements-doc.md), [investigation](investigation-notes.md), [design SR-004](design-spec.md), [history](solution-revision-record.md), [ARCH-REV-002](design-review-report.md), [architecture record](architecture-review-revision-record.md), [IR-002 handoff](implementation-handoff.md), [implementation record](implementation-revision-record.md) and [review history](code-review-revision-record.md). API-REV / DR N/A. No scope revision.

## Scenario and source trace

| Independently approved scenario | Production path and verdict |
| --- | --- |
| SCN-001, 002: opted-in app receives a verified release; own-node work must not be interrupted | Writer stage → session → SafeRestartMoment → authenticated request to the embedded launch endpoint. Neither renderer nor HTTP route can activate. Missing credential, non-200, redirect, malformed counts and failures are not an idle answer. The process and application managers inspect concurrently; both finalize synchronously after the slower owner. Current membership/object, status and synchronous background work are reread. Missing/unavailable/late inspection cannot certify an idle run. Recorder reuses the observation with its distinct best-effort reminder policy. |
| SCN-003: user uses an app window during the wait | Listener is installed at managed composition before window creation; monotonic clock for each contents' input. After busy query the watch checks token and fresh quiet, rearms as necessary, then calls session admission without yielding. Same stage/generation, channel, switch, block, no intent/latch and available restart channel are checked before assigning intent and calling stop. Physical input in a packaged session remains a QA gate. |
| SCN-004: intentional Quit while waiting or in flight | before-quit latches and cancels before windows close, except the session's own terminal quit. will-quit owns ordinary quit or defers to the already-running transaction. Confirmed settlements honor latch before writing the restart indication; unknown settlement with Quit exits 1. No second activation. |
| SCN-005, 006: install by hand or opt out | Click claims a manual intent and cancels watch. Preference change invalidates generation/pending stage. After stop, session rechecks consent separately from ending before dispatch; click does not inherit an automatic version block. Native activation policy excludes both managed modes. |
| SCN-007: refused, lost or unknown outcome; missing restart channel | Hash status distinguishes committed, confirmed old and unknown; known receipt-loss has its own event, unknown cannot request reopen. No channel → quit-only, not a fallback to native. Automatic refusal records a blocked version, still offering manual recovery. The presentation now honors that independent block (below). |

**Material premises:** ARCH-REV-002 MP-001 (input while query pending), MP-002 (unavailable snapshot and changing owners), MP-003 (Quit while activation pending) confirmed against code and focused IR tests. No new production scenario. Post-admission work starting during shutdown is explicitly outside the gate; reject a requirement for a new global run lock. No change to trust, sandbox, writer, native protocol or running-data formats.

## Prior finding and evidence decision

**F-CR-001 · resolved; no new findings.** SCN-007 / AC-007–008 explicitly allow a manual retry after a writer refusal. The prior failure was a promise to reopen automatically, not an unauthorized activation. Traced the same-version manual download through verification and the updater's ready event (sets staged status and release version). The record continues to own the automatic install block even if a manual failure becomes the visible outcome. AppUpdater.getState() reads the block from that record for full snapshots and broadcasts; it is not a writable policy input. The disabled updater supplies null. Pinia retains the value for unrelated partial updates and clears it on explicit null. Both staged surfaces now select copy with managedReadyMessageKey using staged version, block, mode and switch. A matching block takes precedence; a different version is not suppressed. No-channel guidance does not promise a blocked install on quit. Native readiness remains with its existing owner. No manual action or authority moved.

[IR-002 checks](evidence/IR-002-checks.txt): prior red; green updater, store and mounted components for refused, manual-masked and eligible cases; English and Chinese renderings with manual action. Verified assertions and fixtures against the failure trace. The existing source-level, type, route and renderer results ([IR-001 checks](evidence/IR-001-checks.txt)) remain evidence only for the paths they exercise. No redundant rerun; neither round proves signed, no-click reopening in a guest.

## Structure, ownership and local source audit

One session owns activation; pass-through composition stays separate from wait policy, input observation and HTTP. One shared run observation with distinct reminder/safety consumers. Platform-private manager stays inside the scope. Presentation shares a read-only fact, not activation authority. Accepted small naming variation (composeManagedUpdates.ts). No orphan activation path, stale new flag, compatibility shim, dual read/write, or required migration. Docs impact: GLOSSARY.md and autobyteus-web/docs/linux-managed-desktop.md updated; ordinary quit remains closed. No additional documentation change identified here.

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
| `autobyteus-web/components/notifications/NotificationRow.vue` | 165 | 170 |
| `autobyteus-web/components/settings/AboutSettingsManager.vue` | 292 | 295 |
| `autobyteus-web/electron/application/composeManagedUpdates.ts` | 0 | 30 |
| `autobyteus-web/electron/application/electronApplication.ts` | 480 | 472 |
| `autobyteus-web/electron/application/managedUpdateSession.ts` | 147 | 177 |
| `autobyteus-web/electron/application/userInputActivity.ts` | 0 | 11 |
| `autobyteus-web/electron/server/embeddedBusyRuns.ts` | 0 | 11 |
| `autobyteus-web/electron/updater/appUpdateAutomaticPolicy.ts` | 148 | 148 |
| `autobyteus-web/electron/updater/appUpdater.ts` | 500 | 500 |
| `autobyteus-web/electron/updater/disabledAppUpdater.ts` | 78 | 79 |
| `autobyteus-web/electron/updater/safeRestartMoment.ts` | 0 | 35 |
| `autobyteus-web/localization/messages/en/updateNotifications.ts` | 131 | 136 |
| `autobyteus-web/localization/messages/zh-CN/updateNotifications.ts` | 131 | 136 |
| `autobyteus-web/shared/appUpdateTypes.ts` | 142 | 144 |
| `autobyteus-web/stores/appUpdateStore.ts` | 266 | 268 |
| `autobyteus-web/utils/managedUpdateReadiness.ts` | 0 | 12 |

## Scorecard

Scores are out of 10; mean 9.4 is descriptive, not a pass rule.

| Priority / category | Score | Basis; outstanding improvement |
| --- | ---: | --- |
| 1. Data-flow spine | 9.5 | Verified stage → quiet/busy → admission → one stop, commit and ending is traceable. No structural action. |
| 2. Ownership / boundaries | 9.4 | Session owns admission; record owns failed version; no duplicate writer authority. The UI reads the fact without policy authority. |
| 3. API / interfaces | 9.4 | Count contract distinguishes unknown; shell projects version-specific eligibility from the record for both surfaces. No further change. |
| 4. Separation / placement | 9.5 | Separate composition, timing and I/O; no unrelated subsystem move. |
| 5. Shared data model | 9.3 | Same busy observation, separately owned policies; one transient block projection independent of visible outcome. No duplicate persistence. |
| 6. Naming / readability | 9.4 | Consent and ending name distinct decisions. No naming change needed. |
| 7. API/E2E readiness | 9.2 | Scoped tests, built route, localized previews and explicit real-guest plan; blocked-copy regressions now present; execute the independent guest plan. |
| 8. Runtime correctness / fidelity | 9.4 | Activation guards and truthful blocked/manual readiness on both surfaces verified at source scope. Packaged timing/reopen proof belongs to AC-011. |
| 9. No compatibility / legacy retention | 9.5 | No mixed-version fallback; no-channel quit-only behavior is required. |
| 10. Cleanup | 9.5 | Superseded construction and overloaded flag removed; no obsolete source left by this change. |

**Next owner: API/E2E Engineer.** No unresolved source finding or new follow-up (FU-001 remains separate). Independently exercise signed branch N→N+1 in disposable Ubuntu 24.04 with genuine busy/input deferral, no-click reopen and live successor/server, persisted work and automatic notification, plus a separate Quit that stays closed. Include refusal/tamper, manual retry and copy, opt-out and applicable no-channel controls. No production keys, user installation, public release or target push. This is a source pass, not AC-011 or delivery.
