# Docs Sync Report

## Scope

- Ticket: `tool_schema_best_practices_investigation`
- Trigger: Supplemental API/E2E Round 7 passed after the user requested a broad flow sweep of all agent single-flow tests and all agent-team flow tests. Delivery refreshed integrated state and delivery artifacts to cite the latest validation authority. No new implementation behavior or repository-resident durable validation code was added after the prior Round 8 code review / Round 6 API-continuation validation pass.
- Bootstrap base reference: `origin/personal` at `263e89c595f6942e7e826daf19cea9a9fd254459`.
- Integrated base reference used for docs sync: `origin/personal` at `263e89c595f6942e7e826daf19cea9a9fd254459`.
- Post-integration verification reference: `git fetch origin --prune` completed on 2026-05-09 20:59 CEST; `HEAD`, merge base, and `origin/personal` all matched `263e89c595f6942e7e826daf19cea9a9fd254459`; `git rev-list --count HEAD..origin/personal` = `0` and `git rev-list --count origin/personal..HEAD` = `0`, so no base commits needed integration before refreshing delivery artifacts. Delivery hygiene `git diff --check` was rerun after the refreshed artifacts and passed.

## Why Docs Were Updated

- Summary: Long-lived docs had already been updated for the final reviewed implementation state: schema closure, strict-mode gating, default no-`tool_choice`, explicit lower-level `tool_choice` pass-through, Kimi request normalization, DeepSeek provider sensitivity, LM Studio native history, native API no-aggregate-user-message continuation, and CR-002 validation-before-memory-mutation ordering. Supplemental Round 7 added broader E2E confidence only; it did not change the durable behavior that long-lived docs describe. Delivery artifacts were refreshed to cite Round 7 as the latest authoritative API/E2E validation.
- Why this should live in long-lived project docs: No new long-lived docs changes were required by Round 7 itself. Existing long-lived docs remain the right place for the durable runtime contracts already promoted from prior rounds.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `docs/tool_schema_and_configuration.md` | Canonical tool schema ownership and formatter flow. | `No change` | Prior updates remain accurate for native API schema flow, recursive object closure, and strict-mode gating. |
| `docs/tool_call_formatting_and_parsing.md` | Canonical tool-call mode and parser/formatter behavior. | `No change` | Prior updates remain accurate for API mode, no default `tool_choice`, native continuation, diagnostics, and text-mode preservation. |
| `docs/api_tool_call_streaming_design.md` | Detailed API tool-call streaming/request/continuation design. | `No change` | Prior updates remain accurate for native result validation, `ToolContinuationReadyEvent`, no aggregate user message, and legacy text-mode split. |
| `docs/llm_module_design.md` | LLM config/request and provider adapter design. | `No change` | Prior updates remain accurate for request-builder ownership, Kimi normalization, LM Studio structured native history, and native continuation behavior. |
| `docs/llm_module_design_nodejs.md` | Node.js LLM module OpenAI-compatible path summary. | `No change` | Prior updates remain accurate for default no-`tool_choice`, explicit lower-level pass-through, and no aggregate native continuation user message. |
| `docs/provider_model_catalogs.md` | Canonical provider model/request-shape notes. | `No change` | Prior updates remain accurate for Kimi normalization and DeepSeek forced-tool-choice provider/model caveat. |
| `docs/agent_memory_design.md` | Memory/working-context turn and tool-continuation contract. | `No change` | Prior updates remain accurate for native validation-before-processors and no provider-visible aggregate user input. |
| `docs/agent_memory_design_nodejs.md` | Node.js memory/working-context counterpart. | `No change` | Same as `docs/agent_memory_design.md`. |
| `docs/event_driven_core_design.md` | Queue priority and event-loop ordering. | `No change` | Prior updates remain accurate for tool continuation priority. |
| `docs/lifecycle_event_sourced_engine_design.md` | Event/handler responsibility summary. | `No change` | Prior updates remain accurate for `ToolResultEventHandler` validation-before-processors responsibility. |
| `docs/turn_terminology.md` | Canonical distinction between outer turn and tool invocation batch. | `No change` | Prior updates remain accurate for native `ToolContinuationReadyEvent` inside an outer `AgentTurn`. |
| `docs/streaming_parser_design.md` | Parser-level behavior for selected parser modes. | `No change` | Parser-mode statements remain accurate; Round 7 did not change parser design. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `docs/tool_schema_and_configuration.md` | Previously updated durable design/runtime doc | No additional Round 7 edit. | Existing schema best-practice documentation remains accurate after the supplemental sweep. |
| `docs/tool_call_formatting_and_parsing.md` | Previously updated durable behavior doc | No additional Round 7 edit. | Existing parser/native-continuation documentation remains accurate after the supplemental sweep. |
| `docs/api_tool_call_streaming_design.md` | Previously updated API continuation design doc | No additional Round 7 edit. | Existing native continuation and CR-002 ordering documentation remains accurate after the supplemental sweep. |
| `docs/llm_module_design.md` | Previously updated runtime design doc | No additional Round 7 edit. | Existing request/provider/native-history documentation remains accurate. |
| `docs/llm_module_design_nodejs.md` | Previously updated runtime design summary | No additional Round 7 edit. | Existing OpenAI-compatible path summary remains accurate. |
| `docs/provider_model_catalogs.md` | Previously updated provider capability doc | No additional Round 7 edit. | Existing Kimi and DeepSeek provider notes remain accurate. |
| `docs/agent_memory_design.md` | Previously updated memory flow doc | No additional Round 7 edit. | Existing native continuation memory-flow documentation remains accurate. |
| `docs/agent_memory_design_nodejs.md` | Previously updated memory flow doc | No additional Round 7 edit. | Existing native continuation memory-flow documentation remains accurate. |
| `docs/event_driven_core_design.md` | Previously updated event priority doc | No additional Round 7 edit. | Existing continuation priority documentation remains accurate. |
| `docs/lifecycle_event_sourced_engine_design.md` | Previously updated event responsibility doc | No additional Round 7 edit. | Existing validation-before-processors documentation remains accurate. |
| `docs/turn_terminology.md` | Previously updated terminology doc | No additional Round 7 edit. | Existing outer-turn/tool-batch terminology remains accurate. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| OpenAI-compatible schema closure | Function-tool schemas keep the OpenAI-compatible envelope and recursively set `additionalProperties:false`; strict remains off until nullable-required optional fields are implemented. | `requirements-doc.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `docs/tool_schema_and_configuration.md`, `docs/api_tool_call_streaming_design.md` |
| Default agent/server tool-choice boundary | The default agent/server API path emits native `tools` but no `tool_choice`. Product/server/Electron configurable tool-choice policy is out of scope and should require a new design. | `design-rework-tool-choice-policy.md`, `design-review-report.md`, `review-report.md`, `api-e2e-validation-report.md` | `docs/tool_call_formatting_and_parsing.md`, `docs/api_tool_call_streaming_design.md`, `docs/llm_module_design_nodejs.md` |
| Safe OpenAI-compatible request construction | `OpenAICompatibleRequestBuilder` maps `LLMConfig`, merges `extraParams`, filters internal kwargs, attaches `tools`, and only passes `tool_choice` when explicit lower-level direct-caller kwargs provide it. Provider adapters may normalize provider-specific legality before delegating. | `design-rework-tool-choice-policy.md`, `implementation-handoff.md`, `review-report.md`, `api-e2e-validation-report.md` | `docs/llm_module_design.md`, `docs/llm_module_design_nodejs.md`, `docs/api_tool_call_streaming_design.md` |
| Native API tool-result continuation | In native `api_tool_call` mode, accepted tool results return to the provider through structured `assistant.tool_calls` plus matching `role:"tool"` messages. The framework must not append a synthetic aggregate `role:"user"` tool-result message in the same native continuation request. | `design-rework-api-tool-continuation.md`, `api-tool-continuation-render-probe-output.json`, `implementation-handoff.md`, `review-report.md`, `api-e2e-validation-report.md` | `docs/api_tool_call_streaming_design.md`, `docs/tool_call_formatting_and_parsing.md`, `docs/llm_module_design.md`, `docs/llm_module_design_nodejs.md`, `docs/agent_memory_design.md`, `docs/agent_memory_design_nodejs.md`, `docs/turn_terminology.md` |
| CR-002 validation-before-memory-mutation | `ToolResultEventHandler` validates native active-batch/provider/turn/invocation identity before result processors run. Invalid native results do not write raw traces, working-context payloads, continuation traces, or continuation events. | `review-report.md`, `api-e2e-validation-report.md`, `tests/unit/agent/handlers/tool-result-event-handler.test.ts` | `docs/api_tool_call_streaming_design.md`, `docs/agent_memory_design.md`, `docs/agent_memory_design_nodejs.md`, `docs/lifecycle_event_sourced_engine_design.md` |
| Broad E2E flow confidence | Round 7 broadened executable confidence across single-agent and agent-team flows without changing durable behavior or docs. | `api-e2e-validation-report.md` | Delivery artifacts only; no additional long-lived doc target needed. |
| Kimi provider-safe request normalization | For `kimi-k2.5`/`kimi-k2.6`, config/default temperature is normalized to provider-safe values unless request kwargs explicitly set `temperature`; tool workflows use `0.6`, non-tool requests use `1`, and tool workflows disable thinking unless explicitly overridden. | `implementation-handoff.md`, `review-report.md`, `api-e2e-validation-report.md`, `src/llm/api/kimi-llm.ts`, `tests/unit/llm/api/kimi-llm.test.ts` | `docs/llm_module_design.md`, `docs/llm_module_design_nodejs.md`, `docs/provider_model_catalogs.md` |
| DeepSeek forced-tool-choice capability | Default/optional tools path passed. Forced `tool_choice:'required'` remains provider/model sensitive: `deepseek-chat` accepts it, while `deepseek-reasoner` rejects it. | `review-report.md`, `api-e2e-validation-report.md` | `docs/provider_model_catalogs.md` |
| LM Studio native history separation | Native API mode uses structured `assistant.tool_calls` and `role:"tool"` history; `[TOOL_CALL]`/`[TOOL_RESULT]` text history is text-parser-mode-only. | `investigation-notes.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `docs/tool_call_formatting_and_parsing.md`, `docs/llm_module_design.md`, `docs/llm_module_design_nodejs.md` |
| API-mode text leak diagnostic | Text-shaped `[TOOL_CALL]` content in API mode is assistant text plus diagnostic, not a fallback execution path. | `requirements-doc.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `docs/tool_call_formatting_and_parsing.md`, `docs/api_tool_call_streaming_design.md` |
| Residual local-model reliability risk | Deterministic continuation capture, one-call LM Studio flow, and broad single-agent/team sweeps passed, but the opt-in qwen3.6 ten-phase AgentRuntime flow still hit provider/model-template `Unknown StringValue filter: safe`; this remains follow-on/new-scope risk. | `api-e2e-validation-report.md`, `review-report.md` | Delivery artifacts only; no additional long-lived docs needed until a follow-on requirement is accepted. |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Public `AgentConfig.apiToolChoicePolicy` / resolver / handler policy injection | No public agent/server policy in this ticket; default agent/server path sends `tools` but omits `tool_choice`; explicit lower-level direct LLM callers may pass `kwargs.tool_choice` through `OpenAICompatibleRequestBuilder`. | `docs/tool_call_formatting_and_parsing.md`, `docs/api_tool_call_streaming_design.md`, `docs/llm_module_design.md`, `docs/llm_module_design_nodejs.md` |
| `src/agent/context/api-tool-choice-policy.ts` and AgentConfig-based policy tests/helpers | Removed; request-builder tests and direct-caller/live smokes cover explicit lower-level `tool_choice` behavior. | `docs/api_tool_call_streaming_design.md`, `docs/llm_module_design_nodejs.md` |
| Native API tool-result continuation through `SenderType.TOOL` aggregate user input | `ToolContinuationReadyEvent` plus `LLMRequestAssembler.prepareToolContinuationRequest(...)` renders existing working context directly without appending aggregate user text. | `docs/api_tool_call_streaming_design.md`, `docs/tool_call_formatting_and_parsing.md`, `docs/agent_memory_design.md`, `docs/agent_memory_design_nodejs.md`, `docs/turn_terminology.md` |
| Result processors mutating memory before native active-batch validation | `ToolResultEventHandler` validates native identity before invoking configured result processors. | `docs/api_tool_call_streaming_design.md`, `docs/lifecycle_event_sourced_engine_design.md`, `docs/agent_memory_design.md`, `docs/agent_memory_design_nodejs.md` |
| `src/llm/prompt-renderers/lmstudio-chat-renderer.ts` native/text-mixed LM Studio renderer behavior | `OpenAIChatRenderer` for native API mode plus `LMStudioTextToolHistoryRenderer` for explicit text-parser modes. | `docs/tool_call_formatting_and_parsing.md`, `docs/llm_module_design.md`, `docs/llm_module_design_nodejs.md`, `docs/api_tool_call_streaming_design.md` |
| Direct OpenAI-compatible request payload assembly / broad kwarg spreading | `OpenAICompatibleRequestBuilder` plus provider-owned pre-builder normalization where needed. | `docs/llm_module_design.md`, `docs/llm_module_design_nodejs.md`, `docs/api_tool_call_streaming_design.md` |
| Generic invalid Kimi default temperature forwarding for `kimi-k2.5`/`kimi-k2.6` | `KimiLLM` provider-safe temperature normalization. | `docs/llm_module_design.md`, `docs/llm_module_design_nodejs.md`, `docs/provider_model_catalogs.md` |
| API-mode legacy text parser fallback expectation | Diagnostic-only handling with no fallback tool execution. | `docs/tool_call_formatting_and_parsing.md`, `docs/api_tool_call_streaming_design.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `No new long-lived docs impact from Round 7`
- Rationale: Round 7 was a supplemental validation sweep. It added executable evidence but did not change the reviewed/validated implementation contract already recorded in long-lived docs.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync and handoff artifacts were refreshed against the current integrated base after API/E2E Round 7 passed. Repository finalization remains on hold pending explicit user verification as required by the delivery workflow.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A`


## Round-6 Scope Correction: Provider-Native Renderer Known Gaps

Subsequent solution-design investigation and architecture review (`AR-006-001`) clarified that this ticket's validation/sign-off scope is OpenAI-compatible Chat providers plus the shared no-synthetic-user continuation path. It must not be read as validating provider-native history rendering for Gemini, Ollama, Anthropic, Mistral, or OpenAI Responses. Those provider renderers still need separate native API history designs and executable wire-format tests; see `non-openai-api-mode-provider-investigation.md` and `probes/non-openai-api-renderer-probe-output.json`.
