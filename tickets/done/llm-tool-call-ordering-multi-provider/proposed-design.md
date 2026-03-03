# Proposed Design Document

## Design Version

- Current Version: `v2`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Defined strict tool-call history sequencing, provider catalog updates, and GLM naming update scope. | 1 |
| v2 | User feedback | Incorporated provider strictness explanation (GPT tolerance vs strict OpenAI-compatible validation) and approved clean-cut file rename `zhipu-llm.ts` -> `glm-llm.ts`. | 2 |

## Artifact Basis

- Investigation Notes: `tickets/done/llm-tool-call-ordering-multi-provider/investigation-notes.md`
- Requirements: `tickets/done/llm-tool-call-ordering-multi-provider/requirements.md`
- Requirements Status: `Design-ready`

## Summary

This design fixes strict OpenAI-compatible tool-call sequencing by changing how tool-calling turns are persisted in working context:
- persist one grouped assistant `tool_calls` message per LLM tool-calling response,
- prevent extra assistant text/reasoning messages between tool_calls and tool results,
- preserve tool-result appends keyed by tool_call_id,
- and extend provider integration tests to validate continuation behavior.

In parallel, provider catalog and naming are updated:
- Kimi defaults include latest available model IDs from provider sources,
- GLM model entries are aligned to latest official naming,
- user-facing naming uses `GLM` instead of `ZHIPU`.

## Goals

- Remove strict-provider 400 errors caused by invalid tool-call message order.
- Keep OpenAI/GPT behavior stable.
- Add real provider integration coverage for DeepSeek/Kimi/GLM tool-call continuation.
- Align provider model catalog with current provider docs/endpoints.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: do not retain dual old/new sequence assembly paths.
- Gate rule: no compatibility wrapper that preserves invalid assistant/tool ordering.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| REQ-001 | Strict assistant tool_calls -> tool results ordering in persisted/send history | AC-001, AC-002 | Root cause proven and fixed ordering validated | UC-001, UC-002, UC-003 |
| REQ-002 | Group multi-tool calls per assistant tool-turn | AC-002 | One tool-turn emits one grouped assistant tool_calls message | UC-001, UC-002, UC-003 |
| REQ-003 | Avoid extra assistant content between tool_calls and tool results | AC-002 | No ordering-invalid assistant insertion for tool-turns | UC-001, UC-002, UC-003 |
| REQ-004 | DeepSeek real tool-call continuation integration | AC-003 | DeepSeek tool-call continuation passes | UC-001 |
| REQ-005 | Kimi real tool-call continuation integration + latest model updates | AC-004 | Kimi continuation passes and model list refreshed | UC-002 |
| REQ-006 | GLM real tool-call continuation integration + latest model updates | AC-005 | GLM continuation passes and model list refreshed | UC-003 |
| REQ-007 | User-facing GLM naming update | AC-007 | UI/provider labeling shows GLM | UC-005 |

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | LLM response streaming and tool-call extraction converge in `LLMUserMessageReadyEventHandler`; memory snapshot is canonical request history source. | `src/agent/handlers/llm-user-message-ready-event-handler.ts`, `src/agent/llm-request-assembler.ts` | Whether any provider intentionally depends on current invalid ordering side effect. |
| Current Naming Conventions | Provider internals use `ZHIPU` enum/class naming; UI thinking adapter uses `zhipu` key. | `src/llm/providers.ts`, `src/llm/api/zhipu-llm.ts`, `autobyteus-web/utils/llmThinkingConfigAdapter.ts` | Preferred depth of rename (internal enum vs user-facing label only). |
| Impacted Modules / Responsibilities | Tool-turn persistence in `MemoryManager`, message rendering in `OpenAIChatRenderer`, provider model registry in `LLMFactory`, provider tests under `tests/integration/llm/api/*`. | same as above | GLM credential validity in local `.env.test` currently blocks live verification. |
| Data / Persistence / External IO | Working context snapshot persistence governs next LLM request payload; external provider APIs enforce strict sequencing for some models. | `src/memory/memory-manager.ts`, `src/memory/working-context-snapshot.ts`, provider API probes | None |

## Current State (As-Is)

- Tool invocations are ingested one-by-one and persisted as separate assistant tool_call messages.
- Assistant response text/reasoning from tool-calling turn can be persisted as a later assistant message before tool results.
- This can produce provider-invalid order for strict OpenAI-compatible endpoints.

## Target State (To-Be)

- For each tool-calling LLM turn:
  - persist exactly one assistant message with grouped `tool_calls` array,
  - persist tool result messages for each tool_call_id,
  - do not persist extra assistant response content/reasoning between those messages.
- Provider model catalog reflects latest Kimi/GLM entries from official sources.
- User-facing naming uses GLM label.

## Shared Architecture Principles (Design + Review, Mandatory)

- Principle alignment statement: keep one ownership path for tool-turn history assembly.
- SoC cause statement: event handler orchestrates; memory manager owns persistence semantics.
- Layering result statement: handler -> memory layer -> renderer/provider layer remains one-way.
- Decoupling rule statement: no provider-specific sequencing hacks in generic event orchestration.

## Architecture Direction Decision (Mandatory)

- Chosen direction: `Keep` current layering, refine responsibilities inside existing modules.
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`): lowest blast radius and directly testable.
- Layering fitness assessment: `Yes`
- Decoupling assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Keep`

## Layering Emergence And Extraction Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists | No | Sequencing logic centralized in one handler path | Keep |
| Responsibility overload exists in one file/module | Yes | `LLMUserMessageReadyEventHandler` currently mixes streaming/tool intent/assistant persistence decisions | Keep but factor small helper for tool-turn completion decision |
| Proposed new layer owns concrete coordination policy | No | Not adding a new layer | Keep layer |
| Current layering can remain unchanged without SoC/decoupling degradation | Yes | Changes stay in existing boundaries | Keep |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts` | same | Group tool intents per turn and suppress ordering-invalid assistant append for tool-turns | runtime sequencing | core bug fix |
| C-002 | Modify | `autobyteus-ts/src/memory/memory-manager.ts` | same | Add grouped tool-intent ingestion helper and keep raw traces consistent | memory + request history | one assistant tool_calls record per tool-turn |
| C-003 | Modify/Rename | `autobyteus-ts/src/llm/llm-factory.ts`, `src/llm/api/{kimi-llm,zhipu-llm}.ts` | `src/llm/api/{kimi-llm,glm-llm}.ts` | Update latest model defaults/catalog entries and align GLM file naming | provider catalog | no dual naming path |
| C-004 | Modify | `autobyteus-web/utils/llmThinkingConfigAdapter.ts` (+ any UI provider label helpers) | same | Replace user-facing zhipu naming with glm naming | frontend labels | no dual label fallback |
| C-005 | Modify/Add tests | `autobyteus-ts/tests/integration/llm/api/{deepseek,kimi,zhipu}-llm.test.ts`, relevant handler unit tests | same | Real tool-call continuation coverage + ordering assertions | testing | no mocks for provider APIs |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Replacement Clean-Cut Design |
| --- | --- | --- | --- |
| Keep old per-invocation assistant tool_call persistence path behind flag | Might preserve historical behavior | Rejected | Single grouped tool-turn persistence path only |
| Keep ZHIPU + GLM dual user-facing naming | Could avoid migration friction | Rejected | Standardize user-facing label as GLM |

## File And Module Breakdown

| File/Module | Change Type | Layer / Boundary | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| `src/agent/handlers/llm-user-message-ready-event-handler.ts` | Modify | orchestration | turn-level tool + assistant persistence ordering | event handler | chunk stream -> memory events | memory manager, streaming handler |
| `src/memory/memory-manager.ts` | Modify | memory | persistence semantics for tool intents/results and snapshot order | `ingestToolIntent(s)` | tool invocations -> raw/snapshot entries | working-context snapshot |
| `src/llm/llm-factory.ts` | Modify | provider registry | model list/defaults | model registration | provider/model metadata | provider classes |
| `autobyteus-web/utils/llmThinkingConfigAdapter.ts` | Modify | frontend config adapter | provider key/label mapping | thinking adapter exports | schema->UI config | none |
| integration tests | Modify/Add | verification | real provider continuation tests | vitest suites | provider API behavior | `.env.test` keys |

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| User-facing provider label | ZHIPU | GLM | user familiarity | internal class names may be cleaned in same ticket if low risk |
| Thinking provider key type | `zhipu` | `glm` | align with label | frontend mapping only |
| Provider API file | `zhipu-llm.ts` | `glm-llm.ts` | naming clarity and consistency | clean rename, no legacy alias |

## Existing-Structure Bias Check (Mandatory)

| Candidate Area | Current-File-Layout Bias Risk | Architecture-First Alternative | Decision | Why |
| --- | --- | --- | --- | --- |
| Tool-turn sequencing fix | Medium | Introduce separate tool-turn persistence service | Keep current modules | Change is localized and does not justify new layer |

## Anti-Hack Check (Mandatory)

| Candidate Change | Shortcut/Hack Risk | Proper Structural Fix | Decision | Notes |
| --- | --- | --- | --- | --- |
| Provider-specific ignore for DeepSeek only | High | Generic ordering fix in shared handler/memory flow | Reject shortcut | Must fix all OpenAI-compatible providers |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `LLMUserMessageReadyEventHandler` | streaming + memory manager | agent runtime event flow | Medium | keep pure orchestration; move grouping decision into clear helper |
| `MemoryManager` | snapshot + store | request assembler | Low | add focused method, avoid new outward coupling |

## Allowed Dependency Direction (Mandatory)

- Allowed direction rules: `Agent Handler -> Memory Manager -> Snapshot/Store`, `LLM Factory -> Provider Classes`.
- Temporary boundary violations and cleanup deadline: none planned.

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| User-facing `zhipu` naming in web thinking adapter | rename provider key mapping to glm | no dual display path retained | frontend unit/functional checks |
| Provider API module file naming | rename `zhipu-llm.ts` -> `glm-llm.ts` and update all imports/tests | no compatibility wrapper | TypeScript compile + integration tests |

## Error Handling And Edge Cases

- Tool call emitted without explicit call_id: keep stable generated ID and match same ID for tool result in snapshot.
- Multi-tool turn: ensure grouped assistant tool_calls + per-tool results.
- Provider unauthorized (GLM): tests should surface explicit auth failure and block AC completion.

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Requirement | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- | --- |
| UC-001 | REQ-001/2/3/4 | DeepSeek tool-call continuation | Yes | N/A | Yes | UC-001 |
| UC-002 | REQ-001/2/3/5 | Kimi tool-call continuation | Yes | N/A | Yes | UC-002 |
| UC-003 | REQ-001/2/3/6 | GLM tool-call continuation | Yes | N/A | Yes | UC-003 |
| UC-004 | REQ-001/5/6 | Agent/Team flow with provider tool call | Yes | N/A | Yes | UC-004 |
| UC-005 | REQ-007 | User-facing GLM naming | Yes | N/A | N/A | UC-005 |

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/API/E2E) | Status |
| --- | --- | --- | --- |
| C-001 | T-001/T-002 | Unit + integration | Planned |
| C-002 | T-001 | Unit + integration | Planned |
| C-003 | T-003 | Integration | Planned |
| C-004 | T-004 | Unit/web checks | Planned |
| C-005 | T-005/T-006 | Integration + flow | Planned |

## Open Questions

- Confirm whether GLM key in `.env.test` needs rotation for Stage 7 closure.
