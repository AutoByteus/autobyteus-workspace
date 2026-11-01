# Code Review Report — automatic-app-node-updates (autobyteus-356)

All ticket paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/`.

## Review Round Meta

- Review Entry Point: `Implementation Review`
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

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 / 10; every category ≥ 9.2
- Recommended Recipient: API/E2E engineer
- Notes: reviewed the five code commits up to `31d38080fc`. The six implementation deviations are accepted (CR-C1).
