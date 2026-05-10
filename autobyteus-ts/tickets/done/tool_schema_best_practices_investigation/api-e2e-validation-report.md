# API, E2E, And Executable Validation Report

Canonical artifact path: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/api-e2e-validation-report.md`

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/design-spec.md`
- Tool-choice Rework Decision: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/design-rework-tool-choice-policy.md`
- API Tool Continuation Rework Decision: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/design-rework-api-tool-continuation.md`
- API Tool Continuation Probe Output: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/api-tool-continuation-render-probe-output.json`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/review-report.md`
- Current Validation Round: `7`
- Trigger: User requested a supplemental broad E2E run of all agent single-flow tests and all agent-team flow tests after the Round 6 API/E2E handoff.
- Prior Round Reviewed: `6`
- Latest Authoritative Round: `7`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code review Round 2 pass | N/A | None | Pass | No | Live request capture and focused durable tests passed, but no full agent-flow E2E was run. |
| 2 | User requested `.env.test` copy and realistic agent-flow validation | N/A | Gated `run_bash` benchmark failed as a high-bar model reliability stress test. | Pass for reviewed ticket scope; residual stress-benchmark risk recorded | No | Added and passed durable realistic LM Studio single-agent `run_bash` flow. |
| 3 | User requested a very real multi-step `run_bash` case with more than 5 or 10 tool executions | Rechecked Round 2 single-agent `run_bash` test. | Multi-step local-model/template risks remained. | Pass for reviewed ticket scope; residual model/autonomous-planning risk recorded | No | Added opt-in ten-phase LM Studio `run_bash` flow; prior code review re-reviewed the validation-code changes. |
| 4 | Kimi provider-safe request normalization changed after prior validation | Rechecked Kimi/request-builder, DeepSeek classification, LM Studio flows, build, and diff hygiene. | DeepSeek forced-tool-choice and LM Studio autonomous multi-step residuals remained. | Pass for reviewed ticket scope | No | Canonical report refreshed after Kimi source change. |
| 5 | Public `AgentConfig.apiToolChoicePolicy` removed/de-scoped after architecture rework | Rechecked removed symbol absence, default agent no-`tool_choice` boundary, explicit direct `kwargs.tool_choice` pass-through, live Kimi, live LM Studio, DeepSeek classification, and build/diff hygiene. | Opt-in autonomous ten-call LM Studio flow on active qwen3.6 still failed on continuation with LM Studio/model-template `Unknown StringValue filter: safe`; DeepSeek reasoning/alias forced-tool-choice still failed. Both classified as provider/model residuals under the approved boundary. | Pass for reviewed ticket scope; residual provider/model behavior recorded | No | Default agent path emits tools but no `tool_choice`; direct lower-level caller can still explicitly pass `tool_choice:'required'`. |
| 6 | Round-8 CR-002 local-fix review pass for native active-batch/provider validation before result processors mutate memory | Rechecked Round 5 provider/model residuals and stale continuation evidence. | No new implementation failures. Existing LM Studio ten-call template residual and DeepSeek reasoner forced-tool-choice limitation remain non-blocking. | Pass for reviewed ticket scope; residual provider/model behavior recorded | No | Deterministic real AgentRuntime `run_bash` capture proved accepted native result continuation renders `assistant.tool_calls` + matching `role:"tool"` and no synthetic aggregate `role:"user"`; focused rejected-result memory-pollution regression passed. |
| 7 | User-requested supplemental broad flow sweep | Rechecked broad single-agent and agent-team live flow evidence from current state. | None. | Pass | Yes | Agent single-flow sweep passed 4 files / 6 tests with 1 skipped; agent-team flow sweep passed 3 files / 3 tests. |

## Validation Basis

Validation derived from:

- Requirements FR-001 through FR-010 and AC-001 through AC-007.
- Tool-choice rework decision: public `AgentConfig.apiToolChoicePolicy` is removed/de-scoped for this ticket; default agent/server API path passes native `tools` but no default `tool_choice`; explicit `kwargs.tool_choice` pass-through remains only for lower-level direct callers.
- API tool-continuation rework decision: native API continuations must render structured `assistant.tool_calls` plus matching `role:"tool"` messages and must not append a synthetic aggregate `role:"user"` tool-result message.
- Code review Round 8 conclusion: native result paths now validate active batch/provider/turn/invocation identity before result processors can mutate memory; rejected native results return before raw `tool_result` traces, working-context `ToolResultPayload`s, `tool_continuation` traces, or `ToolContinuationReadyEvent` enqueue.
- Prior accepted fixes: closed OpenAI-compatible schemas, strict-mode gating, centralized request-builder filtering, LM Studio structured native history, diagnostic-only API text-leak handling, no text fallback execution, Kimi provider-safe temperature normalization, and no removed `apiToolChoicePolicy` symbols in `src`, `tests`, or `docs`.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- Removed public API retained as compatibility shim: `No`
- Text-parser modes preserved intentionally, not as API-mode fallback execution: `Yes, intentionally out-of-API-mode compatibility surface`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

## Validation Surfaces / Modes

- Main repo `.env.test` copied into the worktree before Round 6 validation:
  - Source: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/.env.test`
  - Destination: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/.env.test`
  - SHA-256 for both after copy: `46a8143503fac38ff11d1d72a059c16a7562e82cd8ca60f7f507cfcbe56ae4eb`
  - Secret values were not printed.
- Focused unit/schema/request/handler/Kimi/LM Studio/rendering/diagnostic regression suite.
- Focused `ToolResultEventHandler` regression covering rejected native-result memory pollution through the real/default `MemoryIngestToolResultProcessor` path.
- Agent runtime queue/continuation integration tests.
- Temporary deterministic native-continuation capture using a local OpenAI-compatible streaming endpoint while exercising real `AgentFactory`, `AgentRuntime`, `LMStudioLLM`, request builder, native streaming parser, real `run_bash`, `ToolResultEventHandler`, memory assembly, and continuation rendering.
- Live Kimi provider integration.
- Live LM Studio one-call AgentRuntime `run_bash` flow.
- Opt-in live LM Studio ten-phase AgentRuntime `run_bash` stress flow.
- Live DeepSeek optional-tool integration and direct forced-tool-choice provider smoke.
- XML/JSON/text parser and queue-sentinel unit coverage.
- TypeScript build validation and whitespace/diff check.

## Platform / Runtime Targets

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts`
- Main repo used for `.env.test`: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts`
- OS: `Darwin MacBookPro 25.2.0 arm64`
- Node: `v22.21.1`
- pnpm: `10.28.2`
- Local validation date: `2026-05-09 CEST`
- LM Studio endpoint checked through repository helpers: `http://127.0.0.1:1234`
- Active LM Studio target used for live flows: `qwen3.6-35b-a3b-nvfp4` via `LMSTUDIO_TARGET_TEXT_MODEL=qwen3.6-35b-a3b-nvfp4`

## Lifecycle / Upgrade / Restart / Migration Checks

No native desktop installer, updater, restart, data migration, or process-lifecycle changes were in scope. Round 6 validated real `AgentRuntime` start/bootstrap/request/native tool execution/tool-result continuation/shutdown behavior through both a deterministic capture harness and the live LM Studio `run_bash` flow.

## Coverage Matrix

| Scenario ID | Requirement / AC | Surface | Result | Evidence |
| --- | --- | --- | --- | --- |
| `API-E2E-001` | FR-001, FR-002, FR-003, AC-001 | Generated OpenAI-compatible `run_bash` schema | Pass | Focused suite and temporary native-continuation capture confirmed `function.parameters.additionalProperties:false`, `required:["command"]`, optional fields not required, and no default `function.strict`. |
| `API-E2E-002` | FR-001, FR-004, AC-003; API continuation rework | Native structured history | Pass | Temporary deterministic real AgentRuntime capture confirmed the continuation request contains the captured assistant `tool_calls` id plus matching `role:"tool"` / `tool_call_id`, and no fallback text execution was observed. |
| `API-E2E-003` | FR-005, FR-006, FR-007, AC-002, AC-004; tool-choice rework boundary | Default agent/server path no longer emits `tool_choice` | Pass | Temporary native-continuation capture's first request had `tools` and no `tool_choice`; focused handler tests also passed. |
| `API-E2E-004` | Low-level direct caller boundary after rework | Explicit direct `kwargs.tool_choice` pass-through | Pass / classified provider-sensitive | Existing request-builder unit coverage preserves pass-through. Direct DeepSeek smoke confirmed provider sensitivity: `deepseek-chat` accepted forced tool choice, `deepseek-reasoner` rejected it. |
| `API-E2E-005` | FR-008, AC-005 | API text-shaped tool-call diagnostic | Pass | Focused handler/diagnostic tests passed; `[TOOL_CALL]`-shaped assistant text is retained/diagnosed and not executed in API mode. |
| `API-E2E-006` | FR-009, AC-006 | XML/JSON/sentinel/text parser preservation | Pass | `tests/unit/agent/streaming/handlers/parsing-streaming-response-handler.test.ts`, `tests/unit/agent/streaming/adapters/tool-call-parsing.test.ts`, and `tests/unit/agent/streaming/utils/queue-streamer.test.ts` passed 3 files / 35 tests. |
| `API-E2E-007` | FR-010, AC-007 | TypeScript build and diff hygiene | Pass | `pnpm exec tsc -p tsconfig.build.json --noEmit` and `git diff --check` passed. |
| `API-E2E-008` | Tool-choice rework cleanup | Removed public `AgentConfig.apiToolChoicePolicy` symbols | Pass | Code review reran symbol absence scan; Round 6 accepted that reviewed state and no reintroduction was observed in touched validation. |
| `API-E2E-009` | FR-001, FR-002, FR-004, FR-007, FR-010, AC-001, AC-003, AC-004 | Durable live LM Studio AgentFactory single-agent `run_bash` workspace fixture with approved default no-`tool_choice` boundary | Pass | `LMSTUDIO_TARGET_TEXT_MODEL=qwen3.6-35b-a3b-nvfp4 ... -t "nested workspace fixture"` passed: 1 selected test / 1 skipped. Live AgentRuntime emitted native tool call, executed `run_bash`, enqueued native API tool continuation, and validated fixture artifacts. |
| `API-E2E-010` | User-requested multi-call realism; residual local-model reliability | Opt-in ten-phase LM Studio AgentRuntime `run_bash` flow with approved default no-`tool_choice` boundary | Non-blocking residual | `AUTOBYTEUS_LMSTUDIO_MULTISTEP_RUN_BASH_FLOW=1 ... -t "ten run_bash"` failed after 1 successful tool execution due LM Studio/model-template `Unknown StringValue filter: safe` on tool-result continuation. This remains provider/template/model behavior, not schema/request/history regression. |
| `API-E2E-011` | Kimi provider-safe request legality | Kimi live integration | Pass | `pnpm exec vitest run tests/integration/llm/api/kimi-llm.test.ts --reporter=dot` passed 1 file / 5 tests including tool-call continuation. |
| `API-E2E-012` | DeepSeek tools without default forced `tool_choice`; forced-tool-choice provider sensitivity | DeepSeek integration and direct smoke | Pass for default/optional-tools path; non-blocking provider residual for forced `deepseek-reasoner` | `tests/integration/llm/api/deepseek-llm.test.ts` passed 1 file / 5 tests. Direct smoke: `deepseek-chat` forced required tool choice returned 200 with 1 tool call; `deepseek-reasoner` returned 400 `does not support this tool_choice`. |
| `API-E2E-013` | CR-002 rejected native-result ordering and memory safety | ToolResultEventHandler unit regression with real/default memory ingestion path | Pass | `pnpm exec vitest run tests/unit/agent/handlers/tool-result-event-handler.test.ts --reporter=dot` passed 1 file / 13 tests. |
| `API-E2E-014` | API continuation rework + CR-002 accepted native result path | Temporary deterministic full runtime capture with real `run_bash` | Pass | Temporary `tests/integration/agent/api-native-continuation-capture.temp.test.ts` passed 1 file / 1 test: captured 2 API requests, real marker file created by `run_bash`, accepted tool result continued through structured native history, no synthetic aggregate user message, no leaked internal kwargs, no API text-leak diagnostic. Temp file removed. |
| `API-E2E-015` | Agent runtime continuation ordering | Existing runtime integration | Pass | `pnpm exec vitest run tests/integration/agent/runtime/agent-runtime.test.ts --reporter=dot` passed 1 file / 4 tests, including continuation-before-later-user-input behavior. |
| `API-E2E-016` | User-requested all agent single-flow E2E sweep | Single-agent flow tests: `agent-single-flow`, `agent-single-flow-xml`, `agent-single-flow-ollama`, and `lmstudio-single-agent-run-bash-flow` | Pass | `pnpm exec vitest run tests/integration/agent/agent-single-flow.test.ts tests/integration/agent/agent-single-flow-xml.test.ts tests/integration/agent/agent-single-flow-ollama.test.ts tests/integration/agent/lmstudio-single-agent-run-bash-flow.test.ts --reporter=dot --maxWorkers=1` passed 4 files / 6 tests, with 1 skipped. |
| `API-E2E-017` | User-requested all agent-team flow E2E sweep | `tests/integration/agent-team` flow tests including direct team, streaming team, and subteam streaming | Pass | `pnpm exec vitest run tests/integration/agent-team/agent-team-single-flow.test.ts tests/integration/agent-team/streaming/agent-team-streaming-flow.test.ts tests/integration/agent-team/streaming/agent-team-subteam-streaming-flow.test.ts --reporter=dot --maxWorkers=1` passed 3 files / 3 tests. |

## Test Scope

In scope:

- Default agent/server API path with native `tools` and no default `tool_choice`.
- Lower-level explicit `kwargs.tool_choice` pass-through in the request builder, classified per provider/model behavior.
- Generated schema closure and strict-mode deferral.
- Native tool-call/result history and no legacy text fallback execution.
- Rejected native result memory-pollution protection before result processors run.
- Accepted native result continuation through `ToolContinuationReadyEvent` with structured OpenAI-compatible history.
- Kimi provider-safe temperature/thinking normalization after prior source changes.
- Live LM Studio and DeepSeek provider behavior classification under the approved boundary.
- XML/JSON/sentinel parser preservation outside native API mode.
- Buildability and diff hygiene.

Out of scope for this ticket:

- Product/server/Electron configuration for a public tool-choice policy.
- Provider/model capability adaptation for models that reject `tool_choice:'required'`.
- Guaranteeing autonomous ten-phase shell workflow success for every local LM Studio model/template.
- Repairing LM Studio prompt templates.
- Strict-mode nullable optional-field conversion.

## Validation Setup / Environment

1. Copied `.env.test` from the main repo and verified identical SHA-256.
2. Inspected the latest review report, API continuation rework decision, `ToolResultEventHandler`, `MemoryIngestToolResultProcessor`, and memory-manager-related paths cited by code review.
3. Ran focused regression and runtime checks.
4. Created a temporary deterministic AgentRuntime/native API capture test, ran it, and removed it.
5. Ran live Kimi, LM Studio, and DeepSeek checks.
6. Ran parser preservation checks.
7. Ran build and diff hygiene checks.

## Tests Implemented Or Updated

No repository-resident durable validation code was added or updated in Round 6. Round 6 updated only this validation report.

Previously added/updated durable validation, already returned through code review before this round:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tests/integration/agent/lmstudio-single-agent-run-bash-flow.test.ts`

## Durable Validation Added To The Codebase

- Repository-resident durable validation code added or updated this round: `No`
- Paths added or updated this round:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/api-e2e-validation-report.md`
- Prior durable validation-code changes returned through `code_reviewer`: `Yes`
- Latest code review artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/review-report.md`

## Other Validation Artifacts

- Current-state schema compliance test: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/schema-best-practice-compliance.test.ts`
- Generated schema compliance report: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/schema-best-practice-compliance-report.json`
- API continuation probe output from design/review package: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/api-tool-continuation-render-probe-output.json`

## Temporary Validation Methods / Scaffolding

Temporary methods used in Round 6:

- `tests/integration/agent/api-native-continuation-capture.temp.test.ts`: local OpenAI-compatible streaming capture endpoint plus real `AgentFactory` / `AgentRuntime` / `LMStudioLLM` / real `run_bash`; validated first request schema/no-`tool_choice`, accepted native tool execution, second request structured continuation, no aggregate synthetic user message, and internal kwarg filtering. Removed after pass.
- Direct DeepSeek HTTP smoke executed inline with `node --input-type=module`; no file persisted.

`find tests -name '*.temp.test.ts' -print` returned no files after cleanup.

## Dependencies Mocked Or Emulated

- Temporary native-continuation capture emulated the OpenAI-compatible streaming server only. The agent runtime, request builder, streaming parser, tool execution, result handler, memory assembly, and continuation request rendering were real implementation paths.
- Live Kimi, LM Studio durable flow, LM Studio opt-in ten-call stress, and DeepSeek integration/direct smoke used real configured providers/endpoints.
- Unit tests use existing mocks/spies for narrow boundary assertions.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Lack of full agent-flow validation depth | Coverage gap in validation method | Resolved and re-proven | Durable LM Studio AgentRuntime `run_bash` flow passed again in Round 6; deterministic native-continuation capture also exercised full runtime and real `run_bash`. | No action. |
| 2-5 | Multi-step `run_bash` local-model residuals | Residual local-model/autonomous-planning/template behavior | Still residual | Opt-in ten-phase flow failed after one native execution with LM Studio/model-template `Unknown StringValue filter: safe`. | Not blocking for reviewed native schema/request/history/continuation/CR-002 scope. |
| 5 | DeepSeek forced-tool-choice failure | Provider/model capability residual | Still residual for forced `deepseek-reasoner`; default/optional tools pass | DeepSeek integration passed 5/5 without default forced `tool_choice`; direct smoke still shows `deepseek-reasoner` rejects forced required tool choice. | Not a shared request-builder or CR-002 blocker. |
| 5 | API/E2E report stale after Round-4 native continuation split and CR-002 ordering fix | Stale validation after source behavior change | Resolved | Round 6 focused result-handler regression, runtime integration, deterministic native-continuation capture, live provider checks, build, and diff hygiene passed/classified. | This report is latest authoritative API/E2E evidence. |

## Passed

- `.env.test` copied and SHA-verified.
- `pnpm exec vitest run tests/unit/agent/handlers/tool-result-event-handler.test.ts --reporter=dot` passed: 1 file / 13 tests.
- Focused 14-file unit/schema/request/handler/Kimi/LM Studio/rendering/diagnostic/status suite passed: 14 files / 65 tests.
- `pnpm exec vitest run tests/integration/agent/runtime/agent-runtime.test.ts --reporter=dot` passed: 1 file / 4 tests.
- Temporary deterministic native-continuation capture passed: 1 file / 1 test; temp removed.
- Live Kimi integration passed: 1 file / 5 tests.
- Live LM Studio durable one-call `run_bash` AgentRuntime flow passed under default no-`tool_choice` boundary: 1 selected / 1 skipped.
- Live DeepSeek integration passed: 1 file / 5 tests.
- Direct DeepSeek forced-tool-choice smoke classified provider behavior: `deepseek-chat` accepted, `deepseek-reasoner` rejected.
- XML/JSON/sentinel parser preservation tests passed: 3 files / 35 tests.
- `find tests -name '*.temp.test.ts' -print` returned no temporary test files.
- TypeScript build and diff hygiene passed.
- User-requested supplemental single-agent flow sweep passed: 4 files / 6 tests, 1 skipped.
- User-requested supplemental agent-team flow sweep passed: 3 files / 3 tests.

## Failed

| Scenario ID | Failure | Classification | Blocking For Current Ticket? | Evidence / Notes |
| --- | --- | --- | --- | --- |
| `API-E2E-010` | Opt-in ten-phase LM Studio AgentRuntime flow failed after 1 successful `run_bash` execution due `Unknown StringValue filter: safe` from LM Studio/model template on continuation. | Residual provider/model prompt-template and autonomous multi-step reliability risk under the approved default no-`tool_choice` boundary. | No. | The deterministic native-continuation capture proved the implementation renders accepted native continuation correctly. The durable one-call live LM Studio flow also passed. The ten-call failure occurs in the local provider/model prompt template after structured tool-result continuation, not in schema closure, result-handler ordering, request filtering, or native history construction. |
| `API-E2E-012` | Direct forced tool-choice smoke for `deepseek-reasoner` returned 400: `deepseek-reasoner does not support this tool_choice`. | Provider/model capability limitation for forced tool choice. | No. | Default/optional DeepSeek integration passed 5/5. The approved boundary no longer forces `tool_choice` on the default agent path. |

## Not Tested / Out Of Scope

- A product/server/Electron configurable tool-choice policy.
- Strict-mode nullable optional-field conversion.
- Exhaustive provider/model matrix for every LM Studio/DeepSeek model.
- Repairing LM Studio prompt templates.
- Making the opt-in autonomous ten-phase workflow pass on qwen3.6 with the current local prompt template.

## Blocked

None for the reviewed ticket scope.

## Cleanup Performed

- Removed the Round 6 temporary vitest file after use.
- Temporary workspaces from AgentRuntime/durable tests were removed by their `afterEach`/`finally` cleanup.
- Verified no `*.temp.test.ts` files remain under `tests`.
- `git diff --check` passed.

## Classification

- No compatibility or legacy fallback issue found.
- No implementation fix is required for the reviewed schema/request/history/Kimi/tool-choice-boundary/API-continuation/CR-002 changes.
- Rejected native-result memory-pollution protection passed focused regression.
- Accepted native-result continuation passed deterministic real runtime capture and live one-call LM Studio flow.
- Default agent/server path correctly emits native `tools` with no default `tool_choice`.
- Explicit `tool_choice` remains available only to lower-level direct callers through `OpenAICompatibleRequestBuilder` kwargs and must be classified by provider/model support.
- DeepSeek forced-tool-choice and LM Studio ten-phase autonomous failures are provider/model/template residuals under the approved boundary, not implementation blockers.
- No repository-resident durable validation code was added or updated in Round 6.

## Recommended Recipient

`delivery_engineer`

Reason: Round 6 validation refreshed the canonical report after the Round-8 CR-002 local-fix code-review pass, found no implementation blocker, and did not add or update repository-resident durable validation code after the latest code review. Per workflow, the package is ready for delivery documentation/finalization.

## Evidence / Notes

Commands run during API/E2E validation:

| Command | Result | Notes |
| --- | --- | --- |
| `cp /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/.env.test .env.test && chmod 600 .env.test && shasum -a 256 ...` | Pass | Main/worktree SHA-256 both `46a8143503fac38ff11d1d72a059c16a7562e82cd8ca60f7f507cfcbe56ae4eb`. |
| `pnpm exec vitest run tests/unit/agent/handlers/tool-result-event-handler.test.ts --reporter=dot` | Pass | 1 file / 13 tests. |
| `pnpm exec vitest run tickets/.../schema-best-practice-compliance.test.ts ... tests/unit/agent/status/status-deriver.test.ts --reporter=dot` | Pass | Focused 14-file suite / 65 tests. |
| `pnpm exec vitest run tests/integration/agent/runtime/agent-runtime.test.ts --reporter=dot` | Pass | 1 file / 4 tests. |
| Temporary `tests/integration/agent/api-native-continuation-capture.temp.test.ts` | Pass | 1 file / 1 test. Captured default first request with closed `run_bash` schema and no `tool_choice`; captured continuation with `assistant.tool_calls` + matching `role:"tool"`; no synthetic aggregate user message; real `run_bash` marker created. Temp removed. |
| `pnpm exec vitest run tests/integration/llm/api/kimi-llm.test.ts --reporter=dot` | Pass | 1 file / 5 tests. |
| `LMSTUDIO_TARGET_TEXT_MODEL=qwen3.6-35b-a3b-nvfp4 ... pnpm exec vitest run tests/integration/agent/lmstudio-single-agent-run-bash-flow.test.ts -t "nested workspace fixture" --reporter=dot` | Pass | 1 selected durable test passed / 1 skipped; default no-`tool_choice` boundary; live native `run_bash` + continuation. |
| `AUTOBYTEUS_LMSTUDIO_MULTISTEP_RUN_BASH_FLOW=1 LMSTUDIO_TARGET_TEXT_MODEL=qwen3.6-35b-a3b-nvfp4 ... -t "ten run_bash" --reporter=dot` | Fail, classified non-blocking | 1 successful tool execution, 0 tool execution failures, then provider/template error `Unknown StringValue filter: safe` on continuation; confirms residual LM Studio/model-template risk. |
| `pnpm exec vitest run tests/integration/llm/api/deepseek-llm.test.ts --reporter=dot` | Pass | 1 file / 5 tests using tools without default forced `tool_choice`. |
| Direct DeepSeek HTTP smoke for `deepseek-chat` and `deepseek-reasoner` with `tool_choice:'required'` | Mixed, classified | `deepseek-chat`: 200 with 1 tool call. `deepseek-reasoner`: 400 `does not support this tool_choice`. |
| `pnpm exec vitest run tests/unit/agent/streaming/handlers/parsing-streaming-response-handler.test.ts tests/unit/agent/streaming/adapters/tool-call-parsing.test.ts tests/unit/agent/streaming/utils/queue-streamer.test.ts --reporter=dot` | Pass | 3 files / 35 tests. |
| `find tests -name '*.temp.test.ts' -print` | Pass | No temporary vitest files remained. |
| `LMSTUDIO_TARGET_TEXT_MODEL=qwen3.6-35b-a3b-nvfp4 LMSTUDIO_FLOW_TEST_TIMEOUT_MS=240000 LMSTUDIO_FILE_WAIT_TIMEOUT_MS=120000 OLLAMA_FLOW_TEST_TIMEOUT_MS=240000 OLLAMA_FILE_WAIT_TIMEOUT_MS=180000 pnpm exec vitest run tests/integration/agent/agent-single-flow.test.ts tests/integration/agent/agent-single-flow-xml.test.ts tests/integration/agent/agent-single-flow-ollama.test.ts tests/integration/agent/lmstudio-single-agent-run-bash-flow.test.ts --reporter=dot --maxWorkers=1` | Pass | 4 files / 6 tests passed, 1 skipped. Ollama server was unavailable and that path skipped/returned without failure. |
| `LMSTUDIO_TARGET_TEXT_MODEL=qwen3.6-35b-a3b-nvfp4 LMSTUDIO_FLOW_TEST_TIMEOUT_MS=240000 LMSTUDIO_FILE_WAIT_TIMEOUT_MS=120000 pnpm exec vitest run tests/integration/agent-team/agent-team-single-flow.test.ts tests/integration/agent-team/streaming/agent-team-streaming-flow.test.ts tests/integration/agent-team/streaming/agent-team-subteam-streaming-flow.test.ts --reporter=dot --maxWorkers=1` | Pass | 3 files / 3 tests passed. |
| `pnpm exec tsc -p tsconfig.build.json --noEmit` | Pass | No TypeScript errors. |
| `git diff --check` | Pass | No whitespace errors. |

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: Reviewed ticket scope remains passed after the Round-8 CR-002 local-fix re-review and the user-requested Round 7 broad flow sweep. Rejected native results are covered by focused regression before memory mutation; accepted native results are covered by deterministic real runtime capture, live LM Studio one-call flow, and additional single-agent/team flow E2E passes. Native API continuations render structured `assistant.tool_calls` plus matching `role:"tool"` and no synthetic aggregate `role:"user"` tool-result message. Provider/model residuals remain explicitly classified as non-blocking: LM Studio qwen3.6 ten-phase stress fails on local prompt-template `safe` filter after one successful tool execution, and `deepseek-reasoner` rejects forced `tool_choice:'required'`. No durable validation code changed in Rounds 6-7, so delivery can proceed.


## Round-6 Scope Correction: Provider-Native Renderer Known Gaps

Subsequent solution-design investigation and architecture review (`AR-006-001`) clarified that this ticket's validation/sign-off scope is OpenAI-compatible Chat providers plus the shared no-synthetic-user continuation path. It must not be read as validating provider-native history rendering for Gemini, Ollama, Anthropic, Mistral, or OpenAI Responses. Those provider renderers still need separate native API history designs and executable wire-format tests; see `non-openai-api-mode-provider-investigation.md` and `probes/non-openai-api-renderer-probe-output.json`.
