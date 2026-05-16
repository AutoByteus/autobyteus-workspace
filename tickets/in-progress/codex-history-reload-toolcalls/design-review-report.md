# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/design-spec.md`
- Reviewed Rework Addendum: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-history-reload-toolcalls/tickets/in-progress/codex-history-reload-toolcalls/design-rework-addendum.md`
- Current Review Round: 4
- Trigger: Fresh review after latest user clarification that normal UI history only needs locally recorded application replay history; Codex native fallback/recovery is not required.
- Prior Review Round Reviewed: 3
- Latest Authoritative Round: 4
- Current-State Evidence Basis: Refined requirements, revised design spec, latest local-replay addendum, post-delivery reproduction note, backend projection JSON evidence, screenshot evidence, and current code reads of `AgentRunViewProjectionService`, `TeamMemberRunViewProjectionService`, and `LocalMemoryRunViewProjectionProvider`.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design review for Codex native dynamic/MCP provider coverage and invocation-aware merge | N/A | No | Pass | No | Superseded. |
| 2 | Turn-aware local/native merge addendum | No prior unresolved findings | No blocking findings | Pass | No | Superseded; turn-aware merge is no longer the intended fix. |
| 3 | Codex-native-provider-only source authority | Round 2 superseded | No blocking findings | Pass | No | Superseded by latest user clarification; Codex native provider is not the normal display source. |
| 4 | Local replay trace is sole normal UI history source | Round 3 direction rechecked and superseded | No blocking design findings | Pass | Yes | Ready for implementation rework. |

## Reviewed Design Spec

Round 4 reviews the latest requirements/spec/addendum that establish one normal UI display authority: the local application-owned replay trace/provider. `getRunProjection` and `getTeamMemberRunProjection` should not call, fallback to, or merge with runtime-native providers such as `CodexRunViewProjectionProvider`. Missing older local histories may return empty/incomplete projections. Frontend remains canonical-projection-only.

This supersedes both prior rework directions: local/native turn-aware merge and Codex-native-provider-only display history.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Requirements/design classify this as `Bug Fix + Source-Authority Refactor`. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Classification is `Boundary Or Ownership Issue / Duplicated Policy Or Coordination`; reproduction shows duplicate tails caused by mixed local/runtime-native display sources. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor posture is likely/needed; implementation sequence removes runtime-native provider selection/fallback/merge from normal UI history. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Design gives source invariant, spine, ownership map, removal plan, file mapping, tests, and accepted missing-local-history behavior. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | Superseded. | Latest requirements reject Codex-native display recovery. | Provider dynamic/MCP coverage is no longer a normal UI display requirement. |
| 2 | N/A | N/A | Superseded/obsolete. | Latest addendum says no local/native merge. | Turn-aware merge should not be implementation acceptance evidence. |
| 3 | N/A | N/A | Superseded/obsolete. | Latest addendum says local replay, not Codex native thread, is display authority. | Round 4 is authoritative. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Standalone normal UI history from local replay | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Team-member normal UI history from member local replay | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Local trace records to canonical projection rows | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Frontend canonical hydration | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Run-history service source authority | Pass | Pass | Pass | Pass | `AgentRunViewProjectionService` owns local-only normal UI source policy. |
| Team-member history facade | Pass | Pass | Pass | Pass | Resolves member and memory layout, then delegates local replay projection. |
| Local replay/raw trace provider | Pass | Pass | Pass | Pass | Existing `LocalMemoryRunViewProjectionProvider`/transformer is the right capability to reuse, with naming/docs tightened if needed. |
| Runtime-native providers | Pass | Pass | Pass | Pass | Decommission from normal display path; retain only if explicitly scoped to non-UI diagnostics. |
| Frontend hydration | Pass | Pass | Pass | Pass | Consumes canonical rows only. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Local trace to historical replay events | Pass | Pass | Pass | Pass | Existing transformer is the stable display replay conversion point. |
| Local replay projection provider | Pass | Pass | Pass | Pass | Existing provider can be reused/renamed; source ownership is clear. |
| Projection merge helper | Pass | N/A | Pass | Pass | Not needed in normal UI path; may remain only for explicit separate use cases. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Canonical `RunProjection` | Pass | Pass | Pass | N/A | External shape unchanged. |
| Local raw/replay trace records | Pass | Pass | Pass | N/A | They are the sole display input and may also serve memory/diagnostics; no runtime-native display reconciliation. |
| `AgentRunMetadata.memoryDir` | Pass | Pass | Pass | N/A | Provides member/local storage identity, not runtime source fallback. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `CodexRunViewProjectionProvider` in normal display path | Pass | Pass | Pass | Pass | Remove from `getRunProjection` / `getTeamMemberRunProjection` normal path; delete or re-scope if unused. |
| Local/native `mergeProjectionBundles` in normal UI display | Pass | Pass | Pass | Pass | Replaced by single local replay projection. |
| `TeamMemberLocalRunProjectionReader` bypass | Pass | Pass | Pass | Pass | Use unified local replay provider with member `memoryDir`; remove if feasible. |
| Codex provider dynamic/MCP coverage as UI requirement | Pass | Pass | Pass | Pass | No longer a normal UI requirement. |
| Frontend runtime-specific workaround | Pass | Pass | Pass | Pass | Explicitly not in scope. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-history/services/agent-run-view-projection-service.ts` | Pass | Pass | Pass | Pass | Should always load local replay provider for normal UI APIs. |
| `run-history/services/team-member-run-view-projection-service.ts` | Pass | Pass | Pass | Pass | Resolve member and memoryDir; no source merge or runtime-native calls. |
| `run-history/projection/providers/local-memory-run-view-projection-provider.ts` | Pass | Pass | Pass | Pass | Display replay provider; rename or document if `Memory` naming causes ambiguity. |
| `run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | Pass | Pass | N/A | Pass | Preserve reasoning/tool/text order from local traces. |
| `run-history/projection/providers/codex-run-view-projection-provider.ts` | Pass | Pass | N/A | Pass | Not a normal UI history owner; delete or scope outside display path. |
| `run-history/projection/run-projection-provider-registry.ts` | Pass | Pass | N/A | Pass | Must not select runtime-native providers for normal display APIs. |
| `run-history/projection/run-projection-merge.ts` | Pass | Pass | N/A | Pass | Not used in normal display path. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| GraphQL history resolvers | Pass | Pass | Pass | Pass | Depend on run-history services only. |
| `AgentRunViewProjectionService` | Pass | Pass | Pass | Pass | Depends on local replay provider only for normal UI history. |
| `TeamMemberRunViewProjectionService` | Pass | Pass | Pass | Pass | Depends on metadata/memory layout and delegates projection. |
| Normal UI history APIs | Pass | Pass | Pass | Pass | Must not depend on Codex thread reader/provider or runtime-native fallback. |
| Frontend hydration | Pass | Pass | Pass | Pass | Canonical projection rows only. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRunViewProjectionService.getProjection*` | Pass | Pass | Pass | Pass | Encapsulates local-only display source policy. |
| Local replay projection provider | Pass | Pass | Pass | Pass | Encapsulates local trace read/replay conversion. |
| `TeamMemberRunViewProjectionService` | Pass | Pass | Pass | Pass | Metadata/memory path facade only. |
| Frontend projection hydration | Pass | Pass | Pass | Pass | No source-specific rendering. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `getRunProjection(runId)` | Pass | Pass | Pass | Low | Pass |
| `getTeamMemberRunProjection(teamRunId, memberRouteKey)` | Pass | Pass | Pass | Medium | Pass |
| `AgentRunViewProjectionService.getProjectionFromMetadata(...)` | Pass | Pass | Pass | Medium | Pass |
| Local replay provider `buildProjection(...)` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-history/services/` | Pass | Pass | Low | Pass | Correct for UI history service boundaries. |
| `run-history/projection/providers/local-memory-run-view-projection-provider.ts` | Pass | Pass | Medium | Pass | Medium naming risk only; ownership can be clarified by rename/docs. |
| `run-history/projection/transformers/` | Pass | Pass | Low | Pass | Correct for raw trace to replay event conversion. |
| `agent-execution/backends/codex/history/` provider files | Pass | Pass | Low | Pass | If retained, they are non-normal-display runtime utilities. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Local replay projection | Pass | Pass | N/A | Pass | Reuse existing local-memory provider and raw-trace transformer. |
| Team-member memory layout | Pass | Pass | N/A | Pass | Reuse `TeamMemberMemoryLayout`. |
| Runtime-native Codex provider | Pass | Pass | N/A | Pass | Decommission from normal UI path. |
| Frontend hydration | Pass | Pass | N/A | Pass | No production changes required unless canonical rows fail. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Runtime-native fallback/recovery for display | Yes, existing/recent behavior | Pass | Pass | Remove from normal UI history. |
| Local/native merge for display | Yes, existing/recent behavior | Pass | Pass | Remove from normal UI history. |
| Codex provider display requirement | Yes, prior design | Pass | Pass | Superseded. |
| Missing old local histories | No compatibility recovery | Pass | Pass | Empty/incomplete display is accepted. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Source-policy tests first | Pass | Pass | Pass | Pass |
| `AgentRunViewProjectionService` local-only refactor | Pass | Pass | Pass | Pass |
| Team-member local memoryDir delegation | Pass | Pass | Pass | Pass |
| Runtime-native provider decommission from normal path | Pass | Pass | Pass | Pass |
| Merge removal from normal path | Pass | Pass | Pass | Pass |
| Frontend canonical test preservation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Bad local+Codex native merge shape | Yes | Pass | Pass | Pass | Clearly describes duplicate-tail source. |
| Good local-only Codex team-member shape | Yes | Pass | N/A | Pass | Shows member local replay trace to canonical projection. |
| Missing local history behavior | Yes | Pass | N/A | Pass | Explicitly returns empty/incomplete, no fallback. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Older runs without local trace | UI will be empty/incomplete. | Accepted by refined requirements; document clearly. | Accepted residual risk. |
| Local trace write gaps | Reload can only be as complete as locally recorded history. | Future defects should route to local trace write/read/projection boundary. | Accepted residual risk. |
| `LocalMemoryRunViewProjectionProvider` naming | Could confuse display authority with broader memory feature. | Rename or document local replay display ownership during implementation/docs. | Non-blocking implementation guidance. |
| Remaining Codex provider tests/docs | May imply Codex provider is still normal UI source. | Re-scope/delete/update tests/docs so normal display source is unambiguous. | Non-blocking implementation guidance. |

## Review Decision

- `Pass`: the local-only display-source design is ready for implementation rework.

## Findings

None.

## Classification

N/A - no blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Implementation must remove runtime-native provider selection/fallback/merge from the normal `getRunProjection` and `getTeamMemberRunProjection` paths, not merely add tests around Codex.
- If `CodexRunViewProjectionProvider` remains in the codebase, it must be unreachable from normal UI history and clearly scoped as non-display/diagnostic utility.
- Team-member history should use the same local replay provider path with member `memoryDir`; avoid a second direct raw-trace reader bypass unless it is explicitly owned and not duplicative.
- Keep frontend production logic runtime-agnostic.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Proceed to implementation rework. This Round 4 report supersedes all prior review directions. The design now has one display source authority: local replay trace/provider for every runtime, with no runtime-native fallback/recovery or local/native merge in normal UI history.
