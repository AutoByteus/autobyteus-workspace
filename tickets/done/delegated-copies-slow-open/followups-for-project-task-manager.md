# Follow-ups for the Project Task Manager — from delegated-copies-slow-open (Task e6985045)

Sent on 2026-10-18 at the user's request ("for the later you can ask project task manager to create a follow up"). They are the Change Scope follow-ups FU-1..FU-4 of `design-spec.md` (SR-004). They are not part of Task e6985045. Evidence comes from that ticket's investigation, measured read-only on a test-owned copy of the user's data (`investigation-notes.md`, `probes/probe-run1.txt`).

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open/tickets/in-progress/delegated-copies-slow-open`

## FU-1 — Team runs and org runs also load every member's details up front

- What: when a team run or an organization run is opened, the app loads every member's full conversation and file list before showing it. This includes copies those runs delegated. It is the same pattern Task e6985045 removes for standalone runs such as the Project Task Manager.
- Where:
  - `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` (best-effort load of all members);
  - `autobyteus-web/services/agentOrgExecution/agentOrgContextHydration.ts` (all members);
  - the on-demand precedent is `teamMemberProjectionHydrationService.ts`.
- Evidence: code read on 2026-10-18. Volumes on the user's machine are small today (largest org run: 34 agents), so it is not urgent. It grows with delegations.
- Note: when this is done, extract one shared on-demand member loading core, used by team members, org members and standalone-run copies. Task e6985045 adds a second copy of that policy for standalone-run copies on purpose.
- Suggested Task: "Team and org runs: load a member's details only when it is opened. Show the run's members from the run's view alone, and load a member's conversation, activity and files when the user opens it, as standalone runs do after Task e6985045. Extract one shared on-demand loading core for team members, org members and standalone-run copies. Keep status, history, live updates and Task summaries correct."

## FU-2 — A run's whole message log is sent every time it is shown

- What: the view of a standalone run with copies includes its whole message log. Every view and every live snapshot sends it, and it grows with the run's activity.
- Where: `StandaloneAgentRunRootManager.getInspection` / `agent-collaboration-view-projector.ts` (server); collaboration stream contracts.
- Evidence: the user's Project Task Manager log is 4.3 MB / 1,325 messages; reading it takes about 0.4 s, and the view is about 5 MB in total. This is not the cause of Task e6985045's slowness, but it keeps growing for a run kept for months.
- Coordination: autobyteus-114 (append-only message logs) changes how logs are stored and leaves the view DTOs alone.
- Suggested Task: "Load a run's messages only when they are shown. Stop sending a run's whole message log with every view and snapshot; load the messages for the Team tab or an opened copy when the user opens them. Keep the complete history and live messages correct."

## FU-3 — File reads by run id search every saved run (about 1–2 s each)

- What: the server finds a run's files from its run id alone by reading every saved team, org and agent run tree. That costs about 1–2 s per request on the user's machine, and it grows with every saved run.
- Who is affected:
  - opening a file's content in a delegated copy, a team member or an org member (`/runs/:runId/file-change-content`);
  - `getRunFileChanges` for team and org members.
- Where: `autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts#readProjectionContext` → unscoped `CollaborationExecutionLocationService.findAgent({ agentRunId })`; `autobyteus-server-ts/src/api/rest/run-file-changes.ts`; `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` (URL built from run id only).
- Evidence: measured on 2026-10-18 at 1.95–2.38 s per lookup. The breakdown for one member: teams 650 ms (680 team trees read), orgs 48 ms, hubs 79 ms.
- Note: Task e6985045 only fixes the file list of a standalone run's copy, through a new query scoped to that run.
- Suggested Task: "File reads should name the run they belong to. Give the server's file-change reads (file list and file content) an explicit owner (team run, org run or standalone run plus the member), so a read never searches every saved run. Opening a file in a copy, team member or org member then takes well under a second."

## FU-4 — "Show Task in Projects" for a standalone run gives up after 5 s

- What: opening a Task's worker from Projects waits at most 5 s for the run's copy list, then silently does nothing. Under the old loading (minutes), it always gave up for large runs.
- Where: `autobyteus-web/composables/projects/useTaskRootNavigation.ts` (`CHILD_VIEW_WAIT_MS`).
- Evidence: code read on 2026-10-18.
- Note: re-check after Task e6985045 ships. It will probably work then, because the copy list appears within about 1 s. If it still fails, show a message instead of failing silently.
- Suggested Task: "Check that opening a Task's worker from Projects works for large standalone runs after Task e6985045. If it still times out, tell the user instead of doing nothing."

## Recorded Tasks

The Project Task Manager recorded these on 2026-10-18 (TODO, not dispatched):

| Follow-up | Task | Depends on |
| --- | --- | --- |
| FU-1 | autobyteus-151 | autobyteus-93 (this Task) |
| FU-2 | autobyteus-152 | autobyteus-93, autobyteus-114 |
| FU-3 | autobyteus-153 | independent |
| FU-4 | autobyteus-154 | autobyteus-93 |
