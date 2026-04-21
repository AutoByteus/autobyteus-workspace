# Application Capability

## Scope

Owns whether the Applications module is available for the currently bound node at runtime.

This replaces the removed frontend build-time `runtimeConfig.public.enableApplications` gate. The authoritative answer now lives on the backend and is exposed through a typed GraphQL capability boundary.

## TS Source

- `src/application-capability`
- `src/api/graphql/types/application-capability.ts`
- `src/services/server-settings-service.ts`

## Main Service

- `src/application-capability/services/application-capability-service.ts`

## Capability Model

The typed capability shape returned to the frontend contains:

- `enabled`: whether Applications should be visible and routable for the current bound node,
- `scope`: currently `BOUND_NODE`,
- `settingKey`: `ENABLE_APPLICATIONS`, and
- `source`: one of:
  - `SERVER_SETTING`
  - `INITIALIZED_FROM_DISCOVERED_APPLICATIONS`
  - `INITIALIZED_EMPTY_CATALOG`

## Read / Update Boundary

GraphQL exposes the runtime Applications capability through:

- `applicationsCapability()`
- `setApplicationsEnabled(enabled: Boolean!)`

The frontend shell, route guard, catalog store, and Settings UI must consume this typed boundary instead of reading the generic server-settings table or any baked frontend config directly.

## Initialization And Persistence Rules

- If `ENABLE_APPLICATIONS` is already persisted, that value is authoritative.
- If the setting is absent, `ApplicationCapabilityService` checks `ApplicationBundleService.hasDiscoverableApplications()`.
- The service then persists the first explicit runtime value:
  - `true` when discoverable applications already exist on the node,
  - `false` when the catalog is empty.
- After that first write, Applications availability remains an explicit server setting until the user changes it again.

This keeps the migration away from the removed frontend build flag clean while preserving visibility for already-discovered applications during cutover.

## Ownership Rules

- `ApplicationCapabilityService` is the only owner allowed to infer initial Applications availability from bundle discovery.
- `ApplicationBundleService` remains the bundle-discovery owner; it is not the steady-state capability authority.
- `ServerSettingsService` is only the persisted-setting substrate for the capability; callers above the capability boundary should not reintroduce generic settings-table coupling.
- Different windows bound to different nodes can legitimately receive different Applications capability answers.

## Related Docs

- [`applications.md`](./applications.md)
- [`application_orchestration.md`](./application_orchestration.md)
- `../../../autobyteus-web/docs/applications.md`
- `../../../autobyteus-web/docs/settings.md`
