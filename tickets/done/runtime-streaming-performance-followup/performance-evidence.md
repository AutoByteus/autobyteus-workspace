# Performance Evidence — Runtime Streaming Performance Follow-up

## Status And Purpose

- Status: `Current investigation plus API-REV-001 / CRR-003 failure-origin evidence`
- Approval applicability: `N/A — evidence only; this file does not independently define intended behavior.`
- Purpose: Retain the current-process observation, prior representative event shape, initial code-path findings, focused accumulated-Markdown scaling probe, and production-grounded candidate failure that constrain the follow-up requirements and revised design.

## Evidence Boundaries

- The installed-app process samples are observational and did not drive or modify the user's running UI.
- The 30-s sample was not synchronized to a known active generation interval. It establishes real current burst behavior and backend health, not a complete reproduction.
- The Markdown probe uses the same MarkdownIt, Prism, DOMPurify, and JSDOM package versions available in the workspace but is a synthetic Node/JSDOM probe. It excludes Vue reconciliation, live DOM replacement, file-action scanning, KaTeX, Mermaid, image binding, and scroll work, so it is a conservative scaling indicator rather than final acceptance evidence.
- Historical v1.4.37 evidence remains authoritative for that run; the user's current report establishes that it was not sufficient for the current workload.
- The 2026-08-08 `WS-EGRESS-001` integration uses a deterministic backend only above the canonical boundary. From `AgentRun` through the default event pipeline, mapper, egress, Fastify route, and real WebSocket, it exercises production code and was independently accepted by CRR-003 as a Reachable product path rather than a synthetic premise.

## Installed v1.4.43 Observation — 2026-08-06

Installed bundle:

- `/Applications/AutoByteus.app`
- `CFBundleShortVersionString=1.4.43`
- Electron parent PID observed: `7751`
- Renderer PID observed: `7757`
- Backend PID observed: `8360`, port `29695`, data root `/Users/normy/.autobyteus/server-data`

Two unsynchronized point observations during the user's reported session showed the renderer at `85.8%` CPU and later `30.0%` CPU while the backend was `0.9%` and `0.7%` respectively. The installed backend returned `200` from `http://127.0.0.1:29695/rest/health` in about `10 ms` wall-clock for the direct shell request.

Thirty non-invasive one-second process/health samples were then recorded from `2026-08-06T06:28:16Z` through `06:28:48Z`:

| Metric | Samples | Mean | p50 | p95 | Maximum |
| --- | ---: | ---: | ---: | ---: | ---: |
| Renderer CPU | 30 | 11.023% | 5.5% | 39.9% | 61.1% |
| GPU CPU | 30 | 8.133% | 8.5% | 9.2% | 9.3% |
| Backend CPU | 30 | 1.773% | 1.4% | 3.7% | 11.8% |
| Backend health latency | 30 | 0.816 ms | 0.789 ms | 1.057 ms | 1.084 ms |

All 30 health requests returned `200`. Raw samples were retained only as disposable local probe output at `/tmp/runtime-streaming-performance-live-process-samples.tsv`; the table above is the canonical durable result.

### Implication

The current installed release can still exhibit large renderer bursts while the backend remains responsive and comparatively lightly loaded. This supports backend delivery shaping as upstream pressure control, but it does **not** support treating backend CPU or filesystem health as the dominant observed bottleneck.

## Prior Representative Native Stream Shape

Source: `tickets/done/autobyteus-runtime-streaming-ui-performance/api-e2e-execution-evidence/live-native-performance-summary.json` from the v1.4.37 validation.

| Metric | Result |
| --- | ---: |
| Stream duration | 560.800 s |
| `SEGMENT_CONTENT` WebSocket messages | 17,439 |
| Content characters | 121,669 |
| Mean raw content-message rate | 31.097/s |
| Mean characters per raw event | 6.977 |
| p50 / p95 delta length | 4 / 11 characters |
| Non-content WebSocket messages | 341 |

For one continuously active identity, a 500 ms upstream non-sliding cadence caps ordinary content emission at about `2/s`; against this historical 31.097/s input shape, that is an estimated `93.57%` reduction in content messages before semantic-boundary flushes. A 1,000 ms cadence caps ordinary emission at about `1/s`, an estimated `96.78%` reduction.

### Implication

Moving the primary cadence boundary upstream can eliminate most browser WebSocket callbacks, JSON parsing, routing, and client enqueue work. The difference between 500 ms and 1,000 ms is only about 3.2 percentage points of raw-message reduction for this shape, while 1,000 ms doubles perceived live-progress latency. This favors 500 ms when combined with a cheaper in-progress renderer rather than relying on 1,000 ms alone.

## Initial Code-Path Findings — 2026-08-06 Baseline

### Frontend cadence owner

Sources:

- `autobyteus-web/services/agentStreaming/presentation/StreamContentPresentationScheduler.ts`
- `autobyteus-web/services/agentStreaming/presentation/streamContentBatchProjector.ts`
- `autobyteus-web/services/agentStreaming/presentation/streamContentPresentationFlushPolicy.ts`
- `autobyteus-web/services/agentStreaming/AgentStreamingService.ts`
- `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`

Findings:

- The fixed non-sliding interval is still `100 ms`.
- Standalone and team services each own one scheduler instance; the team instance shares one timer across member contexts.
- Content is merged by turn, segment id, and segment type within each resolved context.
- Every non-content event except `AGENT_STATUS` currently flushes pending content before normal dispatch.
- Despite presentation batching, every raw WebSocket message is still parsed and routed in the renderer process.

### Full accumulated Markdown work remains on every presented text revision

Sources:

- `autobyteus-web/components/conversation/AIMessage.vue`
- `autobyteus-web/components/conversation/segments/TextSegment.vue`
- `autobyteus-web/components/conversation/segments/ThinkSegment.vue`
- `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue`
- `autobyteus-web/composables/useMarkdownSegments.ts`

Findings:

- `AIMessage` passes the full current `segment.content` string to `TextSegment`, which always mounts `MarkdownRenderer`.
- Each content change recomputes the complete render model: normalize math, parse the full source, inspect/decorate image and file-action tokens, render Prism/KaTeX-capable HTML, sanitize the complete HTML, and replace reactive segments.
- `MarkdownRenderer` then schedules post-render DOM scans/bindings through a deep watch.
- The current stream identity already carries `presentationComplete`, but text/reasoning rendering does not use it to select a cheaper active-stream presentation.

### Backend sends each processed event immediately

Sources:

- `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts`
- `autobyteus-server-ts/src/agent-execution/backends/agent-run-backend.ts`
- `autobyteus-server-ts/src/agent-execution/events/dispatch-processed-agent-run-events.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`

Findings:

- Backend adapters already expose `subscribeToSourceEventBatches`, but native AutoByteus currently forwards each converted source event as a one-item batch.
- `AgentRun` is the runtime-independent authoritative boundary that processes the source batch, applies canonical event processors/lifecycle state, and publishes individual `AgentRunEvent`s to all run consumers.
- Standalone and team WebSocket handlers subscribe to `AgentRun`/`TeamRun` events and call `connection.send(...)` immediately for every event.
- Other `AgentRun` consumers aggregate content by delta and depend on exact final content/boundaries, not on token-sized chunk frequency: memory recording, compaction output, application streaming, external-channel output, skill improver completion, and file-change projection.
- The server WebSocket handlers are already the UI-delivery boundary. A shared application-level egress coalescer used by both handlers can remove most client message pressure without changing the authoritative internal run-event stream or delaying persistence, memory, application output, external channels, and other subscribers.
- Per-connection buffering introduces timer/disposal and unsent-on-disconnect responsibilities, but those are bounded transport-lifecycle concerns. This is a smaller semantic blast radius than throttling all `AgentRun` consumers. Current reconnect has no event replay either way, so the design must preserve established hydration/recovery behavior without claiming a new replay guarantee.
- “WebSocket batching” need not imply a new protocol envelope: concatenating ordered `SEGMENT_CONTENT.delta` values for the same exact stream identity into one existing server message provides the primary callback/parse reduction. A multi-message envelope should be introduced only if simultaneous-identity evidence demonstrates additional benefit worth the compatibility cost.

## Implemented-Candidate Failure — 2026-08-08

Sources:

- `autobyteus-server-ts/src/agent-execution/events/default-agent-run-event-pipeline.ts`
- `autobyteus-server-ts/src/agent-execution/events/processors/lifecycle-status/lifecycle-status-event-transformer.ts`
- `autobyteus-server-ts/src/services/agent-streaming/websocket-egress/agent-stream-websocket-egress-policy.ts`
- `autobyteus-server-ts/src/services/agent-streaming/websocket-egress/agent-stream-websocket-egress.ts`
- `autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts`, retained scenario `WS-EGRESS-001`
- `api-e2e-execution-evidence/ws-default-window-rate-failure.log`
- `api-e2e-execution-evidence/ws-default-window-rate-failure-summary.json`
- `code-review-report.md`, `CR-002` / `CR-PREM-001`

Exact retained command:

```bash
cd autobyteus-server-ts
pnpm exec vitest run tests/integration/agent/agent-status-websocket.integration.test.ts \
  -t "coalesces a representative fine-grained canonical stream" --no-watch
```

Observed result: `1 failed / 6 skipped`. Thirty same-identity source `SEGMENT_CONTENT` events remained present at the internal canonical subscriber, the 500 ms delay applied, but the client received thirty content frames rather than one exact aggregate.

Production trace:

`Workspace SEND_MESSAGE -> AgentRun.postUserMessage -> source content batch -> default pipeline -> LifecycleStatusEventTransformer emits [AGENT_STATUS running, SEGMENT_CONTENT] per delta -> handler mapper -> AgentStreamWebSocketEgress`.

The implemented `SEAL_THEN_SEND` action sends each `running` status immediately and sets `appendToTailAllowed=false`. Every following content event therefore creates a new queued group. The timer delays those groups but serializes all thirty separately.

### Implication

The egress boundary, interval, and existing-message aggregation protocol remain appropriate. The invalid part is the blanket merge-barrier rule. The supported canonical topology makes routine `running` status a high-frequency, order-independent companion—not a content-order boundary. The corrected action must send such companions without flushing **and without changing the pending queue or timer**. The seal-only `appendToTailAllowed` flag becomes redundant and should be removed; the actual pending tail plus content equality owns merge eligibility. The status messages themselves remain observable; dependent/unknown messages still flush. This permits `running, A:a1, running, A:a2` to emit both status frames immediately and later one `A:a1a2` content frame, satisfying AC-003 without changing internal lifecycle publication or the wire schema.

### Existing settings path supports a persisted live cadence

Sources:

- `autobyteus-server-ts/src/services/server-settings-service.ts`
- `autobyteus-server-ts/src/config/app-config.ts`
- `autobyteus-server-ts/src/api/graphql/types/server-settings.ts`
- `autobyteus-web/stores/serverSettings.ts`
- `autobyteus-web/components/settings/ServerSettingsBasicsPanel.vue`
- `autobyteus-web/components/settings/StreamingParserCard.vue`

Findings:

- The server already registers predefined settings, applies server-side normalization/validation, exposes them through GraphQL, and persists updates through `AppConfig.set`.
- `AppConfig.set` updates the in-process configuration and `process.env` immediately and writes the bound node's existing `.env`, so a runtime resolver can observe a new cadence without restart.
- The web settings store already binds reads/writes to the selected server and invalidates state when that binding changes.
- Quick-settings cards are the existing pattern for human-readable typed controls; the advanced table remains available for raw predefined settings.
- The setting is additive. An absent key can safely resolve to the 500 ms default without rewriting existing configuration or migrating run data.

## Accumulated Markdown Scaling Probe

Command shape:

```bash
node /tmp/markdown-scaling-bench.cjs
```

The disposable script used workspace packages `markdown-it@14.1.1`, `markdown-it-prism@2.3.1`, `dompurify@3.3.1`, and `jsdom@25.0.1`. For each length it parsed, Prism-rendered, and sanitized the complete accumulated Markdown source repeatedly.

| Accumulated source | Iterations | Mean complete parse/render/sanitize | p50 | p95 / max |
| ---: | ---: | ---: | ---: | ---: |
| 10,000 chars | 12 | 17.81 ms | 15.47 ms | 28.19 ms |
| 30,000 chars | 12 | 48.03 ms | 43.69 ms | 68.58 ms |
| 60,000 chars | 8 | 90.08 ms | 87.20 ms | 106.67 ms |
| 120,000 chars | 8 | 177.07 ms | 175.85 ms | 182.09 ms |
| 240,000 chars | 5 | 398.93 ms | 386.29 ms | 460.39 ms |

### Implication

The cost of one rich presentation revision grows with the full accumulated response. At approximately 120k characters, the conservative synthetic render already takes about 177 ms—longer than the current 100 ms cadence. Increasing the cadence to 500 ms would reduce frequency but can still spend roughly 35% of wall time on this conservative parse alone at that length; 1,000 ms can still spend roughly 18%, and the cost continues growing. Vue reconciliation, DOM replacement, file-action scanning, KaTeX/Mermaid, image binding, and scroll work add further cost.

Therefore a larger timer is necessary but not sufficient. The design must prevent full rich Markdown parsing on every in-progress content update. The existing `presentationComplete` lifecycle marker makes it feasible to show cheap escaped/pre-wrapped live text during the segment and perform the complete rich Markdown render at its semantic end.

## Evidence-Backed Recommendation

1. Use a **500 ms** normal, non-sliding content cadence in a shared server WebSocket-egress component used by standalone and team streaming. `1,000 ms` is one second, but it offers only a small additional raw-message reduction in the observed event shape while doubling visible progress latency.
2. Flush buffered content before dependent semantic/lifecycle boundaries. Explicitly classified order-independent companions such as canonical non-terminal status updates pass immediately while leaving pending content queue and timer untouched; preserving a companion is not the same as making it a content merge barrier.
3. Leave internal `AgentRun`/`TeamRun` publication unthrottled. Coalesce after mapping and before `connection.send(...)`, retaining the existing `SEGMENT_CONTENT` payload shape unless evidence requires a batch envelope.
4. Remove the frontend's independent 100 ms content timer after server WebSocket egress becomes the authoritative client-delivery cadence owner; apply each already-shaped content event immediately so delays do not stack.
5. Render active text/reasoning segments through a cheap escaped/pre-wrapped live-text path. Switch to the existing full Markdown renderer once the segment/message becomes complete.
6. Keep provider adapters, internal event contracts, WebSocket payload schema, persistence schemas, raw traces, and existing data unchanged. Aggregated `SEGMENT_CONTENT.delta` remains the client-facing event shape.
7. Add one server-wide **Live response update interval (ms)** setting through the existing bound-node Settings path. Proposed effective/reset default: `500`; accepted integer range: `100–2,000`; successful saves affect newly scheduled windows without restart; invalid direct environment values fall back to `500`.
8. Validate against a current long-output, multi-member reproduction. The current installed-process snapshot is not sufficient final proof.

## Remaining Evidence Gaps

- Exact user journey/team/member focus state responsible for the current worst slowdown.
- Current WebSocket event/message distribution during the user's worst interval.
- Real before/after interaction latency, renderer long tasks/CPU, backend event-loop delay, and rich-render invocation count on the candidate implementation.
- Perceived UX acceptability of live escaped text changing to rich Markdown at segment completion.
- Total client message/store-commit volume after content correction, because routine status frames intentionally remain client-visible even though they no longer fragment content aggregates.
- API-REV-002 rerun of retained `WS-EGRESS-001`, followed by the deferred broader browser/runtime evidence.
