# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/openai-new-api-models/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/openai-new-api-models/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/openai-new-api-models/design-spec.md`
- Supplemental Solution Artifacts: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/openai-new-api-models/codex-cache-write-probe.md` (`Complete — factual evidence`).
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/openai-new-api-models/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/openai-new-api-models/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/openai-new-api-models/code-review-report.md`
- Current Investigation Round: `2`
- Trigger: Revised `REQ-011`, `AC-013`, `AC-014`, `DS-006`, supplemental Codex probe, reconciliation commit `96f73433a5ddc5e05d343b04d3852d1825b90234`, handoff commit `df071972`, and source-review round-2 pass.
- Prior Investigation Reviewed: `1` — useful reconciliation evidence, superseded as a final gate by the Codex observability scope expansion.
- Latest Authoritative Investigation: `2` (this canonical file; current results are final for this stage).

## Investigation Round History

| Round | Trigger | Durable Coverage Decision | Broader Validation Decision | Result / Status | Latest Authoritative |
| --- | --- | --- | --- | --- | --- |
| `1` | Original GPT-5.6 direct-API/catalog/accounting scope | Added composed server E2E; strengthened frontend convergence | Official/live API required; browser not required | Historical pass at 96.3%; superseded by requirement expansion | No |
| `2` | Codex source-truth/no-fabrication expansion | Existing reconciliation tests remain valid; no API/E2E-authored durable change needed | Generated Codex protocol plus repeated official/live/API/repository execution required and completed | Pass at 96.6%; no design-impact drift | Yes |

## Current Requirement And Design Basis

Validation must prove `REQ-001` through `REQ-011` and `AC-001` through `AC-014`: exactly three canonical entitlement-neutral GPT-5.6 OpenAI catalog rows; official limits, reasoning schema, standard/cache-read/cache-write/output prices and two `272,000`-token tiers; unchanged `LLMFactory -> OpenAILLM -> OpenAIResponsesLLM` invocation; one-time normalization of direct-API raw `cache_write_tokens`; server-authoritative component decomposition and costing without double counting; convergence of live `TOKEN_USAGE_UPDATED` and ledger-backed GraphQL summaries; and the existing Token Meter's positive, zero/absent, and mixed/missing generic write states. The reviewed write-only state's empty neighboring `Cache hits` row remains accepted. Live direct-API success is entitlement-conditional under `AC-010`.

Round 2 adds a distinct Codex app-server contract. Current `ThreadTokenUsage.total`/`last` source records must contain only observed input/cache-read/output/reasoning/total fields; `raw_usage_json` must retain the selected upstream record; `raw_event_json.tokenUsage` must retain both upstream records; and AutoByteus-injected `raw_event_json.autobyteus_cumulative_snapshot_provider_delta_tokens` must be identified as reconciliation metadata rather than mistaken for an upstream field. With no generated cache-write field, canonical cache creation remains `null`; gross-minus-read is standard remainder, never an inferred write; a trusted write unit price alone produces no write cost or Token Meter row. A current generated write field would be `Design Impact`, not a local mapping.

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
| Codex app-server cache-write source truth | Preserved and explicitly constrained | `REQ-011`, `AC-013`, `AC-014`, `DS-006`, `codex-cache-write-probe.md` | Regenerate both supported Codex TypeScript protocols; re-run resolver/backend no-fabrication coverage; distinguish upstream records from injected reconciliation metadata. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Catalog facts and provider-normalized cache-write observation | Focused `autobyteus-ts` tests | Actual server tier/component/cost composition using the new real catalog | Server integration/E2E |
| API / transport / contract | Yes | Canonical Responses ID/raw usage plus separate Codex `thread/tokenUsage/updated` generated contract | Request/normalizer, Codex resolver/backend, server GraphQL tests | Provider entitlement/raw direct payload; possible generated Codex protocol drift | Live API, generated protocol, server GraphQL E2E |
| Frontend component / state | Yes, preserved owner | Existing generic store/panel contract | Store and Token Meter tests | Existing convergence test asserts only price shape explicitly | Focused durable store assertion update |
| Browser integration / user journey | No production change | Existing Token Meter disclosure | Nuxt DOM component test with accessible toggle | Negligible CSS/layout-only uncertainty | Browser only if repository evidence leaves a material gap |
| Authentication / session / permissions | Yes, external only | OpenAI account entitlement | Authenticated model-list and Responses probes | Successful entitled execution may remain unavailable | Live API |
| Desktop renderer / web-equivalent UI | Preserved | Nuxt renderer component | Nuxt component test | No shell or browser API changed | None unless final confidence is below target |
| Desktop shell / Electron-specific integration | No | None | N/A | None | None |
| Process / lifecycle | No material change | None | Existing server setup/cleanup | None | None |
| Persisted-data transition | No (`Not Affected`) | Additive catalog and existing optional ledger columns | Existing ledger tests | No migration applies | Ledger direct-use check |
| Worker / queue / distributed coordination | No | None | N/A | None | None |
| External integration | Yes | OpenAI Models/Responses API and installed Codex app-server protocol | Deterministic request/Codex tests | Entitlement, real direct `cache_write_tokens`, or new Codex write field | Live API plus protocol generation |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models` on `codex/openai-new-api-models`.
- Project type and runtime stack: pnpm TypeScript workspace; `autobyteus-ts` model/provider library; Fastify/TypeGraphQL/Prisma/SQLite server; Nuxt/Vue/Pinia frontend; Vitest suites.
- Conflicting, missing, or unclear project instructions: None material. The worktree initially lacked `.env.test`. On explicit user direction, the main-repository `autobyteus-ts/.env.test` was copied temporarily with mode `0600`; it is ignored by project Git rules, its secret was never recorded, and it was removed after the live probe. Server tests used their project-owned isolated Prisma setup without retaining an environment copy.
- Required environment variables or secrets available: `Yes` for `OPENAI_API_KEY`; the credential is valid but the round-2 fresh probes remain unentitled to GPT-5.6.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Closest server test instruction | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`; integration directory is supported. |
| `autobyteus-server-ts/README.md` | Server setup/test authority | Tests use `.env.test` and temporary SQLite under `tests/.tmp`; build and targeted/full Vitest commands documented. |
| `autobyteus-server-ts/vitest.config.ts` | Server test runner | Fork pool, serial files, Prisma global setup, `tests/**/*.test.ts`. |
| `autobyteus-web/AGENTS.md` | Closest frontend instruction | Never broad-stage; run Nuxt tests with `--run`. |
| `autobyteus-web/README.md` | Browser/web development and test authority | Browser dev uses separate server and `pnpm dev`; focused component tests use `pnpm test:nuxt <path> --run`. |
| `autobyteus-ts/vitest.config.ts` and `tests/setup.ts` | Library test runner/environment | Loads `.env.test`; focused Vitest command supported; `20s` default timeout. |
| `package.json` files | Script authority | Build `autobyteus-ts`, server shared packages, and Nuxt test scripts via pnpm workspace commands. |
| `codex-cache-write-probe.md` and current Codex CLI help | Round-2 external protocol procedure | Run `codex app-server generate-ts --experimental --out <temporary-dir>` for PATH and Codex.app resource binaries; compare exact generated `TokenUsageBreakdown` and `ThreadTokenUsage`; remove temp trees. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| OpenAI API | `autobyteus-ts` | Load ignored `.env.test`; authenticated HTTPS probes | Non-destructive minimal Responses calls only; never print key | HTTP response plus filtered `/v1/models` | No local process; retain sanitized evidence only |
| Server test DB/GraphQL | repository root via `-C autobyteus-server-ts` | Project Vitest command invokes Prisma global setup | Uses isolated test SQLite/fixtures | Vitest setup and schema build | Tests delete created ledger rows; global setup owns DB |
| Nuxt component/store tests | repository root via `-C autobyteus-web` | `pnpm --dir autobyteus-web test:nuxt ... --run` | Existing `.nuxt` metadata is present from implementation setup | Vitest pass | Test process exits; no persistent data |
| Codex generated protocol | temporary directory | PATH and Codex.app binaries run `app-server generate-ts --experimental` | Point-in-time external contract; no repository install/update | Exact versions, file counts, fields, write-key search | Remove both generated trees immediately |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| OpenAI credential | Ignored `autobyteus-ts/.env.test` copied temporarily from main repo | Secret omitted from output/artifacts | Removed immediately after round-2 live probe; never commit |
| Synthetic GPT-5.6 usage | `createTokenUsageUpdatedPayload`, component resolver, real catalog price provider | Deterministic non-provider fixture; exact gross/read/write/output components | Test-local only |
| Ledger-backed run | UUID run ID and `TokenUsageLedgerStore` | Test DB only | Delete by run ID in `afterAll` |
| Codex upstream/reconciliation fixture | Existing `thread/tokenUsage/updated` total/last fixture and backend pipeline fixture | Source `tokenUsage`/`raw_usage_json` keys are kept distinct from AutoByteus-injected provider-delta metadata | Test-local only |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`.
- Design-spec and implementation-handoff references: `Persisted Data / State Transition Decision`; implementation handoff `Persisted Data Transition Check`.
- Representative existing-data setup and required behavior: existing generic optional cache-creation ledger fields accept new GPT-5.6 events without schema or migration changes.
- Evidence executed: appended both standard and `>272K` newly priced generic-write events through the existing store and hydrated them through the existing GraphQL query; exact values survived the current reader.
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
| `autobyteus-server-ts/tests/e2e/token-usage/gpt56-token-usage-accounting-graphql.e2e.test.ts` | Direct-API-style generic write event passes both tiers/live/ledger/GraphQL | `REQ-004`, `005`, `010`; `AC-006`, `011` | Still Valid | Round-1 durable composed boundary remains current | Rerun |
| `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` | Live and hydrated full generic write accounting convergence | `AC-011` | Still Valid | Round-1 scenario now asserts tokens, unit price, write/input/total costs | Rerun |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Positive generic write row/details, zero/absent hiding, mixed status, accessible toggle; accepted empty hit neighbor | `REQ-010`, `AC-012` | Still Valid | Direct rendered DOM assertions against server-owned values | Rerun; no production browser-price calculation |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` | Upstream total/last and selected raw usage have no write key; injected provider-delta metadata contains explicit canonical null | `REQ-011`, `AC-013`, `AC-014`, `DS-006` | Still Valid, subject to generated-protocol gate | Assertions distinguish `tokenUsage` and `raw_usage_json` from injected metadata | Rerun after protocol generation |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts` | Input 10/read 4 derives standard 6; cache creation null; known 6.25 write price creates no write cost | `REQ-011`, `AC-014`, `DS-006` | Still Valid | Full backend enrichment assertion proves no remainder inference/no billing | Rerun after protocol generation |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Real runtime WebSocket event and GraphQL persistence for available runtimes | General `AC-011` boundary | Out Of Scope for mandatory execution | Environment-gated and cannot select unavailable GPT-5.6; new focused deterministic E2E directly covers changed accounting boundary | Do not run expensive unrelated live runtimes |

## Stale Or Obsolete Coverage Decisions

None. No test asserts an obsolete alias, fallback, schema, or compatibility path.

## Durable Coverage To Add

Round-2 decision: `None`. The table below records the completed historical round-1 addition. Current generated-protocol evidence and both focused reconciliation suites close the new contract; no protocol drift was found.

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `APIE2E-001` | Real GPT-5.6 catalog -> server component basis -> both pricing tiers -> live event serialization -> ledger -> GraphQL, including no double counting | `REQ-004`, `REQ-005`, `REQ-010`; `AC-006`, `AC-011`; DS accounting spine | `autobyteus-server-ts/tests/e2e/token-usage/gpt56-token-usage-accounting-graphql.e2e.test.ts` | Existing tests prove these owners separately or with synthetic/manual prices, not as the composed new-model contract. |

## Durable Coverage To Update

Round-2 API/E2E-authored decision: `None`. The table below records the completed historical round-1 update. The two Codex suite changes are upstream reconciliation coverage already present at round-2 entry and are confirmed `Still Valid` by current protocol generation and execution.

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `APIE2E-002` | `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` live/hydrated convergence scenario | Explicitly assert generic write tokens, generic unit price, write cost, input cost, total cost, and equality after hydration | `AC-011` | Test-only strengthening; no production change. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

Round 2 reran the current package from the narrowest reconciliation and GPT-5.6 owners through the broader affected suites and builds.

| Order | Command / Check | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | PATH and Codex.app binaries: `app-server generate-ts --experimental --out <temporary-dir>` | worktree; generated trees outside repository, then removed | `AC-013` current-protocol drift gate; exact `TokenUsageBreakdown`/`ThreadTokenUsage` shapes | Pass — CLI `0.144.1` and app `0.144.0-alpha.4`, 671 files each, identical hashes, zero write-key matches | `evidence/codex-generated-protocol-round2-2026-07-10.md` |
| 2 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts --no-watch` | worktree; project Prisma test setup | `REQ-011`, `AC-013`, `AC-014`: source-vs-injected metadata, null/no-inference/no-write-cost | Pass — 2 files, 31 tests | `evidence/round2-codex-no-fabrication-focused.log` |
| 3 | Five focused GPT-5.6 `autobyteus-ts` Vitest files | worktree; temporary ignored credential available to test setup | Exact catalog/metadata/factory/Responses request/raw direct-API normalizer | Pass — 5 files, 36 tests | `evidence/round2-autobyteus-ts-gpt56-focused.log` |
| 4 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage/gpt56-token-usage-accounting-graphql.e2e.test.ts --no-watch` | worktree; isolated Prisma SQLite | Standard and `>272K` real-catalog input/read/write/output costs, no double counting, server message, ledger/GraphQL convergence | Pass — 1 file, 2 tests | `evidence/round2-server-gpt56-accounting-e2e.log` |
| 5 | `pnpm --dir autobyteus-web test:nuxt --run` for store and Token Meter | worktree; Nuxt Vitest | Live/hydrated generic-write convergence; positive/zero-absent/mixed disclosure; no write row for null/zero | Pass — 2 files, 19 tests | `evidence/round2-web-token-usage-focused.log` |
| 6 | Server token-usage unit/integration/E2E directories plus the two Codex files | worktree; isolated Prisma SQLite | Broader adapters/accounting/persistence/GraphQL/Codex regression | Pass — 17 files, 84 tests | `evidence/round2-server-affected-suite.log` |
| 7 | All six affected Nuxt token-usage files | worktree; Nuxt Vitest | Broader store/component regression | Pass — 6 files, 27 tests | `evidence/round2-web-token-usage-affected-suite.log` |
| 8 | `pnpm --dir autobyteus-ts build` | worktree | Library production compilation and runtime dependency check | Pass | `evidence/round2-autobyteus-ts-build.log` |
| 9 | `pnpm --dir autobyteus-server-ts build` (`build:full`) | worktree | Server TypeScript production compile, managed assets, built-in bootstrap smoke | Pass | `evidence/round2-autobyteus-server-ts-build.log` |
| 10 | `pnpm --dir autobyteus-web build` | worktree | Nuxt/Vue production build | Pass | `evidence/round2-autobyteus-web-build.log` |
| 11 | `pnpm --dir autobyteus-server-ts typecheck` | worktree; diagnostic baseline check | Detect task-specific type diagnostics outside production build config | Expected baseline limitation — exit 2 with 519 occurrences of `TS6059` only; all arise from `include: [src, tests]` with `rootDir: src`; no task-specific code was diagnosed | `evidence/round2-autobyteus-server-ts-typecheck.log` |

## Historical Round-1 Post-Repository Confidence

Round 1 reached `95.9%` post-repository and `96.3%` final confidence. It remains useful execution history but is superseded by the round-2 score below.

## Round-2 Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 96% | Direct focused evidence covers the revised Codex source-truth contract and all original deterministic GPT-5.6 criteria | External contract/entitlement checks are broader evidence, scored finally in the execution report | Fresh official/live checks |
| Changed-boundary execution directness | 98% | Exact resolver/backend source records, real catalog pricing owners, server message mapper, Prisma ledger, GraphQL, store, and rendered component execute | Successful provider response remains external | Entitled provider call |
| Cross-boundary integration realism and mock gap | 96% | Composed E2E crosses real catalog, basis, delta, calculator, message serialization, ledger, GraphQL; Nuxt store/component execute | No successful raw provider or Codex internal-write payload | Entitled/raw upstream evidence |
| Environment, configuration, identity, and fixture fidelity | 93% | Project commands, isolated migrated SQLite, generated Prisma client, and production builds execute on the reviewed worktree | Repository stage alone does not establish current account entitlement/protocol contract | Current binary generation and authenticated live probe |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | Null/no-inference/no-write-cost, standard/long tiers, no double counting, nested zero, absent/mixed UI, persistence, and cleanup are exercised | No upstream successful cache-write lifecycle | Entitled repeated-prefix probe |
| User-surface, browser, and desktop-shell confidence | 96% | Direct Nuxt DOM assertions cover positive, zero/absent, mixed, accessible disclosure, and accepted empty hit neighbor; web build passes | No manual pixel/browser journey | Browser would add negligible evidence for unchanged renderer logic |
| Durable regression coverage quality and relevance | 98% | Round-1 composed E2E/store coverage and round-2 Codex reconciliation suites are narrow and requirement-linked; broader suites pass | External rollout/protocol snapshots cannot be deterministic CI assertions | None within durable CI scope |

- Overall post-repository confidence: `96.1%`.
- Calculation method: simple mean of seven applicable category scores (`673 / 7 = 96.14%`), rounded to one decimal.
- Every critical acceptance criterion directly proven: `Yes` for the deterministic current-package scope; `AC-010` separately requires preserving the entitlement outcome when live success is unavailable.
- Any applicable category below `90%`: `No`.
- Default clean-confidence target of `95%` met: `Yes`.
- Material residual risks before broader validation: current external contract/protocol drift, account entitlement/raw cache-write payload, and the approved Codex upstream write-observability limitation.

## Broader Validation Decision

- Decision: `Required`.
- Selected execution mode: `Generated Codex Protocol`, `Live API`, and realistic repository server/GraphQL/Nuxt execution.
- Specific confidence gap or residual risk addressed: current Codex generated-field drift, source-versus-injected raw JSON semantics, account entitlement, exact provider error behavior, possible real direct-API `cache_write_tokens`, and composed server/GraphQL behavior.
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
- Evidence: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/openai-new-api-models/evidence/live-openai-gpt56-round2-2026-07-10.json` (secret omitted).
- Owned processes/state to clean up: none for live HTTPS; server tests own UUID ledger rows and test DB.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `LIVE-001` | Authenticated filtered `GET /v1/models` | Current account listing/credential validity | Entitlement is account/time dependent. |
| `LIVE-002` | Minimal Responses POST for each exact ID | Exact provider acceptance or exact entitlement failure | Must not hard-fail CI for rollout access. |
| `LIVE-003` | Conditional repeated-prefix Responses calls | Seek real `cache_write_tokens`/`cached_tokens` usage | Requires entitlement and incurs external cost; raw fixture belongs in evidence, not CI. |
| `CODEX-PROTO-001` | Generate PATH and Codex.app TypeScript bindings and inspect exact token types/write-key search | Current supported Codex source contract and design-impact gate | External generated files are point-in-time evidence and are removed after field extraction. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Successful entitled GPT-5.6 response and real raw cache-write payload | Round-2 credential probe returned HTTP 200 for model listing but no GPT-5.6 IDs, then HTTP 404 `model_not_found` for all exact IDs; conditional cache probe therefore did not run | Bounded external rollout uncertainty explicitly allowed by `AC-010` | Later entitled smoke; no production/test patch. |
| Actual Codex internal cache-write count | Both current generated bindings and prior real events omit a write field | Upstream observability limitation: hidden writes cannot be priced/displayed | Re-run protocol gate; design review if Codex adds an official field. |

## Ambiguities Or Reroute Triggers

No current reroute. Both current supported generated protocols show no Codex write field. A generated official write field would be `Design Impact` to `solution_designer`, with exact generated field plus `ThreadTokenUsage.total`/`last` cumulative semantics; it must not be mapped speculatively. A materially different expectation for the write-only empty `Cache hits` neighbor is also `Design Impact`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`.
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed By API/E2E In Round 2: `No`. Reconciliation commit `96f73433` already updates the two requirement-linked Codex suites; current protocol and execution confirm they remain valid.
- Post-repository confidence: `96.1%`.
- Broader validation decision: `Required and completed` (generated Codex protocol, official contract, live API); browser `Not Required` because production frontend remains unchanged and no-write zero/absent behavior is directly rendered in durable Nuxt coverage.
- Reroute Required Before Validation Execution: `No`.
- Recommended Recipient If Reroute Required: N/A.
- Notes: Round-2 current-package execution passed. Do not treat `raw_event_json.autobyteus_cumulative_snapshot_provider_delta_tokens.cache_creation_input_tokens = null` as a Codex source key; only `tokenUsage.total`/`last` and selected `raw_usage_json` represent upstream records.
