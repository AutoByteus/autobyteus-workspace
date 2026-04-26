# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-open-session-delivery/tickets/in-progress/external-channel-open-session-delivery/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-open-session-delivery/tickets/in-progress/external-channel-open-session-delivery/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-open-session-delivery/tickets/in-progress/external-channel-open-session-delivery/design-spec.md`
- Current Review Round: 1
- Trigger: Initial architecture review requested by `solution_designer` for external-channel open-session delivery.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Requirements, investigation notes, design spec, plus source spot-checks in `autobyteus-server-ts/src/external-channel/**`, `autobyteus-server-ts/src/agent-team-execution/**`, `autobyteus-server-ts/src/server-runtime.ts`, and `autobyteus-message-gateway/src/**` for the current receipt workflow, team event surfaces, callback outbox, binding persistence, and gateway ingress disposition contract.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial architecture review | N/A | No blocking findings | Pass | Yes | Design is ready for implementation with residual implementation watchpoints recorded below. |

## Reviewed Design Spec

`/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-open-session-delivery/tickets/in-progress/external-channel-open-session-delivery/design-spec.md`

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First review round. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Inbound external message opens/refreshed route-run link | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Eligible run/team output event to gateway/provider outbound | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Internal `send_message_to` follow-up to external delivery | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Output-runtime local event collection/state transition loop | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Gateway accepted disposition to completed inbox status | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server external-channel ingress | Pass | Pass | Pass | Pass | Narrows receipts to ingress idempotency/audit and removes outbound authority. |
| Server external-channel output delivery | Pass | Pass | Pass | Pass | New owner is justified because no current subsystem owns open route/run output delivery. |
| Server callback outbound | Pass | Pass | Pass | Pass | Reuses existing `ReplyCallbackService`/callback outbox instead of duplicating provider send/retry. |
| Agent/team runtime | Pass | Pass | Pass | Pass | Remains provider-agnostic and exposes public event stream only. |
| Message gateway inbound | Pass | Pass | Pass | Pass | `ACCEPTED` disposition cleanup is in-scope and small enough to include. |
| Message gateway outbound | Pass | Pass | Pass | Pass | Provider adapters remain unchanged transport boundaries. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Channel route identity | Pass | Pass | Pass | Pass | Route is separated from receipt/source identity. |
| Output target identity | Pass | Pass | Pass | Pass | Discriminated target avoids ambiguous generic run IDs. |
| Run/team event parsing | Pass | Pass | Pass | Pass | Parser extraction from reply bridge support is appropriate. |
| Text merge/finalization | Pass | Pass | Pass | Pass | Collector is a bounded local owner, not provider-specific formatting. |
| Callback/delivery idempotency key | Pass | Pass | Pass | Pass | Route-inclusive key fixes same-run/multiple-route risk. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ChannelOutputRoute` | Pass | Pass | Pass | N/A | Pass | Route identity is kept provider/thread-oriented. |
| `ChannelRunOutputTarget` | Pass | Pass | Pass | Pass | Discriminated standalone/team shapes are the right direction. |
| `ChannelRunOutputDeliveryRecord` | Pass | Pass | Pass | Pass | Design explicitly rejects synthetic receipts and duplicate source/route identity. |
| `ChannelMessageReceipt` narrowed form | Pass | Pass | Pass | N/A | Pass | Outbound workflow fields are named for cleanup. |
| Gateway ingress disposition | Pass | Pass | Pass | N/A | Pass | Wire enum becomes `ACCEPTED | UNBOUND | DUPLICATE`. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Receipt workflow startup/singleton | Pass | Pass | Pass | Pass | Must be removed from `server-runtime.ts`. |
| Receipt workflow reducer/effect/persistence/contracts | Pass | Pass | Pass | Pass | Delete or fully detach from build/tests in this change. |
| Exact-turn reply bridges | Pass | Pass | Pass | Pass | Parsing logic can be moved; runtime ownership should be removed. |
| Receipt outbound workflow fields/methods | Pass | Pass | Pass | Pass | Design allows cleanup where touched but forbids active outbound dependency. |
| Gateway `ROUTED` success path | Pass | Pass | Pass | Pass | Clean-cut wire contract update is explicit. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/external-channel/domain/models.ts` | Pass | Pass | Pass | Pass | Domain model additions/removals are semantically scoped. |
| `.../providers/channel-run-output-delivery-provider.ts` | Pass | Pass | N/A | Pass | Persistence contract only. |
| `.../providers/file-channel-run-output-delivery-provider.ts` | Pass | Pass | N/A | Pass | File-backed storage adapter only. |
| `.../services/channel-run-output-delivery-service.ts` | Pass | Pass | Pass | Pass | Normalization/state transitions, not event subscription. |
| `.../runtime/channel-run-output-delivery-runtime.ts` | Pass | Pass | Pass | Pass | Governing lifecycle/subscription/sequencing owner. |
| `.../runtime/channel-run-output-link-registry.ts` | Pass | Pass | N/A | Pass | Internal lifecycle map only. |
| `.../runtime/channel-run-output-eligibility.ts` | Pass | Pass | Pass | Pass | Isolates high-risk external visibility policy. |
| `.../runtime/channel-run-output-event-collector.ts` | Pass | Pass | Pass | Pass | Bounded local stream collector. |
| `.../runtime/channel-output-event-parser.ts` | Pass | Pass | Pass | Pass | Runtime-event normalization only. |
| `.../services/reply-callback-service.ts` | Pass | Pass | Pass | Pass | Route-based callback publishing belongs here. |
| `.../services/channel-binding-service.ts` | Pass | Pass | Pass | Pass | Binding lifecycle notifications belong to binding owner. |
| `autobyteus-message-gateway/src/infrastructure/server-api/autobyteus-server-client.ts` | Pass | Pass | N/A | Pass | Wire response parsing stays in server client. |
| `autobyteus-message-gateway/src/application/services/inbound-inbox-service.ts` | Pass | Pass | N/A | Pass | Inbox status mapping stays in inbox service. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ChannelIngressService` | Pass | Pass | Pass | Pass | May call output runtime; may not publish callbacks directly. |
| `ChannelRunOutputDeliveryRuntime` | Pass | Pass | Pass | Pass | Depends on run public event APIs, binding service, delivery service, callback service. |
| `TeamRun` / agent-team runtime | Pass | Pass | Pass | Pass | No Telegram/gateway dependency. |
| `ReplyCallbackService` | Pass | Pass | Pass | Pass | Encapsulates callback outbox enqueue. |
| Gateway inbound worker/client | Pass | Pass | Pass | Pass | Worker depends on client, not raw server route internals. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ChannelRunOutputDeliveryRuntime` | Pass | Pass | Pass | Pass | Correctly encapsulates link registry, subscriptions, eligibility, collector, and delivery records. |
| `ChannelBindingService` | Pass | Pass | Pass | Pass | Lifecycle notifications avoid GraphQL/setup callers depending on both binding storage and runtime. |
| `ReplyCallbackService` | Pass | Pass | Pass | Pass | Output runtime does not write gateway callback outbox directly. |
| `TeamRun` | Pass | Pass | Pass | Pass | External channel code observes public events rather than altering team delivery semantics. |
| `AutobyteusServerClient` | Pass | Pass | Pass | Pass | Gateway response parsing remains centralized. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `ChannelRunOutputDeliveryRuntime.attachAcceptedDispatch(input)` | Pass | Pass | Pass | Low | Pass |
| `ChannelRunOutputDeliveryRuntime.reconcileBinding(binding)` | Pass | Pass | Pass | Low | Pass |
| `ChannelRunOutputDeliveryRuntime.detachBinding(bindingId)` | Pass | Pass | Pass | Low | Pass |
| `ChannelRunOutputDeliveryService.upsertObservedTurn(input)` | Pass | Pass | Pass | Low | Pass |
| `ChannelRunOutputDeliveryService.markReplyFinalized(input)` | Pass | Pass | Pass | Low | Pass |
| `ReplyCallbackService.publishRunOutputReply(input)` | Pass | Pass | Pass | Low | Pass |
| `ChannelBindingService.isRouteBoundToTarget(route, target)` | Pass | Pass | Pass with required target tightening | Medium | Pass |
| `AutobyteusServerClient.forwardInbound(envelope)` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/external-channel/runtime/` | Pass | Pass | Low | Pass | Runtime, link registry, eligibility, parser, and collector are coherent runtime concerns. |
| `autobyteus-server-ts/src/external-channel/services/` | Pass | Pass | Low | Pass | Domain-facing services remain separate from runtime event loop. |
| `autobyteus-server-ts/src/external-channel/providers/` | Pass | Pass | Low | Pass | File provider follows established pattern. |
| `autobyteus-message-gateway/src/infrastructure/server-api/` | Pass | Pass | Low | Pass | Server wire parser belongs here. |
| `autobyteus-message-gateway/src/application/services/` | Pass | Pass | Low | Pass | Inbox status transition belongs here. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Inbound idempotency/audit | Pass | Pass | N/A | Pass | Receipt service remains but narrows. |
| Open route/run output delivery | Pass | Pass | Pass | Pass | Current receipt workflow cannot discover later turns. |
| Provider outbound send/retry | Pass | Pass | N/A | Pass | Callback outbox/gateway provider path is reused. |
| Team event subscription | Pass | Pass | N/A | Pass | Public `TeamRun.subscribeToEvents()` is correct. |
| Event parsing | Pass | Pass | N/A | Pass | Extracting parser support from bridge code is sound. |
| Binding liveness | Pass | Pass | N/A | Pass | Existing binding owner is extended rather than bypassed. |
| Gateway ingress queue | Pass | Pass | N/A | Pass | Existing forwarder/inbox service is updated. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Direct reply publication | No | Pass | Pass | Direct replies and follow-ups share output runtime path. |
| Follow-up output modeling | No | Pass | Pass | Synthetic inbound receipts are explicitly rejected. |
| Gateway disposition | No | Pass | Pass | No permanent dual `ROUTED`/`ACCEPTED` success model. |
| Team member visibility | No | Pass | Pass | No broad member-output compatibility shortcut. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Domain/provider/service additions | Pass | Pass | Pass | Pass |
| Parser/collector extraction | Pass | Pass | Pass | Pass |
| Output runtime implementation | Pass | Pass | Pass | Pass |
| Ingress path cutover | Pass | Pass | Pass | Pass |
| Receipt workflow decommission | Pass | Pass | Pass | Pass |
| Gateway disposition update | Pass | Pass | Pass | Pass |
| Focused and integration tests | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Open output delivery | Yes | Pass | Pass | Pass | Example makes boundary ownership clear. |
| Coordinator/team eligibility | Yes | Pass | Pass | Pass | Example directly addresses worker/internal leak risk. |
| Once-only key | Yes | Pass | Pass | Pass | Example fixes route/run/turn key ambiguity. |
| Follow-up output model | Yes | Pass | Pass | Pass | Synthetic receipt anti-example is useful. |
| Gateway disposition | Yes | Pass | Pass | Pass | Wire/status split is clear. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None blocking | Requirements cover direct replies, asynchronous coordinator follow-ups, multiple outputs, internal leak prevention, restart idempotency, and gateway disposition completion. | N/A | Closed for design review. |

## Review Decision

Pass: the design is ready for implementation.

## Findings

None.

## Classification

N/A - no blocking design-review findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Event parsing and eligibility must be validated with representative Autobyteus, Codex, Claude, and mixed-team event shapes before broad acceptance; this is already called out in the design and should be enforced through focused tests.
- The first accepted dispatch turn must not be missed during cutover from receipt workflow to output runtime. Implementation should use the dispatch correlation available at `attachAcceptedDispatch()` and/or recovery from run history so direct replies remain covered even if early stream events occur before subscription attaches.
- Restored team-run links depend on resolving the coordinator/entry member identity from binding/team metadata. Implementation should prefer the accepted dispatch member identity when live and have explicit restore tests for cached team run bindings.
- Output record state should be considered published after idempotent callback outbox enqueue, while provider-level send results remain owned by existing delivery events. Duplicate outbox keys should converge records to a terminal/non-retrying state.
- Delivery/finalization should be processed serially per route/run link so multiple eligible coordinator outputs preserve observed stream order.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Approved for implementation. The architecture makes the correct clean-cut shift from receipt-scoped outbound replies to open route/run output delivery, keeps team runtime provider-agnostic, reuses the existing callback outbox/provider path, and includes the gateway `ACCEPTED` disposition cleanup in the right adjacent slice.
