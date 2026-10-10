# Implementation Handoff — compaction-prompt-cache-reuse

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Independent architecture review was selected (Large/High) and passed (ARCH-REV-002). The handoff route is decided by `get_handoff_rules` (Large/High → Code Review).
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/requirements-doc.md` (SR-004; approved baseline SR-002)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/solution-revision-record.md` (SR-001..004)
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/design-spec.md` (SR-004)
- Supplemental task artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/probes/` (evidence only; `fork-summary-probe.mjs` is the live-validation recipe)
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/design-review-report.md` (ARCH-REV-002, Pass)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/architecture-review-revision-record.md`
- Solution handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/solution-handoff.md`
- Triggering rework report: N/A (initial implementation)
- Local check summaries: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/implementation-evidence/`

## Current Implementation Summary

1. **Core-owned summarizer (Intended Change 1).**
   - New `memory/compaction/compaction-summarizer.ts` (`CompactionSummarizer`) produces the summary through `memory/compaction/conversation-summary-port.ts` (`ConversationSummaryPort`, `SummaryRequestIdentity`, `SummaryAttemptResult`).
   - `PendingCompactionExecutor` takes `summaryPort` (replacing `createCompressionStrategy`). It calls the summarizer with the compaction baseline messages plus today's transcript content. The plan, validator, commit, recovery and status logic are unchanged.
   - `createEnabledMemoryCompactionConfiguration(policy)` is policy-only.
   - Deleted: `DirectLlmCompressionStrategy`, `CompressionStrategy`, `CompressionStrategyFactory`, `CompactionLlmFactory`, `CompactionCompressionExecution`. Exports are updated.
2. **Cached summary first, same-model fallback (2 and 3).**
   - `summarize` sends the cached request if `fitsInputBudget(baseline, instruction)` passes. That request is the baseline conversation plus `COMPACTION_SUMMARY_INSTRUCTION` (`COMPACTION_SUMMARY_PROMPT` plus a suffix: summarize the whole conversation, do not restate system instructions, no tools, do not continue the task). It gets up to 2 attempts with no backoff.
   - After that comes the transcript request (summary prompt as system, rendered transcript as user): up to 3 attempts with today's 1 s and 2 s backoffs.
   - These count as failed attempts: tool calls, an `incomplete` completion, a parse failure, or a provider error.
   - Attempt numbers are unique across both modes (1..5).
3. **Port on the agent's LLM.** New `agent/loop/llm-phase-summary-port.ts` (`LlmPhaseSummaryPort`), built by `LlmPhase` with the agent id, its LLM, the exact `toolSchemas`, `requestCapacity` and the notifier.
   - **Cached request.** It uses `sanitizeMediaInputMessages`, the same sanitizer as the assembler, plus the instruction as a USER message. Its kwargs and options come from the new shared `agent/loop/conversation-request.ts` (`conversationRequestKwargs`, `conversationRequestOptions`), which `LlmPhase`'s own call now uses too. The options add `retryMode: 'single_attempt'`.
   - **Transcript request.** Kwargs are `{logicalConversationId}` only; options are `{signal, turnId, retryMode:'single_attempt'}`, with no cache scope. It runs the old input-budget check first.
   - Both requests are streamed. Content is collected; any `tool_calls` chunk sets `hasToolCalls`; usage comes from the completing chunk.
   - **Budget.** `fitsInputBudget` checks `estimateMessagesTokens(messages + instruction)` plus a tool-schema estimate (JSON length / 4) against `requestCapacity.inputBudget`. That budget already excludes the output reservation.
4. **Prefix guard before and after compaction (4).**
   - `LLMRequestAssembler.bindRequestPrefix(tools)` is public and single-sourced.
   - `prepareRequest` binds before compaction (only when compaction can run, i.e. not on a tool continuation), then again before the recovery checkpoint.
   - `LlmPhase` binds before the after-final compaction.
5. **Isolation and release (5, ARCH-001, N-1).**
   - Every attempt uses `compaction_<operationId>_<attempt>`, never the agent id.
   - New `BaseLLM.releaseConversation(id, {signal})` is a no-op by default. `AutobyteusLLM` overrides it to call `client.cleanup(id)` if the id was used, then drop it from `usedConversationIds` (it stays there on failure, so `LLM.cleanup` retries later).
   - The port releases in a `finally` block on its own `AbortController`, raced against a 10 s timer. Failures are only logged.
   - Compaction never calls the agent LLM's `cleanup`.
6. **One provider call per attempt (6):** `single_attempt` on both requests.
7. **Metering (7).** One `TOKEN_USAGE_UPDATED` event per attempt that reports usage:
   - `ingestion_kind: 'autobyteus_compaction'`, `runtime_kind: 'autobyteus'`;
   - `llm_call_id: <executionTurnId>:compaction:<operationId>:<attempt>`, `idempotency_key: <agentId>:<llm_call_id>`;
   - `latest_prompt_tokens: null`, `context_window_usage_percent: null`, `effective_context_window_tokens: <capacity>`.
8. **Compaction-model setting removed (8).**
   - Server: deleted `config/compaction-model-settings.ts` and `agent-execution/compaction/compaction-llm-factory.ts`; removed the settings-service registration and the durable-writer special case; removed `compactionLlmFactory` from `AutoByteusAgentRunBackendFactory`, `agent-provider-factory-builder.ts` and `create-process-agent-provider-factory-builder.ts`. The backend now builds `createEnabledMemoryCompactionConfiguration(new CompactionPolicy())`.
   - Web: deleted `CompactionModelSettings.vue`, `utils/compactionModelSettings.ts` and its spec; removed the model parts from `CompactionConfigCard.vue`; removed 9 model i18n keys in en and zh-CN; updated the card description.
   - `CompactionExecutionMetadata` and `CompressionAttemptObservation` gained `mode: 'cached' | 'transcript'`.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-004`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A` (implementation note N-1 applied)

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: three packages plus test-support changed. The shared `EnabledMemoryCompactionConfiguration` contract and the executor options changed, `BaseLLM` gained `releaseConversation`, a persisted setting was removed, and the work interacts with Anthropic's preserved-thinking check.
- Selected route: `Code Review`
- Lightweight implementation self-review for the direct route: `Not Applicable` (Large/High)
- New design impact or escalation trigger: `None`. The escalation triggers were checked:
  - The only compaction callers are `LlmPhase` and `LLMRequestAssembler` (grep).
  - No product consumer of `createCompressionStrategy` or the setting key exists outside the designed files. The test-only consumer `test-support/live-e2e/live-e2e-harness.ts` was migrated (below). Applications and the message gateway have no references.
  - Streaming is used for both paths, so no non-streaming limit applies.
  - The server projection accepts `autobyteus_compaction` events (tested).
  - No live fork was run here, so a fork 400 has not been observed.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Cached summary request on the agent's LLM, then same-model fallback; plan, validator and commit preserved | `compaction-summarizer.ts`, `conversation-summary-port.ts`, `pending-compaction-executor.ts`, `llm-phase-summary-port.ts`, `conversation-request.ts`, `llm-phase.ts` | Done. AC-001: the port test compares real Anthropic request bodies (normal request vs. cached summary request: system, tools, thinking, max_tokens, cache_control equal; messages prefix equal; then the reply and the instruction). The runtime integration also checks the cached request against the agent's last request through the real `LlmPhase`/after-final path. AC-004: summarizer tests (tool call, invalid, incomplete, provider error, budget overflow, exhaustion) |
| BEH-001 (isolation) | Compaction never posts into the agent's provider session; sessions released | `BaseLLM.releaseConversation`, `AutobyteusLLM.releaseConversation`, port `finally` release | Done. AC-009 with a fake `AutobyteusLLM` client: ids `compaction_op_12_1/2`, cleanup for exactly those ids, the agent session untouched, `llm.cleanup` not called; abort releases with a live signal (N-1); a hanging release is bounded to 10 s |
| BEH-002 | Compaction-model setting removed | server and web removals above | Done. AC-005: the web card spec (no model control, a leftover value never written, remaining settings save); server settings unit and GraphQL e2e (leftover value inert, generic custom and deletable, startup unaffected) |
| BEH-003 | Compaction metered | port `reportUsage` | Done. AC-007 unit: port event shape; server fold test (compaction events add to totals and cost, priced with cache components) |
| BEH-004 | Guard before and after compaction | `llm-request-assembler.ts` `bindRequestPrefix`; `llm-phase.ts` after-final bind | Done. AC-006 unit: real `MemoryManager`; tools changed means compaction sees no thinking; order test (bind → compaction → bind → checkpoint) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- **New, core:** `src/memory/compaction/compaction-summarizer.ts`, `src/memory/compaction/conversation-summary-port.ts`, `src/agent/loop/llm-phase-summary-port.ts`, `src/agent/loop/conversation-request.ts`.
- **Changed, core:** `src/memory/compaction/{pending-compaction-executor,compaction-execution,memory-compaction-configuration,compaction-summary-prompt}.ts`, `src/memory/index.ts`, `src/agent/llm-request-assembler.ts`, `src/agent/loop/llm-phase.ts`, `src/llm/base.ts`, `src/llm/api/autobyteus-llm.ts`.
- **Deleted, core:** `src/memory/compaction/{direct-llm-compression-strategy,compression-strategy}.ts`.
- **Server:**
  - deleted `src/config/compaction-model-settings.ts` and `src/agent-execution/compaction/compaction-llm-factory.ts`;
  - changed `src/services/server-settings-service.ts`, `src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts`, `src/agent-execution/providers/agent-provider-factory-builder.ts`, `src/compositions/create-process-agent-provider-factory-builder.ts`.
- **Web:** deleted `components/settings/CompactionModelSettings.vue`, `utils/compactionModelSettings.ts`; changed `components/settings/CompactionConfigCard.vue` and `localization/messages/{en,zh-CN}/settings.ts`.
- **test-support:** `live-e2e/live-e2e-harness.ts`.
  - There is now one capture on the agent's LLM, split by conversation id.
  - `inspectSummaryRequest` (renamed from `inspectDirectSummaryRequest`) validates both cached and transcript summary requests.
  - The `directSummary*` evidence fields became `summary*`, and new fields were added: `summaryOnAgentModelVerified` and `summaryModes`.
  - New check: every summary request ran on the primary model.
- **Tests:**
  - New core: `tests/unit/memory/compaction-summarizer.test.ts`, `tests/unit/memory/compaction-summary-prompt.test.ts` (prompt hash moved here plus the instruction hash), `tests/unit/agent/loop/llm-phase-summary-port.test.ts`.
  - New server: `tests/unit/token-usage/projections/token-usage-compaction-ingestion.test.ts`.
  - Adapted: executor harness, assembler, configuration, agent-config/factory, the runtime compaction integration, the server recovery fixture, backend-factory unit and integration tests, provider builder, settings service and GraphQL e2e, the live boundary unit test, the live quality and capabilities e2e, and the web card spec.
  - Deleted (they tested only removed code): core `direct-llm-compression-strategy.test.ts`; server `config/compaction-model-settings.test.ts`, `compaction/compaction-llm-factory.test.ts`, `compaction/compaction-parent-credentials.test.ts`, `compaction/compaction-provider-requests.test.ts`; web `CompactionModelSettings.spec.ts`.
- **Docs:** `autobyteus-ts/docs/agent_memory_design.md`; `autobyteus-server-ts/docs/{ARCHITECTURE.md,modules/agent_memory.md}`; `autobyteus-web/docs/{settings.md,agent_execution_architecture.md}`.

## Important Assumptions

- **Optional summarizer seam.** `PendingCompactionExecutorOptions` keeps an optional `summarizer?: CompactionSummarizer`, following the existing optional `planner` and `outputValidator`. The executor lifecycle tests stay focused and fast (the real summarizer waits 1 s and 2 s between transcript retries); summary production has its own tests. Production always uses `new CompactionSummarizer(summaryPort)`.
- **`SummaryAttemptResult` has no separate `completion` field.** The design listed one, but it would duplicate `metadata.completionStatus`, so it was left out to keep the shared structure tight.
- **Streamed attempts report completion `'unknown'`.** `ChunkResponse` carries no completion status. A truncated summary still fails the parser (missing closing marker) and counts as a failed attempt. Streaming is needed because the agent's own `maxTokens` would break non-streaming SDK calls.
- **No backoff between the 2 cached attempts.** The fallback is the recovery path. The transcript path keeps today's 1 s and 2 s backoffs.
- **The "before" bind runs only when compaction can run** (not on tool continuations). This avoids a redundant digest on every continuation. The "after" bind always runs, as before.
- **A user retry of a failed compaction reuses the operation id**, so conversation ids `compaction_<op>_<n>` can repeat across executions. This is harmless: each is released after its attempt, and `llm_call_id` and `idempotency_key` include the new execution turn.

## Known Risks

- **The latest-prompt reading clears after a compaction event.** The server projection treats the newest observation as authoritative for the latest-prompt and context-fill fields. A compaction event, with a null latest prompt, therefore sets them to null until the agent's next request reports again. Totals and cost are correct (REQ-007). The meter does not reject the events, so this is not the design's escalation trigger. Changing the projection is outside the designed scope. The behavior is pinned by the server fold test; Solution Designer and API/E2E can decide whether to keep it.
- **Leftover setting value.** The design says the server "neither lists nor accepts" the key, and also allows generic listing as long as it is not shown as a compaction setting. A value saved before the removal is therefore listed only as a "Custom user-defined setting" (deletable, no effect, not on the Compaction card). The project's `retiredSettingNames` mechanism would delete it at startup, which the design explicitly rejected. If it should be hidden instead, that needs a small non-deleting retirement guard; this is a designer call.
- **Gemini single-attempt product issue (base-identical; reported in the previous ticket).** `GeminiLLM.buildGenerationConfig` copies user `extraParams.httpOptions.retryOptions` into each request, so it overrides the isolated client's `attempts: 1`. Compaction on Gemini agents now runs on the agent's own `GeminiLLM`, so a user-configured retry count could multiply summary attempts there. `compaction-single-attempt-transport.test.ts` still fails on base `46e94fdea` and on this branch.
- **Provider instruction-following** (design risk): handled by the parser plus the fallback. Validate one non-Anthropic provider live.
- **Transcript path on adapters that also send `config.systemMessage`** (for example Gemini's `systemInstruction`): the fallback carries the summary prompt as a SYSTEM message on the agent's LLM, which still has its own system instruction. The cached path matches normal requests exactly. Live validation should cover one non-Anthropic provider.
- **Summary overlap with the kept tail** (DEC-002): the existing `post_compaction_target_exceeded` handling applies.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change + Refactor + cost Performance
- Reviewed root-cause classification: Boundary Or Ownership Issue + Missing Invariant
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes:
  - `memory/compaction/compaction-summarizer.ts` and `conversation-summary-port.ts` import no `agent/**` or `llm/api/**` code; the design's dependency rule holds.
  - The pre-existing `agent/**` imports in `pending-compaction-executor.ts` (error and reporter types) are unchanged.
  - The old strategy's `agent/token-budget` import is gone.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. There is no dual path; the transcript request is only the summarizer's recovery path.
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes`:
  - the direct strategy, its types and factory;
  - the server factory, parser and settings entry;
  - the web component, util and i18n;
  - `getParentModelIdentifier` from `PendingCompactionExecutionInput` and `LlmRequestAssemblyIdentity` (it existed only to choose the compaction model);
  - tests of removed code;
  - the `setDurably` special case.
- Dead code found elsewhere, listed as follow-up: None.
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. Largest changed: server backend factory 478 non-empty lines (it shrank), `llm-phase.ts` 367; new files are 20–121 lines.
- Notes: the design file list omitted the test-support live harness, which imported the removed factory. It was migrated as part of the removal, and its evidence semantics are flagged for API/E2E review.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration` (the setting value is inert); compaction output and snapshots `Not Affected`; usage rows are new rows through the existing pipeline.
- Design-spec decision reference: § Persisted Data / State Transition Decision
- Implementation follows the decision: `Yes`. No code reads the key. Startup with a saved value is tested in the GraphQL e2e (restart from `.env`).
- Direct-use evidence: server settings unit and GraphQL e2e (saved value is inert, listed as a deletable custom setting, deletion works); web card spec (never written).
- Deviation: `None`

## Environment Or Dependency Notes

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse`, branch `codex/compaction-prompt-cache-reuse`, base `origin/personal@46e94fdea`.
- `nuxt prepare`, `prisma generate` and `prepare:shared` were run for tests.
- `test:integration:prepare` creates untracked build outputs (SDK, devkit and Brief Studio `dist/`). They are never staged.
- Baseline comparisons used a temporary detached base worktree at `/tmp/ccr-base`, which is removed after use.

## Local Implementation Checks Run

All are implementation-scoped. No API/E2E or live-provider checks were run.

- autobyteus-ts production typecheck (`tsc -p tsconfig.build.json`): pass.
- autobyteus-ts test-config typecheck: no new errors compared with base `46e94fdea`. The 6 remaining assembler-test identity errors exist on base too; only their message text changed with the identity type.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`: pass.
- autobyteus-ts `vitest run tests/unit`: 1867 passed, 1 failed. The failure is the base-identical Gemini product issue above.
- autobyteus-ts `vitest run tests/integration`: CORE_INTEGRATION_PLACEHOLDER
- Server `test:unit`: SERVER_UNIT_PLACEHOLDER (summary `implementation-evidence/server-test-unit.summary.log`).
- Server `test:integration:prepare` + `test:integration`: SERVER_INTEGRATION_PLACEHOLDER (summary `implementation-evidence/server-test-integration.summary.log`).
- Web `vitest run components/settings localization`: 56 files, 247 tests passed. WEB_FULL_PLACEHOLDER
- Focused: summarizer 11/11, port 9/9, prompt 16/16, executor and lifecycle 29/29, runtime compaction integration 6/6, memory and agent unit 778/778, server fixture-dependent compaction tests 39/39, settings and builder 77/77, compaction ingestion 1/1, live-boundary unit 10/10.
- Mutation checks:
  - removing the before-compaction bind fails the AC-006 and order tests;
  - releasing on the attempt's signal instead of a fresh controller fails the abort and bounded-release tests.
  Both files were restored.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Settings → Server Settings → Basics → Compaction card. The model selector, model config and invalid-model message were removed; the description text changed.
- Approved UI/UX references: requirements BEH-002 and REQ-005; design DS-004. There is no UI/UX spec ("A compaction-settings UI change" is otherwise out of scope).
- Existing design system reviewed: the card keeps its existing `space-y-4` layout, inputs, save button and alerts unchanged.
- Rendered surface used: component-level DOM rendering through the project's web unit tests (happy-dom) for `CompactionConfigCard` and `ServerSettingsCompactionFailure`. They cover the absence of the model select, the remaining controls' values, save sequencing, the error state, invalid input and node-binding reset.
- Limitation: no live browser or desktop render. No existing browser probe covers settings, and a full-stack render needs an isolated app build. The change is a pure removal of one control group from an existing vertical stack. The design already plans the desktop check ("Desktop: the Settings card has no model option") for API/E2E and user verification.

## Downstream Coverage Hints / Suggested Scenarios

- Code Review focus:
  - the summarizer attempt budget and failure classification;
  - the port request construction sharing `conversation-request.ts` with `LlmPhase`;
  - the release lifecycle on its own controller;
  - guard ordering;
  - the policy-only configuration;
  - the harness migration;
  - the two known risks (latest-prompt clearing, leftover listing).

## API / E2E / Executable Coverage Investigation And Execution Still Required

Run through the test vault, using `probes/fork-summary-probe.mjs` as the recipe:

- **AC-002/AC-003, Anthropic Opus 5.5.**
  - Set up a native run that reaches compaction (lower the trigger ratio). Use the strict preserved-thinking check (`thinking.block_binding.prefix_mismatch_behavior: "error"`, beta `thinking-binding-controls-2026-08-01`, validation only).
  - The summary call's `cache_read_input_tokens` must be ≥ 90 % of its input.
  - The summary passes the parser. The run continues after compaction. The meter shows the `autobyteus_compaction` call.
  - Compare quality with the transcript path on the same history (the reworked `real-e2e-compaction-quality.e2e.test.ts` reports `modes` and `attempts` per scenario).
- **AC-006, live.** Change tools (a media default model) before a compaction turn. Expect no 400.
- **AC-008.** One non-Anthropic native provider compacts, through the cached request or the fallback. The harness reports `summaryModes`.
- **Live harness review.** `test-support/live-e2e/live-e2e-harness.ts` and the `real-e2e-*` consumers were migrated without live execution here. Please validate their evidence semantics (`summary*` fields, `summaryOnAgentModelVerified`, the cached-mode source evidence).
- **Desktop.** The Settings card has no model option. The user verifies the meter (AC-007).
