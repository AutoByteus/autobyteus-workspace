# Implementation

## Scope Classification

- Classification: `Small`
- Reasoning:
  - Only the Ollama provider adapter and directly related tests require changes.
  - The existing agent-side API tool-call pipeline remains authoritative and should not be redesigned.
- Workflow Depth:
  - `Small` -> `implementation.md` solution sketch -> future-state runtime call stack -> future-state runtime call stack review -> finalize `implementation.md` baseline -> implementation execution

## Upstream Artifacts (Required)

- Workflow state: `tickets/done/ollama-api-tool-call-mode/workflow-state.md`
- Investigation notes: `tickets/done/ollama-api-tool-call-mode/investigation-notes.md`
- Requirements: `tickets/done/ollama-api-tool-call-mode/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/done/ollama-api-tool-call-mode/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/done/ollama-api-tool-call-mode/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `N/A`

## Document Status

- Current Status: `Execution Complete`
- Notes:
  - Design basis approved.
  - The reopened higher-layer Ollama single-agent validation flow is implemented and validated.

## Plan Baseline (Freeze Until Replanning)

### Preconditions (Must Be True Before Finalizing The Baseline)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Future-state runtime call stack review has `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

### Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope:
  - `UC-001`: internal tool invocation normalization from provider stream
  - `UC-002`: LM Studio regression baseline remains unchanged
  - `UC-003`: Ollama live API-call mode emits tool invocations
  - `UC-004`: automated regression coverage catches Ollama payload-shape regressions
  - `UC-005`: higher-layer single-agent Ollama flow executes a tool end-to-end
- Spine Inventory In Scope:
  - `DS-001`: primary Ollama API-call streaming spine
  - `DS-002`: primary LM Studio regression spine
  - `DS-003`: bounded local Ollama tool-call conversion spine
  - `DS-004`: single-agent Ollama API-call tool execution spine
- Primary Spine Span Sufficiency Rationale:
  - The scoped spines cover both the provider normalization path and one higher-layer agent runtime path so the restored behavior is proven beyond the provider adapter alone.
- Primary Owners / Main Domain Subjects:
  - `OllamaLLM` owns request/response adaptation for the Ollama SDK.
  - `convertOllamaToolCalls` owns shape normalization from Ollama tool-call objects to internal `ToolCallDelta`.
  - `ApiToolCallStreamingResponseHandler` remains the authoritative downstream consumer of normalized tool deltas.
- Requirement Coverage Guarantee (all requirements mapped to at least one use case):
  - `R-001`/`R-002` -> `UC-001`, `UC-003`
  - `R-003` -> `UC-002`
  - `R-004`/`R-005` -> `UC-003`, `UC-004`
  - `R-006` -> `UC-005`
- Design-Risk Use Cases (if any, with risk/objective):
  - None
- Target Architecture Shape:
  - Keep provider-specific request and response handling in `src/llm/api/ollama-llm.ts`.
  - Add a small converter in `src/llm/converters/` to keep Ollama payload-shape logic isolated and testable.
  - Preserve the existing agent streaming/tool invocation pipeline by emitting internal `ToolCallDelta` objects with JSON-stringified arguments.
  - Reuse the existing single-agent integration harness by adding one Ollama-specific helper and one Ollama single-flow test file instead of redesigning the agent runtime.
- New Owners/Boundary Interfaces To Introduce:
  - `convertOllamaToolCalls(...)` converter helper
- Primary file/task set: see `Implementation Work Table`.
- API/Behavior Delta:
  - `OllamaLLM` starts forwarding `tools` into `client.chat(...)`.
  - Ollama stream handling starts emitting `ChunkResponse.tool_calls` from `message.tool_calls`.
  - Ollama live integration gains API-call tool invocation coverage.
  - Ollama higher-layer validation gains one single-agent end-to-end API-call tool execution test.
- Key Assumptions:
  - `ApiToolCallStreamingResponseHandler` should stay unchanged and remain the consumer contract to satisfy.
  - LM Studio tests already represent the intended behavior baseline.
  - The existing LM Studio single-agent flow is the correct higher-layer template for Ollama parity.
- Known Risks:
  - Ollama may emit tool calls either in non-streaming or single-stream chunks only; conversion must handle full-object arguments without fragment assumptions.
  - Live integration timing is slow with the provided qwen model.
  - Higher-layer file creation may take longer than the provider-only test because the agent runtime must complete tool execution and follow-up handling.

### Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | `N/A` | `N/A` | `N/A` | `Candidate Go` | 1 |
| 2 | Pass | No | No | `N/A` | `N/A` | `N/A` | `Go Confirmed` | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

### Principles

- Bottom-up: implement conversion helper before provider usage sites that depend on it.
- Test-driven: add provider unit coverage and live integration coverage alongside the fix.
- Spine-led implementation rule: provider adapter first, then validation artifacts.
- Mandatory modernization rule: no compatibility wrapper or alternative agent path; fix the real provider adapter.
- Mandatory cleanup rule: avoid dead temporary compatibility branches in the Ollama provider path.
- Mandatory ownership/decoupling/SoC rule: keep provider normalization logic in the provider/converter area, not in agent streaming code.
- Mandatory `Authoritative Boundary Rule`: `ApiToolCallStreamingResponseHandler` remains the authoritative consumer boundary; upstream provider code should adapt to it rather than bypass or alter it.
- Mandatory `Spine Span Sufficiency Rule`: preserve the full provider-to-handler path in reasoning and validation.
- Mandatory file-placement rule: converter logic lives in `src/llm/converters/`, provider wiring stays in `src/llm/api/`, tests stay in `tests/unit/llm/api/` and `tests/integration/llm/api/`.

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | `DS-003` | `convertOllamaToolCalls` | `src/llm/converters/ollama-tool-call-converter.ts` | None | Establish the payload-shape contract first |
| 2 | `DS-001` | `OllamaLLM` | `src/llm/api/ollama-llm.ts` | `C-001` | Provider stream/request wiring depends on the converter |
| 3 | `DS-003` | Ollama unit tests | `tests/unit/llm/api/ollama-llm.test.ts` | `C-001`, `C-002` | Unit test the conversion and request forwarding directly |
| 4 | `DS-001`, `DS-002` | Live provider integration tests | `tests/integration/llm/api/ollama-llm.test.ts` | `C-002` | Validate real Ollama behavior after code is wired |
| 5 | `DS-004` | Ollama integration helper | `tests/integration/helpers/ollama-llm-helper.ts` | `C-002` | Reuse one consistent text-model discovery path for the higher-layer test |
| 6 | `DS-004` | Single-agent integration test | `tests/integration/agent/agent-single-flow-ollama.test.ts` | `C-002`, `C-005` | Prove the restored provider behavior survives the agent runtime |

### File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| Ollama provider wiring | `autobyteus-ts/src/llm/api/ollama-llm.ts` | same | Ollama API adapter | `Keep` | Unit + integration tests |
| Ollama tool-call normalization | none | `autobyteus-ts/src/llm/converters/ollama-tool-call-converter.ts` | LLM response conversion | `Promote Shared` | Unit tests |
| Ollama unit tests | none | `autobyteus-ts/tests/unit/llm/api/ollama-llm.test.ts` | Provider unit validation | `Create` | `vitest` unit run |
| Ollama live integration test | `autobyteus-ts/tests/integration/llm/api/ollama-llm.test.ts` | same | Live provider validation | `Modify` | Live integration run |
| Ollama integration helper | none | `autobyteus-ts/tests/integration/helpers/ollama-llm-helper.ts` | Integration model discovery helper | `Create` | Higher-layer Ollama flow run |
| Ollama single-agent flow test | none | `autobyteus-ts/tests/integration/agent/agent-single-flow-ollama.test.ts` | Higher-layer agent validation | `Create` | Higher-layer Ollama flow run |

### Implementation Work Table (Primary Tracker)

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `DS-003` | LLM converters | Normalize Ollama tool-call objects into `ToolCallDelta` | none | `autobyteus-ts/src/llm/converters/ollama-tool-call-converter.ts` | `Create` | none | `Completed` | `autobyteus-ts/tests/unit/llm/converters/ollama-tool-call-converter.test.ts` | `Passed` | `N/A` | `N/A` | `Passed` | Argument objects are serialized to JSON text |
| `C-002` | `DS-001` | `OllamaLLM` | Forward tool schemas and emit normalized tool calls during streaming | `autobyteus-ts/src/llm/api/ollama-llm.ts` | same | `Modify` | `C-001` | `Completed` | `autobyteus-ts/tests/unit/llm/api/ollama-llm.test.ts` | `Passed` | `autobyteus-ts/tests/integration/llm/api/ollama-llm.test.ts` | `Passed` | `Passed` | Also surfaces `message.thinking` cleanly |
| `C-003` | `DS-003` | LLM unit tests | Mocked provider request/response coverage | none | `autobyteus-ts/tests/unit/llm/api/ollama-llm.test.ts` | `Create` | `C-001`, `C-002` | `Completed` | same | `Passed` | `N/A` | `N/A` | `Passed` | Asserts tool forwarding and streamed conversion |
| `C-004` | `DS-001`, `DS-002` | LLM integration tests | Live Ollama tool-call regression test | `autobyteus-ts/tests/integration/llm/api/ollama-llm.test.ts` | same | `Modify` | `C-002` | `Completed` | `N/A` | `N/A` | same | `Passed` | `Passed` | Full file passes and LM Studio baseline tool-call test also passes |
| `C-005` | `DS-004` | Integration helpers | Resolve a usable Ollama text model for higher-layer tests | none | `autobyteus-ts/tests/integration/helpers/ollama-llm-helper.ts` | `Create` | `C-002` | `Completed` | `N/A` | `N/A` | `autobyteus-ts/tests/integration/agent/agent-single-flow-ollama.test.ts` | `Passed` | `Passed` | Mirrors the existing LM Studio helper style and adds test-only fast-response params |
| `C-006` | `DS-004` | Agent integration tests | Single-agent Ollama tool execution end-to-end | none | `autobyteus-ts/tests/integration/agent/agent-single-flow-ollama.test.ts` | `Create` | `C-002`, `C-005` | `Completed` | `N/A` | `N/A` | same | `Passed` | `Passed` | Reuses the existing LM Studio single-agent flow structure with an Ollama-specific system prompt for deterministic tool use |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R-001` | `AC-001` | `DS-001` | Solution Sketch | `UC-003` | `C-002`, `C-003` | Unit | `AV-001` |
| `R-002` | `AC-002`, `AC-003` | `DS-001`, `DS-003` | Solution Sketch | `UC-001`, `UC-003` | `C-001`, `C-002`, `C-003` | Unit + Integration | `AV-001`, `AV-002` |
| `R-003` | `AC-004` | `DS-002` | Solution Sketch | `UC-002` | `C-004` | Regression Integration | `AV-003` |
| `R-004` | `AC-005` | `DS-001` | Solution Sketch | `UC-003`, `UC-004` | `C-003`, `C-004` | Unit + Integration | `AV-001`, `AV-002` |
| `R-005` | `AC-005` | `DS-001` | Solution Sketch | `UC-003` | `C-004` | Integration | `AV-002` |
| `R-006` | `AC-007` | `DS-004` | Solution Sketch | `UC-005` | `C-005`, `C-006` | Integration | `AV-006` |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- | --- |
| `AC-001` | `R-001` | `DS-001` | Ollama request includes tool schemas when tools are supplied | `AV-001` | API | `Planned` |
| `AC-002` | `R-002` | `DS-001`, `DS-003` | Ollama stream emits normalized tool deltas from `message.tool_calls` | `AV-001` | API | `Planned` |
| `AC-003` | `R-002` | `DS-003` | JSON-text arguments reconstruct into invocation arguments correctly | `AV-002` | API | `Planned` |
| `AC-004` | `R-003` | `DS-002` | LM Studio behavior is unchanged | `AV-003` | API | `Planned` |
| `AC-005` | `R-004`, `R-005` | `DS-001` | Live Ollama integration emits at least one tool call with the local qwen model | `AV-002` | API | `Planned` |
| `AC-006` | `R-004` | `DS-001`, `DS-003` | Artifacts explain provider-specific normalization choice | `AV-004` | API | `Planned` |
| `AC-007` | `R-006` | `DS-004` | A single-agent Ollama flow executes `write_file` end-to-end and creates the expected file | `AV-006` | API | `Planned` |

### Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| `T-DEL-001` | Temporary investigation-only assumptions about OpenAI delta parity for Ollama | `Remove` | Encode Ollama-specific conversion explicitly in code/tests | No production-path risk |

### Step-By-Step Plan

1. Add an Ollama tool-call converter that accepts the actual `message.tool_calls` shape and returns internal `ToolCallDelta` entries.
2. Update `OllamaLLM` to forward `tools` into `client.chat(...)` and emit converted tool-call chunks during streaming.
3. Add provider unit coverage for request forwarding and streamed tool-call conversion.
4. Add live Ollama integration coverage for API-call mode tool invocation using the local qwen model when available.
5. Add a reusable Ollama integration helper for higher-layer tests.
6. Add one Ollama single-agent end-to-end integration flow mirroring the existing LM Studio single-flow test.
7. Run unit and integration validation, then carry the results into Stage 7/8 artifacts.

### Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight (no kitchen-sink base or overlapping parallel shapes introduced): `Yes`
- Shared design/common-practice rules reapplied during implementation (and any file-level design weakness routed as `Design Impact` when needed): `Yes`
- Spine Span Sufficiency preserved (implementation still follows a global enough primary spine, not only a local touched path): `Yes`
- Authoritative Boundary Rule preserved (no boundary bypass / no mixed-level dependency): `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`
- Changed source implementation files kept within proactive size-pressure guardrails (`>500` avoided; `>220` pressure assessed/acted on): `Yes`

### Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/done/ollama-api-tool-call-mode/code-review.md`
- Scope (source + tests):
  - `src/llm/api/ollama-llm.ts`
  - `src/llm/converters/ollama-tool-call-converter.ts`
  - `tests/unit/llm/api/ollama-llm.test.ts`
  - `tests/integration/llm/api/ollama-llm.test.ts`
  - `tests/integration/helpers/ollama-llm-helper.ts`
  - `tests/integration/agent/agent-single-flow-ollama.test.ts`
- line-count measurement command (`effective non-empty`):
  - effective non-empty line count: `rg -n "\\S" <file-path> | wc -l`
  - changed-line delta: `git diff --numstat origin/personal...HEAD -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action:
  - No changed source file should approach the limit; split if needed before Stage 8.
- per-file diff delta gate (`>220` changed lines) assessment approach:
  - Keep provider fix localized and the new converter separate to avoid pressure in `ollama-llm.ts`.

### Test Strategy

- Unit tests:
  - Mock the `ollama` SDK client to assert `tools` are forwarded and streamed `message.tool_calls` become `ChunkResponse.tool_calls`.
- Integration tests:
  - Extend `tests/integration/llm/api/ollama-llm.test.ts` with a live tool-call test that uses `qwen3.5:35b-a3b-coding-nvfp4` when available.
  - Add `tests/integration/agent/agent-single-flow-ollama.test.ts` to prove one higher-layer single-agent file-write execution path.
- Stage 6 boundary:
  - File and provider-level verification only.
- Stage 7 handoff notes for API/E2E and executable validation:
  - canonical artifact path: `tickets/done/ollama-api-tool-call-mode/api-e2e-testing.md`
  - expected acceptance criteria count: `6`
  - critical flows to validate:
    - Ollama request includes tool schemas
    - Ollama stream emits normalized tool calls
    - live qwen model produces at least one tool invocation
    - single-agent Ollama flow executes `write_file` end-to-end
    - LM Studio baseline is not regressed
  - expected scenario count: `5`
  - known environment constraints:
    - local Ollama inference latency is high
    - local node dependencies may need installation in the ticket worktree
