# Investigation Notes

- Ticket: `event-monitor-tool-text-ux`
- Stage: `1`
- Last Updated: `2026-04-09`
- Scope Triage: `Small`

## Problem Surface

The user reported that tool-related text in the event monitor feels fixed-width and does not reveal more content when the right-side Activity panel is collapsed. The screenshots show this most clearly on `run_bash` rows in the center conversation feed. The right-side Activity cards were initially explored as part of the same UX area, but the user later clarified that those cards should keep their original style because `Arguments` already serves as the detail surface.

## Files Investigated

- `autobyteus-web/components/conversation/ToolCallIndicator.vue`
- `autobyteus-web/components/progress/ActivityItem.vue`
- `autobyteus-web/components/progress/ActivityFeed.vue`
- `autobyteus-web/components/conversation/segments/TerminalCommandSegment.vue`
- `autobyteus-web/components/conversation/__tests__/ToolCallIndicator.spec.ts`
- `autobyteus-web/components/progress/__tests__/ActivityItem.spec.ts`
- `autobyteus-web/stores/agentActivityStore.ts`
- `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts`
- `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts`

## Confirmed Findings

1. `ToolCallIndicator.vue` currently hard-truncates command text in JavaScript with `truncateText(redactSecrets(command), 56)`.
   - Result: the DOM never contains more than the first 56 characters, so a wider layout cannot reveal additional command text after the Activity sidebar is collapsed.

2. Both `ToolCallIndicator.vue` and `ActivityItem.vue` use flex layouts that can benefit from stronger `min-w-0` / `flex-1` constraints around text containers.
   - Result: narrow widths can make context text feel squeezed or visually absent even when data exists.

3. `ActivityItem.vue` intentionally keeps detailed tool context behind nested sections such as `Arguments` and `Result`.
   - Result: any change there should be treated as optional UX exploration rather than a required part of the fix.

4. The activity store already carries enough information to build better previews.
   - `arguments` and `contextText` are available on tool activities.
   - `TerminalCommandSegment.vue` already ensures `command` is present in the displayed args when available.

## Root Cause Assessment

- Primary cause: fixed JavaScript truncation in the center feed prevents responsive growth.
- Secondary cause: the center-row text container underuses available width because the summary is clipped before layout can help.
- Product decision: the right-side Activity panel should remain a drill-down surface rather than duplicate command text in the header.

## Scope Decision

This remains a `Small` scope fix because the issue is localized to summary extraction and header layout in the center feed, with a small shared utility and targeted tests likely sufficient.

## Recommended Direction

- Replace the hard-coded inline truncation with a shared summary helper that returns full redacted text and lets CSS handle width-based truncation.
- Tighten flexbox sizing in the center tool row so summaries can actually claim available width.
- Keep the Activity-card header unchanged and rely on existing `Arguments` / `Result` expansion for details.
- Add targeted tests for:
  - summary extraction behavior,
  - center feed command rendering,
  - unchanged Activity card behavior in the same UI area.
