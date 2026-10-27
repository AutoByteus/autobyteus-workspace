# Requirements Document — Model Router For Delegated Work (autobyteus-32)

## Document Status

- Status: `Approved` for behavior; UI details of REQ-009/REQ-010 pending the Product Team's user-approved design (DEC-020 changed 2026-10-26)
- Current solution revision ID: `SR-012` (server-side refinements from the architecture reviewer's preliminary points, 2026-10-26; UI pending Product Design, SR-011)
- Package identifier: `delegated-runtime-model-routing`
- Request / ticket: Project Task **autobyteus-32** "Runtime/model routing for delegated work" (user 2026-10-09/11; priority raised 2026-10-24)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-10-26
- Approved by and reference: Solution Designer within the direction (user informed 2026-10-26). The direction is the user's (§ Direction, 2026-10-24/25); the user decided DEC-020/021 and accepted DEC-022 on 2026-10-25 ("okayyy"); no `Needs user` decision remains. Reference: the Solution Designer's conversation message of 2026-10-26 (SR-009).
- Exact approved requirements baseline: this document at SR-012 (behavior), with `launch-selection-order.md` at SR-012; UI details of REQ-009/REQ-010 pending the Product Team's approved design.
- Behavior-defining supplements: [`launch-selection-order.md`](launch-selection-order.md) at SR-007 (approved with this document)

## Direction Set By The User (2026-10-24/25)

1. Defaults first; a Model Router decides for agents no usable default covers (the delegator's runtime/model stays the last resort on this node; a peer node refuses clearly).
2. The router is **our built-in agent, marked internal**, with **one long-lived conversation per node**; routing requests arrive in that conversation.
3. A **feature switch, off by default** (like Applications); the router's runtime and model are set on the Model Routing page.
4. **Internal agents**: optional `internal` attribute on an agent definition (absent = normal); server setting **"Show internal agents"**, off by default, for debugging.
5. The router learns from the user (taught in its conversation), from outcomes, and from its own observations; its durable memory is a **knowledge note** per node.
6. Facts come from tools: **`list_available_agent_runtimes`** (delivered by prerequisite autobyteus-303); plus reading/updating the knowledge note, submitting the decision, web search and reading web pages; **no shell or file tools**.
7. A **Model Routing page** in Settings shows how the router decides over time: task kinds, choices, statistics, decisions; "Agent runtimes now" exists already (autobyteus-303).
8. Task kinds come from a **fixed list editable on the page**.

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
| BEH-005 | User | SCN-007, SCN-008 | No router, no internal agents | Model Routing page: switch, router runtime/model, knowledge note, conversation, statistics, decisions, "Show internal agents" | "Agent runtimes now" (303) | — |
| BEH-006 | System | SCN-009 | — | The router learns from outcomes of its choices | — | — |
| BEH-007 | System | SCN-010 | Configured placements, existing copies, user launches, application launches | Unchanged; feature off → everything as today | All | delegated-launch-config-defaults |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| Delegating agent | Hand over work | Agents start on suitable, unblocked runtimes/models; result says what and why | Needs no knowledge of runtimes |
| User (node owner) | Control cost and quality | Switch, router runtime/model, knowledge, visibility | Off by default |
| User (observer, teacher) | See and improve the router | Decisions, statistics, conversation, knowledge note | — |
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
| REQ-003 | The router is a **built-in agent definition marked `"internal": true`**, shipped with its instructions and tools: `list_available_agent_runtimes`, `read_routing_knowledge` / `update_routing_knowledge`, `submit_launch_choices`, web search and read URL; no shell or file tools. It runs with auto-approve on. Its runtime and model are set on the Model Routing page and stored in server settings (built-in agent files are rewritten at startup). | BEH-005 | Must | Direction 2, 6 |
| REQ-004 | **One long-lived router conversation per node.** Routing requests are delivered into it as messages; requests arriving while it is busy are handed over together in its next turn and answered together. It is restored after a restart. | BEH-001, BEH-002 | Must | Direction 2 |
| REQ-005 | A routing request carries: the Task text; the target's name and description; per agent to choose for, its name, description, role, any skipped default with its reason, and any runtime it must stay on (runtime-only default); the team members already covered and their launches; the delegating run's runtime/model. The router reads live facts with `list_available_agent_runtimes` and answers with `submit_launch_choices`: per agent a runtime, a model, a task kind (from the list, REQ-011) and a one-sentence reason. | BEH-001, BEH-002 | Must | DEC-004 |
| REQ-006 | `submit_launch_choices` accepts a decision only when every asked agent gets a usable, unblocked runtime/model on the node (and on its required runtime); otherwise it returns the error to the router to correct. No valid decision within the routing budget (40 s for the report read and the decision together, QR-001), or the router not active → router failure: this node uses the delegating run's launch with a note naming the failure; a peer node refuses with a clear message. | BEH-001, BEH-002 | Must | DEC-003 |
| REQ-007 | The **knowledge note**: one per node, the router's durable memory; included in every routing request; the router updates it with `update_routing_knowledge` (rewriting to keep it short, the previous version kept); the user reads, edits and undoes it on the page. | BEH-006 | Must | Direction 5 |
| REQ-008 | **Internal agents — delivered by autobyteus-308 (PRE-002)**; this ticket only uses it: the built-in Model Router ships with `"internal": true`, so it is hidden from browsing, picking and delegation while "Show internal agents" is off (built-in agents are already excluded from collaboration), and "Open conversation" opens it by run ID whatever the setting. | BEH-005 | Must | Direction 4; autobyteus-308 |
| REQ-009 | **Visibility of a choice**: the `delegate_task` result has one line per routed agent (runtime, model, reason) and a note per skipped layer or router failure; run Settings rows show source "Model Router" with the reason; a peer node returns each agent's launch, source and notes, and the delegating node shows them in the result and in Settings rows for the remote copy. | BEH-004 | Must | — |
| REQ-010 | **Model Routing page** (Settings): Setup (switch; router runtime/model with its status; "Show internal agents"; "Open conversation" even while internal agents are hidden); Knowledge note (view, edit, undo); Decisions (latest routings: time, Task title, task kind, agent → runtime/model, source, reason, link to the delegating run); Overview (statistics, REQ-012); Agent runtimes now (exists, autobyteus-303). | BEH-005 | Must | Direction 7 |
| REQ-011 | **Task kinds**: a fixed list kept per node, editable on the page, initially: design, implementation, code review, testing, writing, research, computer use, other. The router picks one per routed agent. | BEH-005 | Must | Direction 8 |
| REQ-012 | **Decision records and statistics**: **while Model Routing is on (SR-012)**, every fresh delegated copy records, per agent: time, Task title, task kind (when routed), runtime, model, source (agent default, team default, Model Router, inherited), reason and notes. The Overview shows, for a chosen period (7 days, 30 days, all): per task kind, which runtimes/models were used and how often; router vs defaults share; and, once outcomes exist (REQ-013), how routed runs went. | BEH-005, BEH-006 | Must | Direction 7 |
| REQ-013 | **Moved out (DEC-021, user 2026-10-25):** learning from outcomes becomes its own Task after this one. This ticket records the decisions (REQ-012) so that Task can attach outcomes to them. | BEH-006 | — | DEC-021 |
| REQ-014 | Collaboration model CM-12 and GLOSSARY ("Model Router", "internal agent", "routing request", "knowledge note", "task kind") are updated in the same change. | BEH-002 | Must | DESIGN.md |

## Acceptance Criteria

| AC ID | Related REQ | Scenario | Trigger | Observable Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, 005, 006, 009 | SCN-001 | Feature on; PM delegates the SE Team; SD has a usable default, others none | SD on its default; others on router choices (unblocked); result lines with runtime, model, reason | — | Server test (stub router) + user check |
| AC-002 | REQ-002 | SCN-010 | Feature off | Every delegation exactly as today | — | Existing tests |
| AC-003 | REQ-001 | SCN-005 | Feature on/off; a default on Codex while Codex's weekly limit is used up | Default skipped with note "blocked until …"; next layer used | — | Server test (fixture report) |
| AC-004 | REQ-006 | SCN-002 | Router answers an unusable model, then a valid one | Error returned; valid answer used | 40 s without a valid answer → delegating run's launch with a router-failure note | Server test |
| AC-005 | REQ-001, 006, 009 | SCN-003, SCN-004 | Docker peer with feature on / off | On: peer's router chooses; launches shown on the delegating node. Off: refused "no default … and node … has Model Routing off" | Peer router failure → refused with reason | Two-server e2e; user check on Docker node |
| AC-006 | REQ-004 | SCN-001 | Three delegations at once | All answered in the router's next turn(s); each copy gets its choices | — | Server test |
| AC-007 | REQ-007 | SCN-007 | User teaches "writing → Gemini" in the router conversation | Knowledge note updated; next writing Task routed accordingly (with a real router model) | Undo restores the previous note | User check |
| AC-008 | REQ-008 | SCN-008 | Model Routing on; "Show internal agents" off | The Model Router agent and its conversation are absent from Agents, pickers, history; "Open conversation" on the page opens it | — | Web test (relies on autobyteus-308) |
| AC-009 | REQ-010, 011, 012 | SCN-007 | User opens Model Routing after some delegations | Decisions list and Overview statistics by task kind and runtime/model for the chosen period; task kind list editable | — | Web test; user check |
| AC-010 | REQ-013 | — | Moved out with REQ-013 | — | — | — |
| AC-011 | REQ-003 | SCN-007 | Router turn | Router has exactly its tools; no shell/file tools; auto-approve on | — | Server test |
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
| SCN-007 | User | User | Set up, teach and watch the router | Model Routing page; router conversation | switch on, set model, teach, read stats | Router improves; visible | Supported Normal | REQ-002, 003, 007, 010..012 |
| SCN-008 | User | User | Hide/show internal agents | Server setting | toggle | Lists change | Supported Normal | REQ-008 |
| SCN-009 | System | Run outcome | Learn from outcomes | routed run fails / user corrects | outcome recorded → router told | Knowledge may improve | Supported Normal | REQ-013 |
| SCN-010 | System | — | Unchanged starts | other launches; feature off | unchanged | unchanged | Supported Normal | REQ-002 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` — a new page with several sections (REQ-010) and changes to run Settings rows and the delegation result.
- Product Design: **requested** by the user on 2026-10-26 (`product-design-request.md`; delegated to `/product_team`, team run `product_team_290aa848c58646ee8378520dcc8694a0`). The approved UI/UX specification will be linked here and becomes normative for the page and the choice display.
- Required states: switch off (sections explain the feature; nothing else active); on with router not active (reason); decisions empty; statistics with no data; knowledge note empty; conversation hidden vs shown.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-006 | Performance | **(SR-012)** The routing step (runtime report + router decision) is bounded at 40 s; a routed `delegate_task` answers within 50 s, under the runtimes' MCP tool-call time-outs (Codex default 60 s, A-28); a peer start request is bounded at 50 s and B's routing fits inside it | Server tests with slow fakes; live check per runtime |
| QR-002 | REQ-004 | Performance | Concurrent requests answered in shared turns, not one turn each | Server test |
| QR-003 | REQ-012 | Compatibility | Runs recorded before this change restore unchanged | Restore test |
| QR-004 | REQ-003, 008 | Security | The router has no shell/file tools; internal agents are not delegation targets | Tests |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes` — new: decision records, knowledge note (+ previous version), task kind list, router settings; changed: launch source (router origin + reason), remote links (launches), agent definition attribute `internal`.
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
- A hidden agent's run opened by URL shows a generic avatar (O-1) — "Open conversation" may show it; acceptable.
- A hidden `@` mention is refused as `COLLABORATOR_ADD_FAILED` (O-2) — the router is built-in and never a mention target; no impact.

## Decisions

| Decision ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Who decides | Defaults first, router for the gaps | User (2026-10-24) | Decided |
| DEC-003 | Router failure | This node: delegating run's launch + note; peer: refusal | User | Decided |
| DEC-004 | Router inputs/outputs | REQ-005; answer checked by the decision tool | Solution Designer | Decided |
| DEC-007 | Model settings | Runtime + model only; model defaults | Solution Designer | Decided |
| DEC-015 | Router shape | Clean interface, normal agent, auto-approve | User | Decided |
| DEC-016 | Router identity | Built-in, internal, one conversation per node | User (2026-10-25) | Decided |
| DEC-017 | Router tools | REQ-003 list; no shell/file | User agreed (2026-10-25) | Decided |
| DEC-018 | Knowledge | Note per node; user teaches; outcomes; undo | User (2026-10-25) | Decided |
| DEC-019 | Task kinds | Fixed editable list | Solution Designer (user did not object) | Decided |
| DEC-020 | Page design | **Changed by the user (2026-10-26):** "i feel UI should be designed first … contact @Product Team to work on the UI design first". The Model Routing UI (page sections, router conversation, where choices show) goes to the Product Team first; REQ-009/REQ-010 UI details follow its user-approved result. | User | Decided — Product Design Requested |
| DEC-021 | Ticket size | autobyteus-32 is large (router, internal agents, page, statistics, peer routing, outcomes). As with autobyteus-303, splitting gives earlier, checkable results. Recommend: autobyteus-32 = router core (REQ-001…REQ-012, REQ-014); learning from outcomes (REQ-013) as its own Task after it, and "internal agents" (REQ-008) as a small first part Task, since it is general and the router needs it. | User | **Decided (user 2026-10-25):** internal agents first as its own Task (PRE-002); router core next; learning from outcomes (REQ-013) as its own Task after the router (recommendation accepted with "okayyy") |
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
