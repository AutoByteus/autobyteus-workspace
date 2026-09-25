# API/E2E Test Review Report — AGY runtime

## Review meta

- **CRR-015 — Pass.** Proportional review of API-REV-008 **Pass / 96%** on integrated merge/source base `678bece5f` (`origin/personal@3e5d6add5`) and test/evidence commit `533457040`. Task remains **Large / High**. Only three changed durable test files are in scope; IR-008/CRR-013 production-source report and scorecard remain authoritative and unchanged. No Electron-package, user-verification, release or delivery acceptance.
- Context: approved SR-016/SR-021 requirements and SR-023 technical correction, DS-005/ARCH-REV-004, IR-008, CRR-013, prior CRR-014/API-REV-007, Delivery DR-004 zero-test collection evidence, API-REV-008 investigation/report/revision/ledger, two current-base evidence directories and selected logs. Delivery's explicit verification hold continues.
- Independent scenario basis: **Yes.** Exposed user Org Run supports full 18-placement AGY launch and safe addressed failure while the backend's operational health endpoint remains responsive; existing Team/Org conversation surfaces support scoped delivery and quiescent restore; the user expressly requested fresh-backend same-member browser continuation. The tests exercise these approved/observed paths, rather than establishing their validity themselves.
- Review method: inspected the exact `678bece5f..533457040` test diff, helper/server boundary, current API report and final evidence/logs. Did not rerun successful live E2E or reopen production code.

## Changed durable test scope

| Durable path | Change | Coherent responsibility |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts` | Updated | Remove deleted latest-base endpoint-module import and unused environment save/restore; retain real Team/Org GraphQL/WebSocket scoped delivery, exact attribution and quiescent restore assertions. |
| `autobyteus-web/tests/e2e/agy-large-org-launch-health-probe.mjs` | Updated | Parameterize evidence output directory and record current repository HEAD; retain real full-Org/health/safe-error/browser/restart assertions. |
| `autobyteus-web/tests/e2e/agy-process-restart-focus-continuation-probe.mjs` | Updated | Parameterize evidence output directory and record current repository HEAD; retain old-before and old+new-after visible-feed assertions for exact Team/direct+nested Org members. |

No durable test removed. Evidence JSON, screenshots and logs are execution artifacts, not test code under review. No production source edit or compatibility shim was made by API/E2E.

## Proportional checks

| Check | Result | Evidence / note |
| --- | --- | --- |
| Scenario grouping and names | Pass | Existing three coherent journeys remain separate; this round changes only fixture collection/provenance/output isolation. |
| Requirement-relevant assertions | Pass | No assertion removed. Exact Delivery command now collects and passes real Team/Org 2/2; full browser Org retains 1/3/14 tree, responsive health, safe distinct alerts/reset and persisted tree; restart browser retains exact-member visible old/new replies and public projections. |
| Fixture/setup/helper reuse | Pass | Removed import refers to a deleted module; `startStudioE2eRuntimeServer()` supplies `mainUrl` for public HTTP/WS clients, and no source path uses the removed env constant. Existing setup/cleanup remains. |
| Isolation and determinism | Pass | Opt-in live tests use owned temporary data/processes. `AGY_E2E_OUTPUT_DIR` prevents overwriting earlier round evidence; current-base HEAD is recorded in each browser evidence file. The API report separately identifies final test/evidence commit, avoiding a claim that HEAD alone captures uncommitted test edits at run time. |
| File coherence/navigability | Pass | Small bounded deltas; the prior one-journey script organization remains. Existing dense formatting is not a new actionable regression. |
| Stale/duplicate/disabled coverage | Pass | Deleted endpoint import and dead env cleanup are removed, not replaced with a production shim. No test skipped or muted to make the run pass. |
| Coverage/evidence agreement | Pass | Current exact opt-in Team/Org command 2/2; full Org browser active in 5.316 s with one delayed real AGY model call and health 1/1/1 ms; safe timeout/failure/missing-slug alerts; separate backend restart browser shows old-before/old-after/new-after=2/2/2 for all three selected members. Current 77/77 server/API/admission and 39/39 web focused suites pass. Reports clearly say old Electron DMG and provider-real LMStudio were not freshly validated. |
| Independent supported scenario | Pass | DR-004's zero-test collection is a test-fixture issue. The product journeys are approved/exposed; current-base test reruns witness them. Arbitrary mid-turn Team termination is not inferred from quiescent restore. |

## Findings, residual and result

- **New actionable test-code findings:** None. Historical TR-001 remains resolved; CRR-013 source scorecard is not reopened.
- **DR-004 collection blocker:** Resolved at the test boundary. The obsolete import prevented collection, so it was not an AGY runtime failure; exact command now collects/passes 2/2 without weakened assertions.
- **Bounded residual:** The prior in-flight Team stop failure is not attributed or accepted as supported arbitrary mid-turn termination. Current test covers the coherent quiescent stop/restore path. Current Electron shell package is stale; Delivery must rebuild and obtain explicit user verification before finalization. No fresh real LMStudio provider claim.
- **Latest authoritative test-code result:** **Pass**. API Engineer's 96% execution confidence is its assessment, not a reviewer score.
- **Recommended recipient:** `/delivery_engineer` with the cumulative passed package for DR-004 recovery and delivery-owned gates. This review does not authorize release, merge, cleanup or user acceptance.
