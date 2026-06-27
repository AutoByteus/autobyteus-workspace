# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/design-spec.md`
- Current Review Round: 1
- Trigger: Initial design handoff from `solution_designer` after user-approved recursive participant-path model.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Read the three upstream artifacts and inspected current code in `autobyteus-web/utils/teamUserMessageTarget.ts`, `autobyteus-web/stores/agentTeamRunStore.ts`, `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`, `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`, frontend task projection files, `autobyteus-server-ts/src/services/agent-streaming/team-command-selector-parser.ts`, `agent-team-stream-handler.ts`, `agent-team-execution/domain/team-run.ts`, `backends/team-run-backend.ts`, `backends/team-manager.ts`, `backends/mixed/mixed-team-manager.ts`, `mixed-persistent-member-registry.ts`, `mixed-sub-team-member-handle.ts`, `mixed-task-team-member-handle.ts`, and `mixed-task-team-instance-registry.ts`.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design handoff | N/A | None | Pass | Yes | Design is actionable for implementation with residual risks already identified in the spec. |

## Reviewed Design Spec

The design replaces flat structural-only chat routing with a recursive typed `ConversationTargetAddress` rooted at the websocket-bound `TeamRun`. It keeps existing structural route/path payloads only as parser-normalized input, adds a `TeamRun.postMessageToConversationTarget` boundary, places mixed structural/runtime traversal behind the mixed backend, and changes frontend focus resolution from route-only to address-based resolution plus a separate local target key.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design spec declares feature + behavior change + targeted refactor. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Classifies Missing Invariant + Boundary Or Ownership Issue + Shared Structure Looseness, backed by frontend route-only focus, parser structural-only selectors, and split backend task primitives. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor needed now is explicit; lifecycle/tool approval reuse is intentionally deferred. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | New parser, domain type, `TeamRun` boundary, mixed router, frontend resolver, projection metadata, and local-key changes are mapped to files and migration steps. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | Initial round. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary end-to-end user chat send | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Compatibility flat structural payload input | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Mixed backend segment traversal | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Return/event projection after delivery | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Frontend focus-to-address resolution | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend team workspace target resolution | Pass | Pass | Pass | Pass | Existing route-only utility is replaced/renamed rather than expanded into a mixed semantic catch-all. |
| Frontend streaming protocol | Pass | Pass | Pass | Pass | Transport serialization remains separate from addressability decisions. |
| Backend agent-streaming parser | Pass | Pass | Pass | Pass | Parser owns alias/legacy normalization and scalar/ambiguity rejection only. |
| Team execution domain / `TeamRun` | Pass | Pass | Pass | Pass | Correct public authoritative boundary for websocket caller. |
| Mixed backend conversation routing | Pass | Pass | Pass | Pass | New internal router is justified because no current owner composes structural, task-agent, and task-team traversal. |
| Mixed registries and handles | Pass | Pass | Pass | Pass | Design extends existing handles instead of bypassing lifecycle/readiness boundaries. |
| Task lifecycle/tool approval routing | Pass | Pass | Pass | Pass | Correctly left separate from ordinary chat semantics. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Conversation address/segment model | Pass | Pass | Pass | Pass | Backend domain and frontend type mirrors are explicit; parser/protocol mapping is separate. |
| Member selector route/path normalization | Pass | Pass | Pass | Pass | Reuses existing selector helpers instead of duplicating route/path equivalence. |
| Frontend local target key | Pass | Pass | Pass | Pass | Separated from backend structural route keys. |
| Mixed recursive traversal policy | Pass | Pass | Pass | Pass | Centralized under `MixedConversationTargetRouter`, not duplicated in handler/store. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ConversationTargetAddress` | Pass | Pass | Pass | Pass | Segment kind determines id semantics; parent run id is validation/debug only and cannot redirect. |
| `member` segment selector | Pass | Pass | Pass | Pass | Route key/path equivalence is existing selector semantics; malformed/mixed/ambiguous input is required to be rejected or normalized at parser/domain boundaries. |
| `task_team` segment | Pass | Pass | Pass | N/A | Runtime id is typed and not encoded into structural route strings. |
| `task_agent` segment | Pass | Pass | Pass | N/A | Terminal semantics are explicit. |
| Frontend `conversationTargetKey` | Pass | Pass | Pass | N/A | Explicitly frontend-only opaque key; not a backend route. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Fixed-kind address draft | Pass | Pass | Pass | Pass | Replaced by recursive segments. |
| Route-only frontend target as authoritative chat target | Pass | Pass | Pass | Pass | Replaced by address resolver plus local target key. |
| Runtime projection composer rejection | Pass | Pass | Pass | Pass | Replaced by addressability-based decision. |
| Structural-only `SEND_MESSAGE` internal route | Pass | Pass | Pass | Pass | Flat selectors normalize to address and then share one routing path. |
| Runtime ids in route-key slash strings | Pass | Pass | Pass | Pass | Explicitly forbidden. |
| Store variables that imply runtime local keys are member route keys | Pass | Pass | Pass | Pass | Renamed at store layer; wider upload API rename can be deferred safely. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/domain/conversation-target-address.ts` | Pass | Pass | Pass | Pass | Domain model/helpers only. |
| `autobyteus-server-ts/src/services/agent-streaming/team-conversation-target-address-parser.ts` | Pass | Pass | Pass | Pass | Transport normalization only. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/conversation-target/mixed-conversation-target-router.ts` | Pass | Pass | Pass | Pass | Mixed backend traversal only. |
| `TeamRun`, `TeamRunBackend`, `TeamManager` interfaces | Pass | Pass | N/A | Pass | Add public/contract method without exposing internals. |
| Mixed registries/handles | Pass | Pass | N/A | Pass | Add child-address entry methods that preserve lifecycle ownership. |
| `autobyteus-web/types/agent/ConversationTargetAddress.ts` | Pass | Pass | Pass | Pass | Frontend address/resolution types. |
| `autobyteus-web/utils/teamConversationTargetAddress.ts` | Pass | Pass | Pass | Pass | Focused node to address/local key/reason. |
| Frontend projection files | Pass | Pass | N/A | Pass | Store/derive segment metadata only; no backend routing decisions. |
| `TeamStreamingService.ts` and protocol message types | Pass | Pass | N/A | Pass | Serialization/schema only. |
| `agentTeamRunStore.ts` and `TeamWorkspaceView.vue` | Pass | Pass | N/A | Pass | Orchestration and UI visibility/labeling remain separate from route traversal. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Websocket handler -> `TeamRun` | Pass | Pass | Pass | Pass | Handler must not reach mixed registries/directories. |
| `TeamRun` -> backend contract | Pass | Pass | Pass | Pass | Correct facade-to-backend dependency. |
| Mixed router -> registries/handles | Pass | Pass | Pass | Pass | Router uses internal owned mechanisms, not global child-run bypass. |
| Task-team/subteam handles -> child `TeamRun` | Pass | Pass | Pass | Pass | Ensures child lifecycle/event binding remains encapsulated. |
| Frontend store/UI -> resolver/service | Pass | Pass | Pass | Pass | Store/UI do not hand-build runtime segments in multiple places. |
| Task lifecycle/tool approval commands | Pass | Pass | Pass | Pass | Kept separate from ordinary chat address. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `TeamRun.postMessageToConversationTarget` | Pass | Pass | Pass | Pass | Satisfies Authoritative Boundary Rule for websocket send. |
| `TeamConversationTargetAddressParser` | Pass | Pass | Pass | Pass | Parser boundary prevents handler from owning schema details. |
| `MixedConversationTargetRouter` | Pass | Pass | Pass | Pass | Internal traversal owner. |
| `MixedTaskTeamInstanceRegistry` | Pass | Pass | Pass | Pass | Owns run-id/logical-team mismatch validation and handle lookup. |
| `MixedTaskTeamMemberHandle` | Pass | Pass | Pass | Pass | Child run readiness/restoration stays inside handle. |
| `MixedSubTeamMemberHandle` | Pass | Pass | Pass | Pass | Structural child-team entry uses existing boundary. |
| `ConversationTargetAddressResolver` | Pass | Pass | Pass | Pass | Centralizes frontend projection metadata interpretation. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `TeamStreamingService.sendMessage(content, address, ...)` | Pass | Pass | Pass | Low | Pass |
| `resolveTeamConversationTargetAddress(...)` | Pass | Pass | Pass | Low | Pass |
| `resolveSendMessageConversationTargetAddress(payload, sessionTeamRunId)` | Pass | Pass | Pass | Low | Pass |
| `TeamRun.postMessageToConversationTarget(message, address)` | Pass | Pass | Pass | Low | Pass |
| `TeamRunBackend.postMessageToConversationTarget` | Pass | Pass | Pass | Low | Pass |
| `TeamManager.postMessageToConversationTarget` | Pass | Pass | Pass | Low | Pass |
| `MixedConversationTargetRouter.postMessage` | Pass | Pass | Pass | Low | Pass |
| `MixedTaskTeamInstanceRegistry.postMessageToConversationTarget(...)` | Pass | Pass | Pass | Low | Pass |
| `MixedTaskTeamMemberHandle.postMessageToConversationTarget(...)` | Pass | Pass | Pass | Low | Pass |
| `MixedSubTeamMemberHandle.postMessageToConversationTarget(...)` | Pass | Pass | Pass | Low | Pass |
| Existing `TeamRun.postMessage(message, selector, targetMemberRunId)` | Pass | Medium | Medium | Medium | Pass | Acceptable only as retained non-new-chat/internal structural API; design forbids use for new websocket chat path. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-team-execution/domain` address type | Pass | Pass | Low | Pass | Domain-level team execution concept. |
| `services/agent-streaming` parser | Pass | Pass | Medium | Pass | Medium risk controlled by explicit no-traversal rule. |
| `backends/mixed/conversation-target/` | Pass | Pass | Low | Pass | Compact folder is justified by bounded local traversal flow. |
| `autobyteus-web/utils/teamConversationTargetAddress.ts` | Pass | Pass | Low | Pass | Existing frontend utility area is appropriate. |
| Frontend projection files | Pass | Pass | Medium | Pass | Medium risk controlled by metadata-only responsibility. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Structural selector normalization | Pass | Pass | N/A | Pass | Reuse existing route/path helper area. |
| Websocket command parsing | Pass | Pass | N/A | Pass | Extend existing parser area. |
| Public runtime command boundary | Pass | Pass | N/A | Pass | Extend `TeamRun` and backend contracts. |
| Mixed runtime routing | Pass | Pass | Pass | Pass | New internal router is justified by missing recursive owner. |
| Frontend focus target resolution | Pass | Pass | Pass | Pass | Replacing route-only resolver is justified. |
| Task lifecycle/tool approval | Pass | Pass | N/A | Pass | Leave unchanged. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Existing flat structural `SEND_MESSAGE` payloads | Yes, parser-bound input compatibility only | Pass | Pass | Not an internal dual route; normalizes immediately. |
| Fixed-kind runtime address draft | No | Pass | Pass | Explicitly rejected. |
| Runtime ids in structural route strings | No | Pass | Pass | Explicitly forbidden. |
| Task lifecycle/tool approval selector reuse | No for ordinary chat | Pass | Pass | Kept separate. |
| Runtime composer hidden behavior | No for addressable nodes | Pass | Pass | Replaced by addressability. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Backend domain/parser/boundary/router sequence | Pass | Pass | Pass | Pass |
| Mixed registry/handle extension | Pass | Pass | Pass | Pass |
| Websocket handler transition | Pass | Pass | Pass | Pass |
| Frontend type/resolver/projection/store/UI transition | Pass | Pass | Pass | Pass |
| Coverage update sequence | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime target payload | Yes | Pass | Pass | Pass | Good and bad examples clarify typed runtime ids vs route strings. |
| Old structural payload normalization | Yes | Pass | Pass | Pass | Clarifies no dual internal route. |
| Child task-team entry | Yes | Pass | Pass | Pass | Clarifies handle boundary. |
| Frontend task-team child target | Yes | Pass | Pass | Pass | Clarifies UI keys vs backend addresses. |
| Nested task-team path | Yes | Pass | Pass | Pass | Shows recursive model advantage. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Full inherited projection segments for nested-nested task-team paths | Without full ancestry, frontend cannot construct arbitrary recursive runtime addresses. | Implementation must store/propagate `conversationTargetSegments` on projections and cover it with tests. | Covered by design; no upstream rework required. |
| Optimistic local insertion for team/task-team default targets | Current store assumes concrete leaf `AgentContext`. | Implementation must defer optimistic insertion or implement explicit non-leaf placement as specified. | Covered by design; no upstream rework required. |
| Structural subteam path remainder preservation | Deep structural member and structural+runtime routing can drop remainders if only top-level is resolved. | Implementation must add child-address entry through `MixedSubTeamMemberHandle` and test deep paths. | Covered by design; no upstream rework required. |
| Context-file owner API naming | Existing names imply `memberRouteKey`. | Use `conversationTargetKey`/`targetUploadKey` in store; endpoint rename may be deferred if key is opaque. | Covered by design; residual naming risk. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A — pass; no design-impact, requirement-gap, or unclear findings are open.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Implementation must keep `AgentTeamStreamHandler` thin: parser plus `TeamRun.postMessageToConversationTarget` only. Any direct mixed registry or active-run directory access would violate the reviewed boundary.
- The normalized domain/member segment shape must not permit ambiguous selector state to leak past parser/domain helpers. If both route key and path appear and disagree, reject rather than choose silently.
- Frontend projection metadata should prefer stored full segment prefixes for nested runtime paths; one-level reconstruction is acceptable only as a bounded fallback.
- Local `conversationTargetKey` must remain frontend-only and must not become a backend route-string encoding.
- Durable coverage needs to include concurrent task-agent/task-team run ids and no-fallback invalid runtime targets because those are the primary ambiguity stress cases.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Design is ready for implementation. Proceed with the cumulative package and preserve the boundary constraints called out above.
