# Design Spec

## Current-State Read

The prior RPA session-resume work correctly moved the AutoByteus RPA text contract from single latest `user_message` to structured `messages` plus `current_message_index`. The visible prompt construction, however, is now split across two owners:

- `autobyteus-server-ts` `UserInputContextBuildingProcessor` still has an old AutoByteus-provider first-turn workaround that prepends the system prompt into the first user message content.
- The RPA server now receives the structured system message separately and, on cache miss, `build_resume_prompt(...)` also flattens every role with visible headers and prepends browser-session recreation wording.

This causes two problems:

1. normal first calls can display resume/internal wording even though they are just normal cold cache starts; and
2. the RPA-visible prompt ownership is ambiguous because server-ts and the RPA server both compose first-turn RPA prompt shape.

The refactor must be careful: `UserInputContextBuildingProcessor` owns real user-context functionality that must remain intact, including context-file resolution, context block construction, sender headers, and processed context file preservation. The target change is narrow and must not rewrite that processor.

## Intended Change

Make the RPA server the sole owner of browser-visible cache-miss prompt construction from the structured message payload, while preserving the existing user-context processor's non-RPA-specific behavior.

- Remove only the AutoByteus-provider-specific system-prompt prepend from `UserInputContextBuildingProcessor`.
- Leave `autobyteus-ts` request assembly and `AutobyteusPromptRenderer` transcript/tool rendering unchanged.
- Replace the RPA server's visible `resume_prompt` concept with a neutral cache-miss browser input builder.
- Cache hit keeps the existing behavior: send only `current_message.content` and current media.
- Cache miss constructs one browser-visible `LLMUserMessage.content` from `messages[0:current_message_index + 1]` without any implementation-specific preamble.

## Terminology

- `Browser-visible input`: the exact `LLMUserMessage.content` submitted into the provider browser UI.
- `Cache hit`: the RPA server has an in-memory `ConversationSession` for `conversation_id`; the browser UI already has context.
- `Cache miss`: the RPA server creates a new `ConversationSession`; it must submit enough initial content for the browser UI to answer correctly.
- `First-call shape`: cache miss where the only non-system message through `current_message_index` is the current user message.
- `Multi-turn reconstruction`: cache miss where prior non-system messages exist before the current user message.

## Design Reading Order

Read from the flow first: `server-ts user input processing -> autobyteus-ts message assembly/rendering -> RPA server cache hit/miss routing -> browser-visible input builder`.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove the old server-ts AutoByteus-provider first-turn system-prompt prepend workaround.
- Remove the visible RPA `resume_prompt` wrapper wording from production behavior.
- Do not add heuristics to detect old memory snapshots where the first user message already includes system prompt text.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Incoming agent user input | Browser-visible RPA LLM user input | RPA server cache-miss input builder, with upstream processors preserving structured messages | Defines the exact visible prompt shape. |
| DS-002 | Primary End-to-End | RPA request with active session | Cached RPA LLM receives current message only | `LLMService` | Ensures active browser sessions do not duplicate context. |
| DS-003 | Bounded Local | `UserInputContextBuildingProcessor.process(...)` | Processed `AgentInputUserMessage` | `UserInputContextBuildingProcessor` | Ensures the refactor does not break context-file and sender-header functionality. |
| DS-004 | Bounded Local | RPA `prepare_conversation_payload(...)` | Current message + cache-miss browser input | RPA conversation payload helper | Centralizes validation and deterministic cache-miss formatting. |

## Primary Execution Spine(s)

- DS-001: `UserMessageReceivedEvent -> UserInputContextBuildingProcessor -> LLMRequestAssembler -> AutobyteusPromptRenderer -> AutobyteusClient -> RPA LLMService cache miss -> cache-miss browser input builder -> RPA LLM/browser UI`
- DS-002: `AutobyteusClient -> RPA LLMService cache hit -> current message materialization -> cached RPA LLM/browser UI`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | User input is formatted with context by server-ts, assembled into structured messages by autobyteus-ts, then the RPA server composes a single browser-visible input only when it has to create a browser session. | User input processor, request assembler, prompt renderer, RPA service, cache-miss input builder | RPA server owns final browser-visible cache-miss composition | Context files, system prompt as structured message, tool XML rendering, media materialization |
| DS-002 | If the RPA session exists, the browser already has prior context, so the service sends only the selected current user message. | RPA service, session cache, media materializer, RPA LLM | `LLMService` | Model mismatch guard, current media normalization |
| DS-003 | The user-context processor still resolves context files and formats the current input, but no longer performs AutoByteus/RPA-specific system prompt composition. | User input processor | `UserInputContextBuildingProcessor` | Context file resolver, prompt context builder, sender header map |
| DS-004 | The payload helper validates `current_message_index` and builds deterministic cache-miss content from the structured messages. | Payload helper | RPA conversation payload helper | Role labels, first-call shape detection, historical media references |

## Spine Actors / Main-Line Nodes

- `UserInputContextBuildingProcessor`: formats input/context without provider-specific RPA browser prompt composition.
- `LLMRequestAssembler`: maintains system prompt as structured message when needed and appends current user message.
- `AutobyteusPromptRenderer`: sends rendered role/content messages and rendered tool history.
- `LLMService`: owns RPA session cache hit/miss routing.
- RPA conversation payload helper: owns current-message validation and cache-miss visible input construction.
- RPA LLM/browser UI: receives one `LLMUserMessage` per service invocation.

## Ownership Map

| Owner | Owns | Must Not Own |
| --- | --- | --- |
| `UserInputContextBuildingProcessor` | Context file path safety, context block assembly, sender-type input headers, processed input content | RPA browser-visible first-turn/system prompt composition |
| `LLMRequestAssembler` | Structured message assembly from memory and system prompt | RPA browser prompt formatting |
| `AutobyteusPromptRenderer` | RPA HTTP payload shape and tool payload rendering into content | Cache hit/miss policy |
| `LLMService` | RPA conversation cache, model guard, cache hit/miss invocation policy, media materialization | Tool XML parsing or server-ts input formatting |
| RPA payload helper | Deterministic cache-miss browser input content | Provider-specific hidden/system channel emulation |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| RPA `/send-message` and `/stream-message` endpoints | `LLMService` | Validate HTTP schema and forward to service | Prompt construction policy |
| `AutobyteusClient.sendMessage/streamMessage` | AutoByteus LLM adapter/client boundary | Serialize payload to RPA server | Browser-visible cache-miss formatting |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| AutoByteus-provider system prompt prepend in `UserInputContextBuildingProcessor` | RPA server now receives structured `system` messages and owns cache-miss prompt construction | RPA payload helper cache-miss builder | In This Change | Preserve all other processor behavior. |
| Visible resume wrapper lines in `build_resume_prompt(...)` | User-visible implementation leakage | Neutral cache-miss browser input builder | In This Change | Remove remote browser/session/cache wording. |
| Literal `System:` formatting in RPA visible prompt | Normal first run did not show this header; user explicitly rejected it | Unlabeled system preface in cache-miss builder | In This Change | System content may appear, header must not. |
| `resume_prompt` naming in RPA helper/service | Encourages treating cache miss as visible special resume | Rename to `cache_miss_content` or `cache_miss_user_input` | In This Change | Keep behavior clear for tests/review. |

## Return Or Event Spine(s) (If Applicable)

No new return/event spine. Existing LLM responses continue through current RPA response handling and AutoByteus streaming/complete response paths.

## Bounded Local / Internal Spines (If Applicable)

- `UserInputContextBuildingProcessor`: `clone message -> resolve context files -> build context string -> format sender-specific content -> return processed message`.
  - The refactor only removes the provider-specific final-content override inside this local spine.
- RPA payload helper: `validate current user -> slice messages through current index -> split system preface and non-system transcript -> choose first-call or multi-turn formatting -> return prepared payload`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Context file local path resolver | DS-003 | `UserInputContextBuildingProcessor` | Resolve safe local paths and URLs | Keeps user input context readable and safe | Breaking existing file/context features |
| Sender-type header map | DS-003 | `UserInputContextBuildingProcessor` | Preserve `**[User Requirement]**` etc. | Existing prompt semantics | Losing agent/tool/system input clarity |
| Tool payload rendering | DS-001 | `AutobyteusPromptRenderer` | Convert structured tools to content/XML before transport | RPA server should be flatten-only | Tool parsing duplicated in RPA server |
| Historical media references | DS-004 | RPA payload helper | Mention historical media counts for prior non-current messages | Historical media is not reattached | Reuploading or dropping context silently |
| Current media materialization | DS-001/DS-002 | `LLMService` | Save current media sources to local paths | Browser UI needs local paths | Media handling mixed into prompt formatter |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| User input/context formatting | `UserInputContextBuildingProcessor` | Reuse, narrow modification | Existing owner is correct for context files and sender headers | N/A |
| Structured message assembly | `LLMRequestAssembler` | Reuse unchanged | Already provides system/user/working-context messages | N/A |
| Tool rendering | `AutobyteusPromptRenderer` | Reuse unchanged | Already renders tool calls/results into content | N/A |
| Cache-miss visible input | RPA conversation payload helper | Extend/rename | Existing helper already validates current index and formats cache-miss content | N/A |
| Session routing | `LLMService` | Reuse with naming update | Already owns cache hit/miss | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| server-ts agent customization | Input/context formatting only | DS-003 | User input processor | Reuse/narrow cleanup | Remove RPA prompt composition workaround only. |
| autobyteus-ts LLM request assembly/rendering | Structured messages and rendered tool content | DS-001 | Request assembler, renderer | Reuse unchanged | No TS renderer change expected. |
| RPA server LLM service | Session cache and invocation | DS-001/DS-002 | `LLMService` | Reuse | Cache hit remains current-only. |
| RPA server conversation payload helper | Cache-miss visible input construction | DS-004 | RPA payload helper | Extend/rename | Main implementation location. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-customization/processors/prompt/user-input-context-building-processor.ts` | server-ts agent customization | User input processor | Remove AutoByteus system prepend while preserving all other formatting | Same processor owns the branch today | Existing context-file helpers |
| `autobyteus-server-ts/tests/unit/agent-customization/processors/prompt/user-input-context-building-processor.test.ts` | server-ts tests | Processor tests | Update prepend expectation and preserve regression tests | Existing unit test location | N/A |
| `autobyteus_rpa_llm_server/services/llm_conversation_payload.py` | RPA server payload helper | Cache-miss content builder | Build neutral browser-visible input | Existing helper owns formatting | `ConversationMessage` |
| `autobyteus_rpa_llm_server/services/llm_service.py` | RPA server service | Session routing | Use renamed cache-miss content field | Existing service owns routing | `PreparedConversationPayload` |
| `autobyteus_rpa_llm_server/tests/services/test_llm_service.py` | RPA server tests | Service/helper tests | Cover first-call, multi-turn, tool, and cache-hit shapes | Existing test file | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Cache-miss browser input construction | Existing `llm_conversation_payload.py` | RPA server payload helper | Already centralizes validation/formatting | Yes | Yes | Generic provider prompt kitchen sink |
| Sender-role labels for non-system transcript blocks | Existing `llm_conversation_payload.py` constants | RPA server payload helper | Only used by cache-miss builder | Yes | Yes | Parallel formatter in `LLMService` |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `PreparedConversationPayload.current_message` | Yes | Yes | Low | Keep. |
| `PreparedConversationPayload.cache_miss_content` / `cache_miss_user_input` | Yes | Yes | Low | Rename away from `resume_prompt`. |
| `ConversationMessage.role/content/media` | Yes | Yes | Low | No schema change. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-visible-resume-prompt-cleanup/autobyteus-server-ts/src/agent-customization/processors/prompt/user-input-context-building-processor.ts` | server-ts agent customization | User input processor | Preserve context formatting; remove only AutoByteus first-turn system prepend | Minimal source of old workaround | Existing processor helpers |
| `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace-rpa-visible-resume-prompt-cleanup/autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/services/llm_conversation_payload.py` | RPA server payload helper | Cache-miss browser input builder | Validate current user and build neutral cache-miss input | Central formatting owner | `ConversationMessage` |
| `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace-rpa-visible-resume-prompt-cleanup/autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/services/llm_service.py` | RPA server service | RPA session router | Choose current content on cache hit vs cache-miss content on cache miss | Existing routing owner | `PreparedConversationPayload` |

## Ownership Boundaries

- Upstream server-ts owns input enrichment and user/context formatting, not RPA browser prompt composition.
- autobyteus-ts owns structured message assembly and tool rendering before transport.
- RPA server owns how structured messages become one browser-visible input when a browser session must be created.
- RPA browser UI integrators receive a finished `LLMUserMessage` and should not know about transcript construction policy.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| RPA `LLMService` text send/stream methods | Session cache, media materialization, cache-miss input builder | FastAPI endpoints | Endpoint builds cache-miss prompt directly | Add/adjust service/helper API |
| `UserInputContextBuildingProcessor.process(...)` | Context file resolution, context block formatting, sender headers | Agent input event handler | RPA server-specific prompt policy in this processor | Move policy to RPA server helper |
| `AutobyteusPromptRenderer.render(...)` | Tool payload rendering and HTTP message shape | `AutobyteusLLM` | RPA server parses TypeScript tool payloads | Extend renderer if content shape changes |

## Dependency Rules

Allowed:

- `UserInputMessageEventHandler -> UserInputContextBuildingProcessor` for input formatting.
- `LLMRequestAssembler -> MemoryManager` for working context and system message assembly.
- `AutobyteusLLM -> AutobyteusPromptRenderer -> AutobyteusClient` for RPA HTTP payload generation.
- RPA endpoints -> `LLMService` -> RPA payload helper.

Forbidden:

- `UserInputContextBuildingProcessor` must not branch on AutoByteus/RPA provider to compose browser-visible system prompt text.
- RPA server must not parse or generate tool XML from structured tool payloads.
- RPA cache-miss builder must not emit implementation-specific resume/session/cache wording.
- RPA cache-miss builder must not emit a literal `System:` header.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `UserInputContextBuildingProcessor.process(message, context, event)` | Processed input message | Context enrichment and sender formatting | Agent context + input message | Remove provider-specific RPA prompt branch only. |
| `prepare_conversation_payload(messages, current_message_index)` | RPA conversation payload | Validate current user and build cache-miss content | Message list + current index | Rename field away from `resume_prompt`. |
| `LLMService.send_message/stream_message(...)` | RPA text invocation | Cache hit/miss routing and media materialization | `conversation_id`, `model_name`, messages, current index | No HTTP schema change. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `UserInputContextBuildingProcessor.process` | Yes after removal | Yes | Low | Remove RPA-specific prompt branch. |
| `prepare_conversation_payload` | Yes | Yes | Low | Rename and update tests. |
| `LLMService` text methods | Yes | Yes | Low | Keep cache hit/miss ownership. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Cache-miss prompt field | `resume_prompt` -> `cache_miss_content` or `cache_miss_user_input` | Yes after rename | Medium currently | Rename to avoid visible resume semantics. |
| Formatter function | `build_resume_prompt` -> `build_cache_miss_user_input` | Yes after rename | Medium currently | Rename. |
| User input processor | `UserInputContextBuildingProcessor` | Yes | Low | Preserve name/responsibility. |

## Applied Patterns (If Any)

- Adapter/formatter: RPA payload helper adapts structured message payload into browser-visible text for cache miss.
- Manager/service: `LLMService` coordinates session cache and invocation lifecycle.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-customization/processors/prompt/user-input-context-building-processor.ts` | File | server-ts user input processor | Context/user input formatting | Existing owner | RPA browser visible prompt composition |
| `autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/services/llm_conversation_payload.py` | File | RPA payload helper | Cache-miss visible input construction | Existing formatting helper | Resume wrapper/meta wording, tool parser |
| `autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/services/llm_service.py` | File | RPA service | Cache hit/miss routing | Existing cache owner | Formatting details beyond selecting cache hit vs cache miss content |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-customization/processors/prompt` | Off-Spine Concern | Yes | Low | Input processors are correct location for context formatting. |
| `autobyteus_rpa_llm_server/services` | Main-Line Domain-Control + helper | Yes | Low | Existing flat service/helper layout is small and readable. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Cache-miss first call with system | `<system prompt>\n\n**[User Requirement]**\nHello` | `System:\n<system prompt>\n\nUser:\n**[User Requirement]**\nHello` | Preserves old first-run visible shape while using structured messages. |
| Cache-miss first call without system | `**[User Requirement]**\nHello` | `User:\n**[User Requirement]**\nHello` | First-call shape must not gain extra role headers. |
| Cache-miss multi-turn | `<system prompt>\n\nUser:\nfirst\n\nAssistant:\nanswer\n\nTool:\nTool result...\n\nUser:\nnext` | Visible resume preamble or `System:` block | Prior turns need role labels; implementation meta text does not. |
| Server-ts processor | Keep context file and sender header formatting; remove only AutoByteus prepend | Rewrite/delete context processor | Prevent breaking unrelated prompt-context functionality. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Detect old first user messages that already contain system prompt and deduplicate | Existing runs may have legacy embedded system content | Rejected | Clean target uses structured system message and no server-ts AutoByteus prepend. |
| Keep server-ts AutoByteus prepend and make RPA server ignore system role | Would be a smaller one-sided patch | Rejected | It preserves wrong ownership and hides duplicate representation. |
| Keep visible resume preamble for true resume only | Could guide model behavior | Rejected | User explicitly wants resumed prompt to look as normal as possible. |

## Derived Layering (If Useful)

- server-ts customization layer: user input formatting and context enrichment.
- autobyteus-ts LLM layer: structured message assembly/rendering.
- RPA server service layer: session cache and browser-visible cache-miss input construction.

## Migration / Refactor Sequence

1. In server-ts, update `UserInputContextBuildingProcessor` to remove only the AutoByteus-provider first-turn system prepend path. Preserve context-file resolution, context block construction, sender headers, and processed message mutation.
2. Update server-ts unit tests: replace the “prepends system prompt for first-turn AUTOBYTEUS models” expectation with “does not prepend system prompt for AUTOBYTEUS models,” while keeping existing context and sender-header tests intact.
3. In RPA server `llm_conversation_payload.py`, rename `resume_prompt` / `build_resume_prompt` to cache-miss terminology and implement neutral construction:
   - validate current user;
   - gather system contents as unlabeled preface;
   - gather non-system messages through current index;
   - if only current user exists, append raw current content;
   - otherwise format non-system blocks with `User:`, `Assistant:`, and `Tool:`.
4. In `LLMService`, use the renamed cache-miss field when `created=True`; keep cache hit current-only.
5. Update RPA tests for first-call shape, multi-turn shape, no wrapper strings, no `System:`, tool preservation, and cache-hit unchanged behavior.
6. Run focused server-ts and RPA unit tests.

## Key Tradeoffs

- Including system content as an unlabeled preface on cache miss preserves first-run behavior while avoiding visible `System:`. This is better than dropping system content or keeping server-ts provider-specific mutation.
- Multi-turn cache-miss prompts use role headers for non-system turns because a single browser-visible message must preserve who said what. First-call shape deliberately avoids a `User:` header to preserve old visible behavior.
- No compatibility deduplication keeps the implementation simple and clean but may not perfectly handle legacy in-progress snapshots created before this refactor.

## Risks

- Accidentally rewriting the user-context processor could break context-file behavior. Mitigation: narrow patch and keep existing tests.
- If RPA base branch changes before implementation, the RPA worktree may need rebasing from the new integration branch.
- Very large cache-miss transcripts remain governed by existing working-context compaction.

## Guidance For Implementation

- Treat this as a small surgical refactor.
- Do not change the AutoByteus HTTP request schema.
- Do not change `AutobyteusPromptRenderer` unless tests expose a direct issue.
- Preserve all user-context processor behavior except the AutoByteus-provider system prepend.
- Add negative assertions for wrapper strings and `System:` in RPA production/test coverage.
- Keep the RPA server flatten-only with respect to tool content: do not parse or generate tool XML in Python.
