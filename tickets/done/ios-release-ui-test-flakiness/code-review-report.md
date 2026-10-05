# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: requirements-doc.md (SR-002, Approved U02)
- Investigation Notes Reviewed As Context: investigation-notes.md (I10–I13 relevant)
- Solution Revision Record Reviewed As Context: solution-revision-record.md
- Design Spec Reviewed As Context: design-spec.md
- Supplemental Task Artifacts Reviewed As Context: solution-handoff.md; probes/ (context only)
- Relevant Solution Revision IDs: SR-002
- Design Review Report Reviewed As Context: N/A — not applicable (direct route)
- Architecture Review Revision Record Reviewed As Context: N/A — not applicable (direct route)
- Relevant Architecture Review Revision IDs: N/A
- Implementation Handoff Reviewed As Context: implementation-handoff.md
- Implementation Revision Record Reviewed As Context: implementation-revision-record.md
- Relevant Implementation Revision IDs: IR-001 (commit c314aa98c)
- Code Review Revision Record: code-review-revision-record.md
- Current Code Review Revision ID: CRR-001
- Current Review Round: 1
- Review Scope: `N/A` (failure-origin round)
- Review Scope Evidence (round >1): N/A
- Trigger: api_e2e_engineer API/E2E failure (API-REV-001), CI-4 failed on attempt 1
- Prior Review Round Reviewed: N/A (no prior code review; direct route)
- Latest Authoritative Round: 1
- Coverage Investigation Reviewed: api-e2e-coverage-investigation.md
- Execution Coverage Report Reviewed: api-e2e-execution-coverage-report.md
- API/E2E Revision Record Reviewed: api-e2e-revision-record.md
- Relevant API/E2E Revision IDs: API-REV-001
- Delivery Revision Record Reviewed: N/A
- Relevant Delivery Revision IDs: N/A
- Failing Scenario IDs: CI-4 (ledger row 11, F-1) → AC-I3; test `testUnreachableNodeShowsNativeDiagnosticWhenSmokeEnvironmentIsPresent`
- Exact Failing Commands / Execution Mode: `gh workflow run release-ios.yml --ref codex/ios-release-ui-test-flakiness -f publish_app_store_connect=false` (GitHub run 37276561512, sequential dispatch 4, macos-latest hosted)
- Failure Evidence Paths: api-e2e-evidence/ci-run4/{failure-screen.png, ui-hierarchy-at-failure.txt, xcodebuild-test.log, fake-mobile-server.log}; api-e2e-evidence/ci-series-results.jsonl

## Routing Classification Review

- Task size: `Small`
- Architectural risk: `Low`
- Selected route: `API/E2E Failure-Origin Review`
- Independent source review required by the classification: `Failure-origin exception`
- Classification evidence or correction required: None. The failure is in the UI-test step logic and does not touch production behavior, workflow gating, the production timeout, or runner selection, so the High escalation trigger does not apply.

## Review Scope

- Changed implementation and behavior reviewed: the `connect()` / `tapWhenHittable()` path in the UI test, and the app path that consumes the switch state (`ConnectionViewController.submit` → `AppShellCoordinator.submitInput` → `ConnectionInputResolver.resolve`).
- Files / areas reviewed: autobyteus-ios/AutoByteusMobileUITests/AutoByteusMobileUITests.swift; autobyteus-ios/AutoByteusMobile/ConnectionViewController.swift; autobyteus-ios/AutoByteusMobile/AppShellCoordinator.swift (submitInput/showConnection); autobyteus-ios/AutoByteusMobileCore/ConnectionInputResolver.swift; CI-4 evidence.
- Explicit exclusions: full source audit and scorecard (failure-origin round); the DEBUG override (AC-I1) and fake-server flag, which this failure does not involve.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-I2/BEH-I2 require the smoke tests to wait robustly for readiness so that host slowness does not fail them, while keeping the same assertions. REQ-I3/AC-I3 requires 10 consecutive first-attempt CI passes.
- Design-spec behavior map verified against the implementation: BEH-I2's path (launch helper / connect() / assertFakeMobileLoaded) is implemented as designed. The design lists "switch and button hittable" as readiness conditions. It does not require checking that a tap took effect.
- Design review report and round confirmed: N/A — direct route.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None for classification. AC-I3's run count is a separate owner decision (see Residual Risks).

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-I2 | Confirmed (scenario valid; implementation incomplete for one slow-host form) | `connect()` → `tapWhenHittable(switch)` waits for `exists && hittable` and then taps once, without checking the switch value. Then `tapWhenHittable(connect)`. | — |
| Preserved: HTTP acknowledgement gate | Confirmed (correct product behavior) | `submit()` passes `httpSwitch.isOn`. `ConnectionInputResolver.resolve` returns `httpNeedsAcknowledgement` for http when the switch is off. `submitInput` then calls `showConnection(diagnostic:)`. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Entry Surface / Event | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S-1 | REQ-I2, REQ-I3, AC-I3 | Operational | Release workflow (CI) on a GitHub-hosted simulator | Smoke-test the unreachable-node diagnostic during the release | release-ios.yml → ios-simulator-smoke.sh → XCUITest | Normal | Type the http URL → acknowledgement switch on → Connect → validator fails on port 9 → "unreachable" diagnostic | The diagnostic appears and the test passes on a slow host | requirements-doc Problem/REQ-I2; CI history I10 | Supported Normal Scenario | Use |
| S-2 | Preserved HTTP gate | User | App user | Connect to a private-network http node | Connection screen: switch + Connect | Normal | `submit()` → resolver → acknowledgement gate | With the switch off, http is refused with "HTTP needs explicit acknowledgement" | ConnectionInputResolver.swift:12-13, core tests | Supported Normal Scenario | Use (as the preserved contract) |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-1 | The UI test taps the acknowledgement switch once after it becomes hittable, but never confirms the switch is on before tapping Connect. On the slow host the tap had no effect. | S-1 / REQ-I2 | Slow hosted simulator (I10). This is the same class of slowness the ticket fixes. | Tap synthesized at 61.29 s; app idle at 63.04 s. Connect tapped at 64.26 s. Resolver refused http because the switch was off, so no connection was attempted and "unreachable" could never appear. The 90 s wait expired and the test failed at swift:31, which fails AC-I3. | xcodebuild-test.log lines 404–422. The failure screen and hierarchy (line 11) show the "HTTP needs explicit acknowledgement" diagnostic, which only the resolver emits when `httpAcknowledged == false`. | Promote | Bounded test-code fix in `connect()`; see F-001. |
| C-2 | Product defect: does the app ignore a real switch tap? | S-2 | None independent. A real user sees the switch state and can tap again. There is no evidence of a lost tap outside an overloaded CI simulator. | — | App code is a plain `UISwitch` read at submit time, with no reset between the switch tap and Connect. | Reject | Technically possible but unsupported; no product change. |
| C-3 | Is the post-failure value `0` alone proof that the tap failed? | — | — | `showConnection(diagnostic:)` builds a new `ConnectionViewController`, whose new `UISwitch` defaults to off. So the hierarchy's `value: 0` is the re-rendered switch, not the original one. | AppShellCoordinator.submitInput → showConnection; ConnectionViewController `private let httpSwitch = UISwitch()` | Reject (as evidence) | This corrects the evidence reasoning only. The conclusion stands because the *acknowledgement diagnostic* proves the switch was off at submit. |
| C-4 | Related to the 5 s timeout or the DEBUG override? | REQ-I1 | — | No validator call was made, since the resolver refused first. | Log: no network attempt; the fake-server log is unrelated | Reject | Not related, as API/E2E stated. |

## Findings

### F-001 — Switch tap is not checked for effect before Connect (Local Fix, implementation-owned)

- Scenario / contract: S-1, REQ-I2/BEH-I2 ("slowness does not fail the test"), AC-I3.
- Evidence: CI run 37276561512. The switch tap was synthesized (log 407–412) but had no effect. The app then showed `httpNeedsAcknowledgement` (hierarchy line 11, failure-screen.png), which means `submit()` read `httpSwitch.isOn == false`. The test then waited 90 s for a diagnostic that was impossible in that state.
- Why it matters: the readiness-only approach (hittable before tap) does not cover a tap that is delivered but has no effect on a loaded simulator. The same `connect()` path also serves `testFakeNodeOpensAndRestoresWithFakeMobileMarker`. That test passed in all 4 runs, but it is equally exposed.
- Required action (bounded, in `AutoByteusMobileUITests.swift` only):
  1. After tapping the switch, wait (bounded, e.g. `uiReadyTimeout`) for `value == "1"`. If it is still not `"1"`, tap again, checking the value before each re-tap so the switch is never toggled back off. Limit this to a small number of attempts.
  2. Before tapping Connect, assert that the switch is on with a precise message (e.g. "HTTP acknowledgement switch should be on before Connect"). A future recurrence then fails at the real step, not 90 s later at swift:31.
  3. Optional and cheap: before tapping Connect, assert that the input's value contains the typed URL. Typing worked in CI-4, but this guards the same "action without effect" form for typing.
  4. No fixed sleeps, no production changes, and keep the existing assertions (REQ-I2/AC-I2). Re-run the local proofs (AC-I1a, AC-I2 including the negative check) before CI.
- Review-gap note: no prior source review occurred (direct route), so this is not a reviewer gap. It was not caught by the local proofs because a lost tap only shows up under CI-host load.

## Classification

- `Local Fix` — bounded correction to implementation-owned test source (the UI test file is a design-mapped implementation deliverable for REQ-I2). No requirement or design change is needed for the fix itself.

## Recommended Recipient

- `implementation_engineer`. After the fix, the package returns to API/E2E (AC-I1a/AC-I2 local checks and the CI series, which restarts at 1). A separate code review is not mandated for this Small/Low direct-route package. A proportional test-code review applies after a successful API/E2E run, per the team route.

## Residual Risks

- Other unseen slow-host forms may exist. AC-I3 is the only check for them.
- **AC-I3 run count (owner decision, not a reviewer call):** the user has asked whether 10 sequential runs (~2–3 h) are needed. AC-I3 is an approved acceptance criterion, so lowering it is a requirement change that needs `solution_designer` and explicit user approval. Implementation should not wait on that decision. API/E2E should run the series under whatever AC-I3 is current when it re-validates.

## Latest Authoritative Result

- Review Decision: Fail — failure origin confirmed
- Review Entry Point: API/E2E Failure-Origin Review
- Supported Product Scenario Gate: Pass (S-1, S-2 supported; C-2/C-3/C-4 rejected)
- Material-Premise Gate: Pass
- Score Summary: N/A (failure-origin round)
- Failure Origin: implementation defect in UI-test step logic. The switch tap is not checked for effect, a new slow-host form "D". Not a product defect, not timeout-related, not an environment-only issue requiring an API/E2E fix.
- Recommended Recipient: implementation_engineer (Local Fix)
- Notes: Agrees with the API/E2E preliminary classification. The evidence chain is corrected: the post-failure `value 0` comes from the re-rendered switch. The decisive proof is the `httpNeedsAcknowledgement` diagnostic. AC-I1a/AC-I1b/AC-I2/AC-I4 passing evidence is unaffected.
