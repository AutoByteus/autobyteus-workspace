# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready - expanded mobile run setup workspace selection/loading + auto-approve refactor scope approved by user on 2026-05-24.

## Goal / Problem Statement

Android/mobile new-run setup has at least two parity gaps versus the desktop/web run setup:

1. Mobile does not expose the existing `Auto approve tools` / `autoExecuteTools` launch option.
2. Mobile workspace selection for new runs is too narrow. A user can only pick workspaces already present in the mobile workspace choices, and the setup lacks the desktop's ability to load/select a workspace path when the intended workspace is not already in the active mobile list.

The fix should not be a pile of local controls inside `MobileRunSetup.vue`. The mobile new-run setup now needs a small ownership refactor so target selection, workspace selection/loading, runtime/model settings, safety/options controls, readiness, and create-run orchestration have clear boundaries.

## Investigation Findings

- Android is a WebView shell for the desktop/server-served `/mobile` Nuxt app (`autobyteus-android/README.md`); this remains a mobile-web change, not native Android run setup.
- The desktop/web agent and team run config forms already expose `Auto approve tools` and bind it to `config.autoExecuteTools`.
- Shared agent/team run config types, defaults, stores, temporary context creation, team member config building, and backend launch paths already support `autoExecuteTools`; mobile presentation omits the control.
- `MobileRunSetup.vue` owns the current mobile setup shell, selected mode/target/workspace refs, setup intent/default watchers, config synchronization, runtime/model card, readiness text, draft attachment display, and create-run submit path.
- For workspace choices, `MobileRunSetup.vue` obtains `workspaceItems` from `useMobileWorkCatalog()` and turns those into `workspaceChoices`.
- `useMobileWorkCatalog.workspaceItems` maps only `workspaceStore.allWorkspaces`.
- `workspaceStore.fetchAllWorkspaces()` calls GraphQL `workspaces`, whose server resolver returns `workspaceManager.getAllWorkspaces()`: active/loaded workspace objects plus temp, not a dedicated launch-workspace catalog and not a mobile setup path-loading flow.
- Desktop `WorkspaceSelector.vue` has both `Existing` and `New` modes. In non-Electron/mobile-like environments it still provides a path input and `Load` button, and `RunConfigPanel.vue` handles loading the path through `workspaceStore.createWorkspace(...)` before updating the launch config. Mobile lacks this parity path.
- Root causes are split:
  - Auto-approve gap: local mobile presentation omission.
  - Workspace gap/refactor driver: boundary/ownership issue and file responsibility drift. Mobile launch workspace selection borrows the context-switching catalog and has no owned launch workspace picker/loading boundary.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature parity + refactor
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect for auto-approve; Boundary Or Ownership Issue + File Placement Or Responsibility Drift for workspace/setup refactor
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now
- Evidence basis: `MobileRunSetup.vue` already coordinates many unrelated setup concerns and uses `useMobileWorkCatalog.workspaceItems` for launch workspace choices; desktop has a dedicated `WorkspaceSelector.vue` with path-loading behavior.
- Requirement or scope impact: Implementation should split mobile launch workspace ownership from the context-switch catalog and add the toggle through the new/clean setup structure rather than expanding the current mixed component.

## Recommendations

1. Refactor mobile new-run setup before or alongside the toggle addition:
   - keep `MobileRunSetup.vue` as the form shell/orchestrator;
   - extract mobile launch workspace selection/loading into an owned picker/composable;
   - optionally extract setup state/config synchronization into a composable if this materially shrinks `MobileRunSetup.vue`;
   - keep `useMobileWorkCatalog` as a context switcher/home catalog, not launch workspace policy.
2. Add an `Auto approve tools` switch bound to the existing `autoExecuteTools` field through the existing config stores.
3. Add mobile workspace selection parity:
   - show all currently fetched `workspaceStore.allWorkspaces` in the setup workspace selector;
   - allow loading/selecting a workspace by absolute server-side path when it is not listed;
   - after successful load/create, select the resulting workspace id in the active launch config.
4. Preserve mobile constraints:
   - no native Android run setup code;
   - no mobile-only shadow config for `autoExecuteTools`;
   - no backend schema change unless implementation proves the server workspace list itself cannot satisfy persisted workspace visibility.
5. Add tests proving both parity gaps and the refactor boundaries.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

## In-Scope Use Cases

- UC-MAA-001: A mobile Android/WebView user configures a new agent run and can enable or disable tool auto-approval before pressing `Create run`.
- UC-MAA-002: A mobile Android/WebView user configures a new team run and can enable or disable the global team tool auto-approval setting before pressing `Create run`.
- UC-MAA-003: A created mobile run preserves the selected auto-approval setting into the existing run context and subsequent backend launch/send path.
- UC-MWS-001: A mobile user creating a new run can see/select any workspace currently available in the workspace store, even if that workspace is not tied to a live/active run.
- UC-MWS-002: A mobile user creating a new run can load/select a workspace by entering an absolute server-side path when the intended workspace is not listed.
- UC-MWS-003: Selecting or loading a workspace from mobile updates the active agent/team launch config and enables create-run readiness without requiring an existing live run.
- UC-MRF-001: Mobile setup code has clear owners for target selection, workspace selection/loading, launch options, readiness, and create-run orchestration.

## Out of Scope

- Native Android implementation of run setup; Android remains a WebView shell for `/mobile`.
- Changing backend/runtime semantics for what auto-approval means.
- Changing desktop/web run setup behavior.
- Adding mobile team member-level override editing.
- Adding new approval filters to mobile Activity.
- Full workspace management UI on mobile beyond setup-time existing selection and absolute-path load.
- A broad backend least-privilege mobile authorization redesign.

## Functional Requirements

- REQ-MAA-001: Mobile new-run setup MUST render an `Auto approve tools` switch when an agent launch config exists for the selected agent target.
- REQ-MAA-002: Mobile new-run setup MUST render an `Auto approve tools` switch when a team launch config exists for the selected team target.
- REQ-MAA-003: The mobile switch MUST read from and write to the existing `autoExecuteTools` field on the active agent or team launch config store, with no separate mobile-only source of truth.
- REQ-MAA-004: The switch default MUST remain `false` for new launch templates unless existing shared defaults change in the future.
- REQ-MAA-005: Creating an agent run from mobile after toggling auto-approval MUST preserve the selected value on the new `AgentContext.config.autoExecuteTools` and the existing first-message backend preparation path MUST continue to send that value.
- REQ-MAA-006: Creating a team run from mobile after toggling auto-approval MUST preserve the selected value on `AgentTeamContext.config.autoExecuteTools` and in generated member configs unless an existing member override explicitly supersedes it.
- REQ-MWS-001: Mobile new-run setup MUST source launch workspace choices from the workspace subsystem (`workspaceStore`) rather than from the context-switching catalog as the authoritative launch-workspace owner.
- REQ-MWS-002: Mobile new-run setup MUST fetch or refresh the workspace store through `workspaceStore.fetchAllWorkspaces()` when setup workspace choices are initialized.
- REQ-MWS-003: Mobile new-run setup MUST display all currently fetched workspaces from `workspaceStore.allWorkspaces` as selectable launch workspaces.
- REQ-MWS-004: Mobile new-run setup MUST provide a mobile-safe way to load/select an unlisted workspace by absolute server-side path.
- REQ-MWS-005: Loading a workspace by path MUST call the existing workspace creation/loading boundary and select the returned workspace id in the active launch config.
- REQ-MWS-006: Workspace selection/loading MUST work in both agent and team launch modes.
- REQ-MRF-001: The implementation MUST avoid further bloating `MobileRunSetup.vue`; workspace selection/loading and setup state/config synchronization should have explicit owned files or composables where practical.
- REQ-MRF-002: `useMobileWorkCatalog` MUST remain a context switcher/home catalog; it MUST NOT become the owner of launch workspace loading policy.
- REQ-MRF-003: Existing mobile setup readiness, target selection, runtime/model selection, draft attachment display, and create-run behavior MUST remain unchanged except for the new launch options and workspace parity.

## Acceptance Criteria

- AC-MAA-001: Given mobile setup is in agent mode and a selected agent has a valid launch config, the setup shows `Auto approve tools` and the initial switch state is off by default.
- AC-MAA-002: Given the user toggles `Auto approve tools` on in agent mode, `agentRunConfigStore.config.autoExecuteTools` becomes `true`; toggling it off sets the value back to `false`.
- AC-MAA-003: Given the user creates an agent run after toggling the switch on, the created temporary agent run/context has `config.autoExecuteTools === true`.
- AC-MAA-004: Given mobile setup is in team mode and a selected team has a valid launch config, the setup shows `Auto approve tools` and the initial switch state is off by default.
- AC-MAA-005: Given the user toggles `Auto approve tools` on in team mode, `teamRunConfigStore.config.autoExecuteTools` becomes `true`; toggling it off sets the value back to `false`.
- AC-MAA-006: Given the user creates a team run after toggling the switch on, the created temporary team context has `config.autoExecuteTools === true`, and generated member configs inherit `autoExecuteTools: true` unless an explicit override already exists.
- AC-MWS-001: Given `workspaceStore.allWorkspaces` contains a workspace with no live/active run, mobile new-run setup lists it as a selectable workspace.
- AC-MWS-002: Given the intended workspace is absent from the existing list, the user can enter an absolute server-side path, load it, and the returned workspace id is selected for the active launch config.
- AC-MWS-003: Given the user switches between agent and team mode, workspace selection/loading applies to the active mode's config and does not write stale inactive config.
- AC-MRF-001: `MobileRunSetup.vue` no longer directly owns all workspace loading UI/policy; the implementation introduces a dedicated mobile launch workspace owner.
- AC-MRF-002: `useMobileWorkCatalog.workspaceItems` remains usable for context switching, but mobile run setup does not depend on it as the authoritative launch workspace source.
- AC-MRF-003: Existing mobile run setup tests for target selection, readiness, draft attachments, concise setup copy, and context switching continue to pass.
- AC-MRF-004: No native Android run setup UI code is added for this behavior; Android validation confirms the refreshed desktop-served `/mobile` bundle is what the WebView loads.

## Constraints / Dependencies

- Must preserve existing mobile run setup behavior for agent/team selection, runtime, model, disabled-create validation, and draft attachments.
- Must use the existing `autoExecuteTools` run configuration contract and launch stores.
- Must use existing workspace store/backend boundaries where possible: `workspaceStore.fetchAllWorkspaces()` and `workspaceStore.createWorkspace({ root_path })`.
- Mobile path entry means a server-side absolute path on the paired node/container, not the phone filesystem.
- Must account for `/mobile` bundle freshness: updating the Android APK alone cannot deliver UI changes if the server still serves stale mobile web assets.

## Assumptions

- The user's desktop/web comparison refers to run setup being able to access all known/loaded workspaces and load a new path, not to phone-local filesystem browsing.
- Mobile global team auto-approval is sufficient for this request; per-member override editing remains desktop-only.
- If the server workspace list omits persisted-but-inactive workspace mappings after restart, the mobile path-load fallback is sufficient for this ticket unless implementation evidence proves a backend list fix is required.

## Risks / Open Questions

- Risk: Auto-approval can execute tools without per-call user confirmation. Mitigation: preserve default `false` and require explicit mobile toggle.
- Risk: A stale packaged `mobile-web/` bundle may make Android appear unfixed. Mitigation: include served `/mobile` bundle freshness in validation.
- Risk: Server-side path entry can confuse users who expect phone filesystem browsing. Mitigation: label/help text should clearly say the path is on the AutoByteus node/workspace host.
- Open question: Whether backend `workspaces` should enumerate persisted workspace mappings, not only active workspace objects. Current proposed scope avoids backend change unless tests/repro prove it is needed.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| UC-MAA-001 | REQ-MAA-001, REQ-MAA-003, REQ-MAA-004, REQ-MAA-005, REQ-MRF-003 |
| UC-MAA-002 | REQ-MAA-002, REQ-MAA-003, REQ-MAA-004, REQ-MAA-006, REQ-MRF-003 |
| UC-MAA-003 | REQ-MAA-003, REQ-MAA-005, REQ-MAA-006 |
| UC-MWS-001 | REQ-MWS-001, REQ-MWS-002, REQ-MWS-003, REQ-MRF-002 |
| UC-MWS-002 | REQ-MWS-004, REQ-MWS-005 |
| UC-MWS-003 | REQ-MWS-005, REQ-MWS-006, REQ-MRF-003 |
| UC-MRF-001 | REQ-MRF-001, REQ-MRF-002, REQ-MRF-003 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-MAA-001 | Agent-mode auto-approve visibility/default |
| AC-MAA-002 | Agent-mode auto-approve store binding |
| AC-MAA-003 | Agent-mode auto-approve creation propagation |
| AC-MAA-004 | Team-mode auto-approve visibility/default |
| AC-MAA-005 | Team-mode auto-approve store binding |
| AC-MAA-006 | Team-mode auto-approve propagation |
| AC-MWS-001 | Workspace list includes non-live-run workspaces from workspace store |
| AC-MWS-002 | Workspace absolute-path load/select parity |
| AC-MWS-003 | Workspace mode switching avoids stale writes |
| AC-MRF-001 | Refactor boundary for workspace owner |
| AC-MRF-002 | Context catalog no longer owns launch workspace policy |
| AC-MRF-003 | Existing mobile setup behavior regression guard |
| AC-MRF-004 | Android/mobile bundle freshness guard |

## Approval Status

Approved by user on 2026-05-24. Approval covers both mobile `Auto approve tools` toggle parity and mobile new-run workspace selection/loading parity with the required setup refactor.
