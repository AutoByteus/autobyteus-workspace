# Handoff Summary

## Outcome

- Release packaging readiness fixes for the broken `v1.2.77` lanes were finalized on `2026-04-17`.
- The ticket is archived at `tickets/done/release-packaging-v1.2.77-readiness/`.
- The fix was merged into `origin/personal` and released as `v1.2.78`.
- GitHub release workflows for the new tag were triggered successfully:
  - Desktop Release
  - Release Messaging Gateway
  - Server Docker Release

## What Changed

- Added a shared workspace package-root resolver at `scripts/workspace-package-roots.mjs` so packaging flows resolve workspace packages by manifest name rather than by folder-name assumptions.
- Updated `autobyteus-web/scripts/prepare-server.mjs` to pack scoped workspace dependencies through the shared resolver.
- Updated `autobyteus-message-gateway/scripts/build-runtime-package.mjs` to use the same shared resolver for local workspace dependencies.
- Updated `autobyteus-server-ts/docker/Dockerfile.monorepo` so the server Docker image includes the shared application SDK package inputs required by `autobyteus-server-ts`.
- Added targeted regression coverage in `autobyteus-web/scripts/__tests__/workspace-package-roots.test.mjs`.
- Synced `autobyteus-web/docs/github-actions-tag-build.md` to the current desktop release matrix and publish outputs.

## Why This Ticket Existed

- `v1.2.77` partially released but left two packaging defects in the release lanes:
  - Windows desktop packaging failed when scoped workspace packages were resolved as filesystem paths instead of manifest names.
  - Server Docker packaging failed because the monorepo Docker build did not include the shared application SDK package inputs now required by `autobyteus-server-ts`.
- This ticket fixed those release-packaging defects and shipped the repaired state as a new patch release instead of mutating the existing `v1.2.77` tag.

## Verification Summary

- Review report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/release-packaging-v1.2.77-readiness/review-report.md`
- Validation report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/release-packaging-v1.2.77-readiness/validation-report.md`
- Validated evidence included:
  - shared workspace manifest-name resolution syntax checks, unit coverage, and real `pnpm pack` proof;
  - successful `autobyteus-message-gateway/scripts/build-runtime-package.mjs --skip-build --release-tag v1.2.77` execution;
  - successful monorepo Docker build plus runtime smoke showing `@autobyteus/application-sdk-contracts` inside the image;
  - direct `autobyteus-web/scripts/prepare-server.mjs` execution reaching and completing the changed dependency-packing path before later hitting the previously known unchanged symlink-audit failure.

## Docs Sync

- Docs sync report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/release-packaging-v1.2.77-readiness/docs-sync.md`
- Long-lived docs updated:
  - `autobyteus-web/docs/github-actions-tag-build.md`

## Release Notes

- Archived release notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/release-packaging-v1.2.77-readiness/release-notes.md`
- Released version: `v1.2.78`

## Residual / Rollout Notes

- Direct Darwin-host execution of `autobyteus-web/scripts/prepare-server.mjs` still has the previously known unchanged `assertNoSymlinks()` residual after the changed packaging path succeeds. This remained non-blocking for the scoped fix and was preserved in the validation record.
- At handoff time, the GitHub-hosted release publication is asynchronous; the `v1.2.78` workflows were in progress immediately after tag push.
