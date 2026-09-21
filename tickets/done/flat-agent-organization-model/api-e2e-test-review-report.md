# API/E2E Test Review Report — CRR-092

## Review Meta

**Pass — proportional review of three carried API-owned durable test changes.** Current cumulative execution package is **successful with user-accepted known issues**, by the user's direct decision recorded in CRR091/user-acceptance.json; no return to API/E2E or rerun is required for that acceptance. This is a separate review after CRR091 closed the failure disposition, not a combination of an active failure-origin investigation and test-code review.

- Ticket AORG-FLAT-TEAM-001; round92; 2026-09-13. Authority RER033, AD028 with valid AD027/cumulative supplements, ARCH025Pass, AAV003; IR001–059. Large/High/Confirmed/Reviewed; focusedMedium/High unchanged.
- Source6e2d7997444383d5585225d9febbc1ee54247714; HEAD3155da09c33c0bb5aeea19d0b2243a8163cc9595. CRR090 is the last full source review, Pass95.1; CRR091 records later explicit exception acceptance. This proportional round does not change code-review-report.md or repeat its source scorecard.
- Context: requirements-doc.md, investigation-notes.md, requirements-revision-record.md; design-spec.md, design-review-report.md, architecture-design/review-revision records; implementation-handoff/revision; code-review-report/revision; API coverage investigation, execution report, ledger, revision and ownership/integrity/receipt evidence. All still-applicable supplements remain in the complete cumulative index.
- Relevant revisions: API001–038; current API38. Prior CRR067 Not Applicable and CRR059 test Pass remain historical, not current substitutes. No unresolved prior test-code finding identified. Current Delivery re-entry N/A; DR007/009 and IR049 constraints retained.
- **Execution truth:** API38 originally completed Fail85.6 with one unwaived finding, two already accepted deviations, zero planned journeys remaining and cleanupPass. The later user explicitly accepts the remaining issue and directs Reviewer to mark success here. Its raw report/ledger/receipts are unchanged. This is **user-accepted completion, not a clean API38 test Pass**. Original confidence85.6 is not recalculated or increased.
- Supported scenario basis confirmed: **Yes.** Stored current Agent/Team history without activation, complete admitted root packages, and editing existing-run model configuration while canonical state loads are established product contracts (DS035/041–046 and cumulative existing-run model-selection authority), independent of the test fixtures.

## Changed Durable Test Scope

API38 adds no new durable delta, but three previously unreviewed API-owned changes remain carried and require review: **No durable test file changed: No (cumulative pending scope)**. Not Applicable would be incorrect.

| Durable path | Change | Coherent responsibility and evidence |
| --- | --- | --- |
| autobyteus-server-ts/tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts | Updated +34 | Initializes actual owned Agent/Team managers and activation registry for schema-backed read-only projection tests; unsupported activation dependencies throw instead of fabricating history. Existing nine native/Team/active/archive/page/identity assertions remain. Owned process instances are identity-released; isolated temp data/workspace and schema-service cleanup remain. |
| autobyteus-server-ts/tests/unit/agent-memory/team-memory-explorer-service.test.ts | Updated +16/−1 | Completes current package fixture with task/message records, rebuilds readiness and asserts exact admitted roots/no diagnostics before testing grouping/filtering. Exercises the established current-package contract rather than bypassing readiness; resets readiness/catalog state and temp memory per test. Two behavior assertions retained. |
| autobyteus-web/tests/e2e/existing-run-model-config-probe.mjs | Updated +13/−2 | Replaces fixed700ms waits with two explicit canonical-read barriers. Real editor must expose loading/disabledSave before response release. Barriers also release in per-case finally; later reads use resolved promises. A–F settings assertions, independent failure persistence and owned resource cleanup remain. |

Exact hashes: 63dcedbdf550619e41156e1b0923c7b8128ef24986460da0bcdba0f5c524f911; 617332f6b5d7770e8e23a609e95c2ade9bd2bfb6226a575b913647dcf3d5f3d2; a25f958cfdee1c1f58120a2d7fc595d04378f8421268c1c8a22a2fa5cfaabef2, in table order. All remain unstaged and unchanged. Temporary API helpers/evidence are not durable test code under review.

## Proportional Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Scenario organization/names | Pass | Existing named projection/memory cases and A–F model-setting journeys retained; changes scoped to their setup/timing. |
| Requirement-focused assertions | Pass | Exact stored subjects, archive nonreads, active paging, complete admission and loading/disabledSave are observable contracts; no assertion relaxed to hide a failure. |
| Shared fixtures/helpers | Pass | Existing stores, schemas, builders and runScenario helper reused. One throwing boundary factory and one promise per fixture subject avoid repeated setup. |
| Isolation/determinism | Pass | Unique temp roots and actual process-instance identity release; readiness resets; response barriers release on failure and success. No provider activation/live user process borrowed. |
| Large-file coherence | Pass | Each file retains one test surface. Source line/delta thresholds do not apply. |
| Stale/disabled/compatibility coverage | Pass within changed scope | No skip/only/removed behavioral assertions or compatibility-only branch introduced; obsolete fixed-delay dependency removed. |
| Evidence agrees with changes | Pass | API38 server-cumulative log shows nine projection and two memory tests passed; registered-model-probe command/log passed. The source/durable hashes match. |
| Independent supported scenario basis | Pass | Normal stored-history and existing-settings workflows justify tests; Proxy/barriers confirm the path but do not establish product validity themselves. |

## Findings And Evidence Limits

**No actionable test-code finding.** No new source/test changes, size audit, build, test run, browser session, provider interaction or API/E2E rerun by Reviewer. Existing receipts are sufficient to judge these bounded setup/assertion changes; all original warnings/nonzero results remain in API evidence. Their passing assertions do not prove API-FIND040 fixed.

The accepted issues remain: native standalone desktop first-Send text Open404 (reopen final200/exact bytes, no loss, origin unassigned); eager pre-message Team Idle/green; one mounted publication's prior-Team navigation. Separate-link opening is accepted existing behavior. No new ticket has been created; CRR091/deferred-issues.md is the follow-up candidate list for Delivery/Requirements.

API38 scope: 34 main commands436disjointfiles2708tests, 38Pass/3observedFail/1N/A groups,320receipts37originalnonzero, all planned journeys and cleanup complete. User acceptance does not turn observed Fail groups into passing observations or expand exclusions. Preserve all current/historical API limits, native images excluded, unknown ingestion scope, no native-shell/AppImage acceptance, original missing API35/33 evidence, AAV002/003, DR007/009 and IR049 BEFORECUTOVER ownership, PAX/mtime120/78/295 and cumulative references.

## Latest Authoritative Result

- **Proportional test-code result: Pass.** Three updated paths reviewed; no unresolved test-code finding; not Not Applicable.
- Complete user-accepted execution package is ready for **Delivery-owned documentation sync, integration/finalization and applicable remaining gates**. No API/E2E return, new implementation fix or rerun requested.
- Recommended recipient: fresh most-specific successful proportional-review rule → `/software_engineering_team/delivery_engineer`.
- Delivery must carry explicit acceptance/deferred issues and original failure evidence without claiming fixes or a clean raw API Pass; preserve later verification/release/cutover boundaries. This review is not release/deployment/native-shell authorization.
