# Handoff Summary

- Ticket: `managed-gateway-runtime-versioning`
- Last Updated: `2026-03-10`
- Stage: `10`
- Status: `Complete`

## Delivered Change

- Managed messaging runtime versioning is now synchronized with the workspace release version instead of relying on a separately remembered manual gateway bump.
- `scripts/desktop-release.sh` now bumps both `autobyteus-web/package.json` and `autobyteus-message-gateway/package.json`, syncs the bundled managed-messaging manifest, stages the gateway package manifest, and commits with the workspace-wide release message.
- `.github/workflows/release-desktop.yml` and `.github/workflows/release-messaging-gateway.yml` now reject release-tag drift across desktop version, gateway version, and bundled managed-messaging manifest state.
- The current checked-in managed gateway metadata is corrected to the released workspace state: `web=1.2.41`, `gateway=1.2.41`, `releaseTag=v1.2.41`, `artifactVersion=1.2.41`.
- `MessagingGatewayReleaseManifestService` now rejects semver `releaseTag` / `artifactVersion` drift so stale manifests fail loudly instead of silently reusing an old runtime install.
- `README.md` release instructions now document the synchronized desktop + gateway versioning contract and manifest sync behavior.

## Verification

- Stage 6 focused verification passed:
  - `bash -n scripts/desktop-release.sh`
  - `ruby -e "require 'yaml'; YAML.load_file('.github/workflows/release-desktop.yml'); YAML.load_file('.github/workflows/release-messaging-gateway.yml')"`
  - `node autobyteus-message-gateway/scripts/build-runtime-package.mjs --check-release-manifest --release-tag v1.2.40`
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/managed-capabilities/messaging-gateway/messaging-gateway-release-manifest-service.test.ts tests/e2e/messaging/managed-messaging-gateway-update-graphql.e2e.test.ts`
- Stage 7 acceptance passed:
  - disposable-clone release smoke using `scripts/desktop-release.sh release 1.2.41 --no-push`
  - disposable-clone package drift rejection check
  - disposable-clone manifest drift rejection check
  - synchronized metadata inspection in the current checkout
  - rerun of `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/messaging/managed-messaging-gateway-update-graphql.e2e.test.ts`
- Stage 8 review passed with no findings.

## Finalization

- Ticket branch pushed: `codex/managed-gateway-runtime-versioning` at `74fd8f6`
- Merged into `personal`: `5f201b1`
- Release published: `v1.2.41` from `db39d7d`
- Archived ticket bookkeeping completed after release on `personal`

## Residual Risk / Follow-Up

- The desktop and messaging-gateway workflows currently duplicate the version-validation shell logic. They are aligned in this ticket, but future edits should keep them in sync or extract a shared validator later.

## Release Notes Requirement

- [`release-notes.md`](./release-notes.md) was persisted and used for release `v1.2.41`.
