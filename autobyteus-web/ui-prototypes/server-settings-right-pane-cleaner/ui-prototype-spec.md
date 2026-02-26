# Server Settings Right Pane Cleaner (Web)

## Goal
Redesign the right content pane of Settings > Server Settings > Basics so the layout is visually cleaner, more scannable, and easier to edit without confusion.

## Scope
- In scope: Right pane content hierarchy, card structure, alignment, spacing, action placement, and visual grouping.
- Out of scope: Left navigation rail, backend behavior, validation logic, and setting semantics.

## Platform And Viewport
- Platform: web desktop
- Viewport: 1600x960 reference
- Aspect ratio: 16:9
- Fidelity: high

## User Intent
- Quickly scan all provider sections.
- Understand where to edit endpoint rows.
- See unsaved state clearly.
- Save per provider confidently.

## Visual Direction
- Light neutral background for page context.
- Separate cards per provider (instead of one long undifferentiated container).
- Strong section header hierarchy: title, short helper text, endpoint count badge, save action.
- Grid-aligned row inputs with stable column widths.
- Clear secondary action for “Add endpoint”.
- Inline validation/unsaved messaging at row footer.

## Accessibility And Usability Constraints
- Keep label-to-input proximity high.
- Ensure visible focus outlines and clear affordances.
- Preserve sufficient contrast for body and helper text.
- Keep row actions consistent across all providers.

## Primary Flow
1. User lands on Basics tab.
2. User scans provider cards top-down.
3. User edits host/port/protocol rows in one card.
4. User sees unsaved status and saves that card.

## Acceptance Summary
- Right pane reads as distinct, organized cards.
- No visual ambiguity about which Save button applies to which provider.
- Endpoint rows align consistently and are easier to parse.
