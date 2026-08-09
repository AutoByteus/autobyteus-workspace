# Design Spec

## Current-State Read

The current runtime has one healthy default provider-native path and three legacy text-embedded paths selected by the process-global `AUTOBYTEUS_STREAM_PARSER` value.

For the default path, `LlmPhase` asks `StreamingResponseHandlerFactory` for a handler and provider tool schemas. Provider adapters receive those schemas through their SDK/API request, normalize streamed tool calls into `ChunkResponse.tool_calls`, and `ApiToolCallStreamingResponseHandler` turns the deltas into live `SegmentEvent`s and `ToolInvocation`s. `AgentTurnRunner` then executes tools and continues the same turn through ordered memory records and provider-native history. This path is the target authority for BEH-001 and BEH-003.

The legacy path is fragmented across lifecycle boundaries:

- `AgentConfig` decides whether to include a model-facing tool manifest when the agent config is constructed.
- provider constructors decide whether to use native or text tool-history renderers when an LLM instance is constructed;
- `StreamingResponseHandlerFactory` chooses native handling or the XML/JSON/sentinel parser for each LLM phase;
- tool-result ingestion and continuation resolve the same mutable environment setting again;
- the server and Settings UI can update the process-global value without rebuilding an existing agent's config or LLM renderer.

This means a supported setting update can split one agent across incompatible prompt, renderer, handler, and continuation modes. The text paths are also internally inconsistent: tool-specific XML formatters take precedence even under the JSON override, and no prompt formatter emits the sentinel parser's framing grammar. The complete evidence and quantitative removal surface are in the investigation notes and the removal-inventory supplement.

The target design must preserve the established native provider adapters, provider-specific native history, live file-content projections, tool execution/results, and no-tool pass-through behavior. It must not broaden the removal to unrelated XML context files, JSON Schema, queue sentinels, or internal lifecycle log labels.

## Intended Change

Make provider-native API tool calls the unconditional and sole model-to-tool transport:

1. Collapse handler setup to the real behavioral distinction: configured tools versus no configured tools.
2. Make the native handler own native delta accumulation and final invocation creation directly; remove the legacy-capable event-to-text parsing adapter.
3. Supply tool definitions only as provider API schemas and render tool history/results only through provider-native message contracts.
4. Collapse native result ingestion and same-turn continuation into one path.
5. Remove the global format resolver, parser FSM, text manifest/example infrastructure, text-history renderer variants, legacy public exports, server setting, and web control.
6. Remove text tool-history emulation from the AutoByteus conversation renderer; keep that provider chat/media-only until its API gains a native tool contract.
7. Discard the one obsolete managed environment value at the server configuration boundary and prevent it from being written back as a meaningful setting.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System / Contract | REQ-001–REQ-004; AC-001, AC-002, AC-005, AC-006 | Tool-equipped AutoByteus runtime agent using a provider that emits normalized native tool calls | Investigation `BEH-001`; native handler/schema/provider trace and focused test evidence | Preserve native schemas, identity, arguments, live events, execution, ordered results, and native continuation; remove format selection | Agent turn -> LLM phase -> native handler setup -> provider adapter -> native stream handler -> tool phase (`DS-001`, `DS-004`, `DS-005`) and result return (`DS-002`) |
| BEH-002 | User / Operational | REQ-001, REQ-005, REQ-007; AC-003, AC-004, AC-008, AC-009 | Settings UI, settings mutation API, or environment attempts to select a parser | Investigation `BEH-002`; server/web/config trace | Remove the control and all text execution. Retired managed config is discarded; arbitrary text remains assistant text | Settings page renders without parser card; server config initialization discards retired key (`DS-006`); normal agent flow has no selector (`DS-001`/`DS-003`) |
| BEH-003 | System | REQ-002–REQ-004; AC-002, AC-005, AC-006 | Completion of a native tool invocation batch in an active turn | Investigation `BEH-003`; continuation/memory/renderer trace | Make native ordered-batch ingestion and provider-native history unconditional; preserve context-file carrier behavior | Tool effect -> result pipeline -> continuation builder -> memory -> input pipeline -> request assembler -> native renderer/provider (`DS-002`) |
| BEH-004 | System | REQ-006; AC-007 | Agent has zero configured tools | Investigation `BEH-004`; pass-through handler source/tests | Preserve no-schema, no-invocation pass-through streaming | Agent turn -> LLM phase -> factory -> provider -> pass-through handler -> output/memory (`DS-003`, `DS-004`) |
| BEH-005 | Contract | REQ-007, REQ-008; AC-004, AC-010 | Package consumer imports root or broad subpaths | Investigation `BEH-005`; package index/export map | Remove legacy parser/formatter/selector files and exports with no aliases; retain segment events, native handler, tools, and native schema contracts | Compile-time/public package surface after removal; supported runtime paths remain `DS-001`–`DS-005` |
| BEH-006 | System / Contract | REQ-009; AC-011 | AutoByteus conversation provider renders normal messages | Investigation `BEH-006`; AutoByteus payload has only role/content/media and no native tools | Preserve ordinary content/media rendering; omit textual tool payload emulation | Agent no-tool turn -> `AutobyteusLLM` -> simplified `AutobyteusPromptRenderer` -> conversation API (`DS-003`) |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/legacy-tool-calling-removal-inventory.md` | Exact current legacy groups, cross-package controls, quantitative surface, and coverage/docs impact | REQ-002, REQ-005, REQ-007–REQ-009; AC-003, AC-004, AC-008–AC-011 | Supplies the exhaustive removal context summarized into the decommission/file sections below | Current evidence/context; approval N/A |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` / `Refactor` / `Cleanup`
- Current design issue found: `Yes`
- Root cause classification: `Legacy Or Compatibility Pressure`, `Duplicated Policy Or Coordination`, and `Boundary Or Ownership Issue`
- Refactor needed now: `Yes`
- Evidence: One mutable protocol policy is independently read by prompt construction, provider-renderer construction, handler construction, memory ingestion, continuation construction, server configuration, and UI. Valid JSON/sentinel selections do not have coherent prompt/parser pairing. The native handler also routes its own normalized events back through a legacy-capable invocation parser.
- Design response: Delete the protocol policy and legacy branches, retain one provider-native data path, make each remaining owner authoritative for one transformation, and remove cross-package controls/exports.
- Refactor rationale: XML-only deletion would leave the same distributed mode policy and most of the architectural complexity. Moving native invocation construction into the native stream owner removes the last dependency from valid native behavior to legacy parsing.
- Intentional deferrals and residual risk: Per-model native-tool capability discovery remains out of scope. An OpenAI-compatible/local model or AutoByteus conversation provider without native tool support will not invoke local tools and receives no text fallback. This is approved behavior, not a retained compatibility gap. External consumers of removed broad subpaths may break; no wrapper is permitted.

## Terminology

- **Provider-native tool call:** A structured tool/function call carried by the provider SDK/API and normalized into `ChunkResponse.tool_calls` / `ToolCallDelta`.
- **Text-embedded tool call:** XML, JSON-call text, sentinel framing, or legacy marker text emitted in assistant content and parsed locally. All such transports are removed.
- **Native history renderer:** A provider-specific renderer that maps canonical tool call/result memory to the provider's structured request contract.
- **Live file projection:** Incremental extraction of `path` and file `content`/`patch` from native argument deltas solely to emit responsive UI segment updates.

## Design Reading Order

Read the behavior map first, then the removal/data decisions, then `DS-001`/`DS-002` for the native tool loop, `DS-003` for no-tool providers, `DS-004`/`DS-005` for event/local stream behavior, and `DS-006` for obsolete configuration discard. The ownership and file sections derive from those spines.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete paths: XML/JSON/sentinel parser FSM and adapters; model-facing manifests/examples; text tool-history renderers; mode resolver/branches; XML tool rendering in the AutoByteus conversation renderer; stream-parser server/UI control; parser/formatter/public re-exports.
- No deprecated environment alias, hidden fallback parser, compatibility module, legacy export shim, or dual renderer remains.
- The only historical-key knowledge retained is the exact server-config discard/rejection rule required by the approved persisted-state outcome. It runs at the configuration boundary and never influences agent/runtime behavior.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Optional single `AUTOBYTEUS_STREAM_PARSER=<mode>` entry in `process.env` and server-managed `.env`; optional manually authored `ToolManifestInjector` string in an agent definition, though normal persistence strips mandatory processor names.
- Relevant code-model, serialization, semantic, or physical-store change: The parser setting and manifest processor cease to exist as current runtime/config contracts.
- Normal reader/writer behavior and representative evidence: `AppConfig.initialize()` loads environment/config data; `AppConfig.set()` updates process/config/file; `AppConfig.delete()` removes the exact key from all writable representations. Agent processor resolution already skips unavailable names with a warning.
- Required semantics and invariants under direct use: No parser value has remaining meaning. All unrelated server config and agent-definition fields must remain untouched.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: The value is a disposable non-sensitive scalar. No bulk data, downtime, or historical tool/memory rewrite is needed. An externally supplied read-only environment source may still declare the name, but the application removes/ignores it in-process and has no runtime reader.
- Decision: `Discard or Rebuild`
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: During `AppConfig.initialize()`, delete the exact retired key if present; reject subsequent `AppConfig.set()` attempts for that exact key. This is idempotent and uses the existing configuration owner. It prevents the value from reappearing as a misleading custom setting without introducing a migration subsystem, ledger, compatibility read, or unrelated file rewrite.
- Acceptance criteria or design constraints supported by this decision: REQ-005, REQ-008; AC-008, AC-009, AC-010.

### Migration Plan (Only When Decision Is `Migration Required`)

N/A. The approved outcome is `Discard or Rebuild`, and the disposable scalar is removed idempotently by its normal configuration owner.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | Supported agent turn trigger | Tool side effect / completed tool result | `AgentTurnRunner` | Full tool-equipped request path and primary target of the refactor |
| DS-002 | Return-Event | BEH-001, BEH-003 | Completed/denied/failed tool results | Next provider request with structured tool history/results | `AgentTurnRunner` with `MemoryManager` as history authority | Proves native continuation remains exactly once and no text continuation survives |
| DS-003 | Primary End-to-End | BEH-004, BEH-006 | Supported agent turn trigger with zero usable native tool calls | Assistant response/memory outcome | `AgentTurnRunner` | Preserves no-tool streaming and AutoByteus chat/media |
| DS-004 | Return-Event | BEH-001, BEH-004 | Provider stream chunk | External segment/output notification and memory outcome | `LlmPhase` | Preserves live text/reasoning/tool/file event observability |
| DS-005 | Bounded Local | BEH-001 | Normalized provider chunk within native handler | Final `ToolInvocation` plus segment lifecycle | `ApiToolCallStreamingResponseHandler` | Replaces the parser FSM with one bounded native aggregation flow |
| DS-006 | Primary End-to-End | BEH-002 | Server configuration initialization or retired-key write attempt | Current config with no effective parser setting | `AppConfig` | Prevents obsolete stored config/control from surviving the runtime removal |

## Primary Execution Spine(s)

- **DS-001 — Native tool execution:** `Supported Agent Trigger -> AgentTurnRunner -> LlmPhase -> StreamingResponseHandlerFactory -> Provider LLM Adapter / API -> ApiToolCallStreamingResponseHandler -> ToolPhase -> Tool Effect / Result`
- **DS-003 — No-tool response:** `Supported Agent Trigger -> AgentTurnRunner -> LlmPhase -> StreamingResponseHandlerFactory -> Provider LLM Adapter / API -> PassThroughStreamingResponseHandler -> Assistant Response / Memory`
- **DS-006 — Retired config discard:** `Server Startup -> AppConfig.initialize -> Environment/Config Load -> Exact Retired-Key Discard -> Current Server Config`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A turn resolves configured tools; the factory provides provider schemas plus the native handler; the provider adapter emits normalized deltas; the handler finalizes invocations; the turn runner executes them. | Agent turn, LLM phase, handler setup, provider adapter, native stream, tool phase | `AgentTurnRunner` | Tool schema formatting, provider delta converters, live segment notifier |
| DS-002 | Results are processed, ingested as one ordered native batch, converted into a native continuation input, projected by memory, and rendered into the next provider request. | Tool result batch, continuation, memory history, request assembly, provider renderer | `AgentTurnRunner`; `MemoryManager` owns canonical history | Context-file carrier messages, display summaries, provider message mapping |
| DS-003 | With no configured tools—or a provider that produces no native calls—the factory uses pass-through for the explicit no-tools case, and ordinary provider content becomes assistant output without local text parsing. | Agent turn, LLM phase, provider adapter, pass-through/native text output | `AgentTurnRunner` | Media rendering, token usage, interruption/failure reporting |
| DS-004 | Provider chunks are normalized, fed to the selected handler, and emitted as segment events through the notifier before final response/memory ingestion. | Provider chunk, handler, segment event, notifier, memory outcome | `LlmPhase` | Provider converter, external event transport |
| DS-005 | The native handler accumulates text and indexed tool deltas, incrementally projects file content for UI, closes segment lifecycles, parses final native argument JSON, and records one invocation per completed call. | Chunk, tool-call state, segment event, invocation | `ApiToolCallStreamingResponseHandler` | File content streamers, `ToolCallDelta`, `ToolInvocation` |
| DS-006 | Server config loads, deletes the exact obsolete key from in-memory/process/writable file state, and rejects later writes; settings listing therefore cannot restore a meaningful parser control. | Config load, retired-key rule, current config | `AppConfig` | Environment assignment line editor, generic settings service |

## Spine Actors / Main-Line Nodes

- `AgentTurnRunner`: same-turn lifecycle and LLM/tool/result loop.
- `LlmPhase`: one provider request/stream lifecycle and response/memory settlement.
- `StreamingResponseHandlerFactory`: handler/schema setup for a concrete LLM phase.
- Provider `BaseLLM` adapter: provider request construction and SDK result normalization.
- `ApiToolCallStreamingResponseHandler`: native stream aggregation, live segments, final invocation creation.
- `PassThroughStreamingResponseHandler`: no-tools content segments.
- `ToolPhase`: approved invocation execution sequencing.
- `ToolResultContinuationBuilder`: canonical native result-batch continuation construction.
- `MemoryManager`: canonical message/tool history and request projection.
- `AppConfig`: server config load/write/discard invariants.

## Ownership Map

| Main-Line Node | Owns | Explicit Non-Responsibility |
| --- | --- | --- |
| `AgentTurnRunner` | Turn state, repeated LLM/tool phases, active batch clearing, terminal outcome | Provider schema shapes, stream parsing, config selection |
| `LlmPhase` | One LLM request/stream, handler lifecycle, response/memory settlement | Choosing XML/JSON/sentinel modes, parsing assistant text into tools |
| `StreamingResponseHandlerFactory` | Tools/no-tools setup and association of provider schemas with the native handler | Provider SDK calls, text-format policy, parser construction |
| Provider LLM adapter | SDK/API request legality, native history request shape, native delta conversion | Local tool execution, parsing assistant text |
| `ApiToolCallStreamingResponseHandler` | Indexed native call state, segment lifecycles, final argument decoding, invocation creation | Provider SDK object parsing, tool schema lookup, tool execution |
| `PassThroughStreamingResponseHandler` | Ordinary text segment lifecycle | Tool detection |
| `ToolPhase` | Invocation approval/execution/result production | How the model expressed the call |
| `ToolResultContinuationBuilder` | Ordered result ingestion request and native continuation message | Selecting a transport mode |
| `MemoryManager` | Canonical native tool call/result records and safe request projection | Provider SDK transport |
| `AppConfig` | Current config data, writable environment file, retired-key rejection/discard | Agent protocol behavior |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Server settings GraphQL resolver | `ServerSettingsService` / `AppConfig` | Transport entry for generic current settings | Retired parser semantics or agent reconstruction |
| `StreamingResponseHandlerFactory.create()` | Factory is itself the setup owner; not merely a facade | Keeps construction detail out of `LlmPhase` | Provider call lifecycle or handler state |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Entire `src/agent/streaming/parser/` subtree | No assistant-text tool calls are supported | Native delta flow in `ApiToolCallStreamingResponseHandler` | In This Change | Remove index/public exports too |
| Legacy parsing adapters and schema coercion | Native args arrive through provider API JSON | Direct native handler finalization | In This Change | Remove `xmlArgumentSchemaResolver` from caller/factory |
| `ParsingStreamingResponseHandler` and wrapper | No parser-backed handler remains | Native handler or pass-through handler | In This Change | No deprecated wrapper |
| `tool-call-format.ts` and all mode branches | Only one tool protocol remains | Unconditional native behavior | In This Change | Remove root export/env read |
| Tool manifest injector/provider/registry/formatter pairs | Tools are supplied as provider API schemas | `ToolSchemaProvider` and three native schema formatters | In This Change | Remove mandatory processor registration |
| XML/text-call schema/examples and unused default/provider variants | They exist only for prompt text | Native schema formatters | In This Change | Keep JSON Schema used by APIs |
| Text tool-history renderers and selection file | Native history is unconditional | Direct provider native renderer constructors | In This Change | LM Studio inherits OpenAI chat renderer |
| AutoByteus XML tool payload rendering | Endpoint has no native tool contract | Ordinary content/media rendering only | In This Change | Do not substitute JSON text |
| Legacy continuation mode/source branches | Only native ordered batches remain | `NATIVE_API_TOOL_CONTINUATION_MODE` and native ingestion | In This Change | Keep `tool_history_only` request mode because it describes no-user-message continuation, not legacy transport |
| Legacy parser/formatter/package exports and `ToolDefinition` usage helpers | Removed implementations are not supported API | Direct segment/native/tool schema exports | In This Change | No aliases |
| Server stream-parser config definition and service registration | No runtime selector | `AppConfig` retired-key discard/rejection | In This Change | Generic settings remain |
| Web streaming parser card, translations, parent render | Control has no meaning | Settings basics without the card | In This Change | Coverage decisions downstream |
| Legacy-focused tests/docs | Their behavior is intentionally removed | Native/no-tool/API-only coverage and docs | In This Change, owned downstream | API/E2E investigates/edits tests; delivery syncs docs |

## Return Or Event Spine(s) (If Applicable)

- **DS-002 — Tool-result return:** `Tool Result Events -> ToolResultPipeline -> ToolResultContinuationBuilder -> MemoryManager -> AgentInputPipeline -> LLMRequestAssembler -> Provider-Native Renderer -> Provider API`
- **DS-004 — Live event return:** `Provider Stream -> Provider Delta Converter -> ChunkResponse -> Selected Streaming Handler -> SegmentEvent -> AgentExternalEventNotifier -> Server Event Transport / Consumer`

The first preserves model continuation correctness; the second preserves user-visible streaming independent of tool execution.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ApiToolCallStreamingResponseHandler`
- **DS-005:** `ChunkResponse -> Append Text / Merge Indexed ToolCallDelta -> Incremental File Projection -> Emit Segment Events -> Finalize Native Args -> Record ToolInvocation`
- Why it matters: This is the only remaining local stream state machine. It is bounded inside the native handler and consumes normalized API deltas, unlike the removed general assistant-text parser FSM.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `ToolSchemaProvider` | DS-001 | Handler factory/provider adapter | Resolve tool definitions and format provider API schemas | Provider APIs have three schema envelopes | `LlmPhase` would absorb provider policy |
| Provider schema formatters | DS-001 | `ToolSchemaProvider` | Anthropic/Gemini/OpenAI-compatible schema envelope mapping | Encapsulates provider shape differences | Tool definitions would contain transport fields |
| Provider tool-call converters | DS-001, DS-004 | Provider LLM adapters | Normalize SDK deltas into `ToolCallDelta` | Keeps native handler provider-neutral | Handler would depend on SDK objects |
| File content streamers | DS-004, DS-005 | Native handler | Incrementally project path/content for live file segments | Responsive UI during streamed JSON args | Projection could become a second invocation authority |
| Provider prompt/history renderers | DS-002, DS-003 | Provider LLM adapters | Map canonical messages to provider-native request messages | Native histories differ by provider | Memory would own provider transport |
| Segment notifier | DS-004 | `LlmPhase`/handler | Publish normalized live events | External observability | Tool execution would depend on UI transport |
| Context-file carrier handling | DS-002 | Continuation/input pipeline | Append a user/media carrier only when result context files exist | Provider APIs need a user content carrier for attachments | Tool results would be duplicated as synthetic text |
| Environment line editor | DS-006 | `AppConfig` | Remove exact assignment from writable `.env` | Idempotent discard of obsolete setting | Server settings service would manipulate files directly |

## Ownership Boundaries

- `AgentTurnRunner` is the turn authority. Its callers never select a tool transport.
- `LlmPhase` uses `StreamingResponseHandlerFactory` as the authoritative construction boundary. It must not call `ToolSchemaProvider` separately or instantiate handler internals.
- Provider LLM adapters are the authoritative boundary for SDK request/response shapes. They emit only normalized `ChunkResponse`; the native handler never imports provider SDK types.
- `ApiToolCallStreamingResponseHandler` owns the normalized native stream state. It may use file projectors internally but final invocation identity/context/arguments remain within this owner.
- `MemoryManager` owns canonical tool history. Provider renderers consume that history through request assembly; no renderer-specific history is stored as a parallel source of truth.
- `AppConfig` owns retired config discard/rejection. `ServerSettingsService` removes the predefined registration and does not carry agent runtime compatibility logic.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `StreamingResponseHandlerFactory.create` | Tool schema provider, tools/no-tools handler construction | `LlmPhase` | `LlmPhase -> ToolSchemaProvider` plus `LlmPhase -> handler constructor` | Extend factory result/options |
| Provider `BaseLLM.streamMessages` implementation | SDK request, native renderer, converter | `LlmPhase` | Handler consuming raw SDK deltas | Extend normalized `ChunkResponse`/`ToolCallDelta` |
| `ApiToolCallStreamingResponseHandler` | Indexed call state, file projectors, segment/invocation finalization | Factory / `LlmPhase` | External `ToolInvocationAdapter` reparsing handler events | Add an internal private method/state field |
| `MemoryManager` request projection | Canonical messages and provider-required native history | `LLMRequestAssembler` / provider renderers | Continuation builder generating `[TOOL_CALL]` text | Extend canonical message/history model |
| `AppConfig.initialize` / `set` | Loaded config, process env, writable file, retired-key set | Server startup/settings service | Settings UI/service directly editing `.env` for retired key | Add current config API, not runtime env readers |

## Dependency Rules

1. `AgentTurnRunner -> LlmPhase -> StreamingResponseHandlerFactory`; no parser/format setting dependency anywhere in this chain.
2. Factory may depend on `ToolSchemaProvider`, `ApiToolCallStreamingResponseHandler`, and `PassThroughStreamingResponseHandler` only.
3. Provider schema formatters depend on `ToolDefinition`/`ParameterSchema`; tool definitions must not depend on transport formatters.
4. Provider LLM adapters may depend on native renderers and provider converters; native handlers depend only on normalized response types.
5. Native handler may depend on file content streamers and `ToolInvocation`; it must not depend on parser states, XML coercion, default tool registry, or argument schema resolution.
6. Continuation/memory code may depend on canonical native tool records; it must not read an environment mode or render text tool protocols.
7. Server config/UI may not select an agent tool protocol. `AppConfig` may know the retired key only to discard/reject it.
8. No supported production code may import a removed parser, manifest, example formatter, text-history renderer, or tool-call-format module.

## Interface Boundary Mapping

| Interface / API / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `StreamingResponseHandlerFactory.create(options)` | One LLM-phase stream setup | Return handler plus tool schemas | `turnId`, explicit `toolNames[]`, provider enum, callbacks | Remove `agentId`, parser name/config, XML schema resolver if unused |
| `ToolSchemaProvider.buildSchema(toolNames, provider)` | Provider tool schema set | Map registered tools into provider request schemas | Tool names plus provider | Existing provider envelope behavior retained |
| `StreamingResponseHandler.feed(chunk)` | One normalized stream | Consume a `ChunkResponse` and emit events | Turn-scoped normalized chunk | No string overload/parser path |
| `ApiToolCallStreamingResponseHandler.finalize()` | Native call batch | Close events and record invocations | Indexed `ToolCallDelta` state with call IDs | Final JSON args are decoded once inside owner |
| `BaseLLM.streamMessages(messages, payload, kwargs, options)` | Provider request | Carry `kwargs.tools` and yield normalized chunks | Canonical messages, provider schemas, invocation options | Provider-specific implementation remains encapsulated |
| `ToolResultContinuationBuilder.build(events, {context, turn})` | One ordered native result batch | Ingest results and build continuation input | Active `turnId` and invocation IDs | No mode choice |
| `AppConfig.initialize()` | Current server config | Load, discard retired keys, initialize current config | Exact current config keys | Idempotent exact-key discard |
| `AppConfig.set(key, value)` | One config entry | Persist current keys; reject retired parser key | Explicit string key/value | Generic custom settings otherwise unchanged |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Handler factory `create` | Yes after branch removal | Yes | Low | Remove legacy/unused options |
| Tool schema provider | Yes | Yes | Low | Retain provider parameter; tighten formatter base type |
| Native handler `feed/finalize` | Yes | Yes | Low | Remove string/parser adapter behavior |
| Continuation builder | Yes after collapse | Yes | Low | Remove mode branches/constants |
| AppConfig current-key APIs | Yes | Yes | Low | Exact retired-key set; no fuzzy prefix handling |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Native stream owner | `ApiToolCallStreamingResponseHandler` | Yes | Low | Keep; “API tool call” is accurate without being a selectable format |
| Setup owner | `StreamingResponseHandlerFactory` | Yes | Low | Keep; reduce options/branches |
| API schema owner | `ToolSchemaProvider` | Yes | Low | Keep |
| No-tool handler | `PassThroughStreamingResponseHandler` | Yes | Low | Keep |
| Continuation request mode | `tool_history_only` | Yes | Medium confusion with removed text history | Keep because it means “no appended user message”; document as native request assembly mode |
| Removed selector type | `ToolCallFormat` | No longer valid | High if retained | Delete |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Provider schema mapping | `tools/usage` + `ToolSchemaProvider` | Reuse / tighten | Already owns native envelopes | N/A |
| Native delta normalization | `llm/converters` | Reuse | Existing provider-specific converters are healthy | N/A |
| Live file argument projection | `streaming/api-tool-call` | Reuse | Existing streamers preserve UI behavior | N/A |
| Native history rendering | `llm/prompt-renderers` | Reuse / simplify | Existing native renderers are authoritative | N/A |
| Obsolete setting discard | `AppConfig` | Extend | It already owns process/config/file state | N/A |
| New general parser/capability system | None | Do not create | Sole-path design needs less machinery, not a replacement abstraction | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent turn/LLM loop | Turn, phase, handler lifecycle, tool loop | DS-001–DS-004 | `AgentTurnRunner`, `LlmPhase` | Reuse / simplify | Remove format resolution |
| Streaming handlers | Native and no-tool stream projection | DS-001, DS-003–DS-005 | Factory, native/pass-through handlers | Reuse / contract | Delete parser subtree |
| LLM provider adapters | SDK transport, native renderers, delta normalization | DS-001–DS-004 | Provider LLM classes | Reuse / simplify | Direct renderer construction |
| Tool schema usage | Provider request schema objects | DS-001 | `ToolSchemaProvider` | Reuse / tighten | Delete examples/manifests/registries |
| Memory/continuation | Ordered native history and next request | DS-002 | `MemoryManager`, continuation builder | Reuse / simplify | One native mode |
| Server config | Current setting persistence and retired-key discard | DS-006 | `AppConfig` | Extend | No migration subsystem |
| Web settings | User controls for current server settings | BEH-002 | Basics panel | Reuse / contract | Delete parser card |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `streaming-handler-factory.ts` | Streaming handlers | Factory | Tools/no-tools handler setup and schema bundle | One construction decision | `StreamingHandlerResult` |
| `api-tool-call-streaming-response-handler.ts` | Streaming handlers | Native handler | Native state, events, invocation finalization | Cohesive bounded local stream owner | `ToolCallDelta`, file streamers |
| `pass-through-streaming-response-handler.ts` | Streaming handlers | No-tool handler | Text-only segment lifecycle | Separate behavior/invariants | `SegmentEvent` |
| `tool-schema-provider.ts` | Tool schemas | Provider | Registry lookup and provider formatter choice | Singular API schema concern | Provider formatter interface |
| `base-formatter.ts` | Tool schemas | Formatter contract | Only `BaseSchemaFormatter`/schema provide contract | Retained shared type after example/XML removal | `ToolDefinition` |
| Provider native prompt renderers | LLM adapters | Provider renderer | Structured history message mapping | Provider contracts differ | Canonical messages |
| `tool-result-continuation-builder.ts` | Continuation | Builder | Native ordered result continuation | One batch outcome | Continuation metadata |
| `app-config.ts` | Server config | `AppConfig` | Load/current settings/retired exact-key discard | Existing config authority | Environment line helpers |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Provider-neutral native call deltas | Existing `llm/utils/tool-call-delta.ts` | LLM provider adapters | All native adapters and handler share identity/args/context | Yes, already normalized | Yes | A container for text-parser fields |
| Stream segment contract | Existing `streaming/segments/segment-events.ts` | Streaming | Native/pass-through/external consumers share events | Yes | Yes after parser event re-export removal | Tool invocation source of truth |
| Tool schema formatter interface | Tightened `tools/usage/formatters/base-formatter.ts` | Tool schemas | Three provider schema adapters share `provide(ToolDefinition)` | Remove example/XML interfaces | Yes | A generic prompt formatter hierarchy |
| Retired config keys | Local constant/set in `app-config.ts` | Server config | One current configuration invariant | N/A | N/A | A compatibility/migration framework |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `ToolCallDelta` | Yes | Yes | Low | Keep API-native only |
| `SegmentEvent` | Yes | Yes | Low | Export directly from segment owner, not parser index |
| `BaseSchemaFormatter` | Yes after change | Yes | Low | Remove `UsageFormatter`, example, and XML base contracts |
| `ToolContinuationMode` | Yes after change | Yes | Low | Retain only native value; no legacy union member |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/streaming/handlers/streaming-handler-factory.ts` | Streaming | Factory | Construct native/tool-schema or no-tool setup | Single setup authority | Yes |
| `.../api-tool-call-streaming-response-handler.ts` | Streaming | Native handler | Normalize one native stream into events/invocations | Bounded stream state belongs together | Yes |
| `.../pass-through-streaming-response-handler.ts` | Streaming | Pass-through handler | No-tools text segments | Separate invariant | Yes |
| `.../streaming/segments/segment-events.ts` | Streaming contract | Event model | Supported public segment event types | Existing canonical owner | N/A |
| `autobyteus-ts/src/tools/usage/providers/tool-schema-provider.ts` | Tool schemas | Schema provider | Tool lookup + provider envelope selection | Existing coherent owner | Yes |
| `.../usage/formatters/base-formatter.ts` | Tool schemas | Schema contract | Provider schema formatter interface only | Small shared contract | Yes |
| `anthropic/gemini/openai-json-schema-formatter.ts` + normalizer | Tool schemas | Provider schema adapters | Native API schema mapping | Provider differences justify separate files | Yes |
| `autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts` | Continuation | Builder | Native ordered result continuation | One batch concern | Yes |
| `autobyteus-ts/src/agent/message/tool-continuation-metadata.ts` | Continuation contract | Metadata | Native continuation marker | Stable cross-pipeline marker | N/A |
| Provider API classes + native renderers | LLM adapters | Provider owners | Direct native renderer/API behavior | Existing provider boundaries | Yes |
| `autobyteus-ts/src/llm/prompt-renderers/autobyteus-prompt-renderer.ts` | AutoByteus adapter | Renderer | Ordinary content/media payload only | Matches endpoint contract | Yes |
| `autobyteus-server-ts/src/config/app-config.ts` | Server config | `AppConfig` | Exact obsolete-key discard/rejection | Current config boundary | Yes |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Server settings | Service | Current predefined/custom settings only | Remove parser knowledge | `AppConfig` |
| `autobyteus-web/components/settings/ServerSettingsBasicsPanel.vue` | Web settings | Basics panel | Render remaining current setting cards | Remove obsolete card | Existing cards |

## Applied Patterns (If Any)

- **Provider adapter normalization:** SDK-specific tool calls become `ToolCallDelta` before entering agent streaming.
- **Bounded local stream state:** Native indexed call accumulation stays inside `ApiToolCallStreamingResponseHandler`.
- **Projection, not authority:** File content streamers exist for live UI projection; final native argument payload governs invocation semantics.
- **Schema adapter:** `ToolSchemaProvider` selects a provider envelope without leaking provider fields into `ToolDefinition`.
- **Exact-key discard:** `AppConfig` disposes a tiny obsolete setting idempotently without a general migration subsystem.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/streaming/handlers/` | Folder | Streaming handler boundaries | Base, factory, native, pass-through handlers | Existing handler depth remains clear | Parser states/format selection |
| `autobyteus-ts/src/agent/streaming/api-tool-call/` | Folder | Native handler internals | File argument projection utilities | Internal to native handler behavior | XML/sentinel parsing |
| `autobyteus-ts/src/agent/streaming/segments/` | Folder | Stream event contract | Canonical segment events | Direct public owner after parser removal | Parser aliases |
| `autobyteus-ts/src/tools/usage/providers/` | Folder | Tool schema provider | Provider schema selection | Existing location is coherent after manifest provider deletion | Prompt manifests |
| `autobyteus-ts/src/tools/usage/formatters/` | Folder | Provider schema adapters | Only native schema formatters/base contract | Keeping established paths avoids unrelated native API churn | Examples, XML/text formatters, registries |
| `autobyteus-ts/src/llm/prompt-renderers/` | Folder | Provider adapters | Native structured message renderers | One renderer per provider contract | Text fallback variants/selector |
| `autobyteus-ts/src/agent/streaming/parser/` | Folder | N/A | Delete | No supported owner remains | Anything retained |
| `autobyteus-ts/src/agent/streaming/adapters/` | Folder | N/A after adapter deletion | Delete if empty | Invocation creation moves to native handler | Compatibility adapter |
| `autobyteus-server-ts/src/config/app-config.ts` | File | `AppConfig` | Retired exact-key discard/rejection plus current config | Normal config authority | Agent tool protocol selection |
| `autobyteus-web/components/settings/StreamingParserCard.vue` | File | N/A | Delete | Obsolete user control | Disabled placeholder |

The target remains relatively flat inside each established capability area because the surviving responsibilities are small and already separated by provider/handler concern. A new “tool protocol” subsystem would be empty indirection after removing alternative protocols.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent/streaming/handlers` | Main-Line Domain-Control | Yes | Low | Handler lifecycle owners only after parser removal |
| `agent/streaming/api-tool-call` | Off-Spine Concern | Yes | Low | File projection utilities serve native handler |
| `agent/streaming/segments` | Mixed Justified contract | Yes | Low | Shared event model used by native/pass-through/external event flow |
| `tools/usage` | Off-Spine Concern | Yes after contraction | Medium | Remove manifest/example/registry branches; retain only API schemas |
| `llm/prompt-renderers` | Persistence-Provider / provider adaptation | Yes | Low | Native request shape per provider |
| `server-ts/src/config` | Main-Line Domain-Control for config | Yes | Low | Exact discard belongs in config authority |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Handler setup | `toolNames.length ? nativeHandler + providerSchemas : passThrough + null` | `resolve env -> xml/json/sentinel/api registry -> prompt/parser/history branches` | Shows the only real behavior split |
| Native boundary | `SDK delta -> provider converter -> ToolCallDelta -> native handler` | Native handler importing OpenAI/Anthropic/Gemini SDK objects | Preserves provider-neutral runtime |
| Invocation authority | `accumulatedArgs -> JSON decode -> ToolInvocation`; file streamer emits UI deltas | Emit segment text -> generic adapter guesses XML/JSON -> ToolInvocation | Eliminates re-parsing of the handler's own output |
| Text-like assistant output | `chunk.content = '<tool ...>' -> TEXT segment only` | Hybrid fallback executes text when native call count is zero | Enforces API-only security/behavior boundary |
| Retired config | `AppConfig.initialize -> delete exact retired key`; `set` rejects it | Keep resolver returning `api_tool_call` for old values | Removes compatibility reads and misleading controls |

Short target factory shape:

```ts
if (toolNames.length === 0) {
  return { handler: new PassThroughStreamingResponseHandler(...), toolSchemas: null };
}
return {
  handler: new ApiToolCallStreamingResponseHandler(...),
  toolSchemas: buildToolSchemas(toolNames, provider),
};
```

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `AUTOBYTEUS_STREAM_PARSER` but always resolve API | Avoid breaking env/scripts | Rejected | Delete runtime resolver/export; discard/reject managed key |
| Leave parser modules exported but unused | External import compatibility | Rejected | Delete files/exports; release-note break |
| XML-only removal while keeping JSON/sentinel | Narrower initial diff | Rejected | Remove all text transports because they share the same bad boundary |
| Hybrid native-first then parse assistant text | Help models without native support | Rejected | Text remains assistant output; unsupported model has no local tools |
| Keep text history for provider switching/AutoByteus | Preserve historical context | Rejected | Native renderers only; AutoByteus chat/media contains ordinary content only |
| Keep disabled Settings card | Explain removal to users | Rejected | Remove card/translations; documentation/release notes explain change |
| Deprecated `ToolManifestInjector` no-op processor | Old definition compatibility | Rejected | Remove registry entry/class; unexpected old explicit names are unavailable and skipped |

## Derived Layering (If Useful)

`Agent Turn Control -> Stream Setup -> Provider Adapter -> Normalized Native Stream -> Tool Execution -> Canonical Memory/Continuation`

This is descriptive only. Dependency direction is governed by the ownership/boundary rules above; in particular, turn control cannot bypass setup and normalized streams cannot depend backward on SDK types.

## Change / Refactor Sequence

1. Refactor `ApiToolCallStreamingResponseHandler` to record native invocations directly and remove its dependency on the legacy-capable `ToolInvocationAdapter`. Preserve live text/file segments and native context.
2. Simplify `StreamingResponseHandlerFactory` and `LlmPhase` to the tools/no-tools split; remove parser config, parser-name resolution, schema resolver, and unused factory options.
3. Collapse `AgentConfig`, tool-result ingestion, continuation metadata/builder, and input-boundary descriptions to unconditional native behavior.
4. Change provider constructors to instantiate native renderers directly; remove selector/text renderers. Simplify `AutobyteusPromptRenderer` to ordinary content/media with no tool text emulation.
5. Tighten tool schema files to only the three provider API schema adapters and their base contract. Remove text usage/example methods from `ToolDefinition` and formatter registry exports.
6. Delete parser/adapters/manifests/examples/text-history/format resolver source and all root/nested re-exports. Export `SegmentEvent` directly from its canonical `segments` file.
7. Remove stream-parser server definition/registration and mandatory manifest processor startup expectation. Extend `AppConfig` with exact-key discard/rejection.
8. Delete the web parser card and parent/translations references.
9. Run package build/typecheck and implementation-scoped checks. Use repository-wide searches to prove no production legacy identifiers remain and no unrelated XML/sentinel concepts were removed.
10. After code review, `api_e2e_engineer` performs the required coverage investigation, updates/removes stale durable tests, executes native/no-tool/config/UI scenarios, and routes any durable test edits back to code review.
11. Delivery refreshes the branch and rewrites/retires durable docs against the integrated API-only state.

No temporary compatibility seam is permitted. Intermediate commits may not build, but the handed-off implementation must contain only the target path.

## Key Tradeoffs

- **Large deletion vs smaller XML-only diff:** Larger removal produces one coherent boundary and eliminates most complexity; XML-only would not solve the root cause.
- **Breaking legacy exports vs wrappers:** Breakage is accepted to prevent permanent support obligations and hidden fallback behavior.
- **Unsupported models lose text fallback:** Reliability and architectural truth are preferred over locally invented model protocols.
- **Keep established native file paths vs move every survivor:** Retaining native schema paths/classes avoids unrelated churn; contraction makes the existing folder coherent enough.
- **Exact config tombstone vs leave stale custom setting:** A tiny current-boundary discard/rejection prevents misleading UI/config state without reintroducing runtime compatibility.

## Risks

- External consumers may import removed parser/formatter subpaths; release notes must call out the break.
- Mixed native file-argument streaming must not regress when the shared adapter is removed. The handler must continue emitting the same path/content segment lifecycles and preserve native call IDs/context.
- Provider-native result history differs by provider; direct constructor changes must retain current native renderer classes exactly.
- AutoByteus conversation histories containing canonical tool payloads will no longer receive a text rendering. This is approved but should be explicit in docs.
- Over-broad search-and-delete could remove unrelated XML context files, queue sentinel behavior, provider JSON schemas, or internal logs; implementation verification must guard them.
- Retired config discard must target the exact key only and must not fail server startup merely because an external environment source is not writable.

## Guidance For Implementation

- Treat the removal inventory as a candidate checklist, not a blind glob deletion. Trace imports after each responsibility moves.
- In the native handler, separate `emitEvent(event)` from `recordInvocation(invocation)` so event publication no longer implicitly reparses events.
- Decode final accumulated provider argument JSON once per call. Preserve the current valid-call semantics for generic, write, and edit tools; do not add assistant-text recovery.
- Keep `WriteFileContentStreamer` / `EditFileContentStreamer` for live projections. Their output must not create a second persistent argument representation.
- Remove `buildToolArgumentSchemaResolver()` if it has no caller after adapter removal; retain `resolveTurnToolNames()`.
- Keep the request mode name `tool_history_only` and native metadata value if they remain useful to the input/request pipeline; remove only the legacy continuation union member and branches.
- Simplify `base-formatter.ts` to a native schema formatter contract and ensure `OpenAiJsonSchemaFormatter` implements the same type as Anthropic/Gemini.
- In `AppConfig.initialize()`, perform exact retired-key discard after config data is loaded and before consumers list settings. Make repeat execution harmless; make `set()` reject the exact retired key.
- Do not create a `Legacy`, `Compatibility`, `ToolProtocolManager`, or new generic abstraction folder.
- Before handoff, run repository-wide production-source searches for `AUTOBYTEUS_STREAM_PARSER`, `resolveToolCallFormat`, parsing handler/parser exports, `ToolManifestInjector`, `TextToolHistoryRenderer`, and XML tool formatters. Any remaining match must be an approved doc/test awaiting downstream ownership or unrelated terminology, not production behavior.
