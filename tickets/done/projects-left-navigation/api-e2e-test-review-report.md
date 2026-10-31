# API/E2E Test Review Report — projects-left-navigation

## Review Meta

- Review Round: 1
- Trigger: API-REV-002 `Pass` from the API/E2E engineer. This review was deferred from CRR-003, because the test-code review and the failure-origin review are separate entry points.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (R4, SR-008 refinements)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (only as cited)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-009)
- Design Spec Reviewed As Context: `design-spec.md` (SR-009)
- Supplemental Task Artifacts Reviewed As Context: Product `ui-ux-spec.md` (journeys and states named in the probe)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-003)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-003)
- Original Code Review Report: `code-review-report.md` (CRR-004, source review Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-005`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001 Fail, API-REV-002 Pass)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass` (API-REV-002), on code `c9972a1581`; test commits `dcada6320d`, `5e08cf6632`
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: none (first test review)
- Project testing guideline applied: root `TESTING.md`, chiefly § Browser probes, § Rules 2/5/6/9, and the gates and clean-environment rules. No conflicts or discrepancies found.
- Supported Product Scenario Basis Confirmed: `Yes`. The tests reproduce the requirements' SCN-001…SCN-011 and AC-001…AC-017; none of them creates a scenario of its own.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/project-run-history.e2e.test.ts` | Added | AC-002…009, AC-012; REQ-003…010, REQ-013; SR-009 record | Server E2E for runs under a Project and `projectRunHistory`, through the real HTTP, WebSocket, GraphQL and scoped MCP tools, with the scripted AGY CLI | Gated `RUN_AGY_FAILURE_E2E` with a disposable `HOME`; PRH-01…10 are named by case and criterion |
| `autobyteus-server-ts/tests/e2e/helpers/collaboration-root-harness.ts` | Updated | AC-003/005 setup | `startRoot(kind, ids, extra = {})` passes extra creation-input fields such as `projectId` | A minimal, backward-neutral change to a shared harness |
| `autobyteus-web/tests/e2e/projects-left-navigation-probe.mjs` and the `test:e2e:projects-left-navigation` script | Added (round 1), updated (round 2) | AC-001…017 (PLN-01…10) | A browser probe with its own stack: the built backend, Nuxt dev, headless Chrome and the scripted AGY CLI | Round 2 adds a Team Stop in Projects mode (CR-003) and scopes a CORS tolerance to PLN-08's deliberate restart |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentOrgScopedRows.spec.ts` | Added | REQ-008 / AC-007 (Org rows) | Component test of the Org scope filter | Fills the gap noted in the handoff and the source review |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | The PRH-01…10 and PLN-01…10 headers list each case's criterion and expected outcome; the Org spec's three cases name what is kept or dropped |
| Assertions prove approved requirements instead of incidental details | Pass | Assertions are on stored shape (`project_runs.json` keys; released run-record keys free of any `project` key), listings and scopes per Project (REQ-008: P/Q/Temp, a copy in P and Q then only Q), the exact `## Project` text, refusal results, cap plus open-work hosts, and in the browser the DOM state (Stop counts, rows, chip text). Screenshots are support only, as TESTING.md requires. |
| Fixtures, setup, helpers and data builders reuse meaningful repetition | Pass | Reuses `collaboration-root-harness` (extended, not copied), `agy-failure-cli.mjs` (`linked_skills`), `taskBearingOrgFixture`, and local `read`/`prepare`/`firstSend` helpers |
| Isolation and determinism fit the boundary | Pass | Server: gated, disposable `HOME`, harness-owned data root, evidence directory optional, cleanup in `afterAll`. Probe: own ports, data root, process groups and Chrome, removed in `finally`; waits use `until` predicates rather than fixed sleeps (one 20 ms spacing in PRH-07 orders `createdAt`). The PLN-08 CORS tolerance applies only during the deliberate backend outage. |
| Large files stay coherent and navigable | Pass | The 977-line probe covers one surface (Projects mode, AC-001…017) with sections for the stack, the public API, browser helpers and cases. The 385-line server E2E covers one read and its record. |
| No stale, duplicated, disabled-without-reason or compatibility-only tests | Pass | The skips are the documented gates; there are no `.only`, TODOs or compatibility assertions. The released-key assertion is a current contract (CR-001), not a compatibility path. |
| Coverage agrees with the investigation and execution evidence | Pass | API-01 10/10 (`API-01-server-e2e.log`); API-04 r2 PLN-01…10 Pass with `stopDiag` `projectsStopButtonsAfter5s: 0`, `teamStopShownBefore: 1`, `teamStopShownAfter5s: 0`; API-03 Org spec passes; API-07 web suite 4921 passed |
| Callers and fixtures exercise an independently established scenario | Pass | Every case maps to a requirements-doc scenario. Seeded "existing" runs come through the public GraphQL API, as an earlier build would have created them (SCN-005, which the probe header explains). |
| Each test enters through its real trigger and follows the real steps | Pass | Starts go through New chat or the "+" UI (probe), or `prepareAgentRun` plus the WebSocket first send (server, the web's start path). Delegation, closure and reopen use the real scoped MCP tools driven by the scripted CLI. Stop uses the row's Stop button. For PLN-09, the API restore puts a run into the "running, with no live context in this window" state, which real use produces after a reload or from another window. |

Observations, not findings:

- PLN-09's Team Stop assertion is guarded by `s.runs.team`, which PLN-04 sets. A `--cases` subset without PLN-04 would skip it quietly. The header already requires running the cases in order, and the evidence of record ran the full set, so no change is needed.
- The server suite reuses the existing `RUN_AGY_FAILURE_E2E` gate of the scripted-AGY harness. That is the repository's convention, not something this change introduced.

## Findings

None.

## Follow-ups

- Follow-ups this review added: None. FU-007 and FU-008 were recorded by API/E2E.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the four listed above, including the `package.json` script.
- Unresolved finding IDs: none.
- Recommended Recipient: `delivery_engineer` (`/software_engineering_team/delivery_engineer`).
- Notes: task_size Large / architectural_risk High, unchanged. Source review is CRR-004 Pass. Delivery should carry the DS-004 wording follow-through: the trigger (4) extension to Stop recorded in the IR-003 handoff, Important Assumption 6.
