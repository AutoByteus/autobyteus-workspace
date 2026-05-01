# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/archive-run-history/autobyteus-web/tickets/done/history-run-archive/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/archive-run-history/autobyteus-web/tickets/done/history-run-archive/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/archive-run-history/autobyteus-web/tickets/done/history-run-archive/design-spec.md`
- Related Rework Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/archive-run-history/autobyteus-web/tickets/done/history-run-archive/design-rework-log.md`
- Current Review Round: 2
- Trigger: Focused re-review after `AR-ARCH-001` design rework.
- Prior Review Round Reviewed: 1
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Re-read design rework log, updated requirements, updated investigation notes, updated design spec path-safety sections, and representative current-code paths for metadata path derivation and delete safe-directory pattern.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial architecture review | N/A | 1 | Fail | No | Found `AR-ARCH-001`: direct archive mutations needed service-owned invalid/path-unsafe ID rejection before metadata read/write. |
| 2 | Focused re-review after `AR-ARCH-001` rework | `AR-ARCH-001` | 0 | Pass | Yes | Rework adds requirements, design invariant, boundary rules, interface constraints, examples, migration steps, and tests for path-safe archive IDs. |

## Reviewed Design Spec

`/Users/normy/autobyteus_org/autobyteus-worktrees/archive-run-history/autobyteus-web/tickets/done/history-run-archive/design-spec.md`

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The design classifies this as a feature / behavior change. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Missing invariant plus shared structure looseness is tied to absent durable archive state, metadata normalizer optional-field loss risk, and direct archive ID path-safety risk. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Bounded local refactor is explicitly required for metadata preservation, frontend cleanup reuse, and service-level archive identity/path validation. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | File mapping, ownership boundaries, path-safety invariant, metadata-store tightening, local cleanup extraction, and migration sequence reflect the refactor decision. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-ARCH-001 | High | Resolved | Requirements now include `FR-ARCH-012` and `AC-ARCH-011`; design spec adds `Archive Identity / Path Safety Invariant`; archive spines place service-level safe ID/path validation before metadata stores; boundary/dependency/interface sections forbid resolver-only validation and metadata access before validation; implementation guidance requires unsafe-ID tests proving `success=false` and no out-of-root write. | No remaining design-impact issue. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-ARCH-001 | Agent archive primary path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-ARCH-002 | Team archive primary path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-ARCH-003 | Default list filtering path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-ARCH-004 | Archive response / UI cleanup return path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-ARCH-005 | Metadata normalization bounded local path | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend run history | Pass | Pass | Pass | Pass | Agent/team services own archive/list policy and direct archive path-safety validation. |
| Metadata persistence | Pass | Pass | Pass | Pass | Metadata stores persist/normalize archive state and optional fields; they are not the archive eligibility guard. |
| GraphQL API | Pass | Pass | Pass | Pass | Resolver files stay thin; explicit agent/team mutations avoid ambiguous subject IDs. |
| Frontend run history state | Pass | Pass | Pass | Pass | Store-owned cleanup avoids component-level state mutation. |
| Frontend workspace history UI | Pass | Pass | Pass | Pass | Presentation and UI intent concerns remain separate. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend local visible-row/context/selection cleanup | Pass | Pass | Pass | Pass | Cleanup must be shared under `runHistoryStore`/support, not copied into UI. |
| Mutation result shape | Pass | Pass | Pass | Pass | Operation-specific result types keep subject boundaries clear. |
| Archive timestamp normalization | Pass | Pass | Pass | Pass | Store-local normalization is acceptable; no generic helper required unless implementation naturally benefits. |
| Archive safe identity/path helpers | Pass | Pass | Pass | Pass | Private service-level helpers are justified because the policy belongs to the archive command boundary. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `archivedAt` metadata field | Pass | Pass | Pass | N/A | Pass | Timestamp-only state avoids parallel `isArchived`. |
| Agent/team metadata normalizers | Pass | Pass | Pass | Pass | Pass | Design explicitly preserves optional `applicationExecutionContext` fields. |
| Index rows | Pass | Pass | Pass | N/A | Pass | Index remains read model, not archive authority. |
| Archive ID identity shape | Pass | Pass | Pass | N/A | Pass | Agent and team run IDs are explicit safe base-name identities, not path selectors. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend-only archived ID list | Pass | Pass | Pass | Pass | Correctly rejected. |
| Index-row removal as archive | Pass | Pass | Pass | Pass | Correctly rejected; permanent delete remains separate. |
| Duplicate local cleanup branches | Pass | Pass | Pass | Pass | Correctly requires one cleanup policy owner. |
| Resolver-only path validation | Pass | Pass | Pass | Pass | Correctly rejected in favor of service-owned archive boundary validation. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/store/*metadata*` | Pass | Pass | Pass | Pass | Metadata shape/normalization responsibilities are clear. |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts` | Pass | Pass | Pass | Pass | Owns agent archive/list policy and pre-metadata safe ID/path validation. |
| `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts` | Pass | Pass | Pass | Pass | Owns team archive/list policy and pre-metadata safe ID/path validation. |
| `autobyteus-server-ts/src/api/graphql/types/*run-history.ts` | Pass | Pass | N/A | Pass | Resolvers remain transport facades. |
| `autobyteus-web/stores/runHistoryStore.ts` / support | Pass | Pass | Pass | Pass | Store owns Apollo calls and cleanup. |
| `autobyteus-web/composables/useWorkspaceHistoryMutations.ts` | Pass | Pass | N/A | Pass | UI intent/pending/toast owner is clear. |
| `autobyteus-web/components/workspace/history/*` | Pass | Pass | N/A | Pass | Row rendering and panel wiring stay presentation-level. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend UI -> store/composable | Pass | Pass | Pass | Pass | Components do not call GraphQL directly. |
| Resolver -> history service | Pass | Pass | Pass | Pass | Resolver must not own archive or path-safety policy. |
| History service -> private path-safety helper / metadata/index/runtime managers | Pass | Pass | Pass | Pass | Correct backend dependency direction; metadata access happens only after service-level identity safety. |
| Workspace history service -> agent/team list services | Pass | Pass | Pass | Pass | Workspace grouping should not re-read metadata. |
| Metadata stores -> filesystem | Pass | Pass | Pass | Pass | Stores persist only; they do not decide archive eligibility. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRunHistoryService.archiveStoredRun` | Pass | Pass | Pass | Pass | Now explicitly encapsulates safe ID/path validation, active guard, metadata read/write, and timestamp assignment. |
| `TeamRunHistoryService.archiveStoredTeamRun` | Pass | Pass | Pass | Pass | Now explicitly encapsulates safe ID/path validation, active guard, metadata read/write, and timestamp assignment. |
| `AgentRunHistoryService.listRunHistory` / `TeamRunHistoryService.listTeamRunHistory` | Pass | Pass | Pass | Pass | Backend-authoritative filtering is correctly placed. |
| `runHistoryStore.archiveRun/archiveTeamRun` | Pass | Pass | Pass | Pass | UI bypass of store internals is controlled. |
| Metadata stores | Pass | Pass | Pass | Pass | Persistence boundary is clear; command-level safety sits in services. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `archiveStoredRun(runId: String!)` | Pass | Pass | Pass | Low | Pass |
| `archiveStoredTeamRun(teamRunId: String!)` | Pass | Pass | Pass | Low | Pass |
| `listWorkspaceRunHistory(limitPerAgent)` | Pass | Pass | Pass | Low | Pass |
| `runHistoryStore.archiveRun(runId)` | Pass | Pass | Pass | Low | Pass |
| `runHistoryStore.archiveTeamRun(teamRunId)` | Pass | Pass | Pass | Low | Pass |
| Metadata `archivedAt` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/services` | Pass | Pass | Low | Pass | Archive/list/path-safety policy fits existing service folder. |
| `autobyteus-server-ts/src/run-history/store` | Pass | Pass | Low | Pass | Archive metadata persistence fits existing store folder. |
| `autobyteus-server-ts/src/api/graphql/types` | Pass | Pass | Low | Pass | Existing resolver placement is acceptable. |
| `autobyteus-web/stores` | Pass | Pass | Medium | Pass | Large store is a residual maintainability risk but acceptable for this bounded change. |
| `autobyteus-web/components/workspace/history` | Pass | Pass | Low | Pass | Existing UI placement is appropriate. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Persist archive state | Pass | Pass | N/A | Pass | Metadata stores are reused/extended. |
| Default filtering | Pass | Pass | N/A | Pass | Agent/team history list services are reused/extended. |
| Direct archive ID/path safety | Pass | Pass | Pass | Pass | Existing delete safe-directory pattern is checked and adapted under the same service capability area. |
| Archive API | Pass | Pass | N/A | Pass | GraphQL resolver modules are reused/extended. |
| UI archive action | Pass | Pass | N/A | Pass | Existing history UI/composable is reused/extended. |
| Archived view/unarchive | Pass | Pass | N/A | Pass | Deferral is acceptable as residual product risk. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Delete vs archive API | No | Pass | Pass | Separate archive mutations avoid soft-delete flags. |
| Old metadata without `archivedAt` | No | Pass | Pass | Missing field defaulting is data migration, not dual behavior. |
| Frontend-only hide state | No | Pass | Pass | Correctly rejected. |
| Resolver-only path-safety policy | No | Pass | Pass | Correctly rejected; service remains authoritative. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Metadata model/store tightening | Pass | Pass | Pass | Pass |
| Backend archive/list/path-safety behavior | Pass | Pass | Pass | Pass |
| GraphQL API and frontend mutation docs | Pass | Pass | Pass | Pass |
| Frontend store/UI cleanup | Pass | Pass | Pass | Pass |
| Localization/codegen/verification | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Archive storage | Yes | Pass | Pass | Pass | Good concrete storage example. |
| Archive vs delete | Yes | Pass | Pass | Pass | Good distinction. |
| Agent/team identity | Yes | Pass | Pass | Pass | Explicit mutations are clear. |
| Active override | Yes | Pass | Pass | Pass | Example captures active archived visibility. |
| Invalid/path-unsafe IDs | Yes | Pass | Pass | Pass | Design now gives valid and invalid examples plus service-level placement. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Direct GraphQL archive mutation with path-unsafe or traversal-like IDs | Archive writes metadata through filesystem paths derived from user-supplied IDs. | Covered by `FR-ARCH-012`, `AC-ARCH-011`, service-level invariant, and backend test guidance. | Resolved |
| Archived-list/unarchive UI | Product risk: accidental archive has no first-slice UI recovery. | Keep as recorded residual risk unless product scope changes. | Accepted residual risk |

## Review Decision

Pass: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no open findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Archived-list/unarchive UI is intentionally deferred; data remains on disk, but users have no first-slice UI undo.
- UI action density remains a design/implementation risk because inactive rows will expose archive and permanent delete actions together.
- `runHistoryStore` is already large; cleanup reuse should avoid further policy duplication.
- GraphQL generated artifacts and localization generated files may need refresh depending on repository workflow.
- Path-safety implementation should include both base-name/separator checks and resolved containment checks, as specified; tests must prove no out-of-root metadata write.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: `AR-ARCH-001` is resolved. Ownership, spine, metadata model, frontend/backend split, path-safety boundary, migration plan, and test guidance are ready for implementation.
