# Requirements: Nested Team View Return Navigation

Status: Verified
Date: 2026-05-18

## User Intent

Improve Agent Team detail member actions so nested agent-team members behave consistently with shared agent members and preserve the originating parent-team navigation context.

## Acceptance Criteria

- Shared agent members and nested agent-team members both use the compact `View ↗` action label.
- Team-local expandable agent members keep the existing `Details ▾` / `Hide ▴` inline details behavior.
- Opening a nested team from a parent Agent Team detail page carries the parent team id as return context.
- The nested team detail back action returns to the originating parent team instead of the Agent Teams list.
- Existing unresolved nested-team behavior remains safe: no broken view action is shown when the child team cannot be resolved.
