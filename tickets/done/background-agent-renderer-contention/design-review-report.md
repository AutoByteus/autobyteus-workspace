# Design Review Report — Background Agent Renderer Contention

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/design-spec.md`
- Supplemental Task Artifacts Reviewed: `performance-evidence.md` and all six retained files under `probe-evidence/`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`, `SR-002`, `SR-003`, `SR-004`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: `4`
- Trigger: SR-004 re-review handoff from `solution_designer` for remaining ARCH-001 / ARCH-PREM-004.
- Prior Review Round Reviewed: `ARCH-REV-003 — Fail — Design Impact`
- Latest Authoritative Round: `ARCH-REV-004`
- Current-State Evidence Basis: Task HEAD remains `7f0fc49965950d9689726a048371f2e2b78eef31`; `origin/personal` is 13 commits ahead at `3edb88bc6f7e15d074474f51c870a13d69d5d7b7`. The cumulative scoped-source diff for streaming/task projection, Event Monitor, run history/navigation, workspace history, and WebSocket egress is empty. The two commits added since ARCH-REV-003 only update archived image-recovery delivery records/evidence. No production or durable test source is changed in the task worktree.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. Preserve exact canonical lifecycle/background state, the 500 ms configurable cadence, progressive Markdown, task hierarchy/details/focus, and current protocol while removing redundant egress and multiplied frontend projection work.
- Relevant existing behavior and evidence confirmed: Yes. Source review covers canonical status companions, shared egress, blanket frontend dispatch/Event Monitor work, multiplied navigation construction, live stable/transient row composition, every task writer including the ordinary resolver ensure path, context/activity baseline lifecycles, and all production manual focus callers.
- Approved change, preserved behavior, and outside scope understood: Yes. No canonical event, persistence, protocol envelope, focus disconnection, worker, cadence increase, Markdown downgrade, or broad parser redesign is introduced.
- Remaining material ambiguity, if any: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | None. |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | None. |
| BEH-003 | System/User | Pass | Pass | Pass | Confirmed | None. Ordinary first task-agent messages now enter the mutation-bearing router. |
| BEH-004 | System | Pass | Pass | Pass | Confirmed | None. |
| BEH-005 | System | Pass | Pass | Pass | Confirmed | None. Event Monitor lifecycle remains complete. |
| BEH-006 | System/UI | Pass | Pass | Pass | Confirmed | None. Stable/transient rows, focus, topology, and exact patches have one owner. |
| BEH-007 | Contract | Pass | Pass | Pass | Confirmed | None. |
| BEH-008 | Contract | Pass | Pass | Pass | Confirmed | None. |
| BEH-009 | System/Maintainer | Pass | Pass | Pass | Confirmed | None. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `performance-evidence.md` | Pass | Pass | Pass | Pass | Pass | None. |
| `probe-evidence/` retained files | Pass | Pass | Pass | Pass | Pass | None. |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Performance bug plus boundary/refactor correction is explicit. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Current source and retained probes identify redundant UI egress, blanket mutation work, and multiplied navigation projection. | None. |
| Refactor decision is explicit | Pass | The design requires bounded ownership correction now and rejects masking workarounds. | None. |
| Refactor decision is supported by concrete design sections | Pass | Typed egress, shared projector, baseline lifecycle, indexed rows/focus, mutation-bearing task router, and clean removals are fully mapped. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Standalone end to end | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Team/nested/task end to end | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Foreground responsiveness | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Status return/event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Presentation egress | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Frontend effects/Event Monitor | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 | Navigation rows/focus | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 | Egress extensibility | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentStreamWebSocketEgress` | Pass | Pass | Pass | Pass | One shared control pipeline and sole scheduler. |
| Shared agent-stream projector | Pass | Pass | Pass | Pass | Generic effects apply once. |
| Recent Event Monitor coordinator | Pass | Pass | Pass | Pass | Reset/prime/commit and exact lifecycle callers are explicit. |
| Task router / `TeamStreamingService` facade | Pass | Pass | Pass | Pass | Every identity-bearing task ensure/repair returns a required mutation; resolver is read-only. |
| Run-history navigation projection | Pass | Pass | Pass | Pass | Sole stable/transient composer caller; owns rows, indexes, exact focus, topology, and patches. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server egress pipeline | Pass | Pass | Pass | Pass | Filters cannot schedule; observers cannot direct delivery. |
| Shared projector/Event Monitor | Pass | Pass | Pass | Pass | Handlers return effects without committing owners directly. |
| Task source projection | Pass | Pass | Pass | Pass | Composite results prevent context-only mutation consumption; static scans reject discarded results. |
| Read-only member resolver | Pass | Pass | Pass | Pass | Exact lookup only; no task ensure/repair imports or writes. |
| Navigation rows/focus | Pass | Pass | Pass | Pass | Components consume completed state; source focus is coordinated through one facade. |

## Interface Boundary Verdict

| Interface / API / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Egress filter/scheduler/observer contracts | Pass | Pass | Pass | Low | Pass |
| `dispatchAgentStreamMessage` | Pass | Pass | Pass | Medium | Pass |
| Event Monitor reset/prime/commit | Pass | Pass | Pass | Medium | Pass |
| `ensureTaskAgentProjection` | Pass | Pass | Pass | Low | Pass |
| Required `TaskExecutionProjectionMessageResult.mutation` | Pass | Pass | Pass | Low | Pass |
| Read-only `resolveTeamStreamMemberContext` | Pass | Pass | Pass | Low | Pass |
| Task navigation commit | Pass | Pass | Pass | Low | Pass |
| `RunHistoryTeamExecutionRow` / `TeamTreeNode.executionRows` | Pass | Pass | Pass | Low | Pass |
| run-history focus facade/selectors | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| UI stream shaping | Pass | Pass | Pass | Pass | Existing shared egress is extended. |
| Exact team/task identity | Pass | Pass | N/A | Pass | Existing enriched identity remains authoritative. |
| Event Monitor | Pass | Pass | Pass | Pass | Existing capability receives a narrow coordinator. |
| Task source projection | Pass | Pass | N/A | Pass | Existing router/helpers are tightened; no new subsystem. |
| Stable/transient navigation rows | Pass | Pass | Pass | Pass | Existing pure semantics relocate under the correct run-history owner. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server streaming/egress | Pass | Pass | Pass | Pass | Clear presentation boundary. |
| Frontend agent/task streaming | Pass | Pass | Pass | Pass | Router mutates; resolver queries; facade commits. |
| Frontend Event Monitor/context lifecycle | Pass | Pass | Pass | Pass | Complete baseline lifecycle. |
| Frontend run-history/navigation | Pass | Pass | Pass | Pass | Authoritative indexed rows/focus. |
| Workspace/right-pane UI | Pass | Pass | Pass | Pass | Navigation and task-detail concerns remain separate. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Egress roles/equality | Pass | Pass | Pass | Pass | Narrow server ownership. |
| Frontend mutation effects | Pass | Pass | Pass | Pass | Actual effects only. |
| Task projection mutation | Pass | Pass | Pass | Pass | Tight topology/presentation/none result. |
| Stable/transient execution-row composer | Pass | Pass | Pass | Pass | Pure run-history-owned helper with one production caller. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Egress contracts | Pass | Pass | Pass | Pass | Pass | Authority remains bounded. |
| `AgentStreamMutationEffects` | Pass | Pass | Pass | Pass | Pass | Conversation/Event Monitor/navigation lanes are distinct. |
| Task mutation/result types | Pass | Pass | Pass | Pass | Pass | Mutation is required; presentation carries only represented row fields. |
| `RunHistoryTeamExecutionRow` | Pass | Pass | Pass | Pass | Pass | Stable/transient row variants exclude right-pane details. |

## File Responsibility Mapping Verdict

| File / Area | Responsibility Is Singular And Clear? | Responsibility Matches Intended Owner/Boundary? | Re-Tightened After Shared Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server `websocket-egress/*` | Pass | Pass | Pass | Pass | Complete contracts/composition/filter/scheduler mapping. |
| Shared frontend projector/handlers | Pass | Pass | Pass | Pass | Common projection and actual effects. |
| Event Monitor/lifecycle files | Pass | Pass | Pass | Pass | Exact reset/prime caller inventory. |
| Task router/helpers/`TeamStreamingService` | Pass | Pass | Pass | Pass | All task source mutation returns required results and is merged before branches. |
| `teamStreamMemberContextResolver.ts` and tests | Pass | Pass | Pass | Pass | Tightened to observational lookup; mutation test moves to router/service. |
| Team open/reuse restoration | Pass | Pass | Pass | Pass | Restore mutation folds into completed topology seed. |
| Run-history rows/projection/store/focus | Pass | Pass | Pass | Pass | Completed row/focus ownership and exact selectors. |
| Workspace components/contracts/fixtures | Pass | Pass | Pass | Pass | Live-context construction and child inference are removed. |
| Delegated-task right pane | Pass | Pass | N/A | Pass | Preserved independent detail owner. |
| Durable documentation | Pass | Pass | N/A | Pass | Required server/frontend/settings contracts are mapped. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server egress folder | Pass | Pass | Low | Pass | Compact capability boundary. |
| Frontend agentStreaming | Pass | Pass | Low | Pass | Command/query split is explicit. |
| Frontend Event Monitor | Pass | Pass | Low | Pass | Correct presentation owner. |
| Frontend run-history files | Pass | Pass | Medium | Pass | New composer/projection sit beside existing types/store. |
| Workspace/right-pane components | Pass | Pass | Low | Pass | Presentation remains thin and separated. |

## Removal / Decommission Completeness Verdict

| Item / Area | Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Old egress policy/in-class scheduler branches | Pass | Pass | Pass | Pass | One scheduler replaces them. |
| Duplicate generic frontend dispatch | Pass | Pass | Pass | Pass | Shared projector. |
| Before/after Event Monitor API | Pass | Pass | Pass | Pass | Cached final-witness coordinator. |
| Component-time row builder/live context/focus/child inference | Pass | Pass | Pass | Pass | Completed indexed rows/focus replace it. |
| Context-only `ensureTaskAgentContext` and mutating resolver branch | Pass | Pass | Pass | Pass | Composite mutation-bearing helper plus read-only resolver; no alias. |
| Dynamic navigation/reveal builders | Pass | Pass | Pass | Pass | Indexed projection replaces them. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Server egress | No | Pass | Pass | No parallel pipeline/policy export. |
| Frontend dispatch/Event Monitor | No | Pass | Pass | No obsolete transaction wrapper. |
| Navigation execution rows | No | Pass | Pass | No component builder re-export or stable-tree broadening. |
| Task-agent ensure/resolver | No | Pass | Pass | Old context-only export is removed. |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety If Required | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| History, conversations/traces, settings, attachments | `Directly Usable — No Migration` | Pass | Pass | N/A | Pass | Only per-connection state and derived in-memory projection change. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Server egress | Pass | Pass | Pass | Pass |
| Shared projector/Event Monitor | Pass | Pass | Pass | Pass |
| Task router/resolver/result conversion | Pass | Pass | Pass | Pass |
| Navigation row/focus relocation | Pass | Pass | Pass | Pass |
| Downstream validation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Filter/scheduler/observer authority | Yes | Pass | Pass | Pass | Clear. |
| Event Monitor lifecycle | Yes | Pass | Pass | Pass | Reset/final writes/prime and unprimed cases are concrete. |
| Stable/transient rows and focus | Yes | Pass | Pass | Pass | Relocation, semantics, and forbidden component bypass are explicit. |
| Task details versus navigation | Yes | Pass | Pass | Pass | Detail-only changes return navigation none. |
| First ordinary task-agent status/content and repair | Yes | Pass | Pass | Pass | Router ownership, required mutation, read-only resolver, and build/patch timing are concrete. |
| First/existing offline cleanup | Yes | Pass | Pass | Pass | Deferred/final topology and fallback focus semantics are explicit. |

## Material Premise Validation

### ARCH-PREM-004 — An ordinary task-agent stream message can create task topology after the task router returns no mutation

- Related approved requirement or established contract: FR-002, FR-003, FR-005; AC-001, AC-002, AC-007, AC-009.
- Relevant behavior IDs: BEH-003, BEH-006.
- Initiating basis kind: `System`
- Independent product-supported initiating trigger: A live team receives the first ordinary identity-bearing task-agent status or content event.
- Support evidence: Existing `TeamStreamingService` coverage begins with `AGENT_STATUS running` carrying exact task-agent identity and asserts transient context/node creation.
- Forward current production path: `TeamRun event -> team mapper/egress -> TeamStreamingService -> task router returns continue -> member resolver -> ensureTaskAgentContext -> maps/tree mutation -> generic projection`.
- Lifecycle preconditions and material consequence: No task node exists; current resolution can create it after the prior task result saw no topology, leaving an authoritative cache unpublished.
- Reachability: `Reachable`
- Review consequence / proportionate response: SR-004 resolves the premise by moving all exact identity-bearing ensure/repair into the mutation-bearing router, requiring a mutation on every outcome, merging it before every branch, making resolution read-only, and covering build/patch/cleanup timing. No additional machinery is needed.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` — SR-004 is ready for implementation.

## Findings

None.

## Classification

`N/A — Pass`

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Implementation must classify create/repair/reparent versus equal ensure precisely and mechanically capture every mutation-bearing helper result.
- The permitted first-running sequence may perform one required topology build and one final exact status patch; it must never perform two full builds. First-offline create/remove must defer to one final topology operation.
- Nested egress identity, exhaustive generic handler effects, Event Monitor lifecycle hooks, stable/transient relocation, and focus conversion remain implementation-sensitive and have explicit coverage/static checks.
- API/E2E still owns aggregate browser responsiveness, task hierarchy/detail/focus correctness, and final Electron media/file evidence.
- Large individual Markdown renders remain outside scope.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: ARCH-001 and ARCH-002 are resolved. The design now has one authoritative presentation egress, one generic projector, one Event Monitor coordinator, one mutation-bearing task projection path with a read-only resolver, and one indexed navigation owner for stable/transient rows and focus. Implementation may proceed against SR-004.
