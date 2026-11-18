# API/E2E Test Review Report

## Review Meta

- Review Round: `1`
- Trigger: API/E2E engineer, API-REV-002 Pass (SR-002 / IR-002; F-1 resolved), 2026-11-18
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-001 basis; REQ-001..003, AC-001..003, DEC-003)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: SR-001, SR-002
- Design Spec Reviewed As Context: `design-spec.md` (SR-002 section)
- Supplemental Task Artifacts Reviewed As Context: `handoff.md`
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-001
- Implementation Revision Record Reviewed As Context: IR-002
- Original Code Review Report: `code-review-report.md` (CRR-002, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (rounds 1 and 2)
- API/E2E Result: Pass; Final Validation Confidence: 94%
- Prior unresolved test-review findings rechecked: None (first test review of this ticket; round 1 of API/E2E failed and went to failure-origin review)
- Project testing guideline(s) applied: `/TESTING.md`, as the coverage investigation records it.
  - Applied: clean environments, gates for live runtimes (Claude) with the real HOME as documented, and the production phone bundle on its own node.
  - Applied: the user's app and data stay untouched; test-owned processes are killed by tag in `finally`.
  - No conflict.
- Supported Product Scenario Basis Confirmed: `Yes` (REQ-002: notices and replies once per restart, live and after a reload; AC-001 turn ids; AC-003 local time; DEC-003)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/platform-notice-identity.e2e.test.ts` | Added (`90811e709e`) | REQ-002 via SR-002 on every route | One notice id, live and stored: the agent stream with a reconnect (PNI-01), the team stream (PNI-02), the Org view's presentation (PNI-03), and live Claude (PNI-04) | Gate `RUN_PLATFORM_NOTICE_IDENTITY_E2E=1`; PNI-04 also `RUN_CLAUDE_E2E=1` |
| `autobyteus-server-ts/tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts` | Updated (`ccd5813e28`; type only in `90811e709e`) | AC-001, AC-002 (stored/loaded), DEC-003 | RR-10: a native run restarted twice on the built server has one id per turn, stored and live; the loaded conversation lists each input, reminder and reply once. RR-11: a run restarted on the base build keeps its stored ids and continues after the highest | RR-11 gated by `RESTART_REMINDER_BASE_SERVER_DIR` |
| `autobyteus-web/tests/e2e/mobile-restored-run-cases.mjs` | Added (`ccd5813e28`), extended (`90811e709e`) | AC-002, AC-003 on the phone | MSP-75: restarted twice, cards in the viewer's zone, live and after a reload. MSP-76 / MSP-77: a Team coordinator's and an Org member's notice once, live and after a reload | Its own node; one stack shared by the three cases |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated | — | Header lines and wiring only | IDs MSP-75..77 are unique in the probes |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Case IDs with the routes and AC names in each header |
| Assertions prove approved requirements | Pass | **PNI:** the live `message_id` equals the stored `messageId`, one stored entry per notice, the member's `agent_run_id` on the team stream, the worker's id in the Org wrapper, and a reconnect adds no copy with another id. **RR-10:** stored inputs `turn_0001..0003`, reminders in turns 2 and 3, live turns new per session, and the loaded conversation's exact order. **MSP-75:** one card per restart in the viewer's zone and none in UTC, every input and reply once, the agent got UTC. **MSP-76/77:** the notice once and each reply once, live and after a reload, and the notice reached the agent |
| Fixtures, setup, helpers reuse | Pass | Shared harness and scripted model. `restartedTwice` serves RR-10 and RR-11; `noticeOnce` serves MSP-76 and MSP-77; one stack for MSP-75..77 |
| Isolation and determinism for the boundary | Pass | Scripted inference and condition-based waits. Each case has its own runs. The phone's history workaround (open the list at `/mobile/` after a reload, because back follows the browser history to the pairing link) is explained in the code |
| Large files coherent | Pass | — |
| No stale, duplicated, disabled-without-reason or compat-only tests | Pass | Gates are documented in the headers |
| Coverage agrees with the evidence | Pass | `evidence/R2-notice-identity/vitest-results.log` (PNI-01..04 ✓), `R2-phone/results.log` (MSP-75..77 Pass, with card counts), `R2-restart-suite/vitest-results.log`, `R2-desktop/README.md` |
| Callers exercise an established scenario | Pass | The restart of a node with an idle native run and the user's next input; a background build ending while idle (the platform's notice); Team, Org and Claude runs |
| Real trigger, no setup real use does not produce | Pass | The built server is restarted by SIGTERM (the app's quit). The phone runs the production bundle, paired through Phone Access, sends from the composer and reloads. The streams and projections are read as the app reads them. The base build for RR-11 is a real older build |

## Findings

None.

Non-blocking note (readability): in `restart-reminder-built-server.e2e.test.ts`, the new helpers were inserted between `runtimeRun`'s doc comment (L562, "A run of another runtime on the node …") and `runtimeRun` itself. That comment now sits above `tracesOf`'s own comment. Move it back above `runtimeRun` when the file is next touched.

## Follow-ups

- Follow-ups this review added: None.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the four paths above
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes: The suites prove one id per notice on every route and one card per notice on the phone, live and after a reload, for a restarted native run, a Team coordinator and an Org member. The desktop journey (R2-desktop) was run by hand. Residual:
  - DEC-003: an older run's old replies still share `turn_0001` in turn-grouped views, and its old notices have no id; not opened in the UI.
  - Environment timeouts under load (shutdown budget, AGY discovery), as recorded.
