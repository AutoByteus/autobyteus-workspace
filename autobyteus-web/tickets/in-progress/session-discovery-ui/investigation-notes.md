# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirements approved by user; design spec produced for architecture review.
- Investigation Goal: Understand the current workspace/team/session/role navigation implementation and design a session-first history UI that preserves team identity while improving discoverability and row usefulness.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The change affects front-end history projection/rendering and may affect backend/API title metadata. It is larger than a styling tweak because the current UI structure mirrors data grouping rather than the user’s session retrieval object.
- Scope Summary: Improve left sidebar history/navigation from team-first nested runs to session-first discovery with useful session labels and team symbols.
- Primary Questions To Resolve:
  - Which component renders the screenshot hierarchy? Resolved: `WorkspaceAgentRunsTreePanel.vue` + `WorkspaceHistoryWorkspaceSection.vue`.
  - Which data store/API supplies workspaces, teams, sessions, roles, timestamps, and prompt text? Resolved: `runHistoryStore`, `runHistoryReadModel`, GraphQL `listWorkspaceRunHistory`/`workspaceRunHistory`, server run-history services.
  - Can useful session row text be derived client-side, or is a persisted/generated session title needed? Current code can derive a sanitized fallback client-side, but no persisted explicit title exists; best target is a dedicated session-display-label projection with optional persisted title.
  - How should role/member details be exposed after making sessions the primary list item? Team members should remain details under expanded/selected team session rows.

## Request Context

User supplied screenshots dated 2026-06-30 showing the left sidebar. Current structure appears to nest sessions below workspace and team, then role/member rows below the selected session. User says the session is hidden inside too many layers and suggests "maybe no teams, just sessions, at the beginning of each session, give it a team symbol." User also notes current sentence shown is only the first few prompt words and is not useful, and asks for the best approach to show the session line.

Reference screenshot paths supplied by user:
- `/var/folders/_2/ptz5_h0s6gj1ycz63w470mv00000gn/T/TemporaryItems/NSIRD_screencaptureui_I7IMhv/Screenshot 2026-06-30 at 5.11.20 PM.png`
- `/var/folders/_2/ptz5_h0s6gj1ycz63w470mv00000gn/T/TemporaryItems/NSIRD_screencaptureui_8LOAnS/Screenshot 2026-06-30 at 5.11.48 PM.png`

Observed screenshot facts:
- Screenshot 1: expanded workspace `autobyteus-workspace`; a `TEAMS` heading; `Software Engineering Team (6)` group; an expanded session row `improve the UI for autobyteus work...`; role rows such as `solution_designer`, `architecture_reviewer`, `implementation_engineer`, etc.
- Screenshot 2: expanded workspace `autobyteus-workspace`; `TEAMS` heading and several team definition rows; expanded `Temp Workspace` with agent rows such as `Codex (2)`, `Daily Assistant (4)`, `Memory Compactor (5)`, each containing prompt-derived run labels such as `rerun` and `open linkedin`.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui`
- Task Artifact Folder: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui/autobyteus-web/tickets/in-progress/session-discovery-ui`
- Current Branch: `codex/session-discovery-ui`
- Current Worktree / Working Directory: `/Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-06-30.
- Task Branch: `codex/session-discovery-ui` created from `origin/personal` at `4331f1013cbefbf6409d6c45b269ee31ca9da562`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: The user's main concern is product UX, not just visual cleanup; preserve easy access to role/member details while making prior sessions first-class.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-30 | Command | `pwd; git rev-parse --show-toplevel; git status --short --branch; git remote -v` | Bootstrap repo/worktree context | Main checkout was branch `personal`, behind `origin/personal` by 350 commits, with untracked `.codex/` and `article-work/`; repo root `/Volumes/bingq/AutoByteus/autobyteus-workspace`. | No |
| 2026-06-30 | Command | `git fetch origin --prune` | Refresh tracked remote refs before task worktree creation | Completed successfully. | No |
| 2026-06-30 | Command | `git worktree add -b codex/session-discovery-ui /Volumes/bingq/AutoByteus/autobyteus-worktrees/session-discovery-ui origin/personal` | Create dedicated task worktree/branch from fresh base | Created branch/worktree at `4331f101`. | No |
| 2026-06-30 | Other | User screenshots listed in Request Context | Understand observed UI problem | Sessions are nested under workspace/team/definition rows; current labels appear prompt-derived and truncated; team roles expand below selected team session. | No |
| 2026-06-30 | Code | `autobyteus-web/components/AppLeftPanel.vue` | Locate left sidebar mount point | `WorkspaceAgentRunsTreePanel` is mounted in the left sidebar below primary nav. | No |
| 2026-06-30 | Code | `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Locate workspace history panel orchestration | Fetches workspaces/definitions; delegates per-workspace rendering; wires selection, mutations, avatar helpers, and tree state. | No |
| 2026-06-30 | Code | `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Inspect current visible hierarchy and row labels | Renders workspace -> agentDefinition -> run rows and workspace -> `Teams` heading -> teamDefinition group -> team run -> member rows. `formatRunLabel` / `formatTeamRunLabel` strip `[User Requirement]` but otherwise display `summary`. | No |
| 2026-06-30 | Code | `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | Inspect expansion/reveal state | Tracks workspace, agent, team-definition, team-run, and team-member expansion. Selection reveal expands team definition before team run. | Yes: design must adjust reveal to workspace -> session/team only. |
| 2026-06-30 | Code | `autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts` | Verify selection behavior | Team row click opens/focuses coordinator/default member via `selectTreeRun`; repeated click toggles expansion. This behavior should be preserved under a session row. | No |
| 2026-06-30 | Code | `autobyteus-web/stores/runHistoryStore.ts` | Inspect store read-model entrypoints | `getTreeNodes()` returns agent-group tree; `getTeamNodes()` returns team nodes; `selectTreeRun` opens agent/team member rows. | Yes: design should add or replace with a session list projection. |
| 2026-06-30 | Code | `autobyteus-web/stores/runHistoryReadModel.ts` | Inspect standalone run projection and local/draft summary | Standalone runs are grouped by workspace/agent; local/draft summary uses first user message or `New - {agent}`. | Yes: session display label should be separate from raw summary. |
| 2026-06-30 | Code | `autobyteus-web/utils/runTreeProjection.ts` | Inspect agent run tree structure | `RunTreeWorkspaceNode` contains `agents` and `runs`; sorting is per-agent, not session-first across workspace. | Yes |
| 2026-06-30 | Code | `autobyteus-web/stores/runHistoryTeamHelpers.ts` | Inspect team run projection | Builds `TeamTreeNode` from persisted and live contexts; preserves source/insertion order; summary comes from persisted row or coordinator first user message for live teams. | Yes |
| 2026-06-30 | Code | `autobyteus-web/components/workspace/history/workspaceHistoryTeamDefinitionGroups.ts` | Inspect team grouping | Builds display groups by team definition so the UI can render `Software Engineering Team (n)`. This grouping is exactly the layer the user wants to remove from the history surface. | Yes: remove/decommission from this view. |
| 2026-06-30 | Code | `autobyteus-web/graphql/queries/runHistoryQueries.ts` | Inspect client history query fields | `listWorkspaceRunHistory` returns `agentDefinitions` and `teamDefinitions`; fields include `summary`, timestamps, status, team member tree/members, but no explicit title/display-title. | Yes |
| 2026-06-30 | Code | `autobyteus-server-ts/src/api/graphql/types/run-history.ts` | Inspect server GraphQL schema/resolver | Schema mirrors grouped agent/team structure and exposes `summary` only for labels. | Maybe if persisted title is added. |
| 2026-06-30 | Code | `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts` | Inspect standalone history service | `listRunHistory` groups rows by workspace and agent; limits per agent; returns `summary`. | Maybe |
| 2026-06-30 | Code | `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts` | Inspect team history service | Lists team runs with `summary`, metadata member tree, status; no title. | Maybe |
| 2026-06-30 | Code | `autobyteus-server-ts/src/run-history/services/run-history-service-helpers.ts` | Inspect summary compaction | `compactSummary` truncates normalized summaries to 100 chars. This explains prompt-prefix row text. | Yes: title/display-label must not be raw compacted summary. |
| 2026-06-30 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts`, `autobyteus-web/stores/agentRunStore.ts` | Inspect initial summary source for agent runs | New agent run preparation stores `initialSummary` from message content, i.e., the original user prompt. | Yes |
| 2026-06-30 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts`, `autobyteus-web/stores/agentTeamRunStore.ts` | Inspect team run summary source | Team run starts with empty summary and later records first user content through `recordRunActivity`; summary remains prompt-derived and only fills if empty. | Yes |
| 2026-06-30 | Code | `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`, `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` | Inspect current expectations | Tests assert old grouping and prefix stripping; these must be updated/replaced for session-first list and display-label projection. | Yes |
| 2026-06-30 | Other | User message: `approve, p l s` | Lock requirements as approved design input | User approved the design-ready requirements direction. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Left sidebar workspace history panel in `AppLeftPanel.vue`.
- Current execution flow:
  1. `AppLeftPanel.vue` mounts `WorkspaceAgentRunsTreePanel.vue`.
  2. `WorkspaceAgentRunsTreePanel.vue` loads workspaces and agent/team definitions and uses `useWorkspaceHistoryTreeState` for expansion/reveal.
  3. Per workspace, `WorkspaceHistoryWorkspaceSection.vue` renders standalone agent definitions and team definition groups.
  4. Clicking a standalone run invokes `actions.onSelectRun(run)` -> `runHistoryStore.selectTreeRun`.
  5. Clicking a team run invokes `actions.onSelectTeam(team, workspaceId)` -> expands team -> resolves coordinator/default member -> `runHistoryStore.selectTreeRun(member)`.
  6. Expanding a team run reveals role/member rows; clicking a member uses `actions.onSelectTeamMember`.
- Ownership or boundary observations:
  - `WorkspaceHistoryWorkspaceSection.vue` currently owns both visual hierarchy and label formatting (`formatRunLabel`, `formatTeamRunLabel`), causing display-title semantics to live inside a renderer.
  - The frontend read models expose grouped subjects (`RunTreeWorkspaceNode.agents`, `TeamRunHistoryDefinitionGroup`) instead of a session row subject.
  - Backend history shape is grouped by agent/team definition and only includes `summary`, so the UI has no explicit session-title field.
- Current behavior summary: The UI optimizes for definition grouping and implementation structure, not for “find my previous session.”

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue plus Shared Structure Looseness
- Refactor posture evidence summary: A local template-only change would leave grouped read-model ownership and raw summary label semantics in place. A session-first read-model/projection is likely needed.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshots | Current tree makes users open workspace, team, session, then role/member to find prior work. | Product navigation owner is modeling implementation structure before user retrieval object. | Target should be workspace -> sessions -> optional details. |
| `WorkspaceHistoryWorkspaceSection.vue` | Renders `Teams` heading and team-definition row before team sessions. | Team definition grouping is a visible hierarchy layer, not merely data organization. | Remove from history surface. |
| `runHistoryReadModel.ts` and `runHistoryTeamHelpers.ts` | Standalone and team runs are projected through separate grouped shapes. | UI lacks one authoritative session row subject. | Add session-list projection. |
| Backend history schema | Only `summary` is returned; no `sessionTitle`/`displayTitle`. | `summary` is overloaded as prompt summary and row identity. | Introduce display-label projection and optional title field. |
| `run-history-service-helpers.ts` | `compactSummary` truncates prompt text to 100 chars. | Prompt-first summaries cannot reliably identify sessions. | Row should use title + metadata, with summary fallback only. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/AppLeftPanel.vue` | Primary left sidebar shell | Mounts `WorkspaceAgentRunsTreePanel`. | No shell-level redesign required. |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Workspace history orchestrator | Wires stores, tree state, avatars, and actions; delegates rendering. | Likely remains orchestration boundary, but should pass session-list state/actions. |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Per-workspace history renderer | Owns old agent/team definition grouping and label formatting. | Should become a session-list renderer or be split into workspace shell + session row/details components. |
| `autobyteus-web/components/workspace/history/workspaceHistoryTeamDefinitionGroups.ts` | Team definition display grouping | Supports the exact team-definition layer being removed from this view. | Should be decommissioned for workspace history surface if no longer used there. |
| `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | Expansion and selection reveal state | Tracks old agent/team-definition expansion. | Replace/reshape with workspace/session/team-member expansion. |
| `autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts` | Selection actions | Team selection behavior is healthy and should be reused. | Session rows should call existing selection actions. |
| `autobyteus-web/stores/runHistoryStore.ts` | Run history store facade/read-model entrypoint | Exposes grouped `getTreeNodes` and `getTeamNodes`. | Add/replace with `getWorkspaceSessions` projection or utility. |
| `autobyteus-web/stores/runHistoryReadModel.ts` | Builds agent grouped history tree and team nodes | Current grouping is not session-first. | New session projection should compose existing agent/team data. |
| `autobyteus-web/utils/runTreeProjection.ts` | Standalone agent run tree projection | Groups by agent definition and sorts within group. | Existing shape can feed session projection but should not be the renderer's primary shape. |
| `autobyteus-web/stores/runHistoryTeamHelpers.ts` | Team run node projection | Produces `TeamTreeNode` and member details. | Keep as team-session detail source. |
| `autobyteus-web/utils/runTreeSummary.ts` | First user message fallback for draft/local summaries | Confirms prompt-derived summary. | Move label responsibility elsewhere. |
| `autobyteus-web/graphql/queries/runHistoryQueries.ts` | Client history GraphQL fields | No display title field. | Query may need `displayTitle` / `sessionTitle` if backend supports it. |
| `autobyteus-server-ts/src/api/graphql/types/run-history.ts` | Server history GraphQL schema/resolvers | Grouped history objects expose `summary` only. | Optional backend extension for explicit display title. |
| `autobyteus-server-ts/src/run-history/services/*history*` | Backend history catalog/list services | Store and expose prompt-derived `summary`. | If persisted title lands now, update record types, services, migrations/codegen. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Frontend component coverage | Tests assert old grouping and prefix stripping. | Replace/add tests for session-first UX. |
| `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` | Store/read-model coverage | Tests assert team summary source/order behavior. | Add session projection/read-model tests. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-30 | Visual inspection | Supplied screenshots, `view_image` tool | Confirms hierarchy depth and prompt-derived/truncated row labels. | Design must address both structure and label semantics. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: N/A.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Not needed for design investigation; existing tests cover component/read-model behavior.
- Required config, feature flags, env vars, or accounts: None for investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree created as above.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. The history surface is a tree, not a session list.
2. Team definition grouping is a visible navigation layer, not only an internal data group.
3. Summary/title semantics are loose: `summary` is derived from raw user input and displayed as a title.
4. Existing team selection behavior is reusable and should not be rewritten unnecessarily.
5. Team member details already have a structured tree and can be rendered below a session row.

## Constraints / Dependencies / Compatibility Facts

- Must preserve existing session open/navigation behavior.
- Must preserve role/member access for team sessions.
- Must preserve history mutation actions and confirmation behavior.
- Current backend records do not have explicit titles; old history needs a safe fallback.
- Current GraphQL generated types would need regeneration if schema fields are added.

## Open Unknowns / Risks

- Whether session title should be persisted in this iteration or remain a front-end projection for now.
- Whether quick-create controls from agent definition group rows require a replacement inside the session-first history panel.
- Whether strict recency or active-first ordering is preferred.

## Notes For Architect Reviewer

If approved, the design should be spine-first around `Workspace history request -> run history store/read model -> session-list projection -> workspace session renderer -> run/team selection action`. The most important boundary is the new session-list projection: component templates should not reconstruct agent/team grouping or directly format raw `summary` as a title.
