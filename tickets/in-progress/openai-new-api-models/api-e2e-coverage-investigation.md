# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models/tickets/in-progress/openai-new-api-models/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models/tickets/in-progress/openai-new-api-models/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models/tickets/in-progress/openai-new-api-models/design-spec.md`
- Supplemental Solution Artifacts: None.
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models/tickets/in-progress/openai-new-api-models/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models/tickets/in-progress/openai-new-api-models/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models/tickets/in-progress/openai-new-api-models/code-review-report.md`
- Current Investigation Round: `1`
- Trigger: Source-review pass at implementation commit `b95c795b37eed8d510fa02d7ea16f2e8d4605e61`, followed by the user's direction to copy the main-repository `.env.test` credential into the worktree and attempt live testing.
- Prior Investigation Reviewed: None.
- Latest Authoritative Investigation: `1` (this canonical file; to be updated with execution results).

## Current Requirement And Design Basis

Validation must prove `REQ-001` through `REQ-010` and `AC-001` through `AC-012`: exactly three canonical entitlement-neutral GPT-5.6 OpenAI catalog rows; official limits, reasoning schema, standard/cache-read/cache-write/output prices and two `272,000`-token tiers; unchanged `LLMFactory -> OpenAILLM -> OpenAIResponsesLLM` invocation; one-time normalization of raw `cache_write_tokens`; server-authoritative component decomposition and costing without double counting; convergence of live `TOKEN_USAGE_UPDATED` and ledger-backed GraphQL summaries; and the existing Token Meter's positive, zero/absent, and mixed/missing generic write states. The reviewed write-only state's empty neighboring `Cache hits` row remains an accepted observation. Live success is explicitly entitlement-conditional under `AC-010`.

The implementation handoff reports no compatibility seam and a persisted-data outcome of `Not Affected`. Validation must not add alias, fallback, legacy, migration, provider-specific server/frontend, or browser-side pricing behavior.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Sol/Terra/Luna static OpenAI catalog rows and exact IDs | Added | `REQ-001`, `AC-002`, implementation handoff | Execute catalog/factory/model-info tests and live exact-ID probes. |
| GPT-5.6 limits and family-only reasoning `max`, default `medium` | Added | `REQ-002`, `REQ-003`, `AC-004`, `AC-005` | Retain focused catalog/metadata/request coverage; attempt one live `max` request. |
| Standard and `>272K` read/write/input/output pricing | Added | `REQ-004`, `REQ-005`, `AC-006` | Add a real-catalog server accounting pipeline test for both tiers and exact component costs. |
| OpenAI nested cache-write normalization | Changed | `REQ-006`, `AC-008` | Retain focused normalizer coverage; seek entitled raw provider usage without fabricating it. |
| Server live event, ledger, GraphQL, and frontend store propagation | Preserved but newly exercised with GPT-5.6 generic writes | `REQ-010`, `AC-011` | Exercise the real generic server accounting/persistence/query owners and strengthen explicit live/hydrated store convergence assertions. |
| Token Meter generic write disclosure and non-numeric edge states | Preserved | `AC-012`, implementation/code-review reports | Retain focused Nuxt component coverage. Browser execution is not automatically required because production UI did not change. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Catalog facts and provider-normalized cache-write observation | Focused `autobyteus-ts` tests | Actual server tier/component/cost composition using the new real catalog | Server integration/E2E |
| API / transport / contract | Yes | Canonical Responses ID and raw usage field; preserved server live/GraphQL fields | Request payload, normalizer, server GraphQL tests | Provider entitlement/raw payload; full new-model live/ledger convergence | Live API plus server GraphQL E2E |
| Frontend component / state | Yes, preserved owner | Existing generic store/panel contract | Store and Token Meter tests | Existing convergence test asserts only price shape explicitly | Focused durable store assertion update |
| Browser integration / user journey | No production change | Existing Token Meter disclosure | Nuxt DOM component test with accessible toggle | Negligible CSS/layout-only uncertainty | Browser only if repository evidence leaves a material gap |
| Authentication / session / permissions | Yes, external only | OpenAI account entitlement | Authenticated model-list and Responses probes | Successful entitled execution may remain unavailable | Live API |
| Desktop renderer / web-equivalent UI | Preserved | Nuxt renderer component | Nuxt component test | No shell or browser API changed | None unless final confidence is below target |
| Desktop shell / Electron-specific integration | No | None | N/A | None | None |
| Process / lifecycle | No material change | None | Existing server setup/cleanup | None | None |
| Persisted-data transition | No (`Not Affected`) | Additive catalog and existing optional ledger columns | Existing ledger tests | No migration applies | Ledger direct-use check |
| Worker / queue / distributed coordination | No | None | N/A | None | None |
| External integration | Yes | OpenAI Models/Responses API | Deterministic request tests | Entitlement and real `cache_write_tokens` payload | Live API |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models` on `codex/openai-new-api-models`.
- Project type and runtime stack: pnpm TypeScript workspace; `autobyteus-ts` model/provider library; Fastify/TypeGraphQL/Prisma/SQLite server; Nuxt/Vue/Pinia frontend; Vitest suites.
- Conflicting, missing, or unclear project instructions: None material. The worktree initially lacked `.env.test`; on explicit user direction, main-repository `autobyteus-ts/.env.test` and `autobyteus-server-ts/.env.test` were copied with mode `0600`. Both are ignored by their project `.gitignore` files. Secret values are not recorded.
- Required environment variables or secrets available: `Yes` for `OPENAI_API_KEY`; the credential is valid but the first fresh probes remain unentitled to GPT-5.6.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Closest server test instruction | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`; integration directory is supported. |
| `autobyteus-server-ts/README.md` | Server setup/test authority | Tests use `.env.test` and temporary SQLite under `tests/.tmp`; build and targeted/full Vitest commands documented. |
| `autobyteus-server-ts/vitest.config.ts` | Server test runner | Fork pool, serial files, Prisma global setup, `tests/**/*.test.ts`. |
| `autobyteus-web/AGENTS.md` | Closest frontend instruction | Never broad-stage; run Nuxt tests with `--run`. |
| `autobyteus-web/README.md` | Browser/web development and test authority | Browser dev uses separate server and `pnpm dev`; focused component tests use `pnpm test:nuxt <path> --run`. |
| `autobyteus-ts/vitest.config.ts` and `tests/setup.ts` | Library test runner/environment | Loads `.env.test`; focused Vitest command supported; `20s` default timeout. |
| `package.json` files | Script authority | Build `autobyteus-ts`, server shared packages, and Nuxt test scripts via pnpm workspace commands. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| OpenAI API | `autobyteus-ts` | Load ignored `.env.test`; authenticated HTTPS probes | Non-destructive minimal Responses calls only; never print key | HTTP response plus filtered `/v1/models` | No local process; retain sanitized evidence only |
| Server test DB/GraphQL | repository root via `-C autobyteus-server-ts` | Project Vitest command invokes Prisma global setup | Uses isolated test SQLite/fixtures | Vitest setup and schema build | Tests delete created ledger rows; global setup owns DB |
| Nuxt component/store tests | repository root via `-C autobyteus-web` | `pnpm --dir autobyteus-web test:nuxt ... --run` | Existing `.nuxt` metadata is present from implementation setup | Vitest pass | Test process exits; no persistent data |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| OpenAI credential | Ignored `autobyteus-ts/.env.test` copied from main repo | Secret omitted from output/artifacts | Leave ignored worktree file for this task; never commit |
| Synthetic GPT-5.6 usage | `createTokenUsageUpdatedPayload`, component resolver, real catalog price provider | Deterministic non-provider fixture; exact gross/read/write/output components | Test-local only |
| Ledger-backed run | UUID run ID and `TokenUsageLedgerStore` | Test DB only | Delete by run ID in `afterAll` |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`.
- Design-spec and implementation-handoff references: `Persisted Data / State Transition Decision`; implementation handoff `Persisted Data Transition Check`.
- Representative existing-data setup and required behavior: existing generic optional cache-creation ledger fields accept new GPT-5.6 events without schema or migration changes.
- Evidence planned: append a newly priced generic-write event through the existing store and hydrate it through the existing GraphQL query; verify exact values survive the current reader.
- Migration-specific scenarios: N/A.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Exact IDs/no alias, schema, standard/tier/cache prices | `REQ-001`-`005`; `AC-002`, `003`, `005`, `006` | Still Valid | Public-result assertions use all three rows and both tiers | Rerun |
| `autobyteus-ts/tests/unit/llm/metadata/model-metadata-resolver.test.ts` | Curated 1.05M/128K limits | `REQ-002`, `AC-004` | Still Valid | Direct metadata boundary | Rerun |
| `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Discovery/factory resolution | `REQ-001`, `REQ-007`, `REQ-008`; `AC-002`, `007` | Still Valid | Real factory public API | Rerun |
| `autobyteus-ts/tests/unit/llm/api/provider-native-request-payloads.test.ts` | Responses canonical ID and `reasoning.effort=max` | `REQ-003`, `REQ-007`; `AC-007` | Still Valid | Provider request boundary intercepted below network | Rerun |
| `autobyteus-ts/tests/unit/llm/api/token-usage-normalizers.test.ts` | Responses/Chat/top-level write mapping, nested zero precedence, absent null | `REQ-006`, `AC-008` | Still Valid | Direct adapter output | Rerun |
| `autobyteus-server-ts/tests/unit/token-usage/pricing/token-cost-calculator.test.ts` | Generic write price and generic tier selection separately | `REQ-004`, `REQ-005`, `AC-006` | Still Valid but insufficient alone | Uses synthetic policies and does not combine GPT-5.6 read/write/output tiers | Retain and add cross-owner integration coverage |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts` | Generic write unit prices survive ledger/GraphQL | `AC-011` | Still Valid | Real Prisma/GraphQL boundary, manually pre-priced events | Rerun; new test will add real catalog/calculator input |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Generic tokens/costs survive ledger/GraphQL | `AC-011` | Still Valid | Existing generic persistence/query owner | Rerun focused relevant suite |
| `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` | Live and hydrated unit-price shape convergence | `AC-011` | Needs Update | Relevant scenario asserts `unitPrices` only, not the full required write token/cost/input/total tuple | Strengthen existing scenario explicitly |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Positive generic write row/details, zero/absent hiding, mixed status, accessible toggle; accepted empty hit neighbor | `REQ-010`, `AC-012` | Still Valid | Direct rendered DOM assertions against server-owned values | Rerun; no production browser-price calculation |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Real runtime WebSocket event and GraphQL persistence for available runtimes | General `AC-011` boundary | Out Of Scope for mandatory execution | Environment-gated and cannot select unavailable GPT-5.6; new focused deterministic E2E directly covers changed accounting boundary | Do not run expensive unrelated live runtimes |

## Stale Or Obsolete Coverage Decisions

None. No test asserts an obsolete alias, fallback, schema, or compatibility path.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `APIE2E-001` | Real GPT-5.6 catalog -> server component basis -> both pricing tiers -> live event serialization -> ledger -> GraphQL, including no double counting | `REQ-004`, `REQ-005`, `REQ-010`; `AC-006`, `AC-011`; DS accounting spine | `autobyteus-server-ts/tests/e2e/token-usage/gpt56-token-usage-accounting-graphql.e2e.test.ts` | Existing tests prove these owners separately or with synthetic/manual prices, not as the composed new-model contract. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `APIE2E-002` | `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` live/hydrated convergence scenario | Explicitly assert generic write tokens, generic unit price, write cost, input cost, total cost, and equality after hydration | `AC-011` | Test-only strengthening; no production change. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm --dir autobyteus-ts exec vitest run` with the five focused GPT-5.6 files | worktree; ignored `.env.test` present | Catalog, metadata, factory, request, normalizer | Pass — 5 files, 36 tests | `evidence/autobyteus-ts-gpt56-focused.log` |
| 2 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage/gpt56-token-usage-accounting-graphql.e2e.test.ts --no-watch` | worktree; Prisma generated from the project schema | Real catalog -> component basis -> delta -> standard/long tier costs -> live mapper -> ledger -> GraphQL | Pass — 1 file, 2 tests | `evidence/server-gpt56-accounting-e2e.log`; environment setup `evidence/server-prisma-generate.log` |
| 3 | `pnpm --dir autobyteus-web test:nuxt --run` for store and Token Meter | worktree; Nuxt Vitest | Live/hydrated store plus rendered positive/zero/mixed states | Pass — 2 files, 19 tests | `evidence/web-token-usage-focused.log` |
| 4 | `pnpm --dir autobyteus-ts build`; `pnpm --dir autobyteus-server-ts build`; `pnpm --dir autobyteus-web build` | worktree | Library, server, and browser production builds | Pass | `evidence/autobyteus-ts-build.log`, `evidence/autobyteus-server-ts-build.log`, `evidence/autobyteus-web-build.log` |
| 5 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/token-usage tests/integration/token-usage tests/e2e/token-usage --no-watch` | worktree; project test SQLite | Broader accounting/projection/persistence/API regression | Pass — 15 files, 53 tests | `evidence/server-token-usage-full-suite.log` |
| 6 | `pnpm --dir autobyteus-web test:nuxt --run` for all six token-usage store/component files | worktree; Nuxt Vitest | Broader user-surface/accounting regression | Pass — 6 files, 27 tests | `evidence/web-token-usage-affected-suite.log` |

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 96% | Every deterministic requirement has direct focused or composed repository evidence; conditional `AC-010` evidence is planned/retained separately | No entitled success/raw cache payload | Entitled provider smoke |
| Changed-boundary execution directness | 98% | Exact catalog rows, request shape, normalizer, real catalog server pricing, live mapper, ledger, GraphQL, store, and rendered component execute | Provider success path unavailable | Entitled live response |
| Cross-boundary integration realism and mock gap | 96% | New E2E uses real catalog pricing owners, Prisma, GraphQL schema, event mapper, and production projections; Nuxt store/component execute | Provider raw usage remains deterministic rather than captured live | Entitled raw usage |
| Environment, configuration, identity, and fixture fidelity | 92% | Project instructions, generated Prisma client, project test SQLite, production builds, and copied ignored credential are used | Repository score excludes the separate live entitlement result | Authenticated live probe |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Nested zero precedence, absent writes, zero/mixed UI, standard/long tier boundary, no double counting, ledger direct use, and cleanup pass | No provider-side successful cache write/read lifecycle | Entitled repeated-prefix probe |
| User-surface, browser, and desktop-shell confidence | 96% | Direct Nuxt DOM assertions operate the accessible toggle and all required states; web production build passes; no renderer production change | No manual pixel/browser journey | Browser would add negligible evidence for unchanged production logic |
| Durable regression coverage quality and relevance | 98% | One narrow composed server E2E and one focused store scenario close identified gaps; broader affected suites pass | External entitlement cannot be made durable | None within CI scope |

- Overall post-repository confidence: `95.9%`.
- Calculation method: simple mean of seven applicable categories.
- Every critical acceptance criterion directly proven: `Yes`, interpreting `AC-010` exactly as written: deterministic live success is conditional, while the official contract and exact entitlement outcome must be preserved when unavailable.
- Any applicable category below `90%`: `No`.
- Default clean-confidence target of `95%` met: `Yes`.
- Material residual risks: provider success and raw `cache_write_tokens` remain entitlement-limited; no material internal repository boundary remains unproven.

## Broader Validation Decision

- Decision: `Required`.
- Selected execution mode: `Live API` plus realistic repository server/GraphQL execution.
- Specific confidence gap or residual risk addressed: current account entitlement, exact provider error behavior, possible real raw `cache_write_tokens`, and composed server/GraphQL behavior with the new catalog.
- Why the selected mode can materially improve confidence: it executes both the external contract boundary and the real internal accounting/persistence/query owners rather than relying only on declarations or mocks.
- Expected confidence after selected validation: at least `95%` if all critical deterministic paths pass and the entitlement exception matches `AC-010`.
- Browser-specific decision and rationale: `Not Required`. No frontend production code, browser API, routing, styling contract, or client-side pricing owner changed. Focused Nuxt DOM coverage directly renders the positive, zero/absent, and mixed states, operates the accessible disclosure, and the production web build passes. A manual browser run would add negligible changed-boundary evidence.
- If Blocked: N/A. The provider entitlement exception is an approved conditional result, not a blocker to the deterministic acceptance criteria.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapper around Nuxt.
- Relevant instructions: `autobyteus-web/README.md`, `autobyteus-web/AGENTS.md`.
- Web-equivalent behavior: Token Meter renderer/store only.
- Shell-specific or lifecycle behavior: None changed.
- Chosen validation approach: Nuxt component/store tests; no Electron launch.
- Effect on any already-running desktop application: None.
- Behavior not directly proven: visual pixel layout in a packaged shell; negligible because production renderer code is unchanged.

## Live Environment And Fixture Plan

- Startup order and commands: no persistent service for provider probes; run authenticated `/v1/models`, then minimal `/v1/responses` for all three exact IDs, using `reasoning.effort=max` for Sol and `none` for Terra/Luna. If any succeeds, send two low-cost >1024-token Luna-or-cheapest repeated-prefix requests with `prompt_cache_key` and preserve raw `usage` only.
- Environment choices: ignored `autobyteus-ts/.env.test`; `store=false`; `max_output_tokens=16`; no secret or response text in evidence.
- Health / readiness checks: authenticated model-list HTTP status.
- Seed data / fixtures: deterministic repeated `cacheprobe` prefix only if entitled.
- Test identities/permissions: configured OpenAI API organization; entitlement result recorded exactly.
- Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models/tickets/in-progress/openai-new-api-models/evidence/live-openai-gpt56-2026-07-10.json` (secret omitted).
- Owned processes/state to clean up: none for live HTTPS; server tests own UUID ledger rows and test DB.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `LIVE-001` | Authenticated filtered `GET /v1/models` | Current account listing/credential validity | Entitlement is account/time dependent. |
| `LIVE-002` | Minimal Responses POST for each exact ID | Exact provider acceptance or exact entitlement failure | Must not hard-fail CI for rollout access. |
| `LIVE-003` | Conditional repeated-prefix Responses calls | Seek real `cache_write_tokens`/`cached_tokens` usage | Requires entitlement and incurs external cost; raw fixture belongs in evidence, not CI. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Successful entitled GPT-5.6 response and real raw cache-write payload | Initial fresh credential probe returned no GPT-5.6 models and HTTP 404 `model_not_found` for all exact IDs; conditional cache probe therefore did not run | Bounded external rollout uncertainty explicitly allowed by `AC-010` | Later entitled smoke; no production/test patch. |

## Ambiguities Or Reroute Triggers

None currently. A materially different expectation for the write-only empty `Cache hits` neighbor would be `Design Impact` to `solution_designer`, not an API/E2E local patch.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`.
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — one server E2E added; one frontend store scenario strengthened; none removed.
- Post-repository confidence: `95.9%`.
- Broader validation decision: `Required` (official-contract/live API); browser `Not Required`.
- Reroute Required Before Validation Execution: `No`.
- Recommended Recipient If Reroute Required: N/A.
- Notes: Repository execution passed. Fresh live evidence confirms the copied credential is valid (model list HTTP 200) but unentitled (three exact 404 `model_not_found` responses), satisfying the conditional evidence branch of approved `AC-010` without claiming live success.
