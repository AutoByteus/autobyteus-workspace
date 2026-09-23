# API/E2E Test-Case Ledger — API-REV-001

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
Last completed case: API-C06 Pass (plus API-C03 pricing follow-up Pass). All planned cases complete. Report reconciliation: Yes.
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
