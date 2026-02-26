# Proposed Design Document

## Summary
Redesign the Agent Teams frontend (`list`, `create/edit`, `detail`) to match approved prototypes: cleaner list cards with header actions and simple name search, single-screen drag-and-drop team builder, simplified detail page, and persisted team avatar support.

## Goals
- Implement the approved team list visual hierarchy and behavior.
- Replace row-based team composition with drag-and-drop builder UX.
- Simplify team detail page to identity + description + members.
- Add team avatar upload/preview in create/edit flows and surface avatar in list/detail.
- Persist team avatar through backend GraphQL + database fields.

## Non-Goals
- Runtime/team execution model changes.
- Cross-app (`autobyteus-edu-web`) UI parity in this ticket.

## Requirements And Use Cases
- UC-1: Browse teams with simple name search and run/view actions.
- UC-2: Create/edit teams by dragging agents/teams into canvas and setting coordinator.
- UC-3: View team details with cleaner member presentation.
- UC-4: Upload a team avatar in create/edit and reuse it in list/detail with backend persistence.

## Current State (As-Is)
- List is basic cards without search and without team avatar support.
- Definition form is row-based and high-friction.
- Detail page is visually plain and denser than desired.
- Team avatars are not modeled in team GraphQL/store path.

## Target State (To-Be)
- List uses search-by-name, polished cards, header-positioned actions, team avatar tile.
- Definition form uses three-panel drag-and-drop builder with inline validation and coordinator toggle.
- Detail page uses simplified sections and polished member cards.
- Team avatar is persisted via `AgentTeamDefinition.avatarUrl` in backend and consumed directly by frontend.

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `autobyteus-server-ts/src/agent-team-definition/domain/models.ts` | same | Add `avatarUrl` to team domain/update models | backend team CRUD | persisted nullable string |
| C-002 | Modify | `autobyteus-server-ts/prisma/schema.prisma` | same | Add `avatar_url` column to team model | backend persistence | migration required |
| C-003 | Add | N/A | `autobyteus-server-ts/prisma/migrations/20260210192000_add_agent_team_avatar/migration.sql` | Apply schema change to DB | backend persistence | sqlite `ALTER TABLE` |
| C-004 | Modify | `autobyteus-server-ts/src/api/graphql/types/agent-team-definition.ts` | same | Expose `avatarUrl` on output and create/update inputs | backend GraphQL contract | nullable string |
| C-005 | Modify | `autobyteus-server-ts/src/api/graphql/converters/agent-team-definition-converter.ts` | same | Map domain avatar to GraphQL | backend API conversion | |
| C-006 | Modify | `autobyteus-web/stores/agentTeamDefinitionStore.ts` | same | Include `avatarUrl` in frontend team interfaces and mutation inputs | frontend data model | |
| C-007 | Modify | `autobyteus-web/graphql/queries/agentTeamDefinitionQueries.ts` | same | Query `avatarUrl` for list/detail/edit hydration | frontend GraphQL docs | |
| C-008 | Modify | `autobyteus-web/components/agentTeams/AgentTeamCard.vue` | same | Read avatar from team data (no local store) | team list UX | |
| C-009 | Modify | `autobyteus-web/components/agentTeams/AgentTeamCreate.vue` | same | Submit avatar in create payload (no strip/local map) | create flow | |
| C-010 | Modify | `autobyteus-web/components/agentTeams/AgentTeamEdit.vue` | same | Submit avatar in update payload and preload from team data | edit flow | |
| C-011 | Modify | `autobyteus-web/components/agentTeams/AgentTeamDetail.vue` | same | Read avatar from team data | detail UX | |
| C-012 | Remove | `autobyteus-web/stores/agentTeamAvatarStore.ts` | N/A | Remove temporary local avatar map | frontend state cleanup | replaced by backend persistence |

## Architecture Overview
- Extend server team contracts to include `avatarUrl`.
- Keep existing team definition CRUD flows and emit/route contracts.

## File And Module Breakdown

| File/Module | Change Type | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-definition/domain/models.ts` | Modify | Team domain/update models now include avatar URL | class fields | DB/provider conversion | prisma converter/service |
| `autobyteus-server-ts/src/api/graphql/types/agent-team-definition.ts` | Modify | GraphQL team contracts include avatar URL | GraphQL schema fields | query/mutation payloads | resolver/service |
| `components/agentTeams/AgentTeamList.vue` | Modify | Team list shell, search, card rendering | emits `navigate` | search text -> filtered defs | team definition store, run actions |
| `components/agentTeams/AgentTeamCard.vue` | Modify | Team card presentation and actions | emits `run-team`/`view-details` | team def -> card UI | team data (`avatarUrl`) |
| `components/agentTeams/AgentTeamDefinitionForm.vue` | Modify | Create/edit builder UX and form validation | emits `submit`/`cancel` | user interactions -> payload | agent/team stores, file upload store |
| `components/agentTeams/AgentTeamCreate.vue` | Modify | Create wrapper orchestration | emits `navigate` | form payload -> create mutation | team store |
| `components/agentTeams/AgentTeamEdit.vue` | Modify | Edit wrapper orchestration | emits `navigate` | form payload -> update mutation | team store |
| `components/agentTeams/AgentTeamDetail.vue` | Modify | Detail view presentation and actions | emits `navigate` | team id -> detail UI | team/agent stores |
| `components/agentTeams/__tests__/AgentTeamList.spec.ts` | Modify | List regression tests | vitest specs | wrapper interactions | pinia testing |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `AgentTeamDefinitionForm.vue` | agent/team stores, file upload store | create/edit wrappers | Medium | keep submit contract stable with `avatarUrl` optional |
| `AgentTeamCard.vue` | team definition store data | team list | Low | readonly computed usage only |

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Compatibility/Migration Notes | Verification |
| --- | --- | --- | --- |
| Old row-based composition UI in `AgentTeamDefinitionForm.vue` | Remove template/script blocks replaced by builder layout | No API changes; submit payload remains compatible | Manual create/edit + unit tests |

## Data Models (If Needed)
- Team model includes `avatarUrl?: string | null` in backend and frontend interfaces.

## Error Handling And Edge Cases
- Avatar upload failure shows inline error; form remains usable.
- Duplicate member names are auto-suffixed when adding via drag/click.
- Coordinator is cleared if selected member removed or changed to non-agent.
- Create/update mutations persist `avatarUrl` to backend when provided.

## Performance / Security Considerations
- No additional network calls beyond existing image upload and team CRUD calls.

## Migration / Rollout (If Needed)
- Migration required for `agent_team_definitions.avatar_url`.
- Existing teams without avatar continue falling back to initials.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/Manual) | Status |
| --- | --- | --- | --- |
| C-001..C-012 | T1..T10 | Unit + e2e + manual smoke in `/agents` flows | Planned |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Design Smell | Design Update Applied | Status |
| --- | --- | --- | --- | --- |
| 2026-02-10 | Prototype review | Detail page over-complicated (`Team Health`) | Removed dashboard-like sections from target UI | Updated |

## Open Questions
- None.
