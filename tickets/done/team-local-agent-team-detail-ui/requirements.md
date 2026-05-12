# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Team-local agents currently appear in the generic Agents catalog and can be viewed/edited from the Agents page, while the owning Agent Team detail page only shows each member as a shallow member card. This creates an ownership mismatch and an inconvenient user journey: a user inspecting a team cannot expand a team-local member, read that agent's real definition details, or edit that member without leaving the team context and searching the crowded Agents page.

This change should make the Agent Team detail page the primary user experience for viewing and editing `TEAM_LOCAL` agent members, using compact member-card actions rather than large repeated buttons. Shared/global agent members should get a lightweight view action that opens the existing Agent Detail page. Application-owned behavior remains unchanged for this task.

## Investigation Findings

- `autobyteus-web/components/agentTeams/AgentTeamDetail.vue` already fetches both team definitions and agent definitions and resolves team-local member agent definitions with `buildTeamLocalAgentDefinitionId(teamDef.id, node.ref)` for avatar/name lookup, but member cards do not expose expanded details or edit controls.
- `autobyteus-web/components/agents/AgentDetail.vue` already renders full agent fields, ownership badges, instructions, skills, tools, optional processors, and default launch configuration.
- `autobyteus-web/components/agents/AgentEdit.vue` uses `AgentDefinitionForm.vue` plus `agentDefinitionStore.updateAgentDefinition(...)`; that save path can update team-local definitions because the store update input is definition-id based.
- `autobyteus-web/components/agents/AgentList.vue` currently renders `originSections.teamLocalGroups` in browse mode and includes team-local agents in flat search results.
- `autobyteus-web/utils/catalog/agentDefinitionOriginGroups.ts` explicitly groups `TEAM_LOCAL`, `APPLICATION_OWNED`, and shared definitions. For this task only the Agents-page consumption of `teamLocalGroups` should change; application-owned grouping should remain unchanged.
- `autobyteus-web/docs/agent_management.md` currently documents team-local agents as visible and editable from the generic Agents list/detail/edit surfaces. That documentation will need to be updated after implementation.
- `autobyteus-web/docs/agent_teams.md` already says team detail cards surface team-local member badges; it should be extended to document inline team-local member details/editing.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Feature
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, bounded to frontend composition/reuse
- Evidence basis: Team-local member details are owned by the team in the product model, but the current primary inspection/edit route is the generic Agents page. `AgentTeamDetail.vue` has enough data to resolve team-local definitions but only uses that data for shallow avatar/name rendering. `AgentList.vue` promotes team-local groups in the generic browse surface, increasing crowding.
- Requirement or scope impact: The change should move the primary team-local member view/edit affordance into Agent Team detail and de-emphasize/remove team-local agents from the generic Agents list/search for this first scope. It must not redesign application-owned agents or shared agent ownership.

## Recommendations

1. Add an expandable/collapsible detail area to `AgentTeamDetail.vue` member cards only when the member is an `AGENT` with `refScope === 'TEAM_LOCAL'` and its canonical agent definition can be resolved. The visible affordance should be compact, such as `Details` with a chevron/icon, not a large full-width `View member agent details` button repeated on every card.
2. Reuse existing agent-detail rendering concepts, but keep the interaction inside the team detail page so the user stays in the team-local ownership context.
3. Provide an inline edit state for team-local members that saves via `agentDefinitionStore.updateAgentDefinition(...)` and returns to the expanded read view without navigating to `/agents`.
4. Hide team-local agent groups from the default Agents page browsing experience, and remove team-local agents from normal Agents-page search results for this scoped change, so users are guided to inspect them from their owning team.
5. For shared/global agent members, add a compact `View`/external-link style action that routes to the existing Agent Detail page for that agent. Do not add inline shared-agent editing in this task.
6. Leave application-owned agents unchanged for now, except that they continue to display in existing team member cards as they do today.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- `UC-TL-001`: A user opens Agent Teams, enters a team detail page, and expands a team-local agent member to view the member agent's definition details without leaving the team page.
- `UC-TL-002`: A user edits a team-local member's agent definition from the expanded team-local member area and remains in the Agent Team detail context after save/cancel.
- `UC-TL-003`: A user opens the Agents page and does not see team-local agents in the default browse catalog, reducing catalog crowding.
- `UC-TL-004`: A user searches the Agents page and normal results exclude team-local agents, reinforcing that team-local definitions should be found through the owning team.
- `UC-TL-005`: A user viewing an Agent Team composed from shared/global individual agents can use a compact member-card action to open that shared agent in the existing Agent Detail page.

## Out of Scope

- Changing application-owned agent listing, view, edit, or ownership behavior.
- Adding featured/unfeatured buttons to agent or team cards.
- Changing featured catalog server setting behavior.
- Inline details or inline editing for shared-agent members from Agent Team detail; only a compact route-to-Agent-Detail view action is in scope.
- Redesigning nested agent-team member details.
- Backend schema or persistence changes.
- Removing support for direct agent detail/edit routes if a team-local definition id is opened directly.
- Changing application package import/remove behavior.

## Functional Requirements

- `REQ-TL-001`: Agent Team detail must identify a team-local member's canonical agent definition id with the existing `buildTeamLocalAgentDefinitionId(teamDefinitionId, node.ref)` rule.
- `REQ-TL-002`: Each resolvable team-local agent member on Agent Team detail must provide a collapsed summary and an explicit compact expand/collapse control, such as `Details` plus chevron/icon, instead of a large repeated full-width button.
- `REQ-TL-003`: The expanded team-local member view must show the agent definition's core details inside the team page: name, role when available, category, description, default runtime, default model, instructions, skills, tools, and optional processor groups when configured.
- `REQ-TL-004`: The expanded team-local member view must preserve team context with visible badges/labels for `Team-local` and coordinator status when applicable.
- `REQ-TL-005`: A team-local member's expanded area must provide an edit action that keeps the user in Agent Team detail and does not route to `/agents`.
- `REQ-TL-006`: The team-local edit experience must persist changes through the existing agent-definition update path and update the displayed team-local member details after a successful save.
- `REQ-TL-007`: Canceling team-local edit must return to the expanded read-only member details without persisting draft changes.
- `REQ-TL-008`: Non-team-local members must not receive inline team-local detail/edit behavior. Shared/global agent members may only receive the route-to-Agent-Detail view action defined in `REQ-TL-013`; application-owned agents and nested teams must keep their current behavior in this task.
- `REQ-TL-009`: The Agents page default browse view must no longer render the team-local groups/section.
- `REQ-TL-010`: The Agents page normal search results must exclude definitions whose normalized ownership scope is `TEAM_LOCAL`.
- `REQ-TL-011`: Application-owned agents must remain visible/searchable/editable according to the existing Agents-page behavior.
- `REQ-TL-012`: Documentation for Agents and Agent Teams must be updated to describe team-local ownership and the new primary team-detail view/edit path.
- `REQ-TL-013`: Shared/global agent members in Agent Team detail must expose a compact `View` action when their agent definition id is resolvable, and that action must navigate to the existing `/agents?view=detail&id=<agentId>` detail surface for the shared agent.
- `REQ-TL-014`: Shared/global member view navigation should preserve team return context when practical, for example by including the owning team id in the route query so the Agent Detail back action can return to the originating team detail page.
- `REQ-TL-015`: Member card actions must visually remain secondary and compact so the Members grid stays scannable even when many members are present.

## Acceptance Criteria

- `AC-TL-001`: Given a team with a `TEAM_LOCAL` agent member and the corresponding agent definition is loaded, when the user opens that team's detail page, the member card displays a team-local badge and a compact expand/collapse affordance, not a large full-width details button.
- `AC-TL-002`: Given the same member, when the user expands the card, then the page displays the member agent's description, instructions, tools, skills, default runtime/model, and configured optional processor groups inside the team detail page.
- `AC-TL-003`: Given an expanded team-local member, when the user clicks edit, changes a supported agent-definition field, and saves, then `updateAgentDefinition` is called for the canonical team-local agent definition id and the expanded read view reflects the saved value.
- `AC-TL-004`: Given an expanded team-local member in edit mode, when the user clicks cancel, then no update is sent and the UI returns to read mode inside the same team detail page.
- `AC-TL-005`: Given a shared/global agent member in a team, the member card can show a compact `View` action that opens the existing Agent Detail page, but it does not gain team-local inline detail/edit behavior.
- `AC-TL-005A`: Given an application-owned agent member or nested team member, the member card behavior remains unchanged in this task.
- `AC-TL-006`: Given the Agents page with no search query, team-local agent groups/cards are not rendered; existing application-owned and shared sections continue to render as before.
- `AC-TL-007`: Given the Agents page search box, matching `TEAM_LOCAL` agents are excluded from normal search results; matching shared and application-owned agents still appear.
- `AC-TL-008`: Existing direct `/agents?view=detail&id=<team-local-id>` and `/agents?view=edit&id=<team-local-id>` behavior is not intentionally removed by this task.
- `AC-TL-009`: Unit/component coverage is updated for Agent Team detail expansion/edit behavior and Agents page team-local exclusion.
- `AC-TL-010`: No application-owned behavior is changed except incidental coexistence in unchanged member cards.
- `AC-TL-011`: Given a shared/global member card `View` action with return context, when the user uses Agent Detail's back action, the user can return to the originating Agent Team detail page instead of being forced back to the Agents list.

## Constraints / Dependencies

- The frontend must use existing `AgentDefinition` data and existing GraphQL update behavior; no backend schema change is expected.
- Team-local agent ids are canonicalized through `utils/teamLocalAgentDefinitionId.ts`; implementation must not invent a second id rule.
- Agent Team detail already loads team and agent definitions; the design should reuse those stores instead of introducing a parallel data source.
- The existing `AgentDefinitionForm.vue` is large and includes option-store loading side effects. If reused inline, the design must account for layout and loading; if not reused directly, the design must avoid duplicating update shape inconsistently.
- Application-owned agent behavior must remain as-is.

## Assumptions

- A team-local member's `node.ref` is the local member/agent id component, and `buildTeamLocalAgentDefinitionId(teamDef.id, node.ref)` resolves the persisted `AgentDefinition.id`.
- The existing `agentDefinitionStore.updateAgentDefinition(...)` path can update team-local definitions with the canonical id.
- Hiding team-local agents from Agents page browse/search is acceptable because Agent Team detail will become the primary team-local discovery path.

## Risks / Open Questions

- `RISK-TL-001`: Inline reuse of the full `AgentDefinitionForm.vue` may make a member card visually heavy; the design should choose between full inline form, nested panel, or a smaller reusable team-local edit component.
- `RISK-TL-002`: If some backend-provided team-local definitions are missing from the agent definitions store, the UI needs a clear unresolved state instead of a broken expander.
- `RISK-TL-003`: Removing team-local agents from normal Agents-page search reduces a debugging path. Direct URL access is kept, but no advanced include-team-local filter is in scope unless requirements change.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| `UC-TL-001` | `REQ-TL-001`, `REQ-TL-002`, `REQ-TL-003`, `REQ-TL-004` |
| `UC-TL-002` | `REQ-TL-005`, `REQ-TL-006`, `REQ-TL-007` |
| `UC-TL-003` | `REQ-TL-009`, `REQ-TL-011` |
| `UC-TL-004` | `REQ-TL-010`, `REQ-TL-011` |
| `UC-TL-005` | `REQ-TL-013`, `REQ-TL-014`, `REQ-TL-015` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| `AC-TL-001` | Team-local member is discoverable from team detail. |
| `AC-TL-002` | Team-local details can be inspected without leaving team context. |
| `AC-TL-003` | Team-local edit persists through the canonical agent-definition update path. |
| `AC-TL-004` | Team-local edit cancel is local and non-persistent. |
| `AC-TL-005` | Shared/global members get only a compact route-to-detail action, not inline team-local editing. |
| `AC-TL-005A` | Application-owned and nested team members are not accidentally redesigned. |
| `AC-TL-006` | Agents page browse is decluttered for team-local ownership. |
| `AC-TL-007` | Agents page search follows the new team-local discovery rule. |
| `AC-TL-008` | Existing direct routes are not removed as part of this scoped change. |
| `AC-TL-009` | Validation coverage protects the new UX. |
| `AC-TL-010` | Application-owned behavior remains unchanged. |
| `AC-TL-011` | Shared/global detail navigation preserves team return context when implemented. |

## Approval Status

Approved by user on 2026-05-12. Scope confirmed: work on team-local agent UX, keep member actions compact, add shared/global member route-to-Agent-Detail view action, and leave application-owned behavior unchanged for now.
