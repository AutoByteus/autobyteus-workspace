# Event Monitor Rolling Recent-Activity UI/UX Specification

## Status (`Draft`/`Requirements-ready`/`Refined`)

`Refined` — user-approved on 2026-07-18.

## UX Goal

Make the central Event Monitor feel immediate and readable for long-running agents by presenting a rolling window of at most 100 recent visual events. The surface is for monitoring recent activity, not browsing an archive. Preserve still-active cards when completed events can roll away, preserve the current collapsed Thinking/tool-card interaction and bottom-follow behavior, avoid disrupting a user who scrolls within the recent window, and remove the unused conversation copy control.

## Related Requirements And Acceptance Criteria

- Requirements: `REQ-001`–`REQ-008` in `requirements-doc.md`
- Acceptance criteria: `AC-001`–`AC-009`, `AC-011`
- Reference image: `/home/autobyteus/data/memory/agent_teams/software_engineering_team_cfa22c21dace401ba00d365fb95b57dd/solution_designer_62969670fca54e7fbe04a1f7e934be3c/context_files/ctx_1d90b429e36e__image.png`

## Users / Personas / Contexts

- A user monitoring an agent that may run for hours or days.
- A user selecting among team-member rows and primarily reading the latest work.
- A user briefly scrolling upward inside recent activity while new work continues.
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

## Journey Details

### `UXJ-001` — Open Recent Activity

1. The user clicks an agent or team-member row.
2. The selected workspace shell follows the existing selection behavior.
3. The Event Monitor renders only recent events derived from the active raw-trace file; no archived segment is loaded and no archive-loading state appears.
4. If more than 100 visual events are available, only the newest 100 are presented in chronological order.
5. The feed initially positions at the bottom so the newest event is visible.

There is no `Load earlier`, archive, export, or full-history affordance in this flow.

### `UXJ-002` — Follow Live Activity

1. While the user remains at/near the bottom, a new logical event appends or an existing card is updated.
2. Token deltas and lifecycle updates modify the existing visible segment/card rather than creating duplicate visual events.
3. The feed remains pinned to the bottom.
4. When the window would exceed 100 visual events, the oldest completed visual event rolls out first. A still-streaming text/Thinking segment, nonterminal tool card, or started compaction remains visible even when it is older than a completed item.
5. If the abnormal but reachable state contains more than 100 mutable events and therefore no completed candidate can satisfy the cap, the oldest mutable item rolls out deterministically. A later update for that identity may reappear once at the newest edge with only the source-limited data available in that update; the window never exceeds 100 and never displays two copies of the identity.

### `UXJ-003` — Read Within The Recent Window

1. The user scrolls more than the existing near-bottom threshold away from latest.
2. An actual visible append, retained-card/content update, center-compaction change, or eviction-only presentation change does not force-scroll the container.
3. A compact floating/sticky button appears near the lower edge of the Event Monitor: **New activity · Jump to latest**.
4. The current viewport remains stable as closely as the browser layout permits while older retained items roll out.
5. Connection, turn-start, token/accounting, accepted no-op command/status, and other protocol messages that do not change the center presentation do not display the button.

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

## Screen / Surface / Component Inventory

| Surface / Component | Purpose | Entry Conditions | Important States | Exit / Next Action |
| --- | --- | --- | --- | --- |
| Central Event Monitor / conversation feed | Display recent messages, assistant segments/cards, and center compaction rows | A run/member is selected | Empty, latest-pinned, scrolled-with-new-activity, rolling eviction | Read, expand a card, compose, or select another row |
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
| New activity while non-pinned | Live append/update/compaction/eviction creates an actual visible change | Jump control appears | Viewport remains non-pinned | Visible-presentation revision increments once; recent window still rolls | Jump or continue reading |
| Non-visible protocol message | Connection/turn/status/accounting message produces no center-feed change | No feedback in Event Monitor | Jump control remains unchanged/hidden | Visible-presentation revision does not change | Continue reading |
| Jump control activated | Click/Enter/Space | Scroll moves to bottom | Latest-pinned; control hidden | Clear unseen flag | Continue following |
| Manual return to bottom | Scroll to near-bottom threshold | Jump control disappears | Latest-pinned | Clear unseen flag | Continue following |
| Window overflow with completed candidates | Historical hydration or live append exceeds 100 | No modal/toast | Oldest completed visual events are absent; mutable items remain | Completed-first trim | Read recent window |
| Window overflow with all candidates mutable | More than 100 concurrently mutable events | No modal/toast; optional development diagnostic only | Oldest mutable item is absent; cap remains 100 | Deterministic hard-cap fallback; later identity update may source-limited re-enter once | Continue monitoring |
| Card disclosure | Activate Thinking/tool card | Existing disclosure animation/state | Only chosen card expands | No archive access | Collapse again |

## Markdown Wireframes / Visual Structure

```text
┌──────────────── Agent Workspace Header ────────────────┐
│ avatar  agent_name  status                 settings +  │
│              (no conversation copy control)            │
├────────────────── Event Monitor ───────────────────────┤
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

No beginning marker, archive marker, `Load earlier`, export, or replacement copy control is added.

## Non-Happy-Path States

### Loading

- Preserve the existing run-selection/loading treatment; do not add archive-related loading states.
- A large archive must have no effect on Event Monitor loading because it is not read.
- The composer and remaining workspace controls must not wait on archived projection work.

### Empty

- If the active file is absent or has no displayable events, preserve the existing empty conversation behavior.
- Do not fall back to archived segments to fill an empty Event Monitor.

### Error And Recovery

- Preserve the existing projection error behavior and retry/open behavior.
- An absent, malformed, or unreadable active file must not trigger an implicit archive scan.
- Live events that arrive after an empty/failed historical projection may populate the rolling window through the existing stream path.

### Disabled / Unavailable

- The jump control is absent rather than disabled when the user is at latest or no unseen activity exists.
- Removed copy functionality has no disabled placeholder.

### Permission / Authentication

- Preserve existing workspace/run authorization and reauthentication behavior. Do not mislabel permission failure as empty recent activity.

## Responsive And Platform Behavior

- Desktop/Electron: the jump control stays inside or immediately above the lower edge of the Event Monitor scroll region and must not overlap the composer.
- Narrow/mobile: the control remains touch-sized and may use a full-width compact treatment above the composer.
- The 100-event bound, active-only source, bottom-follow behavior, and lack of archive navigation are identical on supported platforms.

## Accessibility And Keyboard Behavior

- **New activity · Jump to latest** is a real `<button>` operable by Tab, Enter, and Space, with visible focus.
- It has an accessible name equal to or clearer than its visible label.
- Do not use an assertive live region or announce every streaming token. A polite announcement may occur once when unseen activity first becomes available, provided repeated deltas are suppressed.
- Manual and activated scrolling must not trap or unexpectedly relocate keyboard focus.
- Existing Thinking/tool disclosure keyboard behavior and accessible state remain unchanged.

## Content, Labels, And Validation Messages

- English: **New activity · Jump to latest**
- Simplified Chinese: **有新动态 · 跳到最新**

Use the existing localization source structure. No archive, load-older, show-full, copy, or export labels are introduced.

## Data And API Dependencies

- Existing standalone and team-member projection queries, now guaranteed by the backend to return an active-file-only latest event window.
- A shared frontend recent-window constant/policy with maximum 100 visual events.
- A shared completion classifier: atomic user/static events are complete on insertion; streamed text/Thinking completes at segment/message completion; tool/file/terminal cards complete only in terminal status; center compactions complete only at completed/failed.
- Live stream/submission integration whose center-presentation-mutating handlers report an actual change and whose authoritative dispatcher commits that effect, applies completed-first rolling, and increments an ephemeral per-run visible-presentation revision once.
- The revision resets/baselines on historical hydration or run/context replacement. The feed clears unseen on that reset/selection, on manual return to bottom, or on jump. Generic `conversation.updatedAt` is not a dependency.
- Per-run Activity retention capped at 100.
- No new GraphQL fields, cursors, archive queries, or detail endpoints.

## Out Of Scope

- Any archive browsing or full-history navigation.
- A replacement copy/export action.
- Thinking/tool-card visual redesign or default-state change.
- Activity-panel visual redesign.
- Full-run totals/search/filter.

## Open Decisions / Risks

- Dynamic-height markdown/media can change layout after rendering. The scroll rule is behavioral rather than a pixel-perfect anchor guarantee during asynchronous media reflow.
- A single visual event can be very large. The count cap prevents unbounded list length but does not truncate individual content in this change.
- Existing token/cost totals within the Event Monitor reflect retained recent data after eviction; no new full-run accounting treatment is introduced.
- In the exceptional all-mutable overflow fallback, content removed before a later lifecycle update may not be reconstructable from that update. The user still sees at most one source-limited current representation, and no archive is read.

## Approval Status

Approved by the user on 2026-07-18. The user confirmed that they read only recent items, agreed with a fast rolling recent-activity Event Monitor, rejected archive-navigation work for this surface, requested that Thinking remain collapsed as today, and explicitly requested removal of the unused copy button.
