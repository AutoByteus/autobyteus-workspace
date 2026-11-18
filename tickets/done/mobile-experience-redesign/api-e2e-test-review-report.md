# API/E2E Test Review Report — mobile-experience-redesign (autobyteus-277)

> **Latest result: round 2 (CRR-010), `Pass`.** See the next section. Round 1 (CRR-008) follows it and still holds for the paths round 2 does not change.

## Round 2 (API-REV-004, on the latest-base merge)

- Trigger: API/E2E round 4 `Pass` (95%, no category below 90%).
  - Commit under test `54e2eb4d07` = merge `ed20da1cd1` + MSP-15; HEAD `e5a675ecfa`.
  - Code review basis: CRR-009 `Pass`.
- Testing guideline: `TESTING.md` at the merged tree, sections "Browser probes" and "Rules". It now includes the fresh-start build, which API/E2E ran (FSB); that is not test code.
- **Changed durable test scope:** `autobyteus-web/tests/e2e/mobile-shell-probe.mjs`, updated in `54e2eb4d07` (+46 lines): case **MSP-15** and its header line.
  - MSP-15 is for DS-001 and autobyteus-388's windows: the desktop Projects view reads every run (`null`), a Runs↔Projects switch reads nothing beyond the 5 s poll, and Workspaces reads with 6.
  - No other repository test changed. `scripts/fresh-start-build.sh` is a ticket script, which counts as evidence.
- **Checks:**
  - **Intent (Pass).** The header line and the case name state what is checked and why: the desktop shares the history load with the phone.
  - **Assertions (Pass).** They come from the GraphQL request log (`ListWorkspaceRunHistory` window values), not from the DOM. `null` is told apart from an omitted variable.
    - "Reads nothing beyond the poll" checks the load owner's designed contract (`useRunHistorySectionLoad` re-reads when the window *changes*; design Ownership Map). It allows up to `ceil(seconds / 5) + 1` poll reads, so it does not pin timing.
  - **Real trigger (Pass).** The view menu is clicked as a user would, in a fresh desktop context against the probe-owned node.
  - **Isolation and cleanup (Pass).** The desktop context is closed before the assertions; an earlier failure is covered by the probe's `finally`, which closes the browser.
  - **Reuse (Pass).** It uses the probe's `waitFor`, `assert` and `runCase`.
  - **Determinism (Pass).** The sleeps (1.5 s, 11 s, 3 s × 4, 2 s) bound observation windows on a 5 s poll, and are not waits for a state.
  - **No stale or duplicate coverage (Pass).** It complements WVC-004 (the phone's window) and 388's own panel specs.
- **Findings:** none that need action.
- **Non-blocking note.** The Workspaces check is `some(read => read.window === 6 && dt ≤ 1500)`, while the header says "reads once". The execution report observed a second 6-window read 272 ms later, unasserted and possibly the poll coinciding. The check proves the switch reads with 6, which is its purpose. It would not catch a double read on that switch. Tightening it, or explaining the second read, is optional and does not affect any approved criterion.
- Round 1's note (the probe header's "(TESTING.md, phone changes)") stays with delivery's docs sync.
- **Follow-ups added:** none.
- **Result: `Pass`.** Recipient: `/software_engineering_team/delivery_engineer`.

## Round 1

## Review Meta

- Review Round: 1
- Trigger: API/E2E round 3 (API-REV-003) `Pass`, Large/High route
- Requirements Doc Reviewed As Context: [requirements-doc.md](requirements-doc.md), SR-005 (REQ-001…011, AC-001…011 with AC-002a and AC-003a; DEC-009…015)
- Investigation Notes Reviewed As Context: [investigation-notes.md](investigation-notes.md), where the cases cite it
- Solution Revision Record Reviewed As Context: [solution-revision-record.md](solution-revision-record.md)
- Design Spec Reviewed As Context: [design-spec.md](design-spec.md), SR-006
- Supplemental Task Artifacts Reviewed As Context: the Product `ui-ux-spec.md` at `e6ca7b6098` (VIS-002 nesting replaced by DEC-009)
- Architecture Review Revision Record Reviewed As Context: [architecture-review-revision-record.md](architecture-review-revision-record.md), ARCH-REV-004
- Implementation Revision Record Reviewed As Context: [implementation-revision-record.md](implementation-revision-record.md), IR-005
- Original Code Review Report: [code-review-report.md](code-review-report.md), latest CRR-007 `Pass`
- Code Review Revision Record: [code-review-revision-record.md](code-review-revision-record.md)
- Current Code Review Revision ID: `CRR-008`
- Coverage Investigation: [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md)
- Execution Coverage Report: [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md)
- API/E2E Revision Record Reviewed As Context: [api-e2e-revision-record.md](api-e2e-revision-record.md), API-REV-001…003
- API/E2E Result: `Pass` (round 3; code under test `e3dd8c4677`; HEAD `0456246283`)
- Final Validation Confidence: 95%; no category below 90%
- Prior unresolved test-review findings rechecked: none (first test review)
- Project testing guideline applied: `TESTING.md` at the repository root, the sections "Browser probes", "Rules" and "Evidence and cleanup".
  - No conflict.
  - Discrepancy: the probe header cites "TESTING.md, phone changes", a section that does not exist. The phone rule was dropped at the user's direction (`c5319f0bf4`, `dce25fdd50`). See the note under Findings.
- Supported Product Scenario Basis Confirmed: `Yes`. Each case enters an approved scenario (SCN-001…006) through the real surface: the production `/mobile` bundle served by a real paired node, with real pairing, taps, sends and node state.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Added (`70555b16d9`), updated for SR-005 (`f9cb9775d1`) | MSP-01…MSP-14: AC-001…AC-010, AC-002a, AC-003a; DS-001; E-27 | The paired phone shell against two probe-owned real nodes, compared with the desktop Runs view of the same node | 1474 lines, one surface; a case index in the header |
| `autobyteus-web/package.json` | Updated (one script) | — | `test:e2e:mobile-shell` | — |
| `autobyteus-web/tests/e2e/node-vocabulary-probe.mjs` | Updated (NVP-04) | AC-010 (persisted session) | A paired phone opens on the run list, not Home | Expectation renamed `home` → `runs` |
| `autobyteus-web/tests/e2e/large-runs-load-less-cases.mjs` | Updated (LRL-004) | The preserved Messages "unavailable" state (autobyteus-358) | The phone path is now run list → Team row → ⋮ → Messages | The removed Home, Switch and tab steps are gone |
| `autobyteus-web/tests/e2e/workspace-views-chooser-cases.mjs` | Updated (WVC-004) | DS-001 (the phone reads the complete window) | The desktop keeps `null` and the phone now reads `null` | The recorder distinguishes `null` from an omitted variable |
| `autobyteus-web/tests/e2e/owner-scoped-file-reads-probe.mjs` | Updated (B-006, B-007) | REQ-007 Artifacts | The phone path is run list row → ⋮ → Artifacts | The helper takes the row key in place of the removed work-picker segment |

- No durable test file changed: `No`.
- Not under review:
  - `evidence/api-e2e/scripts/android-journey.mjs` and `ios-webkit-journey.mjs` are ticket scripts, which is evidence.
  - `TESTING.md` is not test code; it was edited at the user's direction.
  - The fixture pages and `fresh-run-auto-approval-probe.mjs` were implementation-owned and reviewed in CRR-001.

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | The header lists each MSP case with its criterion (`mobile-shell-probe.mjs:24-68`). Each is one `runCase(id, …)` block, and failures carry the case id and details |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Sends are proven on the node's stored projection (`storedHas`, `:500-511`), not only in the DOM. The list order is compared with the desktop Runs view of the same node (MSP-01). The reads' window and status come from the network log (MSP-12). The probe fails on unknown browser errors (`:1448-1452`), as `TESTING.md` requires. Screenshots support the assertions and are not the proof |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | `openPhone`, `rowsOf`, `childRow`, `openRow`, `toList`, `composerSend`, `menuOpen` and `measureLayout` are shared by every case. The data is built once in `setUp` through public GraphQL, REST and WebSocket. The "Show older" step repeats in three other probes, which is acceptable across independent probes |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Probe-owned servers, temp data roots and HOMEs, with free ports. Scripted AGY and the recorded Grok replay mean no model and no keys. `waitFor` polls with timeouts instead of sleeping. Cleanup runs in `finally`, with a receipt (`:1460-1473`). The user's AutoByteus is never touched (`TESTING.md` Rule 2) |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | One surface (the paired phone shell), ordered by case, with helpers grouped above |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The old Home, work picker and tab steps are removed from all four updated probes. The MSP-03 `randomUUID` control runs only when a send fails, as a diagnostic for that failure mode (F-02); it is not a retained compatibility test. The expectations follow DEC-009 (sibling) and DEC-010 (second lines) |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | The cases match the investigation's plan and the execution report's Cases (`MSP-run-3`, `MSP-run-5`). Device and iOS journeys are recorded as ticket scripts |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Each case reproduces an approved scenario: SCN-001…006, and REQ-004 on a real second node. The private HTTP origin is the documented trusted pairing (`docs/remote_access.md:9, 56`) |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | Pairing goes through the real Phone Access link and button. Opens are row taps, and sends go through the composer. Node-down is a real server stop. Task DONE goes through the PTM's real `update_task`. The one emulated state is page-hidden (MSP-12, a `visibilityState` override), and ADR-04 covers the real background |

## Findings

None that need action.

Non-blocking note: the probe header (`mobile-shell-probe.mjs:22-23`) ends with "(TESTING.md, phone changes)". That section does not exist; the phone rule was dropped at the user's direction, and the header itself now carries the phone specifics. This is a comment-only inaccuracy with no effect on the test, so it does not warrant a rerun. Delivery can drop the parenthetical during its docs sync.

## Follow-ups

- Follow-ups this review added: None. FU-002…FU-006, recorded by API/E2E, are unchanged.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `mobile-shell-probe.mjs` (added); `package.json`, `node-vocabulary-probe.mjs`, `large-runs-load-less-cases.mjs`, `workspace-views-chooser-cases.mjs` and `owner-scoped-file-reads-probe.mjs` (updated)
- Unresolved finding IDs: none
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - Only the user can check:
    - QR-003's 2 s on his phone over Tailscale with his history;
    - AC-005's confirmation on his phone;
    - AC-010 and AC-011 on his own Android device.
  - The iOS paired screens are proven through WebKit 26.0.
  - Observation, not a finding: the Back key with the ⋮ menu open leaves the run screen.
  - DEC-015: the user asked for a new beta release that carries this ticket.
