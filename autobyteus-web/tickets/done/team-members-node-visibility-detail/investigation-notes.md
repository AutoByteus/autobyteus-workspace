# Investigation Notes - team-members-node-visibility-detail

## Context
User feedback: In Agent Team detail `Members` area, users cannot tell that some members come from a different node (for example `student` from Docker 8001). Existing UI only shows member name and blueprint.

## Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-web/components/agentTeams/AgentTeamDetail.vue`
- `/Users/normy/autobyteus_org/autobyteus-web/components/agentTeams/__tests__/AgentTeamDetail.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-web/stores/agentTeamContextsStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-web/stores/__tests__/agentTeamContextsStore.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-web/stores/federatedCatalogStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-web/stores/nodeStore.ts`
- `/Users/normy/autobyteus_org/autobyteus-web/types/node.ts`
- Prior related ticket: `/Users/normy/autobyteus_org/autobyteus-web/tickets/agent-team-member-node-hints-removal/requirements.md`
- Runtime data verification (Docker 8001 SQLite DB): `agent_team_definitions`, `agent_definitions`, `agent_prompt_mappings`, `prompts` tables.

## Current-State Findings
1. `AgentTeamDetail` member cards render:
   - member name
   - blueprint name
   - type chip (`AGENT`/`TEAM`)
   - coordinator chip (if applicable)
   - no explicit node/source indicator.
2. Team member nodes include `homeNodeId` in model, but detail UI does not expose it.
3. Remote-vs-local ID collision exists in real data (`reference_id=24` mapped to different agent names on local vs Docker 8001 DB). This was fixed for blueprint resolution by adding node-scoped lookup.
4. Separation-of-concern issue remains:
   - `AgentTeamDetail` directly initializes node registry and federated catalog on mount.
   - Similar member-name resolution logic also exists in `agentTeamContextsStore`.
5. Existing prior ticket removed node hint controls from team edit form; that reduced configuration complexity but also means users now have fewer visual signals about node placement in detail views.

## Constraints
- No backend schema change requested.
- Must preserve existing team-member data contract (`homeNodeId`, `referenceId`, `referenceType`).
- Must not reintroduce deprecated required/preferred node placement controls.
- Keep UI concise in member cards (mobile and desktop).

## Risks
- If node registry/catalog is stale or unavailable, node labels may degrade to raw `homeNodeId` text.
- Duplicated member display-resolution logic can drift unless bounded in this ticket or followed by shared resolver extraction.

## Unknowns
- Whether product wants node shown for all members or only remote members.
- Desired copy: `Node: <name>` vs `Source: <name>` vs suffix notation.
- Whether to add degraded-state chip when node metadata cannot be resolved.

## Implications For Requirements/Design
- Add explicit node visibility in member cards is low-risk and directly addresses user confusion.
- For this scope, best boundary is:
  - UI concern: render node/source chip in member cards.
  - Data concern: reuse existing node store lookup; avoid backend changes.
- Additional architectural cleanup (shared resolver extraction) can be scoped narrowly if it does not expand blast radius.
