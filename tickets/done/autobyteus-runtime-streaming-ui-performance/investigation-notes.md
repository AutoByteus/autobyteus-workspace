# Investigation Notes — AutoByteus Runtime Streaming UI Performance

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Complete for requirements refinement and architecture-level current-state read; requirements approved by the user on 2026-08-01. Architecture review round 1 returned two design-impact findings (`AR-F-001`, `AR-F-002`), both resolved in the SR-002 design revision.
- Investigation Goal: Reproduce and isolate frontend interaction latency correlated with active native AutoByteus streaming, with exact Electron-backend file/reference evidence and voice-path analysis.
- Scope Classification: `Large`
- Root Cause Confidence: `High` for the primary frontend owner, the measured AutoByteus-versus-Codex event-shape comparison, and the missing voice-starting state.
- Primary Result: The freeze is caused by fine-grained stream events directly driving repeated reactive recent-event-monitor witness construction and accumulated Markdown presentation on the Electron renderer. The Electron backend, local reference endpoint, raw-trace writes, and working-context snapshot writes are not the dominant delay.

## Request Context

The user reports that an AutoByteus-runtime software-engineering team in Temp Workspace using DeepSeek Flash makes the entire Electron application nearly unusable while streaming. Local files and team-message references remain loading, and voice input appears inert before `Listening`/recording state appears. The same problem is not observed with Codex runtime. The user explicitly requested running the worktree frontend against the Electron-started backend and reproducing by launching a simple Software Engineering Team, clicking ordinary Markdown files, switching to `architecture_reviewer`, and opening message references.

Six context screenshots are locally available under the current solution-designer run. The latest image shows a normal local Markdown file selected in Files while the panel remains on `Loading file content...` during an active team stream. The written report and live reproduction are authoritative; images are supporting context only.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-streaming-ui-performance`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-streaming-ui-performance/tickets/done/autobyteus-runtime-streaming-ui-performance`
- Current Branch: `codex/autobyteus-runtime-streaming-ui-performance`
- Current Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-streaming-ui-performance`
- Bootstrap Base: `origin/personal` at `d5618bffdd73d2b47f83e33852853a5d8886ccc2`
- Remote Refresh: `git fetch origin personal` succeeded on 2026-08-01.
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None
- Correction record: `/Users/normy/.autobyteus/server-data/temp_workspace/codex/apple-shopping-demo` is only the deliberate reproduction team's task workspace. The earlier accidental Apple-task engineering handoff was canceled, and the implementation engineer confirmed it made no changes.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Core Artifact(s) Supported | Related IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-streaming-ui-performance/tickets/done/autobyteus-runtime-streaming-ui-performance/performance-evidence.md` | Durable evidence summary for isolated and Electron-backed probes, UI timings, CPU/health, file persistence, logs, and source paths. | `requirements.md`, later `design-spec.md` | BEH-001..BEH-005, FR-01..FR-07, AC-01..AC-07 | Current | `N/A` — evidence only |

Raw JSONL probes under `probe-scratch/` are retained locally as investigation intermediates, not canonical supplements.

## Source Log

| Date | Source Type | Exact Source / Command | Why Consulted | Relevant Findings |
| --- | --- | --- | --- | --- |
| 2026-08-01 | User report/images | Current conversation and `.../software_engineering_team_96f09bad9be2477bbba1882c070d6957/.../context_files/ctx_04fbbd9fcbfe__image.png`, `ctx_b3247a5c056c__image.png`, plus four earlier context images | Establish symptoms and exact requested topology/journey | AutoByteus-only correlation; local Files, team references, member switching, and voice feedback are affected. |
| 2026-08-01 | Git/bootstrap | `git remote -v`; upstream/default resolution; `git fetch origin personal`; `git worktree add -b codex/autobyteus-runtime-streaming-ui-performance ... origin/personal` | Create isolated authoritative workspace | Dedicated worktree established from refreshed `origin/personal`. |
| 2026-08-01 | Required design doc | `.../solution-designer/skills/solution-designer/design-principles.md` | Shared design authority | Fix must place cadence at a governing owner, not scatter timers through views. |
| 2026-08-01 | Isolated runtime setup | `pnpm install --frozen-lockfile`; development DB initialization; `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:.../development.db` with explicit TTY confirmation | Safe early reproduction without production-memory copy | Provider config imported; no production memory copied. |
| 2026-08-01 | Isolated sustained stream | Native AutoByteus/DeepSeek Software Engineering Team prompted for one continuous ~4,000-word Markdown response; browser rAF/timer probe; process/health/file polling | Determine dominant process and write cadence | Renderer rose toward one core as text accumulated; backend stayed responsive; raw/snapshot files changed once at logical completion, not per delta. |
| 2026-08-01 | Exact requested topology | Worktree `autobyteus-web` on `127.0.0.1:3000` with all REST/WS endpoints bound to Electron server `127.0.0.1:29695`, production data root `/Users/normy/.autobyteus/server-data`, Temp Workspace `temp_ws_default` | Reproduce the user's exact path | Worktree frontend verified via `window.__NUXT__.config.public`; no separate dev backend was running. |
| 2026-08-01 | Exact test team | Team `software_engineering_team_ac1ca45270184f35bfc2ff7a207d8ebc`; AutoByteus runtime; model `deepseek-v4-flash`; Temp Workspace; concise approved Apple-card prototype prompt | Trigger normal SD→AR→implementation/review traffic and references | Multiple members streamed, generated team messages/references, and reproduced whole-app jank. |
| 2026-08-01 | System probe | `probe-scratch/electron-backend-exact-team-probe.jsonl`; 500 samples over 239.748 seconds; PIDs 30406 renderer, 24354 backend, 23753 packaged renderer; `/rest/health`; team memory stats | Separate frontend/backend and persistence activity | Worktree renderer mean 109.67% CPU; backend mean 5.61%; health p95 1.935 ms; memory files changed only 5–9 times per active member. |
| 2026-08-01 | Browser probe | In-page rAF, 50 ms timer, per-member revision/character sampler, and click-to-visible-content observers | Measure user-visible starvation | Intended 1-second samples often arrived 5–6 seconds apart; timer drift max 10.91 seconds; exact click latencies 7.90–52.27 seconds. |
| 2026-08-01 | Direct endpoint timing | Repeated `curl` and Python reads of `/rest/team-runs/:teamRunId/team-communication/messages/:messageId/references/:referenceId/content` | Compare UI loading with backend response | Same local bytes returned mostly in 0.5–1.7 ms; first/isolated outliers remained 3.2–12.3 ms, far below UI delay. |
| 2026-08-01 | Server log | `lsof -p 24354`; tail/grep of `/Users/normy/.autobyteus/server-data/logs/server.log`; 2-second size polling | Look for file-content errors or constant logging | No reference-content failure. Log was 220 MB total, grew ~4.4 KB in a 12-second tool-activity spot check, and contained repeated token-ledger idempotency warnings unrelated to local file latency. |
| 2026-08-01 | Termination/baseline | `agentTeamRun.terminateTeamRun(...)`, then CPU and Files/Team click probes | Confirm load dependence and restore user environment | Test team terminated successfully; renderer fell to 4.5–6.1%; UI interactions returned to 53–99 ms. |
| 2026-08-01 | Codex comparison team | Team `software_engineering_team_21f81d9055df4fb28659e73ac274049e`; Codex App Server; `gpt-5.6-luna`; medium reasoning; Temp Workspace; same intentionally minimal approved Vue Apple-card request | Measure the runtime comparison the user requested under the same Electron-backend topology | Renderer stayed at 11.48% mean CPU in the coordinator phase and 6.75% in the AR/implementation phase; ordinary file, panel, member, and reference interactions completed in 6.6–82.2 ms. |
| 2026-08-01 | Codex browser/event probe | In-page WebSocket envelope counter, 50 ms timer/rAF probe, per-member presentation revision and completed reasoning/text segment sampler; `probe-scratch/codex-luna-*.jsonl` and `codex-luna-comparison-summary.json` | Compare event cadence and presentation pressure with native DeepSeek | Across 445.677 seconds the Codex team emitted 173 `SEGMENT_CONTENT` envelopes (0.388/s, including tool-log content). Completed reasoning/text segments averaged 62.89–113.73 characters, versus native's 3.75–4.43 characters per presentation revision. Timer p95 was 51.2 ms and rAF p95 was 9.3 ms. |
| 2026-08-01 | Codex message-reference journey | Open Files and `README.md`; open Team; click five SD references; focus AR; click AR review references while later members executed | Re-run the exact slow interactions under Codex | Files/Team/member transitions were 32.5–40.7 ms; reference opens were 6.6–82.2 ms; every tested content view loaded successfully. |
| 2026-08-01 | Codex cleanup | `agentTeamRun.terminateTeamRun('software_engineering_team_21f81d9055df4fb28659e73ac274049e')` | Avoid leaving the deliberate comparison team active | Termination completed in 127.4 ms; team and all six members reported `offline`. |
| 2026-08-01 | Frontend sources | Paths listed under Relevant Files / Components | Map primary production spine | One tiny delta synchronously traverses transport → projection → witness → reactive feed → full Markdown parse/render. |
| 2026-08-01 | Backend sources | Memory stores and team-reference route/service listed below | Test user's raw-trace/snapshot/local-file hypotheses | Writes are synchronous but phase-boundary, not token-boundary; reference service uses `statSync`/`accessSync` and `createReadStream` and was fast in runtime evidence. |
| 2026-08-01 | Architecture review round 1 | `design-review-report.md`, `architecture-review-revision-record.md`, findings `AR-F-001`/`AR-F-002` | Validate SR-001 against preserved current behavior and reachable lifecycle paths | Shared scheduler ownership passed. Rework must carry the latest content-receipt time per pending context into `conversation.updatedAt` and must make Settings-card unmount invoke source-guarded store cancellation. |
| 2026-08-01 | Recency consumers | `AgentStreamingService.ts:240-252`; `teamStreamGenericMessageDispatcher.ts:35-45`; `stores/runHistoryTeamHelpers.ts:66-76`; `stores/runHistoryTeamRows.ts:167-189`; `stores/runHistoryReadModel.ts`; `utils/runTreeLiveStatusMerge.ts` | Trace the current content side effect reported by `AR-F-001` | Direct dispatch sets `conversation.updatedAt` for every content event; live agent/member/team recency derives from that value. The bounded replacement needs the last receipt time once per context batch without a per-delta presentation revision. |
| 2026-08-01 | Settings voice lifecycle | `VoiceInputExtensionCard.vue:263-293,524-534`; `voiceInputStore.ts:299-411,518-563`; `VoiceInputExtensionCard.spec.ts` | Trace the supported unmount path reported by `AR-F-002` | The settings card starts the `settings-test` operation but has no unmount callback. Store-owned generation invalidation requires a source-guarded caller; starting/recording should be canceled while an already-running transcription should continue. |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Trigger / Contract | Current Production Path And Lifecycle | Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | Native agent/team emits WebSocket messages | `TeamStreamingService.handleMessage` parses and synchronously resolves member → `dispatchGenericTeamMemberMessage` sets `conversation.updatedAt`, captures witness, appends `SEGMENT_CONTENT`, enforces the window, and commits a presentation revision → Vue feed/segment renderer → full accumulated Markdown model/render. The standalone dispatcher has the same timestamp-before-handler behavior. | Correct live bytes and content-driven run/member/team recency, but provider chunk cadence directly becomes presentation cadence and starves unrelated work. | Exact CPU/event probes; timestamp source and recency-consumer paths below |
| BEH-002 | User | Click ordinary workspace file or team communication reference | Files: tree selection → file content loader → `FileViewer`; Team reference: row click → `TeamCommunicationReferenceViewer.syncReferenceView` → type resolution → `authorizedFetch` → response text → `FileViewer` | Backend returns promptly; response processing/render waits behind stream work, so loading UI persists for seconds. | 53 ms idle versus 7.9–16.7 s active; 1–3 ms endpoint |
| BEH-003 | User | Click voice button | Composer or Settings test → `voiceInputStore.toggleRecording` → `startRecording` → initialize/enumerate/permission/getUserMedia/enumerate/AudioContext/worklet → only then `isRecording=true`. The composer calls cleanup on unmount; `VoiceInputExtensionCard` currently has only `onMounted` and no unmount cancellation. | No pending state exists during asynchronous startup; stream saturation delays click/paint further; leaving Settings during startup supplies no caller to invalidate the pending settings-test attempt. | Source lines, architecture-review MP-002, and user report |
| BEH-004 | System | AutoByteus versus Codex runtime | Both reach frontend stream projection but with runtime/provider-specific event cadence | Native measured 3.75–4.43 characters per presentation revision and pinned the renderer. Codex/Luna emitted coarse completed reasoning/text summaries averaging 62.89–113.73 characters, only 173 `SEGMENT_CONTENT` envelopes over 445.677 seconds, kept renderer phase means at 6.75–11.48%, and completed the same UI journey in 6.6–82.2 ms. | Exact native and Codex probes; `performance-evidence.md` |
| BEH-005 | System | Assistant/tool lifecycle completes | `MemoryManager.ingestAssistantResponse` stores complete response; `RunMemoryFileStore.add` appends raw trace; snapshot store performs atomic full rewrite | Durable memory updates at logical boundaries. | File-change polling and source inspection |

## Design Health Assessment Evidence

- Change posture: `Performance bug fix with bounded refactor`
- Root cause classification: `Boundary/ownership issue` in stream presentation cadence; `local implementation defect` for voice pending state.
- Refactor needed now: Yes. Cadence/backpressure has no governing owner, and component-level work inherits transport chunking.
- Backend refactor: Not needed for this behavior. Direct response/health measurements and sparse persistence changes disprove it as the freeze owner.
- Persisted data transition: `Directly Usable — No Migration`.

| Evidence | Observation | Design implication |
| --- | --- | --- |
| Renderer versus backend | Renderer 109.67% mean CPU; backend health p95 1.935 ms. | Fix frontend ingestion/presentation, not file endpoint or memory storage. |
| Hidden streaming member | Focused member idle while background reviewer streamed; renderer remained ~106–110%. | Presentation cadence must be governed before/view-independent of Markdown components. |
| Tiny deltas | 3.75–4.43 chars per presentation revision across four members. | Provider cadence cannot directly trigger complete reactive/presentation work. |
| Codex control | Completed Codex/Luna reasoning/text segments averaged 62.89–113.73 characters; the target team produced only 0.388 `SEGMENT_CONTENT` envelopes/s across the comparison window and stayed responsive. | The frontend defect is cadence-sensitive: Codex does not bypass the path, but its much coarser/lower-rate presentation input remains below the catastrophic amplification threshold. |
| Full-text witness | Witness values include `segment.content`, built before and after every generic event. | Coalesce content and commit presentation once per bounded batch; preserve semantic flush boundaries. |
| Full Markdown parse | `useMarkdownSegments` normalizes, parses, scans, highlights, sanitizes entire source on each reactive content change. | Reducing reactive content mutation frequency is required; avoid duplicate per-component debounce policies. |
| Voice awaits before state | `isRecording` set after media/worklet setup. | Store needs explicit synchronous starting state consumed by both UI surfaces. |
| Content activity timestamp | Both direct content dispatchers assign `new Date().toISOString()` to `conversation.updatedAt`; team rows and team last-activity resolution consume it. | Capture receipt time at the streaming facade, retain only the latest scalar per pending context, and apply it once per flush without coupling it to per-delta presentation revision. |
| Settings-test unmount | Settings card owns the supported start action but has no unmount callback; generation invalidation cannot run without a caller. | Add a source-guarded store cancellation action and invoke it on card unmount; cancel starting/recording, preserve active transcription, and never cancel a composer-owned operation. |

## Relevant Files / Components

| Path | Current Responsibility | Relevance / Concern |
| --- | --- | --- |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Team WebSocket parse, routing, member resolution, generic dispatch | Immediate per-message dispatch; natural team entry boundary for a shared cadence owner. |
| `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` | Single-agent WebSocket dispatch | Shares recent-event-monitor mutation behavior and must not retain the same native-delta amplification. |
| `autobyteus-web/services/agentStreaming/teamStreamGenericMessageDispatcher.ts` | Generic member event application | Builds witness before/after every event, including every tiny `SEGMENT_CONTENT`. |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | Segment lifecycle and delta append | Appends each delta directly to reactive accumulated strings. |
| `autobyteus-web/services/eventMonitor/recentEventMonitorMutationCommit.ts` | Witness capture, retention enforcement, revision marking | Two full presentation/witness builds per generic event. |
| `autobyteus-web/services/eventMonitor/recentEventMonitorWindow.ts` | Flattens, sorts, selects, and builds recent presentation | Repeated for witness and feed computation. |
| `autobyteus-web/services/eventMonitor/recentEventMonitorPresentationWitness.ts` | Presentation-change witness | Includes full current text/reasoning content. |
| `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` | Live feed and autoscroll | Rebuilds presentation and schedules scroll work on revision/update. |
| `autobyteus-web/components/conversation/AIMessage.vue` and `segments/TextSegment.vue` | Routes text/reasoning segments to Markdown | Reactive full accumulated content reaches renderer. |
| `autobyteus-web/composables/useMarkdownSegments.ts` | Markdown/math/file-action/image transformation and sanitization | Full-source work on every content change. |
| `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | DOM render and post-render scans | Deep watches segments and rescans DOM after changes. |
| `autobyteus-web/components/workspace/team/TeamCommunicationReferenceViewer.vue` | Reference type/content fetch and FileViewer projection | Correct loading state; long wait is downstream renderer starvation, not slow file service. |
| `autobyteus-web/stores/voiceInputStore.ts` | Media startup/capture/transcription state | Missing `isStarting`; recording state committed only after all awaits. |
| `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue` | Composer voice button/status | Only knows recording/transcribing; cannot show startup. |
| `autobyteus-web/components/settings/VoiceInputExtensionCard.vue` | Settings microphone-test trigger and feedback | Has `onMounted` initialization but no source-scoped unmount cancellation for a pending/recording settings test. |
| `autobyteus-web/stores/runHistoryTeamHelpers.ts`, `runHistoryTeamRows.ts`, `runHistoryReadModel.ts`, and `utils/runTreeLiveStatusMerge.ts` | Live run/member/team recency projection | Consume `conversation.updatedAt`; establish the preserved content-activity timestamp contract. |
| `autobyteus-server-ts/src/api/rest/team-communication.ts` | Reference content REST route | Fast in exact reproduction. |
| `autobyteus-server-ts/src/services/team-communication/team-communication-content-service.ts` | Reference validation/MIME/read stream | Synchronous stat/access but negligible measured latency. |
| `autobyteus-ts/src/memory/memory-manager.ts` | Complete assistant/tool memory ingestion | Assistant persistence occurs at complete response/phase boundary. |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | Raw-trace append | Synchronous append, but not per streamed delta. |
| `autobyteus-ts/src/memory/store/working-context-snapshot-store.ts` | Atomic snapshot write | Full synchronous rewrite at logical boundaries, not per token. |

## Runtime / Probe Findings

See `performance-evidence.md` for full tables. Material conclusions:

1. Exact worktree/Electron topology reproduced the user's failure without a separate dev backend.
2. During 240 seconds: renderer mean/p95/max CPU 109.67/115.0/160.3%; backend 5.61/15.6/54.2%; health mean/p95/max 1.408/1.935/18.341 ms, zero errors.
3. Active UI latencies: local Markdown 14.64 s; Team panel 13.85 s; focus architecture reviewer + Team 52.27 s; five references 7.90–16.70 s, with one imprecise timeout observation beyond 30 s.
4. Idle after termination: renderer 4.5–6.1%; Files panel 68.4 ms; ordinary Markdown 67.5 ms; Team panel 98.9 ms; same requirements reference 53.3 ms.
5. Direct reference reads remained mostly below 2 ms and always successful.
6. Raw trace/snapshot changes were 5–9 per active member over 240 seconds versus thousands of presentation revisions. Snapshot inode changed per atomic replacement; raw trace inode remained stable append-only.
7. The test team was terminated successfully (`offline`, unsubscribed) after evidence capture.
8. The exact Codex/Luna control used the same frontend, Electron backend, Temp Workspace, team definition, and minimal Apple-card journey. Coordinator-phase renderer CPU was mean/p95/max 11.48/22.9/41.5%; the AR/implementation phase was 6.75/13.9/47.7%; backend health p95 stayed 1.652–2.716 ms with zero errors.
9. Codex UI latency stayed interactive: Files 36.5 ms, ordinary `README.md` 40.7 ms, Team 39.9 ms, focus AR 32.5 ms, and eleven SD/AR references 6.6–82.2 ms.
10. Codex exposed completed/coarse reasoning summaries rather than provider-token-sized reasoning deltas. SD/AR/implementation reasoning-or-text segment averages were 102.89/113.73/62.89 characters, while the native run averaged 3.75–4.43 characters per presentation revision. This verifies why Codex does not reproduce the freeze while still traversing the shared frontend projection path.
11. The Codex comparison team was terminated after capture; the team and all members were `offline`.

## Findings From Logs

- Electron backend PID 24354 writes `/Users/normy/.autobyteus/server-data/logs/server.log` (about 220 MB at observation time).
- No `REFERENCE_*` resolution error or slow-file diagnostic appeared for the tested message/reference IDs.
- Team-message projection lines correctly recorded 5-reference and later 7-reference handoffs.
- Repeated Prisma `Unique constraint failed on the fields: (idempotency_key)` warnings occurred around token-usage ledger events. They can create log noise and should be tracked separately, but the backend stayed responsive and the log did not grow per content delta.
- The log size spot check stayed unchanged for the first six seconds and then grew from 220,515,029 to 220,519,458 bytes during tool activity; this does not match the continuous per-token renderer pressure.

## Reproduction / Environment Setup

### Isolated early reproduction

- Installed dependencies with `pnpm install --frozen-lockfile`.
- Initialized development DB under the task worktree.
- Imported only provider secrets from `/Users/normy/.autobyteus/server-data/.env` using the requested `pnpm secrets:import` flow; did not copy production memory.
- Started isolated backend/frontend, ran a native DeepSeek long-stream prompt, captured renderer/backend/health/file activity, then stopped the isolated stack.

### Exact requested reproduction

- Electron production backend: PID 24354, port 29695, data dir `/Users/normy/.autobyteus/server-data`.
- Worktree frontend: `pnpm --dir autobyteus-web dev --host 127.0.0.1 --port 3000` with REST and all WebSocket endpoints bound to port 29695.
- Browser tab: `http://127.0.0.1:3000/workspace` inside Electron Browser surface.
- Workspace: `temp_ws_default` / `/Users/normy/.autobyteus/server-data/temp_workspace`.
- Team: `software_engineering_team_ac1ca45270184f35bfc2ff7a207d8ebc`; runtime `autobyteus`; model `deepseek-v4-flash`; auto-execute tools enabled.
- Prompt: minimal one-page Vue Apple product cards and bag counter, no backend/routing/research/extra features, already approved, concise artifacts/handoff requested.
- Journey: ordinary Files Markdown click; SD Team message references; switch to AR; AR inbound/outbound references; repeated direct REST reads; then terminate team and repeat idle interactions.
- Cleanup: native reproduction team terminated.

### Codex/Luna comparison reproduction

- Reused the same worktree frontend, Electron-started backend/data root, and Temp Workspace.
- Team: `software_engineering_team_21f81d9055df4fb28659e73ac274049e`; runtime `codex_app_server`; model `gpt-5.6-luna`; default medium reasoning; auto-execute tools enabled.
- Prompt: the same minimal one-page Vue Apple-card and bag-counter shape, requirements already approved, no backend/router/research/images/extra features, concise immediate handoff.
- Journey: open ordinary `README.md`; open SD Team handoff and five references; focus `architecture_reviewer`; open its outgoing review and three references while implementation began.
- Retained intermediates: `probe-scratch/codex-luna-system-probe.jsonl`, `codex-luna-architecture-probe.jsonl`, and `codex-luna-comparison-summary.json`.
- Cleanup: comparison team terminated; team and all six members reported `offline`. The extra worktree frontend was stopped after evidence capture; the user's Electron backend/application remained running.

## External / Public Source Findings

None required. Local source and runtime behavior are authoritative for this product-specific defect.

## Persisted Data Transition Evidence

- Stored subject: existing raw traces, snapshots, team metadata, communications, run history, and artifacts.
- Representative store behavior: raw traces append; snapshots/metadata use atomic temp-write/rename; readers are unchanged.
- Required outcome: `Directly Usable — No Migration`.
- Preservation invariant: no schema or historical-data rewrite; final projected stream content remains exact.
- Operational risk: buffering only frontend presentation must not become a new persistence boundary or alter backend memory ingestion.

## Constraints / Dependencies / Compatibility Facts

- Native provider event cadence may remain fine-grained.
- Team task-agent/team routing and member identity are more complex than a single conversation; buffered content must remain scoped to exact target/member/segment identity.
- Semantic events can arrive immediately after content; earlier content must flush before the semantic event.
- Content receipt advances `conversation.updatedAt`; a bounded batch must preserve the latest receipt time independently for each standalone/team member context, without restoring per-delta revisions.
- Existing historical hydration and completed-message Markdown rendering should not be throttled unnecessarily.
- Actual microphone automation depends on host permissions/devices; store/UI state can be tested deterministically.
- A voice consumer may unmount while its supported startup is awaiting permission/devices/media. Cancellation must be source-guarded so Settings cannot cancel Composer (or vice versa); starting/recording resources are disposable, while an already-started transcription is allowed to complete.

## Open Unknowns / Risks

- Verify the selected runtime-agnostic cadence/flush policy during implementation and Electron-backed validation; do not hard-code separate delays by runtime or component.
- The Codex comparison is workload-shaped rather than identical-token-output-shaped because different runtimes/models cannot be forced to produce byte-identical internal reasoning. The measured cadence and responsiveness contrast is nevertheless direct and sufficient to explain the user-visible runtime difference.
- Decide whether a separate operational ticket should cover server-log rotation and token-ledger idempotency warnings.
- Preserve pending content on disconnect/termination without generating late updates into a disposed context.

## Notes For Architecture Reviewer

SR-002 is ready for architecture review round 2. In addition to the already-passed shared runtime-agnostic scheduler, exact identity, semantic flush, clean-cut removal, known commit, voice generation owner, and no-migration decisions, it resolves `AR-F-001` by carrying the latest content receipt/activity time per pending context and resolves `AR-F-002` by assigning source-guarded Settings-card unmount cancellation to the voice store.
