# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/done/codex-history-reload-toolcalls/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/done/codex-history-reload-toolcalls/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/done/codex-history-reload-toolcalls/design-spec.md`
- Reviewed Rework Addendum: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/done/codex-history-reload-toolcalls/design-rework-addendum.md`
- Reviewed Thinking-Loss Analysis: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/done/codex-history-reload-toolcalls/post-delivery-thinking-loss-analysis.md`
- Current Review Round: 5
- Trigger: Latest local-only design refinement after user validated consistency but found live Codex/Daily Assistant `Thinking` rows missing after restart/history reload.
- Prior Review Round Reviewed: 4
- Latest Authoritative Round: 5
- Current-State Evidence Basis: Refined requirements, revised design spec/addendum, new thinking-loss analysis, Daily Assistant backend evidence JSON, reasoning persistence probe log, and direct code read of `RuntimeMemoryEventAccumulator` showing reasoning flush only on segment end/turn completion.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design review for Codex native dynamic/MCP provider coverage and invocation-aware merge | N/A | No | Pass | No | Superseded. |
| 2 | Turn-aware local/native merge addendum | No prior unresolved findings | No blocking findings | Pass | No | Superseded. |
| 3 | Codex-native-provider-only source authority | Round 2 direction rechecked and superseded | No blocking findings | Pass | No | Superseded. |
| 4 | Local replay trace is sole normal UI history source | Round 3 direction rechecked and superseded | No blocking findings | Pass | No | Still valid and retained; now extended with reasoning durability invariant. |
| 5 | Local replay reasoning/thinking durability refinement | Round 4 local-only authority rechecked | No blocking findings | Pass | Yes | Ready for implementation; fix local replay persistence, not runtime-native fallback. |

## Reviewed Design Spec

Round 5 reviews an incremental refinement to the Round 4 local-only display-source design. The local application-owned replay trace remains the sole normal UI history source for every runtime. The new evidence shows the local replay source is incomplete for UI-visible reasoning/thinking segments: raw traces for run `ff0b9fcd-3bb5-4f33-b806-02baf05e1922` have user/assistant/tool rows but zero `reasoning` rows, and `getRunProjection` therefore returns zero reasoning conversation rows. A focused `RuntimeMemoryEventAccumulator` probe reproduces that reasoning `SEGMENT_CONTENT` followed by tool/text without `TURN_COMPLETED` persists tool and assistant traces but not reasoning.

The design correctly routes the fix to the local replay persistence owner: `RuntimeMemoryEventAccumulator` should flush open reasoning for the same turn before writing subsequent visible boundaries such as tool calls, assistant text, and assistant-complete output, while retaining existing turn-completion flushing.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The 2026-05-17 design refinement classifies this as a bug fix inside local replay authority. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Classification is `Missing Invariant`; evidence shows local raw traces/projection have zero reasoning rows while the frontend can render canonical reasoning if present. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design requires tightening `RuntimeMemoryEventAccumulator` flush behavior now. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | The design names exact flush boundaries and test scenarios: reasoning before tool, reasoning before assistant text, and projection/hydration checks. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 4 | N/A | N/A | Still authoritative for source policy. | Requirements/addendum still forbid Codex native fallback and local/native merge. | Round 5 extends local-only design rather than replacing it. |
| 1-3 | N/A | N/A | Superseded. | Latest requirements keep local-only display source. | Do not revive prior provider/merge fixes. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Standalone normal UI history from local replay | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Team-member normal UI history from member local replay | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Local trace records to canonical projection rows | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Runtime event accumulation to durable local reasoning trace | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Local replay display source | Pass | Pass | Pass | Pass | Round 4 local-only authority remains intact. |
| Runtime memory event accumulation | Pass | Pass | Pass | Pass | Correct owner for flushing UI-visible stream segments into raw/local replay. |
| Raw-trace projection transformer | Pass | Pass | Pass | Pass | Already supports `traceType === "reasoning"`; no source-policy change needed. |
| Frontend hydration | Pass | Pass | Pass | Pass | Frontend should remain canonical-projection-only. |
| Runtime-native providers | Pass | Pass | Pass | Pass | Still out of normal UI display path. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Open segment flush policy | Pass | Pass | Pass | Pass | Belongs inside `RuntimeMemoryEventAccumulator`; no duplicate persistence helper is needed unless implementation demands private helpers. |
| Local trace to replay event conversion | Pass | Pass | Pass | Pass | Existing transformer remains correct once reasoning traces are persisted. |
| Local-only projection service path | Pass | Pass | Pass | Pass | Must remain the only display source path. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Raw trace `traceType: "reasoning"` | Pass | Pass | Pass | N/A | Existing trace type is correct; bug is missing write invariant. |
| Pending reasoning buffer | Pass | Pass | Pass | N/A | Buffer may continue for snapshot updates, but durable trace flush must happen before later visible rows. |
| Canonical `RunProjection` reasoning row | Pass | Pass | Pass | N/A | Projection/hydration contract already supports reasoning. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex native fallback/recovery for missing thinking | Pass | Pass | Pass | Pass | Explicitly not reintroduced; fix local replay persistence. |
| Local/native merge for missing thinking | Pass | Pass | Pass | Pass | Still forbidden in normal UI history. |
| Frontend runtime-specific thinking workaround | Pass | Pass | Pass | Pass | Not needed when canonical reasoning rows are persisted/projected. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts` | Pass | Pass | Pass | Pass | Owns event-to-memory persistence and should enforce reasoning durability before later visible writes. |
| `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | Pass | Pass | N/A | Pass | Already maps persisted reasoning to canonical rows; add regression if needed. |
| `autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts` | Pass | Pass | N/A | Pass | Continue local-only source authority; no fallback. |
| `autobyteus-web/services/runHydration/*` | Pass | Pass | N/A | Pass | Production logic remains runtime-agnostic; tests may assert canonical reasoning renders. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Local replay persistence | Pass | Pass | Pass | Pass | Runtime events can be persisted; projection reads persisted traces. |
| Normal UI projection services | Pass | Pass | Pass | Pass | Must not call Codex native provider to recover missing reasoning. |
| Frontend hydration | Pass | Pass | Pass | Pass | Must not synthesize missing thinking from runtime-specific data. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `RuntimeMemoryEventAccumulator.recordRunEvent(...)` | Pass | Pass | Pass | Pass | Correct boundary for turning live runtime events into durable local replay traces. |
| Local replay projection provider | Pass | Pass | Pass | Pass | Reads persisted reasoning once it exists. |
| `AgentRunViewProjectionService.getProjection*` | Pass | Pass | Pass | Pass | Continues local-only display authority. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `RuntimeMemoryEventAccumulator.recordRunEvent(event)` | Pass | Pass | Pass | Medium | Pass |
| `writeToolCall(...)` / assistant trace write path | Pass | Pass | Pass | Low | Pass |
| `getRunProjection(runId)` | Pass | Pass | Pass | Low | Pass |
| `getTeamMemberRunProjection(teamRunId, memberRouteKey)` | Pass | Pass | Pass | Medium | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-memory/services/runtime-memory-event-accumulator.ts` | Pass | Pass | Low | Pass | Correct placement for persistence invariant. |
| `run-history/projection/transformers/` | Pass | Pass | Low | Pass | Correct for projection regression tests. |
| `autobyteus-web/services/runHydration/` | Pass | Pass | Low | Pass | Test-only confirmation; no production branch. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Reasoning trace projection | Pass | Pass | N/A | Pass | Existing transformer already supports reasoning. |
| Live runtime event persistence | Pass | Pass | N/A | Pass | Extend accumulator invariant rather than adding a parallel recorder. |
| Frontend thinking render | Pass | Pass | N/A | Pass | Existing canonical reasoning support remains. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Runtime-native fallback for missing reasoning | No target fallback | Pass | Pass | Do not add. |
| Deferred-only reasoning flush | Yes, current behavior | Pass | Pass | Replace with earlier durable flush before later visible boundaries. |
| Frontend workaround | No target workaround | Pass | Pass | Do not add. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Add accumulator tests for reasoning-before-tool/text | Pass | Pass | Pass | Pass |
| Implement same-turn open reasoning flush helpers | Pass | Pass | Pass | Pass |
| Preserve existing turn-completion flush | Pass | Pass | Pass | Pass |
| Add projection/hydration regression coverage | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `SEGMENT_CONTENT -> TOOL_EXECUTION_STARTED` without `TURN_COMPLETED` | Yes | Pass | N/A | Pass | Probe and AC-008 make the case concrete. |
| `SEGMENT_CONTENT -> assistant SEGMENT_END` without `TURN_COMPLETED` | Yes | Pass | N/A | Pass | AC-009 and required tests are concrete. |
| Local-only no-fallback boundary | Yes | Pass | Pass | Pass | Addendum explicitly preserves source authority. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Duplicate reasoning writes after early flush and later segment end | Early flush must remove or mark flushed segments so later boundaries do not duplicate reasoning rows. | Implementation should flush-and-delete/mark the open segment for that turn. | Residual implementation guardrail. |
| Reasoning followed by implicit tool call from a tool result | `recordToolResult` can write a missing tool call; reasoning should flush before that implied call too. | Ensure the helper is invoked inside `writeToolCall` or before every write path that calls it. | Residual implementation guardrail. |
| Run stop/termination with open reasoning and no subsequent visible boundary | Could still lose reasoning if no tool/text/turn-complete boundary arrives. | Add shutdown/termination flush only if a reliable event boundary exists; otherwise document residual. | Accepted residual risk. |
| AC numbering drift in artifacts | Later appended AC-008/009/010 supersede older trace labels. | Implementation should follow the latest 2026-05-17 ACs; delivery can tidy numbering. | Non-blocking artifact cleanup. |

## Review Decision

- `Pass`: the missing-invariant refinement is ready for implementation.

## Findings

None.

## Classification

N/A - no blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Keep the Round 4 local-only display authority intact. Do not reintroduce Codex-native fallback, runtime-native recovery, or local/native merge to recover missing thinking.
- The accumulator implementation should avoid duplicate reasoning rows when an early flush is followed by a later `SEGMENT_END` or `TURN_COMPLETED`.
- Flush reasoning through the central tool/assistant write paths so inferred tool calls from result events are covered.
- If no reliable termination boundary exists, document that only observed subsequent visible boundaries and turn completion can guarantee flush.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Proceed to implementation. This Round 5 report keeps local replay as the sole display source and adds a local replay durability invariant: UI-visible reasoning/thinking must be persisted before subsequent visible tool/text boundaries, not only at turn completion.
