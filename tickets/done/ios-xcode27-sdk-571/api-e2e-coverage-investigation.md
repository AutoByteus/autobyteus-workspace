# API/E2E Coverage Investigation — ios-xcode27-sdk-571 (autobyteus-571): iOS release builds with Xcode 27 / the iOS 27 SDK

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (Ready; Small / Low)
- Supplemental Task Artifacts: `evidence/probe/P-01-xcode27-build-only.txt`
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: the implementation engineer's handoff (direct route, Small / Low), HEAD `b03bb0e609` (code `e3950f9d07`; `b03bb0e609` adds documents only)
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

App Store Connect's ITMS-90725: from April 2027 an upload must be built with the iOS 27 SDK (Xcode 27). Both macOS jobs of `release-ios.yml` (`build-ios`, `upload-testflight`) now run on GitHub's `xcode-27` image. They select `IOS_XCODE_APP_PATH` (the workflow's only default: `/Applications/Xcode_27.2.app`) through one new script, `autobyteus-ios/scripts/select-release-xcode.sh`. The script refuses an Xcode or an iPhoneOS SDK whose major version is below 27, before any build, with a named error (REQ-001…003; D-1…D-3). The contract check pins the wiring (REQ-004; D-4). RELEASE.md and the iOS README follow. Nothing is uploaded, tagged or released (REQ-005). The archive job is proven only at a founder-approved upload (R-001, DEC-004).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (a build-only dispatch builds and tests), SCN-002 (the upload job: wiring only; the real archive waits for the founder's word), SCN-003 (an old toolchain is refused).
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-A1: the runner's job starts from a fresh clone, so the script's executable bit has to survive the clone. Trigger: `actions/checkout` and then `run: autobyteus-ios/scripts/select-release-xcode.sh`.
  - SCN-A2: a later Xcode on the image (28.x) or the image's other released 27.x is accepted. Trigger: a repository-variable override, or a moved pin.
  - SCN-A3: the Xcode is selected but the later `xcodebuild` steps really use its SDK (`DEVELOPER_DIR` through `$GITHUB_ENV`). Trigger: the build step after the selection.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 runner and default Xcode | Changed | REQ-001/002, D-1/D-2 | a real GitHub run (`build-ios`); the contract check for `upload-testflight` |
| BEH-002 toolchain guard (Xcode and SDK ≥ 27) | Changed | REQ-003, D-3 | the script against a real Xcode 26.1.1; stand-ins for the SDK floor and the success path |
| BEH-003 contract check and documents | Changed | REQ-004, D-4 | the contract check, positive and negative |
| Upload, tag, release | Preserved (none) | REQ-005 | the run's job list; tags and releases on GitHub |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | Yes | release wiring (workflow ↔ script ↔ contract check) | `ios-release-contract-check.py` | that the text rules match what the runner does | a real GitHub build-only run |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No | — | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | CI job steps: the toolchain selection before any build | IMP-02 (local script) | the runner image, `DEVELOPER_DIR` reaching the build | the GitHub run's log |
| Persisted-data transition | No | — | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | GitHub's `xcode-27` image; App Store Connect's SDK rule | P-01, IMP-03 | the archive/upload job (needs Apple secrets and the founder's word) | none without an upload |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-xcode27-sdk-571`, branch `codex/ios-xcode27-sdk-571` (pushed by the implementation engineer)
- Project type and runtime stack: iOS wrapper (Swift, XcodeGen) built by a GitHub Actions workflow; the contract check is Python
- Project testing guideline path(s): `TESTING.md` (root; "Fresh-start build"); `autobyteus-ios/README.md` (the iOS release section); `RELEASE.md` (iOS section, build-only run); `DESIGN.md` rule 12
- Conflicting, missing, or unclear project instructions: TESTING.md's fresh-start "How" names the desktop, Docker and Android jobs, not the iOS job; I follow the iOS job's own order. This Mac has only Xcode 26.1.1, so a local fresh start of the iOS job ends at its Xcode gate by design; the runner is the fresh start for the rest.
- Changed build-input paths: `.github/workflows/release-ios.yml` (`.github/workflows/**`), `autobyteus-ios/scripts/ios-release-contract-check.py` and `autobyteus-ios/scripts/select-release-xcode.sh` (`*/scripts/**`). Cases FS-LOCAL and GH-01.
- Required environment variables or secrets available: `N/A` (build-only runs need no secrets; no Apple secret is used)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` Fresh-start build | build inputs need a fresh clone and the job's order; a workflow change needs the build-only run | `git clone --no-local`, then the job's steps |
| `.github/workflows/release-ios.yml` | the job's steps | `build-ios`: checkout → Select Xcode 27 or newer → XcodeGen → simulator → pnpm/Node → install → demo → build, contract check, core tests, smoke |
| `RELEASE.md` iOS section | build-only dispatch | `publish_app_store_connect=false`; no secrets; nothing uploaded |
| `AGENTS.md` (team) | no upload, tag or release without the founder's word | read-only `gh` calls only |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Fresh clone | `~/.cache/abtest571/fs` | `git clone --no-local`, checkout `b03bb0e609` | not under a symlinked folder | — | removed |
| Stand-in toolchain | `~/.cache/abtest571/stand` | fake `xcodebuild`/`xcrun` on PATH and empty `Xcode_*.app/Contents/Developer` folders | only for the probe | — | removed |
| GitHub | — | `gh run view`, `gh run list`, `gh release list`, `git ls-remote --tags` (read only) | — | — | none |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| None | — | no secrets, no repository variables changed | — |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ios/scripts/ios-release-contract-check.py` `check_release_toolchain` | both jobs on `xcode-27`, the single default `Xcode_27.2.app`, the step calling the script before XcodeGen, no stale "Xcode 26", the script's floor/compare/log lines, no pipe, executable | REQ-002, REQ-004; AC-002, AC-004 | `Still Valid` (added by this change) | IMP-01 | run it in the fresh clone |
| the rest of `ios-release-contract-check.py` (metadata, bundle ids, smoke) | unchanged rules | BEH-003 preserved | `Still Valid` | IMP-01 | — |
| `AutoByteusMobileCoreTests`, the UI smoke (`ios-simulator-smoke.sh`) | the app builds and behaves | REQ-001; AC-001 | `Still Valid` | IMP-03 on the runner | — |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| R-IMP01 | AC-004 | contract check | `Reused` | IMP-01 (four negatives) | ran on `e3950f9d07`'s tree; `b03bb0e609` changes documents only |
| FS-LOCAL | AC-003, AC-004; SCN-A1 | the `build-ios` job's steps up to its Xcode gate, fresh clone | `Existing Test` / fresh start | clone `b03bb0e609`; the file mode; `select-release-xcode.sh` with the workflow's default and with this Mac's real Xcode 26.1.1; `ios-release-contract-check.py` | TESTING.md Fresh-start build; the local Xcode cannot go past the gate (by design) |
| PR-01 | AC-003; SCN-A2 | the script's decision table | `Temporary Probe` | stand-in `xcodebuild`/`xcrun`: 27.2/27.2, 27.0/27.0, 28.0/28.0 pass; 27.2 with SDK 26.2, 26.3/26.2, unparsable version, empty SDK refuse; `$GITHUB_ENV` written only on success | its inputs come from Apple's tools; a durable stand-in harness is more than this Small ticket needs, and the contract check pins the exact comparison lines |
| GH-01 | AC-001, AC-005; SCN-A3 | the real runner (fresh start on GitHub) | `Journey` (read-only check of IMP-03) | `gh run view 44730865039` (`--json`, `--log`): head SHA, images, the selection lines, the SDK the compile and test steps used, test counts, job conclusions | my own reading of the run, not the summary; the code is unchanged since |
| GH-02 | AC-005 | GitHub tags, releases, runs | `Journey` (read-only) | `gh run list --branch codex/ios-xcode27-sdk-571`, `gh release list`, `git ls-remote --tags origin` | REQ-005 |

- Test progress log needed: `Yes`

## Durable Coverage To Add

None. The contract check added by the implementation is the durable rule; PR-01 stays a temporary probe (see Planned Cases).

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None. The contract check's Xcode 26 rules were replaced by the implementation (its diff); no test file is removed.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| The archive/upload job on `xcode-27` (SCN-002, R-001) | needs Apple distribution secrets and an upload, only on the founder's word (REQ-005, DEC-004) | low: same runner label, default and script as `build-ios`, pinned by the contract check | Yes (the founder's approved upload; App Store Connect's email should carry no ITMS-90725) | delivery takes it to the founder |
| The full iOS job locally | this Mac has Xcode 26.1.1 only | none: the runner run covers it | No | — |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: —
- Notes: read-only on GitHub; nothing is dispatched, pushed, tagged or uploaded by API/E2E.
