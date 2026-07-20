# Agent Event Monitor Recent-Window Design Spec

## Current-State Read

The normal workspace replay path is a complete-corpus pipeline:

`row/member selection -> standalone/team GraphQL projection -> run-history projection service -> LocalMemoryRunViewProjectionProvider -> AgentMemoryService(includeArchive=true) -> all complete archive segments + active file -> historical replay events -> duplicated conversation/activity bundle -> frontend semantic dedupe -> conversation + Activity stores -> AgentConversationFeed/ActivityFeed full mount`

The local-memory provider is shared by standalone and team-member projection services and is the correct source-policy owner. It currently opts into every archive without a caller limit. The existing GraphQL boundaries correctly distinguish standalone run ID from team run ID plus member route key; their result shape does not need to change for this task.

On the frontend, historical conversion, live stream dispatch, local user submission, Activity retention, and final feed presentation each own part of the observable Event Monitor state, but no shared recent-window invariant connects them. `AIMessage` groups multiple visible segments inside one message, so message count is not a valid UI bound. Center compaction rows are sourced from Activity state and merged by the feed, which means the final presentation must account for them as visual events too. Some events remain mutable across protocol messages: streamed text/Thinking, nonterminal tool cards, and started compactions. Bottom-pinning already belongs to `AgentConversationFeed`, but there is no unseen-activity state or jump action. Both live dispatchers also update `conversation.updatedAt` for every parsed message, including messages that do not visibly change the center feed, so that timestamp cannot serve as the unseen signal.

Post-implementation source-review state: commit `d50cf2cc996e8e1bf63d5cf2dd3e2ef6735a92b5` implemented the reviewed active-only/window/completion/revision design. Its `commitRecentEventMonitorMutation(context, effect)` increments when a transient handler effect is `changed` **or** conversation enforcement removed a descriptor. `MP-CR-001` proved that, with 100 retained mutable events, a newly inserted atomic-complete event is immediately selected out as the only completed eviction candidate; the pre/post presentation is identical but the revision advances. Separately, `teamRunOpenCoordinator.mergeHydratedMembers` replaces an existing non-live member conversation without resetting the revision. The first witness revision correctly replaced those mechanics, but architecture review `AR-003` found that its proposed tool token included Activity-only `result`/`logs` and raw argument-object reference identity. `MP-AR-003` proves supported `TOOL_LOG` traffic would then advance the witness while the central `ToolCallIndicator` is unchanged. This round preserves the accepted pre/post transaction, three-file ownership, and team reset map, and corrects only the pure witness equality domain to match actual central render/retained-interaction semantics.

Constraints:

- The user approved active-file-only recent monitoring and explicitly rejected archive-navigation work for this surface.
- Successful compaction rotates settled traces into archives and rewrites active boundary-forward; active is the intended recent source, but can still be several MB when compaction has not occurred.
- Tool interactions should be reconstructed from the complete normalized active-file record set before applying the event limit; raw tail slicing can split lifecycle evidence.
- Existing raw-trace files must remain untouched and require no migration.
- Existing Thinking/tool disclosure behavior must remain unchanged.
- Existing GraphQL operation/result shapes should remain stable.

## Intended Change

Replace the normal archive-inclusive complete projection with an active-only recent projection and enforce the same product limit in frontend historical, live, Activity, and presentation owners:

1. The local-memory projection provider reads only `raw_traces_active.jsonl`.
2. It reconstructs canonical historical replay events from all normalized active records, selects the newest 100 replay events, and only then builds the existing conversation/activity projection bundle.
3. A frontend Event Monitor recent-window capability owns visual-event completion/mutability classification, completed-first eviction, deterministic oldest-mutable hard-cap fallback, and final combined presentation when center compaction rows are merged.
4. Standalone/team live dispatch and local submission use a transaction-like Event Monitor commit boundary: capture a bounded lightweight ordered presentation witness before mutation, run the existing projection handler and completed-first enforcement, capture the final witness, and increment the ephemeral per-run presentation revision at most once only when those witnesses differ. Transient handler effects do not drive the revision.
5. Activity state uses the same terminal/completed classification and caps every per-run array at 100 recent records, evicting completed candidates first and using the same deterministic hard fallback only when necessary.
6. `AgentConversationFeed` receives the explicit presentation revision, uses the derived bounded presentation, keeps existing bottom-follow behavior, and adds a localized `New activity · Jump to latest` button only when a post-baseline visible revision arrives while the user is non-pinned.
7. `AgentWorkspaceView` removes the conversation `CopyButton`, its import, and the eager `conversationText` computation. The obsolete generated localization entry is removed; no replacement copy/export action is added.

## Supplemental Solution Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval |
| --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/history-window-ui-ux-spec.md` | Defines exact recent-window, scroll, disclosure, label, and copy-removal behavior | `REQ-001`–`REQ-008`; `AC-001`–`AC-009`, `AC-011` | Constrains feed presentation and interaction; no archive affordance may be added | `Refined`; user-approved 2026-07-18 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Performance`, `Behavior Change`, `Cleanup`
- Current design issue found: `Yes`
- Root cause classification: `Missing Invariant`
- Refactor needed now: `Yes`
- Evidence: The provider reads an unbounded archive corpus; GraphQL returns it; frontend conversation and Activity hydration use quadratic scans; historical/live state and mounted components have no duration-independent bound. A real run produced a 47.54 MB response and 27.9 seconds of client dedupe. Even the largest observed active-only file produced 609 conversation entries, 379 activities, 9.09 MB, and ~906 ms of current client dedupe.
- Design response: Put active-only/recent selection in the shared run-history provider; keep one lifecycle-aware frontend Event Monitor window capability with completed-first eviction and a deterministic hard fallback; make the authoritative mutation boundary compare bounded pre/post presentation witnesses before revising run state; reset every conversation-replacement baseline including team reopen; cap Activity using the same completion policy; and defend the final merged presentation in the feed.
- Refactor rationale: Scattering `slice(-100)` across resolvers, handlers, and templates would encode different meanings (raw record, message, segment, activity, feed row) and would inevitably drift. The new capability makes the user-approved visual-event meaning explicit and testable.
- Intentional deferrals and residual risk: The bounded GraphQL bundle still duplicates tool details between conversation and Activity; one event can still be byte-heavy; active-team restore may still request several bounded member projections. These are finite after this change and do not justify a new timeline schema or focus-lazy orchestration without new evidence.

## Architecture Review Finding Resolution

| Finding ID | Round-1 Concern | Revised Design Resolution | Verification |
| --- | --- | --- | --- |
| `AR-001` | Blind oldest-edge trimming could evict a still-mutable segment while completed candidates existed, and the hard-bound edge was only a residual risk. | The window capability now classifies each visual event, evicts oldest completed candidates first, and uses oldest-mutable eviction only for remaining overflow after completed candidates are exhausted. Stable-identity late updates can create at most one source-limited newest-edge representation; no retained duplicate or archive read. | Mixed completed/mutable, 101-all-mutable, late-update re-entry, tool/compaction terminality, and Activity-store tests. |
| `AR-002` | `conversation.updatedAt` changes for non-visible protocol traffic and could falsely show unseen activity. | `AgentRunState.eventMonitorPresentationRevision` remains the explicit ephemeral signal, but the downstream-reviewed implementation supersedes the handler-effect mechanism with a net bounded witness comparison. Non-visible/no-op/net-identical commits do not bump. Hydration/run replacement resets the baseline. | Witness equality tests, protocol matrix, and feed pinned/non-pinned/reset tests. |
| `CR-001` | The implemented handler-effect OR enforcement-removal commit bumped for a transient appended event that enforcement removed, although final presentation was identical. | `beginRecentEventMonitorMutation` captures the ordered bounded witness before the handler; `commitRecentEventMonitorMutation` enforces, captures the final witness, and bumps only when `areRecentEventMonitorPresentationWitnessesEqual` is false. The old effect parameter/OR condition is removed from the authoritative commit contract. | Exact `MP-CR-001` regression plus ordinary retained update, real eviction-only, compaction, membership/order, and no-op cases. |
| `CR-002` | Reused non-live team-member conversation replacement omitted revision reset. | `teamRunOpenCoordinator.mergeHydratedMembers` resets immediately after assigning the hydrated conversation in the `preserveLiveRuntimeState:false` branch. The live-preservation branch leaves conversation and revision untouched. | Focused same-member reopen tests for both non-live replacement and subscribed-live preservation. |
| `AR-003` | Proposed witness tokens included non-rendered tool result/log state and raw argument reference identity, while omitting an exact per-kind central render contract. | The pure witness now follows the complete per-kind table below. Tool tokens use the same derived card input/summary helper as the wrappers/`ToolCallIndicator`, exclude result/log/raw argument identity, and compare semantic status/summary/error/action primitives. User attachments, usage rows/footer, every static/media/error/inter-agent kind, and exact compaction primitives are explicit. | `MP-AR-003` log/result no-op tests; equal-argument replacement; true tool card change; complete per-kind, membership/order, and no-recursion witness tests. |

## Terminology

- **Active raw-trace file:** `raw_traces_active.jsonl` for the selected run/member.
- **Archived raw-trace segment:** A completed `raw_traces_<index>.jsonl` referenced by the manifest; never read for normal Event Monitor projection after this change.
- **Canonical replay event:** One ordered `HistoricalReplayEvent` after active-file normalization and tool lifecycle reconstruction.
- **Visual event:** One user message, one assistant segment/card, or one eligible center-timeline compaction row. Streaming deltas/status updates of an existing segment/card are updates, not additional events.
- **Completed visual event:** An event with no expected visible lifecycle mutation: atomic user/static notification/inter-agent/media/error after insertion; text/Thinking after segment end or containing AI-message completion; tool/file/terminal after terminal status; compaction after completed/failed.
- **Mutable visual event:** Streamed text/Thinking without completion, a tool-like card in parsing/parsed/awaiting-approval/approved/executing, or a compaction in requested/started. When evidence is ambiguous inside an incomplete AI message, classify conservatively as mutable.
- **Recent window:** At most 100 events in chronological display order. The selector protects mutable events by evicting oldest completed candidates first; remaining capacity is filled by the newest completed events. Only if completed candidates cannot satisfy overflow does the hard fallback remove oldest mutable events.
- **Visible-presentation revision:** An ephemeral `AgentRunState` counter incremented once per committed mutation only when the bounded central presentation actually changes. It is unrelated to `conversation.updatedAt`.
- **Presentation witness:** An ordered, ephemeral, at-most-100 visual-token description of the final center presentation plus one derived total-usage scalar. Each token contains stable visual/interaction identity where one exists and only shallow semantic primitives used by the actual central render path or its retained interaction. It does not retain a second timeline, use raw object identity as presentation truth, or recursively serialize arguments/results.
- **Net bounded-presentation change:** Inequality between the witness captured immediately before mutation and the witness captured after mutation plus enforcement.
- **Pinned/latest:** The Event Monitor is within the existing 40-pixel near-bottom threshold.

## Design Reading Order

1. Stored traces are directly usable; no migration.
2. Backend recent projection is the primary read spine.
3. Historical hydration and live dispatch converge on one frontend window capability.
4. Activity and presentation provide bounded local guards.
5. Feed scrolling and header cleanup complete the visible change.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Remove the archive-inclusive setting from the normal local projection path, remove the unbounded normal Event Monitor state behavior, and remove the header copy control/full-text derivation and its now-unused generated translation keys.
- No `includeArchive` feature flag, alternate full-history query, compatibility wrapper, or hidden copy fallback will be retained for the replaced behavior.
- Archive files remain persisted data, not a legacy execution path; their storage/writing is outside this change and remains intact.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: JSONL trace records in per-run memory directories under `memory/agents/<runId>/` and hierarchical `memory/agent_teams/<...>/<memberRunId>/`; active file, optional complete segment files, optional manifest. Observed corpus was roughly 209 MB team + 27 MB standalone; largest active-only file observed was 5,078,533 bytes / 988 rows.
- Relevant code-model, serialization, semantic, or physical-store change: No schema, writer, serialization, or physical layout change. Only normal projection file selection and derived event retention change.
- Normal reader/writer behavior and representative evidence: Existing `AgentMemoryService` already reads active-only when `includeArchive` is false; normalization is version-agnostic for current trace records. Rotation writer continues unchanged.
- Required semantics and invariants under direct use: Active records sort deterministically; tool interactions use all active records; newest replay events preserve chronological order; no projection read writes any trace file.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: No rewrite, deletion, migration, downtime, or raw-payload evidence retention.
- Decision: `Directly Usable — No Migration`
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: Current files already provide the approved source. A migration would not address unbounded reads and would add unnecessary I/O/corruption/recovery risk.
- Acceptance criteria or design constraints supported by this decision: `AC-001`, `AC-002`, `AC-010`; archived files remain byte-for-byte untouched and active-only/manifests work immediately.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | Run/member projection request | Bounded projection response | `LocalMemoryRunViewProjectionProvider` | Eliminates archive work and bounds normal transport |
| `DS-002` | `Primary End-to-End` | Projection response commit | Bounded hydrated conversation/Activity | Run hydration services + recent-window capability | Prevents historical state/mount growth |
| `DS-003` | `Return-Event` | Standalone/team live message or local submission | Bounded live state + actual presentation revision | Streaming/submission boundary + recent-window capability | Prevents multi-day growth without false unseen signals |
| `DS-004` | `Bounded Local` | Conversation + compaction props + presentation revision | Completed-first ≤100 rendered feed + scroll state | `AgentConversationFeed` | Enforces exact visual bound and truthful jump UX |
| `DS-005` | `Bounded Local` | Activity insert/upsert | Bounded per-run Activity array | `agentActivityStore` | Prevents hidden secondary state growth |

## Primary Execution Spine(s)

- `DS-001`: `GraphQL standalone/team resolver -> projection service -> LocalMemoryRunViewProjectionProvider -> AgentMemoryService(active only) -> active raw traces -> buildHistoricalReplayEvents -> selectRecentReplayEvents(100) -> buildRunProjectionBundleFromEvents -> existing GraphQL response`
- `DS-002`: `GraphQL projection response -> run context hydrator -> buildConversationFromProjection -> enforceRecentConversationWindow -> hydrateActivitiesFromProjection -> agentActivityStore bounded inserts -> AgentEventMonitor`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | Resolve the existing explicit run subject, read only its active file, reconstruct active lifecycle evidence, take the newest 100 replay events, and return the existing bundle shape. | Run source descriptor, active traces, historical replay events, projection | Local-memory projection provider | Deterministic ordering, source-limited boundary fidelity, no disk writes |
| `DS-002` | Convert the already bounded response, defensively enforce the visual-event policy, and commit recent conversation/Activity state for the selected context. | Projection entries, Conversation, RunActivity | Hydration services + recent-window policy | Dedupe remains but is bounded; selection-staleness remains existing owner concern |
| `DS-003` | Capture the current bounded ordered presentation witness, route the live/local mutation through existing handlers, enforce completed-first retention, capture the final witness, and increment the run revision once only when the witnesses differ. | ServerMessage/local submission, AgentContext, pre/post witness, revision | Event Monitor mutation commit used by streaming/submission owners | Tool lifecycle updates, task-agent routing, Activity compactions, browser side effects |
| `DS-004` | Merge message/segment and eligible compaction descriptors, apply the same completed-first selector (oldest-mutable fallback only when unavoidable), regroup retained assistant segments, and react only to explicit post-baseline revisions for pinned/unseen scroll state. | Classified visual descriptors, feed groups, revision | Agent conversation feed + presentation selector | Localization, keyboard/focus, dynamic-height content |
| `DS-005` | Dedupe/effectively update an Activity, append/update, evict oldest terminal/completed overflow before mutable overflow, recompute approval state, and clear an evicted highlight. | Per-run Activity state | Activity store | Approval/highlight consistency |

## Spine Actors / Main-Line Nodes

- Existing standalone and team-member GraphQL resolvers/services: thin subject boundaries.
- `LocalMemoryRunViewProjectionProvider`: governs normal replay source and server event window.
- `AgentMemoryService`: existing active-file reader facade.
- Replay transformer/projection utilities: existing lifecycle and output transformations.
- Historical hydration services: commit bounded projection state.
- `AgentStreamingService`, `dispatchGenericTeamMemberMessage`, and `localUserSubmission`: live/local mutation boundaries.
- `recentEventMonitorWindow.ts`: frontend visual-event counting/trimming/presentation policy.
- `AgentRunState.eventMonitorPresentationRevision`: explicit per-run visible-change signal and hydration baseline.
- `agentActivityStore`: secondary bounded Activity state.
- `AgentConversationFeed`: mounted presentation and scroll state.

## Ownership Map

- The provider owns **what normal history source is allowed** and the maximum canonical events returned. Resolvers must not choose archive policy or pass optional legacy behavior.
- The memory service owns file reading/normalization choices; it must not know Event Monitor presentation semantics.
- The frontend recent-window capability owns **what counts as a visual event**, completion/mutability, candidate selection, hard fallback, and how conversation/presentation is trimmed. Streaming handlers must not each implement slices or unseen policy.
- Existing handlers own protocol projection mutations only. They may keep narrow internal change returns where useful for handler composition, but those returns are not authoritative revision inputs and obsolete cross-boundary `EventMonitorPresentationMutation` plumbing is removed.
- The Event Monitor mutation commit owns the pre-mutation witness, post-enforcement witness, equality decision, and single revision bump. Streaming/submission boundaries own sequencing around their handler call.
- `AgentRunState` owns the ephemeral revision counter/reset; it does not decide whether a protocol type is visible.
- Activity store owns its separate record cap, terminality selection, and internal derived flags. Center-eligible compactions enter the same final presentation witness through an explicit store adapter at the commit boundary.
- `AgentConversationFeed` owns bottom proximity, unseen baseline, jump behavior, and use of the final bounded presentation/revision; it must not infer activity from generic timestamps or fetch history.
- `AgentWorkspaceView` owns composition only and no longer owns conversation serialization.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `getRunProjection(runId)` GraphQL resolver | Agent run projection service/provider | Standalone subject authorization/transport | Archive or window policy |
| `getTeamMemberRunProjection(teamRunId, memberRouteKey)` resolver | Team-member projection service/provider | Explicit compound team-member identity | Archive or window policy |
| `AgentMemoryService.getRunMemoryView` | Memory store | Composes selected memory artifacts | Event Monitor event counting |
| `AgentEventMonitor.vue` | Conversation feed + Activity/composer children | Layout/composition | Recent event selection algorithm |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `includeArchive: true` in normal local projection | Violates approved recent-only behavior | Active-only provider policy | `In This Change` | No alternate flag/path retained |
| Complete unbounded replay-event bundle for normal UI | Causes payload/client/DOM growth | `selectRecentReplayEvents` | `In This Change` | Archives remain stored |
| Unbounded live conversation retention | Multi-day live run regrows problem | `recentEventMonitorWindow.ts` at mutation exits | `In This Change` | Completed-first policy plus hard fallback; do not scatter slices |
| Generic timestamp as unseen trigger | `conversation.updatedAt` includes non-visible protocol traffic | Explicit `AgentRunState.eventMonitorPresentationRevision` | `In This Change` | Generic timestamp remains bookkeeping only |
| Implemented transient `EventMonitorPresentationMutation` OR enforcement commit | Cannot distinguish append-then-evict net no-op (`CR-001`) | Bounded begin/post witness equality | `In This Rework` | Remove authoritative effect parameter and obsolete dispatcher propagation |
| Unbounded Activity arrays | Hidden panel/state still grows | Store-owned cap helper | `In This Change` | Recompute flags after eviction |
| Header `CopyButton` usage/import and `conversationText` computed | User does not use it; eager O(history) work | No replacement | `In This Change` | Common `CopyButton.vue` remains for other consumers |
| `copy_full_conversation` generated translations if unused globally | Dead catalog entries | Removed with component action | `In This Change` | Verify repository localization generation convention |

## Return Or Event Spine(s) (If Applicable)

- `DS-003` standalone: `WebSocket ServerMessage -> beginRecentEventMonitorMutation(context) -> handler mutation -> commitRecentEventMonitorMutation(context, baseline) -> completed-first enforcement -> post witness compare -> optional single revision bump -> render`
- `DS-003` team: `Team WebSocket ServerMessage -> task-execution routing/explicit member resolution -> begin witness -> generic member handler -> same commit/compare -> optional single revision bump -> member render`
- `DS-003` local user: `composer submission -> begin witness -> local user append -> same commit/compare -> optional revision bump -> transport send continues`

Task-execution messages returning `memberContext` still flow through the generic dispatcher and receive enforcement. Messages handled entirely by task/team structural projection currently do not append conversation visual events; tests must lock that assumption. If implementation discovers a conversation-mutating handled branch, enforcement belongs in that projection owner before its handled return, not in `TeamStreamingService` as an unrelated global scan.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `recentEventMonitorWindow.ts`
  - Chain: `flatten conversation to classified descriptors -> overflow count -> repeatedly remove oldest completed candidate -> if overflow remains remove oldest mutable candidate -> trim matching whole messages/segments in place -> return {presentationChanged, completedEvictions, forcedMutableEvictions}`
  - Why: Preserves mutable identities whenever possible, enforces the hard maximum in every reachable state, and preserves Vue object/array reactivity.
- Parent owner: `recentEventMonitorWindow.ts` presentation selector
  - Chain: `conversation visual descriptors + eligible center compactions -> classify/sort deterministically -> completed-first selection with oldest-mutable fallback -> regroup adjacent retained descriptors from same AI message -> render groups`
  - Why: Center compactions share the exact final mounted bound and lifecycle policy without repeating the avatar for every retained assistant segment.
- Parent owner: `agentActivityStore`
  - Chain: `validate/dedupe/effective-change check -> insert/upsert -> terminal/completed-first overflow selection -> oldest-mutable fallback -> clear evicted highlight -> recompute awaiting flag -> return actual effect`
  - Why: Keeps secondary state consistent and bounded without dropping an awaiting/executing item while terminal candidates exist.
- Parent owner: Event Monitor mutation commit
  - Chain: `capture pre witness from current bounded conversation + center compactions -> mutate -> enforce -> capture post witness from final bounded presentation -> ordered shallow-token equality -> if unequal increment AgentRunState revision once`
  - Why: Only this boundary sees both sides of the authoritative bounded transition. It rejects transient append-then-evict no-ops while detecting retained content changes and real eviction/order/membership changes without deep serialization.
- Parent owner: `AgentConversationFeed`
  - Chain: `run/revision reset -> establish baseline and clear unseen; revision increment -> if pinned auto-scroll else mark unseen; non-visible/no revision -> no change; jump/manual bottom -> clear unseen/pin`
  - Why: Keeps scrolling local to the actual scroll container.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization | `DS-004` | Feed UX | English/zh-CN jump label and catalog cleanup | User-visible/action accessibility | Hard-coded text or stale generated keys |
| Accessibility | `DS-004` | Feed UX | Real button, focus, no token-spam live region | Keyboard/screen-reader parity | Stream handlers become UI-aware |
| Deterministic ordering | `DS-001`, `DS-004` | Provider/presentation | Preserve normalized time/order tie break | Stable newest selection | Resolver-specific drift |
| Net witness capture/equality | `DS-003`, `DS-004` | Event Monitor commit/feed | Distinguish final bounded change from protocol no-ops and transient changes removed by enforcement | Truthful unseen button with O(100) shallow work | Handler effects/timestamps/deep serialization false positives or cost |
| Source-limited tool evidence | `DS-001` | Replay transformer/provider | Graceful active-only boundary behavior | Call may be archived while result active | Hidden archive read defeats performance |
| Selection races | `DS-002` | Existing hydrators/open coordinators | Preserve current stale-response guards | Switching rows during request | Window helper owning network lifecycle |
| Performance evidence | All | API/E2E | Measure payload/TTFB/hydration/browser behavior | Validate user problem | Production code contains benchmarking logic |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Active-only file read | Agent memory service/store | `Reuse` | Already supports `includeArchive: false` | N/A |
| Replay lifecycle reconstruction | Run-history transformers | `Reuse` | Correctly combines active tool records | N/A |
| Server recent event selection | Run-history projection | `Extend` | Policy belongs next to provider output | N/A |
| Frontend lifecycle-aware visual window | No current owner | `Create New` | Hydration, streaming, submission, and feed need one count/completion/selection meaning | Generic utils or one handler would hide capability ownership |
| Net visible-change signal | Existing effect-OR-enforcement commit is insufficient | `Create New` within Event Monitor | A bounded pre/post witness is the smallest owner with enough information; at most 100 shallow tokens | Timestamp/effect alternatives cannot prove net equality |
| Scroll pinning | Agent conversation feed | `Extend` | Existing 40px threshold and scroll element already owned here | N/A |
| Activity cap | Activity store | `Extend` | Store owns array and flags | N/A |
| Copy control cleanup | Workspace view | `Reuse`/remove | Remove local usage; shared CopyButton remains elsewhere | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Server run-history projection | Active-only normal source and newest replay-event selection | `DS-001` | Local-memory provider | `Extend` | No GraphQL schema change |
| Agent memory | Active JSONL read/normalize | `DS-001` | Memory service/store | `Reuse` | No Event Monitor constant here |
| Web Event Monitor window | Visual-event definition, completion classification, completed-first trim, hard fallback, presentation selection, witness/equality, mutation commit | `DS-002`–`DS-004` | Hydration/stream/feed | `Extend` | Split pure witness from stateful commit adapter to keep files tight |
| Web streaming/submission | Bracket mutation with begin/commit witness calls | `DS-003` | Existing dispatchers/submission | `Extend` | Handlers remain lifecycle-focused and do not own revision truth |
| Web Activity store | Recent activity retention | `DS-002`, `DS-005` | Pinia store | `Extend` | Same numeric contract, separate record meaning |
| Web workspace components | Feed scroll/jump and copy removal | `DS-004` | Feed/workspace view | `Extend` | Disclosure components unchanged |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `recent-run-projection-policy.ts` | Server run history | Projection policy | Constant + newest replay-event selector | Singular server projection policy | `HistoricalReplayEvent` |
| `recentEventMonitorWindow.ts` | Web Event Monitor | Pure window capability | Classify/count/select/trim/presentation | One coherent lifecycle-aware visual-window meaning | Conversation and compaction types |
| Existing provider | Server run history | Provider | Active-only read, reconstruct then select | Existing governing owner | Selector |
| `recentEventMonitorPresentationWitness.ts` | Web Event Monitor | Pure witness owner | Build/equal ordered shallow presentation tokens | One bounded semantic representation; no persistence | Presentation items/types |
| `toolCardPresentation.ts` | Web conversation presentation | Pure shared card model | Derive wrapper-specific tool name/arguments, status presentation key, summary, error, and actionable target primitives | Renderer and witness consume the same semantic card contract | `getToolDisplaySummary` + segment types |
| `recentEventMonitorUsagePresentation.ts` | Web Event Monitor | Pure shared usage presentation | Derive per-message cost text and retained-window total usage text | Feed and witness compare the same formatted output | Conversation/presentation item types |
| `recentEventMonitorMutationCommit.ts` | Web Event Monitor | Stateful mutation adapter | Resolve center compactions, begin baseline, enforce, capture final, compare, bump | Separates store access/sequencing from pure policy | Witness + window + run state |
| Existing center-mutating handlers | Web streaming | Projection mutations | Keep protocol mutation behavior; remove obsolete revision-effect plumbing | Revision truth moves to authoritative witness boundary | No window logic |
| Existing hydration/dispatch/open files | Web hydration/stream/open | Mutation/replacement boundaries | Bracket mutations; reset all replaced conversations | Correct sequencing owner | Window capability |
| `AgentRunState.ts` | Web run state | Ephemeral UI runtime state | Own presentation revision counter/reset | Per-run signal belongs with run state | No protocol classification |
| Existing feed/store/view | Web UI/state | Local owners | Jump/presentation, cap, copy removal | Existing responsibility locations | Window capability/constant |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Frontend visual-event classification, selection, and trimming | `services/eventMonitor/recentEventMonitorWindow.ts` | Event Monitor | Used by hydration, live mutation, Activity-aligned presentation, and rendering | `Yes` — one count/completion rule | `Yes` — no separate historical/live slice rules | Generic catch-all UI utility |
| Ordered `RecentEventMonitorPresentationWitness` | `services/eventMonitor/recentEventMonitorPresentationWitness.ts` | Event Monitor | Begin/commit need one bounded net-equality structure | `Yes` | `Yes` — replaces transient effect semantics | Stored timeline, deep payload copy, or generic object serializer |
| Tool-card render semantics | `utils/toolCardPresentation.ts` extending `getToolDisplaySummary` | Conversation presentation | Four wrappers, `ToolCallIndicator`, and witness must agree on effective tool name/args/status/summary/action | `Yes` | `Yes` — removes wrapper-vs-witness derivation drift | Activity detail/result model |
| Event Monitor usage strings | `services/eventMonitor/recentEventMonitorUsagePresentation.ts` | Event Monitor | Feed rows/footer and witness must use identical formatting/presence rules | `Yes` | `Yes` — no raw-cost false positives below rendered precision | Full-run accounting service |
| Backend recent replay-event selection | `run-history/projection/recent-run-projection-policy.ts` | Run-history projection | Provider tests and provider share named limit | `Yes` | `N/A` | Storage reader or GraphQL paging abstraction |

The numeric value `100` exists once per independently built server/web application. This is an explicit cross-application product contract verified by tests, not a reason to make the web depend on a server-internal file. Requirements remain the authority.

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `HistoricalReplayEvent[]` selected by server policy | `Yes` | `N/A` | `Low` | Select only after lifecycle build |
| Frontend visual-event descriptor | `Yes` — kind/source/timestamp/order/render reference | `Yes` | `Low` | Keep internal to Event Monitor capability |
| `RecentEventMonitorPresentationWitnessToken` | `Yes` — stable identity plus per-kind semantic primitives only | `Yes` | `Low` | Explicit table/builders; reuse tool/usage presentation helpers; forbid raw references and generic recursive serialization |
| `Conversation` retained window | `Yes` for UI session state | `No` — existing derived fields remain | `Medium` | Trim segments/messages in place; do not create a second stored timeline |
| `RunActivity[]` | `Yes` | Existing conversation overlap remains | `Medium` | Bound to 100; schema redesign deferred |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/projection/recent-run-projection-policy.ts` | Server run history | Internal projection policy | Export limit and pure `selectRecentReplayEvents` | Small, singular, testable policy | Historical replay type |
| `.../providers/local-memory-run-view-projection-provider.ts` | Server run history | Normal local provider | Read active only, build all active replay events, apply selector, build bundle | Existing authority | Policy selector |
| `autobyteus-web/services/eventMonitor/recentEventMonitorWindow.ts` | Web Event Monitor | Pure window capability | Export limit; classify/select/trim; build bounded presentation | Existing coherent UI policy; remove stateful commit from near-threshold file | Conversation/activity types |
| `autobyteus-web/services/eventMonitor/recentEventMonitorPresentationWitness.ts` | Web Event Monitor | Pure witness owner | Convert final presentation items to ordered shallow tokens and compare | Singular net-presentation meaning; O(100), no deep serialization | Store access, mutation, revision bump |
| `autobyteus-web/utils/toolCardPresentation.ts` | Web conversation presentation | Shared pure tool-card contract | Resolve effective wrapper inputs, semantic status key, `getToolDisplaySummary` output, error, and approval/highlight interaction primitives | Both current card renderer path and witness call it, preventing `AR-003` drift | Tool result/log/detail state |
| `autobyteus-web/services/eventMonitor/recentEventMonitorUsagePresentation.ts` | Web Event Monitor | Shared pure usage formatter | Produce exact per-message and retained-total strings used by feed and witness | Prevents raw numeric changes that round to the same UI from falsely revising | Store access/full-run accounting |
| `autobyteus-web/services/eventMonitor/recentEventMonitorMutationCommit.ts` | Web Event Monitor | Stateful commit boundary | Get center compactions, capture baseline, enforce/capture final, compare, bump revision | Only owner with both states and store adapter | Handler protocol switch or feed scroll logic |
| `.../runHydration/runProjectionConversation.ts` | Web hydration | Historical converter | Enforce window on built conversation before return/commit | Existing conversion boundary | Window capability |
| `.../agentStreaming/handlers/*` | Web streaming projection | Mutation owners | Preserve protocol mutations and segment completion; remove obsolete cross-boundary revision-effect plumbing unless still narrowly needed internally | Net witness supersedes effect contract | Window/revision decisions |
| `.../agentStreaming/handlers/segmentIdentity.ts` | Web streaming projection | Stream segment identity | Extend identity metadata with presentation lifecycle completion set by `SEGMENT_END` | Existing segment identity owner | No window selection |
| `.../agentStreaming/AgentStreamingService.ts` | Web streaming | Standalone dispatcher | Begin witness before switch; commit after switch | Existing mutation sequencer | Commit boundary |
| `.../agentStreaming/teamStreamGenericMessageDispatcher.ts` | Web streaming | Team member dispatcher | Begin/commit around generic member mutation | Existing team mutation sequencer | Commit boundary |
| `.../runSubmission/localUserSubmission.ts` | Web submission | Local append boundary | Begin before append; commit after append | User message mutation sequencer | Commit boundary |
| `autobyteus-web/types/agent/AgentRunState.ts` | Web run state | Ephemeral revision owner | Counter, bump, reset on hydration/context replacement | Explicit per-run signal | N/A |
| `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | Web run open | Team context merge/replacement | Reset revision after non-live conversation replacement; preserve on subscribed-live state preservation | Missing production path from `CR-002` | Window/revision comparison algorithm |
| `autobyteus-web/stores/agentActivityStore.ts` | Web Activity | Store | Completed-first cap, hard fallback, actual effect, derived-state repair | Store owns all Activity mutation | Web classifier/limit |
| `.../AgentConversationFeed.vue` | Web workspace UI | Feed/presentation | Consume bounded presentation/revision; baseline/pinned/unseen/jump behavior | Existing scroll owner | Presentation selector |
| `.../AgentEventMonitor.vue`, standalone/team parents | Web workspace UI | Explicit prop boundary | Pass run-state presentation revision to feed | Avoid hidden store lookup | Numeric revision only |
| `.../AgentWorkspaceView.vue` | Web workspace UI | Composition | Remove copy action/import/derived text | Cleanup stays local | N/A |
| `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts` and managed catalog outputs as required | Localization | Catalog | Add jump label; remove obsolete copy key | Existing localization ownership | N/A |
| Existing colocated unit/component specs | Respective subsystem | Verification | Lock source/window/live/scroll/copy invariants | Tests remain near owners | Shared fixtures/helpers as existing |

## Ownership Boundaries

- GraphQL identity boundaries remain authoritative public entrypoints. They delegate source/window policy to the provider.
- The provider may ask the memory service for active traces, but may not bypass it with direct filesystem code.
- The server recent selector accepts canonical replay events, not raw trace records; storage remains ignorant of display count.
- The window, witness, tool-card presentation, and usage-presentation owners are pure except for explicit in-place conversation enforcement and perform no network/store access. The separate mutation-commit adapter is the only Event Monitor file allowed to read center compactions from the Activity store or bump run state.
- Dispatchers bracket handler mutation with the Event Monitor begin/commit boundary. Low-level lifecycle handlers remain unaware of global retention/unseen policy; their transient effect is not revision authority.
- Feed presentation receives conversation/Activity data and performs no state hydration or archive access.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Local-memory projection provider | Active memory view, replay build, recent select, bundle build | Standalone/team projection services | Resolver reads memory files or opts into archives | Extend provider policy |
| `enforceRecentConversationWindow` | Lifecycle classification and completed-first in-place trim with hard fallback | Hydration, streaming, submission | Caller uses `messages.slice(-100)` or handler-specific eviction | Extend shared capability |
| `beginRecentEventMonitorMutation` / `commitRecentEventMonitorMutation` | Capture pre witness; enforce/capture/compare final witness; bump at most once | Standalone/team dispatch and submission | Caller uses effect OR eviction, timestamp, or post-only inference | Extend shared capability |
| `buildRecentEventMonitorPresentationWitness` | Per-kind semantic tokenization, derived retained-total usage, and ordered equality | Mutation commit | Caller serializes conversation/tool payloads or compares Activity-only state | Extend pure witness owner/table |
| `buildRecentEventMonitorPresentation` | Flatten/sort/select/regroup messages+compactions | Agent conversation feed | Template separately slices messages/activities | Extend presentation result |
| Activity store actions | Validation/dedupe/cap/derived flags | Activity hydration and streaming projections | Direct mutation of internal map arrays | Add store action/helper |

## Dependency Rules

1. GraphQL resolver/service -> projection provider -> memory service/store; no reverse or direct filesystem shortcut.
2. Provider -> replay transformer -> recent selector -> bundle builder. Never apply `rawTraceLimit: 100` before lifecycle reconstruction.
3. Web hydration/stream/submission may import the Event Monitor commit boundary. Pure window/witness files may import domain types and the narrow tool/usage/attachment/compaction presentation helpers named in the witness table; the stateful commit adapter may import the Activity store solely to resolve center compactions for witness capture.
4. Feed may import presentation selection; window service must not import/render Vue components.
5. Activity store may import the shared web limit/completion classifier for Activity-compatible kinds, but the window capability must not mutate the Activity store.
6. No archive read is allowed as an error fallback, tool-lifecycle repair, empty-state fallback, or compatibility path.
7. No component or dispatcher may infer unseen activity from `conversation.updatedAt`, protocol type, transient handler effect, enforcement removal alone, raw object-reference replacement, Activity-only tool result/log state, full-history serialization, or a deep watcher.
8. No component may reintroduce full-conversation joining during render.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `getRunProjection(runId)` | Standalone run | Return normal recent projection | Nonempty run ID | Shape unchanged |
| `getTeamMemberRunProjection(teamRunId, memberRouteKey)` | Explicit team member | Return member recent projection | Team run ID + member route key | Shape unchanged |
| `selectRecentReplayEvents(events)` | Canonical replay list | Newest 100, preserve order | `HistoricalReplayEvent[]` | Pure; no I/O |
| `enforceRecentConversationWindow(conversation, limit?)` | One run conversation | Classify and mutate with completed-first eviction/hard fallback; return eviction metadata | Explicit `Conversation` | Default limit 100; test override only if useful |
| `buildRecentEventMonitorPresentation(conversation, compactions, limit?)` | Central feed presentation | Completed-first combined selection/regrouped rows | Conversation + typed compaction array | Pure; no store lookup |
| `beginRecentEventMonitorMutation(context)` | One live/local mutation baseline | Capture current final bounded witness including center compactions | Explicit `AgentContext` | Must run immediately before mutation |
| `commitRecentEventMonitorMutation(context, baseline)` | One live/local mutation result | Enforce, capture final witness, compare, and bump once iff unequal | Explicit `AgentContext` + `RecentEventMonitorPresentationWitness` | Removes old effect parameter/OR condition |
| `buildRecentEventMonitorPresentationWitness(items)` | Bounded presentation | Produce ordered per-kind semantic tokens plus derived total-usage text | `RecentEventMonitorPresentationItem[]` | Max 100 visual tokens; exact table below; no recursive serialization |

## Central Presentation Witness Contract (`AR-003`)

The equality domain is the central `AgentConversationFeed` render and the interactions retained inside its cards, not the sibling Activity model and not every field present on a conversation object. The witness shape is:

`{ tokens: RecentEventMonitorPresentationWitnessToken[]; totalUsageText: string }`

`tokens` follows the exact final order returned by `buildRecentEventMonitorPresentation`; grouped AI rows are expanded to one token per retained segment, so there are at most 100 visual tokens. Each token contains a `kind`, the stable event identity when the domain has one, and the ordered primitive values listed below. When there is no stable domain identity, `kind + final visual ordinal` is the fallback; source-object identity is never used. The per-row usage string is attached to the user token or the last retained segment token of the actual AI row. `totalUsageText` is derived once from the same retained presentation items as the feed footer. Equality is length/order/kind/identity plus `Object.is` over primitive slots and direct ordered primitive lists; it never performs generic object walking.

| Visual kind / current render path | Semantic witness values, in addition to ordered identity | Deliberately excluded | Why this exactly matches central render / retained interaction |
| --- | --- | --- | --- |
| User message — `AgentConversationFeed -> UserMessage` | `message.text`; ordered attachment tuples `(id, kind, locator, displayName, type)`; exact derived message-usage string | Timestamp; attachment object reference; uploaded `storedFilename`/`phase` (unused by current component) | Text is rendered directly. Attachment tuple covers Vue key/failure state, label/ARIA, image-vs-chip preview input, and click destination input. The row usage string covers its actual presence and four-decimal formatting. |
| Assistant text — `AIMessage -> TextSegment -> MarkdownRenderer` | `content`; exact AI-row usage string on the row's last retained segment token | `AIMessage.text`, reasoning/media aggregate fields, message completion, timestamp | Segment content is the render authority. Container-derived fields are not rendered; completion affects selection, so any resulting membership/order change is already reflected. |
| Thinking — `AIMessage -> ThinkSegment` | `content`; exact AI-row usage string on the row's last retained segment token | Disclosure component's local `showContent` ref | The collapsed label is static, but content is central retained interaction state and is rendered when the user explicitly expands the card. Local expansion/collapse is not stream activity. |
| Generic tool call — `ToolCallSegment -> ToolCallIndicator` | Shared effective tool-card presentation: `invocationId`, rendered `toolName` default, derived status-presentation key, `getToolDisplaySummary(..., {preferCompactPath:true})` output `(kind,text,title)` or null, rendered `errorMessage`, and awaiting-approval target primitives; exact AI-row usage string when last | Raw `arguments` reference; `rawContent`; `result`; `logs`; logs length/last log; Activity context | The indicator renders only name, semantic summary/title/class, status icon/tone/control mode, and error. Invocation/approval target governs its retained highlight/approve/deny interaction. Result/log detail is only in Activity and cannot revise the center card. |
| Terminal command — `TerminalCommandSegment -> ToolCallIndicator` | Same shared tool-card values, with effective args equal to top-level arguments plus `command` fallback exactly as the wrapper uses | `description`; raw args reference; result/logs | A command change matters only through the shared redacted command summary/title. Equal argument-object replacement therefore remains equal. |
| Write-file card — `WriteFileCommandSegment -> ToolCallIndicator` | Same shared tool-card values, with effective args `{path: segment.path}` and default name `write_file` | `originalContent`, `highlightedContent`, `language`, raw arguments, result/logs | Current wrapper exposes only the path-derived compact summary plus common card state. File contents are not central card content. |
| Edit-file card — `EditFileCommandSegment -> ToolCallIndicator` | Same shared tool-card values, with effective args `{path: segment.path}` and default name `edit_file` | Patch/original content, language, raw arguments, result/logs | Same wrapper contract as write-file; path/name/status/error/action are the complete central semantics. |
| System task notification — `SystemTaskNotificationSegment -> MarkdownRenderer` | `content`; exact AI-row usage string when last | `senderId` | Only content is rendered; sender ID has no central visual or interactive use. |
| Inter-agent message — `InterAgentMessageSegment` | `senderAgentRunId`, `content`, `messageType`, `recipientRoleName`; exact AI-row usage string when last | Segment object reference; shell-owned sender-name map as a mutation trigger | Sender ID participates in fallback display and tooltip; content is always shown; message type/recipient appear in tooltip and expanded details. The external display-name map remains a reactive shell prop, not live conversation activity. |
| Media — `MediaSegment` | `mediaType`; ordered URL strings; exact AI-row usage string when last | URLs-array reference; authorized object URL/error cache; modal local state | Media kind and ordered sources determine image/audio/video controls and their retained open/download interaction. Async authorization/load state rerenders locally and is not a protocol commit. |
| Error — `ErrorSegment` | `message`, `details ?? null`; exact AI-row usage string when last | `source` | Message is visible; details is retained disclosure content. `source` is not used by the current component. |
| Center compaction — `CompactionStatusRow` | `activityId`; derived phase presentation `(label, icon, tone, isCompacting)` via `getCompactionPhasePresentation`; `activity.message`; exact derived secondary text from `turnId`, `rawTraceCount`, `semanticFactCount`, `provider` | `updatedAt`, raw center timestamp when order is unchanged, operation/provider IDs, trigger, token/boundary/source fields, `errorMessage` except when already reflected in `message` | These are the complete template inputs. Center timestamp affects selection/order, so a consequential change appears as token membership/order rather than a non-rendered value slot. |
| Retained total-usage footer — `AgentConversationFeed.totalUsage` | Exact derived footer string, including empty/hidden state, integer total tokens, and four-decimal summed cost | Raw message/cost object references; full-run historical totals | A raw numeric mutation that does not change either a row string or the rounded retained-total string is not a central visual change. |

### Shared presentation derivation and anti-drift rule

1. Extract `autobyteus-web/utils/toolCardPresentation.ts` as a narrow pure helper around the existing `getToolDisplaySummary`. It owns wrapper-specific default names/effective arguments, the semantic status key, summary tuple, error, and flattened approval-target primitives. `ToolCallSegment`, `TerminalCommandSegment`, `WriteFileCommandSegment`, `EditFileCommandSegment`, and `ToolCallIndicator` must consume this helper for the same values that the witness consumes. Do not copy argument-key parsing, path compaction, command redaction, or status mapping into the witness.
2. The semantic status key represents actual indicator equivalence: `parsing|executing -> running`; `success`, `error`, `approved`, `awaiting-approval`, and `denied` each keep distinct keys; `parsed|interrupted` use the current default wrench/navigable key. Tests for a true status change use a visibly different transition such as `running -> success` or `awaiting-approval -> approved`; a status transition within one equivalence class is witness-equal unless it changes selection/membership.
3. Approval-target fields are flattened in declared field order, including direct string-list contents for path fields, only while the awaiting controls are rendered. `invocationId` remains identity/interaction input in every tool state. No nested target/payload traversal is allowed.
4. Extract the feed's local message/total usage formatting into `recentEventMonitorUsagePresentation.ts`; both `AgentConversationFeed` and the witness call it. The production `AgentEventMonitor` uses the feed defaults `showTokenCosts:true` and `showTotalUsage:true`, so both strings belong to this central witness; alternate reusable-component props do not redefine the production mutation contract. Use `contextAttachmentPresentation` for the existing label semantics and direct declared attachment primitives for preview/open interaction inputs. Use `getCompactionPhasePresentation` and one shared secondary-text builder in both compaction row and witness.
5. Shell props (`agentName`, avatars, inter-agent sender-name mapping), component-local disclosure/modal/fetch state, and Activity-panel state continue to rerender through their own reactive owners. They do not mean “new run activity” and do not increment `eventMonitorPresentationRevision`.

### Required `AR-003` verification

- `MP-AR-003`: supported `TOOL_LOG` and result-only mutation leave central card membership/values unchanged, witnesses equal, and revision unchanged.
- Replacing a generic/terminal tool arguments object with a different object whose shared derived `(kind,text,title)` is equal leaves witnesses equal; changing the derived command/path/text changes them.
- Visibly different tool status, error, summary, or awaiting action target changes the witness; write/edit original content and terminal description alone do not.
- Ordered user attachment tuple changes, text/Thinking content, system notification content, inter-agent sender/content/type/recipient, media type/order/URL, error message/details, derived row/total token-cost text, and every compaction template primitive are detected.
- Stable membership/order changes are detected, while stable-identity object replacement with all table values equal remains equal.
- A tool result/log and an unused nested argument/result value with a throwing/deep getter are never accessed; the builder reads only named top-level summary inputs and direct primitive lists, proving no recursive traversal.

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Standalone GraphQL projection | `Yes` | `Yes` | `Low` | None |
| Team-member GraphQL projection | `Yes` | `Yes` | `Low` | Keep compound identity |
| Server recent selector | `Yes` | `N/A` | `Low` | Keep internal |
| Conversation enforcement | `Yes` | `Yes` | `Low` | Do not accept generic context/store selectors |
| Presentation witness | `Yes` | `Yes` — table-defined per-kind stable/ordinal identity | `Low` | Shared tool/usage/compaction derivations make equality match central semantics |
| Presentation selector | `Yes` | `Yes` | `Low` | Typed compaction input only |
| Mutation begin/commit | `Yes` | `Yes` | `Low` | Net witness equality is authoritative; no transient effect input |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Server policy | `recent-run-projection-policy` | `Yes` | Low | Use “replay event,” not raw trace, in selector name |
| Frontend capability | `recentEventMonitorWindow` | `Yes` | Low | Use “visual event,” not message, in public names/docs |
| Feed result | `RecentEventMonitorPresentation` | `Yes` | Medium | Document render groups vs visual count |
| UI state | `hasUnseenActivity` | `Yes` | Low | Clear only at latest/selection change |
| Run signal | `eventMonitorPresentationRevision` | `Yes` | Low | Reset on hydration/context replacement; increment once per visible commit |

## Applied Patterns (If Any)

- **Policy object/module via pure functions:** Named limits and selectors prevent semantic slicing drift.
- **Bounded mutation witness:** Authoritative dispatch/submission boundaries capture before, enforce after, and bump only on ordered shallow-token inequality.
- **Classify-select-regroup presentation:** Counts actual visible units, protects mutable lifecycles, and preserves grouped assistant rendering/avatar treatment.
- **Defense in depth:** Server bounds transport, conversation state bounds memory, Activity store bounds secondary state, and feed bounds combined mounted presentation.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/projection/` | Folder | Run-history projection | Recent policy and existing transformations | Policy is projection-specific | UI state or filesystem implementation |
| `.../recent-run-projection-policy.ts` | File | Internal server policy | Limit + newest event selection | Adjacent to provider/types | GraphQL resolver logic |
| `.../providers/local-memory-run-view-projection-provider.ts` | File | Normal replay provider | Active-only read and policy orchestration | Existing provider boundary | Archive fallback |
| `autobyteus-web/services/eventMonitor/` | Folder | Event Monitor capability | Cross-hydration/live/presentation recent-window semantics | Feature-oriented shared service | Vue component rendering or network access |
| `.../recentEventMonitorWindow.ts` | File | Internal web policy | Classify, completed-first select/trim, hard fallback, flatten/regroup | Pure window owner; stateful commit extracted to keep responsibility/size tight | Pinia access or localization |
| `.../recentEventMonitorPresentationWitness.ts` | File | Pure witness owner | Ordered shallow token builders/equality | Keeps net semantics out of large window file | Store or handler access |
| `.../recentEventMonitorUsagePresentation.ts` | File | Pure usage presentation | Exact message-cost and retained-total strings shared by feed/witness | Keeps witness equal to rendered numeric precision/presence | Full-run accounting or store access |
| `.../recentEventMonitorMutationCommit.ts` | File | Stateful Event Monitor commit | Store adapter, begin/enforce/post/compare/bump | One transaction-like boundary | Protocol switches or UI scroll |
| `autobyteus-web/utils/toolCardPresentation.ts` | File | Pure conversation card presentation | Effective wrapper inputs, semantic status key, summary/error/action primitives | Narrow renderer/witness anti-drift seam; composes existing `getToolDisplaySummary` | Result/log/Activity detail state |
| `autobyteus-web/types/agent/AgentRunState.ts` | File | Per-run ephemeral state | Own/reset/increment presentation revision | Existing run-state owner | Protocol visibility classification |
| `autobyteus-web/services/agentStreaming/handlers/` | Folder | Stream projection | Preserve mutations/completion; remove obsolete revision-effect propagation | Existing mutation owners | Window selection or scroll behavior |
| Existing streaming handlers | Files | Projection mutation | No longer decide revision truth | Existing owner remains protocol-focused | Window or scroll behavior |
| Existing streaming/hydration/submission files | Files | Mutation boundaries | Reset baseline or commit enforcement/revision | Existing owners know when mutation completes | Duplicated trim algorithms |
| `.../types/agent/AgentRunState.ts` | File | Run state | Presentation revision lifecycle | Existing ephemeral per-run owner | Protocol switch logic |
| `.../services/runOpen/teamRunOpenCoordinator.ts` | File | Team open/merge | Reset reused non-live member revision on conversation replacement | Existing replacement owner | Witness comparison |
| `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` | File | Feed | Bounded presentation and jump UX | Owns scroll container | History fetch or store mutation |
| `autobyteus-web/stores/agentActivityStore.ts` | File | Activity state | Cap and repair flags | Owns Activity lifecycle | Conversation trimming |
| `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue` | File | Workspace composition | Remove copy feature | Existing local action | Conversation serialization |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| Server `run-history/projection` | `Main-Line Domain-Control` | `Yes` | `Low` | Selector is internal to projection |
| Server `projection/providers` | `Persistence-Provider` | `Yes` | `Low` | Provider composes memory source and projection |
| Web `services/eventMonitor` | `Main-Line Domain-Control` | `Yes` | `Low` | One new folder prevents generic utils drift |
| Web `services/agentStreaming` | `Return-Event` | `Yes` | `Low` | Dispatcher brackets mutation; handlers have no revision truth or UI scroll logic |
| Web `components/workspace/agent` | `Off-Spine Concern` | `Yes` | `Medium` | Existing UI folder is mixed by component but locally coherent |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Server limit order | `active records -> buildHistoricalReplayEvents(all active) -> slice(-100)` | `rawTraceLimit: 100 -> build interactions` | Raw slicing can split tool call/result evidence |
| Visual count | User message `1`; AI `[text, think, tool]` `3`; compaction `1` | Count four containing message rows as `2` | User asked about visible cards/Thinking, not storage containers |
| Partial oldest AI retention | 98 newer events + old AI with 5 segments -> keep its last 2 segments, then 98 newer | Keep/drop entire AI message and exceed/underfill arbitrarily | Exact bound without repeating avatars |
| Completed-first eviction (`AR-001`) | Event 1 is executing; events 2–101 are completed -> evict event 2 and retain event 1 + events 3–101 | Blind `slice(-100)` evicts executing event 1 | Preserves identity whenever a completed candidate exists |
| Hard fallback (`AR-001`) | Events 1–101 are mutable -> evict event 1; later update for ID 1 creates one source-limited newest item, evicts the next eligible candidate, total remains 100 | Exceed 100 forever or retain both old/new ID 1 | Makes hard bound and exact-once representation coherent in the reachable edge |
| Witness token shape (`AR-003`) | `{ identity:'tool:I', kind:'tool', values:[name,statusKey,summaryKind,summaryText,summaryTitle,error,...awaitingTargetPrimitives] }`; both renderer and witness use shared derivation | Include `argsRef`, `resultRef`, logs, or generic `JSON.stringify` | Detects exactly the central card/render interaction; equal argument replacement and Activity-only log/result traffic remain equal |
| User attachment semantics (`AR-003`) | Ordered `(id,kind,locator,displayName,type)` primitives | Attachment array/object reference only | Covers label/preview/open/key interaction without deep serialization or false reference changes |
| Live delta | Update existing text segment content; count unchanged | Append a new visual event for each token | Prevents rapid eviction and duplicates |
| Archive boundary | Active orphan result renders source-limited card from active evidence | Read archive to recover arguments | Archive access would violate core requirement |
| Retained content revision (`AR-002`) | Pre witness contains `segment:S@content='a'`; handler changes retained text to `ab`; post witness differs, so revision increments once | Watch `conversation.updatedAt` or require handler boolean | Detects real content change from final presentation state |
| Transient append (`CR-001`) | Pre witness is 100 mutable tokens; atomic event A is appended then selected out as the only completed candidate; post witness equals pre, so revision stays unchanged | `effect==='changed' || enforcement removed` | Prevents a jump action with nothing new at latest |
| Real eviction-only change | Completion classification causes preexisting retained token X to be removed; ordered post witness lacks X, so revision increments even with no new item | Ignore enforcement because handler content did not change | Preserves approved eviction-only unseen semantics |
| Revision reset (`AR-002`) | New run/hydration sets revision baseline `0`; feed clears unseen and waits for a later increment | Treat reset/replacement as unseen activity | Initial content is not “new while reading” |
| Team reopen reset (`CR-002`) | Reused non-live member gets a replacement conversation and immediately resets revision; subscribed live preservation assigns neither and keeps revision | Reset every merge or reset none | Prevents stale unseen without disrupting live streams |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Query flag to choose full vs recent projection | Preserve old complete feed | `Rejected` | Normal projection is always active-only recent |
| Archive fallback when active is empty/incomplete | Improve apparent fidelity | `Rejected` | Empty/source-limited active view is accepted |
| New load-older/archive UI | Preserve access to old content | `Rejected` | User explicitly does not use older content |
| Hidden/deactivated copy control | Preserve possible future use | `Rejected` | Remove action, derivation, and dead key |
| Keep unbounded state but slice template | Minimize code changes | `Rejected` | Enforce provider, state, Activity, and presentation bounds |
| Patch `MP-CR-001` by checking only whether the added identity survived | Small local fix | `Rejected` | Net ordered witness covers retained updates, real evictions, compactions, order/membership, and future callers uniformly |
| New GraphQL timeline alongside old bundle | Gradual rollout | `Rejected` | Keep one bounded existing projection contract |

## Derived Layering (If Useful)

```text
Server transport boundaries
  -> run-history projection service/provider (governing recent source)
    -> agent-memory active-file reader
    -> replay transformer
    -> recent event selector
    -> existing bundle builder

Web transport/hydration and live event boundaries
  -> Event Monitor begin witness
  -> existing domain handlers/converters
  -> Event Monitor enforce + post witness + equality + revision
  -> conversation / Activity state
  -> bounded presentation selector
  -> explicit revision + feed scroll/disclosure components
```

## Change / Refactor Sequence

1. Add server recent-projection policy with pure limit/ordering tests.
2. Change local-memory provider to `includeArchive: false`, build all active replay events, apply the policy, then build the bundle. Update provider tests with active+archive fixtures, >100 active events, order, and source-limited tool cases.
3. Add the frontend Event Monitor window capability and tests for completion classification, mixed completed/mutable selection, partial AI trimming, 101-all-mutable fallback, stable-identity re-entry without duplicates, compaction merge ordering, and exact 100 cap.
4. Keep `AgentRunState.eventMonitorPresentationRevision` bump/reset and stream segment completion metadata. Extract the narrow shared tool-card, usage, and compaction-row presentation derivations; make current renderers consume them; add the complete pure per-kind witness/equality from the `AR-003` table plus the stateful begin/commit adapter. Remove the old `EventMonitorPresentationMutation` parameter and obsolete cross-boundary handler-effect propagation.
5. Bracket standalone live dispatch, team generic dispatch, and local user submission with begin/commit. Reset/baseline on historical/context hydration and add the omitted `teamRunOpenCoordinator.mergeHydratedMembers` non-live replacement reset while preserving subscribed live state. Add a matrix proving non-visible messages, `MP-CR-001` net-identical transitions, `MP-AR-003` tool log/result traffic, and equal derived-summary argument replacement do not bump; actual table-defined content/card/compaction/membership/order/eviction changes bump once.
6. Extend Activity store insertion/upsert paths with completion-aware eviction, hard fallback, actual-effect, and derived-state repair tests.
7. Refactor parent prop flow and `AgentConversationFeed` to consume bounded presentation plus explicit revision and add baseline/unseen/jump scroll state. Preserve current disclosure components and bottom threshold. Add component tests for completed-first >100 selection, pinned/non-pinned revision behavior, no-op revision absence, reset, manual/jump clearing, localization, and keyboard semantics.
8. Remove copy control/import/computed text and stale translation entries; update workspace-view/localization tests.
9. Run implementation-scoped server/web unit tests, typechecks, and localization guards. Implementation engineer records commands/results but does not own broader API/E2E.
10. API/E2E engineer validates real GraphQL archive exclusion and limits, discovers executable environment, creates durable large fixture coverage if needed, and measures reference payload/timing/hydration/browser behavior.

No temporary dual path is permitted. Each stage should keep the worktree compiling; once provider policy changes, old archive-inclusive normal behavior is gone.

## Key Tradeoffs

- **Read complete active file vs tail-read raw records:** Complete active read is accepted because compaction ordinarily bounds it and preserves lifecycle reconstruction. It is simpler and safer than boundary-overlap logic; returned/client work is still capped.
- **Keep existing GraphQL bundle vs canonical timeline redesign:** Keeping the contract minimizes risk and matches the narrowed product need. Bounded conversation/activity duplication is accepted.
- **Trim state plus presentation vs DOM virtualization:** A recent rolling window matches actual user behavior and handles dynamic-height content without a virtualization framework.
- **Exact visual count vs message count:** Segment-aware, lifecycle-aware counting requires a small shared capability but prevents a single large assistant message from defeating the UI bound or prematurely losing an active card.
- **No archive fallback:** Some boundary tool cards may have incomplete arguments/context, but speed and predictable recent-only behavior are the explicit user priority.

## Risks

- A single event can still contain a very large result/reasoning/media payload; count bounding alone cannot guarantee a small byte response.
- More than 100 concurrently mutable events forces deterministic eviction of an old mutable identity after completed candidates are exhausted. A later update may only reconstruct source-limited current data; the design prioritizes the approved hard cap and guarantees at most one retained representation.
- Presentation witness maintenance is a new correctness seam: every central rendered/retained-interaction kind must have an exact semantic token, while Activity-only/detail fields must remain excluded. The bounded O(100) inventory plus shared presentation helpers is acceptable, but future render-model changes must extend helper/table/tests together.
- In-place partial AI segment trim must preserve Vue reactivity and must not leave empty AI messages.
- Center compaction timestamps and message timestamps can tie; presentation must preserve deterministic original order.
- Activity eviction must not leave `hasAwaitingApproval` or `highlightedActivityId` stale.
- Localization managed/generated-file conventions must be followed so catalog guards pass.
- Large teams still perform multiple bounded active reads during restore; re-evaluate only if API/E2E evidence shows the approved change is insufficient.

## Guidance For Implementation

- Treat `100` as a product maximum, not a request hint. Do not expose a caller override in production APIs.
- Use `.slice(-limit)` only on canonical replay events on the server. Do not set `rawTraceLimit: 100` in the memory view.
- Frontend enforcement must flatten descriptors in chronological order, classify completion, remove the oldest completed descriptors until overflow is satisfied, and only then remove oldest mutable descriptors if overflow remains. Apply removals in place, remove empty AI messages, and preserve retained segment objects/identities.
- Completion rules: user/system-task/inter-agent/media/error are atomic-complete; text/Thinking becomes complete on `SEGMENT_END` (record this on stream identity) or containing message completion; tool/write/edit/terminal completes only at `success|error|denied|interrupted`; compaction completes only at `completed|failed`; an ambiguous segment in an incomplete message is mutable.
- On forced mutable eviction, do not retain a second hidden full event. If a later visible payload for that stable ID arrives and no retained segment exists, existing/specified synthetic-upsert behavior may create one source-limited newest-edge segment with that same identity; enforcement immediately restores the cap. A terminal-only payload with no displayable material may complete silently. Tests must prove no retained duplicate.
- Do not recompute/store a second canonical timeline. Presentation descriptors should be ephemeral and retain references/indices sufficient to regroup adjacent selected segments.
- Preserve tool segment objects when retained so subsequent lifecycle updates mutate the same objects.
- Implement `buildRecentEventMonitorPresentationWitness` exactly from the `Central Presentation Witness Contract (AR-003)` table. It operates on the same final presentation builder as the feed, expands grouped AI rows to one ordered token per retained visual segment, includes the derived retained-total usage scalar, and compares only semantic primitives/direct primitive lists. Never include raw `arguments`, `result`, `logs`, object references, or generic payload versions merely because they mutate.
- Add all focused `AR-003` verification listed under that contract: `TOOL_LOG`/result-only no-op, equal argument-object replacement, true shared-summary/status/error/action changes, every static/media/error/inter-agent/user-attachment/token-cost/compaction field, stable membership/order, semantic equal replacement, and throwing/deep getter no-traversal. Retain commit tests for `MP-CR-001`, a real retained update, and a real eviction-only transition.
- Because JS strings are immutable, capturing their before value is sufficient. Ordered attachment/media/path lists are copied only as direct primitive slots so in-place list edits remain detectable without relying on reference replacement. Tool argument objects are evaluated only through the shared rendered-summary helper; non-rendered nested state is intentionally invisible to the witness.
- Call `beginRecentEventMonitorMutation` immediately before the switch/append. Call `commitRecentEventMonitorMutation` after the handler: enforce, build final presentation with current center compactions, compare ordered witnesses, and call `markEventMonitorPresentationChanged()` no more than once only when unequal. Ensure early-return team mutation branches either perform no center mutation or commit explicitly.
- Remove `effect === 'changed' || enforcement.presentationChanged` from revision authority. Enforcement counts may remain diagnostic/test metadata but do not claim net presentation change.
- `AgentRunState.eventMonitorPresentationRevision` begins at `0`, resets to `0` when historical projection/context replacement establishes a new baseline, and increments monotonically for actual live/local presentation commits. The feed receives it explicitly through standalone/team parent props. Run identity change or revision reset/decrease clears unseen and establishes baseline; later increments drive pinned scroll or unseen. `conversation.updatedAt`, deep watchers, content serialization, and protocol-type-only heuristics are forbidden.
- In `teamRunOpenCoordinator.mergeHydratedMembers`, call reset immediately after assigning `memberContext.state.conversation` only when `preserveLiveRuntimeState` is false. Do not reset the branch that preserves the subscribed live conversation/runtime state.
- Remove only the `CopyButton` use in `AgentWorkspaceView`; do not delete the shared component if it has other consumers.
- Do not alter `ThinkSegment` or tool disclosure components unless a failing regression test reveals an incidental issue.
- Keep evidence free of raw tool/conversation payloads. Record aggregate counts, sizes, timings, fixture construction, and exact commands.
