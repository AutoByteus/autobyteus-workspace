# Design Spec

## Current-State Read

The current application experience already has one good high-level architectural choice: `ApplicationShell.vue` keeps the route setup-first, and `ApplicationLaunchSetupPanel.vue` is reused both before entry and inside the immersive control panel. That single-owner setup surface should remain.

The current problems come from two different kinds of leakage:

1. **Presentation leakage**
   - `ApplicationCard.vue` renders `packageId` directly on the card.
   - `ApplicationShell.vue` renders `packageId`, `localApplicationId`, raw `bundleResources`, and `writable` in the default setup hero.
   - The same `detailItems` block is reused inside the immersive control panel, so the technical leak continues after entry.
   - `applicationStore` and `ApplicationFields` make this easy because catalog and detail consumers share one flat internal-heavy application shape.

2. **Configuration-model leakage**
   - `ApplicationLaunchDefaultsFields.vue` is a weaker parallel form stack instead of a composition of safe shared primitives.
   - Workspace configuration is a raw string input instead of a guided path selector.
   - Agent-team-backed application setup cannot preserve mixed-runtime/member-override state because persisted application setup stores only flat `launchDefaults`.
   - `ApplicationRuntimeResourceResolver` labels bundled resources by `localId`, so resource selection UI shows technical identifiers.

The current coupling/fragmentation problems are:

- **One flat application data model is doing too much.** The same store/query shape feeds catalog presentation, route setup, technical diagnostics, iframe bootstrap, and internal host details.
- **Application setup duplicates lower-level launch-config behavior but not the real standalone run-form ownership.** The duplicate is weaker, and it drifts whenever shared runtime/model/workspace behavior improves elsewhere.
- **The saved config contract is flatter than the launch pipeline it feeds.** `ApplicationRunBindingLaunchService` already supports explicit team member configs, but application setup persistence cannot represent them.
- **The bundle-resource summary contract is user-hostile by construction.** Friendly names are thrown away and replaced with `localId`.
- **Stale launch/session localization remains from old refactors.** This is dead weight in the touched area.

The target design must respect these constraints:

- `ApplicationSurface.vue` still needs bootstrap metadata such as `packageId` and `localApplicationId`; the target design must hide these from default UX, not remove them from transport/bootstrap internals.
- `ApplicationLaunchSetupPanel.vue` should remain the authoritative setup owner reused pre-entry and in immersive configure mode.
- Shared standalone run forms (`AgentRunConfigForm.vue`, `TeamRunConfigForm.vue`, `WorkspaceSelector.vue`) are **not** safe extensibility points for app-specific behavior; the user explicitly warned about prior reuse causing runtime fields to disappear from normal agent/team forms.
- The host-managed application config path must become rich enough to preserve team mixed-runtime state without forcing the runtime launcher back to flat preset mode.

## Intended Change

This change has three design goals that move together.

### 1. Separate user-facing application presentation from internal bootstrap/diagnostics metadata

The catalog and default setup/immersive details will become presentation-first surfaces:
- catalog: name, description, setup summary
- setup page: name, description, clear setup guidance
- immersive details: name, description, concise “what this app does” context

Internal identifiers (`packageId`, `localApplicationId`, raw bundle mappings, writable source, launch instance id, engine state) will move behind an explicit technical-details affordance and will no longer appear in the normal application path.

### 2. Replace the flat application `launchDefaults` contract with a resource-kind-aware `launchProfile`

The old contract is too weak because it stores only one runtime/model/workspace triple.
The new contract will store one explicit `launchProfile` per configured slot:
- agent-backed slot -> agent launch profile
- agent-team-backed slot -> team launch profile with shared team defaults plus one saved member profile per current leaf member

This is a clean-cut replacement, not a dual-path design.

### 3. Build application-specific setup editors from safe low-level primitives, not by reusing standalone run-form wrappers

The application flow will **not** reuse `AgentRunConfigForm.vue`, `TeamRunConfigForm.vue`, or `WorkspaceSelector.vue` directly.
Those components own standalone run-form semantics and are the wrong boundary for application-specific configuration.

Instead, application setup will use:
- `RuntimeModelConfigFields.vue` as-is for shared runtime/model/config behavior
- shared team readiness and member-runtime utilities where they are pure and form-agnostic
- new application-specific editors and workspace-path selector components for app-owned setup behavior

This directly addresses the user’s explicit warning: no app-specific flags or additional attributes will be added to standalone run-form wrappers just to make applications work.

## Canonical Launch-Config Contract Shapes

### `supportedLaunchConfig` declaration in `manifests.ts`

The manifest declaration becomes resource-kind-aware because the same slot can legally switch between `AGENT` and `AGENT_TEAM` when `allowedResourceKinds` contains both.

```ts
type ApplicationSupportedAgentLaunchConfigDeclaration = {
  runtimeKind?: boolean | null;
  llmModelIdentifier?: boolean | null;
  workspaceRootPath?: boolean | null;
};

type ApplicationSupportedTeamLaunchConfigDeclaration = {
  runtimeKind?: boolean | null;         // shared team default
  llmModelIdentifier?: boolean | null;  // shared team default
  workspaceRootPath?: boolean | null;   // shared team workspace root
  memberOverrides?: {
    runtimeKind?: boolean | null;
    llmModelIdentifier?: boolean | null;
  } | null;
};

type ApplicationSupportedLaunchConfigDeclaration = {
  AGENT?: ApplicationSupportedAgentLaunchConfigDeclaration | null;
  AGENT_TEAM?: ApplicationSupportedTeamLaunchConfigDeclaration | null;
};
```

Rules:
- `supportedLaunchConfig` keys must be a subset of `slot.allowedResourceKinds`.
- The active declaration is selected by the effective `resourceRef.kind`, not by the slot alone.
- If a mixed-kind slot currently points at an `AGENT` resource, only `supportedLaunchConfig.AGENT` is used.
- If that same slot later points at an `AGENT_TEAM` resource, only `supportedLaunchConfig.AGENT_TEAM` is used.
- If the selected resource kind has no matching declaration, the host shows no launch-profile editor for that kind and persists `launchProfile: null` for that selection.
- `autoExecuteTools`, `skillAccessMode`, and `workspaceId` are intentionally absent from the manifest declaration because host-managed application setup does not let the user edit them in this flow.

### Persisted `launchProfile` union in `runtime-resources.ts`

The persisted contract is exact and intentionally smaller than the downstream run-launch contract. It stores only user-editable host-managed settings plus canonical team-member identity.

```ts
type ApplicationConfiguredAgentLaunchProfile = {
  kind: "AGENT";
  runtimeKind?: string | null;
  llmModelIdentifier?: string | null;
  workspaceRootPath?: string | null;
};

type ApplicationConfiguredTeamMemberProfile = {
  memberRouteKey: string;      // canonical launch + validation key
  memberName: string;          // human-readable snapshot for UI and app launch payloads
  agentDefinitionId: string;   // canonical identity guard for topology drift
  runtimeKind?: string | null; // null/omitted => inherit team defaults.runtimeKind
  llmModelIdentifier?: string | null; // null/omitted => inherit team defaults.llmModelIdentifier
};

type ApplicationConfiguredTeamLaunchProfile = {
  kind: "AGENT_TEAM";
  defaults: {
    runtimeKind?: string | null;
    llmModelIdentifier?: string | null;
    workspaceRootPath?: string | null;
  } | null;
  memberProfiles: ApplicationConfiguredTeamMemberProfile[];
};

type ApplicationConfiguredLaunchProfile =
  | ApplicationConfiguredAgentLaunchProfile
  | ApplicationConfiguredTeamLaunchProfile;

type ApplicationConfiguredResource = {
  slotKey: string;
  resourceRef: ApplicationRuntimeResourceRef;
  launchProfile?: ApplicationConfiguredLaunchProfile | null;
};
```

Rules:
- `launchProfile.kind` must match `resourceRef.kind`.
- Agent profiles stay flat because the selected resource is one agent.
- Team profiles persist both shared team defaults and one saved member profile for each current leaf member at save time.
- Team `memberProfiles` are deterministically sorted by `memberRouteKey` before persistence.
- The canonical persisted team-member identity is the tuple `(memberRouteKey, agentDefinitionId)`.
- `memberName` is still persisted as a human-readable snapshot so app-backend launch helpers can produce `ApplicationTeamMemberLaunchConfig` without re-querying team definitions.
- `workspaceRootPath` is persisted once at the team-default level and copied onto each runtime member launch config during app-backend launch mapping.
- `runtimeKind` / `llmModelIdentifier` on a team member profile mean override values; `null` or omission means inherit from `defaults`.
- Save-time validation requires every member to resolve to a concrete effective runtime/model after applying member overrides over team defaults. The persisted profile never intentionally stores an unresolved ready state.
- `autoExecuteTools`, `skillAccessMode`, `workspaceId`, and `llmConfig` are not persisted in `launchProfile` because this host-managed application setup flow does not let the user edit them. The app-backend launch helper injects the fixed host-managed values later (`autoExecuteTools: true`, host skill-access default, workspace resolution from `workspaceRootPath`).

### Concrete example

```json
{
  "resourceRef": { "owner": "bundle", "kind": "AGENT_TEAM", "localId": "brief-studio-team" },
  "launchProfile": {
    "kind": "AGENT_TEAM",
    "defaults": {
      "runtimeKind": "AUTOBYTEUS",
      "llmModelIdentifier": "openai/gpt-5",
      "workspaceRootPath": "/Users/normy/autobyteus_org/autobyteus-workspace-superrepo"
    },
    "memberProfiles": [
      {
        "memberRouteKey": "researcher",
        "memberName": "researcher",
        "agentDefinitionId": "bundle-agent__researcher"
      },
      {
        "memberRouteKey": "reviewer",
        "memberName": "reviewer",
        "agentDefinitionId": "bundle-agent__reviewer",
        "runtimeKind": "LM_STUDIO",
        "llmModelIdentifier": "lmstudio/qwen3-35b-a3b"
      }
    ]
  }
}
```

The first member inherits the shared runtime/model defaults. The second member overrides both.

## Recoverable Invalid-State Readback Contract

The host setup readback contract becomes slot-recoverable instead of panel-fatal.

```ts
type ApplicationResourceConfigurationIssueCode =
  | "INVALID_RESOURCE_SELECTION"
  | "PROFILE_KIND_MISMATCH"
  | "PROFILE_UNSUPPORTED_BY_SLOT"
  | "TEAM_TOPOLOGY_CHANGED"
  | "PROFILE_MALFORMED";

type ApplicationResourceConfigurationIssue = {
  severity: "blocking";
  code: ApplicationResourceConfigurationIssueCode;
  message: string;
  staleMembers?: Array<{
    memberRouteKey: string;
    memberName: string;
    agentDefinitionId: string;
    reason: "MISSING_FROM_TEAM" | "AGENT_CHANGED";
    currentAgentDefinitionId?: string | null;
  }> | null;
};

type ApplicationResourceConfigurationView = {
  slot: ApplicationResourceSlotDeclaration;
  status: "READY" | "NOT_CONFIGURED" | "INVALID_SAVED_CONFIGURATION";
  configuration: ApplicationConfiguredResource | null;          // only for READY
  invalidSavedConfiguration: ApplicationConfiguredResource | null; // stale snapshot when recoverable
  issue: ApplicationResourceConfigurationIssue | null;
  updatedAt: string | null;
};
```

Rules:
- `ApplicationResourceConfigurationService.listConfigurations(...)` must catch slot-local validation failures and convert them into `status: "INVALID_SAVED_CONFIGURATION"` instead of throwing the whole request.
- Only application-level failures (bundle not found, store failure, available-resource query failure, transport failure) are allowed to surface as the panel-level `loadError` state.
- `invalidSavedConfiguration` is populated when the service can still normalize the last saved selection/profile enough for the frontend to repair it. For irreparably malformed saved JSON, `invalidSavedConfiguration` may be `null`, but the view still carries a blocking `issue`.
- `runtimeControl.getConfiguredResource(slotKey)` remains strict-valid-only: it returns a valid `ApplicationConfiguredResource` for `status: "READY"` and returns `null` for `NOT_CONFIGURED` or `INVALID_SAVED_CONFIGURATION`.
- The setup page and immersive configure panel both consume the same `ApplicationResourceConfigurationView[]`, so the same issue code/message blocks entry/reload and appears in both places.

### Team-profile repair path

`ApplicationTeamLaunchProfileEditor` owns repair, not the backend service.

Repair algorithm when `status === "INVALID_SAVED_CONFIGURATION"` and the selected resource kind is `AGENT_TEAM`:
1. Resolve the current leaf members for the selected team resource.
2. Seed shared team defaults from `invalidSavedConfiguration.launchProfile.defaults` when those fields are still supported by the current declaration.
3. For each current leaf member, try to carry forward the saved override by exact canonical identity tuple `(memberRouteKey, agentDefinitionId)`.
4. If a saved record matches `memberRouteKey` but the `agentDefinitionId` changed, do not carry the override forward; instead expose it in `issue.staleMembers` with reason `AGENT_CHANGED`.
5. Saved members with no current leaf match are exposed in `issue.staleMembers` with reason `MISSING_FROM_TEAM` and are omitted from the repair draft.
6. Current leaf members with no reusable saved override start empty/inheriting, so readiness stays blocked until the repaired draft resolves every member runtime/model.
7. A successful save replaces the stale saved profile completely and clears the issue on the next read.

For `AGENT` slots, kind-mismatch cases, or malformed snapshots where no reusable team seed exists, `ApplicationLaunchSetupPanel.vue` preserves the selected resource, shows the slot-local blocking issue, and seeds the effective editor with an empty launch-profile draft for that kind.

This keeps stale-topology recovery local to the team editor while keeping `ApplicationLaunchSetupPanel.vue` as the single authoritative load/save/gate owner.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: identify obsolete legacy paths/files included in this scope.
- Treat removal as first-class design work: when clearer subsystem ownership, reusable owned structures, or tighter file responsibilities make fragmented or duplicated pieces unnecessary, name and remove/decommission them in scope.
- Decision rule: the design is invalid if it depends on compatibility wrappers, dual-path behavior, or legacy fallback branches kept only for old behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-APP-001 | `Primary End-to-End` | GraphQL application reads | Catalog / shell presentation | `applicationStore` | Controls what application data is available to user-facing surfaces and what stays internal-only |
| DS-APP-002 | `Primary End-to-End` | Application route setup UI | Persisted slot configuration | `ApplicationLaunchSetupPanel` + `ApplicationResourceConfigurationService` | Core save/load spine for host-managed application setup |
| DS-APP-003 | `Primary End-to-End` | App backend reads saved config | Agent/team run creation | Application backend launch service | Preserves application-owned runtime orchestration while consuming the richer saved launch profile |
| DS-APP-004 | `Return-Event` | Persisted application slot config | Setup gate + immersive configure panel | `ApplicationLaunchSetupPanel` | Ensures setup state stays consistent pre-entry and post-entry |
| DS-APP-005 | `Bounded Local` | Persisted team launch profile | Editable team draft -> readiness -> compiled saved profile | `ApplicationTeamLaunchProfileEditor` | Contains the local complexity of reconstructing team-global defaults plus per-member overrides from the saved team profile contract |

## Primary Execution Spine(s)

- `GraphQL list/detail -> applicationStore -> ApplicationCard / ApplicationShell / ApplicationSurface`
- `ApplicationShell -> ApplicationLaunchSetupPanel -> ApplicationResourceSlotEditor -> REST resource-config routes -> ApplicationResourceConfigurationService -> ApplicationResourceConfigurationStore`
- `Application backend launch service -> runtimeControl.getConfiguredResource -> application launch-profile mapping helper -> runtimeControl.startRun -> ApplicationRunBindingLaunchService -> AgentRunService / TeamRunService`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-APP-001 | The frontend reads application data into one store, but the target design splits user-facing presentation from bootstrap/diagnostics metadata so default UI cannot casually render internal identifiers again. | `applicationStore`, `ApplicationCard`, `ApplicationShell`, `ApplicationSurface` | `applicationStore` | GraphQL fragment split, internal metadata nesting, diagnostics-only access |
| DS-APP-002 | The shell delegates all setup work to one setup panel, which chooses the correct slot editor by selected resource kind, builds a resource-kind-aware launch profile, and persists it through one backend validation boundary. | `ApplicationShell`, `ApplicationLaunchSetupPanel`, `ApplicationResourceSlotEditor`, `ApplicationResourceConfigurationService`, `ApplicationResourceConfigurationStore` | `ApplicationLaunchSetupPanel` + `ApplicationResourceConfigurationService` | Friendly resource naming, workspace-path selection, definition lookup, readiness evaluation |
| DS-APP-003 | The application backend still owns when to launch runs. It reads the saved configured resource, maps the saved launch profile into the runtime launch input it needs, and starts the run through the existing application runtime-control/startRun spine. | application backend launch service, `runtimeControl`, `ApplicationRunBindingLaunchService` | application backend launch service | launch-profile helper, sample-app adoption, runtime launch mapping |
| DS-APP-004 | Every successful save comes back through the same configuration view/readback path, so setup page and immersive configure panel stay aligned and the gate sees the same persisted truth. | `ApplicationLaunchSetupPanel`, `ApplicationResourceConfigurationService`, `ApplicationResourceConfigurationStore` | `ApplicationLaunchSetupPanel` | gate state aggregation, save/reset state, error surfacing |
| DS-APP-005 | Team-backed application setup reconstructs a team-style draft from saved team defaults plus one persisted member profile per current leaf member, lets the user edit global and per-member runtime/model choices, validates readiness, and recompiles the persisted team profile on save. | `ApplicationTeamLaunchProfileEditor` | `ApplicationTeamLaunchProfileEditor` | leaf-member lookup, runtime-model catalog lookup, team readiness utilities |

## Spine Actors / Main-Line Nodes

- `applicationStore`
- `ApplicationShell`
- `ApplicationLaunchSetupPanel`
- `ApplicationResourceSlotEditor`
- `ApplicationAgentLaunchProfileEditor`
- `ApplicationTeamLaunchProfileEditor`
- `ApplicationResourceConfigurationService`
- `ApplicationResourceConfigurationStore`
- application backend launch services (`brief-run-launch-service.ts`, `lesson-runtime-service.ts`, future app launch owners)
- `ApplicationRunBindingLaunchService`

## Ownership Map

- `applicationStore`
  - Owns application list/detail fetching, cache invalidation, and projection of fetched data into presentation-safe vs bootstrap-only fields.
  - Must not own user-facing diagnostics decisions or setup form logic.
- `ApplicationShell`
  - Owns setup vs immersive phase, the user-facing route information hierarchy, and whether technical details are shown.
  - It is the governing route owner, but it is **not** the slot-config editor owner.
- `ApplicationLaunchSetupPanel`
  - Owns setup load/save/reset orchestration, one draft per slot, refresh behavior, and the authoritative gate state emitted to the shell.
  - It is the public setup boundary for both setup page and immersive configure panel.
- `ApplicationResourceSlotEditor`
  - Owns the resource-kind switch between agent-backed and team-backed launch-profile editors.
  - Must not own persistence or shell phase logic.
- `ApplicationAgentLaunchProfileEditor`
  - Owns the bounded local draft UI for an agent-backed slot.
- `ApplicationTeamLaunchProfileEditor`
  - Owns the bounded local reconstruct/edit/validate/compile flow for team-backed slots.
- `ApplicationResourceConfigurationService`
  - Owns launch-profile normalization, validation, stale-profile rejection, migration of old saved values, and configuration view building.
  - It is the authoritative backend owner for host-managed application setup invariants.
- `ApplicationResourceConfigurationStore`
  - Owns only persisted storage records and schema migration mechanics, not semantic validation.
- application backend launch service
  - Owns business timing and app-specific launch decisions.
  - It remains the governing owner for when a run starts.
- `ApplicationRunBindingLaunchService`
  - Owns runtime run binding creation once the application backend has already decided to launch.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `pages/applications/index.vue` | `applicationStore` + `ApplicationCard` | Thin route entry for catalog page | catalog data shaping |
| `pages/applications/[id].vue` via `ApplicationShell.vue` | `ApplicationShell` | Thin route entry for setup/immersive application route | slot configuration logic |
| REST route registration in `application-backends.ts` | `ApplicationResourceConfigurationService` | HTTP boundary for resource configuration CRUD | launch-profile validation or migration semantics |
| `ApplicationImmersiveControlPanel.vue` | `ApplicationShell` + `ApplicationLaunchSetupPanel` | Thin immersive disclosure shell | separate duplicated setup owners |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/applications/ApplicationLaunchDefaultsFields.vue` | Flat defaults editor cannot represent resource-kind-aware setup and duplicates weaker runtime/model/workspace UX | `ApplicationResourceSlotEditor.vue`, `ApplicationAgentLaunchProfileEditor.vue`, `ApplicationTeamLaunchProfileEditor.vue`, `ApplicationWorkspaceRootSelector.vue` | `In This Change` | Remove rather than extend with more app-only conditions |
| Flat `launchDefaults` contract on application resource config | Cannot preserve team member overrides or mixed runtimes | `launchProfile` resource-kind-aware contract | `In This Change` | Clean-cut replacement |
| `supportedLaunchDefaults` manifest declaration name | Naming drifts from the new launch-profile model | `supportedLaunchConfig` declaration | `In This Change` | Clean-cut rename across in-repo manifests |
| Catalog-card package metadata row | User-hostile default information hierarchy | name/description/setup summary card layout | `In This Change` | Remove from default card entirely |
| Setup/immersive default internal details block | User-hostile default information hierarchy | shell-level presentation summary plus explicit diagnostics affordance | `In This Change` | Technical details only when explicitly opened |
| Stale `ApplicationLaunchConfigModal.*` localization keys and old session-era `ApplicationShell.*` keys | No live component owners remain | deletion | `In This Change` | Remove generated and source localization entries together |
| Overfetch of internal metadata on catalog list query | Makes accidental display leakage easy | list/detail query split and nested bootstrap metadata in store | `In This Change` | No server schema split required |

## Return Or Event Spine(s) (If Applicable)

`ApplicationResourceConfigurationStore -> ApplicationResourceConfigurationService -> ApplicationLaunchSetupPanel -> ApplicationShell / ApplicationImmersiveControlPanel`

This return spine matters because the setup page and immersive configure panel must both reflect one persisted truth. The setup panel remains the single return owner that aggregates save results into gate state.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ApplicationTeamLaunchProfileEditor`
  - Short arrow chain:
    `persisted team member profiles -> reconstruct team-style draft -> user edits global/member state -> readiness evaluation -> compile explicit member profiles -> save payload`
  - Why this bounded local spine matters:
    - It contains the only place where the UI needs a “global runtime/model + member override” editing experience over an explicit saved member-profile representation.
    - Keeping this loop local prevents that complexity from leaking into `ApplicationLaunchSetupPanel` or the backend persistence owner.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| GraphQL fragment split and store projection | DS-APP-001 | `applicationStore` | Separate presentation-safe fields from bootstrap/diagnostics fields | Prevent accidental internal metadata rendering | Card/shell components regain direct access to raw internal fields |
| Technical-details affordance | DS-APP-001 | `ApplicationShell` | Makes internal metadata available only when explicitly requested | Keeps support/debug visibility without polluting default UX | Default application route becomes technical again |
| Friendly resource-name resolution | DS-APP-002 | `ApplicationResourceConfigurationService` / selectors | Resolve bundled resource names from actual agent/team definitions when available | Make selector summaries understandable | Users see `localId` strings instead of real names |
| Team definition lookup | DS-APP-002, DS-APP-005 | `ApplicationTeamLaunchProfileEditor` | Resolve leaf members for the selected bundled/shared team | Required to render member override UI | Setup panel starts owning team traversal or backend gains UI-only responsibilities |
| Runtime/model catalog loading | DS-APP-002, DS-APP-005 | application editors | Populate runtime/model choices and readiness checks | Reuse existing runtime-scoped model capabilities | Slot shell becomes bloated with model-loading logic |
| Workspace path selection UX | DS-APP-002 | application editors | Existing/new/browse/manual-path selection for `workspaceRootPath` | App config stores a path, not a workspace ID | Wrong workspace-id semantics leak into app setup |
| Launch-profile migration | DS-APP-002 | `ApplicationResourceConfigurationService` | Rewrite old flat saved config into new launch-profile shape once | Preserve existing saved behavior without keeping dual-path runtime logic | Permanent compatibility code stays embedded in normal read/write flow |
| Application-backend launch-profile mapping | DS-APP-003 | app backend launch services | Map saved launch profile to start-run launch input | Keep app runtime orchestration app-owned | Host persistence owner starts deciding business launch timing |
| Localization cleanup | DS-APP-001, DS-APP-002 | touched UI components | Delete stale keys and keep text aligned with current owners | Reduce refactor drift | Dead keys continue obscuring live owners |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Shared runtime/model/model-config selector | `RuntimeModelConfigFields.vue` | `Reuse` | Already owns stable runtime/model/config interaction and labels via props | N/A |
| Team launch readiness logic | `teamRunLaunchReadiness.ts` | `Extend` | Existing logic already owns runtime/model/member unresolved checks; extract pure shared core for application team draft wrapper | Existing function assumes `workspaceId` and standalone team-run config shape |
| Team member runtime/model override logic | `teamRunConfigUtils.ts`, `useRuntimeScopedModelSelection`, `ModelConfigSection.vue`, `SearchableGroupedSelect.vue` | `Reuse` / `Extend` | Shared pure logic is already correct and low-risk | Full `MemberOverrideItem.vue` is not right because it exposes auto-execute controls that application flow intentionally locks on |
| Standalone agent/team forms | `AgentRunConfigForm.vue`, `TeamRunConfigForm.vue` | `Create New` (application-specific wrappers) | User explicitly warned against reusing these wrappers; they own standalone run-form semantics and past sharing caused regressions | Reusing them would require app-specific flags/attributes and risks breaking normal run forms |
| Workspace selection | `WorkspaceSelector.vue` | `Create New` (application path selector) | Applications persist `workspaceRootPath`, not `workspaceId`; temp-workspace auto-selection is wrong here | Existing component bakes in workspace-id semantics and temp-workspace defaults |
| Team member compile logic | `buildTeamRunMemberConfigRecords` + team utils | `Extend` | Existing builder shape is close, but application launch profile needs path-based, app-setup-specific member profile output | Existing builder injects standalone-run fields such as `workspaceId` and assumes `TeamRunConfig` |
| Application setup panel shell | `ApplicationLaunchSetupPanel.vue` | `Extend` | Good current single-owner shell should remain | N/A |
| Application details/presentation shell | `ApplicationShell.vue` | `Extend` | Route-phase owner already correct | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend application presentation | catalog card, shell presentation, diagnostics affordance, application store projection | DS-APP-001 | `applicationStore`, `ApplicationShell` | `Extend` | Keeps internal metadata away from default surfaces |
| Frontend application setup orchestration | setup panel lifecycle, slot drafts, gate aggregation, save/reset flow | DS-APP-002, DS-APP-004 | `ApplicationLaunchSetupPanel` | `Extend` | Existing good owner |
| Frontend application slot editors | resource-kind switch, agent editor, team editor, workspace path selector | DS-APP-002, DS-APP-005 | `ApplicationResourceSlotEditor`, `ApplicationAgentLaunchProfileEditor`, `ApplicationTeamLaunchProfileEditor` | `Create New` | App-specific because standalone forms are unsafe reuse targets |
| Shared frontend launch-config primitives | runtime/model selector, model-config section, runtime-scoped model loading, pure team readiness helpers | DS-APP-002, DS-APP-005 | application slot editors + existing standalone forms | `Reuse` / `Extend` | Reuse pure low-level capabilities, not full standalone wrappers |
| Backend application configuration contract/persistence | launch-profile validation, migration, persisted JSON | DS-APP-002, DS-APP-004 | `ApplicationResourceConfigurationService`, `ApplicationResourceConfigurationStore` | `Extend` | Replace flat `launchDefaults` |
| Backend resource summary resolution | friendly bundled/shared resource summaries | DS-APP-002 | `ApplicationRuntimeResourceResolver` | `Extend` | Resolve display names instead of `localId` |
| App-backend launch-profile consumption | map saved launch profile to run-launch input in app-owned launch services | DS-APP-003 | app backend launch services | `Extend` | Preserves app-owned orchestration |
| Localization cleanup | remove stale application keys | DS-APP-001, DS-APP-002 | touched app UI owners | `Extend` | Removal-only concern |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/applicationStore.ts` | Frontend application presentation | data fetch/projection owner | split list vs detail fetch projection and nest bootstrap metadata away from presentation fields | one store already owns application data lifecycle | Yes |
| `autobyteus-web/graphql/queries/applicationQueries.ts` | Frontend application presentation | query boundary | separate catalog fragment from detail/bootstrap fragment | one file already owns these queries | No |
| `autobyteus-web/components/applications/ApplicationCard.vue` | Frontend application presentation | catalog card owner | render name/description/setup summary only | one visual card boundary | Yes |
| `autobyteus-web/components/applications/ApplicationShell.vue` | Frontend application presentation | route-phase owner | setup vs immersive UX, user-facing overview, diagnostics affordance | already the route owner | Yes |
| `autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue` | Frontend application setup orchestration | setup shell owner | slot load/save/reset orchestration and gate aggregation | already authoritative across route phases | Yes |
| `autobyteus-web/components/applications/setup/ApplicationResourceSlotEditor.vue` | Frontend application slot editors | slot-kind switch boundary | choose agent vs team editor based on selected resource kind | keeps per-kind branching out of setup shell | Yes |
| `autobyteus-web/components/applications/setup/ApplicationAgentLaunchProfileEditor.vue` | Frontend application slot editors | agent slot editor owner | runtime/model/workspace path draft editing for agent-backed slots | app-specific editor semantics | Yes |
| `autobyteus-web/components/applications/setup/ApplicationTeamLaunchProfileEditor.vue` | Frontend application slot editors | team slot editor owner | reconstruct/edit/validate/compile team-backed slot draft | bounded local team complexity needs one owner | Yes |
| `autobyteus-web/components/applications/setup/ApplicationTeamMemberOverrideItem.vue` | Frontend application slot editors | app-specific member-row owner | per-member runtime/model override UI with app-locked tool semantics | avoids mutating `MemberOverrideItem.vue` semantics | Yes |
| `autobyteus-web/components/applications/setup/ApplicationWorkspaceRootSelector.vue` | Frontend application slot editors | workspace-path selector owner | existing/new/browse/manual-path UX for root paths | path semantics differ from workspace-id selector | Yes |
| `autobyteus-web/utils/application/applicationLaunchProfile.ts` | Frontend application setup orchestration | shared application setup utility owner | launch-profile draft shapes, normalize/build helpers, summary helpers | application setup needs one owned utility boundary | Yes |
| `autobyteus-web/utils/application/applicationSetupGate.ts` | Frontend application setup orchestration | gate evaluator | aggregate slot-level readiness into shell gate state | separate owner from draft/build helpers | Yes |
| `autobyteus-web/utils/teamLaunchReadinessCore.ts` (name illustrative) | Shared frontend launch-config primitives | pure readiness core | shared runtime/model/member unresolved logic for team drafts | prevents duplicate readiness logic across standalone/app flows | Yes |
| `autobyteus-application-sdk-contracts/src/manifests.ts` | Backend application configuration contract/persistence | shared contract owner | rename `supportedLaunchDefaults` to `supportedLaunchConfig` | manifest field owner | No |
| `autobyteus-application-sdk-contracts/src/runtime-resources.ts` | Backend application configuration contract/persistence | shared contract owner | replace `launchDefaults` type with resource-kind-aware `launchProfile` types | canonical persisted-config contract file | No |
| `autobyteus-server-ts/src/application-orchestration/services/application-resource-configuration-service.ts` | Backend application configuration contract/persistence | semantic config owner | launch-profile validation, migration, stale-profile rejection, view building | correct semantic owner already exists | Yes |
| `autobyteus-server-ts/src/application-orchestration/stores/application-resource-configuration-store.ts` | Backend application configuration contract/persistence | persistence boundary | persist new launch-profile JSON schema | one store already owns app slot config rows | No |
| `autobyteus-server-ts/src/application-orchestration/services/application-runtime-resource-resolver.ts` | Backend resource summary resolution | summary owner | resolve friendly names for bundled resources | exact current owner | Yes |
| `autobyteus-application-backend-sdk/src/launch-profile.ts` (name illustrative) | App-backend launch-profile consumption | helper boundary | convert saved agent/team launch profiles into launch inputs for `startRun` | shared helper for in-repo app backends | No |
| `applications/brief-studio/backend-src/services/brief-run-launch-service.ts` | App-backend launch-profile consumption | app launch owner | consume `launchProfile` instead of flat defaults | real app owner | Yes |
| `applications/socratic-math-teacher/backend-src/services/lesson-runtime-service.ts` | App-backend launch-profile consumption | app launch owner | consume `launchProfile` instead of flat defaults | real app owner | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| application slot launch-profile draft/build helpers | `autobyteus-web/utils/application/applicationLaunchProfile.ts` | Frontend application setup orchestration | multiple setup components need one application-specific launch-profile owner | `Yes` | `Yes` | a generic dumping-ground for every app UI helper |
| team runtime/model readiness core | `autobyteus-web/utils/teamLaunchReadinessCore.ts` | Shared frontend launch-config primitives | standalone team flow and application team flow both need the same runtime/model/member unresolved logic | `Yes` | `Yes` | a UI-specific helper tied to one form component |
| application team member profile compilation | `autobyteus-web/utils/application/applicationLaunchProfile.ts` or `.../applicationTeamLaunchProfile.ts` | Frontend application setup orchestration | team editor needs one compiler from editable draft to saved member-profile list | `Yes` | `Yes` | a second standalone team-run builder |
| backend launch-profile mapping helpers | `autobyteus-application-backend-sdk/src/launch-profile.ts` | App-backend launch-profile consumption | multiple in-repo apps currently follow the same configured-resource -> startRun pattern | `Yes` | `Yes` | a business-logic owner that decides when apps should launch |
| application technical detail projection | `autobyteus-web/utils/application/applicationPresentation.ts` (optional) | Frontend application presentation | shell/control panel should render the same explicit diagnostics block when opened | `Yes` | `Yes` | a mixed bootstrap + display + setup helper file |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ApplicationConfiguredLaunchProfile` | `Yes` | `Yes` | `Low` | Make it the only persisted launch-config representation; remove `launchDefaults` entirely |
| `ApplicationConfiguredTeamMemberProfile` | `Yes` | `Yes` | `Low` | Keep workspace path at team-profile level so it is not duplicated per member |
| frontend application team editable draft | `Yes` | `N/A` (local draft) | `Medium` | Keep it local to `ApplicationTeamLaunchProfileEditor`; do not reuse it as persisted/shared contract |
| nested application bootstrap metadata in `applicationStore` | `Yes` | `Yes` | `Low` | Keep bootstrap-only fields under an explicit nested object so presentation code does not casually consume them |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/applicationStore.ts` | Frontend application presentation | application data projection owner | maintain two projections: presentation-safe fields and bootstrap/diagnostics-only metadata | keeps application data ownership centralized | Yes |
| `autobyteus-web/components/applications/ApplicationCard.vue` | Frontend application presentation | catalog card boundary | render user-facing card content only | visual owner should stay tiny | Yes |
| `autobyteus-web/components/applications/ApplicationShell.vue` | Frontend application presentation | route-phase owner | user-facing overview, technical-details affordance, setup/immersive composition | correct existing owner | Yes |
| `autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue` | Frontend application setup orchestration | setup lifecycle owner | load/save/reset/gate orchestration and event emission | preserves single setup owner across route phases | Yes |
| `autobyteus-web/components/applications/setup/ApplicationResourceSlotEditor.vue` | Frontend application slot editors | slot editor boundary | mediate selected-resource kind and delegate to correct launch-profile editor | keeps per-kind branching out of the panel shell | Yes |
| `autobyteus-web/components/applications/setup/ApplicationAgentLaunchProfileEditor.vue` | Frontend application slot editors | agent slot editor | agent runtime/model/path editing | one subject = one file | Yes |
| `autobyteus-web/components/applications/setup/ApplicationTeamLaunchProfileEditor.vue` | Frontend application slot editors | team slot editor | team draft reconstruct/edit/validate/compile flow | bounded local spine deserves one file owner | Yes |
| `autobyteus-web/components/applications/setup/ApplicationTeamMemberOverrideItem.vue` | Frontend application slot editors | member override row | app-specific member row without standalone auto-execute semantics | avoids touching standalone member-row component | Yes |
| `autobyteus-web/components/applications/setup/ApplicationWorkspaceRootSelector.vue` | Frontend application slot editors | workspace path selector | app-specific path selection UX | distinct semantics from workspace-id selector | Yes |
| `autobyteus-web/utils/application/applicationLaunchProfile.ts` | Frontend application setup orchestration | application launch-profile utility boundary | local draft shapes, persisted profile builders, summaries, compile helpers | application-specific setup logic belongs together | Yes |
| `autobyteus-web/utils/application/applicationSetupGate.ts` | Frontend application setup orchestration | gate evaluator | panel-wide readiness aggregation | gate logic is a separate concern from profile building | Yes |
| `autobyteus-web/utils/teamLaunchReadinessCore.ts` | Shared frontend launch-config primitives | pure shared helper | runtime/model/member unresolved readiness core | share safely at pure-function level | Yes |
| `autobyteus-application-sdk-contracts/src/manifests.ts` | Backend contract | manifest declaration owner | launch-config capability declaration naming | one manifest owner file | No |
| `autobyteus-application-sdk-contracts/src/runtime-resources.ts` | Backend contract | saved app-config type owner | `launchProfile` union and team member profile shapes | single canonical contract owner | No |
| `autobyteus-server-ts/src/application-orchestration/services/application-resource-configuration-service.ts` | Backend application config | validation/migration owner | normalize/validate/migrate build view from `launchProfile` | already correct semantic owner | Yes |
| `autobyteus-server-ts/src/application-orchestration/stores/application-resource-configuration-store.ts` | Backend application config | persistence boundary | persisted row schema and storage | one file already owns SQLite record I/O | No |
| `autobyteus-server-ts/src/application-orchestration/services/application-runtime-resource-resolver.ts` | Backend resource summary resolution | resource-summary owner | return friendly names for bundle/shared resources | exact current summary owner | Yes |
| `autobyteus-application-backend-sdk/src/launch-profile.ts` | App-backend launch-profile consumption | mapping helper | convert saved launch profile into launch input payload shapes used by app backends | shared helper across multiple app backends | No |
| `applications/brief-studio/backend-src/services/brief-run-launch-service.ts` | App-backend launch-profile consumption | app business launch owner | app-specific launch timing and any app-specific override precedence | business owner remains app-local | Yes |
| `applications/socratic-math-teacher/backend-src/services/lesson-runtime-service.ts` | App-backend launch-profile consumption | app business launch owner | same as above for lesson workflow | business owner remains app-local | Yes |

## Ownership Boundaries

Authority changes hands at these boundaries:

1. **application data fetch boundary**
   - `applicationStore` is the authoritative owner of fetched application records.
   - Presentation components must consume presentation-safe fields from the store instead of reading raw internal metadata directly.

2. **application setup shell boundary**
   - `ApplicationLaunchSetupPanel` is the authoritative owner of slot drafts, save/reset state, and gate emission.
   - Route shell and immersive panel must not implement their own slot draft logic.

3. **slot-kind boundary**
   - `ApplicationResourceSlotEditor` is the authoritative switch that chooses the correct editor for the current effective resource kind.
   - The setup panel must not inline team-specific or agent-specific logic itself.

4. **backend application config boundary**
   - `ApplicationResourceConfigurationService` is the semantic owner of saved application launch profiles.
   - REST routes and SQLite store must stay thin around it.

5. **application runtime launch boundary**
   - app backend launch services remain the owners of business timing and launch intent.
   - Host config services must not decide when an app starts a run.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `applicationStore` | list/detail query selection, bootstrap metadata nesting, stale-response protection | `ApplicationCard`, `ApplicationShell`, `ApplicationSurface` | components querying raw GraphQL and deciding presentation directly | extend store projection, not individual components |
| `ApplicationLaunchSetupPanel` | slot drafts, save/reset messages, gate aggregation | `ApplicationShell`, immersive configure slot | shell owning its own parallel drafts or calling REST directly | add explicit emitted state/summary from panel |
| `ApplicationResourceSlotEditor` | resource-kind editor branching | `ApplicationLaunchSetupPanel` | panel-level `if resourceKind === ...` trees across multiple child concerns | move more per-kind logic into the slot editor |
| `ApplicationResourceConfigurationService` | profile normalization, migration, validation, configuration-view building | REST routes, runtime-control config reads | routes/store validating JSON directly | widen service methods, not route/store logic |
| application backend launch service | app-specific override precedence and launch timing | app commands/queries/workflows | generic host code deciding app launch timing | add a helper, not a host-side business orchestrator |

## Dependency Rules

- `ApplicationCard.vue`, `ApplicationShell.vue`, and other presentation components may depend on `applicationStore`, but must not render raw internal metadata unless the explicit diagnostics affordance is active.
- `ApplicationLaunchSetupPanel.vue` may depend on `ApplicationResourceSlotEditor.vue` and application setup utility files, but must not import standalone run-form wrappers.
- `ApplicationResourceSlotEditor.vue` may render `ApplicationAgentLaunchProfileEditor.vue` and `ApplicationTeamLaunchProfileEditor.vue`, but must not own persistence or shell phase behavior.
- `ApplicationAgentLaunchProfileEditor.vue` may reuse `RuntimeModelConfigFields.vue` as-is.
- `ApplicationTeamLaunchProfileEditor.vue` may reuse pure runtime/model/team utilities and definition stores, but must not import `TeamRunConfigForm.vue` or add app-specific props to it.
- `ApplicationWorkspaceRootSelector.vue` must not import or wrap `WorkspaceSelector.vue`; it may reuse lower-level generic controls (`SearchableSelect`, `pickFolderPath`, workspace store lookups) only.
- `MemberOverrideItem.vue`, `AgentRunConfigForm.vue`, `TeamRunConfigForm.vue`, and `WorkspaceSelector.vue` must not gain app-specific conditionals that can affect standalone run UX.
- `ApplicationResourceConfigurationStore` must not perform semantic launch-profile validation.
- `ApplicationRuntimeResourceResolver` may resolve display names, but it must not become a UI editor or launch-profile owner.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `ListApplications` query fragment set | application catalog presentation | fetch list-safe application fields | `applicationId` implicit in list rows | omit internal metadata from list fetch |
| `GetApplicationById` query fragment set | application shell/bootstrap record | fetch route/detail/bootstrap metadata | `applicationId` | may still fetch internal metadata needed for bootstrap/diagnostics |
| `GET /applications/:applicationId/resource-configurations` | saved application slot config | return current `ApplicationResourceConfigurationView[]` including slot-local invalid-state issues | `applicationId` | never uses panel-fatal errors for one-slot stale profile cases |
| `PUT /applications/:applicationId/resource-configurations/:slotKey` | saved application slot config | persist one slot selection + launch profile for the effective resource kind | `applicationId + slotKey` | request body uses `launchProfile`; service rejects kind mismatch, unsupported fields, duplicate member identities, and unresolved effective member runtime/model state |
| `runtimeControl.getConfiguredResource(slotKey)` | saved application slot config | return only a strict-valid configured resource for app backends | `slotKey` within current application context | returns `null` for `NOT_CONFIGURED` and `INVALID_SAVED_CONFIGURATION`; app backends never receive stale profile snapshots |
| `buildAgentRunLaunchFromProfile(...)` (illustrative helper) | app-backend launch mapping | map saved agent profile to `ApplicationAgentRunLaunch` | agent launch profile + fallback workspace root | helper only, not a business orchestrator |
| `buildTeamRunLaunchFromProfile(...)` (illustrative helper) | app-backend launch mapping | map saved team profile to `ApplicationTeamRunLaunch` member configs | team launch profile + optional fallback workspace root | expands team defaults over each persisted member profile and copies canonical `memberName` / `memberRouteKey` / `agentDefinitionId` into the launch payload |
| `ApplicationLaunchSetupPanel` `setup-state-change` emit | setup gate state | notify shell whether entry/reload is allowed | panel-local gate state | one authoritative emitted gate state |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- Split boundaries by subject or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `runtimeControl.getConfiguredResource(slotKey)` | `Yes` | `Yes` | `Low` | keep it config-only |
| `PUT /resource-configurations/:slotKey` | `Yes` | `Yes` | `Low` | rename payload field to `launchProfile` cleanly |
| standalone run-form wrappers | `No` for application setup | `N/A` | `High` | do not reuse them as app boundaries |
| app-backend launch-profile helper | `Yes` | `Yes` | `Low` | keep it a pure mapper, not a lifecycle owner |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| saved application launch settings | `launchDefaults` -> `launchProfile` | `Yes` | `High` if unchanged | rename cleanly |
| manifest host-config declaration | `supportedLaunchDefaults` -> `supportedLaunchConfig` | `Yes` | `Medium` | rename with contract change |
| app-specific slot editor shell | `ApplicationResourceSlotEditor` | `Yes` | `Low` | keep |
| team-backed app editor | `ApplicationTeamLaunchProfileEditor` | `Yes` | `Low` | keep |
| diagnostics surface | `Technical details` / `ApplicationTechnicalDetails...` | `Yes` | `Low` | use explicit debug naming instead of reusing generic “details” labels |

## Applied Patterns (If Any)

- **Single reusable setup owner**
  - Lives in `ApplicationLaunchSetupPanel.vue`
  - Solves pre-entry vs in-app configure divergence
  - Belongs to application setup orchestration
- **Resource-kind editor boundary**
  - Lives in `ApplicationResourceSlotEditor.vue`
  - Solves agent-vs-team branching without polluting the setup shell
  - Belongs to application slot editors
- **Local explicit-member-profile reconstruction loop**
  - Lives in `ApplicationTeamLaunchProfileEditor.vue`
  - Solves “edit as global + overrides, persist as explicit member profiles” without making the persisted contract ambiguous
  - Belongs to a bounded local spine, not a cross-app service
- **Safe low-level reuse, unsafe wrapper non-reuse**
  - Reuse pure utilities and low-level field primitives only
  - Avoid reusing standalone run-form wrappers or adding app-only flags to them
  - This pattern exists specifically to prevent the regression the user called out

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/applications/` | `Folder` | application route/presentation owners | application route-level UI, immersive shell, setup shell | already feature-oriented and readable | generic shared run-form utilities |
| `autobyteus-web/components/applications/setup/` | `Folder` | application slot editor owners | app-specific setup editors and path selector | meaningful structural depth now exists under setup | standalone agent/team run forms |
| `autobyteus-web/components/applications/setup/ApplicationResourceSlotEditor.vue` | `File` | slot-kind boundary | choose correct per-kind editor | belongs with other app setup editors | REST/persistence logic |
| `autobyteus-web/components/applications/setup/ApplicationAgentLaunchProfileEditor.vue` | `File` | agent slot editor | agent-backed slot editing | app-specific editor concern | team-specific member logic |
| `autobyteus-web/components/applications/setup/ApplicationTeamLaunchProfileEditor.vue` | `File` | team slot editor | reconstruct/edit/validate/compile team-backed slot draft | bounded local spine owner | route-phase logic |
| `autobyteus-web/components/applications/setup/ApplicationTeamMemberOverrideItem.vue` | `File` | app-specific member row | member override controls with app-locked tool semantics | distinct from standalone member row | standalone auto-execute tri-state behavior |
| `autobyteus-web/components/applications/setup/ApplicationWorkspaceRootSelector.vue` | `File` | workspace path selector | path-based existing/new/browse/manual UX | app setup needs path semantics | workspace-id auto-selection logic |
| `autobyteus-web/utils/application/` | `Folder` | application setup/presentation utility owners | application-specific setup/profile/gate/presentation helpers | existing feature utility home | unrelated team-run store logic |
| `autobyteus-web/utils/application/applicationLaunchProfile.ts` | `File` | app launch-profile helper owner | local draft types, profile builders, profile summaries | central app setup helper file | shell presentation logic |
| `autobyteus-web/utils/application/applicationSetupGate.ts` | `File` | app gate evaluator | gate aggregation across slots | separate concern from profile conversion | resource summary/name formatting |
| `autobyteus-web/utils/teamLaunchReadinessCore.ts` | `File` | pure shared readiness core | extracted runtime/model/member readiness core | shared low-level logic for app + standalone flows | any component rendering logic |
| `autobyteus-web/stores/applicationStore.ts` | `File` | application data store | presentation/bootstrap metadata split | correct fetch owner | UI-specific labels/copy |
| `autobyteus-application-sdk-contracts/src/manifests.ts` | `File` | contract owner | host-managed launch-config capability declaration | manifest contract owner | runtime launch helper code |
| `autobyteus-application-sdk-contracts/src/runtime-resources.ts` | `File` | contract owner | saved application `launchProfile` types | canonical shared type location | frontend-only draft types |
| `autobyteus-server-ts/src/application-orchestration/services/application-resource-configuration-service.ts` | `File` | semantic config owner | validate/migrate/build configuration view for launch profiles | right backend semantic owner | raw SQL concerns |
| `autobyteus-server-ts/src/application-orchestration/stores/application-resource-configuration-store.ts` | `File` | persistence boundary | SQLite row persistence and schema migration | right storage owner | app/business validation |
| `autobyteus-server-ts/src/application-orchestration/services/application-runtime-resource-resolver.ts` | `File` | resource summary owner | friendly bundled/shared resource summaries | exact summary owner | slot config persistence |
| `autobyteus-application-backend-sdk/src/launch-profile.ts` | `File` | backend helper boundary | helper conversion from saved launch profile to runtime launch payloads | reusable across multiple app backends | app-specific business timing |
| `applications/brief-studio/backend-src/services/brief-run-launch-service.ts` | `File` | app launch owner | Brief Studio runtime launch behavior | app business owner | generic host config validation |
| `applications/socratic-math-teacher/backend-src/services/lesson-runtime-service.ts` | `File` | app launch owner | Socratic runtime launch behavior | app business owner | generic host config validation |
| `autobyteus-web/localization/messages/en/applications.ts` and `zh-CN/applications.ts` | `File` | live application copy owner | current application UX strings only | existing localization owner | stale removed-flow keys |

Rules:
- If the design has meaningful structural depth, usually reflect it in folders rather than flattening everything into one mixed directory.
- Do not place transport entrypoints, main-line domain/control nodes, persistence, adapters, and unrelated off-spine concerns in one flat folder when that hides ownership or structural depth.
- A compact layout is acceptable when it remains easy to read for the scope. If you keep it flatter, state why that is the clearer tradeoff.
- Folder boundaries should make ownership and structural depth easier to read, not hide them.
- Shared-layer, feature-oriented, runtime-oriented, and hybrid projections can all be valid when they make the intended ownership and flow easier to understand.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/applications/` | `Mixed Justified` | `Yes` | `Low` | feature folder already exists; subfolder under `setup/` adds the needed depth |
| `autobyteus-web/components/applications/setup/` | `Main-Line Domain-Control` | `Yes` | `Low` | all files serve one setup editing concern |
| `autobyteus-web/utils/application/` | `Off-Spine Concern` | `Yes` | `Medium` | keep only application-specific utility owners; do not dump generic shared team logic here |
| `autobyteus-server-ts/src/application-orchestration/services/` | `Main-Line Domain-Control` | `Yes` | `Low` | existing application-orchestration owners already live here |
| `autobyteus-server-ts/src/application-orchestration/stores/` | `Persistence-Provider` | `Yes` | `Low` | storage stays separated from semantic validation |
| `autobyteus-application-backend-sdk/src/` | `Off-Spine Concern` | `Yes` | `Low` | helper code belongs in backend SDK, not in app-specific bundles |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Safe reuse boundary | `ApplicationTeamLaunchProfileEditor -> RuntimeModelConfigFields + pure team utilities + ApplicationWorkspaceRootSelector` | `ApplicationTeamLaunchProfileEditor -> TeamRunConfigForm(appMode=true, hideStandaloneFields=true)` | The good shape reuses stable low-level logic without mutating standalone form semantics; the bad shape is exactly the regression-prone sharing pattern the user warned about |
| Persisted config shape | `configuration.launchProfile = { kind: "AGENT_TEAM", defaults: { runtimeKind, llmModelIdentifier, workspaceRootPath }, memberProfiles: [{ memberRouteKey, memberName, agentDefinitionId, ...overrideFields }] }` | `configuration.launchDefaults = { runtimeKind, llmModelIdentifier, workspaceRootPath }` | The good shape preserves mixed team state, canonical member identity, and repairable topology drift; the bad shape flattens it away |
| Diagnostics access | `ApplicationShell default overview + explicit Technical details disclosure` | `ApplicationShell default right column = packageId/localAppId/bundle ids` | The good shape keeps support info reachable but not scary; the bad shape makes the whole app route look internal |

Use this section when the design would otherwise remain too abstract.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep both `launchDefaults` and `launchProfile` in REST/SDK contracts | Might reduce migration churn | `Rejected` | Replace `launchDefaults` completely with `launchProfile`; migrate old saved rows once |
| Keep `supportedLaunchDefaults` alongside new manifest field | Might reduce manifest update churn | `Rejected` | Rename to `supportedLaunchConfig` in all in-repo manifests and contract owners |
| Add app-specific props/attributes to `AgentRunConfigForm.vue`, `TeamRunConfigForm.vue`, or `WorkspaceSelector.vue` | Seems like the fastest reuse path | `Rejected` | Build application-specific editors/path selector around safe low-level primitives |
| Keep `ApplicationLaunchDefaultsFields.vue` and bolt on more conditionals | Might appear incremental | `Rejected` | Remove it and replace with resource-kind-aware editors |
| Permanent read-time fallback that interprets both old flat rows and new launch profiles | Might smooth long-tail stored data | `Rejected` | Use a one-time migration that rewrites old rows, then continue with the new shape only |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

This design has four practical layers:

1. **Presentation layer**
   - `ApplicationCard.vue`, `ApplicationShell.vue`, `applicationStore`
2. **Application setup control layer**
   - `ApplicationLaunchSetupPanel.vue`, `ApplicationResourceSlotEditor.vue`, per-kind editors
3. **Shared low-level launch-config primitives**
   - `RuntimeModelConfigFields.vue`, runtime/model loading composables, pure team readiness helpers
4. **Persistence/contract layer**
   - `ApplicationResourceConfigurationService`, `ApplicationResourceConfigurationStore`, shared SDK contract files

The key rule is that application-specific setup control sits above shared low-level primitives and below route presentation, without hijacking standalone run-form wrappers.

## Migration / Refactor Sequence

1. **Contract cleanup**
   - Replace `supportedLaunchDefaults` with `supportedLaunchConfig` in `autobyteus-application-sdk-contracts/src/manifests.ts` and in-repo application manifests.
   - Replace saved `launchDefaults` contract types with the exact resource-kind-aware `launchProfile` union in `runtime-resources.ts`.
   - For mixed-kind slots, define migration/readback behavior against the effective `resourceRef.kind`, not against slot-level `allowedResourceKinds` alone.

2. **Backend persistence + migration**
   - Update `ApplicationResourceConfigurationStore` to persist the new launch-profile payload shape.
   - Add one-time migration support that rewrites old flat saved config into the new shape.
     - old agent-backed row -> agent launch profile
     - old team-backed row -> team launch profile with `defaults` from the old flat preset plus one generated member profile per current leaf member, preserving old behavior exactly
     - old mixed-kind slot row -> choose the new profile kind from the effective selected/default `resourceRef.kind`
   - Store migration rewrites old rows once; post-migration reads operate on the new shape only.

3. **Backend validation + recoverable readback + resource summaries**
   - Update `ApplicationResourceConfigurationService` to validate `launchProfile`, reject unresolved save attempts, and return `ApplicationResourceConfigurationView.status` / `issue` instead of throwing for slot-local stale-profile cases.
   - Keep whole-request throws only for application-level failures.
   - Update `runtimeControl.getConfiguredResource(...)` so it returns only strict-valid ready config and never returns stale profile snapshots to app backends.
   - Update `ApplicationRuntimeResourceResolver` so bundled resources report friendly names.

4. **Frontend setup-editor replacement**
   - Introduce `setup/` editor files and replace `ApplicationLaunchDefaultsFields.vue` usage in `ApplicationLaunchSetupPanel.vue`.
   - Add app-specific workspace-root selector.
   - Add app-specific team editor with bounded local reconstruct/edit/compile loop plus stale-profile repair behavior.
   - Update gate aggregation so slot-local invalid saved configuration blocks entry/reload with a user-readable reason instead of escalating to panel load failure.

5. **Frontend presentation cleanup**
   - Split list/detail query fragments and update `applicationStore` projection.
   - Remove package/internal metadata from catalog and default setup/immersive details.
   - Add explicit technical-details affordance if debug data is retained.

6. **App-backend adoption**
   - Update `brief-studio` and `socratic-math-teacher` launch services to consume `launchProfile`.
   - Add helper(s) in backend SDK only if they materially reduce duplication without taking over app business timing.
   - Expand team defaults over saved member profiles when building `ApplicationTeamRunLaunch.memberConfigs`.

7. **Dead code and tests**
   - Remove `ApplicationLaunchDefaultsFields.vue`.
   - Remove stale application launch/session localization keys and regenerate/align localization outputs.
   - Update unit/component/integration tests to the new contract, slot-local invalid-state readback, and UI hierarchy.

## Key Tradeoffs

- **Chosen tradeoff: app-specific editors over standalone wrapper reuse**
  - Costs a few new components.
  - Avoids the exact regression class the user warned about.
  - Keeps standalone run forms stable.

- **Chosen tradeoff: persisted team profile stores explicit member state**
  - Costs a reconstruct/edit/compile loop in one local editor owner.
  - Makes saved config rich enough for mixed-team launches and app-backend consumption.

- **Chosen tradeoff: nested bootstrap metadata instead of removing internal identifiers from the system**
  - Keeps iframe bootstrap intact.
  - Makes accidental default rendering much harder.

- **Chosen tradeoff: one-time migration instead of permanent compatibility fallback**
  - Costs migration code now.
  - Avoids long-lived dual-path complexity.

## Risks

- The team-profile reconstruct/edit/compile loop is the trickiest local behavior; if not kept local, setup-shell code will become bloated.
- If contract migration is incomplete, old saved application setups may be lost or misread.
- If shared pure team readiness helpers are extracted poorly, standalone team readiness could regress; extraction must be covered with existing standalone tests plus new application tests.
- If app-specific editors accidentally start depending on standalone-run stores or wrappers, the regression risk the user described returns.
- Friendly bundled resource names depend on definition lookup succeeding; fallback behavior must remain deterministic when names are missing.

## Guidance For Implementation

- Treat `ApplicationLaunchSetupPanel.vue` as the shell to preserve, not the thing to replace.
- Do **not** add application flags to `AgentRunConfigForm.vue`, `TeamRunConfigForm.vue`, `WorkspaceSelector.vue`, or other standalone run-form owners.
- Prefer pure shared utilities/composables over shared wrappers when reuse risk exists.
- Make `launchProfile` a clean-cut rename and replacement; update contracts, REST handlers, frontend draft helpers, and in-repo apps together.
- Add tests that specifically guard the user-reported regression class: after this change, standalone agent/team run forms must still show their runtime fields normally.
- Add tests for application team mixed-runtime round-trip: save profile -> reload setup -> gate state -> app-owned launch consumes explicit team member state.
