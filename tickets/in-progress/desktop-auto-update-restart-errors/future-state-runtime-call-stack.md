# Future-State Runtime Call Stack

- Ticket: `desktop-auto-update-restart-errors`
- Version: `v1`
- Design Basis: `tickets/in-progress/desktop-auto-update-restart-errors/implementation-plan.md`
- Last Updated: `2026-03-04`

## Use Case Index

| use_case_id | Source Type | Maps To | Primary | Fallback | Error |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Requirement | R-001, R-002 | Yes | N/A | Yes |
| UC-002 | Requirement | R-002, R-003 | Yes | N/A | Yes |
| UC-003 | Requirement | R-003 | Yes | N/A | Yes |
| UC-004 | Requirement | R-003 | Yes | N/A | Yes |
| UC-005 | Requirement | R-004 | Yes | N/A | Yes |
| UC-006 | Requirement | R-005 | Yes | N/A | Yes |

## UC-001 Publish Stage Merges Mac Metadata Inputs

- Source: `Requirement`
- Objective: emit one canonical `latest-mac.yml` from both mac architecture lanes.

```text
[ENTRY] github/workflows/release-desktop.yml:jobs.publish-release.steps.download-artifacts
  -> actions/download-artifact@v4 downloads artifacts into release-artifacts/
  -> release-artifacts/macos-arm64/latest-mac.yml [IO read]
  -> release-artifacts/macos-x64/latest-mac.yml [IO read]
  -> github/workflows/release-desktop.yml:jobs.publish-release.steps.merge-mac-metadata [decision gate]
      condition: both files exist
      true  -> merge arm64.files + x64.files -> release-artifacts/latest-mac.yml [IO write]
      false -> fail publish job [error path]
[EXIT] canonical release-artifacts/latest-mac.yml exists with dual-arch file entries
```

## UC-002 Publish Validation Enforces Dual-Arch Entries

- Source: `Requirement`
- Objective: block release if either mac architecture zip entry missing.

```text
[ENTRY] github/workflows/release-desktop.yml:jobs.publish-release.steps.validate-mac-metadata
  -> read release-artifacts/latest-mac.yml [IO read]
  -> decision gate:
      contains "macos-arm64" zip entry? yes/no
      contains "macos-x64" zip entry? yes/no
      if both yes -> continue
      else -> exit 1 [error path]
[EXIT] publish path is guarded by deterministic dual-arch validation
```

## UC-003 x64 Client Resolves x64 Zip From Published Metadata

- Source: `Requirement`
- Objective: x64 mac updater can choose compatible zip file.

```text
[ENTRY] autobyteus-web/electron/updater/appUpdater.ts:downloadUpdate()
  -> electron-updater/MacUpdater.doDownloadUpdate():resolveFiles(updateInfo)
  -> files[] contains both arm64 + x64 URLs from latest-mac.yml
  -> MacUpdater arch filter: isArm64Mac=false => keep non-arm64 URLs [decision gate]
  -> Provider.findFile(files,"zip",["pkg","dmg"]) returns x64 zip
  -> download selected x64 zip [async IO]
  -> emit update-downloaded event
[EXIT] updater state transitions to downloaded for x64-compatible payload
```

## UC-004 arm64 Client Resolves arm64 Zip From Published Metadata

- Source: `Requirement`
- Objective: arm64 mac updater can choose compatible zip file.

```text
[ENTRY] autobyteus-web/electron/updater/appUpdater.ts:downloadUpdate()
  -> electron-updater/MacUpdater.doDownloadUpdate():resolveFiles(updateInfo)
  -> files[] contains both arm64 + x64 URLs from latest-mac.yml
  -> MacUpdater arch filter: isArm64Mac=true => keep arm64 URLs [decision gate]
  -> Provider.findFile(files,"zip",["pkg","dmg"]) returns arm64 zip
  -> download selected arm64 zip [async IO]
  -> emit update-downloaded event
[EXIT] updater state transitions to downloaded for arm64-compatible payload
```

## UC-005 Install Invocation Error Is Surfaced

- Source: `Requirement`
- Objective: synchronous install-trigger failure is visible to user.

```text
[ENTRY] autobyteus-web/electron/updater/appUpdater.ts:installUpdateAndRestart()
  -> precondition gate: state.status === "downloaded"
  -> applyState(message="Installing update and restarting...")
  -> setTimeout callback
      -> try autoUpdater.quitAndInstall(false, true)
      -> catch(error) => handleError(error, "Failed to install update and restart.")
          -> applyState(status="error", error=<message>, checkedAt=<iso>)
  -> broadcast app-update-state to renderer windows [IPC]
[EXIT] renderer store/toast displays actionable updater error
```

## UC-006 Local Non-Release Verification

- Source: `Requirement`
- Objective: verify fix without creating real public release.

```text
[ENTRY] local verification command set
  -> run metadata merge/validation command against local sample/generated arm64+x64 yml
  -> assert canonical latest-mac.yml contains both mac zip architectures
  -> run updater unit tests for install-error mapping
  -> run workflow/static lint checks as needed
  -> if any assertion fails => exit non-zero [error path]
[EXIT] deterministic local evidence confirms metadata + updater behavior
```
