# Tool Call Formatting and Parsing Design

Date: 2025-12-20
Status: Draft
Authors: Autobyteus Core Team

## Context

Autobyteus supports multiple LLM providers that emit and consume different tool call
formats (JSON variants for OpenAI-style models, XML for Anthropic). The system must:

- Generate correct, provider-aware tool manifests for prompts.
- Parse provider-specific tool calls from LLM responses into a unified internal model.
- Allow a configuration override to force XML/JSON formatting/parsing when desired.
- Keep the pipeline extensible without coupling core agent logic to any one provider.

This document describes the current implementation as reflected in the codebase.

Related documentation:

- Streaming parser design and segment lifecycle: `docs/streaming_parser_design.md`

If you're new to the parsing flow, start with the streaming design doc above.
This document assumes the FSM emits segment events and the `ToolInvocationAdapter`
maps those segments into tool calls.

## Goals

1. Provider-aware tool manifests that include schema + usage examples.
2. Provider-aware parsing that yields a uniform `ToolInvocation` model.
3. Configurable override via `AUTOBYTEUS_STREAM_PARSER` when needed.
4. Resilience to mixed-content responses (tool calls embedded in free text).
5. Extensible registries for adding new providers or formats.

## Non-goals

- Designing new tool syntaxes beyond JSON/XML.
- Replacing the existing event-driven execution pipeline.
- Introducing new runtime registries for custom parsing strategies.

## High-level Flow

```
ToolDefinition registry
      │
      ▼
ToolManifestProvider
      │  (ToolFormattingRegistry selects schema + example formatters)
      ▼
ToolManifestInjectorProcessor
      │  (appends "Accessible Tools" section to system prompt)
      ▼
LLM
      ▼
LLMUserMessageReadyEventHandler
      │  (StreamingResponseHandler)
      ▼
StreamingParser + ToolInvocationAdapter
      │
      ▼
ToolInvocation list (per stream)
      │
      ▼
PendingToolInvocationEvent -> tool execution -> ToolResultEventHandler
```

## Formatter / Example / Parser Contract

Tool call formatting and parsing are tightly coupled. The formatter pair
(schema + example) defines the **shape** the LLM should emit, and the streaming
parser must recognize that exact shape.

```
ToolDefinition
  ├─ SchemaFormatter  -> tool schema
  └─ ExampleFormatter -> canonical example
             │
             ▼
      Tool manifest in prompt
             │
             ▼
      LLM output (matches example shape)
             │
             ▼
      StreamingParser + ToolInvocationAdapter
```

Key alignment rules:

- The **example formatter** establishes the surface syntax the parser expects.
- The **parser** must stay in lockstep with any example changes (XML tags or JSON envelopes).
- The **adapter** maps parsed segments to tool names/args (e.g., `<write_file>` -> `write_file`).

Concrete alignment points in code:

- XML examples (`DefaultXmlExampleFormatter`) emit `<tool>`/`<write_file>`/`<run_bash>` shapes that
  the XML tag parser recognizes (`XmlTagInitializationState`, `WriteFileParsingState`, etc.).
- XML leaf-text values are entity-decoded exactly once before tool arguments are emitted, so
  encoded command text such as `&amp;&amp;` reaches `run_bash` as executable `&&`.
- JSON examples are provider-specific (OpenAI/Gemini/default) and must match the JSON
  parsing strategies in `src/agent/streaming/parser/json-parsing-strategies/`.
- The tool syntax registry (`src/agent/streaming/adapters/tool-syntax-registry.ts`)
  defines how parsed segments become tool invocations.

## Core Components

### 1) ToolDefinition and Tool Registry

- `ToolDefinition` is the canonical source of tool metadata and schema providers.
- Argument and config schemas are generated lazily and cached.
- Description can be static or dynamically provided by the tool class.
- The registry (`ToolRegistry`) stores definitions and is used by manifest generation.

Why it matters:

- All formatting and parsing flows rely on `ToolDefinition` for stable names, schema,
  and descriptions.

Key files:

- `src/tools/registry/tool-definition.ts`
- `src/tools/registry/tool-registry.ts`

### 2) Tool Manifest Generation (Formatting)

Formatting is handled by a provider-aware registry of formatter pairs:

- `ToolFormattingRegistry` maps `LLMProvider` -> `ToolFormatterPair`.
- Each pair includes a schema formatter and an example formatter.
- Default fallback is JSON when a provider is unknown.
- Env override (`AUTOBYTEUS_STREAM_PARSER=xml|json|sentinel|api_tool_call`) selects the tool-call mode. `xml` forces XML prompt formatting, `json` forces the default JSON formatter, `sentinel` keeps default prompt formatting with the sentinel parser, and `api_tool_call` uses provider-native tool calls.

The manifest itself is composed by `ToolManifestProvider`:

- Builds schema + example for each tool.
- For XML, prepends general XML usage guidelines and array formatting guidance.
- For JSON, renders schema dictionaries and embeds examples as formatted strings.

The manifest is injected into the system prompt by
`ToolManifestInjectorProcessor`, which appends an "Accessible Tools" section
directly at the end of the system prompt. No placeholder is required.

In native API tool-call mode (`api_tool_call`), `AgentConfig` removes the
`ToolManifestInjectorProcessor` from the default processor set. Tool definitions
are passed through provider-native request metadata instead of prompt text:

- `StreamingResponseHandlerFactory` resolves the provider-aware tool schemas.
- `LLMUserMessageReadyEventHandler` sends them as the LLM request `tools`
  field.
- The default agent/server path does not emit `tool_choice`; lower-level direct
  LLM callers can still pass explicit `kwargs.tool_choice` for focused tests or
  specialized integrations.
- Native tool-result continuation uses an internal continuation event and
  structured `assistant.tool_calls` / `role: "tool"` history; it does not append
  the legacy aggregate tool-result text as another `role: "user"` message.

Key files:

- `src/agent/system-prompt-processor/tool-manifest-injector-processor.ts`
- `src/tools/usage/providers/tool-manifest-provider.ts`
- `src/tools/usage/registries/tool-formatting-registry.ts`
- `src/tools/usage/formatters/*`

### 3) Streaming Parsing (FSM)

Parsing is performed during streaming by the FSM-based `StreamingParser`.

- `StreamingResponseHandler` feeds chunks and emits `SegmentEvent`s.
- `ToolInvocationAdapter` converts completed tool segments into `ToolInvocation`.
- Parser strategies are selected by `AUTOBYTEUS_STREAM_PARSER`:
  - `xml`: XML tag detection.
  - `json`: JSON tool detection.
  - `sentinel`: explicit sentinel markers.
  - `api_tool_call`: disables tool-tag parsing (provider-native tool calls only).
  - Unset or invalid values default to `api_tool_call`.

`api_tool_call` is intentionally not a hybrid fallback mode. If an
OpenAI-compatible provider returns assistant text that looks like a legacy
`[TOOL_CALL] ...` payload but no native `tool_calls` were parsed, the text is
kept as assistant output and an `ApiToolCallTextDiagnostic` is emitted; the
framework does not execute that text through a legacy parser.

#### Provider-Aware JSON Parsing

JSON parsing is provider-aware to mirror the formatter registry:

- OpenAI-style formats (`tool_calls`, `tool`, `function`) use the OpenAI JSON parser.
- Gemini formats (`name` + `args`) use the Gemini JSON parser.
- Default JSON formats (`tool.function` + `parameters`) use the default parser.

The handler wires provider selection into `ParserConfig` by supplying:

- `json_tool_patterns`: signature patterns used by the JSON initialization state.
- `json_tool_parser`: the JSON parsing strategy to extract tool name + arguments.

This keeps JSON parsing aligned with provider-specific tool usage examples.

The parsing pipeline is representation-driven: any syntax that can be emitted
as a segment can become a tool call via the adapter. To add a new representation,
introduce a new segment type or strategy and register the mapping in
`src/agent/streaming/adapters/tool-syntax-registry.ts`.

Key files:

- `src/agent/streaming/handlers/streaming-response-handler.ts`
- `src/agent/streaming/parser/*`
- `src/agent/streaming/parser/json-parsing-strategies/*`

### 4) LLM Response Processing and Tool Invocation

Tool parsing is wired into the agent loop via the streaming handler:

- `LLMUserMessageReadyEventHandler` streams chunks through `StreamingResponseHandler`.
- Completed tool segments are converted into `ToolInvocation` objects.
- The handler enqueues `PendingToolInvocationEvent` entries once the stream is finalized.

**ID coupling guarantee:** the `ToolInvocation.id` for streamed tool calls is
**exactly the same** as the `segment_id` emitted by the streaming parser. This
means tool approval requests and UI segment rendering can be correlated without
any additional mapping.

Tool execution results are routed by `ToolResultEventHandler`. For native
API mode, the handler validates the active batch, invocation id, turn id, and
duplicate state before result processors can mutate memory. Multi-tool native
results keep their provider `tool_call_id` identity so continuation rendering can
match results to the original tool calls. The continuation shape then depends on
the selected mode:

- `api_tool_call`: enqueue `ToolContinuationReadyEvent` and render the current
  working context without appending a synthetic user message. Provider-visible
  history carries structured `assistant.tool_calls` plus matching `role: "tool"`
  messages only.
- `xml`, `json`, `sentinel`: preserve the aggregate textual
  `SenderType.TOOL` continuation message, because these parser modes do not
  have a provider-native `role: "tool"` channel.

Key files:

- `src/agent/handlers/llm-user-message-ready-event-handler.ts`
- `src/agent/streaming/handlers/streaming-response-handler.ts`
- `src/agent/tool-invocation.ts`
- `src/agent/handlers/tool-result-event-handler.ts`
- `src/agent/llm-request-assembler.ts`

### 5) Configuration and Overrides

- `AUTOBYTEUS_STREAM_PARSER` controls both the streaming parser strategy and
  the tool-call formatting override (`xml`, `json`, `sentinel`, `api_tool_call`).

- If `AUTOBYTEUS_STREAM_PARSER` is not set, the default is `api_tool_call`.
- `xml` selects XML parsing/formatting, `json` selects JSON parsing with
  provider-aware JSON signatures, `sentinel` selects the sentinel parser, and
  `api_tool_call` relies on provider-native tool-call schemas and stream events.
- The default agent/server path leaves provider `tool_choice` unset. Product-
  configurable tool choice is intentionally out of scope; direct lower-level LLM
  callers may pass explicit `kwargs.tool_choice` when they own that provider
  request shape.
- LM Studio uses structured OpenAI-compatible chat history in native API mode
  (`assistant.tool_calls` and `role: "tool"` messages). The legacy
  `[TOOL_CALL]` / `[TOOL_RESULT]` history text remains available only through
  `LMStudioTextToolHistoryRenderer` when an explicit text-parser mode is
  selected.

Key files:

- `src/agent/streaming/parser/parser-factory.ts`
- `src/utils/tool-call-format.ts`
- `src/agent/handlers/llm-user-message-ready-event-handler.ts`

## Design Patterns

- Strategy: Provider-specific formatters implement common interfaces.
- Registry + Singleton: Central mappings from provider -> formatter pair.
- Adapter: Segment events are adapted into uniform `ToolInvocation`.
- Factory: ToolRegistry constructs tool instances from ToolDefinition metadata.

## Extensibility Guidelines

To add a new provider format:

1. Implement a schema formatter + example formatter.
2. Register the pair in `ToolFormattingRegistry`.
3. Ensure the provider enum is defined in `LLMProvider`.

To add a new tool:

1. Create a `ToolDefinition` (argument/config schemas + description).
2. Register it in the tool registry.
3. The new tool will automatically appear in the manifest and be parseable.

## Notes and Caveats

- The streaming parser only interprets configured tag formats; unknown tags are streamed as text.
- For provider-native tool calls, set `AUTOBYTEUS_STREAM_PARSER=api_tool_call`
  and rely on the provider stream.
- Do not mix prompt-template tool syntax into native API mode. Native mode sends
  schemas through `tools`, sends prior tool history as provider-native
  structured messages where supported, and treats legacy-looking text as
  ordinary assistant text plus a diagnostic.
