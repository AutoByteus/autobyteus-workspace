# Investigation Notes

## Investigation Meta

- Package identifier: `org-teams-follow-definition` (Project Task `autobyteus-29`, Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`), follow-ups FU-002 and FU-003 of `team-run-follows-definition` (autobyteus-22)
- Requested by: `/project_task_manager` (run `project_task_manager_2f41a1df4e464bf2aa8970327d9d7ad0`); the user, 2026-11-21: "work on the follow-up immediately"
- Worktree / branch: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition`, `codex/org-teams-follow-definition`
- Base: `origin/personal` `9f6add773b6bd1c299548d103cc85d8fc7fe1731` (fetched 2026-11-21); finalization target `origin/personal`
- Authorities read: requirements gate (`references/requirements-engineering.md` incl. the 2026-11-21 "feasibility of the proof" update, `ticket-scope.md`, `finding-the-cause.md`) in this conversation; autobyteus-22's archived package (`tickets/done/team-run-follows-definition/` at `6533d7be04`): requirements (SR-005/SR-006), design (SR-010)
- Investigation status: requirements-level complete; architecture after approval

## Source Log

| ID | Type | Source (`9f6add773b`, paths under `autobyteus-server-ts/src/`) | Finding | Established |
| --- | --- | --- | --- | --- |
| IF-01 | Code | `agent-org-execution/domain/agent-org-run-execution-tree.ts` | An Org run's tree keeps `rootOrg.members` (direct agents and mounted Teams, each Team with its members, coordinator and launch) and one `handoffs` list | Read |
| IF-02 | Code | `agent-collaboration/definition/collaboration-handoff-compiler.ts:49-68` | Org rules = the Org definition's own rules + each mounted Team's own rules compiled at its mount path | Read |
| IF-03 | Code | `agent-team-execution/domain/team-run-membership.ts:10-17` (shipped by autobyteus-22) | "A team mounted in an Org run is built from its fixed node and never changes" | Read |
| IF-04 | Code | `agent-team-execution/membership/*` (autobyteus-22) | Planner, committer, listener, notice source exist for Team runs; the listener walks live Team roots only | Read |
| IF-05 | Data (read-only) | `/home/autobyteus/data/memory/agent_orgs/software_development_department_d338557e6e5743cb8f065ea260126cd6/agent_org_run_execution_tree.json` | The user's Org run (2026-09-21) mounts `product-design-prototyping-team` and `software-engineering-team` (6 members), 21 handoffs | Measured |
| IF-06 | Code | `agent-collaboration/execution/task/task-delegation.ts:175-186` | A delegation to a peer Team records the copy's coordinator and `members` in the Task entry once, from the start answer | Read |
| IF-07 | Code | `remote-collaboration/channel/peer-client.ts:78-93`, `peer-gateway.ts:53`, `remote-requests.ts:127`, `inbound/remote-team-run-starter.ts:42` | Members travel only in the delegation's start answer; no later answer or notice updates them (FU-003's "until the next status answer" is optimistic: nothing refreshes them) | Read |
| IF-08 | Doc | `collaboration_model.md` CM-10 | The delegating node keeps the link (peer, run ID, coordinator and members' addresses and run IDs); the node that runs it owns the run | Read |

## Requirement Implications

- FU-002 extends the same following to Teams mounted in Org runs (live and reopened); Org-level rules that name a removed member must be left out, as N-3 leaves out rules to members that do not exist.
- FU-003: the delegating node's stored member list of a peer Team copy must be updated after the peer run's membership changes, or its tree rows and its messages by run ID to the copy's members stay stale indefinitely.

## Notes For Architecture Design

- Reuse autobyteus-22's planner/committer for an Org's mounted Team (different tree, same rules); the listener must also walk live Org roots; restore of Org runs must follow stored trees.
- FU-003 needs a peer → delegating-node notice (or a pull on contact) carrying the new member list, accepted against the stored link; check the existing peer channels (`cross-node-task-close-591` was just merged).
