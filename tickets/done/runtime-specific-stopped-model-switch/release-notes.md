# Release Notes — v1.4.82

## What's New
- **More choices for stopped external-runtime runs.** In stopped Agent, Team and Agent Org Settings, you can select any distinct model currently offered by that run's Claude Agent SDK, Codex App Server or Antigravity CLI runtime without AutoByteus blocking it based on context-window size. AutoByteus's own verified non-decreasing capacity rule is unchanged.
- **Agent Orgs in Memory.** Browse stored Org runs and their members from the new Agent Orgs memory tab, including delegated task members with memory.

## Improvements
- **Faster team and org memory browsing.** Memory lists and member views load promptly, show a loading state during navigation and keep the selected run/member context stable. Newly imported memory sources appear when returning to Memory home.
- **Clearer model selection.** A redundant Claude `default` alias is hidden from new choices only when it is proven to refer to another listed model. Distinct model variants remain selectable. Existing saved `default` selections stay visible and keep their settings without being silently changed to the recommended model.

## Fixes
- Saved Application Agent and Team Launch Setup reopens with its selected resource/model/settings instead of showing a blank or error page.
- A delegated task memory entry opens its own memory, and Team member labels display correctly.

## Notes
- A model offered for an external runtime may still be rejected by that provider when continuing an existing conversation; AutoByteus preserves the saved history and surfaces the failure rather than silently resetting it.
- Imported Memory Sync sources do not yet include Org memory, so their Agent Orgs tab may be empty.
