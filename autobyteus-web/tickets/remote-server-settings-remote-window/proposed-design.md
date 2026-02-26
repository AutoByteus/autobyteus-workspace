# Proposed Design Document

## Summary
Enable `Server Settings` for remote node windows so users can configure remote node runtime settings, while keeping embedded-process diagnostics (server monitor/log/restart surface) scoped to embedded windows.

## Goals
- Allow remote node windows to access and edit server settings.
- Preserve existing embedded-only diagnostics behavior.
- Keep node-bound routing semantics (`windowNodeContextStore`) unchanged.

## Non-Goals
- No backend schema/resolver changes.
- No changes to embedded lifecycle controls (`restartServer`, log-file IPC).
- No compatibility wrappers for old remote-window restrictions.

## Legacy Removal Policy (Mandatory)
- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove remote-window UI guards that block server settings access.

## Requirements And Use Cases
- Use Case 1: Remote window opens Settings and configures server settings.
- Use Case 2: Embedded window behavior remains intact, including startup routing to server settings when embedded server is not running.
- Use Case 3: Remote window does not expose embedded-only diagnostics controls in advanced settings.

## Current State (As-Is)
- `pages/settings.vue` hides Server Settings in remote windows and reroutes `server-settings` to `api-keys`.
- `components/settings/ServerSettingsManager.vue` renders only for embedded windows and returns early on mount for remote windows.
- `components/server/ServerMonitor.vue` is embedded-only by design (correct boundary).

## Target State (To-Be)
- `pages/settings.vue` always shows and mounts Server Settings section.
- `ServerSettingsManager.vue` loads settings for both embedded and remote windows.
- Advanced diagnostics subpanel button/content stays embedded-only.

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `pages/settings.vue` | `pages/settings.vue` | Remove embedded-only gate for Server Settings navigation/content | Settings page routing behavior | Remove remote fallback to API keys for `server-settings` |
| C-002 | Modify | `components/settings/ServerSettingsManager.vue` | `components/settings/ServerSettingsManager.vue` | Allow remote windows to manage settings | Server settings UI behavior | Keep server monitor diagnostics embedded-only |
| C-003 | Modify | `pages/__tests__/settings.spec.ts` | `pages/__tests__/settings.spec.ts` | Align tests with new product behavior | Unit tests | Replace old embedded-only assertions |
| C-004 | Modify | `components/settings/__tests__/ServerSettingsManager.spec.ts` | `components/settings/__tests__/ServerSettingsManager.spec.ts` | Verify remote behavior and embedded diagnostics boundary | Unit tests | Add remote-window coverage |

## Architecture Overview
- Node context remains authoritative through `windowNodeContextStore`.
- GraphQL client stays node-bound; remote settings already resolve through bound endpoint.
- Embedded-only process diagnostics remain in `ServerMonitor` boundary.

## File And Module Breakdown

| File/Module | Change Type | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- |
| `pages/settings.vue` | Modify | Settings section navigation + section routing | component setup state | route query -> active section | `windowNodeContextStore`, `serverStore` |
| `components/settings/ServerSettingsManager.vue` | Modify | Server settings UI + quick/advanced forms | component setup state and actions | store state/actions -> rendered form | `serverSettings` store, `ServerMonitor` |
| `pages/__tests__/settings.spec.ts` | Modify | Settings page behavior validation | Vitest cases | mock context/status -> assertions | Vue Test Utils |
| `components/settings/__tests__/ServerSettingsManager.spec.ts` | Modify | Manager behavior validation | Vitest cases | mock embedded/remote context -> assertions | Pinia test setup |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `pages/settings.vue` | Route/store state | Settings sections | Low | Keep section selection local and deterministic |
| `ServerSettingsManager.vue` | `serverSettings` store, node context | none | Low | Keep diagnostics guard local to advanced panel |
| tests | Component contracts | CI/test suite | Low | Targeted tests updated with explicit remote expectations |

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| Remote-only block in settings nav/content | Remove `isEmbeddedWindow` guards from server settings section access | Deletes obsolete remote restriction path | Updated unit tests pass |
| Remote mount early-return in server settings manager | Remove early return and fallback placeholder panel | Removes legacy deny path | Manager tests pass in remote mode |

## Data Models (If Needed)
- N/A (no data model change).

## Error Handling And Edge Cases
- Remote node unavailable: existing store error state remains displayed.
- Route query `section=server-status`: normalize to `server-settings` consistently.

## Performance / Security Considerations
- No new network surface added; remote settings GraphQL already exists.
- Embedded diagnostics remain hidden remotely to avoid exposing unusable process controls.

## Migration / Rollout (If Needed)
- Frontend-only rollout; no schema migration.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/Manual) | Status |
| --- | --- | --- | --- |
| C-001 | T1 | Unit: `pages/__tests__/settings.spec.ts` | Planned |
| C-002 | T2 | Unit: `components/settings/__tests__/ServerSettingsManager.spec.ts` | Planned |
| C-003 | T3 | Unit: settings page suite | Planned |
| C-004 | T4 | Unit: manager suite | Planned |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Design Smell | Design Update Applied | Status |
| --- | --- | --- | --- | --- |
| 2026-02-11 | Initial review | None | N/A | Closed |

## Open Questions
- None for implementation kickoff.
