# Resizable Settings Separator UI/UX Specification

## Status

`Refined` — revised direction approved by the user on 2026-07-15. The prior collapsed-header UI is rejected and superseded.

## Scope And Relationship

- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/ui-ux-spec.md`
- Requirements: `REQ-001`–`REQ-012`
- Acceptance criteria: `AC-001`–`AC-015`
- This supplement defines observable interaction. `requirements.md` remains authoritative.

## UX Goal

Make the Settings/content boundary adjustable without redesigning Settings. At rest, users should see the original page. When more horizontal space is needed, they drag the existing vertical separator left. Nothing appears above the content and content keeps its original vertical position.

## Approved Behavior

1. Fresh desktop Settings page starts with the original 256px menu.
2. The existing one-pixel separator is draggable horizontally; its larger hit area is transparent at rest.
3. Drag left to shrink the menu continuously, including to 0px. Drag right to restore it, up to 256px.
4. At desktop 0px, only the separator remains at the far left; the mounted navigation is visually clipped and unavailable to keyboard/assistive technology. There is no header, label, icon, menu rail, or overlay.
5. Resizing is manual for every Settings page. Token Statistics does not auto-collapse.
6. Width remains while switching sections in the same mounted Settings page, but is not persisted across remounts/restarts.
7. Below `md`, retain the original stacked Settings UI and hide the desktop separator.

## Visual Structure

### Fresh desktop state — visually unchanged

```text
┌──────────────────────────┬──────────────────────────────────────────────────┐
│ ← Back to Workspace      │                                                  │
│                          │                                                  │
│ API Keys                 │ Current manager/content at original top position │
│ Token Statistics         │                                                  │
│ Messaging                │                                                  │
│ ...                      │                                                  │
└──────────────────────────┴──────────────────────────────────────────────────┘
                           ↑ existing one-pixel boundary; draggable hit area
```

### Partially resized

```text
┌──────────────┬──────────────────────────────────────────────────────────────┐
│ Settings nav │ More horizontal content space                               │
│ clips with   │ Statistics/table stays at the same vertical position         │
│ pane width   │                                                              │
└──────────────┴──────────────────────────────────────────────────────────────┘
               ↔ drag
```

### Fully left / zero-width menu

```text
┌┬────────────────────────────────────────────────────────────────────────────┐
││ Content begins immediately beside the surviving separator                  │
││ No category header, title, icon, rail, backdrop, or vertical offset        │
└┴─────────────────────────────────────────────────────────────────────────────┘
 ↑ one-pixel separator with transparent draggable hit area
```

## Interaction States

| State | Action | Result | Side Effect |
| --- | --- | --- | --- |
| Fresh desktop, 256px | Pointer-drag left | Width follows pointer, clamped at 0px | Content expands; manager stays mounted |
| Partial/0px | Pointer-drag right | Width follows pointer, clamped at 256px | Original menu reappears progressively; above 0px its visible/clipped controls are interactive again |
| Any width | Select another section | New section renders at same chosen width | No automatic width change |
| Token Statistics | Direct route or selection | Menu remains at current/default width | No automatic collapse |
| Separator focused | Left/Right Arrow | Width changes by 16px | Value stays within 0..256 |
| Separator focused | Home/End | Width becomes 0/256px | Same as pointer resize |
| Desktop 0px | Press Tab | Hidden navigation descendants are skipped; separator remains the operable recovery control | No invisible menu focus |
| Desktop 0px -> narrow | Cross below `md` | Original stacked menu is fully restored to view, Tab order, and accessibility tree | Desktop width 0 remains in memory only |
| Narrow at retained 0px -> desktop | Focus is inside navigation when crossing `md` | Navigation becomes desktop-inert and focus moves to separator | Never falls to `BODY` |
| Page remount | Open Settings again | Width returns to 256px | No stored preference |

## Visual Treatment

- Resting line: the same one-pixel gray separator/border as the original page, overlaid inside the navigation's original rightmost pixel at nonzero widths.
- Layout accounting: navigation and content still meet at x=256 initially. A zero-width relative flex anchor sits at that coordinate; its absolute line/target consume no flex width.
- Hit target: exactly 8px wide. At widths of at least 4px it spans 4px on each side of the boundary. For widths below 4px its left edge clamps to viewport x=0 (including x=0..8 at zero) so it never extends negative. It must not reserve visible layout pixels.
- Stacking: the zero-width anchor and hit target sit above adjacent navigation/content (`z-index` contract), while only the target receives pointer events; the decorative line does not intercept events.
- Pointer cursor: `col-resize`.
- Hover/drag/focus: subtle blue or darker-gray line highlight is allowed as transient feedback.
- Focus: visible focus treatment on the separator without adding a toolbar, button, or category row.
- Navigation content uses `overflow: hidden` horizontally while narrower than its original width; incomplete text is intentionally clipped as the user confirmed, and no responsive icon conversion occurs.

## Accessibility

- Desktop separator: `role="separator"`, `aria-orientation="vertical"`, localized `aria-label="Resize Settings menu"`, `aria-valuemin="0"`, `aria-valuemax="256"`, and reactive `aria-valuenow`.
- Separator is keyboard-focusable only at desktop widths.
- ArrowLeft/ArrowRight adjust by 16px; Home/End choose 0/256px.
- At desktop 0px, navigation has `inert` and `aria-hidden="true"`; its still-mounted Back and destination buttons cannot receive Tab focus and are absent from the accessibility tree. At any width above 0 they remain interactive even when text is partially clipped.
- Pointer capture/listeners and body cursor/selection changes are cleaned up on pointer-up, pointer-cancel, and unmount.
- When crossing below `md` while the separator owns focus, move focus to the still-visible `Back to Workspace` button. This directly avoids the previously observed `BUTTON -> BODY` failure.
- Below `md`, remove the desktop-only inert/hidden state regardless of retained width so the full stacked navigation is usable.
- When crossing from narrow to desktop with retained 0px while focus is in navigation, move focus to the separator as navigation becomes unavailable. Other narrow-to-desktop transitions and resizing when another available control owns focus do not steal focus.

## Responsive Behavior

- `md+`: manual resizable split pane, range 0..256px.
- Below `md`: original full-width stacked navigation capped at `38dvh`; no separator in layout or accessibility tree.
- CSS controls stacked-versus-split presentation. Reactive media-query state may be used only to apply/remove the desktop-zero interaction/accessibility state and to recover focus, not to drive visual layout or width policy.
- Desktop width state may remain in memory while temporarily narrow; returning to desktop restores that in-session width without moving focus.

## Loading, Error, Empty, Forms, And Data

All current manager states remain untouched. Resizing is shell geometry only and does not trigger manager remount, fetch, reset, submit, or data mutation.

## Explicitly Rejected / Forbidden UI

- The generated top row with panel icon and `Token Statistics` or any active category name.
- Automatic Token Statistics collapse.
- Agents-style panel icon controls in Settings.
- Compact icon rail, `×`, chevrons, overlay drawer, backdrop, or dimming.
- Any extra top padding/margin/header that pushes content downward.

## Approval Status

Approved on 2026-07-15 after the user reviewed and rejected the implemented collapsed-header screenshot. The final instruction is: keep the original `personal`-branch Settings UI the same and make only the separator draggable so the menu can be manually slid left.
