# Delivery / Release / Deployment Report — autobyteus-446

Status: **Completed**, DR-001. Verified from the evidence and finalized into `personal` at `921d02f639`. No release.

## Release / Publication / Deployment Scope

Finalize `codex/phone-run-list-follow-446` into `personal`. No release: the handoff says to release only on the user's word, and none was given.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` on `origin/personal` `af75cdd544`; unchanged at `8338f97e59`.
- Deviations from the guide and why: none.
- Proposed guide fixes: none.

## Handoff Summary

- Handoff summary artifact: `tickets/done/phone-run-list-follow-446/handoff-summary.md`. Status: `Updated`.
- Delivery revision record: `delivery-revision-record.md`. Current delivery revision ID: `DR-001`.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `a85bf4f38d` (v1.5.12-beta.10).
- Latest tracked remote base reference checked: `af75cdd544`.
- Base advanced: `Yes`, by 14 commits (autobyteus-436, node files on the phone; v1.5.12-beta.11).
- Local checkpoint commit: `Not needed`. The worktree was clean apart from untracked `dist/` build output.
- Integration: `Merge`, commit `6129b2e983`. `mobile-shell-probe.mjs` merged automatically; no duplicate case IDs.
- Post-integration checks rerun: `Yes`, all passed:
  - contracts `dist` rebuilt from `src`: no diff (tracked by design; `TESTING.md` build inputs);
  - `pnpm install --frozen-lockfile`: exit 0;
  - contracts `node --test tests/closed-task-executions-digest.test.mjs`: pass 5, fail 0;
  - server `vitest run` (statuses resolver, standalone root, `node-files`, `node-access`): 10 files, 66 tests;
  - web `vitest run` (`services/agentCollaboration`, listed-statuses store, mobile root shell, `components/mobile`, `composables/mobile`, event-monitor file preview specs): 30 files, 280 tests;
  - `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web`: exit 0;
  - full phone probe (`evidence/DEL-01-merged-mobile-shell/`): all 27 cases Pass, cleanup complete.
- The probe's verdict is `Fail` only because of `unknownBrowserErrors: 52`. Every one is `phone console: Failed to load resource: … 401 (Unauthorized)`, logged after MSP-13 revokes the main phone (cases MSP-21…27). That is the pre-existing FU-003 class API/E2E traced in API-09; API-08 had 48.
- Post-integration verification result: `Passed`.
- Delivery edits started only after the integrated state was current: `Yes`.

## Verification

- Evidence judged: `Sufficient`.
- Evidence relied on:
  - `api-e2e-execution-coverage-report.md`: 95.6%, no category below 95%;
  - `evidence/API-08-mobile-shell-probe/mobile-shell-probe.json` (pre-merge);
  - `evidence/DEL-01-merged-mobile-shell/mobile-shell-probe.json` (merged).

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 | MSP-24 (API-08, DEL-01) | `goneAfterCloseMs` otherA 4279 / otherB 3368 (DEL-01: 4214 / 3307), ≤ 10 000 | Proven |
| AC-002 | MSP-27 | Desktop window, open run a plain run: `goneAfterCloseMs` 1345 (1327); `viewReadsAfterClose` 1; `quietViewReads` 0 | Proven |
| AC-003 | MSP-24 | `rowBackAfterReactivationMs.other` 950 (1024). After TODO alone: `nodeStillClosed: true`, both phones agree. Reopen follows the node's documented reactivation rule | Proven |
| AC-004 | MSP-24, MSP-14 | Host phone: rows gone before the close was stored (`hostA` -495, `hostB` -480); MSP-14 Pass | Proven |
| AC-005 | MSP-24, MSP-27 | 50 s quiet: 10 history reads, 10 statuses reads, 0 view reads; 1 view re-read per change, 0 in the next 15 s | Proven |
| AC-006 | MSP-25 | While hidden: history 0, statuses 0, views 0; `goneAfterShownMs` 102 (103) | Proven |

- More evidence requested: none.
- User check needed: `No`.
- Re-verification after later re-integration: after verification, `origin/personal` moved to `8338f97e59`. The 3 new commits are the v1.5.12 stable release notes and version bump (`.github/release-notes/release-notes.md`, `autobyteus-web/package.json`), with no overlap with this ticket. No behavior changed, so no rerun was needed.

## Release Decision

- Decision: `No release`.
- Decided by: the handoff ("release only on the user's word") and the `RELEASE.md` default.

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`. Result: `Updated`.
- Docs updated: `autobyteus-web/docs/workspace_layout.md`, `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md`.

## Ticket State Transition

- Ticket moved to `tickets/done/phone-run-list-follow-446/` in `d133aa5969`.

## Repository Finalization

- Ticket branch: `codex/phone-run-list-follow-446`. Commit `d133aa5969`, pushed to `origin`.
- Secret Gate before the first push: `scripts/check_secrets.sh origin/personal..codex/phone-run-list-follow-446` gave `PASS (no secrets found)`.
- Hygiene check: exit 0. Licensing check: exit 0.
- Target: `origin` `personal`. It moved to `8338f97e59` after verification (above).
- Merge: `finalize/phone-run-list-follow-446` was created from `8338f97e59`; `git merge --no-ff` made `921d02f639`.
- Secret Gate and hygiene check on the merged state: exit 0.
- Push: re-fetched and unchanged, then `8338f97e59..921d02f639`.
- Repository finalization status: `Completed`.

## Release / Publication / Deployment

- Applicable: `No`. Result: `Not required`. No tag was created and no pipeline was triggered.
- The change ships after v1.5.12, in the next release; `release-notes.md` is ready for it.

## Post-Finalization Cleanup

- The ticket worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-run-list-follow-446` is removed and pruned after this record is pushed.
- The local `codex/` and `finalize/` branches are deleted. `origin/codex/phone-run-list-follow-446` is kept.
- The untracked `dist/` build output was never committed and goes with the worktree.

## Environment Or Persisted-Data Transition Notes

- No stored data changes. The digest is computed per read.

## Rollback Criteria

- Revert `921d02f639` on `personal`. The GraphQL field is additive.

## Final Status

- Verification complete: `Yes`.
- Repository finalization complete: `Yes`.
- Release/deployment: `Not required`.
- Safe cleanup: `Completed` after this record is pushed.
- Unresolved blocker: `None`.
- Successful terminal package eligible for return: `Yes`.
