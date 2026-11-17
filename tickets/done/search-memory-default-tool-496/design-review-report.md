# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/search-memory-default-tool-496/requirements-doc.md` (approval basis SR-001; AC-003 clarified at SR-003, intended behavior unchanged)
- Upstream Investigation Notes: `tickets/in-progress/search-memory-default-tool-496/investigation-notes.md` (SR-002 evidence update)
- Upstream Solution Revision Record: `tickets/in-progress/search-memory-default-tool-496/solution-revision-record.md` (SR-001, SR-002)
- Reviewed Design Spec: `tickets/in-progress/search-memory-default-tool-496/design-spec.md` (SR-003)
- Supplemental Task Artifacts Reviewed: `follow-ups.md` (FU-001…FU-003), `handoff-architecture-review.md`
- Relevant Solution Revision IDs: SR-001 (baseline), SR-002 (evidence-only re-base), SR-003 (resolution of ARCH-REV-001)
- Architecture Review Revision Record: `tickets/in-progress/search-memory-default-tool-496/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: the Solution Designer's revision for re-review (SR-003, `a859387cef`) after ARCH-REV-001 `Fail`
- Prior Review Round Reviewed: 1 (ARCH-REV-001)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `codex/search-memory-default-tool-496` @ `a859387cef`, base `origin/personal` @ `a781007713` (round 1 evidence at `aed5a0502f`; source code unchanged since). Round 2 rechecked AR-001…AR-004, DS-002, DS-004 and the affected verdict rows.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: there is a new privacy boundary on a tool that every agent gets. The shared contracts `RuntimeAgentToolExposure`, `MemorySearch.search` and `EmbeddingIndex.nearest` change, and native runs need a lifecycle rule for the tool instances they keep. About 16 production files change, all inside existing owners.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: yes. `search_memory` becomes a default tool for every run on every runtime. The default tool searches only runs of the agent's own definition, and every reported item is derived from the covered runs. Explicit listing keeps node-wide search. `memorySearchEnabled: false` is the off switch, and the Model Router ships with it off. No system-prompt text is added, and live changes use the autobyteus-324 paths.
- Relevant existing behavior and evidence confirmed: IN-001, IN-002, IN-005, IN-007, IN-010, IN-011 and IN-013 hold at `a781007713` (details below).
- Scope guardrail confirmed: yes (UC-001…UC-004; out of scope FU-001…FU-003, the Memory page search, file access; preserved REQ-004/AC-005).
- Approved change, preserved behavior, and outside scope understood: yes
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (AR-001 → REQ-005, REQ-006, AC-006, AC-007, REQ-002; AR-002 → REQ-003)
- Remaining material ambiguity: none in the requirements basis.
- Statements about existing code the design relies on, opened at their cited lines:
  - Shared rule and callers: `runtime-agent-tool-exposure.ts:47-65`. Callers: native factory `:316` and `:500`; Claude bootstrapper `:91` and backend `:188`; Codex bootstrapper `:208` and backend `:260`; AGY factory `:66, :92` and backend `:150`; ACP factory `:174` and backend `:199`. Placeholders: `agent-run-restore-context-factory.ts:47` and `codex-agent-run-context.ts:39`. Every non-placeholder caller passes a non-null definition that was loaded by `config.agentDefinitionId`. Confirmed.
  - Native kept instances: `autobyteus-ts/src/agent/agent.ts:66-86` keeps the existing instance of each name that stays. `autobyteus-agent-run-backend.ts` `applyDefinitionTools` compares exposures, replaces the tools, and only then sets `this.toolExposure`. Confirmed.
  - MCP live replace: Codex `applyDefinitionTools` (`codex-agent-run-backend.ts:257-273`) and ACP (`acp-agent-run-backend.ts:197-210`) call `replaceForRun` at once, even when the provider reopens at the next turn. A scope read from `session.runtimeExposure` at call time is therefore current from the next call (REQ-008). Confirmed.
  - Search caps and oracle: `memory-search-service.ts` uses `TEXT_CANDIDATES = 4_000`, `MEANING_CANDIDATES = 300` and a node-wide `hasChunk`. `memory-search-store.ts` `textCandidates`/`hasChunk` and `embedding-index.ts` `nearest` sort all vectors, then slice. Confirmed.
  - Bound-tool precedent: `autobyteus-agent-tool-resolver.ts`, `get_project_task` special case. Confirmed.
  - Config pattern: `agent-definition-config.ts:43-91`. Confirmed, but incomplete as the pattern's full reader set (AR-001).
  - Re-index at start: `memory-index-pipeline.ts:104` starts `catchUp` when the index is built, and `:271` upserts every found run. Confirmed.
  - Discovery after the re-base: `memory-run-discovery.ts:103, 117, 131, 140`. Agent runs, delegated or not, take `metadata.agentDefinitionId` or the catalog row's ID. Team and Org members have the placement ID available. Folder-only runs are `RUN_FOLDER`. Confirmed.
  - No native prompt text depends on the tool list: `carpenter-prompt-composer.ts` reads no tool names. AC-008 holds by construction. Confirmed.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | Contract | Pass | Pass | Pass (AR-002 resolved: no counts under own scope) | Confirmed | — |
| BEH-005 | System | Pass | Pass | Pass (AR-001 resolved: both readers mapped; save keeps the key) | Confirmed | — |
| BEH-006 | System | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature with a privacy boundary | — |
| Root-cause classification is explicit and evidence-backed | Pass | `No Design Issue Found`; the shared exposure rule and the `MemorySearch` facade are the right single owners (IN-002, IN-005) | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | No refactor; only the definition-ID move | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Removal plan and file mapping | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Primary | Pass | Pass | Pass (`SearchMemoryTool`/adapter → `MemorySearch`) | Pass | Pass | Pass | Pass |
| DS-003 | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Return/event | Pass | Pass | N/A | Pass | Pass | Pass (holder) | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `MemorySearch.search` | Pass | Pass | Pass | Pass | Required `scope`; the store and embeddings know only keys and ids |
| Shared exposure rule (`memorySearchScopeOf`) | Pass | Pass | Pass | Pass | Backends pass the definition; no backend appends the name |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/shared` → `memory-search/domain`, memory tool contract | Pass | Pass | Pass | Pass | Matches the memory_search.md rule: only `memory-search.ts`, `domain/` and `settings/` are imported from outside |
| Memory tool entry forms → `MemorySearch` | Pass | Pass (no `AgentDefinitionService.getInstance()`) | Pass | Pass | IN-013 respected |

Composition and lookups (Principle 16): `Pass`. The native holder is created in `buildAgentConfig` and passed by argument to its reader and its writer. `getMemorySearch()` stays as it is: the startup loader creates it, and a missing one throws. A `null` scope at call time is a loud tool error, not a fallback.

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `MemorySearchScope` (`node` / `agentDefinition`) | Pass | Pass | Pass | Low | Pass |
| `MemorySearch.search(…, { scope })` | Pass | Pass | Pass | Low | Pass |
| `RuntimeAgentToolExposure.memorySearchScope` (required) | Pass | Pass | Pass | Low | Pass |
| `buildRuntimeAgentToolExposure(names, ctx, scope)` | Pass | Pass (decides no scope; AR-004) | Pass | Low | Pass |
| Store `runKeys: readonly string[] \| "all"`, `nearest({ acceptId })` | Pass | Pass | Pass | Low | Pass |
| `createBoundSearchMemoryTool(readScope)` | Pass | Pass | Pass | Low | Pass |

Empty indirection check: `Pass`. The holder is state with one writer and one reader, not a forwarding layer. No port is added.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Default tool for all runtimes | Pass | Pass | N/A | Pass | Shared exposure rule |
| Live changes and notice | Pass | Pass | N/A | Pass | autobyteus-324 |
| Bound native tool | Pass | Pass | N/A | Pass | `get_project_task` pattern |
| Config boolean | Pass | Pass | N/A | Pass | AR-001 resolved: both readers mapped |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| agent-execution | Pass | Pass | Pass | Pass | — |
| agent-tools/memory, MCP provider | Pass | Pass | Pass | Pass | — |
| memory-search, embeddings | Pass | Pass | Pass | Pass | — |
| agent-definition | Pass | Pass | Pass | Pass | AR-001 resolved |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `MemorySearchScope` | Pass | Pass (`memory-search/domain`) | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RuntimeAgentToolExposure.memorySearchScope` | Pass | Pass | Pass | N/A | Pass | Invariant: `null` exactly when the tool is not exposed |
| `MemoryRun.agentDefinitionId` | Pass | Pass (moved out of the `AGENT` subject) | Pass | N/A | Pass | — |
| `AgentDefinition.memorySearchEnabled` | Pass | Pass | Pass | N/A | Pass | Readers mapped (AR-001 resolved) |

Derived consumers of a changed structure, each listed with a decision: `Pass`. SR-003 adds the two definition readers, `cloneRuntimeExposure`, the save path (`cloneAgent`), `createAgentDefinition` and the two placeholders, each with a decision (AR-001 resolved).

One meaning per word, one name per concept (Principle 15): `Pass`. `MemorySearchScope` is always qualified. `memorySearchEnabled` parallels `semanticMemoryEnabled`. The glossary sentence is planned.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| The listed files (exposure, native, tools, memory-search, embeddings, GraphQL, template) | Pass | Pass | N/A | Pass | — |
| Agent-definition files (model, config, node reader, application-owned source) | Pass | Pass | N/A | Pass | AR-001 resolved |
| `agent-tool-mcp-session-registry.ts` | Pass | Pass | N/A | Pass | Copies the scope as a frozen copy (AR-001 resolved) |
| Restore-context and Codex-context placeholders | Pass | Pass | N/A | Pass | Pass `null` scope (AR-004) |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| No new folders; scope type in `memory-search/domain/` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Unbound native `search_memory` for runs | Pass | Pass | Pass | Pass | The registry class stays for the picker and validation. Its unbound execute should fail loudly. |
| `AGENT.agentDefinitionId` | Pass | Pass | Pass | Pass | GraphQL output unchanged |
| Optional scope in `MemorySearchOptions` | Pass | Pass | Pass | Pass | All 4 callers named (tool, GraphQL, evaluation ×2) |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Run records, scope option | No | Pass | Pass | Rejection log present |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `memory-search.sqlite` `runs.record` | Discard or Rebuild (existing `catchUp`) | Pass (`memory-index-pipeline.ts:104, 271`) | Pass | N/A | Pass | Fail-closed until the rewrite. A rollback build reads the moved field as a missing, nullable value. |
| `agent-config.json` `memorySearchEnabled` | Directly Usable | Pass (`normalizeAgentConfigRecord` is tolerant; merge keeps unknown keys; `updateAgentDefinition` clones the loaded definition, `agent-definition-service.ts:383`) | Pass | N/A | Pass | Read and save round-trip tested through the node reader |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–6 | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Scope rule, native narrowing, SQL filter, oracle, description | Yes | Pass | Pass | Pass | Holder written before `replaceTools` (AR-003 adopted) |

## Material Premise Validation

### MP-001: a call to a newly added native instance reads the holder between `replaceTools` and the holder write

- Related approved requirement or established contract: REQ-008
- Relevant behavior ID(s): BEH-006
- Initiating basis kind: `Operational` (definition save while the run is active)
- Independent product-supported initiating trigger or applicable governing contract: the user saves the definition in the agent editor (autobyteus-324).
- Support evidence: the save signal leads to `applyDefinitionTools` (`autobyteus-agent-run-backend.ts`).
- Forward path: `replaceTools` sets `state.toolInstances` at once, then awaits instance cleanup. The holder is written after that. The new instance can only be called after an LLM call that lists it has returned.
- Lifecycle preconditions and material consequence: the LLM call would have to return within the cleanup awaits. The consequence is a loud `MEMORY_SEARCH_UNAVAILABLE` error or one call at the old scope.
- Reachability: `Not Reachable` in practice (no supported timing produces it).
- Review consequence: no finding. AR-003 is a recommendation only.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`. The behavior basis is confirmed. AR-001 and AR-002 are resolved in the canonical spec, the recommendations AR-003 and AR-004 are adopted, and no new finding arose. The design is ready for implementation.

## Findings

None open. Status of the round-1 findings:

- AR-001 (Design Impact): **Resolved**.
  - Change Scope and the file mapping now name `agent-definition-node-reader.ts:59-60`, `application-owned-agent-source.ts:96-97` and `cloneRuntimeExposure` (a frozen copy of the scope).
  - `memorySearchScope` is a required field.
  - The save path is verified: `updateAgentDefinition` clones the loaded definition (`agent-definition-service.ts:383` `cloneAgent(existing)`), so a loaded `false` is written back.
  - A test through the node reader and a save, plus an application-owned read, is in the guidance.
- AR-002 (Design Impact): **Resolved**.
  - Under `agentDefinition` scope, DS-002 states that coverage drops both count sentences. Node scope keeps today's text.
  - AC-003 gains this as a clarification of REQ-003. That is within REQ-003's own wording, so the approval is unchanged.
  - Per-scope counts were rejected for a stated reason (the pipeline has no per-run step progress). The reason holds.
- AR-003 (Recommendation): **Adopted**. DS-004 and the example write the holder before `replaceTools`, which fails closed when the call throws.
- AR-004 (Suggestion): **Adopted**. The builder takes the scope as a parameter and decides none itself. Placeholders pass `null`, and names that contain `search_memory` with a `null` scope throw. `memorySearchScopeOf` is the only scope rule.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`). The Solution Designer receives an informational notification.

## Residual Risks

- FU-001 now records the addendum: ticking `search_memory` in the editor's tool picker widens an agent to node-wide search, and a definition used in both private and non-private contexts shares its memory. It is marked "not yet sent", so the Solution Designer still has to send it to the founder's channel.
- ASM-001 stays open and is covered by implementation tests. It fails closed, so its risk is less recall, not a leak.
- RSK-002: own scope finds nothing until the first `catchUp` after the upgrade. Accepted.
- `wordsNotFound` counts the asking run under node scope only. This is documented (sequence step 6).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001 `Not Reachable`; with AR-003 adopted it is moot)
- Notes: implementation follows design-spec.md at SR-003. The test list in "Guidance For Implementation" includes the AR-001 and AR-002 tests.
