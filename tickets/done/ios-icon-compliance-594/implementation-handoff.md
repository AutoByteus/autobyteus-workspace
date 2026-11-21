# Implementation Handoff — ios-icon-compliance-594 (autobyteus-594): the iOS app icon from the product logo; export compliance

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-icon-compliance-594`, branch `codex/ios-icon-compliance-594` (pushed for the build-only run), base `origin/personal` `9aeaf46aa9`. Ticket folder `tickets/in-progress/ios-icon-compliance-594/`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review not selected (Medium/Low, direct route); Solution Designer's `handoff-implementation.md`.
- Requirements doc: `requirements-doc.md` (REQ-001…004, AC-001…004; DEC-001…003).
- Investigation notes: `investigation-notes.md` (S-01…S-09, R-001, R-002).
- Solution revision record: `solution-revision-record.md` (SR-001).
- Design spec: `design-spec.md` (SR-001; D-1…D-6).
- Design review report / architecture review revision record: `N/A — not applicable` (direct route).
- Triggering rework report: N/A (initial implementation).

## Current Implementation Summary

- The iOS app icon set is generated from `autobyteus-web/public/autobyteus-icon.svg`: the mark on the logo circle's own blue (#1E3A8A) as a full square, every slot at its exact size, RGB without alpha.
- The generator and its check are `autobyteus-web/scripts/build-ios-app-icon.mjs`, run as `ios-icon:build` and `ios-icon:check`.
- The release workflow runs the check.
- The Info.plist declares `ITSAppUsesNonExemptEncryption = false`.
- The contract check guards the icon structure, the key and the workflow step.
- TESTING.md and the iOS README document both.

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review / code-review / API/E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Commits:
  - `f0e6d1eb33`: the change, the ticket documents and IMP-01…IMP-03. Every check ran on it.
  - The next commit adds this handoff, the revision record, FU-001 and IMP-04/IMP-05. It contains documents only.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk.
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: the scope is the designed files. Assets and one plist key change; there is no app source, contract, persistence or ownership change.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below).
- New design impact or escalation trigger: `None`.

### Lightweight self-review

**D-1, the generator, as designed:**
- The background is read from the SVG's `<circle fill>`. It fails when the circle or its fill is absent.
- Each slot is `size × scale` from `Contents.json`, rounded (83.5 × 2 = 167).
- Each slot is rendered straight from the SVG at `density = 3 × pixels`, so the 24-unit viewBox renders at the target size. It is resized to exactly that, flattened onto the background, stripped of alpha and written as an 8-bit RGB PNG.
- `--check` names the slot and its reason. Comparing pixels, it prints the measured max and mean difference for every slot, so a CI log carries the numbers (IMP-05).
- The tolerance constants are exported; I kept the design's defaults: max channel difference 8, mean 0.5. Measured:
  - a fresh render against the committed files: 0 on this Mac and 0 on the CI runner, with the same sharp from the lockfile;
  - the 592 branch's PNG: 0;
  - a one-step change of the mark's green (#34D399 → #34D398, invisible): passes, which is the room the tolerance leaves;
  - a recolored mark: max 211, mean 44.6;
  - a 10×10 red square in the 80-pixel icon: max 211, mean 2.95.

  So the tolerance separates encoder noise from any real change by a wide margin.

**D-2:** the package scripts sit beside `icons:build` and `icons:check`.

**D-3, the contract check, as designed. It verifies:**
- every slot's `filename` exists;
- the IHDR width and height equal the slot's pixels;
- color type 2 and bit depth 8;
- no `tRNS` chunk (it parses the PNG chunks, with no decode and no node);
- `ITSAppUsesNonExemptEncryption is False` via `plistlib`;
- the workflow step's text, and its order after "Install workspace dependencies" and before "Generate, build, and run implementation checks".

**D-4:** the step "Check the app icon against the logo" runs `pnpm --dir autobyteus-web ios-icon:check` in `build-ios`, right after the install. It needs only sharp, not the workspace builds.

**D-5:** the key is placed after the ATS dictionary, with no plist comment.

**D-6:**
- TESTING.md: one row in "Choosing the path", the change→check table. Its "Rerun by impact" section is prose, so the row went where the impacts are listed.
- The iOS README gains "App icon" and "Export compliance" sections, the latter with the reasoning and the condition that would change the key. The contract check's coverage sentence also gains the three new checks.

**Untouched:** `Contents.json` (FU-001), the desktop and Android icons and `generateIcons.ts`, and the share extension's Info.plist.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001, REQ-002) | The app icon is the product mark on #1E3A8A, every slot at its size, RGB without alpha | `autobyteus-ios/AutoByteusMobile/Assets.xcassets/AppIcon.appiconset/*.png` (18, regenerated; `Contents.json` unchanged) | IMP-01 (visual), IMP-04 (compiled icons in the app; no actool warning) |
| BEH-002 (REQ-003) | A reproducible generator and a drift check, run by the release | `autobyteus-web/scripts/build-ios-app-icon.mjs`, `autobyteus-web/package.json` (`ios-icon:build`, `ios-icon:check`), `.github/workflows/release-ios.yml` (`build-ios`: "Check the app icon against the logo") | IMP-02 (positive, four faults, a logo change), IMP-05 (on CI: 18/18 match, max 0) |
| BEH-003 (REQ-004) | `ITSAppUsesNonExemptEncryption = false`, guarded | `autobyteus-ios/AutoByteusMobile/Info.plist`; `autobyteus-ios/scripts/ios-release-contract-check.py` (`check_export_compliance`, `check_app_icon`, `check_icon_step`) | IMP-03 (positive, six faults), IMP-04 (`"ITSAppUsesNonExemptEncryption" => false` in the built app) |
| Docs | The rule written down | `TESTING.md` (Choosing the path), `autobyteus-ios/README.md` (App icon; Export compliance; the contract check's coverage) | — |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`.

## Key Files Or Areas

As in the trace table.

## Important Assumptions

- **DEC-002 (`false`)** stands on the investigation's evidence (S-06…S-08). The README states the condition that would change it: the app's own encryption beyond the OS's and authentication-only use.

## Known Risks

- R-001 (rendering differences between machines): covered by the pixel tolerance. The measured CI difference is 0.
- R-002: as in the investigation notes.
- App Store Connect's own reading of the key, and the archive/upload job, are proven only at a founder-approved upload.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Behavior Change` (assets) plus `Cleanup`
- Reviewed root-cause classification: `Missing Invariant` (nothing enforced "the icon set is derived from the logo")
- Reviewed refactor decision: `No` refactor beyond the generator and the check
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes:
  - The generator lives beside the web icon tooling and reads the same SVG.
  - The color is derived from the SVG's circle, not written again.
  - The invariant is now enforced in two places: by `ios-icon:check` in the release, and structurally by the contract check without node.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`. The placeholder PNGs are replaced.
- Dead code in the touched files and modules removed: `Yes`. There was none to remove.
- Dead code found elsewhere, added to `follow-ups.md`: FU-001, an unused icon slot. It is not code.
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied: `Yes`
- Deviations from a design principle: `None`
- Changed source files within size guardrails: `Yes` (the generator is about 120 lines; the contract check grows by 80).
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`.

## Environment Or Dependency Notes

- sharp 0.33 (already a dependency of `autobyteus-web`); no new dependency.
- The local checks ran under this Mac's Xcode 26.1.1 on a simulator I created (iPhone 17, iOS 26.1), deleted afterwards. The release builds with Xcode 27.2 (IMP-05).

## Checks Run

Evidence folder: `tickets/in-progress/ios-icon-compliance-594/evidence/implementation/`. Every check ran on `f0e6d1eb33`'s tree.

| Check ID | Command Or Steps | Environment | Code It Exercises | Criteria | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-web ios-icon:build`; a sheet with four tiles: the old 1024 placeholder, the new `AppIcon-1024.png`, the desktop logo (the SVG rendered at 1024), and the 592 branch's PNG | macOS 26.5.2, Node 22, sharp 0.33 | the generator | AC-001 | Pass | `IMP-01-icon-before-after-desktop-592.png` | the new icon is the desktop mark at the same proportions, on a full #1E3A8A square; the corner pixel is `30 58 138`; the 592 PNG vs this render: `max 0 mean 0.0000` |
| IMP-02 | `pnpm -C autobyteus-web ios-icon:check` on the set; then one fault at a time (restored after each): (a) a slot deleted, (b) a 1000×1000 `AppIcon-1024.png`, (c) an alpha channel, (d) a red square painted in; then (e) the logo recolored and (f) the logo's green one step off | as IMP-01 | `--check` | AC-002 | Pass | `IMP-02-ios-icon-check.log` | `all 18 slots match the logo`; then (a) `the file is missing`, (b) `it is 1000x1000, not 1024x1024`, (c) `it has an alpha channel`, (d) `its pixels differ … (max 211 > 8 or mean 2.953 > 0.5)`, each `exit=1`; (e) `18 of 18 slots do not match` `exit=1`; (f) passes `exit=0` (within the tolerance by design); restored `exit=0` |
| IMP-03 | `autobyteus-ios/scripts/ios-release-contract-check.py` on the change; then one fault at a time: the key removed; the key `true`; an icon with alpha; an icon of the wrong size; an icon missing; the workflow step removed | macOS, Python 3 | the contract check's icon, key and step rules | AC-004 (and AC-002's static half) | Pass | `IMP-03-contract-check.log` | `iOS release contract checks passed.`; six `exit=1`, each naming the fault (e.g. `found color type 6`, `found True`, `is 1000x1000; slot ios-marketing 1024x1024@1x needs 1024x1024`); restored passes |
| IMP-04 | `xcodebuild … build` and `-only-testing:AutoByteusMobileCoreTests test` on a simulator I created; `plutil -p` on the built `AutoByteus.app/Info.plist` | Xcode 26.1.1, iPhone 17, iOS 26.1 | the asset catalog compile, the app, the core tests, the built plist | AC-001, AC-004 | Pass | `IMP-04-ios-build-core-tests-plist.log` | `** BUILD SUCCEEDED **`; no actool warning or error, one pre-existing notice (FU-001); `AppIcon60x60@2x.png`, `AppIcon76x76@2x~ipad.png` in the app; `Executed 56 tests, with 0 failures`; `"ITSAppUsesNonExemptEncryption" => false`, `"CFBundleIconName" => "AppIcon"` |
| IMP-05 | `gh workflow run release-ios.yml --ref codex/ios-icon-compliance-594 -f publish_app_store_connect=false` → run 44894079363 | GitHub `xcode-27-arm64`, Xcode 27.2 | the workflow's icon step on CI, and the whole build-only release | AC-003 | Pass | `IMP-05-build-only-run.txt` | every slot `matches (max 0, mean 0.000)`; `all 18 slots match the logo (on #1E3A8A).`; `Selected Xcode app: /Applications/Xcode_27.2.app`; `Selected iPhoneOS SDK: 27.2`; `** BUILD SUCCEEDED **`; `Executed 56 tests, with 0 failures`; `Executed 8 tests, with 0 failures`; `Smoke UI tests: executed and passed without skips`; `run: success`; both publish jobs `skipped` |

- Not run, and why: the archive/upload job (needs the founder's word; no upload in this ticket).

## Frontend Rendered-Result Check (When Applicable)

- Affected surface: the app icon, and no other screen.
- Inspected: the 1024 icon beside the desktop logo and the 592 PNG (IMP-01).
- The compiled icons are in the built app (IMP-04).
- On a device, the home-screen icon (iOS's own corner mask) is seen at TestFlight, on the founder's word.

## Downstream Coverage Hints / Suggested Scenarios

- IMP-05 is the build-only run of this exact commit. API/E2E can reuse it.
- After the merge, delivery deletes `origin/codex/autobyteus-592-ios-product-icon` (handoff constraint).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- API/E2E's validation of AC-001…004 on the package.
