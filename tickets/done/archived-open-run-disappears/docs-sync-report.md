# Docs Sync Report

## Scope

- Ticket: `archived-open-run-disappears`
- Trigger: API/E2E Pass (API-REV-001) on the direct route (`task_size=Small`, `architectural_risk=Low`). Architecture, source and test-code review: `N/A — not applicable`.
- Bootstrap base reference: `origin/personal` @ `3a2496c95`
- Integrated base reference used for docs sync: `origin/personal` @ `ace86bf1f`, merged into the ticket branch as `efcda7ee2`
- Post-integration verification reference: `delivery-evidence/post-merge-web-changed-specs.log`, `post-merge-server-run-history.log`, `post-merge-guard-web-boundary.log` (all Pass)

## Why Docs Were Updated

- Summary: the web docs said that archive "clears selected/open local context … when applicable". They did not say what the user lands on. They also did not say that removal no longer auto-selects another run, that Chat never re-opens a removed or archived run, or that the open coordinator refuses archived, inactive runs. Chat's route doc listed only the missing-chat outcome for ids that cannot be opened.
- Why this should live in long-lived project docs: removal no longer opens another run, and an archived run's address goes to the workspace empty view. Future work on selection, Chat routing or run opening must keep both rules. The server `RUN_ARCHIVED` resume-config contract is now a client dependency.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_execution_architecture.md` | Owns "Workspace History Archive And Delete Actions" and Archive all | Updated | New rules for removing an open run, plus the stale-address guard |
| `autobyteus-web/docs/chat.md` | Owns `/chat?id` resolution in `pages/chat.vue` | Updated | Archived-run and removed-while-open outcomes added to the route resolution |
| `autobyteus-web/docs/agent_teams.md` | History / Stop / Delete section | No change | Says only that Archive and Delete are separate actions, which is still true. The close behavior is documented in the architecture doc. |
| `autobyteus-web/docs/agent_orgs.md` | Org Archive all | No change | Org behavior is unchanged (it already left the Org route) |
| `autobyteus-web/docs/workspace_layout.md` | Workspace empty state | No change | The structured empty state is unchanged. Only how the user reaches it changed. |
| `autobyteus-web/docs/projects.md` | Task-root openability depends on the history listing | No change | The design confirmed no Projects change |
| `autobyteus-server-ts/docs/modules/run_history.md` | Archive / resume config | No change | No server change. `RUN_ARCHIVED` editability already exists. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_execution_architecture.md` | Behavior + ownership | Added: removing the open run (per-run Archive, Archive all, Delete) lands on the `/workspace` empty view. `removeRun` and `removeTeamContext` clear the selection without auto-selecting another run. Chat's `leaveToWorkspace()` replaces re-opening, and a `temp-*` draft discard still returns to New chat. Archiving a different run leaves the open run as it is. Added the `ArchivedAgentRunOpenError` guard for stale addresses, the active-run exception, the deleted-run missing-chat state, and the server test that pins the contract. | The final implemented behavior |
| `autobyteus-web/docs/chat.md` | Route resolution | Added: an archived, inactive id goes to `/workspace`. A displayed run archived or deleted while open goes to `/workspace` and selects no other run. Cross-reference to the architecture doc. | Chat route truth |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| No auto-select on removal | The context stores never pick a replacement run. Only pages navigate. | design-spec.md DS-001/DS-002 | agent_execution_architecture.md |
| Stale archived address safety net | The coordinator checks `RUN_ARCHIVED` and `!isActive` before any side effect. Chat maps the error to `/workspace`. | design-spec.md DS-003, DEC-002 | agent_execution_architecture.md, chat.md |
| Server contract dependency | The client relies on resume config reporting `RUN_ARCHIVED` and `isActive:false`. It is pinned by `agent-run-resume-config-service.test.ts`. | api-e2e-execution-coverage-report.md | agent_execution_architecture.md |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Auto-select of another loaded run/team in `removeRun` / `removeTeamContext` | Selection cleared and nothing selected | agent_execution_architecture.md |
| Chat re-opening a displayed run whose context vanished | `leaveToWorkspace()` → `/workspace` empty view | agent_execution_architecture.md, chat.md |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary and release notes, then hold for user verification
- Notes: docs edits were made only after the integration merge `efcda7ee2` and the passing post-merge checks.
