# Handoff Summary

- Ticket: `mac-arm64-updater-signing`
- Last Updated: `2026-06-19`
- Stage: Delivery/user-verification hold
- User Verification Status: `Verified on 2026-06-19; repository finalized, release in progress`

## Outcome

The macOS updater signing fix has passed code review and API/E2E validation. The implementation replaces broad child entitlement inheritance with an explicit macOS signing policy, adds helper entitlement profiles, signs non-app nested Mach-O code without entitlement payloads, and gates macOS ARM64/x64 release artifacts with `scripts/verify-macos-signing-policy.mjs` before upload.

Delivery reviewed and updated long-lived docs so future packaging/release work preserves the signing invariant and so operators know that already-broken installed macOS apps may need a one-time fixed-DMG install before future auto-updates work.

## Branch / Worktree

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing`
- Repository subdir: `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web`
- Ticket branch: `codex/mac-arm64-updater-signing`
- Finalization target from bootstrap: `personal` / `origin/personal`
- Bootstrap base: `origin/personal` at `a9a02c416a81aff12fd5bc37d47fe2301db6469b`
- Latest delivery fetch: `origin/personal` still at `a9a02c416a81aff12fd5bc37d47fe2301db6469b`
- Integration method: `Already current`; no merge/rebase was required before docs sync.

## Key Implementation Changes

- `.github/workflows/release-desktop.yml` runs the macOS signing-policy verifier for both ARM64 and x64 before macOS artifact upload.
- `autobyteus-web/build/scripts/build.ts` uses custom macOS signing via `build/dist/macSign.js` and no longer uses broad `mac.entitlementsInherit` for child code.
- `autobyteus-web/build/scripts/afterPack.ts` now normalizes native resources only; it no longer signs bundled server Mach-O files with app entitlements.
- `autobyteus-web/build/scripts/macSign.ts`, `macSigningPolicy.ts`, `macSigningDiscovery.ts`, and `macCodeSign.ts` own macOS signing subject discovery/classification/signing.
- `autobyteus-web/build/entitlements.mac.helper*.plist` adds role-specific Electron helper entitlements.
- `autobyteus-web/scripts/verify-macos-signing-policy.mjs` validates signed `.app` bundles and explicitly checks Squirrel/ShipIt.
- `autobyteus-web/scripts/__tests__/macSigningPolicy.spec.ts` covers the signing classifier.

## Docs Updated In Delivery

- `autobyteus-web/docs/electron_packaging.md`
  - macOS signing policy and verifier
  - `afterPack.ts` ownership boundary
  - no-entitlement rule for non-app nested Mach-O code
  - one-time fixed-DMG recovery path
- `autobyteus-web/docs/github-actions-tag-build.md`
  - ARM64/x64 signing gate in Desktop Release
  - release-grade Apple signing requirement
  - local signed-package verifier command
  - manual `workflow_dispatch` validation with `publish_release=false`
  - fixed-DMG recovery note
- `README.md`
  - root release workflow summary now calls out mandatory macOS signing-policy validation and fixed-DMG recovery.

Docs sync report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/tickets/done/mac-arm64-updater-signing/docs-sync-report.md`

## Validation Completed Before Delivery

- Code review: `Pass` in `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/tickets/done/mac-arm64-updater-signing/code-review-report.md`.
- API/E2E: `Pass` in `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/tickets/done/mac-arm64-updater-signing/api-e2e-execution-coverage-report.md`.
- GitHub `Desktop Release` manual dispatch with `publish_release=false`: https://github.com/AutoByteus/autobyteus-workspace/actions/runs/27832647557
- Workflow result: success; `Publish GitHub Release` skipped.
- ARM64 workflow verifier: 48 signing subjects verified; Squirrel/ShipIt had no entitlement keys.
- x64 workflow verifier: 50 signing subjects verified; Squirrel/ShipIt had no entitlement keys.
- Downloaded ARM64 artifact installed as `/Applications/AutoByteus.app` and passed signing-policy verifier, `codesign --verify --deep --strict`, `spctl -a -vv --type execute`, Squirrel/ShipIt entitlement spot checks, launch smoke, and packaged terminal/node-pty runtime probe.

## Delivery Validation / Freshness

- `git fetch origin --prune` completed on 2026-06-19.
- Latest tracked base `origin/personal` did not advance beyond the reviewed/API-E2E-validated base, so no base commits were integrated and no additional executable rerun was required for integration freshness.
- Delivery-owned Markdown/docs changes were checked with `git diff --check`.

## Local Evidence

Ignored local evidence and downloaded artifacts remain under:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/tickets/done/mac-arm64-updater-signing/evidence/`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/tickets/done/mac-arm64-updater-signing/github-run-27832647557-artifacts/macos-arm64/`

The installed `/Applications/AutoByteus.app` from the successful GitHub ARM64 artifact was intentionally left running for user inspection.

## Expected User Verification

Please inspect the installed `/Applications/AutoByteus.app` if desired and confirm the delivery state is acceptable. A sufficient verification signal is an explicit reply such as: `verified; finalize`.

User verification was received on 2026-06-19. The ticket was archived to `tickets/done`, the ticket branch was committed/pushed at `08eb3dd2`, and `personal` was fast-forwarded/pushed to that commit. Release `v1.3.64` is in progress via the documented root release helper.

## Release / Deployment Notes

- Release notes candidate: `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/tickets/done/mac-arm64-updater-signing/release-notes.md`
- User authorized a new version release on 2026-06-19.
- Target release: `v1.3.64` using the documented `pnpm release 1.3.64 -- --release-notes autobyteus-web/tickets/done/mac-arm64-updater-signing/release-notes.md` flow.

## Residual Risk / Follow-Up

- True auto-update apply from a broken source app to the fixed target app was intentionally not attempted because the accepted requirement recognizes a broken source Squirrel/ShipIt helper may need manual fixed-DMG replacement first.
- Local x64 install smoke was not performed on the ARM64 host; x64 signing policy was validated in the GitHub macOS x64 workflow job.
