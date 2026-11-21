# API/E2E Execution Coverage Report — ios-icon-compliance-594 (autobyteus-594): the iOS app icon from the product logo; export compliance

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: round 1; the implementation engineer's handoff IR-001 (direct route); HEAD `d9689619e6` (code `f0e6d1eb33`)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why: FT-01 (a) saved the edited PNG with alpha (my edit), so it showed the alpha rule; (a2) repeats it as RGB and shows the pixel rule. Recorded in the log.
- Evidence folder (absolute path): `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-icon-compliance-594/tickets/in-progress/ios-icon-compliance-594/evidence/api-e2e/`
  - `GH-01-run-44894079363.log`, `FS-iOS.log`, `FT-01-faults.log`, `HS-01/iphone-home.png`, `HS-01/ipad-home.png`, `FS-DOCKER.log`, `FS-DESKTOP.log`, `FS-DESKTOP-verify.log`
  - `scripts/` (temporary: `fs-ios.sh`, `ft-01.sh`, `fs-other.sh` and `fs-desktop-verify.sh` (from followup-cleanups-568))

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `d9689619e6` (code = `f0e6d1eb33`) | macOS 26.5.2 arm64, Xcode 26.1.1, Node 22.23.1, pnpm 10.28.2 | fresh clones (`git clone --no-local`, 0 prior folders) in `~/.cache/abtest594/{fs-ios,fs-docker,fs-desktop}` | the workflow's bundle ids; Release device build unsigned (`CODE_SIGNING_ALLOWED=NO`) |
| ENV-2 | `d9689619e6` | my simulators `apie2e594-iphone` (iPhone 17 Pro Max) and `apie2e594-ipad` (iPad Air 11-inch (M3)), iOS 26.1, English | the FS-iOS Debug simulator app, installed with `simctl install` | deleted afterwards |
| ENV-3 | `f0e6d1eb33` | GitHub `xcode-27-arm64`, Xcode 27.2 | build-only run 44894079363 (dispatched by the implementation engineer; read here with `gh`, read only) | `publish_app_store_connect=false` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-IMP | AC-001…004 | IMP-01…05 | IMP-01…IMP-05 | — | Reused (`Pass`) | `evidence/implementation/IMP-0*` | IMP-01's image; IMP-02/03 negatives | only documents changed after `f0e6d1eb33` |
| GH-01 | AC-003 | the iOS job on the runner | `gh run view 44894079363 --json …`/`--log` (7,256 lines), grepped | ENV-3 | `Pass` | `GH-01-run-44894079363.log` | `head f0e6d1eb33…`; `INPUT_PUBLISH_APP_STORE_CONNECT: false`; steps `8: Install workspace dependencies`, `9: Check the app icon against the logo: success`, `10: Build the bundled demo`; 18 lines "matches (max 0, mean 0.000)", "all 18 slots match the logo (on #1E3A8A)"; asset catalog "(diagnostic lines: 1; warnings: 0; errors: 0)", the one a notice on the iPad 76x76@1x slot (FU-001); contract check passed; `BUILD SUCCEEDED`; "Executed 56 tests, with 0 failures"; "Executed 8 tests, with 0 failures"; "without skips"; publish jobs `skipped` | my own reading of IMP-05 |
| FS-iOS | AC-001, AC-003, AC-004; SCN-A1, SCN-A2 | the `build-ios` steps after the Xcode gate, from a fresh clone; the archive's configuration | `scripts/fs-ios.sh <worktree> d9689619e6 ~/.cache/abtest594/fs-ios <evidence> apie2e594-iphone`: clone; `pnpm install --frozen-lockfile`; `pnpm --dir autobyteus-web ios-icon:check`; `prepare-demo-web.sh --build`; contract check; `generate-project.sh`; simulator build and core tests; `xcodebuild -configuration Release -sdk iphoneos CODE_SIGNING_ALLOWED=NO build`; `sips`, `plutil -p`, `xcrun assetutil --info` | ENV-1 | `Pass` | `FS-iOS.log` | `0 prior install/build folders`; "[ios-icon] all 18 slots match the logo (on #1E3A8A)." from the frozen install alone; "iOS release contract checks passed."; "Executed 56 tests, with 0 failures"; sips: 18 × exact size, `hasAlpha:no space:RGB`; both `Debug-iphonesimulator` and `Release-iphoneos` apps: `"ITSAppUsesNonExemptEncryption" => false`, `"CFBundleIconName" => "AppIcon"`; Release `Assets.car`: 23 AppIcon renditions, every image `opaque=True`, including `AppIcon-1024.png 1024x1024 … idiom=marketing`; asset catalog `(warnings: 0; errors: 0)` and the FU-001 notice | Xcode 26.1.1 here; the runner's Xcode 27.2 compiled the same catalog cleanly (GH-01) |
| FT-01 | AC-002, AC-004; SCN-002, SCN-A3 | the drift check and the contract check | `scripts/ft-01.sh ~/.cache/abtest594/fs-ios FT-01-faults.log`: each fault in the clone, then `git checkout` | ENV-1 | `Pass` | `FT-01-faults.log` | (a2) one red pixel in `AppIcon-1024.png`, RGB: `ios-icon:check exit=1` "its pixels differ … (max 211, mean 0.000)"; (b) deleted slot: "the file is missing" and the contract check "…which does not exist"; (c) alpha: "it has an alpha channel" and "found color type 6"; (c2) 1000×1000: "it is 1000x1000, not 1024x1024" and "…needs 1024x1024"; (d) the mark recolored: "18 of 18 slots do not match" (max 193, mean ≈47), then `ios-icon:build` → "all 18 slots match"; (e) key removed: "must declare ITSAppUsesNonExemptEncryption = false; found None."; (e2) key true: "found True."; after all: both pass | (a) as first run tested alpha (my edit added it); (a2) is the pixel case |
| HS-01 | AC-001; SCN-001 | the home screen | `simctl install` of the FS-iOS Debug app on both simulators; `simctl io <udid> screenshot` | ENV-2 | `Pass` | `HS-01/iphone-home.png`, `HS-01/ipad-home.png`; the desktop logo beside it in `evidence/implementation/IMP-01-icon-before-after-desktop-592.png` | "AutoByteus": the green mark on the navy square, the same mark as the desktop logo, inside iOS's rounded mask with no clipping of the dots; on iPad also in the dock's recent-app slot | the placeholder hexagon is gone |
| FS-DOCKER | SCN-A1 | the server image's builder stage | `scripts/fs-other.sh docker …` | ENV-1 | `Pass` | `FS-DOCKER.log` | each step `exit=0` | `autobyteus-web/package.json` changed |
| FS-DESKTOP | SCN-A1 | the desktop release build | `scripts/fs-other.sh desktop …` (`build:electron:mac -- --arm64` with TESTING.md's variables); `scripts/fs-desktop-verify.sh` | ENV-1 | `Pass` | `FS-DESKTOP.log`, `FS-DESKTOP-verify.log` | `# fresh: 0 prior build folders`; `[typecheck] PASS` (production 0; test-file 86 in 36 = baseline); "The /mobile build holds no demo code."; `step exit=0` ×2, `[terminal-runtime] ok: node-pty spawn probe` | — |
| NT-01 | — (the release's observation, not an AC) | App Store Connect's upload validation and its compliance screen | — | — | `Not Tested` | — | — | needs an upload, only on the founder's word; the requirements make it the release's observation. Its inputs (the opaque 1024 marketing icon, the key) are proven on the built bundles (FS-iOS) |

## Failures

None.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Or Accepted-Risk Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | FS-iOS (sips: 18 × exact size, no alpha; the compiled icons opaque), HS-01 (the home screens), R-IMP (IMP-01: beside the desktop logo) | `Proven` | — |
| AC-002 | Yes | FT-01 ((a2), (b), (c), (d) and recovery), R-IMP (IMP-02) | `Proven` | — |
| AC-003 | Yes | GH-01 (the step before the build, 18 × max 0; 0 asset-catalog warnings; build, core, smoke; publish skipped), FS-iOS (the same step from a fresh frozen install) | `Proven` | — |
| AC-004 | Yes | FS-iOS (Debug and Release-device apps: `ITSAppUsesNonExemptEncryption => false`; the contract check passes), FT-01 ((e), (e2)), R-IMP (IMP-03) | `Proven` | — |
| AC-005 | No (delivery's cleanup after the merge) | — | Delivery's step | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 95% | every AC by direct cases | — | — |
| Changed-boundary execution directness | 88% | 95% | the built bundles' Info.plist and Assets.car; the home screen | — | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | real Xcode builds, real simulators, the real runner | App Store Connect's own validation (not an AC) | the founder's next upload |
| Environment, configuration, identity, and fixture fidelity | 85% | 93% | fresh clones of three jobs; the runner's fresh start | the Release-device bundle was built with Xcode 26.1.1 here; the runner builds only the simulator Debug app before an upload | the archive at the founder's next upload |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | 95% | missing, wrong size, alpha, a single pixel, a logo change, the regenerate path, the key absent and true | — | — |
| User-surface, browser, and desktop-shell confidence | 75% | 95% | the icon on the iPhone and iPad home screens | light/tinted appearances not shown (non-goal: no variants) | — |
| Durable regression coverage quality and relevance | 95% | 95% | `ios-icon:check` and the contract check run in every release run, before the build | — | — |

- Overall post-repository confidence: 87% (R-IMP, GH-01)
- Overall final confidence: 95% (94.7%, simple average of the seven categories)
- Calculation method: simple average
- Every critical acceptance criterion directly proven, apart from parts only the user can check or accepted as unverified risk: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` at 94.7%, by environment fidelity alone (the archive with Xcode 27 runs only at an upload)
- Confidence-limiting residual risks: App Store Connect's own checks are observed only at the founder's next approved upload (beta.6): the icon accepted and "Missing Compliance" gone

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` (fresh-start builds), `Other` (the iOS app on simulators: the home screen; the built bundles read with `plutil` and `assetutil`; the GitHub run read independently)
- Confidence gap or residual risk it addresses, and the expected gain: what the user and App Store Connect see (the icon, the opaque marketing icon, the key in the bundle), not only the source files
- Browser validation needed, and why or why not: no; no web change
- If `Not Required`: —
- If `Blocked`: —

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (the placeholder PNGs are replaced; no second icon set)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: —
- Upstream recipient notified: —

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No` (by API/E2E). The implementation's `ios-icon:check` and contract-check additions were exercised by FS-iOS, FT-01 and GH-01.
- Added or updated paths attached for proportional test-code review: `N/A` (direct route)
- Diff or repository evidence supplied for removed paths: none

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| An iPhone and an iPad | iOS 26.1 simulators | device checks need the founder's word | none for the icon's appearance |
| App Store Connect | its inputs checked on the built bundles | an upload needs the founder's word | Apple's own validation (NT-01) |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Simulators `apie2e594-iphone`, `apie2e594-ipad` | Yes | `simctl delete` | deleted; others untouched |
| Clones, DerivedData, `assetutil` dumps, the downloaded run log (`~/.cache/abtest594`) | Yes | removed | no `AutoByteusMobile-*` DerivedData folder of mine left |
| Faults (FT-01) | Yes | only in the clone, each restored with `git checkout` | the worktree untouched |
| GitHub | No (read only) | nothing dispatched, pushed, tagged or uploaded by API/E2E | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, parts only the user can check, or accepted as unverified risk: none. AC-005 is delivery's step after the merge.
- Evidence decisions requested: `None` (NT-01 is not an AC; the requirements make it the release's observation)
- Next recipient from `get_handoff_rules`: Delivery Engineer (direct Medium / Low Pass)
- Notes: FU-001 (the unused iPad 76x76@1x slot) stays recorded; actool reports it as a notice on both Xcode 26.1.1 and 27.2.
