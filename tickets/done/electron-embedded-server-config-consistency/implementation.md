# Implementation

- Ticket: `electron-embedded-server-config-consistency`
- Scope: `Small`

## Solution Sketch

Create one shared embedded-server config module under `autobyteus-web/` that exports:

- embedded host
- embedded port
- embedded HTTP base URL
- embedded WebSocket base URL

Then update the Electron and renderer layers to consume that module instead of repeating literals, while explicitly preserving the Electron transpile/packaging contract:

- Electron transpile must still emit `dist/electron/main.js` and `dist/electron/preload.js`
- Shared embedded config may emit into a separate shared output path without changing the packaged main entrypoint

Then close the remaining ownership mismatch in server settings:

- treat `AUTOBYTEUS_SERVER_HOST` as a startup-owned system-managed setting
- expose server-setting mutability (`isEditable`, `isDeletable`) from the backend contract
- make the advanced settings UI render system-managed settings truthfully as read-only/non-removable
- preserve the existing remote-node settings flow under the same-version deployment invariant

## Planned Source Changes

1. Add shared embedded-server config file.
2. Update Electron launcher defaults to use the shared base URL.
3. Update renderer/server config helpers to use the shared constants.
4. Update Electron node registry and window-context defaults to use the shared base URL.
5. Update first-run app-data `.env` generation to use the same embedded default.
6. Explicitly fix the Electron TypeScript transpile boundary so project-root shared imports do not relocate the packaged Electron entrypoint.
7. Remove dead imports left behind by the first implementation pass.
8. Extend the server-settings backend contract to describe mutability for each returned setting.
9. Mark `AUTOBYTEUS_SERVER_HOST` as non-editable and non-deletable in the backend service.
10. Update the advanced server-settings UI/store/query contract to respect system-managed setting metadata.
11. Ensure predefined settings are listed from the effective runtime value, not only the persisted `.env` snapshot.
12. Keep the server-settings frontend contract valid for connected same-version remote nodes without introducing a mixed-version fallback layer that the product does not require.

## Expected Outcome

- One canonical embedded Electron local URL: `http://127.0.0.1:29695`
- No LAN-IP discovery in Electron default public URL generation
- No mismatch between runtime launcher defaults and first-run generated `.env`
- No break in the existing Electron build/package expectation that the desktop entrypoint is `dist/electron/main.js`
- No remaining UI/API claim that `AUTOBYTEUS_SERVER_HOST` is a normal editable user setting
- No regression for remote-node settings windows that connect to same-version Docker-backed servers through the same frontend

## Reopened Design Direction

The additional independent review confirmed that the server-settings screen is shared across embedded and remote nodes. That means the frontend cannot assume every connected node already exposes `isEditable` / `isDeletable`.

The clean design response is:

1. Keep the backend mutability contract as the source of truth for current servers.
2. Keep the shared server-settings query/store/UI path unchanged for connected nodes because the user clarified that all connected nodes are required to run the same console-server version.
3. Record that same-version invariant explicitly in the ticket artifacts so future review rounds do not mistake mixed-version support for an implicit requirement.
4. Do not add a mixed-version fallback layer that the product contract does not require.

The key design constraint is that the server-settings contract remains one backend-owned shape across embedded and connected nodes, while the deployment invariant guarantees version alignment.

## Completed Source Changes

1. Added `autobyteus-web/shared/embeddedServerConfig.ts` as the shared source of truth for:
   - embedded host
   - embedded port
   - embedded HTTP base URL
   - embedded WebSocket base URL
2. Updated Electron launcher/runtime code to use the shared base URL:
   - `autobyteus-web/electron/server/baseServerManager.ts`
   - `autobyteus-web/electron/server/linuxServerManager.ts`
   - `autobyteus-web/electron/server/macOSServerManager.ts`
   - `autobyteus-web/electron/server/windowsServerManager.ts`
   - `autobyteus-web/electron/main.ts`
3. Updated renderer/bootstrap defaults to use the shared embedded base URL:
   - `autobyteus-web/utils/serverConfig.ts`
   - `autobyteus-web/stores/nodeStore.ts`
   - `autobyteus-web/stores/windowNodeContextStore.ts`
   - `autobyteus-web/nuxt.config.ts`
4. Updated Electron node-registry behavior to normalize the embedded node to the canonical loopback URL even when an older persisted registry entry exists.
5. Updated first-run app-data `.env` generation to default `AUTOBYTEUS_SERVER_HOST` to `http://127.0.0.1:29695`.
6. Removed the obsolete Electron LAN-IP helper:
   - deleted `autobyteus-web/electron/utils/networkUtils.ts`
   - deleted `autobyteus-web/electron/utils/__tests__/networkUtils.spec.ts`
7. Explicitly fixed the Electron transpile boundary in `autobyteus-web/electron/tsconfig.json` so:
   - `dist/electron/main.js` remains the packaged entrypoint
   - `dist/electron/preload.js` remains the packaged preload
   - `dist/shared/embeddedServerConfig.js` is emitted as a shared support artifact
8. Removed the dead `INTERNAL_SERVER_PORT` import from `autobyteus-web/electron/main.ts`.
9. Extended the backend server-settings contract so each returned setting now carries:
   - `isEditable`
   - `isDeletable`
10. Marked `AUTOBYTEUS_SERVER_HOST` as a startup-owned system-managed setting in:
   - `autobyteus-server-ts/src/services/server-settings-service.ts`
   - `autobyteus-server-ts/src/api/graphql/types/server-settings.ts`
11. Updated the backend settings listing logic so predefined settings use their effective runtime value, which keeps launch-environment overrides visible even when they differ from the parsed `.env` file snapshot.
12. Updated the advanced settings query/store/UI contract to respect backend-owned mutability metadata in:
   - `autobyteus-web/graphql/queries/server_settings_queries.ts`
   - `autobyteus-web/stores/serverSettings.ts`
   - `autobyteus-web/components/settings/ServerSettingsManager.vue`
13. Added focused backend, GraphQL, store, and component coverage for the system-managed setting contract:
   - `autobyteus-server-ts/tests/unit/services/server-settings-service.test.ts`
   - `autobyteus-server-ts/tests/unit/services/server-settings-service.test.js`
   - `autobyteus-server-ts/tests/unit/api/graphql/types/server-settings.test.ts`
   - `autobyteus-server-ts/tests/e2e/server-settings/server-settings-graphql.e2e.test.ts`
   - `autobyteus-web/tests/stores/serverSettingsStore.test.ts`
   - `autobyteus-web/components/settings/__tests__/ServerSettingsManager.spec.ts`
14. Removed the retained generic backend public-host fallback path so generic startup now relies on the documented explicit `AUTOBYTEUS_SERVER_HOST` contract:
   - removed `autobyteus-server-ts/src/utils/env-utils.ts`
   - removed `autobyteus-server-ts/src/utils/network-utils.ts`
   - removed their obsolete unit tests
   - updated `autobyteus-server-ts/src/app.ts` to stop synthesizing `AUTOBYTEUS_SERVER_HOST`
15. Consolidated the duplicated renderer embedded-node base-url resolver into:
   - `autobyteus-web/utils/embeddedNodeBaseUrl.ts`
   - updated `autobyteus-web/stores/nodeStore.ts`
   - updated `autobyteus-web/stores/windowNodeContextStore.ts`
16. Reduced the duplicated Electron node-registry contract by making:
   - `autobyteus-web/electron/nodeRegistryTypes.ts`
   - re-export the shared node-registry types from `autobyteus-web/types/node.ts`
   - updated `autobyteus-web/electron/tsconfig.json` so the Electron transpile boundary still declares that shared type dependency explicitly
17. Refreshed stale runtime/docs wording so the code and docs now agree about the fixed embedded Electron URL contract:
   - `autobyteus-web/README.md`
   - `autobyteus-web/utils/serverConfig.ts`
   - `autobyteus-server-ts/docs/URL_GENERATION_AND_ENV_STRATEGY.md`

## Re-Entry Work

1. Update `autobyteus-web/electron/tsconfig.json` so the Electron transpile boundary explicitly preserves `dist/electron/main.js` and `dist/electron/preload.js` while allowing project-root shared imports.
2. Remove the unused `INTERNAL_SERVER_PORT` import from `autobyteus-web/electron/main.ts`.
3. Re-run focused Electron transpile validation plus the earlier focused Vitest slices.

## Current Local-Fix Cleanup Plan

The latest cleanup review narrowed the remaining work to local consistency fixes inside the already-accepted design:

1. Remove the retained generic `AUTOBYTEUS_SERVER_HOST` LAN-IP fallback path from backend startup so the documented explicit startup contract is the only active path.
2. Refresh stale Electron README runtime docs that still describe dynamic port allocation and removed helpers.
3. Consolidate the duplicated renderer embedded-base-url resolver into one shared helper/module instead of repeating it in multiple stores.
4. Reduce obviously redundant type/helper structures only where the cleanup stays low-risk and does not blur the Electron/renderer ownership boundary.
5. Preserve messaging-gateway behavior while doing this cleanup.

The messaging-gateway regression audit already confirmed that:

- managed in-node messaging uses `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL`, not the Electron public URL default
- standalone gateway Docker uses explicit `GATEWAY_SERVER_BASE_URL`
- focused gateway/runtime-config tests passed after the Electron cleanup

So the remaining work is cleanup-only, not another design change.

## Execution Notes

- The shared embedded URL now stays stable even if the machine changes networks.
- The Electron main-process registry no longer reintroduces stale embedded node URLs from older saved snapshots.
- Long-lived packaging docs were updated to reflect the shared embedded config and the removal of LAN-IP discovery.
- Independent Stage 8 review found a packaging/build-contract issue in the first pass. The re-entry work above is required before the ticket can be accepted.
- The re-entry implementation preserves the original desktop packaging contract while keeping the shared config in a project-root shared boundary.
- The final cleanup keeps the same ticket scope small by reusing the existing server-settings surface instead of inventing a separate Electron-only settings path.
- The system-managed setting contract now matches the real runtime ownership: startup decides `AUTOBYTEUS_SERVER_HOST`, and the advanced settings UI reflects that ownership instead of pretending the value is user-editable.

## Stage 6 Validation Notes

- `git diff --check`
- `pnpm exec tsc -p electron/tsconfig.json --listEmittedFiles`
- `pnpm exec tsc -p electron/tsconfig.json --noEmit`
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/server-settings-service.test.ts tests/unit/api/graphql/types/server-settings.test.ts tests/e2e/server-settings/server-settings-graphql.e2e.test.ts`
- `pnpm -C autobyteus-web exec vitest run tests/stores/serverSettingsStore.test.ts components/settings/__tests__/ServerSettingsManager.spec.ts`
- `pnpm -C autobyteus-web exec vitest run stores/__tests__/nodeStore.spec.ts stores/__tests__/windowNodeContextStore.spec.ts electron/__tests__/nodeRegistryStore.spec.ts electron/server/services/__tests__/AppDataService.spec.ts`
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/config/app-config.test.ts tests/unit/config/server-runtime-endpoints.test.ts tests/unit/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.test.ts`
- `pnpm -C autobyteus-message-gateway exec vitest run tests/unit/config/env.test.ts tests/unit/config/runtime-config.test.ts`
- Broader executable validation is recorded in `tickets/done/electron-embedded-server-config-consistency/api-e2e-testing.md`
