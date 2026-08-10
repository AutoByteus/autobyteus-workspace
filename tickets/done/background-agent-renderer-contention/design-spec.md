# Design Spec — Background Agent Renderer Contention

## Current-State Read

The current product intentionally restores and subscribes every active standalone run and active team run, regardless of focus. That behavior is correct: background work must remain complete and selectable. The performance defect begins after a canonical event reaches presentation paths.

On the server, `AgentRun` owns lifecycle truth and the lifecycle transformer deliberately pairs every final non-status event with a canonical `AGENT_STATUS` companion. Both standalone and team WebSocket handlers then use the same per-session `AgentStreamWebSocketEgress`. Team messages are enriched with exact member, source, task-agent, or task-team identity before entering that egress. The egress already owns UI-only content cadence, but its `send` method directly combines classification, buffering, flush ordering, serialization, and delivery. It forwards every unchanged lifecycle companion.

On the frontend, standalone and team-member generic dispatch duplicate the same coarse transaction: capture a complete recent Event Monitor witness, assign `conversation.updatedAt` for every message, invoke a handler, enforce retention, capture another witness, compare, and then allow Vue dependencies to react. The workspace history panel calls a builder once per workspace even though that builder first constructs all teams and members and only then filters. Selection reveal calls the all-team builder again. The child section then performs another navigation projection: `WorkspaceHistoryWorkspaceSection.vue` calls `buildWorkspaceTeamExecutionDisplayRows(team, getLiveTeamContext(teamRunId))` and reads focus directly from that live context. With 26 workspaces, one reactive background frame caused 27 complete team projections.

Two supported lifecycles also cross those target owners. First, `TeamStreamingService` routes ordinary task delegation and task-team-scoped messages through `handleTaskExecutionProjectionMessage` before generic dispatch. That router currently returns `continue` for a non-task-team-scoped ordinary task-agent status/content message. The later `resolveTeamStreamMemberContext` then calls `ensureTaskAgentContext`, which can create or repair `leafAgentContextsByRouteKey`, `memberNodesByRouteKey`, and `memberTree` after the task result boundary observed no topology change. The existing first-`running` task-agent integration test proves this path. Other router paths create, reparent, update, and asynchronously remove the same task-agent/task-team source nodes. `runHistoryTeamRows.ts` intentionally filters those transient nodes from the stable member tree; the component-time utility re-inserts them in live order with path, depth, kind, display name, visible agent status, child structure, and focus. Task description, references, arguments, timeline, and task-detail lifecycle/status are deliberately absent from the workspace row and remain owned by the right-pane delegated-task projection. Second, standalone/team open and recovery establish `AgentContext.conversation` and compaction activities through separate context, projection, and activity hydration writers. A cached final Event Monitor witness is valid only after both inputs are final.

The current owners and coupling problems are therefore:

- `AgentRun` is the correct canonical lifecycle owner and must not be weakened.
- The WebSocket presentation boundary is the correct place to remove redundant UI projections, but raw transport, status filtering, cadence, and observation need separate internal responsibilities.
- Standalone and team dispatch duplicate projection policy and cannot state the actual effects of a handler.
- Recent Event Monitor revision ownership discovers effects through blanket whole-window comparison instead of receiving explicit mutation effects.
- Conversation timestamps implicitly control a global navigation read model.
- Workspace components construct navigation rather than consuming one indexed, stable projection.
- `utils/workspaceTeamExecutionDisplayRows.ts` and the workspace section form a second stable/transient navigation owner with direct live-context and focus access.
- Live task-projection writers mutate the navigation source hierarchy without an explicit topology-or-presentation result.
- Ordinary task-agent member resolution is a hidden topology writer after the task router, despite its lookup name and context-returning contract.
- Context/open/hydration owners do not currently establish a durable final Event Monitor baseline because the current transaction always scans before each mutation.

Evidence and exact paths are retained in `investigation-notes.md` and `performance-evidence.md`. The target must preserve the configurable 500 ms content cadence, progressive rich Markdown, exact background state, initial/reconnect snapshots, canonical status companions, semantic flush ordering, and latest-100 Event Monitor behavior.

## Intended Change

Introduce one shared, typed WebSocket presentation-egress pipeline for standalone and team sessions. The pipeline has three constrained roles:

1. ordered filters may only forward or suppress;
2. exactly one scheduler owns buffering, cadence, semantic flush ordering, and forwarding;
3. observers may inspect outcomes but cannot change delivery.

The first filter suppresses an exact repeated UI status by exact enriched identity. The existing content batching and flush policy become the one scheduler. `AgentStreamWebSocketEgress` remains the per-connection composition and delivery owner rather than becoming a lifecycle owner or a generic middleware framework.

On the frontend, replace the two blanket generic-dispatch transactions with one shared agent-stream projector whose handlers return actual mutation effects. A recent Event Monitor coordinator applies only the requested work, using a cached final witness rather than rebuilding a before witness for every message. Concrete context/open/hydration owners reset the baseline before wholesale replacement and prime it only after conversation plus activity state is final. Replace component-driven team construction with one run-history-owned indexed navigation projection. That owner publishes both the stable history tree and a completed stable-plus-transient execution-row list; it is the sole production caller of the relocated pure row composer. Move every identity-bearing task-agent ensure/repair into `teamTaskExecutionEventRouter.ts` and make `teamStreamMemberContextResolver.ts` read-only. Every router outcome carries a required actual mutation, which `TeamStreamingService` merges before any handled/drop/communication/generic return. First create/reparent/repair is topology; represented display/status is field-tight presentation; unchanged ensure is none. Actual task identity/path/kind/order/depth/child changes rebuild and reconcile the projection once. Right-pane task-detail changes request no navigation work. A coordinated team-focus action updates source focus and the exact cached team focus, while cleanup-induced fallback focus is carried by its topology rebuild. Workspace components receive completed rows/focus and never read `AgentTeamContext` or reconstruct navigation. Selection reveal uses topology indexes and never re-runs because content or status activity arrived.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | FR-004 / AC-005 | Click microphone in a focused idle composer while background work streams | Screenshot/source trace in `investigation-notes.md`; `isStarting=true` already occurs before device awaits | Background projection adds no material renderer delay; device/permission semantics remain unchanged | Composer -> voice store -> browser media APIs, concurrent with bounded stream projection; DS-003, DS-006, DS-007 |
| BEH-002 | User | FR-004 / AC-004, AC-006 | Paste images or open files/panels while background work streams | Placeholder-before-upload and prior Electron evidence | Placeholder and warmed file/panel actions meet approved targets without changing upload/file contracts | UI action -> synchronous placeholder/file state -> render; background work stays bounded; DS-003, DS-006, DS-007 |
| BEH-003 | System/User | FR-002, FR-003, FR-005 / AC-002, AC-003, AC-007 | Active history runs recover independent of selection, including first ordinary task-agent messages and live hierarchy while collapsed | Recovery coordinator, task writers, member resolver, first-running-status integration, current row utility, live probes | Keep every active stream/task hierarchy exact; all identity-bearing task-agent ensure/repair occurs in the mutation-bearing router before read-only resolution, and run history retains completed cached rows while collapsed | Recovery -> WebSocket -> task router ensure/repair + required mutation -> `TeamStreamingService` commit -> read-only resolution/generic projection -> run-history execution rows; DS-001, DS-002, DS-006, DS-007 |
| BEH-004 | System | FR-002, FR-003 / AC-002, AC-003 | Any generic standalone/team member message | Duplicated dispatch source and exact-dispatch probe | One shared dispatcher applies handler-reported effects; no blanket timestamp/navigation mutation | WebSocket service -> shared agent-stream projector -> handler -> effect commit; DS-001, DS-002, DS-006 |
| BEH-005 | System | FR-002 / AC-003, AC-007 | Context lifecycle establishes conversation/activity inputs, then a message reaches recent Event Monitor mutation boundary | Witness/retention, context/open/hydration source, and 0.55 ms lower-bound probe | Concrete lifecycle owners reset/prime the combined final witness; no-effect does nothing; presentation-only does no retention; structural effect enforces once and preserves exact final revision semantics | Context/open/hydration lifecycle -> prime/reset; handler effect -> recent Event Monitor coordinator -> cached final witness/revision; DS-006 |
| BEH-006 | System/UI | FR-003 / AC-002, AC-004, AC-007 | Navigation-relevant/irrelevant state or any supported live task projection changes | 27-build probe; component bypass; stable-row filter; router/task writers; resolver hidden ensure; first-running-status test | Navigation is built once per actual topology operation and publishes completed stable/transient rows. First task-agent status/content cannot create source state without topology; exact patches remain limited to represented fields; detail/content no-op appropriately | Stream/history/task router mutation or focus -> single `TeamStreamingService` commit -> run-history projection/row composer -> cached props; resolver is lookup-only; DS-002, DS-007 |
| BEH-007 | Contract | FR-001, FR-005 / AC-001, AC-007 | Canonical status companion reaches mapped UI transport | Lifecycle history, mapper, shared egress source | Preserve all canonical companions; suppress exact repeated UI status only after identity enrichment and per connection | AgentRun -> mapper/enrichment -> status filter -> scheduler -> WebSocket; DS-001, DS-002, DS-004, DS-005 |
| BEH-008 | Contract | FR-005 / AC-007, AC-008 | Runtime emits content while focused/background | v1.4.45 cadence and progressive rendering evidence | Preserve default/configuration, bytes/order/flush rules, current message shape, and immediate progressive rich rendering of each shaped message | Canonical content -> cadence scheduler -> WebSocket -> shared projector -> focused Markdown; DS-001, DS-002, DS-005, DS-006 |
| BEH-009 | System/Maintainer | FR-007 / AC-010 | Add a bounded outbound UI control shared by standalone/team sessions | Both handlers already construct the same egress; user-approved extensibility direction | Add a filter or observer by implementing one narrow contract and registering once; scheduling remains one explicit owner | Shared egress composition root -> typed roles -> final sink; DS-005, DS-008 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/performance-evidence.md` | Retained runtime/probe measurements, causal classification, and limitations | FR-001–FR-006 / AC-001–AC-009 | Selects the real hot boundaries, provides baseline counts/latencies, and prevents Markdown/worker/cadence-only misdesign | Current; evidence-only; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/probe-evidence/` | Raw current-source/live probe results | FR-004, FR-006 / AC-002–AC-006, AC-009 | Provides independent inputs for implementation and downstream before/after execution | Current; evidence-only; approval N/A |

## Task Design Health Assessment (Mandatory)

- Change posture: `Performance Bug + Refactor + Behavior-preserving presentation shaping`
- Current design issue found: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`, `Duplicated Policy Or Coordination`, and `File Placement Or Responsibility Drift`
- Refactor needed now: `Yes`
- Evidence:
  - conversation mutation implicitly invalidates navigation;
  - two dispatchers duplicate a whole-presentation transaction;
  - the Event Monitor owner discovers changes by scanning before and after every input;
  - one uncached all-team builder is invoked per workspace plus reveal;
  - the workspace section separately combines stable/transient rows and focus from live context even though stable run-history rows intentionally filter transient tasks;
  - the ordinary member resolver calls `ensureTaskAgentContext` after the task router returned `continue`, hiding a supported topology mutation behind a lookup boundary;
  - the shared egress is the right subsystem but its direct branch would become a mixed-concern coordinator if status filtering were embedded there;
  - one exact background frame produced 27 full team projections; the aggregate current-source case produced 7,074 builds in 6.5 seconds.
- Design response: strengthen the two existing authoritative boundaries. The server WebSocket presentation boundary owns a constrained pipeline of filters, one scheduler, and observers. The frontend shared stream projector owns handler sequencing and explicit effects. Run history owns one indexed navigation projection, absorbs the current stable/transient execution-row semantics, and publishes completed rows/focus. Recent Event Monitor owns effect-specific commit and final-witness tracking.
- Lifecycle integration: the task projection router owns every exact identity-bearing task-agent ensure/repair and reports a required actual `TOPOLOGY`/field-tight-`PRESENTATION`/`NONE` mutation on every outcome. `TeamStreamingService` merges/commits it before any early return, while the member resolver becomes read-only. Right-pane-only detail remains independent; manual focus uses one source-plus-cache facade; context/open/hydration owners call the Event Monitor coordinator's explicit reset/prime operations around complete replacement transactions.
- Refactor rationale: a timer increase, frontend early return, or Web Worker would leave the causal global multiplier and duplicated ownership intact. The approved targets require structural bounds, not only lower average traffic.
- Intentional deferrals and residual risk: transcript virtualization and further Markdown optimization remain outside scope. JSON parsing may still become material at much higher scale, but no worker is justified until post-correction evidence isolates it. The design adds no speculative production observer beyond the typed seam required by FR-007.

## Terminology

- **Canonical companion:** An internal `AGENT_STATUS` event paired with a final non-status `AgentRunEvent`; it remains visible to canonical subscribers regardless of WebSocket suppression.
- **Presentation-egress pipeline:** The per-WebSocket-session UI projection boundary between an already-mapped `ServerMessage` and raw socket delivery.
- **Filter:** A control that returns only `forward` or `suppress`; it cannot buffer, reorder, serialize, or emit replacement messages.
- **Scheduler:** The single control that may buffer messages and decide flush/forward ordering.
- **Observer:** A non-authoritative listener to pipeline outcomes; it cannot change a decision or throw into delivery.
- **Stream mutation effects:** The actual effects returned after one frontend message handler runs: conversation activity, recent Event Monitor effect, and navigation effect.
- **Navigation projection:** Run-history-owned stable workspace/team/member rows, completed stable-plus-transient execution rows, exact focus, and indexes for workspace lookup and selection ancestry.
- **Workspace execution row:** A navigation-only row whose fields are identity/path, stable-or-transient kind, display name, depth/child structure, and visible agent current status. It never carries task description, references, arguments, timeline, or task-detail lifecycle/status.
- **Task execution projection mutation:** A task-local actual result from a live source projection operation: `TOPOLOGY` when workspace-row identity/path/kind/order/depth/child membership changed, `PRESENTATION` only when an existing row's `displayName` or visible agent `currentStatus` changed, or `NONE`. It carries task identity primitives and a tight row-field change, not a run-history type.
- **Read-only member resolution:** Selection of an already-existing stable/task member context from exact identity. It cannot create, repair, reparent, or rewrite any context/node/tree/map.
- **Final-witness baseline:** The cached Event Monitor presentation witness captured after both conversation and compaction/activity inputs are final for a context lifecycle transaction.

## Design Reading Order

Read the behavior map first, then the spine and ownership sections, then the typed interfaces and effect table. File/folder mappings are derived from those owners; the sequence, tradeoffs, and implementation guidance describe how to replace the current paths without leaving a compatibility route.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove the direct all-concerns egress branch, the old standalone/team duplicated dispatch transactions, unconditional generic-message timestamps, dynamic per-workspace team construction, component-time stable/transient row construction/live-context focus read, unscoped reveal reconstruction, and before/after Event Monitor transaction API.
- Do not retain wrapper aliases for the old egress policy or mutation commit APIs. Callers move to the new owners in the same change.
- Existing wire messages and persisted data remain directly usable; this is not a compatibility mechanism.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: persisted run/team conversations, raw traces, run-history GraphQL projections, settings, and attachments under the existing server data roots; volume varies by user and is already bounded for active Event Monitor projection.
- Relevant change: UI WebSocket filtering and frontend in-memory projection/effect ownership only. No stored schema, GraphQL schema, wire envelope, or setting shape changes.
- Normal reader/writer behavior and representative evidence: server persistence and raw subscribers consume canonical events before WebSocket presentation filtering; existing frontend hydration builds current `Conversation` and history types without version branching.
- Required semantics and invariants under direct use: exact content/status/tool order, current statuses, history hierarchy, settings, and attachments remain readable and unchanged.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: no rewrite or deletion is justified; user data must remain intact.
- Decision: `Directly Usable — No Migration`
- Decision rationale: all new state—filter caches, mutation witness caches, and navigation indexes—is per-connection or in-memory derived state. Rewriting persisted data would add I/O and corruption risk with no benefit.
- Acceptance criteria or design constraints: FR-001–FR-005 / AC-001, AC-007, AC-008.

### Migration Plan

N/A — no persisted transformation is required.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-003–BEH-008 | Canonical standalone `AgentRunEvent` | Exact frontend context and visible/global projections | `AgentRun` then server presentation egress then frontend agent-stream projector | Preserves the real standalone path while bounding presentation work |
| DS-002 | Primary End-to-End | BEH-003–BEH-009 | Canonical team leaf/task event, including first ordinary identity-bearing task-agent status/content | Exact team/member/task context plus cached stable/transient navigation and focus | `TeamRun` mapping then shared egress; task router owns all ensure/repair; `TeamStreamingService` commits one required tight mutation; member resolver is read-only | Proves exact multiplexed identity, complete topology enclosure, team reuse, and no resolver/component bypass |
| DS-003 | Primary End-to-End | BEH-001, BEH-002 | Foreground microphone/paste/file/panel action | Prompt visible foreground state/result | Existing UI action/store owner | Defines the user outcome protected from background contention |
| DS-004 | Return-Event | BEH-007 | Canonical status companion | First/changed UI status or exact suppression | Status transition filter | Separates canonical correctness from UI traffic frequency |
| DS-005 | Bounded Local | BEH-007–BEH-009 | Mapped `ServerMessage` at one session | Raw serialized socket send or intentional suppression/buffer | `AgentStreamWebSocketEgress` presentation pipeline | Owns ordered control composition, scheduling, observation, and disposal |
| DS-006 | Bounded Local | BEH-003–BEH-005, BEH-008 | Context lifecycle or parsed generic agent message | Valid final-witness baseline, exact context mutation, and bounded Event Monitor revision | Recent Event Monitor coordinator plus shared frontend projector | Removes blanket transactions while completing creation/reuse/replacement/hydration ownership |
| DS-007 | Bounded Local | BEH-001–BEH-006 | Explicit history, task-projection, focus, topology, or activity effect | Stable indexed workspace/team/member presentation with completed stable/transient execution rows | Run-history navigation projection owner | Removes workspace-count multiplication and live-context component construction while enclosing task hierarchy/focus changes |
| DS-008 | Bounded Local | BEH-009 | New filter/observer implementation | Registered shared behavior | Egress composition root | Makes bounded extension easy without generic middleware |

## Primary Execution Spine(s)

- **DS-001:** `Runtime/provider -> AgentRun queue/pipeline -> canonical event + status companion -> standalone mapper -> shared presentation-egress pipeline -> WebSocket -> AgentStreamingService -> shared agent-stream projector -> exact AgentContext/Event Monitor/navigation effect -> focused/global UI`
- **DS-002:** `Nested agent/task runtime -> TeamRun event -> mapper + exact identity -> shared egress -> team WebSocket -> TeamStreamingService -> task router performs all identity-bearing ensure/repair and returns required mutation/context outcome -> accumulator -> pre-generic topology commit when row must exist -> read-only member resolution only for unresolved existing subjects -> shared projector -> merge generic status + cleanup -> at-most-one final exact patch/topology commit -> completed cached execution rows -> UI`
- **DS-003:** `Microphone | paste | file/panel action -> existing UI/store owner -> immediate Starting | upload placeholder | selected file/panel state -> Vue commit -> visible response`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A standalone event remains canonical until mapping, passes one per-session presentation pipeline, then one shared frontend projector applies only its actual effects. | agent run, mapped message, WebSocket session, agent context | successive authoritative owners at lifecycle, presentation, and client projection boundaries | settings lookup, serialization, Event Monitor, navigation |
| DS-002 | A team event is enriched before the shared pipeline. The task router handles delegation, task-team-scoped, and ordinary identity-bearing task-agent projection, returns the resolved new/existing context plus a required actual mutation, and leaves only read-only existing-member lookup to the resolver. `TeamStreamingService` commits topology before generic row effects and otherwise merges one final exact patch/none, so first status/content publishes the row without a second build. | team run, task identity, task source projection, required mutation, existing member context, workspace execution row | team mapper for identity; shared egress for UI delivery; task router for all source task mutation; `TeamStreamingService` for one commit; run history for navigation | task detail/right-pane refresh, approvals |
| DS-003 | Foreground actions keep their existing behavior but no longer compete with multiplied navigation and no-op scan work. | composer/file UI, stores, browser APIs | existing voice, attachment, and file owners | permissions, network, device latency |
| DS-004 | The status filter keeps one last admitted client-visible payload per exact identity and suppresses only deep-equal repeats. | status identity, status payload | status transition filter | deep equality, reconnect reset |
| DS-005 | Filters run in declared order, the sole scheduler preserves cadence and semantic flush ordering, observers receive immutable outcomes, and the terminal sink serializes/sends. | presentation message, pipeline lifecycle | `AgentStreamWebSocketEgress` | timer, error reporting, metrics seam |
| DS-006 | Context lifecycle owners establish/reset the final-witness baseline; then one handler reports actual effects and the projector performs only the requested commit. | agent context, hydration inputs, server message, handler mutation, effect | Event Monitor coordinator for baseline/commit; shared projector for message effects | browser tool side effect, token/activity stores |
| DS-007 | History and task topology operations build stable members plus live transient execution rows once; only represented display-name/status and focus changes patch exact indexed targets; components/reveal consume completed rows and indexes without contexts. | task projection mutation, navigation projection, execution row, cached focus | run-history store/read-model owner | minute clock, task-detail right pane, reference reuse |
| DS-008 | A maintainer implements the narrow filter or observer interface and adds one factory registration; no runtime, mapper, handler, scheduler, or transport edit is needed. | filter/observer registration | egress composition root | focused contract tests |

## Spine Actors / Main-Line Nodes

- Canonical agent path: provider/backend, `AgentRun`, event pipeline, event mapper.
- Team path: `TeamRun`, team event mapper, exact identity payload.
- Team task path: `TeamStreamingService`, task execution projection router, task-agent/task-team projection owners, read-only member resolver, required tight workspace-row mutation result, run-history stable/transient row composer.
- Server presentation: `AgentStreamWebSocketEgress`, filters, scheduler, terminal sink.
- Frontend projection: standalone/team streaming service, shared agent-stream projector, exact `AgentContext`.
- Context lifecycle: standalone/team context stores, run-open coordinators, projection/activity hydration owners.
- Global presentation: recent Event Monitor coordinator and run-history navigation projection.
- Foreground: existing microphone, attachment, file, and panel owners.

## Ownership Map

| Owner | Owns | Invariants |
| --- | --- | --- |
| `AgentRun` + lifecycle transformer | canonical agent lifecycle and companion ordering | every canonical event required by current lifecycle design remains; late/current turn semantics unchanged |
| Team mapper | exact outward team/member/task identity | enrichment completes before any identity-aware filter |
| `AgentStreamWebSocketEgress` | per-connection presentation pipeline lifecycle and final delivery | one ordered filter list, one scheduler, observer isolation, flush/dispose once |
| Status transition filter | last admitted client-visible status per exact identity | first and changed payload forward; exact repeat suppresses; malformed/unkeyable status fails open |
| Content cadence scheduler | pending content, timer, classification, semantic flush order | no bytes lost/reordered; one scheduling owner; current setting read on new window |
| Shared frontend agent-stream projector | common handler dispatch and effect application | one handler per message; actual effects only; standalone/team parity |
| Task execution projection router and projection files | every live task source mutation—including first ordinary identity-bearing ensure/repair—plus one required tight navigation mutation result | create/repair/reparent/identity/path/kind/order/depth/child => `TOPOLOGY`; existing-row display-name/visible-status => `PRESENTATION`; right-pane detail-only/unchanged => `NONE`; helpers do not call run history |
| Team stream member resolver | select an already-existing exact member/task context | read-only; no ensure/repair/map/tree/context writes; missing task context returns null because the router must have projected exact identity first |
| Recent Event Monitor coordinator | cached final witness, prime/reset lifecycle, retention commit, presentation revision | reset before wholesale replacement/removal; prime after conversation+activity final; no-effect zero work; unprimed real effect publishes once |
| Run-history navigation projection | stable rows, completed stable/transient execution rows, cached exact focus, workspace/row/ancestry indexes, bounded activity/task patches | sole production caller of row composer; no component live-context read/construction; unchanged branches retain references; content/detail-only task changes cannot rebuild/patch; one build per task topology operation |

`AgentStreamWebSocketEgress` is a governing boundary for UI presentation delivery, not a lifecycle owner. Its filters/scheduler/observers are internal owned mechanisms. `AgentStreamingService` and `TeamStreamingService` remain transport/session facades; generic conversation projection moves behind the shared projector.

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Standalone WebSocket handler | per-session egress + `AgentRun` | session setup and commands | cadence/status-filter policy |
| Team WebSocket handler | per-session egress + `TeamRun` | team session, commands, exact mapping | a separate team egress pipeline |
| `AgentStreamingService` | shared agent-stream projector for generic projection | socket lifecycle and control acknowledgements | Event Monitor transaction policy |
| `TeamStreamingService` | task projection router, run-history navigation boundary, read-only resolver, then shared projector | team socket lifecycle, required task-mutation accumulation/commit on every outcome, and member resolution | navigation construction, discarded mutation result, resolver mutation, or duplicate generic handler switch |
| `useRunHistoryStore` selectors and team-focus action | navigation projection plus source-focus coordination | single component-facing history/focus boundary | on-demand reconstruction or a source-only focus mutation that leaves cached focus stale |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Direct `AgentStreamWebSocketEgress.send` classification branches | mixes filtering/scheduling/delivery | typed pipeline coordinator + controls | In This Change | class remains but responsibility tightens |
| `agent-stream-websocket-egress-policy.ts` as free-standing coordinator policy | scheduling classification belongs to sole scheduler | content cadence scheduler internal classification | In This Change | no compatibility export |
| Duplicate standalone `dispatchMessage` generic switch and `teamStreamGenericMessageDispatcher.ts` switch | duplicate mutation policy | shared `agentStreamMessageProjector.ts` | In This Change | team-specific routing remains in team service |
| `beginRecentEventMonitorMutation` before-witness API | causes unconditional full scan | effect-driven Event Monitor coordinator with cached final witness | In This Change | update local-submission and team-store callers too |
| Unconditional generic `conversation.updatedAt` assignments | false activity and global invalidation | handler-reported real conversation activity effect | In This Change | persisted/hydrated timestamps stay intact |
| Component-time `getTeamNodes(root)` full builder calls | multiplies by workspace count | cached/indexed navigation selectors | In This Change | remove builder use from render loop |
| `utils/workspaceTeamExecutionDisplayRows.ts` as a component-callable combined-row builder | duplicates navigation ownership and reads live context after the cache | relocate its pure stable/transient composition semantics to `stores/runHistoryTeamExecutionRows.ts`, called only by `runHistoryNavigationProjection.ts`; remove old file/imports | In This Change | do not broaden the stable history tree; preserve exact row behavior in relocated tests |
| `WorkspaceHistoryWorkspaceSection.teamExecutionRowsByTeamRunId`, component `getLiveTeamContext(...)` focus read, and `WorkspaceHistorySectionState.getLiveTeamContext` | component bypass can retain reconstruction or stale cache ambiguity | completed `TeamTreeNode.executionRows` + cached `focusedMemberRouteKey` from run history | In This Change | remove panel's context-store dependency used only for this contract and update unit/E2E fixtures |
| Component-derived transient `hasChildren` and member-tree argument passed for reveal | structural/focus semantics belong to indexed navigation | row `hasChildren` + run-history ancestry index/focus action | In This Change | components retain only expansion presentation decisions |
| Reveal `getTeamNodes()` signature reconstruction | activity drives topology work | topology revision + ancestry indexes | In This Change | selection watch no longer depends on status/activity |
| `teamDraftProjectionRevision` as broad manual construction trigger where superseded | fragmented invalidation | explicit navigation topology/presentation effects | In This Change | remove only after all callers are mapped |
| Task projection source mutation without tight navigation result | leaves cached hierarchy stale or patches for unrelated detail | task projection result + one `TeamStreamingService` commit | In This Change | convert add/nested/update/cleanup, including async cleanup; detail-only returns navigation `NONE` |
| `teamStreamMemberContextResolver.ts` task-agent branch calling `ensureTaskAgentContext` | hides ordinary first-message topology mutation after router result | router handles every exact task-agent identity and returns context+mutation; resolver uses read-only existing-context getters only | In This Change | relocate resolver creation test to router; keep resolver exact lookup/mismatch tests |
| Optional/discardable mutation on task router outcomes | early handled/drop/communication/generic paths can lose source topology evidence | required `mutation` field on every `TaskExecutionProjectionMessageResult`; facade merges/commits before return | In This Change | static scan enforces no production task-topology helper call has an ignored result |
| Context-only `ensureTaskAgentContext` API | its return shape encourages callers to consume context and discard topology | clean-cut `ensureTaskAgentProjection(...) -> { context, mutation }`; update all callers/tests and remove old export | In This Change | no wrapper/alias |
| Context replacement/attach without explicit Event Monitor baseline lifecycle | cached witness can be absent or stale | coordinator `reset`/`prime` contract at exact owners | In This Change | no lazy per-message before scan |
| `agentContextsStore.hydrateFromProjection` wrapper | bypasses conversation-plus-activity completion and adds no policy | explicit run-open/live-hydration transaction through `upsertProjectionContext` + activity + prime | In This Change | no compatibility alias |

## Return Or Event Spine(s)

- **DS-004 status event:** `canonical AGENT_STATUS -> mapper/enrichment -> status filter key + payload comparison -> exact repeat: suppress/observe | first/change: scheduler -> pending-content flush rule -> raw send -> client status handler`.
- **Navigation event:** `handler actual status/summary/activity effect | tight task display/status change | coordinated focus -> run-history navigation owner -> exact patch or bounded no-op -> affected workspace branch only -> sidebar update`.
- **Event Monitor event:** `handler actual effect -> NONE: return | PRESENTATION: final witness once | STRUCTURAL: enforce once + final witness -> compare cached final witness -> revision at most once`.
- **Task projection event:** `task message -> task router owns all ensure/repair -> required actual mutation on every outcome -> TeamStreamingService accumulator -> TOPOLOGY for row structure: one stable-plus-transient refresh/reconcile | PRESENTATION for displayName/currentStatus only: one exact indexed patch | unchanged/detail-only NONE`; member resolution after the router is read-only, and delayed terminal cleanup is a separate single `TOPOLOGY` operation only when removal occurred.
- **Event Monitor lifecycle:** `create/reuse/replacement transaction -> reset before bulk replacement when applicable -> conversation write -> activity write -> prime final witness`; removal/disposal resets the context.

## Bounded Local / Internal Spines

### DS-005 — Presentation-egress pipeline

Parent owner: `AgentStreamWebSocketEgress`.

`send(mapped message) -> notify incoming observers -> ordered filters -> suppress or scheduler.accept -> scheduler buffer/flush/emit -> terminal serializer/send -> notify outcome observers`

`flush -> scheduler.flush -> terminal sends -> observer outcomes`

`dispose -> mark disposed -> scheduler.dispose/cancel timer/drop unsendable pending -> filters.dispose -> observers.dispose/clear`

This spine matters because state, ordering, and failure behavior must be per connection and deterministic. Production composition is static; there is no runtime plugin discovery.

### DS-006 — Frontend mutation effects

Parent owner: shared agent-stream projector.

`parsed message + exact context/scope -> handler -> AgentStreamMutationEffects -> real conversation timestamp -> Event Monitor effect commit -> navigation effect apply`

Effects merge by maximum severity and contain no callback/functions:

```ts
type RecentEventMonitorEffect = 'NONE' | 'PRESENTATION' | 'STRUCTURAL';
type RunNavigationEffect =
  | { kind: 'NONE' }
  | { kind: 'ACTIVITY'; occurredAt: string }
  | { kind: 'PRESENTATION'; occurredAt?: string };

interface AgentStreamMutationEffects {
  conversationChanged: boolean;
  eventMonitor: RecentEventMonitorEffect;
  navigation: RunNavigationEffect;
}
```

`conversationChanged` updates `conversation.updatedAt`; it does not itself invalidate navigation. `ACTIVITY` is an O(1) bounded row activity update. `PRESENTATION` applies an exact indexed status/summary patch. Generic conversation effects cannot request a complete projection refresh; explicit history/workspace/task topology operations use the separate topology-refresh path.

The Event Monitor coordinator contract is:

```ts
resetRecentEventMonitorBaseline(context): void;
primeRecentEventMonitorBaseline(context): void;
commitRecentEventMonitorEffect(context, effect): CommitResult;
```

- `reset` deletes the cached witness and is idempotent. It runs immediately before wholesale conversation/run-identity/activity replacement and before context removal/disposal.
- `prime` captures conversation plus current compaction activities, replaces the cache without incrementing presentation revision, and is idempotent. It runs only after the last conversation/activity writer in the lifecycle transaction.
- `commit(NONE)` returns before retention or witness work, whether primed or not.
- `commit(PRESENTATION)` captures one final witness and performs no retention. `commit(STRUCTURAL)` enforces retention once, then captures one final witness.
- With a primed baseline, commit compares/revises exactly as designed. With no baseline and a non-`NONE` effect, commit stores the final witness and increments presentation revision once conservatively; it never reconstructs a missing before witness.

Exact lifecycle ordering:

1. New empty template/task context: construct -> prime empty final state -> expose.
2. Projection replacement: reset existing -> replace run/conversation/status -> hydrate activities -> prime -> expose/continue subscription.
3. Attach/reuse without replacement: after all attach work, call prime idempotently; do not reset a live context whose conversation/activity state is preserved.
4. Historical lazy member hydration: reset -> replace conversation -> hydrate activities -> prime -> mark loaded.
5. Identity promotion: reset -> promote run/conversation identity and any owned activity key -> prime.
6. Removal/task cleanup: reset before deleting the context reference; a `WeakMap` cache prevents retention but explicit reset makes lifecycle/test semantics observable.

Exact baseline caller inventory:

| Current file / owner | Supported lifecycle | Required target action |
| --- | --- | --- |
| `stores/agentContextsStore.ts` | standalone template create, projection upsert, temporary-ID promotion, remove | prime empty before create exposure; reset before replacement/promotion/removal; projection upsert returns the exact context unprimed for its hydration coordinator |
| `services/runOpen/agentRunOpenCoordinator.ts` | open with `KEEP_LIVE_CONTEXT` or replace from projection | preserved live: no reset, idempotent prime after reuse; replacement: store reset/upsert -> activity hydration -> prime before selection/connect |
| `services/runHydration/runContextHydrationService.ts` | recovery `hydrateLiveRunContext` | store reset/upsert -> activity hydration -> prime before return/connect |
| `stores/agentTeamContextsStore.ts` | team template create, hydrated attach, temporary-team-ID promotion, remove | prime all template members before exposure; accept only final-primed hydrated context; reset/prime around identity promotion; reset every removed member |
| `services/runOpen/teamRunOpenCoordinator.ts` | new team attach, preserved subscribed team reuse, non-live replacement | new/replaced member: reset if existing -> conversation merge -> exact activity hydration -> prime before team attach/selection; preserved subscribed member: no reset, idempotent prime after merge decision |
| `services/runHydration/teamRunContextHydrationService.ts` + `stores/runHistoryLoadActions.ts` | active recovery team hydration and attach | hydration service completes activities and primes every returned member; load action attaches it and removes the current post-attach activity-hydration split |
| `services/runHydration/teamRunMemberStatusHydration.ts` | exact new/replaced member activity hydration during team open | after each member's final `hydrateActivitiesFromProjection`, prime that member before returning |
| `stores/runHistoryTeamMemberProjectionHydrator.ts` | historical focused/lazy member projection replacement | reset -> replace conversation/status -> hydrate activities -> prime -> mark loaded |
| `services/agentStreaming/teamTaskAgentContextProjection.ts` | dynamic task-agent create/remove | prime new empty task context before map/tree exposure; reset before removal |
| `services/agentStreaming/teamTaskTeamChildProjection.ts` and `teamTaskTeamExecutionProjection.ts` | dynamic task-team child create and root/child cleanup | prime each new empty child context before exposure; reset each removed child/task context before deletion |

`hydrateFromProjection` in `agentContextsStore.ts` is an unused wrapper around the incomplete upsert transaction and is removed rather than retained as a way to bypass final activity hydration/prime. No reset-to-prime replacement sequence may contain an `await`; subscribed live contexts use the preserve path instead of replacement.

Lifecycle coverage must exercise template create, projection replace with compaction activity, subscribed reuse, recovery hydration, historical lazy hydration, task context create/cleanup, identity promotion, and removal. For each applicable path, assert idempotent reset/prime, `NONE` causes zero witness/enforcement/revision work, the first real commit compares with the true final combined baseline, and an intentionally unprimed real commit captures once and publishes once.

### DS-007 — Navigation projection

Parent owner: run-history store/read model.

`history/context/workspace/task topology mutation -> build standalone tree once + build stable team tree once -> for each team compose stable/transient execution rows once from stable TeamTreeNode + matching live AgentTeamContext -> index by workspace/run/member -> reconcile -> publish cached TeamTreeNode.executionRows/focus + topology revision`

`stream status/summary effect -> locate exact indexed row -> clone affected ancestry only -> preserve other workspace arrays`

`task row presentation -> accept only DISPLAY_NAME or CURRENT_STATUS change -> compare indexed execution row -> equal: no-op | changed: clone exact row/team/workspace branch`

`team focus selection -> source focus/hydration succeeds -> compare cached focusedMemberRouteKey -> exact team patch; task cleanup fallback focus arrives through its topology rebuild`

`stream activity effect -> compare visible time bucket -> same bucket: no-op | new bucket: patch affected row only`

`selection key or topology revision -> ancestry index lookup -> expand exact workspace/group/team; status/content changes do not enter reveal`

A single minute-resolution clock refreshes relative-time text without reconstructing rows.

The stable history/member shape remains intentionally separate from the workspace execution-row shape:

```ts
interface RunHistoryTeamExecutionRowBase extends TeamMemberFocusTarget {
  memberKind: 'agent' | 'agent_team';
  memberPath: readonly string[];
  displayName: string;
  depth: number;
  hasChildren: boolean;
}

type RunHistoryTeamExecutionRow =
  | (RunHistoryTeamExecutionRowBase & {
      kind: 'stable_member';
      row: TeamMemberTreeRow;
    })
  | (RunHistoryTeamExecutionRowBase & {
      kind: 'transient_execution';
      transientKind: 'task_agent' | 'task_team' | 'task_team_child';
      currentStatus: AgentStatus | string | null;
    });

interface TeamTreeNode {
  // existing stable history/team fields remain
  focusedMemberRouteKey: string;
  members: TeamMemberTreeRow[];
  memberTree: TeamMemberTreeRow[];
  executionRows: RunHistoryTeamExecutionRow[];
}
```

`runHistoryTeamRows.ts` continues to filter transient task nodes from `members/memberTree`; those fields remain the stable history hierarchy. New `stores/runHistoryTeamExecutionRows.ts` receives a stable `TeamTreeNode` and optional live `AgentTeamContext`, preserves live insertion/order and depth, reinserts stable rows by exact route key, classifies transient kind, resolves visible agent status, calculates `hasChildren`, and returns only the navigation shape above. It is pure, but `runHistoryNavigationProjection.ts` is its only production caller. Unit tests may call it directly. No component or task writer may import it.

When no live context exists, the composer flattens stable rows in stable order. When a live context exists, it traverses `memberTree` in live order, inserts only stable rows known to the stable index, retains task-agent/task-team/task-team-child positions and nested depth, uses the exact leaf context status with node/Initializing fallback for agent rows, and emits `null` status for team structural rows. `hasChildren` is derived during composition from stable children or the following live nested structure. `focusedMemberRouteKey` is copied without filtering it to stable members so a selected transient row remains highlighted. Task description, references, arguments, timeline, task execution status, and other detail fields are excluded by type and never copied.

Live task projection uses a task-owned result, not a watcher:

```ts
type TaskWorkspaceRowPresentationChange =
  | { field: 'DISPLAY_NAME'; value: string }
  | { field: 'CURRENT_STATUS'; value: AgentStatus | string | null };

type TaskExecutionProjectionMutation =
  | { kind: 'NONE' }
  | {
      kind: 'PRESENTATION';
      memberRouteKey: string;
      memberRunId?: string | null;
      changes: readonly TaskWorkspaceRowPresentationChange[];
    }
  | { kind: 'TOPOLOGY'; reason: TaskTopologyReason };

type TaskExecutionProjectionMessageResult = (
  | { outcome: 'continue' }
  | { outcome: 'handled'; cleanupTaskTeamRunId?: string | null }
  | { outcome: 'drop'; reason: string }
  | { outcome: 'memberContext'; context: AgentContext; cleanupTaskTeamRunId?: string | null }
) & {
  taskAgentIdentity?: TaskAgentStreamIdentity | null;
  mutation: TaskExecutionProjectionMutation;
};
```

Replace the context-only `ensureTaskAgentContext` export with `ensureTaskAgentProjection`, which returns `{ context, mutation }`. Task-team root/child projection, represented-row updates, and removal helpers likewise return subject/data plus whether they actually created/repaired/reparented/removed a node or changed one of the two mutable workspace-row fields. No production caller may discard this mutation. `handleTaskExecutionProjectionMessage` invokes task-agent projection for every message from which `extractTaskAgentIdentity` returns exact identity—not only `TASK_DELEGATION_EVENT` or task-team-scoped messages—and returns that context as `memberContext`. The later resolver removes its ensure import/branch and only finds existing task contexts by exact run ID or stable contexts by exact route/run identity. No compatibility alias for `ensureTaskAgentContext` remains.

The router merges actual results with precedence `TOPOLOGY > PRESENTATION > NONE`; when presentation changes for one target are merged, later values replace earlier values per field. Every `continue`, `handled`, `drop`, and `memberContext` result has a non-optional `mutation`. A change to task description, references, arguments, timeline, task label that does not alter actual row `displayName`, task execution status, or another right-pane-only field returns navigation `NONE`; those source fields continue updating their existing task-detail projection.

`TeamStreamingService` owns one task-mutation accumulator for the synchronous dispatch, including the current `removeTaskAgentAfterMessage` cleanup after generic projection. It merges `projectionResult.mutation` immediately, before branching on `drop`, `handled`, `TEAM_COMMUNICATION_MESSAGE`, or `memberContext/continue`, and calculates terminal cleanup intent before choosing commit timing. A pre-generic `TOPOLOGY` is committed only when generic status/content row effects need a newly created/repaired hierarchy and the same message will not remove that hierarchy. If terminal cleanup will remove it, topology is deferred and the final post-generic source state is built once. Otherwise represented existing-row and generic status changes plus post-message cleanup merge and commit once before return. If pre-generic topology was committed, the generic status effect may apply one exact row patch afterward only when status actually changed; it must not trigger another full build. The scheduled task-team cleanup is a later operation and calls the same boundary once only when removal returns `true`. The run-history patch boundary verifies indexed row identity/final equality and no-ops on missing/equal rows rather than building dynamically.

- New task agent, new task-team root, newly materialized nested child, parent/ancestry change, post-message task-agent removal, and delayed task-team removal: `TOPOLOGY`.
- Existing task-agent context with a missing/stale node-map or tree placement repaired from exact identity: `TOPOLOGY`.
- Any identity, path, member/transient kind, insertion order, depth, or child-structure change: `TOPOLOGY`.
- Existing workspace-row `displayName` or visible agent `currentStatus` change with unchanged structure: exact `PRESENTATION` containing only those field changes.
- Description, references, arguments, timeline, task-detail lifecycle/status, an unchanged label/status, or any duplicate event: navigation `NONE`.
- A topology refresh rebuilds/indexes/reconciles all navigation once, publishes one topology revision, preserves equal branches, refreshes selection ancestry, and copies final source focus. A presentation result patches one row/ancestry branch and cannot increment topology revision.
- `runHistoryStore.focusTeamMemberAndEnsureHydrated(teamRunId, memberRouteKey)` is the production focus facade. It invokes the existing context-store focus/hydration mutation, then calls `applyRunNavigationTeamFocus` with the final accepted key. All desktop/mobile production callers migrate to this action. Task-agent/task-team cleanup remains a source topology operation; its fallback focus is captured by the same one rebuild. There is no focus watcher.

Exact task-projection caller inventory:

| Current file / owner | Source mutation responsibility | Navigation result responsibility |
| --- | --- | --- |
| `services/agentStreaming/teamTaskAgentContextProjection.ts` | `ensureTaskAgentProjection` ensures/repairs/reparents context/node, applies identity/details, removes task agent | return context + actual mutation; topology for create/map-tree repair/reparent/remove; presentation only for actual row display/current status; detail-only/unchanged none; remove old context-only export; prime/reset lifecycle |
| `services/agentStreaming/teamTaskTeamExecutionProjection.ts` | ensure/update task-team root, delegation details/timeline/status, remove root/descendants | topology for membership/ancestry/order/depth/children/removal; presentation only if actual row display name changes; right-pane-only details/status none |
| `services/agentStreaming/teamTaskTeamChildProjection.ts` | resolve existing scoped child, update child status, create/reset child contexts as root is materialized/removed | topology for child materialization/removal; presentation for visible agent current status/display name only; none otherwise |
| `services/agentStreaming/teamTaskExecutionEventRouter.ts` | validate/route delegation, task-team-scoped, and every ordinary exact task-agent identity; combine root/child/task-agent mutations | call ensure/repair before returning; make mutation required on continue/handled/memberContext/drop; return ensured context directly; attach strongest actual result even after mutation-bearing drop |
| `services/agentStreaming/teamStreamMemberContextResolver.ts` | resolve only already-existing stable/task contexts for messages not resolved by router | remove context-only ensure import and exact task identity creation branch; return existing exact context or null without source writes |
| `services/agentStreaming/TeamStreamingService.ts` | sequence task projection, early branches, read-only member resolution, generic projection, task-agent removal, delayed task-team cleanup | merge router mutation before every branch; commit pre-generic topology when required; merge generic field patch/cleanup and commit at most one final exact patch or strongest topology; delayed cleanup once only when removal reports true |
| `services/runOpen/teamRunOpenCoordinator.ts` | restore retained task-agent source projections during open/reuse | capture restore helper topology/none and fold it into the one completed open/attach topology seed; never discard restore mutation |
| `stores/runHistoryNavigationProjection.ts` / `runHistoryTeamExecutionRows.ts` | no task source mutation | authoritative build/composition/index/reconcile or exact represented-field patch; refresh ancestry only for topology; expose completed rows/focus |
| `stores/runHistoryStore.ts` / `runHistorySelectionActions.ts` | coordinate manual source focus/hydration through context store | exact cached focus patch after success; selectors expose completed team node |
| `WorkspaceHistoryWorkspaceSection.vue` | no source or projection mutation | render `team.executionRows`, `row.hasChildren`, and `team.focusedMemberRouteKey`; expansion state only |

DS-007 coverage is a clean relocation plus owner-boundary proof:

| Coverage file / level | Required proof |
| --- | --- |
| Relocate `utils/__tests__/workspaceTeamExecutionDisplayRows.spec.ts` to `stores/__tests__/runHistoryTeamExecutionRows.spec.ts` | Preserve stable-only fallback; live stable/transient insertion order; task-agent/task-team/task-team-child kind; nested depth; `hasChildren`; visible agent status fallback; and explicit absence of description/reference/argument/timeline/detail-status fields. Remove the old test/file, do not duplicate it. |
| New `stores/__tests__/runHistoryNavigationProjection.spec.ts` | Topology builds the composer once and publishes `executionRows`/transient focus; equal branches retain references; display-name/status patches clone only the exact row/team/workspace; detail-only result causes zero patch/build; focus patches exactly; cleanup fallback focus/topology and nested ancestry remain correct. |
| Existing `services/agentStreaming/__tests__/teamTaskExecutionEventRouter.spec.ts`, `teamTaskTeamExecutionProjection.spec.ts`, and `TeamStreamingService.spec.ts` | Root/child/task-agent create/repair/reparent/order/depth/remove => topology; display-name/visible-status => tight presentation; details => navigation none. Explicit cases: first ordinary `AGENT_STATUS running`, first identity-bearing content, existing exact ensure none, missing-map/tree repair topology, generic status coordinated after pre-generic topology, existing offline cleanup/fallback focus, first-offline create/remove deferred to one final build, mutation-bearing drops/early returns, and at-most-one full build plus at-most-one required exact patch. |
| `services/agentStreaming/__tests__/teamStreamMemberContextResolver.spec.ts` | Resolver is observational: exact existing task/stable resolution succeeds; identity-less run-ID follow-up succeeds; mismatch/missing returns null; maps/tree/context identities are byte/reference unchanged. The old test expecting resolver creation moves to router/service coverage. |
| `stores/__tests__/runHistoryStore.spec.ts` plus selection-action specs | Every public focus path updates accepted source focus and cached focus; duplicate/invalid focus no-ops; transient focus is retained; task cleanup falls back through topology. |
| `components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts` | Component consumes completed rows and `row.hasChildren`, preserves expand/select/focus UX, and does not require live context or derive combined rows. |
| Existing delegated-task component specs (`TeamDelegatedTasksSection`, `TeamDelegatedTaskNavigator`, `TeamOverviewPanel`) | Right-pane description/references/arguments/timeline/detail status still update when navigation effect is none. |
| `tests/e2e/fixtures/team-activity-presentation.page.vue` + browser/API/E2E execution | Fixture uses completed projection. Collapsed/unfocused teams receive topology/status changes; later expansion shows exact stable/transient rows and latest status/focus. Detail-only bursts do not increase navigation build/patch counters. |
| Static changed-source scan | Prior SR-003 exclusions plus: old `ensureTaskAgentContext` export/calls are absent; resolver does not import/call task ensure/repair; every production `ensureTaskAgentProjection`, task-team ensure, restore, and removal call captures a mutation or resides in an explicitly mapped topology transaction that commits once; every router result has required `mutation`; `TeamStreamingService` merges it before any branch/return. |

## Event/Effect Decision Table

Handlers return effects based on actual mutation, not message type alone. Invalid, duplicate, terminally stale, or deep-equal inputs return `NONE` for every unaffected lane.

| Message / Mutation | Conversation | Event Monitor | Navigation | Notes |
| --- | --- | --- | --- | --- |
| `CONNECTED`, `TURN_STARTED`, `ARTIFACT_PERSISTED` with no projection | false | `NONE` | `NONE` | zero witness/retention/navigation work |
| Exact repeated `AGENT_STATUS` reaching client defensively | false | `NONE` unless a completion flag actually changes | `NONE` | server filter should already remove it; frontend remains idempotent |
| Actual agent status transition | false unless terminal completion mutates message | `STRUCTURAL` only when completion/segment state changes; otherwise `NONE` | `PRESENTATION` | patches exact status row; does not rebuild topology |
| Existing `SEGMENT_CONTENT` delta | true | `PRESENTATION` | `ACTIVITY` | no retention; activity patches at bounded time bucket only |
| Content that creates a synthetic segment | true | `STRUCTURAL` | `ACTIVITY` | creation may change latest-100 membership |
| New `SEGMENT_START` / user / inter-agent / system / error segment | true | `STRUCTURAL` | `ACTIVITY`, plus `PRESENTATION` if row summary changes | duplicate start/echo returns no effect |
| `SEGMENT_END`, assistant/turn completion, terminal tool transition | true only if canonical conversation changed | `STRUCTURAL` | `ACTIVITY` if conversation changed | completion changes retention priority |
| Tool argument/name/status summary change | true | `PRESENTATION` or `STRUCTURAL` when completion membership changes | `ACTIVITY` | Activity-only logs/results return Event Monitor `NONE` when rendered summary is unchanged |
| Token usage change | false | `PRESENTATION` when retained usage text changes | `NONE` | no retention |
| Compaction visible add/complete/fail | false | `STRUCTURAL` | `NONE` | requested/non-visible or deep-equal updates may be `NONE` |
| Todo/file-change store update | false | `NONE` | `NONE` | their own stores remain owners |
| Root `TEAM_RUN_LIFECYCLE` transition | false | N/A | `PRESENTATION` | exact root/group activity patch; equal lifecycle is no-op |
| First ordinary exact task-agent `AGENT_STATUS running` or identity-bearing content, no context/node yet | router creates/primes exact task context before generic projection | generic handler applies its normal effect to returned context | task `TOPOLOGY` before generic; optional exact status patch after | resolver is not called for creation; one full build publishes row, status patch only if final row differs |
| Ordinary exact task-agent message, context exists but node map/tree placement is missing/stale | router repairs source projection | generic effect remains independent | task `TOPOLOGY` | repair is topology even when context identity already exists |
| Ordinary exact task-agent message, ensure/placement/display/status already equal | no ensure rewrite beyond identity merge proven equal | generic effect only if message changes context | task mutation `NONE`; generic status/content may request its own exact effect | no full build from ensure; resolver remains read-only |
| Task-agent or task-team root/nested child is actually created, reparented, reordered, changes structural kind/depth/children, or is removed | context may be created/removed outside generic projection | prime new context / reset removed context | task `TOPOLOGY` | task router reports one merged topology mutation; one stable-plus-transient build for the operation |
| Existing task execution row `displayName` or visible agent `currentStatus` actually changes with identity/path/order/depth/children unchanged | generic projection effect remains independent | generic effect when a member context message also projects | task `PRESENTATION` with only changed row fields | exact indexed row patch; final-equal patch no-ops |
| Task description, references, arguments, timeline, task label that does not change row display name, task execution/detail status, or other right-pane detail changes | task-detail source updates normally | existing right-pane reactivity only | task navigation `NONE` | no workspace row represents these fields; delegated-task section/navigator/detail pane remain owners |
| Manual team-member focus succeeds | no conversation change | `NONE` | exact team focus patch | run-history focus facade coordinates source focus/hydration then cached focus; no topology build |
| Post-message task-agent cleanup | removed context reset before deletion | N/A | task `TOPOLOGY` only if removal occurred | merges with the current synchronous task mutation before final commit |
| Scheduled terminal task-team cleanup | removed contexts reset before deletion | N/A | task `TOPOLOGY` only if removal occurred | asynchronous cleanup is one later explicit operation and at most one build |
| Read-only member resolver lookup | false | `NONE` | `NONE` | returns an existing context or null; cannot create/repair or emit a task mutation |
| Topology/hydration/archive/delete/workspace mutation | N/A | reset/prime affected context as required | topology refresh | full navigation construction at most once per completed operation |

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Status identity resolver | DS-004, DS-005 | status filter | produce exact canonical key or fail open | team sockets multiplex identities | lifecycle/mapper duplication |
| Deep payload equality | DS-004, DS-005 | status filter + content helper | order-independent deep equality for mapped payloads | avoids duplicate implementations | generic utility sprawl if exported broadly |
| Egress observers | DS-005, DS-008 | pipeline | receive immutable incoming/suppressed/buffered/flushed/sent/error outcomes | bounded future metrics/testing seam | must not decide delivery |
| Content flush setting resolver | DS-005 | scheduler | read effective interval when a new window opens | preserves live configuration | settings must not enter filters |
| Recent witness cache | DS-006 | Event Monitor coordinator | retain last final presentation witness per context | eliminates before scan | must reset on conversation replacement/hydration |
| Browser tool success side effect | DS-006 | shared projector | invoke browser-specific result handling | existing external effect | must not define mutation severity |
| Navigation reconciliation | DS-007 | run-history owner | reuse equal rows/branches/indexes | reference stability | components must not perform it |
| Relative-time clock | DS-007 | workspace presentation | update labels once per visible resolution | preserve useful time without stream invalidation | must not rebuild projection |
| Task projection mutation accumulator | DS-002, DS-007 | task projection router | merge actual helper results to one `NONE`/`PRESENTATION`/`TOPOLOGY` outcome | one commit despite several source mutations | helpers must not import run history |
| Read-only team member resolver | DS-002 | `TeamStreamingService` | find already-existing exact stable/task context after task routing | separates lookup from source projection | ensure/repair here would bypass the mutation accumulator |
| Stable/transient execution-row composer | DS-002, DS-007 | run-history navigation projection | pure composition of stable rows and live transient nodes into the exact workspace row contract | preserves current supported task-row semantics behind the owner | must not be imported by components/task writers or include right-pane details |
| Delegated-task right-pane projection | DS-002 | existing team task UI | display descriptions, references, arguments, timeline, and task-detail lifecycle/status | those details are intentionally not workspace navigation | must not request a navigation patch unless an actual row display field also changed |
| Team focus coordination | DS-007 | run-history public focus action + context-store source owner | focus/hydrate source, then patch exact cached focus | removes component live-context focus read without a watcher | direct production callers must not mutate focus alone |
| Event Monitor baseline lifecycle | DS-006 | context/open/hydration owners through Event Monitor coordinator | reset before replacement/removal and prime after final activity write | final witness spans two stores | must not prime between conversation and activity hydration |

## Ownership Boundaries

1. Canonical runtime lifecycle ends at the mapped `ServerMessage`; presentation filtering cannot reach backward or mutate it.
2. Team identity mapping completes before the shared pipeline. Filters never infer identity from names, paths alone, or generated-ID patterns.
3. `AgentStreamWebSocketEgress` is the only entrypoint to its filters, scheduler, observers, and terminal sink. Handlers cannot call a control directly or provide different production control stacks.
4. The shared frontend projector is the only generic message-to-context projection entrypoint. Streaming services retain socket/control routing but cannot call Event Monitor internals or generic handlers independently.
5. The task projection router and projection helpers own all source `AgentTeamContext` task mutation, including ordinary exact task-agent ensure/repair, and return one required actual navigation mutation restricted to topology or represented workspace-row fields. They cannot import run history; `TeamStreamingService` merges the mutation before every outcome branch and is the one commit facade. `teamStreamMemberContextResolver` is read-only. Detail-only task changes remain within the existing right-pane source/UI path.
6. The Event Monitor coordinator owns witness cache and retention/revision sequencing. Handlers only describe actual effects; context/open/hydration owners invoke reset/prime only at completed lifecycle boundaries.
7. The run-history store owns navigation state, stable/transient row composition, cached focus, and indexes. Components consume completed selectors/actions; stream handlers and the team task facade emit exact navigation effects through the public boundary. Manual focus uses the run-history focus facade, not a separate component/context-store path.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentStreamWebSocketEgress.send/flush/dispose` | filter chain, scheduler, observers, terminal sink | standalone handler, team handler, broadcaster | handler -> status filter or scheduler directly | add a typed egress operation, not an internal dependency |
| shared `dispatchAgentStreamMessage` | handler switch, effect merge/application, Event Monitor commit, navigation effect | standalone/team streaming services | service -> handler + Event Monitor coordinator separately | extend message projection contract |
| task projection router result | all task-agent/task-team source mutation classification | `TeamStreamingService` | projection helper -> run-history/deep watcher; resolver -> ensure; optional/discarded router mutation | make mutation required and merge before every branch |
| `resolveTeamStreamMemberContext` | existing member context lookup | `TeamStreamingService` after router did not return context | resolver -> task context/node/tree creation or repair | move identity-bearing ensure to router; retain lookup only |
| Event Monitor coordinator | witness cache, enforcement, revision | shared projector, local submission, exact context/open/hydration owners | handler/component -> witness cache or lifecycle lazy scan | add typed effect/reset/prime method |
| run-history navigation boundary | projection, stable/transient row composer, cached focus, indexes, reconciliation | history/focus actions, shared projector, `TeamStreamingService` task facade, workspace components | component/projection helper -> builder/current contexts or direct focus mutation | add exact selector/effect/focus API |

## Dependency Rules

- Server mapper/enrichment may depend on canonical runtime event contracts; filters depend only on mapped `ServerMessage` and presentation identity helpers.
- Filters may not call the scheduler, serializer, lifecycle owner, or another filter. The pipeline sequences them.
- The sole scheduler may use the existing content coalescing helper and setting resolver; it may not inspect frontend focus or canonical runtime objects.
- Observers receive readonly outcomes and are isolated from stream errors; they cannot return directives.
- Both WebSocket handlers construct the same default pipeline factory; no team-specific control list is allowed.
- Frontend services may route control acknowledgements/task identities, then call the shared projector. They may not reproduce its generic switch.
- Task projection helpers may mutate only their `AgentTeamContext`/task-detail subjects and return actual task navigation mutation data. They may not depend on Pinia run history, components, or navigation row builders. Detail fields cannot be smuggled into the task navigation result.
- Every production call to a mutation-bearing task ensure/repair/remove/restore helper must capture its actual result and pass it to the router/facade or its explicitly mapped open/hydration topology transaction; mutation-returning calls may not be used as statements or hidden in a context-only expression.
- `teamStreamMemberContextResolver.ts` may use only read-only exact getters/index lookups. It may not import or call task ensure/repair/remove/restore helpers or assign team/context topology.
- `TeamStreamingService` merges the router's required mutation before inspecting outcome and accumulates post-generic task-agent cleanup. It commits pre-generic topology when the new/repaired hierarchy must exist before generic row effects, otherwise one merged result before return. Handled/drop/communication paths also commit any mutation before returning. Scheduled task-team cleanup applies at most one later topology mutation only when removal actually occurs.
- Handlers return effects and mutate only their owned context/store subjects. They must not call navigation or Event Monitor commit directly.
- Context/open/hydration owners call Event Monitor `reset` before wholesale replacement/removal and `prime` after final conversation/activity establishment. They must not capture or compare witness internals themselves.
- `runHistoryNavigationProjection.ts` is the only production caller of `runHistoryTeamExecutionRows.ts`; stable `runHistoryTeamRows.ts` remains transient-free. No dual combined-row path is allowed.
- Components may read `TeamTreeNode.executionRows`, cached focus, run-history selectors/actions, and expansion state; they may not read `AgentTeamContext`, call a row/team builder, derive transient child structure, or pass a member tree back for reveal.
- All production manual focus callers use `runHistoryStore.focusTeamMemberAndEnsureHydrated`; context-store focus operations remain its source-mutation mechanism. Task cleanup focus fallback is enclosed by its topology commit.
- Content/protocol traffic must never increment navigation topology revision.

## Interface Boundary Mapping

| Interface / API / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentStreamEgressFilter.evaluate(message)` | one mapped UI message | return `FORWARD` or `SUPPRESS` only | already-enriched payload | readonly input; no emit/buffer |
| `AgentStreamEgressScheduler.accept/flush/dispose` | per-connection scheduling | buffer/flush/forward in order | full mapped message | exactly one production scheduler |
| `AgentStreamEgressObserver.observe(event)` | pipeline outcome | non-mutating observation | typed outcome + optional exact identity | exceptions isolated |
| `resolveAgentStatusProjectionIdentity(payload)` | UI status identity | exact stable key or null | standalone, stable member, task-agent, task-team leaf | null means forward, never guess |
| `dispatchAgentStreamMessage(message, target)` | one context projection | invoke handler and apply effects once | standalone run target or exact team member/task target | team routing occurs before call |
| `commitRecentEventMonitorEffect(context, effect)` | final bounded center presentation | effect-specific retention/witness/revision | exact `AgentContext` | `NONE` exits immediately |
| `resetRecentEventMonitorBaseline(context)` | one context baseline lifecycle | discard baseline before wholesale replacement/removal | exact `AgentContext` | idempotent; no witness build |
| `primeRecentEventMonitorBaseline(context)` | one final hydrated presentation | capture/replace final combined witness | exact `AgentContext` | idempotent; no presentation revision |
| task projection helper result | one source mutation | return subject/context plus whether topology or represented row fields actually changed | exact team/task/member identity + optional display-name/current-status values | mutation cannot be discarded; detail-only => `NONE` |
| `handleTaskExecutionProjectionMessage(teamContext, message)` | all task source projection for one message | route/ensure/repair and return required strongest mutation plus optional resolved context/cleanup | exact enriched task identity | ordinary identity-bearing task-agent messages return `memberContext`; every outcome has mutation |
| `resolveTeamStreamMemberContext(teamContext, message)` | existing exact member context | read-only lookup after router | stable route/run or already-existing task run | null on missing/mismatch; never ensures |
| `commitTaskProjectionNavigationMutation(teamRunId, mutation)` | one task projection operation | adapt the task-local result to topology refresh or exact represented-field patch once | team run ID plus exact task mutation | called by `TeamStreamingService` only; final equality no-ops |
| `applyRunNavigationEffect(target, effect)` | exact navigation row | patch/no-op/reconcile | standalone run or `{teamRunId, memberRouteKey, memberRunId?}` | activity resolution is bounded |
| `applyRunNavigationTeamFocus(teamRunId, memberRouteKey)` | exact cached team focus | patch accepted focus without rebuilding | exact team run + route key already accepted by source context | no context lookup inside component |
| `focusTeamMemberAndEnsureHydrated(teamRunId, memberRouteKey)` | source focus plus navigation focus | focus/hydrate through context store, then patch final accepted focus | exact team run + route key | public run-history focus facade used by all UI callers |
| `selectRunNavigationTeamExecutionRows(teamRunId)` / `TeamTreeNode.executionRows` | completed workspace execution rows | expose cached stable/transient list | exact team run | no live context parameter |
| `refreshRunNavigationTopology(reason)` | global navigation topology | build/index/reconcile once | explicit history/workspace/task topology reason | never called by content or existing-row presentation |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Filter | Yes | Yes | Low | reject name-only/generic payload guessing |
| Scheduler | Yes | N/A | Low | prohibit a second buffering owner |
| Observer | Yes | Yes | Low | no return directive |
| Shared projector | Yes | Yes | Medium | require resolved target scope rather than context-only team ambiguity |
| Navigation effect | Yes | Yes | Medium | use compound team target; no agent-id-only shortcut |
| Event Monitor baseline lifecycle | Yes | Yes | Low | use `AgentContext` identity; no run-id-only cache key |
| Task projection mutation | Yes | Yes | Low | `TOPOLOGY` carries reason; `PRESENTATION` carries exact target plus only display-name/current-status changes |
| Team focus action | Yes | Yes | Low | one public source-plus-derived action; no direct component context read |
| Task router result | Yes | Yes | Low | required mutation on every outcome; optional context only on memberContext |
| Member resolver | Yes | Yes | Low | existing-context lookup only; no effect/mutation return needed because it cannot write |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| UI egress owner | `AgentStreamWebSocketEgress` | Yes | Low | document it as presentation egress, not raw transport |
| duplicate-status concern | `AgentStatusTransitionFilter` | Yes | Low | avoid lifecycle manager/control names |
| buffering owner | `AgentStreamContentCadenceScheduler` | Yes | Low | include flush ordering in contract/docs |
| generic frontend projector | `dispatchAgentStreamMessage` / `agentStreamMessageProjector.ts` | Yes | Low | do not call it a generic dispatcher helper |
| navigation owner | `RunHistoryNavigationProjection` | Yes | Low | keep history subject explicit |
| combined row shape | `RunHistoryTeamExecutionRow` | Yes | Low | name it as run-history navigation projection, not a generic workspace utility |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| UI stream shaping | server `services/agent-streaming/websocket-egress` | Extend | already sole cadence owner and shared by agent/team | N/A |
| Exact team identity | team mapper/identity payload | Reuse | identity is complete before egress | do not create second identity model upstream |
| Recent window semantics | frontend `services/eventMonitor` | Extend | owns retention/witness/revision | N/A |
| Generic message projection | frontend `services/agentStreaming` | Extend | existing handlers and both services live here | N/A |
| Live task source projection | frontend `services/agentStreaming/teamTask*Projection` | Extend | already owns task-agent/task-team create/update/remove and right-pane detail state | add only a tight actual row/topology result; do not move navigation ownership here |
| Existing team member resolution | `services/agentStreaming/teamStreamMemberContextResolver.ts` | Tighten/Reuse | correct location for exact existing-context lookup, but current task-agent ensure violates its name/boundary | move all mutation to existing task router; no new subsystem |
| Stable/transient navigation rows | current generic `utils/workspaceTeamExecutionDisplayRows.ts` plus frontend `stores/runHistory*` | Relocate + Extend | current helper has correct row semantics but the component/live-context call violates ownership; existing run history owns the target projection | move the pure composer/types/tests under run history, make the projection its only production caller, and remove the generic utility |
| Context/baseline lifecycle | context stores, run-open, run-hydration, Event Monitor | Extend existing owners | context owners know replacement timing; Event Monitor owns cache semantics | no new global hydration coordinator |
| Worker/parallel parsing | none | Do Not Create | evidence does not justify | would not fix reactive projection |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Server agent streaming / WebSocket egress | typed pipeline, status filter, content scheduler, terminal delivery | DS-001, DS-002, DS-004, DS-005, DS-008 | per-session egress | Extend | one shared production composition |
| Frontend agent streaming | shared generic projection/effects, all task projection mutation results, and read-only member resolution | DS-001, DS-002, DS-006, DS-007 | streaming services / exact context / task projection router | Extend + tighten | remove duplicate switch; enclose ordinary resolver ensure in router |
| Frontend Event Monitor + context lifecycle callers | effect commit, cached final witness, prime/reset lifecycle, latest-100 | DS-006 | Event Monitor coordinator served by context/open/hydration owners | Extend | semantics unchanged; no lazy before scan |
| Frontend run history/navigation | indexed projection, stable/transient row composition, exact row/focus patches, task/history topology reconciliation, reveal indexes | DS-007 | run-history store/read model | Extend + absorb current utility semantics | component becomes a context-free consumer; task facade commits once |
| Foreground input/file capabilities | existing interactions | DS-003 | existing stores/components | Reuse | validation only; no behavior redesign |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-stream-egress-control.ts` | server egress | pipeline contracts | filter/scheduler/observer/outcome contracts | one tight shared contract | N/A |
| `agent-status-transition-filter.ts` | server egress | filter | per-identity exact status suppression | independent state/policy | identity + equality |
| `agent-status-projection-identity.ts` | server egress | identity resolver | canonical standalone/team/task key | reused by filter/tests/observers | Yes |
| `agent-stream-content-cadence-scheduler.ts` | server egress | scheduler | content buffer/timer/flush classification | sole scheduling owner | content coalescing |
| `agent-stream-websocket-egress.ts` | server egress | authoritative boundary | compose controls and terminal sink | one lifecycle coordinator | contracts |
| `agentStreamMutationEffects.ts` | frontend streaming | shared effects | tight effect types/merge constants | reused by handlers/projector | Yes |
| `agentStreamMessageProjector.ts` | frontend streaming | projector | common switch and effect commit | replaces two switches | effects |
| `recentEventMonitorMutationCoordinator.ts` | Event Monitor | coordinator | cache/enforce/compare/revision | singular final-presentation owner | witness/window |
| `teamTaskExecutionEventRouter.ts` + projection files | frontend streaming | task projection owner | return actual `NONE`/`PRESENTATION`/`TOPOLOGY` mutation with context result | source mutation already spans these files | task navigation mutation |
| `teamStreamMemberContextResolver.ts` | frontend streaming | lookup boundary | resolve existing exact member/task context only | one pure resolution concern after task projection | existing indexes/getters |
| context/open/hydration callers | context lifecycle | baseline callers | reset before replacement/removal; prime after final activity write | timing belongs to current lifecycle owners | Event Monitor API |
| `runHistoryTeamExecutionRows.ts` | run history | pure projection-owned composer | preserve current stable/transient order, depth, kind, child, visible status semantics | one narrow navigation subject; only projection calls it in production | run-history row types/stable rows |
| `runHistoryNavigationProjection.ts` | run history | projection owner | build/index/reconcile/patch completed stable/transient rows and focus | isolates authoritative derived read model | row composer/types/builders |
| workspace history component/contract files | workspace presentation | projection consumer | remove live context and row-construction inputs; render completed rows/focus | presentation stays thin | run-history types/selectors |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Deep mapped-payload equality | `stream-payload-equality.ts` | server egress | content and status need identical structural equality | Yes | Yes | general application deep-equality utility |
| Egress roles/outcomes | `agent-stream-egress-control.ts` | server egress | pipeline and test controls share one contract | Yes | Yes | untyped middleware/plugin API |
| Frontend effects | `agentStreamMutationEffects.ts` | frontend streaming | many handlers need consistent severity merge | Yes | Yes | bag of optional callbacks |
| Navigation target | `runHistoryNavigationEffects.ts` or projection-owned type section | run history | standalone/team exact patches share discriminated target | Yes | Yes | mostly-optional generic identity object |
| Task execution projection mutation | `teamTaskExecutionProjection.ts` | frontend task projection | router/helpers share one tight actual-result union without a run-history dependency | Yes | Yes | generic navigation command or callback |
| Task projection message result | `teamTaskExecutionEventRouter.ts` | frontend task projection | every outcome carries one required strongest mutation; memberContext optionally carries resolved context | Yes | Yes | optional effect bag or context-only ensure result |
| Stable/transient execution-row contract | `runHistoryTypes.ts` + `runHistoryTeamExecutionRows.ts` | run history | projection and workspace renderers share one completed navigation shape | Yes; task-detail fields absent | Yes; removes generic utility type parallel | task-detail model or component-owned builder |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentStreamEgressFilterDecision` | Yes | Yes | Low | only `FORWARD`/`SUPPRESS` + stable reason code |
| `AgentStreamEgressObservation` | Yes | Yes | Low | discriminated outcomes; readonly message/identity metadata |
| `AgentStreamMutationEffects` | Yes | Yes | Low | severity enums, no booleans duplicating enum meaning |
| `RunNavigationTarget` | Yes | Yes | Low | discriminated standalone/team-member forms; exact keys required |
| `TaskExecutionProjectionMutation` | Yes | Yes | Low | topology reason and exact row-presentation changes are mutually exclusive; presentation admits only `DISPLAY_NAME`/`CURRENT_STATUS`; detail-only is `NONE` |
| `RunHistoryTeamExecutionRow` | Yes | Yes | Low | stable/transient variants share identity/path/display/depth/children only; details are excluded; `TeamTreeNode.executionRows` is the one completed representation |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/agent-streaming/websocket-egress/agent-stream-egress-control.ts` | server egress | pipeline contract | typed filter/scheduler/observer interfaces and observations | shared, small, stable | N/A |
| `.../agent-stream-egress-control-composition.ts` | server egress | composition root | build ordered default filters, one scheduler, observers | one production registration point | control contracts |
| `.../agent-status-projection-identity.ts` | server egress | identity concern | resolve exact status projection identity | no status state | current payload fields |
| `.../agent-status-transition-filter.ts` | server egress | filter | forward first/change, suppress exact repeat, dispose state | one policy | identity/equality |
| `.../agent-stream-content-cadence-scheduler.ts` | server egress | scheduler | pending groups, timer, message classification, flush order | sole buffering owner | coalescing/setting |
| `.../stream-payload-equality.ts` | server egress | shared owned structure | deep mapped-payload equality | avoids duplicate recursion | N/A |
| `.../stream-content-coalescing.ts` | server egress | scheduler concern | clone/can-append/append content | remains pure and narrow | payload equality |
| `.../agent-stream-websocket-egress.ts` | server egress | authoritative pipeline | lifecycle, control sequence, terminal serialization/send/error boundary | shared agent/team entrypoint | all contracts |
| `autobyteus-web/services/agentStreaming/agentStreamMutationEffects.ts` | frontend streaming | effect contract | effect types, constants, severity merge | shared across handlers/projector | N/A |
| `.../agentStreamMessageProjector.ts` | frontend streaming | authoritative generic projection | common handler switch, exact target, effect application | one path for standalone/team | effects/Event Monitor/nav APIs |
| `.../AgentStreamingService.ts` | frontend streaming | socket facade | call shared projector after control ack routing | keeps transport/session only | projector |
| `.../TeamStreamingService.ts` | frontend streaming | team socket facade | merge required router mutation before all branches; pre-generic topology when needed; read-only resolve; generic projection; merge cleanup/status; one final exact/topology commit; delayed cleanup once | keeps team routing only | task mutation/projector/navigation |
| `.../teamTaskExecutionProjection.ts` | frontend streaming | task result contract | define and merge actual `NONE`/`PRESENTATION`/`TOPOLOGY` results | existing task projection subject | exact navigation target |
| `.../teamTaskExecutionEventRouter.ts` | frontend streaming | authoritative task projection router | handle delegation, task-team-scoped, and ordinary exact task-agent ensure/repair; return context where applicable and required strongest mutation on every outcome | all live task source paths enter here | tight task mutation contract |
| `.../teamStreamMemberContextResolver.ts` | frontend streaming | read-only lookup | resolve existing stable/task context by exact identity after router; remove ensure import/branch | prevents hidden source mutation | task read-only getter/current indexes |
| `.../teamTaskAgentContextProjection.ts` | frontend streaming | task-agent source owner | replace context-only ensure with `ensureTaskAgentProjection -> {context, mutation}`; report create/repair/reparent/remove or row display/status; detail-only none; prime/reset | exact task-agent mutation | task mutation/Event Monitor APIs |
| `.../teamTaskTeamExecutionProjection.ts` | frontend streaming | task-team root source owner | report topology or actual row display name; keep details/timeline/execution status off navigation; reset removed contexts | exact task-team mutation | task mutation/Event Monitor API |
| `.../teamTaskTeamChildProjection.ts` | frontend streaming | nested child source owner | report topology or visible child-agent display/status only; prime new/reset removed child contexts | exact child mutation | task mutation/Event Monitor API |
| `.../__tests__/teamStreamMemberContextResolver.spec.ts` | frontend streaming tests | read-only resolver contract | retain existing/mismatch lookup cases; assert no context/map/tree mutation; move creation expectation to router/service tests | follows tightened owner | resolver |
| `.../__tests__/teamTaskExecutionEventRouter.spec.ts`, `TeamStreamingService.spec.ts` | frontend streaming tests | mutation routing/facade | first status/content ensure, repair, no-op, generic-status coordination, offline cleanup, early outcomes, one-build/patch counts | supported production evidence and target invariant | task results/navigation spies |
| `.../handlers/*.ts` | frontend streaming | concrete mutation owners | return actual mutation effects and no-op accurately | existing responsibility tightened | effect types |
| `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts` | frontend status | status mutation | return whether canonical status/submission state changed | source of exact status effect | N/A |
| `autobyteus-web/services/eventMonitor/recentEventMonitorMutationCoordinator.ts` | Event Monitor | coordinator | prime/reset/cache/commit final witness and retention | one presentation owner | existing witness/window |
| `autobyteus-web/stores/agentContextsStore.ts` | standalone context lifecycle | create/replace/promote/remove owner | prime new empty context; reset before projection replacement/promotion/removal | already owns context exposure | Event Monitor lifecycle API |
| `autobyteus-web/stores/agentTeamContextsStore.ts` | team context lifecycle | template/promote/remove/attach owner | prime new template members; reset/prime identity promotion; reset all removed members; require hydrated attach complete | already owns team exposure | Event Monitor lifecycle API |
| `autobyteus-web/services/runOpen/agentRunOpenCoordinator.ts` | run open | standalone attach/reuse owner | after replace + activity hydration, or preserved live reuse, prime exact final context | knows open strategy completion | Event Monitor lifecycle API |
| `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | run open | team attach/reuse owner | reset/prime exact members; capture `restoreTaskAgentContextProjections` actual topology result and include it in the single completed open/attach topology seed | knows merge strategy, final member set, and restore completion | Event Monitor + run-history topology APIs |
| `autobyteus-web/services/runHydration/runContextHydrationService.ts` | run hydration | live standalone hydration owner | upsert/reset through store, hydrate activities, then prime before returning | owns complete hydration transaction | Event Monitor lifecycle API |
| `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | run hydration | team payload/lazy member lifecycle | ensure contexts returned for attach have final baseline; lazy member uses projection hydrator transaction | current team hydration owner | projection hydrator |
| `autobyteus-web/services/runHydration/teamRunMemberStatusHydration.ts` | activity hydration | team activity completion owner | hydrate exact selected/new member activities, then prime each context | has both context and completion point | Event Monitor lifecycle API |
| `autobyteus-web/stores/runHistoryTeamMemberProjectionHydrator.ts` | member projection hydration | replacement transaction owner | reset, replace conversation/status, hydrate activities, prime, then return/mark loaded | single historical member transaction | Event Monitor lifecycle API |
| `autobyteus-web/stores/runHistoryLoadActions.ts` | recovery attach facade | live run/team recovery | attach only final primed contexts; remove duplicate post-attach activity hydration | recovery completion owner | hydration services |
| `autobyteus-web/services/runSubmission/localUserSubmission.ts` | submission | mutation caller | use typed structural/presentation effects and navigation summary/activity | non-stream origin remains explicit | coordinator/navigation |
| `autobyteus-web/stores/runHistoryTypes.ts` | run history | navigation data contracts | add tight stable/transient execution-row variants, `hasChildren`, and `TeamTreeNode.executionRows` | one authoritative component-facing shape | no task-detail fields/live contexts |
| `autobyteus-web/stores/runHistoryTeamRows.ts` | run history | stable history hierarchy | continue filtering transient task nodes | preserves stable/history semantics | combined-row composition |
| `autobyteus-web/stores/runHistoryTeamExecutionRows.ts` | run history | projection-owned pure composer | relocate exact stable/transient order, depth, kind, visible status, child semantics | only production caller is navigation projection | task details, Pinia, component state |
| `autobyteus-web/stores/runHistoryNavigationProjection.ts` | run history | derived read model | build stable nodes, compose execution rows, copy focus, index/reconcile, exact row/focus patch, stable selectors | removes component construction/live context | existing builders/types/composer |
| `autobyteus-web/stores/runHistoryStore.ts` | run history | authoritative public boundary | own projection state; expose topology/effect/focus/selectors | component/callers use one boundary | projection |
| `autobyteus-web/stores/runHistorySelectionActions.ts` | run history | selection/focus facade | invoke context focus/hydration then exact navigation focus patch | preserves source truth and cached display together | row reconstruction |
| `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` | workspace presentation | projection consumer | indexed workspace lookup and topology-only ancestry reveal without member-tree input | expansion/selection only | store selectors |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | workspace presentation | thin contract | remove `getLiveTeamContext`; remove member-tree reveal argument where superseded | prevents bypass at type boundary | AgentTeamContext import |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | workspace presentation | panel | pass cached workspace branches; minute clock; remove context-store binding used by section | no row construction | tree state |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | workspace presentation | row renderer | render `team.executionRows`, `row.hasChildren`, cached focus; expansion only | presentation only | live contexts/builders/child inference |
| `autobyteus-web/components/workspace/history/WorkspaceTransientExecutionRow.vue` | workspace presentation | transient renderer | consume relocated `RunHistoryTransientExecutionRow` type | presentational reuse | source context/detail state |
| `autobyteus-web/utils/workspaceTeamExecutionDisplayRows.ts` | legacy generic utility | remove | old component-callable combined-row builder | superseded cleanly | compatibility re-export |
| `autobyteus-web/utils/__tests__/workspaceTeamExecutionDisplayRows.spec.ts` | legacy test location | relocate/remove | move behavioral assertions to `stores/__tests__/runHistoryTeamExecutionRows.spec.ts` | tests follow owner | duplicate suite |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts` | workspace presentation tests | consumer contract | use completed execution-row fixtures; verify no live context lookup and preserve expand/select/focus behavior | protects thin component | source projection tests |
| `autobyteus-web/tests/e2e/fixtures/team-activity-presentation.page.vue` | browser fixture | projection consumer fixture | supply completed cached rows/focus and remove `getLiveTeamContext` state method | exercises target contract | legacy bypass |
| `autobyteus-web/components/workspace/{team/TeamMembersPanel.vue,running/RunningAgentsPanel.vue}`, `components/workspace/team/AgentTeamEventMonitor.vue`, `composables/mobile/useMobileRunLaunchCoordinator.ts`, `useMobileTeamMemberFocusCoordinator.ts`, `components/mobile/MobileRemoteAccessShell.vue` | focus callers | run-history focus clients | migrate direct context-store focus calls to run-history source-plus-cache focus facade | exact writer closure | direct source-only focus |
| `autobyteus-web/components/workspace/team/{TeamDelegatedTasksSection.vue,TeamDelegatedTaskNavigator.vue,TeamDelegatedTaskDetailPane.vue}` | team task detail UI | preserved right-pane owner | continue rendering description/references/arguments/timeline/detail status independent of workspace navigation | current correct ownership | navigation patches/builders |

## Applied Patterns

- **Constrained Chain of Responsibility:** ordered egress filters only. It solves easy add-without-modification suppression controls without granting buffer/reorder authority.
- **Strategy:** one scheduler contract with one production content-cadence implementation. A different scheduling policy replaces/extends that owner rather than stacking schedulers.
- **Observer:** pipeline outcome observers are non-authoritative and exception-isolated.
- **Derived read model/index:** run-history navigation owns stable indexed presentation separate from conversation mutation.
- **Effect result:** handlers return tight data describing actual mutation; no callbacks or implicit global scans.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/agent-streaming/websocket-egress/` | Folder | UI WebSocket presentation egress | controls, composition, scheduling, equality, final egress | existing capability boundary already owns cadence | canonical runtime lifecycle, frontend focus |
| `.../agent-stream-egress-control*.ts` | Files/New | contracts/composition | typed roles and one registration root | makes extension explicit | runtime plugin discovery/service locator |
| `.../agent-status-*.ts` | Files/New | filter/identity | status projection key + repeat suppression | status concern is independent | lifecycle derivation |
| `.../agent-stream-content-cadence-scheduler.ts` | File/New | scheduler | replace current in-class buffer/flush policy | sole scheduling owner | status cache |
| `.../agent-stream-websocket-egress-policy.ts` | File/Remove | obsolete | old free-standing action classification | superseded by scheduler | compatibility export |
| `autobyteus-web/services/agentStreaming/` | Folder | client stream/task projection | common projector/effects, session facades, all mutation-bearing task routing, read-only member resolution | current capability area | navigation row builders, discarded task mutations, or run-history imports in task helpers |
| `autobyteus-web/services/agentStreaming/teamTask*.ts` | Files/Change | task source/detail projection | return actual topology/represented-row/no-op results; keep right-pane detail off navigation; prime/reset dynamic contexts | existing source mutation owners | component/read-model construction or broad detail presentation |
| `autobyteus-web/services/eventMonitor/` | Folder | recent center presentation | effect-driven coordinator/witness/window and baseline contract | existing owner | stream routing/navigation/hydration orchestration |
| `autobyteus-web/stores/agent*ContextsStore.ts`, `services/runOpen/*Coordinator.ts`, `services/runHydration/*`, `stores/runHistoryTeamMemberProjectionHydrator.ts` | Files/Change | context lifecycle callers | exact reset-before-replace/remove and prime-after-final-activity calls | these owners know lifecycle completion | witness comparison/cache internals |
| `autobyteus-web/stores/runHistoryTypes.ts`, `runHistoryTeamExecutionRows.ts`, `runHistoryNavigationProjection.ts`, `runHistoryStore.ts`, `runHistorySelectionActions.ts` | Files/Change+New | navigation read model/public boundary | tight execution-row contract; sole combined-row composition; stable build/index/reconcile; exact row/focus patch; focus coordination | beside existing history read model/types | WebSocket parsing, task details, component context access |
| `autobyteus-web/utils/workspaceTeamExecutionDisplayRows.ts` + old utility test | Files/Remove/Relocate | obsolete component projection | remove generic builder; relocate its behavior tests under stores | clean-cut ownership transfer | re-export/wrapper |
| `autobyteus-web/components/workspace/history/` | Folder | workspace presentation | consume completed rows/focus and render/expand | current UI owner | live contexts, all-team/row construction, child inference |
| existing delegated-task right-pane components | Files/Preserve | team task detail presentation | continue description/reference/argument/timeline/detail-status updates | correct existing owner | workspace navigation effects |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | File/Change | durable server docs | shared pipeline/status filtering/cadence ordering | canonical server stream documentation | frontend implementation detail |
| `autobyteus-web/docs/agent_execution_architecture.md` | File/Change | durable frontend architecture | explicit effects, Event Monitor, indexed navigation | canonical frontend execution description | stale blanket-witness behavior |
| `autobyteus-web/docs/settings.md` | File/Change | duplicated durable guidance | synchronize Event Monitor/navigation/cadence description | currently duplicates architecture contract | inconsistent alternate policy |
| `autobyteus-web/docs/content_rendering.md` | File/No production change; docs verify | rich rendering contract | confirm progressive rich rendering remains unchanged | protects recent released UX | new frontend timer/coalescer |

The server egress folder remains compact because all files serve one presentation boundary. The frontend stays capability-oriented: stream projection, Event Monitor, and run history remain separate owners rather than being nested under a new cross-cutting performance folder.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Clear? | Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| server `websocket-egress` | Transport presentation / bounded control | Yes | Low | controls cannot reach canonical runtime |
| frontend `agentStreaming` | Main-line projection | Yes | Low | common projector replaces duplication |
| frontend `eventMonitor` | Off-spine presentation concern | Yes | Low | only final bounded center state |
| frontend context/open/hydration files | Context lifecycle callers | Yes | Medium | call narrow prime/reset APIs only; do not absorb Event Monitor policy |
| frontend `stores/runHistory*` | Main-line derived read model | Yes | Medium | keep public ownership in runHistoryStore; prevent component bypass |
| frontend delegated-task right pane | Off-spine task details | Yes | Low | preserve current owner; navigation types cannot represent its fields |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why It Matters |
| --- | --- | --- | --- |
| Shared team/agent pipeline | both handlers call `new AgentStreamWebSocketEgress(default composition)` | team adds its own status filter | parity and one extension point |
| Filter authority | `RUNNING(A)` then equal `RUNNING(A)` -> second `SUPPRESS` | filter flushes content or mutates status | separation of concerns |
| Scheduler authority | one cadence scheduler buffers content and flushes before idle/error/tool boundary | two middleware controls both buffer | deterministic ordering |
| Observer | receives `{kind:'SUPPRESSED', controlId, identity}` and returns void | observer returns “send anyway” | metrics cannot become policy |
| Team identity | task-team instance/run/task/relative leaf + agent run | `agent_name` or agent id alone | prevents cross-member suppression |
| Frontend no-op | repeated status handler returns all `NONE`; coordinator exits | build two witnesses to discover equality | removes proven hot work |
| Navigation | topology operation builds once; content patches activity bucket O(1) or no-ops | `v-for workspace -> getTeamNodes(root)` | removes workspace multiplier |
| Reveal | selection + topology revision -> ancestry index | status timestamp string signature | activity must not be topology |
| Task create/update/cleanup | first task-agent/nested row -> `TOPOLOGY`; same-row display/status -> `PRESENTATION`; detail-only -> `NONE`; terminal removal -> `TOPOLOGY` | deep-watch `memberTree` or patch navigation for every task detail | keeps hidden/collapsed hierarchy exact with bounded work |
| Task mutation result | projection helpers return actual changed flags; router emits one strongest result | infer topology from message type in `TeamStreamingService` | one event can touch root, child, and task-agent subjects |
| First ordinary task-agent status/content | router extracts exact task identity, ensures/repairs, returns `memberContext + TOPOLOGY`; facade builds before generic patch | router returns continue, resolver silently ensures | first supported message publishes source row and cache coherently |
| Existing task-agent ensure | helper returns `NONE`; generic status may independently patch if actual status changes | equal ensure rewrites tree or asks topology blindly | avoids redundant build while preserving status correctness |
| Resolver | exact lookup returns existing context/null without writes | context resolver calls `ensureTaskAgentContext` | lookup boundaries cannot bypass effect accounting |
| Combined execution rows | run-history projection calls its pure composer once, publishes `team.executionRows`, component renders it | component calls `buildWorkspaceTeamExecutionDisplayRows(team, liveContext)` | one authoritative stable/transient result with no cache bypass |
| Task details | description/reference/timeline change updates delegated-task right pane and returns navigation `NONE` | treating every task object update as workspace-row `PRESENTATION` | avoids unrelated global sidebar patches and preserves detail UX |
| Focus | run-history focus facade changes `AgentTeamContext` then exact cached `focusedMemberRouteKey`; cleanup fallback arrives in topology rebuild | component reads live focus or a focus watcher mirrors it | correct highlight after collapse/reopen with explicit low-frequency work |
| Event Monitor hydration | reset -> replace conversation -> hydrate activities -> prime, synchronously before exposure | prime after conversation but before compaction activities | witness must represent both inputs |
| Unprimed commit | `NONE` performs zero work; first real effect captures final once and publishes one revision | reconstruct a before witness lazily | preserves the performance invariant and safe presentation |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old egress policy export beside scheduler | reduce call-site edits | Rejected | move classification to scheduler and remove old file/imports |
| Keep old begin/commit witness functions as wrappers | preserve tests/callers | Rejected | convert every caller to effect coordinator and delete old API |
| Keep `getTeamNodes(root)` dynamic builder for some components | incremental rollout | Rejected | all render/reveal callers use indexed projection in one change |
| Frontend-only duplicate status guard | easier than server change | Rejected | filter before socket; frontend remains defensively idempotent |
| Canonical lifecycle transition-only rollback | restores former volume | Rejected | retain companions; UI filter only |
| Separate team control chain | team identity complexity | Rejected | identity enrichment already precedes shared pipeline |
| Generic plugin registry / `any` middleware | maximum theoretical extensibility | Rejected | narrow static filters, one scheduler, observers |
| Increase default cadence | masks frontend cost | Rejected | preserve 500 ms and correct boundaries |
| Deep watcher over `AgentTeamContext.memberTree` | automatically notice task nodes | Rejected | task projection returns an actual mutation committed once by its event facade |
| Keep dynamic team builder as task fallback | avoid mapping task writers | Rejected | enclose add/nested/update/cleanup in indexed navigation lifecycle |
| Keep `workspaceTeamExecutionDisplayRows.ts` as a component helper or compatibility re-export | preserve current imports | Rejected | move pure semantics/tests to run history, make navigation projection its only production caller, remove old path |
| Broaden stable `memberTree` to contain transient task nodes | avoid a specialized execution row | Rejected | preserve stable history semantics; expose a tight completed `executionRows` variant on the cached team node |
| Mirror live context with a deep/shallow component watcher | keep focus/status current after removing helper | Rejected | explicit task row/topology effects and one run-history focus facade patch the cache |
| Treat all task-detail mutations as navigation presentation | simplify task router classification | Rejected | navigation `PRESENTATION` admits only display-name/current-status; right-pane detail remains independent |
| Let member resolver return context plus mutation | smaller move than changing router | Rejected | ensure/repair is task source projection; placing all identity-bearing mutation in the existing router keeps one mutation owner and leaves resolution truly read-only |
| Keep router mutation optional and infer none when absent | reduce result edits | Rejected | every outcome requires `mutation`; optionality would let early returns silently lose a mutation again |
| Lazy Event Monitor before scan when cache is absent | simplify lifecycle callers | Rejected | explicit reset/prime plus one conservative unprimed final commit |

## Derived Layering

Layering is explanatory only:

1. canonical runtime lifecycle/event ownership;
2. mapped UI WebSocket presentation pipeline;
3. client transport/session and exact team routing;
4. shared context projection/effects;
5. Event Monitor and run-history derived presentation;
6. focused/global Vue surfaces.

No higher layer bypasses the owner immediately below it.

## Change / Refactor Sequence

1. Add server egress control contracts, status identity resolver, shared payload equality, default composition, and focused unit tests without changing production registration.
2. Move the current content buffer/timer/flush classification into the single cadence scheduler; wire it through `AgentStreamWebSocketEgress`; delete the old policy file and prove existing cadence/ordering tests unchanged.
3. Add the status transition filter before the scheduler; prove standalone, stable member, task-agent, task-team, interleaved identity, reconnect/reset, terminal flush, malformed fail-open, and canonical-subscriber preservation.
4. Add frontend mutation effect types. Modify handlers to return actual changes, starting with status/content/no-op paths and then tools, user echoes, completion/error, compaction, token usage, todo/file.
5. Add the shared agent-stream projector and route both streaming services through it. Remove the duplicate switches and unconditional timestamps.
6. Add the Event Monitor coordinator's reset/prime/commit contract and focused lifecycle tests. Convert new template contexts, projection replacement, active reuse, identity promotion, standalone/team open, live recovery hydration, historical lazy member hydration, dynamic task contexts, and removal. Keep each reset-to-prime replacement transaction synchronous and delete the old before/commit API after local submission/team-store callers move.
7. Add the tight `RunHistoryTeamExecutionRow` variants and `TeamTreeNode.executionRows`. Relocate the current stable/transient order/depth/kind/status/child composer and its behavioral tests from `utils/workspaceTeamExecutionDisplayRows*` to `stores/runHistoryTeamExecutionRows*`; preserve stable `runHistoryTeamRows` filtering. Do not yet delete the component call until the projection supplies the completed field.
8. Add run-history navigation projection/index/reconciliation and explicit stream-effect, task-mutation, focus, and topology APIs. Make it the only production caller of the combined-row composer. Seed after fetch/hydration/draft/workspace operations; publish completed execution rows/focus; patch exact status/summary/activity and focus changes.
9. Replace `ensureTaskAgentContext` cleanly with mutation-bearing `ensureTaskAgentProjection`, and tighten all task-agent/task-team helpers to return subject/context plus actual create/repair/reparent/update/remove mutation. Move all exact identity-bearing task-agent ensure/repair—including ordinary first status/content—from `teamStreamMemberContextResolver.ts` into `teamTaskExecutionEventRouter.ts`; make every router outcome's mutation required and the resolver read-only. Restrict `PRESENTATION` to changed row `DISPLAY_NAME`/`CURRENT_STATUS`; detail-only mutations return navigation `NONE`. Have `TeamStreamingService` merge router mutation before every branch, materialize pre-generic topology only when required and not immediately removed, coordinate the generic status patch, defer a first-terminal create/remove to one final topology build, merge post-message task-agent removal, and commit no more than one full build plus one required exact patch; delayed task-team cleanup remains one later operation.
10. Convert every production manual focus caller to `runHistoryStore.focusTeamMemberAndEnsureHydrated`, which updates source focus/hydration then the exact cached focus. Cover desktop, Event Monitor, mobile, duplicate/invalid focus, transient focus, and task-cleanup fallback; do not add a watcher.
11. Convert workspace tree rendering/reveal to cached workspace branches, `team.executionRows`, `row.hasChildren`, cached focus, and ancestry indexes. Remove `getLiveTeamContext` from section contracts/panel/test/browser fixture; remove component row/child construction and old utility/imports; add a minute label clock; remove dynamic builders/revision shortcuts that are no longer used.
12. Run implementation-scoped server/frontend unit and type checks, including static changed-source scans proving generic dispatchers do not assign unconditional timestamps; task helpers do not import run history; no production task topology result is discarded; resolver cannot call ensure/repair; router mutation is required/merged before every branch; `PRESENTATION` cannot carry detail fields; no deep watcher exists; old row/live-context presentation paths are absent; components do not invoke dynamic builders.
13. Preserve/hand off durable API/E2E responsibilities: exact WS regression first, aggregate browser responsiveness, collapsed/unfocused stable+nested-transient hierarchy correctness, detail-only no-navigation counts, focus after collapse/reopen, paste/fake-media probes, background correctness, then final Electron smoke.
14. Delivery synchronizes `agent_streaming.md`, `agent_execution_architecture.md`, duplicated `settings.md`, and verifies `content_rendering.md` remains correct against integrated source.

No temporary compatibility seam survives the sequence.

## Key Tradeoffs

- **Typed roles over generic middleware:** slightly more interfaces, far clearer authority and ordering. This is the approved balance between extensibility and overengineering.
- **One scheduler over composable schedulers:** adding a new filter/observer is easy; scheduling changes require editing/replacing the scheduling owner. This intentionally prevents competing buffers.
- **Canonical companions plus UI filtering:** retains self-healing internal correctness at the cost of internal event volume, while eliminating unnecessary socket/renderer volume.
- **Explicit handler effects:** requires touching many handlers, but removes repeated global discovery and makes no-op correctness testable.
- **Indexed navigation projection:** adds one derived read-model owner, but replaces O(workspaces × all teams) render work with one topology build plus exact patches.
- **Cached final Event Monitor witness:** still builds one final witness for real presentation changes; this is proportionate and safer than an immediate full incremental rewrite of latest-100 selection.
- **Explicit lifecycle hooks over lazy cache recovery:** more concrete call sites, but reset/prime occur only at real context lifecycle boundaries and keep every ordinary no-op message scan-free.
- **Actual task mutation results over a deep watcher:** task helpers must report changes, but navigation gets exact intent, one commit, and no hidden global reactivity.
- **Separate stable history tree plus completed execution rows:** adds one specialized navigation shape, but avoids corrupting stable history semantics and removes the component/live-context projection owner.
- **Field-tight task presentation:** requires helpers to compare the actual row projection, but prevents description/reference/timeline churn from touching global navigation.
- **Coordinated focus over implicit live read:** touches the finite focus caller set, but keeps source and cached display correct without a watcher or component bypass.
- **Mutation-bearing router over effect-bearing resolver:** changes one ordinary task-agent path and result contract, but restores natural command/query separation and keeps exactly one task source mutation facade.

## Risks

- A missing or incorrect handler effect could leave Event Monitor revision/retention stale. Mitigate with the existing 1,001-message, transient-eviction, attachment-echo, tool-summary, compaction, and standalone/team parity suites converted to assert effect counts.
- Exact status identity can be subtle for nested task teams. Reuse enriched canonical fields and fail open when identity is incomplete; never collapse to agent name/id alone.
- Filter order or scheduler ownership could regress terminal flush. Lock production order and cover `[content, repeated running, content, idle/error/tool]` sequences.
- Navigation invalidation callers are distributed across history, hydration, context, workspace, archive/delete, promotion, and lifecycle paths. Inventory every writer and add topology/projection count tests rather than a deep watcher fallback.
- Task projection operations can mutate root, child, task-agent, focus, detail, and cleanup state in one path. Merge actual helper results with topology precedence, classify only represented row fields as presentation, and test one-build/one-patch semantics rather than classifying by message type.
- Moving the combined row helper could either drop transient rows or accidentally duplicate them into the stable tree. Keep stable-row filtering, relocate the exact existing order/depth/status tests, and add projection/component/browser coverage before removing the old path.
- A missed manual-focus caller would leave the cached highlight stale. Convert the enumerated desktop/mobile/Event Monitor callers, add a static direct-call scan, and let topology rebuild own task-cleanup fallback focus.
- A task helper call used only for its returned context could discard topology again. Return a composite result, require router mutation on all outcomes, statically scan production call sites, and test first-message/repair/early-return paths with build counters.
- A baseline primed between conversation replacement and activity hydration would be stale. Keep reset-to-prime replacement transactions synchronous, never reset preserved subscribed live state, and cover standalone/team/template/task/lazy-hydration/removal lifecycles.
- Relative activity could stop advancing when incidental stream rerenders disappear. Use one bounded clock and explicit activity buckets.
- Actual media-device startup varies outside the app. Keep fake-device deterministic acceptance separate from final real Electron evidence.

## Guidance For Implementation

- Do not change `LifecycleStatusEventTransformer` companion frequency or canonical subscriber behavior.
- Instantiate controls per WebSocket connection through factories; never share filter/scheduler state across sessions.
- Status equality covers the complete client-visible normalized payload. Identity fields select the map entry; a change to any other client-visible field forwards immediately.
- For unresolvable status identity, forward rather than risk suppressing a meaningful transition.
- Status filter precedes the scheduler. A suppressed status cannot flush, seal, open, or reset a content window. A changed terminal status reaches the scheduler and flushes pending content first.
- Observer failures are caught/logged and never affect delivery. Do not add a production observer unless it serves an approved measurement need.
- Handler effect return values must describe actual mutation. Avoid static “message type always changed” tables inside the dispatcher.
- Use only the coordinator's `resetRecentEventMonitorBaseline` and `primeRecentEventMonitorBaseline`; lifecycle callers must not access witness/cache internals.
- Prime new empty template and live task contexts before exposure. For a wholesale replacement, reset immediately before mutation, perform conversation and activity writes without an `await` or stream-delivery gap, then prime. Preserved subscribed live contexts are never reset merely because an open/recovery payload was fetched; prime them idempotently after reuse.
- `agentContextsStore`, `agentTeamContextsStore`, both run-open coordinators, live run/team hydration, team activity hydration, historical member projection hydration, identity promotion, task context projection/removal, and run/team removal must follow the mapped lifecycle. `NONE` exits without witness/retention work even when unprimed.
- `PRESENTATION` captures/compares one final witness and never enforces retention. `STRUCTURAL` enforces exactly once, then captures/compares one final witness.
- Keep `conversation.updatedAt` accurate for real conversation mutations, but navigation must consume explicit effects/indexes rather than reactively reading it from all contexts.
- Do not use a deep Vue watch over conversations as navigation invalidation. That recreates the defect under a different name.
- Topology builders may run only from explicit topology operations. Stream content/status effects patch/no-op through indexes and cannot call a complete team builder. `runHistoryNavigationProjection.ts` is the only production caller of the stable/transient row composer.
- Keep `runHistoryTeamRows.ts` transient-free. `TeamTreeNode.executionRows` is the component-facing combined projection and must contain exact live order/depth/kind/child/display/status semantics without task-detail fields.
- Task projection helpers return composite subject/context plus actual mutation and never import run history. Replace the old context-only task-agent ensure export rather than wrapping it. No production call may ignore a mutation-bearing result. The router invokes them for every supported exact task identity and places a required mutation on every outcome.
- `teamStreamMemberContextResolver.ts` is read-only after this change: remove its `ensureTaskAgentContext` import and exact-identity creation branch; use existing exact getters/indexes only, return null for missing/mismatch, and assert it leaves context/map/tree references and contents unchanged.
- `TeamStreamingService` merges the router result before outcome branching, computes terminal cleanup intent, commits pre-generic topology only when required and not removed by the same message, then merges generic row effects and cleanup. Creation/repair/reparent/order/depth/child/removal causes at most one full build; unchanged-structure `displayName`/visible-agent-`currentStatus` causes at most one exact patch; detail-only/duplicates no-op. A first running status may have one pre-generic build and one final exact status patch, never two builds. A first offline event defers create/remove to one final topology build. Both cleanup forms return actual mutation before refresh.
- Preserve the existing delegated-task section/navigator/detail-pane reactivity for descriptions, references, arguments, timeline, and task-detail lifecycle/status. Do not route these fields through workspace navigation.
- The workspace section consumes `executionRows`, `hasChildren`, and cached focus only. Remove `getLiveTeamContext` from its state contract, panel binding, unit fixtures, and browser fixture; do not leave a compatibility alias.
- All production manual focus uses the run-history focus facade. It patches navigation only after the source context accepted the route key/hydration; duplicate/invalid focus no-ops. Task cleanup fallback focus arrives with its topology result.
- Validate task identity before source mutation where possible. If a supported path can fail after a mutation, its result must still carry the actual navigation effect; do not silently mutate then return an effect-less drop.
- Preserve current WebSocket shapes, default 500 ms setting, no-loss concatenation, progressive rich Markdown, and background subscription behavior exactly.
