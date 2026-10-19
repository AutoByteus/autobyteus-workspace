# API/E2E Execution Coverage Report — `baseline-e2e-probe-repair`

Ticket folder `T` = `/Users/normy/autobyteus_org/autobyteus-worktrees/baseline-e2e-probe-repair/tickets/in-progress/baseline-e2e-probe-repair`. Evidence `E` = `T/evidence/api-e2e/`.

Validated code: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/baseline-e2e-probe-repair`, branch `codex/baseline-e2e-probe-repair`, HEAD `3108bb9ef8`, base `origin/personal` `516e592d7b` (still the latest `origin/personal` at validation time).

## Execution Round Meta

- Requirements Doc: `T/requirements-doc.md` (Approved, SR-003)
- Investigation Notes: `T/investigation-notes.md`
- Solution Revision Record: `T/solution-revision-record.md`
- Design Spec: `T/design-spec.md` (Ready, SR-003)
- Supplemental Task Artifacts: None
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `T/implementation-handoff.md` (IR-002)
- Implementation Revision Record: `T/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `T/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `T/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `T/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: Implementation Engineer direct-route handoff, IR-002
- Prior Round Reviewed: None
- Latest Authoritative Round: 1

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Coverage investigation artifact: `T/api-e2e-coverage-investigation.md`
- Investigation completed before final execution: `Yes`
- Investigation plan followed: `Yes`
- Existing coverage decisions revised during execution: none
- Reroute required: `No`
- Notes: every changed assertion was reviewed against the approved basis and the product source before the results were accepted. The R03 injected body matches the server's real failure shape (`autobyteus-server-ts/src/api/graphql/types/agent-org-run.ts:203`). UC-004's token change is explicit migration behavior (`agent-org-token-attribution-repository.ts:74-85`).

## Test-Case Ledger Reconciliation

- Ledger path: `T/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`, written during the run from the recorded events
- Every completed case recorded immediately: `Yes`
- Long-running checkpoints: `N/A` (longest run about 9 min, `test:unit`)
- Ledger reconciled: `Yes`
- Last durably recorded event: 11
- Cases still running, interrupted, or not started: None
- Interruption or rerun note: None

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| VAL-000 | Pass | 1 | `E/server-build-3108bb9ef8.log` | — |
| VAL-001 | Pass | 2, 3 | `E/server-e2e-run1.plain.log`, `E/server-e2e-run2.log` | 7/7 ×2 |
| VAL-002 | Pass | 2, 3 | same | 1/1 ×2 |
| VAL-003 | Pass | 2..5 | same, plus `E/uc003-each-test-alone.log`, `E/uc003-injected-failure-no-cascade.log` | 2/2 ×2; each alone; no cascade |
| VAL-004 | Pass | 2, 3 | same | 4/4 ×2 |
| VAL-005 | Pass | 2, 3 | same | 1/1 ×2 |
| VAL-006 | Pass | 9 | `E/ac012-diff-and-commit-review.txt` | suite absent at base and HEAD |
| VAL-007 | Pass | 2, 3 | e2e logs | 9/9 ×2 |
| VAL-008 | Pass | 2, 3 | e2e logs | 2/2 ×2 |
| VAL-009 | Pass | 6 | `E/probes/existing-run-model-config/` | A–F |
| VAL-010 | Pass | 7 | `E/probes/interrupt-result-presentation/` | SR008-BR-001..004 |
| VAL-011 | Pass | 8 | `E/probes/run-settings-live-R03/` | R03 |
| VAL-012 | Pass | 9 | `E/ac012-diff-and-commit-review.txt` | — |
| VAL-013 | Pass | 11 | `E/server-typecheck.log`, `E/server-test-unit.summary.txt` | — |

## Compatibility / Legacy Scope Check

- Requirements/design introduce or tolerate backward compatibility: `No`
- Compatibility-only or legacy-retention behavior observed: `No`. The tests use current public boundaries. No shim for `prepareNewAgentRun` or a private `createBackend` was added, and stream validation was not relaxed: the UC-010 frames are validated by the contract parsers.
- Approved persisted-data transition followed: `N/A` (`Not Affected`; the tests assert the existing chain)
- Durable coverage kept only for compatibility behavior: `No`
- Upstream recipient notified: N/A

## Acceptance-Criteria Proof

- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/baseline-e2e-probe-repair/tickets/in-progress/baseline-e2e-probe-repair/evidence/api-e2e/`

| AC ID | Critical | Proven By Case IDs | Evidence Files | Result |
| --- | --- | --- | --- | --- |
| AC-001 (verify-only) | No | VAL-001 | `E/server-e2e-run1.plain.log`, `E/server-e2e-run2.log` (7 tests: persist/restart/restore + 6 rejections) | Proven. Observation OBS-1: the drop reason is an inline comment (line 107) and in upstream commit `e6ba249a96`, not a top-of-file header. |
| AC-002 | No | VAL-002 | e2e logs | Proven |
| AC-003 | No | VAL-003 | e2e logs; `E/uc003-each-test-alone.log`; `E/uc003-injected-failure-no-cascade.log` | Proven |
| AC-004 | Yes | VAL-004 | e2e logs (4 tests ×2) | Proven: AgentOrg end state on disk and through the Org history/projection/token/restore/collaboration-root APIs; no content loss; ledger by migration ID; fail-closed warning case (DEC-010); retry; overlap refusal |
| AC-005 | No | VAL-005 | e2e logs | Proven |
| AC-006 (withdrawn) | No | VAL-006 | `E/ac012-diff-and-commit-review.txt`; `tickets/done/remove-nested-task-team/` present | Proven (absent at base and HEAD) |
| AC-007 (verify-only) | No | VAL-007 | e2e logs (9 tests) | Proven |
| AC-008 | No | VAL-008 | e2e logs (2 tests) | Proven |
| AC-009 | No | VAL-009 | `E/probes/existing-run-model-config/existing-run-model-config-evidence.json`, screenshots `API-E2E-004-A..F` | Proven: failures [], 0 page/console errors, cleanup complete |
| AC-010 | No | VAL-010 | `E/probes/interrupt-result-presentation/evidence.json`, `E/probes/interrupt-result-presentation.console.log` | Proven through the new script: failures [], 0 page/console errors |
| AC-011 | No | VAL-011 | `E/probes/run-settings-live-R03/run-settings-live-evidence.json`, `VIS-013-org-launch-failed-1512.png`, `E/probes/home-autobyteus-mtime-{before,after}.txt` | Proven: exact copy, values kept, Run enabled, 1 launch request, history unchanged, browserErrors [] |
| AC-012 | Yes | VAL-012, VAL-013 | `E/ac012-diff-and-commit-review.txt`, `E/server-typecheck.log`, `E/server-test-unit.summary.txt` | Proven: only test files + 1 script line; 8 labelled baseline-fix commits, one per item; typecheck and test:unit pass |

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / REQ / AC | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| VAL-001 | BEH-001 / REQ-001 / AC-001 | none (upstream test) | built server GraphQL | Durable | Pass | e2e logs |
| VAL-002 | BEH-002 / REQ-002 / AC-002 | `AGENT_STATUS` expectation, backend double | in-process WebSocket | Durable | Pass | e2e logs |
| VAL-003 | BEH-003 / REQ-003 / AC-003 | activation and cleanup harness | in-process GraphQL + manager | Durable + Temporary (cascade check) | Pass | e2e logs, `uc003-*` |
| VAL-004 | BEH-004 / REQ-004, REQ-011 / AC-004 | end-state assertions | built server startup ×2 on released-shape data | Durable | Pass | e2e logs |
| VAL-005 | BEH-005 / REQ-005 / AC-005 | flat Team seed | two built server processes | Durable | Pass | e2e logs |
| VAL-007 | BEH-007 / REQ-007 / AC-007 | none (upstream test) | in-process GraphQL | Durable | Pass | e2e logs |
| VAL-008 | BEH-008 / REQ-008 / AC-008 | `beginPreparation` harness | native backend factory | Durable | Pass | e2e logs |
| VAL-009 | BEH-009 / REQ-009 / AC-009 | fixture boundaries | Nuxt + headless Chrome | Browser (durable probe) | Pass | `E/probes/existing-run-model-config/` |
| VAL-010 | BEH-010 / REQ-009 / AC-010 | fixture shapes, layout, script | Nuxt + Chrome + probe WS server | Browser (durable probe) | Pass | `E/probes/interrupt-result-presentation/` |
| VAL-011 | BEH-011 / REQ-009 / AC-011 | R03 trigger | real backend + Nuxt + Chrome, real CLI identity | Browser (durable probe) | Pass | `E/probes/run-settings-live-R03/` |
| VAL-006, VAL-012, VAL-013 | REQ-006, 010, 012 / AC-006, AC-012 | repository | git, tsc, vitest unit | Repository | Pass | as above |

## Additional Repository Coverage Execution

None beyond the investigation's plan; every planned command ran there.

## Validation Confidence Scorecard (Mandatory)

Broader validation did not run beyond the planned probes (`Not Required`), so the final scores repeat the post-repository scores.

| Confidence Category | Post-Repository | Final | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 97% | 97% | — | all ACs proven | OBS-1 |
| Changed-boundary execution directness | 97% | 97% | — | — | — |
| Cross-boundary integration realism and mock gap | 93% | 93% | — | R03 injected body = real server shape | R03 boundary injection (DEC-006) |
| Environment, configuration, identity, and fixture fidelity | 96% | 96% | — | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | — | cascade check | OBS-2 |
| User-surface, browser, and desktop-shell confidence | 95% | 95% | — | — | — |
| Durable regression coverage quality and relevance | 95% | 95% | — | — | OBS-2 |

- Overall post-repository confidence: 95.4%
- Overall final confidence: **95.4%**
- Calculation method: simple average of the 7 categories
- Confidence change produced by broader validation: none (not required)
- Every critical AC directly proven: `Yes`
- Any final applicable category below 90%: `No`
- Default 95% target met: `Yes`
- Confidence-limiting residual risks: R03 proves the page's failure presentation by injecting the server's own failure result. This is approved in DEC-006 and is not a server-validation proof.

## Broader Validation Decision And Execution

- Decision: `Not Required`; mode `None` beyond the probes
- Rationale: the change is test-only, and every changed artifact ran through its own real entry point. Server suites ran against the built HEAD server; the browser probes ran in real Chrome and are the browser surface. No product code changed, so a desktop or isolated-instance journey would not prove anything about this change.

## Platform / Runtime Targets

- OS: macOS (Darwin 25.5.0)
- Runtime: Node via pnpm 10.28.2 (corepack); vitest; Nuxt dev server owned by each probe
- Browser: Google Chrome (`/Applications/Google Chrome.app`) headless via playwright-core

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected` (test-only)
- Representative existing data exercised: UC-004's synthesized released TeamRun V1 data (supported cohort, warning, consolidation-failure and overlap scenarios), each started twice on the HEAD build
- Result: the existing chain ends at `20260901_agent_org_flat_team_families_v1` with the content preserved. A second start changes nothing. The warning case fails closed and retries.
- Version-specific runtime branch or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none for this ticket. FU-4 (one unreadable derived index fails every history list) is a recorded product follow-up.

## Durable Coverage Changed In The Codebase

- Durable coverage added, updated or removed by API/E2E this round: `No`. The implementation's test changes below were validated.

| Path / Test | Change | Requirement / Boundary, Or Obsolete Assertion And Upstream Evidence | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent/agent-command-correlated-status.e2e.test.ts` | Updated (`6d106cb2e4`) | REQ-002 | Pass ×2 |
| `autobyteus-server-ts/tests/e2e/agent/standalone-error-termination-lifecycle.e2e.test.ts` | Updated (`5f812baa57`) | REQ-003 | Pass ×2, alone, no cascade |
| `autobyteus-server-ts/tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts` | Updated (`3aa6eaa717`) | REQ-008 | Pass ×2 |
| `autobyteus-server-ts/tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` | Updated (`42965d5043`); MP_001/MP_002 removed with the reason in the header | REQ-005, DEC-003 | Pass ×2 |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | Updated (`dc4110b1c6`) | REQ-004, DEC-002, DEC-010 | Pass ×2 |
| `autobyteus-web/tests/e2e/existing-run-model-config-probe.mjs` | Updated (`3052b836ad`) | REQ-009 | Pass |
| `autobyteus-web/tests/e2e/interrupt-result-presentation-probe.mjs`, `autobyteus-web/tests/e2e/fixtures/interrupt-result-presentation.page.vue`, `autobyteus-web/package.json` | Updated (`c2347175ae`) | REQ-009, DEC-007 | Pass |
| `autobyteus-web/tests/e2e/run-settings-live-probe.mjs` | Updated (`40e39d7235`) | REQ-009, DEC-006 | Pass |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route)
- Diff for removed cases: `git diff 516e592d7b..HEAD -- autobyteus-server-ts/tests/e2e/memory-sync/`

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `E/server-build-3108bb9ef8.log` | build log | Retained | — |
| `E/server-e2e-run1.plain.log`, `E/server-e2e-run2.log`, `E/server-e2e-run1.env` | e2e runs | Retained | ANSI removed |
| `E/uc003-each-test-alone.log`, `E/uc003-injected-failure-no-cascade.log` | UC-003 isolation | Retained | — |
| `E/probes/*` | probe evidence JSON, screenshots, dev/backend logs, console logs | Retained | scanned: no secrets |
| `E/ac012-diff-and-commit-review.txt` | diff, commits, absence and header checks | Retained | — |
| `E/server-typecheck.log`, `E/server-test-unit.summary.txt` | repository checks | Retained (unit: summary only) | the 1.08 MB full unit log was not retained |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent/zz-tmp-api-e2e-cascade-probe.e2e.test.ts`: a copy of the UC-003 suite with `throw` after `startHarness(true)` in test 1 | REQ-003 says one failure cannot cascade; a green run alone does not show that | test 1 failed as injected, test 2 passed | removed; `git status` clean |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Org launch server result (R03) | `page.route` on `CreateAgentOrgRun` only, returning the server's real failure shape | DEC-006: client readiness blocks every cause the client can see | proves the presentation, not server validation (server tests own that) |
| Backends for UC-009/UC-010 | probe fixture GraphQL/WS (existing harness pattern) | fixture-page probes by design | as designed |
| Runtime backends in UC-002/UC-003 | scripted doubles (existing pattern) | suites test status/lifecycle overlay, not runtimes | as designed |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | VAL-000..VAL-013 | all in-scope suites pass twice in a clean env; all probes pass; no production change |
| Out Of Scope | — | full `run-settings-live` (paid inference); SCN-007 unsupported |

Non-blocking observations:
- **OBS-1** (AC-001, upstream file): the nested-drop reason is an inline comment (`team-run-config-graphql.e2e.test.ts:107`) plus upstream commit `e6ba249a96`, not a file header. Acceptable for verify-only.
- **OBS-2** (UC-005): dropping MP_002 also removed the only e2e for a second, incremental cross-process `startMemorySync`. It was incidental to the nested relocation case, and the Scope Guardrail excludes new coverage. It could be added under the CI ticket (7ea7804f) or a separate memory-sync follow-up.
- **OBS-3** (UC-009): the evidence lists 5 `requestfailed` `net::ERR_ABORTED` events, which are not browser errors: 2 to the probe's deliberately unreachable backend `127.0.0.1:9` (the same 2 appear in the implementation run), and 3 to external icon CDNs (iconify/simplesvg). The probe gates on `pageerror` and `console:error`, with 0 of each.

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Server e2e runtime roots and DBs | suites | each suite's own teardown | done (suites passed teardown) |
| Temp HOMEs `/tmp/api-e2e-home-*` | API/E2E | empty dirs under `/tmp`; no data written by tests outside their roots | left (empty, harmless) |
| Probe Nuxt/Chrome/WS/backends | probes | probe cleanup | receipts complete for all three |
| R03 temp root `/var/folders/…/run-settings-live-ahplhD` | probe | removed | receipt `removed` |
| Temporary cascade test file | API/E2E | deleted | `git status` clean |
| `~/.autobyteus` | user | not touched | mtime unchanged before/after R03 |
| Other worktree's Nuxt dev (port 3291) | not ours | left alone | — |

## Preliminary Classification

N/A (Pass)

## Latest Authoritative Result

- Result: **Pass**
- Final validation confidence: 95.4%
- Default 95% target met: `Yes`
- Any final applicable category below 90%: `No`
- Broader validation decision: `Not Required` (the probes already cover the browser surface)
- Critical ACs lacking direct proof: None
- Behavior only the user can check: None
- Next recipient: from `get_handoff_rules` (Delivery on the direct route)
- Test-review decision: `Not Required — direct low-risk route`
