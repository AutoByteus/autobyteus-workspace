# API/E2E Coverage Investigation — API-REV-001 plan

## Investigation meta and basis
Assigned worktree: `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55`. Trigger: CRR-002 Pass on IR-002 commit `42ba8549b`. Read the complete cumulative package in this directory: `requirements-doc.md` (approved SR-002), `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md` (SR-005 retaining SR-004), `solution-handoff.md`, `design-review-report.md`, `architecture-review-revision-record.md` (ARCH-REV-003 Pass), `implementation-handoff.md`, `implementation-revision-record.md`, `code-review-report.md`, `code-review-revision-record.md`. Supplements: N/A; screenshots are input evidence only. Prior API/E2E investigation/result/revision: N/A. This is the first round. Task size **Large**, architectural risk **High**, reviewed input and successful output route through Code Reviewer; proportional test-code review required only if durable tests change.

## Requirements and changed boundaries
- AC-001/002: exact Sol/Luna direct catalog, Astra regression, OpenAI Responses send/stream and no shorthand alias. Domain/backend catalog and external transport adapter; no changed frontend or browser code.
- AC-003/004: Opus 5.5 catalog/request preflight, signed assistant-tool replay, independent-turn reset, recovery and compaction. Changed provider transport, agent lifecycle and persisted optional metadata; no changed desktop shell.
- AC-005: Standard price, cache, long-context full-request tier, trusted versus partial/missing, existing snapshots. Domain/backend plus server pricing persistence.
- AC-006/007: dynamic Codex discovery/GraphQL and real locally authenticated per-advertised-model app-server turns. External integration and identity/account entitlement; direct API live runs are separate from no-key contract proof.
- AC-008: existing catalog IDs and historical snapshots direct-use without migration. No version-specific compatibility mechanism is approved; general historical generic turns and v5 absent metadata are valid current readers.
- AC-009/010: exact stable Anthropic SDK pins/lockfile, build and Claude SDK model discovery, session, tools/permissions, streaming/usage and interrupts; live Claude attempt only if local auth is safely detected.
- Not affected: UI components, browser integration, Electron shell, worker/queue/distributed coordination. Browser validation would not prove changed backend/provider or SDK boundaries and is not selected.

## Project execution discovery
`README.md`: pnpm workspace setup. `package.json`: workspace e2e scripts. `autobyteus-server-ts/AGENTS.md`: `vitest run ... --no-watch`, narrow then integration. `autobyteus-ts/package.json`: build via `pnpm --filter autobyteus-ts build`; tests via direct vitest. `autobyteus-server-ts/package.json`: `prepare:shared`, Prisma generation, build/typecheck and vitest. Existing `node_modules` and built workspace artifacts are present; do not use another process/data store. Live Codex tests are opt-in with `RUN_CODEX_E2E=1`; `codex` binary and local auth-file presence were noted upstream but live entitlement is unknown. No server process or persistent fixture is required for focused no-key suites. Codex test will use app-server client isolated temporary workspace and close owned process; no shared server/process stopped. Secret candidate `$HOME/.autobyteus/server-data/.env` will be checked only by existence and known-key nonempty booleans, never printed/persisted. Direct-provider live run only if safe usable key and a focused non-destructive path exist.

## Existing durable coverage inventory and decisions
| Path / scenario | AC | Decision | Action |
| --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | 001,003,005,008 | Still Valid | Rerun exact rows/schema/prices/older IDs. |
| `autobyteus-ts/tests/unit/llm/api/provider-native-request-payloads.test.ts` | 002,003,004,007 | Still Valid | Rerun Responses and Anthropic no-key payloads. |
| `autobyteus-ts/tests/unit/llm/api/anthropic-llm.test.ts`, `anthropic-signed-tool-continuation.test.ts` | 003,004 | Still Valid | Rerun simple/stream/signed replay. |
| `autobyteus-ts/tests/unit/agent/{loop,events}/`, `tests/unit/memory/` relevant signed-turn files | 004,008 | Still Valid | Rerun reset/recovery/compaction/notifier/snapshot. |
| `autobyteus-server-ts/tests/e2e/token-usage/` | 005,008 | Still Valid | Rerun server price/snapshot scenarios. |
| `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts`, Claude backend/manager tests | 009,010 | Still Valid | Rerun SDK regressions. |
| `autobyteus-server-ts/tests/integration/services/codex-model-catalog.integration.test.ts` | 006 | Still Valid but incomplete for exact new-model turn | Rerun live discovery/GraphQL; add or use focused live turn probe per advertised model. |
| `autobyteus-server-ts/tests/integration/runtime-execution/codex-app-server/thread/codex-thread.integration.test.ts` | 006 | Still Valid but selects older Mini | Use as pattern for focused per-model live probe; do not call this model-specific proof. |
No stale coverage initially identified; none to remove. Existing source test additions are implementation-owned and will be independently rerun. Potential durable addition: a gated per-advertised GPT-6 Codex turn test if current test seams permit deterministic isolation; otherwise use temporary live probe and explain why not durable. Coverage decisions will be updated before edits.

### Coverage-validity update after live execution
The existing opt-in `autobyteus-server-ts/tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts` is **Needs Update**: its `startQueryTurn` calls omit current required `sessionBinding` (and system prompt) and its resume case uses removed `sessionId` input. The first live attempt failed in the test harness before any Claude query with `Cannot read properties of undefined (reading 'kind')` at `buildQueryOptions`. Current production `ClaudeSession` and unit tests supply `sessionBinding`. Update this one durable live integration file to the current contract, then rerun only its single short live model/query case; do not run the entire potentially costly live suite. The separate Codex live thread test also calls old `submitInput`; this is **Needs Update**, but the locally scoped temporary per-model probe was corrected to current `startInput` and establishes task-specific live proof without broad editing of unrelated older Codex live cases. No test removal is justified.

`autobyteus-server-ts/tests/unit/token-usage/pricing/token-price-config-provider.test.ts` is **Needs Update** for AC-005: it has prior Astra and older Anthropic rates, but no exact Sol/Luna/Opus 5.5 assertion at the server pricing-consumer boundary. Add narrow parameterized new-model policy tests here, including the long-context tier for Sol/Luna. Shared catalog tests alone do not establish the server policy resolution for these IDs.

## Persisted-data basis
Approved `Directly Usable — No Migration` in SR-004 and implementation handoff. Exercise v5 absent native key and native/reset round-trip via current reader, plus historical price snapshot immutability via server tests. No migration or compatibility-only test will be added.

## Execution plan and ledger
Ledger is required for multiple independent cases; initialize before first run at `api-e2e-test-case-ledger.md`.
| Case | Scope | AC | Surface |
| --- | --- | --- | --- |
| API-C01 | catalog/OpenAI/Anthropic direct no-key contracts | 001–004,007,008 | shared vitest |
| API-C02 | signed active turn/reset/compaction/recovery/serialization | 004,008 | shared vitest |
| API-C03 | server pricing/snapshot and SDK regression/build | 005,008–010 | server/shared build and vitest |
| API-C04 | Codex model discovery/GraphQL/capability parity | 006,007 | live app-server integration |
| API-C05 | each locally advertised Astra/Sol/Luna minimal real turn | 006,007 | live app-server via Autobyteus path |
| API-C06 | secret-safe direct-provider and Claude-auth availability, conditional live attempts | 007,010 | local environment/external |

## Confidence gate (pending execution)
Post-repository scorecard will be completed after C01–C03. C04–C06 are **Required** broader validation, not replaced by mocked passes. Live Codex can materially close the account/transport gap; browser cannot. Clean Pass requires every critical AC directly proven, overall >=95%, every applicable category >=90%. If advertised Codex models cannot complete, report model-specific outcome and classify a genuine blocker versus implementation defect based on evidence. Direct-provider live success will never be inferred from no-key tests.

## Investigation decision
Proceed: Yes. Durable changes: undecided pending C01–C03 inventory evidence; no removals planned. No upstream ambiguity currently requires reroute. Temporary probe is acceptable only for local entitlement-sensitive smoke and will not be confused with durable contract coverage.

## Post-repository update (after API-C01–C03)
C01: 4 shared files/64 tests passed. C02: 7 lifecycle files/43 tests passed. C03: shared build passed; initial server run 6 suites/85 assertions passed with one import/setup failure because generated `@autobyteus/application-sdk-contracts/dist` was absent. Documented `prepare:shared` built it; targeted manager and SQLite/GraphQL price rerun passed 10/10. Prisma generate plus server build-target `tsc --noEmit` passed. Missing build artifact was environment setup, not an implementation assertion failure. Existing tests remain valid; no durable change selected yet.

| Confidence category | Post-repository score | Evidence and remaining gap |
| --- | ---: | --- |
| Requirement/AC proof | 75% | Direct deterministic AC-001–005/008–010 evidence; AC-006 live turns pending. |
| Changed-boundary directness | 75% | In-process adapters, memory, server GraphQL and build executed; live provider/account boundaries pending. |
| Cross-boundary realism/mock gap | 50% | Provider responses and Claude SDK mocked; real Codex not yet exercised. |
| Environment/identity fidelity | 50% | Isolated workspace/SQLite realistic; credential/account discovery pending. |
| Failure/lifecycle/recovery | 90% | Signed reset, recovery, compaction and missing-price paths exercised; live failures pending. |
| User-surface/browser/shell | N/A | No changed UI/browser/shell behavior; browser would not exercise provider requests. |
| Durable regression quality | 90% | Focused relevant unit/GraphQL suites; per-model live Codex test not yet durable. |

Overall post-repository confidence: **72%**, arithmetic average of six applicable categories (430/6=71.7%, rounded). Critical AC directly proven: No, AC-006 pending. Applicable categories below 90%: requirement, directness, realism, environment. Clean target unmet. Broader validation **Required**: live Codex app-server catalog/GraphQL and per-advertised-model thread/turn, plus safe credential availability check and conditional direct/Claude live attempts. This is the most direct mode for the remaining gap. Browser and actual desktop execution are not selected; backend/transport change has no browser or shell-specific path.

## Final investigation reconciliation — API-REV-001
- Coverage validity updated before edits: Claude Agent SDK opt-in integration file **Needs Update** for required session binding; server pricing-provider file **Needs Update** for exact new-model server consumer rates. Both were updated narrowly and executed. Old Codex opt-in thread test's removed `submitInput` is a pre-existing **Needs Update** outside this task-specific per-model probe; temporary current-path probe replaces it for this round's AC-006 evidence, but the old suite remains a maintenance residual.
- Durable paths updated: `autobyteus-server-ts/tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts`; `autobyteus-server-ts/tests/unit/token-usage/pricing/token-price-config-provider.test.ts`. Added/removed durable paths: none. No stale test deleted. Temporary Codex probe retained only under ticket `evidence/api-e2e/` and removed from repository test path after execution.
- C04 live Codex catalog/GraphQL parity passed. C05 account advertised all three exact GPT-6 IDs; Autobyteus CodexThreadManager app-server `startInput` turns completed for Astra/Sol/Luna. C06 secret-safe check found a nonempty Anthropic API key but no OpenAI API key; one small direct Anthropic SDK Opus 5.5 call passed, and one Claude subscription-backed Agent SDK query/model-discovery/session-history case passed after current-contract test repair. No further paid Claude cases ran. Direct Anthropic SDK result is separate from no-key Autobyteus path and does not prove a live signed tool cycle.
- AC-009 pins independently matched registry stable tags `0.3.280` and `0.128.0` on 2026-09-23. Build-target TypeScript passed. An attempted general `tsc -p tsconfig.json --noEmit` is not an authoritative build check because the repository config includes tests outside its `rootDir=src`; it failed with TS6059 unrelated to changed code.
- Final broader-validation decision: **Required and completed** via live app-server, one direct Anthropic SDK call and one Claude Agent SDK query. Browser/desktop Not Required; neither reaches the changed provider/backend boundary. The user's cost constraint led to skipping three additional live Claude integration cases; no inference of live tools/permissions/interrupts is made from the single query.
- Final category confidence: requirement/AC 95%; changed-boundary directness 95%; cross-boundary realism/mock gap 90% (OpenAI no key and signed Anthropic tool cycle mocked by approved contract); environment/configuration/identity/fixture fidelity 100% **for approved validation scope** (real local Codex, Claude subscription, key availability assessed; OpenAI live explicitly not required); failure/lifecycle/recovery 95%; user-surface/browser/shell N/A (unchanged); durable regression quality 95%. Arithmetic mean of six applicable categories = **95%**. Every critical AC has its required form of proof; no applicable category below 90%. Residual risks: no live OpenAI entitlement proof and no live full Autobyteus Anthropic signed tool cycle, both beyond approved no-key/cost-limited contract evidence; old opt-in Codex thread test API drift does not negate the new task-specific live probe.
- Investigation decision: validation **Pass**, pending proportional review of the two changed durable test paths. No requirement/design reroute or implementation defect identified. See `api-e2e-execution-coverage-report.md` for authoritative round result and `api-e2e-revision-record.md` for baseline.
