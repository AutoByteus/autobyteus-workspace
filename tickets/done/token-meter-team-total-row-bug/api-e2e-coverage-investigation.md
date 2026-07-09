# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-total-row-bug/tickets/done/token-meter-team-total-row-bug/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-total-row-bug/tickets/done/token-meter-team-total-row-bug/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-total-row-bug/tickets/done/token-meter-team-total-row-bug/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-total-row-bug/tickets/done/token-meter-team-total-row-bug/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-total-row-bug/tickets/done/token-meter-team-total-row-bug/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-total-row-bug/tickets/done/token-meter-team-total-row-bug/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review pass from `code_reviewer` for the Token tab `Team total` row bug.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior is that, in a team workspace Token tab, the `Team total` row must use the server-owned aggregate for the root team run rather than an individual member row or a live-only partial summary. Member focus may change the primary detail cards and focused-row highlighting only; it must not alias or replace the aggregate row. A live `TOKEN_USAGE_UPDATED` event may update visible summaries, but a live-created team summary is provisional until the store hydrates the ledger-backed team aggregate through `fetchTeamRunSummary(teamRunId)`. After ledger hydration, later live deltas must continue to extend the team total without resetting it to provisional. `TeamTokenUsageSummary.vue` remains presentational and must not compute authoritative totals from member rows.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no backward-compatibility mechanisms were introduced, no legacy old behavior is retained, obsolete aliasing paths were removed in scope, and the store/composable/component ownership boundaries remain tight. The code review independently passed these checks and found no retained compatibility branch for the incorrect partial-live total behavior.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Store distinguishes live-only team summaries from ledger-backed team aggregates. | Added | REQ-004, REQ-005; design DS-002/DS-004; implementation handoff changed `tokenUsageMeterStore.ts`. | Durable store coverage must prove live-created team summaries still require hydration and fetched summaries become ledger-backed. |
| Team total hydration no longer uses raw `getTeamSummary(teamRunId)` existence as a completeness signal. | Changed | REQ-001, REQ-003, AC-003; design removal plan; code review scope. | Component/composable coverage must prove partial live data triggers `fetchTeamRunSummary()` and final table values use the ledger aggregate. |
| Member summary writes no longer seed the team aggregate cache. | Removed | Design removal plan; implementation handoff legacy cleanup; code review no-legacy verdict. | Store coverage must prove `upsertSummary()` and member summary fetches do not create a team total. |
| Team aggregate remains server/GraphQL-owned; UI component does not compute totals from rows. | Preserved | REQ-003, AC-004; design ownership map; code review boundary checks. | Existing component coverage remains valid; server GraphQL E2E aggregate coverage remains a useful API boundary check. |
| Focused team member drives primary detail cards but not `Team total`. | Preserved / Changed bug behavior | REQ-002, AC-002; implementation handoff downstream hints. | Component coverage must verify focus switching leaves the total row stable. |
| Live events after ledger hydration continue to increment team total. | Preserved / Changed bug behavior | REQ-005; design return-event spine; implementation handoff downstream hints. | Store coverage must verify ledger-backed readiness is preserved after live deltas. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` / `aggregates member events into team summary and reports mixed priced/unpriced status` | Live member events aggregate into an in-memory team summary and expose mixed price status. | REQ-005; DS-002 live event spine. | Still Valid | The implementation intentionally preserves live responsiveness but now marks the result provisional; the test has been updated to expect `needsTeamRunSummaryHydration(team-run-1) === true`. | Execute focused Nuxt/Vitest suite. |
| `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` / `marks fetched team summaries ledger-backed and keys them by requested team run id` | `fetchTeamRunSummary(teamRunId)` uses the requested team id for the frontend cache even if the backend payload `runId` is member-like, and marks the summary ledger-backed. | REQ-001, REQ-003, REQ-004; design residual risk about backend `runId` ambiguity. | Still Valid | Directly covers the reviewed design's identity/provenance invariant and residual backend payload looseness. | Execute focused Nuxt/Vitest suite. |
| `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` / `preserves ledger-backed team readiness when later live deltas extend the team total` | Live events after ledger hydration increment the total while keeping the team summary ledger-backed. | REQ-005; DS-002; implementation downstream hint. | Still Valid | Directly covers the live-after-ledger behavior that prevents regression to provisional state. | Execute focused Nuxt/Vitest suite. |
| `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` / `does not seed the team aggregate cache from member summary writes` | Member summary writes/fetches update run summaries only and do not create/overwrite a team aggregate cache row. | REQ-003, REQ-004; design removal/decommission plan. | Still Valid | Directly covers removal of member-summary-as-team fallback and no legacy retention. | Execute focused Nuxt/Vitest suite. |
| `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` / existing run-summary and unit-price scenarios | Existing live event idempotency, run reload, currency/status, reasoning/context, and unit-price normalization behaviors remain intact. | Constraint to preserve existing per-member token/cost display and server-accounted price semantics. | Still Valid | These scenarios guard adjacent store behavior touched by `upsertSummary()` and live merge changes. | Execute same focused store suite. |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` / `uses the focused team member as primary and keeps aggregate usage only in the Team section` | Focused member is primary; Team section total remains aggregate-backed. | REQ-001, REQ-002, AC-001, AC-002. | Still Valid | Confirms focus behavior stays separated from aggregate row display. | Execute focused Nuxt/Vitest suite. |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` / `hydrates the team aggregate when only a partial live team summary exists` | A partial live team summary exists first; mounting the team Token tab invokes aggregate hydration and final `Team total` values use the larger aggregate; focus switching does not alter total. | AC-001, AC-002, AC-003, AC-005; implementation downstream hints. | Still Valid | This is the exact reported bug shape, covered through the component/composable/store boundary with a mocked aggregate fetch. | Execute focused Nuxt/Vitest suite. |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` / rendering, calculation details, unavailable focus scenarios | Presentation renders server-owned values and unavailable focus does not fall back to team aggregate as primary. | REQ-002, REQ-003, AC-004; constraints on per-member display. | Still Valid | Adjacent Token tab scenarios ensure the fix did not move aggregation into the renderer or reintroduce focus fallback. | Execute same focused component suite. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` / `returns expanded run/team/member summaries and settings statistics from ledger accounting fields` | GraphQL `getTeamRunTokenUsageSummary(teamRunId)` returns a persisted team aggregate from ledger accounting fields and keeps member summary separate. | REQ-001, REQ-003; design DS-003; backend aggregate reuse constraint. | Still Valid | Backend was not changed, but this durable API/E2E coverage validates the authoritative aggregate boundary the frontend relies on. | Execute focused server API/E2E scenario if local environment supports it. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts` | GraphQL exposes display-safe unit prices on token summaries. | Price display constraints only. | Out Of Scope | This task did not change GraphQL unit-price payloads. Store unit-price tests remain enough for changed frontend merge/write paths. | Do not run for this task. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-model-list.e2e.test.ts`, execution-address backfill, legacy-path-column-drop, provider semantics scenarios | Model lists, migrations, legacy column drops, provider semantics. | Not part of Token tab team total hydration/provenance behavior. | Out Of Scope | No touched files or accepted requirements affect these boundaries. | Do not run for this task. |
| `autobyteus-web/components/settings/**/__tests__/*TokenUsage*.spec.ts` and `autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts` | Settings token usage statistics tables/store. | Settings pages are not in the reported Token tab path. | Out Of Scope | The changed code is `tokenUsageMeterStore`, workspace scope, and Token tab panel tests, not settings statistics. | Do not run for this task. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No stale or obsolete durable coverage found in the relevant Token tab/team aggregate scope. | N/A | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | Existing implementation-stage durable coverage already covers the required current behavior. | N/A | No additional repository-resident durable coverage is needed in the API/E2E stage. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | No API/E2E-stage durable coverage update planned. | N/A | Existing coverage updated before code review is sufficient and already review-passed. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-SETUP-001 | Temporarily symlink dependency installs from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` into this worktree for command execution, then remove symlinks. | Enables local Nuxt/Vitest/API test execution in the dependency-less task worktree. | Environment scaffolding only; not product coverage. |
| TEMP-API-001 | Run the existing focused server GraphQL E2E scenario for ledger summary projections if local server test dependencies/database are available. | Confirms the API aggregate boundary still returns a server-owned team summary separate from member summary. | The durable test already exists; no new probe file should be retained. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full real-browser Electron/Nuxt E2E against a live backend Token tab | No existing browser E2E harness was found for `autobyteus-web`; the exact UI/composable/store bug is already exercised by durable Nuxt component coverage with mocked aggregate fetch, and the server aggregate boundary has its own API/E2E coverage. | Low to medium: browser-only rendering regressions outside component test harness would not be covered here. | No escalation; delivery can consider broader browser E2E investment separately if the project adds such a harness. |
| Very-recent live-event versus ledger-fetch persistence race | Explicitly deferred residual risk in requirements/design/code review; current requirement only requires later live events to update ledger-backed team summaries without double-counting known events. | Medium residual product risk if the server fetch misses a just-streamed event and no later live event arrives. | No reroute for this task; future reconciliation/versioning task if needed. |
| Backend team aggregate payload identity cleanup (`runId` semantics) | Explicitly deferred residual API-shape issue; frontend now keys by requested team id and does not depend on payload `runId`. | Low for this bug after frontend guard/keying fix. | Future schema-tightening task if more consumers need explicit summary subject identity. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | No active ambiguity or reroute trigger found. No compatibility wrapper, dual-path legacy branch, schema-upgrade shim, or retained old partial-live suppression path was observed in the changed scope. | N/A |

## Execution Plan

1. Use temporary dependency symlinks from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` for this dependency-less worktree; clean them up after execution.
2. Run `pnpm -C autobyteus-web exec nuxi prepare` to regenerate Nuxt test/build metadata for the worktree.
3. Run focused durable frontend executable coverage: `pnpm -C autobyteus-web test:nuxt --run stores/__tests__/tokenUsageMeterStore.spec.ts components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts`.
4. Run focused durable API/E2E coverage for the server ledger aggregate boundary if environment support is present: `pnpm -C autobyteus-server-ts test --run tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts -t "returns expanded run/team/member summaries and settings statistics from ledger accounting fields"`.
5. Run `git diff --check` from the worktree.
6. Record results, setup, cleanup, and any blocked/infeasible scenarios in the execution coverage report.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: The existing review-passed durable store/component coverage is sufficient for the frontend bug shape. Existing server API/E2E coverage is valid for the backend aggregate boundary and should be executed if the local database/dependencies allow it. No API/E2E-stage durable coverage edits are planned, so a successful validation can hand directly to `delivery_engineer`.
