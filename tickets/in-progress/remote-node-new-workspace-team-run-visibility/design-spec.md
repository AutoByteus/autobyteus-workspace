# Remote-Node New-Workspace Team-Run Visibility Design Spec

## Current-State Read

The production frontend path is `autobyteus-web`. `WorkspaceSelector.vue` currently owns visible local `mode` and `tempPath`, while `RunConfigPanel.vue` separately owns `pendingWorkspaceInput`, which is the value used by readiness and launch preparation. `TeamRunConfigForm.vue` and `AgentRunConfigForm.vue` relay selector events but do not own either representation.

For Team drafts, `teamRunConfigStore.applyConfigEdit` intentionally replaces the immutable config snapshot while preserving `draftId`. The watcher at the bottom of `RunConfigPanel.vue` observes the complete effective config objects rather than stable context identity, so every Team runtime/model/LLM/auto-approve/member edit resets only the parent pending value to Existing. The selector's independent local state remains visibly New with the entered path. `handleRun` then sees the hidden Existing state, skips workspace registration, and launches the prior draft workspace, normally Temp Workspace. This is the verified path for BEH-001 and BEH-002.

The bound-node workspace store, GraphQL workspace registration, Team draft canonical workspace update, Team launch/hydration owner, run history, and left-tree projection behave correctly when given the selected workspace identity. They are constraints to preserve, not correction targets. The accepted root `autobyteus-web-prototype` is a fixture-driven current-experience reference; it is not the production implementation target and must remain unchanged.

## Intended Change

Make `RunConfigPanel.vue` the sole owner of one transient `WorkspaceSelectionState` for the active editable run context. Make `WorkspaceSelector.vue` controlled: it renders that state and emits complete replacement values, but no longer owns independent mode/path refs. The Agent and Team form components remain thin relays of the controlled value.

Replace the broad effective-config watcher with a context-identity watcher. A Team context is identified by stable `draftId`; a selected persisted run is identified by its selection subject plus the one-time transition from unhydrated to hydrated configuration; the existing mutable Agent draft buffer can continue to use its config object identity because within-draft Agent edits mutate that buffer in place. Context changes or initial selected-run hydration rehydrate/reset the workspace selection; immutable config replacement within the same Team draft does not.

The same authoritative state drives `aria-selected`, the path input value, readiness, workspace registration, and the launch decision. Existing-workspace selection still updates the active config store immediately. A successful New registration applies the canonical workspace to the active config and transitions the authoritative state to that registered identity before Team/Agent creation continues.

No backend, persisted-data, Team-run creation, run-history, tree-projection, Electron host, or prototype change is included.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | FR-001, FR-002, FR-004; AC-001, AC-002, AC-003, AC-005 | User enters New/path and continues editing the same Team draft | Investigation notes: controlled `open_tab` ordering trace; `RunConfigPanel.vue:404-413`; `WorkspaceSelector.vue:211-215,363` | One controlled state remains unchanged across same-draft config snapshot replacement; visible and launch state cannot split | Controlled edit/launch path DS-001; context-state loop DS-003 |
| BEH-002 | System | FR-003, FR-005, FR-007; AC-001, AC-004, AC-007 | User activates Run Team while New/path is authoritative | Investigation notes: Electron `f758...` trace and controlled `372775...` trace show no workspace-create request and Temp fallback | Register/resolve the visible path exactly once or block; never launch a hidden prior workspace | DS-001; success return DS-004; error return DS-005 |
| BEH-003 | User/System | FR-002, FR-003, FR-006; AC-001, AC-002, AC-006 | User enters New/path last, or changes setting order | Investigation notes: successful Playwright and `open_tab` controls | Preserve the successful bound-node registration → canonical draft update → Team create → tree reveal path, independent of edit order | DS-001; DS-004 |
| BEH-004 | Contract | FR-001, FR-004; AC-003, AC-005, AC-008 | User explicitly changes workspace or activates a different draft/run context | Investigation notes: stable Team `draftId`, selection subject, and existing explicit selection handling | Only explicit workspace input and real context identity transitions change workspace selection; selected/read-only behavior remains display-only | Existing path DS-002; context-state loop DS-003 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility/tickets/in-progress/remote-node-new-workspace-team-run-visibility/ui-ux-spec.md` | Defines visible/launch state invariants, intentional transitions, pending/error behavior, and preserved interaction semantics | FR-001–FR-007; AC-001–AC-009 | Governs the controlled selector contract and observable launch behavior | `Approved` by user with requirements on 2026-08-24 |

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Bug Fix`
- Current design issue found (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Duplicated Policy Or Coordination` (primary), with `Local Implementation Defect` in the broad reset watcher
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): `Yes`, narrowly bounded
- Evidence: Parent and child independently own the same pending workspace intent; only the parent copy is reset when same-draft immutable Team config snapshots change. The reproduced UI remains New/path while the launch copy is Existing/empty.
- Design response: Establish a controlled component and one authoritative transient state; identify context changes by stable identity rather than config snapshot identity.
- Refactor rationale: Fixing only the watcher would remove the reproduced trigger but retain two mutable representations capable of diverging through another path. Removing the duplicate owner is necessary to satisfy FR-001 and prevent recurrence.
- Intentional deferrals and residual risk, if any: General post-Team-create error/reconciliation hardening remains a separate follow-up. It does not sit on the reproduced pre-create state-divergence path. Residual risk is limited to other callers of the shared selector; both current callers are included in contract/test updates.

## Terminology

- **Workspace selection state**: Transient frontend record containing `mode`, the selected registered workspace ID, and the New-path edit buffer. `mode` selects which value is authoritative for launch.
- **Context identity**: Stable identity of the run configuration being displayed: a persisted selection subject, a Team `draftId`, or the existing mutable Agent draft-buffer object.
- **Canonical registered workspace**: Workspace ID/root returned and cached by the bound-node workspace registration path.
- **Same-draft config edit**: Runtime, model, LLM configuration, auto-approve, member override, or similar edit that replaces a Team config snapshot while preserving `draftId`.

## Design Reading Order

This spec follows the required order: verified behavior and health assessment; persisted-state/removal decisions; spines and ownership; controlled interfaces and dependency rules; concrete file mapping; then change sequence, risks, and implementation guidance.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete in-scope paths are the selector's local authoritative `mode`/`tempPath` refs, its immediate local-state emission watcher, the split `select-existing` plus `workspace-input-change` coordination contract, the parent `pendingWorkspaceInput` partial shape, and the watcher that treats effective config object replacement as context change.
- Replace them directly with the controlled `WorkspaceSelectionState` contract and context-identity reset. Do not retain adapter events, dual state, or a fallback watcher for compatibility.
- No stored schema or backend contract changes, so no historical runtime path is needed.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Bound-node workspace registry records keyed by deterministic workspace ID/root, plus existing TeamRun history/memory records. Volume is user/environment dependent and need not be enumerated because no record is rewritten.
- Relevant code-model, serialization, semantic, or physical-store change: None. The new type is transient component state only.
- Normal reader/writer behavior and representative evidence: `workspaceStore.createWorkspace` registers/caches the server response; Team config stores apply the canonical ID/metadata; Team launch/history/tree already read those records correctly in successful controls.
- Required semantics and invariants under direct use: Preserve every workspace registration, TeamRun ID, history, memory, root association, and node boundary.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: Do not delete, move, copy, or rewrite server records; do not interpret remote paths on the desktop host.
- Decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Directly Usable — No Migration`
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: Existing records already satisfy current runtime contracts. Rewriting would provide no behavioral benefit and would introduce unnecessary I/O and corruption/recovery risk.
- Acceptance criteria or design constraints supported by this decision: FR-003, FR-005, FR-006; AC-001, AC-004, AC-006, AC-008.

### Migration Plan (Only When Decision Is `Migration Required`)

N/A — no persisted transformation is required.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002, BEH-003 | User selects New/path, edits Team settings, and activates Run Team | Canonical TeamRun is created and revealed under the registered workspace | `RunConfigPanel` governs pre-launch workspace intent/preparation; `agentTeamRunStore` governs Team launch after admission | Carries the reproduced ordering through the real bound-node outcome |
| DS-002 | Primary End-to-End | BEH-004 | User explicitly selects Existing and a registered workspace | Team/Agent launches under that selected registered workspace | `RunConfigPanel` for selection transition, then existing config/launch owners | Proves explicit destination changes still work and no New registration occurs |
| DS-003 | Bounded Local | BEH-001, BEH-004 | Active context identity changes or same-draft config snapshot is replaced | Workspace selection is rehydrated only for a real context change and otherwise preserved | `RunConfigPanel` | Replaces the defective broad watcher with an identity-governed state transition |
| DS-004 | Return-Event | BEH-002, BEH-003 | Bound node returns successful workspace registration | Active config and controlled selection hold the canonical workspace identity | `RunConfigPanel` coordinating existing workspace/config owners | Ensures the launch following New uses the server-returned identity exactly once |
| DS-005 | Return-Event | BEH-002 | Bound node rejects New registration or path is invalid/empty | Same New/path remains visible with launch blocked and existing error feedback | `RunConfigPanel` | Prevents hidden fallback during validation or registration failure |

## Primary Execution Spine(s)

- **DS-001 — New workspace Team launch:** `WorkspaceSelector user input -> controlled WorkspaceSelectionState in RunConfigPanel -> same-draft Team config edits in teamRunConfigStore -> Run Team -> RunConfigPanel workspace preparation -> workspaceStore / bound-node CreateWorkspace -> teamRunConfigStore canonical workspace update -> agentTeamRunStore launch/hydration -> bound-node TeamRun/history -> workspace tree projection`.
- **DS-002 — Existing workspace launch:** `WorkspaceSelector registered workspace choice -> RunConfigPanel authoritative state -> active config store workspace update -> Run Team -> Team/Agent launch owner -> bound-node execution/history -> workspace tree projection`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The selector emits complete controlled state. Later Team edits replace config snapshots but keep the same draft identity, so workspace state remains unchanged. Run preparation reads that same state, registers New on the bound node, applies the canonical identity, and delegates one launch to the existing Team owner. | Workspace selection, Team draft, registered workspace, Team launch | `RunConfigPanel` until canonical preparation completes; `agentTeamRunStore` thereafter | Readiness, immutable config editing, node routing, tree projection |
| DS-002 | Explicit Existing selection changes both rendered state and active config. Launch skips New registration and follows the existing Team/Agent path. | Workspace selection, registered workspace, run config | `RunConfigPanel` | Workspace option loading, metadata cache |
| DS-003 | A watcher observes context identity, not config value-object identity. It derives state when identity changes; same-draft edits leave the state untouched. | Context identity, workspace selection | `RunConfigPanel` | Selected/read-only hydration |
| DS-004 | The workspace store returns a canonical ID/metadata. The panel updates the active config and controlled state before continuing launch. | Registration result, canonical workspace, active draft | `RunConfigPanel` coordinating store boundaries | Active files tab |
| DS-005 | Empty input blocks readiness locally; registration failure is recorded through the active config store while the controlled New value remains unchanged for correction/retry. | Workspace selection, workspace error | `RunConfigPanel` | Existing error rendering |

## Spine Actors / Main-Line Nodes

- `WorkspaceSelector`: controlled user-input surface.
- `RunConfigPanel`: authoritative transient workspace-selection owner and pre-launch coordinator.
- `teamRunConfigStore` / `agentRunConfigStore`: registered-workspace configuration owner for the active draft/buffer.
- `workspaceStore`: bound-node registration/cache owner.
- `agentTeamRunStore` or existing Agent contexts path: post-preparation execution owner.
- Bound-node GraphQL/runtime services: canonical workspace and run persistence/execution.
- Existing history/navigation projection: resulting workspace/run visibility.

## Ownership Map

- `WorkspaceSelector` owns rendering, workspace option presentation, folder-browse input acquisition where allowed, and emission of complete proposed state. It does not own launch intent.
- `RunConfigPanel` owns the transient `WorkspaceSelectionState`, normalization at launch boundaries, context-transition reset/rehydration, readiness overlay for New, and create-before-launch sequencing.
- `TeamRunConfigForm` and `AgentRunConfigForm` are thin form composition boundaries. They pass the controlled value and event without copying it.
- `teamRunConfigStore` owns immutable Team drafts, stable `draftId`, registered workspace ID/metadata in the canonical launch config, and launch readiness/admission. It does not own the unregistered New-path edit buffer.
- `agentRunConfigStore` owns the mutable Agent draft config and registered workspace state. It does not own an independent selector mode/path.
- `workspaceStore` owns registration/cache against the current bound server.
- `agentTeamRunStore` remains the governing owner of Team create, hydrate, focus, context, and selection after the exact draft snapshot is admitted.
- History/tree owners remain projections of server/live state; they do not compensate for incorrect launch intent.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TeamRunConfigForm.vue` | `RunConfigPanel` for workspace state; `teamRunConfigStore` for Team config | Composes Team-specific controls and relays edits | Workspace selection copies, reset policy, launch sequencing |
| `AgentRunConfigForm.vue` | `RunConfigPanel` for workspace state; `agentRunConfigStore` for Agent config | Composes Agent-specific controls and relays edits | Workspace selection copies, reset policy, launch sequencing |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Local authoritative `mode` and `tempPath` refs in `WorkspaceSelector.vue` | They duplicate launch state and caused the visible/launch split | Controlled `modelValue: WorkspaceSelectionState` owned by `RunConfigPanel.vue` | In This Change | Derived computed values are allowed; independently mutable copies are not |
| Immediate `watch([mode, tempPath], emitWorkspaceInput)` | Controlled user handlers emit complete values directly | `update:modelValue` events from explicit mode/path/select/browse actions | In This Change | Avoid watcher-driven echo loops |
| Separate `select-existing` and `workspace-input-change` event paths | They split one subject across two coordination APIs | One `update:workspace-selection` relay and selector `update:modelValue` | In This Change | Clean-cut caller update in both forms and parent |
| Broad watcher over `effectiveAgentConfig`/`effectiveTeamConfig` value objects | Team value-object identity is not context identity | Context-identity watcher in `RunConfigPanel.vue` | In This Change | Same-draft Team edits must not reset state |
| Repeated ad hoc `{ mode, pendingPath }` event types | Shape cannot represent complete controlled state and is repeated | Shared `WorkspaceSelectionState` type | In This Change | No compatibility alias |
| General Team launch error/result hardening | Not required by the reproduced pre-create defect | Separate ticket if prioritized | Follow-up | Explicitly not introduced here |

## Return Or Event Spine(s) (If Applicable)

- **DS-004 success:** `CreateWorkspace response -> workspaceStore canonical cache -> RunConfigPanel setActiveWorkspaceLoaded -> active config store canonical workspace -> WorkspaceSelectionState existing/canonical -> existing Team/Agent launch path`.
- **DS-005 failure:** `Empty/invalid New state or CreateWorkspace rejection -> RunConfigPanel readiness/error boundary -> active workspace error state -> controlled WorkspaceSelector renders unchanged New/path plus error -> user correction/retry`.

## Bounded Local / Internal Spines (If Applicable)

- **DS-003 parent owner:** `Active context identity computed -> identity change detected -> derive WorkspaceSelectionState from the new context's registered workspace/path -> replace authoritative state -> controlled selector rerenders`. Same-draft immutable config replacement leaves the computed context identity unchanged, so this loop does not run.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Runtime/model/LLM/auto-approve/member edits | DS-001, DS-003 | `teamRunConfigStore` | Replace immutable Team config within the same draft | Existing Team configuration behavior | If treated as context identity, workspace intent resets again |
| Team launch readiness | DS-001, DS-005 | `teamRunConfigStore` plus panel New overlay | Enforce model/member/workspace readiness | Prevent invalid launch | Must not silently select a fallback workspace |
| Workspace option loading/default Temp selection | DS-002, DS-003 | `WorkspaceSelector` presentation, accepted by panel | Present registered choices and propose the existing default | Preserve current initial behavior | Must not directly mutate config or keep local authority |
| Electron folder browse | DS-001 | `WorkspaceSelector` | Acquire a path only when local picker is supported | Existing platform convenience | Must not validate/rewrite remote-node paths on host |
| Bound-node transport | DS-001, DS-002, DS-004, DS-005 | `workspaceStore`/existing Apollo boundary | Route operations to current window node | Remote-node correctness | Host or component endpoint guessing would mix node state |
| History/tree projection | DS-001, DS-002 | Existing run-history/navigation owners | Reveal the actual persisted destination | User-visible completion | Must not create optimistic rows to mask wrong launch input |
| Error rendering | DS-005 | Active config store + selector | Preserve visible workspace error surface | Recovery | Must not replace New state or launch prior workspace |

## Ownership Boundaries

The controlled `WorkspaceSelectionState` boundary ends at `RunConfigPanel`. Child forms and `WorkspaceSelector` may propose replacement values but cannot retain another authoritative copy. The active config stores remain authoritative only for registered workspace identities; an unregistered New path stays transient in the panel until resolved. `workspaceStore` is the only frontend boundary that registers a root with the current node. The existing Team/Agent launch owners may only be invoked after the panel has transformed New into canonical registered config or verified Existing.

The prototype package is a separate reference boundary and is not a production dependency. No change is mirrored there.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `RunConfigPanel` workspace-selection/preparation | Controlled state, context reset, New readiness overlay, create-before-launch | Agent/Team forms and Run button | Selector local state plus parent launch state; forms directly launching based on rendered controls | Strengthen the controlled state/event contract in the panel |
| `teamRunConfigStore` Team draft | Immutable snapshot replacement, `draftId`, registered workspace, readiness | `RunConfigPanel`, Team form edit relay, Team launch owner | Panel mutating frozen draft internals or using config object identity as draft identity | Use existing edits/getters/stable `draftId` |
| `workspaceStore` | Bound-node mutation, canonical metadata, cache | `RunConfigPanel` | Direct GraphQL call or desktop filesystem validation from selector/form | Extend the store's existing registration API if necessary; none expected |
| `agentTeamRunStore` | Launch admission, create, hydrate, context, selection | `RunConfigPanel` after preparation | Panel directly creating history/tree rows or partial Team contexts | Extend the launch owner only if required; not expected |
| Existing history/navigation projection | Live/history merge and ancestry reveal | Workspace tree surface | Launch coordinator inserting compensating tree entries | Fix upstream workspace intent instead |

## Dependency Rules

- `WorkspaceSelector.vue` may read workspace options and platform browse capability, but rendered mode/path/selected ID must come from its controlled prop.
- `WorkspaceSelector.vue` emits complete `WorkspaceSelectionState` replacements; it must not call Agent/Team config stores or launch APIs.
- `TeamRunConfigForm.vue` and `AgentRunConfigForm.vue` may relay controlled state and config edits only; no local workspace refs or reset watchers.
- `RunConfigPanel.vue` may call active config stores, `workspaceStore`, and existing launch owners. It alone decides whether New registration is required.
- Same-draft config edits may replace `effectiveTeamConfig` but must not affect the context-identity key.
- Context reset must use stable selection/draft identity. A deep/value watcher, Team config object reference, definition ID alone, or timing heuristic is forbidden.
- Remote path interpretation remains behind `workspaceStore`/bound server. No Electron host `fs` check or path rewrite.
- No backend, tree, prototype, or compatibility adapter may be added to compensate for frontend state divergence.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `WorkspaceSelectionState` | Transient workspace choice | Carry mode, registered workspace selection, and New-path edit buffer as one value | `{ mode: 'existing' | 'new'; existingWorkspaceId: string | null; newWorkspacePath: string }` | `mode` selects the launch value; inactive buffer retention preserves tab switching without another owner |
| `WorkspaceSelector` `modelValue` / `update:modelValue` | Proposed workspace selection | Render authoritative state and emit complete user changes | `WorkspaceSelectionState` | No `select-existing` or partial `{mode,pendingPath}` compatibility events |
| Agent/Team form `workspaceSelection` / `update:workspaceSelection` | Controlled relay | Pass the same value between panel and selector | `WorkspaceSelectionState` | Thin only |
| `handleWorkspaceSelectionChange(next)` | Active editable context workspace choice | Normalize/store replacement; apply selected registered workspace to active config | `WorkspaceSelectionState` | Ignore while read-only/pending; raw path remains visible, trim only for validation/registration |
| Context-identity computed/watch | Active configuration context | Reset/rehydrate when the active subject changes, or when a selected subject first becomes hydrated | Persisted selection subject key plus hydration-ready bit, Team `draftId`, or Agent config-buffer identity | Must be stable across same-draft Team edits |
| `ensurePendingWorkspaceLoadedForRun()` | Pre-launch workspace readiness | Register New or verify Existing using authoritative state | State plus active config | Exactly one registration attempt per accepted activation |
| Existing `workspaceStore.createWorkspace` | Server workspace registration | Return canonical workspace ID/metadata through existing cache | `{ root_path: string }` | Bound server remains authoritative |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `WorkspaceSelectionState` | Yes | Yes | Low | Use one shared type; `mode` selects ID versus trimmed path |
| Selector controlled model | Yes | Yes | Low | Remove local authority and partial legacy events |
| Context-identity watcher | Yes | Yes | Low | Extract stable IDs/references, never config snapshot identity for Team |
| `workspaceStore.createWorkspace` | Yes | Yes | Low | Reuse unchanged |
| `agentTeamRunStore.launchDraft` | Yes | Yes | Low | Reuse unchanged after canonical workspace update |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Transient controlled workspace state | `WorkspaceSelectionState` | Yes | Low | Avoid `pendingWorkspaceInput`, which omits existing ID and suggests only New input |
| New-path field | `newWorkspacePath` | Yes | Low | Avoid generic `tempPath`; Temp Workspace is a different concept |
| Registered selection field | `existingWorkspaceId` | Yes | Low | Keep ID meaning explicit |
| Context reset key | `activeRunConfigContextIdentity` | Yes | Low | Do not call it config version or snapshot identity |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Controlled workspace input | Workspace config components | Extend | Existing selector/forms are correct placement; only ownership contract changes | N/A |
| Canonical workspace registration | `workspaceStore` | Reuse | Successful controls prove it already owns the correct bound-node contract | N/A |
| Stable Team context identity | `teamRunConfigStore` draft model | Reuse | `draftId` is already preserved across immutable edits | N/A |
| Team launch/hydration | `agentTeamRunStore` | Reuse | Not causal and already owns full post-admission lifecycle | N/A |
| Shared controlled-state type | `types/workspace` | Create New | The same semantic shape is required across four component boundaries and no current type owns it | Existing metadata types describe registered server state, not transient input |
| Tree visibility | Run history/navigation projection | Reuse | Correct when launch uses correct identity | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace run configuration UI (`components/workspace/config`) | Controlled input, context reset, pre-launch resolution, form relay | DS-001–DS-005 | `RunConfigPanel` | Extend | Compact existing folder remains appropriate |
| Workspace types (`types/workspace`) | Shared transient selection contract | DS-001–DS-005 | `RunConfigPanel` and controlled component boundary | Extend | One type file, no runtime owner |
| Workspace store | Bound-node registration/cache | DS-001, DS-004, DS-005 | `workspaceStore` | Reuse | No source change expected |
| Team/Agent config stores | Registered workspace config/readiness | DS-001, DS-002, DS-004 | Existing stores | Reuse | No new pending path state in stores |
| Team/Agent execution and navigation | Launch/hydration/history/tree | DS-001, DS-002 | Existing run owners | Reuse | No source change expected |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `types/workspace/WorkspaceSelectionState.ts` | Workspace types | Shared controlled contract | Define the semantically complete transient state | One subject shared by multiple components | N/A — it is the shared structure |
| `components/workspace/config/WorkspaceSelector.vue` | Workspace config UI | Controlled input surface | Render model, emit complete replacements, preserve options/browse/error UI | Existing cohesive selector | Yes |
| `components/workspace/config/RunConfigPanel.vue` | Workspace config UI | Governing pre-launch owner | Own state, identity reset, readiness, registration sequencing | Existing coordinator already owns Run action | Yes |
| Agent/Team form files | Workspace config UI | Thin facade | Relay controlled state | Existing composition boundaries | Yes |
| Existing colocated specs | Workspace config coverage | Behavioral verification | Reproduce ordering and controlled contract | Tests remain colocated with changed behavior | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Workspace mode/path/ID prop and event types repeated in panel/forms/selector | `autobyteus-web/types/workspace/WorkspaceSelectionState.ts` | Workspace configuration | Four boundaries require exactly the same semantics | Yes — replaces partial `pendingPath` shapes | Yes — one value replaces parent/child authority | A persisted workspace model or generic form-state bag |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `WorkspaceSelectionState` | Yes: mode, registered ID buffer, New path buffer each have one meaning | Yes | Low | Launch must read this value; config workspace ID is registered domain state, not a second active UI mode |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/types/workspace/WorkspaceSelectionState.ts` | Workspace types | Controlled-state contract | Export mode and full state type | Semantically tight shared subject | N/A |
| `autobyteus-web/components/workspace/config/WorkspaceSelector.vue` | Workspace config UI | Controlled surface | Render controlled tabs/ID/path and emit complete replacements from clicks, typing, select, browse, and default Temp proposal | All presentation behavior remains cohesive | Yes |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Workspace config UI | Thin Team facade | Accept/relay `workspaceSelection`; remove split events and initial-path selector state seeding | Keeps Team layout/config events together | Yes |
| `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | Workspace config UI | Thin Agent facade | Accept/relay `workspaceSelection`; preserve locked/read-only behavior | Keeps Agent layout/config events together | Yes |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | Workspace config UI | Governing owner | Own state, derive context identity, rehydrate on real transition, update config for Existing, resolve New, launch | Existing orchestration boundary is correct once duplicate ownership is removed | Yes |
| `autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts` | Workspace config coverage | Coordinator regression | Cover path-then-edit ordering, edit variants, context transitions, no fallback, create failure, and preserved Agent/Existing flows | End-to-end component coordination belongs here | Yes |
| `autobyteus-web/components/workspace/config/__tests__/WorkspaceSelector.spec.ts` | Workspace config coverage | Controlled component contract | Cover controlled render/emission, tab/path retention, default Temp proposal, pending/read-only, keyboard/ARIA/error preservation | Selector-specific behavior | Yes |
| `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` | Workspace config coverage | Thin Team facade | Update/verify controlled prop/event relay and disabled behavior | Interface change is local to form | Yes |
| `autobyteus-web/components/workspace/config/__tests__/AgentRunConfigForm.spec.ts` | Workspace config coverage | Thin Agent facade | Update/verify controlled prop/event relay and locked/read-only behavior | Interface change is local to form | Yes |

## Applied Patterns (If Any)

- **Controlled component:** `WorkspaceSelector` receives one model value and emits complete replacements; the parent owns state/lifecycle.
- **Stable identity watcher:** state reset is keyed to run/draft identity, not immutable value-object replacement.
- **Prepare then delegate:** `RunConfigPanel` resolves New into a canonical registered workspace, then delegates unchanged to the existing Team/Agent execution owner.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/types/workspace/WorkspaceSelectionState.ts` | File | Workspace controlled-state contract | Shared transient type | Adjacent to existing workspace metadata types but semantically separate | Store state, GraphQL types, compatibility aliases |
| `autobyteus-web/components/workspace/config/WorkspaceSelector.vue` | File | Controlled workspace surface | Presentation and complete user-event emission | Existing feature folder | Independent launch state or direct config/launch mutation |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | File | Pre-launch governing owner | State/context lifecycle and workspace preparation | Existing Run button/coordinator boundary | Backend/tree workarounds or config object identity reset |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | File | Thin Team form | Controlled prop/event relay | Existing Team composition | Workspace state copy/reset policy |
| `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | File | Thin Agent form | Controlled prop/event relay | Existing Agent composition | Workspace state copy/reset policy |
| `autobyteus-web/components/workspace/config/__tests__/` | Folder | Colocated config coverage | Focused component/integration regression | Repository testing convention | Live remote-node environment setup |

The existing flat `components/workspace/config` layout is retained because this correction has one shallow component boundary and one shared type; new folders or composables would add indirection without a new owner.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/workspace/config` | Mixed Justified | Yes | Low | Contains the governing panel plus thin/presentation children for one UI capability; responsibilities are explicit per file |
| `types/workspace` | Main-Line Domain-Control contract | Yes | Low | Holds shared workspace shapes without behavior |
| `components/workspace/config/__tests__` | Off-Spine Concern | Yes | Low | Colocated behavioral coverage per repository convention |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Controlled state | `WorkspaceSelector(modelValue) -> update:modelValue(next complete state) -> RunConfigPanel state -> both render and launch` | `WorkspaceSelector.mode/tempPath` plus `RunConfigPanel.pendingWorkspaceInput` | Prevents the reproduced split-brain UI |
| Context identity | `team-draft:${selectedDraft.draftId}` stays stable across `applyConfigEdit` | Watching `effectiveTeamConfig` object reference | Immutable config snapshots are values, not context identity |
| State shape | `{ mode: 'new', existingWorkspaceId: tempId, newWorkspacePath: '/home/.../repo' }`; launch selects path because mode is New | `{ mode: 'existing', pendingPath: '' }` hidden in parent while child shows New | A complete state can preserve both tab buffers while exposing one active choice |
| Launch boundary | `New -> workspaceStore.createWorkspace -> canonical ID -> active config -> launchDraft` | Skip registration and let prior config workspace silently win | Enforces launch-what-is-shown |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `select-existing` and `workspace-input-change` alongside new controlled events | Reduce caller edits | Rejected | Update both form callers and tests in the same change; remove old emits |
| Keep selector local refs synchronized bidirectionally with a prop | Familiar Vue bridge | Rejected | Render directly from controlled state; use explicit event handlers/computed setters without an independent authoritative copy |
| Retain broad watcher plus guard comparing paths/config | Minimal diff | Rejected | Watch actual context identity; no heuristic config-value guard |
| Backend/tree fallback to requested visible path | Could mask frontend error | Rejected | Correct the frontend authority boundary before launch |
| Mirror production change into accepted prototype | Source files currently resemble production | Rejected | Prototype is not a production dependency; leave its approved baseline unchanged |

## Derived Layering (If Useful)

N/A — the spine/ownership model is clearer than introducing layer terminology for this localized Vue state correction.

## Change / Refactor Sequence

1. Add the shared `WorkspaceSelectionState` type with explicit `mode`, `existingWorkspaceId`, and `newWorkspacePath` fields.
2. Convert `WorkspaceSelector.vue` to a controlled component. Replace local authoritative refs/watch emission with computed rendering and explicit complete-state events; retain option loading, Temp proposal, browse, pending/read-only, error, keyboard, and ARIA behavior.
3. Update `TeamRunConfigForm.vue` and `AgentRunConfigForm.vue` to accept and relay the shared controlled state. Remove `select-existing`, partial workspace-input events, and selector `initialPath` seeding.
4. Refactor `RunConfigPanel.vue` to own the state, handle complete changes, update registered workspace config for Existing, and use the same state for readiness and launch preparation.
5. Replace the broad effective-config watcher with a stable active-context identity watcher and explicit derivation/rehydration for a new context. Ensure same Team `draftId` survives every immutable config edit without state reset.
6. On successful New registration, apply canonical metadata through the existing active config store and transition the controlled state to the canonical existing ID before delegating launch. On failure, preserve New/path.
7. Remove obsolete local refs, partial event types/handlers, and broad watcher; do not leave compatibility aliases.
8. Update focused component tests. Add the exact path → settled auto-approve edit → Run Team regression, parameterize other config-edit categories, verify real context reset, explicit Existing behavior, invalid/failure no-fallback behavior, one create/one launch, and preserved Agent/read-only behavior.
9. Run the focused Nuxt tests with `--run`, then implementation-scoped type/lint/build checks selected by the implementation engineer. API/E2E owns broader executable validation after code review.

## Key Tradeoffs

- Keeping transient New-path state in `RunConfigPanel` rather than the Team draft store avoids persisting an unregistered path and keeps the change local. The stable draft ID still provides correct reset semantics.
- Retaining inactive Existing ID and New path in one state record preserves tab switching without recreating a hidden owner. `mode` is the sole active-choice discriminator.
- Updating both Agent and Team form contracts is a slightly larger source diff than a Team-only watcher fix, but both use the same selector. A clean controlled contract removes the shared defect boundary and preserves Agent behavior with focused coverage.
- The prototype is intentionally not synchronized; production correctness takes precedence over altering an approved fixture baseline that is outside the runtime dependency graph.

## Risks

- Incorrect initial derivation could change the current Temp default or selected/read-only display. Mitigate with selector and panel tests for no workspace, Temp available, registered workspace, selected Agent run, and selected Team run.
- A context key that uses definition ID or Team config reference would either leak state across drafts or recreate the bug. Use selection subject plus its hydration-ready transition, or Team draft ID, explicitly; use Agent config object identity only for its existing mutable buffer lifecycle.
- Watcher/event feedback loops could cause duplicate workspace application. Controlled events must originate from user/default-selection actions, not prop echo; registration must run only from one accepted Run activation.
- Trimming input during each controlled update would visibly rewrite user text. Preserve raw `newWorkspacePath`; trim only in validation/path comparison/registration.
- Existing config may retain the prior registered workspace while mode is New. This is deliberate dormant fallback data, not launch authority; every readiness/launch branch must select by `mode` and must never silently use it when New fails.

## Guidance For Implementation

- Treat the exact controlled type and ownership boundary as normative; naming may vary only if semantics remain equally explicit.
- Prefer computed getters and explicit event handlers in `WorkspaceSelector`; do not reintroduce a mirrored prop-to-local watcher pair.
- Keep default Temp proposal as an emitted complete state that the parent accepts and applies to the active config.
- Ensure a selected persisted run that is chosen before its configuration finishes hydrating derives display state once hydration becomes available, without watching later config value-object replacements as editable context changes.
- Use raw path for the input and a trimmed computed path only at readiness/registration boundaries.
- The Team config replacement regression must await Vue reactivity between the config edit and Run click so the test actually exercises the former broad-watcher timing.
- Parameterize representative `TeamLaunchConfigEdit` variants: runtime, model, LLM config (covering thinking/reasoning/fast-mode data), global auto-approve, and member override. Panel expansion should also be shown not to alter controlled state.
- Assert both positive and negative effects: `createWorkspace` receives the requested path; launch receives the canonical-workspace draft; no Temp launch occurs while mode is New; failures do not invoke launch.
- Preserve one accepted activation semantics and the existing pending/read-only guards.
- Do not modify `autobyteus-server-ts`, run-history/tree projection, Electron host path handling, or `autobyteus-web-prototype` for this fix.
