# API/E2E Test Review Report

## Review Meta

- Review Round: 1
- Trigger: API-REV-001 `Pass` (95.5%), with a request for proportional review of the durable tests changed in this round
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-003; REQ-001…REQ-007; AC-001…AC-008; DEC-007)
- Investigation Notes Reviewed As Context: through the design spec
- Solution Revision Record Reviewed As Context: SR-003
- Design Spec Reviewed As Context: `design-spec.md` (RSK-003; DS-003)
- Supplemental Task Artifacts Reviewed As Context: `probes/README.md`, `follow-ups.md` (FU-001, FU-002)
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-003
- Implementation Revision Record Reviewed As Context: IR-002
- Original Code Review Report: `code-review-report.md` (CRR-002 `Pass`)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md` (Acceptance-Criteria Proof, Cases)
- API/E2E Revision Record Reviewed As Context: API-REV-001
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass` on code `1df7771aac` (HEAD `b220b6ce38`). Test commits `03e5d4b4b1`, `f23f0dc834`; reports `b7906c8617`.
- Final Validation Confidence: 95.5% (API/E2E's figure)
- Prior unresolved test-review findings rechecked: none (first test review)
- Project testing guideline applied: `TESTING.md`:
  - test-owned runtime homes ("Test-only runtime CLI settings": a throwaway `CODEX_HOME` with a symlink to the user's `auth.json`);
  - the test vault for paid keys;
  - live gates.
  - No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001 with the precondition AC-007 states; SCN-002 for Codex; RSK-003's restart-resume)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/lost-session-renewal-live.e2e.test.ts` | Added (`f23f0dc834`) | AC-007, AC-001 and AC-002 live, AC-003, AC-006, REQ-004, REQ-007, RSK-003 | A lost runtime session with real CLIs on the built server | LC-01, LC-02 (Claude: `RUN_CLAUDE_E2E=1` plus the captured test vault); LC-03 (Codex: `RUN_CODEX_E2E=1`). Each runtime on its own built server with test-owned homes. |
| `autobyteus-server-ts/tests/e2e/helpers/claude-live-agent-harness.ts` | Updated (`03e5d4b4b1`) | DS-003 | The live Claude harness | A restore calls `session.verifyResumable()`, as `ClaudeAgentRunBackendFactory` does |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-streaming-session-lifecycle.e2e.test.ts` | Updated (`03e5d4b4b1`) | RSK-003 | The Claude one-process lifecycle (live) | A stale assertion ("restored run opens its process lazily") replaced by "the process opened at the restore serves the turn"; an optional isolated api-key mode |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | The file header maps LC-01…LC-03 to their criteria, gates and run line. Each case name states its outcome. |
| Assertions prove approved requirements instead of incidental implementation details | Pass | **LC-01 (AC-007):** the segment is exactly era 1's record IDs; one marker, first, with the exact REQ-004 text and the renewal key; a new session ID and the same model; the hand-over notice at the start of the fresh session's first input, before the user's text (read by a recorder at the real CLI boundary); a reopened chat shows the earlier conversation before the line (AC-006); one `RUNTIME_SESSION_LOST` naming the runtime and the lost ID (REQ-007). Then AC-003: without sign-in, the message fails with no second marker or segment, the session is kept, and earlier records are unchanged. Signed in again, the renewed session resumes with no second notice. **LC-02 (RSK-003):** after a restart while busy, every session process opened the saved session, the run recalls its codeword, and nothing is renewed. **LC-03 (AC-002):** segment, marker, new thread, and the notice in `turn/start`. The model's recall of the codeword after a renewal is kept as evidence rather than asserted, which suits a model-dependent answer. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | One `liveServer` builder per runtime; the shared `test-runtime-bootstrap` and `agentStreamFramesOf` helpers |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Test-owned data roots and databases are removed in `tearDown`. Claude runs on its own `HOME`/`CLAUDE_CONFIG_DIR` with the test vault's key (api-key mode), so it never reads `~/.claude`. Codex uses a throwaway `CODEX_HOME` with a symlink to the user's `auth.json`, the setup TESTING.md prescribes. The recorders must answer `--version` before the server starts, so the server cannot fall back to the real, unrecorded CLI. Paid steps are one short turn each, on the cheapest models. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | 383 lines, one surface: a lost session with real CLIs |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The lifecycle test's lazy-open assertion, made untrue by DS-003, is replaced. The harness now follows the factory, so the case describes production again (negative control API-06nc: the harness without the check fails both CLI candidates). |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | API-02-04 (LC-01, LC-02 JSON), API-05 (LC-03), API-06 and API-06nc, API-09 |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Removing the session file the run itself created is AC-007's stated precondition, standing in for Claude Code's 30-day cleanup (SCN-001). Removing the rollout is SCN-002's. |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | A built server; GraphQL `createAgentRun`; agent websocket messages; real server stops and starts; the real Claude Code and Codex app-server. The recorders pass traffic through unchanged. |

## Findings

None.

- The deviation (AC-001 proven with the real Claude CLI instead of a scripted one) is accepted. Real CLI output on the built server is stronger evidence than a scripted harness, and it needs no new fixture.

## Follow-ups

- Follow-ups this review added: None (FU-001, FU-002 already recorded)

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `lost-session-renewal-live.e2e.test.ts`, `claude-live-agent-harness.ts`, `claude-agent-streaming-session-lifecycle.e2e.test.ts`
- Unresolved finding IDs: none
- Recommended Recipient: `delivery_engineer`
- Notes: carried for delivery:
  - Grok and DeepSeek renewals not run live (shapes pinned from probes).
  - No built-host E2E (the application host serves no run API); AC-008 for the host is proven by the wiring tests (IMP-12).
  - FU-001 (the Solution Designer's, `cleanupPeriodDays`) and FU-002 (two E2E cleanup races, passing alone).
  - Nothing written to the founder's `~/.claude`.
