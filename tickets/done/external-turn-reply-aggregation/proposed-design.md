# Proposed Design Document

## Design Version

- Current Version: `v1`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Align accepted-receipt recovery with one-publish-per-turn accumulated reply semantics | 1 |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/external-turn-reply-aggregation/investigation-notes.md`
- Requirements: `tickets/in-progress/external-turn-reply-aggregation/requirements.md`
- Requirements Status: `Design-ready`
- Shared Design Principles: `software-engineering-workflow-skill/shared/design-principles.md`
- Common Design Practices: `software-engineering-workflow-skill/shared/common-design-practices.md`

## Summary

Keep the existing one-publish-per-turn external-channel contract and make the accepted-receipt runtime honor it consistently. The live observation bridge already accumulates same-turn assistant-visible text and resolves it at `TURN_COMPLETED`; the fix is to stop the accepted-receipt runtime from publishing persisted assistant traces before that live path has a chance to finish the turn. Persisted turn-reply recovery stays as a fallback path, not the first choice for an active accepted turn with a known run and turn.

## Goal / Intended Change

Change the accepted-receipt recovery control flow so an active accepted turn prefers live observation and publishes only the accumulated final turn reply. Preserve persisted recovery for cases where live observation is unavailable, unresolved, or later retried after the live path cannot finish.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the current early persisted-reply-first behavior from accepted receipt processing and update tests that encode that behavior.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | One external publish per logical turn | AC-001, AC-003 | Same-turn reply is published once with preserved dedupe | UC-001, UC-002, UC-003, UC-004 |
| R-002 | Final published reply contains accumulated same-turn assistant text across tool boundaries | AC-001 | Multi-leg same-turn aggregation | UC-001, UC-003 |
| R-003 | Partial persisted assistant traces from unfinished turns are not immediately publishable when live observation is available | AC-002 | No premature publish from unfinished turn | UC-001, UC-002 |
| R-004 | Callback dedupe and receipt lifecycle stay intact | AC-003 | Final callback remains one-shot | UC-001, UC-002, UC-003, UC-004 |
| R-005 | Single-leg and completed-turn paths still work | AC-004 | Regression safety | UC-003, UC-004 |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | Accepted receipt processing checks persisted recovery before live observation | `accepted-receipt-recovery-runtime.ts:processReceipt()` | Whether team path needs separate changes |
| Current Ownership Boundaries | Receipt runtime owns orchestration, live bridge owns turn accumulation, callback service owns dedupe/outbox | `accepted-receipt-recovery-runtime.ts`, `channel-agent-run-reply-bridge.ts`, `reply-callback-service.ts` | None significant |
| Current Coupling / Fragmentation Problems | Recovery runtime violates the live bridge contract by prematurely publishing partial persisted text | `accepted-receipt-recovery-runtime.ts`, `channel-turn-reply-recovery-service.ts` | Whether recovery service needs explicit completion checks now |
| Existing Constraints / Compatibility Facts | One callback idempotency key and receipt routing state exist per turn | `channel-reply-bridge-support.ts`, `reply-callback-service.ts`, `file-channel-message-receipt-provider.ts` | None |
| Relevant Files / Components | Runtime ordering, persisted recovery, unit tests, integration harness | matching runtime/service/test files | None |

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | External inbound message | Final callback outbox enqueue for the completed turn | `AcceptedReceiptRecoveryRuntime` | This is the main business path that decides what external users receive |
| DS-002 | Return-Event | Runtime event subscription | `REPLY_READY` observation result | `ChannelAgentRunReplyBridge` | This is where same-turn assistant text is accumulated correctly today |
| DS-003 | Bounded Local | Receipt retry tick | observation start / fallback recovery / publish decision | `AcceptedReceiptRecoveryRuntime` | The local state machine ordering is the bug source |

## Primary Execution / Data-Flow Spine(s)

- `ChannelIngressService -> AcceptedReceiptRecoveryRuntime -> ChannelAgentRunReplyBridge -> ReplyCallbackService -> GatewayCallbackOutboxStore`

Why the span is long enough:
- It starts at the accepted ingress receipt boundary rather than only the local helper.
- It crosses the authoritative owner for reply orchestration.
- It ends at the actual external delivery enqueue boundary that determines user-visible behavior.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | An external message becomes an accepted receipt, the runtime correlates it to a turn, waits for that turn’s final assistant output, and enqueues exactly one externally deliverable reply for that turn. | ingress receipt, accepted runtime, live observation, callback enqueue | `AcceptedReceiptRecoveryRuntime` | receipt state transitions, callback dedupe |
| DS-002 | The live bridge listens to run events for one accepted turn, merges same-turn assistant content across model legs, and resolves only when the turn is complete. | runtime events, segment merge, turn completion | `ChannelAgentRunReplyBridge` | persisted fallback when live content is missing |
| DS-003 | The accepted runtime periodically reevaluates one accepted receipt and chooses correlation, observation, fallback recovery, retry, or publish. | receipt lookup, observation registry, publish path | `AcceptedReceiptRecoveryRuntime` | timers, startup recovery, no duplicate publish |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `AcceptedReceiptRecoveryRuntime` | Receipt orchestration order, observation start conditions, fallback timing, final publish trigger | Assistant-text accumulation logic, outbox storage internals | Primary fix site |
| `ChannelAgentRunReplyBridge` | Same-turn live text accumulation and turn-completion resolution | Receipt lifecycle mutation | Preserve current responsibility |
| `ChannelTurnReplyRecoveryService` | Recovery of reply text from persisted turn traces | Deciding whether a live accepted turn should publish now | Use only as fallback or delayed recovery |
| `ReplyCallbackService` | Callback envelope creation, idempotent enqueue, binding check | Turn-completion policy | No contract change needed |

## Return / Event Spine(s) (If Applicable)

- `AgentRun.subscribeToEvents -> ChannelAgentRunReplyBridge.handleRuntimeEvent -> mergeAssistantText -> TURN_COMPLETED -> publishPendingTurnReply -> REPLY_READY`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `AcceptedReceiptRecoveryRuntime`
- Bounded local spine: `processReceipt -> validate accepted receipt -> choose observation path -> fallback recovery or retry -> publishReply`
- Why it must be explicit: the defect is caused by the local branch ordering inside this owner, not by the broader agent turn model.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? (`Yes`/`No`) |
| --- | --- | --- | --- |
| Callback idempotency | `ReplyCallbackService` | Prevent duplicate per-turn publishes | Yes |
| Receipt lifecycle state | `ChannelMessageReceiptService` provider | Move accepted receipts to routed or unbound | Yes |
| Persisted trace recovery | `ChannelTurnReplyRecoveryService` | Reconstruct turn reply when live observation cannot produce one | Yes |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Same-turn reply accumulation | `ChannelAgentRunReplyBridge` | Reuse | Already implements the desired accumulation contract | N/A |
| Active receipt orchestration | `AcceptedReceiptRecoveryRuntime` | Extend | Bug is ordering inside the existing owner | N/A |
| Persisted fallback reply recovery | `ChannelTurnReplyRecoveryService` | Reuse / Possibly Extend | Existing fallback service is sufficient if invoked at the right time; minor hardening remains optional | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `external-channel/runtime` | Accepted receipt processing, live observation start, retries | DS-001, DS-003 | accepted receipt orchestration | Extend | Main code changes land here |
| `external-channel/services` | callback publication, persisted reply recovery | DS-001 | callback/outbox and fallback recovery | Reuse | No new subsystem |
| `external-channel/tests` | unit and integration regression coverage | DS-001, DS-003 | validation gates | Extend | Update expectations to final-turn accumulation |

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - `AcceptedReceiptRecoveryRuntime -> ChannelAgentRunReplyBridge`
  - `AcceptedReceiptRecoveryRuntime -> ChannelTurnReplyRecoveryService`
  - `AcceptedReceiptRecoveryRuntime -> ReplyCallbackService`
- Authoritative public entrypoints versus internal owned sub-layers:
  - Upper layers use `AcceptedReceiptRecoveryRuntime` for accepted receipt handling.
  - `ChannelAgentRunReplyBridge` remains the authoritative owner for same-turn live accumulation.
- Authoritative Boundary Rule per domain subject:
  - Accepted receipt orchestration must choose between live bridge and persisted recovery; callers should not bypass the runtime and independently publish persisted replies.
- Forbidden shortcuts:
  - No direct persisted publish from `processReceipt()` before the live bridge has a chance to resolve an active known turn.

## Architecture Direction Decision (Mandatory)

- Chosen direction: `Prefer live observation for active accepted turns with known run/turn; use persisted recovery only as fallback or delayed retry`
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`): This aligns the runtime with the existing accumulation boundary, keeps the one-shot callback contract intact, removes the premature publish race, and minimizes surface area.
- Data-flow spine clarity assessment: `Yes`
- Spine span sufficiency assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- Authoritative Boundary Rule assessment: `Yes`

## Proposed Behavior

1. When an accepted receipt has `agentRunId` and `turnId`, `processReceipt()` should first attempt live observation if the run is still resolvable.
2. While live observation is pending, the runtime should not publish persisted reply text from the same active turn.
3. If live observation produces `REPLY_READY`, publish that reply and route the receipt.
4. If live observation cannot start, times out, closes without a reply, or the run is unavailable, persisted turn-reply recovery may be attempted on a later retry tick.
5. Startup recovery for already completed turns remains supported through the persisted recovery path.

## File / Change Mapping

| File | Planned Change | Why Here |
| --- | --- | --- |
| `autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-recovery-runtime.ts` | Reorder receipt processing to prefer live observation before persisted recovery for active accepted turns; keep retry/fallback behavior | This file owns accepted receipt orchestration |
| `autobyteus-server-ts/tests/unit/external-channel/runtime/accepted-receipt-recovery-runtime.test.ts` | Replace early-publish expectations with live-first behavior and add regression for no premature persisted publish while observation is pending | This file currently codifies the broken behavior |
| `autobyteus-server-ts/tests/integration/api/rest/channel-ingress.integration.test.ts` | Update harness expectations to validate final aggregated reply behavior | Ensures end-to-end coverage at ingress boundary |

## Non-Goals

- No change to the frontend message rendering contract in this ticket.
- No change to `autobyteus-ts` turn creation semantics.
- No new incremental multi-message external-channel publish protocol.
