# Design Spec

## Current-State Read

The active frontend package is `autobyteus-web`. The affected visible surface is the team workspace center pane shown by `components/workspace/team/TeamWorkspaceView.vue`.

Current state:

- `TeamWorkspaceView.vue` is the team workspace shell. It renders the header, focused-member title/status/avatar, team task execution bar, and center-pane content.
- The header currently renders `TeamWorkspaceModeSwitch.vue`, a dedicated segmented control with hard-coded `Focus`, `Grid`, and `Spotlight` options.
- `TeamWorkspaceView.vue` computes `currentMode` from `stores/teamWorkspaceViewStore.ts` and branches:
  - `focus` -> `AgentTeamEventMonitor.vue`
  - `grid` -> `TeamGridView.vue`
  - otherwise -> `TeamSpotlightView.vue`
- `TeamGridView.vue` and `TeamSpotlightView.vue` render multi-member layouts through `TeamMemberMonitorTile.vue`.
- `teamWorkspaceViewStore.ts` exists only to hold in-memory per-team view-mode state and migrate that state from temporary to permanent team-run ids.
- `agentTeamContextsStore.ts` has two mode-specific couplings that become obsolete in a focus-only product:
  - `useTeamWorkspaceViewStore().migrateMode(...)` during temp-to-permanent team run promotion.
  - `ensureHistoricalMembersHydratedForView(teamRunId, mode)` to bulk-hydrate all members when entering grid/spotlight.
- `AgentTeamEventMonitor.vue` is the focus-mode monitor that should remain. It renders the selected focused member through `AgentEventMonitor`, and renders a subteam detail card when the focused node is a subteam.
- `TeamWorkspaceView.vue` has a separate bottom composer path that currently appears for non-focus modes or when the focused node is a subteam. After mode removal, that path must remain only for the subteam-focused case.
- `TeamMemberMonitorTile.vue` has no active production caller outside `TeamGridView.vue` and `TeamSpotlightView.vue`, but `AgentTeamEventMonitor.vue` currently reuses one `TeamMemberMonitorTile.no_activity_yet` localization key. That key must be moved before deleting tile localization.
- Active docs mention `Focus/Grid/Spotlight`; active tests assert mode storage/switching/grid/spotlight/tile behavior.

Constraints:

- The user explicitly approved a clean removal and asked to keep the code clean after removing the functionality.
- No durable localStorage/server persistence for team view mode was found; no state migration is needed.
- Historical ticket artifacts under `autobyteus-web/tickets/done/**` are archival and should not be rewritten as current product docs.

## Intended Change

Make the team workspace focus-only:

- Remove the user-facing view-mode control.
- Remove grid/spotlight components, compact tile component, view-mode store, mode types, mode-specific hydration action, and mode-specific tests/docs/localization.
- Keep the detailed focused-member monitor (`AgentTeamEventMonitor`) as the only team center-pane rendering path.
- Preserve existing focused-member selection and focused-member hydration behavior.
- Preserve the subteam-focused shared composer path.
- Reject hidden compatibility paths: no dormant mode store, no hidden feature flag, no default-to-focus wrapper that still accepts grid/spotlight.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: Investigation found a dedicated mode store, switch component, grid/spotlight layout components, compact tile component, all-members hydration path, tests, localization, and docs that exist to preserve the now-unwanted modes.
- Design response: Perform a clean-cut removal and let the existing focus monitor become the only active team center-pane owner.
- Refactor rationale: Hiding the segmented control but retaining dormant mode state/components would keep dead behavior, stale tests, and misleading docs. Removal is the simplification goal.
- Intentional deferrals and residual risk, if any: No architectural deferral. Full browser visual validation is downstream API/E2E responsibility after implementation because the change is visible in the header.

## Terminology

- `Focus-only team workspace`: the target team workspace with one detailed focused-member center pane and no selectable layout modes.
- `Roster/history visual focus`: the selected team member route key used for display and right-side member-scoped surfaces.
- `User-message target focus`: the target resolved by `resolveTeamUserMessageTarget(...)` for text send/composer behavior.
- `Subteam-focused composer`: the separate bottom composer required when the focused node is a subteam and there is no leaf agent `AgentEventMonitor` composer in the center pane.

## Design Reading Order

Read this design from:

1. team workspace display spine,
2. focus selection/hydration spine,
3. removal/decommission plan,
4. file/test/docs/localization mapping.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: delete obsolete grid/spotlight mode files and state rather than hiding them.
- Treat removal as first-class design work: obsolete mode store, components, tests, docs, and localization are in scope.
- Decision rule: implementation fails the design if active source still accepts or branches on `grid` / `spotlight` team workspace modes after the cleanup.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User opens/selects a team run | Focused-member monitor rendered | `TeamWorkspaceView.vue` | Main visible behavior after mode removal |
| DS-002 | Primary End-to-End | User changes focused member from remaining focus entrypoints | Selected member is hydrated and rendered in focus pane | `agentTeamContextsStore.ts` | Preserves real team focus behavior while removing layout modes |
| DS-003 | Return-Event | `focusedMemberRouteKey` changes in team context | Header, monitor, composer target, and right-side member-scoped surfaces update reactively | `agentTeamContextsStore.ts` + Vue reactivity | Verifies removal does not break focus propagation |

## Primary Execution Spine(s)

- DS-001: `Team run selection -> TeamWorkspaceView -> AgentTeamEventMonitor -> AgentEventMonitor / subteam focus card -> Focused team workspace`
- DS-002: `Focus entrypoint -> TeamWorkspaceView.setFocusedMember / AgentTeamEventMonitor.focusMemberRouteKey -> agentTeamContextsStore.focusMemberAndEnsureHydrated -> teamRunContextHydrationService.ensureHistoricalTeamMemberHydrated -> AgentTeamEventMonitor re-render`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | When a team is active, the shell renders exactly one center pane: the detailed focus monitor. There is no mode lookup and no layout branch. | `TeamWorkspaceView`, `AgentTeamEventMonitor`, `AgentEventMonitor` | `TeamWorkspaceView.vue` for shell composition; `AgentTeamEventMonitor.vue` for focus monitor content | Header actions, self-evolution CTA, localization |
| DS-002 | Remaining focus controls send a member route key to the team context store, which updates focus and hydrates that member if needed. | focus entrypoint, `agentTeamContextsStore`, hydration service, focus monitor | `agentTeamContextsStore.ts` | Historical single-member hydration, route-key validation |
| DS-003 | After focus state changes, Vue computed state updates header title/status/avatar, focused monitor data, composer target, and related right-side surfaces. | team context state, computed display state | `agentTeamContextsStore.ts` | Presentation composable, user-message target resolver |

## Spine Actors / Main-Line Nodes

- `TeamWorkspaceView.vue`
- `AgentTeamEventMonitor.vue`
- `AgentEventMonitor.vue`
- `agentTeamContextsStore.ts`
- `teamRunContextHydrationService.ensureHistoricalTeamMemberHydrated(...)`

## Ownership Map

| Node | Owns |
| --- | --- |
| `TeamWorkspaceView.vue` | Team workspace shell composition: header, task bar, one focus monitor, subteam-focused composer placement, header actions. It must not own layout mode state after this change. |
| `AgentTeamEventMonitor.vue` | Detailed focused-member monitor and subteam focus card. It is the only active center-pane team monitor. |
| `AgentEventMonitor.vue` | Detailed single agent conversation monitor and its normal composer for leaf focused members. |
| `agentTeamContextsStore.ts` | Active team contexts, focused-member route key, focused-member mutation, and focused member historical hydration. It must not own or import UI view-mode state. |
| `teamRunContextHydrationService` | Historical team member projection hydration. It remains focused-member based for this scope. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TeamActiveTaskExecutionsBar @select-member` / subteam child buttons | `agentTeamContextsStore.focusMemberAndEnsureHydrated(...)` | UI event entrypoints into focus selection | Mode selection, all-member hydration, message send policy |
| `WorkspaceHeaderActions` in `TeamWorkspaceView.vue` | Existing config/run stores | Header action convenience | Team layout modes |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `components/workspace/team/TeamWorkspaceModeSwitch.vue` | No selectable modes remain | No replacement; focus is implicit | In This Change | Remove import/render/tests |
| `components/workspace/team/TeamGridView.vue` | Grid mode removed | `AgentTeamEventMonitor.vue` focus pane | In This Change | Delete file and spec |
| `components/workspace/team/TeamSpotlightView.vue` | Spotlight mode removed | `AgentTeamEventMonitor.vue` focus pane | In This Change | Delete file and spec |
| `components/workspace/team/TeamMemberMonitorTile.vue` | Compact multi-member tile only served grid/spotlight | No replacement; detailed focus monitor remains | In This Change | Move remaining empty-state localization first |
| `stores/teamWorkspaceViewStore.ts` | Per-team mode state obsolete | No replacement | In This Change | Delete store and spec |
| `TeamWorkspaceViewMode` type | Only represented obsolete modes | No replacement | In This Change | Remove imports/types |
| `TeamWorkspaceView.currentMode`, `setCurrentMode`, mode watcher | No mode branch remains | Direct focus rendering | In This Change | Watcher removal also removes bulk hydrate trigger |
| `agentTeamContextsStore` mode migration | No mode state remains | No replacement | In This Change | Remove `useTeamWorkspaceViewStore().migrateMode(...)` |
| `agentTeamContextsStore.ensureHistoricalMembersHydratedForView(...)` | Only grid/spotlight needed all-member preload | `focusMemberAndEnsureHydrated(...)` remains | In This Change | Remove tests/stubs/callers |
| Mode-specific tests | They assert deleted behavior | Focus-only tests | In This Change | Delete or rewrite as listed below |
| Tile-specific localization keys | Tile component deleted | Active monitor namespace for surviving empty state | In This Change | Update source/generated catalogs consistently |
| Active docs advertising grid/spotlight | Product modes removed | Focus-only docs language | In This Change | Do not edit archival tickets |

## Return Or Event Spine(s) (If Applicable)

DS-003 return/event spine:

`agentTeamContextsStore.focusedMemberRouteKey update -> TeamWorkspaceView computed header fields -> AgentTeamEventMonitor focused route/member computed -> UI re-render`

This remains unchanged except that no grid/spotlight tile highlight or mode-specific layout reacts to the focus update.

## Bounded Local / Internal Spines (If Applicable)

None. No event loop, worker loop, state machine, or dispatch cycle is introduced or changed by this cleanup.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization catalogs | DS-001 | `AgentTeamEventMonitor` / workspace UI | Keep visible strings in active component namespaces | Prevent stale deleted-component keys | Stale deleted-component strings hide dead code |
| Active documentation | DS-001, DS-002 | Product/current behavior readers | Describe focus-only team workspace | Prevent docs from advertising removed modes | Engineers may reintroduce mode assumptions |
| Frontend tests | DS-001, DS-002, DS-003 | Component/store owners | Protect focus-only behavior and removal | Avoid stale tests that preserve removed paths | Tests become compatibility pressure |
| Font-size audit targeted file list | DS-001 | UI audit suite | Remove deleted tile file from targeted audit list | Prevent test failure after deletion | Audit points to nonexistent source |
| Static dead-code search | DS-001 | Implementation/review | Verify active mode artifacts are gone | Ensures cleanup is complete | Hidden dormant paths remain |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Focus-only team center pane | Existing `AgentTeamEventMonitor.vue` | Reuse | It is already the focus-mode owner | N/A |
| Focus state mutation/hydration | Existing `agentTeamContextsStore.ts` + hydration service | Reuse | Correct owner already exists for focused-member state | N/A |
| Header actions | Existing `WorkspaceHeaderActions.vue` | Reuse | Not part of removed modes | N/A |
| Localization | Existing localization message files and generated catalogs | Reuse/Update | Established system already owns strings | N/A |
| Tests | Existing Vitest suites | Reuse/Update | Keep focus coverage; delete obsolete suites | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Team workspace components | Shell and focus monitor | DS-001 | `TeamWorkspaceView`, `AgentTeamEventMonitor` | Reuse/Modify | Remove mode branch files |
| Team context store | Focus state and member hydration | DS-002, DS-003 | `agentTeamContextsStore` | Reuse/Modify | Remove UI-mode coupling |
| Localization | User-visible team strings | DS-001 | Components | Reuse/Modify | Move empty-state key |
| Docs | Current product behavior docs | DS-001, DS-002 | Readers/maintainers | Reuse/Modify | Replace grid/spotlight references |
| Test suite | Regression coverage | All | Owners above | Reuse/Modify | Delete stale suites, update focus tests |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `TeamWorkspaceView.vue` | Team workspace components | Team workspace shell | Header, task bar, focus monitor placement, subteam composer | Existing shell remains correct once mode branch removed | Uses existing stores/composables |
| `AgentTeamEventMonitor.vue` | Team workspace components | Focus monitor | Focused member detailed monitor / subteam card | Existing focus owner remains correct | Uses `AgentEventMonitor` |
| `agentTeamContextsStore.ts` | Team context store | Team context/focus owner | Focus route mutation and focused-member hydration | Existing store already owns focus state | Uses hydration service |
| `workspace.ts` localization files | Localization | Workspace message catalogs | Active monitor strings only | Existing catalog organization | N/A |
| active docs files | Docs | Current behavior docs | Focus-only language | Existing docs remain current | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| None introduced | N/A | N/A | No new repeated structure is required | N/A | N/A | A replacement mode abstraction |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamWorkspaceViewMode` | No longer needed | Yes, remove | High if retained | Delete type/store |
| `modeByTeamRunId` | No longer needed | Yes, remove | High if retained | Delete state and migration |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | Team workspace components | Team workspace shell | Active team header, task execution bar, focus monitor placement, subteam composer, header actions | Single shell for team workspace composition | Existing stores/composables |
| `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue` | Team workspace components | Focus monitor | Focused leaf member detailed monitor and subteam focus card | Existing focus mode owner | `AgentEventMonitor`, team context store |
| `autobyteus-web/stores/agentTeamContextsStore.ts` | Team context store | Team focus/hydration owner | Team contexts, focused route, focused member hydration | Existing store owns this state | Hydration service |
| `autobyteus-web/localization/messages/en/workspace.ts` and `zh-CN/workspace.ts` plus generated catalogs | Localization | Workspace copy | Active focus monitor empty-state copy | Existing localization boundary | N/A |
| `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md`, `autobyteus-web/docs/agent_teams.md` | Docs | Current product docs | Focus-only language | Existing docs | N/A |

## Ownership Boundaries

- `TeamWorkspaceView.vue` owns the shell, not selectable layout policy. After this change it must not import `teamWorkspaceViewStore`, `TeamWorkspaceViewMode`, `TeamGridView`, `TeamSpotlightView`, or `TeamWorkspaceModeSwitch`.
- `AgentTeamEventMonitor.vue` owns the focus monitor content and must not know about removed team view modes.
- `agentTeamContextsStore.ts` owns team focus state and focused-member hydration. It must not depend on UI layout modes.
- Historical hydration must remain focused-member based via `focusMemberAndEnsureHydrated(...)`; no all-member preload should remain for removed modes.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TeamWorkspaceView.vue` focus-only shell | `AgentTeamEventMonitor`, subteam composer placement | Team workspace route/layout | Calling mode store or mode components from shell | Extend focus shell behavior directly, not by restoring modes |
| `agentTeamContextsStore.focusMemberAndEnsureHydrated(...)` | focus route mutation + focused member hydration | focus entrypoints | UI components calling bulk all-member hydration for layout reasons | Add explicit focused-member API only if needed |
| `AgentTeamEventMonitor.vue` | focused member/subteam monitor rendering | `TeamWorkspaceView.vue` | Rendering compact grid/spotlight tiles inside focus monitor | Keep detailed focus monitor; create no replacement mode |

## Dependency Rules

Allowed:

- `TeamWorkspaceView.vue` may depend on `agentTeamContextsStore`, run/config stores, `AgentTeamEventMonitor`, `TeamActiveTaskExecutionsBar`, `WorkspaceHeaderActions`, `resolveTeamUserMessageTarget`, and presentation composables.
- `AgentTeamEventMonitor.vue` may depend on `agentTeamContextsStore`, `AgentEventMonitor`, presentation composables, and active focus utilities.
- `agentTeamContextsStore.ts` may depend on focused-member hydration service.

Forbidden:

- No active source dependency on `teamWorkspaceViewStore` or `TeamWorkspaceViewMode`.
- No active source dependency on `TeamGridView`, `TeamSpotlightView`, `TeamWorkspaceModeSwitch`, or `TeamMemberMonitorTile`.
- No `grid` / `spotlight` team workspace mode branch, hidden enum variant, or accepted mode value.
- No compatibility feature flag that can re-enable grid/spotlight.
- Do not remove unrelated CSS/grid layout usages elsewhere in the app; only remove team workspace view-mode semantics.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `agentTeamContextsStore.focusMemberAndEnsureHydrated(teamRunId, memberRouteKey)` | Team focused member | Select and hydrate one focused member | `teamRunId + memberRouteKey` | Keep |
| `agentTeamContextsStore.setFocusedMember(memberRouteKey)` | Active team focused member | Local focus update for active team | `memberRouteKey` under active team | Keep |
| `teamWorkspaceViewStore.getMode/setMode/migrateMode/clearMode` | Obsolete team view mode | Former mode state | `teamRunId + mode` | Remove |
| `agentTeamContextsStore.ensureHistoricalMembersHydratedForView(teamRunId, mode)` | Obsolete broader-mode hydration | Former all-member preload | `teamRunId + mode` | Remove |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `focusMemberAndEnsureHydrated` | Yes | Yes | Low | Keep |
| `ensureHistoricalMembersHydratedForView` | No longer needed | Mode identity obsolete | High if retained | Delete |
| `teamWorkspaceViewStore` methods | No longer needed | Mode identity obsolete | High if retained | Delete |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Team workspace shell | `TeamWorkspaceView` | Yes | Low | Keep |
| Focus monitor | `AgentTeamEventMonitor` | Yes | Low | Keep |
| Mode switch | `TeamWorkspaceModeSwitch` | Obsolete | High if retained | Delete |
| Compact tile | `TeamMemberMonitorTile` | Obsolete | High if retained | Delete |
| Mode store | `teamWorkspaceViewStore` | Obsolete | High if retained | Delete |

## Applied Patterns (If Any)

- Clean-cut removal / decommissioning: used to eliminate obsolete layout modes and their state instead of preserving a compatibility layer.
- Existing store boundary reuse: focused-member state remains in `agentTeamContextsStore`; no new state owner is introduced.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | File | Team workspace shell | Modify to focus-only shell | Existing shell owner | Mode switch/imports/branches |
| `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue` | File | Focus monitor | Modify empty-state localization key only | Existing focus owner | Grid/spotlight/tile dependencies |
| `autobyteus-web/components/workspace/team/TeamWorkspaceModeSwitch.vue` | File | Obsolete | Delete | Mode controls removed | N/A |
| `autobyteus-web/components/workspace/team/TeamGridView.vue` | File | Obsolete | Delete | Grid removed | N/A |
| `autobyteus-web/components/workspace/team/TeamSpotlightView.vue` | File | Obsolete | Delete | Spotlight removed | N/A |
| `autobyteus-web/components/workspace/team/TeamMemberMonitorTile.vue` | File | Obsolete | Delete | Compact multi-member tile removed | N/A |
| `autobyteus-web/stores/teamWorkspaceViewStore.ts` | File | Obsolete | Delete | Mode state removed | N/A |
| `autobyteus-web/stores/agentTeamContextsStore.ts` | File | Team focus/hydration owner | Remove mode-store import/call and broader-mode hydration action | Store still owns focus | UI layout mode coupling |
| `autobyteus-web/components/workspace/team/__tests__/TeamWorkspaceView.spec.ts` | File | Team shell tests | Update to focus-only assertions | Existing shell coverage | Mode switch/grid/spotlight mocks |
| `autobyteus-web/components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts` | File | Focus monitor tests | Update empty-state key expectation if needed | Existing focus coverage | Deleted tile namespace |
| `autobyteus-web/components/workspace/team/__tests__/TeamGridView.spec.ts` | File | Obsolete tests | Delete | Grid removed | N/A |
| `autobyteus-web/components/workspace/team/__tests__/TeamSpotlightView.spec.ts` | File | Obsolete tests | Delete | Spotlight removed | N/A |
| `autobyteus-web/components/workspace/team/__tests__/TeamMemberMonitorTile.spec.ts` | File | Obsolete tests | Delete | Tile removed | N/A |
| `autobyteus-web/stores/__tests__/teamWorkspaceViewStore.spec.ts` | File | Obsolete tests | Delete | Mode store removed | N/A |
| `autobyteus-web/stores/__tests__/agentTeamContextsStore.spec.ts` | File | Store tests | Remove broader-mode hydration test/imports; keep focused hydration tests | Store remains | Mode store dependency |
| `autobyteus-web/components/workspace/history/__tests__/HistoricalTeamLazyHydration.integration.spec.ts` | File | Historical hydration integration | Remove mode-switch stubs and broader-mode test; keep focused lazy hydration coverage | Integration remains | Grid/spotlight stubs |
| `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` | File | Run history tests | Remove stale `ensureHistoricalMembersHydratedForView` mock property if unused | Avoid mock-only contract | Removed action |
| `autobyteus-web/tests/integration/app-font-size-fixed-px-audit.integration.test.ts` | File | UI audit | Remove deleted `TeamMemberMonitorTile.vue` from targeted list | Prevent nonexistent target | Deleted file path |
| `autobyteus-web/localization/messages/**/workspace.ts` and generated catalogs | Files | Localization | Move/remove deleted-component strings | Keep catalogs consistent | `TeamMemberMonitorTile.*` keys after component deletion |
| `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md`, `autobyteus-web/docs/agent_teams.md` | Files | Docs | Update focus-only language | Active docs must match product | Focus/Grid/Spotlight product claims |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `components/workspace/team` | Mixed justified UI component area | Yes after removal | Low | Existing folder is acceptable; removal reduces mode-specific clutter |
| `stores` | State owners | Yes after removal | Low | Removing UI mode store clarifies state ownership |
| `localization/messages` | Off-spine concern | Yes | Low | Keep active strings only |
| `docs` | Off-spine concern | Yes | Low | Update current docs; leave archival tickets |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Focus-only shell | `TeamWorkspaceView -> AgentTeamEventMonitor` with no mode computed | `TeamWorkspaceView -> teamWorkspaceViewStore.getMode() -> if focus else hidden grid/spotlight` | Prevents hidden compatibility paths |
| Subteam composer | `showSharedComposer` is true only for a valid subteam-focused target that is not a task instance | Keep `currentMode !== 'focus'` condition after deleting modes | Preserves useful focus behavior without stale mode logic |
| Static cleanup | Active source has no `TeamGridView`, `TeamSpotlightView`, `TeamWorkspaceModeSwitch`, `teamWorkspaceViewStore` references | Delete UI control only | Ensures the codebase is actually simplified |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Hide mode switch but keep mode store and components | Lower-risk UI-only change | Rejected | Delete store/components/tests/docs because user requested codebase simplification |
| Keep `TeamWorkspaceViewMode = 'focus' | 'grid' | 'spotlight'` but force `focus` | Could avoid type/test churn | Rejected | Remove type and callers |
| Keep `ensureHistoricalMembersHydratedForView` unused | Could avoid store-test updates | Rejected | Delete action and stale mocks |
| Feature flag for grid/spotlight | Could re-enable modes later | Rejected | No hidden mode resurrection path |
| LocalStorage/server migration for old mode state | Might be needed if persisted | N/A | Investigation found no durable view-mode persistence |

## Derived Layering (If Useful)

UI shell (`TeamWorkspaceView`) -> focus monitor (`AgentTeamEventMonitor`) -> shared agent monitor (`AgentEventMonitor`) / team focus state (`agentTeamContextsStore`) -> focused-member hydration service.

This layering is explanatory only; ownership remains defined by the spine and boundaries above.

## Migration / Refactor Sequence

1. Move surviving empty-state copy:
   - Change `AgentTeamEventMonitor.vue` to use an active key such as `workspace.components.workspace.team.AgentTeamEventMonitor.no_activity_yet`.
   - Add/update en and zh-CN source/generated localization catalogs as required by project tooling.
2. Simplify `TeamWorkspaceView.vue`:
   - Remove `TeamWorkspaceModeSwitch` render/import.
   - Remove `TeamGridView` / `TeamSpotlightView` render/import.
   - Remove `useTeamWorkspaceViewStore`, `TeamWorkspaceViewMode`, `currentMode`, and `setCurrentMode`.
   - Render `AgentTeamEventMonitor` directly when `activeTeamContext` exists.
   - Remove mode watcher that calls `ensureHistoricalMembersHydratedForView`.
   - Change `showSharedComposer` so it preserves only the subteam-focused case and task-instance exclusions.
3. Simplify `agentTeamContextsStore.ts`:
   - Remove `useTeamWorkspaceViewStore` and `TeamWorkspaceViewMode` import.
   - Remove `useTeamWorkspaceViewStore().migrateMode(...)` from `promoteTemporaryTeamRunId`.
   - Remove `ensureHistoricalMembersHydratedForView(...)` and the now-unused `ensureHistoricalTeamMembersHydrated` import.
4. Delete obsolete source files:
   - `TeamWorkspaceModeSwitch.vue`
   - `TeamGridView.vue`
   - `TeamSpotlightView.vue`
   - `TeamMemberMonitorTile.vue`
   - `teamWorkspaceViewStore.ts`
5. Delete or rewrite tests:
   - Delete obsolete component/store specs for removed files.
   - Update `TeamWorkspaceView.spec.ts` to assert focus-only rendering, absence of mode switch, header/status/avatar behavior, self-evolution CTA, focused-member selection, and subteam composer preservation.
   - Update `AgentTeamEventMonitor.spec.ts` for the new empty-state key.
   - Update `agentTeamContextsStore.spec.ts`, `HistoricalTeamLazyHydration.integration.spec.ts`, `runHistoryStore.spec.ts`, and the font-size audit targeted file list to remove stale mode/tile references.
6. Update active docs:
   - Replace `Focus/Grid/Spotlight` wording with focus-only team workspace/focus pane wording in active docs identified in investigation.
7. Run static cleanup checks and targeted validation.
8. If static search finds any active production grid/spotlight mode artifact, remove it unless it is unrelated generic CSS/grid layout.

## Key Tradeoffs

- Removing code now causes more test/doc churn than hiding the switch, but it matches the user's simplification goal and avoids dormant behavior.
- Historical all-member preload disappears with grid/spotlight. This is correct because focus-only historical inspection hydrates on member focus selection instead of preloading every member for a broader display.
- `AgentConversationFeed` and `AgentEventMonitor` remain because they are shared focus-mode infrastructure, not grid/spotlight-only code.

## Risks

- Localization generated/source catalogs may have project-specific update rules; implementation must run guards/audits rather than manually assuming success.
- Generic `grid` strings/classes appear throughout the app and must not be removed indiscriminately. The cleanup target is team workspace view-mode semantics, not CSS grid layouts.
- Some test mocks may retain deleted methods and create false contracts unless all affected specs are updated.
- The header may need minor spacing adjustment after removing the segmented control; browser validation should confirm it looks intentional.

## Guidance For Implementation

- Treat removal as the implementation's primary success condition.
- Use the dedicated worktree: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-focus-only-view-mode-simplification`.
- Do not edit the shared `personal` checkout.
- Suggested static searches after edits:
  - `rg -n "TeamGridView|TeamSpotlightView|TeamWorkspaceModeSwitch|teamWorkspaceViewStore|TeamWorkspaceViewMode|ensureHistoricalMembersHydratedForView" autobyteus-web --glob '!node_modules/**' --glob '!tickets/**' --glob '!docs/**' --glob '!\.nuxt/**' --glob '!\.output/**'`
  - `rg -n "spotlight|Spotlight|Focus/Grid/Spotlight" autobyteus-web --glob '!node_modules/**' --glob '!tickets/done/**' --glob '!\.nuxt/**' --glob '!\.output/**'`
- Generic CSS/Tailwind `grid` classes are expected elsewhere and are not removal targets.
- Minimum implementation checks to run or justify if unavailable:
  - targeted `pnpm -C autobyteus-web test:nuxt` for updated `TeamWorkspaceView`, `AgentTeamEventMonitor`, `agentTeamContextsStore`, `HistoricalTeamLazyHydration`, `runHistoryStore`, and font-size audit affected specs;
  - `pnpm -C autobyteus-web guard:localization-boundary`;
  - `pnpm -C autobyteus-web audit:localization-literals`;
  - `pnpm -C autobyteus-web build` or the project-appropriate build/type check.
