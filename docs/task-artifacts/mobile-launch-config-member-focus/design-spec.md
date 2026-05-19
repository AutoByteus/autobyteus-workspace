# Design Spec

## Current-State Read

The mobile Remote Access shell has a separate phone-first work surface under `autobyteus-web/components/mobile/*`. The affected start-new path is:

`MobileRuns.vue -> MobileRunSetup.vue -> useMobileRunLaunchCoordinator.launchMobileRun(...) -> agent/team config stores -> temporary run/team context -> activeContextStore.send()`

Current ownership and defects:

- `MobileRunSetup.vue` owns only a local subset of launch state: mode, target, workspace, and prompt. It does **not** expose or bind to the existing runtime/model config fields. It hardcodes `selectedModelLabel` to `Existing desktop defaults` and blocks/enables Launch only from target/workspace/prompt.
- `useMobileRunLaunchCoordinator.ts` currently resets the launch template inside `launchAgent` / `launchTeam`, resolves a model automatically, updates the store, then launches. This makes the coordinator a hidden runtime/model decision maker and would overwrite any UI-selected draft unless changed.
- Desktop launch configuration already has authoritative owners:
  - `agentRunConfigStore` for single-agent launch config and `isConfigured` readiness.
  - `teamRunConfigStore` for team launch config and `launchReadiness`.
  - `RuntimeModelConfigFields.vue` for runtime/model/model-config controls.
  - `TeamRunConfigForm.vue` and `MemberOverrideTree.vue` for team default and per-member runtime/model behavior.
- Team focus already exists at the domain layer. `AgentTeamContext.focusedMemberRouteKey`, `agentTeamContextsStore.focusMemberAndEnsureHydrated(...)`, and `activeContextStore.send()` route team messages through the focused member. Mobile lacks a control to call that boundary and lacks a `mobileWorkStore` action to update the current mobile context's `focusedMemberRouteKey` when focus changes.
- `TeamRunConfigForm.vue` has an inline watcher that loads model catalogs for the team default runtime and member override runtimes, then writes them into `teamRunConfigStore` for `launchReadiness`. Mobile team runtime/model UI needs that same behavior; copying the watcher would duplicate readiness support policy.

Constraints:

- Keep mobile phone-first navigation; do not import the desktop workspace shell, desktop left tree, or right panel as the mobile solution.
- Reuse shared launch/focus owners and provider data.
- Preserve desktop Electron and normal desktop/web `/workspace` behavior, including layout, `RunConfigPanel`, runtime/model controls, team focus surfaces, and launch semantics.
- Keep mobile presentation changes under `components/mobile/*`; shared changes must be behavior-preserving extractions only.
- Do not add mobile-only provider/API-key preflight.

## API/E2E Design Impact Addendum (2026-05-19)

API/E2E validation proved the core runtime/model and focused-send data paths are viable: mobile team launch used `codex_app_server` / `gpt-5.5` and delivered the first prompt to `api_e2e_engineer`; mobile single-agent launch recorded the selected runtime/model; existing-run focus change routed a follow-up to `delivery_engineer`. The failed validation result is a design-impact refinement for mobile information architecture and copy.

Additional current-state findings after the first implementation pass:

- `MobileWorkShell.vue` renders `MobileTeamMemberFocusBar` for every team-run context, so the existing-run focus selector appears on Runs and conflicts with Start new's separate `First message target` selector.
- `MobileRuns.vue` inserts `MobileRunSetup` above the full recent-runs list, making Start new a long mixed setup/history surface on phones.
- `MobileRunSetup.vue`, `MobileLaunchRuntimeModelCard.vue`, and `MobileLaunchSummary.vue` contain copy that is either mode-inaccurate (`focused member` in Agent mode) or implementation/desktop-facing (`desktop launch panel`, `Store-backed launch choices`).
- `MobileRunSetup.vue` passes blocking issues to both runtime/model card and summary, allowing duplicated model/prompt blockers on the same surface.
- `MobileTeamLaunchFocusPicker.vue` still relies on a native `<select>` for potentially long member lists; launch focus choice needs phone-friendly search/filtering like the target picker.
- `useMobileWorkCatalog.ts` derives Recent team-run focus from the coordinator/first member every time, while `mobileWorkStore.updateFocusedTeamMember` updates only the current context. This permits Recent reopen to reset away from the explicit mobile focus.
- `MobileRemoteAccessShell.onPaired()` calls `checkStatus()`, but the Home surface can still settle on `Unknown`; the post-pair transition needs an explicit checking state and first-stable render based on status/catalog refresh.

Product decision for focus persistence: the mobile client must remember the last explicit valid focused member per team run for the current client session and prefer it when reopening from Recent. Cross-device/backend durable focus persistence is outside this ticket unless already exposed by existing stores/history.

## Intended Change

Make mobile launch and team focus first-class, but still owner-aligned:

1. `MobileRunSetup.vue` becomes a mobile presentation layer over the existing launch config stores.
2. Add a mobile runtime/model card that reuses `RuntimeModelConfigFields.vue` for single-agent and team default runtime/model/model-config choices.
3. Extract team runtime-catalog synchronization into a reusable composable so desktop `TeamRunConfigForm.vue` and mobile setup both feed `teamRunConfigStore.launchReadiness` consistently.
4. Add mobile team initial-focus selection for Start new team, limited to focusable leaf agent members for direct composer/send safety.
5. Change `useMobileRunLaunchCoordinator.ts` to consume validated store state instead of resetting templates and auto-selecting a model at launch time.
6. Add a mobile team member focus bar/picker for existing team runs. It updates both the domain focus owner and the mobile context identity.
7. Remove obsolete hardcoded `Existing desktop defaults` copy and hidden mobile auto-model fallback from the steady-state path.
8. Scope the existing-run `Message target` focus bar to team-run work tabs where it governs the current opened run; do not show it on Runs or concurrently with Start new.
9. Make Start new copy mode-aware and user-outcome oriented; remove desktop-panel, store-backed, and internal implementation language.
10. Display launch-blocking issues in one authoritative place on the setup surface.
11. Make Start new a focused mobile task surface by hiding or clearly separating the recent-runs list while setup is open.
12. Ensure long launch/focus choices use a searchable grouped mobile picker rather than large native selects.
13. Add current-client per-team-run focus memory and make Recent reopen prefer the remembered valid focus.
14. Make successful pairing transition through an explicit status/catalog refresh before a stable Home render.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Parity.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue plus Missing Invariant; Duplicated Policy Or Coordination risk; API/E2E rework adds missing UX/focus-scope invariants.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, narrowly.
- Evidence: initial `MobileRunSetup.vue` hardcoded runtime/model summary and ignored runtime/model readiness; `useMobileRunLaunchCoordinator.ts` reset templates and resolved a model internally; domain focus existed but no mobile focus UI/context update existed; `TeamRunConfigForm.vue` held reusable team catalog-readiness logic inline. API/E2E rework evidence adds global focus-bar overreach on Runs, noisy inline Start new, duplicate blocker copy, missing post-pair stable refresh, native long member select, and Recent reopen focus reset.
- Design response: Move mobile launch onto `agentRunConfigStore` / `teamRunConfigStore`, add mobile controls over shared `RuntimeModelConfigFields`, extract team runtime catalog sync, and add mobile focus coordination over `agentTeamContextsStore` + `mobileWorkStore`.
- Refactor rationale: Without changing the coordinator and catalog sync ownership, mobile UI additions would either be overwritten at launch or duplicate team readiness policy.
- Intentional deferrals and residual risk, if any: Mobile subteam-focused composer parity is deferred; this fix targets leaf agent members because direct focused-member send currently requires a focused leaf `AgentContext` through `activeContextStore.send()`.

## Terminology

- `Mobile launch setup`: the `MobileRunSetup.vue` start-new form.
- `Launch config stores`: `agentRunConfigStore` and `teamRunConfigStore`; the authoritative frontend state for run configuration.
- `Runtime/model card`: mobile presentation around `RuntimeModelConfigFields.vue`.
- `Focused member`: a leaf team member route key selected in `AgentTeamContext.focusedMemberRouteKey` for direct mobile composer sends.

## Design Reading Order

1. Mobile launch/focus data-flow spines.
2. Launch/focus owner boundaries.
3. Shared catalog sync extraction and mobile presentation files.
4. Migration/refactor and validation sequence.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the hardcoded mobile `Existing desktop defaults` runtime/model steady-state and the mobile coordinator's hidden model fallback as the default launch path.
- Obsolete current behavior is not kept behind a flag. If an agent/team definition already has a default runtime/model, that default still appears in the real store-backed controls and summary; that is not a compatibility path.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Mobile user selects an agent and runtime/model | Temporary/new agent run receives selected runtime/model and first prompt | `agentRunConfigStore` + `useMobileRunLaunchCoordinator` | Restores explicit mobile single-agent launch control. |
| DS-002 | Primary End-to-End | Mobile user selects a team and team default runtime/model | Temporary/new team run receives selected team config and first prompt | `teamRunConfigStore` + `useMobileRunLaunchCoordinator` | Restores explicit mobile team launch control and readiness. |
| DS-003 | Primary End-to-End | Mobile user chooses initial team member during Start new team | First prompt is sent to that selected member | `agentTeamContextsStore` focused-member owner | Restores correct first-message target selection. |
| DS-004 | Primary End-to-End | Mobile user changes focused member on existing team run | Next mobile message targets newly focused member | `agentTeamContextsStore` + `mobileWorkStore` | Restores desktop-equivalent team member focus on mobile. |
| DS-005 | Bounded Local | Team runtime or member override runtime changes | `teamRunConfigStore.runtimeModelCatalogs` refresh | `useTeamRunRuntimeCatalogSync` | Keeps team launch readiness truthful without duplicated watchers. |
| DS-006 | Primary End-to-End | Mobile user opens Start new on Runs | Focused launch setup is shown without existing-run focus/history noise | `MobileRuns.vue` + `MobileWorkShell.vue` | Keeps launch decisions visually scoped on phones. |
| DS-007 | Bounded Local | Successful mobile pairing exchange completes | First stable Home render has refreshed status/catalog or actionable reachable state | `MobileRemoteAccessShell` + `mobileNodeSessionStore` | Avoids post-pair `Unknown` requiring manual refresh. |
| DS-008 | Return-Event | Mobile user launches or changes focus on a team run | Recent reopen restores the last valid focused member | `mobileWorkStore` + `useMobileWorkCatalog` | Prevents focus reset to coordinator/default. |
| DS-009 | Bounded Local | User searches a long launch/focus option list | Filtered grouped options show matching agents/teams/members | Mobile picker components | Makes launch/focus choices usable on phones. |

## Primary Execution Spine(s)

- DS-001: `Mobile Start new -> MobileRunSetup target selection -> agentRunConfigStore template/config -> MobileLaunchRuntimeModelCard(RuntimeModelConfigFields) -> Mobile launch readiness -> useMobileRunLaunchCoordinator -> agentContextsStore.createRunFromTemplate -> activeContextStore.send`
- DS-002: `Mobile Start new -> MobileRunSetup team selection -> teamRunConfigStore template/config -> MobileLaunchRuntimeModelCard(RuntimeModelConfigFields) -> useTeamRunRuntimeCatalogSync -> teamRunConfigStore.launchReadiness -> useMobileRunLaunchCoordinator -> agentTeamContextsStore.createRunFromTemplate -> activeContextStore.send`
- DS-003: `Mobile team launch setup -> MobileTeamLaunchFocusPicker -> selected leaf member route key -> teamContextsStore.focusMemberAndEnsureHydrated(tempTeamRunId, routeKey) -> activeContextStore.send`
- DS-004: `MobileWorkShell team context -> MobileTeamMemberFocusBar -> useMobileTeamMemberFocusCoordinator -> agentTeamContextsStore.focusMemberAndEnsureHydrated -> mobileWorkStore.updateFocusedTeamMember -> activeContextStore.send`
- DS-006: `Runs tab -> Start new button -> MobileRuns focused setup state -> MobileRunSetup -> launch/cancel -> recent history restored after setup closes`
- DS-007: `PairingBootstrap paired event -> MobileRemoteAccessShell post-pair checking state -> checkStatus + refreshMobileWorkCatalog -> Home stable connected/reachable state`
- DS-008: `focus selection/launch initial focus -> mobileWorkStore remember teamRunId routeKey -> useMobileWorkCatalog maps Recent context with remembered valid routeKey -> openRunContext hydrates that route`
- DS-009: `Picker search input -> normalized query -> filtered grouped option rows -> selected target/member route key`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The mobile user selects an agent, then edits the same runtime/model/model-config state desktop uses. Launch is enabled only when `agentRunConfigStore.isConfigured` and prompt/target requirements are satisfied. The coordinator launches without resetting the configured draft. | Mobile setup, agent config store, runtime/model fields, launch coordinator, agent context | `agentRunConfigStore` for config; coordinator for launch sequencing | Agent catalog, workspace picker, provider model loading, draft context attachments |
| DS-002 | The mobile user selects a team, edits team default runtime/model/model-config, and launch readiness reflects team config plus member override compatibility. The mobile coordinator launches the validated draft. | Mobile setup, team config store, runtime/model fields, catalog sync, launch coordinator, team context | `teamRunConfigStore` | Team definition/member tree, provider model catalogs, launch summary, context attachments |
| DS-003 | Before launching a team, mobile displays focusable leaf members. The selected route key is applied immediately after temporary team creation and before the first prompt is sent. | Team member picker, temporary team context, focused member route, active context send | `agentTeamContextsStore` | Leaf-member display labels, default member resolution |
| DS-004 | For an opened team run, mobile shows the focused leaf member and a picker. Selecting a member updates domain focus and the mobile context route key so chat, files, and activity agree on the target. | Focus bar, focus coordinator, team context, mobile context store, active context send | `agentTeamContextsStore` + `mobileWorkStore` | Hydration, member labels/status, context attachment target checks |
| DS-005 | The shared catalog sync watches team default runtime and member override runtimes, loads model lists once per runtime, and writes catalogs to `teamRunConfigStore`. | Team config, runtime catalog sync, provider model store, team readiness | `useTeamRunRuntimeCatalogSync` serving `teamRunConfigStore` | Loading/error state, deduped runtime list |
| DS-006 | Start new is treated as its own mobile task. The setup surface owns the user's current launch decisions and the run history list does not compete for the same scroll region while setup is open. | Runs tab, start-new state, setup card, recent history | `MobileRuns.vue` | Cancel/launch return path, current context defaults |
| DS-007 | Pairing success does not mean the shell is ready. The shell enters an explicit checking state, refreshes authorized status and catalogs, and only then presents Home with Connected or actionable reachable/mixed status. | Pairing event, post-pair check, session status, catalog refresh, Home | `MobileRemoteAccessShell` | Diagnostics, authorized API reachability |
| DS-008 | The explicit mobile focus choice becomes the remembered focus for that team run. Recent work contexts prefer that remembered valid route over coordinator/default when rebuilding catalog rows. | Focus coordinator, mobile store, work catalog, open run | `mobileWorkStore` + `useMobileWorkCatalog` | Member-route validity check, fallback to coordinator/default |
| DS-009 | Long launch and focus lists are filtered through a mobile search field before selection. | Search input, grouped rows, selected id/route key | Mobile picker components | Query normalization, empty-result copy |

## Spine Actors / Main-Line Nodes

- `MobileRunSetup.vue`: mobile form orchestrator and presentation owner for start-new state.
- `agentRunConfigStore`: authoritative single-agent launch config/readiness state.
- `teamRunConfigStore`: authoritative team launch config/readiness state.
- `RuntimeModelConfigFields.vue`: shared runtime/model/model-config editor.
- `useTeamRunRuntimeCatalogSync`: shared catalog-readiness support owner.
- `useMobileRunLaunchCoordinator`: mobile launch sequencing owner; no hidden runtime/model decisions.
- `agentTeamContextsStore`: authoritative team focus and hydration owner.
- `mobileWorkStore`: current mobile context identity owner and current-client team focus memory owner.
- `activeContextStore`: existing send facade for selected agent or focused team member.

## Ownership Map

- `MobileRunSetup.vue` owns mobile layout, target/workspace/prompt inputs, mode-aware setup copy, and when to initialize/clear the shared config stores for the selected target. It must not own runtime/provider policy.
- `agentRunConfigStore` owns agent launch config completeness (`isConfigured`).
- `teamRunConfigStore` owns team launch config and readiness (`launchReadiness`).
- `RuntimeModelConfigFields.vue` owns field-level runtime/model/model-config editing semantics over a given config object.
- `useTeamRunRuntimeCatalogSync` owns the repeated runtime-catalog synchronization needed by team readiness.
- `useMobileRunLaunchCoordinator` owns launch sequencing, temporary context creation, context attachment consumption, focus application, and first send. It must not choose a hidden fallback model.
- `agentTeamContextsStore` owns focused member state and hydration.
- `mobileWorkStore` owns the mobile context object that all mobile tabs use, plus an in-client `teamRunId -> focusedMemberRouteKey` memory map used by Recent reopen. It does not own domain hydration.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `useMobileRunLaunchCoordinator.launchMobileRun(...)` | `agentRunConfigStore`, `teamRunConfigStore`, `agentContextsStore`, `agentTeamContextsStore`, `activeContextStore` | Mobile-specific launch sequence and result context construction | Runtime/model fallback selection or duplicated readiness policy |
| `activeContextStore.send()` | `agentRunStore` / `agentTeamRunStore` | Shared composer send facade | Mobile focus selection or launch config mutation |
| `MobileTeamMemberFocusBar.vue` | `useMobileTeamMemberFocusCoordinator` + `agentTeamContextsStore` | User-facing focus selector on applicable non-Runs team-run tabs | Domain team focus rules, Runs-tab launch setup, or hydration internals |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `selectedModelLabel = 'Existing desktop defaults'` in `MobileRunSetup.vue` | Mobile now shows real selected runtime/model state | Store-backed summary from `agentRunConfigStore` / `teamRunConfigStore` | In This Change | Existing tests expecting this copy must change. |
| Mobile launch coordinator hidden `resolveModel(...)` auto fallback | User-selected model must be preserved; hidden fallback hides required choices | `RuntimeModelConfigFields` + store readiness | In This Change | Definition defaults still work if present in store. |
| Mobile launch coordinator template reset during submit when matching draft already exists | Reset would erase mobile choices | `MobileRunSetup` target watchers initialize drafts; coordinator validates existing draft | In This Change | Coordinator may defensively initialize only when no matching draft exists. |
| Inline-only team runtime catalog watcher in `TeamRunConfigForm.vue` | Mobile needs same policy without duplication | `useTeamRunRuntimeCatalogSync` | In This Change | Desktop form calls the new composable. |

## Return Or Event Spine(s) (If Applicable)

- Launch return: `activeContextStore.send -> backend/stream promotes temporary run/team -> selectionStore selectedRunId -> coordinator returns MobileWorkContext -> MobileRuns emits launched -> MobileRemoteAccessShell opens Chat context`.
- Focus return: `MobileTeamMemberFocusBar selection -> domain focus updated -> mobile context route updated -> WorkShell header/subtitle and Chat/Files/Activity computed context update`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `useTeamRunRuntimeCatalogSync`
  - Chain: `config runtime/member override runtimes -> dedupe runtimeKinds -> loadRuntimeProviderGroupsForSelection(runtimeKind) -> teamRunConfigStore.setRuntimeModelCatalog(runtimeKind, modelIds)`
  - Why it matters: `teamRunConfigStore.launchReadiness` needs runtime model catalogs for both team default and member override runtimes; this must not be duplicated in desktop and mobile components.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Provider/model loading | DS-001, DS-002, DS-005 | Runtime/model fields and team readiness | Load grouped models for selected runtime | Controls need current model lists | Coordinator would hide model choice again |
| Workspace picker | DS-001, DS-002 | Launch config stores | Select existing workspace id | Launch needs workspace | Runtime/model card would become mixed concern |
| Member-tree flattening | DS-003, DS-004 | Focus pickers | Produce leaf member options and labels | Mobile needs touch-friendly member selection | Team store would learn presentation rules |
| Context attachments | DS-001, DS-002, DS-004 | `activeContextStore` / `mobileWorkStore` | Attach draft or active-run files to next send | Existing mobile file behavior must stay aligned with focused context | Launch/focus UI would own file state |
| Launch summary | DS-001, DS-002, DS-003 | Mobile user decision | Show target, workspace, runtime/model, first message target, context count, blocking issue | Prevents hidden choices | Summary would become source of truth instead of display |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Runtime/model editing | `RuntimeModelConfigFields.vue`, `useRuntimeScopedModelSelection` | Reuse | Already owns runtime/model/model-config semantics | N/A |
| Agent launch config | `agentRunConfigStore` | Reuse | Existing readiness and template defaults | N/A |
| Team launch config/readiness | `teamRunConfigStore` | Reuse | Existing mixed-runtime readiness owner | N/A |
| Team runtime catalog sync | Inline watcher in `TeamRunConfigForm.vue` | Extend/extract | Logic is existing but trapped in desktop component | New composable is needed for shared use |
| Team focus/hydration | `agentTeamContextsStore.focusMemberAndEnsureHydrated` | Reuse | Existing domain owner | N/A |
| Mobile context focus identity | `mobileWorkStore` | Extend | Store already owns current context; needs focus update action | N/A |
| Mobile focus presentation | none | Create New | No mobile focus selector exists | Desktop components own desktop layout modes/panels |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Mobile work shell | Mobile launch card, focus bar, mobile summary, focused Start new surface, searchable launch/focus pickers | DS-001..DS-004, DS-006, DS-009 | Mobile presentation | Extend | Stays in `components/mobile`. |
| Launch configuration | Agent/team config stores and runtime/model controls | DS-001, DS-002 | `agentRunConfigStore`, `teamRunConfigStore` | Reuse/Extend | Add mobile consumers; no new store. |
| Team runtime readiness support | Runtime catalog sync | DS-002, DS-005 | `teamRunConfigStore` | Create shared composable from existing logic | Prevents duplication. |
| Team context/focus | Focused member and hydration | DS-003, DS-004 | `agentTeamContextsStore` | Reuse | Mobile calls existing boundary. |
| Mobile context state | Current context + focused member route identity + current-client focus memory | DS-004, DS-008 | `mobileWorkStore` | Extend | Keeps mobile tabs and Recent reopen aligned. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `MobileRunSetup.vue` | Mobile work shell | Start-new form | Initialize selected target config, bind workspace/prompt, compute mobile launch readiness/summary, own mode-aware copy, call coordinator | Existing mobile form owner | Yes: launch stores |
| `MobileLaunchRuntimeModelCard.vue` | Mobile work shell / launch config | Mobile runtime/model presentation | Wrap `RuntimeModelConfigFields` for agent/team config with mobile copy/test hooks | Keeps card UI out of orchestration form | Yes: `RuntimeModelConfigFields` |
| `MobileTeamLaunchFocusPicker.vue` | Mobile work shell / team focus | Initial team member selector | Build/search leaf-member options from selected team definition and emit route key | Separate launch focus concern | Yes: team member utils/search picker shape |
| `MobileTeamMemberFocusBar.vue` | Mobile work shell / team focus | Existing-run focus selector | Show focused member and open picker only on applicable non-Runs team-run tabs | Reusable across Chat/Files/Activity | Yes: focus coordinator |
| `useMobileTeamMemberFocusCoordinator.ts` | Mobile focus coordination | Focus update coordinator | Read active team members, set focus through team store, update mobile context | Keeps component thin | Yes: team stores/utils |
| `useTeamRunRuntimeCatalogSync.ts` | Launch configuration | Shared team readiness support | Sync runtime model catalogs for team default and member overrides | Extracts duplicated policy | Yes: existing provider loading helper |
| `useMobileRunLaunchCoordinator.ts` | Mobile launch | Launch sequence | Validate existing config stores, apply initial focus, send prompt, return context | Existing launch owner | Yes: config stores/focus store |
| `mobileWorkStore.ts` | Mobile context state | Mobile context identity/focus memory | Add focused team member update plus per-team-run remember/get actions | Store already owns context | N/A |
| `MobileRuns.vue` | Mobile work shell | Runs/start-new surface owner | Hide or separate recent history while setup is open; restore list after cancel/launch | Existing Runs owner | `MobileRunSetup` |
| `MobileWorkShell.vue` | Mobile work shell | Work-tab frame | Render existing-run focus bar only outside Runs | Existing frame owner | `MobileTeamMemberFocusBar` |
| `MobileLaunchTargetPicker.vue` | Mobile work shell | Searchable grouped picker | Provide shared phone-friendly search/filter/select shape for launch target/member lists | Existing searchable target picker can be generalized | N/A |
| `useMobileWorkCatalog.ts` | Mobile catalog | Recent context mapper | Prefer remembered valid team focus when mapping Recent team-run contexts | Existing catalog mapper | `mobileWorkStore` focus memory |
| `MobileRemoteAccessShell.vue` | Mobile shell/session | Pairing and screen transition owner | Hold post-pair checking state until status/catalog refresh produces stable Home data | Existing shell owner | session/catalog stores |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Team runtime catalog synchronization | `autobyteus-web/composables/useTeamRunRuntimeCatalogSync.ts` | Launch configuration | Desktop and mobile team config need the same readiness catalog support | Yes | Yes | A generic provider service or UI component |
| Leaf member focus rows | `useMobileTeamMemberFocusCoordinator.ts` local computed rows or a mobile-only picker row builder | Mobile focus coordination | Launch focus picker and existing focus bar need similar leaf member display/search; keep mobile-specific | Yes | Yes | A second domain team member store |
| Team-run focus memory | `mobileWorkStore.ts` map keyed by team run id | Mobile context state | Launch, focus bar, and Recent catalog need one current-client remembered focus owner | Yes | Yes | Backend persistence or domain focus owner |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `MobileWorkContext.team-run.focusedMemberRouteKey` | Yes | Yes | Low after update action and focus memory | Treat as current mobile context target, synchronized from domain focus and Recent mapping. |
| `mobileWorkStore.focusedMemberRouteKeyByTeamRunId` | Yes | Yes | Low | Current-client memory only; key by `teamRunId`, value is the last explicit valid leaf route key. Validate against current run members before using. |
| `TeamRunConfig` / `MemberConfigOverride` | Yes | Yes | Low | Do not introduce mobile-specific runtime/model fields. |
| Runtime model catalogs | Yes | Yes | Low after extraction | One sync composable writes to existing `teamRunConfigStore.runtimeModelCatalogs`. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/mobile/MobileRunSetup.vue` | Mobile work shell | Start-new orchestrator | Target/workspace/prompt selection, config initialization, readiness summary, launch call, mode-aware copy, single authoritative blocker surface | Existing affected form | Launch stores, mobile runtime card, focus picker |
| `autobyteus-web/components/mobile/MobileLaunchRuntimeModelCard.vue` | Mobile launch config presentation | Runtime/model card | Render shared runtime/model fields in mobile card | Keeps UI concern separate | `RuntimeModelConfigFields` |
| `autobyteus-web/components/mobile/MobileTeamLaunchFocusPicker.vue` | Mobile launch focus | Initial focused member picker | Search/filter/select leaf route for first team prompt | Distinct from existing-run focus bar | Team member utils, mobile picker shape |
| `autobyteus-web/components/mobile/MobileTeamMemberFocusBar.vue` | Mobile focus presentation | Existing-run focus bar | Team focus selector for Chat/Files/Activity-equivalent surfaces, hidden on Runs | Distinct reusable mobile surface | Focus coordinator |
| `autobyteus-web/composables/mobile/useMobileTeamMemberFocusCoordinator.ts` | Mobile focus coordination | Focus coordinator | Member rows, active focused label, focus mutation and context sync | Keeps presentation thin | `agentTeamContextsStore`, `mobileWorkStore` |
| `autobyteus-web/composables/useTeamRunRuntimeCatalogSync.ts` | Launch config | Shared readiness support | Watch runtime kinds and sync model catalogs | Removes duplicate policy | `loadRuntimeProviderGroupsForSelection` |
| `autobyteus-web/composables/mobile/useMobileRunLaunchCoordinator.ts` | Mobile launch | Launch sequence | Consume validated store config, apply focus, send prompt, return context | Existing sequence owner | Config/focus stores |
| `autobyteus-web/stores/mobileWorkStore.ts` | Mobile state | Mobile context store/focus memory | Add `updateFocusedTeamMember(...)` plus remembered focus map/actions keyed by `teamRunId` | Existing context owner | N/A |
| `autobyteus-web/components/mobile/MobileLaunchSummary.vue` | Mobile summary | Display only | Show user-facing launch choices and one authoritative blocking issue when summary owns blocker display | Passive summary remains separate | Existing attachments |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Desktop launch config | Desktop team form | Replace inline catalog watcher with `useTeamRunRuntimeCatalogSync` | Same desktop behavior, shared policy | New composable |
| `autobyteus-web/components/mobile/MobileRuns.vue` | Mobile work shell | Runs/start-new owner | Render setup as a focused task and hide/separate recent history while open | Existing Runs owner | `MobileRunSetup` |
| `autobyteus-web/components/mobile/MobileWorkShell.vue` | Mobile work shell | Tab frame | Gate `MobileTeamMemberFocusBar` by active tab so Runs has no existing-run focus selector | Existing frame owner | `MobileTeamMemberFocusBar` |
| `autobyteus-web/components/mobile/MobileLaunchTargetPicker.vue` | Mobile work shell | Searchable picker | Provide reusable grouped search option pattern for agent/team/workspace and member launch choices | Existing target picker owner | N/A |
| `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts` | Mobile catalog | Recent context mapper | Apply remembered valid focus when building team-run Recent contexts | Existing catalog owner | `mobileWorkStore` |
| `autobyteus-web/components/mobile/MobileRemoteAccessShell.vue` | Mobile shell/session | Pairing transition owner | Maintain post-pair checking state and refresh status/catalog before stable Home | Existing shell owner | session/catalog stores |

## Ownership Boundaries

- Mobile components may initialize and present config state but must not own runtime/provider resolution policy.
- `agentRunConfigStore` and `teamRunConfigStore` remain the authoritative boundaries above launch config state.
- `useMobileRunLaunchCoordinator` must call into those boundaries and fail actionably if readiness is false; it must not bypass them by selecting a hidden model.
- `agentTeamContextsStore` remains the authoritative focus/hydration boundary. `mobileWorkStore` mirrors the selected route in mobile context identity and stores current-client focus memory for Recent reopen; it does not hydrate team members or persist focus to backend.
- `activeContextStore` remains the send facade; mobile focus must be set before calling it.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `agentRunConfigStore` | Agent config template/defaults/readiness | `MobileRunSetup`, coordinator | Local mobile runtime/model refs that are copied into launch late | Add store-backed UI bindings |
| `teamRunConfigStore` | Team config, member overrides, readiness, runtime catalogs | `MobileRunSetup`, coordinator, desktop `RunConfigPanel` | Separate mobile team readiness boolean | Extend shared sync/readiness support |
| `agentTeamContextsStore` | Focused member and hydration | Focus bar, coordinator, shell open path | Mobile-only focused member state not applied to team context | Add/use focus coordinator calling store API |
| `mobileWorkStore` | Current mobile context and current-client focus memory | Mobile focus coordinator, shell, work catalog | Mutating prop-only context without store update, or recomputing Recent focus from coordinator only | Add explicit update/remember/get focus actions |
| `useMobileWorkCatalog` | Recent work context mapping | Home, Runs, context switcher | Ignoring remembered focus while building team-run contexts | Validate remembered route against run members before fallback |
| `MobileWorkShell` | Cross-tab mobile frame | Work tabs | Showing existing-run focus controls on Runs/Start new | Gate focus bar by active tab/surface scope |
| `MobileRemoteAccessShell` | Mobile session/screen transition | Pairing and Home | Presenting stable Home before post-pair status/catalog refresh | Add post-pair checking state and stable render rule |
| `RuntimeModelConfigFields` | Field-level runtime/model/model-config semantics | Mobile runtime card, desktop forms | Reimplementing selectors in mobile | Add minimal presentation props/hooks if needed |

## Desktop/Web Non-Regression Contract

- Desktop application and normal desktop/web routes must not adopt mobile layout, mobile navigation, or mobile focus UI.
- Existing desktop `RunConfigPanel.vue`, `AgentRunConfigForm.vue`, `TeamRunConfigForm.vue`, `TeamWorkspaceView.vue`, and desktop running/team focus controls remain the user-facing desktop owners.
- The only designed desktop-touching change is extracting existing team runtime-catalog synchronization from `TeamRunConfigForm.vue` into `useTeamRunRuntimeCatalogSync`; desktop must call the extracted composable and behave identically.
- Implementation is not complete until focused desktop/web checks prove desktop launch configuration and team focus still work.

## Dependency Rules

Allowed:

- Mobile components may depend on mobile composables, launch config stores, team stores, and shared presentation components.
- `useMobileRunLaunchCoordinator` may depend on config stores, context stores, selection store, workspace store, and active context facade.
- `TeamRunConfigForm.vue` and mobile setup may both depend on `useTeamRunRuntimeCatalogSync`.

Forbidden:

- Mobile launch coordinator must not choose a model silently when the config store lacks one.
- Mobile launch UI must not create runtime/model fields outside `AgentRunConfig` / `TeamRunConfig`.
- Mobile focus UI must not send directly to WebSocket/team service; it sets focus, then uses existing send boundaries.
- Desktop forms must not import mobile components or mobile store assumptions.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `launchMobileRun(draft)` | Mobile launch request | Launch validated mobile draft and send first prompt | Agent: `{ kind, agentDefinitionId, workspaceId, prompt }`; Team: `{ kind, teamDefinitionId, workspaceId, prompt, focusedMemberRouteKey }` | Runtime/model comes from stores, not draft duplicates. |
| `useTeamRunRuntimeCatalogSync(configRef, options?)` | Team runtime catalog sync | Populate `teamRunConfigStore.runtimeModelCatalogs` | `Ref<TeamRunConfig | null | undefined>` | Replaces inline desktop watcher. |
| `mobileWorkStore.updateFocusedTeamMember(teamRunId, memberRouteKey)` | Mobile context identity | Update current context if it is the same team run and remember the focus for Recent reopen | Team run id + leaf member route key | No domain hydration here. |
| `mobileWorkStore.getRememberedFocusedTeamMember(teamRunId)` | Mobile focus memory | Return current-client remembered route key | Team run id | Caller validates against available members before use. |
| `agentTeamContextsStore.focusMemberAndEnsureHydrated(teamRunId, memberRouteKey)` | Team domain focus | Set focused member and hydrate if needed | Team run id + route key | Existing authoritative domain boundary. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `launchMobileRun` | Yes | Yes | Low | Keep runtime/model in config stores, not duplicated in draft. |
| `updateFocusedTeamMember` | Yes | Yes | Low | Validate same team id before current-context mutation; always store valid explicit route in memory after caller validation. |
| `getRememberedFocusedTeamMember` | Yes | Yes | Low | Read-only memory lookup; validity is checked by `useMobileWorkCatalog` against run members. |
| `focusMemberAndEnsureHydrated` | Yes | Yes | Low | Reuse; no change needed. |
| `useTeamRunRuntimeCatalogSync` | Yes | Yes | Low | Scope only to team config runtime catalogs. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Mobile runtime/model card | `MobileLaunchRuntimeModelCard` | Yes | Low | Avoid vague `AdvancedPanel`. |
| Existing-run focus selector | `MobileTeamMemberFocusBar` | Yes | Low | Name by team member focus concern; render only where scope applies. |
| Focus memory | `focusedMemberRouteKeyByTeamRunId` | Yes | Low | Name by exact identity shape, not generic preferences. |
| Focused setup state | `showRunSetup` / focused setup surface in `MobileRuns` | Yes | Low | Keep under Runs owner; avoid global modal state unless needed. |
| Focus coordinator | `useMobileTeamMemberFocusCoordinator` | Yes | Low | Keeps mobile-specific context sync explicit. |
| Catalog sync | `useTeamRunRuntimeCatalogSync` | Yes | Low | Name by team run catalog readiness concern. |

## Applied Patterns (If Any)

- Facade/coordinator: `useMobileRunLaunchCoordinator` remains a thin launch sequence owner, not a policy owner.
- Adapter/presentation wrapper: `MobileLaunchRuntimeModelCard` adapts existing shared fields into the mobile card layout.
- Shared composable extraction: `useTeamRunRuntimeCatalogSync` centralizes repeated readiness-support behavior.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/mobile` | Folder | Mobile work shell | Mobile launch/focus presentation | Existing mobile shell components live here | Desktop workspace shell behavior |
| `autobyteus-web/components/mobile/MobileRunSetup.vue` | File | Mobile start-new form | Store-backed start-new setup | Existing affected form | Hidden runtime/model fallback |
| `autobyteus-web/components/mobile/MobileLaunchRuntimeModelCard.vue` | File | Mobile launch config card | Mobile wrapper for shared runtime/model fields | Presentation concern | Provider loading policy beyond field use |
| `autobyteus-web/components/mobile/MobileTeamLaunchFocusPicker.vue` | File | Mobile team launch focus | Initial leaf member target selection | Mobile-only pre-launch concern | Team send implementation |
| `autobyteus-web/components/mobile/MobileTeamMemberFocusBar.vue` | File | Mobile team focus | Existing-run focus selector for applicable work tabs | Mobile shell cross-tab focus surface | Domain focus internals or Runs-tab launch setup |
| `autobyteus-web/composables/mobile/useMobileTeamMemberFocusCoordinator.ts` | File | Mobile focus coordination | Set focus and sync mobile context | Mobile-specific coordination | Runtime/model config |
| `autobyteus-web/composables/useTeamRunRuntimeCatalogSync.ts` | File | Launch config readiness support | Shared team catalog sync | Cross-desktop/mobile launch config concern | UI layout or launch submission |
| `autobyteus-web/stores/mobileWorkStore.ts` | File | Mobile context store | Add focus update and current-client focus memory | Existing current-context owner | Domain hydration or backend persistence |
| `autobyteus-web/composables/mobile/useMobileRunLaunchCoordinator.ts` | File | Mobile launch sequence | Launch validated config and first send, remember initial team focus | Existing launch coordinator | Model fallback policy |
| `autobyteus-web/components/mobile/MobileRuns.vue` | File | Runs/start-new surface | Focused setup state and recent-history separation | Existing Runs owner | Existing-run focus controls |
| `autobyteus-web/components/mobile/MobileWorkShell.vue` | File | Mobile frame | Active-tab-scoped focus bar rendering | Existing shell owner | Launch setup state internals |
| `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts` | File | Work catalog | Recent team-run focus memory application | Existing catalog owner | Domain hydration |
| `autobyteus-web/components/mobile/MobileRemoteAccessShell.vue` | File | Mobile shell/session | Post-pair checking and stable Home transition | Existing session owner | Pairing exchange internals |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/mobile` | Mixed Justified | Yes | Low | Mobile presentation components are colocated by shell feature. |
| `composables/mobile` | Off-Spine Concern / Mobile coordination | Yes | Low | Mobile-specific coordination belongs here. |
| `composables/useTeamRunRuntimeCatalogSync.ts` | Off-Spine Concern / launch config | Yes | Low | Shared between desktop and mobile; not mobile-specific. |
| `stores` | Main-Line Domain-Control | Yes | Low | Existing Pinia stores remain authoritative. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Runtime/model source of truth | `MobileRunSetup -> agentRunConfigStore.config.runtimeKind -> RuntimeModelConfigFields -> launchMobileRun validates store` | `MobileRunSetup localRuntime ref -> coordinator setTemplate -> coordinator pick first model` | Preserves user choice and shared readiness. |
| Team focus update | `FocusBar -> focusMemberAndEnsureHydrated(teamRunId, routeKey) -> mobileWorkStore.updateFocusedTeamMember(...)` | `FocusBar stores local selectedMember only and send uses old activeTeam.focusedMemberRouteKey` | Prevents UI/send target drift. |
| Focus bar scope | `MobileWorkShell activeTab !== 'runs' -> MobileTeamMemberFocusBar` | `MobileWorkShell always renders focus bar for team runs` | Prevents duplicate selectors while Start new is open. |
| Recent focus memory | `mobileWorkStore remembered focus -> useMobileWorkCatalog validates against run.members -> Recent context focusedMemberRouteKey` | `Recent context always uses coordinator/default` | Preserves the user's explicit mobile focus. |
| Post-pair refresh | `paired -> postPairChecking -> checkStatus + refresh catalogs -> Home` | `paired -> Home Unknown until manual Refresh` | Makes pairing completion trustworthy. |
| Team readiness catalog sync | `TeamRunConfigForm and MobileRunSetup both call useTeamRunRuntimeCatalogSync(configRef)` | Copy the inline watcher into mobile setup | Avoids duplicated policy. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `Existing desktop defaults` as a fallback label when no model is selected | It was prior MVP copy | Rejected | Show actual selected/default runtime/model or actionable `Choose model`. |
| Keep coordinator auto-selecting first known model | Convenient launch without user choice | Rejected | Require store readiness; user selects or confirms definition default. |
| Add mobile-only runtime/model fields to launch draft | Quick implementation | Rejected | Use existing `AgentRunConfig` / `TeamRunConfig` stores. |
| Import full desktop `RunConfigPanel` into mobile | Faster UI parity | Rejected | Mobile wrapper around shared field components keeps phone-first shell. |
| Keep existing-run focus bar on Runs as a global team-run control | It is technically current context state | Rejected | Hide on Runs; Start new owns first-message target while setup is open. |
| Persist focused member to backend in this ticket | Would make focus durable across devices/reloads | Rejected for this scope | Use current-client focus memory; backend persistence can be future product work. |

## Derived Layering (If Useful)

- Presentation: mobile Vue components and summary cards.
- Frontend domain state: Pinia launch config and team context stores.
- Coordination: mobile launch/focus composables.
- Transport/runtime: existing agent/team run stores and streaming services; unchanged.

## Migration / Refactor Sequence

1. Add `useTeamRunRuntimeCatalogSync` by moving the watcher logic from `TeamRunConfigForm.vue` into a shared composable.
2. Update `TeamRunConfigForm.vue` to call the new composable and keep desktop behavior unchanged.
3. Extend `mobileWorkStore.ts` with `updateFocusedTeamMember(teamRunId, memberRouteKey)`.
4. Add `useMobileTeamMemberFocusCoordinator.ts` and `MobileTeamMemberFocusBar.vue`; render the bar from `MobileWorkShell.vue` for active `team-run` contexts.
5. Add `MobileLaunchRuntimeModelCard.vue` and `MobileTeamLaunchFocusPicker.vue`.
6. Rewrite `MobileRunSetup.vue` to:
   - initialize `agentRunConfigStore`/`teamRunConfigStore` when target/mode changes;
   - update selected workspace into the active config store;
   - render runtime/model controls after target selection;
   - sync team runtime catalogs;
   - compute readiness from store readiness plus prompt/target;
   - pass selected team focus route to the coordinator.
7. Rewrite `useMobileRunLaunchCoordinator.ts` to validate existing config store state, avoid hidden model fallback, apply selected team focus before first send, and return `MobileWorkContext` with the actual focused route.
8. Update `MobileLaunchSummary.vue` props/display for real runtime/model, initial focused member, and first blocking issue.
9. Update mobile tests that currently expect simplified default copy; add tests for runtime/model selection, launch disablement, focus selection, and no desktop regression.
10. Gate `MobileTeamMemberFocusBar` rendering by active tab/surface scope so it does not render on Runs or while Start new is active.
11. Change `MobileRuns.vue` so `showRunSetup` presents a focused setup surface and hides or clearly separates the recent-runs list until cancel/launch.
12. Replace desktop/store/internal copy in `MobileRunSetup.vue`, `MobileLaunchRuntimeModelCard.vue`, and `MobileLaunchSummary.vue`; make setup helper copy branch by Agent vs Team mode.
13. Remove duplicated blocker rendering: choose one owner for launch-blocking issue display, preferably the summary/action area, while field cards keep only field-local helper text.
14. Generalize or reuse the searchable grouped picker for `MobileTeamLaunchFocusPicker` and any long launch/focus lists.
15. Extend `mobileWorkStore` with a per-team-run focus memory map; have focus coordinator and launch coordinator remember valid explicit focus.
16. Update `useMobileWorkCatalog` to prefer remembered valid focus when building Recent team-run contexts and to fall back to coordinator/default only when memory is absent or invalid.
17. Add a post-pair checking state in `MobileRemoteAccessShell` so Home renders stable status/catalog data after pairing without a manual Refresh.

## Key Tradeoffs

- Reusing `RuntimeModelConfigFields` gives consistent behavior but may need minor mobile spacing/test-hook adjustments; this is preferable to duplicating selector logic.
- Restricting mobile focus to leaf members avoids adding a separate subteam composer path in this ticket. It satisfies the reported individual-member message need and preserves existing send boundaries.
- Extracting catalog sync adds one small shared composable but removes a concrete duplicated-policy risk.

## Risks

- Test setup currently lacks `vitest`; downstream validation must ensure dependencies are available.
- The shared `SearchableGroupedSelect` or custom mobile picker may need touch-target tuning after visual/browser validation.
- Nested team definitions need careful default focus selection to avoid non-leaf route keys for direct sends.
- Existing mobile tests that encoded prior MVP simplification must be intentionally updated, not preserved.
- Current-client focus memory intentionally does not solve cross-device/backend durable focus persistence; if product later requires that, add a backend/history contract in a separate ticket.

## Guidance For Implementation

- Do not implement a second runtime/model state shape for mobile.
- Treat definition defaults as normal initial config values in the stores; users can keep them or change them.
- Do not silently choose the first available model if the selected agent/team has no model configured.
- Keep desktop form behavior unchanged while extracting `useTeamRunRuntimeCatalogSync`.
- Keep all UX rework mobile-scoped; do not add mobile focus bars or setup layout changes to desktop/web routes.
- When selecting/launching/focusing a team member, remember the selected route in `mobileWorkStore` after validating it is a focusable leaf.
- Recent work mapping must validate remembered focus against `run.members` before using it.
- Pairing success should show a transient checking/loading state rather than a stable `Unknown` Home state.
- Prefer focused unit/component tests around store-backed readiness and focus synchronization before browser validation.
- Recommended focused validation suites after dependencies are available:
  - `components/mobile/__tests__/MobileUxRefinement.spec.ts`
  - `components/mobile/__tests__/MobileContextSelectionRegression.spec.ts`
  - `components/mobile/__tests__/MobileRemoteAccessShell.spec.ts`
  - new/updated mobile launch/focus/focus-memory tests
  - `components/workspace/config/__tests__/TeamRunConfigForm.spec.ts`
  - `components/workspace/config/__tests__/RunConfigPanel.spec.ts`
  - `components/workspace/team/__tests__/TeamWorkspaceView.spec.ts`
