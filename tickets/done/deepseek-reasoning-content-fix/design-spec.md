# Design Spec

## Current-State Read

DeepSeek thinking-mode responses enter through `DeepSeekLLM`, which inherits `OpenAICompatibleLLM`. `OpenAICompatibleLLM` already extracts provider-side `reasoning_content`/`reasoning` from responses into internal `ChunkResponse.reasoning` and `CompleteResponse.reasoning`.

For normal assistant replies, `MemoryManager.ingestAssistantResponse(...)` appends a `MessageRole.ASSISTANT` message with `reasoning_content` through `WorkingContextSnapshot.appendAssistant(...)`.

For tool-call replies, the current source path differs:

`DeepSeek stream -> OpenAICompatibleLLM -> LLMUserMessageReadyEventHandler -> ApiToolCallStreamingResponseHandler -> MemoryManager.ingestToolIntents -> WorkingContextSnapshot.appendToolCalls -> LLMRequestAssembler -> OpenAIChatRenderer -> provider request`

`LLMUserMessageReadyEventHandler` accumulates assistant content and reasoning while parsing tool calls. When parsed tool calls exist, the final `CompleteResponse` is intentionally not appended to the working context (`appendToWorkingContext: parsedToolInvocationCount === 0`), so the assistant tool-call message created by `WorkingContextSnapshot.appendToolCalls(...)` must preserve the assistant envelope itself. Otherwise DeepSeek's continuation request loses `reasoning_content` before rendering.

Separately, `reasoning_content` is not a universal OpenAI chat field. The current default `OpenAICompatibleLLM` constructor creates `new OpenAIChatRenderer()`, and `DeepSeekLLM` currently inherits that renderer. Emitting `reasoning_content` unconditionally from `OpenAIChatRenderer` can break strict OpenAI-compatible providers. The design must therefore make the internal memory preservation provider-neutral while making external `reasoning_content` emission explicit DeepSeek renderer selection.

## Intended Change

- Preserve assistant `content` and `reasoning_content` provider-neutrally on working-context assistant tool-call messages.
- Add a concrete provider-gating seam: a named `DeepSeekChatRenderer` under `src/llm/prompt-renderers/` that extends the generic OpenAI-compatible renderer and owns DeepSeek `reasoning_content` emission.
- Keep default `OpenAIChatRenderer` rendering non-emitting for generic OpenAI-compatible providers.
- Configure `DeepSeekLLM` to opt in by assigning `this._renderer = new DeepSeekChatRenderer()` after `super(...)`.
- Add deterministic tests for default non-emission, explicit renderer selection, actual `DeepSeekLLM` renderer selection, actual default OpenAI-compatible client non-emission, and memory-to-render tool-continuation preservation.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, targeted boundary/API tightening.
- Evidence: `WorkingContextSnapshot.appendAssistant(...)` preserves reasoning for normal assistant replies, but the tool-call append path needs assistant envelope support. Current base renderer pass-through is too broad unless moved behind a DeepSeek-specific renderer. Current code has a provider renderer override precedent in `LMStudioLLM`.
- Design response: Extend the memory tool-intent path with explicit assistant envelope options; keep the base renderer non-emitting; add `DeepSeekChatRenderer`; select it only from `DeepSeekLLM`.
- Refactor rationale: A renderer-only patch misses the tool-call memory source of truth, and unconditional base renderer emission violates provider boundary ownership for generic OpenAI-compatible clients. A named DeepSeek renderer puts provider-specific payload policy behind the provider boundary.
- Intentional deferrals and residual risk, if any: Custom OpenAI-compatible endpoints that require DeepSeek-style reasoning replay are deferred until there is an explicit provider capability/configuration design. Raw trace reasoning persistence is deferred because working-context continuity is the in-scope provider contract.

## Terminology

- `Assistant envelope`: the assistant `content` and `reasoning_content` associated with the same assistant response as optional `tool_calls`.
- `Provider reasoning replay`: emitting DeepSeek's `reasoning_content` extension field back to a provider request.
- `DeepSeekChatRenderer`: the provider-specific renderer variant that owns DeepSeek reasoning replay emission.
- `Default OpenAI-compatible path`: `OpenAICompatibleLLM`, `OpenAICompatibleEndpointLLM`, and provider clients that instantiate the generic `OpenAIChatRenderer`.

## Design Reading Order

1. Data-flow spine.
2. Memory ownership and provider rendering ownership.
3. Exact provider-gating API/file mapping.
4. Migration and validation sequence.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Supersede the old renderer-only and unconditional-base-renderer implementation/handoff.
- Treat removal as first-class design work: implementation must remove/replace unconditional `reasoning_content` attachment from the generic `OpenAIChatRenderer` and move that emission into `DeepSeekChatRenderer`.
- Decision rule: no request-builder fallback, raw-trace recovery, DeepSeek-specific memory branch, or default universal OpenAI-compatible `reasoning_content` emission.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | DeepSeek thinking-mode tool-call stream | DeepSeek continuation request includes assistant `tool_calls` plus `reasoning_content` | `MemoryManager`/`WorkingContextSnapshot` for history; `DeepSeekLLM`/`DeepSeekChatRenderer` for provider emission | Failing user scenario. |
| DS-002 | Primary End-to-End | DeepSeek thinking-mode non-tool response | DeepSeek later request includes assistant `reasoning_content` | `WorkingContextSnapshot`; `DeepSeekLLM` with `DeepSeekChatRenderer` | Ordinary multi-turn reasoning replay. |
| DS-003 | Primary End-to-End | Default OpenAI-compatible client with internal reasoning in memory | Provider request omits `reasoning_content` | Generic `OpenAIChatRenderer` | Prevents regressions for other OpenAI-compatible LLMs. |
| DS-004 | Return-Event | Provider stream chunks | Runtime reasoning segment and accumulated assistant envelope | `LLMUserMessageReadyEventHandler` | Handler owns the moment where reasoning and tool-call identity coexist. |
| DS-005 | Bounded Local | Tool-call deltas | Parsed `ToolInvocation[]` | `ApiToolCallStreamingResponseHandler` | Parser stays focused on tool calls, not reasoning replay policy. |

## Primary Execution Spine(s)

- DS-001: `DeepSeek API stream -> OpenAICompatibleLLM extraction -> LLMUserMessageReadyEventHandler accumulators -> MemoryManager.ingestToolIntents(envelope) -> WorkingContextSnapshot assistant tool-call Message -> LLMRequestAssembler -> DeepSeekLLM configured DeepSeekChatRenderer -> DeepSeek API continuation`
- DS-003: `Internal Message(reasoning_content present) -> default OpenAICompatibleLLM/OpenAIChatRenderer -> provider request without reasoning_content`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | DeepSeek streams reasoning and tool-call deltas. The handler accumulates content/reasoning while the parser accumulates invocations. The handler passes the assistant envelope into memory when ingesting tool intents. Working context stores one assistant tool-call message with content, reasoning, and tool payload. `DeepSeekChatRenderer` emits the reasoning extension on continuation. | Provider stream, turn handler, memory manager, working context, assembler, DeepSeek renderer | Memory governs canonical history; `DeepSeekLLM`/`DeepSeekChatRenderer` governs provider-specific output. | Runtime UI reasoning segments, raw traces, parser internals. |
| DS-002 | DeepSeek returns a normal assistant reply with reasoning. Memory stores it on the assistant message. `DeepSeekChatRenderer` emits the field later. | Provider response, memory manager, working context, DeepSeek renderer | Working context + `DeepSeekChatRenderer` | Response extraction. |
| DS-003 | A generic OpenAI-compatible client may carry internal reasoning from memory, but generic `OpenAIChatRenderer` never emits the DeepSeek extension field, so the provider request omits it. | Internal message, generic renderer, provider request | Generic `OpenAIChatRenderer` | Future provider-specific renderer/capability configuration. |
| DS-004 | Reasoning chunks are emitted to runtime observers and accumulated for final memory handoff. | Chunk stream, handler accumulators, segment emitter | `LLMUserMessageReadyEventHandler` | Segment identity. |
| DS-005 | Tool-call deltas are grouped into invocations. | Tool deltas, active parser state, invocations | `ApiToolCallStreamingResponseHandler` | Tool-specific segment streamers. |

## Spine Actors / Main-Line Nodes

- `OpenAICompatibleLLM`
- `DeepSeekLLM`
- `LLMUserMessageReadyEventHandler`
- `MemoryManager`
- `WorkingContextSnapshot`
- `LLMRequestAssembler`
- `OpenAIChatRenderer`
- `ApiToolCallStreamingResponseHandler`

## Ownership Map

- `OpenAICompatibleLLM` owns OpenAI-compatible transport and response extraction. Its default renderer construction must remain provider-neutral/generic non-emitting.
- `DeepSeekLLM` owns DeepSeek provider-specific client configuration. It must select `DeepSeekChatRenderer`.
- `LLMUserMessageReadyEventHandler` owns stream sequencing and accumulated assistant envelope handoff.
- `ApiToolCallStreamingResponseHandler` owns tool-call parsing only.
- `MemoryManager` is the authoritative memory mutation facade.
- `WorkingContextSnapshot` owns canonical `Message` construction and order.
- `OpenAIChatRenderer` owns generic payload formatting and omits DeepSeek-specific fields.
- `DeepSeekChatRenderer` owns the small DeepSeek-specific payload extension on top of OpenAI-compatible formatting.
- `OpenAICompatibleRequestBuilder` remains only a request params assembler and must not reconstruct message fields.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `MemoryManager.ingestToolIntent(...)` | `MemoryManager.ingestToolIntents(...)` / `WorkingContextSnapshot` | Single invocation convenience. | Provider-specific reasoning policy. |
| `OpenAICompatibleLLM` constructor default renderer setup | Generic `OpenAIChatRenderer` | Shared OpenAI-compatible client setup. | DeepSeek-specific renderer selection. |
| `DeepSeekLLM` constructor | DeepSeek provider client configuration | Provider-specific model/API setup. | Memory rules or request-builder reconstruction. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Unconditional generic `OpenAIChatRenderer` reasoning attachment | Can break other OpenAI-compatible providers. | `DeepSeekChatRenderer` owns reasoning attachment; generic `OpenAIChatRenderer` omits it. | In This Change | Existing draft helper must move out of the generic path. |
| Renderer-only implementation assumption | Misses tool-call memory gap. | Handler -> MemoryManager -> WorkingContextSnapshot assistant envelope preservation. | In This Change | Historical ticket drafts are superseded. |
| Request-builder/raw-trace reasoning reconstruction | Bypasses canonical message owner. | Store full assistant message in `WorkingContextSnapshot`. | In This Change | Explicitly forbidden. |
| Current implementation handoff/code-review report as approval state | Produced before provider gating. | New implementation handoff/re-review after revised design and implementation. | In This Change | Mark stale artifacts superseded. |

## Return Or Event Spine(s) (If Applicable)

`OpenAICompatibleLLM ChunkResponse.reasoning -> LLMUserMessageReadyEventHandler completeReasoningText -> SegmentEvent(REASONING) -> MemoryManager assistant envelope options`

This path keeps UI/runtime emission separate from provider replay formatting.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ApiToolCallStreamingResponseHandler`
- Chain: `ToolCallDelta -> active tool state -> SegmentEvent start/content/end -> ToolInvocation`
- Why it matters: the parser should not own assistant reasoning or provider replay; it only produces tool invocation data consumed by the handler/memory path.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Runtime reasoning segment emission | DS-004 | Handler/runtime observers | Display streamed reasoning. | Existing UX. | Could be confused with provider replay storage. |
| Raw trace storage | DS-001/DS-002 | Memory manager | Durable audit trace. | Existing memory functionality. | Would create a second reasoning source if used for replay. |
| DeepSeek renderer variant | DS-001/DS-002/DS-003 | Provider rendering | Gate provider-specific field emission by class selection. | Protects non-DeepSeek providers. | If moved into memory, provider-specific policy contaminates canonical history. |
| Live DeepSeek E2E | DS-001 | Validation owner | Verify real provider behavior. | External contract evidence. | If sole guard, local tests become credential-dependent. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Internal reasoning storage | `Message` / `WorkingContextSnapshot` | Extend | Field already exists. | N/A |
| Tool-call assistant envelope | `MemoryManager` / `WorkingContextSnapshot` | Extend | Existing owner appends tool-call messages. | N/A |
| Generic provider field formatting | `OpenAIChatRenderer` | Reuse/keep conservative | Existing payload adapter owns generic OpenAI-compatible message fields. | N/A |
| DeepSeek field emission | `DeepSeekChatRenderer` | Create New | A named provider-specific renderer makes DeepSeek's extension explicit without exposing a generic boolean to all callers. | Existing generic renderer is intentionally provider-neutral/default non-emitting. |
| DeepSeek renderer selection | `DeepSeekLLM` | Extend | Provider-specific client owns provider-specific behavior. | N/A |
| Default non-emission | `OpenAICompatibleLLM` generic renderer | Reuse unchanged | Existing shared default path should remain conservative and use generic `OpenAIChatRenderer`. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent turn handling | Stream accumulation and memory write timing | DS-001/DS-004 | Handler | Extend | Pass envelope to memory. |
| Memory / working context | Canonical history | DS-001/DS-002 | MemoryManager/Snapshot | Extend | Provider-neutral. |
| Prompt rendering | Generic provider payload formatting | DS-003 | `OpenAIChatRenderer` | Reuse/keep conservative | Default omits DeepSeek field. |
| DeepSeek prompt rendering | DeepSeek-specific payload extension | DS-001/DS-002 | `DeepSeekChatRenderer` | Create New | Emits `reasoning_content` for assistant messages only. |
| DeepSeek provider client | Provider-specific renderer selection | DS-001/DS-002 | DeepSeekLLM | Extend | Assign `DeepSeekChatRenderer`. |
| Generic OpenAI-compatible clients | Conservative default payload shape | DS-003 | OpenAICompatibleLLM/Endpoint/LMStudio | Reuse | No DeepSeek field unless future explicit design. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/llm/prompt-renderers/openai-chat-renderer.ts` | Prompt rendering | Generic renderer | Keep generic OpenAI-compatible rendering non-emitting; optionally expose protected hook/helper for subclasses. | Existing adapter. | `Message.reasoning_content` only as data passed to subclass/hook, not emitted generically. |
| `src/llm/prompt-renderers/deepseek-chat-renderer.ts` | Prompt rendering | DeepSeek renderer | Extend `OpenAIChatRenderer` and emit `reasoning_content` for assistant messages. | Provider-specific payload policy deserves a named owner. | `Message.reasoning_content`. |
| `src/llm/api/deepseek-llm.ts` | Provider client | DeepSeekLLM | Configure `DeepSeekChatRenderer`. | Provider-specific behavior belongs here. | `DeepSeekChatRenderer`. |
| `src/llm/api/openai-compatible-llm.ts` | Generic provider client | OpenAICompatibleLLM | Keep default renderer construction generic non-emitting. | Shared generic path. | N/A |
| `src/agent/handlers/llm-user-message-ready-event-handler.ts` | Agent turn handling | Handler | Pass assistant envelope to memory for tool-call turns. | Owns stream accumulators. | `CompleteResponse.reasoning` mapping. |
| `src/memory/memory-manager.ts` | Memory | Memory facade | Accept assistant envelope options for tool intents. | Existing boundary. | `ToolCallSpec`. |
| `src/memory/working-context-snapshot.ts` | Memory | Snapshot | Construct assistant tool-call message with envelope. | Existing message owner. | `Message.reasoning_content`. |
| Tests | Validation | Vitest | Prove default and DeepSeek configured behavior. | Existing test layout. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| DeepSeek reasoning attachment | `deepseek-chat-renderer.ts` | Prompt rendering | The provider-specific behavior has a named owner and does not leak into generic renderer configuration. | Yes | Yes | Generic provider metadata bag or request-builder branch. |
| Assistant envelope options | Local type in memory facade/snapshot files | Memory | Narrow boundary data only. | Yes | Yes | DeepSeek-specific memory structure. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `Message.reasoning_content` | Yes | Yes | Low | Keep canonical internal field. |
| `DeepSeekChatRenderer` reasoning emission policy | Yes | Yes | Low | Controls only outbound DeepSeek-style field emission. |
| `assistantReasoning` / `reasoningContent` envelope fields | Yes | Yes | Low | Map once at memory boundary to `Message.reasoning_content`. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/prompt-renderers/openai-chat-renderer.ts` | Prompt rendering | Generic OpenAI-compatible renderer | Keep default rendering non-emitting for `reasoning_content`; provide a protected/private local path that `DeepSeekChatRenderer` can use without duplicating all rendering logic. | Existing OpenAI-compatible adapter owns generic payload fields. | `Message.reasoning_content` is not emitted here. |
| `autobyteus-ts/src/llm/prompt-renderers/deepseek-chat-renderer.ts` | Prompt rendering | DeepSeek-specific renderer | Extend `OpenAIChatRenderer`; emit `reasoning_content` only for assistant messages when source reasoning is non-null/non-undefined, including tool-call assistant messages. | DeepSeek's payload extension gets a named owner. | `Message.reasoning_content`. |
| `autobyteus-ts/src/llm/api/deepseek-llm.ts` | Provider client | DeepSeekLLM | Import `DeepSeekChatRenderer` and set `this._renderer = new DeepSeekChatRenderer()` after `super(...)`. | DeepSeek owns DeepSeek-specific replay contract. | DeepSeek renderer. |
| `autobyteus-ts/src/llm/api/openai-compatible-llm.ts` | Generic provider client | OpenAICompatibleLLM | Keep `this._renderer = new OpenAIChatRenderer()`; because renderer default is false, generic providers omit `reasoning_content`. | Shared base should stay conservative. | N/A |
| `autobyteus-ts/src/llm/api/openai-compatible-endpoint-llm.ts` | Generic custom endpoint client | OpenAICompatibleEndpointLLM | No change in this task; inherits generic non-emitting renderer. | Avoids guessing endpoint support. | N/A |
| `autobyteus-ts/src/llm/api/lmstudio-llm.ts` | LM Studio provider client | LMStudioLLM | Keep API-tool-call path `new OpenAIChatRenderer()` and legacy text renderer generic behavior. | Avoids sending DeepSeek field to LM Studio. | N/A |
| `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | Agent turn handling | Handler | Pass `completeResponseText || null` and `completeReasoningText || null` as assistant envelope options to `ingestToolIntents(...)` when tool invocations are parsed. | Handler owns stream accumulators and tool-call timing. | Internal response fields. |
| `autobyteus-ts/src/memory/memory-manager.ts` | Memory | Memory facade | Add `ToolIntentIngestionOptions` with `assistantContent?: string | null`, `assistantReasoning?: string | null`; forward to snapshot. | Authoritative memory boundary. | `ToolCallSpec`. |
| `autobyteus-ts/src/memory/working-context-snapshot.ts` | Memory | Working context | Add `AssistantToolCallEnvelope` with `content?: string | null`, `reasoningContent?: string | null`; append one assistant `Message` with `ToolCallPayload` and envelope. | Canonical message construction owner. | `Message`. |
| `autobyteus-ts/tests/unit/llm/prompt-renderers/openai-chat-renderer.test.ts` | Tests | Generic renderer tests | Assert default non-emission for non-tool and tool-call assistant messages; assert no synthesis for non-assistant messages. | Direct owner tests. | N/A |
| `autobyteus-ts/tests/unit/llm/prompt-renderers/deepseek-chat-renderer.test.ts` or combined renderer test | Tests | DeepSeek renderer tests | Assert `DeepSeekChatRenderer` emits reasoning for non-tool and tool-call assistant messages. | Direct provider renderer tests. | N/A |
| `autobyteus-ts/tests/unit/llm/api/openai-compatible-llm.test.ts` and/or `deepseek-llm.test.ts` | Tests | Client wiring tests | Assert default OpenAICompatibleLLM request omits `reasoning_content`; assert DeepSeekLLM configured path emits it. | Tests actual client wiring, not only manual renderer construction. | N/A |
| `autobyteus-ts/tests/unit/memory/memory-tool-continuation-reasoning.test.ts` | Tests | Memory-to-render test | Assert tool-continuation memory preserves reasoning and both render paths behave as expected. | Covers DS-001/DS-003. | N/A |
| `autobyteus-ts/tests/unit/memory/working-context-snapshot*.test.ts` | Tests | Snapshot tests | Assert append and serialization preserve assistant tool-call reasoning. | Covers persistence. | N/A |

## Ownership Boundaries

Memory owns canonical conversation history and remains provider-neutral. Provider-specific output is owned by a provider-specific renderer selected by the provider client. The DeepSeek behavior must be visible as `DeepSeekLLM -> DeepSeekChatRenderer`; default OpenAI-compatible clients must not infer DeepSeek behavior from the mere presence of internal `Message.reasoning_content`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `MemoryManager.ingestToolIntents` | `WorkingContextSnapshot.appendToolCalls`, trace write | Agent handlers | Handler mutates snapshot directly. | Add explicit assistant envelope options. |
| `WorkingContextSnapshot` | Internal `Message[]` | Memory manager / serializer | Renderer reads raw traces to reconstruct reasoning. | Store full assistant messages. |
| `OpenAIChatRenderer` | Generic payload field construction | LLM clients / assembler | Request builder adds provider field after render, or generic renderer emits DeepSeek fields. | Keep generic renderer non-emitting and subclass/variant extension points narrow. |
| `DeepSeekChatRenderer` | DeepSeek-specific payload field construction | `DeepSeekLLM` | Generic base client emits DeepSeek fields for all providers. | Keep reasoning emission in the DeepSeek renderer only. |
| `DeepSeekLLM` | DeepSeek-specific renderer selection | Users constructing DeepSeek provider client | Generic base client emits DeepSeek fields for all providers. | Configure `DeepSeekChatRenderer` in DeepSeekLLM. |

## Dependency Rules

- Handler may depend on `MemoryManager`, not snapshot internals.
- `MemoryManager` may depend on `WorkingContextSnapshot`, not provider renderers.
- `OpenAIChatRenderer` may depend on `Message` and tool payload types, not memory or handlers.
- `DeepSeekChatRenderer` may depend on/extend `OpenAIChatRenderer` and `Message` semantics, not memory or handlers.
- `DeepSeekLLM` may depend on `DeepSeekChatRenderer` to configure provider-specific rendering.
- `OpenAICompatibleLLM` default construction remains provider-neutral/generic non-emitting.
- `OpenAICompatibleRequestBuilder` must not inspect `Message.reasoning_content`, raw traces, or provider names to add fields.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `OpenAIChatRenderer.render(messages)` | Generic provider payload rendering | Convert `Message[]` to OpenAI-compatible chat params while omitting DeepSeek-specific `reasoning_content`. | `Message[]`. | No provider detection here. |
| `DeepSeekChatRenderer.render(messages)` | DeepSeek provider payload rendering | Reuse generic OpenAI-compatible rendering shape and add `reasoning_content` for assistant messages only. | `Message[]`. | Concrete provider-gating seam. |
| `DeepSeekLLM.constructor(...)` | DeepSeek provider client setup | Configure `DeepSeekChatRenderer` after `super(...)`. | Existing constructor args unchanged. | Keeps public API stable. |
| `MemoryManager.ingestToolIntents(toolInvocations, turnId?, options?)` | Tool-call assistant memory event | Append tool-call trace and assistant tool-call message with optional envelope. | `ToolInvocation[]`, optional turn id, optional assistant envelope. | Provider-neutral. |
| `WorkingContextSnapshot.appendToolCalls(toolCalls, envelope?)` | Assistant tool-call message construction | Append one assistant message with tool calls and optional content/reasoning. | `ToolCallSpec[]`, optional envelope. | Provider-neutral. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `OpenAIChatRenderer` generic rendering | Yes | Yes | Low | Must remain non-emitting for DeepSeek fields. |
| `DeepSeekChatRenderer` reasoning emission | Yes | Yes | Low | Provider-specific extension lives behind a named renderer. |
| `DeepSeekLLM` renderer assignment | Yes | Yes | Low | Import `DeepSeekChatRenderer` and set it explicitly. |
| `ingestToolIntents` options | Yes | Yes | Low | Use named assistant envelope fields. |
| `appendToolCalls` envelope | Yes | Yes | Low | Map to `Message.reasoning_content`. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| DeepSeek renderer | `DeepSeekChatRenderer` | Yes | Low | Name states provider-specific payload contract. |
| Internal field | `reasoning_content` | Yes | Low | Existing canonical field. |
| Memory option | `assistantReasoning` | Yes | Low | Maps response reasoning into assistant envelope. |
| Snapshot envelope field | `reasoningContent` | Yes | Low | TypeScript-style local name for `Message.reasoning_content`. |

## Applied Patterns (If Any)

- Adapter: `OpenAIChatRenderer` adapts internal messages to provider payloads.
- Provider-specific renderer variant: `DeepSeekChatRenderer` extends the shared adapter for DeepSeek's payload extension.
- Facade: `MemoryManager` encapsulates snapshot mutation.
- Bounded parser: `ApiToolCallStreamingResponseHandler` remains tool-call parser only.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/prompt-renderers/openai-chat-renderer.ts` | File | Generic renderer | Generic OpenAI-compatible rendering; no `reasoning_content` emission. | Provider payload adapter. | Provider name checks, memory reads, handler state, DeepSeek field emission. |
| `autobyteus-ts/src/llm/prompt-renderers/deepseek-chat-renderer.ts` | File | DeepSeek renderer | DeepSeek-specific `reasoning_content` emission on top of generic OpenAI-compatible shape. | Provider-specific payload policy owner. | Memory changes, request-builder mutations, generic provider behavior. |
| `autobyteus-ts/src/llm/api/deepseek-llm.ts` | File | DeepSeek provider client | Select `DeepSeekChatRenderer`. | Provider-specific contract owner. | Memory changes or request-builder mutations. |
| `autobyteus-ts/src/llm/api/openai-compatible-llm.ts` | File | Generic OpenAI-compatible client | Keep default renderer generic non-emitting. | Shared base. | DeepSeek-specific renderer selection for all clients. |
| `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | File | Handler | Pass accumulated envelope to memory. | Stream owner. | DeepSeek renderer selection. |
| `autobyteus-ts/src/memory/memory-manager.ts` | File | Memory facade | Tool-intent assistant envelope options. | Existing boundary. | Provider-specific logic. |
| `autobyteus-ts/src/memory/working-context-snapshot.ts` | File | Snapshot | Assistant tool-call message envelope. | Canonical message owner. | Provider rendering logic. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/llm/api` | Provider client | Yes | Low | DeepSeek-specific config belongs in `deepseek-llm.ts`. |
| `src/llm/prompt-renderers` | Adapter | Yes | Low | Provider-specific payload behavior belongs in the DeepSeek renderer. |
| `src/memory` | Memory/domain-control | Yes | Low | Working context owner. |
| `src/agent/handlers` | Runtime orchestration | Yes | Low | Stream accumulator owner. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Renderer default | `new OpenAIChatRenderer()` omits `reasoning_content` even if `Message.reasoning_content` exists. | Generic renderer emits DeepSeek fields to every OpenAI-compatible provider. | Protects strict providers. |
| DeepSeek renderer selection | `this._renderer = new DeepSeekChatRenderer()` in `DeepSeekLLM` after `super(...)`. | Provider detection inside generic renderer or request builder. | Makes provider owner explicit and decoupled. |
| Tool-call assistant message | `Message(ASSISTANT, { content, reasoning_content, tool_payload: new ToolCallPayload(...) })` | Separate assistant reasoning message plus assistant tool-call message. | DeepSeek expects the same assistant message replay. |
| Memory boundary | `handler -> memoryManager.ingestToolIntents(invocations, turnId, { assistantContent, assistantReasoning })` | `handler -> memoryManager.workingContextSnapshot.appendMessage(...)` | Preserves authoritative memory boundary. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Unconditional generic `reasoning_content` renderer pass-through | Simplest way to satisfy DeepSeek. | Rejected | Generic renderer omits; `DeepSeekChatRenderer` emits; `DeepSeekLLM` selects it. |
| Request-builder provider-name branch | Could add field late. | Rejected | Renderer owns payload field construction. |
| Raw-trace reasoning recovery | Could compensate for memory drop. | Rejected | Store full assistant message in working context. |
| DeepSeek-specific memory message type | Could isolate provider behavior. | Rejected | Memory stays provider-neutral using existing `Message.reasoning_content`. |
| Custom endpoint auto-detection | Could support DeepSeek-compatible endpoints. | Rejected for this task | Future explicit provider-capability config if needed. |

## Derived Layering (If Useful)

- Provider extraction: `OpenAICompatibleLLM` maps response fields into internal response/chunk objects.
- Runtime orchestration: `LLMUserMessageReadyEventHandler` sequences stream parsing and memory handoff.
- Memory continuity: `MemoryManager`/`WorkingContextSnapshot` own future conversation messages.
- Provider rendering: `OpenAIChatRenderer` formats generic payloads; `DeepSeekChatRenderer` adds DeepSeek's extension; `DeepSeekLLM` selects the DeepSeek renderer.

## Migration / Refactor Sequence

1. Mark stale implementation/code-review artifacts as superseded and keep workflow in design/implementation rework.
2. Update generic `OpenAIChatRenderer` so it no longer emits `reasoning_content` by default. If needed, make the reasoning-attachment hook protected/narrow so a subclass can reuse generic rendering without duplicating the full renderer.
3. Add `autobyteus-ts/src/llm/prompt-renderers/deepseek-chat-renderer.ts` extending `OpenAIChatRenderer`; it emits `reasoning_content` only when source reasoning is non-null/non-undefined and the rendered role is assistant.
4. Update `DeepSeekLLM` to import `DeepSeekChatRenderer` and assign `this._renderer = new DeepSeekChatRenderer()` after `super(...)`.
5. Keep `OpenAICompatibleLLM`, `OpenAICompatibleEndpointLLM`, and `LMStudioLLM` default paths on generic `OpenAIChatRenderer`. Do not add generic base renderer selection.
6. Preserve/implement memory path changes: handler passes assistant envelope to `MemoryManager.ingestToolIntents`; memory forwards to `WorkingContextSnapshot.appendToolCalls`; snapshot stores content/reasoning on the assistant tool-call `Message`.
7. Update tests:
   - default renderer non-emission;
   - DeepSeek renderer emission;
   - actual default `OpenAICompatibleLLM` request payload non-emission;
   - actual `DeepSeekLLM` configured request payload emission;
   - memory-to-render continuation with both default and DeepSeek render assertions;
   - snapshot append/serialization preservation.
8. Run targeted Vitest tests, build, and `git diff --check`.
9. Produce a new implementation handoff only after implementation matches this revised design; route back through code review.

## Key Tradeoffs

- A named `DeepSeekChatRenderer` plus DeepSeek constructor override is slightly more explicit than a generic renderer boolean and avoids exposing a provider-specific toggle to generic callers. It is still less invasive than refactoring `OpenAICompatibleLLM` constructor to accept renderer instances/options.
- Leaving custom OpenAI-compatible endpoints generic non-emitting may require future user-facing capability config, but it avoids guessing provider support and breaking strict endpoints.
- Memory stores reasoning provider-neutrally even when default rendering omits it; this is intentional because memory is the canonical internal history and rendering decides provider output.

## Risks

- If future providers require different reasoning replay fields, they need their own explicit renderer variant or provider-client renderer selection.
- DeepSeek live behavior may vary by model; deterministic tests must remain primary.
- Current source diff and old code-review report are stale until implementation is updated to this `DeepSeekChatRenderer` design.

## Guidance For Implementation

- Do not leave unconditional `reasoning_content` attachment in generic `OpenAIChatRenderer`.
- Do not add provider-name checks in `OpenAICompatibleRequestBuilder`.
- Do not put DeepSeek-specific branches in memory.
- Use the existing LMStudio-style pattern of overriding protected `_renderer` in provider subclass, but select `DeepSeekChatRenderer` rather than passing a generic option.
- Add tests that inspect actual request params from default `OpenAICompatibleLLM` and `DeepSeekLLM`, not only manually constructed renderer output.
- Add direct renderer tests for both generic `OpenAIChatRenderer` non-emission and `DeepSeekChatRenderer` emission.
- Update stale implementation handoff after rework; do not route old implementation to code review.
