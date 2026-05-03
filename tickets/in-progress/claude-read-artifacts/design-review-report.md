# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-read-artifacts/tickets/in-progress/claude-read-artifacts/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-read-artifacts/tickets/in-progress/claude-read-artifacts/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-read-artifacts/tickets/in-progress/claude-read-artifacts/design-spec.md`
- Current Review Round: 2
- Trigger: Revised architecture review after user-approved final direction: one normalized `FILE_CHANGE` event derived in a cross-runtime post-normalization `AgentRunEventPipeline`, with `RunFileChangeService` projection/persistence only.
- Prior Review Round Reviewed: Round 1 report in this same file path was reviewed; it passed the earlier tactical classifier-split design, which is now superseded by the user-approved event-pipeline design.
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Reviewed the revised requirements, investigation notes, design spec, superseded addendum, reproduction probe source/output, previous round report, and current code in backend event types, backend dispatch paths, runtime converters, `RunFileChangeService`, streaming mapper/protocol files, frontend streaming handlers, and AutoByteus generated media tools. Current code evidence confirms `FILE_CHANGE_UPDATED` is still a projection-oriented event emitted by `RunFileChangeService`, and backend converters currently fan out normalized events directly after conversion.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design review of tactical classifier split | N/A | No blocking findings | Pass | No | Superseded by user follow-up; no unresolved findings to carry forward. |
| 2 | Review of revised single-`FILE_CHANGE` event + post-normalization event pipeline architecture | No prior unresolved findings; verified Round 1 design is obsolete, not a target to preserve | No blocking findings | Pass | Yes | Revised design is architecturally stronger and ready for implementation. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-read-artifacts/tickets/in-progress/claude-read-artifacts/design-spec.md`.

The superseded two-event addendum at `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-read-artifacts/tickets/in-progress/claude-read-artifacts/design-impact-native-file-change-events.md` was used for context only; the authoritative target is the revised one-event design spec.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design explicitly classifies this as bug fix + behavior change + refactor. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design identifies boundary/ownership issue, shared-structure looseness, and missing invariant; evidence points to `RunFileChangeService` deriving and emitting `FILE_CHANGE_UPDATED` from broad lifecycle events. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design states refactor is needed now and rejects keeping service-side broad derivation or compatibility aliases. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Pipeline, processor ownership, RFS projection-only refactor, event rename, removal plan, and migration sequence all align with the refactor decision. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | Superseded | Round 1 had no blocking findings. The user-approved Round 2 design intentionally replaces the tactical classifier-split target. | Implementation must not preserve Round 1 tactical service-side derivation artifacts. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Runtime raw event to final normalized event stream | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | File-impact base event to derived `FILE_CHANGE` | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | `FILE_CHANGE` to durable projection and Artifacts UI | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Claude `Read(file_path)` activity-only path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Event-pipeline bounded local processor chain | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Hydrated run file changes query to frontend store | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent execution event processing | Pass | Pass | Pass | Pass | Correct new owner for post-normalization derived events before fan-out. |
| File-change event derivation | Pass | Pass | Pass | Pass | Correctly isolated in `FileChangeEventProcessor`, not in projection or frontend. |
| Run file changes | Pass | Pass | Pass | Pass | Correctly refocused on projection/persistence/hydration only. |
| Agent streaming protocol | Pass | Pass | Pass | Pass | Clean rename to `FILE_CHANGE` belongs at protocol mapping boundary. |
| Frontend run artifacts | Pass | Pass | Pass | Pass | Frontend remains a consumer of trusted file-change events. |
| AutoByteus customization processors | Pass | Pass | Pass | Pass | Correctly rejected for unified server/web Artifacts derivation because they are AutoByteus-only. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `FILE_CHANGE` payload/status/source/type | Pass | Pass | Pass | Pass | Domain file-change payload contract is the right shared structure. |
| Canonical path identity/type inference | Pass | Pass | Pass | Pass | Needs to serve processor-emitted live events and RFS persistence without UI-specific drift. |
| Processor contract and pipeline | Pass | Pass | Pass | Pass | A small append-only contract avoids turning processors into an event bus. |
| Tool semantics registry | Pass | Pass | Pass | Pass | Correctly local to file-change derivation; must stay explicit/conservative. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentRunEventType.FILE_CHANGE` | Pass | Pass | Pass | N/A | Pass | One public file-change event replaces old `FILE_CHANGE_UPDATED`; no observed/updated split. |
| `AgentRunFileChangePayload` | Pass | Pass | Pass | Pass | Pass | Must remain specific to run-file-change state, not published-artifact metadata. |
| Processor output contract | Pass | Pass | Pass | N/A | Pass | Append-only returned events, no direct publication. |
| File-impact tool semantics registry | Pass | Pass | Pass | Pass | Pass | Mutation and generated-output semantics are separated; unknown `file_path` remains no-op. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRunEventType.FILE_CHANGE_UPDATED` | Pass | Pass | Pass | Pass | Clean rename to `FILE_CHANGE`; no alias. |
| `ServerMessageType.FILE_CHANGE_UPDATED` and frontend protocol names | Pass | Pass | Pass | Pass | Protocol/frontend rename is explicit. |
| RFS broad `SEGMENT_*` / `TOOL_EXECUTION_*` detection | Pass | Pass | Pass | Pass | Replaced by `FileChangeEventProcessor`. |
| `RunFileChangeService.publishEntry(...)` file-change event emission | Pass | Pass | Pass | Pass | Processor emits the event before fan-out; service persists only. |
| Generic generated-output `file_path` heuristic | Pass | Pass | Pass | Pass | Replaced by known generated-output semantics and explicit output metadata. |
| Two-event `FILE_CHANGE_OBSERVED` addendum | Pass | Pass | Pass | Pass | Superseded by one public `FILE_CHANGE`. |
| Earlier tactical service-side classifier helper files | Pass | Pass | Pass | Pass | Must be moved under processor ownership only if still semantically useful, otherwise deleted. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-run-event.ts` | Pass | Pass | N/A | Pass | Event enum rename belongs here. |
| `agent-run-file-change.ts` | Pass | Pass | Pass | Pass | Correct shared domain payload contract. |
| `agent-run-event-processor.ts` | Pass | Pass | Pass | Pass | Processor API is singular. |
| `agent-run-event-pipeline.ts` | Pass | Pass | Pass | Pass | Pipeline sequencing owner is clear. |
| `default-agent-run-event-pipeline.ts` | Pass | Pass | Pass | Pass | Factory avoids backend-specific processor lists. |
| `dispatch-processed-agent-run-events.ts` | Pass | Pass | Pass | Pass | Good seam for process-once-then-fan-out wiring. |
| `file-change-event-processor.ts` | Pass | Pass | Pass | Pass | Owns derivation only, not persistence. |
| `file-change-tool-semantics.ts` | Pass | Pass | Pass | Pass | Correct location for explicit known tool mappings. |
| `file-change-output-path.ts` | Pass | Pass | Pass | Pass | Correct location for output-only path extraction. |
| `file-change-payload-builder.ts` | Pass | Pass | Pass | Pass | Keeps payload construction/canonicalization consistent. |
| `run-file-change-service.ts` | Pass | Pass | Pass | Pass | Must be reduced to `FILE_CHANGE` projection/persistence. |
| Streaming protocol/frontend handler files | Pass | Pass | N/A | Pass | Rename only; no derivation/filtering. |
| `autobyteus-ts` multimedia tools | Pass | Pass | N/A | Pass | No event ownership change for this task; processor recognizes their normalized lifecycle results. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime converters | Pass | Pass | Pass | Pass | Depend on domain event types only; no projection service dependency. |
| Runtime backends | Pass | Pass | Pass | Pass | Depend on pipeline/dispatch helper, not individual processors. |
| `AgentRunEventPipeline` | Pass | Pass | Pass | Pass | Owns processor sequencing before fan-out. |
| `FileChangeEventProcessor` | Pass | Pass | Pass | Pass | Must not call RFS/projection store or listeners. |
| `RunFileChangeService` | Pass | Pass | Pass | Pass | Must not inspect broad tool lifecycle events for derivation. |
| Frontend store/UI | Pass | Pass | Pass | Pass | Must not infer Artifacts from activity/tool events. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRunEventPipeline.process(...)` | Pass | Pass | Pass | Pass | Right authoritative boundary for derived normalized events. |
| `FileChangeEventProcessor.process(...)` | Pass | Pass | Pass | Pass | Correct owner for file-change semantics. |
| `RunFileChangeService.attachToRun(...)` / `getProjectionForRun(...)` | Pass | Pass | Pass | Pass | Correct durable projection boundary after refactor. |
| Streaming mapper | Pass | Pass | Pass | Pass | Correct transport boundary; no classification logic. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `AgentRunEventPipeline.process(input)` | Pass | Pass | Pass | Low | Pass |
| `AgentRunEventProcessor.process(input)` | Pass | Pass | Pass | Low | Pass |
| `FileChangeEventProcessor.process(input)` | Pass | Pass | Pass | Medium | Pass |
| `RunFileChangeService.attachToRun(run)` | Pass | Pass | Pass | Low | Pass |
| `getRunFileChanges(runId)` | Pass | Pass | Pass | Low | Pass |
| Streaming protocol `FILE_CHANGE` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/events/` | Pass | Pass | Low | Pass | Correct event-processing subsystem. |
| `autobyteus-server-ts/src/agent-execution/events/processors/file-change/` | Pass | Pass | Low | Pass | Correct off-spine derived-event concern. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-file-change.ts` | Pass | Pass | Low | Pass | Correct shared event contract placement. |
| `autobyteus-server-ts/src/services/run-file-changes/` | Pass | Pass | Medium target risk | Pass | Must remove detector logic to keep this folder projection-focused. |
| `autobyteus-server-ts/src/services/agent-streaming/` | Pass | Pass | Low | Pass | Transport mapping only. |
| `autobyteus-web/services/agentStreaming/` | Pass | Pass | Low | Pass | Frontend stream ingestion only. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime event conversion | Pass | Pass | N/A | Pass | Existing converters stay provider-normalization owners. |
| Post-normalization derived events | Pass | Pass | Pass | Pass | No current common boundary; new pipeline is justified. |
| Durable file-change projection | Pass | Pass | N/A | Pass | Existing RFS/persistence should be refocused. |
| Agent streaming transport | Pass | Pass | N/A | Pass | Existing mapper/protocol are extended/renamed. |
| File-impact tool semantics | Pass | Pass | Pass | Pass | Existing service-side logic can be moved only if ownership changes to processor. |
| AutoByteus customization processors | Pass | Pass | N/A | Pass | Correctly not reused as unified server/web event derivation. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| `FILE_CHANGE_UPDATED` event/protocol name | No in target | Pass | Pass | Clean rename to `FILE_CHANGE`; no alias. |
| `FILE_CHANGE_OBSERVED` + `FILE_CHANGE_UPDATED` split | No | Pass | Pass | Explicitly rejected as superseded. |
| RFS broad derivation with tighter heuristic | No | Pass | Pass | Explicitly rejected. |
| Frontend Claude `Read` filtering | No | Pass | Pass | Explicitly rejected. |
| Historical polluted rows | Yes, old data can remain | Pass | Pass | Out of scope by user-approved scope. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Domain event rename and payload contract | Pass | Pass | Pass | Pass |
| Pipeline/processor introduction | Pass | Pass | Pass | Pass |
| Backend process-once-before-fan-out wiring | Pass | Pass | Pass | Pass |
| File-change processor semantics and tests | Pass | Pass | Pass | Pass |
| RFS projection-only refactor | Pass | Pass | Pass | Pass |
| Streaming/frontend protocol rename | Pass | Pass | Pass | Pass |
| Cleanup of earlier tactical classifier artifacts | Pass | Pass | Pass | Pass |
| Docs update | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude read-only file read | Yes | Pass | Pass | Pass | Directly covers the reported bug. |
| File mutation | Yes | Pass | Pass | Pass | Shows processor ownership and RFS projection separation. |
| Processor chain | Yes | Pass | Pass | Pass | Clarifies append-only processing vs event bus. |
| Generated output | Yes | Pass | Pass | Pass | Protects explicit output semantics and rejects unknown `file_path`. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Streaming write preview shape | Moving streaming buffer logic out of RFS can regress live write preview if not covered. | Implementation must emit `FILE_CHANGE` updates for streaming/pending/available states where current UI depends on them, or explicitly limit terminal-only behavior where acceptable; tests must cover this. | Non-blocking implementation risk; design names it and assigns it to processor tests. |
| Backend process-once fan-out wiring, especially AutoByteus | Stateful processors must not run once per subscriber or directly publish recursive events. | Use the dispatch helper/pipeline before backend listener fan-out; if a backend lacks a shared fan-out seam, refactor it rather than wiring the pipeline per listener. | Non-blocking implementation risk; design calls this out. |
| Exact active file-impacting tool-name inventory | Missing a mutation/output tool would omit true artifacts. | Verify and test Claude `Write`, `Edit`, `MultiEdit`, `NotebookEdit`; Codex `edit_file`; AutoByteus `write_file`, `edit_file`, `generate_image`, `edit_image`, `generate_speech`, plus approved equivalents. | Non-blocking implementation risk. |
| Existing generated-output tools relying only on ambiguous `file_path` | They will stop creating artifacts under the conservative semantics. | Correct such integrations to expose explicit output/destination metadata rather than reopening generic `file_path` heuristics. | Accepted residual risk. |
| Requirements artifact approval wording | The handoff message states the user approved the final direction; the requirements file still contains older “pending user review” wording. | Treat the handoff as current approval state; cleanup can happen during downstream artifact/doc sync if needed. | Non-blocking artifact consistency note. |
| Already-persisted polluted `file_changes.json` rows | Old runs may still hydrate false rows. | No action unless user later requests historical cleanup. | Explicitly out of scope. |

## Review Decision

Pass: the revised design is ready for implementation.

## Findings

None.

## Classification

N/A. No blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Implementation must process the event pipeline exactly once per normalized backend event batch before listener fan-out. Do not wire processors per subscriber.
- `FileChangeEventProcessor` must remain conservative: known file-impacting tools only, no unknown-tool `file_path` heuristic.
- Streaming write preview behavior must be preserved with explicit `FILE_CHANGE` status/content updates or tested terminal-only semantics if that is intentionally accepted.
- The current worktree contains uncommitted files from the earlier tactical classifier design. Implementation should replace, move under processor ownership only where appropriate, or delete them; do not mix the old RFS-derived model with the new pipeline model.
- Historical polluted projection rows remain out of scope.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: The revised design satisfies the Authoritative Boundary Rule: runtime converters own base normalization, `AgentRunEventPipeline` owns derived normalized event sequencing, `FileChangeEventProcessor` owns file-impact semantics, `RunFileChangeService` owns durable projection/persistence, and frontend/streaming code consume already-classified `FILE_CHANGE` events. The clean `FILE_CHANGE_UPDATED` -> `FILE_CHANGE` rename with no alias is acceptable because the user explicitly requested clean-cut behavior.
