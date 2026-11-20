# Docs Sync Report — ios-xcode27-sdk-571 (autobyteus-571)

## Scope

- Ticket: `ios-xcode27-sdk-571` (Project Task `autobyteus-571`), `task_size` `Small`, `architectural_risk` `Low`, route `Direct Low-Risk` (implementation IR-001 → API/E2E API-REV-001 Pass, 94%; test-code review `Not Required — direct low-risk route`).
- Bootstrap base: `origin/personal` @ `fa6632cbca`. Integrated base for docs sync: `origin/personal` @ `bfd95f73a9` (beta.3's ticket records only), merged as `68467597d0`.

## Why Docs Were Updated

- The iOS release workflow now runs both macOS jobs on GitHub's `xcode-27` image with `/Applications/Xcode_27.2.app`, and `autobyteus-ios/scripts/select-release-xcode.sh` refuses an Xcode or iPhoneOS SDK below 27 (ITMS-90725).

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `RELEASE.md` | The iOS release section names the runner, the Xcode default and the guard | No change by delivery (already updated in `e3950f9d07`) | Line 523 matches the workflow (`runs-on: xcode-27`, `Xcode_27.2.app`) and the script (major 27 for Xcode and SDK, the log lines). |
| `autobyteus-ios/README.md` | `IOS_XCODE_APP_PATH` default and the selection rule | No change by delivery (already updated) | Lines 134 and 139 match the workflow and the script, including the installed-apps list on a missing path. |
| `docs/ios_mobile_access.md` | The iOS guide's release workflow section | No change | It states no Xcode version or runner; its variables list never named `IOS_XCODE_APP_PATH` (the README holds it). |
| `TESTING.md`, `DESIGN.md` | Release contract and gate rules | No change | No command changed; the contract check keeps its command. |

- Search on the merged state outside `tickets/` for `Xcode 26`, `Xcode_26`, `26 or newer`, `macos-latest` in the docs: no stale statement. The only `Xcode_26` / `Xcode 26` left is the contract check's own list of stale strings it refuses (`ios-release-contract-check.py:194`).

## Docs Updated

- None by delivery; the implementation's doc changes are correct on the merged state.

## Out-Of-Scope Findings

- None new (FU-001, the simulator choice, stays the Solution Designer's).
