# Investigation Notes

- Ticket: `managed-gateway-runtime-versioning`
- Last Updated: `2026-03-10`

## Sources Consulted

1. `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts`
2. `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-installer-service.ts`
3. `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-release-manifest-service.ts`
4. `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/managed-capabilities/messaging-gateway/release-manifest.json`
5. `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/managed-capabilities/messaging-gateway/defaults.ts`
6. `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/managed-capabilities/messaging-gateway/types.ts`
7. `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/tests/e2e/messaging/managed-messaging-gateway-update-graphql.e2e.test.ts`
8. `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-message-gateway/package.json`
9. `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-message-gateway/scripts/release-manifest.mjs`
10. `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-message-gateway/scripts/build-runtime-package.mjs`
11. `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/scripts/desktop-release.sh`
12. `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.github/workflows/release-messaging-gateway.yml`
13. `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/components/settings/messaging/ManagedGatewayRuntimeCard.vue`

## Key Findings

- `F-001`: Managed gateway compatibility is not resolved from GitHub “latest”. The server reads a bundled or explicitly configured manifest and selects a descriptor by exact `serverVersion` plus `platformKey`.
- `F-002`: The bundled manifest currently maps server `0.1.1` to release tag `v1.2.39` but still advertises `artifactVersion: 0.1.0`.
- `F-003`: The runtime update path treats `previousVersion === descriptor.artifactVersion` as “already on the latest compatible version,” even when `descriptor.releaseTag` changed. This means a new release tag alone does not trigger a true runtime upgrade.
- `F-004`: The installer uses `artifactVersion` as the identity for install directories, active-version state, and extracted staging paths. If `artifactVersion` stays the same, the installer reuses the existing install without inspecting release-tag drift.
- `F-005`: The download cache key is derived from the archive basename in the URL. Because the archive filename also embeds the gateway package version, unchanged `artifactVersion` can cause the cache path to stay stable across new release tags.
- `F-006`: Release automation currently bumps only `autobyteus-web/package.json`, then syncs the managed messaging manifest to the new release tag. It does not bump `autobyteus-message-gateway/package.json`.
- `F-007`: The messaging gateway release workflow validates only the desktop package version against the release tag, not the gateway package version.
- `F-008`: The UI exposes both `Active Version` and `Release Tag`, which reveals the drift but does not prevent it. Users can see a newer release tag while the active runtime version remains unchanged.
- `F-009`: Existing end-to-end coverage already encodes the current behavior: when update is invoked on the same `artifactVersion`, the runtime is restarted instead of upgraded.

## Constraints

- `C-001`: Managed messaging runtime publication is already tied to workspace `v*` releases, so the fix should work with that release lane rather than introducing a second independent latest-version discovery path.
- `C-002`: Runtime integrity checks through release-manifest URLs, checksum fetch, and rollback behavior must remain intact.
- `C-003`: The workflow’s no-backward-compat rule means the fix should replace the fragile identity model cleanly instead of adding long-lived dual version semantics.

## Module / File Placement Observations

- `autobyteus-message-gateway/scripts/release-manifest.mjs`
  - Correct owner for release-manifest generation logic.
- `scripts/desktop-release.sh`
  - Correct owner for release-time version synchronization and curated notes handling.
- `.github/workflows/release-messaging-gateway.yml`
  - Correct owner for release-lane validation enforcement.
- `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/*`
  - Correct owner for install/update/runtime identity behavior.
- `autobyteus-web/components/settings/messaging/ManagedGatewayRuntimeCard.vue`
  - Correct owner for user-facing runtime identity presentation.

## Open Unknowns

- `Q-001`: Is the better canonical identity the workspace release tag itself, or should release automation synchronize the gateway package version to match the workspace release tag and keep server/runtime logic centered on version strings?
- `Q-002`: If the canonical identity changes, should old installs under `extensions/messaging-gateway/versions/<old-version>` be migrated, replaced lazily, or simply coexist?
- `Q-003`: Should the UI continue showing both runtime version and release tag after the fix, or should one become the primary user-facing version?

## Implications For Requirements / Design

- The current design is not robust enough to guarantee that `Update Runtime` gets the newest compatible gateway runtime, because too many identity decisions depend on a manually bumped gateway package version.
- The most likely robust direction is to make release automation eliminate human memory from the flow and ensure the runtime identity used by install/update logic always changes when a new compatible release is published.
- Any accepted design must address all three identity consumers together:
  - update comparison logic,
  - installer directory/cache identity,
  - release automation validation/synchronization.
