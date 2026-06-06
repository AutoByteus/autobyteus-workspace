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

Interpretation: pushing the new workflow to a feature branch is not enough for `workflow_dispatch` discovery by filename; the workflow is visible in the branch but not installed on the default branch (`personal`) yet.

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
