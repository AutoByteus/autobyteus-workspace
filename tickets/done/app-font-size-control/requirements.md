# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
- `Design-ready`
- Updated On: `2026-04-13`

## Goal / Problem Statement
Users need a larger, more readable text experience when opening files from the file explorer, when using the artifact area, and across the broader active workspace and settings UI. The request explicitly preferred increasing the font size of the whole app rather than only enlarging one viewer. The product goal is therefore to define an app-wide font-size control that improves readability consistently, with guaranteed coverage for file explorer viewing, artifact list/viewing surfaces, and other high-frequency workspace/settings text that older users rely on.

## Investigation Findings
- The file explorer and artifact area already converge on a shared text/media rendering boundary:
  - File explorer path: `FileItem.vue` -> `useWorkspaceFileExplorer` / `fileExplorerStore.ts` -> `FileExplorerTabs.vue` -> `FileViewer.vue`
  - Artifact path: `ArtifactsTab.vue` -> `ArtifactContentViewer.vue` -> `FileViewer.vue`
- Markdown viewing is also centralized:
  - `FileViewer.vue` -> `MarkdownPreviewer.vue` -> `MarkdownRenderer.vue`
- There is no current user-facing font-size, appearance, accessibility, or zoom setting in `pages/settings.vue` / `components/settings/**`, and no Electron zoom handling was found in `autobyteus-web/electron/**`.
- A large portion of the app uses Tailwind rem-based typography, which means a root/app-level font scale could resize much of the UI consistently.
- Some important surfaces bypass shared rem sizing and would need explicit bridging or px-cleanup for the approved app-wide scope:
  - `MarkdownRenderer.vue` code blocks use `font-size: 14px`
  - `FileDisplay.vue` code blocks use `font-size: 14px`
  - `FileItem.vue` tree-row text uses `text-[15px]`
  - `Terminal.vue` sets xterm `fontSize: 14`
  - Monaco is created in `MonacoEditor.vue` without a shared font-size preference today.
- A follow-up fixed-px audit after architect review found additional high-frequency workspace text that root scaling alone will not fix and that V1 must classify explicitly:
  - artifact-area list/chrome: `ArtifactList.vue`, `ArtifactItem.vue`
  - active prompt/workspace shell: `AgentUserInputTextArea.vue`, `ContextFilePathInputArea.vue`, `AgentWorkspaceView.vue`, `TeamWorkspaceView.vue`, `WorkspaceHeaderActions.vue`
  - conversation/team status text: `InterAgentMessageSegment.vue`, `AgentConversationFeed.vue`, `TeamMemberMonitorTile.vue`, `TeamMemberRow.vue`
- A code-review follow-up audit found that the intended `settings` perimeter must include reachable `components/settings/**` surfaces, not only `pages/settings.vue` and `DisplaySettingsManager.vue`:
  - settings setup/detail text: `components/settings/messaging/SetupChecklistCard.vue`
  - settings status/test badge text: `components/settings/VoiceInputExtensionCard.vue`
- Existing persistence patterns for user display preferences already exist via localStorage-backed boundaries (for example localization preference storage and left-panel resize persistence), so a persisted frontend preference is feasible.

## Recommendations
- **Recommended scope:** add a persisted **app-wide font size preference** that increases general UI typography and also explicitly bridges the file/markdown viewers, Monaco editor, and terminal so “whole app” behavior is real rather than partial.
- **Lower-risk fallback scope:** add a **viewer-only font size control** limited to file explorer viewing + artifact/file/markdown viewing. This is smaller, but it would not satisfy the stronger “whole app font could be increased” preference.
- Recommended product placement: expose the control in Settings as a user preference rather than requiring browser/Electron zoom shortcuts.

## Scope Classification (`Small`/`Medium`/`Large`)
- `Medium`
- Rationale:
  - The change is frontend-only, but it crosses shared shell styling, settings UI, shared markdown rendering, file explorer chrome, artifact viewing, active workspace text surfaces, and engine-backed surfaces.
  - The existing shared `FileViewer` / `MarkdownRenderer` path reduces duplication risk for the explicitly requested file/artifact behavior.

## In-Scope Use Cases
- `UC-001`: A user increases the app font size from Settings and the preference applies without a full app restart.
- `UC-002`: A user clicks a markdown file in the file explorer and sees larger rendered markdown text, headings, lists, and code blocks.
- `UC-003`: A user clicks a text/markdown file in the artifact area and sees the same larger readable content in both the artifact list/chrome and the artifact viewer.
- `UC-004`: A user sees larger file explorer chrome/text (tree rows, search input, open-file tabs, empty states) that is consistent with the chosen font size.
- `UC-005`: A user restarts or reloads the app and the chosen font size remains in effect.
- `UC-006`: Engine-backed text surfaces (for example Monaco editor and terminal) also reflect the chosen font size instead of staying fixed at current defaults.
- `UC-007`: A user working in the main workspace sees larger readable prompt input text, workspace header chrome, conversation metadata, and team/status badges rather than only larger file-viewer content.
- `UC-008`: A user navigating Settings sees reachable settings cards, setup detail text, and status/test badges scale with the same app-wide font preference instead of staying fixed at smaller px-based sizes.

## Out of Scope
- Browser-native zoom, OS-level accessibility settings, or Electron menu zoom integration.
- Reworking spacing/layout density beyond what is required to keep enlarged text usable.
- Non-text media zoom behavior (image zoom, pdf zoom, etc.) unrelated to UI/font readability.
- Per-file temporary font overrides separate from the main user preference.

## Functional Requirements
- `R-001` (`Font Size Preference`):
  - The app must provide a user-visible font size preference with `Default` and at least one larger readable option.
- `R-002` (`Live Application`):
  - Changing the font size preference must apply to the running UI without requiring a full app restart.
- `R-003` (`Preference Persistence`):
  - The chosen font size preference must persist across page reloads and desktop restarts.
- `R-004` (`File Explorer Readability`):
  - The file explorer experience must reflect the chosen font size, including file-tree row text and file-viewer chrome that the user sees when opening a file.
- `R-005` (`Artifact Area Readability`):
  - The artifact area must reflect the chosen font size for both artifact-list/chrome text and file/text viewing when the user selects an item.
- `R-006` (`Markdown Rendering Readability`):
  - Rendered markdown content must scale with the chosen font size, including prose text and code-block text, in both the file explorer and artifact viewing paths.
- `R-007` (`App-Wide Consistency`):
  - The approved app-wide scope must scale major product UI text through one shared font-size preference rather than ad hoc per-viewer controls.
- `R-008` (`Engine-Backed Surface Coverage`):
  - Engine-backed text surfaces that do not naturally inherit CSS font sizing must be explicitly aligned to the chosen preference.
- `R-009` (`Safe Defaults / Reset`):
  - The feature must preserve a safe default size and provide a way to return to that default.
- `R-010` (`Fixed-Px Accessibility Boundary`):
  - The implementation must define and satisfy a concrete V1 fixed-px cleanup boundary for high-frequency workspace/app text surfaces that would otherwise bypass root font scaling. Each audited fixed-px text surface in the targeted workspace/file-explorer/agent-input/conversation/settings audit — including reachable `pages/settings.vue` and `components/settings/**` surfaces — must be converted in V1 or explicitly classified as an out-of-scope follow-up with product justification.
- `R-011` (`Settings Surface Readability`):
  - Reachable settings surfaces inside the audited settings perimeter, including settings cards, helper/detail text, and status/test badges rendered from `components/settings/**`, must reflect the chosen app font size rather than remaining fixed at px-based text sizing.

## Acceptance Criteria
- `AC-001`: Settings includes a user-visible font size control with `Default` and at least one larger option.
- `AC-002`: Changing the font size control updates the visible UI without a full app restart.
- `AC-003`: Reloading/restarting the app preserves the previously selected font size.
- `AC-004`: File explorer tree rows and file-viewer chrome visibly reflect the selected font size.
- `AC-005`: Selecting markdown/text content in the file explorer shows larger rendered content at larger settings.
- `AC-006`: The artifact area shows the selected size in both artifact list/chrome text and artifact markdown/text viewing.
- `AC-007`: Markdown prose and markdown code blocks both scale with the selected setting.
- `AC-008`: Monaco/terminal or other engine-backed text surfaces no longer remain fixed at their current base sizes when the app font size changes.
- `AC-009`: A reset/default path returns the app to the current baseline size behavior.
- `AC-010`: Running the agreed fixed-px audit over the targeted workspace/file-explorer/agent-input/conversation/settings paths — including `components/settings/**` — leaves no unclassified fixed-px text surfaces: each match is either converted for V1 in the approved high-frequency boundary or explicitly recorded as a follow-up with justification.
- `AC-011`: Reachable settings surfaces in the audited settings perimeter (including setup checklist detail text and voice-input test/status badges) no longer remain fixed at their current px sizes when the app font size changes.

## Constraints / Dependencies
- Shared viewer ownership currently lives in:
  - `autobyteus-web/components/fileExplorer/FileViewer.vue`
  - `autobyteus-web/components/fileExplorer/viewers/MarkdownPreviewer.vue`
  - `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue`
  - `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue`
- File explorer chrome is separately owned by:
  - `autobyteus-web/components/fileExplorer/FileExplorer.vue`
  - `autobyteus-web/components/fileExplorer/FileItem.vue`
  - `autobyteus-web/components/fileExplorer/FileExplorerTabs.vue`
- High-frequency workspace/app text outside the shared viewer path is separately owned by:
  - `autobyteus-web/components/workspace/agent/ArtifactList.vue`
  - `autobyteus-web/components/workspace/agent/ArtifactItem.vue`
  - `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue`
  - `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue`
  - `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue`
  - `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
  - `autobyteus-web/components/workspace/common/WorkspaceHeaderActions.vue`
  - `autobyteus-web/components/conversation/segments/InterAgentMessageSegment.vue`
  - `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue`
  - `autobyteus-web/components/workspace/team/TeamMemberMonitorTile.vue`
  - `autobyteus-web/components/workspace/running/TeamMemberRow.vue`
- Reachable settings surfaces inside the audited settings perimeter are separately owned by:
  - `autobyteus-web/components/settings/messaging/SetupChecklistCard.vue`
  - `autobyteus-web/components/settings/VoiceInputExtensionCard.vue`
- App-level settings navigation currently has no display/accessibility/font-size section, so new settings UI/product copy will be required.
- App-wide scaling cannot rely only on CSS root size because Monaco/xterm and several px-based CSS rules currently bypass shared rem sizing.

## Assumptions
- Confirmed by user on `2026-04-13`: the chosen direction is the broader app-wide font-size setting (Option A).
- Persisting this preference on the frontend (for example via localStorage-backed runtime state) is acceptable for both web and Electron.
- It is acceptable for the first version to use a small set of preset sizes rather than a free-form numeric slider.

## Risks / Open Questions
- Enlarging app-wide text may cause truncation or denser wrapping in existing narrow panels, especially file explorer rows, sidebars, and tab strips.
- The V1 accessibility claim now depends on an explicit fixed-px audit boundary; any remaining unclassified fixed-px text would make the shipped scope feel inconsistent.
- The exact UX shape of the control is still open (`Default/Large/Extra Large` presets vs percentage/slider).
- Cross-window live sync remains an open non-blocking question; V1 may be same-window live unless product raises multi-window synchronization as a requirement.

## Requirement-To-Use-Case Coverage

| Requirement ID | Description | Acceptance Criteria ID(s) | Use Case IDs |
| --- | --- | --- | --- |
| `R-001` | User-visible font size preference exists | `AC-001` | `UC-001`, `UC-005` |
| `R-002` | Preference applies live | `AC-002` | `UC-001` |
| `R-003` | Preference persists | `AC-003` | `UC-005` |
| `R-004` | File explorer readability scales | `AC-004`, `AC-005` | `UC-002`, `UC-004` |
| `R-005` | Artifact area list/viewer readability scales | `AC-006` | `UC-003` |
| `R-006` | Markdown prose and code blocks scale | `AC-005`, `AC-006`, `AC-007` | `UC-002`, `UC-003` |
| `R-007` | Shared app-wide consistency | `AC-001`, `AC-002`, `AC-010` | `UC-001`, `UC-004`, `UC-007`, `UC-008` |
| `R-008` | Engine-backed surfaces align to the app-wide preference | `AC-008` | `UC-006` |
| `R-009` | Safe default/reset exists | `AC-009` | `UC-001`, `UC-005` |
| `R-010` | Fixed-px audit boundary is explicit and complete | `AC-006`, `AC-010` | `UC-003`, `UC-007`, `UC-008` |
| `R-011` | Settings surfaces in the audited perimeter scale with the app preference | `AC-011` | `UC-001`, `UC-008` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| `AC-001` | User can discover and change font size in Settings. |
| `AC-002` | User sees the UI respond immediately after changing the preference. |
| `AC-003` | User does not have to reconfigure font size after reload/restart. |
| `AC-004` | File explorer chrome/readability improves, not only content rendering. |
| `AC-005` | File explorer markdown/text viewing is easier to read at larger sizes. |
| `AC-006` | Artifact-area list/chrome and artifact markdown/text viewing both become easier to read. |
| `AC-007` | Markdown code blocks do not remain visually small after prose grows. |
| `AC-008` | “Whole app font size” is not undermined by fixed-size editor/terminal surfaces. |
| `AC-009` | User can safely return to current baseline sizing. |
| `AC-010` | V1 does not silently ship with unclassified fixed-px text in the approved accessibility perimeter, including settings components. |
| `AC-011` | Reachable settings cards/details/badges do not stay visually small after the app font grows. |

## Approval Status
- `Approved by user on 2026-04-13`
- Approved scope: **Option A** = app-wide font size preference, with guaranteed coverage for file explorer, artifact area, rendered markdown, and other app text surfaces needed to make the whole-app claim real for accessibility use cases.
