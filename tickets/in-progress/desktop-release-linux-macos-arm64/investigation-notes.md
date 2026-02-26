# Investigation Notes

## Sources Consulted
- `.github/workflows/release-desktop.yml`
- `autobyteus-web/build/scripts/build.ts`
- `autobyteus-web/package.json`
- `autobyteus-web/docs/github-actions-tag-build.md`
- `git show enterprise:.github/workflows/release-desktop.yml`
- `git show enterprise:autobyteus-web/build/scripts/build.ts`

## Key Findings
1. Release workflow already defines two build jobs and one publish job:
- `build-macos-arm64` (macOS)
- `build-linux` (Linux)
- `publish-release` (uploads `dmg` + `AppImage` assets)

2. macOS notarization is already effectively optional in CI:
- Workflow sets `APPLE_TEAM_ID=""`
- Build config uses `notarize: !!process.env.APPLE_TEAM_ID`
- Result: notarization disabled when Team ID is missing.

3. Potential personal-vs-enterprise flavor ambiguity in tag CI:
- Build flavor fallback logic in `build.ts` uses git branch inference.
- Tag workflows run in detached-head; branch inference may be incomplete.
- Fallback default is `enterprise` when flavor cannot be inferred.
- This can cause non-deterministic flavor identity in release artifacts unless explicitly set.

4. macOS architecture intent in workflow is ARM64, but build target selection should be explicit for deterministic behavior.

5. Documentation mismatch exists:
- `autobyteus-web/docs/github-actions-tag-build.md` references old file path (`desktop-tag-build.yml`) and an external release repo flow, while current workflow is `.github/workflows/release-desktop.yml` using `action-gh-release` in current repository.

## Constraints
- No Apple Team ID/cert notary setup available for this task.
- Acceptance requires Linux + macOS (Apple Silicon only) artifacts in release pipeline.

## Open Unknowns
- Full end-to-end release asset visibility can only be fully proven in GitHub Actions with a real tag run.

## Implications For Design
- Make release flavor explicit (`personal`) in CI build steps.
- Make mac architecture selection explicit (arm64 only) in build invocation path.
- Keep notarization/signing optional and non-blocking.
- Align release documentation with the actual workflow behavior.
