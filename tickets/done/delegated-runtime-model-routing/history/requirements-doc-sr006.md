# Requirements Document — Runtime/Model Routing For Delegated Work (autobyteus-32)

## Document Status

- Status: `Draft` — SR-004 approval superseded by the direction the user set on 2026-10-24/25 (SR-006, below); requirements to be rewritten when the ticket resumes. **Waiting For Prerequisite PRE-001.**
- Current solution revision ID: `SR-006`
- Package identifier: `delegated-runtime-model-routing`
- Request / ticket: Project Task **autobyteus-32** "Runtime/model routing for delegated work" (user 2026-10-09, extended 2026-10-11, priority raised 2026-10-24)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-10-24
- Approved by and reference: Solution Designer within the direction (user informed), 2026-10-24, after the user decided every `Needs user` decision in the Solution Designer conversation: DEC-001 (c) and DEC-002 (user-selected router in Server Settings; must have a usable default), DEC-012 (system tools), and on 2026-10-24: "your recommendation when the router fails on this node is correct" (DEC-003), "of course, router agent in its own history … it's just a normal agent" (DEC-014), and the router is a normal, small agent behind a clean interface that returns runtime and model, started with auto-approve on (DEC-015). DEC-013 decided by the Solution Designer from that direction. Reference: the Solution Designer's conversation message of 2026-10-24 informing the user (SR-004).
- Exact approved requirements baseline / solution revision: this document at `SR-004`, with `launch-selection-order.md` at SR-004.
- Behavior-defining supplements and their approved versions: [`launch-selection-order.md`](launch-selection-order.md) at SR-004 (approved with this document)

## SR-006 Direction Agreed With The User (2026-10-24/25; supersedes conflicting parts below)

To be written into full requirements when this ticket resumes after PRE-001. Decided by the user in the Solution Designer conversation:

1. **Tool first, its own ticket (PRE-001):** `list_available_agent_runtimes`, one strategy per runtime with live limits (Codex, Claude, Antigravity, Grok; AutoByteus per provider), plus the Model Routing page's "Agent runtimes now" section.
2. **Defaults first, router for the gaps** (DEC-001 unchanged); failure on this node → inherited launch with a note; on a peer → clear refusal (DEC-003 unchanged).
3. **Built-in Model Router agent, marked `"internal": true`**; one long-lived router conversation per node (not one run per routing); routing requests arrive in that conversation, batched when it is busy; replaces DEC-014 and SR-002's user-created router.
4. **Feature switch, off by default** (like Applications); the router's runtime and model are set on the Model Routing page (stored in settings, since built-in agent files are rewritten at startup).
5. **Internal agents:** optional `internal` attribute in `agent-config.json` (absent = normal); server setting "Show internal agents" (off by default, for debugging); internal agents are also not offered to `list_available_agents` / `delegate_task`.
6. **Router tools:** `list_available_agent_runtimes`, read/update knowledge note, `submit_launch_choices`, web search and read URL; no shell or file tools.
7. **Knowledge:** a knowledge note per node, taught by the user in the router's conversation and later by outcomes; shown, editable and undoable on the page; included in every routing request (reverses DEC-013).
8. **Model Routing page in Settings:** Overview (statistics: task kind → runtime/model over time, router vs defaults), Decisions (list with reasons), Agent runtimes now, Setup (switch, runtime/model, knowledge note, open conversation, Show internal agents).
9. **Task kinds:** fixed list editable on the page (design, implementation, code review, testing, writing, research, computer use, other); the router's answer includes the task kind; every delegation's launches are recorded.
10. **Slices of this ticket after PRE-001:** router (selection order, switch, internal agent, conversation, knowledge, cross-node, page sections, statistics); then learning from outcomes (FU-001 promoted).

## Problem And Desired Outcome

- Problem:
  - The Task says every delegated copy inherits the delegator's runtime/model. **That is no longer fully true**: since ticket `delegated-launch-config-defaults` (2026-10-12), a delegated copy runs each agent on its own definition default, a team member without one on its team's default, and only otherwise on the delegating run's runtime/model. So "Solution Designer on Claude, Implementation Engineer on Codex" already works today, by setting those defaults once.
  - What is still missing:
    1. **No Task-aware choice.** An agent without a usable default always gets the delegating run's runtime/model, whatever the Task (writing, computer use, design).
    2. **Cross-node work fails.** On a peer node there is nothing to inherit: an agent with no default, or with a default that node can't run, is refused ("There is no default runtime configured for the target agent … on node …").
    3. **Sign-in is not checked.** A default on a runtime that is installed but signed out passes every check and fails at the first turn ("Reconnecting… n/5").
    4. **A remote copy's runtime/model is invisible** on the delegating node.
- Affected actors or systems: delegating agents (Project Task Manager, coordinators, any member); the user as definition author, node owner and observer; the delegating node and the target node.
- Desired outcome: when a delegated copy starts, every agent in it runs on a runtime and model that the node it runs on has and is signed in to. The user's configured defaults are used when they work there. For an agent that no default covers, a **Model Router** agent on that node chooses for the Task. The choice and its reason are visible, and every failure is a clear message, never a silent switch.
- Observable definition of success: the PM delegates a Task to the Software Engineering Team on a Docker peer node where no member has a usable default; each member starts on a signed-in runtime/model chosen by that node's Model Router, and the delegation result and run Settings show each choice and its reason. Locally, a team whose members have no default gets Task-appropriate choices instead of the PM's runtime/model.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001, SCN-002 | Local copy: agent without a usable default runs on the delegating run's runtime/model | With a Model Router set up on this node, the router chooses for it from the Task; without one, unchanged | Agent default → team default order; all-or-nothing start | resolver; investigation notes |
| BEH-002 | Contract | SCN-003, SCN-004 | Peer copy: agent without a usable default is refused (`NO_DEFAULT_RUNTIME` / `AGENT_CANNOT_RUN`) | The target node's Model Router chooses; refused only when no router is set up there or it fails, with a message saying so | No credential travels; target node owns the run (CM-10) | receiver; CM-12 |
| BEH-003 | System | SCN-005 | A default on a signed-out runtime is used and fails at the first turn | A runtime known to be signed out is not usable: the default is skipped with a note, and the next layer (team default, router, inherited) is used | Availability and model checks | sign-in reader; remote-node-runtime-sign-in E-07 |
| BEH-004 | User | SCN-006 | Settings shows local copies' runtime/model and source; a remote copy's is not shown | A router choice shows "chosen by the Model Router" and its reason; remote copies show their runtime/model and source too | Existing Settings rows and notes | delegatedLaunchRows.ts |
| BEH-005 | System | SCN-007 | Configured placements, existing copies, user-launched runs and application launches use their own launch choice | Unchanged | All | delegated-launch-config-defaults REQ-011 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User (definition author) | Say where each agent runs | Defaults are honored; empty default means "let the router choose per Task" | No new per-launch input needed |
| User (node owner) | Decide what runs on the node and at what cost | Sets up the node's Model Router (its runtime/model and its preferences) | Router used only when set up |
| Delegating agent | Hand over work | Delegation works across nodes; result says what each agent runs on and why | No need to know runtimes/models |
| User (observer) | Know what ran where and why | Choice and reason in the delegation result and run Settings | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | An agent delegates a fresh copy of an agent or team on its own node (`delegate_task` to a catalog address) | SCN-001, SCN-002 |
| UC-002 | An agent delegates to an agent or team on a peer node (`delegate_task` with `node`) | SCN-003, SCN-004 |
| UC-003 | The user creates a router agent (its runtime/model default and instructions) and selects it in the Server Settings Model Router card of a node | SCN-008 |
| UC-004 | The user sees what each agent of a delegated copy runs on, where it came from and why | SCN-006 |
| UC-005 | A configured default on a signed-out runtime falls back visibly | SCN-005 |

### Out Of Scope

- New `delegate_task` parameters for runtime/model; new catalog tools listing runtimes/models to agents (DEC-001: the delegator steers through the Task text).
- Changing the runtime/model of a copy that has started (existing model change for stopped copies stays as is).
- Configured placements, assignment to an existing copy, user-launched agents/teams/Orgs, application launches (BEH-005).
- Router-chosen model settings (reasoning effort etc.): chosen models start with their default settings (DEC-007).
- Cost accounting/budgets beyond the router's own token usage being recorded like any run's.
- Signing runtimes in; improving the chat's "not signed in" error text (remote-node-runtime-sign-in FU-001).

### Non-Goals

- Re-routing an agent mid-run, or learning automatically from past results. The router "gets smarter" through its editable instructions and the inputs added later.
- Caching router decisions across delegations (each Task differs; DEC-008).

### Preserved Behavior Boundary

- BEH-005; delegated-launch-config-defaults REQ-001..REQ-006 (layer order, one-unit layers, recorded values, restore of older runs), except that a known signed-out runtime is now unusable (BEH-003).
- With no Model Router set up on a node, delegations on that node behave exactly as today (AC-009).
- Start stays all-or-nothing; workspace and auto-approve still come from the starting run (local) or the node's defaults (peer).
- CM-10: the node that runs a delegated run owns its runtime choice; no credential or model list travels to another node.

### Prerequisites

| Prerequisite ID | Finding And Evidence | Blocks (REQ / AC IDs) | Sent To (agent) / Task Key | Status |
| --- | --- | --- | --- | --- |
| PRE-001 | The Model Router needs reliable live facts about each node's agent runtimes (installed, signed in, models, usage limits). Probes A-15…A-19 (`evidence/limit-probes/`) show these are readable per runtime; the user decided the tool deserves its own ticket and comes first (2026-10-25). Handoff: `handoff-pre-001-agent-runtimes-tool.md` | REQ-004/004a (router facts), all router slices | `/project_task_manager`, Task key pending | sent (2026-10-25) |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | When a fresh delegated copy starts, each agent gets its launch from the first usable layer: (1) its agent default; (2) for a team member, its team default; (3) **the Model Router of the node it runs on**, when one is set up; (4) locally only, the delegating run's launch (today's inherited layer). | BEH-001, BEH-002 | Must | User's setup stays authoritative and predictable; router fills the gaps | DEC-001 |
| REQ-002 | A layer is usable when it names a runtime and model, the runtime is available **and not known to be signed out** on that node, the model is offered there and its settings are valid. A skipped layer is recorded as a note with its reason ("signed out" is a new reason). A sign-in state that can't be read counts as usable. | BEH-003 | Must | "Pick what the node has and the user is signed in to" | DEC-005 |
| REQ-003 | A runtime-only default (no model) is no longer just skipped: the router must choose a model on that runtime when it is usable. | BEH-001 | Should | User's example "IE on Codex" without fixing the model | DEC-006 |
| REQ-004 | One router request per delegation covers every agent of the copy that needs a choice. Its first message (the routing request) holds: the Task text (description, or the saved Task's text); the target's name and description and, per agent needing a choice, its name, description, role in the team, any skipped default with its reason and any runtime it must stay on (REQ-003); the delegating run's runtime/model as context. The router answers per agent: runtime, model and a one-sentence reason. | BEH-001, BEH-002 | Must | User: "output is simple: for this Task use runtime X and model Y (per member)" | DEC-004 (SR-002) |
| REQ-004a | **(SR-002)** The system gives the selected router agent, on any runtime, environment tools for the node it runs on: runtimes (installed/available, signed in, reachable, running agents, recent failures, usage limits where the runtime reports them); models per runtime (offered models, context size, price where known); usage statistics (token usage and cost per runtime/model); and a submit-decision tool. Only the selected router run has these tools. | BEH-001, BEH-002 | Must | User 2026-10-24: "the system should provide some kind of tools … to know the environment: runtime, model, runtime statistics, do I still have a limit, is it still reachable" | DEC-012 |
| REQ-004b | **(SR-002)** The system ships a "model-routing" skill that the selected router has automatically: its job, the tools, how to decide, how to answer. The router agent's own instructions hold the user's preferences. | BEH-001, BEH-002 | Must | User: "it should have one skill … should also have some knowledge" | DEC-012 |
| REQ-004c | **(SR-004)** The router is a normal agent: how it reasons and what it remembers (its instructions, skills, memory, files) is its own, like any agent's. The system adds no knowledge-file feature; automatic outcome feedback to the router is a follow-up (FU-001). | BEH-001, BEH-002 | Should | User 2026-10-24: "it depends on how the agent itself is doing the reasoning … it's just a normal agent" | DEC-013 |
| REQ-005 | Every router decision is checked by the submit-decision tool before anything starts: each choice must be a usable runtime/model pair on that node (and on the required runtime for REQ-003). An invalid choice is returned to the router as a tool error so it can correct it; no valid decision within the time limit (QR-001) is a router failure. | BEH-001, BEH-002 | Must | No silent or impossible choice | DEC-004 (SR-002) |
| REQ-006 | Router failure (not usable, time limit QR-001 exceeded, invalid answer): locally, affected agents use the inherited layer and the note says the router failed and why; on a peer node, the delegation is refused with a message naming the node, the agent and the router's failure. With no router set up on a peer, the refusal says that no default and no Model Router is set up on that node. | BEH-001, BEH-002 | Must | "Clear error, no silent switch" | DEC-003 |
| REQ-007 | **(SR-002)** The user creates the router as an ordinary agent (e.g. in their own agent project) and selects it in a **Model Router** card in Server Settings, per node. Routing is on only when an agent is selected **and** its own default runtime/model is usable on that node; otherwise routing is off and delegation behaves as today. The card shows a warning when the selected agent's default is missing or unusable, and a delegation that needed the router adds a note saying the Model Router is not usable and why. | BEH-001, BEH-002 | Must | User 2026-10-24: "if user didn't configure the model routing agent … still default behavior"; "the agent must be usable" | DEC-002 (SR-002) |
| REQ-008 | A router choice is recorded on the copy with source "Model Router" and its reason, restored with the run, and shown: in the `delegate_task` result as a launch note per routed agent, and in run Settings rows. | BEH-004 | Must | "The choice and its reason are visible" | DEC-009 |
| REQ-009 | A peer node returns, with a started run, each agent's runtime, model, source and notes; the delegating node shows them in the delegation result and in Settings rows for the remote copy. | BEH-004 | Must | Remote choice visible where the delegation happened | DEC-009 |
| REQ-010 | **(SR-004)** Each routing is an ordinary run of the router agent: it appears in the router agent's own history, never in the delegating run's tree; its token usage is recorded like any run's. It starts with auto-approve on, in the node's temp workspace. | — | Must | User 2026-10-24 | DEC-014, DEC-015 |
| REQ-011 | Configured placements, existing copies, user-launched runs and application launches keep their behavior; with no router set up, delegation behaves exactly as today. Older recorded runs restore unchanged. | BEH-005 | Must | Scope guardrail | Preserved |
| REQ-012 | The collaboration model (CM-12) and GLOSSARY.md are updated: remote runs start on defaults, else the target node's Model Router; the term "Model Router" is defined. | BEH-002 | Must | Governing docs stay true (design principle 15) | — |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-004, REQ-008 | BEH-001 / SCN-001 | Router set up locally. SE Team: SD has default Claude/Opus, others none. PM delegates a design-and-build Task | SD on Claude/Opus (agent default, no router call for it). Others on router choices; result has one note per routed member with runtime, model and reason | — | Server integration test with a stub router answer; user verification |
| AC-002 | REQ-001 | SCN-001 | All members have usable defaults | No router call; behavior as today | — | Server test |
| AC-003 | REQ-004, REQ-005 | SCN-002 | Router answers with a model not offered, then a valid one | Retry once; valid answer used | Second invalid answer → REQ-006 failure | Server test |
| AC-004 | REQ-006 | SCN-002 | Local router fails (time limit or invalid twice) | Affected agents on the inherited launch; note "Model Router could not choose (reason); runs on X/y (inherited from the run)" | — | Server test |
| AC-005 | REQ-001, REQ-004, REQ-009 | BEH-002 / SCN-003 | Peer node with router set up; delegated agent/team has no default there | Starts on the peer; each agent on a signed-in runtime/model of the peer; delegating result and Settings show choices and reasons | — | Two-server e2e; user verification on Docker node |
| AC-006 | REQ-006 | SCN-004 | Peer without router and no default; or peer router fails | Refused before anything starts, message names node, agent and cause (no default and no Model Router / router failure) | — | Two-server e2e |
| AC-007 | REQ-002 | BEH-003 / SCN-005 | M1 default on Codex; Codex signed out on that node | M1 skipped with note "signed out"; next layer used | Sign-in unreadable → default used | Server test |
| AC-008 | REQ-003 | SCN-001 | M1 default names Codex only | Router chooses a Codex model for M1 | Router picks another runtime → invalid (REQ-005) | Server test |
| AC-009 | REQ-007, REQ-011 | BEH-005 / SCN-007 | No router selected; or the selected agent has no usable default runtime/model | Every delegation behaves as today; existing tests pass. With a selected but unusable router, the card shows a warning and a delegation that needed it has a note saying why routing did not happen | — | Existing tests; server and web tests |
| AC-010 | REQ-008, REQ-011 | SCN-006 | Run with a routed copy is stopped and reopened | Same runtime/model; Settings still shows "Model Router" and the reason; older runs restore unchanged | — | Restore test |
| AC-011 | REQ-007, REQ-004a, REQ-004b | SCN-008 | User creates a router agent with a usable default, selects it in the Model Router card | Next delegation needing a choice runs it with the system skill and the environment tools, and uses its submitted decision | — | Web/server test; user verification |
| AC-012 | REQ-010 | SCN-001 | A routed delegation | No router conversation appears in the run tree; its token usage is recorded | — | Server test |
| AC-013 | REQ-001..REQ-009 | SCN-001, SCN-003 | User's own check in the desktop app | Local and Docker-peer delegations of the SE Team run members on chosen runtimes/models, visibly | — | User verification |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Goal Or Event | Trigger / Entry Surface | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Delegating agent | Hand a Task to a local agent/team | `delegate_task` to catalog address | Some agents without usable default; router set up | Layers checked → router asked once for uncovered agents → answer checked → copy starts → notes returned | Each agent on default or routed choice | SCN-002 | Supported Normal Scenario | User Task; resolver | REQ-001..008; AC-001..003, AC-008 |
| SCN-002 | System | Delegating agent | Same, router fails | As SCN-001 | Router unusable / slow / invalid | Failure → inherited layer with note | Copy starts, visibly | — | Supported Explicit Edge Scenario | User: "fallback when the router is unavailable" | REQ-005, REQ-006; AC-003, AC-004 |
| SCN-003 | Contract | Delegating agent on node A | Hand a Task to a peer node B | `delegate_task` with `node` | Target has no usable default on B; B's router set up | A sends start with Task text → B resolves, asks its router → B starts → answers with launches → A shows them | Run on B with B's runtimes | SCN-004 | Supported Normal Scenario | User comment 2026-10-24; CM-10 | REQ-001, 004, 009; AC-005 |
| SCN-004 | Contract | Delegating agent on A | Same, B cannot choose | As SCN-003 | No router on B, or it fails | Refusal before start | Clear message to delegator | — | Supported Explicit Edge Scenario | CM-12 refusal today | REQ-006; AC-006 |
| SCN-005 | System | Delegating agent | Default on a signed-out runtime | Any fresh copy | Runtime signed out on that node | Default skipped with note → next layer | Runs on a working runtime | Sign-in unreadable → default used | Supported Explicit Edge Scenario | remote-node-runtime-sign-in E-07 | REQ-002; AC-007 |
| SCN-006 | User | User | See what each agent runs on and why | Delegating conversation; run Settings | Copy started | Read note / open Settings | Runtime, model, source, reason | — | Supported Normal Scenario | Task "choice is visible" | REQ-008, 009; AC-001, 005, 010 |
| SCN-007 | System/User | User; agent | Unchanged starts | User launch; configured placement; existing copy; application | — | Unchanged | Unchanged | — | Supported Normal Scenario | Existing behavior | REQ-011; AC-009 |
| SCN-008 | User | User (node owner) | Set up the node's router | Agents page; Server Settings → Model Router card | — | Create router agent with default runtime/model → select it in the card | Router used for later delegations | Selected agent unusable → warning, today's behavior | Supported Normal Scenario | User 2026-10-24 | REQ-007; AC-009, AC-011 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (small, within existing surfaces)
- Product Design fields: N/A — not applicable (no Product Design requested).
- Explicitly illustrative content or permitted variation: note and source-label wording follow existing launch-note and Settings patterns.
- Required screens and states: delegation result notes (existing `launch_notes`); Settings rows: new source "Model Router" with reason, and remote copy rows; the Model Router appears as a normal agent definition (runtime/model default, instructions).
- Product decisions that need the user: none open (all decided, see Decisions).

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Measurable Requirement Or Constraint | Conditions | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-005, REQ-006 | Performance | One router request (plus at most one retry) per delegation; the whole router step is bounded at 60 s, then counts as failure | Only when an agent needs routing | Server test with a slow stub |
| QR-002 | REQ-002 | Performance | Availability, sign-in and model catalog checked at most once per runtime per delegation | Per delegation | Unit test |
| QR-003 | REQ-011 | Compatibility | Every run recorded before this change restores without error | All run records | Restore test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (recorded launch source of copies; peer start answer).
- Must be preserved: every recorded copy and its launch values and source.
- Acceptable loss: none.
- Unknowns: repository persisted-data transition convention (architecture phase).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Peer wire contract (start request/answer) | Start carries the Task text; answer carries launches | `remote-requests.ts`; DESIGN.md rule 9 (same release) | Both nodes must be updated |
| Vendor sign-in status | `signedOut` makes a runtime unusable | `AgentRuntimeSignInReader` | `unknown` stays usable |
| Collaboration model CM-12 | Amended by REQ-012 | `collaboration_model.md` | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related REQ / AC | Status | Approval Applicability |
| --- | --- | --- | --- | --- |
| `launch-selection-order.md` | The complete selection order and every case (scope, usability, order, incomplete defaults, router active/outcomes, refusals, display, examples). Requested by the user 2026-10-24 | REQ-001..REQ-009; AC-001..AC-011 | Proposed (SR-003) | Behavior-defining; approved with the requirements |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | A cheap model answers the routing request well within 60 s | QR-001 | Architecture measures (UNK-001) | Open |
| ASM-002 | The Task text the delegator writes is enough context for routing | REQ-004 | User verification | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Who decides, and when does the router run? | Core of the feature; predictability vs. flexibility; cost | (a) The delegator chooses explicitly in `delegate_task`. (b) The router decides for every delegated agent; defaults are only hints. (c) Defaults first; the router decides only for agents no usable default covers on that node. | (a) Agents don't know which runtimes/models a node has or is signed in to, so we'd need new catalog tools and it can't work cross-node without exposing a node's model list. (b) Makes every delegation slower and costlier, and could overrule a deliberate choice. (c) Keeps the user's setup authoritative, fixes the cross-node refusal, and gives a per-Task choice to every agent whose default is left empty. A delegator can steer by writing a preference in the Task. **Recommended (c). User chose (c), 2026-10-24:** "if the user didn't configure that, the model routing router agent should do." | User | Decided |
| DEC-002 | How is the router turned on? | Cost; opt-in | SR-001 proposed a built-in definition. User 2026-10-24: the user creates the router agent and selects it in a Server Settings card; not selected → no routing; the selected agent must have a usable default runtime/model of its own, else still today's behavior. | Adopted as stated (REQ-007). Detail decided by the Solution Designer: the card warns when the selected agent is unusable, and a delegation that needed it notes why routing did not happen, so a broken setup is never silent. | User | Decided |
| DEC-012 | How does the router learn about the environment? | Flexibility; "gets smarter as factors are added" | (i) Everything pushed into its first message (SR-001). (ii) System tools it calls, plus a system skill (user, 2026-10-24) | (ii): new facts become new tools and skill text without changing the request shape; works on every runtime through the Agent Tools MCP. Usage-limit data exists for Codex (`account/rateLimits/updated`, currently ignored); other runtimes to be investigated in architecture and reported as "unknown" where not available. | User | Decided |
| DEC-013 | How does the router gain knowledge? | User: "gain more and more knowledge" | (i) A system knowledge file. (ii) Automatic outcome feedback. (iii) The agent's own business, like any agent | The user framed the router as a normal agent whose reasoning is its own. A system-provided knowledge file would be machinery for one agent; its author can already give it skills, instructions and files. **(iii)**, with automatic feedback recorded as follow-up FU-001. | Solution Designer (within user direction) | Decided |
| DEC-014 | Is the router's reasoning visible? | Teaching the router | (i) Each routing is a run in the router agent's own history. (ii) Hidden | **(i)**. User 2026-10-24: "router agents in its own history. Of course, it's just a normal agent." | User | Decided |
| DEC-003 | What happens when the router fails? | "Clear error, no silent switch" | Locally: (x) refuse the delegation, or (y) use the inherited launch with a visible note. On a peer node there is nothing to inherit, so refuse. | (x) blocks work on a router hiccup, although a working launch exists. (y) keeps work going and is not silent: the note in the delegation result and in Settings says the router failed, why, and what is used instead. **Recommend (y) locally, refusal with a clear message on a peer.** User agreed 2026-10-24: "your recommendation when the router fails on this node is correct." | User | Decided |
| DEC-015 | What is the router, technically, and what does it return? | Clean boundary | User 2026-10-24 | A clean interface: given the routing request, it returns per agent a runtime and a model (plus the one-sentence reason the Task requires to be visible). It is implemented by running the selected normal agent, with auto-approve on; the system provides it the environment tools. | User | Decided |
| DEC-004 | Router inputs and output; validation | Quality and safety of the choice | REQ-004/REQ-005 | Give it only what a choice needs and nothing that leaves the node (no credentials). Its answer is checked against the usable pairs it was given, so it can never pick something unavailable; one retry, since models occasionally misformat. | Solution Designer | Decided |
| DEC-005 | Does a signed-out runtime make a default unusable? | User: "the user is signed in to" | Today unchecked (fails at first turn) | Treat a known `signedOut` as unusable (skip with note), so it falls back clearly instead of failing later. An unreadable state stays usable so a flaky status check never blocks. | Solution Designer | Decided |
| DEC-006 | Runtime-only default | Lets the user fix the runtime but not the model | Today: skipped as incomplete | Use it as a constraint for the router: the user's example ("IE on Codex") then works with a Task-fitting Codex model. Without a router it stays skipped as today. | Solution Designer | Decided |
| DEC-007 | Does the router choose model settings (e.g. reasoning effort)? | Scope | — | Keep the first version to runtime + model; settings use the model's defaults. Can be added to the router later without changing the shape. | Solution Designer | Decided |
| DEC-008 | Router cost and caching | User: cheap model, cache | — | Cost is bounded by DEC-001 (only gaps) and DEC-002 (user picks its model); one router run per delegation for all members. Caching decisions does not fit (each Task differs); runtime and model facts are read once per delegation. Token usage is recorded. | Solution Designer | Decided |
| DEC-009 | Where the choice and reason are shown | Visibility | Delegation result, Settings, run header | Use the existing places: the `delegate_task` result's launch notes (the delegator and the user see it where it happened) and run Settings rows; add remote copies there. The run header shows no runtime/model today; adding it is a separate UI change. | Solution Designer | Decided |
| DEC-010 | Where does the router run for cross-node work? | Correctness and privacy | On the delegating node (needs the peer's model list) or on the target node | The target node owns its runs (CM-10), knows its runtimes and sign-in, and its owner set up its router. The delegating node only sends the Task text earlier (it already sends it as the work packet). **On the target node.** | Solution Designer | Decided |
| DEC-011 | Which starts are routed? | Scope | All starts vs. fresh delegated copies | Only fresh delegated copies (local and peer). User launches have a launch form; configured placements and existing copies already have a launch. | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001, BEH-002 | AC-001, AC-002, AC-005 | SCN-001, SCN-003 |
| REQ-002 | UC-005 | BEH-003 | AC-007 | SCN-005 |
| REQ-003 | UC-001, UC-002 | BEH-001 | AC-008 | SCN-001 |
| REQ-004 | UC-001, UC-002 | BEH-001, BEH-002 | AC-001, AC-003, AC-005 | SCN-001, SCN-003 |
| REQ-005 | UC-001, UC-002 | BEH-001, BEH-002 | AC-003 | SCN-002 |
| REQ-006 | UC-001, UC-002 | BEH-001, BEH-002 | AC-004, AC-006 | SCN-002, SCN-004 |
| REQ-007 | UC-003 | BEH-001, BEH-002 | AC-009, AC-011 | SCN-008 |
| REQ-008 | UC-004 | BEH-004 | AC-001, AC-010 | SCN-006 |
| REQ-009 | UC-004 | BEH-004 | AC-005 | SCN-003, SCN-006 |
| REQ-010 | UC-001, UC-002 | — | AC-012 | SCN-001 |
| REQ-011 | — | BEH-005 | AC-009, AC-010 | SCN-007 |
| REQ-012 | UC-002 | BEH-002 | — (docs review) | SCN-003 |

## Architecture Phase Input

- Scenario paths to map: SCN-001..SCN-008.
- Constraints: layer order and one-unit layers; all-or-nothing start; CM-10 ownership; no credential travels; same-release peers; older runs restore unchanged.
- Deferred to architecture: how the router request is run (agent run on its configured runtime with a structured answer vs. a lighter single request), its time limit enforcement, sign-in read vs. cached status, persisted origin value and reason, wire fields, where the seeded router definition lives.
- Facts to verify: router latency on a cheap model (UNK-001); sign-in read cost (UNK-002); persisted-data convention for a new launch origin.
- Known risks: RSK-001 (poor choices; mitigated by visible reasons and editable instructions), RSK-002 (cost; bounded by DEC-001/DEC-002).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none.

### Approved Basis Ready For Design

- Approval recorded (the user's, or yours within the direction with the user informed): `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none.
