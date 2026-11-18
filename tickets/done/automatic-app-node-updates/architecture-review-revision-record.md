# Architecture Review Revision Record — automatic-app-node-updates (autobyteus-356)

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / initial review of SR-002 | SR-002 | N/A | Fail (Design Impact) | AR-001, AR-002 |
| ARCH-REV-002 | Round 2 / review of SR-003 | SR-002, SR-003 | Fail (Design Impact) | Pass | AR-001, AR-002 resolved |
| ARCH-REV-003 | Round 3 / review of SR-004 (CRR-004) | SR-002, SR-004 | Pass | Fail (Design Impact) | AR-003, AR-004 (blocking), AR-005, AR-006 new; reviewer miss recorded |
| ARCH-REV-004 | Round 4 / review of SR-005 | SR-002, SR-005 | Fail (Design Impact) | Fail (Design Impact) | AR-003 to AR-006 resolved; AR-007 (blocking) new |
| ARCH-REV-005 | Round 5 / review of SR-006 | SR-002, SR-006 | Fail (Design Impact) | Pass | AR-007 resolved by an equivalent route |

## Revision Entries

### ARCH-REV-001 — Initial baseline: sound gates, no downgrade, desktop-only switches; the in-process install failure is undefined

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/design-review-report.md`
- Review round and trigger: Round 1. `/software_engineering_team/solution_designer` sent SR-002 as `Architecture Design Complete` (Medium/High). User approval of the design: `Not required`.
- Triggering role, report path, and finding IDs: Solution Designer; `handoff.md`; N/A.
- Relevant solution revision IDs: SR-002.
- Prior authoritative decision: N/A.
- Current authoritative decision: Fail (Design Impact).
- Baseline established (code at `099ae1031f` / `3b9dc912a1`):
  - `installUpdateAndRestart` refuses unless the status is `downloaded`. It stops the server through `prepareForInstall`, then calls `quitAndInstall` (fire-and-forget).
  - Native install failures arrive as the updater's `error` event.
  - `allowDowngrade = false` is applied before every check, and the `channel` setter is avoided.
  - `updateStaged` is sticky while the status moves on.
  - `/rest/node-update` is `TRUSTED_NETWORK_OWNER` and needs no credential from the trusted network, so a main-process client works.
  - The tolerant readers keep only known shapes.

#### Prior Finding Resolution

None (first round).

- New or remaining finding IDs:
  - AR-001 (Medium-High, blocking):
    - an `error`, or no quit within a bound, after an automatic install request records an install failure, never a download failure;
    - `blocksAutomatic` also covers an install already requested in this process;
    - `ElectronApplication` restores a working old version through an injected hook (for example relaunch);
    - add tests.
  - AR-002 (Low): write `automatic` only when the install request is accepted; define the switch-on path for a staged update whose status moved on.
- Non-blocking notes:
  - N-1: general shell tools versus REQ-006's surfaces;
  - N-2: an unconfirmed server exit (339 DEC-005) in an unattended run;
  - N-3: an installer failure after quit leaves the app closed;
  - N-4: sequential node follows;
  - N-5: DEC-001's cost.
- Material classification changes: none (Medium/High).
- Recommended recipient: `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty: the exact macOS Squirrel trigger for P-001 is to be shown in validation.

### ARCH-REV-002 — SR-003: in-process install failure detected and recovered; accepted-only record; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/design-review-report.md`
- Review round and trigger: Round 2. `/software_engineering_team/solution_designer` sent SR-003, the design revision for ARCH-REV-001.
- Triggering role, report path, and finding IDs: Solution Designer; `handoff.md` § Revision SR-003; AR-001, AR-002.
- Relevant solution revision IDs: SR-002 (approval, unchanged), SR-003 (design).
- Prior authoritative decision: Fail (Design Impact).
- Current authoritative decision: Pass.
- What changed:
  - SR-003 is docs only (head `51d79f2db1`).
  - DS-002 was redrawn.
  - Also verified: the `activeOperation` lifecycle in `appUpdater.ts`.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Medium-High, blocking) | Resolved | SR-003 | DS-002 now has: the in-process gate `installRequestedVersion` in `blocksAutomatic`; failure detection by (a) the catch, (b) `error` while `activeOperation === 'install'`, (c) no `before-quit` within 60 s, each recorded as `install` (the download hook acts only while `'download'`); `ElectronApplication.recoverAfterFailedInstall` relaunching only when the server is gone (284 rule); a reconcile for a late install-on-quit. Unit cases are listed. FU-003 is added |
| AR-002 | Open (Low) | Resolved | SR-003 | `automatic` is written only on `accepted: true`. A staged update whose status moved on goes through `startAutomatic(V)`, with a required re-emit test against 6.8.9 and an escalation if it fails |

- New or remaining finding IDs: none.
- Non-blocking notes:
  - N-6 (a check inside the bound overwrites `'install'`; test the backstop and an idempotent recovery);
  - N-7 (`app.exit` skips the quit events);
  - N-8 (the re-emit test);
  - N-1 to N-5 stated in the spec.
- Material classification changes: none (Medium/High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`, with an informational notification to the Solution Designer.
- Remaining risks or uncertainty: the macOS refused-install trigger and the re-emit, both shown in validation and tests.

### ARCH-REV-003 — SR-004: direction A is right; a native refusal's end state and the promise premise must be fixed

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/design-review-report.md`
- Review round and trigger: Round 3. `/software_engineering_team/solution_designer` sent SR-004, the design revision for CRR-004 F-API-003 and CR-C12.
- Triggering role, report path, and finding IDs: Code Reviewer, `code-review-report.md` round 4 (F-API-003, CR-C12), via the Solution Designer.
- Relevant solution revision IDs: SR-002 (approval), SR-004 (design; REQ-002, REQ-004, AC-002 and AC-005 sharpened within the direction).
- Prior authoritative decision: Pass (ARCH-REV-002).
- Current authoritative decision: Fail (Design Impact).
- What changed in the review result:
  - Read electron-updater 6.8.9's `MacUpdater.js` and `AppUpdater.js`, and the API/E2E logs.
  - Direction A, `AppUpdateInstallReadiness`, the reset ordering, the 15-minute bound, the switch and the manual check all hold.
  - The electron-updater half of the cached path holds on macOS; the native half stays with API/E2E.
- **Reviewer's own miss in ARCH-REV-002:** I passed signal (c), the 60 s quit bound, and wrote notes about electron-updater's behavior without reading `MacUpdater.js`. The library was not installed in the worktree, and I stopped my search for a copy instead of installing or finding one. `:240-256` would have shown that the quit follows Squirrel's work, which is F-API-003. The escalation trigger was in the design, and I did not close it. A bound on a third-party sequence needs that sequence's source opened.
- **Near miss in this round:** my first reading of `:219-226` agreed with the design that the promise never resolves, and it suggested a hang on the cached path. Reading the request handler at `:184-188` refuted both. So the hang is not a finding, and the design's premise is (AR-004).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved | Resolved; signal (c)'s premise corrected by SR-004 | CRR-004 F-API-003; SR-004 | The automatic path now waits for the native event before any stop, so the bound measures only the quit (`MacUpdater.js:241-243`). Signals (a) to (c) and recovery still apply after the stop |
| AR-002 | Resolved | Resolved | SR-003, SR-004 | Still accepted-only. The switch-on paths now go through `installWhenReady` |

- New or remaining finding IDs:
  - **AR-003** (Medium, blocking): a native refusal clears `updateStaged`, so automatic checks resume and a newer version can be found. State the 15-minute bound's residual.
  - **AR-004** (Medium, blocking): correct "does not resolve on Squirrel's success" with the two timings. Until V's promise settles, a later `error` or rejection changes nothing. A `download` failure never replaces an `install` failure for V. Add a test for each timing.
  - **AR-005** (Low): the About page must not show "couldn't restart … Try again" for an automatic failure (`errorKind: 'install'`); the row already shows the plain reason.
  - **AR-006** (Low): an accepted click ends the wait.
- Non-blocking notes:
  - N-9 (restore `downloaded` instead of a second native fetch);
  - N-10 (a click on Download during the wait);
  - N-11 (the file map omits `appUpdateAutomaticRun.ts` and `appUpdateInstallAttempt.ts`; the wait's failure needs its own method);
  - N-12 (FU-004 widened to the bound);
  - N-1 to N-8 carried.
- Material classification changes: none (Medium/High).
- Recommended recipient: `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty: F-15's native half, which API/E2E runs on real Squirrel.

### ARCH-REV-004 — SR-005: refusal end state fixed; a failed manual check must not read as a refusal

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/design-review-report.md`
- Review round and trigger: Round 4. `/software_engineering_team/solution_designer` sent SR-005, the design revision for ARCH-REV-003.
- Triggering role, report path, and finding IDs: Solution Designer; `handoff.md` § Revision SR-005; AR-003 to AR-006.
- Relevant solution revision IDs: SR-002 (approval; sharpened in SR-004, unchanged since), SR-005 (design).
- Prior authoritative decision: Fail (Design Impact).
- Current authoritative decision: Fail (Design Impact).
- What changed in the review result: SR-005 is docs only (head `6f3ccdf2f6`). The wait was redrawn for both refusal timings, a click, a manual check and the bound.
- **Reviewer's own miss in ARCH-REV-003:** I called the manual check during the wait "sound" after tracing only a successful check, and my AR-004 asked for the wait-first order without asking which errors can reach it. `AppUpdater.js:269-272` was in the file I had open. AR-007 is therefore partly a correction of my own instruction, not a designer's error.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-003 | Open (Medium, blocking) | Resolved | SR-005 | The wait's native-error end sets `updateStaged: false`, so `isBusy()` is false and checks run (`appUpdateCheckSchedule.ts:112`). `downloadPromise` has cleared in both timings, so W can download. The 15-minute bound's residual is stated. Tests are listed |
| AR-004 | Open (Medium, blocking) | Resolved; rule 1 narrowed by AR-007 | SR-005 | F-13 and DS-002 now state the two timings, which match `MacUpdater.js:184-189` and the logs. The handler's order is wait → `settlingFailedPreparation` → today's. The flag spans error #2 and the rejection and clears in `finally`. The record refuses `download` over `install` for V. One test per timing |
| AR-005 | Open (Low) | Resolved | SR-005 | New kind `install-preparation`, set directly, with its own About text. The click's text is unchanged |
| AR-006 | Open (Low) | Resolved | SR-005 | An accepted `installUpdateAndRestart()` ends the wait and its bound. Test listed |

- New or remaining finding IDs:
  - **AR-007** (Medium, blocking): while a check is in flight, an `error` takes today's handling and the wait keeps running. Complete the native end's branches for status `error`, `checking` and others. Add tests.
- Non-blocking notes:
  - N-13 (N-9's restore on the switch-on path too);
  - N-14 (guard `preparationFailed(V)` against W's record);
  - N-15 (a native error after the bound);
  - N-16 (two error-kind maps, localization, its own in-flight marker);
  - N-1 to N-12 carried or done.
- Material classification changes: none (Medium/High).
- Recommended recipient: `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty: F-15's native half, which API/E2E runs on real Squirrel.

### ARCH-REV-005 — SR-006: no check during the wait; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/design-review-report.md`
- Review round and trigger: Round 5. `/software_engineering_team/solution_designer` sent SR-006, the design revision for ARCH-REV-004, with three claims to attack.
- Triggering role, report path, and finding IDs: Solution Designer; `handoff.md` § Revision SR-006; AR-007.
- Relevant solution revision IDs: SR-002 (approval; sharpened in SR-004, unchanged since), SR-006 (design).
- Prior authoritative decision: Fail (Design Impact).
- Current authoritative decision: Pass.
- What changed: SR-006 is docs only (head `75793e0a8b`). I attacked the three claims by reading every status writer and every `error` source. Claims 1 and 2 hold; claim 3 holds with one rare exception (N-18).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-007 | Open (Medium, blocking) | Resolved by an equivalent, stronger route | SR-006; F-17 | `checkForUpdates` returns the current state while a wait is pending, for every source. `automaticInstallPreparing` disables the one check button and shows the text. With no check running, a check's `error` cannot reach the handler during the wait, and status stays `downloaded`, so the native end's two branches are complete. Tests are listed |

- New or remaining finding IDs: none.
- Non-blocking notes:
  - N-17 (guard `downloadUpdate()` during the wait too);
  - N-18 (a failed `copyFile` after the served zip is a rare exception to claim 3);
  - N-19 (switch on while a manual check runs: `startAutomatic` with no wait; N-13's rule could cover it);
  - N-1 to N-8 and N-15 carried.
- Material classification changes: none (Medium/High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`, with an informational notification to the Solution Designer.
- Remaining risks or uncertainty: F-15's native half, which API/E2E runs on real Squirrel.
