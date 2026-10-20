# Delivery / Release / Deployment Report — cross-node-agent-communication (autobyteus-191)

## Release / Publication / Deployment Scope

Slice 1 of remote collaboration (text-only remote delegation), `Large` / `High`, reviewed route. Repository finalization to `origin/personal`, then a release only as the user decides (`RELEASE.md`). Current state: **verification open** (AC-113 user check; RC-10 test race with API/E2E). Nothing has been pushed or merged.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` `3b2c86ca9e` (includes the Secret Gate from repository-secret-scan DR-002).
- Deviations from the guide and why: `None` so far.
- Proposed guide fixes, and whether the user agreed: `None`.

## Handoff Summary

- Handoff summary artifact: `tickets/in-progress/cross-node-agent-communication/handoff-summary.md`
- Handoff summary status: `Updated` (verification open)
- Delivery revision record: `tickets/in-progress/cross-node-agent-communication/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: the summary is updated again when verification closes and before finalization.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `5de6a698b9`
- Latest tracked remote base reference checked: `origin/personal` `3b2c86ca9e` (fetched 2026-10-20)
- Base advanced since bootstrap or previous refresh: `Yes`
- New base commits integrated into the ticket branch: `Yes` (merge `4f03cce09d`)
- Local checkpoint commit result: `Completed`. `770715dfa8` commits the code reviewer's uncommitted CRR-006/CRR-007 documents.
- Integration method: `Merge`
- Integration result: `Completed`. One additive conflict, in `server-settings-service.ts`; both settings are kept.
- Post-integration executable checks rerun: `Yes`. DEL-01 … DEL-07 (`handoff-summary.md` § Integration; `evidence/delivery/`).
- Post-integration verification result: `Passed`, with two items classified:
  - DEL-03: 1 failing unit test, also on the base under the same load. Pre-existing: FU-006.
  - DEL-06: RC-10 failed once, from a race in the test. Passes in DEL-07; sent to API/E2E as a test-code fix of this ticket.
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes` (as of `3b2c86ca9e`; refetched before finalization)
- Blocker (if applicable): none for integration.

## Verification

- Evidence judged: `Sufficient` for AC-101 … AC-112; AC-113 needs the user's check.
- Evidence relied on:
  - The execution report's AC proof and the API-REV-003 receipts (`API-r3-run4/remote-two-server-receipt.json`, all 20 cases opened).
  - The API-21/22 logs and the race bisect, plus API-23's journey log and screenshot.
  - Confidence 95%, no category below 90%.
  - The integrated-state E2E DEL-07: 20/20, same key values.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement (`Proven`/`Not Proven`/`User Check`) |
| --- | --- | --- | --- |
| AC-101 | RC-01, RC-02, RC-18 receipts | `REMOTE_COLLABORATION_OFF` for both inbound kinds; "Turn on Remote Collaboration before adding a peer node."; four "turned off" texts | Proven |
| AC-102 | RC-03, RC-16, RC-19 | pinned `nodeId`s in both peer lists; `PEER_IDENTITY_MISMATCH`; "identity mismatch, so nothing was sent" ×2; removal texts both ways | Proven |
| AC-103 | RC-03, RC-04, RC-17 | published record with launch settings; "no published Agent at that address"; "cannot run there: … not a folder" | Proven |
| AC-104 | RC-05 … RC-07, RC-15 | `delegated: true, node: "beta-node"`, `delegatedFrom` with nodeId/coordinatingRun/delegator; packet names "alpha-node"; partition 20 175 ms, stopped 213 ms | Proven |
| AC-105 | RC-05 … RC-07 | one `messageId` in both nodes' logs; Team/Org links with `nodeId` | Proven |
| AC-106 | RC-12, RC-13, RC-14 | relaunch `--conversation` same ID; after both restarts replies "Delivered message … on node \"alpha-node\"" for standalone/Team/Org, `inAlphaLog: true`, `conversation: "readable"`, `orgMembers: 2`; deleted history "no longer exists" | Proven |
| AC-107 | RC-06, RC-08 | `notPermitted` text; forged inbound ×3 `REMOTE_TARGET_NOT_PERMITTED`; views `gaps: []` (99 and 83 sequenced) | Proven |
| AC-108 | RC-09 | files and saved Task refused ×2 each; Task stays `TODO` | Proven |
| AC-109 | RC-10, RC-11 | `agent_run_resources.json` `role: delegated`, `start: started`; after DONE `TASK_AGENT_RESOURCE_CLOSED` both ways (DEL-07 again) | Proven |
| AC-110 | API-23 journey log, screenshot | history "Publisher (1)", packet naming "alpha-node", composer "OWNER-COMPOSER-MSG" then "OK" in DOM and in beta's projection, Stop → `Offline`, 0 processes. The two PNGs are the same file (identical MD5); the screenshot shows the packet and history, and the composer/stop rest on the DOM and server records | Proven |
| AC-111 | RC-20, RC-01/03, IMP-07 | 42–44 captured requests; header names limited to transport headers; no canary or key shape | Proven |
| AC-112 | IMP-17, API-21/22, race bisect, DEL-03/04 | same-node suites pass apart from FU-003 (also fails on the base) and the QR-001 race (fails at the same rate on the base: 9/10 there and here); full unit and web suites green on the integrated state apart from FU-006 (also fails on the base) | Proven |
| AC-113 | API-24 attempt log | not run: the published Docker image differs from this branch in 31 unrelated files, so TESTING forbids mounting this dist; it needs the user's desktop, Docker node and runtime sign-ins | User Check |

- More evidence requested (from whom, what, result):
  - API/E2E: fix the RC-10 race in the durable E2E (DEL-06). The test must keep waiting while beta answers "Run package … is unavailable" for a prepared remote run, or find the run only after the worker's `delegate_task` result. The fix then goes through test-code review. Result: pending.
- User check needed: `Yes`. AC-113 can only be run on the user's desktop and Docker node with real runtimes; API/E2E tried a test-owned Docker node (API-24), and TESTING forbids it.
- User check reference, when needed: pending.
- Re-verification after later re-integration: `Not needed` yet.

## Release Decision

- Decision: pending the user.
- Decided by: `RELEASE.md` defaults to `No release`. A beta is one way to put this change on a desktop build and a Docker image for AC-113.

## Docs Sync Result

- Docs sync artifact: `tickets/in-progress/cross-node-agent-communication/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-server-ts/docs/modules/remote_collaboration.md` (§ Package admission), `autobyteus-server-ts/docs/modules/agent_team_execution.md` (remote link shape)
- No-impact rationale (if applicable): N/A

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `No` (after verification)
- Archived ticket path: —

## Version / Tag / Release Commit

Not started.

## Repository Finalization

- Bootstrap context source: the code reviewer's handoff (worktree, branch, base `5de6a698b9`, target `origin/personal`) and `RELEASE.md`
- Ticket branch: `codex/cross-node-agent-communication-r2`
- Ticket branch commit result: local commits only (checkpoint, merge, delivery documents)
- Ticket branch push result: not pushed. The Secret Gate runs before the first push.
- Finalization target remote: `origin`
- Finalization target branch: `personal`
- Target advanced after verification / acceptance: —
- Delivery-owned edits protected before re-integration: —
- Re-integration before final merge result: —
- Target branch update result: —
- Merge into target result: —
- Push target branch result: —
- Repository finalization status: `Blocked` (verification open)
- Blocker (if applicable): AC-113 user check; RC-10 test fix through API/E2E and test-code review.

## Release / Publication / Deployment

- Applicable: pending the user's decision.
- Release/publication/deployment result: —
- Release notes handoff result: —

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2`
- Cleanup: after finalization. Delivery's temporary worktrees `/tmp/dr001-base` and `/tmp/dr001-branch` were removed and pruned.

## Escalation / Reroute (Use Only If Final Handoff Cannot Complete)

- Classification: evidence fix (test-code race in this ticket's durable E2E).
- Recommended recipient: API/E2E engineer (`/software_engineering_team/api_e2e_engineer`).
- Why final handoff could not complete: the ticket's own durable E2E failed once on the integrated state from a race in the test, and AC-113 waits for the user.

## Release Notes Summary

- Release notes artifact: not required unless the user chooses a stable release (a beta uses generated notes).
- Release notes status: `Not required` for now.

## Deployment Steps

None; this repository deploys no hosted service (`RELEASE.md` § Deployment).

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected`. The change adds new files and optional fields, read tolerantly.
- Delivery action required: `None`
- Result and evidence: API-13 and DEL-07 RC-13 (packages load, restore and reopen after restarts); API-21/22.

## Verification Checks

DEL-01 … DEL-07 (above and in `handoff-summary.md`).

## Rollback Criteria

Revert the merge on `personal` and cut a new release (`RELEASE.md` § Rollback). With the switch off (the default), no remote path runs. The new files (`peers.json`, `published-agents.json`) and the optional fields (`nodeId` links, `delegatedFrom`) are ignored or dropped by older builds' tolerant readers. No app-data migration is involved.

## Final Status

- Verification complete (from the evidence, or the user's check where needed): `No`
- Repository finalization complete: `No`
- Applicable release/deployment/rollout complete or not required: `No`
- Applicable safe cleanup complete or not required: `No`
- Unresolved blocker: AC-113 user check; RC-10 test race (API/E2E)
- Successful terminal package eligible for return: `No`
- Terminal package sent to the Solution Designer: `No`
- Terminal message/reference: —

## DR-002 Addendum (2026-10-20)

- **RC-10 test race:** closed by API-REV-004 / CRR-008 (`a777af6b1d`). The test takes the remote run from the `delegate_task` result. r4-1 and r4-2 passed 20/20 at load average 100–157.
- **AC-110:** now proven also by `API-23b-isolated-beta-composer-message.png`, from the integrated build in two isolated desktop instances with a real model. The duplicate PNG is removed.
- **AC-113:** still `User Check` (desktop ↔ Docker, both directions, real runtimes).
- **Second integration refresh: `Blocked`.** `origin/personal` `3b9014215e` (autobyteus-205 Skill Improvement removal with its data migration; `1.5.8-beta.4`) conflicts with this branch in five server source files: the run metadata types, store, provisioning and run service (`launchPurpose` removed beside `delegatedFrom`), and the settings service. The merge was aborted, and the branch is clean at `daff010bd7`.
  - Classification: `Local Fix` (integration).
  - Recipient: the implementation engineer, then code review (including DR-001's delivery-resolved conflict in `4f03cce09d`), then API/E2E as needed, then delivery.

## DR-003 Addendum (2026-10-20)

- **Integration with autobyteus-205:** done by implementation (IR-005, merge `c59c6f7359`, test `300bf4c09a`), with CRR-009 Pass covering it and delivery's `4f03cce09d`, API-REV-005 Pass (95%; r5-1 and r5-2 20/20) and CRR-010 Not Applicable. Delivery read the new test: the real `RemoveSkillImprovementDataMigration` leaves a peer-delegated run's `run_metadata.json` and history row byte-identical, and the store still reads `delegatedFrom`.
- **Latest base:** `origin/personal` advanced from `3b9014215e` to `d9439919e2` (dependency-security-and-unused-cleanup: Electron 42.11.16, 17 unused dependencies removed, a `download-media-tool` change).
  - Checkpoint `8183e45665` (the reviewer's CRR-009/010 documents).
  - Merge `a58fbab73c`: no conflicts and no file changed on both sides.
- **Post-integration checks DEL-08 … DEL-12** (`handoff-summary.md` § Second and third integration rounds): typecheck, web guards, web suite, build and the two-server E2E (20/20) pass. The server unit suite has one failure, outside this ticket (FU-009): a debounce-timed Project index test that passes 5/5 alone, in code this branch does not touch.
- **Docs sync:** no change needed for these merges. The ticket's long-lived docs do not mention `launchPurpose`, `server_helper` or Skill Improvement, and the base's own docs changes (`content_rendering.md`, `electron_packaging.md`) do not overlap.
- **Handoff state current with latest tracked remote base:** `Yes`, as of `d9439919e2`. It is refetched before finalization.
- **Verification:** AC-101 … AC-112 proven; AC-113 `User Check`, pending. Repository finalization: `Blocked` on AC-113 only.
