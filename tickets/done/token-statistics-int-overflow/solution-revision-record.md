# Solution Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | `api_e2e_engineer` / `api-e2e-coverage-investigation.md` / initial API/E2E investigation | AC-002 display conflict; missing task query and AppConfig setup recorded as downstream local-fix items | `Design Impact` / `Requirement Gap` | Requirements and design now include the required exact-decimal Task-table presentation correction; implementation is rerouted through source review before API/E2E resumes. |

## Revision Entries

### SR-001 — Resolve exact-display contract conflict

- Triggering role, report path, and round: `api_e2e_engineer`, `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-int-overflow/api-e2e-coverage-investigation.md`, initial coverage investigation.
- Triggering finding IDs: `AC-002` exact-display conflict; API-001 missing `tokenUsageTaskStatisticsInPeriod` coverage and native AppConfig setup remain downstream local-fix items.
- Why revision was required: The approved AC-002 requires exact decimal digits in the rendered report, but `TokenUsageTaskStatisticsTable.vue` used `formatCompactInteger`, producing `3.14B` for `3,136,827,911`. The prior design incorrectly preserved that formatter and could not truthfully pass the criterion.
- Resolution: Keep the GraphQLSafeInt transport correction and add a narrow frontend production change: primary Task-table input/output token cells use the existing full `formatInteger` formatter. Compact formatting remains allowed for secondary cache/thinking explanatory sublines. The controls, table structure, grouping, provider, persistence, loading, empty, and unrelated-error behavior remain unchanged.
- Approved behavior or requirement IDs affected: `BEH-001`, `REQ-002`, `AC-002`, `AC-005`.
- Canonical artifacts and sections updated: `requirements-doc.md` — Investigation Findings, Recommendations, Out of Scope, REQ-002, AC-002; `investigation-notes.md` — Investigation Status; `design-spec.md` — current state, intended change, behavior map, ownership, file mapping, sequence, risks, readiness; `graphql-token-count-contract.md` — display consequence and coverage scope.
- Supplemental artifacts updated, added, or removed: No new supplement; the existing GraphQL token-count contract remains relevant and is aligned with the exact-display correction.
- Implementation impact: Modify `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` to use `formatInteger` for the primary gross input/output cells, add/adjust durable table/store assertions, and retain the existing backend SafeInt work. The overflow E2E fixture must also cover `tokenUsageTaskStatisticsInPeriod`; native AppConfig initialization is owned by `api_e2e_engineer` after source review.
- Implementation-readiness checks repeated and result: Pass. Both approved use cases are represented in the behavior map; DS-001/DS-002 now include API, store, and exact primary-cell rendering; ownership remains with the existing GraphQL type, frontend table, and test owners; no migration, compatibility path, new coordinator, or unsupported use case was introduced.
- Remaining gaps or risks: API/E2E must execute the corrected task query, store/table tests, and native AppConfig setup; packaged Electron rollout remains a downstream delivery concern. SafeInt values above `Number.MAX_SAFE_INTEGER` remain out of scope.
