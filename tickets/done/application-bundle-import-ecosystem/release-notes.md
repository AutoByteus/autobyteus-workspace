# Release Notes

## What's New

- Applications availability is now a backend-owned runtime capability per bound node, with a first-class Settings toggle instead of a packaged frontend build flag.
- Applications now reconnect through backend-owned application sessions, so `/applications/[id]` can rebind to the correct live session after relaunch or refresh.
- Application pages now expose both an `Application` view for the bundled iframe UI and a native `Execution` view for retained delivery/member state.
- Bundled applications now receive transport metadata for GraphQL, REST, GraphQL WebSocket, and application-session snapshot streaming during iframe bootstrap.

## Improvements

- The sidebar, `/applications` route guard, and application catalog now all follow the same runtime Applications capability for the current bound node, so different windows can reflect different nodes correctly without rebuild.
- The Applications catalog store now discards late old-node responses after a node switch instead of repopulating stale entries from the previous node.
- Built-in and imported applications continue to share one generic catalog/import model, but now run on a backend-authoritative application-session boundary.
- Application launches inherit persisted `defaultLaunchConfig` values from embedded agent definitions, including team member defaults and overrides.
- Embedded application-owned agents and teams remain visible in the native Agents and Agent Teams screens with owning application/package provenance for testing and editing.

## Fixes

- Nodes that already had discoverable applications now seed `ENABLE_APPLICATIONS=true` automatically on first runtime-capability initialization, avoiding a manual post-upgrade re-enable step.
- `publish_application_event` v1 now rejects unsupported publication families, disallowed family fields, and `metadata` escape hatches before retained application state changes.
- Delivery state, member artifacts, and member progress now retain independently instead of overwriting one another in a collapsed latest-publication view.
- Package import/remove still refreshes Applications, Agents, and Agent Teams together in the same session instead of leaving stale catalog data until manual reload.
- Bundled application assets and iframe bootstrap remain compatible with packaged Electron `file://` hosts by resolving assets from the bound backend REST base and using the topology-aware iframe contract.
