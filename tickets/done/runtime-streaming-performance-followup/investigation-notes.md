# Investigation Notes — Runtime Streaming Performance Follow-up

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Requirements and SR-002 companion semantics confirmed by user; ready for architecture re-review`
- Investigation Goal: Determine why severe frontend degradation remains after the v1.4.37 100 ms presentation scheduler, compare 500 ms/1,000 ms or adaptive cadence options, and establish whether backend stream shaping is justified.
- Scope Classification: `Large`
- Scope Classification Rationale: The relevant supported path crosses native/runtime content emission, server run events, WebSocket conversion/fan-out, standalone/team frontend ingestion, scheduling/projection, accumulated Markdown rendering, and realistic performance validation.
- Scope Summary: Performance follow-up only; preserve exact stream/lifecycle semantics and persisted data while measuring and correcting the remaining end-to-end bottleneck.
- Primary Questions To Resolve:
  1. What exact supported workload reproduces the user's remaining severe slowdown? `Partially resolved`: current installed bursts plus a historical 31/s, 121k-character workload define a stress floor; exact current journey details remain useful for final execution.
  2. Which frontend work remains coupled to event rate or accumulated content despite the 100 ms scheduler? `Resolved`: every raw message is still parsed/routed, and each presented active-text revision fully reparses accumulated Markdown.
  3. What additional latency and performance change result from 500 ms versus 1,000 ms or an adaptive policy? `Resolved for requirements`: 500 ms removes an estimated 93.57% of representative content messages; 1,000 ms removes 96.78%, too little extra benefit to justify double latency when active rich rendering is removed.
  4. Is backend event conversion, serialization, fan-out, or message volume material? `Resolved`: backend CPU is not the dominant observed bottleneck, but server WebSocket-egress shaping prevents about 90%+ of browser message work and is justified as pressure control.
  5. Which backend consumers/contracts constrain coalescing, and where would one authoritative shaping boundary belong? `Resolved`: internal `AgentRun`/`TeamRun` consumers must remain unthrottled; one shared application-level coalescer after server message mapping and before `connection.send(...)` is the narrow transport owner for standalone and team UI delivery.
  6. Can the cadence use established Settings persistence and change without restart? `Resolved for requirements`: the existing bound-node server settings mutation updates the in-process `AppConfig`, `process.env`, and `.env` file immediately. A typed interval resolver can make newly scheduled egress windows observe a saved value without restarting or changing WebSocket protocol.
  7. Does the target egress policy work on the supported post-finalizer event topology? `Resolved after API-REV-001 / CRR-003`: no under SR-001. `LifecycleStatusEventTransformer` inserts `AGENT_STATUS running` before every non-terminal content event; sealing on every companion fragments one window into one frame per delta. The corrected policy preserves routine companion delivery while leaving pending content and timer state unchanged; appendability is derived from the actual pending content tail.

## Request Context

On 2026-08-06 the user reported that the frontend still has a very large performance problem after the recently completed `autobyteus-runtime-streaming-ui-performance` ticket. The user asked whether the shipped 100 ms cadence is too small, proposed 500 ms or 1,000 ms (one second), and asked whether the backend should also support the performance correction because a frontend-only design may be insufficient. The user then selected server WebSocket egress as the preferred batching layer and requested a Settings control with a supplied default plus manual adjustment.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup`
- Current Branch: `codex/runtime-streaming-performance-followup`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup`
- Shared Main Checkout Refresh: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` branch `personal` fast-forwarded from `09e22b343` to `c2ae6634d` after confirming incoming paths did not overlap its existing unrelated modified/untracked files.
- Bootstrap Base Branch: `origin/personal @ 09e22b343f770b84d536dc9a97d0f1c2f6652814`
- Current Design Base: `origin/personal @ c2ae6634d3d3aa59c196dfb54bfaf8971a5e5d93`
- Current Rework Implementation Commit: `7d7d74cdb52a2f2ed1049a9df58cdc0ae95791c7` plus retained uncommitted API/E2E coverage/evidence from `API-REV-001`.
- Remote Refresh Result: `Pass — git fetch origin personal on 2026-08-06 before bootstrap and again before design; the task branch was fast-forwarded to c2ae6634d before design production.`
- Task Branch: `codex/runtime-streaming-performance-followup`
- Expected Base Branch: `origin/personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: `None`
- Notes For Downstream Agents: Do not use the user's shared `personal` checkout for authoritative edits. The initial design was based on `origin/personal @ c2ae6634d`; implementation rounds `IR-001`/`IR-002` now exist on the task branch. Preserve the retained red `WS-EGRESS-001` regression and all API-REV-001 evidence during rework.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/performance-evidence.md` | Evidence-only live installed-process observation, prior event-shape calculation, code/settings-path analysis, accumulated-Markdown scaling probe, and downstream failure-origin evidence. | Establishes the 500 ms choice, backend shaping boundary, timer-only insufficiency, settings integration path, and the production-grounded routine-status topology that invalidated SR-001's seal policy. | Requirements and design spec. | FR-001, FR-002, FR-003, FR-006, FR-007, FR-008 / AC-001, AC-002, AC-003, AC-006, AC-007, AC-008 | `Current — updated for API-REV-001 / CRR-003` | `N/A — evidence only` | Re-run retained `WS-EGRESS-001` first after correction; then add realistic candidate before/after evidence. |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-06 | Command | `git fetch origin personal`; `git rev-parse origin/personal`; `git worktree add -b codex/runtime-streaming-performance-followup ... origin/personal` | Refresh base and isolate authoritative work. | Base is `09e22b343`; dedicated branch/worktree created successfully. | No |
| 2026-08-06 | Command | `git fetch origin personal`; fast-forward task branch; `git rev-parse HEAD origin/personal` | Re-verify the authoritative task workspace immediately before design production. | Task branch and `origin/personal` both resolved to `c2ae6634d3d3aa59c196dfb54bfaf8971a5e5d93`; design was produced against that refreshed state. | No |
| 2026-08-06 | Command | In shared checkout: inspect incoming/local path overlap; `git merge --ff-only origin/personal`; compare `HEAD...origin/personal` | Fulfil the user's request to make the local main `personal` checkout latest without overwriting unrelated local work. | Shared `personal` fast-forwarded to `c2ae6634d`; ahead/behind is `0/0`. Existing unrelated modification `autobyteus-server-ts/docs/modules/mcp_server_management.md` and untracked `.article-work/`, `codex/` remain untouched. | No |
| 2026-08-06 | Doc | `tickets/done/autobyteus-runtime-streaming-ui-performance/requirements.md` | Establish the prior measured problem and approved behavior. | Prior reproduction attributed dominant pressure to frontend presentation amplification and intentionally excluded backend persistence changes. | Yes — compare current code and current reproduction. |
| 2026-08-06 | Doc | `tickets/done/autobyteus-runtime-streaming-ui-performance/implementation-handoff.md` | Identify the shipped scheduler contract. | Shared non-sliding 100 ms scheduler, per service instance, exact identity coalescing, forced flush before non-content/lifecycle events. | Yes — inspect implementation. |
| 2026-08-06 | Doc | `tickets/done/autobyteus-runtime-streaming-ui-performance/release-notes.md`; `handoff-summary.md` | Confirm release outcome and prior validation. | Released as v1.4.37; earlier controlled validation passed but the user now reports residual severe performance. | Yes — new evidence supersedes sufficiency assumption, not historical facts. |
| 2026-08-06 | User report | Current conversation | Capture current supported outcome and requested design direction. | Severe UI degradation remains; user proposes 500 ms/1,000 ms and backend support. | Resolved below. |
| 2026-08-06 | User clarification | Current conversation | Evaluate the user's proposed server WebSocket-layer batching boundary. | Application-level WebSocket egress coalescing is the narrower industry-standard pressure boundary for this client-delivery issue: it reduces wire/browser work while preserving unthrottled internal events. | Carry into approved requirements and design. |
| 2026-08-06 | User clarification and approval | Current conversation | Define and approve adjustable Settings behavior and frontend/backend ownership. | User wants a provided default with manual control, confirms configurable timed batching is solely server WebSocket responsibility, and confirms the frontend consumes/displays shaped output. Approved basis uses 500 ms default, validated 100–2,000 ms range, server-wide scope, reset, and live application. | Produce design. |
| 2026-08-06 | User-supplied design proposal | Current conversation | Compare proposed outbound stream shaping with the evidence-backed requirements. | Proposal aligns on application-level WebSocket egress ownership, lossless ordered concatenation, boundary flushes, unchanged raw traces, observability, and layered frontend rendering. Refinements: 500 ms configurable default rather than fixed 100 ms; concatenate only consecutive same-identity deltas; routine status must not defeat cadence; do not retain a second frontend timer. | Carry clarified semantics into design. |
| 2026-08-06 | Code | `autobyteus-web/services/agentStreaming/presentation/*`; `AgentStreamingService.ts`; `TeamStreamingService.ts` | Verify current cadence and flush behavior. | Fixed non-sliding interval remains 100 ms; every raw WebSocket message is still parsed/routed; all non-content events except `AGENT_STATUS` flush pending content. | No |
| 2026-08-06 | Code | `autobyteus-web/components/conversation/AIMessage.vue`; `TextSegment.vue`; `ThinkSegment.vue`; `renderer/MarkdownRenderer.vue`; `composables/useMarkdownSegments.ts` | Trace active rich-content presentation. | In-progress text always traverses full accumulated math normalization, Markdown parse/render, scanning, sanitization, DOM update, and post-render scan; existing stream identity exposes completion but rendering does not use it. | No |
| 2026-08-06 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts`; `backends/agent-run-backend.ts`; `events/dispatch-processed-agent-run-events.ts`; relevant server stream handlers and content consumers | Locate backend authority and consumer constraints. | `AgentRun` is the shared runtime-independent source-event-batch boundary. Memory, application/external output, compaction, file-change, and completion consumers aggregate content and need exact boundaries, not token frequency. | No |
| 2026-08-06 | Code | `autobyteus-server-ts/src/services/server-settings-service.ts`; `src/config/app-config.ts`; GraphQL server-settings resolver; web server-settings store and quick-settings cards | Determine whether the cadence can reuse existing persisted Settings behavior. | Generic bound-node setting updates validate/persist through server service, mutate in-process config immediately, and reload through the existing web store; typed quick cards are the established user-facing pattern. | No new persistence/API subsystem required. |
| 2026-08-06 | Command / Data | Read installed app version/process tree; `curl http://127.0.0.1:29695/rest/health`; 30 one-second `ps`/health samples summarized in `performance-evidence.md` | Observe the user's current installed v1.4.43 session without modifying it. | Renderer point bursts 85.8%/30%; 30-s renderer p95/max 39.9%/61.1%. Backend point 0.9%/0.7%, 30-s p95/max 3.7%/11.8%; health p95 1.057 ms, 30/30 success. | Yes — candidate implementation needs synchronized full reproduction. |
| 2026-08-06 | Probe | Disposable `/tmp/markdown-scaling-bench.cjs` using workspace MarkdownIt/Prism/DOMPurify/JSDOM versions | Quantify full accumulated rich-render scaling. | Conservative mean complete render: 17.81 ms at 10k, 90.08 ms at 60k, 177.07 ms at 120k, 398.93 ms at 240k chars. | Yes — realistic browser proof downstream. |
| 2026-08-06 | Data | `tickets/done/autobyteus-runtime-streaming-ui-performance/api-e2e-execution-evidence/live-native-performance-summary.json` | Reuse authoritative representative stream shape. | 17,439 content events / 121,669 chars / 560.8 s = 31.097 events/s; 500 ms cadence estimates 93.57% ordinary reduction vs 96.78% at 1,000 ms. | No |
| 2026-08-08 | API/E2E evidence | `api-e2e-execution-coverage-report.md`; `api-e2e-revision-record.md` (`API-REV-001`); `api-e2e-execution-evidence/ws-default-window-rate-failure.{log,summary.json}`; retained `agent-status-websocket.integration.test.ts` scenario `WS-EGRESS-001` | Validate the implemented 500 ms policy through the supported WebSocket production path. | 30 same-identity internal content events remained fine-grained but produced 30 delayed client content frames, not one aggregate. The default lifecycle finalizer inserted `running` before each content event and SR-001's seal policy split every group. | Preserve the red regression; correct design before implementation. |
| 2026-08-08 | Failure-origin review | `code-review-report.md`; `code-review-revision-record.md` (`CRR-003`, `CR-002`, `CR-PREM-001`) | Classify the API/E2E failure and establish product reachability. | `CR-PREM-001` is Reachable from Workspace SEND_MESSAGE through `AgentRun`, the default pipeline, mapper, egress, and real WebSocket. Result is `Fail — Design Impact`, not test/environment/local-fixture origin. | Revise solution and reroute through architecture review. |
| 2026-08-08 | Code | `default-agent-run-event-pipeline.ts`; `lifecycle-status-event-transformer.ts`; current `agent-stream-websocket-egress-policy.ts`; current `agent-stream-websocket-egress.ts`; frontend status dispatch | Trace why the accepted egress unit shape fails the complete production path. | The finalizer emits `[AGENT_STATUS running, event]` for every non-terminal event. Current `SEAL_THEN_SEND` sets `appendToTailAllowed=false`. Frontend status remains client-visible and enters normal dispatch. | Replace blanket seal semantics with order-independent pass-through that preserves pending content state. |
| 2026-08-08 | User clarification and confirmation | Current conversation after SR-002 explanation | Confirm the observable status/content behavior before architecture reroute. | User confirmed that routine statuses remain separately and immediately delivered, are not merged/dropped, and do not split the content batch; terminal/dependent statuses retain content-first flush. User authorized review. | Route SR-002 to architecture review. |

## Relevant Existing Behavior And Production Paths

The 2026-08-06 rows preserve the initial released baseline. The BEH-003 row and 2026-08-08 source entries additionally describe the implemented candidate and the production interaction that drives SR-002; downstream readers must not infer that the old frontend scheduler/direct-send path still exists on the task branch.

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Run an agent or team through a supported runtime while continuing to interact with the workspace UI. | Runtime content event -> server run event/converter -> WebSocket -> standalone/team streaming service -> frontend presentation scheduler -> segment/event-monitor projection -> reactive conversation/Markdown UI. | The v1.4.37 scheduler bounds normal content presentation to 100 ms, but the user still observes severe frontend degradation. Exact final content and lifecycle ordering are required invariants. | User report; prior requirements and implementation handoff. |
| BEH-002 | System | Continuous or bursty live `SEGMENT_CONTENT` delivery for an active run/member/segment. | Frontend service resolves target and receipt metadata -> service-owned `StreamContentPresentationScheduler` -> fixed-window coalescing -> projection; every non-status non-content event forces prior-content flush. | Normal live presentation is delayed by at most 100 ms, but all raw messages still enter the renderer and per-update work is not bounded by content size. | Current source inspection. |
| BEH-003 | System | Runtime emits fine-grained content events through an active `AgentRun`. | Runtime backend source-event batch -> `AgentRun.publishSourceEvents` -> default pipeline finalizer emits `AGENT_STATUS running` then each non-terminal content event -> standalone/team and non-WebSocket subscribers -> server mapper -> `AgentStreamWebSocketEgress` -> WebSocket -> client parse/dispatch. | Native AutoByteus commonly supplies one content event per batch. Every canonical consumer sees token-sized frequency. On the current candidate, `SEAL_THEN_SEND` turns 30 such deltas into 30 delayed content frames. Required invariants are exact content/group order, dependent boundaries, and preserved routine status visibility—not using routine status as a content-order boundary. | Current source inspection; `WS-EGRESS-001`; `CR-PREM-001`. |
| BEH-004 | User | Use standalone/team streams across AutoByteus, Codex, visible/background members, and lifecycle transitions. | Shared `AgentRun` event boundary and server/frontend streaming boundaries, with runtime-specific upstream adapters and common client projection. | Routing identity, exact content, lifecycle, hydration/history, tool and interruption behavior must remain compatible. | Current source inspection; prior requirements/release evidence. |
| BEH-005 | User | Observe an incomplete or completed text/reasoning segment in the Event Monitor. | Reactive segment content -> `AIMessage` -> `TextSegment`/expanded `ThinkSegment` -> `MarkdownRenderer` -> `useMarkdownSegments` full-source pipeline -> sanitized HTML/DOM. | Incomplete text is fully rich-rendered every presented update. Completed/historical rich Markdown uses the same path. | Current source inspection; scaling probe. |
| BEH-006 | User | Open Settings for the currently bound server and tune live response flow. | Settings quick card -> server settings store -> GraphQL `updateServerSetting` -> `ServerSettingsService` validation -> `AppConfig.set` -> in-process config plus `.env`. | No cadence setting exists today. The established path supports persisted, immediately readable server configuration and bound-node isolation. | User clarification; current settings source inspection. |

## Design Health Assessment Evidence

- Change posture: `Performance`
- Candidate root cause classification: Initial `Boundary Or Ownership Issue` plus bounded `Local Implementation Defect`; SR-002 adds a `Missing Invariant` across the canonical lifecycle finalizer and egress policy.
- Refactor posture evidence summary: The original refactor remains required and is implemented on the task branch. Rework is now required inside the egress-owned policy: safe companions that are explicitly independent of pending content ordering must pass without changing queue or timer. The obsolete seal-only append flag should be removed; the actual pending tail owns merge eligibility. The default-flush rule remains for dependent/unknown messages, and canonical status events remain unchanged upstream and observable downstream.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User report, 2026-08-06 | Severe frontend slowdown remains after v1.4.37. | Prior acceptance shape was not sufficient for the user's current workload. | Validate candidate on current stress floor. |
| Current frontend source and Markdown probe | Client timer reduces revision frequency but full rich-render cost reaches ~177 ms at 120k and ~399 ms at 240k in a conservative probe. | Timer-only retuning cannot bound cost; active and final presentation responsibilities must split. | User approval for live-plain/final-rich behavior. |
| Current backend source, user clarification, and historical stream data | Internal run events reach standalone/team WebSocket handlers one at a time; representative native rate was 31.097/s and both handlers immediately call `connection.send(...)`. | A shared application-level WebSocket-egress coalescer minimizes transport/browser work without delaying non-UI subscribers. Per-session timers/disposal must be encapsulated once rather than duplicated in handlers. | Formalize in design after approval. |
| Installed process/health sample | Current renderer bursts while backend remains healthy/light. | Backend support is upstream pressure control, not a claim that backend CPU/filesystem is dominant. | Synchronized before/after proof downstream. |
| `WS-EGRESS-001` plus CRR-003 source trace | One `running` status precedes each content event; `SEAL_THEN_SEND` closes the content tail each time. | The egress owner is correct, but SR-001's merge-barrier invariant is wrong for the supported production topology and defeats the primary rate guarantee. | Replace seal action with state-preserving pass-through; architecture re-review required. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/services/agentStreaming/presentation/` | Shared frontend live-content scheduling and batch projection. | Shipped owner uses a 100 ms fixed non-sliding cadence after every raw message is parsed. | Existing timer becomes obsolete when server WebSocket egress owns cadence; immediate projection logic can remain reusable. |
| `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` | Standalone WebSocket ingestion and lifecycle dispatch. | Owns a scheduler instance and flush boundaries per prior handoff. | Must preserve standalone identity/order behavior. |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Team/member/task stream ingestion and routing. | Owns a scheduler instance and resolves nested contexts per prior handoff. | Must preserve member/task identity and background behavior. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` and `backends/agent-run-backend.ts` | Runtime-independent run boundary and source-event batch contract. | Canonical processing/dispatch commonly receives one content event at a time and serves UI and non-UI consumers. | Preserve this authoritative internal stream unthrottled; transport pacing does not belong here for this task. |
| `autobyteus-server-ts/src/agent-execution/events/default-agent-run-event-pipeline.ts`; `processors/lifecycle-status/lifecycle-status-event-transformer.ts` | Canonical lifecycle finalization. | During an active turn, every non-terminal event becomes `[AGENT_STATUS running, event]`; this is an established supported path and is intentionally unchanged. | Egress must be designed against post-finalizer topology rather than treating token events as adjacent raw messages. |
| `autobyteus-server-ts/src/services/agent-streaming/` | Server agent/team event-to-WebSocket mapping and connection delivery. | Standalone and team handlers each send mapped events immediately. | Correct ownership layer for one shared application-level content egress coalescer; handlers must not implement separate policies. |
| `autobyteus-server-ts/src/services/agent-streaming/websocket-egress/{agent-stream-websocket-egress-policy,agent-stream-websocket-egress}.ts` | Implemented task-branch classification and pending content lifecycle. | `AGENT_STATUS running` is currently `SEAL_THEN_SEND`, which sets `appendToTailAllowed=false`; the timer still works but aggregation does not. | Keep the owner and three-way policy, replace seal semantics with `SEND_WITHOUT_FLUSH` that leaves pending content state untouched. |
| `autobyteus-web/components/conversation/AIMessage.vue`, `TextSegment.vue`, `ThinkSegment.vue` | Select and host segment presentation. | They ignore existing `presentationComplete` for renderer selection. | Correct component boundary to select cheap active versus final rich presentation. |
| `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue`; `composables/useMarkdownSegments.ts` | Complete rich Markdown parse/render/sanitize/effects. | Work scales with full accumulated source on every active update. | Preserve as completed-content owner; do not overload it with active-stream pacing. |
| `autobyteus-server-ts/src/services/server-settings-service.ts`; `src/config/app-config.ts` | Predefined setting metadata, validation, in-process configuration, and `.env` persistence. | Updates become immediately readable and persistent, but numeric cadence validation/resolution does not yet exist. | Add one typed setting definition/resolver with a safe 500 ms fallback and authoritative 100–2,000 ms integer validation. |
| `autobyteus-web/components/settings/ServerSettingsBasicsPanel.vue`; server settings store | Bound-node quick settings UI and GraphQL persistence. | Existing cards provide typed controls; store already guards node rebinding and reloads saved state. | Add a dedicated **Live response update interval** numeric card rather than asking users to edit an opaque raw key. |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-06 | Process observation | Installed v1.4.43 `ps` snapshots plus 30 one-second samples and backend health requests. | Renderer bursts up to 85.8% point-in-time; 30-s p95/max 39.9%/61.1%. Backend stayed light/healthy; health p95 1.057 ms, 30/30 200. | Confirms residual real renderer pressure and argues against backend-as-dominant-CPU framing. |
| 2026-08-06 | Script | `/tmp/markdown-scaling-bench.cjs`; canonical results in `performance-evidence.md`. | Complete accumulated render mean grew from 17.81 ms at 10k to 398.93 ms at 240k. | Full rich render must leave the active update loop. |
| 2026-08-06 | Data analysis | Historical native summary event-rate/cadence calculation. | 500 ms estimated 93.57% ordinary message reduction; 1,000 ms 96.78%. | Recommend 500 ms plus cheap active rendering. |
| 2026-08-08 | Retained real-WebSocket integration | `pnpm exec vitest run tests/integration/agent/agent-status-websocket.integration.test.ts -t "coalesces a representative fine-grained canonical stream" --no-watch` | Independently reproduced 1 failed / 6 skipped: expected one content frame, observed 30; all 30 internal events remained present. | Proves SR-001's seal rule is incompatible with AC-003 on the supported production path. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: `None consulted; current task is repository/runtime specific.`
- Version / tag / commit / freshness: N/A
- Relevant contract, behavior, or constraint learned: N/A
- Why it matters: Repository code and direct runtime evidence are expected to be authoritative.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Final validation should reuse an Electron-started backend plus browser/Electron UI and a real or deterministic fine-grained runtime stream. Focused synthetic event generation is also required for exact cadence/boundary assertions.
- Required config, feature flags, env vars, or accounts: Record runtime/model/team identifiers for the final realistic run. Historical floor used Temp Workspace, Software Engineering Team, AutoByteus runtime, and `deepseek-v4-flash`.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin personal`; dedicated worktree creation.
- Cleanup notes for temporary investigation-only setup: `/tmp/markdown-scaling-bench.cjs` and `/tmp/runtime-streaming-performance-live-process-samples.tsv` are disposable; canonical summaries are in `performance-evidence.md`. The installed app was not altered or controlled.

## Findings From Code / Docs / Data / Logs

- Historical evidence establishes that the prior 100 ms scheduler was a real improvement under its controlled workload; it does not establish sufficiency for the user's current workload.
- `1,000 ms` equals one second. For the representative 31.097/s input, 500 ms already removes an estimated 93.57% of ordinary content publications; 1,000 ms removes 96.78%. The smaller latency is preferred.
- Accumulated rich-render cost is the stronger scaling defect: at 120k characters a conservative full render is already longer than the 100 ms timer, and at 240k it approaches 400 ms before Vue/DOM extras.
- The backend should shape at the server WebSocket egress boundary, not in runtime adapters or the authoritative internal run-event stream. Standalone and team handlers should reuse one component rather than implement separate policies. The frontend should not retain a second timer; otherwise the stages can add to 600–1,000+ ms unpredictably.
- Existing stream identity state already provides a completion signal. Incomplete text/reasoning can be safely presented as escaped/pre-wrapped text, while completed/historical content keeps the full Markdown owner unchanged.
- The previous frontend scheduling change is removed only as the cadence owner. Frontend projection remains, the new active/plain versus completed/rich rendering correction remains required, and the frontend gains a Settings control for the server-owned interval.
- The established server Settings path supports a persisted `AUTOBYTEUS_STREAMING_CONTENT_FLUSH_INTERVAL_MS`. Requirements propose an effective/reset default of 500 ms, integer range 100–2,000 ms, and live application to newly scheduled windows without restart.
- The user's term **outbound stream shaping** is accurate for this design. It is not transport backpressure: the cadence coalescer deterministically reduces presentation-event frequency while the socket is healthy; it does not pause the producer in response to a saturated consumer.
- Concatenation must be limited to consecutive same-identity content groups. Merging an `A, B, A` interleaving into `AA, B` would change observable ordering; the egress owner must retain ordered groups even when that results in more than one send at a window boundary.
- “Consecutive” must be evaluated in the content-order lane, not by raw post-finalizer adjacency. The supported pipeline interleaves idempotent `running` status companions between same-identity content events. An explicitly order-independent companion remains client-visible but neither drains nor mutates the pending content queue or timer; the actual content tail remains the merge authority.
- This correction does not deduplicate or suppress routine status messages. It preserves the existing status-only WebSocket projection while preventing those messages from fragmenting content. A different content identity still opens a new ordered group; a dependent/unknown message still flushes before send.
- Metrics are required as validation evidence. Always-on per-delta logging would add the pressure being measured and must not be introduced unless attached to an existing bounded telemetry owner.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: Existing run history, raw traces, working context/memory, communications, artifacts, and database metadata remain unchanged; server settings persist as key/value assignments in the bound node's existing `.env`.
- Relevant code-model, serialization, semantic, or physical-store change: One additive server setting key is proposed; no run-data or database representation changes.
- Normal readers and writers, including unknown/extra-field behavior: Not affected by ephemeral content delivery/presentation pacing.
- Representative direct-read or compatibility evidence: `AppConfig.get` reads process/config values and `AppConfig.set` updates both in-memory values and the `.env`; an absent new key can resolve to 500 without migration.
- Required semantics and invariants preserved by direct use: `Yes` — no persisted representation change is in candidate scope.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Existing user run data must not be rewritten for a pacing change.
- Concrete benefit, cost, and risk of migration if it remains a candidate: No migration is required. Persisting an explicit 500 for existing installations would add churn without benefit; absence should mean default.
- Existing migration framework or lifecycle constraints, only if migration may be required: N/A.

## Constraints / Dependencies / Compatibility Facts

- Exact content/order and lifecycle-before/after relationships are stronger invariants than presentation frequency.
- Non-content and lifecycle events currently force synchronous content flushes; a larger normal window may still observe more frequent commits when semantic events are dense.
- Standalone and team services use separate scheduler instances while sharing the scheduler implementation.
- The policy must remain runtime/provider independent unless evidence proves a genuinely different contract rather than merely a different chunk cadence.
- Server-side WebSocket shaping cannot change persistence/raw-trace semantics or delay internal run-event consumers.
- The client-facing `SEGMENT_CONTENT` event/payload can retain its schema; only WebSocket delta granularity changes. Application-level coalescing is sufficient for the primary case, so no batch-envelope protocol or compatibility path is required unless multi-identity evidence proves otherwise.
- `AGENT_STATUS` is an established non-blocking control companion that may pass without forcing content flush. Dependent semantic/lifecycle boundaries must flush first.
- An explicitly non-blocking, order-independent companion must leave pending content state unchanged. `SEND_WITHOUT_FLUSH` is not a merge boundary. This exemption is policy-declared and narrow; unknown or causally dependent messages retain correctness-safe flush behavior.
- The cadence is one server-wide bound-node setting, not a frontend-only local preference, because the server owns the outgoing flow and remote clients must observe the same policy.
- A successful settings mutation must not restart the server or reconstruct sockets. One typed resolver must apply validated changes to the next newly scheduled window while preserving already buffered deltas.

## Open Unknowns / Risks

- Exact current reproduction, data size, number of simultaneous members, focused/hidden state, runtime/model, and duration.
- Exact current synchronized frontend event/long-task profile and WebSocket distribution during the user's worst interval.
- Safe plain live text/reasoning switching to rich Markdown at completion is approved; rendered quality still requires implementation/browser validation.
- Setting behavior is approved: 500 ms default/reset, 100–2,000 ms integer range, server-wide scope, and live application. The technical key can change during design review without changing user intent.
- Abrupt network reconnect has no current event replay. The design must preserve supported connected/boundary behavior and avoid claiming replay guarantees.
- Dense semantic boundaries can legitimately exceed two content publications/s; tests/evidence must classify forced flushes separately from normal cadence.
- Routine status frames remain client-visible and can still contribute transport/dispatch volume. This SR-002 correction preserves their established contract rather than adding status deduplication; final performance evidence must measure total messages/store commits and report whether residual status volume remains material.

## Notes For Architecture Reviewer

- Requirements remain approved, and the user explicitly confirmed SR-002's immediate separate status delivery plus status-transparent content grouping before authorizing this reroute. Review the design against `CR-002`, `CR-PREM-001`, retained `WS-EGRESS-001`, the 500 ms default, exclusive WebSocket-egress cadence ownership, status visibility, and live-plain/final-rich presentation.
- The governing egress owner remains valid. The reviewed seal-on-every-companion invariant does not: production inserts a routine `running` status before each content event. The corrected three-way policy must preserve routine status delivery and pending content state simultaneously, while dependent/unknown messages still flush.
- Architecture approval must require API/E2E to restart with the retained `WS-EGRESS-001` regression and append `API-REV-002` after implementation and source review; the regression must not be weakened or removed.
