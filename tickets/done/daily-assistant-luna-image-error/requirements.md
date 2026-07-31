# Requirements Doc

## Status

Design-ready — SR-004 architecture-correction addendum pending architecture review

## Goal / Problem Statement

When Daily Assistant uses the OpenAI gpt-5.6-luna Responses path to continue after a browser screenshot is read with read_media_file, a zero-byte screenshot is converted to data:image/png;base64, and the provider rejects the entire request. The system must not send empty image payloads to an LLM provider, and the browser screenshot producer must not report an empty artifact as a successful screenshot.

## Current And Desired Behavior

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BE-001 | A supported Daily Assistant flow can pass a zero-byte browser screenshot through screenshot -> read_media_file -> same-turn image context -> OpenAI Responses, causing a 400 request failure before the assistant can continue. | The flow never emits an empty image data URL. Invalid or empty media is rejected or skipped at the media boundary with a local diagnostic, and the LLM request remains provider-valid. | Valid image files, URLs, raw base64, and data URIs keep their existing MIME and data-URI behavior. | REQ-001, REQ-002, AC-001, AC-002, AC-003 |
| BE-002 | Browser screenshot capture writes any returned PNG buffer, including zero bytes, and reports an artifact path with image/png. | Screenshot capture treats an empty PNG buffer as a failed capture and does not return a successful artifact path for it. | Non-empty screenshot buffers keep the current artifact directory, naming, MIME type, and return contract. | REQ-003, AC-004 |
| BE-003 | The failure is visible as a provider-specific OpenAI error rather than a truthful local media or screenshot diagnostic. | Supported invalid-media execution produces a bounded local diagnostic and avoids a provider request containing malformed image bytes. | Unrelated tool errors, valid tool continuations, and non-image tool results retain existing behavior. | REQ-002, REQ-003, AC-002, AC-004 |
| BE-004 | After an LLM request fails, the image-bearing current request remains in working context; a later user message re-sends the same image and fails again. | Every failed request restores the pre-request working-context boundary before the error is surfaced, so the next user message can be processed independently. | Raw traces and already-committed tool facts remain available for diagnostics and future recovery. | REQ-005, REQ-007, AC-006, AC-009 |
| BE-005 | DeepSeek-style text-only models inherit the generic OpenAI-compatible image renderer and send image_url parts that the selected model rejects. | Explicitly unsupported media is rejected as a normal tool/media error or omitted by the single outbound sanitizer before provider submission; unknown capability failures are returned as recoverable LLM diagnostics after rollback. | No automatic fallback model selection, provider retry, or model-specific Luna branch. | REQ-006, REQ-007, AC-007, AC-010 |
| BE-006 | An unknown-capability provider can reject image input before producing output, but there is no proven stable cross-provider classifier for a safe retry. | Return a bounded LLM diagnostic, roll back the failed request boundary, and accept the next user message without an automatic provider retry. | A future retry may be considered only with a separately verified classifier contract and fixtures. | REQ-007, REQ-008, AC-008, AC-009 |
| BE-007 | Tool-owned media failures and provider-owned request failures are both surfaced as errors but have no canonical separation in the solution package. | Tool failures remain ToolResultEvent errors; provider failures remain LLM diagnostics and are not synthesized as fake tool results or normal assistant content. | Existing successful tool continuation and lifecycle behavior is preserved. | REQ-005, REQ-008, AC-009 |

## Investigation Findings

- The captured run used gpt-5.6-luna, performed screenshot and read_media_file successfully, and then stopped at the next Responses request.
- The returned screenshot artifact exists but is zero bytes. The preceding browser probe observed a zero-sized page and canvas.
- mediaSourceToBase64 accepts empty file, data-URI, raw-base64, and downloaded results, and the Responses renderer emits them as input_image data URLs.
- The issue is not Luna-specific API behavior; Luna exposes a shared malformed-media invariant in the OpenAI Responses input path.
- See the retained evidence supplement: runtime-probe-evidence.md.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| runtime-probe-evidence.md | Evidence supplement containing the captured run, trace identifiers, zero-byte artifact inspection, and deterministic malformed-payload probe. | REQ-001, REQ-002, REQ-003 | AC-001, AC-002, AC-004 | Evidence; approval N/A | Establishes the supported reproduction witness and current behavior; it does not define additional intended behavior. |
| provider-media-recovery-analysis.md | Design-impact supplement containing follow-up snapshot poisoning evidence, DeepSeek-style unsupported-image analysis, error ownership, model capability, rollback, and the conservative no-retry decision. | REQ-005, REQ-006, REQ-007, REQ-008 | AC-006 through AC-010 | Intended behavior; pending architecture review | Defines the user-requested recovery expansion and its implementation boundaries. |

## Design Health Assessment

- Change posture: Bug Fix
- Initial design issue signal: Yes
- Root cause classification: Missing Invariant + Missing Recovery Boundary + Missing Model Input-Capability Contract
- Refactor posture: Targeted model-catalog refactor required; no broad runtime refactor.
- Evidence basis: Current owners and production paths are coherent, but the shared media conversion boundary has no non-empty payload invariant and the screenshot writer has no non-empty artifact invariant.
- Requirement or scope impact: Add validation at the shared media conversion boundary and the browser screenshot artifact boundary; no broad runtime or persistence refactor is required.

## Recommendations

1. Make all media-to-base64 conversion paths reject empty payloads, including zero-byte files, empty downloads, empty raw base64, and empty base64 data URIs.
2. Keep the existing renderer behavior of skipping conversion failures, so malformed media cannot poison the OpenAI request; retain the existing console diagnostic.
3. Make screenshot artifact production fail before writing or reporting an empty artifact.
4. Add focused unit coverage for empty media conversion, Responses rendering, and screenshot artifact writing.

## Scope Classification

Medium — one shared TypeScript media utility, one OpenAI Responses rendering path, one Electron browser artifact owner, and focused tests across two packages. No schema or persisted-data migration is expected.

## In-Scope Use Cases

- Daily Assistant uses screenshot, then read_media_file, then the OpenAI Responses continuation.
- OpenAI Responses receives valid local image input after a successful screenshot.
- OpenAI Responses receives an invalid or empty image reference from a supported media source.
- Browser screenshot capture receives an empty PNG buffer.

## Out of Scope

- Diagnosing or redesigning why the browser view reached zero dimensions; that is a separate browser rendering/layout issue unless implementation evidence shows a minimal fix is required to preserve the screenshot contract.
- Broad model-catalog behavior changes, model-routing changes, UI/catalog presentation changes, Luna configuration changes, and reasoning-setting changes. The targeted code-owned static metadata move described in REQ-006 is in scope.
- Fallback model selection, provider retry machinery, and broad compatibility wrappers. Unknown-capability provider rejection is handled by rollback plus a recoverable LLM diagnostic; retry requires a separate verified design.
- Persisted database schema changes, historical run migration, or deletion of captured run history.
- Supporting video or audio in the OpenAI Responses renderer beyond preserving current skip behavior.

## Functional Requirements

- REQ-001 — Non-empty media conversion invariant: Every successful mediaSourceToBase64 result must contain at least one encoded byte. Empty local files, empty HTTP responses, empty raw base64 strings, and empty base64 data-URI payloads must reject with a local error.
- REQ-002 — Provider-safe image rendering: OpenAI Responses rendering must not emit an input_image for a media conversion that fails or yields no bytes. It must preserve available text content and continue producing a valid message payload while logging a bounded diagnostic consistent with current conversion-failure handling.
- REQ-003 — Screenshot artifact invariant: Browser screenshot capture must reject an empty PNG buffer before writing or returning an artifact path. A non-empty buffer must retain the current artifact path and MIME contract.
- REQ-004 — Regression coverage: Focused tests must cover empty and valid media conversion, OpenAI Responses rendering with empty media, and empty/non-empty screenshot artifact behavior. Tests must not require a live OpenAI request or provider credentials.
- REQ-005 — Failed-request recovery boundary: Before assembling each LLM request, capture the active WorkingContext. If assembly, rendering, or provider streaming fails, restore that pre-request context before returning the visible error. Preserve raw traces and committed tool facts, but do not leave the failed image-bearing request in the active context.
- REQ-006 — Model multimodal capability contract: Each LLMModel must expose provider-neutral multimodalCapabilities with supported, unsupported, and unknown states for image, audio, and video input. Built-in static model definitions must declare verified capabilities, including DeepSeek V4 image input unsupported; dynamic or unverified models default to unknown. The capability contract must not add a Luna-specific branch.
- REQ-007 — Safe unsupported-media handling: Known unsupported media must never be sent to a provider. ReadMediaFile must return a normal tool result error before creating a ContextFile when the selected model explicitly marks image input unsupported. The LLM-facing tool error must say: The selected model does not support image input. The image was not loaded. Continue without visual analysis and do not claim to have inspected the image. The single outbound request sanitizer remains defense in depth for direct user attachments, historical context, and unknown tool paths. Unknown-capability provider rejection is returned as a recoverable LLM diagnostic after rollback; this ticket does not retry provider requests.
- REQ-008 — Correct failure semantics: Tool-owned failures must remain ToolResultEvent errors and continue through the existing tool-result continuation. Provider-owned failures must remain LLM diagnostics, must not be synthesized as fake tool results, and must not be persisted as normal assistant content.

## Acceptance Criteria

- AC-001: Given a zero-byte image file passed through the media conversion utility, conversion rejects and no empty base64 string is returned.
- AC-002: Given an empty image data URI or raw empty base64 input, conversion rejects; rendering a message with that source produces no input_image containing data:*;base64, and preserves text content.
- AC-003: Given a valid non-empty image fixture, the Responses renderer emits the existing input_image shape with a non-empty base64 data URL and preserves existing MIME behavior.
- AC-004: Given an empty screenshot buffer, screenshot capture fails before an artifact path is returned or written; given a non-empty buffer, the existing screenshot writer contract remains passing.
- AC-005: Focused test commands pass, or any environment limitation is recorded with exact command and output and is not represented as a false pass.
- AC-006: After a renderer or provider failure on an image-bearing request, the pre-request WorkingContext is restored and a subsequent text-only user message can reach the LLM without re-sending the failed image.
- AC-007: A model marked image-input unsupported never receives an image part; read_media_file returns a normal tool error to the LLM stating that the selected model does not support image input, the image was not loaded, and the LLM must continue without visual analysis and must not claim to have inspected it; the agent remains able to continue.
- AC-008: An unknown-capability model that rejects image input before any output receives one bounded LLM diagnostic after request rollback; no automatic provider retry occurs, and a subsequent text-only user message is accepted.
- AC-009: Provider errors remain visible as bounded LLM diagnostics, are not stored as normal assistant conversation content, and do not create synthetic tool results.
- AC-010: Valid image input remains available to a later model whose capability is supported or unknown; invalid/empty image sources are omitted or reported without creating a malformed provider payload.

## Constraints / Dependencies

- Use the existing mediaSourceToBase64 utility and OpenAI Responses renderer ownership; do not add a second media representation or provider-specific compatibility branch.
- Keep the built-in model definition as the single source for intrinsic static model metadata: context/input/output limits and multimodalCapabilities are colocated with each static definition. Live provider metadata may override operational limits; dynamic models retain unknown capabilities when discovery does not verify them.
- Preserve the current Promise.allSettled skip-on-conversion-failure behavior in OpenAI and Chat renderers, while adding bounded media diagnostics to the outbound request where the source was omitted.
- Use an outbound sanitized copy of working-context messages; do not destructively delete canonical historical media references when the selected model is unsupported.
- Provider requests are not retried in this ticket. A future retry requires a separate approved classifier contract and representative fixtures; absence of that proof must default to no retry.
- A failed request must restore a pre-request WorkingContext snapshot before returning a visible error. Do not append that error as normal assistant content.
- Browser screenshot errors must use existing browser error and bridge conventions or a narrowly scoped extension if architecture review confirms it is needed.
- Tests must be deterministic and use temporary files and buffers.
- No plaintext provider credential should be committed or logged.

## Persisted Data Outcome

- Stored subject / location: Existing run memory snapshots and raw traces may contain the screenshot path and tool result; no code-owned persisted schema changes are proposed.
- Required outcome: Not Affected.
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve existing run history and tool traces. Future rendering should simply refuse invalid bytes.
- Unacceptable data loss or corruption: Deleting or rewriting historical run data is unacceptable and unnecessary.
- Relevant availability, maintenance-window, or rollout constraints: None; this is a code-only runtime validation change.
- Related requirement and acceptance-criteria IDs: REQ-001, REQ-003, AC-001, AC-004.

## Assumptions

- A zero-byte image is invalid for the OpenAI image-input contract and cannot be made meaningful by retrying.
- Skipping an unreadable image while preserving continuation text is preferable to failing the whole provider request; the existing renderer already follows this policy for other conversion errors.
- Browser screenshot capture is a supported producer of local image files, so a success result must imply a non-empty artifact.

## Risks / Open Questions

- The zero-dimensional browser view may remain a separate screenshot-quality issue after the malformed request is fixed. Implementation should report whether the empty-buffer guard is the only required change.
- If screenshot errors need a new bridge error code, implementation must keep it additive and use existing browser error serialization rather than exposing raw exceptions.
- Skipping an invalid image means the model may continue without visual context; this is a truthful degradation and must be logged.

## Requirement-To-Use-Case Coverage

| Use Case | Requirements |
| --- | --- |
| Daily Assistant screenshot -> read_media_file -> Luna continuation | REQ-001, REQ-002, REQ-003, REQ-005, REQ-007 |
| Valid local OpenAI Responses image | REQ-001, REQ-002, REQ-006 |
| Invalid or empty image source | REQ-001, REQ-002, REQ-007 |
| DeepSeek text-only model with image tool result | REQ-005, REQ-006, REQ-007, REQ-008 |
| Provider rejection followed by a new user message | REQ-005, REQ-007, REQ-008 |
| Browser screenshot artifact producer | REQ-003 |
| Focused regression validation | REQ-004, REQ-005, REQ-006, REQ-007, REQ-008 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 | Zero-byte local image conversion rejects. |
| AC-002 | Empty data URI and raw base64 are rejected and renderer omits the image while retaining text. |
| AC-003 | Valid non-empty image remains rendered in the established Responses shape. |
| AC-004 | Empty screenshot capture fails; non-empty screenshot writing remains unchanged. |
| AC-005 | Package-focused tests execute truthfully. |
| AC-006 | Failed request rollback and subsequent text-only turn. |
| AC-007 | Known unsupported-model media tool error and no provider image. |
| AC-008 | Unknown-model media rejection rolls back and returns a recoverable diagnostic without retry. |
| AC-009 | Correct separation of tool errors and LLM diagnostics. |
| AC-010 | Preservation of valid media for a later compatible model. |

## Approval Status

The initial invariant scope was approved for design by the user task request. The recovery, model-capability, and static-model-metadata placement requested during follow-up discussion are included in SR-004; the analysis supplement is intended-behavior context and remains pending architecture confirmation.


## SR-002 Recovery And Cross-Model Compatibility Addendum

The user clarified that the primary requirement is recoverability: after an image or provider error, later text messages must continue to work. The captured working-context snapshot confirms that the failed image-bearing continuation remains in active context and is re-sent with the next user message. This addendum supersedes any earlier assumption that renderer-level omission alone is sufficient.

### Expanded intended behavior

- A failed LLM request is transactional at the working-context boundary: restore the pre-request context before returning the visible error.
- A zero-byte screenshot or media-read failure is a normal tool error with no ContextFile.
- A known text-only model such as the built-in DeepSeek V4 models rejects image loading as a normal tool error or is protected by the outbound sanitizer.
- Unknown model capability produces a bounded recoverable LLM diagnostic after rollback; no provider retry occurs in this ticket.
- Provider failures are LLM diagnostics, not synthetic tool results and not normal assistant conversation content.
- Canonical raw traces and valid historical media references remain preserved for later model changes.

See the supplemental analysis:
provider-media-recovery-analysis.md


## SR-003 Architecture-Correction Addendum

This addendum supersedes the earlier retry proposal and makes the architecture-review corrections authoritative.

- Behavior IDs are synchronized through BE-007 across requirements and design.
- The current root-cause classification is Missing Invariant + Missing Recovery Boundary + Missing Model Input-Capability Contract.
- The canonical/outbound request contract is explicit: canonical working-context messages remain in MemoryManager; a single sanitizer-owned outbound clone is rendered and passed to every provider adapter.
- Built-in static model definitions are the single source for intrinsic static model metadata, including context/input/output limits and multimodalCapabilities. Runtime LLMModel instances expose those values; live provider metadata may override operational limits, and dynamic models default to unknown capabilities. ReadMediaFile receives a narrow provider-neutral capability projection and must reject unsupported images before ContextFile creation.
- The request recovery boundary is named and transactional. Snapshot before system-prompt, compaction, or request append; commit only after normal request/tool ingestion succeeds; restore only on assembly failure or unrecovered provider failure; interruption follows its existing separate recovery path. Raw traces and committed tool facts are preserved.
- Unknown-provider image rejection has no automatic retry in this ticket. The stable classifier and representative unknown-provider fixture required for safe retry are not proven. The recoverable outcome is rollback plus a visible LLM diagnostic and acceptance of the next user message.
- Browser screenshot capture and writer both validate bytes. Capture owns BrowserTabError code browser_screenshot_failed with message Browser screenshot produced no image bytes.; writer independently rejects empty buffers before directory/file creation.

## SR-004 Architecture-Review-Correction Addendum

This addendum addresses ARCH-REV-002 AR-007 and AR-008 and supersedes any contradictory earlier wording.

- The targeted code-owned static model-catalog refactor is in scope. Broad catalog behavior, routing/provider selection, UI/catalog presentation, Luna settings, reasoning settings, persistence migration, and broad runtime refactoring remain out of scope.
- The LLM-facing known-unsupported ReadMediaFile error is exact and contains no human recommendation: The selected model does not support image input. The image was not loaded. Continue without visual analysis and do not claim to have inspected the image.
- Built-in definitions own required StaticModelMetadata containing nullable maxContextTokens/maxInputTokens/maxOutputTokens, multimodalCapabilities, and sourceUrl/verifiedAt provenance. activeContextTokens is excluded.
- ModelMetadataResolver.resolve(lookup, staticMetadata) performs field-by-field valid-live -> valid-static -> unknown resolution and records per-field source/provenance. LLMFactory.buildSupportedModels explicitly maps the result into LLMModel and never spreads unknown resolver output over a definition.
- All curated built-in entries are enumerated for migration and removal verification in design-spec.md. The catalog construction spine and llm-factory.ts ownership are explicit.
