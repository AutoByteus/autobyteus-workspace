# Investigation Notes — Saved team workspace clarity

## Investigation meta
- **Package:** `team-workspace-saved-value-warning`; **revision:** SR-002; **status:** requirements ready for user approval after path-vs-ID clarification; architecture not begun.
- **Workspace:** `/Users/normy/autobyteus_org/autobyteus-worktrees/team-workspace-saved-value-warning`; Git branch `codex/team-workspace-saved-value-warning`.
- **Base:** fetched `origin/personal` at `6f00cda64b75ca0097fbc08d862596f90e0e0ad8`; finalization target `origin/personal`.
- **Bootstrap:** Isolated worktree created. Initial document command accidentally wrote in main checkout; files were immediately moved into this worktree before investigation continued. No package files remain in main checkout. No workspace blocker.

## Original request and product understanding
User reports that an existing Software Engineering Team setting shows a strange yellow/orange “Saved value is unavailable in current options.” message above a green Workspace line, while Workspace Directory already displays the saved path. User asks why and suggests trying frontend/Electron/browser reproduction. Screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_de5090a558f04a2bafc6b12317eeb046/solution_designer_68bb2fd491024de4984de867f2000544/context_files/ctx_a4437bd78d4e__image.png`.

Follow-up (2026-09-26): User asks why a workspace ID would be needed on this configuration page when the saved run's path is already present, and suspects a functional rather than merely cosmetic mismatch. This is a request for deeper evidence, not approval of SR-001 or a request to change new-run workspace architecture.

The supported user journey is existing team run → Edit Config → inspect saved path, possibly modify allowed model settings. A saved run's `workspace_root_path` is a path; current workspace inventory uses IDs. Initial unknowns were whether the path is really unavailable and why it appears as “New.” No clarification yet.

## Source log and observations
| Date | Type | Exact source / method | Observation and implication |
| --- | --- | --- | --- |
| 2026-09-26 | User | Supplied screenshot above | Disabled New path, orange warning and green duplicate for the same path. |
| 2026-09-26 | Command | `git fetch origin personal`; `git ls-remote --symref origin HEAD` | Default tracked branch is `origin/personal`, current revision above. |
| 2026-09-26 | Runtime | CUA `/Applications/AutoByteus.app` → existing Software Engineering Team run → Edit Config; AX plus screenshot | Reproduced in actual installed Electron app: saved `/home/autobyteus/workspace/autobyteus-workspace` appears in disabled New input, followed by orange warning and identical green `Workspace:` line. Save disabled. This is a different run/path from user screenshot but same anomaly. No run mutation. Actual desktop was used because user specifically suggested Electron and an installed app was already running; no separate frontend/backend launch needed. |
| 2026-09-26 | Code | `autobyteus-web/services/runConfigEditing/existingTeamRunFormModel.ts:19-22,61,78` | Every nonempty saved path is projected with `workspaceId: null`, `availability: 'historical-only'`, without comparing current inventory. Root and member rows use it. |
| 2026-09-26 | Code | `autobyteus-web/components/workspace/config/WorkspaceSelector.vue:18-123,167-244` | Null ID makes stored path use New mode; `historical-only` emits orange warning; stored path also emits green success line. These branches deterministically explain contradictory display. |
| 2026-09-26 | Code | `TeamScopeConfigEditor.vue:54-76,207-230`; `MemberOverrideItem.vue:100-110`; `TeamRunConfigForm.vue` | Shared selector is used by saved root/member and editable launch; existing team workspace control is read-only. |
| 2026-09-26 | Contract/server | `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts:22-29`; `autobyteus-server-ts/src/services/agent-streaming/team-execution-view-projector.ts:194-201` | Execution view has `workspace_root_path`, no workspace ID or availability state. Missing ID is not evidence of missing directory or invalid saved value. |
| 2026-09-26 | Code | `ExistingRunConfigEditor.vue:148-161`; `existingRunConfigStore.ts:78-122,239-255` | Existing team form comes from canonical execution tree; team dirty/save is model-configuration patch, not workspace patch. Agent Org differs and must be preserved. |
| 2026-09-26 | Test | `autobyteus-web/components/workspace/config/__tests__/WorkspaceSelector.spec.ts:567-591` | Test asserts warning for synthetic `historical-only` value, but does not prove actual saved team path unavailability. |
| 2026-09-26 | Code | `autobyteus-web/types/workspace/WorkspaceSelectionState.ts`; `autobyteus-web/stores/teamRunConfigStore.ts:113-126,199-224,331-356` | `existingWorkspaceId` identifies a selectable registered workspace during *new-run authoring*, so the UI can obtain its canonical metadata. It is not a saved-team-run requirement. |
| 2026-09-26 | Code | `autobyteus-web/utils/teamRunLaunchHierarchy.ts:59-71,206-230`; GraphQL `CreateAgentTeamRunInput`; `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts:103-141` | New-run launch records/API carry `workspaceRootPath`; server canonicalizes and ensures a workspace by root path. Runtime creation does not require the frontend workspace ID. |
| 2026-09-26 | Code | `autobyteus-web/services/runConfigEditing/teamRunLaunchSeed.ts:14-49` | Separate **copy saved run into new launch draft** flow resolves historical paths back to workspace metadata/ID because the *editable new-launch draft* currently expects metadata. This is not the saved configuration display flow. |
| 2026-09-26 | Code | `autobyteus-server-ts/src/workspaces/workspace-manager.ts:90-105`; `autobyteus-web/stores/workspace.ts:213-220` | Workspace IDs are useful for registered-workspace lifecycle, lookup/removal and client inventory, but path is sufficient to identify/activate a workspace for team run execution. |
| 2026-09-26 | Code | `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts:163-189`; `agent-team-execution/domain/team-run-config.ts:12-45` | Restore rebuilds team run configuration from saved execution tree; launch configuration carries `workspaceRootPath`, not a workspace ID. The ID is not a prerequisite for resumed team execution. |

## Current behavior and supported paths
| ID | Trigger / kind | Product behavior and outcome | Evidence / confidence |
| --- | --- | --- | --- |
| BEH-001 | Existing team → Edit Config / User | Exact saved path is fixed, but New + warning + green duplicate is displayed. | User screenshot + live Electron + source / high. |
| BEH-002 | Saved team member disclosure / User | Member stored path uses same `historical-only` selector path. | Source / high for code, not separately live-probed. |
| BEH-003 | New launch or stopped-team model edit / User | New launch can select workspace; saved team model Save does not edit workspace. | Form/store source / high. |

## Technical and structural inventory
- **Payload:** Team execution tree root/member `workspace_root_path: string | null`, with no ID. Data meaning is persisted run path, not current inventory selection.
- **ID distinction:** A workspace ID is an inventory/registered-object handle used by the editable picker and workspace management. Team launch and saved execution ultimately use root paths. The saved settings screen has no supported need to reconstruct an ID to display a fixed path.
- **Owners/readers:** Server execution-view projector emits path; frontend existing-team projection makes display model; shared selector renders it. Existing team model store edits model selection separately.
- **Potential impact:** Likely frontend projection/presentation and regression tests; no evidenced API, persistence, security, deployment or migration change. Shared component also serves new launches and Agent Org, so isolate effects.
- **Persisted data:** Exact historical path must be preserved. No data rewrite/loss requested. Actual filesystem existence and screenshot path's current inventory membership were not verified; neither may be inferred from the UI warning. Live example's `/home/...` path in a macOS app also indicates paths can reflect another runtime environment.

## Runtime probe
| Method | Scenario | Observation | Requirement implication | Evidence |
| --- | --- | --- | --- | --- |
| Installed Electron app via CUA | Existing Software Engineering Team run → Edit Config | AX and screenshot confirmed disabled New path, orange warning and green duplicate. | Real UI reproducible; warning has no verified availability basis. | Conversation CUA output; user screenshot is durable analogous artifact. |

## User and Product Design context
- User need: Understand the saved workspace without an alarming, contradictory status. Evidence strength: direct report and image.
- Product Design & Prototyping request: **Not stated**; no prototype artifacts. User suggested reproduction tools, not a separate design workflow.
- Evidence supplement inventory: user screenshot (path above), user-owned, initial visual evidence for BEH-001/REQ-001–002, not behavior-defining.

## Unknowns, risks and architecture input
- ASM-001: User likely wants a clear read-only saved path, not workspace editing. Requires explicit approval.
- UNK-001: Whether the original screenshot's path is actually in inventory or exists on disk is unverified and nonblocking for a presentation-only fix. Do not call it absent.
- RISK-001: Shared selector also handles editable launch and Agent Org; an unscoped component change could regress those paths.
- Root cause of visible contradiction: path-only DTO is always marked `historical-only`; UI maps null ID to New and shows both warning and success. This is a presentation/projection issue, not demonstrated data corruption or failed availability lookup. Architecture decisions remain pending approval.
- Follow-up conclusion: The deeper code path supports the user's suspicion of a model mismatch: a selector shaped for *choosing* a registered workspace (ID) is reused to *show* a saved run's authoritative path. No evidence that ID resolution is required to read or resume that saved team run. The scope of simplifying ID use in new-run drafts or other workspace management remains a separate, unapproved product/architecture question.

## Approval and architecture investigation (SR-003 → SR-004)
- **Approval evidence:** User replied on 2026-09-26, “Yeah … i meant use the path,” after the Solution Designer explicitly described using the saved path as the fixed value instead of requiring an ID-based picker. Scope is the saved team configuration proposed in SR-001, not all workspace ID usage.
- **Architecture posture:** Existing-run team form is read from the canonical execution-tree path. The same `ExistingTeamRunFormModel` type is also projected by Agent Org, whose mounted Team workspace can be editable. A safe fix must distinguish the saved-Team fixed-path presentation from Org's existing selector rather than changing all stored selector behavior globally.

| Date | Source / command | Current architecture finding | Design implication |
| --- | --- | --- | --- |
| 2026-09-26 | `cat autobyteus-web/types/agent/TeamRunFormModel.ts` and `ExistingTeamRunFormModel.ts` | Shared existing form model currently gives scopes `workspaceControl: WorkspaceSelectorModel` and agents `storedWorkspace: ExistingWorkspaceDisplay`, requiring selector-shaped data even for saved Team fixed paths. | Introduce a singular presentation discriminant; the saved Team variant need only a tag because `effectiveConfig.workspaceRootPath` already carries the exact path. |
| 2026-09-26 | `cat autobyteus-web/services/runConfigEditing/existingTeamRunFormModel.ts` and `existingAgentOrgRunFormModel.ts` | Separate projectors already own Team versus Org projection. Team always makes every path `historical-only`; Org sometimes supplies editable mounted-Team selector drafts. | Team projector should create path-only fixed presentation; Org projector should preserve selector presentation. No backend change. |
| 2026-09-26 | `cat autobyteus-web/components/workspace/config/TeamScopeConfigEditor.vue`, `MemberOverrideItem.vue`, `TeamMemberConfigTree.vue`, `TeamRunConfigForm.vue`, `AgentOrgRunConfigForm.vue` | Root/nested Team scopes and Agent rows converge at two workspace rendering sites. Agent Org reuses those renderers. | Branch at these two rendering sites on presentation kind. No prop-drilling or Org mode guess needed. |
| 2026-09-26 | `rg -n 'storedWorkspace|workspaceControl' autobyteus-web/components/workspace/config/__tests__ autobyteus-web/services/runConfigEditing/__tests__` | Existing tests construct/inspect old selector-shaped fields; Org tests assert editable/stored selector behavior. | Update impacted fixtures/assertions and add focused Team fixed-path/no-warning and Org preserved-selector tests. |
| 2026-09-26 | `rg -n 'fixedWorkspace|workspace_directory' autobyteus-web/localization/messages/en/workspace.ts` | Existing localization keys cover Workspace Directory and fixed existing-run workspace context. | Reuse localizations; avoid new hard-coded user-facing text. Verify all supported locales have keys. |

- **Execution spine:** Existing team run selection → canonical run-config load → execution tree path-only launch config → Team form projection → root/member config editor → path-only fixed display. Model Save remains an independent return path and does not carry workspace edits.
- **Existing ownership:** Backend run history is authoritative for saved `workspace_root_path`; frontend form projector is authoritative for mapping saved data to presentation; `WorkspaceSelector` owns editable/current-inventory choice behavior; rendering components own which presentation component is used.
- **Design-health root cause evidence:** Saved Team projector manufactured `historical-only` from *absence of ID* rather than verified absence of path, and shared selector interpreted null ID as New. This is a view-model boundary/ownership mismatch, not corrupt run data. Refactor the representation now; a warning-only CSS hide would leave false semantics in the model.
- **Transition:** Internal TypeScript view model change only; persisted execution tree and GraphQL contract remain path-only. Existing historical runs are directly readable without migration. The number of stored runs is irrelevant to the UI projection change; no bulk I/O or rewrite.
- **Uncertainty/escalation:** If implementing the path-only presentation requires altering saved-run edit policy, Agent Org behavior, a backend contract, or filesystem validation, stop and return a Design Impact/Requirement Gap rather than broadening the approved correction.
