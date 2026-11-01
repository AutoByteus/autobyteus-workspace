# Solution Designer Handoff — autobyteus-348 (package `runtime-switch-members`), first priority FU-003

Result: **Architecture Design Complete**. Current solution revision: **SR-001**.

## Identity and context
- Task `autobyteus-348` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`: runtime switch for Team members, Org members and delegated copies (the same switch a single agent has), plus the follow-ups of 316. Requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-switch-members/tickets/in-progress/runtime-switch-members/`
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-switch-members`, branch `codex/runtime-switch-members`, base `origin/personal` @ `c952758a81` (includes autobyteus-316 and 343); finalization target `origin/personal`.

## Request, goals, constraints
The user (2026-11-01): the runtime switch exists only for a single standalone agent; a team is made of individual agents, an org of teams and agents, so it should work for Team members, Org members and delegated copies too, now. Goal behind it: when a runtime hits a limit, work continues on another runtime, for any run. Scope of this handoff: FU-003 only; the Task's later items (FU-004, FU-001, FU-005, FU-008) follow in the same Task. Constraints: isolated data only; no release unless asked; do not write "the user has verified" into any Done-when.

## Approval basis
Requirements `Approved` (SR-001): the user's request and the Solution Designer within the direction. User design approval: `Not required`.

## Classification
`task_size` **Large**; `architectural_risk` **High** (persisted structure of every Team/Org/copy record gains optional fields; the durable binding commit of three roots; a path every member activation takes). Escalation triggers: a root's persistence cannot carry the new commit kind inside its lock; the web DTO projections need more than the pending flag (F-09 b); a switched member behaves differently from the standalone run in the built-server case.

## Design in one paragraph
Team members, Org members and delegated copies all activate through one shared `ConfiguredAgentExecutionHandle` built from a flat `TeamRunAgentNode`; their three roots already implement one binding-commit seam. So: (1) the member records gain the same optional `pendingRuntimeSwitch` of 316 (and a copy's user choice gains an optional runtime; started values never change); (2) one pure rule (`applyRuntimeSelection`, generalized from 316's `buildRuntimeSwitchMetadata`) is called by the standalone, Team/Org and copy save paths; (3) the handle runs 316's sequence (watermark → prepare → validate → archive-and-marker → commit → publish; discard on failure) when the planner finds a pending switch, with a plain start when the member has no conversation history; (4) the binding change gets a third kind `runtime_switch` committed by each root's tree mutator, clearing the pending switch in the same durable write; (5) discovery and views read the open-file runtime with the pending rule; (6) the Team and Org edit chains are renamed `…Selection…` (clean cut) and the web unlocks the runtime control on member and delegated rows. No migration (optional fields).

## Evidence
Code reading only (no experiment): `investigation-notes.md` F-01…F-09; the three first tests that settle the open points are named in the design. 316's delivered package (`tickets/done/cross-runtime-resume/`) is the base.

## Open points for the reviewer
(1) One shared activation path (F-02) and the third change kind in three roots (F-03); (2) a copy's runtime in its user choice and the effective-launch rule (F-05, D-3, D-5); (3) the Team-level choice reaching followers with their own pending switches; (4) the history check deciding marker or no marker at activation (DEC-5, M-6); (5) the port default for the handle (no new package edge); (6) the rename list (D-10); (7) F-09 (b), the web DTO projections.

## Follow-ups
None yet.

## Documents
`solution-designer-handoff.md`, `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, `switch-member-record-contract.md`, `follow-ups.md`, input `task-follow-ups-316.md`.

## Route
Architecture Design Complete with task_size=Large / architectural_risk=High → `/software_engineering_team/architecture_reviewer` (the only matching rule).
