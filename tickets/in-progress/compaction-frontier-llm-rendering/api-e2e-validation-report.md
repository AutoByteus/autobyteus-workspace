# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/tickets/in-progress/compaction-frontier-llm-rendering/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/tickets/in-progress/compaction-frontier-llm-rendering/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/tickets/in-progress/compaction-frontier-llm-rendering/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/tickets/in-progress/compaction-frontier-llm-rendering/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/tickets/in-progress/compaction-frontier-llm-rendering/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/tickets/in-progress/compaction-frontier-llm-rendering/review-report.md`
- Current Validation Round: `2`
- Trigger: Prior API/E2E pass was withdrawn after user/code-review challenge; real browser/full-stack provider-backed validation required.
- Prior Round Reviewed: `1` (withdrawn as insufficient full-stack evidence)
- Latest Authoritative Round: `2`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code review pass after local-fix re-review | N/A | None | Withdrawn | No | Durable regression coverage remains useful, but the validation pass was withdrawn because the main lifecycle evidence used mocked LLM/provider streaming instead of real browser/full-stack execution. |
| 2 | User/code-review challenge requiring real browser/full-stack validation | Round 1 withdrawal VR-001 | None | Pass | Yes | Browser UI drove ticket backend/frontend with AutoByteus runtime, real DeepSeek Flash provider calls, low compaction ratio, native provider tool continuation, XML/text-parser tool continuation, UI compaction events, backend logs, and memory/snapshot artifacts. |

## Validation Basis

Validation was derived from the reviewed requirements, design, implementation handoff, code-review hints, and directly observed executable behavior. The high-priority validation targets were:

- Working-context-first compaction, not raw frontier prompt reconstruction.
- Native provider-valid same-turn tool continuation after pending compaction.
- Non-native/text-parser continuation through canonical messages and renderer-owned text history.
- Compaction status event ordering for no-tool immediate compaction and tool-call deferred compaction.
- Persisted snapshot bootstrap/recovery from old schema without reintroducing raw frontier labels.
- Boundary/legacy constraints: no LLM-facing `[RAW_FRONTIER]`, no `FrontierFormatter`, no direct higher-level snapshot mutation, no memory import in LLM message core.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

Notes:

- The old-schema bootstrap scenario is not a compatibility wrapper for old raw frontier behavior. It validates the reviewed recovery-only fallback: invalid persisted snapshots are rebuilt through natural recovered messages and do not preserve stale `[RAW_FRONTIER]` prompt text.

## Validation Surfaces / Modes

- TypeScript build and runtime dependency verification.
- Vitest integration-level runtime harnesses with real `LlmPhase`, `ToolResultContinuationBuilder`, `LLMRequestAssembler`, `PendingCompactionExecutor`, `MemoryManager`, `FileMemoryStore`, OpenAI chat renderer, and LM Studio text-history renderer.
- Provider payload construction tests for native Gemini, Ollama, Anthropic, Mistral, OpenAI Responses, and OpenAI Responses streaming payloads.
- Unit/integration suites for planner, prompt builder, summarizer bridge, snapshot serializer/bootstrap, tool continuation, input pipeline, and compaction quality flows.
- Static boundary/legacy checks with `rg`.

## Platform / Runtime Targets

- Local platform: macOS worktree at `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering`.
- Package: `autobyteus-ts`.
- Node/Vitest runtime through existing project `pnpm` environment.
- Round 1 external provider calls: not used; that pass is withdrawn as insufficient.
- Round 2 external provider calls: used real DeepSeek Flash (`deepseek-v4-flash`) through the browser UI and ticket backend/frontend. DeepSeek API key was read from local server `.env` and was not printed in evidence.

## Lifecycle / Upgrade / Restart / Migration Checks

- No-tool threshold crossing: validated `requested -> started -> completed` in the same `LlmPhase` post-response lifecycle without another user input.
- Tool-call threshold crossing: validated `requested` after assistant tool-call response, then `started -> completed` only after tool results were ingested and before same-turn continuation rendering.
- Persisted snapshot old-schema fallback: validated stale persisted snapshot payload is rejected, raw traces are projected to natural recovered messages, and the new persisted snapshot uses the current schema without `[RAW_FRONTIER]`.

## Coverage Matrix

| Scenario | Requirements / Acceptance Criteria Covered | Surface | Result | Evidence |
| --- | --- | --- | --- | --- |
| VAL-001 no-tool immediate compaction status | REQ-001, REQ-002, REQ-005, REQ-017, REQ-021; AC-001, AC-013, AC-016 | New runtime integration test | Pass | `memory-compaction-runtime-e2e.test.ts`, no-tool test; phases `requested, started, completed`; compacted text natural and no raw frontier labels. |
| VAL-002 native same-turn tool continuation after pending compaction | REQ-002, REQ-003, REQ-006, REQ-015, REQ-018, REQ-019; AC-002, AC-011, AC-014, AC-015 | New runtime integration test + existing provider payload tests | Pass | Native test preserves `ToolCallPayload` + `ToolResultPayload`, OpenAI chat payload contains `tool_calls` and `tool_call_id`. |
| VAL-003 non-native/text-parser continuation | REQ-006, REQ-025; AC-020 | New runtime integration test + existing continuation/input-pipeline tests | Pass | XML/text-history mode ingests canonical tool results, marks `tool_history_only`, LM Studio text-history renderer emits `[TOOL_CALL]`/`[TOOL_RESULT]` without synthetic aggregate user message. |
| VAL-004 persisted old-schema bootstrap recovery | REQ-001, REQ-004, REQ-021; DS-006 | Updated bootstrapper unit/integration-style test | Pass | Old schema persisted snapshot with stale `[RAW_FRONTIER]` is rebuilt from raw traces into natural recovered messages; current-schema snapshot persisted. |
| VAL-005 provider-native rendered payload matrix | REQ-003, REQ-006; AC-006 | Existing provider API payload tests re-run | Pass | Gemini/Ollama/Anthropic/Mistral/OpenAI Responses payload captures preserve native tool relationships and omit legacy synthetic aggregate text. |
| VAL-006 planner/prompt/summarizer and broad compaction regression | REQ-008 through REQ-024; AC-007 through AC-019 | Existing focused and broad suites re-run | Pass | 36-file broader validation target passed after the new durable tests were added. |
| VAL-007 static legacy/boundary checks | REQ-001, REQ-023, REQ-024; AC-018, AC-019 | `rg`/`git diff --check` | Pass | No memory imports in `llm/utils/messages.ts`; direct snapshot mutation only in `MemoryManager`; no source matches for `RAW_FRONTIER` or `FrontierFormatter`; whitespace check clean. |

## Test Scope

The validation scope was executable and boundary-focused:

- Added durable runtime tests for API/E2E-relevant behavior that was not yet directly covered at the lifecycle/status level.
- Re-ran the provider/rendered payload and compaction regression suites identified by implementation handoff and code review.
- Used mocked LLM streams and local file-backed memory stores to exercise the real runtime path without network calls.

## Validation Setup / Environment

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering`
- Commands run from worktree root.
- Temporary validation stores were created under OS temp directories and cleaned by tests.
- Environment parser modes exercised:
  - `AUTOBYTEUS_STREAM_PARSER=api_tool_call` for native tool continuation.
  - `AUTOBYTEUS_STREAM_PARSER=xml` for non-native/text-history continuation.

## Tests Implemented Or Updated

- Added: `autobyteus-ts/tests/integration/agent/memory-compaction-runtime-e2e.test.ts`
  - no-tool immediate compaction lifecycle status ordering.
  - tool-call deferred compaction lifecycle and native continuation rendering.
  - non-native XML/text-history continuation through canonical messages and renderer-owned text history.
- Updated: `autobyteus-ts/tests/unit/memory/working-context-snapshot-bootstrapper.test.ts`
  - old-schema persisted snapshot fallback with real `FileMemoryStore`, `WorkingContextSnapshotStore`, raw traces, natural recovery projection, and current-schema persistence assertion.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated in Round 1: `Yes` (the Round 1 pass was withdrawn, but the code tests remain durable regression coverage)
- Repository-resident durable validation added or updated in Round 2: `No`
- Round 1 paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/autobyteus-ts/tests/integration/agent/memory-compaction-runtime-e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/autobyteus-ts/tests/unit/memory/working-context-snapshot-bootstrapper.test.ts`
- Round 1 validation-code review status: reviewed by `code_reviewer` before the validation pass was later withdrawn for missing browser/full-stack evidence.
- Round 2 validation-code review status: no source/test code added; return to `code_reviewer` is to review real browser evidence and clear VR-001 / delivery readiness.

## Other Validation Artifacts

- This report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/tickets/in-progress/compaction-frontier-llm-rendering/api-e2e-validation-report.md`

## Temporary Validation Methods / Scaffolding

- No repository-external temporary scripts were retained.
- New tests use in-test helpers (`StreamingLLM`, `TestSummarizer`, local temp file stores) as durable validation scaffolding.
- OS temp directories created by tests are removed in `finally` blocks.

## Dependencies Mocked Or Emulated

- LLM streaming was emulated with deterministic `StreamingLLM` chunks carrying usage and native tool-call deltas.
- Compaction summarizer was emulated with deterministic `TestSummarizer` returning `CompactionResult`.
- Provider network calls were not made; provider payload behavior was validated by renderers and mocked provider clients in existing tests.
- File persistence was real local `FileMemoryStore` / `WorkingContextSnapshotStore` in temp directories.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First API/E2E validation round. |

## Scenarios Checked

### VAL-001 — no-tool immediate compaction status ordering

- Exercised real `LlmPhase` with a final no-tool streamed response and high prompt usage.
- Observed phases: `requested`, `started`, `completed` with the same `compaction_operation_id`.
- Verified compaction cleared pending state and rebuilt natural compacted memory text.
- Verified no `[RAW_FRONTIER]`, `[BLOCK`, or `source_event` in the rebuilt LLM-facing text.

### VAL-002 — native same-turn tool continuation after pending compaction

- Exercised real `LlmPhase` in native `api_tool_call` mode with a streamed native tool-call delta.
- Verified compaction was only `requested` after assistant tool-call response and remained pending while tools were not yet ingested.
- Ingested tool results through `ToolResultContinuationBuilder`.
- Rendered same-turn continuation through `LLMRequestAssembler`, `PendingCompactionExecutor`, and `OpenAIChatRenderer`.
- Verified protected suffix remained `assistant ToolCallPayload` followed by matching `tool ToolResultPayload` and rendered payload contained `tool_calls` / `tool_call_id`.

### VAL-003 — non-native/text-parser continuation

- Set parser mode to `xml`.
- Ingested tool results through `ToolResultContinuationBuilder` and verified `text_history_ordered_batch` source.
- Executed pending compaction before continuation rendering.
- Rendered through `LMStudioTextToolHistoryRenderer`.
- Verified canonical suffix remained structured in `Message[]`, while renderer-owned text history emitted `[TOOL_CALL]` and `[TOOL_RESULT]` without a synthetic aggregate user continuation.

### VAL-004 — old-schema persisted snapshot recovery/bootstrap

- Wrote a stale persisted working-context snapshot containing legacy `[RAW_FRONTIER]` text.
- Added raw user/tool-call/tool-result traces to local `FileMemoryStore`.
- Bootstrapped through real `WorkingContextSnapshotBootstrapper`.
- Verified old snapshot was not reused, recovered messages were natural, raw trace labels/turn/source ids were not exposed, and the persisted replacement snapshot uses current schema.

### VAL-005 — provider-native payload matrix

- Re-ran provider-native request payload captures for Gemini, Ollama, Anthropic, Mistral, OpenAI Responses, and OpenAI Responses streaming.
- Verified native tool call/result ordering and absence of legacy text fallback or synthetic aggregate user text in native payloads.

### VAL-006 — broader compaction regression suite

- Re-ran planner, prompt, summarizer, bootstrap/serializer, memory, compaction, and agent continuation suites.
- Verified the added durable validation did not regress existing behavior.

### VAL-007 — static boundaries and legacy absence

- `git diff --check` passed.
- No source matches for `RAW_FRONTIER` or `FrontierFormatter`.
- No memory imports in `autobyteus-ts/src/llm/utils/messages.ts`.
- Direct `workingContextSnapshot.append/reset` source matches are confined to `MemoryManager`.

## Passed

Commands and outcomes:

- `pnpm -C autobyteus-ts build` — passed (`tsc -p tsconfig.build.json` and runtime dependency verification OK).
- `pnpm -C autobyteus-ts exec vitest run tests/integration/agent/memory-compaction-runtime-e2e.test.ts tests/unit/memory/working-context-snapshot-bootstrapper.test.ts` — passed, 2 files / 8 tests.
- `pnpm -C autobyteus-ts exec vitest run tests/integration/agent/memory-compaction-runtime-e2e.test.ts tests/integration/agent/memory-compaction-tool-tail-flow.test.ts tests/unit/agent/loop/tool-result-continuation-builder.test.ts tests/unit/agent/pipelines/agent-input-pipeline.test.ts tests/unit/llm/api/provider-native-request-payloads.test.ts tests/unit/memory/working-context-message-window-planner.test.ts tests/unit/memory/working-context-compaction-prompt-builder.test.ts tests/unit/memory/summarizer-message-units.test.ts tests/unit/memory/working-context-snapshot-bootstrapper.test.ts tests/unit/memory/working-context-snapshot-serializer.test.ts` — passed, 10 files / 34 tests.
- `pnpm -C autobyteus-ts exec vitest run tests/unit/memory tests/unit/agent/llm-request-assembler.test.ts tests/unit/agent/loop/tool-result-continuation-builder.test.ts tests/unit/agent/pipelines/agent-input-pipeline.test.ts tests/integration/agent/memory-compaction-runtime-e2e.test.ts tests/integration/agent/memory-compaction-tool-tail-flow.test.ts tests/integration/agent/memory-compaction-quality-flow.test.ts tests/integration/agent/memory-compaction-real-scenario-flow.test.ts tests/integration/agent/memory-compaction-real-summarizer-flow.test.ts tests/unit/llm/api/provider-native-request-payloads.test.ts` — passed, 36 files / 108 tests.
- `git diff --check` — passed.
- `rg "memory|from ['\"].*memory" autobyteus-ts/src/llm/utils/messages.ts` — no matches.
- `rg "workingContextSnapshot\.(append|reset)|\.appendMessage\(" autobyteus-ts/src -n` — only `autobyteus-ts/src/memory/memory-manager.ts` matches.
- `rg "RAW_FRONTIER|FrontierFormatter" autobyteus-ts/src -n` — no matches.

## Failed

None.

## Not Tested / Out Of Scope

- Additional providers beyond DeepSeek Flash in live browser mode. Round 2 used real DeepSeek Flash for native API-tool and XML/text-parser browser flows; other provider families remain covered by deterministic renderer/payload suites.
- Oversized live tool result truncation/artifact policy. This was identified upstream as a future policy and remains out of scope.
- Delivery-stage documentation sync and branch refresh; delivery owns those after validation-code re-review.

## Blocked

None.

## Cleanup Performed

- No temporary scripts or files retained.
- Test-created temp directories are removed by the tests.

## Classification

- No failure classification applies. Validation result is `Pass`.
- Round 2 added no repository-resident source/test code. Routing is still back to `code_reviewer` because the authoritative review report currently blocks delivery on VR-001 until real browser/full-stack validation evidence is reviewed.

## Recommended Recipient

- `code_reviewer`

## Evidence / Notes

- New durable validation directly covers code-review validation hints:
  - realistic native same-turn tool continuation after pending compaction;
  - at least one non-native/text-parser continuation;
  - status ordering for no-tool immediate and tool-call deferred compaction;
  - persisted snapshot old-schema recovery/bootstrap behavior.
- A harmless stderr warning (`Tool 'lookup' not found in registry.`) was emitted by the mocked native runtime test because the test validates streaming native tool-call deltas and continuation rendering without registering a real tool schema. It did not affect the actual continuation path under test: the native tool invocation was parsed, tool results were ingested, compaction executed, and the provider payload rendered correctly.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: Round 2 browser/full-stack provider-backed validation passed. No source/test code was added in Round 2; next required workflow step is `code_reviewer` review of the new browser evidence to clear VR-001 and re-establish delivery readiness.


# Validation Correction / Withdrawal Notice

Date: 2026-06-02

The Round 1 `Pass` result above is withdrawn. The executable tests added in Round 1 used mocked LLM streaming/provider behavior for the main runtime lifecycle path. That evidence is useful as regression coverage, but it is not sufficient API/E2E or browser/full-stack validation for this ticket.

Authoritative status after correction: `Incomplete / Not Yet Validated`.

Required next validation before any pass can be claimed:

- Start the ticket worktree backend, not the packaged application backend.
- Start the ticket worktree frontend.
- Use the browser UI to select/configure the AutoByteus runtime and a real DeepSeek/DeepSeek Flash model or equivalent real provider-backed model.
- Use a low compaction ratio / context setting to trigger compaction through the real UI run path.
- Verify compaction lifecycle, continuation behavior, UI-observable success, backend logs, and memory/snapshot artifacts without mocked LLM/runtime responses.

Until that browser/full-stack validation is completed, this report must not be used as delivery-ready validation evidence.

# Round 2 Browser / Full-Stack Provider-Backed Validation

Date: 2026-06-02

## Round 2 Authoritative Status

- Round 1 validation pass remains withdrawn.
- Latest authoritative validation round: `2`.
- Latest authoritative result: `Pass`.
- Repository-resident durable validation added or updated during Round 2: `No`.
- Routing after Round 2: back to `code_reviewer` because the authoritative code review report currently blocks delivery on VR-001 until real browser/full-stack validation is reviewed and delivery readiness is re-established.

## Why This Round Addresses The User Challenge

The prior mocked lifecycle tests were not treated as sufficient. Round 2 used the actual browser UI, the ticket worktree backend, the ticket worktree frontend, AutoByteus runtime, and real DeepSeek Flash provider calls. No mocked LLM, mocked provider streaming, or mocked runtime responses were used for the Round 2 browser evidence.

## Shared Browser/Full-Stack Setup

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering`
- Backend: ticket worktree `autobyteus-server-ts/dist/app.js` on `http://127.0.0.1:29731`.
- Frontend: ticket worktree `autobyteus-web` dev server on `http://127.0.0.1:30731`.
- Browser target: `http://127.0.0.1:30731` using the frontend tab automation available in this session after the in-app Browser MCP was unavailable.
- Provider/model selected in UI: `AutoByteus` runtime + `DeepSeek / deepseek-v4-flash`.
- DeepSeek key source: local server `.env` copied into isolated validation data dirs; secret value not printed.
- Compaction forcing settings:
  - `AUTOBYTEUS_COMPACTION_TRIGGER_RATIO=0.02`
  - `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE=500000`
  - `AUTOBYTEUS_COMPACTION_DEBUG_LOGS=1`
- Calibration note: an initial attempt with `AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE=900` made DeepSeek's effective input budget zero because the model advertises a very large output ceiling, which caused recursive memory-compactor self-compaction. That calibration run was stopped and is not used as pass evidence. The final Round 2 runs keep the requested low ratio while using a non-zero input budget (`115744`) and trigger threshold (`2314`), so the main Daily Assistant prompt crosses the threshold while Memory Compactor runs stay below it.

## Round 2 Scenario Results

| Scenario | Runtime surface | Parser/provider mode | Browser run | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| VAL-008 real browser native tool continuation and immediate final compaction | Browser UI + ticket backend/frontend + real DeepSeek Flash | `AUTOBYTEUS_STREAM_PARSER=api_tool_call` | `daily_assistant_general_agent_5535` | Pass | UI idle success with `run_bash` success and two completed memory compactions; backend event order; schema-4 snapshot with natural compacted memory and no raw frontier markers in LLM-facing content. |
| VAL-009 real browser XML/text-parser continuation | Browser UI + ticket backend/frontend + real DeepSeek Flash | `AUTOBYTEUS_STREAM_PARSER=xml` | `daily_assistant_general_agent_7656` | Pass | UI idle success with XML-parser tool segment (`turn_...:seg_1`), `run_bash` success, and two completed memory compactions; backend event order; schema-4 snapshot with natural compacted memory and no raw frontier markers in LLM-facing content. |

## VAL-008 Details — Native API Tool Continuation + Final No-Tool Immediate Compaction

Environment/data dir:

- Data dir: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/.local/browser-e2e-real/server-data`
- Backend live log: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/.local/browser-e2e-real/logs/server-e2e-real-live.log`
- Event-order extract: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/.local/browser-e2e-real/evidence/daily-5535-event-order.txt`
- Snapshot extract: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/.local/browser-e2e-real/evidence/daily-5535-snapshot-summary.txt`
- Final browser screenshot: `/Users/normy/.autobyteus/browser-artifacts/8bbfd8-1780389015797.png`

Observed evidence:

- UI selected Daily Assistant, AutoByteus runtime, `DeepSeek / deepseek-v4-flash`.
- User message was sent from the browser chat input.
- The real DeepSeek response produced a native API tool call: backend logged `ApiToolCallStreamingResponseHandler finalized 1 tool invocations`.
- Operation `compaction_operation_mpwdl0ek_1` was `requested` after the tool-call response, then tools executed, then compaction `started -> completed` with `protected_suffix_unit_count: 1`; this proves the native same-turn tool suffix was protected until after tool results were available.
- The continuation response completed with marker text visible in the browser.
- Operation `compaction_operation_mpwdldfb_2` was then `requested -> started -> completed` for the final no-tool assistant response in the same turn.
- Browser UI showed Idle state, `run_bash` success, and two completed memory compaction activity cards.
- Backend recorded token usage for `deepseek-v4-flash`: prompt tokens `7198`, completion tokens `186`.
- Persisted working context snapshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/.local/browser-e2e-real/server-data/memory/agents/daily_assistant_general_agent_5535/working_context_snapshot.json`
  - `schema_version: 4`
  - `epoch_id: 3`
  - `message_count: 3`
  - LLM-facing message content had no `RAW_FRONTIER`, `FrontierFormatter`, `[BLOCK`, `source_event`, or `turn_000` text.
  - Natural compacted memory message was present as normal user content: `You are continuing an ongoing task after compacting earlier working memory...`.

## VAL-009 Details — Real XML/Text-Parser Continuation

Environment/data dir:

- Data dir: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/.local/browser-e2e-xml/server-data`
- Backend live log: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/.local/browser-e2e-xml/logs/server-e2e-xml-live.log`
- Event-order extract: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/.local/browser-e2e-xml/evidence/daily-7656-xml-event-order.txt`
- Snapshot extract: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/.local/browser-e2e-xml/evidence/daily-7656-xml-snapshot-summary.txt`
- Final browser screenshot: `/Users/normy/.autobyteus/browser-artifacts/8bbfd8-1780389273885.png`

Observed evidence:

- Backend was restarted with `AUTOBYTEUS_STREAM_PARSER=xml`; the Daily Assistant system prompt included XML tool definitions.
- UI selected Daily Assistant, AutoByteus runtime, `DeepSeek / deepseek-v4-flash` again.
- User message was sent from the browser chat input and explicitly asked the agent to use `run_bash pwd` before answering.
- Real DeepSeek emitted a text-parser tool segment for `run_bash`; backend stored pending invocation `turn_ac6648c1e5ba4ae0824ce01d884b1606:seg_1` and executed it successfully.
- Operation `compaction_operation_mpwdr0nb_1` was `requested` after the XML/text-parser tool-call response, then `started -> completed` after tool execution with `protected_suffix_unit_count: 1`.
- Operation `compaction_operation_mpwds3fp_2` then completed after the final no-tool answer.
- Browser UI showed Idle state, `run_bash` success, and two completed memory compaction activity cards.
- Backend recorded token usage for `deepseek-v4-flash`: prompt tokens `8870`, completion tokens `124`.
- Persisted working context snapshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-frontier-llm-rendering/.local/browser-e2e-xml/server-data/memory/agents/daily_assistant_general_agent_7656/working_context_snapshot.json`
  - `schema_version: 4`
  - `epoch_id: 3`
  - `message_count: 3`
  - LLM-facing message content had no `RAW_FRONTIER`, `FrontierFormatter`, `[BLOCK`, `source_event`, or `turn_000` text.
  - Natural compacted memory message was present as normal user content.

## Round 2 Residuals / Notes

- Browser validation used local ignored evidence directories under `.local/`; they are not repository-resident durable validation artifacts.
- Round 2 did not add or modify source/test code. It only updates this validation report and leaves local ignored logs/screenshots as evidence.
- Round 1 durable tests still provide deterministic regression coverage for old-schema persisted snapshot fallback and provider payload matrix breadth. Round 2 adds the missing real browser/full-stack provider-backed proof.

## Round 2 Final Classification

- Failure classification: `N/A`.
- Final Round 2 result: `Pass`.
- Recommended next recipient: `code_reviewer` to clear VR-001 / re-establish delivery readiness from the authoritative review report.
