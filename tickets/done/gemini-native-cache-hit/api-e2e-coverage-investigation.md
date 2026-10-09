# API/E2E Coverage Investigation — gemini-native-cache-hit

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/requirements-doc.md` (SR-002, approved 2026-10-09)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/solution-revision-record.md`
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/probes/` (evidence only)
- Design Review Report: `N/A — not applicable` (direct Small/Low route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: Implementation complete (IR-001, commit `dd4b3de4a`) on the direct low-risk route
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

- **REQ-002 / BEH-002 / AC-002 / AC-003.** AGY `result.usage.input_tokens` excludes cache reads. The converter declares `input_token_semantic: "base_excludes_cache"`. The existing basis resolver then yields gross = input + cache read, standard = miss = input. Ingestion stays a `cumulative_snapshot` per AGY conversation. AC-002 alternate: a missing `cache_read_tokens` leaves gross = input and the cache state `not_reported`. AC-003 (live Token Meter after the fix: gross ≥ cache reads, hit < 100% whenever uncached input exists) is planned as user verification.
- **REQ-004 / BEH-003 / AC-005 / AC-006.** Gemini 3.1 Pro Preview is priced 2.00 / 0.20 / 12 at ≤200K and 4.00 / 0.40 / 18 at >200K. Reasoning output is billed at the tier's output price. Tier selection by gross prompt size and the 200,000 boundary are unchanged. 3.8 Flash is unchanged: 0.75 / 0.075 / 3.75 through 2026 and 1.50 / 0.15 / 7.50 from 2027-01-01.
- **REQ-005 / AC-007.** Fix-forward, `Directly Usable — No Migration`. Existing rows are read unchanged. An AGY series that spans the upgrade is not flagged as regressed. Its miss catches up once, standard input does not, and gross lacks the pre-upgrade cache reads (accepted).
- **REQ-001 / AC-001.** Documentation (review), not executable.
- REQ-003 / AC-004 were removed in SR-002. BEH-001 (the native request shape) is preserved and untouched.
- Implementation handoff: `Legacy / Compatibility Removal Check` is clean (no compatibility mechanism; replaced in place). `Persisted Data Transition Check` is `Directly Usable — No Migration`, with one clarification: standard input does not catch up in a spanning series. That is consistent with the design and accepted, so it is not a validation signal.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-002 (AGY result usage ingestion) and SCN-003 (native Gemini pricing). SCN-001 is preserved and unchanged; no in-scope behavior change.
- Real-use scenarios added from investigation:
  - **SCN-002a — multi-turn AGY conversation through the real server.** Real trigger: the user sends messages to an `antigravity_cli` agent run over the WebSocket. Each AGY turn emits a cumulative `result.usage`. The verbatim AGY 1.2.16 stdout recorded in `tests/fixtures/agy-compaction/agy-stream-auto-compaction-twice.stdout.jsonl` proves cumulative-per-process usage with `total = input + output`. This shape is replayed, so the first turn has a `zero_reported` cache.
  - **SCN-002b — an AGY conversation that spans the upgrade.** A pre-upgrade checkpoint is persisted in the real DB, then a post-upgrade snapshot for the same series arrives (AC-007; design transition note).
  - **SCN-003a — the native tier boundary.** A prompt of exactly 200,000 gross tokens, and one of 200,001 (design "Technical facts to verify").
  - **SCN-003b — native reasoning output** (`thoughtsTokenCount`) billed at the tier's output price (REQ-004 lists reasoning output).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-002 AGY usage semantic (`AgyStreamEventConverter` → basis resolver → fold → run record → GraphQL/WS) | Changed | design DS-001; handoff | Prove it through the real server with replayed AGY usage. Before this round, only in-memory unit fold coverage existed |
| BEH-003 3.1 Pro catalog prices (catalog → `TokenPriceConfigProvider` → `TokenCostCalculator` → run record → GraphQL) | Changed | design DS-002 | Prove it through the production native usage normalizer, enrichment transformer, store and GraphQL. Before this round, only catalog unit coverage existed |
| 3.8 Flash schedule | Preserved | AC-006 | Prove it through the same server path |
| Stored rows / spanning AGY series | Preserved (fix-forward) | design transition decision | DB-level direct-use proof |
| BEH-001 native request shape | Preserved | design | Untouched; no new coverage (REQ-003 removed) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Token-usage basis interpretation of AGY payloads; tier pricing values | Unit: converter, in-memory fold, catalog | Real DB store/codec, enrichment pipeline wiring, GraphQL projection | Server E2E (in-process real server, real SQLite) |
| API / transport / contract | Yes | AGY CLI stream-json → server WS `TOKEN_USAGE_UPDATED`, GraphQL `getAgentRunTokenUsageSummary` | None for AGY usage | Whole transport path | AGY fake-CLI transport E2E |
| Frontend component / state | No | The Token Meter UI is unchanged; it consumes the same WS/GraphQL fields | Existing web tests | — | — |
| Browser integration / user journey | No | — | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | No | AGY process lifecycle unchanged | — | — | — |
| Persisted-data transition | Yes (direct use) | Old-shape snapshot series state read by the current fold | In-memory fold unit test | Codec round trip through the real DB | Store-level E2E against the test DB |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes (contract) | AGY CLI usage semantics; Google pricing | Recorded AGY 1.2.16 stdout; live probe on 1.3.2 in investigation notes | Future AGY format change | Live AGY (AC-003, user verification) |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit` (branch `codex/gemini-native-cache-hit`)
- Project type: pnpm TypeScript monorepo; server is Fastify + type-graphql + Prisma/SQLite, tested with Vitest; the core library is `autobyteus-ts`, resolved from source through tsconfig paths in server tests
- Project testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/TESTING.md` (no closer `TESTING*.md` under `autobyteus-server-ts` or `autobyteus-ts`)
- Conflicting, missing, or unclear project instructions: None
- Required environment variables or secrets available: `N/A` (no provider credentials needed; the fake CLI emulates AGY)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` › Test layers | Layer and command map | Server single file: `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`; AGY fake-CLI E2E: `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs …`; core: `pnpm -C autobyteus-ts test` |
| `TESTING.md` › Server unit and integration baseline | Baseline gates | `test:unit`, `test:integration:prepare` + `test:integration`, `typecheck` expected green; Rule 9 for base failures |
| `TESTING.md` › Antigravity Native Argument Capture Regression | Shared fake-CLI rule | Fixture routes must coexist; companion `agy-failure-cli-routing.test.ts` protects routing |
| `TESTING.md` › Rules 2, 5, 9 | Safety | Never the user's app/data; stop what you start; explain base failures |
| `autobyteus-server-ts/AGENTS.md` | Package notes | `vitest run … --no-watch` |
| `autobyteus-server-ts/vitest.config.ts` | Test config | `tests/setup/prisma-global-setup.ts` gives a test-owned DB; `autobyteus-ts` resolved from `src` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process Studio server (AGY transport E2E) | `autobyteus-server-ts` | `startStudioE2eRuntimeServer()` inside the test, with a temporary app-data dir | Ephemeral port; fake AGY CLI child processes | `createAgentRun` success; WS open | `terminateAgentRun`, `app.close()`, `fs.rm(dataDir)` in `afterAll` |
| Test Prisma DB | `autobyteus-server-ts` | Vitest global setup | Test-owned SQLite | — | Created run records deleted in `afterAll` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| AGY usage stream | Shared fake CLI `tests/fixtures/agy-failure-cli.mjs` with a new `usage_report` route that replays the verbatim AGY 1.2.16 recorded `result` events | No model call; no `~/.gemini` writes | None persisted |
| Agent definition / run | GraphQL `createAgentDefinition` / `createAgentRun` | Temporary app-data dir | Deleted in `afterAll` |
| Native Gemini usage | Production `createGeminiTokenUsageObservation` with the real catalog `LLMModel` and a Gemini `usageMetadata` object | No provider call | Run records deleted |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- References: design-spec › Persisted Data / State Transition Decision; implementation-handoff › Persisted Data Transition Check
- Representative existing-data setup and required behavior: an AGY run record whose cumulative series checkpoint was written with the pre-fix semantic (the converter payload with `gross_includes_cache`, through the production enrichment pipeline and store, into the real DB). The current reader must read it unchanged. The next post-upgrade snapshot for the same series must be accepted without `cumulative_snapshot_regressed`, with the miss catching up once and gross lacking the pre-upgrade reads.
- Evidence planned: store-level E2E (AE-005) with GraphQL read-back and the persisted row's quality flags.
- Migration-specific scenarios: N/A
- Upstream ambiguity or reroute: None

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts` (new case) | AGY usage declares `base_excludes_cache` and carries raw counts only | REQ-002, AC-002 | Still Valid | Commit `dd4b3de4a` | Keep; add the AC-002 missing-cache-read alternate |
| `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-run-fold.test.ts` (2 new cases) | In-memory fold: AGY gross/miss; spanning series not regressed | REQ-002, AC-002, AC-007 | Still Valid | Values match design | Keep |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` (new + existing 3.8 Flash cases) | Catalog values and tiers | REQ-004, AC-005, AC-006 | Still Valid | — | Keep |
| `autobyteus-server-ts/tests/unit/token-usage/pricing/token-price-config-provider.test.ts` | Provider maps catalog/schedules (3.8 Flash schedule) | AC-006 | Still Valid | — | Keep |
| `autobyteus-server-ts/tests/e2e/token-usage/gpt56-token-usage-accounting-graphql.e2e.test.ts` | Tiered catalog pricing → store → GraphQL for GPT-5.6 | Pattern only | Out Of Scope | — | Pattern reused |
| `autobyteus-server-ts/tests/e2e/runtime/agy-*-transport.e2e.test.ts` | AGY transport behaviors; the fake CLI never emits `usage` | — | Out Of Scope (still valid) | Fixture has no usage | Rerun the routing guard and one sibling to protect fixture coexistence |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts` | Fixture route coexistence | Fixture change guard | Still Valid | TESTING.md | Rerun |
| `autobyteus-server-ts/tests/fixtures/agy-compaction/*.stdout.jsonl` | Verbatim AGY 1.2.16 stdout | Real AGY usage contract | Still Valid | README | Reused as the replay source |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| AE-001 | AGY cumulative usage through the real server: WS per-turn deltas and GraphQL run totals (gross = input + read, miss = standard = input, rate < 1, `price_missing`) | REQ-002, AC-002, AC-003 (server side), DS-001 | `autobyteus-server-ts/tests/e2e/runtime/agy-token-usage-transport.e2e.test.ts` + `usage_report` route in `tests/fixtures/agy-failure-cli.mjs` | No transport coverage of AGY usage existed; it detects a regression of the semantic or a pipeline wiring change |
| AE-002 | Native 3.1 Pro ≤200K (150K prompt) priced 2.00 / 0.20 / 12, reasoning at 12 | REQ-004, AC-005, DS-002 | `autobyteus-server-ts/tests/e2e/token-usage/gemini-native-pricing-graphql.e2e.test.ts` | Server cost path with the real catalog had no Gemini 3.1 Pro coverage |
| AE-003 | Native 3.1 Pro >200K (250K prompt) priced 4.00 / 0.40 / 18 | REQ-004, AC-005 | same file | Same |
| AE-004 | Tier boundary 200,000 → `prompt_le_200k`; 200,001 → `prompt_gt_200k` | Design "tier selection at exactly 200K" | same file | Boundary is a named technical fact to verify |
| AE-005 | Spanning AGY series through the real DB store: old checkpoint read unchanged; next snapshot accepted, not regressed | REQ-005, AC-007 | `agy-token-usage-transport.e2e.test.ts` (ungated store-level describe) | Codec round trip of the old checkpoint is not covered by the in-memory fold test |
| AE-006 | 3.8 Flash unchanged through the same path (2026: 0.75 / 0.075 / 3.75; 2027: 1.50 / 0.15 / 7.50) | AC-006 | `gemini-native-pricing-graphql.e2e.test.ts` | Preserved-behavior proof on the same server path |
| AE-007 | AGY usage without `cache_read_tokens` → `not_reported`, gross = input | AC-002 alternate | `agy-stream-event-converter.test.ts` (unit, with the production basis resolver) | Alternate outcome not covered |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Requirement / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| AE-001 | `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Add the `AGY_FAKE_CASE=usage_report` route (replays recorded result usage per turn) | AC-002/003 | Additive; other routes untouched |
| AE-001 | `TESTING.md` AGY fake-CLI row | Name the new transport file | Documentation of the durable suite | Additive |
| Baseline | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts` | Also delete the analytics daily facets of the model identifiers it records | TESTING.md Rule 9 (pre-existing leak) | Commit `871f01cb3` |
| Baseline | `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts` | Same | TESTING.md Rule 9 | Commit `871f01cb3` |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

All commands run from the worktree root; logs are under `tickets/in-progress/gemini-native-cache-hit/api-e2e-logs/`.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts tests/unit/token-usage --no-watch` | worktree root | Converter (incl. AE-007), fixture routing guard, token-usage unit area | Pass (19 files / 201 tests) | `order1-unit-focused.log` |
| 2 | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-token-usage-transport.e2e.test.ts --no-watch` | gated fake CLI | AE-001 (11 recorded turns) | Pass | `ae-001-agy-token-usage-transport.log` |
| 3 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage/gemini-native-pricing-graphql.e2e.test.ts --no-watch` | test DB | AE-002, AE-003, AE-004, AE-006 | Pass (5/5) | `ae-002-006-gemini-native-pricing.log` |
| 3b | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage/agy-token-usage-upgrade-continuation.e2e.test.ts --no-watch` | test DB | AE-005 shapes A/B | Pass (2/2) after the test redesign (ledger seq 3–5) | `ae-005-agy-upgrade-continuation.log` |
| 4 | TP-001: `git checkout 927796780 --` the 2 production files; run orders 2, 3, 3b and the converter test; `git checkout HEAD --` to restore | temporary | Discrimination | Pass: 8 new/changed cases fail on the pre-fix values; AE-006 (preserved) passes; restore verified (0 diff lines) | `tp-001-fail-before.log` |
| 5 | Same gate: `agy-native-tool-arguments`, `agy-interrupt-resend`, `agy-compaction-rotation`, `agy-compaction-gate-off`, `agy-failure`, `agy-context-files` transport suites | gated fake CLI | Shared fixture coexistence | Pass (6 files; 37 passed, 1 skipped: `RUN_AGY_ERROR_BROWSER` browser gate) | `order5-agy-sibling-transport.log` |
| 6 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage --no-watch` (with and without `--no-cache`) | test DB | Token-usage E2E regression | First run: 2 failures in `token-usage-analytics-graphql`, a **pre-existing** cross-file leak (see below); after baseline fix `871f01cb3`: Pass (13 files / 40 tests) in two different orders | `order6-e2e-token-usage.log` |
| 7a | `pnpm -C autobyteus-server-ts typecheck` | — | Production `src` | Pass | `order7-typecheck.log` |
| 7b | `pnpm -C autobyteus-server-ts test:unit` | — | Server unit baseline | Pass (666 files passed, 4 skipped; 5,104 tests passed, 7 skipped) | `order7-test-unit.log` |
| 7c | `pnpm -C autobyteus-server-ts test:integration:prepare` then `test:integration` | — | Server integration baseline | Pass with the documented known exception only: the 2 `agent-status-websocket` content-cadence cases (TESTING.md › Known exception); 70 files passed, 18 skipped (gated) | `order7-integration-prepare.log`, `order7-test-integration.log` |
| 8 | `pnpm -C autobyteus-ts exec vitest run tests/unit/llm --no-watch` | — | Catalog + LLM unit area | 399/400; the 1 failure is the known pre-existing `compaction-single-attempt-transport` Gemini retry timeout (cause found by Implementation Engineer, reproduced on base `927796780` by Solution Designer, recorded as OBS-002 and reported) | `order8-autobyteus-ts-llm-unit.log` |

**Pre-existing base failure found and fixed (TESTING.md Rule 9).** `token-usage-unit-prices-graphql` and `token-usage-ledger-provider-semantics` deleted only their run records. The daily analytics facets that recording an observation writes stayed in the shared test DB. When the Vitest sequencer ordered either file before `token-usage-analytics-graphql`, its range queries counted them:

- the DeepSeek facet (2026-08-29, 1,000,000 output tokens) broke "reconciles observation-time ranges…";
- the MAX_SAFE_INTEGER facet (2026-06-25) raised `TOKEN_USAGE_SAFE_INTEGER_EXCEEDED` in "keeps pre-feature run rows directly usable…".

It was reproduced with only those pre-existing files (`--no-cache`, owning file first). It is fixed in the owning files as its own commit, `871f01cb3`, labelled as a baseline fix.

## Test-Case Ledger Decision

- Ledger required: `Yes`. Seven independently meaningful cases plus gated fake-CLI runs.
- Canonical ledger path: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | AC-002 (+ alternate), AC-005, AC-006, AC-007 directly proven through server boundaries; AC-003 server side via replay | Whether AGY 1.3.2 (installed) still reports cumulative `result.usage` as the 1.2.16 recording does | Live AGY through the server (TP-002) |
| Changed-boundary execution directness | 95% | Real converter, event pipeline, SQL store, WS and GraphQL; real catalog and price provider | — | — |
| Cross-boundary integration realism and mock gap | 90% | The AGY CLI is emulated by a verbatim recording (1.2.16); Google is stood in only at the `usageMetadata` object (production normalizer) | The current CLI version is not exercised through the server | TP-002 |
| Environment, configuration, identity, and fixture fidelity | 95% | Test-owned DB, temporary app data, in-process server, real catalog, verbatim fixture | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Missing cache read, 200K boundary, two real compactions, both realistic pre-fix stored shapes, fail-before | AGY process restart (counter reset on `--conversation` resume) is unchanged and not exercised | Out of scope (unchanged fold behavior) |
| User-surface, browser, and desktop-shell confidence | N/A | No UI, browser or desktop code changed; the Token Meter consumes the WS/GraphQL fields proven here | Live Token Meter rendering is AC-003 user verification by plan | — |
| Durable regression coverage quality and relevance | 95% | 3 new E2E files + 1 unit case, each failing on the pre-fix values; baseline isolation fix | — | — |

- Overall post-repository confidence: 94% (simple average of the 6 applicable categories)
- Calculation method: simple average
- Every critical acceptance criterion directly proven: `Yes` (AC-003's live UI part is user verification by design)
- Any applicable category below `90%`: `No`
- Default clean-confidence target of `95%` met: `No` (94%; integration realism at 90%)
- Material residual risks: the installed AGY 1.3.2 `result.usage` shape and cumulativeness through the server

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Live API`. The installed `agy` 1.3.2 runs through the real in-process server (temporary probe TP-002) with 3 tiny turns on `gemini-3.8-flash-low`.
- Specific confidence gap or residual risk addressed: the investigation's 1.3.2 probe listed per-call values, so it was unproven whether 1.3.2 `result.usage` is cumulative per process, which the server's `cumulative_snapshot` ingestion assumes.
- Why the selected mode can materially improve confidence: it exercises the exact current CLI → server → store → GraphQL path.
- Expected confidence after the selected validation: ≥95%
- Browser-specific decision and rationale: not required. No UI change; the proven WS/GraphQL fields are what the Token Meter renders.
- Result: see the execution coverage report (TP-002 Pass).

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TP-001 | Temporarily restore the pre-fix literal and prices (checkout of the 2 production files from `927796780`), run the new cases, then restore | New tests fail on the old behavior | One-time discrimination check |
| TP-002 | Temporary vitest file (deleted after the run) reusing AE-001's harness with `ANTIGRAVITY_CLI_COMMAND` unset and the installed `agy` 1.3.2 | 1.3.2 cumulative `result.usage` through the real server; AC-003 server side | Uses AGY quota and the user's AGY login; not deterministic |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| AC-001 documentation | Review-only criterion | None | Delivery/review |
| BEH-001 native request shape | Preserved; REQ-003 removed | None for this change | — |
| Token Meter UI rendering | UI unchanged; consumes the same fields proven at WS/GraphQL | Low | AC-003 user verification |
| Live AGY run with cache reads > 0 through the server | TP-002's small (~9K) prompts produced no cache reads. A large-context live run costs significant AGY quota. The server path with reads > 0 is proven by the verbatim replay, and the investigation's direct 1.3.2 probe showed reads excluded from `input_tokens` | Low | AC-003 user verification |
| AGY process restart (cumulative counters per process on `--conversation` resume) | Unchanged fold behavior; outside this change | Low | — |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added / fixture route added; nothing removed)
- Post-repository confidence: 94%
- Broader validation decision: `Required` → Live API (TP-002), executed
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: Two test-design corrections during execution (AE-005; see the ledger). Observation recorded for the report: under the pre-fix basis, real AGY series were routinely rejected as `cumulative_snapshot_regressed` whenever cache reads grew faster than input, so pre-fix AGY rows also under-count rejected turns. That is historical data under the accepted fix-forward, and the fix removes the cause for new data.
