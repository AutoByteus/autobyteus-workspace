# Delivery / Release / Deployment Report — autobyteus-305, build step 2 (starter and server-packages volume)

This report holds the latest delivery round (DR-002, step 2). Step 1's report (DR-001) is in git at `77fb8bf2d1`.

## Release / Publication / Deployment Scope

Repository finalization of build step 2 of 5 into `personal`. No release, tag or deployment: none was requested, and RELEASE.md makes "no release" the default.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` on `origin/personal` @ `77fb8bf2d1` (it includes step 1's changes), read in the ticket worktree. Step 2 does not change it.
- Deviations from the guide and why: `None` for the guide. From the generic delivery steps, as in DR-001: the ticket folder is **not** moved to `tickets/done/`, and the worktree and branch are kept. Steps 3–5 continue on the same branch.
- Proposed guide fixes: `None`.

## Handoff Summary

- Handoff summary artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-002`
- Notes: `task_size` `Large`, `architectural_risk` `High`, route `Reviewed` (ARCH-REV-003, CRR-003, API-REV-002, CRR-004 Not Applicable). Classification unchanged by delivery.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `77fb8bf2d1`
- Latest tracked remote base reference checked: `origin/personal` @ `77fb8bf2d1` (fetched 2026-10-30)
- Base advanced since bootstrap or previous refresh: `No`
- New base commits integrated into the ticket branch: `No`
- Local checkpoint commit result: `Not needed` (no integration). The code reviewer's uncommitted records go into the delivery commit.
- Integration method: `Already current`
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes`, as a confirmation on the delivered state (DEL-03, `evidence/DEL-03-step2-delivery-checks.log`): `pnpm -C autobyteus-server-ts test:starter` `# pass 26 / # fail 0`; `python3 -m unittest discover -s scripts/tests -p 'test_*.py'` `Ran 176 tests … OK (skipped=2)`; `check-system-level.mjs` level 1 unchanged; `check_licensing.py`, `check_repository_artifact_hygiene.py` pass; `scripts/check_secrets.sh origin/personal..HEAD` PASS.
- Post-integration verification result: `Passed`
- No-rerun rationale: nothing integrated. The API/E2E-validated state (`6637b54d46`, code `b1029fc1b0`) differs from HEAD only in ticket documents, plus delivery's one doc edit.
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`

## Verification

- Evidence judged: `Sufficient` for finalization without a release.
- Evidence relied on: the execution report's Acceptance-Criteria Proof and Cases (API-REV-002), the reused implementation checks IMP2-01..08, the evidence files opened below, and DEL-03.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-006 / REQ-012, boot-selection part | API-12 D (`API-12-step2-launcher.log`), API-20 (IMP2-01 `# pass 26`, IMP2-08) | `C2 state needsNewImage, version 1.5.12-beta.1, no server`, `message names the image needed and the launcher command`, `starter up with the same pid after 60 s (no restart loop)`, `nothing listens on 8000`, `state.json not overwritten by the older image`; the node log line `"starter":"needs-new-image","code":"NEEDS_NEW_IMAGE"` naming `autobyteus-docker upgrade --all --tag …`; IMP2-08 `"source":"installed"` from `/home/autobyteus/server-packages/packages/1.5.12` | Proven for step 2 |
| BEH-001 / DEC-014 (move to the starter image keeps everything; adds the volume) | API-12 A/B/C, API-22 (`API-21-22-rerun.log`), API-13 | 63 `CHECK PASS` lines in API-12 over phases A–D. Phase C: `no server-packages volume (the installed launcher has none); state.json in the container layer`, then `recreated once for the launcher config`, `server-packages volume now mounted`, `data and root-home kept`. PowerShell (unpatched): `storage lists the server-packages volume`, `upgrade recreated the node`, `plain upgrade keeps the container`, `destroy kept the five volumes`. Compose `CHECK FAILURES: 0` | Proven |
| REQ-011 / BEH-007, status part | API-12 (`cli.mjs status` each phase), API-21, IMP2-06 | `GET /rest/node-update -> 200 {"inPlaceUpdate":"available","version":"1.5.11-beta.5",…}`; relation `newer`/`same`/`older`; `?target=latest -> 400 INVALID_VERSION` | Proven for step 2 (desktop display is step 4) |
| AC-009, phone part | API-21 rerun (`API-21-22-rerun.log`) | `phone credential on C1 -> 403 … "Mobile credentials do not authorize owner-management routes."`; positive control (GraphQL 200) and negative control (unknown `mra_` 401); `revoked credential no longer accepted`; `the credential value appears in no container log`; `CHECK FAILURES: 0` | Proven |
| DS-007, supervision | IMP2-07, API-12 A | crash `exit status 137` → new pid; `stop took .137` s; server child in its own group | Proven |
| AC-001..AC-005, AC-007, AC-008, AC-010, AC-012, AC-013 | — | Steps 3–5 | Not in step 2 |

- The first API-12 run's `CHECK FAILURES: 10` are explained, and the rerun redid them: 3 phone checks used a loopback pairing URL that the policy correctly refuses (an invalid fixture), and 7 PowerShell `new-container` checks hit the pre-existing FU-006 bug. `API-21-22-rerun.log`: `CHECK FAILURES: 0`.
- Confidence: final 94.7%, no category below 90%, every critical criterion directly proven. The 0.3 shortfall against 95% is durable PowerShell execution coverage. That surface's fix is FU-006's pre-existing gap, outside this ticket, and every in-scope PowerShell path was executed (API-22). I do not send it back: a further round could not raise in-scope proof.
- More evidence requested: `None`.
- User check needed: `No` (API/E2E: no step-2 criterion needs the user).
- CR2-N1 judgement: accepted as an interim (see `handoff-summary.md`). It does not contradict REQ-008/REQ-011/AC-006, and it is safer than the behavior before step 2.

## Release Decision

- Decision: `No release`
- Decided by: the release guide's default; the user did not ask. A release is available on request. It would carry steps 1 and 2 and needs the step-1 first-release checks (23 assets, archive comparison).

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-server-ts/docs/features/remote_access.md` (owner route `GET /rest/node-update`). Implementation's Docker README, root and server README, and TESTING.md changes checked, no change needed.

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `No` (steps 3–5 remain)
- Archived ticket path: `N/A`

## Version / Tag / Release Commit

None.

## Repository Finalization

- Bootstrap context source: requirements doc Workspace line and RELEASE.md Finalization Target
- Ticket branch: `codex/docker-node-in-place-server-update`
- Ticket branch commit result: recorded in DR-002 Finalization Record
- Ticket branch push result: recorded in DR-002 Finalization Record
- Finalization target remote / branch: `origin` / `personal`
- Repository finalization status: recorded in DR-002 Finalization Record

## Release / Publication / Deployment

- Applicable: `No`
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required`. For the release that ships these steps: the step-3 release notes must tell launcher users to reinstall the launcher (RU-23). Steps 1–2 alone need no user action beyond the usual `upgrade --all`.

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update`
- Worktree cleanup result: `Not required` (kept for steps 3–5)
- Local ticket branch cleanup result: `Not required`
- Remote branch cleanup result: `Not required`
- Delivery created no containers or images in this round.

## Release Notes Summary

- Release notes status: `Not required` (no release).

## Deployment Steps

None. The server rollout is the next published Docker image.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected` for the data folder; new starter state with one writer.
- Delivery action required: `None`
- Result and evidence: API-12 A/B/C (data written by released servers read back), API-12 A and API-13 (`state.json` unchanged across stop/start and compose restart), API-12 D (an older image leaves `state.json` alone).
- What changes for users at the next release: `upgrade --all` recreates each node once (new image and launcher hash `v7` with the new launcher); the server then runs under the starter. With an old installed launcher, starter state stays in the container layer until the new launcher recreates the node (RU-23; harmless before step 3).

## Verification Checks

DEL-03 above; IMP2-01..IMP2-08 and API-10..API-14, API-20..API-22 per the implementation handoff and execution report.

## Rollback Criteria

- Before a release: revert the merge on `personal`.
- After a release: pin an earlier image tag. Note that step 2's starter then sees an older built-in package than the newest version that ran and refuses with `NEEDS_NEW_IMAGE`. This holds only when an older image is used *after* the starter image ran a newer version. An image from before step 2 has no starter and starts its own server as before. Step 2 changes no data formats.

## Final Status

- Verification complete: `Yes` (from the evidence)
- Repository finalization complete: recorded in DR-002
- Applicable release/deployment/rollout complete or not required: `Yes` (`Not required`)
- Applicable safe cleanup complete or not required: `Yes` (`Not required`)
- Unresolved blocker: `None`
