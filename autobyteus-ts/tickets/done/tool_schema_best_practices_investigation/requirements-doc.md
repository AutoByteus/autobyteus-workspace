# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Investigate and correct the `autobyteus-ts` tool-calling schema/request/history path for OpenAI-compatible providers, especially LM Studio running `qwen3.6-35b-a3b-nvfp4`, where `run_bash` intermittently appears as a successful structured tool call and intermittently appears as plain assistant text like:

```text
[TOOL_CALL] run_bash {"command":"ls -la ..."}
```

The user concern is that if Autobyteus does not send provider-native tool schemas, request parameters, and tool-call history according to best practices, local-model tool-call rates will be lower than they should be.

## Investigation Findings

- Current default tool-call format is `api_tool_call`; API mode correctly suppresses prompt-injected textual tool manifests and passes provider tool schemas through the request path.
- The generated `run_bash` schema for LM Studio is the OpenAI-compatible Chat Completions function-tool envelope, but it is only a minimal schema. It currently lacks `additionalProperties: false`, does not support `strict: true`, and retains optional fields as omitted from `required`, which is not strict-mode-compatible.
- The most likely direct cause of the screenshot symptom is not the top-level schema envelope. It is the LM Studio renderer flattening prior structured tool-call history into assistant text using the exact token pattern `[TOOL_CALL] name {...}`. In native API tool-call mode, that text is then sent back in conversation history and can condition a local model to imitate it as plain text instead of emitting provider-native `tool_calls`.
- `OpenAICompatibleLLM` leaks internal kwargs such as `logicalConversationId` into provider requests via `...kwargs` and does not map common `LLMConfig` generation controls (`temperature`, `top_p`, penalties, stop sequences) into the OpenAI-compatible payload. Therefore test helpers that set `llm.config.temperature = 0` do not actually make OpenAI-compatible requests deterministic.
- There is no first-class agent/provider policy for `tool_choice`; current LM Studio integration tests monkey-patch `streamUserMessage` to force `tool_choice: 'required'`.
- Terminal-Bench does not use one universal provider-native tool schema. Its agents vary: some use structured JSON/Pydantic command batches, some use JSON/XML prompt templates, installed coding agents use their own tool loops, and the MCP-Terminus variant uses OpenAI-style tool calling with `tools` and `tool_choice='auto'`. The correct lesson is to keep one coherent action interface per harness and avoid mixing prompt-template tool syntax into native structured-tool mode.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Behavior Change + Refactor.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; Shared Structure Looseness; Duplicated Policy Or Coordination.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now.
- Evidence basis: Source inspection of schema formatter/provider/request builder/LM Studio renderer/API streaming handler, schema probe output for `run_bash`, unit test review, Terminal-Bench source review, OpenAI/LM Studio/Qwen docs review.
- Requirement or scope impact: The fix must address schema normalization, provider request assembly, LM Studio history rendering, the tool-choice boundary, and diagnostics together. A schema-only tweak would not solve the direct `[TOOL_CALL]` leakage.

## Recommendations

Proceed to implementation after architecture review with these priorities:

1. Preserve API-mode native tool calling as the default and keep prompt-template parsers separate.
2. Stop rendering LM Studio API-mode tool history as `[TOOL_CALL]`/`[TOOL_RESULT]` text; use OpenAI-compatible `assistant.tool_calls` and `tool` role messages.
3. Centralize OpenAI-compatible request construction so only provider-supported fields are sent and `LLMConfig` controls are applied consistently.
4. Normalize OpenAI-compatible tool schemas with `additionalProperties: false`; gate `strict: true` behind a capability/config path after optional-field nullability is represented safely.
5. Preserve explicit lower-level `tool_choice` request pass-through for direct LLM calls/tests, but do not add a new public `AgentConfig` tool-choice policy in this ticket. Product/server-configurable tool choice is deferred to a separate requirement.
6. Add diagnostics for text-shaped tool calls observed in API mode without executing them through a fallback parser.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium-to-Large

## In-Scope Use Cases

- OpenAI-compatible Chat Completions API mode for `OPENAI`, `LMSTUDIO`, and other providers currently using `OpenAiJsonSchemaFormatter`.
- `run_bash` and other Autobyteus tools exposed through `ToolSchemaProvider`.
- Tool-call history rendering for LM Studio in native API mode.
- Request payload construction for synchronous and streaming OpenAI-compatible calls.
- OpenAI-compatible request-builder preservation of explicit lower-level `tool_choice` kwargs for direct LLM calls/tests. A new product/server/`AgentConfig` tool-choice API is out of scope for this ticket.
- Diagnostic behavior when a model emits a textual tool-call pattern while API mode is selected.
- Unit-level validation and TypeScript build validation.

## Out of Scope

- Guaranteeing 100% tool-call rate for any quantized local model.
- Changing LM Studio internals, chat templates, or model weights.
- Replacing the entire streaming parser subsystem.
- Executing plain `[TOOL_CALL]` text as a fallback in API mode.
- Rewriting Terminal-Bench or matching every Terminal-Bench agent interface.
- Full strict-mode rollout for every provider if optional/null schema semantics are not yet proven provider-compatible.
- New server/Electron/domain-config/UI wiring for configurable tool-choice policy.
- Provider-native API history rendering for Gemini, Ollama, Anthropic, Mistral, and OpenAI Responses. These providers have different typed function-call/result history contracts and require a separate provider-by-provider design/validation cycle.

## Functional Requirements

- **FR-001 Native API transport:** In `api_tool_call` mode, tools must be sent through provider-native `tools` request fields, and tool results/history must be represented using provider-native structured assistant/tool messages where the provider accepts OpenAI-compatible messages.
- **FR-002 Schema best-practice normalization:** OpenAI-compatible function-tool schemas must preserve the current `{ type: 'function', function: { name, description, parameters } }` envelope and must recursively set `additionalProperties: false` for object schemas.
- **FR-003 Strict-mode gating:** The implementation must not blindly enable `strict: true` until optional fields are represented in a strict-compatible way. If strict support is added in this ticket, optional arguments must be included in `required` with nullable types or an equivalent provider-accepted representation.
- **FR-004 LM Studio history separation:** LM Studio native API mode must not inject `[TOOL_CALL]`, `[TOOL_RESULT]`, or `[TOOL_ERROR]` textual history into assistant/user content. Textual formatting may remain only for explicitly selected non-native/text-parser modes.
- **FR-005 Request param builder:** OpenAI-compatible request construction must be centralized and must map `LLMConfig` fields (`temperature`, `topP`, penalties, stop sequences, max tokens, `extraParams`) to provider request payloads consistently for both streaming and non-streaming calls.
- **FR-006 Internal kwarg filtering:** Internal framework kwargs such as `logicalConversationId` must not be forwarded to OpenAI-compatible provider endpoints.
- **FR-007 Explicit tool-choice pass-through without new public AgentConfig API:** The OpenAI-compatible request builder must preserve explicit lower-level `tool_choice` kwargs for callers/tests that already invoke LLM APIs directly. This ticket must not add or keep a new public `AgentConfig` tool-choice policy unless a separate product/server configuration path is designed and approved.
- **FR-008 No dual execution path:** API mode must not execute textual `[TOOL_CALL]` output through legacy text parsers as a fallback. Such output should remain assistant text and produce an explicit diagnostic.
- **FR-009 Terminal-agent compatibility principle:** The implementation must maintain one coherent action protocol per mode; Terminal-Bench-style prompt-template command batches may inform parser-mode design but must not contaminate native API mode.
- **FR-010 Validation coverage:** Add or update tests that lock schema, request payload, renderer behavior, tool-choice policy, and diagnostic behavior.

## Acceptance Criteria

- **AC-001 Schema probe/test:** A unit test or deterministic probe for `run_bash` under LM Studio/OpenAI-compatible provider shows the OpenAI tool envelope and `parameters.additionalProperties === false`; nested object parameters, if any, also receive `additionalProperties: false`.
- **AC-002 Request payload:** Tests for `OpenAICompatibleLLM` prove that `temperature`, `top_p`, penalties/stop/max tokens where configured, `tools`, and `tool_choice` are sent, while `logicalConversationId` is not sent.
- **AC-003 LM Studio native history:** A renderer/request assembly test with a prior `ToolCallPayload` and `ToolResultPayload` proves that LM Studio native API mode emits `assistant.tool_calls` plus `role: 'tool'` messages, not `[TOOL_CALL]` text.
- **AC-004 Tool choice boundary:** Unit tests prove explicit lower-level `tool_choice` kwargs are passed by the OpenAI-compatible request builder when provided, and prove the agent/server default path leaves `tool_choice` unset. No new `AgentConfig` public policy should be required for this ticket.
- **AC-005 Text leakage diagnostic:** In API mode, when a stream returns content matching textual tool-call syntax and no native tool call, the framework emits/logs a diagnostic identifying a likely provider/model/tool-format mismatch and does not execute the text as a tool.
- **AC-006 Existing parser modes:** Existing XML/JSON/sentinel parser-mode behavior remains covered by tests and is not silently broken by API-mode changes.
- **AC-007 Build/test pass:** Relevant unit tests and `pnpm exec tsc -p tsconfig.build.json --noEmit` pass.

## Constraints / Dependencies

- Work must be done in `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices`, not the original monorepo checkout.
- Preserve provider abstractions; avoid provider-specific hacks in general schema and request layers except through explicit capability/policy types.
- OpenAI Chat Completions remains non-strict by default unless strict is explicitly requested and schema constraints are satisfied.
- LM Studio's OpenAI-compatible API returns parsed tool calls in `choices[0].message.tool_calls`; if LM Studio cannot parse model output, it returns normal content. Autobyteus should diagnose this, not guess-execute it.
- Qwen reasoning/tool modes can require provider-specific extra body fields such as `chat_template_kwargs.enable_thinking = false`; this ticket can expose/propagate such parameters through `extraParams`, but should not hard-code Qwen behavior globally.

## Assumptions

- The user screenshot was produced in default `api_tool_call` mode or an equivalent OpenAI-compatible native-tool path.
- The model supports at least some degree of tool use in LM Studio, but model/quantization reliability is outside framework control.
- Callers may still intentionally select legacy text parser modes through `AUTOBYTEUS_STREAM_PARSER` for providers/models that do not support native tools.

## Risks / Open Questions

- Strict mode may break current optional tool arguments unless nullable required fields are introduced carefully.
- Some OpenAI-compatible providers may reject provider-specific fields or object-form `tool_choice`; tool-choice support should be capability-aware.
- LM Studio versions and model templates can vary. Diagnostics should make it easy to distinguish Autobyteus request issues from LM Studio/model parser failures.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| Improve `run_bash` tool-call reliability with LM Studio/Qwen | FR-001, FR-002, FR-004, FR-005, FR-007, FR-008 |
| Verify schema follows OpenAI-compatible best practice | FR-002, FR-003, FR-010 |
| Compare Terminal-Bench action formats without blindly copying them | FR-009 |
| Avoid framework-induced text tool-call leakage | FR-004, FR-008 |
| Preserve direct LLM/test ability to force tool choice without product-facing API expansion | FR-005, FR-007 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Schema shape is provider-compatible and tightened. |
| AC-002 | Provider request payload is explicit, filtered, and respects config. |
| AC-003 | LM Studio receives structured history in native mode. |
| AC-004 | Tool-choice remains explicit at the lower-level request boundary; product agent defaults do not force tools. |
| AC-005 | Textual tool-call leakage becomes visible without unsafe fallback execution. |
| AC-006 | Legacy parser modes remain separate and intentional. |
| AC-007 | Change is buildable and regression-tested. |

## Approval Status

User explicitly requested investigation and said “please go on.” Requirements are design-ready for architecture review, with no separate interactive approval pause required for this investigation/design task.

## Test-Driven Investigation Evidence Addendum

An investigation-only compliance test was added and run to compare generated LM Studio/OpenAI-compatible schemas against documented best-practice criteria:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/schema-best-practice-compliance.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/schema-best-practice-compliance-report.json`

Result summary:

- Minimum OpenAI-compatible envelope: **pass** across generated default LM Studio schemas.
- Closed object schemas (`additionalProperties:false`): **fail/gap**, including `run_bash`.
- `strict:true`: **not enabled**.
- Strict readiness if enabled now: **fail/gap** because optional fields are not represented as required nullable fields.

This confirms the requirement scope: the implementation is partially correct, but not fully aligned with documented schema best practices.


## Design Rework Addendum: Tool-Choice Public API Scope

Downstream implementation and user feedback showed that the proposed `AgentConfig.apiToolChoicePolicy` public API is not used by the current server/Electron product path and is not necessary for the observed runtime improvement. The confirmed improvements come from structured native tool history, schema normalization, and request construction fixes.

Updated decision:

- Remove/de-scope the new public `AgentConfig.apiToolChoicePolicy` API from this ticket.
- Keep OpenAI-compatible request-builder support for explicit lower-level `tool_choice` kwargs, because direct LLM tests/integrations already use that provider capability.
- Keep product/agent default behavior as no `tool_choice` field emitted, letting providers use their default behavior.
- If product-level configurable tool choice is desired later, create a separate ticket to wire it through server domain config, persistence/API/UI, and provider capability safeguards.

This supersedes earlier language that described a first-class agent/workflow tool-choice policy as in-scope.

## Design Rework Addendum: API Tool Result Continuation

User follow-up exposed one more requirement gap: validation must cover the full tool-result continuation pipeline, not only the renderer.

Added requirement:

- **FR-011 API tool-result continuation:** In `api_tool_call` / OpenAI-compatible native mode, completed tool results must be sent back to the provider only through structured `role:'tool'` messages with matching `tool_call_id`. The framework must not append a synthetic `role:'user'` message containing aggregated tool-result text in the same native request. Textual aggregate continuation may remain only for legacy/text-parser modes or UI/logging paths.

Added acceptance criterion:

- **AC-008 Native tool continuation request:** A framework-level request assembly test proves that after an assistant native tool call and matching tool result, the next OpenAI-compatible request contains `assistant.tool_calls` followed by matching `role:'tool'` messages and does **not** contain a user message beginning `The following tool executions have completed...`.

This supplements, but does not replace, AC-003. AC-003 proves structured rendering of stored tool payloads; AC-008 proves the full continuation pipeline does not add a duplicate user-message copy of tool results in native API mode.

## Round-6 Scope Correction: OpenAI-Compatible Chat Only, Provider-Native Non-OpenAI Renderers Deferred

Architecture review `AR-006-001` found that earlier broad wording around “native API mode” could be read as claiming that this ticket solves every provider-native API renderer. That is not the approved scope.

Corrected current-ticket scope:

- Solve OpenAI-compatible Chat providers using `OpenAICompatibleLLM` / `OpenAIChatRenderer`, including LM Studio, DeepSeek, Qwen, Kimi, GLM, Grok, Minimax, and generic OpenAI-compatible endpoints.
- Solve the shared native tool-result continuation routing problem so the OpenAI-compatible Chat path does not append a duplicate synthetic aggregate `role:"user"` tool-result message.
- Preserve legacy XML/JSON/sentinel text-parser behavior outside native OpenAI-compatible Chat mode.

Explicit known gaps / out of scope for this ticket:

- Gemini native API history rendering still needs typed `functionCall` / `functionResponse` parts instead of `[TOOL_CALL]` / `[TOOL_RESULT]` text.
- Ollama native API history rendering still needs assistant `tool_calls` and `role:"tool"` / `tool_name` messages instead of text markers.
- Anthropic native API history rendering still needs `tool_use` / `tool_result` content blocks, with Anthropic-required ordering, instead of text markers.
- Mistral native API history rendering still needs assistant `tool_calls` and `role:"tool"` / `tool_call_id` messages instead of text markers.
- OpenAI Responses native API history rendering still needs `function_call` / `function_call_output` input items instead of text-marker messages.

Evidence for these known gaps is recorded in:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/non-openai-api-mode-provider-investigation.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/probes/non-openai-api-renderer-probe-output.json`

If the user wants these providers fixed, that should be a follow-up provider-native renderer ticket or an explicit expansion routed back through solution design with provider-specific requirements, API mappings, schema rules, and executable wire-format tests.


Provider-native scope rework decision: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/design-rework-provider-native-scope.md`
