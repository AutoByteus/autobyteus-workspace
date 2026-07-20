# Event Monitor Rolling Recent-Activity UI/UX Specification

## Status (`Draft`/`Requirements-ready`/`Refined`)

`Refined` — latest-window behavior approved on 2026-07-18; active-trace-only `Load 50 earlier` refinement approved on 2026-07-20.

## UX Goal

Make the central Event Monitor feel immediate and readable for long-running agents by opening with a rolling window of at most 100 recent visual events. Preserve still-active cards when completed events can roll away, preserve the current collapsed Thinking/tool-card interaction and bottom-follow behavior, avoid disrupting a user who scrolls, and remove the unused conversation copy control. When earlier context is useful, let the user explicitly add 50 earlier events at a time from the current active trace only, with a clear beginning boundary and without ever turning normal monitoring into archive browsing.

## Related Requirements And Acceptance Criteria

- Requirements: `REQ-001`–`REQ-012` in `requirements-doc.md`
- Acceptance criteria: `AC-001`–`AC-015`
- Reference image: `/home/autobyteus/data/memory/agent_teams/software_engineering_team_cfa22c21dace401ba00d365fb95b57dd/solution_designer_62969670fca54e7fbe04a1f7e934be3c/context_files/ctx_1d90b429e36e__image.png`

## Users / Personas / Contexts

- A user monitoring an agent that may run for hours or days.
- A user selecting among team-member rows and primarily reading the latest work.
- A user briefly scrolling upward inside recent activity while new work continues.
- A user who occasionally needs useful earlier context that is still present in the current active trace.
- Desktop/Electron and supported web/mobile surfaces using the same Event Monitor component.

## User-Journey Inventory

| Journey ID | User / Context | Starting State | User Goal | Completion State | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- | --- |
| `UXJ-001` | User selects a long-running agent/member | Another run or empty workspace is visible | See latest activity without archive-scale delay | Selected workspace shows at most the latest 100 active-file visual events | `REQ-001`–`REQ-003`; `AC-001`–`AC-003`, `AC-009` |
| `UXJ-002` | User watches a live run at bottom | Event Monitor is pinned to latest | Follow new work continuously | New/updated cards remain visible and oldest items roll away | `REQ-003`, `REQ-004`; `AC-004`, `AC-005` |
| `UXJ-003` | User reads slightly older recent activity | Event Monitor is not at bottom | Keep reading without viewport jumps | New activity indicator appears; viewport stays put | `REQ-005`; `AC-005`, `AC-011` |
| `UXJ-004` | User returns to live activity | New activity indicator is visible | Jump to latest | Latest item is visible, bottom-follow resumes, indicator clears | `REQ-005`; `AC-005`, `AC-011` |
| `UXJ-005` | User inspects Thinking/tool card | Recent feed contains collapsed cards | Expand only a chosen card | Existing disclosure behavior works unchanged | `REQ-006`; `AC-006` |
| `UXJ-006` | User views workspace header | Agent workspace is open | Use normal controls without unused copy action | Copy control is absent; layout remains coherent | `REQ-008`; `AC-007` |
| `UXJ-007` | User reaches the top of recent activity | Latest mode has older active-trace events | Retrieve nearby earlier context without loading an archive | Up to 50 earlier events appear above with the viewport anchored | `REQ-010`–`REQ-012`; `AC-012`–`AC-015` |
| `UXJ-008` | User browses toward the active-trace boundary | One or more earlier pages are visible | Continue until the current active trace begins | Explicit beginning state appears; no archive request is made | `REQ-010`–`REQ-012`; `AC-012`–`AC-014` |

## Journey Details

### `UXJ-001` — Open Recent Activity

1. The user clicks an agent or team-member row.
2. The selected workspace shell follows the existing selection behavior.
3. The Event Monitor renders only recent events derived from the active raw-trace file; no archived segment is loaded and no archive-loading state appears.
4. If more than 100 visual events are available, only the newest 100 are presented in chronological order.
5. The feed initially positions at the bottom so the newest event is visible.

If the server reports or the full 100-event window indicates that earlier active-trace content may exist, the top boundary offers `Load 50 earlier`. No earlier page is requested during initial selection.

### `UXJ-002` — Follow Live Activity

1. While the user remains at/near the bottom, a new logical event appends or an existing card is updated.
2. Token deltas and lifecycle updates modify the existing visible segment/card rather than creating duplicate visual events.
3. The feed remains pinned to the bottom.
4. When the window would exceed 100 visual events, the oldest completed visual event rolls out first. A still-streaming text/Thinking segment, nonterminal tool card, or started compaction remains visible even when it is older than a completed item.
5. If the abnormal but reachable state contains more than 100 mutable events and therefore no completed candidate can satisfy the cap, the oldest mutable item rolls out deterministically. A later update for that identity may reappear once at the newest edge with only the source-limited data available in that update; the window never exceeds 100 and never displays two copies of the identity.

### `UXJ-003` — Read Within The Recent Window

1. The user scrolls more than the existing near-bottom threshold away from latest.
2. A net visible append, retained-card/content update, center-compaction change, or eviction-only presentation change that survives bounded enforcement does not force-scroll the container.
3. A compact floating/sticky button appears near the lower edge of the Event Monitor: **New activity · Jump to latest**.
4. The current viewport remains stable as closely as the browser layout permits while older retained items roll out.
5. Connection, turn-start, accepted no-op command/status, Activity-only tool log/result updates, equal tool-argument replacement whose rendered card summary is unchanged, and other protocol messages that do not change the center presentation or its retained interaction do not display the button. A message token/cost change does display the button only when it changes the rendered per-message or total-usage text.
6. A transient new event that is synchronously removed by the 100-event policy and leaves the final ordered presentation identical also does not display the button; jumping must always correspond to a real final presentation difference.

### `UXJ-004` — Jump To Latest

1. The user activates **New activity · Jump to latest** by pointer or keyboard.
2. The Event Monitor scrolls to its bottom, latest content becomes visible, and bottom-follow resumes.
3. The button clears once latest is reached. Manually scrolling back to the bottom has the same clearing effect.

### `UXJ-005` — Disclosure Interaction

1. Thinking and tool cards render collapsed exactly as they do today.
2. The user explicitly activates a card to expand it.
3. Rolling/hydration must not automatically expand cards. No new detail request or archive lookup is introduced.

### `UXJ-006` — Header Cleanup

1. The separate copy icon/button beside the conversation header is not rendered.
2. No replacement copy/export control, tooltip, empty gap, or disabled placeholder is shown.
3. Remaining header controls retain their existing order and interaction.

### `UXJ-007` — Load 50 Earlier From The Active Trace

1. The user reaches the top of the currently displayed window and activates **Load 50 earlier**.
2. The control becomes **Loading earlier…** and ignores/coalesces additional activation until the request completes.
3. On the first load, the Event Monitor enters active-trace browse mode using one server-consistent view of the current latest 100 plus up to 50 immediately preceding events. Later loads add only the next preceding page of at most 50.
4. The first previously visible event remains at the same viewport position within normal dynamic-media reflow tolerance while earlier content is inserted above.
5. Browse content is derived only from `raw_traces_active.jsonl`; the action has no archive fallback and no archive-related loading state.
6. Live state continues updating separately. It never overwrites the browse snapshot or pulls the viewport down; a real live change exposes **New activity · Jump to latest**.
7. Thinking and tool cards in loaded pages remain collapsed by default.
8. Distinct events remain separately visible even when their text and timestamp are identical. Prepending must not cause a collapsed or expanded card to inherit another event's disclosure state.

### `UXJ-008` — Continue To The Active-Trace Beginning

1. The user may repeatedly activate **Load 50 earlier**.
2. Each successful request adds at most 50 immediately preceding canonical events in chronological order, with no duplicate identity at a page boundary.
3. The resident browse window never exceeds 300 visual events. When another page would overflow it, the farthest newer 50-event browse page is released while the same first-visible visual identity and reading offset stay fixed.
4. If newer browse pages were released, the lower boundary explains that newer content is not resident and offers **Jump to latest**; the user can still continue paging earlier.
5. When no earlier active-trace event remains, the top action is replaced by **Beginning of current activity** with supporting text **Earlier activity has been compacted**. This is an end state, not an invitation to open an archive.
6. If compaction rewrites the active trace while browsing and invalidates the cursor, preserve already visible content and show **Activity was compacted · Return to latest** with an explicit action. Do not silently reset, duplicate, or query an archive.

## Screen / Surface / Component Inventory

| Surface / Component | Purpose | Entry Conditions | Important States | Exit / Next Action |
| --- | --- | --- | --- | --- |
| Central Event Monitor / conversation feed | Display recent messages, assistant segments/cards, center compaction rows, and optional active-trace browse pages | A run/member is selected | Empty, latest-pinned, loading-earlier, browsing, beginning, cursor-expired, scrolled-with-new-activity, rolling eviction | Read, load earlier, expand a card, jump latest, compose, or select another row |
| `Load 50 earlier` boundary control | Add one earlier active-trace page on explicit demand | Older active-trace content may exist | Ready / loading / retry / replaced by beginning | Load and anchor one page |
| Active-trace beginning marker | Explain the hard earlier boundary | Server returns `hasEarlier=false` | Informational | Continue reading or jump latest |
| `New activity · Jump to latest` control | Return a non-pinned user to current activity | New visible activity arrives while not near bottom | Hidden / visible / keyboard-focused | Jump to bottom and resume following |
| Thinking card | Display reasoning disclosure | A Thinking segment is in the recent window | Collapsed by default / explicitly expanded | Toggle using existing behavior |
| Tool card | Display tool lifecycle disclosure | A tool event is in the recent window | Existing collapsed/status/expanded states | Toggle using existing behavior |
| Activity panel | Preserve current secondary activity presentation with bounded data | Activity panel is opened | Existing states only; latest 100 Activity records retained | Existing interactions |
| Agent workspace header | Run identity/status and existing actions | Agent workspace is selected | Copy control absent | Use remaining controls |

## Interaction And State-Transition Specification

| Scenario / State | User Action Or Trigger | Immediate Feedback | Resulting UI State | Data / Side Effect | Next Available Actions |
| --- | --- | --- | --- | --- | --- |
| Initial recent window | Select run/member | Existing selected shell and feed update | Latest ≤100 visual events, positioned at bottom | Active-only bounded projection hydrates | Read, compose, select another row |
| Live append while pinned | New logical event | New item/card appears | Bottom remains visible | Append; evict oldest if needed | Continue watching |
| Live update while pinned | Delta/status/result for existing event | Existing segment/card updates | Visual-event count unchanged | Update by existing identity | Expand/collapse |
| User leaves bottom | Scroll upward | No special message yet | Bottom-follow disabled | Record non-pinned state | Continue reading |
| New activity while non-pinned | Post-enforcement bounded presentation differs from the pre-mutation presentation | Jump control appears | Viewport remains non-pinned | Visible-presentation revision increments once; recent window still rolls | Jump or continue reading |
| Non-visible protocol message | Connection/turn/status/accounting message produces no center-feed change | No feedback in Event Monitor | Jump control remains unchanged/hidden | Visible-presentation revision does not change | Continue reading |
| Activity-only tool detail | Tool log/result changes but the central card name, summary, status, error, and actions remain the same | No feedback in Event Monitor | Card and jump state remain unchanged | Equal pre/post semantic witness; Activity may update independently | Continue reading or open Activity |
| Equal tool argument replacement | Handler replaces the arguments object but the shared derived command/path/text summary is unchanged | No feedback in Event Monitor | Card and jump state remain unchanged | Raw reference identity is ignored; semantic witness remains equal | Continue reading |
| Transient append is evicted | Full 100-mutable window receives one atomic-complete event; enforcement removes that new event | No feedback in Event Monitor | Presentation and jump state remain unchanged | Equal pre/post witness; revision does not change | Continue reading |
| Jump control activated | Click/Enter/Space | Scroll moves to bottom | Latest-pinned; control hidden | Clear unseen flag | Continue following |
| Manual return to bottom | Scroll to near-bottom threshold | Jump control disappears | Latest-pinned | Clear unseen flag | Continue following |
| Window overflow with completed candidates | Historical hydration or live append exceeds 100 | No modal/toast | Oldest completed visual events are absent; mutable items remain | Completed-first trim | Read recent window |
| Window overflow with all candidates mutable | More than 100 concurrently mutable events | No modal/toast; optional development diagnostic only | Oldest mutable item is absent; cap remains 100 | Deterministic hard-cap fallback; later identity update may source-limited re-enter once | Continue monitoring |
| Card disclosure | Activate Thinking/tool card | Existing disclosure animation/state | Only chosen card expands | No archive access | Collapse again |
| Earlier page available | Activate `Load 50 earlier` | In-place loading label/spinner; duplicate activation coalesced | Up to 50 earlier events inserted; browse mode active | Active-trace-only page request | Read, load again, jump latest |
| Equal-content earlier events | Load a page containing distinct events with equal timestamp/text | Both rows/cards remain visible | Each keeps its own disclosure and scroll-anchor identity | No semantic content collapse or ordinal-key reuse | Read or load again |
| Earlier page request fails | Network/server error | Inline error and Retry | Existing pages remain | No automatic archive/read fallback | Retry or jump latest |
| Active trace begins | Earlier response has no predecessor | Beginning marker replaces load action | Top is terminal for this browse source | No archive request | Read or jump latest |
| Browse cursor expires | Compaction/rewrite changes active generation | Inline compacted/recovery state | Existing page remains; earlier loading paused | Cursor discarded; no archive fallback | Return to latest |
| Resident browse bound reached | Another page would exceed 300 | No modal/toast | Farthest newer 50-event browse page released; anchor stable | Page state/DOM remains <=300 | Continue earlier or jump latest |

## Markdown Wireframes / Visual Structure

```text
┌──────────────── Agent Workspace Header ────────────────┐
│ avatar  agent_name  status                 settings +  │
│              (no conversation copy control)            │
├────────────────── Event Monitor ───────────────────────┤
│              [Load 50 earlier]                          │  ← active trace only
│ [oldest retained of at most 100 visual events]          │
│ You: ...                                                │
│ [Thinking >]                 collapsed as today         │
│ [✓ run_bash ... >]           collapsed as today         │
│ ...                                                     │
│ [newest event]                                          │
│                   [New activity · Jump to latest]       │  ← only while non-pinned with unseen activity
├──────────────────── Composer ───────────────────────────┤
│ Context Files ...                                       │
│ Type a message...                                  Send │
└─────────────────────────────────────────────────────────┘
```

In active-trace browse mode the visible window may contain up to 300 events. At the hard top boundary, **Beginning of current activity · Earlier activity has been compacted** replaces the load control. No archive selector, export, or replacement copy control is added.

## Non-Happy-Path States

### Loading

- Preserve the existing run-selection/loading treatment; do not add an earlier-page request during initial selection.
- A large archive must have no effect on Event Monitor loading because it is not read.
- The composer and remaining workspace controls must not wait on archived projection work.
- Earlier-page loading is local to the top boundary and must not cover/disable the composer or discard already displayed content.

### Empty

- If the active file is absent or has no displayable events, preserve the existing empty conversation behavior.
- Do not fall back to archived segments to fill an empty Event Monitor.

### Error And Recovery

- Preserve the existing projection error behavior and retry/open behavior.
- An absent, malformed, or unreadable active file must not trigger an implicit archive scan.
- Live events that arrive after an empty/failed historical projection may populate the rolling window through the existing stream path.
- An earlier-page failure keeps current content and offers inline Retry. A cursor-expired result offers Return to latest rather than automatic refetch or archive fallback.

### Disabled / Unavailable

- The jump control is absent rather than disabled when the user is at latest or no unseen activity exists.
- Removed copy functionality has no disabled placeholder.
- `Load 50 earlier` is disabled only for its in-flight request; after `hasEarlier=false` it is replaced by the beginning marker rather than left disabled.

### Permission / Authentication

- Preserve existing workspace/run authorization and reauthentication behavior. Do not mislabel permission failure as empty recent activity.

## Responsive And Platform Behavior

- Desktop/Electron: the jump control stays inside or immediately above the lower edge of the Event Monitor scroll region and must not overlap the composer.
- Narrow/mobile: the control remains touch-sized and may use a full-width compact treatment above the composer.
- The latest-100 bound, 50-event page size, 300-event resident browse bound, active-only source, bottom-follow behavior, and lack of archive navigation are identical on supported platforms.

## Accessibility And Keyboard Behavior

- **New activity · Jump to latest** is a real `<button>` operable by Tab, Enter, and Space, with visible focus.
- It has an accessible name equal to or clearer than its visible label.
- Do not use an assertive live region or announce every streaming token. A polite announcement may occur once when unseen activity first becomes available, provided repeated deltas are suppressed.
- Manual and activated scrolling must not trap or unexpectedly relocate keyboard focus.
- Existing Thinking/tool disclosure keyboard behavior and accessible state remain unchanged.
- Load, Retry, and Return/Jump controls are real buttons operable by Tab, Enter, and Space with visible focus. Loading exposes `aria-busy` at the boundary without announcing conversation content.

## Content, Labels, And Validation Messages

- English: **New activity · Jump to latest**
- Simplified Chinese: **有新动态 · 跳到最新**
- English: **Load 50 earlier**; **Loading earlier…**; **Beginning of current activity**; **Earlier activity has been compacted**; **Activity was compacted · Return to latest**; **Retry**
- Simplified Chinese: **加载更早的 50 条**; **正在加载更早内容…**; **已到当前活动的开头**; **更早的活动已被压缩归档**; **活动已压缩 · 返回最新**; **重试**

Use the existing localization source structure. No archive selector, show-full, copy, or export labels are introduced.

## Data And API Dependencies

- Existing standalone and team-member projection queries, guaranteed by the backend to return an active-file-only latest event window plus earlier-availability metadata.
- Dedicated explicit standalone-run and team-member earlier-page queries. Each uses an opaque active-generation cursor, a server-fixed 50-event earlier page, stable event and subvisual identities, and no archive or client limit argument.
- A dedicated typed page presentation containing only central user/text/Thinking/tool/media/compaction fields. It preserves stable subvisual keys into rendered DOM anchors, performs no content-based dedupe, and excludes raw tool results, logs, Activity detail/context, and generic payload objects. Tool cards retain their visible semantic name/summary/status/error without transporting hidden result detail.
- A shared frontend recent-window constant/policy with maximum 100 visual events.
- A shared completion classifier: atomic user/static events are complete on insertion; streamed text/Thinking completes at segment/message completion; tool/file/terminal cards complete only in terminal status; center compactions complete only at completed/failed.
- Live stream/submission integration that captures a bounded lightweight ordered presentation witness before mutation, applies existing handlers plus completed-first rolling, captures the final witness, and increments an ephemeral per-run visible-presentation revision only when those witnesses differ.
- The witness covers at most 100 visual descriptors and only shallow semantic values that the central feed renders or uses for retained interaction. It reuses the same tool-card summary/presentation derivation as the renderer, compares ordered attachment/media primitives, and includes derived message/total usage and compaction-row presentation. Activity-only tool logs/results, raw argument references, full payloads, and history are excluded. Handler-level transient effects alone do not drive unseen state.
- The revision resets/baselines on historical hydration or any conversation/context replacement, including reused non-live team-member contexts. Subscribed live contexts whose conversation is preserved keep their revision. The feed clears unseen on reset/selection, manual return to bottom, or jump. Generic `conversation.updatedAt` is not a dependency.
- Per-run Activity retention capped at 100.
- Component-local active-trace browse state stores typed page events/central visuals separately from `AgentRunState.conversation` and the Activity store, preserves their stable visual keys, caps the resident presentation at 300, and is discarded on run/member change or Jump to latest.
- Cursor expiry is a typed page result caused by active-file rewrite/compaction. Ordinary live append does not invalidate the active generation.

## Out Of Scope

- Any archive browsing or unrestricted full-history navigation; the current active trace is the absolute earlier boundary.
- A replacement copy/export action.
- Thinking/tool-card visual redesign or default-state change.
- Activity-panel visual redesign.
- Full-run totals/search/filter.
- Activity-panel pagination or hydration from older Event Monitor pages.

## Open Decisions / Risks

- Dynamic-height markdown/media can change layout after rendering. The scroll rule is behavioral rather than a pixel-perfect anchor guarantee during asynchronous media reflow.
- A single visual event can be very large. The count cap prevents unbounded list length but does not truncate individual content in this change.
- Existing token/cost totals within the Event Monitor reflect retained recent data after eviction; no new full-run accounting treatment is introduced.
- In the exceptional all-mutable overflow fallback, content removed before a later lifecycle update may not be reconstructable from that update. The user still sees at most one source-limited current representation, and no archive is read.
- The presentation witness and shared render-presentation helpers must evolve together when a new central render/interaction field or event kind is added; otherwise a real visual change could be missed or non-visible Activity/detail traffic could falsely show the jump action.
- The active file can be large. Fixed page responses and resident turnover protect transport/hydration/DOM, while lifecycle-correct page construction may still scan/reconstruct the active file. The measured page threshold determines whether a derived replay index is justified later.
- Page turnover intentionally releases farthest newer browse content after 300 residents. Jump to latest is the recovery path; this avoids retaining/mounting the entire active trace after many explicit loads.

## Approval Status

Approved by the user on 2026-07-18 for the fast latest-100 rolling Event Monitor, collapsed cards, archive exclusion, jump behavior, and copy removal. Refined and approved on 2026-07-20: the user wants occasional earlier context through `Load 50 earlier`, repeated only to the beginning of the current active trace. Archived trace segments remain inaccessible from this surface. The 300-event resident turnover, inline loading/retry/compaction recovery, and jump-to-latest exit are the bounded implementation-aware UX needed to preserve that approved combination of fast opening and useful earlier context.
