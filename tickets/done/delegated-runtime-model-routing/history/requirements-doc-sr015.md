# Requirements Document — Model Router For Delegated Work (autobyteus-32)

## Document Status

- Status: `Approved` (SR-014), including the UI: the Product Team's user-approved UI/UX specification is linked in § UI and is normative for the page and the choice display
- Current solution revision ID: `SR-015` (wording: "the Model Router agent", never "conversation" (user, 2026-10-26); the router's run is not a collaboration member (ARCH-REV-001 AR-001); SR-014 version in `history/requirements-doc-sr014.md`)
- Package identifier: `delegated-runtime-model-routing`
- Request / ticket: Project Task **autobyteus-32** "Runtime/model routing for delegated work" (user 2026-10-09/11; priority raised 2026-10-24)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-10-26
- Approved by and reference: the user's own decisions for every behavior change since SR-012 (Product Design rounds 2–22, relayed by the Product UI/UX Designer in the user's words, and DEC-023 answered by the user in round 21), and the user's approval of the UI (2026-10-26: "Perfect, I think the UI, now I think everything is working now …"). Details within that direction (label reuse, "No Project Task" grouping, internal-workspace location rule, workspace confinement per runtime) decided by the Solution Designer; user informed 2026-10-26 (SR-014). Earlier: SR-009 within the direction (user informed 2026-10-26).
- Exact approved requirements baseline: this document at SR-015, with `launch-selection-order.md` at SR-015 and the Product UI/UX specification `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/delegated-runtime-model-routing/ui-ux-spec.md` (Approved, design revision `ce3e417`, record commit `205aff6`).
- Behavior-defining supplements: [`launch-selection-order.md`](launch-selection-order.md) at SR-007 (approved with this document)

## Direction Set By The User (2026-10-24/25)

1. Defaults first; a Model Router decides for agents no usable default covers (the delegator's runtime/model stays the last resort on this node; a peer node refuses clearly).
2. The router is **our built-in agent, marked internal**: **one long-lived Model Router agent per node**; routing requests are sent to that agent.
3. A **feature switch, off by default** (like Applications); the router's runtime and model are set on the Model Routing page.
4. **Internal agents**: optional `internal` attribute on an agent definition (absent = normal); server setting **"Show internal agents"**, off by default, for debugging.
5. The router learns from the user (who talks to the Model Router agent), from outcomes, and from its own observations; its durable memory is a **knowledge note** per node.
6. Facts come from tools: **`list_available_agent_runtimes`** (delivered by prerequisite autobyteus-303); plus submitting the decision, web search and reading web pages. ~~No shell or file tools.~~ **Changed by the user (round 19–21, DEC-023):** the router is an ordinary agent in **its own internal workspace**, keeps its knowledge in an ordinary file there and writes it with normal file tools.
7. A **Model Routing page** in Settings shows how the router decides over time: choices, statistics, decisions; "Agent runtimes now" exists already (autobyteus-303).
8. ~~Task kinds come from a fixed list editable on the page.~~ **Replaced by the user (2026-10-26, SR-013):** "This task kind is too complicated … Why does the user have to edit those? … the configuration page UI … very, very easy … one user input area where user just inputs [text], that's it … the agents is able to learn, but the user just gives them some kind of professional knowledge … not a huge abundance of information." The user edits nothing but one text box (the knowledge note); the router labels each choice with a short task kind itself.

## Problem And Desired Outcome

- Problem: an agent in a delegated copy that no usable default covers runs on the delegating run's runtime/model on this node, whatever the Task, and is refused on a peer node; nothing chooses for the Task or avoids runtimes whose limits are used up (on 2026-10-24 Codex was blocked for a week and Antigravity's Claude/GPT models for two days).
- Desired outcome: when the Model Routing feature is on, a node's Model Router chooses a runtime and model for each such agent from the Task, the node's live runtimes and limits, and what it has learned; the choice and its reason are visible; the user can watch, teach and correct it; when it is off, nothing changes.
- Observable definition of success: with the feature on, the Project Task Manager delegates a Task to the Software Engineering Team; members without a usable default start on runtimes/models chosen by the router, none on a blocked model; the delegation result and run Settings show each choice and reason; the Model Routing page shows the decision, its task kind and the statistics; the same works when the team runs on a Docker peer node with that node's router.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Current Behavior (evidence) | Desired Behavior | Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001, SCN-002 | Agent without usable default → delegating run's launch (this node) | Feature on: the router chooses; router failure → delegating run's launch with a note | Agent default → team default order; all-or-nothing start | investigation notes (resolver) |
| BEH-002 | Contract | SCN-003, SCN-004 | Peer: no usable default → refused | Peer's router chooses when its feature is on; else refused with a clear message | CM-10 (target node owns the run); no credential travels | CM-12; receiver |
| BEH-003 | System | SCN-005 | A default on a runtime that is signed out, or whose model is blocked by a used-up limit, is used and fails at the first turn | Such a default is skipped with a note | Availability and model checks | autobyteus-303 report; sign-in reader |
| BEH-004 | User | SCN-006 | Settings shows local copies' runtime/model/source; remote copies not shown | Router source + reason; remote copies' launches shown | Existing rows | `delegatedLaunchRows.ts` |
| BEH-005 | User | SCN-007, SCN-008 | No router, no internal agents | Model Routing page: switch, router runtime/model, knowledge, "Talk to the router", statistics, decisions, "Show internal agents" | "Agent runtimes now" (303) | — |
| BEH-006 | System | SCN-009 | — | The router learns from outcomes of its choices | — | — |
| BEH-007 | System | SCN-010 | Configured placements, existing copies, user launches, application launches | Unchanged; feature off → everything as today | All | delegated-launch-config-defaults |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| Delegating agent | Hand over work | Agents start on suitable, unblocked runtimes/models; result says what and why | Needs no knowledge of runtimes |
| User (node owner) | Control cost and quality | Switch, router runtime/model, knowledge, visibility | Off by default |
| User (observer, teacher) | See and improve the router | Decisions, statistics, the Model Router agent, its knowledge | — |
| Model Router (internal agent) | Choose well | Live facts, its knowledge, the Task | Only its tools; auto-approve on |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Fresh delegated copy on this node with agents no usable default covers | SCN-001, SCN-002 |
| UC-002 | Fresh delegated copy on a peer node (`delegate_task` with `node`) | SCN-003, SCN-004 |
| UC-003 | A default that cannot run now (signed out, model blocked by a limit) is skipped visibly | SCN-005 |
| UC-004 | The user sees each copy's launch, source and reason (delegation result, run Settings, remote copies) | SCN-006 |
| UC-005 | The user turns Model Routing on, sets the router's runtime/model, teaches it, edits its knowledge, and watches decisions and statistics on the Model Routing page | SCN-007, SCN-008 |
| UC-006 | (moved out, DEC-021) | — |
| UC-007 | Internal agents are hidden unless "Show internal agents" is on | SCN-008 |

### Out Of Scope

- Changing launches of configured placements, existing copies, user-started runs, application launches; changing a started copy's runtime/model.
- Router-chosen model settings (reasoning effort etc.).
- Running the router of one node for another node.
- Localizing server texts on the page (autobyteus-303 FU-004).
- Faster runtime reads (autobyteus-303 FU-005).

### Non-Goals

- Automatic re-routing of a running agent; caching router decisions across delegations.

### Preserved Behavior Boundary

- BEH-007; delegated-launch-config-defaults REQ-001..REQ-006 (layer order, one-unit layers, recorded values, restore of older runs), except BEH-003.
- Feature off: every delegation behaves exactly as today, including no blocked-default skip (DEC-022, SR-010).
- Start stays all-or-nothing; workspace and auto-approve come from the starting run (this node) or the node's defaults (peer).
- CM-10: the node that runs a delegated run owns its runtime choice; no credential travels.

### Prerequisites

| Prerequisite ID | Finding And Evidence | Blocks | Sent To / Task Key | Status |
| --- | --- | --- | --- | --- |
| PRE-001 | Live runtime/model/limit facts per node | REQ-005, REQ-006 | `/project_task_manager`, **autobyteus-303** | delivered (merged `eac8ee6dfc`, Terminal 2026-10-25) |
| PRE-002 | Internal agents (`internal` attribute, "Show internal agents" setting): general functionality the built-in router needs (REQ-008); the user decided on 2026-10-25 to do it first as its own small Task | REQ-003, REQ-008, REQ-010 | `/project_task_manager`, Task key pending (`handoff-pre-002-internal-agents.md`) | delivered (**autobyteus-308**, merged `e34321789d`, Terminal 2026-10-26) |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Source / Decision |
| --- | --- | --- | --- | --- |
| REQ-001 | Selection order for each agent of a fresh delegated copy, as `launch-selection-order.md` defines: agent default → (member) team default → the node's Model Router (when active) → (this node only) the delegating run's launch → refusal. A layer is usable only when its runtime is installed and not signed out and its model is offered and not blocked by a used-up limit (facts from the autobyteus-303 report). | BEH-001, BEH-002, BEH-003 | Must | Direction 1; DEC-001 |
| REQ-002 | **Model Routing feature switch** per node, off by default. Off: no router, no routing, no new behavior (DEC-022). On: the router is active when its configured runtime/model is usable on the node. | BEH-005, BEH-007 | Must | Direction 3 |
| REQ-003 | The router is a **built-in agent definition marked `"internal": true`**, shipped with its instructions and tools: `list_available_agent_runtimes`, `submit_launch_choices`, web search, read URL, and file reading/writing in its workspace. **(SR-014, DEC-023)** It runs in **its own internal workspace** (`<appData>/internal-workspaces/autobyteus-model-router/`), with auto-approve on, **confined to that workspace where the runtime allows it**: on Codex, writes and commands only inside the workspace (sandbox `workspace-write`); on Claude, no shell tool and file writes only inside the workspace; on the AutoByteus runtime, only the listed tools (no shell). Antigravity and Grok cannot be confined today: the router on them runs like any auto-approved agent (FU-005). Its runtime and model are set on the Model Routing page and stored in server settings (built-in agent files are rewritten at startup). | BEH-005 | Must | Direction 2, 6; DEC-023 |
| REQ-004 | **One long-lived Model Router agent per node** (one agent run, kept across restarts). Routing requests are sent to it as messages; requests arriving while it is busy are handed over together in its next turn and answered together. **(SR-015)** It is not a collaboration member: it has no `delegate_task`, `send_message_to` or other automatic collaboration tools, and no agent can message it. | BEH-001, BEH-002 | Must | Direction 2; ARCH-REV-001 AR-001 |
| REQ-005 | A routing request carries: the Task text; the target's name and description; per agent to choose for, its name, description, role, any skipped default with its reason, and any runtime it must stay on (runtime-only default); the team members already covered and their launches; the delegating run's runtime/model. The router reads live facts with `list_available_agent_runtimes` and answers with `submit_launch_choices`: per agent a runtime, a model, a short task kind label of its own (REQ-011) and a one-sentence reason. | BEH-001, BEH-002 | Must | DEC-004 |
| REQ-006 | `submit_launch_choices` accepts a decision only when every asked agent gets a usable, unblocked runtime/model on the node (and on its required runtime); otherwise it returns the error to the router to correct. No valid decision within the routing budget (40 s for the report read and the decision together, QR-001), or the router not active → router failure: this node uses the delegating run's launch with a note naming the failure; a peer node refuses with a clear message. | BEH-001, BEH-002 | Must | DEC-003 |
| REQ-007 | **Knowledge (SR-014, user rounds 19–21):** the router keeps its own knowledge in `knowledge.md` in its workspace, an ordinary file it reads and rewrites with its file tools (keeping it short). The user teaches it by talking to it ("Talk to the router"); there is no knowledge area, edit or undo on the page. The server puts the file's current text into every routing request (so the router spends no routing time reading it). The file is visible in the router run's Files when internal agents are shown. | BEH-006 | Must | Direction 5; DEC-023 |
| REQ-008 | **Internal agents — delivered by autobyteus-308 (PRE-002)**; this ticket uses it: the built-in Model Router ships with `"internal": true`, so it is hidden from browsing, picking and delegation while "Show internal agents" is off and listed like any internal agent when it is on; "Talk to the router" opens it by run ID whatever the setting. **(SR-014)** A workspace in the internal-workspaces folder is an **internal workspace**: left out of the Workspaces list while internal agents are hidden, shown with its runs when they are shown — a general rule, nothing router-specific in the web app. | BEH-005 | Must | Direction 4; autobyteus-308; DEC-023 |
| REQ-009 | **Visibility of a choice**: the `delegate_task` result has one line per routed agent (runtime, model, reason) and a note per skipped layer or router failure; run Settings rows show source "Model Router" with the reason; a peer node returns each agent's launch, source and notes, and the delegating node shows them in the result and in Settings rows for the remote copy. | BEH-004 | Must | — |
| REQ-010 | **Model Routing page** (Settings), as the approved UI/UX specification defines (UIS-001..008, VIS-001..026): the switch on the title line; a problem line only when routing is on but the router cannot answer (by reason code); tabs **Configuration** (router runtime and model, "Talk to the router"), **Decisions** (one block per Task with its delegations, folded teams, source and reason per agent; filter All / Model Router / Not routed), **Overview** (period; agents per source; per task kind runtime/model counts; not routed; router failures), **Runtimes** (the existing autobyteus-303 content). The router's run is an ordinary agent run; the run header does not show the routed choice. | BEH-005 | Must | Direction 7; DEC-020 |
| REQ-011 | **Task kinds (SR-013):** nothing for the user to manage. The router gives each routed agent a short task-kind label (a few words, e.g. "implementation", "code review"). To keep the Overview grouping stable, each routing request lists the labels already used on the node (most used first) and the router is told to reuse one when it fits; the tool trims the label and compares labels without regard to letter case. | BEH-005 | Must | Direction 8 |
| REQ-012 | **Decision records and statistics**: **while Model Routing is on (SR-012)**, every fresh delegated copy **resolved on this node** records (a copy started on a peer is recorded by the peer only; user, 2026-10-26) the Task it serves **(SR-013, user 2026-10-26: Decisions grouped by Task)**: for a Project Task its key, Project and title — the Task given with `task_id`, or, when a task agent delegates part of its work, the Task of that task agent's latest assignment; for a Task with no Project (a description-only delegation) its task ID and the first line of the description, grouped as "No Project Task". Then, per delegation: time, delegating agent, target, node; per agent: task kind (when routed), runtime, model, source (agent default, team default, Model Router, inherited), reason and notes. The Overview shows, for a chosen period (7 days, 30 days, all): per task kind, which runtimes/models were used and how often; router vs defaults share; and, once outcomes exist (REQ-013), how routed runs went. | BEH-005, BEH-006 | Must | Direction 7 |
| REQ-013 | **Moved out (DEC-021, user 2026-10-25):** learning from outcomes becomes its own Task after this one. This ticket records the decisions (REQ-012) so that Task can attach outcomes to them. | BEH-006 | — | DEC-021 |
| REQ-014 | Collaboration model CM-12 and GLOSSARY ("Model Router", "Model Router agent", "internal workspace", "routing request", "knowledge file", "task kind"; never "router conversation", SR-015) are updated in the same change. | BEH-002 | Must | DESIGN.md |

## Acceptance Criteria

| AC ID | Related REQ | Scenario | Trigger | Observable Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, 005, 006, 009 | SCN-001 | Feature on; PM delegates the SE Team; SD has a usable default, others none | SD on its default; others on router choices (unblocked); result lines with runtime, model, reason | — | Server test (stub router) + user check |
| AC-002 | REQ-002 | SCN-010 | Feature off | Every delegation exactly as today | — | Existing tests |
| AC-003 | REQ-001 | SCN-005 | Feature on/off; a default on Codex while Codex's weekly limit is used up | Default skipped with note "blocked until …"; next layer used | — | Server test (fixture report) |
| AC-004 | REQ-006 | SCN-002 | Router answers an unusable model, then a valid one | Error returned; valid answer used | 40 s without a valid answer → delegating run's launch with a router-failure note | Server test |
| AC-005 | REQ-001, 006, 009 | SCN-003, SCN-004 | Docker peer with feature on / off | On: peer's router chooses; launches shown on the delegating node. Off: refused "no default … and node … has Model Routing off" | Peer router failure → refused with reason | Two-server e2e; user check on Docker node |
| AC-006 | REQ-004 | SCN-001 | Three delegations at once | All answered in the router's next turn(s); each copy gets its choices | — | Server test |
| AC-007 | REQ-007 | SCN-007 | User teaches "use Antigravity for writing" to the Model Router agent ("Talk to the router") | The router updates `knowledge.md` in its workspace; the next writing Task's routing request carries it and is routed accordingly (with a real router model) | — | Live API/E2E + user check |
| AC-008 | REQ-008 | SCN-008 | Model Routing on; "Show internal agents" off | The Model Router agent and its run are absent from Agents, pickers, history; "Talk to the router" opens it; its workspace is absent from the Workspaces list; with the setting on, both are listed | — | Web test (relies on autobyteus-308) |
| AC-009 | REQ-010, 011, 012 | SCN-007 | User opens Model Routing after some delegations | Configuration, Decisions (by Task, filter) and Overview (period, sources, task kinds) as the UI/UX specification shows, in English and Simplified Chinese | — | Web test; user check |
| AC-010 | REQ-013 | — | Moved out with REQ-013 | — | — | — |
| AC-011 | REQ-003, REQ-004 | SCN-007 | Router turn on each runtime | The Model Router agent's tools equal its template list plus its runtime's file tools (no `delegate_task`, `send_message_to`, `get_handoff_rules`); auto-approve on; runs in its internal workspace; on Codex a write or command outside the workspace is refused by the sandbox; on Claude no shell tool, and a write outside the workspace is denied even when the user's Claude settings allow Write; workspace `.claude` settings are not loaded | Antigravity/Grok: unconfined, documented | Server tests per runtime (tool set, run config) + live check on Codex and Claude, including a user-level allow rule for Write |
| AC-012 | REQ-009 | SCN-006 | Reopen a run with routed and remote copies | Settings rows show runtime, model, source, reason; older runs unchanged | — | Restore test |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Steps | Outcome | Validity | Related |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Delegating agent | Hand a Task to a local copy | `delegate_task` | layers → router request → validated choices → start → notes | Suitable unblocked launches | Supported Normal | REQ-001, 004..006, 009 |
| SCN-002 | System | Delegating agent | Same, router fails | as SCN-001 | failure → delegating run's launch + note | Starts visibly | Supported Explicit Edge (user: no silent switch) | REQ-006 |
| SCN-003 | Contract | Agent on node A | Delegate to peer B | `delegate_task` with `node` | B resolves with its router → answers launches → A shows | Run on B | Supported Normal | REQ-001, 006, 009 |
| SCN-004 | Contract | Agent on A | Peer cannot choose | as SCN-003 | refusal before start | Clear message | Supported Explicit Edge | REQ-006 |
| SCN-005 | System | Delegating agent | Default cannot run now | any fresh copy | skip with note → next layer | Runs on something that works | Supported Explicit Edge | REQ-001 |
| SCN-006 | User | User | See what ran and why | result, Settings | read | runtime, model, source, reason | Supported Normal | REQ-009 |
| SCN-007 | User | User | Set up, teach and watch the router | Model Routing page; the Model Router agent | switch on, set model, teach, read stats | Router improves; visible | Supported Normal | REQ-002, 003, 007, 010..012 |
| SCN-008 | User | User | Hide/show internal agents | Server setting | toggle | Lists change | Supported Normal | REQ-008 |
| SCN-009 | System | Run outcome | Learn from outcomes | routed run fails / user corrects | outcome recorded → router told | Knowledge may improve | Supported Normal | REQ-013 |
| SCN-010 | System | — | Unchanged starts | other launches; feature off | unchanged | unchanged | Supported Normal | REQ-002 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` — a new page with several sections (REQ-010) and changes to run Settings rows and the delegation result.
- Product Design: requested by the user on 2026-10-26 (`product-design-request.md`; `/product_team`, team run `product_team_290aa848c58646ee8378520dcc8694a0`); **approved by the user and integrated 2026-10-26**. Normative, linked (not copied): UI/UX specification `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/delegated-runtime-model-routing/ui-ux-spec.md`; final screenshots `…/visual-references/VIS-001..026`; runnable reference at the design repository root (`ui-reference-runbook.md`, section delegated-runtime-model-routing; `mock-boundaries.md`, section Model Routing). Design repository `/Users/normy/autobyteus_org/autobyteus-web-design`, branch `personal`, design revision `ce3e417`, record `205aff6`, source pin `d74f75a51a`.
- Required states: as the UI/UX specification's State Behavior (off; on and not set; blocked; decisions empty / off with history / router failure / peer window / no match; Overview empty).

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-006 | Performance | **(SR-012)** The routing step (runtime report + router decision) is bounded at 40 s; a routed `delegate_task` answers within 50 s, under the runtimes' MCP tool-call time-outs (Codex default 60 s, A-28); a peer start request is bounded at 50 s and B's routing fits inside it | Server tests with slow fakes; live check per runtime |
| QR-002 | REQ-004 | Performance | Concurrent requests answered in shared turns, not one turn each | Server test |
| QR-003 | REQ-012 | Compatibility | Runs recorded before this change restore unchanged | Restore test |
| QR-004 | REQ-003, 008 | Security | **(SR-014)** The router's writes and commands stay inside its internal workspace on Codex and Claude; on AutoByteus it has no shell; Antigravity/Grok run unconfined like any auto-approved agent (FU-005); internal agents are not delegation targets | Tests; live check |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes` — new: decision records (with Task identity), the router's internal workspace with `knowledge.md`, router settings; a run-config confinement field; changed: launch source (router origin + reason), remote links (launches), agent definition attribute `internal`.
- Must be preserved: all existing runs and definitions read as today; nothing old changes meaning.
- Acceptable loss: none.

## External Contracts And Dependencies

| Contract | Requirement | Evidence | Risk |
| --- | --- | --- | --- |
| autobyteus-303 report (`AvailableAgentRuntimesService`) | Usable/blocked facts and router facts | merged `eac8ee6dfc` | Formats of runtimes (RSK-001 of 303) |
| Peer wire contract | Start request carries the Task text; answer carries launches | `remote-requests.ts`; DESIGN.md rule 9 | Both nodes updated together |

## Supplemental Artifacts

| Artifact | Purpose | Status | Approval |
| --- | --- | --- | --- |
| `launch-selection-order.md` | Every selection case | Proposed SR-007 | Behavior-defining |
| `history/` | Earlier requirements, supplement and design (SR-001…SR-006) | History | — |

## Notes From autobyteus-308 (receipt, 2026-10-26)

- While hidden, an application bound to an internal agent does not resolve at launch — the Model Router is not an application resource; no impact.
- A hidden agent's run opened by URL shows a generic avatar (O-1) — "Talk to the router" may show it; acceptable.
- A hidden `@` mention is refused as `COLLABORATOR_ADD_FAILED` (O-2) — the router is built-in and never a mention target; no impact.

## Decisions

| Decision ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Who decides | Defaults first, router for the gaps | User (2026-10-24) | Decided |
| DEC-003 | Router failure | This node: delegating run's launch + note; peer: refusal | User | Decided |
| DEC-004 | Router inputs/outputs | REQ-005; answer checked by the decision tool | Solution Designer | Decided |
| DEC-007 | Model settings | Runtime + model only; model defaults | Solution Designer | Decided |
| DEC-015 | Router shape | Clean interface, normal agent, auto-approve | User | Decided |
| DEC-016 | Router identity | Built-in, internal, one long-lived Model Router agent per node | User (2026-10-25) | Decided |
| DEC-017 | Router tools | ~~REQ-003 list; no shell/file~~ **Changed by the user (rounds 19–21, DEC-023):** REQ-003 list with file tools in its own workspace; confined where the runtime allows | User | Decided |
| DEC-018 | Knowledge | ~~Note per node; user teaches; outcomes; undo~~ **Changed by the user (round 19):** the router's own `knowledge.md`; taught by talking; no page area, no undo; outcomes later (REQ-013) | User | Decided |
| DEC-019 | Task kinds | **Changed by the user (2026-10-26, SR-013):** no list for the user to edit. The router labels each choice itself; the Solution Designer keeps the label (Decisions and Overview group by it, the user's "how the router decides over time") and keeps it stable by giving the router the labels already used (REQ-011). | User; label detail Solution Designer | Decided |
| DEC-020 | Page design | **Changed by the user (2026-10-26):** "i feel UI should be designed first … contact @Product Team to work on the UI design first". The Model Routing UI (page sections, the Model Router agent's run, where choices show) goes to the Product Team first; REQ-009/REQ-010 UI details follow its user-approved result. | User | Decided — Product Design Requested |
| DEC-021 | Ticket size | autobyteus-32 is large (router, internal agents, page, statistics, peer routing, outcomes). As with autobyteus-303, splitting gives earlier, checkable results. Recommend: autobyteus-32 = router core (REQ-001…REQ-012, REQ-014); learning from outcomes (REQ-013) as its own Task after it, and "internal agents" (REQ-008) as a small first part Task, since it is general and the router needs it. | User | **Decided (user 2026-10-25):** internal agents first as its own Task (PRE-002); router core next; learning from outcomes (REQ-013) as its own Task after the router (recommendation accepted with "okayyy") |
| DEC-023 | Router workspace and file tools (round 19) | The user asks whether the router should run in its own named, persistent workspace with its knowledge as an ordinary file it writes with normal file tools. Evidence (A-29): on Codex and Claude the router already has the runtime's own shell/file tools under auto-approve (Codex `danger-full-access`, `codex-thread-bootstrapper.ts:168-172`; Claude `canUseTool` with auto-approve), so QR-004 "no shell/file tools" is not enforced by the SR-012 design. Recommendation: own workspace `<appData>/model-routing/workspace/` with `knowledge.md`; file tools allowed, writes confined to that folder where the runtime supports it (Codex `workspace-write` sandbox for the router); the server includes the file in each routing request; `read/update_routing_knowledge` and the knowledge GraphQL are dropped. Visibility (round 20, A-30): the workspace is registered as an **internal workspace** (a general flag on the registry entry, set when the server creates a workspace for an internal agent), and the server's workspace list leaves internal workspaces out while "Show internal agents" is off — the autobyteus-308 rule extended to workspaces; no router-specific UI or lookup. | User | **Decided (user, round 21, 2026-10-26):** own internal workspace, as recommended. Visibility control: the existing autobyteus-308 setting "Show internal agents" (`AUTOBYTEUS_SHOW_INTERNAL_AGENTS`), also offered as a row on the Configuration tab; no router-only setting (the router is today the only internal agent, so the effect is the same without a new rule). |
| DEC-022 | Blocked-default skip with the feature off | **Narrowed (SR-010, Solution Designer, user informed 2026-10-26):** the node's runtime report costs 2–5 s (≤ 18 s) on the delegation path inside the root gate (A-22); applying it with Model Routing off would slow every delegation for users who never turn it on. The skip (U4b) applies only while Model Routing is on; off = no change (REQ-002). | Solution Designer | Decided |

## Traceability

| REQ | UC | AC |
| --- | --- | --- |
| REQ-001 | UC-001..003 | AC-001, AC-003, AC-005 |
| REQ-002 | UC-005 | AC-002 |
| REQ-003 | UC-005 | AC-011 |
| REQ-004 | UC-001, UC-002 | AC-006 |
| REQ-005, REQ-006 | UC-001, UC-002 | AC-001, AC-004, AC-005 |
| REQ-007 | UC-005 | AC-007 |
| REQ-008 | UC-007 | AC-008 |
| REQ-009 | UC-004 | AC-001, AC-005, AC-012 |
| REQ-010..REQ-012 | UC-005 | AC-009 |
| REQ-013 | UC-006 | AC-010 |
| REQ-014 | UC-002 | docs review |

## Readiness Check

- Content ready for approval: `Yes`.
- Approval recorded: `Yes` (Solution Designer within the direction, user informed 2026-10-26).
