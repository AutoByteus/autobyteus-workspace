# API / E2E Testing

- Ticket: `managed-gateway-runtime-versioning`
- Last Updated: `2026-03-10`
- Stage: `7`

## Acceptance Scenario Matrix

| Scenario ID | Acceptance Criteria | Scenario | Type | Planned Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| `AV-001` | `AC-001` | Release helper synchronizes desktop version, gateway version, and bundled manifest when preparing the next release | Command / release-flow smoke | disposable-clone `scripts/desktop-release.sh release ... --no-push` | Passed |
| `AV-002` | `AC-002` | Managed gateway update installs a newer runtime version when manifest `artifactVersion` advances | GraphQL e2e | `managed-messaging-gateway-update-graphql.e2e.test.ts` | Passed |
| `AV-003` | `AC-003` | Managed gateway update restarts instead of reinstalling when the active runtime already matches the compatible version | GraphQL e2e | `managed-messaging-gateway-update-graphql.e2e.test.ts` | Passed |
| `AV-004` | `AC-004` | Release automation / CI rejects package-version or manifest drift from the release tag | Command / validation smoke | disposable-clone manifest/package drift checks | Passed |
| `AV-005` | `AC-005` | Checked-in runtime version metadata is synchronized and user-facing release docs describe the same contract | Metadata / doc inspection | current package versions, checked-in manifest, README | Passed |
| `AV-006` | `AC-006` | Rollback behavior remains intact when runtime activation fails after downloading a newer artifact | GraphQL e2e | `managed-messaging-gateway-update-graphql.e2e.test.ts` | Passed |
| `AV-007` | Extra hardening | Runtime rejects semver release-tag drift instead of silently reusing stale install metadata | Unit / manifest-service validation | `messaging-gateway-release-manifest-service.test.ts` | Passed |

## Execution Log

- 2026-03-10: Stage 7 initialized after Stage 6 implementation verification passed.
- 2026-03-10: Disposable-clone release smoke passed with `scripts/desktop-release.sh release 1.2.41 --no-push`, producing synchronized `autobyteus-web/package.json`, `autobyteus-message-gateway/package.json`, and bundled manifest metadata for `v1.2.41`.
- 2026-03-10: Disposable-clone negative validation checks passed by rejecting a mismatched gateway package version and a mismatched bundled manifest `artifactVersion` for `v1.2.41`.
- 2026-03-10: Current checkout metadata inspection confirmed synchronized runtime identity: `web=1.2.40`, `gateway=1.2.40`, `releaseTag=v1.2.40`, `artifactVersion=1.2.40`.
- 2026-03-10: Stage 7 GraphQL acceptance rerun passed: `tests/e2e/messaging/managed-messaging-gateway-update-graphql.e2e.test.ts` (`3` tests, `16.17s`).
- 2026-03-10: Extra hardening coverage remains green via `tests/unit/managed-capabilities/messaging-gateway/messaging-gateway-release-manifest-service.test.ts` (`3` tests).

## Detailed Evidence

| Scenario ID | Command / Evidence | Result | Notes |
| --- | --- | --- | --- |
| `AV-001` | Disposable clone release smoke using `bash scripts/desktop-release.sh release 1.2.41 --release-notes <temp-file> --branch <current-branch> --no-push` | Passed | Observed `release-smoke synced web=1.2.41 gateway=1.2.41 releaseTag=v1.2.41 artifactVersion=1.2.41`, release commit `chore(release): bump workspace release version to 1.2.41`, and local tag `v1.2.41` |
| `AV-002` | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/messaging/managed-messaging-gateway-update-graphql.e2e.test.ts` | Passed | `updates to a newer runtime while preserving the disabled state` |
| `AV-003` | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/messaging/managed-messaging-gateway-update-graphql.e2e.test.ts` | Passed | `restarts the managed runtime when update is requested on the latest compatible version` |
| `AV-004` | Disposable-clone drift checks for workflow validation snippet and `node autobyteus-message-gateway/scripts/build-runtime-package.mjs --check-release-manifest --release-tag v1.2.41` | Passed | Observed `package-drift-check rejected mismatched gateway version` and `manifest-drift-check rejected mismatched artifact version` |
| `AV-005` | `node -e "const web=require('./autobyteus-web/package.json').version; const gateway=require('./autobyteus-message-gateway/package.json').version; const manifest=require('./autobyteus-server-ts/src/managed-capabilities/messaging-gateway/release-manifest.json').releases[0]; console.log(JSON.stringify({web,gateway,releaseTag:manifest.releaseTag,artifactVersion:manifest.artifactVersion,downloadUrl:manifest.downloadUrl}, null, 2));"` plus [`README.md`](../../README.md) | Passed | Checked-in runtime identity and release docs now describe the same synchronized version contract |
| `AV-006` | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/messaging/managed-messaging-gateway-update-graphql.e2e.test.ts` | Passed | `rolls back to the previous active version when update activation fails` |
| `AV-007` | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/managed-capabilities/messaging-gateway/messaging-gateway-release-manifest-service.test.ts` | Passed | Confirms synchronized semver releases load, semver drift is rejected, and non-release test tags remain supported |
