# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/requirements-doc.md`
- Investigation Notes Reviewed As Context: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/investigation-notes.md`
- Requirements Revision Record Reviewed As Context: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/requirements-revision-record.md`
- Design Spec Reviewed As Context: `N/A — not applicable for the current direct-route failure-origin review`
- Supplemental Task Artifacts Reviewed As Context: `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/REQPKG-TSUI-001/ui-ux-spec.md`, `ui-behavior-test-matrix.md`, and `prototype-assumptions.md`; relevant preserved-contract context in `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/done/token-statistics-analytics/{requirements.md,design-spec.md,code-review-revision-record.md}`
- Architecture Design Revision Record Reviewed As Context: `N/A — not applicable`
- Relevant Architecture Design Revision IDs: `N/A`
- Design Review Report Reviewed As Context: `N/A — not applicable`
- Architecture Review Revision Record Reviewed As Context: `N/A — not applicable`
- Relevant Architecture Review Revision IDs: `N/A`
- Implementation Handoff Reviewed As Context: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Trigger: failed live API/browser validation requiring focused origin and owner confirmation
- Prior Review Round Reviewed: `N/A — no prior review result for this package`
- Latest Authoritative Round: `1`
- Coverage Investigation Reviewed (failure-origin entry point): `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed (failure-origin entry point): `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed (failure-origin entry point): `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: `API-REV-001`
- Delivery Revision Record Reviewed (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- Failing Scenario IDs: `APIE2E-F001`; `TS-E2E-002`
- Exact Failing Commands / Execution Mode: `pnpm -C autobyteus-web test:e2e:token-statistics-ui -- --skip-server-build --output-dir /home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/evidence/api-e2e`; built server + current Prisma migrations + isolated SQLite + real Nuxt proxy + Chromium 149
- Failure Evidence Paths: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/token-statistics-ui-redesign/evidence/api-e2e/token-statistics-browser-result.json`; `backend.log`; `browser-probe-command-final.log`; `server-token-usage-graphql-rerun.log`

## Routing Classification Review

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architectural risk (`Low`/`High`): `Low`
- Selected route (`Implementation Review`/`API/E2E Failure-Origin Review`): `API/E2E Failure-Origin Review`
- Independent source review required by the classification: `Failure-origin exception`
- Classification evidence or correction required: The failure is a bounded contradiction inside the existing server analytics aggregation policy and its regression test. It requires no schema, GraphQL shape, new subsystem, or architecture decision. The carried classification remains correct.

## Review Scope

- Changed implementation and behavior reviewed: Only the failed partial-pricing query path, its production reachability, the inherited server reconciliation policy, the smallest relevant regression, and the API/E2E fixture/evidence.
- Files / areas reviewed: current requirements and UI truth-state contract; implementation/API-E2E handoffs; `TokenUsageAnalyticsView.vue`; `TokenUsageAnalyticsControls.vue`; `stores/tokenUsageAnalytics.ts`; server token-usage observation/pricing/projection/provider/aggregation paths; aggregation-policy unit test; GraphQL analytics coverage; durable API/E2E seed/probe and failure logs.
- Explicit exclusions: No full audit or scorecard of IR-001's frontend presentation source; no proportional review of the failed API/E2E test suite; passing TS-E2E-001/003/004/005 evidence was not reopened.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. `BEH-004`, `REQ-005`, `REQ-010`, and `REQ-012` require preserved partial/missing pricing truth; `AC-004` requires unavailable monetary buckets to be explained rather than plotted as zero; `AC-009` and `AC-011` require the current price-quality/result contract; `AC-016` remains blocked because the failed result cannot expose its authoritative cache state.
- Design-spec behavior map verified against the implementation: `N/A` for the current direct route. The relevant existing contract is independently confirmed by current server code/docs and the preserved prior analytics requirement/design records.
- Design review report and round confirmed: `N/A — not applicable`
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: None. The failure exposes a defect in an existing supported partial-pricing path; it does not add a new behavior.
- Remaining material ambiguity, if any: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence |
| --- | --- | --- | --- |
| `BEH-002` | Confirmed | Opening Analytics or applying Runtime/Provider/Model filters calls `store.fetch()`, sends the existing `tokenUsageAnalytics` query, and expects one coherent result. `TokenUsageAnalyticsView.vue:72`, `TokenUsageAnalyticsControls.vue:242-247`, and `stores/tokenUsageAnalytics.ts:68-98` confirm the exposed product path. | None. |
| `BEH-004` | Confirmed | Supported `TOKEN_USAGE_UPDATED` events are cost-enriched; absent trusted pricing produces `price_missing` with null component/total costs; a `CHANGED` fold writes the authoritative payload to its UTC daily facet; the provider groups selected facets into buckets and derives `MISSING`/`PARTIAL` cost quality. See `token-cost-calculator.ts:108-125`, `token-usage-run-accumulator.ts:30-45`, and `token-usage-analytics-aggregation-policy.ts:34-40,67-75`. | The same policy's lines 104-110 then reject every usage-bearing null-cost bucket whenever another selected bucket gives the range a known partial sum, preventing the supported result. |
| `BEH-006` | Confirmed | The established analytics contract preserves known estimates plus missing-price evidence; it does not coerce unpriced usage to zero. Current source classifies `[complete, missing]` as `PARTIAL`, and the approved UI/UX states that partial/missing cost is marked and the unsafe bucket is not plotted. | None; the throw is the contradiction, not evidence of a different supported behavior. |

## Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

`None — no current-route design review exists.`

### `MP-001` — a normal Analytics selection can contain priced and fully unpriced usage-bearing daily buckets

- Origin: `New`
- Related approved requirement or established contract: `BEH-002`, `BEH-004`, `BEH-006`; `REQ-005`, `REQ-010`, `REQ-012`; `AC-004`, `AC-009`, `AC-011`, `AC-016`; server `TOKEN_USAGE_UPDATED` and nullable estimated-cost contract
- Relevant behavior ID(s): `BEH-002`, `BEH-004`, `BEH-006`
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: A token-usage viewer opens **Settings > Token Statistics > Analytics**, or opens **Filters**, chooses a returned Runtime/Provider/Model option, and activates **Apply** for a UTC range containing recorded usage.
- Support evidence: `TokenUsageAnalyticsView.vue:72` issues the default query; `TokenUsageAnalyticsControls.vue:242-247` exposes Apply; `stores/tokenUsageAnalytics.ts:68-98` sends the existing GraphQL input. Production token observations explicitly support both trusted estimates and `price_missing`; `autobyteus-server-ts/docs/modules/token_usage.md` documents the observation pipeline and statuses, and `TokenCostCalculator` produces null cost plus `price_missing` when pricing is not trusted.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Supported model/runtime usage emits `TOKEN_USAGE_UPDATED` -> cost policy yields `estimated` or `price_missing` -> `TokenUsageRunAccumulator` admits `CHANGED` contributions -> `TokenUsageAnalyticsProjectionWriter` persists UTC daily facets -> user opens/applies Analytics -> Pinia/Apollo -> GraphQL resolver -> `TokenUsageAnalyticsProvider.getAnalytics` -> snapshot facets -> selected aggregate plus daily buckets -> `assertTokenUsageAnalyticsBucketReconciliation`.
- Lifecycle preconditions and material consequence at the claimed point: The selected range contains at least one usage-bearing bucket with a known estimate and at least one usage-bearing bucket with missing pricing. The range aggregate therefore contains the known partial sum and is correctly classified `PARTIAL`; the missing daily bucket is correctly `MISSING`/null. The blanket null rejection aborts the complete GraphQL result, so the UI can render only an error instead of the required partial warning, monetary gap, exact missing-price evidence, and authoritative cache state.
- Reachability: `Reachable`
- Review consequence / proportionate response: The source defect can drive F-001. A bounded server policy/test correction is proportionate; no requirement, schema, query shape, or architecture change is needed.

## Findings

### F-001 — The reconciliation guard rejects the contract's own valid `PARTIAL` result

- Status: `Open`
- Severity: `High` for the selected acceptance path; bounded implementation scope
- Affected approved behavior: `BEH-002`, `BEH-004`, `BEH-006`; `REQ-005`, `REQ-010`, `REQ-012`; `AC-004`, `AC-009`, `AC-011`, `AC-016`
- Reachability basis: `MP-001`
- Source evidence: `tokenUsageAnalyticsCostQuality` intentionally returns `PARTIAL` when any known estimate coexists with incomplete pricing (`token-usage-analytics-aggregation-policy.ts:34-40`). Yet `assertTokenUsageAnalyticsBucketReconciliation` throws if any usage-bearing bucket has null cost once the selected aggregate has a non-null known partial sum (`:104-110`). The same unit file first proves `[complete, missing]` is `PARTIAL` (`:63-70`) and then protects the contradictory throw for that state (`:120-145`). The provider calls the guard before returning the result (`token-usage-analytics-provider.ts:37-54`).
- Runtime evidence: API-REV-001's real server/proxy/browser response records `TOKEN_USAGE_ANALYTICS_SELECTED_COST_RECONCILIATION_FAILED`; `token-statistics-browser-result.json` shows the expected gap fields remained null because no result reached the UI. Focused current unit execution passed 1 file/4 tests, confirming the stale throw is deliberately encoded rather than an intermittent environment failure.
- Failure-origin attribution: `Inherited backend implementation defect and earlier source-review gap.` IR-001 did not change server code, GraphQL, or persistence, so this is not caused by the current frontend diff and was not reasonably detectable from that diff alone. However, the original analytics correction/re-review accepted a companion assertion that “usage-bearing null cost” must throw despite the already approved/current `PARTIAL` contract. That contradiction should have been caught when the policy/test were reviewed.
- Required action: Correct the bounded server reconciliation policy so a legitimately incomplete usage-bearing bucket remains null and the known non-null bucket costs reconcile to the range's known partial estimate without inventing zero. Preserve strict token/range/order checks and explicit missing-price evidence. Replace the stale unit expectation and add a server GraphQL regression for a selection with priced and fully unpriced usage-bearing days; then return through source review and rerun API/E2E, beginning with `APIE2E-F001` / `TS-E2E-002`.

## Classification

`Fail — Local Fix`.

This is implementation-owned source and regression coverage. It does not require a product decision or contract redesign: the current GraphQL result already represents `PARTIAL`/`MISSING`, and the approved behavior is unambiguous.

## Recommended Recipient

`/implementation_engineer`

After the bounded correction, source review and API/E2E are both required again.

## Residual Risks

- The current server GraphQL suite passes because it covers mixed currency, missing-only, and sparse empty buckets but not a single selected result containing both a priced usage day and a fully unpriced usage day.
- The API/E2E fixture writes current-schema facets directly. That is adequate to reproduce the read-policy defect, while `MP-001` independently confirms normal production write reachability; the fixture is not being used as its own reachability proof.
- All other API-REV-001 passing scenarios remain valid but do not override this critical failure.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `API/E2E Failure-Origin Review`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass — MP-001 is independently reachable`
- Score Summary: `N/A — failure-origin-only round; no full scorecard repeated`
- Failure Origin (when applicable): `Inherited backend analytics aggregation-policy defect; earlier original analytics source-review gap; not caused by IR-001 frontend changes, test fixture, environment, or execution`
- Recommended Recipient (when applicable): `/implementation_engineer`
- Notes: `Local Fix`; preserve `Medium` / `Low`; require source review plus API/E2E again.
