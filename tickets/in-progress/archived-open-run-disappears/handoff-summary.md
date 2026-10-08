# Handoff Summary — archived-open-run-disappears

## State For User Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears`
- Ticket branch: `codex/archived-open-run-disappears` (local only; not pushed yet)
- Base / finalization target: `origin/personal`. Bootstrap base `3a2496c95`. At delivery start the base had advanced 13 commits to `ace86bf1f` (idle-shutdown-background-tasks and v1.4.99-beta.1). It was merged into the ticket branch as `efcda7ee2` with no conflicts, and the base changes do not overlap the ticket files.
- Verified candidate: the ticket branch HEAD that contains this file (delivery commit on top of `efcda7ee2`)
- Classification: `task_size=Small`, `architectural_risk=Low`. Route: direct (architecture, source and test-code review `N/A — not applicable`).

## What Changed

- Archiving or deleting the **open** run (per-run Archive, group **Archive all runs**, Delete) lands on the `/workspace` empty view. The run's row is gone, there is no `local` row, and no other loaded run or team is opened.
- `agentContextsStore.removeRun` and `agentTeamContextsStore.removeTeamContext` clear the selection and no longer auto-select another run.
- `pages/chat.vue` leaves to `/workspace` (`leaveToWorkspace()`) when the displayed stored run disappears, instead of re-opening it.
- `openAgentRun` throws `ArchivedAgentRunOpenError` for an archived, inactive run before any side effect, and Chat maps it to `/workspace`. Stale addresses after a reload, browser Back or an old link therefore stay closed.
- Unchanged: Org (already correct), the running-run guard, failure toasts, draft discard returning to New chat, and the deleted run's stale address showing "chat not found". Client only, with no server or data change.
- Product diff: `git diff 3a2496c95 fd5f32ba5 -- autobyteus-web` (4 source files and 5 specs). Tests: `b2beb3110` is a catalog spec baseline fix (separate commit), and `efb0faa7e` adds a new server contract test.
- Docs: `autobyteus-web/docs/agent_execution_architecture.md` and `autobyteus-web/docs/chat.md`.

## Validation Evidence

| Gate | Result |
| --- | --- |
| Implementation | IR-001, self-review done; guard:web-boundary Pass |
| API/E2E (API-REV-001) | Pass, final confidence 95%. AC-001..AC-009 observed live on an isolated packaged desktop (`iso-60534-519f`, fake AGY), incl. team and member views, Org Delete and Archive all, running-run refusal, stale archived address, reload and restart |
| Repository (API/E2E) | Full web suite 587 files / 3985 tests Pass. Server run-history plus archive GraphQL e2e 47 files / 233 tests Pass |
| Delivery post-merge (`efcda7ee2`) | 5 changed web specs: 48 tests Pass. Server `tests/unit/run-history`: 46 files / 227 tests Pass. guard:web-boundary Pass (`delivery-evidence/`) |

## How To Verify

Quick, without the app (about 1 minute):

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/archived-open-run-disappears
pnpm -C autobyteus-web exec vitest run pages/__tests__/chat.spec.ts services/runOpen/__tests__/agentRunOpenCoordinator.spec.ts stores/__tests__/agentContextsStore.spec.ts stores/__tests__/agentTeamContextsStore.spec.ts stores/__tests__/runHistoryOpenRunRemoval.integration.spec.ts
pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/services/agent-run-resume-config-service.test.ts --no-watch
```

Hands-on, in the app built from this worktree (`pnpm --silent isolated-app start --build`):
1. Have two stopped agent runs. Open one in Chat, then click **Archive** on its sidebar row. Expected: "Run archived.", the workspace empty view, the row gone, no `local` row, and the other run not opened.
2. Repeat with the group **Archive all runs** and with **Delete** (confirm). Expected: the same result, and no "chat not found" page.
3. Open a stopped team run (and, separately, a member of it) while another team is loaded, then Archive or Delete it. Expected: the empty view, with no jump to the other team.
4. Open run A and archive a different run B. Expected: A stays open and B disappears.
5. After step 1, reload the window, then restart the app. Expected: the archived run does not reappear anywhere.

## Residual Risks (accepted)

- LIVE-10 (discarding a `temp-*` draft) was not run live. It is covered by `chat.spec.ts`.
- The Archive and Delete server-failure paths are covered by specs only.
- Browser Back in the web build was not run live. It uses the same code path as the stale address, which was proven live.
- Out of scope: team runs loaded before a reload come back as loaded contexts. This was known before this ticket.

## Delivery Artifacts

- Docs sync: `tickets/in-progress/archived-open-run-disappears/docs-sync-report.md`
- Release notes: `tickets/in-progress/archived-open-run-disappears/release-notes.md`
- Release/deployment report: `tickets/in-progress/archived-open-run-disappears/release-deployment-report.md`
- Delivery revision record: `tickets/in-progress/archived-open-run-disappears/delivery-revision-record.md` (DR-001)

## Outcome

- User verification: pending
