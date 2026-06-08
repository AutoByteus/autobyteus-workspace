# Design Spec

## Current-State Read

The iOS release workflow is owned by `.github/workflows/release-ios.yml`. Its publish path runs on a GitHub-hosted macOS runner, imports iOS signing material from GitHub Actions secrets, verifies App Store provisioning profiles, archives/exports a signed IPA, and uploads the IPA to App Store Connect/TestFlight through `xcrun altool`.

The App Store Connect app-record blocker from the original run is now resolved: after the user created the App Store Connect app record, rerun attempt 2 reached Apple validation instead of failing with `No suitable application records were found`.

The current failure is a local workflow configuration defect: the runner image used in rerun job `80027498663` defaulted to `Xcode 16.4`, building with the iOS `18.5` SDK. App Store Connect rejected the upload because iOS/iPadOS uploads now require the iOS `26` SDK / Xcode `26` or later. The runner image documentation for the inspected `macos-15-arm64` image shows Xcode `26.3` is installed at `/Applications/Xcode_26.3.app`, but it is not the default.

Current relevant ownership boundaries:
- `.github/workflows/release-ios.yml` owns CI job orchestration and toolchain selection.
- `autobyteus-ios/scripts/ios-release-contract-check.py` owns static/executable release workflow contract checks.
- GitHub Actions secrets own sensitive signing/App Store Connect inputs. Their values must not be changed or printed in this task.
- App Store Connect owns external app-record, API-key access, TestFlight processing, and upload validation. This task must not alter App Store metadata or submit for review.

## Intended Change

Make the iOS GitHub Actions release workflow explicitly select Xcode 26+ before any iOS `xcodebuild`, `xcrun`, simulator, archive/export, or upload work runs in macOS jobs.

Target shape:
1. Add a small Xcode-selection setup concern to `.github/workflows/release-ios.yml` for the macOS `build-ios` and `upload-testflight` jobs.
2. Prefer a single configurable app path variable with a documented default, e.g. repository variable fallback to `/Applications/Xcode_26.3.app`.
3. In each macOS job, set/export `DEVELOPER_DIR` through `$GITHUB_ENV` before existing `Install XcodeGen` / `xcodebuild -version` calls.
4. Log the selected `xcodebuild -version` and `xcrun --sdk iphoneos --show-sdk-version` so the selected toolchain and SDK are visible in CI evidence.
5. Update `autobyteus-ios/scripts/ios-release-contract-check.py` only if needed to assert the release workflow now preserves the Xcode 26 selection invariant.

This is intentionally not a signing, certificate, provisioning-profile, App Store Connect API-key, bundle-ID, metadata, screenshot, or App Review submission change.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / CI workflow configuration
- Current design issue found (`Yes`/`No`/`Unclear`): No broad design issue found
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No
- Evidence: Rerun job `80027498663` showed `Xcode 16.4` selected and App Store Connect rejected the IPA for iOS `18.5` SDK. Existing signing/profile/archive/export steps succeeded and should remain unchanged.
- Design response: Add explicit Xcode 26+ selection at the workflow/toolchain boundary and make the selected toolchain visible in logs.
- Refactor rationale: No refactor is required because the existing workflow remains the right owner for release toolchain selection. The task is a narrow missing setup step/invariant in that owner.
- Intentional deferrals and residual risk, if any: Later Apple validations may expose unrelated App Store metadata/compliance/upload issues after the SDK issue is fixed. Those are outside this task unless they prove caused by this Xcode-selection change.

## Terminology

- `iOS release workflow`: `.github/workflows/release-ios.yml`.
- `Xcode selection setup`: the minimal workflow setup concern that chooses Xcode 26+ and publishes `DEVELOPER_DIR` for subsequent steps.
- `Release contract check`: `autobyteus-ios/scripts/ios-release-contract-check.py`.

## Design Reading Order

This small design should be read as: release workflow spine -> workflow owner and Xcode setup concern -> file mapping -> verification sequence.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: no legacy path is being replaced; the defect is absence of explicit Xcode selection.
- The design must not add a fallback that silently permits Xcode 16.x for App Store Connect publish.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-IOS-XCODE-001 | Primary End-to-End | Tag/manual publish workflow | App Store Connect upload validation | `.github/workflows/release-ios.yml` | Shows where toolchain selection must happen before build/archive/upload. |
| DS-IOS-XCODE-002 | Bounded Local | Workflow setup step | Subsequent macOS job steps via `DEVELOPER_DIR` | Xcode selection setup inside `.github/workflows/release-ios.yml` | Ensures all job-local Apple tools use Xcode 26+ instead of runner default Xcode 16.4. |

## Primary Execution Spine(s)

`iOS Release Trigger -> prepare-release metadata -> macOS job Xcode 26 selection -> build/test or archive/export -> altool upload -> App Store Connect validation`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-IOS-XCODE-001 | The release workflow receives a tag/manual publish request, resolves metadata, enters macOS jobs, selects Xcode 26+, builds/archives with the iOS 26 SDK, and uploads the IPA to App Store Connect. | Release workflow, Xcode toolchain, xcodebuild archive/export, altool upload | `.github/workflows/release-ios.yml` | Secret injection, profile verification, artifact upload, contract check. |
| DS-IOS-XCODE-002 | At the start of each macOS job that invokes Apple developer tools, the setup step chooses Xcode 26+ and writes `DEVELOPER_DIR` into `$GITHUB_ENV`, making the selected developer directory authoritative for later `xcodebuild` and `xcrun` calls. | Xcode selection setup, `DEVELOPER_DIR`, downstream Apple tools | `.github/workflows/release-ios.yml` | Version logging and fail-fast if Xcode 26+ is unavailable. |

## Spine Actors / Main-Line Nodes

- Release trigger / metadata resolver
- macOS workflow job
- Xcode 26 selection setup
- `xcodebuild` build/test/archive/export
- `xcrun altool` upload
- App Store Connect validation

## Ownership Map

- `.github/workflows/release-ios.yml`: owns CI sequencing, runner setup, toolchain selection, and invocation of existing scripts/tools.
- Xcode selection setup: owns choosing a valid Xcode 26+ developer directory, failing fast if unavailable, and logging the selected Xcode/iOS SDK.
- `ios-release-contract-check.py`: owns static/executable assertions that the workflow preserves required release invariants. It may be extended with an Xcode-selection assertion.
- Signing/profile steps: continue to own certificate/profile import/verification exactly as before; they must not absorb toolchain policy beyond using the selected `DEVELOPER_DIR` from the job environment.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GitHub Actions trigger | `.github/workflows/release-ios.yml` jobs | Starts release workflow from tag/manual dispatch | Toolchain policy outside workflow jobs. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Silent reliance on runner default Xcode | It currently selects Xcode 16.4 and builds with an upload-rejected SDK. | Explicit Xcode 26+ selection in `.github/workflows/release-ios.yml` | In This Change | This is not a code removal, but it decommissions the old implicit behavior. |

## Return Or Event Spine(s) (If Applicable)

`App Store Connect validation result -> altool exit code/log -> GitHub Actions job status -> uploaded artifacts/summary`

The existing return path remains unchanged; the fix should only change which SDK the IPA is built with.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `.github/workflows/release-ios.yml` macOS job setup.
- Chain: `candidate Xcode path -> validate developer dir -> export DEVELOPER_DIR -> log xcodebuild/iPhoneOS SDK -> downstream xcodebuild/xcrun steps`.
- Why it matters: all Apple developer tools must agree on the same Xcode 26+ installation.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Secret/certificate import | DS-IOS-XCODE-001 | Release workflow | Import existing GitHub secret material into temporary signing environment. | Already works; preserve behavior. | Changing it would expand scope and risk secrets. |
| Provisioning profile verification | DS-IOS-XCODE-001 | Release workflow | Validate exact app/share App Store profiles. | Already works; preserve behavior. | Misplacing it into toolchain setup would blur concerns. |
| Release contract check | DS-IOS-XCODE-001 | Release workflow | Catch static workflow contract drift. | Keeps narrow workflow invariants executable. | If ignored, future edits may regress Xcode selection silently. |
| Artifact/log upload | DS-IOS-XCODE-001 | Release workflow | Preserve evidence. | Needed for debugging external validation failures. | Should not own toolchain policy. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| CI toolchain selection | iOS release workflow | Extend | The workflow already owns runner setup and `xcodebuild` invocation. | N/A |
| Workflow invariant coverage | `ios-release-contract-check.py` | Extend if needed | Existing script already checks release workflow invariants. | N/A |
| Signing/certificate handling | Existing workflow steps | Reuse unchanged | These steps already passed. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| GitHub Actions iOS release pipeline | Workflow sequence, macOS runner setup, Xcode selection, build/archive/upload commands | DS-IOS-XCODE-001, DS-IOS-XCODE-002 | `.github/workflows/release-ios.yml` | Extend | Narrow workflow edit. |
| iOS release contract validation | Static/executable workflow expectations | DS-IOS-XCODE-001 | `ios-release-contract-check.py` | Extend if needed | Keep checks minimal and text-based like existing contract checks. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `.github/workflows/release-ios.yml` | GitHub Actions iOS release pipeline | Release workflow | Select Xcode 26+ in macOS jobs before Apple developer tools run. | Existing workflow already owns this pipeline. | No |
| `autobyteus-ios/scripts/ios-release-contract-check.py` | iOS release contract validation | Contract checker | Optionally assert Xcode 26 selection invariant. | Existing checker owns release workflow static checks. | No |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Xcode selection snippet may be duplicated in two workflow jobs | N/A for this small YAML-only change | Workflow | Duplication is acceptable for two jobs; extracting a script would be more scope than needed. | N/A | N/A | A broad CI helper subsystem. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | Low | No shared data/model change. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `.github/workflows/release-ios.yml` | GitHub Actions iOS release pipeline | Release workflow | Add explicit Xcode 26+ selection/logging for macOS jobs; preserve existing signing and upload sequence. | Direct owner of workflow behavior. | No |
| `autobyteus-ios/scripts/ios-release-contract-check.py` | iOS release contract validation | Contract checker | Add minimal static assertion if implementation changes workflow contract. | Existing contract-check owner. | No |

## Ownership Boundaries

The workflow is the authoritative boundary for CI runner setup. Downstream scripts and Apple tools should not guess or select their own Xcode installation. They should inherit `DEVELOPER_DIR` from the workflow setup.

Signing/certificate/profile handling remains behind its existing workflow steps. The Xcode selection setup must not modify secrets, profile verification arguments, bundle IDs, or App Store Connect credentials.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `.github/workflows/release-ios.yml` macOS job setup | `DEVELOPER_DIR`, selected Xcode app path, Xcode/SDK logging | Existing build/archive/upload steps | Individual steps relying on runner default Xcode | Strengthen setup step/env, not ad hoc per-command overrides. |

## Dependency Rules

- Workflow macOS jobs may depend on the configured/default Xcode 26+ app path.
- `xcodebuild`, `xcrun simctl`, and `xcrun altool` must run after Xcode selection.
- Signing/profile steps may use the selected developer tools but must not own the selection policy.
- Do not change GitHub secret names/values or App Store Connect app metadata in this task.
- Do not add fallback behavior that allows App Store upload with Xcode 16.x.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `DEVELOPER_DIR` job environment | Selected Xcode developer directory | Direct Apple tooling to Xcode 26+. | Absolute path to `Contents/Developer`. | Must be visible before build/archive/upload. |
| Optional `IOS_XCODE_APP_PATH` repository variable | Xcode app bundle path | Override default Xcode app location if runner changes. | Absolute `/Applications/Xcode_*.app` path. | Use only if implementation chooses this configurability. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `DEVELOPER_DIR` | Yes | Yes | Low | Keep it as one developer-directory path. |
| `IOS_XCODE_APP_PATH` | Yes | Yes | Low | Validate existence and fail fast if invalid. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Workflow setup step | `Select Xcode 26 SDK` or `Select Xcode 26 or newer` | Yes | Low | Use a name that states the App Store upload SDK requirement. |

## Applied Patterns (If Any)

- Fail-fast setup guard: validate the selected Xcode developer directory and log the selected SDK before doing expensive build/archive work.
- Existing static contract check pattern: add minimal text assertions to `ios-release-contract-check.py` if the workflow invariant should be guarded.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `.github/workflows/release-ios.yml` | File | iOS release workflow | Xcode 26+ selection and existing iOS release sequence. | The failure is in CI workflow setup. | Secret value changes, App Store metadata, broad release refactor. |
| `autobyteus-ios/scripts/ios-release-contract-check.py` | File | Release contract checker | Optional static assertion that the workflow selects Xcode 26+. | Existing release invariant checker. | Runtime upload logic or secret handling. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `.github/workflows` | CI orchestration | Yes | Low | Workflow files are the correct place for runner/toolchain setup. |
| `autobyteus-ios/scripts` | iOS workflow support scripts | Yes | Low | Existing contract checker belongs with iOS release scripts. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Xcode setup before Apple tooling | `Select Xcode 26 SDK -> xcodebuild -version -> archive/export/upload` | `archive/export/upload` using runner default Xcode 16.4 | The exact failure is caused by implicit default Xcode selection. |
| Scope control | Add `DEVELOPER_DIR` setup and contract assertion only. | Rotate certs, change bundle ID, or alter App Store metadata. | Signing/export already works; broader changes would be unrelated risk. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Allow workflow to continue with Xcode 16.x if Xcode 26 is missing | Would preserve current runner default behavior | Rejected | Fail fast and require Xcode 26+ for App Store Connect upload. |
| Keep old app-record failure investigation as implementation target | Original blocker was already fixed externally | Rejected | Target the current rerun failure: SDK/Xcode selection. |

## Derived Layering (If Useful)

Not needed. This is a workflow setup change inside one CI owner.

## Migration / Refactor Sequence

1. Modify `.github/workflows/release-ios.yml` to select Xcode 26+ before the existing `Install XcodeGen` / `xcodebuild -version` steps in both macOS jobs.
2. Ensure selected Xcode and iPhoneOS SDK versions are logged.
3. Extend `ios-release-contract-check.py` if needed so the invariant is protected by local checks.
4. Run `autobyteus-ios/scripts/ios-release-contract-check.py` locally.
5. If user approves a real upload attempt, rerun the failed GitHub Actions job or dispatch the workflow and inspect upload evidence.

## Key Tradeoffs

- A small duplicated setup step in two jobs is acceptable and easier to review than adding a generalized CI helper script.
- A configurable Xcode path reduces future runner-image risk, but the default should remain concrete and fail-fast.
- Selecting Xcode 26 in both build/test and upload jobs is slightly broader than only the upload job, but it keeps CI build evidence aligned with the publish artifact toolchain.

## Risks

- Xcode 26 may reveal new build warnings/errors not seen in Xcode 16.4.
- App Store Connect may expose a later unrelated validation issue after the SDK issue is fixed.
- Hardcoded runner app paths can age; using a repository-variable override or ordered candidate list reduces this without broadening scope much.

## Guidance For Implementation

- Keep code changes narrow: expected files are `.github/workflows/release-ios.yml` and, if necessary, `autobyteus-ios/scripts/ios-release-contract-check.py`.
- Preserve all existing secret names and signing/profile verification commands.
- Do not print secret values.
- Recommended workflow step behavior:
  - choose `/Applications/Xcode_26.3.app` by default, optionally through `IOS_XCODE_APP_PATH` variable fallback;
  - validate `${selected}/Contents/Developer` exists;
  - write `DEVELOPER_DIR=${selected}/Contents/Developer` to `$GITHUB_ENV`;
  - export `DEVELOPER_DIR` in the setup step and log `xcodebuild -version` plus `xcrun --sdk iphoneos --show-sdk-version`;
  - fail if the selected Xcode major version is below 26.
- Local check: run `autobyteus-ios/scripts/ios-release-contract-check.py`.
- Remote verification should be explicit because it can perform a real TestFlight upload.
