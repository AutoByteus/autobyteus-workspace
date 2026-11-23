# API/E2E Test Review Report — autobyteus-609 (phone-web-followups-609)

## Review Meta

- Review Round: 1
- Trigger: API/E2E Engineer, API-REV-002 Pass (95.6%). Durable test commits:
  - round 1: `54a305f690`;
  - round 2: `23b813ce7c`, `2c1a0a3b93`, `3d49a60c82` (the last reverts the second's MSP-14 change).
  - Reports and evidence: `4c7f427333`. Code under test: through `7ce2b67ea1` (IR-002).
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-005; AC-D, AC-E, AC-H1, AC-J)
- Investigation Notes Reviewed As Context: N/A for this bounded review
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-004, SR-005)
- Design Spec Reviewed As Context: `design-spec.md` (D-D2)
- Supplemental Task Artifacts Reviewed As Context: `evidence/api-e2e/` (MSP-101, MSP-102, R2-*)
- Architecture Review Revision Record Reviewed As Context: N/A (unchanged)
- Implementation Revision Record Reviewed As Context: IR-002
- Original Code Review Report: `code-review-report.md` (CRR-003 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95.6% (reported)
- Prior unresolved test-review findings rechecked: None (first test review for this ticket)
- Project testing guideline(s) applied: `TESTING.md` (§ Browser probes, § Rules), as the coverage investigation records. No conflict:
  - the cases run inside the probe-owned stack of `test:e2e:mobile-shell`;
  - each extra browser context is closed in `finally`;
  - they assert DOM state, node answers and GraphQL; screenshots support the evidence.
  - MSP-14's interaction was diagnosed by running it with and without MSP-103 (TESTING.md rule 9), not closed as flaky.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-D, SCN-E, SCN-H1, SCN-J)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/desktop-stopped-call-trace-cases.mjs` | Added | AC-D, AC-E (D-D2) | MSP-102: four AGY tool steps' live cards against their earlier-trace page cards; a call stopped in the desktop composer read live (card, Activity) and back (phone opened after the stop, desktop reload, page `statusKey`). MSP-103: a Team member's call stopped from the phone, then reconciled on the desktop and read back on a second phone | One behavior (a stopped call and its read-back) on the surfaces AC-D names |
| `autobyteus-web/tests/e2e/mobile-heading-links-cases.mjs` | Updated (MSP-101) | AC-H1 (a team member's and a delegated run's own folder) | Three folders, each with its own copy of the linked note (its own marker), plus the main workspace's; the member and the task agent each link the same relative path | — |
| `autobyteus-web/tests/e2e/mobile-file-open-cases.mjs` | Updated (MSP-91) | AC-J | After a real node restart the first read answers 200; an unknown folder ID answers 404 | The comment about the old 404 window is corrected |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated | — | Registers MSP-102/103 and passes `sendOver`, `openPhone`, `paired`; MSP-14 is unchanged in net (`2c1a0a3b93`'s change reverted in `3d49a60c82`) | — |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (+ `agy-failure-cli-routing.test.ts`) | Updated | AC-E setup | `AGENT_TOOL_STEPS` streams four steps in AGY 1.2.14's shape: own-MCP `send_message_to` and `get_project_task`, native `run_command` (`CommandLine` with a leading `cd`) and `view_file` (`AbsolutePath`). A routing test pins it | Scripted runtime only; no product code |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Headers map each case to its ACs; each failure label names the AC and the surface |
| Assertions prove approved requirements instead of incidental implementation details | Pass | The cases read what each surface shows and what the node answers. The stop icon's test id, the Activity chip "Stopped", and the phone row's `data-status` and word. The page's GraphQL `statusKey` and `summaryArgs`, and the node's member activity status. Page-card summary equal to live-card summary. MSP-101: the own folder's marker shown and no other folder's marker. MSP-103 also asserts no "Conflicting terminal tool outcomes" error, the regression D-D2 fixed |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Existing probe helpers (`openRow`, `menuOpen`, `desktopRunsView`, `openPhone`, `sendOver`); the fixture keyword sits beside the AGY scenarios it extends |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Each case creates its own runs. MSP-102 fills the trace (`ECHO_INPUT`, at most 80) until the node pages, and asserts that the page was requested, so the read-back is proven rather than assumed. MSP-103 reads back through a second phone from the stored pairing instead of reloading the shared phone, which had folded rows for MSP-14 (cause found and fixed) |
| Large files remain coherent and navigable | Pass | The new case file (288 lines) holds two cases on one behavior |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | MSP-91's stale "404 after restart" comment rewritten; `2c1a0a3b93`'s MSP-14 workaround reverted |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | R2-WS-1: 100 of 101 pass, MSP-61 is FU-006; 0 unknown browser errors. MSP-101 evidence: own markers shown and others absent on desktop and phone. R2-MSP-102 and MSP-103 Pass as reported |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | `AGENT_TOOL_STEPS` emits AGY's real step shapes to set up AC-E; the summary keys it uses are those REQ-E names |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps | Pass | Stops are the user's own presses: the desktop composer in MSP-102, the phone in MSP-103. Runs are opened from the desktop Runs list and the phone run list. The earlier-trace page is reached by scrolling up with the wheel. MSP-91 restarts the node itself |

## Findings

None.

Non-blocking notes (no action required):

- MSP-101's delegated case: the node gives a task agent its host's folder (evidence: `delegated` = `ws-609-host`). The case proves the link opens in that run's folder and in no other probe folder, but here it cannot separate "the delegated run's own folder" from "the host's folder", because the product makes them the same. The case follows the node's choice by design.
- The card selectors (`div.my-2 > div.rounded-lg`, `span.font-medium`) and MSP-103's error-icon test (`[data-icon*="exclamation"], svg.text-red-500`) depend on markup. A markup change would make them fail loudly rather than pass falsely.
- Native and Codex stopped calls are proven at the writer level (IMP-11), not by a live probe (reported residual).

## Follow-ups

- Follow-ups this review added: None.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the five listed above
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes:
  - FU-006 (MSP-61) and FU-007 (the base migration fixture) remain the only red cases, both on the base.
  - FU-010 records the red Error text of a stopped call.
