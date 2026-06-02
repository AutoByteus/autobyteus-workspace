# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/tickets/done/compaction-frontier-llm-rendering/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/tickets/done/compaction-frontier-llm-rendering/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/tickets/done/compaction-frontier-llm-rendering/design-spec.md`
- Current Review Round: 3
- Trigger: UI compaction feed ordering/replay design addendum requested by `solution_designer` after user reported post-implementation center-feed compaction card behavior.
- Prior Review Round Reviewed: Round 2, plus prior code review / validation artifacts as current baseline context.
- Latest Authoritative Round: 3
- Current-State Evidence Basis: Revised UI requirements/addendum, UI investigation note, prior implementation/review/validation reports, and current code reads of `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue`, `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue`, `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts`, `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts`, `autobyteus-web/services/agentStreaming/handlers/compactionActivityProjection.ts`, `autobyteus-web/stores/agentActivityStore.ts`, `autobyteus-web/services/runHydration/runProjectionConversation.ts`, `autobyteus-server-ts/src/run-history/projection/providers/local-memory-run-view-projection-provider.ts`, `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts`, `autobyteus-server-ts/src/run-history/projection/transformers/historical-replay-events-to-conversation.ts`, and `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts`.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design handoff | N/A | 3 | Fail | No | Core compaction design needed metadata, MemoryManager mutation, and non-native continuation rework. |
| 2 | Revised core design handoff | AR-001, AR-002, AR-003 | 0 | Pass | No | Core working-context-first compaction design passed for implementation. |
| 3 | UI compaction feed addendum | Prior core findings remain resolved | 0 | Pass | Yes | UI design is presentation-boundary scoped and ready for implementation. |

## Reviewed Design Spec

Round 3 reviewed the UI addendum to the already-passed working-context-first compaction design. The addendum correctly separates two UI surfaces:

- The right-side Activity panel remains lifecycle-oriented and keeps one compaction row per `compaction_operation_id`, preserving the request timestamp while updating phase/details.
- The center live feed becomes narrative/timeline-oriented: it hides `requested`/queued, shows only execution-phase compaction status, uses execution/timeline placement, and display-splits only the current frontend AI visual block.

The design also correctly keeps historical/reopen scope out of native compaction cards. Historical center replay acceptance is complete ordered replay of actual user/assistant/reasoning/tool-call/tool-result raw traces from active plus archived traces. This avoids polluting backend memory, working context, LLM messages, raw traces, or provider tool protocol with UI-only compaction rows.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | UI addendum includes current-state read; UI investigation classifies the issue as a frontend timeline granularity/design gap. Existing design health section remains valid for core compaction, while the addendum scopes this as a frontend display behavior change. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Evidence cites coarse `AIMessage` grouping in `segmentHandler.findOrCreateAIMessage`, `AgentConversationFeed.vue` sorting whole messages plus compaction rows, and `agentStatusHandler.handleCompactionStatus` not closing visual AI messages. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Addendum prescribes a small frontend presentation boundary and explicitly rejects backend memory/working-context/provider changes for this UI issue. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Target UI behavior, frontend ownership, backend ordering contract, non-goals, and validation additions all support a bounded presentation refactor. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-001 | High | Remains resolved | Design still mandates neutral `MessageMetadata` in LLM core and memory-owned provenance helpers. UI addendum does not alter this boundary. | No regression. |
| 1 | AR-002 | High | Remains resolved | Design still routes working-context mutation through `MemoryManager`. UI split is explicitly display-only and must not mutate backend context/messages/traces. | No regression. |
| 1 | AR-003 | Medium | Remains resolved | Design still models native/non-native continuations through canonical messages/renderers. UI addendum does not alter tool protocol. | No regression. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-003 | Backend compaction lifecycle status emission | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| UI-001 | Live Activity lifecycle row | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| UI-002 | Center live execution-phase compaction row | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| UI-003 | Center visual AI-message split | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| UI-004 | Historical/reopen raw-trace replay | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agentActivityStore` | Pass | Pass | Pass | Pass | Keeps lifecycle row identity/upsert behavior for Activity panel. |
| `compactionActivityProjection.ts` | Pass | Pass | Pass | Pass | Owns projection from status payload to activity plus execution/timeline timestamp derivation. |
| `AgentEventMonitor.vue` / `AgentConversationFeed.vue` | Pass | Pass | Pass | Pass | Center feed filters center-eligible phases and sorts by center timeline timestamp. |
| `agentStatusHandler.handleCompactionStatus` | Pass | Pass | Pass | Pass | Correct owner for live status handling and UI-only current-AI-message closure. |
| `segmentHandler.findOrCreateAIMessage` / conversation state | Pass | Pass | Pass | Pass | Existing grouping mechanism is reused; only `isComplete` is used as display boundary. |
| Run-history / local-memory projection | Pass | Pass | Pass | Pass | Historical scope relies on existing active+archive raw trace corpus replay, not compaction cards. |
| Backend memory/compaction/provider rendering | Pass | Pass | Pass | Pass | Explicitly non-goal for UI fix; no ownership leakage. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Compaction activity identity | Pass | Pass | Pass | Pass | Existing `activityId` / operation-id projection remains Activity authority. |
| Activity vs center timestamp distinction | Pass | Pass | Pass | Pass | Addendum assigns request timestamp to Activity and execution/timeline timestamp to center rows. |
| Center eligibility phase policy | Pass | Pass | Pass | Pass | Filter/projection concern is clear: requested hidden, execution/terminal only. |
| Historical raw-trace replay | Pass | Pass | Pass | Pass | Existing raw-trace corpus projection is reused; no new pseudo-message structure. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `CompactionActivity.timestamp` | Pass | Pass | Pass | N/A | Pass | Retains Activity lifecycle/request ordering meaning. |
| Proposed execution/timeline timestamp | Pass | Pass | Pass | N/A | Pass | Separate center-feed placement meaning; avoids overloading Activity timestamp. |
| `CompactionActivity.activityId` | Pass | Pass | Pass | N/A | Pass | Stable operation identity remains singular. |
| Frontend `AIMessage.isComplete` | Pass | Pass | Pass | N/A | Pass | Used only as visual grouping flag, not backend/LLM boundary. |
| Historical projection entries | Pass | Pass | Pass | N/A | Pass | Actual raw trace events remain the replay source; compaction cards omitted by design. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Center-feed `requested`/queued compaction row | Pass | Pass | Pass | Pass | Hidden from center; Activity retains lifecycle visibility. |
| Duplicate lifecycle center rows for same operation | Pass | Pass | Pass | Pass | Center uses one execution row per operation; Activity upserts one lifecycle row. |
| Center placement by original request timestamp | Pass | Pass | Pass | Pass | Replaced by execution/timeline timestamp. |
| Backend/memory compaction changes for UI issue | Pass | Pass | Pass | Pass | Explicit non-goal; presentation-only fix. |
| Historical native center compaction cards | Pass | Pass | Pass | Pass | Not required; historical replay focuses actual raw traces. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/agentActivityStore.ts` | Pass | Pass | Pass | Pass | Lifecycle upsert store; may carry execution metadata without changing identity. |
| `autobyteus-web/services/agentStreaming/handlers/compactionActivityProjection.ts` | Pass | Pass | Pass | Pass | Projection/normalization owner for phase, identity, timestamps. |
| `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts` | Pass | Pass | Pass | Pass | Live status handler can close current visual AI block on first execution-phase status. |
| `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue` | Pass | Pass | N/A | Pass | Passes appropriate center-feed compaction view. |
| `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` | Pass | Pass | Pass | Pass | Renders mixed message/center-eligible compaction rows with timeline ordering. |
| `autobyteus-web/components/workspace/agent/CompactionStatusRow.vue` | Pass | Pass | N/A | Pass | Visual row only; wording constrained. |
| `autobyteus-web/services/runHydration/runProjectionConversation.ts` | Pass | Pass | N/A | Pass | Historical replay conversation grouping; no compaction cards required. |
| `autobyteus-server-ts/src/run-history/projection/providers/local-memory-run-view-projection-provider.ts` | Pass | Pass | N/A | Pass | Reads active+archived raw traces for history. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend status projection | Pass | Pass | Pass | Pass | UI reads backend status events; does not mutate backend memory. |
| Activity panel | Pass | Pass | Pass | Pass | Depends on lifecycle activity store, not center-feed visual grouping. |
| Center live feed | Pass | Pass | Pass | Pass | Depends on center-eligible projection/timeline timestamp, not Activity request timestamp. |
| Backend memory / working context | Pass | Pass | Pass | Pass | UI visual split cannot alter backend turns/messages/raw traces/tool protocol. |
| Historical replay | Pass | Pass | Pass | Pass | Uses raw trace corpus; does not synthesize LLM-facing compaction messages. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agentActivityStore` lifecycle upsert | Pass | Pass | Pass | Pass | Stable row identity stays in store. |
| `compactionActivityProjection` phase/timestamp projection | Pass | Pass | Pass | Pass | Center-vs-Activity timestamp distinction belongs here or adjacent projection code. |
| `agentStatusHandler` live UI state handling | Pass | Pass | Pass | Pass | Handles split as frontend state only. |
| `AgentConversationFeed` center rendering | Pass | Pass | Pass | Pass | Filters and renders center-eligible rows. |
| Backend memory/compaction | Pass | Pass | Pass | Pass | Remains encapsulated from UI display boundary. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `agentActivityStore.upsertCompactionActivity(runId, activity)` | Pass | Pass | Pass | Low | Pass |
| `projectCompactionStatusToActivity(payload, input)` | Pass | Pass | Pass | Low | Pass |
| Center compaction activity projection/filter | Pass | Pass | Pass | Low | Pass |
| `handleCompactionStatus(payload, context)` | Pass | Pass | Pass | Low | Pass |
| `findOrCreateAIMessage(context)` / visual split via `isComplete` | Pass | Pass | Pass | Low | Pass |
| Historical `buildConversationFromProjection(...)` | Pass | Pass | Pass | Low | Pass |
| `LocalMemoryRunViewProjectionProvider.buildProjection(...)` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/agentStreaming/handlers` | Pass | Pass | Low | Pass | Live stream status/segment handling belongs here. |
| `autobyteus-web/stores/agentActivityStore.ts` | Pass | Pass | Low | Pass | Store-level Activity identity/upsert belongs here. |
| `autobyteus-web/components/workspace/agent` | Pass | Pass | Low | Pass | Center monitor rendering belongs here. |
| `autobyteus-web/services/runHydration` | Pass | Pass | Low | Pass | Historical frontend hydration remains separate. |
| `autobyteus-server-ts/src/run-history/projection` | Pass | Pass | Low | Pass | Historical raw trace projection remains server-side. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Activity lifecycle status | Pass | Pass | N/A | Pass | Existing store/projection reused. |
| Center mixed feed rendering | Pass | Pass | N/A | Pass | Existing conversation feed extended. |
| Current AI visual block grouping | Pass | Pass | N/A | Pass | Existing `isComplete` grouping reused as display boundary. |
| Historical raw trace replay | Pass | Pass | N/A | Pass | Existing active+archive raw trace corpus path reused. |
| Backend compaction lifecycle | Pass | Pass | N/A | Pass | Existing backend ordering contract reused, no backend refactor needed. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Center `requested` row | No target retention | Pass | Pass | Queued state hidden from center. |
| Synthetic/persisted compaction messages | No | Pass | Pass | Explicitly forbidden. |
| Historical native center compaction cards | No target requirement | Pass | Pass | Omitted by design; future cards would be synthesized from manifest, not LLM messages. |
| Activity lifecycle row | Yes, intentionally retained | Pass | Pass | This is required operational visibility, not legacy retention. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Activity lifecycle upsert preservation | Pass | Pass | Pass | Pass |
| Center eligibility filtering | Pass | Pass | Pass | Pass |
| AI visual block split on first execution phase | Pass | Pass | Pass | Pass |
| Execution/timeline timestamp separation | Pass | Pass | Pass | Pass |
| Historical active+archive raw trace replay validation | Pass | Pass | Pass | Pass |
| Avoiding backend/memory/provider changes | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Activity lifecycle row | Yes | Pass | Pass | Pass | `queued -> compacting -> compacted/failed` example is clear. |
| Center live ordering | Yes | Pass | Pass | Pass | tool call/result -> compaction -> continuation example is clear. |
| Display-only split | Yes | Pass | Pass | Pass | Explicitly says not backend/LLM/raw trace/protocol mutation. |
| Historical/reopen behavior | Yes | Pass | Pass | Pass | Complete raw trace replay without compaction cards is explicit. |
| Timestamp distinction | Yes | Pass | Pass | Pass | Activity request timestamp vs center execution timestamp is explicit. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Historical native compaction cards | Could be product value later, but not necessary for replay correctness. | If future value exists, synthesize from archive manifest rather than LLM/raw-trace pseudo-messages. | Deferred, not blocking. |
| Exact center execution timestamp source | Implementation can derive from execution-phase payload receipt/provider timestamp as long as it is not the Activity request timestamp. | Implement and test AC-026. | Implementation detail, not blocking. |
| Failure classification for center visibility | User requires failed when execution failed/blocks continuation. | Implement center eligibility so blocking `failed` is visible even without `started`. | Covered by design/tests. |

## Review Decision

Pass: the UI compaction feed design addendum is ready for implementation.

## Findings

None.

## Classification

N/A — no new or unresolved blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- The implementation must not reuse the Activity row's preserved request timestamp for center-feed placement.
- The implementation must avoid splitting the visual AI block on `requested`/queued statuses.
- Historical replay validation should check active plus archived raw traces remain complete even though historical center compaction cards are intentionally omitted.
- If source changes add durable validation after code review/API-E2E, route updated repository-resident validation through `code_reviewer` per team rule.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: UI addendum is presentation-boundary scoped, ownership-led, and does not reopen backend compaction/message/protocol design. Proceed to implementation.
