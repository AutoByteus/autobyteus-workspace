# UX Requirement Gap Notes — UX-001

## Trigger

API/E2E validation round 2 reported a requirement gap after the user-requested real Northstar backend + browser E2E follow-up.

Backend/API and browser data behavior passed:

- `northstar-operating-company-team` is a root/shared team.
- Five department teams are canonical `TEAM_LOCAL` definitions owned by the company team.
- Department-local agents are owned by canonical local department team IDs.
- The root Agent Teams page shows the company and suppresses local department teams as root peers.
- Direct navigation to a nested department detail route works.

Gap:

- Parent company detail renders nested team rows and blueprint names, but nested team rows have no explicit `View` / `View Details` action.
- Agent members already expose a visible details/view affordance; nested teams should expose a comparable drill-in affordance.

## Requirement Refinement

Added:

- `UC-007`: From a parent team detail page, a user can discover and navigate to a nested team member's own detail page using a visible control.
- `REQ-013`: `AgentTeamDetail` must render a visible nested-team navigation action for resolvable `agent_team` members, routing to the resolved canonical team definition ID for shared, application-owned, and team-local nested teams.
- `AC-011`: A parent team detail page with a team-local department member shows a visible `View` / `View Details` action; activating it navigates to `/agent-teams?view=team-detail&id=<resolved canonical child team id>` and displays the child detail page.

## Design Refinement

Added a `Nested-Team Detail Navigation Affordance (UX-001)` section to the design spec.

Target design:

- `AgentTeamDetail` resolves each `agent_team` member to the same canonical child team ID already used for blueprint/avatar display.
- If the child team definition is resolvable, render a visible localized `View` / `View Details` row action.
- For `TEAM_LOCAL` nested teams, route to the canonical team-local ID built from the current parent team ID and local member ref.
- For shared/application-owned nested teams, route to the normalized canonical `node.ref` from GraphQL/store projection.
- The row action emits existing page navigation payload `{ view: 'team-detail', id: resolvedChildTeamId }`; `pages/agent-teams.vue` remains the router owner.
- Missing/unresolved nested teams must not emit broken routes.

## Implementation Scope Impact

This is a small frontend implementation follow-up, not a backend ownership/model redesign:

- `autobyteus-web/components/agentTeams/AgentTeamDetail.vue`: add nested team view action/helper.
- `autobyteus-web/pages/agent-teams.vue`: reuse existing navigation payload; likely no behavior change unless type widening is needed.
- `autobyteus-web/localization/messages/en/agentTeams.ts` and `zh-CN/agentTeams.ts`: add nested-team view labels.
- `autobyteus-web/components/agentTeams/__tests__/AgentTeamDetail.spec.ts`: add tests for visible action and emitted canonical child ID.
- Browser/API validation should re-run the Northstar parent-detail scenario and assert visible nested-team navigation.

## Workflow Note

API/E2E also added durable validation in:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-local-subteams/autobyteus-server-ts/tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts`

After UX-001 implementation proceeds, repository-resident validation changes still need code-review re-review before delivery.
