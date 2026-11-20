# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `ios-xcode27-sdk-571`
- Request / ticket: autobyteus-571 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), relaying the founder's words "Fix this now" (2026-11-20)
- Requirements owner: Solution Designer
- Date: 2026-11-20
- Approved by and reference: Solution Designer within the direction (user informed); reference: my message to the founder in this conversation, 2026-11-20
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements and their approved versions: none

## Problem And Desired Outcome

- **Problem:** App Store Connect warned on Build 343 (v1.5.14-beta.3), `ITMS-90725`: "This app was built with the iOS 26.2 SDK. Starting April 2027, iOS and iPadOS apps must be built with the iOS 27 SDK or later, included in Xcode 27 or later, in order to be uploaded to App Store Connect or submitted for distribution." The delivery succeeded, but from April 2027 such an upload is refused.
  - The cause is measured: the beta.3 run (44721148794) selected `/Applications/Xcode_26.3.app` on `macos-latest` (image `macos-26-arm64` 20261117) and logged "Selected iPhoneOS SDK: 26.2".
  - The workflow pins Xcode 26.3 (`release-ios.yml:40`, `:129`, `:395`). The runner `macos-latest` has no Xcode 27 at all (its newest is 26.6).
- **Affected actors or systems:**
  - the founder, who uploads to App Store Connect / TestFlight on his word;
  - the iOS release workflow and its contract check;
  - App Store Connect's SDK check.
- **Desired outcome:** every iOS build the release workflow makes, both the simulator build/test and the App Store archive, is built with a released (non-beta) Xcode 27 or newer and the iOS 27 SDK or newer. The workflow refuses to build with anything older.
- **Observable definition of success:**
  - a build-only run on a GitHub-hosted runner logs Xcode 27.x and iPhoneOS SDK 27.x, and its simulator build, core tests and UI smoke pass;
  - the workflow fails early, with a clear error, when the selected Xcode or SDK is older than 27.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001, SCN-002 | Both macOS jobs (`build-ios`, `upload-testflight`) run on `macos-latest` and select `IOS_XCODE_APP_PATH`, default `/Applications/Xcode_26.3.app`. The beta.3 build used Xcode 26.3 with iPhoneOS SDK 26.2. | Both jobs run where a released Xcode 27+ is installed, and select it by default. | `IOS_XCODE_APP_PATH` still overrides the path. The selected Xcode and SDK are still logged before any `xcodebuild`. | investigation-notes.md, Source Log S-01…S-05 |
| BEH-002 | Operational | SCN-003 | The guard fails only when the Xcode major version is below 26. It does not check the SDK; it only logs it. | The guard fails when the Xcode major version is below 27, or the iPhoneOS SDK major version is below 27. | The guard still parses the full `xcodebuild -version` output; the contract check forbids piping it. | `release-ios.yml:139-155`; `ios-release-contract-check.py:191-220` |
| BEH-003 | Contract | SCN-001 | The contract check requires the Xcode 26 strings. RELEASE.md and `autobyteus-ios/README.md` document "Xcode 26 or newer" and Xcode_26.3. | The contract check and documents state the Xcode 27 rule and its default. | Every other contract-check rule is unchanged. | `ios-release-contract-check.py:191-220`; RELEASE.md:523; `autobyteus-ios/README.md:134-139` |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Founder | Upload iOS builds that App Store Connect accepts after April 2027 | The next upload has no ITMS-90725 | Nothing is uploaded without his word (REQ-005) |
| Release team | Cut releases with the iOS workflow | The same workflow works with no manual Xcode step | The repository variable stays an override only |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A tag or a manual dispatch builds and tests the iOS app with Xcode 27+ / iOS 27+ SDK | SCN-001 |
| UC-002 | A publish-enabled run archives and uploads with Xcode 27+ / iOS 27+ SDK | SCN-002 |
| UC-003 | The workflow refuses an Xcode or SDK older than 27 | SCN-003 |

### Out Of Scope

- Any upload to App Store Connect or TestFlight, a tag or a release. They wait for the founder's word.
- Raising the app's minimum iOS (deployment target 17.0) or the Swift language mode (5.10). Either changes only if Xcode 27 refuses to build without it; then it is in this ticket as the smallest change that builds.
- The desktop, Android and server workflows.
- Adopting new iOS 27 features or APIs.

### Non-Goals

- Keeping Xcode 26 as a fallback.
- Following every new Xcode release automatically.

### Preserved Behavior Boundary

- BEH-001's preserved column; BEH-002's parsing rule; BEH-003's other rules.
- Build-only runs need no Apple secrets and upload nothing (RELEASE.md iOS section).
- The app's behavior, version metadata, bundle IDs and signing are unchanged.

### Prerequisites

None. GitHub's `xcode-27` runner is generally available (changelog 2026-10-15), and the repository is public.

### Review Authority

The template's standard rules apply.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | The simulator build/test job builds with a released Xcode 27 or newer and the iOS 27 SDK or newer. | BEH-001 | Must | ITMS-90725 | Probe run 44725773809 (investigation notes, P-01) | Task autobyteus-571; DEC-001, DEC-002 |
| REQ-002 | The App Store archive/upload job builds with the same Xcode as REQ-001. | BEH-001 | Must | The uploaded binary is what Apple checks | Same runner and selection step as REQ-001 | Task; DEC-001 |
| REQ-003 | Both jobs fail before any `xcodebuild` build when the selected Xcode's major version is below 27 or its iPhoneOS SDK major version is below 27. The error names what was found and where. | BEH-002 | Must | Apple checks the SDK. A stale override or a runner change must not quietly bring back an old SDK. | N/A | DEC-003 |
| REQ-004 | The contract check, RELEASE.md and `autobyteus-ios/README.md` state the Xcode 27 rule and the new default. | BEH-003 | Must | Project rule: the contract check guards the release wiring | N/A | DESIGN.md / RELEASE.md |
| REQ-005 | This ticket uploads nothing to App Store Connect or TestFlight and makes no tag or release. | — | Must | The founder's standing rule | N/A | Task constraints |

## Acceptance Criteria

| AC ID | Related REQ | Scenario | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | Build-only dispatch (`publish_app_store_connect=false`) of the final branch on GitHub | The log shows a macOS 27 / xcode-27 runner image, "Selected Xcode app: …Xcode_27.x", "Xcode 27.x" and "Selected iPhoneOS SDK: 27.x". The simulator build, `AutoByteusMobileCoreTests` and the UI smoke pass. | — | Real GitHub run, log excerpts in the evidence |
| AC-002 | REQ-002 | SCN-002 | The workflow file | `upload-testflight` uses the same runner label, default path and guard as `build-ios`; the contract check enforces it | — | Contract check; workflow review. The real archive is proven at the next founder-approved upload (residual risk). |
| AC-003 | REQ-003 | SCN-003 | Guard run with an Xcode 26 path (local or CI) | Fails with an error naming the version found and the path; no build starts | An SDK below 27 under an Xcode 27 path also fails | Local run of the guard logic against Xcode 26.1.1 |
| AC-004 | REQ-004 | SCN-001 | `ios-release-contract-check.py` | Passes on the change; fails when the 27 floor or the Xcode 27 default is removed | — | Run it; a negative check |
| AC-005 | REQ-005 | — | Delivery | No tag or release, and the upload job is skipped in every run of this ticket | — | Run job list; `git tag` |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Goal Or Event | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | Release team / tag push or dispatch | Build and test the iOS app | `v*` tag or `workflow_dispatch` | Workflow on GitHub | prepare → select Xcode → build → core tests → UI smoke | Built with Xcode 27+ / SDK 27+, tests pass | Guard fails (SCN-003) | Supported Normal Scenario | RELEASE.md iOS section | REQ-001, REQ-004; AC-001, AC-004 |
| SCN-002 | Operational | Release team, on the founder's word | Upload to TestFlight | Tag, or dispatch with publish | Secrets present | build → secret gate → select Xcode → archive → export → upload | The binary is built with SDK 27+; no ITMS-90725 | Missing secrets fail fast (unchanged) | Supported Normal Scenario | beta.3 run 44721148794 | REQ-002; AC-002 |
| SCN-003 | Operational | Workflow | Refuse an old toolchain | Selected Xcode or SDK below 27 | Any run | select Xcode → guard | Fails with a clear error before building | — | Supported Explicit Edge Scenario (REQ-003; ITMS-90725) | DEC-003 | REQ-003; AC-003 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. N/A for every Product design field.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001…003 | Compliance | iOS 27 SDK or later for every build that can be uploaded | Apple's rule from April 2027 | AC-001, AC-003 |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Apple ITMS-90725 | iOS 27 SDK or later, in Xcode 27 or later, from April 2027 | The founder's App Store Connect email (Task context file; private, not committed) | — |
| App Store Connect accepts only released Xcode builds | Do not use the Xcode 27.3 beta | Apple's upload policy; DEC-002 | — |
| GitHub `xcode-27` runner image | Xcode 27.0, 27.1 (default), 27.2, 27.3 beta; iOS 27.x simulators | runner-images release `xcode-27-arm64/20261119.0378`; changelog 2026-10-15 (GA) | Images drop old minor versions over time; the guard (REQ-003) and the override catch it |

## Supplemental Artifacts

None. Evidence is in investigation-notes.md and `evidence/`.

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The app builds and its tests pass with Xcode 27.2 without source changes | Keeps the change to the workflow | Probe run 44725773809 | **Confirmed**: build succeeded, 56 core and 8 UI smoke tests passed (P-01) |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Where does the iOS build run? | `macos-latest` (macOS 26) has no Xcode 27 | `macos-latest` / `macos-26`: Xcode 26.0–26.6 only. `xcode-27`: GA since 2026-10-15, Xcode 27.x. GitHub now ties images to one Xcode major version. | **`runs-on: xcode-27`** for both macOS jobs. It is GitHub's supported image for Xcode 27, and the label states the toolchain the job needs. | Solution Designer | Decided |
| DEC-002 | Which Xcode 27? | The SDK in the binary | 27.0, 27.1 (image default), 27.2 (newest release, 27B52), 27.3 (beta, not accepted by App Store Connect) | **Pin `/Applications/Xcode_27.2.app`**, the newest released Xcode, as the project already pins an explicit path. Its iOS 27.2 simulators include iPhone 17, which the smoke uses. | Solution Designer | Decided |
| DEC-003 | What does the guard enforce? | Apple checks the SDK, not the Xcode number | Today: Xcode major ≥ 26, SDK only logged | **Require Xcode major ≥ 27 and iPhoneOS SDK major ≥ 27.** It fails early with a named error. | Solution Designer | Decided |
| DEC-004 | Does this ticket prove the fix with an upload? | Only an upload shows that Apple no longer warns | An upload needs the founder's word | **No upload here.** A build-only run proves the toolchain. The next founder-approved release shows the warning gone; that is not an open item of this ticket. | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 | P-01 |
| REQ-002 | UC-002 | BEH-001 | AC-002 | SCN-002 | S-02 |
| REQ-003 | UC-003 | BEH-002 | AC-003 | SCN-003 | — |
| REQ-004 | UC-001 | BEH-003 | AC-004 | SCN-001 | — |
| REQ-005 | — | — | AC-005 | — | — |

## Architecture Phase Input

- **Scenarios to map:** SCN-001…003.
- **Constraints:**
  - build-only runs need no secrets and upload nothing;
  - the repository variable stays an override;
  - the contract check stays the guard of the wiring.
- **Technical facts to verify:** that the app compiles and tests pass under Xcode 27.2 (P-01); the simulator choice on the new image.
- **Risks:** the archive job runs only on a real upload.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence: `N/A`
- UI/UX approval: `N/A`
- Material assumptions and decisions are visible: `Yes`
- Content ready for approval: `Yes`

### Approved Basis Ready For Design

- Approval recorded: `Yes` (within the direction; the founder informed)
- Exact basis recorded: `Yes`
- Ready for architecture design: `Yes`
