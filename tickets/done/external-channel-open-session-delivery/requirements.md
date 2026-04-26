# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready; approved by user on 2026-04-26.

## Goal / Problem Statement

External messaging channels such as Telegram must behave as an open delivery channel for the active bound run/conversation, not as a strict one-inbound-message-to-one-outbound-reply exchange. The reported bug is reproducible from the current architecture: the server creates an ingress receipt for each inbound external message, binds that receipt to the directly-dispatched run turn, observes only that bound turn, and publishes one reply for that receipt. If an agent-team coordinator later emits a user-facing response because another team member reported back through `send_message_to`, that later coordinator turn has no external ingress receipt and no channel delivery observer, so Telegram does not receive it unless the user sends another external message.

## Investigation Findings

- `ChannelIngressService.handleInboundMessage()` is receipt-centered: it creates or loads a receipt by `{provider, transport, accountId, peerId, threadId, externalMessageId}`, dispatches the inbound message to the binding, records one accepted dispatch with one `agentRunId`/`teamRunId`/`turnId`, and registers that accepted receipt with `ReceiptWorkflowRuntime`.
- `ReceiptWorkflowRuntime` and `ReceiptEffectRunner` observe and publish only receipts that already exist and have a bound turn. Their active workflow key is the external inbound message receipt, not the open channel route or run.
- Team inter-agent delivery (`deliverInterAgentMessage`) posts a new user-style message into the recipient member run and emits team agent events, but it does not create an external receipt or tell the external-channel runtime that the new recipient turn belongs to the open Telegram route.
- Existing tests cover direct external inbound reply and multiple distinct inbound messages on the same thread. They do not cover a no-new-inbound asynchronous coordinator follow-up after an internal member-to-coordinator handoff.
- Documentation currently describes a follow-up Telegram message from the user as the way to reuse a bound runtime; it does not promise open-channel delivery of later coordinator outputs.
- Ancillary finding: `autobyteus-message-gateway` still expects server ingress dispositions `ROUTED | UNBOUND | DUPLICATE`, while the server route currently returns `ACCEPTED | UNBOUND | DUPLICATE`. This mismatch is not the root cause of the missing asynchronous coordinator output, but it should be corrected in the same area because it can cause stale/retry semantics in the gateway inbound queue after the server has accepted a message.

## Recommendations

1. Introduce an explicit external-channel run delivery owner (for example `ChannelRunOutputDeliveryRuntime`) whose authority is the active channel route/binding to run link, not a single inbound receipt.
2. Keep inbound message receipts for ingress idempotency and dispatch audit, but remove outbound assistant-reply publication authority from the receipt workflow once the new delivery runtime owns all eligible run outputs, including the initial direct reply.
3. Persist delivery attempts by run/turn/source route (for example a `ChannelRunOutputDeliveryRecord`) so each eligible output is delivered exactly once per bound route and can be restored after server restart.
4. For team bindings, filter output eligibility to coordinator/entry-node user-facing turns only, using the binding target/coordinator identity and existing team event visibility; do not leak worker-only/internal inter-agent traffic.
5. Add executable coverage for the exact reported path: Telegram/external inbound to a team coordinator, coordinator delegates to a worker, worker sends a message back to coordinator, coordinator emits a later user-facing response without a second inbound external message, and the gateway callback receives that response.
6. Normalize the gateway/server ingress disposition contract so the gateway treats server `ACCEPTED` as the completed/routed state or both sides agree on one current enum.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: User sends a Telegram/external-channel message to a coordinator agent, coordinator responds directly, and the user receives the response.
- UC-002: User sends a Telegram/external-channel message to a coordinator agent, coordinator delegates to a team member, the team member later messages the coordinator, and the coordinator emits a follow-up response without a new user message; the external-channel user receives that follow-up.
- UC-003: Multiple coordinator user-facing messages may be emitted during one active external conversation/run and should be delivered in run-stream order without requiring additional inbound user messages.
- UC-004: Gateway/server ingress bookkeeping reaches a completed state after the server accepts an inbound message, instead of retrying because of a disposition enum mismatch.

## Out of Scope

- Adding new external channel providers beyond the existing external-channel/Telegram-capable infrastructure.
- Delivering every team member's internal messages to the external user.
- Changing `send_message_to` tool semantics except where needed to identify/output-filter externally eligible coordinator follow-up turns.
- General web UI redesign of team run streaming.
- Long-term notification preference features such as muting, per-provider push preferences, or user-configurable routing rules.

## Functional Requirements

- FR-001: External channels MUST deliver all eligible coordinator-authored or coordinator-surfaced user-facing output messages associated with the active external route-to-run link, including outputs triggered by internal team-member handoffs rather than by a new inbound external user message.
- FR-002: External-channel delivery MUST not be limited to the synchronous response or bound turn of the user's inbound external message.
- FR-003: For the same external route-to-run link, delivery MUST preserve the order of eligible output turns as observed from the authoritative run/team event stream.
- FR-004: External-channel delivery MUST deliver each eligible output once per route/run/turn despite retries, restarts, duplicate inbound gateway forwards, or repeated runtime observations.
- FR-005: External-channel delivery MUST NOT leak internal-only worker/team-member coordination messages to the external user unless they are surfaced as coordinator/entry-node user-facing output under the existing visibility model.
- FR-006: Inbound external message receipt state MUST continue to provide ingress idempotency, binding resolution, dispatch auditing, and recovery of accepted inbound dispatches.
- FR-007: Outbound external delivery authority MUST be owned by one open-channel run delivery subsystem rather than duplicated across receipt workflow and ad hoc turn callbacks.
- FR-008: Gateway/server ingress response disposition semantics MUST be aligned so a successfully accepted server ingress is recognized by the gateway as completed and not retried as an unsupported disposition.

## Acceptance Criteria

- AC-001: Given a Telegram-originated run where the coordinator directly responds to the user's inbound message, the user receives the coordinator response in Telegram exactly once.
- AC-002: Given a Telegram-originated agent-team run where the coordinator delegates to a team member and later emits a coordinator response after the member reports back, the user receives that later coordinator response in Telegram without sending another Telegram message.
- AC-003: Given two or more eligible coordinator outputs emitted after the initial inbound Telegram message, Telegram receives each eligible output once and in the same order as the run/team output stream.
- AC-004: Given internal team-member messages that are not surfaced as eligible coordinator output, Telegram does not receive those internal-only messages.
- AC-005: Given a server restart while a bound external run is still recoverable/active, the delivery subsystem restores pending delivery records and does not duplicate already-published outputs.
- AC-006: Given the message gateway forwards an inbound message and the server responds with its current accepted-success disposition, the gateway marks the inbox record completed instead of retrying because of an unsupported disposition.
- AC-007: Automated or executable validation covers the asynchronous team-member-to-coordinator follow-up delivery path, not only direct synchronous inbound-reply paths or second-user-message paths.

## Constraints / Dependencies

- Must fit the current file-backed external-channel storage and gateway callback outbox architecture unless implementation discovers a stronger existing durable owner.
- Must preserve the existing provider outbound path through `ReplyCallbackService`/gateway callback outbox or a clearly renamed equivalent, so Telegram/Discord/WhatsApp/WeCom provider adapters are not reimplemented.
- Must respect current team binding semantics: team bindings target the coordinator/entry node by default unless `targetNodeName` is configured.
- Must not add compatibility-only dual outbound paths. The old receipt-owned outbound publish path should be decommissioned once the open-channel run delivery owner publishes all eligible outputs.

## Assumptions

- The user's observed external channel is Telegram through the managed `autobyteus-message-gateway` polling setup.
- The coordinator follow-up response appears as a normal coordinator/member run output event in the team run event stream.
- Existing `turnId`, `memberRunId`, and `teamRunId` identifiers are sufficient to build once-only delivery keys for coordinator/team output turns.
- A synthetic or turn-based `correlationMessageId` is acceptable for providers that only need route identity for outbound sends; if a provider requires the last inbound message id, the delivery record should retain the latest source external message id for that route.

## Risks / Open Questions

- OQ-001: What exact event shape identifies final user-facing assistant text across all supported runtimes for coordinator follow-up turns? Current receipt bridges parse `SEGMENT_*` and `TURN_COMPLETED`, but the open-channel owner may need a reusable turn collector rather than copy-paste logic.
- OQ-002: For providers beyond Telegram/Discord, does `correlationMessageId` need to remain the last inbound provider message id, or can it be a stable run/turn correlation id?
- OQ-003: How long should an external route-to-run link remain open when the run becomes idle but not terminated? Existing binding reuse persists cached run ids, but open-channel subscription lifecycle needs an explicit detach policy.
- OQ-004: If a binding is edited from one team/agent target to another while a run is still active, the delivery owner must stop publishing from the old target before starting the new link.

## Requirement-To-Use-Case Coverage

| Requirement | Covered Use Cases |
| --- | --- |
| FR-001 | UC-002, UC-003 |
| FR-002 | UC-002, UC-003 |
| FR-003 | UC-003 |
| FR-004 | UC-001, UC-002, UC-003 |
| FR-005 | UC-002, UC-003 |
| FR-006 | UC-001, UC-002, UC-004 |
| FR-007 | UC-001, UC-002, UC-003 |
| FR-008 | UC-004 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Preserve currently working direct reply behavior while moving ownership to open-channel delivery. |
| AC-002 | Prove the reported asynchronous coordinator follow-up bug is fixed. |
| AC-003 | Prove open-channel multi-message delivery rather than one-shot reply behavior. |
| AC-004 | Prove internal team coordination is not leaked externally. |
| AC-005 | Prove delivery idempotency and restoration for the new durable output-delivery owner. |
| AC-006 | Prove gateway/server ingress status contract is aligned. |
| AC-007 | Prevent regressions by validating the actual asynchronous path. |

## Approval Status

Approved by user on 2026-04-26 in chat: "I confirm that's this requirements. So you can proceed."
