# API/E2E Test Review Report

## Review Meta

- Review Round: 2 (recheck after API-REV-003; round 1 was the test-code review after API/E2E round 2, API-REV-002 Pass)
- Trigger: API/E2E Engineer handoff of the CRR-005 fixes (commit c61e1d7f0, evidence 669b46fac), 2026-11-10; round 1 trigger: API-REV-002 Pass
- Requirements Doc Reviewed As Context: `requirements-doc.md` (AC-001..AC-013, QR-001..QR-003)
- Investigation Notes Reviewed As Context: not needed beyond the coverage investigation
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-004)
- Design Spec Reviewed As Context: `design-spec.md` (SR-004, DS-005)
- Supplemental Task Artifacts Reviewed As Context: evidence named below
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-003 (via the SR-004 package)
- Implementation Revision Record Reviewed As Context: IR-003
- Original Code Review Report: `code-review-report.md` (CRR-004 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-006`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001..API-REV-003)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass` (API-REV-002; API-REV-003 records the probe fixes, no case or score changed)
- Final Validation Confidence: 95% final, 87% post-repository
- Prior unresolved test-review findings rechecked: T-001, T-002 (both resolved, see Findings)
- Project testing guideline(s) applied: `TESTING.md` (Browser probes; Rules 6, 9, 10). Round 1 found that the new probe did not fail on browser page errors (T-001); resolved in round 2. No conflict with the skill's rules.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001..SCN-008; each case enters through its real surface)

## Changed Durable Test Scope

Code under test: `dfa0faa76`. Test commits: f6ce6c78e (baseline fixes), a748eb48e (round 1), be161036e and 534535bc5 (round 2). The ticket-owned `probes/real-stack/model-list-journeys-probe.mjs` was removed in favour of the durable probe below (an execution artifact, not reviewed as test code).

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/model-list-journeys-probe.mjs` | Added | SCN-007, SCN-008; AC-010..AC-013, QR-001, QR-002, Rule 10 | Model pickers following a runtime's changing list on the real stack (API-11, API-12, API-14, API-14b, API-19); `--cli scripted` (default) and `--cli real` | 805 lines, one coherent journey family; derived from `runtime-switch-members-probe.mjs`. T-001, T-002 |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated (MSP-32) | REQ-010, REQ-011, QR-001, QR-002 | Phone model sheet: one read per opening, touch-sized Refresh, list kept, no error | Request counting at the GraphQL boundary; good |
| `autobyteus-server-ts/tests/e2e/run-history/stopped-run-model-config-graphql.e2e.test.ts` | Updated (MSR-001, MSR-002, MSR-003; field list) | AC-008, AC-012, AC-013; SR-004 contract | Stopped-run Save and options through real GraphQL with a scripted Claude CLI | Exact refusal texts, stored files unchanged on refusal, switch back; MSR-003 asserts `modelListReadable` both ways and non-stickiness; mutation evidence `API-07-r2-mutation-check.log` |
| `autobyteus-server-ts/tests/e2e/projects/delegated-copy-model-change.e2e.test.ts` | Updated (DCM-010) | AC-012, AC-013 | Delegated copy Save following the CLI's list, agent and Team roots | Same structure as MSR-001; switch back onto AGY |
| `autobyteus-server-ts/tests/fixtures/agent-runtimes-fake-cli.mjs` | Updated | AC-010..AC-013 | `claude-models` state: the scripted CLI's offered list, or `none` | Minimal, documented |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-effort-only-live.e2e.test.ts` | Added (gated `RUN_CLAUDE_E2E=1`) | AC-005, AC-006, AC-008, QR-003 | SDK session arguments read at the CLI process boundary, per usable CLI | Skips, never passes, without the gate; the stored-by-an-earlier-release case is a legitimate persisted-data shape; mutation evidence `API-09-mutation-check.log` |
| `autobyteus-web/tests/e2e/chat-composer-polish-probe.mjs` | Updated (T01–T03, T06, T07 retargeted; T08, T09 added) | AC-003, AC-005, AC-006 | Thinking menu on the real catalogs | Assertions name the AC they prove |
| Baseline-fix files (f6ce6c78e): `available-agent-runtimes-graphql.e2e.test.ts`, `agent-runtimes-graphql.e2e.test.ts`, `agent-runtimes-e2e-harness.ts`, `autobyteus-anthropic-stored-config-resume.e2e.test.ts`, `autobyteus-anthropic-stored-config-edit-launch.e2e.test.ts`, `native-runtime-live-harness.ts` | Updated | — (Rule 9 baseline fix) | Own GraphQL calls carry the node credential; data-file scan skips the control socket | Labelled baseline-fix commit; correct causes |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-claude-5-5-live.e2e.test.ts` | Updated (header text) | AC-003 | Header names the new switch default | — |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Case IDs with AC references in titles and comments throughout |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Exact refusal texts, stored files unchanged, request counts, DOM rows; round 2: API-14 asserts the card avoids "No longer offered" after a failed refresh (T-002 resolved; flags round 1's recorded card, not round 2's) |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | `makeFakeClaude` / `claudeOffers`, shared fake CLI state, probe helpers from `fixtures/probe-node-access.mjs` |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Owned data roots, free ports, sanitized env, cleanup receipts; scripted mode needs no account; round 2: any unexpected browser page error fails the run (T-001 resolved, self-checked with `--inject-page-error`) |
| Large files remain coherent and navigable | Pass | The 805-line probe is one journey family with a header index of its cases |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The ticket-owned probe was removed when the durable one landed; the live test skips only behind its gate |
| Coverage agrees with the coverage investigation and execution evidence | Pass | Both CLI modes Pass for API-11/12/14/14b/19 with 0 browser errors (`evidence/API-11-12-14-r2-real-stack/*/model-list-journeys-evidence.json`); MSR-003 and DCM-010 Pass |
| Test callers and fixtures exercise an independently established supported scenario | Pass | The scripted CLI stands in for a CLI update or failure (PRB-D3); the earlier-release metadata in the live test is real persisted data the product once wrote |
| Each test enters through its scenario's real trigger and follows the real steps | Pass | Pickers opened and Refresh clicked in the browser; Saves through GraphQL mutations; runs created, stopped and resumed through the product; API-12 restarts the backend before the return message (Rule 10) |

## Findings

No open findings.

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| T-001 | `model-list-journeys-probe.mjs`, all cases | Round 1: page errors only logged, exit 0. Round 2 (c61e1d7f0): `recordPageError` tags each error with its case; `EXPECTED_PAGE_ERRORS` is empty; any other error adds a `failures` entry, sets exit 1 and `result: Fail`; setup-time errors count too. Self-check `--inject-page-error --cases API-19`: `API-19 Pass`, then `browser page errors that fail the run: 1`, `probe: Fail`, `EXIT=1` (`evidence/API-11-12-14-r3-probe-fixes/selfcheck-injected-page-error.log`) | — | Resolved |
| T-002 | Same file, API-14 | Round 2: the `/No longer offered/i` check on `cardAfterFailure` and `noteAfterFailure`, as API-14b makes. Sensitivity: flags round 1's recorded card, not round 2's (`T-002-card-check-sensitivity.log`). Full scripted rerun: all five cases Pass, `result: Pass`, `failures: []`, `browserErrors: []`, API-14 `findings: []`, `EXIT=0` | — | Resolved |

Not findings (noted): API-14 records `busySeen` without asserting it, reasonable since the scripted CLI can answer faster than the busy state is observable; rows-while-busy is asserted. The real-CLI mode was not rerun after the fix; acceptable, because the fix changes only assertions and the exit rule, and the round-2 real-CLI run recorded 0 browser errors and a clean card.

## Follow-ups

- Follow-ups this review added: FU-010 (`runtime-switch-members-probe.mjs`, the probe this one was derived from, has the same browser-error gap; not touched by this ticket).

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: all listed above (round 2 rechecked the `model-list-journeys-probe.mjs` delta `git diff d706f164a..c61e1d7f0`)
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: follow-up FU-010 (the same browser-error gap in `runtime-switch-members-probe.mjs`, not touched by this ticket).
