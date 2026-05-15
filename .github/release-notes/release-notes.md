## Improvements
- Memory compaction now inherits blank compactor runtime/model fields from the agent run that triggered compaction, so the default built-in compactor can run without a separate runtime/model assignment.
- Settings and memory design documentation now explain when compactor runtime/model values are inherited and when explicit compactor settings override the parent.

## Fixes
- Fixed required compaction failing before creating the visible compactor run when the selected compactor agent has no default launch configuration.
- Preserved clear compaction failures when no compactor is selected, or when a required runtime/model field is missing from both the selected compactor and parent fallback context.
