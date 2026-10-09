# API/E2E Coverage Investigation — anthropic-prompt-caching

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/requirements-doc.md` (SR-005, approved)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/design-spec.md` (SR-005)
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/probes/` (evidence only)
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/design-review-report.md` (ARCH-REV-003, Pass)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/implementation-revision-record.md` (IR-001)
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/code-review-report.md` (CRR-001, Pass 9.4)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/code-review-revision-record.md`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: code review pass (CRR-001) from `/software_engineering_team/code_reviewer`
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this file, round 1
- Code under validation: branch `codex/anthropic-prompt-caching`, HEAD `80845f45e` (base `927796780`)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review of the added durable test)
- Proportional test-code review decision: `Required`

## Current Requirement And Design Basis

These must be proven:

- Native-runtime Anthropic conversation requests carry 2 cache breakpoints, both 1h: the system block and the top-level automatic marker (REQ-001/005, AC-001).
- The request prefix stays append-only and byte-identical across tool continuations and new turns (REQ-002, AC-002).
- Earlier tool-cycle thinking is kept, so a new turn writes only the new input (REQ-003, AC-004).
- Thinking is removed once when tools or the leading system prompt change, and on the first request after a restore (REQ-012, AC-013).
- Late SYSTEM notes are appended in place and do not change `system` (REQ-010, AC-011).
- The compaction one-shot stays uncached (REQ-004, AC-005).
- The meter prices cache reads and writes so it equals the Console (REQ-006, AC-006/007).
- The Sonnet 5 price is fixed (REQ-007, AC-008).
- The SDK is 0.132.1 (REQ-011, AC-012).
- The provider-native boundary holds (REQ-013, AC-014).
- No regressions (REQ-008, AC-009).

The critical live criteria are AC-003, AC-004, AC-011 and AC-013(a)/(b). Run them with Anthropic's strict preserved-thinking check (`thinking.block_binding.prefix_mismatch_behavior: "error"`, beta `thinking-binding-controls-2026-08-01`), used as a validation harness only. Escalation trigger: any 400 `prefix_binding_mismatch` is `Design Impact`, routed to the Solution Designer (design-spec § Task Size; code review P-005 note).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001, SCN-002, SCN-004 (meter half; the Console comparison is user verification, AC-007), SCN-005, SCN-006. SCN-003 is covered by unit tests only (see Not Tested).
- Real-use scenarios added from the implementation:
  - **SCN-005 mid-tool-round (P-005).** The user has tool approval on, the agent waits for approval of a `tool_use`, and in that window the user changes Settings → Default image model. Trigger: the `updateServerSetting` GraphQL mutation, the Settings page's own call, which runs `reloadMediaToolSchemas`. Then the user approves. This is the exact window the design names as unverified.
  - **SCN-006 restore with a pending tool call.** The user stops a run while a tool approval is pending (last assistant turn = `tool_use`), then reopens it and continues. Trigger: Stop (`terminateAgentRun`), then `restoreAgentRun`, then send, the same sequence the app uses after a restart.
  - **SCN-002 interruption.** The user presses Stop generation (`INTERRUPT_GENERATION`) while a tool approval is pending, then sends a new message.
- Contrived scenarios not tested: none recorded by the designer.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 cache markers on conversation requests | Added | REQ-001/005, design DS-001 | Unit (adapter) + live wire-body capture + live usage |
| BEH-005 append-only + prefix guard + provider policy | Changed | REQ-002/003/012/013, DS-003/005 | Unit prefix-flow + live strict-mode journeys (new turn, Settings change mid-round, restore) |
| BEH-007 late note in place | Changed | REQ-010 | Unit + live interruption journey |
| BEH-004 compaction one-shot uncached | Preserved | REQ-004 | Unit only (byte-identical one-shot path) |
| BEH-002/003 usage parse + meter pricing | Preserved | REQ-006 | Unit + live meter-vs-raw-usage reconciliation |
| BEH-006 Sonnet 5 price | Changed | REQ-007 | Unit (catalog row, server price row) |
| REQ-011 SDK 0.132.1 | Changed | AC-012 | Resolved-version check + all live calls go through 0.132.1 |
| REQ-013 provider-native boundary / single render | Changed (structural) | AC-014 | Static unit test + workspace grep (code review) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `LLMRequestAssembler`, `MemoryManager` binding, provider-native policy | Unit: prefix-flow, assembler, provider-native, memory suites | Real Anthropic acceptance of the stripped/kept shapes | Live API (strict mode) |
| API / transport / contract | Yes | Anthropic Messages request body (`system` blocks, `cache_control`, kept thinking) | Unit with mocked SDK client | Mocked client cannot prove cache hits, TTL acceptance, or strict prefix-binding acceptance | Live API through the server |
| Frontend component / state | No | Meter UI unchanged | — | — | — |
| Browser integration / user journey | No | No UI change | — | — | — |
| Authentication / session / permissions | No | Key resolution unchanged (vault) | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | Restore → new `MemoryManager` (digest null) → one strip | Unit prefix-flow restore via `WorkingContextSnapshotBootstrapper` | Server restore path (`restoreAgentRun` → `buildAgentConfig`) with a real persisted snapshot, against Anthropic | Live server journey |
| Persisted-data transition | Yes (read ownership only) | `provider_native_assistant_turn` key unchanged | Snapshot serializer round-trip unit | Restore of a real snapshot holding thinking | Live server restore |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | Anthropic API + SDK 0.132.1 | None live | Cache hit rate, 1h TTL writes, strict-mode acceptance | Live API |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching` (branch `codex/anthropic-prompt-caching`)
- Project type and runtime stack: pnpm TypeScript monorepo. The core is `autobyteus-ts` (agent runtime, LLM layer); the server is `autobyteus-server-ts` (Fastify, GraphQL, WebSocket, Prisma/SQLite). Tests use Vitest.
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/TESTING.md`. No closer `TESTING*.md` exists for `autobyteus-ts` or `autobyteus-server-ts`.
- Conflicting or unclear instructions:
  - TESTING.md says real-provider credentials go into the target database vault through the importer. The existing e2e helper `tests/e2e/helpers/live-runtime-secret-vault-helpers.ts` saves the environment key into the **test-owned** database vault. That is the repository's "test vault" mechanism, and I use it.
  - The key is read in-process from `/Users/normy/.autobyteus/server-data/.env`. The user permitted this (investigation notes 2026-10-09). The key is never printed or written to evidence.
- Required secrets available: `Yes` (Anthropic API key, by user permission)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Test layers, rules | Server unit/integration baseline; real-provider E2E; Rule 2: never use the user's app/data; Rule 9: base failures; keep artifacts in the ticket |
| `AGENTS.md`, `DESIGN.md` | Repo instructions | Follow TESTING.md |
| `autobyteus-server-ts/vitest.config.ts`, `tests/setup/*` | Test DB | Test DB `tests/.tmp/autobyteus-server-test.db`; e2e keeps the inherited environment (no isolation) |
| `tests/e2e/helpers/studio-runtime-test-server.ts` | Real studio composition | `buildStudioServer` + startup tool loader (registers media tools), HTTP GraphQL + `/ws/agent/<runId>` on a free port |
| `tests/e2e/helpers/live-runtime-secret-vault-helpers.ts` | Test vault | Saves `ANTHROPIC_API_KEY` from the env into the test DB vault |
| `tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts`, `agent-initiated-collaborators.e2e.test.ts` | Precedent | `APPROVE_TOOL`, `INTERRUPT_GENERATION`, `terminateAgentRun` → `restoreAgentRun`, `ensureProviderModelCatalog` |
| `probes/strategy-probe.mjs`, `probes/prefix-change-probe.mjs` | Strict-mode recipe | Beta header + `thinking.block_binding.prefix_mismatch_behavior: "error"` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Studio server (in the Vitest process) | `autobyteus-server-ts` | `startStudioE2eRuntimeServer()` in `beforeAll` | Free port on 127.0.0.1; temp app-data dir | Listen address returned; WS `CONNECTED` | `fastify.close()` in `afterAll`; temp dirs removed |
| Anthropic API | external | — | claude-opus-5-5; costs real credits | First call 200 | — |
| Test DB | `autobyteus-server-ts/tests/.tmp` | Vitest global setup | Test-owned | — | Token-usage rows of the run deleted in `afterAll` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Anthropic key | `initializeLiveRuntimeSecretVaultFromEnvironment` (test vault) | Passed in the env of a sanitized `env -i` command; never logged | Test vault closed; key stays only in the test DB |
| Agent definition, run, workspace | GraphQL `createAgentDefinition` / `createAgentRun`; `mkdtemp` workspace with 30 chunk files | Temp app-data dir via `setCustomAppDataDir` | Deleted in `afterAll` |
| Inherited live-app variables (`AUTOBYTEUS_MEMORY_DIR`, `AUTOBYTEUS_DATA_DIR`, `DATABASE_URL`, compaction knobs …) | — | They point at the user's app. The run uses `env -i` with only PATH/HOME/TMPDIR/locale + gate + key | — |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration` (key `provider_native_assistant_turn`, shape unchanged).
- References: design-spec § Persisted Data / State Transition Decision; implementation handoff § Persisted Data Transition Check.
- Representative existing-data setup: a run's real `working_context_snapshot.json`, written by the current runtime, holding Anthropic native turns with thinking. It is read back through the normal restore path (`restoreAgentRun`).
- Evidence planned:
  - unit serializer round-trip (existing);
  - live restore of a real snapshot that holds thinking (APC-E2E-005/006): the snapshot file contains `"type":"thinking"` before restore, and the first request after restore carries none and is accepted.
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/llm/api/anthropic-llm-prompt-caching.test.ts` | Adapter markers: sync/stream, no scope, no system, late note, kwargs/extraParams override dropped | AC-001, AC-005, AC-011 | Still Valid | Reviewed source; core unit run | Keep |
| `autobyteus-ts/tests/unit/llm/api/anthropic-conversation-prefix-flow.test.ts` | Real MemoryManager → assembler → AnthropicLLM (mocked SDK): AC-002 byte-identical prefix (tool continuation + new turn), AC-004 no removal at a new turn, AC-011 real interruption, AC-013 change/no-change/mid-round/restore/failed request | AC-002/004/011/013 | Still Valid | Core unit run | Keep; live tests prove the provider side |
| `autobyteus-ts/tests/unit/llm/api/anthropic-signed-tool-continuation.test.ts` | Signed replay within a tool cycle | REQ-008 | Still Valid | Core unit run | Keep |
| `autobyteus-ts/tests/unit/llm/provider-native/provider-native-history.test.ts` | Neutral operations, fail-closed unknown provider | AC-014 | Still Valid | Core unit run | Keep |
| `autobyteus-ts/tests/unit/provider-native-boundary.test.ts` | Static AC-014 import/text check | AC-014 | Still Valid | Core unit run | Keep |
| `autobyteus-ts/tests/unit/agent/llm-request-assembler.test.ts`, `loop/llm-phase-tool-protocol-recovery.test.ts` | Guard order; `streamMessages(messages, kwargs, options)` with `request.tools` and the cache scope | AC-002, AC-013, AC-014 | Still Valid | Core unit run | Keep |
| `autobyteus-ts/tests/unit/memory/**` (compaction builder, validator, snapshot serializer, direct compression strategy) | Compaction strip; no cache scope on the summarizer; snapshot round-trip | AC-005, AC-009, persisted data | Still Valid | Core unit run | Keep |
| `autobyteus-ts/tests/unit/llm/api/token-usage-normalizers.test.ts`; `autobyteus-server-ts/tests/unit/token-usage/pricing/*` | 1h write/read parsing; Opus 5.5 components; Sonnet 5 row | AC-006, AC-008 | Still Valid | Server unit run | Keep |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Sonnet 5 catalog price | AC-008 | Still Valid | Core unit run | Keep |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Real-runtime token-usage persistence (LM Studio / Codex / Claude) | REQ-006 (general) | Out Of Scope | Does not cover the Anthropic native runtime | None |
| `autobyteus-ts/tests/integration/llm/api/anthropic-llm.test.ts` | Live adapter smoke (gated) | REQ-008 | Still Valid (not run; does not exercise caching or the agent path) | — | None |
| `autobyteus-ts/tests/integration/agent/provider-native-tool-continuation-flow.test.ts` | Scripted provider continuation through the runtime | REQ-008 | Still Valid | Base-identical integration status per handoff | None |

No existing repository test exercises native Anthropic caching, strict-mode acceptance or the server restore/Settings paths against the real provider.

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| APC-E2E-001..008 | Live native Anthropic run through the real studio server: caching, append-only, interruption, Settings change mid tool round, restore (text and pending tool_use), meter reconciliation, strict-mode control | AC-001/002/003/004/006/011/012/013, P-005, RSK-003 | `autobyteus-server-ts/tests/e2e/runtime/autobyteus-anthropic-prompt-caching-live.e2e.test.ts` (gated `RUN_ANTHROPIC_CACHE_E2E=1`) | Caching, TTL and prefix-binding acceptance are provider behavior that mocks cannot prove. The suite must be rerunnable when the adapter, memory history or SDK changes (the same pattern as other gated live suites) |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-ts exec tsc --noEmit -p tsconfig.build.json` | worktree root | Core production typecheck | Pass (exit 0) | `api-e2e-evidence/core-tsc-build.log` |
| 2 | `pnpm -C autobyteus-server-ts typecheck` | worktree root | Server production typecheck on SDK 0.132.1 (AC-012) | Pass (exit 0) | `api-e2e-evidence/server-typecheck.log` |
| 3 | `pnpm -C autobyteus-ts exec vitest run tests/unit --no-watch` | worktree root | All core unit coverage incl. AC-001/002/004/005/011/013/014 | 1859 passed / 1 failed (297 files). The failure is the known base-identical Gemini retry product issue (`compaction-single-attempt-transport.test.ts`), already reported by implementation | `api-e2e-evidence/core-unit.log` |
| 4 | `pnpm -C autobyteus-server-ts test:unit` | worktree root | Server baseline incl. pricing (AC-006/008) | Pass (666 files / 5101 tests; 4 files / 7 tests skipped) | `api-e2e-evidence/server-unit.log` |
| 5 | Live E2E (see Live Environment) | `autobyteus-server-ts` | APC-E2E-001..005, 007, 008 | Pass (run 6: 7/7; runs 1–5 history in the ledger) | `api-e2e-evidence/live-run-6/` |

## Test-Case Ledger Decision

- Ledger required: `Yes`. One long-running (about 20–40 minutes), paid live run with 8 dependent cases on one run, and a real interruption risk.
- Canonical ledger path: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 60% | All unit-level ACs pass | AC-003/004/011/013 require live provider proof (critical) | Live strict-mode run |
| Changed-boundary execution directness | 60% | Adapter body shape is asserted against a mocked SDK client | The provider boundary is mocked | Live API |
| Cross-boundary integration realism and mock gap | 50% | Prefix-flow uses real memory/assembler/adapter | Anthropic acceptance and caching unproven; server Settings/restore paths not exercised | Live server journey |
| Environment, configuration, identity, and fixture fidelity | 70% | Typecheck on SDK 0.132.1 | No live call on 0.132.1 | Live run |
| Failure, edge-case, lifecycle, and recovery evidence | 60% | Unit restore/mid-round/failed-request cases | P-005 unverified live; real restore path | Live server restore and Settings change |
| User-surface, browser, and desktop-shell confidence | N/A | No UI/shell change; the meter UI is unchanged and already renders cache rows | — | — |
| Durable regression coverage quality and relevance | 85% | Strong unit coverage plus a static boundary test | No durable live guard | Gated live E2E |

- Overall post-repository confidence: 64% (simple average of the 6 applicable categories)
- Every critical acceptance criterion directly proven: `No` (AC-003, AC-004, AC-011, AC-013 live)
- Any applicable category below 90%: `Yes`, all six
- Default clean-confidence target met: `No`
- Material residual risks: P-005 (strip mid tool round), RSK-003 (unknown prefix edit → 400), real cache hit rate

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Live API` through the real server boundary (studio server in-process, HTTP GraphQL and agent WebSocket, native runtime, real Anthropic)
- Gap addressed:
  - provider acceptance under strict prefix binding;
  - the real cache hit rate;
  - the Settings → `reloadMediaToolSchemas` → running agent path;
  - the server restore path with a real snapshot;
  - meter = raw usage.
- Why this mode fits: it enters through the same GraphQL/WebSocket commands the desktop app sends. Only the Electron shell and renderer are skipped, and they are unchanged.
- Expected confidence after: ≥ 95% if every case passes.
- Browser decision: not required. There is no renderer change. The meter UI already renders cache rows (AC-006 unit tests); the Console comparison is user verification (AC-007).
- Desktop shell: not changed; the isolated desktop app is not needed.

## Live Environment And Fixture Plan

- **Startup order:**
  1. Clean env (`env -i` + PATH/HOME/TMPDIR/LANG) + `RUN_ANTHROPIC_CACHE_E2E=1` + `ANTHROPIC_API_KEY` (read from the user's server `.env` inside the command, never echoed) + `ANTHROPIC_CACHE_E2E_EVIDENCE_DIR`.
  2. Vitest global setup creates the test DB.
  3. The test installs the strict transport wrapper on `globalThis.fetch` (test-only), then saves the key into the test vault.
  4. It starts the studio server.
- **Environment choices:**
  - Model `claude-opus-5-5` (AC-003).
  - The run uses `autoExecuteTools: false`, so the test approves each `read_file` like a user. That gives the real "waiting between tool_use and its continuation" window.
- **Strict harness:** the wrapper adds header `anthropic-beta: thinking-binding-controls-2026-08-01` and `thinking.block_binding.prefix_mismatch_behavior: "error"` to every `POST /v1/messages`. It records the body exactly as production built it, plus status, usage (SSE) and error body. It never logs headers. A control case (APC-E2E-008) proves enforcement: kept thinking + a changed tool must return 400.
- **Readiness:** the WebSocket `CONNECTED` frame; the GraphQL mutation results.
- **Seed data:** 30 chunk files in a temp workspace; one agent definition with `read_file` and `generate_image` (the media tool whose schema follows Settings → default image model).
- **Journeys:**
  - T1 and T2: two tool-cycle turns of 12 reads each;
  - T3: interrupt at a pending approval;
  - T4: a new turn after the interruption;
  - T5: Settings change mid tool round;
  - Stop/restore + T6;
  - T7: Stop at a pending approval, restore + T8;
  - meter query; strict control.
- **Evidence:**
  - per-call body, status and usage JSON;
  - a case results JSON;
  - the WebSocket frame log;
  - the ledger in the ticket.
- **Cleanup:**
  - terminate the run;
  - close the server;
  - remove the temp app-data and workspace dirs;
  - delete the run's token-usage rows;
  - restore `globalThis.fetch`.

## Temporary Executable Validation Plan

None. The strict harness is part of the durable gated test.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| AC-005 live (compaction summarizer uncached) | Triggering automatic compaction needs a context near the threshold (high cost). The one-shot path is byte-identical to before; unit tests assert no scope and no `cache_control` | Low | None |
| AC-007 Console comparison | Needs the user's Anthropic Console | Low (meter = raw-usage reconciliation is proven here) | User verification at delivery |
| Whole-process app restart | Stop → `restoreAgentRun` builds a new runtime and `MemoryManager` from the persisted snapshot, the same code path as after an app restart. A separate OS process restart is not exercised | Low (the digest is per-`MemoryManager` and in-memory by design) | None |

## Ambiguities Or Reroute Triggers

None before execution. A 400 `prefix_binding_mismatch` (or any strict-mode 400) during live validation is `Design Impact` for the Solution Designer.

## Post-Execution Update (round 1)

- Revised during execution, with evidence:
  - **Scenario.** The audit-style prompt plus `thinking_display: "summarized"` was needed to produce thinking at tool steps. An arithmetic-chain prompt is refused by the model (`api-e2e-evidence/refusal-probe/`).
  - **APC-E2E-006.** Moved to Not Tested. Stop with a pending approval hangs on base and HEAD (pre-existing DEF-A, `stop-pending-probe/`).
  - **APC-E2E-007.** Runs before the restore. Restored-run usage is dropped by turn-id idempotency collision on base and HEAD (pre-existing DEF-B, `restore-usage-probe/`).
- Final result and scorecard: see `api-e2e-execution-coverage-report.md` (Pass, 95%).

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added: `Yes` (one gated live E2E file)
- Post-repository confidence: 64%
- Broader validation decision: `Required` (Live API)
- Reroute Required Before Validation Execution: `No`
