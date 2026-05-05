# Implementation Plan

## Solution Sketch

- Replace the component-side sent/received `sections` computed value with a single `displayMessages` computed value.
- Render all rows from `displayMessages` in one list.
- Use `displayMessages` for the empty/default-selection watcher so the newest message is selected by default.
- Extend the component spec to assert row order and default detail content for mixed sent/received messages.

## Execution Tracking

- [x] Update TeamCommunicationPanel rendering.
- [x] Update focused component test coverage.
- [x] Run targeted Vitest validation.

## Implementation Summary

- `TeamCommunicationPanel.vue` now renders one `displayMessages` list instead of re-splitting messages into sent and received groups.
- Default selection now uses `displayMessages[0]`, so the newest message opens first.
- `TeamCommunicationPanel.spec.ts` asserts mixed-direction rows render newest first and verifies the older row can still be selected for detail content.
