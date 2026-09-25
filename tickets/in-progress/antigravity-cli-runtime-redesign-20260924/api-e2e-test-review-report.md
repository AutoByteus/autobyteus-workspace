# API/E2E Test Review Report — AGY runtime

## Review meta

- **CRR-014 — Pass.** Proportional review of API-REV-007 **Pass / 95%** at test/evidence commit `32fd63dd6`, after IR-008 source `40641dfca` and CRR-013 source Pass. Task remains **Large / High**. Only the two changed durable tests were reviewed; `code-review-report.md` CRR-013 and its source scorecard remain authoritative and unchanged. No delivery acceptance.
- Context reviewed: approved SR-016/SR-021 requirements and SR-023 technical correction; `investigation-notes.md` §SR-023, solution revision record, DS-005, ARCH-REV-004, IR-008, CRR-013, current API coverage investigation/execution report/revision record/ledger, final browser evidence and selected Team lifecycle logs. DR-001 remains an explicit user-verification hold.
- Independent scenario basis: **Yes.** The supported user action is launching the exposed 1-root/3-Team/14-Agent AGY Org through the browser, with the backend operational health poll concurrent with provider discovery; the approved error path must report an addressed safe reason and reset the launch control. The Team test separately covers real member relay followed by **quiescent** stop/restore/continue. These come from approved SCN-002/REQ-001/AC-001, DS-005, and the observed user Org journey, not merely from test construction.
- Reviewer method: inspected changed test diff, final `evidence.json`, API report and both failing/quiescent Team logs. No repeat of the successful real AGY/Chrome workflow by this reviewer.

## Changed durable test scope

| Durable test path | Change | Scenario / coherent responsibility |
| --- | --- | --- |
| `autobyteus-web/tests/e2e/agy-large-org-launch-health-probe.mjs` | Added | One opt-in full browser/current built-backend Org launch: real AGY catalog with controlled delay, concurrent health, active persisted 18-placement tree, backend OS restart, and timeout/nonzero/missing-slug rendered alert distinctions. |
| `autobyteus-server-ts/tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts` | Updated | Real Team scoped delivery/attribution and stop/restore/continue after relay completion; quiescent-stop fixture and conditional failure diagnostics. |

No durable test was removed; logs, screenshots and JSON are execution artifacts, not test code under review. No production source changed in API-REV-007.

## Proportional test-code checks

| Check | Result | Evidence / note |
| --- | --- | --- |
| Scenario grouping and names | Pass | New probe is one forward large-Org lifecycle with explicit positive, error and persistence stages. Team edit remains within existing Team restore case. |
| Requirement-relevant assertions | Pass | Browser actually clicks Run; asserts active route plus 1/3/14 persisted structure, unique addresses/member IDs and one delayed `models` call. Health is measured while the slow/timeout child is pending. Timeout, failed discovery and valid missing slug have distinct addressed visible alerts and launch-button reset. Restart compares the full persisted tree. Team test waits no open work before public stop/restore. |
| Fixture/setup/helper reuse | Pass | Shared `openConfig`, `failCase`, HTTP/health and owned-process helpers avoid repeating meaningful stages. External wrapper delegates positive discovery to real AGY and controls only latency/failure outcomes. |
| Isolation and determinism | Pass, bounded | Explicit opt-in; temporary SQLite/app-data/workspace, dynamic ports, owned backend A/B/Nuxt/Chrome and cleanup. Unique fixture names. Timeouts and health bounds are finite; no user Org or packaged app modified. |
| File coherence and navigability | Pass | The new script is dense/semicolon-compressed, but its 87 physical lines cover one coherent end-to-end journey; formatting is a readability watch item, not a finding or split mandate. |
| Stale/duplicated/disabled coverage | Pass | Existing smaller Team/Org coverage is complementary. The quiescence gate corrects premature in-flight termination rather than disabling the restore assertion. No test-only second GraphQL schema build or stubbed scoped delivery is offered as parity. |
| Coverage and evidence agreement | Pass | Final evidence records launch 6.058 s, one slow real AGY catalog call, health 2/2/1 ms, 18 exact placements, and identical tree after distinct backend PIDs 42407/43471. Timeout alert 16.344 s with health 1/3/3 ms; nonzero and valid-missing-slug alerts differ. Final Team+Org 2/2 and focused suites passed. The current Electron shell itself was not rebuilt and the report says so. |
| Independent supported scenario | Pass | User large-Org launch and operational health/error contract predate the test. The wrapper simulates an external dependency outcome within that established path; it does not invent a product workflow. |

## Team termination observation

The earlier Team stop failure was captured with `hasOpenExecutionWork=true` and `/ping` still running, despite a persisted token. That does not prove a defect in the supported **completed-turn stop/restore** journey, nor does it establish arbitrary mid-turn termination as an approved scenario. The updated test waits for a quiescent checkpoint and preserves pre/post diagnostics only if stop fails; final full 2/2 and targeted Team passes support the corrected test sequence. No production or test-origin finding is asserted for arbitrary mid-turn stop. Preserve the failing log and do not claim that behavior is validated.

## Findings and result

- **New actionable test-code findings:** None. Historical TR-001 remains resolved; no new UI assertion gap was identified in this SR-023 test scope.
- **Latest authoritative test-code result:** **Pass**. Source CRR-013 is not reopened; API Engineer's 95% execution confidence is not a reviewer score.
- **Recommended recipient:** `/delivery_engineer` with the cumulative passed package. Delivery's explicit user-verification hold, fresh Electron shell verification and release/finalization decisions remain its responsibility; this review grants no acceptance or cleanup authority.
