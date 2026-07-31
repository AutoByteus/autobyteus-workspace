# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-openai-model-pricing/tickets/in-progress/update-openai-model-pricing/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-openai-model-pricing/tickets/in-progress/update-openai-model-pricing/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-openai-model-pricing/tickets/in-progress/update-openai-model-pricing/design-spec.md`
- Supplemental Task Artifacts: `None`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-openai-model-pricing/tickets/in-progress/update-openai-model-pricing/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-openai-model-pricing/tickets/in-progress/update-openai-model-pricing/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-openai-model-pricing/tickets/in-progress/update-openai-model-pricing/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-openai-model-pricing/tickets/in-progress/update-openai-model-pricing/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-openai-model-pricing/tickets/in-progress/update-openai-model-pricing/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-openai-model-pricing/tickets/in-progress/update-openai-model-pricing/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-openai-model-pricing/tickets/in-progress/update-openai-model-pricing/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-openai-model-pricing/tickets/in-progress/update-openai-model-pricing/api-e2e-revision-record.md` (created after first completed result)
- Current API/E2E Revision ID: `N/A` (baseline investigation; no completed result yet)
- Current Investigation Round: `1`
- Trigger: `code_reviewer` CRR-002 implementation-source review Pass for source commit `777079e62`, with metadata reconciliation `IR-002` at `1c4013ce9`.
- Prior Investigation Reviewed: `None` (no prior API/E2E result or revision record exists)
- Latest Authoritative Investigation: This file

## Current Requirement And Design Basis

The reviewed package refreshes the exact built-in OpenAI GPT-5.6 Sol/Terra/Luna catalog prices and date, preserving the existing cache and `>272K` tier formulas; adds exact Anthropic `claude-opus-5` catalog, standard cache-aware prices/date, 1M context and 128k output metadata, and adaptive/no-sampling request policy; and preserves older Anthropic policy plus durable Sonnet 5 standard prices `(3, 15, 0.3, 3.75, 6)` with no temporal promotion path. The public path must remain provider-neutral: `LLMFactory.getModelPricingInfo` feeds server `TokenPriceConfigProvider` and `TokenCostCalculator`; historical usage snapshots remain immutable and no migration is required. Critical criteria are AC-001–AC-006, AC-008–AC-011, and AC-013, with active docs and preserved transport covered by AC-007 and AC-012.

Implementation source review passed as `CRR-002`; no server source changed. The implementation handoff explicitly records no credentialed live provider request and identifies an existing broader LLM run as limited by unrelated credential/host/media-fixture/network activity. Those limitations are validation scope evidence, not product failures.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` / GPT-5.6 catalog and factory pricing | Changed | `REQ-001`–`REQ-004`, `AC-001`–`AC-006`, `IR-002`, `CRR-002` | Rerun exact model identity/date/cache/standard/long-tier assertions; execute the real server-neutral accounting path for all three suffixes. |
| `BEH-002` / server pricing and historical accounting | Preserved boundary, changed policy input | `REQ-004`, `AC-005`–`AC-006`, design spine `DS-001` | Use server `TokenPriceConfigProvider` and persisted GraphQL summary; verify no historical repricing or server-specific table. |
| `BEH-003` / Opus 5 catalog and Anthropic request policy | Added | `REQ-005`, `REQ-007`, `AC-008`, `AC-011` | Rerun catalog/factory metadata plus adapter request-shape tests; no live Anthropic credentials required for sanitizer proof. |
| `BEH-004` / Opus 5 metadata and cache pricing | Added | `REQ-006`, `AC-009`–`AC-010` | Assert exact metadata/schema/pricing through factory and provider-neutral server mapping. |
| `BEH-005` / active documentation | Changed | `REQ-006`, `AC-007`, `AC-012` | Static doc consistency check; no runtime execution needed. |
| `BEH-006` / older Anthropic policy and Sonnet 5 durable standard pricing | Preserved | `REQ-008`, `AC-013`, design Sonnet decision | Regression matrix for Opus 4.8/Fable/Sonnet 5 and explicit no expiry/promotion source check. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Static catalog data, metadata resolver inputs, Anthropic request policy | `autobyteus-ts` unit/integration tests; source review | No provider execution; arithmetic coverage must include all suffixes | CLI/temporary executable probe if needed |
| API / transport / contract | Yes | Provider-neutral factory projection and server token-cost consumer | Existing server unit provider test and GPT-5.6 GraphQL E2E | Prior E2E covered Sol only; server catalog matrix gap | Live API/GraphQL via isolated test DB |
| Frontend component / state | No | No frontend files or UI contract changed | Source diff | None material | Not required |
| Browser integration / user journey | No | No browser/user surface changed | Source diff | None material | Not required |
| Authentication / session / permissions | No | No auth/session change | Source diff and no credential requirement for deterministic checks | Live provider entitlement is unproven but out of scope | Not required; classify credentials separately |
| Desktop renderer / web-equivalent UI | No | No renderer change | Source diff | None material | Not required |
| Desktop shell / Electron-specific integration | No | No shell/preload/IPC/package change | Source diff | None material | Not required |
| Process / lifecycle | No | No process/lifecycle code changed | Source diff; server test setup only | No lifecycle risk in catalog-only change | Not required |
| Persisted-data transition | Yes (preservation only) | Current catalog feeds future snapshots; persisted rows must not be rewritten | Existing ledger GraphQL E2E exercises append/read; no migration code changed | Historical immutability beyond representative isolated rows | Isolated server E2E/SQLite is sufficient |
| Worker / queue / distributed coordination | No | No worker/queue/distributed code | Source diff | None material | Not required |
| External integration | Yes, policy-facing only | Anthropic/OpenAI model IDs and request shapes; no external network call is required | Adapter mock/request-shape tests and source/docs evidence | Credentials, host entitlement, provider network, and media fixtures are unavailable/irrelevant | Optional live API, not required for Pass |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-openai-model-pricing`
- Project type and runtime stack: pnpm 10.28.2 monorepo, Node.js/TypeScript ESM, Vitest 4, `autobyteus-ts` library, Fastify/type-graphql/Prisma SQLite server.
- Conflicting, missing, or unclear project instructions: None found for this scope.
- Required environment variables or secrets available: `N/A` for deterministic catalog, adapter, and isolated SQLite checks. Provider API credentials are intentionally not required and not recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Server validation instructions | `pnpm -C autobyteus-server-ts exec vitest run <paths> --no-watch`; integration tests use `tests/integration`. |
| Root `package.json` | Workspace scripts | `pnpm` workspace; server build prepares `autobyteus-ts`; live real-E2E scripts exist but are provider/environment dependent. |
| `autobyteus-ts/package.json` | Library build/test dependencies | Build with `pnpm -C autobyteus-ts build`; no package test script, use `pnpm exec vitest run ...`. |
| `autobyteus-server-ts/package.json` | Server build/test lifecycle | `pretest` prepares shared packages; build runs full TypeScript/Prisma/bootstrap smoke. |
| `autobyteus-ts/vitest.config.ts` | Library test runner | Node environment, setup `tests/setup.ts`, focused paths can run with `pnpm exec vitest run ... --no-watch`. |
| `autobyteus-server-ts/vitest.config.ts` | Server test runner | Node environment, fork pool, Prisma env/global setup; all test files included except documented prompt-engineering exclusions. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` focused tests/build | `autobyteus-ts` | `pnpm exec vitest run ... --no-watch`; `pnpm build` when needed | No external service or credentials | Vitest exit 0 and build exit 0 | No persistent process; Vitest cleanup |
| Server provider/unit/E2E tests | `autobyteus-server-ts` | `pnpm exec vitest run <paths> --no-watch` | Isolated SQLite from Prisma test setup; tests own/reset DB | Vitest exit 0; E2E schema and GraphQL summary assertions | Hooks/global setup reset and shutdown Prisma |
| Optional live provider | N/A | Not selected | Would require credentials, provider entitlement, and network | Not applicable | No external resources created |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Server ledger rows for GPT-5.6 accounting | Existing `gpt56-token-usage-accounting-graphql.e2e.test.ts` deterministic payloads and Prisma test DB | Unique run IDs; no user/shared DB | E2E `afterAll` deletes created run IDs; global test DB reset |
| Provider catalog fixtures | Built-in definitions and LLMFactory registration; no credentials | In-memory only; register only required definitions in test | `LLMFactory.resetForTests()` / process end |
| Media/host/credential fixtures | None required for this changed boundary | Existing broader run limitations are not mixed into pricing result | No fixture or secret cleanup needed |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Directly Usable — No Migration`.
- Design-spec and implementation-handoff references: `design-spec.md` persisted-data section; `implementation-handoff.md` persisted-data transition check; `REQ-004`, `AC-006`, `IR-002`, `CRR-002`.
- Representative existing-data setup and required behavior: Existing test ledger rows are append-only snapshots with the current model price; historical rows are read back through GraphQL without re-resolution.
- Evidence planned for the approved direct-use outcome: Run the GPT-5.6 server E2E with unique rows, verify current policy is applied to new rows and hydrated summaries return the stored result; confirm no migration or rewrite command is introduced.
- Migration-specific completion/recovery scenarios: `N/A`.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Exact GPT-5.6 rows/date/trust/standard/cache/tier and Opus 5/Sonnet pricing contracts | `AC-001`–`AC-004`, `AC-009`, `AC-013` | Still Valid | Implementation added/updated focused assertions; code review records 40 focused tests passing across 3 files | Rerun unchanged. |
| `autobyteus-ts/tests/unit/llm/api/anthropic-llm.test.ts` | Default/adaptive/sampling sanitization and old fixed-budget preservation | `AC-011`, `AC-012` | Still Valid | Implementation focused suite and source review | Rerun unchanged. |
| `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Factory registration, metadata 1M/128k, schemas, exact IDs, adapter construction | `AC-008`–`AC-010`, `AC-012` | Still Valid | Implementation focused suite and source review | Rerun unchanged. |
| `autobyteus-server-ts/tests/unit/token-usage/pricing/token-price-config-provider.test.ts` | Server provider-neutral mapping for Fable 5, Opus 4.8, Sonnet 5 cache dimensions | `AC-005`, `AC-009`, `AC-013` | Needs Update | Does not yet include new `claude-opus-5` or all GPT-5.6 rows | Add Opus 5 row to existing Anthropic matrix; keep Sonnet/older regressions. |
| `autobyteus-server-ts/tests/e2e/token-usage/gpt56-token-usage-accounting-graphql.e2e.test.ts` | Real server pricing -> calculator -> live message -> SQLite ledger -> GraphQL for GPT-5.6 Sol standard/long tiers | `AC-002`–`AC-006`, design spine `DS-001` | Needs Update | Direct real boundary, but registers/tests Sol only | Parameterize exact Sol/Terra/Luna rows and both tiers; retain persisted GraphQL convergence. |
| `autobyteus-server-ts/tests/unit/token-usage/pricing/token-cost-calculator.test.ts` | Generic component arithmetic and synthetic tier selection | `AC-005` contract regression | Still Valid | Provider facts are intentionally not embedded; generic tier/cache behavior passes per existing suite | Rerun unchanged. |
| Other server broader LLM/API/media E2E suites | Credentialed provider calls, hosts, fixtures, runtime surfaces | Not required by `AC-001`–`AC-013` | Out Of Scope | Existing handoff documents credential/host/media-fixture/network limitations and no server source change | Do not conflate failures with this change. |

## Stale Or Obsolete Coverage Decisions

No existing assertion is obsolete. The server provider matrix is incomplete for the newly required Opus 5 row and GPT-5.6 suffixes; it needs additive/parameterized coverage, not removal. No compatibility-only or promotion-expiry test should be added.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `API-PRICE-001` | Provider-neutral Anthropic price projection for exact Opus 5 | `AC-005`, `AC-009`, `AC-013`; `DS-003` | Update `autobyteus-server-ts/tests/unit/token-usage/pricing/token-price-config-provider.test.ts` | Ensures the current model reaches server consumers with all cache subtypes and preserves Sonnet/older rows. |
| `API-PRICE-002` | Provider-neutral GPT-5.6 standard/long-tier prices and costs for all suffixes | `AC-002`–`AC-006`; `DS-001` | Update `autobyteus-server-ts/tests/e2e/token-usage/gpt56-token-usage-accounting-graphql.e2e.test.ts` | Existing real E2E is the strongest in-repo evidence but previously only exercised Sol. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
 --- | --- | --- | --- | --- |
| `API-PRICE-001` | Server Anthropic pricing matrix | Add `claude-opus-5` exact `(5,25,0.5,6.25,10)` case | `AC-009`, `AC-013` | Keep Fable 5, Opus 4.8 and Sonnet 5 rows to prove older policy and durable standard pricing. |
| `API-PRICE-002` | GPT-5.6 accounting GraphQL E2E | Register all three exact models and run standard plus `>272K` table cases per suffix with expected prices/costs and GraphQL hydration | `AC-001`–`AC-006` | No new production source; test-only matrix expansion. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm exec vitest run tests/unit/llm/supported-model-definitions.test.ts tests/unit/llm/api/anthropic-llm.test.ts tests/integration/llm/llm-factory-metadata-resolution.test.ts --no-watch` | `autobyteus-ts` | Catalog, metadata, exact IDs/dates/prices, Anthropic request policy | Pass — 3 files / 40 tests | `/tmp/update-openai-model-pricing-api-evidence/01-autobyteus-ts-focused.log` |
| 2 | `pnpm install --offline --frozen-lockfile --ignore-scripts` | Worktree root | Restored missing workspace package links before server execution; lockfile unchanged | Pass — 11 workspace projects, 1412 packages linked from offline store | `/tmp/update-openai-model-pricing-api-evidence/00-dependency-setup.log` |
| 3 | `pnpm exec vitest run tests/unit/token-usage/pricing/token-price-config-provider.test.ts tests/unit/token-usage/pricing/token-cost-calculator.test.ts --no-watch` | `autobyteus-server-ts`, Prisma isolated SQLite setup | Provider-neutral Opus 5/Sonnet/older Anthropic mapping and generic calculator | Pass — 2 files / 12 tests | `/tmp/update-openai-model-pricing-api-evidence/02-server-pricing-unit.log` |
| 4 | `pnpm exec prisma generate --schema ./prisma/schema.prisma` | `autobyteus-server-ts` | Generated required Prisma client after offline install used `--ignore-scripts` | Pass | `/tmp/update-openai-model-pricing-api-evidence/03a-prisma-generate.log` |
| 5 | `pnpm exec vitest run tests/e2e/token-usage/gpt56-token-usage-accounting-graphql.e2e.test.ts --no-watch` | `autobyteus-server-ts`, isolated SQLite and in-process GraphQL | Real factory -> provider-neutral server pricing -> tier/cost calculation -> event/SQLite -> GraphQL for all 3 GPT-5.6 IDs and both tiers | Initial setup blocked before tests (Prisma client export); after generate, first matrix run had 2 precision assertion failures; local test assertion fix; final Pass — 1 file / 6 tests | `/tmp/update-openai-model-pricing-api-evidence/03-gpt56-server-e2e.log`, `03-gpt56-server-e2e-rerun.log`, `03-gpt56-server-e2e-final.log` |
| 6 | `pnpm exec vitest run tests/e2e/token-usage --no-watch` | `autobyteus-server-ts`, project Prisma E2E setup | Broader token-usage API/ledger/GraphQL regression coverage | Pass — 9 files / 22 tests | `/tmp/update-openai-model-pricing-api-evidence/05-token-usage-e2e-folder.log` |
| 7 | `pnpm -C autobyteus-server-ts build` | Worktree root; shared package build, Prisma generate, bootstrap smoke | TypeScript/Prisma/runtime packaging and sanitized built-in bootstrap | Pass (`BUILD_EXIT:0`) | `/tmp/update-openai-model-pricing-api-evidence/04-server-build-rerun.log` |
| 8 | Python active-doc contract check | Worktree root; three active `autobyteus-ts/docs` files | Required IDs/dates/pricing/Fast-mode notes and no stale active GPT-5.6 values | Pass | `/tmp/update-openai-model-pricing-api-evidence/07-active-docs-contract-final.log` |
| 9 | `git diff --check` | Worktree root | Patch hygiene | Pass (`DIFF_CHECK_EXIT:0`) | `/tmp/update-openai-model-pricing-api-evidence/06-git-diff-check.log` |

The first E2E attempt was an environment/setup issue caused by the offline dependency relink being run with scripts disabled; `prisma generate` resolved it. The first expanded matrix then exposed two test assertions that compared unrounded floating-point live-event costs exactly for Terra/Luna; the durable test was corrected to use `toBeCloseTo` for calculated costs while retaining exact price/tier assertions. The final rerun and broader folder rerun passed. Neither issue indicates a production-source defect.

## Post-Repository Confidence Scorecard (Completed)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | `98%` | 40 focused library tests, exact active-doc contract, server Opus 5 matrix, and six real GPT-5.6 server scenarios cover every critical price/date/identity/schema/request/cache/tier criterion. | No external provider completion or entitlement check. | Credentialed provider smoke could increase external confidence but is not required by the approved scope. |
| Changed-boundary execution directness | `98%` | Real `LLMFactory` lookup feeds `TokenPriceConfigProvider`, `TokenCostCalculator`, SQLite ledger, live event mapper, and GraphQL hydration for Sol/Terra/Luna standard and long tiers. | Anthropic server matrix is unit-level rather than a live Messages call. | Credentialed Anthropic call would exercise remote transport only. |
| Cross-boundary integration realism and mock gap | `95%` | Isolated Prisma/SQLite and GraphQL E2E use real server components; no pricing mock bypasses the changed server boundary. | Provider network and remote response normalization remain outside the deterministic catalog contract. | Optional live provider call. |
| Environment, configuration, identity, and fixture fidelity | `95%` | Project Vitest/Prisma setup, all 21 migrations, generated client, deterministic unique run IDs, and successful server build/bootstrap smoke. | External account entitlement, host access, media fixtures, and network are not available/needed. | Credentialed/hosted environment run. |
| Failure, edge-case, lifecycle, and recovery evidence | `92%` | Standard vs `>272K`, cache read/write components, low decimal prices, persisted readback, broader token-usage suite, and cleanup hooks pass. | No remote provider error/retry or process restart path is material to this static catalog update. | Provider error/retry validation only if scope expands. |
| User-surface, browser, and desktop-shell confidence | `N/A` | No frontend, browser, renderer, Electron, or desktop-shell file changed. | None applicable. | None. |
| Durable regression coverage quality and relevance | `95%` | Updated provider-neutral server matrix and GPT-5.6 API/GraphQL matrix are bounded, requirement-linked, and 9-file/22-test token-usage regression passes. | Separate proportional test-code review remains pending. | `code_reviewer` proportional test review. |

- Overall post-repository confidence: `95.5%` (applicable-category simple average; rounded to `96%` in the execution report)
- Calculation method: Simple average of the six applicable categories; `N/A` excluded.
- Every critical acceptance criterion directly proven: `Yes` for deterministic/in-scope criteria; live provider entitlement is explicitly out of scope.
- Any applicable category below `90%`: `No`
- Default clean-confidence target of `95%` met: `Yes`
- Material residual risks: Credentialed OpenAI/Anthropic calls, provider entitlement, host availability, media-fixture availability, and external network were not exercised. They are separately classified environment limitations, not changed-source defects. Browser/Electron is not applicable.

## Broader Validation Decision (Completed)

- Decision: `Required`, completed as `Live API` through the existing server GraphQL/Prisma E2E in an isolated SQLite database.
- Specific confidence gap addressed: the existing durable E2E covered GPT-5.6 Sol only; Terra/Luna and all exact server tier/cost projections needed direct coverage. The server provider matrix also lacked Opus 5.
- Why this mode materially improved confidence: it exercised factory lookup, server provider adaptation, cache/tier selection, cost calculation, persisted ledger readback, live event mapping, and GraphQL hydration without external credentials.
- Final confidence after validation: `95.5%` applicable average / `96%` rounded; no applicable category below `90%`.
- Browser-specific decision: `Not Required`; no frontend or desktop behavior changed.
- External live provider decision: `Not Required` for Pass; deterministic request-shape tests and catalog contracts are the approved evidence, while credentials/entitlement remain unclaimed.
- Startup/setup: Vitest global setup reset the isolated SQLite database and applied all 21 migrations; E2E initialized Prisma, registered three exact GPT-5.6 definitions, built GraphQL schema, appended unique rows, and shut down Prisma in hooks.
- Environment choices: worktree-local pnpm dependencies, generated Prisma client, no shared database, no provider keys, no external API calls.
- Seed data and identity: synthetic token usage rows with standard/long inputs, cache read/write counts, output counts, exact model IDs; no authentication/session state.
- Evidence captured: focused Vitest logs, server provider unit logs, six-case GraphQL E2E log, 9-file token-usage folder log, build log, docs check, diff check.
- Cleanup: test hooks removed unique rows and shut down Prisma; no long-lived server/browser process or external resource was created.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: `N/A`
- Relevant README or development instructions: `N/A`
- Web-equivalent behavior: `N/A`
- Shell-specific or lifecycle behavior: `N/A`
- Chosen validation approach: no desktop/browser run; no changed surface.
- Server/frontend setup: `N/A`
- Effect on any already-running desktop application: `None`
- Behavior not directly proven and confidence consequence: none in scope.

## Live Environment And Fixture Plan

- Startup order and commands: offline workspace relink -> Prisma generate -> server Vitest global setup -> focused unit/E2E -> broader token-usage E2E -> server build.
- Health/readiness checks: Vitest process readiness, Prisma migration reset success, GraphQL query completion, and all test assertions.
- Seed data/fixtures: unique deterministic run IDs; no external fixture files or media.
- Test identities/authentication/permissions: none.
- Requirement-linked journeys: `API-PRICE-001` Opus 5 provider mapping; `API-PRICE-002` all GPT-5.6 suffixes and tiers through GraphQL.
- Evidence to capture: exact prices/tier IDs, component costs, live event fields, hydrated GraphQL unit prices, test/build logs.
- Owned processes/state to clean: Vitest workers and test SQLite; hooks/global setup manage them.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| None | No standalone temporary probe was needed; all material evidence was promoted to existing durable server tests. | N/A | N/A |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Credentialed OpenAI/Anthropic live completions and entitlement | No credentials supplied; requirements permit deterministic catalog/request-shape proof | Remote account/model availability and actual provider response remain unproven | Report separately; no reroute for this scope |
| Existing broader LLM host/media-fixture/network run | Handoff records unrelated environment-dependent limitations | No evidence about those external integrations | Do not classify as this change's failure; rerun only if a focused requirement needs it |
| Electron shell/browser | No UI/shell code changed | None material | Out of scope |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
 | --- | --- | --- | --- |
| Initial Prisma ESM import setup failure | `Local Fix` | Offline install used `--ignore-scripts`; explicit `prisma generate` restored generated client and final E2E passed | `api_e2e_engineer` (resolved) |
| Initial Terra/Luna exact floating-point event-cost assertions | `Local Fix` | Two test cases failed only on binary representation; exact tier/price assertions passed; `toBeCloseTo` corrected cost assertions and final 6/6 passed | `api_e2e_engineer` (resolved) |
| No product/design/requirement mismatch | `N/A` | Requirements, design, implementation, and focused execution agree | `N/A` |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` — completed.
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — two existing server test paths updated; no removals.
- Post-repository confidence: `95.5%` applicable average (`96%` rounded)
- Broader validation decision: `Required` — completed as isolated server Live API/GraphQL E2E; browser not required.
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Final result is `Pass`. Return the cumulative package to `code_reviewer` for separate proportional test-code review of the two updated durable server tests. Classify provider credentials/host/media-fixture/network limitations separately from the passed focused result.
