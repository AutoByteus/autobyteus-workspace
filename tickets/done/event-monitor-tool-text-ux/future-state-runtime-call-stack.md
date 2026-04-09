# Future-State Runtime Call Stack

- Ticket: `event-monitor-tool-text-ux`
- Stage: `4`
- Last Updated: `2026-04-09`

## Scope

- `UC-001`: render long command summary in the center conversation feed
- `UC-002`: reveal more of that summary when horizontal space increases
- `UC-003`: continue using Activity cards as the drill-down surface for nested tool details

## Spine Inventory

- `DS-001` `Primary End-to-End`
  - Tool stream/activity payload
  - Shared tool summary extraction boundary
  - `ToolCallIndicator.vue`
  - User-visible center event row

## Future-State Call Stack

### `UC-001` / `UC-002` Center Event Row

1. Streaming/tool lifecycle code writes tool arguments and context into the conversation segment and activity store.
2. `TerminalCommandSegment.vue` or `ToolCallSegment.vue` passes tool name, invocation id, and arguments into `ToolCallIndicator.vue`.
3. `ToolCallIndicator.vue` calls the shared summary helper.
4. The shared summary helper redacts secrets and returns the full command/path summary text rather than a fixed-length clipped string.
5. `ToolCallIndicator.vue` renders that summary inside a `min-w-0` / `flex-1` text container.
6. CSS truncation responds to the actual available width, so widening the center panel reveals more of the summary without changing data.

### `UC-003` Activity Card Detail Surface

1. `ActivityItem.vue` continues to render the original header with tool name, short id, and status chip.
2. Detailed tool context remains inside the existing expandable `Arguments` and `Result` sections.
3. No duplicate command/path preview is added to the header.

## Boundary Notes

- The helper is a presentation utility only. It does not change store state or backend payload shape.
- Existing click-to-Activity navigation and approval actions remain owned by `ToolCallIndicator.vue`.
- Existing Activity expand/collapse sections remain owned by `ActivityItem.vue`.

## Design-Risk Sweep

- Risk: command previews could become too visually heavy.
  - Control: keep the Activity panel unchanged and focus the fix on the center row.
- Risk: flexbox changes could accidentally disturb status/action controls.
  - Control: keep status chips and action controls in explicit `flex-shrink-0` containers and cover behavior with component tests.
