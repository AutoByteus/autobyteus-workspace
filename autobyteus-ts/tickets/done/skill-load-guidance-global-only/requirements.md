# Requirements

- Ticket: `skill-load-guidance-global-only`
- Status: `Design-ready`
- Scope: `Small`

## User Intent

Adjust the skill prompt injection so `load_skill` guidance text is only injected when the agent is in global skill discovery mode. Do not mention that guidance in configured/preloaded skill mode.

## Functional Requirements

1. The skills system prompt must not instruct the model to use `load_skill` when `skillAccessMode` is `PRELOADED_ONLY`.
2. The skills system prompt may mention `load_skill` when `skillAccessMode` is `GLOBAL_DISCOVERY`.
3. The prompt wording change must preserve the existing preloaded skill detail injection behavior.

## Non-Goals

1. Do not redesign overall skill loading architecture in this ticket.
2. Do not remove the `load_skill` tool from the registry in this ticket.
3. Do not change runtime behavior outside prompt guidance unless required for consistency with the prompt text.

## Initial Acceptance Criteria

1. A `PRELOADED_ONLY` agent prompt includes skill details for configured skills but does not tell the model to call `load_skill`.
2. A `GLOBAL_DISCOVERY` agent prompt still includes the catalog and `load_skill` guidance.
3. Focused tests cover the mode-specific prompt output.

## Refinement Notes

1. The change is prompt-only for this ticket; do not alter the `load_skill` tool's existing enforcement behavior.
2. The catalog should remain visible in `PRELOADED_ONLY`; only the action guidance sentence should be suppressed there.
3. The implementation should be localized to the skill prompt processor and matching tests unless a consistency issue is found.
