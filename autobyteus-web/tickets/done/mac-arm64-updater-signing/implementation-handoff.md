# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/tickets/done/mac-arm64-updater-signing/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/tickets/done/mac-arm64-updater-signing/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/tickets/done/mac-arm64-updater-signing/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/tickets/done/mac-arm64-updater-signing/design-review-report.md`

## What Changed

- Added an AutoByteus macOS signing policy/classifier that is the single owner for entitlement profiles and entitlement-bearing role decisions.
- Added shared macOS signing discovery so the signer and verifier traverse the same signable Mach-O/bundle subjects without maintaining divergent allowlists.
- Added a custom electron-builder macOS signing adapter that signs discovered subjects deepest-first:
  - root app bundle/root main executable use `build/entitlements.mac.plist`;
  - Electron helper app bundles/helper main executables use narrow role-specific helper entitlement plists;
  - all other nested Mach-O/bundle code is signed with hardened runtime and no `--entitlements` argument.
- Removed server native binary signing from `afterPack.ts`; it now only normalizes packaged `node-pty` spawn-helper execute bits before signing.
- Removed broad `mac.entitlementsInherit: 'build/entitlements.mac.plist'` and wired `mac.sign` to `./build/dist/macSign.js`.
- Added the release verifier CLI `scripts/verify-macos-signing-policy.mjs`, including explicit Squirrel/ShipIt no-entitlement checks and root executable expected-entitlement preservation checks.
- Added GitHub `Desktop Release` workflow verifier steps for both macOS ARM64 and x64 jobs before artifact upload.
- Added focused Vitest coverage for policy classification of root app, helper roles, Squirrel/ShipIt, frameworks, dylibs, and server native modules.

## Key Files Or Areas

- Modified:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/build/scripts/build.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/build/scripts/afterPack.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/.github/workflows/release-desktop.yml`
- Added:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/build/scripts/macSigningPolicy.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/build/scripts/macSigningDiscovery.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/build/scripts/macCodeSign.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/build/scripts/macSign.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/build/entitlements.mac.helper.plist`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/build/entitlements.mac.helper.renderer.plist`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/build/entitlements.mac.helper.gpu.plist`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/build/entitlements.mac.helper.plugin.plist`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/scripts/verify-macos-signing-policy.mjs`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/scripts/__tests__/macSigningPolicy.spec.ts`

## Important Assumptions

- The app build runs `tsc -p build/tsconfig.json` before `node build/dist/build.js`, so `./build/dist/macSign.js` and the compiled policy/discovery modules exist before electron-builder and the verifier need them.
- Electron helper app names continue to include `Helper` with optional `(Renderer)`, `(GPU)`, or `(Plugin)` role suffixes, matching Electron's helper app naming pattern.
- Squirrel and ShipIt remain present under `Contents/Frameworks/Squirrel.framework/Versions/A/...` for the DMG+ZIP macOS updater path.
- No explicit provisioning profile is currently expected for direct Developer ID distribution. The custom signer preserves an explicit `provisioningProfile` by embedding it when supplied, but it does not recreate osx-sign's automatic entitlement mutation path.

## Known Risks

- The helper entitlement profiles are intentionally narrower than the prior full app payload. Packaged app smoke validation must verify renderer/GPU/plugin/helper behavior on Apple Silicon and x64.
- Full proof requires a signed/notarized macOS artifact with Apple signing credentials. Local implementation checks did not run a Developer ID signed build, Gatekeeper assessment, notarization, or Squirrel update apply.
- The verifier will fail if Squirrel or ShipIt are missing. That is intentional for the current Squirrel.Mac updater requirement but should be revisited if the update mechanism is replaced in a future design.
- The custom signer bypasses osx-sign default per-file entitlement fallback so non-app code can be signed without an entitlement payload. Code review should scrutinize signing order and preservation of identity/keychain/timestamp/requirements/additional-arguments handling.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix / Packaging Behavior Change
- Reviewed root-cause classification: Missing Invariant / Boundary Or Ownership Issue
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes: The implementation removes broad inherited app entitlements, removes duplicate server-native app-entitlement signing, centralizes entitlement allowance in `MacSigningPolicy`, keeps signing lifecycle in `macSign.ts`, and gates release upload with the verifier. No runtime updater repair path or `afterSign` mutation was added.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: `afterPack.ts` was narrowed to resource normalization only. The added `macSigningDiscovery.ts` is a small implementation extraction to prevent signer/verifier traversal drift while leaving entitlement allowance in `MacSigningPolicy`.

## Environment Or Dependency Notes

- No new npm dependencies were added.
- The generated `autobyteus-web/build/dist/*.js` files are ignored build output and are produced by `pnpm transpile-build`; source changes are in `build/scripts` and `scripts`.
- Local branch/worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing`, branch `codex/mac-arm64-updater-signing`.
- The upstream ticket artifacts are currently untracked in this worktree along with this implementation handoff.

## Local Implementation Checks Run

Record only implementation-scoped checks here, such as build, typecheck, unit tests, and narrow integration checks around the changed code.
Do not stand up API/E2E execution environments or treat that work as part of this section.
Do not report API, E2E, or broader executable checks as passed in this artifact.

- `pnpm transpile-build` from `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web` — Passed.
- `pnpm exec vitest run scripts/__tests__/macSigningPolicy.spec.ts --run` from `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web` — Passed, 4 tests. Non-blocking existing setup output included KaTeX quirks-mode and non-Electron server initialization logs.
- `node scripts/verify-macos-signing-policy.mjs --help` from `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web` — Passed.
- `git diff --check` from `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing` — Passed.

Not run locally:

- Developer ID signed/notarized `pnpm build:electron:mac` with Apple secrets.
- `codesign --verify --deep --strict --verbose=2` on a newly signed fixed app.
- `spctl -a -vv --type execute` on a newly signed fixed app.
- Squirrel update install/apply smoke test.
- GitHub `Desktop Release` manual workflow dispatch with `publish_release=false`.

## Downstream Coverage Hints / Suggested Scenarios

- Build macOS ARM64 and x64 in GitHub `Desktop Release` via manual dispatch with `publish_release=false`; record run URL and verifier output.
- Verify the release workflow runs `scripts/verify-macos-signing-policy.mjs --app <AutoByteus.app>` before artifact upload in both macOS jobs.
- For both ARM64 and x64 signed apps, verify:
  - Squirrel and ShipIt print no entitlement keys with `codesign -d --entitlements :-`.
  - Top-level `Contents/MacOS/AutoByteus` still prints the root app entitlement keys from `build/entitlements.mac.plist`.
  - Electron helper app executables only have their role-specific helper keys.
  - Framework binaries/dylibs, `.node` modules, and server native binaries have no entitlement keys.
  - `codesign --verify --deep --strict --verbose=2 AutoByteus.app` passes.
  - `spctl -a -vv --type execute AutoByteus.app` passes or records a concrete environment blocker.
- Run packaged app smoke checks covering launch, renderer/GPU/helper startup, microphone capture, bundled server startup, and terminal/node-pty runtime.
- Confirm affected-user recovery docs in delivery: already-broken installed apps may need one manual fixed-DMG install before future auto-updates can work.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. API/E2E must still perform coverage investigation and execution. The key required validation is the pushed-branch GitHub `Desktop Release` manual dispatch with `publish_release=false`, plus signed artifact verifier evidence or a concrete credentials/permissions blocker.
