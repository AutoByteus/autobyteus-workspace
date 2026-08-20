# Requirements Doc

## Status (`Design-ready`)

## Goal / Problem Statement

Correct the right-side **Token** tab so an existing standalone agent run or focused team member always converges to the cumulative token-usage and API-price summary already stored by the server. A fresh frontend process, server restart, run reopen, or live token event received before the Token tab opens must not leave the tab showing only new-process in-memory deltas while durable lifetime data exists.

The investigation confirms this is not a database-persistence failure. The selected screenshot run has a populated `token_usage_run_records` row, and both the run and team-member GraphQL queries return its cumulative tokens, estimated costs, model, runtime, prompt/context, and report count. The defect is the frontend cache-readiness rule: any live-created summary is treated as if durable hydration is complete, so the appropriate GraphQL fetch is skipped.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | Each accepted token observation is folded into one cumulative SQLite record per canonical agent `run_id`; current-record GraphQL run, team, and member queries expose those persisted summaries. Direct probes return the screenshot run's non-zero totals and estimated USD costs. | Continue using the server's cumulative current record as the durable authority for reopened/focused Token-tab data. | Existing writer, schema, fold semantics, pricing policy, and GraphQL field meanings remain unchanged. | REQ-001, REQ-004; AC-001, AC-002, AC-009 |
| BEH-002 | For a standalone run, a live `TOKEN_USAGE_UPDATED` event creates `runSummaries[runId]`. The Token-tab hydrator then sees that a summary exists and skips `getAgentRunTokenUsageSummary`, even when the cached value contains only post-restart deltas. | A provisional live standalone summary must not satisfy durable-hydration readiness. Opening/focusing the run must converge to its persisted cumulative record. | Standalone run selection remains the primary-summary identity, and legitimate later live events continue to update the selected run. | REQ-001, REQ-002, REQ-003; AC-003, AC-005, AC-006 |
| BEH-003 | For a team member, a live team token event creates `teamAgentSummaries[agentRunId]`. The member hydrator prefers that entry and skips `getTeamMemberTokenUsageSummary`. This is the production path matching the screenshot's `0` totals, missing prices, `2 model calls`, and new-process metadata. | A provisional live member summary must not satisfy durable-hydration readiness. The focused member and all member rows must converge to their persisted cumulative records for the exact team/run identity. | The focused leaf member remains the Token tab's primary summary; team aggregate data must not replace it. | REQ-001, REQ-002, REQ-003, REQ-005; AC-004, AC-005, AC-006, AC-007 |
| BEH-004 | Team-total summaries already distinguish `live_partial` from `ledger_backed`; a partial live total cannot block the team aggregate GraphQL fetch, and later live deltas can extend a ledger-backed total. | Preserve this source-aware team-total behavior while making standalone/member readiness consistent with it. | Team-table layout, final `Team total` row, requested-team keying, and aggregate ownership remain unchanged. | REQ-003, REQ-005; AC-007 |
| BEH-005 | `TokenUsageMeterPanel.vue` renders the selected summary without calculating model prices. When a partial live summary is mistaken for the full summary, it truthfully renders that partial object's zero/null fields, producing misleading lifetime-looking `0` and `price missing` values. | Once hydration succeeds, every displayed token, price/cost, cost status, model, runtime, prompt/context, and report-count field must come from or converge with the server's cumulative summary. A provisional value must not be represented as a completed lifetime load. | The existing Token Meter hierarchy, price-status semantics, responsive behavior, localization, and presentation-only component boundary remain unchanged. | REQ-004, REQ-006; AC-002, AC-005, AC-008 |
| BEH-006 | Event IDs make live delta application idempotent. A server fetch may replace a provisional summary, and live deltas received after a ledger-backed team-total fetch remain applicable; standalone/member lifecycle ordering is not explicitly modeled. | Durable hydration and live delivery must converge without permanently dropping or double-counting an observation, including when a live event arrives before, during, or after hydration. | Existing event-id idempotency and server-side serialized per-run persistence remain in force. | REQ-003; AC-006 |

## Investigation Findings

- Durable data is healthy. At investigation time, SQLite contained 1,295 current run records; all 1,295 had positive cumulative totals.
- The screenshot task was matched through `team_run_history_index.json` to team run `software_engineering_team_cd9a33ea0d3e495896092850ca3f18cd` and focused run `solution_designer_b5b6a96dfade433a8918534abd45b96a`.
- A read-only database query for that focused run returned 199 usage reports, 25,809,925 total tokens, and USD 22.601646 estimated total API cost at the time of the probe. The run remained active, so these values are evidence snapshots rather than fixed product constants.
- A direct GraphQL `getTeamMemberTokenUsageSummary` probe returned the same cumulative values plus `gpt-5.6-sol`, `codex_app_server`, and its prompt/context fields. `getAgentRunTokenUsageSummary` also returned the record correctly.
- The exact frontend defect exists in both standalone and team-member guards: `useTokenUsageWorkspaceScope.ts` returns early when `getRunSummary(...)` or `getMemberSummary(...)` returns any object. Live delta application creates those objects before durable hydration.
- A prior fix already established the correct invariant for the adjacent team-total cache: only a `ledger_backed` summary may suppress the GraphQL aggregate fetch. That provenance invariant was not generalized to standalone and member summaries.
- The team live-stream DTO drops the server event's already-persisted `run_summary_after_event` and `runtime_kind`. This omission explains why a new-process partial team summary can retain a model identifier while showing runtime `unknown`; solution design must decide whether durable convergence remains GraphQL-led or also reuses the cumulative live payload. The required observable behavior is independent of that implementation choice.
- Existing focused store/component tests pass but cover only direct summary replacement and partial-live **team-total** hydration. They do not cover a live-created standalone/member summary suppressing its GraphQL fetch.

## Relevant Supplemental Task Artifacts

None.

## Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Initial design issue signal: `Yes`
- Root cause classification: `Missing Invariant` (with contributing `Shared Structure Looseness`)
- Refactor posture: `Likely Needed`
- Evidence basis: The same cache maps represent provisional live accumulation and server-backed cumulative readiness, but only the team-total map records source/completeness. Raw object existence is therefore an invalid hydration predicate for standalone and member subjects.
- Requirement or scope impact: The correction must establish one explicit, store-owned readiness/convergence invariant across standalone, team-member, and existing team-total subjects. It does not authorize changing accounting or price calculation.

## Recommendations

1. Treat the SQLite current run record and existing GraphQL summaries as the durable authority; do not introduce another persistence layer or client-side price reconstruction.
2. Replace raw cached-summary existence checks with explicit source/readiness semantics for standalone and team-member subjects, consistent with the already-shipped team-total invariant.
3. Define ordering rules for live-before-hydration, live-during-hydration, and live-after-hydration so the fix cannot trade the restart defect for lost or duplicated recent usage.
4. Add focused regression coverage at the Token-tab/composable boundary for the screenshot sequence, not only store-level direct replacement.
5. Evaluate use of the server's `run_summary_after_event` as part of solution design, but change the team stream contract only if it materially strengthens the approved convergence invariant without duplicating the existing GraphQL authority.

## Scope Classification (`Medium`)

The persistence and GraphQL layers are already correct, but the behavior spans standalone and team-member cache subjects, live-stream ordering, Token-tab hydration, complete field fidelity, and preservation of the recently fixed team-total path. The likely code change is bounded, while the lifecycle/race coverage is broader than a single local guard edit.

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- **UC-001 — Reopen standalone run:** After restarting/reopening the app or server, select an existing standalone run and open its Token tab.
- **UC-002 — Reopen focused team member:** Select an existing team run/focused leaf member and open its Token tab after restart or history hydration.
- **UC-003 — Live event precedes tab hydration:** Receive one or more live token events in a fresh frontend store before the Token tab mounts or focuses its subject.
- **UC-004 — Live event follows/intersperses hydration:** Continue receiving events while or after a durable summary fetch without losing or double-counting usage.
- **UC-005 — Preserve team comparison:** Show focused-member primary details, member rows, and the source-aware ledger-backed `Team total` row.

### Out of Scope

- Changing token-accounting semantics, snapshot normalization, idempotency identity, or the server's per-run fold.
- Changing provider/model pricing catalogs, price-tier selection, cost formulas, currency mixing rules, or backfilling genuinely unpriced records.
- A new database, schema change, migration, record rewrite, or history rebuild.
- Redesigning the Token tab, its information hierarchy, responsive layout, localization, or accessibility model.
- Changing the separate **Settings > Token Statistics** page; this ticket concerns the right-side workspace **Token** tab.
- Broader team-stream enrichment unrelated to establishing the approved token-summary convergence behavior.

### Preserved Behavior Boundary

- Preserve the server authority and contracts in BEH-001, team-total behavior in BEH-004, Token Meter presentation boundary in BEH-005, and live event idempotency in BEH-006.
- Preserve exact run/team/member identity selection. A team aggregate must never substitute for a focused member, and data from another team or run must never satisfy hydration.
- Preserve existing truthful price-status outcomes when the durable server record itself is missing or partially missing pricing; this change must not fabricate a complete estimate.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, or operational contract is a `Requirement Gap`; it must return for explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It must not be treated as a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The solution designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Functional Requirements

- **REQ-001 — Durable cumulative restore:** For UC-001 and UC-002, the Token tab must request and use the existing server current-record summary for the exact selected standalone run or team member whenever that subject has not yet been durably hydrated in the current frontend lifecycle.
- **REQ-002 — Explicit completeness/readiness:** A summary assembled only from live deltas must be distinguishable from a durable cumulative summary and must not, by object existence alone, suppress the corresponding GraphQL hydration.
- **REQ-003 — Deterministic convergence:** For UC-003 and UC-004, live events and durable hydration must converge to the authoritative cumulative usage without permanent observation loss, duplicate counting, cross-run contamination, or disabling legitimate later live updates.
- **REQ-004 — Complete server-field fidelity:** Successful hydration must preserve all server summary dimensions already queried by the Token Meter: token components and totals; component/total costs, currency, price status, policy/tier, and unit-price states; model/provider/runtime; prompt/context fields; report count; and update metadata. The frontend must not recalculate provider pricing.
- **REQ-005 — Identity and team behavior preservation:** The exact standalone run or focused team-member run remains the primary subject. Existing per-member rows and ledger-backed team-total hydration continue to use their current team/run identity rules and layout.
- **REQ-006 — Truthful UI states:** When no usable summary exists, existing loading, empty/unavailable, and error behavior must remain explicit. A provisional live-only value may not be treated as proof that a successful lifetime-summary load completed. Responsive, localized, and accessible presentation behavior remains unchanged.

## Acceptance Criteria

- **AC-001 — Persistence proof:** A persisted current run record remains directly readable after server restart and is returned by the existing GraphQL run/member summary query without schema or data transformation.
- **AC-002 — Field fidelity:** For a priced persisted record, the Token tab displays the GraphQL summary's cumulative token totals, estimated input/output/total costs, currency/status, model, runtime, prompt/context, and report count; it does not show `0`, `price missing`, or `runtime unknown` when those values are populated in the returned record.
- **AC-003 — Standalone restart regression:** Starting from a fresh frontend store, applying one or more live events for an existing standalone run before mounting/opening the Token tab does not suppress the run-summary fetch; the primary view converges to the server cumulative summary.
- **AC-004 — Team-member restart regression:** Starting from a fresh frontend store, applying one or more team live events for an existing member before mounting/opening the Token tab does not suppress the exact team-member summary fetch; the focused primary view and that member row converge to the server cumulative summary.
- **AC-005 — Screenshot sequence:** When two post-restart events yield zero/partial token-cost fields but the durable record is populated, the final loaded view shows the durable lifetime values rather than `0` totals, missing prices, and a two-report partial history.
- **AC-006 — Ordering and idempotency:** Coverage exercises live-before, live-during, and live-after hydration. Each accepted event contributes at most once, hydration does not permanently erase a newer accepted contribution, and later events continue to update a hydrated summary.
- **AC-007 — Team preservation:** Focused leaf member details remain primary; member rows remain identity-correct; a provisional team total still triggers `getTeamRunTokenUsageSummary`; the final ledger-backed `Team total` row remains separate.
- **AC-008 — UI state preservation:** A successful load renders the existing Token Meter hierarchy and existing responsive/accessibility hooks. Missing record and fetch-failure scenarios remain explicit and do not fabricate server values.
- **AC-009 — No data transition:** Existing `token_usage_run_records` rows are neither deleted, rewritten, nor backfilled by this fix, and no migration or maintenance window is required.

## Constraints / Dependencies

- The server persists a token observation before publishing the transformed event on the normal path, and serializes folds per run.
- Existing GraphQL queries use `network-only` and already request the complete `TokenUsageRunSummary` field set.
- The frontend Pinia store is intentionally process-local; correctness depends on reacquiring a durable baseline, not on persisting Pinia state.
- The team stream contract is strict and currently omits `runtime_kind` and `run_summary_after_event`; changing it would require coordinated server, shared-contract, and frontend updates.
- The ticket worktree does not contain installed frontend dependencies. Focused tests were run read-only from the shared checkout at the identical commit; downstream implementation must run authoritative checks in the ticket worktree with dependencies available.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: SQLite table `token_usage_run_records` in the configured application database (observed at `/Users/normy/.autobyteus/server-data/db/production.db`), one cumulative row per canonical agent `run_id`.
- Required outcome: `Directly Usable — No Migration`
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve every current run record and its identity, cumulative token/cost values, pricing summary, latest model/runtime, prompt/context, report count, and timestamps exactly as stored.
- Unacceptable data loss or corruption: Deletion, reset, double-counting, reassignment across run/team identities, price-field nulling, or rewriting cumulative records to accommodate frontend cache state.
- Relevant availability, maintenance-window, or rollout constraints: None; normal readers already return the required meaning.
- Related requirement and acceptance-criteria IDs: REQ-001, REQ-003, REQ-004; AC-001, AC-002, AC-006, AC-009.

## Assumptions

- The user's screenshot represents a supported team-run/focused-member path reopened in a fresh frontend/server lifecycle; history-index evidence identifies the matching run.
- A server-returned `price_missing`, `partial_price_missing`, `mixed`, or `local_no_api_bill` state is authoritative and must remain visible rather than being “fixed” by client pricing.
- No new visual indicator is required if the existing loading/error states can truthfully represent provisional hydration; solution design may add only the minimum state plumbing needed to satisfy REQ-006.

## Risks / Open Questions

- **Design choice, not a requirement gap:** Generalizing store provenance around the existing GraphQL fetch is the smallest consistent fix. Reusing `run_summary_after_event` in standalone/team live contracts could provide a stronger cumulative live source but broadens the boundary. The design must justify the chosen path against REQ-003.
- A fetch that overlaps a newly persisted event needs an explicit precedence/ordering rule; replacing or adding blindly can respectively lose or double-count a contribution.
- The screenshot task remained active during investigation, so numeric evidence changed between probes. Tests must use fixed fixtures rather than asserting the live database totals.
- No additional user decision is required for the proposed behavior boundary. Any proposal to change pricing policy, schema, or Token-tab UX would be a new requirement gap.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-002, UC-003 |
| REQ-002 | UC-001, UC-002, UC-003 |
| REQ-003 | UC-003, UC-004, UC-005 |
| REQ-004 | UC-001, UC-002, UC-003 |
| REQ-005 | UC-001, UC-002, UC-005 |
| REQ-006 | UC-001, UC-002, UC-003 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Server/GraphQL evidence that persistence already survives restart. |
| AC-002 | Full Token Meter field restoration for a priced durable record. |
| AC-003 | Standalone partial-live-before-mount regression. |
| AC-004 | Focused team-member partial-live-before-mount regression. |
| AC-005 | Exact observable sequence reported in the screenshot. |
| AC-006 | Concurrency/order and idempotency regression coverage. |
| AC-007 | Existing team focus, rows, and team-total invariant preservation. |
| AC-008 | Loading/empty/error and presentational-boundary preservation. |
| AC-009 | Direct-use/no-migration verification. |

## Approval Status

`Approved by the user on 2026-08-20. The user confirmed the requirements were clear and instructed the team to proceed with the task.`
