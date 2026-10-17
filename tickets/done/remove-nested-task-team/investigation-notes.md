# Investigation Notes

## Investigation Meta

- Package identifier: `remove-nested-task-team`
- Request / ticket: Project Task `project_task_9942a43c-9ef9-4519-bd76-05e393a39a8c` from `/project_task_manager`
  (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`): "Remove the nested task-team leftover (teams are
  flat since 2026-09-01); do this before the memory refactor 8641c0ac". Brief:
  `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_9942a43c-9ef9-4519-bd76-05e393a39a8c/context/ctx_7e6488248a94__nested-task-team-cleanup-brief.md`
  (authored by this Solution Designer in 8641c0ac, `followups/nested-task-team-cleanup-brief.md`).
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-nested-task-team`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-nested-task-team` / `codex/remove-nested-task-team`
- Resolved base remote / branch / revision: `origin` / `personal` / `db00ba16a9` (fetched 2026-10-17)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: `git fetch origin`; `git worktree add -b codex/remove-nested-task-team <path> origin/personal` succeeded.
- Bootstrap blocker: None.
- Current solution revision ID: `SR-004`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md` (2026-10-17);
  templates `requirements-doc-template.md`, `investigation-notes-template.md` (2026-10-17); `AGENTS.md`.
- Investigation status: requirements and architecture investigation complete (2026-10-17).

## Initial Request And Clarifications

- Original request: the user (2026-10-17, in the 8641c0ac conversation): "we should first clean up the code a little bit
  … clean up the code first, and then we can continue to work on this"; then "ask the project task manager to create
  one ticket. Then we first work on this cleanup ticket."
- Clarifications received: the user confirmed the premise that teams no longer contain teams ("only organization …
  can internally contain a team, but all the team are flat").
- User-supplied facts and constraints: cleanup first, then resume 8641c0ac.
- Initial ambiguity: what happens to old records (DEC-001, Needs user); how far "the leftover" reaches (DEC-002..004).

## Product And Domain Understanding

- Product area: agent teams, task agent teams (delegated teams), organizations, run history, live team views.
- Current model: an organization contains agents and teams; a team contains agents only; any agent may delegate a Task
  to a task agent (team), which is coordinated by the topmost run of its chain (Collaboration Model CM-7).
- "Team inside a team" (this ticket): a team that is a member of a team — a sub-team member inside a task agent
  team (`TaskTeamNestedTeamExecution`), or a configured team member inside a team (runtime node children).
- Not "team inside a team" (current, untouched): an organization's teams; a task agent team delegated by a team member
  and shown under that member in history (delegation, not membership).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-17 | Code | `autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-factory.ts:45-58` | Is team-in-team possible today? | Throws "Flat Team … cannot contain a configured Team" for any non-agent child | — |
| 2026-10-17 | Code | `git log -S "cannot contain a configured Team"` → `37d05c7f71` (2026-09-01, "feat: add flat agent organizations"); first tag containing it `v1.4.70` | When did teams become flat? | Flat since v1.4.70 | — |
| 2026-10-17 | Code | `git log -S TaskTeamNestedTeamExecution` → `3f3aafa7cf` (2026-08-15, universal delegation); first tag `v1.4.53` | When could nested task teams be created? | Window: releases v1.4.53 (2026-08-21) … v1.4.69 | — |
| 2026-10-17 | Code | `run-history/domain/run-execution-tree-shared-records.ts:115-162` | Current record type | `TaskTeamNestedTeamExecution`, `TaskTeamMemberExecution` union, `isTaskTeamNestedTeamExecution` | — |
| 2026-10-17 | Code | `run-history/store/run-execution-tree-shared-record-schemas.ts:162-176` | Current parser | `parseTaskTeamMember` still accepts a nested team member | Old records still load today |
| 2026-10-17 | Code | `agent-team-execution/domain/team-run-execution-tree.ts` | Configured team members of a team run | `RootConfiguredTeamExecutionNode.members` agents only (already flat) | — |
| 2026-10-17 | Code | `agent-team-execution/domain/team-run-config.ts:38-50`; producers `agent-org-runtime-config-projector.ts:25-33`, `flat-team-topology-planner.ts:176-198` | Runtime team node | `TeamRunAgentTeamNode.children: TeamRunNode[]` admits teams; every producer builds agents only; the flat factory checks at runtime | Type-level leftover (DEC-002) |
| 2026-10-17 | Code | grep `TaskTeamNestedTeamExecution|TaskTeamMemberExecution|projectNestedTaskTeam|parseTaskTeamMember` (excl. migrations, tickets/done, dist) | Footprint | Server 17 files (see Structural Surfaces); contracts 2 files; web 6 files | — |
| 2026-10-17 | Contract | `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts:150-259`; `autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts:133-172` | Wire contracts | Nested task-team DTO and zod schemas | Consumers: server and web only (package.json scan) |
| 2026-10-17 | Code | `autobyteus-web` grep "nested team / sub-team / subteam" | Web footprint | Task-team member unions in 6 files; localization keys `AgentTeamDetail.nestedTeamsPill`, `compositionSummaryValue`, `form…selfReferenceForbidden`, `TeamCommunicationPanel.represents_subteam`, `AgentTeamEventMonitor.focused_subteam`, `TeamWorkspaceView.send_subteam_placeholder`, `send_to_subteam` have **no** non-test use; `AgentTeamCard.nested_teams` used only in a test | Dead strings (DEC-003). History "sub-team rows" and e2e fixtures `nested-team-*.page.vue` need classification (delegation vs membership) in design |
| 2026-10-17 | Code | `agent-org-flat-team-families-v1-app-data-migration.ts:46` | Did the flat change convert old nested data? | "Converts selected nested Team histories" (team runs with configured sub-teams → organizations); handling of nested **task** team members not evident | Architecture: confirm whether nested task-team records can remain in current trees |
| 2026-10-17 | Data | 8641c0ac contract §6 (read-only inventory, 633 trees, 88 task agents) | User data | No task agent team has a nested team member | — |
| 2026-10-17 | Code | `api/graphql/types/agent-org-definition.ts:9` | Org members | `AgentOrgMemberType { AGENT, AGENT_TEAM }` — current, untouched | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Delegating a Task to a team | task team built through flat preparation; members are agents | No nested member can be created | flat-team-execution-factory.ts | High |
| BEH-002 | System | Opening / restoring a run with task agent teams | trees parsed (nested members accepted), indexes visit nested members, restore recurses | A v1.4.53–v1.4.69 record with a sub-team still loads | schemas, indexes, task-team-node-restoration.ts | High |
| BEH-003 | User | Live team view / history | projector and web selectors handle nested members | Would show a sub-team under a task agent team | team-execution-view-projector.ts, web selectors | High (none in user data) |
| BEH-004 | System | Organization runs | org → team (agents) | Current | org projector, org DTOs | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| server record type + parser | accept nested task-team members | removal makes old records unparseable → whole coordinating run fails | migration must run first (REQ-003) |
| server indexes (team, org, standalone), mutators (team, org, standalone), restore, view projector, DTO projection, delegated launch selection / stop set, task execution tree projection | branch on nested member | remove branches | design maps each |
| `TeamRunAgentTeamNode.children` | admits teams; runtime check only | tighten to agents (DEC-002) | ripple across ~15 files using the node |
| contracts DTOs (team stream, collaboration stream) | nested DTO + schemas | narrow (server + web only consumers) | contract packages rebuilt (`dist`) |
| web (6 files) + dead localization keys | nested handling; dead strings | remove | classify history "sub-team rows" first |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: coordinating trees (`collaboration_tree.json`, `team_run_execution_tree.json`, `agent_org_run_execution_tree.json`)
  whose task agent team records may contain a nested member (only from v1.4.53–v1.4.69).
- Readers / writers: the three tree stores and `run-execution-tree-shared-record-schemas.ts`; released migrations.
- Evidence paths: as Source Log.

### Structural Surfaces

- Server files: `agent-collaboration/domain/delegated-launch-selection.ts`, `delegated-stop-set.ts`,
  `agent-collaboration/execution/task/task-execution-tree-projection.ts`, `task-team-node-restoration.ts`,
  `agent-org-execution/services/agent-org-execution-index.ts`, `agent-org-run-execution-tree-mutator.ts`,
  `agent-team-execution/domain/team-run-execution-tree.ts`, `services/team-execution-index.ts`,
  `services/team-run-execution-tree-mutator.ts`, `run-history/domain/run-execution-tree-shared-records.ts`,
  `run-history/store/run-execution-tree-shared-record-schemas.ts`,
  `services/agent-streaming/collaboration-execution-tree-dto-projection.ts`, `team-execution-view-projector.ts`,
  `standalone-agent-run-root/services/standalone-root-execution-index.ts`, `standalone-root-tree-mutator.ts`;
  `agent-team-execution/domain/team-run-config.ts` (DEC-002) and its users.
- Contracts: `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts`,
  `autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts`.
- Web: `services/collaborators/agentSourceSelectors.ts`, `services/runConfigEditing/delegatedCopyLiveness.ts`,
  `services/teamExecution/teamExecutionTreeMutations.ts`, `teamExecutionTreeSelectors.ts`,
  `utils/runSettings/delegatedLaunchRows.ts`, `test-support/currentTeamTestFixtures.ts`, comments in
  `utils/agentOrgHistoryRows.ts`, `services/agentCollaboration/agentRunCollaborationIndex.ts`; localization (en, zh-CN).

### Potential Structural Impacts To Investigate

- API or external-contract change: yes, internal stream DTOs narrowed (server + web only).
- Persistence schema or invariant change: yes, parser stops accepting nested members → a startup migration first.
- Security or privacy boundary change: absent.
- Concurrency or lifecycle change: absent.
- Deployment / migration: one startup migration; must coordinate with 8641c0ac contract §5.4 later.

## Persisted Data And State Facts

- Affected stored subject: task agent team records with a nested team member inside coordinating trees.
- Location and representative shape: `{ address, teamRunId, members: [ {address, agentRunId, …}, {address, teamRunId, members, taskExecutions} ], … }`.
- Approximate volume: 0 on the user's machine; only installations that ran v1.4.53–v1.4.69 and delegated to a hierarchical team.
- Current readers and writers: tree stores via the shared record parser; no writer creates new ones.
- Required semantics to preserve: every memory file; every other record and message; the coordinating run loads.
- Acceptable loss: per DEC-001 (Needs user) — recommendation: the nested record is kept in a preserved file, not shown.
- Remaining evidence gap: whether the 2026-09-01 flat migration already converted or dropped nested task-team records (architecture).

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| Task brief (path in Meta) | Solution Designer (8641c0ac) | direction | whole ticket | all | Current | Direction from the user |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | Flat migration's treatment of nested task-team records | migration source shapes | moot: no migration (DEC-001 e) | Closed |
| U-002 | Unknown | Web history "sub-team rows" and `nested-team-*` e2e fixtures: delegation or membership | scope precision | `runHistoryTeamRows.ts#projectConfiguredRows` builds `agent_team` rows from `configured_team` members (dead); the e2e probes build such rows; delegation rows are separate (keep) | Closed (implementer re-checks each site) |
| R-001 | Risk | Type tightening of `TeamRunAgentTeamNode.children` ripples | size | design | Open |

## Requirement Implications

Removal of the parser's nested acceptance requires a startup migration for old records (DEC-001). Removal spans
server, contracts and web; dead nested-team strings belong to the same concept.

## Notes For Architecture Design

Map SCN-001..003; verify U-001, U-002; follow the Data Migration Guideline (frozen source shapes, no lockout,
truthful dispositions); this migration becomes a released predecessor for 8641c0ac (its contract §5.4).

## Architecture Investigation Findings (2026-10-17)

- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`.
- `configured_team`: defined in `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts:176-266`; no server
  producer (no `configured_team` in `autobyteus-server-ts/src` outside tests); web consumers
  `stores/runHistoryTeamRows.ts:22-40`, `services/teamExecution/teamExecutionContextFactory.ts:125-150`, view models,
  selectors.
- Team-definition member tree: `autobyteus-web/utils/teamDefinitionMembers.ts:11-46` — `TeamDefinitionAgentTeamNode`
  type, builder emits agents only; server `TeamMember` has no ref type (`api/graphql/types/agent-team-definition.ts:60`).
- Launch-configuration team scopes: `application-platform/launch-configuration/*` (`teamScopes`, `teamAddress`),
  `agent-org-run-service.ts:39` (`teamOverrides` for organizations), web `types/agent/TeamRunConfig.ts`
  (`teamOverrides`, `StoredTeamRunMemberNode` `agent_team`), `utils/teamRunLaunchHierarchy.ts` — organizations use team
  scopes; team-run-only remnants unclear → follow-up.
- Containment: team / org excluded by `root-run-package-current-validator.ts:100-175`; team location scans admitted
  roots only (`team-run-execution-tree-location-service.ts:100-120`); standalone scans throw
  (`standalone-root-location-service.ts:57-111`); callers `collaboration-execution-location-service.ts:38-68`,
  `team-member-run-view-projection-service.ts:79`, `run-file-change-projection-service.ts:108`,
  `agent-org-member-run-view-projection-service.ts:112`.
- Released migrations importing current schemas / stores: `collaborators-to-delegated-runs-v1` (schemas, stores,
  validators). Legacy frozen shapes do not import current code.
- User evidence (2026-10-17): "Nobody has ever used the nested team … in our agent package we already completely removed
  the nested agent team." No install holds the retired shape; retired-data scenarios are Technically Possible but
  Unsupported (SR-006).
- Data check (2026-10-17, read-only, the user's machine `~/.autobyteus/server-data/memory`): all 633 coordinating trees
  (standalone, team, organization) read; 0 unreadable; 0 task agent teams with a team member; 0 configured teams with a
  team member (organizations' teams have agent members only). Confirms the user's evidence (SR-006).
