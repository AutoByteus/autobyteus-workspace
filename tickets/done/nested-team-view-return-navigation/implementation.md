# Implementation: Nested Team View Return Navigation

## Solution Sketch

- Reuse the existing Agent Team detail route for nested team navigation.
- Add `returnToTeam` query propagation to `/agent-teams` navigation, analogous to the existing shared-agent `returnToTeam` flow through `/agents`.
- Pass `returnToTeamId` into `AgentTeamDetail` and switch the back button from `Back to Agent Teams` to `Back to Parent Team` when a parent context exists.
- Emit a context-clearing navigation when returning to the parent so the parent detail page resumes normal list-back behavior.
- Rename the nested team action localization from `View Details ↗` to `View ↗` for visual consistency with shared agent members.

## Files Changed

- `autobyteus-web/components/agentTeams/AgentTeamDetail.vue`
- `autobyteus-web/pages/agent-teams.vue`
- `autobyteus-web/components/agentTeams/__tests__/AgentTeamDetail.spec.ts`
- `autobyteus-web/localization/messages/en/agentTeams.ts`
- `autobyteus-web/localization/messages/zh-CN/agentTeams.ts`
- `autobyteus-web/docs/agent_teams.md`

## Verification

- Targeted component test suite passed.
- Localization boundary guard passed.
- Browser check confirmed the dev frontend uses the Electron embedded server and shows parent-return UI when `returnToTeam` is present.
- User manually tested and confirmed: "it works great. now its done."
