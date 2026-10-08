# Handoff Summary — Workspace History Group Archive

## Current Delivery State
- Package `workspace-history-group-archive`; `/software_engineering_team/delivery_engineer`; **DR-002 Delivery Completed**, 2026-10-08.
- User verification: **"now finalize, no need to release a new version"**. Reference: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/workspace-history-group-archive/user-verification.md`.
- `task_size=Medium`, `architectural_risk=Low`, direct low-risk route kept. Architecture review, source review and test-code review are **N/A — not applicable (direct route)**.
- Revisions: SR-003 / IR-001 / API-REV-001 / DR-001 / DR-002.
- Canonical durable root: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/workspace-history-group-archive`.
  - The ticket worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive` has been removed.
  - Older artifacts that point to `.../autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/<file>` now resolve to the same `<file>` under the canonical root.

## What Changed (user-facing)
Agent, agent team and Agent Org group headers in the Workspaces sidebar have an **Archive all runs** icon. If any run of the group is running, nothing is archived and a toast says "Stop running runs first.". Otherwise a confirmation opens; on confirm, every saved run of that group in that workspace is archived. For agents this includes runs hidden by the 6-run cap. History refreshes once and one toast reports the result, e.g. "Archived 5 runs.". Archive is non-destructive; per-run Archive and Delete are unchanged. en and zh-CN strings are included.

## Integration And Validation Basis
- DR-001: `origin/personal` @ `4a51482a5`, unchanged since bootstrap. **Already current**: no merge, rebase or checkpoint needed.
  - Delivery rerun on HEAD `dc70e7f44`: server archive E2E and service tests 15/15; web group-archive composable, header, panel and store specs 138/138. Evidence: `delivery-evidence/dr-001/`.
- DR-002, after user verification: re-fetched `origin/personal` @ `4a51482a5`, still unchanged. No re-integration and no renewed verification were needed.
  - The only change since the verified state is the docs and the ticket archive. No source or test change, so no further rerun was needed.
- API-REV-001 (upstream), confidence 95.4%:
  - Archive E2E 6/6.
  - Server suites 343/343.
  - Full web suite 3960 pass, 0 fail, 3 skipped.
  - Web guards and the localization audit pass.
  - Live isolated-desktop validation of agent, team and Org, with cleanup verified.
- Residual, spec-only (not rendered live): the AC-006 partial-failure toast, the REQ-006 pending state and the AC-010 UI race. AC-010 is proven at the server/GraphQL level (API-003).

## Docs Sync
`docs-sync-report.md` — **Updated**:
- `autobyteus-server-ts/docs/modules/run_history.md`
- `autobyteus-web/docs/agent_execution_architecture.md`
- `autobyteus-web/docs/agent_orgs.md`

## Finalization / Release / Cleanup
- Ticket archived to `tickets/done/workspace-history-group-archive/` before the final ticket commit.
- Ticket finalization commit `abac35eb284c2333622b1bc55799e277f6c38fad` pushed to `origin/codex/workspace-history-group-archive` (new branch).
- `personal`:
  - Fast-forward check against `origin/personal` @ `4a51482a5`: already up to date.
  - No-ff merge `423a883d7f030f31c6e3f6bbab403c201e68cf71`, pushed `4a51482a5..423a883d7`. The remote was re-fetched and equals local.
- The merge ran in the main checkout. Its 690 pre-existing dirty/untracked entries were preserved by status. One untracked temp file (`tutorial-videos/agent-native-company/raw/.run.mp4.vxldm_mu.tmp`) changed hash because an unrelated process was writing it. It is outside the merge (`delivery-evidence/dr-002/main-preservation-note.txt`).
- Release, version, tag, deployment and rollout: **Not required**; the user declined a new version.
- Cleanup:
  - Removed the owned generated `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` from the ticket worktree (64 untracked files, never staged).
  - `git worktree remove` (no force) and `git worktree prune` succeeded.
  - The local branch was deleted after the merge (`-d`).
  - The remote ticket branch is kept for audit.
- Records-only completion commit on `personal` (this summary, the report, the DR-002 record and evidence). Its hash is given in the terminal message.

## Open Points For The Solution Designer (non-blocking, carried)
1. **Unclear (wording):** AC-005 rev quotes a longer blocked message. QR-003 specifies "Stop running runs first."; the implementation and docs follow QR-003.
2. A live run beyond the 6-run cap shows as a stopped `local` row, so the dialog opens before the server refuses. Nothing is archived. This is pre-existing and within REQ-004 rev.
3. An archived open standalone run stays open and reappears as a `local` row, also after reload. This is pre-existing and shared with per-run archive; separate-ticket candidate.
4. Token-usage numbers follow the host OS locale rather than the app language. This is a product question; only the test was pinned to en-US.

## Rollback
Revert merge `423a883d7` on `personal` if group archive affects runs outside the selected group, or archives while a group run is active. No data rollback is needed: `archivedAt` can be cleared, and run folders are retained.
