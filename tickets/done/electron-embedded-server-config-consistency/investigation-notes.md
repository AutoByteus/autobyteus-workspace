# Investigation Notes

- Ticket: `electron-embedded-server-config-consistency`
- Date: `2026-03-31`
- Scope: `Small`

## User Problem

The embedded Electron app currently derives `AUTOBYTEUS_SERVER_HOST` from the machine's detected LAN IP. That value is then used by the backend when generating absolute media/file URLs. After network changes, those generated URLs can become stale even though the embedded server remains local to the same machine.

## Observations

1. Electron launcher code was setting `AUTOBYTEUS_SERVER_HOST` from a detected local IP in the platform server managers.
2. Renderer-side embedded-node access was already using stable local addresses rather than the detected LAN IP.
3. Electron first-run `.env` generation still defaulted to `http://localhost:<port>`, which is a different embedded default from the updated launcher behavior.
4. Embedded host/port/base-url defaults were duplicated across:
   - Electron main process bootstrap
   - Electron node registry
   - renderer stores
   - runtime config setup
   - first-run app-data `.env` generation
5. The first implementation pass introduced `autobyteus-web/shared/embeddedServerConfig.ts`, but Electron imports from that project-root shared path widened the Electron TypeScript emit root. Independent review showed `pnpm exec tsc -p electron/tsconfig.json --listEmittedFiles` emitted `dist/electron/electron/main.js` instead of the packaged `dist/electron/main.js`, which breaks the existing packaging/build contract.
6. `AUTOBYTEUS_SERVER_HOST` is still exposed through the generic server-settings API/UI as a regular mutable value even though the backend description already says it is mandatory and set at startup.
7. The advanced settings UI only knows whether a setting can be deleted by inferring from the description string; it has no first-class editability/deletability contract from the backend.
8. The settings surface is not embedded-only. `pages/settings.vue` keeps `server-settings` as a normal settings section, and `ServerSettingsManager.vue` fetches server settings on mount while only the diagnostics subpanel is gated to embedded windows.
9. That means the widened `GET_SERVER_SETTINGS` GraphQL query also applies when the frontend is pointed at added remote nodes, including Docker-backed nodes.
10. The user clarified that connected remote nodes are required to run the same console-server version as the Electron-side server, so mixed-version fallback is not part of the product contract for this ticket.

## Design Direction

- Keep the embedded Electron default URL stable and loopback-based.
- Use one shared source of truth for:
  - embedded host
  - embedded port
  - embedded base URL
- Update Electron and renderer call sites to consume those shared values instead of repeating literals.
- Preserve the current Electron packaging contract by making the Electron transpile boundary explicit:
  - `main.js` and `preload.js` must still emit under `dist/electron/`
  - shared embedded config may emit under `dist/shared/`
  - importing a project-root shared file must not silently relocate Electron entrypoints under an extra nested folder
- Remove dead imports or compile-boundary drift introduced by the failed first pass.
- Treat startup-owned server settings as system-managed rather than user-editable configuration:
  - `AUTOBYTEUS_SERVER_HOST` should be non-editable and non-deletable
  - server-settings API responses should carry explicit mutability flags
  - the advanced settings UI should render system-managed settings read-only and hide save/delete actions
- Preserve remote-node compatibility for the same settings surface under the same-version deployment invariant:
  - the settings screen must continue to work for connected remote nodes
  - no extra mixed-version fallback path is required in this ticket

## Non-Goals

- Do not redesign Docker host routing in this ticket.
- Do not change bind-host behavior unless required by the consistency cleanup.
- Do not move the packaged Electron entrypoint contract to a new nested output path just to accommodate the shared config import.
