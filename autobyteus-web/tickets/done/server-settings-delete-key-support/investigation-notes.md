# Investigation Notes

## Context

- User request: In Settings -> Server Settings -> Advanced, rows support save/add but do not support delete.
- Expected behavior: User can remove old/incorrect server settings from UI.

## Sources Consulted

- `components/settings/ServerSettingsManager.vue`
- `stores/serverSettings.ts`
- `graphql/mutations/server_settings_mutations.ts`
- `src/api/graphql/types/server-settings.ts` (server repo)
- `src/services/server-settings-service.ts` (server repo)
- `src/config/app-config.ts` (server repo)

## Findings

1. Frontend currently exposes only save/add actions.
2. Frontend store only has `updateServerSetting`; no delete mutation support.
3. GraphQL server settings resolver only exposes `updateServerSetting` and `setSearchConfig`.
4. Server settings service only supports update/list; no delete API.
5. App config supports `set` but not key removal from `.env`.
6. Legacy/incorrect keys currently remain in config unless manually edited outside UI.

## Constraints

- Keep code clean: no compatibility wrappers or dual flow.
- Avoid deleting protected predefined settings that are managed by runtime defaults.
- Remove key from persisted `.env` and runtime config view for true deletion.

## Open Questions

- Should predefined settings be deletable? Proposed: no (custom keys only).

## Implications

- Backend change is required for real deletion.
- Frontend can then show a Remove action and call delete mutation.
