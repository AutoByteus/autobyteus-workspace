# Docs Sync Report

## Scope

- Ticket: `investigate-ios-build-pipeline-failure`
- Trigger: Delivery after API/E2E validation passed for the iOS App Store Connect/TestFlight Xcode-selection fix.
- Bootstrap base reference: `origin/personal@dfc26eec54cdf685442740691ce5469754ab945f`
- Integrated base reference used for docs sync: `origin/personal@dfc26eec54cdf685442740691ce5469754ab945f`
- Post-integration verification reference: `git fetch origin personal --prune` passed on 2026-06-08; `git rev-list --left-right --count HEAD...origin/personal` returned `2 0`, so no new base commits were integrated and no post-merge rerun was required before docs sync.

## Why Docs Were Updated

- Summary: Long-lived iOS release documentation now records the new `IOS_XCODE_APP_PATH` repository variable and the workflow behavior that selects/logs Xcode 26+ before build/test and App Store Connect archive/upload.
- Why this should live in long-lived project docs: Operators need to know how to override the GitHub-hosted runner Xcode app path when runner images change, and future maintainers need the durable invariant that iOS TestFlight uploads must not rely on the runner default Xcode when App Store Connect requires iOS 26 SDK or later.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `README.md` | Root release documentation lists iOS workflow behavior and repository variables. | `Updated` | Added the Xcode 26+ selection/logging behavior and `IOS_XCODE_APP_PATH` to optional iOS variables. |
| `autobyteus-ios/README.md` | iOS-specific operator documentation owns TestFlight upload prerequisites and workflow contract. | `Updated` | Added `IOS_XCODE_APP_PATH` default and operator guidance for the Xcode 26+ selection invariant. |
| `.github/workflows/release-ios.yml` | Source-of-truth workflow behavior for the documented Xcode selection. | `No change` | Reviewed to ensure docs match implemented behavior: both build/test and archive/upload jobs set `DEVELOPER_DIR`, require Xcode major >= 26, and log Xcode/iPhoneOS SDK. |
| `autobyteus-ios/scripts/ios-release-contract-check.py` | Durable workflow contract checker for release workflow invariants. | `No change` | Reviewed to confirm `IOS_XCODE_APP_PATH` and Xcode 26+ checks are already covered by implementation/code-review scope. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `README.md` | Release docs/operator variable update | Added `IOS_XCODE_APP_PATH` to optional iOS publish variables and documented that simulator build/test plus App Store archive/upload jobs select Xcode 26+ and log selected Xcode/iPhoneOS SDK. | Keep root release guidance aligned with the final workflow behavior validated against App Store Connect/TestFlight. |
| `autobyteus-ios/README.md` | iOS workflow/operator guidance update | Added `IOS_XCODE_APP_PATH=/Applications/Xcode_26.3.app` to optional variables and explained when/how to override it. | Preserve durable knowledge needed when GitHub runner image Xcode paths change. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| iOS release workflow Xcode selection | The release workflow intentionally selects Xcode 26+ before simulator build/test and App Store Connect archive/upload; it does not rely on the runner default Xcode. | `requirements.md`, `design-spec.md`, `api-e2e-validation-report.md` | `README.md`, `autobyteus-ios/README.md` |
| Xcode app path override | `IOS_XCODE_APP_PATH` defaults to `/Applications/Xcode_26.3.app` and should be changed only if the runner image moves the required Xcode 26+ installation. | `api-e2e-validation-report.md`, remote publish evidence for run `27126365043` | `README.md`, `autobyteus-ios/README.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Implicit reliance on GitHub-hosted `macos-latest` default Xcode. | Explicit `IOS_XCODE_APP_PATH` selection with Xcode major-version guard and selected SDK logging. | `README.md`, `autobyteus-ios/README.md`, `.github/workflows/release-ios.yml` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A — docs were updated.
- Rationale: N/A.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed against the ticket branch after confirming the tracked remote base `origin/personal` had not advanced beyond the bootstrap base.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
