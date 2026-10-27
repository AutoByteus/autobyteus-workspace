# Runtime/Model Selection Order For Delegated Agents (autobyteus-32)

Behavior-defining supplement to `requirements-doc.md` (REQ-001..REQ-007). It
defines, for every agent of a delegated copy, which runtime and model it starts
on, and every case around that. Status: **Approved (SR-004)** with the requirements.

## 1. When this order applies

| Start | Uses this order? | Where it is evaluated |
| --- | --- | --- |
| `delegate_task` to an address on this node (a fresh copy of an agent or team) | Yes | This node |
| `delegate_task` with `node` (a fresh copy on a peer node) | Yes, without step 4 | The target node, with its own definitions, runtimes, sign-ins and Model Router |
| A teammate inside a delegated team delegates to a catalog address | Yes | The node it runs on |
| Assigning a Task to an existing copy (`target_agent_run_id` / `target_team_run_id`) | No: the copy keeps its recorded launch | — |
| Delegating to an agent already configured in the run (configured placement) | No: its configured launch | — |
| The user starts an agent, team or Org from the app | No: the launch form decides | — |
| Application launches | No: unchanged | — |
| Restoring or reopening a run | No: recorded values, never chosen again | — |
| The Model Router's own run | No: only its own default (section 5) | — |

## 2. When is a runtime/model "usable" on a node

A candidate is usable only if all of these hold, checked on the node the agent will run on:

| Check | Fails when | Note reason |
| --- | --- | --- |
| U1 Complete | It names no runtime or no model | `incomplete` (see 3.2 for runtime-only) |
| U2 Available | The runtime is not installed or its command can't be found | `runtime unavailable` |
| U3 Signed in | The runtime reports **signed out**. "Not required" and "could not be read" count as signed in | `signed out` (new) |
| U4 Model offered | That runtime does not offer the model on this node | `model not offered` |
| U5 Settings valid | The saved model settings are not valid for the model | `model settings invalid` |

Each runtime is checked once per delegation, however many agents use it.

## 3. The order, per agent

### 3.1 Main order

| Step | Layer | Used when | Recorded source |
| --- | --- | --- | --- |
| 1 | The agent's own default | Complete and usable | Agent default |
| 2 | (Team member only) its team's default | Complete and usable | Team default |
| 3 | The node's Model Router | The router is active (section 4) | Model Router + its reason |
| 4 | (This node only) the delegating run's launch (its root's runtime and model) | Its model check passes, as today | Inherited from the run |
| — | Nothing usable | — | The whole delegation is refused; nothing starts |

The first step that gives a usable launch wins, for runtime, model and model
settings together. Every step that was skipped because it was unusable becomes a
note: agent, what was configured, why it couldn't be used, what is used instead.
A step that simply isn't configured gives no note.

### 3.2 Incomplete defaults

| Agent's own default | Team default | Router active? | Result |
| --- | --- | --- | --- |
| Runtime only (e.g. Codex), runtime usable | anything | Yes | Router must choose a model **on that runtime** (the agent's own wish is more specific than the team's) |
| Runtime only, runtime usable | complete and usable | No | Team default (own default skipped: `incomplete`, as today) |
| Runtime only, runtime usable | none/unusable | No | Step 4 locally; refused on a peer |
| Runtime only, runtime **unusable** | anything | anything | Own default skipped with its reason; continue at step 2 |
| Model only (no runtime) | anything | anything | Skipped as `incomplete` (a model ID only means something on its runtime); continue at step 2 |
| None | Runtime only, runtime usable | Yes | Router must choose a model on the team's runtime |
| None | Runtime only | No | Team default skipped: `incomplete`; continue at step 4 / refuse |

### 3.3 Model settings, workspace, auto-approve

- From a default: that default's model settings.
- From the Model Router: the chosen model's default settings.
- From step 4: the delegating run's settings.
- Workspace and auto-approve: unchanged rules (this node: the delegating run's; peer node: the node's temp workspace with auto-approve on).

## 4. Is the Model Router active

| Server Settings → Model Router card | Selected agent's own default on this node | Router active? | What the user sees |
| --- | --- | --- | --- |
| No agent selected | — | No | Nothing new; today's behavior |
| Agent selected | Missing, or incomplete | No | Card warning "has no default runtime/model"; a delegation that needed the router gets the note "Model Router <name> is not usable: no default runtime/model" |
| Agent selected | Complete but unusable (U2–U5) | No | Card warning with the reason; the same delegation note with that reason |
| Agent selected | Usable | Yes | — |
| Selected agent was deleted | — | No | Card warning "the selected agent no longer exists"; same delegation note |

An inactive router is treated exactly as "no router": steps 4 / refusal follow.

## 5. The router's run

| Case | Result |
| --- | --- |
| Which agents it is asked about | Only the agents of this copy that steps 1–2 did not cover. One router run per delegation covers all of them |
| What it is told | The Task text; the target's name and description; per asked agent its name, description, role and any skipped default with reason, and the runtime it must stay on (3.2); the team members already covered and their launches, as context; the delegating run's runtime/model, as context |
| What it can look up | Environment tools for its own node: runtimes (available, signed in, reachable, running agents, recent failures, usage limits where reported), models per runtime, usage statistics; and whatever its own instructions, skills and files give it |
| How it answers | The submit-decision tool: for **every** asked agent, a runtime, a model and a one-sentence reason |
| Its own launch | Its own default only; never routed, never inherited; auto-approve on; the node's temp workspace |
| Time limit | 60 seconds from start to a valid decision |

| Router outcome | This node | Peer node |
| --- | --- | --- |
| Valid decision for every asked agent | Used; source "Model Router" with its reason | Same |
| A choice is not usable, not on the required runtime, or an asked agent is missing | The tool returns the error; the router corrects it within the time limit | Same |
| No valid decision within 60 s, the router's run fails, or its runtime errors | Asked agents use step 4 with the note "Model Router could not choose (reason); runs on X / y (inherited from the run)" | Refused: "The Model Router on node N could not choose a runtime for <agent>: <reason>." |

## 6. Refusals (nothing starts)

| Case | Message to the delegating agent |
| --- | --- |
| This node: an agent has no usable step 1–3 and the delegating run's model check fails | Today's message, with the reason |
| Peer: an agent has no default and the node has no active router | "There is no default runtime configured for the target agent <name> on node <node>, and node <node> has no Model Router set up." (team: "target agent team") |
| Peer: an agent's default is unusable and the node has no active router | Today's message with the specific reason (e.g. "Codex is signed out"), plus "and node <node> has no Model Router set up." |
| Peer: the router failed | Section 5 |

A refusal for one agent refuses the whole copy (all-or-nothing, as today).

## 7. What is shown

| Where | What |
| --- | --- |
| `delegate_task` result (`launch_notes`) | One line per agent that was routed or that skipped a layer, e.g. "implementation_engineer: runs on Codex / gpt-x, chosen by the Model Router: implementation Task, Codex signed in with limit left." Also router-not-usable and router-failed notes |
| Run Settings, delegated copy rows (local and, new, remote) | Runtime, model, source (Agent default / Team default / Model Router / Inherited from the run / As configured in this run) and notes; the router's reason under its source |
| Model Router card | Selected agent, active or not, and why not |
| Router agent's history | Each routing is an ordinary run of the router agent (auto-approve on, temp workspace) |

## 8. Examples

| # | Situation | Result |
| --- | --- | --- |
| E1 | PM delegates SE Team locally; SD default Claude/Opus; others none; router active | SD on Claude/Opus (agent default). Router asked once for the other members |
| E2 | Same, router not selected | SD on Claude/Opus; others on the PM's runtime/model (today) |
| E3 | Same, IE default Codex/gpt-x but Codex signed out | IE: note "signed out"; router chooses for IE (or, without a router, the PM's launch) |
| E4 | IE default "Codex" only; router active | Router picks a Codex model for IE |
| E5 | PM delegates SE Team to Docker node; no defaults there; Docker node router active | Docker node's router chooses all members from the Docker node's signed-in runtimes; the PM's result and Settings show the choices |
| E6 | Same, Docker node has no router | Refused: "There is no default runtime configured for the target agent team … on node docker-1, and node docker-1 has no Model Router set up." |
| E7 | Router selected but its own default is Codex, which is signed out | Card warns; delegation behaves as E2 with a note "Model Router is not usable: Codex is signed out" |
| E8 | Router times out locally | Members it was asked about run on the PM's launch with a router-failed note |
