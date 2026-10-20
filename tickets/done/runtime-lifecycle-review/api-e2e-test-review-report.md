# API/E2E Test Review Report — runtime-lifecycle-review (Settings → Agent Runtimes)

## Review Meta

- Review Round: 1
- Trigger: API/E2E pass, API-REV-001 (test code `76570a40e4`, reports/evidence `e6029ccba1`; product code validated at `52aa663edd`)
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-010 + SR-012 UI note item (3))
- Investigation Notes Reviewed As Context: E-R21 (signed-out answers)
- Solution Revision Record Reviewed As Context: SR-012 (via the requirements and design spec)
- Design Spec Reviewed As Context: `design-spec.md` (DS-001…DS-006, sign-in rules)
- Supplemental Task Artifacts Reviewed As Context: Product `ui-ux-spec.md` (responsive, accessibility)
- Architecture Review Revision Record Reviewed As Context: N/A for this entry point
- Implementation Revision Record Reviewed As Context: IR-002
- Original Code Review Report: `code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95.3%
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline applied: `TESTING.md` (test layers, browser probes, isolation, rules). Discrepancy recorded: the "Browser probes" rule "existing evidence is never overwritten" does not match the repository's existing `embedding-settings-probe.mjs`, which deletes its output folder; the new probe copies it (FU-007).
- Supported Product Scenario Basis Confirmed: `Yes`

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts` | Added | SCN-001/002/003; AC-001…003, 005…007, 009, 011; QR-002/003; DEC-007/008 | The page's GraphQL contract on a real studio server | 12 ordered cases on one server (a journey); header gives purpose, prerequisites and command |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtimes-running-agents.e2e.test.ts` | Added | AC-004, DEC-003, SR-011/AR-008; preserved application readiness | Running-agent count with live standalone and Application team agents; Codex/Claude readiness texts | Skips when Brief Studio's importable package is not built (existing `skipIf(!packageRoot)` pattern; built by `test:integration:prepare`) |
| `autobyteus-server-ts/tests/e2e/helpers/agent-runtimes-e2e-harness.ts` | Added | — | Shared fakes setup, vendor-source stub, GraphQL client for both files | Real reuse across the two files |
| `autobyteus-server-ts/tests/fixtures/agent-runtimes-fake-cli.mjs` | Added | E-R21; CR-001 | Scripted four runtime CLIs with the real signed-out answers | Claude signed out = JSON + exit 1; `grok login --oauth` ignores SIGTERM |
| `autobyteus-web/tests/e2e/agent-runtimes-settings-probe.mjs` + `package.json` script `test:e2e:agent-runtimes-settings` | Added | AC-001…007, 009…011 (UI); SR-012 widths; zh-CN | Real-stack browser probe of the Settings section | Owns its stack, cleanup receipt, `result.json` |
| `autobyteus-web/tests/e2e/fixtures/agent-runtimes-vendor-sources.mjs` | Added | AC-002 | Vendor-source stub loaded into the probe's backend | Shared fixture folder as TESTING.md asks |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | `AR-01…12`, `RA-01…04`, `ARP-01…10` with AC/VIS references in each title |
| Assertions prove approved requirements instead of incidental details | Pass | Exact user copy, states, codes, versions and process liveness; the real 10-minute time-out is asserted while the file shortens it; AC-011 scans name the secrets the fakes actually printed (≥ 5) so an empty scan cannot pass vacuously; RA-02 pins today's Claude readiness text |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | One fake CLI shared by server e2e and the probe; one harness for both server files; shared `until` helper reused |
| Isolation and determinism fit the boundary | Pass | Temp roots, port 0 / chosen free ports, scrubbed env in the probe, resolved temp `HOME` in the commands; waits are condition-based. The GraphQL file's cases are deliberately sequential on one server (documented journey) |
| Large files coherent and navigable | Pass | Each file covers one surface; the 478-line probe is sectioned (process, fakes, node, browser helpers, cases) |
| No stale, duplicated, disabled-without-reason or compatibility-only tests | Pass | — |
| Coverage agrees with the coverage investigation and execution evidence | Pass | Cases map to the execution report's AC table (API-10, API-11, API-20 rows); logs show the counts claimed |
| Callers and fixtures exercise an independently established scenario | Pass | Each case traces to AC/SCN IDs; fakes reproduce answers captured from the real CLIs (API-02) |
| Each test enters through the real trigger without unreal setup | Pass, with two noted approximations | Real HTTP GraphQL, real child processes, real agent runs and a real Application launch through its own backend. Approximations (acceptable, not findings): AR-09 "installed later" switches `GROK_BUILD_COMMAND` in-process rather than placing the file at the missing path; ARP-08/09 bind the window to another node through the store's own `bindNodeContext` action reached via Pinia internals. Both are documented, produce the same state the real trigger does, and a real remote-node window stays a delivery check |

## Findings

None.

## Follow-ups

- Follow-ups this review added: FU-007 (browser probes delete an existing `--output-dir`; new probe and the existing embedding probe; TESTING.md discrepancy).

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the six paths above plus the `package.json` script
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: CRR-003. Optional tidy-up, not required: AR-09 could create the Grok link at the "not installed" path instead of changing the env var. The API/E2E note that the SR-012 UI note's "about 640–1100 px" wording is loose (the table starts at a 1252 px window, list 58.1 rem) is for the Solution Designer; no code or test change.
