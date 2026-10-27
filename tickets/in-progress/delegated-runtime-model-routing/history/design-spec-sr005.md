# Design Spec — Runtime/Model Routing For Delegated Work (autobyteus-32)

## Solution And Approval Basis

- Current solution revision ID: `SR-005`
- Approved requirements baseline: `requirements-doc.md` at SR-004, approved by the Solution Designer within the direction after the user decided every `Needs user` decision (2026-10-24). **SR-005 proposes three small requirement deltas (RD-1..RD-3 below) that need the user's confirmation before this design is authoritative.**
- Behavior-defining supplements: `launch-selection-order.md` at SR-004 (approved with the requirements); SR-005 touches its section 4 (RD-3).
- Design status: `Needs Revision` — superseded by the SR-006 direction (built-in internal router, one conversation per node, page, statistics); redone after PRE-001. Kept as SR-005 history.
- Canonical investigation-notes path: `tickets/in-progress/delegated-runtime-model-routing/investigation-notes.md` (§ Architecture Investigation Findings)
- Authorities read (2026-10-24): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (root), `docs/design-cases.md` (Cases 1–7), `GLOSSARY.md`, `autobyteus-server-ts/docs/design/collaboration_model.md` (CM-10, CM-12), `autobyteus-server-ts/docs/design/data_migration_guideline.md` (§ 2, § 3).
- Project design-principle conflicts or discrepancies: none found.

### Requirement deltas proposed by this design (need the user)

| ID | Approved text | Proposed change | Why |
| --- | --- | --- | --- |
| RD-1 | REQ-004a/REQ-004b: the router has the tools and the skill "automatically"; "only the selected router run has these tools" | The system ships the tools and a built-in skill `autobyteus-model-routing`; the router agent **lists them like any agent lists tools and skills**. The Model Router card has one button, "Set up this agent as Model Router", that adds them to the selected agent. The decision tool works only inside a routing run; the read-only environment tools work for any agent that lists them. | Every runtime (AutoByteus, Claude, Codex, Antigravity, ACP/Grok) builds an agent's tools and skills from its definition (`runtime-agent-tool-exposure.ts:45-49`, five callers; skills resolved per backend). "Automatic for routing runs only" would thread a new run flag through all five backends' tool and skill set-up. Listing them on the definition reuses the existing path, and the user sees them on the agent page |
| RD-2 | REQ-004a lists "recent failures" per runtime | Dropped from this ticket. The runtime tool reports availability, sign-in, running agents and usage limits | No component records run failures per runtime today (investigation A-07). The main causes (sign-in, limits) are reported directly; outcome feedback is FU-001 |
| RD-3 | REQ-007 / supplement § 4: active = selected + usable own default | Also requires that the selected agent lists the decision tool `submit_launch_choices`; the card says when it is missing (and offers the set-up button) | Without that tool the router can never answer; an explicit rule is clearer than a 60-second time-out every time |

## Current-State Read

- **Fresh delegated copy (local).** `delegate_task(address)` enters the root's gate (`root-team-run.ts:321-330`, `standalone-agent-run-root.ts:339-340`, `agent-org-run.ts:281-282`), resolves a placement (`catalog-delegation.ts:63-92`): in-run placement first, else `CollaboratorAdmission.catalogTaskSource` (`collaborator-admission.ts:114-136`), which builds the definition plan and calls `CollaboratorLaunchResolver.resolve(plans, port.launchBase())` (`collaborator-launch-resolver.ts:92-155`). The resolver checks configured layers in one batch (`check`, `:160-230`: availability once per runtime, one `validateMany`) and falls back to the root's launch (`requireInherited`, `:111-115`). Then the lifecycle validates the input, reads a saved Task (`root-task-execution-lifecycle.ts:137-173`) and dispatches (`root-task-dispatch.ts`), which returns `launchNotes` (`:75-77`) rendered by `launchNotesOf` (`launch-configuration-notes.ts:37-43`).
- **Peer copy.** `RemoteDelegation.planActivation` asks the peer to start the run (`remote-delegation.ts:79-100`, inside the same root gate). On the peer, `RemoteDelegationReceiver.start` resolves with the node catalog port's `defaults_only` base (`node-catalog-port.ts:16`) and refuses `NO_DEFAULT_RUNTIME` / `AGENT_CANNOT_RUN` (`remote-delegation-receiver.ts:39-50`); the start request carries no Task text and the answer no launches (`remote-requests.ts:42-46, 77-82`).
- **Sign-in** is owned by `AgentRuntimeSignInReader` (`agent-runtime-sign-in-reader.ts`), not used by launch resolution. **Usage limits**: Codex offers `account/rateLimits/read` (app-server protocol, codex-cli 0.164.0; investigation A-04); Claude sends `rate_limit_event` in sessions (Agent SDK 0.3.280 `sdk.d.ts:5410-5435`), which no code reads today.
- **Tools** reach a run through its definition's `toolNames` (`runtime-agent-tool-exposure.ts:45-79`) as a local tool (AutoByteus) and an Agent Tools MCP adapter (other runtimes), e.g. `list_peer_nodes` (`list-peer-nodes-mcp-adapter-provider.ts`). **Skills** come from the definition's `skillNames`, resolved against the catalog (tier 1 = the app's skills folder, `skill-catalog.ts:77`).
- **Settings** are key/value server settings with registered descriptions (`server-settings-service.ts`, e.g. media default models).
- Constraints: layer order and all-or-nothing start (REQ-011); CM-10 ownership; same-release peers (DESIGN.md rule 9); tolerant readers, no schema versions (migration guideline § 3).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: a new server subsystem (`model-routing`: router, sessions, runtime facts, four agent tools with MCP adapters, a built-in skill), changes to the launch resolver and its three root callers, the peer wire contract on both sides, run-history records and two DTO contract packages, server settings and GraphQL, and web Settings (Model Router card, router source labels, remote copy rows). About 35–45 source files plus tests.
- Architectural risk: `High`
- Risk rationale: changed peer contract (start request and answer); new persisted fields and enum values in run history; a new run created inside delegation admission while the root gate is held (concurrency, QR-001 time limit); a new ownership boundary (Model Router) on the delegation critical path; Claude event handling gains an observer.
- Escalation trigger: anything that needs a data migration, a change to the root gate, or the router to run outside the node that runs the copy.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| A-01 Read | `collaborator-launch-resolver.ts:92-230` | One owner of layer order and the batch usability check | Router is a new step of this owner; the check moves to `LaunchUsabilityCheck` so the decision tool and the card use the same rule | — |
| A-02 Read | `root-team-run.ts:321-330, 345-355`; `standalone-agent-run-root.ts:339`; `agent-org-run.ts:281` | Delegation and every message delivery of a root run inside one gate | A routing run holds the gate up to QR-001's 60 s; accepted as RSK-003 (remote starts already make network calls inside it, `remote-delegation.ts:79-100`) | Real latency (UNK-001) |
| A-03 Read | `root-task-execution-lifecycle.ts:137-173` | Placement (and so the launch) is resolved before the lifecycle reads a saved Task | Split the lifecycle into `prepareNewCopyWork` then `dispatchNewCopy`, so the Task text exists before the launch is resolved | — |
| A-04 Measured | `codex app-server generate-json-schema` (codex-cli 0.164.0): `v2/GetAccountRateLimitsResponse.json` | `account/rateLimits/read` → primary/secondary windows (`usedPercent`, `resetsAt`, `windowDurationMins`), `rateLimitReachedType` | Codex limits read live | Field set may change with Codex versions |
| A-05 Read | Claude Agent SDK 0.3.280 `sdk.d.ts:5410-5435` | `rate_limit_event` with `status`, `utilization`, `resetsAt`, `rateLimitType`, only during a session | Claude limits = last value seen on this node, with its time | Unknown until a Claude session ran |
| A-06 Measured | `claude auth status --json` 0.16 s; `agy models` 1.79 s; Codex `account/read` via app-server (reused lease) | Fresh sign-in reads are cheap enough per delegation, AGY slowest | Read fresh, once per runtime per delegation (QR-002) | — |
| A-07 Read | `grep` over `src/` | No per-runtime record of recent run failures | RD-2 | — |
| A-08 Read | `runtime-agent-tool-exposure.ts:45-79` and its 5 callers | Tools come from the definition (+ automatic collaboration tools) in every backend | RD-1: routing tools are listed on the definition | — |
| A-09 Read | `skill-catalog.ts:49-90`; `built-in-agent-registry.ts:1-20` | Tier-1 skills folder; built-in agents are rewritten from templates at startup | Built-in skill written the same way, with a prefixed name | — |
| A-10 Read | `launch-configuration-source-schema.ts:22-40` | Origin and fallback values validated against the code lists | New values are accepted by the same reader; old records are a subset | — |
| A-11 Read | `run-execution-tree-shared-records.ts:132-165` | Remote links store run IDs only | Add optional recorded launches | — |
| A-12 Read | `agent-run-service.ts:27-46, 181-246` | `createAgentRun` with explicit runtime/model/auto-approve; lifecycle observation | Router run is an ordinary standalone run | — |
| A-13 Read | `workspaces/temp-workspace.ts`; `node-catalog-port.ts:16` | Node temp workspace | Router run's workspace | — |

## Intended Change

When a fresh delegated copy starts, each agent still takes its own default, then its team's default. For agents left uncovered, the launch resolver asks the node's Model Router, an ordinary agent the user selected in Server Settings. It runs once per delegation with auto-approve on, looks at the node through four system tools, and answers through `submit_launch_choices`. Its validated choices become the agents' launches, recorded as source "Model Router" with the reason. If it isn't active or fails, the resolver falls back to the inherited launch on this node, or refuses on a peer node, with a clear note or message. Peer nodes route on their own side and return the launches so the delegating node can show them.

## Change Scope (Mandatory)

- In scope: UC-001..UC-005. Areas: launch resolution (`agent-collaboration/collaborators`), the three roots' `delegateToNewCopy`, the task lifecycle split, the new `model-routing` subsystem and its agent tools, Codex/Claude usage-limit reading, the peer start contract (both sides), run-history launch-source and remote-link records, team/collaboration DTO packages, server settings + GraphQL, the built-in skill, and web Settings (Model Router card, source labels, remote copy rows). Docs: CM-12, GLOSSARY, module docs.
- Derived consumers:

| Changed structure | Consumer | Decision |
| --- | --- | --- |
| `LaunchConfigurationSource` (new origin `model_router` + `choiceReason`; new fallback layer `model_router`; new reasons) | `parseLaunchConfigurationSource` (`launch-configuration-source-schema.ts`) | Extend the allowed lists; `choiceReason` required iff origin `model_router` |
| same | `launchNotesOf` (`launch-configuration-notes.ts`) | Labels for the new origin, layer and reasons; a routed agent always gets a note |
| same | team and collaboration DTO packages (`team-execution-view-dtos.ts:48-50, 167-169`; `agent-org-execution-dtos.ts:38-40`) | Extend enums and add `choice_reason` |
| same | web `runMemberTree.ts:73-77`, `RunMemberRow.vue:214-221`, `delegatedLaunchRows.ts` | New source/layer labels; reason shown under the source |
| same | restore of copies (`collaborator-source-projector` and restore readers) | No change: they read recorded launch values, not the origin |
| Remote link records (+ optional launches) | remote-link parse schema, `remoteTaskExecutionDtoSchema` (both contract packages), web Settings | Parse optional; DTO carries launches; Settings shows read-only remote rows |
| `StartDelegatedRunRequest` / `Answer` | `RemoteRunChannel` client and HTTP route, `RemoteDelegationReceiver`, `RemoteTeamRunStarter` answer | Clean-cut fields (rule 9) |
| `NO_DEFAULT_RUNTIME` wording, new `MODEL_ROUTER_FAILED` code | `peerRefusalText` (`remote-refusals.ts`), `REMOTE_REFUSAL` list | New texts per supplement § 6 |
| User-visible text stating the old rule | CM-12 in `collaboration_model.md`; the existing settings/help text about delegated launches, if any states "inherited from the run" as the only fallback | Update |

- Deliberately left alone: configured placements, existing copies, user launches, application launches (REQ-011); the root gate itself (RSK-003); Agent Runtimes page; model change of stopped copies; token-usage analytics internals (read only).
- Follow-ups: FU-001 (router outcome feedback); FU-002 (routing outside the root gate, only if RSK-003 is observed) — added to `follow-ups.md`.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger Or Contract | Existing Behavior Reference | Approved Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001..008; AC-001..004, 008, 010, 012 | `delegate_task(address)` | A-01, A-03 | Router step after configured layers; inherited on router failure with note | DS-001, DS-003 |
| BEH-002 | Contract | REQ-001, 004..006, 009; AC-005, 006 | `delegate_task` with `node` | receiver, A-11 | Peer routes with its own router; answers with launches; refusals worded | DS-002, DS-003 |
| BEH-003 | System | REQ-002; AC-007 | Any fresh copy | A-06 | Signed-out runtime is unusable | DS-001 (usability check) |
| BEH-004 | User | REQ-008, 009; AC-001, 005, 010 | Delegation result; Settings | `delegatedLaunchRows.ts` | Router source + reason; remote rows | DS-004 |
| BEH-005 | System | REQ-011; AC-009 | Other starts | — | Unchanged | — |
| (new) | User | REQ-007; AC-009, 011 | Server Settings → Model Router card | settings pattern | Select agent, see status, one-click set-up | DS-005 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `launch-selection-order.md` | Every selection case | REQ-001..009 | The resolver's rules (DS-001) implement its sections 2–6 one to one; tests take its examples E1–E8 | Approved SR-004 (§ 4 amended by RD-3, pending) |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `Yes`, local
- Structural triggers:
  - *Capability-area reuse* fires: runtime facts, sign-in, models, usage → reuse `runtime-management` and `llm-management` owners; only the usage-limit reading is new.
  - *Derived data* fires: launch source feeds parser, notes, DTOs, web → table above.
  - *Several kinds or forms* fires: local vs peer (two bases), agent vs team, description vs `task_id` → each traced (DS-001/DS-002, lifecycle split A-03).
  - *Repeated coordination*: the usability rule would otherwise exist in the resolver, the decision tool and the card → one owner `LaunchUsabilityCheck`.
  - *Split sequence* ruled out: the resolver calls the router and waits for its outcome; the router calls the run service and the session registry itself; no callbacks between them.
  - *Behavior by absence* ruled out: "router not active" is an explicit outcome with a reason, not a failed lookup.
- Root cause classification: `Missing Invariant` (launch resolution lacks a Task-aware layer and sign-in) plus `File Placement Or Responsibility Drift` risk in the resolver (it would grow with routing).
- Refactor needed now: `Yes`, small: move the candidate check out of `CollaboratorLaunchResolver` into `LaunchUsabilityCheck`; split the lifecycle's `delegateToNewCopy` into prepare + dispatch.
- Evidence: A-01, A-03.
- Design response: see spines and file mapping.
- Intentional deferrals: running the router outside the root gate (RSK-003, FU-002).

## Terminology

- **Model Router** (new, GLOSSARY): the agent a node's owner selects in Server Settings to choose runtimes and models for delegated agents that no default covers. One per node.
- **Routing run** (new): one run of the Model Router for one delegation.
- **Launch choice** (new): the router's answer for one agent: runtime, model and reason (`choiceReason`).
- Existing: launch, launch layer, launch source, node, peer, delegated copy.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: `CollaboratorLaunchResolver.check` (moves), the `defaults_only` "no default" refusal wording, and `delegateToNewCopy(context, input, placement)` on the lifecycle (split).
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- Stored subjects: (1) recorded launch source of delegated copies in run-history trees; (2) remote links in the topmost coordinating run's tree; (3) server setting `MODEL_ROUTER_AGENT_DEFINITION_ID`; (4) the built-in skill folder.
- Change: (1) new enum values (`model_router` origin and layer; `signed_out`, `router_not_usable`, `router_failed` reasons) and an optional `choiceReason`; (2) optional `launch` on agent links and on each Team member; (3) new key; (4) new folder rewritten at startup.
- Reader evidence: A-10 (validated lists), A-11. Older records contain only the old values and no new fields; their absence truthfully means "not routed" / "not recorded".
- Decision: `Directly Usable — No Migration` (migration guideline § 3: adding values and optional fields with a truthful absent meaning).
- Rationale: nothing old changes meaning; no fact must be derived from old data.

Migration guideline checklist (§ 2): 1 no migration (tolerant readers); 2 availability unaffected; 3 shapes: current released trees with/without `launchSource` (fixtures exist from delegated-launch-config-defaults) and remote links of 247/261; 4 n/a; 5 n/a; 6 no legacy branches; 7 no extra startup work; 8 the router agent definition ID in settings is validated at use (deleted → not active); 9 parser tests for old and new shapes; 10 consulted § 3 and Case 3.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-003 | Agent calls `delegate_task(address)` | Copy started; result with launch notes | Root (gate) → `CollaboratorLaunchResolver` for the launch | The local path |
| DS-002 | Primary End-to-End | BEH-002 | Agent calls `delegate_task` with `node` | Peer run started; delegating result and link with launches | `RemoteDelegation` (A) / `RemoteDelegationReceiver` (B) | The cross-node path |
| DS-003 | Bounded Local | BEH-001, BEH-002 | Resolver asks `ModelRouter.route` | Validated launch choices or a failure | `ModelRouter` | The routing run |
| DS-004 | Return-Event | BEH-004 | Recorded launch source | Notes and Settings rows | `launchNotesOf` / DTO projection | Visibility |
| DS-005 | Primary End-to-End | REQ-007 | User opens Model Router card | Selection saved, status shown | `ModelRouter.status` via GraphQL | Set-up |

## Primary Execution Spine(s)

- DS-001: `delegate_task tool → Root.delegateToNewCopy (gate) → RootTaskExecutionLifecycle.prepareNewCopyWork → resolveDelegationPlacement → CollaboratorAdmission.catalogTaskSource(task) → CollaboratorLaunchResolver.resolve → [LaunchUsabilityCheck → ModelRouter.route (DS-003)] → RootTaskExecutionLifecycle.dispatchNewCopy → dispatchTaskCopy → result + launchNotes`
- DS-002 (A): `delegate_task(node) → Root (gate) → RemoteDelegation.planActivation → RemoteRunChannel.startDelegatedRun(task) → HTTP` · (B): `RemoteDelegationReceiver.start → CollaboratorAdmission.catalogTaskSourceOf(task) → CollaboratorLaunchResolver.resolve (defaults_only) → prepare run / RemoteTeamRunStarter → answer {run IDs, launches}` · (A): `link recorded with launches → result + launchNotes`
- DS-005: `ModelRouterCard → GraphQL modelRouterStatus / updateServerSetting / updateAgentDefinition → ModelRouter.status`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Inside the root gate, the lifecycle first validates the input and reads a saved Task, giving the work text. Placement then resolves; a catalog copy's launch is resolved by the resolver, which checks configured layers and the router's own default in one batch, asks the router for uncovered agents, and assembles launches with sources. Dispatch starts the copy and returns notes. | lifecycle, admission, resolver, router | Root for the sequence; resolver for the launch | `LaunchUsabilityCheck`, notes renderer |
| DS-002 | A sends the Task text with the start request. B resolves exactly like a local catalog copy without the inherited layer, routing with B's own router. B answers with run IDs and per-agent launches; A records them on the link and renders notes. Refusals are worded on A. | `RemoteDelegation`, receiver, resolver | A: `RemoteDelegation`; B: receiver | refusal texts |
| DS-003 | The router reads the setting, creates an ordinary run of the selected agent (its own default, auto-approve on, temp workspace), registers a routing session for that run, posts the routing request as the first message and waits. The agent calls the environment tools and `submit_launch_choices`; the tool validates against the session and the usability check and settles the session or returns the error. The router then ends the run once its turn ends, or at the deadline. | `ModelRouter`, `ModelRoutingSessions`, routing run | `ModelRouter` | `NodeRuntimeFacts`, routing request text |
| DS-004 | Recorded sources are rendered as notes (result) and labels (Settings), with the reason under "Model Router". | renderer, DTOs, rows | `launchNotesOf`; DTO projection | — |
| DS-005 | The card reads `modelRouterStatus` (selected agent, active, reason, missing set-up) and saves the setting; "Set up" adds the skill and tools through the existing agent update. | card, status | `ModelRouter.status` | — |

## Spine Actors / Main-Line Nodes

Root `delegateToNewCopy` (×3 kinds), `RootTaskExecutionLifecycle`, `CollaboratorAdmission`, `CollaboratorLaunchResolver`, `ModelRouter`, routing run (`AgentRunService`), `RemoteDelegation`, `RemoteDelegationReceiver`, `dispatchTaskCopy`.

## Ownership Map

- **Root `delegateToNewCopy`**: sequence of one delegation inside the gate: prepare work → resolve placement with the work text → dispatch. Same three calls in each root kind; the policy lives in the lifecycle and the resolver, not in the roots.
- **`RootTaskExecutionLifecycle`**: input validation, saved-Task resolution, join decision (`prepareNewCopyWork`), then dispatch (`dispatchNewCopy`). It does not touch launches.
- **`CollaboratorLaunchResolver`**: the selection order of the supplement (sections 3–5): which layer wins per agent, which agents need routing, applying router outcomes, inherited fallback (local) or refusal (`defaults_only`), and the recorded sources.
- **`LaunchUsabilityCheck`**: the usability rule U1–U5 for a batch of candidates: availability once per runtime, sign-in once per runtime (`signedOut` → unusable), one `validateMany`.
- **`ModelRouter`**: everything about the router agent: reading the setting, its definition, its status (`status()`), running one routing run (`route()`), the time limit, ending the run. It does not decide layer order.
- **`ModelRoutingSessions`**: the pending routing session per routing run ID: the request, its allowed agents and required runtimes, the settle once rule.
- **`NodeRuntimeFacts`**: the read-only facts the environment tools return: runtimes (availability, sign-in, running agents, usage limits), offered models with prices, token usage.
- **`RuntimeUsageLimits`**: Codex live read; Claude last observed `rate_limit_info` per node, in memory.
- **`RemoteDelegation` / `RemoteDelegationReceiver`**: the peer contract on each side (unchanged ownership, new fields).

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Agent tools `list_agent_runtimes`, `list_runtime_models`, `get_token_usage`, `submit_launch_choices` (local tool + MCP adapter each) | `NodeRuntimeFacts`; `ModelRoutingSessions` | Runtime-neutral tool surfaces | Validation rules (they call the owners) |
| GraphQL `modelRouterStatus` | `ModelRouter.status` | Card | Status rules |

## Removal / Decommission Plan (Mandatory)

| Item | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `CollaboratorLaunchResolver.check` (`:160-230`) | The rule is needed by three owners | `LaunchUsabilityCheck.checkMany` | Moved, plus sign-in |
| `RootTaskExecutionLifecycle.delegateToNewCopy(context, input, placement)` (`:137-173`) | Launch needs the work text before placement | `prepareNewCopyWork` + `dispatchNewCopy` | All three roots and `RemoteDelegation.delegate`'s callback updated |
| `CollaboratorNoDefaultLaunchError` message "There is no default runtime configured for the target …" as B's full refusal detail | A words the refusal from code + target + router status | `peerRefusalText` | The error class stays; its detail becomes the router-status sentence |

## Return Or Event Spine(s) (If Applicable)

- DS-004 as above. Peer answer: `B answer.launches → A RemoteDelegation.linkOf (records launches) → outcome.launchNotes = launchNotesOf(launches)`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner `ModelRouter` (DS-003): `route(request, routerLaunch) → createAgentRun → recordRunTitle → sessions.open(runId, request) → run.postUserMessage(routing request text) → await first of {session settled, deadline 60 s, run FAILED/TERMINATED} → sessions.close(runId) → end run when its turn is over (bounded by the deadline) → outcome`.
- Parent owner `submit_launch_choices` → `ModelRoutingSessions.submit(runId, choices)`: `session for run? → every asked agent once? → required runtime kept? → LaunchUsabilityCheck on the chosen pairs → settle (first valid wins) | return errors to the agent`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Spine | Serves | Responsibility | Why It Exists | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| `LaunchUsabilityCheck` | DS-001/002/003/005 | resolver, sessions, router status | U1–U5 | One rule, three users | Three drifting copies |
| Routing request text | DS-003 | `ModelRouter` | Renders the first message | Wording in one place | Router logic mixed with text |
| `NodeRuntimeFacts` + `RuntimeUsageLimits` | DS-003 | tools | Facts | Reuse of existing owners | — |
| Claude rate-limit observer | DS-003 | `RuntimeUsageLimits` | Records `rate_limit_info` from Claude session events | Claude reports only in sessions | — |
| Built-in skill bootstrap | DS-005 | router agents | Writes `autobyteus-model-routing` at startup | System-provided guidance | — |
| Notes renderer | DS-004 | results | Text | existing | — |

## Ownership Boundaries

- The resolver is the only caller of `ModelRouter.route`. Roots, receivers and tools never call it.
- `ModelRouter` is the only owner that creates routing runs and opens sessions; `submit_launch_choices` only settles a session through `ModelRoutingSessions`.
- `LaunchUsabilityCheck` is the only place the usability rule exists.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanisms | Upstream Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `CollaboratorLaunchResolver.resolve` | usability batch, router call, source assembly | `CollaboratorAdmission` | Admission or roots calling `ModelRouter` | Extend resolve input |
| `ModelRouter` | run creation, sessions, deadline, run end | resolver, GraphQL status | Tools creating runs; resolver touching sessions | Add a method on `ModelRouter` |
| `ModelRoutingSessions` | per-run pending decision | `ModelRouter` (open/close/await), `submit_launch_choices` (submit) | Anyone else settling | — |

## Dependency Rules

- `agent-collaboration/collaborators` → `model-routing` (port interface `ModelRouterPort` defined in `model-routing/domain`), → `launch-preferences/launch-usability-check`.
- `model-routing` → `agent-execution` (run service), `runtime-management`, `llm-management`, `token-usage` (read), `launch-preferences`. Never → `agent-collaboration`.
- `agent-tools/model-routing` → `model-routing` services only.
- Forbidden: `model-routing` importing collaboration roots; tools importing the resolver.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `ModelRouterPort.selected(): Promise<SelectedModelRouter \| null>` | the node's router | Setting + definition (name, own default, lists decision tool) | — | `null` = none selected; deleted = `{missing: true}` |
| `ModelRouterPort.route(request: ModelRoutingRequest, routerLaunch: AgentLaunchConfiguration): Promise<ModelRoutingOutcome>` | one routing | Run, wait, end | request carries agents by address | `{kind:"chosen", choices}` / `{kind:"failed", reason}` |
| `ModelRouter.status(): Promise<ModelRouterStatus>` | card | selected, active, reason, missing set-up | — | Uses `LaunchUsabilityCheck` |
| `LaunchUsabilityCheck.checkMany(candidates, context)` | candidates | U1–U5 verdicts | candidate objects | — |
| `ModelRoutingSessions.submit(routingRunId, choices)` | one session | validate + settle | routing run ID | Unknown run → "no routing request in this run" |
| `CollaboratorLaunchResolver.resolve(plans, base, work: { text })` | launch | order | — | `work.text` = description or saved Task text + comments |
| Peer: `StartDelegatedRunRequest.task: string`; `StartDelegatedRunAnswer.launches: RemoteAgentLaunch[]` | wire | — | address | `RemoteAgentLaunch = {address, runtimeKind, llmModelIdentifier, launchSource}` |
| Tools: `list_agent_runtimes()`, `list_runtime_models({runtime})`, `get_token_usage({days?})`, `submit_launch_choices({choices:[{address, runtime, model, reason}]})` | node facts / session | — | runtime kind string; agent address | Same wording on every runtime |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| `route` | Yes | Yes | Low | — |
| `submit_launch_choices` | Yes | Yes (address per agent, routing run from the caller) | Low | — |
| `list_runtime_models` | Yes | Yes (runtime kind) | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Same Meaning Everywhere? | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| Router | Model Router / `ModelRouter` / `MODEL_ROUTER_AGENT_DEFINITION_ID` | Yes | Yes (new, GLOSSARY) | "router" also names message routing (`task-delegation-tool-run-router.ts`, `codex-client-thread-router.ts`) | Always "Model Router" / `ModelRouter`, never bare "router" in code or UI |
| Choice | launch choice / `choiceReason` | Yes | Yes | `reason` already means fallback reason | Distinct name `choiceReason` |
| Origin value | `model_router` | Yes | Yes | — | — |
| Tools | `list_agent_runtimes`, `list_runtime_models`, `get_token_usage`, `submit_launch_choices` | Yes | Yes | "runtime" = `RuntimeKind` | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Availability | `RuntimeAvailabilityService` | Reuse | — |
| Sign-in | `AgentRuntimeSignInReader` | Reuse | One owner of sign-in |
| Running agents | `AgentRuntimeStatusService` count function | Reuse | — |
| Models, prices | `ModelCatalogService`, `RunModelSelectionService`, `token-usage/pricing` | Reuse | — |
| Token usage | token-usage analytics query service | Reuse | — |
| Usage limits | — | Create New (`RuntimeUsageLimits`) | Nothing reads them today |
| Agent run | `AgentRunService` | Reuse | Router is a normal agent |
| Tools on all runtimes | local tool + Agent Tools MCP adapter pattern | Reuse | — |
| Skill shipping | built-in agent bootstrap pattern | Extend (built-in skill) | — |
| Settings | `server-settings-service` | Extend | — |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spine | Decision |
| --- | --- | --- | --- |
| `agent-collaboration/collaborators` | order, sources, notes | DS-001/002/004 | Extend |
| `agent-collaboration/execution/task` | lifecycle split | DS-001 | Extend |
| `launch-preferences` | usability rule | all | Extend |
| `model-routing` (new) | router, sessions, request text, node facts, usage limits | DS-003 | Create New |
| `agent-tools/model-routing` (new) | four tools + MCP adapters | DS-003 | Create New |
| `remote-collaboration` + `agent-collaboration/execution/remote` | wire fields, link launches, texts | DS-002 | Extend |
| `run-history` | record shapes, parsers | DS-004 | Extend |
| `built-in-skills` (new, beside `built-in-agents`) | skill template + bootstrap | DS-005 | Create New |
| web settings / run-settings | card, labels, remote rows | DS-004/005 | Extend |

## Draft File Responsibility Mapping

(Collapsed into the final mapping; no extraction changed the draft other than `LaunchUsabilityCheck`.)

## Reusable Owned Structures Check

| Repeated Structure | Shared File | Owner | Why | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Usability rule | `launch-preferences/launch-usability-check.ts` | launch-preferences | Resolver, sessions, status | Yes | Yes | A place for layer order |
| `RemoteAgentLaunch` (address + launch + source) | `remote-collaboration/domain/remote-requests.ts` | remote | Wire + link record | Yes | Yes (reuses `LaunchConfigurationSource`) | — |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `LaunchConfigurationSource` | Yes: `choiceReason` only with origin `model_router` (discriminated) | Yes | Low | Union type |
| `LaunchConfigurationFallback.layer` | Yes: `agent_default`, `team_default`, `model_router` | Yes | Low | Rename type `ConfiguredLaunchLayer` stays for candidates; new `LaunchLayer` for fallbacks |
| `ModelRoutingRequest` | Yes | Yes | Low | — |

## Final File Responsibility Mapping

| File | Subsystem | Owner | Concern |
| --- | --- | --- | --- |
| `server/src/launch-preferences/launch-usability-check.ts` (new) | launch-preferences | `LaunchUsabilityCheck` | U1–U5 batch |
| `server/src/agent-collaboration/collaborators/collaborator-launch-resolver.ts` (modify) | collaborators | resolver | Order incl. router step, sources |
| `.../collaborators/launch-configuration-notes.ts` (modify) | collaborators | notes | New labels, routed note |
| `.../collaborators/collaborator-admission.ts` (modify) | collaborators | admission | Pass work text |
| `.../collaborators/catalog-delegation.ts` (modify) | collaborators | placement | Work text into `catalogSource` |
| `.../domain/launch-configuration-source.ts` (modify) | collaboration domain | types | Origin, layer, reasons, `choiceReason` |
| `.../execution/task/root-task-execution-lifecycle.ts` (modify) | task | lifecycle | `prepareNewCopyWork`, `dispatchNewCopy` |
| `agent-team-execution/domain/root-team-run.ts`, `standalone-agent-run-root/services/standalone-root-message-delivery.ts`, `agent-org-execution/services/agent-org-run-message-delivery.ts`, the three recipient resolvers (modify) | roots | roots | Three-step sequence |
| `server/src/model-routing/domain/model-routing-request.ts` (new) | model-routing | types | Request, outcome, port |
| `server/src/model-routing/domain/model-routing-request-text.ts` (new) | model-routing | text | First message |
| `server/src/model-routing/services/model-router.ts` (new) | model-routing | `ModelRouter` | selected, status, route |
| `server/src/model-routing/services/model-routing-sessions.ts` (new) | model-routing | sessions | open/submit/close |
| `server/src/model-routing/services/node-runtime-facts.ts` (new) | model-routing | facts | runtimes, models, usage |
| `server/src/model-routing/services/runtime-usage-limits.ts` (new) | model-routing | limits | Codex read, Claude last seen |
| Claude session event handling (modify, one line to `RuntimeUsageLimits.recordClaude`) | claude backend | observer | — |
| `server/src/agent-tools/model-routing/*` (new: contract, 4 local tools, register) and `agent-tools/mcp/providers/model-routing-tools-mcp-adapter-provider.ts` (new); `default-agent-tool-mcp-adapter-providers.ts` (modify) | agent-tools | tools | Surfaces |
| `server/src/built-in-skills/` (new: registry, bootstrapper, `templates/autobyteus-model-routing/SKILL.md`) + startup wiring (modify) | built-in-skills | bootstrap | Skill |
| `server/src/config/model-router-setting.ts` (new) + `services/server-settings-service.ts` (modify) | config | setting | Key + description |
| `server/src/api/graphql/types/model-router.ts` (new) + schema (modify) | api | GraphQL | `modelRouterStatus` |
| `server/src/remote-collaboration/domain/remote-requests.ts`, `remote-refusals.ts`, `agent-collaboration/execution/remote/remote-refusal-codes.ts`, `remote-delegation.ts`, `remote-run-channel.ts` + HTTP client/route, `remote-collaboration/inbound/remote-delegation-receiver.ts`, `remote-team-run-starter.ts` (modify) | remote | contract | Task text, launches, texts |
| `server/src/run-history/domain/run-execution-tree-shared-records.ts`, `store/launch-configuration-source-schema.ts`, remote-link schema (modify) | run-history | records | Shapes |
| `autobyteus-team-stream-contracts`, `autobyteus-collaboration-stream-contracts` (modify) | contracts | DTOs | Enums, `choice_reason`, remote launches |
| web: `components/settings/ModelRouterCard.vue` (new), settings page (modify), `utils/runSettings/delegatedLaunchRows.ts`, `runMemberTree.ts`, `RunMemberRow.vue` (modify), remote rows (new util), i18n en + zh-CN (modify) | web | UI | Card, labels, remote rows |
| Docs: `collaboration_model.md` CM-12, `GLOSSARY.md`, `server/docs/modules/model-routing.md` (new) | docs | — | — |

## Applied Patterns (If Any)

- Port (`ModelRouterPort`) so the collaboration resolver depends on an interface owned by `model-routing`'s domain, not on agent-run machinery.
- Registry (`ModelRoutingSessions`) for pending sessions keyed by routing run ID; holds no policy beyond settle-once.

## Target Subsystem / Folder / File Mapping

As the final file mapping; `model-routing/` gets `domain/` and `services/`, mirroring neighbouring subsystems.

## Folder Boundary Check

| Folder | Depth | Clear? | Risk | Note |
| --- | --- | --- | --- | --- |
| `model-routing/domain` | Main-line types | Yes | Low | — |
| `model-routing/services` | Owners | Yes | Low | — |
| `agent-tools/model-routing` | Transport (tool surfaces) | Yes | Low | Same as `agent-discovery` |
| `built-in-skills` | Off-spine bootstrap | Yes | Low | Beside `built-in-agents` |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Avoided Shape | Why |
| --- | --- | --- | --- |
| Sequence ownership | resolver: `verdicts = usability.checkMany(...)`; `outcome = await router.route(request, routerLaunch)`; resolver applies outcome | `router.route(request, applyToPlans)` callback into the resolver | Case 1 |
| Root sequence | `work = lifecycle.prepareNewCopyWork(ctx, input)`; `placement = resolvePlacement(addr, work.text)`; `lifecycle.dispatchNewCopy(ctx, work, placement)` | lifecycle receiving a `resolvePlacement` function | Case 1 |
| Explicit outcome | `{kind:"not_active", reason:"has no default runtime/model"}` | "settings lookup returned nothing, so inherit" | Case 4 |
| Routing request (first message) | "Choose a runtime and model for each agent below for this Task. Task: … Agents: /software_engineering_team/implementation_engineer (Implementation Engineer: …) — must stay on codex_app_server. Already set: solution_designer → claude_agent_sdk / opus. Use list_agent_runtimes and list_runtime_models; answer with submit_launch_choices for every agent listed." | — | Shape for implementation |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Optional wire fields with old-peer fallback | Peers on older releases | Rejected (rule 9) | Clean-cut fields |
| Keeping `delegateToNewCopy(context,input,placement)` beside the split | Fewer edits | Rejected | Split, all callers updated |
| Migrating old launch sources to add `choiceReason` | Shape uniformity | Rejected | Absent = not routed |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. `LaunchUsabilityCheck` extracted (behavior unchanged) + sign-in (`signed_out`); resolver tests green.
2. Launch-source types, parser, notes, DTO packages (new values, `choiceReason`, router layer).
3. Lifecycle split and the three roots; work text into admission/resolver.
4. `model-routing` domain + sessions + `ModelRouter` + request text; resolver router step (local + `defaults_only`).
5. Node facts, usage limits (Codex read, Claude observer), four tools with MCP adapters.
6. Built-in skill bootstrap; setting key; GraphQL status.
7. Peer contract both sides; link launches; refusal texts.
8. Web: card, labels, remote rows; i18n.
9. Docs: CM-12, GLOSSARY, module doc.

## Key Tradeoffs

- **Router inside the existing resolution (inside the root gate)** vs. routing before the gate: simple and one owner, at the cost of RSK-003. Remote starts already hold the gate during network calls.
- **Tools and skill listed on the definition (RD-1)** vs. automatic per routing run: reuses every backend's path; visible to the user; costs one click.
- **Fresh sign-in reads per delegation** vs. the status page's cached rows: correct state at decision time; AGY adds ~1.8 s when it is a candidate.
- **Router's run ends after its answer** vs. kept alive: no idle runtime processes; the run stays in the router's history and can be reopened like any run.

## Risks

- RSK-001 poor choices (visible reasons; editable instructions).
- RSK-002 router cost (only uncovered agents; user's model).
- RSK-003 while a routing run works, other messages and delegations of the same root wait (≤ 60 s). Measure in validation; FU-002 if it matters in use.
- RSK-004 Codex `account/rateLimits/read` shape changes with Codex releases; the tool reports "not reported" on any read error.
- RSK-005 a routing run's model may not call `submit_launch_choices` (weak model): ends as router failure with the reason "the Model Router did not answer".

## Guidance For Implementation

- Reproduction to start from: `tests/unit/agent-collaboration/collaborators/collaborator-launch-resolver-defaults-only.test.ts` and `tests/unit/remote-collaboration/remote-delegation-receiver.test.ts` (today's refusal); add failing cases for supplement E1–E8 first.
- Tests use a stub `ModelRouterPort` for resolver cases and a fake `AgentRunService` for `ModelRouter` (decision, time-out, run failure, no answer). One real routing run is part of API/E2E per TESTING.md.
- Wording: notes and refusals exactly as `launch-selection-order.md` §§ 5–7.
- Do not call the router anywhere except the resolver; do not create a second usability rule.
