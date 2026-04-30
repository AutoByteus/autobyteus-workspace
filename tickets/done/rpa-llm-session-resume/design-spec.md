# Design Spec

## Current-State Read

A restored AutoByteus standalone run already has the stable logical run id and restored working-context memory before invoking the LLM. `autobyteus-server-ts` restores the run by id and memory dir, and `autobyteus-ts` reloads `working_context_snapshot.json` during bootstrap. `LLMRequestAssembler` then builds a full message list from the restored working context plus the newest user message.

The break happens at the AutoByteus RPA LLM transport boundary. `AutobyteusPromptRenderer` renders only the latest user message, and `AutobyteusLLM` sends that single message to the RPA server under a random constructor-time `conversationId`. For tool-using conversations, working context may contain structured `ToolCallPayload` and `ToolResultPayload` messages rather than the original raw XML assistant text. The AutoByteus RPA renderer in TypeScript must convert those structured payloads back into canonical transcript text, including AutoByteus XML for historical assistant tool calls, before sending the payload to the RPA server. The RPA server should not need tool parsing or tool XML generation; it only chooses active-session latest-message behavior or missing-session transcript flattening. When the AutoByteus server/agent process restarts, the fresh `AutobyteusLLM` instance gets a new random id. The RPA server is keyed by that id and stores sessions only in `LLMService.conversations`, so it creates a fresh RPA/browser conversation and receives no prior transcript.

Current ownership/coupling problems:

- Transient `AutobyteusLLM` object identity is acting as remote conversation authority even though the logical run id is the durable chat identity.
- The renderer hides the restored transcript from the RPA server.
- The RPA server cannot choose a correct resume path because its API receives no transcript context.
- `LLMService` caches `conversation_id -> llm` without model mismatch protection.

Constraints:

- RPA UI integrators have no native history import API and rely on per-instance message counters to locate the next response. A missing RPA session must therefore resume with a first-turn synthetic context prompt, not exact turn-by-turn browser history replay.
- Existing AutoByteus memory compaction/restoration should remain the authoritative transcript-size control.
- This is an internal coordinated contract; the target design removes the old single-message text LLM path instead of keeping compatibility wrappers.

## Intended Change

Replace the AutoByteus RPA text LLM contract with:

1. a required, caller-supplied stable logical `conversation_id`; agent-driven calls supply the AutoByteus agent run id, and direct non-agent callers must supply their own stable logical conversation id;
2. a normalized conversation payload containing the TypeScript-rendered working-context transcript plus an explicit current user message index. Payload messages carry normal text/media; historical assistant tool calls and tool results are already rendered into message content by the AutoByteus RPA renderer;
3. RPA server session ownership that sends only the current user message when an active session exists, but synthesizes one resume user message from the transcript when it must create a new RPA LLM/browser session. During resume prompt construction, the server concatenates the already-rendered role-ordered transcript into one message as faithfully as possible: system/user/assistant/tool-result blocks appear in order, the final block is the current user turn, and historical tool-call XML is treated as ordinary assistant content. In both paths `current_message_index` remains meaningful: on cache hit it selects the message to send directly; on cache miss it identifies where the final/current user turn begins inside the flattened transcript.

The target behavior is semantic chat continuity after AutoByteus server/agent restart. It does not attempt to persist browser UI sessions across RPA LLM server process restarts.

### Explicit logical identity requirement

`AutobyteusLLM` must fail fast when `kwargs.logicalConversationId` is missing, empty, or not a string. It must not generate a UUID, use instance identity, or silently create any other fallback conversation id. This applies to both agent-driven and direct non-agent calls. Agent-driven invocation satisfies the requirement through `LLMUserMessageReadyEventHandler`, which sets `logicalConversationId = context.agentId`; direct non-agent callers must pass their own stable logical id. The error must occur before calling `AutobyteusClient` so no request reaches the RPA server with an accidental transient identity.

### Tool-call resume rendering

Tool calls are a special transcript type. The current working context usually preserves them as structured payloads, not as the raw XML string the RPA model originally emitted. Therefore the target contract is:

- TypeScript reads structured tool data from working context, for example `ToolCallPayload` and `ToolResultPayload`, and renders it into the outgoing AutoByteus RPA transcript content before transport.
- The TypeScript AutoByteus RPA renderer owns conversion of historical tool calls to canonical AutoByteus XML. Generic calls render as `<tool name="..."><arguments><arg name="...">...</arg></arguments></tool>` with XML escaping and deterministic ordering.
- Known large text arguments should use the same sentinel style expected by AutoByteus examples when applicable: `content` with `__START_CONTENT__` / `__END_CONTENT__`, and `patch` with `__START_PATCH__` / `__END_PATCH__`.
- Tool results are not XML tool calls; TypeScript renders them as historical result records tied to the call id/tool name so the recreated RPA LLM knows what happened without being asked to execute old tools.
- The resume prompt should not introduce a separate `Current user request:` section. It should look like one ordered transcript flattened into a single user message; the final `User` block is the current turn. A small restore preface is allowed only if needed to say this is prior conversation context and the model should continue from the final user block, not replay old tool calls.

Example cache-miss flattened shape:

```text
[Optional minimal restore preface]

System:
<system prompt text>

User:
<earlier user text>

Assistant:
<assistant text if any>
<tool name="write_file">
  <arguments>
    <arg name="path">/tmp/a.txt</arg>
    <arg name="content">
__START_CONTENT__
hello
__END_CONTENT__
    </arg>
  </arguments>
</tool>

Tool result (call-1, write_file):
<result text>

User:
<current user text>
```

## Terminology

- `Logical conversation id`: required durable AutoByteus chat/run identity used as RPA `conversation_id`; for agent-driven AutoByteus runs this is `context.agentId` / run id, and for direct non-agent calls it must be supplied explicitly by the caller.
- `Transient RPA session`: in-memory RPA server record containing a live RPA LLM/browser UI integrator instance.
- `Conversation payload`: message list sent over the RPA server text endpoint. Each message includes role, TypeScript-rendered content, current-message media, and historical media references. Tool payloads from working context are rendered into content before crossing the TypeScript client boundary.
- `Current user message`: the latest user message in the payload, identified by `current_message_index`, whose text/media represent the actual new user turn.
- `Resume prompt`: deterministic synthetic first-turn user prompt built by the RPA server by flattening the role-ordered transcript into one message when no transient RPA session exists. Historical assistant tool calls inside it are already canonical AutoByteus XML in assistant message content; the final `User` block is the current turn.

## Design Reading Order

Read this design from the flow outward:

1. restart/resume data-flow spine
2. ownership split across AutoByteus agent runtime, AutoByteus RPA LLM transport, and RPA server session owner
3. file responsibility mapping
4. clean-cut migration/removal plan and validation

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the single-message TypeScript text methods/call shape and Python endpoint/service request shape for `/send-message` and `/stream-message`.
- The old behavior `conversation_id=randomUUID + user_message=<latest only>` is replaced by `conversation_id=<explicit logical id> + messages=[transcript...] + current_message_index`.
- Do not keep server-side branches that accept both `user_message` and `messages` for in-scope text LLM endpoints. Do not keep TypeScript fallback UUID conversation identity for direct or agent-driven use.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Restored AutoByteus agent user message | RPA UI receives current/resume message | AutoByteus agent LLM invocation + RPA server session owner | Main user-visible restart continuation path. |
| DS-002 | Primary End-to-End | Active AutoByteus RPA LLM session request | Cached RPA LLM receives only newest user turn | RPA server `LLMService` | Ensures normal non-restart multi-turn behavior does not duplicate transcript. |
| DS-003 | Primary End-to-End | Missing RPA server session request with transcript | New RPA LLM first turn receives resume prompt | RPA server `LLMService` + resume payload builder | Core missing-session recovery path. |
| DS-004 | Return-Event | RPA LLM chunk/response | AutoByteus agent response ingestion and persisted working context | Existing `LLMUserMessageReadyEventHandler` / `MemoryManager` | Ensures returned answer continues to feed authoritative local memory. |
| DS-005 | Bounded Local | RPA server `conversation_id` lookup | Active/rejected/new session decision | RPA server `LLMService` | Prevents cross-run/cross-model leakage. |

## Primary Execution Spine(s)

- DS-001 restored agent request:
  `GraphQL/API restored run -> AgentRunService/AutoByteus backend -> Agent runtime LLM handler -> AutobyteusLLM transport -> RPA server LLMService -> RPA UI integrator`

- DS-002 active RPA session:
  `AutobyteusLLM transcript request -> LLMService session cache hit -> current message selector -> cached RPA LLM -> existing browser conversation`

- DS-003 missing RPA session:
  `AutobyteusLLM transcript request -> LLMService session cache miss -> current-index split -> resume prompt builder -> new RPA LLM -> new browser conversation first turn`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A restored AutoByteus run receives a user message. The agent runtime assembles the full restored working context, attaches the run id as logical conversation id, and sends a rendered transcript payload to the RPA server. | Restored run, agent runtime, AutoByteus RPA LLM transport, RPA server session owner, RPA UI | Agent runtime owns local context; RPA server owns transient session state. | Payload rendering, media normalization, cleanup tracking. |
| DS-002 | If the RPA server still has `conversation_id` active, it extracts the current user message and forwards only that turn to the cached RPA LLM/browser conversation. | RPA server session cache, current user message, cached RPA LLM | `LLMService` | Model mismatch validation, media materialization. |
| DS-003 | If the RPA server lacks `conversation_id`, it creates a new RPA LLM and sends one first-turn resume prompt. The prompt is a faithful role-ordered transcript flattened into one user message; `messages[current_message_index]` is included as the final `User` block, not separated under a special `Current user request` heading. Prior tool calls are already present as AutoByteus XML in assistant message content; tool results are already present as historical result records. | Missing session, resume prompt builder, flattened transcript builder, new RPA LLM | `LLMService` | Transcript formatting, rendered historical tool content, historical media text references. |
| DS-004 | RPA response chunks flow back through `AutobyteusLLM` and existing handler code; final response is ingested into `MemoryManager`, preserving future restart context. | RPA response, AutobyteusLLM, handler, MemoryManager | Existing handler/memory owners | Response media persistence is already owned by RPA server. |
| DS-005 | `LLMService` resolves the session key, rejects model mismatch, or creates a new session. | Conversation id, model name, session record | `LLMService` | Session dataclass/record, cleanup. |

## Spine Actors / Main-Line Nodes

- `AgentRunService` / AutoByteus backend: restores active run by durable run id and memory dir.
- `Agent runtime LLM handler`: owns per-turn LLM invocation sequencing and has access to logical `agentId`.
- `MemoryManager` / `LLMRequestAssembler`: owns authoritative working-context messages.
- `AutobyteusLLM`: owns AutoByteus RPA LLM transport semantics from TypeScript to the RPA server.
- `AutobyteusClient`: owns HTTP payload serialization/media normalization for the RPA server.
- RPA server `LLMService`: owns transient RPA LLM sessions and active vs resume decision.
- RPA UI integrator: owns browser UI interaction for one live RPA LLM instance.

## Ownership Map

| Actor / Node | Owns | Does Not Own |
| --- | --- | --- |
| `AgentRunService` / AutoByteus backend | Durable run metadata, restore entrypoint, memory dir selection | RPA transport payload shape or RPA server session state |
| `LLMUserMessageReadyEventHandler` | Turn-level LLM invocation, tool schema kwargs, stable logical conversation id injection | Rendering RPA transcript or deciding RPA server cache hit/miss |
| `LLMRequestAssembler` / `MemoryManager` | Authoritative working-context message list and persistence | Remote RPA session identity |
| `AutobyteusPromptRenderer` | Translation from `Message[]` into AutoByteus RPA conversation payload, including normal text/media plus canonical XML/result text rendered from `ToolCallPayload` / `ToolResultPayload` | HTTP transport, server cache decisions |
| `AutobyteusLLM` | Requiring and validating `kwargs.logicalConversationId`, translating it to RPA `conversation_id`, calling client, mapping RPA responses to `CompleteResponse`/`ChunkResponse`, cleanup of used ids | Local memory selection, generated fallback identity, or RPA server active/missing session decision |
| `AutobyteusClient` | HTTP request object shape and media normalization | Transcript semantics or RPA session lifecycle |
| RPA server `LLMService` | `conversation_id` session cache, model safety, active vs resume route, response media saving | AutoByteus run metadata or TypeScript memory restoration |
| RPA server conversation payload/helper layer | Current-message selection and deterministic flattening of already-rendered transcript messages on cache miss | Creating/caching RPA LLM instances, tool XML generation/parsing |

If a public facade exists, `AutobyteusClient` and FastAPI endpoints are thin transport facades; `AutobyteusLLM` and RPA server `LLMService` are the governing owners behind them.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AutobyteusClient.sendMessage/streamMessage` | `AutobyteusLLM` request semantics | HTTP bridge to RPA server | Conversation id policy, transcript rendering |
| FastAPI `/send-message`, `/stream-message` endpoints | RPA server `LLMService` | Request validation and response streaming | Session cache policy, resume prompt construction |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| TypeScript positional text LLM calls with `userMessage, imageUrls, audioUrls, videoUrls` | Cannot carry transcript or current index cleanly | `AutobyteusSendMessageRequest` request object | In This Change | Update all repo call sites/tests. |
| Python `SendUserMessageRequest.user_message` single-message schema | Cannot resume missing RPA sessions | `messages` + `current_message_index` schema | In This Change | No dual parsing branch. |
| `AutobyteusPromptRenderer` latest-user-only output | Drops restored context | Transcript/current-message renderer | In This Change | Existing tests updated. |
| Random/generated fallback conversation id as RPA session id | Changes across restored LLM instances and violates the explicit-identity contract | Required `logicalConversationId` kwarg from caller; agent handler supplies `agentId` | In This Change | Remove fallback UUID behavior completely. Direct non-agent callers must supply a stable logical id. |
| `LLMService.conversations` raw llm-only dict values | Cannot validate model mismatch | `ConversationSession` record with `model_name` + `llm` | In This Change | Can remain in same file or helper dataclass. |

## Return Or Event Spine(s) (If Applicable)

- DS-004 response event spine:
  `RPA LLM response/chunk -> AutobyteusClient stream parser -> AutobyteusLLM ChunkResponse/CompleteResponse -> LLMUserMessageReadyEventHandler accumulator -> MemoryManager.ingestAssistantResponse -> working_context_snapshot.json`

This spine is important because the post-resume answer must re-enter the same authoritative memory path; no special RPA-specific response memory should be added.

## Bounded Local / Internal Spines (If Applicable)

- Inside RPA server `LLMService` (DS-005):
  `Receive request -> validate current_message_index points to a user message -> resolve session record -> cache hit sends selected current message only / cache miss flattens role-ordered transcript with current message as final User block -> materialize current media -> invoke RPA LLM -> save response media`

- Inside `AutobyteusPromptRenderer`:
  `Message[] -> locate current user index -> normalize transcript entries -> sanitize historical media -> emit payload`

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Media normalization | DS-001, DS-002, DS-003 | `AutobyteusClient` and RPA server media storage | Convert current media to data URI/client payload, then server local paths | RPA UI integrators need local media paths | Main flow becomes media-specific and obscures resume logic. |
| Resume transcript formatting | DS-003 | RPA server `LLMService` | Convert `messages[0:current_message_index + 1]` into one deterministic role-ordered transcript, with the current message as the final `User` block rather than a separate special section | Missing RPA session cannot import browser history | If inside UI integrator, every provider repeats policy. |
| Historical tool XML rendering | DS-001, DS-003 | TypeScript `AutobyteusPromptRenderer` | Convert structured `ToolCallPayload.toolCalls[]` into canonical AutoByteus XML, with deterministic escaping and special wrappers for content/patch-like arguments where needed | TypeScript owns tool-call format and already has parser/formatter context; the RPA server should stay tool-format agnostic | If placed on the RPA server, the server would need duplicated parser/format knowledge and sentinel rules. |
| Model mismatch validation | DS-005 | `LLMService` | Prevent same conversation id from silently reusing wrong model | Avoids context leakage and UI inconsistency | If omitted, run/model boundaries are unsafe. |
| Cleanup tracking | DS-001, DS-005 | `AutobyteusLLM` and `LLMService` | Clean used remote conversation ids and cached sessions | Stable ids mean cleanup must target actual ids used | If forgotten, stale remote sessions leak. |
| Historical media summarization/redaction | DS-003 | Prompt renderer / resume builder | Avoid resending old data URIs; include type/count references | Prevents giant payloads and accidental media replay | If hidden in client transport, server cannot reason about prompt semantics. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Local conversation memory | `MemoryManager`, `WorkingContextSnapshotStore` | Reuse | Already restores and compacts authoritative context. | N/A |
| Agent run identity | `AgentRunService` / AutoByteus agent context | Reuse | Run id is already stable and restored. | N/A |
| RPA text request rendering | `AutobyteusPromptRenderer` | Extend/Replace internals | Correct owner for message-to-RPA-payload translation. | N/A |
| HTTP transport | `AutobyteusClient` | Extend/Replace method contract | Existing HTTP owner; only payload shape changes. | N/A |
| RPA active sessions | RPA server `LLMService` | Extend | Already owns `conversation_id` cache. | N/A |
| Resume prompt construction | None with this responsibility | Create New helper under RPA server services | This is not media storage, not FastAPI schema, and not RPA UI provider behavior. | Existing areas either validate DTOs or interact with browser; neither should own transcript synthesis. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` agent runtime | Stable logical id propagation in LLM kwargs | DS-001 | Agent runtime LLM handler | Extend | Generic kwarg consumed only by AutoByteusLLM. |
| `autobyteus-ts` AutoByteus RPA LLM transport | Transcript rendering, request object, response mapping, cleanup | DS-001, DS-004 | `AutobyteusLLM` | Extend/Replace | Main TypeScript change area. |
| `autobyteus_rpa_llm_server` API DTOs | New request schema | DS-001 | FastAPI endpoints | Replace | Response schemas stay. |
| `autobyteus_rpa_llm_server` session service | Active/missing session decision, model safety, invocation | DS-002, DS-003, DS-005 | `LLMService` | Extend | Governing server-side owner. |
| RPA core/UI integrators | Browser UI interaction for one live session | DS-002, DS-003 | Existing RPA LLM classes | Reuse | No history import added. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/api/autobyteus-conversation-payload.ts` | AutoByteus RPA LLM transport | TypeScript request payload model | Export `AutobyteusConversationMessage`, `AutobyteusConversationPayload`, `AutobyteusSendMessageRequest` types and small validation helpers | Shared by renderer, LLM, and client | Yes |
| `autobyteus-ts/src/llm/prompt-renderers/autobyteus-prompt-renderer.ts` | AutoByteus RPA LLM transport | Renderer | Render `Message[]` to payload with current index, sanitized media history, canonical XML for historical tool calls, and result records for tool results | Existing renderer owner | Uses payload types |
| `autobyteus-ts/src/llm/api/autobyteus-llm.ts` | AutoByteus RPA LLM transport | LLM transport | Require explicit logical conversation id, call client with payload, track used ids for cleanup | Existing LLM owner | Uses payload types |
| `autobyteus-ts/src/clients/autobyteus-client.ts` | HTTP client | HTTP boundary | Replace text LLM send/stream methods with request-object payload posting | Existing RPA HTTP owner | Uses payload types |
| `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | Agent runtime | LLM invocation handler | Add `logicalConversationId: agentId` to `streamKwargs` | Existing invocation owner | N/A |
| `autobyteus_rpa_llm_server/api/schemas.py` | RPA server API DTOs | FastAPI schema | Replace text request schema with message payload schema | Existing schema owner | Python mirror of contract |
| `autobyteus_rpa_llm_server/api/endpoints.py` | RPA server API | FastAPI endpoints | Pass new request object fields to service | Thin facade | Uses schemas |
| `autobyteus_rpa_llm_server/services/llm_conversation_payload.py` | RPA server session service support | Payload/resume helper | Select current user message and flatten already-rendered messages into one cache-miss transcript message | Concrete reusable helper for service/tests | Python message structure |
| `autobyteus_rpa_llm_server/services/llm_service.py` | RPA server session service | Session owner | Store session records, model mismatch guard, choose active vs resume path | Existing governing owner | Uses payload helper |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| AutoByteus RPA conversation payload types used by renderer/client/LLM | `autobyteus-ts/src/llm/api/autobyteus-conversation-payload.ts` | AutoByteus RPA LLM transport | Prevents duplicated ad-hoc `{ role, content, image_urls... }` shapes; `content` is the provider-specific rendered transcript text, including historical tool XML/result records when present | Yes | Yes | Generic all-provider message model |
| Python current-message selection and cache-miss transcript flattening | `autobyteus_rpa_llm_server/services/llm_conversation_payload.py` | RPA server LLM service | Used by send and stream paths and unit tests | Yes | Yes | UI-integrator-specific behavior or TypeScript tool formatting |
| RPA server active session record | `ConversationSession` in `llm_service.py` or helper | RPA server LLM service | Needed for model safety and cleanup | Yes | Yes | Persistence abstraction (not in scope) |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AutobyteusConversationMessage` | Yes | Yes | Low | Role/content/media only; `content` is already rendered for the RPA transcript and may include historical tool XML/result records. |
| `AutobyteusConversationPayload` | Yes | Yes | Low | `messages` plus `current_message_index`; the index is the active-session selector and the missing-session history/current split point; no separate latest string. |
| Python `SendUserMessageRequest` | Yes | Yes | Low | Remove old `user_message`/top-level media arrays. |
| `ConversationSession` | Yes | Yes | Low | Store exactly `model_name` and `llm`. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/api/autobyteus-conversation-payload.ts` | AutoByteus RPA LLM transport | Payload model | TypeScript request contract and helper to ensure current index is valid | New shared contract owner | N/A |
| `autobyteus-ts/src/llm/prompt-renderers/autobyteus-prompt-renderer.ts` | AutoByteus RPA LLM transport | Renderer | Build payload from `Message[]`; current user keeps media; historical entries include rendered text plus canonical XML/result records from tool payloads; historical media becomes text references and is not attachable | Existing renderer responsibility | Yes |
| `autobyteus-ts/src/llm/api/autobyteus-llm.ts` | AutoByteus RPA LLM transport | LLM client adapter | Use renderer output, require `logicalConversationId`, call client, response conversion, cleanup used ids | Existing class owns provider adapter | Yes |
| `autobyteus-ts/src/clients/autobyteus-client.ts` | HTTP client | RPA server HTTP facade | Post/stream text LLM request object with normalized media | Existing transport file | Yes |
| `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | Agent runtime | LLM invocation handler | Add stable `logicalConversationId` kwarg | Existing turn orchestration | No |
| `autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/api/schemas.py` | RPA server API DTOs | Request schema | Define `ConversationMessage` and new `SendUserMessageRequest` with rendered content | Existing schema file | Python mirror |
| `autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/api/endpoints.py` | RPA server API | FastAPI facade | Log counts and forward request payload to service | Existing endpoint file | Python schema |
| `autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/services/llm_conversation_payload.py` | RPA server LLM service | Payload helper | Validate/select current user message; build cache-miss flattened transcript from already-rendered message content | Keeps `LLMService` from becoming formatting blob | Python schema |
| `autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/services/llm_service.py` | RPA server LLM service | Session owner | Cache `ConversationSession`, route active/missing session, materialize current media, invoke LLM, cleanup | Existing governing owner | Python helper |

## Ownership Boundaries

- Upstream callers above AutoByteus agent runtime must use `AgentRunService`/run APIs, not reach into `AutobyteusLLM` internals to set session ids.
- The agent runtime must pass `logicalConversationId` as invocation metadata because it owns per-turn invocation and knows `agentId`.
- `AutobyteusLLM` is the only TypeScript class that should validate and translate invocation metadata into RPA server `conversation_id`; it must reject missing `logicalConversationId`.
- `AutobyteusClient` must not decide active vs resume behavior; it cannot know the RPA server cache state.
- RPA FastAPI endpoints must stay thin; `LLMService` owns session lifecycle and route selection.
- RPA UI integrators must not receive transcript arrays or cache state; they receive one `LLMUserMessage` per UI turn.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Agent run/agent context | `agentId`, memory dir, restore metadata | Server UI/API, application orchestration | Server code setting `AutobyteusLLM.conversationId` directly | Add invocation metadata at handler boundary |
| `AutobyteusLLM` | Renderer, required logical conversation id validation, response conversion | Agent runtime and direct LLM callers | Agent handler calling `AutobyteusClient` directly, or direct caller relying on generated identity | Expand `AutobyteusLLM` API/kwargs and require `logicalConversationId` |
| `AutobyteusClient` | HTTP serialization/media normalization | `AutobyteusLLM` | Renderer posting axios directly | Add request object method to client |
| RPA server `LLMService` | Session cache, model guard, resume prompt route | FastAPI endpoints | Endpoint creating RPA LLM or building resume prompt | Add service methods/helper |

## Dependency Rules

Allowed:

- `LLMUserMessageReadyEventHandler` must add `logicalConversationId` to kwargs for agent-driven calls.
- `AutobyteusLLM` may import AutoByteus conversation payload types and use `AutobyteusPromptRenderer`.
- `AutobyteusClient` may import the payload request type and media normalizer.
- RPA endpoints may import schemas and call `LLMService`.
- `LLMService` may import the new payload helper and `RPALLMFactory`.

Forbidden:

- `autobyteus-server-ts` must not depend on `AutobyteusLLM` internals or RPA server session internals.
- `AutobyteusClient` must not inspect the local `MemoryManager` or choose resume behavior.
- RPA UI integrators must not parse the full transcript payload.
- Python endpoint handlers must not own cache hit/miss or resume prompt policy.
- Do not keep old and new text payload paths side-by-side.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `LLMUserMessageReadyEventHandler -> BaseLLM.streamMessages(..., kwargs)` | LLM invocation metadata | Pass required `logicalConversationId` for AutoByteus RPA calls | `string` run id in `kwargs.logicalConversationId` | Generic metadata; ignored by other providers. |
| `AutobyteusLLM.resolveConversationId(kwargs)` | RPA conversation id | Require non-empty stable id and throw if missing | `logicalConversationId: string` | Only AutoByteusLLM consumes; no generated fallback. |
| `AutobyteusClient.sendMessage(request)` | RPA text HTTP request | POST non-streaming text request | `{ conversationId, modelName, payload }` | Replace positional args. |
| `AutobyteusClient.streamMessage(request)` | RPA text HTTP stream request | POST streaming text request | `{ conversationId, modelName, payload }` | Same payload as send. |
| FastAPI `POST /send-message`, `POST /stream-message` | RPA text LLM request | Validate request and stream/return response | `{ conversation_id, model_name, messages[{role, rendered content, media}], current_message_index }` | No `user_message` field. |
| `LLMService.send_message/stream_message` | RPA session invocation | Active/resume route and invoke RPA LLM | `conversation_id`, `model_name`, `messages`, `current_message_index` | Governing server owner. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `logicalConversationId` kwarg | Yes | Yes | Low | Name as logical id, not provider session id; validate as required for AutoByteus RPA text calls. |
| `AutobyteusSendMessageRequest` | Yes | Yes | Low | Request object carries all fields. |
| FastAPI request schema | Yes | Yes | Low | `conversation_id` + `current_message_index`. |
| `LLMService` session lookup | Yes | Yes | Low | Store model_name in session record. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Durable RPA chat identity | `logicalConversationId` | Yes | Low | Avoid `sessionId` because server session is transient. |
| Payload message | `AutobyteusConversationMessage` | Yes | Low | Keep scoped to AutoByteus RPA contract; content is already RPA-rendered text. |
| Server cache record | `ConversationSession` | Yes | Low | Store model + llm only. |
| Missing-session text | `resume prompt` / flattened transcript | Yes | Low | Do not call it persisted history; avoid special `Current user request` heading. |

## Applied Patterns (If Any)

- Adapter: `AutobyteusLLM` adapts AutoByteus core messages to the RPA server contract.
- Repository/persistence is not introduced; persistence remains existing memory stores.
- State map/session registry: RPA server `LLMService.conversations` remains the active session registry but with a tighter `ConversationSession` value.
- Builder: `llm_conversation_payload.py` builds resume prompt text for missing sessions and only flattens already-rendered message content.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/api/autobyteus-conversation-payload.ts` | File | AutoByteus RPA LLM transport | Shared TypeScript payload types/helpers for rendered transcript messages | LLM API-specific contract used by renderer/client/LLM | Generic OpenAI/provider message conversions |
| `autobyteus-ts/src/llm/prompt-renderers/autobyteus-prompt-renderer.ts` | File | Renderer | Full transcript rendering | Existing renderer location | HTTP calls, cache policy |
| `autobyteus-ts/src/llm/api/autobyteus-llm.ts` | File | LLM adapter | Effective id + client calls + cleanup | Existing AutoByteus LLM adapter | Memory restore logic |
| `autobyteus-ts/src/clients/autobyteus-client.ts` | File | HTTP facade | Request object posting and stream parsing | Existing RPA HTTP client | Transcript formatting decisions |
| `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | File | Agent turn handler | Add stable logical id kwarg | Existing invocation owner | Provider-specific HTTP details |
| `autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/api/schemas.py` | File | API DTOs | New message payload schema with rendered content | Existing schema location | Service policy |
| `autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/api/endpoints.py` | File | FastAPI facade | Forward new fields, update logs | Existing endpoints | Session creation/resume logic |
| `autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/services/llm_conversation_payload.py` | File | Payload helper | Select current message and build flattened transcript from already-rendered content | Supports service without bloating it | RPA LLM factory calls |
| `autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/services/llm_service.py` | File | Session owner | Active sessions, model guard, invocation route | Existing LLM service owner | Endpoint DTO definitions |
| Tests under `autobyteus-ts/tests/unit/...` | Files | Validation | Renderer/client/handler/unit coverage | Existing test layout | Live RPA/browser dependency |
| Tests under `autobyteus_rpa_llm_server/tests/services/...` | Files | Validation | Service route behavior | Existing Python service test layout | Live browser dependency |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/api` | Transport/adapter | Yes | Low | Already contains LLM provider adapters; payload file is provider-specific. |
| `autobyteus-ts/src/clients` | Transport | Yes | Low | HTTP facade only. |
| `autobyteus_rpa_llm_server/api` | Transport/API DTO | Yes | Low | Endpoint/schema only. |
| `autobyteus_rpa_llm_server/services` | Main-line service + off-spine helper | Yes | Medium | Keep resume helper concrete and service-owned; do not create generic utilities. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| TypeScript request payload | `{ conversation_id: "run-123", model_name: "gpt-5-instant-rpa", current_message_index: 3, messages: [{role:"system", content:"..."}, {role:"user", content:"Create a file"}, {role:"assistant", content:"<tool name=\"write_file\">...</tool>"}, {role:"user", content:"Now continue"}] }`, where `run-123` came from required `kwargs.logicalConversationId` | `{ conversation_id: randomUUID(), user_message: "Now continue" }`, missing `logicalConversationId` accepted silently, or a payload where tool calls are flattened into prose before crossing the client boundary | Shows explicit stable id and rendered transcript are both required; tool XML is already in assistant content. |
| RPA active session | Cache hit sends `LLMUserMessage(content="What is my name?")` only. | Cache hit sends resume prompt containing all prior messages again. | Avoids duplicate context in active UI conversation. |
| RPA missing session | Cache miss builds one flattened transcript message from already-rendered content, e.g. `System: ... / User: Create a file / Assistant: <tool name="write_file">...</tool> / Tool result ... / User: Now continue`. The last `User` block is the current turn; there is no separate `Current user request:` heading. | Cache miss expects structured tool payloads, parses/generates tool XML on the RPA server, treats every message uniformly without identifying the current request, adds a new section shape that differs from the transcript, flattens tool calls to vague prose, or starts empty conversation with only the latest user message. | Core restart recovery behavior and preserves tool-use history in the same XML shape AutoByteus used originally while making the one-message fallback resemble the original multi-message transcript. |
| Boundary rule | `Agent handler -> AutobyteusLLM -> AutobyteusClient`; `Endpoint -> LLMService -> RPA LLM`. | `AgentRunService -> AutobyteusClient` or `Endpoint -> RPALLMFactory` directly. | Prevents boundary bypass. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Let Python request schema accept both `user_message` and `messages` | Could allow older TS clients to keep working | Rejected | Replace tests/callers with message payload; remove single-message fields. |
| Keep TypeScript positional `sendMessage(conversationId, modelName, userMessage, ...)` and add optional history arg | Smaller call-site diff | Rejected | Use request object so identity, model, payload, current index are one subject. |
| Use only stable run id without transcript | Fixes TS restart only if RPA server still has old session | Rejected | Stable id plus transcript lets server recover when cache is missing. |
| Generated fallback UUID in `AutobyteusLLM` when `logicalConversationId` is missing | Would keep direct non-agent use working without explicit identity | Rejected | Require all AutoByteus RPA text callers to provide `logicalConversationId`; throw on missing id. |
| Persist RPA LLM server browser sessions | Could preserve exact UI conversation | Rejected for this scope | Missing-session semantic resume prompt; browser persistence is follow-up if ever needed. |
| Replay all previous turns into UI | More exact browser history | Rejected | Expensive, may trigger actions/tools/media again, and UI integrators do not expose safe replay. |

## Derived Layering (If Useful)

- Run/agent layer: server-ts and agent runtime know durable logical identity and local memory.
- LLM adapter layer: AutoByteus RPA LLM adapter renders/transports a transcript payload.
- RPA server service layer: owns transient browser-backed sessions and resume route.
- RPA UI layer: receives one user message and returns one response.

The layers are explanatory only; the governing rule is the ownership boundary above.

## Migration / Refactor Sequence

1. In `autobyteus-ts`, introduce `autobyteus-conversation-payload.ts` with the new message/payload/request types.
2. Replace `AutobyteusPromptRenderer` output with transcript payload rendering that converts structured tool payloads into canonical transcript content/XML before transport; update renderer unit tests.
3. Replace `AutobyteusClient.sendMessage`/`streamMessage` text LLM signatures with request-object methods; update client tests for normalized current media within message payload.
4. Update `AutobyteusLLM` to use the new renderer/client request object, require non-empty `logicalConversationId` from kwargs, reject missing identity, remove any generated fallback UUID path, and cleanup all used conversation ids.
5. Update `LLMUserMessageReadyEventHandler` to set `streamKwargs.logicalConversationId = agentId`; add/adjust unit coverage, including `AutobyteusLLM` missing-id rejection.
6. In the RPA server task worktree, replace `SendUserMessageRequest` schema with message-list/current-index shape.
7. Add `llm_conversation_payload.py` and update `LLMService` to store `ConversationSession`, validate model mismatch, route cache hit vs miss, and build missing-session prompts by flattening already-rendered message content.
8. Update FastAPI endpoints to forward new fields and remove old single-message logging/arguments.
9. Add Python service tests for cache-hit no-duplication, cache-miss resume prompt, current media materialization, and model mismatch.
10. Update endpoint E2E payloads to the new schema. Live E2E can remain skipped by environment when unavailable, but service-level regression must be executable without live browser.
11. Run targeted TypeScript and Python tests. Record any live E2E limitations.

## Key Tradeoffs

- Stable id alone is simpler but insufficient when the RPA server cache is absent; transcript payload is necessary for robust restore.
- Synthetic resume prompt is less exact than preserving browser state, but it is bounded, testable, and fits current RPA UI integrator contracts. Canonical XML generated by the TypeScript renderer from structured tool payloads preserves tool-call semantics even when the exact original raw assistant XML string is not stored.
- Removing the single-message API shape is a breaking internal contract change, but it avoids ambiguous dual-path behavior and makes future bugs easier to catch.
- Historical media is not replayed to avoid large payloads and duplicate uploads; current media remains supported.

## Risks

- Resume prompt quality depends on the working context contents and compaction quality.
- Very long restored contexts may produce large prompts; existing compaction policy should control this, but tests should include a modest transcript only.
- Direct external consumers of RPA server text endpoints must update to the new schema.
- Model mismatch behavior must be chosen and documented; reject is safer than silent replacement.

## Guidance For Implementation

- Do not modify the user's dirty RPA checkout. Use `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace-rpa-llm-session-resume` for RPA changes.
- Keep `autobyteus-server-ts` changes minimal. The server already restores run id/memory; do not bypass the `AutobyteusLLM` boundary from server-ts.
- Use request-object naming consistently in TypeScript. Avoid `sessionId` for the logical id; use required `logicalConversationId` internally and `conversation_id` only for the RPA server HTTP contract. Do not generate fallback UUIDs.
- Keep the RPA resume builder deterministic so tests can assert substrings/order, including canonical XML for historical tool calls. The expected shape is a flattened transcript whose final block is the current `User` message; do not add a separate `Current user request:` section.
- Service tests should use dummy RPA LLM classes and monkeypatch `RPALLMFactory.create_llm` to avoid browser dependencies.
- Add TypeScript renderer coverage for structured `ToolCallPayload` and `ToolResultPayload`; the AutoByteus RPA payload content must include canonical XML for historical tool calls and id/name/result/error records for tool results. Add TypeScript `AutobyteusLLM` coverage that missing `logicalConversationId` throws and no fallback UUID is generated. Add Python coverage that the RPA resume builder flattens rendered content without parsing tool structure.
- If implementation discovers a requirement gap (for example, historical media must be fully replayed), return to solution design before changing the architecture.
