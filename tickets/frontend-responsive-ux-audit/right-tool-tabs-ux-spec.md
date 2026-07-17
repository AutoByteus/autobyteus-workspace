# Right-Tool Tabs UX Specification

## Status

- Status: Refined for architecture re-review
- Approval applicability: Intended user-visible behavior; approval required
- Related requirements: FR-013, FR-016, FR-017, FR-018, FR-019, FR-020, FR-040, FR-041
- Related acceptance criteria: AC-012, AC-016, AC-017, AC-018, AC-019, AC-020, AC-021, AC-041, AC-042
- Related design spine: DS-002
- Related shell UX supplement: workspace-responsive-ui-ux-spec.md

## Purpose and Scope

This supplement defines the intended interaction and visual behavior of the right-tool tab header in standard /workspace. It applies to the right-tool tabs when rendered in both docked desktop panels and constrained/narrow drawers. It does not redesign the phone/PWA /mobile shell or the content inside Terminal, Browser, VNC, Files, or other tool panels.

The original product design is a single horizontal tab row. When the available width cannot show every tab, the row remains a single row and becomes horizontally scrollable. Overflow is a reachability concern, not a reason to wrap the header into multiple rows or add custom visual chrome.

Latest revision (2026-07-17): the user explicitly chose the personal-branch
visual behavior for this header, so the previously approved custom edge-fade
and directional-chevron indicators are removed from the intended contract.
This revision does not remove native scrolling or active-tab reachability, and
it does not change `/mobile`.

## Visual Contract

- Keep the right-tool tabs in one horizontal row in every standard workspace presentation.
- Do not wrap tabs into a second row.
- Preserve the original personal-branch tab spacing and typography (including its normal `text-base`/`px-5 py-3` visual scale), active blue underline, hover treatment, and fixed panel-toggle affordance. Do not apply a new compact density merely because the header is rendered in an adaptive layout; only a documented narrow drawer state may use a separate density treatment.
- The tab row may use clipped or visually hidden native scrollbars, but it must remain a real horizontally scrollable container.
- Do not add overflow-indicator chrome to this header. The personal-branch tab row has no edge fade and no directional chevron; native scrolling and active/focused-tab auto-scroll provide reachability without adding another visual layer.

## Interaction Contract

### Horizontal scrolling

Horizontal scrolling is the primary interaction for overflow. It must work with:

- mouse wheel or shift-wheel where the browser/platform provides horizontal scrolling;
- touchpad horizontal gestures;
- touch drag/swipe;
- keyboard focus and keyboard scrolling.

The tab buttons remain individually focusable. Keyboard focus must not be trapped by the affordance controls, and selecting or focusing a tab must not require the user to discover a separate menu.

### Overflow discoverability

When hidden tab content exists, the header remains visually identical to the
personal-branch header: it does not render an edge fade, directional chevron,
floating scroll button, or other overflow-indicator layer. The tab row remains
a real native horizontal scroll container, so users can use mouse wheel or
shift-wheel, touchpad gestures, touch drag/swipe, and keyboard scrolling. This
is an intentional return to the personal-branch interaction, not a removal of
tab reachability.

The absence of a custom indicator must not be “repaired” by wrapping the row,
shrinking the personal typography, or requiring initial fit. Active and focused
tabs remain programmatically scrolled into view, and the optional More menu
remains a separate subordinate shortcut only if the product later chooses to
add it.

### Active-tab reachability

- When the active tab changes programmatically or through a user action, scroll it fully into view if it is outside the visible tab-list bounds.
- Focused tabs must be brought into view using the same behavior.
- Active-tab scrolling must not change tab order, panel state, or the user's stored right-panel visibility preference.
- Switching between docked and drawer presentation must preserve the active tab and make it reachable in the new container.

### Optional More menu

A More menu may be added as a secondary shortcut for direct tab selection when the tab catalog grows. It must:

- remain optional and visually subordinate;
- preserve the canonical tab order;
- not replace horizontal scrolling or the visible tab row;
- not become the only way to reach a tab.

### Side-strip activation context

This supplement governs the tab row after the right tools are docked or after
the transient right-tools drawer is open. The surrounding workspace policy
owns whether the visible compact affordance re-docks the panel or opens that
drawer. The contract is symmetric with the left side:

| Effective state | Strip activation | Result | Preference effect |
| --- | --- | --- | --- |
| Wide, explicit user collapse, right dock fits | `redock-panel` | Re-dock the full right panel and preserve the active tab | Restore visible right-panel preference; close any temporary drawer |
| Constrained/narrow or responsive-yield right strip | `open-drawer` | Open the temporary right-tools drawer from the strip | Leave the stored visibility/resize preference unchanged |
| User-collapsed strip after viewport shrink | `open-drawer` while the dock does not fit | Open the temporary drawer; hide the strip while open and restore it on close | Retain the hidden-by-user intent for recovery |
| User-collapsed strip after viewport recovery | `redock-panel` once the dock fits | Re-dock on strip activation | Restore visible preference only through the explicit activation |

For a non-docked standard `/workspace` right surface, the right strip is
visible while the transient drawer is closed. When the drawer is open, the
drawer is the sole visible right surface and the strip is hidden until
dismissal; this is local interaction state, not a drawer-only responsive
policy presentation. There is no top `Tools` trigger. A strip action must not
change the selected run or tab catalog; once the drawer is open, the
single-row scrolling and active-tab reachability rules in this supplement
apply unchanged.

### Personal-branch strip visual continuity

The right strip itself remains the original personal-branch strip: the same
tool icons, order, spacing, visual weight, and side affordance are used in
docked-adjacent, consuming, overlay, constrained, and narrow states. Only the
activation result changes with capacity (`redock-panel` when a wide
user-origin dock fits; `open-drawer` otherwise). Do not prepend a `Tools`
button, add a visible drawer title, add a separate close `X`, or render a
second panel-toggle control. The transient drawer begins with `RightSideTabs`
content; its title/close semantics may exist in accessible naming and focus
management without visible duplicate chrome. `/mobile` is out of scope.
When the drawer is open, the originating right strip is hidden for the
duration of the overlay. Backdrop or Escape closes the drawer and restores the
same strip; the drawer must not add a second visual close control.

## Ownership and Component Boundaries

- RightSideTabs owns the right-tool presentation configuration, fixed panel-toggle placement, and active-tab context. It must not enable or configure custom overflow indicators for this header.
- TabList owns the single-row scroll container, scroll metrics, and active/focused-tab auto-scroll for the configured tab row. It must not render right-tool-specific fade, chevron, floating scroll button, or other overflow-indicator chrome.
- Tab owns tab typography, spacing, focus treatment, hover treatment, and active underline. It does not calculate container overflow.
- The workspace surface-order catalog remains the only source of tab ordering. Native scrolling and active-tab auto-scroll must not duplicate or reorder that catalog.
- The generic tab-list API must not expose a right-tool-specific wrapped mode. If another product surface requires a different layout, it must make that responsibility explicit without enabling wrapping in this right-tool header.

## Accessibility and Semantics

- The tab row keeps tab semantics and a usable keyboard focus order.
- Native horizontal scrolling and tab keyboard semantics must remain accessible without relying on a custom visual indicator. Reduced-motion preferences may make active/focused-tab auto-scroll non-animated without disabling reachability.
- The panel-toggle control remains independently reachable and must not scroll out of the fixed header action area.
- Strip continuity is validated against `origin/personal`: the right strip
  has no extra top trigger or drawer chrome, is the only visible compact
  affordance while the drawer is closed, and is not rendered simultaneously
  with the drawer.

## Validation Contract

Durable component and browser coverage must verify:

1. the right-tool tab row has one rendered row and horizontal overflow rather than wrapping;
2. the original active underline and panel-toggle affordance remain present;
3. no edge fade, directional chevron, floating scroll button, or overflow-indicator layer appears at the initial, middle, or terminal scroll position;
4. clicking or keyboard-focusing an offscreen tab brings it into view;
5. all current tabs remain reachable in both docked and drawer presentations even when the initial viewport cannot show them all;
6. canonical order remains stable while scrolling and across presentation changes;
7. wide desktop spacing and typography remain materially unchanged;
8. no assertion requires every tab to fit inside the initial visible bounds.
9. the consuming and overlay right strips retain the personal-branch icon
   inventory and do not render a top `Tools` trigger, visible drawer title,
   separate close `X`, duplicate panel toggle, or simultaneous strip-plus-
   drawer state.
