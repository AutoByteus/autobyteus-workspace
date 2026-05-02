# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-search-web-activity-visibility/tickets/done/codex-search-web-activity-visibility/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-search-web-activity-visibility/tickets/done/codex-search-web-activity-visibility/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-search-web-activity-visibility/tickets/done/codex-search-web-activity-visibility/design-spec.md`
- Current Review Round: 2
- Trigger: Design-impact rework after user clarified on 2026-05-01 that the right-side Activity area must appear when the middle tool card appears, not only after lifecycle/terminal events.
- Prior Review Round Reviewed: Round 1 design review report at this same path; Round 1 had no unresolved findings but its lifecycle-only Activity assumption is superseded by the refined requirement.
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Reviewed refined requirements, updated investigation notes, revised design spec, design-impact rework note, prior review report, delivery pause note, current worktree status/diff, current frontend handlers/stores/tests, current backend Codex converter implementation, and `git show 29247822c24ee3f9e9afab130e789f37f4d1ec35` evidence that Activity writes were removed from `segmentHandler.ts` by the earlier split-lanes refactor.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial review for Codex `search_web` lifecycle fan-out | N/A | None | Pass | No | Superseded by later user clarification that Activity must be segment-first visible. |
| 2 | Design-impact rework for segment-first Activity visibility | No prior findings; prior assumptions rechecked | None | Pass | Yes | Revised design creates a shared Activity projection owner used by segment and lifecycle lanes. |

## Reviewed Design Spec

The revised design keeps the backend Codex `webSearch` lifecycle fan-out and adds a frontend ownership refactor: extract Activity projection/upsert behavior from `toolLifecycleHandler.ts` into `toolActivityProjection.ts`, then have both `segmentHandler.ts` and `toolLifecycleHandler.ts` call that shared owner. This changes the previous lifecycle-only invariant into a segment-first visibility invariant while preserving lifecycle authority for execution and terminal status.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design explicitly classifies this as Bug Fix + Behavior Change + Refactor. | None |
| Root-cause classification is explicit and evidence-backed | Pass | Classification is a boundary/ownership issue from commit `29247822`; investigation and `git show` confirm Activity store writes were removed from `segmentHandler.ts` and old tests assert no Activity from segments. | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design states refactor needed now. | None |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Design maps the new shared projection owner, file responsibilities, dependency rules, migration sequence, and replacement tests. | None |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | No unresolved findings | Round 1 Findings section was `None`. | Round 1 decision is superseded by a new requirement/design-impact trigger, not by an unresolved prior finding. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Tool-like `SEGMENT_START` to Activity running/pending entry | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Codex `webSearch` raw item to Activity lifecycle entry | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Tool-like `SEGMENT_START` to middle transcript card | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Later lifecycle event to existing Activity update | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex runtime event normalization | Pass | Pass | Pass | Pass | Existing backend fan-out remains the right raw-provider normalization boundary. |
| Frontend transcript segment handling | Pass | Pass | Pass | Pass | Segment handler owns middle card creation and only delegates Activity projection; it does not own Activity policy. |
| Frontend Activity projection | Pass | Pass | Pass | Pass | New shared owner is justified because Activity projection must consume both segment-first and lifecycle facts. |
| Frontend lifecycle handling | Pass | Pass | Pass | Pass | Lifecycle handler retains segment lifecycle transitions and delegates store projection. |
| Validation | Pass | Pass | Pass | Pass | Test plan replaces the obsolete lifecycle-only invariant and covers segment-first/lifecycle-first dedupe. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Activity upsert/dedupe/type/context/status/result/log projection | Pass | Pass | Pass | Pass | Current private helpers in `toolLifecycleHandler.ts` are reusable policy; extracting them avoids duplicated segment store writes. |
| Web-search argument/result/error extraction | Pass | Pass | Pass | Pass | Existing backend parser helper ownership remains sound. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ProjectableToolSegment` / tool segment union | Pass | Pass | Pass | Pass | Pass | Narrowly covers `tool_call`, `write_file`, `terminal_command`, and `edit_file`; excludes text/reasoning/media. |
| `ToolActivity` projection facts | Pass | Pass | Pass | N/A | Pass | Uses existing store shape; no new parallel Activity model. |
| Invocation alias matching | Pass | Pass | Pass | N/A | Pass | Design explicitly keeps alias-aware dedupe in the projection owner. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Segment-start-without-Activity test invariant | Pass | Pass | Pass | Pass | The obsolete test expectation is named and must be replaced. |
| Private Activity helpers inside `toolLifecycleHandler.ts` | Pass | Pass | Pass | Pass | Shared projection owner replaces private lifecycle-only policy. |
| Lifecycle-only Codex dynamic/file/search Activity expectation | Pass | Pass | Pass | Pass | Revised tests should assert immediate segment-seeded Activity and deduped lifecycle updates. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | Pass | Pass | N/A | Pass | Preserve implemented `webSearch` fan-out. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-tool-payload-parser.ts` | Pass | Pass | N/A | Pass | Continue to own web-search payload facts. |
| `autobyteus-web/services/agentStreaming/handlers/toolActivityProjection.ts` | Pass | Pass | Pass | Pass | Correct new file for Activity projection policy shared by both lanes. |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | Pass | Pass | Pass | Pass | Should own segment state and call projection; must not inline store policy. |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Pass | Pass | Pass | Pass | Should own lifecycle transitions and call projection; private Activity helpers should move out. |
| `autobyteus-web/services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts` | Pass | Pass | N/A | Pass | Correct place to assert immediate Activity from visible tool segment. |
| `autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleOrdering.spec.ts` | Pass | Pass | N/A | Pass | Correct place for segment-first/lifecycle-first dedupe and status preservation. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `segmentHandler.ts` -> `toolActivityProjection.ts` | Pass | Pass | Pass | Pass | Segment handler may pass normalized tool segment facts but must not duplicate Activity store policy or depend on lifecycle handler. |
| `toolLifecycleHandler.ts` -> `toolActivityProjection.ts` | Pass | Pass | Pass | Pass | Lifecycle handler keeps state transitions; projection helper handles store updates. |
| `toolActivityProjection.ts` -> store/utilities/types | Pass | Pass | Pass | Pass | Helper must not import segment/lifecycle handlers or raw Codex converter. |
| Activity components -> store | Pass | Pass | Pass | Pass | Components remain display facades. |
| Backend converter/parser | Pass | Pass | Pass | Pass | Frontend projection does not parse raw provider payloads. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `toolActivityProjection.ts` | Pass | Pass | Pass | Pass | Becomes the single frontend Activity projection owner for normalized tool segment/lifecycle facts. |
| `segmentHandler.ts` | Pass | Pass | Pass | Pass | Segment identity and metadata merge stay here; Activity projection policy moves out. |
| `toolLifecycleHandler.ts` | Pass | Pass | Pass | Pass | Lifecycle status transitions stay here; Activity mutations go through shared projection functions. |
| `CodexThreadEventConverter` | Pass | Pass | Pass | Pass | Remains authoritative backend boundary for raw Codex event normalization. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `upsertActivityFromToolSegment(context, invocationId, segment, argumentsPayload?)` | Pass | Pass | Pass | Low | Pass |
| Projection update functions (`syncActivityToolName`, `updateActivityArguments`, `updateActivityStatus`, `setActivityResult`, `addActivityLog`) | Pass | Pass | Pass | Low | Pass |
| `convertCodexItemEvent(...)` webSearch branch | Pass | Pass | Pass | Low | Pass |
| Web-search parser helpers | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/agentStreaming/handlers/toolActivityProjection.ts` | Pass | Pass | Low | Pass | Same handler subsystem, but a distinct file because it owns shared projection policy. |
| `autobyteus-web/services/agentStreaming/handlers` | Pass | Pass | Low | Pass | Existing folder is the right live-stream frontend state boundary. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events` | Pass | Pass | Low | Pass | Existing Codex runtime adapter folder. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Activity storage/mutations | Pass | Pass | N/A | Pass | `agentActivityStore` remains generic enough. |
| Activity display | Pass | Pass | N/A | Pass | Existing Activity UI can display parsing/executing as running. |
| Activity projection policy | Pass | Pass | Pass | Pass | Existing private lifecycle helpers are extracted, not duplicated. |
| Backend webSearch normalization | Pass | Pass | N/A | Pass | Preserve implemented backend converter/parser changes. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Old lifecycle-only Activity invariant | No desired retention | Pass | Pass | Tests and expectations should be replaced in this change. |
| Duplicate segment and lifecycle Activity authorities | No | Pass | Pass | Both lanes call one shared projection owner. |
| Backend `SEGMENT_*` transcript behavior | Yes, preserved intentionally | Pass | Pass | Preservation is required for the middle transcript and is not a duplicate Activity path. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Preserve backend Codex lifecycle fan-out | Pass | Pass | Pass | Pass |
| Extract projection helper from lifecycle handler | Pass | Pass | Pass | Pass |
| Wire segment handler to projection after start/merge/end | Pass | Pass | Pass | Pass |
| Replace frontend invariants/tests | Pass | Pass | Pass | Pass |
| Validation sequence | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Segment-first Activity visibility | Yes | Pass | Pass | Pass | The design explicitly contrasts shared projection with pasting old store writes back into segment handler. |
| Lifecycle-first and segment-first dedupe | Yes | Pass | Pass | Pass | Acceptance criteria cover both orderings. |
| Backend `search_web` fan-out | Yes | Pass | Pass | Pass | Existing fan-out example remains clear. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Placeholder or missing tool names on `SEGMENT_START` | Could create blank/noisy Activity entries. | Helper may skip unnamed generic `tool_call` until a concrete tool name is present; fixed segment types can infer names. | Accepted residual implementation detail. |
| Late `SEGMENT_END` after terminal lifecycle | Could regress terminal Activity status if projection is careless. | Keep status transition guard and tests proving no terminal downgrade. | Covered by design/tests. |
| Live Codex search prompt reliability | Model-dependent search invocation may be flaky. | Keep unit/handler tests as deterministic gate; live probe remains supplemental. | Accepted residual risk. |

## Review Decision

Pass: the revised design is ready for implementation rework.

## Findings

None.

## Classification

N/A — no design-impact, requirement-gap, or unclear findings remain for this review round.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- The exact helper function names can vary, but the implementation must keep one shared projection owner and avoid direct duplicated `useAgentActivityStore` policy in both handlers.
- Segment-start status is an early visibility state, not proof that execution began; lifecycle events remain authoritative for `executing`, terminal result/error, and logs.
- Live Codex E2E/probe remains supplemental due model/tool-selection dependence.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Proceed with frontend rework. The old lifecycle-only segment invariant is obsolete. Activity projection should be shared and alias-aware; `segmentHandler.ts` should only delegate normalized tool segment facts to that owner, while `toolLifecycleHandler.ts` should keep lifecycle transitions and use the same owner for Activity updates.
