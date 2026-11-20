# API/E2E Test Progress — ios-xcode27-sdk-571 (autobyteus-571)

| Time (UTC) | Case ID | Event | Result | Notes |
| --- | --- | --- | --- | --- |
| 2026-11-20T12:30:07Z | FS-LOCAL | Started | — | fresh clone `~/.cache/abtest571/fs` at `b03bb0e609` |
| 2026-11-20T12:34:21Z | FS-LOCAL | Completed | Pass | `FS-LOCAL.log`: 0 prior build folders; mode 100755 kept; the default 27.2 path refused as missing (installed apps listed); real Xcode 26.1.1 refused; GITHUB_ENV 0 bytes both times; contract check passed |
| 2026-11-20T12:34:21Z | PR-01 | Started | — | stand-in xcodebuild/xcrun, fresh clone's script |
| 2026-11-20T12:34:30Z | PR-01 | Completed | Pass | `PR-01-standins.log`: 3 accepted (27.2, 27.0, 28.0), 6 refused before export; tool failures exit 1 with the tool's own message (no ::error:: line) |
| 2026-11-20T12:34:30Z | GH-01 | Started | — | read-only: gh run view 44730865039 |
| 2026-11-20T12:35:19Z | GH-01 | Completed | Pass | `GH-01-run-44730865039.log`: head e3950f9d07, input publish false; xcode-27-arm64; Xcode 27.2 (27B52) / SDK 27.2; DEVELOPER_DIR Xcode_27.2 in every later step; only Xcode_27.2.app, iPhoneSimulator27.2.sdk, iPhoneOS27.2.sdk named; build, 56 core, 8 smoke pass; publish jobs skipped |
| 2026-11-20T12:35:19Z | GH-02 | Started | — | read-only: runs, releases, tags |
| 2026-11-20T12:36:24Z | GH-02 | Completed | Pass | `GH-02-no-release.log`: runs 44730865039 and P-01 44725773809, both publish jobs skipped; no tag at e3950f9d07/b03bb0e609; newest release v1.5.14-beta.3 (before this ticket) |
| 2026-11-20T12:36:24Z | R-IMP01 | Reuse checked | Reused (Pass) | `git diff --name-only e3950f9d07 b03bb0e609`: ticket documents only |
| 2026-11-20T12:36:24Z | — | Cleanup | — | `~/.cache/abtest571` (clone, stand-ins, the downloaded run log) removed |
