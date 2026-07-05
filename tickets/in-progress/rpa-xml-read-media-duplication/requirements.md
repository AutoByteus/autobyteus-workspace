# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined after user design correction on 2026-07-05. Approved scope removes all generated XML-backtick continuation guidance.

## Goal / Problem Statement

Fix the tool-result continuation behavior that leaks internal framework text (`Tool history continuation` / `Native API tool continuation`) into model-visible prompts. The immediate user-reported failure is an AutoByteus/RPA XML run where `read_media_file` succeeded, the same audio was uploaded again, and the RPA model repeatedly emitted the same `read_media_file` XML block. The broader defect is that media tool continuations use a synthetic user/media carrier message whose text is an internal continuation marker instead of a completed-tool-result notification.

Correct behavior: after a tool call succeeds, AutoByteus should build semantic synthetic continuation text that says the tool call completed successfully. The request mode/provider path then decides whether that synthetic user message is actually appended or used. For the single-tool `read_media_file` case, the intended minimal wording is:

```text
The read_media_file tool call completed successfully.
```

Generated tool-continuation text must not add XML formatting/backtick guidance. If XML formatting guidance is needed, it belongs in the user's original prompt before the model emits the XML tool call, not in the post-tool-result continuation.

## Investigation Findings

- The screenshot symptom is backed by persisted backend traces, not just frontend rendering. The run at `/Users/normy/.autobyteus/server-data/memory/agents/audiotranscriber_a97002aa744844c2a3759edd9923cb80/raw_traces.jsonl` contains three separate assistant XML responses, three separate pending tool invocations, and three separate tool results for the same `read_media_file` path.
- The affected run used `agentDefinitionId=audio-transcriber`, `llmModelIdentifier=gemini-3.5-flash-app-rpa:autobyteus@localhost:51739`, `llmConfig={ thinking_level: "high" }`, `autoExecuteTools=true`, and started at `2026-07-05T11:13:37.289Z`.
- The working context snapshot shows the loop shape: original user request -> assistant XML `read_media_file` -> local tool result -> synthetic user message `**[Tool Execution Result]** Tool history continuation` with the audio attached -> assistant repeats the same XML call.
- `read_media_file` returns a `ContextFile` for image/audio/video files. The media bytes are attached to the next LLM request by context-file handling; this is expected.
- `ToolResultContinuationBuilder` records completed tool results into memory and returns an `AgentInputUserMessage` whose content is currently either `Tool history continuation` or `Native API tool continuation`. For media tool results, `AgentInputPipeline` must use `append_user_message` so the media can be attached to the next request.
- In OpenAI-compatible rendering, a `read_media_file` image continuation currently becomes a normal `role: "tool"` result followed by a synthetic `role: "user"` media message whose text is `Native API tool continuation`. Therefore the confusing marker leaks into API mode too, although the structured tool result is still present.
- In Gemini native API rendering, the structured `functionResponse` is rendered as a `role: "user"` part, and the media continuation becomes another user turn with generic `Native API tool continuation` text plus `inlineData`.
- DeepSeek currently extends the OpenAI-compatible renderer, so it inherits the same synthetic media-carrier text shape, subject to the actual endpoint/model's media support.
- In AutoByteus/RPA rendering, the problem is worse because cache-hit sends only `current_message.content` and current-message media to the browser-backed model. Historical local `tool` messages are not browser-visible, so the RPA model saw only `Tool history continuation` plus the uploaded audio.
- A live RPA reproduction against `https://localhost:51739` reproduced the bug: first request returned fenced `read_media_file` XML; second cache-hit request with staged audio and generic `Tool history continuation` returned the same `read_media_file` XML again.
- Live candidate experiments showed that replacing the generic continuation marker with completed-tool wording allowed the model to proceed to transcription/`write_file` output instead of repeating `read_media_file`. Some probes included XML-format wording to match the user's original experiment setup, but final requirements intentionally exclude any generated XML-format instruction from this continuation fix.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Tightening
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant plus Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Targeted refactor needed
- Evidence basis: The runtime has canonical assistant/tool/tool-result history, but the synthetic media-carrier message uses an internal marker as provider-facing text. API renderers expose that marker alongside media. The RPA provider boundary additionally loses historical tool-result visibility on cache hits, so the current browser message must be self-contained when RPA owns that browser send.
- Requirement or scope impact: The fix must change the model-visible continuation text at the tool-continuation owner and ensure the AutoByteus/RPA path has self-contained result visibility as needed. It must not add XML formatting guidance and must not rely on duplicate suppression in the parser/tool executor.

## Recommendations

1. Replace provider-facing generic continuation marker text with a concise completed-tool notification generated from the processed `ToolResultEvent` records. For a single successful `read_media_file`, use `The read_media_file tool call completed successfully.`
2. Keep internal continuation metadata (`tool_continuation_mode`, trace boundary labels, request mode selection) as internal plumbing. Internal labels may remain in logs/memory-boundary metadata, but they must not be the text sent to a model as a user/media message.
3. Preserve the existing request-mode decision model: always construct semantic completed-tool continuation text, but only append/use the synthetic user message when the selected path needs a user message, such as media carriers or AutoByteus/RPA browser current-message sends. Native/API text-only tool continuations can continue using structured tool-result history without appending a user message.
4. For AutoByteus/RPA, ensure browser-visible current input includes the latest completed tool result as needed. If this responsibility is implemented in the RPA server/project, the TS side should avoid duplicating RPA-only composition policy beyond providing rendered tool messages and semantic continuation text.
5. Add regression coverage for the builder text and affected provider/RPA rendering paths.
6. Do not add XML-backtick/formatting guidance to generated tool-continuation text.
7. Do not add a global duplicate-execution guard for repeated tool names/arguments; that would hide the symptom and block legitimate repeated tool calls.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: An API/native-tool model emits `read_media_file` for an image; AutoByteus returns a structured tool result and attaches the image in a user/media carrier whose text says the tool call completed successfully.
- UC-002: An AutoByteus/RPA XML model emits `read_media_file` for audio; AutoByteus executes the tool once, uploads/attaches the audio once for the continuation, and the current browser-visible text says the tool call completed successfully.
- UC-003: AutoByteus/RPA text-only tool results are visible to the browser-backed model through the appropriate RPA current-input composition, without losing the latest completed tool result.
- UC-004: Existing native API text-only tool continuations continue to use structured tool-result history without adding unnecessary user messages.
- UC-005: Legitimate separate tool calls with materially different arguments or tool purposes still execute and render separately.

## Out of Scope

- Changing `read_media_file` media decoding/transcription semantics; it should continue returning media `ContextFile` results for model-side media understanding.
- Broad redesign of XML streaming parser states unless a separate parser defect is found by tests.
- Adding generated XML-formatting or markdown-backtick guidance to tool-continuation messages.
- Reworking Docker deployment, model selection UI, or Gemini app UI automation beyond the current-message/tool-result visibility contract needed here.
- Provider-specific payload fusion such as forcing Gemini `functionResponse` and `inlineData` into one physical user turn. That can be considered later; the in-scope invariant is semantic text correctness and result visibility.
- Adding a global duplicate-execution guard that suppresses repeated tool calls solely by same tool name/arguments.

## Functional Requirements

- FR-001: No model-visible synthetic tool-continuation message may use the internal text `Tool history continuation` or `Native API tool continuation`.
- FR-002: For a single successful tool result that must be represented as model-visible synthetic text, the generated text must be `The <tool_name> tool call completed successfully.`; for `read_media_file`, exactly `The read_media_file tool call completed successfully.`
- FR-003: If multiple completed tool results are represented in one synthetic continuation, the generated text must remain concise, name the completed tools, and avoid internal continuation terminology.
- FR-004: Media context files returned by tools must remain attached to the next LLM request when the provider needs media input, and the carrier message text must be completed-tool-result text.
- FR-005: Native/API text-only tool continuations may build semantic continuation text internally, but must not append a redundant synthetic user message when structured tool-result history is sufficient.
- FR-006: AutoByteus/RPA browser-visible current input must include the latest actionable completed tool result when the RPA browser path would otherwise omit local `tool` results.
- FR-007: Generated tool-continuation text must not include XML-formatting, markdown-backtick, parser-format, or future-tool-call guidance.
- FR-008: Historical media must remain non-reattached except for the current continuation media; old context files must not be reuploaded merely because they exist in history.
- FR-009: The implementation must preserve legitimate later tool calls rather than hard-blocking repeated tool names or identical argument values at the tool execution layer.
- FR-010: Regression coverage must exercise the continuation text builder and affected provider/RPA rendering paths.

## Acceptance Criteria

- AC-001: A unit test for `ToolResultContinuationBuilder` with a successful `read_media_file` result produces model-facing content containing `The read_media_file tool call completed successfully.` and not containing `Tool history continuation` or `Native API tool continuation`.
- AC-002: Rendering an OpenAI-compatible image media continuation produces a user content text part with completed-tool wording and an `image_url` part; the rendered payload does not contain `Native API tool continuation`.
- AC-003: Rendering an AutoByteus/RPA media continuation produces a current user message with the audio attachment, completed-tool wording, and no `Tool history continuation` as model-visible text.
- AC-004: An AutoByteus/RPA text-only tool result is browser-visible in the next RPA current input according to the chosen TS/RPA split, rather than being omitted behind the old original user request.
- AC-005: Generated continuation content and tests contain no XML-backtick/formatting instruction logic such as `XML_TOOL_CALL_MARKDOWN_INSTRUCTION` or `includeXmlToolCallInstruction`.
- AC-006: Existing renderer tests for assistant tool-call rendering, structured tool-result rendering, latest-user selection for normal histories, and at-least-one-user validation remain green or are intentionally updated with equivalent behavior.
- AC-007: In the reproduced AudioTranscriber/RPA scenario, raw traces contain one `tool_call` and one `tool_result` for the target audio path before the model proceeds with transcription/next task output under normal operation.
- AC-008: A scenario with two distinct requested media files still results in two separate `read_media_file` executions and two separate continuations as appropriate.
- AC-009: Relevant local checks are run, at minimum focused unit tests for `tool-result-continuation-builder`, OpenAI-compatible media rendering, and AutoByteus/RPA current-input/result visibility.

## Constraints / Dependencies

- Primary task workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/rpa-xml-read-media-duplication`.
- Canonical artifact folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/rpa-xml-read-media-duplication/tickets/in-progress/rpa-xml-read-media-duplication`.
- RPA LLM workspace inspected as external dependency: `/Users/normy/autobyteus_org/autobyteus_rpa_llm_workspace`.
- Linked RPA-side ticket worktree for server/browser current-input composition: `/Users/normy/autobyteus_org/autobyteus-worktrees/rpa-tool-result-current-input-composition`.
- Local RPA server/container source of affected model: `llm-server-0` on `localhost:51739`.
- The renderer/test fix cannot rely on live Gemini access; live validation is useful but not required for unit coverage.

## Assumptions

- RPA browser cache-hit semantics are intentional and should not be removed merely to fix local tool-result visibility.
- The local AutoByteus runtime remains the authoritative owner of tool invocation/result records.
- A concise completed-tool notification plus the attached media is sufficient for the model to continue, as supported by live experiments on 2026-07-05.
- The repeated calls were model outputs triggered by missing/confusing continuation context rather than a hidden provider retry mechanism.
- XML formatting instructions are not the responsibility of post-tool-result continuation generation.

## Risks / Open Questions

- RQ-001: Provider schemas differ. OpenAI-compatible chat currently needs media on a user content array; Gemini can represent function responses and media in user parts; RPA needs browser-visible text. The invariant is shared, but exact payload shape remains renderer-/server-specific.
- RQ-002: OpenAI-compatible audio support in the current renderer is limited to mp3/wav. The user-reported `.m4a` case is an RPA/Gemini-app flow, not an OpenAI chat audio flow.
- RQ-003: The final split between TS-side RPA renderer synthesis and RPA-server composition must avoid duplicating the same tool result twice in the browser-visible prompt.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| FR-001 | UC-001, UC-002, UC-003 |
| FR-002 | UC-001, UC-002 |
| FR-003 | UC-003, UC-005 |
| FR-004 | UC-001, UC-002 |
| FR-005 | UC-004 |
| FR-006 | UC-002, UC-003 |
| FR-007 | UC-001, UC-002, UC-003 |
| FR-008 | UC-002, UC-005 |
| FR-009 | UC-005 |
| FR-010 | UC-001, UC-002, UC-003, UC-004 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Locks the root wording fix at the continuation builder. |
| AC-002 | Ensures API media carrier text is no longer an internal marker. |
| AC-003 | Ensures RPA media continuation is self-contained and not confusing. |
| AC-004 | Covers RPA text-only tool-result visibility. |
| AC-005 | Ensures the user-requested scope removal is implemented. |
| AC-006 | Protects existing renderer behavior outside the continuation bug. |
| AC-007 | Confirms the original repeated-upload/tool-call symptom is fixed. |
| AC-008 | Ensures no unsafe duplicate suppression is introduced. |
| AC-009 | Defines focused local validation expectations. |

## Approval Status

Refined from user correction delivered by code review on 2026-07-05. This supersedes prior XML-backtick continuation requirements and requires implementation rework before API/E2E resumes.
