# User-Authorized GitHub iOS Pipeline Probe

Date: 2026-06-06T15:36Z UTC

## Branch Push

- Branch: `codex/ios-wrapper-app`
- Latest pushed commit before probe: `675ba521d056a852fb8bb9ce6be9ee05cf3bfbeb`
- Push result: branch created on `origin/codex/ios-wrapper-app`.

## Safe Manual Dispatch Attempt

Command attempted:

```bash
gh workflow run release-ios.yml --ref codex/ios-wrapper-app -F publish_app_store_connect=false -F prerelease=true
```

Result: not triggered. GitHub returned `HTTP 404: workflow release-ios.yml not found on the default branch`.

Interpretation: pushing the new workflow to a feature branch is not enough for GitHub Actions workflow endpoint / `workflow_dispatch` discovery by filename. The workflow file exists in the pushed branch (verified separately through the GitHub contents API), but the Actions workflow is not installed on the default branch (`personal`) yet.

## GitHub Secrets / Variables

Required iOS/App Store Connect secret names are present in the repository secret list as of this probe, including:

- `IOS_DISTRIBUTION_CERTIFICATE_P12_BASE64`
- `IOS_DISTRIBUTION_CERTIFICATE_P12_PASSWORD`
- `IOS_APPSTORE_PROVISIONING_PROFILE_BASE64`
- `IOS_SHARE_EXTENSION_APPSTORE_PROVISIONING_PROFILE_BASE64`
- `IOS_DEVELOPMENT_TEAM`
- `APP_STORE_CONNECT_KEY_ID`
- `APP_STORE_CONNECT_ISSUER_ID`
- `APP_STORE_CONNECT_API_KEY_P8_BASE64`

Repository variables present:

- `IOS_APP_SCHEME=AutoByteusMobile`
- `IOS_ARTIFACT_PREFIX=AutoByteus_personal_ios`
- `IOS_BUNDLE_ID=org.autobyteus.mobile`
- `IOS_SHARE_EXTENSION_BUNDLE_ID=org.autobyteus.mobile.share`

## Safe Next Options

1. Merge or otherwise add `.github/workflows/release-ios.yml` to default branch `personal`, then manually dispatch `publish_app_store_connect=false` for a build-only GitHub runner validation.
2. Push a `vMAJOR.MINOR.PATCH[-PRERELEASE]` tag pointing at the branch commit. Because the required iOS secrets appear present, this can proceed beyond the missing-secret gate and may upload to App Store Connect/TestFlight. Do this only after explicit confirmation of the tag/version and acceptance of a real TestFlight upload attempt.


## Real GitHub Runner Build-Only Result

A temporary branch-push trigger was added on `codex/ios-wrapper-app` only to exercise the workflow on a real GitHub-hosted macOS runner without requesting publish.

- Temporary trigger commit: `c32f20f3a10274307efc92cdd35675f1ccfc98b9`
- Run ID: `27066610907`
- Run URL: https://github.com/AutoByteus/autobyteus-workspace/actions/runs/27066610907
- Result: `success`
- Metadata job: success
- Build/test/smoke job: success in 10m18s
- Core tests on runner: 21 tests, 0 failures
- UI smoke on runner: 2 tests, 0 failures/skips
- Uploaded artifact: `ios-build-test-artifacts`, artifact id `7455760368`, digest `sha256:7cadfe9e8e1c2a81e08b0f722299c868143e773087d7c8e87ff34dbb1b407393`
- Publish requested: `false`; publish secret gate and TestFlight upload jobs were skipped.

The run proves the GitHub-hosted macOS build-only path can build/test/smoke successfully. It does not prove archive/export/TestFlight upload. The temporary branch-push trigger should be reverted after recording this evidence so the final workflow keeps the reviewed trigger contract.

Runner-specific note: `publish-secret-readiness.txt` reported the required iOS/App Store Connect secret names as present, but the smoke-captured signing readiness classified the ephemeral runner as `simulator-ready-signing-assets-missing` because no signing identities/profiles are installed in the runner keychain/profile directories unless the publish job imports them.
