# Handoff Summary — ios-icon-compliance-594 (autobyteus-594)

## Summary Meta

- Ticket: `ios-icon-compliance-594` (Project Task `autobyteus-594`, related autobyteus-592): the iOS app icon from the product logo; export compliance declared.
- Date: `2026-11-21`
- Classification: `task_size: Medium`, `architectural_risk: Low`; route `Direct Low-Risk` (IR-001 → API-REV-001 Pass 95% → DR-001); test-code review `Not Required`.
- Current Status: `Verified from evidence / finalized on personal; no release` (beta.6 waits for the founder's word).
- Branch: `codex/ios-icon-compliance-594`, base `origin/personal` @ `9aeaf46aa9` (current at delivery); code `f0e6d1eb33`.

## Delivery Summary

- All 18 iOS icon slots are generated from `autobyteus-web/public/autobyteus-icon.svg`: the mark on a full #1E3A8A square, as on Android (DEC-001), exact sizes, no alpha (`pnpm --dir autobyteus-web ios-icon:build`).
- `ios-icon:check` fails on a missing slot, a wrong size, alpha, or pixels off the logo; the release workflow's `build-ios` job runs it before building; the contract check also enforces size and alpha.
- `Info.plist` declares `ITSAppUsesNonExemptEncryption = false` (DEC-002), enforced by the contract check.
- The temporary branch `codex/autobyteus-592-ios-product-icon` is deleted after the merge (AC-005, DEC-003: its PNGs were not adopted).
- Docs: the iOS README and TESTING.md (implementation); RELEASE.md's iOS reference (delivery).

## Verification Summary

- Verified from evidence; no user check needed; no accepted unverified risk (no `DEC-*` accepts one; DEC-001…003 are design decisions).
- `evidence/api-e2e/GH-01-run-44894079363.log`: `xcode-27-arm64`, "Check the app icon against the logo" success, all 18 "matches (max 0, mean 0.000)"; asset catalog 0 warnings; core 56/56, smoke 8/8; publish skipped. (AC-003)
- `FS-iOS.log`: a fresh frozen install runs `ios-icon:check` 18/18; `sips` exact sizes, no alpha; Debug and Release-device builds `"ITSAppUsesNonExemptEncryption" => false`; `Assets.car` 23 AppIcon renditions `opaque=True`, incl. `AppIcon-1024.png 1024x1024 … idiom=marketing`. (AC-001, AC-004)
- `FT-01-faults.log`: a changed pixel (max 211), a deleted slot, alpha, a 1000×1000 icon, a recolored SVG, the key removed or `true`: each fails as specified. (AC-002, AC-004)
- `HS-01/iphone-home.png`, `ipad-home.png`: the green mark on navy on both home screens. (AC-001)
- `FS-DOCKER`, `FS-DESKTOP`: fresh clones pass (web `package.json` changed).
- AC-005: delivery's cleanup (below).

## Residual Risks For The User

- App Store Connect's own checks (the icon accepted; "Missing Compliance" gone) show only at the founder's next approved upload (beta.6).
- FU-001: Xcode's notice about the iPad 76x76@1x slot.
