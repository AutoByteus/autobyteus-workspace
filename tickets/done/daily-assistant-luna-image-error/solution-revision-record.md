# Solution Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
|---|---|---|---|---|
| SR-001 | solution_designer initial investigation and design baseline | N/A | Initial Baseline | Design-ready; complete solution package prepared for architecture review. |
| SR-002 | solution_designer user clarification and follow-up recovery investigation | Follow-up snapshot poisoning and DeepSeek inherited image rendering | Recovery Scope Expansion | Design-ready with recovery/cross-model expansion; pending architecture review. |
| SR-003 | solution_designer ARCH-REV-001 correction round and user-approved static metadata discussion | AR-001 through AR-006 | Architecture Correction | Revised design-ready package; handed to architecture review. |
| SR-004 | solution_designer ARCH-REV-002 correction round and user-approved LLM diagnostic wording | AR-007, AR-008 | Scope and Catalog Contract Correction | Revised design-ready package; pending ARCH-REV-003. |

## Revision Entries

### SR-001 — Empty media invariant baseline

- **Triggering role / round:** solution_designer, initial solution round.
- **Triggering findings:** N/A; this is the first recorded solution result.
- **Prior result:** N/A.
- **Current authoritative result:** Design-ready, pending architecture review.
- **Why this revision exists:** Establish the first complete requirements, investigation, design, and evidence package for the Daily Assistant failure observed with the OpenAI gpt-5.6-luna model.
- **Investigation resolution:** The captured Luna run produced a zero-byte browser screenshot artifact. The shared media formatter converted that empty file to an empty base64 payload, and the OpenAI Responses renderer emitted the malformed image data URL data:image/png;base64,, which matches the provider's reported invalid image_url error.
- **Proposed resolution:** Enforce non-empty decoded media at shared conversion boundaries and at browser screenshot artifact creation. Preserve the renderer's existing per-image skip-on-conversion-failure behavior so a bad image cannot create an invalid provider request or erase the surrounding text. Add focused durable tests for empty media and empty screenshots.
- **Affected behavior and requirements:** BE-001 through BE-003; REQ-001 through REQ-004; AC-001 through AC-005.
- **Canonical artifacts updated:**
  - requirements.md
  - investigation-notes.md
  - design-spec.md
- **Supplemental artifact:** runtime-probe-evidence.md, evidence-only, approval N/A. It records the captured run identity, trace IDs, artifact metadata, deterministic malformed payload, and probe limitations.
- **Persisted-data decision:** Not affected. No schema, migration, or historical-data rewrite is proposed.
- **Downstream architecture decisions requested:** Confirm the exact browser-facing error contract for an empty screenshot and whether capture validation, writer validation, or both should own the invariant. Confirm that shared media conversion should reject empty data across local files, URLs, data URIs, and raw base64 sources.
- **Known limitation / residual risk:** Focused Vitest execution was not available in the clean worktree because dependencies are not installed; no live OpenAI request was made because the captured product run plus zero-byte artifact provides sufficient deterministic evidence. Browser dimensions were also observed as zero in the captured run and remain a separate upstream capture-health risk.
- **Next recipient:** architecture_reviewer.

### SR-002 — Recoverable cross-model media handling

- **Triggering role / round:** solution_designer, user clarification and follow-up investigation after SR-001 handoff.
- **Triggering findings:** Follow-up snapshot poisoning and DeepSeek inherited image rendering; see provider-media-recovery-analysis.md.
- **Prior result:** SR-001 design-ready with empty-byte and screenshot invariants only.
- **Current authoritative result:** Design-ready with recovery-scope expansion, pending architecture review.
- **Why this revision exists:** The user clarified that a provider/image failure must not prevent later messages. The latest captured snapshot proves the failed image-bearing tool continuation remains active and is resent with a later text-only message.
- **Investigation resolution:** The failure is not only malformed bytes. LlmPhase appends the request before provider streaming and, on error, returns a visible diagnostic without restoring the pre-request WorkingContext. DeepSeek V4 uses the generic OpenAI-compatible image renderer without an explicit image-input capability, so a valid ContextFile can also trigger a provider rejection.
- **Proposed resolution:** Add a transactional LLM request boundary with pre-request WorkingContext rollback; add provider-neutral model input capability states; declare built-in DeepSeek V4 image input unsupported; reject invalid/unsupported media at tool and outbound-sanitizer boundaries; and allow one same-model media-stripped retry only for pre-output image-compatibility rejection. Keep tool errors as ToolResultEvent errors and provider errors as LLM diagnostics.
- **Affected behavior and requirements:** BE-004 through BE-007; REQ-005 through REQ-008; AC-006 through AC-010. Existing BE-001 through BE-003 and REQ-001 through REQ-004 remain in force.
- **Canonical artifacts updated:**
  - requirements.md
  - investigation-notes.md
  - design-spec.md
- **Supplemental artifact added:** provider-media-recovery-analysis.md, design-impact and intended-behavior analysis; approval pending architecture confirmation.
- **Persisted-data decision:** Still Not Affected. Raw traces and valid historical media references remain preserved; only the active working-context request boundary is restored after failure.
- **Downstream architecture decisions requested:** Confirm capability metadata shape and whether ModelInfo/GraphQL exposure is needed now; confirm ReadMediaFile early capability rejection versus sanitizer-only handling; confirm bounded retry classifier and exact browser screenshot error contract; confirm rollback location and provenance.
- **Known limitation / residual risk:** Dependency installation and focused test execution remain pending implementation/API-E2E. Browser zero dimensions remain a separate capture-health concern. No live provider request was made.
- **Next recipient:** architecture_reviewer for revised package review.


### SR-003 — Architecture-correction and static model metadata refactor

- **Triggering role / round:** solution_designer, architecture review ARCH-REV-001 follow-up and user-approved design discussion.
- **Triggering findings:** AR-001 through AR-006 in design-review-report.md; user clarification that static context/model metadata and multimodal capabilities should be colocated with each static model definition.
- **Prior result:** SR-002 design package failed architecture review because behavior IDs, request ownership, capability propagation, rollback semantics, retry premise, and screenshot error boundaries were underspecified or contradictory.
- **Current authoritative result:** Revised design-ready package pending architecture re-review; implementation handoff remains intentionally absent.
- **Why this revision exists:** Resolve AR-001 through AR-006 and make the model catalog a clearer source of intrinsic static facts without weakening live/dynamic metadata handling.
- **Investigation and design resolution:**
  - Synchronize BE-001 through BE-007 in requirements and design; classify task health as Missing Invariant + Missing Recovery Boundary + Missing Model Input-Capability Contract.
  - Define one RequestPackage with canonicalMessages, sanitizer-owned outboundMessages, renderedPayload, mediaDiagnostics, and compaction state. Provider adapters receive outboundMessages, not canonicalMessages.
  - Add model-owned multimodalCapabilities with supported/unsupported/unknown states. Built-in definitions declare verified values; dynamic models default unknown; DeepSeek V4 image input is unsupported.
  - Colocate intrinsic static context/input/output limits, multimodalCapabilities, and metadata provenance with each built-in model definition. Keep activeContextTokens runtime-specific. Let live provider metadata override static limits, then fall back to static definition, then unknown. Remove duplicate built-in curated entries as a clean-cut refactor.
  - Propagate the selected model's multimodalCapabilities into ReadMediaFile. Reject unsupported images before ContextFile creation; retain the outbound sanitizer as defense in depth.
  - Define named MemoryManager recovery snapshot/restore/commit operations and LlmPhase transitions. Snapshot before system prompt, compaction, or request append; commit after normal response/tool ingestion; restore on assembly/provider failure. Preserve raw traces and committed tool facts; record recovery provenance without normal assistant content.
  - Resolve AR-005 conservatively: no provider retry or classifier in this ticket. Unknown-provider rejection returns a bounded LLM diagnostic after rollback and the next text turn is accepted.
  - Resolve AR-006 with capture and writer checks. Capture owns BrowserTabError code browser_screenshot_failed and message Browser screenshot produced no image bytes.; writer rejects empty buffers before directory/file creation.
- **Affected behavior and requirements:** BE-004 through BE-007; REQ-005 through REQ-008; AC-006 through AC-010. REQ-006 and the model-catalog constraint now also govern static metadata placement; BE-001 through BE-003 remain in force.
- **Canonical artifacts updated:**
  - requirements.md
  - investigation-notes.md
  - design-spec.md
- **Supplemental artifacts updated:**
  - runtime-probe-evidence.md remains evidence-only and unchanged.
  - provider-media-recovery-analysis.md now records the canonical/outbound contract, model metadata placement, rollback semantics, screenshot dual checks, and no-retry decision.
- **Persisted-data decision:** Still Not Affected. Existing run history, raw traces, and historical media references remain directly usable. The model-catalog refactor changes code-owned metadata placement, not persisted run data.
- **Remaining architecture review request:** Confirm the static metadata migration shape, live-over-static precedence, the one outbound sanitizer owner, named rollback API, mandatory ReadMediaFile gate, conservative no-retry behavior, and capture/writer browser error contract.
- **Next recipient:** architecture_reviewer.

### SR-004 — ARCH-REV-002 scope synchronization and actionable catalog contract

- **Triggering role / round:** solution_designer, architecture re-review ARCH-REV-002 and user clarification of the LLM-facing tool diagnostic.
- **Triggering findings:** AR-007 (Requirement Gap) and AR-008 (Design Impact); P-004 remains Unclear but is out of scope because no retry/classifier machinery is proposed.
- **Prior result:** SR-003 failed architecture re-review despite resolving AR-001 through AR-006.
- **Current authoritative result:** Revised design-ready package pending ARCH-REV-003; no implementation handoff.
- **Why this revision exists:** Synchronize the approved targeted static model-catalog refactor scope and make the static/live/provenance/factory contract executable.
- **Resolution:**
  - Broad catalog behavior, routing/provider selection, UI presentation, Luna settings, reasoning settings, persistence migration, and broad runtime refactoring remain out of scope; the targeted code-owned static metadata move is in scope.
  - The LLM-facing unsupported-image ToolResultEvent is exactly: The selected model does not support image input. The image was not loaded. Continue without visual analysis and do not claim to have inspected the image. No human recommendation is included.
  - StaticModelMetadata is required on built-in definitions with nullable maxContextTokens/maxInputTokens/maxOutputTokens, multimodalCapabilities, and sourceUrl/verifiedAt provenance; activeContextTokens is excluded.
  - ResolvedMetadataField and ResolvedModelMetadata preserve per-field live/static_definition/unknown provenance. ModelMetadataResolver.resolve(lookup, staticMetadata) owns field-by-field valid-live -> valid-static -> unknown merge.
  - LLMFactory.buildSupportedModels explicitly destructures static metadata, calls the resolver, maps resolved values and static capabilities into LLMModel, stores resolvedModelMetadata, and registers the model. It never spreads resolver output after the definition.
  - The catalog construction spine, all 27 curated-entry moves, duplicate-removal verification, static completeness tests, partial-live/static/unknown tests, null-live preservation, and activeContextTokens isolation are specified in design-spec.md.
- **Affected behavior and requirements:** AR-007/AR-008 corrections; REQ-006, REQ-007, static metadata constraint, and related design health/scope sections. BE-001 through BE-007 and prior recovery requirements remain in force.
- **Canonical artifacts updated:** requirements.md, investigation-notes.md, design-spec.md.
- **Supplemental artifacts updated:** provider-media-recovery-analysis.md; runtime-probe-evidence.md remains evidence-only and unchanged.
- **Persisted-data decision:** Not Affected. This changes code-owned catalog metadata placement only; run history and raw traces are untouched.
- **Next recipient:** architecture_reviewer for ARCH-REV-003.
