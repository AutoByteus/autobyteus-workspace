# Design Spec — autobyteus-646 Runtime fallback on a usage limit

## Solution And Approval Basis

- Current solution revision ID: `SR-003`
- Requirements: [requirements-doc.md](requirements-doc.md) SR-002 (direction set by the founder on 2026-11-25; DEC-002/003/005/006 to be confirmed with this contract)
- User approval of the design: **Obtained for the data contract and policy** (the Task requires it before implementation).
  - 2026-11-25: "Yeah the model router agent will eventually learn a lot … it will be able to make really smart decisions."
  - 2026-11-26: "Of course … the events stream doesn't copy that", answering "shall I go ahead … including my three recommendations?"
  - 2026-11-27: he reviewed the contract. His findings (`rootRunId` = `agentRunId`; what `blockedModels` is for) were resolved by trimming C-1/C-2 and explaining `blockedModels`. He set the cost budget out of scope (FU-646-01).
- Design status: `Ready`
- Investigation notes: [investigation-notes.md](investigation-notes.md)
- Authorities read (2026-11-25): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `docs/modules/model_routing.md`, `docs/modules/agent_runtimes.md`, `docs/modules/run_history.md` (runtime switch), `docs/modules/agent_work_journal.md`

## Data Contract (for the founder's review)

### C-1 Run event (telemetry) — the hub's record, new, stored

**Envelope:** the same for every kind, now and later. Every field has a reader (Principle 17; trimmed after the founder's review on 2026-11-27).

```json
{ "at": "2026-11-25T06:42:41Z", "kind": "usage_limit_reached", "agentRunId": "computer_use_operator_b75dfef4…",
  "data": { … the kind's own fields … } }
```

| Field | Meaning | Readers |
| --- | --- | --- |
| `at` | When it happened (ISO time) | exhaustion (C-3: `at + 1 h` when no reset time), ordering |
| `kind` | What happened; each kind has one `data` shape, defined with it | the hub selects listeners by kind |
| `agentRunId` | The agent the event is about | the switch listener. The run holding it (standalone, Team or Org) is looked up live (`ActiveCollaborationRootDirectory.placeOf`), and its definition from its run files when needed |
| `data` | The kind's own fields | that kind's listeners |

Removed because nothing reads them:

- `eventId`;
- `run.rootKind` and `run.rootRunId` (equal to the agent's run ID for a standalone run, and derivable live for a member);
- `run.agentDefinitionId` (history is counted from the run files).

**Kind `usage_limit_reached`** (the only kind in this ticket):

```json
"data": { "runtimeKind": "codex_app_server", "llmModelIdentifier": "gpt-6.1-terra",
          "blockedModels": ["gpt-6.1-terra", "gpt-6.1-terra-mini"], "resetAt": "2026-11-27T09:00:00Z" }
```

| Field | Meaning | Readers |
| --- | --- | --- |
| `runtimeKind`, `llmModelIdentifier` | What failed | exhaustion, router request, switch record |
| `blockedModels` | The runtime's models blocked by the same used-up limits, from the limits read at detection (at least the failed model) | exhaustion |
| `resetAt` | When the runtime says the limit resets; `null` when it doesn't say | exhaustion, notice text |

**Storage:**

- `<appData>/run-events/events_active.jsonl`, one envelope per line, sealed as `events_NNNNNN.jsonl` at 4 MB (as the routing decision log).
- A line that can't be read is skipped and logged (DESIGN rule 7). An unknown `kind` is kept and ignored by every listener.

**The hub's rules (C-1b):**

- **Publish:** `publish(event)` appends the line first, then tells each listener subscribed to that `kind`, in the process, one after another.
- **Isolation:** a listener's failure is logged and never stops the others, the run, or the publisher.
- **No replay:** listeners hear live events only; nothing is replayed after a restart. A listener that needs the past reads the log (the exhaustion view reads the recent `usage_limit_reached` lines at startup and keeps its view current from then on).
- **Not a trace copy:** the stream carries moments other parts react to or learn from, never a copy of a run's traces (the founder, 2026-11-26).
- **Adding a kind:** a new kind adds its `data` shape and its listeners; the envelope and existing kinds don't change.

### C-2 Switch record — new, stored

`<appData>/model-routing/switches_active.jsonl` (beside the routing decisions; same sealing). One line per handled event.

```json
{ "at": "2026-11-25T06:43:05Z", "agentRunId": "computer_use_operator_b75dfef4…", "agentDefinitionId": "computer-use-operator",
  "from": { "runtimeKind": "codex_app_server", "llmModelIdentifier": "gpt-6.1-terra" },
  "to":   { "runtimeKind": "claude_agent_sdk", "llmModelIdentifier": "opus" },
  "chosenBy": "model_router", "reason": "Claude handled this agent's browser tasks well; Codex resets in 2 days.",
  "routerFailure": null, "outcome": "switched" }
```

`at` is read by the router request (most recent first, last 30 days). `agentRunId` is read by statistics (switches per run). `agentDefinitionId` is read by the router request, which selects this agent's earlier switches. `eventId` and `rootRunId` were removed: nothing reads them.

| Field | Meaning | Readers |
| --- | --- | --- |
| `from`, `to` | The launch before and after (`to` null when no fallback) | router request (this agent's earlier switches), Model Routing page later |
| `chosenBy` | `model_router` or `history` (the safety net) | router request, statistics |
| `reason` | The router's one sentence, or "most used by this agent in the last 30 days" | notice row, router request |
| `routerFailure` | Why the router could not choose (off, busy past 40 s, its own runtime exhausted, …); `null` when it chose | statistics, router request |
| `outcome` | `switched`, `no_fallback`, `switch_failed` | router request (what worked), statistics |

### C-3 Exhaustion — derived, not stored

A runtime's model is **exhausted** while some `usage_limit_reached` event lists it in `data.blockedModels` and `now < data.resetAt` (or `now < at + 1 h` when `resetAt` is `null`, DEC-006). It is computed from C-1, the one stored fact. It is read by:

- the delegation launch check, which skips an exhausted default even with Model Routing off;
- the fallback candidates;
- the router request.

### C-4 Run error event — one new field

A run's `ERROR` event gains `error_kind: "usage_limit"` when the runtime says so itself. Codex: `codexErrorInfo` = `usageLimitExceeded` (today the converter drops it). For runtimes that don't say it, the node reads that runtime's limits after a terminal turn error (0 tokens); the run's model shown as blocked means a usage limit.

### C-5 What the person and the agent see

- **Notice row in the conversation**, from `system.runtime_handover`:
  "Codex usage limit reached (resets Nov 27, 09:00) — switched to Claude · opus. Chosen by the Model Router: Claude handled this agent's browser tasks well."
- **Continue message to the agent**, as a system input, so the failed input isn't sent again:
  "Your last turn stopped because Codex reached its usage limit. You now run on Claude (opus) and have your work journal. Continue the task where you left off."
- **No fallback:** the run stays in Error, and its notice reads:
  "Usage limits reached: Codex until Nov 27, 09:00; Antigravity until 18:00. No other runtime is usable."

### C-6 Setting

`AUTOBYTEUS_USAGE_LIMIT_SWITCH_ENABLED`: `true` by default. It is shown in Settings → Model Routing as "Switch runtime when a usage limit is reached". It works whether or not Model Routing (the delegation choice) is on; the router is asked only when it is on and active.

## Policy (for the founder's review)

1. A terminal turn error that C-4 shows is a usage limit publishes C-1. The run itself does nothing more.
2. **Listeners.**
   - Exhaustion (C-3) takes effect at once.
   - The switch listener asks the **Model Router**, when it is on and active, to choose for this run within 40 s. The request gives the usable runtimes and models now (installed, signed in, not exhausted), the agent's runtime/model history (last 30 days) and its earlier switches (C-2).
   - When the router can't answer, the switch listener uses **history**: the agent's most-used usable runtime, with the model it last used there.
3. **The switch.** The run's agent stops quietly, the runtime switch is set (the existing pending switch), and the continue message makes it real through the existing hand-over. The notice row is written, and so is C-2.
4. Every run is covered: started by a person, delegated, Team and Org members (DEC-003).
5. When the first runtime resets, the run stays on the new one, and new runs use their defaults again (DEC-005).
6. **No loops.** In one turn each runtime is tried at most once. A fallback that is exhausted too is skipped. When nothing is left, the run stays in Error with the C-5 text.
7. **Delegation.** A default whose model is exhausted (C-3) is skipped like a blocked default today, with a launch note. Then come the next layers: the router when on, then history, then the delegator's launch.


### C-7 Model Router switch request and answer — new

- **The request** is a system notice from `system.model_router`, like a routing request. It starts with "Switch request <id>" and carries:
  - the agent (name, description) and why it needs another runtime (the event's kind and data, worded);
  - the runtimes and models usable now (with exhausted ones left out);
  - the agent's launch history (C-8);
  - its earlier switches (C-2, last 30 days).
- **The answer** is a new router tool, `submit_runtime_switch(requestId, runtime, model, reason)`. It is checked like `submit_launch_choices`: the runtime and model must be usable now, and the reason is one sentence. A request that is unknown or closed is answered as today.
- **Budget:** 40 s, through the same one-at-a-time queue (`RoutingRequestQueue`).
- **Router template change** (`built-in-agents/templates/model-router/agent.md`). This is a built-in agent's instructions, so the founder sees the exact text (lesson L1). The new section, after "Routing requests":

  > ## Switch requests
  >
  > A switch request arrives as a system notice that starts with "Switch request <id>". An agent's runtime cannot continue (for example its usage limit was reached) and it needs another runtime now. It gives the agent, why, the runtimes and models usable now, the runtimes and models this agent used before, and its earlier switches with their outcome. Choose one runtime and model from the usable list, preferring what worked for this agent before, and answer with `submit_runtime_switch` with the `requestId`, `runtime`, `model` and a one-sentence `reason`. Answer in one turn, within about 40 seconds. When a switch teaches you something (an agent works well or badly on a runtime), record it in `knowledge.md`.

  `agent-config.json` adds `submit_runtime_switch` to its tool list.

### C-8 Agent launch history — derived, not stored

For one agent definition, its launches in the last 30 days:

- runtime and model;
- the number of runs on each;
- when it last used each.

The sources are run files the node already has: standalone and delegated Agent runs (`run_metadata.json`: `agentDefinitionId`, `runtimeKind`, `llmModelIdentifier`, created time from the history catalog) and Team and Org members (their launch in the team or org tree).

It is read by the router request and by the history safety net ("most runs; ties to the most recent; with the model last used on that runtime"). It is computed when a switch or a delegation needs it: a few hundred small files (510 agent and 572 team rows on the founder's Mac), well within a switch's budget.

### Data Contract Validation

Walks:

1. **The screenshot, delegation (UC-001).**
   - The PTM delegates `/computer_use_operator`; its default is Codex · gpt-6.1-terra.
   - The exhaustion view lists gpt-6.1-terra until Nov 27, from an earlier C-1 event. If none exists yet (the first failure on this node), walk 2 covers it.
   - The default is skipped with launch note "gpt-6.1-terra is exhausted until …".
   - Router on: it is asked (the existing routing request, with exhausted models left out). Router off: the history safety net picks Claude · opus (C-8: Claude 2 runs).
   - The run starts on Claude.
2. **First failure (UC-002).**
   - The Codex turn fails; `ERROR` carries `error_kind: usage_limit` (C-4).
   - The detector reads Codex's limits: `blockedModels` and `resetAt`. It publishes C-1, which is logged.
   - The exhaustion view adds it. The switch listener asks the router (C-7) or falls back to history.
   - The switch action stops the agent quietly, sets the pending switch and posts the continue notice. The runtime switch with hand-over happens at that input.
   - The notice row is shown; C-2 `switched` is written.
3. **Claude Opus weekly limit only.** `blockedModels` = [opus]. Claude Sonnet stays usable, so the router may keep the run on Claude with Sonnet.
4. **The fallback fails too.** A new C-1 is published, the exhaustion view now holds both, and a third runtime is chosen. When none is left, C-2 `no_fallback`, the C-5 Error notice, and the run stays in Error. No loop: every tried runtime is exhausted in the view.
5. **No reset time** (the runtime doesn't report it). `resetAt` null, exhausted for 1 h from `at`.
6. **Router exhausted itself.** The router's own run fails or doesn't answer in 40 s: `routerFailure` "the Model Router could not choose (…)", and the history safety net is used. The router's own run is system-owned: the detector never publishes for it (`placeOf` is null), so it is never switched (founder: Settings decides its runtime).
7. **A Team member hits the limit.** The detector finds the member's root through `placeOf`. The switch action asks that root (Team or Org) to switch that one member. The other members keep running.
8. **Setting off.** The switch listener does nothing (the run stays in Error as today); the exhaustion view and the delegation skip still apply. The setting is read when the event arrives.
9. **Restart.** The exhaustion view rebuilds from the log's recent `usage_limit_reached` lines; a switch in flight is not resumed (the run stays in Error and the person can retry).

Checks against real dependencies:

- Codex's `usageLimitExceeded`: generated schema, codex-cli 0.172.0 (notes §3).
- The limits read giving `blocked {until}`: existing parsers and recorded fixtures.
- Run files carrying runtime and model per run: counted on the Mac (notes §4).
- Not yet run: a real non-Codex limit failure (API/E2E: scripted CLIs and recorded payloads; a live case when an account is exhausted).

## Persisted Data / State Transition Decision

- New: `run-events/` log; `model-routing/switches_*.jsonl`; setting key `AUTOBYTEUS_USAGE_LIMIT_SWITCH_ENABLED`. Existing data: `Not Affected` (no file before; absent setting = default on).

## Task Size And Architectural Risk (Mandatory)

- task_size: `Large`. A new subsystem (`run-events/`, the hub), a detector over every run, the switch action across three root kinds (new: switching one member of a live Team or Org), a Model Router request kind and tool, a delegation layer change, history, a setting with its UI toggle, docs.
- architectural_risk: `High`.
  - The shared run lifecycle (stopping and switching live runs automatically).
  - New persistence.
  - The delegation layer order (CM-12).
  - The built-in router's instructions.
  - Concurrency (bursts of events; the one-at-a-time router queue).
- Escalation trigger: anything that copies run traces into the hub, re-posts a person's input, or changes a person's Stop.

## Change Scope (Mandatory)

- **In scope:** UC-001..UC-004.
- **Areas:**
  - `src/run-events/` (new);
  - the usage-limit detector and its run observation;
  - Codex `ERROR` conversion (`error_kind`);
  - the switch action and root operations (standalone, Team, Org);
  - `src/model-routing/` (switch request, tool, switch records, settings);
  - `launch-preferences/` and `CollaboratorLaunchResolver` (exhaustion always checked; the history layer);
  - the router template;
  - web Settings → Model Routing (one toggle);
  - docs `model_routing.md`, `agent_runtimes.md`, new `run_events.md`, `collaboration_model.md` (CM-12 note).
- **Derived consumers:**
  - `availableAgentRuntimes` / `list_available_agent_runtimes` stay live reads.
  - The router request and the delegation check read the exhaustion view.
  - Model Routing statistics are unchanged in this ticket (the switch records are not shown in the UI yet).
- **Deliberately left alone:**
  - the cost budget (FU-646-01);
  - several accounts (autobyteus-498);
  - automatic switch-back;
  - the person's Stop;
  - the conversation UI apart from the notice text;
  - application-owned runs.
- **Follow-ups:** FU-646-01.

## Data-Flow Spine Inventory

| Spine | Start | End | Owner | Why |
| --- | --- | --- | --- | --- |
| DS-001 detect | A run's `ERROR` event | C-1 published | `UsageLimitDetector` | REQ-001, REQ-009 |
| DS-002 publish | `RunEventHub.publish` | log line + listeners told | `RunEventHub` | REQ-009 |
| DS-003 switch | `usage_limit_reached` at the switch listener | run continues on the new runtime, or Error | `UsageLimitSwitchListener` | REQ-004..008 |
| DS-004 delegate | `delegate_task` launch resolution | copy starts on a usable launch | `CollaboratorLaunchResolver` | REQ-003 |
| DS-005 exhaustion | publish / startup | the view's current set | `RuntimeExhaustionView` | REQ-002 |

## Primary Execution Spines

- **DS-001:** `AgentRun ERROR (terminal) → UsageLimitDetector (observes every published run of a collaboration root) → [error_kind usage_limit, or the run's runtime limits read shows its model blocked] → RunEventHub.publish(usage_limit_reached)`
- **DS-003:** `RunEventHub → UsageLimitSwitchListener → [setting on?] → FallbackChooser (ModelRouter switch request C-7, 40 s; else AgentLaunchHistory C-8; candidates = usable now − exhausted) → RunRuntimeSwitcher → root.switchAgentRuntime(agentRunId, launch, notice) → [stop quietly → pending switch → continue notice] → AgentRun on the new runtime (hand-over) → SwitchRecordLog (C-2)`
- **DS-004:** `delegate_task → CollaboratorLaunchResolver → launch usability (+ RuntimeExhaustionView, always) → default skipped → [router on: existing routing request] else FallbackChooser history layer → before the inherited launch → copy starts`

## Ownership Map

| Owner | Owns |
| --- | --- |
| `RunEventHub` (`run-events/run-event-hub.ts`) | Publish (log, then listeners by kind, isolated); subscribe |
| `RunEventLog` (`run-events/run-event-log.ts`) | The JSONL files, sealing at 4 MB, reading recent events of a kind; unreadable lines skipped and logged |
| `run-events/run-event-types.ts` | C-1 envelope and per-kind data types |
| `UsageLimitDetector` (`run-events/detectors/usage-limit-detector.ts`) | Deciding "usage limit" from an `ERROR`, reading the limits, publishing |
| `RuntimeExhaustionView` (`run-events/listeners/runtime-exhaustion-view.ts`) | C-3: the current exhausted set; `isExhausted(runtime, model, now)`; rebuilt at startup from the log |
| `UsageLimitSwitchListener` (`run-events/listeners/usage-limit-switch-listener.ts`) | The policy: setting, choose, switch, record, the Error notice |
| `FallbackChooser` (`model-routing/services/fallback-chooser.ts`) | Router first (C-7), then history (C-8); used by the switch listener and the delegation history layer |
| `AgentLaunchHistory` (`run-history/services/agent-launch-history.ts`) | C-8 |
| `RunRuntimeSwitcher` (`agent-collaboration/execution/services/run-runtime-switcher.ts`) | The switch action: finds the run's root (`placeOf`) and calls its `switchAgentRuntime` |
| Each root: `StandaloneAgentRunRoot`, `RootTeamRun`, `AgentOrgRun` | `switchAgentRuntime(agentRunId, launch, notice)` in its gate: stop the agent quietly (as idle shutdown, never the person's Stop, so no `terminatedAt`), write the pending switch for that agent, post the notice as a system input (the switch becomes real with the existing hand-over) |
| `SwitchRecordLog` (`model-routing/stores/switch-record-log.ts`) | C-2 |

## Dependency Rules

- `run-events/` depends on nothing above it.
  - Detectors receive `publish` (a narrowed hub).
  - Listeners receive what they act through: the switcher, the chooser, the setting.
- `agent-collaboration` and `model-routing` do not import `run-events/` listeners. The composition subscribes them.
- The detector reads limits through `AvailableAgentRuntimesService` (one runtime), never the strategies directly.

## Interface Boundary Mapping

```ts
// run-events/run-event-hub.ts
publish(event: RunEvent): Promise<void>;                      // never throws to the publisher
subscribe<K extends RunEventKind>(kind: K, listener: (event: RunEvent<K>) => Promise<void>): () => void;
// run-events/listeners/runtime-exhaustion-view.ts
isExhausted(runtimeKind: string, model: string, now?: Date): Readonly<{ until: string } | null>;
// agent-collaboration/execution/services/run-runtime-switcher.ts
switchAgentRuntime(agentRunId: string, launch: AgentLaunchSelection, notice: AgentInputUserMessage): Promise<SwitchOutcome>;
// model-routing/services/fallback-chooser.ts
choose(input: { agentRunId; agentDefinitionId; reason: UsageLimitReached }): Promise<FallbackChoice | NoFallback>;
```

## Removal / Decommission Plan

- The "blocked and signed-out checks only while Model Routing is on" condition in the launch check is replaced: exhaustion (C-3) is always checked. The live blocked and signed-out reads stay tied to routing being on, as today.
- No other removal. No dead code was found in the touched files (to be confirmed by the implementer's touched-file check).

## Off-Spine Concerns

- **Logging:**
  - one line per published event (kind, agent run, runtime);
  - one line per listener failure;
  - one line per switch outcome.
- **Settings:** `ModelRoutingSettings` gains the toggle (GraphQL `setUsageLimitSwitchEnabled`; status field). Web: one toggle in Settings → Model Routing.

## Change Sequence

1. `run-events/` (types, log, hub) with tests.
2. C-4 Codex `error_kind`.
3. Detector (scripted error + limits fixtures).
4. Exhaustion view.
5. Root `switchAgentRuntime` (standalone, then Team and Org members) with tests.
6. Switcher.
7. History (C-8) and FallbackChooser; router request and tool (C-7); template.
8. Switch listener and switch records.
9. Delegation: exhaustion always, plus the history layer.
10. Setting, UI toggle, docs.
11. Built-server E2E: scripted Codex `usageLimitExceeded`, a first-turn switch, a mid-work switch, router on and off, a Team member, no fallback, the delegation skip.

## Key Tradeoffs

- **A hub now** vs a direct call from the error to the switch. The hub costs one small subsystem and gives the founder's decoupling and the next kinds (FU-646-01) for free.
- **Exhaustion derived from the log** vs a stored state: one fact, one owner, nothing to keep in sync.
- **Router first, history as the safety net:** the router learns, and work never waits for it longer than 40 s.

## Risks

- **Non-Codex usage-limit errors** are recognized only through the limits read after the error. A runtime whose limits read fails then gives "not recognized", and the run stays in Error as today. API/E2E covers it with recorded payloads.
- **Switching one member of a live Team or Org** is new root behavior. The Team's other members keep running, and the member's pending switch is written while the root is live. This is the review's focus.
- **A burst of events** queues behind the one-at-a-time router; each falls to history after 40 s.

## Guidance For Implementation

- Follow the sequence above.
- Keep every C-1/C-2 field exactly as specified; no field without its reader.
- Tests named in the Change Sequence step 11, plus unit tests per owner.
- Live gated cases when a runtime is actually exhausted (as now for Codex until 2026-11-27).
