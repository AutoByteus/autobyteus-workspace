# Design Spec

## Current-State Read

The current baseline on `origin/personal` has globally allocated `AgentRun.runId` values, but `send_message_to` still reflects its earlier team-only origin.

Current active-run facts:

- `AgentRunIdentityAllocator` allocates concrete agent run ids and checks collisions across standalone and team-member storage/active domains.
- `AgentRunManager.createAgentRun(config, agentRunId)` requires the explicit id and rejects duplicate active ids.
- `AgentRunManager.getActiveRun(runId)` is the authoritative live run lookup. It returns `null` for missing/inactive runs and unregisters inactive entries.
- Team member run ids are preallocated at team launch, but an actual member `AgentRun` exists only after `MixedAgentMemberHandle.ensureReady()` creates/restores it through `AgentRunManager` with the member run id.

Current send-message facts:

- Parser/selector/contract files live under `agent-team-execution`.
- AutoByteus `send_message_to` requires `MemberTeamContext` and calls `memberTeamContext.deliverInterAgentMessage`.
- Codex and Claude expose `send_message_to` through team-member bootstrap/MCP paths only.
- The current team exact-run route can use team-specific behavior such as task-agent active/recoverable delivery and Team Communication projection.

Current self-evolution facts:

- The frontend CTA targets selected active standalone runs or focused active team-member runs and passes the visible run ids to GraphQL.
- Backend target context resolution can load metadata for inactive targets, so the backend needs an explicit live-target check.
- The Skill Self-Evolver built-in definition currently has only `run_bash` and does not send its own final outcome message.

Important worktree fact: implementation was paused after partial draft source changes. This design is based on repository baseline investigation and user decisions, not on the incomplete draft implementation in the worktree.

## Intended Change

`send_message_to` keeps one public tool and two selector modes:

1. `recipient_name`: team-local route. It requires `MemberTeamContext` and continues through the existing team delivery owner.
2. `target_agent_run_id`: global live direct-run route. It resolves only through `AgentRunManager.getActiveRun(targetRunId)` and fails closed when the target is not currently active.

The revised design intentionally removes the previously proposed global address directory/team-claim scan. The global direct route does not ask `AgentTeamRunManager` to claim preallocated member ids, does not lazy-start team members, does not recover task agents, and does not create Team Communication projection.

`DirectAgentRunMessageGrant` remains a policy overlay for server-owned helpers such as Skill Self-Evolver. It can narrow an already configured sender's allowed target/message/reference behavior, but it does not discover or revive targets.

Skill Self-Evolver becomes the first server-owned helper use case: it receives `send_message_to`, gets the active target run id in its task prompt, and sends a final `self_evolution_outcome` message if it has a meaningful outcome. If the target is inactive at start, self-evolution does not launch. If the target becomes inactive before final delivery, delivery fails and the record says so.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Feature / Refactor
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; Duplicated Policy Or Coordination; File Placement Or Responsibility Drift; Legacy Or Compatibility Pressure
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: Exact run ids are now globally allocated, but `send_message_to` remains team-owned and team-described. The previous directory/team-claim design would keep old exact-route semantics and add broad lookup coordination that the user no longer wants. `AgentRunManager.getActiveRun` already owns the live target invariant.
- Design response: Move shared tool contract/parser/dispatcher to `agent-communication`; keep team alias routing under `agent-team-execution`; implement the global exact route as an active-run direct router using `AgentRunManager.getActiveRun`; update self-evolution to use that route with an optional grant.
- Refactor rationale: Without the refactor, standalone runtime adapters would duplicate parsing/lookup logic or keep depending on team-only files, and one selector would keep two incompatible meanings.
- Intentional deferrals and residual risk, if any: Global ACLs, distributed routing, durable inboxes, and direct-message UI history are deferred. The in-scope route remains coherent because it is exact-id, active-only, and server-local.

## Terminology

- `recipient_name`: team-local roster selector, resolved only inside `MemberTeamContext` / team delivery.
- `target_agent_run_id`: canonical `AgentRun.runId` selector for the global live direct-run route.
- `Live/active target`: an `AgentRun` returned by `AgentRunManager.getActiveRun(targetRunId)` at delivery time.
- `Global direct route`: route selected by `target_agent_run_id`; posts directly to an active target `AgentRun` and emits direct run events.
- `Team route`: route selected by `recipient_name`; owns roster aliases, lazy team member behavior, and Team Communication projection.
- `DirectAgentRunMessageGrant`: optional policy grant attached to a sender run; never a target discovery or routing mechanism.

## Design Reading Order

Read this design from abstract to concrete:

1. data-flow spine and selector split;
2. ownership and capability allocation;
3. file responsibilities and reusable shared structures;
4. dependency rules and migration sequence.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove team-bound wording that says exact run targets are only reachable in this team boundary.
- Remove the older design's global address directory/team claim/lazy/recoverable exact-route plan.
- Remove old behavior that treats `target_agent_run_id` as a team-private recoverable/lazy route. `recipient_name` is the team semantic selector.
- Remove duplicate generic self-evolution success notification when a helper-authored outcome was successfully delivered.
- Do not add compatibility wrappers in old team paths after moving shared parser/contract ownership.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Runtime `send_message_to` call with `target_agent_run_id` | Active target model-visible input + direct event/result | `GlobalAgentRunMessageRouter` | New global exact live-run route. |
| DS-002 | Primary End-to-End | Team runtime `send_message_to` call with `recipient_name` | Team member/task-agent input + Team Communication projection | `MixedTeamManager` / `TeamMemberDeliveryCoordinator` | Existing team alias behavior remains team-owned. |
| DS-003 | Primary End-to-End | Self-evolution UI/manual start | Helper final `self_evolution_outcome` or truthful not-sent record | `SelfEvolutionService` + `SingleAgentEvolverStrategy` | First server-owned helper use case for global direct messaging. |
| DS-004 | Primary End-to-End | Self-evolution target id at start | Launch allowed or rejected before helper creation | `SelfEvolutionService` | Prevents stale metadata from launching helper work against dead targets. |
| DS-005 | Return-Event | Accepted direct delivery | Target run stream consumers / record summaries | `GlobalAgentRunMessageRouter` | Direct delivery must be visible without Team Communication. |
| DS-006 | Bounded Local | Direct grant present for sender | Allow/deny/usage record | `DirectAgentRunMessageGrantRegistry` / policy | Keeps helper safety separate from routing. |

## Primary Execution Spine(s)

1. Global live exact-run route:

   `Runtime tool call -> Runtime send-message adapter -> SendMessageToDispatcher -> Shared parser/validator -> GlobalAgentRunMessageRouter -> AgentRunManager.getActiveRun(targetRunId) -> AgentRun.postUserMessage -> direct INTER_AGENT_MESSAGE event/result`

2. Team recipient route:

   `Team runtime tool call -> Runtime send-message adapter -> SendMessageToDispatcher -> Shared parser/validator -> MemberTeamContext intent builder -> MixedTeamManager -> TeamMessageRecipientResolver -> TeamMemberDeliveryCoordinator -> recipient input + Team Communication projection`

3. Self-evolution outcome route:

   `SelfEvolutionComposerCta -> GraphQL mutation -> SelfEvolutionService live-target check -> SingleAgentEvolverStrategy launches helper -> helper send_message_to(target_agent_run_id) -> DS-001 direct route -> SelfEvolutionRecordLifecycle outcome summary`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A configured runtime adapter receives a tool call. The dispatcher parses the shared contract and, because the selector is `target_agent_run_id`, calls the global router. The router validates optional grant policy, asks `AgentRunManager` for the active target run, builds recipient-visible content, posts to the target run, emits direct event evidence, and returns a typed result. | runtime adapter, dispatcher, global router, `AgentRunManager`, target `AgentRun` | `GlobalAgentRunMessageRouter` | sender context, reference normalization, grant policy, input/event builders |
| DS-002 | A team sender calls `recipient_name`. The dispatcher requires `MemberTeamContext` and delegates to the existing team intent/delivery owner. Team delivery keeps roster resolution, lazy member behavior, task-agent handling reachable through team semantics, and Team Communication projection. | dispatcher, `MemberTeamContext`, `MixedTeamManager`, recipient resolver, delivery coordinator | `TeamMemberDeliveryCoordinator` | communication projection, member input trace, task-agent directory |
| DS-003 | Manual self-evolution starts from UI/API only if the target is live. The helper is launched with `send_message_to`, gets the exact target id and reference rules, and reports its final outcome through DS-001. The record lifecycle summarizes the real delivery state. | CTA/API, `SelfEvolutionService`, `SingleAgentEvolverStrategy`, helper run, global router, record lifecycle | `SelfEvolutionService` for orchestration; router for delivery | evidence package, grant registration/usage, record persistence |
| DS-004 | The start service resolves target context, then checks active runtime state before helper launch. Metadata alone is insufficient. | `SelfEvolutionService`, target context resolver, `AgentRunManager` | `SelfEvolutionService` | eligibility messages, stale UI protection |
| DS-005 | After the target accepts direct input, the router emits an `INTER_AGENT_MESSAGE` event on the target run. Stream subscribers and record summaries can observe it without inventing a Team Communication row. | router, target `AgentRun`, event consumers | `GlobalAgentRunMessageRouter` | event payload builder |
| DS-006 | When a direct grant exists, policy validates target id, message type, references, expiry, and delivery count before the router posts to the active target. Usage is recorded for self-evolution summaries. | grant registry, policy result, router | `DirectAgentRunMessageGrantRegistry` | audit/summary metadata |

## Spine Actors / Main-Line Nodes

- Runtime send-message adapters: provider-specific wrappers for AutoByteus, Codex, and Claude.
- `SendMessageToDispatcher`: shared selector-first branch point.
- `MemberTeamContext`: team sender context for `recipient_name`.
- `GlobalAgentRunMessageRouter`: governing owner for `target_agent_run_id` active direct delivery.
- `AgentRunManager`: authoritative active-run lookup owner.
- `AgentRun`: target model-input and local-event owner.
- `MixedTeamManager` / `TeamMemberDeliveryCoordinator`: governing owner for team recipient route.
- `SelfEvolutionService`: self-evolution start/orchestration owner.
- `SingleAgentEvolverStrategy`: helper launch/task prompt owner.
- `DirectAgentRunMessageGrantRegistry`: optional helper policy/usage owner.

## Ownership Map

| Node | Owns | Does Not Own |
| --- | --- | --- |
| Runtime send-message adapters | Provider-specific tool/MCP/dynamic registration and raw tool call adaptation. | Routing policy, target lookup, team projection. |
| `SendMessageToDispatcher` | Shared parse/validate/selector branch. | Active run lifecycle, team delivery internals, grant persistence details. |
| `GlobalAgentRunMessageRouter` | Exact live-run delivery sequencing, optional grant enforcement call, active lookup call, direct input/event result. | Run id generation, run lifecycle creation/restoration, team roster/lazy semantics. |
| `AgentRunManager` | Active run registry and lifecycle lookup. | Message formatting, sender policy, Team Communication. |
| `AgentRun` | Posting model-visible user input and emitting local events. | Global routing or grant policy. |
| `TeamMemberDeliveryCoordinator` | Team recipient route, Team Communication projection, member input trace. | Global direct run-id route. |
| `SelfEvolutionService` | Manual self-evolution start, target context, live-start requirement, lifecycle record. | Generic message routing. |
| `DirectAgentRunMessageGrantRegistry` | Optional grant lookup, policy use count, usage summary. | Target discovery or delivery. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| AutoByteus local tool class | `SendMessageToDispatcher` / `GlobalAgentRunMessageRouter` / team delivery | Exposes server-owned tool to AutoByteus runtime. | Active lookup, team resolver, grant internals. |
| Codex dynamic tool registration | `SendMessageToDispatcher` | Provider-specific schema/call surface. | Parsing semantics or target lookup. |
| Claude MCP tool builder/handler | `SendMessageToDispatcher` | Provider-specific MCP surface and approval plumbing. | Routing policy. |
| GraphQL self-evolution mutations | `SelfEvolutionService` | API boundary for UI. | Helper prompt or direct messaging implementation. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Team-owned shared parser/contract/selector ownership | `target_agent_run_id` is no longer team-only. | `agent-communication` parser/contract/selector files | In This Change | Old path should not remain as compatibility wrapper. |
| Tool wording saying exact ids are active/recoverable only inside team boundary | New exact route is global active-only. | Shared tool contract wording | In This Change | Mention `recipient_name` for team route. |
| Proposed `GlobalAgentRunAddressDirectory` / team claim scan | User clarified target must be live; `AgentRunManager` is enough. | `GlobalAgentRunMessageRouter` using `AgentRunManager.getActiveRun` | In This Change | Do not add `AgentTeamRunManager` dependency. |
| Recoverable/lazy exact-run behavior under `target_agent_run_id` | Conflicts with active-only direct route. | `recipient_name` team route for team semantics; typed inactive failure for exact route | In This Change | Tests must update. |
| Grant-first routing concept | Grants are only helper policy. | Direct route + optional grant policy | In This Change | Keep grant type/registry. |
| Generic self-evolution success notification after successful direct outcome | Would duplicate helper-authored message. | Outcome summary from helper direct send usage | In This Change | Keep non-sent/failure summaries. |

## Return Or Event Spine(s) (If Applicable)

- Direct delivery result/event:

  `AgentRun.postUserMessage result -> GlobalAgentRunMessageRouter -> target AgentRun.emitLocalEvent(INTER_AGENT_MESSAGE) -> stream consumers/history observers -> tool result`

- Self-evolution delivery summary:

  `Helper tool call result/usage -> DirectAgentRunMessageGrantRegistry usage record -> SingleAgentEvolverStrategy completion -> SelfEvolutionRecordLifecycle final record`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `GlobalAgentRunMessageRouter`
  - Chain: `targetRunId -> normalize -> AgentRunManager.getActiveRun -> active target or TARGET_NOT_ACTIVE -> post -> emit direct event -> typed result`
  - Why it matters: this is the simplified live-only target decision and replaces the earlier directory/claim spine.

- Parent owner: `DirectAgentRunMessageGrantPolicy`
  - Chain: `senderRunId -> lookup active grant -> validate target/message/references/expiry/count -> allow/deny -> record usage`
  - Why it matters: helper safety is enforced without turning grants into routing.

- Parent owner: `SelfEvolutionService`
  - Chain: `target ref -> resolve metadata/context -> AgentRunManager.getActiveRun(target run id) -> allow launch or reject stale target`
  - Why it matters: UI active state can be stale; helper work should not start for dead targets.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Shared argument parser/validator | DS-001, DS-002 | Dispatcher | Normalize selectors/content/message type/reference files. | One public contract. | Runtime adapters diverge. |
| Sender context builder | DS-001, DS-002 | Runtime adapters/dispatcher | Provide sender run id/name plus optional team context. | Direct route cannot depend on target to infer sender. | Ambiguous sender metadata. |
| Direct input/event builders | DS-001, DS-005 | Global router | Build model-visible content and direct `INTER_AGENT_MESSAGE`. | Stable target-visible semantics. | Event payloads drift by provider. |
| Team Communication projection | DS-002 | Team delivery coordinator | Publish team records after accepted team-route delivery. | Existing product behavior. | Global router would duplicate team semantics. |
| Grant policy/usage | DS-001, DS-003, DS-006 | Global router/self-evolution | Restrict helper sends and summarize usage. | Helper safety. | Grants become hidden routers. |
| Self-evolution evidence/prompt | DS-003 | `SingleAgentEvolverStrategy` | Explain editable skill roots and final outcome instruction. | Product-specific helper behavior. | Generic router would know self-evolution details. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Active target lookup | `agent-execution` / `AgentRunManager` | Reuse | It already owns active run registry and inactive pruning. | N/A |
| Team roster delivery | `agent-team-execution` | Reuse | It owns `recipient_name`, lazy member lifecycle, and Team Communication. | N/A |
| Shared send-message contract/direct routing | None currently; team-owned files are too narrow | Create New `agent-communication` | The tool now spans team and standalone. | Team subsystem cannot own standalone global route. |
| Runtime provider exposure | `agent-execution` backend adapters | Extend | Existing AutoByteus/Codex/Claude wrappers own provider surfaces. | N/A |
| Self-evolution helper orchestration | `self-evolution` | Extend | It owns helper launch, prompt, and record lifecycle. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-communication` | Shared contract/parser/reference normalization, dispatcher, global active direct router, direct input/event builders, optional grant policy. | DS-001, DS-005, DS-006 | Dispatcher/router | Create New | Cross-run communication capability. |
| `agent-team-execution` | Team alias route, lazy member lifecycle, Team Communication projection, team-specific task-agent behavior. | DS-002 | Team delivery | Reuse/Extend imports | Must not own global route. |
| `agent-execution` | Active run lifecycle/lookup and runtime adapter exposure. | DS-001, DS-005 | `AgentRunManager`, adapters | Reuse/Extend | No new id generation. |
| `self-evolution` | Live-start check, helper launch/prompt, grant registration/summary, record lifecycle. | DS-003, DS-004 | Self-evolution services | Extend | Product use case of global route. |
| `built-in-agents` | Skill Self-Evolver config/instructions. | DS-003 | Built-in agent definition | Extend | Add `send_message_to`. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/agent-communication/domain/send-message-target-selector.ts` | `agent-communication` | Selector invariant | `recipient_name` / `target_agent_run_id` target type and validation result. | One selector subject. | N/A |
| `src/agent-communication/domain/agent-run-message-sender.ts` | `agent-communication` | Sender identity | Sender run id/name/runtime plus optional `MemberTeamContext`. | Cross-runtime sender shape. | Selector/team context type. |
| `src/agent-communication/domain/direct-agent-run-message-grant.ts` | `agent-communication` | Grant policy shape | Grant fields and usage result types. | Policy subject only. | Sender/reference types. |
| `src/agent-communication/services/send-message-to-tool-contract.ts` | `agent-communication` | Public tool contract | Tool name/descriptions/schema-independent wording. | Shared across runtimes. | Selector. |
| `src/agent-communication/services/send-message-to-tool-argument-parser.ts` | `agent-communication` | Parser | Raw args -> parsed/validated input. | One public parser. | Reference normalizer. |
| `src/agent-communication/services/global-agent-run-message-router.ts` | `agent-communication` | Global direct route owner | Grant check, `getActiveRun`, post input, emit event, typed result. | One main-line route owner. | Sender/grant/builders. |
| `src/agent-communication/services/global-agent-run-message-runtime-builders.ts` | `agent-communication` | Input/event builders | Recipient-visible message and direct event payloads. | Stable delivery shape. | Sender/reference. |
| `src/agent-communication/services/send-message-to-dispatcher.ts` | `agent-communication` | Selector branch | Route to team or global direct owner. | Runtime-neutral branch. | Parser/router/team intent. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Selector parsing/validation | `send-message-target-selector.ts` | `agent-communication` | Used by all adapters/routes. | Yes | Yes | Generic multi-subject route bag. |
| Sender identity | `agent-run-message-sender.ts` | `agent-communication` | Runtime adapters need one sender shape. | Yes | Yes | Duplicate of full team roster context. |
| Reference normalization | `agent-communication-reference-files.ts` | `agent-communication` | Direct and team routes share absolute path validation. | Yes | Yes | Self-evolution-specific policy. |
| Direct event/input shape | `global-agent-run-message-runtime-builders.ts` | `agent-communication` | Direct route and tests need stable content/event payloads. | Yes | Yes | Team Communication projector. |
| Grant policy shape | `direct-agent-run-message-grant.ts` | `agent-communication` | Self-evolver and future helpers need constraints. | Yes | Yes | Routing registry or ACL catch-all. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `SendMessageTargetSelector` | Yes | Yes | Low | Only canonical selectors; aliases rejected. |
| `AgentRunMessageSenderContext` | Yes | Yes | Medium | Include `senderRunId` and optional team context; no copied roster. |
| `GlobalAgentRunMessageDeliveryInput/Result` | Yes | Yes | Low | Target is only `targetAgentRunId`; inactive typed result. |
| `DirectAgentRunMessageGrant` | Yes | Yes | Medium | Policy fields only; no target endpoint pointer. |
| Direct event payload | Yes | Yes | Medium | No `team_run_id`; no Team Communication reference entries. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-communication/domain/send-message-target-selector.ts` | `agent-communication` | Selector invariant | Generic target selector and descriptions. | One invariant owner. | N/A |
| `autobyteus-server-ts/src/agent-communication/domain/agent-run-message-sender.ts` | `agent-communication` | Sender identity | Sender run id/name/runtime and optional team context. | Cross-runtime sender context. | `MemberTeamContext` optional type. |
| `autobyteus-server-ts/src/agent-communication/domain/direct-agent-run-message-grant.ts` | `agent-communication` | Grant policy shape | Policy grant and usage result types. | Optional policy subject. | Reference paths. |
| `autobyteus-server-ts/src/agent-communication/services/send-message-to-tool-contract.ts` | `agent-communication` | Public tool contract | Name/descriptions for all runtimes. | Shared public contract. | Selector. |
| `autobyteus-server-ts/src/agent-communication/services/send-message-to-tool-argument-parser.ts` | `agent-communication` | Parser | Raw args -> parsed/validated shared input. | One parser. | Selector/reference normalizer. |
| `autobyteus-server-ts/src/agent-communication/services/agent-communication-reference-files.ts` | `agent-communication` | Reference normalizer | Absolute explicit reference file normalization. | Cross-team/direct use. | Parser/grants. |
| `autobyteus-server-ts/src/agent-communication/services/global-agent-run-message-router.ts` | `agent-communication` | Global direct route owner | Optional grant enforcement, active lookup, post, direct event, typed result. | Main route owner. | Sender/grant/builders. |
| `autobyteus-server-ts/src/agent-communication/services/global-agent-run-message-runtime-builders.ts` | `agent-communication` | Input/event builders | Build `AgentInputUserMessage` and direct `INTER_AGENT_MESSAGE`. | Stable message semantics. | Sender/reference. |
| `autobyteus-server-ts/src/agent-communication/services/direct-agent-run-message-grant-registry.ts` | `agent-communication` | Grant registry | Register/consume/record transient grants. | One policy usage owner. | Grant type. |
| `autobyteus-server-ts/src/agent-communication/services/send-message-to-dispatcher.ts` | `agent-communication` | Tool dispatcher | Selector branch and route invocation. | Runtime-neutral entry. | Parser/router/team intent. |
| `autobyteus-server-ts/src/agent-tools/agent-communication/send-message-to.ts` | `agent-tools` / `agent-communication` | AutoByteus local tool | Bound AutoByteus tool using dispatcher and sender context. | Runtime-specific wrapper. | Dispatcher. |
| `autobyteus-server-ts/src/agent-tools/agent-communication/send-message-to-parameter-schema.ts` | `agent-tools` / `agent-communication` | AutoByteus schema | Parameter schema from shared contract. | Tool registry schema. | Contract. |
| Codex `agent-communication` registration/handler files | `agent-execution` runtime adapter | Codex dynamic tool wrapper | Build dynamic tool for team and standalone using dispatcher. | Provider-specific surface. | Dispatcher/contract. |
| Claude `agent-communication` MCP/handler files | `agent-execution` runtime adapter | Claude MCP/tool wrapper | Build MCP/tool for team and standalone using dispatcher. | Provider-specific surface. | Dispatcher/contract. |
| `self-evolution/services/self-evolution-service.ts` | `self-evolution` | Start/orchestration | Live target check before helper launch. | Service already owns manual start. | `AgentRunManager`. |
| `self-evolution/services/strategies/single-agent-evolver-strategy.ts` | `self-evolution` | Helper launch/prompt | Register grant, include target id, prompt final send, read usage. | Helper orchestration owner. | Grant registry. |
| `self-evolution/services/self-evolution-record-lifecycle.ts` | `self-evolution` | Record finalization | Record truthful outcome summary, avoid duplicate success notification. | Run record owner. | Grant usage summary. |
| `built-in-agents/templates/skill-evolver/*` | `built-in-agents` | Helper definition | Include `send_message_to` and final reporting guidance. | Product-managed agent config. | N/A |

## Ownership Boundaries

- `agent-communication` is the authoritative boundary for shared `send_message_to` semantics and global live direct-run delivery.
- `agent-team-execution` remains the authoritative boundary for team roster aliases, team-local `recipient_name` delivery, lazy member lifecycle, and Team Communication projection.
- `agent-execution` remains the authoritative boundary for active run lifecycle and backend creation. The global router may use `AgentRunManager.getActiveRun` and `AgentRun.postUserMessage`; it must not create/restore runs.
- `self-evolution` owns why a helper is launched and how its outcome is recorded; it does not own generic routing.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `SendMessageToDispatcher` | Shared parser and selector branch | Runtime adapters | Adapter parsing selectors and choosing routes itself | Add dispatcher input/result fields. |
| `GlobalAgentRunMessageRouter` | Grant check, active lookup, direct input/event building | Dispatcher, self-evolution tests/helpers | Runtime adapter directly calling `AgentRunManager.getActiveRun(...).postUserMessage(...)` | Add router method/result shape. |
| `AgentRunManager` | Active run map/inactive pruning | Global router | Global router scanning team rosters/metadata for target liveness | Use only `getActiveRun`. |
| `MixedTeamManager` / team delivery | Recipient resolver, lazy member lifecycle, Team Communication projection | Dispatcher for `recipient_name` | Global router reimplementing team projection or task-agent recovery | Keep those behaviors behind `recipient_name`. |
| `DirectAgentRunMessageGrantRegistry` | Grant lookup/usage count/summary | Global router, self-evolution | Grants storing target endpoints or performing delivery | Add policy fields only. |

## Dependency Rules

- Runtime adapters may depend on `agent-communication` dispatcher/contract and runtime-local provider APIs.
- Runtime adapters must not depend directly on `AgentRunManager`, `TeamMessageRecipientResolver`, team registries, or grant registry internals for delivery.
- `agent-communication` global router may depend on `AgentRunManager.getActiveRun` and `AgentRun` post/event APIs.
- `agent-communication` global router must not depend on `AgentTeamRunManager`, team member registries, task-agent recovery caches, or team metadata for `target_agent_run_id` routing.
- `agent-communication` may depend on `MemberTeamContext` as optional sender metadata for the dispatcher/team branch; `MemberTeamContext` must not be required for `target_agent_run_id`.
- `agent-team-execution` may import generic selector/parser types from `agent-communication`; it must not own shared public contract semantics.
- Self-evolution may register a grant and consume usage summaries; it must not bypass the router to post target messages.
- No production file may generate agent run ids locally outside existing identity allocation owners.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `SendMessageToDispatcher.dispatch(input)` | One tool call | Parse/validate/branch to team or global route. | Raw args + `AgentRunMessageSenderContext` | Selector-first decision. |
| `GlobalAgentRunMessageRouter.deliver(input)` | Global live exact message | Authorize, active lookup, deliver, event/usage. | `senderRunId`, `targetAgentRunId` | No recipient aliases. |
| `AgentRunManager.getActiveRun(runId)` | Active run lookup | Return active `AgentRun` or null. | Canonical run id string | Only target liveness lookup. |
| `MemberTeamContext.deliverInterAgentMessage(intent)` | Team route | Existing team delivery. | Team intent with member identity | Used only for `recipient_name`. |
| `DirectAgentRunMessageGrantRegistry.register(senderRunId, grant)` | Grant policy | Attach optional narrowing policy. | Sender run id | For helper runs. |
| `SelfEvolutionService.startForTarget(...)` | Self-evolution start | Resolve context and require live target before launch. | `runId` or `teamRunId + memberRunId` | Metadata resolution plus active check. |

Rule application: `recipient_name` and `target_agent_run_id` are different identity subjects. The dispatcher keeps a single public tool but splits by explicit selector; it does not guess based on sender context.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Dispatcher | Yes | Yes | Low | Branch only by parsed selector. |
| Global router | Yes | Yes | Low | Accept only `targetAgentRunId`. |
| `AgentRunManager.getActiveRun` | Yes | Yes | Low | Do not add team claim behavior here. |
| Team delivery handler | Yes | Yes | Medium | Keep team intent shape; no global direct route. |
| Grant registry | Yes | Yes | Low | Key by sender run id; grant target constraints explicit. |
| Self-evolution start | Yes | Yes | Low | Separate standalone vs team-member target refs. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Global exact route owner | `GlobalAgentRunMessageRouter` | Yes | Low | It owns active direct delivery sequencing. |
| Active run registry | `AgentRunManager` | Existing/Yes | Low | Use only `getActiveRun` for target liveness. |
| Shared selector | `SendMessageTargetSelector` | Yes | Low | Remove `TeamMessage` prefix. |
| Grant | `DirectAgentRunMessageGrant` | Yes | Medium | Document policy-only role. |
| Dispatcher | `SendMessageToDispatcher` | Yes | Low | Runtime-neutral entry. |

## Applied Patterns (If Any)

- Router: `GlobalAgentRunMessageRouter` owns direct active exact-run delivery sequencing.
- Adapter: AutoByteus/Codex/Claude files translate provider tool calls to `SendMessageToDispatcher`.
- Policy grant: `DirectAgentRunMessageGrant` narrows permitted delivery for server helpers without owning target lookup.
- Shared parser/contract: one owned structure for public tool semantics.

A registry/directory pattern is intentionally not used for target resolution in this revision because the live-only rule makes `AgentRunManager` the authoritative existing registry.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-communication/` | Folder | `agent-communication` | Cross-run communication domain/services. | New capability spans team and standalone. | Runtime provider details. |
| `autobyteus-server-ts/src/agent-communication/domain/` | Folder | Domain shapes | Selector/sender/grant/result types. | Pure shared shapes. | Runtime calls or team projection. |
| `autobyteus-server-ts/src/agent-communication/services/` | Folder | Communication services | Parser, dispatcher, router, builders, grant registry. | Cross-runtime service owners. | Team-only lazy/projection internals. |
| `autobyteus-server-ts/src/agent-tools/agent-communication/` | Folder | AutoByteus tool wrapper | Local tool implementation/schema. | Tool category is agent communication, not team-only. | Global routing implementation. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/agent-communication/` | Folder | Codex adapter | Dynamic tool registration/handler using dispatcher. | Provider-specific adapter. | Shared parser duplication. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-communication/` | Folder | Claude adapter | MCP/tool handler using dispatcher. | Provider-specific adapter. | Shared parser duplication. |
| `autobyteus-server-ts/src/agent-team-execution/...` | Existing folder | Team owner | Team delivery imports generic selector/contract but keeps team route. | Team behavior still belongs here. | Global direct route. |
| `autobyteus-server-ts/src/self-evolution/...` | Existing folder | Self-evolution owner | Live target check, helper prompt/grant, outcome summary. | Product orchestration. | Generic route implementation. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-communication/domain` | Main-Line Domain-Control | Yes | Low | Shared shapes only. |
| `agent-communication/services` | Main-Line Domain-Control + off-spine concerns | Yes | Medium | Router/dispatcher/builders/grants are related; split by file owner. |
| `agent-tools/agent-communication` | Transport/runtime adapter | Yes | Low | AutoByteus wrapper only. |
| Codex/Claude `agent-communication` folders | Transport/runtime adapter | Yes | Low | Provider-specific only. |
| Existing `agent-team-execution` | Main-Line Domain-Control | Yes | Medium | Keep team owner but remove generic contract ownership. |
| Existing `self-evolution` | Product orchestration | Yes | Medium | Add helper-specific use of route, not generic routing. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Selector-first routing | `if target.kind === "recipient_name" require MemberTeamContext; else globalRouter.deliver(targetAgentRunId)` | `if sender has MemberTeamContext use team route; else if grant use direct route` | Captures the explicit selector semantics. |
| Live exact target lookup | `const target = agentRunManager.getActiveRun(targetRunId); if (!target) return TARGET_NOT_ACTIVE;` | `teamRunManager.listActiveRuns().find(team => team.claim(targetRunId))` | Implements the user-approved live-only simplification. |
| Team route separation | Use `recipient_name` when Team Communication projection or lazy member behavior is desired. | Let `target_agent_run_id` sometimes mean team projection/recovery. | Avoids dual-path selector semantics. |
| Grant role | Grant validates `targetRunId === allowedTargetRunId` and references before delivery. | Grant stores a direct pointer to target `AgentRun` and routes itself. | Keeps grants as policy, not routing. |
| Self-evolution stale target | Start rejects inactive target; final send can fail `TARGET_NOT_ACTIVE` if target dies. | Helper messages old metadata-only target. | Keeps user-visible self-improve tied to active targets. |

Example dispatcher shape:

```ts
const parsed = parseSendMessageToToolArguments(rawArgs);
if (parsed.target.kind === "recipient_name") {
  return teamRoute.deliver({ memberTeamContext: sender.memberTeamContext, parsed });
}
return globalAgentRunMessageRouter.deliver({
  sender,
  targetAgentRunId: parsed.target.targetAgentRunId,
  content: parsed.content,
  messageType: parsed.messageType,
  referenceFiles: parsed.referenceFiles,
});
```

Example global router shape:

```ts
const targetRun = agentRunManager.getActiveRun(targetAgentRunId);
if (!targetRun) {
  return { accepted: false, code: "TARGET_NOT_ACTIVE" };
}
const postResult = await targetRun.postUserMessage(buildDirectInputMessage(input));
if (postResult.accepted) {
  targetRun.emitLocalEvent(buildDirectInterAgentMessageEvent(input));
}
return postResult;
```

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Leave shared parser under `agent-team-execution` and import it globally | Fastest code change | Rejected | Move shared files to `agent-communication` and update imports. |
| Keep old grant-first direct routing | Earlier design and helper safety | Rejected as routing model | Use active direct route; keep grants as policy overlay. |
| Keep global address directory/team claim scan | Earlier post-rebase design | Rejected after live-only user decision | Router uses `AgentRunManager.getActiveRun` only. |
| Preserve recoverable/lazy exact-run behavior under `target_agent_run_id` | Existing team tests/behavior | Rejected | `target_agent_run_id` is active direct only; `recipient_name` is team semantic route. |
| Add `targetAgentRunId` camelCase alias | JS-style convenience | Rejected | Keep canonical snake_case and alias rejection. |
| Emit generic self-evolution success notification after direct outcome | Existing behavior | Rejected for successful direct outcome | Record helper outcome and avoid duplicate success notification. |

## Derived Layering (If Useful)

- Runtime adapter layer: AutoByteus/Codex/Claude tool surfaces.
- Communication domain/service layer: parser, dispatcher, global router, direct builders, grants.
- Active run owner layer: `AgentRunManager` / `AgentRun`.
- Team semantic owner layer: `MemberTeamContext` / `MixedTeamManager` for `recipient_name` only.
- Product orchestration layer: self-evolution helper launch and record lifecycle.

Layering is explanatory only; ownership is defined by the spines and boundaries above.

## Migration / Refactor Sequence

1. Reconcile/refresh the paused partial implementation against this revised design before writing new source. Remove any draft global address-directory/team-claim code.
2. Move shared selector/parser/contract/reference normalization from team-owned paths to `agent-communication`; update imports with no compatibility wrappers.
3. Implement `SendMessageToDispatcher` with selector-first branching.
4. Implement `GlobalAgentRunMessageRouter` using injected `AgentRunManager.getActiveRun`; add typed `TARGET_NOT_ACTIVE`/policy/delivery results and direct input/event builders.
5. Keep `recipient_name` branch calling the existing team intent/delivery path.
6. Update AutoByteus tool registration/factory to bind sender context for standalone and team runs.
7. Update Codex and Claude runtime adapters to expose `send_message_to` for standalone configured agents and team members through the shared dispatcher.
8. Add/keep `DirectAgentRunMessageGrantRegistry` and wire Skill Self-Evolver helper launch to register an exact target/message/reference grant after helper run id is known.
9. Update Skill Self-Evolver built-in config and prompt to include `send_message_to` and final `self_evolution_outcome` instructions.
10. Add self-evolution live-target start checks and final record summary behavior.
11. Update tests: parser path, team `recipient_name`, global active direct delivery, active team-member direct delivery, inactive/preallocated/recoverable rejection, runtime exposure, grants, and self-evolution outcome.
12. Run implementation-scoped checks before code review.

## Key Tradeoffs

- Active-only direct route vs recoverable/lazy exact route: active-only matches the user's mental model, removes broad directory complexity, and makes failure semantics clear.
- Direct route without Team Communication vs preserving same-team projection: direct route stays globally uniform; team projection remains available through `recipient_name`.
- Optional grants vs mandatory ACL: grants protect server-owned helpers now without inventing a global user ACL model.
- Router direct `AgentRunManager` dependency vs separate resolver file: direct dependency is acceptable because `AgentRunManager` is the authoritative live registry and the lookup is a single invariant; runtime adapters remain behind the router boundary.

## Risks

- Partial implementation already in the worktree may contain now-stale address-directory/team-claim code. It must be removed or reworked.
- Existing exact-run team tests may need semantic updates rather than path-only changes.
- Direct events may not appear in current UI exactly like Team Communication records. That is accepted for this ticket; a separate UI history design can follow if needed.
- Broad active-run addressing may need ACL/user-scope policy later. This ticket limits risk through exact id, no discovery, active-only, and optional helper grants.

## Guidance For Implementation

- Do not implement or keep `GlobalAgentRunAddressDirectory` / team claim sources for this ticket.
- Do not call `AgentTeamRunManager` from the global `target_agent_run_id` route.
- Keep `recipient_name` as the only team semantic route.
- Use `AgentRunManager.getActiveRun` as the sole live target decision.
- Emit direct `INTER_AGENT_MESSAGE` only after target input is accepted.
- Return typed tool failures; do not report delivered when target is inactive or recipient rejects input.
- Bind sender context explicitly in every runtime adapter.
- Keep grants policy-only and self-evolution-specific restrictions outside the generic parser.
- Update docs/tests that describe `target_agent_run_id` as active/recoverable team-bound.
