# Stage 7 Executable Validation (API/E2E)

## Validation Round Meta

- Current Validation Round: `2`
- Trigger Stage: `6`
- Prior Round Reviewed: `1`
- Latest Authoritative Round: `2`

## Testing Scope

- Ticket: `ollama-api-tool-call-mode`
- Scope classification: `Small`
- Workflow state source: `tickets/done/ollama-api-tool-call-mode/workflow-state.md`
- Requirements source: `tickets/done/ollama-api-tool-call-mode/requirements.md`
- Call stack source: `tickets/done/ollama-api-tool-call-mode/future-state-runtime-call-stack.md`
- Design source (`Medium/Large`): `N/A`
- Interface/system shape in scope: `API`
- Platform/runtime targets:
  - local Node.js + `vitest`
  - local Ollama runtime on `http://localhost:11434`
  - local LM Studio runtime on `http://localhost:1234`
- Lifecycle boundaries in scope (`Install` / `Startup` / `Update` / `Restart` / `Migration` / `Shutdown` / `Recovery` / `None`): `None`

## Validation Asset Strategy

- Durable validation assets to add/update in the repository:
  - `autobyteus-ts/tests/unit/llm/converters/ollama-tool-call-converter.test.ts`
  - `autobyteus-ts/tests/unit/llm/api/ollama-llm.test.ts`
  - `autobyteus-ts/tests/integration/llm/api/ollama-llm.test.ts`
- Temporary validation methods or setup to use only if needed:
  - local qwen model on the user’s Ollama server
  - local LM Studio runtime for parity check
- Cleanup expectation for temporary validation:
  - none beyond normal process shutdown; no temporary repo files were added for validation only

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked (`Yes`/`No`/`N/A`) | New Failures Found (`Yes`/`No`) | Gate Result (`Pass`/`Fail`/`Blocked`) | Latest Authoritative (`Yes`/`No`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Stage 6 exit | `N/A` | No | `Pass` | Yes | All planned validation scenarios passed |
| 2 | Reopened Stage 6 scope expansion | `Yes` | No | `Pass` | Yes | Added higher-layer Ollama single-agent validation and rechecked Ollama provider file |

## Acceptance Criteria Coverage Matrix (Mandatory)

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Last Updated |
| --- | --- | --- | --- | --- | --- |
| `AC-001` | `R-001` | Ollama forwards `tools` in API-call mode | `AV-001`, `AV-002` | `Passed` | 2026-04-05 |
| `AC-002` | `R-002` | Ollama `message.tool_calls` becomes internal `ChunkResponse.tool_calls` | `AV-001`, `AV-002` | `Passed` | 2026-04-05 |
| `AC-003` | `R-002` | Ollama argument objects are serialized to JSON text for downstream invocation reconstruction | `AV-001`, `AV-002` | `Passed` | 2026-04-05 |
| `AC-004` | `R-003` | LM Studio API-call tool behavior remains unchanged | `AV-003` | `Passed` | 2026-04-05 |
| `AC-005` | `R-004` | Ollama live integration emits tool calls with local qwen model | `AV-002`, `AV-004` | `Passed` | 2026-04-05 |
| `AC-006` | `R-004` | Provider-specific Ollama normalization is recorded in ticket artifacts | `AV-005` | `Passed` | 2026-04-05 |
| `AC-007` | `R-006` | Higher-layer single-agent Ollama flow executes `write_file` end-to-end | `AV-006` | `Passed` | 2026-04-05 |

## Spine Coverage Matrix (Mandatory)

| Spine ID | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Scenario ID(s) | Coverage Status (`Unmapped`/`Planned`/`Passed`/`Failed`/`Blocked`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | `OllamaLLM` | `AV-002`, `AV-004` | `Passed` | Live Ollama provider behavior exercised directly |
| `DS-002` | `Primary End-to-End` | `OpenAICompatibleLLM` | `AV-003` | `Passed` | Existing LM Studio baseline rechecked |
| `DS-003` | `Bounded Local` | `convertOllamaToolCalls` | `AV-001`, `AV-002` | `Passed` | Converter behavior proven in unit + live provider scenarios |
| `DS-004` | `Primary End-to-End` | single-agent runtime integration flow | `AV-006` | `Passed` | Higher-layer agent loop proves the provider fix survives tool execution |

## Scenario Catalog

| Scenario ID | Spine ID(s) | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Validation Mode (`API`/`Browser-E2E`/`Desktop-UI`/`CLI`/`Integration`/`Process`/`Lifecycle`/`Other`) | Platform / Runtime | Lifecycle Boundary (`None`/`Install`/`Startup`/`Update`/`Restart`/`Migration`/`Shutdown`/`Recovery`) | Objective/Risk | Expected Outcome | Durable Validation Asset(s) | Temporary Validation Method / Setup | Command/Harness | Status (`Not Started`/`In Progress`/`Passed`/`Failed`/`Blocked`/`N/A`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `AV-001` | `DS-003` | `Requirement` | `AC-001`, `AC-002`, `AC-003` | `R-001`, `R-002` | `UC-001` | `Integration` | local `vitest` + mocked Ollama SDK | `None` | prove request forwarding and normalized streamed tool deltas in a deterministic harness | unit tests pass and assert forwarded tools plus normalized tool deltas | `autobyteus-ts/tests/unit/llm/api/ollama-llm.test.ts`, `autobyteus-ts/tests/unit/llm/converters/ollama-tool-call-converter.test.ts` | none | `pnpm vitest run tests/unit/llm/converters/ollama-tool-call-converter.test.ts tests/unit/llm/api/ollama-llm.test.ts` | `Passed` |
| `AV-002` | `DS-001`, `DS-003` | `Requirement` | `AC-001`, `AC-002`, `AC-003`, `AC-005` | `R-001`, `R-002`, `R-004`, `R-005` | `UC-003` | `API` | local Ollama runtime + `qwen3.5:35b-a3b-coding-nvfp4` | `None` | prove live Ollama API-call mode emits usable tool-call chunks | targeted live tool-call integration test passes | `autobyteus-ts/tests/integration/llm/api/ollama-llm.test.ts` | local Ollama model `qwen3.5:35b-a3b-coding-nvfp4` | `pnpm vitest run tests/integration/llm/api/ollama-llm.test.ts -t "should emit tool calls in API-call mode"` | `Passed` |
| `AV-003` | `DS-002` | `Requirement` | `AC-004` | `R-003` | `UC-002` | `API` | local LM Studio runtime | `None` | prove existing LM Studio tool-call behavior is unchanged | existing LM Studio tool-call integration test passes | `autobyteus-ts/tests/integration/llm/api/lmstudio-llm.test.ts` | local LM Studio runtime | `pnpm vitest run tests/integration/llm/api/lmstudio-llm.test.ts -t "should emit tool calls for LM Studio"` | `Passed` |
| `AV-004` | `DS-001` | `Requirement` | `AC-005` | `R-004`, `R-005` | `UC-003`, `UC-004` | `API` | local Ollama runtime | `None` | prove the full Ollama integration file remains green with the new case included | full Ollama integration file passes | `autobyteus-ts/tests/integration/llm/api/ollama-llm.test.ts` | local Ollama runtime | `pnpm vitest run tests/integration/llm/api/ollama-llm.test.ts` | `Passed` |
| `AV-005` | `DS-001`, `DS-003` | `Requirement` | `AC-006` | `R-004` | `UC-004` | `CLI` | local filesystem + repo artifacts | `None` | prove the ticket artifacts explicitly record the provider-specific normalization decision | `rg` finds the design and investigation record in the ticket artifacts | `tickets/done/ollama-api-tool-call-mode/investigation-notes.md`, `tickets/done/ollama-api-tool-call-mode/implementation.md` | none | `rg -n "provider-specific normalization|Ollama tool-call" tickets/done/ollama-api-tool-call-mode/` | `Passed` |
| `AV-006` | `DS-004` | `Requirement` | `AC-007` | `R-006` | `UC-005` | `API` | local Ollama runtime + single-agent runtime | `None` | prove one higher-layer Ollama agent loop executes the tool and creates the expected file | the Ollama single-agent flow test passes and writes the expected file in a temporary workspace | `autobyteus-ts/tests/integration/agent/agent-single-flow-ollama.test.ts`, `autobyteus-ts/tests/integration/helpers/ollama-llm-helper.ts` | local Ollama model `qwen3.5:35b-a3b-coding-nvfp4` | `pnpm vitest run tests/integration/agent/agent-single-flow-ollama.test.ts` | `Passed` |

## Validation Assets Implemented Or Updated

| Asset Path / Name | Asset Type (`API Test`/`Browser Test`/`Desktop Automation`/`CLI Harness`/`Lifecycle Harness`/`Process Probe`/`Harness`/`Fixture`/`Helper`/`Other`) | Durable In Repo (`Yes`/`No`) | Scenario ID(s) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/llm/converters/ollama-tool-call-converter.test.ts` | `API Test` | Yes | `AV-001` | New converter-specific regression coverage |
| `autobyteus-ts/tests/unit/llm/api/ollama-llm.test.ts` | `API Test` | Yes | `AV-001` | New provider request/stream normalization unit coverage |
| `autobyteus-ts/tests/integration/llm/api/ollama-llm.test.ts` | `API Test` | Yes | `AV-002`, `AV-004` | New live Ollama tool-call integration case added |
| `autobyteus-ts/tests/integration/helpers/ollama-llm-helper.ts` | `Helper` | Yes | `AV-006` | Shared Ollama text-model discovery plus test-only fast-response params |
| `autobyteus-ts/tests/integration/agent/agent-single-flow-ollama.test.ts` | `API Test` | Yes | `AV-006` | New higher-layer single-agent Ollama tool execution proof |

## Temporary Validation Methods / Setup Used

| Method / Setup | Why Needed | Scenario ID(s) | Cleanup Required (`Yes`/`No`) | Cleanup Status |
| --- | --- | --- | --- | --- |
| local Ollama server with `qwen3.5:35b-a3b-coding-nvfp4` | Required to prove live tool-call behavior in the user’s target environment | `AV-002`, `AV-004` | No | `N/A` |
| local LM Studio runtime | Required to recheck the working parity baseline | `AV-003` | No | `N/A` |

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario ID | Previous Classification | Current Resolution (`Resolved`/`Partially Resolved`/`Still Failing`/`Not Applicable After Rework`) | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |

## Failure Escalation Log

| Date | Scenario ID | Failure Summary | Investigation Required (`Yes`/`No`) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`) | Action Path | `investigation-notes.md` Updated | Requirements Updated | Design Updated | Call Stack Regenerated | Review Re-Entry Round | Resolved |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Feasibility And Risk Record

- Any infeasible scenarios (`Yes`/`No`): `No`
- If `Yes`, concrete infeasibility reason per scenario: `N/A`
- Environment constraints (secrets/tokens/access limits/dependencies):
  - local Ollama and LM Studio processes must be running for live scenarios
- Platform/runtime specifics for lifecycle-sensitive scenarios (OS/device/runtime/version `from` -> `to`/package channel or update feed/signing/access requirements): `N/A`
- Compensating automated evidence:
  - unit tests, targeted provider integration, full Ollama integration file, and the higher-layer single-agent flow all pass
- Residual risk notes:
  - Ollama model behavior can still vary by model choice; current evidence is strong for the user-provided qwen model, the current `ollama@0.6.3` contract, and one higher-layer single-agent runtime path
- Human-assisted execution steps required because of platform or OS constraints (`Yes`/`No`): `No`
- If `Yes`, exact steps and evidence capture: `N/A`
- User waiver for infeasible acceptance criteria recorded (`Yes`/`No`): `No`
- If `Yes`, waiver reference (date/user decision): `N/A`
- Temporary validation-only scaffolding cleaned up (`Yes`/`No`/`Partially`): `Yes`
- If retained, why it remains useful as durable coverage:
  - no retained temporary scaffolding

## Stage 7 Gate Decision

- Latest authoritative round: `2`
- Latest authoritative result (`Pass`/`Fail`/`Blocked`): `Pass`
- Stage 7 complete: `Yes`
- Durable executable validation that should live in the repository was implemented or updated: `Yes`
- All in-scope acceptance criteria mapped to scenarios: `Yes`
- All relevant spines mapped to scenarios: `Yes`
- All executable in-scope acceptance criteria status = `Passed`: `Yes`
- All executable relevant spines status = `Passed`: `Yes`
- Critical executable scenarios passed: `Yes`
- Any infeasible acceptance criteria: `No`
- Explicit user waiver recorded for each infeasible acceptance criterion (if any): `N/A`
- Temporary validation-only scaffolding cleaned up or intentionally retained with rationale: `Yes`
- Unresolved escalation items: `No`
- Ready to enter Stage 8 code review: `Yes`
- Notes:
  - Final validation command set:
    - `pnpm vitest run tests/unit/llm/converters/ollama-tool-call-converter.test.ts tests/unit/llm/api/ollama-llm.test.ts`
    - `pnpm vitest run tests/integration/llm/api/ollama-llm.test.ts -t "should emit tool calls in API-call mode"`
    - `pnpm vitest run tests/integration/llm/api/ollama-llm.test.ts`
    - `pnpm vitest run tests/integration/agent/agent-single-flow-ollama.test.ts`
    - `pnpm vitest run tests/integration/llm/api/lmstudio-llm.test.ts -t "should emit tool calls for LM Studio"`
    - `pnpm exec tsc -p tsconfig.build.json --noEmit`
