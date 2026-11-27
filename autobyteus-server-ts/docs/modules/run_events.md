# Run Events

## Scope

The node's stream of moments in agent runs that other parts react to or learn
from (autobyteus-646). It is not a copy of a run's traces. The first kind is
`usage_limit_reached`: a run's turn failed because its runtime reached a usage
limit. Two listeners act on it. The exhaustion view remembers which models are
used up. The switch listener moves the run to another runtime.

Out of scope:
- how the fallback is chosen and the switch records ([Model Routing](./model_routing.md#runtime-switch-on-a-usage-limit));
- the runtime switch and hand-over themselves ([Agent Execution](./agent_execution.md), [Standalone Agent Run Root](./standalone_agent_run_root.md), [Agent Team Execution](./agent_team_execution.md)).

## The event (C-1)

```json
{ "at": "2026-11-25T06:43:00Z", "kind": "usage_limit_reached", "agentRunId": "…",
  "data": { "runtimeKind": "codex_app_server", "llmModelIdentifier": "gpt-6.1-terra",
            "blockedModels": ["gpt-6.1-terra", "gpt-6.1-mini"], "resetAt": "2026-11-27T09:00:00Z" } }
```

- `blockedModels`: the failed model, plus the runtime's models blocked by the same limit.
- `resetAt`: the failed model's reset time, or `null` when the runtime does not report one.

A new kind adds its `data` shape and its listeners; the envelope and the
existing kinds don't change.

## TS Source

- `src/run-events/run-event-types.ts`: the envelope, each kind's data, and the parser of a stored line.
- `src/run-events/run-event-log.ts`: `RunEventLog`.
  - Files: `<appData>/run-events/events_active.jsonl`, sealed at 4 MB (`utils/sealed-jsonl-log.ts`, shared with the routing decision and switch logs).
  - `readSince(kind, since)` reads newest file first and stops at a file whose newest line is older.
  - An unreadable line is skipped with a warning.
- `src/run-events/run-event-hub.ts`: `RunEventHub`.
  - `publish(event)` logs one info line, appends to the log, then calls the kind's listeners one after another.
  - A listener's failure is logged and never stops the others, the run or the publisher; `publish` never throws.
  - `subscribe(kind, listener)` returns its unsubscribe.
  - No replay: a listener hears live events only.
- `src/run-events/detectors/usage-limit-detector.ts`: `UsageLimitDetector` (DS-001), a run-lifecycle observer in `AgentRunPlatformNotices`' fan-out. It hands over no notice.
  - Which runs: every external-runtime run that a collaboration root holds (`placeOf` not null). Application- and system-owned runs, the Model Router's own included, are skipped.
  - What it watches: each published run's terminal `ERROR`.
  - Codex counts only with `error_kind: "usage_limit"`. For the other runtimes, the runtime's limits are read after the error, and the run's model shown blocked means a usage limit; otherwise it logs at debug and publishes nothing.
  - At most one event per (run, turn); an error without a turn ID is keyed by the second.
  - The listener inside the run's dispatch queue only records the facts. The limits read and the publish run detached.
- `src/run-events/listeners/runtime-exhaustion-view.ts`: `RuntimeExhaustionView` (C-3).
  - A model is exhausted while an event lists it and its `resetAt` (or `at` + 1 h) has not passed.
  - `load()` reads the events still in force at startup, from up to 31 days back.
  - It is subscribed first, so later listeners see the new state.
  - It is read by delegation's launch check (`launch-preferences/launch-fallback-ports.ts`) and by the fallback candidates.
- `src/run-events/listeners/usage-limit-switch-listener.ts`: `UsageLimitSwitchListener` (DS-003).
  - It reads `AUTOBYTEUS_USAGE_LIMIT_SWITCH_ENABLED` at each event, and keeps one switch in flight per run.
  - It skips a run that is no longer live, or one already on another runtime.
  - It chooses (`FallbackChooser`), then has the run's root switch it (`RunRuntimeSwitcher`, `agent-collaboration/execution/services/run-runtime-switcher.ts`).
  - The root stops the agent quietly, writes the pending switch with its cause, and posts the continue message: a system input from `system.runtime_handover` that shows no row.
  - A root that finds the agent still in its turn is asked once more after the run's next idle status.
  - Every outcome is recorded (C-2).
  - With no fallback, the run stays in Error and shows one notice from `system.usage_limit`: "Usage limits reached: Codex App Server until Nov 27, 09:00 UTC; …. No other runtime is usable."
- `src/compositions/run-events-composition.ts`: `composeRunEvents` (before the run supervisor) and `startSwitching` (once the roots and Model Routing exist), released at shutdown.

## What the person and the agent see

- **One row: the hand-over marker.** It is rendered from the pending switch's stored `cause`: "Codex App Server usage limit reached (resets Nov 27, 09:00 UTC) — switched to Claude Agent SDK (opus). Chosen by the Model Router: <reason>." The history version ends "Chosen from this agent's history." (R-7).
- **The continue message** the agent reads on its new runtime: "Your last turn stopped because Codex App Server reached its usage limit. You now run on Claude Agent SDK (opus) and have your work journal. Continue the task where you left off." The failed input is not sent again; the hand-over carries it.

## Tests

- `tests/unit/run-events/`: hub, exhaustion view, detector, switch listener.
- `tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` (`error_kind`).
- `tests/unit/agent-execution/runtime-switch-cause.test.ts`.
- The roots' switch: `tests/unit/standalone-agent-run-root/standalone-root-runtime-switch.test.ts`, `tests/unit/agent-team-execution/team-member-runtime-switch.test.ts`.
