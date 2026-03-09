# Investigation Notes

## Metadata

- Ticket: `messaging-gateway-404-install-start`
- Last Updated: `2026-03-09`
- Scope Triage: `Small`

## Sources Consulted

1. `autobyteus-web/components/settings/messaging/ManagedGatewayRuntimeCard.vue`
2. `autobyteus-web/stores/gatewaySessionSetupStore.ts`
3. `autobyteus-web/stores/gatewaySessionSetup/managedGatewayStatus.ts`
4. `autobyteus-web/graphql/mutations/managedMessagingGatewayMutations.ts`
5. `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts`
6. `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-release-manifest-service.ts`
7. `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-installer-service.ts`
8. `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/release-manifest.json`
9. `autobyteus-message-gateway/scripts/build-runtime-package.mjs`
10. `autobyteus-server-ts/scripts/copy-managed-messaging-assets.mjs`
11. `.github/workflows/release-messaging-gateway.yml`
12. `.github/workflows/release-desktop.yml`
13. `scripts/desktop-release.sh`
14. `gh release view v1.2.26 --repo AutoByteus/autobyteus-workspace --json tagName,assets,publishedAt`
15. `gh release view v1.2.30 --repo AutoByteus/autobyteus-workspace --json tagName,assets,publishedAt`
16. `gh run list --repo AutoByteus/autobyteus-workspace --workflow 'Release Messaging Gateway' --limit 20`
17. `curl -I -L https://github.com/AutoByteus/autobyteus-workspace/releases/download/v1.2.26/autobyteus-message-gateway-0.1.0-node-generic.tar.gz`
18. `curl -I -L https://github.com/AutoByteus/autobyteus-workspace/releases/download/v1.2.30/autobyteus-message-gateway-0.1.0-node-generic.tar.gz`
19. `curl -L https://github.com/AutoByteus/autobyteus-workspace/releases/download/v1.2.30/release-manifest.json`
20. `diff -u` between checked-in manifest and published `v1.2.30` release manifest asset

## Key Findings

- `F-001`: The managed gateway install/start flow is driven by the frontend through GraphQL mutations (`enableManagedMessagingGateway`), then the server resolves a gateway release descriptor from its bundled `release-manifest.json`.
- `F-002`: The checked-in bundled manifest at `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/release-manifest.json` on `origin/personal` still points to release tag `v1.2.26`.
- `F-003`: The GitHub release asset URLs encoded in that checked-in manifest for `v1.2.26` return `HTTP 404`.
- `F-004`: The current latest release `v1.2.30` does contain the expected managed gateway assets and `release-manifest.json`; its gateway tarball URL returns `HTTP 200`.
- `F-005`: The published `v1.2.30` `release-manifest.json` asset points to the correct `v1.2.30` gateway asset URLs, but that manifest is not what the packaged server reads at runtime.
- `F-006`: `autobyteus-message-gateway/scripts/build-runtime-package.mjs` writes both a generated release-manifest artifact and a synced checked-in default manifest file, but the desktop release flow does not guarantee that regenerated checked-in manifest is committed before tagging/building a desktop release.
- `F-007`: `scripts/desktop-release.sh` only bumps `autobyteus-web/package.json`, commits, and tags; it does not sync the managed messaging manifest to the same release tag.
- `F-008`: `.github/workflows/release-desktop.yml` validates only `autobyteus-web/package.json` against the tag. It does not validate that the checked-in managed messaging manifest release tag matches the desktop release tag.
- `F-009`: The `Release Messaging Gateway` workflow did run successfully for `v1.2.30`, so the current release assets are present. The failure is a manifest drift bug between packaged app contents and published release assets.

## Root Cause

- Root cause: the desktop/server package shipped a stale checked-in managed messaging release manifest that still referenced `v1.2.26`. When the user clicked `Install and Start Gateway`, the server used that stale manifest and attempted to download a non-existent `v1.2.26` gateway asset, which returned `HTTP 404 Not Found`.

## Module And File Placement Observations

- Correct ownership:
  - UI action surface and error display belong in `autobyteus-web/components/settings/messaging/ManagedGatewayRuntimeCard.vue`.
  - Runtime install/status logic belongs in `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/`.
  - Release manifest generation belongs with the gateway packaging script in `autobyteus-message-gateway/scripts/`.
  - Desktop release orchestration belongs in `scripts/desktop-release.sh` and `.github/workflows/release-desktop.yml`.
- Misaligned ownership today:
  - Release-manifest freshness depends on a manual/pre-release packaging step rather than being enforced by the desktop release path that actually produces tagged desktop builds.

## Constraints

- `C-001`: The fix should prevent future desktop releases from shipping a stale managed messaging manifest.
- `C-002`: The fix should not require manual post-tag patching of GitHub release assets.
- `C-003`: The fix should keep the packaged server using a bundled manifest file, because runtime installation currently resolves from a local default manifest path.
- `C-004`: The fix should remain lightweight enough for routine release use; release-tag synchronization should not depend on full gateway artifact publication inside the local release script.

## Open Questions

- `Q-001`: Should the desktop release script actively regenerate the checked-in manifest, or should the desktop release workflow generate/overwrite it in CI before packaging, or both?
- `Q-002`: Should the desktop release workflow fail hard when the checked-in manifest tag drifts from the release tag? Current evidence says yes, to prevent recurrence.

## Implications For Requirements And Design

- `I-001`: The issue is release-process drift, not runtime route registration or gateway process startup logic.
- `I-002`: The correct fix is to enforce release-tag synchronization of `autobyteus-web/package.json` and the checked-in managed messaging manifest before desktop packaging.
- `I-003`: A release-time guard should block desktop releases when the manifest tag is stale, so the bug cannot recur silently.
