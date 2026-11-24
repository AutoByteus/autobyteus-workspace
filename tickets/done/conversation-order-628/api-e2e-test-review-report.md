# API/E2E Test Review Report — autobyteus-628 (conversation-order-628)

## Review Meta

- Review Round: 2 (round 1: CRR-003 Pass on `ea6505c3eb`)
- Trigger: API/E2E Engineer, API-REV-001 Pass (95.1%). Durable test commit `ea6505c3eb`; reports and evidence `b54922c23f`. Code under test: the reviewed tree `a9e22b4ea4` (source through `eaebb94304`).
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-005; AC-001, AC-002, AC-003, AC-006)
- Investigation Notes Reviewed As Context: N/A for this bounded review
- Solution Revision Record Reviewed As Context: N/A (unchanged)
- Design Spec Reviewed As Context: `design-spec.md` (D-2 rules (a) and (b); D-3)
- Supplemental Task Artifacts Reviewed As Context: `evidence/api-e2e/MSP-106-107-live/mobile-shell-probe.json`
- Architecture Review Revision Record Reviewed As Context: N/A (unchanged)
- Implementation Revision Record Reviewed As Context: IR-002
- Original Code Review Report: `code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-005`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95.1% (reported)
- Prior unresolved test-review findings rechecked: None (first test review for this ticket)
- Project testing guideline(s) applied: `TESTING.md` (§ Test vault, § Browser probes, § Rules), as the coverage investigation records. No conflict:
  - real provider keys come only from the test vault, behind the case's gate;
  - Claude is test-owned (api-key mode, with the probe's HOME and `CLAUDE_CONFIG_DIR`), so nothing of `~/.claude` is read or written;
  - the cases run on a node of their own, which is stopped in `finally`, with every browser context closed;
  - they assert DOM, node answers and app state; screenshots support the evidence.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001…SCN-003; REQ-004)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-conversation-order-live-cases.mjs` | Added (gated) | AC-001, AC-002, AC-003, AC-006; D-2 rules (a) and (b) | MSP-106: a Claude Team member whose tools change ("Tools updated"), with the phone 2 s behind sending, 2 s ahead sending, and 2 s behind watching. MSP-107: a native run whose skill changes ("Skill updated"), with the phone behind and ahead sending. Each round checks the live and reopened order, the node's entry order, and the phone state's times against the node's stored times | One behavior on two runtime families |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated | — | Registers the gated cases after MSP-105 | 3 lines |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | The header names the gate, the cost, each case's ACs and its D-2 rule; round labels read `behind-sends`, `ahead-sends`, `behind-watches` |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Order is read from the drawn rows: the message, then the notice row by its label, then the agent row, and no notice before the message. The node's entries must hold the notice right after the message. AC-006 compares the phone state's times with the node's stored times within 500 ms while the phone clock is verified to be 2 s off, so a viewer-clock time could not pass |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | One `runRound` and one `verdict` serve all five rounds; the probe's helpers (`serverAt`, `ensureUnfolded`, `openRow`, `childRow`, `sendOver`) are reused; the phone clock offset is MSP-105's method |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | The cases have their own node and data, unique markers per round, and the run terminated in `finally`. The notice's source (tools or skill) is changed before each round, so each round has its own preface. Waits are bounded |
| Large files remain coherent and navigable | Pass | 300 lines, two cases on one behavior |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The gate is explicit, and a skip logs its reason ("a skip is not a pass") |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Evidence: MSP-106 Pass on haiku and MSP-107 Pass on gpt-5.4-mini. Every round shows live and reopened order correct and the node's next entry `system_task_notification`. The user-time difference from the node is between −3 and 6 ms with the phone 2 s off. WS-1 passes 97 of 103; the 6 failures fail on the base too (FU-002, 609 FU-006) |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | The notices come from the product's own triggers: an agent's tool list or a skill changed between turns. The watcher round sends from another client, as the founder's desktop did |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps | Pass | The phone sends from its composer (Enter) or only watches, and the run is reopened from the phone's list. The phones come from the node's real pairing. AC-006 is read from the app's own stores, the state the requirement names |

## Findings

None.

Non-blocking notes (no action required):

- The header says the times are checked "within 1 s" (`:17`), but the code checks within 500 ms (`:150-157`), the stricter of the two. The comment could be aligned at the next touch.
- The own send's time 150 ms after Enter (`afterSend`) is recorded, not asserted. The round's assertion covers the time after the node confirms the send, which is what AC-006 requires.
- The Pinia walk reads app internals by structure. A change there would leave `found` empty and fail the case loudly, not pass it.
- Not run live, as reported: N-5 (covered on the real writers by IMP-09), Codex (it shares the external writer that Claude uses), and a physical phone.

## Follow-ups

- Follow-ups this review added: None.

## Round 2 (API-REV-002): Not Applicable

- Trigger: API/E2E round 2 Pass (95.1%) on the merged tree `2d3f46b223` (IR-003: SR-007, DR-001 Finding 1).
- Changed durable test files since round 1: none. `git diff --stat 2d3f46b223..43e2d47da1 -- . ':!tickets'` is empty; the commit holds only the report, the revision record and evidence. MSP-105/106/107 are as reviewed in round 1.
- The round's results, recorded for delivery (not re-reviewed as code):
  - R2-CS-1: the three contract suites pass, 24, 39 and 14 tests with 0 failures (DR-001 Finding 1).
  - R2-MSP-105…107: in order live and reopened on Claude and native. The phone's state times are −11 to +4 ms from the stored times live and 0 reopened, with the phone clock 2 s off (SR-007).
  - R2-WS-1: 97 of 103 phone cases pass; the same 6 fail on the base too (FU-002, 609 FU-006).
  - R2-SI-1: integration 92 files / 523 tests.
  - R2-SE-1: e2e 125 pass (609 FU-007 on the base).
  - R2-FS-1: fresh-start build of the merged commit.

## Latest Authoritative Result

- Result: `Not Applicable` (round 2: no durable test file changed; round 1 `Pass` stands for `mobile-conversation-order-live-cases.mjs` and its registration)
- Changed durable test paths reviewed: none in round 2 (round 1: the two listed above)
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes:
  - SE-1's two failures are autobyteus-609 FU-007, on the base. The API/E2E report explains why IMP-12 passed them: a longer `TMPDIR` meant no socket file was created.
  - FU-004 and FU-005 remain recorded.
