# Delivery / Release / Deployment Report — small-follow-ups-batch-426 (autobyteus-426), round 1

## Release / Publication / Deployment Scope

This round finalizes autobyteus-426 round 1 into `personal`. Round 1 covers items 1, 2, 3 (AC-004a), 5, 6, 7, 8, 10, 11, 12, 13, 14, 16, 17, 18 and 19; items 4 and 15 were dropped. There is no release: the Task says "release only on the user's word", and RELEASE.md's default is no release. Round 2 remains: item 9, items 20–22 and AC-004b.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` on `origin/personal` @ `2783491938` (last changed in `df789a89a5`, autobyteus-412). It was read in the ticket worktree after the merge. The base's change affects only Watching The Rollout and Recovery (updater files are published after the server packages); finalization is unchanged.
- Deviations from the guide and why:
  - The ticket folder stays in `tickets/in-progress/`, and the worktree and branch are kept, because round 2 remains. The Task allows rounds ("finalized on the base branch, in rounds if preferred"), and multi-step tickets did the same before (`tickets/done/docker-node-in-place-server-update/release-deployment-report.md`). The guide itself says nothing on this; the generic step "move to done" is deferred to the last round.
- Proposed guide fixes: `None`.

## Handoff Summary

- Handoff summary artifact: `tickets/in-progress/small-follow-ups-batch-426/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/in-progress/small-follow-ups-batch-426/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: `task_size` `Medium`, `architectural_risk` `High`, route `Reviewed`. Delivery did not change the classification.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `6225a734a3`. The last integrated base was `origin/personal` @ `933163361c` (autobyteus-427), merged at `ed29eb6522`.
- Latest tracked remote base reference checked: `origin/personal` @ `2783491938`.
- Base advanced since bootstrap or previous refresh: `Yes`. 21 commits came in: autobyteus-412 (node update failure, release order) and autobyteus-416 (Host gate, localhost origins, user-file sandbox, `file://` pages).
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed`. `17281c492d` commits the owners' uncommitted ticket documents (CRR-005/CRR-006 records, test review report, SR-008 solution and architecture review records).
- Integration method: `Merge` (`3551d69ee7`).
- Integration result: `Completed`.
  - One conflict, in a test probe: `autobyteus-web/tests/e2e/node-vocabulary-probe.mjs`. Both tickets made the same fix: start the probe's nodes with `AUTOBYTEUS_ALLOWED_ORIGINS=<window origin>`. 426 did it in baseline fix `898fbd2a31`, 416 in `da207045a5`.
  - Resolution: kept 416's form (`frontendUrl` chosen before any node starts; `serverAt(name, port)`) and dropped 426's duplicate declaration and argument. The value is identical. 426's other probe changes (the one-source Memory read, D-11's dev-server wait) are kept unchanged. After the merge, `git diff origin/personal -- <probe>` shows exactly those 426 changes.
  - Auto-merged: `mobile-shell-probe.mjs` and `docs/design-cases.md`. Apart from these three files, the base and the ticket change different files.
  - Effective behavior change from the integration: none found. The checks below exercise 416's gate on this ticket's phone paths.
- Post-integration executable checks rerun: `Yes`. All ran on `3551d69ee7`, one at a time (TESTING "One heavy run at a time"). Evidence is in `evidence/delivery/`.

  | Check | Command | Result | Evidence / Look For |
  | --- | --- | --- | --- |
  | DEL-03 | `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | exit 0 ×3 | `DEL-03-builds.txt` |
  | DEL-01 | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/DEL-01-mobile-shell` (all 19 cases; server dist and phone bundle from DEL-03) | **Pass**, 19/19 | `DEL-01-mobile-shell/mobile-shell-probe.json`: `"result": "Pass"`, `unknownBrowserErrors: 0`. MSP-13: `credentialChecks ["phone-unknown-credential 401", "phone 403", "phone-revoked 403"]`, `openPhoneAfterCheck {"pairing": 1, "sessionLeft": null}`. MSP-18: `openCheck.bar "Phone access off"` with 27 rows; `offThenDown.bar "Not reachable"`, banner "Can’t reach Alpha Test Node. Check". 0 `REMOTE_ACCESS_HOST_REFUSED` / `REMOTE_ACCESS_ORIGIN_REFUSED` lines in `server-alpha.log`, `server-beta.log` and `frontend.log`. Cleanup `serversLeft: 0`, `rootRemoved: true`. Console: `DEL-01-mobile-shell-console.txt` |
  | DEL-02 | `pnpm -C autobyteus-web test:e2e:node-vocabulary --output-dir=<evidence>/DEL-02-node-vocabulary` (the conflict-resolved probe) | **Pass**, NVP-01…05 | `DEL-02-node-vocabulary/node-vocabulary-probe.json`: NVP-05 `"sources": ["local"], "cardHasReason": true`; `unexpectedBrowserErrors: []`; cleanup complete. Console: `DEL-02-node-vocabulary-console.txt` |

- Post-integration verification result: `Passed`
- No-rerun rationale: N/A (new base commits were integrated). The full web suite, server E2E, the Android emulator and the fresh-start build were not rerun. The base changes no file this ticket's code touches. The phone probe exercises the overlap (416's Host/Origin gate on the phone's credential check, feed, pairing and node desktop), and RELEASE.md says delivery audits and does not redo.
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes` (re-checked before the merge; see Repository Finalization)

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: the execution report API-REV-002 (Acceptance-Criteria Proof, Cases), its evidence files for the critical criteria, final confidence of 95% in all seven categories (target 95%, none below 90%), and the integrated-state reruns DEL-01/DEL-02. What was mocked is limited and stated: scripted AGY CLI and a recorded Grok replay with no model; an emulator instead of a physical phone; the routed LAN origin. None of these stands in for a changed boundary.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement (`Proven`/`Not Proven`/`User Check`) |
| --- | --- | --- | --- |
| AC-001 (critical) | API-04 MSP-19: `API-04-r2/mobile-shell-probe.json`; DEL-01 | `unpaired.node: []`; `paired.feed[0].accessToken: true` on the paired host; `afterUnpair.feedOpenedAfter: 0`; `desktopFeed: 1` | Proven |
| AC-002 (critical) | API-04 (r2) MSP-13 raw JSON; DEL-01 MSP-13 | Unknown credential 401 → pairing, `sessionLeft: null`; revoked → `PhoneCredentialCheck 403` → pairing screen, session removed; the open phone's Check also lands on pairing | Proven |
| AC-003 (critical) | API-04 (r2) MSP-18 raw JSON; DEL-01 MSP-18 | Off: bar "Phone access off", banner "… reachable, but Phone access is off. Check", `credentialKept: true`; on → "Connected" with 13 rows; off → down → "Can’t reach …"; back → Connected | Proven |
| AC-004a (critical) | API-08 (r2): `API-08-r2-process-death-restore.txt`, `API-08-r2-A2-after.png` (opened) | Runs A and B: `loadedWith …/mobile/?unsupported=desktopWorkspace`, notice shown, `pairing:false`, no "expired" screen; D: new share → `devices after: 2`; C: removed node → "Scan the QR code on your computer". The screenshot shows Connected, the "Unsupported on phone" notice and the run list | Proven |
| AC-004b | — | Round 2 (DEC-013) | Not in this round |
| AC-005 (critical) | API-09: `API-09-node-desktop-clipboard.txt` | View only: `clipboard-open false`; Paste → `xclip -o` "PHONE-TO-DESKTOP-426"; Copy → "Copied", system paste → "DESKTOP-TO-PHONE-426" | Proven |
| AC-006 | API-05 `node-desktop-routes.e2e.test.ts` (9 tests); API-R1 | Route E2E: the 5th stream node-wide and the 3rd from one phone, each logged with no identifiers | Proven |
| AC-007 (critical) | API-07: `API-07-webview-preview.txt` | iframe `blob:http://10.0.2.2:…` with `sandbox: allow-scripts`; inside `shell: undefined`, `parentAccess blocked-SecurityError`; main-frame blob → "Navigation blocked"; another origin → `VIEW` intent to Chrome | Proven |
| AC-008 (critical) | API-04 MSP-07; API-06 `API-06-result.json`; API-05/05b | Phone shows the three refusals and `registeredAdded: []`. Desktop: `missing`/`file` `shown: true, genericShown: false`; `relative/dir` refused by the client form; the existing folder registers. Server E2E: refusal with no mkdir; a registered missing folder still loads | Proven |
| AC-010 | API-02 (r2) | B01…B08 Pass, `failures []` | Proven |
| AC-011 | API-03 (r2); DEL-02 on the merged probe | NVP-05 Pass, `sources ["local"]` | Proven |
| AC-012, AC-013 | API-10 `API-10-docs-read.txt` | No `TeamCommunicationReferenceViewer`; Case 5 bullets and Case 17 present. The Case 17 "fix" wording is open for the Solution Designer and does not affect the criterion | Proven |
| AC-014 | API-05; API-R5 | The four tests pass; AR-14 measured | Proven |
| AC-016 (critical) | API-R4 (IMP-13 rendered check), API-R2 | VIS-001…009 strings per spec; narrow-width render | Proven |
| AC-017 (critical) | API-R2 (guard integration test, zh-CN spec), API-01 (r2) 718/718 | The guard fails on the planted calls; app-locale formats | Proven |
| AC-018 | API-R1 unit (stubbed interfaces); API-03 NVP-05 screenshot | private → LAN, `100.64/10` → tailnet-like, public after them, no link-local | Proven |
| AC-019 (critical) | API-04 MSP-17 raw JSON; API-R2 | `after.status "This file is available only on the host workspace."`, `composer: 0`, `leaked: false` | Proven |

- More evidence requested: `None`
- User check needed: `No`. Every round-1 criterion is proven on real surfaces. Nothing needs the user's own accounts or nodes, and the user did not ask to check. AC-004b's `Needs user` (DEC-013) belongs to round 2.
- Re-verification after later re-integration: filled in at finalization (below).

## Release Decision

- Decision: `No release`
- Decided by: the Task ("release only on the user's word"; no word given) and RELEASE.md § Release Decision ("No release … the default when the user does not ask for one"). A beta or stable release is available on request.

## Docs Sync Result

- Docs sync artifact: `tickets/in-progress/small-follow-ups-batch-426/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-web/docs/remote_access.md`, `docs/android_mobile_access.md`, `autobyteus-server-ts/docs/modules/node_desktop.md`, `autobyteus-server-ts/docs/modules/workspaces.md`, `autobyteus-server-ts/docs/modules/remote_collaboration.md`, `autobyteus-web/docs/localization.md`, `autobyteus-web/docs/content_rendering.md`. `DESIGN.md`, `TESTING.md` and `RELEASE.md` need no change.

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `No`. Round 2 remains (see Deviations).
- Archived ticket path: N/A for round 1. The ticket stays at `tickets/in-progress/small-follow-ups-batch-426/`.

## Version / Tag / Release Commit

- None (no release).

## Repository Finalization

- Bootstrap context source: `investigation-notes.md` (finalization target `origin` / `personal`) and RELEASE.md § Finalization Target.
- Ticket branch: `codex/small-follow-ups-batch-426`
- Ticket branch commit result: see the finalization record below.
- Ticket branch push result: see below.
- Finalization target remote: `origin`
- Finalization target branch: `personal`
- (The remaining finalization fields are recorded in § Finalization Record after the merge and push.)

## Release / Publication / Deployment

- Applicable: `No`
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required`. `release-notes.md` is written for the release that includes round 1. It has no `## What you need to do` section.

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426`
- Worktree cleanup result: `Not required`. It is kept for round 2.
- Worktree prune result: `Not required`
- Local ticket branch cleanup result: `Not required`. Kept for round 2.
- Remote branch cleanup result: `Not required`

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `tickets/in-progress/small-follow-ups-batch-426/release-notes.md`
- Archived release notes artifact used for release/publication: N/A (no release)
- Release notes status: `Updated`

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected`. Android saved instance state is process-transient system state.
- Delivery action required: `None`
- Result and evidence: API-05 (a registered missing folder still loads); no migration.

## Verification Checks

- DEL-01…DEL-03 above. Secret Gate and hygiene: see the finalization record.

## Rollback Criteria

- Revert the round-1 merge on `personal` (RELEASE.md § Rollback). There is no data change, so rolling back is possible.

## Finalization Record

- Ticket branch commit result: `Completed`. Head `d8138bb5a6` (delivery docs and artifacts), on checkpoint `17281c492d` and refresh merge `3551d69ee7`.
- Secret Gate before the first push: `scripts/check_secrets.sh origin/personal..codex/small-follow-ups-batch-426` → `scanning 35 commit(s)`, `PASS (no secrets found)`, exit 0.
- Ticket branch push result: `Completed`. `codex/small-follow-ups-batch-426` (new branch) → `d8138bb5a6`.
- Target advanced after verification: `No`. `origin/personal` was still `2783491938` at the fetch before the merge and at the fetch before the push.
- Delivery-owned edits protected before re-integration: `Not needed`
- Re-integration before final merge result: `Not needed`. The verified state was the merge's content: `git diff codex/small-follow-ups-batch-426 a42dbca699` is empty.
- Target branch update result: `git checkout -b finalize/small-follow-ups-batch-426 origin/personal` @ `2783491938`
- Merge into target result: `Completed`. `git merge --no-ff codex/small-follow-ups-batch-426` → `a42dbca699`.
- Checks on the merged state: Secret Gate `scanning 36 commit(s) in origin/personal..HEAD`, `PASS`; `check_licensing.py` "Licensing is consistent."; `check_repository_artifact_hygiene.py` exit 0 (longest tracked path 200, a pre-existing file). The new evidence paths have no `:` and are under 130 characters.
- Push target branch result: `Completed`. `2783491938..a42dbca699  HEAD -> personal`; a re-fetch shows `origin/personal` = `a42dbca699`.
- Repository finalization status: `Completed`
- This report and `delivery-revision-record.md` were committed afterwards on `finalize/small-follow-ups-batch-426` and pushed to `personal`. The ticket branch was then fast-forwarded to that commit and pushed, so round 2 starts from the finalized state.
- Re-verification after later re-integration: `Not needed` (no re-integration).

## Final Status

- Verification complete (from the evidence; no user check needed): `Yes`
- Repository finalization complete: `Yes` (`personal` @ `a42dbca699`)
- Applicable release/deployment/rollout complete or not required: `Yes` (`Not required`: no release)
- Applicable safe cleanup complete or not required: `Yes` (`Not required`: the worktree and branch are kept for round 2; the temporary local `finalize/small-follow-ups-batch-426` branch is deleted after the records push)
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to the Solution Designer: `Yes`
- Terminal message/reference: `Delivery Completed` (round 1) to the Solution Designer through the handoff rules
