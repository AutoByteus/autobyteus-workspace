# Implementation Revision Record — automatic-app-node-updates (autobyteus-356)

The current code and `implementation-handoff.md` remain authoritative. This record locates the initial baseline and later rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, ARCH-REV-002 Pass | N/A | `Initial Baseline` | SR-003, ARCH-REV-002 | Implemented; ready for code review |
| IR-002 | Code Reviewer, `code-review-report.md`, CRR-002 (failure-origin review of API-REV-001) | F-API-001, F-API-002 | `Local Fix` | SR-003, ARCH-REV-002, CRR-002, API-REV-001 | Fixed; ready for source review, then API/E2E |
| IR-003 | Architecture Reviewer, `design-review-report.md`, ARCH-REV-005 Pass (SR-004..SR-006, from CRR-004, F-API-003, CR-C12) | F-API-003, CR-C12 | `Design Impact` (revised design implemented) | SR-006, ARCH-REV-005, CRR-004 | Implemented; ready for source review, then API/E2E |

## Revision Entries

### IR-001 — Automatic app and node updates behind desktop switches

- Triggering role, report path, and round: Architecture Reviewer,
  `tickets/in-progress/automatic-app-node-updates/design-review-report.md`, ARCH-REV-002 (Pass, notes N-6, N-7, N-8).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: the design's Change Sequence steps 1–5 are implemented (commits `b4bda46484`,
  `9369828ca7`, `63f5bb8bfc`, `8cf4278319`, plus `31d38080fc` with the two fixes from the rendered check). Local checks and the rendered check pass (`implementation-handoff.md`,
  Checks Run).
- Related solution revision IDs: SR-003.
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: the first implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001..003; REQ-001..006; AC-001..006.
- Implementation delta:
  - app switch store, the record fields and reconcile;
  - AppUpdater DS-001/DS-002 hooks with `AppUpdateAutomaticRun`;
  - set-automatic IPC;
  - the node record, decision, client, updater and IPC;
  - the `set-auto-update` registry change;
  - `recoverAfterFailedInstall`;
  - renderer switches and outcomes;
  - docs.
- Changed files or areas: `autobyteus-web/electron/updater/*`, `electron/nodeAutoUpdate/*` (new),
  `electron/application/electronApplication.ts`, `electron/nodeRegistryStore.ts`, `shared/*`, `types/node.ts`,
  stores, notification and node components, localization, `docs/settings.md`, `docs/electron_packaging.md`.
- Local validation and result: IMP-01..IMP-08 Pass (see the handoff).
- Next recipient or routing: Code Reviewer (Medium / High).
- Remaining limitations or risks: see the handoff's Known Risks. Real packaged install and restart, and a real Docker
  node, are left to API/E2E.

### IR-002 — Sidebar counts the app outcome; a failed automatic install settles before recovery

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md`, CRR-002 (round 2, failure-origin
  review of `api-e2e-execution-coverage-report.md`, API-REV-001).
- Triggering finding IDs: F-API-001, F-API-002.
- Classification: `Local Fix`.
- Prior authoritative result: IR-001 passed source review (CRR-001) and failed API/E2E on these two findings.
- Current authoritative result: both are fixed (`aa096836d9`, `6a94169f4f`). Local checks pass. The real native
  refusal has not been re-run: it is API-05's repeat.
- Related solution revision IDs: SR-003.
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: CRR-001, CRR-002.
- Related API/E2E revision IDs: API-REV-001.
- Related delivery revision IDs: N/A.
- Why this revision is recorded: two implementation-owned findings from the real-install validation.
- Approved behavior or requirement IDs affected: BEH-001, BEH-003; REQ-004, REQ-005; AC-002, AC-005.
- Implementation delta:
  - **F-API-001.** The store exposes `automaticOutcomeRows`, and `unreadOutcomeRows` derives from it. The sidebar uses
    that set plus its "seen this visit" rule, so its own app-excluding filter is gone.
  - **F-API-002.** New `AppUpdateInstallAttempt` owns the delay, the preparation and `quitAndInstall`. On an automatic
    install failure, `AppUpdateAutomaticRun` records it and settles the attempt first:
    - before the preparation started: the install is cancelled, nothing stopped, and no recovery runs;
    - during or after it: wait for the preparation, skip `quitAndInstall`, then run recovery, which reads
      `isServerProcessGone()` only now.
  - **F-API-002, beyond the finding's text.** `quitAndInstall` is skipped once the failure is known. Otherwise it would
    run for an install the updater had already refused, when the preparation ended.
  - **F-API-002 secondary.** A download rejection for a version whose automatic install was requested no longer
    replaces the install-failure state (`installRequestedFor`).
  - **Rendered-check fix.** The handled row's check icon stays beside a long version (`6a94169f4f`).
- Changed files or areas: `electron/updater/appUpdateInstallAttempt.ts` (new), `appUpdateAutomaticRun.ts`,
  `appUpdater.ts`; `stores/updateNotificationsStore.ts`; `components/layout/SidebarNotificationsEntry.vue`;
  `components/notifications/NotificationRow.vue`; specs; `docs/electron_packaging.md`, `docs/settings.md`.
- Local validation and result: IMP-01, IMP-02, IMP-09, IMP-10 Pass (see the handoff).
- Next recipient or routing: Code Reviewer (Medium / High), then API/E2E (repeat API-02's sidebar check and API-05).
- Remaining limitations or risks: the fix for the refusal timing is proven by unit tests with a controlled preparation,
  not yet by a real Squirrel refusal. CR-C2 (an error after `before-quit`) is unchanged.

### IR-003 — On macOS the automatic install waits for the system updater's copy

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md`, ARCH-REV-005 (Pass), on
  `design-spec.md` SR-006.
- Triggering finding IDs: F-API-003, CR-C12 (through SR-004..SR-006).
- Classification: `Design Impact`, resolved by the Solution Designer; this round implements the revised design.
- Prior authoritative result: IR-002 passed review (CRR-003) and failed API/E2E round 2 (F-API-003).
- Current authoritative result: implemented in `2e64cbb3d9`. Local checks pass. A real Squirrel refusal and the preparing
  state are seen on a real build (IMP-12). A real native success, and so a real install through the wait, is not yet run.
- Related solution revision IDs: SR-004, SR-005, SR-006.
- Related architecture-review revision IDs: ARCH-REV-005.
- Related code-review revision IDs: CRR-004.
- Related API/E2E revision IDs: API round 2.
- Related delivery revision IDs: N/A.
- Why this revision is recorded: it replaces the macOS install order for the automatic path; the click keeps today's order.
- Approved behavior or requirement IDs affected: BEH-001, BEH-003; REQ-002, REQ-004; AC-002, AC-005.
- Implementation delta:
  - `AppUpdateInstallReadiness` (new): readiness, its version, the one pending wait and its 15-minute bound;
  - `AppUpdateAutomaticPolicy` (new, not in the design's file map): the automatic sequence moved out of `appUpdater.ts`
    (CR-C7), including `installWhenReady` and the `error` handler's first two steps;
  - `preparationFailed` on the run; the record ignores `download` over `{ V, 'install' }`;
  - the wait guard in `checkForUpdates` and `downloadUpdate` (N-17); a click ends the wait; N-13 and N-19;
  - `install-preparation` in the classifier, both display maps and localization; `automaticInstallPreparing`;
    `outcomeStep` and the row's not-retried sentence; plain reasons.
- Changed files or areas: `electron/updater/*`, `shared/appUpdateTypes.ts`, `stores/appUpdateStore.ts`,
  `stores/updateNotificationsStore.ts`, `utils/appUpdateErrorDisplay.ts`, `NotificationRow.vue`,
  `AboutSettingsManager.vue`, localization, specs, `docs/electron_packaging.md`.
- Local validation and result: IMP-01, IMP-02, IMP-11, IMP-12 Pass (see the handoff).
- Next recipient or routing: Code Reviewer (Medium / High), then API/E2E.
- Remaining limitations or risks: see the handoff's Known Risks.
