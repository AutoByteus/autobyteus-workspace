# Cleanup brief — remove the nested task-team leftover (before Task 8641c0ac)

Requested by the user, 2026-10-17: clean this up first, then resume the memory refactor 8641c0ac.

## Problem

Teams are flat since 2026-09-01: `autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-factory.ts:46,58`
(commit `37d05c7f71`, "feat: add flat agent organizations") refuses a team inside a team, and
`ConfiguredTeamExecutionNode.members` holds agents only. But the current runtime still carries a
"sub-team inside a task agent team" case, `TaskTeamNestedTeamExecution`, which nothing has created since:

- `run-history/domain/run-execution-tree-shared-records.ts:115-162` (type, `TaskTeamMemberExecution`, `isTaskTeamNestedTeamExecution`)
- `run-history/store/run-execution-tree-shared-record-schemas.ts:162-176` (`parseTaskTeamMember`)
- `agent-collaboration/execution/task/task-team-node-restoration.ts` (recursive restore)
- indexes: `agent-team-execution/services/team-execution-index.ts`, `agent-org-execution/services/agent-org-execution-index.ts`, `standalone-agent-run-root/services/standalone-root-execution-index.ts`
- mutators: `agent-team-execution/services/team-run-execution-tree-mutator.ts`, `agent-org-execution/services/agent-org-run-execution-tree-mutator.ts`, `standalone-agent-run-root/services/standalone-root-tree-mutator.ts`
- `agent-team-execution/domain/team-run-execution-tree.ts`; `services/agent-streaming/team-execution-view-projector.ts` (`projectNestedTaskTeam`, DTO)
- web (to be separated from organization → team nesting, which is current): `autobyteus-web/utils/runSettings/delegatedLaunchRows.ts`, history tree tests/fixtures (`nested-team-*.page.vue`, `WorkspaceAgentRunsTreePanel.spec.ts`, `workspaceHistoryTeamBranchStatus.spec.ts`)

Effect: the code says a task agent team may contain a team while the product forbids it. It misled
the architecture review of 8641c0ac (ARCH-F-002, premise later corrected) and the Solution Designer.
Data Migration Guideline §4: current code uses only current shapes; old shapes live only in migrations.

## Intended direction

- Remove the nested task-team member case from the current runtime (server and web, including the
  GraphQL / stream DTO member union if it carries it), keeping organization → team nesting intact.
- Old records (only releases of about 2026-08-15 … 2026-09-01 could create them): a small startup
  migration handles them first, because once the current parser rejects them, their whole
  coordinating run would fail to load. Solution Designer's recommendation, to confirm with the user
  in the cleanup's requirements: **preserved, not shown** — the record is taken out of the tree and
  kept in a preserved file next to it, memory folders untouched, the coordinating run loads, that
  old task agent team is not shown; truthful disposition. Converting to a flat team is not
  recommended (it would change what the team was). The user's data has none (read-only inventory
  of 8641c0ac, contract §6).
- Scope guardrail: only this leftover. Other leftovers found on the way become follow-ups.

## Relation to 8641c0ac

8641c0ac is on hold (package with the Solution Designer after ARCH-REV-002 Fail, finding ARCH-F-006
open). After this cleanup is delivered, 8641c0ac drops its nested-team support (placement
`nestedTeamRunIds`, F-C2N / AC-022, the nested shape in its frozen source) and resolves ARCH-F-006;
the cleanup's migration joins the released predecessors of contract §5.4.
