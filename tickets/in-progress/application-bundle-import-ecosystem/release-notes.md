# Release Notes

## What's New

- Applications now reconnect through backend-owned application sessions, so `/applications/[id]` can rebind to the correct live session after relaunch or refresh.
- Application pages now expose both an `Application` view for the bundled iframe UI and a native `Execution` view for retained delivery/member state.
- Bundled applications now receive transport metadata for GraphQL, REST, GraphQL WebSocket, and application-session snapshot streaming during iframe bootstrap.

## Improvements

- Built-in and imported applications continue to share one generic catalog/import model, but now run on a backend-authoritative application-session boundary.
- Application launches inherit persisted `defaultLaunchConfig` values from embedded agent definitions, including team member defaults and overrides.
- Embedded application-owned agents and teams remain visible in the native Agents and Agent Teams screens with owning application/package provenance for testing and editing.

## Fixes

- `publish_application_event` v1 now rejects unsupported publication families, disallowed family fields, and `metadata` escape hatches before retained application state changes.
- Delivery state, member artifacts, and member progress now retain independently instead of overwriting one another in a collapsed latest-publication view.
- Package import/remove still refreshes Applications, Agents, and Agent Teams together in the same session instead of leaving stale catalog data until manual reload.
- Bundled application assets and iframe bootstrap remain compatible with packaged Electron `file://` hosts by resolving assets from the bound backend REST base and using the topology-aware iframe contract.
