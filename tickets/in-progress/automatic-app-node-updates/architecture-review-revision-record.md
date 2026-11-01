# Architecture Review Revision Record — automatic-app-node-updates (autobyteus-356)

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / initial review of SR-002 | SR-002 | N/A | Fail (Design Impact) | AR-001, AR-002 |

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
