# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round's delta.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-architecture-design-complete.md`, initial | N/A | `Initial Baseline` | `SR-003` (requirements `SR-002`), `ARCH-REV`: N/A, `CRR`: N/A, `API-REV`: N/A, `DR`: N/A | Universal Team status implemented on every Team row; local checks pass; ready for direct API/E2E |

## Revision Entries

### IR-001 — Universal Team status on every Team row

- Triggering role, report path, and round: `/software_engineering_team/solution_designer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/tickets/in-progress/delegated-team-aggregate-status/handoff-architecture-design-complete.md`, initial round
- Triggering finding IDs: N/A
- Classification: Initial Baseline
- Prior authoritative result: N/A
- Current authoritative result: All Team rows in the Workspaces tree show one Team status dot from `resolveTeamStatus`: busy (running/starting) > error > idle > offline, gray when the run is not alive, and a group row shows the highest of its runs. This covers delegated Teams under Agent, Team and Org runs, nested Teams, Org-internal Teams, and TEAMS run and group rows.
- Related solution revision IDs: SR-003 (SR-002 requirements, AP-001)
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: initial implementation handoff on the direct (Medium/Low) route
- Approved behavior or requirement IDs affected: BEH-001..005 (BEH-006 preserved); REQ-001..008; AC-001..010 at unit/component/probe level (AC-011 is user verification)
- Implementation delta:
  - New `TeamStatus` + `resolveTeamStatus` (single rule owner).
  - `teamBranchStatus` / `teamRunStatus` / `teamDefinitionGroupStatus` replace `aggregateTeamBranchAgentStatus`.
  - `listTaskRows` computes `teamStatus` from collapsed subtrees too.
  - Org collector shared by configured and task Teams, with closure and liveness.
  - Transient row renders the Team dot.
  - TEAMS rows use the universal dot instead of `TeamActivityDot`.
  - `hasActiveRuns` and dead localization keys removed.
  - Specs and two probes updated.
- Changed files or areas:
  - Source: `utils/workspaceTeamAggregateStatus.ts`, `utils/agentOrgHistoryRows.ts`, `services/agentCollaboration/agentRunCollaborationContext.ts`, `services/agentOrgExecution/agentOrgTeamBranchStatus.ts`.
  - Components in `components/workspace/history/`: `workspaceHistoryTeamBranchStatus.ts`, `workspaceHistoryTeamDefinitionGroups.ts`, `WorkspaceTeamExecutionTree.vue`, `WorkspaceStableExecutionRow.vue`, `WorkspaceTransientExecutionRow.vue`, `TeamAggregateStatusDot.vue`, `AgentRunTaskRows.vue`, `WorkspaceAgentOrgHistoryCollection.vue`, `WorkspaceHistoryWorkspaceSection.vue`.
  - Localization: `localization/messages/{en,zh-CN}/workspace{,.generated}.ts`.
  - Tests: colocated specs; `tests/e2e/nested-team-aggregate-status-probe.mjs`, `tests/e2e/team-activity-presentation-probe.mjs` (+ fixture title). All paths under `autobyteus-web/`.
- Local validation and result:
  - Changed and adjacent specs: 32 files / 408 tests pass.
  - Full web vitest: 4016 pass; 3 tests / 7 files fail from unbuilt workspace packages, unrelated.
  - tsc: no errors in changed source; 1015 project-wide vs 1017 base.
  - Probes: nested-team-aggregate-status Pass; team-group-icon Pass. team-activity-presentation cannot render because of a pre-existing crash in the out-of-scope `running/*` fixture surface.
- Next recipient or routing: `/software_engineering_team/api_e2e_engineer` (rule "Small or Medium and Low … direct API/E2E validation")
- Remaining limitations or risks: no live-stack or desktop rendering yet (AC-011 user verification pending). The follow-up removal of `running/*` + `TeamActivityDot` + the team-activity probe's running surface is listed in the handoff. Docs sync is listed in the design spec (Delivery).
