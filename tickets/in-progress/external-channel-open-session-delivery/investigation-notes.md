# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Code investigation complete; requirements approved by user on 2026-04-26; design spec created and ready for architecture review.
- Investigation Goal: Determine why Telegram/external-channel delivery appears tied to inbound user-message reply windows and define requirements for open-channel delivery of coordinator outputs emitted after internal team-member handoffs.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The issue crosses message-gateway ingress/outbound contract, server external-channel ingress/receipt workflow, callback delivery, and agent-team runtime events. It is a subsystem ownership gap rather than a one-line handler bug.
- Scope Summary: Analyze and prepare requirements for external-channel delivery so eligible coordinator outputs from asynchronous agent-team flows reach Telegram without requiring another inbound Telegram message.
- Primary Questions To Resolve:
  - Which component owns external channel receipt/session state? Answer: `ChannelMessageReceiptService` owns per-inbound-message receipts; no current owner exists for open external route-to-run delivery.
  - Which component owns outbound Telegram response dispatch? Answer: server `ReplyCallbackService` enqueues `ExternalOutboundEnvelope` into the gateway callback outbox; gateway `OutboundSenderWorker` sends via provider adapters such as `TelegramBusinessAdapter`.
  - Where are coordinator/team-member messages represented, and how is user-facing visibility encoded? Answer: team runtime emits `TeamRunEventSourceType.AGENT` events wrapping member `AgentRunEvent`s. Current external delivery observes only the member/turn recorded on the inbound receipt. Team binding defaults to coordinator/entry node, but no open-channel output filter exists for later turns.
  - Is outbound delivery currently synchronous to inbound Telegram request handling or tied to a more durable run event stream? Answer: it is asynchronous but receipt-scoped. The durable unit is one inbound message receipt bound to one turn, not a subscription to the route/run event stream.

## Request Context

The user reports that when they send a message to a coordinator agent from Telegram, they receive the coordinator's immediate response. But when the coordinator sends work to another team member, the team member sends a message back to the coordinator, and the coordinator then responds, Telegram receives no further coordinator response. The user expects the external channel to behave like an open channel for the active conversation: once opened by a user, any eligible coordinator messages sent later should be delivered to Telegram, not only direct replies to messages the user actively sends.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-open-session-delivery`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-open-session-delivery/tickets/in-progress/external-channel-open-session-delivery`
- Current Branch: `codex/external-channel-open-session-delivery`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-open-session-delivery`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-04-26.
- Task Branch: `codex/external-channel-open-session-delivery`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Artifacts are repository-resident under `tickets/in-progress/external-channel-open-session-delivery` in the dedicated worktree. Requirements were approved by the user on 2026-04-26; design spec is available in this task folder.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-26 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v` | Resolve initial repository and branch context. | Current checkout was `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` on branch `personal`, tracking `origin/personal`; remote is `git@github.com-ryan:AutoByteus/autobyteus-workspace.git`. | No |
| 2026-04-26 | Command | `git symbolic-ref --short refs/remotes/origin/HEAD`; `git branch -a --list`; `git worktree list --porcelain` | Determine base branch and whether an exact task worktree already exists. | Remote default resolves to `origin/personal`; no exact `external-channel-open-session-delivery` branch existed. Several related historical branches exist, including `codex/external-channel-receipt-state-machine`, `codex/external-turn-reply-aggregation`, and `codex/remote-node-telegram-agent-delivery`. | No for requirements; design may compare if needed. |
| 2026-04-26 | Command | `git fetch origin --prune` | Refresh tracked remote refs before worktree creation. | Fetch completed successfully. | No |
| 2026-04-26 | Command | `git worktree add -b codex/external-channel-open-session-delivery /Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-open-session-delivery origin/personal` | Create dedicated task worktree/branch. | Worktree created at commit `81f6c823a16f54de77f426b1bc3a7be50e6c843d`, branch tracking `origin/personal`. | No |
| 2026-04-26 | Command | `rg -n "external channel|external-channel|ExternalChannel|telegram|Telegram|message gateway|MessageGateway|sendMessage|send_message|external.*channel|channel" ...` | Locate external-channel, Telegram, gateway, and team message files. | Main areas are `autobyteus-server-ts/src/external-channel`, `autobyteus-message-gateway/src`, `autobyteus-ts/src/external-channel`, and team runtime under `autobyteus-server-ts/src/agent-team-execution`. | No |
| 2026-04-26 | Code | `autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts` | Determine server ingress owner and receipt lifecycle. | `handleInboundMessage()` creates/claims an ingress receipt, dispatches to binding, records exactly one accepted dispatch (`agentRunId`, `teamRunId`, `turnId`), and registers that one receipt with `ReceiptWorkflowRuntime`. | Design should split ingress receipt ownership from open-channel output delivery ownership. |
| 2026-04-26 | Code | `autobyteus-server-ts/src/external-channel/runtime/channel-team-run-facade.ts` | Determine how external inbound messages are dispatched into team runs. | External inbound dispatch posts one message to the target/coordinator, captures the dispatched member turn, publishes the external user message to the live frontend stream, and returns one `ChannelRunDispatchResult`. | Later internal team messages do not pass through this facade. |
| 2026-04-26 | Code | `autobyteus-server-ts/src/external-channel/runtime/receipt-workflow-runtime.ts` | Determine outbound reply workflow owner. | Runtime processes active receipts only; states `TURN_BOUND/COLLECTING_REPLY/TURN_COMPLETED/REPLY_FINALIZED/PUBLISH_PENDING` ultimately publish one final reply and mark the receipt published. | Current owner cannot see turns that lack receipts. |
| 2026-04-26 | Code | `autobyteus-server-ts/src/external-channel/runtime/receipt-effect-runner.ts` | Determine how live output is observed. | Live observation starts only if a receipt already contains `agentRunId` and `turnId`; team observation uses `receipt.teamRunId`, `receipt.agentRunId`, and `receipt.turnId`. | Open-channel runtime needs to observe the run/team stream directly and create delivery records for eligible turns. |
| 2026-04-26 | Code | `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-reply-bridge.ts`; `channel-team-run-reply-bridge.ts`; `channel-reply-bridge-support.ts` | Determine reusable turn-observation capability. | Bridges can observe a specified turn and preserve a supplied source context. There is unit coverage for source-linked follow-up turns in the agent bridge, but no runtime owner invokes this for arbitrary later turns. | Design should reuse/extract turn text collection rather than duplicate parsing. |
| 2026-04-26 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-manager.ts`; `mixed-team-manager.ts`; `claude-team-manager.ts`; `autobyteus-team-run-backend.ts` | Determine internal team-member message path. | `deliverInterAgentMessage()` posts a new user-style message into the recipient member run and publishes an `INTER_AGENT_MESSAGE` event when accepted. This creates normal runtime output events for the recipient's response, but no external-channel source link. | Design must bind eligible coordinator recipient turns to the open external route. |
| 2026-04-26 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`; `agent-run-event-message-mapper.ts`; `team-live-message-publisher.ts` | Compare frontend live stream behavior. | Frontend WebSocket subscribes to the whole team run and converts all member agent events to server messages. This explains why internal UI can see later team events while external-channel callback delivery cannot. | Design can model external delivery as a run/team event subscriber with stricter output eligibility. |
| 2026-04-26 | Code | `autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts`; `runtime/gateway-callback-delivery-runtime.ts`; `runtime/gateway-callback-outbox-service.ts`; `autobyteus-message-gateway/src/http/routes/server-callback-route.ts`; `application/services/outbound-sender-worker.ts`; `infrastructure/adapters/telegram-business/telegram-business-adapter.ts` | Trace outbound provider delivery. | Server builds `ExternalOutboundEnvelope`, enqueues callback outbox, gateway accepts `/api/server-callback/v1/messages`, and provider adapter sends outbound message to peer. Telegram sends by `peerId`/`threadId`, not by inbound request window. | Existing outbound pipe can carry open-channel outputs if a server owner enqueues them. |
| 2026-04-26 | Code | `autobyteus-server-ts/src/external-channel/domain/models.ts`; `services/channel-message-receipt-service.ts`; `providers/file-channel-message-receipt-provider.ts`; `services/channel-binding-service.ts`; `providers/file-channel-binding-provider.ts` | Understand persisted route, receipt, and binding identifiers. | Binding stores route plus cached `agentRunId`/`teamRunId`. Message receipts key by external inbound message and can find source only by exact `agentRunId`/`turnId`. Binding service can verify route remains bound to target. | Need new delivery records keyed by route/run/turn; current receipts cannot represent no-new-inbound outputs cleanly. |
| 2026-04-26 | Doc | `autobyteus-web/docs/messaging.md` | Check user-facing promised behavior. | Checklist says a follow-up Telegram message reuses the expected runtime; it does not promise autonomous outbound follow-ups. Line 14 says team replies are emitted through coordinator/entry node only. | Docs must be updated after implementation. |
| 2026-04-26 | Code | `autobyteus-message-gateway/src/infrastructure/server-api/autobyteus-server-client.ts`; `autobyteus-server-ts/src/api/rest/channel-ingress-message-route.ts`; tests via `rg -n "ACCEPTED|ROUTED" ...` | Check gateway/server ingress contract. | Server returns `disposition: "ACCEPTED"`; gateway client only accepts `ROUTED | UNBOUND | DUPLICATE`. This is likely stale contract drift. | Include in requirements as adjacent fix/validation. |
| 2026-04-26 | Test | `autobyteus-server-ts/tests/integration/api/rest/channel-ingress.integration.test.ts` | Check existing behavioral coverage. | Tests cover direct inbound reply and multiple distinct inbound messages on same thread/run. They do not cover internal member-to-coordinator follow-up without a second inbound external message. | Add failing/positive coverage for reported path. |
| 2026-04-26 | Command | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/external-channel/runtime/channel-team-run-reply-bridge.test.ts tests/unit/external-channel/runtime/receipt-workflow-runtime.test.ts` | Attempt a focused test sanity check. | Command failed before running tests: `Command "vitest" not found`; no `node_modules` is installed in this worktree. | Downstream implementation/validation should install dependencies or use prepared workspace before running tests. |
| 2026-04-26 | Command | `ls -d node_modules autobyteus-server-ts/node_modules 2>/dev/null || true` | Verify why `vitest` was unavailable. | No root or server `node_modules` directory exists in the dedicated worktree. | Validation setup required later. |
| 2026-04-26 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/references/design-examples.md` | Consult event-driven runtime and team-run design examples before writing the spec. | Relevant guidance: make return/event spines and bounded local event-loop spines explicit; keep team-level and member-level identities distinct. | No |
| 2026-04-26 | Other | `/Users/normy/autobyteus_org/autobyteus-worktrees/external-channel-open-session-delivery/tickets/in-progress/external-channel-open-session-delivery/design-spec.md` | Record produced target design artifact. | Design introduces `ChannelRunOutputDeliveryRuntime` as the open route/run output owner and decommissions receipt-owned outbound reply workflow. | Architecture review needed |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Gateway forwards an `ExternalMessageEnvelope` to server route `/api/channel-ingress/v1/messages`, which calls `ChannelIngressService.handleInboundMessage()`.
- Current execution flow:
  1. Gateway Telegram adapter normalizes Telegram updates into `ExternalMessageEnvelope`s.
  2. Gateway inbound worker forwards the envelope to server channel ingress.
  3. Server `ChannelIngressService` locks by routing key, creates/claims a per-external-message receipt, resolves a `ChannelBinding`, dispatches to an agent or team run, captures one turn id, records one accepted dispatch on the receipt, and registers that receipt.
  4. `ReceiptWorkflowRuntime` loads active receipts, starts live observation for the bound `agentRunId`/`teamRunId`/`turnId`, collects reply text or recovers it after completion, and publishes one final reply through `ReplyCallbackService`.
  5. `ReplyCallbackService` enqueues an `ExternalOutboundEnvelope`; gateway callback delivery sends it to Telegram.
  6. If a team member later sends an internal message to the coordinator, team runtime posts a new message into the coordinator/member run and emits normal team events, but no external receipt or route-to-run delivery link observes this new turn for Telegram.
- Ownership or boundary observations:
  - `ChannelIngressService` owns inbound receipt and dispatch acceptance, but currently also triggers the reply workflow indirectly.
  - `ReceiptWorkflowRuntime` owns one-receipt-one-turn reply publication, not open-channel output delivery.
  - Team runtime owns inter-agent delivery and event emission, with no dependency on external-channel source state.
  - The frontend team WebSocket can see later team events because it subscribes to the full run; external-channel delivery does not.
- Current behavior summary: The architecture is one inbound external message → one accepted receipt → one observed turn → one outbound reply. The reported no-new-inbound coordinator follow-up is outside that spine, so it is dropped from external-channel delivery.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts` | Inbound external message handling, binding resolution, dispatch receipt registration. | Records exactly one accepted dispatch/turn per inbound external message and registers that receipt. | Keep ingress idempotency here, but do not make it the owner of all outbound messages. |
| `autobyteus-server-ts/src/external-channel/runtime/channel-team-run-facade.ts` | Dispatch external inbound message to a team run and capture target member turn. | Only invoked for external inbound messages. Later `send_message_to` deliveries bypass it. | Open-channel delivery cannot depend solely on this facade. |
| `autobyteus-server-ts/src/external-channel/runtime/receipt-workflow-runtime.ts` | Receipt-scoped state machine for observing/publishing a bound turn. | Active unit is the inbound receipt; no ability to discover later turns without receipts. | Decommission outbound publication from receipt workflow or narrow it to ingress audit. |
| `autobyteus-server-ts/src/external-channel/runtime/receipt-effect-runner.ts` | Side effects for observing a receipt-bound turn and publishing final reply. | Requires `receipt.agentRunId` and `receipt.turnId`. | Reusable turn observation should move behind a delivery owner that can create records from run events. |
| `autobyteus-server-ts/src/external-channel/runtime/channel-team-run-reply-bridge.ts` | Observe a specific team member/turn and collect final text. | It can observe a specific source-linked turn, but cannot discover turns by itself. | Useful internal mechanism for the new delivery runtime, not a governing owner. |
| `autobyteus-server-ts/src/agent-team-execution/backends/*/*team-manager.ts` | Team runtime member lifecycle, direct user message, inter-agent delivery. | `deliverInterAgentMessage()` posts into recipient member run and emits events; it does not know external source. | External-channel subsystem should subscribe/filter; team runtime should not call Telegram directly. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | Frontend team WebSocket subscription and event conversion. | Shows how to subscribe to all team events and map member events. | New external delivery can follow a similar subscription pattern with stricter eligibility and durable records. |
| `autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts` | Build/enqueue outbound callback envelopes and verify route still bound. | Already supports `publishAssistantReplyToSource()` with explicit source context. | Reuse this as transport enqueue boundary, but feed it from new run-output records. |
| `autobyteus-server-ts/src/external-channel/services/channel-binding-service.ts` | Resolve/verify route-to-target bindings. | Can verify a route is still bound to a dispatch target. | Use it to attach/detach open channel links and prevent stale binding leaks. |
| `autobyteus-message-gateway/src/infrastructure/server-api/autobyteus-server-client.ts` | Gateway client for server ingress. | Disposition enum is stale (`ROUTED` instead of server `ACCEPTED`). | Align contract in implementation/validation. |
| `autobyteus-web/docs/messaging.md` | User docs for managed messaging. | Current checklist only mentions follow-up user messages; no open-channel behavior. | Delivery docs must be updated after feature implementation. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-26 | Static trace | Code trace from gateway Telegram adapter through server ingress, receipt runtime, callback outbox, and team inter-agent delivery. | Trace proves no path creates an external delivery record for coordinator turns caused by internal `deliverInterAgentMessage()` after the first inbound receipt. | Root cause is architectural ownership gap: no open route/run delivery owner. |
| 2026-04-26 | Test attempt | `pnpm -C autobyteus-server-ts exec vitest run ...` | Failed because dependencies are not installed in this worktree. | Downstream validation must set up dependencies. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used. This is a local repository architecture issue.
- Version / tag / commit / freshness: Local branch based on `origin/personal` at `81f6c823a16f54de77f426b1bc3a7be50e6c843d` on 2026-04-26.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: A full runtime repro would require managed messaging gateway plus Telegram credentials, or a focused integration harness that simulates team events and gateway callback publishing. Existing integration harnesses can likely be extended.
- Required config, feature flags, env vars, or accounts: For real Telegram repro, managed gateway enabled with Telegram bot token/account and a team binding to a peer. For automated tests, mock callback outbox and team run events are enough.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation only.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. The user's mental model is correct for the desired product behavior: external messaging should be an open channel attached to a run/conversation, not a transient HTTP request/response pair.
2. The current product implementation is closer to a reliable per-inbound-message reply workflow. It is asynchronous and durable, but still scoped to the accepted inbound receipt's turn.
3. The missing case is not Telegram-specific. Telegram is simply the visible provider; the server would miss the same no-new-inbound follow-up for any provider using the same receipt-scoped reply workflow.
4. The team runtime already emits enough events to observe later coordinator outputs in principle; the frontend stream uses those events. The external-channel subsystem lacks a durable output observer and eligibility filter for bound route/run links.
5. The current receipt bridges contain useful parsing/collection logic but are currently shaped as exact-turn observers. A new owner should either reuse them behind a discovered-turn workflow or extract the common turn collector.
6. Gateway/server ingress disposition drift is adjacent technical debt and should be fixed with validation to avoid misleading retries.

## Constraints / Dependencies / Compatibility Facts

- Existing external-channel storage is file-backed under the server external-channel storage provider area.
- Existing binding rows already contain route identity and cached run ids; this is enough to restore candidate open links, but a separate output-delivery record is needed for once-only turn publication.
- Existing gateway callback outbox already provides provider delivery retry/idempotency after server enqueues an outbound envelope.
- No backward-compatibility dual outbound path should remain for in-scope output delivery. Receipt workflow should not continue publishing the same direct reply if a new open-channel delivery runtime publishes it.
- Team binding behavior must keep coordinator/entry-node visibility and avoid publishing every worker member output by default.

## Open Unknowns / Risks

- How to define the exact output eligibility predicate across Autobyteus, Codex, Claude, and mixed team backends without accidentally dropping legitimate coordinator outputs or leaking worker internals.
- Whether the current run-history/recovery services can recover final text for follow-up turns if live observation misses them, or whether a delivery record needs to retain enough buffered text itself.
- How long to retain active route/run subscriptions for idle but live runs.
- Message-gateway disposition correction is designed as a clean wire-contract update to server `ACCEPTED`; implementation should update gateway inbox completed status mapping accordingly.

## Notes For Architect Reviewer

Architecture-review package should evaluate whether the new `ChannelRunOutputDeliveryRuntime` cleanly owns open route/run output delivery, whether receipt workflow decommissioning is sufficiently explicit, and whether gateway/server disposition cleanup belongs in the same implementation slice. Key design spine: `External inbound route -> binding/run link -> run/team output observer -> delivery record -> callback outbox -> gateway provider`.
