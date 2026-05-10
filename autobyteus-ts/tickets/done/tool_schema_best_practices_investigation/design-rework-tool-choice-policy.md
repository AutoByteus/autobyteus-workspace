# Design Rework Decision: Tool-Choice Policy Public API

## Status

Design-impact rework decision from `solution_designer` after downstream implementation escalation.

## Trigger

The user questioned the new `ApiToolChoicePolicy` / `AgentConfig.apiToolChoicePolicy` surface. The implementation engineer checked the server/Electron path and found that current product config construction does not set this field. Therefore it is not part of the observed runtime improvement and risks adding unused public API surface.

## Decision

Remove/de-scope the new public `AgentConfig.apiToolChoicePolicy` API from this ticket.

This ticket should keep only lower-level OpenAI-compatible `tool_choice` pass-through in the request builder for callers/tests that already provide explicit provider kwargs. The default agent/server path must continue to emit no `tool_choice` field.

## Rationale

- The confirmed problems are schema strict-readiness and native-tool/text-history contamination, not missing product-level tool-choice configuration.
- The current server/Electron code path constructs `AgentConfig` without tool-choice policy and the domain config types do not carry such a setting.
- A public `AgentConfig` policy implies a product/SDK contract. If product wants that contract, it needs server/domain/API/UI wiring and provider capability safeguards, which is larger than this ticket.
- Keeping an unused public API would increase expectations and provider-risk surface without fixing the reported runtime behavior.

## Superseded Design Elements

Do not keep these in this ticket:

- `AgentConfig.apiToolChoicePolicy` field / constructor arg / copy propagation.
- Public exports of `ApiToolChoicePolicy`, `ApiSpecificToolChoicePolicy`, or `resolveApiToolChoicePolicy` from `src/agent/context/index.ts`.
- Agent handler logic that reads `context.config.apiToolChoicePolicy` and sets `streamKwargs.tool_choice`.
- Tests whose only production behavior assertion is `AgentConfig` -> `tool_choice` injection.

## Still In Scope

- `OpenAICompatibleRequestBuilder` explicitly passes `kwargs.tool_choice` when provided by direct LLM callers/tests.
- Request builder filters internal kwargs and maps `LLMConfig` fields.
- LM Studio native API mode uses structured `OpenAIChatRenderer` history, not `[TOOL_CALL]` text.
- OpenAI-compatible schemas are closed with `additionalProperties:false` and strict support remains gated/safe.
- API-mode text-shaped tool-call diagnostic remains non-executing.

## Future Ticket Boundary

If configurable tool-choice policy is desired, create a separate ticket to design and wire:

1. server domain config,
2. persistence/API schemas,
3. Electron/UI controls if applicable,
4. provider/model capability safeguards,
5. validation across OpenAI-compatible providers with different `tool_choice` support.

## Implementation Instructions

- Remove the public AgentConfig API and associated exports.
- Remove handler policy resolution and keep `streamKwargs` free of `tool_choice` unless it is already passed by a lower-level direct LLM caller.
- Replace AgentConfig-based tool-choice tests with request-builder tests for explicit kwargs.
- Do not expand this ticket into server/Electron config wiring.
