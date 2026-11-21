# API/E2E Test Progress — ios-icon-compliance-594 (autobyteus-594)

| Time (UTC) | Case ID | Event | Result | Notes |
| --- | --- | --- | --- | --- |
| 2026-11-21T10:51:32Z | GH-01 | Started | — | read-only: gh run view 44894079363 |
| 2026-11-21T10:52:30Z | GH-01 | Completed | Pass | `GH-01-run-44894079363.log`: head f0e6d1eb33; step 9 'Check the app icon against the logo' after the install (8) and before the demo (10): 18/18 max 0; asset catalog: 1 notice (FU-001), 0 warnings, 0 errors; build, 56 core, 8 smoke; publish skipped |
| 2026-11-21T10:52:30Z | FS-iOS | Started | — | fresh clone ~/.cache/abtest594/fs-ios at d9689619e6; simulators apie2e594-iphone/ipad created (English) |
| 2026-11-21T11:00:35Z | FS-iOS | Completed | Pass | `FS-iOS.log`: 0 prior folders; frozen install; icon check 18/18; demo; contract check; generate; Debug sim build; core 56/0; Release iphoneos unsigned build; sips 18x exact size, hasAlpha no, RGB; both apps ITSAppUsesNonExemptEncryption false, CFBundleIconName AppIcon; Assets.car AppIcon renditions opaque (23 in Release incl. 1024 marketing); asset catalog 0 warnings, 0 errors, 1 notice (FU-001) |
| 2026-11-21T11:00:35Z | FT-01 | Started | — | faults in the FS-iOS clone |
| 2026-11-21T11:01:29Z | FT-01 | Completed | Pass | `FT-01-faults.log`: baseline passes; (a2) one red pixel → max 211 fails; (b) missing, (c) alpha, (c2) 1000x1000 → both checks fail naming the slot; (d) recolored mark → 18/18 fail (max 193, mean ~47), then ios-icon:build → pass; (e) key removed, (e2) key true → contract check fails; restored → both pass. (a) itself saved alpha by my edit (recorded) |
| 2026-11-21T11:01:29Z | HS-01 | Started | — | the FS-iOS Debug app on my iPhone and iPad simulators |
| 2026-11-21T11:02:32Z | HS-01 | Completed | Pass | `HS-01/iphone-home.png`, `HS-01/ipad-home.png`: AutoByteus with the product mark on #1E3A8A on both home screens (and the iPad dock's recent slot) |
| 2026-11-21T11:02:32Z | FS-DOCKER | Started | — | fresh clone ~/.cache/abtest594/fs-docker |
| 2026-11-21T11:09:18Z | FS-DOCKER | Completed | Pass | `FS-DOCKER.log`: each step exit 0; clone removed |
| 2026-11-21T11:09:18Z | FS-DESKTOP | Started | — | fresh clone ~/.cache/abtest594/fs-desktop |
| 2026-11-21T11:20:17Z | FS-DESKTOP | Completed | Pass | `FS-DESKTOP.log`, `FS-DESKTOP-verify.log`: build:electron:mac arm64 489 s; typecheck PASS (production 0; test-file 86/36 = baseline); both verify steps exit 0 |
| 2026-11-21T11:21:23Z | — | Cleanup | — | simulators apie2e594-iphone/ipad deleted; ~/.cache/abtest594 (clones, DerivedData, assetutil dumps, run log) removed |
