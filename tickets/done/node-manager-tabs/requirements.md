# Requirements: Node Manager Tabs

- Status: Design-ready
- Date: 2026-05-13
- Scope Classification: Small

## Goal / Problem Statement

Settings → Nodes currently lets the static Docker launcher tutorial dominate the Node Manager page, even though Docker command copy cards do not save settings or configure nodes directly. The Nodes page should clearly separate actionable node management/settings from Docker setup tutorial help.

## In-Scope Use Cases

| Use Case ID | Description | Requirements Covered |
| --- | --- | --- |
| UC-001 | A user opens Settings → Nodes and first sees the actionable node-management/settings surface. | REQ-001, REQ-002 |
| UC-002 | A user wants Docker launcher instructions and can switch to a Docker-specific tab to copy commands. | REQ-001, REQ-003 |
| UC-003 | A user switches between tabs without losing existing node management behavior during the session. | REQ-002, REQ-004 |
| UC-004 | A localized user sees tab labels in supported locales. | REQ-005 |

## Requirements

| Requirement ID | Requirement |
| --- | --- |
| REQ-001 | The Node Manager page must expose two in-page tabs separating node management from Docker setup/tutorial content. |
| REQ-002 | The default tab must be the node management/settings tab and must contain the existing Current Window Node, Remote Browser Sharing, Add Remote Node, Run Full Sync, and Configured Nodes sections. |
| REQ-003 | The Docker setup/tutorial tab must contain the existing `DockerNodeStartGuideCard` content without changing the Docker command catalog or copy behavior. |
| REQ-004 | Switching tabs must be local UI state only and must not change node registry, sync, pairing, or Docker guide command behavior. |
| REQ-005 | New tab labels must use the existing localization system for English and Chinese. |
| REQ-006 | Tests must verify the default management tab and Docker tutorial tab placement. |

## Acceptance Criteria

| Acceptance Criteria ID | Scenario Intent | Expected Outcome |
| --- | --- | --- |
| AC-001 | Render Settings → Nodes / `NodeManager` by default. | A tablist is present, the Manage Nodes tab is selected, node management controls render, and the Docker guide does not render in the default panel. |
| AC-002 | Select the Docker Setup tab. | The Docker tab becomes selected, `DockerNodeStartGuideCard` renders inside the tab panel, and management-only controls are hidden from that panel. |
| AC-003 | Use existing node management actions from the default tab. | Existing Add Remote Node, Run Full Sync, Open, Rename, Remove, and Remote Browser Sharing behaviors remain covered by existing tests. |
| AC-004 | Run Docker guide component tests. | Existing Docker install/direct command rendering and copy feedback tests still pass. |
| AC-005 | Run localization/guard checks where practical. | New static text is localized; no new raw product literals are introduced in Vue templates. |

## Constraints / Dependencies

- Keep source changes inside the owning frontend settings component/localization/tests/docs files.
- Do not change Docker launcher command definitions in `utils/dockerNodeLauncherCommands.ts`.
- Do not introduce persisted tab state unless a separate requirement asks for persistence.
- Preserve existing visual style with Tailwind utility classes.

## Assumptions

- The two tabs should be labeled `Manage Nodes` and `Docker Setup` in English.
- The management tab should be selected by default because Settings → Nodes is primarily a settings/management page.
- The current `DockerNodeStartGuideCard` remains valid as-is; only its placement changes.

## Open Questions / Risks

- No blocker. If product later wants a third tab for advanced sharing/sync, this implementation can be extended from the local tab model.

## Requirement-to-Use-Case Coverage

| Requirement ID | Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-002 |
| REQ-002 | UC-001, UC-003 |
| REQ-003 | UC-002 |
| REQ-004 | UC-003 |
| REQ-005 | UC-004 |
| REQ-006 | UC-001, UC-002, UC-003 |

## Acceptance-Criteria-to-Scenario Intent

| Acceptance Criteria ID | Validation Scenario |
| --- | --- |
| AC-001 | NodeManager unit/component test asserts default selected tab and absence of Docker card. |
| AC-002 | NodeManager unit/component test clicks Docker tab and asserts Docker card appears. |
| AC-003 | Existing NodeManager unit/component tests for node actions continue passing. |
| AC-004 | Existing DockerNodeStartGuideCard tests continue passing. |
| AC-005 | Localization messages updated in English and Chinese; localization guard/audit can run. |

## Refined Requirement: Header Layout

- Status Update: Refined on 2026-05-13 from user visual review.

| Requirement ID | Requirement |
| --- | --- |
| REQ-007 | The Nodes page header must use the Manage Nodes / Docker Guide tabs as the primary page-level navigation and must not show a redundant `Node Manager` title next to the selected Manage Nodes tab. |

| Acceptance Criteria ID | Scenario Intent | Expected Outcome |
| --- | --- | --- |
| AC-006 | Open Settings → Nodes after selecting Nodes in the settings sidebar. | The page is immediately on the Manage Nodes tab, and the top header shows the tab control without a separate redundant `Node Manager` heading. |
