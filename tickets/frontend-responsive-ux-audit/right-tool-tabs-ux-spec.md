# Right-Tool Tabs UX Specification

## Status

- Status: Refined for architecture re-review
- Approval applicability: Intended user-visible behavior; approval required
- Related requirements: FR-013, FR-016, FR-017, FR-018, FR-019, FR-020
- Related acceptance criteria: AC-012, AC-016, AC-017, AC-018, AC-019, AC-020, AC-021
- Related design spine: DS-002
- Related shell UX supplement: workspace-responsive-ui-ux-spec.md

## Purpose and Scope

This supplement defines the intended interaction and visual behavior of the right-tool tab header in standard /workspace. It applies to the right-tool tabs when rendered in both docked desktop panels and constrained/narrow drawers. It does not redesign the phone/PWA /mobile shell or the content inside Terminal, Browser, VNC, Files, or other tool panels.

The original product design is a single horizontal tab row. When the available width cannot show every tab, the row remains a single row and becomes horizontally scrollable. Overflow is a discoverability and reachability concern, not a reason to wrap the header into multiple rows.

## Visual Contract

- Keep the right-tool tabs in one horizontal row in every standard workspace presentation.
- Do not wrap tabs into a second row.
- Preserve the original personal-branch tab spacing and typography (including its normal `text-base`/`px-5 py-3` visual scale), active blue underline, hover treatment, and fixed panel-toggle affordance. Do not apply a new compact density merely because the header is rendered in an adaptive layout; only a documented narrow drawer state may use a separate density treatment.
- The tab row may use clipped or visually hidden native scrollbars, but it must remain a real horizontally scrollable container.
- Scroll affordances are visually lightweight and must not compete with the tab labels or panel-toggle control.

## Interaction Contract

### Horizontal scrolling

Horizontal scrolling is the primary interaction for overflow. It must work with:

- mouse wheel or shift-wheel where the browser/platform provides horizontal scrolling;
- touchpad horizontal gestures;
- touch drag/swipe;
- keyboard focus and keyboard scrolling.

The tab buttons remain individually focusable. Keyboard focus must not be trapped by the affordance controls, and selecting or focusing a tab must not require the user to discover a separate menu.

### Overflow discoverability

When hidden tab content exists:

- show a subtle edge fade on the edge toward the undisclosed tabs;
- show a small directional chevron near that edge;
- at the initial left scroll position, the primary chevron points right;
- after the row is scrolled right, the primary chevron points left so the user can return;
- when undisclosed content remains in both directions, the corresponding edge indicators may both be shown, but they remain small and low-contrast;
- hide fades and chevrons at the corresponding scroll boundary.

Clicking a chevron scrolls the tab row by approximately one visible tab-list page while preserving the native scroll container as the primary mechanism. The chevron is an accelerator, not a separate navigation model.

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

## Ownership and Component Boundaries

- RightSideTabs owns the right-tool presentation configuration, fixed panel-toggle placement, active-tab context, and whether overflow affordances are enabled for this header.
- TabList owns the single-row scroll container, scroll metrics, active/focused-tab auto-scroll, and lightweight edge affordance rendering for the configured tab row.
- Tab owns tab typography, spacing, focus treatment, hover treatment, and active underline. It does not calculate container overflow.
- The workspace surface-order catalog remains the only source of tab ordering. Scroll affordances must not duplicate or reorder that catalog.
- The generic tab-list API must not expose a right-tool-specific wrapped mode. If another product surface requires a different layout, it must make that responsibility explicit without enabling wrapping in this right-tool header.

## Accessibility and Semantics

- The tab row keeps tab semantics and a usable keyboard focus order.
- Chevron controls have accessible labels describing the direction of additional tabs.
- Edge fades are decorative and must not be the only overflow signal.
- Reduced-motion preferences must disable or shorten animated chevron/scroll transitions without disabling reachability.
- The panel-toggle control remains independently reachable and must not scroll out of the fixed header action area.

## Validation Contract

Durable component and browser coverage must verify:

1. the right-tool tab row has one rendered row and horizontal overflow rather than wrapping;
2. the original active underline and panel-toggle affordance remain present;
3. overflow indicators appear only when additional tabs exist and update after scrolling;
4. clicking or keyboard-focusing an offscreen tab brings it into view;
5. all current tabs remain reachable in both docked and drawer presentations even when the initial viewport cannot show them all;
6. canonical order remains stable while scrolling and across presentation changes;
7. wide desktop spacing and typography remain materially unchanged;
8. no assertion requires every tab to fit inside the initial visible bounds.
