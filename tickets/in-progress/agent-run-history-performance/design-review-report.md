# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/requirements-doc.md`
- Upstream Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/investigation-notes.md`
- Reviewed Design Spec: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/design-spec.md`
- Supplemental Task Artifacts Reviewed: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/history-window-ui-ux-spec.md`
- Current Review Round: `2`
- Trigger: Revised solution package returned by `solution_designer` to resolve `AR-001` and `AR-002`.
- Prior Review Round Reviewed: `1`
- Latest Authoritative Round: `2`
- Current-State Evidence Basis: Revised complete solution package; retained aggregate probe/benchmark evidence; current task-base source at `75a4c97f`, particularly the local-memory provider/replay transformer, standalone and team dispatchers, task-execution router, stream segment identity and mutation handlers, Activity store, run-state model, hydration/submission services, and conversation feed.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial architecture review | N/A | `AR-001`, `AR-002` | `Fail` | No | Completed-event eviction and visible-revision semantics required design correction. |
| 2 | Revised package resolving round-1 findings | `AR-001`, `AR-002` | None | `Pass` | Yes | Both findings are resolved; the revised design is coherent and implementation-ready. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `AR-001` | High | `Resolved` | `REQ-003`/`REQ-004`, `AC-003`/`AC-004`, `UXJ-002`, the revised completion/mutability terminology, `DS-003`–`DS-005`, classified descriptor spines, examples, implementation guidance, and test sequence now specify completed-first eviction, deterministic oldest-mutable fallback, stable-identity source-limited re-entry, immediate recapping, and no duplicates/archive repair. | The hard maximum remains authoritative in the explicit reachable all-mutable overflow case. |
| 1 | `AR-002` | Medium | `Resolved` | `REQ-005`, `AC-005`, `UXJ-003`/`UXJ-004`, `AgentRunState.eventMonitorPresentationRevision`, `EventMonitorPresentationMutation`, `commitRecentEventMonitorMutation`, reset/baseline rules, dispatcher matrix, examples, and forbidden-shortcut rules replace `conversation.updatedAt` with an actual visible-change contract. | Non-visible/no-op protocol traffic cannot drive the jump action. |

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status (`Confirmed`/`Contradicted`/`Blocked`): `Confirmed`
- Approved requirements / intended behavior understood: `Yes` — normal Event Monitor projections become active-file-only and server-bounded; historical/live conversation, Activity, and combined presentation remain capped; mutable identities are protected while completed candidates exist; the hard cap has a deterministic reachable-edge fallback; bottom-follow/unseen behavior reflects actual visible changes; disclosures remain unchanged; copy is removed; stored traces are unchanged.
- Relevant existing behavior and evidence confirmed: `Yes` — source inspection confirms archive-inclusive local projection, lifecycle reconstruction needs, current handler/dispatcher mutation paths, unbounded state and DOM, mutable segment/tool/compaction lifecycles, unconditional generic timestamp updates, and workspace copy derivation. Aggregate probes support the performance basis.
- Approved change, preserved behavior, and outside scope understood: `Yes` — no archive navigation/fallback, alternate full-history query, migration, GraphQL replacement, disclosure/Activity redesign, or replacement copy/export action.
- Remaining material ambiguity, if any: `None`.

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `REQ-001` | Backend source policy | Pass | Pass | Pass | Confirmed | None. |
| `REQ-002` | Backend replay window | Pass | Pass | Pass | Confirmed | Preserve reconstruct-all-active, select canonical newest 100, then build bundle. |
| `REQ-003` | Central retained/rendered bound | Pass | Pass | Pass | Confirmed | Implement the shared classified selector for conversation and final compaction-aware presentation. |
| `REQ-004` | Live lifecycle and eviction | Pass | Pass | Pass | Confirmed | Implement and test completed-first selection, oldest-mutable fallback, stable-identity re-entry, immediate recapping, and no retained duplicate. |
| `REQ-005` | Bottom-follow and unseen activity | Pass | Pass | Pass | Confirmed | Use only the explicit actual-effect/revision contract and reset baseline; generic timestamps/type heuristics remain forbidden. |
| `REQ-006` | Disclosure preservation | Pass | Pass | Pass | Confirmed | None. |
| `REQ-007` | Activity retention | Pass | Pass | Pass | Confirmed | Apply the matching lifecycle-aware cap and derived-state repair. |
| `REQ-008` | Copy-control cleanup | Pass | Pass | Pass | Confirmed | Remove rather than hide or replace. |
| `REQ-009` | Persisted trace preservation | Pass | Pass | Pass | Confirmed | None. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? (`Pass`/`Fail`) | Linked To Relevant Core Artifacts? (`Pass`/`Fail`) | Internally Complete? (`Pass`/`Fail`) | Consistent With Related Core Artifacts? (`Pass`/`Fail`) | Status And Approval Applicability Are Clear? (`Pass`/`Fail`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `history-window-ui-ux-spec.md` | Pass | Pass | Pass | Pass | Pass | None; keep it in the cumulative package. |

The investigation notes retain the canonical supplement inventory, and requirements/design both link the supplement with clear scope, related IDs, refined status, and approval applicability.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Performance, Behavior Change, and Cleanup are explicit. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | `Missing Invariant` is supported by archive-inclusive projection, unbounded historical/live state, quadratic hydration, and measured response/client cost. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Provider policy, one lifecycle-aware web capability, explicit run revision, Activity cap, and copy cleanup are in scope; broader transport redesign is deferred. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Spines, boundaries, files, interfaces, examples, sequence, tests, removals, and residual risks align. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Backend recent projection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-002` | Historical hydration | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-003` | Live/team/submission mutation and revision | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-004` | Combined presentation and scroll | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| `DS-005` | Activity retention | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Local-memory projection provider | Pass | Pass | Pass | Pass | Provider governs active source/replay window; resolvers retain identity/transport only. |
| Event Monitor recent-window capability | Pass | Pass | Pass | Pass | Owns completion classification, selection, conversation enforcement, combined presentation, and mutation commit. |
| Stream handlers and authoritative dispatchers | Pass | Pass | Pass | Pass | Handlers report actual effects; dispatch/submission commits once after mutation. |
| Agent run state | Pass | Pass | Pass | Pass | Owns only counter/reset, not protocol visibility classification. |
| Activity store | Pass | Pass | Pass | Pass | Owns record lifecycle cap and derived-state repair. |
| Agent conversation feed | Pass | Pass | Pass | Pass | Owns scroll baseline/unseen/jump and consumes explicit props only. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server run-history projection | Pass | Pass | Pass | Pass | Raw-record tail limiting, resolver filesystem access, and archive fallback are forbidden. |
| Web Event Monitor capability | Pass | Pass | Pass | Pass | May use domain/run-state types but not stores, network clients, or components. |
| Stream/feed/Activity consumers | Pass | Pass | Pass | Pass | No timestamp, protocol-type, deep-watch, serialization, direct-array, or template-slice bypass. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `getRunProjection(runId)` | Pass | Pass | Pass | Low | Pass |
| `getTeamMemberRunProjection(teamRunId, memberRouteKey)` | Pass | Pass | Pass | Low | Pass |
| `selectRecentReplayEvents(events)` | Pass | Pass | Pass | Low | Pass |
| `enforceRecentConversationWindow(conversation, limit?)` | Pass | Pass | Pass | Low | Pass |
| `buildRecentEventMonitorPresentation(conversation, compactions, limit?)` | Pass | Pass | Pass | Low | Pass |
| `commitRecentEventMonitorMutation(context, effect)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Active-file read and replay reconstruction | Pass | Pass | N/A | Pass | Reuses current memory facade and transformer. |
| Server event selection | Pass | Pass | N/A | Pass | Extends projection owner. |
| Lifecycle-aware visual window | Pass | Pass | Pass | Pass | No current owner spans hydration/live/Activity-aware presentation. |
| Actual visible-change signal | Pass | Pass | N/A | Pass | Extends current handlers/run state rather than snapshot serialization or UI heuristics. |
| Scroll, Activity, copy cleanup | Pass | Pass | N/A | Pass | Existing local owners are extended or cleaned up. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server run-history projection / agent memory | Pass | Pass | Pass | Pass | Correct provider/read split. |
| Web Event Monitor window | Pass | Pass | Pass | Pass | Coherent feature capability; no second stored timeline. |
| Web streaming/submission/run state | Pass | Pass | Pass | Pass | Actual effect, commit sequencing, and revision lifecycle are separated clearly. |
| Web Activity/workspace components | Pass | Pass | Pass | Pass | Secondary state and observable UI remain with existing owners. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend classification/selection/trimming | Pass | Pass | Pass | Pass | One Event Monitor policy prevents historical/live/presentation drift. |
| `EventMonitorPresentationMutation` | Pass | Pass | Pass | Pass | Tight `'none' | 'changed'` effect with no UI command or protocol enumeration. |
| Server replay selector | Pass | Pass | Pass | Pass | Projection-internal named limit/pure selector. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `HistoricalReplayEvent[]` | Pass | Pass | Pass | N/A | Pass | Existing canonical union remains authoritative for server selection. |
| Visual descriptors/presentation groups | Pass | Pass | Pass | Pass | Ephemeral references only; no parallel stored timeline. |
| Presentation mutation effect/revision | Pass | Pass | Pass | Pass | Effect means actual mutation; revision means committed visible change. |
| Existing Conversation/RunActivity overlap | Pass | Fail | Pass | Pass | Pass | Existing duplication is bounded and explicitly deferred rather than expanded. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server policy/provider files | Pass | Pass | Pass | Pass | Selector and orchestration stay separate. |
| `recentEventMonitorWindow.ts` | Pass | Pass | Pass | Pass | Cohesive lifecycle-aware window capability. |
| Center-mutating handlers and `segmentIdentity.ts` | Pass | Pass | Pass | Pass | Existing mutation/identity owners report effects and completion metadata only. |
| Dispatch/hydration/submission and `AgentRunState.ts` | Pass | Pass | Pass | Pass | Commit/reset/counter responsibilities are explicit. |
| Activity store/feed/parents/workspace/localization | Pass | Pass | N/A | Pass | Existing local responsibilities remain coherent. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server `run-history/projection` | Pass | Pass | Low | Pass | Existing main-line capability. |
| Web `services/eventMonitor` | Pass | Pass | Low | Pass | Feature-oriented lifecycle/window owner. |
| Existing stream/hydration/submission/run-state paths | Pass | Pass | Low | Pass | Extensions match existing owners. |
| Existing component/store/localization paths | Pass | Pass | Medium | Pass | Current physical grouping remains locally coherent. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Archive-inclusive normal projection | Pass | Pass | Pass | Pass | No alternate flag/query/fallback. |
| Unbounded conversation/Activity/presentation | Pass | Pass | Pass | Pass | Replaced at provider, state, Activity, and final feed owners. |
| Generic timestamp unseen trigger | Pass | Pass | Pass | Pass | Timestamp remains bookkeeping only. |
| Workspace copy control/text and dead localization | Pass | Pass | Pass | Pass | Remove local use and globally dead key; no replacement. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Projection and frontend history behavior | No | Pass | Pass | One active-only bounded path. |
| Mutable-event fallback | No | Pass | Pass | Current-state lifecycle handling, not archive/full-history compatibility. |
| Copy action | No | Pass | Pass | Removed without hidden/disabled replacement. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Active/archive raw-trace files and manifest | `Directly Usable — No Migration` | Pass | Pass | N/A | Pass | No schema/writer/layout change; active reader already exists; projection remains read-only. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Server policy/provider | Pass | Pass | Pass | Pass |
| Frontend classifier/effects/revision/presentation | Pass | Pass | Pass | Pass |
| Activity/copy/localization | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Reconstruction-before-limit | Yes | Pass | Pass | Pass | Prevents raw lifecycle splitting. |
| Segment-aware/partial-message selection | Yes | Pass | Pass | Pass | Explains visual units and regrouping. |
| Completed-first and all-mutable fallback | Yes | Pass | Pass | Pass | Resolves `AR-001` with exact identities/counts. |
| Visible revision and reset | Yes | Pass | Pass | Pass | Resolves `AR-002` with visible/no-op examples. |
| Archive boundary and scroll behavior | Yes | Pass | Pass | Pass | Explicitly rejects fallback/forced scrolling. |

## Material Premise Validation (Only When Needed)

### `MP-001` — More than 100 concurrently mutable visual events can require the deterministic hard-cap fallback

- Related approved requirement or established contract: `REQ-003`, `REQ-004`, `AC-004` hard maximum and lifecycle-preserving eviction order.
- Relevant behavior ID(s): `REQ-003`, `REQ-004`; `DS-003`, `DS-004`, `DS-005`.
- Product-supported initiating trigger or governing contract, with evidence: A normal live agent/team-member turn may emit distinct `SEGMENT_START` events before their matching `SEGMENT_END`/message completion; current protocol and `handleSegmentStart` append identified segments without a count restriction. Tool and compaction lifecycles are likewise nonterminal across supported messages. The revised approved contract explicitly covers a 101-all-mutable scenario.
- Concrete current or approved target production caller/event path from that trigger to the claimed state: Agent/team WebSocket -> `parseServerMessage` -> standalone/team dispatcher -> `handleSegmentStart` or nonterminal tool/compaction handler -> identified segment/card appended/upserted in one run context -> repeated supported events produce overflow before terminal markers -> authoritative mutation commit invokes completed-first enforcement.
- Lifecycle preconditions and material consequence at the claimed point: More than 100 retained descriptors are mutable and no completed candidate remains; completed-only eviction cannot restore the approved hard bound. Deterministic oldest-mutable eviction is then necessary, and a later stable-identity update may reconstruct only current source-limited data.
- Reachability: `Reachable`
- Review consequence / proportionate response: Accept the narrowly scoped fallback specified in requirements/design. It is local to the shared selector/handlers, never reads archives, retains no duplicate hidden event, immediately restores the cap, and has focused deterministic tests.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` — the upstream behavior basis is confirmed, both prior findings are resolved, the ownership/data-flow design is actionable in the current codebase, the persisted-data/removal decisions are sound, and no in-scope mechanism depends on an unsupported material premise.

## Findings

None.

## Classification

N/A — passing review.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- A single retained tool result/reasoning/media event can still be byte- or render-heavy.
- The bounded GraphQL bundle still duplicates tool data across conversation and Activity.
- Large active teams may still issue multiple bounded reads during restore.
- Dynamic-height content can still cause imperfect pixel anchoring while non-pinned.
- In the exceptional all-mutable fallback, content evicted before a later lifecycle update may be unavailable; the approved behavior limits re-entry to one source-limited representation and prohibits archive repair/duplicates.

These risks are disclosed, finite within the approved scope, and do not block implementation.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass`
- Notes: Round 2 is authoritative. The complete reviewed solution package is ready for `implementation_engineer`.
