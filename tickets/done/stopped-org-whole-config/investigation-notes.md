# Investigation Notes — ORG-STOPPED-WHOLE-CONFIG-20260917-001

## Bootstrap And Repository State

- Date: 2026-09-17.
- Dedicated worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-org-whole-config`.
- Branch: `codex/stopped-org-whole-config`.
- Freshly fetched base and eventual finalization target: `origin/requirements/flat-agent-organization-model`, not `personal`.
- Resolved base/HEAD/merge-base when bootstrapped: `64852674b5f003aea2a169233093f12a9f80ffba`.
- Initial worktree delta was only this untracked ticket directory. Unrelated base-worktree outputs and tickets were not touched.
- No app, user profile, history package, provider, process, database, or external definition package was modified during investigation.

## User Evidence And Scenario Basis

- User reports that, for a stopped AgentOrg, Settings entered through a selected Agent currently shows only that Agent's configuration. They request the same enclosing-whole-configuration experience used by stopped Teams so the Org root/global settings can be changed.
- Supplied screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_orgs/software_development_department_75403d5130584669869fdd59725f6b3e/software_engineering_team_3e746e3211f34fb39aad3979b4751e04/solution_designer_b1a3b7b01d35499d9fa06baf799a2046/context_files/ctx_292cb8d08517__image.png`.
- The screenshot visibly shows one `Team Configuration` surface with root model/reasoning settings, fixed workspace, tool policy, a `Team Members Override` disclosure, and one Save. Names/model values are fixture evidence, not normative content.
- Supported normal scenario: a user selects any configured member of a stopped retained Org, opens Settings, changes root/global or member model configuration, saves, and later continues the same Org. Direct and mounted-Team member entry points already exist in the product.
- User clarification after SR-001 presentation: the stopped whole-Org Settings UI should present the same familiar configuration form as AgentOrg launch, just as Team launch and stopped-Team configuration feel like the same form to the user. The requirements interpret this as structural/visual form parity with truthful existing-run differences: canonical stopped values, fixed non-model fields, Save instead of Run, and no creation of a new run.

## Prior Ticket Authority

- Read `tickets/done/stopped-org-member-header-actions/requirements-doc.md`, `design-spec.md`, and `personal-stopped-config-comparison.md`.
- The earlier ticket intentionally implemented exact selected-member Settings. Its approved `REQ-002` says Save affects that member only, and its scope explicitly excluded bulk Org/Team defaults propagation.
- Therefore the reported mismatch is real, but it is not a regression against that ticket's approved behavior. This request is a new intended-behavior change that supersedes the member-only Settings policy while preserving the earlier `+`, lifecycle, and continuation work.

## Current AgentOrg Settings Path

- `autobyteus-web/components/workspace/org/AgentOrgWorkspaceView.vue`
  - `AgentOrgMemberRunConfigPanel` is rendered in configuration mode.
  - The key combines `orgRunId`, selected member address, and `agentRunId`.
  - The gear calls `openMemberConfiguration()` and does not select an Org-root configuration subject.
  - Eligible configured direct and mounted-Team Agents expose the action; task Agents do not.
- `autobyteus-web/components/workspace/org/AgentOrgMemberRunConfigPanel.vue`
  - Renders an `Agent Configuration` editor around one exact member.
  - Runtime/workspace remain locked; model/model-specific settings are the editable fields when stopped.
- `autobyteus-web/composables/useAgentOrgMemberModelConfig.ts`
  - Identity is `{ orgRunId, memberAddress, agentRunId }`.
  - Loads and saves one canonical member configuration.
  - Guards historical/inactive ownership, target identity, pending submission, selection changes, and uncertain persistence.
- `autobyteus-web/services/runConfigEditing/agentOrgMemberModelConfigClient.ts`, `autobyteus-web/stores/agentOrgContextsStore.ts`, and the GraphQL types provide the exact-member client boundary.
- `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-manager.ts` and `agent-org-member-model-config-mutator.ts`
  - Validate and patch one exact configured member.
  - Serialize with the Org transition owner, reject active/archived/ineligible cases, write the execution tree, read it back, and distinguish failed/indeterminate persistence.

## Established Whole-Team Path

- `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`: gear opens the central configuration mode for the selected Team subject.
- `autobyteus-web/components/workspace/config/RunConfigPanel.vue` and `ExistingRunConfigEditor.vue`:
  - The selected Team resolves to one `Team Configuration` editor.
  - It loads the canonical complete Team execution tree and renders root plus member configuration through `TeamRunConfigForm`.
  - Runtime/workspace/tool policy are retained as fixed existing-run values; model/model-specific fields are editable.
- `autobyteus-web/services/runConfigEditing/existingTeamModelConfigDraft.ts`:
  - Records every configured scope's original and draft selection.
  - A child is linked when runtime/model/model-config matched its parent at draft start.
  - Parent changes propagate to linked, not-directly-edited children; explicit/direct edits stay independent.
  - Only changed scopes become patches.
- `autobyteus-web/services/runConfigEditing/existingTeamRunFormModel.ts` projects the canonical tree plus planner into the existing-run form.
- `autobyteus-web/stores/existingRunModelConfigStore.ts` and `existingRunModelConfigMutationClient.ts` own multi-scope Save and canonical reconciliation.
- `autobyteus-server-ts/src/agent-team-execution/services/team-run-model-config-mutator.ts` resolves all requested configured scopes before applying patches to one next tree. The Team manager validates selections before persistence and reads back the canonical result.

## AgentOrg Canonical Data Feasibility

- `autobyteus-server-ts/src/agent-org-execution/domain/agent-org-run-execution-tree.ts` and shared execution-tree records already persist:
  - root Org `defaultLaunchConfiguration`;
  - configured direct Agent launch configurations;
  - configured mounted Team `defaultLaunchConfiguration`;
  - each configured Agent inside a mounted Team;
  - tasks separately from configured topology.
- `agent-org-run-execution-tree-schema.ts` enforces a flat Org membership layer, configured placement uniqueness, valid launch configurations, and handoff endpoint validity.
- The current inspection path returns the complete canonical tree without restoring the run. This makes a whole-Org stopped editor technically feasible without deriving values from mutable current definitions.
- Whether a schema/data migration is needed remains an architecture decision, but no missing persisted field has been identified during requirements investigation.

## Whole-Org New-Run Form Is Not The Existing-Run Contract

- `autobyteus-web/components/workspace/config/AgentOrgRunConfigPanel.vue` already renders root, direct-Agent, mounted-Team, and Team-member configuration for a *new* Org run.
- It permits new-run authoring concerns such as runtime, workspace, and tool-policy changes and ultimately creates fresh identities.
- `agentOrgRunLaunchSeed.ts` reads an existing tree only to build a definition-relative new-run seed, requiring current exact definitions and references to match.
- It is useful presentation/projection evidence but cannot be assumed to be the stopped existing-run authority unchanged. The stopped editor must remain based on the retained canonical execution tree and existing-run lifecycle/preservation rules.

## Original Personal-Branch Comparison

- Inspected pinned commit `5645b49d6f51faa60bd3545bc8e3f0e7e3f96793`, the same historical personal basis used by prior ticket investigation.
- Its `autobyteus-web/components/workspace/config/RunConfigPanel.vue` routes a selected Team to one `ExistingRunConfigEditor`, with a `Team Configuration` title and the complete Team form.
- This source supports the user's recollection that nested-Team-era Settings was enclosing-Team-wide rather than a leaf-only editor.
- This is source-pattern evidence only. It does not authorize reinstating nested Team architecture or copying old code blindly.

## Evidence Versus Intended Behavior Versus Design

- Evidence: current Org Settings is exact-member; current Team Settings is whole-Team; the Org tree already contains resolved root and configured hierarchy values; personal source used whole enclosing-Team configuration.
- Proposed intended behavior: replace the configured Org member-only Settings experience with whole enclosing-Org Settings while preserving same-runtime, inactive-run, continuity, and no-provider-start boundaries. This is pending user approval in `requirements-doc.md`.
- Design not yet authorized: no target module/service/API ownership decision is approved until the requirements baseline is explicitly accepted.

## Supplemental Artifact Inventory

| Artifact | Purpose | Related IDs | Status | Approval Applicability |
| --- | --- | --- | --- | --- |
| Supplied Team screenshot | Comparative UI evidence | REQ-001–004, AC-001–002 | Read-only | Not behavior-defining |
| Prior stopped-Org ticket archive | Historical authority and regression boundary | REQ-001, REQ-008 | Read-only | Earlier approval remains authoritative outside superseded Settings scope |
| Personal commit source comparison | Historical enclosing-Team pattern | REQ-001–004 | Read-only | Evidence only |

## Requirements Approval

- User approved SR-002 on 2026-09-17 by confirming the original nested-Team whole-configuration behavior should be used for AgentOrg. The approved baseline includes:
  1. Settings from any configured stopped Org member opens the same whole-Org editor.
  2. Root/global plus all configured direct/mounted scopes are shown; task executions are excluded.
  3. Only same-runtime model and model-specific parameters are editable; workspace/runtime/tool policy remain fixed.
  4. Parent-linked values propagate like Team Settings while explicit overrides remain independent.
  5. One coherent Save preserves all non-model run data; active/ineligible runs stay protected.
  6. The visible structure matches the familiar AgentOrg launch configuration form, while existing-run-only locks and Save semantics remain clear.

## Commands And Source Reads

- `git status --short`, `git rev-parse HEAD`, `git branch --show-current`, and `git merge-base HEAD origin/requirements/flat-agent-organization-model` verified isolation/base.
- `sed`/`cat` reads covered the current and prior requirements, AgentOrg workspace/member editor/composable/manager/mutator/tree/schema, Team workspace/existing editor/planner/projector/mutator, AgentOrg new-run form/seed, and pinned personal `RunConfigPanel.vue`.
- No executable test, app startup, mutation, or production implementation was performed during requirements investigation.

## Architecture Investigation — Post-Approval

### Current boundary and reusable policy

- `ExistingRunConfigEditor.vue` and `existingRunModelConfigStore.ts` already form the reusable existing-run editor/state machine for standalone Agent and Team subjects: canonical load, per-scope model options, schema readiness, dirty planning, Save, canonical result adoption, uncertain-write reconciliation, stale-load generations, and lifecycle locks.
- That editor currently discovers Agent/Team targets from `agentSelectionStore` internally. AgentOrg uses a separate workspace/context model, so extending the editor cleanly requires an explicit target input rather than a second implicit selector or a duplicated Org-only state machine.
- `TeamRunConfigForm.vue`, `TeamMemberConfigTree.vue`, `TeamScopeConfigEditor.vue`, and `MemberOverrideItem.vue` already accept editable/new-run and existing-run model variants for Team hierarchy scopes. `AgentOrgDirectAgentOverrideRow.vue` is the remaining launch-only child row and currently accepts only `EditableTeamFormAgentNode`.
- `AgentOrgRunConfigPanel.vue` owns too many concerns for direct reuse: current definition/reference loading, optional source-run seeding, new-run workspace/tool/runtime editing, launch readiness, and creation. The reusable target is its visible configuration-body structure, not the whole launch controller.

### Canonical AgentOrg shape and hierarchy

- `AgentOrgRunExecutionTreeFileV1` is already the canonical whole-run configuration carrier. It contains root Org defaults, configured direct Agent launches, direct mounted-Team defaults, mounted-Team configured Agents, tasks, handoffs, archive/application metadata, and immutable identities.
- Configurable model scopes are unambiguous and finite:
  - `CONFIGURED_ORG` at `/`;
  - `CONFIGURED_TEAM` at each direct mounted-Team address;
  - `CONFIGURED_AGENT` at direct-Agent and mounted-Team-Agent addresses.
- Task executions use separate records inside the tree and are excluded from configured-scope resolution. No current-definition read is needed to display or save the stopped canonical hierarchy.
- Team inheritance is represented in the editor by comparing a child's resolved model configuration to its parent at draft start. The current Team tree is one level deep. AgentOrg adds one additional configured hierarchy level, so the reusable propagation policy must recurse through linked descendants rather than stop after immediate children.

### Server ownership and persistence

- The exact-member Org API is used only by the exact-member panel/composable/client/store path and its tests/docs. Search found no separate supported consumer requiring it to remain.
- `AgentOrgRunManager.withTransition(orgRunId, ...)` is already the authoritative lifecycle/persistence boundary for inspection, activation/termination, and exact-member writes. A whole-Org mutation belongs behind this same lock.
- The current exact-member manager path already checks package admission, active state, archive state, application binding/root admission, validates selection, writes with the atomic file writer, reads back, and distinguishes committed, failed, and indeterminate outcomes.
- The established Team multi-scope path adds the missing aggregate pattern: resolve all targets first, call `RunModelSelectionService.validateMany`, construct one next immutable tree, perform one write, and verify one canonical readback. Validation errors are scope-addressed and no write occurs until all scopes are valid.
- `RunModelSelectionService` already exposes `validateMany` and `listOptionsMany` with fresh request-local shared catalog/capacity evidence. `AgentOrgRunManagerOptions` currently narrows the validator to `validate`; the whole-Org design can safely widen this existing dependency to `validateMany` rather than introduce a new validation owner.

### Client canonical publication

- `AgentOrgExecutionContext.applyMemberModelConfig` currently defensively verifies that a canonical response changes only one configured Agent's model fields, replaces that Agent in the retained execution view, rebuilds the index, and updates the retained Agent context/conversation model identifier without replacing conversation or Activity objects.
- Whole-Org canonical publication must generalize this operation: validate the same root/topology/identities and locked fields across every configured scope, replace only the execution tree's model fields, rebuild the index once, and patch retained configured Agent contexts in place. Rehydrating a new context would risk losing local conversation, Activity, draft, selection, and attachment state and is therefore rejected.
- `agentOrgContextsStore` already owns operation gating, binding revision checks, context identity checks, and submission locks. Whole-run read/save should remain behind this owner, keyed by `orgRunId`, rather than permit components to call GraphQL directly.

### API and form contract decision evidence

- The whole-run read must return the canonical execution tree plus lifecycle/editability. Reusing general inspection alone would omit the model-editability contract and would mix package observation with authoring authority.
- Model options should remain a separate advisory query, as in Team Settings, so catalog/capacity unavailability does not prevent canonical configuration display. Save remains authoritative and revalidates all patches under the manager transition.
- The whole-run mutation must accept one `orgRunId` and a list of explicit `{ scopeKind, scopeAddress, llmModelIdentifier, llmConfig }` patches and return one canonical execution tree or a truthful failure/indeterminate result.
- A shared `AgentOrgRunConfigForm` body is required to make launch and stopped Settings structurally identical without duplicating markup. Launch and existing-run controllers retain different owners/actions (`Run` versus `Save`) and supply different form modes.

### Migration evidence

- The design changes neither `schemaVersion: 1` nor the serialized execution-tree shape. It updates the same `llmModelIdentifier` and `llmConfig` fields already read by restore/continuation.
- Existing AgentOrg packages are directly usable through the current schema validator and store. No bulk scan/rewrite, startup migration, compatibility decoder, or dual read/write is justified.

### Architecture commands

- `rg` traced all exact-member symbols and confirmed their bounded consumer set.
- `sed`/`cat` inspected the existing-run store/editor/options client, AgentOrg context/store, Team and Org form models/components, GraphQL resolvers, manager/service boundaries, Team aggregate mutator, Team history service, and model-selection validator.
- Architecture investigation remained read-only; no source/test implementation, runtime service, database, or user data was changed.
