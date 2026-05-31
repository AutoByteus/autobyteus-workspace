# Investigation Notes

## Investigation Status

- Bootstrap Status: Dedicated ticket worktree and branch created.
- Current Status: Current-state code investigation complete; requirements refined and user-approved for design.
- Investigation Goal: Understand where compacting UI is currently generated and rendered, how event monitor/activity rows are modeled, and whether compaction should be represented as an in-flow event/activity row.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The visible change is frontend UX, but Activity side integration requires a deliberate activity model extension because the current Activity store is tool-only. Historical projection may need backend/server projection updates if durable compaction rows are desired on reopen.
- Scope Summary: Move compaction visibility away from top-of-event-monitor banner/adornment toward an in-flow event monitor row, and represent compaction in the existing Activity area through a typed non-tool activity projection.
- Primary Questions To Resolve:
  - Where is compacting state emitted and stored? Answer: live `COMPACTION_STATUS` is handled by `handleCompactionStatus` and stored on `AgentRunState.compactionStatus`; backend/server also records provider compaction boundary traces for certain runtimes.
  - Which component renders the current top compacting UI? Answer: `AgentEventMonitor.vue` renders `CompactionStatusBanner` above `AgentConversationFeed`.
  - Which component owns event monitor rows and activity area projection? Answer: `AgentConversationFeed.vue` renders conversation messages; `ActivityFeed.vue`/`ActivityItem.vue` render `AgentActivityStore` tool activities; `toolActivityProjection.ts` owns tool activity projection from segment/lifecycle events.
  - Can compaction be modeled as an existing row/activity type without duplicating state? Answer: for monitor row, a dedicated compaction row can reuse the shared monitor; for Activity side, existing `ToolActivity` is too tool-specific and should be broadened with a typed non-tool activity variant; user agreed compaction belongs inside Activity but is definitely not a tool activity.

## Request Context

User reports the compacting UI feels not nice because it is shown at the top of the event monitor. They prefer it as a separate row in the middle of the event monitor, and possibly also in the activity area because compacting can be considered an agent activity. User asked to analyze and understand first.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/compacting-ui-event-monitor-row`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/compacting-ui-event-monitor-row/tickets/done/compacting-ui-event-monitor-row`
- Current Branch: `codex/compacting-ui-event-monitor-row`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/compacting-ui-event-monitor-row`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-05-31.
- Task Branch: `codex/compacting-ui-event-monitor-row`, tracking `origin/personal`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Original shared checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` had unrelated untracked `blingda.txt`; task work proceeds in the dedicated worktree.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-31 | Command | `pwd; git rev-parse --show-toplevel; git branch --show-current; git status --short; git remote -v; git symbolic-ref refs/remotes/origin/HEAD; git worktree list --porcelain` | Bootstrap environment discovery | Main checkout is `personal`; remote default is `origin/personal`; many existing worktrees; unrelated untracked `blingda.txt` in shared checkout. | No |
| 2026-05-31 | Command | `git fetch origin personal && git worktree add -b codex/compacting-ui-event-monitor-row /Users/normy/autobyteus_org/autobyteus-worktrees/compacting-ui-event-monitor-row origin/personal` | Create dedicated ticket branch/worktree from fresh tracked base | Dedicated worktree created at commit `209e8915`. | No |
| 2026-05-31 | Code | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Required shared design reference | Design must be spine/ownership-led and avoid duplicate state/boundary bypass. | No |
| 2026-05-31 | Code | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/templates/*.md` | Required artifact structure | Requirements, investigation notes, and design spec structures loaded. | No |
| 2026-05-31 | Command | `rg -n "compacting\|compaction\|compact(ed\|ion)?\|Compaction\|Compacting" autobyteus-web autobyteus-server-ts autobyteus-ts ...` | Locate compaction code paths | Found frontend `AgentRunState.compactionStatus`, `agentStatusHandler.handleCompactionStatus`, `CompactionStatusBanner`, server `COMPACTION_STATUS`, TS compaction reporter, and provider boundary converters. | No |
| 2026-05-31 | Command | `rg -n "compactionStatus\|CompactionStatus\|COMPACTION_STATUS" autobyteus-web ...` | Find all frontend consumers | Only current presentation consumer is `AgentEventMonitor` via `CompactionStatusBanner`; single/team/mobile shells pass focused status through. | No |
| 2026-05-31 | Code | `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue` | Confirm current placement | Top-level template renders `<CompactionStatusBanner class="shrink-0" :status="compactionStatus ?? null" />` before `<AgentConversationFeed>`. | Yes: design removal/replacement. |
| 2026-05-31 | Code | `autobyteus-web/components/workspace/agent/CompactionStatusBanner.vue` | Inspect banner presentation | Simple `v-if="status"` banner with phase-based color classes and optional turn id; no timeline/activity behavior. | Yes: likely replace or repurpose as row. |
| 2026-05-31 | Code | `autobyteus-web/types/agent/AgentRunState.ts` | Inspect compaction state model | `AgentRunState` has latest `compactionStatus: AgentCompactionStatus | null`; payload supports phase, counts, compactor identity, run/task ids, error message. | Yes: row/activity projection must avoid treating latest status as full history unless explicitly modeled. |
| 2026-05-31 | Code | `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts` | Inspect live status handler | `handleCompactionStatus` builds a friendly message and stores latest status on `context.state.compactionStatus`. | Yes: likely add projection here or through a dedicated helper called here. |
| 2026-05-31 | Code | `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue`; `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue`; `autobyteus-web/components/mobile/MobileChat.vue` | Inspect monitor prop path | Single-agent, team focused-member, and mobile pass `state.compactionStatus` to shared `AgentEventMonitor`; preserving this shared path gives cross-surface parity. | No |
| 2026-05-31 | Code | `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue`; `autobyteus-web/types/conversation.ts`; `autobyteus-web/types/segments.ts` | Inspect event monitor feed model | Feed currently renders `conversation.messages`; messages are `user` or `ai`; AI segments include text, think, tools, media, errors, team messages, but no compaction/status segment. | Yes: design must decide row placement/model. |
| 2026-05-31 | Code | `autobyteus-web/stores/agentActivityStore.ts`; `autobyteus-web/services/agentStreaming/handlers/toolActivityProjection.ts`; `autobyteus-web/components/progress/ActivityFeed.vue`; `autobyteus-web/components/progress/ActivityItem.vue` | Inspect Activity area ownership | Store/type is `ToolActivity` only; projection accepts tool-like segments/lifecycle events only; presentation is tool-name/status/result oriented. | Yes: compaction Activity visibility requires typed non-tool extension, not fake tool call. |
| 2026-05-31 | Code | `autobyteus-web/components/mobile/MobileActivityDigest.vue`; `autobyteus-web/components/mobile/MobileToolActivityList.vue` | Inspect mobile Activity | Mobile Activity counts/list are backed by `agentActivityStore.getActivities(focusedRunId)`; UI label says "Run and tool history" but component names and row fields are tool-oriented. | Yes if Activity side included. |
| 2026-05-31 | Doc | `autobyteus-web/docs/agent_execution_architecture.md` | Inspect documented architecture | Docs state `COMPACTION_STATUS` normalizes into banner-ready run state and `AgentEventMonitor` renders `CompactionStatusBanner` above the conversation feed. | Yes: docs must change if implemented. |
| 2026-05-31 | Code | `autobyteus-web/services/runHydration/runContextHydrationService.ts`; `autobyteus-web/services/runHydration/runProjectionConversation.ts`; `autobyteus-web/services/runHydration/runProjectionActivityHydration.ts` | Inspect run reopen/hydration | Hydration builds conversation and tool activities from `getRunProjection`; no compaction status field is hydrated into `AgentRunState`. | Yes: durable rows require projection changes. |
| 2026-05-31 | Code | `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts`; `autobyteus-server-ts/src/run-history/projection/run-projection-types.ts` | Inspect server historical projection | Projection activity types are tool-only; raw trace transformer ignores `provider_compaction_boundary` traces. | Yes if historical compaction rows included. |
| 2026-05-31 | Code | `autobyteus-server-ts/src/agent-memory/services/provider-compaction-boundary-recorder.ts`; `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-converter.ts`; `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Inspect provider compaction events | Codex/Claude provider-native compaction emits `COMPACTION_STATUS` with `kind: provider_compaction_boundary`, `status: compacting/compacted`, and no `phase`; recorded as raw traces for memory. | Yes: frontend normalizer should account for phase-less provider status if in scope. |
| 2026-05-31 | Code | `autobyteus-ts/src/agent/compaction/compaction-runtime-reporter.ts`; `autobyteus-ts/src/memory/compaction/pending-compaction-executor.ts`; `autobyteus-ts/src/agent/loop/llm-phase-compaction.ts` | Inspect agent-based compaction status payloads | Semantic/agent-based compaction emits `phase: requested/started/completed/failed` plus counts and compactor identity metadata. | No |
| 2026-05-31 | Test | `autobyteus-web/components/workspace/agent/__tests__/AgentEventMonitor.spec.ts`; `autobyteus-web/services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts` | Inspect current test anchors | Tests currently assert banner forwarding and status handler latest-state mapping; these need updates for row projection/rendering. | Yes |
| 2026-05-31 | Other | User approval in conversation after requirements refinement | Confirm final scope before design | User agreed compacting should appear inside Activity, but definitely not as tool activity; no separate compaction-only section. | No |
| 2026-05-31 | Trace | `validation-report.md`; `browser-e2e-evidence/20260531-101302/browser-compaction-finding.md`; screenshots `05-queued-activity-row.png`, `06-compacting-duplicate-row.png`, `07-final-duplicate-failed-rows.png`, `08-user-observed-duplicate-rows.png`; `backend-live.log` | Investigate API/E2E design-impact reroute | Live LM Studio / AutoByteus native-runtime browser validation showed one deferred semantic compaction lifecycle emitted `requested` on `turn_0002`, `started` on `turn_0003`, and `failed` on `turn_0003`, but UI rendered separate queued/compacting/failed rows. Classified as CUI-E2E-009 Fail / Design Impact. | Yes: refine lifecycle identity design |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - Backend/runtime emits `COMPACTION_STATUS` through streaming services.
  - Frontend streaming dispatch routes `COMPACTION_STATUS` to `handleCompactionStatus`.
- Current execution flow:
  - Live event: `COMPACTION_STATUS` -> `AgentStreamingService` or `TeamStreamingService` -> `handleCompactionStatus(payload, context)` -> `context.state.compactionStatus = ...` -> shell passes `compactionStatus` prop -> `AgentEventMonitor` -> `CompactionStatusBanner` above `AgentConversationFeed`.
- Ownership or boundary observations:
  - `AgentRunState` owns latest compaction status, but not timeline placement or activity rows.
  - `AgentEventMonitor` currently owns top-banner placement.
  - `AgentConversationFeed` owns the monitor's scrollable message/feed content.
  - `AgentActivityStore` owns right-side/mobile Activity rows, but only for tool-like events.
- Current behavior summary:
  - Compaction status appears outside the feed as a top banner, not as a row in the monitor flow.
  - Activity area does not show compaction because compaction is not a `ToolActivity` and no compaction projection writes to `AgentActivityStore`.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UX refinement
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture evidence summary: Refactor needed because top-banner rendering is hard-coded in `AgentEventMonitor`, and approved Activity side support cannot fit the current `ToolActivity` model without broadening it or duplicating state.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User request + approval | Top compacting UI is visually unsatisfactory; desired placement is in monitor flow and inside Activity, but not as tool activity or separate compaction-only section. | Current "banner-sized run status" model no longer matches product need; Activity model must broaden cleanly. | Yes |
| `AgentEventMonitor.vue` | Banner is rendered before feed. | Placement owner is wrong for in-flow monitor row. | Yes |
| `AgentRunState.ts` | Holds latest compaction status only. | Latest state is useful, but insufficient as durable timeline/activity history unless projection is added. | Yes |
| `agentActivityStore.ts` | Type is tool-specific. | Adding compaction to Activity side requires deliberate non-tool activity variant. | Yes if Activity side included |
| `raw-trace-to-historical-replay-events.ts` | Provider compaction boundaries ignored for projection. | Historical/reopen compaction rows need projection support; otherwise scope must be live-only. | Yes if historical rows included |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue` | Shared monitor shell around compaction banner, feed, composer | Renders `CompactionStatusBanner` above feed. | Remove top-banner ownership; pass compaction row data into feed or a feed-adjacent row owner. |
| `autobyteus-web/components/workspace/agent/CompactionStatusBanner.vue` | Banner presentation for latest compaction status | Alert-style, top-pinned; no timeline/activity semantics. | Replace with row component or repurpose only after renaming/retargeting to row semantics. |
| `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` | Scrollable monitor feed for conversation messages | Current natural owner for in-flow monitor rows; only receives conversation today. | Likely add compaction row rendering input or introduce row composition before feed rendering. |
| `autobyteus-web/types/agent/AgentRunState.ts` | Run-local state including latest compaction status | `compactionStatus` carries phase/message/metadata. | Keep as latest status, but avoid using it directly from multiple UI components as separate source rules. |
| `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts` | Status/compaction/error streaming handlers | `handleCompactionStatus` centralizes live compaction payload normalization today. | Correct insertion point for dedicated compaction projection helper. |
| `autobyteus-web/services/agentStreaming/protocol/compactionTypes.ts` | Frontend compaction status payload contract | Requires phase in type but also includes team/member routing metadata; does not model provider boundary `status`. | May need normalization/type broadening for provider-native compaction payloads. |
| `autobyteus-web/stores/agentActivityStore.ts` | Tool activity store | `ToolActivity` only; types/status/details are tool-oriented. | Activity side support needs union/model rename or explicit deferral. |
| `autobyteus-web/services/agentStreaming/handlers/toolActivityProjection.ts` | Tool segment/lifecycle to activity projection | Only projectable tool segments. | Do not put compaction here unless renamed/broadened; better add compaction projection beside it. |
| `autobyteus-web/components/progress/ActivityFeed.vue` | Desktop Activity feed list and scroll/highlight | Renders `ActivityItem` for each store activity. | If model broadens, feed should branch by activity kind. |
| `autobyteus-web/components/progress/ActivityItem.vue` | Desktop tool activity row | Tool-name/status/result/error-oriented. | Keep tool rendering unchanged; add separate compaction activity item if needed. |
| `autobyteus-web/components/mobile/MobileActivityDigest.vue` | Mobile Activity tab digest | Counts `agentActivityStore.getActivities`; labels tools/run history. | If compaction rows enter activity store, counts/labels must remain truthful. |
| `autobyteus-web/components/mobile/MobileToolActivityList.vue` | Mobile compact tool row list | Tool-specific row fields and status chips. | Add branch or sibling component for compaction rows if Activity side included. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend streaming architecture docs | Documents compaction as banner above feed. | Must be updated if implementation proceeds. |
| `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | Server historical replay conversion | Ignores `provider_compaction_boundary` traces. | Historical compaction rows require server projection changes. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-31 | Static trace | Template/source trace from `COMPACTION_STATUS` handler to `AgentEventMonitor` | Confirmed top banner path without launching app. | Runtime browser repro not required to establish current placement; implementation validation should still include component/browser checks. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A
- Relevant contract, behavior, or constraint learned: N/A
- Why it matters: N/A

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: No runtime services used for investigation. Implementation validation should use focused Vitest component/handler tests; browser verification if a local dev server is available.
- Required config, feature flags, env vars, or accounts: None for investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation command above.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. Current UI placement is exactly top-of-monitor: `AgentEventMonitor.vue` hard-codes `CompactionStatusBanner` before `AgentConversationFeed`.
2. Current state model is latest-status only: `AgentRunState.compactionStatus` has no list/history semantics.
3. Current Activity side is tool-only: `ToolActivity` shape requires `toolName`, `type` limited to tool variants, `ToolInvocationStatus`, arguments/result/logs, and tool-specific rendering.
4. Current historical projection does not hydrate compaction status into frontend state or conversation/activity rows.
5. Existing docs explicitly encode the design that compaction is a banner-sized status, so the requested UX is a legitimate behavior/design change, not just CSS tweaking.

## Constraints / Dependencies / Compatibility Facts

- No backward-compatibility banner path should remain as primary UI after replacement.
- Shared `AgentEventMonitor` must continue to serve desktop single-agent, desktop team focused-member, and mobile Chat.
- Do not bypass `handleCompactionStatus` by making presentation components independently read backend payloads.
- Do not represent compaction as a fake `tool_call` just to reuse Activity components.
- Historical compaction row support depends on durable event/projection data; where unavailable, the implementation should not fabricate rows.

## Open Unknowns / Risks

- Whether provider-native phase-less compaction boundary payloads should be mapped into the same row model in this change.
- Whether completed compaction rows should remain visible forever, auto-collapse, or age out after the next user turn.
- Whether `compactionRunId` should be clickable in this UI change.

## Notes For Architect Reviewer

Requirements are approved with Activity side in scope. Design-impact refinement is required after CUI-E2E-009: one AutoByteus deferred semantic compaction operation must keep a stable parent activity identity across requested -> started -> completed/failed, even when request/execution turns and child compactor run/task ids differ. Design must explicitly broaden the Activity model with typed non-tool rows, keep compaction inside the existing Activity area/feed, avoid a separate compaction-only section, avoid fake tool rows, and prevent lifecycle fan-out.


## Design-impact evidence from Round 2 validation

- Scenario: real browser test using local backend/frontend, LM Studio through AutoByteus native runtime, and lowered frontend server settings (`AUTOBYTEUS_COMPACTION_TRIGGER_RATIO=0.01`, `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE=4000`).
- Observed lifecycle: `turn_0002` emitted `phase: requested`; `turn_0003` emitted `phase: started`; the same pending compaction execution timed out and emitted `phase: failed` with `compaction_run_id` and `compaction_task_id`.
- Observed UI failure: three separate compaction rows/cards (`queued`, `compacting`, `failed`) appeared for one deferred semantic compaction lifecycle.
- Design implication: `turn_id`, later `compaction_run_id`, and later `compaction_task_id` cannot be the canonical parent activity identity for AutoByteus deferred semantic compaction. They are lifecycle metadata. The parent operation needs a stable identity spanning request and execution turns.
- Evidence artifacts: `validation-report.md`, `browser-e2e-evidence/20260531-101302/browser-compaction-finding.md`, `backend-live.log`, and screenshots under `browser-e2e-evidence/20260531-101302/screenshots/`.
