# Design Rework: Provider-Native API Scope Correction

Date: 2026-05-09

## Trigger

After the OpenAI-compatible Chat / LM Studio path was fixed and validated, the user asked whether the same API-mode issue exists for Gemini, Ollama, and other non-OpenAI-native providers. A provider-doc comparison plus renderer probe found that several provider-native renderers still turn stored tool payloads into legacy text markers.

Architecture review recorded blocking finding `AR-006-001`: this ticket must not claim it solves all provider-native `api_tool_call` renderers.

## Decision

Do **not** expand the current ticket to all provider-native renderers by default.

The current ticket is narrowed to:

1. OpenAI-compatible Chat providers / LM Studio native history and request/schema path.
2. Shared native tool-result continuation routing that avoids duplicate synthetic aggregate `role:"user"` tool-result messages in the OpenAI-compatible Chat path.
3. Diagnostic-only handling for text-shaped `[TOOL_CALL]` output in that path.

## Known Gaps Explicitly Out Of Current Scope

- Gemini: current renderer still emits `[TOOL_CALL]` / `[TOOL_RESULT]`; native mode needs typed `functionCall` / `functionResponse` parts.
- Ollama: current renderer still emits text markers; native mode needs assistant `tool_calls` plus `role:"tool"` / `tool_name` history.
- Anthropic: current renderer still emits text markers; native mode needs `tool_use` / `tool_result` content blocks with required ordering.
- Mistral: current renderer still emits text markers; native mode needs assistant `tool_calls` plus `role:"tool"` / `tool_call_id` results.
- OpenAI Responses: current renderer still emits text-marker messages; native mode needs `function_call` / `function_call_output` input items.

## Artifact Updates Required

- Requirements/design/investigation/handoff artifacts must include explicit out-of-scope / known-gap language for the providers above.
- Validation/handoff artifacts must be read as OpenAI-compatible Chat validation, not all-provider native API validation.
- A follow-up provider-native renderer ticket must route back through solution design before implementation.

## Follow-Up Design Requirements If Expanded Later

A provider-native renderer follow-up should include provider-specific:

1. official API mapping for assistant tool-call history;
2. official API mapping for tool-result continuation history;
3. tool-call identity/order matching rules;
4. schema declaration format and strict/closed-object compatibility;
5. streaming converter expectations;
6. executable wire-format tests/probes for each provider.

## Evidence

- Provider investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/non-openai-api-mode-provider-investigation.md`
- Renderer probe: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/probes/non-openai-api-renderer-probe.mjs`
- Probe output: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/probes/non-openai-api-renderer-probe-output.json`
