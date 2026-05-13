# Implementation Plan: Team Communication Panel Gap

## Solution Sketch (Design Basis)
This is a small UI change to remove a visual gap.

**Current State**:
In `TeamCommunicationPanel.vue`, the `<aside>` container has `py-2` and the inner `<section>` has `py-1`. This creates 12px of padding at the top, pushing the first message's selection highlight down and leaving a white gap between it and the "Messages" header.

**Target State**:
Change `py-2` to `pb-2` on the `<aside>` container.
Change `py-1` to `pb-1` on the `<section>` container.
This removes the top padding while preserving the bottom padding, ensuring the selection highlight sits flush with the header border.

### Affected Files
- `autobyteus-web/components/workspace/team/TeamCommunicationPanel.vue` (Modify)

## Execution Tracking
- [x] Modify `TeamCommunicationPanel.vue`
- [x] Verify visually (no white gap)
