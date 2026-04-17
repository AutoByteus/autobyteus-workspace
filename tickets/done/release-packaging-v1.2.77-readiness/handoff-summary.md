# Handoff Summary

## Status

- Ticket: `release-packaging-v1.2.77-readiness`
- Current status: `Ready for user verification`
- Last updated: `2026-04-17`

## Delivered

- Added a shared workspace package-root resolver at `scripts/workspace-package-roots.mjs` so packaging paths resolve workspace packages by manifest name instead of assuming folder name equality.
- Updated `autobyteus-web/scripts/prepare-server.mjs` to pack scoped workspace dependencies through the shared resolver.
- Updated `autobyteus-message-gateway/scripts/build-runtime-package.mjs` to use the same shared resolver for local workspace dependencies.
- Updated `autobyteus-server-ts/docker/Dockerfile.monorepo` so the server Docker build stages and ships the shared application SDK packages required by `autobyteus-server-ts`.
- Added targeted regression coverage in `autobyteus-web/scripts/__tests__/workspace-package-roots.test.mjs`.
- Synced `autobyteus-web/docs/github-actions-tag-build.md` to the current desktop release workflow matrix and publish outputs.

## Why This Ticket Exists

- `v1.2.77` was partially released, but release packaging broke in two places:
  - Windows desktop packaging failed when scoped workspace packages were resolved as filesystem paths instead of manifest names.
  - Server Docker packaging failed because the monorepo Docker build did not include the shared application SDK package inputs now required by `autobyteus-server-ts`.
- This ticket fixes those release-packaging defects without changing the user-facing product contract.

## Verification Snapshot

- Review: `Pass`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/in-progress/release-packaging-v1.2.77-readiness/review-report.md`
- Validation: `Pass`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/in-progress/release-packaging-v1.2.77-readiness/validation-report.md`
- Verified behaviors:
  - shared workspace manifest-name resolution passed syntax checks, unit coverage, and real `pnpm pack` proof;
  - `autobyteus-message-gateway/scripts/build-runtime-package.mjs --skip-build --release-tag v1.2.77` completed successfully;
  - `autobyteus-server-ts/docker/Dockerfile.monorepo` built successfully and the runtime image contained `@autobyteus/application-sdk-contracts` artifacts;
  - direct `autobyteus-web/scripts/prepare-server.mjs` execution reached and completed the changed dependency-packing path before later hitting an unchanged symlink-audit failure already classified as residual/non-blocking for this patch.

## Residual Risks

- Direct Darwin-host execution of `autobyteus-web/scripts/prepare-server.mjs` still later hits the unchanged `assertNoSymlinks()` failure after the changed path succeeds. Validation recorded this as residual/non-blocking for the fix because non-Windows release dispatch uses `prepare-server.sh`, but the risk should remain visible for future direct-script or Windows-path work.
- `v1.2.77` already exists as a partially published release tag. If finalization proceeds, the safer release path is a new patch release rather than silently mutating the existing `v1.2.77` artifact set.

## Docs Sync

- Docs sync report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/in-progress/release-packaging-v1.2.77-readiness/docs-sync.md`
- Long-lived docs updated:
  - `autobyteus-web/docs/github-actions-tag-build.md`

## Release Prep

- Release notes prepared: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/in-progress/release-packaging-v1.2.77-readiness/release-notes.md`
- Intended use: `Carry these notes into the next patch release if the user approves finalization.`

## Hold

- I have **not** archived the ticket, committed, pushed, merged, tagged, or released anything for this fix ticket.
- Per workflow, delivery now waits for **explicit user verification/approval** before finalization and any new release work.
