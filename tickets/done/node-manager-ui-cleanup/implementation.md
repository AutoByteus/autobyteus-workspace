# Implementation Plan — Node Manager UI Cleanup

Status: Baseline Approved
Scope: Small

## Solution Sketch
1. Update `DockerNodeStartGuideCard.vue` styling so the guide is a calm white card with subtle blue accenting instead of a large saturated blue panel.
2. Replace command `pre` blocks from near-black backgrounds to light slate command surfaces with borders, readable monospaced text, and horizontal overflow.
3. Make direct command cards compact and responsive, allowing wider screens to use a denser but lighter grid.
4. Update `NodeManager.vue` page chrome to use a soft slate page background, a contained max-width content column, card shadows, better header separation, and cleaner form/list card styling.
5. Update `RemoteBrowserSharingPanel.vue` to match the new card language and remove the dark primary button.

## Non-Goals
- No command text changes.
- No node registry, sync, pairing, or Electron/backend behavior changes.
- No new localization copy unless required by implementation.

## Implementation Tracking
| Task | File | Status |
| --- | --- | --- |
| Restyle Docker start guide and command cards | `autobyteus-web/components/settings/DockerNodeStartGuideCard.vue` | Completed |
| Restyle Node Manager layout/cards | `autobyteus-web/components/settings/NodeManager.vue` | Completed |
| Align remote browser sharing card | `autobyteus-web/components/settings/RemoteBrowserSharingPanel.vue` | Completed |
| Run tests/build and browser verification | frontend validation | Completed |
