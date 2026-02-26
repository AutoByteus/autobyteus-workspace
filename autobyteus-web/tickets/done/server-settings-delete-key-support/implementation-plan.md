# Implementation Plan

## Solution Sketch (Small Scope Basis)

- Add backend delete path:
  - `AppConfig.delete(key)` removes key from config map, process env, and `.env` file.
  - `ServerSettingsService.deleteSetting(key)` rejects predefined keys and deletes custom keys.
  - GraphQL mutation `deleteServerSetting(key: String!): String` forwards to service.
- Add frontend delete path:
  - Add `DELETE_SERVER_SETTING` mutation doc.
  - Add `deleteServerSetting(key)` store action.
  - Add `Remove` button in Advanced settings table row.
  - Disable remove while operation is pending.
  - Refresh settings list and show success/error toast.
- Add tests:
  - Backend: service + resolver delete tests.
  - Frontend: ServerSettingsManager test for remove action calling store delete.

## Planned File Changes

- `autobyteus-server-ts/src/config/app-config.ts` (modify)
- `autobyteus-server-ts/src/services/server-settings-service.ts` (modify)
- `autobyteus-server-ts/src/api/graphql/types/server-settings.ts` (modify)
- `autobyteus-server-ts/tests/unit/services/server-settings-service.test.ts` (modify)
- `autobyteus-server-ts/tests/unit/api/graphql/types/server-settings.test.ts` (modify)
- `graphql/mutations/server_settings_mutations.ts` (modify)
- `stores/serverSettings.ts` (modify)
- `components/settings/ServerSettingsManager.vue` (modify)
- `components/settings/__tests__/ServerSettingsManager.spec.ts` (modify)

## Validation Plan

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/server-settings-service.test.ts tests/unit/api/graphql/types/server-settings.test.ts --no-watch`
- `pnpm test:nuxt components/settings/__tests__/ServerSettingsManager.spec.ts --run`
