# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; design produced
- Investigation Goal: Reproduce and root-cause the regression where team-run detail shows only `solution_designer` instead of all Software Engineering Team members, then identify the recent merged change likely responsible.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The bug spans runtime reproduction, GraphQL payload verification, frontend projection/rendering, and recent merge history, but the intended fix is localized to frontend projection ownership.
- Scope Summary: Restore authoritative team member roster display while preserving active-execution task-agent targeting rules.
- Primary Questions Resolved:
  1. Backend payload contains all six members for the reproduced active Software Engineering Team run.
  2. Frontend live-context projection filters the roster down to active execution members.
  3. The likely regression entered through the recently merged runtime-tool MCP unification ticket, commit `cc2151f664f1a87785967cde1087da64bb2fd45d`, merged by `9667d376`.

## Request Context

User reports that when the frontend is started against backend servers started by Electron, opening a Software Engineering Team run shows only `solution_designer`; all team members should be shown. The row click/detail view also only shows the solution designer. User suspects this was caused by a recently merged ticket and requested runtime reproduction plus git investigation.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/tickets/in-progress/team-run-members-missing-regression`
- Current Branch: `codex/team-run-members-missing-regression`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-06-02 before worktree creation.
- Task Branch: `codex/team-run-members-missing-regression`, created from `origin/personal` at `66bdc6d7f6fdcda2b11d39e9f3b7db18478cd723`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Authoritative task edits/artifacts belong in the dedicated worktree. Runtime reproduction used the shared checkout only to start the dev server because it already had `node_modules`; no source edits were made in the shared checkout.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-02 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git symbolic-ref refs/remotes/origin/HEAD || true && ls -la` | Discover bootstrap repo context | Current shared checkout is Git repo on `personal` tracking `origin/personal`; remote default points to `origin/personal`. | No |
| 2026-06-02 | Command | `git worktree list --porcelain && git fetch origin --prune` | Refresh tracked remotes and check existing worktrees | Remote refresh succeeded; no exact dedicated worktree existed. | No |
| 2026-06-02 | Command | `git worktree add -b codex/team-run-members-missing-regression /Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression origin/personal` | Create mandatory dedicated task worktree/branch | Created task worktree from `origin/personal` at commit `66bdc6d7`. | No |
| 2026-06-02 | Code | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/SKILL.md` | Follow team workflow | Requires draft requirements/investigation artifacts before deep investigation and dedicated worktree for git tasks. | No |
| 2026-06-02 | Code | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Required design reference | Design should be spine-first, ownership-led, no compatibility wrappers, and must classify root cause/refactor posture. | No |
| 2026-06-02 | Command | `lsof -nP -iTCP -sTCP:LISTEN ...`; `ps aux | rg -i 'electron|autobyteus|server-ts|fastify|graphql'` | Locate Electron-started backend | Electron app launched backend as `/Applications/AutoByteus.app/.../server/dist/app.js --port 29695 --data-dir /Users/normy/.autobyteus/server-data`. | No |
| 2026-06-02 | Command | `curl http://localhost:29695/graphql -H content-type:application/json --data '{"query":"{ __typename }"}'` | Verify backend GraphQL health | Returned `{"data":{"__typename":"Query"}}`; Electron backend was reachable at port `29695`. | No |
| 2026-06-02 | Setup | `BACKEND_NODE_BASE_URL=http://localhost:29695 ... pnpm dev --host 127.0.0.1 --port 3033` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web` | Start frontend against Electron backend | Nuxt served `/workspace` at `http://127.0.0.1:3033`; process was stopped after reproduction. | No |
| 2026-06-02 | Runtime | Browser open `http://127.0.0.1:3033/workspace`; click `autobyteus-workspace-superrepo`, `Software Engineering Team`, then active bug-report row | Reproduce user-visible bug | UI showed only `solution_designer` after row selection. Screenshot copied to `reproduction-only-solution-designer.png`. | No |
| 2026-06-02 | Data | GraphQL `listWorkspaceRunHistory(limitPerAgent:20)` against `http://localhost:29695/graphql` | Compare backend payload to UI | Active run `team_software-engineering-team_b8abf03c` has `memberTreeCount: 6` and `membersCount: 6` with all expected route keys. Summary saved to `runtime-probe-summary.json`. | No |
| 2026-06-02 | Code | `autobyteus-web/stores/runHistoryTeamRows.ts` | Inspect live-context team row projection | `buildTeamRowsFromContext` applies `filterActiveExecutionMemberTree(...)` to structured `teamContext.memberTree`, dropping inactive/unmessaged roster members before history rows are built. | Yes: remove roster filtering here. |
| 2026-06-02 | Code | `autobyteus-web/components/workspace/team/TeamGridView.vue`; `TeamSpotlightView.vue` | Inspect team workspace member display | Both views use `flattenActiveExecutionMemberNodesForDisplay(...)` for display entries, so inactive/unmessaged roster members are hidden. | Yes: use roster/topology flattening for display entries. |
| 2026-06-02 | Code | `autobyteus-web/utils/teamActiveExecutionMembers.ts`; `autobyteus-web/stores/agentTeamContextsStore.ts`; `autobyteus-web/stores/activeContextStore.ts`; `autobyteus-web/stores/agentTeamRunStore.ts` | Determine whether active-execution helper still has a valid owner | The helper is still used for `activeExecutionFocusedMemberRouteKey`, composer target context, task-agent selection safety, and task-agent activity bar. It should remain but be restricted to execution-target surfaces. | Yes: preserve task-agent safety tests. |
| 2026-06-02 | Code | `autobyteus-web/utils/teamDefinitionMembers.ts` | Find existing roster/topology flattening owner | `flattenTeamMemberNodesForDisplay(...)` already flattens all logical members/subteams without activity filtering. | Yes: reuse for roster views. |
| 2026-06-02 | Command | `git diff 9667d376^1 9667d376 -- autobyteus-web/stores/runHistoryTeamRows.ts autobyteus-web/utils/teamActiveExecutionMembers.ts` | Identify merge-introduced source change | Merge introduced `filterActiveExecutionMemberTree` and active execution helper use in row building. | No |
| 2026-06-02 | Command | `git show --format=fuller --name-status cc2151f6 -- ...` | Identify likely regression commit | Commit `cc2151f664f1a87785967cde1087da64bb2fd45d` on 2026-05-31 added `TeamTaskAgentActivityBar.vue`, `teamActiveExecutionMembers.ts`, and modified `TeamGridView.vue`, `TeamSpotlightView.vue`, `TeamWorkspaceView.vue`, and `runHistoryTeamRows.ts`. | No |
| 2026-06-02 | Doc | `tickets/done/runtime-tool-mcp-unification-analysis/design-spec.md` and `investigation-notes.md` | Check intended prior-ticket design | Prior design explicitly called for splitting frontend active execution projection from team roster/topology projection so task-only worker execution rows disappear after settlement. Current implementation over-applied active-execution filtering to roster surfaces. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Workspace history tree row click in `WorkspaceAgentRunsTreePanel.vue` / `useWorkspaceHistorySelectionActions.ts`.
- Current execution flow:
  1. Frontend fetches history via `ListWorkspaceRunHistory`.
  2. Backend returns `team.memberTree` and `team.members` with all six Software Engineering Team members.
  3. Clicking the live active team row opens/hydrates local `AgentTeamContext` through `openTeamRun(...)`.
  4. `runHistoryStore.getTeamNodes(...)` merges persisted history with live `teamContextsStore.allTeamRuns` through `buildTeamNodes(...)`.
  5. For live contexts, `buildTeamRowsFromContext(...)` filters `teamContext.memberTree` through `filterActiveExecutionMemberTree(...)`, leaving only `solution_designer` because only the coordinator is currently active.
  6. Team workspace Grid/Spotlight also render from `flattenActiveExecutionMemberNodesForDisplay(...)`, so they display only active execution members rather than the full roster.
- Ownership or boundary observations: Backend run-history owns persisted team metadata and supplies the correct full topology. Frontend has two different projection responsibilities, but current code lets the active-execution projection govern roster surfaces.
- Current behavior summary: UI shows only `solution_designer`; backend has all six members.

## Design Health Assessment Evidence

- Change posture: Bug Fix
- Candidate root cause classification: Boundary Or Ownership Issue
- Refactor posture evidence summary: A targeted projection-boundary refactor is needed now: active-execution filtering must be removed from roster/topology display paths and retained only in execution-target/task-agent surfaces.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Runtime screenshot | Selected team run shows only `solution_designer`. | User-visible roster display is wrong. | Fix roster display path. |
| GraphQL runtime probe | Backend payload has all six members. | Backend is not the root cause for the reproduced path. | Keep backend unchanged unless implementation finds another path. |
| `runHistoryTeamRows.ts` | `buildTeamRowsFromContext` filters structured tree to active execution members. | Roster/topology projection is bypassed by execution projection. | Remove filter from row builder. |
| `TeamGridView.vue` / `TeamSpotlightView.vue` | Both use active-execution flattening for display entries. | Team workspace member display is activity-filtered. | Use topology flattening for roster display. |
| Prior ticket docs | Prior design required separate active execution and roster/topology projections. | Current code violates intended boundary. | Re-separate projections. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/stores/runHistoryTeamRows.ts` | Converts persisted/live team run data into history tree member rows. | Live context path filters `memberTree` through active-execution logic. | Should own roster row projection and use full topology. |
| `autobyteus-web/stores/runHistoryTeamHelpers.ts` | Merges persisted team runs and live contexts into team tree nodes. | Receives filtered rows from `buildTeamRowsFromContext`; also computes focused member via active-execution helper. | Keep active-execution focus fallback but do not let it determine `members`/`memberTree`. |
| `autobyteus-web/components/workspace/team/TeamGridView.vue` | Renders team members as grid tiles. | Displays only active execution entries. | Should render roster/topology entries. |
| `autobyteus-web/components/workspace/team/TeamSpotlightView.vue` | Renders primary + secondary team member tiles. | Displays only active execution entries. | Should render roster/topology entries, ordered by focus. |
| `autobyteus-web/utils/teamActiveExecutionMembers.ts` | Computes active execution entries and safe focus fallback. | Valid for composer/active task-agent semantics but not roster display. | Retain and narrow caller set. |
| `autobyteus-web/utils/teamDefinitionMembers.ts` | Builds/ flattens authoritative team member topology. | Existing `flattenTeamMemberNodesForDisplay` provides the right roster flattening behavior. | Reuse instead of adding a new helper. |
| `autobyteus-web/components/workspace/team/TeamTaskAgentActivityBar.vue` | Shows active transient task-agent entities. | Correct active-execution consumer. | Keep using active-execution helper. |
| `autobyteus-web/stores/activeContextStore.ts` / `agentTeamRunStore.ts` | Composer/send/interrupt target selection. | Uses `activeExecutionFocusedMember*` getters. | Preserve safety behavior. |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-02 | Repro | Browser: `http://127.0.0.1:3033/workspace` -> expand `autobyteus-workspace-superrepo` -> expand `Software Engineering Team` -> click active bug-report row | Only `solution_designer` is visible for the selected team run. | Reproduces user report. |
| 2026-06-02 | Screenshot | `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/tickets/in-progress/team-run-members-missing-regression/reproduction-only-solution-designer.png` | Screenshot shows selected team run with `solution_designer` only. | Durable visual evidence for reviewers. |
| 2026-06-02 | Probe | GraphQL `listWorkspaceRunHistory(limitPerAgent:20)` against Electron backend | Active run `team_software-engineering-team_b8abf03c` has six member route keys in `memberTree` and `members`. | UI loss is frontend-side. |
| 2026-06-02 | Data | `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-members-missing-regression/tickets/in-progress/team-run-members-missing-regression/runtime-probe-summary.json` | Counts and route keys recorded without full conversation payload. | Downstream can verify backend payload finding without re-querying. |

## External / Public Source Findings

No external/public sources used. Investigation was local runtime, repository, and git-history based.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Running Electron app/backend.
- Electron backend process observed: `/Applications/AutoByteus.app/Contents/MacOS/AutoByteus /Applications/AutoByteus.app/Contents/Resources/server/dist/app.js --port 29695 --data-dir /Users/normy/.autobyteus/server-data`.
- Frontend dev command used in the shared checkout because dependencies already existed there:
  `BACKEND_NODE_BASE_URL=http://localhost:29695 BACKEND_REST_BASE_URL=http://localhost:29695/rest BACKEND_GRAPHQL_WS_ENDPOINT=ws://localhost:29695/graphql BACKEND_AGENT_WS_ENDPOINT=ws://localhost:29695/ws/agent BACKEND_TEAM_WS_ENDPOINT=ws://localhost:29695/ws/agent-team BACKEND_TRANSCRIPTION_WS_ENDPOINT=ws://localhost:29695/ws/transcribe BACKEND_TERMINAL_WS_ENDPOINT=ws://localhost:29695/ws/terminal pnpm dev --host 127.0.0.1 --port 3033`
- Cleanup notes: Nuxt dev server was stopped with `Ctrl-C` after reproduction. Electron backend was left running because it was user-started.

## Findings From Code / Docs / Data / Logs

1. Backend is not the source of this reproduced bug: it returns all six roster members.
2. The active-execution helper intentionally hides non-active members and task-only logical workers. That behavior is valid for active task-agent/composer safety, but invalid for roster display.
3. The recent merge over-applied the active-execution projection to roster/history/team workspace surfaces.
4. Prior ticket docs already named the correct design direction: separate active execution projection from team roster/topology projection.

## Constraints / Dependencies / Compatibility Facts

- No backend contract migration is needed for the reproduced path.
- No compatibility wrapper should be added; the frontend should consume the existing canonical roster fields properly.
- The fix must keep task-agent work packet preview suppression and active composer target normalization.

## Open Unknowns / Risks

- Implementation should verify nested team behavior after restoring full roster display.
- Implementation should ensure selecting a non-active roster member does not silently retarget composer/send away from the active-execution-safe target unless that is an intentional future product decision.

## Notes For Architect Reviewer

The target design is a projection-boundary correction, not a backend data repair. The most important review question is whether the design keeps active-execution safety behavior in the correct owner while restoring full roster display everywhere the user expects team membership.
