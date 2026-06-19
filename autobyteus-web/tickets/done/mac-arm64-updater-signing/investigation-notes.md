# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirements approved by user; design spec produced; upstream package ready for architecture review.
- Investigation Goal: Determine the AutoByteus macOS updater install failure root cause, recent-onset timeline, signing/build-system implications, and design constraints for a fix.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The issue spans macOS packaging/signing policy, electron-builder configuration, Squirrel updater runtime behavior, bundled server native binary signing, release validation, and affected-user recovery guidance.
- Scope Summary: Fix future macOS signed builds so update-critical Squirrel/ShipIt and other non-app nested Mach-O code are signed without entitlements while app/helper executables retain required entitlements; add release validation; document why the bug surfaced recently and why manual fixed-DMG install may be required for already affected users.
- Primary Questions To Resolve:
  1. Does current repo signing configuration apply app entitlements to Squirrel and other nested binaries? Yes.
  2. Which owner/file should enforce Squirrel/no-entitlements signing? The macOS build/signing subsystem, with policy expressed in build signing configuration/hooks and verified before release upload.
  3. What validation should prevent release of another broken updater source app? A macOS packaged-app signing verifier that scans entitlement payloads and fails on non-app nested Mach-O code with entitlement keys.
  4. Why did the user only notice the failure recently? The invalid Squirrel inheritance is old/latent; recent close-spaced releases and active ZIP updater metadata exercised the updater install path, while recent server-native signing changes broadened AMFI visibility for native modules.
  5. Can an auto-update repair already-installed apps with broken Squirrel helpers? Not reliably, because the already-installed source app's Squirrel/ShipIt must execute first to apply the update.

## Request Context

The user reported that AutoByteus macOS arm64 auto-update downloaded `1.3.63` but failed to install/apply. AMFI logs identified the installed app's nested `Squirrel.framework/Versions/A/Squirrel` binary as having entitlements even though it is not a main binary. The user manually downloaded and installed the latest DMG to recover. The user also asked why this only started happening recently and requested that the ticket be bootstrapped strictly under the `solution-designer` workflow, without `workflow-state.md` or downstream implementation artifacts. On 2026-06-19 the user approved the broader best-practice macOS/Electron signing-policy requirements and added that the downstream API/E2E engineer is allowed to commit/push the ticket branch and manually trigger the GitHub desktop release workflow with publishing disabled to validate the build.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing/autobyteus-web/tickets/done/mac-arm64-updater-signing`
- Current Branch: `codex/mac-arm64-updater-signing`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/mac-arm64-updater-signing`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed during rebootstrap; `origin/personal` = `a9a02c416a81aff12fd5bc37d47fe2301db6469b`
- Task Branch: `codex/mac-arm64-updater-signing` at `a9a02c416a81aff12fd5bc37d47fe2301db6469b`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Previous non-solution-designer implementation attempt was preserved before reset at `/Users/normy/autobyteus_org/autobyteus-worktrees/.backups/mac-arm64-updater-signing-rebootstrap-20260619T134502Z`; current worktree was reset clean to `origin/personal` and contains only solution-designer artifacts.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-19 | Setup | Read `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/SKILL.md`, `design-principles.md`, and templates | Reload authoritative solution-designer workflow after user requested strict rebootstrap | Required dedicated worktree, requirements doc, investigation notes, design-ready requirements approval before design spec/handoff | No |
| 2026-06-19 | Command | `git fetch origin --prune`; `git reset --hard origin/personal`; targeted `git clean` of prior ticket/downstream artifacts | Rebootstrap dedicated ticket worktree from latest tracked base and remove prior workflow-state/downstream artifacts | Branch `codex/mac-arm64-updater-signing` reset clean to `origin/personal`; prior attempt backed up | No |
| 2026-06-19 | Other | User-provided AMFI/codesign brief | Establish initial failure evidence | Squirrel has app entitlements and AMFI blocks it as non-main binary; update ZIP downloaded/staged but install did not apply | No |
| 2026-06-19 | Code | `autobyteus-web/build/scripts/build.ts` lines 264-281 | Inspect mac signing config | `mac.entitlements` and `mac.entitlementsInherit` both point to `build/entitlements.mac.plist`; mac targets include `dmg` and `zip`; `signIgnore` skips server node_modules and comments that native Mach-O binaries are signed in `afterPack` | Yes, design must split entitlement policy |
| 2026-06-19 | Code | `autobyteus-web/build/entitlements.mac.plist` lines 1-24 | Inspect entitlement payload | Contains `allow-jit`, `allow-unsigned-executable-memory`, `disable-library-validation`, `network.client`, `network.server`, `audio-input` | Yes, keep app-level where appropriate only |
| 2026-06-19 | Code | `autobyteus-web/build/scripts/afterPack.ts` lines 79-155 | Inspect extra signing hook | `signFile` can include entitlements; current hook signs bundled server Mach-O binaries with `build/entitlements.mac.plist` | Yes, server native signing must stop using app entitlements |
| 2026-06-19 | Code | `autobyteus-web/electron/updater/appUpdater.ts` lines 76-78, 206-228, 286-300 | Inspect updater install flow | Uses `electron-updater`, sets `autoInstallOnAppQuit`, and calls `autoUpdater.quitAndInstall(false, true)` once download status is `downloaded` | No |
| 2026-06-19 | Code | `autobyteus-web/package.json`; `autobyteus-web/pnpm-lock.yaml` | Inspect dependency versions | Electron `^38.1.2`, electron-builder `^25.1.8`, electron-updater `^6.8.3`; lock has `app-builder-lib@25.1.8` and `@electron/osx-sign@1.3.1` | No |
| 2026-06-19 | Code | `node_modules/.pnpm/app-builder-lib@25.1.8.../node_modules/app-builder-lib/out/macPackager.js` lines 293-341 | Inspect electron-builder signing option selection | Root app uses `customSignOptions.entitlements`; child files use `customSignOptions.entitlementsInherit` when present. Therefore current config selects the full app entitlement file for children. | Yes, coarse global inheritance must be bypassed/replaced for non-app nested code |
| 2026-06-19 | Code | `node_modules/.pnpm/@electron+osx-sign@1.3.1/node_modules/@electron/osx-sign/dist/esm/util.js` lines 114-145 | Inspect recursive child discovery | `walkAsync` returns binary files and also app/framework bundle directories. | No |
| 2026-06-19 | Code | `node_modules/.pnpm/@electron+osx-sign@1.3.1/node_modules/@electron/osx-sign/dist/esm/sign.js` lines 132-242 | Inspect signing loop | Children are signed deepest first, and each `codesign` call includes `--entitlements` with the per-file entitlement path selected by electron-builder. | Yes, no-entitlement paths cannot be achieved by simply returning `undefined` from the current selected config path |
| 2026-06-19 | Code | `node_modules/.pnpm/@electron+osx-sign@1.3.1/node_modules/@electron/osx-sign/entitlements/default.darwin*.plist` | Inspect default helper entitlement examples | Defaults distinguish app/helper variants, confirming helper entitlement narrowing is normal. | Yes |
| 2026-06-19 | Code | `node_modules/.pnpm/app-builder-lib@25.1.8.../templates/entitlements.mac.plist` | Inspect electron-builder default entitlement fallback | The fallback template itself includes hardened runtime entitlements; removing only explicit `entitlementsInherit` would not guarantee no entitlements on all child code. | Yes |
| 2026-06-19 | Code | `node_modules/.pnpm/app-builder-lib@25.1.8.../node_modules/app-builder-lib/out/platformPackager.js` lines 255-270 and `macPackager.js` lines 274-289 | Inspect hook/sign/notarization order | `afterSign` runs after `signApp`; Mac `sign` calls notarization before returning. A repair in `afterSign` risks modifying signatures after notarization. | Yes, design should prefer pre-sign/custom sign before app sealing/notarization |
| 2026-06-19 | Command | `defaults read /Applications/AutoByteus.app/Contents/Info CFBundleShortVersionString`; `codesign -d --entitlements :- .../Squirrel`; `codesign -d --entitlements :- .../Resources/ShipIt` | Probe local installed app after user's manual DMG install | Installed app is `1.3.63`; Squirrel and ShipIt still have full app entitlement keys | Yes, a future fixed DMG is still needed |
| 2026-06-19 | Command | `find ~/Library/Caches/autobyteus-updater`; `find ~/Library/Caches/com.autobyteus.app.ShipIt` | Verify update artifacts/staged app | `AutoByteus_personal_macos-arm64-1.3.63.zip` is present in updater pending cache; staged `AutoByteus.app` exists under ShipIt cache | No |
| 2026-06-19 | Command | `codesign -d --entitlements :- ~/Library/Caches/com.autobyteus.app.ShipIt/update.jZMP6O3/AutoByteus.app/.../Squirrel`; sample `pty.node` | Inspect staged update app | Staged `1.3.63` app also has full app entitlements on Squirrel and server native `pty.node` | Yes, published artifact itself is broken |
| 2026-06-19 | Log | `log show --last 6h --predicate 'eventMessage CONTAINS "Squirrel" OR eventMessage CONTAINS "ShipIt" OR eventMessage CONTAINS "AMFI"' --style compact` | Verify current macOS AMFI behavior | Logs at 2026-06-19 15:08 show constraint violations for Squirrel and multiple framework/native binaries with entitlements; later log shows server `node-pty` violation | Yes, scope should cover non-app nested binaries broadly |
| 2026-06-19 | Command | `sw_vers`; `softwareupdate --history` | Check whether a very recent OS update likely caused the new behavior | macOS `26.2` build `25C56`; `macOS Tahoe 26.2` installed `25.01.2026`, not just in the last few days | No |
| 2026-06-19 | Repo | `git show` / `git tag --contains` for `b1c89884`, `b6d8f711`, `1e63398d` | Establish root-cause timeline | `b1c89884` introduced full inherited mac entitlements (`v1.1.9`); `b6d8f711` introduced auto-update and ZIP (`v1.1.11`); `1e63398d` added audio entitlement (`v1.2.36`) | No |
| 2026-06-19 | Repo | `git log v1.3.58..HEAD -- autobyteus-web/build autobyteus-web/electron/updater .github/workflows/release-desktop.yml` | Check recent changes | Recent changes mostly release workflow/Linux/server-native signing; no evidence of a brand-new Squirrel signing change on 2026-06-19 | No |
| 2026-06-19 | Repo | `git show 4e0ea798`, `0c40c56b`, `c45ed6fc` | Identify recent AMFI visibility changes | 2026-06-18/19 changes added packaged terminal runtime checks and server native signing/skip behavior; these can explain broader server-native AMFI logs, but Squirrel inheritance predates them | No |
| 2026-06-19 | Repo | `gh release view` for `v1.1.9`, `v1.1.10`, `v1.1.11`, `v1.3.59`-`v1.3.63`; `gh release download -p latest-mac.yml` | Verify release assets and updater metadata timeline | `v1.1.9`/`v1.1.10` had DMG-only `latest-mac.yml`; `v1.1.11` added ZIP and `latest-mac.yml` path to ZIP; `v1.3.61`-`v1.3.63` were published on 2026-06-19 with macOS arm64/x64 ZIP assets | No |
| 2026-06-19 | Code | `.github/workflows/release-desktop.yml` lines 119-240, 243-365, 604-616 | Inspect release validation placement | macOS ARM64/x64 jobs build and upload artifacts; publish job only validates merged `latest-mac.yml` contains ZIPs. There is no macOS signing-entitlement verifier before upload. | Yes |
| 2026-06-19 | Web | `https://www.electron.build/docs/mac` | Check electron-builder macOS signing configuration guidance | Documents separate mac app entitlements and child/inherited entitlements, and notes Squirrel.Mac auto update requires both DMG and ZIP targets | No |
| 2026-06-19 | Web | `https://www.electron.build/docs/features/code-signing/notarization/` | Check electron-builder notarization/hardened runtime guidance | Notarization requires hardened runtime, and entitlements are the explicit exceptions for process capabilities | No |
| 2026-06-19 | Web | `https://www.electronforge.io/guides/code-signing/code-signing-macos` | Check Electron Forge/@electron/osx-sign code-signing guidance | Electron packaging guidance relies on `@electron/osx-sign` defaults/examples rather than one broad app entitlement file for every nested binary | No |
| 2026-06-19 | Web | `https://developer.apple.com/documentation/security/hardened-runtime`; `https://developer.apple.com/documentation/xcode/creating-distribution-signed-code-for-the-mac` | Check Apple hardened runtime and entitlement model | Apple frames entitlements as executable permissions/exceptions under signed/hardened runtime code | No |
| 2026-06-19 | Other | User approval message | Lock requirements and record downstream validation permission | User approved the best-practice signing-policy direction and stated API/E2E may commit/push and manually trigger GitHub workflow build validation | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Packaged Electron app update install flow invokes embedded Squirrel/ShipIt helper from the already-installed app.
- Current execution flow: Installed AutoByteus app checks/downloads update via `electron-updater` -> update ZIP is staged in updater/ShipIt cache -> user accepts install/restart -> `autoUpdater.quitAndInstall(false, true)` asks Squirrel/ShipIt to apply staged app -> Squirrel/ShipIt should swap staged app into `/Applications` -> app relaunches.
- Ownership or boundary observations:
  - `electron/updater/appUpdater.ts` owns UI/runtime update state and install command initiation.
  - `build/scripts/build.ts` owns electron-builder macOS signing config and artifact targets.
  - `build/scripts/afterPack.ts` owns current extra resource signing for bundled server binaries.
  - GitHub release workflow owns pre-upload validation but currently checks metadata and runtime basics, not entitlement layout.
- Current behavior summary: Download can succeed while install fails if the source app's embedded updater helper is rejected by AMFI. The current signed artifact also places app-level entitlements on many other non-app nested Mach-O files, causing broader AMFI constraint violations.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Packaging Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant / Boundary Or Ownership Issue
- Refactor posture evidence summary: Signing policy must stop treating all child binaries as app-like entitlement consumers; `afterPack.ts` must stop duplicating full-app entitlement signing for server native binaries; release validation must make no-entitlements-on-non-app-nested-code a release invariant.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User AMFI log | Squirrel has entitlements but is not main binary | Signing boundary/invariant is wrong for updater helper | Fix signing policy and verify Squirrel/ShipIt |
| Local installed app probe | Installed `1.3.63` Squirrel and ShipIt print full app entitlements | Manual reinstall recovered version but did not fix future source-app updater health | Future fixed DMG/manual install still needed |
| `log show` | AMFI violations occur for frameworks, dylibs, Squirrel, server `.node` modules | Bug is broader than one Squirrel file; Squirrel is the install-critical symptom | Verification should scan all non-app nested Mach-O |
| `build.ts` | `entitlementsInherit` equals app entitlements | Broad child inheritance is the primary Squirrel/framework cause | Split or bypass inheritance for non-app children |
| `afterPack.ts` | Server binaries are signed with app entitlements | Recent changes widened invalid entitlements to server native modules | Change server native signing to no-entitlements |
| `app-builder-lib` / `osx-sign` source | Child paths are recursively signed with selected entitlements | Coarse built-in config is not enough for path-specific no-entitlements | Design custom/pre-sign path and verifier |
| Release metadata | ZIP assets and latest-mac.yml path to ZIP exist in recent releases | Update download path is valid; failure is install/apply | Do not treat as missing download |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/build/scripts/build.ts` | Electron-builder build configuration and target selection | Uses full app entitlements for both `entitlements` and `entitlementsInherit`; defines `signIgnore` and mac `dmg`/`zip` targets | Needs explicit signing policy projection; cannot leave broad inheritance as authoritative for children |
| `autobyteus-web/build/entitlements.mac.plist` | App entitlement payload | Contains app/runtime/network/audio keys | Should remain app-level, not be reused blindly for non-app nested code |
| `autobyteus-web/build/scripts/afterPack.ts` | Pre-sign hook for server native resources and execute-bit normalization | Signs server Mach-O binaries with app entitlements | Should become or use a mac signing policy owner for no-entitlement nested code, or be split if responsibilities grow too broad |
| `autobyteus-web/electron/updater/appUpdater.ts` | In-app update state and install command | Uses `autoUpdater.quitAndInstall(false, true)` after download | Runtime updater path is not the bug; source app's embedded Squirrel signing is |
| `.github/workflows/release-desktop.yml` | Desktop release build/upload validation | Builds mac ARM64/x64 and verifies some runtime/metadata, but not entitlement layout | Must run mac signing verifier before upload |
| `scripts/merge_latest_mac_metadata.py` | Merge mac updater metadata | Ensures both arch ZIPs in merged `latest-mac.yml` | Related metadata path is healthy; not the failed install cause |
| `node_modules/.pnpm/app-builder-lib@25.1.8.../out/macPackager.js` | Electron-builder mac signing option selector | Uses inherited entitlements for child paths | Confirms why current config causes invalid child entitlements |
| `node_modules/.pnpm/@electron+osx-sign@1.3.1.../dist/esm/sign.js` | Recursive code signing implementation | Signs children deepest first with `--entitlements` | Confirms order constraints and need for path-specific signing strategy |
| `/Applications/AutoByteus.app` | Current installed app | Version `1.3.63`; still has invalid nested entitlements | Affected source app remains unsafe for future auto-update until fixed artifact installed |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-19 | Probe | `defaults read /Applications/AutoByteus.app/Contents/Info CFBundleShortVersionString` | Installed app version is `1.3.63` after manual install | Manual install updated app version |
| 2026-06-19 | Probe | `codesign -d --entitlements :- /Applications/AutoByteus.app/Contents/Frameworks/Squirrel.framework/Versions/A/Squirrel` | Full app entitlement keys printed | Future auto-update source app may still fail |
| 2026-06-19 | Probe | `codesign -d --entitlements :- /Applications/AutoByteus.app/Contents/Frameworks/Squirrel.framework/Versions/A/Resources/ShipIt` | Full app entitlement keys printed | ShipIt should be included in fix/verification |
| 2026-06-19 | Probe | `file /Applications/AutoByteus.app/.../Squirrel`; `file .../Resources/ShipIt` | Squirrel is Mach-O arm64 shared library; ShipIt is Mach-O arm64 executable | Both are code signing targets |
| 2026-06-19 | Probe | `find ~/Library/Caches/autobyteus-updater`; `find ~/Library/Caches/com.autobyteus.app.ShipIt` | Pending ZIP and staged app exist | Download/staging succeeded |
| 2026-06-19 | Probe | `codesign -d --entitlements :- ~/Library/Caches/com.autobyteus.app.ShipIt/update.jZMP6O3/AutoByteus.app/.../Squirrel` | Staged `1.3.63` Squirrel also has full app entitlements | Published target artifact is broken too |
| 2026-06-19 | Probe | `codesign -d --entitlements :-` on staged `node-pty` `pty.node` | Server native module has full app entitlements | Broader build signing problem confirmed |
| 2026-06-19 | Log | `log show --last 6h ...` | At 15:08 local time, AMFI logged constraint violations for Electron Framework, Squirrel, ReactiveObjC, Mantle, libffmpeg, libGLESv2, libEGL, fsevents, Prisma, and later node-pty | Scope should target no entitlements on non-app nested code broadly |
| 2026-06-19 | Probe | `sw_vers`; `softwareupdate --history` | macOS `26.2`; Tahoe 26.2 installed `25.01.2026` | No evidence that a macOS update in the last few days alone caused the recent failure |

## External / Public Source Findings

- Public API / spec / issue / upstream source: Local installed dependency source for `app-builder-lib@25.1.8` and `@electron/osx-sign@1.3.1` is the exact code path in this repository and remains the strongest implementation evidence. Official Electron/electron-builder/Apple pages were also checked for the packaging baseline.
- Version / tag / commit / freshness: Dependency versions are from current `pnpm-lock.yaml` and local `node_modules` in this worktree; web docs were consulted on 2026-06-19.
- Relevant contract, behavior, or constraint learned:
  - `app-builder-lib` selects `entitlementsInherit` for non-root child files when present.
  - `@electron/osx-sign` recursively signs binary files and framework/app bundles, deepest first.
  - `@electron/osx-sign` executes `codesign ... --entitlements <selected-file> <filePath>` for each signed file.
  - electron-builder macOS documentation distinguishes main app entitlements from inherited/child entitlements and requires both DMG and ZIP for Squirrel.Mac auto-update.
  - electron-builder notarization guidance ties macOS distribution to hardened runtime and explicit entitlement exceptions.
  - Apple documentation treats entitlements as permissions for signed executables under the hardened runtime model.
- Why it matters: The repo's broad `entitlementsInherit` value and afterPack server signing policy are sufficient to explain the observed entitlement payload on Squirrel and other nested binaries. The target design should therefore follow the industry-standard least-privilege signing model instead of adding a Squirrel-only workaround.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Full validation requires signed macOS release artifacts built on macOS with Apple Developer signing identity/secrets. Investigation used local installed app, local staged update cache, local repo source, and GitHub release metadata.
- Required config, feature flags, env vars, or accounts: `APPLE_SIGNING_IDENTITY`, Apple ID/password/team or equivalent notarization secrets are needed downstream for signed release proof.
- External repos, samples, or artifacts cloned/downloaded for investigation: No external repo cloned. GitHub release metadata and `latest-mac.yml` assets were read with `gh` from `AutoByteus/autobyteus-workspace`.
- Setup commands that materially affected the investigation: Dedicated worktree reset to `origin/personal` after backing up the prior non-solution-designer attempt.
- Cleanup notes for temporary investigation-only setup: Temporary command outputs were written under `/tmp`; authoritative notes are captured in this file.

## Findings From Code / Docs / Data / Logs

### Current repo signing configuration

`autobyteus-web/build/scripts/build.ts` currently configures macOS signing as:

- `target: ['dmg', 'zip']`
- `identity: process.env.APPLE_SIGNING_IDENTITY || null`
- `hardenedRuntime: true`
- `entitlements: 'build/entitlements.mac.plist'`
- `entitlementsInherit: 'build/entitlements.mac.plist'`
- `signIgnore` skips server node_modules while stating native Mach-O binaries are signed explicitly in `afterPack`.

This means the app entitlement file is the inherited child entitlement file.

### App entitlement payload

`autobyteus-web/build/entitlements.mac.plist` contains:

- `com.apple.security.cs.allow-jit`
- `com.apple.security.cs.allow-unsigned-executable-memory`
- `com.apple.security.cs.disable-library-validation`
- `com.apple.security.network.client`
- `com.apple.security.network.server`
- `com.apple.security.device.audio-input`

These keys are reasonable app-level/runtime keys, but they should not be blindly applied to non-app nested Mach-O code.

### Server native signing hook

`autobyteus-web/build/scripts/afterPack.ts` signs discovered server Mach-O binaries using:

`codesign --sign <identity> --force [--timestamp] --options runtime --entitlements build/entitlements.mac.plist <file>`

This duplicates the same invalid app-entitlement policy for server native binaries.

### Updater runtime path

`autobyteus-web/electron/updater/appUpdater.ts` sets `autoUpdater.autoDownload = false`, `autoUpdater.autoInstallOnAppQuit = true`, downloads updates on demand, and calls `autoUpdater.quitAndInstall(false, true)` after `update-downloaded`. This supports the user-provided sequence: download/staging can succeed while install/apply fails when the installed source app's Squirrel helper is blocked.

### Dependency signing behavior

`app-builder-lib@25.1.8` `macPackager.getOptionsForFile` uses root `entitlements` for the root `.app`; for child files it uses `entitlementsInherit` when configured. `@electron/osx-sign@1.3.1` `walkAsync` includes binary files and framework/app bundles; the signing loop signs each child deepest first and includes `--entitlements` for the selected per-file entitlements.

### Local installed/staged app observations

The current installed app and staged app both show invalid entitlement payloads:

- Installed `/Applications/AutoByteus.app` is version `1.3.63`.
- Installed `Squirrel.framework/Versions/A/Squirrel` prints the full app entitlement payload.
- Installed `Squirrel.framework/Versions/A/Resources/ShipIt` prints the full app entitlement payload.
- Staged ShipIt cache `AutoByteus.app` is version `1.3.63` and has the same Squirrel entitlement payload.
- Staged bundled server `node-pty` `pty.node` also has the same entitlement payload.

### AMFI log observations

`log show` on 2026-06-19 showed, among other noise, these relevant AutoByteus constraint violations:

- `/Applications/AutoByteus.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework has entitlements but is not a main binary`
- `/Applications/AutoByteus.app/Contents/Frameworks/Squirrel.framework/Versions/A/Squirrel has entitlements but is not a main binary`
- `/Applications/AutoByteus.app/Contents/Frameworks/ReactiveObjC.framework/Versions/A/ReactiveObjC has entitlements but is not a main binary`
- `/Applications/AutoByteus.app/Contents/Frameworks/Mantle.framework/Versions/A/Mantle has entitlements but is not a main binary`
- `/Applications/AutoByteus.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries/libffmpeg.dylib has entitlements but is not a main binary`
- `/Applications/AutoByteus.app/Contents/Resources/server/node_modules/.../fsevents.node has entitlements but is not a main binary`
- `/Applications/AutoByteus.app/Contents/Resources/server/node_modules/.../.prisma/client/libquery_engine-darwin-arm64.dylib.node has entitlements but is not a main binary`
- `/Applications/AutoByteus.app/Contents/Resources/server/node_modules/.../node-pty/build/Release/pty.node has entitlements but is not a main binary`

This confirms the fix should enforce a bundle-wide non-app-nested-code invariant, while still highlighting Squirrel as the updater-install-critical failure.

### Recent-onset timeline

- `2026-02-26`: `b1c89884` introduced `build/entitlements.mac.plist` and configured `entitlementsInherit: 'build/entitlements.mac.plist'`; first containing tag is `v1.1.9`. At that point mac target was `['dmg']`.
- `2026-02-27`: `b6d8f711` added `electron-updater`, mac ZIP targets, and GitHub Releases updater metadata; first containing tag is `v1.1.11`. `v1.1.11` `latest-mac.yml` points to the ZIP first.
- `2026-03-10`: `1e63398d` added `audio-input` to the same entitlement file; first containing tag is `v1.2.36`. This widened the entitlement payload but did not create the original inheritance bug.
- `2026-06-18`: `4e0ea798` expanded packaged terminal runtime verification and adjusted `afterPack.ts`, including server native signing behavior; this is a plausible reason for newly visible server native AMFI violations.
- `2026-06-19`: `v1.3.61` published at `2026-06-19T07:39:45Z`, `v1.3.62` at `2026-06-19T11:25:58Z`, and `v1.3.63` at `2026-06-19T11:52:33Z`. Release assets include macOS arm64/x64 ZIPs and merged `latest-mac.yml`, so the auto-update install/apply path was exercised in rapid succession.
- macOS `26.2` was installed on this machine on `2026-01-25`, so there is no evidence from local update history that a macOS update in the last few days alone caused the 2026-06-19 failure.

Conclusion: the Squirrel updater signing bug is an older latent packaging bug, most likely present since the mac updater ZIP path became usable in `v1.1.11`. It became visible recently because recent releases gave the installed app a real update to download/apply, and because newer release/build changes broadened AMFI-signing visibility for native modules. The current evidence does not point to user error, a missing download, or a new 2026-06-19 Squirrel-specific code change.

## Constraints / Dependencies / Compatibility Facts

- Squirrel/ShipIt are launched from the already-installed source app during update apply; a broken source app cannot reliably install a fixed target app by auto-update.
- macOS release validation must be done on macOS with signing tools and release identities.
- The fix must preserve strict code signing and Gatekeeper/notarization behavior.
- `afterSign` is risky as a repair point because signing/notarization order in current electron-builder source places notarization before the global `afterSign` hook.
- Existing release workflow validates `latest-mac.yml` ZIP metadata but not nested entitlement layout.
- Intel working behavior is not proof of correctness; the invalid entitlement payload is present on both architecture families unless fixed.

## Open Unknowns / Risks

- Exact implementation should choose between extending the pre-signing hook plus `signIgnore` patterns or replacing mac signing with a custom signing function. Architecture review should pay particular attention to signing order and notarization ordering.
- Helper app entitlement narrowing needs validation on both arm64 and x64 so Electron renderer/GPU/helper behavior remains healthy.
- A bundle-wide no-entitlement verifier may initially expose additional paths that require signing policy handling.
- Delivery may need explicit release/support instructions for users currently on a broken installed app.

## Notes For Architect Reviewer

- The requirements intentionally broaden the fix beyond Squirrel-only because local AMFI logs and staged artifact probes show the same invalid app entitlement payload on frameworks, dylibs, and server native modules.
- Squirrel and ShipIt remain explicitly called out because they are the critical auto-update apply path.
- Review should reject designs that only re-sign Squirrel after notarization or only check Squirrel while leaving the global inherited entitlement policy in place.
- Review should also reject designs that solve by adding compatibility fallback update paths; affected users should install one fixed DMG rather than depending on a broken source updater.
