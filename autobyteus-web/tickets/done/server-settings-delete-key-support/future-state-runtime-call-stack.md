# Future-State Runtime Call Stack

## Version

v1

## UC-001 Delete Custom Server Setting

1. `components/settings/ServerSettingsManager.vue:deleteIndividualSetting(key)`
2. `stores/serverSettings.ts:deleteServerSetting(key)`
3. `graphql/mutations/server_settings_mutations.ts:DELETE_SERVER_SETTING`
4. `src/api/graphql/types/server-settings.ts:ServerSettingsResolver.deleteServerSetting(key)`
5. `src/services/server-settings-service.ts:ServerSettingsService.deleteSetting(key)`
6. `src/config/app-config.ts:AppConfig.delete(key)`
7. `src/config/app-config.ts:AppConfig.removeKeyFromEnvFile(configFile, key)`
8. return success message -> store reloads settings -> component shows success toast.

State mutation/persistence points:

- `AppConfig.configData` key removed.
- `process.env[key]` deleted.
- `.env` file line removed for key.
- frontend store settings replaced by fresh query payload.

## UC-002 Delete Protected Setting

1. `ServerSettingsManager.vue:deleteIndividualSetting(key)`
2. `serverSettingsStore.deleteServerSetting(key)`
3. `ServerSettingsResolver.deleteServerSetting(key)`
4. `ServerSettingsService.deleteSetting(key)` returns failure for predefined key.
5. component shows error toast; no state deletion occurs.

## UC-003 Post-Delete Refresh

1. store mutation succeeds.
2. `serverSettingsStore.reloadServerSettings()` runs.
3. component watcher sync removes deleted key from local `editedSettings` map.
