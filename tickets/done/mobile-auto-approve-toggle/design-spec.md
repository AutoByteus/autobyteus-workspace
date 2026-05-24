# Design Spec

## Current-State Read

Android is not the owner of the reported UI. `autobyteus-android` is a WebView shell that loads the server-served `/mobile` Nuxt application, so the user-visible Android run setup is governed by `autobyteus-web/components/mobile/MobileRunSetup.vue` and adjacent mobile web code.

The auto-approve gap is local to mobile presentation. Desktop `AgentRunConfigForm.vue` and `TeamRunConfigForm.vue` render `Auto approve tools` and update `config.autoExecuteTools`. The shared run config types, launch defaults, agent/team config stores, context stores, team member config builder, and backend launch stores already carry `autoExecuteTools`. New launch templates default it to `false` in `useDefinitionLaunchDefaults.ts`; mobile currently lacks a control to change that value before creating a run.

The workspace gap is not just another missing row. `MobileRunSetup.vue` currently derives setup workspace choices from `useMobileWorkCatalog().workspaceItems`, then stores `selectedWorkspaceId` locally and syncs it into `agentRunConfigStore` or `teamRunConfigStore`. `useMobileWorkCatalog` also owns Recent/Agents/Teams/Workspaces segments for the mobile context switcher/home catalog, so launch workspace selection is borrowing a context-switching catalog rather than using an owned launch-workspace boundary. It also has no setup-time path-loading flow.

Desktop run setup has a different, clearer workspace boundary: `WorkspaceSelector.vue` offers Existing/New modes, fetches workspaces through `workspaceStore.fetchAllWorkspaces()`, and lets users load a workspace path through `RunConfigPanel.vue -> workspaceStore.createWorkspace({ root_path }) -> agent/team config store setWorkspaceLoaded`. In non-Electron environments, desktop still exposes manual absolute path entry. Mobile has neither that path-load parity nor an owner for setup-time workspace loading.

`workspaceStore.fetchAllWorkspaces()` uses the GraphQL `workspaces` query. On the server, `WorkspaceResolver.workspaces()` returns `workspaceManager.getAllWorkspaces()`, which is the active in-memory workspace set plus temp workspace creation; persisted workspace id mappings are used for `getOrCreateWorkspace(workspaceId)`, but are not independently enumerated by this query. Therefore the mobile fix must not claim to solve every possible persisted-inactive workspace listing case by list alone. The in-scope parity is: fetch/display all workspaces currently available from the workspace subsystem and provide a mobile-safe absolute server-side path load for unlisted workspaces.

`MobileRunSetup.vue` is already carrying many duties: mode tabs, agent/team target choices, workspace selection, setup intent defaults, context defaults, config buffer synchronization, runtime/model card wiring, readiness messages, draft attachment display, create-run action, and error state. Adding auto-approval and path-based workspace loading directly into this component would worsen responsibility drift. The target shape should keep it as a shell and move launch setup state, workspace selection/loading, and launch options into owned pieces.

## Intended Change

Deliver mobile new-run setup parity as a small refactor plus feature addition:

1. Add an `Auto approve tools` switch in mobile new-run setup for both agent and team launches, bound to existing `autoExecuteTools` on the active launch config store.
2. Replace `MobileRunSetup.vue`'s setup workspace source with a mobile launch workspace owner that:
   - fetches choices through `workspaceStore.fetchAllWorkspaces()`;
   - lists all `workspaceStore.allWorkspaces` entries, including entries with no live/active run;
   - supports loading an unlisted workspace by absolute server-side path through `workspaceStore.createWorkspace({ root_path })`;
   - selects the returned workspace id into the active agent/team launch config.
3. Refactor `MobileRunSetup.vue` into a form shell that delegates launch setup state/config synchronization to a composable and visible sub-controls to mobile-owned components.
4. Keep `useMobileWorkCatalog` as the context switcher/home catalog. It may still provide agent/team definition item choices, but it must no longer be the authoritative launch workspace source.
5. Do not add native Android run setup code, backend approval semantics, GraphQL fields, mobile-only config aliases, or desktop behavior changes.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature parity + behavior parity + refactor.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`):
  - Auto-approve toggle: `Local Implementation Defect`; the correct state and launch boundaries already exist, but mobile presentation omits the control.
  - Workspace parity/refactor: `Boundary Or Ownership Issue` + `File Placement Or Responsibility Drift`; mobile setup depends on the context catalog for launch workspace choices and `MobileRunSetup.vue` would become a mixed setup/workspace-loading/options coordinator if extended directly.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence:
  - `MobileRunSetup.vue` imports `useMobileWorkCatalog` and destructures `workspaceItems` for setup workspace choices.
  - `MobileRunSetup.vue` locally owns setup defaults, invalid-selection clearing, store sync, readiness, and submit behavior.
  - Desktop setup has a dedicated `WorkspaceSelector.vue` + `RunConfigPanel.vue` path-loading boundary, while mobile has only a picker fed by the context catalog.
  - Architecture review round 1 failed the narrow design because user scope now includes further refactoring.
- Design response:
  - Add `useMobileRunSetupController.ts` for mobile launch setup state/config synchronization.
  - Add `useMobileLaunchWorkspaces.ts` for launch workspace fetch/list/path-load semantics.
  - Add `MobileLaunchWorkspacePicker.vue` for mobile workspace UI.
  - Add `MobileLaunchRunOptionsCard.vue` for `Auto approve tools` and future compact launch options.
  - Slim `MobileRunSetup.vue` to shell/layout/emits.
- Refactor rationale: These splits make launch workspace selection/load an owned mobile launch concern, keep the context catalog from becoming launch policy, and allow the auto-approval toggle to land without adding another responsibility to the existing mixed component.
- Intentional deferrals and residual risk, if any:
  - Defer backend enumeration of persisted-but-inactive workspace mappings unless implementation/validation proves the product requirement is specifically “list every persisted mapping after restart without path input.” The in-scope solution gives users a mobile path-load fallback and displays every workspace currently returned by the workspace subsystem.
  - Defer mobile team member-level override editing and mobile skill-access parity.

## Terminology

- `Mobile launch setup`: the mobile new-run form flow before a temporary agent/team context exists.
- `Launch config buffer`: `agentRunConfigStore.config` or `teamRunConfigStore.config` before context creation.
- `Launch workspace`: a workspace selected for a new run, identified by `workspaceId` after fetch or path load.
- `Context catalog`: `useMobileWorkCatalog` data for recent runs, definitions, teams, and workspaces used by mobile Home/Switch work surfaces.
- `Server-side path`: an absolute path on the paired AutoByteus node/backend host, not the Android phone filesystem.

## Design Reading Order

1. Follow the data-flow spines for auto-approve, existing workspace selection, path load, setup synchronization, and create-run.
2. Use the ownership map to distinguish the setup controller, launch workspace owner, config stores, and context catalog.
3. Read file responsibilities after the spines; files are derived from ownership.
4. Use migration/refactor sequence for implementation order.

## Legacy Removal Policy (Mandatory)

Policy: `No backward compatibility; remove legacy code paths.`

The in-scope legacy/obsolete behavior is the mobile setup path that treats `useMobileWorkCatalog.workspaceItems` as the launch workspace source. The replacement is a clean-cut launch workspace owner. Do not keep a fallback branch that says “if launch workspace list is empty, use context catalog workspaceItems.” That would preserve the boundary problem and keep two workspace choice sources authoritative.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-MAA-001 | Primary End-to-End | Mobile user toggles `Auto approve tools` | First backend run preparation receives config/member configs with `autoExecuteTools` | `useMobileRunSetupController` + existing config/context/run stores | Proves the UI control uses the existing approval field and propagates to launch. |
| DS-MWS-001 | Primary End-to-End | Mobile setup opens workspace selection | Active launch config contains a selected existing `workspaceId` | `useMobileLaunchWorkspaces` + `useMobileRunSetupController` | Proves mobile lists launch workspaces from workspace subsystem, not live-run contexts. |
| DS-MWS-002 | Primary End-to-End | Mobile user enters workspace path | Active launch config contains returned created/loaded `workspaceId` | `useMobileLaunchWorkspaces` + workspace store/backend | Proves mobile can use unlisted workspaces without an existing live run. |
| DS-MOB-001 | Primary End-to-End | Mobile user presses `Create run` | Temporary mobile work context is emitted and ready for Chat | `useMobileRunLaunchCoordinator` | Ensures refactor preserves existing create-run behavior. |
| DS-MRF-001 | Bounded Local | Context/setup-intent/mode/target/workspace changes | Correct active launch config store is synchronized, stale inactive config is cleared | `useMobileRunSetupController` | Prevents stale agent/team/workspace writes after extracting state from the component. |
| DS-MWS-ERR-001 | Return-Event | Workspace fetch/load succeeds or fails | Mobile workspace picker shows loaded selection or error | `useMobileLaunchWorkspaces` | Keeps async workspace loading feedback local to workspace owner/UI. |

## Primary Execution Spine(s)

- DS-MAA-001: `MobileLaunchRunOptionsCard switch -> useMobileRunSetupController active option setter -> agentRunConfigStore/teamRunConfigStore -> agentContextsStore/agentTeamContextsStore -> agentRunStore/agentTeamRunStore -> backend launch payload`
- DS-MWS-001: `MobileRunSetup open -> useMobileLaunchWorkspaces.refresh -> workspaceStore.fetchAllWorkspaces -> WorkspaceResolver.workspaces -> workspaceStore.allWorkspaces -> MobileLaunchWorkspacePicker selection -> useMobileRunSetupController -> active config store workspaceId`
- DS-MWS-002: `MobileLaunchWorkspacePicker path input -> useMobileRunSetupController.loadWorkspacePath -> useMobileLaunchWorkspaces.loadByPath -> workspaceStore.createWorkspace -> WorkspaceResolver.createWorkspace -> WorkspaceManager.createWorkspace -> returned workspaceId -> active config store setWorkspaceLoaded/update -> selectedWorkspaceId`
- DS-MOB-001: `Create run button -> useMobileRunSetupController.createRun -> useMobileRunLaunchCoordinator.createMobileRunFromConfig -> agent/team context store createRunFromTemplate -> emitted MobileWorkContext -> Chat`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-MAA-001 | The options card displays the active config's `autoExecuteTools` value. Toggling updates the active agent/team launch config store. Existing context creation copies the config, and existing run stores send the same field/member records on first backend preparation. | Mobile options card, setup controller, launch config buffer, context store, run store/backend | Setup controller for pre-run update; existing stores after context creation | Switch accessibility, default false, test ids |
| DS-MWS-001 | The launch workspace owner refreshes the workspace store and converts every returned workspace into picker choices. Selecting one updates `selectedWorkspaceId`, then the setup controller writes the workspace id into the active config store. | Launch workspace owner, workspace store, workspace picker, setup controller, config store | `useMobileLaunchWorkspaces` for choices; setup controller for active config sync | Choice grouping, temp workspace display, refresh loading state |
| DS-MWS-002 | When an intended workspace is absent, the picker emits a server-side path. The launch workspace owner calls the existing workspace creation/loading boundary, receives a workspace id, and the setup controller selects it into the active config. | Workspace picker, launch workspace owner, workspace store, GraphQL resolver, workspace manager, setup controller | `useMobileLaunchWorkspaces` and workspace store/backend | Path help copy, error display, duplicate root-path cleanup already in workspace store |
| DS-MOB-001 | Pressing create uses the synchronized active config and existing mobile coordinator. The coordinator validates selected target/workspace, creates the temporary context, transfers draft attachments, clears launch buffers, and returns a mobile work context. | Setup controller, mobile launch coordinator, context stores, mobile work store | `useMobileRunLaunchCoordinator` | Draft attachment transfer, team member focus |
| DS-MRF-001 | Context defaults, setup intents, mode switches, and target/workspace changes are managed by one controller instead of scattered component watchers. The controller clears stale inactive configs and only writes the active mode's store. | Setup controller, definition stores, config stores | `useMobileRunSetupController` | Team runtime catalog sync remains attached to active team config |
| DS-MWS-ERR-001 | Workspace fetch/load status and errors flow back to the workspace picker, not to the global context catalog. The setup form can still show submit errors separately. | Launch workspace owner, picker | `useMobileLaunchWorkspaces` | Loading spinner, validation, retry affordance |

## Spine Actors / Main-Line Nodes

- Mobile user
- `MobileRunSetup.vue` shell
- `MobileLaunchRunOptionsCard.vue`
- `MobileLaunchWorkspacePicker.vue`
- `useMobileRunSetupController`
- `useMobileLaunchWorkspaces`
- `workspaceStore`
- `agentRunConfigStore` / `teamRunConfigStore`
- `useMobileRunLaunchCoordinator`
- `agentContextsStore` / `agentTeamContextsStore`
- `agentRunStore` / `agentTeamRunStore`
- Workspace GraphQL resolver / `WorkspaceManager`
- Android WebView shell as a thin entry facade only

## Ownership Map

- `MobileRunSetup.vue`: owns layout, form submit binding, top-level emitted events (`cancel`, `launched`, `setupIntentConsumed`), and composition of mobile setup sub-controls. It must not own workspace loading policy or long setup synchronization logic.
- `useMobileRunSetupController`: owns mobile launch setup state, mode/target/workspace refs, context/setup-intent defaults, active config selection, active config updates, readiness, create-run call, and stale inactive config clearing.
- `MobileLaunchRunOptionsCard.vue`: owns presentation/accessibility for launch option controls. In this scope it exposes `Auto approve tools` only.
- `useMobileLaunchWorkspaces`: owns launch workspace refresh/list/path-load semantics for mobile setup. It is the only mobile setup owner that talks to `workspaceStore.fetchAllWorkspaces()` and `workspaceStore.createWorkspace()`.
- `MobileLaunchWorkspacePicker.vue`: owns mobile workspace selection UI and path-entry UI. It emits selection/load requests but does not update agent/team config stores directly.
- `useMobileWorkCatalog`: owns context switcher/home catalog segments. It is not the launch workspace owner.
- `agentRunConfigStore` / `teamRunConfigStore`: own authoritative pre-run config buffers, including `workspaceId`, `autoExecuteTools`, runtime/model, and workspace loading state setters.
- `useMobileRunLaunchCoordinator`: owns mobile create-run orchestration after launch config is synchronized.
- `workspaceStore`: owns client workspace cache, GraphQL fetch/create calls, and workspace id/path cache updates.
- Workspace GraphQL resolver / `WorkspaceManager`: own server workspace creation/loading and active workspace listing.
- `autobyteus-android`: owns native shell/pairing/WebView only; it must not own run setup semantics.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Android WebView shell | `/mobile` Nuxt application | Native pairing/container entrypoint | Run setup UI, `autoExecuteTools`, workspace selection/loading policy |
| `MobileRuns.vue` | `MobileRunSetup.vue` + setup controller | Shows/hides setup inside Runs tab | Launch config state or workspace loading policy |
| `MobileRunSetup.vue` after refactor | `useMobileRunSetupController`, sub-controls, existing stores | Shell/layout and event bridge | Hidden duplicate setup state beyond controller returns |
| `MobileLaunchWorkspacePicker.vue` | `useMobileLaunchWorkspaces` + setup controller | Touch-friendly UI for workspace choice/path | Direct workspace store mutation or active agent/team config selection |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `MobileRunSetup.vue` dependency on `useMobileWorkCatalog().workspaceItems` | Launch workspace choices must not be governed by context switcher catalog | `useMobileLaunchWorkspaces` | In This Change | Keep `useMobileWorkCatalog` for context switcher and possibly target definition choices only. |
| `workspaceChoices` and `workspaceIdByRootPath` computed values inside `MobileRunSetup.vue` | These are launch workspace transformations, not shell concerns | `useMobileLaunchWorkspaces` | In This Change | Controller consumes root-path lookup for context defaults. |
| Workspace invalid-selection clearing in `MobileRunSetup.vue` | Selection validity belongs with launch setup controller/workspace owner | `useMobileRunSetupController` using workspace choices from `useMobileLaunchWorkspaces` | In This Change | Avoid stale selected id after workspace refresh. |
| Long context/setup-intent/config-sync watcher block in `MobileRunSetup.vue` | The shell should not own setup state sequencing | `useMobileRunSetupController` | In This Change | Keep the same behavior; move ownership. |
| Any planned mobile-only `autoApproveTools` or duplicate state ref | Existing config stores already own `autoExecuteTools` | Active config update methods in controller | In This Change | Do not introduce then migrate; never add it. |
| Fallback branch from launch workspace owner to `useMobileWorkCatalog.workspaceItems` | Would preserve two authoritative workspace sources | Clean-cut workspace-store source only | In This Change | Context catalog can still display workspaces in Switch Work. |
| Backend persisted-inactive workspace enumeration change | Not required for current mobile parity if path load exists | Follow-up backend workspace catalog ticket if needed | Follow-up | Residual risk documented; not a compatibility path. |

## Return Or Event Spine(s) (If Applicable)

- DS-MWS-ERR-001 success: `workspaceStore.createWorkspace result -> useMobileLaunchWorkspaces.loadByPath resolves workspaceId/path -> setup controller selectedWorkspaceId + active config store setWorkspaceLoaded -> picker success/selected display`.
- DS-MWS-ERR-001 error: `workspaceStore.fetch/create throws -> useMobileLaunchWorkspaces normalizes error -> MobileLaunchWorkspacePicker shows error -> setup readiness remains blocked until a valid workspaceId exists`.
- `Create run` errors remain separate: `useMobileRunLaunchCoordinator` errors are caught by the setup controller/shell and shown in `mobile-run-setup-error`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `useMobileRunSetupController`
  - Chain: `props.context/setupIntent -> apply defaults -> selected mode/target/workspace -> clear stale inactive config -> set template/update workspace/autoExecuteTools -> readiness`
  - Why it matters: this is the state machine currently spread across component watchers; it must remain coherent after extraction.
- Parent owner: `useMobileLaunchWorkspaces`
  - Chain: `refresh request -> fetchAllWorkspaces -> workspaceStore.allWorkspaces -> MobileLaunchPickerItem[] + rootPathToWorkspaceId map`
  - Why it matters: launch workspace choices need their own source and mapping independent of context switcher catalog.
- Parent owner: `MobileLaunchWorkspacePicker.vue`
  - Chain: `Existing/Load UI state -> selected id or entered path -> emit update/load-path -> success/error visual state`
  - Why it matters: the component should own only UI state, not workspace store mutation.
- Parent owner: `useTeamRunRuntimeCatalogSync`
  - Chain: `active team config -> runtime catalog sync -> launch readiness`
  - Why it matters: the controller should preserve this existing team readiness behavior.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Switch accessibility and touch target | DS-MAA-001 | `MobileLaunchRunOptionsCard.vue` | Visible label, `role="switch"`, `aria-checked`, deterministic test id | Mobile control must be usable/testable | Store code would hide parity from UI tests. |
| Server-side path help text | DS-MWS-002 | `MobileLaunchWorkspacePicker.vue` | Explain that the path is on the paired node/backend host | Avoid confusing phone-local filesystem with backend workspace path | Users may enter Android paths and think loading is broken. |
| Workspace loading/error display | DS-MWS-ERR-001 | `MobileLaunchWorkspacePicker.vue` | Show loading state, errors, and selected/loaded feedback | Path load is asynchronous | Global form errors would make workspace failures hard to recover from. |
| Choice grouping/labels | DS-MWS-001 | `useMobileLaunchWorkspaces` + picker | Label temp/current/current-run/all groups without changing identity | Keeps picker readable on mobile | Grouping logic in config stores would pollute state owners. |
| Draft attachments | DS-MOB-001 | `useMobileRunLaunchCoordinator` / mobile work store | Preserve existing transfer behavior | Existing mobile create-run behavior | Mixing into workspace/options code risks regressions. |
| Android bundle freshness | DS-MAA-001, DS-MWS-001 | API/E2E/delivery validation | Verify served `/mobile` assets are refreshed | Android APK alone does not update UI | Fix may appear absent on device. |
| Test ids | All UI spines | Component tests | Stable selectors for switch, picker, load path | Avoid brittle text-only tests | Tests may miss mobile-specific regressions. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| `autoExecuteTools` state | `agentRunConfigStore`, `teamRunConfigStore` | Reuse | They already own launch config updates and defaults | N/A |
| Auto-approval propagation into created runs/backend | Agent/team context stores, team member config builder, run stores | Reuse | Existing path already carries the field | N/A |
| Mobile setup state orchestration | Current `MobileRunSetup.vue` logic | Create New composable | The behavior exists but is over-concentrated in a component | A component shell is not the right owner for state sequencing and stale config clearing. |
| Mobile workspace launch choices/path load | `workspaceStore` client boundary and server workspace resolver | Create New mobile composable that reuses store | Store owns persistence/API; mobile setup needs a launch-specific adapter/owner | `useMobileWorkCatalog` is a context catalog, and desktop `WorkspaceSelector.vue` is desktop-oriented UI. |
| Workspace path creation/loading | `workspaceStore.createWorkspace({ root_path })` | Reuse | Existing API creates/registers workspace and deduplicates root paths in store | N/A |
| Mobile context switching/work catalog | `useMobileWorkCatalog` | Reuse unchanged for context switcher; stop using for launch workspace policy | It remains correct for Switch Work/Home catalog | It should not grow launch path-load policy. |
| Android mobile shell | `autobyteus-android` WebView | Reuse unchanged | Android renders `/mobile`; no native run setup | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Mobile launch setup components | Shell, options card, workspace picker UI | DS-MAA-001, DS-MWS-001, DS-MWS-002 | Mobile user, setup controller | Extend/Create New | Keep mobile-specific UI in `components/mobile`. |
| Mobile launch setup controller | Mode/target/workspace state, config sync, readiness, create-run call | DS-MRF-001, DS-MOB-001 | `MobileRunSetup.vue` shell | Create New | Extracted from existing component logic. |
| Mobile launch workspace adapter | Workspace fetch/list/path-load mapping for launch setup | DS-MWS-001, DS-MWS-002, DS-MWS-ERR-001 | Setup controller, workspace picker | Create New | Reuses `workspaceStore`; replaces context catalog dependency. |
| Launch config stores | Authoritative pre-run config fields and loading state | DS-MAA-001, DS-MWS-001, DS-MWS-002 | Setup controller | Reuse | No new store API required unless implementation finds a small helper beneficial. |
| Workspace subsystem | Client workspace cache and server GraphQL workspace creation/listing | DS-MWS-001, DS-MWS-002 | Launch workspace adapter | Reuse | Backend list expansion deferred. |
| Mobile context catalog | Recent/definition/team/workspace context switch segments | Not a launch workspace spine | Mobile context switcher/home | Reuse unchanged | Do not make it the launch workspace owner. |
| Mobile run launch coordinator | Temporary context creation and draft attachment transfer | DS-MOB-001 | Setup controller | Reuse | No signature change needed. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/mobile/MobileRunSetup.vue` | Mobile launch setup components | Form shell | Compose mode tabs, target pickers, workspace picker, runtime/model card, options card, readiness, submit/error; emit events | Keeps layout readable after logic extraction | `MobileLaunchPickerItem`, controller return shape |
| `autobyteus-web/composables/mobile/useMobileRunSetupController.ts` | Mobile launch setup controller | Setup state/config sync | Own mode/target/workspace refs, apply context/setup-intent defaults, clear invalid selections, sync active config stores, expose readiness/createRun/options setters | Current component watcher logic forms one bounded local state spine | Existing run config types/stores |
| `autobyteus-web/composables/mobile/useMobileLaunchWorkspaces.ts` | Mobile launch workspace adapter | Launch workspace source/load boundary | Fetch workspace store, compute choices/root-path map, load path through createWorkspace, expose loading/error | Separates launch workspace policy from context catalog and UI | `MobileLaunchPickerItem` |
| `autobyteus-web/components/mobile/MobileLaunchWorkspacePicker.vue` | Mobile launch setup components | Workspace picker UI | Show existing workspace picker and server-side path load affordance, emit selected id/load path, display loading/error | Mobile-specific UX; avoids importing desktop selector | `MobileLaunchPickerItem` |
| `autobyteus-web/components/mobile/MobileLaunchRunOptionsCard.vue` | Mobile launch setup components | Launch options UI | Render `Auto approve tools` switch and emit `update:autoExecuteTools` | Keeps options presentation out of shell/controller | `autoExecuteTools` boolean |
| `autobyteus-web/types/mobileLaunch.ts` | Mobile launch shared types | Tight shared mobile launch view types | Export `MobileLaunchPickerItem` and any minimal mobile launch-only UI state types | Avoids duplicating item shape across setup shell, target picker, workspace picker, and composables | No optional kitchen-sink fields |
| `autobyteus-web/components/mobile/MobileLaunchTargetPicker.vue` | Existing mobile picker component | Generic mobile item picker UI | Optionally import/use shared `MobileLaunchPickerItem` type; behavior unchanged | Existing reusable picker for agent/team/workspace-like lists | `MobileLaunchPickerItem` |
| `autobyteus-web/components/mobile/__tests__/MobileUxRefinement.spec.ts` | Mobile component tests | Setup UX regression | Auto-approve visibility/default/toggle; workspace list contains non-run workspace | Existing mobile setup mount coverage | Stores/test helpers |
| `autobyteus-web/components/mobile/__tests__/MobileContextSelectionRegression.spec.ts` or new `MobileRunSetupLaunchOptions.spec.ts` | Mobile behavior tests | Creation/config propagation | Created agent/team contexts preserve auto-approval and workspace id after path load | Need focused propagation coverage | Existing stores/coordinator |
| `autobyteus-web/composables/mobile/__tests__/useMobileLaunchWorkspaces.spec.ts` | Mobile composable tests | Workspace adapter coverage | Fetch/list path-load success/error mapping | New composable deserves direct tests | Workspace store mock |
| `autobyteus-web/docs/remote_access.md` | Docs | Mobile shell/freshness docs | Optional docs update if delivery finds user-facing docs impacted | Existing remote mobile docs mention bundle freshness | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Mobile picker item shape (`id`, `label`, `detail`, `group`) | `autobyteus-web/types/mobileLaunch.ts` | Mobile launch UI/types | Used by target picker, setup controller, workspace adapter, and workspace picker | Yes | Yes | A broad mobile work context DTO or mixed run/workspace model |
| Active launch option update shape | N/A | Config stores | Only `autoExecuteTools: boolean` is needed; existing store update methods are sufficient | Yes | Yes | A mobile-only shadow config |
| Workspace identity during path load | N/A or local return type in `useMobileLaunchWorkspaces.ts` | Launch workspace adapter | Path is transient input; `workspaceId` is authoritative after load | Yes | Yes | Parallel persistent path-vs-id authority |
| Workspace loading state duplicate in agent/team stores | Deferred shared type extraction | Launch config stores | Existing duplicate exists but extracting it is not required to satisfy this ticket | N/A | N/A | A broad cross-store refactor that delays mobile parity |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `autoExecuteTools` | Yes | Yes | Low | Reuse existing field; do not add `autoApproveTools`. |
| `MobileLaunchPickerItem.id` | Yes | Yes | Low | Always the selectable id for the picker subject (agent id, team id, workspace id); subject is determined by the picker instance, not by a generic mixed list. |
| Launch workspace path input | Yes | Yes | Medium | Treat path as transient load input. Once `createWorkspace` returns, use `workspaceId` as selection/config identity. |
| `MobileWorkContext` | Yes for context switching/runs | N/A | Medium if reused for launch workspace choices | Do not use it as the launch workspace choice source in setup; map workspaces to launch picker items instead. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/mobile/MobileRunSetup.vue` | Mobile launch setup components | Shell/layout | Compose mobile setup controls and bind controller return values; no direct workspace store create/list logic | Prevents component bloat and keeps presentation separate from state sequencing | `useMobileRunSetupController`, `MobileLaunchPickerItem` |
| `autobyteus-web/composables/mobile/useMobileRunSetupController.ts` | Mobile launch setup controller | Authoritative mobile setup state | Mode/target/workspace refs, defaults, invalid selection clearing, active config setters, readiness, createRun | One cohesive bounded state spine; extracted from current component | Agent/team config types/stores, launch workspace adapter |
| `autobyteus-web/composables/mobile/useMobileLaunchWorkspaces.ts` | Mobile launch workspace adapter | Launch workspace source/load owner | Fetch/list workspaces, root-path lookup, load path, normalize status/errors | The workspace parity bug needs a launch-specific owner | `workspaceStore`, `MobileLaunchPickerItem` |
| `autobyteus-web/components/mobile/MobileLaunchWorkspacePicker.vue` | Mobile launch setup components | Workspace UI | Existing workspace chooser plus manual path load UI | UI state belongs in component; store mutation belongs in composable/controller | `MobileLaunchPickerItem` |
| `autobyteus-web/components/mobile/MobileLaunchRunOptionsCard.vue` | Mobile launch setup components | Launch options UI | `Auto approve tools` switch with accessibility/test ids | Isolates launch options from runtime/model and workspace UI | Existing `autoExecuteTools` |
| `autobyteus-web/types/mobileLaunch.ts` | Mobile launch shared types | Tight view types | Minimal picker item and launch mode type if needed | Prevents duplicate local picker item types without generalizing domain state | N/A |
| `autobyteus-web/components/mobile/MobileLaunchTargetPicker.vue` | Mobile launch setup components | Generic picker UI | Keep behavior; optionally consume shared picker type | Existing reusable selector still valid | `MobileLaunchPickerItem` |
| `autobyteus-web/components/mobile/__tests__/MobileUxRefinement.spec.ts` | Mobile tests | UX parity/regression | Auto-approve switch and non-run workspace listing | Existing broad mobile setup test suite | Stores/helpers |
| `autobyteus-web/components/mobile/__tests__/MobileContextSelectionRegression.spec.ts` or new focused spec | Mobile tests | Launch propagation | Auto-approve and workspace id/path load propagation into created contexts | Existing create-run path coverage belongs nearby | Stores/helpers |
| `autobyteus-web/composables/mobile/__tests__/useMobileLaunchWorkspaces.spec.ts` | Mobile tests | Workspace adapter | Fetch/list/path-load success/error | New composable unit coverage | Workspace store mock |

## Ownership Boundaries

The authoritative state boundary for run configuration remains the existing launch config stores. The setup controller may present active computed values and dispatch store updates, but it must not duplicate `workspaceId` or `autoExecuteTools` outside the controller's transient selected refs. The transient `selectedWorkspaceId` is a UI selection cursor; the active config store is the authoritative launch config once sync occurs.

The authoritative boundary for mobile launch workspace choices is `useMobileLaunchWorkspaces`, not `useMobileWorkCatalog`. The context catalog can still show workspaces for switching work, but mobile run setup must depend on the launch workspace owner for setup choices/path loading.

The authoritative boundary for workspace persistence/loading is `workspaceStore` and the existing GraphQL workspace resolver. The mobile launch workspace adapter should not bypass this boundary or call server APIs directly.

The Android WebView shell remains a facade only. Served `/mobile` web assets must be refreshed/validated, but Android source must not duplicate the setup UI.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `useMobileRunSetupController` | Mode/target/workspace refs, setup defaults, config sync, readiness, createRun wrapper | `MobileRunSetup.vue` | Shell imports definition stores/config stores/workspace catalog and recreates controller logic | Add explicit controller return values/actions. |
| `useMobileLaunchWorkspaces` | Workspace fetch/list/root-path map/path-load status | Setup controller, workspace picker via props/actions | `MobileRunSetup.vue` or picker imports `useMobileWorkCatalog.workspaceItems` for launch choices | Add needed choice/status fields to launch workspace composable. |
| `workspaceStore` | Apollo GraphQL workspace fetch/create, client workspace cache, root-path de-duplication | `useMobileLaunchWorkspaces` | Direct GraphQL calls from mobile setup component | Extend workspace store or launch workspace composable. |
| `agentRunConfigStore` | Agent launch config buffer and workspace loading state | Setup controller | Mobile-only agent config ref copied at submit | Use `updateAgentConfig`, `setWorkspaceLoaded`, `setWorkspaceError`. |
| `teamRunConfigStore` | Team launch config buffer, readiness, workspace loading state | Setup controller | Mobile-only team config or member config fork | Use `updateConfig`, `setWorkspaceLoaded`, `setWorkspaceError`. |
| `useMobileRunLaunchCoordinator` | Create-run validation, context creation, draft attachment transfer | Setup controller | Setup shell directly creates contexts after refactor | Add coordinator methods if necessary. |
| `/mobile` Nuxt shell | Mobile UI delivered to Android | Android WebView | Native Android run setup option | Change mobile web and refresh served bundle. |

## Dependency Rules

Allowed:
- `MobileRunSetup.vue` may import the setup controller and mobile setup sub-components.
- `useMobileRunSetupController` may import agent/team definition stores, config stores, `useMobileWorkCatalog` for agent/team definition item choices, `useMobileLaunchWorkspaces` for workspace choices/loading, `useTeamRunRuntimeCatalogSync`, and `useMobileRunLaunchCoordinator`.
- `useMobileLaunchWorkspaces` may import `workspaceStore` and map `WorkspaceInfo` records to `MobileLaunchPickerItem` records.
- `MobileLaunchWorkspacePicker.vue` may import `MobileLaunchTargetPicker.vue` for existing workspace selection UI or render equivalent local mobile UI.
- Tests may inspect config stores/context stores to assert propagation.

Forbidden:
- `MobileRunSetup.vue` must not use `useMobileWorkCatalog.workspaceItems` for launch workspace choices.
- `useMobileWorkCatalog` must not gain path-loading behavior for launch setup.
- `MobileLaunchWorkspacePicker.vue` must not mutate `agentRunConfigStore` or `teamRunConfigStore` directly.
- Do not add a mobile-only `autoApproveTools` field/ref or duplicate backend flag.
- Do not import desktop `WorkspaceSelector.vue` directly into mobile setup; use it as behavior reference only.
- Do not add native Android run setup UI.
- Do not change backend auto-approval defaults or schema for this scope.
- Do not keep dual workspace choice paths for compatibility.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `useMobileRunSetupController(...)` | Mobile launch setup | Return state/actions for shell binding | Props/refs for `MobileWorkContext`, `MobileRunSetupIntent`; emitted callback or returned `createRun()` result | Keep implementation flexible, but controller must own sequencing. |
| `controller.setAutoExecuteTools(checked)` or v-model setter | Active launch options | Update active agent/team config `autoExecuteTools` | `boolean` | No-op or disabled when no active config. |
| `controller.selectWorkspace(workspaceId)` | Active launch workspace selection | Select existing workspace into active mode/config | `workspaceId: string` | Must update selected ref and active store. |
| `controller.loadWorkspacePath(path)` | Active launch workspace path load | Load path and select returned workspace id | Trimmed absolute server-side path string | Delegates creation to `useMobileLaunchWorkspaces`. |
| `useMobileLaunchWorkspaces.refresh(force?)` | Launch workspace list | Fetch workspace store | Optional `force: boolean` | Should tolerate test/no-client errors similarly to desktop if appropriate. |
| `useMobileLaunchWorkspaces.loadByPath(path)` | Workspace creation/loading | Create/register workspace and return id/path | Trimmed path string | Calls `workspaceStore.createWorkspace({ root_path: path })`. |
| `agentRunConfigStore.updateAgentConfig` | Agent launch config | Update `autoExecuteTools`, workspace, runtime/model fields | `Partial<AgentRunConfig>` | Existing boundary. |
| `teamRunConfigStore.updateConfig` | Team launch config | Update `autoExecuteTools`, workspace, runtime/model fields | `Partial<TeamRunConfig>` | Existing boundary. |
| `agentRunConfigStore.setWorkspaceLoaded` / `teamRunConfigStore.setWorkspaceLoaded` | Workspace load state in launch config | Mark path load success and assign workspace id | `(workspaceId: string, path: string)` | Reuse after path load. |
| `createMobileRunFromConfig` | Mobile run creation | Validate config and create temporary context | `MobileRunCreationDraft` with agent/team id + workspace id | No signature change expected. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `useMobileRunSetupController` | Yes | Yes | Low | Keep it mobile setup-specific; do not turn it into a generic mobile coordinator. |
| `useMobileLaunchWorkspaces` | Yes | Yes | Low | Own workspace choices/load only; do not include agent/team target choices. |
| `selectWorkspace(workspaceId)` | Yes | Yes | Low | Use workspace id only after workspace exists. |
| `loadWorkspacePath(path)` | Yes | Yes | Low | Path is transient input; returned id becomes selection. |
| `updateAgentConfig` / `updateConfig` | Yes | Yes | Low | Reuse existing partial config APIs. |
| `useMobileWorkCatalog` | Yes for context catalog | Yes | Medium if reused for launch workspace | Remove setup workspace dependency to avoid mixed meaning. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Options component | `MobileLaunchRunOptionsCard` | Yes | Low | Name it launch options, not runtime/model. |
| Workspace component | `MobileLaunchWorkspacePicker` | Yes | Low | Makes setup-time workspace ownership explicit. |
| Workspace composable | `useMobileLaunchWorkspaces` | Yes | Low | Avoid `catalog` to distinguish from `useMobileWorkCatalog`. |
| Setup controller | `useMobileRunSetupController` | Yes | Low | Keeps state orchestration named by feature. |
| Config field | `autoExecuteTools` | Existing | Low | Do not alias. |
| UI label | `Auto approve tools` | Yes | Low | Match desktop label exactly. |

## Applied Patterns (If Any)

- Controller/composable extraction: `useMobileRunSetupController` owns a bounded local setup state spine that was previously embedded in the component.
- Adapter: `useMobileLaunchWorkspaces` adapts workspace store/API records to mobile launch picker items and load-path state.
- Presentation component: `MobileLaunchWorkspacePicker` and `MobileLaunchRunOptionsCard` present controls and emit intent; they do not own persistence or run config authority.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/mobile/MobileRunSetup.vue` | File | Mobile launch setup shell | Compose form using controller and sub-controls | Existing visible setup entrypoint | Workspace store create/fetch logic, direct context-catalog workspace choices, duplicated config state |
| `autobyteus-web/components/mobile/MobileLaunchWorkspacePicker.vue` | File | Mobile launch workspace UI | Existing workspace select + path input/load UI | Mobile-specific component folder | Agent/team config store mutation, GraphQL calls |
| `autobyteus-web/components/mobile/MobileLaunchRunOptionsCard.vue` | File | Mobile launch options UI | `Auto approve tools` switch | Adjacent to other mobile setup controls | Runtime/model selection, backend approval semantics |
| `autobyteus-web/components/mobile/MobileLaunchTargetPicker.vue` | File | Generic mobile item picker UI | Reuse/update type only if helpful | Existing component already used by setup | Workspace path loading policy |
| `autobyteus-web/composables/mobile/useMobileRunSetupController.ts` | File | Mobile setup state/controller | Defaults, sync, readiness, actions, create run | `composables/mobile` houses mobile setup/run logic | UI markup, workspace GraphQL calls |
| `autobyteus-web/composables/mobile/useMobileLaunchWorkspaces.ts` | File | Launch workspace adapter | Fetch/list/load path for launch setup | `composables/mobile` is correct for reusable mobile logic | Context switcher recent-run catalog, agent/team choice catalog |
| `autobyteus-web/types/mobileLaunch.ts` | File | Mobile launch view types | Tight picker/item/mode types | Existing type folder; avoids local duplicate type drift | Domain runtime config fields or MobileWorkContext aliases |
| `autobyteus-web/components/mobile/__tests__/MobileUxRefinement.spec.ts` | File | Mobile UX tests | Toggle/listing regression | Existing mobile component tests | Backend E2E setup |
| `autobyteus-web/components/mobile/__tests__/MobileContextSelectionRegression.spec.ts` or new focused spec | File | Mobile create-run tests | Propagation after toggle/path load | Existing mobile behavior test folder | Broad server workspace manager tests |
| `autobyteus-web/composables/mobile/__tests__/useMobileLaunchWorkspaces.spec.ts` | File | Mobile composable tests | Workspace adapter unit coverage | Existing composable test folder | Component rendering assertions |
| `autobyteus-web/docs/remote_access.md` | File | Mobile docs | Optional final docs sync | Already documents remote mobile details | Implementation-internal sequence |
| `autobyteus-android/` | Folder | Native shell | No source change | Android does not own setup UI | Run setup toggle or workspace UI |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/mobile` | Presentation/UI components | Yes | Low | Mobile UI components belong here; state/persistence stays in composables/stores. |
| `autobyteus-web/composables/mobile` | Mobile control/adapters | Yes | Low | Existing mobile composables house launch coordinator/catalog logic; setup controller/workspace adapter fit. |
| `autobyteus-web/stores` | State ownership/persistence-facing client stores | Yes | Low | Reused boundaries; no broad store refactor. |
| `autobyteus-web/types` | Shared TypeScript types | Yes | Low | Only tight mobile launch view types should be added. |
| `autobyteus-server-ts/src/workspaces` | Server workspace lifecycle | Yes | Low for this scope | No change unless deferred backend list issue is promoted. |
| `autobyteus-android` | Native transport/container | Yes | Low | Not a run setup owner. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Auto-approve update | `setAutoExecuteTools(true) -> agentRunConfigStore.updateAgentConfig({ autoExecuteTools: true })` when mode is agent | `const mobileAutoApprove = ref(true)` copied during create | Keeps existing launch config store authoritative. |
| Team auto-approve update | `teamRunConfigStore.updateConfig({ autoExecuteTools: checked })` | Add `autoApproveTools` to `MobileRunCreationDraft` | Avoids duplicate field and backend alias. |
| Existing workspace select | `selectWorkspace(workspaceId) -> selectedWorkspaceId = workspaceId -> activeStore.update...({ workspaceId })` | Store selected root path in config while also storing id | Keeps `workspaceId` as launch identity. |
| Path load | `loadByPath('/srv/project') -> workspaceStore.createWorkspace({ root_path: '/srv/project' }) -> setWorkspaceLoaded(returnedId, '/srv/project')` | Mobile picker directly calls GraphQL and updates both agent/team stores | Respects workspace store and setup controller boundaries. |
| Context defaults for run workspace | `workspaceIdByRootPath.get(context.workspaceRootPath)` from launch workspace adapter | Read `useMobileWorkCatalog.workspaceItems` inside setup shell | Replaces context catalog dependency. |
| Android delivery | Validate refreshed served `/mobile` bundle | Only rebuild/install Android APK | Android shell renders server assets. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `useMobileWorkCatalog.workspaceItems` as a fallback workspace source | Could avoid changing setup defaults when workspace store is empty | Rejected | Launch setup uses `useMobileLaunchWorkspaces`; empty list can be solved by path load. |
| Mobile-only `autoApproveTools` field/ref | Could be quick to add in setup component | Rejected | Use existing `autoExecuteTools` in config stores. |
| Native Android duplicate switch/workspace picker | User observes the issue on Android | Rejected | Modify `/mobile` web UI served to Android. |
| Backend default auto-approval for mobile | Could make mobile behavior differ without UI | Rejected | Preserve default false and explicit user switch. |
| Import desktop `WorkspaceSelector.vue` into mobile | Would reuse existing path-load UI | Rejected | Desktop component has desktop UX/feature-gate assumptions; implement mobile-specific picker using same store boundaries. |
| Backend persisted-inactive workspace list expansion in this ticket | Could make list more complete after restart | Deferred, not compatibility | In-scope path-load fallback; create follow-up only if validation proves this is required. |

## Derived Layering (If Useful)

Mobile presentation (`MobileRunSetup.vue`, `MobileLaunchWorkspacePicker.vue`, `MobileLaunchRunOptionsCard.vue`) -> mobile setup controller/adapters (`useMobileRunSetupController`, `useMobileLaunchWorkspaces`) -> authoritative stores (`agentRunConfigStore`, `teamRunConfigStore`, `workspaceStore`) -> context creation (`useMobileRunLaunchCoordinator`, context stores) -> backend launch/workspace GraphQL.

## Migration / Refactor Sequence

1. Add `autobyteus-web/types/mobileLaunch.ts` with a tight `MobileLaunchPickerItem` shape and optional `MobileLaunchMode` if useful.
2. Add `useMobileLaunchWorkspaces.ts`:
   - wraps `workspaceStore.fetchAllWorkspaces()` for setup-time refresh;
   - computes workspace picker items from `workspaceStore.allWorkspaces`;
   - exposes `workspaceIdByRootPath`/lookup for context defaults;
   - exposes `loadByPath(path)` using `workspaceStore.createWorkspace({ root_path: path })`;
   - tracks load/fetch error/loading state.
3. Add `MobileLaunchWorkspacePicker.vue`:
   - use existing mobile picker styling for existing workspaces;
   - add a clearly labeled server-side path input and load button;
   - emit `update:modelValue` and `load-path` rather than mutating stores.
4. Add `MobileLaunchRunOptionsCard.vue` with the `Auto approve tools` switch, default visual off state from prop, accessible switch semantics, and stable test ids.
5. Add `useMobileRunSetupController.ts` by moving existing setup state logic out of `MobileRunSetup.vue`:
   - mode/selected target/workspace refs;
   - agent/team choices;
   - context/setup-intent defaults;
   - invalid selection clearing;
   - config template setup and active store sync;
   - `setAutoExecuteTools`, `selectWorkspace`, `loadWorkspacePath`, readiness, `createRun`.
6. Rewrite `MobileRunSetup.vue` as a shell:
   - compose mode tabs, target picker, `MobileLaunchWorkspacePicker`, runtime/model card, `MobileLaunchRunOptionsCard`, readiness/error/create button;
   - remove `workspaceItems`, `workspaceChoices`, `workspaceIdByRootPath`, direct workspace invalid clearing, and direct path-load logic;
   - preserve existing emits and test ids where possible.
7. Update tests:
   - auto-approve default/toggle in agent and team modes;
   - created agent/team contexts preserve `autoExecuteTools: true`;
   - workspace list includes a workspace with no live run when present in `workspaceStore.allWorkspaces`;
   - path-load calls `workspaceStore.createWorkspace`, selects returned id, and updates the active config;
   - context switcher still renders/uses `useMobileWorkCatalog` segments.
8. Run focused checks:
   - `pnpm -C autobyteus-web test:nuxt -- components/mobile/__tests__/MobileUxRefinement.spec.ts components/mobile/__tests__/MobileContextSelectionRegression.spec.ts composables/mobile/__tests__/useMobileLaunchWorkspaces.spec.ts composables/mobile/__tests__/useMobileWorkCatalog.spec.ts`
   - Add/adjust exact test path if implementation creates a new focused spec.
9. Downstream API/E2E/delivery should validate served `/mobile` bundle freshness for Android/WebView. Documentation sync occurs in delivery; if docs impact is none, record explicit no-impact.

## Key Tradeoffs

- Extracting a setup controller is more work than adding controls inline, but it directly addresses the review finding and prevents `MobileRunSetup.vue` from absorbing workspace loading and launch options.
- A mobile-specific workspace picker duplicates some desktop behavior, but avoids importing a desktop component with desktop layout/native folder picker assumptions.
- Backend persisted-inactive workspace enumeration is deferred to keep this ticket focused on mobile setup parity. The path-load fallback ensures the user can still create a run in an unlisted workspace.
- `useMobileWorkCatalog` can still provide agent/team choices for now. The boundary problem is specifically launch workspace policy; a broader target-catalog refactor is not required unless implementation finds the same issue for definitions.

## Risks

- Auto-approval is safety-sensitive. The default must remain false and the user must explicitly toggle it.
- Users may misunderstand path entry as phone-local. The mobile UI must label it as a path on the paired AutoByteus node/workspace host.
- If server `workspaces` intentionally or accidentally returns only active workspaces after restart, the list may still omit prior persisted mappings; path load mitigates this, while backend enumeration remains a named follow-up risk.
- Refactoring setup state could regress existing setup intent/default behavior if tests do not cover current context/run defaults.
- Android may still show old UI if served `/mobile` assets are stale.

## Guidance For Implementation

- Suggested test ids:
  - `mobile-run-auto-approve-tools`
  - `mobile-run-auto-approve-tools-switch`
  - `mobile-run-workspace-select`
  - `mobile-run-workspace-path-input`
  - `mobile-run-workspace-load`
  - `mobile-run-workspace-error`
- Keep desktop label text exactly: `Auto approve tools`.
- Use `role="switch"` and `aria-checked` for the auto-approve control.
- Do not write to config stores when no selected/active config exists; render the options card only when an active config exists or disable it with clear state.
- When loading a path, trim the path and require non-empty input. Let existing backend/store validation decide whether it is a valid absolute server-side path.
- After path load succeeds, update both `selectedWorkspaceId` and the active config store. Use `setWorkspaceLoaded` where appropriate so existing loading state remains consistent.
- Preserve current draft attachment transfer and team focused-member behavior by continuing to use `useMobileRunLaunchCoordinator`.
- Do not modify GraphQL schema, backend auto-approval runtime semantics, or native Android source for this scope.
