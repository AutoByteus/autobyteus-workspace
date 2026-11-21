# Docs Sync Report — ios-icon-compliance-594 (autobyteus-594)

## Scope

- Ticket `ios-icon-compliance-594` (Project Task `autobyteus-594`), `task_size` `Medium`, `architectural_risk` `Low`, route `Direct Low-Risk` (IR-001 → API-REV-001 Pass 95%; test-code review `Not Required — direct low-risk route`).
- Base: `origin/personal` @ `9aeaf46aa9`, unchanged at delivery (the branch's merge-base), so docs sync ran on the validated state.

## Why Docs Were Updated

- The iOS app icon set is now generated from the product logo and checked against it in the release workflow (`ios-icon:build` / `ios-icon:check`), and the app's Info.plist declares `ITSAppUsesNonExemptEncryption = false`.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-ios/README.md` | The icon commands, the release gate, the compliance key | No change by delivery (already updated in `f0e6d1eb33`) | "App icon" and "Export compliance" match `build-ios-app-icon.mjs`, the workflow's step and the contract check, including when to revisit the key. |
| `TESTING.md` | Rerun by impact for the logo, the icon set and Info.plist | No change by delivery (already updated) | The row names `ios-icon:check` and the contract check. |
| `RELEASE.md` (Workflow Reference, iOS) | Lists what the iOS release workflow gates | **Updated** | It did not mention the icon gate in `build-ios` or the compliance declaration; one line added. |
| `docs/ios_mobile_access.md` | The iOS guide's release and App Review notes | No change | It defers workflow detail to the README; nothing it states changed. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `RELEASE.md` | Addition | The `build-ios` job checks the icon set against the logo before building; Info.plist declares `ITSAppUsesNonExemptEncryption = false` | The workflow gained this gate in `f0e6d1eb33` |

## Out-Of-Scope Findings

- None new; FU-001 (the iPad 76x76@1x slot notice) stands.
