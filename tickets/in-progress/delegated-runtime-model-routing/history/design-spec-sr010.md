# Design Spec — Model Router Core (autobyteus-32)

## Solution And Approval Basis

- Current solution revision ID: `SR-010` (the SR-005 design is in `history/design-spec-sr005.md`; superseded by the user's direction of 2026-10-24/25)
- Approved requirements baseline: `requirements-doc.md` SR-010 (SR-009 approved within the direction, user informed 2026-10-26; SR-010 narrows DEC-022 on cost evidence A-22, see § Requirement Note), with `launch-selection-order.md` SR-007.
- Design status: `Ready`
- Canonical investigation-notes path: `tickets/in-progress/delegated-runtime-model-routing/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `docs/design-cases.md` (Cases 1–7, incl. the 303 additions), `GLOSSARY.md`, `collaboration_model.md` (CM-10, CM-12), `data_migration_guideline.md` §§ 2–3 (read 2026-10-24/25 in this conversation); `solution-designer` SKILL.md (updated 2026-10-25).
- Project design-principle conflicts or discrepancies: none.

## Requirement Note (SR-010, DEC-022 narrowed)

The node's runtime report (autobyteus-303) takes 2–5 s typical, up to 18 s, and the launch resolution runs inside the delegating root's gate (A-02). Applying the "skip a blocked default" rule with Model Routing off would add that read to every delegation of every user, including those who never turn the feature on. DEC-022 is therefore narrowed by the Solution Designer: the blocked-default skip (supplement U4b) applies **only while Model Routing is on**; with it off, nothing changes (REQ-002 "Off: no new behavior"). Recorded in requirements SR-010; the user is informed.

## Current-State Read

- Fresh delegated copies get their launch from `CollaboratorLaunchResolver.resolve(plans, base)` (`collaborator-launch-resolver.ts:92-230`, A-01): agent default → team default → the run root's launch (`inherited`) or, on a peer (`defaults_only`), refusal (`CollaboratorNoDefaultLaunchError`). Usability = availability (`RuntimeAvailabilityService`) + one `validateMany`. Skipped layers become `LaunchConfigurationFallback`s rendered by `launchNotesOf`.
- Placement is resolved before the lifecycle reads a saved Task (`root-task-execution-lifecycle.ts:137-173`, A-03), so the Task text is not available to launch resolution today.
- The peer start request carries no Task text and the answer no launches (`remote-requests.ts:42-82`); CM-12 states the default-only rule.
- autobyteus-303 provides `AvailableAgentRuntimesService.read()` (single-flight; installed + signed-in runtimes, models with `blocked`, limits) and the tool `list_available_agent_runtimes` (local + Agent Tools MCP).
- autobyteus-308 provides `"internal": true` and `InternalAgentVisibility`; built-in agents are excluded from collaboration (`EXCLUDED_AGENT_DEFINITION_IDS`).
- A posted user message during an active turn is appended to that turn (`agent-run.ts:185-215`, `append_to_active_turn`, A-21); runs restore by ID (`AgentRunService.restoreAgentRun`).
- Settings pattern: `AUTOBYTEUS_*` keys read through config modules on each use; Settings → Model Routing page exists with "Agent runtimes now" (303).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: new `model-routing` subsystem (router service, conversation owner, sessions, knowledge store, decision log, statistics, settings), three agent tools with MCP adapters, a built-in agent template, changes to the launch resolver, the task lifecycle and three roots, the peer contract on both sides, run-history launch sources and remote links, two DTO packages, GraphQL, and four page sections plus run Settings rows; about 50 source files plus tests.
- Architectural risk: `High`
- Risk rationale: a long-lived system-owned agent conversation on the delegation path; new persisted stores (knowledge, decisions, conversation state); changed peer contract; launch resolution waiting on a router inside the root gate; new tools whose effects (decisions) start other agents.
- Escalation trigger: a router failure that could start an agent on an unusable or blocked launch; any need to change the root gate; any data migration.

## Architecture Investigation Evidence

| ID | Source | Observation | Decision Supported |
| --- | --- | --- | --- |
| A-01…A-03, A-13 | resolver, roots' gates, lifecycle, temp workspace (investigation notes) | as Current-State Read | Router step in the resolver; lifecycle split; router run in the temp workspace |
| A-20 | `available-agent-runtimes-service.ts:150-190` (autobyteus-303) | Single-flight read of all runtimes; report has `blocked` per model | One report per resolution while routing is on; the router's tool shares a read in progress |
| A-21 | `agent-execution/domain/agent-run.ts:185-215` | Input during an active turn is appended to it | No own batching: requests are messages with IDs |
| A-22 | 303 measurements (2–5 s typical, ≤ 18 s); A-02 (resolution inside the root gate) | A report read on every delegation is a real cost | DEC-022 narrowed (Requirement Note) |
| A-23 | `built-in-agents/built-in-agent-registry.ts`, bootstrapper | Built-in agents are rewritten from templates at startup; excluded from collaboration | Router as built-in template with `"internal": true` |
| A-24 | `run-history/store/message-log.ts` | Append-only JSONL log with rotation and tolerant lines | Decision log follows the pattern |
| A-25 | `services/server-settings-service.ts`; `config/*-setting.ts` | Registered settings + config modules read on use | Model Routing settings |

## Intended Change

When Model Routing is on and an agent of a fresh delegated copy has no usable default (now including "blocked by a used-up limit"), the launch resolver asks `ModelRouter`. It posts one routing request into the node's single, long-lived conversation of the built-in, internal Model Router agent and waits up to 60 s for a decision submitted through `submit_launch_choices`, validated against the node's runtime report. Valid choices start the agents with source "Model Router" and a reason; failures fall back visibly (this node) or refuse clearly (peer). Every fresh copy's launches are recorded in a decision log that feeds the Model Routing page's Decisions and Overview. The router learns through its knowledge note, which the user can also edit.

## Change Scope (Mandatory)

- In scope: UC-001…UC-005, UC-007 (UC-006 moved out). Areas: `model-routing` (new subsystem), `agent-tools/model-routing` (new tools) + MCP providers, built-in agent template `model-router`, `agent-collaboration/collaborators` (resolver, admission, placement, notes), `agent-collaboration/execution/task` (lifecycle split) and the three roots, `agent-collaboration/execution/remote` + `remote-collaboration` (peer contract), `run-history` (launch source, remote link launches), contract packages, GraphQL, web (Model Routing page sections, run Settings rows, remote rows), docs (CM-12, GLOSSARY, module docs), and folding the 303 live-agents test (`codex/available-agent-runtimes-live-agents`) into this ticket's API/E2E coverage.
- Derived consumers:

| Changed structure | Consumer | Decision |
| --- | --- | --- |
| `LaunchConfigurationSource` (+ origin `model_router` with `choiceReason`, `taskKind`; fallback layer `model_router`; reasons `blocked`, `signed_out`, `router_not_active`, `router_failed`) | `parseLaunchConfigurationSource`; `launchNotesOf`; team/collaboration DTO packages; web `runMemberTree`, `RunMemberRow`, `delegatedLaunchRows` | Extend lists; notes and labels; tolerant readers |
| Remote links (+ optional launches) | remote-link parser, `remoteTaskExecutionDtoSchema` (both packages), web Settings | Optional; DTO carries; read-only remote rows |
| Peer start request/answer | channel client + route, receiver, team starter | Clean cut (DESIGN.md rule 9) |
| `CollaboratorNoDefaultLaunchError` / refusal texts | `peerRefusalText`, `REMOTE_REFUSAL` | New wording per supplement § 6; new code `MODEL_ROUTER_FAILED` |
| CM-12 text | `collaboration_model.md` | Updated |

- Deliberately left alone: configured placements, existing copies, user launches, application launches; the root gate (RSK-003, FU-002); model settings choice; runtime read speed (303 FU-005); learning from outcomes (own Task).
- Follow-ups: FU-002 (routing outside the root gate, if latency shows it), FU-003 (GLM, unchanged).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Spine |
| --- | --- | --- |
| BEH-001 | REQ-001, 004..006, 009; AC-001, 004, 006 | DS-001, DS-003, DS-004 |
| BEH-002 | REQ-001, 006, 009; AC-005 | DS-002 |
| BEH-003 | REQ-001; AC-003 | DS-001 (usability) |
| BEH-004 | REQ-009; AC-012 | DS-006 |
| BEH-005 | REQ-002, 003, 007, 008, 010..012; AC-002, 007..009, 011 | DS-005, DS-007 |
| BEH-007 | REQ-002; AC-002 | — (unchanged path when off) |

## Relevant Supplemental Task Artifacts

| Artifact | Relationship |
| --- | --- |
| `launch-selection-order.md` (SR-007) | The resolver and `ModelRouter` implement §§ 2–7 one to one; § 2 U4b applies only while Model Routing is on (SR-010) |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `Yes`, local: launch resolution happens before the Task text exists (A-03).
- Structural triggers: *Capability-area reuse* (agent runs, settings, append-only log, runtime report, tool pattern) → reused; *Several kinds or forms* (this node vs peer, agent vs team, description vs `task_id`, router conversation new vs restored) → each traced; *Split sequence* ruled out: the resolver calls `ModelRouter.route` and applies its outcome; `ModelRouter` calls the conversation owner, sessions and the log itself; *Behavior by absence* ruled out: "router not active" and "router failed" are explicit outcomes; *Repeated coordination*: usability rule stays one owner (`LaunchUsabilityCheck`).
- Root cause classification: `Missing Invariant` (no Task-aware layer) + the local ordering defect.
- Refactor needed now: `Yes`, small: split the lifecycle's `delegateToNewCopy` into `prepareNewCopyWork` + `dispatchNewCopy` so the work text exists before placement; extract the resolver's candidate check into `LaunchUsabilityCheck`.
- Intentional deferrals: routing outside the root gate (FU-002).

## Terminology

- **Model Router** (GLOSSARY): the built-in, internal agent (`autobyteus-model-router`) that chooses runtimes and models for delegated agents no usable default covers; one per node.
- **Router conversation**: the node's single long-lived run of the Model Router.
- **Routing request**: one message into the router conversation for one delegation; identified by `requestId`.
- **Launch choice**: the router's answer for one agent (runtime, model, task kind, reason).
- **Knowledge note**: the router's durable memory on a node.
- **Task kind**: a label from the node's editable list.
- **Decision record**: one line per agent of a fresh delegated copy (time, Task title, task kind, launch, source, reason, notes).

## Legacy Removal Policy (Mandatory)

- Obsolete: `CollaboratorLaunchResolver.check` (moved to `LaunchUsabilityCheck`); `RootTaskExecutionLifecycle.delegateToNewCopy(context, input, placement)` (split). Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

| Subject | Change | Decision |
| --- | --- | --- |
| Launch source in run-history trees | new origin/layer/reason values; optional `choiceReason`, `taskKind` | `Directly Usable — No Migration` (tolerant lists; absent = not routed) |
| Remote links | optional `launch` per agent / member | `Directly Usable — No Migration` |
| `<appData>/model-routing/knowledge.md`, `knowledge.previous.md` | new files | New; absent = empty note |
| `<appData>/model-routing/decisions_active.jsonl` (+ sealed `decisions_NNNNNN.jsonl`) | new append-only log (message-log pattern, A-24) | New; unreadable line skipped with a warning (DESIGN.md rule 7) |
| `<appData>/model-routing/router-conversation.json` | `{ runId, runtimeKind, llmModelIdentifier }` | New; missing or unreadable → a new conversation |
| Settings `AUTOBYTEUS_MODEL_ROUTING_ENABLED`, `AUTOBYTEUS_MODEL_ROUTER_RUNTIME`, `AUTOBYTEUS_MODEL_ROUTER_MODEL`, `AUTOBYTEUS_MODEL_ROUTING_TASK_KINDS` (JSON list) | new keys | absent → off / unset / default list |

Migration guideline § 2: no migration (tolerant readers, new files); availability unaffected (a broken store disables only its feature part); no schema versions.

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | `delegate_task(address)` on this node | copy started; result with notes; decision records | Root (sequence) → `CollaboratorLaunchResolver` (launch) |
| DS-002 | Primary | `delegate_task` with `node` | peer run started with launches; link + notes on A | `RemoteDelegation` (A) / `RemoteDelegationReceiver` (B) |
| DS-003 | Bounded local | resolver asks `ModelRouter.route` | validated choices or failure | `ModelRouter` |
| DS-004 | Primary | router calls `submit_launch_choices` | session settled or error returned | `ModelRoutingSessions` |
| DS-005 | Primary | Model Routing page | status, settings, knowledge, decisions, statistics; open conversation | GraphQL → `model-routing` owners |
| DS-006 | Return | recorded launch sources | notes and Settings rows | `launchNotesOf`, DTO projection |
| DS-007 | Primary | router calls knowledge tools / user edits | note updated, previous kept | `KnowledgeNoteStore` |

## Primary Execution Spine(s)

- DS-001: `delegate_task → Root (gate) → RootTaskExecutionLifecycle.prepareNewCopyWork → resolveDelegationPlacement(work) → CollaboratorAdmission.catalogTaskSource(work) → CollaboratorLaunchResolver.resolve(plans, base, work) → [routing on: AvailableAgentRuntimesService.read → LaunchUsabilityCheck (incl. blocked) → ModelRouter.route (DS-003)] → RootTaskExecutionLifecycle.dispatchNewCopy → dispatchTaskCopy → RoutingDecisionLog.record → result + launchNotes`
- DS-002 (A): `delegate_task(node) → Root (gate) → RemoteDelegation.planActivation → startDelegatedRun(task) →` (B) `RemoteDelegationReceiver.start → catalogTaskSourceOf(work) → resolver (defaults_only, B's ModelRouter) → prepare run / RemoteTeamRunStarter → RoutingDecisionLog.record (B) → answer {run IDs, launches}` → (A) `link with launches → launchNotes`
- DS-003: `ModelRouter.route(request) → status() [switch, router launch usable in the report] → RouterConversation.ensure() [restore by stored runId, else create with router launch, temp workspace, auto-approve] → ModelRoutingSessions.open(requestId, request, report) → run.postUserMessage(routing request text) → await settled | 60 s | conversation failure → sessions.close → outcome`
- DS-004: `submit_launch_choices(requestId, choices) → sender is the router conversation? → ModelRoutingSessions.submit → validate (every agent; usable and not blocked in the session's report; required runtime; task kind in list) → settle | error text to the router`

## Spine Narratives (Mandatory)

| Spine | Narrative |
| --- | --- |
| DS-001 | Inside the gate the lifecycle first validates input and reads a saved Task, so the work text exists; placement then resolves. With Model Routing on, the resolver reads the node's report once (single-flight), checks configured layers including sign-in and blocked models, and asks the router for uncovered agents; it assembles launches and sources, falling back to the inherited launch with a note on router failure. Dispatch starts the copy; the decision log records every agent's launch; the result carries notes. With Model Routing off, the path is today's. |
| DS-002 | A sends the Task text with the start request; B resolves like a local copy without the inherited layer, using B's router when B's Model Routing is on; B records and answers with launches; A records them on the link and renders notes. Refusals are worded on A. |
| DS-003 | `ModelRouter` is the one owner of a routing: it checks the router is active, makes sure the conversation exists, opens a session for the request (holding the report it was decided against), posts the request text and waits for the session to settle; time-out or a failed turn closes the session as a failure. Requests arriving during a turn are appended to it (A-21) and answered in that turn. |
| DS-004 | The decision tool accepts only the node's router conversation as sender, validates against the session and settles it; an invalid decision returns the reasons so the router corrects within the time limit. |
| DS-005 | The page reads `modelRoutingStatus`, settings, knowledge, decisions (paged) and statistics (period), and sets the switch, router runtime/model, task kinds and knowledge; "Open conversation" ensures the conversation and opens it by run ID (autobyteus-308 REQ-008). |
| DS-007 | `read_routing_knowledge` returns the note; `update_routing_knowledge(text)` replaces it and keeps the previous version; the page edits and undoes the same store. |

## Spine Actors / Main-Line Nodes

Roots, `RootTaskExecutionLifecycle`, `CollaboratorAdmission`, `CollaboratorLaunchResolver`, `LaunchUsabilityCheck`, `ModelRouter`, `RouterConversation`, `ModelRoutingSessions`, `RoutingDecisionLog`, `KnowledgeNoteStore`, `RemoteDelegation`, `RemoteDelegationReceiver`.

## Ownership Map

- `CollaboratorLaunchResolver`: the selection order (supplement §§ 3–5): layers, which agents need routing, applying the router outcome, inherited fallback / refusal, sources and fallbacks. Calls `ModelRouter.route` only when an agent needs it.
- `LaunchUsabilityCheck`: U1–U5 as today, plus (routing on) U3 signed-in and U4b blocked from the report.
- `ModelRouter` (`model-routing/services/model-router.ts`): status (switch, router launch, active or why not), one routing (session, post, wait, time-out), never decides layer order.
- `RouterConversation` (`model-routing/services/router-conversation.ts`): the node's conversation: ensure (restore by stored run ID; create with the router launch when missing, unreadable or the router runtime changed), single-flight; stores `router-conversation.json`.
- `ModelRoutingSessions`: pending sessions by `requestId`; validation; settle once.
- `RoutingDecisionLog`: append and read decision records; `RoutingStatistics` derives the Overview from it for a period.
- `KnowledgeNoteStore`: current + previous note.
- `ModelRoutingSettings` (`model-routing/model-routing-settings.ts`): the four settings, read on use.
- Roots: three-step sequence only (prepare → resolve placement → dispatch).

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Owner | Must Not Own |
| --- | --- | --- |
| Tools `submit_launch_choices`, `read_routing_knowledge`, `update_routing_knowledge` (local + MCP) | sessions, knowledge store | Validation rules, file IO |
| GraphQL `modelRouting*` queries/mutations | `ModelRouter`, stores, settings | Rules |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By |
| --- | --- | --- |
| `CollaboratorLaunchResolver.check` | Needed by the routing step and the decision tool | `LaunchUsabilityCheck` |
| `RootTaskExecutionLifecycle.delegateToNewCopy(context, input, placement)` | Work text needed before placement | `prepareNewCopyWork` + `dispatchNewCopy` |

## Return Or Event Spine(s) (If Applicable)

DS-006 as above; peer answer launches → A's link → notes.

## Bounded Local / Internal Spines (If Applicable)

- `ModelRouter.route` (DS-003) and `ModelRoutingSessions.submit` (DS-004) as above.
- `RouterConversation.ensure`: `stored state? → restore run → runtime/model still the setting's? → yes: use | no/failed: create new run (temp workspace, auto-approve, router launch) → store state`.

## Off-Spine Concerns Around The Spine

| Concern | Serves | Responsibility |
| --- | --- | --- |
| Routing request text (`routing-request-text.ts`) | `ModelRouter` | First-message wording: request ID, Task, agents, covered members, required runtimes, delegating launch, current knowledge note, task kinds, how to answer |
| Model router built-in template (`built-in-agents/templates/model-router/`: `agent.md`, `agent-config.json` with `"internal": true` and tools `list_available_agent_runtimes`, `read_routing_knowledge`, `update_routing_knowledge`, `submit_launch_choices`, `search_web`, `read_url`) | router | Instructions: job, steps, use of facts and knowledge, keep the note short |
| Decision-log file IO (message-log pattern) | `RoutingDecisionLog` | Lines, rotation, tolerant read |

## Ownership Boundaries

- Only the resolver calls `ModelRouter.route`; only `ModelRouter` opens sessions and posts into the conversation; only `submit_launch_choices` settles sessions; only `RouterConversation` creates/restores the router run.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass |
| --- | --- | --- | --- |
| `ModelRouter` | conversation, sessions, time-out | resolver, GraphQL status | Resolver touching sessions or posting messages |
| `RoutingDecisionLog` | files | dispatch success points, receiver, GraphQL | Readers parsing files |

## Dependency Rules

- `agent-collaboration` → `model-routing` through a port (`ModelRouterPort`, `RoutingDecisionRecorder`) owned by `model-routing/domain`.
- `model-routing` → `agent-execution` (run service), `available-agent-runtimes` (report), `config`, app data; never → `agent-collaboration`.
- `agent-tools/model-routing` → `model-routing` services only.

## Interface Boundary Mapping

| Interface | Notes |
| --- | --- |
| `ModelRouterPort.route(request): Promise<ModelRoutingOutcome>` | `{kind:"chosen", choices}` / `{kind:"not_active", reason}` / `{kind:"failed", reason}` |
| `ModelRouter.status(): Promise<ModelRoutingStatus>` | `{enabled, routerLaunch, active, reason?, conversationRunId?}` |
| `CollaboratorLaunchResolver.resolve(plans, base, work: {text, title})` | — |
| `RoutingDecisionRecorder.record(records)` / `RoutingDecisionLog.list({before, limit})` / `RoutingStatistics.forPeriod(days | "all")` | — |
| Tool `submit_launch_choices({requestId, choices:[{address, runtime, model, taskKind, reason}]})` | — |
| Tools `read_routing_knowledge()`, `update_routing_knowledge({text})` | router conversation only |
| Peer: `StartDelegatedRunRequest.task: {text, title}`; `StartDelegatedRunAnswer.launches: RemoteAgentLaunch[]` | clean cut |
| GraphQL: `modelRoutingStatus`, `modelRoutingKnowledge`, `modelRoutingDecisions(before, limit)`, `modelRoutingStatistics(period)`, `modelRoutingTaskKinds`; mutations `setModelRoutingEnabled`, `setModelRouterLaunch`, `setModelRoutingTaskKinds`, `updateModelRoutingKnowledge`, `undoModelRoutingKnowledge`, `openModelRouterConversation` (returns run ID) | — |

## Interface Boundary Check

All singular; identities explicit (`requestId`, agent address, run ID).

## Main Domain Subject Naming Check

| Subject | Name | Note |
| --- | --- | --- |
| Router | Model Router / `ModelRouter` / `autobyteus-model-router` | never bare "router" in code (other routers exist) |
| Choice | launch choice / `choiceReason` | `reason` already means fallback reason |
| Feature | Model Routing | page and switch |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Runtime facts | `AvailableAgentRuntimesService` (303) | Reuse |
| Hidden agent | `internal` (308) | Reuse |
| Agent run lifecycle, restore, input during turn | `AgentRunService`, `AgentRun` | Reuse |
| Tool surfaces | 303 tool pattern | Reuse pattern |
| Append-only log | message-log pattern | Reuse pattern |
| Settings | config modules | Reuse |
| Built-in agent | built-in templates | Extend |

## Subsystem / Capability-Area Allocation

| Area | Owns | Decision |
| --- | --- | --- |
| `model-routing` (new) | router, conversation, sessions, decision log, statistics, knowledge, settings, request text | Create New |
| `agent-tools/model-routing` (new) | three tools + MCP | Create New |
| `agent-collaboration` | order, notes, lifecycle split, remote placement | Extend |
| `remote-collaboration` | receiver, starter, refusals | Extend |
| `run-history` | sources, links | Extend |
| `built-in-agents` | router template | Extend |
| web settings / run-settings | page sections, rows | Extend |

## Draft File Responsibility Mapping

Folded into the final mapping.

## Reusable Owned Structures Check

| Structure | File | Note |
| --- | --- | --- |
| Routing request / outcome / record types | `model-routing/domain/model-routing-types.ts` | One meaning per field |
| Usability rule | `launch-preferences/launch-usability-check.ts` | — |

## Shared Structure / Data Model Tightness Check

- `LaunchConfigurationSource`: `choiceReason`, `taskKind` only with origin `model_router` (discriminated).
- Decision record: `{ recordedAt, node: "this", taskTitle, delegatingRunId, copyAddress, agentAddress, runtimeKind, llmModelIdentifier, source, taskKind?, choiceReason?, notes[] }`.

## Final File Responsibility Mapping

| File | Kind | Concern |
| --- | --- | --- |
| `server/src/model-routing/domain/model-routing-types.ts` | New | Types, ports |
| `server/src/model-routing/model-routing-settings.ts` | New | Four settings |
| `server/src/model-routing/services/model-router.ts` | New | Status, route |
| `server/src/model-routing/services/router-conversation.ts` | New | Ensure/restore/create |
| `server/src/model-routing/services/model-routing-sessions.ts` | New | Sessions, validation |
| `server/src/model-routing/services/routing-request-text.ts` | New | Request text |
| `server/src/model-routing/stores/knowledge-note-store.ts` | New | Note + previous |
| `server/src/model-routing/stores/routing-decision-log.ts` | New | JSONL log |
| `server/src/model-routing/services/routing-statistics.ts` | New | Overview |
| `server/src/agent-tools/model-routing/*` + `agent-tools/mcp/providers/model-routing-tools-mcp-adapter-provider.ts` | New | Tools |
| `server/src/built-in-agents/templates/model-router/{agent.md,agent-config.json}`, `built-in-agent-registry.ts` | New / Modify | Router agent |
| `server/src/launch-preferences/launch-usability-check.ts` | New | Rule |
| `server/src/agent-collaboration/collaborators/{collaborator-launch-resolver,collaborator-admission,catalog-delegation,launch-configuration-notes}.ts`, `domain/launch-configuration-source.ts` | Modify | Order, work text, notes, types |
| `server/src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts`, `root-task-dispatch.ts` + three roots | Modify | Split; record on success |
| `server/src/agent-collaboration/execution/remote/{remote-delegation,remote-refusal-codes}.ts`, `remote-collaboration/{domain/remote-requests,domain/remote-refusals,inbound/remote-delegation-receiver,inbound/remote-team-run-starter}.ts` + channel | Modify | Contract, texts |
| `server/src/run-history/{domain/run-execution-tree-shared-records,store/launch-configuration-source-schema}.ts` + link schema | Modify | Shapes |
| `server/src/api/graphql/types/model-routing.ts` + schema; composition | New / Modify | API, wiring |
| contract packages | Modify | DTOs |
| web `components/settings/model-routing/{ModelRoutingSetupSection,ModelRoutingKnowledgeSection,ModelRoutingDecisionsSection,ModelRoutingOverviewSection}.vue`, `ModelRoutingManager.vue`; run-settings rows; i18n en + zh-CN | New / Modify | Page, rows |
| docs: `collaboration_model.md` CM-12, `GLOSSARY.md`, module docs | Modify | — |

## Applied Patterns (If Any)

Port (`ModelRouterPort`, `RoutingDecisionRecorder`); registry (`ModelRoutingSessions`).

## Target Subsystem / Folder / File Mapping

As above.

## Folder Boundary Check

`model-routing/{domain,services,stores}` mirrors neighbouring subsystems.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

Routing request text (abridged):

```
Routing request req_7f3. Choose a runtime and model for each agent below for this Task, using list_available_agent_runtimes for what this node can run now. Answer with submit_launch_choices (requestId "req_7f3") for every agent listed.
Task: "Design and build the agent runtimes tool …"
Agents to choose for:
- /software_engineering_team/implementation_engineer — Implementation Engineer: implements the design … (must stay on codex_app_server)
- /software_engineering_team/code_reviewer — Code Reviewer: …
Already set: /software_engineering_team/solution_designer → claude_agent_sdk / claude-opus-5-5 (agent default)
Delegated from a run on claude_agent_sdk / claude-opus-5-5.
Task kinds: design, implementation, code review, testing, writing, research, computer use, other.
Your knowledge note:
<current note>
```

Launch note (result):
`implementation_engineer: runs on codex_app_server / gpt-5.6-sol, chosen by the Model Router (implementation): Codex has weekly limit left and is strongest at code here.`

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Optional peer fields with old-peer fallback | Rejected (rule 9) |
| Keeping the lifecycle's old `delegateToNewCopy` | Rejected |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. `LaunchUsabilityCheck` extraction (behavior unchanged); lifecycle split and work text through admission and resolver.
2. Launch-source types, parser, notes, DTOs.
3. `model-routing`: settings, knowledge store, decision log + statistics, sessions, request text, conversation, `ModelRouter`; router template.
4. Tools + MCP adapters.
5. Resolver router step (local and `defaults_only`), usability with report; decision recording on dispatch success and in the receiver.
6. Peer contract both sides; link launches; refusal texts.
7. GraphQL and composition.
8. Web page sections, rows, i18n.
9. Docs; fold the 303 live-agents test into API/E2E.

## Key Tradeoffs

- One long-lived conversation (user's direction) vs per-request runs: shared context and teaching in place, at the cost of context growth (compaction) and serialised turns (input appended to the active turn).
- Report read per resolution only while routing is on (DEC-022 narrowed).
- Decision log as append-only JSONL vs a database table: matches existing run-data storage, no schema migration.

## Risks

- RSK-001 poor choices (visible reasons, knowledge, page statistics).
- RSK-002 router cost (only uncovered agents; user's router model).
- RSK-003 routing inside the root gate (≤ 60 s + report read); FU-002.
- RSK-004 the router conversation's context grows (compaction; the knowledge note holds what must last).
- RSK-005 a weak router model never calls `submit_launch_choices` → failure after 60 s, visible.

## Guidance For Implementation

- Tests use a fake router (a stub agent run that calls the tool) and recorded 303 reports; one live API/E2E run with a real router model, plus the folded 303 live-agents test.
- Wording of notes and refusals exactly as `launch-selection-order.md` §§ 5–7.
- The decision tool and knowledge tools check the sender is the node's router conversation.
