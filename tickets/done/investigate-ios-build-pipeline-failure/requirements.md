# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
Design-ready

## Goal / Problem Statement
Fix the iOS App Store Connect/TestFlight release pipeline after the user created the missing App Store Connect app record. The rerun now reaches App Store Connect validation but fails because the GitHub-hosted macOS runner defaults to Xcode 16.4 / iOS 18.5 SDK, while App Store Connect requires uploads built with Xcode 26 / iOS 26 SDK or later.

This is a small CI workflow configuration bug fix. Review scope should be intentionally limited to Xcode selection for the iOS release workflow and evidence that the previous app-record error is cleared.

## Investigation Findings
- Original failed run: `27071479568`, workflow `iOS App Store Connect Release`, tag/ref `v1.3.48`, commit `dfc26eec54cdf685442740691ce5469754ab945f`.
- Original failure was `No suitable application records were found` for bundle ID `org.autobyteus.mobile`; the user created the App Store Connect app record afterward.
- Rerun command: `gh run rerun 27071479568 --repo AutoByteus/autobyteus-workspace --failed`.
- Rerun job: `80027498663`, attempt 2, `Archive And Upload To App Store Connect`.
- The previous app-record/access error did not recur, confirming the App Store Connect app record creation fixed that blocker.
- New failure occurs after archive/export succeeds, during upload validation:
  - Runner default Xcode: `Xcode 16.4`, build `16F6`.
  - IPA built with iOS `18.5` SDK.
  - App Store Connect validation requires iOS `26` SDK / Xcode `26` or later.
- GitHub runner image docs for `macos-15-arm64` show Xcode `26.3` installed at `/Applications/Xcode_26.3.app`, but Xcode `16.4` is still the default.
- Local ignored iOS certificate/signing files are not present in the main repo checkout; CI uses GitHub secrets and already passes certificate import, provisioning profile verification, archive, and IPA export.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / CI workflow configuration
- Initial design issue signal (`Yes`/`No`/`Unclear`): No
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed
- Evidence basis: Rerun log `logs/job-80027498663-rerun-attempt2.log`, `.github/workflows/release-ios.yml`, GitHub runner image Xcode inventory.
- Requirement or scope impact: Change should only select Xcode 26+ for the iOS workflow before build/archive/upload. No certificate handling, bundle-ID handling, or App Store metadata behavior should be changed.

## Recommendations
- Update `.github/workflows/release-ios.yml` to select an installed Xcode 26+ toolchain before iOS build/test and publish archive/upload steps.
- Keep the fix small and explicit. Prefer one workflow-level environment variable or one small repeated setup step over broad release-pipeline refactoring.
- Verify with the existing local contract check and a GitHub Actions rerun or workflow dispatch. A real upload attempt may now reach TestFlight processing.

## Scope Classification (`Small`/`Medium`/`Large`)
Small

## In-Scope Use Cases
- UC-1: GitHub-hosted iOS release jobs use Xcode 26+ instead of the runner default Xcode 16.4.
- UC-2: The App Store Connect/TestFlight upload no longer fails for the iOS 18.5 SDK/Xcode 16.4 validation error.
- UC-3: The existing signing/certificate/profile/archive/export flow remains unchanged.

## Out of Scope
- Changing Apple certificates, provisioning profiles, App Store Connect API keys, or GitHub secret values.
- Changing bundle IDs, app metadata, screenshots, review submission, or public App Store release settings.
- Refactoring the release workflow beyond Xcode selection and minimal verification output.
- Clicking/submitting `Zur Prüfung hinzufügen` / App Review.

## Functional Requirements
- REQ-IOS-XCODE-001: The iOS release workflow must select Xcode 26+ before invoking `xcodebuild` for simulator build/test and publish archive/export.
- REQ-IOS-XCODE-002: The workflow must make the selected Xcode version visible in logs before build/archive so failures are diagnosable.
- REQ-IOS-XCODE-003: The implementation must preserve existing iOS signing/certificate/provisioning/App Store Connect secret handling unchanged.
- REQ-IOS-XCODE-004: The implementation must keep review scope limited to `.github/workflows/release-ios.yml` unless a contract test/script requires a minimal aligned update.

## Acceptance Criteria
- AC-IOS-XCODE-001: Workflow logs show Xcode 26+ selected before iOS build/test and before archive/upload.
- AC-IOS-XCODE-002: The previous upload error `This app was built with the iOS 18.5 SDK... requires iOS 26 SDK or later` no longer appears in the rerun evidence.
- AC-IOS-XCODE-003: Existing secret names and signing/profile verification commands in `.github/workflows/release-ios.yml` remain semantically unchanged.
- AC-IOS-XCODE-004: Local verification includes `autobyteus-ios/scripts/ios-release-contract-check.py` or an updated equivalent if the workflow contract check must learn the Xcode-selection invariant.

## Constraints / Dependencies
- GitHub-hosted macOS runner image must have Xcode 26+ installed. Current inspected `macos-15-arm64` image documentation shows Xcode 26.3 installed at `/Applications/Xcode_26.3.app`.
- App Store Connect upload is a real external side effect. Rerunning publish may upload a build to TestFlight if validation passes.
- GitHub Actions secret values are unreadable and must remain unprinted.

## Assumptions
- `macos-latest` / `macos-15-arm64` continues to include `/Applications/Xcode_26.3.app` for the immediate fix.
- Xcode 26.3 can build the current iOS project without source changes.
- The App Store Connect app record created by the user remains present and accessible to the configured API key.

## Risks / Open Questions
- If the runner image path changes, a hardcoded Xcode path may need an update. A robust selection fallback can reduce this risk while keeping the fix small.
- After SDK validation passes, Apple may surface a later, unrelated App Store/TestFlight metadata or compliance validation error.
- Xcode 26 may surface new compiler warnings/errors not visible under Xcode 16.4.

## Requirement-To-Use-Case Coverage
- REQ-IOS-XCODE-001 -> UC-1, UC-2
- REQ-IOS-XCODE-002 -> UC-1, UC-2
- REQ-IOS-XCODE-003 -> UC-3
- REQ-IOS-XCODE-004 -> UC-3

## Acceptance-Criteria-To-Scenario Intent
- AC-IOS-XCODE-001 validates that the runner no longer silently uses the default Xcode 16.4.
- AC-IOS-XCODE-002 validates the observed App Store Connect SDK failure is fixed.
- AC-IOS-XCODE-003 validates the fix is intentionally narrow and does not disturb signing/certificate behavior.
- AC-IOS-XCODE-004 validates the repo's release workflow contract coverage remains aligned.

## Approval Status
Approved by user on 2026-06-08 for design/review/implementation of the small Xcode 26 CI workflow fix.
