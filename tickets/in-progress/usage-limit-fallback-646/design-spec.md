# Design Spec — autobyteus-646 Runtime fallback on a usage limit

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Requirements: [requirements-doc.md](requirements-doc.md) SR-002 (direction set by the founder on 2026-11-25; DEC-002/003/005/006 to be confirmed with this contract)
- User approval of the design: **Pending**. The Task requires the founder's review of the data contract and policy before implementation. This file holds the data contract and policy for that review (Principle 17: the contract before the rest of the design). The spines, owners and files follow after his answer.
- Design status: `Draft` (contract stage)
- Investigation notes: [investigation-notes.md](investigation-notes.md)
- Authorities read (2026-11-25): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `docs/modules/model_routing.md`, `docs/modules/agent_runtimes.md`, `docs/modules/run_history.md` (runtime switch), `docs/modules/agent_work_journal.md`

## Data Contract (for the founder's review)

### C-1 Run event (telemetry) — the hub's record, new, stored

**Envelope:** the same for every kind, now and later.

```json
{ "eventId": "5b0c…", "at": "2026-11-25T06:42:41Z", "kind": "usage_limit_reached",
  "run": { "rootKind": "agent", "rootRunId": "computer_use_operator_b75dfef4…",
           "agentRunId": "computer_use_operator_b75dfef4…", "agentDefinitionId": "computer-use-operator" },
  "data": { … the kind's own fields … } }
```

| Field | Meaning | Readers |
| --- | --- | --- |
| `eventId` | UUID, unique on this node | switch record (C-2), deduplication |
| `at` | When it happened (ISO time) | exhaustion (C-3), ordering |
| `kind` | What happened; each kind has one `data` shape, defined with it | listeners select by kind |
| `run` | Which run and agent: its root kind (`agent`, `agent_team`, `agent_org`) and ID, the agent's run ID, and its definition | listeners that act on the run, history |
| `data` | The kind's own fields | that kind's listeners |

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
{ "recordedAt": "2026-11-25T06:43:05Z", "eventId": "5b0c…", "rootRunId": "computer_use_operator_b75dfef4…",
  "agentRunId": "computer_use_operator_b75dfef4…", "agentDefinitionId": "computer-use-operator",
  "from": { "runtimeKind": "codex_app_server", "llmModelIdentifier": "gpt-6.1-terra" },
  "to":   { "runtimeKind": "claude_agent_sdk", "llmModelIdentifier": "opus" },
  "chosenBy": "model_router", "reason": "Claude handled this agent's browser tasks well; Codex resets in 2 days.",
  "routerFailure": null, "outcome": "switched" }
```

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

## Rest of the design

Spines, owners, files, removals and classification follow after the founder's answer on this contract and policy.
