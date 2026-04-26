# Design Spec

## Current-State Read

The current external-channel path is reliable but receipt-scoped. `ChannelIngressService.handleInboundMessage()` receives one `ExternalMessageEnvelope`, creates or reuses one `ChannelMessageReceipt`, resolves a `ChannelBinding`, dispatches the message into one agent/team turn, persists the accepted dispatch correlation, and registers that receipt with `ReceiptWorkflowRuntime`. `ReceiptWorkflowRuntime` then observes exactly the turn recorded on that receipt, finalizes exactly one reply text, and publishes exactly one `ExternalOutboundEnvelope` through `ReplyCallbackService` and the gateway callback outbox.

That model explains the reported Telegram gap. A later coordinator response caused by `send_message_to` is not a new external inbound message. The team runtime handles it through `TeamRun.deliverInterAgentMessage()` and emits normal team/member run events, but no external receipt is created and no external-channel owner is subscribed to the active team run as an open output channel. The web team stream can show the later events because it subscribes to the team run; external-channel delivery cannot because its governing unit is the inbound receipt.

Ownership problems in the current state:

- Inbound receipt state owns too much: it owns ingress idempotency and also acts as the outbound reply lifecycle trigger.
- No subsystem owns the open route-to-run output link for an external channel.
- `ChannelAgentRunReplyBridge` and `ChannelTeamRunReplyBridge` can observe an already-known turn, but they do not discover later eligible turns.
- Team runtime correctly owns inter-agent delivery and must not grow Telegram-specific behavior.
- `autobyteus-message-gateway` and server have a stale ingress disposition contract: server returns `ACCEPTED`, while the gateway client parses only `ROUTED | UNBOUND | DUPLICATE`.

The target design must preserve existing provider outbound delivery through the callback outbox, preserve inbound receipt idempotency/audit, and replace the one-receipt-one-reply owner with one open-channel run-output delivery owner.

## Intended Change

Introduce an external-channel run-output delivery owner, `ChannelRunOutputDeliveryRuntime`, that attaches an external route/binding to an active agent/team run and subscribes to the authoritative run/team event stream. It creates durable output-delivery records for eligible output turns, finalizes text in stream order, and publishes each eligible output exactly once through the existing gateway callback outbox.

Inbound receipts remain the authoritative owner for ingress idempotency and dispatch auditing only. The old receipt workflow runtime and exact-turn reply bridges are decommissioned as outbound delivery owners so direct replies and later follow-ups travel through the same route/run output delivery path.

Also align the gateway/server ingress disposition wire contract on `ACCEPTED | UNBOUND | DUPLICATE`.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.
- `Channel route`: `{ provider, transport, accountId, peerId, threadId }`.
- `Output link`: one active binding between a channel route and an agent run or team run.
- `Eligible output`: assistant/user-facing output from the bound standalone agent or from the bound team entry/coordinator member; internal-only worker events and inter-agent control messages are not eligible.
- `Output delivery record`: durable once-only delivery state keyed by binding/route + target run + member/run turn.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the receipt-owned outbound reply workflow from active startup and tests; do not leave a fallback path where both receipt workflow and run-output delivery can publish the same reply.
- Treat removal as first-class design work: the old exact-turn reply bridges and receipt workflow state machine are replaced by a run-output event collector plus output-delivery records.
- Decision rule: the design is invalid if it depends on compatibility wrappers, dual-path behavior, or legacy fallback branches kept only for old behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Gateway inbound external message | Active output link registered for target run | `ChannelIngressService` for ingress; `ChannelRunOutputDeliveryRuntime` for output link | Opens or refreshes the external route/run link when a Telegram user messages the bot. |
| DS-002 | Return-Event | Agent/team run output events | Gateway provider outbound message | `ChannelRunOutputDeliveryRuntime` | Core fix: all eligible run outputs, including no-new-inbound coordinator follow-ups, are delivered externally. |
| DS-003 | Primary End-to-End | Internal `send_message_to` delivery | Coordinator follow-up output delivered externally | `TeamRun` for inter-agent delivery; `ChannelRunOutputDeliveryRuntime` for external delivery | Represents the exact reported team-member-to-coordinator scenario. |
| DS-004 | Bounded Local | Run/team event | Output delivery record state transition | `ChannelRunOutputEventCollector` inside `ChannelRunOutputDeliveryRuntime` | Collects streamed text and turn completion without treating each inbound receipt as the owner. |
| DS-005 | Return-Event | Server ingress response | Gateway inbox completion state | `AutobyteusServerClient` / gateway inbox service | Fixes the accepted-success disposition contract drift. |

## Primary Execution Spine(s)

DS-001 inbound link attach:

`MessageGateway inbound worker -> Server ChannelIngressService -> ChannelBindingService -> ChannelRunFacade -> ChannelMessageReceiptService -> ChannelRunOutputDeliveryRuntime.attachAcceptedDispatch -> OutputLinkRegistry`

DS-002 output delivery:

`AgentRun / TeamRun event stream -> ChannelRunOutputDeliveryRuntime -> ChannelRunOutputEventCollector -> ChannelRunOutputDeliveryService -> ReplyCallbackService -> GatewayCallbackOutbox -> MessageGateway server-callback route -> Provider adapter -> Telegram`

DS-003 internal follow-up:

`Worker send_message_to -> TeamRun.deliverInterAgentMessage -> Coordinator member AgentRun -> TeamRun event stream -> ChannelRunOutputDeliveryRuntime eligibility filter -> GatewayCallbackOutbox -> Telegram`

DS-005 gateway ingress disposition:

`MessageGateway InboundForwarderWorker -> AutobyteusServerClient.forwardInbound -> Server channel ingress response(ACCEPTED) -> InboundInboxService.markCompleted(COMPLETED_ACCEPTED)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A Telegram message is normalized by the gateway and accepted by server ingress. The server records the inbound receipt and dispatches the content to the binding's run. After dispatch correlation is known, the output runtime attaches the external route to the run and records the latest correlation source for outbound replies. | Gateway inbound worker, `ChannelIngressService`, `ChannelBinding`, `ChannelRunFacade`, `ChannelRunOutputDeliveryRuntime` | `ChannelIngressService` governs ingress; `ChannelRunOutputDeliveryRuntime` governs output link registration. | Thread lock, receipt idempotency, binding lookup, run launch/restore. |
| DS-002 | Once a link exists, the output runtime subscribes to the target run/team event stream. It filters eligible output events, collects final text per turn, persists a delivery record, and enqueues one outbound envelope through the callback outbox. | `AgentRun` / `TeamRun`, `ChannelRunOutputDeliveryRuntime`, `ChannelRunOutputEventCollector`, `ChannelRunOutputDeliveryService`, `ReplyCallbackService`, gateway provider adapter | `ChannelRunOutputDeliveryRuntime` | Binding liveness check, callback outbox retry, provider chunking, delivery event recording. |
| DS-003 | A team member sends an internal message to the coordinator. Team runtime posts that message to the coordinator member run and emits normal team events. The output runtime sees the coordinator's subsequent assistant output because it is subscribed to the team run, determines it is eligible, and publishes it externally without another inbound Telegram message. | `TeamRun`, member `AgentRun`s, `ChannelRunOutputDeliveryRuntime` | `TeamRun` for team delivery; `ChannelRunOutputDeliveryRuntime` for external publishing | Inter-agent message event is ignored as internal-only; coordinator assistant text is collected. |
| DS-004 | Inside the output runtime, each relevant event advances a per-turn collector: turn start opens a candidate record, text segments accumulate, turn completion finalizes, and publish state advances durably. | `ChannelRunOutputEventCollector`, `ChannelRunOutputDeliveryService` | `ChannelRunOutputEventCollector` | Event parsing, text merge, final-text recovery, retry scheduling. |
| DS-005 | Gateway parses the server's current success disposition and marks the inbound inbox record completed. | `AutobyteusServerClient`, `InboundInboxService` | Message gateway inbound forwarding subsystem | Wire enum parsing and inbox status mapping. |

## Spine Actors / Main-Line Nodes

- `MessageGateway inbound worker`: forwards external provider messages to the server.
- `ChannelIngressService`: authoritative ingress owner for inbound receipts and dispatch acceptance.
- `ChannelBindingService`: authoritative binding owner for route-to-target configuration.
- `ChannelRunFacade`: dispatches inbound content to the configured agent/team run.
- `ChannelRunOutputDeliveryRuntime`: governing owner for open channel route-to-run output delivery.
- `ChannelRunOutputEventCollector`: bounded local owner for parsing/collecting output turns.
- `ChannelRunOutputDeliveryService`: durable output delivery record boundary.
- `ReplyCallbackService`: outbound callback enqueue boundary.
- `MessageGateway provider adapter`: provider-specific outbound sender.

## Ownership Map

| Main-Line Node | Owns |
| --- | --- |
| `ChannelIngressService` | Inbound envelope idempotency, route lock, binding resolution, dispatch claim, accepted dispatch audit. It must not own outbound assistant reply sequencing. |
| `ChannelBindingService` | Binding persistence, target/run cached ids, binding change notifications, route-to-target liveness checks. |
| `ChannelRunFacade` | Dispatching an inbound external message into the proper standalone agent or team run and returning authoritative dispatch correlation. |
| `ChannelRunOutputDeliveryRuntime` | Lifecycle of output links, run/team event subscriptions, binding/run reconciliation, event-to-delivery sequencing, retry scheduling. |
| `ChannelRunOutputEventCollector` | Per-turn streamed text accumulation and completion detection for eligible output events. |
| `ChannelRunOutputEligibilityPolicy` | Standalone-vs-team output eligibility, especially coordinator/entry-node filtering for team bindings. |
| `ChannelRunOutputDeliveryService` | Normalized durable CRUD/state transitions for output delivery records. |
| `ReplyCallbackService` | Building and enqueuing outbound callback envelopes; route still-bound validation before enqueue. |
| `MessageGateway outbound sender` | Provider adapter selection, retry/backoff, and provider API send. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ChannelRunFacade` | `ChannelAgentRunFacade` / `ChannelTeamRunFacade` and run services | Dispatch target switch between agent and team bindings. | Output delivery lifecycle or callback publication. |
| `startChannelRunOutputDeliveryRuntime()` singleton wrapper | `ChannelRunOutputDeliveryRuntime` | Server startup/shutdown convenience. | Delivery policy or output state transitions. |
| GraphQL external-channel setup resolver | `ChannelBindingService` | Transport/API boundary for setup UI. | Direct runtime subscription or stale binding cleanup. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `ReceiptWorkflowRuntime` active startup and singleton | Receipt workflow is the wrong outbound owner; it can publish only one receipt-bound turn. | `ChannelRunOutputDeliveryRuntime` | In This Change | Remove `startReceiptWorkflowRuntime()` / `stopReceiptWorkflowRuntime()` calls from `server-runtime.ts`. |
| `receipt-effect-runner.ts`, `receipt-workflow-reducer.ts`, `receipt-workflow-persistence.ts`, `receipt-workflow-runtime-contract.ts` | State machine exists only to publish receipt-bound replies. | Output delivery record state transitions in `ChannelRunOutputDeliveryService`. | In This Change | Delete or fully detach from build/tests. |
| `channel-agent-run-reply-bridge.ts` and `channel-team-run-reply-bridge.ts` as runtime owners | Exact-turn observers cannot discover later output turns and duplicate new collector responsibility. | `channel-run-output-event-collector.ts` plus shared event parser. | In This Change | Reuse parsing logic by moving it into the new collector/parser file, then delete bridge tests. |
| Receipt fields/methods dedicated to outbound workflow (`workflowState`, `replyTextFinal`, workflow progress, `markReplyPublished`, `getSourceByAgentRunTurn`, list by workflow states) | Output delivery records now own outbound state. | `ChannelRunOutputDeliveryRecord` and provider methods. | In This Change where touched by active code; if type churn is large, remove unused methods/files before handoff. | Do not leave active code depending on these fields. |
| Gateway wire disposition `ROUTED` for successful server ingress | Server's current success state is `ACCEPTED`; gateway parser is stale. | `ACCEPTED` wire disposition and `COMPLETED_ACCEPTED` inbox status. | In This Change | Update tests and docs; no dual enum fallback. |

## Return Or Event Spine(s) (If Applicable)

DS-002 is the main return/event spine:

`Agent/team run output events -> ChannelRunOutputDeliveryRuntime -> durable output delivery record -> ReplyCallbackService -> gateway callback outbox -> message gateway outbound worker -> provider adapter -> external user`

Important direction rule: events flow outward from run/team runtime to the external-channel subsystem. The agent-team runtime must not import or call Telegram/gateway code.

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `ChannelRunOutputDeliveryRuntime`

`Subscribed run event -> parse event -> evaluate route/link eligibility -> open/update turn collector -> finalize output delivery record -> enqueue publish -> mark published/unbound/retry`

Why it matters: the bug is a missing event observer. The local event-processing loop must be explicit so implementers do not recreate another one-shot receipt observer.

Parent owner: message gateway inbound worker

`Server ingress response -> parse accepted disposition -> map inbox completed status -> persist inbox record`

Why it matters: stale disposition parsing can cause accepted inbound messages to be retried by the gateway.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Thread lock | DS-001 | `ChannelIngressService` | Serialize inbound dispatch by route. | Prevent duplicate dispatch races. | Would obscure output delivery if mixed into runtime. |
| Binding change notification | DS-001, DS-002 | `ChannelBindingService` / `ChannelRunOutputDeliveryRuntime` | Notify output runtime when bindings are upserted/deleted so links attach/detach. | Prevent stale subscriptions after setup changes. | GraphQL callers would otherwise call both binding service and runtime, bypassing ownership. |
| Output eligibility policy | DS-002, DS-003 | `ChannelRunOutputDeliveryRuntime` | Decide whether an event is externally deliverable. | Prevent worker/internal message leaks. | If placed in team runtime, team code becomes provider-aware. |
| Turn text collector | DS-004 | `ChannelRunOutputDeliveryRuntime` | Accumulate segment text and completion per turn. | Streams are incremental and provider-independent. | If mixed with provider sender, callback delivery would own runtime parsing. |
| Output delivery provider | DS-002 | `ChannelRunOutputDeliveryService` | Durable once-only record persistence. | Needed for retries/restart/idempotency. | If stored as synthetic receipts, ingress and output semantics blur. |
| Callback outbox | DS-002 | `ReplyCallbackService` / gateway callback runtime | Durable server-to-gateway outbound enqueue. | Existing retry path to gateway. | If bypassed, providers duplicate send/retry code. |
| Delivery events | DS-002 | `ReplyCallbackService` / gateway delivery event route | Record pending/sent/failed provider delivery. | Preserve existing observability. | If main runtime owns provider status, output delivery becomes transport-specific. |
| Gateway disposition mapping | DS-005 | `AutobyteusServerClient` / `InboundInboxService` | Convert server accepted result to completed inbox status. | Avoid unnecessary retries. | If server route changes to appease old gateway enum, contract remains ambiguous. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Inbound message idempotency | `ChannelMessageReceiptService` | Reuse / narrow | It already owns per-external-message receipts. | N/A |
| Open route-to-run output delivery | None | Create New | No current owner subscribes to run/team output events for external routes. | Receipt workflow is receipt-bound; frontend stream is web-transport-specific. |
| Provider outbound send/retry | `ReplyCallbackService`, gateway callback outbox, message gateway outbound worker | Reuse / extend method shape | Existing provider adapters and retry model are correct. | N/A |
| Team event subscription | `TeamRun.subscribeToEvents` and `AgentRun.subscribeToEvents` | Reuse | Authoritative run event stream already exists. | N/A |
| Event text parsing | `channel-reply-bridge-support.ts` parsing functions | Extend/extract | Current parsing handles segment text and turn ids. | Exact-turn bridge classes are wrong owner; parsing logic should move to collector/parser. |
| Binding liveness | `ChannelBindingService.isRouteBoundToTarget` | Reuse / extend | Prevent stale binding leaks before enqueue. | N/A |
| Gateway ingress queue | `InboundForwarderWorker`, `InboundInboxService` | Extend | Needs accepted disposition contract update. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server external-channel ingress | Inbound receipts, route locks, dispatch audit | DS-001 | `ChannelIngressService` | Reuse / narrow | Remove outbound reply workflow trigger. |
| Server external-channel output delivery | Active route/run links, output event subscriptions, output records, publish scheduling | DS-002, DS-003, DS-004 | `ChannelRunOutputDeliveryRuntime` | Create New | New owner for open-channel behavior. |
| Server external-channel callback outbound | Build outbound envelopes and enqueue gateway callback outbox | DS-002 | `ReplyCallbackService` | Reuse / extend | Add route/run-output method with route-inclusive idempotency. |
| Agent/team runtime | Run/team execution, inter-agent delivery, event emission | DS-002, DS-003 | `AgentRun`, `TeamRun` | Reuse | No Telegram-specific dependency. |
| Message gateway inbound | Provider inbound normalization and server forward state | DS-001, DS-005 | `InboundForwarderWorker` | Extend | Update disposition enum. |
| Message gateway outbound | Provider outbound send/retry | DS-002 | `OutboundSenderWorker` | Reuse | No change except tests may validate output from new server path. |
| Documentation | Managed messaging behavior | All | Delivery engineer later | Extend | Update after implementation. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/external-channel/domain/models.ts` | External-channel domain | Shared domain types | Add route context, output delivery record/status, output target types; remove old receipt workflow-only types. | Existing domain model file already holds external-channel domain shapes. | Yes |
| `src/external-channel/providers/channel-run-output-delivery-provider.ts` | Output delivery persistence | Provider interface | Storage contract for output delivery records. | Provider contracts live under `providers/`. | Yes |
| `src/external-channel/providers/file-channel-run-output-delivery-provider.ts` | Output delivery persistence | File provider | File-backed implementation under external-channel storage. | Mirrors existing binding/receipt providers. | Yes |
| `src/external-channel/services/channel-run-output-delivery-service.ts` | Output delivery persistence boundary | Service | Normalize provider inputs and expose state transitions. | Keeps runtime from writing provider rows directly. | Yes |
| `src/external-channel/runtime/channel-run-output-delivery-runtime.ts` | Output delivery runtime | Governing owner | Link lifecycle, subscriptions, event processing, retry scheduling. | Main owner deserves one file. | Yes |
| `src/external-channel/runtime/channel-run-output-event-collector.ts` | Output delivery runtime | Bounded local owner | Parse run/team events, merge text, finalize turns. | Collector is cohesive and testable. | Yes |
| `src/external-channel/runtime/channel-run-output-eligibility.ts` | Output delivery runtime | Policy | Standalone/team output eligibility and coordinator filter. | Prevents policy from spreading through runtime. | Yes |
| `src/external-channel/runtime/channel-run-output-link-registry.ts` | Output delivery runtime | Internal mechanism | In-memory link/subscription tracking by binding/run. | Keeps lifecycle map separate from event policy. | Yes |
| `src/external-channel/runtime/channel-run-output-runtime-singleton.ts` | Output delivery runtime | Thin startup wrapper | Start/stop singleton. | Mirrors current runtime singleton pattern. | No |
| `src/external-channel/runtime/channel-output-event-parser.ts` | Output delivery runtime | Shared parser | Extract turn id/text/event type from direct and team events. | Replaces duplicated bridge support parsing. | Yes |
| `src/external-channel/services/reply-callback-service.ts` | Callback outbound | Outbound enqueue boundary | Add/replace method for route-based run output publishing. | Existing service owns callback envelopes. | Yes |
| `src/external-channel/services/channel-binding-service.ts` | Binding service | Binding boundary | Emit binding lifecycle events after upsert/delete. | Binding changes should be published by authoritative binding owner. | Yes |
| `src/external-channel/services/channel-binding-lifecycle-events.ts` | Binding service | Off-spine event bus | Lightweight in-process event bus for binding changes. | Avoids API callers reaching into runtime. | Yes |
| `autobyteus-message-gateway/src/infrastructure/server-api/autobyteus-server-client.ts` | Gateway inbound | Server client | Parse `ACCEPTED` disposition. | Existing wire client. | No |
| `autobyteus-message-gateway/src/domain/models/inbox-store.ts` / `inbound-inbox-service.ts` | Gateway inbound | Inbox model/service | Rename accepted completed status. | Keep inbox state aligned with wire contract. | No |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Channel route identity | `domain/models.ts` as `ChannelSourceRoute` / `ChannelOutputRoute` | External-channel domain | Used by binding, receipts, output records, callback publishing. | Yes | Yes | A generic untyped id bag. |
| Output target identity | `domain/models.ts` as explicit `ChannelRunOutputTarget` | External-channel domain | Need standalone agent and team-member identities without ambiguous run id. | Yes | Yes | One optional-field kitchen-sink with unclear subject. |
| Run/team event parsing | `runtime/channel-output-event-parser.ts` | Output delivery runtime | Collector and tests need consistent parsing. | Yes | Yes | A general event mapper for frontend/server messages. |
| Callback idempotency key builder | `runtime/channel-run-output-delivery-key.ts` or in output service | Output delivery runtime | Must include route/binding + run + turn consistently. | Yes | Yes | Old `agentRunId:turnId` key that dedupes different routes. |
| Text merge/finalization | `runtime/channel-run-output-event-collector.ts` | Output delivery runtime | Direct and team events share turn collection behavior. | Yes | Yes | Provider-specific formatting. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ChannelOutputRoute` | Yes | Yes | Low | Keep only provider/transport/account/peer/thread plus optional binding id outside the route identity. |
| `ChannelRunOutputTarget` | Yes | Yes | Low | Use a discriminated union: standalone agent target vs team member target. |
| `ChannelRunOutputDeliveryRecord` | Yes | Yes | Medium | Do not store both `source` receipt and route as competing identities; store route + `correlationMessageId` separately. |
| `ChannelMessageReceipt` | Yes after cleanup | Yes | Medium | Remove outbound workflow fields from active type; keep only ingress/dispatch facts. |
| Gateway ingress disposition | Yes | Yes | Low | Use `ACCEPTED`, `UNBOUND`, `DUPLICATE` as server wire values. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/external-channel/domain/models.ts` | External-channel domain | Domain model owner | Route, binding, receipt, output-delivery, delivery-event types. | Existing central domain model file; keep semantically tight. | Yes |
| `autobyteus-server-ts/src/external-channel/providers/channel-run-output-delivery-provider.ts` | Output delivery persistence | Provider contract | Interface for output delivery storage. | Mirrors existing provider contract pattern. | Yes |
| `autobyteus-server-ts/src/external-channel/providers/file-channel-run-output-delivery-provider.ts` | Output delivery persistence | File adapter | JSON file-backed output delivery records. | Consistent with file binding/receipt providers. | Yes |
| `autobyteus-server-ts/src/external-channel/providers/file-channel-run-output-delivery-row.ts` | Output delivery persistence | File row mapper | Storage row parsing/mapping for output delivery. | Keeps row parsing out of provider logic if provider becomes large. | Yes |
| `autobyteus-server-ts/src/external-channel/providers/provider-proxy-set.ts` | External-channel provider set | Provider composition | Add output delivery provider to the provider set. | Existing provider composition boundary. | Yes |
| `autobyteus-server-ts/src/external-channel/services/channel-run-output-delivery-service.ts` | Output delivery persistence | Service boundary | Normalize create/update/list operations and enforce unique delivery key semantics. | Runtime should not own provider normalization. | Yes |
| `autobyteus-server-ts/src/external-channel/services/channel-binding-lifecycle-events.ts` | Binding service | Event bus | In-process binding upsert/delete notifications. | Keeps setup callers from calling runtime directly. | Yes |
| `autobyteus-server-ts/src/external-channel/services/channel-binding-service.ts` | Binding service | Binding boundary | Publish lifecycle events after successful upsert/delete. | Binding service owns binding changes. | Yes |
| `autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts` | Ingress | Ingress boundary | Record accepted dispatch and attach output delivery runtime; stop registering receipt workflow. | Existing ingress owner. | Yes |
| `autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts` | Callback outbound | Callback boundary | Replace turn-source lookup method with route-based output publish method and route-inclusive idempotency. | Existing outbound callback envelope owner. | Yes |
| `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-delivery-runtime.ts` | Output delivery runtime | Governing owner | Start/stop/reconcile links, subscribe to runs, process events, schedule retries. | One owner for open-channel output lifecycle. | Yes |
| `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-link-registry.ts` | Output delivery runtime | Internal lifecycle map | Track binding/run subscriptions and latest correlation source. | Keeps maps/subscription cleanup isolated. | Yes |
| `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-eligibility.ts` | Output delivery runtime | Eligibility policy | Determine direct/team event eligibility and coordinator filter. | High-risk leakage policy needs isolated tests. | Yes |
| `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-event-collector.ts` | Output delivery runtime | Bounded local collector | Accumulate/finalize turn text from events. | Cohesive stream-processing concern. | Yes |
| `autobyteus-server-ts/src/external-channel/runtime/channel-output-event-parser.ts` | Output delivery runtime | Parser | Parse direct/team runtime events into normalized output event candidates. | Reusable by collector tests. | Yes |
| `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-runtime-singleton.ts` | Output delivery runtime | Thin wrapper | Singleton start/stop. | Server startup pattern. | No |
| `autobyteus-server-ts/src/server-runtime.ts` | Server startup | Startup owner | Start/stop output delivery runtime; stop starting receipt workflow runtime. | Existing runtime startup file. | No |
| `autobyteus-message-gateway/src/infrastructure/server-api/autobyteus-server-client.ts` | Gateway inbound | Server client | Parse accepted disposition. | Existing client owner. | No |
| `autobyteus-message-gateway/src/domain/models/inbox-store.ts` and `src/application/services/inbound-inbox-service.ts` | Gateway inbound | Inbox state owner | Use accepted completed status mapping. | Existing inbox owner. | No |
| `autobyteus-web/docs/messaging.md` | Docs | Messaging docs | Describe open-channel follow-up behavior after implementation. | Existing docs. | No |

## Ownership Boundaries

- `ChannelIngressService` is the only server boundary that handles inbound external messages. It may record that a dispatch was accepted and ask the output runtime to attach the accepted dispatch. It must not collect assistant text or enqueue callbacks.
- `ChannelRunOutputDeliveryRuntime` is the authoritative boundary for external output delivery. All outbound user-facing run output must pass through it before callback enqueue.
- `TeamRun` remains the authoritative team orchestration boundary. It emits events; it does not know external-channel route state.
- `ReplyCallbackService` remains the authoritative callback-envelope/outbox boundary. The output runtime must not write gateway callback outbox records directly.
- Message gateway provider adapters remain provider transport boundaries. They do not decide run output eligibility.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ChannelRunOutputDeliveryRuntime` | Link registry, subscriptions, eligibility policy, event collector, output delivery service | `ChannelIngressService`, binding lifecycle event handler, server startup | `ChannelIngressService -> ReplyCallbackService` for assistant replies; `TeamRun -> ReplyCallbackService` | Add explicit attach/reconcile methods on the runtime. |
| `ChannelBindingService` | Binding provider and lifecycle event emission | GraphQL setup resolver, ingress service, callback validation | GraphQL resolver writing binding provider then calling output runtime manually | Add binding lifecycle notifications inside binding service. |
| `ReplyCallbackService` | Callback envelope construction, route still-bound validation, callback outbox enqueue, delivery event pending record | Output delivery runtime | Output runtime writing `GatewayCallbackOutboxService` directly | Add route-based publish method. |
| `TeamRun` | Inter-agent delivery and member event multiplexing | WebSocket handler, external-channel output runtime | External-channel runtime reaching into member run internals to route messages | Use `TeamRun.subscribeToEvents()` and runtime context/config accessors. |
| `AutobyteusServerClient` | Server ingress wire response parsing | Gateway inbound worker | Inbound worker parsing raw server JSON itself | Update the client contract. |

## Dependency Rules

Allowed:

- `ChannelIngressService` may depend on `ChannelRunOutputDeliveryRuntime` as the output-delivery boundary.
- `ChannelRunOutputDeliveryRuntime` may depend on `AgentRunService`, `TeamRunService`, `ChannelBindingService`, `ChannelRunOutputDeliveryService`, and `ReplyCallbackService`.
- `ChannelRunOutputDeliveryRuntime` may subscribe to `AgentRun`/`TeamRun` public event APIs.
- `ReplyCallbackService` may depend on `ChannelBindingService` for route still-bound validation and on gateway callback outbox service.
- Gateway inbound worker may depend on `AutobyteusServerClient`, not server route internals.

Forbidden:

- Team runtime must not depend on external-channel runtime, Telegram, or gateway callback services.
- Provider adapters must not inspect team member/coordinator semantics.
- Receipt service/provider must not publish callbacks or own output delivery state.
- No code path may publish assistant replies through both receipt workflow and output delivery runtime.
- Do not create synthetic inbound receipts for follow-up outputs. Follow-up outputs are run-output delivery records, not inbound messages.
- Do not use a generic `runId` field whose meaning may be standalone agent run, team run, or member run without a discriminator.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `ChannelRunOutputDeliveryRuntime.attachAcceptedDispatch(input)` | Output link | Attach/refresh route-to-run output delivery after accepted external inbound dispatch. | `{ binding, route, latestCorrelationMessageId, target: ChannelRunOutputTarget }` | Called after ingress dispatch is accepted. |
| `ChannelRunOutputDeliveryRuntime.reconcileBinding(binding)` | Output link | Attach/detach output link after binding upsert. | Full `ChannelBinding` | Invoked via binding lifecycle events. |
| `ChannelRunOutputDeliveryRuntime.detachBinding(bindingId)` | Output link | Stop subscription for deleted/changed binding. | `bindingId` | No provider details. |
| `ChannelRunOutputDeliveryService.upsertObservedTurn(input)` | Output delivery record | Create or load once-only record for an eligible turn. | `deliveryKey + route + target + turnId` | Unique key includes binding/route and target/turn. |
| `ChannelRunOutputDeliveryService.markReplyFinalized(input)` | Output delivery record | Store final text. | `deliveryKey + replyText` | No provider send. |
| `ReplyCallbackService.publishRunOutputReply(input)` | Outbound callback | Build/enqueue outbound envelope for one output record. | `route + target + turnId + callbackIdempotencyKey + replyText + correlationMessageId` | Replaces source-by-turn lookup for external output. |
| `ChannelBindingService.isRouteBoundToTarget(route, target)` | Binding | Confirm route still points to target before outbound enqueue. | Explicit route + discriminated target | Avoid stale binding leaks. |
| `AutobyteusServerClient.forwardInbound(envelope)` | Gateway server client | Forward inbound envelope and parse accepted disposition. | `ExternalMessageEnvelope` | Returns `ACCEPTED | UNBOUND | DUPLICATE`. |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- Split boundaries by subject or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `attachAcceptedDispatch` | Yes | Yes | Low | Use discriminated output target. |
| `upsertObservedTurn` | Yes | Yes | Low | Unique key includes binding/route + run/member + turn. |
| `publishRunOutputReply` | Yes | Yes | Low | Do not accept only `agentRunId + turnId`. |
| `isRouteBoundToTarget` | Yes | Medium currently | Medium | Extend `ChannelDispatchTarget` to a tighter output target or add target-type discriminator. |
| `forwardInbound` | Yes | Yes | Low | Align disposition enum. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Open external output owner | `ChannelRunOutputDeliveryRuntime` | Yes | Low | Use this name instead of vague `Bridge` or `Manager`. |
| Output durable state | `ChannelRunOutputDeliveryRecord` | Yes | Low | Do not call it a receipt. |
| Output route/run link | `ChannelRunOutputLink` | Yes | Low | Keep route/run link distinct from binding row. |
| Eligibility policy | `ChannelRunOutputEligibilityPolicy` | Yes | Low | Name by policy concern, not helper. |
| Event collector | `ChannelRunOutputEventCollector` | Yes | Low | Collector owns turn text accumulation only. |
| Old receipt workflow | `ReceiptWorkflowRuntime` | No for target behavior | High | Decommission as outbound owner. |

## Applied Patterns (If Any)

- Runtime / event loop: `ChannelRunOutputDeliveryRuntime` owns a bounded local event-processing loop for subscribed run/team events.
- State machine: `ChannelRunOutputDeliveryService` advances durable delivery records through explicit statuses such as `OBSERVING`, `REPLY_FINALIZED`, `PUBLISH_PENDING`, `PUBLISHED`, `UNBOUND`, `FAILED`.
- Adapter: message gateway provider adapters remain external provider adapters; no new provider adapter is needed.
- Repository/provider: `ChannelRunOutputDeliveryProvider` is the persistence boundary for output delivery records.
- Policy: `ChannelRunOutputEligibilityPolicy` is an explicit policy object for team coordinator filtering.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/external-channel/runtime/` | Folder | External-channel runtime | Host output delivery runtime and its internal event loop concerns. | Existing external-channel runtime location. | Provider HTTP clients. |
| `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-delivery-runtime.ts` | File | `ChannelRunOutputDeliveryRuntime` | Governing runtime owner for open-channel output delivery. | Runtime concern, not service CRUD. | Provider send code or binding storage implementation. |
| `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-link-registry.ts` | File | Output runtime internal mechanism | In-memory link/subscription registry and cleanup. | Runtime internal state. | Eligibility policy. |
| `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-eligibility.ts` | File | Eligibility policy | Determine externally eligible outputs. | Runtime policy concern. | Text accumulation or provider enqueue. |
| `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-event-collector.ts` | File | Event collector | Merge text and finalize turns. | Runtime bounded local flow. | Binding lookup. |
| `autobyteus-server-ts/src/external-channel/runtime/channel-output-event-parser.ts` | File | Event parser | Normalize direct/team agent run events. | Reusable runtime parser. | Frontend message mapping. |
| `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-runtime-singleton.ts` | File | Thin startup wrapper | Start/stop singleton. | Matches current runtime pattern. | Runtime policy. |
| `autobyteus-server-ts/src/external-channel/services/channel-run-output-delivery-service.ts` | File | Output delivery service | Provider normalization and state transitions. | Services own domain-facing provider boundaries. | Event subscription. |
| `autobyteus-server-ts/src/external-channel/providers/channel-run-output-delivery-provider.ts` | File | Output provider contract | Storage interface. | Provider contracts folder. | Runtime logic. |
| `autobyteus-server-ts/src/external-channel/providers/file-channel-run-output-delivery-provider.ts` | File | File provider | JSON persistence. | Provider implementation folder. | Delivery policy. |
| `autobyteus-server-ts/src/external-channel/services/channel-binding-lifecycle-events.ts` | File | Binding lifecycle | In-process observer registry. | Service-layer off-spine concern. | Output delivery logic. |
| `autobyteus-message-gateway/src/infrastructure/server-api/autobyteus-server-client.ts` | File | Gateway server client | Accepted disposition parser. | Existing infrastructure server client. | Inbox persistence. |
| `autobyteus-message-gateway/src/application/services/inbound-inbox-service.ts` | File | Gateway inbox service | Map accepted disposition to completed status. | Existing inbox owner. | Server HTTP fetch. |

Rules:
- If the design has meaningful structural depth, usually reflect it in folders rather than flattening everything into one mixed directory.
- Do not place transport entrypoints, main-line domain/control nodes, persistence, adapters, and unrelated off-spine concerns in one flat folder when that hides ownership or structural depth.
- A compact layout is acceptable when it remains easy to read for the scope. If you keep it flatter, state why that is the clearer tradeoff.
- Folder boundaries should make ownership and structural depth easier to read, not hide them.
- Shared-layer, feature-oriented, runtime-oriented, and hybrid projections can all be valid when they make the intended ownership and flow easier to understand.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `external-channel/runtime` | Main-Line Domain-Control + bounded local runtime concerns | Yes | Low | Existing folder for runtime behaviors; split files by owner/policy/collector. |
| `external-channel/services` | Domain-facing service boundaries | Yes | Low | Output delivery service and binding lifecycle events are service-level concerns. |
| `external-channel/providers` | Persistence-Provider | Yes | Low | File provider pattern already established. |
| `message-gateway/src/infrastructure/server-api` | Transport/infrastructure client | Yes | Low | Server response parsing belongs in gateway server client. |
| `message-gateway/src/application/services` | Application service | Yes | Low | Inbox disposition mapping belongs in inbox service. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Open output delivery | `TeamRun event -> ChannelRunOutputDeliveryRuntime -> OutputDeliveryRecord -> ReplyCallbackService -> Gateway` | `TeamRun event -> ReplyCallbackService` | Keeps external-channel delivery authority out of team runtime. |
| Follow-up coordinator filter | `if team event memberRunId === outputLink.entryMemberRunId and event is assistant text/turn completion => eligible` | `deliver every TeamRunEventSourceType.AGENT event` | Prevents leaking worker/internal messages. |
| Once-only key | `external-output:${bindingId}:${teamRunId}:${memberRunId}:${turnId}` | `external-reply:${agentRunId}:${turnId}` | Old key dedupes across different external routes bound to same run. |
| Follow-up output model | `ChannelRunOutputDeliveryRecord` | Synthetic `ChannelMessageReceipt` with fake `externalMessageId` | Follow-up output is not inbound ingress. |
| Gateway disposition | Server wire `ACCEPTED`; gateway inbox `COMPLETED_ACCEPTED` | Server sends `ACCEPTED`, gateway accepts old `ROUTED` only | Removes stale wire contract ambiguity. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep receipt workflow for direct replies and add output runtime only for follow-ups | Minimizes direct-reply churn. | Rejected | Output runtime publishes both initial direct replies and later follow-ups; receipt workflow outbound path removed. |
| Create synthetic inbound receipts for coordinator follow-ups | Would reuse existing receipt workflow. | Rejected | Follow-ups use output delivery records keyed by route/run/turn. |
| Gateway accepts both `ROUTED` and `ACCEPTED` as success forever | Avoids changing old tests/status names. | Rejected | Wire contract becomes `ACCEPTED`; gateway status mapping updated. |
| Deliver all member outputs and rely on coordinator to avoid secrets | Fastest implementation. | Rejected | Eligibility policy restricts team delivery to entry/coordinator member output only. |
| Let GraphQL setup resolver manually call output runtime after binding changes | Avoids adding binding lifecycle event. | Rejected | Binding service emits lifecycle events so callers use one authoritative boundary. |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

- Transport layer: REST channel ingress, gateway server callback route, message gateway provider adapters.
- External-channel application/domain layer: ingress service, binding service, output delivery runtime, output delivery service, callback service.
- Runtime layer: agent/team run event streams.
- Persistence/provider layer: file-backed binding, receipt, output-delivery, delivery-event, and callback outbox providers.

Layering is explanatory only. The authoritative boundaries are the owners listed above.

## Migration / Refactor Sequence

1. Add the output delivery domain types, provider interface, file provider, service, and provider-proxy wiring.
2. Extract event parsing/text merge logic from `channel-reply-bridge-support.ts` into `channel-output-event-parser.ts` / `channel-run-output-event-collector.ts`.
3. Implement `ChannelRunOutputEligibilityPolicy` for standalone agent and team coordinator/entry-member filtering.
4. Implement `ChannelRunOutputDeliveryRuntime` with:
   - startup reconciliation from bindings with cached run ids,
   - `attachAcceptedDispatch()` for ingress,
   - binding lifecycle reconciliation,
   - run/team subscription cleanup,
   - output record creation/finalization/publish retry.
5. Extend `ReplyCallbackService` with route-based `publishRunOutputReply()` and route-inclusive callback idempotency keys; remove active use of `publishAssistantReplyByTurn()` and receipt-source lookup.
6. Modify `ChannelIngressService` to record accepted receipt as audit and attach the output runtime instead of registering the receipt workflow runtime.
7. Remove receipt workflow startup/shutdown and decommission receipt workflow files/tests. Ensure no active outbound path remains in receipt workflow.
8. Update message gateway ingress disposition contract to `ACCEPTED` and inbox completion status mapping.
9. Add/update unit tests for eligibility, collector, output delivery service, output runtime, callback idempotency, and gateway disposition parsing.
10. Add integration coverage for the reported no-new-inbound team follow-up path and preserve direct reply/multiple-output ordering tests.
11. Update docs (`autobyteus-web/docs/messaging.md`) to state that bound external channels receive eligible coordinator/entry-node outputs while the run link is active.
12. Run typecheck and focused tests after installing dependencies in the worktree or using a prepared dependency cache.

## Key Tradeoffs

- Creating a new output delivery record model is more code than reusing receipts, but it preserves correct domain meaning and prevents synthetic ingress pollution.
- Subscribing to run/team streams means the runtime must manage lifecycle and cleanup, but this is exactly the missing open-channel ownership.
- Route-inclusive idempotency keys are longer, but they correctly support multiple external routes attached to the same run.
- Binding lifecycle notifications add one small in-process event concern, but they prevent setup/API callers from depending on both binding storage and runtime internals.

## Risks

- Runtime event shapes differ across Autobyteus, Codex, Claude, and mixed team backends. Mitigation: central parser tests with representative direct/team events.
- Coordinator identity on restored team runs may be hard to resolve if metadata is incomplete. Mitigation: store entry member identity in output link after first accepted dispatch and derive from team config/metadata on restore.
- If output text recovery from history is incomplete, live collector must retain final text in the output record before publish. Mitigation: collect streamed `SEGMENT_CONTENT`/`SEGMENT_END` text and only use recovery as fallback.
- Binding edits during active output may race with publication. Mitigation: `ReplyCallbackService.publishRunOutputReply()` checks route still bound immediately before enqueue.
- No dependencies are installed in the dedicated worktree yet; validation setup must occur before tests can run.

## Guidance For Implementation

- Keep the first implementation centered on the reported path: a team binding to coordinator/entry node and a worker-to-coordinator internal handoff that triggers a later coordinator output.
- Do not modify team runtime to know about Telegram. Use public `TeamRun.subscribeToEvents()`.
- Do not leave `ReceiptWorkflowRuntime` started. If direct replies duplicate in tests, the old path was not fully removed.
- Build output delivery idempotency from binding/route + target run/member + turn id, not from `agentRunId + turnId` alone.
- For team eligibility, ignore `AgentRunEventType.INTER_AGENT_MESSAGE` and tool/status events as outbound content. Only assistant text segments/completed turns for the entry/coordinator member can produce external messages.
- Prefer route-based callback publishing over source-by-turn lookup; later coordinator turns do not have a new external source receipt.
- Update the gateway/server disposition tests early so gateway inbound retries do not obscure output-delivery validation.
