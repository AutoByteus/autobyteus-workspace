# Handoff — Architecture Design Complete (SR-002)

- Package identifier: `run-file-change-owner-scoped-reads`
- Result: `Architecture Design Complete`
- Classification: `task_size = Medium`, `architectural_risk = High` (rationale in `design-spec.md` → Task Size And Architectural Risk)
- Current SR entry: `SR-002`
- Approval state: requirements `Approved` by the Solution Designer within the Task's direction, with no `Needs user` decision; user informed in the Solution Designer conversation on 2026-10-19. Behavior-defining supplements: none.

## Original request

Project Task from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`): "File reads should name the run they belong to (today each read searches every saved run, about 1–2 s)". This is follow-up FU-3 of autobyteus-93 (e6985045), requested by the user on 2026-10-18.

- Direction: give the server's file-change reads (file list and file content) an explicit owner, so a read never searches every saved run.
- Done when: file list and file content reads for copies, team members and org members take well under a second on a realistic data set, without scanning all saved runs; with tests; merged; and shipped with the next release.

## Goals and scope

- Every file-change read names its owner:
  - the standalone run itself;
  - team run + agent run;
  - org run + member address + agent run;
  - hub + member address + agent run.
- The team-member conversation and older event-monitor page lookups also use the named team run (REQ-004).
- A read that gives only a run id serves only standalone runs. There is no fallback search (clean cut).
- Out of scope: context-file owner lookup (FU-A in the design spec's Change Scope); autobyteus-93 FU-1, FU-2 and FU-4; storage changes.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads`
- Branch: `codex/run-file-change-owner-scoped-reads`
- Base: `origin/personal` @ `cba6b85122`
- Finalization target: `origin/personal` (RELEASE.md)
- The ticket documents are not committed yet. Nothing is built or installed in the worktree.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads/tickets/in-progress/run-file-change-owner-scoped-reads/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads/tickets/in-progress/run-file-change-owner-scoped-reads/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads/tickets/in-progress/run-file-change-owner-scoped-reads/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads/tickets/in-progress/run-file-change-owner-scoped-reads/solution-revision-record.md`
- Evidence:
  - baseline probe: `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_d42446ab-0ef4-47fa-a16b-767cc3728332/context/ctx_5dad698d1210__probe-run1.txt`
  - autobyteus-93 timing summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads/tickets/done/delegated-copies-slow-open/evidence/API-05-07-timing-summary.txt`
- Prior review artifacts: N/A — not applicable (first design round).

## Design summary

- **Server: who locates and who serves.**
  - Each family's member-view service (team, org, standalone-run copies) locates the member inside the one named root and serves its file list and file entry. The team service now uses `rootTeamRunId`.
  - `RunFileChangeProjectionService` serves only standalone runs (`getStandaloneRunProjection` / `resolveStandaloneRunEntry`) and already-located members (`getLocatedCollaborationMemberProjection` / the new `resolveLocatedCollaborationMemberEntry`).
  - The unscoped fallback, its stored-only locators and the dead `getEntry` are removed.
- **GraphQL:** two new queries, `getTeamMemberFileChanges(teamRunId, agentRunId)` and `getAgentOrgMemberFileChanges(orgRunId, memberAddress, agentRunId)`.
- **REST:** three new owner-shaped content routes, named like the context-file routes. All four content routes share one response policy. The new `CollaborationMemberNotFoundError` maps to a 404.
- **Web:**
  - The owner subject type is moved and renamed to `AgentRunReadSubject`.
  - `fetchRunFileChanges(subject)` picks the owner's query.
  - `runFileChangeContentPath(subject, path)` builds the content route.
  - The viewer receives the active target's `browse` subject and only builds a URL when the subject's agent run equals the artifact's run. This applies on desktop and mobile.
- **Behavior change by decision (DEC-003):** team and org member lists are live while their root is running, as copies and standalone runs already are, so a file still being written answers 409.

## Open risks and uncertainty

- U-001: per-read timing on a realistic seed (hundreds of unrelated saved team runs) is not yet measured. AC-010 asks for under 0.5 s server time and no growth with unrelated runs. API/E2E measures this on a changed build.
- R-001: lists become live while a team or org is running (accepted).
- R-002: the subject could mismatch the artifact while the selection changes. The viewer guards against this.
- R-003: the containment e2e uses `getRunFileChanges(copy)` as one of its scan triggers. It must switch to the scoped read and keep another hub-scanning call as the warning trigger.

## Expected next action

Independent architecture review of the design spec against the approved requirements.

## Route

- Rules applied (`get_handoff_rules`, 2026-10-19): `architectural_risk = High` matches the architecture-review rule, so the package goes to `/software_engineering_team/architecture_reviewer`.
- No other rule matches.
