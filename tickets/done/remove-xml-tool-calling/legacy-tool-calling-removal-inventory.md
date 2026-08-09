# Legacy Tool-Calling Removal Inventory

## Status And Purpose

- Status: Investigation evidence / design context
- Approval applicability: N/A; this file inventories current code and candidate cleanup. The requirements doc remains authoritative for intended behavior.
- Scope: Model-facing text-embedded tool invocation in XML, JSON, and sentinel formats; related selection, prompting, parsing, history rendering, configuration, exports, tests, and documentation.
- Exclusion: XML as an unrelated context-file type, ordinary JSON schemas used by provider APIs, queue sentinels, and internal log labels such as `[TOOL_CALL]` are not legacy invocation transports.

## Evidence Summary

- `api_tool_call` is the current default in `autobyteus-ts/src/utils/tool-call-format.ts`.
- The server and web application nevertheless expose a live XML/API switch. The XML path is therefore reachable, even though repository evidence does not establish how frequently users select it.
- Selection policy is read independently during agent-config construction, provider-renderer construction, streamed-response handler creation, tool-result ingestion, and continuation building. A process-global update can therefore make one existing agent use mismatched prompt, renderer, handler, and continuation modes.
- Text-mode prompt and parser contracts are not coherent across every advertised value:
  - `json` selects the JSON parser, but `ToolFormattingRegistry.getFormatterPairForTool()` gives tool-specific `write_file` and `edit_file` XML formatters precedence over the global override.
  - `sentinel` selects a sentinel parser, while the manifest registry supplies default JSON/XML examples rather than the parser's `[[SEG_START ...]] ... [[SEG_END]]` grammar.
- `AutobyteusLLM`'s conversation endpoint currently forwards only role/content/media payloads, ignores `kwargs.tools`, and emits no normalized `tool_calls`. Its XML rendering is text-history emulation, not a provider-native tool channel.
- No non-test source outside `autobyteus-ts` imports the legacy parser/formatter classes directly. `autobyteus-server-ts` imports the tool-call-format contract only to expose the setting.

## Candidate Source Removal

The following groups are legacy-only and can be deleted rather than wrapped. The exact durable-test edit decision belongs to the later API/E2E coverage investigation.

### Text Streaming Parser And Adapters

- Entire `autobyteus-ts/src/agent/streaming/parser/` subtree.
- `autobyteus-ts/src/agent/streaming/handlers/parsing-streaming-response-handler.ts`
- `autobyteus-ts/src/agent/streaming/parsing-streaming-response-handler.ts`
- Legacy parsing responsibilities in `autobyteus-ts/src/agent/streaming/adapters/`:
  - `invocation-adapter.ts` (replace with direct provider-native invocation finalization in the native handler)
  - `tool-call-parsing.ts`
  - `tool-syntax-registry.ts`
  - `xml-schema-coercion.ts`
- `autobyteus-ts/src/utils/tool-call-format.ts`
- `autobyteus-ts/src/agent/streaming/handlers/api-tool-call-text-diagnostic.ts` (unreferenced dead diagnostic whose only purpose is detecting a legacy text marker)

### Model-Prompt Tool Manifests And Example Formatters

- `autobyteus-ts/src/agent/system-prompt-processor/tool-manifest-injector-processor.ts`
- `autobyteus-ts/src/tools/usage/providers/tool-manifest-provider.ts`
- `autobyteus-ts/src/tools/usage/registries/tool-formatting-registry.ts`
- `autobyteus-ts/src/tools/usage/registries/tool-formatter-pair.ts`
- `autobyteus-ts/src/tools/utils.ts`
- XML schema/example formatters under `autobyteus-ts/src/tools/usage/formatters/`.
- JSON/XML example formatters and default text-call schema formatters under the same folder.
- Provider-native schema formatters remain: Anthropic, Gemini, and OpenAI schema adapters plus the OpenAI schema normalizer. Their folder/interface can be tightened after text-format abstractions are removed.

### Text Tool-History Renderers

- `autobyteus-ts/src/llm/prompt-renderers/*-text-tool-history-renderer.ts`
- `autobyteus-ts/src/llm/prompt-renderers/text-tool-history-format.ts`
- `autobyteus-ts/src/llm/prompt-renderers/tool-payload-format.ts`
- `autobyteus-ts/src/llm/prompt-renderers/provider-tool-history-renderer-selection.ts`
- XML tool-call/history rendering helpers inside `autobyteus-ts/src/llm/prompt-renderers/autobyteus-prompt-renderer.ts`

### Runtime And Public Compatibility Surface

- Mode branches and imports in:
  - `autobyteus-ts/src/agent/context/agent-config.ts`
  - `autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts`
  - `autobyteus-ts/src/agent/message/tool-continuation-metadata.ts`
  - `autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts`
  - `autobyteus-ts/src/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.ts`
  - provider constructors under `autobyteus-ts/src/llm/api/`
- Parser, text renderer, formatter registry, manifest injector, and format resolver exports in package `index.ts` files.
- `ToolDefinition.getUsageXml()`, `getUsageXmlExample()`, and text-manifest-oriented JSON usage/example convenience methods.
- No alias modules, deprecated exports, environment fallback, or compatibility shims are proposed.

### Server And Web Configuration

- `autobyteus-server-ts/src/config/stream-parser-setting.ts`
- Stream-parser registration/validation in `autobyteus-server-ts/src/services/server-settings-service.ts`
- `ToolManifestInjector` startup-registration requirement in `autobyteus-server-ts/src/startup/agent-customization-loader.ts`
- `autobyteus-web/components/settings/StreamingParserCard.vue`
- Parent-card import/rendering and English/Chinese localization keys.
- The removed setting key must be treated as retired config: discard any managed stored value and reject it as a future managed setting instead of allowing it to reappear as a meaningful custom control.

## Candidate Structural Modification

- Keep `StreamingResponseHandlerFactory` as the construction owner, but reduce it to only:
  - no configured tools -> `PassThroughStreamingResponseHandler`, no schemas;
  - configured tools -> `ApiToolCallStreamingResponseHandler`, provider-native schemas.
- Remove `xmlArgumentSchemaResolver`, JSON parsing profiles, parser-name resolution, and global-format reads from the factory and `LlmPhase`.
- Make `ApiToolCallStreamingResponseHandler` construct each `ToolInvocation` directly from the final accumulated provider argument JSON and normalized native context. Retain specialized incremental file-content projection only for live segment UX; it must not become the authoritative argument parser.
- Provider LLM constructors instantiate their native history renderer directly.
- `AgentConfig` defaults only to still-valid system-prompt processors; tools are described through provider API schemas, not a generated model-facing manifest.
- Tool-result ingestion and continuation always use the native ordered-batch/history contract.

## Quantitative Candidate Surface

- 74 obvious source files are deletion candidates, totaling approximately 5,469 lines in the current checkout. This count includes `invocation-adapter.ts`, whose legacy implementation is expected to disappear while its small native responsibility moves into the native handler.
- 37 obvious parser/XML/manifest-focused test files total approximately 5,073 lines. Additional mixed-mode assertions exist in otherwise-valid native test files.
- These figures demonstrate the simplification opportunity; they are not implementation quotas and do not authorize removing valid native coverage.

## Documentation Impact Inventory

Primary current docs requiring retirement or API-only rewrite:

- `autobyteus-ts/docs/tool_call_formatting_and_parsing.md`
- `autobyteus-ts/docs/streaming_parser_design.md`
- `autobyteus-ts/docs/api_tool_call_streaming_design.md`
- `autobyteus-ts/docs/api_tool_call_file_streaming_design.md`
- `autobyteus-ts/docs/tool_schema_and_configuration.md`
- `autobyteus-ts/docs/llm_module_design.md`
- `autobyteus-ts/docs/llm_module_design_nodejs.md`
- `autobyteus-ts/docs/agent_processor_and_engine_design.md`
- `autobyteus-ts/docs/agent_runtime_loop_and_interrupt.md`
- `autobyteus-ts/docs/lifecycle_event_sourced_engine_design.md`
- `autobyteus-ts/docs/turn_terminology.md`
- `autobyteus-server-ts/docs/modules/agent_team_execution.md`

Delivery owns the final documentation sync against the integrated implementation.

## Coverage Impact Inventory

- Parser state-machine, XML coercion, JSON text-signature, sentinel, manifest formatter, text-history renderer, format resolver, server setting, and XML settings-card coverage becomes stale if the API-only requirement is approved.
- Provider-native schema conversion, tool delta conversion, API streaming handler behavior, tool execution, ordered results, continuation history, no-tools pass-through behavior, and context-file continuations remain valid and should be retained or expanded.
- The later `api_e2e_engineer` must produce the mandatory coverage investigation before editing/removing these durable tests.
