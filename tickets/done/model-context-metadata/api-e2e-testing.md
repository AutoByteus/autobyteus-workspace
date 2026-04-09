# Stage 7 Executable Validation (API/E2E)

## Validation Round Meta

- Current Validation Round: `6`
- Trigger Stage: `8`
- Prior Round Reviewed: `5`
- Latest Authoritative Round: `5`

## Testing Scope

- Ticket: `model-context-metadata`
- Scope classification: `Medium`
- Workflow state source: `tickets/in-progress/model-context-metadata/workflow-state.md`
- Requirements source: `tickets/in-progress/model-context-metadata/requirements.md`
- Call stack source: `tickets/in-progress/model-context-metadata/future-state-runtime-call-stack.md`
- Design source (`Medium/Large`): `tickets/in-progress/model-context-metadata/proposed-design.md`
- Interface/system shape in scope: `API`, `CLI`, `Integration`
- Platform/runtime targets: `autobyteus-ts`, `autobyteus-server-ts`, `autobyteus-web`
- Lifecycle boundaries in scope (`Install` / `Startup` / `Update` / `Restart` / `Migration` / `Shutdown` / `Recovery` / `None`): `None`

## Validation Asset Strategy

- Durable validation assets to add/update in the repository:
  - `autobyteus-ts/tests/unit/llm/metadata/model-metadata-resolver.test.ts`
  - `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts`
  - `autobyteus-ts/tests/integration/llm/api/lmstudio-llm.test.ts`
  - `autobyteus-ts/tests/integration/agent/agent-single-flow.test.ts`
  - `autobyteus-ts/tests/integration/agent/agent-single-flow-ollama.test.ts`
  - `autobyteus-ts/tests/integration/llm/api/openai-llm.test.ts`
  - `autobyteus-ts/tests/integration/llm/api/gemini-llm.test.ts`
  - `autobyteus-ts/tests/integration/llm/api/qwen-llm.test.ts`
  - `autobyteus-ts/tests/integration/llm/api/kimi-llm.test.ts`
  - `autobyteus-ts/tests/integration/llm/api/deepseek-llm.test.ts`
  - `autobyteus-ts/tests/integration/llm/api/glm-llm.test.ts`
  - `autobyteus-ts/tests/integration/llm/api/minimax-llm.test.ts`
  - `autobyteus-web/components/settings/__tests__/ProviderAPIKeyManager.spec.ts`
- Temporary validation methods or setup to use only if needed:
  - `None`
- Cleanup expectation for temporary validation:
  - `N/A`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked (`Yes`/`No`/`N/A`) | New Failures Found (`Yes`/`No`) | Gate Result (`Pass`/`Fail`/`Blocked`) | Latest Authoritative (`Yes`/`No`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Stage 6 exit | N/A | No | Pass | Yes | Current round reran cloud metadata, local-runtime discovery, GraphQL projection, frontend-store, and token-budget coverage. |
| 2 | Stage 6 local-fix re-entry | N/A | No | Pass | Yes | Targeted rerun confirmed the Gemini latest-only correction across resolver metadata, Gemini runtime mapping, UI fixtures, skip-safe live Gemini suites, and the TypeScript build. |
| 3 | Stage 6 local-fix re-entry | N/A | No | Pass | Yes | Focused rerun confirmed bounded resolver fallback timing during factory initialization, preserved Ollama model discovery under partial enrichment failure, and the TypeScript build. |
| 4 | Stage 8 validation-gap re-entry | Yes | No | Pass | Yes | Added and ran live LM Studio executable coverage for the metadata-aware `LLMFactory -> LMStudioLLM` path and the LM Studio-backed single-agent flow. |
| 5 | Stage 8 validation-gap re-entry | Yes | No | Pass | Yes | Added and ran live Ollama executable coverage for the metadata-aware single-agent flow, including a runtime assertion that the selected Ollama model already exposes normalized context metadata before tool execution. |
| 6 | Stage 8 validation-gap re-entry | Yes | Yes | Blocked | No | OpenAI, Kimi, and DeepSeek now pass. Qwen and MiniMax are still blocked because `DASHSCOPE_API_KEY` and `MINIMAX_API_KEY` are not present in the package test environment, and the MiniMax integration asset still needs to be added before that provider can run. |

## Acceptance Criteria Coverage Matrix (Mandatory)

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | Shared model contract exposes normalized token metadata fields | AV-001, AV-003, AV-005, AV-006 | Passed | 2026-04-09 |
| AC-002 | R-002 | Unknown metadata remains truthful instead of using fake universal limits | AV-001 | Passed | 2026-04-09 |
| AC-003 | R-003 | LM Studio discovery exposes supported and active context values | AV-002, AV-006 | Passed | 2026-04-09 |
| AC-004 | R-004 | Ollama discovery uses richer detail metadata for context limits | AV-002, AV-008 | Passed | 2026-04-09 |
| AC-005 | R-008 | Server/frontend consumers receive expanded model metadata | AV-003, AV-005, AV-006 | Passed | 2026-04-09 |
| AC-006 | R-005 | Support registry remains separate from metadata sourcing | AV-001, AV-005 | Passed | 2026-04-09 |
| AC-007 | R-006 | Provider-specific sourcing follows provider-appropriate metadata paths | AV-001 | Passed | 2026-04-09 |
| AC-008 | R-006 | At least one cloud provider resolves metadata dynamically | AV-001 | Passed | 2026-04-09 |
| AC-009 | R-007 | Thin provider APIs stay curated-or-unknown instead of fake defaults | AV-001 | Passed | 2026-04-09 |
| AC-010 | R-009 | Token-budget logic remains safe for known and unknown metadata | AV-004 | Passed | 2026-04-09 |
| AC-011 | R-010 | Automated coverage exists for contract and mapping regressions | AV-001, AV-002, AV-003, AV-004, AV-006, AV-007, AV-008, AV-009, AV-010, AV-011, AV-012, AV-013 | Passed | 2026-04-09 |
| AC-012 | R-011 | Supported cloud registry uses current official model IDs | AV-001, AV-005 | Passed | 2026-04-09 |
| AC-013 | R-011 | Provider defaults and fixtures stay aligned with the refreshed registry | AV-001, AV-003, AV-005 | Passed | 2026-04-09 |

## Spine Coverage Matrix (Mandatory)

| Spine ID | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Scenario ID(s) | Coverage Status (`Unmapped`/`Planned`/`Passed`/`Failed`/`Blocked`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | `LLMModel` / `ModelInfo` | AV-001, AV-003, AV-005, AV-006, AV-009, AV-010, AV-011, AV-012, AV-013 | Passed | Contract expansion and downstream projection remain aligned, including the live provider API paths that still need the latest validation rerun. |
| DS-002 | Primary End-to-End | local runtime providers | AV-002, AV-006, AV-007, AV-008 | Passed | Round five extends the live executable coverage from LM Studio to the Ollama-backed single-agent path. |
| DS-003 | Primary End-to-End | support registry + metadata resolver | AV-001, AV-005 | Passed | Registry ownership and metadata sourcing stay separated. |
| DS-004 | Bounded Local | token-budget owner | AV-004, AV-005 | Passed | Safe unknown-handling remained intact after the metadata refresh. |

## Scenario Catalog

| Scenario ID | Spine ID(s) | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Validation Mode (`API`/`Browser-E2E`/`Desktop-UI`/`CLI`/`Integration`/`Process`/`Lifecycle`/`Other`) | Platform / Runtime | Lifecycle Boundary (`None`/`Install`/`Startup`/`Update`/`Restart`/`Migration`/`Shutdown`/`Recovery`) | Objective/Risk | Expected Outcome | Durable Validation Asset(s) | Temporary Validation Method / Setup | Command/Harness | Status (`Not Started`/`In Progress`/`Passed`/`Failed`/`Blocked`/`N/A`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AV-001 | DS-001, DS-003 | Requirement | AC-001, AC-002, AC-006, AC-007, AC-008, AC-009, AC-011, AC-012, AC-013 | R-001, R-002, R-005, R-006, R-007, R-010, R-011 | UC-001, UC-005, UC-006, UC-008, UC-009, UC-010 | Integration | `autobyteus-ts` | None | Resolver-backed metadata must override or fall back correctly while the latest-only registry stays current. | Cloud metadata resolution, curated fallback behavior, and refreshed supported IDs all validate in one catalog path. | `autobyteus-ts/tests/unit/llm/metadata/model-metadata-resolver.test.ts`, `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | None | `pnpm -C autobyteus-ts exec vitest run tests/unit/llm/metadata/model-metadata-resolver.test.ts tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Passed |
| AV-002 | DS-002 | Requirement | AC-003, AC-004, AC-011 | R-003, R-004, R-010 | UC-002, UC-003, UC-008 | Integration | `autobyteus-ts` | None | Local runtime discovery must surface runtime-specific context metadata without regressing reload behavior. | LM Studio and Ollama discovery paths populate context metadata and survive reload-model flows. | `autobyteus-ts/tests/unit/llm/lmstudio-provider.test.ts`, `autobyteus-ts/tests/unit/llm/ollama-provider.test.ts`, `autobyteus-ts/tests/integration/llm/llm-reloading.test.ts` | None | `pnpm -C autobyteus-ts exec vitest run tests/unit/llm/lmstudio-provider.test.ts tests/unit/llm/ollama-provider.test.ts tests/integration/llm/llm-reloading.test.ts` | Passed |
| AV-003 | DS-001 | Requirement | AC-005, AC-011, AC-013 | R-008, R-010, R-011 | UC-004, UC-008, UC-010 | Integration | `autobyteus-server-ts`, `autobyteus-web` | None | Expanded model metadata and refreshed cloud IDs must project cleanly through server and frontend consumers. | GraphQL mapping, frontend store state, and API-key manager UI fixtures all stay consistent with the new model catalog. | `autobyteus-server-ts/tests/unit/api/graphql/types/llm-provider.test.ts`, `autobyteus-web/tests/stores/llmProviderConfigStore.test.ts`, `autobyteus-web/components/settings/__tests__/ProviderAPIKeyManager.spec.ts` | None | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/api/graphql/types/llm-provider.test.ts` and `pnpm -C autobyteus-web test:nuxt tests/stores/llmProviderConfigStore.test.ts --run` and `pnpm -C autobyteus-web test:nuxt components/settings/__tests__/ProviderAPIKeyManager.spec.ts --run` | Passed |
| AV-004 | DS-004 | Requirement | AC-010, AC-011 | R-009, R-010 | UC-007, UC-008 | Integration | `autobyteus-ts` | None | Token budgeting must remain safe when a model has either resolved or unknown metadata. | Budgeting behavior remains conservative and correct after the metadata normalization changes. | `autobyteus-ts/tests/unit/agent/token-budget.test.ts` | None | `pnpm -C autobyteus-ts exec vitest run tests/unit/agent/token-budget.test.ts` | Passed |
| AV-005 | DS-001, DS-003, DS-004 | Design-Risk | AC-001, AC-005, AC-012, AC-013 | R-001, R-008, R-011 | UC-001, UC-004, UC-010 | CLI | `autobyteus-ts` | None | The refreshed registry/defaults plus new metadata sources must still compile as one coherent codebase. | TypeScript build and runtime-dependency verification succeed after the registry/default refresh and metadata-layer additions. | `autobyteus-ts` build pipeline | None | `pnpm -C autobyteus-ts build` | Passed |
| AV-006 | DS-001, DS-002 | Requirement | AC-001, AC-003, AC-005, AC-011 | R-001, R-003, R-008, R-010 | UC-002, UC-004, UC-008 | Integration | `autobyteus-ts` + live LM Studio | None | The metadata-aware LM Studio discovery path must still produce a runnable `LMStudioLLM` with truthful context metadata. | A discovered LM Studio model exposes normalized context metadata through `LLMFactory`, and the resulting `LMStudioLLM` still completes a real prompt/stream round-trip. | `autobyteus-ts/tests/integration/llm/api/lmstudio-llm.test.ts` | Requires a reachable LM Studio server and one loaded text model. | `LMSTUDIO_HOSTS=http://127.0.0.1:1234 LMSTUDIO_TARGET_TEXT_MODEL=qwen/qwen3.5-35b-a3b pnpm -C autobyteus-ts exec vitest run tests/integration/llm/api/lmstudio-llm.test.ts -t 'uses metadata-aware LM Studio discovery to create a runnable text model with truthful context metadata'` | Passed |
| AV-007 | DS-002 | Design-Risk | AC-011 | R-010 | UC-008 | Integration | `autobyteus-ts` + live LM Studio | None | The LM Studio-backed single-agent flow must still complete after the metadata/discovery changes. | The agent creates an LM Studio LLM through the factory, executes the `write_file` tool, reaches idle, and preserves the expected event ordering. | `autobyteus-ts/tests/integration/agent/agent-single-flow.test.ts` | Requires a reachable LM Studio server and one loaded text model that supports tool use. | `LMSTUDIO_HOSTS=http://127.0.0.1:1234 LMSTUDIO_TARGET_TEXT_MODEL=qwen/qwen3.5-35b-a3b pnpm -C autobyteus-ts exec vitest run tests/integration/agent/agent-single-flow.test.ts -t 'executes a tool call end-to-end for a single agent'` | Passed |
| AV-008 | DS-002 | Design-Risk | AC-004, AC-011 | R-004, R-010 | UC-003, UC-008 | Integration | `autobyteus-ts` + live Ollama | None | The Ollama-backed single-agent flow must still complete after the metadata/discovery changes, and the selected Ollama model must carry normalized context metadata before execution begins. | The agent creates an Ollama LLM through the factory, the selected model reports truthful `maxContextTokens` and optional `activeContextTokens`, and the `write_file` tool flow completes end-to-end. | `autobyteus-ts/tests/integration/agent/agent-single-flow-ollama.test.ts` | Requires a reachable Ollama server and a tool-capable text model discoverable via `/api/show`. | `OLLAMA_HOSTS=http://127.0.0.1:11434 OLLAMA_TARGET_TEXT_MODEL=qwen3.5:35b-a3b-coding-nvfp4 pnpm -C autobyteus-ts exec vitest run tests/integration/agent/agent-single-flow-ollama.test.ts -t 'executes a tool call end-to-end for a single agent'` | Passed |
| AV-009 | DS-001 | Requirement | AC-011 | R-010 | UC-001, UC-008 | Integration | `autobyteus-ts` + live OpenAI | None | The OpenAI LLM adapter must still complete basic completion and streaming flows after the metadata changes. | The existing OpenAI integration suite passes against a valid API key without metadata-related regressions. | `autobyteus-ts/tests/integration/llm/api/openai-llm.test.ts` | Requires `OPENAI_API_KEY` in `autobyteus-ts/.env.test`. | `pnpm -C autobyteus-ts exec vitest run tests/integration/llm/api/openai-llm.test.ts` | Passed |
| AV-010 | DS-001 | Requirement | AC-011 | R-010 | UC-001, UC-008 | Integration | `autobyteus-ts` + live Qwen | None | The Qwen LLM adapter must still complete basic completion and streaming flows after the metadata changes. | The existing Qwen integration suite passes against a valid DashScope API key without metadata-related regressions. | `autobyteus-ts/tests/integration/llm/api/qwen-llm.test.ts` | Requires `DASHSCOPE_API_KEY` in `autobyteus-ts/.env.test`. | `pnpm -C autobyteus-ts exec vitest run tests/integration/llm/api/qwen-llm.test.ts` | Blocked |
| AV-011 | DS-001 | Requirement | AC-011 | R-010 | UC-001, UC-008 | Integration | `autobyteus-ts` + live Kimi | None | The Kimi LLM adapter must still complete message and tool-continuation flows after the metadata changes. | The existing Kimi integration suite passes against a valid Kimi API key without metadata-related regressions. | `autobyteus-ts/tests/integration/llm/api/kimi-llm.test.ts`, `autobyteus-ts/tests/unit/llm/api/kimi-llm.test.ts` | Requires `KIMI_API_KEY` in `autobyteus-ts/.env.test`. | `pnpm -C autobyteus-ts exec vitest run tests/unit/llm/api/kimi-llm.test.ts` and `pnpm -C autobyteus-ts exec vitest run tests/integration/llm/api/kimi-llm.test.ts` | Passed |
| AV-012 | DS-001 | Requirement | AC-011 | R-010 | UC-001, UC-008 | Integration | `autobyteus-ts` + live DeepSeek | None | The DeepSeek LLM adapter must still complete message and tool-continuation flows after the metadata changes. | The existing DeepSeek integration suite passes against a valid DeepSeek API key without metadata-related regressions. | `autobyteus-ts/tests/integration/llm/api/deepseek-llm.test.ts` | Requires `DEEPSEEK_API_KEY` in `autobyteus-ts/.env.test`. | `pnpm -C autobyteus-ts exec vitest run tests/integration/llm/api/deepseek-llm.test.ts` | Passed |
| AV-013 | DS-001 | Requirement | AC-011 | R-010 | UC-001, UC-008 | Integration | `autobyteus-ts` + live MiniMax | None | The MiniMax LLM adapter must still complete basic completion and streaming flows after the metadata changes. | A new MiniMax integration suite passes against a valid MiniMax API key without metadata-related regressions. | `autobyteus-ts/tests/integration/llm/api/minimax-llm.test.ts` | Requires `MINIMAX_API_KEY` in `autobyteus-ts/.env.test`. | `pnpm -C autobyteus-ts exec vitest run tests/integration/llm/api/minimax-llm.test.ts` | Blocked |

## Validation Assets Implemented Or Updated

| Asset Path / Name | Asset Type (`API Test`/`Browser Test`/`Desktop Automation`/`CLI Harness`/`Lifecycle Harness`/`Process Probe`/`Harness`/`Fixture`/`Helper`/`Other`) | Durable In Repo (`Yes`/`No`) | Scenario ID(s) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/llm/metadata/model-metadata-resolver.test.ts` | API Test | Yes | AV-001 | Added Anthropic live metadata coverage and refreshed OpenAI/Mistral/Gemini expectations. |
| `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | API Test | Yes | AV-001 | Verifies registry initialization merges live and curated metadata with current model IDs. |
| `autobyteus-ts/tests/unit/utils/gemini-model-mapping.test.ts` | API Test | Yes | AV-001 | Added explicit Gemini LLM runtime-mapping coverage for the Gemini 3 preview text model IDs. |
| `autobyteus-ts/tests/unit/llm/ollama-provider.test.ts` | API Test | Yes | AV-002 | Added the partial-enrichment failure case to ensure listed Ollama models remain discoverable with unknown metadata. |
| `autobyteus-ts/tests/integration/helpers/ollama-llm-helper.ts` | Helper | Yes | AV-008 | Added a `forceFactoryDiscovery` option and metadata-aware selection preference so live Ollama validation cannot silently bypass discovery via a manual model env var. |
| `autobyteus-ts/tests/integration/helpers/lmstudio-llm-helper.ts` | Helper | Yes | AV-007 | Added a `forceFactoryDiscovery` option so live LM Studio integration scenarios can explicitly exercise the metadata-aware discovery path even when a manual model env var is present. |
| `autobyteus-ts/tests/integration/llm/api/lmstudio-llm.test.ts` | API Test | Yes | AV-006 | Round four adds live LM Studio discovery coverage that asserts normalized context metadata survives into a runnable `LMStudioLLM`. |
| `autobyteus-ts/tests/integration/agent/agent-single-flow.test.ts` | API Test | Yes | AV-007 | Round four strengthens live LM Studio agent validation so the metadata-aware factory path stays covered end-to-end. |
| `autobyteus-ts/tests/integration/agent/agent-single-flow-ollama.test.ts` | API Test | Yes | AV-008 | Round five now asserts normalized context metadata on the selected Ollama model and reruns the `write_file` single-agent flow end-to-end on the metadata-aware factory path. |
| `autobyteus-ts/tests/integration/llm/api/openai-llm.test.ts` | API Test | Yes | AV-009 | Round six passed against the copied package test environment. |
| `autobyteus-ts/tests/integration/llm/api/gemini-llm.test.ts` | API Test | Yes | User-requested supplemental live check | The refreshed Vertex key cleared the earlier auth failure. The suite now passes 7 of 8 tests; the remaining multimodal image case fails with provider-side `429 RESOURCE_EXHAUSTED`. |
| `autobyteus-ts/tests/integration/llm/api/qwen-llm.test.ts` | API Test | Yes | AV-010 | Live execution is blocked because `DASHSCOPE_API_KEY` is not present in the copied package test environment. |
| `autobyteus-ts/tests/integration/llm/api/kimi-llm.test.ts` | API Test | Yes | AV-011 | Live execution now passes all five tests with the refreshed key after the Kimi adapter disables thinking for `kimi-k2.5` tool workflows by default. |
| `autobyteus-ts/tests/unit/llm/api/kimi-llm.test.ts` | API Test | Yes | AV-011 | Added provider-specific unit coverage for Kimi tool-workflow request normalization. |
| `autobyteus-ts/tests/integration/llm/api/deepseek-llm.test.ts` | API Test | Yes | AV-012 | Live execution now passes all five tests with the refreshed worktree `DEEPSEEK_API_KEY`. |
| `autobyteus-ts/tests/integration/llm/api/glm-llm.test.ts` | API Test | Yes | User-requested supplemental live check | Live execution now passes all five tests with the configured `GLM_API_KEY`. |
| `autobyteus-ts/tests/integration/llm/api/minimax-llm.test.ts` | API Test | Yes | AV-013 | Still missing; the credential gate was hit before the new MiniMax integration asset could be added and executed. |
| `autobyteus-web/components/settings/__tests__/ProviderAPIKeyManager.spec.ts` | Browser Test | Yes | AV-003 | Refreshed Gemini fixture IDs to current supported values. |

## Temporary Validation Methods / Setup Used

| Method / Setup | Why Needed | Scenario ID(s) | Cleanup Required (`Yes`/`No`) | Cleanup Status |
| --- | --- | --- | --- | --- |
| `Copied autobyteus-ts/.env.test from the primary workspace into the worktree` | The worktree did not have the package test environment file, and the live provider suites rely on package-local dotenv loading. | `AV-009`, `AV-010`, `AV-011`, `AV-012`, `AV-013` | No | `Retained for this validation round` |

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario ID | Previous Classification | Current Resolution (`Resolved`/`Partially Resolved`/`Still Failing`/`Not Applicable After Rework`) | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| `3` | `N/A` | `N/A` | `N/A` | `N/A` | Round four is a validation-gap re-entry from Stage eight, so the prior authoritative round had no failing Stage seven scenarios to recheck. |

## Failure Escalation Log

| Date | Scenario ID | Failure Summary | Investigation Required (`Yes`/`No`) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`) | Action Path | `investigation-notes.md` Updated | Requirements Updated | Design Updated | Call Stack Regenerated | Review Re-Entry Round | Resolved |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-04-09 | `AV-011` | `Kimi tool continuation originally failed with 400 because \`kimi-k2.5\` defaults to thinking mode, which rejects \`tool_choice: 'required'\`, and our generic continuation path does not preserve Kimi \`reasoning_content\` for thinking-mode tool turns.` | No | `Local Fix` | `Disable thinking by default for \`kimi-k2.5\` tool workflows unless the caller explicitly overrides thinking.` | No | No | No | No | `N/A` | Yes |
| 2026-04-09 | `AV-012` | `DeepSeek live integration initially failed with 401 invalid-auth responses because the rerun copied the stale package-local key from the primary workspace over the updated worktree env file.` | No | `Local Fix` | `Run the suite against the updated worktree env file and stop recopying the stale package-local env file from the primary workspace.` | No | No | No | No | `N/A` | Yes |
| 2026-04-09 | `AV-010` | `Qwen live integration is blocked because DASHSCOPE_API_KEY is not present in autobyteus-ts/.env.test.` | No | `N/A` | `Credential provisioning required` | No | No | No | No | `N/A` | No |
| 2026-04-09 | `AV-013` | `MiniMax live integration is blocked because MINIMAX_API_KEY is not present in autobyteus-ts/.env.test, and the MiniMax integration asset has not been added yet because the credential gate was hit first.` | No | `N/A` | `Credential provisioning required` | No | No | No | No | `N/A` | No |

## Feasibility And Risk Record

- Any infeasible scenarios (`Yes`/`No`): `Yes`
- If `Yes`, concrete infeasibility reason per scenario: `Qwen and MiniMax are currently infeasible because the required keys are not present in the package test environment.`
- Environment constraints (secrets/tokens/access limits/dependencies): `Round six requires valid API credentials for OpenAI, DashScope/Qwen, Kimi, DeepSeek, and MiniMax in \`autobyteus-ts/.env.test\`. The current worktree environment supports OpenAI, Kimi, and DeepSeek, while DashScope/Qwen and MiniMax are still missing.`
- Additional provider-check constraints: `The worktree environment now also supports GLM and its live integration suite passes. Gemini is now authenticating successfully on Vertex with the refreshed key, but one multimodal image scenario still fails with provider-side \`429 RESOURCE_EXHAUSTED\`.`
- Platform/runtime specifics for lifecycle-sensitive scenarios (OS/device/runtime/version `from` -> `to`/package channel or update feed/signing/access requirements): `N/A`
- Compensating automated evidence: `Not needed`
- Residual risk notes: `Live provider catalog drift can still happen between curated refreshes for providers without machine-readable metadata, but the resolver/fallback split now makes that drift explicit and bounded.`
- Human-assisted execution steps required because of platform or OS constraints (`Yes`/`No`): `No`
- If `Yes`, exact steps and evidence capture: `N/A`
- User waiver for infeasible acceptance criteria recorded (`Yes`/`No`): `No`
- If `Yes`, waiver reference (date/user decision): `N/A`
- Temporary validation-only scaffolding cleaned up (`Yes`/`No`/`Partially`): `Yes`
- If retained, why it remains useful as durable coverage: `N/A`

## Stage 7 Gate Decision

- Latest authoritative round: `5`
- Latest authoritative result (`Pass`/`Fail`/`Blocked`): `Blocked`
- Stage 7 complete: `No`
- Durable executable validation that should live in the repository was implemented or updated: `Yes`
- All in-scope acceptance criteria mapped to scenarios: `Yes`
- All relevant spines mapped to scenarios: `Yes`
- All executable in-scope acceptance criteria status = `Passed`: `Yes`
- All executable relevant spines status = `Passed`: `Yes`
- Critical executable scenarios passed: `No`
- Any infeasible acceptance criteria: `Yes`
- Explicit user waiver recorded for each infeasible acceptance criterion (if any): `No`
- Temporary validation-only scaffolding cleaned up or intentionally retained with rationale: `Yes`
- Unresolved escalation items: `Yes`
- Ready to enter Stage 8 code review: `No`
- Notes:
  - Round one reran the resolver catalog tests, local-runtime discovery tests, GraphQL/store/UI projection tests, token-budget tests, and a TypeScript build.
  - Round two reran the Gemini metadata resolver/factory tests, the Gemini runtime-mapping unit test, the Gemini API-key-manager fixture test, skip-safe live Gemini integration suites, and the `autobyteus-ts` build.
  - Round three reran the factory metadata-resolution integration tests, the Ollama provider failure-mode unit tests, the local reload and Autobyteus provider regression suites, and the `autobyteus-ts` build.
  - Round four passed with live LM Studio evidence: `LLMFactory` discovery returned the loaded `qwen/qwen3.5-35b-a3b` model with normalized context metadata, the resulting `LMStudioLLM` completed a real prompt, and the LM Studio-backed single-agent flow completed end-to-end with the expected tool execution ordering.
  - Round five passed with live Ollama evidence: the metadata-aware factory path selected `qwen3.5:35b-a3b-coding-nvfp4`, the agent asserted normalized context metadata on the selected Ollama model, and the `write_file` single-agent flow completed end-to-end.
  - Round six remains blocked overall. `OpenAI`, `Kimi`, and `DeepSeek` pass. `Qwen` and `MiniMax` are still blocked because `DASHSCOPE_API_KEY` and `MINIMAX_API_KEY` are not present in the package test environment, and MiniMax still lacks the dedicated integration asset.
  - Supplemental live checks requested after the original round: `Gemini` now authenticates successfully on Vertex with the refreshed key and passes 7 of 8 tests; the remaining multimodal image scenario fails with provider-side `429 RESOURCE_EXHAUSTED`. `GLM` passes its full live integration suite.
