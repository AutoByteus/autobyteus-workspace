# API/E2E Test-Case Ledger — iOS release UI-test flakiness (API-REV-001)

## Ledger Meta

- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness (c314aa98c)
- Investigation / report / revision record: api-e2e-coverage-investigation.md, api-e2e-execution-coverage-report.md, api-e2e-revision-record.md (same folder)
- Reason: a 10-run hosted CI series (~3 h) plus local simulator runs.

## Planned Cases

| Case ID | Case | Requirement | Surface |
| --- | --- | --- | --- |
| CFG-1 | Debug/Release compilation conditions and scheme configs | AC-I1b | xcodebuild -showBuildSettings, scheme XML |
| L1 | fix, status delayed 7 s, fake-node test | AC-I1a | local simulator (iPhone 17, Xcode 26.1.1) |
| L2 | base (10fb69504) app+tests, status delayed 7 s | AC-I1a (before) | local |
| L3 | fix, normal speed, both UI tests | AC-I2 | local |
| L4 | fix, no fake server (negative) | AC-I2 | local |
| L5 | core tests + release contract check | AC-I4 | local |
| CI-1..CI-10 | sequential release-ios.yml dispatches, publish=false | AC-I3 | GitHub-hosted macos-latest |

## Execution Events

| Seq | Case | Event | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | CFG-1 | Completed | Debug `SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG`; Release none; TestAction Debug; ArchiveAction Release | Pass | console |
| 2 | — | Completed | pushed branch only: `codex/ios-release-ui-test-flakiness` → c314aa98c on origin (no tags; branch pushes trigger no workflow) | — | console |
| 3 | CI-series | Started | run 1 = 37273077861 dispatched 2026-10-05T06:34:08Z | — | api-e2e-evidence/ci-series.log, ci-series-results.jsonl |
| 4 | L1–L4 | Started | local script api-e2e-evidence/local-run.sh | — | api-e2e-evidence/local/ |
| 5 | L2 | Completed | base (10fb69504) app+tests, status delayed 7 s: FAILED at swift:66 "Expected WebView to exist" and swift:68 marker (exit 65), the CI form-A signature | Pass (reproduces) | local/L2-base-delay7/ |
| 6 | L1 | Completed | fix, delay 7 s: passed in 31.9 s | Pass | local/L1-fix-delay7/ |
| 7 | L3 | Completed | fix, delay 0: both UI tests passed (18.6 s, 12.4 s) | Pass | local/L3-fix-delay0-both/ |
| 8 | L4 | Completed | fix, no fake server: FAILED at the WebView/marker assertions (255 s), as required | Pass (negative holds) | local/L4-fix-no-server/ |
| 9 | L5 | Completed | release contract check passed; core tests 21/21; unchanged ios-simulator-smoke.sh passed both UI tests (18.6 s, 12.6 s), no skips | Pass | local/L5-*, local/L6-smoke.log |

| 10 | CI-1..3 | Completed | 37273077861, 37274140646, 37275410867: success on attempt 1; publish jobs skipped; fake-node 67.6/85.0/54.2 s | Pass | ci-series-results.jsonl |
| 11 | CI-4 | Completed | 37276561512: failure on attempt 1; unreachable test swift:31 after 157.6 s; switch `connection.httpAcknowledgement` value 0 at failure (tap had no effect); publish skipped | **Fail (F-1)** | ci-run4/ |
| 12 | CI-5..10 | Not started | series stops at the first failure | Not Tested | — |

### Round 2 (IR-002, commit 8d3cb19ea; trigger CRR-001 F-001)

| Seq | Case | Event | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 13 | R2-L3 | Completed | fix r2, delay 0: both UI tests passed (20.8 s, 14.6 s) | Pass | local/R2-L3-fix-delay0-both/ |
| 14 | R2-L1 | Completed | fix r2, delay 7 s: passed (32.6 s) | Pass | local/R2-L1-fix-delay7/ |
| 15 | R2-L4 | Completed | fix r2, no server: failed at swift:106/108 (WebView/marker), 256.8 s, as required | Pass (negative holds) | local/R2-L4-fix-no-server/ |
| 16 | — | Completed | pushed 8d3cb19ea to origin codex/ios-release-ui-test-flakiness (branch only, no tags) | — | console |
| 17 | CI series r2 | Decided | user (2026-10-05): "please go ahead … lightweight … instead of two or more than two hours". Method: 10 dispatches in parallel. Each dispatch passes a distinct dummy `release_tag` input (v0.0.0-ci1..10; input text only, no git tag created) plus `release_ref` = fix branch, which gives separate concurrency groups. publish_app_store_connect=false. Dry run of resolve-ios-release-metadata.py: release_ref = branch, publish_requested=false | — | — |
| 18 | CI-R2-1..10 | Completed | runs 37285707436 … 37285740945 on 8d3cb19ea: 10/10 success on attempt 1; publish-secret-gate and upload-testflight skipped in all; wall time 08:46–09:13 UTC (~27 min, two waves of ~5); fake-node test 45–136 s, unreachable test 15.6–65.5 s | **Pass** | ci-r2-results.jsonl, ci-r2-ui-durations.txt, ci-r2-run-ids.txt |

## Re-entry And Reconciliation

- Round 1 reconciled into the execution report: `Yes` (result Fail).
- Round 2 reconciled into the execution report: `Yes` (result Pass).

- If interrupted: read ci-series-results.jsonl (one line per finished run). The series script dispatches the next run only after the previous one completes. Resume by dispatching the remaining count sequentially; never dispatch in parallel; never publish.
