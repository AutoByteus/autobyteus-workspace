# Handoff Summary — ios-xcode27-sdk-571 (autobyteus-571)

## Summary Meta

- Ticket: `ios-xcode27-sdk-571` (Project Task `autobyteus-571`): iOS release builds use Xcode 27 and the iOS 27 SDK (App Store Connect's ITMS-90725 on Build 343, v1.5.14-beta.3).
- Date: `2026-11-20`
- Classification: `task_size: Small`, `architectural_risk: Low`; route `Direct Low-Risk` (IR-001 → API-REV-001 Pass 94% → DR-001); test-code review `Not Required`.
- Current Status: `Verified from evidence / finalized on personal; no release` (no upload, tag or release: REQ-005).
- Branch: `codex/ios-xcode27-sdk-571`, base `fa6632cbca`; code `e3950f9d07`; base refresh `bfd95f73a9` merged as `68467597d0`.

## Delivery Summary

- Both macOS jobs of `release-ios.yml` (`build-ios`, `upload-testflight`) run on `xcode-27` and select `/Applications/Xcode_27.2.app` (the newest released Xcode on the image; 27.3 is a beta App Store Connect refuses) through `IOS_XCODE_APP_PATH`, which stays an override.
- `autobyteus-ios/scripts/select-release-xcode.sh` is the one selection step: it fails the job before any build when the app is missing (listing the installed Xcode apps), or when the Xcode or its iPhoneOS SDK is below major 27, with an `::error::` naming what was found and where.
- `ios-release-contract-check.py` enforces the runner, the default, the shared step and the absence of Xcode 26 strings. RELEASE.md and the iOS README state the rule.

## Verification Summary

- Verified from evidence by delivery; no user check is needed to merge.
- `evidence/api-e2e/GH-01-run-44730865039.log`: build-only run on `e3950f9d07`: `Image: xcode-27-arm64`, "Selected Xcode app: /Applications/Xcode_27.2.app", "Xcode 27.2", "Selected iPhoneOS SDK: 27.2"; core `Executed 56 tests, with 0 failures`; smoke `Executed 8 tests, with 0 failures`; "iOS release contract checks passed." (AC-001)
- `FS-LOCAL.log`: fresh clone (0 prior build folders, mode 100755): the missing default refused, this Mac's Xcode 26.1.1 refused ("found '26.1.1'"), `GITHUB_ENV` 0 bytes both times; contract check passes. (AC-003, AC-004)
- `PR-01-standins.log`: 27.0/27.2/28.0 accepted; SDK 26.2 under Xcode 27.2, Xcode 26.3, unparsable version and empty SDK refused. (AC-003)
- `GH-02-no-release.log`: the branch's only runs skipped the archive/upload job; no tag on the ticket's commits; newest release v1.5.14-beta.3 predates the ticket. (AC-005)
- Merged state (`evidence/delivery/DEL-01-post-integration.log`): contract check passed; both typechecks PASS at their baselines.

## Residual Risks For The User

- AC-002's real archive with SDK 27 is proven only at the next founder-approved upload: its App Store Connect email should carry no ITMS-90725.
- GitHub drops old Xcode minors from the image over time: the guard then fails the job naming the installed apps; set the repository variable `IOS_XCODE_APP_PATH` to override.
- The next release's iOS job runs on `xcode-27` (iOS 27 simulators).
