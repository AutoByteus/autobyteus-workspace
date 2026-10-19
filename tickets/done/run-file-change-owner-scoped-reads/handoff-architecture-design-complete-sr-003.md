# Handoff: Architecture Design Complete (SR-003, revision for ARCH-REV-001)

- **Package identifier:** `run-file-change-owner-scoped-reads`
- **Result:** `Architecture Design Complete`. This revision resolves ARCH-REV-001 round 1: AR-001 and AR-002.
- **Classification:** `task_size = Medium`, `architectural_risk = High`. Unchanged; the reviewer confirmed it.
- **Current SR entry:** `SR-003`. The previous design handoff is `handoff-architecture-design-complete.md` (SR-002).
- **Approval state:** requirements `Approved`. The SR-002 approval was mine (Solution Designer), within the Task's direction, with the user informed. SR-003 corrects current-state facts and makes AC-003, AC-005 and AC-007 explicit (task agents, running owners). Intended behavior is unchanged, so no renewed approval is needed. Behavior-defining supplements: none.

## Original request

The original request is unchanged. See `handoff-architecture-design-complete.md`: Project Task FU-3 of autobyteus-93, from `/project_task_manager`. Give every file-change read an explicit owner so that no read searches every saved run.

## Resolution of the findings

### AR-001 (REQ-005, AC-007)

**Fix:** the run-id read now decides "standalone" from standalone run metadata, never from being active.

- **Order of checks.** `getStandaloneRunProjection` / `resolveStandaloneRunEntry` work in this order:
  1. Call `readMetadata(runId)`. If it is absent, return `[]` / `null`. There is no active-run check and no tree read.
  2. If a run with that id is active, return the live projection with the run's workspace root.
  3. Otherwise return the stored projection.
- **Why metadata is the right signal:**
  - Every standalone run, including hubs and application runs, has `run_metadata.json` before it is activated (`prepareAgentRun` → `recordPreparedRun`).
  - No member has it. `readMetadata` reads a task agent's own file (which has a `taskAgent` section) as absent; this is contract G1. Configured members live under the team, org or hub directories.
- **Hubs with copies:** the hub's own id is served whether it is running or saved; a copy's id gets nothing.
- **Tests:** AC-007 now covers a running owner, with the member's run active in the registry. There is also a hub-with-copies case.
- **Correction:** the current-state note is corrected. Today, an active member is already served live by run id (BEH-002, BEH-003, DEC-003 evidence, R-001).

### AR-002 (AC-003, AC-005, UC-002, UC-003)

**Fix:** a located member's execution source now has one owner, `locatedExecutionSource(location)`, in `collaboration-execution-location-service.ts`.

- **What it returns:** `{ agentDefinitionId, launchConfiguration }` from the member's configured placement. Failing that, it returns the catalog-copy source from the located tree's task-execution lists:
  - team: `rootTeam.taskExecutions`
  - org: `rootOrg.taskExecutions` plus each member team's
  - hub: `taskExecutionListsOf(tree)`
- **`locatedLaunchConfiguration`** now delegates to it, for every family.
- **The three private `childSourceOf` helpers** are removed. The member-view services use `locatedExecutionSource` in both `requireLocation` and `metadataFor`.
- **Team location tagging:** the private `tagTeam` becomes the exported `tagTeamAgentExecution(item)`. The team member-view service tags its location with it before calling the file-change service.
- **Tests:** list and content reads for a team task agent and an org task agent, each with the owner saved and running, using workspace-relative paths. `locatedExecutionSource` gets its own unit tests.
- **Cycle check:** `collaborator-source-projector.ts` does not import the location services, so there is no import cycle.

All other sections remain as reviewed in round 1.

## Artifacts (absolute paths)

- `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads/tickets/in-progress/run-file-change-owner-scoped-reads/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads/tickets/in-progress/run-file-change-owner-scoped-reads/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads/tickets/in-progress/run-file-change-owner-scoped-reads/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads/tickets/in-progress/run-file-change-owner-scoped-reads/solution-revision-record.md`
- Prior review artifacts. Their reviewed basis is SR-002:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads/tickets/in-progress/run-file-change-owner-scoped-reads/design-review-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads/tickets/in-progress/run-file-change-owner-scoped-reads/architecture-review-revision-record.md`

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads`
- Branch: `codex/run-file-change-owner-scoped-reads`
- Base: `origin/personal` @ `cba6b85122`
- Finalization target: `origin/personal`
- The ticket documents are not committed yet.

## Open risks

- U-001: timing on a realistic seed (AC-010); validation will measure it.
- R-001: lists are live while a run is active.
- R-002: the viewer guard on a subject mismatch.
- R-003: the containment e2e trigger.
- R-004: one metadata read per standalone read.
- R-005: `metadataFor` now uses the shared source rule, with the same outcome as before.
- FU-A: context-file owner lookup; this is a follow-up.

## Expected next action

Architecture review round 2 of SR-003.

## Route

- Applied `get_handoff_rules` on 2026-10-19. The package has `architectural_risk = High`, so it goes to `/software_engineering_team/architecture_reviewer`.
- No other rule matches.
