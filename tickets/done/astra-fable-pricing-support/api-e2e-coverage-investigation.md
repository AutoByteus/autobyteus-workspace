# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/design-spec.md`
- Supplemental Task Artifacts: None.
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable`
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: `N/A — initial API/E2E route`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/api-e2e-revision-record.md` (created after the first completed result)
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/api-e2e-test-case-ledger.md`
- Current Investigation Round: `1`
- Trigger: Direct `Small` / `Low` implementation handoff at `IR-001`; production/test/docs commit `4d3ab78dad9afe376c5e6860abae2f307e73d1d6`.
- Prior Investigation Reviewed: `N/A — first API/E2E round`
- Latest Authoritative Investigation: This file.

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

The approved package adds exact built-in Standard metadata/pricing for `OPENAI/gpt-6-astra` and `ANTHROPIC/claude-fable-5-1` through the existing shared catalog. Astra requires prices `10/1/12.5/50` through 272,000 accounting input tokens and `20/2/25/75` for the full request above that boundary. Fable 5.1 requires input/output/cache-read/5-minute-cache-write/1-hour-cache-write prices `10/50/0.25/12.5/20`. Exact identity, first-party provenance, provider-valid direct request construction, fail-closed unknowns, existing GPT-5.6 and Fable 5 behavior, observation-time historical snapshots, current GraphQL/UI contracts, and runtime-owned dynamic discovery must remain unchanged. No aliases, pricing variants, migration, UI change, or paid target inference are permitted. The user's post-handoff clarification that unit tests are enough for these expensive models confirms that live provider inference must not be used; deterministic non-network repository coverage remains the validation surface.

The implementation changes one production catalog file and adds targeted unit/integration/non-network GraphQL coverage plus documentation. The Legacy / Compatibility Removal Check is clean: the GPT-5.6-specific helper name was replaced rather than wrapped, and no alias or fallback was added. The Persisted Data Transition decision is `Not Affected`; no persistence or migration source changed.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` / `DS-001` Astra pricing | Added | `requirements-doc.md` AC-001/002/010; `design-spec.md`; catalog diff | Prove exact catalog resolution, both tier boundaries, component costs, and public summary projection without provider inference. |
| `BEH-002` / `DS-002` Fable 5.1 pricing | Added | AC-003/005/010; catalog and Anthropic request-test diff | Prove all cache-aware dimensions, calculated costs, direct request sanitization, and public summary projection. |
| `BEH-003` / `DS-003/004` exact/fail-closed/prospective contract | Preserved with two additive rows | AC-004/006/007/009/010; implementation handoff | Prove exact one-row exposure, aliases remain missing, existing rows pass, and no migration/runtime/frontend production delta exists. |
| `BEH-004` no-paid validation | Preserved | AC-008; user constraint and clarification | Run credential-free static, mocked, synthetic, build, and non-network GraphQL checks only. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Shared catalog payload and private OpenAI long-context helper | Definition, factory, pricing-provider, and calculator tests | Target-specific observation-to-public-summary convergence is not yet durable | Add one credential-free server GraphQL E2E test. |
| API / transport / contract | Behavior only; shape unchanged | Existing static model-list and token-summary GraphQL outputs consume new data | Existing non-network model-list E2E plus generic token-summary E2E infrastructure | Exact target prices must be observed through the unchanged public summary | Add target-specific synthetic GraphQL summary coverage. |
| Frontend component / state | No | None | Existing server summaries and unchanged frontend | None material after public summary proof | None. |
| Browser integration / user journey | No | No UI or browser contract changed | Public server summary is the governing changed boundary | Browser would only repeat unchanged formatting | None. |
| Authentication / session / permissions | No | None | All selected checks use synthetic keys/mocks or no keys | Account entitlement is external and explicitly not promised | None. |
| Desktop renderer / web-equivalent UI | No | None | No renderer code changed | None | None. |
| Desktop shell / Electron-specific integration | No | None | No shell code changed | None | None. |
| Process / lifecycle | No material change | Catalog loads during normal build/bootstrap | Production builds and sanitized bootstrap smoke | No restart-specific behavior exists | Build/bootstrap only. |
| Persisted-data transition | No (`Not Affected`) | Future observations use new catalog rows; old snapshots remain immutable | Diff inspection; existing persistence semantics/tests | No representative migration is applicable | None. |
| Worker / queue / distributed coordination | No | None | N/A | N/A | None. |
| External integration | Catalog rows affect provider request construction, but no external call is required | Existing OpenAI/Anthropic adapters receive exact target IDs | Mocked request payload tests | Live availability and billing are explicitly external/out of scope | None; paid inference prohibited. |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support`
- Project type and runtime stack: pnpm TypeScript monorepo; `autobyteus-ts` shared LLM package; Fastify/GraphQL/Prisma `autobyteus-server-ts`; Vitest.
- Conflicting, missing, or unclear project instructions: None material. Server typecheck has a documented pre-existing `rootDir: src` / included-tests TS6059 failure; production build remains authoritative for compilation. The full factory metadata file has a documented unrelated stale Gemini 3.5 expectation.
- Required environment variables or secrets available: `N/A`; no provider keys or live calls are allowed or needed.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| Repository `README.md` | Workspace setup and E2E entry points | `pnpm install`; `pnpm test:e2e`; real-provider checks are separate and must report unavailable capabilities rather than claim pass. |
| `autobyteus-server-ts/AGENTS.md` | Closest server test instruction | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`; narrow tests before broader suites. |
| `autobyteus-server-ts/README.md` | Server build/test/environment | Node 18+ (20+ recommended); `pnpm -C autobyteus-server-ts build`; tests own isolated `.env.test`/temporary SQLite state. |
| Root, `autobyteus-ts`, and server `package.json` | Authoritative scripts | Shared package `build`; server `prepare:shared`, `build`, `test`, and known `typecheck` script. |
| `autobyteus-ts/vitest.config.ts`, `autobyteus-server-ts/vitest.config.ts` | Test runner configuration | Vitest is the repository runner; selected files can run directly. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Workspace dependencies | Worktree root | Already installed; implementation used `pnpm install --offline --frozen-lockfile` | Lockfile unchanged | `pnpm --version`, test startup | No process cleanup. |
| Shared LLM package | Worktree root | `pnpm -C autobyteus-ts build` | Credential-free | Successful TypeScript/runtime dependency verification | Generated build output is repository-standard. |
| Server test runtime | Worktree root | Focused `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch` | Test-owned SQLite via repository setup | Vitest cases pass and cleanup created run IDs | Test hooks delete created rows and shut down Prisma. |
| Server production build | Worktree root | `pnpm -C autobyteus-server-ts build` | Runs shared builds, Prisma generation, TS build, asset copy, bootstrap smoke | Exit zero | No long-running process. |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Exact target catalog rows | `supportedModelDefinitions` registered into reset `LLMFactory` in tests | No external identity or credential | Reset factory after affected suites. |
| Synthetic token observations | `createTokenUsageUpdatedPayload`, component resolver, delta normalizer, calculator | Deterministic counts; no provider request | Unique run IDs; delete only created rows. |
| GraphQL summaries | `buildGraphqlSchema` + in-process `graphql()` | No network server, browser, or shared user data | Test hooks shut down Prisma. |
| Direct provider request payloads | Existing mocked clients and synthetic API keys | No network, no billable inference | In-memory only. |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`
- Design-spec and implementation-handoff references: `design-spec.md` → `Persisted Data / State Transition Decision`; `implementation-handoff.md` → `Persisted Data Transition Check`.
- Representative existing-data setup and required behavior: Existing observations retain captured unit prices/cost/status; only new exact target observations resolve the added rows.
- Evidence planned: Diff inspection confirms no Prisma, repository, migration, or persistence production file changed; existing observation-time persistence and GraphQL hydration tests remain valid; the new target-specific synthetic test writes only new observations.
- Migration-specific scenarios: `N/A`
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Exact target metadata, prices/tiers, provenance, aliases, GPT-5.6/Fable 5 preservation | AC-001–004, AC-006, AC-009 | Still Valid | Direct catalog/factory assertions | Run focused file. |
| `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Exact enumeration, schemas, aliases, and adapter construction | AC-004–006 | Still Valid, with unrelated stale baseline assertion elsewhere in file | Target-filtered cases isolate current scope | Run target filters; record full-file baseline separately. |
| `autobyteus-ts/tests/unit/llm/api/provider-native-request-payloads.test.ts` | Astra Responses payload/effort mapping | AC-005 | Still Valid | Mocked client, no network | Run file. |
| `autobyteus-ts/tests/unit/llm/api/anthropic-llm.test.ts` | Fable 5.1 sampling/thinking sanitization | AC-005 | Still Valid | Mocked sync request | Run file. |
| `autobyteus-server-ts/tests/unit/token-usage/pricing/token-price-config-provider.test.ts` | Exact trusted policies and aliases missing | AC-001–003, AC-006 | Still Valid | Real catalog lookup in server policy owner | Run file. |
| `autobyteus-server-ts/tests/unit/token-usage/pricing/token-cost-calculator.test.ts` | 272,000/272,001 tier identity and costs | AC-001/002 | Still Valid | Pure calculator boundary | Run file. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-model-list.e2e.test.ts` | Exact one-row GraphQL static catalog exposure and no aliases | AC-004/009 | Still Valid | In-process GraphQL, no network | Run file. |
| `autobyteus-server-ts/tests/e2e/token-usage/gpt56-token-usage-accounting-graphql.e2e.test.ts` | Established catalog → enrichment → event → persistence → GraphQL summary pattern | AC-006/010 design precedent | Still Valid | Direct real server boundaries for existing GPT-5.6 rows | Reuse pattern and run as affected regression. |
| Existing token-usage GraphQL/persistence suites | Generic summary, unit-price, analytics, restart, and ledger behavior | AC-006/007/010 | Still Valid | Existing unchanged contract proof | Run the token-usage E2E directory after focused checks. |

## Stale Or Obsolete Coverage Decisions

No relevant target coverage is obsolete. The unrelated Gemini 3.5 expectation is a pre-existing baseline issue and is not removed or changed by this package.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `API-SCN-001` | Exact Astra standard and long-context observations flow from real catalog lookup through cost enrichment, event mapping, persistence, and public GraphQL summary | REQ-001/002/010; AC-001/002/010; DS-001/004 | `autobyteus-server-ts/tests/e2e/token-usage/astra-fable-token-usage-accounting-graphql.e2e.test.ts` | Existing target tests stop at policy/calculator boundaries; the approved public-summary acceptance criterion needs direct durable proof. |
| `API-SCN-002` | Exact Fable 5.1 cache read plus 5m/1h writes flow to trusted estimated public summary | REQ-003/010; AC-003/010; DS-002/004 | Same file | Proves the target's distinct cache dimensions are not lost between catalog, accounting, persistence, and GraphQL. |
| `API-SCN-003` | Unknown exact identity remains `price_missing` through the same public-summary path | REQ-006; AC-001/003/006/010 alternate behavior | Same file | Prevents the new rows from weakening fail-closed exact matching. |

## Durable Coverage To Update

None planned.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-ts exec vitest run tests/unit/llm/supported-model-definitions.test.ts tests/unit/llm/api/anthropic-llm.test.ts tests/unit/llm/api/provider-native-request-payloads.test.ts --no-watch` | Worktree root | Exact metadata/pricing, aliases, direct request validity | Pass — 3 files / 55 tests | `api-e2e-evidence/API-REV-001/01-autobyteus-ts-focused.log` |
| 2 | `pnpm -C autobyteus-ts exec vitest run tests/integration/llm/llm-factory-metadata-resolution.test.ts --no-watch -t 'GPT-5.6|Astra and Fable'` | Worktree root | Factory enumeration/construction without unrelated stale baseline assertion | Pass — 3 selected, 1 skipped | `api-e2e-evidence/API-REV-001/02-factory-targeted.log` |
| 3 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/token-usage/pricing/token-price-config-provider.test.ts tests/unit/token-usage/pricing/token-cost-calculator.test.ts --no-watch` | Worktree root | Trusted policy dimensions and Astra boundary math | Pass — 2 files / 28 tests | `api-e2e-evidence/API-REV-001/03-server-pricing.log` |
| 4 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage/astra-fable-token-usage-accounting-graphql.e2e.test.ts --no-watch` | Worktree root after `prepare:shared` | Catalog-to-public-summary convergence for Astra/Fable/unknown | Pass — 1 file / 4 tests after correcting one test-only public-status expectation | `api-e2e-evidence/API-REV-001/04-target-accounting-e2e.log` |
| 5 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage/token-usage-model-list.e2e.test.ts tests/e2e/token-usage/gpt56-token-usage-accounting-graphql.e2e.test.ts --no-watch` | Worktree root | GraphQL exact exposure and preserved existing long-context accounting | Pass — 2 files / 8 tests | `api-e2e-evidence/API-REV-001/05-related-e2e.log` |
| 6 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage --no-watch`; isolated retry of analytics file | Worktree root | Broader API/persistence/summary regression | Pass — 9 files passed in directory run; parallel-contaminated analytics file passed 5/5 alone, reconciling all 10 files / 31 tests | `api-e2e-evidence/API-REV-001/06-token-usage-e2e.log` |
| 7 | `pnpm -C autobyteus-ts build`; `pnpm -C autobyteus-server-ts build` | Worktree root | Compilation, runtime dependencies, generated client, bootstrap smoke | Pass | `api-e2e-evidence/API-REV-001/07-builds.log` |
| 8 | Full factory metadata file; `pnpm -C autobyteus-server-ts typecheck` | Worktree root | Truthful unrelated baseline classification | Pass (classification) — reproduced only documented Gemini assertion and TS6059 configuration failures | `api-e2e-evidence/API-REV-001/08-baselines.log` |
| 9 | `git diff`, `rg`, whitespace, no-migration, cleanup checks | Worktree root | Scope, docs, no migration, no paid command | Pass | `api-e2e-evidence/API-REV-001/09-static-audit.log` |

## Test-Case Ledger Plan

- Ledger required: `Yes` — execution has multiple independently meaningful catalog, pricing, public-summary, broader regression, build, and baseline-classification cases.
- Canonical ledger path: `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Case granularity: One independently meaningful repository validation surface per case.

| Case ID | Case / Journey | Requirement / Acceptance-Criteria IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Evidence Expected |
| --- | --- | --- | --- | --- | --- | --- |
| `API-CASE-001` | Shared exact catalog and provider request coverage | REQ-001–006, AC-001–006 | Shared package unit/integration with mocked adapters | Focused Vitest files and factory target filters | 1 | Passing assertions, no network. |
| `API-CASE-002` | Server exact policy and tier calculation | REQ-001–003, AC-001–003 | Server unit | Pricing-provider and calculator test files | 2 | Trusted dimensions and 272K/272001 results. |
| `API-CASE-003` | Target catalog-to-public-summary convergence | REQ-001–003/006/010, AC-001–003/006/010 | Server in-process GraphQL E2E | New target accounting E2E file | 3 | Astra both tiers, Fable cache subtypes, unknown missing. |
| `API-CASE-004` | Broader affected API/persistence regression | REQ-006/007/010, AC-006/007/010 | Server token-usage E2E suite | `tests/e2e/token-usage` | 4 | Existing model list, accounting, hydration, restart and analytics pass. |
| `API-CASE-005` | Production build/bootstrap | REQ-006/008, AC-006/008 | Build/process smoke | Shared and server build scripts | 5 | Exit zero; no provider inference. |
| `API-CASE-006` | Known baseline reproduction | REQ-006/008, AC-006/008 | Full factory file and server typecheck | Documented commands | 6 | Failures match unrelated known Gemini/TS6059 baseline. |
| `API-CASE-007` | Static scope/docs/no-migration audit | REQ-006–009, AC-006–009 | Git diff and documentation | `git diff`, `rg`, `git diff --check` | 7 | Only approved files, complete docs, no migration/adapter/frontend production change. |

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 98% | AC-001–010 are mapped to exact catalog, request, pricing, tier, documentation, build, diff, target public-summary, and preservation evidence. | Provider prices may change after the recorded source date. | Future normal catalog refresh if provider contracts change. |
| Changed-boundary execution directness | 98% | Real `LLMFactory` catalog resolution flows through production price provider/calculator, event mapper, SQLite persistence, schema/resolver, and GraphQL summary for both targets. | Paid provider transport is deliberately outside the changed pricing boundary. | None within approved scope. |
| Cross-boundary integration realism and mock gap | 96% | In-process GraphQL E2E uses production catalog, accounting, persistence, and projection code; adapter requests use captured mocked clients. | No live provider inference or account entitlement check, by explicit constraint. | Only prohibited/costly live calls could add provider-side evidence, but they would not improve static price correctness materially. |
| Environment, configuration, identity, and fixture fidelity | 95% | Test-owned real Prisma/SQLite schema, exact provider/model IDs, production builds, generated Prisma client, and sanitized bootstrap smoke passed. | No real external provider account or key was used. | None required for a static catalog change. |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Exact 272,000/272,001 boundary, alias failure, unknown `price_missing`, Fable cache subtypes, existing GPT-5.6/Fable preservation, broader analytics/restart/persistence suites, and baseline reproduction are covered. | The token-usage directory has a pre-existing parallel shared-database isolation limitation; all affected tests pass when isolated. | Repository-wide test isolation hardening is a separate infrastructure concern. |
| User-surface, browser, and desktop-shell confidence | N/A | No frontend, renderer, browser API, desktop shell, or presentation contract changed; the governing public server summary is directly exercised. | Actual UI rendering was intentionally unchanged. | Browser execution would repeat unchanged formatting and add no material changed-boundary evidence. |
| Durable regression coverage quality and relevance | 98% | Narrow target-linked tests cover catalog, adapters, exact prices/tiers, aliases, GraphQL catalog exposure, and the newly added catalog-to-public-summary path. | No material target gap remains. | None. |

- Overall post-repository confidence: `97%`
- Calculation method: Rounded simple average of six applicable categories: `(98 + 98 + 96 + 95 + 95 + 98) / 6 = 96.7%`; user-surface category excluded as genuinely inapplicable.
- Every critical acceptance criterion directly proven: `Yes`
- Any applicable category below `90%`: `No`
- Default clean-confidence target of `95%` met: `Yes`
- Material residual risks: First-party price/specification drift after 2026-09-22; account-specific runtime availability is external; documented unrelated Gemini factory assertion and server typecheck configuration failures; pre-existing shared-database interference when the token-usage E2E directory runs in parallel.

## Broader Validation Decision

- Decision: `Not Required`
- Selected execution mode: `None` beyond repository-resident non-network API/E2E.
- Specific confidence gap or residual risk addressed: The new durable server E2E closed the target-specific catalog-to-public-summary gap without a paid provider call.
- Why the selected mode can materially improve confidence: Completed repository E2E used real factory pricing, calculator logic, persistence, event mapping, schema, resolvers, and GraphQL summary contracts while preserving the user's cost constraint.
- Expected confidence after the selected validation: Achieved `97%` with no applicable category below 90%.
- Browser-specific decision and rationale: Browser validation is not planned because no UI, renderer, routing, browser API, or transport shape changed; direct public server summary proof exercises the real changed output boundary.
- If `Not Required`, evidence proving the real changed boundary without broader execution: `API-CASE-003` proves exact target observation → real catalog lookup → component/tier cost enrichment → event mapping → SQLite persistence → public GraphQL summary; `API-CASE-004` proves the broader token-usage contract; production builds/bootstrap pass. A live provider or browser does not exercise a changed owner and paid inference is prohibited.
- If `Blocked`: N/A.

## Desktop Application Validation Decision

N/A — no frontend renderer or Electron-shell behavior changed. Browser or desktop execution would not add material evidence beyond target-specific in-process GraphQL summary proof.

## Temporary Executable Validation Plan

None planned. The missing public-summary scenario belongs in durable repository coverage.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Paid Astra/Fable 5.1 inference | Explicitly prohibited by approved REQ-008 and reiterated by the user | Account entitlement/live provider availability remains external; it does not undermine static catalog correctness | None for this package. |
| Fast/Batch/Flex/geo/partner/private pricing | Explicitly out of scope; identity contract cannot select them safely | Standard estimates only | Separate requirements/design if requested. |
| Account-specific dynamic Claude/Astra visibility | Runtime/account-owned and no availability change exists | Static support does not promise entitlement | None for this package. |

## Ambiguities Or Reroute Triggers

None at investigation time. The two documented baseline issues will be reproduced and classified rather than treated as target defects unless evidence differs.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — add one focused non-network server E2E file; no update/removal.
- Post-repository confidence: `97%`
- Broader validation decision: `Not Required`; direct repository API/E2E evidence exercises the real changed boundary, while browser/live provider execution is not appropriate.
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Preserve the no-paid-inference boundary throughout.
