# Investigation Notes: Agent Team Row Disclosure Affordance

## Investigation Goals / Questions
- Locate the frontend component rendering the left Agents sidebar rows shown in the provided screenshots.
- Identify why the fold/unfold affordance is visually easy to miss.
- Determine the smallest safe frontend change that makes the agent-team disclosure control obvious without changing sidebar data flow or selection behavior.
- Identify validation commands and local browser setup for visual inspection against an Electron-started backend.

## Scope Triage
- **Scope:** Small.
- **Rationale:** The affected behavior is localized to one Vue component in the workspace history sidebar. The data flow, stores, backend contracts, run selection, and tree expansion state already exist. The likely fix is presentational markup/classes plus accessibility metadata on the team definition and team run disclosure affordances, with focused component tests and browser visual inspection.

## Source Evidence
### User-provided screenshots
- `ctx_14225b672c0d__image.png`: Full desktop view shows the left Agents sidebar. Under `Teams`, the `Software Engineering Team (13)` team-definition row uses a very small gray chevron at the far left; child team run rows also use tiny chevrons before status dots.
- `ctx_a2b5cd4660f5__image.png`: Close-up of team run rows confirms the disclosure arrow is a tiny gray mark, visually competing with text/status and easy to overlook.

### Commands run
- `git status --short --branch`, `git remote -v`, `git symbolic-ref --quiet --short refs/remotes/origin/HEAD`, `git branch -r --list 'origin/*'`: confirmed git bootstrap base `origin/personal`.
- `git fetch origin --prune`, `git branch codex/agent-team-chevron-affordance origin/personal`, `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-chevron-affordance codex/agent-team-chevron-affordance`: created the ticket worktree from fresh tracked remote base.
- `find . -maxdepth 2 -name package.json -print`: identified `autobyteus-web` as the Nuxt/Electron frontend package.
- `rg -n "Software Engineering Team|TEAMS|team|Chevron|chevron|collapse|expanded|isExpanded|fold|unfold" autobyteus-web ...`: found workspace history components and tests.
- `rg -n "RunningTeam|WorkspaceHistoryWorkspaceSection|teamsHeading|TEAMS|teamDefinitions|teamDefinitionName|isExpanded|expanded|toggle|chevron" autobyteus-web/components/workspace autobyteus-web/stores autobyteus-web/composables`: narrowed the affected component to `WorkspaceHistoryWorkspaceSection.vue` and state/actions contracts.
- `sed -n '1,320p' autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`: inspected the rendered tree markup.
- `sed -n '1,130p' autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts`: confirmed clicking a selected team toggles expansion and clicking an unselected team expands/selects it; behavior should not be changed.
- `cat autobyteus-web/package.json`: identified validation/start commands: `pnpm test:nuxt`, `pnpm --filter autobyteus dev`/package `dev` via Nuxt, default backend proxy target `localhost:8000` from Nuxt config.

## Current Entrypoints / Boundaries / Owners
- UI owner: `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` renders workspace, agent, team-definition, team-run, and team-member rows in the left Agents history tree.
- State owner: `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` owns `isTeamDefinitionExpanded`, `toggleTeamDefinition`, `isTeamExpanded`, `setTeamExpanded`, and `toggleTeam`.
- Selection/action owner: `autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts` owns selection side effects. `onSelectTeam(team)` expands/selects the team on first click and toggles expansion only when the same team is already selected.
- Parent wiring owner: `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` passes state and action bindings into `WorkspaceHistoryWorkspaceSection.vue`.
- Tests: `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`, `.regressions.spec.ts`, and `HistoricalTeamLazyHydration.integration.spec.ts` exercise expansion state and team row selection.

## Key Current-Behavior Findings
- The team-definition disclosure icon currently uses `class="mr-1 h-3.5 w-3.5 text-gray-400 transition-transform"` and no dedicated background/hit-area styling, making it only ~14px and low contrast.
- The team-run disclosure icon uses the same `h-3.5 w-3.5 text-gray-400` treatment inside a broader row, so it appears as a tiny gray mark rather than an intentional control.
- Workspace-level rows use a slightly larger `h-4 w-4` chevron, but nested team rows are smaller even though their expand/collapse behavior is important and less obvious.
- Team-definition rows already expose `aria-expanded`; team-run rows visually rotate an icon based on `state.isTeamExpanded(team.teamRunId)` but do **not** expose `aria-expanded` on the team row button.
- Existing data-test selectors target the row buttons (`workspace-team-definition-row-*`, `workspace-team-row-*`), so adding internal disclosure wrappers should not break current tests if the row buttons remain.

## File Placement Observations
- The affected markup belongs in `WorkspaceHistoryWorkspaceSection.vue`, which already owns the row-level presentation for the workspace history tree. No new component/file is required for this small presentational change.
- Existing tests live beside the component in `components/workspace/history/__tests__`; focused test updates should stay there.

## Constraints / Unknowns
- The local Electron-started backend is expected at `http://localhost:8000` per `autobyteus-web/nuxt.config.ts` development defaults. Browser verification should start the Nuxt frontend and use that backend if available.
- The exact live data in the Electron backend may differ, but the component can be verified visually through the existing left Agents sidebar if history data is available.

## Design Implications
- Improve the disclosure affordance visually at the UI boundary by giving team-related chevrons a larger fixed target, rounded background, clearer color, and hover/focus state while preserving row click/selection behavior.
- Apply the change to both team-definition rows and individual team-run rows because both screenshots show tiny fold/unfold arrows.
- Add `aria-expanded` to the team-run row button so the disclosure state is explicit for assistive technology and easier to assert in tests.
