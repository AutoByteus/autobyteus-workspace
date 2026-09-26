# Design Spec — Saved team workspace path presentation

## Solution and approval basis
- **Package / revision:** `team-workspace-saved-value-warning` / SR-004 (design completion).
- **Status:** Ready for downstream work.
- **Approved requirements:** `requirements-doc.md`, SR-001 behavior baseline, SR-002 evidence clarification, SR-003 approval capture. User approval reference: 2026-09-26 “Yeah … i meant use the path,” replying to the explicit fixed saved-path proposal. This authorizes saved Team root/member presentation only, not a global workspace-ID redesign.
- **Supplements:** User screenshot is evidence only (path in `investigation-notes.md`); no Product-owned UI/UX package (`N/A — not applicable`).
- **Canonical investigation:** `/Users/normy/autobyteus_org/autobyteus-worktrees/team-workspace-saved-value-warning/tickets/in-progress/team-workspace-saved-value-warning/investigation-notes.md`.

## Current-state read and intended change
A canonical saved Team execution tree contains `workspace_root_path` for its root and members, with no workspace ID or availability flag. `existingTeamRunFormModel.ts` unconditionally maps every nonempty path to an `ExistingWorkspaceDisplay` with null ID and `historical-only`. `WorkspaceSelector.vue` then renders it as selected disabled **New**, emits an unverified orange warning, and duplicates the path in green success feedback. Direct Electron reproduction matches source. The Team form shares its model and two workspace rendering sites with Agent Org; Agent Org additionally permits mounted-Team workspace edits. **Target:** represent saved-Team workspaces as fixed paths and render them read-only, while leaving the editable picker and Agent Org selector behavior intact.

## Task size and architectural risk
- **task_size: Medium.** One internal view-model type, two existing-run projectors, two shared renderers and a new focused display component plus tests are affected. Root and member surfaces share the same change; no broad feature or subsystem rewrite.
- **architectural_risk: Low.** No backend/API/persistence/security/concurrency/deployment contract changes, no ownership transfer, and Agent Org behavior is explicitly preserved by a discriminated presentation type. Current code and tests identify the relevant shared consumers. This is not `Small` because safe isolation spans multiple existing components/projectors.
- **Escalation:** Reclassify and return Design Impact/Requirement Gap if implementation discovers a need to alter saved-run editability, Agent Org behavior, backend workspace contracts, path validation, or data transition.

## Architecture investigation evidence
| Source | Observation | Decision supported | Uncertainty |
| --- | --- | --- | --- |
| `existingTeamRunFormModel.ts`; `team-execution-view-dtos.ts` | Saved Team path is authoritative; ID/availability absent. | Fixed-path variant must be derived directly from saved path, not inventory. | None material. |
| `WorkspaceSelector.vue`; direct Electron reproduction | Null ID drives New + warning + duplicate. | Do not route fixed Team values through the selector. | None material. |
| `ExistingTeamRunFormModel.ts`; `existingAgentOrgRunFormModel.ts` | Team and Org share type, not the same workspace editing policy. | Internal discriminated workspace presentation in shared form model. | Check all type consumers during implementation. |
| `TeamScopeConfigEditor.vue`; `MemberOverrideItem.vue`; `AgentOrgRunConfigForm.vue` | Two renderers serve Team/Org root and member paths. | Branch on explicit presentation kind at these renderers, not guessed parent context. | Org regression needed. |
| `teamRunLaunchHierarchy.ts`; `TeamRunService`; `AgentTeamRunManager` | Launch and restore consume paths, while ID serves new-run picker/registered inventory. | Preserve backend and new-run flow. | No backend change. |
| `localization/messages/en/workspace.ts`, `zh-CN/workspace.ts` | Existing keys cover directory label and fixed-workspace explanation. | Reuse localization, avoid new literal. | Verify UI wording in rendered view. |

## Behavior and production-path map
| Behavior | Kind | Approved IDs | Trigger | Current evidence | Target path / spine |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001–003 / AC-001 | Existing Team → Edit Config | Team projector + selector create contradictory root display. | Canonical tree → Team form projector → fixed-path variant → root editor → `FixedWorkspacePath` (DS-001). |
| BEH-002 | User | REQ-001–003 / AC-002 | Saved member disclosure | Member projection and renderer use same selector. | Member launch path → fixed-path variant → member renderer → `FixedWorkspacePath` (DS-002). |
| BEH-003 | User | REQ-003 / AC-003 | New Team launch or stopped-Team model edit | Editable selector and model-patch store are separate. | Keep current editable launch and model-save paths (DS-003). |

## Supplemental task artifacts
| Path | Purpose | IDs | Relationship / status |
| --- | --- | --- | --- |
| User screenshot path in investigation notes | Visual reproduction evidence | REQ-001–002 | Evidence only; not normative UI/UX spec. |

## Design-health assessment
- **Posture:** Bug fix with bounded internal view-model refactor.
- **Current design issue:** Yes. **Root cause:** Boundary Or Ownership Issue: an ID-based choice control is made responsible for showing an authoritative saved path, and the projector invents `historical-only` availability from missing ID.
- **Refactor needed now:** Yes. Merely hiding amber text would leave incorrect `historical-only` and New-selection semantics. Replace Team's selector-shaped presentation with a path-only variant; remove obsolete Team `workspace()` historical projection. Keep Agent Org's distinct editable/selector behavior without changing it.
- **Residual risk:** Internal shared type changes can miss a fixture/consumer; targeted type-check and Team/Org regression tests mitigate this. No generalized workspace-model redesign is authorized.

## Terminology
- **Fixed saved path:** `workspace_root_path` stored in a Team run execution tree; not a selection from current inventory.
- **Registered workspace ID:** handle for a current workspace inventory entry, useful to the editable picker/management, not required to read saved Team settings.

## Legacy removal and persisted-state decision
- **Policy:** No backward compatibility; remove legacy in-scope path. Team projection must stop constructing the `historical-only` selector value from its saved path, and Team root/member renderers must stop passing those values to `WorkspaceSelector`. Remove old `workspaceControl`/`storedWorkspace` fields from the shared existing form model as they are replaced by the discriminated presentation field; adapt Org projector rather than retaining parallel representations.
- **Persisted transition: Not Affected.** Stored execution tree shape remains `workspace_root_path: string | null`; normal readers already accept it, and only transient frontend projection changes. No data scan, migration, reset, dual-read, or old-schema branch. Exact paths/history are preserved (REQ-003). Representative live path and current source are in investigation notes.

## Data-flow spines and narratives
| Spine | Scope / IDs | Arrow chain | Governing owner and purpose |
| --- | --- | --- | --- |
| DS-001 | Primary / BEH-001 | Edit Config → existing-run canonical load → saved Team execution tree → Team form projection → root scope editor → fixed path display | Form projector maps path authority; root editor chooses explicit presentation. |
| DS-002 | Primary / BEH-002 | Member disclosure → saved member launch config → Team form projection → member renderer → fixed path display | Same model distinction applies to nested Team scopes and Agent member rows. |
| DS-003 | Preserved primary / BEH-003 | New launch picker → selected workspace metadata → launch path → backend Team run; stopped-run model edit → model patch Save | Existing owners unchanged; prevents path display fix from altering selection or save policy. |
- **Return/event spine:** N/A for the changed display; canonical-load response simply updates existing form model. Existing save return behavior is preserved.
- **Bounded local spine:** N/A; no new loop/state machine/callback policy.

## Owners, off-spine concerns and boundaries
| Owner | Responsibility / boundary | Off-spine concern |
| --- | --- | --- |
| Backend saved Team execution tree | Authoritative root/member path and run lifecycle; public canonical run-config read. | Persistence remains unchanged. |
| `projectExistingTeamRunFormModel` | Translate saved Team paths into fixed-path presentation, without inventory lookup or availability inference. | Preserve model options and hierarchy. |
| `projectExistingAgentOrgRunFormModel` | Preserve Org selector presentation, including editable mounted-Team drafts. | No Org interaction change. |
| `TeamScopeConfigEditor` and `MemberOverrideItem` | Choose renderer by explicit form-model presentation kind. | Existing model editor, auto-approve and hierarchy remain separate. |
| `FixedWorkspacePath` | Show path once, read-only, neutral fixed-run explanation; null path neutral. | Reuse localization and accessible text. |
| `WorkspaceSelector` | Remain owner of editable/current-inventory choice and legacy Org stored selector behavior. | No Team fixed-path caller. |
- **Dependency rule:** Rendering components may consume the internal presentation union; they must not query workspace inventory to decide how to display a fixed Team path. The fixed display must not call backend, emit workspace-selection updates, or infer availability. No caller should depend on both saved execution path and WorkspaceSelector internals for the same Team field.
- **Public vs internal boundary:** Canonical run-config read is public to the frontend store. The form projectors and display union are internal UI boundaries; no API identity change. Team and Org projectors stay separate. There is no thin facade or generic ambiguous ID method added.

## Interface and structure check
| Interface / subject | Accepted identity | Responsibility | Check |
| --- | --- | --- | --- |
| `ExistingWorkspacePresentation` internal union | `{ kind: 'fixed-path' }` or `{ kind: 'selector', model: WorkspaceSelectorModel }` | Declare path display versus interactive/legacy selector; one meaning per variant. Fixed display reads `effectiveConfig.workspaceRootPath`, avoiding a duplicate path field. | Explicit discriminator, no nullable ID as mode signal. |
| `FixedWorkspacePath` props | `rootPath: string | null` | Read-only display only. | No ID, availability, selection mode or emitted update. |
| `WorkspaceSelector` existing contract | Workspace ID for editable Existing or path for editable New; stored Org model unchanged. | Selection behavior. | No new Team fixed-path dependency. |
- **Naming:** `FixedWorkspacePath` describes the actual field. Avoid `historical`, `available` or `New` labels for saved Team path because none follows from the DTO. No new shared utility/normalizer is needed; projector already has exact path.
- **Encapsulation:** ExistingRunConfigEditor loads canonical Team/Org separately and delegates to their form projectors. Renderers must not bypass these owners to inspect run history or inventory.

## Capability allocation and file responsibilities
| Change | Path | Owner / final responsibility |
| --- | --- | --- |
| Modify | `autobyteus-web/types/agent/ExistingTeamRunFormModel.ts` | Replace selector-specific `workspaceControl`/`storedWorkspace` with one tight `ExistingWorkspacePresentation` union on scope and Agent node. |
| Modify | `autobyteus-web/services/runConfigEditing/existingTeamRunFormModel.ts` | Project Team root/member fixed-path presentation; keep the single authoritative projected path in `effectiveConfig.workspaceRootPath`; remove unconditional historical-only workspace helper. |
| Modify | `autobyteus-web/services/runConfigEditing/existingAgentOrgRunFormModel.ts` | Wrap current Org workspace selector models in `selector` variant; preserve existing editable/stored behavior. |
| Add | `autobyteus-web/components/workspace/config/FixedWorkspacePath.vue` | One read-only path and existing localized fixed-run context; no picker, warning or duplicate success. Display neutral empty state for null path (e.g. em dash). |
| Modify | `autobyteus-web/components/workspace/config/TeamScopeConfigEditor.vue` | Existing scope: fixed variant → new display using `effectiveConfig.workspaceRootPath`, selector variant → existing `WorkspaceSelector`; editable launch branch unchanged. Update existing workspace-selection event guard to allow only selector variant with editable model. |
| Modify | `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` | Existing Agent node: same variant routing; editable member branch unchanged. |
| Modify/add tests | `autobyteus-web/services/runConfigEditing/__tests__/...`, `components/workspace/config/__tests__/...` | Assert path-only Team projection and rendered root/member display; preserve Org selector and new-launch/model-save behavior. Update fixtures for removed fields. |
- **Folder choice:** Existing `types/agent`, `services/runConfigEditing`, and `components/workspace/config` directories match ownership and keep this small UI flow readable. No new subsystem/folder/layer.
- **Reusable structure check:** The single discriminated presentation union replaces two overlapping selector-specific fields; it is shared by the two existing-run projectors and two renderers. Its fixed-path case carries only a tag; the already-projected `effectiveConfig.workspaceRootPath` is the single path field. It contains no redundant workspace ID/availability and does not become a generic workspace DTO.
- **Applied pattern:** Small tagged union for mutually exclusive UI states; not a new state machine or strategy framework.

## Removal / compatibility rejection
| Removed item | Replacement | Scope |
| --- | --- | --- |
| Team `workspace(launch)` helper that unconditionally emits `historical-only` | Direct `fixed-path` projection from `workspace_root_path` | In this change |
| Shared existing form's `workspaceControl` and `storedWorkspace` parallel fields | One `workspacePresentation` union | In this change |
| Team fixed value routed through disabled New selector and its warning/success branches | `FixedWorkspacePath` | In this change |
- **Compatibility candidates rejected:** Do not keep both old and new model fields, an ID lookup fallback, a path-to-ID repair layer, a dual render path for Team, or CSS-only warning suppression. Org selector variant remains because it represents a different current product flow, not backwards compatibility.

## Concrete shape example
```ts
// Saved Team root or member: no ID or availability claim.
workspacePresentation: { kind: 'fixed-path' }
// FixedWorkspacePath receives effectiveConfig.workspaceRootPath, already projected from launch.workspace_root_path.
// Existing Agent Org mounted-Team edit: selector behavior remains distinct.
workspacePresentation: { kind: 'selector', model: existingWorkspaceDraftModel }
```
Avoid `{ workspaceId: null, availability: 'historical-only' }` for every saved Team path. Missing ID means only that saved execution is path-based.

## Change sequence, tradeoffs and implementation guidance
1. Replace the shared existing-form workspace fields with the tagged union; update Team and Org projections together so type consumers stay coherent.
2. Add the focused fixed-path component using existing localized directory/fixed-run text; do not render picker controls or selection-success/unavailability state in it.
3. Branch the two existing renderers on `workspacePresentation.kind`, preserving editable paths and Org `selector` routing.
4. Remove obsolete Team historical-only projection and old field references; update focused Team/Org fixtures and tests.
5. Run relevant type checks/component tests and realistic existing-Team rendered validation; verify exact path once, null neutral, root/member coverage, Org editable selector and new Team picker/model Save preserved. API/E2E Engineer owns executable validation; Implementation Engineer owns implementation-scoped checks.
- **Tradeoff:** A new tiny display component and internal union touch more files than hiding a warning, but they remove the false ID/availability premise and prevent future recurrence without changing backend or Org behavior.
- **Risk:** Shared type regression in Org projection; mitigate with explicit tagged union and regression tests. Long paths need wrapping/overflow handling in the new component; verify rendered desktop width. A truly missing physical directory remains a separate operational error, not assessed by this read-only field.
