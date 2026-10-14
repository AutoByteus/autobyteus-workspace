# Design Spec — TPS as precise as each runtime allows (D3.2: real-time TPS event per model call)

## Solution And Approval Basis

- Current solution revision ID: SR-006. D3.2 resolves Design Impact CR-F01 (CRR-002, API-L04): a Codex call now ends at `rawResponse/completed`, not at its usage update. Earlier: D3.1/SR-005 moved the method choice into each adapter; D3/SR-004 established the base; D1/SR-002 and D2/SR-003 were superseded before review.
- Approved requirements baseline: **R3** (`requirements-doc.md` as of SR-004). The **User** approved it in this conversation on 2026-10-14:
  - TPS belongs to the agent run.
  - It is runtime data and is not stored.
  - It is real time, so reload support is not needed ("I don't care about reload, for TPS … TPS is normally real time").
  - The R1 decisions R3 does not change remain approved by Solution Designer within the direction, user informed.
- Behavior-defining supplements: None.
- Design status: Ready
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/investigation-notes.md`
- Authorities read (2026-10-14):
  - solution-designer `references/architecture-design.md`, `references/design-principles.md`, design-spec template;
  - project `DESIGN.md` (root, the only applicable one);
  - `autobyteus-server-ts/docs/design/data_migration_guideline.md` §1–4 (not triggered);
  - `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md`.
  - `design-examples.md` was not needed.
- Project design-principle conflicts / discrepancies: None.

## Current-State Read

Each runtime adapter emits one canonical `TOKEN_USAGE_UPDATED` event per model call (`reports_model_call=true`). The pipeline is:

1. The adapter emits the event.
2. `TokenUsageEventEnrichmentTransformer` runs `createTokenUsageUpdatedPayload`, the run-side canonical payload builder in `agent-execution/domain/agent-run-token-usage.ts`, then the delta and cost steps. Each step spreads the payload, so extra fields survive.
3. `TokenUsageRunPersistenceTransformer` and the accumulator fold. Fold outputs also spread the payload.
4. `AgentRun` dispatch.
5. Standalone / Team / Org / collaboration streams (strict DTOs in two contract packages).
6. Web `tokenUsageMeterStore` (two live intakes; seen-key de-duplication).
7. `useTokenUsageWorkspaceScope`.
8. `TokenUsageThroughputCard`.

TPS today is derived in the browser (`stores/tokenUsageThroughput.ts`) from pairs of reports. No adapter records call timing, and the Claude tracker emits only after `await readContextUsage()`.

## Task Size And Architectural Risk (Mandatory)

- Task size: Large
- Size rationale: about 22 production files across four packages and several subsystems:
  - autobyteus-ts native loop and notifier type;
  - five server runtime integrations plus one shared helper;
  - the run-side payload builder plus a new acceptance-check file;
  - three server stream projections;
  - two shared contract packages;
  - web store helper, store, types, scope, card, stream adapters and locales;
  - three docs.
- Architectural risk: High
- Risk rationale: the metric's authority moves from the browser to the runtimes and the run's event (ownership change), and two shared stream contracts gain an optional field. Mitigations:
  - no persistence, schema, migration, server state or new API;
  - the accounting code is untouched and never reads TPS;
  - runtime control is unchanged;
  - timing state is per call inside single-threaded adapters;
  - Codex defaults to the always-valid end-to-end method.
- Escalation trigger: return Design Impact if
  - accounting or persistence would store timing/TPS;
  - an accounting step drops the field;
  - a route cannot carry the field without a new message type;
  - a runtime needs extra provider calls or changed requests;
  - Claude `message_start` does not precede thinking in a live trace.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision | Uncertainty |
| --- | --- | --- | --- | --- |
| Native loop | `autobyteus-ts/src/agent/loop/llm-phase.ts` ~150–260 | Request, chunks and final usage in one owner | LlmPhase measures | Hidden reasoning without a count |
| Claude tracker + probe | `claude-call-usage-tracker.ts`; `/tmp/tps-probe/claude-single.tsv` | 1,762 tokens in 16.94 s between `message_start` and `message_delta`; emission lags behind the context read | Stamp at frame receipt | — |
| Codex | `codex-thread-event-name.ts`, `codex-thread.ts`, `codex-thread-token-usage.ts` | No provider duration; per-call usage (`last`) inside cumulative updates; tools between calls | Request-boundary tracker → end-to-end; adapter supplies `last` output | RSK-002 |
| AGY | `agy-stream-event-converter.ts`; AGY fixture | DONE carries `duration_seconds`; `text_delta` is streamed | Generation when thinking = 0, else provider duration | RSK-005 |
| ACP/Grok | `acp/session/acp-agent-session.ts`; Grok fixture | The session owns prompt, updates and usage effects; chunks arrive in bursts | The ACP session attaches boundary timing | Setup time on the first call |
| Payload path | `agent-run-token-usage.ts`; delta normalizer, basis resolver, cost, fold (`...payload` spreads at fold ~36, ~86; normalizer ~11–56) | Fields set at creation reach the stream unchanged | Decide TPS at payload creation, before accounting | Test that the field survives |
| Web intake | `tokenUsageMeterStore.ts` ~266–310 | Seen-key check precedes the summary check | Record TPS after the seen-key check, independent of summary/persistence | — |

## Intended Change

- **Measurement and method:** each runtime adapter measures each model call on the server clock. Because it knows its own stream, it also decides the call's method and reports `output_throughput { method, output_tokens, duration_ms }` directly.
- **Acceptance:** while the run's canonical usage event for that call is built, one small run-side check accepts the value only if it is valid and meets the minimum sample. Otherwise the event's `output_throughput` is null.
- **Delivery:** the existing streams push the event to the exact run in the UI, and the UI shows the newest TPS for the selected run.
- **What is not added:** server state, persistence, a load query, or any accounting change.
- **Cleanup:** the browser pairing estimator is removed and the card is simplified.

## Change Scope (Mandatory)

- In scope (UC-001–004):
  - timing capture in five runtime integrations;
  - per-adapter method choice, and the run-side acceptance check called from the payload builder;
  - one optional event field in two contract packages and the server/web projections;
  - web newest-TPS store, scope, card and locales;
  - docs.
- Deliberately left alone:
  - token counting, fold, pricing, analytics, persistence/schema;
  - Claude turn-end reconciliation;
  - runtime requests and control;
  - other Token Meter sections and cost roll-up selectors;
  - Settings statistics;
  - reconnect view snapshots (no reload support by requirement).
- Follow-ups, sent at delivery receipt to `/project_task_manager`:
  1. A unified, extensible agent-run data model (status, token usage, TPS, future statistics) with one way to own, push and load run data. The user acknowledged it on 2026-10-14. Evidence: each run-state kind needs its own plumbing today (`AGENT_INPUT_STATE` ≈ 29 files). If that model exists later, the TPS event moves to it as a carrier change only.
  2. RSK-005: AGY output vs thinking count, if validation shows a gap.
  3. A Codex upgrade to generation speed, if validation records an event that marks the start of reasoning.

## Relevant Behavior And Production-Path Map (Mandatory)

| BEH | Kind | REQ / AC | Trigger | Change | Spine |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-006,007 / AC-007,008 | User opens Token tab | Minimal card + method help | DS-001 |
| BEH-002 | System | REQ-001–003 / AC-001–004 | Model call completes | Per-call measurement → TPS on the call's event | DS-002, DS-003, DS-004 |
| BEH-003 | System | REQ-004 / AC-005 | Selection; Team double dispatch; duplicates | Seen-key de-dup unchanged; a duplicate shows the same value | DS-002 |
| BEH-004 | System | REQ-005 / AC-006 | Idle, reload, history | Newest received TPS; "—" until one arrives | DS-001 |

## Relevant Supplemental Task Artifacts

Task screenshots and the user's card screenshot (paths in the requirements) are evidence only.

## Task Design Health Assessment (Mandatory)

- Change posture: Behavior Change
- Current design issue found: Yes
- Structural triggers that fire:
  - **Boundary/ownership:** the browser infers a model-call metric that only runtimes can time.
  - **Legacy-cleanup:** the pairing estimator is removed.
  - **Repeated coordination:** the request-boundary rule is shared by Codex and ACP.
- Triggers ruled out:
  - **Shared-structure looseness:** both new objects have one meaning per field, and `tokens_per_second` is derived rather than carried.
  - **Empty indirection:** no service, store or query is added on the server.
  - **Accounting coupling:** TPS is decided before accounting and never read by it.
- Root cause: Boundary Or Ownership Issue
- Refactor needed now: Yes (metric authority moved; estimator removed)
- Design response:
  - Adapters own the measurement facts.
  - Each adapter decides its own call's method, because the runtime knows its stream. The run-side payload builder accepts the value, so each call's TPS is a fact of the run's event.
  - The web shows the newest value.
- Deferrals: the unified run-data model (follow-up 1).

## Terminology

- `output_throughput`: one model call's TPS, `{ method: 'generation' | 'end_to_end', output_tokens, duration_ms }`, or null. Adapters report it. The payload builder accepts it or sets it to null. `output_tokens` is the call's own output as the runtime reports it; for Codex this is `last.outputTokens`.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: the browser report-pair estimator and its states, reasons, strings, tests and docs.
- Compatibility wrappers, dual paths or fallbacks kept: None.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject: token usage run records/analytics. Unchanged.
- Decision: **Not Affected.** TPS is an event field only. The run record folds named fields and stores no raw payload.
- Constraint: a test asserts that a persisted record round-trip contains no measurement/TPS data.

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User selects a run and opens Token | Card shows the newest TPS or "—" | Web meter/scope/card |
| DS-002 | Return-Event | Model call completes | The call's event with `output_throughput` is shown for the exact run | Adapter → run payload builder → streams → meter |
| DS-003 | Bounded Local (per adapter) | Call boundary/output events | Adapter-reported `output_throughput` | Each adapter |
| DS-004 | Bounded Local (acceptance) | Adapter-reported `output_throughput` | Accepted value or null | Run-side acceptance check |

## Primary Execution Spine(s)

- DS-001: `User selects agent → activeWorkspaceTarget (exact runId) → useTokenUsageWorkspaceScope.tps → tokenUsageMeterStore.getRunTps(runId) → TokenUsageThroughputCard`
- DS-002: `Runtime model call → adapter measures and reports output_throughput with usage → createTokenUsageUpdatedPayload → acceptModelCallThroughput (DS-004) → output_throughput on the event → (accounting steps pass it through untouched) → AgentRun dispatch → stream DTOs → meter intake (after seen-key check) → newest TPS for that run`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | The card shows the newest TPS received for the exact selected run, or "—" | Web |
| DS-002 | When a call completes, the adapter reports the call's TPS (method, tokens, duration). The run-side builder accepts or nulls it as it creates the event. Accounting runs after this and ignores the field. Streams deliver the event, and the meter records the TPS for that run | Adapters (facts); run payload builder (TPS) |
| DS-003 | Each adapter stamps `now()` at the events that bound the call and resets per call, turn and process | Adapters |
| DS-004 | Validate the value and enforce the minimum sample | Acceptance check |

## Spine Actors / Main-Line Nodes

Runtime adapters; `createTokenUsageUpdatedPayload` with the acceptance check; stream projections; `tokenUsageMeterStore`; `useTokenUsageWorkspaceScope`; `TokenUsageThroughputCard`.

## Ownership Map

- **Adapters:** the call's measurement and its method. They apply the shared method principle ("generation speed only when the observed start precedes all of the call's generation, including hidden reasoning; otherwise end-to-end") to their own stream and report `output_throughput`.
- **Acceptance check (`agent-execution/domain/model-call-throughput.ts`):** the `ModelCallThroughput` type, the shared constants (`MIN_TPS_OUTPUT_TOKENS = 20`, `MIN_TPS_DURATION_MS = 250`) and `acceptModelCallThroughput(value)`, which checks the shape and numbers and applies the minimum sample. It does not choose methods.
- **`createTokenUsageUpdatedPayload`:** normalizes `output_throughput` through the acceptance check, as it does for every other field. The value is null for non-model-call events.
- **Accounting:** none.
- **Web meter:** newest TPS per run (session memory).
- **Card:** display, including one division in a formatter.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why unnecessary | Replaced by | Scope |
| --- | --- | --- | --- |
| `autobyteus-web/stores/tokenUsageThroughput.ts` estimator (baselines, continuity, `observeMissingSummary`, flag list) | The server decides TPS per call | The same file, rewritten as the newest-TPS map (`record`, `getRunTps`) | In This Change |
| `TokenUsageThroughputState` / `TokenUsageThroughputIdentity` and collecting/unavailable reasons | No pairing states | `TokenUsageTps` `{ method, outputTokens, durationMs, model }` | In This Change |
| Locale keys `shell.tokenUsage.throughput.{exactAgent,lastReported,interval,collecting,unavailable,selectAgent,noReports,waitingForReports,matchingReport,continuity,invalidReport,invalidInterval,missingSummary,help,lifetimeHelp,claudeHelp}` (en, zh-CN) | Redesigned | New keys | In This Change |
| Meter calls `throughput.observeMissingSummary`/`observe(...)`; scope's status-based branches | Replaced | `tps.record(runId, payload.output_throughput, model)` after the seen-key check in both intakes; scope returns TPS or null | In This Change |
| Estimator tests; related meter/scope/card cases | Code removed | New tests | In This Change |
| Docs on report-interval TPS | Replaced | Rewritten sections | In This Change |

## Return Or Event Spine(s) (If Applicable)

The existing routes carry the event: standalone; Team (applied first, then `dispatch_agent`, de-duplicated by the seen key); Org/collaboration (presentation adapter → common handler). Field mapping: server `agent-presentation-message-projector.ts`, `collaboration-agent-presentation-adapter.ts` and `team-agent-event-websocket-projector.ts`; web `teamStreamDtoAdapters.ts` and `agentStreamMessageProjector.ts`.

## Bounded Local / Internal Spines (If Applicable)

**DS-003 per runtime.** Each adapter records the timestamps below and decides the method itself (the last column). `output_tokens` is the call's own output as reported. "Window" means the generation window, which must be ≥ `MIN_TPS_DURATION_MS` to be used.

| Runtime | Owner | Request start | Response start (only if it precedes all generation) | Call end | Provider duration | Method the adapter reports |
| --- | --- | --- | --- | --- | --- | --- |
| autobyteus | **LlmPhase** | Just before `streamMessages` | First chunk with content, reasoning or tool-call data, **if** it carried reasoning or the final usage reports `reasoning_output_tokens` as 0 or null | `is_complete` chunk | — | Generation (response start → end) when the response start is trustworthy and the window qualifies; otherwise end-to-end (request → end) |
| claude_agent_sdk | **ClaudeCallUsageTracker** | null | Main-loop `message_start` receipt | `message_delta` receipt, stamped **before** `await readContextUsage()` | — | Generation (`message_start` → `message_delta`); null if no `message_start` |
| codex_app_server | **CodexThread** (notification handler) + shared tracker | Boundary frozen at the call's first output notification (reasoning/agentMessage `item/started` or deltas). Boundaries: `turn/started`, the previous call end, any `item/completed` (any status), and the server's reply to an approval request | null (DEC-002) | **`rawResponse/completed` receipt** (one per model call; its `params.usage.outputTokens` is the call's output). Not the usage update, which can arrive only after a tool has run | — | End-to-end (request boundary → `rawResponse/completed`). The reading is attached to the call's later usage event (see the Codex pairing rule) |
| antigravity_cli | **AgyStreamEventConverter** (per step) | null | The step's first `text_delta`, **if** DONE usage reports `thinking_tokens === 0` | DONE receipt | `duration_seconds × 1000` when finite and > 0 | Generation (first `text_delta` → DONE) when thinking = 0 and the window qualifies; otherwise end-to-end using the provider duration; null if neither |
| grok_build / any ACP | **AcpAgentSession** + shared tracker | Boundaries: `startTurn` prompt send, the previous usage effect, a terminal `tool_call_update`. Frozen at the call's first agent chunk or tool_call | null (burst delivery) | Usage effect receipt | — | End-to-end (request boundary → usage effect) |

**Codex pairing rule (SR-006).** Live wire evidence (investigation notes, "SR-006 findings") shows that a tool-ending call's `thread/tokenUsage/updated` arrives only after the tool's `item/completed`.
- At `rawResponse/completed`, `CodexModelCallTiming` ends the call: `completeCall` runs at receipt time, `output_tokens` is `params.usage.outputTokens`, and the reading is held as **pending** for that turn.
- A later `rawResponse/completed` in the same turn replaces any pending reading.
- `turn/started` and turn end clear it.
- The next `thread/tokenUsage/updated` with `reports_model_call` in the same turn takes the pending reading as its `output_throughput`, but only if the pending `output_tokens` equals that update's `last.outputTokens`. That check guards the pairing; on a mismatch the value is null.
- A model-call usage update with no pending reading gets null. Its arrival time is never used as a call end.
- A non-model-call (reading-only) usage update leaves the pending reading untouched.
- The counts and accounting still come from the usage update, unchanged. The reading reaches the UI when the usage event is published, which can be after the tool. Its value excludes tool time and approval waits.
- Add `RAW_RESPONSE_COMPLETED = "rawResponse/completed"` to `CodexThreadEventName`.

**Shared tracker** (`backends/shared/model-call-request-boundary.ts`), with an injected clock:
- `markBoundary(atMs)`: moves the boundary unless the call's output has started.
- `markOutput(atMs)`: freezes the boundary.
- `completeCall(atMs)`: returns the boundary and opens the next call at `atMs`.
- `reset()`: clears state.

**DS-004 `acceptModelCallThroughput(value)`:**
1. Return null when the event is not a model call or no value was reported.
2. Return null when the shape is wrong: `method` is not `generation`/`end_to_end`, or `output_tokens`/`duration_ms` is not a safe non-negative integer.
3. Return null below the minimum sample: `output_tokens < 20` or `duration_ms < 250`.
4. Otherwise return the value unchanged.

**Web:** in each live intake, after the seen-key check (before and independent of the summary check), if `output_throughput` is non-null, record `{ ...output_throughput, model: model_identifier ?? model_value }` as the newest TPS for that run. Null leaves the shown value unchanged.

## Off-Spine Concerns Around The Spine

| Concern | Serves | Responsibility |
| --- | --- | --- |
| Request-boundary tracker | Codex thread, ACP session | Freeze/complete rule |
| Locale and formatting | Card | en/zh-CN, one decimal |

## Ownership Boundaries

- Adapters stop at measurement facts.
- Each runtime decides its own call's TPS method. The run-side acceptance check is the only place values are validated and filtered, and it runs when the run's event is created.
- Accounting never reads or writes TPS.
- The web displays the newest value.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden bypass |
| --- | --- | --- | --- |
| `acceptModelCallThroughput` + constants | Validation and minimum sample | `createTokenUsageUpdatedPayload` (adapters read the constants only) | The web or accounting computing TPS or thresholds; adapters re-implementing the minimum sample |
| `tokenUsageMeterStore.getRunTps(runId)` | Newest-TPS map | Scope composable | The card or scope reading payloads directly |
| Shared boundary tracker | Freeze rules | Codex, ACP | Ad-hoc copies |

## Dependency Rules

- Allowed: adapters → shared tracker and the `model-call-throughput` type and constants; payload builder → acceptance check; card → scope → meter.
- Forbidden:
  - the acceptance check importing adapter or token-usage code;
  - accounting or persistence reading TPS;
  - the web computing method or thresholds;
  - server-side TPS state.

## Interface Boundary Mapping

| Interface | Subject | Shape |
| --- | --- | --- |
| `output_throughput` (event and DTO field) | One model call | `{ method, output_tokens, duration_ms } \| null` |
| Web `getRunTps(runId)` | Exact AgentRun | `TokenUsageTps \| null` |

All boundaries are singular, use explicit identity, and carry Low ambiguity risk.

## Main Domain Subject Naming Check

- Per-call TPS: `output_throughput`, and "TPS" in the UI.
- Acceptance check: `acceptModelCallThroughput`.
- Tracker: `ModelCallRequestBoundary`.
- The web file names `tokenUsageThroughput.ts` and `TokenUsageThroughputCard.vue` are kept to avoid rename churn.

All names are natural; no action needed.

## Existing Capability / Subsystem Reuse Check

| Need | Existing area | Decision |
| --- | --- | --- |
| Per-call event to the exact run | Usage event + streams | Extend (already per call, attributed and de-duplicated on all routes) |
| Run-state holder / load query | `AgentRun` / GraphQL | Not needed (no reload by requirement) |
| Dedicated run-state event | Run-state transport | Rejected now; unified-model follow-up |
| Acceptance check / boundary tracker | `agent-execution/domain` / `backends/shared` | Create new files |

## Subsystem / Capability-Area Allocation

| Area | Owns | Decision |
| --- | --- | --- |
| autobyteus-ts agent loop | Native measurement | Extend |
| Server runtime backends | Measurement facts | Extend |
| Server agent-execution domain | Acceptance check; payload builder | Extend |
| Contract packages | Event field | Extend |
| Web token meter | Newest TPS, card, copy | Extend |

## Draft File Responsibility Mapping

Rejected earlier shapes:
- **D1:** TPS computed after accounting; browser-owned latest value. Coupled to accounting.
- **D2:** an `AgentRun` copy plus a load query. Split authority.
- **Persisted columns:** rejected by the user.
- **Server-held latest TPS:** served only reload, which the user does not want.

## Reusable Owned Structures Check

| Structure | File | Notes |
| --- | --- | --- |
| Request-boundary freeze | `backends/shared/model-call-request-boundary.ts` | Not a framework |
| `ModelCallThroughput` type + constants + acceptance check | `agent-execution/domain/model-call-throughput.ts` | Imported by adapters (type and constants) and the payload builder |

## Shared Structure / Data Model Tightness Check

| Structure | One meaning per field | Notes |
| --- | --- | --- |
| `output_throughput` | Yes | One structure from adapter to UI. No raw timestamps cross the boundary and no `tokens_per_second` is carried. `output_tokens` is the call's own output (≠ Codex cumulative `reported_output_tokens`) and is never used for accounting |

## Final File Responsibility Mapping

See the target mapping below.

## Applied Patterns (If Any)

- Adapter: runtime facts → canonical field.
- Tiny state machine in the shared tracker.

## Target Subsystem / Folder / File Mapping

| Path | Change | Responsibility | Must not contain |
| --- | --- | --- | --- |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | Modify | Native timing and method → `output_throughput` on usage (the native package defines its own copy of the small payload type and threshold, because it does not import the server) | Minimum-sample logic |
| `autobyteus-ts/src/agent/events/notifiers.ts` | Modify | Payload type | — |
| `autobyteus-server-ts/src/agent-execution/domain/model-call-throughput.ts` | Add | `ModelCallThroughput` type, constants, `acceptModelCallThroughput` | Method choice, accounting |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts` | Modify | Payload type `output_throughput`; the builder normalizes it via the acceptance check | Method choice |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-call-usage-tracker.ts` | Modify | Stamp frames (injected clock); report generation `output_throughput` | Emission time |
| `autobyteus-server-ts/src/agent-execution/backends/shared/model-call-request-boundary.ts` | Add | Boundary tracker | Runtime specifics |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/{codex-model-call-timing.ts,codex-thread-notification-handler.ts,codex-thread.ts,codex-thread-token-usage.ts}`, `backends/codex/events/codex-thread-event-name.ts` | Modify | Boundaries/outputs. The call ends at `rawResponse/completed` and its pending reading pairs with the next model-call usage update (Codex pairing rule). Approval replies count as boundaries | Generation claims; using usage-arrival time as the call end |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts` | Modify | First delta per step; method per the DS-003 row; report `output_throughput` | — |
| `autobyteus-server-ts/src/agent-execution/backends/acp/session/acp-agent-session.ts` | Modify | Boundaries; report end-to-end `output_throughput` on usage effects | Grok-specific logic |
| `autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts`; `autobyteus-team-stream-contracts/src/team-agent-message-dtos.ts` | Modify | Nullable `output_throughput` schema | — |
| Server `agent-presentation-message-projector.ts`, `collaboration-agent-presentation-adapter.ts`, `team-agent-event-websocket-projector.ts` | Modify | Map the field | — |
| Web `services/agentStreaming/{teamStreamDtoAdapters.ts,agentStreamMessageProjector.ts}`, `types/tokenUsageMeter.ts` | Modify | Map/type the field; replace throughput types | — |
| Web `stores/tokenUsageThroughput.ts` | Modify (rewrite) | Newest TPS per run | Method or threshold logic |
| Web `stores/tokenUsageMeterStore.ts` | Modify | Record TPS after the seen-key check in both intakes; expose `getRunTps` | — |
| Web `composables/useTokenUsageWorkspaceScope.ts` | Modify | `tps` for the exact selected run | Status-based states |
| Web `components/workspace/usage/TokenUsageThroughputCard.vue` (+ panel prop) | Modify | REQ-006 card and method help | Calculation beyond display |
| Web `localization/messages/{en,zh-CN}/shell.ts` | Modify | New keys; old keys removed | — |
| Docs: `autobyteus-web/docs/token_meter.md`, `autobyteus-web/docs/agent_execution_architecture.md` (TPS lines), `autobyteus-server-ts/docs/modules/token_usage.md` (TPS section) | Modify | Per-call TPS event, per-runtime method table, limits | — |
| Colocated tests | Add/Modify | AC-001–010 | Fixtures presented as live |

## Folder Boundary Check

`agent-execution/domain` (run-side rule, beside the payload builder), `backends/shared` (cross-runtime helper): ownership is clear, risk Low.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Bad |
| --- | --- | --- |
| Claude end time | Stamp at `message_delta`, then await the context read | Stamp after `readContextUsage()` |
| Hidden reasoning | 900 hidden reasoning tokens → no response start → end-to-end | 1,000 tokens over 2 s of visible stream |
| Example | Claude probe: 1,762 / 16.94 s → 104.0 tok/s, generation | Report gaps that include tools |
| Tiny call | 12-token tool call → null → the shown value stays | Showing 4 tok/s |
| Reload | "—" until the next call | Rebuilding TPS from totals |
| Persistence failure | TPS is still shown (decided before accounting) | TPS lost because the database write failed |
| Codex tool-ending call | 112 tokens / (11,172 − boundary) ms, attached to the usage update at 14,373 | 112 tokens / (14,373 − boundary) ms, which includes ~2.9 s of tool time (API-L04 failure) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep the pairing estimator as a fallback | Rejected: every runtime has per-call timing |
| Accept both old and new web types | Rejected: server and web ship together |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Acceptance check plus unit tables (shape, thresholds). Payload builder integration. Tests that the field survives enrichment, fold (CHANGED and SUPPRESSED) and the persistence-failure path, and that persisted records contain no TPS.
2. Shared boundary tracker.
3. Adapters with injected clocks and recorded/scripted timelines, each testing its own method choice: Claude, AGY (thinking 0 vs > 0; short window → provider duration), ACP/Grok, Codex (cumulative `last` output; a tool-ending call whose usage arrives after the tool, from the recorded API-L04 wire order; approval wait; token mismatch → null; missing `rawResponse/completed` → null), native (reasoning-first, hidden reasoning, single-chunk response → end-to-end).
4. Contracts, server projections and web adapters, with pass-through tests on the standalone, Team, Org and collaboration routes.
5. Web: newest-TPS map, intakes, scope, card, locales. Remove dead keys, types and tests.
6. Docs.
7. Validation (downstream): live runs per runtime where credentials allow; a live Codex timeline (RSK-002); an AGY thinking sample if available (RSK-005).

## Key Tradeoffs

- Codex uses end-to-end rather than a possibly inflated generation speed.
- TPS rides on the usage event as the per-call carrier, not a dedicated run-state channel. The unified model is a follow-up.
- No reload support, by user decision.

## Risks

- RSK-002 (Codex event semantics).
- RSK-005 (AGY thinking count).
- Grok's first-call setup time.
- Native providers that hide reasoning without reporting a count would inflate.

## Guidance For Implementation

- Inject clocks. Never use `observed_at` or emission time as a call boundary.
- No "Collecting" states: with no TPS, show "—".
- Accounting tests stay unchanged in expectation.
- If any listed timestamp cannot be obtained, return Design Impact.
