# Code Review Report — autobyteus-515 (`native-tool-search-515`)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-001, Approved)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (cited sections only, through the design spec)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001…SR-004)
- Design Spec Reviewed As Context: `design-spec.md` (SR-004, Ready)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001…FU-004); evidence logs IMP-01…IMP-15 as cited in the handoff
- Relevant Solution Revision IDs: SR-001, SR-003, SR-004
- Design Review Report Reviewed As Context: `design-review-report.md` (round 2, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation handoff IR-001 from `/implementation_engineer`, 2026-11-17
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none. The diff stays in the files the design names (3 new files under `agent/tool-search/`, existing loop/context/memory owners extended, one server argument) plus one formatter rule (K-1). It changes the request contract sent to every native provider and the persisted raw-trace shape, as classified.

## Review Scope

- Changed implementation and behavior reviewed: source diff `4cbf9e7881..49867e8dc4` under `autobyteus-ts/src` and `autobyteus-server-ts/src`; the server test changes (factory unit test, two E2E files, two live files, K-2); new autobyteus-ts tests (tool-search unit tests, handler conversion, DS-003 memory records, integration flow, gated live suite) at the level needed to judge their assertions; `GLOSSARY.md` and `autobyteus-ts/docs/tool_schema_and_configuration.md`.
- Files / areas reviewed: `agent/tool-search/{agent-tool-search,call-tool,search-tools-tool}.ts`; `agent/context/{agent-config,agent-context,agent-runtime-state}.ts`; `agent/factory/agent-factory.ts`; `agent/loop/{llm-phase,llm-response-stream-collector}.ts`, removed `llm-phase-tools.ts`; `agent/streaming/handlers/llm-streaming-response-handler.ts`; `agent/tool-invocation.ts`; `memory/{raw-trace-ingestion,memory-manager,memory-manager-tool-protocol-safety,working-context-tool-protocol-repairer,tool-trace-lifecycle-index}.ts`, `memory/models/raw-trace-item.ts`; `tools/usage/formatters/openai-tool-schema-normalizer.ts`, `tools/usage/providers/tool-schema-provider.ts`; server `autobyteus-agent-run-backend-factory.ts`, read for context `autobyteus-runtime-tool-exposure.ts`, `shared/runtime-agent-tool-exposure.ts`.
- Explicit exclusions: evidence scripts (`evidence/*.mjs`, `*.py`) and JSON outputs (evaluation tooling, not product source); recorded checks were not rerun, because the last commit `03da73d550` touches only `tickets/` and IMP-02 ran on `49867e8dc4`, the final source.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: four base tools listed, every other tool searchable through `search_tools`, called through `call_tool`; a found tool runs exactly as a listed one; `tools` and the system prompt stay byte-stable for a run; one provider-neutral path; old-against-new evaluation.
- Design-spec behavior map verified against the implementation: Yes (table below).
- Design review report and round confirmed: round 2, `ARCH-REV-002`, Pass.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: none. K-1 is a formatter correction that REQ-005 needs (see C-02), not new behavior.
- Remaining material ambiguity, if any: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `AgentFactory.createRuntimeWithId` → `new AgentToolSearch(config.listedToolNames, Object.keys(toolInstances))` (`agent-factory.ts:127`) → `LlmPhase` `context.toolSearch.requestToolSchemas(Object.keys(toolInstances), provider)` (`llm-phase.ts:145-150`) → listed in `listedToolNames` order filtered by presence, then `formatDefinitions(runtimeToolDefinitions)` (`agent-tool-search.ts:58-65`). The runtime definitions are built once in the constructor, so the bytes are fixed for the run. Server passes `AUTOBYTEUS_DEFAULT_TOOL_NAMES` (`autobyteus-agent-run-backend-factory.ts:486`). | — |
| BEH-002 | Confirmed | `LlmStreamingResponseHandler.buildInvocation` → `toCalledToolInvocation` only when `toolSearchEnabled` (`llm-streaming-response-handler.ts:126`); exact `{name, arguments}` shape checked by `callArgumentProblems` (`call-tool.ts:38-47`); same id, `calledThrough: 'call_tool'`; END metadata names the real tool (`:336`). `ToolPhase` unchanged; `AgentContext.getTool` falls back to the agent's own runtime tools (`agent-context.ts:131`). A malformed call reaches `CallTool._execute`, which answers with how to call. | — |
| BEH-002 / DS-003 | Confirmed | (a) `normalizeNativeToolCallBatch` writes `toolCall = toModelToolCall(...)` and `calledThrough` (`raw-trace-ingestion.ts:70-79`); the same specs feed `nativeTurnMetadata` (`memory-manager.ts:306`) and the working-context call (`:288`). (b) `ingestToolResults` names the working-context result `toModelToolName(canonical, group.call.calledThrough)` (`memory-manager.ts:351`); `finalizePendingToolCallsForTurn` builds events from the raw call (`:395-402`), so the same rule applies. After a restart, the lifecycle state is rebuilt from `RawTraceItem.fromDict`, which reads `called_through`. (c) The repairer names the inserted result by the working-context call and carries `rawToolName`/`rawToolArgs` from `ToolCallFact` (`working-context-tool-protocol-repairer.ts:185-208`); protocol safety writes the raw recovery trace from them (`memory-manager-tool-protocol-safety.ts:77-80`). | — |
| BEH-003 | Confirmed | `Agent.replaceTools` unchanged; `search` reads the current `toolInstances` (`search-tools-tool.ts:69-71`); the description is fixed at construction. Integration case AC-005 asserts identical requests across add and remove. | — |
| BEH-005 | Confirmed | No compaction code changed; the summary request uses the same `call.toolSchemas`. Integration case AC-007. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001 | System | Native agent loop | Make an LLM request | Every turn's LLM call | Normal | DS-001 as traced above | Listed + `search_tools` + `call_tool` only | requirements SCN-001, RF-002 | Supported Normal Scenario | Use |
| SCN-002 | BEH-002, DS-003 | System | Native agent | Use a tool that is not listed | Model calls `search_tools`, then `call_tool` | Normal (+ named alternates: nothing found, unknown name, malformed, denied approval) | DS-004 → DS-002 → ToolPhase → DS-003 | Real tool runs; history real, working context model form | requirements SCN-002, RF-004 | Supported Normal Scenario | Use |
| SCN-003 | BEH-003 | User | User / package update | Change a running agent's tools | Agent definition edit (324) | Normal | `replaceTools` → next request | `tools` unchanged; added tool searchable; removed tool refused | requirements SCN-003 | Supported Normal Scenario | Use |
| SCN-004 | BEH-005 | System | Native compaction | Continue a long run | Compaction threshold | Normal | Compaction → search again → call | Works after compaction | requirements SCN-004 | Supported Normal Scenario | Use |
| SCN-R | BEH-002, DS-003 (c) | System | Server restore | Restore a run with a found tool's call pending approval or running | Run restore / bootstrap repair | Explicit Edge (design example) | Snapshot restore → repairer → protocol safety | Working context `call_tool` pair; raw recovery trace real | design spec Concrete Examples row 4 | Supported Explicit Edge Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | An agent that starts with no searchable tool gets no `search_tools`/`call_tool`; a tool added later through 324 would then be neither sent nor searchable | SCN-003 | 324 adds a non-base tool to an agent that had only the base tools | Not reachable on the only opt-in caller: the server always adds `search_memory` (`PLATFORM_GIVEN_TOOL_NAMES`, `runtime-agent-tool-exposure.ts:20`, merged at `:80-84`), and 324 rebuilds from the same exposure, so every server native run starts with a searchable tool. Library callers default to `listedToolNames: null` | code read | Reject (Not Reachable) | — | The design states the same start-time rule (DS-001 narrative). No action |
| C-02 | K-1: the OpenAI normalizer now closes only objects that declare `properties` | SCN-002 on OpenAI-format providers (REQ-005) | Model fills `call_tool.arguments` | Before: `{type: object}` closed with `additionalProperties: false` means "only `{}`", wrong for `call_tool` and for any property-less nested object. After: open. Tools with no arguments still emit `properties: {}` (`openai-json-schema-formatter.ts:14`) and stay closed. Strict mode is off everywhere (`openai-tool-schema-normalizer.ts:62`, `openai-responses-llm.ts:162`), so an open object is accepted | code read; formatter unit test; IMP-03 live DeepSeek | Reject as a defect; accepted as a required, documented decision | — | It is needed for REQ-005, and the meaning it gives property-less MCP nested objects (free-form) is the correct JSON Schema meaning, where before they allowed only `{}`. Their OpenAI-format bytes change once. Doc §4.5 updated |
| C-03 | Handler option `toolSearchEnabled` is optional, defaults to `false` | Principle 16 (required collaborator not optional for tests) | — | It is a flag, not a collaborator, and `false` has its own meaning ("this request carried no tool search": no conversion). The only production caller, the collector, declares it required and passes it (`llm-response-stream-collector.ts:35-40`) | grep: 1 production caller, 13 test files | Reject | — | The reason recorded in the handoff holds |
| C-04 | Repairer fallback when no raw call fact exists: the raw recovery trace would take the working-context name/args (`call_tool` form) | SCN-R | A working-context call without a raw `tool_call` trace | Working-context calls are written only at registration, in the same step as their raw `tool_call` traces (`memory-manager.ts:278-296`), so the fact exists on supported paths. The fallback chain existed before this change | code read | Reject (Not Reachable) | — | — |
| C-05 | FU-003: `run_bash`/terminal cases fail only in the full parallel `autobyteus-ts` run | — | Full suite under load 85–116 | The tests call `runBash` directly; the diff touches no terminal or `run_bash` code; the five files pass alone (IMP-07); `49867e8dc4` changed only this ticket's own tests | IMP-04, IMP-06, IMP-07; diff | Reject as a source finding; FU-003 stands | — | Not run by anyone: the full suite on the base branch under the same conditions. That run would confirm the failures were there before; left to API/E2E (Residual Risks) |
| C-06 | `call_tool` naming `call_tool` or `search_tools` itself | SCN-002 | — | The model calls through call_tool for a tool it can call directly; `search_tools` through `call_tool` works; `call_tool` through `call_tool` gets a confusing but harmless refusal | code read | Reject (Unsupported/Contrived) | — | — |
| C-07 | A searchable instance without a registry definition is named in `search_tools`' description but never returned | SCN-002 | — | Same registry dependence as before: `buildSchema` already skipped unregistered names (`tool-schema-provider.ts:26-31`), so such a tool was never sent before either | code read | Reject (unchanged behavior) | — | — |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | Feature, No Design Issue Found; every change landed in the owner the design names | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None are behavior-defining; probe scenario reused in the gated live suite | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001…DS-004 map one-to-one onto the code (Basis table) | — |
| Ownership boundary preservation and clarity | Pass | `AgentToolSearch` owns the listed set, the frozen description, the runtime tools and matching; `LlmPhase` never filters; `ToolPhase` unaware; memory gets the model form only from the call-tool contract | — |
| Off-spine concern clarity | Pass | Formatting stays in `ToolSchemaProvider.formatDefinitions`; `called_through` in `RawTraceItem` | — |
| Existing capability/subsystem reuse | Pass | 324 notice reused unchanged; one formatter choice; `ToolPhase` reused for validation, approval and external results | — |
| Reusable owned structures | Pass | `call-tool.ts` owns the name, schema and both conversions; memory imports `toModelToolCall`/`toModelToolName` and spells no form | — |
| Shared-structure/data-model tightness | Pass | `ToolInvocation.calledThrough` is the only new invocation field; the model arguments are derived. The repair record names its two names explicitly (`toolName` vs `rawToolName`/`rawToolArgs`); the unused `CompletedToolResultFact.toolName` was removed | — |
| Repeated coordination ownership | Pass | One conversion point (handler), one naming rule in memory | — |
| Empty indirection check | Pass | `AgentToolSearch` holds state and policy; `SearchToolsTool` takes `Pick<AgentToolSearch, 'search'>` (narrowed owner type, no new port) | — |
| Scope-appropriate SoC and file responsibility | Pass | Three new files, one concern each | — |
| Ownership-driven dependency check | Pass | `agent/tool-search` → `tools/`, `agent/tool-invocation`; loop/streaming/context → tool-search; `memory/` → only the pure contract functions. The `SearchToolsTool` ↔ `AgentToolSearch` back-reference is construction-time, type-only on one side | — |
| Visible dependencies check | Pass | `AgentToolSearch` constructed by the factory and held in runtime state; `AgentContext.toolSearch` throws when missing (no `?.` fallback); the only lookup, `defaultToolRegistry`, is the existing one `ToolSchemaProvider` already used | — |
| Authoritative Boundary Rule | Pass | `LlmPhase` and `AgentContext` call `AgentToolSearch` only; no caller reaches its runtime-tool map or matcher | — |
| File placement | Pass | `agent/tool-search/` as designed | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface boundary clarity | Pass | `requestToolSchemas(toolNames, provider)`, `search(query, toolNames)`, `getRuntimeTool(name)`, `enabled`; explicit shapes | — |
| Naming quality / one vocabulary | Pass | Glossary adds Listed tool, Searchable tool, Tool search; `calledThrough`/`called_through` consistent; external runtimes' names noted as distinct | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity control | Pass | First round; changes are additive and local | — |
| Dead code removed in touched files | Pass | `llm-phase-tools.ts` removed (its last caller replaced; the `config.tools` fallback for an unprepared state was unreachable because the factory always sets `toolInstances`); `CompletedToolResultFact.toolName` and the unused import removed | — |
| Test scenarios and assertions requirement-aligned | Pass | Integration flow enters through `AgentFactory`/`postUserMessage` with a scripted LLM and asserts the request bytes, approval names, END metadata, sent call/result forms and raw traces; DS-003 tests assert both records on every path; mutation check IMP-15 shows they catch wrong naming | — |
| Test fixtures/helpers reusable, structure coherent | Pass | `tests/helpers/tool-search-test-tools.ts` shared; hand-built states now set a tool search | — |
| No stale/duplicate/compatibility-only tests | Pass | K-2 live cases rewritten to the new behavior, not kept for the old | — |
| API/E2E readiness | Pass | Gated live suite and evaluation script exist with commands in the handoff | — |

## Source File Size And Structure Audit

| Source File | Effective Lines Before | After | `>500` Check | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/memory-manager.ts` | 495 | 498 | Pass (closest to the limit; next growth must go elsewhere) | +3 | Pass | Pass | — | — |
| `autobyteus-ts/src/agent/streaming/handlers/llm-streaming-response-handler.ts` | 401 | 409 | Pass | +8 | Pass | Pass | — | — |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | 386 | 390 | Pass | +4 | Pass | Pass | — | — |
| `autobyteus-ts/src/memory/working-context-tool-protocol-repairer.ts` | 193 | 204 | Pass | +11 | Pass | Pass | — | — |
| `autobyteus-ts/src/agent/tool-search/agent-tool-search.ts` | new | 121 | Pass | new | Pass | Pass | — | — |
| `autobyteus-ts/src/agent/tool-search/call-tool.ts` | new | 114 | Pass | new | Pass | Pass | — | — |
| `autobyteus-ts/src/agent/tool-search/search-tools-tool.ts` | new | < 60 | Pass | new | Pass | Pass | — | — |
| Other touched source files | small edits | — | Pass | < 15 each | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | `listedToolNames: null` is the library's own mode for callers that don't opt in, not an old path |
| No legacy old-behavior retention | Pass | Restored runs take the new split at their next request (accepted one cache rebuild) |
| Dead code removed in the touched files and modules | Pass | See above |
| Approved persisted-data transition decision followed | Pass | `Directly Usable — No Migration`: `fromDict` reads `called_through` when it is a string, else `null` ("called directly"); test reads a trace without the key |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match the reviewed design | Pass | No migration |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, done in this change
- Why: new domain words and a changed request-tool contract
- Files or areas affected: `GLOSSARY.md` (three terms), `autobyteus-ts/docs/tool_schema_and_configuration.md` §4.4, §4.5 (K-1), new §4.8

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

None new or reclassified. The design's escalation trigger (another writer of working-context tool results or raw `tool_result` traces) was checked by the implementation engineer. I checked it against the code: the result writers are registration, `ingestToolResults` (live and `finalizePendingToolCallsForTurn`), and the repairer with protocol safety. `new ToolInvocation(` appears only in the handler and `call-tool.ts`, so no restore path rebuilds an invocation without `calledThrough`.

## Review Scorecard (Mandatory)

- Overall score: 9.5 / 10 (simple average, for trend only)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.6 | DS-001…DS-004 readable in code in call order; one conversion point | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | `AgentToolSearch`, the call-tool contract and `MemoryManager` each own exactly their part; `ToolPhase` untouched | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Small explicit methods; `toModelToolName` added inside the contract so memory never spells the form | `call_tool`'s exact-shape rule is strict by design (R-B), so near-miss calls are answered rather than run | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Three focused files; memory edits confined to the DS-003 files | `memory-manager.ts` at 498 effective lines | Put future growth there into an owned helper |
| 5 | Shared-Structure / Data-Model Tightness | 9.5 | One new invocation field; the repair record names its two names explicitly; unused field removed | — | — |
| 6 | Naming Quality and Local Readability | 9.5 | Names match the glossary; comments state the DS-003 rule at each writer | — | — |
| 7 | API/E2E Readiness | 9.3 | Gated live suite, evaluation script, server E2E updated; commands recorded | K-2 live cases and AC-004/AC-008/AC-009 not yet run; FU-003 not compared to the base | API/E2E runs them (Residual Risks) |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | All three memory paths asserted on both records, with a mutation check; provider renderers asserted; integration covers approval, add/remove, compaction | Only DeepSeek has been checked live so far | AC-004 live run |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | No compat paths; additive optional field with a correct absent meaning | — | — |
| 10 | Cleanup Completeness | 9.5 | `llm-phase-tools.ts`, unused fact field and import removed; docs and glossary updated | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None. The existing FU-003 and FU-004 entries are well-founded as written.

## Classification

N/A (Pass).

## Recommended Recipient

- API/E2E (primary pass rule), then an informational note to implementation.

## Residual Risks

- K-2: CCR-E2E-002 and APC-E2E-004 were rewritten to the new behavior (tools unchanged, thinking kept, cache read) but have not been run (Anthropic Opus credits). Since the native server no longer changes `tools` mid-run, these live cases no longer exercise the "tools changed → prefix-bound thinking removed" mechanism. That mechanism stays reachable: a run restored after the update changes its tools once, and so does a library caller with `listedToolNames: null`. APC-E2E-008 still keeps the strict-harness control.
- FU-003: before treating it as pre-existing, compare the full `pnpm -C autobyteus-ts test` on the base branch and on this branch under the same conditions. The load average was still 71–97 at review time.
- Still to run, per TESTING "The tools a run gets": whole server `test:integration` and `test:e2e`; AC-004 on every reachable provider (Gemini and Anthropic formats of the open `arguments` object are live-checked only through RF-004's probe); AC-008/AC-009 old against new.
- K-1 changes the OpenAI-format bytes of MCP tools with property-less nested objects once. Correct, but noted for anyone comparing request snapshots.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5 / 10; every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: API/E2E
- Notes: K-1 accepted as a required, documented decision (C-02). K-2 rewrites match the new behavior and need their gated run. The two shape choices in the handoff (handler flag default, `toModelToolName`) hold (C-03).
