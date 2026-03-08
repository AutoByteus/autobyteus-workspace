# Handoff

- Ticket: `right-panel-scroll-decoupling`
- Last Updated: `2026-03-08`
- Status: `Implemented and verified; awaiting user validation`

## Outcome

The center-pane snap/jump path is fixed by removing outer-shell scroll ownership from both the center workspace shell and the shared right-tab shell, then constraining activity highlight scrolling to the activity feed container itself.

## Why The Bug Happened

The app had multiple competing scroll owners:

- the center desktop shell could scroll,
- the transcript feed could scroll,
- the shared right-tab shell could scroll,
- the activity feed could scroll.

When a center tool-call card triggered activity highlighting, the right side attempted to reveal the target item and the browser was free to move outer scrollable ancestors. At the same time, if the user had previously scrolled the wrong center ancestor, the transcript auto-scroll logic could misread the user as still pinned to bottom. That combination is what produced the visible middle-pane jump.

## Verification

- Targeted Vitest regression suite passed: `4` files, `10` tests.
- New regression coverage now asserts:
  - clipped center shell,
  - clipped shared right-tab shell,
  - feed-local highlighted activity scrolling,
  - preserved transcript auto-scroll semantics.
