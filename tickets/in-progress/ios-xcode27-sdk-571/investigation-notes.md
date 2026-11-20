# Investigation Notes

## Investigation Meta

- Package identifier: `ios-xcode27-sdk-571`
- Request / ticket: autobyteus-571
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-xcode27-sdk-571`
- Repository mode: `Git`
- Task worktree / branch: the workspace root above, branch `codex/ios-xcode27-sdk-571`
- Resolved base: `origin/personal` `fa6632cbca` (v1.5.14-beta.3 version bump), fetched 2026-11-20
- Finalization target: `origin/personal`
- Bootstrap result: OK. Bootstrap blocker: none.
- Current solution revision ID: `SR-001`
- Authorities read (2026-11-20):
  - requirements: `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`;
  - architecture: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (rule 12 applies: workflow change).
- Investigation status: complete.

## Initial Request And Clarifications

- Original request: Task autobyteus-571; the founder: "Fix this now", on App Store Connect's ITMS-90725 email for Build 343 (v1.5.14-beta.3).
- The email's text is quoted in the requirements doc. Its screenshot is the Task's context file, which contains the App Apple ID; it stays out of the repository.
- Constraints:
  - no release or upload without the founder's word;
  - no private IDs or screenshots in the repository;
  - clean up and keep a record copy.

## Source Log

| ID | Date | Type | Exact Source / Command | Finding |
| --- | --- | --- | --- | --- |
| S-01 | 2026-11-20 | Runtime | `gh run view 44721148794 --log` (beta.3 iOS run) | Build job image `macos-26-arm64` 20261117.0516.1. "Selected Xcode app: /Applications/Xcode_26.3.app", "Xcode 26.3, Build version 17C529", "Selected iPhoneOS SDK: 26.2". This matches Apple's "built with the iOS 26.2 SDK". **Measured.** |
| S-02 | 2026-11-20 | Code | `.github/workflows/release-ios.yml:40` (`IOS_XCODE_APP_PATH` default Xcode_26.3), `:116` and `:373` (`runs-on: macos-latest` for `build-ios` and `upload-testflight`), `:125-155` and `:391-421` (the two identical "Select Xcode 26 or newer" steps: path check, `DEVELOPER_DIR`, full `xcodebuild -version` parse, `xcode_major < 26` failure, SDK only logged) | The pin and the guard live in two copies of one step, one per macOS job. **Read.** |
| S-03 | 2026-11-20 | Command | `gh variable list` | `IOS_XCODE_APP_PATH` is **not set**; the workflow default applies. Nothing to clear. |
| S-04 | 2026-11-20 | Web | runner-images readme `macos-26-arm64/20261117.0516` | `macos-latest` = macOS 26 arm64: Xcode 26.0.1…26.6 (default 26.6), iOS SDKs up to 26.5. **No Xcode 27.** |
| S-05 | 2026-11-20 | Web / API | `gh api repos/actions/runner-images/contents/images/macos` and the release `xcode-27-arm64/20261119.0378` readme; issue 14404; changelog "Xcode 27 runner image generally available" (2026-10-15) | Label `xcode-27` (arm64), GA. macOS 27.2. Xcode 27.0 (27A266a), **27.1 default** (27A9275), **27.2** (27B52, `/Applications/Xcode_27.2.app`), 27.3 **beta** (27C5020n). iOS SDKs and simulators 27.0–27.3. The iOS 27.2 simulators include iPhone 17 and iPad Air 11-inch (M4). GitHub ties each image to one Xcode major version. |
| S-06 | 2026-11-20 | Code | `autobyteus-ios/scripts/ios-release-contract-check.py:191-220` | Requires the strings `/Applications/Xcode_26.3.app`, "Select Xcode 26 or newer" and `xcode_major < 26` in both jobs, plus the step's order before "Install XcodeGen". |
| S-07 | 2026-11-20 | Doc | `RELEASE.md:523`, `:571`; `autobyteus-ios/README.md:134`, `:139` | They document "Xcode 26 or newer" and the default Xcode_26.3. `docs/ios_mobile_access.md` names no Xcode version. |
| S-08 | 2026-11-20 | Code | `autobyteus-ios/project.yml:12-13` (`SWIFT_VERSION 5.10`, `IPHONEOS_DEPLOYMENT_TARGET 17.0`); `scripts/ios-simulator-smoke.sh:5,32-34` (simulator "iPhone 17", falling back to any iPhone) | No SDK pin in the project; the SDK comes from the selected Xcode. |
| S-09 | 2026-11-20 | Code | `git log -S Xcode_26.3 -- .github/workflows/release-ios.yml` → `9ea36d3595` "fix(ci): select Xcode 26 for iOS release" (2026-06-08) | The explicit path pin and the major-version guard are the project's convention for this exact concern. |
| S-10 | 2026-11-20 | Command | `xcodebuild -version` locally | Xcode 26.1.1 only. There is no local Xcode 27, so the proof has to run on GitHub. |

## Relevant Existing Behavior

| Behavior ID | Kind | Trigger | Current Path | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | `v*` tag / dispatch | `prepare-release` (ubuntu) → `build-ios` (macos-latest, select Xcode 26.3, demo build, generate, build, core tests, smoke) → `publish-secret-gate` → `upload-testflight` (macos-latest, select Xcode 26.3, archive, export, upload) | The binary is built with SDK 26.2 → ITMS-90725 | S-01, S-02 | Measured |
| BEH-002 | Operational | each macOS job | the guard fails only when Xcode major < 26 | An SDK below 27 passes | S-02 | Read |
| BEH-003 | Contract | `ios-release-contract-check.py` in `build-ios` | requires the Xcode 26 strings | Blocks a change unless updated with it | S-06 | Read |

## Runtime, Probe, Or Reproduction Findings

| ID | Method / Command | Observation | Established | Evidence |
| --- | --- | --- | --- | --- |
| P-01 | Temporary branch `probe/ios-xcode27-571`, one commit from `fa6632cbca`: the `build-ios` runner set to `xcode-27`, the default path set to `/Applications/Xcode_27.2.app`. The contract check still passes, because it checks strings only. Then `gh workflow run release-ios.yml --ref probe/ios-xcode27-571 -f publish_app_store_connect=false` → run 44725773809. | See "P-01 result" below | Measured | `evidence/probe/` |

### P-01 result (run 44725773809, success)

- **Run:**
  - Build job image `xcode-27-arm64`.
  - "Selected Xcode app: /Applications/Xcode_27.2.app", "Xcode 27.2", "Build version 27B52", **"Selected iPhoneOS SDK: 27.2"**.
- **Build and tests:**
  - `** BUILD SUCCEEDED **`, with no source change.
  - `AutoByteusMobileCoreTests`: 56 tests, 0 failures.
  - UI smoke: 8 tests, 0 failures; `** TEST SUCCEEDED **`.
  - The only compiler warnings were 7× "Metadata extraction skipped, no AppIntents.framework dependency found", Xcode's informational note for apps without App Intents.
- **Not exercised:** "Validate iOS Publish Secrets" and "Archive And Upload" were skipped (build-only).
- **Measured.**
- **Conclusion:** U-001 is resolved. Xcode 27.2 builds and tests the app as it is; Swift 5.10 mode and iOS 17.0 are accepted.
- **Excerpts:** `evidence/probe/P-01-xcode27-build-only.txt`, with beta.3's lines for comparison. Beta.3's archive job also logged SDK 26.2.
- **Side finding (FU-001):** the simulator selection (`release-ios.yml:171-178`, `ios-simulator-smoke.sh:32-34`) matches "iPhone 17" as a substring and takes the first match in the oldest runtime. On `xcode-27` that is **iPhone 17e on iOS 27.0**. It works: Apple checks the build SDK, which is 27.2. But it is not the intended device. It is pre-existing and does not affect any AC, so it is a follow-up.

- Temporary diagnostics: the probe branch only. It was never merged, and it has been deleted, both the remote and local branch and the worktree under `/tmp/sd571`, which is also removed.
- Reproduction for implementation: run 44725773809 and the command above. S-01 shows the failing state (SDK 26.2).

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Constraint | Evidence | Risk |
| --- | --- | --- | --- | --- |
| Apple ITMS-90725 | App Store Connect, 2026-11-20 email | iOS 27 SDK / Xcode 27 or later from April 2027 | Task context file | — |
| App Store Connect upload | Apple | Builds from beta Xcode are not accepted for distribution | Apple's long-standing policy | Excludes 27.3 beta |
| GitHub `xcode-27` image | runner-images, changelog 2026-10-15 | arm64 only; one major Xcode per image | S-05 | Minor versions are removed over time; mitigated by the guard plus the override |

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Status |
| --- | --- | --- | --- |
| `evidence/probe/` | Solution Designer | P-01 log excerpts | Current |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| U-001 | Unknown | Does the app compile, and do its core tests and UI smoke pass, under Xcode 27.2 with Swift 5.10 mode? | P-01 | Resolved: yes |
| R-001 | Risk | `upload-testflight` (archive/export/upload) runs only on a publish, so a build-only run cannot exercise it | Same runner label, path and guard as `build-ios`, enforced by the contract check; proven at the next founder-approved upload | Residual |

## Notes For Architecture Design

- Map SCN-001…003 onto the two macOS jobs.
- The two "Select Xcode" steps are identical copies (S-02). Their duplication is existing structure, and the contract check enforces it per job.
