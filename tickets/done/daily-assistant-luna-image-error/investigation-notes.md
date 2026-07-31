# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete — dedicated ticket worktree created from refreshed origin/personal.
- Current Status: Design-ready — SR-004 architecture-correction addendum pending architecture review.
- Investigation Goal: Identify why Daily Assistant with OpenAI gpt-5.6-luna fails after reading a browser screenshot, establish a complete production-path witness, and define the smallest safe fix.
- Scope Classification: Medium.
- Scope Classification Rationale: The defect crosses the browser screenshot producer and shared LLM media conversion boundary, but has focused file/test impact and no persistence transition.
- Scope Summary: Prevent empty screenshot/media payloads from becoming OpenAI Responses input_image data URLs; make screenshot success imply a non-empty artifact.
- Primary Questions To Resolve:
  1. Does the captured run use Luna and the screenshot/read-media path? Yes.
  2. Is the returned screenshot artifact empty or otherwise unreadable? Yes; zero bytes.
  3. Where is the empty value converted into an OpenAI payload? mediaSourceToBase64 -> OpenAIResponsesRenderer.
  4. Is a schema/data migration needed? No.
  5. Is a broad refactor needed? No broad runtime refactor; a targeted code-owned static model-catalog refactor is in scope to remove duplicate intrinsic metadata authority.

## Request Context

The user reported that Daily Assistant fails while using the OpenAI Luna model and supplied two screenshots. The visible error says the OpenAI Responses API rejected input[74].content[1].image_url because it received an image data URL with empty base64 bytes. The configuration screenshot identifies the model as OpenAI / gpt-5.6-luna; the activity screenshot shows successful screenshot and read_media_file calls followed by the error.

## Environment Discovery / Bootstrap Context

- Project Type: Git.
- Task Workspace Root: /Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-luna-image-error.
- Task Artifact Folder: /Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-luna-image-error/tickets/done/daily-assistant-luna-image-error.
- Current Branch: codex/daily-assistant-luna-image-error.
- Current Worktree / Working Directory: /Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-luna-image-error.
- Bootstrap Base Branch: origin/personal at 80d6693c1b0df5abdfd2c3dc0ec01ff885425847.
- Remote Refresh Result: git fetch origin completed successfully before worktree creation.
- Task Branch: codex/daily-assistant-luna-image-error, tracking origin/personal.
- Expected Base Branch: origin/personal / personal.
- Expected Finalization Target: personal after downstream delivery workflow.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The user's shared checkout was dirty and behind remote; no task artifacts were created there. All authoritative work is in this dedicated worktree.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| /Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-luna-image-error/tickets/done/daily-assistant-luna-image-error/runtime-probe-evidence.md | Captured Daily Assistant run and deterministic empty-image payload evidence. | Model/run identity, exact trace IDs, zero-byte browser artifact, current conversion shape, and test-environment limitation. | Requirements, investigation notes, design spec. | REQ-001, REQ-002, REQ-003; AC-001, AC-002, AC-004. | Complete; retained. | Evidence/context only; approval N/A. | Implementation should add or update durable tests; API/E2E should decide whether a browser bridge scenario is warranted. |
| /Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-luna-image-error/tickets/done/daily-assistant-luna-image-error/provider-media-recovery-analysis.md | Design-impact supplement for failed-request rollback, DeepSeek-style unsupported image input, error semantics, static model metadata placement, and conservative no-retry recovery. | Follow-up snapshot evidence, current LlmPhase/LLMResponsePipeline behavior, DeepSeek renderer inheritance, and proposed robustness contract. | Requirements, investigation notes, design spec, architecture review. | REQ-005, REQ-006, REQ-007, REQ-008; AC-006 through AC-010. | Complete for SR-004 solution round; pending architecture confirmation because it defines intended behavior. | User-requested behavior expansion; architecture reviewer must confirm capability, request-boundary, and screenshot-error boundaries. |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-31 | Code | autobyteus-ts/src/llm/utils/media-payload-formatter.ts | Trace media source conversion. | Empty files, empty downloads, empty data URIs, and empty raw base64 can resolve to an empty string; no non-empty invariant exists. | Add focused tests and validation. |
| 2026-07-31 | Code | autobyteus-ts/src/llm/prompt-renderers/openai-responses-renderer.ts | Trace OpenAI Responses request shape. | Promise.allSettled skips rejected conversions but emits input_image for fulfilled empty strings. | Preserve skip policy after conversion rejects empty bytes. |
| 2026-07-31 | Code | autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts | Trace read_media_file continuation. | A ContextFile returned by a tool is intentionally attached to the same-turn continuation. | No structural change needed. |
| 2026-07-31 | Code | autobyteus-ts/src/agent/llm-request-assembler.ts | Trace image path into LLM messages. | Continuation ContextFile becomes Message.image_urls before rendering. | No structural change needed. |
| 2026-07-31 | Code | autobyteus-web/electron/browser/browser-tab-page-operations.ts; browser-screenshot-artifact-writer.ts | Trace screenshot producer. | image.toPNG is written without checking length; an empty buffer can be reported as a successful artifact. | Add producer invariant and focused test. |
| 2026-07-31 | Code | autobyteus-ts/tests/unit/llm/utils/media-payload-formatter.test.ts; tests/unit/llm/prompt-renderers/openai-responses-renderer.test.ts | Determine existing test seams. | Formatter tests cover valid/error paths but not empty bytes; Responses tests cover valid/tool/audio paths but not image input. | Extend focused durable tests. |
| 2026-07-31 | Code | autobyteus-web/electron/browser/__tests__/browser-screenshot-artifact-writer.spec.ts; browser manager tests | Determine screenshot test seam. | Writer has a focused non-empty buffer test; page capture currently passes toPNG directly. | Extend writer/page capture coverage proportionately. |
| 2026-07-31 | Trace / Data | /Users/normy/.autobyteus/server-data/memory/agents/daily_assistant_a3f3e067a08e4e128d3777f0111c43b5/{run_metadata.json,working_context_snapshot.json,raw_traces_active.jsonl} | Verify the user's actual run and model. | gpt-5.6-luna; screenshot and read-media calls; image path appended to continuation. | Retained in supplement. |
| 2026-07-31 | Data | /Users/normy/.autobyteus/browser-artifacts/155395-1785476400668.png | Inspect screenshot returned by captured run. | File size is 0; file reports empty. | Separate browser dimension issue may remain. |
| 2026-07-31 | Other | User screenshots at the two supplied context-file paths | Confirm visible error and selected model. | Screenshots match captured trace and show provider rejection. | No; paths preserved as user context. |
| 2026-07-31 | Command | git fetch origin; git worktree add -b codex/daily-assistant-luna-image-error ... origin/personal | Bootstrap dedicated task workspace. | Remote refreshed and dedicated clean worktree created. | No. |
| 2026-07-31 | Command | pnpm -C autobyteus-ts exec vitest run tests/unit/llm/utils/media-payload-formatter.test.ts tests/unit/llm/prompt-renderers/openai-responses-renderer.test.ts --reporter=dot | Establish baseline focused test status. | Could not start: vitest is not installed in the dedicated worktree. | Install dependencies before implementation/API-E2E checks.
| 2026-07-31 | Trace and snapshot probe | Parsed the latest raw trace and working_context_snapshot.json after the user sent a follow-up message. | The follow-up text turn is present, but the prior tool-continuation user message still carries the zero-byte screenshot path in image_urls. | The failed request poisons later turns; request-boundary rollback is required. |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BE-001 | User | Daily Assistant user request leads the agent to call browser screenshot, then read_media_file on the returned artifact. | User message -> Daily Assistant run -> browser tool bridge -> Electron screenshot capture -> artifact writer -> read_media_file -> tool-result continuation -> LLMRequestAssembler -> OpenAIResponsesRenderer -> OpenAI Responses API. | A zero-byte screenshot is accepted as a successful artifact, converted to an empty base64 image, and causes provider 400. | User screenshots; captured run metadata; raw trace calls/results; runtime supplement. |
| BE-002 | Contract | OpenAI Responses input image contract requires a non-empty base64 data URL with an image MIME type. | Rendered Message.image_urls -> mediaSourceToBase64 -> createDataUri -> input_image.image_url -> provider request validation. | Current formatter can violate the contract by returning an empty string for empty sources. | User error text; current formatter and renderer code. |
| BE-003 | System | Browser screenshot tool returns an artifact path on successful capture. | Browser session -> capturePage -> toPNG -> screenshot writer -> browser bridge JSON result. | Current success result does not imply non-empty artifact bytes. | Browser code and zero-byte artifact. |

## Design Health Assessment Evidence

- Change posture: Bug Fix.
- Candidate root cause classification: Missing Invariant + Missing Recovery Boundary + Missing Model Input-Capability Contract.
- Refactor posture evidence summary: Existing runtime boundaries remain appropriate for browser capture, shared media conversion, provider rendering, request recovery, and tool error ownership. A targeted model-catalog refactor is also justified because intrinsic static context limits are separated from their model definitions; moving them beside the definitions removes duplicate authority without changing dynamic provider discovery.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Captured run | gpt-5.6-luna continuation ends with image_url empty-base64 provider error. | Shared OpenAI Responses path is affected; no model-specific routing change is indicated. | Validate conversion boundary. |
| Screenshot artifact | Returned PNG path is a zero-byte file. | Screenshot producer reports invalid output as success. | Guard before writing or returning. |
| Formatter | Empty bytes resolve successfully from files, data URIs, raw base64, and downloads. | Missing input invariant is the immediate cause of malformed payload. | Reject empty values. |
| Renderer | Conversion failures are already skipped with a diagnostic. | Existing degradation behavior can absorb new validation errors. | Add regression test for no empty input_image. |
| Persistence | Empty artifact is external runtime file; run traces only retain path and metadata. | No migration or data rewrite. | Preserve historical traces. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| autobyteus-ts/src/llm/utils/media-payload-formatter.ts | Convert local, remote, data URI, and raw media sources into base64. | Does not reject empty bytes. | Keep as authoritative source-to-bytes owner; add one non-empty invariant. |
| autobyteus-ts/src/llm/prompt-renderers/openai-responses-renderer.ts | Shape messages for OpenAI Responses. | Emits an image for fulfilled empty conversion. | Keep renderer boundary; rely on formatter rejection and optionally retain defensive non-empty guard. |
| autobyteus-ts/src/llm/prompt-renderers/openai-chat-renderer.ts | Shape messages for OpenAI-compatible Chat Completions. | Has same conversion pattern and would be vulnerable to an empty result. | Shared formatter fix protects this path without provider-specific code. |
| autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts | Convert tool result ContextFile values into same-turn context files. | Correctly preserves supported read-media behavior. | No ownership change. |
| autobyteus-ts/src/agent/llm-request-assembler.ts | Append and render continuation input. | Correctly carries image path to renderer. | No ownership change. |
| autobyteus-web/electron/browser/browser-tab-page-operations.ts | Capture page and delegate artifact writing. | Passes raw toPNG output without validation. | Add capture-boundary validation before writer. |
| autobyteus-web/electron/browser/browser-screenshot-artifact-writer.ts | Persist screenshot buffer and return path. | Writes zero-byte buffer as success. | Add writer invariant as defense in depth if needed by existing test seam. |
| autobyteus-ts/tests/unit/llm/utils/media-payload-formatter.test.ts | Formatter unit coverage. | No empty-byte cases. | Extend with zero-byte, empty URI, and empty raw input cases. |
| autobyteus-ts/tests/unit/llm/prompt-renderers/openai-responses-renderer.test.ts | Responses renderer unit coverage. | No image input case. | Add valid image and empty-image omission cases. |
| autobyteus-web/electron/browser/__tests__/browser-screenshot-artifact-writer.spec.ts | Writer unit coverage. | Only non-empty buffer is covered. | Add empty-buffer rejection and no-file assertion. |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-31 | Trace | Parsed captured working_context_snapshot.json and raw_traces_active.jsonl for run daily_assistant_a3f3e067a08e4e128d3777f0111c43b5. | Screenshot -> read-media -> user image continuation is present; model is Luna. | Complete supported reproduction witness. |
| 2026-07-31 | Probe | stat and file on /Users/normy/.autobyteus/browser-artifacts/155395-1785476400668.png. | size=0; file: empty. | Source image bytes are empty before formatter conversion. |
| 2026-07-31 | Probe | Calculated base64 for zero-byte file and current data-URI construction. | Base64 is empty; output is data:image/png;base64,. | Exact provider-invalid payload. |
| 2026-07-31 | Probe | Captured run run_script result for browser page dimensions. | inner=[0,0], canvas=[0,0]. | Explains empty screenshot producer output; separate quality risk remains. |
| 2026-07-31 | Test setup | pnpm -C autobyteus-ts exec vitest run ... | Test runner unavailable because dependencies are not installed in task worktree. | Install dependencies before implementation verification; no pass claimed. |

## External / Public Source Findings

- Public API or spec: None required. User-provided OpenAI error and local production trace establish the contract relevant to this fix.
- Repository state: refreshed origin/personal at 80d6693c1b0df5abdfd2c3dc0ec01ff885425847.
- Relevant contract: OpenAI Responses rejects an image data URL with empty base64 bytes.
- Why it matters: Application must enforce the input invariant before provider submission.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Captured local run metadata and zero-byte browser artifact; no live service is required for deterministic reproduction.
- Required config, feature flags, env vars, or accounts: Captured run used gpt-5.6-luna; no provider credential is needed to establish malformed payload.
- External repos or samples: None.
- Setup commands: git fetch origin; dedicated worktree creation; bounded reads of captured run files; stat and file artifact inspection.
- Cleanup: None; no production files changed. Dependencies remain to be installed by implementation/API-E2E as needed.

## Findings From Code / Docs / Data / Logs

- Model selection is not the root cause. The same malformed input_image would be invalid for any provider using this renderer contract; Luna made the path observable.
- The current OpenAI Responses renderer already handles rejected media conversions by logging and continuing. Rejecting empty bytes in the shared utility is compatible with this degradation behavior.
- The screenshot artifact path is stored in the tool result and then turned into a ContextFile; it is not embedded in the tool payload itself. The fix belongs at the byte boundary rather than tool-result serialization.
- The browser view zero dimensions are a separate producer-quality issue. The required bug fix must at minimum ensure it cannot reach the provider as malformed image bytes. Architecture review should confirm whether a new browser error code is needed for empty capture.

## Persisted Data Transition Evidence

- Current stored subject, location, representative shape, and approximate volume: Run memory snapshots and raw traces under the user's memory directory; entries contain image paths and tool metadata, not generated byte payloads. Existing production DB is not changed by this task.
- Relevant code-model, serialization, semantic, or physical-store change: None proposed.
- Normal readers and writers: Existing snapshot reader and writer can read historical image paths. No version-specific branch is needed.
- Representative direct-read evidence: Captured snapshot reads normally and proves image path is preserved.
- Required semantics and invariants preserved by direct use: Yes — historical conversation and tool facts remain readable; future rendering refuses invalid bytes.
- Physical storage constraints: Do not copy credentials or rewrite user memory; screenshot files may be ephemeral.
- Concrete migration benefit and cost: Migration has no benefit and adds I/O and corruption risk; not a candidate.
- Existing migration framework: N/A.

## Constraints / Dependencies / Compatibility Facts

- No Luna-specific compatibility path or fallback model.
- No backward-compatible duplicate media representation; fix current source-to-bytes contract directly.
- Existing Promise.allSettled renderer behavior is a useful local failure boundary.
- Browser bridge error serialization has a finite error-code set; implementation should reuse it or add only the smallest explicit screenshot-failure code if needed.
- Focused tests need workspace dependencies; current worktree has no installed Vitest binary.

## Open Unknowns / Risks

- Whether the Electron browser view can be made non-zero-sized during capture with a small existing lifecycle adjustment. This is not required to prevent the provider error but affects screenshot usability.
- Capture and writer should both validate: capture owns the browser-facing typed failure, while the writer enforces the local no-empty-file invariant as defense in depth.
- Whether downstream API/E2E can run a real Electron/browser bridge; if not, use deterministic focused browser unit coverage and preserve captured evidence.

## Notes For Architecture Reviewer

The complete solution package proposes a targeted code-owned change: move intrinsic static model metadata beside each built-in definition, keep live overlays and dynamic discovery explicit, reject empty media bytes in the shared converter, ensure OpenAI Responses does not emit empty image items, reject empty screenshot buffers before successful artifact reporting, and add recovery/capability boundaries. Broad catalog behavior, UI, routing, persistence migration, and broad runtime refactoring remain out of scope.


## SR-002 Recovery And Cross-Model Compatibility Findings

### Follow-up turn poisoning is confirmed

The latest captured run data shows the user did send a follow-up message. The raw trace contains turn_0002 with text content and no media. However, the working-context snapshot contains the previous tool-continuation user message with image_urls set to the zero-byte screenshot path, followed by the new text message. This explains the repeated provider error: the next request includes the old image even though the new user message is text-only.

The current implementation appends the request to working context before provider streaming. LlmPhase returns a visible error from its stream catch, and LLMResponsePipeline intentionally skips normal response processors for isError responses. No rollback or quarantine removes the failed request from the active working context. The failure is therefore recoverable at the turn lifecycle but not at the working-context lifecycle.

### DeepSeek-style unsupported input path

The built-in DeepSeek adapter installs DeepSeekChatRenderer, which inherits OpenAIChatRenderer. OpenAIChatRenderer emits image_url parts for every Message.image_urls entry after conversion. There is no model input-modality capability in LLMModel or ModelInfo, and the built-in DeepSeek definitions do not declare image input unsupported. A valid ContextFile can therefore reach a provider that rejects the image before the LLM can produce a continuation.

This is a shared capability and recovery gap, not a DeepSeek-only renderer defect. A provider-neutral model capability state plus outbound media sanitization is preferred over renderer-name or model-name branches.

### Correct error ownership

- Screenshot and media-read validation failures belong to tool execution and should become normal ToolResultEvent errors with no ContextFile.
- Known unsupported model input belongs at the media/tool boundary or outbound sanitizer and should be reported to the LLM as a bounded diagnostic while preserving the turn.
- Provider request failures belong to LlmPhase and should remain LLM diagnostics. They must not be represented as fake tool results.
- The LLM request boundary must be transactional so any provider or renderer failure cannot poison the next user turn.

### Updated design health

- Change posture remains Bug Fix with a recovery-scope expansion.
- Root cause now includes a Missing Invariant, Missing Recovery Boundary, and Missing Model Input-Capability Contract.
- Refactor now: targeted static model-catalog refactor required; no broad runtime refactor. A small model capability field, request sanitizer, and request-boundary rollback are justified because they protect all current providers and direct user media.
- Persisted data remains Not Affected. Canonical raw traces remain preserved; working-context snapshots are restored to the last known-good boundary after a failed request.
- Automatic provider retry is not approved for this task. The classifier premise is unproven; unknown-provider rejection receives rollback plus a recoverable LLM diagnostic and no retry.

### Updated risks and open decisions

- Model capability metadata may be unavailable for dynamic/custom models; unknown must remain a valid state; it does not authorize provider retry in this task.
- A future retry design would need a stable normalized provider error classifier and representative unknown-model fixtures; that evidence is not present for this task, so retry remains out of scope.
- Adding a new browser screenshot error code may require a small bridge contract update; architecture review should choose between that and an existing generic browser failure code.
- Sanitization should remove media from the outbound copy, not canonical history, so switching to a compatible model can still use valid historical references.


## Static Model Metadata Placement Finding

The current model architecture separates model identity/constructor/configuration in autobyteus-ts/src/llm/supported-model-definitions.ts from built-in context limits in autobyteus-ts/src/llm/metadata/curated-model-metadata.ts. LLMFactory builds static LLMModel instances by resolving the curated values, while Ollama, LM Studio, and custom endpoint discovery construct LLMModel instances with runtime-specific values.

The user-approved correction is to colocate intrinsic static model metadata in each built-in model definition. The target definition owns context/input/output limits and multimodalCapabilities, while active runtime values and live provider overrides remain dynamic. The metadata resolver may remain as the live-provider overlay mechanism, but duplicate built-in entries in curated-model-metadata.ts are removed after migration. Source URL and verification date remain alongside the static metadata so provenance is not lost. Dynamic models default multimodalCapabilities to unknown.

## SR-003 Architecture-Correction Findings And Resolution

### AR-001 — Behavior-map and task-health synchronization

The requirements behavior map and design behavior map now both define BE-001 through BE-007. BE-006 is the unknown-capability provider-rejection behavior: rollback plus one bounded LLM diagnostic, no automatic retry. BE-007 is the error-ownership behavior: tool-owned failures remain ToolResultEvent errors and provider-owned failures remain LLM diagnostics. The task-health root cause is now consistently recorded as Missing Invariant + Missing Recovery Boundary + Missing Model Input-Capability Contract in the requirements, investigation, and design package.

### AR-002 — Canonical versus outbound request contract

The current design has one explicit request contract and one sanitizer owner:

- canonicalMessages are the current working-context Message[] after the request-owned append and are retained by MemoryManager.
- outboundMessages are a sanitizer-owned deep clone used only for this request.
- renderedPayload is rendered from outboundMessages.
- Every provider adapter receives outboundMessages or the renderedPayload derived from it; no adapter receives canonicalMessages.
- Provider adapters remain responsible for their provider payload shape, but they cannot reintroduce removed media because the Message[] passed to them is already sanitized.

The concrete owner is autobyteus-ts/src/llm/utils/media-input-sanitizer.ts. The sanitizer is provider-neutral and returns:

SanitizedMediaInput = { outboundMessages: Message[]; diagnostics: MediaInputDiagnostic[]; removedImageCount: number }.

It clones message content and image URL arrays, removes unsupported or invalid image sources from the outbound copy, and does not mutate working context, raw traces, or persisted history. The request assembler owns construction of the complete package:

RequestPackage = { canonicalMessages: Message[]; outboundMessages: Message[]; renderedPayload: unknown; mediaDiagnostics: MediaInputDiagnostic[]; didCompact: boolean }.

There is no parallel encoded-media representation. The renderer and provider are downstream consumers of this package's outbound members.

### AR-003 — Capability defaults and ReadMediaFile propagation

The runtime contract is a shared autobyteus-ts/src/llm/multimodal-capabilities.ts type with per-kind states supported | unsupported | unknown for image, audio, and video. LLMModel.multimodalCapabilities defaults every kind to unknown for dynamic/unverified models. Built-in static definitions set verified values, including DeepSeek V4 image: unsupported. No ModelInfo or GraphQL exposure is required for this ticket.

The active selected model propagates its multimodalCapabilities through BaseLLM/the agent LLM instance into a narrow ReadMediaFile execution context projection. Before ContextFile construction, ReadMediaFile checks regular-file status, file size, and the selected image capability. An explicit unsupported image returns a normal bounded ToolResultEvent error and no ContextFile: The selected model does not support image input. The image was not loaded. Continue without visual analysis and do not claim to have inspected the image. The tool error does not pretend that a provider request occurred. The outbound sanitizer remains defense in depth for direct attachments, historical media, and any path that bypasses ReadMediaFile.

### AR-004 — Request rollback timing, provenance, and transitions

LlmPhase opens a named request-recovery snapshot before system-prompt insertion, compaction, or user/tool-continuation append. The snapshot contains:

{ snapshotId, turnId, requestId, workingContext, compactionRequired, pendingCompactionRequest }.

Raw traces and already-committed tool facts are not part of the rollback target and are preserved. The intended state transitions are:

opened -> assembled -> streamed_success -> committed

and, for failure:

opened|assembled|stream_failed -> rolled_back.

An interruption follows the existing AgentTurnRunner interruption recovery path rather than being misclassified as a provider failure.

On success, normal response/tool ingestion completes before the snapshot is committed/discarded. On assembly failure or unrecovered provider failure, LlmPhase restores the snapshot before returning a visible LLM diagnostic and records recovery provenance at the operation boundary only. The diagnostic is not appended as normal assistant content. A failed image-bearing continuation is therefore removed from active working context, while its raw trace and committed tool facts remain available for diagnostics. A later text-only message starts from the restored boundary.

### AR-005 — Conservative retry decision

The captured zero-byte Luna request is reachable and actionable, but the evidence does not prove a stable cross-provider media-compatibility classifier or representative unknown-model fixtures. The design therefore deliberately does not add provider retry machinery. Unknown-capability image rejection is a recoverable LLM diagnostic after rollback, with no automatic retry. This is the safer behavior for the current user requirement because it guarantees the next turn is usable without risking duplicate provider calls or misclassifying authentication, network, rate-limit, quota, timeout, or generic invalid-request failures.

A future retry proposal must be separate and must define normalized status/code/parameter/message input, exact positive predicates and exclusions, no-output gating, retry provenance, and representative fixtures for supported and unknown models. P-004 is consequently recorded as unresolved future work, not an in-scope dependency.

### AR-006 — Capture and writer checks

The capture boundary owns the browser-facing typed error. BrowserTabErrorCode gains browser_screenshot_failed; BrowserTabPageOperations.captureScreenshot checks the toPNG() buffer before invoking the writer and throws:

new BrowserTabError('browser_screenshot_failed', 'Browser screenshot produced no image bytes.').

The writer independently rejects an empty buffer before directory creation or file writing. Bridge mapping and focused tests cover the new typed capture failure, while the writer test proves no empty file is created. A non-empty buffer retains the existing artifact path and MIME contract.



### AR-007 — Scope and task-health correction

The canonical scope now states that the targeted code-owned static model-catalog refactor is in scope. The out-of-scope boundary is limited to broad catalog behavior, model routing/provider selection, UI/catalog presentation, Luna settings, reasoning settings, persistence migration, and broad runtime refactoring. The investigation bootstrap question and reviewer note now state no broad runtime refactor while retaining the targeted metadata move. The design health label is synchronized to: Targeted static model-catalog refactor required; no broad runtime refactor.

### AR-008 — Actionable static/live metadata and factory contract

The static metadata contract is now exact:

- StaticModelMetadata requires nullable maxContextTokens, maxInputTokens, and maxOutputTokens; required multimodalCapabilities; and required sourceUrl/verifiedAt provenance.
- ResolvedMetadataField<T> carries value, source (live | static_definition | unknown), and static provenance when applicable.
- ResolvedModelMetadata contains one field wrapper per numeric limit. activeContextTokens is absent from static and resolved catalog metadata.
- ModelMetadataResolver.resolve(lookup, staticMetadata) is the sole live/static/unknown numeric merge owner.
- LLMFactory.buildSupportedModels is the explicit construction owner: it destructures staticMetadata, calls the resolver, maps each resolved field explicitly into LLMModel, passes multimodalCapabilities, and registers the model. It never spreads resolver output after the definition.
- Each numeric field uses valid positive live value, then valid positive static value, then null/unknown. Null, undefined, zero, negative, non-finite, and non-integer live values cannot overwrite a static value.
- Dynamic provider constructors remain the owner of activeContextTokens and discovered runtime limits; they default multimodalCapabilities to unknown unless a trusted discovery result provides it.

The catalog construction spine is supportedModelDefinitions -> LLMFactory.buildSupportedModels -> ModelMetadataResolver.resolve -> explicit LLMModel construction -> LLMFactory.registerModel -> BaseLLM/AgentContext -> ReadMediaFile/request sanitizer. The complete curated move set and removal verification are enumerated in design-spec.md. Required tests cover partial live overlay, static fallback, all-unknown resolution, static-definition completeness, duplicate identity absence, null-live preservation, and activeContextTokens isolation.

## SR-004 Architecture-Review-Correction Addendum

ARCH-REV-002 AR-007 and AR-008 are resolved in the current package. The targeted code-owned static catalog move is in scope, while broad catalog behavior/routing/UI changes remain out of scope. The exact LLM-facing unsupported-image ToolResultEvent text is: The selected model does not support image input. The image was not loaded. Continue without visual analysis and do not claim to have inspected the image. The static/live contract, field-by-field merge, per-field provenance, activeContextTokens isolation, explicit LLMFactory construction, catalog spine, duplicate-entry move set, and verification tests are specified in design-spec.md. No implementation handoff is authorized until the next architecture review passes.
