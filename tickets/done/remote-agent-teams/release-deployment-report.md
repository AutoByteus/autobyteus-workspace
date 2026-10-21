# Delivery / Release / Deployment Report — remote-agent-teams (autobyteus-247)

## Release / Publication / Deployment Scope

Remote Agent Teams (`Large` / `High`, reviewed route). The scope is repository finalization to `origin/personal`. No release.

## Project Release Guide

- Release guide: `RELEASE.md` at `origin/personal` `a22394f0ce`.
- Deviations from the guide and why: `None`.
- Proposed guide fixes: `None`.

## Handoff Summary

- Handoff summary artifact: `tickets/done/remote-agent-teams/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/remote-agent-teams/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `4a05909457`
- Latest tracked remote base reference checked: `origin/personal` `a22394f0ce` (2026-10-21; unchanged at verification)
- Base advanced since bootstrap: `Yes`, with the beta.5 release records only (`tickets/done/cross-node-agent-communication/` and `tickets/done/remote-collaboration-without-publishing/`, 4 files)
- New base commits integrated into the ticket branch: `Yes` (merge `a74677df99`)
- Local checkpoint commit result: `Completed` (`80e62924d8`, the reviewer's CRR-003/004 documents)
- Integration method: `Merge`
- Integration result: `Completed`, with no conflicts. No file outside `tickets/done/` changed.
- Post-integration executable checks rerun: by API/E2E round 3 on this exact HEAD (`a74677df99`): runs 7 and 8, 25/25 each. Delivery itself ran no rerun, because the merge brought no code, test or long-lived doc.
- Post-integration verification result: `Passed`
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`

## Verification

- Evidence judged: `Sufficient`.
- Evidence relied on:
  - the round-2 and round-3 receipts;
  - the screenshots;
  - API-R2 and API-25;
  - the Validation Confidence Scorecard: final 95%, post-repository 93%, no category below 90%.
- The scorecard was missing at the first handoff. Delivery asked for it (DR-001). API/E2E scored round 2 at about 94% and closed the gaps with RC-25 and the RC-12/13/23 extensions, which CRR-005 reviewed.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-301 | RC-21 (run 5), API-26 | Result `{delegated, target_kind "team", target_team_run_id, target_team_coordinator_agent_run_id, node "beta-node", task_id}`. Alpha's Team link has `coordinatorAddress` and `members`. Beta's tree has `delegatedFrom {nodeId, coordinatingRun agent_team, delegatorAgentRunId}`. Only the coordinator launched. Member launches: lead `gemini-3.8-flash-low`, checker `alt-model` (Team default), temp workspace, `autoExecuteTools: true`. Beta's history lists the Team (screenshot: Studio Team (1), lead live, checker not started, the packet naming alpha-node) | Proven |
| AC-302 | RC-04 | `/hollow_team`: "There is no default runtime configured for the target agent team Hollow Team on node \"beta-node\"."; `/codex_team`: `AGENT_CANNOT_RUN`, Codex not available. No Team run on beta | Proven |
| AC-303 | RC-22 | Four messages (coordinator ↔ lead, lead → never-started checker, checker → lead), each once in alpha's and beta's Team logs with one ID. Team run ID gets the coordinator guidance; unlinked senders are refused; alpha's Team view `gaps: []` (110 sequenced) | Proven |
| AC-304 | RC-12, RC-13 (runs 5, 8) | The Team idles out and restores with `--conversation`. A busy member holds it (both live at 75 s), and it stops at about 150 s. After a beta restart the follow-up restores it. After alpha restarts: warm reply, and a cold wake where the reply alone relaunches alpha's lead | Proven |
| AC-305 | RC-23 | The saved Task is refused for the running remote Team and for a new one, and stays TODO. After DONE, both directions are refused with the closed-Task text. The `fenced_remote` record: "/studio_team runs on node \"beta-node\". This Task sends it no more messages; it stops there when it goes idle." | Proven |
| AC-306 | RC-01 … RC-20 (runs 4/5, 7/8), API-25, API-R2 | Slice 1 and 245 cases pass. RC-20: transport headers only, `targetRoot` and no `coordinatingRun` in messages. Same-node suites 44/45; the failure is 191's FU-003 (2 tests, lines 521/639) | Proven |
| REQ-307 | RC-21, RC-24, API-26 | Ordinary Team run on beta: history, open, owner message, Terminate gives `isActive: false`; the next message restores it | Proven |
| RSK-301 | RC-25 | A dropped work packet: alpha refuses "Node \"beta-node\" could not be reached (fetch failed).", `start` failed. One unused Team run on beta, later stopped (RC-12 `unusedListed`). Alpha keeps the committed Team link, as slice 1 does for Agents (SR-014 b) | Accepted risk, exercised |

- More evidence requested: `Yes`. From API/E2E: the mandatory confidence scorecard. Result: API-REV-003, 95%, with new durable cases; CRR-005 Pass.
- User check needed: `No`. No acceptance criterion of this ticket is user-only. Real cross-machine networking is the transport of autobyteus-191, unchanged here, and its user check was confirmed (191 DR-004).
- Re-verification after later re-integration: `Not needed`. The target did not advance.

## Release Decision

- Decision: `No release`
- Decided by: `RELEASE.md`'s default; no release was requested for this ticket. A beta `1.5.8-beta.6` is available on request.

## Docs Sync Result

- Docs sync artifact: `tickets/done/remote-agent-teams/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: by the implementation, `collaboration_model.md`, `remote_collaboration.md`, `agent_team_execution.md`, `agent_communication.md` and `agent_tools.md`; by delivery, `autobyteus-web/docs/settings.md`.

## Ticket State Transition

- Ticket moved to `tickets/done/remote-agent-teams`: `Yes`

## Release / Publication / Deployment

- Applicable: `No`. Result: `Not required`. Release notes: `Not required`.

## Deployment Steps

None.

## Environment Or Persisted-Data Transition Notes

- New optional fields: the Team tree's `delegatedFrom`, and remote Team links in coordinating trees. Both are read tolerantly; no migration. Delivery action: `None`.

## Rollback Criteria

Revert the merge on `personal`. With the switch off (the default), no remote path runs. Older builds read the new optional fields tolerantly or drop them.

## Finalization Record (DR-001)

### Repository Finalization

- Ticket branch `codex/remote-agent-teams`, final commit `4a962ffb47`:
  - path hygiene `exit 0`; licensing consistent;
  - Secret Gate `origin/personal..HEAD`: 20 commits, PASS;
  - pushed to `origin` as a new branch.
- Finalization target: `origin` / `personal`, still `a22394f0ce` after verification and at every fetch.
- Merge: `finalize/remote-agent-teams` from `origin/personal`, `git merge --no-ff`, giving `829928ceb6` with a tree identical to the ticket branch. Secret Gate on the merged state: PASS.
- `git push origin HEAD:personal`: `a22394f0ce..829928ceb6`. Repository finalization: `Completed`.
- This record follows as a commit on the finalize branch, after its own Secret Gate and refetch.

### Release / Publication / Deployment

- `No release`; `Not required`.

### Post-Finalization Cleanup

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-agent-teams`: `Completed`, removed with `git worktree remove --force` right after this record's push.
  - Checked first: no process runs from it.
  - Everything tracked is pushed. The untracked `*/dist/` build output goes with it.
  - Prune: `Completed`.
- Local branches `codex/remote-agent-teams` (`4a962ffb47`, contained in `origin/personal`) and `finalize/remote-agent-teams`: `Completed`, deleted with the worktree.
- Remote ticket branch: kept on `origin` (`Not required`).

### Final Status

- Verification complete: `Yes` (from the evidence; no user check needed).
- Repository finalization complete: `Yes` (`829928ceb6` on `personal`).
- Applicable release/deployment/rollout complete or not required: `Yes` (`Not required`).
- Applicable safe cleanup complete or not required: `Yes`.
- Unresolved blocker: `None`.
- Successful terminal package eligible for return: `Yes`.
- Terminal package sent to the Solution Designer: `Yes`, after this record's push and the cleanup.

## DR-002 Addendum — Beta v1.5.8-beta.6 (2026-10-21)

- **Release decision:** `Beta`. Decided by the user on 2026-10-21 ("now release a new beta thanks"). The beta carries autobyteus-247 (merge `829928ceb6`) and autobyteus-261 (merge `9bf8ad61a7`); it is the first release of Remote Agent Teams.
- **Method:** `RELEASE.md`, from a fresh worktree of `origin/personal` `9bf8ad61a7` on `finalize/release-1.5.8-beta.6`. Deviations: none.
- **Checks before tagging,** all passed:
  - licensing: "Licensing is consistent.";
  - artifact hygiene: exit 0;
  - `check_secrets.sh v1.5.8-beta.5..HEAD`: 35 commits, PASS.
- **Version, tag and release commit:**
  - `next-beta` gave `1.5.8-beta.6`.
  - `desktop-release.sh beta --branch finalize/release-1.5.8-beta.6 --no-push` made the release commit `d7bdf99139` (`autobyteus-web/package.json` = `1.5.8-beta.6`) and the annotated tag `v1.5.8-beta.6`.
- **Push:** Secret Gate PASS; `origin/personal` was refetched and unchanged. `git push origin HEAD:personal` gave `9bf8ad61a7..d7bdf99139`, then the tag (10:55:17 UTC).
- **Pipelines,** all `success` (`gh run watch --exit-status`):
  - Desktop Release `39588107376`;
  - Android APK Release `39588107358`;
  - iOS App Store Connect Release `39588107502`;
  - Server Docker Release `39588107427`.
- **Published artifacts:**
  - GitHub pre-release `v1.5.8-beta.6`, not a draft, with 17 assets: the APK and `.sha256`, the Linux x64/ARM64 AppImages, the macOS ARM64/x64 `.dmg`/`.zip` with blockmaps, the Windows `.exe`, and the four `latest*.yml`.
  - Docker `autobyteus/autobyteus-server:1.5.8-beta.6` and `:beta` share `sha256:efbff5eae6ac…` (amd64, arm64). `:latest` stays on `1.5.7` (`sha256:821e777d8e88…`).
- **Release result:** `Completed`. Release notes: `Not required` (generated notes for a pre-release).
- **Rollout:** desktop installs with **Settings > Updates > Receive beta updates** on are offered `1.5.8-beta.6`. Docker: `autobyteus-docker upgrade --all --tag beta`. Rollback per `RELEASE.md` (no app-data migration).
