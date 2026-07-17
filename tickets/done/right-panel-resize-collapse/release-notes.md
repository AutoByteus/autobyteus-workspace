## What's New
- Preserved a user-sized right workspace panel as docked after left navigation is collapsed whenever the compact layout still fits.

## Improvements
- Kept responsive strip/drawer fallback for genuinely constrained widths while preserving explicit right-panel redocking behavior.
- Standardized left and right transient drawer scrims to a lighter approximately 30% black overlay so workspace context remains recognizable.

## Fixes
- Fixed the left-collapse plus right-resize path from opening an unnecessary right tools strip and drawer when a compact dock still fits.
- Preserved drawer dismissal, Escape handling, focus trapping/return, z-order, and opposite-strip hit-target behavior.
