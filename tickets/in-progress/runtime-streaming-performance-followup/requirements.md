# Requirements Doc — Runtime Streaming Performance Follow-up

## Status (`Approved — Design-ready`)

The user has confirmed that a severe frontend performance problem remains after the v1.4.37 runtime-streaming performance fix. Current code inspection, a live installed-v1.4.43 process sample, historical event-shape evidence, and an accumulated-Markdown scaling probe support the approved requirements basis. On 2026-08-06 the user confirmed that timed batching belongs solely to configurable server WebSocket egress, while the frontend consumes the shaped stream and remains responsible for presentation.

## Goal / Problem Statement

Continue improving sustained runtime-streaming performance so the frontend remains genuinely usable under the user's current workload. Replace the current client-only 100 ms policy with one shared, configurable server WebSocket-egress content cadence whose default is 500 ms, avoid stacking a second frontend delay, and stop fully reparsing accumulated rich Markdown on every in-progress text update. Preserve exact content, ordering, semantic boundaries, meaningful live progress, final rich Markdown, internal run-event behavior, and existing run data.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | The shipped 100 ms frontend content-presentation scheduler improved the original issue, but the user still experiences a very large frontend performance problem during runtime streaming. The installed v1.4.43 renderer was observed in bursts up to 85.8% CPU while the backend remained responsive and much lighter. | Sustained streaming remains responsive under the defined long-output stress journey, with bounded renderer work, interaction latency, and backend health. | Exact final content, content order, target/member/segment identity, semantic boundaries, lifecycle events, tool state, and run correctness remain intact. | FR-001, FR-004, FR-006 / AC-001, AC-004, AC-006 |
| BEH-002 | Live content is normally presented on a fixed non-sliding 100 ms frontend cadence and flushed earlier at semantic/lifecycle boundaries. The user suspects that this cadence is still too frequent and proposes 500 ms or 1,000 ms. | Use one normal non-sliding cadence owner in the server-side WebSocket egress path, governed by the server setting and defaulting to 500 ms. The frontend applies already-shaped content immediately rather than adding another timer; dependent boundaries still flush earlier content immediately. | Semantic/lifecycle boundaries continue to observe all earlier content before their own projection. | FR-002, FR-004, FR-008 / AC-002, AC-004, AC-008 |
| BEH-003 | The prior fix intentionally left backend runtime-to-client streaming unchanged; the representative native run delivered 17,439 content messages at 31.097/s and the renderer still parses/routes every message even though presentation is later batched. The supported canonical pipeline also emits an idempotent `AGENT_STATUS running` companion before each non-terminal content event. | Coalesce exact ordered content in one shared server WebSocket-egress component used by standalone and team streaming, so ordinary client-bound content publication follows the configured window—at most twice per second per continuously active identity at the 500 ms default—with earlier dependent-boundary flushes. Routine order-independent companions remain visible but must neither flush nor split an otherwise mergeable content aggregate. | Runtime/provider adapters and the internal canonical `AgentRun`/`TeamRun` event streams remain unthrottled; persisted memory, raw traces, run history, current status/lifecycle projection, and non-content semantic events remain correct. | FR-003, FR-004, FR-005, FR-008 / AC-003, AC-004, AC-005, AC-008 |
| BEH-004 | The prior design is runtime/provider independent and applies to standalone and team streaming, but current residual behavior may differ by visible member count, hidden/background streams, accumulated Markdown size, event type, or runtime chunk cadence. | Performance protection remains runtime/provider independent and covers standalone, team, focused, and background streaming paths that the investigation proves materially affected. | Codex and other runtimes, idle behavior, hydration/history, interruption, reconnect, and tool approval behavior remain compatible. | FR-001, FR-005, FR-006 / AC-001, AC-005, AC-006 |
| BEH-005 | Each presented in-progress text revision passes the full accumulated source through math normalization, Markdown parsing, syntax highlighting, file/image scanning, HTML rendering, sanitization, reactive DOM replacement, and post-render DOM scans. A conservative probe measured about 177 ms for one 120k-character render and about 399 ms at 240k characters. | While a text or reasoning segment is active, show its complete current content through a cheap escaped/pre-wrapped live-text presentation. Perform the existing rich Markdown render when the segment/message becomes complete. | Content remains visible live; final Markdown, code highlighting, math, Mermaid, managed images, file actions, and historical rendering remain unchanged after completion. | FR-007 / AC-007 |
| BEH-006 | The current 100 ms frontend cadence is a compiled product constant and cannot be adjusted through Settings. | Expose a persisted server setting for the WebSocket content update interval with an effective default/recommended value of 500 ms. Permit manual integer values from 100 through 2,000 ms, explain the responsiveness/performance tradeoff, support reset to 500 ms, and apply a saved value to active/future streams without an application or server restart. | Other server settings, node binding, credentials, and existing run configuration remain unchanged. | FR-008 / AC-008 |

## Investigation Findings

- The completed v1.4.37 ticket implemented one shared fixed-window 100 ms frontend presentation scheduler for standalone and team live content.
- It coalesces content by resolved stream identity and forces a synchronous flush before non-content and lifecycle events.
- The previous backend/persistence investigation found frontend presentation amplification to be dominant in that earlier reproduction, so backend behavior was intentionally left unchanged.
- The user's current report is authoritative evidence that the shipped result is insufficient for their present workload.
- Installed v1.4.43 observations showed renderer bursts of 85.8% and 30.0% CPU while the backend was 0.9% and 0.7%; a later 30-s sample recorded renderer p95/max 39.9%/61.1%, backend p95/max 3.7%/11.8%, and health p95 1.057 ms with 30/30 successes.
- The representative native stream delivered 31.097 content messages/s. A 500 ms upstream cadence would reduce ordinary content publications by an estimated 93.57%; 1,000 ms would reduce them by 96.78%, only 3.21 additional percentage points while doubling live-progress latency.
- The current rich Markdown path reparses the complete accumulated source on each presented update. A conservative probe measured mean full parse/render/sanitize costs of 17.81 ms at 10k, 90.08 ms at 60k, 177.07 ms at 120k, and 398.93 ms at 240k characters. A larger timer alone cannot bound this growing per-update cost.
- `AgentRun` is the runtime-independent authoritative server boundary between backend source-event batches and all canonical run consumers. The standalone and team WebSocket handlers subscribe to those events and currently call `connection.send(...)` immediately for every event.
- The default canonical event pipeline's `LifecycleStatusEventTransformer` emits `AGENT_STATUS running` before every non-terminal event during an active turn. The retained real-WebSocket `WS-EGRESS-001` regression proved that treating each routine status as a content merge barrier converts 30 same-identity content events into 30 delayed content frames and directly violates AC-003.
- Coalescing at WebSocket egress is the narrower ownership boundary for this UI/transport concern: it removes browser message pressure while leaving persistence, memory, application/external output, and other internal subscribers unthrottled.
- The existing server-settings service persists validated values to the bound node's `.env` configuration and updates the in-process configuration immediately. The Settings UI already provides typed quick-setting cards plus an advanced raw-settings view, so this policy can use the established settings path rather than a new storage or API subsystem.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `performance-evidence.md` | Evidence-only current process, event-shape, code/settings-path, and Markdown-scaling findings | FR-001, FR-002, FR-003, FR-006, FR-007, FR-008 | AC-001, AC-002, AC-003, AC-006, AC-007, AC-008 | `Current`; approval `N/A` | Establishes why 500 ms is preferred to 1,000 ms, why WebSocket-egress shaping is justified, why timer-only retuning is insufficient, and how existing Settings persistence can own the manual interval. |

## Design Health Assessment (Mandatory)

- Change posture: `Performance`
- Initial design issue signal: `Yes`
- Root cause classification: `Boundary Or Ownership Issue` plus a bounded `Local Implementation Defect`
- Refactor posture: `Likely Needed`
- Evidence basis: Normal content cadence is owned only after every raw message has already crossed into the renderer; the frontend then performs full accumulated rich rendering on every scheduled text revision. The server agent/team WebSocket egress paths send each internal run event immediately and have no shared client-delivery cadence owner.
- Requirement or scope impact: Move the authoritative client-delivery cadence to a shared server WebSocket-egress component, leave the internal canonical run-event streams unthrottled, remove the redundant client timer, and separate cheap in-progress text presentation from final rich Markdown. Retaining independent backend/frontend timers or merely changing `100` to `1000` is not acceptable.

## Recommendations

- Select **500 ms**. `1,000 ms` is one second, but historical event-shape evidence shows it provides only about 3.21 percentage points more raw-message reduction while doubling perceived progress latency.
- Make a shared server WebSocket-egress component the single normal client-delivery cadence owner and remove the client's independent 100 ms timer so latency does not stack.
- Treat batching as application-level content coalescing: combine ordered `SEGMENT_CONTENT.delta` values into larger existing content messages per exact stream identity. Do not require a new wire-level batch envelope unless implementation evidence proves that multiple simultaneously active identities still need one.
- Classify routine order-independent companions such as `AGENT_STATUS running` as immediate pass-through messages that preserve the pending content tail and timer. Preserve the status message itself; only dependent boundaries close and flush pending content.
- Expose the cadence as **Live response update interval** in Settings: default/recommended `500 ms`, accepted range `100–2,000 ms`, saved on the currently bound server, effective without restart, and resettable to `500 ms`.
- Show safe plain live text while a text/reasoning segment is incomplete; render full rich Markdown once the segment/message completes. This addresses the measured accumulated-render scaling that a timer cannot.
- Measure content input/output rates, frontend/backend CPU and event-loop behavior, rich-render invocation count, exact final equality, and interaction latency in the same current reproduction.

## Scope Classification (`Large`)

The task crosses native/runtime emission, server event conversion and WebSocket delivery, standalone/team routing, frontend content scheduling/projection, reactive rendering, realistic Electron/browser measurement, and regression behavior across runtimes and lifecycle boundaries.

## In-Scope Use Cases

- UC-001: Use the workspace UI while one visible agent/member emits sustained fine-grained content.
- UC-002: Use the workspace UI while one or more background team members emit sustained fine-grained content.
- UC-003: Observe safe plain live text at the configured normal cadence (500 ms by default) and the correct final rich Markdown plus semantic/lifecycle transitions.
- UC-004: Reduce server-to-client WebSocket content-message volume without changing internal canonical run-event, provider/runtime, or persistence semantics.
- UC-005: Preserve exact standalone/team content and lifecycle behavior across completion, interruption, disconnect, reconnect, and runtime variations.
- UC-006: Inspect, change, validate, persist, and reset the live-response update interval in Settings for the currently bound server.

## Out of Scope

- Changing model quality, provider generation speed, or requiring providers to emit identical chunk sizes.
- Dropping streamed content, rendering only the final answer, or delaying semantic/lifecycle events behind an ordinary content timer.
- Rewriting persisted run history, raw traces, working memory, team communications, or database schemas.
- Adding runtime/provider-specific performance branches when the affected shared path can own the policy.
- An automatic/adaptive cadence policy. This round provides one manually controlled fixed interval with a 500 ms default.
- Per-agent, per-team, per-runtime, or per-connection user overrides; the setting is one server-wide policy for UI-bound agent/team streaming.
- Incremental Markdown parsing or partial-AST reconciliation; safe live text plus one final rich render is the bounded target.

## Functional Requirements

- **FR-001 — Measured end-to-end correction:** Identify the dominant remaining cost in the supported runtime-to-renderer production path and correct it so sustained streaming no longer causes the reported severe UI degradation.
- **FR-002 — Single configured cadence:** Use one fixed, non-sliding normal content window in the server-side WebSocket egress path, sourced from the typed server setting and defaulting to 500 ms. The frontend must apply shaped content without an additional normal timer. Dependent semantic/lifecycle boundaries flush earlier buffered content immediately.
- **FR-003 — WebSocket-egress shaping:** After internal canonical event publication and before `connection.send(...)`, concatenate content deltas for the same exact run/turn/segment/member/task identity while they remain adjacent in the **content-order lane**, using one shared component for standalone and team streaming. A different content identity closes the current aggregate group. A policy-declared routine order-independent companion—most importantly the canonical `AGENT_STATUS running` emitted before each non-terminal event—remains an immediate client-visible message but does not flush, seal, reset, or otherwise split the pending content group or timer. Under continuous content without dependent boundaries, ordinary content output must not exceed the configured window rate per active identity (two messages per second at the 500 ms default), while preserving the existing `SEGMENT_CONTENT` payload meaning and leaving internal run-event/status consumers unthrottled.
- **FR-004 — Exact ordering and boundary integrity:** Retain every content byte in order, preserve the observed interleaving of ordered aggregate groups across content identities, and flush earlier buffered content before dependent semantic/lifecycle events, completion, interruption, supported open-socket teardown, or identity replacement. A routine non-terminal status companion may pass without forcing a flush and without splitting the content-order lane; a terminal or causally dependent status must flush earlier content first. Existing routine status messages remain client-visible and are not deduplicated by this content coalescer.
- **FR-005 — Shared policy and compatibility:** Keep the solution runtime/provider independent and coherent across affected standalone and team paths; preserve current routing, lifecycle, history/hydration, tool, task, and reconnect behavior.
- **FR-006 — Observable performance evidence:** Retain before/after measurements for incoming delta rate, outgoing content-message rate, aggregate size, oldest queued-content age, serialization time, backend event-loop lag/CPU/health, frontend message/store-commit/rich-render counts, renderer CPU/long tasks, interaction latency, accumulated-content rendering, and exact final-state equality. Confirm independently that raw runtime/trace evidence remains fine-grained and that the change introduces no synchronous per-delta filesystem write or full-context snapshot path.
- **FR-007 — Bounded active rendering:** Incomplete text/reasoning segments must not invoke the full rich Markdown pipeline on each content update. Present complete current content safely as escaped/pre-wrapped live text; switch to the existing rich Markdown presentation at segment/message completion.
- **FR-008 — Configurable persisted cadence:** Define one validated server setting, `AUTOBYTEUS_STREAMING_CONTENT_FLUSH_INTERVAL_MS`, with an effective default/recommended value of `500`. The Settings UI must present it as **Live response update interval (ms)**, accept only integers from `100` through `2,000`, explain that smaller values update more frequently while larger values reduce UI/transport work, save it for the currently bound server, offer reset to `500`, and make successful changes effective for active and future WebSocket streams without restart. Invalid persisted/environment input must safely fall back to `500` rather than disabling shaping.

## Acceptance Criteria

- **AC-001 — Representative responsiveness:** In a sustained stress journey of at least 10 minutes, at least 120,000 accumulated content characters, and at least 20 raw input content events/s for an active interval, a 50 ms renderer probe has p95 drift no greater than 50 ms and no stream-attributable stall greater than 250 ms. Renderer CPU must not remain pinned near one full core; mean must be no greater than 25% and p95 no greater than 50% on the recorded Apple-silicon validation host. At least 20 supported file/reference/member/panel interactions have click-to-visible p95 no greater than 250 ms.
- **AC-002 — Cadence behavior:** Continuous/bursty focused coverage proves non-sliding normal server windows at configured values of 100, 500, 1,000, and 2,000 ms, content-receipt-to-visible latency no greater than the configured interval plus 150 ms when no earlier boundary occurs, no stacked frontend cadence delay, no sliding starvation, and immediate flush before dependent boundaries. The default 500 ms journey therefore remains at or below 650 ms.
- **AC-003 — Backend/transport shaping:** At the default 500 ms setting and a representative internal input rate of at least 30 content events/s for one continuously active identity, ordinary server-to-client WebSocket content output is no greater than 2.2/s excluding explicit boundary flushes—a reduction of at least 90%. The production-grounded scenario must include the default lifecycle transformer emitting one client-visible `AGENT_STATUS running` before each content event and must still produce one exact content aggregate for one default window. Focused cadence tests additionally prove the configured rate at 100, 1,000, and 2,000 ms. The internal canonical subscriber still receives all source events without the WebSocket cadence delay. Backend health p95 remains no greater than 20 ms and no sustained event-loop/CPU saturation is introduced.
- **AC-004 — Exact semantics:** Automated coverage interleaves small content deltas with different identities, routine non-terminal status companions, terminal/dependent status, segment end, tool transitions, errors, completion, interruption, disconnect, and supported open-socket teardown, proving no content loss, duplication, reordering, or cross-target assignment and proving that routine status neither collapses the configured cadence nor splits a same-identity content aggregate. Existing routine status messages remain observable in their established status-only payload form.
- **AC-005 — Compatibility:** Affected standalone/team, Codex/AutoByteus, visible/background, idle, history/hydration, reconnect, and file/reference interaction paths remain correct.
- **AC-006 — Evidence package:** Durable evidence identifies exact topology, runtime/model/team shape, commands, before/after metrics named by FR-006, source paths, cadence selection rationale, backend decision rationale, raw-trace preservation, persistence-path verification, and residual limitations. Any temporary diagnostic instrumentation is removed or explicitly assigned to an existing production telemetry owner rather than left as unconditional per-delta logging.
- **AC-007 — Active/final render behavior:** Focused component/browser coverage proves that incomplete text/reasoning updates do not invoke the rich Markdown parser/sanitizer, remain safely escaped and fully visible with preserved whitespace, and switch once to the existing rich Markdown behavior at completion. Completed history continues to support highlighting, math, Mermaid, images, file actions, links, and sanitization.
- **AC-008 — Settings behavior:** Server unit/API and Settings component/browser coverage proves: absent configuration reports/uses `500`; values `100`, `500`, `1,000`, and `2,000` persist and govern subsequent egress windows; non-integers and values outside `100–2,000` are rejected through Settings/API; invalid directly supplied environment values fall back to `500`; reset restores `500`; a successful save changes an active connection's next newly scheduled window without dropping or duplicating already buffered content; rebinding the Settings window reads/writes only the selected server.

## Constraints / Dependencies

- Authoritative work must remain in `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup` on `codex/runtime-streaming-performance-followup`.
- Base and expected finalization target are `origin/personal` / `personal`.
- Do not assume that increasing the frontend timer alone solves the problem; trace the complete supported path first.
- Do not introduce independent server and frontend debounce windows without one documented latency/flush contract.
- Do not throttle or reshape the authoritative internal `AgentRun`/`TeamRun` event streams for this UI transport optimization.
- Cadence constants/policy must have one clear owner and focused durable coverage.
- Server-side validation is authoritative; the UI must mirror the accepted integer range but cannot be the only guard.
- The effective interval must be read through one typed configuration resolver rather than scattered environment reads.
- The egress policy must distinguish content-order boundaries from order-independent pass-through companions. It must not use one blanket “every non-content message seals content” rule.
- A richer in-progress Markdown preview must not be reintroduced through a hidden parallel renderer or component-local timer.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: existing agent/team run metadata, raw traces, working context/memory, communications, artifacts, and history; plus the new server configuration key in the bound node's existing `.env` settings store.
- Required outcome: existing run data `Not Affected`; new cadence preference `Additive Persisted Setting`.
- Existing data to preserve, discard/rebuild, transform, or quarantine: preserve existing data directly; no representation change is proposed. When the new setting is absent, use the 500 ms default without migration. A user save persists the canonical integer string.
- Unacceptable data loss or corruption: loss, duplication, reordering, invalidation, or rewrite of existing recoverable runs.
- Relevant availability, maintenance-window, or rollout constraints: none expected because the candidate change is ephemeral stream delivery/presentation behavior.
- Related requirement and acceptance-criteria IDs: FR-004, FR-005, FR-008 / AC-004, AC-005, AC-008.

## Assumptions

- `1,000 ms` is exactly one second; the user is considering either a 500 ms or 1,000 ms normal content update interval.
- Fine-grained provider/runtime deltas may continue and must be handled rather than forbidden.
- Semantic events can and should force earlier content flush even if the ordinary cadence is larger.
- The final realistic validation can reproduce the historical fine-grained shape even if the user's exact currently running team has completed before test execution.
- A server-wide `100–2,000 ms` manual interval with a `500 ms` default matches the user's requested control while preventing zero/negative/extreme values from reintroducing flooding or making streaming appear frozen.

## Risks / Open Questions

- OQ-001: Exact current worst-case journey details remain useful for final validation, but the historical 31/s, 121k-character shape plus the current installed-process bursts are sufficient to define a representative stress floor.
- OQ-002: `Resolved by approval` — incomplete text/reasoning uses safe plain live presentation and acquires rich Markdown at completion.
- OQ-003: Abrupt network gaps already lack event replay. Backend cadence design must not worsen normal connected behavior and must flush on supported interruption, completion, termination, and semantic boundaries; replay redesign remains outside this performance task unless implementation evidence exposes a regression.
- OQ-004: `Resolved by approval` — the setting uses a `100–2,000 ms` range, 500 ms reset/default, server-wide scope, and live-without-restart application. The technical key remains an implementation-facing name; the user-facing label is authoritative.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| FR-001 | UC-001, UC-002, UC-004 |
| FR-002 | UC-001, UC-002, UC-003 |
| FR-003 | UC-004, UC-005 |
| FR-004 | UC-003, UC-005 |
| FR-005 | UC-001, UC-002, UC-005 |
| FR-006 | UC-001, UC-002, UC-003, UC-004, UC-005 |
| FR-007 | UC-001, UC-002, UC-003, UC-005 |
| FR-008 | UC-001, UC-002, UC-003, UC-006 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance-Criteria ID | Scenario Intent |
| --- | --- |
| AC-001 | Sustain the user's representative stream while probing renderer scheduling and ordinary interactions. |
| AC-002 | Compare continuous/bursty input at candidate cadence policies and verify live-progress behavior. |
| AC-003 | Instrument the runtime-to-WebSocket backend path and compare input/output volume and server health. |
| AC-004 | Interleave exact content with all material semantic/lifecycle boundaries across identities. |
| AC-005 | Run affected cross-runtime, standalone/team, visible/background, and lifecycle controls. |
| AC-006 | Audit a reproducible before/after performance package. |
| AC-007 | Verify cheap active text/reasoning and one final rich Markdown transition. |
| AC-008 | Verify default, validation, persistence, reset, bound-node isolation, and live application of the cadence setting. |

## Approval Status

- `Approved — Design-ready` on 2026-08-06.
- User requested continued performance work, explicitly proposed 500 ms or 1,000 ms frontend cadence, and asked for backend support to be investigated.
- Approved basis: one server WebSocket-egress-owned cadence with a 500 ms default and validated 100–2,000 ms server-wide Settings control, unthrottled internal run events, no stacked frontend timer, safe plain live text/reasoning, and full rich Markdown at completion.
- Approval evidence: the user answered affirmatively and restated that the backend performs configurable timed batching while the frontend no longer owns batching and only consumes/displays the shaped stream. The later user-supplied outbound-shaping proposal further confirms the same ownership model.
- SR-002 clarification after `CRR-003`: the approved intent is unchanged. The technical phrase “routine status must not defeat cadence” now explicitly means that policy-declared order-independent status companions remain visible but do not split the pending content-order lane. This removes SR-001's contradictory seal rule rather than adding or weakening user-visible scope.
- SR-002 user confirmation: on 2026-08-08 the user confirmed that routine statuses continue to be sent immediately and separately, are not merged or discarded, and do not split the timed content aggregate; the user then explicitly authorized architecture review.
