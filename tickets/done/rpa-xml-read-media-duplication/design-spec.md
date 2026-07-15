# Design Spec

## Current-State Read

The affected path starts after a model emits a tool call and AutoByteus executes it. `ToolResultContinuationBuilder` persists completed `ToolResultEvent` records into canonical working history, collects any returned `ContextFile` media, and returns a `SenderType.TOOL` `AgentInputUserMessage`. The current message content is an internal marker: `Native API tool continuation` for native/API tool-call mode and `Tool history continuation` for XML/text-history mode.

For text-only native/API tool continuations, `AgentInputPipeline` chooses `tool_history_only`, so even though semantic continuation text can be built internally, no user message is appended and native renderers rely on structured tool-result history. That path is mostly fine. For media tool continuations, `AgentInputPipeline` must choose `append_user_message` so image/audio/video can be attached to the next request. The synthetic user/media carrier therefore becomes model-visible provider input.

Observed provider effects:

- OpenAI-compatible chat: the assistant tool call and `role: "tool"` result are present, then the media carrier renders as a `role: "user"` content array. For images this means a text part containing `Native API tool continuation` plus an `image_url` part.
- OpenAI Responses: the function-call output is present, then the media carrier renders as a `message` with `input_text` containing the generic marker plus image input parts.
- DeepSeek: inherits the OpenAI-compatible renderer and therefore inherits the same carrier text behavior when media is attempted.
- Gemini native API: function responses are rendered as `role: "user"` `functionResponse` parts, then the media carrier renders as another user turn with generic marker text plus `inlineData`.
- AutoByteus/RPA: the browser-backed provider receives current input through the RPA server. The server receives a full rendered transcript including `role: "tool"` messages, but cache-hit browser sends only current input/media. Therefore the RPA path must have a clear owner for composing relevant completed tool-result text plus current user continuation into the browser-visible input.

Live experiments confirmed the diagnosis. Generic `Tool history continuation` plus staged audio reproduced the repeated `read_media_file` call. Replacing the generic marker with completed-tool wording allowed the model to continue to transcription/`write_file` output instead of repeating `read_media_file`. Earlier experiments included XML-format wording to mirror the user's initial prompt setup, but the user later clarified that generated post-tool-result continuation text must not include XML formatting/backtick guidance because it is too late and redundant after the tool call has already been emitted.

Constraints the target design must respect:

- Keep AutoByteus runtime/memory as the owner of canonical tool invocation/result history.
- Keep `read_media_file` returning `ContextFile` for model-side media understanding.
- Keep provider renderers responsible for provider-specific payload shapes.
- Coordinate with the linked RPA project ticket for browser current-input composition instead of duplicating RPA-only policy in TypeScript and Python.
- Do not add XML-formatting/backtick guidance to generated continuation text.
- Do not add parser/tool-executor duplicate suppression as the primary fix.

## Intended Change

Replace generic continuation marker text with a concise completed-tool-result notification at the source where tool continuations are built. The builder should always create semantic continuation text for the completed tool batch; the later request-mode/provider path decides whether that synthetic user message is appended, ignored in favor of structured tool history, or composed into an RPA browser current input.

For a single successful tool result, generated synthetic continuation text must be:

```text
The <tool_name> tool call completed successfully.
```

For the reported media case this is exactly:

```text
The read_media_file tool call completed successfully.
```

The design intentionally does **not** add XML formatting guidance, markdown-backtick guidance, future-tool-call guidance, or any parser-format instruction to tool-continuation text. That instruction belongs in the user's original request when needed, before the model emits a tool call.

For AutoByteus/RPA, the final implementation split must ensure that completed local tool results are not omitted from browser-visible current input. The preferred cross-project split is:

1. TypeScript AutoByteus builds semantic continuation text and renders canonical `role: "tool"` messages in the RPA payload.
2. The RPA server/project composes the browser cache-hit current input from relevant completed `role: "tool"` messages plus the current user continuation message, because it owns the browser send boundary.
3. TypeScript must not add duplicate RPA-only tool-result text if the RPA server owns that composition. If the implementation temporarily keeps TS-side synthesis, it must be reconciled with the RPA ticket to avoid duplicate tool-result blocks.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Tightening
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant plus Boundary Or Ownership Issue
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, targeted
- Evidence: Raw traces show repeated model/tool phases; API renderer inspection shows generic marker text leaks into media carrier user messages; RPA cache-hit inspection shows browser-visible input can omit local tool results unless the RPA current-input boundary composes them.
- Design response: Give model-visible continuation text one small owner, keep request-mode metadata internal, and split RPA browser-current-input composition into the RPA project ticket.
- Refactor rationale: The old design treated `Tool history continuation` / `Native API tool continuation` as both internal plumbing and provider-visible prompt content. Those meanings must be separated.
- Intentional deferrals and residual risk: Gemini `functionResponse` + `inlineData` physical turn merging is deferred. RPA-server composition is tracked as a separate linked ticket in `/Users/normy/autobyteus_org/autobyteus-worktrees/rpa-tool-result-current-input-composition`.

## Terminology

- `Internal continuation marker`: framework-only request-mode/debug wording such as `Tool history continuation` or `Native API tool continuation`.
- `Completed-tool notification`: model-visible concise sentence stating that the tool call completed successfully.
- `Media carrier message`: a synthetic user message needed to attach returned media to the next LLM request.
- `RPA current input`: the text/media that the RPA server sends to the live browser-backed model for the current turn.
- `Trailing tool result`: a final `ToolResultPayload` / rendered `role: "tool"` message, or group of such messages, after the latest user message.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Model emits tool call | Next provider request receives tool result/media continuation | Agent runtime + provider renderer/server boundary | Main bug path; marker text currently leaks into model-visible media continuation. |
| DS-002 | Primary End-to-End | RPA XML `read_media_file` call | Gemini browser receives current continuation and uploaded audio | TypeScript renderer + linked RPA server ticket | User-reported repeated upload/tool-call loop. |
| DS-003 | Bounded Local | `ToolResultContinuationBuilder.build(...)` | `AgentInputUserMessage` for continuation | Tool continuation builder | Source of current generic text and correct source for completed-tool notification. |
| DS-004 | Cross-project Boundary | RPA payload with `role: "tool"` messages and current user | Browser-visible cache-hit input | RPA server current-input composer | Ensures RPA does not omit local tool results that API models receive structurally. |
| DS-005 | Return-Event | Assistant XML/native tool response | `ToolResultEvent` and raw trace/UI Activity | Parser/native tool adapter + ToolPhase + memory/events | Confirms repeated Activity cards represent real repeated tool executions. |

## Primary Execution Spine(s)

`Assistant tool call -> ToolPhase -> ToolResultEvent -> ToolResultContinuationBuilder -> AgentInputPipeline request-mode decision -> LLMRequestAssembler -> provider prompt renderer / RPA payload renderer -> provider/client transport -> next model turn`

RPA-specific expansion:

`RPA assistant XML -> XML streaming parser -> ReadMediaFile -> ToolResultContinuationBuilder -> semantic continuation/media carrier -> AutobyteusPromptRenderer RPA payload -> AutobyteusClient media staging -> RPA LLMService current-input composition -> GeminiAppUIIntegrator upload/text send -> browser-backed Gemini app`

## Ownership Map

- AutoByteus runtime/memory owns canonical tool protocol truth: assistant tool calls, tool invocation IDs, results, errors, and traces.
- `ToolResultContinuationBuilder` owns the synthetic continuation input object. Because its `content` can become provider-visible when media is attached, it must no longer use internal marker text there.
- A small shared formatter owns completed-tool notification text so the builder and any RPA payload/current-input path do not duplicate wording.
- Provider renderers own provider-specific payload structure, not XML-format prompt policy.
- `AutobyteusPromptRenderer` owns TypeScript conversion to `AutobyteusConversationPayload`, including rendered `role: "tool"` content and current user/media arrays.
- The linked RPA project owns browser current-input composition on cache-hit because it owns the live browser send boundary.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Model-visible `Tool history continuation` content | Confuses XML/RPA model and caused repeated media tool calls | Completed-tool notification formatter used by `ToolResultContinuationBuilder` | In This Change | Internal metadata may still use continuation names. |
| Model-visible `Native API tool continuation` content | Leaks internal framework wording into API media carrier user messages | Completed-tool notification formatter used by `ToolResultContinuationBuilder` | In This Change | Native text-only tool result history remains structured-only. |
| Generated XML-backtick/formatting guidance | Too late after the model has already emitted the XML tool call and outside this fix's responsibility | User's original prompt when needed | In This Change | Remove code/tests/constants such as `XML_TOOL_CALL_MARKDOWN_INSTRUCTION` and `includeXmlToolCallInstruction`. |
| Parser/tool-executor duplicate-suppression workaround | Masks symptom and can block legitimate calls | Correct continuation semantics/result visibility | In This Change | Do not implement. |

## Bounded Local / Internal Spines

- Parent owner: `ToolResultContinuationBuilder`
  - Chain: `ToolResultEvent[] -> ingest canonical tool results -> collect ContextFile media -> build completed-tool notification -> attach metadata/context files -> AgentInputUserMessage`
  - Why it matters: source of provider-visible media-carrier text.

- Parent owner: RPA current-input composition (linked RPA project)
  - Chain: `ConversationMessage[] + current_message_index + cache-hit state -> select relevant local tool messages/current user -> compose one browser-visible input -> materialize current media -> browser send`
  - Why it matters: RPA browser cache-hit cannot consume API-native `role: "tool"`; it needs text composition at the browser boundary.

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why |
| --- | --- | --- | --- |
| Build tool-continuation input | Agent loop/tool continuation | Extend | Existing builder owns `AgentInputUserMessage` content and context files. |
| Share completed-tool wording | Agent message/tool continuation utilities | Create small owned utility | Needed by builder and RPA path; avoids duplicate wording. |
| Render provider payloads | LLM prompt renderers | Reuse/extend tests | API renderers inherit fixed text from builder. |
| RPA browser current input | RPA server `llm_conversation_payload.py` / `llm_service.py` | Linked separate ticket | RPA project owns browser cache-hit send boundary. |
| Duplicate prevention | Parser/ToolPhase | Do not extend | Not root cause. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern |
| --- | --- | --- | --- |
| `autobyteus-ts/src/agent/message/tool-continuation-display-text.ts` | Agent message utilities | Completed-tool notification text | Provider-visible concise success/error wording; no XML-format instruction option. |
| `autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts` | Agent loop/tool continuation | Tool continuation builder | Use completed-tool notification content instead of internal marker content. |
| `autobyteus-ts/src/llm/prompt-renderers/autobyteus-prompt-renderer.ts` | LLM prompt renderers | AutoByteus/RPA payload adapter | Render existing tool result messages/current user/media without adding XML guidance; avoid duplicating RPA-server composition policy. |
| `autobyteus-ts/tests/unit/agent/message/tool-continuation-display-text.test.ts` | Tests | Display text coverage | Assert success/multiple/error wording and absence of internal markers/XML guidance. |
| `autobyteus-ts/tests/unit/agent/loop/tool-result-continuation-builder.test.ts` | Tests | Builder unit coverage | Assert completed-tool wording, metadata remains internal, markers absent, no XML guidance. |
| `autobyteus-ts/tests/unit/llm/prompt-renderers/*` | Tests | Renderer coverage | Assert media carrier text and RPA payload behavior with no markers and no XML guidance. |

## Dependency Rules

- `tool-result-continuation-builder.ts` may depend on the display-text helper.
- `tool-continuation-display-text.ts` must not depend on provider renderers, RPA server code, filesystem/media code, memory managers, or XML parser/format mode.
- TypeScript renderer code must not emit generated XML-formatting/backtick guidance.
- Parser and ToolPhase must not suppress repeated same-name/same-args tool calls as this fix.
- RPA server current-input composition changes belong in the linked RPA project ticket, not as Python edits in this TS worktree.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `buildToolContinuationDisplayText(summaries)` | Model-visible completed-tool notification | Build concise text | Array of normalized tool summaries | No XML-format option. |
| `ToolResultContinuationBuilder.build(processedEvents, options)` | Same-turn tool continuation input | Ingest tool results, collect context files, produce `AgentInputUserMessage` | `ToolResultEvent[]`, context, turn | Content changes from marker to completed-tool text. |
| `AutobyteusPromptRenderer.render(messages)` | AutoByteus/RPA conversation payload | Convert internal messages to RPA server payload | Ordered `Message[]` | Should not own RPA browser cache-hit tool-result composition once linked RPA ticket implements it. |
| RPA `/send-message` | Browser-backed model send | Compose/send current browser input and media | `conversation_id`, `model_name`, messages, current index | Separate RPA ticket. |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| API image media continuation | User text part: `The read_media_file tool call completed successfully.` plus `image_url` part | User text part: `Native API tool continuation` plus `image_url` | Fixes confusing marker in API mode while preserving media attachment. |
| RPA audio media continuation | Browser-visible input includes completed-tool wording and current audio | Browser-visible input only says `Tool history continuation` while audio is uploaded | Live repro repeated the tool in the bad shape. |
| XML guidance | No generated XML guidance in continuation text | Appending “If you output XML tool-call text...” after the tool call result | User clarified this is too late/redundant and belongs in original prompt. |
| Duplicate handling | Make completed result visible so model continues | Suppress identical `read_media_file` args in ToolPhase | Suppression can break legitimate repeated operations. |

## Backward-Compatibility Rejection Log

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep marker text and add another sentence after it | Smallest code change | Rejected | Replace marker text entirely in model-visible content. |
| Keep old marker for API but fix only RPA | Initial bug was RPA | Rejected | User correctly identified API media carrier text as wrong too. |
| Generated XML-backtick continuation guidance | Early live probes included it | Rejected after user correction | Remove constants/options/tests; rely on user's original prompt when XML guidance is needed. |
| Parser-level or ToolPhase duplicate guard | Quick stop for repeated upload | Rejected | Correct result visibility instead of suppressing legitimate calls. |
| TS-only RPA current-message composition as final answer | Avoids cross-project RPA change | Partially superseded | Linked RPA ticket should own browser cache-hit composition; TS should avoid duplicate output. |

## Migration / Refactor Sequence

1. Ensure `autobyteus-ts/src/agent/message/tool-continuation-display-text.ts` has no XML-format/backtick instruction constant or option.
2. Update `ToolResultContinuationBuilder` to map `ToolResultEvent[]` into display-text summaries and use completed-tool text for `AgentInputUserMessage.content`.
3. Keep `TOOL_CONTINUATION_MODE_METADATA_KEY`, `NATIVE_API_TOOL_CONTINUATION_MODE`, and `TOOL_HISTORY_ONLY_CONTINUATION_MODE` as internal metadata; do not use those strings as prompt text.
4. Leave `AgentInputPipeline` request-mode behavior unchanged: context files mean `append_user_message`; tool-history-only without context files remains structured-only for native/API paths and does not append that user message.
5. Remove all XML-instruction code/tests from implementation (`XML_TOOL_CALL_MARKDOWN_INSTRUCTION`, `includeXmlToolCallInstruction`, XML-mode appending, and related assertions).
6. Reconcile any TS-side RPA text-only current-message synthesis with the linked RPA server ticket. Avoid duplicate browser-visible tool-result blocks if the RPA server composes tool results plus current user.
7. Add/update unit tests for:
   - display-text helper single success, multiple success/error as needed, marker absence, XML-guidance absence;
   - `ToolResultContinuationBuilder` no longer returns marker content and does not append XML guidance;
   - OpenAI-compatible image media rendering has completed-tool text and no marker/XML guidance;
   - Gemini media rendering has completed-tool text and no marker/XML guidance, if direct fixture coverage is straightforward;
   - AutoByteus/RPA media current input has completed-tool text and audio attachment without marker/XML guidance.
8. Run focused tests from `autobyteus-ts` after implementation rework.
9. Do not resume API/E2E until implementation and code review pass the corrected scope.

## Key Tradeoffs

- Builder-source fix versus renderer-only replacement: fixing the builder makes the synthetic continuation message semantically correct everywhere. Request-mode still decides whether the message is appended/used.
- Minimal wording versus verbose guidance: minimal wording matches the user's preference and avoids prompt-policy creep.
- XML instruction removal: removing it keeps the fix focused and avoids late/redundant guidance after the tool call was already emitted.
- TS-side versus RPA-side result visibility: the RPA server is the clean owner for browser current-input composition, but TS must still provide semantic continuation text and rendered tool messages.

## Risks

- Multiple mixed success/error tool results need concise wording that is clear without dumping large result payloads.
- Provider-specific media support remains separate: OpenAI chat currently supports images and mp3/wav audio; unsupported media may still be skipped by existing renderer logic.
- The existing implementation/code-review/API-E2E artifacts may still mention XML guidance; this design correction supersedes those sections until implementation is reworked.

## Guidance For Implementation

- Keep the display-text helper small and deterministic.
- Do not include internal phrases `Tool history continuation` or `Native API tool continuation` in any model-visible synthetic user/media message.
- Do not include generated XML-formatting/backtick guidance in continuation text.
- Do not add broad prompt instructions beyond the completed-tool sentence unless a future requirement explicitly asks for it.
- Preserve current media/reference-file mechanics.
- Coordinate RPA current-input composition through the linked RPA project ticket rather than expanding TS prompt text indefinitely.
