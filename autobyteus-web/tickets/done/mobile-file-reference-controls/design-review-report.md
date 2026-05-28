# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-file-reference-controls/autobyteus-web/tickets/done/mobile-file-reference-controls/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-file-reference-controls/autobyteus-web/tickets/done/mobile-file-reference-controls/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-file-reference-controls/autobyteus-web/tickets/done/mobile-file-reference-controls/design-spec.md`
- Current Review Round: 1
- Trigger: Initial architecture review requested by `solution_designer` for mobile Files and Team Communication reference controls.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Reviewed the three upstream artifacts and sampled current implementation evidence in `MobileFiles.vue`, `MobileFileViewer.vue`, `useMobileFileContextCoordinator.ts`, `MobileTeamMessages.vue`, `TeamCommunicationPanel.vue`, `TeamCommunicationReferenceViewer.vue`, `useWorkspaceFileExplorer.ts`, `workspaceStore.fetchFolderChildren`, `fileExplorerStore.openFilePreview/searchFiles`, `FileViewer.vue`, viewer components, and authorized-resource helpers.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design review | N/A | No | Pass | Yes | Design is actionable and aligned with existing ownership boundaries. |

## Reviewed Design Spec

The design targets phone-first mobile parity for workspace Files and Team Communication `referenceFiles` without importing desktop split-pane containers or conflating references with Artifacts. It introduces a mobile workspace-file composable over existing workspace/file-explorer owners, broadens mobile read-only file viewing through existing viewer/protected-resource paths, and adds mobile reference rows plus a mobile wrapper around the existing message-owned reference viewer.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design classifies the task as a bug fix/mobile parity behavior change with local refactor. | None |
| Root-cause classification is explicit and evidence-backed | Pass | Classifies as boundary/ownership issue plus file responsibility drift; evidence matches mobile components bypassing lazy load/search/reference-viewer owners. | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor needed now is stated and bounded to mobile workspace-file adapter, attachment coordinator narrowing, and reference presentation helper. | None |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Removal/decommission plan, file mapping, dependency rules, and migration sequence all reflect the refactor. | None |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | Initial round. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-MFRC-001 | Mobile Files workspace resolution/root render | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-MFRC-002 | Folder tap/lazy children | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-MFRC-003 | Workspace search | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-MFRC-004 | File tap/read-only viewer | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-MFRC-005 | Team reference tap/viewer | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-MFRC-006/007 | Store hydration/update returns | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-MFRC-008 | Mobile sheet open/close local flow | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Mobile work shell | Pass | Pass | Pass | Pass | Reuses tab entry; no shell redesign. |
| Mobile workspace files | Pass | Pass | Pass | Pass | New composable is justified as mobile context adapter, not a new state owner. |
| Workspace/file explorer core | Pass | Pass | Pass | Pass | Existing stores remain authoritative for tree, lazy load, search, and open-file state. |
| Team Communication | Pass | Pass | Pass | Pass | Mobile wrapper delegates content to existing message-owned viewer/route. |
| Protected resource loading | Pass | Pass | Pass | Pass | Design correctly requires authorized fetch/object URL handling for protected REST resources. |
| Artifacts | Pass | Pass | Pass | Pass | Explicitly preserved and kept separate from Team Communication references. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Reference display name/icon/extension mapping | Pass | Pass | Pass | Pass | `utils/teamCommunication/referenceFilePresentation.ts` is presentation-only and avoids desktop/mobile drift. |
| Mobile workspace root normalization/resolution | Pass | Pass | Pass | Pass | Belongs in mobile composable because the invariant is context-specific. |
| File preview support classification | Pass | Pass | Pass | Pass | Moves out of attachment coordinator and avoids a parallel mobile file-content store. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TeamCommunicationReferenceFile` | Pass | Pass | Pass | N/A | Pass | Design reuses existing structured reference shape. |
| `OpenFileState` | Pass | Pass | Pass | N/A | Pass | Design reuses existing workspace file open/content state. |
| Reference presentation helper return values | Pass | Pass | Pass | Pass | Pass | Narrow return shape prevents content-fetching leakage. |
| Mobile workspace-file composable outputs | Pass | Pass | Pass | Pass | Pass | `workspaceId`, `workspace`, and `resolutionStatus` are called out to avoid ambiguous fallback. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Text-only preview methods in `useMobileFileContextCoordinator.ts` | Pass | Pass | Pass | Pass | Attachment coordinator is narrowed back to attachment policy. |
| Mobile reference count-only UI | Pass | Pass | Pass | Pass | Count may remain only as metadata if tappable rows exist. |
| Local root matching without normalization | Pass | Pass | Pass | Pass | Replacement is context-scoped normalization in new composable. |
| Loaded-tree-only deep search | Pass | Pass | Pass | Pass | Replacement is `fileExplorerStore.searchFiles()` for workspace-wide search. |
| Desktop-only reference display mapping | Pass | Pass | Pass | Pass | Shared helper replaces duplicated mapping. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `composables/mobile/useMobileWorkspaceFileExplorer.ts` | Pass | Pass | Pass | Pass | Clear mobile adapter over existing stores. |
| `components/mobile/MobileFiles.vue` | Pass | Pass | Pass | Pass | Presentation, folder stack, filter/search controls, and sheet state only. |
| `components/mobile/MobileFileViewer.vue` | Pass | Pass | Pass | Pass | Read-only phone viewer plus attach placement. |
| `composables/mobile/useMobileFileContextCoordinator.ts` | Pass | Pass | Pass | Pass | Attachment target coordinator only after preview removal. |
| `utils/teamCommunication/referenceFilePresentation.ts` | Pass | Pass | Pass | Pass | Shared display helper, not a service. |
| `components/mobile/MobileTeamMessages.vue` | Pass | Pass | Pass | Pass | Mobile message/reference rows and selected reference sheet state. |
| `components/mobile/MobileTeamReferenceViewer.vue` | Pass | Pass | N/A | Pass | Thin phone wrapper around content-level reference viewer. |
| `components/workspace/team/TeamCommunicationPanel.vue` | Pass | Pass | Pass | Pass | Desktop behavior preserved while consuming helper. |
| Docs files | Pass | Pass | N/A | Pass | Documentation updates are appropriately downstream/delivery-scoped. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Mobile components | Pass | Pass | Pass | Pass | Explicitly forbids desktop shell/split-pane imports and Electron APIs. |
| Mobile workspace-file composable | Pass | Pass | Pass | Pass | May call workspace/file-explorer owners but must not fall back to unrelated workspace. |
| Team reference mobile flow | Pass | Pass | Pass | Pass | Mobile passes message-owned identity into existing viewer; no route reconstruction in `MobileTeamMessages.vue`. |
| Artifacts boundary | Pass | Pass | Pass | Pass | Team references remain separate from run artifacts. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `useMobileWorkspaceFileExplorer.ts` | Pass | Pass | Pass | Pass | Prevents `MobileFiles.vue` from mixing workspace resolution, folder loading, search, and file content policy. |
| `workspaceStore` | Pass | Pass | Pass | Pass | Continues to own tree and folder children. |
| `fileExplorerStore` | Pass | Pass | Pass | Pass | Continues to own search/open/content state. |
| `TeamCommunicationReferenceViewer.vue` | Pass | Pass | Pass | Pass | Existing content route owner remains authoritative. |
| `teamCommunicationStore` | Pass | Pass | Pass | Pass | Mobile uses projected `referenceFiles`, not prose parsing. |
| `ArtifactContentViewer` / `runFileChangesStore` | Pass | Pass | Pass | Pass | No reference-to-artifact shortcut allowed. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `useMobileWorkspaceFileExplorer(contextRef)` | Pass | Pass | Pass | Medium | Pass |
| `ensureFolderChildren(node)` | Pass | Pass | Pass | Low | Pass |
| `searchFiles(query)` | Pass | Pass | Pass | Low | Pass |
| `openFileReadOnly(path)` | Pass | Pass | Pass | Low | Pass |
| `MobileFileViewer` props | Pass | Pass | Pass | Low | Pass |
| `MobileTeamReferenceViewer` props | Pass | Pass | Pass | Low | Pass |
| `TeamCommunicationReferenceViewer` props | Pass | Pass | Pass | Low | Pass |
| Team reference content REST route | Pass | Pass | Pass | Low | Pass |
| GraphQL `SearchFiles` / `GetFolderChildren` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `components/mobile` | Pass | Pass | Medium | Pass | Medium risk is controlled by explicit desktop-container import bans. |
| `composables/mobile` | Pass | Pass | Low | Pass | Good place for `MobileWorkContext` adapters. |
| `utils/teamCommunication` | Pass | Pass | Low | Pass | Shared presentation helper fits the Team Communication subject. |
| `stores` reuse | Pass | Pass | Low | Pass | No new mobile file store proposed. |
| `components/workspace/team` | Pass | Pass | Medium | Pass | Reusing content-level viewer is allowed; desktop panel remains desktop-only. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace tree/lazy folder children | Pass | Pass | N/A | Pass | Reuses `workspaceStore.fetchFolderChildren`. |
| Workspace search/open state | Pass | Pass | N/A | Pass | Reuses `fileExplorerStore` and/or scoped `useWorkspaceFileExplorer`. |
| Mobile workspace resolution/no-fallback invariant | Pass | Pass | Pass | Pass | Existing active-workspace fallback is unsafe for run-scoped mobile. |
| Content rendering/protected resource loading | Pass | Pass | N/A | Pass | Reuses `FileViewer`, viewer components, and authorized resource helpers. |
| Team reference content | Pass | Pass | N/A | Pass | Reuses `TeamCommunicationReferenceViewer`. |
| Mobile team-reference wrapper | Pass | Pass | Pass | Pass | New wrapper is presentation-only and phone-specific. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Mobile text-only preview policy | Yes | Pass | Pass | Existing path is explicitly removed/reduced. |
| Mobile count-only reference rendering | Yes | Pass | Pass | Replaced by tappable rows; no inert-only count retained. |
| Raw path linkifying / Artifacts shortcut | No | Pass | Pass | Explicitly rejected. |
| Desktop split-pane import into mobile | No | Pass | Pass | Explicitly rejected. |
| Wrong workspace fallback | Yes | Pass | Pass | Explicitly rejected and replaced by scoped unavailable/loading state. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Reference presentation/helper and desktop no-regression | Pass | Pass | Pass | Pass |
| Mobile reference rows/viewer | Pass | Pass | Pass | Pass |
| Mobile workspace-file composable and `MobileFiles.vue` refactor | Pass | Pass | Pass | Pass |
| Mobile file viewer/content support | Pass | Pass | Pass | Pass |
| Tests and docs sync | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Mobile folder tap | Yes | Pass | Pass | Pass | Shows load-before/render behavior. |
| Workspace scoping | Yes | Pass | Pass | Pass | Clearly rejects first-workspace fallback. |
| Reference file opening | Yes | Pass | Pass | Pass | Keeps reference subject message-owned. |
| Mobile viewer reuse | Yes | Pass | Pass | Pass | Rejects desktop panel imports. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| HTML/static preview auth-safety on mobile | Existing `HtmlPreviewer` can prefer static workspace URLs; mobile bearer headers are not available to raw iframe loads. | Implementation should use raw/read-only HTML or authorized blob handling unless static auth is proven safe. | Accepted residual risk, not design-blocking. |
| Mobile viewport sizing of reused viewer components | Shared PDF/Excel/media viewers were not all designed phone-first. | API/E2E should validate phone viewport and adjust wrapper/CSS if needed. | Accepted residual risk. |
| Stale served `/mobile` bundle on Android | Prior mobile validation can falsely fail if Android/WebView serves old bundle. | Validation/delivery must record bundle freshness evidence. | Accepted residual risk. |
| Very large files | Large files can degrade phone UX. | Implement explicit too-large/unsupported/error states rather than editing or unrestricted loading. | Accepted residual risk. |

## Review Decision

Pass: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- HTML rich preview should not use unauthenticated static/iframe paths on mobile unless implementation proves the route is auth-safe; raw/read-only or authorized blob display is acceptable.
- Reused desktop-era viewer internals may need mobile sizing/scroll adjustments during API/E2E validation.
- Android validation must confirm the served `/mobile` bundle is fresh.
- Folder-fetch failures may need generic error inference if the existing store logs and returns without throwing.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: The design follows the authoritative boundary rule, gives mobile code a scoped adapter rather than a new state owner, separates workspace files / team references / artifacts by identity, and names the necessary legacy removals. Proceed to implementation.
