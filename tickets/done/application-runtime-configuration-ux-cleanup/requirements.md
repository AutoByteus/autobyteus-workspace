# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
Refined

## Goal / Problem Statement
Improve the imported-application experience so the host presents user-meaningful application information, provides a first-class configuration experience for application-managed agent and agent-team resources, and removes platform-internal metadata from the default user journey. The application setup flow must feel at least as strong as the existing agent and agent-team run-configuration flows, including mixed-runtime team configuration and workspace selection.

## Investigation Findings
- The Applications catalog card currently exposes `packageId` directly in the primary card UI even though the card already has enough business-facing information from `name`, `description`, and slot-count-derived setup summary.
- The application setup hero and immersive control-panel details currently render `packageId`, `localApplicationId`, raw `bundleResources`, and `writable` on the default path, which matches the user complaint about long and intimidating internal strings.
- `ApplicationLaunchDefaultsFields.vue` duplicates weaker runtime/model/workspace controls instead of reusing the stronger shared launch-config primitives already used by agent and agent-team forms.
- The current application launch-default persistence contract is flat (`runtimeKind`, `llmModelIdentifier`, `workspaceRootPath`, `autoExecuteTools`) and cannot represent mixed-runtime team member overrides, even though downstream runtime launch already supports explicit team `memberConfigs`.
- Bundle resource labels are resolved from bundle `localId` instead of the underlying agent/team display name, so selectors and summaries show technical identifiers instead of user-recognizable names.
- The current application gate/readiness logic only understands missing resource/model plus dirty/saving/error states; it does not understand unresolved team mixed-runtime/member-override problems.
- There are stale localization keys and generated localization entries for removed application launch modal / session-era flows, which are dead-code cleanup candidates directly related to this UX area.

## Recommendations
- Reframe the application catalog and setup surfaces around user-facing summaries: application name, description, setup status, and friendly resource/team information.
- Remove platform-internal identifiers from default application surfaces; if any remain necessary for support/debugging, place them behind an explicit advanced diagnostics affordance rather than the main path.
- Reuse shared launch-config building blocks for runtime/model configuration and workspace selection instead of continuing an application-specific duplicate form stack.
- Introduce resource-kind-aware application setup editors so `AGENT` slots and `AGENT_TEAM` slots get the right UX, validation, and launch-readiness logic.
- Preserve mixed-runtime team configuration end to end by extending the host-managed application configuration path so application-owned launches can consume the richer team launch shape.
- Clean up stale application launch/session localization and obsolete helper paths while implementing the UX refresh.

## Scope Classification (`Small`/`Medium`/`Large`)
Medium

## In-Scope Use Cases
- Browse imported applications from the Applications catalog.
- Open an imported application and review setup / entry information before entering the app.
- Configure application runtime resources and launch defaults for agent-backed and agent-team-backed slots.
- Configure mixed-runtime team member behavior for application slots backed by agent teams.
- Choose and persist application workspace defaults through a stronger selector experience instead of a raw string-only field.
- Reopen details/configuration from inside the immersive application view and continue using the same authoritative configuration UX.
- Remove dead code, obsolete UI paths, and architecture duplication directly tied to the application catalog/setup/control flows.

## Out of Scope
- Redesigning application-owned business screens inside the bundled iframe itself.
- Changing unrelated standalone agent or agent-team run-configuration UX except where shared components must be reused or slightly generalized for the application flow.
- Changing application package-management settings screens, except where investigation evidence is needed to separate end-user app UX from package-admin diagnostics.
- Broad application runtime/orchestration changes unrelated to setup UX, unless a narrower contract change is required to preserve mixed-runtime team configuration.

## Functional Requirements
- `REQ-APP-UX-001` The Applications catalog must present imported applications using user-meaningful summary information on the primary card surface. The default card content must emphasize application identity and setup status, not raw platform-internal identifiers.
- `REQ-APP-UX-002` The default application setup / entry surface and the immersive control-panel details surface must hide package IDs, local application IDs, raw bundle resource identifiers, and similar platform-internal metadata from the normal user path.
- `REQ-APP-UX-003` If platform-internal metadata remains available for troubleshooting, it must live behind an explicit advanced or diagnostics affordance that is not expanded or shown by default.
- `REQ-APP-UX-004` Application runtime-resource configuration must use resource-kind-aware editors. Slots backed by an agent resource and slots backed by an agent-team resource must no longer share the same flat, lowest-common-denominator editor.
- `REQ-APP-UX-005` Application slots backed by an agent-team resource must support the same mixed-runtime / member-override configuration capability that users already have in the team run-configuration experience, including per-member runtime and model override handling.
- `REQ-APP-UX-006` Application slots backed by an agent resource or agent-team resource must reuse the existing shared runtime/model configuration experience where possible instead of maintaining a duplicated application-only runtime/model selector stack.
- `REQ-APP-UX-007` Application workspace-default configuration must provide a guided selector experience equivalent in quality to the existing workspace configuration UX, including access to existing workspace roots and folder-picking/manual-path entry flows, while persisting the workspace root path needed by application-owned launches.
- `REQ-APP-UX-008` Friendly resource names shown in application setup, current-selection summaries, and related user-facing text must resolve to recognizable agent / agent-team display names for both shared and bundled resources whenever those names are available.
- `REQ-APP-UX-009` The pre-entry gate and the in-app control panel must use one authoritative configuration model, one authoritative persistence path, and one authoritative readiness evaluation so users see consistent setup state before and after entering the app.
- `REQ-APP-UX-010` Saving application setup must never start a run implicitly. Entry/reload behavior must continue to require explicit user action.
- `REQ-APP-UX-011` The host-managed application configuration contract must preserve enough information for application-owned launches to honor saved team mixed-runtime/member-override configuration instead of collapsing every agent-team launch back to a single preset when the user configured a mixed team.
- `REQ-APP-UX-012` Obsolete application launch/session-era code and localization entries that no longer correspond to reachable application UX flows must be removed or retired as part of this cleanup when they are directly in the touched area.

## Acceptance Criteria
- `AC-APP-UX-001` On `/applications`, each application card shows the application name, description, and a setup-oriented summary, and does not show `packageId`, `localApplicationId`, or raw bundle IDs on the default card face.
- `AC-APP-UX-002` On `/applications/:id`, the default setup hero/details area does not show `packageId`, `localApplicationId`, raw `bundleResources`, or `writable` in the normal path; the same default applies inside the immersive control-panel details section.
- `AC-APP-UX-003` If diagnostics metadata is retained anywhere in the application shell, it is reachable only through an explicit advanced/debug affordance and is hidden by default in both setup and immersive phases.
- `AC-APP-UX-004` For an application slot backed by an agent team, the user can configure a global runtime/model plus per-member overrides, including mixed-runtime members, from the application setup flow without dropping down to a raw string-only form.
- `AC-APP-UX-005` If a user configures a mixed-runtime team state that leaves one or more members with an unresolved inherited model, the application readiness/gating UX blocks entry/reload with a specific, user-readable reason instead of allowing a false-ready state.
- `AC-APP-UX-006` Application workspace configuration lets the user choose an existing workspace root, browse for a folder when the native picker is available, or type a path manually, and the saved value round-trips back into the application setup UI as a workspace-root-path default.
- `AC-APP-UX-007` Saving configuration from either the setup page or the immersive control panel updates the same persisted setup, and reopening the other surface shows the same saved state without auto-launching the app.
- `AC-APP-UX-008` Application runtime-resource selectors and current-selection summaries show friendly display names for bundled and shared resources instead of falling back to raw bundle `localId` strings when a real definition name exists.
- `AC-APP-UX-009` A host-managed application that launches an agent team can read back a saved mixed-runtime/member-override configuration in a form rich enough to launch with explicit team member configs rather than silently flattening everything into one preset.
- `AC-APP-UX-010` Application-specific dead code cleanup removes stale launch/session-era localization or obsolete helper paths that no longer have live UI owners in the touched flow.

## Constraints / Dependencies
- Must align with the current application-owned runtime orchestration model: the host saves setup and launches the app shell, while the application backend still decides when to start runs.
- Must preserve the explicit-entry contract: saving setup cannot implicitly create a run or relaunch the app.
- The application iframe bootstrap contract still needs application identifiers such as `packageId` and `localApplicationId`, so the UX cleanup must separate user-facing display needs from host/bootstrap transport needs instead of assuming those identifiers can disappear from the system entirely.
- Shared run-config components already exist for runtime/model configuration, workspace selection, member overrides, and readiness logic; the design should prefer extension/reuse over parallel application-only implementations, but must not regress existing standalone agent run or team run forms while doing so.
- Any richer team launch-default persistence for applications must remain compatible with the existing application runtime-control/start-run flow or evolve that flow in a controlled way.

## Assumptions
- Users care primarily about application name, description, purpose, setup readiness, and the friendly name of the supporting agent or team resource.
- Internal metadata such as package IDs and canonical bundle definition IDs are primarily support/debug/admin concerns, not default end-user concerns.
- The current team run-configuration UX is the reference quality bar for agent-team-backed application configuration.
- It is acceptable for this ticket to include contract and sample-app changes if that is the cleanest way to preserve mixed-runtime team configuration end to end.

## Risks / Open Questions
- Need a final design decision on where retained debug metadata should live, if anywhere, so support visibility is preserved without polluting the default UX.
- Need a final design decision on the cleanest contract shape for saved application team launch configuration: extend the existing launch-default contract, introduce a resource-kind-aware launch profile, or expose richer resolved config through another host/application boundary.
- Need to ensure that any shared-component reuse for application setup does not accidentally pull unrelated agent/team-only behaviors into the application flow or regress existing standalone agent/team runtime fields, which the user explicitly called out as a prior refactor risk.
- Query/schema changes to reduce internal metadata leakage on catalog/detail reads may require generated GraphQL type refreshes and test updates.

## Requirement-To-Use-Case Coverage
- Browse imported applications from the catalog:
  - `REQ-APP-UX-001`, `REQ-APP-UX-002`, `REQ-APP-UX-003`, `REQ-APP-UX-008`
- Review an imported application before entering it:
  - `REQ-APP-UX-002`, `REQ-APP-UX-003`, `REQ-APP-UX-009`, `REQ-APP-UX-010`
- Configure an application-backed agent resource:
  - `REQ-APP-UX-004`, `REQ-APP-UX-006`, `REQ-APP-UX-007`, `REQ-APP-UX-009`, `REQ-APP-UX-010`
- Configure an application-backed agent-team resource with mixed runtimes:
  - `REQ-APP-UX-004`, `REQ-APP-UX-005`, `REQ-APP-UX-006`, `REQ-APP-UX-007`, `REQ-APP-UX-009`, `REQ-APP-UX-010`, `REQ-APP-UX-011`
- Reopen configuration from inside the app:
  - `REQ-APP-UX-002`, `REQ-APP-UX-003`, `REQ-APP-UX-009`, `REQ-APP-UX-010`
- Clean up touched dead code / architecture drift:
  - `REQ-APP-UX-006`, `REQ-APP-UX-012`

## Acceptance-Criteria-To-Scenario Intent
- Catalog-first clarity:
  - `AC-APP-UX-001`
- Setup-page default info hierarchy cleanup:
  - `AC-APP-UX-002`, `AC-APP-UX-003`
- Team mixed-runtime configuration quality and correctness:
  - `AC-APP-UX-004`, `AC-APP-UX-005`, `AC-APP-UX-009`
- Workspace selection UX parity:
  - `AC-APP-UX-006`
- Consistent pre-entry vs in-app configuration behavior:
  - `AC-APP-UX-007`
- Friendly resource naming:
  - `AC-APP-UX-008`
- Dead-code / drift cleanup in touched scope:
  - `AC-APP-UX-010`

## Approval Status
Approved by user on 2026-04-24. User explicitly cautioned that shared-config reuse must not regress normal standalone agent run or agent-team run forms.
