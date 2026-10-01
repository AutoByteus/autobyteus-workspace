# API/E2E Test Review Report

## Review Meta

- Review Round: 1
- Trigger: API/E2E Pass (API-REV-001, round 1) from `/api_e2e_engineer`, requesting proportional review of durable test changes
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved; SR-009..SR-012)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (unchanged since CRR-001)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001..SR-012)
- Design Spec Reviewed As Context: `design-spec.md` (SR-012)
- Supplemental Task Artifacts Reviewed As Context: N/A — no behavior-defining supplements
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-005)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-002)
- Original Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A — not applicable
- API/E2E Result: Pass
- Final Validation Confidence: 94.9%, as reported by API/E2E; not rescored here
- Prior unresolved test-review findings rechecked: None (first test review)
- Supported Product Scenario Basis Confirmed: `Yes`. Every changed test exercises an approved scenario: SCN-001 (+E1/E2), SCN-003, SCN-004 (+E1), REQ-002/AC-002, REQ-009/AC-008, QR-001/002/003/007.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| workspace `autobyteus-web/tests/e2e/electron-launch-profile-probe.mjs` | Updated | REQ-002/AC-002 (harness path), REQ-003, REQ-009/AC-008 | Packaged launch-profile isolation probe (E2E harness path) | Replaces stale assertions: the superseded "full caller env reaches the e2e server" and "no updater IPC in e2e". They now assert allowlisted-present / production-sentinels-absent, the isolated `DATABASE_URL`, `ELECTRON_RUN_AS_NODE` removed from the prepared env, and the `disabled` controller (state/check/download `disabled`; install/set-channel refused) before and after the auto-check delay |
| workspace `autobyteus-web/tests/e2e/isolated-app-lifecycle-probe.mjs` | Added | REQ-001/002/003/004, AC-001/002/003, QR-001/002/003, SCN-001-E1/E2 | Real `isolated-app` CLI against a packaged build (LC-001..LC-006) | Probe-owned registry via `TMPDIR`; agent-like caller env with production sentinels; sentinel fake bundles prove refusals never execute |
| workspace `autobyteus-web/package.json` | Updated (1 script) | — | `test:e2e:isolated-app` entry | Follows the existing `test:e2e:*` probe convention |
| mcps `browser-automation/tests/integration/test_mcp_transports_real.py` | Updated (+2 tests, +helper) | REQ-008/AC-007, REQ-005/AC-004, QR-007, MP-004, design guidance on concurrent calls | Real stdio MCP transport tests | Recording across concurrent calls with a stop from a second MCP process; attach-only on a dead port with the tool inventory check |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | LC-001..LC-006 titles state the behavior; the pytest names describe the scenario; the updated probe's failure messages name the violated rule ("inherited non-allowlisted caller variable …") |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Checks are observable: server-child `ps eww` env, `lsof` listeners/open files, CLI JSON and exit codes, group absence, port release, root removal, MP4 bytes/frames/`end_reason`, error codes. The negative control on the pre-change installed app fails as intended (`OPENAI_API_KEY` inherited) |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | `runCli`/`cliOk`/`cliError`, `assertInstanceIsolated` reused across LC-001/LC-003, `makeFakeApp`; mcps reuses `LiveChrome`, `structured_result`, `free_port`. Nit: the new `stdio_mcp_session` helper repeats the first test's inline stdio setup without refactoring it; not worth a change |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Registry and auto roots redirected into a probe-owned `TMPDIR`; controlled "production" root; `finally` cleanup stops or kills every started group and removes the run root; production listener checkpoint before and after; ffmpeg-absent skip. Nit: `portA`/`portB` come from two independent `freePort()` calls without mutual exclusion (negligible collision chance) |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | The lifecycle probe (369 lines) covers one surface; the MCP transport file stays about transports |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The stale backend-env and updater-absent assertions were replaced, not kept alongside the new ones. No skips except the documented ffmpeg prerequisite |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Execution report rows R-05a (2/2), R-06 (5/5 + negative control), R-07 (6/6), durable-test table lines 191–208; the narrowing of the R-07 listener assertion to the control endpoint is recorded (OBS-1) |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Fake `.app`/`.AppImage` sentinels reproduce SCN-001-E1 (approved in SR-011/SR-012), and the real installed app was refused live in L-14. The dead-process kill reproduces SCN-001-E2 (AC-003 alternate). Two MCP processes reproduce MP-004 recovery |

## Findings

None.

Non-blocking notes (no action required): the stdio-helper duplication and the port-pair nit above. The attach-only test carries `real_chrome` although it needs no Chrome; that keeps it inside the suite's opt-in gate, which is consistent with the file.

Observation outside test-code scope (recorded for the owner, not a test finding):

- **OBS-2** (API/E2E): lifecycle-started instances inherit `npm_config_prefix` and other npm-script variables from the `pnpm` script. Electron's login-shell PATH resolution then loses the nvm `bin`, so an agent *inside* an isolated instance can get `pnpm: not found`.
  - Scenario gate: an agent inside the isolated instance running Node tooling in its terminal is not an approved scenario or AC. REQ-002/REQ-003, AC-001 and AC-010 hold, and API/E2E proved them. So this cannot be an implementation finding, and it does not block.
  - Proportionate route: separate-ticket or requirement candidate for the Solution Designer. The suggested bounded fix is for the launch overlay to drop `npm_config_*`/`npm_lifecycle_*`/`npm_package_*`/`PNPM_SCRIPT_SRC_DIR`. That would be a small design change to the approved overlay rule ("caller env − `ELECTRON_RUN_AS_NODE`").
- **OBS-1** (pre-existing `*` backend binding): separate-ticket candidate. Unchanged by this feature.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the four paths above (workspace changes are uncommitted working-tree changes; no commit was requested)
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes: No rerun was needed. Every changed assertion could be judged from the diff and the recorded execution evidence. OBS-2 should be surfaced to the Solution Designer and the user as a follow-up candidate.
