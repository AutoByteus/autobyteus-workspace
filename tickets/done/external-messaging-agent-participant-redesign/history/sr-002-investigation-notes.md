# External Messaging As Run-Attached Integrations — Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated ticket worktree and branch created from refreshed `origin/personal`.
- Current Status: Refined for requirements approval after integration/MCP brainstorm; target technical design intentionally not started.
- Investigation Goal: Trace current external messaging, MCP, and agent-runtime models; test the user's integration and push-notification hypothesis; and establish a refined requirements basis without prematurely implementing a replacement.
- Scope Classification: `Large`
- Scope Classification Rationale: The requested change replaces product semantics and ownership across provider/MCP contracts, group-event ingestion, actor identity, integration resource/action exposure, normal run launch, run-owned input subscriptions, agent/team turn routing, outbound intent, persistence, GraphQL/UI setup, and legacy disablement.
- Scope Summary: Current channel-owned execution bindings versus target-free integrations plus normal-launch run-owned input attachments, with coherent legacy disablement as the recommended first slice.
- Primary Questions Resolved:
  - What is bound today, and what supported trigger-to-reply path results?
  - Does the current system publish complete real-time agent information?
  - Are ambient group messages visible to the server/agent?
  - Which current boundaries are reusable and which embody the wrong semantics?
  - What run-owned source subscription replaces the binding without allowing provider traffic to control lifecycle?
  - Can an external event legitimately start a turn on an already-running opted-in agent while remaining distinct from run activation?
  - Which parts map to MCP tools, resources, and subscriptions, and what must AutoByteus host itself?
  - Can the current experience be disabled independently and safely?
  - Which provider is the best first proof and what capability constraints apply?

## Request Context

The user reports never using the current external messaging feature because the native/mobile AutoByteus experience is a better interface for directly instructing an agent. The user believes binding an external channel to one agent or agent team and treating incoming channel messages as user turns is the wrong abstraction.

The initial interpretation was an agent/team represented as a bot participant whose direct messages or mentions would activate it with group context. The user then clarified that the agent is the autonomous brain and the group/channel is external information rather than an owner of agent lifecycle. The latest brainstorm adds an important nuance: a dedicated group-manager agent should be notified when someone speaks, and a selected external human message may ultimately become a user-like turn input. The invariant is therefore not “external events never start turns”; it is “external events never start/restore execution.” The agent/team starts normally and explicitly opts into allowed source inputs at launch.

The user suspects WeChat and similar platforms should be integrations or MCPs. Analysis supports a hybrid: MCP resources/subscriptions or an equivalent native event adapter provide the push/context side, while MCP tools provide read/send/reply/action capabilities. A tool alone cannot notify an idle model.

The user prefers disabling the current feature rather than preserving a bad model, but requested analysis before action.

Terminology assumption: the user's “IAM” means instant messaging / IM, not identity and access management.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign`
- Current Branch: `codex/external-messaging-agent-participant-redesign`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign`
- Bootstrap Base Branch: `origin/personal` at `023f4f550b07f27dbf388d55234a10b8eae0e0c7`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-08-12; `origin/HEAD` resolves to `origin/personal`.
- Task Branch: `codex/external-messaging-agent-participant-redesign`
- Expected Base Branch: `personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Authoritative artifacts belong to this dedicated worktree, not the shared `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` checkout. No implementation has been authorized or started.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/product-model-analysis.md` | Product/domain analysis comparing remote-control binding, context-only subscription, and the hybrid run-attached integration | MCP resource/tool split, normal-launch run attachment, lifecycle-versus-turn trigger distinction, delivery modes, team ingress, explicit outbound intent, and transition phases | Requirements; later design | `R-001`–`R-010`; `AC-001`–`AC-013` | Revised proposal | Requires user approval with requirements | After approval, use as intended-behavior input to the design spec. |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-12 | Command | `git status --short --branch`; `git remote -v`; `git symbolic-ref refs/remotes/origin/HEAD`; `git fetch origin --prune`; `git worktree add -b codex/external-messaging-agent-participant-redesign ... origin/personal` | Establish isolated, current task workspace. | Shared checkout is `personal`; remote default and expected finalization branch are `personal`; isolated branch created from current remote state. | No |
| 2026-08-12 to 2026-08-13 | Doc | User request, clarification, and integration/MCP brainstorm in current conversation | Capture product concern and progressively resolve the desired domain relationship. | Current direct-instruction-through-IM model is unused. Agent/team lifecycle must remain normal and independent. Latest clarification permits pushed external messages to become turns on an already-running run that opted in at launch; provider traffic still cannot create/restore execution. | User approval of refined basis required. |
| 2026-08-12 | Doc | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.codex/skills/solution-designer/design-principles.md` | Apply canonical design and investigation rules. | Must trace supported production paths, define behavior IDs, classify ownership/root cause, inventory later data-flow spines, and reject speculative mechanisms not tied to reachable behavior. | No |
| 2026-08-12 | Command | `find autobyteus-server-ts/src -type f \| grep -E 'external|messag|telegram|whatsapp|channel'`; focused `rg` across server/web/gateway/shared contracts | Locate current external messaging entrypoints and ownership. | Found file-backed bindings, ingress dispatch, agent/team run launch, open output delivery, GraphQL setup, managed gateway, provider adapters, and Settings UI. | No |
| 2026-08-12 | Code | `autobyteus-server-ts/src/external-channel/domain/models.ts` | Inspect binding and delivery shapes. | `ChannelBinding` holds route, target type, agent/team definition, launch preset, cached run ids, target member identity, and fallback policy. | Yes: target design must split responsibilities. |
| 2026-08-12 | Code | `autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts` | Trace server ingress. | Every accepted envelope resolves a binding, dispatches to its run, records receipt/turn correlation, and attaches the route/run output delivery runtime. Unbound messages are recorded as `UNBOUND`. | No |
| 2026-08-12 | Code | `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-facade.ts`; `channel-team-run-facade.ts`; `channel-binding-run-launcher.ts`; `channel-agent-input-message-builder.ts` | Verify message meaning and runtime lifecycle. | Bindings lazily create/reuse agent/team runs. External content becomes `AgentInputUserMessage`; team input routes to entry/coordinator; launch presets live on binding. | No |
| 2026-08-12 | Code | `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-delivery-runtime.ts`; `channel-run-output-event-collector.ts`; `channel-output-event-parser.ts`; `channel-run-output-publisher.ts`; `services/reply-callback-service.ts` | Determine outbound semantics. | The runtime maintains an open route/run link, observes every eligible target turn, accumulates assistant text, waits for completion, and publishes through callback outbox. It does not send reasoning/tools as such. | No |
| 2026-08-12 | Code | `autobyteus-message-gateway/src/application/services/channel-mention-policy-service.ts`; `inbound-classifier-service.ts`; `inbound-forwarder-worker.ts` | Determine group-event visibility. | Group events require recognized mention metadata; otherwise the inbox record is marked `BLOCKED` and never reaches server ingress. Observation and activation are coupled. | No |
| 2026-08-12 | Code | `autobyteus-message-gateway/src/infrastructure/adapters/telegram-business/telegram-business-adapter.ts`; `discord-business/discord-business-adapter.ts` | Inspect provider normalization. | Telegram captures sender id/display name and mention flags in metadata. Discord captures mention flags but does not carry author id/display name into the envelope metadata. | Yes: canonical event contract needed. |
| 2026-08-12 | Code | `autobyteus-ts/src/external-channel/external-message-envelope.ts`; `src/agent/message/external-source-metadata.ts` | Inspect shared contract. | Typed core ends at route/peer/content/time/attachments; author/reply/mention/event kind are absent or generic metadata. Agent external-source metadata drops generic metadata and preserves route/message identity only. | Yes: target contract design. |
| 2026-08-12 | Code | `autobyteus-ts/src/agent/runtime/agent-worker.ts`; `agent-runtime.ts`; `src/agent/event-inbox/agent-event-inbox.ts`; `agent-event-inbox-entry.ts`; scheduler files; `src/agent/events/agent-events.ts`; `src/agent/loop/agent-turn-runner.ts` | Determine how pushed external data could reach an independently started agent. | `AgentWorker` is a long-lived scheduler loop once started. `AgentRuntime.submitEvent` accepts user-message, inter-agent-message, and lifecycle inputs only; the inbox queues turn-start events behind active work. `GenericEvent` exists but is rejected. | Add a typed external-human turn input or rigorously preserved external subtype plus any context-only notification boundary; never use this path to activate a stopped run. |
| 2026-08-13 | Code/Docs | `autobyteus-web/docs/tools_and_mcp.md`; `autobyteus-server-ts/src/agent-definition/domain/models.ts`; `autobyteus-ts/src/tools/mcp/server-instance-manager.ts`; `server/base-managed-mcp-server.ts`; `server/proxy.ts`; `tool.ts`; `tool-registrar.ts`; agent tool resolver and run config/provisioning files | Evaluate “external channel as MCP” against current AutoByteus capabilities and launch ownership. | Agent definitions select registered MCP tool names. MCP server instances are keyed by agent ID and expose `listTools`/`callTool`; current client path has no resource list/read/subscribe or notification routing. Normal run config owns model/workspace/runtime but no external input attachment. | Extend MCP/integration host for push/resources; add optional input attachment to normal launch; do not use tool assignment as input authorization. |
| 2026-08-12 | Code | `autobyteus-server-ts/src/api/graphql/types/external-channel-setup/resolver.ts`; `types.ts`; `autobyteus-web/composables/useMessagingChannelBindingSetupFlow.ts`; `autobyteus-web/types/messaging.ts`; `autobyteus-web/docs/messaging.md` | Trace current product setup and documented promise. | Binding CRUD is always reported enabled; setup selects agent/team and per-binding runtime/model/workspace preset; docs explicitly promise later entry/coordinator outputs are sent to Telegram without another inbound. | No |
| 2026-08-12 | Code | `autobyteus-server-ts/src/external-channel/providers/external-channel-storage.ts`; `file-channel-binding-provider.ts`; `docs/ARCHITECTURE.md` | Locate persistence. | Bindings are file-backed at `<appDataDir>/external-channel/bindings.json`; SQL binding table was removed in migration `20260331102000_remove_channel_bindings_table`. | No |
| 2026-08-12 | Command/Data | `find /Users/normy -path '*/external-channel/bindings.json' -type f` | Look for representative real stored bindings. | No binding file found under `/Users/normy`; absence is local evidence only, not evidence about other installations. | Preserve data conservatively; do not assume global absence. |
| 2026-08-12 | Doc | `tickets/done/external-channel-open-session-delivery/requirements.md`; `design-spec.md`; `autobyteus-web/docs/messaging.md` | Verify whether open output is incidental or approved current behavior. | Open route-to-run delivery was deliberately designed and approved so later coordinator outputs reach Telegram. The current system is intentionally more than one-inbound/one-reply. | No |
| 2026-08-12 | Command/Test | In `autobyteus-message-gateway`: `pnpm test -- tests/unit/application/services/channel-mention-policy-service.test.ts tests/unit/application/services/inbound-classifier-service.test.ts` | Confirm gateway group mention behavior against executable coverage. | Full gateway suite executed because of script argument handling: 80 files / 235 tests passed, including three mention-policy and two inbound-classifier tests. | No |
| 2026-08-12 | Command/Test | In `autobyteus-server-ts`: `pnpm test --run tests/unit/external-channel/services/channel-ingress-service.test.ts tests/unit/external-channel/runtime/channel-run-output-delivery-runtime.test.ts tests/e2e/external-channel/external-channel-team-open-delivery.e2e.test.ts` | Confirm ingress and open output behavior. | 3 files / 11 tests passed. E2E explicitly delivered direct and later no-new-inbound coordinator outputs without worker leakage. One expected/asynchronous test stderr logged a missing test delivery record while the suite passed; it did not invalidate asserted behavior. | No |
| 2026-08-12 | Web/Spec | Telegram official Bots FAQ and Privacy Mode docs: `https://core.telegram.org/bots/faq#what-messages-will-my-bot-get`; `https://core.telegram.org/bots/features#privacy-mode` | Verify whether a Telegram bot can observe ambient group messages. | Default privacy mode limits ordinary group events. Bot admins or bots with privacy disabled can receive all human messages; provider capability/configuration must be explicit. | Revalidate during provider implementation because platform rules can change. |
| 2026-08-12 | Web/Spec | Slack official event docs: `https://api.slack.com/events/message.channels`; `https://api.slack.com/events/message`; `https://api.slack.com/events/app_mention` | Evaluate Slack visibility capability as a source-adapter reference. | Slack separates full conversation message events (with relevant scopes and membership) from mention-only events, supporting truthful source visibility classification. Slack is not present in current repo provider contracts. | Design provider-independent core before Slack adapter. |
| 2026-08-12 | Web/Spec | WeCom official AI Bot doc entry `https://developer.work.weixin.qq.com/document/path/100719` (official page was not openable by the web tool; content/links were discovered through a mirrored documentation index) | Determine whether an official WeCom participant surface exists. | Documentation describes single/group callbacks with `aibotid`, `chatid`, `from.userid`, quote data, encrypted callbacks, and temporary `response_url` constraints. This differs from current generic WeCom adapter and requires separate feasibility. | Treat as provisional; re-open official docs directly during provider design. |
| 2026-08-13 | Web/Spec | MCP 2025-11-25 official server overview, resources, tools, lifecycle, and transports: `https://modelcontextprotocol.io/specification/2025-11-25/server/index`; `/server/resources`; `/server/tools`; `/basic/lifecycle`; `/basic/transports` | Verify whether MCP is only pull tools or can support push-like integration updates. | MCP classifies resources as application-controlled and tools as model-controlled. Resource servers may advertise `subscribe` and send `notifications/resources/updated`; Streamable HTTP can carry server-to-client notifications. Resource-update notification indicates a changed URI, not an agent turn, so the AutoByteus host must own routing and policy. | Validate SDK/API details during design/implementation; current app exposes only tool functions. |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| `BEH-001` | User/System | A gateway-normalized direct message or group message allowed by mention policy reaches signed server ingress for a configured binding route. | Provider adapter → gateway inbox → mention classifier → server `/api/channel-ingress/v1/messages` → `ChannelIngressService` → `ChannelBindingService.resolveBinding` → `ChannelRunFacade` → lazy run launch/reuse → `postUserMessage`/`teamRun.postMessage`. | Each accepted external message becomes one user-style run input; receipt/lease/idempotency prevents duplicate dispatch. | Source files and passing ingress tests above. |
| `BEH-002` | System | A provider group event lacks `mentioned`/`isMentioned`/`mentionsAgent` truthy metadata. | Provider adapter → gateway inbox → `InboundClassifierService` → `ChannelMentionPolicyService` → inbox `BLOCKED`; no server call. | Ambient group conversation is not observed by AutoByteus server/agent. | Mention policy source and 235-test gateway run. |
| `BEH-003` | Contract | A provider adapter builds `ExternalMessageEnvelope`. | Adapter raw payload → `parseExternalMessageEnvelope` → generic metadata → server → `buildAgentExternalSourceMetadata`. | Route/message/time are typed; author/reply/mention/event semantics are not uniformly required. | Shared contract plus Telegram/Discord adapters. |
| `BEH-004` | System | A binding has an active target run and an eligible target turn emits assistant text and completes. | Run/team events → `ChannelRunOutputDeliveryRuntime` → eligibility → event collector/recovery → durable output record → `ReplyCallbackService` → server callback outbox → gateway outbox → provider send. | Final assistant-visible text is delivered once. Later eligible entry/coordinator turns are sent without a new external message; internal worker outputs are filtered. | Current source, approved open-session ticket, docs, passing E2E. |
| `BEH-005` | Operational | Binding setup is saved through Settings/GraphQL. | Settings → GraphQL `upsertExternalChannelBinding` → validates target definition and launch preset → `ChannelBindingService` → file binding provider → `<appDataDir>/external-channel/bindings.json`; runtime id later cached on record. | Conversation route association, target, launch configuration, cached execution, and output policy coexist on one record. | GraphQL, model, file provider, architecture docs. |
| `BEH-006` | System | Target type is `TEAM`. | Binding launcher creates/restores team run → team facade posts to selected/default entry member → team events → output eligibility filters to configured entry identity. | One external reply stream is exposed; internal team events remain private unless surfaced as eligible entry output. | Team facade, eligibility source, passing E2E. |
| `BEH-007` | User/Operational | User opens Settings → Messaging and gateway reports status. | Managed gateway controls → provider selection/configuration → Channel Binding card → target and launch preset → verification. GraphQL `externalChannelCapabilities` returns `bindingCrudEnabled: true`. | Current product advertises remote-control binding as available. Managed documentation currently selects Discord/Telegram while excluding WhatsApp/WeCom/WeChat from normal selectable cards. | UI/types/docs/resolver/availability source. |

## Design Health Assessment Evidence

- Change posture: `Larger Requirement`
- Candidate root cause classification: `Boundary Or Ownership Issue` (primary); `Shared Structure Looseness`, `Duplicated Policy Or Coordination`, and `Legacy Or Compatibility Pressure` (secondary)
- Refactor posture evidence summary: Refactor/replacement is required. The current path makes the source responsible for choosing and launching execution. The target must keep integration/source configuration target-free, attach external input from the normal run-launch side, permit policy-controlled turn delivery only to active runs, and keep outbound authority in explicit tools/actions.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `domain/models.ts` | `ChannelBinding` combines six distinct responsibility categories. | Shared structure and owner are too broad for source/context behavior. | Split in target design. |
| `channel-ingress-service.ts` + run facades | Binding resolution immediately leads to run preparation/reuse and user message dispatch. | Run lifecycle and input routing are fused. | Split durable integration ingest from active run attachment routing; remove lifecycle calls from ingress. |
| Agent runtime/inbox/turn runner | Long-lived worker and queued turn-start lane exist, but trigger types are generic user/inter-agent only. | Active-run push is structurally plausible, but multi-party external identity and policy need an explicit input boundary. | Add typed external-human turn input and context-only/batched handling without stopped-run activation. |
| Gateway mention policy | Mention decides forward versus drop. | Addressing and observation are fused before run-specific policy exists. | Normalize authorized events first; active attachment delivery mode decides turn creation. |
| Output delivery runtime | Any eligible bound target turn can become outbound. | Run completion is being used as external intent. | Replace output authority with explicit message intent. |
| Shared envelope/adapters | Author/reply semantics are inconsistent and untyped. | Group conversation context cannot be reliably constructed. | Canonical event type. |
| Current Settings model | Runtime/model/workspace is configured per channel binding. | Integration setup owns execution configuration. | Integration setup becomes target-free; normal run launch optionally owns source attachment. |
| Current MCP client path | Tool discovery/call only; instances keyed by agent and often lazy. | “Add MCP tool” cannot supply durable push inputs on its own. | Add MCP resource/subscription handling or native event adapters plus server-owned integration supervision. |
| Existing durable queues/outbox | Reliable provider/server handoff is already separately owned. | Transport reliability can be reused without preserving binding semantics. | Preserve ownership in design. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/external-channel/domain/models.ts` | Binding, receipts, output delivery, provider delivery event shapes | `ChannelBinding` mixes route, target, execution, and output. | Replace/split product-domain structure; receipt/delivery structures may remain reusable. |
| `.../services/channel-ingress-service.ts` | Receipt idempotency, binding resolution, run dispatch, output attach | Governing entrypoint for current remote-control behavior. | Legacy disable boundary; target integration ingest must record event, resolve active run attachments, and never launch execution. |
| `.../runtime/channel-binding-run-launcher.ts` | Lazy agent/team creation and cached run ids | Execution lifecycle incorrectly belongs to binding. | Remove from external ingest; agent runtime lifecycle stays independently owned. |
| `.../runtime/channel-agent-run-facade.ts` | External message to agent user turn | Confirms direct-instruction semantics. | Decommission as provider ingress owner. |
| `.../runtime/channel-team-run-facade.ts` | External message to team member turn | Preserves single team entry identity but obtains lifecycle/target from binding. | Team attachment may reuse the one-owner invariant only behind normal team-run launch and active routing. |
| `.../runtime/channel-agent-input-message-builder.ts` | Envelope to `AgentInputUserMessage` | Flattens one event and insufficient metadata into one user message. | Replace with canonical external event plus typed external-human turn projection after attachment policy. |
| `.../runtime/channel-run-output-delivery-runtime.ts` | Open route/run subscription and output publication | Deliberate current open-channel behavior. | Must not remain outbound authority in target. |
| `.../services/reply-callback-service.ts` | Route validation, outbound envelope, durable callback enqueue | Clean provider callback boundary. | Reuse behind explicit message-intent owner with new identity shape. |
| `autobyteus-message-gateway/src/application/services/channel-mention-policy-service.ts` | Group mention forward/drop policy | Drops ambient messages before any run-owned delivery policy. | Ingest permitted source events; retain mention as canonical fact; attachment mode decides whether it becomes a turn. |
| `autobyteus-message-gateway/src/infrastructure/adapters/telegram-business/*` | Telegram polling, normalization, mention facts, send, peer discovery | Closest existing provider to target proof. | Extend to canonical event and capability verification. |
| `.../discord-business/*` | Discord gateway/send/discovery | Author identity currently omitted from normalized metadata. | Adapter upgrade needed if/when supported. |
| `autobyteus-ts/src/external-channel/external-message-envelope.ts` | Shared normalized ingress contract | Insufficient required actor/revision/reply semantics. | Replace or evolve to typed canonical conversation event. |
| `autobyteus-ts/src/agent/runtime/agent-worker.ts`; `agent-runtime.ts` | Long-lived worker lifecycle and public event submission | Worker can run independently; runtime rejects external-specific event types but queues accepted turn starts. | Preserve independent lifecycle and add explicit active-run external input submission; it must reject stopped runs. |
| `autobyteus-ts/src/agent/event-inbox/*`; `src/agent/loop/agent-turn-runner.ts` | Event lanes, scheduling, and turn trigger contract | Only lifecycle, active-turn, and generic user/inter-agent turn-start concepts are supported. | Add typed external-human turn trigger and policy-owned batching/context behavior while retaining serial scheduling. |
| `autobyteus-ts/src/tools/mcp/server/*`; `server-instance-manager.ts`; `tool.ts`; `tool-registrar.ts` | Per-agent MCP tool discovery/call and lifecycle | Client session interface is limited to tools; no resource/subscription notification flow. | Extend or create integration host for resources/subscriptions and always-on receive; retain tool path for agent actions. |
| `autobyteus-server-ts/src/agent-definition/domain/models.ts`; agent tool resolver | Agent definition selects registered tool names | Fits specialized group-manager capabilities but not concrete source input authorization. | Keep tool selection on definition; concrete source attachment belongs to launch/run authorization. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-config.ts`; provisioning | Normal run lifecycle configuration | No external input attachment today. | Add optional attachment input/metadata to normal run preparation/restore path without giving integration ingress lifecycle authority. |
| `autobyteus-server-ts/src/api/graphql/types/external-channel-setup/*` | Binding setup API | Always enables binding CRUD and persists launch preset. | Phase-0 disable; later split target-free integration/source management from normal launch attachment input. |
| `autobyteus-web/components/settings/messaging/ChannelBindingSetupCard.vue` and setup flow/stores | Remote-control setup UI | Product language/config matches wrong job. | Phase-0 disabled state; later integration setup plus normal launch attachment controls. |
| `autobyteus-message-gateway/src/application/services/inbound-inbox-service.ts`, outbound equivalents | Durable queue/idempotency/retry | Ownership is independent of binding semantics. | Preserve/reuse. |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-12 | Test | Gateway `pnpm test -- ...mention-policy... ...inbound-classifier...` | 80 test files / 235 tests passed; group mention gate behavior is executable and current. | Ambient events are intentionally blocked; not only a static-code inference. |
| 2026-08-12 | Test | Server focused Vitest command for ingress, output runtime, team open-delivery E2E | 3 files / 11 tests passed; no-new-inbound coordinator output was delivered, worker output filtered. | Open output link is reachable, supported behavior and must be disabled/replaced deliberately. |
| 2026-08-12 | Static runtime trace | Read `agent-worker.ts`, `agent-runtime.ts`, agent inbox/entry/scheduler, `agent-events.ts`, and `agent-turn-runner.ts` | Worker scheduler is long-lived after start; runtime submission/inbox accepts lifecycle plus user/inter-agent turn events, serializing turn starts. `GenericEvent` is not usable. | Push-to-active-run fits the worker scheduler, but needs a typed external-human trigger and separate context-only handling; provider traffic must not call run activation. |
| 2026-08-13 | Static MCP trace | Read frontend MCP docs, agent definition tool selection, managed MCP server/client/proxy/registrar, run config, and provisioning | Current MCP integration is tool-centric. Managed client surface is `listTools`/`callTool`; sessions are keyed per agent and may be lazy. No resource subscription notification reaches runtime. | “Just an MCP tool” cannot implement push. Add host-owned integration session plus resource/event notification routing, while reusing tools for actions. |
| 2026-08-12 | Setup | Temporary worktree-local symlinks to existing dependency directories for test execution, removed after tests | Enabled checks without dependency installation; final worktree retains no node_modules symlinks. | No repository source impact. |
| 2026-08-12 | Data probe | Search `/Users/normy` for `*/external-channel/bindings.json` | No representative local real binding data found. | Persisted-data decision must remain conservative and not assume zero deployed data. |

## External / Public Source Findings

- Telegram official Bots FAQ / Privacy Mode, current as browsed 2026-08-12:
  - Bots always receive private chat and service messages.
  - In groups, default privacy mode limits ordinary messages; bot admins or bots with privacy disabled receive all human messages (subject to Telegram rules).
  - Implication: `FULL_OBSERVATION` is a verified provider/account capability, not an assumption.
- Slack official Events API docs, current as browsed 2026-08-12:
  - Full message events are separated by conversation type and relevant OAuth scopes.
  - `app_mention` supports mention-only event handling.
  - Implication: source adapters must report full versus mention-only visibility truthfully; Slack requires a new adapter and enum support.
- MCP official specification revision 2025-11-25, browsed 2026-08-13:
  - Server primitives distinguish user-controlled prompts, application-controlled resources, and model-controlled tools.
  - Resource servers may declare `subscribe` and send `notifications/resources/updated` for a subscribed URI.
  - Streamable HTTP supports server-to-client notifications/requests over its session.
  - Implication: MCP can standardize both context/update indication and actions, but AutoByteus remains responsible for mapping a resource update to eligible active run attachments and turn policy. A resource notification is not itself a model/user turn.
- WeCom official AI Bot documentation entry:
  - Search/indexed material indicates group/single callbacks include bot, conversation, actor, quote, and temporary response identities.
  - The official page could not be opened directly by the tool, so details are provisional and must not drive implementation without direct revalidation.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static investigation. Existing Vitest fixtures and temporary SQLite reset were sufficient for focused current-behavior checks.
- Required config, feature flags, env vars, or accounts: No real provider account was used. Provider API capability findings came from official documentation, not live accounts.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated git worktree creation; temporary node_modules symlinks to the current shared checkout for tests, then removal.
- Cleanup notes for temporary investigation-only setup: Symlinks removed. `git status` contains only the ticket artifact folder.

## Findings From Code / Docs / Data / Logs

1. The user is not proposing a small policy adjustment. The desired product is an integration system where agent/team execution remains the autonomous lifecycle subject and external sources provide optional pushed inputs plus callable capabilities.
2. The current feature's lack of usefulness for this user is explained by its job: it offers a degraded direct-chat surface where a better native/mobile surface exists.
3. The strongest differentiated use case—an already-running specialized group manager receiving group events—is explicitly prevented for ambient messages by the current mention gate.
4. The context-only refinement was too strict. A selected event may legitimately start a turn, but only on an active run that opted in. The critical invariant is lifecycle independence, not prohibition of event-driven turns.
5. A push-routing association is unavoidable. Its ownership and lifecycle must be inverted: the run attaches allowed sources at normal launch; the source never stores a target definition or launch preset.
6. MCP tools supply model-initiated actions but cannot notify a model that is not already executing. MCP resources/subscriptions can report changed data to the host, but AutoByteus must own active-run routing and delivery policy.
7. Current AutoByteus MCP support lacks resources/subscriptions and may lazily start per-agent sessions, so an always-on messaging integration cannot be implemented as one extra registered tool.
8. Current `AgentWorker` scheduling can queue turn starts on an active run. A typed external-human trigger can use that execution model while preserving author/source identity and without activating stopped execution.
9. Current outbound behavior is purposefully open and can surface later coordinator turns. It must be replaced by explicit send/reply integration tools/actions.
10. The transport reliability subsystem is valuable and separable. The redesign need not discard gateway supervision, queues, retries, idempotency, callbacks, or provider clients.
11. A temporary disable must cover UI/API/ingress/output restoration. Hiding Settings alone would not stop configured paths.
12. Automatic conversion of old bindings is unacceptable because the new model changes input authorization, run lifecycle ownership, and outbound authority.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: Binding JSON at `<appDataDir>/external-channel/bindings.json`; records contain route, target definition, launch preset, cached run id, entry member identity, and timestamps. No real local file/volume was found under `/Users/normy`; test fixtures demonstrate shape only.
- Relevant code-model, serialization, semantic, or physical-store change: Target sources/subscriptions have different semantics and policies (visibility, retention, consumption cursor, context access, independent lifecycle, outbound permission) that do not exist in legacy binding records.
- Normal readers and writers, including unknown/extra-field behavior: `FileChannelBindingProvider` reads/writes a JSON array and maps recognized fields; GraphQL and runtime services read it as current active configuration.
- Representative direct-read or compatibility evidence: Current provider can read test/fixture records, but direct use as target sources/subscriptions cannot preserve explicit consent or policy invariants.
- Required semantics and invariants preserved by direct use: `No` — legacy data does not express ambient-observation consent, source retention, consumption cursor/context policy, lifecycle independence, or explicit outbound permission.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Preserve dormant file during disablement. Do not automatically enable it as a new source/subscription. Re-creation is low-volume user configuration but privacy-sensitive.
- Concrete benefit, cost, and risk of migration if it remains a candidate: Automatic migration saves setup effort but risks silently enabling new data capture and send behavior. Benefit is insufficient; choose explicit rebuild.
- Existing migration framework or lifecycle constraints, only if migration may be required: App-data migration framework exists, but target outcome is `Discard or Rebuild`; no semantic auto-migration should be designed.

## Constraints / Dependencies / Compatibility Facts

- Current managed UI product path selects Discord/Telegram; Slack is absent.
- Current shared provider enum includes WhatsApp, WeCom, WeChat, Discord, and Telegram.
- Current managed availability lists WhatsApp/WeCom/WeChat as excluded even though lower-level compatibility/adapters exist.
- Provider transport rules control what can be observed and how long reply handles remain valid.
- Current outbound pipeline is text-centric even though envelopes have attachment/chunk fields.
- Legacy open output behavior has approved requirements and tests; replacement is a deliberate behavior change, not bug cleanup.
- Current agent runtime has no typed external-human input event; `GenericEvent` existence does not make it a supported runtime input. Existing turn scheduling is nevertheless reusable for selected events on active runs.
- Current MCP client path exposes only tool list/call; official resources/subscriptions are not integrated.
- Current MCP instances are per-agent and may be lazy; always-on receive ownership needs separate analysis.
- No backward-compatibility steady state should retain both inferred bound-run output and explicit source-addressed message intent.

## Open Unknowns / Risks

- User approval of immediate coherent disablement.
- User approval of the hybrid run-attached integration model and coherent legacy disablement.
- Default delivery mode and which specialized definitions may default to `EVERY_MESSAGE`.
- Team ingress ownership: recommended team-run attachment governed by the manager/entry agent.
- Exact runtime representation for external-human turn input versus context-only/batched updates.
- Whether MCP resource subscription semantics are sufficient for incremental high-volume event feeds or a native/custom event transport is needed underneath.
- First-provider sequencing after the core model is approved.
- Default event retention, rolling-summary cadence, deletion/tombstone behavior, and privacy disclosure.
- Multiplicity rules for multiple agents subscribed to one source and multiple connector bot identities in one source.
- Official WeCom AI Bot current contracts and whether they serve the user's intended WeChat audience.
- Provider bot loops and multiple bots in one group; self/bot classification, access, and autonomous-consumption policies are required.

## Notes For Architecture Reviewer

Not ready for architecture review. Requirements and `product-model-analysis.md` must first be approved by the user. After approval, produce a design spec that:

1. inventories separate primary spines for provider/MCP ingestion, durable source events, normal run launch and input attachment, active-run event-to-turn routing, context-only/batched access, explicit send, legacy disablement, and attachment lifecycle;
2. keeps transport reliability off-spine and reusable;
3. gives the integration/source owner authority over events, capabilities, and retention without agent targeting;
4. gives the run attachment authority over source access and delivery policy while normal run services retain lifecycle authority;
5. gives explicit outbound intent one authoritative send boundary;
6. adds a typed external-human turn input plus context-only/batched handling and proves none of them can activate stopped execution;
7. removes/decommissions binding-run dispatch and open output subscription without dual behavior;
8. specifies the `Discard or Rebuild` legacy binding transition without a privacy-unsafe migration.
