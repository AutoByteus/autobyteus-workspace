# Design Spec

## Current-State Read

The current live compaction UI is a run-level banner, not a feed row. The live stream path is:

`COMPACTION_STATUS -> AgentStreamingService/TeamStreamingService -> agentStatusHandler.handleCompactionStatus -> AgentRunState.compactionStatus -> AgentEventMonitor -> CompactionStatusBanner`

`AgentEventMonitor.vue` renders `<CompactionStatusBanner>` before `AgentConversationFeed`, so compaction is pinned above the event monitor content. The shared monitor is reused by single-agent desktop, focused team-member desktop, and mobile Chat through `AgentWorkspaceView.vue`, `AgentTeamEventMonitor.vue`, and `MobileChat.vue`.

The right-side Activity area is currently tool-only. `agentActivityStore.ts` stores `ToolActivity[]`, `toolActivityProjection.ts` projects only tool-like segment/lifecycle events, and `ActivityItem.vue` assumes a tool invocation shape (`toolName`, `arguments`, logs/result/error). Mobile Activity uses the same store through `MobileActivityDigest.vue` and `MobileToolActivityList.vue`.

Historical/reopen hydration uses `getRunProjection`, `runProjectionActivityHydration.ts`, and server run-projection transformers. Server projection activity types are tool-only today, and `raw-trace-to-historical-replay-events.ts` ignores `provider_compaction_boundary` traces. Provider-native Codex/Claude compaction status payloads may carry `kind: provider_compaction_boundary` and `status: compacting/compacted` without the agent-based `phase` field, so frontend normalization must not assume `phase` is always present at runtime.

Round 2 API/E2E validation added a design-impact finding: a live LM Studio / AutoByteus native-runtime browser run emitted one deferred semantic compaction lifecycle as `requested` on `turn_0002`, `started` on `turn_0003`, and `failed` on `turn_0003` with child `compaction_run_id` / `compaction_task_id`; the UI rendered three rows. The target design must make that lifecycle update one compaction activity, analogous to one tool invocation updating in place.

Constraints for the target design:

- The top banner path must be removed as the primary UI.
- Compaction must appear inside the event monitor feed as a row.
- Compaction must appear inside the existing Activity area/feed as a non-tool run activity row.
- Compaction must not be faked as a `tool_call` or placed in a separate compaction-only Activity section.
- Single-agent, focused team-member, and mobile monitor surfaces must keep using the shared monitor behavior.
- One AutoByteus deferred semantic compaction operation must keep one parent activity identity from request scheduling through terminal outcome, even when later phases occur on another turn or gain child compactor run/task metadata.

## Intended Change

Replace the top compacting banner with a compaction row that is part of the event monitor feed. Broaden the existing Activity projection from tool-only activities to a discriminated run-activity model so the same compaction projection also appears in the general Activity feed.

Target UX:

- Event monitor feed: a compact, visually distinct `CompactionStatusRow` appears among message/tool content according to compaction activity placement time.
- Desktop Activity feed: compaction appears as a `CompactionActivityItem` alongside tool activity rows.
- Mobile Activity: the current run/tool-history section becomes a run-activity list that can render both tool rows and compaction rows.
- No top banner, no fake tool row, no separate compaction-only section.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UX refinement
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence:
  - `AgentEventMonitor.vue` currently owns compaction placement as a top-level banner before the feed.
  - `AgentActivityStore` and its consumers are named and typed as tool-only even though the approved UX needs non-tool run activity.
  - Live and historical compaction visibility need one projection path; independent component synthesis from `AgentRunState.compactionStatus` would duplicate policy.
- Design response:
  - Move compaction row placement under the monitor/feed boundary.
  - Broaden activity state to `RunActivity = ToolActivity | CompactionActivity`.
  - Add a dedicated compaction projection called by `handleCompactionStatus` and hydration code.
  - Branch presentation by activity kind instead of overloading tool rows.
- Refactor rationale:
  - A local CSS move would keep compaction as a banner-shaped status and would not solve Activity integration.
  - Adding compaction to `ToolActivity` would misrepresent the domain and make existing tool lifecycle methods ambiguous.
- Intentional deferrals and residual risk, if any:
  - Durable historical rows are limited to compaction evidence available in run projection. Existing agent-based semantic compaction statuses that are not durably recorded should not be fabricated on reload. If full durable semantic compaction history is required later, add a server-side recording path as a follow-up.

## Terminology

- `RunActivity`: a discriminated frontend activity item belonging to one run; current tool activities plus new compaction activities.
- `ToolActivity`: a `RunActivity` with `kind: 'tool'`, backed by tool segment/lifecycle events.
- `CompactionActivity`: a `RunActivity` with `kind: 'compaction'`, backed by `COMPACTION_STATUS` or durable compaction projection evidence.
- `CompactionStatusRow`: event-monitor feed row presentation for a `CompactionActivity`.
- `CompactionOperationId`: canonical run-local identity for one AutoByteus deferred semantic compaction operation, created when compaction is requested and carried through started/completed/failed status events. Child `compactionRunId` / `compactionTaskId` identify the compactor execution, not the parent row.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the top-banner primary UI path and remove/rename ambiguous tool-only activity assumptions that become wrong once Activity contains non-tool rows.
- Treat removal as first-class design work: obsolete banner component/imports/props and tool-only activity list names are in scope.
- Decision rule: the design must not keep a fallback banner or create compatibility wrappers that render both old and new compaction UI.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-CUI-001 | Primary End-to-End | Live `COMPACTION_STATUS` stream message | Event monitor compaction row and Activity row | Compaction activity projection | Main approved active-run behavior. |
| DS-CUI-002 | Primary End-to-End | Activity feed render request | Tool or compaction activity item | Activity feed presentation | Keeps compaction inside the existing Activity area without a separate section. |
| DS-CUI-003 | Primary End-to-End | Run reopen / `getRunProjection` hydration | Rehydrated run activities and monitor rows | Run projection hydration | Prevents reload/history regressions and synthetic compaction rows. |
| DS-CUI-004 | Primary End-to-End | Shared monitor render in single/team/mobile shell | Scoped focused-run compaction row | `AgentEventMonitor` / focused run id | Preserves single-agent, team focused member, and mobile parity. |
| DS-CUI-005 | Bounded Local | Tool lifecycle update method call | Matching tool activity mutation only | Agent activity store | Ensures new compaction rows do not get mutated by tool-only updates. |
| DS-CUI-006 | Primary End-to-End | AutoByteus threshold-crossing after one turn | Same compaction Activity row terminal update after next-turn execution | Compaction operation identity owner | Prevents deferred semantic compaction lifecycle fan-out across request turn, execution turn, and child task metadata. |

## Primary Execution Spine(s)

- Live compaction projection:
  `Backend/runtime COMPACTION_STATUS -> AgentStreamingService/TeamStreamingService -> handleCompactionStatus -> compactionActivityProjection -> agentActivityStore.upsertCompactionActivity -> AgentEventMonitor/AgentConversationFeed + ActivityFeed/MobileRunActivityList`

- AutoByteus deferred semantic compaction identity:
  `Token threshold crossed -> MemoryManager.requestCompaction creates/returns CompactionOperationId -> requested status with operation id -> PendingCompactionExecutor executes same pending operation on later turn -> started/completed/failed status with same operation id + child compactor metadata -> one activity row updates in place`

- Activity render:
  `agentActivityStore.getActivities(runId) -> ActivityFeed -> ToolActivityItem OR CompactionActivityItem`

- Historical hydration:
  `getRunProjection -> runProjectionActivityHydration -> agentActivityStore.addActivity(RunActivity) -> AgentEventMonitor/AgentConversationFeed + ActivityFeed/MobileRunActivityList`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-CUI-001 | A live compaction stream event is normalized once, updates latest run state, and upserts one compaction activity. The monitor and Activity surfaces render that activity instead of separately interpreting the raw status. | Stream message, status handler, compaction projection, activity store, monitor/activity surfaces | Compaction activity projection | Payload phase normalization, activity identity, timestamp preservation |
| DS-CUI-002 | The Activity surface reads all run activities and dispatches each row to the correct presentation component by `kind`. Tool rows keep current behavior; compaction rows use compaction-specific labels and error display. | Activity store, ActivityFeed, row components | ActivityFeed | Highlighting, scroll-to-highlight, counts |
| DS-CUI-003 | Reopen hydration accepts persisted projection activity entries. Tool entries hydrate as before; compaction entries hydrate only when durable projection evidence exists. | GraphQL projection, hydration adapter, activity store | Run projection hydration | Server historical replay conversion, no synthetic rows |
| DS-CUI-004 | Shared monitor shells identify the same focused run as today. `AgentEventMonitor` reads compaction activities for `conversation.id` and passes them into the feed, so single/team/mobile surfaces share placement. | Shell, AgentEventMonitor, AgentConversationFeed | AgentEventMonitor | Focused member selection, mobile reuse |
| DS-CUI-005 | Tool-specific store methods search only `kind: 'tool'` rows by invocation id, so compaction rows cannot be accidentally terminalized or assigned tool results/logs. | Store action, tool activity list | AgentActivityStore | Type guards, method rename/update |
| DS-CUI-006 | AutoByteus semantic compaction is deferred: a response turn can schedule compaction, then the next input turn executes it before dispatch. Those phases are one parent operation. The stable operation id is created by the compaction owner and carried through every status event; turn ids and child compactor run/task ids remain metadata. | token-budget evaluator, MemoryManager, PendingCompactionExecutor, reporter, compaction projection, activity store | MemoryManager / compaction operation identity owner | requested turn, execution turn, child compactor metadata |

## Spine Actors / Main-Line Nodes

- `COMPACTION_STATUS` message
- `handleCompactionStatus`
- `compactionActivityProjection`
- `AgentActivityStore`
- `AgentEventMonitor` / `AgentConversationFeed`
- `ActivityFeed` / mobile run activity list
- Run projection hydration

## Ownership Map

| Main-Line Node | Owns |
| --- | --- |
| `AgentStreamingService` / `TeamStreamingService` | Transport routing to the correct focused/single member context; no presentation policy. |
| `handleCompactionStatus` | Status-handler entrypoint, latest `AgentRunState.compactionStatus` update, delegation to compaction projection. |
| `compactionActivityProjection` | Compaction payload normalization, phase mapping, row identity selection, created/updated timestamp policy, projection into `CompactionActivity`. |
| `MemoryManager` / compaction pending state | AutoByteus semantic compaction operation identity, pending/active lifecycle state, requested-turn association, clear-on-success and preserve-on-failure semantics. |
| `AgentActivityStore` | Ordered run activity state, discriminated `RunActivity` model, tool-only mutation isolation, compaction activity upsert. |
| `AgentEventMonitor` | Shared monitor shell and run-id bridge from conversation to activity store; no banner-specific policy. |
| `AgentConversationFeed` | In-flow feed item composition and rendering of messages plus compaction rows. |
| `ActivityFeed` | Desktop general Activity list rendering and row dispatch by activity kind. |
| Mobile run activity list | Phone-first activity list rendering for both tool and compaction activities. |
| Server run projection transformers | Durable conversion of available replay evidence into projection entries. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentStreamingService` / `TeamStreamingService` `COMPACTION_STATUS` case | `handleCompactionStatus` + compaction projection | Transport routing | Compaction row identity, labels, or Activity insertion policy |
| `AgentEventMonitor` | `AgentConversationFeed` + `AgentActivityStore` | Shared shell for desktop/mobile/single/team | Top-banner compaction presentation |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `CompactionStatusBanner.vue` as top-of-monitor primary UI | Approved UX requires in-flow row | `CompactionStatusRow.vue` rendered by feed | In This Change | Delete if no other consumer remains. Do not keep hidden fallback. |
| `AgentEventMonitor` `CompactionStatusBanner` import/render/prop use | Banner path is obsolete | `AgentEventMonitor` reads/passes compaction activities by run id | In This Change | Parent shells should stop passing `compaction-status` prop to monitor. |
| Tool-only `AgentActivityStore` activity model | Activity must include non-tool compaction rows | `RunActivity = ToolActivity | CompactionActivity` | In This Change | Keep tool lifecycle semantics under `kind: 'tool'`. |
| Ambiguous tool-only store actions such as `addActivity` / `updateActivityStatus` if left unqualified | They become misleading once Activity is general | Explicit generic `addActivity(RunActivity)` plus tool-specific helpers (`addToolActivity`, `updateToolActivityStatus`, etc.) and `upsertCompactionActivity` | In This Change | If an action name remains generic, it must accept `RunActivity`; invocation-id actions must be tool-named. |
| `MobileToolActivityList.vue` name/label as the Activity section row source | Mobile list will render non-tool rows | `MobileRunActivityList.vue` or equivalent | In This Change | Update source guard tests and labels from tool-only to run activity. |
| Server/frontend projection assumption that activity entries are tool-only | Historical projection may contain compaction rows | Discriminated projection activity entries | In This Change | Existing tool entries must continue to hydrate unchanged. |

## Return Or Event Spine(s) (If Applicable)

Live compaction status is an event spine from runtime to UI:

`PendingCompactionExecutor/provider converter -> CompactionRuntimeReporter or backend converter -> AgentRunEvent.COMPACTION_STATUS -> ServerMessage.COMPACTION_STATUS -> frontend status handler -> compaction activity projection -> UI rows`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `compactionActivityProjection`
  - Spine: `raw payload + previous latest status -> normalized phase/message -> activity identity -> activity timestamps -> latest status + activity upsert payload`
  - Why this matters: requested/started/completed/failed events should update one activity row for the same compaction operation rather than create misleading duplicate rows.

- Parent owner: `AgentActivityStore`
  - Spine: `upsertCompactionActivity -> find existing by activityId -> preserve createdAt -> update phase/message/details/updatedAt -> keep sorted insertion order`
  - Why this matters: Activity and monitor feed ordering must be stable while status details update.

- Parent owner: `AgentConversationFeed`
  - Spine: `conversation.messages + compactionActivities -> feed items -> stable sort by placement timestamp -> render UserMessage/AIMessage/CompactionStatusRow`
  - Why this matters: the row belongs inside the event monitor flow, not above it.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Compaction presentation mapping | DS-CUI-001, DS-CUI-002 | Row components | Shared label/tone/icon mapping for compaction phases | Avoid duplicate phase-to-style rules in monitor, desktop Activity, and mobile Activity | Divergent labels/colors across surfaces |
| Tool activity type guard | DS-CUI-005 | AgentActivityStore/tool projection | Distinguish tool rows from compaction rows | Protect tool lifecycle updates | Compaction rows accidentally receive tool result/error/log mutations |
| Historical projection conversion | DS-CUI-003 | Run projection hydration | Convert only durable compaction evidence into compaction activity entries | Preserve reload behavior without fabrication | Fake or missing rows on reopen |
| Focused run identity | DS-CUI-004 | AgentEventMonitor/mobile/team shells | Use `conversation.id` / existing focused-member context | Prevent leakage between team members | Wrong member shows compaction row |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Store ordered run activities | `agentActivityStore.ts` | Extend | It already owns Activity feed state and focused-run rows. | N/A |
| Tool activity projection | `toolActivityProjection.ts` | Reuse/keep | It remains the tool projection owner. | N/A |
| Compaction projection | Status handlers area | Create New file | Compaction is not a tool; putting it in `toolActivityProjection.ts` would blur ownership. | Tool projection is intentionally tool-specific. |
| Event monitor row rendering | `AgentConversationFeed.vue` | Extend | It owns scrollable monitor feed rendering. | N/A |
| Desktop Activity presentation | `ActivityFeed.vue` + activity item components | Extend | Existing Activity area should contain compaction rows. | N/A |
| Mobile Activity presentation | Mobile Activity components | Extend/Rename | Existing mobile Activity area should contain compaction rows. | N/A |
| Historical projection | Run projection subsystem | Extend | Existing reopen/hydration path already owns durable projection. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend streaming handlers | `COMPACTION_STATUS` handling and projection delegation | DS-CUI-001 | `handleCompactionStatus` | Extend | Add compaction projection beside tool projection. |
| Frontend Activity state | `RunActivity` model and run-scoped activity storage | DS-CUI-001, DS-CUI-002, DS-CUI-005 | `AgentActivityStore` | Extend | Rename/split tool-specific methods. |
| Event monitor feed | In-flow compaction row rendering | DS-CUI-001, DS-CUI-004 | `AgentConversationFeed` | Extend | Row appears inside scrollable feed. |
| Desktop Activity UI | Mixed run activity presentation | DS-CUI-002 | `ActivityFeed` | Extend | Branch by `activity.kind`. |
| Mobile Activity UI | Phone-first mixed run activity presentation | DS-CUI-002 | Mobile run activity list | Extend/Rename | Avoid tool-only label. |
| Run projection / hydration | Durable compaction row hydration when available | DS-CUI-003 | Projection services | Extend | Do not fabricate missing rows. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/agentActivityStore.ts` | Activity state | `AgentActivityStore` | `RunActivity` union, tool/compaction actions, highlighting | Existing store owns Activity feed state | Shared activity types maybe local/exported |
| `autobyteus-web/services/agentStreaming/handlers/compactionActivityProjection.ts` | Streaming handlers | Compaction projection | Normalize compaction payload into latest status + compaction activity input | Separate from tool projection | Uses compaction presentation/normalization types |
| `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts` | Streaming handlers | Status handler | Delegate compaction status normalization/upsert | Existing entrypoint for status events | Projection helper |
| `autobyteus-web/components/workspace/agent/CompactionStatusRow.vue` | Event monitor feed | Compaction row | In-flow monitor presentation | Separate from Activity row density | Presentation helper |
| `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` | Event monitor feed | Feed renderer | Merge message items with compaction row items | Existing scroll/autoscroll owner | `CompactionActivity` type |
| `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue` | Event monitor shell | Shared monitor | Remove banner, fetch/pass compaction activities | Existing shared shell | Activity store getter |
| `autobyteus-web/components/progress/ToolActivityItem.vue` | Desktop Activity | Tool row | Existing tool row rendering after rename | Keeps tool concerns separate | `ToolActivity` |
| `autobyteus-web/components/progress/CompactionActivityItem.vue` | Desktop Activity | Compaction row | Desktop Activity compaction presentation | Non-tool row needs different fields | Presentation helper |
| `autobyteus-web/components/progress/ActivityFeed.vue` | Desktop Activity | Activity feed | Render mixed `RunActivity[]` | Existing list/scroll owner | Type guards |
| `autobyteus-web/components/mobile/MobileRunActivityList.vue` | Mobile Activity | Mobile list | Render mixed activity rows | Current `MobileToolActivityList` becomes too narrow | Type guards/presentation helper |
| `autobyteus-web/components/mobile/MobileActivityDigest.vue` | Mobile Activity | Digest/filter | Count and label run activities | Current filter implies tools only | Activity store |
| `autobyteus-web/services/runHydration/runProjectionActivityHydration.ts` | Run hydration | Hydration adapter | Convert projection entries into `RunActivity` | Existing hydration owner | Activity union |
| `autobyteus-server-ts/src/run-history/projection/*` | Server projection | Projection types/transformers | Add compaction projection entries from durable evidence | Existing projection owner | Discriminated projection entries |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Compaction phase -> label/tone/icon/message | `autobyteus-web/utils/compactionActivityPresentation.ts` or local exported helper near activity components | Frontend presentation utility | Monitor row, desktop Activity row, and mobile row need consistent labels | Yes | Yes | A second state normalizer or source of truth |
| Run activity discriminated union | `agentActivityStore.ts` exported types, or `types/agent/RunActivity.ts` if store file becomes crowded | Activity state | Multiple components/hydration need same types | Yes | Yes | Kitchen-sink optional fields shared by all activity kinds |
| Compaction payload normalization | `compactionActivityProjection.ts` | Streaming handlers | Provider-native and agent-based payloads need one mapping | Yes | Yes | UI component helper |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `RunActivity` | Yes | Yes | Low | Use discriminated `kind`; do not put compaction fields on tool rows. |
| `ToolActivity` | Yes | Yes | Low | Add `kind: 'tool'` and `activityId` but keep invocation data tool-specific. |
| `CompactionActivity` | Yes | Yes | Medium | Use `phase` as lifecycle state; do not also use `ToolInvocationStatus`. |
| `AgentCompactionStatus` | Yes | Yes | Medium | Add frontend identity/timestamp only if needed to link latest status to activity; do not make it the feed history. |
| Projection activity entry | Yes | Yes | Medium | Use discriminated union so compaction status does not reuse tool status fields. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/agentActivityStore.ts` | Activity state | `AgentActivityStore` | Store `RunActivity[]`; expose generic reads and kind-specific mutations | Central Activity state owner | `RunActivity`, `ToolActivity`, `CompactionActivity` |
| `autobyteus-web/services/agentStreaming/handlers/compactionActivityProjection.ts` | Streaming handlers | Compaction projection | Normalize live payload, resolve activity id, upsert compaction activity | Keeps compaction out of tool projection | `CompactionActivity` |
| `autobyteus-web/services/agentStreaming/handlers/toolActivityProjection.ts` | Streaming handlers | Tool projection | Continue projecting only tool segments/lifecycle to `ToolActivity` | Existing tool owner remains coherent | `ToolActivity` |
| `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts` | Streaming handlers | Status handler | Call compaction projection and store latest status | Existing status entrypoint | projection helper |
| `autobyteus-web/components/workspace/agent/CompactionStatusRow.vue` | Event monitor feed | Compaction feed row | In-flow row display for compaction | Separate monitor density | Presentation helper |
| `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` | Event monitor feed | Feed renderer | Render messages and compaction feed items in order | Owns scroll/autoscroll | `CompactionActivity` |
| `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue` | Event monitor shell | Shared monitor | Remove banner; source compaction activities for conversation id | Shared shell bridge | store getter |
| `autobyteus-web/components/progress/ToolActivityItem.vue` | Desktop Activity | Tool row | Existing tool presentation | Prevents tool/compaction row mixing | `ToolActivity` |
| `autobyteus-web/components/progress/CompactionActivityItem.vue` | Desktop Activity | Compaction row | Desktop Activity compaction presentation | Non-tool fields | `CompactionActivity` |
| `autobyteus-web/components/progress/ActivityFeed.vue` | Desktop Activity | Mixed activity feed | Render all run activities by kind; keep highlighting by `activityId` | Existing list owner | `RunActivity` |
| `autobyteus-web/components/mobile/MobileRunActivityList.vue` | Mobile Activity | Mixed mobile list | Render tool and compaction rows for phone | Current tool-only list becomes wrong | `RunActivity` |
| `autobyteus-web/components/mobile/MobileActivityDigest.vue` | Mobile Activity | Digest/filter | Label/count general run activity | Keeps filter truthful | store getter |
| `autobyteus-web/services/runHydration/runProjectionActivityHydration.ts` | Run hydration | Hydration adapter | Hydrate tool and compaction projection entries | Existing projection adapter | `RunActivity` |
| `autobyteus-server-ts/src/run-history/projection/run-projection-types.ts` | Server projection | Projection contract | Discriminated activity entries | Existing projection type owner | projection union |
| `autobyteus-server-ts/src/run-history/projection/historical-replay-event-types.ts` | Server projection | Replay event contract | Add compaction replay event | Existing replay type owner | compaction projection shape |
| `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | Server projection | Raw trace conversion | Convert `provider_compaction_boundary` traces to compaction replay events | Existing raw trace conversion owner | phase mapping |
| `autobyteus-server-ts/src/run-history/projection/transformers/historical-replay-events-to-activities.ts` | Server projection | Activity transformer | Emit compaction projection activities | Existing activity transformer | projection union |

## Ownership Boundaries

- `handleCompactionStatus` is the only live compaction status entrypoint. Components must not parse raw `COMPACTION_STATUS` payloads.
- `compactionActivityProjection.ts` owns compaction row identity and phase normalization. `ActivityFeed`, `AgentConversationFeed`, and mobile components render already-projected data.
- `AgentActivityStore` owns run activity storage. Tool lifecycle code must use tool-specific methods and cannot mutate compaction rows.
- `AgentConversationFeed` owns in-monitor placement; `AgentEventMonitor` must not reintroduce a top banner.
- Server run projection owns durable history. Frontend hydration must not invent rows absent from projection data.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `compactionActivityProjection` | phase mapping, activity id, timestamps, activity upsert input | `handleCompactionStatus` | UI components deriving compaction rows directly from raw payload or latest status | Add projection output fields/actions |
| `AgentActivityStore` | run activity list, type guards, upsert/update actions | ActivityFeed, monitor, hydration, streaming projections | Tool projection scanning/mutating generic activity rows without `kind` checks | Add tool-specific getters/actions |
| `AgentConversationFeed` | feed item composition and in-flow row rendering | `AgentEventMonitor` | Rendering compaction row above feed in monitor shell | Add feed prop/item kind |
| Run projection service | durable activity projection | run hydration | Frontend fabricating historical compaction rows from stale latest status | Extend projection data |

## Dependency Rules

Allowed:

- `agentStatusHandler.ts -> compactionActivityProjection.ts -> agentActivityStore.ts`
- `toolActivityProjection.ts -> agentActivityStore.ts` through tool-specific actions
- `AgentEventMonitor.vue -> agentActivityStore.getCompactionActivities(conversation.id)`
- `AgentConversationFeed.vue -> CompactionStatusRow.vue`
- `ActivityFeed.vue -> ToolActivityItem.vue / CompactionActivityItem.vue`
- `runProjectionActivityHydration.ts -> agentActivityStore.addActivity(RunActivity)`

Forbidden:

- `CompactionActivity` represented as `ToolActivity` or `tool_call`.
- Any component rendering the old `CompactionStatusBanner` above the feed.
- A separate compaction-only Activity section.
- Tool lifecycle handlers updating compaction rows.
- Frontend historical row fabrication when projection data lacks compaction evidence.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `handleCompactionStatus(payload, context)` | live compaction status | Entry handler, latest status update, projection delegation | `CompactionStatusPayload`, `AgentContext` | No UI placement logic. |
| `CompactionStatusPayload.compaction_operation_id` | AutoByteus semantic compaction parent operation | Stable identity from request through terminal phase | opaque run-local operation id string | Required for AutoByteus deferred semantic compaction. |
| `projectCompactionStatusToActivity(...)` or equivalent | compaction activity | Normalize payload and produce/upsert activity | run id + previous status + payload | Must handle `phase` and provider `status`. |
| `agentActivityStore.getActivities(runId)` | run activity list | Return mixed run activities in order | run id | General Activity UI uses this. |
| `agentActivityStore.getToolActivities(runId)` | tool activity list | Return only tool rows | run id | Tool projection/tests use this when they need tool shape. |
| `agentActivityStore.getCompactionActivities(runId)` | compaction row list | Return only compaction rows | run id | Event monitor feed uses this. |
| `agentActivityStore.upsertCompactionActivity(runId, activity)` | compaction activity | Create/update compaction row by activity id | `CompactionActivity` / input with `activityId` | Preserve created timestamp on update. |
| `agentActivityStore.updateToolActivityStatus(...)` etc. | tool activity mutation | Update only tool rows by invocation id | run id + invocation id | Existing tool lifecycle behavior. |
| `AgentConversationFeed` props | monitor feed | Render messages + compaction rows | `conversation`, `compactionActivities` | No raw status payload. |
| `RunProjectionActivityEntry` | durable activity projection | Hydrate tool/compaction rows | discriminated entry | Existing GraphQL payload is unknown[] but TS should be tight. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `projectCompactionStatusToActivity` | Yes | Yes | Medium | Identity precedence: `compaction_operation_id` first for semantic compaction; otherwise reuse active semantic lifecycle before treating child `compaction_run_id` / `compaction_task_id` as identity; provider-native boundary identity remains separate. |
| `getActivities` | Yes | Yes | Low | Return `RunActivity[]`; callers branch by `kind`. |
| Tool-specific store actions | Yes | Yes | Low | Rename or constrain to `ToolActivity`. |
| `AgentConversationFeed` props | Yes | Yes | Low | Accept already-projected compaction activities only. |
| Projection activity entry | Yes | Yes | Medium | Use discriminated union; do not reuse tool status for compaction phase. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| General activity item | `RunActivity` | Yes | Low | Distinguishes from tool-only. |
| Tool row | `ToolActivity` / `ToolActivityItem` | Yes | Low | Existing row presentation becomes explicitly tool-owned. |
| Compaction row | `CompactionActivity` / `CompactionStatusRow` / `CompactionActivityItem` | Yes | Low | Names match behavior and surface density. |
| Mobile list | `MobileRunActivityList` | Yes | Low | Replace tool-only name. |
| Old banner | `CompactionStatusBanner` | No for target | High | Remove/decommission. |

## Applied Patterns (If Any)

- **Projection/adapter:** `compactionActivityProjection.ts` adapts stream payloads into UI-owned `CompactionActivity` data.
- **Discriminated union:** `RunActivity` keeps tool and compaction data shapes separate under one Activity feed.
- **Sidecar store:** Activity remains a sidecar store, now for general run activities rather than only tools.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/agentActivityStore.ts` | File | Activity state | Mixed run activity state/actions | Existing sidecar store | UI rendering details |
| `autobyteus-web/services/agentStreaming/handlers/compactionActivityProjection.ts` | File | Compaction projection | Normalize/upsert live compaction activities | Handler-level projection | Tool segment logic |
| `autobyteus-web/services/agentStreaming/handlers/toolActivityProjection.ts` | File | Tool projection | Tool-only projection after store type broadening | Existing owner | Compaction logic |
| `autobyteus-web/components/workspace/agent/CompactionStatusRow.vue` | File | Event monitor row | In-flow monitor compaction display | Agent monitor components | Top banner behavior |
| `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` | File | Feed renderer | Mixed message + compaction row feed | Existing feed owner | Activity-side row details |
| `autobyteus-web/components/progress/ToolActivityItem.vue` | File | Tool activity row | Existing tool row rendering | Progress/activity components | Compaction fields |
| `autobyteus-web/components/progress/CompactionActivityItem.vue` | File | Compaction activity row | Desktop Activity compaction display | Progress/activity components | Tool arguments/results UI |
| `autobyteus-web/components/mobile/MobileRunActivityList.vue` | File | Mobile Activity list | Mixed run activity rows | Mobile components | Desktop-only components |
| `autobyteus-web/services/runHydration/runProjectionActivityHydration.ts` | File | Hydration adapter | Convert projection to run activities | Existing hydration owner | Live stream projection |
| `autobyteus-server-ts/src/run-history/projection` | Folder | Server run projection | Add compaction replay/projection support | Existing server projection subsystem | Frontend UI presentation |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `services/agentStreaming/handlers` | Main-Line Domain-Control | Yes | Low | Existing streaming handler/projection boundary. |
| `stores` | Off-Spine Concern | Yes | Low | Sidecar state store for Activity. |
| `components/workspace/agent` | Presentation | Yes | Low | Event monitor/feed components. |
| `components/progress` | Presentation | Yes | Low | Desktop Activity panel components. |
| `components/mobile` | Presentation | Yes | Medium | Rename tool-only list to avoid mixed semantics. |
| `run-history/projection` | Main-Line Domain-Control | Yes | Low | Server durable projection owner. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Activity model | `{ kind: 'compaction', activityId: 'compaction:run:turn-1', phase: 'started', message: 'Compacting memory…' }` | `{ type: 'tool_call', toolName: 'compacting', status: 'executing' }` | Compaction is run activity, not a tool invocation. |
| Event monitor placement | `User message -> AI/tool rows -> CompactionStatusRow -> next AI/user row` | `CompactionStatusBanner -> AgentConversationFeed` | Satisfies in-flow row requirement. |
| Activity area | One Activity feed with mixed rows by `kind` | Separate "Compacting Activity" section | User approved fluid general Activity feed, not separate section. |
| Tool updates | `updateToolActivityStatus(runId, invocationId, 'success')` filters `kind === 'tool'` | Generic status update mutates any activity with matching id | Protects compaction rows from tool lifecycle code. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `CompactionStatusBanner` above feed while adding row | Could preserve old UI | Rejected | Remove top banner; row is the primary UI. |
| Render compaction as fake `ToolActivity` | Would reuse current Activity components cheaply | Rejected | Add `CompactionActivity` and compaction-specific row components. |
| Add separate compaction-only Activity section | Could avoid broadening Activity item union | Rejected | Keep compaction in general Activity feed with discriminated activity type. |
| Historical frontend fabrication from latest status | Would make rows appear without server projection | Rejected | Hydrate only durable projection entries. |
| Leave tool-only method names ambiguous | Fewer callsite changes | Rejected where ambiguity affects boundaries | Split generic reads from tool-specific mutations. |
| Use child `compaction_task_id` or `compaction_run_id` as the row identity for terminal semantic compaction | Those ids arrive on failure/completion and are stable for child execution | Rejected | They are child compactor execution metadata; parent row identity is `compaction_operation_id` from the requested/pending semantic compaction operation. |
| Use `turn_id` as semantic compaction row identity | It is available in every current status payload | Rejected | Request turn and execution turn can differ; `turn_id` is lifecycle metadata, not parent operation identity. |

## Derived Layering (If Useful)

- Transport layer: streaming services route `COMPACTION_STATUS`.
- Projection/state layer: status handler, compaction projection, activity store, run projection hydration.
- Presentation layer: event monitor row, desktop Activity row, mobile Activity row.

Layering follows ownership; presentation does not parse transport payloads or own identity policy.

## Migration / Refactor Sequence

1. Broaden `agentActivityStore.ts`:
   - Define `RunActivity`, `ToolActivity`, and `CompactionActivity` with `kind` discriminants and `activityId`.
   - Add `getActivities`, `getToolActivities`, `getCompactionActivities`, `addActivity`, `addToolActivity`, tool-specific update helpers, and `upsertCompactionActivity`.
   - Update existing tool projection/lifecycle callsites to use tool-specific helpers.
2. Add/refine `compactionActivityProjection.ts`:
   - Normalize agent-based `phase` and provider-native `status` into compaction phase.
   - Resolve stable `activityId` with this precedence: semantic `compaction_operation_id`; active semantic lifecycle reuse; provider operation/boundary identity; only then defensive event fallback. Do not switch a queued/active semantic row to child `compaction_run_id` / `compaction_task_id` identity.
   - Preserve `createdAt` through store upsert; update `updatedAt` per event.
   - Return/update latest `AgentCompactionStatus` with activity identity if needed.
2a. Add backend semantic compaction operation identity:
   - Extend `MemoryManager` pending compaction state to create/retain an opaque `compaction_operation_id` when `requestCompaction()` first transitions into pending.
   - Make repeated request evaluation while pending return the existing operation id rather than creating another operation.
   - Include the same operation id on `requested`, `started`, `completed`, and `failed` status payloads.
   - Keep `requested_turn_id` and `execution_turn_id` or equivalent metadata if useful; keep existing `turn_id` as event/current turn metadata.
   - Clear the operation id only when compaction succeeds and the pending request is cleared; preserve it across failure while the pending compaction gate remains active.
3. Update `handleCompactionStatus` to call the compaction projection and stop being a presentation-only status mapper.
4. Replace monitor banner path:
   - Remove `CompactionStatusBanner` render/import from `AgentEventMonitor`.
   - Stop passing `compaction-status` prop from `AgentWorkspaceView`, `AgentTeamEventMonitor`, and `MobileChat` unless a non-UI latest-state consumer remains.
   - Add `CompactionStatusRow.vue` and pass `getCompactionActivities(conversation.id)` into `AgentConversationFeed`.
   - Update `AgentConversationFeed` feed item composition/autoscroll with compaction rows.
5. Update desktop Activity:
   - Rename/split existing tool row as `ToolActivityItem.vue`.
   - Add `CompactionActivityItem.vue`.
   - Update `ActivityFeed.vue` to render by `activity.kind`, key/highlight by `activityId`, and preserve scroll behavior.
6. Update mobile Activity:
   - Replace `MobileToolActivityList.vue` with `MobileRunActivityList.vue` or equivalent.
   - Relabel filter/section from tool-only wording to run activity wording.
   - Render tool and compaction rows inside the existing Activity area, not a new section.
7. Update run projection/hydration:
   - Add discriminated projection activity entries.
   - Preserve existing tool entry shape/behavior.
   - Convert durable `provider_compaction_boundary` traces to compaction projection entries when available.
   - Hydrate compaction entries into `AgentActivityStore`.
8. Remove obsolete files/imports/tests for the banner and tool-only list names.
9. Update focused tests and docs references after implementation.

## Key Tradeoffs

- Broadening Activity model is more work than faking a tool row, but it preserves domain clarity and prevents future non-tool run activities from repeating the same problem.
- Event monitor will depend on the Activity store for compaction rows, but this is acceptable because the store becomes the authoritative run-activity projection and avoids duplicate compaction state rules.
- Historical agent-based compaction rows may remain absent after reload unless a durable trace exists; this avoids fabricating history and keeps this ticket focused on UI/projection correctness.

## Risks

- Type churn in tests and consumers that assumed `getActivities()` returned `ToolActivity[]`.
  - Mitigation: provide `getToolActivities()` and update tool-specific callsites first.
- Duplicate compaction rows if identity resolution changes between requested/started/completed payloads.
  - Mitigation: backend emits stable `compaction_operation_id`; projection treats child compactor run/task ids as metadata for active semantic operations and reuses prior active semantic lifecycle defensively.
- Provider-native payloads without `phase` may render as generic updates if not normalized.
  - Mitigation: map provider `status` values to compaction phases.
- Mobile labels may remain tool-only after mixed activity rows.
  - Mitigation: rename/list labels in the same implementation.

## Guidance For Implementation

- Treat `RunActivity.kind` as the primary branch. Do not infer compaction from `toolName`, message text, or status string.
- Keep `ToolActivity` rendering behavior unchanged except for the added `kind/activityId` fields and renamed imports.
- Keep compaction row presentation compact; the monitor row should not become a large alert banner.
- Use existing autoscroll behavior in `AgentConversationFeed`; ensure compaction row insertion triggers the same pinned-scroll behavior as new messages.
- Add/adjust tests at minimum:
  - `agentActivityStore` mixed activity and tool-only mutation isolation.
  - `agentStatusHandler` / compaction projection: requested -> started -> failed/completed for one native deferred lifecycle across different turns, terminal metadata enrichment without new row, provider `status` normalization.
  - `AgentEventMonitor` / `AgentConversationFeed`: no banner, row inside feed, single/team/mobile scope through shared monitor.
  - `ActivityFeed`: tool and compaction rows render in one feed, no separate section.
  - Mobile Activity list/digest: compaction row appears in existing Activity area with non-tool label.
  - Run projection hydration: tool rows unchanged; compaction projection entry hydrates; absent entries do not fabricate rows.
