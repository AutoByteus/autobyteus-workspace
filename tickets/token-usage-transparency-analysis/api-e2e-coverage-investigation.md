# API/E2E Coverage Investigation — Round 4 Codex/Claude Browser Screenshot Evidence

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/code-review-report.md`
- Current Investigation Round: 4
- Trigger: User pointed out that Round 3 retained only an AutoByteus browser screenshot and did not capture Codex/Claude browser evidence for token input/output display.
- Prior Investigation Reviewed: Rounds 1, 2, and 3 in this same file.
- Latest Authoritative Investigation: Round 4 section in this file; prior sections below are historical.

## Round 4 Correction

The user's criticism is valid. Round 2 proved real Codex and Claude runtime token usage at the backend/server boundary, and Round 3 proved browser display with seeded AutoByteus data. It did not produce browser screenshots for Codex and Claude token input/output UI. Since the UI is supposed to display the same ledger-backed fields by runtime kind, the missing screenshots are an evidence gap.

## Round 4 Existing Coverage Decisions

| Path / Scenario | Current Status | Round 4 Validity Decision | Required Action | Evidence |
| --- | --- | --- | --- | --- |
| Real Codex backend runtime E2E | Passed in Round 2 | Still Valid but Missing Browser Screenshot | Run or create a real Codex runtime turn in a local stack and capture browser Usage panel screenshot for that run. | User specifically asked why no Codex runtime screenshot for token input/output. |
| Real Claude backend runtime E2E | Passed in Round 2 | Still Valid but Missing Browser Screenshot | Run or create a real Claude runtime turn in a local stack and capture browser Usage panel screenshot for that run. | User specifically asked why no Claude runtime screenshot for token input/output. |
| Round 3 AutoByteus browser screenshot | Passed | Still Valid but Insufficient Alone | Retain as AutoByteus evidence; add Codex/Claude screenshots. | AutoByteus screenshot cannot prove runtime label/display for Codex/Claude runs. |

## Round 4 Planned Executable Coverage

| Scenario ID | Behavior / Boundary | Planned Artifact / Path | Execution Requirement |
| --- | --- | --- | --- |
| APIE2E-014 | Codex App Server real runtime run persists token usage and frontend browser displays its input/output/total token summary, runtime, model, and price status. | Temporary local stack/browser probe plus retained screenshot artifact. | Start backend/frontend, create real Codex run, wait for `TOKEN_USAGE_UPDATED`, then open `/workspace` for the run and screenshot Usage panel. |
| APIE2E-015 | Claude Agent SDK real runtime run persists token usage and frontend browser displays its input/output/total token summary, runtime, model, and price status. | Temporary local stack/browser probe plus retained screenshot artifact. | Start backend/frontend, create real Claude run, wait for `TOKEN_USAGE_UPDATED`, then open `/workspace` for the run and screenshot Usage panel. |

## Round 4 Reroute Decision

- Proceed To Browser/API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No` expected; this is evidence/screenshot execution, not durable code.
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: If a real Codex/Claude run emits backend token usage but the browser cannot display the run summary, classify as frontend/load-display defect. If no backend token event is emitted, classify as runtime token emission/persistence defect.


## Round 4 Post-Execution Coverage Validity Update

- Final decision for APIE2E-014 Codex browser screenshot evidence: `Use Temporary Executable Probe Only / Passed`. A real Codex App Server runtime run emitted `TOKEN_USAGE_UPDATED`, persisted to the ledger, was returned by backend GraphQL, and the real Nuxt frontend displayed the ledger-backed Usage panel for that run.
- Final decision for APIE2E-015 Claude browser screenshot evidence: `Use Temporary Executable Probe Only / Passed`. A real Claude Agent SDK runtime run emitted `TOKEN_USAGE_UPDATED`, persisted to the ledger, was returned by backend GraphQL, and the real Nuxt frontend displayed the ledger-backed Usage panel for that run.
- The missing screenshot evidence identified by the user is now resolved by retained browser artifacts:
  - Codex runtime screenshot: `/Users/normy/.autobyteus/browser-artifacts/7462ad-1782361217464.png`
  - Claude runtime screenshot: `/Users/normy/.autobyteus/browser-artifacts/7462ad-1782361241017.png`
  - Prior AutoByteus runtime/frontend screenshot retained from Round 3: `/Users/normy/.autobyteus/browser-artifacts/8e23ce-1782359481206.png`
- No repository-resident durable coverage was added/updated/removed in Round 4. The already-added durable runtime E2E coverage from Round 2 and durable coverage changes from Round 1 remain the code-review routing reason.
- No implementation/design reroute was indicated by the Codex or Claude browser evidence.

---

# API/E2E Coverage Investigation — Round 3 Browser Frontend Stack Test

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/code-review-report.md`
- Current Investigation Round: 3
- Trigger: User requested a real browser test after reading README instructions: start backend, start frontend, seed agent/token-usage data, and verify the frontend in-browser.
- Prior Investigation Reviewed: Rounds 1 and 2 in this same file.
- Latest Authoritative Investigation: Round 3 section in this file; prior sections below are historical.

## Round 3 Correction

The user's additional criticism is valid. Round 2 proved real runtime-to-ledger behavior through server GraphQL/websocket E2E, but it still did not prove the Nuxt frontend renders seeded backend token usage in a real browser. The reviewed acceptance criteria include frontend live/reload display behavior, Usage tab/header chip visibility, nullable/unpriced cost display, and backend GraphQL reconciliation. Therefore a full local stack browser check is in scope.

README/startup evidence reviewed before execution:

- Root `README.md`: monorepo workspace uses `pnpm install`; server endpoints expose Backend/GraphQL/REST/WS.
- `autobyteus-server-ts/README.md`: backend requires `.env` in data dir, can run built output with `node autobyteus-server-ts/dist/app.js --data-dir <dir> --host 0.0.0.0 --port 8000`, and runs migrations on startup.
- `autobyteus-web/README.md`: browser development mode uses external backend, starts with `pnpm dev`, and defaults/proxies to backend base URL from `BACKEND_NODE_BASE_URL`/`BACKEND_REST_BASE_URL`.
- Current Nuxt config: in development, `/graphql` and `/rest` proxy to `BACKEND_NODE_BASE_URL`, while websocket endpoints use the backend ws base URL.

## Round 3 Existing Durable Coverage Decisions

| Path / Scenario | Current Status | Round 3 Validity Decision | Required Action | Evidence |
| --- | --- | --- | --- | --- |
| `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` | Store-level live/reload/idempotency coverage | Still Valid but Insufficient Alone | Retain; do not treat as full browser proof. | It does not start backend/frontend or render real UI. |
| Web build/guards from rounds 1/2 | Build/static integration proof | Still Valid but Insufficient Alone | Retain; supplement with local browser runtime check. | Build cannot prove actual Nuxt app display against seeded backend data. |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Real runtime-to-ledger E2E | Still Valid but Insufficient for Browser | Retain; browser test should consume ledger-backed GraphQL through the real frontend. | It verifies backend, not the UI. |
| Full-stack browser frontend display | Missing | Needs Execution | Start backend and frontend, seed run metadata + token ledger rows, navigate to `/workspace` for seeded run, verify header chip and Usage panel values. | User explicitly requested this realistic frontend path. |

## Round 3 Planned Executable Browser Coverage

| Scenario ID | Behavior / Boundary | Planned Artifact / Path | Execution Requirement |
| --- | --- | --- | --- |
| APIE2E-011 | Nuxt frontend in a browser displays seeded ledger-backed agent token usage after loading a run from backend history/resume GraphQL. | Temporary local stack/browser probe; evidence recorded in execution report. | Start backend from built server with temp data dir and frontend dev server pointed to backend; seed run history metadata and token ledger rows; use browser to verify UI. |
| APIE2E-012 | Header token usage chip opens the Usage tab and displays nullable/unpriced cost state rather than fabricated zero cost. | Temporary local stack/browser probe; evidence recorded in execution report. | Click/activate usage surface in browser, verify token totals, unpriced labels, price status, latest model, runtime, and event count. |

## Round 3 Reroute Decision

- Proceed To Browser/API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No` expected for browser execution; use temporary seeded-data/browser probe unless execution reveals a product defect.
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: This is an execution-scope gap, not a requirement/design ambiguity. If the local browser cannot render seeded ledger-backed token usage, classify based on whether the backend seed/query, frontend loading, or UI display boundary fails.

## Round 3 Post-Execution Coverage Validity Update

- Final decision for the browser stack scenario: `Use Temporary Executable Probe Only / Passed`. No repository-resident browser E2E harness exists in the current workspace, and this round's purpose was immediate real-stack proof requested by the user.
- The browser probe loaded a seeded historical agent run through the real Nuxt app, backend GraphQL proxy, run-history/resume GraphQL, and ledger-backed token usage summary query.
- The UI displayed the seeded run, header usage chip, Usage tab token totals, unpriced/null cost labels, price status, model identifier, runtime kind, event count, and context pressure.
- No implementation/design reroute was indicated by the browser evidence.

---

# API/E2E Coverage Investigation — Round 2 Real Runtime Rework

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/code-review-report.md`
- Current Investigation Round: 2
- Trigger: User rejected round 1 as insufficient because real runtime E2E was skipped/deferred and confirmed AutoByteus/LM Studio, Codex, and Claude runtimes are configured.
- Prior Investigation Reviewed: Round 1 in this same file.
- Latest Authoritative Investigation: Round 2 section in this file; the round 1 section below is historical.

## Round 2 Correction

The user's criticism is valid. Round 1 proved token usage normalization, enrichment, ledger, GraphQL, and frontend display with deterministic unit/integration/non-runtime E2E coverage, but it did not prove actual runtime-to-ledger behavior for configured runtimes. For the current requirement, real runtime E2E is in scope because the environment has configured runtime access:

- LM Studio is available at `LMSTUDIO_HOSTS=http://127.0.0.1:1234`; discovered models include qwen3.5-family models.
- Claude Code / Claude Agent SDK is installed and model discovery returns configured models.
- Codex App Server model discovery returns configured models.

Therefore, round 1's `Not Tested / Environment-Owned` decision for real runtime E2E is superseded for this task by the round 2 decision below.

## Round 2 Existing Durable Coverage Decisions

| Path / Scenario | Current Status | Round 2 Validity Decision | Required Action | Evidence |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Codex-only real runtime test, hard `describe.skip` | Needs Update | Convert to environment-gated real runtime coverage and expand to AutoByteus, Codex, and Claude runtime cases. Run it with the gate enabled in this task. | User confirmed runtimes are configured; existing hard skip defeats the E2E purpose. |
| AutoByteus LM Studio live integration coverage | Existing live backend flow tests are env-gated and prove tool/runtime behavior, not token usage ledger persistence | Needs Expansion | Add/execute real AutoByteus runtime token usage case using LM Studio qwen3.5-family model and GraphQL summary assertion. | User explicitly requested AutoByteus runtime real test using qwen3.5 via LM Studio. |
| Codex runtime token usage coverage | Unit adapter/backend coverage plus skipped real E2E | Needs Update | Execute real Codex runtime turn through websocket and assert `TOKEN_USAGE_UPDATED` plus ledger-backed GraphQL summary/statistics. | Round 1 skipped real Codex runtime; user says Codex is configured. |
| Claude runtime token usage coverage | Unit helper/converter coverage only | Needs Expansion | Add/execute real Claude runtime turn through websocket and assert `TOKEN_USAGE_UPDATED` plus ledger-backed GraphQL summary/statistics. | Round 1 skipped real Claude runtime; user says Claude is configured. |
| Non-runtime ledger GraphQL E2E | Direct ledger injection | Still Valid but Insufficient Alone | Retain; do not treat as a substitute for real runtime E2E. | It proves API projection, not runtime emission. |

## Round 2 Durable Coverage To Add / Update

| Scenario ID | Behavior / Boundary | Planned Durable Artifact / Path | Execution Requirement |
| --- | --- | --- | --- |
| APIE2E-008 | AutoByteus runtime with LM Studio qwen3.5-family model emits token usage, pipeline enriches/persists it, GraphQL summary exposes tokens/status. | `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Run with real LM Studio model discovery and `RUN_RUNTIME_TOKEN_USAGE_E2E=1`. |
| APIE2E-009 | Codex App Server runtime emits real token usage from a turn and persists it to ledger/GraphQL. | `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Run with real Codex model discovery and `RUN_RUNTIME_TOKEN_USAGE_E2E=1`. |
| APIE2E-010 | Claude Agent SDK runtime terminal result usage/modelUsage emits real token usage and persists it to ledger/GraphQL. | `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Run with real Claude model discovery and `RUN_RUNTIME_TOKEN_USAGE_E2E=1`. |

## Round 2 Reroute Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: This is a coverage insufficiency from API/E2E round 1, not a requirement/design ambiguity and not yet an implementation defect. If a real runtime emits no token usage or persistence fails, classify after execution based on which runtime/boundary fails.

## Round 2 Post-Execution Coverage Validity Update

- Final validity decision for `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts`: `Still Valid / Updated` after converting the hard-skipped Codex-only scenario into environment-gated real runtime coverage for AutoByteus+LM Studio, Codex App Server, and Claude Agent SDK.
- The first real-runtime execution proved all three runtimes emitted `TOKEN_USAGE_UPDATED`; the only failure was an over-strict test assertion that `latest_context_input_tokens` could not be `null`. That field is nullable for these terminal/runtime events and is not required to prove token usage ingestion, accounting, persistence, or GraphQL projection. The durable assertion was corrected to require the field's presence while asserting positive reported/accounting token totals.
- No implementation/design reroute was indicated by the real-runtime evidence.

---

# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review round 3 passed and requested API/E2E coverage investigation/execution for token usage transparency.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: This file.

## Current Requirement And Design Basis

The current reviewed behavior to prove is the no-legacy, storage-first token-usage ledger and transparency path:

- All runtime token observations must converge on one normalized `TOKEN_USAGE_UPDATED` event and append-oriented `token_usage_ledger_events` source of truth, not the old optional role-split `token_usage_records` path.
- Native AutoByteus provider adapters must preserve raw provider usage plus cache/reasoning/provider buckets before `CompleteResponse`/stream normalization can lose them, and `LlmPhase` must emit usage for every LLM phase/model call including tool-intent and continuation calls.
- Codex `tokenUsage.last` is `per_turn`; Codex `tokenUsage.total` fallback is `cumulative_snapshot` with server-computed accounting deltas, first-snapshot quality flag, duplicate idempotency protection, and no summing of cumulative reported totals.
- Claude Agent SDK terminal result usage/modelUsage must become a `per_turn` token usage event preserving cache buckets and raw result usage.
- Server pipeline enrichment must attach canonical run/team/member/workspace identity, normalize accounting deltas, calculate estimated API cost only from trusted shared-catalog pricing, and dispatch/persist one enriched event rather than raw and enriched duplicates.
- Missing, placeholder, unaudited, or default-zero pricing must keep estimated cost fields `null` with `price_missing`/`partial_price_missing`; frontend must display unpriced state instead of `$0 estimated` and must not calculate price.
- GraphQL run/team/member summaries and settings statistics must be ledger-backed projections over accounting deltas and nullable costs.
- Frontend live usage display must apply `TOKEN_USAGE_UPDATED` idempotently by run/team/member, reconcile summaries via GraphQL, and expose the Usage tab/header chip while keeping cache/reasoning sections out of v1 UI.
- Implementation handoff `Legacy / Compatibility Removal Check` is clean for live paths: no compatibility writers/readers introduced; old historical migrations/support scripts may remain but are not live feature paths.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Server token ledger and GraphQL summaries/statistics | Added/Changed | REQ-001..012, AC-001..007, design DS-001/005, handoff key server files | Existing repository/store/statistics tests are valid but need expansion for GraphQL summaries, raw fields, statuses, and accounting-delta projections. |
| Native provider raw/cache/reasoning usage observation | Added/Changed | REQ-014/015/017/018/045/046, design native raw usage section | Add durable unit coverage for OpenAI-compatible raw/cache/reasoning and Anthropic stream accumulation/no fabricated zero; retain response-observation integration coverage. |
| Native multi-LLM phase event emission | Added | REQ-015/018, native caveat, handoff coverage hints | Add/retain executable coverage through `LlmPhase`/stream event converter where practical; full provider live calls remain temporary/out of scope without external credentials. |
| Codex ready usage last/total/idempotency/snapshot deltas | Added/Changed | REQ-016/019/051/052/053, AC-002/014/020, design Codex span | Existing CodexThread/backend tests are stale or weak and must be updated to assert new scope/raw/idempotency/event semantics. |
| Claude terminal result usage | Added | REQ-017, design Claude SDK span, handoff `claude-session-token-usage.ts` | Add durable unit coverage for result usage/modelUsage extraction and converter mapping to `TOKEN_USAGE_UPDATED`. |
| Context/team/member enrichment | Added | REQ-006/049/050, design context enrichment | Add durable pipeline transformer coverage proving `AgentRunContext.config`/`MemberTeamContext` identity overrides websocket/payload aliases. |
| Trusted/missing/partial pricing | Added/Changed | REQ-008/009/027/035/047/048, AC-003/004/005/009/010/011/018 | Add durable pricing and pipeline tests for trusted, missing/default-zero, and cache partial statuses. Update model registry pricing test away from old tracker authority. |
| Frontend live/reload display behavior | Added | REQ-038/039/040/041/042, AC-010..016, design frontend meter | Add durable frontend store/handler coverage for idempotent live application, team aggregation, mixed/unpriced state, and summary replacement. Use build/guards for component/template integration. |
| Old optional storage/tracker accounting path | Removed/Decommissioned | Requirements simplification/removal, handoff legacy check, code review CR-001 resolved | Existing no-registration/removal tests remain valid. Do not add compatibility coverage around old storage/tracker. |
| Real Codex runtime E2E | Preserved as environment-owned skipped scenario | Existing `token-usage-runtime-graphql.e2e.test.ts` has `describe.skip` | Treat as valid but not final evidence unless environment is explicitly available; add non-runtime GraphQL executable coverage instead. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/llm/extensions/token-usage-tracking-extension.test.ts` | Observation builder preserves raw provider usage/cache/reasoning and marks missing dimensions without local estimation. | REQ-004/014/023/045/046, AC-017 | Still Valid | Test content targets new `LlmTokenUsageObservation` despite old filename. | Retain; supplement with provider-normalizer tests. |
| `autobyteus-ts/tests/integration/llm/extensions/token-usage-tracking-extension.test.ts` | `CompleteResponse` carries observation and no legacy cost fields. | REQ-046, no legacy cost input | Still Valid | Imports `CompleteResponse` + `buildLlmTokenUsageObservation`, not deleted extension. | Retain. |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Gemini price is present but through old `TokenUsageTracker` cost calculation. | REQ-030/034/047; old tracker decommission | Needs Update | Test imports old tracker/counter path even though server price resolver is now authoritative. | Replace assertions with `LLMFactory.getModelPricingInfo` trust/default-zero/current-registry checks. |
| `autobyteus-server-ts/tests/unit/startup/agent-customization-loader.test.ts` | Old `TokenUsagePersistenceProcessor` is not registered. | REQ-012/022/025, legacy removal | Still Valid | Directly asserts no old response processor registration. | Retain and rerun. |
| `autobyteus-server-ts/tests/unit/agent-customization/processors/persistence/token-usage-persistence-processor.test.ts` | Payload builder and per-turn delta replacement for old processor path. | REQ-003/007/051/052 | Still Valid, Needs Expansion | Covers new replacement but limited to per-turn. | Add pipeline/delta/pricing coverage elsewhere. |
| `autobyteus-server-ts/tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts` | New ledger repository append/list, duplicate idempotency, latest cumulative snapshot. | REQ-001/002/019/051/052 | Still Valid, Needs Expansion | Filename references old record repository but content imports `SqlTokenUsageLedgerRepository`. | Retain; optionally expand for raw/cache/reasoning round trip. |
| `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-store.integration.test.ts` | Ledger store summarizes run and team/member usage from accounting deltas and identity. | REQ-006/041/051, AC-019 | Still Valid, Needs Expansion | Covers team/member route key and accounting sums. | Expand only if needed; GraphQL summary test will cover API projection. |
| `autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts` | Ledger-backed settings statistics keep nullable missing cost and mixed status. | REQ-012, AC-003/006/011 | Still Valid, Needs Expansion | Covers price_missing and mixed; lacks partial status. | Add/extend partial status if cheap. |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Real Codex runtime turn persists token usage and stats through GraphQL. | AC-002/006; Codex runtime | Still Valid but Environment-Owned/Skipped | `describe.skip` explicitly keeps it disabled by default. | Do not rely on it for final evidence; add non-runtime GraphQL ledger test. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` token usage readiness scenarios | Ready usage after idle/late completion. | REQ-016/053, AC-014/020 | Needs Update | Static inspection shows expected old `prompt_tokens`/cost shape; implementation now returns `CodexReadyTurnTokenUsage` with scope/raw/idempotency. | Update assertions and add `last` vs `total` coverage. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts` token usage scenarios | Idle lifecycle preserved; late idle token update currently expected to emit no event. | REQ-016/019/053 | Needs Update | Current implementation emits ready token usage events; stale assertion would forbid late ready usage. | Update to assert `TOKEN_USAGE_UPDATED` for ready/late usage and idempotency fields. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` | Session lifecycle/output behavior. | Claude runtime | Out Of Scope for token assertions as-is | No token-usage assertions found. | Add focused helper/converter tests rather than bloating large session test. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts` | Claude session events convert to agent-run events. | REQ-017 | Needs Update | Converter has token case but no assertions. | Add token conversion test. |
| `autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleOrdering.spec.ts` and existing web store tests | Other streaming/store behavior. | Frontend streaming infra | Out Of Scope | No token usage assertions. | Add new token usage meter store/handler test. |
| `autobyteus-web/components/settings/TokenUsageStatistics.vue` / `BarChart.vue` covered by build/guards only | Settings chart/table unpriced/mixed display after CR-002. | AC-006/011, CR-002 | Needs Durable Coverage or Executable Build Evidence | Code review requested UI behavior validation; no component test found. | Add store/format-oriented durable coverage and run build/guards. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` token readiness expected `usage.prompt_tokens`/`prompt_cost` shape | Codex ready usage is old prompt/completion/cost `TokenUsage`. | Codex ready usage must preserve scope, raw usage, idempotency key, and reported token fields. | REQ-016/051/052/053; design Codex span; implementation `CodexReadyTurnTokenUsage`. | Update same tests to assert `per_turn`/`cumulative_snapshot`, raw payload, model identity, and idempotency. | N/A |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts` late token update after idle should emit no runtime event | Late ready usage should still be emitted through normalized event pipeline once thread says it is ready. | REQ-016 and implementation handoff say Codex ready turn usages emit `TOKEN_USAGE_UPDATED`; losing late terminal token usage would undercount. | Update backend tests to assert late ready token usage event emission. | N/A |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` old `TokenUsageTracker.calculateCost` is the durable pricing proof | Server `TokenCostCalculator`/`LLMFactory.getModelPricingInfo` now own pricing trust; old tracker is not authoritative accounting. | REQ-020/021/022/030/047/048; no-local-estimation design. | Replace assertions with shared model pricing lookup trust/missing and registry refresh assertions. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| APIE2E-001 | OpenAI-compatible and Anthropic provider usage normalizers preserve raw/cache/reasoning and do not fabricate missing input tokens. | REQ-014/045/046, AC-017 | `autobyteus-ts/tests/unit/llm/api/token-usage-normalizers.test.ts` | Existing builder test does not cover provider adapters, where raw data can be lost. |
| APIE2E-002 | Shared pricing lookup and cost calculator distinguish trusted, missing/default-zero, and partial cache-pricing states. | REQ-027/035/047/048, AC-003/004/018 | `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts`; `autobyteus-server-ts/tests/unit/token-usage/pricing/token-cost-calculator.test.ts` | Pricing trust is central and old tracker test is obsolete. |
| APIE2E-003 | Event pipeline enrichment replaces raw token events with one enriched event, canonical member identity, accounting deltas, and cost fields. | REQ-037/043/049/050/051/052 | `autobyteus-server-ts/tests/unit/agent-execution/events/token-usage-event-enrichment-transformer.test.ts` | Needed to prove no duplicate raw/enriched dispatch and canonical context ownership. |
| APIE2E-004 | Codex `last` vs `total` ready usage and backend event emission, including cumulative snapshot metadata and late ready usage. | REQ-016/019/052/053, AC-014/020 | Update `codex-thread.test.ts`; update `codex-agent-run-backend.test.ts` | Existing tests are stale/weak for the new Codex scope contract. |
| APIE2E-005 | Claude terminal result usage/modelUsage maps to `TOKEN_USAGE_UPDATED` with cache buckets and raw payload. | REQ-017, AC-005 | `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-token-usage.test.ts`; update converter test | No durable coverage currently proves Claude token usage extraction. |
| APIE2E-006 | Ledger-backed GraphQL run/team/member/statistics queries expose nullable costs/status and accounting totals. | REQ-006/012/041, AC-006/019/020 | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Real Codex runtime E2E is skipped; need non-runtime GraphQL executable proof. |
| APIE2E-007 | Frontend token usage meter store/handler applies live events idempotently, aggregates team/member deltas, and preserves unpriced/mixed status. | REQ-038/041/042, AC-010/011/014/015 | `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` | No existing frontend durable token-meter coverage. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| APIE2E-004A | `codex-thread.test.ts` token usage readiness | Replace old prompt/completion/cost expectations with `CodexReadyTurnTokenUsage`; add `last`/`total` scope assertions. | REQ-016/053 | Coverage-code change required. |
| APIE2E-004B | `codex-agent-run-backend.test.ts` token usage cases | Assert `TOKEN_USAGE_UPDATED` emitted for ready and late usage rather than no-event stale expectation. | REQ-016/019 | Coverage-code change required. |
| APIE2E-002A | `supported-model-definitions.test.ts` | Remove old `TokenUsageTracker` pricing proof; assert `LLMFactory.getModelPricingInfo`, trusted/default-zero missing, current additions/removals. | REQ-030/034/047 | Coverage-code change required. |
| APIE2E-006A | token usage repository/store/statistics integration tests | Keep existing coverage and add raw/status/GraphQL assertions in adjacent files. | AC-003/006/019/020 | Coverage-code change required. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None planned | N/A | N/A | Stale assertions will be updated in place; no durable coverage file removal planned. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| APIE2E-TEMP-001 | Targeted `rg` checks for old live accounting imports/usages and hardcoded zero/Euro UI regressions. | No live old accounting compatibility path or CR-002 regression is reintroduced. | Search commands are execution evidence; durable tests already cover core behavior and code review handled source review. |
| APIE2E-TEMP-002 | Production/build/guard commands for server/runtime/web after durable coverage updates. | Changed coverage and token paths compile and frontend templates integrate. | Build commands are task evidence, not repository-resident tests. |
| APIE2E-TEMP-003 | Real Codex runtime E2E file remains skipped unless environment is explicitly available. | If enabled externally, proves live runtime token usage. | Environment-owned external runtime/credentials make it unsuitable as default final proof here. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Real native provider API call with external OpenAI/Anthropic/Gemini credentials | External credentials/network/runtime behavior are not guaranteed in this task. Provider-normalizer and stream/event pipeline tests emulate provider payloads. | Live provider SDK schema drift might be missed. | If credentials are available in a release environment, run provider-specific smoke/E2E later. |
| Real Codex App Server runtime E2E | Existing test is explicitly skipped as environment-owned; app server/auth availability is not guaranteed. | Real `thread/tokenUsage/updated` contract might differ from fixtures. | Keep skipped E2E available; execute manually in configured runtime environment. |
| Pixel-level frontend Usage tab/header chip rendering | Store/handler plus build/guards cover logic/template integration; visual inspection not practical without full app runtime setup. | Minor layout regressions may be missed. | Delivery or product QA can perform UI visual check if required. |
| Async persistence queue drain/shutdown under process termination | Processor schedules `setImmediate`; durable repository/store tests cover append/idempotency. Full shutdown lifecycle harness is outside current bounded scope. | Rare shutdown loss if process exits before queue flush. | Future lifecycle coverage should add explicit drain hook if product requires shutdown guarantees. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently requiring reroute | N/A | Upstream requirements/design are sufficient; observed stale tests are coverage-code issues, not implementation/design blockers. | N/A |

## Execution Plan

1. Update stale durable coverage and add the planned focused tests before final execution.
2. Run targeted unit/integration/e2e checks covering:
   - native usage observations and provider normalizers,
   - model pricing lookup and cost calculator statuses,
   - server token usage enrichment transformer, snapshot deltas, Codex/Claude runtime adapters,
   - ledger repository/store/statistics/GraphQL summaries,
   - frontend token usage meter store/handler.
3. Run broader compile/build/guard checks relevant to changed coverage and token path integration:
   - `pnpm -C autobyteus-ts run build`,
   - `pnpm -C autobyteus-server-ts run build:full` or focused type/build command if full build is too slow,
   - `pnpm -C autobyteus-web run guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`, and `build`.
4. Run temporary `rg` checks for old live accounting path retention and UI cost hardcoding regressions.
5. Record all final evidence in the execution coverage report.
6. Because repository-resident durable coverage will be added/updated, route the cumulative package back to `code_reviewer` after pass.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing durable coverage is partly valid but incomplete; several Codex/pricing assertions are stale. Coverage changes will be narrow and test-only unless final execution reveals an implementation defect.
