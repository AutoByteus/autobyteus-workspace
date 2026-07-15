# Contextually Collapsible Settings Sidebar UI/UX Specification

## Status

`Refined` — approved through the user's explicit task kickoff after iterative text and visual UI review.

## UX Goal

Keep Settings navigation visible for normal use, but allow the sidebar to disappear completely when content width matters. Token Statistics automatically enters the collapsed state; the exact existing Agents left-sidebar icon provides reversible control.

## Related Requirements And Acceptance Criteria

- Requirements: `REQ-001`–`REQ-012`
- Acceptance criteria: `AC-001`–`AC-014`

## Recommended Behavior

1. **Normal Settings state:** existing 16rem labeled sidebar remains visible.
2. **Open-state toggle:** exact panel icon from beside Agents appears as a separate button at the far right of the existing `Back to Workspace` row and collapses the sidebar. Do not add a redundant `Settings` title row.
3. **Token Statistics:** selection/direct entry auto-collapses the sidebar.
4. **Collapsed state:** no sidebar/rail width remains; lightweight shell header shows the same icon and active page label.
5. **Reopen:** header icon restores the persistent sidebar in normal layout flow.
6. **Navigate away:** selecting a non-statistics page leaves/restores the sidebar open.
7. No overlay, dimming, backdrop, `×`, or chevrons.

## User-Journey Inventory

| Journey ID | Starting State | Action | Completion State | Related IDs |
| --- | --- | --- | --- | --- |
| `UXJ-001` | API Keys/ordinary page | View page | Sidebar open normally | `REQ-001`, `AC-001` |
| `UXJ-002` | Sidebar open | Activate Agents-style icon | Sidebar gone; full-width header/content | `REQ-002`, `REQ-004`, `REQ-005`, `AC-002`–`AC-004` |
| `UXJ-003` | Ordinary page | Select Token Statistics | Sidebar auto-collapses | `REQ-003`, `AC-005`, `AC-006` |
| `UXJ-004` | Statistics collapsed | Activate header icon | Sidebar reopens; statistics state preserved | `REQ-006`, `REQ-008`, `AC-007` |
| `UXJ-005` | Statistics sidebar open | Select another section | New section loads with sidebar open | `REQ-007`, `AC-008` |
| `UXJ-006` | Either toggle state | Keyboard operation | Focus/state remain predictable | `REQ-009`, `AC-010` |

## Markdown Wireframes / Visual Structure

### Normal state — sidebar open

```text
┌──────────────────────────┬──────────────────────────────────────────────────┐
│ ← Back to Workspace  [◫] │                                                  │
│                          │                                                  │
│ API Keys                 │ API Key Management                               │
│ Token Statistics         │ ...                                              │
│ Messaging                │                                                  │
│ Display                  │                                                  │
│ ...                      │                                                  │
└──────────────────────────┴──────────────────────────────────────────────────┘
```

### Token Statistics — automatically collapsed

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ [◫]  Token Statistics                                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Task ▾] [Start] to [End]                               [Fetch Statistics] │
│ Task / Run | Runtime | Models | Input | Output | Costs | Created Time      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Statistics after reopening the sidebar

```text
┌──────────────────────────┬──────────────────────────────────────────────────┐
│ ← Back to Workspace  [◫] │                                                  │
│                          │                                                  │
│ API Keys                 │ [Task ▾] [Start] to [End] [Fetch Statistics]   │
│ Token Statistics ●       │ Task / Run | Runtime | ...                       │
│ Messaging                │                                                  │
│ ...                      │                                                  │
└──────────────────────────┴──────────────────────────────────────────────────┘
```

`[◫]` represents the exact existing panel icon beside Agents.

## Interaction And State Transitions

| State | Trigger | Result | Content Side Effect |
| --- | --- | --- | --- |
| Ordinary section, open | Collapse icon | Sidebar removed; collapsed header appears | None |
| Open menu | Select Token Statistics | Statistics loads; sidebar removed | Existing statistics mount/fetch only |
| Collapsed | Header icon | Persistent sidebar restored | No refetch solely from toggle |
| Statistics, open | Select non-statistics section | Section loads; sidebar remains open | Existing section lifecycle |
| Collapsed | Direct non-statistics section normalization | Sidebar open for target section | Existing route behavior |

## Responsive Behavior

- Desktop `md+`: use open/collapsed behavior above.
- Below `md`: preserve current stacked navigation; do not create a vertical icon rail.
- Collapsed Token Statistics uses full width and contained table overflow.
- Reopened sidebar participates in layout and may temporarily narrow the table; closing restores full width.

## Accessibility

- Same exact SVG/button visual language as Agents.
- Open-state button: localized `Close Settings menu`.
- Collapsed-state button: localized `Open Settings menu`.
- Both toggle locations control the same stable `settings-navigation-region`: the open-state button exposes `aria-expanded="true"`, and the collapsed-state button exposes `aria-expanded="false"`.
- The open-state toggle is desktop-only; the collapsed header is likewise desktop-only. Both retain a visible focus ring.
- On desktop manual collapse, focus moves to the corresponding header toggle; on reopen, focus moves to the sidebar toggle.
- Selecting Token Statistics from the desktop menu moves focus to the newly visible header toggle so focus is not left in hidden navigation. Below `md`, the header is CSS-hidden, no focus transfer occurs, and focus stays on the still-visible stacked navigation item.
- Direct routes, embedded-server redirects, and viewport changes do not steal focus.
- Collapsed header context comes from the same typed navigation resolver as menu labels/icons. Server Settings renders both parent and active mode context (for example, `Server Settings — Advanced`); it is never supplied a separate free-form label.
- Icon is never replaced by `×`, `[»]`, or `[«]`.

## Non-Happy Paths

- Loading/error/empty/form states do not disable toggle.
- Toggling alone does not reset or refetch section state.
- Direct `?section=token-usage` resolves collapsed at desktop.
- Embedded server-not-running redirect to Server Settings resolves with sidebar open.

## Data And API Dependencies

None. Sidebar state is ephemeral Settings-shell UI state.

## Superseded Visual Exploration

The previously rendered off-canvas mockups are preserved as discussion evidence but no longer represent the target behavior:

- `proposed-settings-drawer-closed.png`
- `proposed-settings-drawer-open.png`
- `proposed-settings-drawer.html`

## Approval Status

Approved on 2026-07-15. The earlier always-hidden/off-canvas visual exploration is explicitly superseded. The approved target is the normally-open, zero-width-when-collapsed sidebar behavior specified above.
