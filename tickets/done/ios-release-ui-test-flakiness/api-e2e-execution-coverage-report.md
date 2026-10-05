# API/E2E Execution Coverage Report — iOS release UI-test flakiness

## Execution Round Meta

- Ticket folder (all artifacts): /Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness/tickets/in-progress/ios-release-ui-test-flakiness/
- Requirements: requirements-doc.md (SR-002, Approved). Investigation: investigation-notes.md. Solution record: solution-revision-record.md. Design: design-spec.md. Supplements: probes/, implementation-evidence/, solution-handoff.md.
- Implementation: implementation-handoff.md, implementation-revision-record.md (IR-001 c314aa98c; IR-002 8d3cb19ea).
- Code review (failure origin): code-review-report.md, code-review-revision-record.md (CRR-001 F-001). Architecture review: `N/A — not applicable`.
- Coverage investigation, ledger, revision record: api-e2e-coverage-investigation.md, api-e2e-test-case-ledger.md, api-e2e-revision-record.md. Evidence: api-e2e-evidence/.
- Current API/E2E revision `API-REV-002`; round 2; trigger: implementation_engineer Local Fix (IR-002). Prior round reviewed: round 1 (API-REV-001, Fail).

## Routing Classification

Small / Low; direct low-risk route → delivery; test-code review `Not Required — direct low-risk route`.

## Investigation And Execution Basis

The investigation was followed. Round 1 failed at CI-4 (F-1), and the code_reviewer confirmed the origin as Local Fix (CRR-001 F-001). Round 2 rechecked F-1 first: the fix plus 10 fresh CI passes.

CI method change, user-approved on 2026-10-05: the user rejected a ~2 h sequential series. The 10 dispatches ran in parallel, each with a distinct dummy `release_tag` input (v0.0.0-ci1..10) and `release_ref` = the fix branch, giving separate concurrency groups. No git tag was created, and publish_app_store_connect=false. A dry run of resolve-ios-release-metadata.py confirmed release_ref = branch and publish_requested=false.

## Test-Case Ledger Reconciliation

| Case | Final Result | Evidence |
| --- | --- | --- |
| CFG-1 build configuration (AC-I1b) | Pass | Debug `DEBUG`; Release none; TestAction Debug; ArchiveAction Release |
| L2 base, status delayed 7 s | fails with the CI form-A signature (swift:66/68) | local/L2-base-delay7/ |
| L1 / R2-L1 fix, delay 7 s | Pass (31.9 s / 32.6 s) | local/L1-*, local/R2-L1-* |
| L3 / R2-L3 fix, normal speed, both tests | Pass (18.6+12.4 s / 20.8+14.6 s) | local/L3-*, local/R2-L3-* |
| L4 / R2-L4 no server (negative) | fails as required | local/L4-*, local/R2-L4-* |
| L5 contract + core tests + unchanged smoke script | Pass (21/21) | local/L5-*, local/L6-smoke.log |
| CI round 1 (c314aa98c) | 3 passes, then CI-4 failure (F-1) | ci-series-results.jsonl, ci-run4/ |
| **CI round 2 (8d3cb19ea), 10 parallel dispatches** | **10/10 success on attempt 1; publish-secret-gate and upload-testflight skipped in all** | ci-r2-results.jsonl, ci-r2-run-ids.txt, ci-r2-ui-durations.txt |

## Changed Boundary And Evidence Matrix

| Requirement / AC | Evidence | Result |
| --- | --- | --- |
| REQ-I1 / AC-I1a | before: base fails with a 7 s status delay (form A reproduced); after: passes | Pass |
| REQ-I1 / AC-I1b | build settings and scheme: the override is compiled only in Debug; the Release archive uses the unchanged `ConnectionValidator()` (5 s) | Pass |
| REQ-I2 / AC-I2 | normal-speed passes without fixed sleeps; the negative (no server) still fails; the switch tap is confirmed before Connect (F-1 fix) | Pass |
| REQ-I3 / AC-I3 | 10 hosted dispatches on the fix branch (runs 37285707436, 37285711492, 37285715356, 37285719333, 37285726662, 37285723232, 37285730484, 37285733947, 37285737843, 37285740945): all success on attempt 1, publish jobs skipped. Hosts were often slow: fake-node 45–136 s (the old test waited 20 s for the page), unreachable test 15.6–65.5 s. | Pass |
| REQ-I4 / AC-I4 | contract check and core tests pass; the workflow is unchanged (no diff); publish gating verified (jobs conditioned on publish_requested == 'true'; skipped in all 14 dispatches) | Pass |

## Validation Confidence Scorecard

| Category | Round 1 | Final | Evidence / residual |
| --- | --- | --- | --- |
| Requirement and AC proof | 50 % | 97 % | all ACs proven directly; AC-I3 used parallel (user-approved) instead of sequential dispatches |
| Changed-boundary directness | 90 % | 97 % | the real release workflow on hosted macOS |
| Integration realism | 90 % | 96 % | 10 independent hosted machines |
| Environment fidelity | 95 % | 96 % | the same workflow, image path and publish gating as releases |
| Failure/edge evidence | 75 % | 95 % | forms A (local, deterministic) and D (fixed, confirmed by CI) covered; forms B/C absorbed by readiness waits (very slow hosts passed: 136 s) |
| User surface | N/A | N/A | no app UI change |
| Durable regression coverage | 75 % | 95 % | readiness- and effect-confirming UI tests; README slow-host regression command |

- Overall final confidence: **96 %**; no category below 90 %; all critical ACs directly proven; 95 % target met.

## Broader Validation

`Required`, executed: hosted CI (round 1 sequential ×4, round 2 parallel ×10) plus local simulator runs.

## Durable Coverage Changed By API/E2E

None. Test changes are the implementation's (IR-001, IR-002).

## Temporary Scaffolding / Artifacts

api-e2e-evidence/: ci-series.sh (round 1; its recording line had a flag bug, results reconstructed), ci-r2-watch.sh, local-run.sh, ci-run4/ failure evidence, the results JSONL files. Base worktree /tmp/ios-base removed. /tmp/ios-run4 holds downloaded run-4 artifacts (copied into the evidence folder).

## Cleanup

No processes left running. The remote branch `codex/ios-release-ui-test-flakiness` (8d3cb19ea) stays pushed for delivery. No git tags were created. No publish job ran in any of the 14 dispatches.

## Latest Authoritative Result

- Result: **Pass**. Final confidence 96 %.
- Prior failure F-1: resolved.
- Next: per `get_handoff_rules` (direct route → delivery).
- Notes: AC-I3 met with 10 parallel dispatches instead of sequential ones, a method change the user explicitly approved. Optional improvement noted by the implementation, not done: `continueAfterFailure = false`.
