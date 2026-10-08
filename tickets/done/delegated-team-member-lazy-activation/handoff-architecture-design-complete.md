# Handoff — Architecture Design Complete

- Package: `delegated-team-member-lazy-activation`
- Result: **Architecture Design Complete** — `task_size=Small`, `architectural_risk=Low` → direct implementation route
- Solution revision: `SR-002`
- From: `/software_engineering_team/solution_designer`
- Date: 2026-10-08
- Route applied: handoff rule "Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer`. Independent architecture review: `N/A — not applicable` (Small/Low).

## Original request

Project Task Manager (`/project_task_manager`, run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), Project Task `project_task_1a47632c-fc7c-411b-83f0-5cd9f67adf5a`: a delegated Team copy shows every member green "Idle" right after `delegate_task`, even members that received no work. Find out whether members are really started, fix the root cause so members start only when work reaches them and the UI shows true state, explain api e2e engineer's blue dot. Done when the user verifies it in the desktop app.

## Findings (explained to the user)

- Members **are** really started: fresh delegated Team copies are prepared with `prepareConfiguredAgents: true`, which creates an AgentRun + provider session/thread for every member. Proven by the user's saved tree (all six members of both copies have a `platformAgentRunId`; only three had conversations).
- Every other Team path (UI start, Org, collaborators/`send_message_to`, restored delegated copies) is already lazy. Fresh task Teams were left eager as a scope boundary in `flat-agent-organization-model-follow-up`.
- api e2e engineer's blue dot was legitimate (received "Implementation Complete" at 06:54 local on the direct route).

## Approval basis

Requirements `Approved` (REQ-001..007, AC-001..007), DEC-001 = **A** (not-started members use the existing gray "Offline"). User, 2026-10-08: "I think this is clear because in other places we almost start the worker lazily. We should do it here. There's no exception here. Go, I think it's approved."

## What to implement (see design-spec.md)

1. Remove `prepareConfiguredAgents` everywhere; flat Team preparation never activates members. Delete the eager branch in `beginFlatTeamPreparation`, `FlatTeamExecutionManager.prepareConfiguredActivation`, `prepare-flat-team-configured-activation.ts`, and the staged-binding fields of `PreparedFlatTeamExecution`.
2. Task-Team preparations (`RootTeamExecutionDirectory.beginRootTaskTeam`, `TaskTeamExecutionRegistry.beginPreparation`) return `stagedPlatformBindings: Object.freeze([])`; keep `activationMode: "fresh"`.
3. Keep single-Agent task activation unchanged.
4. Update/add tests per design "Guidance For Implementation" (AC-001..006 executable; AC-007 is user verification in the desktop app).
5. No frontend change; no migration.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation`
- Branch: `codex/delegated-team-member-lazy-activation`
- Base: `origin/personal` @ `ace86bf1f` (bootstrap base was `4a51482a5`; fast-forwarded before design)
- Finalization target: `origin/personal`

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/solution-revision-record.md`
- Supplements: None. Product design: N/A — not applicable. Architecture review artifacts: N/A — not applicable.

## Open risks

- R-001 (accepted): unused-member start failure appears at first work, not at delegation.
- R-002 (accepted, out of scope): copies already running keep their eagerly started members until idle shutdown/restart.
- Design R-2: re-base release-safety tests that used eager activation; keep their intent.
- Escalation: return `Design Impact` if coordinator seed activation or late binding commit fails in any root.

## Next expected action

Implementation Engineer implements, runs implementation-scoped checks, and continues the direct route.
