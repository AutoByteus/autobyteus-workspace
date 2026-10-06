# Handoff Summary — task-run-resources-workspace-cleanup

## Status

- Delivery state: **Delivery Completed.**
  - User verified on 2026-10-06 ("its done perfect. now finalize and release the next beta"); see `user-verification-record.md`.
  - The ticket is archived, finalized into `personal` (merge `8273593ce`) and released as beta **`v1.4.95-beta.4`** (`3c8e49ad5`).
  - Desktop, Android and iOS succeeded. Docker was still running and was not awaited, at the user's instruction.
  - Full cleanup is done: worktree, branches, ARCH-REV-003 backups, preview data and finalization clones.
  - Final state is in `release-deployment-report.md`. The sections below record the DR-001 pre-verification state, kept for history.
- Classification (unchanged by delivery): `task_size=Large`, `architectural_risk=High`. Route: reviewed (architecture review, source review, API/E2E, test-code review).

| Stage | Revision | Result |
| --- | --- | --- |
| Requirements / design | SR-001–SR-009 | User-approved. REQ-010 moved out to `delegated-row-clean-style` (delivered in `v1.4.95-beta.3`) |
| Architecture review | ARCH-REV-001–004 | Pass |
| Implementation | IR-001–IR-004 (`af690af33`, `489268fc7`, `3570b8c10`, `50b08001d`) | Done |
| Source review | CRR-005 | Pass, 9.4/10, no open findings |
| API/E2E | API-REV-003 | Pass, 95% |
| Test-code review | CRR-006 | Pass |
| Delivery | DR-001 / DR-002 | Docs synced; user verified; finalized; beta `v1.4.95-beta.4` published; full cleanup completed |

| Item | Value |
| --- | --- |
| Worktree | `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup` |
| Ticket branch | `codex/task-run-resources-workspace-cleanup` (local only, not pushed) |
| Finalization target | `origin/personal` |
| Delivery checkpoint | `a3c3abec5`: the API/E2E durable tests (server E2E, new probe, 3 updated probes, `package.json` script) and the ticket package, staged by explicit path. SDK `dist/` is excluded |
| Integrated base | `origin/personal@db39803d4`, merge `27d7e12bf`, no conflicts. 8 base commits: the `run-file-change-live-projection-ownership` delivery plus the receipts for `delegated-row-clean-style`. The only shared file is `general-process-run-supervisor.ts`, which auto-merged with independent hunks (`taskAgentResources` vs the run-file-change service binding) |
| Uncommitted delivery changes | `TESTING.md`, `autobyteus-web/docs/{agent_execution_architecture,settings,agent_teams}.md`, delivery artifacts |
| Kept backups (ARCH-REV-003) | `stash@{0}` ("…WIP before update to origin/personal (SR-008)") and `refs/backup/task-run-resources-workspace-cleanup-wip-2026-10-06` (`6bb56c8d1`). Planned for cleanup after finalization |

## Post-Integration Checks (delivery-evidence/)

| Check | Result |
| --- | --- |
| `pnpm -C autobyteus-server-ts prebuild && build` | Pass (`server-build-integrated.log`) |
| Server affected suites: closure units, run-history, streaming, the base's run-file-change units, supervisor ownership, run-file-changes API | 651 pass / 6 fail, all pre-existing. 5 are API/E2E's recorded set (`published-artifact-projection-service`, 4× `team-run-history-catalog-service`). The 6th, the historical team case in `run-file-changes-api`, is recorded as pre-existing by the base ticket's own validation, and it fails the same way in isolation (`server-affected-integrated.log`, `run-file-changes-api-isolated-integrated.log`) |
| Gated `task-closure-root-visibility.e2e.test.ts` (with the base's updated AGY fixture) | 3/3 Pass (`server-e2e-task-closure-integrated.log`) |
| `pnpm -C autobyteus-web test:e2e:task-closure-tree` | 7/7 Pass (BR-001–BR-007). Cleanup: browser closed, frontend and backend terminated, data root removed (`task-closure-tree-probe/evidence.json`) |
| Web closure suites (history, closure stores/services/utils, teamExecution) | 31 files, 272/272 Pass (`web-closure-suites-integrated.log`) |

## What Changed (for you)

1. When a Project Task becomes **DONE**, every run delegated for it leaves the Workspaces tree of its host root. This includes delegated Agents and Teams, with their members and nested delegations. It applies to standalone Agent, Agent Team and Agent Org roots, and happens live.
2. Leaving rows fade and collapse in 200 ms while the remaining rows move up. Under reduced motion they are removed at once. New rows still appear without motion.
3. Closed runs stay hidden after a reload, a restart and Task deletion, and also when the root was not open at DONE time. The stop result does not matter (close happens before stop).
4. The Manager's run, open runs of other Tasks, delegations without a Task, and `@` collaborators are unchanged. Reopening a Task and delegating again shows only the new runs.
5. A viewed or focused closed run hands selection and focus back:
   - Agent root: to the Agent run row.
   - Team root: to the delegating Manager.
   - Org root: to the agent that delegated the outermost closed execution.
6. Nothing is deleted. Messages with closed runs stay in the Team tab.

Wire: `task_executions_closed` / `TASK_EXECUTIONS_CLOSED` and `closed_task_executions` beside the unfiltered tree, in snapshots and stored reads. There is no persisted-data change: the closed index is rebuilt from existing Task files.

## Accepted Residuals (please confirm)

- **Team REQ-009 scope:** only the Workspaces tree and main view follow closure. In a Team, the **members panel, running list, token usage and mobile focus still list closed members.**
- Reduced-motion removal takes about 2 frames. Collapsing a Team also animates.
- AC-003 (failed stop) is proven by unit tests plus the real close-before-stop ordering.
- A damaged Task file keeps its runs listed.
- One codegen doc comment is cosmetic.
- The packaged Electron app was not run (there is no shell change).

## Docs

- `docs-sync-report.md` lists the changes:
  - `TESTING.md`: the new probe and the gated E2E.
  - `agent_execution_architecture.md` and `settings.md`: "never leave the tree" corrected, and a Task closure section added.
  - `agent_teams.md`: a Team closure note.
  - IR-004 had already updated the server protocol and module docs and `agent_orgs.md`.

## How To Verify

- Run the app from this worktree. In a Project, delegate a Task to an Agent or Team from an Agent root, a Team root and an Org root, then mark the Task DONE. Check that:
  - the rows fade out;
  - the selection returns as described;
  - the Team tab keeps the messages;
  - after a reload or restart the rows stay gone;
  - reopening the Task and delegating again shows the new runs.
- Automated re-check:
  - `pnpm -C autobyteus-web test:e2e:task-closure-tree --output-dir <dir>`
  - the gated server E2E (command in `TESTING.md`).

## After Verification

1. Archive the ticket to `tickets/done/`.
2. Commit and push the ticket branch.
3. Re-fetch `origin/personal`, then merge and push. If it has moved, re-integrate and rerun the checks first.
4. Release only on request. `release-notes.md` is prepared.
5. Remove the worktree, the local and remote ticket branches, the ARCH-REV-003 stash and `refs/backup/...`, after confirming that their content is superseded.
