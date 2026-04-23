## What's New
- Hosted applications now use a shared framework startup boundary before app-specific UI takes over.

## Improvements
- Direct application bundle URLs now show a clear AutoByteus-owned unsupported-entry experience instead of inconsistent app-authored placeholder screens.
- Brief Studio and Socratic Math Teacher now hand off to their real business UI only after valid AutoByteus bootstrap completes.
- Hosted Brief Studio now completes its real Applications-route draft flow through review-ready and approval instead of stalling before the business handoff finishes.
- Immersive Host Controls now keep the Configure panel readable in a true side-panel layout, with resize behavior that stays usable across the reviewed desktop width range.

## Fixes
- Startup failures that happen after bootstrap delivery now stay inside a framework-owned error surface instead of leaking partial app UI.
- Reload application and Exit application now stay pinned in the immersive Host Controls footer instead of disappearing during Configure-panel scrolling.
