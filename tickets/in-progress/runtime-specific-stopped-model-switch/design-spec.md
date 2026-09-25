# Design Spec — Runtime-specific stopped-run model switching

## Solution And Approval Basis
- Package: `runtime-specific-stopped-model-switch`; current solution revision: `SR-003` (architecture design following SR-002 approval).
- Design status: **Ready — Architecture Design Complete**, pending independent review.
- Approved requirements: `requirements-doc.md` REQ-001–007, AC-001–009, SCN-001–006; explicit 2026-09-25 user reply: “yes. basically no need to consider context sidze for those runtime. because its handled by those runtimes right? it should not be blcoked by our platform”. This follows the approval question covering stopped Agent/Team/Org, smaller/unknown capacity and AutoByteus exception. No behavior-defining supplements. Screenshot is evidence, not UI design approval.
- Canonical evidence: `investigation-notes.md` E01–E15 and AE-01–AE-09. Prototype/UI-UX specification: N/A — not applicable. Prior `tickets/done/stopped-run-compatible-model/` artifacts are historical, not approval for this change.
- Worktree/base/finalization: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch`, branch `codex/runtime-specific-stopped-model-switch`, refreshed `origin/personal` `a2694ed453e353550d8b345fa82ef489634dcaf2`; finalization target `origin/personal` through Delivery Engineer.
- Path shorthand below: `S/` = `autobyteus-server-ts/src/`, `W/` = `autobyteus-web/`. Unprefixed `src/` in server-specific sections means `S/`.

## Current-State Read
`RunModelSelectionService` owns both stopped-run option discovery and authoritative Save validation. It currently applies verified context capacity ≥ saved capacity to all four runtimes. Agent, Team and Org use that service through their existing Settings queries/commands. The web picker admits only returned replacement IDs and the store uses them for Save enablement. The same service already validates current catalog membership and the selected model's config schema; Agent/Team/Org lifecycle owners already serialize and atomically commit the model/settings pair. Restore adapters already pass persisted model with saved provider identity. Hence the approved change is eligibility policy and its option/copy contract, not a new model-switch command, a persistence rewrite or a compaction mechanism (E02–E09, AE-01–09).

## Task Size And Architectural Risk
- `task_size`: **Medium**. Several existing owner files, GraphQL/Web types/queries, two Settings component entrypoints, localized text, obsolete external capacity readers, focused tests and docs must change. No new runtime, Save owner, persistence schema, topology, provider session mechanism or compression subsystem.
- `architectural_risk`: **High**. Shared GraphQL run-model-options contract loses unused numeric capacity fields; the authoritative eligibility policy changes across Agent/Team/Org and must remain aligned between option discovery and Save. A misroute could weaken AutoByteus safety or leave external Save blocked. Smaller-context live provider behavior remains a validation uncertainty, not a reason to restore the platform gate.
- Payload vs structure: localized strings, docs and fixtures are payload. `RunModelSelectionService`, GraphQL option DTO/queries/generated types and Settings state are structural changes. Existing persistent files are directly usable. High risk is from shared contract/policy and provider-boundary validation, not content volume.
- Escalation: if implementation finds a provider cannot retain the same binding/history with a selected runtime-catalog model, or the GraphQL contract has a necessary external consumer, return `Design Impact` or `Requirement Gap` as appropriate; do not silently reinstate a capacity gate, reset history, or expand to hot-swap. Final validation must name untested runtime/model pairs.

## Architecture Investigation Evidence
| Evidence | Observation | Decision / uncertainty |
| --- | --- | --- |
| AE-01, E02/E03 | Shared service applies capacity in options and validation, including Antigravity always unknown. | Change one authoritative policy branch in both paths. |
| AE-02 | External capacity readers have no other production caller. | Remove obsolete external lookup code rather than retain unused/fallback paths. |
| AE-03/E08 | Save and restore owners already carry coherent pair and binding. | Do not touch lifecycle writers/restore semantics except tests verifying unchanged contract. |
| AE-04/05/08 | Web/GraphQL transport carries unused mandatory numeric capacity fields; UI consumes only eligible identifiers/reason. | Remove obsolete capacity values from run-options contract and regenerate frontend types. |
| AE-06/E12 | Universal copy appears in Agent and Team/Org forms. | Make fixed-runtime and model-eligibility copy distinct and runtime-accurate; keep workspace warning separate. |
| AE-07 | Representative local Agent/Team/Org records already store runtime/model/config. | Directly usable, no migration. Counts are local only. |
| AE-09 | Frontend model catalog is separately loaded for labels/schema. | Keep server option IDs authoritative; surface/refresh catalog mismatch, not a hidden capacity veto. |

## Intended Change
For exactly `CLAUDE_AGENT_SDK`, `CODEX_APP_SERVER`, and `ANTIGRAVITY_CLI`, enumerate every model ID from the current runtime/workspace catalog (other than the saved ID in replacement rows) and validate selected targets by fresh catalog membership plus selected-model settings schema. **Do not call or compare context-capacity metadata** for those runtimes. For `AUTOBYTEUS`, retain the existing verified-current/target positive capacity and non-decrease comparison, including same-model settings exception. Unknown future runtime kinds fail closed until explicitly classified. Preserve fixed runtime, stopped-only, no-partial-write, normal restore, provider binding/history and error/reconciliation ownership.

## Relevant Behavior And Production-Path Map
| BEH | Approved IDs / trigger | Existing evidence | Target path / outcome / spines |
| --- | --- | --- | --- |
| BEH-001 | REQ-001/002, AC-001/002; stopped external Settings SCN-001–003 | E01–05, AE-01/04 | Settings → options query → shared selection owner → runtime catalog → picker; all offered external IDs shown regardless of capacity; DS-01/03. |
| BEH-002 | REQ-004, AC-002/004/008; explicit Save SCN-001–003/005 | E02/E04, AE-03 | Settings Save → Agent/Team/Org lifecycle owner → shared validator → catalog/schema → existing commit; DS-02/04. |
| BEH-003 | REQ-003, AC-003; AutoByteus SCN-004 | E02/E07, AE-01 | Same paths, but native capacity evidence remains the replacement gate; DS-01/02. |
| BEH-004 | REQ-005, AC-006/007; normal resume SCN-006 | E08/E10, AE-03 | Existing restore → saved selection + provider binding → external runtime; no Save-time history change; DS-05. |
| BEH-005 | REQ-007, AC-001/009; Settings copy SCN-001–005 | E01/E05/E12, AE-06 | Model/runtime helper and option status express correct rule; workspace warning independent; DS-03/06. |
| BEH-006 | REQ-006, AC-005; configured Team/Org SCN-002/003 | E04/E09/E13, AE-03/04 | Existing linked-scope planner → per-scope validator → one aggregate commit; DS-02/04. |

## Relevant Supplemental Task Artifacts
- User screenshot: absolute path in investigation notes; current-state evidence only, BEH-001/005.
- Prior completed stopped-run package: read-only historical approval and live equal-context Codex proof, not a current behavior supplement.
- Product prototype/UI spec and review artifacts: N/A — not applicable.

## Task Design Health Assessment
- Posture: Behavior Change. Current design issue: **No defect under the old approved policy**; for this new policy, the universal capacity invariant and capacity-bearing option DTO are now too broad.
- Root cause: **Missing runtime-specific invariant** in the shared selection owner; **shared structure looseness** because capacity fields are transported although the frontend never uses them.
- Refactor needed now: **Yes, bounded**. Make one explicit runtime-kind policy in the existing selection owner; extract/retain only AutoByteus native capacity resolution; remove external metadata readers and obsolete numeric option transport. Do not create a second validator or UI-side eligibility authority.
- Evidence: AE-01/02/04/05. Residual risk: separately fetched UI/server catalogs and provider-specific resume results. These remain existing boundaries; errors are surfaced, not papered over with guessed eligibility.

## Terminology And Reading Order
- “Offered model” means an ID returned by the runtime catalog for the run environment at option load; Save rechecks fresh membership. It does not include hidden/unreturned IDs or arbitrary text entry.
- “Current model” means saved model at Settings load for display, and fresh persisted model at Save for AutoByteus comparison.
- “Capacity” remains an AutoByteus-only eligibility fact; it is not an external option attribute or platform promise.
- Read behavior → policy/transition → spines/ownership → file mapping → validation/risks.

## Legacy Removal Policy And Persisted-Data Decision
- Policy: **No backward compatibility; remove legacy code paths.** Remove external capacity discovery/validation paths and capacity-specific GraphQL option fields rather than provide null/zero dummy values or dual old/new option shapes. Existing AutoByteus native capacity logic is required current behavior, not legacy.
- Stored subject: Agent `run_metadata.json`; Team V2 and Org V1 execution trees. AE-07's read-only sample inventory shows already-present `runtimeKind`, `llmModelIdentifier`, `llmConfig`; readers and stopped Save writers already use these fields. No schema/version change, provider-binding change or new field.
- Decision: **Directly Usable — No Migration**. Only allowed values/eligibility change; existing version-agnostic readers continue to interpret records correctly. Bulk rewrite offers no correctness benefit and would add I/O/corruption risk over the local sample inventory (459 Agent, 540 Team, 23 Org records; not production counts). Current atomic Save/readback remains the transition mechanism for a user-selected model. No discard/rebuild, deployment cutover, dual read or version-specific fallback.
- Required invariant: a Save changes only intended configured selection pairs, not conversation content, summaries, platform IDs or unaffected scopes (AC-005–007).

## Data-Flow Spine Inventory And Narratives
| ID | Scope | Behaviors | Start → end / governing owner | Why |
| --- | --- | --- | --- | --- |
| DS-01 | Primary end-to-end | BEH-001/003 | Settings entry → GraphQL options → Studio/Org query facade → `RunModelSelectionService` → runtime catalog/(native capacity only) → options response; selection service owns eligibility | Exposes all eligible IDs from authoritative runtime data. |
| DS-02 | Primary end-to-end | BEH-002/003/006 | Settings Save → mutation facade → Agent/Team/Org stopped lifecycle owner → shared selection validator → atomic metadata/tree writer → canonical result; lifecycle owner governs commit | Save must revalidate and remain all-or-none. |
| DS-03 | Return/event | BEH-001/005 | Option response → web options client/store → `RuntimeModelConfigFields` grouped picker/status → user selection draft; web store owns draft | UI cannot invent or suppress an eligible server ID via capacity policy. |
| DS-04 | Return/event | BEH-002/006 | Save result → canonical reconciliation → web draft/cache/feedback; lifecycle owner supplies truth, store projects it | Preserve stale/error/indeterminate handling. |
| DS-05 | Primary end-to-end | BEH-004 | Next message → run activation/restore → persisted model + provider binding → external adapter → provider continuation/result; runtime adapter owns provider interaction | Shows that this change does not replace restore/compaction. |
| DS-06 | Bounded local | BEH-005 | Runtime kind + option state → localized help/status → rendered Settings | Accurate user explanation without client-side policy authority. |

Primary chains DS-01/02/05 above span the real product paths. DS-03/04 are meaningful outward return flows. DS-06 is only a presentation concern attached to Settings, not a new business owner.

## Spine Actors, Ownership And Boundaries
- `ExistingRunConfigEditor` and Agent/Team/Org forms are entry/presentation surfaces, not eligibility owners. The web store owns draft, Save enablement and reconciliation. The options client is a thin GraphQL adapter.
- Studio/Org query and mutation resolvers are thin transport boundaries. `RunModelSelectionService` alone owns runtime-catalog membership, selected settings schema and replacement eligibility. `ModelCatalogService` owns runtime-scoped catalog retrieval; native capacity resolver is an off-spine AutoByteus evidence source only.
- Agent lifecycle service, Team run manager and Org run manager own stopped/archived/ownership/transition sequencing and atomic persistence. They call the validator, never implement parallel runtime-kind rules. Restore adapters own binding and provider response/failure.
- Forbidden bypass: web-only “allow all” while server rejects, a second Save endpoint, direct capacity lookup by a lifecycle manager, raw metadata editing, or a provider adapter silently starting a new conversation after failed resume.

### Boundary Encapsulation Check
| Authoritative boundary | Encapsulates | Upstream caller | Forbidden bypass / correction |
| --- | --- | --- | --- |
| `RunModelSelectionService` | Runtime catalog, native-only eligibility, target schema | Agent/Team/Org stopped owners | No direct catalog/capacity policy in those owners; extend shared service if a needed result is missing. |
| Agent/Team/Org stopped lifecycle owner | Activity/ownership, target scope, mutation and readback | GraphQL mutation facade | No direct metadata/tree write from GraphQL or UI. |
| Existing web config store | Draft/canonical/error state | Form/picker components | Components emit selection; they do not call Save or independently waive server eligibility. |

The transport facades remain thin; they do not become policy owners. Identity shape stays explicit: Agent ID, Team root ID plus configured address, or Org ID plus configured address. No ambiguous generic selector is introduced.

## Off-Spine Concerns And Subsystem Reuse
| Concern | Serves / decision | Boundary rule |
| --- | --- | --- |
| Runtime model catalogs | Selection owner; **reuse** existing Claude/Codex/Antigravity/native catalogs | Do not use marketing/model-name guesses or hidden IDs. |
| Native model metadata | Selection owner; **retain/simplify** verified AutoByteus capacity resolver | No external capacity query. |
| Model settings schema | Selection owner; **reuse** existing schema validator | Target model controls must be reviewed and schema-valid. |
| Localized UI copy | Settings presentation; **extend** existing localization | Copy may explain policy but not decide eligibility. |
| Metadata/tree stores | Stopped lifecycle owners; **reuse unchanged** | No new writer/migration. |
| Provider continuation | Restore adapters; **reuse unchanged** | Provider-native compaction/rejection remains observable. |

## Interfaces And Tight Shared Shapes
| Boundary | Subject / identity | Target contract and check |
| --- | --- | --- |
| `RunModelSelectionService.listOptions/listOptionsMany` | Saved runtime kind, current model, workspace root per configured scope | Return `{ currentModelIdentifier, replacements: [{llmModelIdentifier}], unavailableReason }`; external catalog rows excluding current, native proven options only. Catalog failure yields reason/no alternatives. |
| `RunModelSelectionService.validate/validateMany` | Fresh saved context + proposed model/settings pair | Catalog membership then external schema directly, or native capacity comparison then schema. Same-model settings retain capacity exemption. Batch shares request-local catalog evidence; only native contexts resolve capacity. Unknown future runtime fails closed. |
| Agent/Team/Org stopped Save | Agent run ID / exact configured address(es) / Org run ID | Existing command shape and lifecycle/atomic outcomes unchanged; each target invokes validator. |
| GraphQL `RunModelOptionsObject` and web option types | Agent/Team/Org query subject + scope address where applicable | Remove `currentContextTokens` and `contextTokens`; retain current ID/replacement IDs/unavailable reason. Queries and generated types update in lockstep. No redundant numeric placeholder. |
| Settings option/UI helper | Fixed runtime kind and received server options | Separate fixed-runtime help from AutoByteus capacity wording and external catalog-based wording. Do not show capacity-unavailable/no-equal-larger copy for external runtimes. |

Each interface has one subject and explicit run/scope identity; selector ambiguity is Low if the existing GraphQL Agent/Team/Org split and exact addresses remain. No generic "run" identity or new cross-subsystem facade is needed. Domain subject names remain natural: run model selection, model catalog, stopped run config. Reusable shared structure is the reduced `RunModelOptions` shape owned by LLM management and mirrored only at transport/client boundaries, not a second eligibility algorithm.

### Reuse, Shared Structure And Folder Check
| Concern | Reuse/structure decision | Tightness / folder boundary |
| --- | --- | --- |
| Eligibility option result | Reuse and narrow `RunModelOptions`, not a second external option type | One ID list and reason; no redundant capacities or parallel policy flags. LLM-management domain owns the server shape. |
| Native context evidence | Keep a focused LLM-management file | One positive-token resolver with verified provenance; not a generic provider registry. |
| Catalog, schema, stopped Save, restore | Reuse existing owners | Existing runtime/LLM management, run-history, Team/Org and Web folders already express sufficient structural depth; no new mixed folder. |
| Presentation copy | Reuse localization in the existing Web config folder | A tiny shared copy selector is acceptable if needed for Agent/Team/Org; it must not decide eligible IDs. |

## Removal / Decommission And File Responsibilities
| Path / responsibility | Target action | Reason |
| --- | --- | --- |
| `autobyteus-server-ts/src/llm-management/services/run-model-selection-service.ts` | **Change** one explicit runtime policy for options/validation; preserve catalog/schema and batching | Authoritative selection owner; avoid UI/server drift. |
| `autobyteus-server-ts/src/llm-management/services/runtime-model-capacity-service.ts` and `domain/runtime-model-capacity.ts` | **Replace/simplify** with focused native-capacity evidence file (e.g. `services/native-model-capacity.ts`) | External capacity union/dispatch no longer serves behavior; native provenance check remains. |
| `src/runtime-management/codex/client/codex-model-capacity-reader.ts`, `src/runtime-management/claude/client/claude-sdk-context-capacity.ts`, Claude SDK client's `resolveContextCapacities` and now-unused imports | **Delete** after call-site audit | External metadata gates are obsolete, not fallback eligibility paths. Preserve independent model-catalog discovery and normal runtime adapters. |
| `src/llm-management/domain/run-model-selection.ts`, `src/api/graphql/types/run-model-config.ts` | **Change** option shape: IDs + reason, no numeric capacity | Single tight transport meaning across runtimes. |
| `autobyteus-web/graphql/queries/runModelOptionsQueries.ts`, `generated/graphql.ts`, `types/agent/ExistingRunModelConfigDraft.ts` | **Change/regenerate** in lockstep | No stale GraphQL selection/fragment or dummy fields. |
| `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | **Change** status messaging and server-option rendering without local capacity veto | Existing picker is the correct presentation owner. |
| `autobyteus-web/components/workspace/config/{AgentRunConfigForm.vue,TeamScopeConfigEditor.vue}`; `localization/messages/{en,zh-CN}/workspace.ts` | **Change** runtime/model help to accurate distinct copy; use one small presentation helper if needed | Avoid duplicate universal context claim in Agent/Team/Org. No new layout. |
| Focused server/Web tests, E2E fixture, `autobyteus-web/docs/{settings.md,agent_orgs.md}`, `autobyteus-server-ts/docs/modules/llm_management.md` and other exact matching docs | **Revise** | Prove new external smaller/unknown and native preserved cases; synchronize durable documentation. |

The existing LLM management, runtime management, run history, Team/Org execution, GraphQL and Web configuration folders retain their current ownership/depth. No new subsystem or folder is warranted. `native-model-capacity.ts` is an off-spine LLM-management concern, not an independent runtime policy. Delete now-unused external reader tests rather than keep tests for dead APIs; retain/rewrite native-capacity tests. Generated GraphQL should be regenerated from a matching backend schema as configured in `autobyteus-web/codegen.ts`, not manually patched.

### Folder Boundary And File-Placement Check
`S/llm-management/services` remains main-line selection plus its small native evidence concern; `S/runtime-management/*/client` no longer holds stopped-selection-only external capacity adapters; `S/api/graphql/types` holds transport projections, not eligibility; `W/components/workspace/config` and `W/components/launch-config` hold view composition and picker interaction, not server policy. This compact existing layout is clearer than new feature folders because the delta does not introduce a new subsystem. Mixed-layer/over-split risk is Low after the obsolete readers are removed.

## Concrete Shape Example And Compatibility Rejection
Good: external `listOptions({runtimeKind: CLAUDE_AGENT_SDK, currentModelIdentifier:'a', workspaceRootPath})` with catalog `[a,b,c]` returns replacement IDs `[b,c]` even if `b` has 64k and `c` capacity is unknown. Native AutoByteus with saved 128k and candidates 64k/200k returns only 200k if both capacities are verified. Save repeats the corresponding check against fresh catalog/current saved selection. Bad: external options list `b` while Save still calls a capacity reader, or GraphQL emits `contextTokens: 0` to satisfy the old schema.

Rejected compatibility mechanisms: nullable fake capacity values, optional old GraphQL fields preserved solely for old clients, duplicate old/new validation functions, external capacity-read fallback and dual persisted schema. No known in-repo production UI consumes option capacity values (AE-05); if an actual external contract consumer is discovered, return a Design Impact rather than quietly retaining ambiguous fields. No data migration is needed.

## Change / Refactor Sequence
1. Confirm SR-002 approval and current worktree/base; retain old behavior tests as explicit AutoByteus cases, add external policy cases first.
2. Refactor the one selection owner and native capacity resolver so external catalog paths never invoke capacity. Keep request-local catalog sharing and exact fresh Save revalidation.
3. Remove obsolete external capacity readers/SDK method/types and dead tests; run import/call-site audit.
4. Narrow GraphQL option DTO/domain/Web queries/types, regenerate GraphQL client, update fixture/query tests in one change. Keep Save mutation contract unchanged.
5. Update the picker status and Agent/Team/Org help/copy (English/Chinese), then focused render/store tests for all runtimes and catalog errors.
6. Validate Agent/Team/Org option/Save flows, native negative and settings-only paths, normal resume/history/no-reset, and provider-specific representative smaller/unknown-context switch outcomes. Sync docs to actual behavior. Do not claim universal runtime success from mocked capacity or the old equal-size Codex proof.

## Key Tradeoffs, Risks And Guidance For Implementation
- Avoiding platform context checks fulfills the approved intent and eliminates an Antigravity dead-end, but delegates long-history handling to external providers. Provider failure remains possible; persist selected config and surface normal restore error while preserving stored history (REQ-005), not a silent new conversation.
- Removing unused numeric option fields is a deliberate GraphQL contract change that makes the API truthful. It raises review risk but avoids fake context values, unnecessary external metadata startup, and ongoing dual policy.
- Catalog membership at option load is advisory; Save is fresh and authoritative. A separately loaded frontend label/schema catalog may lag; the UI should retry/show unavailability rather than suppress a valid server option as "too small" or fabricate settings.
- Tests must cover all three external runtime kinds (including Antigravity unknown capacity), AutoByteus equal/larger/smaller/unknown, Agent/Team/Org per-scope Save, catalog removal, unchanged settings, and persisted history/provider identity. A real external continuation probe should use owned test runs and protect existing user data. Final API/E2E report must truthfully bound any untested provider/model matrix.
