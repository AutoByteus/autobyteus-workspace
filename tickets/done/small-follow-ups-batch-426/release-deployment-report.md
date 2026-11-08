# Delivery / Release / Deployment Report — small-follow-ups-batch-426 (autobyteus-426), ticket round 2

This report holds the latest delivery round (DR-002, ticket round 2, the last). The round-1 report (DR-001) is in git at `d785ded109`.

## Release / Publication / Deployment Scope

This round finalizes ticket round 2 (items 9, 20, 21, 22, 23) into `personal` and archives the ticket. There is no release: the Task says "release only on the user's word", and RELEASE.md's default is no release. Round 1 is already in v1.5.12-beta.8 (released by autobyteus-431).

## Project Release Guide

- Release guide path and revision: `RELEASE.md` on `origin/personal` @ `eebbc2b8ee`, last changed in `df789a89a5`, read in the ticket worktree after the merge.
- Deviations from the guide and why: `None`. Round 2 is the last round, so the ticket now moves to `tickets/done/`.
- Proposed guide fixes: `None`.

## Handoff Summary

- Handoff summary artifact: `tickets/done/small-follow-ups-batch-426/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/small-follow-ups-batch-426/delivery-revision-record.md`
- Current delivery revision ID: `DR-002`
- Notes: `Medium` / `High`, route `Reviewed`. Delivery did not change the classification.

## Initial Delivery Integration Refresh

- Bootstrap base reference: round 1 finalized at `d785ded109`; round 2 was built on it.
- Latest tracked remote base reference checked: `origin/personal` @ `eebbc2b8ee`
- Base advanced since bootstrap or previous refresh: `Yes`, by 2 commits:
  - `a1ea19c0eb`, the v1.5.12-beta.8 release bump of `autobyteus-web/package.json` (`1.5.12-beta.7` → `1.5.12-beta.8`);
  - `eebbc2b8ee`, autobyteus-431's delivery records.
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed`. `637534f27c` commits the code reviewer's CRR-007/CRR-008 records.
- Integration method: `Merge` (`0714ea1e68`)
- Integration result: `Completed`. There were no conflicts. Outside the version field, the base changes only `tickets/`.
- Post-integration executable checks rerun: `Yes`. DEL-R2-01 on `0714ea1e68` (`evidence/delivery/DEL-R2-01-focused-checks.txt`):
  - `pnpm -C autobyteus-web exec vitest run` on the five round-2 specs (`useRunHistorySectionLoad`, `agentRunCollaborationStatuses`, `agentRunCollaborationListedStatuses`, `runHistoryActiveListedRuns`, `nodeConnectionErrorText`): `Test Files 5 passed (5)`, `Tests 25 passed (25)`.
  - `pnpm -C autobyteus-server-ts exec vitest run` on `agent-run-collaboration-statuses`, `peer-address-resolver`, `peer-client` and `request-origin` (D-23's origin rule): `Test Files 4 passed (4)`, `Tests 33 passed (33)`.
- Post-integration verification result: `Passed`
- No-rerun rationale for the probes and full suites: the base changes only a version string. RELEASE.md says delivery audits and does not redo.
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes` (re-checked before the merge; see Repository Finalization)

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: the execution report's § Ticket Round 2 (API-REV-003): Acceptance-Criteria Proof and Cases; final confidence 95% in all seven categories; the raw evidence below; and DEL-R2-01.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement (`Proven`/`Not Proven`/`User Check`) |
| --- | --- | --- | --- |
| AC-009a (critical) | T2-01 raw `T2-01/mobile-shell-probe.json` MSP-20; `MSP-20-phone-child-running.png` (opened) | `quiet`: 3 status reads and 0 view reads on each surface; desktop read 1650 B for 7 statuses (≤ 2 KB); `running` seen 4570 / 4992 ms after the node; `idleAgain` 210 / 828 ms; view reads 0. The screenshot shows child A running (blue) under the unopened Status Hub | Proven |
| AC-009b (critical) | MSP-20 `third`, `stop` | New child: 5272 / 5277 ms with exactly 1 view read per surface. Stop: offline on all three rows at 1897 / 2324 ms with 1 view read each | Proven |
| AC-009c (critical) | MSP-20 `phoneHidden`, phone timings; MSP-12 | `onRunScreen 0`, `inBackground 0`, `firstReadAfterShownMs 41`; the phone sees states within one poll | Proven |
| AC-009d | MSP-20 `openRun` (`hubInRead 0`); T2-R1 spec | The open run is not in the status read | Proven |
| AC-020 (critical) | (1) T2-04 `✓ peer-host-refused.e2e.test.ts (2 tests)`; (2) T2-02 NP-13 summary and `NP-13-change-address-host-refused.png` (opened); (3) T2-R1 web spec plus T2-04's `host_refused` attempt | (2) The page shows "The node at this address doesn’t accept the name lvh.me. Add lvh.me to AUTOBYTEUS_ALLOWED_HOSTS on that node, or use its IP address."; a non-node answer still shows "isn't an AutoByteus node"; the address is unchanged (`before == after`). (3) cannot be reached through the real page, because the window refuses the name before connecting (DEC-017, FU-004); it is proven where it can be | Proven |
| AC-021 | T2-03 `T2-03-token-statistics-days.txt`; T2-R4 | Pass with `failures []` on 2026-12-07, 2026-12-20 and the real clock; 12-01 in IMP-R2-04 | Proven |
| AC-022 | T2-R2 (IMP-R2-03) | MRP-01…07 Pass | Proven |
| AC-023 | T2-R1, T2-R3, T2-04 (`request-origin-and-phone-routes` 11/11); DEL-R2-01 `request-origin` | Origin and allow-list tests unchanged and passing | Proven |

- Regression: T2-01 runs all 20 mobile-shell cases, including round 1's (Pass); T2-04 runs the full server E2E (117 passed / 0 failed); T2-05 is a fresh-start desktop build (exit 0).
- More evidence requested: `None`.
- One non-blocking note on the report: its T2-01 row quotes the stop timings of `T2-01-debug3` (1942 / 2364 ms) instead of the authoritative run's 1897 / 2324 ms. Both are within one poll, so the judgement is unchanged. I am not routing it back.
- User check needed: `No`. Nothing needs the user's accounts or nodes, and the user did not ask to check.
- Re-verification after later re-integration: `Not needed` (see Repository Finalization).

## Release Decision

- Decision: `No release`
- Decided by: the Task ("release only on the user's word") and RELEASE.md § Release Decision (default "No release"). A beta or stable release is available on request.

## Docs Sync Result

- Docs sync artifact: `tickets/done/small-follow-ups-batch-426/docs-sync-report.md` (§ Ticket Round 2)
- Docs sync result: `Updated`
- Docs updated:
  - `autobyteus-web/docs/workspace_layout.md`, `autobyteus-web/docs/remote_access.md`, `autobyteus-web/docs/settings.md`;
  - `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md`, `autobyteus-server-ts/docs/modules/remote_collaboration.md`;
  - `docs/android_mobile_access.md`.

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes`
- Archived ticket path: `tickets/done/small-follow-ups-batch-426/`

## Version / Tag / Release Commit

- None (no release).

## Repository Finalization

Recorded in § Finalization Record after the merge and push.

## Release / Publication / Deployment

- Applicable: `No`
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required`. `release-notes.md` covers both rounds and has no `## What you need to do` section.

## Post-Finalization Cleanup

Recorded in § Finalization Record.

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `release-notes.md` (round 1, updated for round 2)
- Archived release notes artifact used for release/publication: N/A (no release)
- Release notes status: `Updated`

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected`. D-09 adds a read and nothing is stored.
- Delivery action required: `None`

## Rollback Criteria

- Revert the round-2 merge on `personal` (RELEASE.md § Rollback). No data changed, so rolling back is possible.
