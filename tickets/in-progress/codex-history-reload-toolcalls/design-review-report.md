# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/design-spec.md`
- Current Review Round: 1
- Trigger: Initial architecture review requested by `solution_designer` for Codex history reload missing-tool-calls bug.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Requirements, investigation notes, design spec, scratch repro log, and direct code reads of `CodexRunViewProjectionProvider`, `AgentRunViewProjectionService`, `TeamMemberRunViewProjectionService`, Codex live event converter/parser files, projection types, projection transformers, and existing focused tests.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design review | N/A | No | Pass | Yes | Design is actionable and preserves the correct backend/frontend boundaries. |

## Reviewed Design Spec

The design targets the verified backend projection loss: Codex native `thread/read` history contains `dynamicToolCall` and `mcpToolCall` items, but `CodexRunViewProjectionProvider` currently only maps `fileChange`, `commandExecution`, and `webSearch`. The proposal moves Codex raw tool-family/payload interpretation into an owned Codex item/history normalization layer, keeps the provider as a projection orchestrator, and extracts run-history merge policy into an invocation-aware merge helper so local-memory and runtime-native projections deduplicate/enrich by stable invocation identity.

The external GraphQL projection shape and frontend hydration contract remain unchanged.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design marks this as a bug fix with current design issue found. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Classification is `Duplicated Policy Or Coordination / Shared Structure Looseness`, backed by live converter support for dynamic/MCP tools and provider-local narrower history switch plus scratch repro. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design says refactor needed now. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | File mapping, removal plan, normalizer extraction, parser re-home, and merge helper are all concrete; no persistent backfill is explicitly deferred. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | First review round. | N/A |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary end-to-end history reload | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Codex thread item to replay event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Local/native projection merge | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex history adapter | Pass | Pass | Pass | Pass | Native `thread/read` access and read-time normalizer stay under Codex backend history. |
| Codex raw item parsing | Pass | Pass | Pass | Pass | Re-homing pure parser/helper code under a shared Codex `items` area is a sound anti-drift move. |
| Run-history projection | Pass | Pass | Pass | Pass | Merge policy belongs in run-history, not inside Codex provider or GraphQL. |
| Frontend run hydration | Pass | Pass | Pass | Pass | Reuse unchanged canonical projection hydration; no Codex-specific UI branch. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex item family normalization | Pass | Pass | Pass | Pass | Central finite classifier prevents live/history family drift. |
| Tool payload extraction | Pass | Pass | Pass | Pass | Pure parser is properly Codex-owned and independent of run-history rows. |
| Projection row merge by invocation | Pass | Pass | Pass | Pass | Runtime-agnostic merge helper is the correct owner for local/native reconciliation. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `CodexToolItemFamily` | Pass | Pass | Pass | Pass | Finite family classifier, not a UI segment taxonomy. |
| Normalized Codex history tool fact | Pass | Pass | Pass | Pass | Design keeps this as Codex item facts; provider maps to `HistoricalReplayToolEvent`. |
| `RunProjection` conversation/activity rows | Pass | Pass | Pass | N/A | Existing canonical external contract remains intact; merge helper owns enrichment. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider-local narrow tool parsing | Pass | Pass | Pass | Pass | Concrete provider-local functions/branch policy are named for removal. |
| Exact-JSON-only tool dedupe as sole policy | Pass | Pass | Pass | Pass | May remain only as fallback for non-tool/anonymous rows. |
| Frontend Codex-specific workaround | Pass | Pass | Pass | Pass | Explicitly forbidden; backend projection remains authoritative. |
| Persistent raw trace migration/backfill | Pass | N/A | Pass | Pass | Correctly out of scope and not retained as hidden compatibility behavior. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `codex/items/codex-tool-item-family.ts` | Pass | Pass | Pass | Pass | One family-classification concern. |
| `codex/items/codex-file-change-payload-helper.ts` | Pass | Pass | Pass | Pass | Pure file-change extraction only. |
| `codex/items/codex-tool-payload-parser.ts` | Pass | Pass | Pass | Pass | Pure tool payload extraction shared by live and history paths. |
| `codex/events/codex-item-event-payload-parser.ts` | Pass | Pass | Pass | Pass | Live event/segment adapter remains in events. |
| `codex/events/codex-item-event-converter.ts` | Pass | Pass | Pass | Pass | Uses shared family classification without owning history replay. |
| `codex/history/codex-thread-history-item-normalizer.ts` | Pass | Pass | Pass | Pass | One thread-read item interpretation boundary. |
| `run-history/projection/providers/codex-run-view-projection-provider.ts` | Pass | Pass | Pass | Pass | Provider remains orchestration and replay-event mapping. |
| `run-history/projection/run-projection-merge.ts` | Pass | Pass | N/A | Pass | Runtime-agnostic merge policy owner. |
| `run-history/services/agent-run-view-projection-service.ts` | Pass | Pass | Pass | Pass | Keeps provider selection/fallback orchestration; delegates merge. |
| Backend provider/merge tests | Pass | Pass | N/A | Pass | Test file choices align with ownership. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| GraphQL history resolvers | Pass | Pass | Pass | Pass | Depend on services only. |
| `TeamMemberRunViewProjectionService` | Pass | Pass | Pass | Pass | Resolves member/local projection and delegates runtime-native projection. |
| `AgentRunViewProjectionService` | Pass | Pass | Pass | Pass | Owns selection and calls run-history merge helper. |
| Codex provider/history normalizer | Pass | Pass | Pass | Pass | Run-history provider can depend on Codex normalizer; Codex parser cannot depend upward on run-history/GraphQL/frontend. |
| Frontend hydration | Pass | Pass | Pass | Pass | Canonical projection only. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRunViewProjectionService.getProjection*` | Pass | Pass | Pass | Pass | No resolver-side provider/merge bypass. |
| `CodexRunViewProjectionProvider.buildProjection` | Pass | Pass | Pass | Pass | Provider encapsulates native read/traversal and delegates item details. |
| Codex thread-history item normalizer | Pass | Pass | Pass | Pass | Provider-local payload parsing is explicitly forbidden. |
| Frontend projection hydration | Pass | Pass | Pass | Pass | No Codex-native shape leaks into UI. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `getRunProjection(runId)` | Pass | Pass | Pass | Low | Pass |
| `getTeamMemberRunProjection(teamRunId, memberRouteKey)` | Pass | Pass | Pass | Medium | Pass |
| `CodexThreadHistoryReader.readThread(threadId, cwd)` | Pass | Pass | Pass | Low | Pass |
| `normalizeCodexThreadHistoryItem(input)` | Pass | Pass | Pass | Low | Pass |
| `mergeProjectionBundles(runId, primary, secondary)` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/backends/codex/items/` | Pass | Pass | Low | Pass | Correct shared Codex raw-item parsing location. |
| `agent-execution/backends/codex/history/` | Pass | Pass | Low | Pass | Correct for thread-read adapter/normalizer. |
| `run-history/projection/providers/` | Pass | Pass | Low | Pass | Existing runtime-native provider placement remains valid. |
| `run-history/projection/run-projection-merge.ts` | Pass | Pass | Low | Pass | Merge is projection-domain policy. |
| Docs paths | Pass | Pass | Low | Pass | Delivery can update after implementation evidence. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex thread reading | Pass | Pass | N/A | Pass | Reader is reused unchanged. |
| Codex payload parsing | Pass | Pass | Pass | Pass | Existing parser/helper are extended/re-homed rather than duplicated. |
| Projection bundle building | Pass | Pass | N/A | Pass | Existing builders remain valid. |
| Projection merge | Pass | Pass | Pass | Pass | Existing inline helper is no longer sufficient; extraction is justified. |
| Frontend rendering | Pass | Pass | N/A | Pass | Existing hydration tests support keeping UI out of scope. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Provider-local tool parsing | No target compatibility wrapper | Pass | Pass | Remove as authoritative policy. |
| Exact-JSON tool merge | Limited fallback only | Pass | Pass | Not allowed as sole tool-row policy. |
| Frontend workaround | No | Pass | Pass | Correct. |
| Raw trace migration/backfill | No | Pass | Pass | Correctly out of scope. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Parser re-home and live import update | Pass | Pass | Pass | Pass |
| History item normalizer introduction | Pass | Pass | Pass | Pass |
| Provider refactor | Pass | Pass | Pass | Pass |
| Merge helper extraction | Pass | Pass | Pass | Pass |
| Validation and docs | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Dynamic tool history item | Yes | Pass | N/A | Pass | Example shows canonical conversation and activity rows. |
| MCP tool history item | Yes | Pass | N/A | Pass | Example covers `contentItems` result extraction. |
| Invocation-aware merge | Yes | Pass | Pass | Pass | Rules clearly state stable invocation id, terminal facts, and anonymous-row safety. |
| Frontend no-change boundary | No | N/A | Pass | Pass | Avoided Codex-specific frontend branch is stated. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Codex native thread unavailable | Cannot recover facts absent from both local raw traces and native history. | Keep as residual risk/out of scope; classify remaining loss per AC-008. | Accepted residual risk. |
| Evolving Codex history item shapes | Future shapes may be tool-like but unsupported. | Implement opt-in debug summaries and deterministic fixtures for known active families. | Accepted residual risk with mitigation. |
| Missing timestamps | Could affect cross-source ordering. | Preserve provider-internal turn/item order; merge by identity only when stable. | Accepted residual risk with design rule. |
| Anonymous/generated invocation ids | Could over-collapse unrelated rows if treated as stable. | Treat generated fallback ids as source-scoped and do not use them for cross-source semantic collapse. | Accepted residual risk with design rule. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A - no blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Implementation must keep the normalizer return shape as Codex facts only; it must not emit GraphQL/frontend projection rows directly.
- Invocation-aware merge must distinguish stable invocation identities from generated/source-scoped fallback ids. Exact JSON dedupe is acceptable only as a fallback and must not become the semantic tool merge policy.
- The implementation should not broaden frontend scope unless backend validation proves canonical `tool_call` rows still fail to hydrate/render.
- Optional live Codex validation remains environment-gated; deterministic backend provider and merge tests are mandatory.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Proceed to implementation with the design as written. The design correctly fixes the backend projection boundary, centralizes Codex tool item interpretation, hardens local/native merge, and preserves the external projection contract.
