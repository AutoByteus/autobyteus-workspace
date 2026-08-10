# Investigation Notes — Background Agent Renderer Contention

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Complete; approved design input`
- Investigation Goal: Reproduce and causally isolate foreground microphone, attachment, file, and panel delays while an unfocused agent streams on the current released baseline.
- Scope Classification: `Medium–Large`
- Scope Summary: The supported cause is synchronous per-frame frontend projection work amplified across the complete workspace/team navigation tree, with redundant UI status frames as avoidable upstream pressure. Focused Markdown, backend health, and WebSocket transport alone are not the primary explanation.
- Remaining Upstream Step: None; design production is authorized.

## Request Context

After server content cadence and progressive-rich-Markdown work was merged and released, the user returned to a separate symptom: while another agent was working, an idle selected conversation could remain in “Starting microphone…”, context-image paste/upload was slow, and opening another file or panel felt blocked. The user explicitly authorized source tracing, purpose-built tests, live browser/runtime probing, and later Electron validation rather than accepting code inspection alone. On 2026-08-09 the user approved one shared standalone/team presentation-egress pipeline, asked that the status transition concern remain separate from raw egress, and required future bounded outbound controls to be easy to add.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention`
- Current Branch: `codex/background-agent-renderer-contention`
- Current Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention`
- Bootstrap Base: refreshed `origin/personal`
- Base Commit: `7f0fc49965950d9689726a048371f2e2b78eef31`
- Baseline Release: `v1.4.45`
- Expected Finalization Target: `personal`
- Refresh Result: `git fetch origin personal --prune` succeeded at bootstrap. During ARCH-REV-002/003, task `HEAD` remained `7f0fc499...` while `origin/personal` first advanced by 11 commits to `c6d18abfc...`. Before the SR-004 handoff, the tracked ref advanced two documentation/evidence-only finalization commits to `3edb88bc6f7e15d074474f51c870a13d69d5d7b7` (`0 13` divergence). The cumulative diff contains media-generation recovery, agent-memory/runtime support, one predefined-setting entry, related docs/tests, and a completed ticket; the newest two commits only update archived delivery artifacts and add an Electron build log. None of the scoped egress, stream/Event Monitor, task projection/resolver, run-history navigation, or workspace-history source changed. Delivery remains responsible for final refresh.
- Bootstrap Blockers: None.

## Supplemental Task Artifact Inventory

| Absolute Path | Purpose | Scope / Status | Approval Applicability | Related IDs |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/performance-evidence.md` | Canonical summary of prior/current live evidence, exact dispatcher and projection probes, focused benchmark, cause classification, and limitations. | Evidence-only; current | `N/A` | BEH-001–BEH-008, FR-001–FR-006, AC-001–AC-009 |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/probe-evidence/` | Concise retained raw outputs for independent inspection. | Evidence directory; current | `N/A` | FR-006 / AC-009 |

## Source Log

| Date | Source Type | Exact Source / Command | Why Consulted | Relevant Finding |
| --- | --- | --- | --- | --- |
| 2026-08-08 | Command | `git fetch origin personal --prune`; `git rev-parse origin/personal`; `git rev-list --left-right --count personal...origin/personal` | Establish current authoritative base | `origin/personal=7f0fc499...`; local and remote matched |
| 2026-08-08 | Setup | `git worktree add -b codex/background-agent-renderer-contention ... origin/personal` | Isolate task | Dedicated ticket worktree created |
| 2026-08-08 | Shared design authority | `solution-designer/skills/solution-designer/design-principles.md` | Apply production-reachability, spine, and ownership rules | Required supported-path evidence before selecting worker/focus/cadence mechanisms |
| 2026-08-08 | User evidence | Three original screenshots listed below | Verify reachable UI states | Idle selected member can show prolonged Starting; context images are present/eventually attached |
| 2026-08-08 | Prior ticket evidence | `tickets/done/autobyteus-runtime-streaming-ui-performance/performance-evidence.md` | Reuse exact severe reproduction | Hidden native stream saturated renderer and delayed unrelated UI 14–52 s while backend stayed healthy |
| 2026-08-08 | Prior follow-up evidence | `tickets/done/runtime-streaming-performance-followup/performance-evidence.md` | Establish released cadence/status topology | v1.4.45 shapes content at 500 ms, but routine `running` remains immediate and client-visible |
| 2026-08-08 | Source | `autobyteus-web/services/agentStreaming/AgentStreamingService.ts:309-430` | Trace standalone dispatch | Every generic message brackets handler with Event Monitor transaction and mutates `conversation.updatedAt` |
| 2026-08-08 | Source | `autobyteus-web/services/agentStreaming/teamStreamGenericMessageDispatcher.ts:35-122` | Trace team member dispatch | Same unconditional transaction/timestamp for every team member message |
| 2026-08-08 | Source | `autobyteus-web/services/eventMonitor/recentEventMonitorMutationCommit.ts:18-49`; `recentEventMonitorWindow.ts:68-201`; `recentEventMonitorPresentationWitness.ts` | Trace per-frame Event Monitor work | Before witness + retention flatten/select + after witness occur even for non-presentation events |
| 2026-08-08 | Source | `autobyteus-web/stores/runHistoryStore.ts:433-454`; `runHistoryReadModel.ts:180-330`; `runHistoryTeamHelpers.ts:82-169`; `runHistoryTeamRows.ts:106-165` | Trace navigation dependency | Each getter builds fresh all-run/all-team/member projection and reads live timestamps/status |
| 2026-08-08 | Source | `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue:67-82,166-170`; `useWorkspaceHistoryTreeState.ts:38-89,399-425`; `WorkspaceHistoryWorkspaceSection.vue:422-444` | Trace render fan-out | Parent invokes filtered all-team build per workspace; reveal invokes another; children receive fresh arrays and rebuild display rows |
| 2026-08-08 | Source | `autobyteus-web/services/runRecovery/activeRunRecoveryCoordinator.ts:34-44,79-137`; `agentRunStore.ts:248-287`; `agentTeamRunStore.ts:132-171` | Determine focus/subscription semantics | Every active history run/team reconnects on recovery; stream receipt is intentionally independent of selection |
| 2026-08-08 | Source | `autobyteus-server-ts/src/agent-execution/events/processors/lifecycle-status/lifecycle-status-event-transformer.ts:22-74`; `agent-stream-websocket-egress-policy.ts:15-29`; `agent-stream-websocket-egress.ts:20-102` | Trace status creation and UI egress | Canonical pipeline emits status before non-terminal events; egress sends repeated `running` without flush or dedup |
| 2026-08-09 | Git history + prior accepted ticket | `git show b1e96b73f`; `tickets/done/agent-stream-driven-status/{requirements.md,investigation-notes.md,design-spec.md}` | Determine why transition-oriented status delivery was replaced | The 2026-08-02 lifecycle centralization intentionally replaced sparse/transition-oriented outward status with one canonical companion per final non-status event so current-turn activity could self-heal stale frontend state, terminal ordering stayed explicit, and late retired-turn output carried the actual lifecycle. `REQ-003` explicitly allowed and expected unchanged repetitions; this was a correctness decision, not an accidental removal. |
| 2026-08-09 | Source + user direction | `agent-stream-handler.ts:128-151`; `agent-team-stream-handler.ts:117-145,278-327`; shared `AgentStreamWebSocketEgress` | Verify standalone/team reuse and locate future control composition | Both handlers instantiate the same per-session egress. Team events are identity-enriched before `egress.send`; one team socket multiplexes many exact member/task identities. User approved one shared pipeline and rejected separate agent/team implementations. |
| 2026-08-08 | Source | `agent-team-stream-handler.ts:98-149,275-327`; `team-run-event-websocket-message-mapper.ts:84-127`; `team-stream-agent-identity-payload.ts` | Verify per-connection/identity boundary | Shared egress is created per connection; team payload has exact member/source/task identity before egress |
| 2026-08-08 | Source | `AgentUserInputTextArea.vue:23-74,118-146,335-341`; `voiceInputStore.ts:233-372` | Phase microphone path | `isStarting=true` precedes first await; delay shown in screenshot is after click handler and before completed initialize/device/media/context/worklet setup |
| 2026-08-08 | Source | `ContextFilePathInputArea.vue:323-407`; `useContextAttachmentComposer.ts:246-285`; `contextFileUploadStore.ts:48-74` | Phase paste/upload path | Paste handler creates reactive placeholder/blob URL before awaiting HTTP upload; placeholder latency isolates main-thread scheduling |
| 2026-08-08 | Runtime | Installed process/health sampler retained as `probe-evidence/current-v145-process-samples.tsv` | Compare renderer/backend on current release | Renderer remained bursty; backend health stayed below 2.5 ms in all 30 samples |
| 2026-08-08 | Runtime | Current Nuxt source on port 3001, real backend 29695, Playwright/Chrome real-stream probe | Observe supported current path without modifying server | Background team connection delivered status/content/tool frames; sparse window had occasional 68–162 ms long tasks |
| 2026-08-08 | Runtime | `BG-PROJECTION-LIVE-001`, retained `probe-evidence/background-projection-live.json` | Isolate reactive timestamp/navigation dependency | 40 timestamp mutations/s caused 7,128 all-team projections and 833.7 ms helper time; equal-status-only assignment did not |
| 2026-08-08 | Runtime | Temporary probe plugin + `BG-EXACT-DISPATCH-LIVE-001`, retained `probe-evidence/exact-dispatch-live.json` | Execute exact production dispatcher in actual current UI | Each redundant status caused exactly 27 all-team builds for 26 workspaces; 20-run aggregate case raised tab p95 65→120 ms |
| 2026-08-08 | Test | Disposable Vitest `backgroundContention.probe.spec.ts`, log retained as `probe-evidence/current-v145-microbenchmark.log` | Lower-bound suspected owner costs | Status handler alone 0.00175 ms; current Event Monitor transaction 0.55239 ms; 28 team projections 8.08265 ms |
| 2026-08-08 | Cleanup | Removed temporary Nuxt plugin/test, stopped Nuxt server, removed dependency symlinks | Leave only durable artifacts/evidence | Production and durable test source returned to baseline |
| 2026-08-09 | Architecture review + source | `design-review-report.md` ARCH-001; `TeamStreamingService.ts:348-420`; `teamTaskExecutionEventRouter.ts`; `teamTaskAgentContextProjection.ts:401-475`; `teamTaskTeamExecutionProjection.ts:144-260`; `teamTaskTeamChildProjection.ts:297-370` | Trace every supported live task projection writer omitted from SR-001 | Ordinary task delegation and task-team-scoped events create, update, and asynchronously remove task-agent/task-team nodes before generic projection. These mutations feed the same `memberTree`/maps as history navigation and therefore require an explicit topology-or-exact-presentation result routed once through run history. |
| 2026-08-09 | Architecture review + source | `design-review-report.md` ARCH-002; `agentContextsStore.ts:72-215`; `agentTeamContextsStore.ts:100-265`; `agentRunOpenCoordinator.ts`; `teamRunOpenCoordinator.ts`; `runContextHydrationService.ts:175-190`; `teamRunContextHydrationService.ts:432-535`; `runHistoryTeamMemberProjectionHydrator.ts:158-210`; `teamRunMemberStatusHydration.ts:49-65` | Trace every creation, reuse, replacement, and activity-hydration owner for the proposed cached final Event Monitor witness | The final witness combines conversation and compaction activity state, while supported open/recovery paths establish those inputs in separate steps. Cache reset must precede wholesale replacement/removal; prime must follow the final activity write. `NONE` must remain scan-free when unprimed, while a real unprimed mutation must conservatively publish one final revision. |
| 2026-08-09 | Architecture re-review + source | `design-review-report.md` ARCH-REV-002 / ARCH-001; `utils/workspaceTeamExecutionDisplayRows.ts`; `utils/__tests__/workspaceTeamExecutionDisplayRows.spec.ts`; `WorkspaceHistoryWorkspaceSection.vue:407-510`; `workspaceHistorySectionContracts.ts`; `WorkspaceAgentRunsTreePanel.vue:126,155,331` | Trace the actual current transient task-row consumer omitted from SR-002 | The workspace section directly reads `getLiveTeamContext(...)` and rebuilds a combined stable/transient row list. The helper preserves live tree order/depth and exposes only row identity/path, kind, display name, visible agent status, and component-derived child structure. This is a production bypass of the proposed run-history projection and must move cleanly behind that owner. |
| 2026-08-09 | Source + tests | `stores/runHistoryTeamRows.ts:67-165`; `stores/runHistoryTeamHelpers.ts:82-169`; `stores/runHistoryTypes.ts:158-195`; `components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts`; `tests/e2e/fixtures/team-activity-presentation.page.vue` | Distinguish stable history rows from transient execution rows and enumerate dependent contracts/tests | `buildTeamRowsFromContext` intentionally filters transient task nodes. The combined workspace projection is a separate derived navigation shape, and current component/unit/E2E fixtures all depend on the live-context bypass. Stable and transient semantics must be combined once by run history, not by broadening the stable history tree. |
| 2026-08-09 | Source + tests | `components/workspace/team/TeamDelegatedTasksSection.vue`; `TeamDelegatedTaskNavigator.vue`; `TeamDelegatedTaskDetailPane.vue`; their specs; task projection files | Establish the owner of task detail fields | Description, references, arguments, execution timeline, and task-detail lifecycle/status are rendered by the existing right-pane delegated-task projection. Workspace transient rows intentionally exclude them; detail-only changes must not request a workspace-navigation patch. |
| 2026-08-09 | Source | `stores/runHistorySelectionActions.ts:63-117`; `stores/agentTeamContextsStore.ts:263-309`; production callers found by `rg 'setFocusedMember|focusMemberAndEnsureHydrated'` | Preserve focus after removing the component's live-context read | Manual focus currently mutates `AgentTeamContext` through several desktop/mobile callers, while task cleanup can replace focus directly. The target needs one coordinated focus action that updates source state and the indexed navigation focus exactly; task cleanup/topology rebuild carries fallback focus. |
| 2026-08-09 | Git comparison | `git rev-parse HEAD origin/personal`; `git rev-list --left-right --count HEAD...origin/personal`; `git diff --name-only 7f0fc499...origin/personal` | Revalidate current-state evidence after base advanced during review | Task HEAD is behind by 11; intervening commits do not touch any scoped source path. No rebase/merge is performed during solution design. |
| 2026-08-09 | Architecture re-review + source/test | `design-review-report.md` ARCH-REV-003 / ARCH-001 / ARCH-PREM-004; `TeamStreamingService.ts:378-424`; `teamStreamMemberContextResolver.ts:76-123`; `teamStreamMemberContextResolver.spec.ts`; `TeamStreamingService.spec.ts:1414-1530`; `teamTaskExecutionEventRouter.ts:128-168`; `teamTaskAgentContextProjection.ts:327-470` | Trace the one remaining ordinary task-agent topology mutation outside the SR-003 task result boundary | For a first ordinary identity-bearing task-agent `AGENT_STATUS` or content event, the task router returns `continue`; the later member resolver calls `ensureTaskAgentContext`, which can create/repair the leaf map, node map, and member tree after the task mutation accumulator saw no topology effect. The existing first-running-status service test proves this is supported. The resolver must become read-only and all exact task-agent ensure/repair must move into the task router's required mutation result. |
| 2026-08-09 | Git comparison | `git rev-parse HEAD origin/personal`; `git rev-list --left-right --count HEAD...origin/personal`; `git diff --name-status c6d18abfc...origin/personal` | Revalidate the tracked base immediately before SR-004 handoff | `origin/personal=4556d6e8d...`, 12 commits ahead. The one post-review commit only updates four `tickets/done/article-writing-image-generation-hang` delivery artifacts; scoped source remains unchanged. |
| 2026-08-09 | Git comparison | `git rev-parse origin/personal`; `git diff --name-status 4556d6e8d...origin/personal` | Capture one additional concurrent delivery finalization before handoff | `origin/personal=3edb88bc6...`, 13 commits ahead. Only the same archived ticket delivery records plus its Electron build log changed; scoped source remains unchanged. |

## Original User Evidence

1. `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_cca00c1c2ea04599ab3f980b587a9073/solution_designer_e6ce26223b504030ba054b039924f962/context_files/ctx_120305c219fa__image.png`
2. `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_cca00c1c2ea04599ab3f980b587a9073/solution_designer_e6ce26223b504030ba054b039924f962/context_files/ctx_abb9b84c2f38__image.png`
3. `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_cca00c1c2ea04599ab3f980b587a9073/solution_designer_e6ce26223b504030ba054b039924f962/context_files/ctx_e5286a84890f__image.png`

The first and third show “Starting microphone…” while the selected `solution_designer` is Idle. The second shows eventual Recording with a context image, supporting delay rather than a permanent failure. Screenshots establish the supported symptom, not the internal cause.

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Supported Trigger / Contract | Current Production Path | Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Click microphone in focused composer while background agent works | button click -> `toggleRecording` -> `isStarting=true` -> initialize -> enumerate/permission -> `getUserMedia` -> AudioContext/worklet -> `isRecording=true` | Starting proves click ran; remaining async callbacks still require renderer scheduling | Screenshots and source trace |
| BEH-002 | User | Paste image/file into focused Context Files | paste -> extract `File` -> type/key/blob URL -> reactive placeholder -> upload store -> REST -> final attachment commit | Placeholder exists before network await; late placeholder is renderer scheduling | Source trace |
| BEH-003 | System/User | History has active standalone/team runs independent of selection | history fetch -> recovery coordinator loops all active items -> hydrate/open without selection -> connect one stream per active run/team; live team task events create/remove transient contexts; a first ordinary task-agent status/content can also create/repair its context inside the later member resolver | Hidden runs remain exact/selectable and live task hierarchy changes continue while collapsed/unfocused. The ordinary resolver mutation is currently outside the task result boundary. | Source recovery/task-projection/resolver traces and first-running-status integration test |
| BEH-004 | System | Any generic standalone/team member message arrives | WebSocket `onmessage` -> parse -> dispatch -> begin witness -> timestamp -> handler -> retention/final witness -> reactive update | Work occurs whether affected transcript is focused | Exact dispatcher/runtime trace |
| BEH-005 | System | Dispatcher wraps message after contexts have been created/reused/replaced and conversation/activity hydration has completed through separate writers | context/open/hydration owner establishes conversation -> activity hydration establishes compaction inputs -> generic dispatcher builds recent presentation/witness -> handler -> flatten/select retention -> rebuild presentation/witness -> compare | Repeated status incurs full scan with no presentation change; a cached-final-witness replacement must cover the complete context lifecycle, not only message commit | Source + benchmark + hydration trace |
| BEH-006 | System/UI | Reactive timestamp/status or live task projection invalidates sidebar | tree computed -> repeated builders -> component stable/transient live-context builder; task router mutates live tree/maps; for ordinary task-agent messages the later member resolver can also call `ensureTaskAgentContext` | 26 workspaces produced 27 all-team projections per frame. SR-003 maps the component bypass, but a first ordinary task-agent event can still create source topology after the task result returned `NONE`, leaving an authoritative cached row absent. | Exact live probe + task-projection/helper/component/resolver trace |
| BEH-007 | System/Contract | Canonical non-terminal event passes lifecycle transformer | transformer emits `[AGENT_STATUS running, event]` -> mapper adds exact team identity -> per-connection WebSocket egress sends routine status immediately | Duplicate UI status preserved though canonical evidence already exists upstream | Source and real frame mix |
| BEH-008 | Contract | Shaped content reaches selected transcript | server coalesces same-identity content at configurable 500 ms default -> frontend applies event -> progressive Markdown renderer updates | Released UX contract works; one background cadence stayed near idle | v1.4.45 code/probe |
| BEH-009 | System/Maintainer | A bounded outbound UI control is added for standalone and team delivery | both handlers instantiate shared `AgentStreamWebSocketEgress`; its `send` method directly classifies, buffers/flushes, serializes, and sends | Shared reuse exists, but there is no explicit typed control composition seam; adding policy expands the coordinator | Source trace + approved user extensibility direction |

## Primary And Return Spines

### SPINE-01 — Background team event to reactive state

`TeamRun event -> team WebSocket mapper -> per-connection egress -> browser WebSocket -> parse -> TeamStreamingService routing -> task projection router -> ordinary task-agent ensure/repair may currently occur later in member resolver -> exact member context -> generic dispatcher -> handler -> reactive conversation/status/activity`

- Governing server boundary: the UI-facing WebSocket presentation path. `AgentStreamWebSocketEgress` is the current composition point; status transition policy should remain a distinct owned concern rather than being embedded into raw socket serialization.
- Governing frontend boundary: generic dispatch and handler ownership.
- Off-spine concerns: debug logging (disabled by default), browser-tool post-processing, and delegation-record refresh. Live task projection—including the ordinary identity-bearing task-agent ensure currently hidden in member resolution—is a supported branch of the main team spine because it can change navigation topology before generic dispatch.

### SPINE-02 — Reactive background state to global navigation

`context field mutation -> Vue dependency invalidation -> workspace panel render -> per-workspace getTeamNodes -> build all persisted/live teams/members -> filter -> WorkspaceHistoryWorkspaceSection reads live team context -> rebuild combined stable/transient execution rows`

- Current owner is ambiguous: `runHistoryStore` exposes uncached action-like builders while the component controls repeated invocation and separately reconstructs live execution rows.
- Stable `runHistoryTeamRows` deliberately excludes transient task nodes; `utils/workspaceTeamExecutionDisplayRows.ts` re-inserts them at component time using live tree order/depth, visible agent status, and focus from `AgentTeamContext`.
- The navigation read model is derived from conversation internals and a component live-context escape hatch instead of explicit topology, row-presentation, and focus effects.

### SPINE-03 — Foreground microphone return path

`click -> Starting state -> async media setup -> Recording state -> visible status/controls`

- Shared blocking resource: renderer main event loop before each async continuation and Vue commit.
- External/device time must be measured separately.

### SPINE-04 — Foreground attachment return path

`paste -> synchronous placeholder state -> visible uploading item -> REST completion -> final attachment state`

- Shared blocking resource before placeholder: renderer event loop/reactive render.
- Network belongs only to placeholder-to-ready phase.

### SPINE-05 — Live task projection to navigation hierarchy

`TASK_DELEGATION_EVENT, task-team-scoped event, or ordinary identity-bearing task-agent status/content -> TeamStreamingService -> task execution projection router -> create/repair/update/remove task-agent/task-team source nodes -> required actual task navigation mutation result -> run-history navigation boundary -> one stable-plus-transient topology refresh or one exact workspace-row patch -> read-only member resolution when still needed`

- Add/root/nested-child creation and terminal cleanup change topology.
- Only an actual workspace-row `displayName` or visible agent `currentStatus` change is presentation. Description, references, arguments, execution timeline, and task-detail lifecycle/status remain owned by the existing right-pane task projection and cause no navigation work when row fields are unchanged.
- The task router reports actual mutation; it does not call run history. `TeamStreamingService` commits that result once, and an asynchronous cleanup is its own single topology operation.
- The current `utils/workspaceTeamExecutionDisplayRows.ts` helper and component `getLiveTeamContext(...)` path are not target owners. Their stable/transient order, depth, kind, child, status, and focus semantics move behind the run-history projection; the component consumes completed cached rows.
- The current ordinary task-agent resolver path is also not a source-mutation owner. `teamStreamMemberContextResolver.ts` must resolve only existing contexts. Exact task-agent identity is projected before resolution by the task router, whose result always carries the strongest actual mutation through `TeamStreamingService`.

### SPINE-06 — Context hydration to final Event Monitor witness

`context create/attach/reuse or replacement -> reset before wholesale input replacement when applicable -> establish conversation -> establish compaction/activity projection -> prime final combined witness -> first stream/local effect commit`

- Prime is idempotent and does not increment presentation revision.
- Reset is idempotent and occurs before replacement, identity promotion, removal, or disposal.
- `NONE` remains zero-scan even while unprimed; the first real unprimed effect enforces only its declared retention work, captures the final witness once, and publishes one conservative revision.

## Relevant Files / Components

### Server UI projection

- `autobyteus-server-ts/src/services/agent-streaming/websocket-egress/agent-stream-websocket-egress.ts`
- `autobyteus-server-ts/src/services/agent-streaming/websocket-egress/agent-stream-websocket-egress-policy.ts`
- `autobyteus-server-ts/src/services/agent-streaming/websocket-egress/stream-content-coalescing.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`
- `autobyteus-server-ts/src/services/agent-streaming/team-run-event-websocket-message-mapper.ts`
- `autobyteus-server-ts/src/agent-execution/events/processors/lifecycle-status/lifecycle-status-event-transformer.ts` (preserved upstream owner, not suppression target)

### Frontend stream/Event Monitor

- `autobyteus-web/services/agentStreaming/AgentStreamingService.ts`
- `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`
- `autobyteus-web/services/agentStreaming/teamStreamGenericMessageDispatcher.ts`
- `autobyteus-web/services/agentStreaming/teamTaskExecutionEventRouter.ts`
- `autobyteus-web/services/agentStreaming/teamTaskAgentContextProjection.ts`
- `autobyteus-web/services/agentStreaming/teamTaskTeamExecutionProjection.ts`
- `autobyteus-web/services/agentStreaming/teamTaskTeamChildProjection.ts`
- `autobyteus-web/services/agentStreaming/teamStreamMemberContextResolver.ts`
- `autobyteus-web/services/agentStreaming/__tests__/teamStreamMemberContextResolver.spec.ts`
- `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts`
- `autobyteus-web/services/agentStreaming/__tests__/teamTaskExecutionEventRouter.spec.ts`
- `autobyteus-web/services/agentStreaming/handlers/*`
- `autobyteus-web/services/eventMonitor/recentEventMonitorMutationCommit.ts`
- `autobyteus-web/services/eventMonitor/recentEventMonitorWindow.ts`
- `autobyteus-web/services/eventMonitor/recentEventMonitorPresentationWitness.ts`
- `autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts`
- `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts`
- `autobyteus-web/services/runHydration/runContextHydrationService.ts`
- `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts`
- `autobyteus-web/services/runHydration/teamRunMemberStatusHydration.ts`
- `autobyteus-web/stores/agentContextsStore.ts`
- `autobyteus-web/stores/agentTeamContextsStore.ts`
- `autobyteus-web/stores/runHistoryTeamMemberProjectionHydrator.ts`

### Navigation projection

- `autobyteus-web/stores/runHistoryStore.ts`
- `autobyteus-web/stores/runHistoryReadModel.ts`
- `autobyteus-web/stores/runHistoryTeamHelpers.ts`
- `autobyteus-web/stores/runHistoryTeamRows.ts`
- `autobyteus-web/utils/workspaceTeamExecutionDisplayRows.ts` (current combined stable/transient builder; remove after semantics move under run history)
- `autobyteus-web/utils/__tests__/workspaceTeamExecutionDisplayRows.spec.ts` (relocate coverage under run history)
- `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`
- `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`
- `autobyteus-web/components/workspace/history/WorkspaceTransientExecutionRow.vue`
- `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts`
- `autobyteus-web/components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts`
- `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts`
- `autobyteus-web/stores/runHistorySelectionActions.ts`
- `autobyteus-web/tests/e2e/fixtures/team-activity-presentation.page.vue`

### Existing right-pane task-detail projection (preserved off navigation spine)

- `autobyteus-web/components/workspace/team/TeamDelegatedTasksSection.vue`
- `autobyteus-web/components/workspace/team/TeamDelegatedTaskNavigator.vue`
- `autobyteus-web/components/workspace/team/TeamDelegatedTaskDetailPane.vue`
- their existing unit/integration specs

### Foreground evidence paths

- `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue`
- `autobyteus-web/stores/voiceInputStore.ts`
- `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue`
- `autobyteus-web/composables/useContextAttachmentComposer.ts`
- `autobyteus-web/stores/contextFileUploadStore.ts`

## Runtime / Probe Findings

Full tables, limitations, and raw paths are in `performance-evidence.md`. Material conclusions:

1. Exact prior native reproduction proves a hidden stream can saturate the renderer and block unrelated UI while backend health remains normal.
2. Current v1.4.45 one-run/default-cadence behavior is near idle; scale comes from aggregate active runs and remaining companion events.
3. In the real current UI, every timestamp-bearing frame causes `workspaceCount + 1` complete all-team builds.
4. Exact redundant status frames perform about `0.66–0.76 ms` synchronous dispatch work and then trigger the navigation multiplier.
5. The controlled aggregate case degraded p95 interaction latency without any single >=50 ms long task; dense short tasks can starve user input.
6. Removing only the timestamp mutation from an already-equal status prevents the navigation fan-out, proving the causal dependency.

## Findings From Code / Docs / Data / Logs

### Confirmed root cause classification

- **Boundary/ownership:** conversation mutation and navigation presentation are implicitly coupled.
- **Duplicated/coarse coordination:** both dispatchers use blanket before/after witness transactions instead of exact effects.
- **Derived-layer amplification:** all-team navigation is rebuilt per workspace after every reactive activity change.
- **Presentation-owner bypass:** the workspace section independently rebuilds combined stable/transient rows and reads focus from live context, so a nominal navigation cache would neither be authoritative nor complete.
- **Hidden source mutation:** ordinary task-agent member resolution performs ensure/repair after the task result boundary, so a nominal authoritative cache can miss the first supported task row even after the component bypass is removed.
- **Upstream avoidable pressure:** UI egress forwards exact duplicate statuses even though internal canonical events must remain untouched.

### Why WebSocket itself is not blocking

WebSocket delivery callbacks execute on the renderer event loop, so enough callback work can delay input. The socket is not a separate blocking thread that should simply be “moved.” Current measurements attribute the cost to synchronous parsing/dispatch/witness/projection/reactive work after delivery. A worker could offload parsing, but would not remove global reactive invalidation or repeated tree construction.

### Why focus-only rendering is insufficient

Only the selected transcript performs rich visible rendering, but selection does not stop active stream subscription or shared store updates. The left workspace/team tree is global and reads every live context. Hidden content therefore remains capable of invalidating unrelated visible UI.

### Why server shaping remains useful but insufficient

The 500 ms content cadence reduced one native stream from about 31 content callbacks/s to about two. However each window can still include a redundant routine status, and multiple active runs aggregate. Server status transition filtering reduces callbacks, while frontend scoping is still required for content/tool/semantic events that must be delivered.

### Why the former transition-oriented status behavior was replaced

Before `b1e96b73f` (`feat: centralize agent run lifecycle status`, 2026-08-02), the lifecycle transformer emitted a derived status only when its tracked status differed from the last outward status in the processed batch. That sparse behavior participated in a real correctness defect: the frontend could retain stale lifecycle/interrupt state because activity, local events, reconnect snapshots, and provider-specific status evidence did not share one reliable authority.

The accepted `agent-stream-driven-status` ticket therefore made every final non-status `AgentRunEvent` carry one canonical status companion. Its `REQ-003` explicitly states that repeating an unchanged status is allowed and expected, because the companion repairs stale presentation and preserves current-versus-retired-turn meaning at the canonical subscriber boundary.

The safe performance correction is consequently layered rather than a rollback: retain every canonical companion for raw subscribers, traces, and non-WebSocket consumers; after exact team/member/task identity enrichment, let each UI WebSocket connection send its first status and every payload transition while suppressing only an exact repeat for the same identity. Reconnect creates a new egress state, so the current initial status is never suppressed.

This does not require the raw egress/serializer itself to become a lifecycle owner. The clean responsibility split is a dedicated identity-aware status-transition filter inside the WebSocket presentation subsystem, composed by the per-connection egress alongside the existing content coalescer. The filter owns only `last forwarded UI status by exact identity`; canonical lifecycle remains owned by `AgentRun`, and raw transport remains responsible only for delivery.

## External / Public Source Findings

None required. The cause and target boundaries are fully supported by local production source and runtime evidence. No external recommendation was used to substitute for product-path evidence.

## Reproduction / Environment Setup

- Current-source Nuxt was temporarily run at `http://127.0.0.1:3001` with its REST/WebSocket endpoints bound to the installed backend at `http://127.0.0.1:29695`.
- Chrome was driven through the repository's existing Playwright Core dependency.
- The real current Software Engineering Team run `software_engineering_team_cca00c1c2ea04599ab3f980b587a9073` was loaded; `architecture_reviewer` was focused and `solution_designer` was the active background member.
- A temporary client plugin exposed the real generic dispatcher only for the controlled exact-dispatch probe. It did not modify the server or persist synthetic messages and was removed afterward.
- A disposable Vitest spec measured current helpers and was removed afterward.
- Nuxt was stopped and both temporary dependency symlinks were removed. Only ticket artifacts and retained evidence remain untracked.

## Persisted Data Transition Evidence

- Current stored subjects: run history, conversations/traces, settings, and attachments.
- Proposed requirements affect per-connection UI egress and in-memory derived presentation/read-model work.
- Normal canonical publishers, persistence writers, and stored schemas need no change.
- Decision: `Directly Usable — No Migration`.
- Unacceptable loss: any content/status/tool/attachment/history corruption or missing semantic transition.

## Constraints / Compatibility Facts

- Existing WebSocket content message shape and 500 ms configurable cadence are released contracts.
- Status deduplication must occur after team identity enrichment and per connection, not inside the canonical lifecycle transformer.
- Background streams cannot be disconnected merely because they are unfocused.
- Event Monitor latest-100 behavior has extensive current coverage and must not be weakened.
- Navigation cache/index invalidation must include topology, history fetch, workspace changes, run/team add/remove, archive/delete/terminate, hydration, exact workspace-row status/display-name changes, coordinated focus, and bounded activity-summary changes.
- Stable run-history membership and transient execution-row presentation are distinct shapes: the stable member tree continues to filter transient tasks, while the run-history navigation projection owns the completed combined execution-row list.
- Task description, references, arguments, timeline, and task-detail status are not workspace-navigation fields and remain reactive only in their existing right-pane projection.
- Member resolution must be read-only. Every production task topology helper result must be captured by its projection router/lifecycle owner and committed or explicitly merged; a source mutation may not be hidden behind a context-returning resolver.

## Resolved Questions

- **Is focused Markdown the primary cause?** No; hidden-stream reproduction and exact current probes rule it out as necessary.
- **Is backend health/file I/O primary?** No; measured backend/direct read latency is orders of magnitude smaller.
- **Does one default-cadence background run cause the same severity?** No; the current one-run controlled case stays near idle.
- **Why does scale worsen?** Every delivered frame performs blanket per-context work and invalidates a navigation projection multiplied by workspace count.
- **Would a Web Worker alone fix it?** No; the proven cost is primarily reactive/projective after parse.
- **Should background sockets be stopped?** No; correctness requires active background state.
- **Why was status-on-change replaced?** The 2026-08-02 lifecycle correction deliberately introduced per-event canonical companions to self-heal stale lifecycle/interrupt presentation and preserve turn-aware ordering. The current ticket restores transition-only delivery only at the UI WebSocket projection, without weakening that canonical internal invariant.
- **Would transition filtering overload WebSocket egress?** It would if equality, identity, lifecycle, coalescing, and serialization were mixed into one class. The intended boundary instead composes a dedicated presentation filter with the egress; the filter owns only per-connection last-forwarded status state and does not become a lifecycle authority.
- **Do standalone and team streams need separate control pipelines?** No. They already share the same egress class. The target keeps one pipeline; standalone uses one status identity while team connections multiplex exact enriched member/task identities through the same control contract.
- **Can task hierarchy use the same exact-row path for every event?** No. Actual add/root/nested-child creation, reparenting, and cleanup alter identity/path/order/depth/child structure and require one topology refresh. Only an existing workspace row's `displayName` or visible agent `currentStatus` change uses an exact patch. Detail-only changes use the existing right-pane owner and return navigation `NONE`.
- **Can the component keep the current live-context builder beside the new cache?** No. That would preserve the component bypass and make cache correctness unverifiable. Combined stable/transient rows and exact focus must be published by run history; the helper, contract method, component computed, and fixtures move/remove cleanly.
- **Should member resolution return and merge a topology mutation instead?** Technically possible, but rejected. Identity-bearing task-agent ensure/repair is source projection, not lookup. Moving it into the existing task router keeps the resolver read-only, preserves one mutation-bearing facade, and avoids a second result-bearing source owner after routing.
- **When is a cached Event Monitor witness valid?** Only after both the context conversation and compaction/activity projection are final for the current attach/hydration transaction. Prime/reset must therefore be owned by concrete context/open/hydration paths, not inferred lazily by a per-message before scan.

## Remaining Risks For Design

- Conditional Event Monitor effects must be exhaustively mapped across tool, compaction, attachment echo, task projection, external/inter-agent, completion, interruption, error, and file-change handlers.
- Exact team/task identity for status dedup must reuse canonical enriched payload fields and reset per connection.
- Navigation activity semantics need a clear visible resolution; “now” must stay useful without token-frame invalidation.
- Task projection helpers must return actual topology/presentation mutation results consistently, including asynchronous terminal cleanup, so the navigation owner is committed exactly once per operation; `PRESENTATION` must be impossible for detail-only fields.
- Every supported focus writer must route through one coordinated source-focus plus exact navigation-focus operation after the component live-context read is removed; cleanup-induced focus fallback remains part of its topology commit.
- Every production call to a task topology helper must consume its returned mutation. First identity-bearing task-agent running/content, existing ensure, generic status projection, and offline cleanup need explicit one-build/patch coverage.
- Event Monitor prime/reset coverage must include temporary contexts, identity promotion, active reuse, historical lazy member hydration, live task contexts, and removal without priming between conversation and activity replacement.
- Actual Electron voice/device smoke evidence remains necessary downstream, after deterministic browser checks.

## Notes For Architecture Reviewer

The approved design must include:

- the complete event-effect decision table;
- exact status identity/dedup lifecycle;
- cached/indexed navigation ownership and invalidation rules;
- removal of unconditional timestamp/witness flow;
- standalone/team parity;
- deterministic count/latency validation and Electron follow-up.
- one shared agent/team presentation-egress composition root, narrow typed control directives, deterministic order/conflict rules, and per-connection reset/disposal without a generic plugin framework.
- live task-agent/task-team add, nested-child, exact workspace-row update, cleanup, coordinated focus, and reveal routing through actual topology/presentation mutation results rather than a watcher or component live-context builder.
- clean-cut relocation/removal of `workspaceTeamExecutionDisplayRows.ts`, its test path, `getLiveTeamContext` presentation contract, and component reconstruction while preserving stable/transient ordering, depth, child, status, and focus behavior.
- ordinary task-agent ensure/repair moved from `teamStreamMemberContextResolver.ts` into `teamTaskExecutionEventRouter.ts`, a read-only resolver contract, required mutation propagation on every router outcome, and a static no-discard check for task topology helper results.
- an explicit Event Monitor baseline lifecycle covering all context creation, reuse, replacement, final activity hydration, identity promotion, task context, and removal owners.
