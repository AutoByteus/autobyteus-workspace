# API/E2E Test-Case Ledger — API-REV-003

Worktree: `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55`. Investigation: `api-e2e-coverage-investigation.md`. Report: `api-e2e-execution-coverage-report.md` (pending). Revision record: `api-e2e-revision-record.md` (pending). Initialized before execution 2026-09-23. Required for independent multi-case checks.

| Case ID | Case / AC | Planned surface | Status |
| --- | --- | --- | --- |
| API-C01 | Exact catalog/direct no-key contracts, AC-001–004/007/008 | shared vitest | Planned |
| API-C02 | Signed replay/reset/compaction/recovery, AC-004/008 | shared vitest | Planned |
| API-C03 | Pricing, snapshots, SDK regressions/build, AC-005/008–010 | server/shared build and vitest | Planned |
| API-C04 | Live Codex discovery/GraphQL, AC-006/007 | app-server integration | Planned |
| API-C05 | Real per-advertised Astra/Sol/Luna turn, AC-006/007 | app-server/Autobyteus thread | Planned |
| API-C06 | Secret-safe key/auth availability and conditional direct/Claude live, AC-007/010 | environment/external | Planned |

## Execution events
| Seq | Case | Event | Command / configuration | Expected | Observed | Result | Evidence / next action |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Reconciliation
Last completed case: API-C08 Pass (live signed native turn and two tools, accepted replay). All planned cases complete. Report reconciliation: Yes, API-REV-003.
| 1 | API-C01 | Started | Shared focused no-key contracts | Tests pass | Running | N/A | — |
| 2 | API-C01 | Completed | `pnpm -C autobyteus-ts exec vitest run` four focused files | 64 pass | 64/64 pass | Pass | `/tmp/new-models-api-c01.log`; next C02 |
| 3 | API-C02 | Started | Shared signed lifecycle suites | Tests pass | Running | N/A | — |
| 4 | API-C02 | Completed | Seven focused lifecycle files | Pass | 43/43 pass | Pass | `/tmp/new-models-api-c02.log`; next C03 |
| 5 | API-C03 | Started | Pricing/SDK server suites and build | Pass | Running | N/A | — |
| 6 | API-C03 | Checkpoint | Server vitest still running after >60s | Completion | In progress; no result inferred | N/A | `/tmp/new-models-api-c03-tests.log` |
| 7 | API-C03 | Checkpoint | First server vitest | 7 suites pass | 6 suites/85 tests passed; one suite could not import missing generated workspace contracts artifact, not assertion failure | N/A | `/tmp/new-models-api-c03-tests.log`; run documented prepare:shared then rerun |
| 8 | API-C03 | Checkpoint | Documented `prepare:shared` | Build passes | Pass; generated workspace contracts now available | N/A | `/tmp/new-models-api-c03-prepare.log`; rerun affected suite |
| 9 | API-C03 | Checkpoint | Rerun manager + GraphQL price after prepare | Pass | 10/10 pass, including SQLite/GraphQL hydration | N/A | `/tmp/new-models-api-c03-rerun.log`; typecheck next |
| 10 | API-C03 | Completed | Shared build; server pricing/Claude suites; GraphQL price; Prisma + tsc | Pass after required setup | 85 assertions plus 10 rerun pass; build/typecheck pass | Pass | `/tmp/new-models-api-c03-*.log`; next C04 |
| 11 | API-C04 | Started | `RUN_CODEX_E2E=1` live catalog integration | Live model-list/GraphQL parity | Running | N/A | — |
| 12 | API-C04 | Completed | Live app-server catalog/GraphQL integration | Pass | 1/1 pass; capabilities parity for all advertised rows | Pass | `/tmp/new-models-api-c04.log`; next C05 |
| 13 | API-C05 | Started | Temporary CodexThreadManager exact-model live probe | Advertised turns complete | Running | N/A | — |
| 14 | API-C05 | Checkpoint | First temporary probe | Real turn | All 3 advertised, but probe called removed `submitInput`; harness-only failure before turn/start, no product result | N/A | `/tmp/new-models-api-c05.log`; correct probe to current `startInput` and rerun |
| 15 | API-C05 | Completed | Corrected temporary CodexThreadManager app-server probe | Each advertised model completes real turn | Astra/Sol/Luna all advertised and 3/3 turns completed | Pass | `/tmp/new-models-api-c05-rerun.log`; next C06 |
| 16 | API-C06 | Started | Secret-safe availability check | Presence only, conditional live | Running | N/A | — |
| 17 | API-C06 | Checkpoint | Env presence and standalone Anthropic SDK Opus 5.5 live request | If key usable, real response | Anthropic key nonempty; exact model returned end_turn, one content block and usage; OpenAI key absent; Claude CLI auth exit 0 | N/A | `/tmp/new-models-api-c06-anthropic.log`; run live Claude Agent SDK integration |
| 18 | API-C06 | Checkpoint | First existing Claude Agent SDK live test | Live model/query | Harness failed before provider query: missing current sessionBinding; updated durable test to current API | N/A | `/tmp/new-models-api-c06-claude-sdk.log`; rerun one low-cost case only |
| 19 | API-C06 | Completed | One tiny direct Anthropic SDK request and one subscription-backed Claude Agent SDK query after harness fix | Exact Opus response; SDK model/query/history | Both passed; OpenAI key absent; no further paid tests | Pass | `/tmp/new-models-api-c06-anthropic.log`, `/tmp/new-models-api-c06-claude-sdk-rerun.log` |
| 20 | API-C03 | Checkpoint | Added exact new-model server pricing-policy tests | 3 new cases pass | 21/21 provider tests passed | Pass | `/tmp/new-models-api-c03-added-pricing.log` |

## API-REV-002 planned extension
| Case ID | Case / AC | Planned surface | Status |
| --- | --- | --- | --- |
| API-C07 | One real Opus 5.5 AnthropicLLM streamed tool use and signed continuation, AC-003/004/007 | product adapter / Anthropic Messages API; max two requests | Completed (qualified) |

| 21 | API-C07 | Started | Secret-safe temporary product AnthropicLLM probe; max two calls | Signed streamed tool turn and accepted native continuation | Running | N/A | Probe code in ticket evidence after run; no secret/output text logged |
| 22 | API-C07 | Checkpoint | First real product `AnthropicLLM.streamMessages` request | Native signed tool turn | Provider returned one tool_use and usage, but no visible signed thinking block on trivial task; assertion stopped before continuation. Real first call, not a mock. | N/A | `/tmp/new-models-api-c07-live.log`; relax signature expectation and continue only once, still cost-limited. |
| 23 | API-C07 | Completed | `AnthropicLLM.streamMessages` plus `sendMessages` current adapter; one two-request rerun | Native tool use and accepted real continuation | One tool-use/native turn and usage; second real continuation returned content and usage; no live signed thinking block emitted | Pass (tool continuation); signed replay remains no-key only | `/tmp/new-models-api-c07-rerun.log`, `evidence/api-e2e/anthropic-opus55-live.probe.test.ts` |

## API-REV-003 planned extension
| Case ID | Case / AC | Planned surface | Status |
| --- | --- | --- | --- |
| API-C08 | Complex single-file platform-game task, signed thinking plus multiple real tool calls and exact native replay, AC-003/004/007 | product AnthropicLLM / Messages API; max four paid requests | Pass (two requests) |

| 24 | API-C08 | Started | Temporary product AnthropicLLM game-task probe; xhigh adaptive thinking, max four requests | Signed tool turn and accepted real replay; >=2 tools | Running | N/A | Only safe metadata, token counts and structural game checks logged |
| 25 | API-C08 | Checkpoint | Complex xhigh game task still running after first wait | <=4 requests | In progress; no final result inferred | N/A | `/tmp/new-models-api-c08-game.log` |
| 26 | API-C08 | Completed | Two real AnthropicLLM streamed requests; xhigh adaptive, constant tools/system, signed native replay | Signed tool turn and accepted continuation; >=2 tools | First response had signed thinking and write_html+inspect_html; second request accepted exact native assistant/tool results and completed. 4,259-byte HTML passed six structural checks; 3,733 input/4,211 output tokens. No browser gameplay claim. | Pass | `/tmp/new-models-api-c08-game.log`, `evidence/api-e2e/anthropic-opus55-game-live.probe.test.ts` |

## API-REV-004 planned extension — user-reported Claude SDK variant price gap
| Case ID | Scenario | Planned surface | Status |
| --- | --- | --- | --- |
| API-C09 | SDK-shaped `claude-opus-5-5[1m]` terminal usage -> emitted model -> real price resolver, compare exact base ID | temporary Vitest probe; no key | Planned |
| API-C10 | One cost-bounded subscription-backed SDK Opus model list/turn; inspect model identifiers only | live SDK with isolated workspace | Planned |

| Seq | Case | Event | Exact execution | Expected investigation signal | Observed | Diagnostic status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 27 | API-C09 | Completed | `corepack pnpm -C autobyteus-server-ts exec vitest run tests/unit/token-usage/pricing/claude-sdk-variant.probe.test.ts --no-watch` | Determine whether SDK-shaped `[1m]` reaches price lookup and why it is missing | 1/1 passed: event emitted `claude-opus-5-5[1m]`; real resolver returned `missing/model_not_found`; exact `claude-opus-5-5` returned `trusted` | Confirmed mismatch, not approved-behavior Pass | `evidence/api-e2e/claude-sdk-variant-price-probe.log`, probe source copied to evidence then removed from test tree |
| 28 | API-C10 | Checkpoint | `corepack pnpm -C autobyteus-server-ts exec vitest run tests/integration/runtime-management/claude/client/claude-sdk-opus-price.probe.test.ts --no-watch` (list only) | Inspect actual SDK advertised ID | 1/1 passed without turn: IDs include `opus[1m]`, `claude-fable-5-1[1m]` | Actual SDK discovery confirmed | `evidence/api-e2e/claude-sdk-opus-model-list-probe.log` |
| 29 | API-C10 | Completed | Same focused file with one additional tiny subscription-backed `opus[1m]` turn; isolated temporary workspace, closed owned query | Identify SDK result model fields/usage keys, no response text or secret output | 2/2 passed. SDK terminal result had no top-level model, `modelUsage` keys `claude-haiku-4-5-20251001` then `claude-opus-5-5[1m]`; current product event chose first Haiku key for this run. User screenshot had Opus variant for another run. | Confirmed mixed-model attribution risk and Opus variant; not a conformance verdict | `evidence/api-e2e/claude-sdk-opus-live-model-probe.log`, probe source copied to evidence then removed from test tree |

API-REV-004 reconciliation: C09 and C10 diagnostic probes complete. Prior API-REV-003 approved-scope Pass/97% remains historical; current user-reported SDK pricing behavior is an open Design Impact with no approved acceptance criterion or post-fix validation result. No direct Anthropic API call, durable test or product source edit in this investigation.

## API-REV-005 planned current-scope cases (CRR-007 Pass)
| Case | AC | Planned surface | Status |
| --- | --- | --- | --- |
| API-C11 | 011–013, retained 001–005/009–010 | focused server parser/binding/reconciler/price + direct regression suites | Planned |
| API-C12 | 013–014 | isolated SQLite migration, startup readiness, record/old-null/historical read and restart | Planned |
| API-C13 | 011–014, retained 006/008 | GraphQL/stream, Nuxt Token Meter/store, direct/Codex contract regressions | Planned |
| API-C14 | 011–013 | one tiny real subscription Claude Agent SDK selected Opus turn, identity/usage only | Planned |
| API-C15 | 011–014 | browser-equivalent renderer/server journey if safe; otherwise precise residual | Planned |

| 30 | API-C11 | Completed | `corepack pnpm -C autobyteus-server-ts exec vitest run` eight focused Claude SDK/binding/event/fold/accumulator/pricing suites `--no-watch` | Selected-only configured rate and direct-pricing contracts | 8 files, 70/70 passed; includes exact split/fallback/reset/unknown canonical and exact direct prices | Pass (repository) | `evidence/api-e2e/api-rev005-c11-server.log`; next C12 |

| 31 | API-C12 | Checkpoint | `corepack pnpm -C autobyteus-server-ts exec vitest run` six SQL/startup suites; documented server build; built-server restart E2E | Current column gate, SQL round-trip, restart/historical GraphQL | 6 files/29 passed; server full build passed; built process restart E2E 1/1 passed with migration on isolated DB. Unit accumulator in C11 additionally covers new SDK checkpoint/old-null resume. | Pass so far; selected-SDK GraphQL still C13 | `evidence/api-e2e/api-rev005-c12-sql.log`, `api-rev005-server-build.log`, `api-rev005-c12-restart.log` |

| 32 | API-C13 | Completed repository/API seam | Web Token Meter/store `test:nuxt --run`; server GraphQL/stream 3 suites; new durable selected SDK result→SQL→GraphQL E2E | Selected-only configured estimate reaches API/UI contracts | Web 2 files/21 passed; GraphQL/stream 3 files/9 passed; new E2E 1/1 passed with real price resolver, SQLite, GraphQL. New test checks mixed Haiku hidden, exact raw/canonical, 2 cumulative turns, SDK USD ignored, exact then marked 1h fallback, idempotency. | Pass (repository cross-boundary), browser/live pending | `evidence/api-e2e/api-rev005-c13-{web,graphql-stream,selected-graphql}.log`; durable `autobyteus-server-ts/tests/e2e/token-usage/claude-sdk-selected-model-graphql.e2e.test.ts` |

| 33 | API-C14 | Completed | One tiny live subscription-backed `opus[1m]` query via product `ClaudeSdkClient`, active-query selected binding, actual result event, real configured price accumulator/SQLite | Selected raw/canonical and non-Haiku priced output | 1/1 passed: active query resolves `claude-opus-5-5[1m]`, real result contains Haiku+Opus, event/summary canonical Opus, configured catalog `estimated` money, no 1h assumption on exact observed split. No response text or secrets logged; no direct Anthropic API call. | Pass (live selected path) | `evidence/api-e2e/api-rev005-c14-live-sdk.log`; source retained only in evidence; owned query/workspace/row closed/removed |

| 34 | API-C12 | Completed | C11 accumulator SQL old-null, C12 6-suite SQL/startup + built-server process restart | Nullable migration/readiness, new checkpoint and old history | 29/29 SQL/startup plus built restart 1/1 pass; startup missing-column gate, server/standalone ordering, current checkpoint and old-null conservative resume covered. | Pass | C11/C12 logs; no shared user database touched |
| 35 | API-C13 | Coverage checkpoint | Added stream DTO→store assertion to existing web store suite | Selected raw and approximation survive strict DTO mapper | First two attempts failed from probe fixture mistakes (`observed_model_identifiers` not a stream DTO key; nonexistent `getAgentRunSummary` method); corrected to actual contract and `getRunSummary`; final store suite 10/10 pass. No product defect inferred. | Pass after test repair | `api-rev005-c13-web-stream-mapper-{final,rerun}.log`; edited `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` |
| 36 | API-C13 | Regression checkpoint | Shared direct catalog/provider/signed replay; GPT usage/GraphQL; opt-in live Codex catalog/GraphQL | Preserve original direct/Codex behavior | Shared 3 files/30 passed; server GPT GraphQL 6/6 passed; Codex live catalog/GraphQL 1/1 passed. Default non-opt-in Codex run skipped, then explicitly rerun with `RUN_CODEX_E2E=1`. No current Astra/Sol/Luna live turns claimed; historical API-C05 remains earlier proof. | Pass (regressions) | `api-rev005-direct-regressions.log`, `api-rev005-codex-regressions.log`, `api-rev005-codex-live-discovery.log` |
| 37 | API-C15 | Completed | `corepack pnpm -C autobyteus-web test:e2e:token-statistics-ui --skip-server-build --output-dir ...` on isolated backend/Nuxt/Chromium; web boundary guard | Browser-equivalent current Token usage journeys; no user Electron disruption | Browser 9 named settings/statistics scenarios Pass, GraphQL requests and renderer interaction, no failures; owned backend/frontend/temp DB stopped and removed. `guard:web-boundary` passed. This fixture is generic statistics, not a live selected Claude workspace meter; selected renderer DOM proved by focused component test, not claimed as selected browser E2E. | Pass with bounded browser-scope residual | `evidence/api-e2e/api-rev005-browser/token-statistics-browser-result.json`, `api-rev005-c15-browser.log`, `api-rev005-web-guard.log` |

API-REV-005 reconciliation: C11–C15 complete, plus direct/Codex regression checkpoints. No open execution failure. Durable added `autobyteus-server-ts/tests/e2e/token-usage/claude-sdk-selected-model-graphql.e2e.test.ts`; durable updated `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts`; removed none. Temporary live probe copied into ticket evidence then removed from test tree. Result/confidence in current execution report.

## API-REV-006 planned current-scope AC-015 cases (CRR-009 Pass)
| Case | AC | Planned surface | Status |
| --- | --- | --- | --- |
| API-C16 | 015, retained 011–014 | Claude event/read unit plus selected event→SQL→GraphQL current/historical null/unknown | Planned |
| API-C17 | 015 | Stream DTO→store and rendered Token Meter known 22,135/1M≈2.21%, unknown state | Planned |
| API-C18 | 015 | one tiny real selected Opus SDK terminal result into current event, metadata only | Planned |
| API-C19 | 015, retained 001–014 | Codex context/price, selected money, browser-equivalent sanity and no regression | Planned |

| 38 | API-C16 | Completed | Server Claude event/context projection plus updated selected SDK event→SQLite→GraphQL E2E | Exact 22,135/1M/2.2135%, read-only old null percentage, unavailable/Codex guard | 3 suites, 11/11 pass. New E2E asserts current event/SQL/GraphQL percent and manually nulls stored percent, rereads derived same-record percentage with SQL still null and cost unchanged; source tests assert zero/unsafe, no cross-record stitch and stored Codex percentage. | Pass | `evidence/api-e2e/api-rev006-c16-server.log`; durable API E2E updated |

| 39 | API-C17 | Completed | Current Nuxt stream DTO→store and rendered Token Meter two focused suites | 22,135/1M and derived 2.2135% reach store/card, unknown state preserved | 2 files/23 tests passed. New strict DTO/store test preserves all three numeric fields; selected Claude component renders `22,135 / 1,000,000`, existing one-decimal UI label `2.2%` and exact progress width `2.2135%`, not unavailable, price unchanged. Existing unavailable case passes. | Pass (component/stream DTO; not full browser) | `evidence/api-e2e/api-rev006-c17-web.log`; two durable web test paths updated |

| 40 | API-C18 | Completed | One tiny real CLI-default Claude Agent SDK `opus[1m]` via active selected binding, event, SQL accumulator; no API key import | Actual selected `contextWindow`, safe prompt sum and exact percent | First temporary probe had a syntax typo and ran zero tests/no SDK turn; corrected once. Live 1/1 passed: selected raw Opus despite Haiku+Opus SDK usage; prompt 16,619, selected capacity 1,000,000, event and stored summary 1.6619%; catalog price remained estimated. No response text/secret output or direct paid Anthropic request. | Pass live | `evidence/api-e2e/api-rev006-c18-live-sdk-rerun.log`; temporary source retained only in ticket evidence, removed from test tree; owned query/workspace/row cleaned |

| 41 | API-C19 | Completed | Current server full build, opt-in live Codex catalog/GraphQL and direct pricing/GPT GraphQL regression; isolated Nuxt/Chromium token-statistics browser and web boundary guard | Preserve Codex context/prices, run current frontend/backend without touching user Electron | Build passed; server 3 files/28 passed (including live Codex catalog 1/1), browser nine named generic statistics journeys Pass, zero failures; guard passed. Browser fixture is generic settings statistics, not the selected Claude workspace context, which C17 exercised in rendered Vue DOM. Owned services/DB removed. Current packaged Electron not run/rebuilt. | Pass with explicit shell/browser residual | `evidence/api-e2e/api-rev006-server-build.log`, `api-rev006-c19-regressions.log`, `api-rev006-browser/token-statistics-browser-result.json`, `api-rev006-web-guard.log` |

API-REV-006 reconciliation: C16–C19 complete. Current result in execution report. Durable updated: server selected SDK GraphQL E2E, web Token Meter component test, web store stream DTO test; no durable added/removed this round. Temporary live probe retained only in evidence; no production edits. One temporary probe syntax failure before any SDK execution was corrected; final live case passed.
