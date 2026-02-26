# Fluid Tool-Call Minimal Chat Prototype Spec

## Scope
- Platform: web
- Flow: `agent-conversation-flow`
- Fidelity: high
- Simulation mode: state-only

## Product Intent
Keep the main AI message area fluid and content-first by reducing inline tool segments to minimal status pulses, while preserving full execution details in the right-side Activity panel.

## Behavior Rules
- Main chat tool segment is reduced to a compact pulse card:
  - tool icon + tool name
  - status chip
  - short invocation id
  - `View in Activity` affordance
- Main chat does **not** render arguments/logs/result for tool calls.
- Rich markdown answer content remains the visual primary element.
- Activity panel remains the deep-inspection surface with expandable sections:
  - Arguments
  - Logs
  - Result
  - Error (if present)

## Why This Direction
- Removes duplicated information between chat and Activity.
- Preserves execution transparency without interrupting reading flow.
- Makes streamed agent output feel faster and less fragmented.

## Active Artifact
- Image: `ui-prototypes/fluid-tool-call-minimal-chat/images/web/agent-conversation-flow/fluid-tool-call-minimal-default.png`
- Prompt source: `ui-prototypes/fluid-tool-call-minimal-chat/prompts/web/agent-conversation-flow/fluid-tool-call-minimal-default.md`
