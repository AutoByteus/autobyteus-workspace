# Provider Media Recovery Analysis

## Status And Purpose

- Status: Design-impact addendum requested by the user after the initial solution handoff.
- Purpose: Preserve the original empty-byte investigation while analyzing why a failed image request poisons later turns, how DeepSeek-style text-only models reach the same failure, and which failures should be returned as tool errors versus LLM diagnostics.
- Scope: LLM image-input compatibility, failed-request recovery, read_media_file and screenshot validation, static model metadata placement, and conservative no-retry recovery. It does not define fallback-model selection or provider retry machinery in this ticket.
- Approval applicability: This addendum defines intended runtime behavior requested by the user and is pending architecture review.

## New Evidence: The Failed Image Remains In Working Context

The captured run now contains a second user turn after the provider error:

- Raw trace turn_0002 contains the text user message: "it seems that the image is empty".
- The working-context snapshot still contains the prior tool continuation as a user-role message with image_urls containing:
  /Users/normy/.autobyteus/browser-artifacts/155395-1785476400668.png
- The same snapshot then contains the second user message with no image URLs.
- The first image path points to the zero-byte artifact already recorded in runtime-probe-evidence.md.

This proves the lockout mechanism. LlmPhase appends the current request to working context before the provider call. When the provider rejects the request, LlmPhase returns an error response but does not restore the pre-request working context. The failed image-bearing continuation therefore remains in the snapshot. A later user message is assembled together with that historical image and the renderer sends it again, producing the same failure.

Relevant current path:

1. LLMRequestAssembler.appendWorkingContextUserMessage appends the image-bearing request.
2. OpenAIResponsesRenderer or OpenAIChatRenderer renders the historical image again.
3. Provider rejects the request before any response chunk.
4. LlmPhase returns a final error response with isError=true.
5. LLMResponsePipeline skips response processors for errors.
6. No working-context rollback or failed-request quarantine occurs.
7. The next user turn re-renders the stale image.

## New Evidence: DeepSeek Uses The Same Blind Image Path

The built-in DeepSeek adapter uses DeepSeekLLM -> OpenAICompatibleLLM and installs DeepSeekChatRenderer. DeepSeekChatRenderer inherits OpenAIChatRenderer, whose image path converts Message.image_urls into image_url content parts without a model capability check.

The current LLMModel and ModelInfo shapes expose context and output limits but do not expose input modality support. The built-in DeepSeek model definitions also do not declare that DeepSeek V4 is text-only. Consequently:

- read_media_file can report a successful ContextFile;
- ToolResultContinuationBuilder carries that ContextFile;
- AgentInputPipeline selects append_user_message because the continuation has context files;
- DeepSeekChatRenderer emits an image_url part;
- DeepSeek rejects the request because the selected model does not accept image input;
- the image-bearing message remains in working context and poisons later turns exactly like the Luna empty-image failure.

The provider-specific rejection is different, but the recovery defect is shared.

## Failure Classification And Required Return Shape

| Failure point | Is a tool actually failing? | Correct LLM-facing result | Must not happen |
|---|---:|---|---|
| Browser screenshot produces zero-byte PNG | Yes: screenshot contract failed | ToolResultEvent with error; no artifact path and no ContextFile | Returning a successful screenshot path for empty bytes |
| read_media_file receives missing, non-file, or zero-byte file | Yes: media-read contract failed | ToolResultEvent with error; no ContextFile | Returning a ContextFile that cannot be encoded |
| read_media_file receives a valid image but current model is known image-incompatible | Yes: requested media load cannot fulfill its stated purpose for this model | ToolResultEvent: The selected model does not support image input. The image was not loaded. Continue without visual analysis and do not claim to have inspected the image.; continuation proceeds text-only | Sending the ContextFile to the provider |
| Renderer cannot encode one media source | The tool may have succeeded, but request preparation has a media issue | Omit that media, preserve text, attach a bounded diagnostic to the current request | Emitting an empty data URI |
| Provider rejects image input before streaming | No tool failed; provider request compatibility failed | Recoverable LLM diagnostic after rollback; no automatic retry in this ticket | Converting the provider error into a fake tool result |
| Provider fails for unrelated reason | No tool failed | Recoverable LLM error and clean failed-request boundary | Leaving the failed request as a poison pill |
| Tool execution itself throws | Yes | Existing ToolResultEvent.error continuation behavior | Escalating a normal tool error into terminal agent failure |

A tool result error is appropriate only for a tool-owned failure. Provider failures remain LLM diagnostics and must not be synthesized as tool results because that would corrupt tool-call protocol history.

## Proposed Robustness Contract

### 1. Validate producer and tool boundaries

- Browser screenshot capture and writer reject empty buffers before success is returned.
- read_media_file rejects zero-byte files after stat and before constructing ContextFile.
- Existing security and regular-file checks remain unchanged.
- A known model capability check may reject unsupported image/audio/video loads in read_media_file, but this is an early optimization and not the only defense.

### 2. Declare model input capabilities

Add a provider-neutral input capability field to LLM model definitions, with three states per media kind:

- supported
- unsupported
- unknown

Built-in DeepSeek V4 definitions should declare image input unsupported based on the observed provider contract. Dynamic OpenAI-compatible, Ollama, LM Studio, and custom endpoint models should default to unknown unless their discovery metadata proves otherwise. Luna should not receive a Luna-specific branch; its captured issue is empty bytes, not a capability rejection.

The capability belongs to model metadata, not renderer name checks. It may initially remain an internal runtime field; exposing it in GraphQL is optional follow-up unless the UI needs to warn before tool use.

### 3. Sanitize every outbound request

Before any provider renderer runs, a request-level media sanitizer should inspect the canonical working-context messages against the selected model capability:

- supported: retain the source and let the provider renderer encode it;
- unsupported: remove the media source from the outbound copy and append a bounded text diagnostic explaining that the selected model cannot inspect it;
- unknown: retain the source for the first attempt, subject to non-empty conversion validation;
- invalid or empty source: remove it from the outbound copy and append a bounded diagnostic.

The sanitizer must operate on the outbound copy, so model switching does not permanently destroy a valid historical ContextFile. It must not mutate raw traces or rewrite historical run memory.

Every provider path must consume the sanitized messages, including OpenAI Responses, OpenAI-compatible/DeepSeek Chat, Anthropic, Gemini, and local renderers. Shared media conversion remains the final byte invariant.

### 4. Use conservative no-retry provider recovery

For unknown-capability models, a provider may reject a request containing an image. The current evidence does not prove a stable cross-provider media-compatibility classifier or representative unknown-model fixtures. Therefore the provider call is not retried in this ticket.

If the provider rejects image input before a usable response, LlmPhase returns one bounded provider diagnostic after restoring the pre-request working context. The next text-only user turn is accepted from the restored boundary. A future retry proposal must define normalized status/code/parameter/message input, exact positive predicates and exclusions, no-output gating, retry provenance, and representative fixtures.

Do not retry in this ticket for any provider failure, including image rejection, network, authentication, rate-limit, quota, timeout, or unrelated invalid-request errors. No alternate model is selected.

### 5. Roll back the failed request boundary

Before request assembly, capture a WorkingContext copy. If request assembly or provider streaming fails, restore that copy before returning the visible error. This removes the failed current user or tool-continuation message from the active LLM context while preserving raw traces and tool facts already committed before the request.

The rollback must cover:

- renderer/preparation failures;
- provider media rejection after the first attempt;
- unrelated provider request failures.

The visible UI can still display the error response. The error response should not be appended as a normal assistant turn, because doing so would make a diagnostic look like model-authored conversation content. A bounded operation-boundary diagnostic may be written to runtime logs/raw tracing without reintroducing the invalid media.

### 6. Keep future turns usable

After rollback, the next user message starts from the last known-good working context. A later model switch can still use valid preserved media references because the rollback and sanitizer do not erase canonical historical media. Invalid files remain safely omitted by the shared converter and tool validation.

## Proposed Behavior Matrix

| Scenario | First defensive boundary | Provider call? | User-visible outcome | Future-turn state |
|---|---|---:|---|---|
| Empty screenshot | Screenshot capture/writer | No | Tool error: screenshot produced no bytes | Clean; no ContextFile |
| Empty file passed to read_media_file | read_media_file | No | Tool error: file is empty | Clean; no ContextFile |
| DeepSeek known text-only model reads image | Model capability gate in read_media_file | No | Tool error: The selected model does not support image input. The image was not loaded. Continue without visual analysis and do not claim to have inspected the image. | Clean; no image-bearing continuation |
| Direct user image on DeepSeek | Request sanitizer | No | Text diagnostic to model and user-facing continuation without image | Clean; canonical history preserved |
| Unknown model rejects image | LlmPhase failure boundary | No retry | Recoverable LLM diagnostic; next text turn accepted from restored context | Failed request rolled back |
| Luna receives valid non-empty image | Shared conversion and renderer | Yes | Normal multimodal response | Normal |
| Luna receives zero-byte historical image | Shared conversion/sanitizer | No malformed request | Local omission/error diagnostic | Failed request rolled back |
| Generic provider error | LlmPhase failure boundary | No retry | Existing error surface remains visible | Failed request rolled back; next message accepted |

## Recovery Invariants

- No provider receives an empty decoded image payload.
- No provider receives image input when model capability is explicitly unsupported.
- A tool-owned media failure is represented as ToolResultEvent.error and continues through the normal tool-result continuation.
- A provider-owned request failure is represented as an LLM diagnostic, not a tool result.
- A failed LLM request cannot leave its current image-bearing input as the only reason future turns fail.
- Unknown-provider rejection is never retried in this ticket; this avoids duplicate output/tool calls and unproven error classification.
- Canonical raw traces and valid historical media references are preserved; no persistence migration is needed.

## Suggested Durable Coverage

- read_media_file rejects zero-byte files.
- read_media_file rejects images for a model with image capability unsupported and returns a normal tool error continuation.
- request sanitizer strips unsupported and empty image sources while retaining text.
- DeepSeek renderer receives no image part for a known text-only model.
- unknown-model media rejection returns one diagnostic after rollback and is not retried.
- no provider retry occurs in this ticket, regardless of output state.
- LlmPhase restores the pre-request WorkingContext after renderer/provider failure.
- a second user turn succeeds after the first turn fails on an image request.
- valid image history remains available to a later model whose image capability is supported.
- screenshot empty-buffer rejection and existing valid screenshot behavior remain covered.

## Architecture Decisions Resolved

1. Static model definitions own intrinsic context/input/output metadata, multimodalCapabilities, and metadata provenance. No ModelInfo or GraphQL exposure is required for this runtime fix.
2. ReadMediaFile owns the explicit known-unsupported check for a truthful early tool error; the outbound sanitizer remains defense in depth.
3. Capture owns the browser_screenshot_failed bridge contract; the writer independently rejects empty buffers.
4. A future media-compatibility classifier is intentionally not part of this ticket; if proposed later, it must use normalized provider errors and representative unknown-model fixtures.

## Non-Goals

- Automatic fallback to another LLM.
- Automatic provider retry in this ticket.
- Hiding every provider error.
- Rewriting old snapshots or raw traces.
- Making a text-only model hallucinate visual inspection.
- Fixing the separate zero-viewport browser layout problem in the same change unless implementation evidence proves it is required for the screenshot contract.

## SR-003 Architecture-Correction Addendum

### Static model metadata placement

The repository currently has two sources for built-in model information: supported-model-definitions.ts owns identity/provider/class/configuration, while curated-model-metadata.ts owns context limits and provenance. The user approved colocating intrinsic static model metadata with each static model definition.

The target is a single static definition entry containing maxContextTokens, maxInputTokens, maxOutputTokens, multimodalCapabilities, and metadata source/verification information. activeContextTokens remains runtime/session state. ModelMetadataResolver may continue to apply live provider overlays with precedence live value -> static definition value -> unknown. After migration, duplicate built-in entries in curated-model-metadata.ts are removed; this is not a dual-read compatibility path.

### Multimodal capability contract

The selected LLMModel exposes multimodalCapabilities with supported, unsupported, and unknown states for image, audio, and video. Static DeepSeek V4 definitions declare image unsupported. Static definitions with verified image support declare the supported state. Dynamic/discovered models default to unknown. The runtime does not need UI or GraphQL exposure for this behavior.

ReadMediaFile receives the selected model's capability projection and rejects an explicit unsupported image before ContextFile construction. The outbound sanitizer remains defense in depth for direct attachments and historical media.

### Recovery and error ownership

The single outbound sanitizer owns a cloned Message[] request copy; provider adapters receive that outbound copy, not canonical working context. LlmPhase opens a named MemoryManager recovery snapshot before prompt/compaction/request append, commits after normal response/tool ingestion, and restores on assembly/provider failure. Raw traces and committed tool facts remain preserved. Tool failures remain ToolResultEvent errors; provider failures remain LLM diagnostics. Unknown-provider media rejection is rolled back and surfaced once without automatic retry.


## SR-004 Architecture-Review-Correction Addendum

ARCH-REV-002 AR-007 and AR-008 are resolved in the core package. The targeted static model-catalog move is in scope, but broad catalog behavior/routing/UI remains out of scope. The LLM-facing unsupported-image tool error is exactly: The selected model does not support image input. The image was not loaded. Continue without visual analysis and do not claim to have inspected the image. The static definition/live overlay/provenance/factory contract is owned by SupportedModelDefinition, ModelMetadataResolver, and LLMFactory as specified in design-spec.md; activeContextTokens remains dynamic-only. No provider retry/classifier is introduced.
