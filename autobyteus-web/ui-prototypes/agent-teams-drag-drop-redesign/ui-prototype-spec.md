# Agent Teams Drag-and-Drop Redesign Prototype Spec

## Scope
- Platform: web
- Flow: `agent-teams-management`
- Fidelity: high
- Simulation mode: state-only (two canonical screens)

## Product Intent
Raise Agent Teams UX to the same quality bar as Local Agents while making team assembly dramatically easier for first-time users.

## Source-Code Analysis (Current UI)
- Team list is visually sparse and under-informative: cards show only text blocks and initials, with weak visual hierarchy and no search/filtering support (`/Users/normy/autobyteus_org/autobyteus-web/components/agentTeams/AgentTeamList.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/agentTeams/AgentTeamCard.vue`).
- Local Agents already uses stronger hierarchy and interaction scaffolding (search input, cleaner spacing, clearer card rhythm), creating a quality mismatch (`/Users/normy/autobyteus_org/autobyteus-web/components/agents/AgentList.vue`, `/Users/normy/autobyteus_org/autobyteus-web/components/agents/AgentCard.vue`).
- Team creation is form-heavy and linear: users must manually add rows, select type, select blueprint, and configure coordinator in separate sections, with high cognitive load (`/Users/normy/autobyteus_org/autobyteus-web/components/agentTeams/AgentTeamDefinitionForm.vue`).
- Configuration discoverability risk: coordinator requirement is only validated late in form submission and depends on correct member-type sequencing (`/Users/normy/autobyteus_org/autobyteus-web/components/agentTeams/AgentTeamDefinitionForm.vue`).

## Proposed UX Direction
- Keep the existing application shell context so redesign remains implementation-realistic.
- Upgrade team list to Local Agents quality level: stronger card hierarchy, simple name search, and clearer primary actions.
- Replace row-by-row team composition with drag-and-drop builder:
  - Left: agent/team library (searchable)
  - Center: team canvas with ordered member lanes
  - Right: member details + coordinator toggle
- Add onboarding assist for non-experts:
  - "Suggested Templates" and "Auto-assign Coordinator" hints
  - Real-time validation strip instead of late error bursts

## Behavior Rules
- Creating a member should be primarily drag/drop, with optional manual fallback.
- Coordinator must be assigned through a visible inline control on a placed member card.
- Team validity status (members count, coordinator set, circular dependency warning) is always visible near the primary CTA.
- Main CTA remains stable: `Create Team` disabled until minimum valid state is reached.

## Visual Constraints
- Light mode only.
- Neutral slate/gray base, white cards, cobalt action accent.
- Same shell layout and information density family as Local Agents redesign.
- Enterprise SaaS aesthetic with calm spacing and explicit affordances.

## Active Prototype Artifacts
- `/Users/normy/autobyteus_org/autobyteus-web/ui-prototypes/agent-teams-drag-drop-redesign/images/web/agent-teams-management/agent-teams-list-redesign-default.png`
- `/Users/normy/autobyteus_org/autobyteus-web/ui-prototypes/agent-teams-drag-drop-redesign/images/web/agent-teams-management/agent-team-builder-drag-drop-default.png`
- `/Users/normy/autobyteus_org/autobyteus-web/ui-prototypes/agent-teams-drag-drop-redesign/images/web/agent-teams-management/agent-team-detail-redesign-default.png`

## Revision Note
- Created on 2026-02-10 to address Agent Team card quality gap and simplify team configuration with drag-and-drop assembly.
- Updated on 2026-02-10 to simplify team-list discovery to search-only by name (no filters).
- Updated on 2026-02-10 to move team card actions to header position and add explicit team avatars.
- Updated on 2026-02-10 to remove advanced settings from create flow and clarify drag source (library) to drop target (canvas).
- Updated on 2026-02-10 to remove wizard stepper, keep inline basics, and anchor Cancel/Create actions inside builder footer.
- Updated on 2026-02-10 to add team avatar upload in create flow and introduce dedicated Agent Team Detail redesign.
- Updated on 2026-02-10 to simplify Agent Team Detail and remove Team Health/dashboard elements.
