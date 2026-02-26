# Unified Agent Event Monitor Prototype Spec

## Scope
- Platform: web
- Flow: `agent-conversation-flow`
- Fidelity: high
- Simulation mode: state-only (no click-through viewer in this revision)

## Product Intent
Present user and agent turns as one continuous conversation unit while preserving role clarity, reducing visual fragmentation, and keeping the composer attached to the dialogue flow.

## Current Approved Behavior Rules
- One shared conversation surface card for all turns.
- No vertical timeline connector rail between avatars.
- Conversation turn headers use avatar + role chip only (timestamps removed).
- Low-contrast separators preserve turn continuity.
- Composer remains visually attached to conversation panel.
- Context attachments remain integrated with composer block.

## Visual Constraints
- Light mode only.
- Neutral base palette with blue user accent and teal agent accent.
- Enterprise SaaS look; realistic copy; no decorative chrome.

## Active Prototype Artifact
- `ui-prototypes/unified-agent-event-monitor/images/web/agent-conversation-flow/event-monitor-unified-default.png`
- Prompt source of truth:
  `ui-prototypes/unified-agent-event-monitor/prompts/web/agent-conversation-flow/event-monitor-unified-default.md`

## Archive Policy Applied
Previous iterative variants were moved to:
- `ui-prototypes/unified-agent-event-monitor/archive/2026-02-10/`

This keeps one active prompt/image lineage path per updated standards.
