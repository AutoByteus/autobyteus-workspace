# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/design-spec.md`
- Current Review Round: 1
- Trigger: Superseding 2026-06-28 solution-designer handoff covering temp workspace visibility plus removal of the New workspace `Load` action.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Reviewed upstream artifacts and inspected current code in `autobyteus-web/stores/runHistoryReadModel.ts`, `autobyteus-web/utils/runTreeProjection.ts`, `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`, `autobyteus-web/components/workspace/config/WorkspaceSelector.vue`, `autobyteus-web/components/workspace/config/RunConfigPanel.vue`, `autobyteus-web/stores/runHistorySelectionActions.ts`, `autobyteus-web/composables/useWorkspaceHistoryMutations.ts`, `autobyteus-server-ts/src/workspaces/workspace-manager.ts`, `autobyteus-server-ts/src/api/graphql/types/workspace.ts`, and `autobyteus-server-ts/src/api/graphql/types/run-history.ts`.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Superseding package with Load-button removal | N/A | No | Pass | Yes | Design is concrete enough for implementation and preserves the workspace-removal invariant. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-run-visibility-analysis/tickets/in-progress/workspace-run-visibility-analysis/design-spec.md` as the authoritative design. The spec addresses the descriptor eligibility regression, temp non-removability, temp scoped-history reads, local permanent standalone row continuity, and removal of the New-mode `Load` UI/event path in favor of run-triggered workspace loading.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design classifies the work as bug fix plus small UX behavior change. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design names Missing Invariant and Boundary/Ownership Issue and ties them to current code: temp descriptors are filtered despite being returned/selected, scoped history resolves registered-only IDs, and pending New paths stay local to `WorkspaceSelector`. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design says bounded refactor is required across read-model/projection, backend history root resolution, and config input/launch sequencing. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Refactor sequence, file mapping, boundary map, removal plan, tests, and explicit deferral of backend temp-root launch cleanup align with the assessment. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First review round. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Sidebar visible workspace descriptors | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Agent run start to visible row | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Team run start to visible row | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Workspace-scoped history read | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Remove workspace event path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Standalone ID promotion/local row continuity | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 | New path Run-triggered workspace loading | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend workspace history panel | Pass | Pass | Pass | Pass | Row renderer remains presentational; remove policy comes from row metadata. |
| Frontend run-history read model/projection | Pass | Pass | Pass | Pass | Correct owner for descriptor eligibility, local row snapshots, descriptor-only gating, and dedupe. |
| Frontend launch config | Pass | Pass | Pass | Pass | `RunConfigPanel` is the right boundary for final workspace readiness before context creation. |
| Frontend workspace store | Pass | Pass | Pass | Pass | Reuses existing `createWorkspace` and metadata store; no second durable workspace source. |
| Backend workspaces | Pass | Pass | Pass | Pass | `WorkspaceManager` owns temp/registered identity and should own read-root resolution. |
| Backend run history | Pass | Pass | Pass | Pass | History service remains root-scoped; resolver stays thin. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Projection workspace descriptor | Pass | Pass | Pass | Pass | Keeping projection-only descriptor shape in `runTreeProjection.ts` is appropriately narrow. |
| Descriptor eligibility/dedupe | Pass | Pass | Pass | Pass | Keeping in `runHistoryReadModel.ts` avoids a second workspace visibility authority. |
| Visible workspace read-root resolver | Pass | Pass | Pass | Pass | Belongs in `WorkspaceManager`, not GraphQL resolver or history service. |
| Local run snapshot / row source | Pass | Pass | Pass | Pass | Distinguishes local permanent rows from drafts/history. |
| Pending workspace input payload | Pass | Pass | Pass | Pass | Small mode/path payload is intentionally not durable workspace metadata. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ProjectionWorkspaceDescriptor` | Pass | Pass | Pass | Pass | Keeps identity/root/name/kind/removability only. |
| `RunTreeWorkspaceNode` | Pass | Pass | Pass | Pass | Adds action metadata without becoming a backend DTO. |
| `LocalRunSnapshot` | Pass | Pass | Pass | Pass | Standalone local runs only; no mixed team fields. |
| `RunTreeRowSource` | Pass | Pass | Pass | Pass | `history`, `draft`, `local` have distinct authority/action semantics. |
| Pending workspace input payload | Pass | Pass | Pass | Pass | `mode` and `pendingPath` are launch input only. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Temp descriptor exclusion | Pass | Pass | Pass | Pass | Replace with explicit visible descriptor eligibility. |
| Every workspace row removable assumption | Pass | Pass | Pass | Pass | Replace with `canRemoveFromWorkspaces`. |
| Registered-only history read root lookup | Pass | Pass | Pass | Pass | Replace read path with visible workspace root resolver; removal remains registered-only. |
| Draft-ID-only local projection | Pass | Pass | Pass | Pass | Replace with local row snapshots and `local` source. |
| New path local-only + `Load` UI/event path | Pass | Pass | Pass | Pass | Decommission `load-new` pass-through and button; Run becomes sole submit/load boundary. |
| History-created top-level rows | Pass | Pass | Pass | Pass | Explicitly remains decommissioned; descriptor-only gating preserved. |
| Backend temp-root launch registration cleanup | Pass | Pass | Pass | Pass | Named as follow-up with in-scope duplicate descriptor handling. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/runHistoryReadModel.ts` | Pass | Pass | Pass | Pass | Correct composition point for workspace descriptors and local snapshots. |
| `autobyteus-web/utils/runTreeProjection.ts` | Pass | Pass | Pass | Pass | Pure projection remains store-free. |
| `autobyteus-web/components/workspace/config/WorkspaceSelector.vue` | Pass | Pass | Pass | Pass | Owns UI mode/path only, not registration. |
| `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | Pass | Pass | N/A | Pass | Pass-through wrapper only. |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Pass | Pass | N/A | Pass | Pass-through wrapper only. |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | Pass | Pass | Pass | Pass | Correct owner for async launch guard and workspace readiness. |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Pass | Pass | N/A | Pass | Render remove action from metadata; no store imports. |
| `autobyteus-web/stores/runHistorySelectionActions.ts` | Pass | Pass | N/A | Pass | `local` rows should select via local context path. |
| `autobyteus-web/composables/useWorkspaceHistoryMutations.ts` | Pass | Pass | N/A | Pass | Correct gate for row actions by source. |
| `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | Pass | Pass | N/A | Pass | Correct owner for temp/registered root resolution. |
| `autobyteus-server-ts/src/api/graphql/types/run-history.ts` | Pass | Pass | N/A | Pass | Thin resolver delegates workspace-root authority. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace list as top-level row authority | Pass | Pass | Pass | Pass | Design forbids `workspaceGroups`/local contexts from creating roots without descriptors. |
| `WorkspaceManager` | Pass | Pass | Pass | Pass | Resolvers must use manager methods instead of registry/temp internals. |
| `workspaceStore.createWorkspace` | Pass | Pass | Pass | Pass | Run panel reuses existing registration boundary. |
| `WorkspaceSelector` event contract | Pass | Pass | Pass | Pass | Parent receives explicit event rather than reading child internals. |
| `RunConfigPanel` launch sequence | Pass | Pass | Pass | Pass | Context stores do not own workspace loading. |
| `buildRunTreeProjection` | Pass | Pass | Pass | Pass | Projection stays pure; components/stores do not manually merge rows. |
| Workspace row renderer | Pass | Pass | Pass | Pass | Renderer uses node metadata/callbacks, not store calls or hard-coded temp ID policy. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceManager` | Pass | Pass | Pass | Pass | Adds read resolver rather than exposing registry/temp construction elsewhere. |
| `RunHistoryResolver.workspaceRunHistory` | Pass | Pass | Pass | Pass | Transport facade remains thin. |
| `workspaceStore.createWorkspace` | Pass | Pass | Pass | Pass | Used by run panel for registration; no duplicate registration policy. |
| `WorkspaceSelector` | Pass | Pass | Pass | Pass | Emits current input state; does not load/register. |
| `RunConfigPanel` | Pass | Pass | Pass | Pass | Owns launch readiness and duplicate-click guard. |
| `buildRunHistoryTreeNodes` | Pass | Pass | Pass | Pass | Components do not determine workspace eligibility. |
| `buildRunTreeProjection` | Pass | Pass | Pass | Pass | Store-free pure assembly and dedupe boundary is preserved. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `workspaces()` | Pass | Pass | Pass | Low | Pass |
| `workspaceRunHistory(workspaceId, limitPerAgent)` | Pass | Pass | Pass | Low | Pass |
| `removeWorkspace(input.workspaceId)` | Pass | Pass | Pass | Low | Pass |
| `WorkspaceSelector @workspace-input-change` | Pass | Pass | Pass | Low | Pass |
| Removed `WorkspaceSelector @load-new` | Pass | Pass | Pass | Low | Pass |
| `RunConfigPanel.ensurePendingWorkspaceLoadedForRun` | Pass | Pass | Pass | Low | Pass |
| `buildRunHistoryTreeNodes(params)` | Pass | Pass | Pass | Low | Pass |
| `buildRunTreeProjection(input)` | Pass | Pass | Pass | Low | Pass |
| `WorkspaceHistoryWorkspaceSection` props | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores` read-model/actions | Pass | Pass | Low | Pass | Existing state/read-model/action layout is respected. |
| `autobyteus-web/utils/runTreeProjection.ts` | Pass | Pass | Low | Pass | Pure utility is appropriately placed. |
| `autobyteus-web/components/workspace/config` | Pass | Pass | Low | Pass | Selector/forms/panel map to UI input and launch sequencing. |
| `autobyteus-web/components/workspace/history` | Pass | Pass | Low | Pass | Panel/section contracts remain in workspace history UI. |
| `autobyteus-server-ts/src/workspaces` | Pass | Pass | Low | Pass | Workspace identity/root resolution belongs here. |
| `autobyteus-server-ts/src/api/graphql/types` | Pass | Pass | Medium | Pass | Existing transport layout is acceptable if resolver logic stays thin. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Sidebar projection | Pass | Pass | N/A | Pass | Extends current read model/projection. |
| Row actions | Pass | Pass | N/A | Pass | Extends current section contract. |
| Backend workspace root ownership | Pass | Pass | N/A | Pass | Extends `WorkspaceManager`. |
| Workspace-scoped history grouping | Pass | Pass | N/A | Pass | Reuses service with resolved root. |
| Local run lifecycle | Pass | Pass | N/A | Pass | Reuses agent/team context stores. |
| Workspace path registration | Pass | Pass | N/A | Pass | Reuses `workspaceStore.createWorkspace`. |
| Pending path input | Pass | Pass | N/A | Pass | Extends `WorkspaceSelector` event contract. |
| Launch sequencing | Pass | Pass | N/A | Pass | Extends `RunConfigPanel.handleRun`. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| History-created top-level workspace rows | No | Pass | Pass | Design explicitly rejects restoring this path. |
| Hidden removed-root suppression list | No | Pass | Pass | Workspace descriptor authority remains singular. |
| Temp remove backend-error fallback | No | Pass | Pass | Capability metadata hides action instead. |
| Raw root path history query | No | Pass | Pass | Query remains workspace-ID based. |
| Explicit New workspace `Load` action | No | Pass | Pass | Button/event/Enter preload behavior are decommissioned. |
| Backend temp-root auto-registration cleanup | Yes, deferred current backend behavior remains | Pass | Pass | Deferral is explicit and in-scope frontend dedupe controls user-visible duplication/removability. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Backend temp history root resolution | Pass | Pass | Pass | Pass |
| Projection type/read-model updates | Pass | Pass | Pass | Pass |
| New workspace input propagation | Pass | Pass | Pass | Pass |
| Run-triggered workspace load sequencing | Pass | Pass | Pass | Pass |
| Projection row dedupe/source semantics | Pass | Pass | Pass | Pass |
| UI/action gating | Pass | Pass | Pass | Pass |
| Test updates | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Temp descriptor eligibility | Yes | Pass | Pass | Pass | Concrete temp descriptor example included. |
| Removed history suppression | Yes | Pass | Pass | Pass | Good/bad shapes clearly preserve removal invariant. |
| Row action policy | Yes | Pass | Pass | Pass | Data-driven `canRemoveFromWorkspaces` example is clear. |
| Temp history read | Yes | Pass | Pass | Pass | Shows ID-based query through manager resolver. |
| Local permanent row | Yes | Pass | Pass | Pass | Explains why `local` is distinct from `draft`. |
| New path Run-triggered load | Yes | Pass | Pass | Pass | Explains stale Temp Workspace avoided shape. |
| New-mode helper text | Yes | Pass | Pass | Pass | Covers the screenshot issue. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None blocking | Reviewed use cases cover temp/default agent and team launches, selected existing workspaces, removed history suppression, same-root dedupe, non-removable temp rows, ID promotion continuity, New path auto-load, failure blocking, and Load-button removal. | None before implementation. | Closed for design. |
| Backend launch may register temp root as filesystem | Could produce same-root duplicate descriptors after reload. | Implement frontend same-root dedupe now; consider backend semantic cleanup later only if product wants it. | Residual non-blocking risk recorded. |
| Pending input reset across active config changes | Stale pending input could launch wrong path if implementation misses reset. | Implement design guidance to key/reset pending input on active config changes or rely on immediate child emits with tests. | Implementation caution, not a design blocker. |

## Review Decision

Pass: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no design findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Backend run provisioning can still register the temp root as a filesystem workspace. The design contains this user-visible risk through same-root descriptor dedupe and fixed temp non-removability; deeper backend cleanup is explicitly deferred.
- `handleRun` becomes asynchronous, so implementation must make duplicate-click prevention and post-load readiness re-checks durable.
- Pending New workspace input must be reset or refreshed when the active agent/team config changes; the design calls this out and tests should cover it.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Approved for implementation with no blocking findings. Implementer should keep the descriptor-only top-level row invariant, remove the user-facing `Load` path completely, and add the specified durable coverage.
