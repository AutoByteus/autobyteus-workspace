# Implementation Handoff — ios-xcode27-sdk-571 (autobyteus-571): iOS release builds with Xcode 27 and the iOS 27 SDK

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-xcode27-sdk-571`, branch `codex/ios-xcode27-sdk-571` (pushed for the build-only run), base `origin/personal` `fa6632cbca`. Ticket folder `tickets/in-progress/ios-xcode27-sdk-571/`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review not selected (Small/Low, direct route); Solution Designer's handoff `handoff-implementation.md`.
- Requirements doc: `requirements-doc.md` (REQ-001…005, AC-001…005).
- Investigation notes: `investigation-notes.md` (S-01…S-09, probe P-01).
- Solution revision record: `solution-revision-record.md` (SR-001).
- Design spec: `design-spec.md` (SR-001; D-1…D-4).
- Supplemental task artifacts: `evidence/probe/P-01-xcode27-build-only.txt` (probe run 44725773809).
- Design review report: `N/A — not applicable` (direct route).
- Architecture review revision record: `N/A — not applicable`.
- Triggering rework report: N/A (initial implementation).

## Current Implementation Summary

Both macOS jobs of `release-ios.yml` run on GitHub's `xcode-27` image and select `/Applications/Xcode_27.2.app` by default. One new script, `autobyteus-ios/scripts/select-release-xcode.sh`, owns the toolchain rule (Xcode and its iPhoneOS SDK major version 27 or newer) and is called by both jobs in place of the two inline "Select Xcode 26 or newer" copies. The contract check, RELEASE.md and the iOS README follow.

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Commits: `e3950f9d07` (the change, ticket documents, IMP-01/IMP-02 evidence); the next commit adds this handoff, the revision record and IMP-03. No tag was made.

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk.
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: five files as designed (the workflow, one new 50-line script, the contract check's Xcode section, two documents); no app source, `project.yml`, contract, persistence or ownership change. The escalation trigger (Xcode 27 refusing the build) did not fire: IMP-03.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below).
- New design impact or escalation trigger: `None`.

### Lightweight self-review

- **Spec fidelity:** D-1 (both `runs-on: xcode-27`), D-2 (the one default `/Applications/Xcode_27.2.app` in `env`), D-3 (the script: requires `IOS_XCODE_APP_PATH` and `GITHUB_ENV`; a missing app lists `/Applications/Xcode*.app`; parses the full `xcodebuild -version` output; Xcode and SDK floors from one constant `MINIMUM_MAJOR=27`; `::error::` names the version and path; exports `DEVELOPER_DIR` only on success; logs the three lines AC-001 reads), D-4 (the contract check) — all as designed. The design's failure wording is used.
- **Removed:** the two inline steps, their two `${IOS_XCODE_APP_PATH:-…Xcode_26.3.app}` fallbacks, the contract check's Xcode 26 strings, the Xcode 26 text in both documents. No Xcode 26 text remains outside the ticket folder (a search over the repository's `.md`, `.yml`, `.py`, `.sh`).
- **One small addition beyond D-4:** the contract check also requires the script to be executable, since the workflow runs it by path (`run: autobyteus-ios/scripts/select-release-xcode.sh`) and a lost executable bit would fail every release; and it refuses a `IOS_XCODE_APP_PATH:-` fallback inside either job (the design's "no second default").
- **Order inside the script:** `DEVELOPER_DIR` is exported to the step's own shell before `xcodebuild -version` (so the selected Xcode answers), and written to `$GITHUB_ENV` only after both floors pass, so a failed selection leaves nothing for later steps (IMP-02: `GITHUB_ENV after: 0 bytes`).
- **Untouched:** app source, `project.yml`, signing, metadata, upload steps, other workflows, the `actions/checkout@v4` notice (design: out of scope).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001, REQ-002) | Both jobs on `xcode-27`, Xcode 27.2 by default; the override and the logging preserved | `.github/workflows/release-ios.yml`: `env.IOS_XCODE_APP_PATH` (`vars.IOS_XCODE_APP_PATH \|\| '/Applications/Xcode_27.2.app'`), `build-ios` and `upload-testflight` `runs-on: xcode-27`, step "Select Xcode 27 or newer" → the script, before "Install XcodeGen" | IMP-03 (build-only run on GitHub); upload job by the same step and runner (contract check, IMP-01) |
| BEH-002 (REQ-003) | Floor 27 for Xcode and SDK; the full-output parse preserved | `autobyteus-ios/scripts/select-release-xcode.sh` | IMP-02: the local Xcode 26.1.1 refused; a missing path and an unset variable refused; stand-ins show the SDK floor and the success path |
| BEH-003 (REQ-004) | The contract check and the docs state the new rule | `autobyteus-ios/scripts/ios-release-contract-check.py` (`check_release_toolchain`), `RELEASE.md` (iOS bullet), `autobyteus-ios/README.md` | IMP-01 (passes; fails with the floor, the default or a runner reverted, or the script not executable) |
| REQ-005 | No upload, tag or release | build-only dispatch with `publish_app_store_connect=false` | IMP-03: the publish jobs skipped; no tag made |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`.

## Key Files Or Areas

- `.github/workflows/release-ios.yml`
- `autobyteus-ios/scripts/select-release-xcode.sh` (new, executable)
- `autobyteus-ios/scripts/ios-release-contract-check.py`
- `RELEASE.md`, `autobyteus-ios/README.md`

## Important Assumptions

- The `xcode-27` image keeps `/Applications/Xcode_27.2.app` for a while; when GitHub drops it, the script's error lists what is installed and the repository variable or a one-line change moves the pin (design D-2).

## Known Risks

- R-001 (design): the archive/upload job is not exercised by a build-only run; it shares the runner, script and default with `build-ios` (contract check). It is proven at the next founder-approved upload, whose App Store Connect email should carry no ITMS-90725.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Behavior Change` (toolchain requirement)
- Reviewed root-cause classification: `Duplicated Policy Or Coordination` (structure); an outdated toolchain pin (trigger)
- Reviewed refactor decision: `Refactor Needed Now` (the extraction into one script)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: one script, called by both jobs; the default path written once.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no Xcode 26 fallback)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes`
- Dead code found elsewhere, added to `follow-ups.md`: None (FU-001 is the Solution Designer's).
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied: `Yes`
- Deviations from a design principle: `None`
- Changed source implementation files within size guardrails: `Yes` (the contract check grows by about 30 lines, 280 in all).
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (CI configuration only).

## Environment Or Dependency Notes

- GitHub's `xcode-27` runner image (`xcode-27-arm64`). Locally this Mac has Xcode 26.1.1 only, so the success path is proven on GitHub (IMP-03) and with stand-ins (IMP-02).

## Checks Run

Evidence folder: `tickets/in-progress/ios-xcode27-sdk-571/evidence/implementation/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `autobyteus-ios/scripts/ios-release-contract-check.py` on the change, then with one revert at a time (the script's floor to 26; the default to Xcode_26.3; `upload-testflight`'s runner to `macos-latest`; the script not executable), each file restored after its case | `e3950f9d07` tree | macOS 26.5.2, Python 3 | the contract check against the workflow and the script | AC-002, AC-004 | Pass | `IMP-01-contract-check.log` | `iOS release contract checks passed.` then four `exit=1` with the missing text named, then passed again |
| IMP-02 | `IOS_XCODE_APP_PATH=/Applications/Xcode.app GITHUB_ENV=$(mktemp) autobyteus-ios/scripts/select-release-xcode.sh`; a missing app path; the variable unset; stand-in `xcodebuild`/`xcrun` on `PATH` for Xcode 27.2 with SDK 26.2, and 27.2 with 27.2 | `e3950f9d07` tree | macOS 26.5.2, Xcode 26.1.1 (SDK 26.1) | `select-release-xcode.sh`, every branch | AC-003 | Pass | `IMP-02-select-script-local.log` | `::error::Selected Xcode must be 27 or newer; found '26.1.1' at /Applications/Xcode.app.` `exit=1`, `GITHUB_ENV after: 0 bytes`; `::error::Selected iPhoneOS SDK must be 27 or newer; found '26.2' …`; success: `Selected Xcode app: …`, `Selected iPhoneOS SDK: 27.2`, `DEVELOPER_DIR=…/Contents/Developer` |
| IMP-03 | `gh workflow run release-ios.yml --ref codex/ios-xcode27-sdk-571 -f publish_app_store_connect=false` → run 44730865039; excerpts from `gh run view 44730865039 --log` and its job list | `e3950f9d07` (the run's head) | GitHub: `ubuntu-26.04` (metadata), `xcode-27-arm64` (iOS job) | the whole build-only release: the select step on the new script, XcodeGen, the demo build, the simulator build, core tests, the UI smoke | AC-001, AC-005; REQ-001, REQ-003, REQ-005 | Pass | `IMP-03-build-only-run.txt` | `Image: xcode-27-arm64`; `Selected Xcode app: /Applications/Xcode_27.2.app`; `Xcode 27.2`; `Selected iPhoneOS SDK: 27.2`; `** BUILD SUCCEEDED **`; `Executed 56 tests, with 0 failures`; `Executed 8 tests, with 0 failures`; `Smoke UI tests: executed and passed without skips`; `run: success`, `Validate iOS Publish Secrets: skipped`, `Archive And Upload To App Store Connect: skipped` |

- Not run, and why: the archive/upload job (needs the founder's word and the signing secrets; REQ-005, R-001).

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: CI configuration and documents only.

## Downstream Coverage Hints / Suggested Scenarios

- The build-only run IMP-03 is the executable proof of AC-001 and AC-005; API/E2E may reuse it (same commit) rather than dispatch again.
- AC-002 rests on the contract check and the shared step; the real archive is R-001.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- API/E2E's validation of the package. No further GitHub run is needed unless the code changes.
