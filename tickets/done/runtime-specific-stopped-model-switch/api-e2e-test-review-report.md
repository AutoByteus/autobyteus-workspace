# API/E2E Test Review Report — Runtime-specific stopped-run model switching

## Review Meta

- **Current review: CRR-009, proportional durable-test review, Pass.** Trigger: API-REV-004 **Pass / 94.3%** after IR-005/CRR-008; API-REV-003 F-API-003 and API-REV-002 F-API-002 were retired by fresh real Chromium in API-REV-004/003 respectively. API-REV-001 and CRR-003's old ID-only test review are historical.
- Current authority/context read: SR-006-approved `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`; SR-009 `design-spec.md`, model-picker investigation, architecture design/revision/recovery supplements, ARCH-REV-003 design review/revision; IR-005 implementation handoff/revision; CRR-008 source report and cumulative code-review record; API-REV-004 coverage investigation, case ledger, execution report/revision, and relevant focused/built-browser logs. Delivery revision: N/A for this current review. No unresolved prior test-review finding.
- Scope: only the **two API/E2E-owned durable test diffs made in API-REV-002 and carried unchanged through API-REV-004**. No API/E2E-owned durable edit was made in API-REV-003/004, none removed. IR-005's adjacent `ApplicationLaunchSetupPanel.spec.ts` is implementation-owned context already covered by CRR-008, not re-reviewed here. Temporary `probes/`, screenshots, logs and generated assets are execution evidence, not durable test code under review.
- Supported scenario basis: **Yes.** SR-009 DS-01–03 and REQ-002/004/008, AC-001/008/010–011 independently establish stopped Agent/Team/Org current-versus-new-offer descriptors; ARCH-REV-003 MP-001/002 establish preserved exact-current launch consumers. The test fixtures/assertions confirm these established paths rather than creating product entitlement. No source scorecard, source-size thresholds, or API/E2E confidence reassessment in this entry point.

## Changed Durable Test Scope

| Durable test path | Change | Requirement/scenario | Coherent responsibility |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/run-history/stopped-run-model-config-graphql.e2e.test.ts` | Updated | REQ-002/004/008, AC-001/008/010–011; DS-01–03 | Existing built-server stopped Agent/Team lifecycle/restart suite now introspects the approved self-contained `RunModelOptionsObject` current/replacement fields, `RunModelOptionObject` descriptor fields and exact-current descriptor type instead of obsolete ID-only schema. |
| `autobyteus-web/tests/e2e/existing-run-model-config-probe.mjs` | Updated | Stopped Agent/Team Settings and linked Team Save/reconciliation; SCN-001/002/005, DS-03/04 | Existing deterministic browser fixture now returns descriptor-shaped current/replacements from its catalog snapshot and checks current-only canonical display after replacement/retry without re-offering the selected target. |

No durable path added or removed; `Not Applicable` does not apply.

## Proportional Test-Code Checks

| Check | Result | Evidence / notes |
| --- | --- | --- |
| Scenario grouping and names | Pass | GraphQL assertions remain inside the stopped-config lifecycle suite; browser changes stay in named Agent replacement and Team retry/canonical verification scenarios. |
| Assertions prove approved contract | Pass | Introspection checks SR-009 public fields, not internal Claude implementation; browser checks descriptor consumption/current-only display and no duplicate retry Save. It does not claim real backend behavior from an intercepted fixture. |
| Fixture/helper reuse | Pass | `choice(id)` derives descriptor fields from the existing catalog snapshot; `options(current)` serves Agent/Team responses with one shape. No separate alias policy is encoded. |
| Isolation and determinism | Pass | Built GraphQL suite uses isolated restart; browser probe intercepts deterministic GraphQL and owns Nuxt/browser/cleanup. No local provider credential is needed for these durable checks. |
| Coherence/navigability | Pass | Both files retain one established E2E boundary each; no test-file size threshold or forced split applied. |
| No stale/duplicated/disabled/compatibility-only coverage | Pass | Obsolete ID-only introspection is replaced, not retained; no disabled test or versioned DTO fallback. Existing native browser lifecycle cases remain relevant and are not mistaken for Claude live proof. |
| Agreement with investigation/execution | Pass | API-REV-002 records exactly these two edits; API-REV-004 built GraphQL 3/3 and deterministic browser 6/6 logs pass on current code. No workflow rerun was needed for this review. |
| Independent supported-scenario basis | Pass | Approved stopped Settings/current-only contract and Team retry/Save path precede these assertions. Test-owned catalog rows do not establish the product scenario themselves. |

## Findings

None. The changed assertions, fixtures and organization are proportionate to the approved descriptor contract and deterministic browser boundary. No test-code correction is required.

## Latest Authoritative Result

- Result: **Pass** for the two API/E2E-owned changed durable paths above; unresolved findings: **none**.
- Recommended recipient: `/delivery_engineer` with the cumulative validated package, this separate test-review report and current `code-review-revision-record.md`.
- Notes: CRR-008 remains the separate authoritative implementation-source result; API-REV-004 remains the execution authority at **94.3%**, with its stated numeric smaller-window/provider and real-device/mobile Create Run residuals. This test-code review does not upgrade those claims.
