# Model Routing

Model Routing lets a node choose the runtime and model of each agent in a
delegated copy (an agent or a team started for a Task) when no default of the
agent or its team can run now. The choice is made by the node's **Model Router
agent**, a built-in internal agent, and every choice is recorded so the user can
see who chose each launch and why.

Source: `src/model-routing/`. UI: Settings -> Model Routing
([settings.md](../../../autobyteus-web/docs/settings.md#settings-model-routing)).
Delegation side: [collaboration_model.md](../design/collaboration_model.md) (CM-12).

## Settings

| Key | Meaning |
| --- | --- |
| `AUTOBYTEUS_MODEL_ROUTING_ENABLED` | The switch (`true`/`false`; off by default). |
| `AUTOBYTEUS_MODEL_ROUTER_RUNTIME` | The runtime the Model Router agent runs on. |
| `AUTOBYTEUS_MODEL_ROUTER_MODEL` | The model it runs on. |

`model-routing-settings.ts` reads and normalizes them; the GraphQL mutations
write them through `ModelRoutingSettings` (registered in the server settings
service).

## Which launch an agent of a copy gets

`CollaboratorLaunchResolver` decides the layer order for each agent of a new
copy; the router never does:

1. the agent's own default, when it can run now;
2. the team's default, when it can run now;
3. the Model Router, when Model Routing is on and the router is active;
4. the delegator's launch (inherited), on this node only;
5. otherwise the delegation is refused, and the refusal says why.

"Can run now" (`launch-preferences/launch-usability-check.ts`) checks the
runtime is installed (U1), signed in (U3), the model exists (U2), its runtime is
not out of limits (U4) and the model is not blocked (U4b). The signed-out and
blocked checks apply only while Model Routing is on, because only then does the
node read its runtimes (`AvailableAgentRuntimesService.readWithSignIn()`). A
skipped default becomes a launch note ("opus is blocked until …").

## The router

- **`ModelRouter`** (`services/model-router.ts`) is the one owner of a routing.
  `status()` gives the page's status (switch, router launch, active or why not:
  `OFF`, no launch set, runtime missing or signed out, model unknown or blocked,
  facts unreadable). `openDelegation()` returns `null` while off; otherwise the
  runtime facts and a `route(request)` that asks the agent. It implements
  `ModelRouterPort` (`domain/model-routing-types.ts`); `NO_MODEL_ROUTING` is the
  off port.
- **Budget.** A routing has 40 s (`ROUTING_BUDGET_MS`) from the moment the
  delegation's routing opens, including the wait in the queue. Outcomes:
  `forwarded` with launches, `not_active`, or `failed` with a reason ("no valid
  answer within 40 seconds", "the Model Router was busy", "the Model Router's
  turn ended without a decision", "… was interrupted", "… failed (…)", "the
  Model Router agent stopped"). A failed routing falls through to the next layer
  and is noted as "Model Router could not choose (…)".
- **One request at a time** (`services/routing-request-queue.ts`, SR-016). The
  queue is FIFO and sends the next request only when the agent's **run** is
  idle (its turn ended and no other input is waiting), never by the routing
  session's state. A user message to the router counts as input and holds the
  queue. A request whose budget ends while waiting is never posted and fails as
  "the Model Router was busy". A request whose budget ends while its turn still
  runs keeps the run busy until that turn ends.
- **The request** (`services/routing-request-text.ts`) is posted to the agent as
  a system notice from `system.model_router` (`MODEL_ROUTER_REQUEST_SENDER_ID`):
  the Task, the copy's agents with their roles and why each needs a choice, what
  is already set, the node's runtimes and models now, the task kinds used so far
  and the agent's `knowledge.md` (first 16 KB).
- **The answer.** The agent calls `submit_launch_choices(requestId, choices)`
  (`agent-tools/model-routing/`, exposed to the runtimes through the
  `model-routing-tools` MCP provider). `ModelRoutingSessions` validates it
  (every agent covered, runtime and model usable now, task kind 1–40 characters,
  a reason) and answers the agent with what to correct; nothing is changed until
  it is accepted. An unknown or closed request answers "Routing request <id> is
  no longer open (answered or timed out); nothing was changed."
- **The agent** (`services/model-router-agent.ts`). One run per node, created on
  first need from the built-in definition `autobyteus-model-router`
  (`built-in-agents/templates/model-router/`), stored in
  `<appData>/model-routing/model-router-agent.json` with the launch it was made
  with (a changed launch makes a new run). It runs in
  `<appData>/internal-workspaces/<id>`, auto-approved, with
  `systemRunOwner: "model_router"`, kept in run metadata and on restore. That
  marker keeps it out of the standalone-run eligibility (no collaboration tools),
  and its internal workspace is not listed while internal agents are hidden.
  The run is reused through the platform's command-ready path
  (`resolveCommandReadyAgentRun`), which also restores a run whose runtime
  stopped, for example after a failed turn; the queue counts such a run as free,
  and each request takes the run, restored if needed, when it is sent. When the
  run cannot be restored, a new one starts. `openModelRouterAgent` opens its run
  for the user.

## Tools of the router's run

The router's tools are its template list (runtimes, `submit_launch_choices`,
`search_web`, `read_url`, `read_file`, `write_file`, `edit_file`), with no
collaboration tools (it is system-owned), plus the tools its runtime brings.
It runs like any auto-approved agent on that runtime, with no router-specific
sandbox (SR-018, the user's decision); its instructions keep its files in its
workspace. On AutoByteus it has only the listed tools (no `run_bash`).

## Decision records

While Model Routing is on, each started copy writes one record per agent: its
launch, the source (`agent_default`, `team_default`, `model_router`,
`inherited`), the task kind and reason when the router chose, the router's
failure and the skipped defaults with why. These structured fields are the only
stored form; no rendered sentence is stored (SR-017; a `notes` field in an older
line is ignored). The node that resolved the copy writes them, on dispatch
success (`RoutingDecisionRecorder`, bound per process), with the delegating
run and agent name. For a copy started on a peer node B, B writes them when A's
work packet arrives (`remote-collaboration/inbound/peer-started-run-decisions.ts`)
with `fromNode` naming A and no delegating run or agent name (B knows none of
A's agents); an ad-hoc Task has no Task ID yet at that point, so its records
group by delegation.

`RoutingDecisionLog` (`stores/routing-decision-log.ts`) appends JSON lines to
`<appData>/model-routing/decisions_active.jsonl` and seals it as
`decisions_NNNNNN.jsonl` at 4 MB. `RoutingStatistics` counts sources, task kinds
and the runtimes/models per task kind over 7 days, 30 days or all.

## Across nodes

A peer start request carries the Task (`task`), so B can route with it; B's
answer carries `launches` (each agent's runtime, model and source), shown in A's
run Settings as read-only rows. A refusal carries `modelRouting {state}` and the
`agentName`; `MODEL_ROUTER_FAILED` is B's code for a failed routing with no
fallback. A start request waits up to 50 s (`PEER_START_REQUEST_TIMEOUT_MS`), to
fit B's 40 s routing; other peer calls keep 20 s.

## GraphQL

`api/graphql/types/model-routing.ts` (JSON results):

- Queries: `modelRoutingStatus`, `modelRoutingDecisions(limit, before, source:
  ROUTER | NOT_ROUTER)`, `modelRoutingStatistics(period: DAYS_7 | DAYS_30 | ALL)`.
- Mutations: `setModelRoutingEnabled(enabled)`, `setModelRouterLaunch(runtimeKind,
  llmModelIdentifier)`, `openModelRouterAgent` (the run ID).

## Composition

`compositions/model-routing-composition.ts` builds the router, log and
statistics and binds them for the process (`PROCESS_MODEL_ROUTING`,
`configureModelRouting`/`findModelRouting`); `build-studio-server.ts` releases
them on shutdown.

## Tests

`tests/unit/model-routing/` (queue, sessions, router, agent, log, tools,
submit tool and records), `tests/unit/agent-collaboration/collaborator-launch-resolver-model-routing.test.ts`,
and the remote collaboration tests for `task`, `launches` and `modelRouting`.
