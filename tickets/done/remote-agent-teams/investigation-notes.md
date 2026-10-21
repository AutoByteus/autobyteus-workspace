# Investigation Notes — Remote Agent Teams (autobyteus-247)

## Investigation Meta

- Package identifier: `remote-agent-teams`; Task autobyteus-247 (part of autobyteus-25), from `/project_task_manager`, 2026-10-21
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-agent-teams`, branch `codex/remote-agent-teams`, base `origin/personal` `4a05909457a916d9673f9f57658f8f1699a58052` (1.5.8-beta.5; includes slice 1 and 245); finalization target `origin/personal`
- Bootstrap: worktree, branch and ticket folder created; no blocker
- Current solution revision ID: `SR-001`
- Authorities read: `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md` (in this conversation); context packages `tickets/done/cross-node-agent-communication/`, `tickets/done/remote-collaboration-without-publishing/`
- Investigation status: requirements-phase complete

## Initial Request And Clarifications

- The user, 2026-10-21: "lets dispatch the work for agent teams, because with just the agent, it's very limited."
- From the PTM:
  - use 245's rules;
  - replace `REMOTE_TEAMS_NOT_SUPPORTED`;
  - confirm the Team `defaults_only` recording;
  - take `targetName` from the eligibility owner (N-201);
  - the result gives the team run ID and the coordinator run ID; follow-ups go to the coordinator; the Team link carries `nodeId`; B's Team run carries `delegatedFrom`;
  - the same safety rules, with auto-approve stated for Teams;
  - answer whether S3 must come first;
  - the user does the two-server check himself after the beta.

## Source Log

| ID | Source | Finding | Established |
| --- | --- | --- | --- |
| S-01 | `src/remote-collaboration/inbound/remote-delegation-receiver.ts` (base) | Decides the kind first; a Team is `REMOTE_TEAMS_NOT_SUPPORTED` with its name from `policy.requireEligible` (N-201); Agents go through `catalogTaskSourceOf` and `prepareAgentRun` | Read |
| S-02 | `docs/modules/agent_team_execution.md` § Root And Agent Lifecycle, § Stop; § Delegated Child Lifecycle | Team preparation is scope-only: members start when work reaches them. Idle shutdown exists for delegated children only, not for top-level Team runs. Stop keeps the package; `TeamRunService.resolveManagedTeamRun` restores by team run ID | Read |
| S-03 | `src/agent-collaboration/collaborators/collaborator-launch-resolver.ts:231-268` (base) | `defaults_only`: members use their own default, else the Team default; none → `CollaboratorNoDefaultLaunchError(name, "agent_team")`; the Team-level launch is the Team default, else the coordinator's launch | Read |
| S-04 | `src/agent-team-execution/services/team-run-service.ts:99-150` | `createTeamRun({teamDefinitionId, teamConfigs, memberConfigs})` creates and registers a top-level Team run (no member started) and records it in history | Read |
| S-05 | `src/remote-collaboration/domain/remote-requests.ts` | Messages carry `coordinatingRun` only for B→A; A→B messages name the target agent run, which for a standalone host is its root. A Team's coordinator run ID is not the Team run ID | Read |
| S-06 | `src/run-history/store/team-run-execution-tree-schema.ts:91-103` | Tolerant read of the Team tree file (`createdAt`, `archivedAt`, `applicationBinding`, `handoffs`, `rootTeam`; unknown fields ignored) | Read |

## Requirement Implications

- Teams reuse 245 entirely for resolution. B needs a Team-run creation from the resolved Team source, a back-link on the Team tree, an idle schedule for remote-started Team roots, and a message field naming B's Team run.
- S3 is not needed for Teams (DEC-302).

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Status |
| --- | --- | --- | --- |
| RSK-301 | Risk | An unused Team run stays on B if A's link commit or packet fails after creation; the idle schedule stops it, and it remains in history with no messages | Accepted (DEC-304) |
| RSK-201 | Risk | Every remote agent auto-approves, including all Team members | Accepted by the user |

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Status |
| --- | --- | --- | --- |
| `validation-cases.md` | Solution Designer | Case-by-case validation of the approved approach against the code (C-01 … C-31) and the design points it found (G-1 … G-9) | Done 2026-10-21; input to the design |

## Validation Evidence (2026-10-21, Read)

- `flat-team-topology-planner.ts:182`: member run IDs are allocated at plan time.
- `remote-message-receiver.ts`: the work-packet and A → B roots are resolved as standalone roots by target run ID.
- `remote-endpoint.ts`: `pairedAgentRunId` is one agent.
- `standalone-agent-run-root.ts:139`: only the standalone root has a back-link.
- `root-task-execution-lifecycle.ts:185`: the existing-copy refusal checks Agent copies only.
- `root-task-execution-resource-scope.ts:94-100`: the fence looks up by `agentRunId` only.
- `root-task-execution-lifecycle.ts:231`: `teamCoordinatorOf` reads local task Teams.
- `task-execution-tree-split.ts:303`: `agentRunIdsOfTree`.
- `remote-delegation.ts:65`: the result `node`.
