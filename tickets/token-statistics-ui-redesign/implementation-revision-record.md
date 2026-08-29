# Implementation Revision Record

The current code and `implementation-handoff.md` are authoritative. This record locates the initial implementation baseline and later implementation deltas, if any.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Requirements Engineer; approved package `REQPKG-TSUI-001` / `RER-010`; initial round | `N/A` | `Initial Baseline` | `AD-REV: N/A`; `ARCH-REV: N/A`; `CRR: N/A`; `API-REV: N/A`; `DR: N/A` | `Implementation Ready — Direct API/E2E` |
| IR-002 | Code Reviewer; `CRR-001` / `API-REV-001`; focused rework | `F-001`; `APIE2E-F001` / `TS-E2E-002` | `Local Fix` | `AD-REV: N/A`; `ARCH-REV: N/A`; `CRR-001`; `API-REV-001`; `DR: N/A` | `Implementation Ready — Focused Source Review` |

## Revision Entries

### IR-001 — Focused Token Statistics production implementation

- Triggering role, report path, and round: Requirements Engineer; `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/requirements-doc.md`; approved initial implementation round at `RER-010` / commit `7e39057ca048ad27ce8b21be3fb4576d3c4bb673`.
- Triggering finding IDs: `N/A`
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: `Implementation Ready — Direct API/E2E`
- Related architecture design revision IDs: `N/A`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: Records the first complete production implementation of the user-approved focused Token Statistics package and its implementation-scoped validation/classification basis.
- Approved behavior or requirement IDs affected: `BEH-001`–`BEH-006`; `REQ-001`–`REQ-016`; `AC-001`–`AC-016`.
- Implementation delta: Replaced Analytics presentation with the approved compact controls, six-peer summary, open-top daily point line, and visible grouped exact Detailed usage; removed every visible prior/ratio/driver/pace/export path and CSV preparation/download utility; lightly unified Run details without changing its truth semantics or store/query; localized and regression-tested the retained experience.
- Changed files or areas: Production implementation commit `603aa510ef2333c7c271a2c9149b48e63c93e6b9`; `autobyteus-web/components/settings/token-usage/**`, Token Statistics component specs, `autobyteus-web/utils/tokenUsageAnalyticsPresentation.ts`, removed `tokenUsageAnalyticsCsv.ts`, and English/Simplified Chinese Token Usage messages.
- Local validation and result: PASS — 8 focused files/25 tests; 3 store/Settings files/28 tests; web/localization guards; literal audit; Nuxt production build; deterministic Chromium render/interaction inspection at 1440 and 390 including English/Chinese. Repository typecheck remains BASELINE FAIL with 313 unrelated existing diagnostics and none in changed production paths.
- Next recipient or routing: `/software_engineering_team/api_e2e_engineer` under the matching `Medium` + `Low` direct API/E2E handoff rule.
- Remaining limitations or risks: Real GraphQL/browser-equivalent/Electron execution and negative file/download observation remain downstream; deterministic fixture render is not production-data proof; repository-wide baseline typecheck debt and existing build warnings remain.

### IR-002 — Reconcile legitimate partial-cost daily gaps

- Triggering role, report path, and round: Code Reviewer; `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/code-review-report.md`; `CRR-001` focused API/E2E failure-origin review, round 1, triggered by `API-REV-001`.
- Triggering finding IDs: `F-001`; `APIE2E-F001` / `TS-E2E-002`
- Classification: `Local Fix`
- Prior authoritative result: `Fail — Local Fix`
- Current authoritative result: `Implementation Ready — Focused Source Review`
- Related architecture design revision IDs: `N/A`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: CRR-001 proved that the existing analytics policy correctly derived `PARTIAL` for known-priced plus fully unpriced usage, then contradicted that result by rejecting the legitimate usage-bearing null daily bucket before GraphQL returned. This records the bounded implementation-owned correction.
- Approved behavior or requirement IDs affected: `BEH-002`, `BEH-004`, `BEH-006`; `REQ-005`, `REQ-010`, `REQ-012`; `AC-004`, `AC-009`, `AC-011`, `AC-016`.
- Implementation delta: The reconciliation guard now permits a usage-bearing null-cost bucket only when its derived cost quality is explicitly `MISSING`; it retains that bucket as null instead of inventing zero, sums only known non-null bucket costs, and reconciles them to the range's known partial estimate. Strict range, order, SafeInt token, inconsistent-null-quality, and known-cost-sum checks remain. The stale unit expectation was replaced, an inconsistent-quality negative remains, and an in-process GraphQL regression now covers one priced day, one fully unpriced usage-bearing day, and one empty day through the current observation/projection/schema path.
- Changed files or areas: Local-fix commit `49ddfb2276b292f8fee80022f81157ebeeddb478`; `autobyteus-server-ts/src/token-usage/services/token-usage-analytics-aggregation-policy.ts`; its focused unit test; `tests/e2e/token-usage/token-usage-analytics-graphql.e2e.test.ts`.
- Local validation and result: PASS — focused policy test 1 file/5 tests; focused GraphQL test 1 file/4 tests; combined policy + analytics GraphQL + preserved ledger GraphQL 3 files/13 tests; production server build/bootstrap smoke. Server package `typecheck` remains a baseline configuration failure because `tsconfig.json` includes `tests` outside `rootDir: src`; the production TypeScript build passes.
- Next recipient or routing: `/software_engineering_team/code_reviewer` for the focused source-review return required by `CRR-001` before API/E2E reruns.
- Remaining limitations or risks: The durable real server/Nuxt/Chromium probe remains red in retained `API-REV-001` evidence until rebuilt and rerun downstream. Source review must confirm the narrowed null-quality gate; API/E2E must begin with `APIE2E-F001` / `TS-E2E-002` and then recheck the broader workflow.
