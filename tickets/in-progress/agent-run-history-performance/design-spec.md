# Agent Event Monitor Recent-Window Design Spec

## Current-State Read

The pre-change normal workspace replay path that motivated this ticket is a complete-corpus pipeline:

`row/member selection -> standalone/team GraphQL projection -> run-history projection service -> LocalMemoryRunViewProjectionProvider -> AgentMemoryService(includeArchive=true) -> all complete archive segments + active file -> historical replay events -> duplicated conversation/activity bundle -> frontend semantic dedupe -> conversation + Activity stores -> AgentConversationFeed/ActivityFeed full mount`

The local-memory provider is shared by standalone and team-member projection services and is the correct source-policy owner. In the pre-change/old remote build it opts into every archive without a caller limit; the integrated ticket build replaces that policy with active-only/newest-100. The existing GraphQL boundaries correctly distinguish standalone run ID from team run ID plus member route key. The approved 2026-07-20 refinement now requires those same explicit identity boundaries to expose active-trace-only earlier pages; a generic selector or archive-capable query remains unnecessary.

On the frontend, historical conversion, live stream dispatch, local user submission, Activity retention, and final feed presentation each own part of the observable Event Monitor state, but no shared recent-window invariant connects them. `AIMessage` groups multiple visible segments inside one message, so message count is not a valid UI bound. Center compaction rows are sourced from Activity state and merged by the feed, which means the final presentation must account for them as visual events too. Some events remain mutable across protocol messages: streamed text/Thinking, nonterminal tool cards, and started compactions. Bottom-pinning already belongs to `AgentConversationFeed`, but there is no unseen-activity state or jump action. Both live dispatchers also update `conversation.updatedAt` for every parsed message, including messages that do not visibly change the center feed, so that timestamp cannot serve as the unseen signal.

Post-implementation source-review state: commit `d50cf2cc996e8e1bf63d5cf2dd3e2ef6735a92b5` implemented the reviewed active-only/window/completion/revision design. Its `commitRecentEventMonitorMutation(context, effect)` increments when a transient handler effect is `changed` **or** conversation enforcement removed a descriptor. `MP-CR-001` proved that, with 100 retained mutable events, a newly inserted atomic-complete event is immediately selected out as the only completed eviction candidate; the pre/post presentation is identical but the revision advances. Separately, `teamRunOpenCoordinator.mergeHydratedMembers` replaces an existing non-live member conversation without resetting the revision. The first witness revision correctly replaced those mechanics, but architecture review `AR-003` found that its proposed tool token included Activity-only `result`/`logs` and raw argument-object reference identity. `MP-AR-003` proves supported `TOOL_LOG` traffic would then advance the witness while the central `ToolCallIndicator` is unchanged. This round preserves the accepted pre/post transaction, three-file ownership, and team reset map, and corrects only the pure witness equality domain to match actual central render/retained-interaction semantics.

Architecture review round 7 of the later paging refinement found two separate current-path constraints. `HistoricalReplayMessageEvent` and `HistoricalReplayReasoningEvent` drop `MemoryTraceEvent.id`; `runProjectionConversation` performs content/timestamp semantic merging with recursive `stableJson(toolResult)`; and current feed/AI segment keys are ordinal. Therefore transport-only `eventId` cannot support exact paging/anchors (`AR-006`), and an “existing conversation projection entry” is not central-only (`AR-007`). The target design below replaces that rejected page path with an identity-bearing replay carrier, a closed typed central visual projection, a linear ID-only web converter, and actual stable visual DOM keys. The accepted latest/live design is unchanged.

Constraints:

- The user approved active-file-only latest-100 monitoring and later refined it to allow fixed 50-event earlier pages only within the current active trace. Archive navigation remains explicitly rejected.
- Successful compaction rotates settled traces into archives and rewrites active boundary-forward; active is the intended recent source, but can still be several MB when compaction has not occurred.
- Tool interactions should be reconstructed from the complete normalized active-file record set before applying the event limit; raw tail slicing can split lifecycle evidence.
- Existing raw-trace files must remain untouched and require no migration.
- Existing Thinking/tool disclosure behavior must remain unchanged.
- Normal projection conversation/Activity semantics remain stable; additive page availability plus dedicated explicit standalone/team earlier-page operations are now required.

## Intended Change

Replace the normal archive-inclusive complete projection with an active-only recent projection and enforce the same product limit in frontend historical, live, Activity, and presentation owners:

1. The local-memory projection provider reads only `raw_traces_active.jsonl`.
2. It reconstructs canonical historical replay events from all normalized active records, selects the newest 100 replay events, and only then builds the existing conversation/activity projection bundle.
3. A frontend Event Monitor recent-window capability owns visual-event completion/mutability classification, completed-first eviction, deterministic oldest-mutable hard-cap fallback, and final combined presentation when center compaction rows are merged.
4. Standalone/team live dispatch and local submission use a transaction-like Event Monitor commit boundary: capture a bounded lightweight ordered presentation witness before mutation, run the existing projection handler and completed-first enforcement, capture the final witness, and increment the ephemeral per-run presentation revision at most once only when those witnesses differ. Transient handler effects do not drive the revision.
5. Activity state uses the same terminal/completed classification and caps every per-run array at 100 recent records, evicting completed candidates first and using the same deterministic hard fallback only when necessary.
6. `AgentConversationFeed` receives the explicit presentation revision, uses the derived bounded presentation, keeps existing bottom-follow behavior, and adds a localized `New activity · Jump to latest` button only when a post-baseline visible revision arrives while the user is non-pinned.
7. `AgentWorkspaceView` removes the conversation `CopyButton`, its import, and the eager `conversationText` computation. The obsolete generated localization entry is removed; no replacement copy/export action is added.
8. Normal projection reports whether active-trace events precede the latest window. A dedicated active-trace page provider reconstructs lifecycle-correct replay events from the same active source, never archives, and exposes a server-fixed 50-event earlier cursor contract through explicit standalone and team-member queries.
9. The first earlier-load action establishes a server-consistent browse snapshot containing the current latest 100 plus up to 50 immediately preceding events. Later actions prepend at most 50 events. The opaque cursor is path-free, stable across append, and expires on active-file rewrite/compaction.
10. Frontend browse pages remain separate from `AgentRunState.conversation` and the Activity store. The browse controller freezes its presentation while live state continues independently, caps resident/mounted browse content at 300, releases farthest newer pages as necessary, and clears on run change, cursor recovery, or Jump to latest.

## Active-Trace Earlier-Paging Design

### Approved Behavioral Boundary

`latest mode (<=100) -> explicit Load 50 earlier -> active-trace browse snapshot -> repeated <=50 earlier pages -> beginning of raw_traces_active.jsonl`.

Archived segments are not a continuation source. `hasEarlier=false` means the active trace has begun even if the manifest lists archives. The UI states that earlier activity was compacted and stops.

### Server Page Contract

Add a sibling page capability under run-history projection, not under Memory Inspector and not in the resolver:

```text
getRunEventMonitorActiveTracePage(runId, beforeCursor?)
getTeamMemberEventMonitorActiveTracePage(teamRunId, memberRouteKey, beforeCursor?)
```

There is no client `limit`, file name, archive flag, or generic subject identifier.

- `beforeCursor = null` enters browse mode. The server rebuilds the current active replay sequence once for that request and returns a consistent window containing the newest 100 plus up to 50 immediately preceding events. `loadedEarlierCount` reports only the added earlier portion.
- A non-null cursor returns at most the immediately preceding 50 replay events.
- Each page entry is a dedicated typed `EventMonitorActiveTracePageEvent`; it never embeds `RunProjectionConversationEntry`, `RunProjectionActivityEntry`, `GraphQLJSON`, or another generic payload. One event carries its stable `eventId`, `turnGroupId`, timestamp, and a closed array of central-only typed visuals. Older tool activities are intentionally not returned to/hydrated into the Activity panel.
- Result metadata is `{ beforeCursor, hasEarlier, loadedEarlierCount, activeGeneration, cursorStatus }`, with cursor status `VALID` or `EXPIRED`. Absence/empty active data is a valid beginning result; malformed cursor input is a request error, not an empty/archive fallback.
- Normal `getRunProjection` / `getTeamMemberRunProjection` add only `hasEarlierActiveTraceEvents`; their latest conversation/Activity data remains newest-100.

The provider reads `raw_traces_active.jsonl`, normalizes the complete active record set, builds tool lifecycles and **identity-bearing** replay events, and only then selects the page and projects its central visuals. It must not use `rawTraceLimit`, raw byte/line offsets as display cursors, or a selected-file/archive service. This preserves tool call/result correlation across a 50-event boundary.

### Identity Carrier From Source To DOM (`AR-006`)

`HistoricalReplayEvent` gains required `eventId` and `turnGroupId` fields at construction rather than having page policy infer identity after content has already been collapsed:

- message/reasoning/compaction: `raw:v1:<length-prefixed normalized MemoryTraceEvent.id>` when the raw ID exists;
- a reconstructed call/result tool lifecycle: `tool:v1:<length-prefixed turnId>:<length-prefixed toolCallId>`, so append of its terminal record does not change identity;
- an orphan tool row with a raw ID: the same raw-ID rule; and
- an ID-less legacy row: `legacy:v1:<sha256 of a canonical flat tuple (traceType, turnId, seq, ts, sourceEvent, toolCallId/toolName, content digest, ordered media locator digest)>:<occurrence ordinal among equal fingerprints in normalized active order>`. It never serializes `toolResult`, logs, or a recursive object.

All replay providers that construct `HistoricalReplayEvent` must populate this carrier so the type is honest: Codex/Claude providers use their native event/item identity when exposed, otherwise the same flat provider-row fingerprint+occurrence fallback. Only the local-memory active-trace provider exposes these page queries, so no external transcript paging behavior is added. `turnGroupId` is a collision-safe length-prefixed `turnId` identity used only to keep adjacent assistant visuals from the same turn in one stable row; if an imported/provider event has no turn identity it uses `ungrouped:<eventId>`, never a shared null/default group.

Each central visual receives:

```text
visualId = active-trace-visual:v1:<base64url(eventId)>:<visualKind>:<kindOrdinal>
```

`kindOrdinal` counts only visuals of that kind within the event, so an assistant/tool event that yields a card, text, image, audio, and video has deterministic distinct IDs. `eventId` and `visualId` travel unchanged through replay/page projection, GraphQL DTO, page block, controller map, page-only presentation conversion, `data-event-monitor-visual-key`, and Vue `:key`. They are not recomputed from content/timestamp on the web. Cursor anchors use `eventId`; scroll/disclosure anchors use `visualId`.

The page controller uses `Map<eventId, PageEvent>` plus `Set<visualId>` for protocol validation and linear merge. Repeated delivery of the same event ID is treated only as transport overlap/retry and retains the existing event; two different event IDs are never compared or merged by content. Duplicate IDs with conflicting structural metadata are a typed protocol error, not a reason to call normal semantic dedupe. Page code must not call `dedupeProjectionEntries`, `projectionEntriesCanMerge`, `stableJson`, or `buildConversationFromProjection`.

### Dedicated Central Page Projection (`AR-007`)

The GraphQL schema uses an explicit discriminated union rather than an existing projection JSON object:

```text
EventMonitorActiveTracePageEvent {
  eventId: ID!
  turnGroupId: ID!
  occurredAtMs: Float
  visuals: [EventMonitorActiveTracePageVisual!]!
}

EventMonitorActiveTracePageVisual =
  UserVisual { visualId, eventId, kindOrdinal, text, attachments[] }
| AssistantTextVisual { visualId, eventId, kindOrdinal, content }
| ThinkingVisual { visualId, eventId, kindOrdinal, content }
| ToolCardVisual { visualId, eventId, kindOrdinal, invocationId, cardKind,
                   toolName, statusKey, summaryArgs, errorMessage, approvalTarget }
| MediaVisual { visualId, eventId, kindOrdinal, mediaType, urls[] }
| CompactionVisual { visualId, eventId, kindOrdinal, activityId, phase,
                     message, turnId, rawTraceCount, semanticFactCount, provider }
```

`attachments` is a typed array of `{attachmentId, mediaType, locator}` where `attachmentId` is derived from the owning visual ID plus media kind/ordinal. `summaryArgs` is not arbitrary JSON: it is a typed object containing only optional string fields from the existing display allowlist (`path`, `file_path`, `filepath`, `filename`, `target_path`, `command`, `cmd`, `script`, `query`, `prompt`, `url`, `message`, `text`, `title`, `name`, `raw`). For write/edit/terminal card kinds the server reduces it further to the applicable path/command input. `statusKey` is the already-derived central status union `running|success|error|approved|awaiting-approval|denied|default`; the web does not infer success from result presence. `approvalTarget` is either null or the closed scalar/string-list action-target type already accepted by the central card. String field count is bounded; visible strings are not silently truncated because the current card exposes their full title.

The following fields do not exist anywhere in the page schema: raw `toolResult`, `result`, `logs`, Activity context/detail level, arbitrary arguments, raw content blobs used only by Activity, or generic JSON/reference payloads. The server's `buildEventMonitorActiveTracePageEvent` reads only named replay primitives, never recursively traverses tool result/log data, and creates one or more visuals in O(events + emitted visuals). A result-heavy source affects lifecycle status before projection but cannot affect page bytes once the same semantic `statusKey`/error is held constant.

The web page converter validates the closed generated GraphQL types and converts them in O(events + visuals) to `EventMonitorActiveTraceBrowsePresentationItem[]`. User/text/Thinking/media/compaction variants reuse their existing leaf render components. Tool visuals become the existing shallow `ToolCardPresentation` and are passed directly to `ToolCallIndicator`; `buildEventMonitorPageToolCardPresentation` uses the shared `getToolDisplaySummary` over only the allowlisted `summaryArgs` and consumes the explicit `statusKey`. It never creates a result-bearing `AIResponseSegment`.

### Opaque Cursor And Generation

The internal version-1 cursor payload is schema-validated before use and base64url encoded as an opaque transport string:

```text
{ version: 1, subjectFingerprint: <digest>, activeGeneration: <digest>, beforeEventId: <stable event id> }
```

It contains no absolute/relative path, segment name, page size, or raw content. `subjectFingerprint` is a one-way digest of the resolved canonical standalone-run or team-member source identity; the service must match it to the currently authorized query subject, so a cursor from another run/member is rejected before selection. `beforeEventId` must exist in the reconstructed current active sequence. Stable event identity uses the source raw-trace ID when present; tool events use their tool identity/anchor; legacy ID-less records receive a deterministic hash of bounded ordering/identity fields plus their occurrence ordinal. Page response entries carry the same identity so client merging is linear and boundary-exact.

`activeGeneration` is derived from the file identity captured from the opened active-file descriptor (`device + inode`, deliberately excluding append-changing size/mtime), the latest complete manifest generation, and earliest active source identity. Ordinary append preserves it; the supported compaction/prune path writes a temporary file and atomically renames it, changing inode and manifest/earliest-boundary evidence. On a platform where stable descriptor identity is unavailable, use latest complete manifest generation plus earliest active identity; document that weaker fallback and keep anchor presence mandatory. A generation mismatch/missing anchor returns typed `EXPIRED`; foreign-subject or malformed input is a request error. Neither case attempts archive repair.

### Frontend Browse State And Rendering

`useEventMonitorActiveTraceBrowse` owns ephemeral page/query state for one explicit subject:

```text
subject = { kind:'run', runId }
       | { kind:'teamMember', teamRunId, memberRouteKey, agentRunId }
state = latest | loading | browsing | error | expired | beginning
```

The composable dispatches to explicit agent/team query clients; the discriminated union is a frontend adapter, not a generic server identity boundary. It stores ordered page DTOs/cursors only while that subject is selected. It never writes to `AgentRunState.conversation`, `eventMonitorPresentationRevision`, or the Activity store.

On the first successful load, the server-consistent <=150-entry snapshot becomes the displayed browse source. Live conversation/Activity handlers continue updating the normal latest-100 state behind it. Presentation-revision changes while browsing only expose the existing jump action; they do not patch or force-scroll the frozen browse snapshot. Jump/return clears browse state and reveals current live truth.

The browse merge indexes only by `eventId`, preserves chronological order, and converts the dedicated visuals through the page-only linear converter above. It does not call `enforceRecentConversationWindow` or any normal hydration/dedupe converter. The presentation groups adjacent assistant visuals by stable `turnGroupId` solely for current avatar/layout continuity; assistant row key is `browse-assistant:<turnGroupId>` and every nested visual is keyed by `visualId`. User/compaction row keys are their `visualId`. Every visual wrapper also exposes `data-event-monitor-visual-key=visualId`, so anchoring never uses an ordinal row key. If central visual count would exceed 300, complete farthest-newer page blocks are released until the result is <=300. The lower boundary then offers Jump to latest. This page-turnover design is chosen over a new dynamic-height virtualizer because the repository has no virtualization capability and Event Monitor cards contain asynchronous markdown/media/disclosures.

`AgentConversationFeed` remains scroll authority. Before emitting a load request it captures `(scrollHeight, scrollTop, firstVisibleVisualId/offset)` from the first intersecting `[data-event-monitor-visual-key]`; after the successful prepend and `nextTick`, it finds that same escaped visual ID and restores its offset, with scroll-height delta only as a fallback. Stable visual Vue keys ensure a retained Thinking/tool disclosure component cannot be rebound to an equal-content neighbor after prepend or turnover. Loading, retry, beginning, newer-released, and cursor-expired controls are props/events from the browse controller and are localized real buttons where interactive.

### Performance And Index Posture

The first implementation intentionally reuses complete active-file lifecycle reconstruction per explicit page request. Evidence on the largest observed active file (5.08 MB / 988 records) showed server projection in ~0.167 seconds before response limiting, while the former 9.09 MB response and quadratic web hydration were the material cost. A persistent or writable replay index would introduce schema, invalidation, compaction coordination, and rebuild ownership without measured need. `AC-015` is the gate: only a corrected page measurement that misses 2.0 seconds because backend active reconstruction dominates may reopen an index/checkpoint design.

## Delivery Validation Mismatch Assessment

The multi-minute hands-on observation does not traverse `DS-001` of the integrated candidate. The user-added node at `http://127.0.0.1:8000` is served by the pre-existing `/app/autobyteus-server-ts` process against `/home/autobyteus/data`; its compiled provider still requests `includeArchive:true` and has no compiled recent projection policy. The packaged integrated backend on port 29695 contains `includeArchive:false` plus `selectRecentReplayEvents`, but its AppConfig/run-history data root is `/root/.autobyteus/server-data`. Therefore:

`new renderer -> old remote backend -> archive-inclusive unbounded bundle -> full-input client dedupe -> final defensive cap`

was observed instead of:

`new renderer -> integrated backend -> active-only lifecycle build -> newest-100 bundle -> bounded client hydration/render`.

The frontend bound cannot move ahead of an HTTP response or undo server archive I/O, response construction, transport, or full-input historical dedupe already incurred. This is a version-skew/validation-premise mismatch, not evidence that the integrated provider ignored its policy.

The 212.893 seconds from node-window creation to eventual-success screenshot is also not a row-selection metric: exact row click, GraphQL request, hydration commit, and usable-content markers were not captured. It remains possible that remote node bootstrap/catalog/workspace work contributed, but the existing evidence cannot quantify it.

**Design decision:** no production requirement, API, or ownership change is justified from this observation alone. `REQ-001`/`REQ-002` already require the missing backend behavior, and `AC-009` already requires <=2.0-second usability. Corrected same-candidate validation against a safe snapshot is the next gate. API/E2E owns that execution. Any failure first returns to code review for focused origin classification; only that review may route a bootstrap issue to focused follow-up, measured backend/team-fan-out Design Impact to solution design, an implementation defect to implementation engineering, or a validation-environment/test issue back to API/E2E.

## Supplemental Solution Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval |
| --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/history-window-ui-ux-spec.md` | Defines exact latest window, active-trace paging, scroll/recovery, disclosure, label, and copy-removal behavior | `REQ-001`–`REQ-012`; `AC-001`–`AC-015` | Constrains latest/browse presentation and interaction; no archive affordance may be added | `Refined`; user-approved 2026-07-18 and 2026-07-20 |
| `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/integrated-live-validation-plan.md` | Defines safe same-candidate snapshot topology, latest/page measurement schema, and failure classification | `REQ-001`–`REQ-003`, `REQ-009`–`REQ-012`; `AC-001`–`AC-003`, `AC-008`–`AC-010`, `AC-012`–`AC-015` | Validation supplement; separates bootstrap, backend, hydration, usability, page, and bound evidence without changing production UX | `Design-ready`; approval `N/A` |

## Task Design Health Assessment (Mandatory)

- Change posture: `Performance`, `Behavior Change`, `Feature`, `Cleanup`
- Current design issue found: `Yes`
- Root cause classification: `Missing Invariant`
- Refactor needed now: `Yes`
- Evidence: The provider reads an unbounded archive corpus; GraphQL returns it; frontend conversation and Activity hydration use quadratic scans; historical/live state and mounted components have no duration-independent bound. A real run produced a 47.54 MB response and 27.9 seconds of client dedupe. Even the largest observed active-only file produced 609 conversation entries, 379 activities, 9.09 MB, and ~906 ms of current client dedupe. For paging, current replay drops some raw IDs, normal conversion semantically collapses equal entries and recursively walks toolResult, and actual row/segment keys are ordinal.
- Design response: Put active-only/recent selection in the shared run-history provider; keep one lifecycle-aware frontend Event Monitor window capability with completed-first eviction and a deterministic hard fallback; make the authoritative mutation boundary compare bounded pre/post presentation witnesses before revising run state; reset every conversation-replacement baseline including team reopen; cap Activity using the same completion policy; and defend the final merged presentation in the feed. Add active-trace paging as a sibling provider policy with identity assigned during replay construction, a closed central visual projector, isolated ID-only view-state/conversion, and stable actual DOM keys, so optional older content cannot bypass archive exclusion, expand canonical live/Activity state, collapse equal events, or transport hidden result detail.
- Refactor rationale: Scattering `slice(-100)` across resolvers, handlers, and templates would encode different meanings (raw record, message, segment, activity, feed row) and would inevitably drift. The new capability makes the user-approved visual-event meaning explicit and testable.
- Intentional deferrals and residual risk: The bounded normal GraphQL bundle still duplicates tool details between conversation and Activity; one event can still be byte-heavy; active-team restore may still request several bounded member projections. Explicit earlier pages may reconstruct the complete active file for lifecycle correctness. Current measurements do not justify a persistent replay index, canonical archive timeline, virtual-list subsystem, or focus-lazy orchestration without new evidence.
- Delivery re-evaluation: The integrated implementation passed isolated built-server/browser evidence, while the slow hands-on attempt used the old backend. No new production design issue is established. The accepted active-team fan-out residual risk becomes a design issue only if corrected snapshot validation shows it violates `AC-009`.

## Architecture Review Finding Resolution

| Finding ID | Round-1 Concern | Revised Design Resolution | Verification |
| --- | --- | --- | --- |
| `AR-001` | Blind oldest-edge trimming could evict a still-mutable segment while completed candidates existed, and the hard-bound edge was only a residual risk. | The window capability now classifies each visual event, evicts oldest completed candidates first, and uses oldest-mutable eviction only for remaining overflow after completed candidates are exhausted. Stable-identity late updates can create at most one source-limited newest-edge representation; no retained duplicate or archive read. | Mixed completed/mutable, 101-all-mutable, late-update re-entry, tool/compaction terminality, and Activity-store tests. |
| `AR-002` | `conversation.updatedAt` changes for non-visible protocol traffic and could falsely show unseen activity. | `AgentRunState.eventMonitorPresentationRevision` remains the explicit ephemeral signal, but the downstream-reviewed implementation supersedes the handler-effect mechanism with a net bounded witness comparison. Non-visible/no-op/net-identical commits do not bump. Hydration/run replacement resets the baseline. | Witness equality tests, protocol matrix, and feed pinned/non-pinned/reset tests. |
| `CR-001` | The implemented handler-effect OR enforcement-removal commit bumped for a transient appended event that enforcement removed, although final presentation was identical. | `beginRecentEventMonitorMutation` captures the ordered bounded witness before the handler; `commitRecentEventMonitorMutation` enforces, captures the final witness, and bumps only when `areRecentEventMonitorPresentationWitnessesEqual` is false. The old effect parameter/OR condition is removed from the authoritative commit contract. | Exact `MP-CR-001` regression plus ordinary retained update, real eviction-only, compaction, membership/order, and no-op cases. |
| `CR-002` | Reused non-live team-member conversation replacement omitted revision reset. | `teamRunOpenCoordinator.mergeHydratedMembers` resets immediately after assigning the hydrated conversation in the `preserveLiveRuntimeState:false` branch. The live-preservation branch leaves conversation and revision untouched. | Focused same-member reopen tests for both non-live replacement and subscribed-live preservation. |
| `AR-003` | Proposed witness tokens included non-rendered tool result/log state and raw argument reference identity, while omitting an exact per-kind central render contract. | The pure witness now follows the complete per-kind table below. Tool tokens use the same derived card input/summary helper as the wrappers/`ToolCallIndicator`, exclude result/log/raw argument identity, and compare semantic status/summary/error/action primitives. User attachments, usage rows/footer, every static/media/error/inter-agent kind, and exact compaction primitives are explicit. | `MP-AR-003` log/result no-op tests; equal-argument replacement; true tool card change; complete per-kind, membership/order, and no-recursion witness tests. |
| `AR-004` | Static provider/response evidence and FD snapshots could miss transient archive opens; one combined source check became non-attributable after the live owner restarted. | The validation contract adds request/full-lifetime path-only open auditing and splits `COPY-001`, `OPEN-001`, `SNAPSHOT-RAW-001`, `LIVE-SOURCE-001`, and `OLD-OWNER-001`. Mode S requires live equality; Mode R treats legitimate live-owner writes as informational and requires tracing. Without tracing, only a limited Mode S run may proceed, explicitly leaving representative no-open re-proof unexecuted and citing prior durable evidence. | Path-only audit lines/counts when available; explicit not-executed state otherwise; per-mode hash/owner evidence with no conflated failure gate. |
| `AR-005` | The validation matrix routed failures directly to presumed owners instead of mandatory API/E2E result review. | After architecture pass, API/E2E executes. Every Fail returns first to code reviewer for focused origin classification; Pass receives proportional test-code review before delivery; Blocked goes to the user with the exact dependency. | Handoff route and reports contain scenario IDs, exact context, test-change status, and preserved delivery hold. |
| `AR-006` / `MP-AR-006` | Page identity ended at transport metadata while replay dropped message/reasoning raw IDs, normal conversion content-deduped, and feed/segment DOM keys were ordinal. | Required `eventId`/`turnGroupId` enter during replay construction; the dedicated page DTO carries deterministic `(eventId, visual kind, ordinal)` `visualId`s unchanged through controller, page-only conversion, `data-event-monitor-visual-key`, and actual Vue row/segment keys. Content dedupe is forbidden and duplicate structural IDs are protocol errors. | Equal-content/equal-timestamp raw events straddling a boundary remain distinct; prepend/turnover anchor and disclosure tests assert the same visual key/DOM instance; legacy/tool/raw ID matrices cover identity stability. |
| `AR-007` / `MP-AR-007` | Reusing normal conversation projection would carry raw `toolResult` and invoke recursive semantic serialization although the central card does not render result/log detail. | A closed typed page visual union replaces `RunProjectionConversationEntry`/`GraphQLJSON`. Tools carry only invocation, effective name/card kind, allowlisted shallow string summary inputs, explicit semantic status, error, and bounded action target. The page-only converter is linear and passes a shallow `ToolCardPresentation` directly to the existing indicator. | With central fields/IDs held constant, multi-megabyte-result vs result-null fixtures yield byte-identical serialized central `events` (cursor/generation excluded) and no sentinel/result/log schema; explicit status/summary/error render tests and O(events+visuals) conversion/PAGE-001 measurements. |

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
- **Active-trace browse mode:** A frozen, ephemeral, server-consistent ordered view entered only after explicit Load 50 earlier; its source range is the current active trace and its resident central presentation is at most 300.
- **Active generation:** A path-free digest that remains stable across append and changes when compaction/prune rewrites the active file.
- **Earlier-page cursor:** An opaque versioned token containing the active generation and an existing before-event anchor; it cannot select a file, archive, or page size.
- **Page event ID:** Required identity assigned during replay construction from raw-trace ID, tool lifecycle, or deterministic legacy fingerprint/occurrence; it is the cursor/merge identity and is never content-derived after conversion.
- **Page visual ID:** Collision-safe identity derived from `(page event ID, central visual kind, kind ordinal)` and carried unchanged into the actual browse DOM key and scroll/disclosure anchor.
- **Central page projection:** Closed typed user/text/Thinking/tool/media/compaction wire model containing only central render/retained-interaction primitives; it is not the normal result-bearing conversation/Activity projection.

## Design Reading Order

1. Stored traces are directly usable; no migration.
2. Backend recent projection is the primary read spine.
3. Historical hydration and live dispatch converge on one frontend window capability.
4. Activity and presentation provide bounded local guards.
5. Active-trace paging is a separate explicit read spine and a separate frontend view state; it never enlarges canonical live/Activity state.
6. Feed scrolling, page anchoring/recovery, and header cleanup complete the visible change.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Remove the archive-inclusive setting from the normal local projection path, remove the unbounded normal Event Monitor state behavior, and remove the header copy control/full-text derivation and its now-unused generated translation keys.
- No `includeArchive` feature flag, archive/full-history query, compatibility wrapper, or hidden copy fallback will be retained for the replaced behavior. The new page query is active-only by construction and cannot be widened by a client argument.
- Archive files remain persisted data, not a legacy execution path; their storage/writing is outside this change and remains intact.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: JSONL trace records in per-run memory directories under `memory/agents/<runId>/` and hierarchical `memory/agent_teams/<...>/<memberRunId>/`; active file, optional complete segment files, optional manifest. Observed corpus was roughly 209 MB team + 27 MB standalone; largest active-only file observed was 5,078,533 bytes / 988 rows.
- Relevant code-model, serialization, semantic, or physical-store change: No schema, writer, serialization, or physical layout change. Only normal projection file selection and derived event retention change.
- Normal reader/writer behavior and representative evidence: Existing `AgentMemoryService` already reads active-only when `includeArchive` is false; normalization is version-agnostic for current trace records. Rotation writer continues unchanged.
- Required semantics and invariants under direct use: Active records sort deterministically; tool interactions use all active records; newest replay events preserve chronological order; no projection read writes any trace file.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: No rewrite, deletion, migration, downtime, or raw-payload evidence retention.
- Decision: `Directly Usable — No Migration`
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: Current files already provide the approved source. A migration would not address unbounded reads and would add unnecessary I/O/corruption/recovery risk.
- Acceptance criteria or design constraints supported by this decision: `AC-001`, `AC-002`, `AC-010`, `AC-012`; archived files remain byte-for-byte untouched and existing active-only/manifests work immediately for both latest and explicit page reads.

## Relevant Behavior And Target Production-Path Map

| Behavior ID | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle Boundary | Spine IDs | Verification Authority |
| --- | --- | --- | --- | --- |
| `BEH-001` | Replace archive-inclusive normal history with active-only newest 100. | Run/team GraphQL -> projection service -> local-memory provider -> active reader -> replay selector -> bundle. | `DS-001`, `DS-002` | `REQ-001`–`REQ-003`; `AC-001`–`AC-003`, `AC-008`–`AC-010` |
| `BEH-002` | Bound historical/live central and Activity state with completed-first, hard-fallback semantics. | Hydration and live/submission commits -> window/Activity enforcement -> final presentation. | `DS-002`–`DS-005` | `REQ-003`, `REQ-004`, `REQ-007`; `AC-003`, `AC-004` |
| `BEH-003` | Preserve bottom follow and expose Jump only for a net bounded visible change; browse Jump exits to live truth. | Begin witness -> handler/enforce -> post witness/revision -> feed pin/unseen state. | `DS-003`, `DS-004`, `DS-007` | `REQ-005`, `REQ-011`; `AC-005`, `AC-013`, `AC-014` |
| `BEH-004` | Preserve collapsed-by-default Thinking/tool disclosures. | Existing segment wrappers/indicators under latest or browse presentation. | `DS-004`, `DS-007` | `REQ-006`; `AC-006` |
| `BEH-005` | Remove conversation copy control and eager derivation without replacement. | Workspace header composition. | `DS-004` off-spine cleanup | `REQ-008`; `AC-007` |
| `BEH-006` | Add explicit fixed-50 earlier traversal only within current active trace, with <=300 resident visuals and stable source-to-DOM event/subvisual identity. | Load action -> explicit run/team page query -> identity-bearing active replay -> dedicated central page visual DTO -> isolated ID merge/turnover -> keyed feed DOM. | `DS-006`, `DS-007` | `REQ-010`–`REQ-012`; `AC-012`–`AC-015` |
| `BEH-007` | Keep cursors valid across append and expire safely across active rewrite/compaction. | Active generation/anchor validation -> typed page result -> inline Return to latest. | `DS-006`, `DS-007` | `REQ-011`; `AC-013` |
| `BEH-008` | Keep older page entries out of Activity and canonical conversation; normal Activity remains <=100; raw tool result/log detail never enters the page DTO/converter. | Closed central page visual union -> linear browse converter; normal result-bearing hydration/Activity store remains separate. | `DS-005`–`DS-007` | `REQ-007`, `REQ-010`–`REQ-012`; `AC-004`, `AC-014`, `AC-015` |
| `BEH-009` | Preserve all raw-trace files directly usable and unchanged. | Existing memory reader/writer; new projection/page paths are read-only and archive-excluding. | `DS-001`, `DS-006` | `REQ-009`, `REQ-010`; `AC-001`, `AC-010`, `AC-012` |

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | Run/member projection request | Bounded projection response | `LocalMemoryRunViewProjectionProvider` | Eliminates archive work and bounds normal transport |
| `DS-002` | `Primary End-to-End` | Projection response commit | Bounded hydrated conversation/Activity | Run hydration services + recent-window capability | Prevents historical state/mount growth |
| `DS-003` | `Return-Event` | Standalone/team live message or local submission | Bounded live state + actual presentation revision | Streaming/submission boundary + recent-window capability | Prevents multi-day growth without false unseen signals |
| `DS-004` | `Bounded Local` | Conversation + compaction props + presentation revision | Completed-first ≤100 rendered feed + scroll state | `AgentConversationFeed` | Enforces exact visual bound and truthful jump UX |
| `DS-005` | `Bounded Local` | Activity insert/upsert | Bounded per-run Activity array | `agentActivityStore` | Prevents hidden secondary state growth |
| `DS-006` | `Primary End-to-End` | Explicit Load 50 earlier | Identity-bearing closed central-visual page response | Agent/team page resolver -> run-history page provider/projector | Adds useful earlier context without archive/full-history/result payload work |
| `DS-007` | `Return/Bounded Local` | Typed earlier page response | Stable-keyed anchored <=300 browse presentation or typed recovery | Active-trace browse controller + page-only converter + `AgentConversationFeed` | Separates frozen browsing from live truth and binds anchor/disclosure to source identity |

## Primary Execution Spine(s)

- `DS-001`: `GraphQL standalone/team resolver -> projection service -> LocalMemoryRunViewProjectionProvider -> AgentMemoryService(active only) -> active raw traces -> buildHistoricalReplayEvents -> selectRecentReplayEvents(100) -> buildRunProjectionBundleFromEvents -> existing GraphQL response`
- `DS-002`: `GraphQL projection response -> run context hydrator -> buildConversationFromProjection -> enforceRecentConversationWindow -> hydrateActivitiesFromProjection -> agentActivityStore bounded inserts -> AgentEventMonitor`
- `DS-006`: `Load 50 earlier -> explicit standalone/team GraphQL page query -> existing source resolution -> active-only memory view -> full active lifecycle reconstruction with eventId/turnGroupId -> validate generation/anchor -> select newest-100-plus-50 event page or preceding-50 page -> project closed typed central visuals with stable visualId -> response`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | Resolve the existing explicit run subject, read only its active file, reconstruct active lifecycle evidence, take the newest 100 replay events, and return the existing bundle shape. | Run source descriptor, active traces, historical replay events, projection | Local-memory projection provider | Deterministic ordering, source-limited boundary fidelity, no disk writes |
| `DS-002` | Convert the already bounded response, defensively enforce the visual-event policy, and commit recent conversation/Activity state for the selected context. | Projection entries, Conversation, RunActivity | Hydration services + recent-window policy | Dedupe remains but is bounded; selection-staleness remains existing owner concern |
| `DS-003` | Capture the current bounded ordered presentation witness, route the live/local mutation through existing handlers, enforce completed-first retention, capture the final witness, and increment the run revision once only when the witnesses differ. | ServerMessage/local submission, AgentContext, pre/post witness, revision | Event Monitor mutation commit used by streaming/submission owners | Tool lifecycle updates, task-agent routing, Activity compactions, browser side effects |
| `DS-004` | Merge message/segment and eligible compaction descriptors, apply the same completed-first selector (oldest-mutable fallback only when unavoidable), regroup retained assistant segments, and react only to explicit post-baseline revisions for pinned/unseen scroll state. | Classified visual descriptors, feed groups, revision | Agent conversation feed + presentation selector | Localization, keyboard/focus, dynamic-height content |
| `DS-005` | Dedupe/effectively update an Activity, append/update, evict oldest terminal/completed overflow before mutable overflow, recompute approval state, and clear an evicted highlight. | Per-run Activity state | Activity store | Approval/highlight consistency |
| `DS-006` | Resolve the same explicit run/member subject, rebuild only the active trace with source/tool/legacy event identity, validate the opaque cursor generation/anchor, select the fixed event page, and return only closed typed central visuals with deterministic subvisual identity. | Active generation, identity-bearing replay event, cursor anchor, typed page event/visual | Run-history active-trace page provider + central page projector | No archive/file selector, no result/log/generic JSON, lifecycle-before-page ordering |
| `DS-007` | Validate/index the typed response by event/visual ID, build a frozen stable-keyed page-only presentation in linear time, preserve the exact visual anchor, release farthest newer pages until <=300, and keep live state behind the existing unseen/jump boundary. | Browse subject, page blocks, event/visual maps, cursor, visual DOM anchor | Active-trace browse controller + page-only presentation converter + feed | Localization, retry/expiry, dynamic-height tolerance, run-change cancellation |

## Spine Actors / Main-Line Nodes

- Existing standalone and team-member GraphQL resolvers/services: thin subject boundaries.
- `LocalMemoryRunViewProjectionProvider`: governs normal replay source and server event window.
- `AgentMemoryService`: existing active-file reader facade.
- Replay transformer/projection utilities: lifecycle reconstruction plus required source/tool/legacy `eventId`/`turnGroupId` carrier.
- Historical hydration services: commit bounded projection state.
- `AgentStreamingService`, `dispatchGenericTeamMemberMessage`, and `localUserSubmission`: live/local mutation boundaries.
- `recentEventMonitorWindow.ts`: frontend visual-event counting/trimming/presentation policy.
- `AgentRunState.eventMonitorPresentationRevision`: explicit per-run visible-change signal and hydration baseline.
- `agentActivityStore`: secondary bounded Activity state.
- `AgentConversationFeed`: mounted presentation and scroll state.
- Active-trace page resolver/provider/projector: explicit earlier-page source, generation/cursor, fixed page policy, stable subvisual identity, and closed central-only DTO.
- `useEventMonitorActiveTraceBrowse`: ephemeral ID-indexed page request/merge/turnover owner; never canonical run state.
- `buildEventMonitorActiveTraceBrowsePresentation`: linear page-only typed conversion; never normal conversation hydration/dedupe.

## Ownership Map

- The provider owns **what normal history source is allowed** and the maximum canonical events returned. Resolvers must not choose archive policy or pass optional legacy behavior.
- The memory service owns file reading/normalization choices; it must not know Event Monitor presentation semantics.
- The frontend recent-window capability owns **what counts as a visual event**, completion/mutability, candidate selection, hard fallback, and how conversation/presentation is trimmed. Streaming handlers must not each implement slices or unseen policy.
- Existing handlers own protocol projection mutations only. They may keep narrow internal change returns where useful for handler composition, but those returns are not authoritative revision inputs and obsolete cross-boundary `EventMonitorPresentationMutation` plumbing is removed.
- The Event Monitor mutation commit owns the pre-mutation witness, post-enforcement witness, equality decision, and single revision bump. Streaming/submission boundaries own sequencing around their handler call.
- `AgentRunState` owns the ephemeral revision counter/reset; it does not decide whether a protocol type is visible.
- Activity store owns its separate record cap, terminality selection, and internal derived flags. Center-eligible compactions enter the same final presentation witness through an explicit store adapter at the commit boundary.
- `AgentConversationFeed` owns bottom proximity, unseen baseline, jump behavior, and use of the final bounded presentation/revision; it must not infer activity from generic timestamps or fetch history.
- The active-trace browse controller owns page network state, event/visual ID protocol validation, ID-only merge, 300-event page-block turnover, and reset/cancel by subject. It passes explicit stable-keyed presentation/actions to the feed; it does not own scroll offsets or live mutation.
- The page-only presentation converter owns typed visual-to-row mapping and stable assistant grouping. It imports no normal hydration semantic-dedupe helper and creates no result-bearing conversation/tool segment.
- `AgentConversationFeed` additionally owns visual-ID prepend anchor capture/restoration and renders browse boundary controls, but still performs no GraphQL call or page merge itself.
- `AgentWorkspaceView` owns composition only and no longer owns conversation serialization.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `getRunProjection(runId)` GraphQL resolver | Agent run projection service/provider | Standalone subject authorization/transport | Archive or window policy |
| `getTeamMemberRunProjection(teamRunId, memberRouteKey)` resolver | Team-member projection service/provider | Explicit compound team-member identity | Archive or window policy |
| `AgentMemoryService.getRunMemoryView` | Memory store | Composes selected memory artifacts | Event Monitor event counting |
| `AgentEventMonitor.vue` | Conversation feed + Activity/composer children | Layout/composition | Recent event selection algorithm |
| `getRunEventMonitorActiveTracePage(runId, beforeCursor?)` resolver | Agent run projection/page provider | Explicit standalone active-trace page transport | Cursor generation, filesystem access, archive fallback |
| `getTeamMemberEventMonitorActiveTracePage(teamRunId, memberRouteKey, beforeCursor?)` resolver | Team-member projection/page provider | Explicit compound team-member page transport | Generic ID guessing, cursor generation, archive fallback |

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
- `DS-006` initial browse: `Load control -> page query without cursor -> identity-bearing current active replay sequence -> latest 100 + preceding <=50 -> closed central visual projection -> frozen typed response -> keyed anchored presentation`
- `DS-006` continuation: `Load control -> opaque before cursor -> validate subject + active generation + event anchor -> preceding <=50 -> stable event/visual page response -> ID-only prepend/turnover`
- `DS-007` live while browsing: `live commit -> normal capped state/revision -> browse snapshot unchanged -> unseen action -> Jump to latest -> clear pages -> reveal current live latest-100`

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
- Parent owner: active-trace page provider
  - Chain: `resolve explicit subject -> read/normalize full active records -> construct replay eventId/turnGroupId while building lifecycle -> derive generation -> validate optional cursor -> select initial 100+50 or preceding 50 -> emit typed central visuals/visualIds without result/log traversal`
  - Why: The same source owner guarantees archive exclusion, exact identity, lifecycle-correct fixed pages, and central-only bytes; resolvers remain thin.
- Parent owner: active-trace browse controller/page converter/feed
  - Chain: `capture first visible visualId/offset -> request/coalesce -> validate subject still selected -> validate/index eventId+visualId -> merge only by eventId -> release farthest newer page blocks until visual count<=300 -> linear page presentation -> render actual visualId Vue/data keys -> restore same visualId; error/expired preserve current view -> jump clears`
  - Why: Network/page state, typed conversion, and DOM anchoring have distinct owners but one explicit identity spine. No semantic content dedupe or ordinal browse key is reachable.

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
| Cursor codec/generation | `DS-006` | Page provider | Path-free versioned cursor and append-vs-rewrite validity | Stable paging during live append | Resolver/file-store cursor policy drift |
| Page event/visual identity | `DS-006`, `DS-007` | Replay/page projector/controller/feed | Preserve raw/tool/legacy identity into actual Vue/data anchor keys | No gaps, collapse, anchor drift, or disclosure reassignment | Reconstructing identity from content/index after conversion |
| Central page payload minimization | `DS-006`, `DS-007` | Page projector/page-only converter | Typed shallow render fields; explicit tool status/summary inputs; no raw result/log/Activity/generic JSON | Prevent hidden transport and recursive hydration work | Reusing normal conversation projection/converter |
| Localization/recovery | `DS-007` | Browse controller/feed | Load/loading/retry/beginning/compacted/newer-released states | Accessible bounded navigation | Network layer rendering strings |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Active-only file read | Agent memory service/store | `Reuse` | Already supports `includeArchive: false` | N/A |
| Replay lifecycle reconstruction | Run-history transformers | `Reuse` | Correctly combines active tool records | N/A |
| Replay/page identity carrier | Replay types + transformer currently drop some raw IDs | `Extend` | Identity must exist before page selection/content conversion and tool call/result must share one event | Assigning IDs in resolver/controller is too late and cannot distinguish collapsed equal events |
| Server recent event selection | Run-history projection | `Extend` | Policy belongs next to provider output | N/A |
| Active-trace page source/selection | Run-history projection + existing active memory reader/replay transformer | `Extend` | Same allowed source and lifecycle owner; page is sibling to recent selection | N/A |
| Cursor generation | No current run-history page owner | `Create New` inside run-history projection | Must bind append/rewrite lifecycle without exposing paths or archives | Memory Inspector file selector is user-file-oriented and archive-capable, so it is the wrong boundary |
| Frontend lifecycle-aware visual window | No current owner | `Create New` | Hydration, streaming, submission, and feed need one count/completion/selection meaning | Generic utils or one handler would hide capability ownership |
| Net visible-change signal | Existing effect-OR-enforcement commit is insufficient | `Create New` within Event Monitor | A bounded pre/post witness is the smallest owner with enough information; at most 100 shallow tokens | Timestamp/effect alternatives cannot prove net equality |
| Scroll pinning | Agent conversation feed | `Extend` | Existing 40px threshold and scroll element already owned here | N/A |
| Activity cap | Activity store | `Extend` | Store owns array and flags | N/A |
| Copy control cleanup | Workspace view | `Reuse`/remove | Remove local usage; shared CopyButton remains elsewhere | N/A |
| Browse page state | No canonical state should own it | `Create New` in Event Monitor capability | Frozen pages must coexist with live capped state and disappear on jump/selection | `AgentRunState.conversation` and Activity store enforce different live invariants |
| Page-only central visual conversion/render | Normal hydration converter + conversation render | `Create New` in Event Monitor capability while reusing leaf components | Normal converter semantically dedupes and carries result-bearing tool segments; page needs closed typed O(E+V) conversion and stable keys | Reusing `runProjectionConversation` violates `AR-006`/`AR-007` |
| Dynamic-height virtualization | No installed capability | `Do Not Add` | 300-event page turnover is sufficient and lower risk | A new virtualizer would add measurement/placeholder/focus complexity without evidence |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Server run-history projection | Active-only normal source, newest replay-event selection, identity-bearing replay, active-generation cursor, fixed earlier page, closed central visual projection | `DS-001`, `DS-006` | Local-memory provider/page policy/projector | `Extend` | Explicit typed page schema; no archive selector, result/log, or GraphQLJSON |
| Agent memory | Active JSONL read/normalize | `DS-001` | Memory service/store | `Reuse` | No Event Monitor constant here |
| Web Event Monitor window | Visual-event definition, completion classification, completed-first trim, hard fallback, presentation selection, witness/equality, mutation commit | `DS-002`–`DS-004` | Hydration/stream/feed | `Extend` | Split pure witness from stateful commit adapter to keep files tight |
| Web streaming/submission | Bracket mutation with begin/commit witness calls | `DS-003` | Existing dispatchers/submission | `Extend` | Handlers remain lifecycle-focused and do not own revision truth |
| Web Activity store | Recent activity retention | `DS-002`, `DS-005` | Pinia store | `Extend` | Same numeric contract, separate record meaning |
| Web Event Monitor browse | ID-only page merge, linear central visual conversion, stable keyed rows/subvisuals, turnover/reset | `DS-007` | Browse controller/page converter | `Create New` | Separate from canonical conversation/Activity and normal semantic converter |
| Web workspace components | Feed scroll/jump, browse boundary/visual-anchor states, typed browse rendering, and copy removal | `DS-004`, `DS-007` | Feed/workspace view | `Extend` | Reuse leaf components; disclosure behavior unchanged and keyed by visualId |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `recent-run-projection-policy.ts` | Server run history | Projection policy | Constant + newest replay-event selector | Singular server projection policy | `HistoricalReplayEvent` |
| `historical-replay-event-types.ts` + replay transformer | Server run history | Replay identity carrier | Required eventId/turnGroupId from raw ID, tool lifecycle, or legacy fingerprint/occurrence | Identity must exist before selection/projection | `MemoryTraceEvent`/tool interaction |
| `active-trace-event-page-policy.ts` | Server run history | Page/cursor policy | Generation/cursor codec and initial 100+50/preceding-50 identity selection | Keeps pagination arithmetic pure and testable | Identity-bearing `HistoricalReplayEvent` |
| `event-monitor-active-trace-page-projection.ts` | Server run history | Central-only page projector | Derive deterministic visualIds and closed typed user/text/Thinking/tool/media/compaction visuals | Separates render bytes from normal conversation/Activity bundle | Replay types + allowlisted primitives |
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
| `eventMonitorActiveTraceBrowse.ts` | Web Event Monitor | Ephemeral browse controller | Explicit subject query dispatch, event/visual ID validation, ID-only page merge, 300-event turnover, reset/cancel | Network/page lifecycle is separate from feed scroll and live state | Generated typed page DTO + page converter |
| `eventMonitorActiveTraceBrowsePresentation.ts` | Web Event Monitor | Pure page-only converter | Convert closed page visuals to stable-keyed rows/subvisuals in O(E+V); build shallow tool presentation | Normal hydration converter is semantically/result-bearing wrong boundary | Existing leaf card/text/media/compaction presentation types |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Frontend visual-event classification, selection, and trimming | `services/eventMonitor/recentEventMonitorWindow.ts` | Event Monitor | Used by hydration, live mutation, Activity-aligned presentation, and rendering | `Yes` — one count/completion rule | `Yes` — no separate historical/live slice rules | Generic catch-all UI utility |
| Ordered `RecentEventMonitorPresentationWitness` | `services/eventMonitor/recentEventMonitorPresentationWitness.ts` | Event Monitor | Begin/commit need one bounded net-equality structure | `Yes` | `Yes` — replaces transient effect semantics | Stored timeline, deep payload copy, or generic object serializer |
| Tool-card render semantics | `utils/toolCardPresentation.ts` extending `getToolDisplaySummary` | Conversation presentation | Four wrappers, `ToolCallIndicator`, and witness must agree on effective tool name/args/status/summary/action | `Yes` | `Yes` — removes wrapper-vs-witness derivation drift | Activity detail/result model |
| Event Monitor usage strings | `services/eventMonitor/recentEventMonitorUsagePresentation.ts` | Event Monitor | Feed rows/footer and witness must use identical formatting/presence rules | `Yes` | `Yes` — no raw-cost false positives below rendered precision | Full-run accounting service |
| Backend recent replay-event selection | `run-history/projection/recent-run-projection-policy.ts` | Run-history projection | Provider tests and provider share named limit | `Yes` | `N/A` | Storage reader or GraphQL paging abstraction |
| Active-trace cursor/selection | `run-history/projection/active-trace-event-page-policy.ts` | Run-history projection | Standalone/team page services share one fixed source-generation/page meaning | `Yes` — no client limit/path fields | `Yes` — no resolver-specific cursors | Generic storage/file browser cursor |
| Active-trace central visual DTO/projector | `run-history/projection/event-monitor-active-trace-page-projection.ts` | Run-history projection | Standalone/team share exact shallow central fields and stable visual IDs | `Yes` — result/log/Activity/generic JSON absent | `Yes` — no normal conversation entry reuse | General-purpose projection bundle or arbitrary payload serializer |
| Active-trace browse pages | `services/eventMonitor/eventMonitorActiveTraceBrowse.ts` | Web Event Monitor | Standalone/team surfaces share one isolated page state machine and turnover rule | `Yes` | `Yes` — never copied into conversation/Activity stores | Persistent timeline or generic Apollo cache wrapper |
| Page visual-to-render mapping | `services/eventMonitor/eventMonitorActiveTraceBrowsePresentation.ts` | Web Event Monitor | One linear typed mapping and stable key rule serves both subjects | `Yes` | `Yes` — no normal dedupe/synthetic result-bearing segment | Conversation hydrator or generic JSON renderer |

The numeric value `100` exists once per independently built server/web application. This is an explicit cross-application product contract verified by tests, not a reason to make the web depend on a server-internal file. Requirements remain the authority.

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `HistoricalReplayEvent[]` selected by server policy | `Yes` — required eventId/turnGroupId plus kind fields | `N/A` | `Low` | Assign identity during lifecycle build; never after semantic conversion |
| Frontend visual-event descriptor | `Yes` — kind/source/timestamp/order/render reference | `Yes` | `Low` | Keep internal to Event Monitor capability |
| `RecentEventMonitorPresentationWitnessToken` | `Yes` — stable identity plus per-kind semantic primitives only | `Yes` | `Low` | Explicit table/builders; reuse tool/usage presentation helpers; forbid raw references and generic recursive serialization |
| `Conversation` retained window | `Yes` for UI session state | `No` — existing derived fields remain | `Medium` | Trim segments/messages in place; do not create a second stored timeline |
| `RunActivity[]` | `Yes` | Existing conversation overlap remains | `Medium` | Bound to 100; schema redesign deferred |
| `EventMonitorActiveTracePageEvent` / visual union | `Yes` — event carrier plus closed central visual variants | `Yes` — no normal projection/result/log/generic payload | `Low` | Required eventId/turnGroupId; deterministic visualId/kindOrdinal; generated typed GraphQL union |
| `EventMonitorActiveTracePageCursorV1` | `Yes` — subject fingerprint + generation + before anchor | `Yes` | `Low` | Opaque/path-free/versioned; no size/file/archive fields; foreign subject rejected |
| `EventMonitorActiveTraceBrowseState` | `Yes` — one selected subject's frozen pages | `Yes` | `Low` | Ephemeral/component-owned; max 300 presentation; not canonical run state |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/projection/recent-run-projection-policy.ts` | Server run history | Internal projection policy | Export limit and pure `selectRecentReplayEvents` | Small, singular, testable policy | Historical replay type |
| `autobyteus-server-ts/src/run-history/projection/historical-replay-event-types.ts` | Server run history | Canonical replay type | Require `eventId` and `turnGroupId` on every replay variant | One carrier shared by transformer/selectors/providers | Raw/tool/provider identity primitives |
| `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | Server run history | Lifecycle + identity builder | Assign raw/tool/legacy event IDs while reconstructing events; never hash result/log recursively | Identity must be known before page selection | MemoryTraceEvent + ToolInteraction |
| `autobyteus-server-ts/src/run-history/projection/active-trace-event-page-policy.ts` | Server run history | Internal page policy | Export fixed 50 limit, generation/cursor codec, event-anchor validation, initial/earlier selection, typed expiry | One coherent stateless page contract | Identity-bearing replay types + crypto/path-free primitives |
| `autobyteus-server-ts/src/run-history/projection/event-monitor-active-trace-page-projection.ts` | Server run history | Closed central projector | Derive stable visual IDs, typed visual variants, allowlisted tool summary inputs, explicit status, and zero result/log/Activity fields | Keeps page bytes/presentation contract separate from normal bundle | Replay events + page DTO types |
| `.../providers/local-memory-run-view-projection-provider.ts` | Server run history | Normal local provider | Read active only, build all active replay events, apply selector, build bundle | Existing authority | Policy selector |
| `.../services/agent-run-view-projection-service.ts` | Server run history | Standalone source boundary | Resolve metadata/source for both recent projection and active-trace page; expose page-from-metadata method | Prevents resolver/provider bypass | Existing source descriptor + page provider |
| `.../services/team-member-run-view-projection-service.ts` | Server run history | Team-member source boundary | Reuse member location/metadata resolution and delegate active page with explicit member identity | Existing compound identity authority | Agent page service |
| `.../api/graphql/types/event-monitor-active-trace-page.ts` | Server GraphQL | Shared generated transport types | Explicit object/union types for page event, every central visual, summary args/action target, page info/result | Avoid duplicated TypeGraphQL shapes and structurally exclude generic payloads | No `GraphQLJSON`, result, log, or Activity type |
| `.../api/graphql/types/{run-history,team-run-history}.ts` | Server GraphQL | Thin public facades | Add explicit earlier-page queries and normal availability field | Identity remains separate | Page services/types |
| `autobyteus-web/services/eventMonitor/recentEventMonitorWindow.ts` | Web Event Monitor | Pure window capability | Export limit; classify/select/trim; build bounded presentation | Existing coherent UI policy; remove stateful commit from near-threshold file | Conversation/activity types |
| `autobyteus-web/services/eventMonitor/recentEventMonitorPresentationWitness.ts` | Web Event Monitor | Pure witness owner | Convert final presentation items to ordered shallow tokens and compare | Singular net-presentation meaning; O(100), no deep serialization | Store access, mutation, revision bump |
| `autobyteus-web/utils/toolCardPresentation.ts` | Web conversation presentation | Shared pure tool-card contract | Resolve effective wrapper inputs, semantic status key, `getToolDisplaySummary` output, error, and approval/highlight interaction primitives | Both current card renderer path and witness call it, preventing `AR-003` drift | Tool result/log/detail state |
| `autobyteus-web/services/eventMonitor/recentEventMonitorUsagePresentation.ts` | Web Event Monitor | Shared pure usage formatter | Produce exact per-message and retained-total strings used by feed and witness | Prevents raw numeric changes that round to the same UI from falsely revising | Store access/full-run accounting |
| `autobyteus-web/services/eventMonitor/recentEventMonitorMutationCommit.ts` | Web Event Monitor | Stateful commit boundary | Get center compactions, capture baseline, enforce/capture final, compare, bump revision | Only owner with both states and store adapter | Handler protocol switch or feed scroll logic |
| `.../runHydration/runProjectionConversation.ts` | Web hydration | Normal latest converter only | Retain bounded normal semantic conversion; expose no browse entrypoint | Its deep semantic/result-bearing behavior is intentionally isolated away from paging | Existing normal projection types |
| `autobyteus-web/services/eventMonitor/eventMonitorActiveTraceBrowse.ts` | Web Event Monitor | Ephemeral browse controller | Explicit query dispatch, structural ID validation, Map/Set ID-only merge, <=300 visual turnover, state/reset/cancel | One subject-owned browser separate from live state | Page service + page-only converter |
| `autobyteus-web/services/eventMonitor/eventMonitorActiveTraceBrowsePresentation.ts` | Web Event Monitor | Pure typed page converter | O(E+V) page visual -> stable keyed user/assistant/compaction rows; map page tool to shallow ToolCardPresentation | Singular page rendering contract; no normal semantic dedupe | Generated page types + leaf presentation types |
| `autobyteus-web/services/eventMonitor/eventMonitorActiveTracePageService.ts` | Web Event Monitor transport | Explicit client adapter | Call standalone or team query from discriminated subject; map typed errors | Keeps Apollo details out of state machine/feed | GraphQL queries/types |
| `autobyteus-web/components/workspace/agent/EventMonitorBrowseAssistantRow.vue` | Web workspace UI | Typed browse row renderer | Render stable-keyed page text/Thinking/tool/media visuals using existing leaf components and direct ToolCallIndicator | Avoids synthetic result-bearing AIResponseSegment and preserves visual keys | Page presentation union + existing leaf components |
| `.../agentStreaming/handlers/*` | Web streaming projection | Mutation owners | Preserve protocol mutations and segment completion; remove obsolete cross-boundary revision-effect plumbing unless still narrowly needed internally | Net witness supersedes effect contract | Window/revision decisions |
| `.../agentStreaming/handlers/segmentIdentity.ts` | Web streaming projection | Stream segment identity | Extend identity metadata with presentation lifecycle completion set by `SEGMENT_END` | Existing segment identity owner | No window selection |
| `.../agentStreaming/AgentStreamingService.ts` | Web streaming | Standalone dispatcher | Begin witness before switch; commit after switch | Existing mutation sequencer | Commit boundary |
| `.../agentStreaming/teamStreamGenericMessageDispatcher.ts` | Web streaming | Team member dispatcher | Begin/commit around generic member mutation | Existing team mutation sequencer | Commit boundary |
| `.../runSubmission/localUserSubmission.ts` | Web submission | Local append boundary | Begin before append; commit after append | User message mutation sequencer | Commit boundary |
| `autobyteus-web/types/agent/AgentRunState.ts` | Web run state | Ephemeral revision owner | Counter, bump, reset on hydration/context replacement | Explicit per-run signal | N/A |
| `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | Web run open | Team context merge/replacement | Reset revision after non-live conversation replacement; preserve on subscribed-live state preservation | Missing production path from `CR-002` | Window/revision comparison algorithm |
| `autobyteus-web/stores/agentActivityStore.ts` | Web Activity | Store | Completed-first cap, hard fallback, actual effect, derived-state repair | Store owns all Activity mutation | Web classifier/limit |
| `.../AgentConversationFeed.vue` | Web workspace UI | Feed/presentation | Consume latest or typed browse presentation/revision; actual stable row/visual keys; `data-event-monitor-visual-key`; load/retry/beginning/expired/newer controls; visual-ID prepend anchor; jump | Existing scroll owner | Latest selector + browse controller props/events |
| `.../AgentEventMonitor.vue`, standalone/team parents | Web workspace UI | Explicit prop/controller boundary | Build explicit browse subject, own composable, pass presentation state/actions and run revision | Avoid hidden store/network lookup in feed | Numeric revision + page controller |
| `.../AgentWorkspaceView.vue` | Web workspace UI | Composition | Remove copy action/import/derived text | Cleanup stays local | N/A |
| `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts` and managed catalog outputs as required | Localization | Catalog | Add jump label; remove obsolete copy key | Existing localization ownership | N/A |
| Existing colocated unit/component specs | Respective subsystem | Verification | Lock source/window/live/scroll/copy invariants | Tests remain near owners | Shared fixtures/helpers as existing |

## Ownership Boundaries

- GraphQL identity boundaries remain authoritative public entrypoints. They delegate source/window policy to the provider.
- The provider may ask the memory service for active traces, but may not bypass it with direct filesystem code.
- The server recent selector accepts canonical replay events, not raw trace records; storage remains ignorant of display count.
- The replay transformer assigns required event/turn identity while raw/tool/legacy evidence is still available. The active-trace page policy accepts those identity-bearing replay events plus provider-supplied rewrite identity; the sibling page projector emits only typed central visuals. Resolvers cannot decode cursors, select files, choose page size, or build generic payloads; the memory reader remains archive-unaware for this call.
- The window, witness, tool-card presentation, and usage-presentation owners are pure except for explicit in-place conversation enforcement and perform no network/store access. The separate mutation-commit adapter is the only Event Monitor file allowed to read center compactions from the Activity store or bump run state.
- Dispatchers bracket handler mutation with the Event Monitor begin/commit boundary. Low-level lifecycle handlers remain unaware of global retention/unseen policy; their transient effect is not revision authority.
- Feed presentation receives conversation/Activity data and performs no state hydration or archive access.
- The browse controller is the only web owner of earlier-page request/ID-validation/merge/turnover state. It calls the explicit page client and page-only typed converter, but cannot import normal projection hydration/dedupe, mutate canonical live conversation/Activity, or decide scroll offsets. Feed receives the already bounded stable-keyed browse result and owns visual-ID anchor restoration.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Local-memory projection provider | Active memory view, replay build, recent select, bundle build | Standalone/team projection services | Resolver reads memory files or opts into archives | Extend provider policy |
| Active-trace page provider/policy/projector | Active memory view, replay identities, generation/cursor validation, fixed page select, stable visual IDs, closed central page DTO | Explicit standalone/team page services | Resolver decodes cursor, passes a limit/file, reads an archive, reuses normal projection/GraphQLJSON, or includes result/log | Extend page policy/projector |
| `enforceRecentConversationWindow` | Lifecycle classification and completed-first in-place trim with hard fallback | Hydration, streaming, submission | Caller uses `messages.slice(-100)` or handler-specific eviction | Extend shared capability |
| `beginRecentEventMonitorMutation` / `commitRecentEventMonitorMutation` | Capture pre witness; enforce/capture/compare final witness; bump at most once | Standalone/team dispatch and submission | Caller uses effect OR eviction, timestamp, or post-only inference | Extend shared capability |
| `buildRecentEventMonitorPresentationWitness` | Per-kind semantic tokenization, derived retained-total usage, and ordered equality | Mutation commit | Caller serializes conversation/tool payloads or compares Activity-only state | Extend pure witness owner/table |
| `buildRecentEventMonitorPresentation` | Flatten/sort/select/regroup messages+compactions | Agent conversation feed | Template separately slices messages/activities | Extend presentation result |
| Activity store actions | Validation/dedupe/cap/derived flags | Activity hydration and streaming projections | Direct mutation of internal map arrays | Add store action/helper |
| `useEventMonitorActiveTraceBrowse` | Subject request state, response validation, stable-ID merge, turnover/reset | Agent/team Event Monitor composition | Feed calls Apollo or older pages enter AgentRunState/Activity | Extend controller inputs/actions |
| `buildEventMonitorActiveTraceBrowsePresentation` | Closed page visual mapping, stable assistant grouping, shallow tool card mapping, row/visual keys | Browse controller/composition | Normal run hydration converter, semantic content dedupe, synthetic result-bearing tool segment, or ordinal browse key | Extend page presentation union |

## Dependency Rules

1. GraphQL resolver/service -> projection provider -> memory service/store; no reverse or direct filesystem shortcut.
2. Provider -> replay transformer/identity builder -> recent selector/bundle builder for latest, or active-generation/cursor/page selector -> closed central page projector for browse. Never apply a raw trace line/byte limit before lifecycle reconstruction, infer event ID after conversion, or send selected replay events through the normal result-bearing bundle for browse.
3. Web hydration/stream/submission may import the Event Monitor commit boundary. Pure window/witness files may import domain types and the narrow tool/usage/attachment/compaction presentation helpers named in the witness table; the stateful commit adapter may import the Activity store solely to resolve center compactions for witness capture.
4. Feed may import presentation selection; window service must not import/render Vue components.
5. Activity store may import the shared web limit/completion classifier for Activity-compatible kinds, but the window capability must not mutate the Activity store.
6. No archive read is allowed as an error fallback, tool-lifecycle repair, empty-state fallback, or compatibility path.
7. No component or dispatcher may infer unseen activity from `conversation.updatedAt`, protocol type, transient handler effect, enforcement removal alone, raw object-reference replacement, Activity-only tool result/log state, full-history serialization, or a deep watcher.
8. No component may reintroduce full-conversation joining during render.
9. Page queries accept only their explicit subject identity and optional opaque cursor. No layer may add a client limit, raw-trace file name, archive flag, offset, or timestamp-only cursor.
10. Page responses feed only the active-trace browse controller/page-only presentation. They must not call `hydrateActivitiesFromProjection`, `buildConversationFromProjection`, `dedupeProjectionEntries`, or `stableJson`; replace `AgentRunState.conversation`; bump the live presentation revision; or enter the normal Apollo projection cache as canonical run state.
11. Page GraphQL schema may contain only the closed typed visual union. `GraphQLJSON`, raw/arbitrary arguments, tool result/log, Activity context/detail, and generic payload reference fields are forbidden. Tool `summaryArgs` is the declared shallow optional-string allowlist and status is an explicit central `statusKey`.
12. Browse controller -> pure page converter -> stable keyed feed props. Feed -> load/retry/jump events back to controller. Feed keys browse rows/subvisuals by server-carried IDs and anchors through `data-event-monitor-visual-key`; array indices/content/timestamps are forbidden browse keys. Neither direction bypasses the controller into Apollo or the controller into DOM scroll mutation.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `getRunProjection(runId)` | Standalone run | Return normal recent projection plus `hasEarlierActiveTraceEvents` | Nonempty run ID | Conversation/Activity shape unchanged |
| `getTeamMemberRunProjection(teamRunId, memberRouteKey)` | Explicit team member | Return member recent projection plus `hasEarlierActiveTraceEvents` | Team run ID + member route key | Conversation/Activity shape unchanged |
| `getRunEventMonitorActiveTracePage(runId, beforeCursor?)` | Standalone run active trace | Enter browse or return preceding fixed page | Nonempty run ID + optional opaque cursor | No client limit/file/archive argument |
| `getTeamMemberEventMonitorActiveTracePage(teamRunId, memberRouteKey, beforeCursor?)` | Explicit team member active trace | Enter member browse or return preceding fixed page | Team run ID + member route key + optional opaque cursor | Reuses existing member location authority |
| `selectRecentReplayEvents(events)` | Canonical replay list | Newest 100, preserve order | `HistoricalReplayEvent[]` | Pure; no I/O |
| `selectActiveTraceEventPage(events, subjectFingerprint, sourceRevision, cursor?)` | Canonical active replay list | Initial newest100+preceding50 or preceding50; validate subject/generation/anchor; encode next cursor/hasEarlier | Events + resolved subject digest + provider revision + optional opaque cursor | Pure selection after lifecycle build; foreign input error; typed expired result |
| `buildEventMonitorActiveTracePageEvents(events)` | Selected identity-bearing active replay list | Project only typed central visuals and deterministic visual IDs | `HistoricalReplayEvent[]` with required eventId/turnGroupId | O(E+V); no result/log/Activity/generic JSON traversal |
| `enforceRecentConversationWindow(conversation, limit?)` | One run conversation | Classify and mutate with completed-first eviction/hard fallback; return eviction metadata | Explicit `Conversation` | Default limit 100; test override only if useful |
| `buildRecentEventMonitorPresentation(conversation, compactions, limit?)` | Central feed presentation | Completed-first combined selection/regrouped rows | Conversation + typed compaction array | Pure; no store lookup |
| `beginRecentEventMonitorMutation(context)` | One live/local mutation baseline | Capture current final bounded witness including center compactions | Explicit `AgentContext` | Must run immediately before mutation |
| `commitRecentEventMonitorMutation(context, baseline)` | One live/local mutation result | Enforce, capture final witness, compare, and bump once iff unequal | Explicit `AgentContext` + `RecentEventMonitorPresentationWitness` | Removes old effect parameter/OR condition |
| `buildRecentEventMonitorPresentationWitness(items)` | Bounded presentation | Produce ordered per-kind semantic tokens plus derived total-usage text | `RecentEventMonitorPresentationItem[]` | Max 100 visual tokens; exact table below; no recursive serialization |
| `useEventMonitorActiveTraceBrowse(subject)` | Selected Event Monitor subject | Load/coalesce/merge/turn over/reset active pages | Explicit discriminated run/team-member subject | Calls explicit query adapter; state max300 |
| `buildEventMonitorActiveTraceBrowsePresentation(events)` | Resident typed page events | Validate/map to stable-keyed user/assistant/compaction rows | Closed generated page union | O(E+V); no semantic dedupe/normal conversation mutation |

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
| Active-trace page selector/projector | `Yes` | `Yes` — required eventId/turnGroupId and closed visual union | `Low` | Separate selection/cursor from central typed projection; no GraphQLJSON/result payload |
| Browse controller/presentation converter | `Yes` | `Yes` — eventId/visualId preserved into actual keys | `Low` | Map/Set ID-only merge and O(E+V) mapping; no semantic dedupe |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Server policy | `recent-run-projection-policy` | `Yes` | Low | Use “replay event,” not raw trace, in selector name |
| Frontend capability | `recentEventMonitorWindow` | `Yes` | Low | Use “visual event,” not message, in public names/docs |
| Feed result | `RecentEventMonitorPresentation` | `Yes` | Medium | Document render groups vs visual count |
| UI state | `hasUnseenActivity` | `Yes` | Low | Clear only at latest/selection change |
| Run signal | `eventMonitorPresentationRevision` | `Yes` | Low | Reset on hydration/context replacement; increment once per visible commit |
| Page source identity | `eventId` / `turnGroupId` | `Yes` | Low | Assign during replay construction, not after projection |
| Page rendered identity | `visualId` | `Yes` | Low | Use for page DOM key, `data-*` anchor, and disclosure identity |
| Page render model | `EventMonitorActiveTracePageVisual` | `Yes` | Low | Keep closed central-only union; never call it a conversation entry |

## Applied Patterns (If Any)

- **Policy object/module via pure functions:** Named limits and selectors prevent semantic slicing drift.
- **Bounded mutation witness:** Authoritative dispatch/submission boundaries capture before, enforce after, and bump only on ordered shallow-token inequality.
- **Classify-select-regroup presentation:** Counts actual visible units, protects mutable lifecycles, and preserves grouped assistant rendering/avatar treatment.
- **Defense in depth:** Server bounds transport, conversation state bounds memory, Activity store bounds secondary state, and feed bounds combined mounted presentation.
- **Identity map, not semantic dedupe:** Page events/visuals use source-owned IDs through selection, turnover, and actual DOM keys; equal content never defines equality.
- **Closed projection:** Earlier-page wire data is a typed central visual union; large result/log/Activity payloads are unrepresentable rather than filtered late.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/projection/` | Folder | Run-history projection | Recent policy and existing transformations | Policy is projection-specific | UI state or filesystem implementation |
| `.../recent-run-projection-policy.ts` | File | Internal server policy | Limit + newest event selection | Adjacent to provider/types | GraphQL resolver logic |
| `.../historical-replay-event-types.ts` + `transformers/raw-trace-to-historical-replay-events.ts` | Files | Canonical replay/identity owner | Required raw/tool/legacy eventId and turnGroupId | Identity evidence exists here before selection | Page cursor logic or GraphQL decorators |
| `.../active-trace-event-page-policy.ts` | File | Internal server page policy | Rewrite generation, cursor codec, fixed identity selection | Same canonical replay owner as latest policy | Content-based identity, page visual projection, paths, archive reads, GraphQL decorators |
| `.../event-monitor-active-trace-page-projection.ts` | File | Internal server central projector | Deterministic visualId and closed visual DTO construction | Keeps page display bytes separate from normal bundle | Result/log/Activity/generic JSON/recursive serialization |
| `.../providers/local-memory-run-view-projection-provider.ts` | File | Normal replay provider | Active-only read and policy orchestration | Existing provider boundary | Archive fallback |
| `autobyteus-web/services/eventMonitor/` | Folder | Event Monitor capability | Cross-hydration/live/presentation recent-window semantics | Feature-oriented shared service | Vue component rendering or network access |
| `.../eventMonitorActiveTraceBrowse.ts` | File | Ephemeral Event Monitor browser | Page state machine, stable merge, <=300 turnover/reset | Sibling capability with no canonical state mutation | Apollo implementation or DOM access |
| `.../eventMonitorActiveTraceBrowsePresentation.ts` | File | Pure page presentation | O(E+V) typed mapping, stable row/subvisual keys, shallow tool card presentation | Page-only boundary required by AR-006/AR-007 | Normal projection converter, semantic dedupe, result-bearing segment |
| `.../eventMonitorActiveTracePageService.ts` | File | Page transport adapter | Explicit run/team query calls and error mapping | Keeps network concern out of controller/feed | Page merge/scroll behavior |
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
| `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` | File | Feed | Latest/browse presentation, boundary controls, prepend anchor, jump UX | Owns scroll container | History fetch, page merge, or store mutation |
| `.../EventMonitorBrowseAssistantRow.vue` | File | Browse central renderer | Render stable-keyed page subvisuals via existing leaf components/ToolCallIndicator | Prevents synthetic result-bearing Conversation/AIResponseSegment | Network/store access or ordinal keys |
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
| First earlier load | Active has 275 events; no-cursor page returns events 126–275, marks 50 as earlier, and freezes that server-consistent window | Prepend a page computed before a different live recent snapshot | Prevents boundary gaps/duplicates while live continues separately |
| Continuation cursor | Cursor anchored before event 126 returns events 76–125; normal append leaves generation/anchor valid | Offset `150` or timestamp-only cursor | Append can change total length; explicit identity remains stable |
| Compaction during browse | Active rewrite changes generation; page returns `EXPIRED`; UI preserves view and offers Return to latest | Read archive to continue or silently reset | Keeps source boundary and prevents duplicate/missing content |
| Browse resident turnover | 300 visuals resident; another older page prepends, farthest newer page blocks release until <=300; top key stays fixed | Retain/mount the entire active trace | Whole source remains reachable without recreating long-run UI growth |
| Duplicate-content identity (`AR-006`) | Raw IDs `r17` and `r18` both contain `"Done"` at timestamp T; replay emits `raw:r17`/`raw:r18`; visuals use distinct `...:text:0` IDs; both render and the original visual key remains the scroll/disclosure anchor after prepend | Semantic `(kind,content,timestamp)` dedupe or `:key="segmentIndex"` | Proves exact traversal and prevents Vue from transferring component-local state between equal events |
| Multi-visual identity (`AR-006`) | Tool event E emits `E:tool:0`, `E:text:0`, `E:media-image:0`; assistant row groups by stable turnGroupId but each child uses its own carried visualId | One event-level key for all children or new index keys after prepend | Makes cardinality, anchor, disclosure, and turnover identities explicit |
| Central-only tool page (`AR-007`) | `{kind:'tool', invocationId:'I', toolName:'run_bash', statusKey:'success', summaryArgs:{command:'pwd'}, errorMessage:null}` -> shallow ToolCardPresentation | `{kind:'tool_call', toolResult:<10MB>, logs:[...], arguments:<generic JSON>}` -> normal converter | Preserves exactly rendered summary/status while making hidden result/log cost structurally impossible |
| Result-heavy exclusion (`AR-007`) | Same IDs/tool/card fields with result null vs 10MB sentinel produce byte-identical serialized central `events` (cursor/generation excluded) and equal browser visuals | Fetch result then discard it in converter | Validates transport and conversion performance, not merely final DOM content |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Query flag to choose full vs recent projection | Preserve old complete feed | `Rejected` | Normal projection is always active-only recent |
| Archive fallback when active is empty/incomplete | Improve apparent fidelity | `Rejected` | Empty/source-limited active view is accepted |
| Archive load-older/full-history UI | Preserve access to old content | `Rejected` | Approved replacement loads only current-active-trace pages and stops at its beginning |
| Hidden/deactivated copy control | Preserve possible future use | `Rejected` | Remove action, derivation, and dead key |
| Keep unbounded state but slice template | Minimize code changes | `Rejected` | Enforce provider, state, Activity, and presentation bounds |
| Patch `MP-CR-001` by checking only whether the added identity survived | Small local fix | `Rejected` | Net ordered witness covers retained updates, real evictions, compactions, order/membership, and future callers uniformly |
| Generic GraphQL timeline/archive cursor alongside old bundle | Gradual rollout | `Rejected` | Add only explicit active-trace page queries with fixed size and no archive/file selector |
| Raw-line/byte-offset page cursor | Efficient active-file I/O | `Rejected` | Reconstruct lifecycle-correct replay events first; tool pairs may cross raw boundaries |
| Persistent replay-index sidecar now | Avoid repeated active scans | `Rejected pending measured need` | Reuse read-only active reconstruction; revisit only if `AC-015` attributes a page failure to server scan work |
| Merge older pages into canonical `AgentRunState.conversation` | Reuse existing renderer/state | `Rejected` | Separate browse state prevents latest-100 enforcement, live revision, and Activity semantics from evicting/corrupting pages |
| Reuse normal `RunProjectionConversationEntry` / `runProjectionConversation` for browse | Avoid a page-specific DTO/converter | `Rejected` | Closed typed central visual projection plus linear page-only presentation; normal path retains its result-bearing semantic hydration only for latest |
| Assign/page-dedupe IDs after normal semantic conversion | Minimize replay type changes | `Rejected` | Required source/tool/legacy eventId enters during replay construction and deterministic visualId reaches actual DOM keys |
| Frontend fallback that makes an old archive-inclusive remote backend fast | Support mixed-version performance without server upgrade | `Rejected` | The client cannot prevent upstream archive I/O/response construction; upgrade the remote backend and validate one candidate |

## Derived Layering (If Useful)

```text
Server normal/latest transport boundary
  -> run-history projection service/provider (governing recent source)
    -> agent-memory active-file reader
    -> replay transformer
    -> recent event selector
    -> existing bundle builder

Server explicit earlier-page transport boundary
  -> standalone/team-member page service (explicit subject identity)
    -> local-memory projection provider (same active-only reader + identity-bearing replay transformer)
    -> active-trace generation + opaque anchor validation
    -> fixed-50 preceding event selector
    -> closed typed central-visual projector (stable visualId; no result/log/Activity/generic JSON)

Web transport/hydration and live event boundaries
  -> Event Monitor begin witness
  -> existing domain handlers/converters
  -> Event Monitor enforce + post witness + equality + revision
  -> conversation / Activity state
  -> bounded presentation selector
  -> explicit revision + feed scroll/disclosure components

Web explicit browse boundary
  -> event-monitor page service (run/team-member adapters)
  -> component-owned browse controller and Map/Set eventId/visualId validation
  -> linear page-only central presentation conversion
  -> <=300 resident stable-keyed central presentation
  -> feed visualId prepend-anchor restoration / boundary controls
  -> Jump to latest discards browse state and reveals canonical live <=100
```

## Integrated Live Validation Topology

This is a validation/evidence spine, not a new production runtime spine:

`candidate fingerprint -> exclusive consistent snapshot -> isolated integrated backend -> fresh integrated node window -> bootstrap markers -> exact row click -> per-member projection timings -> hydration/usable markers -> payload/state/DOM/hash assertions -> cleanup`.

### Ownership And Safety

- After architecture approval, API/E2E owns execution, environment setup, cleanup, scenario IDs, and evidence. Solution design owns the topology and evidence contract in `integrated-live-validation-plan.md`; code review owns focused failure-origin classification and proportional test-code review before any downstream owner/delivery routing.
- `/home/autobyteus/data` has one writable server owner. Because the current source is an ext4 Docker volume without a demonstrated atomic snapshot facility, a coordinated old-server stop/quiesce is required before ordinary copying. If that dependency is unavailable, realistic validation is `Blocked`; a live recursive copy is forbidden.
- The integrated backend owns a unique disposable snapshot and isolated loopback port. It must not reuse the live directory or the normal `/root/.autobyteus/server-data` profile. The run declares Mode S (old owner remains stopped) or Mode R (old owner restarts only after quiesced copy equality).
- The launch environment explicitly rebinds `AUTOBYTEUS_DATA_DIR`, `AUTOBYTEUS_MEMORY_DIR`, `DATABASE_URL`, `AUTOBYTEUS_LOG_DIR`, server URL/ports, and `AUTOBYTEUS_SKIP_SYNC`. Process command/environment/file-descriptor audit plus a full-lifetime path-only open audit shows no validation-process reference to `/home/autobyteus/data`. Runtime tracing is mandatory in Mode R; if unavailable, Mode R is blocked. A tracer-unavailable Mode S run may measure performance/bounds while the old owner stays stopped, but `OPEN-001` and independent `AC-001` no-open re-proof are explicitly not executed.
- Snapshot raw traces, metadata/manifests, and DB are hash-checked against the quiesced source before any old-server restart. Snapshot target raw traces are re-hashed after validation. Live-source equality is additionally required only in Mode S; in Mode R, old-owner activity is recorded and its legitimate live-source writes are not a validation-failure gate.
- During the exact target request, the path-only audit must observe the active trace and zero archive opens without capturing file contents. If runtime tracing is unavailable, representative execution explicitly records `AC-001` no-open re-proof as not executed and relies on prior durable instrumented evidence; response exclusion alone is not promoted into an archive-open proof.

### Measurement Boundaries

| Boundary | Start / end | Required result |
| --- | --- | --- |
| Node bootstrap | Window creation -> node health/catalog/shell selectable | Report independently; do not include it silently in row projection |
| Row/network | Exact selection click -> all triggered projection responses complete | Per-request TTFB/total/bytes/cardinality; include active-team fan-out critical path |
| Direct backend | Direct GraphQL request -> first byte/complete | Confirms integrated backend/transport without renderer |
| Hydration | Projection response complete -> state commit/stable bounded render | Quantifies frontend conversion/dedupe/render work |
| User usable | Exact row click -> recent content visible + composer focusable | Must satisfy `AC-009` <=2.0 s on the documented reference environment |
| Earlier page | `Load 50 earlier` -> control ready/stable browse render | Per-request TTFB/total/bytes/event+visual IDs, closed-schema/result-log exclusion, linear conversion, actual DOM visual key/anchor delta, zero archive opens, <=2.0 s under `AC-015` |
| Bounds/integrity | Stable render / quiesced copy / before-after snapshot | Projection <=100 canonical events, Activity/DOM <=100, no archive-only event, source-to-snapshot equality, validation live-root non-access, snapshot raw-trace immutability; live-source equality only in Mode S |
| Runtime open audit | Integrated process lifetime and exact target request | Path-only audit shows no live-root opens and, when tracer coverage exists, active-file access with zero target archive opens; otherwise `AC-001` re-proof is explicitly not executed and prior durable evidence is cited |

Capture a cold run and at least two warm runs. Preserve aggregate measurements and exact commands, never raw conversation/tool bodies.

### Decision Gates

1. After architecture pass, `api_e2e_engineer` executes the corrected representative scenarios.
2. Any `Fail`—bootstrap, backend/fan-out, hydration, earlier-page timing/correctness, archive-open, latest/browse bound, packaging, or safety—returns first to `code_reviewer` with scenario IDs and exact execution context. Code reviewer performs focused failure-origin analysis and only then routes Design Impact to solution design, implementation-owned failure to implementation engineering, or test/environment/reporting failure back to API/E2E.
3. A `Pass` returns to `code_reviewer` for proportional test-code review (`N/A` when no durable test changed), then the passed package goes to delivery while the explicit user-verification hold remains in force.
4. A `Blocked` result goes to the user with preserved evidence and the exact missing dependency; safety is never weakened to obtain a result.

## Change / Refactor Sequence

1. Add server recent-projection policy with pure limit/ordering tests.
2. Change local-memory provider to `includeArchive: false`, build all active replay events, apply the policy, then build the bundle. Update provider tests with active+archive fixtures, >100 active events, order, and source-limited tool cases.
3. Add the frontend Event Monitor window capability and tests for completion classification, mixed completed/mutable selection, partial AI trimming, 101-all-mutable fallback, stable-identity re-entry without duplicates, compaction merge ordering, and exact 100 cap.
4. Keep `AgentRunState.eventMonitorPresentationRevision` bump/reset and stream segment completion metadata. Extract the narrow shared tool-card, usage, and compaction-row presentation derivations; make current renderers consume them; add the complete pure per-kind witness/equality from the `AR-003` table plus the stateful begin/commit adapter. Remove the old `EventMonitorPresentationMutation` parameter and obsolete cross-boundary handler-effect propagation.
5. Bracket standalone live dispatch, team generic dispatch, and local user submission with begin/commit. Reset/baseline on historical/context hydration and add the omitted `teamRunOpenCoordinator.mergeHydratedMembers` non-live replacement reset while preserving subscribed live state. Add a matrix proving non-visible messages, `MP-CR-001` net-identical transitions, `MP-AR-003` tool log/result traffic, and equal derived-summary argument replacement do not bump; actual table-defined content/card/compaction/membership/order/eviction changes bump once.
6. Extend Activity store insertion/upsert paths with completion-aware eviction, hard fallback, actual-effect, and derived-state repair tests.
7. Refactor parent prop flow and `AgentConversationFeed` to consume bounded presentation plus explicit revision and add baseline/unseen/jump scroll state. Preserve current disclosure components and bottom threshold. Add component tests for completed-first >100 selection, pinned/non-pinned revision behavior, no-op revision absence, reset, manual/jump clearing, localization, and keyboard semantics.
8. Remove copy control/import/computed text and stale translation entries; update workspace-view/localization tests.
9. Extend `HistoricalReplayEvent` and every builder/provider with required `eventId`/`turnGroupId`. The local raw transformer assigns raw ID, tool-lifecycle ID, or flat legacy fingerprint+occurrence while evidence is available; no result/log recursive serialization is allowed. Add `MP-AR-006` raw/tool/orphan/legacy identity stability and equal-content/equal-timestamp tests before adding page selection.
10. Add the pure active-trace generation/cursor/fixed-page selector plus the closed central page projector. The projector derives deterministic visual IDs and explicit typed user/text/Thinking/tool/media/compaction variants. Tool variants include allowlisted shallow string summary inputs and explicit semantic status only; result/log/Activity/generic JSON fields must be unrepresentable. Test fixed 50, 100+50, continuation, append/rewrite/foreign cursor, multi-visual IDs, archive exclusion, and `MP-AR-007` multi-megabyte result-null byte equivalence/no-recursion.
11. Add explicit standalone and team-member page service/resolver/generated-type boundaries. Keep subject identities distinct, expose no caller-controlled limit/file/archive selector or `GraphQLJSON`, authorize/resolve the same run/member scope as normal projection, and extend normal latest only with `hasEarlierActiveTraceEvents`.
12. Add the page-query adapters, pure `eventMonitorActiveTraceBrowsePresentation` converter, and `useEventMonitorActiveTraceBrowse` controller. Validate/index with Map/Set, never content-dedupe or call normal hydration, freeze the first snapshot, cap resident visuals at 300 by releasing farthest newer blocks, and discard on subject change/Jump. Add exact O(E+V), duplicate-ID protocol-error, equal-content distinctness, and result-heavy no-walk tests.
13. Add the typed browse assistant row and extend `AgentConversationFeed`/parents with stable carried row/visual Vue keys, `data-event-monitor-visual-key`, top/bottom boundary states, visual-ID prepend anchor restoration, and localized accessible controls. Prove retained Thinking/tool disclosure identity across prepend/turnover and forbid ordinal browse keys. Keep GraphQL/merge out of the feed and canonical conversation/Activity untouched.
14. Run implementation-scoped server/web unit tests, typechecks, localization guards, and focused page-performance/result-heavy checks on the >=5 MB / >=600-display-event active fixture. Implementation engineer records commands/results but does not own broader API/E2E.
15. Return the complete source change through implementation-source review. Do not start representative API/E2E until that review passes.
16. API/E2E validates normal latest selection plus explicit first/continuation/beginning/expiry page behavior, real GraphQL archive exclusion, fixed bounds, source-to-DOM IDs, equal-content distinctness, disclosure/anchor stability, result/log schema exclusion, linear conversion, resident turnover, and reference timing. It then uses the corrected `integrated-live-validation-plan.md` topology for representative existing data and mandatory result routing before delivery can resume finalization.

No temporary dual path is permitted. Each stage should keep the worktree compiling; once provider policy changes, old archive-inclusive normal behavior is gone.

## Key Tradeoffs

- **Read complete active file vs tail-read raw records:** Complete active read is accepted because compaction ordinarily bounds it and preserves lifecycle reconstruction. It is simpler and safer than boundary-overlap logic; returned/client work is still capped.
- **Keep existing GraphQL bundle vs canonical timeline redesign:** Keeping the contract minimizes risk and matches the narrowed product need. Bounded conversation/activity duplication is accepted.
- **Trim state plus presentation vs DOM virtualization:** A recent rolling window matches actual user behavior and handles dynamic-height content without a virtualization framework.
- **Exact visual count vs message count:** Segment-aware, lifecycle-aware counting requires a small shared capability but prevents a single large assistant message from defeating the UI bound or prematurely losing an active card.
- **No archive fallback:** Some boundary tool cards may have incomplete arguments/context, but speed and predictable recent-only behavior are the explicit user priority.
- **Explicit active-trace paging vs an archive/history product:** Fixed 50-event pages recover occasionally useful earlier context without reopening archive-scale work. The beginning of the active trace is intentionally final even when archives exist.
- **Reconstruct current active replay events per page vs a persistent replay index:** Correct lifecycle pairing and a simple read-only change are preferred initially. The observed largest active source is large enough to require a performance gate but not enough to justify an index without measured server-scan failure; `AC-015` is the decision boundary.
- **A server-consistent 100+50 first browse snapshot vs appending an independently fetched page to stale client latest state:** The slightly larger first explicit response removes gaps/duplicates when live state advanced between initial selection and the click. It occurs only on user demand and remains active-only.
- **A 300-resident sliding browse window vs unbounded DOM or dynamic-height virtualization:** Page-block turnover bounds memory/DOM while preserving the user's current reading anchor and the ability to continue toward the active-trace beginning. A virtualization subsystem is deferred because current cards have dynamic markdown/media/disclosure height and no existing virtual-list capability.
- **Dedicated typed page presentation vs reusing normal conversation hydration:** A small page-only union/converter/row adds code but makes stable source-to-DOM identity and result/log exclusion structural. Reusing the normal DTO is rejected because it semantically dedupes and recursively traverses data the center card never renders.
- **Server-carried visual IDs vs client content/index keys:** Carrying deterministic IDs adds wire metadata but is necessary for exact page overlap, stable prepend anchors, and Vue disclosure identity. Content hashes after projection and ordinal keys cannot distinguish supported equal events.
- **Remote-node version skew:** Requiring the remote backend upgrade is the only coherent performance contract. A client capability warning could improve diagnosis but cannot provide the optimization and is outside the approved scope.

## Risks

- A single rendered reasoning/text/media payload can still be large; count bounding alone cannot guarantee a small response. Raw result/log payload is excluded structurally from earlier pages.
- More than 100 concurrently mutable events forces deterministic eviction of an old mutable identity after completed candidates are exhausted. A later update may only reconstruct source-limited current data; the design prioritizes the approved hard cap and guarantees at most one retained representation.
- Presentation witness maintenance is a new correctness seam: every central rendered/retained-interaction kind must have an exact semantic token, while Activity-only/detail fields must remain excluded. The bounded O(100) inventory plus shared presentation helpers is acceptable, but future render-model changes must extend helper/table/tests together.
- In-place partial AI segment trim must preserve Vue reactivity and must not leave empty AI messages.
- Center compaction timestamps and message timestamps can tie; presentation must preserve deterministic original order.
- Activity eviction must not leave `hasAwaitingApproval` or `highlightedActivityId` stale.
- Localization managed/generated-file conventions must be followed so catalog guards pass.
- Large teams still perform multiple bounded active reads during restore; re-evaluate only if API/E2E evidence shows the approved change is insufficient.
- Mixed-version remote validation can reproduce the original archive bottleneck even with the new UI. Delivery evidence must fingerprint both client and server rather than assuming a node URL uses the packaged backend.
- Snapshot validation requires coordinated exclusive access or an atomic storage snapshot. This is an execution dependency, not permission to let two servers share the live data root.
- Reconstructing the complete active trace for each explicit earlier page is O(active-source size). `AC-015` requires <=2.0-second page completion on the documented >=5 MB / >=600-display-event fixture; a measured server-scan failure reopens the index decision rather than permitting archive access or an arbitrary page-size knob.
- Active compaction can rewrite the source while a user browses. Generation plus anchor validation must return typed `EXPIRED`; silent restart, offset reuse, or archive continuation would create gaps/duplicates or cross the approved boundary.
- Legacy records may lack durable IDs. The deterministic flat-field/content/media-digest plus occurrence identity must be stable across repeated reconstruction without walking nested result/log payloads, and duplicate page-boundary tests must cover this path.
- The page projector duplicates a narrow subset of central tool field selection on the server. Its `summaryArgs` field names are the same explicit allowlist consumed by web `getToolDisplaySummary`, and cross-layer contract vectors plus result-heavy tests must change together if central tool summary rules change.
- One canonical replay event can expand to multiple central visual descriptors. Resident turnover must apply the final central-presentation count, release whole farthest-newer page blocks, and keep the current top reading key stable; simply counting response entries can violate the 300-visual cap.
- A single paged event can itself contain a very large markdown/media payload. Fixed event counts bound cardinality, not bytes; payload/long-task metrics remain required.

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
- Do not diagnose performance from frontend version alone. Record the backend entrypoint/provider policy and effective data root for every realistic run; an old remote backend invalidates active-only/newest-100 acceptance evidence.
- Do not add production code in response to the mixed-version observation unless corrected isolated-snapshot evidence crosses a decision gate. In particular, do not add client-side archive filtering, a hidden legacy mode, or speculative focus-lazy hydration without measured integrated failure.
- Keep normal latest projection intrinsically active-only/latest-100. Earlier browsing is available only through the explicit standalone/team-member page queries; the fixed page size is 50 and no input may expose `limit`, a raw path, a file name, an archive flag, or an archive cursor.
- For the first no-cursor page request, compute the latest 100 and up to 50 immediately preceding events from one reconstructed active-source generation and return `loadedEarlierCount` plus the continuation cursor. Do not concatenate a page onto whatever latest snapshot happens to remain in the client.
- Treat the cursor as opaque at the client. Decode/validate version, subject-bound service context, active generation, and anchor presence on the server. Append-only growth keeps a valid cursor usable; active rewrite/compaction or missing anchor returns typed `EXPIRED`, never an archive fallback.
- Build page boundaries over canonical replay events only after lifecycle reconstruction. Raw JSONL line offsets, timestamps alone, or a blind byte tail are forbidden because a tool call/result or streamed segment can span the chosen raw boundary.
- Populate replay `eventId` before page selection: raw ID when present, one turn/tool-call lifecycle ID for combined tool events, and the specified flat legacy fingerprint+occurrence otherwise. Populate `turnGroupId` from the same canonical turn identity. Do not derive either from a post-projection array index or rendered content.
- Derive and carry every `visualId` from the page event ID, visual kind, and kind ordinal. The client validates uniqueness but does not replace it. Use it in the page presentation union, actual Vue `:key`, and `data-event-monitor-visual-key`; never use browse array/message/segment indices as keys.
- Keep page entries central-feed-only through a closed TypeGraphQL union and generated web types. Never use `GraphQLJSON`, `RunProjectionConversationEntry`, `RunProjectionActivityEntry`, raw result/log, generic arguments, or Activity context/detail. `summaryArgs` copies only declared top-level string allowlist keys; `statusKey` is explicit and must not be inferred from result presence.
- `buildEventMonitorActiveTracePageEvents` and the web page converter must be O(events + visuals), read only named fields, and have throwing-getter/no-recursion tests. The web path must not import/call the normal `stableJson`, semantic dedupe, merge-richness, conversation hydration, or Activity hydration code.
- Page tools map straight to shallow `ToolCardPresentation` for `ToolCallIndicator`; do not create a normal tool segment with `result:null` merely to satisfy a broad type. User/text/Thinking/media/compaction visuals reuse existing leaf components through the typed browse row.
- Never hydrate older tool activities into the Activity panel and never merge page data into `AgentRunState.conversation`; both remain canonical live/latest state with their existing <=100 enforcement and visible-revision semantics.
- The browse controller owns network state, cursors, Map/Set event/visual ID validation, first-snapshot freeze, 300-visual page-block turnover, and reset. `AgentConversationFeed` owns scroll measurement/restoration and boundary rendering only. Preserve the first visible `visualId`/offset across prepend after `nextTick`, with scroll-height delta only as a fallback.
- Coalesce activation while an earlier request is in flight. On network failure keep all resident content and expose Retry; on `hasEarlier=false` replace the action with the active-trace beginning marker; on `EXPIRED` keep current content and expose Return to latest.
- Add server tests for standalone/team identity/authorization; raw/tool/orphan/legacy event-ID stability; equal-content/equal-timestamp distinctness; deterministic multi-visual IDs; exact 100+50 and subsequent 50 pages; 275-event traversal; append/rewrite/foreign cursor; archive-open spies; no GraphQLJSON/result/log/Activity fields; explicit tool status/summary/error; and byte-identical multi-megabyte-result vs result-null page projection. Add web tests for generated-type validation, O(E+V) conversion/no recursive getter access, duplicate structural ID error, distinct equal content, subject reset, visual-ID prepend anchor, retained disclosure DOM identity, live separation, Jump reset, localized/a11y states, >500-event turnover <=300, and no gaps/duplicates among resident blocks.
