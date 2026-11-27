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
  - Retention (R-14): sealed files whose last line is older than 31 days are deleted, at startup and after each seal (`SealedJsonlLog.removeSealedOlderThan`). The active file stays.
  - `readSince(kind, since)` reads newest file first and stops at a file whose newest line is older.
  - An unreadable line is skipped with a warning.
- `src/run-events/run-event-hub.ts`: `RunEventHub`.
  - `publish(event)` logs one info line, appends to the log, then calls the kind's listeners one after another.
  - A listener's failure is logged and never stops the others, the run or the publisher; `publish` never throws.
  - `subscribe(kind, listener)` returns its unsubscribe.
  - No replay: a listener hears live events only.

### Who decides "usage limit" (R-13, R-16)

Each runtime's backend classifies its own errors, as `error_kind: "usage_limit"`:

- **Codex** knows at once: `codexErrorInfo: usageLimitExceeded` (`backends/codex/events/codex-error-kind.ts`), on the `error` notification and the failed turn.
- **Antigravity, Grok (ACP), Claude** give no structured signal (no recorded Claude Agent SDK payload is known). Their `ERROR` goes out at once, as before. `LateUsageLimitClassification` (`backends/shared/late-usage-limit-classification.ts`) then asks the runtime's limits read, detached and once per turn. When the run's model shows blocked, the backend delivers `ERROR_CLASSIFIED { turn_id, error_kind: "usage_limit" }`; for an unrelated error nothing is sent. The read goes through a process port bound by the composition (the availability service's `readRuntime`).
- `ERROR_CLASSIFIED` is read only by the detector. It is never rendered or stored:
  - the client stream drops it before mapping (`isClientRunEvent` in `agent-run-event-message-mapper.ts`);
  - the presentation adapters answer `not_presented`;
  - the trace accumulator and the application stream projector already ignore unknown kinds.

### Owners

- `src/run-events/detectors/usage-limit-detector.ts`: `UsageLimitDetector` (DS-001), a run-lifecycle observer in `AgentRunPlatformNotices`' fan-out. It hands over no notice and is runtime-agnostic.
  - Which runs: every run that a collaboration root holds (`placeOf` not null). Application- and system-owned runs, the Model Router's own included, are skipped.
  - What it acts on: a terminal `ERROR` with `error_kind: "usage_limit"`, or an `ERROR_CLASSIFIED` with it.
  - At most one event per (run, turn); one without a turn ID is keyed by the second.
  - Scope and reset come from the availability service (one runtime): `blockedModels` is the failed model plus the runtime's models blocked now; `resetAt` is the failed model's `blocked.until`. When that read fails: the failed model only, no reset (1 h).
  - The listener inside the run's dispatch queue only records the facts. The read and the publish run detached.
- `src/run-events/listeners/runtime-exhaustion-view.ts`: `RuntimeExhaustionView` (C-3).
  - A model is exhausted while an event lists it and its `resetAt` (or `at` + 1 h) has not passed.
  - `load()` reads the events still in force at startup, from up to 31 days back.
  - It is subscribed first, so later listeners see the new state.
  - It is read by delegation's launch check (`launch-preferences/launch-fallback-ports.ts`) and by the fallback candidates.
- `src/run-events/listeners/usage-limit-switch-listener.ts`: `UsageLimitSwitchListener` (DS-003).
  - It reads `AUTOBYTEUS_USAGE_LIMIT_SWITCH_ENABLED` at each event, and skips a run that is no longer live.
  - It chooses (`FallbackChooser`), then has the run's root switch it (`RunRuntimeSwitcher`, `agent-collaboration/execution/services/run-runtime-switcher.ts`), with the failed launch as `from`.
  - A root that finds the agent still in its turn is asked once more after the run's next idle status.
  - Every outcome is recorded (C-2), except `already_switched`.
  - With nothing usable (R-17 makes that the only no-fallback case), the run stays in Error and shows one notice from `system.usage_limit` (R-18): "Usage limits reached: Codex App Server until Nov 27, 09:00 UTC. No other runtime can run now. Choose one in the run's Settings to continue." Every exhausted runtime is named, with "for about an hour" when its reset is unknown.
- `src/compositions/run-events-composition.ts`: `composeRunEvents` (before the run supervisor: the log's retention, the hub, the exhaustion view, the detector, the model-blocked reading) and `startSwitching` (once the roots and Model Routing exist), released at shutdown.

### The switch in each root (R-11, R-12, R-15)

The automatic switch is its own operation, never the person's Settings Save; its checks and texts are its own.

- **Agent root:** `StandaloneAgentRunRoot.switchAgentRuntime`, in its gate. In order:
  1. `StandaloneAutomaticRuntimeSwitch.check` (agent-execution/services) decides. `already_switched` when the run is no longer on the failed launch or a switch is pending (R-12, the run's own state, so it holds across a restart). A refusal for an archived run, a missing record or a model that can't run.
  2. The quiet stop.
  3. The commit (`commitRunRuntimeSwitch` with the pending switch and its cause), in the run's transition lane.
  4. The root sets its own inherited launch from the committed metadata (R-15). The launch records who chose it as its source (R-19: `model_router`, `agent_history` or `node_fallback`; a person's Save records `settings`).
  5. The continue message.

  A run another node delegated here switches too (CM-10): `canSwitchRuntime`'s peer rule is the person's Settings rule. The delegating node shows the new launch on its next read of the run's summary.
- **Team root:** `RootTeamRun.switchAgentRuntime` → `TeamMemberRuntimeSwitch`. In order:
  1. The same checks.
  2. The member's quiet stop.
  3. `TeamMemberRuntimeSwitchCommitter`, which commits only that member through `applySelectionToConfiguredMember`, with the launch source of who chose it (R-19).
  4. The handle's `replaceSelection`.
  5. The continue message.

## What the person and the agent see

- **The marker row** is rendered from the pending switch's stored `cause`: "Codex App Server usage limit reached (resets Nov 27, 09:00 UTC) — switched to Claude Agent SDK (opus). Chosen by the Model Router: <reason>." The history version ends "Chosen from this agent's history.", the node fallback's "Chosen by the node." (R-7, R-17).
- **The continue notice** (R-9, R-10): "Continue the task where you left off."
  - It is an ordinary SYSTEM input, so the hand-over preface combines into it on the same turn.
  - It is tagged `present_as_notice` (autobyteus-ts), so memory records it as a notice from `system.usage_limit`, never as a user message.
  - The run publishes that notice once it is forwarded.
  - The failed input is not sent again; the hand-over's work journal carries it.
- An error is a live row only, as for every run. On AutoByteus the hand-over preface also shows as a notice after a reload (FU-646-02, pre-existing).

## Tests

- `tests/unit/run-events/`: hub and log retention, exhaustion view, detector, switch listener.
- `tests/unit/agent-execution/backends/shared/late-usage-limit-classification.test.ts`, `tests/unit/agent-execution/standalone-automatic-runtime-switch.test.ts`.
- `tests/unit/agent-collaboration/execution/error-classified-presentation.test.ts`, `tests/unit/services/agent-streaming/agent-stream-sequence.test.ts` (AR-012).
- Built-server E2E: `tests/e2e/run-events/usage-limit-switch-built-server.e2e.test.ts` (UL-01 … UL-09, `RUN_USAGE_LIMIT_SWITCH_E2E=1`) and the two-server `tests/e2e/run-events/usage-limit-switch-peer-run.e2e.test.ts` (ULP-01, `RUN_USAGE_LIMIT_PEER_E2E=1`).
- `tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` (`error_kind`).
- `tests/unit/agent-execution/runtime-switch-cause.test.ts`.
- The roots' switch: `tests/unit/standalone-agent-run-root/standalone-root-runtime-switch.test.ts`, `tests/unit/agent-team-execution/team-member-runtime-switch.test.ts`.
