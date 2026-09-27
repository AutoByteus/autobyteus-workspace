# API/E2E Test Review Report — `grok-build-runtime-support`

## Review Meta

- Review Round: `1`
- Trigger: `/api_e2e_engineer` result `Pass`, API-REV-002 (round 2, commit `d7d4aa2ad`); proportional review of the durable test code
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-011; AC-004 amended, REQ-005 clarified, REQ-017/AC-015 deferred)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-009..SR-011)
- Design Spec Reviewed As Context: `design-spec.md` (SR-011)
- Supplemental Task Artifacts Reviewed As Context:
  - `tests/fixtures/grok-acp/*` (recorded wire fixtures, fake agent and CLI);
  - `evidence/api-e2e/*`.
  - Product/UI supplements: N/A — not applicable.
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-003)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-002)
- Original Code Review Report: `code-review-report.md` (latest implementation result CRR-003, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001, API-REV-002); `api-e2e-test-case-ledger.md`
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass` (API-REV-002)
- Final Validation Confidence: 95% (no category below 90%)
- Prior unresolved test-review findings rechecked: none (first test review)
- Supported Product Scenario Basis Confirmed: `Yes`. The tests exercise the approved SCN-001..SCN-010 scenarios. AC-015 is deferred by the user and correctly not covered.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/runtime-capability-graphql.e2e.test.ts` | Updated | SCN-001/SCN-010; AC-001, QR-001 | Runtime capability GraphQL surface: five kinds; Grok enabled / missing command / below-minimum version | Extracts the query into `queryCapabilities`; explicit 60 s timeouts justified in a comment (the host's AGY probe is slow) |
| `autobyteus-server-ts/tests/e2e/helpers/grok-fake-cli.ts` | Added | Test infrastructure | Executable fake `grok` wrapper over the recorded-fixture CLI; scoped env override with restore | Small and reused by two suites |
| `autobyteus-server-ts/tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts` | Added | SCN-002/003/004/010, QR-006; AC-002, AC-003, AC-004 (approve + amended deny), AC-009, AC-012 | Zero-cost, default-CI Grok Build journey through the real Studio server (GraphQL, WebSocket, manager, ACP backend, ledger) | 6 cases; the two regression cases fail on the pre-fix src (reported evidence) |
| `autobyteus-server-ts/tests/e2e/runtime/grok-build-live-runtime.e2e.test.ts` | Added | SCN-003..SCN-006; AC-003/004/005/006/008/009/013 (tool set) | Gated live parity (`RUN_GROK_E2E=1` plus a working `grok`): standalone journey, mixed team, Org | Skips cleanly by default; paid runs are opt-in |

- No durable test file changed: `No`
- Removed: none

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each `it` names the behavior plus the AC/QR ID. The live standalone journey is split into commented steps A–E; team and Org are separate cases |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Assertions target the product surface: WebSocket event types, canonical tool names, `provider_stop_reason:"cancelled"` with no `TURN_INTERRUPTED` after a denial (AC-004 as amended), the one-shot `allow-once`/`reject-once` wire answer, `session/new` `_meta` keys exactly `rules`/`yoloMode`, per-call usage keys and GraphQL summary sums equal to Grok's turn usage, the `createAgentRun` message carrying the provider text with no workspace path, a runtime-scope `ERROR` plus `TURN_INTERRUPTED` on process exit, exact session binding and history-once after restore, no `use_tool`/`autobyteus_agent_tools__` names. Minor: replay line 162 (`expect(schema).toContain("\"high\"")`) repeats the loop and does not prove the default effort. The launch-profile unit test already asserts the default, so this is non-blocking (observation only) |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | `grok-fake-cli.ts` is shared by the capability and replay suites; the replay suite uses `createGrokRun`/`openAgentSocket`/`waitFor`/`writeFixture`; derived fixtures are built from the recorded `permission`/`handshake`/`prompt` rows rather than hand-written traffic; the live suite reuses existing e2e helpers (team metadata, communication matchers) |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Temp data dir and workspaces, with definitions and runs cleaned up in `afterAll`. The env overrides are process-wide but always restored in `finally`, and tests within a file run sequentially. The replay suite passed 3 consecutive runs (reported). The live suite is gated and uses unique markers/tokens, `low` effort, and bounded step timeouts |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | The live file (475 lines) covers one surface, live Grok parity, in three coherent cases; the replay file (355 lines) covers one zero-cost journey |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The round-1 `expect.soft` on the deny terminal is now a hard assertion matching amended AC-004. The live suite's skip is an explicit credit gate. One cosmetic comment remains (live line 194, "the agent continues"), but the assertions and the following comment state the amended behavior. No compatibility-only tests |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Matches the ledger and execution report: capability (5 kinds), replay (catalog, list_dir + usage, approval, deny → completed → next turn, unauthenticated `session/new`, mid-turn exit), live (standalone, team, Org); AC-015 intentionally absent (deferred) |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Replays use recorded real Grok 1.0.41 traffic. The two synthesized tails (post-reject `cancelled`, `session/new -32000`) reproduce behavior observed live on the real CLI (`evidence/api-e2e/approval-bisect-results.txt`, `ac012-noauth-acp-wire`), and the live suite confirms them against the real CLI |

## Findings

None actionable.

Observation (non-blocking; no action required for delivery):
- Replay line 162 duplicates the effort loop instead of asserting the default `high`.
- Live line 194's comment still reads "the agent continues".

Either can be tidied at the next touch.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed:
  - `tests/e2e/runtime/runtime-capability-graphql.e2e.test.ts` (updated)
  - `tests/e2e/helpers/grok-fake-cli.ts` (added)
  - `tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts` (added)
  - `tests/e2e/runtime/grok-build-live-runtime.e2e.test.ts` (added)
  - All paths are under `autobyteus-server-ts/`. None removed.
- Unresolved finding IDs: none
- Recommended Recipient: `/delivery_engineer`
- Notes:
  - The test changes are uncommitted in the worktree; delivery must include them.
  - I did not re-execute the suites; I relied on the API-REV-002 evidence (3 consecutive replay passes, and the regression cases failing on pre-fix src).
  - Residuals are carried from API/E2E: `web_search` is not demonstrable; Grok's permission policy may drift; application launch is deferred (CR-005, SR-009); Grok spend is about US$0.82 in total.
