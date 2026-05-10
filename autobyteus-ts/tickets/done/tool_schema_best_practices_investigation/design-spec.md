# Design Spec

Canonical artifact path: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/design-spec.md`

## Current-State Read

`autobyteus-ts` already defaults to provider-native API tool calls (`AUTOBYTEUS_STREAM_PARSER` default `api_tool_call`) and suppresses prompt-injected tool manifests in that mode. The top-level schema envelope sent for `run_bash` under LM Studio is OpenAI-compatible (`{ type:'function', function:{ name, description, parameters } }`). The current implementation is therefore not fundamentally sending a completely wrong tool shape.

The unhealthy part is the boundary between native tool transport and text-rendered tool history:

- `OpenAIChatRenderer` can render previous tool calls/results as OpenAI-compatible structured messages (`assistant.tool_calls` and `role:'tool'`).
- `LMStudioLLM` overrides the renderer with `LMStudioChatRenderer`.
- `LMStudioChatRenderer` converts prior tool calls into assistant content strings such as `[TOOL_CALL] run_bash {...}` and tool results into user text such as `[TOOL_RESULT] ...`.
- In API tool-call mode, that means native tool-call history is contaminated with textual tool-call examples. The reported screenshot has the exact `[TOOL_CALL]` shape emitted by this renderer.

The schema/request path is also too loose:

- `OpenAiJsonSchemaFormatter` does not add `additionalProperties:false` or strict-schema metadata.
- `OpenAICompatibleLLM` assembles provider params inline, spreads all kwargs into provider requests, and therefore can leak internal fields such as `logicalConversationId`.
- `OpenAICompatibleLLM` does not map `LLMConfig.temperature`, `topP`, penalties, or stop sequences into request params, so reliability settings may be silently ignored.
- Tool-choice handling was previously ad hoc in tests; this ticket keeps only lower-level request-builder pass-through and leaves product-level policy out of scope.

The target design must keep native API tool mode and text parser modes separate, tighten schema/request construction, and add diagnostics rather than unsafe fallback execution of text-shaped tool calls.

## Intended Change

Implement a coherent OpenAI-compatible native tool-call path:

1. Normalize OpenAI-compatible tool schemas so object schemas are closed with `additionalProperties:false`.
2. Add strict-mode design support but keep `strict:true` gated/off by default unless optional nullable-required semantics are implemented safely.
3. Replace ad hoc OpenAI-compatible request construction with a request builder that maps `LLMConfig`, explicitly passes supported tool fields, and filters internal kwargs.
4. Render LM Studio native API-mode history using structured OpenAI-compatible messages, not `[TOOL_CALL]` text.
5. Preserve explicit lower-level `tool_choice` pass-through in the OpenAI-compatible request builder, but do not add a public agent/product tool-choice policy in this ticket.
6. Emit diagnostics when API mode receives text that looks like a tool call but no native `tool_calls` were parsed; do not execute that text.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Behavior Change + Refactor.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; Shared Structure Looseness; Duplicated Policy Or Coordination.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence: LM Studio renderer emits the screenshot's exact `[TOOL_CALL]` syntax; OpenAI-compatible schema probe lacks `additionalProperties:false`; request builder leaks kwargs and ignores LLMConfig sampling controls; tool-choice forcing exists as a test-helper monkey patch.
- Design response: Separate native OpenAI-compatible tool transport/history from text parser modes; centralize schema normalization and request construction; formalize the lower-level tool-choice boundary; add diagnostics without fallback execution.
- Refactor rationale: Leaving the renderer/request/schema boundaries as-is would make the fix addition-only and preserve the contamination that likely causes the user-visible issue.
- Intentional deferrals and residual risk, if any: Full `strict:true` rollout is deferred unless optional arguments are converted to nullable-required schema fields during implementation. Residual risk: non-strict Chat Completions can still produce best-effort arguments; adding `additionalProperties:false` still improves schema clarity without breaking optional fields.

## Terminology

- **Native API mode (general)**: `api_tool_call` mode where a provider receives native `tools`/function declarations and returns structured tool-call data.
- **This-ticket native API scope**: OpenAI-compatible Chat providers using Chat-Completions-like `tools`, `tool_calls`, and `role:'tool'` history, plus LM Studio renderer selection. Non-OpenAI provider-native renderers are deferred by the Round-6 scope correction addendum.
- **Text parser modes**: `xml`, `json`, and `sentinel` modes where model text is parsed for tool invocations.
- **OpenAI-compatible provider**: Provider using Chat Completions-like `messages`, `tools`, `tool_choice`, `tool_calls`, and `role:'tool'` conventions, including LM Studio.
- **Tool-choice boundary**: In this ticket, only lower-level explicit `kwargs.tool_choice` pass-through in the OpenAI-compatible request builder is in scope. Product/agent-level configurable tool-choice policy is deferred.

## Design Reading Order

1. Data-flow spine inventory.
2. Capability ownership.
3. File responsibilities and reusable structures.
4. Migration/refactor sequence.
5. Tests and diagnostics.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove LM Studio API-mode dependence on `[TOOL_CALL]`/`[TOOL_RESULT]` textual history. Do not add an API-mode fallback that executes those text strings.
- Textual LM Studio history formatting may remain only if explicitly scoped to legacy text parser modes. It must not be active for native API mode.
- Inline OpenAI-compatible request assembly should be decommissioned in favor of one request builder.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Agent has tools and user turn | Provider receives structured OpenAI-compatible request | `LLMUserMessageReadyEventHandler` coordinating with `OpenAICompatibleRequestBuilder` | This is where schema, tool-choice, request config, and message history meet. |
| DS-002 | Return-Event | Provider streaming chunk with `tool_calls` | Tool invocation events and working-context tool payloads | `ApiToolCallStreamingResponseHandler` + existing memory ingestion | This is the successful tool-call path shown in the Activity panel. |
| DS-003 | Primary End-to-End | Prior tool calls/results in memory | Next provider request history | Prompt renderer selected by LLM/provider | This is currently contaminated by LM Studio textual history. |
| DS-004 | Bounded Local | Tool definitions | OpenAI-compatible `tools` schema array | `ToolSchemaProvider` / `OpenAiJsonSchemaFormatter` | This controls schema best-practice adherence. |
| DS-005 | Bounded Local | Final assistant text in API mode | Diagnostic if text looks like tool call | API tool-call diagnostic helper | This makes provider/model format mismatches visible without unsafe execution. |

## Primary Execution Spine(s)

- DS-001: `LLMUserMessageReadyEventHandler -> StreamingResponseHandlerFactory -> ToolSchemaProvider -> LLMRequestAssembler(renderer) -> OpenAICompatibleRequestBuilder -> OpenAI-compatible provider`
- DS-003: `WorkingContextSnapshot tool payloads -> selected chat renderer -> OpenAI-compatible messages -> provider chat template/parser`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | For a user turn with tools, the handler selects the OpenAI-compatible native Chat path, attaches tool schemas, renders message history, and sends a filtered/configured request. Explicit lower-level `tool_choice` is only passed through if direct callers provide it. | Agent turn, tool schema, message history, request params | `LLMUserMessageReadyEventHandler` for turn sequencing; request builder for provider params | Schema normalization, config mapping, internal kwarg filtering |
| DS-002 | Provider emits streamed native `tool_calls`; the API streaming handler converts deltas into segment events and tool invocations; memory later records tool calls/results. | Tool-call deltas, segment events, tool invocations | `ApiToolCallStreamingResponseHandler` | Text leakage diagnostics after final content |
| DS-003 | Stored tool-call/tool-result payloads must be rendered as native OpenAI-compatible history in native mode, so the provider sees the same protocol it returns. | `ToolCallPayload`, `ToolResultPayload`, rendered messages | `OpenAIChatRenderer` or a native-mode LM Studio renderer that delegates to it | Legacy text renderer isolation |
| DS-004 | Tool definitions become provider tool schemas through a formatter that closes object schemas and optionally applies strict-mode rules. | `ToolDefinition`, `ParameterSchema`, JSON Schema | `ToolSchemaProvider` / formatter | Strict optional/null semantics |
| DS-005 | If a model emits text such as `[TOOL_CALL] ...` while API mode parsed no native calls, record a diagnostic and keep it as assistant text. | Final text, parsed invocation count, diagnostic event/log | API-mode response handling | No fallback parser execution |

## Spine Actors / Main-Line Nodes

- `LLMUserMessageReadyEventHandler`: owns turn-level request preparation and event sequencing.
- `StreamingResponseHandlerFactory`: owns selection between native API handler and text parser handlers.
- `ToolSchemaProvider`: owns provider-facing tool schema construction.
- `OpenAiJsonSchemaFormatter` + normalizer: owns OpenAI-compatible function-tool schema shape and constraints.
- `LLMRequestAssembler`: owns conversation assembly using the chosen renderer.
- `OpenAIChatRenderer`: owns structured OpenAI-compatible message rendering.
- `OpenAICompatibleRequestBuilder`: proposed owner for provider request payload construction.
- `OpenAICompatibleLLM`: owns provider client call and streaming chunk conversion, but should no longer own request-param assembly details.
- `ApiToolCallStreamingResponseHandler`: owns native streamed tool-call delta handling.

## Ownership Map

- Turn sequencing and stream kwargs belong to the agent handler; provider payload legality belongs to the request builder.
- Tool schema content belongs to tool usage/formatter code; neither LLM providers nor agents should mutate JSON Schema ad hoc.
- Native tool history rendering belongs to OpenAI-compatible renderers; LM Studio provider should not invent a second history protocol in native mode.
- Diagnostics belong near API-mode response completion because only that layer knows whether text was received and no native tool calls were parsed.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ToolSchemaProvider.buildSchema(...)` | Provider-specific formatters/normalizers | Single caller-facing schema entrypoint | Provider request policy or turn policy |
| `OpenAICompatibleLLM.streamMessages(...)` | `OpenAICompatibleRequestBuilder` + provider client | Public LLM streaming boundary | Tool-choice derivation or internal kwarg filtering rules scattered inline |
| `AgentConfig` constructor | Agent configuration model | Public place to configure agent behavior | Provider-specific schema mutation |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| LM Studio API-mode `[TOOL_CALL]` / `[TOOL_RESULT]` history rendering | It contaminates native tool-call mode and matches the reported failure symptom | `OpenAIChatRenderer` structured tool history or a native-mode LM Studio renderer that delegates to it | In This Change | If retained, it must be reachable only in explicit text parser mode. |
| Inline provider param construction in `OpenAICompatibleLLM` | It leaks kwargs and ignores config | `OpenAICompatibleRequestBuilder` | In This Change | Sync and streaming calls should share it. |
| LM Studio integration test monkey-patch for `tool_choice` | Test helpers should not monkey-patch provider methods | Explicit lower-level `kwargs.tool_choice` pass-through in `OpenAICompatibleRequestBuilder`, when a direct test/caller intentionally provides it | In This Change | No public agent/product policy in this ticket. |
| API-mode text fallback execution proposal | Would create dual semantics and hide provider/model failures | Diagnostic-only handling | In This Change | Do not implement parser fallback. |
| Blind `strict:true` without nullable optional fields | Would reject current schemas or make optionals mandatory incorrectly | Gated strict policy after normalizer support | Follow-up or gated in this change | Add design hooks; keep off by default if incomplete. |

## Return Or Event Spine(s) (If Applicable)

DS-002: `OpenAI-compatible provider stream -> OpenAICompatibleLLM converts delta.tool_calls -> ChunkResponse.tool_calls -> ApiToolCallStreamingResponseHandler -> SegmentEvent TOOL_CALL -> ToolInvocation -> pending tool execution -> memory stores ToolCallPayload/ToolResultPayload`

The implementation must preserve this successful return spine. The diagnostic for text-shaped output is only for the alternate case where the stream produces content and zero parsed native tool invocations.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `OpenAiToolSchemaNormalizer` (new). Spine: `raw JSON Schema -> recursive object walk -> object schemas closed -> strict-compatible transform if enabled -> normalized JSON Schema`. This matters because strict rules apply recursively, not only to the top-level parameter object.
- Parent owner: `OpenAICompatibleRequestBuilder` (new). Spine: `base model/messages -> config controls -> safe provider kwargs -> tools/tool_choice -> final params`. This matters because sync and streaming requests must be consistent.
- Parent owner: `ApiToolCallTextLeakDiagnostic` (new or local helper). Spine: `complete text + parsedToolInvocationCount + mode -> pattern match -> diagnostic log/event`. This matters because it catches the user-visible failure mode without changing execution semantics.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Strict-mode capability/gating | DS-004 | Tool schema provider/formatter | Decide whether to emit `function.strict` and strict-compatible required fields | Provider support varies and optional semantics need care | Breaking all tools by making optionals mandatory |
| Provider-specific extra body fields | DS-001 | Request builder | Carry user-specified `extraParams` without hard-coding Qwen | Qwen no-think may need extra body settings | Provider hacks in agent handler |
| Text-leak diagnostics | DS-005 | API response handling | Identify likely mismatch when text looks like a tool call | Makes failures actionable | Unsafe parser fallback or hidden failures |
| Existing text parser modes | DS-001, DS-003 | Streaming handler factory | Keep XML/JSON/sentinel modes working intentionally | Some providers/models may not support native tools | Cross-contamination of native mode |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Structured OpenAI-compatible message rendering | `src/llm/prompt-renderers/openai-chat-renderer.ts` | Reuse | Already renders `ToolCallPayload` and `ToolResultPayload` correctly | N/A |
| Provider schema construction | `src/tools/usage/providers` and `formatters` | Extend | Existing ownership is correct; it just lacks normalization | N/A |
| OpenAI-compatible request param assembly | `src/llm/api/openai-compatible-llm.ts` | Create New helper | Inline code is duplicated between sync/stream and mixes concerns | Provider class should call API, not own all param normalization |
| Tool-choice policy | `AgentConfig` / handler | Extend or create small policy type | Agent turn policy should be explicit and testable | Existing helper monkey patch is not an owner |
| API text leakage detection | API handler/LLM event handler | Create small helper or method | No existing diagnostic owns this specific condition | Text parsers should not own native API diagnostics |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Tool usage schema subsystem | Provider tool schema formatting and normalization | DS-004 | `ToolSchemaProvider` | Extend | Add OpenAI schema normalizer/options. |
| LLM API provider subsystem | OpenAI-compatible request construction and provider call | DS-001 | `OpenAICompatibleLLM` | Extend/Create helper | Add request builder. |
| Prompt rendering subsystem | Message history rendering | DS-003 | `OpenAIChatRenderer` / provider renderers | Reuse/Adjust | LM Studio native mode should use structured renderer. |
| Agent turn handling subsystem | Tool-choice policy injection and diagnostics trigger | DS-001, DS-005 | `LLMUserMessageReadyEventHandler` | Extend | Avoid provider-specific hacks here. |
| Streaming handler subsystem | Native tool-call delta parsing | DS-002 | `ApiToolCallStreamingResponseHandler` | Reuse/Extend lightly | Preserve existing behavior. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/tools/usage/formatters/openai-tool-schema-normalizer.ts` | Tool usage schema | Shared normalizer | Recursive `additionalProperties:false` and optional strict transform helpers | Single reusable transform for OpenAI-compatible formatter | Yes |
| `src/tools/usage/formatters/openai-json-schema-formatter.ts` | Tool usage schema | Formatter | Apply normalizer and optional strict metadata to function tools | Current formatter owns envelope | Yes |
| `src/tools/usage/providers/tool-schema-provider.ts` | Tool usage schema | Provider boundary | Accept/pass schema options if needed | Existing central schema entrypoint | Yes |
| `src/llm/api/openai-compatible-request-builder.ts` | LLM API provider | Request payload builder | Map config, filter kwargs, attach tools/tool_choice | Keeps provider request shape in one place | Yes |
| `src/llm/api/openai-compatible-llm.ts` | LLM API provider | Provider client | Use request builder; stream/call provider | Removes duplicated inline assembly | Yes |
| `src/llm/api/lmstudio-llm.ts` | LLM API provider | Provider class | Select native structured renderer in API mode | Provider-specific renderer choice | Yes |
| `src/llm/prompt-renderers/lmstudio-chat-renderer.ts` | Prompt rendering | Legacy text renderer | Either decommission for native mode or rename/scope to text mode | Prevents accidental native use | No |
| `src/agent/context/tool-choice-policy.ts` or similar | Agent config | Policy type | Represent `auto`/`required`/`none`/specific tool | Avoids raw ad hoc string spread | Yes |
| `src/agent/handlers/llm-user-message-ready-event-handler.ts` | Agent turn handling | Turn coordinator | Resolve policy and attach `tool_choice`; call diagnostic after stream | Existing turn owner | Yes |
| `src/agent/streaming/handlers/api-tool-call-text-diagnostic.ts` | Streaming/API diagnostics | Diagnostic helper | Pattern-match text-shaped tool calls | Keeps diagnostic separate from parser | No |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| OpenAI-compatible schema normalization | `openai-tool-schema-normalizer.ts` | Tool usage schema | Applies to every tool, not just `run_bash` | Yes | Yes | A provider request builder |
| Request param normalization | `openai-compatible-request-builder.ts` | LLM API provider | Sync and streaming need same mapping/filtering | Yes | Yes | Agent policy owner |
| Tool-choice values | `tool-choice-policy.ts` | Agent config / request policy | Avoids strings/objects scattered in tests and handlers | Yes | Yes | Provider schema owner |
| Text-leak pattern matching | `api-tool-call-text-diagnostic.ts` | API diagnostics | Reusable for stream completion tests/logging | N/A | Yes | Fallback parser/executor |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| OpenAI-compatible function tool schema | Yes | Yes | Low after normalization | Keep envelope in formatter; schema transform in normalizer. |
| Tool-choice policy | Yes if typed | Yes | Medium until provider capabilities are modeled | Use explicit union; avoid `any` in public config. |
| Request kwargs | No currently | Yes after builder | High currently | Filter internal kwargs; allow provider extras only through `extraParams`/documented fields. |
| LM Studio renderer behavior | No currently | Yes after split | High currently | Split native structured rendering from legacy text rendering. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/tools/usage/formatters/openai-tool-schema-normalizer.ts` | Tool usage schema | Normalizer | Pure functions to close object schemas and, when enabled, produce strict-compatible schemas | Prevents formatter bloat and supports tests | N/A |
| `src/tools/usage/formatters/openai-json-schema-formatter.ts` | Tool usage schema | Formatter | Build OpenAI-compatible function-tool envelope and invoke normalizer | Current correct owner for envelope | Normalizer |
| `src/tools/usage/providers/tool-schema-provider.ts` | Tool usage schema | Provider schema boundary | Pass provider/schema options; keep formatter selection central | Existing boundary | Formatter |
| `src/llm/api/openai-compatible-request-builder.ts` | LLM API provider | Request builder | Build safe Chat Completions params for sync/stream | One file for one transport payload shape | Tool-choice type |
| `src/llm/api/openai-compatible-llm.ts` | LLM API provider | Provider client | Call builder; perform SDK calls; convert chunks | Keeps provider I/O here | Request builder |
| `src/llm/api/lmstudio-llm.ts` | LLM API provider | LM Studio provider | Use structured renderer in API mode | Small provider-specific configuration | OpenAI renderer |
| `src/llm/prompt-renderers/lmstudio-chat-renderer.ts` | Prompt rendering | Legacy text renderer | Retain only for explicit text-parser mode if needed; otherwise remove | Avoids hidden native contamination | N/A |
| `src/agent/context/tool-choice-policy.ts` | Agent config | Superseded / not in current ticket | No public agent-level tool-choice policy in this ticket | Removed/deferred by tool-choice rework | N/A |
| `src/agent/context/agent-config.ts` | Agent config | Public config | Must not store a new optional tool-choice policy for this ticket | Server/product path does not own this setting | N/A |
| `src/agent/handlers/llm-user-message-ready-event-handler.ts` | Agent turn handling | Turn coordinator | Attach tool schemas and trigger diagnostic after completion; do not read a public agent tool-choice policy | Existing LLM turn owner | Diagnostic helper |
| `src/agent/streaming/handlers/api-tool-call-text-diagnostic.ts` | Streaming/API diagnostics | Diagnostic helper | Identify text-shaped tool-call output in native API mode | One small pure concern | N/A |

## Ownership Boundaries

- Tool definitions and argument schemas stop at `ToolSchemaProvider`; LLM API classes receive already formatted provider schemas.
- Agent policy stops at `tool_choice` and schema options; it must not mutate individual tool JSON Schemas.
- Provider request construction stops at `OpenAICompatibleRequestBuilder`; callers must not spread arbitrary internal kwargs into provider params.
- Prompt renderers own message shape, not provider request sampling controls.
- API tool-call handler owns native deltas, not textual parser fallback.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ToolSchemaProvider.buildSchema` | Formatter selection and schema normalization | Streaming handler factory | Directly instantiating formatters in agent/LLM code | Add options to provider boundary |
| `OpenAICompatibleRequestBuilder.build...` | Config mapping, safe kwarg filtering, tools/tool_choice placement | `OpenAICompatibleLLM` | `{ ...kwargs }` into provider params | Add typed accepted kwargs |
| `OpenAIChatRenderer.render` for native mode | Structured `tool_calls` / `tool` role rendering | LLM request assembler/provider renderer selection | Manually encoding tool calls as text | Add renderer mode or provider selection method |
| Product-level tool-choice resolver | Deferred policy normalization | Future server/product config path | Test monkey-patching LLM methods | Separate follow-up design, not this ticket |

## Dependency Rules

- `OpenAICompatibleLLM` may depend on `OpenAICompatibleRequestBuilder`; the builder must not depend on agent handlers.
- `ToolSchemaProvider` may depend on formatters; formatters must not depend on LLM providers beyond explicit provider options.
- `LMStudioLLM` may choose a renderer; it must not alter schema or tool-choice policy.
- `LLMUserMessageReadyEventHandler` may read agent config policy and set request kwargs; it must not know schema normalization internals.
- Text parser mode code must not be imported by API-mode diagnostic code for execution fallback.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `ToolSchemaProvider.buildSchema(toolNames, provider, options?)` | Provider tool schema | Return provider-ready tool schemas | Tool name strings; provider enum; optional schema policy | Existing interface can be extended compatibly for implementation, but no dual behavior in native mode. |
| `OpenAICompatibleRequestBuilder.build({ model, messages, config, kwargs, stream })` | Provider request payload | Return safe SDK params | Explicit fields, typed safe kwargs | Filters internal keys. |
| `AgentConfig.apiToolChoicePolicy` (proposed) | Superseded / deferred | Not in current ticket | N/A | Product-level configurable tool choice requires a separate server/domain/UI/provider-capability design. |
| `detectApiToolCallTextLeak(text, parsedCount)` | API diagnostics | Return diagnostic payload or null | Final assistant text + native parsed count | No tool execution. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ToolSchemaProvider.buildSchema` | Yes | Yes | Low | Add typed options if needed. |
| `OpenAICompatibleRequestBuilder` | Yes | Yes | Low | Keep internal kwargs denylist in one file. |
| `AgentConfig` policy field | Yes if named specifically | Yes | Medium | Avoid generic `toolMode`; use API tool-choice naming. |
| Diagnostic helper | Yes | Yes | Low | Keep pure and non-executing. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| OpenAI schema normalization | `OpenAiToolSchemaNormalizer` / `openai-tool-schema-normalizer.ts` | Yes | Low | Use OpenAI-compatible naming consistently. |
| Provider request payload builder | `OpenAICompatibleRequestBuilder` | Yes | Low | Keep request-specific; do not call it generic `LLMRequestBuilder`. |
| Tool-choice boundary | Lower-level explicit `kwargs.tool_choice` pass-through only | Yes | Low in current scope | Public/product policy deferred; request builder preserves direct caller input when provided. |
| Text leakage diagnostic | `ApiToolCallTextDiagnostic` | Yes | Low | Diagnostic naming prevents parser/executor confusion. |

## Applied Patterns (If Any)

- **Normalizer pattern** for schema transformation: pure recursive transform under tool usage formatter ownership.
- **Request builder pattern** for OpenAI-compatible provider payloads: isolates transport payload construction from provider I/O.
- **Policy resolver pattern** for tool choice: converts public config into provider-safe `tool_choice` only when tools exist and API mode applies.
- **Diagnostic-only pattern** for malformed/text-shaped native-tool outputs: visibility without dual execution.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `src/tools/usage/formatters/openai-tool-schema-normalizer.ts` | File | Tool usage schema | Recursive OpenAI-compatible schema normalization | Same folder as schema formatters | Provider request params |
| `src/tools/usage/formatters/openai-json-schema-formatter.ts` | File | OpenAI formatter | Function-tool envelope plus normalizer call | Existing owner | Agent policy |
| `src/tools/usage/providers/tool-schema-provider.ts` | File | Schema provider boundary | Formatter selection and options | Existing boundary | Request construction |
| `src/llm/api/openai-compatible-request-builder.ts` | File | OpenAI-compatible API request payload | Build sync/stream request params | Same folder as provider API implementation | Tool schema mutation |
| `src/llm/api/openai-compatible-llm.ts` | File | OpenAI-compatible provider client | SDK calls and chunk conversion | Existing provider class | Inline ad hoc param normalization |
| `src/llm/api/lmstudio-llm.ts` | File | LM Studio provider setup | Base URL/client options/renderer selection | Existing provider class | Text history protocol in native mode |
| `src/llm/prompt-renderers/lmstudio-chat-renderer.ts` | File | Legacy text renderer if retained | Explicit text-mode-only formatting | Prompt renderer folder | Native API history formatting |
| `src/agent/context/tool-choice-policy.ts` | File | Agent policy type | Tool-choice union/resolver | Agent context/config area | Provider SDK calls |
| `src/agent/context/agent-config.ts` | File | Agent config | Store policy | Existing public config | Provider schema internals |
| `src/agent/handlers/llm-user-message-ready-event-handler.ts` | File | LLM turn coordinator | Apply policy and diagnostics | Existing turn coordinator | Raw provider param filtering |
| `src/agent/streaming/handlers/api-tool-call-text-diagnostic.ts` | File | API diagnostic | Text-shaped tool call detection | Streaming/API handler area | Tool execution fallback |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/tools/usage/formatters` | Off-Spine Concern | Yes | Low | Provider schema formatting belongs here. |
| `src/tools/usage/providers` | Off-Spine Concern / Boundary | Yes | Low | Existing schema provider boundary. |
| `src/llm/api` | Transport / Provider | Yes | Medium | Request builder belongs here because it builds provider transport params; keep it provider-focused. |
| `src/llm/prompt-renderers` | Transport message rendering | Yes | Medium | LM Studio renderer must be scoped by mode to avoid native/text mixing. |
| `src/agent/context` | Main-Line Domain-Control config | Yes | Low | Tool-choice policy is agent behavior config. |
| `src/agent/streaming/handlers` | Return-Event handling | Yes | Low | Diagnostic is native streaming concern. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Native LM Studio history | `{ role:'assistant', tool_calls:[{ id, type:'function', function:{ name:'run_bash', arguments:'{"command":"pwd"}' }}] }`, then `{ role:'tool', tool_call_id:id, content:'...' }` | `{ role:'assistant', content:'[TOOL_CALL] run_bash {"command":"pwd"}' }` in API mode | The bad shape exactly matches the user's intermittent failure text. |
| OpenAI schema minimum | `parameters: { type:'object', properties:{ command:{type:'string'} }, required:['command'], additionalProperties:false }` | `parameters` object without `additionalProperties:false` | Closed object schemas align with OpenAI/LM Studio examples and strict-readiness. |
| Strict optional field | `cwd: { type:['string','null'] }` and `required:['command','cwd',...]` when strict enabled | `strict:true` while omitting optional fields from `required` | OpenAI strict mode rejects non-compliant schemas. |
| API-mode malformed tool output | Emit diagnostic and store assistant text | Parse `[TOOL_CALL]` text and execute anyway | Avoids dual protocol semantics and unsafe hidden execution. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Parse `[TOOL_CALL]` text in API mode as fallback | Would make the screenshot case execute | Rejected | Diagnostic only; fix renderer/request path. |
| Keep LM Studio renderer text history and add more prompt instructions | Lower-risk surface change | Rejected | Render native structured history in native mode. |
| Leave `...kwargs` spread and add a denylist elsewhere | Quick patch | Rejected | Central request builder owns filtering. |
| Enable `strict:true` for all tools immediately | Could improve reliability | Rejected unless optional-null support is implemented | Add normalizer now; gate strict policy. |
| Keep monkey-patch test helper for `tool_choice` | Existing tests use it | Rejected | Direct request-builder pass-through or test-local direct LLM kwargs. |

## Derived Layering (If Useful)

Layering after this change:

1. Agent turn/config layer: selects mode and attaches tool schemas; public/product tool-choice policy is not in current scope.
2. Tool schema layer: turns registered tools into provider-ready schemas.
3. Prompt rendering layer: turns memory messages into provider-compatible message history.
4. Provider request layer: builds safe provider params and calls SDK.
5. Streaming return layer: converts native `tool_calls` to Autobyteus segment/tool invocation events.
6. Diagnostic layer: flags text/native mismatch without executing text.

## Migration / Refactor Sequence

1. Add schema normalizer and tests for object closure (`additionalProperties:false`) using `run_bash` and a nested-object fixture if available.
2. Update `OpenAiJsonSchemaFormatter` to invoke the normalizer. If strict option is added, keep default non-strict unless strict-compatible optional handling is complete.
3. Add `OpenAICompatibleRequestBuilder` with unit tests for:
   - config mapping (`temperature`, `top_p`, penalties, stop, max tokens),
   - `tools` and `tool_choice`,
   - filtering `logicalConversationId`,
   - `extraParams` merge order.
4. Refactor `OpenAICompatibleLLM` sync and streaming methods to use the builder.
5. Remove/de-scope public agent tool-choice policy; keep only explicit lower-level `kwargs.tool_choice` pass-through in the OpenAI-compatible request builder.
6. Refactor LM Studio renderer selection:
   - Preferred: `LMStudioLLM` uses `OpenAIChatRenderer` in `api_tool_call` mode.
   - If legacy text formatting must remain, rename/scope `LMStudioChatRenderer` to legacy text mode and adjust tests to prove native mode never emits `[TOOL_CALL]`.
7. Add API-mode text-leak diagnostic helper and handler test.
8. Update LM Studio integration helper to remove monkey-patch and use official policy/config.
9. Run targeted unit tests and `pnpm exec tsc -p tsconfig.build.json --noEmit`.
10. Optional/live validation: with LM Studio/Qwen, capture request payload and verify structured messages/tool schemas are sent; compare tool-call rate before/after if environment is available.

## Key Tradeoffs

- **Do not execute text fallback in API mode:** This may leave some malformed local-model outputs unexecuted, but it preserves clear protocol semantics and forces the root cause to be fixed.
- **Schema closure now, strict later/gated:** `additionalProperties:false` is low-risk and aligns with best practice. Strict mode is higher-risk because current optional fields are not strict-compatible.
- **Provider-specific Qwen no-think remains config-driven:** Hard-coding Qwen behavior would be brittle. The request builder should reliably pass `extraParams` so users can configure provider-specific bodies.

## Risks

- Some OpenAI-compatible endpoints may be sensitive to exact request fields; request builder tests should pin what is sent.
- LM Studio model/template support varies; even after framework fixes, a quantized local model may sometimes fail to emit parseable native `tool_calls`.
- If legacy text renderer is retained, future code could accidentally select it in native mode. Tests must explicitly guard this.
- Strict-mode support could break optional fields if implemented too aggressively.

## Guidance For Implementation

- Treat the screenshot symptom as a native/text boundary bug first, not as a parser fallback problem.
- Prefer small pure helpers with direct tests (`normalizer`, `request builder`, `diagnostic`) over more logic in large handlers.
- Do not move tool schema ownership into LLM provider classes.
- Do not send `logicalConversationId` or any future internal-only kwargs to OpenAI-compatible endpoints.
- Do not hard-code `qwen3.6-35b-a3b-nvfp4`; use provider capabilities/config so the fix applies to LM Studio/OpenAI-compatible providers generally.
- Keep tests focused on payload shapes, not live model behavior, except optional integration validation.

## Investigation Test Evidence Update

The design is based not only on source reading but also on generated-schema checks:

- Existing schema tests passed: `tests/unit/tools/usage/formatters/openai-json-schema-formatter.test.ts`, `tests/unit/tools/usage/providers/tool-schema-provider.test.ts`, and `tests/unit/utils/parameter-schema.test.ts` passed 12/12 tests.
- Investigation-only compliance test passed as a reporting test: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/schema-best-practice-compliance.test.ts` passed 3/3 tests and wrote `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/schema-best-practice-compliance-report.json`.

The compliance report proves the nuanced design premise:

1. Current generated schemas pass the minimum OpenAI-compatible function-tool envelope check.
2. Current generated schemas fail best-practice/strict-readiness checks for closed object schemas and strict optional-field representation.
3. Therefore the implementation change should not be described as replacing a totally wrong schema. It should be described as tightening a basically compatible schema into a best-practice/strict-ready schema while also fixing the native-tool/text-history boundary.


## Design Rework Addendum: Remove Public `AgentConfig` Tool-Choice Policy From This Ticket

### Trigger

During implementation, the user questioned the new `ApiToolChoicePolicy` / `AgentConfig.apiToolChoicePolicy` surface. Implementation review confirmed that the current server/Electron path does not set or pass this field and that product/domain config types do not carry it. The observed runtime improvement is therefore attributable to the confirmed fixes: structured LM Studio native tool history, schema normalization, and OpenAI-compatible request construction.

### Updated Design Decision

Choose option 1: **remove/de-scope the new public `AgentConfig.apiToolChoicePolicy` API from this ticket.**

The ticket should retain only lower-level OpenAI-compatible request support for explicit `tool_choice` kwargs. This preserves direct provider capability for tests and direct LLM integrations without introducing a product-facing agent config API that the server/Electron path cannot set.

### Superseded Design Elements

The following earlier design elements are superseded and should not be implemented/kept for this ticket:

- New public `AgentConfig.apiToolChoicePolicy` field.
- Exporting `ApiToolChoicePolicy` as part of the agent context public API.
- Agent handler logic that reads `context.config.apiToolChoicePolicy` and injects `streamKwargs.tool_choice`.
- Tests whose only purpose is to prove an `AgentConfig` policy injects `tool_choice`.

### Still In Scope

- `OpenAICompatibleRequestBuilder` may pass explicit `kwargs.tool_choice` when direct callers provide it.
- Tests should verify that builder behavior directly.
- Default agent/server path must leave `tool_choice` unset.
- Schema normalization, strict-readiness gating, request config mapping/filtering, LM Studio native structured history, and API-mode text-leak diagnostics remain in scope.

### Future Ticket Boundary

If product-level configurable tool choice is desired, it needs a separate design and implementation path through:

1. server domain config,
2. persistence/API/schema compatibility,
3. Electron/UI controls if applicable,
4. provider/model capability safeguards, and
5. validation against providers that differ in `tool_choice` support.

### Implementation Guidance

- Remove `src/agent/context/api-tool-choice-policy.ts` unless no longer public and strictly test-local/internal; preferred outcome is removal for this ticket.
- Remove `apiToolChoicePolicy` from `AgentConfig`, constructor, copy, and exports.
- Remove handler policy resolution and keep `streamKwargs` limited to internal conversation id plus tool schemas.
- Keep request-builder tests for explicit `tool_choice` kwargs.
- Update any integration helpers that need forced tool calls to use direct LLM API kwargs or test-only helpers, not production `AgentConfig`.

## Design Rework Addendum: API Tool Result Continuation Must Not Append Synthetic User Content

### Trigger

The user asked whether the framework-level API tool mode feeds tool results back as user messages. A focused continuation-pipeline probe confirmed that `OpenAIChatRenderer` is correct in isolation, but the full tool-result continuation pipeline still appends a synthetic user message containing aggregated tool-result text.

Durable evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/api-tool-continuation-render-probe-output.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/design-rework-api-tool-continuation.md`

### Updated Design Decision

For OpenAI-compatible native `api_tool_call` mode, the next request after a tool result must continue from structured history only:

1. previous user request,
2. assistant message with `tool_calls`,
3. one `role:'tool'` message per completed tool result with matching `tool_call_id`,
4. no synthetic user message repeating the tool result.

The existing textual aggregate message beginning `The following tool executions have completed...` must not be appended to provider request history in native API mode. It may remain for legacy text/parser modes or UI/logging/trace purposes.

### Current Root Cause

- `MemoryIngestToolResultProcessor` / `MemoryManager` / `WorkingContextSnapshot` correctly append `ToolResultPayload`.
- `OpenAIChatRenderer` correctly renders `ToolResultPayload` as `role:'tool'`.
- `ToolResultEventHandler.dispatchResultsToInputPipeline(...)` also creates a `SenderType.TOOL` `AgentInputUserMessage` containing aggregated tool-result text.
- `UserInputMessageEventHandler` converts that to an `LLMUserMessageReadyEvent`.
- `LLMRequestAssembler.prepareRequest(...)` always appends the incoming message as `MessageRole.USER`.

Therefore native mode currently sends a correct `role:'tool'` message plus an incorrect duplicate `role:'user'` aggregate.

### Design Update

Add a distinct native tool-continuation trigger that can advance the active turn without appending a user message to working context.

Acceptable implementation shapes:

1. Preferred: introduce a dedicated internal tool-continuation event consumed by the LLM-ready handler/request assembler as “render current working context and continue,” with no user-message append.
2. Acceptable: add an explicit request-assembly option/metadata such as `appendUserMessage:false` that is only available for `SenderType.TOOL` / tool-continuation flows and is covered by tests.
3. Gate the current `ToolResultEventHandler` aggregation behavior by tool-call format: native API mode uses no-user-message continuation; legacy text/parser modes keep the aggregate textual content.

### Required Test Update

Add or update a framework-level request assembly test that simulates:

1. user message,
2. assistant native tool call stored in working context,
3. `ToolResultEvent` ingestion,
4. tool-result continuation trigger,
5. OpenAI-compatible request rendering.

Expected assertion:

- request contains `assistant.tool_calls` and matching `role:'tool'` messages;
- request does not contain a `role:'user'` message whose content starts with `The following tool executions have completed...`;
- legacy text/parser mode behavior is not silently broken if it still needs aggregate text.

### Superseded Interpretation

Earlier AC-003/design language that said “LM Studio native history emits `assistant.tool_calls` plus `role:'tool'` messages” is necessary but not sufficient. It remains true at renderer level, but implementation must also ensure the broader continuation pipeline does not add duplicate user-message tool results.

## Round-6 Scope Correction Addendum: Non-OpenAI Provider-Native Renderers Are Known Gaps

Architecture review `AR-006-001` rejected any claim that this ticket solves all provider-native `api_tool_call` renderers. This addendum supersedes broader “native API mode” wording above wherever it could be read beyond the approved OpenAI-compatible Chat scope.

### Corrected In-Scope Design Boundary

This ticket designs and implements:

1. OpenAI-compatible Chat request/schema/history correctness through `OpenAICompatibleLLM`, `OpenAICompatibleRequestBuilder`, `OpenAIChatRenderer`, and LM Studio renderer selection.
2. Shared native tool-result continuation routing that avoids appending a duplicate synthetic aggregate user message for the OpenAI-compatible Chat native history path.
3. Diagnostic-only handling for text-shaped `[TOOL_CALL]` output in that API path.

### Explicitly Deferred Provider-Native Renderer Work

The following providers are not solved by this design because their native API history contracts differ from OpenAI-compatible Chat and current renderers still emit legacy `[TOOL_CALL]` / `[TOOL_RESULT]` text when rendering stored tool payloads:

- Gemini: requires typed `functionCall` / `functionResponse` parts.
- Ollama: requires assistant `tool_calls` and `role:"tool"` messages with `tool_name` / order semantics.
- Anthropic: requires `tool_use` and `tool_result` content blocks, not raw text tags.
- Mistral: requires assistant `tool_calls` plus `role:"tool"` results with `tool_call_id`.
- OpenAI Responses: requires `function_call` and `function_call_output` input/output items.

### Required Follow-Up If Expanded

If these providers are added to scope, route back through solution design before implementation. The follow-up must define provider-specific FRs/ACs, renderer mappings, schema expectations, result identity/order rules, and executable wire-format probes/tests for each provider.

Evidence artifacts:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/non-openai-api-mode-provider-investigation.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/probes/non-openai-api-renderer-probe-output.json`


Provider-native scope rework decision: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/design-rework-provider-native-scope.md`
