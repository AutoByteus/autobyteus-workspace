# API/E2E Test Review Report — autobyteus-533 (interrupt-idempotent-stop)

## Review Meta

- Review Round: 1
- Trigger: API/E2E Engineer, API-REV-001 Pass; durable test commits `f8fad0fc6a`, `ed921d57c6`, `28de6a0ee9`, `6744d786c6` (reports and evidence `38d30b6b5e`); code under test unchanged at `71f9a5d13e`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002)
- Investigation Notes Reviewed As Context: N/A for this bounded review (design spec and requirements suffice)
- Solution Revision Record Reviewed As Context: N/A (unchanged since CRR-002)
- Design Spec Reviewed As Context: `design-spec.md` (SR-003)
- Supplemental Task Artifacts Reviewed As Context: `evidence/api-e2e/README.md`; `API-07`, `API-08`, `API-09` evidence JSON
- Architecture Review Revision Record Reviewed As Context: N/A (unchanged)
- Implementation Revision Record Reviewed As Context: IR-002 (unchanged)
- Original Code Review Report: `code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 94.6% (reported; the gap is the environment category: FSEvents and load, recorded with causes)
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline(s) applied: `TESTING.md` (§ Browser probes, § Rules), as the coverage investigation records. No conflict. Checked against the probes: probe-owned stack and cleanup (`finally` stops both process groups and removes the data root), `AUTOBYTEUS_ALLOWED_ORIGINS` set to the probe frontend, owner credential through `probe-node-access.mjs`, fails on browser errors, a fresh `--output-dir`, DOM/state/wire assertions with screenshots as support.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001…SCN-006, UC-004 run kinds)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/stop-generation-probe.mjs` (+ `test:e2e:stop-generation` in `package.json`) | Added | SCN-001…006; AC-002, AC-006…AC-010, QR-001, QR-003 | The desktop renderer against a real node for a standalone run and a Team member: double press (SGD-01/02), Stop after the turn ended (03/04), loss with the Stop delivered or lost (05/06), not connected and a refusal (07/08) | Replaces the scratch reproduction, as the design and requirements asked |
| `autobyteus-web/tests/e2e/mobile-stop-generation-cases.mjs` | Added | SCN-001…006, UC-004; AC-003, AC-004, AC-006, AC-007, AC-009, AC-010 | The phone journey per run kind (MSP-75…79): standalone, Team member, Org member and Org Team member, delegated agent and delegated Team member, peer run (with beta stopped) | One journey function shared across kinds |
| `autobyteus-web/tests/e2e/fixtures/stop-generation-wire.mjs` | Added | Network conditions for SCN-002/003/005/006 | The page's path to its node: latency, a slow downlink, path down, a lost Stop, a drop after delivery, an emulated refusal; frame log; the in-page button and toast trace; the internal-words check | Shared by both probes |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated | AC-010 (phone bundle) | Runs MSP-75…79; the phone's socket route goes through the wire, which passes frames through by default | The whole probe passed 79/79 cases with the wire in place (API-09) |
| `autobyteus-web/tests/e2e/interrupt-twice-repro-scratch.mjs` | Removed | — | Scratch reproduction replaced by `stop-generation-probe.mjs` | Removal planned in the design |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Header comments map each case ID to its AC; one case per scenario and per kind; assertion messages state the requirement in user terms |
| Assertions prove approved requirements instead of incidental implementation details | Pass | The assertions read what the user sees and what crosses the wire: Stops sent (`stops === 1`), the node's answer (`nodeAnswers` before any delay, `acks` as received), the button trace (label, `aria-busy`, enabled), toast text equal to the approved wording, and `internalWords` (run ids, `AgentRun`, `canonical`, `turn`, codes, stream states) |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | `stop-generation-wire.mjs` serves both probes; the phone's `journey()` is reused for 8 run kinds; existing fixtures reused (`probe-node-access`, `run-socket-ready`, `run-tree`, `probe-output-dir`) |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Probe-owned stack, temp data root and HOME, scripted AGY, `wire.reset()` after every case. Timing-dependent branches are explicit, not hidden: "pressed if offered" (SGD-07 a/a2, at least one press asserted) and the Org member's disabled Stop while its stream is not ready. Harness corrections were committed separately and the first runs kept as evidence |
| Large files remain coherent and navigable | Pass | The desktop probe (455 lines) and phone cases (369 lines) each cover one surface and one behavior |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | Scratch reproduction removed; the earlier `interrupt-result-presentation` probe covers the fixture-page presentation (a different layer) and was rewritten in implementation |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | API-07 and API-08: 8/8 Pass, no send stalls, no browser errors. API-09: MSP-75…79 Pass (verdict Fail only from MSP-50's browser error, FU-007, outside the diff). The report states the vacuous MSP-79 beta-down step (`tapped: false`, "Not reachable") and the Org member's untappable Stop as observed product states |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Each case reproduces an approved scenario (SCN-*). The emulated refusal (`refuseStops`) is a documented stand-in: no scripted runtime refuses an interrupt. It uses the node's own failed-ack shape per stream, a mismatched shape would be ignored by the web and fail the case rather than pass it, and it proves only the page's presentation (AC-009), which unit tests also cover |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps | Pass | Runs are opened from the Workspaces tree or the phone's run list. Messages and Stops are the user's own clicks and taps, the second press at the same screen point whatever the button shows. "Another window" Stops go over the run's own stream with the owner credential, and path changes go through the wire, as a network does. Data is created through the public GraphQL API |

## Findings

None.

Non-blocking notes (no action required for this ticket):

- Both probes retry a send once when it starts no turn (`holdTurn`, the CG-07 branch) and record the stall in `sendStalls`. That matches FU-006, a send lost silently on a just-opened stream, outside this diff. Once FU-006 is fixed, the retry should become a failure so the probe does not tolerate a regression; that belongs with FU-006's own Task.
- MSP-79's beta-down step passes vacuously when the phone shows "Not reachable" (nothing to tap). The report says so; the peer run's refusal presentation is proven by its own journey.

## Follow-ups

- Follow-ups this review added: None. FU-005…FU-007 were recorded by API/E2E.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the five listed above (plus the `package.json` script)
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes: Confidence 94.6% against a 95% target; the shortfall is the environment category (FSEvents, load), with causes recorded by API/E2E, not test-code quality. AC-005 is proven by unit tests only (no live Claude, Codex or native runtime).
