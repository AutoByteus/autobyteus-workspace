# API/E2E Test Progress — followup-cleanups-568 (autobyteus-568)

| Time (UTC) | Case ID | Event | Result | Notes |
| --- | --- | --- | --- | --- |
| 2026-11-20T14:36:09Z | WEB-01 | Started | — | the Basics spec, worktree at 52e75f2357 |
| 2026-11-20T14:36:34Z | WEB-01 | Completed | Pass | `WEB-01-basics-spec.log`: 2/2 |
| 2026-11-20T14:36:34Z | CH-01 | Started | — | my simulator apie2e568-iphone created; the chooser on the real simctl |
| 2026-11-20T14:36:47Z | CH-01 | Completed | Pass | `CH-01-chooser-real-simctl.log`: default → 'iPhone 17' exactly (not Pro/Pro Max); my unique name → mine; a prefix of it → not mine, fallback notice; missing → fallback notice; nothing booted |
| 2026-11-20T14:36:47Z | GH-01 | Started | — | read-only: gh run view 44747687988 |
| 2026-11-20T14:37:02Z | GH-01 | Completed | Pass | `GH-01-run-44747687988.log`: head eb7e4bf2af; xcode-27-arm64, Xcode 27.2; 'Selected simulator: iPhone 17 (iOS 27.2)' in the step and the smoke (same UDID; image also has 27.0, 27.1); build, 56 core, 8 smoke; publish skipped |
| 2026-11-20T14:37:02Z | FS-DOCKER | Started | — | fresh clone ~/.cache/abtest568/fs-docker at 52e75f2357 |
| 2026-11-20T14:40:09Z | FS-DOCKER | Completed | Pass | `FS-DOCKER.log`: each step exit 0 |
| 2026-11-20T14:40:09Z | API-01 | Started | — | the FS-DOCKER clone's dist/app.js on loopback |
| 2026-11-20T14:40:24Z | API-01 | Completed | Pass | `API-01-schema.log`: removed mutation → 'Cannot query field "approveToolInvocation" on type "Mutation".'; no ApproveToolInvocation types; the other mutations and the out-of-scope fields served; temp root removed |
| 2026-11-20T14:40:24Z | E2E-01 | Started | — | autobyteus-native-tool-search.e2e, worktree, clean env |
| 2026-11-20T14:42:14Z | E2E-01 | Completed | Pass | `E2E-01-ws-approval.log`, `E2E-01-evidence/native-tool-search-e2e.json`: 1/1; 5 approvals over APPROVE_TOOL; unscripted [] |
| 2026-11-20T14:42:14Z | DL-01 | Started | — | the deadline case alone x10, machine's own load |
| 2026-11-20T14:43:04Z | DL-01 | Completed | Pass | `DL-01-deadline-x10.log`: 10/10 exit 0 at load ~68-72 |
| 2026-11-20T14:43:04Z | IOS-01 | Started | — | clone under /tmp; core tests; smoke on apie2e568-iphone (English) |
| 2026-11-20T14:55:04Z | IOS-01 | Completed | Pass | `IOS-01.log`: clone /tmp/abtest568/ios (physical /private/tmp/…); install, demo ("The demo answers all 249 compiled operations": 252 less the 3 removed), contract check, generate, core 56/0 incl. testOnlyTheStartUpCallSiteReferencesTheMigrationFolder; smoke 8/0 without skips on 'apie2e568-iphone (iOS 26.1)' chosen by exact name |
| 2026-11-20T14:55:59Z | FS-DESKTOP | Started | — | fresh clone ~/.cache/abtest568/fs-desktop at 52e75f2357 |
| 2026-11-20T15:05:33Z | FS-DESKTOP | Completed | Pass | `FS-DESKTOP.log`, `FS-DESKTOP-verify.log`: install; build:electron:mac arm64 376 s (typecheck production errors 0, test-file errors = baseline 87/37); DMG and zip; both verify steps exit 0 (Prisma arm64 engine, terminal runtime spawn probe) |
| 2026-11-20T15:06:52Z | — | Cleanup | — | ~/.cache/abtest568 (fs-docker, fs-desktop, run log) removed; /tmp/abtest568, my simulator and its DerivedData removed earlier |
