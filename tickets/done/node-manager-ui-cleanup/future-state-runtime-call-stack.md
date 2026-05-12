# Future-State Runtime Call Stack — Node Manager UI Cleanup

Status: Current

## Render Spine
1. User opens Settings with `section=nodes`.
2. `pages/settings.vue` sets `activeSection = 'nodes'` and renders `NodeManager`.
3. `NodeManager.vue` renders contained page shell and management cards:
   - current window node summary
   - remote browser sharing panel
   - Docker node start guide
   - add remote node form
   - full sync form
   - configured nodes list
4. `DockerNodeStartGuideCard.vue` builds launcher commands from `buildDockerNodeLauncherCommands()` and renders light command cards.
5. Copy buttons still call `navigator.clipboard.writeText(command)` and preserve existing copied/error feedback.

## Interaction Spine Preservation
- Add node flow remains `onAddRemoteNode -> validateServerHostConfiguration -> probeNodeCapabilities -> nodeStore.addRemoteNode -> optional nodeSyncStore.runBootstrapSync`.
- Full sync flow remains `onRunFullSync -> nodeSyncStore.runFullSync`.
- Remote browser sharing panel still delegates to `remoteBrowserSharingStore`.
- Configured node open/rename/remove controls still call their existing handlers.

## Boundary Check
- Styling changes remain in Vue component templates/render classes.
- No store, GraphQL, Electron IPC, or utility boundary changes.
