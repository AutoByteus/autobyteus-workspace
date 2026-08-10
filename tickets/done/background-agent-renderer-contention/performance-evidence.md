# Performance Evidence — Background Agent Renderer Contention

## Purpose And Status

- Type: Evidence-only supplemental artifact
- Status: `Current investigation evidence — 2026-08-08`
- Approval applicability: `N/A`; this supplement records measurements and does not independently define intended behavior.
- Supports: `requirements.md`, `investigation-notes.md`, and `design-spec.md`
- Baseline: released `v1.4.45`, commit `7f0fc49965950d9689726a048371f2e2b78eef31`

## Evidence Boundary

The investigation deliberately combines three forms of evidence:

1. earlier exact Electron/native-runtime evidence that reproduced the user's severe symptom;
2. a current-source browser-equivalent UI connected to the real installed backend and real run history;
3. controlled probes that execute either the exact production team-member dispatcher or the exact navigation projection helpers.

The controlled 20-run scenario replays the **aggregate delivery rate** of twenty background runs through one loaded background context. It proves frontend cost scaling and invalidation behavior, but it does not claim to reproduce twenty independent sockets, providers, or server runtimes. Actual Electron/media-device validation remains downstream execution work.

## Earlier Exact Electron Reproduction

Authoritative prior source:

`/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/done/autobyteus-runtime-streaming-ui-performance/performance-evidence.md`

That live native AutoByteus/DeepSeek team run established:

| Metric | Active native stream | Idle/control |
| --- | ---: | ---: |
| Renderer CPU | mean `109.67%`, p95 `115.0%`, max `160.3%` | `4.5–6.1%` after termination |
| Backend CPU | mean `5.61%` | `0.7–1.8%` |
| Backend health | mean `1.408 ms` | responsive |
| Ordinary file open | `14.64 s` | `67.5 ms` |
| Team initial display | `13.85 s` | `98.9 ms` for comparable focus/panel action |
| Member transition | `52.27 s` | tens of milliseconds in the Codex control |

The renderer remained saturated while the selected `implementation_engineer` was idle and the hidden `code_reviewer` streamed. That observation rules out focused transcript Markdown as a necessary condition for the severe freeze. The historical native stream delivered `31.097` content envelopes/s with p50 delta length `4` characters; v1.4.45's server cadence materially changes that content rate, so the old run proves reachability and scale pressure rather than the residual v1.4.45 rate.

## Current Installed v1.4.45 Process Observation

Raw evidence: `probe-evidence/current-v145-process-samples.tsv`.

Thirty one-second samples were taken from the installed `/Applications/AutoByteus.app` while its backend remained at `http://127.0.0.1:29695`.

| Metric | Mean | Maximum |
| --- | ---: | ---: |
| Renderer CPU | `13.613%` | `36.7%` |
| Backend CPU | `2.130%` | `10.4%` |
| Backend health latency | `0.828 ms` | `2.475 ms` |

An unsynchronized point observation immediately before the retained sample saw the renderer at `91.6%`. The retained window then quieted. This establishes that the backend was healthy and the renderer remained bursty, but it is not a controlled active-stream reproduction.

## Current Real-Stream Browser Observation

Raw evidence: `probe-evidence/real-background-ui-summary.json`.

Setup:

- current v1.4.45 source served by Nuxt;
- real installed backend/data on port `29695`;
- real Software Engineering Team ticket selected;
- idle `architecture_reviewer` focused while `solution_designer` remained the background active member;
- actual Files panel interactions and WebSocket frames observed for `68.745 s`.

Observed team WebSocket traffic was light: `22` frames total, including `13` status, `2` content, one segment end, tool start/success, token usage, compaction, and lifecycle messages. The first cold `README.md` and `package.json` opens took `1.846 s` and `1.867 s`; the following six warm opens took `35.6–57.7 ms`. Three browser long tasks were observed (`68`, `118`, and `162 ms`). Because the stream was sparse and the first two file opens included cold setup, this trace confirms current production-path activity and occasional long tasks but does not by itself attribute the cold latency.

## Controlled Current UI Projection Probe

Raw evidence: `probe-evidence/background-projection-live.json`.

This probe used the actual current Nuxt UI, real backend snapshot, real `runHistory` store, real sidebar components, `38` team runs, and an idle focused member. It wrapped the production `getTeamNodes`/`getTreeNodes` methods for counting/timing, then changed only the background member's reactive `conversation.updatedAt` at controlled rates.

| Scenario | Event-style mutations | `getTeamNodes` calls | Time inside team projection | Tab click p95 |
| --- | ---: | ---: | ---: | ---: |
| Idle baseline | `0/s` | `270` | `39.1 ms` | `71 ms` |
| Reassign already-equal status only | `40/s` | `162` | `22.0 ms` | `62 ms` |
| One background run at 500 ms cadence | `2/s` | `432` | `54.7 ms` | `47 ms` |
| Twenty-run cadence equivalent | `40/s` | `7,128` | `833.7 ms` | `118 ms` |

Assigning the already-equal `running` status did not cause the amplification. Updating `conversation.updatedAt` did. The 40/s case consumed about `0.834 s` inside the team projection helper during a `6.5 s` observation, before accounting for Vue reconciliation/DOM work.

## Exact Production Dispatcher Probe

Raw evidence: `probe-evidence/exact-dispatch-live.json`.

A temporary probe-only Nuxt plugin exposed `dispatchGenericTeamMemberMessage`; it was removed immediately after capture. The test executed the actual production sequence:

`begin recent-event witness -> conversation.updatedAt mutation -> real handler -> retention/final witness commit -> Vue invalidation -> real workspace tree render`

The loaded topology had `26` workspace nodes and `38` team runs. The background `solution_designer` remained active while `architecture_reviewer` was focused.

| Scenario | Dispatcher calls | Mean sync dispatcher cost | `getTeamNodes` calls | Team projection time | Tab click p95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Idle baseline | `0` | — | `54` | `8.5 ms` | `65 ms` |
| Exact redundant `running` status at `40/s` | `260` | `0.764 ms` | `7,074` | `805.6 ms` | `59 ms` |
| One background run: status + content at `2` windows/s | `24` (`4` events/s) | `0.683 ms` | `432` | `52.2 ms` | `47 ms` |
| Twenty-run equivalent: status + content at `40` windows/s | `520` (`80` events/s) | `0.660 ms` | `7,074` | `791.5 ms` | `120 ms` |

For the exact status-only case, subtracting the `54` baseline calls leaves `7,020`; divided by `260` frames, that is exactly `27` full team projections per status frame: one per each of the `26` workspace nodes plus the unscoped reveal-dependency projection. This is direct runtime confirmation of the source-traced fan-out.

No individual browser task crossed the `50 ms` long-task threshold in the controlled scenarios. Responsiveness degraded through a dense sequence of smaller synchronous tasks. Therefore “no long tasks” is not sufficient evidence of a healthy UI in this case.

## Focused Lower-Bound Microbenchmark

Raw evidence: `probe-evidence/current-v145-microbenchmark.log`.

The disposable Vitest probe was removed after capture. It used current source, reactive objects, a 100-item recent Event Monitor window, and a history shape of 33 teams × 6 members × 28 workspace prop evaluations. Vue DOM patching was excluded, so results are lower bounds.

| Operation | Mean |
| --- | ---: |
| Already-`running` status handler only | `0.00175 ms` |
| Same handler plus current before/enforce/after Event Monitor transaction | `0.55239 ms` |
| Event Monitor transaction overhead | `0.55064 ms` |
| One filtered team projection | `0.29750 ms` |
| Current per-workspace projection pattern (28 calls) | `8.08265 ms` |

The witness/retention transaction is over 300 times the cost of the no-op status handler in this isolated shape. The per-workspace team projection pattern is the larger structural multiplier.

## Confirmed Production Causes

### Cause 1 — Per-frame activity timestamp invalidates global navigation

Both standalone and team-member dispatchers assign `conversation.updatedAt = new Date().toISOString()` for every parsed generic message, including redundant status, `CONNECTED`, token usage, content, and tool events. The workspace run tree reads live conversation timestamps, so background frames invalidate global navigation even when their transcript is not mounted.

### Cause 2 — One invalidation rebuilds all team history once per workspace

`WorkspaceAgentRunsTreePanel.vue` evaluates `workspaceTeams(workspaceRootPath)` for every workspace row. Each call invokes `runHistoryStore.getTeamNodes(rootPath)`, which builds every persisted/live team and member row before filtering. `revealDependencySignature` invokes another unscoped all-team build. Current runtime evidence measured `27` complete team projections per background frame for `26` workspaces.

### Cause 3 — Every generic message performs whole recent-window witness/retention work

`beginRecentEventMonitorMutation` builds a complete presentation witness; commit enforces the recent window, rebuilds the complete witness, and compares it. This happens even for messages that cannot change the Event Monitor and for repeated status values that do not change user-visible state.

### Cause 4 — The WebSocket projection still sends redundant routine statuses

The canonical lifecycle transformer emits a `running` status before every non-terminal event. The v1.4.45 WebSocket egress correctly lets routine statuses pass without fragmenting content batches, but it still sends every repeated `running` projection. Raw runtime events and traces must remain intact; the redundant UI-facing copies are not semantic transitions.

Git history shows this volume was introduced deliberately by `b1e96b73f` on 2026-08-02. The accepted `agent-stream-driven-status` requirements replaced sparse status events with one canonical companion per final non-status event so activity could repair stale frontend lifecycle state and carry correct current/retired-turn meaning. The performance defect is therefore not the canonical companion invariant itself; it is forwarding every unchanged companion across the UI-facing WebSocket after exact identity is already known.

### Cause 5 — All active runs are recovered and subscribed independent of selection

Startup recovery connects every history item marked active. Selection controls which transcript is displayed, not which active streams are received and projected. Aggregate cost therefore scales with all active runs, exactly matching the user's concern about 10–20 simultaneous agents.

## Ruled-Out Primary Explanations

- **Focused rich Markdown:** not required for the freeze; earlier exact evidence reproduced saturation while the active stream was hidden.
- **Backend/disk latency:** backend health and direct file/reference reads remained orders of magnitude faster than UI delays.
- **WebSocket transport blocking by itself:** browser WebSocket callbacks run on the renderer event loop, but the measured dominant amplification is synchronous frontend dispatch/projection after delivery. Moving JSON parsing alone to a worker would leave the reactive projection fan-out intact.
- **One 500 ms stream:** current controlled evidence shows one background run at default cadence remains near idle. The defect is aggregate per-frame work multiplied across active runs and workspace/history size.

## Evidence-Backed Correction Direction

1. At the UI WebSocket presentation boundary, compose a dedicated identity-aware status-transition filter ahead of raw delivery: suppress only exact consecutive duplicate status projections per stream identity; send the first status and every real transition immediately, preserving raw runtime/trace events.
2. Replace unconditional frontend “every message changed everything” mutation handling with explicit mutation effects. No-op/status/token/connected messages must not scan or revise Event Monitor presentation.
3. Separate authoritative conversation mutation from navigation presentation invalidation. Content frames must not rebuild the run-history tree; navigation status changes must be no-op checked, and activity display updates must be bounded to their actual UI resolution.
4. Build/index the complete team navigation projection once per relevant navigation change, not once per workspace render. Reveal topology must depend on stable identities/topology, not activity/status content.
5. Keep current 500 ms configurable content cadence, progressive rich Markdown, exact ordered background state, and selection hydration.

## Remaining Validation Work

- Establish before/after paste-to-placeholder and fake-device voice-start deltas in the final implementation; current source proves both actions share the renderer event loop but actual media-device startup includes external latency.
- Run the exact aggregate-load probe after implementation and require the redundant-status/content path to stop rebuilding global navigation.
- Run actual Electron validation after browser-equivalent checks pass, because microphone extension/IPC behavior is Electron-specific.
