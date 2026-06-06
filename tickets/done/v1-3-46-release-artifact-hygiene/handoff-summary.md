# Handoff Summary — v1.3.46 Release Artifact Hygiene

## Status

Ready for user verification before repository finalization and follow-up release.

## What changed

- Removed checkout-hostile generated iOS evidence from the committed tree:
  - raw `.xcresult` bundle directories under `tickets/done/ios-wrapper-app/...`;
  - one generated iOS simulator app artifact zip under the archived ticket's downloaded GitHub artifact evidence.
- Added `.gitignore` patterns for raw `.xcresult` bundles and generated ticket artifact drops.
- Added `scripts/check_repository_artifact_hygiene.py` to fail on tracked raw `.xcresult` paths, generated ticket artifact zips, and checkout-risk path lengths.
- Wired the guard into `.github/workflows/release-desktop.yml` `prepare-release` before platform build jobs fan out.
- Updated `README.md` release workflow documentation to record the new repository artifact-hygiene invariant.

## Integration refresh

- Finalization target: `personal`
- Latest tracked remote base checked: `origin/personal` at `15fcceedb67d6edac3d9942b9eb2098f7e5769a8`
- Ticket branch head: `910785d54497d0bf12cc3e85c86d51901094f7a5` before delivery-owned docs/handoff edits
- Integration method: Already current; `origin/personal` is an ancestor of the ticket branch.
- New base commits integrated during delivery: None required.
- Integration evidence: `delivery-evidence/round-1/integration-refresh.log`

## Validation evidence

API/E2E validation passed before delivery:

- GitHub Desktop Release workflow run: `27070018231`
- URL: <https://github.com/AutoByteus/autobyteus-workspace/actions/runs/27070018231>
- Mode: `workflow_dispatch`, branch `codex/v1-3-46-release-artifact-hygiene`, build-only (`publish_release=false`)
- Result: success across Linux, Windows, macOS ARM64, and macOS Intel.
- Windows job specifically completed checkout, reached `Build Electron Windows x64`, completed the Windows build, and uploaded `windows-x64`.

Delivery reran integrated-state local checks:

- `python3 scripts/check_repository_artifact_hygiene.py` — pass; longest tracked path 197 chars.
- `python3 -m py_compile scripts/check_repository_artifact_hygiene.py` — pass.
- `actionlint .github/workflows/release-desktop.yml` — pass.
- Ruby YAML parse for `.github/workflows/release-desktop.yml` — pass.
- Tracked artifact audit — pass; no tracked `.xcresult` paths and no tracked paths over 200 chars.

Delivery evidence is under `delivery-evidence/round-1/`.

## Release recommendation

Use a new patch release after finalization, not a moved `v1.3.46` tag. Recommended version: `1.3.47`, because `v1.3.46` already exists and points to the failed release tree.

Expected command after the ticket is archived and merged into `personal`:

```bash
pnpm release 1.3.47 -- --release-notes tickets/done/v1-3-46-release-artifact-hygiene/release-notes.md
```

Expected outcome:

- Desktop Release should pass Windows checkout/build and publish desktop release artifacts.
- Android, messaging gateway, and server Docker workflows are expected to run as usual.
- iOS App Store Connect/TestFlight upload is still expected to remain externally blocked until App Store Connect has an accessible app record for `org.autobyteus.mobile` and matching account access. This remediation intentionally does not fix the iOS App Store Connect app-record issue.

## Residual risks / non-claims

- Historical git objects still contain the old generated files; this remediation fixes the current tracked tree, not repository history size.
- If a new Windows failure appears after checkout/build starts, treat it as a separate non-checkout failure.
- GitHub Node.js 20 action deprecation annotations were observed but did not fail validation; track separately before GitHub's Node.js 24 enforcement window.
- iOS App Store Connect upload remains out of scope.

## User verification

User approved finalization/release with: "please finalize and release a new version thanks." Delivery should now:

1. Commit the delivery docs/handoff edits on the ticket branch.
2. Push the ticket branch.
3. Refresh `personal` from origin.
4. Merge the ticket branch into `personal` and push.
5. Archive the ticket under `tickets/done/v1-3-46-release-artifact-hygiene` as part of finalization if not already done in the merge flow.
6. Run the follow-up release as `v1.3.47` unless the user chooses a different new version.
7. Monitor release workflows and preserve the iOS App Store Connect missing-app-record issue as an external non-claim if it recurs.
