# Design Review Report — autobyteus-515 (`native-tool-search-515`)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/native-tool-search-515/tickets/in-progress/native-tool-search-515/requirements-doc.md` (SR-001, Approved)
- Upstream Investigation Notes: `.../native-tool-search-515/investigation-notes.md`
- Upstream Solution Revision Record: `.../native-tool-search-515/solution-revision-record.md` (SR-001…SR-003)
- Reviewed Design Spec: `.../native-tool-search-515/design-spec.md` (SR-004: DS-003 revised; design basis SR-002, founder's agreement SR-003)
- Supplemental Task Artifacts Reviewed: `evidence/probe-search-then-call.mjs` + output, `evidence/measure-request-tokens.mjs` + output (as listed; scripts read for scope only), `follow-ups.md` (FU-001, FU-002)
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003, SR-004
- Architecture Review Revision Record: `.../native-tool-search-515/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: SR-004 revision of DS-003 for AR-001 (and R-A/R-B/R-C adopted), from `/solution_designer`, 2026-11-17; focused re-review
- Prior Review Round Reviewed: round 1 (`ARCH-REV-001`, Fail, AR-001)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/native-tool-search-515`, base `origin/personal` `4cbf9e7881` (no source change). Files opened: `llm-phase.ts:115-185`, `llm-phase-tools.ts`, `tool-schema-provider.ts`, `llm-streaming-response-handler.ts` (whole), `llm-response-stream-collector.ts`, `tool-invocation.ts`, `tool-phase.ts:65-225`, `agent.ts:59-85`, `agent-context.ts:110-125`, `raw-trace-ingestion.ts`, `memory-manager.ts:260-400`, `provider-native-history.ts`, `anthropic-native-history-policy.ts`, `anthropic-native-assistant-turn.ts:31,54`, `working-context-tool-protocol-repairer.ts`, `memory-manager-tool-protocol-safety.ts`, `working-context-snapshot-bootstrapper.ts`, `tool-interaction-builder.ts:20-45`, `raw-trace-item.ts:60-130`; server `runtime-agent-tool-exposure.ts:17-30`, `autobyteus-agent-run-backend-factory.ts:440-480`, `file-change-event-processor.ts:195-320`, `raw-trace-to-historical-replay-events.ts` (consumer only); web `segmentHandler.ts:383-400`. Round 2 additionally: `memory-manager.ts:127` (lifecycle state loaded from the raw corpus), `models/tool-interaction.ts:11,24,36` (interactions carry `arguments`, so the raw call fact can supply real args to the repair).

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: one new module plus edits inside existing owners (Medium); changes the request contract to every native provider and native memory's call records (one persisted optional raw-trace field; working context replayed to providers), on which restore, compaction and tool-protocol repair depend (High).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none; the classification matches the code read.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: four base tools listed, every other tool searchable via `search_tools` and called via `call_tool`; a found tool runs as a listed one (validation, approval, events, card, result name the real tool); `tools` and system prompt byte-stable for a run; one provider-neutral path; measured evaluation.
- Relevant existing behavior and evidence confirmed: all definitions sent every call (`llm-phase.ts:143-147`); `ToolPhase` resolves instances by name after approval (`tool-phase.ts:107-131`); invocations built at stream end and END carries `tool_name`/`arguments` (`llm-streaming-response-handler.ts:319-335`); web renames the card at END (`segmentHandler.ts:396-398`); one registration feeds raw trace and working-context call (`raw-trace-ingestion.ts:43-90`, `memory-manager.ts:263-296`); result name taken from the raw call and mismatches rejected (`memory-manager.ts:340-355`); `replaceTools` keeps same-name instances (`agent.ts:65-85`); `search_memory` platform-given to every run (`runtime-agent-tool-exposure.ts:17-20`).
- Scope guardrail confirmed: In-scope UC-001…UC-005; Out of Scope (external runtimes, provider-native search, per-agent listed setting, description shortening, 380, 460); Preserved BEH-002/004/005 and the 324 notice; Review Authority section present.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (AR-001 → REQ-004/AC-003, REQ-007/AC-007, BEH-002, BEH-005).
- Remaining material ambiguity: none in the requirements.
- Statements about existing code the design relies on, opened at their cited lines: all hold. Round 1's false claim (a call-rebuild path from raw traces) is removed from the authoritative sections; the revised Derived-consumers list and DS-003 cite real paths (`memory-manager.ts:127`, `:340-399`; `working-context-tool-protocol-repairer.ts:178`; `memory-manager-tool-protocol-safety.ts:63-83`; `tool-interaction-builder.ts:28-35`; `anthropic-native-assistant-turn.ts:54`), each verified.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | — (listed-tool order fixed to `listedToolNames`, R-C adopted) |
| BEH-002 | Contract | Pass | Pass | Pass | Confirmed | — (AR-001 resolved) |
| BEH-003 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | System | Pass (untouched) | Pass | N/A | Confirmed | — |
| BEH-005 | System | Pass | Pass | Pass | Confirmed | — (AR-001 resolved) |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/probe-search-then-call.mjs` + 2026-11-17 output | Pass | Pass | Pass | Pass | Pass (Evidence) | — |
| `evidence/measure-request-tokens.mjs` + DeepSeek output | Pass | Pass | Pass | Pass | Pass (Evidence) | — |
| `evidence/dump-agent-tool-schemas.mjs`, `tool_usage_census.py` | Pass | Pass (investigation inventory) | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature; triggers listed | — |
| Root-cause classification is explicit and evidence-backed | Pass | `No Design Issue Found`; loop, memory and exposure owners absorb it (confirmed in code) | — |
| Refactor decision explicit | Pass | No refactor | — |
| Refactor decision supported | Pass | New concern gets one new owner; others extended | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade Vs Governing Owner Clear? | Naming Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Request tool set | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Found tool's call → real invocation | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Memory's two call records | Pass | Pass — one rule (raw = real, working context = model form) and the three real paths (a) registration, (b) `ingestToolResults` incl. finalize, (c) repairer + protocol safety | N/A | Pass | Pass — the repair record carries both names; each record's writer takes its own | Pass | Pass |
| DS-004 | Search | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear? | Internals Stay Internal? | Bypass Risk Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentToolSearch` | Pass | Pass | Pass | Pass | `LlmPhase` must not filter itself (stated) |
| call-tool contract (`call-tool.ts`) | Pass | Pass | Pass | Pass | Owns both directions (`toCalledToolInvocation`, `toModelToolCall`); R-A adopted |
| `MemoryManager` | Pass | Pass | Pass | Pass | Only owner of the model form |
| `ToolPhase` | Pass | Pass | Pass | Pass | Unaware of tool search; receives real invocations |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Clear? | Forbidden Shortcuts Explicit? | Direction Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent/tool-search` | Pass | Pass | Pass | Pass | Depends on `tools/` and `agent/tool-invocation` only |
| `memory/` → call-tool contract | Pass | Pass | Pass | Pass | Memory already imports `agent/` types (`raw-trace-ingestion.ts:4-5`) |
| Server backend factory → `AgentConfig.listedToolNames` | Pass | Pass | Pass | Pass | One argument |

Composition root / hidden dependency (Principle 16): `Pass` — `AgentToolSearch` created by the agent factory and held in runtime state; `toolSearchEnabled` a constructor option; `ToolSchemaProvider`'s existing registry lookup unchanged.

## Interface Boundary Verdict

| Interface | Subject Clear? | Responsibility Singular? | Identity Shape Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `AgentConfig.listedToolNames` | Pass | Pass | Pass | Low | Pass |
| `AgentToolSearch.requestToolSchemas(toolNames, provider)` | Pass | Pass | Pass | Low | Pass |
| `AgentToolSearch.search(query, toolNames)` | Pass | Pass | Pass | Low | Pass |
| `search_tools({query})`, `call_tool({name, arguments})` | Pass | Pass | Pass | Low | Pass |
| `toCalledToolInvocation(invocation)` | Pass | Pass | Pass | Low | Pass |
| `ToolInvocation.calledThrough` / raw `called_through` | Pass | Pass | Pass | Low | Pass |

Empty indirection check: `Pass` — `AgentToolSearch` owns state and policy; the call-tool contract owns a translation; no forwarding wrapper.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Checked? | Decision Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Added-tool notice | Pass | Pass (reuse 324) | N/A | Pass | Notice text is runtime-neutral |
| Definition formatting | Pass | Pass (extend `ToolSchemaProvider`) | N/A | Pass | — |
| Validation/approval/external result | Pass | Pass (reuse `ToolPhase`) | N/A | Pass | Conversion before `ToolPhase` is required by external results keyed on the name (`tool-phase.ts:136-169`) |
| Request tool set + search | Pass | Pass | Pass | Pass | No existing owner |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem | Allocation Clear? | Decision Sound? | Supports Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/tool-search/` | Pass | Pass | Pass | Pass | — |
| `agent/loop`, `streaming`, `context`, `factory` | Pass | Pass | Pass | Pass | — |
| `memory/` | Pass | Pass | Pass | Pass | Memory files itemized per DS-003 path |
| Server native backend | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Evaluated? | Shared File Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `call_tool` name, schema, both conversion directions | Pass | Pass | Pass | Pass | Memory never spells out `{name, arguments}` (R-A adopted) |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning Per Field? | Redundant Attributes Removed? | Overlap Controlled? | Core vs Variant Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ToolInvocation.calledThrough` / raw `called_through` | Pass | Pass | Pass | N/A | Pass | Lossless: conversion accepts exactly `{name, arguments}` (R-B adopted) |

Derived consumers of a changed structure listed with a decision for each: `Pass` — run-history replay, memory search / Work Journal, lifecycle state (changed reader), repairer + protocol safety (changed), compaction output validator, snapshot serializer / restore, each with its decision.

Vocabulary (Principle 15): `Pass` — "listed tool", "searchable tool", "tool search" defined and added to `GLOSSARY.md`; external runtimes' names noted.

## File Responsibility Mapping Verdict

| File | Singular? | Matches Owner? | Re-tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent/tool-search/agent-tool-search.ts` | Pass | Pass | N/A | Pass | — |
| `agent/tool-search/search-tools-tool.ts` | Pass | Pass | N/A | Pass | — |
| `agent/tool-search/call-tool.ts` | Pass | Pass | N/A | Pass | — |
| Loop / streaming / context / factory edits | Pass | Pass | N/A | Pass | — |
| Memory edits: `raw-trace-item.ts`, `raw-trace-ingestion.ts`, `memory-manager.ts`, `working-context-tool-protocol-repairer.ts`, `memory-manager-tool-protocol-safety.ts` | Pass | Pass | N/A | Pass | One row per file, each tied to DS-003 (a)/(b)/(c) |
| `tool-schema-provider.ts`, server factory, docs | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path | Placement Clear? | Folder Matches Boundary? | Mixed-Layer / Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/tool-search/` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Inline schema building in `LlmPhase.beginCall`; `resolveTurnToolNames` / `llm-phase-tools.ts` if no other caller | Pass | Pass | Pass | Pass | Conditional removal evidence-based (Principle 7) |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility / Dual Path Exists? | Clean-Cut Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| `listedToolNames: null` mode | No (library mode for non-opting callers, not an old path) | Pass | Pass | — |
| Restored runs | No | Pass | Pass | Take the new split at next request; one cache rebuild accepted (requirements Data Continuity) |

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence Sufficient? | Proportionate? | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Raw `tool_call` traces gain optional `called_through` | Directly Usable — No Migration | Pass (`RawTraceItem.fromDict` reads named fields, absent → null; absent means "called directly", true for all existing traces) | Pass | N/A | Pass | — |
| `working_context_snapshot.json` | Directly Usable — No Migration | Pass (serializer stores any tool name; restore requires a snapshot, `working-context-snapshot-bootstrapper.ts:33-37`) | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic? | Temporary Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–6 | Pass | Pass | Pass | Pass |
| Step 3 (memory) | Pass — tests assert both records on live, finalize, restore-repair, interrupted-turn and Anthropic-assertion paths | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Example Needed? | Present And Clear? | Bad Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| A found tool's call end to end | Yes | Pass | Pass | Pass | — |
| Request tools for the PM | Yes | Pass | Pass | Pass | — |
| Search result | Yes | Pass | Pass | Pass | — |
| Interrupted / restored converted call (raw vs working-context names) | Yes | Pass | Pass | Pass | Restart and interrupted-turn examples added |

## Material Premise Validation (Only When Needed)

### `P-001` — A native run starts with no searchable tool and later gets one (324), leaving no `search_tools`/`call_tool` to reach it

- Related approved requirement or established contract: REQ-002 (no searchable tool → no search tools), REQ-006
- Relevant behavior ID(s): BEH-001, BEH-003
- Initiating basis kind: `System`
- Independent trigger: a native run created by the server
- Support evidence: the server gives `search_memory` to every run on every runtime (`runtime-agent-tool-exposure.ts:17-20`, `PLATFORM_GIVEN_TOOL_NAMES`), and it is not a base tool, so every server-created native run has at least one searchable tool at start
- Forward path: `AutoByteusAgentRunBackendFactory` → exposure (base + definition + automatic + platform-given) → `AgentConfig` (the only caller setting `listedToolNames`)
- Lifecycle preconditions and consequence: the zero-searchable start state is not produced
- Reachability: `Not Reachable`
- Review consequence: no finding; no machinery required.

### `P-002` — The model's `call_tool` arguments carry keys besides `name` and `arguments`, so the working-context call derived as `{name, arguments}` differs from the provider-native `tool_use.input`

- Related approved requirement or established contract: REQ-004, REQ-005 (Anthropic is a native provider)
- Relevant behavior ID(s): BEH-002
- Initiating basis kind: `System` (a model response on the native Anthropic path)
- Independent trigger: a model emitting a `call_tool` call
- Support evidence: none that models do this; the probe's 21/21 calls are reported correct; `assertAnthropicTurnMatchesToolCalls` compares name and deep-equal input (`anthropic-native-assistant-turn.ts:54`, called from `memory-manager.ts:304-305`), so a non-exact derivation would reject the batch
- Forward path: Anthropic stream → handler converts → `ingestAssistantToolResponse` → `nativeTurnMetadata` assertion
- Reachability: `Unclear`
- Review consequence: non-blocking recommendation R-B, adopted in SR-004 (DS-002: exact shape only). No finding.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` — AR-001 is resolved in SR-004 and verified against the code; no finding remains. The design is ready for implementation.

## Findings

None open. AR-001 (round 1) is `Resolved` in SR-004; see `architecture-review-revision-record.md` ARCH-REV-002 for the verification.

## Classification

N/A — Pass.

## Recommended Recipient

`/implementation_engineer` (primary); `/solution_designer` informational

## Residual Risks

- Stale wording left from SR-002 in non-authoritative spots of `design-spec.md` (not a finding; DS-003, the file map and step 3 are authoritative and correct): the BEH-005 row of the behavior map ("memory rebuilds the model's call form"), the Architecture Investigation Evidence row "Remaining Uncertainty: Rebuild paths from raw traces", and the off-spine "Raw trace field" row ("rebuilds recover the model's form"). Read them as DS-003 (b)/(c); the Solution Designer may tidy them at the next revision.
- Implementation detail for DS-003 (c): today `ToolCallFact` carries no arguments (`working-context-tool-protocol-repairer.ts:39-44`); it gains them from the interaction (`ToolInteraction.arguments`), and for a synthetic repair (no result yet) the interaction's name is the raw call's real name. The repairer's name pick for the inserted message changes from `completed?.toolName || call.name` to the working-context call's name; for direct calls the two are equal, so behavior there is unchanged.
- Carried from the package: U-001 (cache-hit rate), U-002 (unprobed providers, Kimi), R-001 (a weaker model may not search; FU-002).
- A malformed `call_tool` call with tools not auto-executed still asks for approval before the tool answers how to call (accepted in DS-002); worth one case in the API/E2E plan.
- `search_tools`' description is frozen per agent creation; a restored run is re-created, so its description then includes tools added before the restart (one more prefix change on restore, inside the accepted one-time rebuild).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (P-001 Not Reachable → no machinery; P-002 addressed by the adopted exact-shape rule)
- Notes: Classification Medium / High confirmed. Round 2 resolved AR-001; R-A, R-B, R-C adopted. Ready for implementation on SR-004.
