# Implementation Revision Record — automatic-app-node-updates (autobyteus-356)

The current code and `implementation-handoff.md` remain authoritative. This record locates the initial baseline.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, ARCH-REV-002 Pass | N/A | `Initial Baseline` | SR-003, ARCH-REV-002 | Implemented; ready for code review |

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
