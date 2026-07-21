# Event Monitor Rolling Recent-Activity UI/UX Specification

## Status (`Draft`/`Requirements-ready`/`Refined`)

`Refined for architecture round 12` — latest-window and active-trace-only paging behavior remain approved. The user selected one centered, quiet-white, icon-only return treatment after the conditional lower-right **improve skills** action exposed a coexistence conflict. Ordinary unseen, frozen browse, released-page, and cursor-expired states all use that identical neutral base treatment; expiry has no warning-color variant.

## UX Goal

Make the central Event Monitor feel immediate, spacious, and readable for long-running agents by opening with a rolling window of at most 100 recent visual events. Preserve still-active cards when completed events can roll away, preserve the current collapsed Thinking/tool-card interaction and bottom-follow behavior, avoid disrupting a user who scrolls, and remove the unused conversation copy control. When earlier context is useful, reaching the top loads one internal page from the current active trace without exposing a page count, persistent control row, or archive workflow. Loading and recovery chrome overlays the feed without changing its height; return to live state uses a single compact downward-arrow button rather than a text pill.

## Related Requirements And Acceptance Criteria

- Requirements: `REQ-001`–`REQ-012` in `requirements-doc.md`
- Acceptance criteria: `AC-001`–`AC-015`
- Original reference image: `/home/autobyteus/data/memory/agent_teams/software_engineering_team_cfa22c21dace401ba00d365fb95b57dd/solution_designer_62969670fca54e7fbe04a1f7e934be3c/context_files/ctx_1d90b429e36e__image.png`
- 2026-07-21 zero-layout evidence: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_8052345d87004850b782e66b7b129d55/solution_designer_cf42deda46f44bbbb6446758239df763/context_files/ctx_fc4e8615a19a__image.png`, `ctx_945120610f86__image.png`, and `ctx_7268fea0d526__image.png` show the sticky top pill's large reserved band and simultaneous wide bottom pill.
- 2026-07-21 coexistence and approved placement evidence: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_8052345d87004850b782e66b7b129d55/implementation_engineer_167e2a5435a14f58a1d1f41b36078436/context_files/ctx_06983d851e91__image.png` shows the conditional **improve skills** action occupying the lower-right composer-context zone; `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_8052345d87004850b782e66b7b129d55/implementation_engineer_167e2a5435a14f58a1d1f41b36078436/context_files/ctx_1f29624b2f2b__image.png` is the user-approved centered quiet-white arrow direction. The reference supplies placement/visual intent only; implementation uses project-owned tokens/components.

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
| `UXJ-003` | User reads slightly older recent activity | Event Monitor is not at bottom | Keep reading without viewport jumps or large chrome | A compact downward-arrow overlay appears only when needed; viewport stays put | `REQ-005`; `AC-005`, `AC-011` |
| `UXJ-004` | User returns to live activity | Downward-arrow affordance is visible | Jump to latest | Latest item is visible, bottom-follow resumes, arrow clears | `REQ-005`; `AC-005`, `AC-011` |
| `UXJ-005` | User inspects Thinking/tool card | Recent feed contains collapsed cards | Expand only a chosen card | Existing disclosure behavior works unchanged | `REQ-006`; `AC-006` |
| `UXJ-006` | User views workspace header | Agent workspace is open | Use normal controls without unused copy action | Copy control is absent; layout remains coherent | `REQ-008`; `AC-007` |
| `UXJ-007` | User deliberately reaches the top of recent activity | Latest mode has older active-trace events | Retrieve nearby earlier context without controls consuming feed height | One internal page appears above with the viewport anchored; only a temporary three-dot overlay appears while loading | `REQ-010`–`REQ-012`; `AC-012`–`AC-015` |
| `UXJ-008` | User browses toward the active-trace boundary | One or more earlier pages are visible | Continue naturally until the current active trace begins | Scrolling simply stops at the active boundary; no persistent boundary row or archive request appears | `REQ-010`–`REQ-012`; `AC-012`–`AC-014` |

## Journey Details

### `UXJ-001` — Open Recent Activity

1. The user clicks an agent or team-member row.
2. The selected workspace shell follows the existing selection behavior.
3. The Event Monitor renders only recent events derived from the active raw-trace file; no archived segment is loaded and no archive-loading state appears.
4. If more than 100 visual events are available, only the newest 100 are presented in chronological order.
5. The feed initially positions at the bottom so the newest event is visible.

If the server reports that earlier active-trace content may exist, no persistent top affordance is rendered and no earlier page is requested during initial selection. Paging is armed only after the user moves away from the top and deliberately scrolls back into the top threshold.

### `UXJ-002` — Follow Live Activity

1. While the user remains at/near the bottom, a new logical event appends or an existing card is updated.
2. Token deltas and lifecycle updates modify the existing visible segment/card rather than creating duplicate visual events.
3. The feed remains pinned to the bottom.
4. When the window would exceed 100 visual events, the oldest completed visual event rolls out first. A still-streaming text/Thinking segment, nonterminal tool card, or started compaction remains visible even when it is older than a completed item.
5. If the abnormal but reachable state contains more than 100 mutable events and therefore no completed candidate can satisfy the cap, the oldest mutable item rolls out deterministically. A later update for that identity may reappear once at the newest edge with only the source-limited data available in that update; the window never exceeds 100 and never displays two copies of the identity.

### `UXJ-003` — Read Within The Recent Window

1. The user scrolls more than the existing near-bottom threshold away from latest.
2. A net visible append, retained-card/content update, center-compaction change, or eviction-only presentation change that survives bounded enforcement does not force-scroll the container.
3. A compact circular downward-arrow button appears as an absolute overlay at the horizontal center of the Event Monitor's lower edge above the composer. It has no persistent text label and contributes no layout height.
4. The current viewport remains stable as closely as the browser layout permits while older retained items roll out.
5. Connection, turn-start, accepted no-op command/status, Activity-only tool log/result updates, equal tool-argument replacement whose rendered card summary is unchanged, and other protocol messages that do not change the center presentation or its retained interaction do not display the button. A message token/cost change does display the button only when it changes the rendered per-message or total-usage text.
6. A transient new event that is synchronously removed by the 100-event policy and leaves the final ordered presentation identical also does not display the button; jumping must always correspond to a real final presentation difference.

### `UXJ-004` — Jump To Latest

1. The user activates the familiar downward-arrow affordance by pointer or keyboard. It has no visible label or explanatory tooltip; a localized non-visual accessible name remains for assistive technology.
2. The Event Monitor scrolls to its bottom, latest content becomes visible, and bottom-follow resumes.
3. In normal latest mode, the button clears once latest is reached; manually scrolling back to the latest-mode bottom has the same clearing effect. In frozen browse mode, reaching the bottom of the resident browse snapshot does **not** exit browse, reveal live state, discard pages/cursors, or clear the arrow. Only explicit arrow activation exits browse.

### `UXJ-005` — Disclosure Interaction

1. Thinking and tool cards render collapsed exactly as they do today.
2. The user explicitly activates a card to expand it.
3. Rolling/hydration must not automatically expand cards. No new detail request or archive lookup is introduced.

### `UXJ-006` — Header Cleanup

1. The separate copy icon/button beside the conversation header is not rendered.
2. No replacement copy/export control, tooltip, empty gap, or disabled placeholder is shown.
3. Remaining header controls retain their existing order and interaction.

### `UXJ-007` — Scroll Into Earlier Active-Trace Activity

1. The user begins one direct upward interaction with the feed—wheel, touch, supported keyboard scrolling, or the native scrollbar—from outside the re-arm distance and deliberately reaches the top of the currently displayed window.
2. Only that current user interaction may authorize the crossing. Scroll events by themselves, mount/selection, automatic bottom-follow, programmatic anchor restoration, queued scroll delivery, browser scroll anchoring, media/layout reflow, and continued momentum cannot start or reuse the authorization.
3. If earlier active-trace content is available, the feed consumes the interaction before requesting one server-owned page automatically. No button, text label, explanatory tooltip/status, or batch count appears. A small three-dot progress indicator is absolutely positioned over the top edge while the request is in flight and ignores/coalesces repeated scroll events.
4. On the first load, the Event Monitor enters active-trace browse mode using one server-consistent view of the current latest 100 plus up to 50 immediately preceding events. Later top reaches add only the next preceding page of at most 50. A prepend/anchor restoration cannot itself trigger another page; after request/restore settles, the prior wheel/touch/key/scrollbar interaction must end, input must become quiet, and the user must begin a fresh interaction from outside the re-arm distance.
5. The first previously visible event remains at the same viewport position within normal dynamic-media reflow tolerance while earlier content is inserted above.
6. Browse content is derived only from `raw_traces_active.jsonl`; the action has no archive fallback and no archive-related loading state.
7. Live state continues updating separately. It never overwrites the browse snapshot or pulls the viewport down; a real live change exposes the compact downward-arrow affordance.
8. Thinking and tool cards in loaded pages remain collapsed by default.
9. Distinct events remain separately visible even when their text and timestamp are identical. Prepending must not cause a collapsed or expanded card to inherit another event's disclosure state.

### `UXJ-008` — Continue To The Active-Trace Beginning

1. The user may repeatedly move away from and scroll back into the top threshold.
2. Each successful request adds at most 50 immediately preceding canonical events in chronological order, with no duplicate identity at a page boundary.
3. The resident browse window never exceeds 300 visual events. When another page would overflow it, the farthest newer 50-event browse page is released while the same first-visible visual identity and reading offset stay fixed.
4. If newer browse pages were released, no persistent boundary banner appears; the downward-arrow affordance remains the explicit route to live truth while the user may continue paging earlier.
5. When no earlier active-trace event remains, the progress indicator disappears and the feed simply stops at the beginning of current activity. No persistent beginning row, archive explanation, disabled control, or visible/announced boundary message is added.
6. If compaction rewrites the active trace while browsing and invalidates the cursor, preserve already visible content and keep the same downward-arrow affordance available to return to latest. Do not show explanatory status text, silently reset, duplicate, or query an archive.

## Screen / Surface / Component Inventory

| Surface / Component | Purpose | Entry Conditions | Important States | Exit / Next Action |
| --- | --- | --- | --- | --- |
| Central Event Monitor / conversation feed | Display recent messages, assistant segments/cards, center compaction rows, and optional active-trace browse pages | A run/member is selected | Empty, latest-pinned, loading-earlier, browsing, beginning, cursor-expired, scrolled-with-new-activity, rolling eviction | Read, load earlier, expand a card, jump latest, compose, or select another row |
| Zero-height top paging sentinel | Request one earlier active-trace page after one fresh direct user-input session crosses the top threshold | Older active-trace content may exist and wheel/touch/key/scrollbar input begins outside the re-arm distance | Idle / user-intent session / blocked-settling / loading dots / compact retry / exhausted / expired | Consume one session, prepend/anchor one page, then require post-work quiet and a fresh interaction |
| Three-dot progress overlay | Acknowledge an in-flight earlier request without moving content | Top paging request is active | Visible only while loading | Disappears on success, exhaustion, or error |
| Icon-only downward-arrow control | Return a non-pinned or browsing user to current live activity | New visible activity exists while not near bottom, or browse mode is active | Hidden / visible / keyboard-focused | Jump/return to latest and resume following |
| Existing **improve skills** composer action | Start the existing eligible skill-improvement workflow; retained only as an adjacent layout constraint for this ticket | Skill Improvement is enabled and the standalone/focused-member run is eligible | Existing hidden/loading/disabled/visible behavior | Existing action; no Event Monitor browse dependency |
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
| New activity while non-pinned | Post-enforcement bounded presentation differs from the pre-mutation presentation | Compact downward-arrow overlay appears | Viewport remains non-pinned | Visible-presentation revision increments once; recent window still rolls | Jump or continue reading |
| Return arrow and **improve skills** both visible | Eligible standalone or focused team-member surface is non-pinned/browsing | Centered quiet-white arrow in feed; existing skill CTA remains lower-right below it | Two spatially separate actions with no text added to the arrow | No shared state, prop, coordinate measurement, or responsive placement branch | Activate either independent action |
| Non-visible protocol message | Connection/turn/status/accounting message produces no center-feed change | No feedback in Event Monitor | Jump control remains unchanged/hidden | Visible-presentation revision does not change | Continue reading |
| Activity-only tool detail | Tool log/result changes but the central card name, summary, status, error, and actions remain the same | No feedback in Event Monitor | Card and jump state remain unchanged | Equal pre/post semantic witness; Activity may update independently | Continue reading or open Activity |
| Equal tool argument replacement | Handler replaces the arguments object but the shared derived command/path/text summary is unchanged | No feedback in Event Monitor | Card and jump state remain unchanged | Raw reference identity is ignored; semantic witness remains equal | Continue reading |
| Transient append is evicted | Full 100-mutable window receives one atomic-complete event; enforcement removes that new event | No feedback in Event Monitor | Presentation and jump state remain unchanged | Equal pre/post witness; revision does not change | Continue reading |
| Downward arrow activated | Click/Enter/Space | Scroll moves to bottom or exits frozen browse state | Latest-pinned; control hidden | Clear unseen flag and browse pages/cursors when applicable | Continue following |
| Manual return to bottom in latest mode | Scroll to the latest-mode near-bottom threshold | Arrow disappears | Latest-pinned | Clear unseen flag only; no browse state exists | Continue following |
| Manual scroll to bottom in frozen browse mode | Reach the bottom of the resident browse snapshot | No new feedback; arrow remains | Browse snapshot remains visible | Do not clear unseen, pages, cursor, or browse state | Activate arrow or continue browsing |
| Window overflow with completed candidates | Historical hydration or live append exceeds 100 | No modal/toast | Oldest completed visual events are absent; mutable items remain | Completed-first trim | Read recent window |
| Window overflow with all candidates mutable | More than 100 concurrently mutable events | No modal/toast; optional development diagnostic only | Oldest mutable item is absent; cap remains 100 | Deterministic hard-cap fallback; later identity update may source-limited re-enter once | Continue monitoring |
| Card disclosure | Activate Thinking/tool card | Existing disclosure animation/state | Only chosen card expands | No archive access | Collapse again |
| Earlier page available | Fresh direct wheel/touch/keyboard/scrollbar session begins outside the re-arm distance and its qualified upward scroll crosses the top threshold | Zero-layout three-dot progress overlay; session consumed before dispatch; duplicate/queued scroll events ignored | Up to 50 earlier events inserted; browse mode active | Active-trace-only page request; blocked through restore/settling/input quiet | Read; begin a fresh away/re-enter interaction; return latest |
| Non-user scroll geometry changes | Mount, selection, API scroll write, queued scroll delivery, CSS scroll anchoring, or media/card reflow changes `scrollTop` | No feedback and no request | Current latest/browse state remains | Position-only scroll events have no user-intent authority | Continue reading |
| Equal-content earlier events | Load a page containing distinct events with equal timestamp/text | Both rows/cards remain visible | Each keeps its own disclosure and scroll-anchor identity | No semantic content collapse or ordinal-key reuse | Read or load again |
| Earlier page request fails | Network/server error | Compact absolute retry control; no layout shift | Existing pages remain | No automatic archive/read fallback | Retry or return latest |
| Active trace begins | Earlier response has no predecessor | Loading dots disappear; no persistent top chrome or status wording | Top is terminal for this browse source | No archive request or boundary announcement | Read or return latest |
| Browse cursor expires | Compaction/rewrite changes active generation | Same icon-only downward return arrow; no explanatory text | Existing page remains; earlier loading paused | Cursor discarded; no archive fallback | Return to latest |
| Resident browse bound reached | Another page would exceed 300 | No modal/toast | Farthest newer 50-event browse page released; anchor stable | Page state/DOM remains <=300 | Continue earlier or jump latest |

## Markdown Wireframes / Visual Structure

```text
┌──────────────── Agent Workspace Header ────────────────┐
│ avatar  agent_name  status                 settings +  │
│              (no conversation copy control)            │
├────────────────── Event Monitor ───────────────────────┤
│ · · ·  (absolute overlay only while loading)            │  ← zero layout height
│ [oldest retained visual; no persistent paging row]      │
│ You: ...                                                │
│ [Thinking >]                 collapsed as today         │
│ [✓ run_bash ... >]           collapsed as today         │
│ ...                                                     │
│ [newest event]                                          │
│                         [ ↓ ]                           │  ← centered absolute icon-only return control
├──────────────────── Composer ───────────────────────────┤
│                                      [ improve skills ] │  ← independent conditional composer action
│ Context Files ...                                       │
│ Type a message...                                  Send │
└─────────────────────────────────────────────────────────┘
```

In active-trace browse mode the visible window may contain up to 300 events. Reaching the hard top boundary simply stops producing earlier content; it does not insert a persistent boundary row. No archive selector, export, page-count label, or replacement copy control is added.

### Visual Cleanliness Rules

- **At rest, pagination is invisible.** The first event begins at the same vertical offset whether earlier content is available, exhausted, or unavailable. There is no top background strip, divider, empty spacer, chip, status row, or disabled control.
- **Fast requests do not flash chrome.** Set `aria-busy` immediately, but delay the visible loading indicator by approximately 150 ms. If the request finishes first, no loading pixels appear.
- **Loading is only three dots.** Use three neutral 4 px dots with no text, count, bordered capsule, or full-width scrim. Position them absolutely at top center with a small 8 px inset; reduced-motion mode uses opacity only.
- **The return control follows the user-approved centered chat pattern.** Center a 16 px simple dark downward arrow inside a quiet white 36 px circular surface and a minimum 44 px hit area whose lower edge is inset 8 px inside the Event Monitor feed boundary above the composer. Use a subtle neutral project border/shadow, no badge, pulse, count, visible label, or explanatory tooltip. Center against the feed scroll region, not the application window or remaining free space beside another action.
- **Keep cross-feature actions spatially independent.** The existing conditional **improve skills** action remains right-aligned in composer context. The return arrow remains bottom-center in the feed whether that action is absent, loading, disabled, or visible. Do not stack, offset, merge, or move the arrow into the lower-right zone; wide and narrow layouts must show both without overlap or horizontal overflow.
- **One arrow means one visual treatment.** Ordinary unseen, frozen browse, released-newer-page, and cursor-expired states use the same quiet-white surface, subtle neutral border/shadow, and simple dark glyph. Expiry changes only the underlying recovery state; it adds no amber/warning color, label, status, badge, or alternate icon.
- **Never stack recovery controls.** Browse exit, unseen activity, released newer pages, and cursor expiry share the same arrow. Loading/retry use the single top overlay slot. No normal state shows both a text notice and an equivalent icon.
- **Motion stays quiet.** Controls may fade in/out without shifting position; no bounce, attention pulse, or continuous animation is permitted except the transient loading dots, and reduced-motion settings suppress positional animation.

## Non-Happy-Path States

### Loading

- Preserve the existing run-selection/loading treatment; do not add an earlier-page request during initial selection.
- A large archive must have no effect on Event Monitor loading because it is not read.
- The composer and remaining workspace controls must not wait on archived projection work.
- Earlier-page loading is local to the top edge and uses only the delayed absolute three-dot overlay. It must not reserve height, shift the first event, cover/disable the composer, or discard already displayed content.

### Empty

- If the active file is absent or has no displayable events, preserve the existing empty conversation behavior.
- Do not fall back to archived segments to fill an empty Event Monitor.

### Error And Recovery

- Preserve the existing projection error behavior and retry/open behavior.
- An absent, malformed, or unreadable active file must not trigger an implicit archive scan.
- Live events that arrive after an empty/failed historical projection may populate the rolling window through the existing stream path.
- An earlier-page failure keeps current content and offers only a compact absolute retry icon. A cursor-expired result keeps the shared downward-arrow return affordance with the exact same quiet-white/neutral-border/simple-dark treatment as ordinary unseen/browse states, without warning color, status text, automatic refetch, a banner, or archive fallback.

### Disabled / Unavailable

- The downward-arrow control is absent rather than disabled when the user is at latest or no unseen activity exists.
- Removed copy functionality has no disabled placeholder.
- There is no persistent earlier-load control. In-flight work shows only the three-dot overlay; after `hasEarlier=false` the top remains visually empty rather than showing a disabled or replacement control.

### Permission / Authentication

- Preserve existing workspace/run authorization and reauthentication behavior. Do not mislabel permission failure as empty recent activity.

## Responsive And Platform Behavior

- Desktop/Electron: the visible downward-arrow circle is compact (target design 36 px with a 16 px standard dark downward glyph) inside an absolute keyboard/touch target of at least 44 px at bottom-center of the Event Monitor scroll region. It must not overlap the composer or lower-right **improve skills** action, change layout, display a badge/count, or pulse for attention.
- Narrow/mobile: the same icon-only control remains centered within the feed and at least 44 px touch-targeted. It must not become a full-width text pill, shift into the lower-right action zone, collide with **improve skills**, or create horizontal overflow. No responsive side-placement fallback is introduced.
- The latest-100 bound, 50-event page size, 300-event resident browse bound, active-only source, bottom-follow behavior, and lack of archive navigation are identical on supported platforms.

## Accessibility And Keyboard Behavior

- The icon-only downward arrow is a real `<button>` operable by Tab, Enter, and Space, with visible focus.
- It has a localized non-visual `aria-label` equivalent to **Jump to latest activity** for assistive technology, but no hover/focus tooltip or visible explanation.
- Do not add a live region for unseen activity, loading progress, the active-trace beginning, or cursor expiry, and do not announce streaming tokens. The scroll region may expose `aria-busy` during an earlier request; interactive icons retain concise non-visual accessible names.
- Manual and activated scrolling must not trap or unexpectedly relocate keyboard focus.
- Existing Thinking/tool disclosure keyboard behavior and accessible state remain unchanged.
- Automatic top paging is also reachable through normal keyboard scrolling (`Home`, `PageUp`, or equivalent container scroll) and does not require an invisible focus stop. Retry and Return controls are real compact overlay buttons operable by Tab, Enter, and Space with visible focus. Loading exposes only `aria-busy` on the scroll region; it adds no live-region message, localized loading phrase, or other explanatory status.

## Non-Visual Accessibility Names

- English arrow accessible name: **Jump to latest activity**
- Simplified Chinese arrow accessible name: **跳到最新动态**
- English retry-icon accessible name: **Retry**
- Simplified Chinese retry-icon accessible name: **重试**

These names exist only in the accessibility tree; they are not rendered as tooltips or visible text. The internal value `50` must not appear in visible or accessibility copy. Use the existing localization source structure. No archive selector, show-full, copy, export, boundary, or loading-status labels are introduced.

## Data And API Dependencies

- Existing standalone and team-member projection queries, guaranteed by the backend to return an active-file-only latest event window plus earlier-availability metadata.
- Dedicated explicit standalone-run and team-member earlier-page queries. Each uses an opaque active-generation cursor, a server-fixed 50-event earlier page, stable event and subvisual identities, and no archive or client limit argument.
- A dedicated typed page presentation containing only central user/text/Thinking/tool/media/compaction fields. It preserves stable subvisual keys into rendered DOM anchors, performs no content-based dedupe, and excludes raw tool results, logs, Activity detail/context, and generic payload objects. Tool cards retain their visible semantic name/summary/status/error without transporting hidden result detail.
- A shared frontend recent-window constant/policy with maximum 100 visual events.
- A shared completion classifier: atomic user/static events are complete on insertion; streamed text/Thinking completes at segment/message completion; tool/file/terminal cards complete only in terminal status; center compactions complete only at completed/failed.
- Live stream/submission integration that captures a bounded lightweight ordered presentation witness before mutation, applies existing handlers plus completed-first rolling, captures the final witness, and increments an ephemeral per-run visible-presentation revision only when those witnesses differ.
- The witness covers at most 100 visual descriptors and only shallow semantic values that the central feed renders or uses for retained interaction. It reuses the same tool-card summary/presentation derivation as the renderer, compares ordered attachment/media primitives, and includes derived message/total usage and compaction-row presentation. Activity-only tool logs/results, raw argument references, full payloads, and history are excluded. Handler-level transient effects alone do not drive unseen state.
- The revision resets/baselines on historical hydration or any conversation/context replacement, including reused non-live team-member contexts. Subscribed live contexts whose conversation is preserved keep their revision. In latest mode only, the feed clears unseen on reset/selection, manual return to the latest bottom, or arrow activation. In frozen browse mode, manual bottom does not clear or exit anything; only arrow activation discards browse state and reveals live truth. Generic `conversation.updatedAt` is not a dependency.
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

The user approved the fast latest-100 rolling Event Monitor, collapsed cards, archive exclusion, and copy removal on 2026-07-18, then approved active-trace-only earlier traversal on 2026-07-20. Hands-on review on 2026-07-21 explicitly rejected the implemented persistent `Load 50 earlier` and wide text jump pills because they expose internal mechanics, consume excessive height, and make the feed unclean. The user then approved one user-originated top transition per internal page, one temporary zero-layout loading effect, no visible count/explanatory tooltip/status/boundary row, and one icon-only downward return arrow. When conditional **improve skills** evidence revealed that lower-right placement would create a competing action cluster, the user explicitly selected the centered ChatGPT-like treatment shown in `ctx_1f29624b2f2b__image.png`: bottom-center above the composer, quiet white circle, subtle neutral border/shadow, simple dark downward arrow, no visible copy/count/badge/tooltip, and >=44 px target. That approved treatment is singular: ordinary unseen, frozen browse, released-page, and cursor-expired states use the exact same neutral base style; `AR-011` removes the stale expired-only amber branch rather than authorizing an additional warning treatment. The governing principle remains that the normal feed should look as though no pagination machinery exists.
