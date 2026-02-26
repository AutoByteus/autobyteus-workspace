# Local Agents Clean List Prototype Spec

## Scope
- Platform: web
- Flow: `local-agents-management`
- Fidelity: high
- Simulation mode: state-only (single canonical screen)

## Product Intent
Create a calmer Local Agents page with clear hierarchy and scanning rhythm while preserving the real application shell context (icon rail + agents sidebar + main list area).

## Why The Current UI Feels Chaotic (Source Analysis)
- Card internals are visually dense (`components/agents/AgentCard.vue`): avatar, title, tags, and dual actions compete at similar emphasis.
- Tool/skill chip volume can create vertical clutter and uneven scan rhythm (`components/agents/AgentCard.vue`).
- Header controls, search area, and card content all carry similar visual weight (`components/agents/AgentList.vue`), weakening focus order.

## Proposed Behavior Rules
- Keep application shell visible in prototype to validate sidebar-to-content hierarchy.
- Maintain one strong card action (`Run`) and lower-emphasis secondary action (`View Details`).
- Use metadata summary structure (counts first, small chip preview) to reduce tag noise.
- Enforce consistent card heights and alignment in a two-column desktop grid.
- Keep neutral surfaces with one dominant accent for action affordances.

## Visual Constraints
- Light mode only.
- Neutral gray base with slate text and blue action accent.
- Generous whitespace and consistent vertical rhythm.
- Enterprise SaaS aesthetic, no decorative clutter.

## Active Prototype Artifact
- `ui-prototypes/local-agents-clean-list/images/web/local-agents-management/local-agents-list-clean-default.png`
- Prompt source of truth:
  `ui-prototypes/local-agents-clean-list/prompts/web/local-agents-management/local-agents-list-clean-default.md`

## Revision Note
- Updated on 2026-02-10 to include full app shell context (left icon rail + AI Agents sidebar) and better reflect production layout boundaries.
