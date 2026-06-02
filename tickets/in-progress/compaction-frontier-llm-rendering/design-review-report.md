# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/tickets/in-progress/compaction-frontier-llm-rendering/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/tickets/in-progress/compaction-frontier-llm-rendering/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/tickets/in-progress/compaction-frontier-llm-rendering/design-spec.md`
- Current Review Round: 2
- Trigger: Round 2 architecture review requested by `solution_designer` after design-impact rework for AR-001, AR-002, and AR-003.
- Prior Review Round Reviewed: Round 1 in this same report path before overwrite; prior findings rechecked below.
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Static review of the revised requirements, investigation notes, design spec, prior round 1 findings, and representative current-code paths: `autobyteus-ts/src/llm/utils/messages.ts`, `autobyteus-ts/src/memory/working-context-snapshot.ts`, `autobyteus-ts/src/memory/working-context-snapshot-serializer.ts`, `autobyteus-ts/src/memory/memory-manager.ts`, `autobyteus-ts/src/agent/llm-request-assembler.ts`, `autobyteus-ts/src/agent/loop/llm-phase.ts`, `autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts`, `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts`, `autobyteus-ts/src/agent/message/tool-continuation-metadata.ts`, `autobyteus-ts/src/utils/tool-call-format.ts`, `autobyteus-ts/src/llm/prompt-renderers/*text-tool-history-renderer.ts`, and the existing compaction/raw-frontier files.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design handoff | N/A | 3 | Fail | No | Design direction was strong, but metadata dependency direction, MemoryManager mutation authority, and non-native continuation needed rework. |
| 2 | Revised design handoff | AR-001, AR-002, AR-003 | 0 | Pass | Yes | Prior findings are resolved in the revised spec/requirements; implementation may proceed with residual risks noted. |

## Reviewed Design Spec

The revised design is now implementation-actionable. It preserves the core working-context-first architecture and tightens the three previously blocking areas:

- `MessageMetadata` is now explicitly neutral and renderer-ignored in `llm/utils/messages.ts`, with memory-specific provenance owned only by `memory/message-provenance.ts` helpers.
- `MemoryManager` is now the authoritative working-context mutation boundary, with subject-specific append/ingest APIs and explicit decommissioning of higher-level direct `workingContextSnapshot.append*` calls.
- Non-native/text-parser tool continuation is now explicitly modeled as canonical tool-call/tool-result messages plus renderer-owned text-history conversion, not a duplicate synthetic aggregate user message.

The design remains spine-led, names the relevant owners, records clean-cut legacy removal, and gives enough examples and tests for implementation to avoid reintroducing the raw-frontier prompt path or provider-renderer bypass.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design states behavior change + refactor + UX-quality bug fix. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design classifies Boundary/Ownership Issue, File Responsibility Drift, and Shared Structure Looseness; evidence cites raw frontier rendering, raw-trace-first planning, and renderer bypass. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design states refactor needed now and rejects local string cleanup / dual-path compatibility. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Spines, ownership map, removal plan, file mapping, interface map, migration sequence, and tests all support the refactor. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-001 | High | Resolved | Revised design lines/sections mandate neutral `MessageMetadata` in `llm/utils/messages.ts`, forbid `src/memory/*` imports into LLM core, assign memory provenance helpers to `memory/message-provenance.ts`, and add REQ-023 / AC-018. | Dependency direction is now explicit enough for implementation. |
| 1 | AR-002 | High | Resolved | Revised design identifies `MemoryManager` as authoritative working-context mutation boundary, defines `ensureWorkingContextSystemMessage`, `appendWorkingContextUserMessage`, `appendWorkingContextAssistantMessage`, `ingestAssistantToolResponse`, and `appendWorkingContextToolResults`, decommissions direct `workingContextSnapshot.append*`, and adds REQ-024 / AC-019. | Boundary bypass is now named and removed in scope. |
| 1 | AR-003 | Medium | Resolved | Revised design adds DS-007, rejects the legacy synthetic aggregate non-native continuation as LLM-facing live suffix, routes native and non-native tool results through canonical `ToolResultPayload` messages before compaction, and adds REQ-025 / AC-020. | Remaining exact metadata/constant naming for the continuation signal is implementation detail, not design-blocking. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | No-tool final-response immediate compaction | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Native tool-call response deferred-until-results compaction | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 | Non-native/text-parser tool continuation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Compaction lifecycle event/status spine | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Message-window planning bounded local spine | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Compactor/provenance/archive bounded local spine | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Bootstrap fallback | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `memory/working-context` / `MemoryManager` | Pass | Pass | Pass | Pass | Now owns authoritative mutation, provenance attachment, serializer handoff, and snapshot lifecycle. |
| `memory/compaction` | Pass | Pass | Pass | Pass | Planner/compactor/rebuilder/prompt-builder split is sound. |
| `agent/loop` | Pass | Pass | Pass | Pass | Owns timing and continuation signaling without owning compaction content. |
| `llm/prompt-renderers` | Pass | Pass | Pass | Pass | Native/text provider formatting remains renderer-owned. |
| `memory/store` | Pass | Pass | Pass | Pass | Archive/prune and compacted memory persistence stay behind compactor/store boundaries. |
| `memory/restore` | Pass | Pass | Pass | Pass | Recovery-only raw-trace projection is separate from runtime compaction. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Message unit identity/classification | Pass | Pass | Pass | Pass | Specialized variants are named and compaction-local. |
| Neutral message metadata | Pass | Pass | Pass | Pass | LLM core owns neutral `MessageMetadata`; no memory import allowed. |
| Message provenance helper | Pass | Pass | Pass | Pass | Memory owns typed helper functions over neutral metadata. |
| Compacted memory message wording | Pass | Pass | Pass | Pass | Dedicated builder remains sound. |
| Budget calculation result | Pass | Pass | Pass | Pass | Strategy interface satisfies estimated-now/exact-later requirement. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `MessageMetadata` | Pass | Pass | Pass | N/A | Pass | Neutral, non-rendered metadata container only. |
| `MessageProvenance` helper data | Pass | Pass | Pass | N/A | Pass | Scoped to raw trace IDs, source kind, optional turn/tool IDs; does not duplicate role/content. |
| `MessageUnit` | Pass | Pass | Pass | Pass | Pass | Variant guidance avoids an optional-heavy event model. |
| `MessageCompactionPlan` | Pass | Pass | Pass | Pass | Pass | Separates compactable, retained, protected, and archive/provenance IDs. |
| Compacted memory message content | Pass | Pass | Pass | N/A | Pass | Natural, action-oriented message rule is explicit. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime raw-trace compaction planner path | Pass | Pass | Pass | Pass | Replaced by `WorkingContextMessageWindowPlanner`. |
| `FrontierFormatter` in LLM-facing path | Pass | Pass | Pass | Pass | Debug-only retention, if any, is constrained. |
| `[RAW_FRONTIER]` user-message section | Pass | Pass | Pass | Pass | Replaced by retained canonical suffix messages. |
| Raw `CompactionTaskPromptBuilder` runtime use | Pass | Pass | Pass | Pass | Replaced by natural message-unit prompt builder. |
| Split assistant tool-response ingestion | Pass | Pass | Pass | Pass | Replaced by `MemoryManager.ingestAssistantToolResponse`. |
| Direct higher-level working-context mutation | Pass | Pass | Pass | Pass | Replaced by subject-specific `MemoryManager` APIs. |
| Legacy synthetic aggregate non-native tool-result user message | Pass | Pass | Pass | Pass | Replaced by `tool_history_only` continuation + text-history renderers over canonical messages. |
| Raw frontier bootstrap fallback | Pass | Pass | Pass | Pass | Replaced by natural recovery projection. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/llm/utils/messages.ts` | Pass | Pass | Pass | Pass | Neutral metadata-only extension is now explicit. |
| `src/memory/message-provenance.ts` | Pass | Pass | Pass | Pass | Memory-specific helper around neutral metadata. |
| `src/memory/memory-manager.ts` | Pass | Pass | Pass | Pass | Authoritative mutation/provenance/persistence boundary. |
| `src/memory/working-context-snapshot-serializer.ts` | Pass | Pass | Pass | Pass | Serializes neutral metadata with schema bump. |
| `src/memory/compaction/working-context-message-unit.ts` | Pass | Pass | Pass | Pass | Clear unit model owner. |
| `src/memory/compaction/working-context-message-unit-builder.ts` | Pass | Pass | Pass | Pass | Clear grouping owner. |
| `src/memory/compaction/message-budget-strategy.ts` | Pass | Pass | Pass | Pass | Clear budget strategy owner. |
| `src/memory/compaction/working-context-message-window-planner.ts` | Pass | Pass | Pass | Pass | Clear planner owner. |
| `src/memory/compaction/working-context-compaction-prompt-builder.ts` | Pass | Pass | Pass | Pass | Clear prompt builder owner. |
| `src/memory/compaction/working-context-compactor.ts` | Pass | Pass | Pass | Pass | Clear summarization/persistence owner. |
| `src/memory/compaction/working-context-snapshot-rebuilder.ts` | Pass | Pass | Pass | Pass | Clear replacement-message owner. |
| `src/agent/llm-request-assembler.ts` | Pass | Pass | Pass | Pass | Request assembly keeps pre-request compaction/render handoff and delegates mutation to MemoryManager. |
| `src/agent/loop/tool-result-continuation-builder.ts` | Pass | Pass | Pass | Pass | Continuation signaling owner; commits results through MemoryManager for native and text-history modes. |
| `src/memory/restore/working-context-recovery-projector.ts` | Pass | Pass | Pass | Pass | Recovery-only projector. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| LLM core `Message` model | Pass | Pass | Pass | Pass | May define neutral metadata; must not import memory modules. |
| `memory/message-provenance.ts` | Pass | Pass | Pass | Pass | May depend on core message metadata; owns memory-specific schema. |
| `MemoryManager` working-context boundary | Pass | Pass | Pass | Pass | Higher callers must use MemoryManager APIs. |
| Provider renderers | Pass | Pass | Pass | Pass | Ignore metadata; own provider/text formatting. |
| `PendingCompactionExecutor` | Pass | Pass | Pass | Pass | Encapsulates planner/compactor/rebuilder. |
| Raw trace archive/prune | Pass | Pass | Pass | Pass | Supporting provenance/archive concern only. |
| Non-native text-history continuation | Pass | Pass | Pass | Pass | Renderer-owned conversion from canonical messages; no synthetic aggregate suffix. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `MemoryManager` working-context authority | Pass | Pass | Pass | Pass | Direct `workingContextSnapshot.append*` is forbidden and replaced by subject APIs. |
| `PendingCompactionExecutor.executeIfRequired/executeNow` | Pass | Pass | Pass | Pass | Authoritative compaction execution entry point. |
| `WorkingContextMessageWindowPlanner.plan` | Pass | Pass | Pass | Pass | Planner authority is clear. |
| `WorkingContextCompactor.compact` | Pass | Pass | Pass | Pass | Summarization/persistence/archive authority is clear. |
| Provider renderer `.render(messages)` | Pass | Pass | Pass | Pass | Provider/text payload shaping remains renderer-owned. |
| `WorkingContextSnapshotBootstrapper` | Pass | Pass | Pass | Pass | Bootstrap fallback does not bypass into runtime raw frontier formatting. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `WorkingContextMessageWindowPlanner.plan(input)` | Pass | Pass | Pass | Low | Pass |
| `MessageBudgetStrategy.calculate(input)` | Pass | Pass | Pass | Low | Pass |
| `WorkingContextCompactor.compact(plan)` | Pass | Pass | Pass | Low | Pass |
| `WorkingContextSnapshotRebuilder.rebuild(input)` | Pass | Pass | Pass | Low | Pass |
| `MemoryManager.ensureWorkingContextSystemMessage(content, options)` | Pass | Pass | Pass | Low | Pass |
| `MemoryManager.appendWorkingContextUserMessage(message, options)` | Pass | Pass | Pass | Low | Pass |
| `MemoryManager.appendWorkingContextAssistantMessage(response, turnId, options)` | Pass | Pass | Pass | Low | Pass |
| `MemoryManager.ingestAssistantToolResponse(response, invocations, turnId)` | Pass | Pass | Pass | Low | Pass |
| `MemoryManager.appendWorkingContextToolResults(events, options)` | Pass | Pass | Pass | Low | Pass |
| `ToolResultContinuationBuilder.build(...)` | Pass | Pass | Pass | Low | Pass |
| `PendingCompactionExecutor.executeNow(input)` | Pass | Pass | Pass | Low | Pass |
| `PendingCompactionExecutor.executeIfRequired(input)` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/memory/compaction/*` new working-context compaction files | Pass | Pass | Medium | Pass | Number of files is acceptable because each owns a concrete concern. |
| `src/memory/message-provenance.ts` | Pass | Pass | Low | Pass | Memory-owned provenance helper around neutral metadata. |
| `src/llm/utils/messages.ts` | Pass | Pass | Low | Pass | Neutral core message model remains memory-agnostic. |
| `src/memory/memory-manager.ts` | Pass | Pass | Medium | Pass | Expanded authority is justified by the working-context boundary. |
| `src/agent/llm-request-assembler.ts` | Pass | Pass | Low | Pass | Request assembly keeps its boundary without owning mutation details. |
| `src/agent/loop/tool-result-continuation-builder.ts` | Pass | Pass | Low | Pass | Continuation signaling belongs in agent loop. |
| `src/memory/restore/working-context-recovery-projector.ts` | Pass | Pass | Low | Pass | Recovery-only placement is sound. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Working context lifecycle | Pass | Pass | N/A | Pass | Extended under `MemoryManager`. |
| Provider rendering | Pass | Pass | N/A | Pass | Existing native/text renderers remain authoritative. |
| Compaction lifecycle/status | Pass | Pass | N/A | Pass | Existing executor/reporter are extended. |
| Message planning | Pass | Pass | Pass | Pass | New working-context planner is justified. |
| Summarizer prompt from messages | Pass | Pass | Pass | Pass | Replacement prompt builder is justified. |
| Raw trace archive/prune | Pass | Pass | N/A | Pass | Reused behind provenance. |
| Bootstrap fallback | Pass | Pass | N/A | Pass | Extended under restore/bootstrap owner. |
| Non-native continuation rendering | Pass | Pass | N/A | Pass | Existing text-history renderers are reused instead of duplicating formatter logic. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Raw frontier prompt path | No target runtime compatibility path | Pass | Pass | Clean replacement with canonical retained suffix. |
| Runtime raw-trace compaction source | No target runtime compatibility path | Pass | Pass | Clean replacement with working-context planner. |
| Bootstrap fallback | Recovery-only raw read remains | Pass | Pass | Allowed only for natural projection when snapshot is unavailable/invalid. |
| Direct working-context mutation | Yes in current code | Pass | Pass | Explicitly removed/replaced in this change. |
| Non-native synthetic aggregate user continuation | Yes in current code | Pass | Pass | Explicitly removed/replaced in this change. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Neutral metadata/schema bump | Pass | Pass | Pass | Pass |
| MemoryManager working-context boundary closure | Pass | Pass | Pass | Pass |
| Native/non-native tool result continuation unification | Pass | Pass | Pass | Pass |
| Message unit planner | Pass | Pass | Pass | Pass |
| Natural prompt builder | Pass | Pass | Pass | Pass |
| Working-context compactor/rebuilder | Pass | Pass | Pass | Pass |
| Executor refactor | Pass | Pass | Pass | Pass |
| No-tool/tool-call timing | Pass | Pass | Pass | Pass |
| Bootstrap fallback | Pass | Pass | Pass | Pass |
| Test replacement and added validation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Post-compaction natural context | Yes | Pass | Pass | Pass | Good/bad prompt examples are clear. |
| Native tool continuation protection | Yes | Pass | Pass | Pass | Structured suffix example is clear. |
| Older consumed tool cycles | Yes | Pass | Pass | Pass | Prevents turn-count retention mistake. |
| Provenance metadata dependency shape | Yes | Pass | Pass | Pass | Good neutral metadata and forbidden memory import are shown. |
| Non-native text-parser continuation | Yes | Pass | Pass | Pass | Canonical messages -> text-history renderer shape is clear. |
| MemoryManager mutation boundary | Yes | Pass | Pass | Pass | Direct append replacement example is clear. |
| Bootstrap recovery | No | N/A | N/A | Pass | Existing narrative is sufficient. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Exact token accounting implementation | Future budgeting precision. | Keep behind `MessageBudgetStrategy`; implement estimated strategy now. | Deferred residual risk, not blocking. |
| Oversized live tool result | A provider-required live result may exceed budget even after compacting everything else. | Escalate to a separate tool-output truncation/artifact policy if encountered. | Deferred residual risk, not blocking. |
| Persisted snapshots without provenance | Existing snapshots may lack new metadata. | Use schema gate/recovery projection; do not reintroduce raw frontier behavior. | Covered by design; implementation risk only. |
| Non-native continuation signal exact metadata name | Implementation must choose/update constants or make all same-turn `SenderType.TOOL` continuations use `tool_history_only` as designed. | Implement under DS-007 and AC-020. | Implementation detail, not blocking. |

## Review Decision

Pass: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no new or unresolved blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Estimated message budgeting may be imperfect until exact token accounting exists; keep safety margins and Strategy tests.
- Oversized protected live tool results need an explicit future tool-output truncation/artifact policy rather than silent compaction into text.
- The implementation must preserve the dependency rule that `llm/utils/messages.ts` never imports memory modules.
- The implementation must update non-native continuation signaling carefully so it does not append a duplicate synthetic aggregate user message.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Round 1 findings AR-001, AR-002, and AR-003 are resolved. Implementation may proceed from the revised design package.
