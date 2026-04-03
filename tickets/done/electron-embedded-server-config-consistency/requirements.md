# Requirements

- Ticket: `electron-embedded-server-config-consistency`
- Status: `Design-ready`

## User Intent

Make the embedded Electron server configuration consistent and stable:

- Stop using detected LAN IPs as the default Electron `AUTOBYTEUS_SERVER_HOST`.
- Keep Electron defaults stable across network changes.
- Use a single local canonical base URL for the embedded Electron server.
- Reduce duplicated embedded host/port/base-url constants across Electron and renderer code.
- Remove the remaining inconsistency where the startup-owned server host still appears as a normal mutable server setting.
- Preserve the existing multi-node behavior where the same frontend can connect to additional Docker-backed or remote nodes without the settings screen breaking.
- Assume the product invariant that connected remote nodes run the same console-server version as the Electron-side server.

## Acceptance Criteria

1. Electron launcher defaults use a stable loopback base URL instead of a detected LAN IP.
2. Embedded Electron host/port/base-url defaults come from one shared source of truth.
3. Existing Electron runtime call sites that depend on the embedded local URL are updated to use the shared source of truth.
4. First-run Electron app-data `.env` generation uses the same embedded default as the runtime launcher.
5. No Docker-specific host routing behavior is introduced into the Electron embedded default path.
6. `AUTOBYTEUS_SERVER_HOST` is treated as a startup-owned system-managed setting rather than a normal editable server setting.
7. Backend server-settings APIs expose whether a setting is editable/deletable so the UI contract matches backend ownership.
8. The advanced server-settings UI no longer offers edit/delete actions for system-managed settings such as `AUTOBYTEUS_SERVER_HOST`.
9. The server-settings surface continues to load and operate when the frontend is connected to another node, including Docker-backed remote nodes added through the node manager.
10. This ticket does not need mixed-version frontend/server settings fallback, because connected nodes are required to run the same console-server version.

## Notes

- Binding behavior is out of scope unless required to preserve consistency with the embedded local URL defaults.
- The target local canonical URL for Electron should be `http://127.0.0.1:29695`.
- This cleanup should stay in the same ticket and worktree; no follow-up ticket should be created.
- Remote-node compatibility is in scope for the server-settings surface because the same frontend is used against embedded and added nodes.
- Mixed-version remote-node compatibility is not in scope for this ticket because the user confirmed same-version deployment is a product requirement.

## In-Scope Files

- `autobyteus-web/electron/server/*ServerManager.ts`
- `autobyteus-web/electron/server/baseServerManager.ts`
- `autobyteus-web/electron/server/services/AppDataService.ts`
- `autobyteus-web/electron/main.ts`
- `autobyteus-web/electron/nodeRegistryStore.ts`
- `autobyteus-web/utils/serverConfig.ts`
- `autobyteus-web/stores/nodeStore.ts`
- `autobyteus-web/stores/windowNodeContextStore.ts`
- `autobyteus-web/nuxt.config.ts`
- `autobyteus-server-ts/src/services/server-settings-service.ts`
- `autobyteus-server-ts/src/api/graphql/types/server-settings.ts`
- `autobyteus-web/graphql/queries/server_settings_queries.ts`
- `autobyteus-web/stores/serverSettings.ts`
- `autobyteus-web/components/settings/ServerSettingsManager.vue`
- `autobyteus-web/pages/settings.vue`

## Out-of-Scope

- Network bind host policy changes for the embedded backend listener.
- Docker-side runtime routing changes.
- Broader redesign of server-generated absolute URL behavior outside the Electron embedded default path.
