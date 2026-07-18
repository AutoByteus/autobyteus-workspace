# Agent Event Monitor Recent-Window Design Spec

## Current-State Read

The normal workspace replay path is a complete-corpus pipeline:

`row/member selection -> standalone/team GraphQL projection -> run-history projection service -> LocalMemoryRunViewProjectionProvider -> AgentMemoryService(includeArchive=true) -> all complete archive segments + active file -> historical replay events -> duplicated conversation/activity bundle -> frontend semantic dedupe -> conversation + Activity stores -> AgentConversationFeed/ActivityFeed full mount`

The local-memory provider is shared by standalone and team-member projection services and is the correct source-policy owner. It currently opts into every archive without a caller limit. The existing GraphQL boundaries correctly distinguish standalone run ID from team run ID plus member route key; their result shape does not need to change for this task.

On the frontend, historical conversion, live stream dispatch, local user submission, Activity retention, and final feed presentation each own part of the observable Event Monitor state, but no shared recent-window invariant connects them. `AIMessage` groups multiple visible segments inside one message, so message count is not a valid UI bound. Center compaction rows are sourced from Activity state and merged by the feed, which means the final presentation must account for them as visual events too. Some events remain mutable across protocol messages: streamed text/Thinking, nonterminal tool cards, and started compactions. Bottom-pinning already belongs to `AgentConversationFeed`, but there is no unseen-activity state or jump action. Both live dispatchers also update `conversation.updatedAt` for every parsed message, including messages that do not visibly change the center feed, so that timestamp cannot serve as the unseen signal.

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
4. Center-presentation-mutating handlers report a cheap actual mutation effect. Historical hydration, standalone/team live dispatch, and local user submission invoke the window capability at their authoritative mutation boundaries; each dispatch increments an ephemeral per-run presentation revision at most once only when the bounded center presentation actually changed.
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
- Design response: Put active-only/recent selection in the shared run-history provider; introduce one lifecycle-aware frontend Event Monitor window capability with completed-first eviction and a deterministic hard fallback; have mutation owners report actual presentation effects into one per-run revision; cap Activity using the same completion policy; and defend the final merged presentation in the feed.
- Refactor rationale: Scattering `slice(-100)` across resolvers, handlers, and templates would encode different meanings (raw record, message, segment, activity, feed row) and would inevitably drift. The new capability makes the user-approved visual-event meaning explicit and testable.
- Intentional deferrals and residual risk: The bounded GraphQL bundle still duplicates tool details between conversation and Activity; one event can still be byte-heavy; active-team restore may still request several bounded member projections. These are finite after this change and do not justify a new timeline schema or focus-lazy orchestration without new evidence.

## Architecture Review Finding Resolution

| Finding ID | Round-1 Concern | Revised Design Resolution | Verification |
| --- | --- | --- | --- |
| `AR-001` | Blind oldest-edge trimming could evict a still-mutable segment while completed candidates existed, and the hard-bound edge was only a residual risk. | The window capability now classifies each visual event, evicts oldest completed candidates first, and uses oldest-mutable eviction only for remaining overflow after completed candidates are exhausted. Stable-identity late updates can create at most one source-limited newest-edge representation; no retained duplicate or archive read. | Mixed completed/mutable, 101-all-mutable, late-update re-entry, tool/compaction terminality, and Activity-store tests. |
| `AR-002` | `conversation.updatedAt` changes for non-visible protocol traffic and could falsely show unseen activity. | `AgentRunState.eventMonitorPresentationRevision` is an explicit ephemeral revision. Center-mutating handlers return actual change effects; the dispatcher combines the effect with eviction results and bumps once. Non-visible/no-op messages do not bump. Hydration/run replacement resets the baseline. | Dispatcher protocol matrix and feed pinned/non-pinned/reset component tests. |

## Terminology

- **Active raw-trace file:** `raw_traces_active.jsonl` for the selected run/member.
- **Archived raw-trace segment:** A completed `raw_traces_<index>.jsonl` referenced by the manifest; never read for normal Event Monitor projection after this change.
- **Canonical replay event:** One ordered `HistoricalReplayEvent` after active-file normalization and tool lifecycle reconstruction.
- **Visual event:** One user message, one assistant segment/card, or one eligible center-timeline compaction row. Streaming deltas/status updates of an existing segment/card are updates, not additional events.
- **Completed visual event:** An event with no expected visible lifecycle mutation: atomic user/static notification/inter-agent/media/error after insertion; text/Thinking after segment end or containing AI-message completion; tool/file/terminal after terminal status; compaction after completed/failed.
- **Mutable visual event:** Streamed text/Thinking without completion, a tool-like card in parsing/parsed/awaiting-approval/approved/executing, or a compaction in requested/started. When evidence is ambiguous inside an incomplete AI message, classify conservatively as mutable.
- **Recent window:** At most 100 events in chronological display order. The selector protects mutable events by evicting oldest completed candidates first; remaining capacity is filled by the newest completed events. Only if completed candidates cannot satisfy overflow does the hard fallback remove oldest mutable events.
- **Visible-presentation revision:** An ephemeral `AgentRunState` counter incremented once per committed mutation only when the bounded central presentation actually changes. It is unrelated to `conversation.updatedAt`.
- **Presentation mutation effect:** The explicit union `'none' | 'changed'` returned by a center-projection handler after comparing only the fields it owns. It communicates an actual effective mutation; it is not a protocol-type heuristic and contains no scroll/UI instruction.
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
| `DS-003` | Route each live message through a handler that reports whether it actually changed central presentation, enforce completed-first retention at the authoritative exit, and increment the run revision once if either the handler effect or eviction changed presentation. Local submissions use the same commit. | ServerMessage, AgentContext, mutation effect, revision | Streaming service/dispatcher and submission service | Tool lifecycle updates, task-agent routing, browser side effects |
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
- Center-mutating handlers own only an **actual mutation effect** result: whether the handler effectively changed visible center data. Streaming/submission boundaries own when to combine that effect with enforcement and bump the revision once.
- `AgentRunState` owns the ephemeral revision counter/reset; it does not decide whether a protocol type is visible.
- Activity store owns its separate record cap, terminality selection, effective-change result, and internal derived flags.
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
| Unbounded Activity arrays | Hidden panel/state still grows | Store-owned cap helper | `In This Change` | Recompute flags after eviction |
| Header `CopyButton` usage/import and `conversationText` computed | User does not use it; eager O(history) work | No replacement | `In This Change` | Common `CopyButton.vue` remains for other consumers |
| `copy_full_conversation` generated translations if unused globally | Dead catalog entries | Removed with component action | `In This Change` | Verify repository localization generation convention |

## Return Or Event Spine(s) (If Applicable)

- `DS-003` standalone: `WebSocket ServerMessage -> AgentStreamingService.dispatchMessage -> handler returns visibleMutationEffect -> commitRecentEventMonitorMutation(context,effect) -> completed-first enforcement -> optional single revision bump -> render`
- `DS-003` team: `Team WebSocket ServerMessage -> task-execution routing/explicit member resolution -> dispatchGenericTeamMemberMessage -> handler effect -> same commit -> optional single revision bump -> member render`
- `DS-003` local user: `composer submission -> localUserSubmission append -> visible effect=true -> same commit -> optional revision bump -> transport send continues`

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
- Parent owner: streaming/submission mutation commit
  - Chain: `handler actual effect -> enforce window -> if actual effect OR eviction-only presentationChanged, increment AgentRunState revision once; otherwise leave revision unchanged`
  - Why: Provides a cheap truthful signal without serialization or generic protocol timestamps.
- Parent owner: `AgentConversationFeed`
  - Chain: `run/revision reset -> establish baseline and clear unseen; revision increment -> if pinned auto-scroll else mark unseen; non-visible/no revision -> no change; jump/manual bottom -> clear unseen/pin`
  - Why: Keeps scrolling local to the actual scroll container.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization | `DS-004` | Feed UX | English/zh-CN jump label and catalog cleanup | User-visible/action accessibility | Hard-coded text or stale generated keys |
| Accessibility | `DS-004` | Feed UX | Real button, focus, no token-spam live region | Keyboard/screen-reader parity | Stream handlers become UI-aware |
| Deterministic ordering | `DS-001`, `DS-004` | Provider/presentation | Preserve normalized time/order tie break | Stable newest selection | Resolver-specific drift |
| Actual mutation-effect reporting | `DS-003`, `DS-004` | Stream projection/feed | Distinguish effective center change from no-op traffic | Truthful unseen button without scans | UI protocol-type guesses or generic timestamp false positives |
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
| Actual visible-change signal | Current handlers/run state lack it | `Extend` | Handler effect plus per-run revision is cheaper/truer than snapshots or timestamps | N/A |
| Scroll pinning | Agent conversation feed | `Extend` | Existing 40px threshold and scroll element already owned here | N/A |
| Activity cap | Activity store | `Extend` | Store owns array and flags | N/A |
| Copy control cleanup | Workspace view | `Reuse`/remove | Remove local usage; shared CopyButton remains elsewhere | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Server run-history projection | Active-only normal source and newest replay-event selection | `DS-001` | Local-memory provider | `Extend` | No GraphQL schema change |
| Agent memory | Active JSONL read/normalize | `DS-001` | Memory service/store | `Reuse` | No Event Monitor constant here |
| Web Event Monitor window | Visual-event definition, completion classification, completed-first trim, hard fallback, presentation selection, mutation commit | `DS-002`–`DS-004` | Hydration/stream/feed | `Create New` | Feature-oriented service folder |
| Web streaming/submission | Return actual visible effects and commit window/revision after mutations | `DS-003` | Existing handlers/dispatchers/submission | `Extend` | Handlers remain lifecycle-focused and do not own unseen UI |
| Web Activity store | Recent activity retention | `DS-002`, `DS-005` | Pinia store | `Extend` | Same numeric contract, separate record meaning |
| Web workspace components | Feed scroll/jump and copy removal | `DS-004` | Feed/workspace view | `Extend` | Disclosure components unchanged |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `recent-run-projection-policy.ts` | Server run history | Projection policy | Constant + newest replay-event selector | Singular server projection policy | `HistoricalReplayEvent` |
| `recentEventMonitorWindow.ts` | Web Event Monitor | Window capability | Classify/count/select/trim/presentation/commit | One coherent lifecycle-aware visual-window meaning | Conversation, compaction, run-state types |
| Existing provider | Server run history | Provider | Active-only read, reconstruct then select | Existing governing owner | Selector |
| Existing center-mutating handlers | Web streaming | Projection mutations | Return actual changed/not-changed effect | Existing owner knows whether mutation was effective | No window logic |
| Existing hydration/dispatch files | Web hydration/stream | Mutation boundaries | Reset baseline or commit effect/enforcement/revision | Correct sequencing owner | Window capability |
| `AgentRunState.ts` | Web run state | Ephemeral UI runtime state | Own presentation revision counter/reset | Per-run signal belongs with run state | No protocol classification |
| Existing feed/store/view | Web UI/state | Local owners | Jump/presentation, cap, copy removal | Existing responsibility locations | Window capability/constant |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Frontend visual-event classification, selection, and trimming | `services/eventMonitor/recentEventMonitorWindow.ts` | Event Monitor | Used by hydration, live mutation, Activity-aligned presentation, and rendering | `Yes` — one count/completion rule | `Yes` — no separate historical/live slice rules | Generic catch-all UI utility |
| `EventMonitorPresentationMutation` (`'none' | 'changed'`) | `services/eventMonitor/recentEventMonitorWindow.ts` | Event Monitor | Dispatcher/submission need one semantic result without scanning/serializing bounded content | `Yes` | `Yes` — no protocol-type heuristic | Protocol enum or UI scroll command |
| Backend recent replay-event selection | `run-history/projection/recent-run-projection-policy.ts` | Run-history projection | Provider tests and provider share named limit | `Yes` | `N/A` | Storage reader or GraphQL paging abstraction |

The numeric value `100` exists once per independently built server/web application. This is an explicit cross-application product contract verified by tests, not a reason to make the web depend on a server-internal file. Requirements remain the authority.

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `HistoricalReplayEvent[]` selected by server policy | `Yes` | `N/A` | `Low` | Select only after lifecycle build |
| Frontend visual-event descriptor | `Yes` — kind/source/timestamp/order/render reference | `Yes` | `Low` | Keep internal to Event Monitor capability |
| `Conversation` retained window | `Yes` for UI session state | `No` — existing derived fields remain | `Medium` | Trim segments/messages in place; do not create a second stored timeline |
| `RunActivity[]` | `Yes` | Existing conversation overlap remains | `Medium` | Bound to 100; schema redesign deferred |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/projection/recent-run-projection-policy.ts` | Server run history | Internal projection policy | Export limit and pure `selectRecentReplayEvents` | Small, singular, testable policy | Historical replay type |
| `.../providers/local-memory-run-view-projection-provider.ts` | Server run history | Normal local provider | Read active only, build all active replay events, apply selector, build bundle | Existing authority | Policy selector |
| `autobyteus-web/services/eventMonitor/recentEventMonitorWindow.ts` | Web Event Monitor | Internal window capability | Export limit; classify completion; select/trim; build presentation; commit effect and revision | Shared coherent UI policy | Conversation/activity/run-state types |
| `.../runHydration/runProjectionConversation.ts` | Web hydration | Historical converter | Enforce window on built conversation before return/commit | Existing conversion boundary | Window capability |
| `.../agentStreaming/handlers/*` (center-mutating handlers only) | Web streaming projection | Mutation owners | Return actual visible-changed effect; mark streamed segment completion on end | Only handler knows no-op vs effective mutation | Shared effect convention |
| `.../agentStreaming/handlers/segmentIdentity.ts` | Web streaming projection | Stream segment identity | Extend identity metadata with presentation lifecycle completion set by `SEGMENT_END` | Existing segment identity owner | No window selection |
| `.../agentStreaming/AgentStreamingService.ts` | Web streaming | Standalone dispatcher | Commit returned effect, enforce, optionally bump once | Existing mutation owner | Window capability |
| `.../agentStreaming/teamStreamGenericMessageDispatcher.ts` | Web streaming | Team member dispatcher | Same commit; non-visible messages false | Existing team mutation owner | Window capability |
| `.../runSubmission/localUserSubmission.ts` | Web submission | Local append boundary | Commit visible append effect | User message is a visual event | Window capability |
| `autobyteus-web/types/agent/AgentRunState.ts` | Web run state | Ephemeral revision owner | Counter, bump, reset on hydration/context replacement | Explicit per-run signal | N/A |
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
- The frontend Event Monitor capability is internal and pure except for an explicit in-place conversation enforcement operation. It performs no network/store access.
- Dispatchers call the commit boundary after handler mutation. Low-level lifecycle handlers remain unaware of global retention/unseen policy but return whether their center projection actually changed.
- Feed presentation receives conversation/Activity data and performs no state hydration or archive access.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Local-memory projection provider | Active memory view, replay build, recent select, bundle build | Standalone/team projection services | Resolver reads memory files or opts into archives | Extend provider policy |
| `enforceRecentConversationWindow` | Lifecycle classification and completed-first in-place trim with hard fallback | Hydration, streaming, submission | Caller uses `messages.slice(-100)` or handler-specific eviction | Extend shared capability |
| `commitRecentEventMonitorMutation` | Combine `EventMonitorPresentationMutation` + enforcement and bump revision at most once | Standalone/team dispatch and submission | Caller bumps revision from protocol type/timestamp | Extend shared capability |
| `buildRecentEventMonitorPresentation` | Flatten/sort/select/regroup messages+compactions | Agent conversation feed | Template separately slices messages/activities | Extend presentation result |
| Activity store actions | Validation/dedupe/cap/derived flags | Activity hydration and streaming projections | Direct mutation of internal map arrays | Add store action/helper |

## Dependency Rules

1. GraphQL resolver/service -> projection provider -> memory service/store; no reverse or direct filesystem shortcut.
2. Provider -> replay transformer -> recent selector -> bundle builder. Never apply `rawTraceLimit: 100` before lifecycle reconstruction.
3. Web hydration/stream/submission may import Event Monitor window capability; the capability may import web domain/run-state types but not stores, network clients, or components.
4. Feed may import presentation selection; window service must not import/render Vue components.
5. Activity store may import the shared web limit/completion classifier for Activity-compatible kinds, but the window capability must not mutate the Activity store.
6. No archive read is allowed as an error fallback, tool-lifecycle repair, empty-state fallback, or compatibility path.
7. No component or dispatcher may infer unseen activity from `conversation.updatedAt`, protocol type alone, full-history serialization, or a deep watcher.
8. No component may reintroduce full-conversation joining during render.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `getRunProjection(runId)` | Standalone run | Return normal recent projection | Nonempty run ID | Shape unchanged |
| `getTeamMemberRunProjection(teamRunId, memberRouteKey)` | Explicit team member | Return member recent projection | Team run ID + member route key | Shape unchanged |
| `selectRecentReplayEvents(events)` | Canonical replay list | Newest 100, preserve order | `HistoricalReplayEvent[]` | Pure; no I/O |
| `enforceRecentConversationWindow(conversation, limit?)` | One run conversation | Classify and mutate with completed-first eviction/hard fallback; return eviction metadata | Explicit `Conversation` | Default limit 100; test override only if useful |
| `buildRecentEventMonitorPresentation(conversation, compactions, limit?)` | Central feed presentation | Completed-first combined selection/regrouped rows | Conversation + typed compaction array | Pure; no store lookup |
| `commitRecentEventMonitorMutation(context, effect)` | One live/local mutation | Enforce and bump revision once iff effect is `changed` or eviction changed presentation | Explicit `AgentContext` + `EventMonitorPresentationMutation` | Generic timestamp forbidden |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Standalone GraphQL projection | `Yes` | `Yes` | `Low` | None |
| Team-member GraphQL projection | `Yes` | `Yes` | `Low` | Keep compound identity |
| Server recent selector | `Yes` | `N/A` | `Low` | Keep internal |
| Conversation enforcement | `Yes` | `Yes` | `Low` | Do not accept generic context/store selectors |
| Presentation selector | `Yes` | `Yes` | `Low` | Typed compaction input only |
| Mutation commit | `Yes` | `Yes` | `Low` | Handler result is actual effect, not protocol classification |

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
- **Post-mutation effect + invariant:** Handlers report actual projection change; authoritative dispatch/submission boundaries enforce retention and bump revision once.
- **Classify-select-regroup presentation:** Counts actual visible units, protects mutable lifecycles, and preserves grouped assistant rendering/avatar treatment.
- **Defense in depth:** Server bounds transport, conversation state bounds memory, Activity store bounds secondary state, and feed bounds combined mounted presentation.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/projection/` | Folder | Run-history projection | Recent policy and existing transformations | Policy is projection-specific | UI state or filesystem implementation |
| `.../recent-run-projection-policy.ts` | File | Internal server policy | Limit + newest event selection | Adjacent to provider/types | GraphQL resolver logic |
| `.../providers/local-memory-run-view-projection-provider.ts` | File | Normal replay provider | Active-only read and policy orchestration | Existing provider boundary | Archive fallback |
| `autobyteus-web/services/eventMonitor/` | Folder | Event Monitor capability | Cross-hydration/live/presentation recent-window semantics | Feature-oriented shared service | Vue component rendering or network access |
| `.../recentEventMonitorWindow.ts` | File | Internal web policy | Classify, completed-first select/trim, hard fallback, flatten/regroup, mutation commit | Singular capability; modest structural depth | Pinia access or localization |
| `autobyteus-web/types/agent/AgentRunState.ts` | File | Per-run ephemeral state | Own/reset/increment presentation revision | Existing run-state owner | Protocol visibility classification |
| `autobyteus-web/services/agentStreaming/handlers/` | Folder | Stream projection | Report actual mutation effects; record text/Thinking segment completion | Existing mutation owners | Window selection or scroll behavior |
| Existing streaming handlers | Files | Projection mutation | Report actual effective visible change | Existing owner knows mutation result | Window or scroll behavior |
| Existing streaming/hydration/submission files | Files | Mutation boundaries | Reset baseline or commit enforcement/revision | Existing owners know when mutation completes | Duplicated trim algorithms |
| `.../types/agent/AgentRunState.ts` | File | Run state | Presentation revision lifecycle | Existing ephemeral per-run owner | Protocol switch logic |
| `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` | File | Feed | Bounded presentation and jump UX | Owns scroll container | History fetch or store mutation |
| `autobyteus-web/stores/agentActivityStore.ts` | File | Activity state | Cap and repair flags | Owns Activity lifecycle | Conversation trimming |
| `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue` | File | Workspace composition | Remove copy feature | Existing local action | Conversation serialization |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| Server `run-history/projection` | `Main-Line Domain-Control` | `Yes` | `Low` | Selector is internal to projection |
| Server `projection/providers` | `Persistence-Provider` | `Yes` | `Low` | Provider composes memory source and projection |
| Web `services/eventMonitor` | `Main-Line Domain-Control` | `Yes` | `Low` | One new folder prevents generic utils drift |
| Web `services/agentStreaming` | `Return-Event` | `Yes` | `Low` | Handler effect plus dispatcher commit; no UI scroll logic |
| Web `components/workspace/agent` | `Off-Spine Concern` | `Yes` | `Medium` | Existing UI folder is mixed by component but locally coherent |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Server limit order | `active records -> buildHistoricalReplayEvents(all active) -> slice(-100)` | `rawTraceLimit: 100 -> build interactions` | Raw slicing can split tool call/result evidence |
| Visual count | User message `1`; AI `[text, think, tool]` `3`; compaction `1` | Count four containing message rows as `2` | User asked about visible cards/Thinking, not storage containers |
| Partial oldest AI retention | 98 newer events + old AI with 5 segments -> keep its last 2 segments, then 98 newer | Keep/drop entire AI message and exceed/underfill arbitrarily | Exact bound without repeating avatars |
| Completed-first eviction (`AR-001`) | Event 1 is executing; events 2–101 are completed -> evict event 2 and retain event 1 + events 3–101 | Blind `slice(-100)` evicts executing event 1 | Preserves identity whenever a completed candidate exists |
| Hard fallback (`AR-001`) | Events 1–101 are mutable -> evict event 1; later update for ID 1 creates one source-limited newest item, evicts the next eligible candidate, total remains 100 | Exceed 100 forever or retain both old/new ID 1 | Makes hard bound and exact-once representation coherent in the reachable edge |
| Live delta | Update existing text segment content; count unchanged | Append a new visual event for each token | Prevents rapid eviction and duplicates |
| Archive boundary | Active orphan result renders source-limited card from active evidence | Read archive to recover arguments | Archive access would violate core requirement |
| Visible revision (`AR-002`) | Non-pinned `SEGMENT_CONTENT` that changes retained text reports true, commits one revision, and shows unseen; `CONNECTED` reports false and changes nothing | Watch `conversation.updatedAt` or protocol traffic | Protects reading position without false jump actions |
| Revision reset (`AR-002`) | New run/hydration sets revision baseline `0`; feed clears unseen and waits for a later increment | Treat reset/replacement as unseen activity | Initial content is not “new while reading” |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Query flag to choose full vs recent projection | Preserve old complete feed | `Rejected` | Normal projection is always active-only recent |
| Archive fallback when active is empty/incomplete | Improve apparent fidelity | `Rejected` | Empty/source-limited active view is accepted |
| New load-older/archive UI | Preserve access to old content | `Rejected` | User explicitly does not use older content |
| Hidden/deactivated copy control | Preserve possible future use | `Rejected` | Remove action, derivation, and dead key |
| Keep unbounded state but slice template | Minimize code changes | `Rejected` | Enforce provider, state, Activity, and presentation bounds |
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
  -> existing domain handlers/converters report actual visible effect
  -> Event Monitor recent-window commit (classify/evict/revision)
  -> conversation / Activity state
  -> bounded presentation selector
  -> explicit revision + feed scroll/disclosure components
```

## Change / Refactor Sequence

1. Add server recent-projection policy with pure limit/ordering tests.
2. Change local-memory provider to `includeArchive: false`, build all active replay events, apply the policy, then build the bundle. Update provider tests with active+archive fixtures, >100 active events, order, and source-limited tool cases.
3. Add the frontend Event Monitor window capability and tests for completion classification, mixed completed/mutable selection, partial AI trimming, 101-all-mutable fallback, stable-identity re-entry without duplicates, compaction merge ordering, and exact 100 cap.
4. Add `AgentRunState.eventMonitorPresentationRevision` bump/reset methods. Change center-presentation-mutating handler contracts to return actual effective-change results and mark streamed segment completion; duplicate/no-op mutations return false.
5. Apply mutation commit to standalone live dispatch, team generic dispatch, and local user submission; reset/baseline on historical/context hydration. Add a protocol matrix proving non-visible messages do not bump, visible append/content/lifecycle/compaction changes bump once, eviction-only changes bump once, and task projection exits are covered.
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
- Center-mutating handlers return an actual effect only when fields consumed by the bounded center presentation changed. New append/removal, retained text/Thinking content, tool card status/arguments/log/result/error, center-eligible compaction phase/message, and a trim eviction are visible; duplicate/no-op updates and connection/turn/accounting/status events without a center mutation are not.
- Invoke `commitRecentEventMonitorMutation` after the switch/handler completes, not before. It combines the handler effect with enforcement metadata and calls `AgentRunState.markEventMonitorPresentationChanged()` no more than once. Ensure early-return team mutation branches are explicitly tested.
- `AgentRunState.eventMonitorPresentationRevision` begins at `0`, resets to `0` when historical projection/context replacement establishes a new baseline, and increments monotonically for actual live/local presentation commits. The feed receives it explicitly through standalone/team parent props. Run identity change or revision reset/decrease clears unseen and establishes baseline; later increments drive pinned scroll or unseen. `conversation.updatedAt`, deep watchers, content serialization, and protocol-type-only heuristics are forbidden.
- Remove only the `CopyButton` use in `AgentWorkspaceView`; do not delete the shared component if it has other consumers.
- Do not alter `ThinkSegment` or tool disclosure components unless a failing regression test reveals an incidental issue.
- Keep evidence free of raw tool/conversation payloads. Record aggregate counts, sizes, timings, fixture construction, and exact commands.
