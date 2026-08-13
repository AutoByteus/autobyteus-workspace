# Performance Evidence — AutoByteus Runtime Streaming UI Performance

## Purpose And Status

- Type: Evidence-only supplemental artifact
- Status: Current as of 2026-08-01
- Approval applicability: `N/A`
- Supports: `requirements.md`, `investigation-notes.md`, and the future `design-spec.md`
- Raw intermediates: `probe-scratch/*.jsonl` (local investigation evidence, not authoritative on their own)

## Exact Requested Topology

| Layer | Exact configuration |
| --- | --- |
| Desktop host | Running `/Applications/AutoByteus.app` |
| Backend | Electron-started PID 24354, `http://127.0.0.1:29695`, data dir `/Users/normy/.autobyteus/server-data` |
| Frontend under test | Task-worktree Nuxt dev frontend on `http://127.0.0.1:3000`; all REST/WS endpoints verified bound to port 29695 |
| Workspace | `temp_ws_default`, `/Users/normy/.autobyteus/server-data/temp_workspace` |
| Team | `software_engineering_team_ac1ca45270184f35bfc2ff7a207d8ebc` |
| Runtime/model | `autobyteus` / `deepseek-v4-flash` |
| Renderer PID | 30406 (the Electron Browser tab hosting the worktree frontend) |
| Test journey | Simple approved SD task → SD handoff → AR review/handoff → implementation/review; ordinary Files click; Team/member switching; every available message reference |

The deliberately created team was terminated after evidence capture. Final observed local state: `offline`, unsubscribed.

## 240-Second System Probe

Source: `probe-scratch/electron-backend-exact-team-probe.jsonl`, 500 samples over 239.748 seconds.

### Process CPU

| Process | Mean | Median | p95 | Max |
| --- | ---: | ---: | ---: | ---: |
| Worktree frontend renderer PID 30406 | 109.67% | 108.5% | 115.0% | 160.3% |
| Electron backend PID 24354 | 5.61% | 4.0% | 15.6% | 54.2% |
| Packaged/background renderer PID 23753 | 18.32% | 16.3% | 33.0% | 72.1% |

The worktree renderer remained near or above a full CPU core. The backend had short logical-phase spikes but was not saturated.

### Electron Backend Health

| Samples | Errors | Mean | Median | p95 | Max |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 500 | 0 | 1.408 ms | 1.267 ms | 1.935 ms | 18.341 ms |

## Browser Responsiveness Probe

The in-page probe tracked rAF gaps above 20 ms, drift of a 50 ms interval, per-member presentation revision/character counts, and click-to-visible-content transitions.

- Over approximately 751 seconds it observed 5,516 frame gaps above 20 ms.
- The largest recorded rAF gap was 57.37 seconds during an extremely delayed member/panel transition.
- It observed 182 timer drifts above 10 ms; maximum drift was 10.91 seconds.
- A nominal one-second sample callback commonly arrived 5–6 seconds late while the stream was active.
- The renderer stayed around 106–110% while the focused `implementation_engineer` was idle and the hidden `code_reviewer` streamed, showing that stream projection/witness work is material even without focused live Markdown.

## Stream Granularity

Snapshot late in the live run:

| Member | Presentation revisions | Accumulated segment characters | Characters per revision |
| --- | ---: | ---: | ---: |
| solution_designer | 15,006 | 64,274 | 4.28 |
| architecture_reviewer | 5,397 | 23,896 | 4.43 |
| implementation_engineer | 9,061 | 36,554 | 4.03 |
| code_reviewer | 1,283 | 4,812 | 3.75 |

These ratios confirm that native content arrived as extremely small presentation mutations.

## Codex/Luna Control Run

The user requested an exact Codex-runtime comparison. The control reused the same worktree frontend, Electron-started backend/data root, Temp Workspace, Software Engineering Team definition, minimal approved Vue Apple-card request, Files journey, team-member switching, and message-reference journey.

| Setting | Value |
| --- | --- |
| Team | `software_engineering_team_21f81d9055df4fb28659e73ac274049e` |
| Runtime/model | `codex_app_server` / `gpt-5.6-luna` |
| Reasoning / tools | Medium reasoning; auto-execute enabled |
| Target observation | 445.677 s, SD → AR → implementation |
| Cleanup | Team and all six members terminated to `offline` |

### Codex Process And Health Probes

Coordinator phase source: `probe-scratch/codex-luna-system-probe.jsonl`, 208 post-start samples over 98.53 seconds.

| Process / endpoint | Mean | Median | p95 | Max |
| --- | ---: | ---: | ---: | ---: |
| Worktree renderer CPU | 11.48% | 9.7% | 22.9% | 41.5% |
| Electron backend CPU | 1.86% | 1.3% | 5.5% | 20.1% |
| `/rest/health` | 1.222 ms | 1.129 ms | 1.652 ms | 5.944 ms |

Architecture/implementation source: `probe-scratch/codex-luna-architecture-probe.jsonl`, 188 samples over 89.56 seconds.

| Process / endpoint | Mean | Median | p95 | Max |
| --- | ---: | ---: | ---: | ---: |
| Worktree renderer CPU | 6.75% | 5.0% | 13.9% | 47.7% |
| Electron backend CPU | 1.91% | 1.0% | 6.2% | 41.6% |
| `/rest/health` | 1.548 ms | 1.215 ms | 2.716 ms | 23.612 ms |

Both health probes had zero errors. In contrast, the native comparison renderer averaged 109.67% CPU with p95 115.0%.

### Codex Stream Shape

- The target Codex team emitted 173 `SEGMENT_CONTENT` WebSocket envelopes over 445.677 seconds, or 0.388/s. This envelope count includes all segment kinds, including tool-log content.
- Sampled implementation reasoning deltas were 39 and 46 characters and represented completed reasoning summaries.
- The projected conversation state contained the following completed reasoning/text segments at the final comparison snapshot:

| Member | Presentation revisions | Reasoning/text segments | Characters | Characters per segment |
| --- | ---: | ---: | ---: | ---: |
| solution_designer | 114 | 9 | 926 | 102.89 |
| architecture_reviewer | 82 | 11 | 1,251 | 113.73 |
| implementation_engineer | 31 | 9 | 566 | 62.89 |

Native DeepSeek directly exposed token-sized reasoning/content updates at 3.75–4.43 accumulated characters per presentation revision. Codex App Server instead projected much coarser completed reasoning summaries and far fewer content envelopes. Both use the shared frontend projection path, but only the native event shape crossed the renderer-amplification threshold.

### Codex Browser And Interaction Results

Across the full Codex observation, the 50 ms timer had p95 51.2 ms and rAF gaps had p95 9.3 ms. Maxima were 426.9 ms and 118.6 ms respectively and included intentional panel/member/reference automation.

| Interaction | Click/action to usable visible result |
| --- | ---: |
| Open Files tab | 36.5 ms |
| Ordinary local `README.md` | 40.7 ms |
| Open Team tab | 39.9 ms |
| Focus `architecture_reviewer` | 32.5 ms |
| SD `requirements-doc.md` | 82.2 ms |
| SD `investigation-notes.md` | 47.7 ms |
| SD `design-spec.md` | 14.9 ms |
| SD `solution-revision-record.md` | 6.6 ms |
| SD `App.vue` | 65.9 ms |
| AR `design-review-report.md` | 64.1 ms |
| AR `architecture-review-revision-record.md` | 16.6 ms |
| AR `requirements-doc.md` | 12.2 ms |

Every tested file/reference loaded successfully. This directly validates the user's observation that Codex feels normal and attributes the difference to stream cadence/shape rather than a different local-file endpoint.

## User-Visible Timing

### Active native stream

| Interaction | Click/action to usable visible result |
| --- | ---: |
| Ordinary Files-panel `README.md` | 14.64 s |
| Open Team panel and initial SD reference rows | 13.85 s |
| Focus `architecture_reviewer` and open Team messages | 52.27 s |
| SD `requirements-doc.md` reference | 16.70 s |
| SD `investigation-notes.md` reference | 13.36 s |
| SD `design-spec.md` reference | 14.26 s |
| AR `design-review-report.md` reference | 14.01 s |
| AR `architecture-review-revision-record.md` reference | 7.90 s |
| One UI/UX reference observation | Remained visibly loading beyond a 30 s measurement window; the timeout callback itself fired at 35.41 s. This row is qualitative because the first probe's loading-text predicate also matched document prose. |

### Idle baseline after terminating the test team

| Interaction | Latency |
| --- | ---: |
| Open Files panel | 68.4 ms |
| Ordinary local `article.md` | 67.5 ms |
| Focus AR and open Team panel | 98.9 ms |
| Same `requirements-doc.md` reference | 53.3 ms |
| Renderer CPU (five samples) | 4.5–6.1% |
| Backend CPU (five samples) | 0.7–1.8% |

The same reference was roughly 313 times slower during the active stream (16.70 s versus 53.3 ms).

## Direct Local Reference Endpoint

Route:

`GET /rest/team-runs/:teamRunId/team-communication/messages/:messageId/references/:referenceId/content`

- Ten repeated `curl` requests for the 8,640-byte `requirements-doc.md` returned HTTP 200 in 0.986–3.188 ms total.
- Three reads of every reference then present in the team communication projection returned HTTP 200.
- Most direct reads were 0.5–1.7 ms; isolated cold/first requests reached 10.5–12.3 ms.
- Tested sizes ranged from 4,012 to 21,967 bytes.

Therefore local disk/endpoint retrieval is three to four orders of magnitude faster than click-to-visible-content under stream load.

## Backend Persistence Write Cadence

Observed changes during the 240-second exact probe:

| File | Observed changes | Size delta | Inode changes | Interpretation |
| --- | ---: | ---: | ---: | --- |
| SD `raw_traces_active.jsonl` | 5 | +55,713 B | 0 | Append at logical phases |
| SD `working_context_snapshot.json` | 5 | +56,717 B | 5 | Atomic snapshot replacement |
| AR raw trace / snapshot | 9 / 9 | +167,160 / +187,001 B | 0 / 9 | Logical assistant/tool phases |
| Implementation raw trace / snapshot | 9 / 9 | +161,735 / +178,076 B | 0 / 9 | Logical assistant/tool phases |
| `team_communication_messages.json` | 1 | +5,456 B | 1 | One projected handoff in window |
| `team_run_metadata.json` | 87 | +106 B | 87 | Frequent atomic status/metadata updates, but small and backend remained responsive |

These counts are incompatible with the hypothesis that raw trace or working-context snapshot files are rewritten once per streamed token. The frontend processed thousands of presentation revisions between a handful of memory writes.

## Server Log Review

- Backend PID 24354 held `/Users/normy/.autobyteus/server-data/logs/server.log` open for writing.
- File size at inspection was about 220 MB.
- During a 12-second size spot check it remained unchanged for six seconds and then grew by 4,429 bytes around tool events.
- No tested reference-content failure appeared.
- Repeated Prisma token-ledger `idempotency_key` uniqueness warnings were present and deserve separate operational follow-up.
- Log write cadence and backend latency do not match the continuous renderer saturation; server logging is not the primary freeze owner.

## Source-Path Evidence

### Frontend amplification spine

1. `autobyteus-web/services/agentStreaming/TeamStreamingService.ts:223-230,439-496` — parse, resolve, and synchronously dispatch every team WebSocket message.
2. `autobyteus-web/services/agentStreaming/teamStreamGenericMessageDispatcher.ts:35-122` — capture full presentation witness before and after every generic member event.
3. `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts:173-194,286-320` — append each tiny delta to accumulated reactive segment strings.
4. `autobyteus-web/services/eventMonitor/recentEventMonitorMutationCommit.ts:18-40` — build presentation/witness twice and bump revision when changed.
5. `autobyteus-web/services/eventMonitor/recentEventMonitorWindow.ts:68-201` — flatten/select/build recent presentation repeatedly.
6. `autobyteus-web/services/eventMonitor/recentEventMonitorPresentationWitness.ts:62-67,93-159` — include complete text/reasoning content in comparison values.
7. `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue:27-47,157-176,450-504` — reactive feed computation, update hook, and revision-driven scroll work.
8. `autobyteus-web/composables/useMarkdownSegments.ts:137-411` — normalize and fully parse/render/highlight/scan/sanitize accumulated Markdown.
9. `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue:43-58,84-111,156-161` — reactive render model plus deep post-render watch/DOM scan.

### Voice startup path

1. `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue:23-67,110-133,318-324` — only recording/transcribing visible states.
2. `autobyteus-web/stores/voiceInputStore.ts:299-395` — initialization, device checks, media acquisition, AudioContext, and worklet all finish before `isRecording = true`.

### Backend paths ruled out as primary owner

1. `autobyteus-server-ts/src/api/rest/team-communication.ts:30-49` — direct reference route.
2. `autobyteus-server-ts/src/services/team-communication/team-communication-content-service.ts:42-125` — validate local path/readability and return `createReadStream`.
3. `autobyteus-ts/src/memory/memory-manager.ts:389-408` — persist complete assistant response at phase boundary.
4. `autobyteus-ts/src/memory/store/run-memory-file-store.ts:121-126` — synchronous raw-trace append.
5. `autobyteus-ts/src/memory/store/working-context-snapshot-store.ts:33-38` — synchronous atomic snapshot rewrite.

## Evidence Limitations

- The Codex control matches the product journey and topology but cannot produce byte-identical internal reasoning/output to a different runtime/model. Its event shape and UI responsiveness were measured directly rather than inferred.
- Actual microphone startup was not automated during the saturated run because it can prompt for permissions and affect the user's audio device. The missing pending state is source-confirmed and the general main-thread starvation is directly measured.
- The largest browser frame-gap statistic includes the extremely delayed programmatic member/panel transition; the individual click tables are the more interpretable interaction evidence.
