# Design Spec

## Current-State Read

The relevant path is coherent but lacks a non-empty media invariant, a model input-capability contract, and a transactional recovery boundary. A Daily Assistant user request can drive screenshot -> read_media_file; the screenshot result returns an artifact path, the tool continuation converts that ContextFile into Message.image_urls, and OpenAIResponsesRenderer converts the path to an input_image data URL before calling the Responses API. In the captured run, the artifact is zero bytes, so the shared formatter returns an empty string and the renderer emits data:image/png;base64,, which the provider rejects.

The browser screenshot producer owns capture and artifact creation. The shared LLM media formatter owns source-to-base64 conversion. The OpenAI Responses renderer owns provider payload shaping. The defect is a missing invariant at the byte-producing boundaries plus a missing capability and recovery contract; the existing owners remain usable when those contracts are made explicit.

## Intended Change

Add a non-empty-byte invariant to the shared media conversion utility; reject empty screenshot buffers at capture and writer boundaries; add runtime input-capability metadata; reject known-unsupported images in ReadMediaFile; sanitize one outbound Message[] copy for every provider; and make the LLM request boundary rollback on assembly/provider failure. Preserve renderer skip-on-conversion-failure behavior, valid media behavior, and future-turn usability.

## Relevant Behavior And Production-Path Map

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BE-001 | User | REQ-001, REQ-002, REQ-003; AC-001, AC-002, AC-004 | Daily Assistant request causes browser screenshot and read-media continuation. | Captured run uses Luna; screenshot path points to zero-byte PNG; provider rejects next request. | Empty screenshot cannot become provider-invalid input; local failure or skip is truthful. | User -> Agent run -> Browser bridge -> Electron screenshot -> Artifact writer -> read_media_file -> Tool continuation -> Request assembler -> Responses renderer -> Provider; DS-001. |
| BE-002 | Contract | REQ-001, REQ-002; AC-002, AC-003 | Responses image contract requires non-empty base64 data URL. | Formatter returns empty strings for empty sources; renderer emits fulfilled empty image item. | Formatter rejects empty bytes; renderer emits only non-empty input_image items. | Message.image_urls -> media formatter -> Responses renderer -> request; DS-002. |
| BE-003 | System | REQ-003; AC-004 | Screenshot success implies usable PNG buffer. | toPNG output passes directly to writer and zero-byte file is reported as success. | Capture rejects an empty buffer before artifact success. | Browser session -> capturePage -> PNG validation -> writer -> bridge result; DS-003. |
| BE-004 | Runtime | REQ-005; AC-006 | A renderer/provider failure occurs after a request-bearing Message[] has been appended. | LlmPhase returns an error but leaves the failed image-bearing request active, so a later text turn resends it. | LlmPhase restores a named pre-request snapshot before surfacing the diagnostic; raw traces and committed tool facts remain preserved. | LlmPhase -> MemoryManager recovery boundary -> visible diagnostic -> next user turn; DS-005. |
| BE-005 | Runtime | REQ-006, REQ-007; AC-007, AC-010 | A selected model may be explicitly image-unsupported, supported, or unverified. | DeepSeek-style adapters inherit generic image rendering without a capability gate. | Runtime capability metadata is provider-neutral; ReadMediaFile rejects known unsupported images and the outbound sanitizer is defense in depth. | LLM model capability -> AgentContext -> ReadMediaFile or request sanitizer -> provider renderer; DS-006. |
| BE-006 | Runtime | REQ-007, REQ-008; AC-008, AC-009 | An unknown-capability provider rejects an image before output. | No stable classifier or safe retry contract is proven. | Return one bounded recoverable LLM diagnostic after rollback; do not automatically retry in this change. | Provider stream failure -> LlmPhase diagnostic/recovery; DS-006, DS-007. |
| BE-007 | Contract | REQ-008; AC-009 | A tool, renderer, or provider reports an error. | Error ownership is not explicit across tool continuation and provider streaming. | Tool-owned failures remain ToolResultEvent errors; provider-owned failures remain LLM diagnostics; neither is synthesized as the other. | ToolPhase or LlmPhase -> existing error surface; DS-007. |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| /Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-luna-image-error/tickets/done/daily-assistant-luna-image-error/runtime-probe-evidence.md | Captured run, trace, zero-byte artifact, and deterministic malformed-payload evidence. | REQ-001, REQ-002, REQ-003; AC-001, AC-002, AC-004 | Establishes the current production witness and validates target boundaries. | Complete; evidence only; approval N/A. |
| /Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-luna-image-error/tickets/done/daily-assistant-luna-image-error/provider-media-recovery-analysis.md | Recovery and cross-model compatibility analysis, including snapshot poisoning evidence and proposed failure semantics. | REQ-005, REQ-006, REQ-007, REQ-008; AC-006 through AC-010 | Defines the recovery expansion, capability propagation, canonical/outbound request contract, rollback semantics, and conservative no-retry decision requiring architecture confirmation. | Complete for solution round; intended-behavior supplement pending architecture review. |

## Task Design Health Assessment

- Change posture: Bug Fix.
- Current design issue found: Yes.
- Root cause classification: Missing Invariant + Missing Recovery Boundary + Missing Model Input-Capability Contract.
- Refactor needed now: Targeted static model-catalog refactor required; no broad runtime refactor.
- Evidence: Current owners are natural and the end-to-end flow is traceable, but three contracts are incomplete: the formatter/writer accept empty bytes, LlmPhase does not restore a failed request boundary, and model metadata does not state input capabilities. Provider adapters also re-render the Message[] they receive, requiring sanitization before that shared boundary.
- Design response: Strengthen byte-producing owners; add a provider-neutral capability shape; make ReadMediaFile the early known-unsupported gate; make one request assembler-owned outbound sanitizer the provider input boundary; and make LlmPhase/MemoryManager own rollback. Do not add a Luna-specific branch, provider retry, or browser logic to the LLM subsystem.
- Refactor rationale: No broad runtime refactor is needed. A targeted model-catalog refactor is required because intrinsic static context metadata is separated from its model definitions; capability, sanitizer, and recovery structures remain semantically tight at existing boundaries.
- Intentional deferrals and residual risk: The zero-dimensional browser view that produced the empty PNG may remain a separate browser layout defect. This design prevents that defect from becoming a provider-invalid request and makes it observable as a local screenshot failure.

## Terminology

- Non-empty media invariant: A successful media-to-bytes conversion contains at least one byte; a screenshot success contains a non-empty PNG buffer.
- Invalid media: A source that cannot provide non-empty bytes, including zero-byte files, empty downloads, empty raw base64, and empty base64 data URIs.

## Design Reading Order

This design follows the verified behavior map, then the end-to-end spines, then ownership and file mapping. It keeps the change local to existing boundaries.

## Legacy Removal Policy

- Policy: No backward compatibility; remove legacy code paths.
- Required action: No obsolete legacy path is retained. Empty-success behavior is removed rather than wrapped with a Luna-only fallback.
- Candidate provider-specific fallback: Rejected because the malformed payload violates a shared media contract.

## Persisted Data / State Transition Decision

- Stored subject, location, representative shape, and approximate volume: Existing working-context snapshots and raw traces may retain image paths and tool-result metadata under the user's memory directory. No schema field changes are proposed.
- Relevant code-model, serialization, semantic, or physical-store change: None.
- Normal reader and writer behavior: Existing snapshot readers can continue reading captured paths; runtime validates bytes when rendering future requests.
- Required semantics and invariants under direct use: Historical run meaning and tool trace identity remain intact; no migration is required.
- Physical-store and operational constraints: Avoid copying secrets or rewriting large run history. Empty browser artifacts are ephemeral.
- Decision: Not Affected.
- Decision rationale: A migration would not repair or need to rewrite existing external screenshots and would add I/O and corruption risk.
- Supported criteria: AC-001 and AC-004; preserve historical run data.

Migration plan: N/A — persisted data is not affected.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BE-001 | Daily Assistant user request | OpenAI result or local invalid-media handling | Agent execution plus media boundaries | Shows the full user-to-provider path. |
| DS-002 | Primary End-to-End | BE-002 | Message.image_urls | Provider-valid Responses input | Shared media formatter / Responses renderer | Proves empty values cannot cross provider boundary. |
| DS-003 | Primary End-to-End | BE-003 | Browser page capture | Successful artifact or screenshot failure | Browser screenshot owner | Ensures success implies non-empty artifact. |
| DS-004 | Return-Event | BE-001, BE-003 | Screenshot or media failure | Agent activity/error surface | Browser bridge and tool-result transport | Keeps failure truthful and avoids false image context. |
| DS-005 | Primary + bounded local recovery | BE-004, BE-007 | LlmPhase request opening | Restored active context plus visible diagnostic and usable next turn | LlmPhase with named MemoryManager recovery API | Makes snapshot timing, provenance, and failure transitions explicit. |
| DS-006 | Primary media-capability | BE-005, BE-006 | Selected model capability and canonical Message[] | Provider-safe outbound request or recoverable no-retry diagnostic | Request assembler/sanitizer and provider adapters | Ensures all adapters receive the sanitized Message[] rather than only a pre-rendered payload. |
| DS-007 | Return-Event | BE-006, BE-007 | Tool/provider failure | Correct ToolResultEvent or LLM diagnostic surface | ToolPhase and LlmPhase | Prevents synthetic cross-owner errors. |
| DS-008 | Primary catalog construction | BE-005 | Built-in static model definition | Registered LLMModel with merged limits, per-field provenance, and multimodalCapabilities | LLMFactory with ModelMetadataResolver | Makes static/live/unknown precedence and active-context isolation executable. |

## Primary Execution Spine(s)

- DS-001: Daily Assistant request -> Agent turn/tool orchestration -> Browser bridge -> Electron screenshot capture -> Screenshot artifact -> read_media_file -> Tool continuation -> LLM request assembler -> OpenAI Responses renderer -> OpenAI Responses API.
- DS-002: Message.image_urls -> Shared media source converter -> Responses input_image item -> Provider request validation.
- DS-003: Browser session -> webContents.capturePage -> PNG validation -> Screenshot artifact writer -> Browser bridge result.
- DS-005: Agent turn -> LlmPhase opens recovery snapshot -> request assembler compacts/appends canonical context -> provider stream -> commit on success or restore on failure -> visible diagnostic -> next user turn.
- DS-006: Selected LLM model -> input capability projection -> ReadMediaFile early gate or request assembler -> media-input-sanitizer -> outbound Message[] -> each provider renderer/adapter -> provider request.
- DS-007: Tool or provider boundary -> owning error type -> normal tool continuation or LLM diagnostic -> lifecycle remains usable.
- DS-008: supportedModelDefinitions -> LLMFactory.buildSupportedModels -> ModelMetadataResolver.resolve -> explicit LLMModel construction -> LLMFactory.registerModel -> BaseLLM/AgentContext consumers.

## Spine Narratives

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | User request starts a Daily Assistant turn. Browser screenshot and read_media_file produce a continuation path. Request assembly carries the path to the media formatter and Responses renderer; empty bytes must be rejected before provider submission. | Daily Assistant run, browser screenshot, tool continuation, request assembler, Responses renderer | Agent runtime for sequencing; byte boundaries for validity | Memory traces, bridge serialization, logging, provider errors. |
| DS-002 | Message image source becomes base64. Existing all-settled conversion handling skips rejected sources. The change makes empty values reject, so only non-empty data URLs are emitted. | Message, media converter, Responses renderer | Media utility for bytes; renderer for provider shape | MIME detection and local-path checks. |
| DS-003 | Electron captures a page and obtains PNG bytes. Capture checks the result before delegating to the writer; writer can enforce the file boundary as a second defense. | Browser session, screenshot capture, artifact writer | Browser screenshot subsystem | Full-page bounds restoration and emulation hooks. |
| DS-005 | LlmPhase opens the snapshot before system prompt, compaction, or request append. The request package is assembled from canonical context but provider adapters receive only outboundMessages. Success commits after normal response/tool ingestion; assembly or provider failure restores the snapshot and returns a diagnostic. | LlmPhase, MemoryManager, LLMRequestAssembler | LlmPhase for sequencing; MemoryManager for authoritative working-context recovery | Raw traces and committed tool facts are preserved outside the rollback target. |
| DS-006 | Model capabilities are runtime-only and default to unknown. ReadMediaFile rejects explicit unsupported images before ContextFile creation. The single sanitizer deep-clones Message[] and removes unsupported/invalid image sources before rendering; all provider adapters consume that outbound copy. Unknown-provider rejection is not retried in this task. | LLMModel, AgentContext, ReadMediaFile, sanitizer, provider adapters | LLM runtime and request assembler | Direct attachments and historical media require defense in depth. |
| DS-007 | Tool-owned failures are ToolResultEvent errors; provider-owned failures are LLM diagnostics. Neither is converted into the other or persisted as normal assistant content. | ToolPhase, LlmPhase, AgentTurnRunner | Failing boundary owns error representation | Recovery provenance may be operation-boundary tracing only. |

## Spine Actors / Main-Line Nodes

- Daily Assistant agent turn/tool orchestration.
- Browser tool bridge.
- Electron browser screenshot capture.
- Screenshot artifact writer.
- read_media_file and tool-result continuation.
- LLM request assembler.
- Shared media source converter.
- OpenAI Responses renderer.
- OpenAI Responses API.
- Static model definition and metadata resolver.
- LLMFactory model construction and registry.

## Ownership Map

- Agent orchestration owns turn sequencing and tool correlation; it must not validate provider-specific bytes.
- LlmPhase owns request lifecycle, output-before-error observation, recovery state transitions, and visible provider diagnostics; it must use MemoryManager's named recovery boundary rather than manipulating internal context state directly.
- MemoryManager owns the active WorkingContext and named snapshot/restore/commit operations; raw traces and committed tool facts are outside the rollback target.
- LLMRequestAssembler owns canonical request append/compaction and construction of RequestPackage; it must pass outboundMessages to every renderer/provider adapter.
- media-input-sanitizer owns the provider-neutral outbound Message[] clone and media diagnostics; it must not mutate canonical history or select models.
- Browser bridge owns transport and error serialization; it must not report rejected artifact success.
- Electron screenshot capture owns page capture and non-empty PNG validation; it must not shape LLM payloads.
- Screenshot writer owns file creation and may enforce the same buffer invariant; it must not inspect OpenAI formats.
- Tool-result continuation owns ContextFile-to-next-input translation; it must not encode media.
- Request assembler owns memory plus continuation Message assembly and the canonical/outbound RequestPackage; it must not pass canonicalMessages to provider adapters.
- Shared media converter owns source conversion and non-empty result invariant; it must not select provider behavior.
- LLM model metadata owns runtime multimodal capability defaults/definitions; it must not become a UI-only hint.
- Static model definitions own intrinsic catalog metadata and provenance; ModelMetadataResolver owns live/static/unknown numeric merge; LLMFactory owns explicit construction and registration.
- ReadMediaFile owns early file and explicit capability validation before ContextFile creation; it must not encode provider payloads.
- Browser capture owns the browser-facing typed screenshot failure; the artifact writer independently owns the local write invariant.
- Responses renderer owns input_image shaping and skip-on-conversion-failure; it must not read browser files directly.

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Browser bridge screenshot handler | Browser session manager and screenshot capture | Exposes browser tool contract to server runtime. | File validation or LLM request shaping. |
| LLMRequestAssembler | LlmPhase and MemoryManager | Builds canonical and sanitizer-owned outbound RequestPackage. | Provider-specific retry/classification or direct canonical Message[] submission. |
| ReadMediaFile tool | Agent tool runtime and capability projection | Exposes supported media-read action and early explicit capability gate. | OpenAI-specific encoding or provider error classification. |
| ReadMediaFile tool | Agent tool runtime and continuation builder | Exposes supported media-read action. | OpenAI-specific encoding. |

## Removal / Decommission Plan

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Empty-success media conversion | Violates provider input invariant. | Shared media formatter validation. | In This Change | No compatibility branch. |
| Empty-success screenshot artifact | Produces misleading path and later provider failure. | Screenshot capture/writer validation. | In This Change | Valid artifact contract remains. |
| Luna-only fallback branch | Duplicates policy and masks shared defect. | Shared formatter and browser owners. | In This Change | Explicitly rejected. |

## Return Or Event Spine(s)

DS-004: Empty screenshot buffer -> browser capture or bridge error -> tool diagnostic -> no successful image context -> no malformed provider request. Valid screenshot returns the existing artifact result and follows normal continuation.

## Bounded Local / Internal Spines

- Parent owner: OpenAIResponsesRenderer.
  - Chain: image_urls -> all-settled mediaSourceToBase64 -> fulfilled non-empty result -> input_image; rejected or empty result -> diagnostic and skip.
  - Why it matters: This is the final provider-safety gate and already has the correct local degradation seam.
- Parent owner: BrowserTabPageOperations.
  - Chain: capturePage -> toPNG -> non-empty check -> writer.
  - Why it matters: It prevents invalid capture from becoming successful artifact.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Working-context snapshots and raw traces | DS-001, DS-004 | Agent runtime / memory | Preserve tool provenance and image path. | Supports history and diagnostics. | Memory logic in browser/media owners fragments lifecycle. |
| MIME detection | DS-002 | Shared media converter | Infer MIME for valid local sources and data URI headers. | Centralizes source policy. | Renderer-level MIME logic duplicates policy. |
| Browser bounds restoration | DS-003 | Screenshot capture | Preserve full-page lifecycle. | Existing browser behavior. | Mixing it with LLM validation couples subsystems. |
| Diagnostics | DS-002, DS-004 | Renderer and bridge | Explain skipped media or failed capture. | Makes degradation truthful. | Provider-specific tool translation hides ownership. |

## Ownership Boundaries

Authority changes at browser bridge -> Electron capture; capture -> artifact writer; tool result -> continuation builder; continuation -> request assembler; request assembler -> shared media converter; converter -> Responses renderer. Upstream callers must not bypass the shared converter to build OpenAI image data URLs, and browser components must not know provider payload types.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| BrowserTabPageOperations.captureScreenshot | capturePage, toPNG, artifact writer | Browser session manager and bridge | Returning raw PNG path without validation | Strengthen capture result/error contract. |
| LLMRequestAssembler.prepareRequest | canonical append, sanitizer, render package | LlmPhase and provider adapters | Passing canonicalMessages to a provider adapter or sanitizing only renderedPayload | Strengthen RequestPackage contract. |
| MemoryManager LLM recovery API | working-context snapshot and restore state | LlmPhase | Direct ad hoc replacement without request provenance | Add named snapshot/restore/commit methods. |
| mediaSourceToBase64 | Data URI parsing, download, file read, raw-base64 validation | All renderers | Renderer reads files or accepts empty values | Strengthen converter invariant. |
| OpenAIResponsesRenderer.render | Responses message, tool, and image shaping | Request assembler and OpenAIResponsesLLM | Building input_image outside renderer | Keep one Responses payload owner. |
| media-input-sanitizer.sanitize | Provider-neutral outbound Message[] | LLMRequestAssembler and all provider adapters | Passing an unsanitized Message[] to BaseLLM after sanitizing a pre-rendered payload | Keep one outbound sanitizer owner. |

## Dependency Rules

- Runtime orchestration may call browser tools and request assembly, but not browser artifact internals or provider image builders.
- Browser code may depend on browser contracts and filesystem writer, not LLM renderers.
- Media formatter may use filesystem, HTTP, and MIME utilities; renderers may call it.
- Responses renderer may call media formatter and provider payload helpers, not screenshot capture or memory stores.
- Tests use temporary fixtures and fake capture buffers; no test uses provider secrets.
- Forbidden shortcut: model-specific gpt-5.6-luna behavior in any media path.

## Interface Boundary Mapping

| Interface / API / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| BrowserTabPageOperations.captureScreenshot | Browser screenshot capture | Return successful screenshot only for non-empty PNG bytes. | BrowserTabRecord, full-page flag, optional hooks. | Existing interface; behavior strengthened. |
| BrowserScreenshotArtifactWriter.write | Screenshot artifact persistence | Persist non-empty PNG buffer and return path. | Buffer, browser session ID. | Existing interface; behavior strengthened. |
| mediaSourceToBase64 | Shared source conversion | Return non-empty base64 or reject. | Data URI, HTTP(S) URL, valid local media path, or raw base64 string. | Existing interface; invariant strengthened. |
| OpenAIResponsesRenderer.render | Responses payload | Emit valid message, tool, and image items. | Message array. | Existing renderer; skips conversion failures. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| mediaSourceToBase64 | Yes | Yes | Low | Add non-empty contract. |
| captureScreenshot | Yes | Yes | Low | Add empty-buffer failure. |
| BrowserScreenshotArtifactWriter.write | Yes | Yes | Low | Reject empty buffer. |
| OpenAIResponsesRenderer.render | Yes | Yes | Low | Keep provider shaping behind renderer. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Media conversion | mediaSourceToBase64 | Yes | Low | Preserve name; strengthen contract. |
| Screenshot capture | BrowserTabPageOperations.captureScreenshot | Yes | Low | Preserve owner; validate output. |
| Screenshot persistence | BrowserScreenshotArtifactWriter | Yes | Low | Preserve owner; reject empty buffer. |
| Responses shaping | OpenAIResponsesRenderer | Yes | Low | Preserve boundary. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Decision | Why |
| --- | --- | --- | --- |
| Empty media validation | Shared LLM media utilities | Extend | Already owns all source-to-bytes conversions. |
| Responses image shaping | OpenAI Responses renderer | Extend | Already owns input_image shape and conversion handling. |
| Empty screenshot artifacts | Electron browser screenshot subsystem | Extend | Already owns capture and artifact creation. |
| Regression coverage | Existing TS and Web Vitest suites | Extend | Existing focused files match each owner. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared LLM media utilities | Source detection, byte conversion, non-empty invariant | DS-002 | Renderers | Extend | No new abstraction. |
| OpenAI Responses rendering | Provider item shape and skip behavior | DS-002 | LLM request path | Extend | Luna remains normal Responses model. |
| Browser screenshot artifacts | Page capture, PNG validation, persistence | DS-003 | Browser bridge | Extend | Keep browser error contract aligned. |
| Focused test suites | Regression evidence | DS-002, DS-003 | Reviewers | Extend | No live provider dependency. |

## Draft File Responsibility Mapping

| Candidate File | Owning Area | Owner / Boundary | Concrete Concern | Why One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| autobyteus-ts/src/llm/utils/media-payload-formatter.ts | Shared media | Media converter | Reject empty results from every source. | One source-to-bytes contract. | Existing helpers. |
| autobyteus-ts/src/llm/prompt-renderers/openai-responses-renderer.ts | Responses rendering | Responses renderer | Defensive omission of empty image item if needed. | One provider payload owner. | Formatter contract. |
| autobyteus-web/electron/browser/browser-tab-page-operations.ts | Browser artifacts | Screenshot capture | Reject empty toPNG output. | Capture lifecycle together. | Browser contracts. |
| autobyteus-web/electron/browser/browser-screenshot-artifact-writer.ts | Browser artifacts | Artifact writer | Reject empty buffers before write. | File boundary owns persistence invariant. | None. |
| Existing formatter, renderer, and screenshot tests | Test areas | Corresponding owners | Empty and valid regression cases. | Existing test responsibility. | Existing fixtures. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Area | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Non-empty byte assertion | Local invariants in formatter and browser writer | Each byte-producing owner | Same semantic invariant at distinct package boundaries; browser must not import LLM utility solely for an assertion. | Yes | Yes | A generic cross-package helper with mixed ownership. |

## Shared Structure / Data Model Tightness Check

| Shared Structure | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlap Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Message.image_urls | Yes | Yes | Low | Preserve as source references, not encoded payloads. |
| Screenshot result tab_id, artifact_path, mime_type | Yes | Yes | Low | Preserve; only non-empty artifacts use it. |

## Final File Responsibility Mapping

| File | Owning Area | Owner / Boundary | Concrete Concern | Why One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| autobyteus-ts/src/llm/utils/media-payload-formatter.ts | Shared media | Media converter | Reject empty data and preserve valid conversion. | Single source owner. | Existing MIME and path helpers. |
| autobyteus-ts/src/llm/prompt-renderers/openai-responses-renderer.ts | Responses rendering | Responses renderer | Ensure no empty input_image; preserve text and skip behavior. | Single provider owner. | Shared converter. |
| autobyteus-web/electron/browser/browser-tab-page-operations.ts | Browser artifacts | Screenshot capture | Reject empty capture output before artifact success. | Capture lifecycle stays together. | Browser contracts. |
| autobyteus-web/electron/browser/browser-screenshot-artifact-writer.ts | Browser artifacts | Artifact writer | Refuse empty buffer before write. | Persistence boundary never creates false success. | None. |
| autobyteus-ts/tests/unit/llm/utils/media-payload-formatter.test.ts | Shared tests | Formatter suite | Empty file, URI, raw, URL and valid cases. | Existing fixture owner. | Existing fixtures. |
| autobyteus-ts/tests/unit/llm/prompt-renderers/openai-responses-renderer.test.ts | Shared tests | Responses suite | Valid image and empty omission. | Existing renderer scope. | Temporary files. |
| autobyteus-web/electron/browser/__tests__/browser-screenshot-artifact-writer.spec.ts | Browser tests | Writer suite | Empty rejection and no-file assertion. | Existing writer scope. | Temporary dirs. |
| Existing browser manager test seam | Browser tests | Capture orchestration | Empty toPNG does not return success. | Reuse existing fake if practical. | Existing fakes. |

## Applied Patterns

- Existing all-settled conversion and degrade pattern in OpenAI renderers.
- Existing temporary-directory tests for media and screenshot artifacts.
- Existing browser tool error serialization and bridge contract.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| autobyteus-ts/src/llm/utils/media-payload-formatter.ts | File | Shared media converter | Enforce non-empty conversion results. | All renderers share this source boundary. | Model-specific branches. |
| autobyteus-ts/src/llm/prompt-renderers/openai-responses-renderer.ts | File | Responses renderer | Omit invalid image item and keep text. | Owns Responses item shape. | File reads or browser calls. |
| autobyteus-web/electron/browser/browser-tab-page-operations.ts | File | Screenshot capture | Validate toPNG before writer. | Owns capture lifecycle. | LLM payload logic. |
| autobyteus-web/electron/browser/browser-screenshot-artifact-writer.ts | File | Artifact writer | Reject empty buffer at file boundary. | Owns successful artifact persistence. | Provider logic. |
| Existing focused test files | Files | Corresponding test owners | Prove invariants and preserved behavior. | Avoid unrelated integration fixtures. | Live provider credentials. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Clear? | Mixed-Layer Risk | Justification |
| --- | --- | --- | --- | --- |
| autobyteus-ts/src/llm/utils | Off-spine concern | Yes | Low | Existing shared source conversion area. |
| autobyteus-ts/src/llm/prompt-renderers | Main-line provider boundary | Yes | Low | Existing payload boundary. |
| autobyteus-web/electron/browser | Browser control and artifact owners | Yes | Low | Existing browser subsystem separates page operations and writer. |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why It Matters |
| --- | --- | --- | --- |
| Empty image conversion | mediaSourceToBase64(zeroBytePng) rejects; renderer logs and omits the image while retaining text. | Renderer emits data:image/png;base64, and provider rejects whole request. | Makes invariant and degradation concrete. |
| Model scope | gpt-5.6-luna uses same validated Responses renderer as other OpenAI Responses models. | if model is Luna, skip or repair image. | Avoids model-specific compatibility path. |
| Screenshot success | capturePage -> toPNG -> assert length > 0 -> write -> success. | capturePage -> write any buffer -> success path. | Success must imply usable artifact. |

## Backward-Compatibility Rejection Log

| Candidate Compatibility Mechanism | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Provider retry, fallback model, or Luna-only compatibility branch | User observed error only with Luna; unknown-provider retry was proposed before classifier evidence existed. | Provider retry is out of scope for this change. The classifier premise is unproven, so rollback plus a recoverable diagnostic is the safe target. | Use model capability metadata, outbound sanitization, and a transactional request boundary; consider retry only in a separately reviewed change. |
| Renderer placeholder image | Would avoid 400 but invent content. | Rejected | Omit invalid image and preserve text/diagnostic. |
| Retain empty artifact and sanitize downstream | Leaves false screenshot success and other consumers exposed. | Rejected | Reject empty screenshot at capture/writer. |
| Dual old and new media fields | No schema change exists. | N/A | Keep Message.image_urls source field. |

## Derived Layering

Not used as a primary design principle. Effective order is browser producer -> tool continuation -> source converter -> provider renderer -> provider. Each layer owns one transformation and does not bypass the next boundary.

## Change / Refactor Sequence

1. Add focused tests for zero-byte image file, empty data URI, empty raw source, and valid image source.
2. Strengthen mediaSourceToBase64 and source helpers so successful conversion requires non-empty bytes. Preserve valid conversion output and current diagnostics.
3. Add or retain a defensive non-empty check in OpenAIResponsesRenderer if implementation review confirms it is useful; do not duplicate file loading.
4. Strengthen browser screenshot capture and writer so empty toPNG output cannot be written or reported as success. Keep full-page restoration in finally.
5. Add deterministic coverage for request-package ownership, known unsupported ReadMediaFile errors, rollback state transitions, no-retry unknown-provider rejection, next-turn recovery, and typed screenshot failure.
6. Run implementation checks, source review, API/E2E coverage investigation, and proportional test review.
7. No persistence migration, compatibility wrapper, provider retry, broad model-catalog behavior/UI/routing change, or release behavior change is needed; the targeted static metadata move is in scope.

## Key Tradeoffs

- Shared conversion validation protects all current renderers that use the utility; renderer-only validation would leave other providers exposed.
- Skipping invalid image while preserving text follows existing conversion-failure behavior and avoids a provider 400, at the cost of continuing without visual context.
- Failing screenshot producer early gives a truthful tool diagnostic and prevents a later provider-specific failure; the separate zero-dimension browser cause can be handled independently.

## Risks

- A screenshot capture may now surface a browser error where it previously returned a misleading path; this is intentional contract correction.
- Existing consumers that depended on zero-byte artifacts are unsupported; zero-byte images are not meaningful media.
- Browser view may still produce non-empty but visually blank captures; this change does not guarantee visual correctness for every lifecycle state.
- Focused tests cannot fully prove Electron capture behavior without desktop runtime; preserve truthful environment evidence.

## Guidance For Implementation

- Check decoded byte length, not just source string length.
- Reject empty values from data URI, file, URL, and raw-base64 paths with a stable local error.
- Preserve MIME inference for valid local files and current fallback MIME behavior for non-local sources.
- Do not log raw image contents or provider credentials.
- If adding a browser error code, update contract, code set, mapper, and focused tests coherently. If an existing generic error is adequate, document that choice in implementation handoff.

## SR-003 Design Addendum — Architecture-Correction Package

This addendum supersedes the SR-002 retry proposal and is the current design authority for the recovery expansion. The original empty-byte design remains in force for BE-001 through BE-003.

### Updated design health

- Change posture: Bug Fix with a recovery-scope expansion.
- Root causes: Missing Invariant + Missing Recovery Boundary + Missing Model Input-Capability Contract.
- Refactor posture: No broad runtime refactor. A targeted model-catalog refactor is in scope so static definitions own intrinsic metadata; the provider-neutral capability type, one outbound sanitizer, and named request-recovery methods remain narrow structures at existing owners, not a new orchestration layer.
- Persisted data: Not Affected. Raw traces, committed tool facts, and valid historical media references remain preserved. Only the active working-context request boundary is restored after failure.
- Retry posture: No automatic provider retry in this task. The captured path is reachable, but a stable classifier and representative unknown-model fixtures are not proven.

### Static model metadata refactor

The built-in model definition is the canonical owner for intrinsic static model facts. Extend SupportedModelDefinition so each static entry may colocate:

- maxContextTokens;
- maxInputTokens;
- maxOutputTokens;
- multimodalCapabilities;
- metadata source URL and verification date.


A target static entry is shaped like this:

    {
      name: 'deepseek-v4-pro',
      value: 'deepseek-v4-pro',
      provider: LLMProvider.DEEPSEEK,
      llmClass: DeepSeekLLM,
      canonicalName: 'deepseek-v4-pro',
      staticMetadata: {
        maxContextTokens: 1_000_000,
        maxInputTokens: null,
        maxOutputTokens: 384_000,
        multimodalCapabilities: {
          image: 'unsupported',
          audio: 'unsupported',
          video: 'unsupported',
        },
        provenance: {
          sourceUrl: 'https://api-docs.deepseek.com/quick_start/pricing',
          verifiedAt: '2026-04-25',
        },
      },
    }

Keep activeContextTokens dynamic because it describes the active runtime/session rather than the model's intrinsic limit. LLMFactory passes the definition values into LLMModel. ModelMetadataResolver remains responsible only for optional live-provider overlays, with precedence:

live provider value -> static definition value -> unknown.

After migration, remove duplicate built-in numeric entries from curated-model-metadata.ts and update resolver/provenance tests. This is a clean-cut replacement, not a dual-read or duplicate-authority path. Dynamic Ollama, LM Studio, AutoByteus, and custom endpoint models continue to construct LLMModel directly; they use discovered limits where available and default multimodalCapabilities to unknown. Static metadata provenance moves with the definition so no source or verification information is lost.


### Exact static/live metadata contract

The model-catalog refactor uses one definition-owned static contract and one resolver-owned overlay contract.

    type ModelMetadataSourceKind = 'live' | 'static_definition' | 'unknown';

    type StaticModelMetadataProvenance = {
      sourceUrl: string;
      verifiedAt: string;
    };

    type StaticModelMetadata = {
      maxContextTokens: number | null;
      maxInputTokens: number | null;
      maxOutputTokens: number | null;
      multimodalCapabilities: MultimodalCapabilities;
      provenance: StaticModelMetadataProvenance;
    };

    type ResolvedMetadataField<T> = {
      value: T | null;
      source: ModelMetadataSourceKind;
      staticProvenance?: StaticModelMetadataProvenance;
    };

    type ResolvedModelMetadata = {
      maxContextTokens: ResolvedMetadataField<number>;
      maxInputTokens: ResolvedMetadataField<number>;
      maxOutputTokens: ResolvedMetadataField<number>;
    };

StaticModelMetadata is required on every built-in SupportedModelDefinition. Its three numeric fields are required but nullable: null means the static source does not publish a distinct limit. multimodalCapabilities is required and must provide an explicit state for image, audio, and video. Provenance is required for a built-in static entry and preserves the existing source URL and verification date. activeContextTokens is deliberately absent from this type.

ResolvedModelMetadata is the construction-time result consumed by LLMFactory. Each numeric field carries its own source and, when the winning value is static, the static provenance. A partial live response therefore does not collapse provenance for fields that still come from the definition.

The exact field merge rule is applied independently for each numeric field:

1. A valid positive live value wins and produces { value: liveValue, source: 'live' }.
2. Otherwise, a valid positive static definition value wins and produces { value: staticValue, source: 'static_definition', staticProvenance: static.provenance }.
3. Otherwise, the field produces { value: null, source: 'unknown' }.
4. undefined, null, zero, negative, non-finite, and non-integer values are invalid for numeric limits and never overwrite a valid static value.

multimodalCapabilities is supplied by the static definition for built-in models and by an explicit LLMModelOptions value for discovered models when a trusted discovery source exists; otherwise LLMModel applies the all-unknown default. No live capability overlay is introduced in this ticket. activeContextTokens is not merged through this contract: static definitions cannot set it, and dynamic provider discovery remains the only owner of an active runtime value.

SupportedModelDefinition changes from omitting all static limit fields to requiring the static metadata contract. The target shape is:

    type SupportedModelDefinition =
      Omit<LLMModelOptions, 'activeContextTokens' | 'runtime' | 'hostUrl' |
        'maxContextTokens' | 'maxInputTokens' | 'maxOutputTokens' |
        'multimodalCapabilities'> & {
        staticMetadata: StaticModelMetadata;
      };

The definition stores staticMetadata beside the model identity/provider/class/configuration; the factory explicitly maps the resolved numeric values and definition capabilities into LLMModelOptions. This keeps provenance out of the provider adapter and prevents a generic object spread from making null resolver output authoritative.

The corresponding runtime option additions are explicit and optional for dynamic models:

    interface LLMModelOptions {
      multimodalCapabilities?: MultimodalCapabilities;
      resolvedModelMetadata?: ResolvedModelMetadata;
    }

LLMModel applies the all-unknown capability default when `multimodalCapabilities` is absent and stores `resolvedModelMetadata` when the static catalog factory supplies it. Existing `maxContextTokens`, `maxInputTokens`, `maxOutputTokens`, and dynamic-only `activeContextTokens` remain direct runtime fields; `activeContextTokens` is never copied from `StaticModelMetadata` or `ResolvedModelMetadata`.

### Resolver and factory ownership/API

ModelMetadataResolver is the authoritative owner of live/static/unknown numeric resolution. Its target API is:

    resolve(
      lookup: SupportedModelMetadataLookup,
      staticMetadata: StaticModelMetadata,
    ): Promise<ResolvedModelMetadata>;

The resolver loads only provider live numeric metadata. It does not read curated-model-metadata.ts after the migration and it does not resolve activeContextTokens. Its merge function is pure and directly unit-testable.

LLMFactory.buildSupportedModels is the authoritative construction boundary. It destructures each definition, calls the resolver with the definition's static metadata, and explicitly constructs the runtime model:

    const { staticMetadata, ...definition } = definition;
    const resolved = await metadataResolver.resolve(lookup, staticMetadata);
    return new LLMModel({
      ...definition,
      maxContextTokens: resolved.maxContextTokens.value,
      maxInputTokens: resolved.maxInputTokens.value,
      maxOutputTokens: resolved.maxOutputTokens.value,
      multimodalCapabilities: staticMetadata.multimodalCapabilities,
      resolvedModelMetadata: resolved,
    });

The factory never spreads resolver output after the definition. This explicit mapping is the invariant that prevents unknown/null resolver values from overwriting static values. LLMModel stores resolvedModelMetadata for runtime provenance while retaining its existing direct numeric fields for consumers. Dynamic Ollama, LM Studio, AutoByteus, and custom endpoint construction remains separate; those constructors pass discovered numeric values and activeContextTokens directly and receive unknown multimodal defaults unless they explicitly provide trusted capabilities.

### Catalog construction spine

The static catalog primary spine is:

    supportedModelDefinitions
      -> LLMFactory.buildSupportedModels
      -> ModelMetadataResolver.resolve(lookup, staticMetadata)
      -> field-by-field live/static/unknown merge
      -> explicit LLMModel construction
      -> LLMFactory.registerModel
      -> BaseLLM.model / AgentContext
      -> ReadMediaFile and outbound request sanitizer

The meaningful outcome is one registered LLMModel whose numeric limits, per-field provenance, and multimodalCapabilities are internally consistent. No provider renderer or UI catalog path participates in this construction invariant.

### Duplicate-entry migration and verification

The implementation must move every existing curated entry into its matching static definition before removing the duplicate authority. The complete move set is:

- OpenAI: gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna, gpt-5.5, gpt-5.4, gpt-5.4-mini.
- Grok: grok-4.5.
- Anthropic: claude-opus-5, claude-fable-5, claude-opus-4-8/value claude-opus-4.8, claude-opus-4-7/value claude-opus-4.7, claude-sonnet-5, claude-sonnet-4-6/value claude-sonnet-4.6.
- DeepSeek: deepseek-v4-flash, deepseek-v4-pro.
- Mistral: mistral-large-2512/value mistral-large-3, devstral-2512/value devstral-2.
- Gemini: gemini-3.1-pro-preview, gemini-3-flash-preview, gemini-3.5-flash.
- Kimi: kimi-k2.6, kimi-k2.7-code, kimi-k2.7-code-highspeed.
- Qwen: qwen3.7-max, qwen3-max.
- GLM: glm-5.2.
- Minimax: MiniMax-M3/value minimax-m3.

For each move, preserve numeric values, sourceUrl, and verifiedAt exactly; add the explicit multimodal capability contract. The implementation must then remove curated-model-metadata.ts, its import/export path, and its resolver lookup. Verification requires:

- a catalog construction unit test for representative live-partial, static-fallback, and all-unknown cases;
- a static-definition completeness test asserting every built-in definition has required static metadata and every moved curated identity is represented exactly once;
- a repository search/test assertion that no getCuratedModelMetadata, curatedModelMetadata, or stale duplicate table remains;
- a factory test proving a live null/unknown field leaves its static value intact and activeContextTokens remains unchanged.

### Synchronized behavior map

| Behavior ID | Current defect | Target behavior | Owner |
| --- | --- | --- | --- |
| BE-004 | Failed provider/renderer request remains in active working context and poisons the next turn. | Restore a named pre-request snapshot before returning the provider diagnostic; preserve raw traces and committed tool facts. | LlmPhase with MemoryManager recovery boundary |
| BE-005 | DeepSeek-style models inherit generic image rendering without input capability metadata. | Declare provider-neutral runtime capabilities; reject known unsupported image loads in ReadMediaFile; sanitize outbound media for all providers. | LLM model contract, ReadMediaFile, media-input-sanitizer |
| BE-006 | Unknown-capability provider may reject image input and there is no proven safe classifier. | Roll back and return one bounded recoverable LLM diagnostic; do not automatically retry. | LlmPhase |
| BE-007 | Tool and provider errors lack a canonical ownership contract. | Tool-owned failures remain ToolResultEvent errors; provider-owned failures remain LLM diagnostics; no synthetic cross-owner errors. | ToolPhase and LlmPhase |

### Request package and authoritative boundary

The request assembler constructs one package for each LLM request:

    type RequestPackage = {
      canonicalMessages: Message[];
      outboundMessages: Message[];
      renderedPayload: unknown;
      mediaDiagnostics: MediaInputDiagnostic[];
      didCompact: boolean;
    };

- canonicalMessages are the current working-context messages after request-owned system, compaction, user, or tool-continuation changes. They are the canonical in-memory request context retained by MemoryManager.
- outboundMessages is a deep-cloned Message[] produced by the single owner at autobyteus-ts/src/llm/utils/media-input-sanitizer.ts.
- renderedPayload is rendered from outboundMessages only.
- Every BaseLLM/provider adapter receives outboundMessages or a payload derived from it. No provider adapter receives canonicalMessages and no provider re-renders an unsanitized list.
- mediaDiagnostics records bounded source-level omissions. It is an operation-boundary diagnostic, not a fake tool result or normal assistant content.
- didCompact records request preparation state and is part of recovery provenance; it does not create a second context representation.

The sanitizer contract is provider-neutral:

    type SanitizedMediaInput = {
      outboundMessages: Message[];
      diagnostics: MediaInputDiagnostic[];
      removedImageCount: number;
    };

For image media, supported keeps the source; unsupported removes it and records a bounded diagnostic; unknown keeps it for the initial request; invalid or empty sources remove it and record a local diagnostic. The sanitizer does not mutate canonical working context, raw traces, or persisted history. Provider adapters still own their external payload shape, but the Message[] they receive is already sanitized. This resolves the provider re-rendering concern without introducing a second encoded payload.

### Runtime capability metadata and propagation

Add a provider-neutral runtime type at autobyteus-ts/src/llm/multimodal-capabilities.ts:

    type MultimodalCapabilityState = 'supported' | 'unsupported' | 'unknown';
    type MultimodalCapabilities = {
      image: MultimodalCapabilityState;
      audio: MultimodalCapabilityState;
      video: MultimodalCapabilityState;
    };

The selected LLM model owns multimodalCapabilities. Defaults for all model kinds are unknown for dynamic/custom/unverified models. Built-in static definitions set verified values, including DeepSeek V4 image to unsupported; Luna uses the same capability-aware path as other models and has no name-specific branch. This runtime type is sourced by static definitions or dynamic defaults and does not require ModelInfo or GraphQL changes in this ticket.

The active model capability propagates through the existing LLM instance/AgentContext to a narrow ReadMediaFile execution-context projection. ReadMediaFile checks, in order:

1. The path is a regular file under the existing security rules.
2. The file size is non-zero.
3. The selected model's image capability is not explicitly unsupported.
4. Only then construct and return ContextFile.

An explicit unsupported image returns a normal bounded tool error and no ContextFile, for example: The selected model does not support image input. The image was not loaded. Continue without visual analysis and do not claim to have inspected the image. ToolPhase renders this as its ordinary ToolResultEvent error continuation. The sanitizer remains defense in depth for direct attachments, historical context, and paths that do not pass through ReadMediaFile.

### Transactional request recovery

LlmPhase opens the recovery boundary before system-prompt insertion, compaction, or any user/tool-continuation append. MemoryManager owns named methods rather than exposing ad hoc internal mutation:

    type LlmRequestRecoverySnapshot = {
      snapshotId: string;
      turnId: string;
      requestId: string;
      workingContext: WorkingContext;
      compactionRequired: boolean;
      pendingCompactionRequest: PendingCompactionRequest | null;
    };

    captureLlmRequestRecoverySnapshot(input): LlmRequestRecoverySnapshot;
    restoreLlmRequestRecoverySnapshot(snapshot, provenance): void;
    commitLlmRequestRecoverySnapshot(snapshot): void;

The snapshot captures active working context and request-preparation flags. It does not roll back raw traces, tool execution records, or tool facts committed before the LLM request. Provenance includes snapshotId, turnId, requestId, source event, and reason; it is recorded at the operation/recovery boundary without inserting an assistant message.

The bounded local state machine is:

    opened -> assembled -> streamed_success -> committed
    opened|assembled|stream_failed -> rolled_back
    interrupted -> existing AgentTurnRunner interruption recovery

On successful normal response/tool ingestion, commit/discard the snapshot only after ingestion completes. On assembly failure or provider failure, restore before returning the visible LLM diagnostic. Do not call normal assistant-response ingestion for an error response. Interruption is handled by the existing interruption path and is not converted into a provider rollback. A concrete poisoned-turn example is: baseline context -> failed image-bearing continuation appended -> provider failure -> restore baseline -> next text-only message appended without the stale image.

### Conservative unknown-provider behavior

This ticket does not implement a media-compatibility classifier or automatic retry. The evidence proves a reachable failure and the need for recovery, but not a stable normalized provider error contract. Returning a diagnostic after rollback is safer than a speculative retry because it avoids duplicate tool calls, duplicate model output, and misclassification of authentication, network, rate-limit, quota, timeout, or unrelated invalid-request failures.

The recoverable outcome for unknown-capability provider image rejection is therefore:

1. provider stream fails before a usable response;
2. LlmPhase records a bounded provider diagnostic;
3. LlmPhase restores the request snapshot;
4. the diagnostic is visible but is not normal assistant content or a synthetic tool result;
5. the next user text turn is accepted from the restored context.

A future retry change must be separately designed and reviewed with stable normalized status/code/parameter/message input, exact positive predicates and exclusions, no-output gating, retry provenance, and representative supported/unsupported/unknown-model fixtures. P-004 is not an in-scope dependency.

### Browser screenshot failure contract

BrowserTabPageOperations.captureScreenshot owns the browser-facing typed failure:

    const png = image.toPNG();
    if (!png.length) {
      throw new BrowserTabError(
        'browser_screenshot_failed',
        'Browser screenshot produced no image bytes.',
      );
    }

BrowserTabErrorCode and bridge serialization/tests are updated for browser_screenshot_failed. BrowserScreenshotArtifactWriter independently rejects an empty buffer before directory creation or file writing. This is intentional defense in depth: capture provides the precise browser contract, while the writer enforces its local file invariant. Non-empty buffers preserve the existing artifact path and image/png result contract.

### Ownership and dependency rules

- LlmPhase -> LLMRequestAssembler -> media-input-sanitizer -> provider renderer/adapter is the request path.
- LlmPhase -> MemoryManager recovery API is the only rollback path; callers do not directly replace internal working-context state.
- ReadMediaFile depends on the narrow selected-model capability projection, not on provider renderers.
- Provider adapters depend on outboundMessages and may re-render them, but must not receive canonicalMessages.
- Browser capture/writer depend only on browser contracts and filesystem persistence; they never depend on LLM payload types.
- The sanitizer is the only provider-neutral outbound media-removal owner.
- No Luna-specific branch, fallback model, compatibility wrapper, dual media representation, or automatic retry is added.

### Final file responsibility additions

| Path | Change | Responsibility |
| --- | --- | --- |
| autobyteus-ts/src/llm/supported-model-definition.ts | Modify | Allow static context/input/output metadata, multimodalCapabilities, and provenance on each built-in definition. |
| autobyteus-ts/src/llm/llm-factory.ts | Modify | Own the static-definition -> resolver -> explicit LLMModel construction -> registration boundary; never spread unknown resolver output over definitions. |
| autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts | Modify | Apply live provider metadata over static definition values, then unknown. |
| autobyteus-ts/src/llm/metadata/curated-model-metadata.ts | Remove | Decommission duplicate built-in static metadata after migration; do not retain dual authority. |
| autobyteus-ts/src/llm/multimodal-capabilities.ts | Add | Tight runtime image/audio/video capability states and defaults. |
| autobyteus-ts/src/llm/models.ts and supported-model-definitions.ts | Modify | Carry runtime capabilities and optional resolvedModelMetadata; declare DeepSeek V4 image unsupported; preserve unknown defaults. |
| autobyteus-ts/src/llm/utils/media-input-sanitizer.ts | Add | Clone canonical Message[], remove unsupported/invalid images, emit bounded diagnostics. |
| autobyteus-ts/src/agent/llm-request-assembler.ts | Modify | Build RequestPackage and pass outboundMessages to renderers/adapters. |
| autobyteus-ts/src/agent/loop/llm-phase.ts | Modify | Open/commit/restore recovery boundary and return bounded provider diagnostics; no retry. |
| autobyteus-ts/src/memory/memory-manager.ts | Modify | Own named snapshot/restore/commit operations and recovery provenance. |
| autobyteus-ts/src/tools/multimedia/media-reader-tool.ts | Modify | Reject zero-byte files and explicitly unsupported images before ContextFile creation. |
| autobyteus-web/electron/browser/browser-tab-types.ts and browser-bridge-server.ts | Modify | Add and serialize browser_screenshot_failed. |
| autobyteus-web/electron/browser/browser-tab-page-operations.ts | Modify | Capture-side empty-buffer guard. |
| autobyteus-web/electron/browser/browser-screenshot-artifact-writer.ts | Modify | Writer-side empty-buffer defense. |

### Durable coverage intent

Implementation/API-E2E should investigate and cover:

- media converter rejection for zero-byte files, empty data URIs, and empty raw base64;
- valid image rendering with existing MIME/data-URI behavior;
- capture-side typed screenshot failure and writer no-file assertion;
- capability defaults and built-in DeepSeek V4 unsupported-image metadata;
- ReadMediaFile normal tool error with no ContextFile for unsupported image input;
- sanitizer output containing no unsupported/invalid image while canonical input remains unchanged;
- provider adapter receives outboundMessages rather than canonicalMessages;
- request snapshot timing before prompt/compaction/append, success commit, assembly/provider failure rollback, provenance, and preservation of raw traces/committed tool facts;
- unknown-provider media rejection returns one diagnostic with no automatic retry and a subsequent text turn succeeds;
- tool errors remain ToolResultEvent errors and provider failures remain LLM diagnostics.

### Implementation sequence for the reviewed package (SR-004)

1. Move built-in static context/input/output metadata and provenance beside each model definition; update resolver precedence and remove duplicate curated entries.
2. Add multimodalCapabilities type/defaults and DeepSeek definitions.
3. Add request package and single outbound sanitizer; wire every provider path to outboundMessages.
4. Add ReadMediaFile capability/size gates and preserve normal tool error continuation.
5. Add media non-empty invariant and browser capture/writer checks with typed bridge error.
6. Add named MemoryManager recovery methods and LlmPhase transaction state transitions.
7. Add no-retry provider-failure diagnostic and next-turn recovery coverage.
8. Run implementation-scoped checks, source review, API/E2E investigation/execution, and proportional test review.

The package remains design-ready pending architecture re-review; implementation handoff is intentionally not created by this role.


## SR-004 Design Addendum — ARCH-REV-002 Corrections

- Scope is synchronized: targeted code-owned static model metadata refactor is in scope; broad catalog behavior, routing, UI/presentation, Luna configuration, reasoning settings, persistence migration, and broad runtime refactoring are out of scope.
- The task-health label is synchronized to Targeted static model-catalog refactor required; no broad runtime refactor.
- The known-unsupported ReadMediaFile tool result sent to the LLM is exactly: The selected model does not support image input. The image was not loaded. Continue without visual analysis and do not claim to have inspected the image. It contains no recommendation to a human or to switch models.
- The exact StaticModelMetadata, ResolvedMetadataField, ResolvedModelMetadata, resolver API, factory API, field-by-field merge, per-field provenance, activeContextTokens isolation, catalog construction spine, complete curated move set, duplicate-removal verification, and llm-factory.ts ownership are defined in the Exact static/live metadata contract section above.
- The factory contract is explicit: LLMFactory destructures staticMetadata, calls ModelMetadataResolver.resolve(lookup, staticMetadata), maps each resolved value explicitly, passes staticMetadata.multimodalCapabilities, stores resolvedModelMetadata, and registers the model. Unknown/null resolver values cannot overwrite static definition values.
- No implementation handoff is created; the revised package returns to architecture review as SR-004.
