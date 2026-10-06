# Handoff Summary — mention-delegation-dismissal

## Status

- Delivery state: **DR-001. The branch is integrated with the latest base and docs are synced. Awaiting your explicit verification.** Nothing is pushed, merged or released yet.
- Classification (unchanged): `task_size=Large`, `architectural_risk=High`, reviewed route.

| Stage | Revision | Result |
| --- | --- | --- |
| Requirements | SR-003 | User-approved |
| Design | SR-005 | Done |
| Architecture review | ARCH-REV-002 | Pass |
| Implementation | IR-001 (`a2a7b37bc`) | Done |
| Code review | CRR-001 | Pass |
| API/E2E | API-REV-001 | Pass, 95.1% confidence |
| Test-code review | CRR-002 | Pass |
| Delivery | DR-001 | Integrated, docs synced, awaiting verification |

| Item | Value |
| --- | --- |
| Worktree | `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-delegation-dismissal` |
| Ticket branch | `codex/mention-delegation-dismissal` (local, not pushed) |
| Finalization target | `origin/personal` (bootstrap default) |
| Validated candidate | `a2a7b37bc` on `3c8e49ad5`, plus delivery checkpoint `9ca13012f` (API/E2E tests and ticket artifacts) |
| Integrated base | `origin/personal@a07b17a5e`: 30 new commits, including the removal of the built-in Project Task Manager and collaborator artifact hydration. Merge `e09a17bc9`. |
| Merge conflicts | 2, both resolved: `autobyteus-web/docs/chat.md` (kept our wording and added the base's Collaborator Artifacts bullet) and the live probe's `BUILT_IN_AGENT_IDS` (kept our comment and used the base's list without the retired Project Task Manager) |
| Post-integration check | Server: 7 files / 31 tests pass. This covers the gated ad-hoc E2E for all 3 roots, task-closure visibility, AC-009 resolver, the base's built-in agents and retirement migration, and project node locality (`delivery-evidence/post-integration-server.log`). Web: 15 files / 154 tests pass, covering mention, composer, collaboration store and services, and streaming (`delivery-evidence/post-integration-web.log`). |
| Not committed (by design) | SDK `dist/` build folders |

## What Changed (for you)

1. `@Agent` or `@Team` in a message no longer adds a row. The message keeps its chip. The focused agent receives a note naming the target's kind and address and delegates with `delegate_task`.
2. A description-only `delegate_task` from an agent not working on a Task creates a **Task with no Project**. It stores text only, under `<appDataDir>/ad-hoc-tasks/`. The result returns `task_id` along with `target_agent_run_id`.
3. `create_or_update_task({task_id, status: "DONE"})` closes that copy and its sub-work forever: stopped, hidden live and after restart, and not wakeable. History stays readable.
4. Every agent with `delegate_task` also gets `create_or_update_task` (AutoByteus, Codex, Claude).
5. Ad-hoc Tasks are hidden from the Projects page and `list_project_tasks`. Deleting a run permanently deletes them.
6. Sub-work from an agent that is already working on a Task stays owned by that Task. No new Task is created.
7. Stored runs with collaborators still load. No migration.

## Verification Evidence

- `api-e2e-execution-coverage-report.md` and `api-e2e-evidence/` contain live browser journeys on Claude (`haiku`) and Codex (`gpt-5.6-luna`) for the Agent, Team and Org roots. They cover `@` → delegate → DONE → hidden, then restart, Stop/reopen, rejected delegation, ineligible mention and delete.
- Durable: `autobyteus-server-ts/tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts` (gated with `RUN_AGY_FAILURE_E2E=1` and the fake AGY CLI), 2 AC-009 resolver cases, and the rewritten `cross-scope-agent-mentions-live-probe.mjs`.

## Suggested Checks For You

1. In a standalone agent run, send "review this file @SomeAgent". No row should appear at send. The agent should delegate, and a row should appear when it does.
2. Ask the agent to "mark it done". The row and its sub-rows should disappear. Restart the app and reopen the run: the row stays hidden.
3. The Projects page should show no new Tasks.

## Residual Risks / Non-goals

- **Breaking change:** callers that send `project_id` together with `task_id` are now rejected. The external agent repository's Project Task Manager skill needs a coordinated update.
- Copies owned by different Tasks cannot message each other by run ID (approved).
- A crash between creating the ad-hoc Task and linking it leaves an orphan `task.json`. A failure after the link keeps the Task with a failed assignment until its run is deleted.
- UI copy is unchanged ("Bring into this run", "Couldn't add …"). F01's notice shows a deleted definition's ID as its name.
- The AutoByteus runtime was not run live. AC-009 for AutoByteus is proven at unit level.
- `pnpm typecheck` fails at baseline with TS6059. 72 full-suite files fail identically on base `3c8e49ad5`.

## Pending After Your Verification

Archive the ticket to `tickets/done/`, commit and push the ticket branch, merge into `origin/personal` and push, run a release only if you ask for one (say "release a new beta" if you want one), then clean up the worktree and branch.
