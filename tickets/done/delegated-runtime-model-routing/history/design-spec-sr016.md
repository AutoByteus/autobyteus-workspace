# Design Spec — Model Router Core (autobyteus-32)

## Solution And Approval Basis

- Current solution revision ID: `SR-016` (the user: one routing request at a time, sent only when the Model Router agent is idle; SR-015 passed ARCH-REV-002; previous `history/design-spec-sr015.md`)
- Approved requirements baseline: `requirements-doc.md` SR-016 with `launch-selection-order.md` SR-016 and the linked Product UI/UX specification `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/delegated-runtime-model-routing/ui-ux-spec.md` (Approved; design revision `ce3e417`).
- Design status: `Ready`
- Canonical investigation-notes path: `tickets/in-progress/delegated-runtime-model-routing/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `docs/design-cases.md` (Cases 1–7, incl. the 303 additions), `GLOSSARY.md`, `collaboration_model.md` (CM-10, CM-12), `data_migration_guideline.md` §§ 2–3 (read 2026-10-24/25 in this conversation); `solution-designer` SKILL.md (re-read 2026-10-26); the Product UI/UX specification, `design-review-notes.md` (data per screen) and `mock-boundaries.md` (Model Routing).
- Project design-principle conflicts or discrepancies: none.

## SR-012 Server-Side Refinements (architecture reviewer's preliminary points, 2026-10-26; still in force)

1. **Time bounds (point 1).** Evidence A-28: Codex's default MCP `tool_timeout_sec` is 60 s and our Codex Agent Tools MCP config sets only `startup_timeout_sec`; the peer client bounds every request at 20 s (`peer-client.ts:43-44`). Contract:
   - **Routing budget 40 s** (one `ReadDeadline` for the report read, ≤ 18 s by autobyteus-303, and the router's valid decision in the time left). Over budget → router failure (REQ-006).
   - **Local:** a routed `delegate_task` answers within ~50 s (routing ≤ 40 s + resolution and start), under Codex's 60 s.
   - **Peer:** the start request (`startDelegatedRun`) gets its own bound **50 s** (`PEER_START_REQUEST_TIMEOUT_MS`); other peer calls keep 20 s. B's routing (≤ 40 s) plus its start fit inside it. If A still times out (network), B's prepared Agent run expires without a work packet and a peer-started Team is shut down when idle (existing mechanisms, autobyteus-245/247), so no copy is left running; A reports the time-out.
   - **Other runtimes' tool-call time-outs** (Claude SDK, Antigravity, Grok) are verified live in API/E2E: a routed delegation that takes ~45 s from an agent on each runtime must complete as a tool result (the folded 303 live-agents test is extended for it). If a runtime cuts earlier, that is a Design Impact back to the Solution Designer.
2. **Decision records only while Model Routing is on (point 2).** REQ-012 amended; `RoutingDecisionLog.record` is called only when the resolution ran with Model Routing on; with it off nothing is written (REQ-002).
3. **Model Router agent run recreation (point 3).** One rule: the agent's run is reused when its recorded runtime **and** model equal the current router settings and it restores; otherwise a new run starts with the current settings. The previous run stays in history as an internal agent's run (not deleted); `knowledge.md` carries over (it is in the agent's workspace, outside the run).
4. **Smaller points (point 4).**
   - `submit_launch_choices` for an unknown, answered or expired `requestId` returns: "Routing request <id> is no longer open (answered or timed out); nothing was changed." No effect.
   - A failed router turn fails the sessions it carries at once: `ModelRouter` posts each request with an input lifecycle observer (`agent-run.ts:186-191`); when the turn that received the request ends without the session being settled (turn failed, interrupted, or completed without a decision), the session fails with that reason instead of waiting for the budget.
   - Requirements baseline line and supplement status corrected (SR-012).

## Requirement Note (SR-010, DEC-022 narrowed)

The node's runtime report (autobyteus-303) takes 2–5 s typical, up to 18 s, and the launch resolution runs inside the delegating root's gate (A-02). Applying the "skip a blocked default" rule with Model Routing off would add that read to every delegation of every user, including those who never turn the feature on. DEC-022 is therefore narrowed by the Solution Designer: the blocked-default skip (supplement U4b) applies **only while Model Routing is on**; with it off, nothing changes (REQ-002 "Off: no new behavior"). Recorded in requirements SR-010; the user is informed.

## Current-State Read

- Fresh delegated copies get their launch from `CollaboratorLaunchResolver.resolve(plans, base)` (`collaborator-launch-resolver.ts:92-230`, A-01): agent default → team default → the run root's launch (`inherited`) or, on a peer (`defaults_only`), refusal (`CollaboratorNoDefaultLaunchError`). Usability = availability (`RuntimeAvailabilityService`) + one `validateMany`. Skipped layers become `LaunchConfigurationFallback`s rendered by `launchNotesOf`.
- Placement is resolved before the lifecycle reads a saved Task (`root-task-execution-lifecycle.ts:137-173`, A-03), so the Task text and identity are not available to launch resolution today; the lifecycle already carries `DelegatedProjectTask {taskKey, projectId}` once the Task is read (`task-execution-input.ts:32`, `root-task-execution-lifecycle.ts:157`).
- With auto-approve, Codex runs `danger-full-access` and Claude's built-in tools (Bash, Write, Edit) are allowed through our permission coordinator; Antigravity always skips permissions; Grok uses `yoloMode` (A-29). The definition's tool list limits only our own tools.
- The Workspaces list shows every registered or active filesystem workspace, even with no visible run (`workspace-manager.ts:155-162`; web `runHistoryReadModel.ts`), while history leaves out hidden internal agents' runs (A-30).
- System notices into a busy run use `AgentInputUserMessage(text, SenderType.SYSTEM, …, {sender_id})` through `AgentRun.postUserMessage` (`skill-update-notice-builder.ts:54-60`).
- The peer start request carries no Task text and the answer no launches (`remote-requests.ts:42-82`); CM-12 states the default-only rule.
- autobyteus-303 provides `AvailableAgentRuntimesService.read()` (single-flight; installed + signed-in runtimes, models with `blocked`, limits) and the tool `list_available_agent_runtimes` (local + Agent Tools MCP).
- autobyteus-308 provides `"internal": true` and `InternalAgentVisibility`; built-in agents are excluded from collaboration (`EXCLUDED_AGENT_DEFINITION_IDS`).
- A posted user message during an active turn is appended to that turn (`agent-run.ts:185-215`, `append_to_active_turn`, A-21); runs restore by ID (`AgentRunService.restoreAgentRun`).
- Settings pattern: `AUTOBYTEUS_*` keys read through config modules on each use; Settings → Model Routing page exists with "Agent runtimes now" (303).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: new `model-routing` subsystem (routing service, the Model Router agent owner, sessions, decision log, statistics, settings), one agent tool with its MCP adapter, a built-in agent template, a run-config workspace confinement in two backends, an internal-workspace rule, changes to the launch resolver, the task lifecycle and three roots, the peer contract on both sides, run-history launch sources and remote links, two DTO packages, GraphQL, and four page sections plus run Settings rows; about 50 source files plus tests.
- Architectural risk: `High`
- Risk rationale: a long-lived system-owned, auto-approved agent with file tools that reads web pages (confinement per runtime); new persisted stores (decisions, the agent's run state, its workspace); changed peer contract; launch resolution waiting on a router inside the root gate; new tools whose effects (decisions) start other agents.
- Escalation trigger: a router failure that could start an agent on an unusable or blocked launch; any need to change the root gate; any data migration.

## Architecture Investigation Evidence

| ID | Source | Observation | Decision Supported |
| --- | --- | --- | --- |
| A-01…A-03, A-13 | resolver, roots' gates, lifecycle, temp workspace (investigation notes) | as Current-State Read | Router step in the resolver; lifecycle split (the router runs in its own internal workspace since SR-014, A-29/A-30) |
| A-20 | `available-agent-runtimes-service.ts:150-190` (autobyteus-303) | Single-flight read of all runtimes; report has `blocked` per model | One report per resolution while routing is on; the router's tool shares a read in progress |
| A-21 | `agent-execution/domain/agent-run.ts:185-215` | Input during an active turn is appended to it (Codex, Claude) | Not relied on since SR-016: requests are sent one at a time when the agent is idle |
| A-33 | `inputCapabilities.activeTurnAppend` per backend | Only Codex and Claude append to a running turn; others queue for a later turn | SR-016: the server's own queue, the same on every runtime |
| A-22 | 303 measurements (2–5 s typical, ≤ 18 s); A-02 (resolution inside the root gate) | A report read on every delegation is a real cost | DEC-022 narrowed (Requirement Note) |
| A-23 | `built-in-agents/built-in-agent-registry.ts`, bootstrapper | Built-in agents are rewritten from templates at startup; excluded from collaboration | Router as built-in template with `"internal": true` |
| A-24 | `run-history/store/message-log.ts` | Append-only JSONL log with rotation and tolerant lines | Decision log follows the pattern |
| A-25 | `services/server-settings-service.ts`; `config/*-setting.ts` | Registered settings + config modules read on use | Model Routing settings |
| A-28 | Codex MCP `tool_timeout_sec` 60 s; peer client 20 s | Time bounds | 40 s routing, 50 s peer start (SR-012) |
| A-29 | `codex-thread-bootstrapper.ts:168-172`; `claude-session-tooling-options.ts:143-155`, `claude-session-tool-use-coordinator.ts:83-113`; `agy-stream-process.ts:36`; `grok-build-session-profile.ts:33-35` | Native shell/file tools are present under auto-approve on Codex/Claude; Antigravity/Grok cannot be confined from our side | Run-config confinement for Codex (sandbox) and Claude (user settings only; no shell tools; writes checked in a `PreToolUse` hook, SR-015); FU-005 |
| A-30 | `workspace-manager.ts:155-162`; `runHistoryReadModel.ts:113-223`; `agent-run-history-service.ts:76-86` | A workspace whose only runs are hidden still shows | Internal-workspace rule by location |
| A-31 | `skill-update-notice-builder.ts:54-60`, `skill-update-notice-service.ts:196` | System notice into a busy run: SYSTEM sender with `sender_id`, through `postUserMessage` | Routing request posted the same way, sender `system.model_router` |

## Intended Change

When Model Routing is on and an agent of a fresh delegated copy has no usable default (now including "blocked by a used-up limit"), the launch resolver asks `ModelRouter`. It posts one routing request, as a system notice, into the node's single, long-lived run of the built-in, internal Model Router agent, which works in its own internal workspace, and waits up to 40 s for a decision submitted through `submit_launch_choices`, validated against the node's runtime report. Valid choices start the agents with source "Model Router", a reason and the router's own task-kind label; failures fall back visibly (this node) or refuse clearly (peer). Each node records the copies resolved on it (with the Task they serve) in a decision log that feeds the Model Routing page's Decisions and Overview, as the approved UI/UX specification shows. The router keeps its knowledge in `knowledge.md` in its workspace, written with its file tools and taught by talking to it; the server includes the file in every routing request. The router's file tools are confined to its workspace where the runtime allows it.

## Change Scope (Mandatory)

- In scope: UC-001…UC-005, UC-007 (UC-006 moved out). Areas: `model-routing` (new subsystem), `agent-tools/model-routing` (the decision tool) + MCP provider, built-in agent template `model-router`, `workspaces` (internal-workspace rule), `agent-execution` (run-config confinement: domain, run metadata, Codex and Claude backends), `agent-collaboration/collaborators` (resolver, admission, placement, notes), `agent-collaboration/execution/task` (lifecycle split) and the three roots, `agent-collaboration/execution/remote` + `remote-collaboration` (peer contract), `run-history` (launch source, remote link launches), contract packages, GraphQL, web (the Model Routing page per the UI/UX specification, run Settings rows, remote rows), docs (CM-12, GLOSSARY, module docs), and folding the 303 live-agents test (`codex/available-agent-runtimes-live-agents`) into this ticket's API/E2E coverage.
- Derived consumers:

| Changed structure | Consumer | Decision |
| --- | --- | --- |
| `LaunchConfigurationSource` (+ origin `model_router` with `choiceReason`, `taskKind`; fallback layer `model_router`; reasons `blocked`, `signed_out`, `router_not_active`, `router_failed`) | `parseLaunchConfigurationSource`; `launchNotesOf`; team/collaboration DTO packages; web `runMemberTree`, `RunMemberRow`, `delegatedLaunchRows` | Extend lists; notes and labels; tolerant readers |
| Remote links (+ optional launches) | remote-link parser, `remoteTaskExecutionDtoSchema` (both packages), web Settings | Optional; DTO carries; read-only remote rows |
| Peer start request/answer | channel client + route, receiver, team starter | Clean cut (DESIGN.md rule 9) |
| `CollaboratorNoDefaultLaunchError` / refusal texts | `peerRefusalText`, `REMOTE_REFUSAL` | New wording per supplement § 6; new code `MODEL_ROUTER_FAILED` |
| CM-12 text | `collaboration_model.md` | Updated |
| `AgentRunConfig` (+ `toolConfinement: "workspace" \| null`) | run metadata store/restore; Codex thread bootstrap; Claude session tooling (setting sources, disallowed tools, `PreToolUse` hook); other backends ignore it | Optional, absent = none; set only by `ModelRouterAgent` today |
| `WorkspaceManager.listVisibleWorkspaces` | GraphQL `workspaces`; web Workspaces tree | Leaves out internal workspaces while internal agents are hidden |

- Deliberately left alone: configured placements, existing copies, user launches, application launches; the root gate (RSK-003, FU-002); model settings choice; runtime read speed (303 FU-005); learning from outcomes (own Task).
- Follow-ups: FU-002 (routing outside the root gate, if latency shows it), FU-003 (GLM, unchanged), FU-004 (Reconnect must not mark internal agents' runs missing), FU-005 (confinement for Grok/Antigravity).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Spine |
| --- | --- | --- |
| BEH-001 | REQ-001, 004..006, 009; AC-001, 004, 006 | DS-001, DS-003, DS-004 |
| BEH-002 | REQ-001, 006, 009; AC-005 | DS-002 |
| BEH-003 | REQ-001; AC-003 | DS-001 (usability) |
| BEH-004 | REQ-009; AC-012 | DS-006 |
| BEH-005 | REQ-002, 003, 007, 008, 010..012; AC-002, 007..009, 011 | DS-005, DS-007, DS-008 |
| BEH-007 | REQ-002; AC-002 | — (unchanged path when off) |

## Relevant Supplemental Task Artifacts

| Artifact | Relationship |
| --- | --- |
| `launch-selection-order.md` (SR-014) | The resolver and `ModelRouter` implement §§ 2–7 one to one; § 2 U4b applies only while Model Routing is on (SR-010) |
| Product UI/UX specification (linked, Product-owned) | Normative for the page, run Settings rows and result lines: UIS-001..008, TR-001..014, VIS-001..026, labels in `modelRoutingSettings.ts`/`runSettings.ts` (en, zh-CN); its Data, Contract And Mock Boundaries table is met by § Interface Boundary Mapping |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `Yes`, local: launch resolution happens before the Task text exists (A-03).
- Structural triggers: *Capability-area reuse* (agent runs, settings, append-only log, runtime report, tool pattern) → reused; *Several kinds or forms* (this node vs peer, agent vs team, description vs `task_id`, Model Router agent run new vs restored) → each traced; *Split sequence* ruled out: the resolver calls `ModelRouter.route` and applies its outcome; `ModelRouter` calls `ModelRouterAgent`, sessions and the log itself; *Behavior by absence* ruled out: "router not active" and "router failed" are explicit outcomes; *Repeated coordination*: usability rule stays one owner (`LaunchUsabilityCheck`).
- Root cause classification: `Missing Invariant` (no Task-aware layer) + the local ordering defect.
- Refactor needed now: `Yes`, small: split the lifecycle's `delegateToNewCopy` into `prepareNewCopyWork` + `dispatchNewCopy` so the work text exists before placement; extract the resolver's candidate check into `LaunchUsabilityCheck`.
- Intentional deferrals: routing outside the root gate (FU-002).

## Terminology

- **Model Router** (GLOSSARY): the built-in, internal agent definition `autobyteus-model-router` that chooses runtimes and models for delegated agents no usable default covers.
- **Model Router agent**: the node's one long-lived Model Router agent — one agent run (an ordinary agent run, kept across restarts) in its own internal workspace. Never called a "conversation" (user, SR-015). In code: `ModelRouterAgent`.
- **Model Router agent workspace**: `<appData>/internal-workspaces/autobyteus-model-router/`.
- **Internal workspace**: a workspace under `<appData>/internal-workspaces/`; listed only while internal agents are shown.
- **System-owned run**: an agent run created and owned by a server service (here `ModelRouterAgent`), marked in its run metadata; never a collaboration member.
- **Routing request**: one system notice sent to the Model Router agent for one delegation; identified by `requestId`.
- **Launch choice**: the router's answer for one agent (runtime, model, task kind, reason).
- **Knowledge file**: `knowledge.md` in the agent's workspace, the Model Router agent's own durable memory.
- **Task kind**: the router's short free-text label for a choice (1–40 characters; grouped ignoring letter case).
- **Decision record**: one line per agent of a fresh delegated copy resolved on this node (time, Task identity, delegation, launch, source, task kind, reason, notes).

## Legacy Removal Policy (Mandatory)

- Obsolete: `CollaboratorLaunchResolver.check` (moved to `LaunchUsabilityCheck`); `RootTaskExecutionLifecycle.delegateToNewCopy(context, input, placement)` (split). Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

| Subject | Change | Decision |
| --- | --- | --- |
| Launch source in run-history trees | new origin/layer/reason values; optional `choiceReason`, `taskKind` | `Directly Usable — No Migration` (tolerant lists; absent = not routed) |
| Remote links | optional `launch` per agent / member | `Directly Usable — No Migration` |
| Run metadata (`AgentRunConfig`) | optional `toolConfinement` | `Directly Usable — No Migration` (absent = none) |
| `<appData>/internal-workspaces/autobyteus-model-router/` with `knowledge.md` | new folder, registered as a workspace on first use; the file is the router's own | New; folder created on first ensure; absent file = no knowledge |
| `<appData>/model-routing/decisions_active.jsonl` (+ sealed `decisions_NNNNNN.jsonl`) | new append-only log (message-log pattern, A-24); records carry Task identity (§ SR-014 D1) | New; unreadable line skipped with a warning (DESIGN.md rule 7) |
| `<appData>/model-routing/model-router-agent.json` | `{ runId, runtimeKind, llmModelIdentifier }` | New; missing or unreadable → a new agent run |
| Run metadata `systemRunOwner` | optional `"model_router"` | `Directly Usable — No Migration` (absent = an ordinary run) |
| Settings `AUTOBYTEUS_MODEL_ROUTING_ENABLED`, `AUTOBYTEUS_MODEL_ROUTER_RUNTIME`, `AUTOBYTEUS_MODEL_ROUTER_MODEL` | new keys | absent → off / unset |

Migration guideline § 2: no migration (tolerant readers, new files); availability unaffected (a broken store disables only its feature part); no schema versions. The SR-012 knowledge store and task-kind setting are not built.

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | `delegate_task(address)` on this node | copy started; result with notes; decision records | Root (sequence) → `CollaboratorLaunchResolver` (launch) |
| DS-002 | Primary | `delegate_task` with `node` | peer run started with launches; link + notes on A; records on B | `RemoteDelegation` (A) / `RemoteDelegationReceiver` (B) |
| DS-003 | Bounded local | resolver asks `ModelRouter.route` | validated choices or failure | `ModelRouter` |
| DS-004 | Primary | router calls `submit_launch_choices` | session settled or error returned | `ModelRoutingSessions` |
| DS-005 | Primary | Model Routing page | status, settings, decisions (Task groups), statistics; talk to the router | GraphQL → `model-routing` owners |
| DS-006 | Return | recorded launch sources | notes and Settings rows | `launchNotesOf`, DTO projection |
| DS-007 | Primary | the user talks to the Model Router agent | it rewrites `knowledge.md` with its file tools; the next request carries it | the agent (file); `ModelRouterAgent` (read) |
| DS-008 | Primary | Workspaces list | internal workspaces left out while internal agents are hidden | `WorkspaceManager` + `InternalWorkspaces` |

## Primary Execution Spine(s)

- DS-001: `delegate_task → Root (gate) → RootTaskExecutionLifecycle.prepareNewCopyWork [work text, title, Task identity] → resolveDelegationPlacement(work) → CollaboratorAdmission.catalogTaskSource(work) → CollaboratorLaunchResolver.resolve(plans, base, work) → [routing on: AvailableAgentRuntimesService.read → LaunchUsabilityCheck (incl. blocked) → ModelRouter.route (DS-003)] → RootTaskExecutionLifecycle.dispatchNewCopy → dispatchTaskCopy → [routing on: RoutingDecisionLog.record] → result + launchNotes`
- DS-002 (A): `delegate_task(node) → Root (gate) → RemoteDelegation.planActivation → startDelegatedRun(task) →` (B) `RemoteDelegationReceiver.start → catalogTaskSourceOf(work) → resolver (defaults_only, B's ModelRouter) → prepare run / RemoteTeamRunStarter → answer {run IDs, launches} → work packet arrives → RoutingDecisionLog.record (B)` → (A) `link with launches → launchNotes`
- DS-003: `ModelRouter.route(request) → status() [switch, router launch usable in the report] → ModelRouterAgent.ensureRun() [restore by stored runId when runtime+model equal the settings, else ensureWorkspace() and create with the router launch, auto-approve, toolConfinement "workspace", systemRunOwner "model_router"] → ModelRoutingSessions.open(requestId, request, report) → RoutingRequestQueue.enqueue → [wait until the agent is idle and the request is first in line; budget ends while waiting → fail "the Model Router was busy", never sent] → ModelRouterAgent.readKnowledge() → run.postUserMessage(SYSTEM notice, sender system.model_router, routing request text) → await settled | 40 s routing budget | the carrying turn ends unsettled (input lifecycle observer) → sessions.close → outcome`
- DS-004: `submit_launch_choices(requestId, choices) → sender is the Model Router agent's run? → ModelRoutingSessions.submit → validate (every agent; usable and not blocked in the session's report; required runtime; task kind 1–40 chars; reason present) → settle | error text to the router`
- DS-008: `GraphQL workspaces → WorkspaceManager.listVisibleWorkspaces → [internal agents hidden: drop roots under InternalWorkspaces.root] → web tree`; the router's history rows already follow 308.

## Spine Narratives (Mandatory)

| Spine | Narrative |
| --- | --- |
| DS-001 | Inside the gate the lifecycle first validates input and reads a saved Task, so the work text and Task identity exist (`task_id` → that Task; description → the created Task with no Project; a task agent delegating → its copy's latest-assigned Task); placement then resolves. With Model Routing on, the resolver reads the node's report once (single-flight), checks configured layers including sign-in and blocked models, and asks the router for uncovered agents; it assembles launches and sources, falling back to the inherited launch with a note on router failure. Dispatch starts the copy; with Model Routing on, the decision log records every agent's launch with the Task identity; the result carries notes. With Model Routing off, the path is today's. |
| DS-002 | A sends the Task text, title and identity with the start request; B resolves like a local copy without the inherited layer, using B's router when B's Model Routing is on; B keeps the decision records with the prepared run and writes them when A's work packet arrives (a start A abandons expires with no record; ARCH-REV-001 residual risk), with A's node name and no Open run on B's page; B answers with launches (source, reason, task kind); A keeps them on the link for notes and Settings rows and writes no decision record (user, rounds 13–16). Refusals are worded on A. |
| DS-003 | `ModelRouter` is the one owner of a routing: it checks the router is active, makes sure the Model Router agent's run exists, opens a session for the request (holding the report it was decided against), includes the current `knowledge.md` text, posts the request as a system notice (sender `system.model_router`, the skill-update-notice pattern, A-31) with an input lifecycle observer and waits for the session to settle; the 40 s budget or the carrying turn ending unsettled closes the session as a failure (SR-012). **One routing request at a time (SR-016, user):** `RoutingRequestQueue` sends the next request only when the agent's run is idle (its previous turn ended — answered, failed or timed out — and no other input is running), in arrival order; the 40 s budget starts when the request is created and includes the wait. |
| DS-004 | The decision tool accepts only the node's Model Router agent's run as sender, validates against the session and settles it; an invalid decision returns the reasons so the router corrects within the time limit. |
| DS-005 | The page reads `modelRoutingStatus` (reason codes), decisions (Task groups, paged, source filter) and statistics (period), and sets the switch and the router runtime/model; "Talk to the router" calls `openModelRouterAgent`, which ensures the agent's run and returns its run ID (autobyteus-308 REQ-008). Layout and texts per the UI/UX specification. |
| DS-007 | The user talks to the Model Router agent; it reads and rewrites `knowledge.md` with its runtime's file tools inside its workspace (instructions: keep it short, record preferences and lessons). The server never writes the file; `ModelRouterAgent.readKnowledge()` reads it for each request (first 16 KB; beyond that, the request says the file was cut and asks the router to shorten it). |
| DS-008 | `InternalWorkspaces` owns the root folder and the rule "a workspace whose root is under it is internal"; `WorkspaceManager.listVisibleWorkspaces` leaves those out while the show-internal-agents setting is off. Opening a run by ID still resolves its workspace (`getOrCreateWorkspace`). |

## Spine Actors / Main-Line Nodes

Roots, `RootTaskExecutionLifecycle`, `CollaboratorAdmission`, `CollaboratorLaunchResolver`, `LaunchUsabilityCheck`, `ModelRouter`, `ModelRouterAgent`, `ModelRoutingSessions`, `RoutingDecisionLog`, `RemoteDelegation`, `RemoteDelegationReceiver`, `InternalWorkspaces`.

## Ownership Map

- `CollaboratorLaunchResolver`: the selection order (supplement §§ 3–5): layers, which agents need routing, applying the router outcome, inherited fallback / refusal, sources and fallbacks. Calls `ModelRouter.route` only when an agent needs it.
- `LaunchUsabilityCheck`: U1–U5 as today, plus (routing on) U3 signed-in and U4b blocked from the report.
- `ModelRouter` (`model-routing/services/model-router.ts`): status (switch, router launch, active or why not), one routing (session, post, wait, time-out), never decides layer order.
- `ModelRouterAgent` (`model-routing/services/model-router-agent.ts`): the node's one Model Router agent: `ensureRun()` (reuse when the recorded runtime and model equal the settings and it restores; otherwise `ensureWorkspace()` and create the run with the current settings, auto-approve, `toolConfinement: "workspace"`, `systemRunOwner: "model_router"`), single-flight; `ensureWorkspace()` (folder from `InternalWorkspaces`, registered workspace); `readKnowledge()`; stores `model-router-agent.json` (SR-012). The only creator of the agent's run.
- System-owned runs (AR-001): `AgentRunMetadata.systemRunOwner` is set at creation by the owning service and kept on restore; `isCollaborationEligibleStandaloneRun` returns false for it (as for application-owned runs), so the run is activated without a member context and gets no automatic collaboration tools; Agent Tools MCP still serves it (`kind: "agent"`, `agent-tool-mcp-session-service.ts:81-92`), so `list_available_agent_runtimes` and `submit_launch_choices` stay available.
- `InternalWorkspaces` (`workspaces/internal-workspaces.ts`): root `<appData>/internal-workspaces/`, `pathFor(agentDefinitionId)`, `isInternal(rootPath)`.
- Run-config confinement: `AgentRunConfig.toolConfinement`; Codex bootstrapper maps `"workspace"` to sandbox `workspace-write` on thread start (approval policy unchanged; thread parameters override config files; `workspace-write` also allows Codex's temp roots — stated in the module doc); Claude session tooling (AR-002), for a confined run: setting sources `["user"]` only (the workspace's `.claude/settings*.json` would be writable by the agent itself: allow rules and hooks), the shell tools in `disallowedTools`, and a programmatic `PreToolUse` hook that denies Write/Edit/MultiEdit/NotebookEdit whose path resolves outside the workspace root (hooks are evaluated before allow rules, so a user-level allow rule cannot bypass it); AutoByteus: its tool list (no `run_bash`); Antigravity/Grok: not supported (FU-005).
- `ModelRoutingSessions`: pending sessions by `requestId`; validation; settle once.
- `RoutingRequestQueue` (`model-routing/services/routing-request-queue.ts`, owned and used only by `ModelRouter`): FIFO of waiting requests; releases the first when `ModelRouterAgent` reports the run idle (run status events); drops a request whose budget ended while waiting. One request in flight at a time.
- `RoutingDecisionLog`: append and read decision records (Task groups, source filter); `RoutingStatistics` derives the Overview from it for a period.
- `ModelRoutingSettings` (`model-routing/model-routing-settings.ts`): the three settings, read on use.
- Roots: three-step sequence only (prepare → resolve placement → dispatch).

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Owner | Must Not Own |
| --- | --- | --- |
| Tool `submit_launch_choices` (local + MCP) | sessions | Validation rules |
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
- `ModelRouterAgent.ensureRun`: `stored state? → recorded runtime and model equal the settings? → restore run → ok: use | otherwise: ensureWorkspace() → create new run (agent workspace, auto-approve, toolConfinement "workspace", systemRunOwner "model_router", router launch) → store state` (previous run stays in history; SR-012; the knowledge file stays in the workspace).

## Off-Spine Concerns Around The Spine

| Concern | Serves | Responsibility |
| --- | --- | --- |
| Routing request text (`routing-request-text.ts`) | `ModelRouter` | Wording: request ID, Task, agents, covered members, required runtimes, delegating launch, the `knowledge.md` text, the task-kind labels used on this node (most used first), how to answer |
| Model router built-in template (`built-in-agents/templates/model-router/`: `agent.md`, `agent-config.json` with `"internal": true` and tools `list_available_agent_runtimes`, `submit_launch_choices`, `search_web`, `read_url`, `read_file`, `write_file`, `edit_file`) | router | Instructions: job, steps, use of facts, keep `knowledge.md` short and update it when taught, reuse task-kind labels |
| Decision-log file IO (message-log pattern) | `RoutingDecisionLog` | Lines, rotation, tolerant read |

## Ownership Boundaries

- Only the resolver calls `ModelRouter.route`; only `ModelRouter` opens sessions and sends routing requests to the agent; only `submit_launch_choices` settles sessions; only `ModelRouterAgent` creates/restores the agent's run and sets `systemRunOwner`; only the router writes `knowledge.md`; only `InternalWorkspaces` decides what is internal.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass |
| --- | --- | --- | --- |
| `ModelRouter` | the Model Router agent's run, sessions, time-out | resolver, GraphQL status | Resolver touching sessions or posting messages |
| `ModelRouterAgent` | creating/restoring the agent's run, its workspace, its run metadata markers | `ModelRouter`, GraphQL `openModelRouterAgent` | Anyone else creating a run of `autobyteus-model-router` |
| `RoutingDecisionLog` | files | dispatch success points, receiver, GraphQL | Readers parsing files |

## Dependency Rules

- `agent-collaboration` → `model-routing` through a port (`ModelRouterPort`, `RoutingDecisionRecorder`) owned by `model-routing/domain`.
- `model-routing` → `agent-execution` (run service), `available-agent-runtimes` (report), `workspaces` (`InternalWorkspaces`, `WorkspaceManager`), `config`, app data; never → `agent-collaboration`.
- `workspaces` → `config` (show-internal-agents setting); never → `model-routing`. Backends read `toolConfinement` from the run config only.
- `agent-tools/model-routing` → `model-routing` services only.

## Interface Boundary Mapping

| Interface | Notes |
| --- | --- |
| `ModelRouterPort.route(request): Promise<ModelRoutingOutcome>` | `{kind:"chosen", choices}` / `{kind:"not_active", reason}` / `{kind:"failed", reason}` |
| `ModelRouter.status(): Promise<ModelRoutingStatus>` | `{enabled, routerLaunch, active, reasonCode, reasonParams, reasonText, agentRunId?}`; codes `OFF`, `ROUTER_NOT_SET`, `RUNTIME_UNAVAILABLE`, `SIGNED_OUT`, `MODEL_NOT_OFFERED`, `MODEL_BLOCKED {until, limit}`, `REPORT_UNREADABLE` |
| `CollaboratorLaunchResolver.resolve(plans, base, work: {text, title, task: {taskId, taskKey?, projectId?}})` | — |
| `RoutingDecisionRecorder.record(records)` / `RoutingDecisionLog.listTaskGroups({before, limit, source?})` / `RoutingStatistics.forPeriod(7 \| 30 \| "all")` | Groups newest delegation first; source filter applied before paging |
| Tool `submit_launch_choices({requestId, choices:[{address, runtime, model, taskKind, reason}]})` | sender must be the Model Router agent's run; unknown/expired `requestId` text (SR-012) |
| `AgentRunConfig.toolConfinement: "workspace" \| null` | Codex and Claude honour it; others ignore it |
| `AgentRunMetadata.systemRunOwner?: "model_router"` | read by `isCollaborationEligibleStandaloneRun` |
| `InternalWorkspaces.pathFor(definitionId)`, `.isInternal(rootPath)` | — |
| Peer: `StartDelegatedRunRequest.task: {text, title, taskKey?, projectId?, taskId}`; `StartDelegatedRunAnswer.launches: RemoteAgentLaunch[]` (with source, `choiceReason`, `taskKind`) | clean cut |
| GraphQL queries `modelRoutingStatus`, `modelRoutingDecisions(before, limit, source: ROUTER \| NOT_ROUTER)`, `modelRoutingStatistics(period)`; mutations `setModelRoutingEnabled`, `setModelRouterLaunch`, `openModelRouterAgent` (returns run ID; the UI reference's mock name `openModelRouterConversation` is not normative) | Meets the UI/UX specification's Data, Contract And Mock Boundaries table |

## Interface Boundary Check

All singular; identities explicit (`requestId`, agent address, run ID).

## Main Domain Subject Naming Check

| Subject | Name | Note |
| --- | --- | --- |
| Router | Model Router (definition `autobyteus-model-router`) / `ModelRouter` (routing service) / `ModelRouterAgent` (the node's agent: run, workspace, knowledge read) | never bare "router" in code; never "conversation" for the agent or its run (user, SR-015; the product says agent and agent run everywhere) |
| Choice | launch choice / `choiceReason` | `reason` already means fallback reason |
| Feature | Model Routing | page and switch |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Runtime facts | `AvailableAgentRuntimesService` (303) | Reuse |
| Hidden agent | `internal` (308) | Reuse |
| Agent run lifecycle, restore, input during turn | `AgentRunService`, `AgentRun` | Reuse |
| Tool surfaces | 303 tool pattern | Reuse pattern |
| System notice into a run | skill-update notice (A-31) | Reuse pattern |
| Workspace for a run | `WorkspaceManager.ensureWorkspaceByRootPath` | Reuse; internal rule added |
| Append-only log | message-log pattern | Reuse pattern |
| Settings | config modules | Reuse |
| Built-in agent | built-in templates | Extend |

## Subsystem / Capability-Area Allocation

| Area | Owns | Decision |
| --- | --- | --- |
| `model-routing` (new) | routing service, the Model Router agent, sessions, decision log, statistics, settings, request text | Create New |
| `agent-tools/model-routing` (new) | the decision tool + MCP | Create New |
| `workspaces` | internal-workspace rule | Extend |
| `agent-execution` | run-config confinement (domain, metadata, Codex, Claude); system-owned run marker in eligibility | Extend |
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
- Decision record: `{ recordedAt, taskId, taskKey|null, projectId|null, taskTitle, delegatingRunId|null, delegatingAgentName, fromNode|null, copyAddress, copyKind, agentAddress, runtimeKind, llmModelIdentifier, source, taskKind?, choiceReason?, notes[] }` (`delegatingRunId` null and `fromNode` set for a copy started for a peer).

## Final File Responsibility Mapping

| File | Kind | Concern |
| --- | --- | --- |
| `server/src/model-routing/domain/model-routing-types.ts` | New | Types, ports |
| `server/src/model-routing/model-routing-settings.ts` | New | Three settings |
| `server/src/model-routing/services/model-router.ts` | New | Status, route |
| `server/src/model-routing/services/model-router-agent.ts` | New | The agent's run (ensure/restore/create), workspace, knowledge read |
| `server/src/model-routing/services/model-routing-sessions.ts` | New | Sessions, validation |
| `server/src/model-routing/services/routing-request-queue.ts` | New | One request at a time, sent when the agent is idle |
| `server/src/model-routing/services/routing-request-text.ts` | New | Request text |
| `server/src/model-routing/stores/routing-decision-log.ts` | New | JSONL log |
| `server/src/model-routing/services/routing-statistics.ts` | New | Overview |
| `server/src/agent-tools/model-routing/*` + `agent-tools/mcp/providers/model-routing-tools-mcp-adapter-provider.ts` | New | Decision tool |
| `server/src/agent-execution/domain/system-task-notification-senders.ts` | Modify | `MODEL_ROUTER_REQUEST_SENDER_ID = "system.model_router"` |
| `server/src/agent-execution/domain/agent-run-config.ts` + run metadata store/restore (`run-history/store/agent-run-metadata-types.ts`) | Modify | `toolConfinement`, `systemRunOwner` |
| `server/src/agent-execution/services/standalone-agent-run-eligibility.ts` | Modify | system-owned runs are not collaboration-eligible |
| `server/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Modify | sandbox `workspace-write` when confined |
| `server/src/agent-execution/backends/claude/session/{claude-session-tooling-options,claude-session-query-options}.ts`, `runtime-management/claude/client/claude-sdk-setting-sources.ts` | Modify | confined run: setting sources `["user"]`, no shell tools, `PreToolUse` write hook |
| `server/src/workspaces/{internal-workspaces,workspace-manager}.ts` | New / Modify | Internal-workspace rule |
| `server/src/built-in-agents/templates/model-router/{agent.md,agent-config.json}`, `built-in-agent-registry.ts` | New / Modify | Router agent |
| `server/src/launch-preferences/launch-usability-check.ts` | New | Rule |
| `server/src/agent-collaboration/collaborators/{collaborator-launch-resolver,collaborator-admission,catalog-delegation,launch-configuration-notes}.ts`, `domain/launch-configuration-source.ts` | Modify | Order, work text, notes, types |
| `server/src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts`, `root-task-dispatch.ts` + three roots | Modify | Split; record on success |
| `server/src/remote-collaboration/channel/peer-client.ts` (start-request bound 50 s), `server/src/agent-collaboration/execution/remote/{remote-delegation,remote-refusal-codes}.ts`, `remote-collaboration/{domain/remote-requests,domain/remote-refusals,inbound/remote-delegation-receiver,inbound/remote-team-run-starter}.ts` + channel | Modify | Contract, texts |
| `server/src/run-history/{domain/run-execution-tree-shared-records,store/launch-configuration-source-schema}.ts` + link schema | Modify | Shapes |
| `server/src/api/graphql/types/model-routing.ts` + schema; composition | New / Modify | API, wiring |
| contract packages | Modify | DTOs |
| web `components/settings/model-routing/*` (page frame, Configuration, Decisions, Overview; the existing runtimes section restyled), `ModelRoutingManager.vue`; run-settings rows (`RunMemberRow.vue`, `runMemberTree.ts`); stores/GraphQL documents; i18n `modelRoutingSettings.ts`, `runSettings.ts` en + zh-CN | New / Modify | Per the UI/UX specification (UI reference locations are traceability only) |
| docs: `collaboration_model.md` CM-12, `GLOSSARY.md`, module docs | Modify | — |

## Applied Patterns (If Any)

Port (`ModelRouterPort`, `RoutingDecisionRecorder`); registry (`ModelRoutingSessions`).

Also: `toolConfinement` and `systemRunOwner` are general run options, set only by `ModelRouterAgent` today; nothing in the web app is router-specific.

## Target Subsystem / Folder / File Mapping

As above.

## Folder Boundary Check

`model-routing/{domain,services,stores}` mirrors neighbouring subsystems.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

Routing request text (abridged):

```
Routing request req_7f3. Choose a runtime and model for each agent below for this Task, using list_available_agent_runtimes for what this node can run now. Answer with submit_launch_choices (requestId "req_7f3") for every agent listed, each with a short task kind and a one-sentence reason.
Task autobyteus-303: "Design and build the agent runtimes tool …"
Agents to choose for:
- /software_engineering_team/implementation_engineer — Implementation Engineer: implements the design … (must stay on codex_app_server)
- /software_engineering_team/code_reviewer — Code Reviewer: …
Already set: /software_engineering_team/solution_designer → claude_agent_sdk / claude-opus-5-5 (agent default)
Delegated from a run on claude_agent_sdk / claude-opus-5-5.
Task kinds used here so far (reuse one when it fits): implementation (41), code review (17), design (12), writing (5).
Your knowledge.md:
<current text>
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

1. `LaunchUsabilityCheck` extraction (behavior unchanged); lifecycle split; work text, title and Task identity through admission and resolver.
2. Launch-source types, parser, notes, DTOs.
3. `InternalWorkspaces` + `listVisibleWorkspaces` rule; `AgentRunConfig.toolConfinement` + metadata; `systemRunOwner` + eligibility; Codex and Claude confinement.
4. `model-routing`: settings, decision log (Task groups, source filter) + statistics, sessions, request text, `ModelRouterAgent`, `ModelRouter`; router template.
5. Decision tool + MCP adapter.
6. Resolver router step (local and `defaults_only`), usability with report; decision recording on dispatch success and in the receiver.
7. Peer contract both sides; link launches; refusal texts.
8. GraphQL and composition.
9. Web: the page per the UI/UX specification, run Settings rows, i18n.
10. Docs; fold the 303 live-agents test into API/E2E.

## Key Tradeoffs

- One long-lived Model Router agent (user's direction) vs a run per request: shared context and teaching in place, at the cost of context growth (compaction) and one routing request per turn (SR-016: simple and the same on every runtime; in a burst a later request can wait past 40 s and fall back visibly).
- Report read per resolution only while routing is on (DEC-022 narrowed).
- Decision log as append-only JSONL vs a database table: matches existing run-data storage, no schema migration.

## Risks

- RSK-001 poor choices (visible reasons, knowledge, page statistics).
- RSK-002 router cost (only uncovered agents; user's router model).
- RSK-003 routing inside the root gate (≤ 40 s incl. report read); FU-002.
- RSK-010 several routing requests at once (A-33): resolved by SR-016 (one at a time, sent when idle, wait counted in the 40 s budget). Remaining: in a burst, or while the user is talking to the router, a waiting request can run out of time and fall back with "the Model Router was busy" (visible).
- RSK-009 (resolved, AR-001) a system-owned run must never become a collaboration member: `systemRunOwner` in run metadata, read by the eligibility rule, kept on restore.
- RSK-004 the Model Router agent's context grows (compaction; `knowledge.md` holds what must last).
- RSK-005 a weak router model never calls `submit_launch_choices` → failure after 40 s, visible.
- RSK-006 the router reads web pages and has file tools under auto-approve: confined on Codex/Claude; on Antigravity/Grok it runs like any auto-approved agent (user accepted, DEC-023; FU-005).
- RSK-007 opening the router's run while its workspace is not in the visible list: the run view must resolve the workspace by ID (as for any run opened by ID); covered by a web test.
- RSK-008 a router edit leaves `knowledge.md` large: the request carries the first 16 KB and asks the router to shorten it.

## Guidance For Implementation

- Tests use a fake router (a stub agent run that calls the tool) and recorded 303 reports; one live API/E2E run with a real router model, plus the folded 303 live-agents test; live checks of confinement on Codex and Claude (a write outside the workspace is refused; Claude has no shell).
- Real provider keys only from the test vault (TESTING.md); never the user's running AutoByteus or `~/.autobyteus`.
- Wording of notes and refusals exactly as `launch-selection-order.md` §§ 5–7; page texts exactly as the UI/UX specification (en, zh-CN).
- The decision tool checks the sender is the node's Model Router agent's run.
- Tests per runtime that the Model Router agent's tools equal its template list plus the runtime's file tools (no collaboration tools); the Claude live check runs with a user-level allow rule for Write and a `.claude/settings.json` written into the workspace, and a write outside the workspace must still be denied; the Codex live check writes a `.codex/config.toml` into the workspace (asking for full access) and a write outside the workspace must still be refused (thread parameters are expected to win; if not, Design Impact back to the Solution Designer).
- The Task's Done-when includes the user's own check in the desktop app (Project Task autobyteus-32); delivery must not mark it optional.

## SR-013/SR-014 — Data contract for the Product Design (final)

The answers to the Product UI/UX Designer's "Data each screen needs" check; the sections above already include them. D3 (knowledge versioning), D5 (routing-request marker for the UI) and D11's text box are withdrawn by the user's later rounds; kept here for history.


| # | Need | Decision |
| --- | --- | --- |
| D1 | Task identity on the record | Decision record gains `taskKey` (Project Task key, null when not a Project Task), `projectId`, `taskId`, `taskTitle` (Project Task title, else the description's first line). The lifecycle split (§ DS-001, `prepareNewCopyWork`) already makes the saved Task available before resolution, so A-03 no longer blocks this: `task_id` mode → that Task; description mode → the created Task with no Project; a task agent delegating → its copy's latest-assigned Task. `modelRoutingDecisions` returns Task groups (newest delegation first), each with its delegations and per-agent records. |
| D2 | Source filter | `modelRoutingDecisions(before, limit, source: ROUTER \| NOT_ROUTER)`; filtering on the server before paging. |
| D3 | Knowledge save conflicts | `modelRoutingKnowledge` returns `{ text, updatedAt, updatedBy: ROUTER \| USER, hasPrevious }` (metadata in `knowledge.meta.json`, absent = unknown); `updateModelRoutingKnowledge(text, expectedUpdatedAt)` is refused with `KNOWLEDGE_CHANGED` when the note changed meanwhile; `update_routing_knowledge` (router) is never refused. Undo swaps current and previous (so a second undo restores the newer note). `updatedBy` is available; showing it is the Product Design's choice. |
| D4 | Statistics | `modelRoutingStatistics(period)` returns: source totals (agent default, team default, Model Router, inherited); per task kind (router-decided) runtime/model counts; a "not routed" group (records without task kind) with its runtime/model counts; `routerFailures` (records carrying a `router_failed` note). Counts only records resolved on this node. |
| D5 | Routing request marker; router run header | **Withdrawn by the user (rounds 17–18):** the Model Router agent's run is an ordinary run with no special UI (no Internal mark, header name, link strip or routing-request card). Requests are posted as system notices with sender `system.model_router` (kept for the server's own attribution, not needed by the UI); "Open conversation" opens the run by its ID. |
| D6 | Status reason | `modelRoutingStatus` returns `{ enabled, active, reasonCode, reasonParams, reasonText }`: codes `OFF`, `ROUTER_NOT_SET`, `RUNTIME_UNAVAILABLE`, `SIGNED_OUT`, `MODEL_NOT_OFFERED`, `MODEL_BLOCKED {until, limit}`, `REPORT_UNREADABLE`; `reasonText` is the English fallback. The UI translates by code. Delegation notes stay English (agent-facing texts). |
| D7 | Task kind | `submit_launch_choices.taskKind`: free text, trimmed, 1–40 characters; grouping ignores letter case. The routing request lists the node's used labels, most used first (REQ-011 SR-013). No task-kind setting, query or mutation (removed: `modelRoutingTaskKinds`, `setModelRoutingTaskKinds`, `AUTOBYTEUS_MODEL_ROUTING_TASK_KINDS`). |
| D8 | Peer copies on the delegating node | **User decision (Product Design rounds 13–16, 2026-10-26), replacing the round-11 answer:** a node's Decisions list only the decisions resolved on that node. A copy started on a peer is recorded only by the peer (`RoutingDecisionLog` on B, with the delegating node's name and no Open run); A keeps the launches on the remote link for the `delegate_task` result and run Settings rows (REQ-009), and writes no decision record. No node label on the page. |
| D10 | Decisions layout (rounds 13–16) | One block per Task; the Task key links to the Task in Projects (`projectId` + `taskId`), plain text when the Task no longer exists; a team copy is one folded row with its members inside. Task kind stays in the record (Overview, run Settings rows, `delegate_task` result) but is not shown in Decisions rows. Overview counts agents. |
| D11 | Page header (rounds 17–18) | The switch sits on the page title line; the tab is "Configuration" (router runtime/model, "Talk to the router", the knowledge box with Save and "Undo last change"); a status line appears only when routing is on but the router cannot answer (`modelRoutingStatus.active = false` with a reason code). Open with the user: whether "Undo last change" stays (REQ-007 undo). |
| D9 | "View decision" | Located by `delegatingRunId + copyAddress + agentAddress` (all in the record); no decision ID. |
