# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Current-state investigation complete enough for a revised settings-driven design proposal.
- Investigation Goal: Design a small catalog optimization: configure featured agents/teams from Server Basic Settings and seed Super Assistant as the default featured agent.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The visual catalog change is focused, but it includes server setting schema/validation, a Basic Settings UI card, Super Assistant seeding, and limited list composition changes for agents and teams.
- Scope Summary: Seed `autobyteus-super-assistant` as a normal shared agent; initialize `AUTOBYTEUS_FEATURED_CATALOG_ITEMS` if unset; let Settings → Basics manage featured agents/teams; render matching featured sections using existing cards/run flows.
- Primary Questions Resolved: Current Agents and Agent Teams list owners; card/action data flow; server settings storage shape; whether featured status belongs in config metadata or settings.

## Request Context

This is a new, independent ticket based on the default personal branch. The ticket should perform one first optimization: make the Super Assistant/default general assistant easy to find. User feedback refined the source of truth:

- Do not hard-code featured ids in frontend.
- Do not put featured placement in agent config as if the agent self-promotes.
- Put featured catalog configuration in Server Basic Settings so users can later add featured agents or agent teams conveniently.

This ticket should improve discoverability on existing catalog pages. It must not depend on, reuse, or implement artifacts from other in-progress product-entry experiments.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/featured-default-assistant`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/featured-default-assistant/tickets/featured-default-assistant`
- Current Branch: `codex/featured-default-assistant`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/featured-default-assistant`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-05-07 before worktree creation.
- Task Branch: `codex/featured-default-assistant`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: This ticket is independent and was created from `origin/personal`; no upstream artifacts from other tickets are authoritative for this design.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-07 | Command | `git fetch origin --prune`; branch/worktree checks; `git worktree add -b codex/featured-default-assistant ... origin/personal` | Refresh base and create dedicated task workspace | New dedicated worktree created from `origin/personal` at commit `c33be852`. | No |
| 2026-05-07 | Doc | `solution-designer/SKILL.md`; `solution-designer/design-principles.md` | Required workflow and design principles | Need dedicated worktree, current-state read, spine/ownership-based design. | Applied. |
| 2026-05-07 | Code | `autobyteus-web/pages/index.vue` | Check current landing route | `/` redirects to `/agents`. | No |
| 2026-05-07 | Code | `autobyteus-web/components/agents/AgentList.vue`; `AgentCard.vue`; `useRunActions.ts` | Trace Agents list and run path | AgentList owns search/render/actions; AgentCard has normal actions; run uses `prepareAgentRun` and `/workspace`. | Extend list composition only. |
| 2026-05-07 | Code | `autobyteus-web/components/agentTeams/AgentTeamList.vue`; `AgentTeamCard.vue` | Trace Agent Teams list and run path | Team list has parallel search/grid/card pattern; team run uses `prepareTeamRun` and `/workspace`. | If settings supports teams, add matching `Featured teams` section. |
| 2026-05-07 | Code | `autobyteus-web/stores/agentDefinitionStore.ts`; `agentTeamDefinitionStore.ts`; GraphQL queries | Check frontend definition data | Stores already load visible agents and teams with ids/names/descriptions. | Settings card can use existing stores for selection. |
| 2026-05-07 | Code | `autobyteus-web/components/settings/ServerSettingsManager.vue`; `autobyteus-web/stores/serverSettings.ts`; server settings GraphQL | Check Settings → Basics structure | Quick/basic page already has card grid and raw server settings. Values are saved through `updateServerSetting(key,value)` as strings. | Add a specialized Basic card that reads/writes JSON string setting. |
| 2026-05-07 | Code | `autobyteus-server-ts/src/services/server-settings-service.ts` | Check server settings registration/validation | Predefined settings are registered with descriptions; existing validation supports allowed values. Complex JSON setting needs helper/validation extension or safe parser. | Add featured catalog setting key and validation/parser helper. |
| 2026-05-07 | Code/Data | `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/super-ai-assistant/agent.md`; `agent-config.json` | Check source Super Assistant definition | Private package has general-agent instructions and tools. | Copy/version as product-owned seed; runtime must not depend on private path. |
| 2026-05-07 | Code | `default-compactor-agent-bootstrapper.ts`; compactor tests; `server-runtime.ts` | Find default agent seed precedent | Compactor seed writes missing files only and preserves edits. | Mirror seed-if-missing for Super Assistant and initialize featured setting only if unset. |
| 2026-05-07 | Command | `git fetch origin --prune && git status --short --branch && git rev-parse --short HEAD && git rev-parse --short origin/personal` | Re-verify dedicated worktree/base state before architecture-review handoff | Branch `codex/featured-default-assistant` remains aligned with `origin/personal` at `c33be852`; only ticket artifacts are untracked. | No |

## Current Behavior / Current Flow

- `/` redirects to `/agents`.
- Agents page loads all visible agent definitions and renders one searchable grid.
- Agent Teams page loads all visible team definitions and renders one searchable grid.
- Existing cards already own normal display/action emits.
- Existing settings page has a Basics/quick mode with reusable cards and raw settings in advanced mode.

## Current Crowding Cause

The visible lists include multiple ownership scopes:

1. Shared/platform definitions.
2. Application-owned definitions.
3. Team-local definitions discovered inside team folders.

Because all visible definitions are rendered in one grid, the general-purpose assistant is not visually distinguished from specialized definitions.

## Source-Of-Truth Analysis

Rejected:

- Frontend hard-coded featured id list, because it creates UI policy drift and requires code changes for future featured items.
- Existing `category`, because it describes the definition domain/category and is shown in forms/details; using it for UI placement would conflate meanings.
- Agent config self-metadata, because featured/default status is product/server preference rather than an intrinsic capability of the agent package.

Recommended:

- Add server setting `AUTOBYTEUS_FEATURED_CATALOG_ITEMS` as the source of truth.
- Store a versioned JSON object with `resourceKind`, `definitionId`, and `sortOrder` entries.
- Add Settings → Basics UI to manage the setting.
- Catalog pages consume this setting and join it to loaded definitions.

## Proposed Setting Shape

```json
{
  "version": 1,
  "items": [
    { "resourceKind": "AGENT", "definitionId": "autobyteus-super-assistant", "sortOrder": 10 },
    { "resourceKind": "AGENT_TEAM", "definitionId": "example-team-id", "sortOrder": 20 }
  ]
}
```

## Source Super Assistant Notes

The private Super Assistant source exists at:

- `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/super-ai-assistant/agent.md`
- `/Users/normy/autobyteus_org/autobyteus-private-agents/agents/super-ai-assistant/agent-config.json`

Design conclusion:

- Use this as the content template source during implementation.
- Copy/version the template into the product repository.
- Seed into the normal app data agents directory on startup.
- Do not reference the private path at runtime.
- Normalize platform identity to stable id `autobyteus-super-assistant` and display name `AutoByteus Super Assistant`.
- Initialize featured setting to this agent only if the setting is unset/blank.

## Design Implications

- Agents page should render `Featured agents` from server setting entries of kind `AGENT`.
- Agent Teams page should render `Featured teams` from server setting entries of kind `AGENT_TEAM` if the settings UI allows teams.
- Search mode should hide grouping and search the full list.
- Featured cards should reuse existing card and action paths.
- Backend seeding is needed so the default setting points to an existing platform-owned agent.

## Open Questions For User Review

1. Should the setting key be `AUTOBYTEUS_FEATURED_CATALOG_ITEMS`? Recommendation: yes.
2. Should the Settings card allow agent teams in this ticket? Recommendation: yes, if we also render `Featured teams` to avoid hidden configuration.
3. Should reorder use drag-and-drop or up/down buttons? Recommendation: up/down buttons for v1.
4. Should unresolved referenced ids appear in Settings? Recommendation: yes as warning rows with remove action; catalog pages should ignore them safely.

## Investigation Conclusion

The best design is settings-driven: seed Super Assistant as a normal shared agent, initialize a featured catalog server setting if missing, expose a Basic Settings card for featured agents/teams, and render configured featured sections in the existing list pages with normal cards/run flows. This avoids hard-coded frontend policy and avoids treating featured status as intrinsic agent metadata.
