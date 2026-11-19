# API/E2E Test Review Report — autobyteus-540 (send-on-unbound-stream)

## Review Meta

- Review Round: 1
- Trigger: API/E2E Engineer, API-REV-001 Pass; durable test commit `41bba2c734` (reports and evidence `0c49fc9ecd`); code under test unchanged (`f70d3cb968`, `49ed8967f0`)
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-003)
- Investigation Notes Reviewed As Context: N/A for this bounded review
- Solution Revision Record Reviewed As Context: N/A (unchanged)
- Design Spec Reviewed As Context: `design-spec.md` (SR-003)
- Supplemental Task Artifacts Reviewed As Context: `evidence/api-e2e/README.md`; `API-07`, `API-08` evidence JSON
- Architecture Review Revision Record Reviewed As Context: N/A (unchanged)
- Implementation Revision Record Reviewed As Context: IR-001 (unchanged)
- Original Code Review Report: `code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95.3% (reported)
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline(s) applied: `TESTING.md` (§ Browser probes, § Rules), as the coverage investigation records. No conflict. The new probe follows the 533 probe's stack ownership: built node on a temp data root, allowed origin, owner credential, fails on browser errors, cleanup receipt, fresh `--output-dir`.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001…SCN-003, UC-004 kinds)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/send-delivery-probe.mjs` (+ `test:e2e:send-delivery`) | Added | SCN-001…003; AC-002…AC-004, REQ-003, QR-001 | Desktop real stack, standalone run and Team member: sends after forced reconnects (SDD-01/02), answer lost (03), queued (04), lost to a live and to a stopped run (05/06), not bound (07), Team lost (08), Team timeout (09) with a control (12), a new run's first message and its resend (10), the offline-run branch (11) | One surface, one behavior |
| `autobyteus-web/tests/e2e/mobile-send-delivery-cases.mjs` | Added | SCN-001…003, UC-004; AC-002, AC-004 | Phone bundle: sends after Stops and reconnects (MSP-85), lost (a) (86), Org member (87), peer run on beta (88) | — |
| `autobyteus-web/tests/e2e/fixtures/stop-generation-wire.mjs` | Updated | SCN-002 | `loseNextSend` / `dropAfterNextSend` share the Stop path's code; the log records message ids and each snapshot's `input_state` | `reset()` covers the new flags |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated | AC-002, AC-004 (phone) | Runs MSP-85…88; one expected console line for MSP-86 | The expectation is scoped to MSP-86 and names the known log line (implementation Known Risks) |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | The header maps every case ID to its AC and text (a)/(b); assertion messages state the requirement |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Asserted from the wire and the DOM: the SEND left after its link's `CONNECTED` (`sentBound`), no `SESSION_NOT_READY`, the turn started (the scripted held step), the snapshot's `input_state` (present, `null`, or with the queued entry), notice certainty and exact text, the draft back, the message count in the conversation, the status unchanged, and the internal-words check |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | The 533 wire is extended, not copied; existing probe fixtures reused |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Probe-owned stack, `wire.reset()` per case. Two outcomes the design allows are asserted per branch, not hidden: SDD-11 (with or without input state at the rebind) and MSP-87's path-down step (Send disabled while the Org stream is not ready). The execution report states which branch each run took |
| Large files remain coherent and navigable | Pass | The desktop probe (588 lines) and phone cases (284) each cover one behavior |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The 533 probes' second send was removed in implementation (D-7); nothing duplicated |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | API-07: 12/12 Pass, `notReadyErrors: 0`, no browser errors. API-08: MSP-85…88 Pass (verdict Fail only from MSP-41, the known autobyteus-458 FU-003, outside the diff). This run's branches are reported: SDD-11 took the "input state at the rebind" branch, and MSP-87's path-down send was not pressable |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Each case reproduces an approved scenario. Path drops and lost frames go through the wire, as a network does. The "other window" turn in SDD-04 is a second client on the run's own stream with the owner credential |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps | Pass | Runs are opened from the Workspaces tree or the phone list, and messages are typed and sent with the composer's button. SDD-10 starts a new run from the agent row's "New run with this agent" button. Data is created through the public API |

## Findings

None.

Non-blocking notes (no action required for this ticket):

- MSP-88's lost-send assertion also accepts "no notice and the message shows" with the draft still in the box. For a message the wire lost this cannot happen: the peer route clears the box only on success. The extra branch is unreachable and permissive; it could be dropped at the next touch. This run took the (b) branch.
- SDD-09's status check reads SDD-12's timeline. Run alone (`--cases SDD-09`), it can only accept the pre-send status, so it is stricter, not looser; run the two together.
- The desktop probe's browser-error filter ignores `Error sending user input` for every case. The cases that must deliver assert the turn started, so a real failure there still fails its case.

## Follow-ups

- Follow-ups this review added: None. FU-003 was recorded by API/E2E.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the four listed above (plus the `package.json` script)
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes:
  - The queued case (AC-003) ran on AGY only; native and ACP share the same AgentRun admission (reported residual).
  - Org text (a) on the phone was not pressable during the outage (FU-003); Org (a) is covered by unit tests.
