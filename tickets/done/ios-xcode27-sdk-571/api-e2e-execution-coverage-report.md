# API/E2E Execution Coverage Report — ios-xcode27-sdk-571 (autobyteus-571): iOS release builds with Xcode 27 / the iOS 27 SDK

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: round 1; the implementation engineer's handoff IR-001 (direct route); HEAD `b03bb0e609` (code `e3950f9d07`)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why: none
- Evidence folder (absolute path): `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-xcode27-sdk-571/tickets/in-progress/ios-xcode27-sdk-571/evidence/api-e2e/`
  - `FS-LOCAL.log`, `PR-01-standins.log`, `GH-01-run-44730865039.log`, `GH-02-no-release.log`
  - `scripts/pr-01-standins.sh` (the temporary probe)

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `b03bb0e609` (code = `e3950f9d07`) | macOS 26.5.2 arm64, Xcode 26.1.1 (iPhoneOS SDK 26.1), Python 3.9.6 | a fresh clone (`git clone --no-local`, 0 prior build folders) in `~/.cache/abtest571/fs` | no secrets; `GITHUB_ENV` a temp file |
| ENV-2 | `e3950f9d07` | GitHub-hosted: `ubuntu-26.04` (metadata), `xcode-27-arm64` 20261104.0337.1 (iOS job) | build-only run 44730865039, `workflow_dispatch`, `publish_app_store_connect=false` (dispatched by the implementation engineer; read here with `gh`, read only) | no Apple secrets used |
| ENV-3 | `b03bb0e609` | macOS | stand-in `xcodebuild`/`xcrun` first on PATH, empty `Xcode_*.app/Contents/Developer` folders | temporary, removed |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-IMP01 | AC-004 | the contract check, negatives | IMP-01 | — | Reused (`Pass`) | `evidence/implementation/IMP-01-contract-check.log` | each of four reverts `exit=1` with its named rule; the change `exit=0` | `git diff --name-only e3950f9d07 b03bb0e609`: ticket documents only |
| FS-LOCAL | AC-003, AC-004; SCN-A1 | the `build-ios` job's steps up to its Xcode gate, from a fresh clone | `git clone --no-local <worktree> ~/.cache/abtest571/fs`, checkout `b03bb0e609`; file mode; `IOS_XCODE_APP_PATH=/Applications/Xcode_27.2.app GITHUB_ENV=$(mktemp) autobyteus-ios/scripts/select-release-xcode.sh`; the same with `/Applications/Xcode.app` (Xcode 26.1.1); `autobyteus-ios/scripts/ios-release-contract-check.py` | ENV-1 | `Pass` | `FS-LOCAL.log` | `0 prior build folders`; `-rwxr-xr-x; git: 100755`; "::error::Configured Xcode 27+ app path is unavailable: /Applications/Xcode_27.2.app" after "Installed Xcode apps:"; "::error::Selected Xcode must be 27 or newer; found '26.1.1' at /Applications/Xcode.app."; `exit=1; GITHUB_ENV: 0 bytes` (both); "iOS release contract checks passed." `exit=0` | the local Xcode cannot pass the gate, by design; the runner (GH-01) is the fresh start past it |
| PR-01 | AC-003; SCN-A2 | the script's decision table | `scripts/pr-01-standins.sh <clone> <work dir>`: nine cases with stand-in tools | ENV-3 | `Pass` | `PR-01-standins.log` | accepted, `DEVELOPER_DIR=…` written: 27.2/27.2, 27.0/27.0, 28.0/28.0; refused, `GITHUB_ENV` empty: 27.2 with SDK 26.2 ("Selected iPhoneOS SDK must be 27 or newer; found '26.2'"), 26.3/26.2 ("found '26.3'"), an unparsable version ("found 'unknown'"), an empty SDK ("found 'unknown'"), `xcodebuild` failing, `xcrun` failing | the two tool failures stop the job (exit 1, before any build) with the tool's own message ("xcrun: error: SDK \"iphoneos\" cannot be located"), not an `::error::` line: observation, see Notes of the result |
| GH-01 | AC-001, AC-005; SCN-A3 | the real runner (a fresh start on GitHub) | `gh run view 44730865039 --json …` and `--log` (7,583 lines), grepped | ENV-2 | `Pass` | `GH-01-run-44730865039.log` | `head e3950f9d07…`; `INPUT_PUBLISH_APP_STORE_CONNECT: false`; `Image: xcode-27-arm64`; "Selected Xcode app: /Applications/Xcode_27.2.app", "Xcode 27.2", "Build version 27B52", "Selected iPhoneOS SDK: 27.2"; `DEVELOPER_DIR: /Applications/Xcode_27.2.app/Contents/Developer` in every later step; the only paths named: `/Applications/Xcode_27.2.app` (394), `iPhoneSimulator27.2.sdk` (76), `iPhoneOS27.2.sdk` (3); "iOS release contract checks passed."; `** BUILD SUCCEEDED **`; "Executed 56 tests, with 0 failures"; "Executed 8 tests, with 0 failures"; "Smoke UI tests: executed and passed without skips"; publish jobs `skipped` | my own reading of IMP-03; the code is unchanged since |
| GH-02 | AC-005 | GitHub runs, releases, tags | `gh run list --workflow release-ios.yml --branch codex/ios-xcode27-sdk-571`; `gh run list --branch …`; `gh run view 44725773809`; `gh release list`; `git ls-remote --tags origin` | ENV-2 | `Pass` | `GH-02-no-release.log` | runs 44730865039 (branch) and 44725773809 (P-01, `probe/ios-xcode27-571`): "Archive And Upload To App Store Connect: skipped"; no tag at `e3950f9d07`/`b03bb0e609` ("none"); newest release `v1.5.14-beta.3` (10:46Z, before this ticket) | read only |
| NT-01 | AC-002 (the real archive), SCN-002, R-001 | the `upload-testflight` job on `xcode-27` | — | — | `Not Tested` | — | — | needs Apple's distribution secrets and an upload: only on the founder's word (REQ-005, DEC-004) |

## Failures

None.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | GH-01 (the real `xcode-27` runner: Xcode 27.2 / SDK 27.2 selected and used by every compile; build, 56 core, 8 smoke) | `Proven` | — |
| AC-002 | Yes | R-IMP01 (the upload job's runner revert fails the check), FS-LOCAL (the contract check passes: both jobs `runs-on: xcode-27`, the one default, the same step and script, before XcodeGen), GH-01 (the same script and default on the same image work) | `Proven` for the wiring; the real archive `Only The User Can Check` | the founder's approved upload (REQ-005, DEC-004): its App Store Connect email should carry no ITMS-90725. Tried: the wiring statically and the shared step on the runner; an archive needs the distribution secrets and an upload |
| AC-003 | Yes | FS-LOCAL (a real Xcode 26.1.1; the missing default path), PR-01 (the SDK floor under an Xcode 27 path; edge inputs) | `Proven` | — |
| AC-004 | Yes | FS-LOCAL (passes on the change, fresh clone), R-IMP01 (fails with the floor, the default, the runner or the mode reverted) | `Proven` | — |
| AC-005 | Yes | GH-01, GH-02 | `Proven` (for this ticket's runs so far; delivery keeps it) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 95% | FS-LOCAL, PR-01, GH-01, GH-02, R-IMP01 | the archive job (user-only, not counted) | — |
| Changed-boundary execution directness | 85% | 95% | the real runner's log: selection, `DEVELOPER_DIR`, the SDK each compile used | — | — |
| Cross-boundary integration realism and mock gap | 80% | 95% | GitHub's `xcode-27` image, not a stand-in | the stand-ins in PR-01 cover only the decision table | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | a fresh clone locally; the runner's own fresh start | the image's Xcode list changes over time (the guard and the override cover it) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 93% | real Xcode 26.1.1 refused; nine decision-table cases; nothing exported on refusal | a failing `xcodebuild`/`xcrun` stops the job with the tool's own message, without an `::error::` annotation | an `::error::` for the tool failures (optional) |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | no user surface: a CI toolchain change | — | — |
| Durable regression coverage quality and relevance | 92% | 92% | the contract check pins the floor (`MINIMUM_MAJOR=27`), both comparisons, the capture lines, the step, both runner labels, the one default and the executable bit, and runs in every release run | the script's parsing is proven by PR-01 and the runner, not by a durable behavioral test | a stand-in run of the script inside the contract check (it would change a release gate, so another build-only run; not worth it for this Small change) |

- Overall post-repository confidence: 86% (FS-LOCAL, PR-01, R-IMP01)
- Overall final confidence: 94% (94.2%, simple average of the six applicable categories)
- Calculation method: simple average; the user-surface category is not applicable
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` (94%: the tool-failure annotation and the behavioral durable test above; neither is a requirement gap)
- Confidence-limiting residual risks: R-001 (the archive job, at the founder's next approved upload); the runner image's Xcode list changing over time (the guard refuses anything older, and the error lists the installed apps)

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Other` (the real GitHub runner's run, read independently; a fresh local clone)
- Confidence gap or residual risk it addresses, and the expected gain: whether the selected toolchain is the one every compile uses on the real image; the fresh-start of the changed build inputs
- Browser validation needed, and why or why not: no; no web or UI change
- If `Not Required`: —
- If `Blocked`: —

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No` (no Xcode 26 fallback, a non-goal)
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (the contract check fails on any "Xcode 26" / "Xcode_26" in the workflow)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: —
- Upstream recipient notified: —

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No` (by API/E2E). The implementation's change to `autobyteus-ios/scripts/ios-release-contract-check.py` (`check_release_toolchain`) was exercised by FS-LOCAL and R-IMP01.
- Added or updated paths attached for proportional test-code review: `N/A` (direct route)
- Diff or repository evidence supplied for removed paths: none removed

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Xcode 27 / 28 and SDK variants (PR-01 only) | stand-in `xcodebuild`/`xcrun` | this Mac has Xcode 26.1.1; the real Xcode 27.2 is proven on the runner (GH-01) | none for the decision table |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Fresh clone, stand-ins, the downloaded run log (`~/.cache/abtest571`) | Yes | removed | — |
| GitHub | No (read only) | nothing dispatched, pushed, tagged or uploaded by API/E2E | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: AC-002's real archive (the founder's approved upload; R-001)
- Next recipient from `get_handoff_rules`: Delivery Engineer (direct Small / Low Pass)
- Notes:
  - Observation, not a failure: when `xcodebuild -version` or `xcrun --sdk iphoneos --show-sdk-version` itself fails, `select-release-xcode.sh` stops the job before any build (exit 1, `set -e`), and the log shows the tool's own error rather than an `::error::` line. REQ-003's failure-before-build holds.
  - FU-001 (the simulator choice) stays the Solution Designer's; GH-01 confirms the smoke still ran and passed on the image.
